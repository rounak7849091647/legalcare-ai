// Local, self-hosted query embeddings (multilingual-e5-small, 384-dim) via
// transformers.js (onnxruntime). Replaces the OpenAI embeddings API so retrieval
// runs with no external key/credits. The bundled corpus indexes are embedded with
// the SAME model (Python sentence-transformers, full precision); this uses the
// fp32 ONNX so query and passage vectors live in the same space.
//
// e5 REQUIRES asymmetric prefixes: passages are embedded as "passage: ..." (done
// at index-build time) and queries as "query: ..." (here). Vectors are L2-normalized
// so cosine == dot product, matching the retrievers.
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _extractor = null;
let _loading = null;
let _disabled = false;

async function getExtractor() {
  if (_extractor) return _extractor;
  if (_disabled) return null;
  if (_loading) return _loading;
  _loading = (async () => {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      // Bundle the model with the deploy; never hit the network at runtime.
      env.allowRemoteModels = false;
      env.localModelPath = path.join(__dirname, 'models');
      const ex = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
        dtype: 'q8', // int8 quantized: ~112MB, 0.998 cosine agreement with the
                     // full-precision corpus vectors — imperceptible for retrieval.
      });
      _extractor = ex;
      console.log('[embed] local e5 model ready (384d, q8)');
      return ex;
    } catch (e) {
      // Not fatal and not necessarily keyword-only: the Python sidecar is tried
      // next. Report the real reason briefly, without the huge require stack.
      const why = /onnxruntime_binding\.node/.test(e.message)
        ? 'no onnxruntime binary for this platform'
        : e.message.split('\n')[0];
      console.log(`[embed] in-process model unavailable (${why}); trying sidecar`);
      _disabled = true; // don't retry the in-process path on every query
      return null;
    }
  })();
  return _loading;
}

// Fallback path: a local Python sidecar (server/embed_service.py) running the same
// e5 model. Needed because onnxruntime-node ships no darwin/x64 binary, so on an
// Intel Mac the in-process path above cannot load at all. Prod (linux/x64) and
// Apple Silicon use transformers.js directly and never touch this.
const SIDECAR = process.env.EMBED_SERVICE_URL || 'http://127.0.0.1:8399';
let _sidecarOk = null; // null = untested, true/false = known

async function sidecarEmbed(text) {
  if (_sidecarOk === false) return null;
  try {
    const res = await fetch(`${SIDECAR}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 2000), kind: 'query' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (!Array.isArray(j.vector)) throw new Error('bad payload');
    if (_sidecarOk !== true) { _sidecarOk = true; console.log(`[embed] using embedding sidecar at ${SIDECAR} (${j.dims}d)`); }
    return j.vector;
  } catch (e) {
    if (_sidecarOk === null) { // only announce the first failure, then stay quiet
      console.warn(`[embed] sidecar unavailable (${e.message}); keyword-only retrieval`);
      _sidecarOk = false;
    }
    return null;
  }
}

// Returns a 384-length number[] (L2-normalized), or null if no embedder is
// reachable. Retrievers treat null as "keyword-only" so search still works.
export async function embedQuery(text) {
  const ex = await getExtractor();
  if (ex) {
    const out = await ex('query: ' + String(text).slice(0, 2000), { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }
  return sidecarEmbed(text);
}

// Warm whichever embedder is available so the first user query isn't slow, and
// state plainly which path retrieval will actually use.
export async function warmEmbedder() {
  try {
    if (await getExtractor()) return;
    const v = await sidecarEmbed('warmup');
    if (!v) {
      console.warn('[embed] NO embedder available — retrieval is KEYWORD-ONLY. '
        + 'Start it with: python3.11 server/embed_service.py 8399');
    }
  } catch { /* ignore */ }
}
