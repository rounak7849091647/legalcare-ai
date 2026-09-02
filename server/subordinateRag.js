// Subordinate-legislation RAG — DISK-BASED, HYBRID. Rules, notifications,
// circulars, orders, regulations (central + all states) from the KanoonGPT
// "indian-legal-documents" dataset (Apache-2.0). Same disk sqlite-vec + FTS5
// approach as the state full text: the ~1.7 GB DB stays on disk (low RAM), served
// from S3 at boot. No-ops gracefully until the DB is present.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureIndexFile } from './s3Index.js';
import { ensureDbFts, rrfMerge } from './hybrid.js';
import { embedQuery as localEmbedQuery } from './localEmbed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBED_DIMS = 384;

let DB = null, vecStmt = null, metaStmt = null, FTS = null;

export async function loadSubordinateIndex() {
  try {
    const p = await ensureIndexFile('subordinate-legislation.db');
    if (!fs.existsSync(p)) { console.warn('[rag] subordinate-legislation DB not present'); DB = null; return; }
    const Database = (await import('better-sqlite3')).default;
    const sqliteVec = await import('sqlite-vec');
    DB = new Database(p, { fileMustExist: true });
    sqliteVec.load(DB);
    DB.pragma('cache_size = -40000');
    DB.pragma('mmap_size = 268435456');
    FTS = ensureDbFts(DB, { table: 'meta', cols: ['title', 'text'] });
    vecStmt = DB.prepare('select rowid, distance from vec where embedding match ? and k = ? order by distance');
    metaStmt = DB.prepare('select title, type, jurisdiction, year, text from meta where rowid = ?');
    try { vecStmt.all(Buffer.from(new Float32Array(EMBED_DIMS).buffer), 1); }
    catch { console.warn(`[rag] subordinate-legislation DB skipped: not ${EMBED_DIMS}d (awaiting re-embed)`); DB = null; return; }
    const { c } = DB.prepare('select count(*) c from meta').get();
    console.log(`[rag] subordinate-legislation DB loaded (disk, hybrid): ${c} chunks`);
  } catch (e) {
    console.warn('[rag] subordinate-legislation DB unavailable:', e.message);
    DB = null;
  }
}

async function embedQuery(text) { return localEmbedQuery(text); }

// Returns relevant rules/notifications text, or ''. Hybrid vector + keyword.
export async function retrieveSubordinate(query, { k = 3, maxDistance = 0.60 } = {}) {
  if (!DB || !vecStmt || !query || !query.trim()) return '';
  try {
    const qvec = await embedQuery(query);
    let distMap = new Map(), vIds = [];
    if (qvec) { // null qvec -> keyword-only
      const qbuf = Buffer.from(new Float32Array(qvec).buffer);
      const vrows = vecStmt.all(qbuf, 15);
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
    return keep
      .map(id => { const h = metaStmt.get(id); return `[${h.title} — ${h.type}, ${h.jurisdiction}${h.year ? `, ${h.year}` : ''}]\n${h.text}`; })
      .join('\n\n');
  } catch (e) {
    console.warn('[rag] subordinate retrieval failed:', e.message);
    return '';
  }
}

export function subordinateIndexReady() { return !!DB; }
