// Case-law citation RAG — DISK-BASED, KEYWORD-ONLY (FTS5/BM25).
//
// Covers High Court judgments (all courts/benches/years, from the public AWS
// open-data set) plus Supreme Court judgments. Millions of rows, so this index is
// deliberately keyword-only: embedding every judgment would take days on CPU, and
// case lookups are literal anyway — a party name ("Kesavananda Bharati"), a case
// number ("WP(C)/1684/2019"), a judge, or a court. Semantic legal questions are
// answered by the statute/rules vector indexes; this module exists so the model
// can cite REAL cases with real courts and dates instead of inventing them.
//
// The DB lives on external storage (see RAG_DATA_DIRS); no-ops if absent.
import fs from 'fs';
import { ensureIndexFile } from './s3Index.js';
import { ftsMatchExpr } from './hybrid.js';

let DB = null, searchStmt = null;

export async function loadCaseLawIndex() {
  try {
    const p = await ensureIndexFile('case-law.db');
    if (!fs.existsSync(p)) { console.warn('[rag] case-law DB not present'); DB = null; return; }
    const Database = (await import('better-sqlite3')).default;
    DB = new Database(p, { fileMustExist: true, readonly: true });
    DB.pragma('cache_size = -40000');
    DB.pragma('mmap_size = 268435456');
    searchStmt = DB.prepare(`
      select m.court, m.title, m.judge, m.date, m.disposal, m.source, m.snippet
      from meta_fts f join meta m on m.rowid = f.rowid
      where meta_fts match ? order by bm25(meta_fts) limit ?`);
    const { c } = DB.prepare('select count(*) c from meta').get();
    console.log(`[rag] case-law DB loaded (disk, keyword): ${c} judgments`);
  } catch (e) {
    console.warn('[rag] case-law DB unavailable:', e.message);
    DB = null;
  }
}

// Returns formatted case citations, or ''. Never throws.
export async function retrieveCaseLaw(query, { k = 4 } = {}) {
  if (!DB || !searchStmt || !query || !query.trim()) return '';
  try {
    const expr = ftsMatchExpr(query);
    if (!expr) return '';
    const rows = searchStmt.all(expr, k);
    if (!rows.length) return '';
    return rows.map(r => {
      const bits = [r.court, r.date ? `decided ${r.date}` : '', r.judge ? `before ${r.judge}` : '']
        .filter(Boolean).join(', ');
      const disposal = r.disposal ? ` [${r.disposal}]` : '';
      return `${r.title}\n  ${bits}${disposal}${r.snippet ? `\n  ${r.snippet}` : ''}`;
    }).join('\n\n');
  } catch (e) {
    console.warn('[rag] case-law retrieval failed:', e.message);
    return '';
  }
}

export function caseLawIndexReady() { return !!DB; }
