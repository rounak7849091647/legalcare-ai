// Build the Supreme Court full-text sqlite-vec DB from embedded BLOCK files
// ({dims, meta:[{year,header,file,chunk,text}], vectors_b64}).
// Usage: node scripts/build_sc_db_blocks.mjs <out.db> <block.json...>
import fs from 'fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const [, , outPath, ...inputs] = process.argv;
if (!outPath || !inputs.length) {
  console.error('usage: build_sc_db_blocks.mjs <out.db> <files...>');
  process.exit(1);
}
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const db = new Database(outPath);
sqliteVec.load(db);
db.pragma('journal_mode = WAL');

let dims = null, rowid = 0, vStmt, mStmt;

for (const f of inputs.sort()) {
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (dims === null) {
    dims = raw.dims;
    db.exec(`create virtual table vec using vec0(embedding float[${dims}] distance_metric=cosine)`);
    db.exec('create table meta(rowid integer primary key, year text, header text, file text, chunk integer, text text)');
    vStmt = db.prepare('insert into vec(rowid, embedding) values (?, ?)');
    mStmt = db.prepare('insert into meta(rowid, year, header, file, chunk, text) values (?,?,?,?,?,?)');
  } else if (raw.dims !== dims) {
    throw new Error(`dim mismatch in ${f}: ${raw.dims} != ${dims}`);
  }

  const buf = Buffer.from(raw.vectors_b64, 'base64');
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

  const insert = db.transaction(() => {
    for (let i = 0; i < raw.meta.length; i++) {
      const m = raw.meta[i];
      // vec0 accepts only integer primary keys — must be a BigInt, not a Number.
      const id = BigInt(++rowid);
      vStmt.run(id, Buffer.from(vectors.buffer, vectors.byteOffset + i * dims * 4, dims * 4));
      mStmt.run(id, String(m.year ?? ''), m.header ?? '', m.file ?? '', m.chunk ?? 0, m.text ?? '');
    }
  });
  insert();
  console.log(`${f}: +${raw.meta.length} (total ${rowid})`);
}

db.exec('create index if not exists idx_year on meta(year)');
db.close();
console.log(`done: ${rowid} chunks, ${dims}d -> ${outPath}`);
