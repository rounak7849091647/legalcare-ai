// State-law FULL-TEXT RAG (Tier 2) — DISK-BASED. Vectors + section text live in a
// sqlite-vec database on disk (state-fulltext.db); we search it per query and read
// only the winning rows. This keeps server RAM low, so the full 36-state corpus can
// scale without loading gigabytes into memory. Native text from India Code PDFs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { ensureIndexFile } from './s3Index.js';
import { ensureDbFts, rrfMerge, detectStates } from './hybrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DB = null;
let vecStmt = null;   // nearest-neighbour rowids + distance
let metaStmt = null;  // fetch a row by rowid
let FTS = null;       // keyword (BM25) search over the same DB

export async function loadStateFullTextIndex() {
  try {
    const p = await ensureIndexFile('state-fulltext.db');
    if (!fs.existsSync(p)) { console.warn('[rag] state full-text DB not present'); DB = null; return; }
    const Database = (await import('better-sqlite3')).default;
    const sqliteVec = await import('sqlite-vec');
    // Read-write so we can build the FTS keyword index into the (disposable) local copy.
    DB = new Database(p, { fileMustExist: true });
    sqliteVec.load(DB);
    DB.pragma('cache_size = -40000'); // ~40 MB page cache
    DB.pragma('mmap_size = 268435456'); // 256 MB mmap window
    FTS = ensureDbFts(DB, { table: 'meta', cols: ['title', 'text'] });
    vecStmt = DB.prepare('select rowid, distance from vec where embedding match ? and k = ? order by distance');
    metaStmt = DB.prepare('select state, title, act_no, year, text from meta where rowid = ?');
    const { c } = DB.prepare('select count(*) c from meta').get();
    const states = DB.prepare('select count(distinct state) c from meta').get().c;
    console.log(`[rag] state full-text DB loaded (disk, hybrid): ${c} chunks, ${states} states`);
  } catch (e) {
    console.warn('[rag] state full-text DB unavailable:', e.message);
    DB = null;
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

// Hybrid retrieval: vec0 cosine (distance, 0=identical) fused with BM25 keyword
// (matches state names, act titles, section numbers literally). A kept chunk needs
// distance <= maxDistance OR to be a keyword hit. Vector outranks keyword.
export async function retrieveStateFullText(query, { k = 3, maxDistance = 0.62 } = {}) {
  if (!DB || !vecStmt || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const qbuf = Buffer.from(new Float32Array(qvec).buffer);
    const vrows = vecStmt.all(qbuf, 15); // {rowid, distance} nearest first
    const distMap = new Map(vrows.map(r => [r.rowid, r.distance]));
    const vIds = vrows.map(r => r.rowid);
    const kIds = FTS ? FTS.search(query, 15) : [];
    const kSet = new Set(kIds);
    const fused = rrfMerge([vIds, kIds], k * 2, 60, [2, 1]);
    let cand = fused.filter(id => (distMap.has(id) && distMap.get(id) <= maxDistance) || kSet.has(id));
    // If the query names a state, surface that state's chunks first.
    const qStates = detectStates(query);
    if (qStates.length) {
      const rows = cand.map(id => ({ id, h: metaStmt.get(id) }));
      const match = rows.filter(r => qStates.includes((r.h.state || '').toLowerCase()));
      const rest = rows.filter(r => !qStates.includes((r.h.state || '').toLowerCase()));
      cand = [...match, ...rest].map(r => r.id);
    }
    const keep = cand.slice(0, k);
    if (!keep.length) return '';
    return keep
      .map(id => { const h = metaStmt.get(id); return `[${h.title}${h.year ? `, ${h.year}` : ''} — ${h.state}]\n${h.text}`; })
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] state full-text retrieval failed:', e.message);
    return '';
  }
}

export function stateFullTextIndexReady() { return !!DB; }
