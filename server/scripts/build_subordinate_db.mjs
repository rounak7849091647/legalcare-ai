// Build the subordinate-legislation disk sqlite-vec DB from embedded block files
// ({dims, meta:[{title,type,jurisdiction,year,chunk,text}], vectors_b64}).
// Usage: node scripts/build_subordinate_db.mjs <out.db> <block.json...>
import fs from 'fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const [, , outPath, ...inputs] = process.argv;
if (!outPath || !inputs.length) { console.error('usage: build_subordinate_db.mjs <out.db> <files...>'); process.exit(1); }
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
const db = new Database(outPath);
sqliteVec.load(db);
// DELETE, not WAL: the finished database gets moved into place as a single
// file. In WAL mode the committed data lives partly in a sibling .db-wal, so
// moving only the .db leaves a torn database that fails integrity_check.
db.pragma('journal_mode = DELETE');

let dims = null, rowid = 0, vStmt, mStmt;
for (const file of inputs.sort()) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (dims === null) {
    dims = raw.dims;
    db.exec(`create virtual table vec using vec0(embedding float[${dims}] distance_metric=cosine)`);
    db.exec(`create table meta(rowid integer primary key, title text, type text, jurisdiction text, year text, chunk integer, text text)`);
    vStmt = db.prepare('insert into vec(rowid, embedding) values (?, ?)');
    mStmt = db.prepare('insert into meta(rowid, title, type, jurisdiction, year, chunk, text) values (?,?,?,?,?,?,?)');
  }
  const meta = raw.meta;
  const buf = Buffer.from(raw.vectors_b64, 'base64');
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const tx = db.transaction(() => {
    for (let i = 0; i < meta.length; i++) {
      rowid++;
      const id = BigInt(rowid);
      vStmt.run(id, Buffer.from(vectors.buffer, vectors.byteOffset + i * dims * 4, dims * 4));
      const m = meta[i];
      mStmt.run(id, m.title || '', m.type || '', m.jurisdiction || '', m.year || '', m.chunk || 0, m.text || '');
    }
  });
  tx();
  console.log(`  + ${meta.length} rows (total ${rowid})`);
}
db.close();
console.log(`WROTE ${outPath} — ${rowid} chunks, ${(fs.statSync(outPath).size/1e9).toFixed(2)} GB`);
