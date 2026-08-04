/**
 * Cross-language contamination test (live backend).
 *
 * Run: npm run test:purity
 *
 * For every supported Indian language, sends the same legal question in that
 * language and asserts the reply is written in the CORRECT script with no
 * foreign-script contamination — the core "never mix Bengali with Assamese,
 * Telugu with Hindi, Punjabi with Hindi" requirement.
 *
 * Skips gracefully if the API is unreachable.
 */
import assert from 'node:assert';

const API = process.env.LEGALCARE_API || 'https://api.legalcareai.com';

// Script ranges. Danda U+0964/U+0965 are SHARED punctuation across Indic scripts,
// so they're excluded from the Devanagari range to avoid false positives.
const DEVANAGARI = /[ऀ-ॣ०-ॿ]/g; // excl. । ॥
const BENGALI    = /[ঀ-৿]/g;
const ASSAMESE_ONLY = /[ৰৱ]/g;            // ৰ ৱ (not used in standard Bengali)
const GURMUKHI   = /[਀-੿]/g;
const GUJARATI   = /[઀-૿]/g;
const ODIA       = /[଀-୿]/g;
const TAMIL      = /[஀-௿]/g;
const TELUGU     = /[ఀ-౿]/g;
const KANNADA    = /[ಀ-೿]/g;
const MALAYALAM  = /[ഀ-ൿ]/g;
const n = (s, re) => (s.match(re) || []).length;

// [code, own-script regex, question in that language, forbidden-script checks]
const LANGS = [
  ['hi-IN', DEVANAGARI, 'मेरे कानूनी अधिकार क्या हैं?', [['Bengali', BENGALI], ['Telugu', TELUGU]]],
  ['bn-IN', BENGALI, 'আমার আইনি অধিকার কী?', [['Devanagari/Hindi', DEVANAGARI], ['Assamese-only ৰৱ', ASSAMESE_ONLY]]],
  ['as-IN', BENGALI, 'মোৰ আইনী অধিকাৰ কি?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['ta-IN', TAMIL, 'எனது சட்ட உரிமைகள் என்ன?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['te-IN', TELUGU, 'నా చట్టపరమైన హక్కులు ఏమిటి?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['mr-IN', DEVANAGARI, 'माझे कायदेशीर हक्क काय आहेत?', [['Bengali', BENGALI], ['Telugu', TELUGU]]],
  ['gu-IN', GUJARATI, 'મારા કાનૂની અધિકારો શું છે?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['kn-IN', KANNADA, 'ನನ್ನ ಕಾನೂನು ಹಕ್ಕುಗಳು ಏನು?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['ml-IN', MALAYALAM, 'എന്റെ നിയമപരമായ അവകാശങ്ങൾ എന്ത്?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['pa-IN', GURMUKHI, 'ਮੇਰੇ ਕਾਨੂੰਨੀ ਹੱਕ ਕੀ ਹਨ?', [['Devanagari/Hindi', DEVANAGARI]]],
  ['or-IN', ODIA, 'ମୋର ଆଇନଗତ ଅଧିକାର କଣ?', [['Devanagari/Hindi', DEVANAGARI], ['Bengali', BENGALI]]],
];

const chat = async (message, lang) => {
  const r = await fetch(`${API}/functions/v1/legal-chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, detectedLanguage: lang }),
    signal: AbortSignal.timeout(40000),
  });
  return (await r.json()).response || '';
};

const run = async () => {
  try { await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) }); }
  catch { console.log('SKIP: API unreachable'); process.exit(0); }

  let passed = 0, failed = 0;
  for (const [code, own, q, forbidden] of LANGS) {
    let resp = '';
    try { resp = await chat(q, code); } catch (e) { console.log(`FAIL  ${code}  request error: ${e.message}`); failed++; continue; }
    const ownCount = n(resp, own);
    const bad = forbidden.filter(([, re]) => n(resp, re) > 0).map(([name, re]) => `${name}=${n(resp, re)}`);
    const ok = ownCount > 40 && bad.length === 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${code}  own=${ownCount}${bad.length ? '  CONTAMINATION: ' + bad.join(', ') : ''}`);
    if (ok) passed++; else { failed++; if (bad.length) console.log(`      sample: ${resp.slice(0, 80)}`); }
  }
  console.log(`\n=== ${passed}/${passed + failed} languages clean ===`);
  process.exit(failed ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
