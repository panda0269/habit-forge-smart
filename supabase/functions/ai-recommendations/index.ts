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

    const { habits, userCategory }: RequestBody = await req.json();
    console.log("Received request with habits:", habits.length, "userCategory:", userCategory);

    const habitSummary = habits.map(h => 
      `- ${h.title} (${h.category}): ${h.completionRate}% completion rate, ${h.currentStreak} day streak, ${h.missedDays} missed days out of ${h.totalDays}`
    ).join('\n');

    const systemPrompt = `You are an expert habit coach and behavioral psychologist. Analyze the user's habit data and provide personalized, actionable recommendations to improve their consistency and success.

The user is categorized as "${userCategory}" based on their overall habit performance:
- "consistent": They complete most habits regularly (>80% completion rate)
- "improving": They're making progress but have room to grow (50-80% completion rate)  
- "inconsistent": They struggle to maintain habits (<50% completion rate)

Provide 3-5 specific, encouraging recommendations based on their data. Be concise but impactful. Focus on:
1. Specific improvements for struggling habits
2. Ways to leverage their strengths
3. New habit suggestions that complement existing ones
4. Timing or reminder strategies
5. Motivation techniques suitable for their category`;

    const userPrompt = `Here is my current habit data:\n\n${habitSummary || "No habits tracked yet."}\n\nBased on this data and my "${userCategory}" status, what specific recommendations do you have to help me improve my habit consistency and achieve my goals?`;

    console.log("Calling Lovable AI Gateway...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices?.[0]?.message?.content || "Unable to generate recommendations at this time.";
    
    console.log("Successfully generated recommendations");

    return new Response(JSON.stringify({ recommendations }), {
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
