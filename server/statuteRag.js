// Statute RAG — retrieval over a bundled index of CURRENT Indian bare-act sections.
// The index (server/data/statute-rag-index.json) holds section text + 512-dim
// OpenAI embeddings. On a user query we embed the query, find the closest sections
// by cosine similarity, and return them so the LLM can ground its answer in the
// actual statute text (with correct section numbers) instead of memory alone.
//
// Phase 1 = statutes only (bundled, no external DB). Judgment RAG (millions of
// docs) needs a real vector DB and is intentionally NOT loaded here.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let INDEX = null; // { dims, count, meta:[], vectors:Float32Array }

export function loadStatuteIndex() {
  try {
    const p = path.join(__dirname, 'data', 'statute-rag-index.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const buf = Buffer.from(raw.vectors_b64, 'base64');
    const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    INDEX = { dims: raw.dims, count: raw.count, meta: raw.meta, vectors };
    console.log(`[rag] statute index loaded: ${raw.count} sections (${raw.dims}d)`);
  } catch (e) {
    console.warn('[rag] statute index unavailable:', e.message);
    INDEX = null;
  }
}

// Lazy — env (OPENAI_API_KEY) is loaded by dotenv AFTER this module is imported,
// so we must not read it at module-load time.
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

// Returns a formatted context block of the most relevant CURRENT statute sections,
// or '' when nothing is confidently relevant. Never throws — chat must not break.
export async function retrieveStatuteContext(query, { k = 4, minScore = 0.32 } = {}) {
  if (!INDEX || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const hits = cosineTopK(qvec, k).filter(h => h.score >= minScore);
    if (!hits.length) return '';
    return hits
      .map(h => `[${h.act} — ${h.section}] ${h.heading}\n${h.text}`)
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] retrieval failed:', e.message);
    return '';
  }
}

export function statuteIndexReady() { return !!INDEX; }
