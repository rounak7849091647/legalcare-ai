import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice mapping for Indian languages - using Murf's GEN2 model voices
// Using native Indian voices with modern, conversational style for Gen Z users
const VOICE_MAP: Record<string, { voiceId: string; multiNativeLocale?: string; style?: string }> = {
  // English - India (native Indian English - young, modern voice)
  'en-IN': { voiceId: 'en-IN-priya', style: 'Conversational' },
  'en-US': { voiceId: 'en-US-natalie', style: 'Conversational' },
  
  // Hindi - India (Ruby with modern Hindi locale - casual and friendly)
  'hi-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'hi-IN', style: 'Conversational' },
  'hinglish': { voiceId: 'en-UK-ruby', multiNativeLocale: 'hi-IN', style: 'Conversational' },
  
  // Tamil - India (native Tamil voice - clear and modern)
  'ta-IN': { voiceId: 'ta-IN-suresh', style: 'Conversational' },
  
  // Telugu - India (Ruby with Telugu locale - friendly tone)
  'te-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'te-IN', style: 'Conversational' },
  
  // Bengali/Bangla - India (native Bengali voice - warm and clear)
  'bn-IN': { voiceId: 'bn-IN-ishani', style: 'Conversational' },
  
  // Marathi - India (Ruby with Marathi locale)
  'mr-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'mr-IN', style: 'Conversational' },
  
  // Gujarati - India (Ruby with Gujarati locale)
  'gu-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'gu-IN', style: 'Conversational' },
  
  // Kannada - India (Ruby with Kannada locale)
  'kn-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'kn-IN', style: 'Conversational' },
  
  // Malayalam - India (Ruby with Malayalam locale)
  'ml-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'ml-IN', style: 'Conversational' },
  
  // Punjabi - India (Ruby with Punjabi locale)
  'pa-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'pa-IN', style: 'Conversational' },
  
  // Odia - India (Ruby with Odia locale - proper Odia support!)
  'or-IN': { voiceId: 'en-UK-ruby', multiNativeLocale: 'or-IN', style: 'Conversational' },
  
  // Assamese - India (fallback to Bengali voice - similar language family)
  'as-IN': { voiceId: 'bn-IN-ishani', style: 'Conversational' },
};

const DEFAULT_VOICE = { voiceId: 'en-IN-priya', style: 'Conversational' };

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('MURF_API_KEY');
    if (!apiKey) {
      console.error('MURF_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Murf API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voiceConfig = VOICE_MAP[language] || DEFAULT_VOICE;
    console.log(`Generating speech with Murf AI GEN2 - voice: ${voiceConfig.voiceId}, language: ${language}, multiNativeLocale: ${voiceConfig.multiNativeLocale || 'none'}`);

    // Build request body for GEN2 model with optimized settings
    const requestBody: Record<string, unknown> = {
      text: text,
      voiceId: voiceConfig.voiceId,
      format: 'MP3',
      encodeAsBase64: true,
      modelVersion: 'GEN2',
      sampleRate: 48000, // Higher sample rate for clearer audio
      speed: 0.95, // Slightly slower for clearer pronunciation
      pitch: 0, // Natural pitch
      audioDuration: 0, // Auto duration
      variation: 1, // Natural variation in speech
      pronunciationDictionary: {}, // Can add custom pronunciations if needed
    };

    // Add style if specified
    if (voiceConfig.style) {
      requestBody.style = voiceConfig.style;
    }

    // Add multiNativeLocale for cross-language voices
    if (voiceConfig.multiNativeLocale) {
      requestBody.multiNativeLocale = voiceConfig.multiNativeLocale;
    }

    // Add emphasis for better pronunciation
    requestBody.emphasis = {};

    // Call Murf API
    const response = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Murf API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Murf API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Murf API response received, audio length:', data.audioLengthInSeconds);

    // Return base64 encoded audio
    if (data.encodedAudio) {
      return new Response(
        JSON.stringify({ audioContent: data.encodedAudio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.audioFile) {
      // If we got a URL instead, fetch it and convert to base64
      const audioResponse = await fetch(data.audioFile);
      const audioBuffer = await audioResponse.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      
      return new Response(
        JSON.stringify({ audioContent: base64Audio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'No audio content in response' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in murf-tts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
