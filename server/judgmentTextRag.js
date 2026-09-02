// Supreme Court FULL JUDGMENT TEXT RAG — DISK-BASED, HYBRID.
//
// judgmentRag.js indexes SC judgment *metadata* (title, citation, the legal issue)
// so the model can cite a real case. This module indexes the actual TEXT of those
// judgments — every year 1950-present, chunked — so the model can say what the
// Court reasoned and held, not merely that a case exists.
//
// Vector + keyword (FTS5) fused with RRF, same as the state full-text index.
// The DB lives on external storage (RAG_DATA_DIRS); no-ops if absent.
import fs from 'fs';
import { ensureIndexFile } from './s3Index.js';
import { ensureDbFts, rrfMerge } from './hybrid.js';
import { embedQuery as localEmbedQuery } from './localEmbed.js';

const EMBED_DIMS = 384;

let DB = null, vecStmt = null, metaStmt = null, FTS = null;

export async function loadJudgmentTextIndex() {
  try {
    const p = await ensureIndexFile('sc-fulltext.db');
    if (!fs.existsSync(p)) { console.warn('[rag] SC full-text DB not present'); DB = null; return; }
    const Database = (await import('better-sqlite3')).default;
    const sqliteVec = await import('sqlite-vec');
    // Read-write so the FTS keyword index can be built into the local copy.
    DB = new Database(p, { fileMustExist: true });
    sqliteVec.load(DB);
    DB.pragma('cache_size = -40000');
    DB.pragma('mmap_size = 268435456');
    FTS = ensureDbFts(DB, { table: 'meta', cols: ['header', 'text'] });
    vecStmt = DB.prepare('select rowid, distance from vec where embedding match ? and k = ? order by distance');
    metaStmt = DB.prepare('select year, header, file, chunk, text from meta where rowid = ?');
    try { vecStmt.all(Buffer.from(new Float32Array(EMBED_DIMS).buffer), 1); }
    catch { console.warn(`[rag] SC full-text DB skipped: not ${EMBED_DIMS}d`); DB = null; return; }
    const { c } = DB.prepare('select count(*) c from meta').get();
    console.log(`[rag] SC full-text DB loaded (disk, hybrid): ${c} chunks`);
  } catch (e) {
    console.warn('[rag] SC full-text DB unavailable:', e.message);
    DB = null;
  }
}

// Returns passages from real SC judgments, or ''. Never throws.
export async function retrieveJudgmentText(query, { k = 3, maxDistance = 0.60 } = {}) {
  if (!DB || !vecStmt || !query || !query.trim()) return '';
  try {
    const qvec = await localEmbedQuery(query);
    let distMap = new Map(), vIds = [];
    if (qvec) { // null qvec -> keyword-only
      const vrows = vecStmt.all(Buffer.from(new Float32Array(qvec).buffer), 15);
      distMap = new Map(vrows.map(r => [r.rowid, r.distance]));
      vIds = vrows.map(r => r.rowid);
    }
    const kIds = FTS ? FTS.search(query, 15) : [];
    const kSet = new Set(kIds);
    const fused = rrfMerge([vIds, kIds], k * 2, 60, [2, 1]);
    const keep = fused
      .filter(id => (distMap.has(id) && distMap.get(id) <= maxDistance) || kSet.has(id))
      .slice(0, k);
    if (!keep.length) return '';
    return keep.map(id => {
      const h = metaStmt.get(id);
      // The header is the first line of the judgment (parties + citation line).
      return `[Supreme Court of India, ${h.year}] ${String(h.header || '').slice(0, 160)}\n${h.text}`;
    }).join('\n\n');
  } catch (e) {
    console.warn('[rag] SC full-text retrieval failed:', e.message);
    return '';
  }
}

export function judgmentTextIndexReady() { return !!DB; }
