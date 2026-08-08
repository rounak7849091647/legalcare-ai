// State-law FULL-TEXT RAG (Tier 2) — retrieval over the actual section text of
// state acts, extracted from the official India Code PDFs (no OCR; native text).
// Currently seeded with a first state (Maharashtra) as an in-memory proof; the
// full 36-state corpus (~3.7 GB) needs a dedicated vector DB / larger host.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let INDEX = null;

export function loadStateFullTextIndex() {
  try {
    const p = path.join(__dirname, 'data', 'state-fulltext-index.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const buf = Buffer.from(raw.vectors_b64, 'base64');
    const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    INDEX = { dims: raw.dims, count: raw.count, meta: raw.meta, vectors };
    const states = [...new Set(raw.meta.map(m => m.state))];
    console.log(`[rag] state full-text index loaded: ${raw.count} chunks (${states.join(', ')})`);
  } catch (e) {
    console.warn('[rag] state full-text index unavailable:', e.message);
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

// Returns real section text of the most relevant state-act passages, or ''.
export async function retrieveStateFullText(query, { k = 3, minScore = 0.42 } = {}) {
  if (!INDEX || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const hits = cosineTopK(qvec, k).filter(h => h.score >= minScore);
    if (!hits.length) return '';
    return hits
      .map(h => `[${h.title}${h.year ? `, ${h.year}` : ''} — ${h.state}]\n${h.text}`)
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] state full-text retrieval failed:', e.message);
    return '';
  }
}

export function stateFullTextIndexReady() { return !!INDEX; }
