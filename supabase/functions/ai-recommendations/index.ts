import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { habits, userCategory, analysisType = 'recommendations' }: RequestBody = await req.json();
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
        needsAttention
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
        systemPrompt = `You are an expert behavioral data analyst specializing in habit formation patterns. Your role is to identify hidden patterns, correlations, and trends in user habit data.

Focus on:
1. Which habits are consistently missed together (category correlations)
2. What triggers streak breaks based on the data
3. Patterns in completion vs missed habits
4. Early warning signs visible in the data

Be specific and reference actual habit names. Provide actionable pattern insights.`;
        userPrompt = `Analyze my habit data for patterns:\n\n${habitSummary}\n\n${metrics}\n\nFocus especially on patterns in my missed habits and what might be causing them.`;
        break;

      case 'insights':
        systemPrompt = `You are an AI habit intelligence system providing deep analytical insights about habit behavior and psychology.

Analyze:
1. Why certain habits might be harder than others based on the data
2. Psychological factors that might explain the patterns
3. What the streak data reveals about consistency
4. Predictions for habit success based on current trends

Be specific and use actual habit names from the data.`;
        userPrompt = `Generate insights from my habit data:\n\n${habitSummary}\n\n${metrics}\n\nFocus on understanding WHY I might be missing certain habits.`;
        break;

      case 'coaching':
        systemPrompt = `You are a supportive personal habit coach. Your style adapts to the user's situation:
${userCategory === 'consistent' ? '- High performer: Challenge them to optimize and reach new heights' :
  userCategory === 'improving' ? '- Building momentum: Encourage consistency and celebrate progress' :
  '- Struggling: Be compassionate, focus on tiny wins and removing friction'}

Your coaching MUST:
1. Acknowledge completed habits first (celebrate wins)
2. Address EACH missed habit specifically by name
3. For each missed habit, analyze WHY it might have been skipped based on its data
4. Provide a specific, actionable strategy for each struggling habit
5. End with encouragement for the rest of the day

Speak directly to the user ("you"). Be warm but actionable.`;
        userPrompt = `Coach me based on my habit data:\n\n${habitSummary}\n\n${metrics}\n\nGive me specific guidance for each missed habit and help me understand why I might be struggling with them.`;
        break;

      default: // recommendations (suggestions)
        systemPrompt = `You are an expert habit coach providing real-time, contextual suggestions. Your role is to analyze habits that haven't been completed TODAY and provide specific, actionable advice.

CRITICAL INSTRUCTIONS:
1. Focus primarily on TODAY'S MISSED HABITS - these need immediate attention
2. For EACH missed habit, analyze:
   - Why it might have been skipped (based on completion rate, streak data, category)
   - Whether it's a chronic struggle or unusual miss
   - A specific strategy to complete it TODAY
3. If a habit has low completion rate, suggest ways to make it easier or more achievable
4. If a streak was just broken, acknowledge it and provide recovery strategy
5. Look for category patterns (e.g., all fitness habits missed = possible energy issue)

User is "${userCategory}":
- consistent (>80%): Optimize and prevent slips
- improving (50-80%): Build momentum on struggling habits  
- inconsistent (<50%): Focus on making habits easier and building small wins

Format with clear sections:
🎯 IMMEDIATE ACTIONS: What to do right now for missed habits
💡 WHY YOU MIGHT BE STRUGGLING: Analysis of patterns
🔧 ADJUSTMENTS TO CONSIDER: Ways to make struggling habits easier
✨ WHAT'S WORKING: Acknowledge completed habits/good streaks`;
        
        userPrompt = `Here is my habit data for today:\n\n${habitSummary}\n\n${metrics}\n\nProvide specific suggestions for my missed habits. For each one, tell me WHY I might have missed it and HOW I can complete it today. Be specific with habit names.`;
    }

    console.log("Calling Lovable AI Gateway with contextual analysis...");
    console.log("Missed habits:", missedToday.map(h => h.title));
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const recommendations = data.choices?.[0]?.message?.content || "Unable to generate analysis at this time.";
    
    console.log("Successfully generated", analysisType, "analysis");

    return new Response(JSON.stringify({ 
      recommendations,
      analysisType,
      metrics: {
        avgCompletion,
        totalStreak,
        bestStreak,
        habitCount: habits.length,
        completedToday: completedToday.length,
        missedToday: missedToday.length,
        userCategory
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Error in ai-recommendations function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
