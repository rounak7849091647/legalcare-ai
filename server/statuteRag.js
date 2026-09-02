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
import { buildMemoryFts, rrfMerge, STATES, detectStates } from './hybrid.js';
import { embedQuery as localEmbedQuery } from './localEmbed.js';
import { candidatePaths } from './s3Index.js';

const EMBED_DIMS = 384; // multilingual-e5-small; indexes at other dims are skipped

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let INDEX = null; // { dims, count, meta:[], vectors:Float32Array }
let FTS = null;   // keyword index (BM25) for hybrid retrieval

export function loadStatuteIndex() {
  try {
    // Search RAG_DATA_DIRS (external disk) first, then the bundled data dir.
    const p = candidatePaths('statute-rag-index.json').find(c => fs.existsSync(c))
      || path.join(__dirname, 'data', 'statute-rag-index.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw.dims !== EMBED_DIMS) {
      console.warn(`[rag] statute index skipped: ${raw.dims}d != ${EMBED_DIMS}d (awaiting re-embed)`);
      INDEX = null; FTS = null; return;
    }
    const buf = Buffer.from(raw.vectors_b64, 'base64');
    const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    INDEX = { dims: raw.dims, count: raw.count, meta: raw.meta, vectors };
    FTS = buildMemoryFts(raw.meta, m => `${m.act} ${m.section} ${m.heading} ${m.text}`);
    console.log(`[rag] statute index loaded: ${raw.count} sections (${raw.dims}d) + keyword index`);
  } catch (e) {
    console.warn('[rag] statute index unavailable:', e.message);
    INDEX = null;
  }
}

async function embedQuery(text) { return localEmbedQuery(text); }

// Vector scores for the top-n sections: returns [{ d, score }] sorted best-first,
// plus a Map d->score for the ones returned.
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

// Hybrid retrieval: fuse vector (semantic) and keyword (BM25) results via RRF, so
// section numbers, act names and exact legal terms match literally while meaning
// still matters. A kept hit must be at least weakly semantic (cosine >= floor) OR
// a keyword hit, so off-topic queries still return ''. Never throws.
export async function retrieveStatuteContext(query, { k = 6, floor = 0.24 } = {}) {
  if (!INDEX || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    const vec = qvec ? cosineTopIds(qvec, 15) : []; // null qvec -> keyword-only
    const vIds = vec.map(v => v.d);
    const scoreMap = new Map(vec.map(v => [v.d, v.score]));
    const kIds = FTS ? FTS.search(query, 15) : [];
    const kSet = new Set(kIds);
    let fused = rrfMerge([vIds, kIds], k * 2, 60, [2, 1]); // vector outranks keyword
    // Building bye-laws / development-control regulations are broad municipal text
    // that hijacks non-building queries ("shops", "working hours"). Gate them out
    // unless the question is actually about construction/building.
    const meta0 = INDEX.meta;
    const isBuildingQ = /build|setback|\bfsi\b|floor area|\bfar\b|construction|plinth|parking|storey|storey|\bheight\b|balcony|basement|coverage|bye-?law|far\b/i.test(query);
    if (!isBuildingQ) {
      fused = fused.filter(d => !/BUILDING BYE-LAWS|DEVELOPMENT CONTROL|\bDCPR\b|BUILDING RULES|MODEL BUILDING/i.test(meta0[d].act));
    }
    // State routing: if the query names a state, drop acts named after a DIFFERENT
    // state (e.g. "Delhi Land Holdings Act" for a Tamil Nadu question).
    const qStates = detectStates(query);
    if (qStates.length) {
      fused = fused.filter(d => {
        const act = meta0[d].act.toLowerCase();
        return !STATES.some(s => { const sl = s.toLowerCase(); return act.includes(sl) && !qStates.includes(sl); });
      });
    }
    const keep = fused.filter(d => (scoreMap.get(d) ?? 0) >= floor || kSet.has(d)).slice(0, k);
    if (!keep.length) return '';
    const meta = INDEX.meta;
    return keep
      .map(d => {
        const m = meta[d];
        const cite = m.section ? `${m.act} — ${m.section}` : m.act;
        const head = m.heading ? ` ${m.heading}` : '';
        return `[${cite}]${head}\n${m.text}`;
      })
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] retrieval failed:', e.message);
    return '';
  }
}

export function statuteIndexReady() { return !!INDEX; }
