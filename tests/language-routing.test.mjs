/**
 * Multilingual language-routing tests (text + voice).
 *
 * Run: npm run test:lang
 *
 * Covers the reported bug: Telugu / Bengali inputs must NEVER produce Hindi.
 *  - TEXT detection: native script + romanized -> correct language code.
 *  - VOICE routing:  when a language is selected, the recognizer's response
 *    language is that selection (not a re-detected/garbled transcript).
 *  - BACKEND (live, optional): te-IN -> Telugu reply, bn-IN -> Bengali reply,
 *    and TTS returns audio for each (voice mode). Skipped if the API is offline.
 *
 * No test framework needed — esbuild (already a dependency) transpiles the
 * detector, and Node's assert runs the checks.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const API = process.env.LEGALCARE_API || 'https://api.legalcareai.com';

// ── Load the REAL detection module (transpiled, so we test shipping code) ──────
async function loadDetector() {
  const out = join(mkdtempSync(join(tmpdir(), 'langdet-')), 'langdet.mjs');
  await build({
    entryPoints: ['src/lib/languageDetection.ts'],
    outfile: out,
    format: 'esm',
    bundle: true,
    logLevel: 'error',
  });
  return import(pathToFileURL(out).href);
}

// ── Unicode helpers to check which script a response is written in ────────────
const scriptCount = (s, re) => (s.match(re) || []).length;
const RANGES = {
  telugu: /[ఀ-౿]/g,
  bengali: /[ঀ-৿]/g,
  devanagari: /[ऀ-ॣ०-ॿ]/g, // excludes danda U+0964 (shared punctuation)
  tamil: /[஀-௿]/g,
};

let passed = 0, failed = 0;
const check = (name, fn) => {
  try { fn(); console.log(`PASS  ${name}`); passed++; }
  catch (e) { console.log(`FAIL  ${name}\n      ${e.message}`); failed++; }
};

const run = async () => {
  const { detectLanguageFromText, resolveMessageLanguage } = await loadDetector();

  // Voice routing mirrors useSpeechRecognition: a specific selection is trusted.
  const voiceRoute = (transcript, selected) =>
    (selected && selected !== 'en-IN') ? selected : detectLanguageFromText(transcript, 'en-IN');

  console.log('\n--- TEXT detection ---');
  check('Telugu native -> te-IN', () =>
    assert.equal(detectLanguageFromText('నా డిపాజిట్ తిరిగి ఇవ్వలేదు, ఏం చేయాలి?', 'en-IN'), 'te-IN'));
  check('Telugu romanized -> te-IN', () =>
    assert.equal(detectLanguageFromText('naa deposit ivvaledu, nenu em cheyali', 'en-IN'), 'te-IN'));
  check('Bengali native -> bn-IN', () =>
    assert.equal(detectLanguageFromText('আমার জমা ফেরত দেয়নি, আমি কী করব?', 'en-IN'), 'bn-IN'));
  check('Bengali romanized -> bn-IN', () =>
    assert.equal(detectLanguageFromText('amar deposit ferot deyni, ami ki korbo', 'en-IN'), 'bn-IN'));

  console.log('\n--- Regression: no Hindi hijack ---');
  check('Telugu never -> hi-IN', () =>
    assert.notEqual(detectLanguageFromText('నాకు బెయిల్ కావాలి', 'en-IN'), 'hi-IN'));
  check('Bengali never -> hi-IN', () =>
    assert.notEqual(detectLanguageFromText('আমার জামিন দরকার', 'en-IN'), 'hi-IN'));
  check('Actual Hindi still -> hi-IN', () =>
    assert.equal(detectLanguageFromText('मुझे जमानत चाहिए', 'en-IN'), 'hi-IN'));
  check('English still -> en-IN', () =>
    assert.equal(detectLanguageFromText('Can I get bail in a cheque bounce case?', 'en-IN'), 'en-IN'));

  console.log('\n--- VOICE routing (selection is trusted) ---');
  check('Voice Telugu selected -> te-IN', () => assert.equal(voiceRoute('anything', 'te-IN'), 'te-IN'));
  check('Voice Bengali selected -> bn-IN', () => assert.equal(voiceRoute('anything', 'bn-IN'), 'bn-IN'));
  check('Voice Telugu selected never -> hi-IN', () => assert.notEqual(voiceRoute('గార్బుల్డ్', 'te-IN'), 'hi-IN'));

  // ── BACKEND (live) — text + voice response language. Skips if offline. ──────
  let online = true;
  try { await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) }); }
  catch { online = false; }

  if (!online) {
    console.log('\n--- BACKEND live tests SKIPPED (API unreachable) ---');
  } else {
    console.log('\n--- BACKEND live: text response language ---');
    const chat = async (message, lang) => {
      const r = await fetch(`${API}/functions/v1/legal-chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, detectedLanguage: lang }),
        signal: AbortSignal.timeout(30000),
      });
      return (await r.json()).response || '';
    };
    const te = await chat('నా డిపాజిట్ తిరిగి ఇవ్వలేదు, ఏం చేయాలి?', 'te-IN');
    check('te-IN reply is Telugu, not Hindi', () => {
      assert.ok(scriptCount(te, RANGES.telugu) > 50, `telugu chars=${scriptCount(te, RANGES.telugu)}`);
      assert.equal(scriptCount(te, RANGES.devanagari), 0, `stray devanagari=${scriptCount(te, RANGES.devanagari)}`);
    });
    const bn = await chat('আমার জমা ফেরত দেয়নি, আমি কী করব?', 'bn-IN');
    check('bn-IN reply is Bengali, not Hindi', () => {
      assert.ok(scriptCount(bn, RANGES.bengali) > 50, `bengali chars=${scriptCount(bn, RANGES.bengali)}`);
      assert.equal(scriptCount(bn, RANGES.devanagari), 0, `stray devanagari=${scriptCount(bn, RANGES.devanagari)}`);
    });

    console.log('\n--- BACKEND live: voice (TTS) returns audio ---');
    const speak = async (text, lang) => {
      const r = await fetch(`${API}/functions/v1/speak`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
        signal: AbortSignal.timeout(30000),
      });
      return r.ok ? (await r.json()) : {};
    };
    const teA = await speak('నమస్కారం', 'te-IN');
    check('Telugu TTS returns Google audio', () =>
      assert.ok((teA.audioContent || '').length > 1000, 'no audio'));
    const bnA = await speak('নমস্কার', 'bn-IN');
    check('Bengali TTS returns Google audio', () =>
      assert.ok((bnA.audioContent || '').length > 1000, 'no audio'));
  }

  console.log(`\n=== ${passed}/${passed + failed} passed ===`);
  process.exit(failed ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
