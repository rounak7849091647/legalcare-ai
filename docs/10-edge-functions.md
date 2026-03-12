# Edge Functions

## Serverless Backend Documentation

---

## 1. Overview

LegalCareAI uses Supabase Edge Functions (Deno runtime) for serverless backend processing. All functions are deployed automatically and scale based on demand.

---

## 2. Configuration

### 2.1 supabase/config.toml

```toml
project_id = "tgjcwduahytknwjhmqty"

[functions.legal-chat]
verify_jwt = false

[functions.text-to-speech]
verify_jwt = false

[functions.bhashini-tts]
verify_jwt = false

[functions.elevenlabs-tts]
verify_jwt = false

[functions.voice-to-text]
verify_jwt = false

[functions.murf-tts]
verify_jwt = false
```

---

## 3. Edge Functions

### 3.1 legal-chat

**Purpose:** AI legal assistant with BNS 2023 knowledge

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/legal-chat`

**Request:**
```typescript
interface LegalChatRequest {
  message: string;
  sessionId: string;
  detectedLanguage: string;
  documentContent?: string;
  action?: 'summarize';
  conversationHistory?: Array<{ role: string; content: string }>;
  stream?: boolean;
}
```

**Response (Non-streaming):**
```typescript
interface LegalChatResponse {
  response: string;
  voiceResponse: string;
  sessionId: string;
  language: string;
  action?: 'summary';
}
```

**Response (Streaming):** Server-Sent Events (text/event-stream)

**Secrets Required:**
- `LOVABLE_API_KEY`

---

### 3.2 text-to-speech

**Purpose:** OpenAI TTS for voice output

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/text-to-speech`

**Implementation:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language, voice } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Select voice based on language
    const selectedVoice = voice || getVoiceForLanguage(language);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: selectedVoice,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    return new Response(
      JSON.stringify({ audio: base64Audio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getVoiceForLanguage(lang: string): string {
  // OpenAI TTS voices
  const voiceMap: Record<string, string> = {
    'en-IN': 'alloy',
    'hi-IN': 'shimmer',
    'default': 'nova'
  };
  return voiceMap[lang] || voiceMap['default'];
}
```

**Request:**
```typescript
interface TTSRequest {
  text: string;
  language: string;
  voice?: string;
}
```

**Response:**
```typescript
interface TTSResponse {
  audio: string; // Base64 encoded MP3
}
```

**Secrets Required:**
- `OPENAI_API_KEY`

---

### 3.3 voice-to-text

**Purpose:** Whisper STT for voice input

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/voice-to-text`

**Implementation:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, language } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Decode base64 audio
    const binaryAudio = Uint8Array.from(
      atob(audio),
      (c) => c.charCodeAt(0)
    );

    // Create form data
    const formData = new FormData();
    formData.append("file", new Blob([binaryAudio], { type: "audio/webm" }), "audio.webm");
    formData.append("model", "whisper-1");
    
    // Use language hint for better accuracy
    if (language) {
      const langCode = language.split('-')[0]; // 'hi-IN' -> 'hi'
      formData.append("language", langCode);
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ 
        transcript: data.text,
        language: language 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("STT error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Request:**
```typescript
interface STTRequest {
  audio: string; // Base64 encoded audio
  language?: string;
}
```

**Response:**
```typescript
interface STTResponse {
  transcript: string;
  language: string;
}
```

**Secrets Required:**
- `OPENAI_API_KEY`

---

### 3.4 elevenlabs-tts

**Purpose:** Alternative TTS with natural voices

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/elevenlabs-tts`

**Implementation:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const defaultVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    return new Response(
      JSON.stringify({ audio: base64Audio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ElevenLabs error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Secrets Required:**
- `ELEVENLABS_API_KEY`

---

### 3.5 murf-tts

**Purpose:** Murf AI TTS for Indian voices

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/murf-tts`

**Secrets Required:**
- `MURF_API_KEY`

---

### 3.6 bhashini-tts

**Purpose:** Bhashini API for Indian language TTS

**Endpoint:** `https://tgjcwduahytknwjhmqty.supabase.co/functions/v1/bhashini-tts`

---

## 4. Secrets Management

### 4.1 Configured Secrets

| Secret Name | Purpose | Service |
|-------------|---------|---------|
| LOVABLE_API_KEY | AI Gateway access | Lovable AI |
| OPENAI_API_KEY | TTS/STT services | OpenAI |
| ELEVENLABS_API_KEY | Alternative TTS | ElevenLabs |
| MURF_API_KEY | Indian voice TTS | Murf AI |
| SUPABASE_SERVICE_ROLE_KEY | Admin database access | Supabase |
| SUPABASE_URL | Project URL | Supabase |
| SUPABASE_ANON_KEY | Public API key | Supabase |

### 4.2 Accessing Secrets

```typescript
// In edge function
const API_KEY = Deno.env.get("SECRET_NAME");

if (!API_KEY) {
  throw new Error("SECRET_NAME not configured");
}
```

---

## 5. CORS Configuration

All edge functions include CORS headers for cross-origin requests:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

// Include in all responses
return new Response(data, {
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

---

## 6. Error Handling

### 6.1 Standard Error Response

```typescript
try {
  // Function logic
} catch (error) {
  console.error("Function error:", error);
  return new Response(
    JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
```

### 6.2 Rate Limiting Response

```typescript
if (response.status === 429) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait." }),
    { 
      status: 429, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
```

---

## 7. Calling Edge Functions

### 7.1 From Client (Supabase SDK)

```typescript
import { supabase } from "@/integrations/supabase/client";

// Using invoke
const { data, error } = await supabase.functions.invoke('legal-chat', {
  body: {
    message: 'What is BNS 103?',
    sessionId: 'session-123',
    detectedLanguage: 'en-IN',
    stream: false
  }
});
```

### 7.2 Direct Fetch (Streaming)

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      message: 'What is BNS 103?',
      stream: true
    }),
  }
);

// Process stream
const reader = response.body.getReader();
```

---

*This edge functions documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
