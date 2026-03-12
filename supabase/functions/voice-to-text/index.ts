import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, mimeType } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ 
          ok: false, text: "", errorCode: "stt_audio_invalid",
          userMessage: "No audio data received. Please try recording again.",
          retryable: true, detectedLanguage: null
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use OPENAI_API_KEY for direct Whisper calls (NOT the gateway key)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured for STT");
      return new Response(
        JSON.stringify({ 
          ok: false, text: "", errorCode: "stt_key_missing",
          userMessage: "Voice transcription service is not configured. Please type your message.",
          retryable: false, detectedLanguage: null
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing audio transcription, mimeType: ${mimeType || 'audio/webm'}`);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Determine file extension based on mime type
    const audioMimeType = mimeType || 'audio/webm';
    let extension = 'webm';
    if (audioMimeType.includes('mp4') || audioMimeType.includes('m4a')) {
      extension = 'm4a';
    } else if (audioMimeType.includes('wav')) {
      extension = 'wav';
    } else if (audioMimeType.includes('ogg')) {
      extension = 'ogg';
    }
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio as unknown as ArrayBuffer], { type: audioMimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('prompt', 'Transcribe in the original language script. हिंदी में देवनागरी लिपि। தமிழில் தமிழ் எழுத்துக்கள். తెలుగులో తెలుగు లిపి. বাংলায় বাংলা লিপি. ಕನ್ನಡದಲ್ಲಿ ಕನ್ನಡ ಲಿಪಿ. മലയാളത്തിൽ മലയാളം ലിപി. ગુજરાતીમાં ગુજરાતી લિપિ. ਪੰਜਾਬੀ ਵਿੱਚ ਗੁਰਮੁਖੀ. ଓଡ଼ିଆରେ ଓଡ଼ିଆ ଲିପି. অসমীয়াত অসমীয়া লিপি.');

    console.log("Calling Whisper transcriptions API with OPENAI_API_KEY...");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", response.status, errorText);
      
      let errorCode = "stt_provider_error";
      let userMessage = "Voice transcription failed. Please try again or type your message.";
      let retryable = false;

      if (response.status === 401) {
        errorCode = "stt_auth_invalid";
        userMessage = "Voice service authentication failed. Please type your message.";
      } else if (response.status === 429) {
        errorCode = "stt_quota_exceeded";
        userMessage = "Voice service is busy. Please wait a moment and try again.";
        retryable = true;
      } else if (response.status >= 500) {
        errorCode = "stt_provider_unavailable";
        userMessage = "Voice service temporarily unavailable. Please try again shortly.";
        retryable = true;
      } else if (errorText.includes("audio") || errorText.includes("file")) {
        errorCode = "stt_audio_invalid";
        userMessage = "Audio could not be processed. Try speaking more clearly.";
        retryable = true;
      }

      return new Response(
        JSON.stringify({ 
          ok: false, text: "", errorCode, userMessage, retryable, detectedLanguage: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("Transcription result - Text sample:", result.text?.slice(0, 100), "| Detected language:", result.language);

    // Map Whisper language codes to Indian language codes
    const languageMap: Record<string, string> = {
      'en': 'en-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN',
      'bn': 'bn-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'kn': 'kn-IN',
      'ml': 'ml-IN', 'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN',
      'ory': 'or-IN', 'ori': 'or-IN', 'asm': 'as-IN',
      'punjabi': 'pa-IN', 'hindi': 'hi-IN', 'tamil': 'ta-IN',
      'telugu': 'te-IN', 'bengali': 'bn-IN', 'marathi': 'mr-IN',
      'gujarati': 'gu-IN', 'kannada': 'kn-IN', 'malayalam': 'ml-IN',
      'odia': 'or-IN', 'assamese': 'as-IN'
    };

    const whisperLang = (result.language || 'en').toLowerCase();
    let detectedLanguage = languageMap[whisperLang] || 'en-IN';
    
    // Hinglish detection
    if (whisperLang === 'en' && result.text) {
      const hinglishPatterns = /\b(kya|hai|hain|nahi|aur|mein|toh|kaise|kyun|kab|kaun|kaha|ho|kar|raha|rahe|tha|thi|the)\b/i;
      if (hinglishPatterns.test(result.text)) {
        detectedLanguage = 'hinglish';
        console.log("Detected Hinglish based on text patterns");
      }
    }

    console.log("Final detected language:", detectedLanguage);

    return new Response(
      JSON.stringify({ 
        ok: true,
        text: result.text || "",
        detectedLanguage,
        errorCode: null,
        userMessage: null,
        retryable: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Voice-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        errorCode: "stt_internal_error",
        userMessage: "Voice processing failed. Please type your message.",
        text: "",
        retryable: true,
        detectedLanguage: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
