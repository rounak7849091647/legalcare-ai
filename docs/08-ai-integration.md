# AI Integration

## Legal AI System Documentation

---

## 1. Overview

LegalCareAI uses Google's Gemini 2.5 Flash model through the Lovable AI Gateway. The system is specifically optimized for Indian legal queries with integrated BNS 2023 knowledge.

---

## 2. Edge Function: legal-chat

### 2.1 Complete Implementation

```typescript
// supabase/functions/legal-chat/index.ts
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
- Mention we have 75+ verified lawyers across all Indian states
- NEVER refer to external bar association websites`;

  switch (lang) {
    case 'hi-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern, everyday Hindi. Mix English naturally.
Example: "Dekho, yeh case mein basically tera point strong hai..."`;
    case 'hinglish':
      return `${voiceGuidelines}
LANGUAGE: Natural Hinglish - code-switch between Hindi and English.
Example: "Okay so basically, tera case dekh ke lag raha hai..."`;
    case 'ta-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern conversational Tamil.`;
    case 'te-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern conversational Telugu.`;
    case 'bn-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Bengali - Cholti bhasha.`;
    case 'mr-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Marathi - casual and friendly.`;
    case 'gu-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Gujarati - conversational.`;
    case 'kn-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Kannada - everyday style.`;
    case 'ml-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Malayalam - conversational.`;
    case 'pa-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Punjabi - friendly.`;
    case 'or-IN':
      return `${voiceGuidelines}
LANGUAGE: Modern Odia - simple and conversational.`;
    default:
      return `${voiceGuidelines}
LANGUAGE: Simple, clear Indian English.
Example: "Okay so basically, here's the thing about your case..."`;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      sessionId, 
      detectedLanguage, 
      documentContent, 
      action, 
      conversationHistory, 
      stream 
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hasDocument = documentContent && documentContent.length > 0;
    const languageInstructions = getLanguageInstructions(detectedLanguage);
    const bnsRef = getBNSContext();

    // Handle document summarization
    if (action === 'summarize' && hasDocument) {
      const summaryPrompt = `You are CARE, a friendly legal assistant. Summarize briefly.

${languageInstructions}

DOC: ${documentContent.slice(0, 3000)}

Give 2-3 sentences: what it is, key terms, one warning.`;

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

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content;
      
      return new Response(
        JSON.stringify({ 
          response: summary,
          voiceResponse: summary,
          sessionId: sessionId,
          language: detectedLanguage,
          action: 'summary'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt
    let systemPrompt = hasDocument
      ? `You are CARE, a friendly Indian legal AI assistant. ${bnsRef}
${languageInstructions}
DOCUMENT CONTEXT: ${documentContent.slice(0, 3000)}`
      : `You are CARE, a friendly Indian legal AI assistant. ${bnsRef}
${languageInstructions}
Provide DETAILED legal guidance with context, relevant laws, and practical advice.`;

    // Build messages array
    const messages: ConversationMessage[] = [
      { role: "system", content: systemPrompt }
    ];

    if (conversationHistory?.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ 
          role: msg.role === 'assistant' ? 'assistant' : 'user', 
          content: msg.content 
        });
      }
    }

    messages.push({ role: "user", content: message });

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

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        voiceResponse: aiResponse,
        sessionId: sessionId,
        language: detectedLanguage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Legal chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 3. BNS Knowledge Base

### 3.1 Implementation

```typescript
// supabase/functions/legal-chat/bns-knowledge.ts

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

### 3.2 BNS 2023 Quick Reference

| Crime | IPC Section | BNS Section |
|-------|-------------|-------------|
| Murder | 302 | 103 |
| Attempt to Murder | 307 | 109 |
| Culpable Homicide | 304 | 105 |
| Rape | 376 | 64-66 |
| Kidnapping | 363 | 137 |
| Theft | 379 | 303 |
| Robbery | 392 | 309 |
| Dacoity | 395 | 310 |
| Cheating | 420 | 318 |
| Forgery | 463 | 335 |
| Criminal Intimidation | 506 | 351 |
| Dowry Death | 304B | 80 |
| Cruelty by Husband | 498A | 85 |

### 3.3 New BNS Sections

| Section | Description |
|---------|-------------|
| 111 | Organised Crime |
| 113 | Terrorist Act |
| 304 | Snatching |
| Community Service | New punishment type |

---

## 4. AI Model Configuration

### 4.1 Primary Model

```javascript
// google/gemini-2.5-flash
{
  model: "google/gemini-2.5-flash",
  max_tokens: 500,
  temperature: 0.3,  // Low for legal accuracy
  stream: true       // For real-time responses
}
```

### 4.2 Document Summarization Model

```javascript
// google/gemini-2.5-flash-lite (faster, cheaper)
{
  model: "google/gemini-2.5-flash-lite",
  max_tokens: 150,
  temperature: 0.2   // Very low for factual summaries
}
```

---

## 5. Streaming Response Handling

### 5.1 Client-Side Processing

```typescript
// useLegalChat.ts - Streaming handler
const processStream = async (response: Response) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          
          // Update UI in real-time
          setMessages(prev => prev.map(m => 
            m.id === assistantId 
              ? { ...m, content: fullResponse }
              : m
          ));
        }
      } catch {
        // Incomplete JSON, continue
      }
    }
  }
  
  return fullResponse;
};
```

### 5.2 SSE Event Format

```
data: {"choices":[{"delta":{"content":"So "}}]}

data: {"choices":[{"delta":{"content":"basically"}}]}

data: {"choices":[{"delta":{"content":", "}}]}

data: {"choices":[{"delta":{"content":"here's"}}]}

data: [DONE]
```

---

## 6. Prompt Engineering

### 6.1 System Prompt Structure

```
[Identity]
You are CARE, a friendly Indian legal AI assistant.

[Knowledge Base]
BNS 2023 Quick Reference...

[Voice Guidelines]
- Modern, Gen-Z friendly language
- No markdown formatting
- Natural speech patterns
- 4-6 sentences for legal questions

[Language-Specific Instructions]
Language: [Based on detectedLanguage]

[Optional: Document Context]
DOCUMENT CONTEXT: [Document content]
```

### 6.2 Key Principles

1. **Accuracy** - Low temperature (0.3) for legal precision
2. **Accessibility** - Modern, friendly language
3. **Completeness** - 4-6 sentence responses with context
4. **Voice-Ready** - No markdown, natural speech
5. **Platform Integration** - Lawyer referrals to /lawyers

---

## 7. Language Support

### 7.1 Supported Languages

| Code | Language | Style |
|------|----------|-------|
| en-IN | English (India) | Simple, clear |
| hi-IN | Hindi | Modern, casual |
| hinglish | Hinglish | Code-switching |
| ta-IN | Tamil | Conversational |
| te-IN | Telugu | Conversational |
| bn-IN | Bengali | Cholti bhasha |
| mr-IN | Marathi | Casual, friendly |
| gu-IN | Gujarati | Conversational |
| kn-IN | Kannada | Everyday style |
| ml-IN | Malayalam | Conversational |
| pa-IN | Punjabi | Friendly |
| or-IN | Odia | Simple |

### 7.2 Language Detection

```typescript
// Detected from voice input or user preference
const detectedLanguage = currentLanguage.code; // e.g., 'hi-IN'

// Passed to edge function
sendMessage(message, detectedLanguage);
```

---

*This AI integration documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
