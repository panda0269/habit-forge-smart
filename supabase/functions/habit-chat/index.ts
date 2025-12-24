import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HabitSummary {
  title: string;
  category: string;
  completionRate: number;
  currentStreak: number;
  completedToday: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  habitContext: HabitSummary[];
  conversationHistory: Message[];
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

    const { message, habitContext, conversationHistory, userCategory } = body;

    // Validate message
    if (typeof message !== 'string' || message.length === 0) {
      return new Response(JSON.stringify({ error: 'message is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 5000) {
      return new Response(JSON.stringify({ error: 'message must be 5000 characters or less' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate habitContext array
    if (!Array.isArray(habitContext)) {
      return new Response(JSON.stringify({ error: 'habitContext must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (habitContext.length > 100) {
      return new Response(JSON.stringify({ error: 'habitContext must contain 100 or fewer items' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate conversationHistory array
    if (!Array.isArray(conversationHistory)) {
      return new Response(JSON.stringify({ error: 'conversationHistory must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (conversationHistory.length > 50) {
      return new Response(JSON.stringify({ error: 'conversationHistory must contain 50 or fewer messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate each message in conversation history
    for (const msg of conversationHistory) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return new Response(JSON.stringify({ error: 'conversationHistory messages must have valid role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (typeof msg.content !== 'string' || msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: 'conversationHistory messages must have valid content (max 10000 chars)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate userCategory enum
    const validCategories = ['consistent', 'improving', 'inconsistent'];
    if (!validCategories.includes(userCategory)) {
      return new Response(JSON.stringify({ error: 'userCategory must be consistent, improving, or inconsistent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate habitContext items
    for (const habit of habitContext) {
      if (!habit.title || typeof habit.title !== 'string' || habit.title.length > 500) {
        return new Response(JSON.stringify({ error: 'each habit must have a valid title (max 500 chars)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log("Chat request received - message:", message.substring(0, 50), "habits:", habitContext.length);

    // Build habit context summary
    const habitSummary = habitContext.map(h => 
      `- ${h.title} (${h.category}): ${h.completedToday ? '✅ Done' : '❌ Not done'}, ${h.completionRate}% completion, ${h.currentStreak} day streak`
    ).join('\n');

    const completedCount = habitContext.filter(h => h.completedToday).length;
    const missedHabits = habitContext.filter(h => !h.completedToday).map(h => h.title);

    const systemPrompt = `You are a friendly and knowledgeable habit-building coach named Sage. You help users build better habits through conversation.

YOUR PERSONALITY:
- Warm, supportive, and encouraging
- Evidence-based but approachable
- You celebrate wins and offer gentle guidance for struggles
- You keep responses concise (2-4 paragraphs max unless detailed help is requested)

USER CONTEXT:
- Performance level: ${userCategory}
- Today's progress: ${completedCount}/${habitContext.length} habits completed
- Missed habits today: ${missedHabits.length > 0 ? missedHabits.join(', ') : 'None - all done!'}

CURRENT HABITS:
${habitSummary || 'No habits created yet'}

YOUR CAPABILITIES:
1. Answer questions about habit building, motivation, and behavior change
2. Provide specific advice for their existing habits
3. Suggest new habits based on their goals
4. Help troubleshoot why certain habits aren't sticking
5. Share habit stacking and other proven techniques
6. Offer encouragement and accountability

GUIDELINES:
- Reference their specific habits by name when relevant
- If they ask about a missed habit, analyze why it might be difficult and suggest solutions
- If they're doing well, acknowledge it but keep pushing for growth
- Share scientific insights when helpful but keep it practical
- Use emojis sparingly for warmth 🌟

Remember: You're having a conversation, so be natural and responsive to what they actually asked.`;

    // Build conversation with history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    console.log("Calling Lovable AI for chat response...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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
      
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm having trouble responding right now. Please try again!";
    
    console.log("Chat response generated successfully");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Error in habit-chat function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
