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
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      console.error("MISTRAL_API_KEY is not configured");
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const { habits, userCategory, analysisType = 'recommendations' }: RequestBody = await req.json();
    console.log("Received request - habits:", habits.length, "userCategory:", userCategory, "analysisType:", analysisType);

    const habitSummary = habits.map(h => 
      `- ${h.title} (${h.category}): ${h.completionRate}% completion, ${h.currentStreak} day streak (best: ${h.longestStreak}), ${h.missedDays} missed/${h.totalDays} total days`
    ).join('\n');

    // Calculate advanced metrics
    const avgCompletion = habits.length > 0 
      ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) 
      : 0;
    const totalStreak = habits.reduce((sum, h) => sum + h.currentStreak, 0);
    const bestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
    const categoryBreakdown = habits.reduce((acc, h) => {
      acc[h.category] = (acc[h.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const metrics = `
Overall Stats:
- Average completion rate: ${avgCompletion}%
- Total active streak days: ${totalStreak}
- Best streak achieved: ${bestStreak} days
- Category distribution: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ')}
- User performance category: ${userCategory}`;

    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'patterns':
        systemPrompt = `You are an expert behavioral data analyst specializing in habit formation patterns. Your role is to identify hidden patterns, correlations, and trends in user habit data using advanced pattern recognition.

Analyze the data to identify:
1. TIME PATTERNS: When habits are most/least likely to be completed
2. CATEGORY CORRELATIONS: How habits in one category affect others
3. STREAK PATTERNS: What triggers streak breaks and continuations
4. MOMENTUM INDICATORS: Signs of improvement or decline
5. RISK FACTORS: Early warning signs for habit abandonment

Provide structured analysis with specific data-driven insights. Use percentages and comparisons where relevant.`;
        userPrompt = `Analyze my habit data for hidden patterns and correlations:\n\n${habitSummary}\n\n${metrics}\n\nProvide a detailed pattern analysis with specific insights and actionable observations.`;
        break;

      case 'insights':
        systemPrompt = `You are an AI habit intelligence system that provides deep analytical insights. Think like a data scientist combined with a behavioral psychologist.

Generate insights in these categories:
1. PERFORMANCE INSIGHTS: What the numbers really tell us
2. BEHAVIORAL INSIGHTS: Psychological patterns and tendencies
3. PREDICTIVE INSIGHTS: What's likely to happen if current trends continue
4. COMPARATIVE INSIGHTS: How this compares to optimal habit formation
5. OPPORTUNITY INSIGHTS: Untapped potential and quick wins

Be specific, data-driven, and actionable. Format with clear headers and bullet points.`;
        userPrompt = `Generate deep analytical insights from my habit data:\n\n${habitSummary}\n\n${metrics}\n\nProvide comprehensive insights that go beyond surface-level observations.`;
        break;

      case 'coaching':
        systemPrompt = `You are an elite performance coach specializing in habit transformation. Your coaching style is ${
          userCategory === 'consistent' ? 'challenging and growth-focused for high performers' :
          userCategory === 'improving' ? 'encouraging and momentum-building' :
          'compassionate but direct, focusing on small wins'
        }.

Provide personalized coaching that includes:
1. CURRENT STATE ASSESSMENT: Honest evaluation of where they are
2. PERSONALIZED STRATEGY: Specific tactics for their situation
3. MINDSET COACHING: Mental shifts needed for success
4. ACCOUNTABILITY FRAMEWORK: How to stay on track
5. NEXT STEPS: Clear, immediate actions to take

Make it feel like a real coaching session - personal, actionable, and motivating.`;
        userPrompt = `Provide personalized coaching based on my habit data:\n\n${habitSummary}\n\n${metrics}\n\nGive me a coaching session that addresses my specific situation and helps me level up.`;
        break;

      default: // recommendations
        systemPrompt = `You are an expert habit coach and behavioral psychologist powered by advanced ML analysis. Analyze the user's habit data and provide personalized, actionable recommendations.

The user is categorized as "${userCategory}":
- "consistent": Completes most habits regularly (>80% completion rate) - focus on optimization and new challenges
- "improving": Making progress but has room to grow (50-80%) - focus on momentum and consistency strategies
- "inconsistent": Struggles to maintain habits (<50%) - focus on simplification and small wins

Provide 4-6 specific, data-driven recommendations. Structure your response with:
1. 🎯 PRIORITY ACTIONS: Most impactful changes to make now
2. 💡 SMART SUGGESTIONS: Specific improvements for struggling habits
3. 🔗 HABIT STACKING: Ways to link habits for better success
4. ⏰ TIMING OPTIMIZATION: When to do what for best results
5. 🧠 MINDSET SHIFTS: Mental strategies for better consistency

Be concise but impactful. Use the actual habit names and data in your recommendations.`;
        userPrompt = `Here is my habit data:\n\n${habitSummary}\n\n${metrics}\n\nBased on this data and my "${userCategory}" status, provide specific ML-powered recommendations to improve my habit consistency.`;
    }

    console.log("Calling Mistral AI API...");
    
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid API key. Please check your Mistral API configuration." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
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
