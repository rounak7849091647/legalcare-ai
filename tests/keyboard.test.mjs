/**
 * Chat composer keyboard-shortcut tests.
 *
 * Run: npm run test:keyboard   (or npm test)
 *
 * Verifies the Enter-to-send / Shift+Enter-newline decision, including the
 * multilingual IME guard (Enter must NOT send while composing Hindi/Tamil/CJK).
 * No test framework needed — esbuild (already a dependency) transpiles the pure
 * helper and Node's assert runs the checks.
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const out = join(mkdtempSync(join(tmpdir(), 'kbd-')), 'keyboard.mjs');
await build({ entryPoints: ['src/lib/keyboard.ts'], outfile: out, format: 'esm', bundle: true, logLevel: 'error' });
const { shouldSubmitOnEnter } = await import(pathToFileURL(out).href);

let passed = 0, failed = 0;
const check = (name, fn) => {
  try { fn(); console.log(`PASS  ${name}`); passed++; }
  catch (e) { console.log(`FAIL  ${name}\n      ${e.message}`); failed++; }
};

// Enter -> send
check('plain Enter sends', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false }), true));

// Shift+Enter -> newline (don't send)
check('Shift+Enter does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Enter', shiftKey: true }), false));

// IME composing -> don't send (multilingual: Hindi/Tamil/CJK candidate confirm)
check('Enter while IME composing does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false, isComposing: true }), false));
check('Enter with legacy keyCode 229 (IME) does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Enter', shiftKey: false, keyCode: 229 }), false));

// Other keys never submit
check('a letter key does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'a', shiftKey: false }), false));
check('Tab does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Tab', shiftKey: false }), false));

// Shift+Enter also ignored while composing (both guards)
check('Shift+Enter while composing does not send', () =>
  assert.equal(shouldSubmitOnEnter({ key: 'Enter', shiftKey: true, isComposing: true }), false));

console.log(`\n=== ${passed}/${passed + failed} passed ===`);
process.exit(failed ? 1 : 0);
