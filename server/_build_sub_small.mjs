import fs from 'fs';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { ensureDbFts } from './hybrid.js';
const EMB='/private/tmp/claude-501/-Users-apple-Downloads-legal-easy-craft-main/5875806c-a4e1-4b9f-8f33-9569d325b0ef/scratchpad/kanoon_embedded';
const OUT='data/subordinate-legislation.db';
const CAP=10;
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
const db=new Database(OUT); sqliteVec.load(db); db.pragma('journal_mode=WAL');
let dims=null,rowid=0,vStmt,mStmt,kept=0,total=0;
const files=fs.readdirSync(EMB).filter(f=>f.startsWith('block_')).sort();
for(const f of files){
  const raw=JSON.parse(fs.readFileSync(`${EMB}/${f}`,'utf8'));
  if(dims===null){dims=raw.dims;
    db.exec(`create virtual table vec using vec0(embedding float[${dims}] distance_metric=cosine)`);
    db.exec(`create table meta(rowid integer primary key, title text, type text, jurisdiction text, year text, chunk integer, text text)`);
    vStmt=db.prepare('insert into vec(rowid,embedding) values (?,?)');
    mStmt=db.prepare('insert into meta(rowid,title,type,jurisdiction,year,chunk,text) values (?,?,?,?,?,?,?)');}
  const meta=raw.meta; const buf=Buffer.from(raw.vectors_b64,'base64');
  const V=new Float32Array(buf.buffer,buf.byteOffset,buf.byteLength/4);
  const tx=db.transaction(()=>{ for(let i=0;i<meta.length;i++){ total++; const m=meta[i]; if((m.chunk||0)>=CAP) continue; rowid++; kept++;
    vStmt.run(BigInt(rowid), Buffer.from(V.buffer, V.byteOffset+i*dims*4, dims*4));
    mStmt.run(BigInt(rowid), m.title||'', m.type||'', m.jurisdiction||'', m.year||'', m.chunk||0, m.text||''); } });
  tx();
}
console.log(`kept ${kept}/${total} chunks (cap ${CAP}/doc)`);
ensureDbFts(db,{table:'meta',cols:['title','text']});
db.close();
console.log('size:', (fs.statSync(OUT).size/1e9).toFixed(2),'GB (FTS baked in)');
