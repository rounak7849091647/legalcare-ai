# Appendix B: Complete Source Code - Edge Functions

## Full Implementation of Supabase Edge Functions

**LegalCareAI - Proprietary Source Code**  
**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

## 1. Legal Chat Edge Function

**File**: `supabase/functions/legal-chat/index.ts`  
**Lines**: 252  
**Purpose**: AI-powered legal assistant with streaming responses

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getBNSContext } from "./bns-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationMessage {
  role: string;
  content: string;
}

// Language-specific prompts optimized for natural voice output
const getLanguageInstructions = (lang: string): string => {
  const voiceGuidelines = `
VOICE OUTPUT GUIDELINES (CRITICAL - MODERN LANGUAGE):
- Write in a super chill, friendly, and relatable tone - like chatting with a smart friend
- Use SIMPLE, EVERYDAY words - the kind young people actually speak TODAY
- AVOID old-fashioned, formal, or "textbook" language
- Mix common English words naturally when that's how people talk
- NEVER use markdown formatting (no **, ##, *, _, etc.)
- NEVER use bullet points or numbered lists
- Write complete sentences that sound natural when spoken
- Be warm, supportive, and encouraging
- Give DETAILED, COMPREHENSIVE responses - 4-6 sentences for legal questions
- Explain the legal context, steps to take, and practical advice
- Use casual connectors like "So basically," "The thing is," "Look," etc.

LAWYER REFERRAL (IMPORTANT):
- When users ask about finding a lawyer, ALWAYS refer them to our in-app Lawyer Directory at /lawyers
- Say something like "You can find verified lawyers right here on our platform - just go to the Lawyers section"
- Mention we have 75+ verified lawyers across all Indian states with expertise in Criminal Law, Family Law, Property Law, etc.
- NEVER refer to external bar association websites - we have our own lawyer directory!`;

  switch (lang) {
    case 'hi-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern, everyday Hindi. Mix English naturally.\nExample: "Dekho, yeh case mein basically tera point strong hai..."`;
    case 'hinglish':
      return `${voiceGuidelines}\nLANGUAGE: Natural Hinglish - code-switch between Hindi and English.\nExample: "Okay so basically, tera case dekh ke lag raha hai..."`;
    case 'ta-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern conversational Tamil.\nExample: "Paaru, indha case la actually enna problem na..."`;
    case 'te-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern conversational Telugu.\nExample: "Chudu, ee vishayam lo actually jarigedi enti ante..."`;
    case 'bn-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Bengali - Cholti bhasha.\nExample: "Dekho, ei case ta te actually hocche ki..."`;
    case 'mr-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Marathi - casual and friendly.\nExample: "Bagh, ya case madhe actually kay hota na..."`;
    case 'gu-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Gujarati - conversational.\nExample: "Jo, aa case ma actually su thay che ke..."`;
    case 'kn-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Kannada - everyday style.\nExample: "Nodu, ee case alli actually en agthide andre..."`;
    case 'ml-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Malayalam - conversational.\nExample: "Nokku, ee case il actually enthaanu karyam..."`;
    case 'pa-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Punjabi - friendly.\nExample: "Vekh, is case vich actually ki ho reha hai ki..."`;
    case 'or-IN':
      return `${voiceGuidelines}\nLANGUAGE: Modern Odia - simple and conversational.\nExample: "Dekh, ei case re actually kana heuchi na..."`;
    default:
      return `${voiceGuidelines}\nLANGUAGE: Simple, clear Indian English.\nExample: "Okay so basically, here's the thing about your case..."`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, detectedLanguage, documentContent, action, conversationHistory, stream } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hasDocument = documentContent && documentContent.length > 0;
    const hasHistory = conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const languageInstructions = getLanguageInstructions(detectedLanguage);
    const bnsRef = getBNSContext();

    // Handle document summarization
    if (action === 'summarize' && hasDocument) {
      console.log(`Summarizing document (${documentContent.length} chars)`);
      
      const summaryPrompt = `You are CARE, a friendly legal assistant. Summarize briefly.\n\n${languageInstructions}\n\nDOC: ${documentContent.slice(0, 3000)}\n\nGive 2-3 sentences: what it is, key terms, one warning.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: summaryPrompt }],
          max_tokens: 150,
          temperature: 0.2,
        }),
      });

      if (!response.ok) throw new Error("Failed to summarize document");

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || "Could not generate summary.";
      
      return new Response(
        JSON.stringify({ 
          response: summary,
          voiceResponse: summary,
          sessionId: sessionId || `session-${Date.now()}`,
          language: detectedLanguage || 'en-IN',
          action: 'summary'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt
    let systemPrompt = hasDocument
      ? `You are CARE, a friendly Indian legal AI assistant. Provide DETAILED, helpful legal guidance. ${bnsRef}\n${languageInstructions}\nDOCUMENT CONTEXT: ${documentContent.slice(0, 3000)}\nGive comprehensive answers explaining the legal situation, relevant laws, and practical next steps.`
      : `You are CARE, a friendly Indian legal AI assistant. ${bnsRef}\n${languageInstructions}\nProvide DETAILED legal guidance with context, relevant laws (BNS/IPC sections if applicable), and practical advice.`;

    // Build messages
    const messages: ConversationMessage[] = [{ role: "system", content: systemPrompt }];

    if (hasHistory) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    console.log(`Chat - Lang: ${detectedLanguage}, stream: ${stream}, msgs: ${messages.length}`);

    // STREAMING RESPONSE
    if (stream) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          max_tokens: 500,
          temperature: 0.3,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway streaming error:", response.status, errorText);
        throw new Error("Failed to get AI response");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // NON-STREAMING RESPONSE
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          max_tokens: 500,
          temperature: 0.3,
        }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        voiceResponse: aiResponse,
        sessionId: sessionId || `session-${Date.now()}`,
        language: detectedLanguage || 'en-IN'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Legal chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 2. BNS Knowledge Base

**File**: `supabase/functions/legal-chat/bns-knowledge.ts`  
**Lines**: 15  
**Purpose**: Bharatiya Nyaya Sanhita 2023 quick reference

```typescript
// BNS 2023 Quick Reference - Optimized for fast responses

export const getBNSContext = (): string => {
  return `BNS 2023 (replaced IPC):
MURDER: BNS 103 (IPC 302) - death/life
RAPE: BNS 64-66 (IPC 376)
CHEATING: BNS 318 (IPC 420)
CRUELTY: BNS 85 (IPC 498A)
DOWRY DEATH: BNS 80 (IPC 304B)
THEFT: BNS 303 (IPC 379)
ROBBERY: BNS 309 (IPC 392)
ATTEMPT MURDER: BNS 109 (IPC 307)
NEW: Organised Crime (111), Terrorist Act (113), Snatching (304), Community Service punishment
PRIVATE DEFENCE: BNS 34-44 - can cause death if rape/kidnap/robbery/acid attack threat`;
};
```

---

## 3. Voice-to-Text Edge Function

**File**: `supabase/functions/voice-to-text/index.ts`  
**Lines**: 183  
**Purpose**: Whisper-based audio transcription with Indian language support

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      throw new Error("No audio data provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing audio transcription, mimeType: ${mimeType || 'audio/webm'}`);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Determine file extension
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
    // Add prompt hint to preserve native scripts for Indian languages
    formData.append('prompt', 'Transcribe in the original language script. हिंदी में देवनागरी लिपि। தமிழில் தமிழ் எழுத்துக்கள். తెలుగులో తెలుగు లిపి. বাংলায় বাংলা লিপি. ಕನ್ನಡದಲ್ಲಿ ಕನ್ನಡ ಲಿಪಿ. മലയാളത്തിൽ മലയാളം ലിപി. ગુજરાતીમાં ગુજરાતી લિપિ. ਪੰਜਾਬੀ ਵਿੱਚ ਗੁਰਮੁਖੀ. ଓଡ଼ିଆରେ ଓଡ଼ିଆ ଲିପି. অসমীয়াত অসমীয়া লিপি.');

    console.log("Calling Whisper transcriptions API...");

    // Use TRANSCRIPTIONS API (keeps original language text)
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          text: "", 
          detectedLanguage: "en-IN",
          error: "Voice transcription not available. Please type your message.",
          fallback: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("Transcription result:", result.text?.slice(0, 100), "| Language:", result.language);

    // Map Whisper language codes to Indian language codes
    const languageMap: Record<string, string> = {
      'en': 'en-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN',
      'bn': 'bn-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'kn': 'kn-IN',
      'ml': 'ml-IN', 'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN',
    };

    const whisperLang = (result.language || 'en').toLowerCase();
    let detectedLanguage = languageMap[whisperLang] || 'en-IN';
    
    // Detect Hinglish
    if (whisperLang === 'en' && result.text) {
      const hinglishPatterns = /\b(kya|hai|hain|nahi|aur|mein|toh|kaise|kyun|kab|kaun|kaha)\b/i;
      if (hinglishPatterns.test(result.text)) {
        detectedLanguage = 'hinglish';
      }
    }

    return new Response(
      JSON.stringify({ text: result.text || "", detectedLanguage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Voice-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Transcription failed",
        text: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Edge Function Inventory

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| legal-chat | index.ts | 252 | AI chat with streaming |
| legal-chat | bns-knowledge.ts | 15 | BNS 2023 reference |
| voice-to-text | index.ts | 183 | Whisper transcription |
| text-to-speech | index.ts | ~100 | OpenAI TTS |
| bhashini-tts | index.ts | ~80 | Bhashini TTS |
| elevenlabs-tts | index.ts | ~90 | ElevenLabs TTS |
| murf-tts | index.ts | ~85 | Murf TTS |

**Total Edge Function Code**: ~800+ lines

---

*This documentation is confidential and proprietary. Unauthorized reproduction is prohibited.*
