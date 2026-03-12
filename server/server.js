import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI, toFile } from 'openai';
import multer from 'multer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase limit for audio files
app.use(express.json({ limit: '50mb' }));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper for language instructions
const getLanguageInstructions = (lang) => {
  const langMap = {
    'hi-IN': 'Reply ONLY in Hindi (Devanagari script). Mix English words naturally.',
    'hinglish': 'Reply in Hinglish - mix Hindi and English naturally.',
    'ta-IN': 'Reply ONLY in Tamil (தமிழ்).',
    'te-IN': 'Reply ONLY in Telugu (తెలుగు).',
    'bn-IN': 'Reply ONLY in Bengali (বাংলা).',
    'mr-IN': 'Reply ONLY in Marathi (मराठी).',
    'gu-IN': 'Reply ONLY in Gujarati (ગુજરાતી).',
    'kn-IN': 'Reply ONLY in Kannada (ಕನ್ನಡ).',
    'ml-IN': 'Reply ONLY in Malayalam (മലയാളം).',
    'pa-IN': 'Reply ONLY in Punjabi (ਪੰਜਾਬੀ).',
    'or-IN': 'Reply ONLY in Odia (ଓଡ଼ିଆ).',
    'es-ES': 'Reply ONLY in Spanish (Español).',
    'fr-FR': 'Reply ONLY in French (Français).',
    'de-DE': 'Reply ONLY in German (Deutsch).',
    'it-IT': 'Reply ONLY in Italian (Italiano).',
    'pt-PT': 'Reply ONLY in Portuguese (Português).',
    'ru-RU': 'Reply ONLY in Russian (Русский).',
    'ja-JP': 'Reply ONLY in Japanese (日本語).',
    'ko-KR': 'Reply ONLY in Korean (한국어).',
    'zh-CN': 'Reply ONLY in Chinese (Simplified) (简体中文).',
    'ar-SA': 'Reply ONLY in Arabic (العربية).',
  };
  return langMap[lang] || 'Reply in simple, clear Indian English.';
};

// 1. Chat Endpoint (GPT-4o Mini)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, detectedLanguage, documentContent, conversationHistory, stream } = req.body;

    const languageInstructions = getLanguageInstructions(detectedLanguage);
    const systemPrompt = `You are CARE, an Indian legal AI. 
${languageInstructions}
TONE: Friendly, casual, like a smart friend. No markdown. 3-5 sentences.
${documentContent ? `\nDOC CONTEXT: ${documentContent.slice(0, 2000)}` : ''}`;

    const messages = [{ role: "system", content: systemPrompt }];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }
    messages.push({ role: "user", content: message });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Updated to GPT-4o Mini as requested
        messages,
        max_tokens: 600,
        temperature: 0.4,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Updated to GPT-4o Mini
        messages,
        max_tokens: 600,
        temperature: 0.4,
      });

      res.json({
        response: completion.choices[0].message.content,
        language: detectedLanguage
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Speech-to-Text Endpoint (Whisper-1)
// Note: We're not using "gpt-4o-transcribe" because the correct model name is "whisper-1"
app.post('/api/voice', async (req, res) => {
  try {
    const { audio, mimeType } = req.body; 

    if (!audio) {
      return res.status(400).json({ error: "No audio data" });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(audio, 'base64');
    
    // Create a file object for OpenAI
    // Map MIME types to extensions that Whisper accepts
    let extension = 'webm';
    if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) extension = 'm4a';
    if (mimeType?.includes('wav')) extension = 'wav';
    if (mimeType?.includes('mp3') || mimeType?.includes('mpeg')) extension = 'mp3';
    
    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1", // The standard STT model
      response_format: "verbose_json",
    });

    res.json({ 
      text: transcription.text, 
      detectedLanguage: transcription.language, // Whisper detects language automatically
      ok: true
    });

  } catch (error) {
    console.error('Voice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Text-to-Speech Endpoint (TTS-1)
// Note: We're not using "gpt-4o-mini-tts" because the correct model name is "tts-1"
app.post('/api/speak', async (req, res) => {
  try {
    const { text, voice = 'alloy' } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // The standard TTS model (fast)
      voice: voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    res.json({ audioContent: base64Audio });

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Workflow Endpoint (Chained: Audio -> STT -> Chat -> TTS)
app.post('/api/workflow', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio) return res.status(400).json({ error: "No audio data" });

    // Step 1: STT
    const buffer = Buffer.from(audio, 'base64');
    const extension = mimeType?.includes('mp4') ? 'm4a' : 'webm';
    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });
    
    const userText = transcription.text;
    
    // Step 2: Chat (GPT-4o Mini)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant. Keep answers concise." },
        { role: "user", content: userText }
      ],
      max_tokens: 150,
    });

    const aiText = completion.choices[0].message.content;

    // Step 3: TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: aiText,
    });
    
    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    
    res.json({
      userText,
      aiText,
      audioResponse: audioBuffer.toString('base64')
    });

  } catch (error) {
    console.error('Workflow error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
