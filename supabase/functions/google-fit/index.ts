import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = session.user;
    const googleIdentity = user.identities?.find(i => i.provider === 'google');
    
    if (!googleIdentity) {
      return new Response(JSON.stringify({ 
        error: 'No Google account linked',
        message: 'Please sign in with Google to access fitness data'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { providerToken: clientProviderToken } = await req.json();
    
    const providerToken = session.provider_token || clientProviderToken;
    console.log('Provider token available:', !!providerToken);
    
    // Calculate time range: TODAY only (midnight local time to now)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startTimeMillis = todayStart.getTime();
    const endTimeMillis = now.getTime();
    const todayDate = now.toISOString().split('T')[0];

    console.log(`Fetching steps for today: ${todayDate}, range: ${startTimeMillis} - ${endTimeMillis}`);

    // If no provider token, return cached data for today from DB
    if (!providerToken) {
      console.log('No provider token, fetching cached data from DB for today');
      const { data: cachedData } = await supabaseAdmin
        .from('google_fit_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('sync_date', todayDate)
        .maybeSingle();

      const todaySteps = cachedData?.steps ?? 0;
      const todayCalories = cachedData?.calories ?? 0;

      return new Response(JSON.stringify({ 
        success: true,
        todaySteps,
        todayCalories,
        todayDate,
        cached: true,
        hasToken: false,
        message: cachedData ? 'Showing cached data' : 'No data yet. Re-authenticate with Google to sync.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch TODAY's steps from Google Fit API
    let todaySteps = 0;
    let todayCalories = 0;

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
      return new Response(JSON.stringify({
        error: 'Google Fit API error',
        message: 'Failed to fetch steps. Please reconnect Google Fit.',
        status: stepsResponse.status,
        details: bodyText,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Fetch TODAY's calories
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

    // ALWAYS save to DB (even 0 steps - this is valid data)
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
      // Don't fail the request, still return the data
    } else {
      console.log('Successfully saved to DB');
    }

    return new Response(JSON.stringify({ 
      success: true,
      todaySteps,
      todayCalories,
      todayDate,
      cached: false,
      hasToken: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Google Fit error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch fitness data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
