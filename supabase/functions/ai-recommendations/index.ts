import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HabitData {
  id: string;
  title: string;
  category: string;
  frequency: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  missedDays: number;
  totalDays: number;
  completedToday: boolean;
}

interface RequestBody {
  habits: HabitData[];
  userCategory: 'consistent' | 'improving' | 'inconsistent';
  analysisType?: 'recommendations' | 'patterns' | 'insights' | 'coaching';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // In-memory protections (best-effort): prevents runaway re-triggers from spamming the AI provider.
  // Note: Edge instances can cold-start, so this isn't a perfect global limiter, but it stops most bursts.
  const state = (globalThis as unknown as {
    __aiRecommendationsState?: {
      lastCallByUser: Record<string, number>;
      cache: Record<string, { createdAt: number; payload: unknown }>;
    };
  }).__aiRecommendationsState ??
    ((globalThis as unknown as { __aiRecommendationsState?: unknown }).__aiRecommendationsState = {
      lastCallByUser: {},
      cache: {},
    }) as {
      lastCallByUser: Record<string, number>;
      cache: Record<string, { createdAt: number; payload: unknown }>;
    };

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Invalid token:", authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TEMP KILL SWITCH (set backend env AI_RECOMMENDATIONS_DISABLED=true to hard-disable without redeploy)
    if ((Deno.env.get('AI_RECOMMENDATIONS_DISABLED') ?? '').toLowerCase() === 'true') {
      return new Response(
        JSON.stringify({
          recommendations: 'AI temporarily disabled to prevent rate limits. Please try again later.',
          analysisType: 'recommendations',
          disabled: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log("Authenticated user:", user.id);

    const GEMINI_API_KEY = Deno.env.get("gem");
    if (!GEMINI_API_KEY) {
      console.error("Gemini API key (gem) is not configured");
      return new Response(JSON.stringify({
        recommendations: "AI is not configured yet. Please try again later.",
        analysisType: 'recommendations',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { habits, userCategory, analysisType = 'recommendations' } = body;

    // Validate habits array
    if (!Array.isArray(habits)) {
      return new Response(JSON.stringify({ error: 'habits must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (habits.length === 0 || habits.length > 100) {
      return new Response(JSON.stringify({ error: 'habits must contain 1-100 items' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate userCategory enum
    const validCategories = ['consistent', 'improving', 'inconsistent'];
    if (!validCategories.includes(userCategory)) {
      return new Response(JSON.stringify({ error: 'userCategory must be consistent, improving, or inconsistent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate analysisType enum
    const validAnalysisTypes = ['recommendations', 'patterns', 'insights', 'coaching'];
    if (!validAnalysisTypes.includes(analysisType)) {
      return new Response(JSON.stringify({ error: 'analysisType must be recommendations, patterns, insights, or coaching' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate each habit structure
    for (const habit of habits) {
      if (!habit.id || typeof habit.id !== 'string') {
        return new Response(JSON.stringify({ error: 'each habit must have a valid id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!habit.title || typeof habit.title !== 'string' || habit.title.length > 500) {
        return new Response(JSON.stringify({ error: 'each habit must have a valid title (max 500 chars)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (typeof habit.completionRate !== 'number' || habit.completionRate < 0 || habit.completionRate > 100) {
        return new Response(JSON.stringify({ error: 'each habit must have a valid completionRate (0-100)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // SERVER-SIDE THROTTLE (non-negotiable)
    const now = Date.now();
    const last = state.lastCallByUser[user.id] ?? 0;
    const minIntervalMs = 10_000; // 10 seconds

    // Simple context key; changes when habit state changes.
    const habitsKey = habits
      .map((h) => `${h.id}:${h.completedToday ? 1 : 0}:${h.currentStreak}:${h.missedDays}:${Math.round(h.completionRate)}`)
      .sort()
      .join('|');
    const cacheKey = `${user.id}:${analysisType}:${userCategory}:${habitsKey}`;

    // Serve cached response if present (even when throttled) to avoid repeated provider calls.
    const cached = state.cache[cacheKey];
    const cacheTtlMs = 5 * 60_000;
    if (cached && now - cached.createdAt < cacheTtlMs) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (now - last < minIntervalMs) {
      console.warn(`ai-recommendations server-throttle user=${user.id} delta=${now - last}ms`);
      return new Response(JSON.stringify({
        recommendations: "Rate limited by server. Please wait a few seconds and try again.",
        analysisType,
        throttled: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    state.lastCallByUser[user.id] = now;

    console.log("Received request - habits:", habits.length, "userCategory:", userCategory, "analysisType:", analysisType);

    // Separate completed and missed habits
    const completedToday = habits.filter(h => h.completedToday);
    const missedToday = habits.filter(h => !h.completedToday);

    // Build detailed analysis of missed habits
    const missedHabitsAnalysis = missedToday.map(h => {
      const streakJustBroken = h.currentStreak === 0 && h.longestStreak > 0;
      const chronicStruggle = h.completionRate < 40;
      const recentSlip = h.completionRate >= 60 && !h.completedToday;
      const needsAttention = h.missedDays > h.totalDays * 0.4;

      let status = '';
      if (chronicStruggle) status = '🔴 CHRONIC STRUGGLE';
      else if (streakJustBroken) status = '🔥 STREAK BROKEN';
      else if (needsAttention) status = '⚠️ NEEDS ATTENTION';
      else if (recentSlip) status = '💫 UNUSUAL MISS';
      else status = '📋 NOT DONE YET';

      return {
        ...h,
        status,
        streakJustBroken,
        chronicStruggle,
        recentSlip,
        needsAttention,
      };
    });

    const habitSummary = habits.map(h =>
      `- ${h.title} (${h.category}): ${h.completedToday ? '✅ Done' : '❌ Not done'} | ${h.completionRate}% completion, ${h.currentStreak} day streak (best: ${h.longestStreak}), ${h.missedDays} missed/${h.totalDays} total days`
    ).join('\n');

    // Calculate advanced metrics
    const avgCompletion = habits.length > 0
      ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length)
      : 0;
    const totalStreak = habits.reduce((sum, h) => sum + h.currentStreak, 0);
    const bestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
    const categoryBreakdown = habits.reduce((acc, h) => {
      if (!acc[h.category]) {
        acc[h.category] = { total: 0, completed: 0, missed: [] as string[] };
      }
      acc[h.category].total++;
      if (h.completedToday) {
        acc[h.category].completed++;
      } else {
        acc[h.category].missed.push(h.title);
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; missed: string[] }>);

    const metrics = `
TODAY'S STATUS:
- Completed: ${completedToday.length}/${habits.length} habits (${Math.round((completedToday.length / habits.length) * 100)}%)
- Missed so far: ${missedToday.length} habits

MISSED HABITS ANALYSIS:
${missedHabitsAnalysis.length > 0 ? missedHabitsAnalysis.map(h =>
  `• "${h.title}" (${h.category}, ${h.frequency})
   Status: ${h.status}
   Completion Rate: ${h.completionRate}%
   Current Streak: ${h.currentStreak} days (longest: ${h.longestStreak})
   Missed Days: ${h.missedDays} out of ${h.totalDays} days
   ${h.streakJustBroken ? '→ Just lost a streak - needs immediate attention!' : ''}
   ${h.chronicStruggle ? '→ Consistently struggling with this habit - consider adjusting' : ''}
   ${h.recentSlip ? '→ Usually completes this - unusual miss today' : ''}`
).join('\n\n') : 'All habits completed today! 🎉'}

CATEGORY PERFORMANCE:
${Object.entries(categoryBreakdown).map(([cat, data]) =>
  `- ${cat}: ${data.completed}/${data.total} done today${data.missed.length > 0 ? ` (missing: ${data.missed.join(', ')})` : ''}`
).join('\n')}

OVERALL STATS:
- Average completion rate: ${avgCompletion}%
- Total active streak days: ${totalStreak}
- Best streak achieved: ${bestStreak} days
- User performance category: ${userCategory}`;

    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'patterns':
        systemPrompt = `You are an expert behavioral data analyst specializing in habit formation patterns. Provide DETAILED, THOROUGH analysis with rich insights.

Your analysis MUST include these sections with headers:

✅ WHAT'S WORKING WELL
- List specific habits that are performing well (name them!)
- Explain WHY these habits are succeeding
- Identify what makes these habits stick

❌ WHAT'S NOT WORKING
- List specific habits that are struggling (name them!)
- Analyze the root causes of each struggle
- Identify patterns in failures

🔗 HIDDEN CORRELATIONS
- Which habits tend to be missed together?
- What category patterns do you see?
- Time-based patterns if visible

📊 DATA-DRIVEN INSIGHTS
- Streak analysis and what breaks them
- Completion rate trends
- Category performance comparison

🎯 KEY RECOMMENDATIONS
- 3-5 specific, actionable changes based on the patterns

Be thorough, specific, and reference actual habit names. Write at least 300 words.`;
        userPrompt = `Analyze my habit data for patterns:\n\n${habitSummary}\n\n${metrics}\n\nProvide a comprehensive analysis with all the sections. Be detailed and specific.`;
        break;

      case 'insights':
        systemPrompt = `You are an AI habit intelligence system providing DEEP, COMPREHENSIVE analytical insights about habit behavior and psychology.

Your analysis MUST include these sections:

✅ WHAT'S WORKING WELL
- Celebrate wins! Name specific habits that are thriving
- Explain the psychology behind why these work
- Identify strengths to leverage

❌ WHAT'S NOT WORKING  
- Be honest about struggles (name specific habits)
- Psychological factors causing issues
- Environmental or scheduling problems

🧠 PSYCHOLOGICAL INSIGHTS
- Why certain habits are harder based on the data
- Motivation patterns you can see
- Willpower and energy considerations

📈 PERFORMANCE PREDICTIONS
- Based on current trends, what will improve?
- Which habits are at risk?
- Recommended focus areas

💡 BREAKTHROUGH OPPORTUNITIES
- Low-hanging fruit for quick wins
- Habits close to becoming automatic
- Strategic priorities

Be thorough and write at least 300 words. Use specific habit names.`;
        userPrompt = `Generate comprehensive insights from my habit data:\n\n${habitSummary}\n\n${metrics}\n\nProvide deep analysis with all sections filled out. Be specific and thorough.`;
        break;

      case 'coaching':
        systemPrompt = `You are a supportive personal habit coach providing DETAILED, PERSONALIZED guidance. Your style adapts to the user's situation:
${userCategory === 'consistent' ? '- High performer: Challenge them to optimize and reach new heights' :
  userCategory === 'improving' ? '- Building momentum: Encourage consistency and celebrate progress' :
  '- Struggling: Be compassionate, focus on tiny wins and removing friction'}

Your coaching MUST include these sections:

🏆 CELEBRATING YOUR WINS
- List EVERY completed habit by name
- Explain why each completion matters
- Build confidence and momentum

⚠️ HABITS NEEDING ATTENTION
- Address EACH missed habit by name
- Analyze WHY each was skipped
- Provide specific recovery strategy

✅ WHAT'S WORKING FOR YOU
- Patterns in your successful habits
- Strengths you're demonstrating
- Momentum you're building

❌ WHAT'S HOLDING YOU BACK
- Honest assessment of challenges
- Common failure patterns
- Environmental or mindset issues

🎯 YOUR ACTION PLAN
- Specific steps for TODAY
- Priority order for missed habits
- Micro-actions to build momentum

💪 ENCOURAGEMENT
- Personalized motivation
- Remind them of their progress
- End on a high note

Speak directly to the user ("you"). Be warm, detailed, and actionable. Write at least 350 words.`;
        userPrompt = `Coach me based on my habit data:\n\n${habitSummary}\n\n${metrics}\n\nGive me comprehensive coaching with all sections. Be detailed and personal.`;
        break;

      default: // recommendations
        systemPrompt = `You are an expert habit coach providing COMPREHENSIVE, DETAILED suggestions. Provide rich, thorough analysis that helps the user understand their habits deeply.

Your response MUST include ALL these sections with clear headers:

✅ WHAT'S WORKING WELL
- List specific habits that are succeeding (by name!)
- Explain WHY these habits are working
- Celebrate streaks and consistency
- Identify patterns in successful habits

❌ WHAT'S NOT WORKING
- List specific habits that are struggling (by name!)
- Analyze root causes for each
- Identify common patterns in failures
- Be honest but constructive

🎯 IMMEDIATE ACTIONS FOR TODAY
- For EACH missed habit, provide a specific action
- Give time estimates and exact steps
- Make actions small and achievable

💡 WHY YOU MIGHT BE STRUGGLING
- Analyze psychological factors
- Consider energy, timing, environment
- Look at category patterns

🔧 STRATEGIC ADJUSTMENTS
- Habit stacking opportunities
- Environment design changes
- Schedule optimization ideas

📈 YOUR PROGRESS SNAPSHOT
- Overall trajectory assessment
- Comparison to previous performance
- Momentum indicators

User is "${userCategory}":
- consistent (>80%): Optimize and prevent slips, aim for mastery
- improving (50-80%): Build momentum, celebrate progress, identify weak spots  
- inconsistent (<50%): Focus on tiny wins, reduce friction, build foundation

Be thorough, specific, and encouraging. Write at least 400 words. Use actual habit names throughout.`;
        userPrompt = `Here is my habit data for today:\n\n${habitSummary}\n\n${metrics}\n\nProvide comprehensive suggestions covering ALL sections. Be detailed, specific, and use my actual habit names. Give me thorough analysis of what's working and what's not.`;
    }

    console.log("Calling Gemini API with contextual analysis...");
    console.log("Missed habits:", missedToday.map(h => h.title));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      const safe = {
        recommendations: "You're doing okay. Let's try again a bit later.",
        analysisType,
        providerStatus: response.status,
      };
      state.cache[cacheKey] = { createdAt: now, payload: safe };
      return new Response(JSON.stringify(safe), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const recommendations = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate analysis at this time.";

    console.log("Successfully generated", analysisType, "analysis");

    const payload = {
      recommendations,
      analysisType,
      metrics: {
        avgCompletion,
        totalStreak,
        bestStreak,
        habitCount: habits.length,
        completedToday: completedToday.length,
        missedToday: missedToday.length,
        userCategory,
      },
    };

    state.cache[cacheKey] = { createdAt: now, payload };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Error in ai-recommendations function:", errorMessage);

    // Always return 200 with a safe fallback.
    return new Response(JSON.stringify({
      recommendations: "You're doing okay. Let's try again later.",
      analysisType: 'recommendations',
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

