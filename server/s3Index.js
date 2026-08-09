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

// Returns the local path to `filename`, fetching it from S3 first when needed.
export async function ensureIndexFile(filename) {
  const local = path.join(DATA_DIR, filename);
  if (fs.existsSync(local) && fs.statSync(local).size > 0) return local;

  const bucket = process.env.INDEX_S3_BUCKET;
  if (!bucket) return local; // no S3 configured — caller handles the missing file

  const prefix = process.env.INDEX_S3_PREFIX || 'legalcare-indexes/';
  const key = prefix + filename;
  const t0 = Date.now();
  try {
    // Lazy import so environments without the SDK aren't affected.
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
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
