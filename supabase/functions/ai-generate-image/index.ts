import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { habitTitle, category, mood = 'encouraging' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        error: "Image generation not configured",
        imageUrl: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a descriptive prompt based on context
    let promptParts = [];
    
    if (mood === 'celebrating') {
      promptParts.push("A celebratory, triumphant scene");
    } else if (mood === 'challenging') {
      promptParts.push("An inspiring scene of someone overcoming a challenge");
    } else {
      promptParts.push("A warm, encouraging motivational scene");
    }

    if (category) {
      const categoryPrompts: Record<string, string> = {
        health: "featuring healthy lifestyle elements like fresh food, nature, and wellness",
        fitness: "with athletic energy, movement, and physical strength",
        productivity: "showing focus, organization, and achievement",
        mindfulness: "with peaceful, calm, meditative atmosphere",
        learning: "featuring books, knowledge, and intellectual growth",
        social: "showing human connection and community",
        other: "with general positive vibes and growth"
      };
      promptParts.push(categoryPrompts[category] || categoryPrompts.other);
    }

    if (habitTitle) {
      promptParts.push(`inspired by the concept of "${habitTitle}"`);
    }

    promptParts.push("Modern illustration style, vibrant colors, inspiring mood, no text");

    const prompt = promptParts.join(", ");
    console.log("Generating image with prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Failed to generate image",
        imageUrl: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ 
        error: "No image generated",
        imageUrl: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image generated successfully");

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in ai-generate-image function:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Unknown error",
      imageUrl: null 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
