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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the provider token from user's identities
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

    // Get the session to access provider_token
    const { data: sessionData } = await supabase.auth.getSession();
    const providerToken = sessionData?.session?.provider_token;

    if (!providerToken) {
      return new Response(JSON.stringify({ 
        error: 'No fitness access token',
        message: 'Please re-authenticate with Google to grant fitness access'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();
    
    // Calculate date range (last 7 days)
    const endTime = Date.now();
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000);

    let fitnessData: any = {};

    if (action === 'steps' || action === 'all') {
      // Fetch step count data
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
            bucketByTime: { durationMillis: 86400000 }, // 1 day
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
      // Fetch calories burned
      const caloriesResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{
              dataTypeName: 'com.google.calories.expended'
            }],
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

    if (action === 'activity' || action === 'all') {
      // Fetch activity segments
      const activityResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{
              dataTypeName: 'com.google.activity.segment'
            }],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: startTime,
            endTimeMillis: endTime,
          }),
        }
      );

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        fitnessData.activities = activityData.bucket?.map((bucket: any) => ({
          date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
          segments: bucket.dataset?.[0]?.point?.length || 0
        })) || [];
      }
    }

    console.log('Google Fit data fetched successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true,
      data: fitnessData,
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
