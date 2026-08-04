import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI, toFile } from 'openai';
import nodemailer from 'nodemailer';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// ── AWS SDK ──────────────────────────────────────────────────────────────────
import {
  CognitoIdentityProviderClient,
  AdminConfirmSignUpCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, PutCommand, GetCommand,
  QueryCommand, UpdateCommand, DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const dnsResolve = dns.promises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Global crash guards — prevent the process from dying on unhandled errors.
// Without these, a single bad API response kills the server until manual restart.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Server kept alive:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Server kept alive:', reason);
});

const app = express();
const port = process.env.PORT || 8080;

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
// Handle pre-flight OPTIONS for all routes
app.options('*', cors());

// Increase limit for audio files
app.use(express.json({ limit: '50mb' }));

// Initialize Grok (xAI) — OpenAI-compatible API
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// xAI doesn't expose STT yet, so Whisper (OpenAI) handles speech-to-text only.
// All TTS goes through Google. Chat & courtroom remain 100% on Grok.
const whisperClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const GROK_MODEL = process.env.GROK_MODEL || 'grok-4-fast-non-reasoning';
const GROK_STT_MODEL = process.env.GROK_STT_MODEL || 'whisper-1';

// Hinglish is EXPLICITLY excluded — it must use the Hindi TTS voice, not the English one.
const isEnglish = (lang) => !lang || (lang !== 'hinglish' && /^en(-|$)/i.test(lang));

// English routes through Google's British English Neural2 voice (en-GB-Neural2-C).
// Neural2 is Google's second-highest quality tier — natural, warm, professional female British accent.
// Chirp3-HD is not yet available for en-GB, so Neural2-C is the top available tier.
const ENGLISH_GOOGLE_VOICE = { languageCode: 'en-GB', name: 'en-GB-Neural2-C', ssmlGender: 'FEMALE' };

// Google Cloud Text-to-Speech — covers every major Indian language with native voices.
// OpenAI TTS speaks Indian scripts but with a heavy English accent; Google has dedicated
// language-specific voices that sound natural.
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// Map of supported BCP-47 codes → highest-quality Google voice currently available.
// Quality tiers (best → worst): Chirp3-HD > Studio > Neural2 > Wavenet > Standard.
// Chirp3-HD voices ("Aoede" — warm female) are Google's MOST FLUENT generation and
// are now available in en-IN, hi-IN, bn-IN, ta-IN, te-IN, kn-IN, ml-IN, gu-IN, mr-IN.
// Wavenet is the fallback for less-supported languages (Punjabi, Urdu) and Standard
// for Odia (Google hasn't shipped higher tiers there yet).
const GOOGLE_VOICE_MAP = {
  'en-IN': { languageCode: 'en-IN', name: 'en-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Indian English, Chirp3-HD (most fluent)
  'hi-IN': { languageCode: 'hi-IN', name: 'hi-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Hindi Chirp3-HD
  'hinglish': { languageCode: 'hi-IN', name: 'hi-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Hinglish → Hindi voice (authentic Indian accent)
  'bn-IN': { languageCode: 'bn-IN', name: 'bn-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Bengali Chirp3-HD
  'ta-IN': { languageCode: 'ta-IN', name: 'ta-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Tamil Chirp3-HD
  'te-IN': { languageCode: 'te-IN', name: 'te-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Telugu Chirp3-HD
  'kn-IN': { languageCode: 'kn-IN', name: 'kn-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Kannada Chirp3-HD
  'ml-IN': { languageCode: 'ml-IN', name: 'ml-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Malayalam Chirp3-HD
  'gu-IN': { languageCode: 'gu-IN', name: 'gu-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Gujarati Chirp3-HD
  'mr-IN': { languageCode: 'mr-IN', name: 'mr-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Marathi Chirp3-HD
  'pa-IN': { languageCode: 'pa-IN', name: 'pa-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Punjabi Chirp3-HD
  'ur-IN': { languageCode: 'ur-IN', name: 'ur-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Urdu Chirp3-HD
  // Google TTS has NO Odia or Assamese voice. Bengali is the closest relative and
  // renders both scripts intelligibly (verified: returns valid audio), so we route
  // them to the Bengali Chirp3-HD voice instead of erroring (or-IN-Standard-A does
  // not exist → 500) or mispronouncing with the English fallback voice.
  'or-IN': { languageCode: 'bn-IN', name: 'bn-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Odia → Bengali voice (no native Odia voice)
  'as-IN': { languageCode: 'bn-IN', name: 'bn-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' }, // Assamese → Bengali voice (near-identical script)
};

// Detect whether a voice supports SSML. Chirp3-HD voices DO NOT support SSML —
// they only accept plain text. Studio/Neural2/Wavenet/Standard all support SSML.
const isChirp3Voice = (voice) => /Chirp3/i.test(voice?.name || '');

// Per-language tuning. Chirp3-HD voices are already very natural at rate 1.0 and don't
// need pitch adjustment. Wavenet is a touch breezier so we slow it slightly + warm it.
const VOICE_TUNING = {
  'en-GB': { speakingRate: 1.0,  pitch: 0.0 },  // Neural2-C — British English, natural pace
  'en-US': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD — natural pace, no pitch shift needed
  'en-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'hi-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'bn-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'ta-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'te-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'kn-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'ml-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'gu-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'mr-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'pa-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'ur-IN': { speakingRate: 1.0,  pitch: 0.0 },  // Chirp3-HD
  'or-IN': { speakingRate: 0.93, pitch: 1.0 },  // Standard
};
const DEFAULT_TUNING = { speakingRate: 1.0, pitch: 0.0 };

// ── Courtroom character voices ────────────────────────────────────────────────
// Judge: 60+ yr old Indian male — deep, measured, authoritative.
//   en-IN-Wavenet-B is the deepest male Indian-English voice Google provides.
//   Wavenet supports SSML so we can push pitch down and slow the rate for gravitas.
// Opponent: 25 yr old Indian female lawyer — fluent, confident, natural pace.
//   Chirp3-HD Aoede is Google's highest-quality Indian-English female voice.
const COURTROOM_VOICE_CONFIG = {
  judge: {
    voice:  { languageCode: 'en-IN', name: 'en-IN-Wavenet-B', ssmlGender: 'MALE' },
    tuning: { speakingRate: 0.80, pitch: -5.0 }, // slow + very deep = elderly senior judge
  },
  opponent: {
    voice:  { languageCode: 'en-IN', name: 'en-IN-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' },
    tuning: { speakingRate: 1.10, pitch: 0.0 }, // slightly faster = sharp young lawyer (Chirp3 ignores pitch)
  },
};

// Role discipline for the AI Judge. Without this the model often makes the judge
// address ITSELF as "Your Honour" — that phrase belongs to lawyers/parties speaking
// TO the judge, never to the judge speaking. Injected into every judge prompt.
const JUDGE_SPEECH_RULES = `JUDGE SPEECH RULES (strict):
- You ARE the judge. NEVER refer to yourself as "Your Honour", "Your Lordship", or "My Lord" — those are how lawyers address you, not how you speak.
- Speak with the authority of the bench. Use phrases such as: "Counsel, proceed.", "The court will consider the evidence.", "Objection sustained.", "Objection overruled.", "Please continue your argument.", "This court finds...", "The bench notes...".
- Address the lawyers as "Counsel", "the Prosecution", or "the Defense" — never as "Your Honour".`;

const synthWithGoogle = async (input, language, voiceOverride, tuningOverride) => {
  const voice = voiceOverride || GOOGLE_VOICE_MAP[language] || GOOGLE_VOICE_MAP['en-IN'];
  const tuning = tuningOverride || VOICE_TUNING[voice.languageCode] || DEFAULT_TUNING;
  const chirp3 = isChirp3Voice(voice);

  // Chirp3-HD voices DO NOT accept SSML — they only accept { text }. If caller passed
  // an SSML payload but we're using a Chirp3 voice, downgrade to plain text by stripping tags.
  let inputPayload;
  if (typeof input === 'string') {
    inputPayload = { text: input };
  } else if (input?.ssml && chirp3) {
    // Strip SSML tags → plain text fallback for Chirp3
    const plain = input.ssml.replace(/<[^>]+>/g, '').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    inputPayload = { text: plain };
  } else {
    inputPayload = input;
  }

  // Chirp3-HD ignores pitch + effectsProfileId + custom sampleRate; sending them returns 400.
  // For Chirp3 we send only audioEncoding + speakingRate. For other tiers we keep the EQ + boost.
  const audioConfig = chirp3
    ? {
        audioEncoding: 'MP3',
        speakingRate: tuning.speakingRate,
      }
    : {
        audioEncoding: 'MP3',
        speakingRate: tuning.speakingRate,
        pitch: tuning.pitch,
        sampleRateHertz: 24000,                       // 24kHz MP3 — Google's max for Neural2/Wavenet
        volumeGainDb: 1.5,                            // mild loudness boost so it sits well over background
        effectsProfileId: ['headphone-class-device'], // tuned EQ — clearer on phones, laptops, earbuds
      };

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: inputPayload, voice, audioConfig }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google TTS ${resp.status}: ${errText}`);
  }
  const json = await resp.json();
  return json.audioContent; // already base64 MP3
};

// Shared helper: strip any markdown the model might emit so output is always clean prose.
const stripMarkdown = (txt) => {
  if (!txt) return '';
  return txt
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// ──────────────────────────────────────────────────────────────────────────────
// Number → English-words conversion.
// When a Telugu / Hindi / Tamil / etc. response contains digits like "154",
// the native-language TTS reads them with native digit names (e.g. Telugu reads
// "నూట యాభై నాలుగు"). Indian users overwhelmingly prefer English number reading
// in mixed legal contexts ("section one hundred fifty four"). So for ANY non-English
// TTS output we replace digit sequences with their English word form *before* synth.
const ONES_WORDS = ['', 'one','two','three','four','five','six','seven','eight','nine',
                    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS_WORDS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

const numUnder1000ToWords = (n) => {
  if (n === 0) return '';
  if (n < 20) return ONES_WORDS[n];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return o ? `${TENS_WORDS[t]} ${ONES_WORDS[o]}` : TENS_WORDS[t];
  }
  const h = Math.floor(n / 100), rest = n % 100;
  return rest ? `${ONES_WORDS[h]} hundred ${numUnder1000ToWords(rest)}` : `${ONES_WORDS[h]} hundred`;
};

// Convert an integer string to English words. Uses western scale (thousand/million/billion).
// "154" → "one hundred fifty four"; "2024" → "two thousand twenty four"; "50000" → "fifty thousand"
const integerToEnglishWords = (numStr) => {
  const cleaned = numStr.replace(/,/g, '');
  if (!/^\d+$/.test(cleaned)) return numStr;
  let n = parseInt(cleaned, 10);
  if (!Number.isFinite(n)) return numStr;
  if (n === 0) return 'zero';
  // For absurdly large numbers, just spell each digit.
  if (n > 999999999999) {
    return cleaned.split('').map(d => ONES_WORDS[parseInt(d, 10)] || 'zero').join(' ');
  }
  const parts = [];
  const billions = Math.floor(n / 1000000000); n %= 1000000000;
  const millions = Math.floor(n / 1000000);    n %= 1000000;
  const thousands = Math.floor(n / 1000);      n %= 1000;
  if (billions) parts.push(numUnder1000ToWords(billions) + ' billion');
  if (millions) parts.push(numUnder1000ToWords(millions) + ' million');
  if (thousands) parts.push(numUnder1000ToWords(thousands) + ' thousand');
  if (n) parts.push(numUnder1000ToWords(n));
  return parts.join(' ').trim();
};

// Replace every digit sequence in text with its English word equivalent.
// Handles decimals ("12.5" → "twelve point five"), Indian-style commas ("1,00,000"),
// and digit-letter boundaries ("498A" → "four hundred ninety eight A").
//
// Regex: digits with embedded commas (each comma MUST be followed by digits) + optional decimal.
// This way "2024," matches only "2024" and the trailing comma stays in the text.
const digitsToEnglishWords = (txt) => {
  if (!txt) return txt;
  const out = txt.replace(/(\d+(?:,\d+)*)(?:\.(\d+))?/g, (match, intPart, decPart) => {
    const intWords = integerToEnglishWords(intPart) || match;
    let words;
    if (decPart) {
      const decWords = decPart.split('').map(d => ONES_WORDS[parseInt(d, 10)] || 'zero').join(' ');
      words = `${intWords} point ${decWords}`;
    } else {
      words = intWords;
    }
    // Pad with spaces so digit-glued letters/punctuation separate cleanly ("498A" → " four hundred ... A").
    return ` ${words} `;
  });
  // Collapse runs of whitespace introduced by the padding, and strip space before punctuation.
  return out.replace(/[ \t]+/g, ' ').replace(/ ([,.;:!?।])/g, '$1').trim();
};
// ──────────────────────────────────────────────────────────────────────────────

// Strip emojis + symbol pictographs so TTS doesn't verbalize them (e.g. avoid "smile face").
// Covers: faces, symbols, transport, flags, dingbats, misc symbols, supplemental.
const stripEmojis = (txt) => {
  if (!txt) return '';
  return txt
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '') // variation selector + zero-width joiner
    .replace(/\s{2,}/g, ' ') // collapse double-spaces left behind
    .trim();
};

// Words that look like acronyms but ARE pronounced as words. Don't spell these out.
const PRONOUNCED_AS_WORD = new Set([
  'NATO', 'NASA', 'AIDS', 'OPEC', 'OK', 'AICTE', 'NEET', 'CAT', 'GATE', 'JEE', 'UPSC',
  'IIT', 'IIM', 'AIIMS', 'IGNOU', 'NCERT', 'CBSE', 'ICSE',
]);

// Convert ALL-CAPS acronyms to spaced letters so TTS spells them out.
// "FIR" -> "F I R", "GST" -> "G S T". For OpenAI TTS (no SSML).
const spellAcronyms = (txt) => {
  if (!txt) return '';
  return txt.replace(/\b([A-Z]{2,5})\b/g, (match) => {
    if (PRONOUNCED_AS_WORD.has(match)) return match;
    return match.split('').join(' ');
  });
};

// Build SSML wrapping acronyms in <say-as interpret-as="characters"> for Google TTS.
// Google handles this far more naturally than splitting with spaces.
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const buildSSML = (txt) => {
  const escaped = escapeXml(txt);
  const wrapped = escaped.replace(/\b([A-Z]{2,5})\b/g, (match) => {
    if (PRONOUNCED_AS_WORD.has(match)) return match;
    return `<say-as interpret-as="characters">${match}</say-as>`;
  });
  return `<speak>${wrapped}</speak>`;
};

// Final TTS prep: strip markdown + emojis, then either build SSML (Google) or spell acronyms (OpenAI).
const prepForTTS = (txt, useSSML) => {
  const cleaned = stripEmojis(stripMarkdown(txt));
  return useSSML ? buildSSML(cleaned) : spellAcronyms(cleaned);
};

// Whisper bias prompt — multi-script primer so Whisper recognises legal terms
// across English + 9 Indian scripts and doesn't bias detection toward English.
// Whisper uses this as vocabulary hints, not as a language lock.
const WHISPER_LEGAL_PROMPT = [
  "Indian legal assistant. Multilingual: English, Hindi, Tamil, Telugu, Bengali, Kannada, Malayalam, Gujarati, Marathi, Punjabi, Urdu, Odia.",
  "Acronyms: FIR, IPC, BNS, CrPC, CPC, RTI, PIL, NRI, OCI, HUF, GST, PAN, TDS, ITR, IFSC, NEFT, RTGS, Aadhaar.",
  "Terms: advocate, plaintiff, defendant, magistrate, bail, anticipatory bail, summons, chargesheet, petition, affidavit, judgement, Supreme Court, High Court, Sessions Court, Lok Adalat, ombudsman.",
  "हिंदी: एफआईआर, धारा, अदालत, वकील, ज़मानत, याचिका, फैसला, गिरफ्तारी, समन, सुप्रीम कोर्ट.",
  "தமிழ்: காவல்துறை, புகார், நீதிமன்றம், வழக்கறிஞர், ஜாமீன்.",
  "తెలుగు: పోలీసు, న్యాయవాది, కోర్టు, బెయిల్.",
  "বাংলা: পুলিশ, আদালত, আইনজীবী, জামিন.",
  "ಕನ್ನಡ: ಪೊಲೀಸ್, ನ್ಯಾಯಾಲಯ, ವಕೀಲ, ಜಾಮೀನು.",
  "മലയാളം: പോലീസ്, കോടതി, വക്കീൽ, ജാമ്യം.",
  "ગુજરાતી: પોલીસ, અદાલત, વકીલ, જામીન.",
  "मराठी: पोलीस, न्यायालय, वकील, जामीन.",
  "ਪੰਜਾਬੀ: ਪੁਲਿਸ, ਅਦਾਲਤ, ਵਕੀਲ, ਜ਼ਮਾਨਤ.",
].join(' ');

// Map ISO-639-1 (what Whisper returns: 'hi', 'ta') → BCP-47 (what our voice map keys on: 'hi-IN', 'ta-IN').
const ISO_TO_BCP47 = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', mr: 'mr-IN', pa: 'pa-IN',
  ur: 'ur-IN', or: 'or-IN',
};
const normalizeDetectedLang = (whisperLang) => {
  if (!whisperLang) return 'en-IN';
  const iso = String(whisperLang).toLowerCase().slice(0, 2);
  return ISO_TO_BCP47[iso] || 'en-IN';
};

// Map BCP-47 / detected codes to the ISO-639-1 codes Whisper accepts (for OPTIONAL hint only —
// we now prefer letting Whisper auto-detect so the customer can speak any language).
const toWhisperLang = (lang) => {
  if (!lang) return undefined;
  const m = String(lang).toLowerCase().match(/^([a-z]{2})/);
  return m ? m[1] : undefined;
};

// Split text into sentence-aligned chunks where each chunk's SSML form fits Google's ~5000 byte limit.
// Returns array of strings, each safe to wrap in <speak>...</speak>.
const SSML_CHUNK_BUDGET = 4500;
const chunkForTTS = (text) => {
  const cleaned = stripEmojis(stripMarkdown(text));
  if (!cleaned) return [];
  // Estimate SSML overhead per acronym wrapping; target ~3500 chars of plain text per chunk.
  const TARGET = 3200;
  // Split on sentence boundaries: . ! ? । (Devanagari purna viram), keeping the delimiter.
  const sentences = cleaned.split(/(?<=[.!?।]|[\u0964\u0965])\s+/);
  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    if (!s) continue;
    // If a single sentence is itself too long, hard-split on commas / spaces.
    if (s.length > TARGET) {
      if (buf) { chunks.push(buf); buf = ''; }
      let remaining = s;
      while (remaining.length > TARGET) {
        let cut = remaining.lastIndexOf(',', TARGET);
        if (cut < TARGET * 0.5) cut = remaining.lastIndexOf(' ', TARGET);
        if (cut < 1) cut = TARGET;
        chunks.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
      }
      if (remaining) buf = remaining;
      continue;
    }
    if ((buf + ' ' + s).length > TARGET) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + ' ' + s : s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
};

// Synthesize FULL text by chunking + Google TTS per chunk + concatenating MP3 buffers.
// MP3 frames concatenate cleanly, so the result plays as one continuous audio stream.
//
// Branches on voice tier:
//   - Chirp3-HD voices: send PLAIN TEXT with acronyms spelled out via spaces (no SSML support).
//   - Studio/Neural2/Wavenet/Standard: send SSML with <say-as interpret-as="characters"> wrapping
//     for natural acronym pronunciation.
//
// Number handling: native Chirp3-HD voices read digits correctly IN THEIR OWN
// language (Telugu reads "138" as Telugu, Tamil as Tamil, etc.). The previous
// approach converted digits to English WORDS ("one hundred thirty eight"), which
// forced the native voice to speak English mid-sentence — that was the source of
// the "mispronounced words" in Telugu/Tamil/Odia/Assamese. We now leave digits
// as-is so every voice pronounces numbers naturally in its own language.
const synthFullWithGoogle = async (text, language, voiceOverride, tuningOverride) => {
  const textForTTS = text;
  const chunks = chunkForTTS(textForTTS);
  if (chunks.length === 0) throw new Error('Empty text after cleanup');
  const voice = voiceOverride || GOOGLE_VOICE_MAP[language] || GOOGLE_VOICE_MAP['en-IN'];
  const chirp3 = isChirp3Voice(voice);
  const buffers = [];
  for (const chunk of chunks) {
    let payload;
    if (chirp3) {
      // Chirp3 path: plain text with spaced-out acronyms (e.g. "F I R" instead of <say-as>)
      payload = spellAcronyms(chunk);
    } else {
      // SSML path
      payload = { ssml: buildSSML(chunk).slice(0, SSML_CHUNK_BUDGET) };
    }
    const b64 = await synthWithGoogle(payload, language, voiceOverride, tuningOverride);
    buffers.push(Buffer.from(b64, 'base64'));
  }
  return Buffer.concat(buffers).toString('base64');
};


// Helper for language instructions
const getLanguageInstructions = (lang) => {
  const langMap = {
    // ── English variants ────────────────────────────────────────────────────
    'en-IN': 'Reply ONLY in English. Do NOT use Hindi, Hinglish, or any other language. Use simple, clear English.',
    'en-GB': 'Reply ONLY in English. Do NOT use Hindi, Hinglish, or any other language. Use simple, clear English.',
    'en-US': 'Reply ONLY in English. Do NOT use Hindi, Hinglish, or any other language. Use simple, clear English.',
    // ── Indian languages ────────────────────────────────────────────────────
    'hi-IN':    'Reply ONLY in Hindi (Devanagari script). Do NOT mix English sentences — legal terms (FIR, IPC, GST) may stay in English.',
    'hinglish': 'Reply in Hinglish — mix Hindi and English naturally, the way urban Indians speak.',
    'ta-IN':    'Reply ONLY in Tamil (தமிழ்). Do NOT use any other language.',
    'te-IN':    'Reply ONLY in Telugu (తెలుగు). Do NOT use any other language.',
    'bn-IN':    'Reply ONLY in Bengali (বাংলা). Do NOT use any other language.',
    'mr-IN':    'Reply ONLY in Marathi (मराठी). Do NOT use any other language.',
    'gu-IN':    'Reply ONLY in Gujarati (ગુજરાતી). Do NOT use any other language.',
    'kn-IN':    'Reply ONLY in Kannada (ಕನ್ನಡ). Do NOT use any other language.',
    'ml-IN':    'Reply ONLY in Malayalam (മലയാളം). Do NOT use any other language.',
    'pa-IN':    'Reply ONLY in Punjabi (ਪੰਜਾਬੀ). Do NOT use any other language.',
    'or-IN':    'Reply ONLY in Odia (ଓଡ଼ିଆ). Do NOT use any other language.',
    'as-IN':    'Reply ONLY in Assamese (অসমীয়া). Do NOT use any other language.',
    'ur-IN':    'Reply ONLY in Urdu (اردو). Do NOT use any other language.',
    // ── International ───────────────────────────────────────────────────────
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
  const base = langMap[lang] || 'Reply ONLY in English. Do NOT use Hindi or Hinglish.';
  // Hinglish is intentionally mixed — every other language gets a strict
  // no-drift / finish-completely clause. This stops Punjabi drifting into Hindi,
  // Hindi drifting into Hinglish, and answers ending before the last sentence.
  // Anti-refusal is CRITICAL and applies to EVERY language (including Hinglish):
  // the model must never reject the user or demand they rewrite their question.
  const antiRefusal = `

NEVER REFUSE: You can READ and UNDERSTAND the user's question no matter what language or script they typed it in (Assamese, Odia, Bengali, Tamil, etc.). ALWAYS answer their actual question. Do NOT say "I can only respond in X", do NOT ask them to rewrite their question in another language, and do NOT reject the message. Just understand it and reply helpfully.`;

  // Confusable-language PURITY guards. Several Indian languages are close cousins
  // (Bengali/Assamese share a script; Hindi/Marathi share Devanagari; Punjabi and
  // Telugu often absorb Hindi words). The model tends to bleed one into the other,
  // so we name the specific language to avoid for each.
  const CONFUSABLE_PURITY = {
    'bn-IN': ' PURITY: Use standard Bengali (বাংলা) ONLY. Do NOT use Assamese words or the Assamese-only letters ৰ/ৱ — use Bengali র/ব.',
    'as-IN': ' PURITY: Use Assamese (অসমীয়া) ONLY, with Assamese word-forms and ৰ/ৱ. Do NOT slip into standard Bengali.',
    'hi-IN': ' PURITY: Use standard Hindi ONLY. Do NOT use Marathi or Urdu words.',
    'mr-IN': ' PURITY: Use Marathi ONLY (आहे, आणि, मला...). Do NOT use Hindi words (है, और, मुझे...).',
    'te-IN': ' PURITY: Use Telugu ONLY. Do NOT mix in Hindi or English words.',
    'pa-IN': ' PURITY: Use Punjabi ONLY. Do NOT mix in Hindi words.',
    'or-IN': ' PURITY: Use Odia ONLY. Do NOT mix in Hindi or Bengali words.',
    'gu-IN': ' PURITY: Use Gujarati ONLY. Do NOT mix in Hindi words.',
  };
  const purity = CONFUSABLE_PURITY[lang] || '';

  if (lang === 'hinglish') return base + antiRefusal;
  return `${base}

LANGUAGE LOCK: Write your ENTIRE answer in this one language — first word to last. Do NOT switch to Hindi, English, or any other language partway through, not even for a single phrase. Finish every sentence and complete your full thought before stopping; never end mid-sentence.${purity}${antiRefusal}`;
};

// 1. Chat Endpoint — alias to /functions/v1/legal-chat
app.post('/api/chat', (req, res) => {
  req.url = '/functions/v1/legal-chat';
  app.handle(req, res);
});

// 2. Speech-to-Text Endpoint (Whisper-1)
// Primed with Indian legal vocabulary so it transcribes acronyms like "FIR" / "IPC" correctly.
// If the client passes a language hint we use it; otherwise Whisper auto-detects.
app.post('/api/voice', async (req, res) => {
  try {
    if (!whisperClient) {
      return res.status(501).json({ error: 'Speech-to-text requires OPENAI_API_KEY to be configured on the server.' });
    }
    const { audio, mimeType, language } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "No audio data" });
    }

    const buffer = Buffer.from(audio, 'base64');

    let extension = 'webm';
    if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) extension = 'm4a';
    if (mimeType?.includes('wav')) extension = 'wav';
    if (mimeType?.includes('mp3') || mimeType?.includes('mpeg')) extension = 'mp3';

    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });

    // No language hint → Whisper auto-detects from audio. Customer can speak ANY of the
    // 10+ supported languages and Whisper will pick the right one. The legal prompt is
    // multi-script so it primes vocabulary across all of them without biasing detection.
    const transcription = await whisperClient.audio.transcriptions.create({
      file,
      model: GROK_STT_MODEL,
      response_format: "verbose_json",
      prompt: WHISPER_LEGAL_PROMPT,
    });

    res.json({
      text: transcription.text,
      detectedLanguage: normalizeDetectedLang(transcription.language),
      detectedLanguageRaw: transcription.language,
      ok: true
    });

  } catch (error) {
    console.error('Voice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Text-to-Speech Endpoint — Google TTS only.
// SSML wraps ALL-CAPS acronyms (FIR -> "F I R") and emojis are stripped before synthesis.
// FULL answer is synthesized via sentence-aware chunking + MP3 concatenation,
// so long responses are never truncated mid-sentence.
app.post('/api/speak', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    if (!GOOGLE_TTS_API_KEY) return res.status(501).json({ error: 'GOOGLE_TTS_API_KEY not configured.' });

    const english = isEnglish(language);
    const voiceOverride = english ? ENGLISH_GOOGLE_VOICE : undefined;
    const audioContent = await synthFullWithGoogle(text, english ? 'en-US' : language, voiceOverride);
    res.json({ audioContent, provider: 'google' });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Workflow Endpoint (Chained: Audio -> STT -> Chat -> TTS)
app.post('/api/workflow', async (req, res) => {
  try {
    if (!whisperClient) return res.status(501).json({ error: 'Speech-to-text requires OPENAI_API_KEY.' });
    const { audio, mimeType } = req.body;

    if (!audio) return res.status(400).json({ error: "No audio data" });

    // Step 1: STT (with legal vocabulary primer)
    const buffer = Buffer.from(audio, 'base64');
    const extension = mimeType?.includes('mp4') ? 'm4a' : 'webm';
    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });

    const transcription = await whisperClient.audio.transcriptions.create({
      file,
      model: GROK_STT_MODEL,
      prompt: WHISPER_LEGAL_PROMPT,
    });
    
    const userText = transcription.text;
    
    // Step 2: Chat via Grok
    const chatCompletion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: 'You are LegalCareAI, an Indian legal assistant. Reply in clear plain language, no markdown.' },
        { role: 'user', content: userText }
      ],
      max_tokens: 600,
      temperature: 0.4,
    });
    const aiText = chatCompletion.choices[0]?.message?.content || "Okay.";

    // Step 3: Full-answer TTS via Google (sentence-aware chunking → no truncation)
    if (!GOOGLE_TTS_API_KEY) return res.status(501).json({ error: 'GOOGLE_TTS_API_KEY not configured.' });
    const detectedLang = normalizeDetectedLang(transcription.language);
    const english = isEnglish(detectedLang);
    const voiceOverride = english ? ENGLISH_GOOGLE_VOICE : undefined;
    const audioContent = await synthFullWithGoogle(aiText, english ? 'en-US' : detectedLang, voiceOverride);

    res.json({
      userText,
      aiText,
      audioResponse: audioContent // already base64 MP3
    });

  } catch (error) {
    console.error('Workflow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Courtroom AI Endpoint
app.post('/functions/v1/courtroom-ai', async (req, res) => {
  try {
    const { action, documentContent, caseAnalysis, phase, previousArguments, userRole, userMessage, language } = req.body;

    const getLanguageInstruction = (lang) => {
      const langMap = {
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
        'hi-EN': 'Respond in Hinglish (Hindi words written in English/Roman script mixed with English).',
      };
      const base = langMap[lang] || 'Respond in English. Use clear legal English terminology.';
      if (lang === 'hi-EN' || !langMap[lang]) return base;
      return `${base} LANGUAGE LOCK: Keep the ENTIRE statement in this one language from first word to last — never switch to Hindi or English partway, and finish every sentence completely.`;
    };

    const callAI = async (messages, maxTokens = 1500) => {
      const completion = await grok.chat.completions.create({
        model: GROK_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content || '';
    };

    const langInstruction = getLanguageInstruction(language || 'en-IN');

    if (action === 'analyze') {
      const rawDoc = (documentContent || '').trim();
      // Reject empty or trivially short input — otherwise the LLM hallucinates a
      // fake case and the placeholder fallback ('Case Analysis') hides the bug.
      if (rawDoc.replace(/\s+/g, '').length < 40) {
        return res.status(400).json({
          error: 'document_too_short',
          message: 'The uploaded document has no extractable text (it may be a scanned image PDF) or is too short to analyze. Please paste case details manually or upload a text-based document.',
        });
      }
      const docContent = rawDoc.slice(0, 60000);
      const content = await callAI([
        {
          role: 'system',
          content: `You are an expert Indian legal case analyzer. Analyze the provided legal documents and extract structured information. You must respond in valid JSON format only, no markdown. ${langInstruction} — but keep JSON keys in English, only values should be in the selected language.`
        },
        {
          role: 'user',
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

      let parsed;
      try {
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { caseSummary: content, caseType: 'General', caseTitle: 'Case Analysis', parties: { complainant: 'Party A', accused: 'Party B' }, keyIssues: [], evidenceSummary: [], claims: [], counterClaims: [], applicableLaws: [] };
      }
      return res.json({ analysis: parsed });
    }

    if (action === 'simulate_phase') {
      const analysis = JSON.stringify(caseAnalysis);
      const prevArgs = (previousArguments || []).map(a => `[${a.speaker}]: ${a.content}`).join('\n') || 'None yet.';
      const opponentRole = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';

      const phasePrompts = {
        // ── Session start ────────────────────────────────────────────────────
        case_introduction: { speaker: 'Judge', prompt: 'You are an AI Judge in an Indian courtroom. Introduce the case formally. State the case type, parties involved, and the charges/claims. Be authoritative but neutral. 4-6 sentences.' },

        // ── Opening statements ───────────────────────────────────────────────
        opening_prosecution: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI) in an Indian courtroom. The user is representing the other side as their own lawyer. Deliver your opening statement. Present key claims or defense strategy, outline evidence. Be persuasive but factual. 5-7 sentences.` },
        opening_defense: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI) in an Indian courtroom. Deliver your opening statement. Challenge the other side's claims or outline your defense strategy. Be assertive and logical. 5-7 sentences.` },

        // ── Phase transitions (Judge announces moving to next phase) ─────────
        opening_transition:     { speaker: 'Judge', prompt: 'You are the AI Judge. The opening statements phase has concluded. Formally announce the transition into the examination phase. Summarize what was established in the openings in 1-2 sentences, then declare the examination phase open. 3-4 sentences total.' },
        examination_transition: { speaker: 'Judge', prompt: 'You are the AI Judge. The examination phase has concluded. Formally announce the transition into the closing arguments phase. Briefly note the key evidence discussed. 3-4 sentences.' },
        closing_transition:     { speaker: 'Judge', prompt: 'You are the AI Judge. The court is now entering the closing arguments phase. Formally announce this and remind both sides they have one final opportunity to address the court. 2-3 sentences.' },
        verdict_transition:     { speaker: 'Judge', prompt: 'You are the AI Judge. All arguments have been heard. Formally announce the court is rising for deliberation and that the verdict will be pronounced shortly. 2-3 sentences.' },

        // ── Evidence & arguments ─────────────────────────────────────────────
        evidence_presentation: { speaker: 'Judge', prompt: 'You are the AI Judge. Review and present key evidence from both sides. Summarize what each piece suggests, note gaps or inconsistencies. 6-8 sentences.' },
        prosecution_argument:  { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Present main legal arguments. Cite relevant Indian laws. Connect evidence to your claims. Be thorough and persuasive. 6-8 sentences.` },
        defense_argument:      { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Present counter-arguments. Challenge the other side's reasoning. Cite defense-favorable laws. Be thorough and persuasive. 6-8 sentences.` },

        // ── Judge interaction ────────────────────────────────────────────────
        judge_questions:       { speaker: 'Judge', prompt: 'You are the AI Judge. Ask 3-4 critical questions addressed to BOTH sides. Format as numbered questions specifying who they are directed to.' },
        judge_reaction:        { speaker: 'Judge', prompt: `You are the AI Judge. A party in the case has just presented an argument. Based on the most recent argument in the proceedings, acknowledge it, note its legal merit briefly, and direct the ${opponentRole} to respond. Be formal, fair, and neutral. 2-4 sentences.` },
        opponent_answer_judge: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Answer the questions directed to your side thoroughly, citing law and evidence. 4-6 sentences.` },

        // ── Closing ──────────────────────────────────────────────────────────
        closing_prosecution: { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Deliver closing statement. Summarize strongest points and explain why your side should prevail. 5-7 sentences.` },
        closing_defense:     { speaker: opponentRole, prompt: `You are the ${opponentRole} (AI). Deliver closing statement. Summarize why your side should prevail. Be convincing. 5-7 sentences.` },

        // ── Private advisor hint (shown only to the user, not the court) ─────
        private_advisor_hint: { speaker: 'Advisor', prompt: `You are a private legal advisor giving a confidential strategic tip to the user. Based on what has been argued so far in the proceedings, give 1-2 specific, actionable suggestions to strengthen the user's position. Be concise, practical, and encouraging. Do NOT address the judge or opponent — speak directly to the user as their private counsel. 3-5 sentences.` },
      };

      const config = phasePrompts[phase] || { speaker: 'Judge', prompt: 'You are the AI Judge. Provide a brief neutral update on the state of the court proceedings. 2-3 sentences.' };

      const roleRules = config.speaker === 'Judge' ? `\n\n${JUDGE_SPEECH_RULES}` : '';

      const content = await callAI([
        {
          role: 'system',
          content: `${config.prompt}${roleRules}\n\n${langInstruction}\n\nCase Analysis: ${analysis}\n\nPrevious proceedings:\n${prevArgs}\n\nIMPORTANT: Do NOT use any markdown formatting. Write in plain conversational court language. Stay strictly within Indian legal framework.`
        },
        {
          role: 'user',
          content: `Proceed with the ${(phase || '').replace(/_/g, ' ')} phase of this courtroom hearing.`
        }
      ], 1200);

      return res.json({ speaker: config.speaker, phase, content: stripMarkdown(content) });
    }

    if (action === 'user_argument') {
      const analysis = JSON.stringify(caseAnalysis);
      const prevArgs = (previousArguments || []).map(a => `[${a.speaker}]: ${a.content}`).join('\n') || '';
      const opponentRole = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';

      // Accept both key names: 'userArgument' (from client) and 'userMessage' (legacy)
      const userMsg = req.body.userArgument || userMessage || '';

      const judgeContent = await callAI([
        {
          role: 'system',
          content: `You are the AI Judge in an Indian courtroom. The ${userRole === 'complainant' ? 'complainant' : 'accused'} (acting as their own lawyer) has just presented this argument: "${userMsg}". Acknowledge the argument, briefly evaluate its legal merit, and formally direct the ${opponentRole} to respond. Be neutral and formal. 3-5 sentences.\n\n${JUDGE_SPEECH_RULES}\n\n${langInstruction}\n\nCase Analysis: ${analysis}\n\nPrevious proceedings:\n${prevArgs}\n\nIMPORTANT: Do NOT use any markdown. Plain conversational court language only.`
        },
        { role: 'user', content: "Respond to the user's argument as the judge." }
      ], 900);

      const rebuttalContent = await callAI([
        {
          role: 'system',
          content: `You are the ${opponentRole} in an Indian courtroom. The opposing party just argued: "${userMsg}". The judge has acknowledged it. Now deliver a strong, evidence-based rebuttal. Challenge their points using law, evidence, and logic. 4-6 sentences.\n\n${langInstruction}\n\nCase Analysis: ${analysis}\n\nPrevious proceedings:\n${prevArgs}\n\nJudge's response: ${judgeContent}\n\nIMPORTANT: Do NOT use any markdown. Plain conversational court language only.`
        },
        { role: 'user', content: "Deliver your rebuttal to the user's argument." }
      ], 900);

      const cleanJudge    = stripMarkdown(judgeContent);
      const cleanRebuttal = stripMarkdown(rebuttalContent);

      // Return 'content' at top level (what the client currently reads as opponent text)
      // AND 'judgeContent' so the client can use it without a second API call.
      return res.json({
        content:      cleanRebuttal,   // opponent's rebuttal — client reads this as oppText
        judgeContent: cleanJudge,      // judge's reaction — client can use this directly
        dialogue:     cleanRebuttal,   // alias for any old client code that reads .dialogue
        responses: [
          { speaker: 'Judge',        content: cleanJudge,    phase: 'Judge Response' },
          { speaker: opponentRole,   content: cleanRebuttal, phase: 'Rebuttal' },
        ]
      });
    }

    if (action === 'judgment') {
      const analysis = JSON.stringify(caseAnalysis);
      const allArgs = (previousArguments || []).map(a => `[${a.speaker}]: ${a.content}`).join('\n\n') || '';

      const content = await callAI([
        {
          role: 'system',
          content: `You are an AI Judge delivering a final judgment in an Indian courtroom simulation. The user acted as their own lawyer. You must be completely neutral and base your judgment strictly on law, evidence, and logical reasoning.\n\n${JUDGE_SPEECH_RULES}\n\n${langInstruction}\n\nStructure your judgment as follows (use plain text, no markdown):\n\nCASE SUMMARY:\n[2-3 sentences summarizing the case]\n\nLEGAL ANALYSIS:\n[Analysis of the legal issues and applicable laws]\n\nEVALUATION OF ARGUMENTS:\n[Assessment of arguments presented by the user and the AI opponent lawyer]\n\nEVALUATION OF EVIDENCE:\n[Assessment of evidence presented by both sides]\n\nAPPLICATION OF LAW:\n[How the relevant laws apply to the facts]\n\nREASONING:\n[Your logical reasoning for the decision]\n\nFINAL DECISION:\n[Clear statement of the judgment]\n\nSUGGESTED NEXT STEPS:\n[2-3 practical steps for the parties]\n\nCase Analysis: ${analysis}\n\nFull proceedings:\n${allArgs}\n\nIMPORTANT: Be fair, neutral, and thorough. Do not fabricate legal sections.`
        },
        { role: 'user', content: 'Deliver the final judgment for this case.' }
      ], 2500);

      return res.json({ judgment: stripMarkdown(content) });
    }

    return res.json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Courtroom AI error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Legal Chat function endpoint (used by frontend invokeFunction('legal-chat'))
app.post('/functions/v1/legal-chat', async (req, res) => {
  try {
    const { message, detectedLanguage, documentContent, sessionId, action, stream } = req.body;

    // Summarize action: produce a summary of an uploaded document
    if (action === 'summarize') {
      const langInstr = getLanguageInstructions(detectedLanguage || 'en-IN');
      const completion = await grok.chat.completions.create({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: `${langInstr}\n\nYou are an Indian legal assistant. Summarize the user's legal document in clear, simple language. Highlight key parties, claims, dates, legal sections, and any deadlines or risks.\n\nCRITICAL: Your ENTIRE response MUST be written in the language specified above. Do not switch languages mid-answer. Do not respond in English unless English was explicitly requested.` },
          { role: 'user', content: `Summarize this document:\n\n${(documentContent || '').slice(0, 60000)}` }
        ],
        max_tokens: 1200,
        temperature: 0.3,
      });
      return res.json({ response: stripMarkdown(completion.choices[0]?.message?.content || ''), language: detectedLanguage });
    }

    // Default chat — Grok-powered Indian legal assistant
    const { conversationHistory } = req.body;

    // STRONG language enforcement — the user's selected language MUST drive the response language.
    // We prepend the language directive AND repeat it at the end so the model never drifts.
    const langInstr = getLanguageInstructions(detectedLanguage || 'en-IN');

    const systemPrompt = `${langInstr}

You are LegalCareAI — the user's personal legal best friend. You know Indian law deeply but you explain it like a smart, caring friend over a chai, not like a lawyer in court. Your job is to make the user feel supported, understood, and empowered.

PERSONALITY:
- Warm, friendly, and conversational. Talk like a close friend who happens to know the law.
- If the user sounds worried or stressed, acknowledge it first before diving into advice.
- Use natural openers like "Hey, don't worry about this — here's what you can do:" or "Okay so here's the deal:" or "This is actually pretty common, let me break it down for you." (Translate these openers into the target language naturally — don't keep them in English.)
- Keep things simple and relatable. No legal jargon unless you explain it right away.
- DO NOT use emojis or pictographs anywhere in your response. The answer is read aloud by a TTS voice; emojis make the voice say things like "smiling face" or "scales" which sounds broken. Convey warmth through wording, not symbols.

CONTENT:
- Give accurate, real advice based on Indian law (BNS, IPC, CrPC, CPC, consumer protection, family law, property law, RTI, etc.).
- Mention relevant laws/sections naturally in conversation — don't list them in a formal table.
- Give practical next steps the user can actually take today.
- End with a short friendly reminder that you're a legal buddy, not the user's official lawyer — phrased naturally in the target language.

FORMATTING:
- Use short paragraphs and natural breaks. No huge walls of text.
- Use **bold** for key terms or important points only.
- Bullet points or numbered steps only when listing action items — keep lists short (3-5 items max).
- NO formal section headers like "Executive Summary", "Legal Analysis", "Applicable Law", "Disclaimer".
- NO rigid document structure. Just friendly, flowing conversation.

LANGUAGE LOCK (most important rule):
Your ENTIRE response — every single sentence, including greetings, headers, action steps, and the closing reminder — MUST be written in the language above (code: ${detectedLanguage || 'en-IN'}). Do NOT mix in English unless the target IS English or Hinglish. If the user types in English but their selected language is Hindi, you reply in HINDI. If they switch to Tamil mid-conversation, you switch to TAMIL. The selected language ALWAYS wins. Legal acronyms (FIR, IPC, GST) may stay in their standard form, but everything else must be in the selected language's native script.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    // Add conversation history if provided
    if (Array.isArray(conversationHistory)) {
      for (const m of conversationHistory) {
        if (m.role && m.content) messages.push({ role: m.role, content: m.content });
      }
    }

    // Add document context to the user message if present
    const userContent = documentContent
      ? `[Document Context]\n${documentContent.slice(0, 40000)}\n\n[User Question]\n${message}`
      : message;
    messages.push({ role: 'user', content: userContent });

    // STREAMING path — push tokens to client as they arrive (huge perceived-latency win)
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      try {
        const completion = await grok.chat.completions.create({
          model: GROK_MODEL,
          messages,
          // Non-Latin scripts (Tamil/Telugu/Bengali/Marathi/Punjabi/Hindi) consume
          // ~3-4x more tokens per word than English. 500 truncated them mid-sentence.
          // 1500 lets a full answer complete in any supported script.
          max_tokens: 1500,
          temperature: 0.4,
          stream: true,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (err) {
        console.error('legal-chat stream error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    const completion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages,
      // See note above: 1500 prevents non-Latin-script answers from truncating.
      max_tokens: 1500,
      temperature: 0.4,
    });

    const aiText = completion.choices[0]?.message?.content || "I am unable to process that request at the moment.";
    res.json({ response: aiText, language: detectedLanguage });
  } catch (error) {
    console.error('legal-chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Voice-to-text function endpoint
app.post('/functions/v1/voice-to-text', async (req, res) => {
  try {
    if (!whisperClient) return res.status(501).json({ error: 'Speech-to-text requires OPENAI_API_KEY.' });
    const { audio, mimeType, language } = req.body;
    if (!audio) return res.status(400).json({ error: 'No audio data' });

    const buffer = Buffer.from(audio, 'base64');
    let extension = 'webm';
    if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) extension = 'm4a';
    if (mimeType?.includes('wav')) extension = 'wav';
    if (mimeType?.includes('mp3') || mimeType?.includes('mpeg')) extension = 'mp3';

    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });
    const transcription = await whisperClient.audio.transcriptions.create({
      file,
      model: GROK_STT_MODEL,
      response_format: 'verbose_json',
      prompt: WHISPER_LEGAL_PROMPT,
    });

    res.json({
      text: transcription.text,
      detectedLanguage: normalizeDetectedLang(transcription.language),
      detectedLanguageRaw: transcription.language,
      ok: true,
    });
  } catch (error) {
    console.error('voice-to-text error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Speak (TTS) function endpoint — Google TTS only
// Accepts optional `role` ('judge' | 'opponent') for courtroom character voices.
// When role is set, uses COURTROOM_VOICE_CONFIG (deep male judge / fluent female lawyer).
// Without role, falls back to the standard language→voice map.
app.post('/functions/v1/speak', async (req, res) => {
  try {
    const { text, language, role } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    if (!GOOGLE_TTS_API_KEY) return res.status(501).json({ error: 'GOOGLE_TTS_API_KEY not configured.' });

    let voiceOverride, tuningOverride, langForTTS;

    if (role && COURTROOM_VOICE_CONFIG[role]) {
      // Courtroom character voice — ignore language param, always en-IN
      const cfg    = COURTROOM_VOICE_CONFIG[role];
      voiceOverride  = cfg.voice;
      tuningOverride = cfg.tuning;
      langForTTS     = 'en-IN';
    } else {
      // Standard voice — route English through British Neural2-C
      const english  = isEnglish(language);
      voiceOverride  = english ? ENGLISH_GOOGLE_VOICE : undefined;
      tuningOverride = undefined;
      langForTTS     = english ? 'en-GB' : language;
    }

    const audioContent = await synthFullWithGoogle(text, langForTTS, voiceOverride, tuningOverride);
    res.json({ audioContent, provider: 'google', role: role || null });
  } catch (error) {
    console.error('speak error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── 8b. Vision OCR + Understanding ──────────────────────────────────────────
// Accepts an image (PNG, JPG, WEBP, GIF, HEIC) as base64 and returns extracted
// text + a description of what's in the image. Used by AI Assistant chat and
// Courtroom AI to handle photo evidence, scanned docs as images, screenshots
// of WhatsApp/SMS, notice photos, etc.
app.post('/functions/v1/vision-extract', async (req, res) => {
  try {
    const { imageBase64, mimeType, fileName } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
    if (!whisperClient) return res.status(501).json({ error: 'OPENAI_API_KEY not configured on server.' });

    // Normalize MIME — default to image/png if missing
    const mt = (mimeType && typeof mimeType === 'string') ? mimeType : 'image/png';
    if (!/^image\/(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(mt)) {
      return res.status(400).json({ error: `Unsupported image type: ${mt}` });
    }

    // Guard payload size — OpenAI rejects >20 MB images
    const approxBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (approxBytes > 18 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large (max ~18 MB after base64). Please compress and retry.' });
    }

    const dataUrl = `data:${mt};base64,${imageBase64}`;
    const prompt = `You are processing an image uploaded to an Indian legal assistant app.

Do two things and return BOTH:

1. EXTRACTED TEXT — copy EVERY readable character you can see, exactly as written, preserving line breaks and reading order. Include handwritten text, signatures (mark as [Signature]), stamps, headers, footers, page numbers, table contents. If there is no text, write "(no text visible)".

2. DESCRIPTION — describe what the image shows in 2-5 sentences, focused on what matters legally: type of document or scene, parties, dates, amounts, key clauses, injuries, damage, location, anything an Indian lawyer would care about. Be neutral and factual.

Format your response EXACTLY like this, no extra commentary:

===EXTRACTED TEXT===
<the text>

===DESCRIPTION===
<the description>`;

    const completion = await whisperClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      }],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const textMatch = raw.match(/===EXTRACTED TEXT===\s*([\s\S]*?)(?=\s*===DESCRIPTION===|$)/);
    const descMatch = raw.match(/===DESCRIPTION===\s*([\s\S]*?)$/);
    const text = (textMatch?.[1] || '').trim();
    const description = (descMatch?.[1] || '').trim();

    const combined = [
      fileName ? `--- Image: ${fileName} ---` : '--- Image ---',
      text && text !== '(no text visible)' ? `[Text in image]\n${text}` : '[No readable text in image]',
      description ? `[Description]\n${description}` : '',
    ].filter(Boolean).join('\n\n');

    res.json({ text, description, combined });
  } catch (error) {
    console.error('vision-extract error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Vision extraction failed' });
  }
});

// ─── 9. Custom OTP Email Verification ────────────────────────────────────────
// Completely replaces Supabase's built-in email confirmation (which has a 2 email/hour
// free-tier rate limit and poor deliverability). Our flow:
//
//   1. Frontend calls POST /functions/v1/send-verification with { email, userId }
//   2. We generate a 6-digit OTP, store it in memory for 15 min, email it via Nodemailer
//   3. User sees a 6-box OTP input screen in the app
//   4. Frontend calls POST /functions/v1/verify-otp with { email, otp }
//   5. We validate the OTP → call Supabase Admin API to confirm the user
//   6. Frontend auto-signs the user in (they already have the password in state)
//
// Requires in server/.env:
//   NOTIFY_FROM_EMAIL / NOTIFY_FROM_PASS  — Gmail sender (already configured)
//   SUPABASE_URL                          — project URL (already configured)
//   SUPABASE_SERVICE_KEY                  — service_role key from Supabase dashboard
//                                           Settings → API → service_role

// In-memory OTP store: email → { otp, userId, expiresAt }
// (Survives server restarts gracefully — user just requests a new code)
const pendingOTPs = new Map();
const OTP_TTL_MS  = 15 * 60 * 1000; // 15 minutes

const buildOTPEmailHTML = (otp, email) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family:'Segoe UI',Arial,sans-serif; background:#f4f4f5; margin:0; padding:24px; }
  .card { background:#fff; border-radius:12px; max-width:480px; margin:0 auto; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .header { background:#1e293b; padding:24px 28px; }
  .header h1 { color:#fff; margin:0; font-size:20px; font-weight:700; }
  .header p  { color:rgba(255,255,255,.7); margin:4px 0 0; font-size:13px; }
  .body { padding:32px 28px; text-align:center; }
  .otp-box { display:inline-block; background:#f8fafc; border:2px solid #e2e8f0; border-radius:12px; padding:20px 40px; margin:20px 0; }
  .otp { font-size:40px; font-weight:800; letter-spacing:12px; color:#1e293b; font-family:monospace; }
  .note { color:#64748b; font-size:13px; margin-top:4px; }
  .expire { color:#94a3b8; font-size:12px; margin-top:16px; }
  .footer { background:#f8fafc; padding:16px 28px; text-align:center; }
  .footer p { color:#94a3b8; font-size:11px; margin:0; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>⚖️ LegalCareAI</h1>
    <p>Email Verification</p>
  </div>
  <div class="body">
    <p style="color:#334155;font-size:15px;margin-bottom:8px;">Enter this code in the app to verify <strong>${email}</strong></p>
    <div class="otp-box">
      <div class="otp">${otp}</div>
      <div class="note">Your verification code</div>
    </div>
    <p class="expire">⏱ This code expires in <strong>15 minutes</strong>.</p>
    <p style="color:#94a3b8;font-size:12px;margin-top:12px;">If you did not sign up for LegalCareAI, you can safely ignore this email.</p>
  </div>
  <div class="footer"><p>LegalCareAI · Automated email · Do not reply</p></div>
</div>
</body></html>`;

// POST /functions/v1/send-verification  { email, userId }
app.post('/functions/v1/send-verification', async (req, res) => {
  const { email, userId } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: 'Email required' });

  // Generate a 6-digit numeric OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  pendingOTPs.set(email.toLowerCase().trim(), {
    otp,
    userId: userId || null,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  // Send via Nodemailer — fall back to console log if SMTP is not working
  if (emailTransporter) {
    try {
      await emailTransporter.sendMail({
        from: `"LegalCareAI" <${process.env.NOTIFY_FROM_EMAIL}>`,
        to: email,
        subject: `${otp} — your LegalCareAI verification code`,
        html: buildOTPEmailHTML(otp, email),
      });
      console.log(`[otp] ✅ Sent code to ${email}`);
    } catch (err) {
      // Email failed — log OTP to console so admin can relay it manually during SMTP outage
      console.error(`[otp] ❌ Email send failed: ${err.message}`);
      console.warn(`[otp] 🔑 FALLBACK — OTP for ${email}: ${otp}  (expires in 15 min)`);
      // Still return success so the UI doesn't show a confusing error.
      // The OTP IS stored in memory and will validate fine — just not emailed.
    }
  } else {
    // Nodemailer not configured — log OTP for local dev / SMTP-down scenario
    console.warn(`[otp] 🔑 Email not configured — OTP for ${email}: ${otp}  (expires in 15 min)`);
    // In production without working SMTP: still store OTP, return success.
    // Admin can see OTPs in server logs. This prevents users from being
    // completely locked out while SMTP is being configured.
  }

  res.json({ ok: true });
});

// POST /functions/v1/verify-otp  { email, otp }
app.post('/functions/v1/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ valid: false, error: 'Email and code required' });

  const key     = email.toLowerCase().trim();
  const stored  = pendingOTPs.get(key);

  if (!stored) {
    return res.json({ valid: false, error: 'No verification code found for this email. Please request a new one.' });
  }
  if (Date.now() > stored.expiresAt) {
    pendingOTPs.delete(key);
    return res.json({ valid: false, error: 'Code expired. Please request a new one.' });
  }
  if (stored.otp !== String(otp).trim()) {
    return res.json({ valid: false, error: 'Incorrect code. Please check and try again.' });
  }

  // ✓ OTP matches — confirm the user in AWS Cognito via Admin API
  pendingOTPs.delete(key);

  if (process.env.COGNITO_USER_POOL_ID) {
    try {
      const cognitoAdmin = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
      // Confirm the user (status UNCONFIRMED → CONFIRMED)
      await cognitoAdmin.send(new AdminConfirmSignUpCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username:   email,
      }));
      // AdminConfirmSignUpCommand does NOT automatically set email_verified.
      // We must set it explicitly so login's email_verified check passes.
      await cognitoAdmin.send(new AdminUpdateUserAttributesCommand({
        UserPoolId:     process.env.COGNITO_USER_POOL_ID,
        Username:       email,
        UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
      }));
      console.log(`[otp] ✅ Cognito user confirmed + email verified: ${email}`);
    } catch (err) {
      // If user is already confirmed, AdminConfirmSignUpCommand throws NotAuthorizedException.
      // Still try to set email_verified in case it isn't set yet.
      if (err.name === 'NotAuthorizedException' || err.message?.includes('CONFIRMED')) {
        try {
          const cognitoAdmin2 = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
          await cognitoAdmin2.send(new AdminUpdateUserAttributesCommand({
            UserPoolId:     process.env.COGNITO_USER_POOL_ID,
            Username:       email,
            UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
          }));
          console.log(`[otp] ✅ email_verified set for already-confirmed user: ${email}`);
        } catch { /* ignore */ }
      } else {
        console.error('[otp] Cognito confirm error:', err.message);
      }
    }
  } else {
    console.warn('[otp] COGNITO_USER_POOL_ID not set — skipping user confirmation');
  }

  res.json({ valid: true });
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── 9. Email Existence Validator ────────────────────────────────────────────
// Called from the signup / login form while the user is typing.
// Three-layer check:
//   1. Basic format regex
//   2. Disposable / throwaway domain blocklist
//   3. DNS MX record lookup — if the domain has no mail server the email can't exist
//
// Returns { valid: true } or { valid: false, reason: "human-readable message" }
// Responds in <200 ms for cached DNS; first-lookup is ~300–500 ms.

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamailblock.com','grr.la',
  'guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net',
  'guerrillamail.org','tempmail.com','throwam.com','yopmail.com','yopmail.fr',
  'sharklasers.com','spam4.me','trashmail.com','trashmail.me','trashmail.net',
  'trashmail.at','trashmail.io','trashmail.org','fakeinbox.com','maildrop.cc',
  '10minutemail.com','10minutemail.net','temp-mail.org','throwaway.email',
  'dispostable.com','mailnull.com','spamgourmet.com','discard.email',
  'mailforspam.com','binkmail.com','getonemail.com','mailnesia.com',
  'spamfree24.org','tempr.email','inboxkitten.com','tempinbox.com',
  'mailpoof.com','getnada.com','filzmail.com','spamgrap.com','spamgrap.org',
  'trashmail.fr','temp.email','tempail.com','tmail.com','zetmail.com',
  'spamoverlord.com','spamspot.com','spamfighter.com','fakemailgenerator.com',
  'mohmal.com','spamgourmet.net','crapmail.org','bspamfree.org','spambog.com',
  'mailnull.com','spamfree.eu','spamfree24.de','wh4f.org','uggsrock.com',
  'explodemail.com','tempe-mail.com','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]{1,253}\.[^\s@]{2,}$/;

// Simple in-process MX cache — avoids hammering DNS for the same domain twice.
const mxCache = new Map(); // domain → { valid, ts }
const MX_CACHE_TTL = 10 * 60 * 1000; // 10 min

const checkDomainMX = async (domain) => {
  const now = Date.now();
  const cached = mxCache.get(domain);
  if (cached && (now - cached.ts) < MX_CACHE_TTL) return cached.valid;

  try {
    const records = await dnsResolve.resolveMx(domain);
    const valid = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, { valid, ts: now });
    return valid;
  } catch {
    mxCache.set(domain, { valid: false, ts: now });
    return false;
  }
};

app.post('/functions/v1/validate-email', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();

  // 1. Format
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.json({ valid: false, reason: 'Please enter a valid email address.' });
  }

  const domain = email.split('@')[1];

  // 2. Disposable
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return res.json({ valid: false, reason: 'Temporary/disposable email addresses are not allowed. Please use a real inbox.' });
  }

  // 3. MX record — does this domain actually receive email?
  const hasMX = await checkDomainMX(domain);
  if (!hasMX) {
    return res.json({ valid: false, reason: `"${domain}" cannot receive emails. Please check for typos or use a different address.` });
  }

  return res.json({ valid: true });
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── 9. Auth Notification Endpoint ───────────────────────────────────────────
// Called by the frontend after every successful sign-in or sign-up.
// Sends a formatted HTML email to the ADMIN_NOTIFY_EMAIL address so the owner
// can see every login/signup in real time — customer name, email, event type,
// timestamp, browser/device info.
//
// Setup (fill in server/.env):
//   NOTIFY_FROM_EMAIL = a Gmail address you own (e.g. legalcareai.alerts@gmail.com)
//   NOTIFY_FROM_PASS  = Gmail App Password (myaccount.google.com → Security → App Passwords)
//   ADMIN_NOTIFY_EMAIL = rounak.singh@hudsonplacements.com   ← already set below
//
// If credentials are missing the endpoint returns 200 silently so logins never fail.
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'rounak.singh@hudsonplacements.com';

// Detect SMTP provider from the sender's domain — Hostinger, Outlook/365, or Gmail.
const detectSMTPConfig = (email) => {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase() || '';

  // Hostinger custom-domain email (MX: mx1.hostinger.com)
  // Port 465 + secure:true (SSL) is Hostinger's recommended config for custom domains.
  // Port 587 STARTTLS triggers auth failures on many Hostinger shared-hosting accounts.
  if (domain !== 'gmail.com' && domain !== 'outlook.com' && domain !== 'hotmail.com') {
    return { host: 'smtp.hostinger.com', port: 465, secure: true };
  }
  // Microsoft / Outlook
  if (domain === 'outlook.com' || domain === 'hotmail.com') {
    return { host: 'smtp-mail.outlook.com', port: 587, secure: false };
  }
  // Gmail (needs App Password, not regular password)
  return { host: 'smtp.gmail.com', port: 587, secure: false };
};

let emailTransporter = null;
if (process.env.NOTIFY_FROM_EMAIL && process.env.NOTIFY_FROM_PASS) {
  const smtpConfig = detectSMTPConfig(process.env.NOTIFY_FROM_EMAIL);
  emailTransporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: process.env.NOTIFY_FROM_EMAIL,
      pass: process.env.NOTIFY_FROM_PASS,
    },
    tls: { rejectUnauthorized: false }, // tolerate self-signed certs on shared hosting
  });
  emailTransporter.verify((err) => {
    if (err) {
      console.warn('[email] ⚠️  SMTP auth failed — email disabled. OTPs will be logged to console.');
      console.warn('[email] Fix: Go to Hostinger hPanel → Emails → Email Accounts → change password for', process.env.NOTIFY_FROM_EMAIL);
      console.warn('[email] Error detail:', err.message);
      emailTransporter = null; // disable so we fallback cleanly
    } else {
      console.log(`[email] ✅ Transporter ready (${smtpConfig.host}) → ${ADMIN_NOTIFY_EMAIL}`);
    }
  });
} else {
  console.warn('[email] NOTIFY_FROM_EMAIL / NOTIFY_FROM_PASS not set — auth notifications disabled.');
}

const buildNotifyHTML = ({ event, name, email, timestamp, userAgent }) => {
  const eventLabel  = event === 'signup' ? '🆕 New Sign-Up' : '🔐 New Login';
  const eventColour = event === 'signup' ? '#16a34a' : '#2563eb';
  const dt = new Date(timestamp || Date.now());
  const dateStr = dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f4f4f5; margin:0; padding:24px; }
  .card { background:#fff; border-radius:12px; max-width:520px; margin:0 auto; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .header { background:${eventColour}; padding:24px 28px; }
  .header h1 { color:#fff; margin:0; font-size:20px; font-weight:700; }
  .header p  { color:rgba(255,255,255,.8); margin:4px 0 0; font-size:13px; }
  .body { padding:28px; }
  .row { display:flex; padding:10px 0; border-bottom:1px solid #f1f5f9; }
  .row:last-child { border-bottom:none; }
  .label { color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase; width:110px; flex-shrink:0; }
  .value { color:#0f172a; font-size:14px; word-break:break-all; }
  .footer { background:#f8fafc; padding:16px 28px; text-align:center; }
  .footer p { color:#94a3b8; font-size:11px; margin:0; }
</style></head>
<body>
  <div class="card">
    <div class="header">
      <h1>${eventLabel}</h1>
      <p>LegalCareAI — Customer Activity Alert</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Event</span>   <span class="value">${event === 'signup' ? 'New Account Created' : 'User Signed In'}</span></div>
      <div class="row"><span class="label">Name</span>    <span class="value">${name || '—'}</span></div>
      <div class="row"><span class="label">Email</span>   <span class="value">${email}</span></div>
      <div class="row"><span class="label">Time (IST)</span><span class="value">${dateStr}</span></div>
      <div class="row"><span class="label">Device</span>  <span class="value">${(userAgent || '').slice(0, 120)}</span></div>
    </div>
    <div class="footer">
      <p>Automated notification from LegalCareAI · Do not reply</p>
    </div>
  </div>
</body>
</html>`;
};

app.post('/functions/v1/auth-notify', async (req, res) => {
  // Always return 200 so a notification failure never blocks login.
  res.json({ ok: true });

  if (!emailTransporter) return;

  const { event, name, email, timestamp, userAgent } = req.body || {};
  if (!email) return;

  const subject = event === 'signup'
    ? `🆕 New Sign-Up: ${name || email} — LegalCareAI`
    : `🔐 Login: ${name || email} — LegalCareAI`;

  try {
    await emailTransporter.sendMail({
      from: `"LegalCareAI Alerts" <${process.env.NOTIFY_FROM_EMAIL}>`,
      to: ADMIN_NOTIFY_EMAIL,
      subject,
      html: buildNotifyHTML({ event, name, email, timestamp, userAgent }),
    });
    console.log(`[email] Notification sent → ${ADMIN_NOTIFY_EMAIL} (${event}: ${email})`);
  } catch (err) {
    console.error('[email] Failed to send notification:', err.message);
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
//  AWS COGNITO + DYNAMODB — Auth middleware + Data API
// ═════════════════════════════════════════════════════════════════════════════

// ── Cognito JWT verifier ────────────────────────────────────────────────────
let jwtVerifier = null;
if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
  jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse:   'access',
    clientId:   process.env.COGNITO_CLIENT_ID,
  });
  console.log('[cognito] JWT verifier ready for pool', process.env.COGNITO_USER_POOL_ID);
} else {
  console.warn('[cognito] COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID not set — /api/* routes disabled');
}

const requireAuth = async (req, res, next) => {
  if (!jwtVerifier) return res.status(503).json({ error: 'Auth not configured (missing Cognito env vars)' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });
  try {
    const payload = await jwtVerifier.verify(token);
    req.userId    = payload.sub;          // Cognito sub = unique user ID
    req.userEmail = payload.username || payload['cognito:username'] || '';
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── DynamoDB client ─────────────────────────────────────────────────────────
const ddbRaw = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddb    = DynamoDBDocumentClient.from(ddbRaw, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

const CASES_TABLE  = 'legalcareai-cases';
const EVENTS_TABLE = 'legalcareai-calendar-events';

// Auto-create DynamoDB tables on startup (idempotent)
const ensureTable = async (tableName, keySchema, attrDefs) => {
  try {
    await ddbRaw.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') {
      await ddbRaw.send(new CreateTableCommand({
        TableName: tableName, KeySchema: keySchema,
        AttributeDefinitions: attrDefs, BillingMode: 'PAY_PER_REQUEST',
      }));
      console.log(`[dynamo] ✅ Created table: ${tableName}`);
    } else {
      console.error(`[dynamo] Table check error (${tableName}):`, e.message);
    }
  }
};

if (process.env.COGNITO_USER_POOL_ID) {
  Promise.all([
    ensureTable(CASES_TABLE,
      [{ AttributeName:'userId', KeyType:'HASH' }, { AttributeName:'caseId', KeyType:'RANGE' }],
      [{ AttributeName:'userId', AttributeType:'S' }, { AttributeName:'caseId', AttributeType:'S' }]),
    ensureTable(EVENTS_TABLE,
      [{ AttributeName:'userId', KeyType:'HASH' }, { AttributeName:'eventId', KeyType:'RANGE' }],
      [{ AttributeName:'userId', AttributeType:'S' }, { AttributeName:'eventId', AttributeType:'S' }]),
  ]).then(() => console.log('[dynamo] Tables ready'))
    .catch(e => console.error('[dynamo] Setup error:', e.message));
}

// ── Confirm password reset (OTP + Cognito AdminSetUserPassword) ──────────────
app.post('/functions/v1/confirm-password-reset', async (req, res) => {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ ok: false, error: 'Missing fields' });

  const key    = email.toLowerCase().trim();
  const stored = pendingOTPs.get(key);

  if (!stored) return res.json({ ok: false, error: 'No reset request found. Please request a new code.' });
  if (Date.now() > stored.expiresAt) {
    pendingOTPs.delete(key);
    return res.json({ ok: false, error: 'Code expired. Please request a new one.' });
  }
  if (stored.otp !== String(otp).trim()) {
    return res.json({ ok: false, error: 'Incorrect code. Please check and try again.' });
  }

  pendingOTPs.delete(key);

  if (!process.env.COGNITO_USER_POOL_ID) {
    return res.json({ ok: false, error: 'Auth not configured on server.' });
  }

  try {
    const cognitoAdmin = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    await cognitoAdmin.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username:   email,
      Password:   newPassword,
      Permanent:  true,
    }));
    console.log(`[reset] ✅ Password reset for: ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[reset] Cognito set password error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── CASES CRUD ────────────────────────────────────────────────────────────────

// GET /api/cases — list all cases for the authenticated user
app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await ddb.send(new QueryCommand({
      TableName: CASES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': req.userId },
      ScanIndexForward: false, // newest first (by sort key)
    }));
    let items = result.Items || [];
    // Sort by created_at descending so newest cases appear first
    items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    if (limit) items = items.slice(0, parseInt(limit));
    res.json(items);
  } catch (err) {
    console.error('[cases] list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases — create a case
app.post('/api/cases', requireAuth, async (req, res) => {
  try {
    const caseId = randomUUID();
    const now    = new Date().toISOString();
    const item   = {
      userId: req.userId, caseId,
      ...req.body,
      id: caseId, created_at: now, updated_at: now,
    };
    await ddb.send(new PutCommand({ TableName: CASES_TABLE, Item: item }));
    res.json(item);
  } catch (err) {
    console.error('[cases] create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cases/:caseId — update a case
app.put('/api/cases/:caseId', requireAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const updated = { ...req.body, updated_at: new Date().toISOString() };
    // Build UpdateExpression dynamically
    const fields = Object.keys(updated).filter(k => k !== 'userId' && k !== 'caseId');
    const expr   = 'SET ' + fields.map((k, i) => `#f${i} = :v${i}`).join(', ');
    const names  = Object.fromEntries(fields.map((k, i) => [`#f${i}`, k]));
    const values = Object.fromEntries(fields.map((k, i) => [`:v${i}`, updated[k]]));

    const result = await ddb.send(new UpdateCommand({
      TableName: CASES_TABLE,
      Key: { userId: req.userId, caseId },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    res.json(result.Attributes);
  } catch (err) {
    console.error('[cases] update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cases/:caseId
app.delete('/api/cases/:caseId', requireAuth, async (req, res) => {
  try {
    await ddb.send(new DeleteCommand({
      TableName: CASES_TABLE,
      Key: { userId: req.userId, caseId: req.params.caseId },
    }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[cases] delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CALENDAR EVENTS CRUD ──────────────────────────────────────────────────────

// GET /api/calendar-events?from=ISO&to=ISO&limit=N
app.get('/api/calendar-events', requireAuth, async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    let result = await ddb.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': req.userId },
      ScanIndexForward: true,
    }));

    let items = result.Items || [];
    if (from) items = items.filter(e => e.start_time >= from);
    if (to)   items = items.filter(e => e.start_time <= to);
    if (limit) items = items.slice(0, parseInt(limit));

    res.json(items);
  } catch (err) {
    console.error('[events] list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar-events — create an event
app.post('/api/calendar-events', requireAuth, async (req, res) => {
  try {
    const eventId = randomUUID();
    const now     = new Date().toISOString();
    const item    = {
      userId: req.userId, eventId,
      ...req.body,
      id: eventId, created_at: now,
    };
    await ddb.send(new PutCommand({ TableName: EVENTS_TABLE, Item: item }));
    res.json(item);
  } catch (err) {
    console.error('[events] create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar-events/:eventId
app.delete('/api/calendar-events/:eventId', requireAuth, async (req, res) => {
  try {
    await ddb.send(new DeleteCommand({
      TableName: EVENTS_TABLE,
      Key: { userId: req.userId, eventId: req.params.eventId },
    }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[events] delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GOOGLE SIGN-IN (bridge: Google JWT → real Cognito tokens) ────────────────
//
// Flow:
//  1. Frontend gets a Google credential (JWT) via @react-oauth/google
//  2. POST here with { credential }
//  3. We verify with Google's tokeninfo endpoint (no SDK needed)
//  4. Create/update Cognito user with a deterministic bridge-password derived
//     from the user's immutable Google sub + a server secret
//  5. Authenticate that user with Cognito → return real Cognito access tokens
//
// The bridge-password is NEVER sent to the frontend and NEVER stored in plain.
// It's derived deterministically so repeated Google sign-ins always work.

import { createHmac } from 'crypto'; // already available — Node built-in

const GOOGLE_BRIDGE_SECRET = process.env.GOOGLE_BRIDGE_SECRET || 'legalcareai-bridge-secret-2024';

const deriveGooglePassword = (googleSub) => {
  // Produces e.g. "Gg$a1b2c3d4e5f6g7h8i9j0A1!" — always satisfies Cognito policy
  const hash = createHmac('sha256', GOOGLE_BRIDGE_SECRET).update(googleSub).digest('hex').slice(0, 20);
  return `Gg$${hash}Lc1!`;
};

app.post('/functions/v1/google-signin', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Google credential required' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in not configured on server' });
  if (!process.env.COGNITO_USER_POOL_ID) return res.status(503).json({ error: 'Cognito not configured on server' });

  try {
    // 1. Verify Google JWT via Google's public endpoint (no SDK needed)
    const tokenInfoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await tokenInfoResp.json();

    if (payload.error) return res.status(401).json({ error: `Google token error: ${payload.error}` });
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'Token audience mismatch' });

    const { email, name, sub: googleSub } = payload;
    if (!email) return res.status(401).json({ error: 'No email in Google token' });

    const bridgePassword = deriveGooglePassword(googleSub);
    const cognitoAdmin = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });

    // 2. Create Cognito user if they don't exist
    try {
      await cognitoAdmin.send(new AdminCreateUserCommand({
        UserPoolId:        process.env.COGNITO_USER_POOL_ID,
        Username:          email,
        UserAttributes: [
          { Name: 'email',          Value: email },
          { Name: 'name',           Value: name || email.split('@')[0] },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction:     'SUPPRESS', // no welcome email
        TemporaryPassword: bridgePassword,
      }));
      // Promote to permanent so ADMIN_USER_PASSWORD_AUTH works immediately
      await cognitoAdmin.send(new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username:   email,
        Password:   bridgePassword,
        Permanent:  true,
      }));
      console.log(`[google] ✅ Created Cognito user: ${email}`);
    } catch (createErr) {
      if (createErr.name?.includes('UsernameExistsException') || createErr.__type?.includes('UsernameExistsException')) {
        // User exists — ensure email_verified and name are current
        await cognitoAdmin.send(new AdminUpdateUserAttributesCommand({
          UserPoolId:     process.env.COGNITO_USER_POOL_ID,
          Username:       email,
          UserAttributes: [
            { Name: 'email_verified', Value: 'true' },
            ...(name ? [{ Name: 'name', Value: name }] : []),
          ],
        }));
        console.log(`[google] ℹ️ Existing user updated: ${email}`);
      } else {
        throw createErr;
      }
    }

    // 3. Authenticate → get real Cognito access token
    const authResult = await cognitoAdmin.send(new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId:   process.env.COGNITO_CLIENT_ID,
      AuthFlow:   'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: bridgePassword },
    }));

    const session = authResult.AuthenticationResult;
    console.log(`[google] ✅ Signed in via Google: ${email}`);
    res.json({
      ok:           true,
      accessToken:  session.AccessToken,
      idToken:      session.IdToken,
      refreshToken: session.RefreshToken,
      user: {
        email,
        fullName:      name || email.split('@')[0],
        emailVerified: true,
      },
    });
  } catch (err) {
    console.error('[google] sign-in error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Default route for health check
// IMPORTANT: This must return 200 OK for AWS Elastic Beanstalk health checks
app.get('/', (req, res) => {
  res.status(200).send('LegalCare AI Backend is Running (Health Check OK)');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

