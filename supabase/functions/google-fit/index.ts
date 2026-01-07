import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Always return HTTP 200 with { steps: number }
function successResponse(steps: number, extras: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ 
    success: true, 
    steps,
    todaySteps: steps, // backwards compat
    ...extras 
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only return non-2xx for missing authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { session }, error: sessionError } = await supabaseUser.auth.getSession();

    if (sessionError || !session?.user) {
      console.log('Invalid session, returning 0 steps');
      return successResponse(0, { todayDate, message: 'Invalid session' });
    }

    const user = session.user;
    const googleIdentity = user.identities?.find(i => i.provider === 'google');
    
    if (!googleIdentity) {
      console.log('No Google account linked');
      return successResponse(0, { todayDate, message: 'Please sign in with Google' });
    }

    // Get provider token from request body or session
    let providerToken: string | null = null;
    try {
      const body = await req.json();
      providerToken = body?.providerToken || session.provider_token || null;
    } catch {
      providerToken = session.provider_token || null;
    }
    
    console.log('Provider token available:', !!providerToken);
    
    // If no token, return 0 (don't read from DB - user wants live data)
    if (!providerToken) {
      console.log('No provider token - cannot fetch live data');
      return successResponse(0, { 
        todayDate, 
        message: 'No Google token. Please re-authenticate to sync live data.' 
      });
    }

    // Calculate time range: TODAY 00:00 local → now
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = todayStart.getTime();
    const endTimeMillis = now.getTime();

    console.log(`Fetching LIVE steps for ${todayDate}: ${new Date(startTimeMillis).toISOString()} → ${new Date(endTimeMillis).toISOString()}`);

    // ALWAYS fetch from Google Fit API - never rely on DB for "Sync now"
    let todaySteps = 0;
    let todayCalories = 0;

    try {
      console.log('Calling Google Fit API for steps...');
      const stepsResponse = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{
              dataTypeName: 'com.google.step_count.delta',
              dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
            }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis,
            endTimeMillis,
          }),
        }
      );

      if (!stepsResponse.ok) {
        const bodyText = await stepsResponse.text();
        console.error('Google Fit API error:', stepsResponse.status, bodyText);
        // Don't throw - return 0 steps (empty data is valid)
      } else {
        const stepsData = await stepsResponse.json();
        console.log('Google Fit raw response:', JSON.stringify(stepsData));

        // Parse step count from buckets (empty buckets = 0 steps, not error)
        if (stepsData.bucket && stepsData.bucket.length > 0) {
          for (const bucket of stepsData.bucket) {
            const points = bucket.dataset?.[0]?.point || [];
            for (const point of points) {
              const val = point.value?.[0]?.intVal;
              if (typeof val === 'number') {
                todaySteps += val;
              }
            }
          }
        }
        console.log('Extracted steps from API:', todaySteps);
      }
    } catch (stepsError) {
      console.error('Steps fetch error:', stepsError);
      // Return 0 - don't fail
    }

    // Fetch calories (optional)
    try {
      const caloriesResponse = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis,
            endTimeMillis,
          }),
        }
      );

      if (caloriesResponse.ok) {
        const caloriesData = await caloriesResponse.json();
        if (caloriesData.bucket && caloriesData.bucket.length > 0) {
          for (const bucket of caloriesData.bucket) {
            const points = bucket.dataset?.[0]?.point || [];
            for (const point of points) {
              todayCalories += Math.round(point.value?.[0]?.fpVal || 0);
            }
          }
        }
        console.log('Extracted calories from API:', todayCalories);
      }
    } catch (caloriesError) {
      console.warn('Calories fetch error:', caloriesError);
    }

    // Upsert to DB (log error but never fail the response)
    try {
      console.log(`Saving to DB: steps=${todaySteps}, calories=${todayCalories}`);
      const { error: upsertError } = await supabaseAdmin.from('google_fit_data').upsert({
        user_id: user.id,
        sync_date: todayDate,
        steps: todaySteps,
        calories: todayCalories,
        activity_segments: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sync_date' });

      if (upsertError) {
        console.error('DB upsert error (non-fatal):', upsertError);
      }
    } catch (dbError) {
      console.error('DB exception (non-fatal):', dbError);
    }

    // Return live API data
    return successResponse(todaySteps, { 
      todayCalories,
      todayDate,
      source: 'google_fit_api'
    });

  } catch (error) {
    // Catch-all: return 0 with HTTP 200
    console.error('Unexpected error:', error);
    return successResponse(0, { 
      todayDate,
      message: error instanceof Error ? error.message : 'Unexpected error'
    });
  }
});