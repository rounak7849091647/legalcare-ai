import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voice IDs optimized for Indian languages using ElevenLabs multilingual v2
// Using female voices for natural, warm Indian language pronunciation
// These voices work excellently with multilingual model for Indian languages
const VOICE_MAP: Record<string, string> = {
  'en-IN': 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear, warm English voice
  'hi-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - warm female voice, excellent Hindi pronunciation
  'hinglish': 'XrExE9yKIg1WjnnlVkGX', // Matilda - handles code-switching naturally
  'ta-IN': 'pFZP5JQG7iQjIQuC4Bku', // Lily - soft female voice, great for Tamil
  'te-IN': 'pFZP5JQG7iQjIQuC4Bku', // Lily - handles Telugu well
  'bn-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - works beautifully with Bengali
  'mr-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - good for Marathi
  'gu-IN': 'pFZP5JQG7iQjIQuC4Bku', // Lily - handles Gujarati
  'kn-IN': 'pFZP5JQG7iQjIQuC4Bku', // Lily - handles Kannada
  'ml-IN': 'pFZP5JQG7iQjIQuC4Bku', // Lily - handles Malayalam
  'pa-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - good for Punjabi
  'or-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - handles Odia
  'as-IN': 'XrExE9yKIg1WjnnlVkGX', // Matilda - handles Assamese
};

const DEFAULT_VOICE = 'XrExE9yKIg1WjnnlVkGX'; // Matilda - warm female default

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    if (!text || !text.trim()) {
      throw new Error("Text is required");
    }

    // Select voice based on language
    const voiceId = VOICE_MAP[language] || DEFAULT_VOICE;
    
    console.log(`TTS - Language: ${language}, Voice: ${voiceId}, Text length: ${text.length}`);

    // Use turbo v2.5 model - fastest with high quality for Indian languages
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.substring(0, 2500),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.65,
            style: 0.1,
            use_speaker_boost: true,
            speed: 0.92,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
