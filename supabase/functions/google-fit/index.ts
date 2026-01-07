import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    // Use the user's token to get their session (which contains provider_token)
    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    // Service role client for DB operations
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

    // Provider token is available in the session, not in identity_data
    const providerToken = session.provider_token;
    console.log('Provider token available:', !!providerToken);

    const { action, saveToDb } = await req.json();
    
    // Calculate date range (last 7 days)
    const endTime = Date.now();
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

    let fitnessData: any = { steps: [], calories: [], activities: [] };

    // If no provider token, return cached data from DB
    if (!providerToken) {
      console.log('No provider token, fetching cached data from DB');
      const { data: cachedData } = await supabaseAdmin
        .from('google_fit_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('sync_date', new Date(startTime).toISOString().split('T')[0])
        .order('sync_date', { ascending: true });

      if (cachedData && cachedData.length > 0) {
        fitnessData.steps = cachedData.map(d => ({ date: d.sync_date, count: d.steps }));
        fitnessData.calories = cachedData.map(d => ({ date: d.sync_date, value: d.calories }));
        fitnessData.activities = cachedData.map(d => ({ date: d.sync_date, segments: d.activity_segments }));
        
        return new Response(JSON.stringify({ 
          success: true,
          data: fitnessData,
          cached: true,
          period: { start: cachedData[0]?.sync_date, end: cachedData[cachedData.length - 1]?.sync_date }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        error: 'No fitness access token',
        message: 'Please re-authenticate with Google to grant fitness access'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh data from Google Fit API
    if (action === 'steps' || action === 'all') {
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
            startTimeMillis: startTime,
            endTimeMillis: endTime,
          }),
        }
      );

      if (stepsResponse.ok) {
        const stepsData = await stepsResponse.json();
        fitnessData.steps = stepsData.bucket?.map((bucket: any) => ({
          date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
          count: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0
        })) || [];
      }
    }

    if (action === 'calories' || action === 'all') {
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
            startTimeMillis: startTime,
            endTimeMillis: endTime,
          }),
        }
      );

      if (caloriesResponse.ok) {
        const caloriesData = await caloriesResponse.json();
        fitnessData.calories = caloriesData.bucket?.map((bucket: any) => ({
          date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
          value: Math.round(bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0)
        })) || [];
      }
    }

    // Save to database if requested
    if (saveToDb && fitnessData.steps.length > 0) {
      for (const stepData of fitnessData.steps) {
        const calorieData = fitnessData.calories?.find((c: any) => c.date === stepData.date);
        const activityData = fitnessData.activities?.find((a: any) => a.date === stepData.date);
        
        await supabaseAdmin.from('google_fit_data').upsert({
          user_id: user.id,
          sync_date: stepData.date,
          steps: stepData.count,
          calories: calorieData?.value || 0,
          activity_segments: activityData?.segments || 0,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,sync_date' });
      }
      console.log('Google Fit data saved to DB for user:', user.id);
    }

    console.log('Google Fit data fetched for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true,
      data: fitnessData,
      cached: false,
      period: {
        start: new Date(startTime).toISOString().split('T')[0],
        end: new Date(endTime).toISOString().split('T')[0]
      }
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
