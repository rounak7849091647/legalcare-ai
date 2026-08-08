// Judgment RAG — Phase 2. Retrieval over a bundled index of Supreme Court of India
// judgment metadata (title + the legal issue + citation) across ALL years
// (1950–present), so the model can cite REAL precedents with proper citations
// instead of inventing them. Built from the CC-BY "indian-supreme-court-judgments"
// AWS Open Data set.
//
// This is a bounded in-memory index (SC metadata only). Full-scale judgment RAG
// (all High Courts, full judgment text, millions of docs) needs a real vector DB
// and is intentionally NOT loaded here.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let INDEX = null; // { dims, count, meta:[], vectors:Float32Array }

export function loadJudgmentIndex() {
  try {
    const p = path.join(__dirname, 'data', 'judgment-rag-index.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const buf = Buffer.from(raw.vectors_b64, 'base64');
    const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    INDEX = { dims: raw.dims, count: raw.count, meta: raw.meta, vectors };
    console.log(`[rag] judgment index loaded: ${raw.count} SC judgments (${raw.dims}d)`);
  } catch (e) {
    console.warn('[rag] judgment index unavailable:', e.message);
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

function cosineTopK(qvec, k) {
  const { dims, count, vectors, meta } = INDEX;
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
  return scores.slice(0, k).map(([s, d]) => ({ score: s, ...meta[d] }));
}

// Returns a formatted block of the most relevant REAL SC precedents, or '' if none.
// Higher default threshold than statutes — a case is only cited when clearly on-point.
export async function retrieveJudgmentContext(query, { k = 3, minScore = 0.35 } = {}) {
  if (!INDEX || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const hits = cosineTopK(qvec, k).filter(h => h.score >= minScore);
    if (!hits.length) return '';
    return hits
      .map(h => `${h.title}${h.citation ? ` [${h.citation}]` : ''}${h.date ? ` (${h.date})` : ''}\n${h.text}`)
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] judgment retrieval failed:', e.message);
    return '';
  }
}

export function judgmentIndexReady() { return !!INDEX; }
