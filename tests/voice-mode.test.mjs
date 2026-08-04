/**
 * Voice send-mode tests (Auto vs Manual).
 *
 * Run: npm run test:voice
 *
 * Verifies the transcript-routing decision and the localStorage persistence of
 * the user's chosen mode. No framework needed — esbuild transpiles the util and
 * a tiny localStorage stub backs the persistence checks.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

// Minimal localStorage + window stub so the util's persistence path runs.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
};

const out = join(mkdtempSync(join(tmpdir(), 'voice-')), 'voiceMode.mjs');
await build({ entryPoints: ['src/lib/voiceMode.ts'], outfile: out, format: 'esm', bundle: true, logLevel: 'error' });
const { getVoiceSendMode, setVoiceSendMode, resolveVoiceTranscript } = await import(pathToFileURL(out).href);

let passed = 0, failed = 0;
const check = (name, fn) => {
  try { fn(); console.log(`PASS  ${name}`); passed++; }
  catch (e) { console.log(`FAIL  ${name}\n      ${e.message}`); failed++; }
};

// --- transcript routing ---
check('auto + text -> send', () =>
  assert.deepEqual(resolveVoiceTranscript('auto', 'my argument'), { action: 'send', text: 'my argument' }));
check('manual + text -> stage (review before send)', () =>
  assert.deepEqual(resolveVoiceTranscript('manual', 'my argument'), { action: 'stage', text: 'my argument' }));
check('auto + whitespace-only -> stage (never send empty)', () =>
  assert.deepEqual(resolveVoiceTranscript('auto', '   '), { action: 'stage', text: '' }));
check('manual + empty -> stage', () =>
  assert.deepEqual(resolveVoiceTranscript('manual', ''), { action: 'stage', text: '' }));
check('text is trimmed', () =>
  assert.equal(resolveVoiceTranscript('auto', '  hi  ').text, 'hi'));

// --- persistence ---
check('default mode is auto (nothing stored)', () => {
  store.clear();
  assert.equal(getVoiceSendMode(), 'auto');
});
check('setVoiceSendMode(manual) persists and is read back', () => {
  setVoiceSendMode('manual');
  assert.equal(store.get('legalcare-voice-send-mode'), 'manual');
  assert.equal(getVoiceSendMode(), 'manual');
});
check('switching back to auto persists', () => {
  setVoiceSendMode('auto');
  assert.equal(getVoiceSendMode(), 'auto');
});
check('unknown stored value falls back to auto', () => {
  store.set('legalcare-voice-send-mode', 'garbage');
  assert.equal(getVoiceSendMode(), 'auto');
});

console.log(`\n=== ${passed}/${passed + failed} passed ===`);
process.exit(failed ? 1 : 0);
