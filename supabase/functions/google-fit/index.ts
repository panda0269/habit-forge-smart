import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to return success response (always 200)
function successResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
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

    // Calculate today's date for all responses
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];

    if (sessionError || !session?.user) {
      console.log('Invalid session, returning 0 steps');
      return successResponse({ 
        todaySteps: 0,
        todayCalories: 0,
        todayDate,
        cached: false,
        hasToken: false,
        message: 'Invalid session - please sign in again'
      });
    }

    const user = session.user;
    const googleIdentity = user.identities?.find(i => i.provider === 'google');
    
    if (!googleIdentity) {
      console.log('No Google account linked, returning 0 steps');
      return successResponse({ 
        todaySteps: 0,
        todayCalories: 0,
        todayDate,
        cached: false,
        hasToken: false,
        message: 'Please sign in with Google to access fitness data'
      });
    }

    let providerToken: string | null = null;
    try {
      const body = await req.json();
      providerToken = session.provider_token || body?.providerToken || null;
    } catch {
      providerToken = session.provider_token || null;
    }
    
    console.log('Provider token available:', !!providerToken);
    
    // Calculate time range: TODAY only (midnight to now)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = todayStart.getTime();
    const endTimeMillis = now.getTime();

    console.log(`Fetching steps for today: ${todayDate}, range: ${startTimeMillis} - ${endTimeMillis}`);

    // If no provider token, return cached data for today from DB
    if (!providerToken) {
      console.log('No provider token, fetching cached data from DB for today');
      try {
        const { data: cachedData } = await supabaseAdmin
          .from('google_fit_data')
          .select('*')
          .eq('user_id', user.id)
          .eq('sync_date', todayDate)
          .maybeSingle();

        return successResponse({ 
          todaySteps: cachedData?.steps ?? 0,
          todayCalories: cachedData?.calories ?? 0,
          todayDate,
          cached: true,
          hasToken: false,
          message: cachedData ? 'Showing cached data' : 'No data yet. Re-authenticate with Google to sync.'
        });
      } catch (dbError) {
        console.error('DB read error:', dbError);
        return successResponse({ 
          todaySteps: 0,
          todayCalories: 0,
          todayDate,
          cached: false,
          hasToken: false,
          message: 'Could not read cached data'
        });
      }
    }

    // Fetch TODAY's steps from Google Fit API
    let todaySteps = 0;
    let todayCalories = 0;
    let fetchError: string | null = null;

    try {
      console.log('Fetching steps from Google Fit API...');
      const stepsResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
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
        console.error('Google Fit steps API error:', stepsResponse.status, bodyText);
        fetchError = `Google Fit API returned ${stepsResponse.status}`;
        // Don't throw - continue with 0 steps
      } else {
        const stepsData = await stepsResponse.json();
        console.log('Steps API response:', JSON.stringify(stepsData));

        // Extract step count from buckets
        if (stepsData.bucket && stepsData.bucket.length > 0) {
          for (const bucket of stepsData.bucket) {
            const points = bucket.dataset?.[0]?.point || [];
            for (const point of points) {
              todaySteps += point.value?.[0]?.intVal || 0;
            }
          }
        }
        console.log('Today steps extracted:', todaySteps);
      }
    } catch (stepsError) {
      console.error('Steps fetch exception:', stepsError);
      fetchError = 'Failed to fetch steps from Google Fit';
      // Continue with 0 steps
    }

    // Fetch TODAY's calories (optional, don't fail if this errors)
    try {
      console.log('Fetching calories from Google Fit API...');
      const caloriesResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
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
        console.log('Today calories extracted:', todayCalories);
      } else {
        console.warn('Calories fetch failed, continuing with 0');
      }
    } catch (caloriesError) {
      console.warn('Calories fetch exception:', caloriesError);
      // Continue with 0 calories
    }

    // Save to DB (log error but don't fail)
    try {
      console.log(`Upserting to DB: user=${user.id}, date=${todayDate}, steps=${todaySteps}, calories=${todayCalories}`);
      const { error: upsertError } = await supabaseAdmin.from('google_fit_data').upsert({
        user_id: user.id,
        sync_date: todayDate,
        steps: todaySteps,
        calories: todayCalories,
        activity_segments: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sync_date' });

      if (upsertError) {
        console.error('DB upsert error:', upsertError);
      } else {
        console.log('Successfully saved to DB');
      }
    } catch (dbError) {
      console.error('DB upsert exception:', dbError);
      // Don't fail - still return the data
    }

    return successResponse({ 
      todaySteps,
      todayCalories,
      todayDate,
      cached: false,
      hasToken: true,
      ...(fetchError ? { warning: fetchError } : {})
    });

  } catch (error) {
    // Catch-all: still return 200 with 0 steps
    console.error('Google Fit unexpected error:', error);
    const now = new Date();
    return successResponse({ 
      todaySteps: 0,
      todayCalories: 0,
      todayDate: now.toISOString().split('T')[0],
      cached: false,
      hasToken: false,
      message: error instanceof Error ? error.message : 'Unexpected error occurred'
    });
  }
});
