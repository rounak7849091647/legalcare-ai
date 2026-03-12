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

// Compact language instructions - critical for speed
const getLanguageInstructions = (lang: string): string => {
  const langMap: Record<string, string> = {
    'hi-IN': 'Reply ONLY in Hindi (Devanagari script). Mix English words naturally like young Indians do.',
    'hinglish': 'Reply in Hinglish - mix Hindi and English naturally. Use Devanagari for Hindi parts.',
    'ta-IN': 'Reply ONLY in Tamil (தமிழ்). Use Tamil script throughout.',
    'te-IN': 'Reply ONLY in Telugu (తెలుగు). Use Telugu script throughout.',
    'bn-IN': 'Reply ONLY in Bengali (বাংলা). Use Bengali script throughout.',
    'mr-IN': 'Reply ONLY in Marathi (मराठी). Use Devanagari script throughout.',
    'gu-IN': 'Reply ONLY in Gujarati (ગુજરાતી). Use Gujarati script throughout.',
    'kn-IN': 'Reply ONLY in Kannada (ಕನ್ನಡ). Use Kannada script throughout.',
    'ml-IN': 'Reply ONLY in Malayalam (മലയാളം). Use Malayalam script throughout.',
    'pa-IN': 'Reply ONLY in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script throughout.',
    'or-IN': 'Reply ONLY in Odia (ଓଡ଼ିଆ). Use Odia script throughout.',
  };

  const langInstruction = langMap[lang] || 'Reply in simple, clear Indian English.';

  return `LANGUAGE RULE (ABSOLUTELY CRITICAL): ${langInstruction}
You MUST match the user's language. If they write in Hindi, respond in Hindi. If Tamil, respond in Tamil. NEVER switch to English unless the user writes in English.
TONE: Friendly, casual, like a smart friend. No markdown (no **, ##, bullets). 3-5 spoken sentences. Refer lawyers to our /lawyers page.`;
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

    // Build system prompt - compact for speed
    const systemPrompt = `You are CARE, an Indian legal AI. ${bnsRef}
${languageInstructions}${hasDocument ? `\nDOC CONTEXT: ${documentContent.slice(0, 2000)}` : ''}`;

    // Build messages
    const messages: ConversationMessage[] = [{ role: "system", content: systemPrompt }];

    if (hasHistory) {
      for (const msg of conversationHistory.slice(-6)) {
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
          model: "google/gemini-2.5-flash-lite",
          messages,
          max_tokens: 600,
          temperature: 0.4,
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
          model: "google/gemini-2.5-flash-lite",
          messages,
          max_tokens: 600,
          temperature: 0.4,
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
