// State-law RAG (Tier A) — retrieval over a bundled index of Indian STATE/UT act
// METADATA (state, short title, act number, year) for all 36 states/UTs, scraped
// from the official India Code repository. This lets the model identify and cite
// the correct STATE act by name — it does NOT contain the full section text of
// state acts (those are PDFs; full-text state law needs a real vector DB).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { buildMemoryFts, rrfMerge } from './hybrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let INDEX = null; // { dims, count, meta:[], vectors:Float32Array }
let FTS = null;

export function loadStateLawIndex() {
  try {
    const p = path.join(__dirname, 'data', 'state-law-index.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const buf = Buffer.from(raw.vectors_b64, 'base64');
    const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    INDEX = { dims: raw.dims, count: raw.count, meta: raw.meta, vectors };
    FTS = buildMemoryFts(raw.meta, m => `${m.state || ''} ${m.title || ''}`);
    console.log(`[rag] state-law index loaded: ${raw.count} state acts (${raw.dims}d) + keyword index`);
  } catch (e) {
    console.warn('[rag] state-law index unavailable:', e.message);
    INDEX = null;
  }
}

let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) return null;
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

async function embedQuery(text) {
  const openai = getOpenAI();
  if (!openai) return null;
  const r = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 2000),
    dimensions: 512,
  });
  return r.data[0].embedding;
}

function cosineTopIds(qvec, n) {
  const { dims, count, vectors } = INDEX;
  let qn = 0;
  for (let i = 0; i < dims; i++) qn += qvec[i] * qvec[i];
  qn = Math.sqrt(qn) || 1;
  const scores = new Array(count);
  for (let d = 0; d < count; d++) {
    const off = d * dims;
    let dot = 0, vn = 0;
    for (let i = 0; i < dims; i++) { const v = vectors[off + i]; dot += qvec[i] * v; vn += v * v; }
    scores[d] = [dot / ((Math.sqrt(vn) || 1) * qn), d];
  }
  scores.sort((a, b) => b[0] - a[0]);
  return scores.slice(0, n).map(([s, d]) => ({ d, score: s }));
}

// Hybrid retrieval over STATE act titles. Keyword matching is especially valuable
// here (state names + act titles are the whole payload), so it routes "Maharashtra
// rent" to the right act. Vector outranks keyword; a hit needs cosine >= floor OR
// to be a keyword hit.
export async function retrieveStateLawContext(query, { k = 4, floor = 0.28 } = {}) {
  if (!INDEX || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const vec = cosineTopIds(qvec, 12);
    const vIds = vec.map(v => v.d);
    const scoreMap = new Map(vec.map(v => [v.d, v.score]));
    const kIds = FTS ? FTS.search(query, 10) : [];
    const kSet = new Set(kIds);
    const fused = rrfMerge([vIds, kIds], k * 2, 60, [2, 1]);
    const keep = fused.filter(d => (scoreMap.get(d) ?? 0) >= floor || kSet.has(d)).slice(0, k);
    if (!keep.length) return '';
    const meta = INDEX.meta;
    return keep
      .map(d => {
        const h = meta[d];
        const showYear = h.year && !h.title.includes(h.year);
        return `${h.title}${showYear ? `, ${h.year}` : ''} — ${h.state}${h.act_no ? ` (Act No. ${h.act_no})` : ''}`;
      })
      .join('\n');
  } catch (e) {
    console.warn('[rag] state-law retrieval failed:', e.message);
    return '';
  }
}

export function stateLawIndexReady() { return !!INDEX; }
