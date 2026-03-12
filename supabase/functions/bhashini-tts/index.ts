import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map our language codes to ISO 639-1 codes for Bhashini
const LANGUAGE_CODES: Record<string, string> = {
  'en-IN': 'en',
  'hi-IN': 'hi',
  'hinglish': 'hi',
  'ta-IN': 'ta',
  'te-IN': 'te',
  'bn-IN': 'bn',
  'mr-IN': 'mr',
  'gu-IN': 'gu',
  'kn-IN': 'kn',
  'ml-IN': 'ml',
  'pa-IN': 'pa',
  'or-IN': 'or',
  'as-IN': 'as',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();

    if (!text || !text.trim()) {
      throw new Error("Text is required");
    }

    const langCode = LANGUAGE_CODES[language] || 'en';
    const gender = 'female';
    
    console.log(`Bhashini TTS - Language: ${langCode}, Text length: ${text.length}`);

    // Use AI4Bharat's free TTS endpoint (part of Bhashini ecosystem)
    // This endpoint doesn't require API key for basic usage
    const response = await fetch("https://tts.bhashini.ai/v1/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text.substring(0, 5000),
        lang: langCode,
        gender: gender,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bhashini TTS API error:", response.status, errorText);
      
      // Return fallback signal - client will use browser TTS
      return new Response(
        JSON.stringify({ error: "Bhashini TTS unavailable", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check content type to determine response format
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("audio")) {
      // Direct audio response
      const audioBuffer = await response.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
        },
      });
    } else {
      // JSON response with base64 audio
      const data = await response.json();
      if (data.audio) {
        // Decode base64 audio
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Response(bytes, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/wav",
          },
        });
      }
      
      // Fallback if no audio in response
      return new Response(
        JSON.stringify({ error: "No audio in response", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, fallback: true }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
