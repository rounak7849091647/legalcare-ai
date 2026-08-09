// Build a disk-based sqlite-vec DB from an in-memory-style index JSON
// ({dims, meta:[{...,text}], vectors_b64}) OR from a directory of corpus JSONL files
// plus a matching vectors source. Here: take an index JSON and emit state-fulltext.db.
//
// Usage: node scripts/build_state_db.mjs <index.json> <out.db>
import fs from 'fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: build_state_db.mjs <index.json> <out.db>'); process.exit(1); }

console.log('reading', inPath);
const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const dims = raw.dims;
const meta = raw.meta;
const buf = Buffer.from(raw.vectors_b64, 'base64');
const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
console.log(`chunks=${meta.length} dims=${dims}`);

if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
const db = new Database(outPath);
sqliteVec.load(db);
db.pragma('journal_mode = WAL');
db.exec(`create virtual table vec using vec0(embedding float[${dims}] distance_metric=cosine)`);
db.exec(`create table meta(
  rowid integer primary key,
  state text, title text, act_no text, year text, handle text, chunk integer, text text
)`);

const insVec = db.prepare('insert into vec(rowid, embedding) values (?, ?)');
const insMeta = db.prepare('insert into meta(rowid, state, title, act_no, year, handle, chunk, text) values (?,?,?,?,?,?,?,?)');
const tx = db.transaction(() => {
  for (let i = 0; i < meta.length; i++) {
    const id = BigInt(i + 1);
    const vslice = Buffer.from(vectors.buffer, vectors.byteOffset + i * dims * 4, dims * 4);
    insVec.run(id, vslice);
    const m = meta[i];
    insMeta.run(id, m.state || '', m.title || '', m.act_no || '', m.year || '', m.handle || '', m.chunk || 0, m.text || '');
    if (i % 20000 === 0) console.log(`  ${i}/${meta.length}`);
  }
});
tx();
db.exec('create index if not exists idx_meta_rowid on meta(rowid)');
db.close();
const mb = (fs.statSync(outPath).size / 1e6).toFixed(1);
console.log(`WROTE ${outPath} (${mb} MB)`);
