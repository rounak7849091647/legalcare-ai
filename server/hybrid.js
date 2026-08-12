// Hybrid retrieval helpers: keyword (SQLite FTS5 / BM25) + vector, fused via
// Reciprocal Rank Fusion, plus a small Indian-legal synonym expansion that closes
// vocabulary gaps pure vector search misses (e.g. "FIR" -> "first information
// report", "home loan" -> "interest on borrowed capital").
import Database from 'better-sqlite3';

// --- Query expansion -------------------------------------------------------
// Map common lay/jargon phrasings to the formal wording that actually appears in
// the bare-act text. Appended (not replaced) so the original terms still count.
const SYNONYMS = [
  [/\bfir\b|first information report/i, 'information cognizable offence police station reduced to writing'],
  [/anticipatory bail/i, 'direction for grant of bail person apprehending arrest'],
  [/cheque bounce|cheque dishonou?r|bounced cheque/i, 'dishonour of cheque insufficiency of funds section 138'],
  [/home loan interest|housing loan interest/i, 'interest on borrowed capital house property income from house'],
  [/\bdivorce\b/i, 'dissolution of marriage grounds decree'],
  [/custody/i, 'custody of the minor guardians and wards act hindu marriage act welfare of the child'],
  [/rent control|tenant eviction/i, 'landlord tenant eviction protection possession premises'],
  [/gst|goods and services tax/i, 'input tax credit supply registration'],
  [/\bfsi\b|floor space index|\bfar\b|floor area ratio/i, 'floor area ratio built up area plot coverage'],
  [/setback/i, 'open space margin building line front rear side setback'],
  [/dowry/i, 'dowry demand cruelty'],
  [/maintenance|alimony/i, 'maintenance of wife section 144 bhartiya nagarik suraksha hindu marriage act permanent alimony section 25 monthly allowance spouse'],
  [/pf|provident fund/i, 'employees provident fund contribution'],
  [/gratuity/i, 'payment of gratuity continuous service'],
];

export function expandQuery(q) {
  let extra = '';
  for (const [re, add] of SYNONYMS) if (re.test(q)) extra += ' ' + add;
  return extra ? `${q} ${extra}` : q;
}

// --- FTS5 keyword index ----------------------------------------------------
// Turn a free-text query into a safe FTS5 MATCH expression (OR of quoted terms;
// BM25 handles term weighting). Returns '' when nothing usable.
export function ftsMatchExpr(q) {
  const terms = expandQuery(q)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
  if (!terms.length) return '';
  return [...new Set(terms)].map(w => `"${w}"`).join(' OR ');
}
const STOP = new Set(['the','and','for','with','under','what','how','who','can','are','was','when','which','from','into','this','that','does','has','have','will','shall','any','all','not','you','your']);

// Build an in-memory FTS5 index over `rows`; textFn(row,i) returns the searchable
// blob. Returns { search(query, k) -> array of row indices (0-based) }.
export function buildMemoryFts(rows, textFn) {
  const db = new Database(':memory:');
  db.exec("create virtual table fts using fts5(body, tokenize='porter unicode61')");
  const ins = db.prepare('insert into fts(rowid, body) values (?, ?)');
  const tx = db.transaction(() => { for (let i = 0; i < rows.length; i++) ins.run(i + 1, textFn(rows[i], i) || ''); });
  tx();
  const stmt = db.prepare('select rowid from fts where fts match ? order by rank limit ?');
  return {
    search(query, k = 10) {
      const expr = ftsMatchExpr(query);
      if (!expr) return [];
      try { return stmt.all(expr, k).map(r => r.rowid - 1); }
      catch { return []; }
    },
  };
}

// Ensure an FTS5 table exists over an on-disk sqlite meta table (built once per
// process against the downloaded .db copy). Returns { search(query, k) -> rowids }.
export function ensureDbFts(db, { table = 'meta', cols = ['title', 'text'] } = {}) {
  const has = db.prepare("select count(*) c from sqlite_master where type='table' and name='meta_fts'").get().c;
  if (!has) {
    db.exec("create virtual table meta_fts using fts5(body, tokenize='porter unicode61')");
    // Single SQL insert — no JS cursor, so no read/write conflict on the connection.
    const body = cols.map(c => `coalesce(${c},'')`).join(" || ' ' || ");
    db.exec(`insert into meta_fts(rowid, body) select rowid, ${body} from ${table}`);
  }
  const stmt = db.prepare('select rowid from meta_fts where meta_fts match ? order by rank limit ?');
  return {
    search(query, k = 10) {
      const expr = ftsMatchExpr(query);
      if (!expr) return [];
      try { return stmt.all(expr, k).map(r => r.rowid); }
      catch { return []; }
    },
  };
}

// --- Reciprocal Rank Fusion ------------------------------------------------
// idLists: array of ranked id arrays (best first). `weights` (parallel to idLists)
// lets vector outrank keyword so strong semantic matches stay on top while keyword
// still rescues jargon/section-number queries. Returns fused top-k ids.
export function rrfMerge(idLists, k = 6, c = 60, weights = null) {
  const score = new Map();
  idLists.forEach((list, li) => {
    const w = weights ? (weights[li] ?? 1) : 1;
    for (let rank = 0; rank < list.length; rank++) {
      const id = list[rank];
      score.set(id, (score.get(id) || 0) + w / (c + rank));
    }
  });
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(e => e[0]);
}
