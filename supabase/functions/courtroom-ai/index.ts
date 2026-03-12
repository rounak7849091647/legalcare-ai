import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourtroomRequest {
  action: 'analyze' | 'simulate_phase' | 'judgment' | 'user_argument';
  documentContent?: string;
  caseAnalysis?: any;
  phase?: string;
  previousArguments?: any[];
  userRole?: 'accused' | 'complainant';
  userMessage?: string;
  language?: string;
}

const getLanguageInstruction = (lang: string): string => {
  const langMap: Record<string, string> = {
    'hi-IN': 'Respond entirely in Hindi (Devanagari script). Use formal legal Hindi terminology.',
    'bn-IN': 'Respond entirely in Bengali (বাংলা script). Use formal legal Bengali terminology.',
    'ta-IN': 'Respond entirely in Tamil (தமிழ் script). Use formal legal Tamil terminology.',
    'te-IN': 'Respond entirely in Telugu (తెలుగు script). Use formal legal Telugu terminology.',
    'mr-IN': 'Respond entirely in Marathi (मराठी script). Use formal legal Marathi terminology.',
    'gu-IN': 'Respond entirely in Gujarati (ગુજરાતી script). Use formal legal Gujarati terminology.',
    'kn-IN': 'Respond entirely in Kannada (ಕನ್ನಡ script). Use formal legal Kannada terminology.',
    'ml-IN': 'Respond entirely in Malayalam (മലയാളം script). Use formal legal Malayalam terminology.',
    'pa-IN': 'Respond entirely in Punjabi (ਪੰਜਾਬੀ script). Use formal legal Punjabi terminology.',
    'or-IN': 'Respond entirely in Odia (ଓଡ଼ିଆ script). Use formal legal Odia terminology.',
    'as-IN': 'Respond entirely in Assamese (অসমীয়া script). Use formal legal Assamese terminology.',
    'ur-IN': 'Respond entirely in Urdu (اردو script). Use formal legal Urdu terminology.',
    'hi-EN': 'Respond in Hinglish (Hindi words written in English/Roman script mixed with English). Keep legal terms in English but converse casually in Hinglish.',
  };
  return langMap[lang] || 'Respond in English. Use clear legal English terminology.';
};

const callAI = async (apiKey: string, messages: any[], maxTokens = 1500) => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return { error: "Rate limit exceeded. Please wait a moment.", status: 429 };
    if (response.status === 402) return { error: "Payment required. Please add credits.", status: 402 };
    const text = await response.text();
    console.error("AI error:", response.status, text);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || "" };
};

const errorResponse = (result: any) => new Response(
  JSON.stringify({ error: result.error }),
  { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);

const jsonResponse = (data: any) => new Response(
  JSON.stringify(data),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CourtroomRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = getLanguageInstruction(body.language || 'en-IN');

    // ACTION: ANALYZE CASE
    if (body.action === 'analyze') {
      const docContent = (body.documentContent || '').slice(0, 15000);

      const result = await callAI(LOVABLE_API_KEY, [
        {
          role: "system",
          content: `You are an expert Indian legal case analyzer. Analyze the provided legal documents and extract structured information. You must respond in valid JSON format only, no markdown. ${langInstruction} — but keep JSON keys in English, only values should be in the selected language.`
        },
        {
          role: "user",
          content: `Analyze these legal documents and return a JSON object with these exact keys:
{
  "caseType": "string - type of case",
  "caseTitle": "string - brief title for the case",
  "parties": { "complainant": "string", "accused": "string" },
  "keyIssues": ["array of key legal issues"],
  "evidenceSummary": ["array of key evidence points"],
  "claims": ["array of claims by complainant"],
  "counterClaims": ["array of potential counterclaims"],
  "applicableLaws": ["array of relevant laws/sections"],
  "caseSummary": "string - 3-4 sentence summary of the case"
}

Documents:
${docContent}`
        }
      ], 2000);

      if (result.error) return errorResponse(result);

      let parsed;
      try {
        const jsonStr = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { caseSummary: result.content, caseType: "General", caseTitle: "Case Analysis", parties: { complainant: "Party A", accused: "Party B" }, keyIssues: [], evidenceSummary: [], claims: [], counterClaims: [], applicableLaws: [] };
      }

      return jsonResponse({ analysis: parsed });
    }

    // ACTION: SIMULATE PHASE
    if (body.action === 'simulate_phase') {
      const { caseAnalysis, phase, previousArguments, userRole } = body;
      const analysis = JSON.stringify(caseAnalysis);
      const prevArgs = previousArguments?.map(a => `[${a.speaker}]: ${a.content}`).join('\n') || 'None yet.';

      // Determine the opponent role based on user's role
      const opponentRole = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';

      const phasePrompts: Record<string, { speaker: string; prompt: string }> = {
        case_introduction: { speaker: 'Judge', prompt: 'You are an AI Judge in an Indian courtroom. Introduce the case formally. State the case type, parties involved, and the charges/claims. Be authoritative but neutral. 4-6 sentences.' },
        opening_prosecution: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI) in an Indian courtroom. The user is representing the other side as their own lawyer. Deliver your opening statement. Present key claims or defense strategy, outline evidence. Be persuasive but factual. 5-7 sentences.` },
        opening_defense: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI) in an Indian courtroom. The user is representing the other side as their own lawyer. Deliver your opening statement. Challenge the other side's claims or outline your defense strategy. Be assertive and logical. 5-7 sentences.` },
        evidence_presentation: { speaker: 'Judge', prompt: 'You are the AI Judge. Review and present key evidence from both sides. Summarize what each piece suggests, note gaps or inconsistencies. 6-8 sentences.' },
        prosecution_argument: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Present main legal arguments. Cite relevant Indian laws. Connect evidence to your claims. Be thorough and persuasive. 6-8 sentences.` },
        defense_argument: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Present counter-arguments. Challenge the other side's reasoning. Cite defense-favorable laws. Be thorough and persuasive. 6-8 sentences.` },
        judge_questions: { speaker: 'Judge', prompt: 'You are the AI Judge. Ask 3-4 critical questions addressed to BOTH sides (the user who is their own lawyer, and the AI opponent lawyer). These should address key uncertainties in the case. Format as numbered questions specifying who they are directed to.' },
        opponent_answer_judge: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). The Judge asked questions to both sides. Answer the questions directed to your side thoroughly, citing law and evidence. 4-6 sentences.` },
        closing_prosecution: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Deliver closing statement. Summarize strongest points, remind court of key evidence, and explain why your side should prevail. 5-7 sentences.` },
        closing_defense: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Deliver closing statement. Summarize why your side should prevail. Be convincing. 5-7 sentences.` },
      };

      const config = phasePrompts[phase || ''] || { speaker: 'Judge', prompt: 'Provide a brief court proceeding update.' };

      const result = await callAI(LOVABLE_API_KEY, [
        {
          role: "system",
          content: `${config.prompt}

${langInstruction}

Case Analysis: ${analysis}

Previous proceedings:
${prevArgs}

IMPORTANT: Do NOT use any markdown formatting (no **, ##, bullets). Write in plain conversational court language. Stay strictly within Indian legal framework. Do not fabricate laws or sections. Remember: the user is acting as their own lawyer — there is no separate AI lawyer for the user's side.`
        },
        {
          role: "user",
          content: `Proceed with the ${(phase || '').replace(/_/g, ' ')} phase of this courtroom hearing.`
        }
      ], 800);

      if (result.error) return errorResponse(result);

      return jsonResponse({ speaker: config.speaker, phase, content: result.content });
    }

    // ACTION: USER ARGUMENT — AI responds to user's own argument (extra rounds)
    if (body.action === 'user_argument') {
      const { caseAnalysis, previousArguments, userRole, userMessage } = body;
      const analysis = JSON.stringify(caseAnalysis);
      const prevArgs = previousArguments?.map(a => `[${a.speaker}]: ${a.content}`).join('\n') || '';
      const opponentRole = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';

      // Judge acknowledges user's argument
      const judgeResult = await callAI(LOVABLE_API_KEY, [
        {
          role: "system",
          content: `You are the AI Judge in an Indian courtroom. The ${userRole === 'complainant' ? 'complainant' : 'accused'} (who is acting as their own lawyer) has just presented an additional argument. Acknowledge their argument, evaluate its legal merit briefly, and direct the opposing counsel to respond. Be neutral and formal. 3-5 sentences.

${langInstruction}

Case Analysis: ${analysis}

Previous proceedings:
${prevArgs}

User's argument: ${userMessage}

IMPORTANT: Do NOT use any markdown. Plain conversational court language only.`
        },
        {
          role: "user",
          content: "Respond to the user's argument as the judge."
        }
      ], 600);

      if (judgeResult.error) return errorResponse(judgeResult);

      // Opposing counsel rebuts
      const rebuttalResult = await callAI(LOVABLE_API_KEY, [
        {
          role: "system",
          content: `You are the ${opponentRole} in an Indian courtroom. The opposing party (who is acting as their own lawyer) just argued: "${userMessage}". The judge acknowledged it. Now deliver a strong, evidence-based rebuttal. Challenge their points using law and facts. 4-6 sentences.

${langInstruction}

Case Analysis: ${analysis}

Previous proceedings:
${prevArgs}

Judge's response: ${judgeResult.content}

IMPORTANT: Do NOT use any markdown. Plain conversational court language only.`
        },
        {
          role: "user",
          content: "Deliver your rebuttal to the user's argument."
        }
      ], 600);

      if (rebuttalResult.error) return errorResponse(rebuttalResult);

      return jsonResponse({
        responses: [
          { speaker: 'Judge', content: judgeResult.content, phase: 'Judge Response' },
          { speaker: opponentRole, content: rebuttalResult.content, phase: 'Rebuttal' },
        ]
      });
    }

    // ACTION: JUDGMENT
    if (body.action === 'judgment') {
      const { caseAnalysis, previousArguments } = body;
      const analysis = JSON.stringify(caseAnalysis);
      const allArgs = previousArguments?.map(a => `[${a.speaker}]: ${a.content}`).join('\n\n') || '';

      const result = await callAI(LOVABLE_API_KEY, [
        {
          role: "system",
          content: `You are an AI Judge delivering a final judgment in an Indian courtroom simulation. The user acted as their own lawyer. You must be completely neutral and base your judgment strictly on law, evidence, and logical reasoning.

${langInstruction}

Structure your judgment as follows (use plain text, no markdown):

CASE SUMMARY:
[2-3 sentences summarizing the case]

LEGAL ANALYSIS:
[Analysis of the legal issues and applicable laws]

EVALUATION OF ARGUMENTS:
[Assessment of arguments presented by the user (acting as own lawyer) and the AI opponent lawyer]

EVALUATION OF EVIDENCE:
[Assessment of evidence presented by both sides]

APPLICATION OF LAW:
[How the relevant laws apply to the facts]

REASONING:
[Your logical reasoning for the decision]

FINAL DECISION:
[Clear statement of the judgment]

SUGGESTED NEXT STEPS:
[2-3 practical steps for the parties]

Case Analysis: ${analysis}

Full proceedings:
${allArgs}

IMPORTANT: Be fair, neutral, and thorough. Do not fabricate legal sections. Evaluate the user's arguments on the same standard as the AI lawyer's arguments.`
        },
        {
          role: "user",
          content: "Deliver the final judgment for this case."
        }
      ], 2500);

      if (result.error) return errorResponse(result);

      return jsonResponse({ judgment: result.content });
    }

    return jsonResponse({ error: "Invalid action" });

  } catch (error) {
    console.error("Courtroom AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
