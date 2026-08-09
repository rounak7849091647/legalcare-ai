// State-law FULL-TEXT RAG (Tier 2) — DISK-BASED. Vectors + section text live in a
// sqlite-vec database on disk (state-fulltext.db); we search it per query and read
// only the winning rows. This keeps server RAM low, so the full 36-state corpus can
// scale without loading gigabytes into memory. Native text from India Code PDFs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { ensureIndexFile } from './s3Index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DB = null;
let searchStmt = null;

export async function loadStateFullTextIndex() {
  try {
    const p = await ensureIndexFile('state-fulltext.db');
    if (!fs.existsSync(p)) { console.warn('[rag] state full-text DB not present'); DB = null; return; }
    const Database = (await import('better-sqlite3')).default;
    const sqliteVec = await import('sqlite-vec');
    DB = new Database(p, { readonly: true, fileMustExist: true });
    sqliteVec.load(DB);
    DB.pragma('cache_size = -20000'); // cap page cache at ~20 MB — keep RAM low
    DB.pragma('mmap_size = 268435456'); // 256 MB mmap window for fast reads
    // Nearest-neighbour over vec0, joined to the section text in meta.
    searchStmt = DB.prepare(`
      select m.state, m.title, m.act_no, m.year, m.text, v.distance
      from vec v join meta m on m.rowid = v.rowid
      where v.embedding match ? and k = ?
      order by v.distance`);
    const { c } = DB.prepare('select count(*) c from meta').get();
    const states = DB.prepare('select distinct state from meta').all().map(r => r.state);
    console.log(`[rag] state full-text DB loaded (disk): ${c} chunks (${states.join(', ')})`);
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

// The vec table uses cosine distance (0 = identical, 1 = orthogonal), so
// maxDistance 0.58 ~= cosine similarity >= 0.42. Keep it permissive; the model judges fit.
export async function retrieveStateFullText(query, { k = 3, maxDistance = 0.58 } = {}) {
  if (!DB || !searchStmt || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    if (!qvec) return '';
    const qbuf = Buffer.from(new Float32Array(qvec).buffer);
    const hits = searchStmt.all(qbuf, k).filter(h => h.distance <= maxDistance);
    if (!hits.length) return '';
    return hits
      .map(h => `[${h.title}${h.year ? `, ${h.year}` : ''} — ${h.state}]\n${h.text}`)
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] state full-text retrieval failed:', e.message);
    return '';
  }
}

export function stateFullTextIndexReady() { return !!DB; }
