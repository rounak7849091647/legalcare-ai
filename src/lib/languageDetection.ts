/**
 * Smart language detection from typed or spoken text.
 *
 * Priority order:
 *  1. Unicode script ranges  (most reliable — unambiguous)
 *  2. Romanized Tamil (Tanglish)
 *  3. Romanized Telugu
 *  4. Romanized Kannada
 *  5. Romanized Malayalam
 *  6. Hinglish  (Hindi words in Latin script)
 *  7. Fallback to the caller's preferred language or 'en-IN'
 *
 * TTS accent contract:
 *  en-IN  → British accent  (ENGLISH_GOOGLE_VOICE in server)
 *  hinglish / hi-IN → Hindi Chirp3-HD  (authentic Indian)
 *  ta-IN  → Tamil Chirp3-HD
 *  te-IN  → Telugu Chirp3-HD
 *  (all other regional languages → their own Chirp3-HD voice)
 */

// ─── Unicode Script Ranges ─────────────────────────────────────────────────
const RE_DEVANAGARI  = /[\u0900-\u097F]/;
const RE_TAMIL       = /[\u0B80-\u0BFF]/;
const RE_TELUGU      = /[\u0C00-\u0C7F]/;
const RE_KANNADA     = /[\u0C80-\u0CFF]/;
const RE_MALAYALAM   = /[\u0D00-\u0D7F]/;
const RE_BENGALI     = /[\u0980-\u09FF]/;
// Assamese shares the Bengali script but uses two letters Bengali does not:
// \u09F0 (U+09F0) and \u09F1 (U+09F1). Their presence marks the text as Assamese.
const RE_ASSAMESE    = /[\u09F0\u09F1]/;
const RE_GUJARATI    = /[\u0A80-\u0AFF]/;
const RE_GURMUKHI    = /[\u0A00-\u0A7F]/; // Punjabi
const RE_ODIA        = /[\u0B00-\u0B7F]/;

// Marathi shares the Devanagari script with Hindi, so script alone can't tell them
// apart. These are Marathi-DISTINCTIVE words that Hindi does not use (Hindi uses
// different words: aur->aani, mujhe->mala, chahiye->pahije, kya->kaay, nahi->naahi).
// Devanagari boundaries (lookbehind/ahead) stop them matching inside Hindi words
// (e.g. kaay must not match inside kaayam/kaayda). Words that ARE valid Hindi
// (kele=bananas, hote/hoti) are deliberately excluded.
const RE_MARATHI = /(?<![\u0900-\u097F])(\u0906\u0939\u0947|\u0906\u0939\u0947\u0924|\u0906\u0923\u093F|\u092E\u0932\u093E|\u0924\u0941\u0932\u093E|\u0924\u094D\u092F\u093E\u0932\u093E|\u0924\u093F\u0932\u093E|\u092A\u093E\u0939\u093F\u091C\u0947|\u092E\u094D\u0939\u0923\u091C\u0947|\u092E\u094D\u0939\u0923\u0942\u0928|\u0924\u0941\u092E\u094D\u0939\u0940|\u0906\u092E\u094D\u0939\u0940|\u0915\u093E\u092F|\u0928\u093E\u0939\u0940|\u0928\u093E\u0939\u0940\u0924|\u092E\u093E\u091D\u093E|\u092E\u093E\u091D\u0940|\u092E\u093E\u091D\u0947|\u092E\u093E\u091D\u094D\u092F\u093E|\u0924\u0941\u091D\u093E|\u0924\u0941\u091D\u0940|\u091D\u093E\u0932\u093E|\u091D\u093E\u0932\u0940|\u091D\u093E\u0932\u0947|\u0915\u0938\u0947|\u0915\u0936\u0940|\u0915\u0941\u0920\u0947|\u0915\u093F\u0924\u0940|\u0928\u0915\u094B|\u0906\u092A\u0923|\u0916\u0942\u092A|\u0939\u094B\u092F|\u0915\u0930\u093E\u092F\u091A\u0947|\u092A\u093E\u0939\u093F\u091C\u0947\u0924)(?![\u0900-\u097F])/;

// ─── Romanized Pattern Sets ────────────────────────────────────────────────
// Words that are DISTINCTLY Tamil romanized (Tanglish).  They don't overlap
// with Hindi or English vocabulary.
const RE_TANGLISH = /\b(naan|enna|enakku|enaku|unakku|ungaluku|ungalukku|vanakkam|sollu|theriyum|theriyala|illai|ille|inge|adhu|ithu|avar|aval|avan|romba|konjam|paaru|seri|solren|kaanom|kanom|kudukka|pondati|machaan|machan|yenna|epdi|eppo|enga|yenge|ippo|innum|apram|kooda|maatom|matten|vendaam|vendam|venum|vendum|pannu|panna|irukku|mudiyadhu|mudinjichu|therila|theriyala|aama|aamaa|illa|nandri|poitu|poren|varren|iruken|irukken|paakalam|pakalaam|solla|vittu|paathuko|pathuko|theiyum|avaluku|avanuku|avanga|inga|anga|rombha)\b/i;

// Words that are DISTINCTLY Telugu romanized.
const RE_TELUGU_ROMAN = /\b(nenu|meeru|meru|ela|cheppandi|undi|ledu|chestanu|unna|kadu|evadu|evare|emundi|em|oka|anni|chala|chestam|ante|aithe|naa|naaku|kavali|kaavali|cheyali|cheyyali|ivvaledu|ivvu|memu|mee|ee|aa|idi|adi|vachanu|vacham|poyanu|poyam|kaadu|kaaduuu|ledhu|undhi|cheyyi|cheyyandi|okka|rendu|moodu|nalugu|ayidu|ardham|artham|chaduvutunna|padukunta|nidra|tinnanu|teestanu)\b/i;

// Words that are DISTINCTLY Bengali romanized. Chosen to avoid English/Hindi
// collisions (previously romanized Bengali fell through to English).
const RE_BENGALI_ROMAN = /\b(ami|tumi|apni|amar|tomar|apnar|amake|tomake|korbo|korchi|korte|korle|kori|kore|kobe|keno|kothay|kemon|bhalo|kharap|dorkar|deyni|deben|dilo|nei|ache|acche|hobe|hocche|kintu|tahole|ekhon|khub|bolchi|bolo|bolun|jani|janina|parbo|parina|chai|chaina|amader|tomader|onek|kichu)\b/i;

// Words that are DISTINCTLY Kannada romanized.
const RE_KANNADA_ROMAN = /\b(naanu|neevu|avaru|avalu|avanu|enu|hege|yaake|yavaga|yalli|idu|adu|maadbeku|maadbedi|hogbeku|hogbedi|barthini|barthare|aithu|agalla|beku|beda|sari|hogona|bartini|heli|helkodtini|gottu|gottilla|nodi|nodona|madona|kelsa|manege|oota|nidde|baduku)\b/i;

// Words that are DISTINCTLY Malayalam romanized.
const RE_MALAYALAM_ROMAN = /\b(njaan|ningal|avan|aval|athu|ithu|enniku|ningalku|avanu|avalku|paranju|parayoo|manassilaayi|manassilayilla|sheriyaa|sheriyalla|ende|ninte|avante|avalute|ithinu|athinu|pokaam|varaam|cheyyaam|venda|vendaa|vendathu|aanu|alla|undo|undo|enthu|evan|eval|ethu|evide|eppo|evideyaanu|ariyaamo|ariyilla|nandri|santhosham)\b/i;

// Hinglish detection is split into STRONG and GENERAL markers.
//
// STRONG markers are words that are unambiguously Hindi and NEVER valid English —
// a single one is enough to classify the message as Hinglish.
//
// GENERAL markers are broader Hindi vocabulary; because a few could theoretically
// appear as names/typos, we require at least TWO distinct general markers.
//
// CRITICAL: the previous single-list version matched plain-English words like
// "the", "sun", "log", "banana", "tab", "fir" — so any English sentence containing
// "the" was misdetected as Hinglish and answered in Hinglish. Those English-colliding
// words have been removed, and the two-tier threshold prevents one stray word from
// flipping an English message to Hinglish.
const RE_HINGLISH_STRONG = /\b(kya|kyaa|kyun|kyunki|kaise|kaisa|kaisi|kahan|kaun|hai|hain|nahi|nahin|nahiin|mujhe|mujhko|tumhe|tumko|aapko|chahiye|chahie|matlab|samajh|samjha|samjhaao|hoga|hogaa|hogi|milega|milegi|milenge|karna|karoge|karunga|karenge|kanoon|qanun|adalat|zamanat|zaroorat|vakil|rupaye|kripya|nahi_hai)\b/i;

// General Hinglish vocabulary (English-colliding words removed). Needs 2+ distinct hits.
const RE_HINGLISH_GENERAL = /\b(nai|aur|mein|toh|kab|kaha|kar|karo|raha|rahe|rahi|tha|thi|tum|yeh|ye|woh|wo|kuch|bahut|accha|theek|thik|abhi|phir|bhi|sirf|lekin|agar|isliye|pata|pataa|bata|bol|dekh|jao|aao|chalo|isko|usko|usse|isse|sahi|galat|ghar|kaam|raat|dost|pyaar|zindagi|paisa|rupee|dava|davaa|rehna|rehte|karte|karta|karti|jaata|jaati|aata|aati|dena|lena|rakhna|kholna|likhna|padhna|bolna|sunna|dekhna|samajhna|jab|koi|sabhi|dono|teeno|acchi|achha|bura|zyada|thoda|bahot|bilkul|zaroor|haan|naa)\b/gi;

// Positive English signal — common English words that are NOT in the Hindi sets.
// One hit means the user is writing English, so answer in English regardless of the
// UI selector ("respond in the language the user actually used").
const RE_ENGLISH = /\b(the|is|are|was|were|what|how|why|when|where|which|who|whom|can|could|should|would|will|shall|does|did|have|has|had|please|help|need|want|about|from|with|your|our|their|his|her|this|that|these|those|and|but|of|in|on|at|for|to|an|you|he|she|it|we|they|been|being|because|there|here|not|section|act|law|case|court|legal|rights|file|complaint|property|divorce|notice|contract|police)\b/i;

// ─── Main detector ──────────────────────────────────────────────────────────
/**
 * Detect the BCP-47 language code from user-typed (or spoken-then-transcribed) text.
 *
 * @param text      The raw input string.
 * @param fallback  What to return when nothing matches.  Usually the UI language selector value.
 */
export const detectLanguageFromText = (text: string, fallback = 'en-IN'): string => {
  if (!text?.trim()) return fallback;

  // ── Step 1: Unicode script detection (highest confidence) ─────────────────
  if (RE_DEVANAGARI.test(text)) {
    // Marathi ALSO uses Devanagari \u2014 disambiguate before assuming Hindi, otherwise
    // Marathi speakers get answered in Hindi (the exact "auto-switch to Hindi" bug).
    if (RE_MARATHI.test(text)) return 'mr-IN';
    // Mixed Devanagari+Latin = Hinglish; mostly Devanagari = Hindi
    const devCount  = (text.match(/[\u0900-\u097F]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g)        || []).length;
    return devCount >= latinCount * 0.3 ? 'hi-IN' : 'hinglish';
  }
  if (RE_TAMIL.test(text))     return 'ta-IN';
  if (RE_TELUGU.test(text))    return 'te-IN';
  if (RE_KANNADA.test(text))   return 'kn-IN';
  if (RE_MALAYALAM.test(text)) return 'ml-IN';
  if (RE_ASSAMESE.test(text))  return 'as-IN'; // Assamese-only letters ৰ/ৱ (check before Bengali)
  if (RE_BENGALI.test(text))   return 'bn-IN';
  if (RE_GUJARATI.test(text))  return 'gu-IN';
  if (RE_GURMUKHI.test(text))  return 'pa-IN';
  if (RE_ODIA.test(text))      return 'or-IN';

  // ── Step 2: Romanized regional scripts (pattern matching) ─────────────────
  // Check Tamil first — Tanglish has unique words not shared with Hindi/English
  if (RE_TANGLISH.test(text))       return 'ta-IN';
  if (RE_TELUGU_ROMAN.test(text))   return 'te-IN';
  if (RE_KANNADA_ROMAN.test(text))  return 'kn-IN';
  if (RE_MALAYALAM_ROMAN.test(text)) return 'ml-IN';
  if (RE_BENGALI_ROMAN.test(text))  return 'bn-IN';

  // ── Step 3: Hinglish (Hindi in Latin script) ───────────────────────────────
  // One STRONG (unambiguously Hindi) word, OR two distinct GENERAL words.
  // This runs BEFORE the English check so genuinely code-mixed Hinglish
  // ("mujhe bail chahiye for my case") is classified as Hinglish, not English.
  if (RE_HINGLISH_STRONG.test(text)) return 'hinglish';
  const generalHits = new Set((text.match(RE_HINGLISH_GENERAL) || []).map((w) => w.toLowerCase()));
  if (generalHits.size >= 2) return 'hinglish';

  // ── Step 4: Positive English detection ─────────────────────────────────────
  // If the message contains real English function/legal words and no Hindi
  // signal fired above, the user is writing English — answer in English even
  // if the UI selector is set to another language.
  if (RE_ENGLISH.test(text)) return 'en-IN';

  // ── Step 5: Fall back to user's selected language ─────────────────────────
  return fallback;
};

/**
 * Convenience: resolves the detected language for a typed message.
 * Combines the typed-text detection with the user's UI language preference
 * so that explicit language selections still win when no pattern matches.
 *
 * If the user explicitly chose a non-English language AND we can't auto-detect
 * something more specific, we respect their choice.
 */
export const resolveMessageLanguage = (
  message: string,
  selectedLanguage: string,
): string => {
  const detected = detectLanguageFromText(message, selectedLanguage);

  // If auto-detection found something specific, always use it
  if (detected !== selectedLanguage) return detected;

  // Otherwise respect the user's explicit selection
  return selectedLanguage;
};
