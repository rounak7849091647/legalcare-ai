// Helper: ensure a large RAG index file exists locally, downloading it from S3 at
// startup if it isn't bundled. Lets us keep multi-GB indexes out of git / the deploy
// zip (stored in S3) while the app still loads them into memory on boot.
//
// Controlled by env:
//   INDEX_S3_BUCKET  - S3 bucket holding the indexes (required to enable S3 fetch)
//   INDEX_S3_PREFIX  - key prefix (default: "legalcare-indexes/")
// If INDEX_S3_BUCKET is unset, this is a no-op and only the bundled local file is used.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

// Extra directories to search before the bundled data dir, colon-separated:
//   RAG_DATA_DIRS=/Volumes/Disk1/LegalCareAI-data:/mnt/legal
// Lets multi-GB corpora live on an external disk instead of inside the repo.
// Read lazily, NOT at module load: dotenv populates process.env in server.js
// AFTER this module is imported, so a top-level read would always come back empty.
function extraDirs() {
  return (process.env.RAG_DATA_DIRS || '').split(':').map(s => s.trim()).filter(Boolean);
}

// All candidate locations for an index file, in priority order.
export function candidatePaths(filename) {
  return [...extraDirs().map(d => path.join(d, filename)), path.join(DATA_DIR, filename)];
}

// Returns the local path to `filename`, fetching it from S3 first when needed.
export async function ensureIndexFile(filename) {
  for (const p of candidatePaths(filename)) {
    if (fs.existsSync(p) && fs.statSync(p).size > 0) {
      if (!p.startsWith(DATA_DIR)) console.log(`[rag] using external index: ${p}`);
      return p;
    }
  }
  const local = path.join(DATA_DIR, filename);

  const bucket = process.env.INDEX_S3_BUCKET;
  if (!bucket) return local; // no S3 configured — caller handles the missing file

  const prefix = process.env.INDEX_S3_PREFIX || 'legalcare-indexes/';
  const key = prefix + filename;
  const t0 = Date.now();
  try {
    // Lazy import so environments without the SDK aren't affected.
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    // Derive the region from the EB bucket name (elasticbeanstalk-<region>-<acct>)
    // so a wrong AWS_REGION on the instance can't cause a 301 endpoint redirect.
    const m = /^[a-z]+-([a-z0-9-]+?-\d)-\d+$/.exec(bucket);
    const region = (m && m[1]) || process.env.INDEX_S3_REGION || process.env.AWS_REGION || 'ap-south-1';
    const s3 = new S3Client({ region });
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    fs.mkdirSync(DATA_DIR, { recursive: true });
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(local);
      res.Body.pipe(out);
      res.Body.on('error', reject);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    const mb = (fs.statSync(local).size / 1e6).toFixed(0);
    console.log(`[rag] downloaded ${filename} from s3://${bucket}/${key} (${mb} MB, ${Date.now() - t0}ms)`);
  } catch (e) {
    console.warn(`[rag] S3 fetch of ${filename} failed: ${e.message}`);
  }
  return local;
}
