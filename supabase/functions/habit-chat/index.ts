import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const state = (globalThis as unknown as {
    __habitChatState?: {
      lastCallByUser: Record<string, number>;
    };
  }).__habitChatState ??
    ((globalThis as unknown as { __habitChatState?: unknown }).__habitChatState = {
      lastCallByUser: {},
    }) as { lastCallByUser: Record<string, number> };

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

    if ((Deno.env.get('AI_CHAT_DISABLED') ?? '').toLowerCase() === 'true') {
      return new Response(JSON.stringify({
        reply: "Chat is temporarily disabled. Please try again later.",
        disabled: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Authenticated user:", user.id);

    const GEMINI_API_KEY = Deno.env.get("gem");
    if (!GEMINI_API_KEY) {
      console.error("Gemini API key (gem) is not configured");
      return new Response(JSON.stringify({
        reply: "I'm not configured for chat yet. Please try again later.",
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

    const { message, habitContext, conversationHistory, userCategory } = body;

    // Server-side throttle: avoid chat runaway
    const now = Date.now();
    const last = state.lastCallByUser[user.id] ?? 0;
    if (now - last < 2_000) {
      return new Response(JSON.stringify({
        reply: "One sec — I'm getting too many requests. Please try again in a moment.",
        throttled: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    state.lastCallByUser[user.id] = now;

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

GUIDELINES:
- Reference their specific habits by name when relevant
- If they ask about a missed habit, analyze why it might be difficult and suggest solutions
- If they're doing well, acknowledge it but keep pushing for growth
- Share scientific insights when helpful but keep it practical

Remember: You're having a conversation, so be natural and responsive to what they actually asked.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: message },
    ];

    console.log("Calling Gemini API for chat response...");

    // Convert messages to Gemini format
    const geminiContents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiContents,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({
        reply: "I'm having trouble responding right now. Please try again in a bit.",
        providerStatus: response.status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble responding right now. Please try again!";

    console.log("Chat response generated successfully");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Error in habit-chat function:", errorMessage);
    // Always return 200 with a safe fallback
    return new Response(JSON.stringify({
      reply: "I'm here with you — let's try again in a moment.",
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

