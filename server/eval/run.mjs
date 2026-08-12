// Eval harness: run each test question through OUR deployed system and RAW Grok,
// score both (keyword match + LLM judge), and report where Grok still beats us.
// Usage: node eval/run.mjs [limit]
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = 'https://api.legalcareai.com/functions/v1/legal-chat';
const grok = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });
const GROK_MODEL = process.env.GROK_MODEL || 'grok-4-fast-non-reasoning';
const judge = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'testset.json'), 'utf8'));
const limit = parseInt(process.argv[2] || '999', 10);

async function ourSystem(q) {
  const r = await fetch(PROD, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: q, stream: false }),
  });
  const j = await r.json();
  const srcs = (j.sources || []).map(s => s.label).join(' | ');
  return { answer: j.response || '', sources: srcs };
}
async function rawGrok(q) {
  const r = await grok.chat.completions.create({
    model: GROK_MODEL, temperature: 0.2, max_tokens: 350,
    messages: [{ role: 'user', content: q + ' Answer briefly with the exact act and section.' }],
  });
  return r.choices[0].message.content || '';
}
function kwScore(text, expect) {
  const t = (text || '').toLowerCase();
  const hit = expect.filter(k => t.includes(k.toLowerCase()));
  return { hit: hit.length, total: expect.length, pass: hit.length >= Math.ceil(expect.length / 2) };
}
async function llmJudge(q, expect, ours, grokAns) {
  try {
    const r = await judge.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0,
      messages: [{
        role: 'user',
        content: `You are grading two answers to an Indian-law question for ACCURACY and whether they cite the correct provision. The correct answer should involve: ${expect.join(', ')}.\n\nQUESTION: ${q}\n\nANSWER A (our system):\n${ours.slice(0, 900)}\n\nANSWER B (baseline):\n${grokAns.slice(0, 900)}\n\nReply with ONLY one JSON object: {"winner":"A"|"B"|"TIE","a_hallucinated":true|false,"b_hallucinated":true|false} where hallucinated means it stated a wrong/invented section or act.`,
      }],
    });
    const m = r.choices[0].message.content.match(/\{[^}]+\}/);
    return m ? JSON.parse(m[0]) : { winner: 'TIE', a_hallucinated: false, b_hallucinated: false };
  } catch { return { winner: 'TIE', a_hallucinated: false, b_hallucinated: false }; }
}

const results = [];
for (const t of tests.slice(0, limit)) {
  try {
    const [ours, grokAns] = await Promise.all([ourSystem(t.q), rawGrok(t.q)]);
    const ourKw = kwScore(ours.answer + ' ' + ours.sources, t.expect);
    const grokKw = kwScore(grokAns, t.expect);
    const jd = await llmJudge(t.q, t.expect, ours.answer, grokAns);
    results.push({ ...t, ourKw, grokKw, judge: jd, ourSources: ours.sources });
    process.stdout.write(`  ${t.id} [${t.domain}] ours ${ourKw.hit}/${ourKw.total} grok ${grokKw.hit}/${grokKw.total} judge:${jd.winner}${jd.a_hallucinated ? ' A!' : ''}${jd.b_hallucinated ? ' B-halluc' : ''}\n`);
  } catch (e) { console.log(`  ${t.id}: ERROR ${e.message}`); }
}

// ---- report ----
const n = results.length;
const ourPass = results.filter(r => r.ourKw.pass).length;
const grokPass = results.filter(r => r.grokKw.pass).length;
const win = results.filter(r => r.judge.winner === 'A').length;
const loss = results.filter(r => r.judge.winner === 'B').length;
const tie = results.filter(r => r.judge.winner === 'TIE').length;
const ourHalluc = results.filter(r => r.judge.a_hallucinated).length;
const grokHalluc = results.filter(r => r.judge.b_hallucinated).length;
console.log('\n════════ EVAL REPORT ════════');
console.log(`questions: ${n}`);
console.log(`keyword pass — OURS: ${ourPass}/${n} (${(ourPass/n*100).toFixed(0)}%)  |  GROK: ${grokPass}/${n} (${(grokPass/n*100).toFixed(0)}%)`);
console.log(`LLM judge — OURS win: ${win} | GROK win: ${loss} | tie: ${tie}`);
console.log(`hallucination — OURS: ${ourHalluc} | GROK: ${grokHalluc}`);
console.log('\n--- LOSSES (Grok beat us — fix these) ---');
for (const r of results.filter(r => r.judge.winner === 'B')) {
  console.log(`  [${r.id}] ${r.q}\n     expected: ${r.expect.join(', ')} | our sources: ${(r.ourSources || '(none)').slice(0, 90)}`);
}
console.log('\n--- OUR HALLUCINATIONS (highest priority) ---');
for (const r of results.filter(r => r.judge.a_hallucinated)) console.log(`  [${r.id}] ${r.q}`);
fs.writeFileSync(path.join(__dirname, 'last-report.json'), JSON.stringify(results, null, 2));
console.log('\nfull results -> eval/last-report.json');
