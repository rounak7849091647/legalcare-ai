// Build the combined all-36-states disk-based sqlite-vec DB from index-JSON files
// ({dims, meta:[{...,text}], vectors_b64}). Streams one file at a time to keep
// memory low. Cosine metric (matches the retriever's threshold).
//
// Usage: node scripts/build_combined_db.mjs <out.db> <file1.json> <file2.json> ...
import fs from 'fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const [, , outPath, ...inputs] = process.argv;
if (!outPath || !inputs.length) { console.error('usage: build_combined_db.mjs <out.db> <files...>'); process.exit(1); }

if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
const db = new Database(outPath);
sqliteVec.load(db);
db.pragma('journal_mode = WAL');

let dims = null;
let rowid = 0;
const insVec = () => db.prepare('insert into vec(rowid, embedding) values (?, ?)');
const insMeta = () => db.prepare('insert into meta(rowid, state, title, act_no, year, handle, chunk, text) values (?,?,?,?,?,?,?,?)');
let vStmt, mStmt;

for (const file of inputs) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (dims === null) {
    dims = raw.dims;
    db.exec(`create virtual table vec using vec0(embedding float[${dims}] distance_metric=cosine)`);
    db.exec(`create table meta(rowid integer primary key, state text, title text, act_no text, year text, handle text, chunk integer, text text)`);
    vStmt = insVec(); mStmt = insMeta();
  }
  const meta = raw.meta;
  const buf = Buffer.from(raw.vectors_b64, 'base64');
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const tx = db.transaction(() => {
    for (let i = 0; i < meta.length; i++) {
      rowid++;
      const id = BigInt(rowid);
      const vslice = Buffer.from(vectors.buffer, vectors.byteOffset + i * dims * 4, dims * 4);
      vStmt.run(id, vslice);
      const m = meta[i];
      mStmt.run(id, m.state || '', m.title || '', m.act_no || '', m.year || '', m.handle || '', m.chunk || 0, m.text || '');
    }
  });
  tx();
  const st = [...new Set(meta.map(m => m.state))].join(',');
  console.log(`  + ${meta.length.toString().padStart(6)} rows from ${st} (total ${rowid})`);
}

db.exec('create index if not exists idx_meta_rowid on meta(rowid)');
const states = db.prepare('select count(distinct state) c from meta').get().c;
db.close();
console.log(`WROTE ${outPath} — ${rowid} chunks across ${states} states, ${(fs.statSync(outPath).size/1e9).toFixed(2)} GB`);
