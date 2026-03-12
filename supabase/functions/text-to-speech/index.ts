import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// OpenAI TTS voices optimized for Indian languages
const VOICE_MAP: Record<string, string> = {
  'en-IN': 'nova',
  'hi-IN': 'onyx',
  'hinglish': 'nova',
  'ta-IN': 'shimmer',
  'te-IN': 'shimmer',
  'bn-IN': 'alloy',
  'mr-IN': 'alloy',
  'gu-IN': 'alloy',
  'kn-IN': 'shimmer',
  'ml-IN': 'shimmer',
  'pa-IN': 'onyx',
  'or-IN': 'alloy',
  'as-IN': 'alloy',
};

const DEFAULT_VOICE = 'alloy';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!text || !text.trim()) {
      throw new Error("Text is required");
    }

    const voice = VOICE_MAP[language] || DEFAULT_VOICE;

    console.log(`TTS - Language: ${language}, Voice: ${voice}, Text length: ${text.length}`);

    // Use tts-1 (fastest model) with opus format (smallest, lowest latency)
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.substring(0, 4096),
        voice: voice,
        response_format: "opus",
        speed: 1.05,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", fallback: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "TTS API error", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream audio directly back — no buffering the entire response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/ogg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
