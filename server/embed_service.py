#!/usr/bin/env python3
"""Local embedding sidecar for LegalCareAI.

Why this exists: the RAG corpus is embedded with multilingual-e5-small (384d).
At query time the Node server needs the SAME model. transformers.js handles that
on Linux (and Apple Silicon), but onnxruntime-node ships no darwin/x64 binary, so
on an Intel Mac Node cannot embed at all. This tiny stdlib HTTP service runs the
model in Python (torch/MPS works fine here) and Node calls it over localhost.

  POST /embed  {"text": "...", "kind": "query"|"passage"}  -> {"vector": [...384]}
  GET  /health                                             -> {"ok": true, ...}

e5 needs asymmetric prefixes; "kind" picks the right one (default: query).
Start with:  python3.11 server/embed_service.py [port]
"""
import json, os, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
os.environ.setdefault('PYTORCH_MPS_HIGH_WATERMARK_RATIO', '0.0')

MODEL = os.environ.get('EMBED_MODEL', 'intfloat/multilingual-e5-small')
PORT = int(sys.argv[1] if len(sys.argv) > 1 else os.environ.get('EMBED_PORT', 8399))

print(f'[embed-service] loading {MODEL} ...', flush=True)
from sentence_transformers import SentenceTransformer
_model = SentenceTransformer(MODEL)
DIMS = _model.get_sentence_embedding_dimension()
print(f'[embed-service] ready on :{PORT} device={_model.device} dims={DIMS}', flush=True)


def embed(text, kind='query'):
    prefix = 'passage: ' if kind == 'passage' else 'query: '
    v = _model.encode([prefix + text[:2000]], normalize_embeddings=True)[0]
    return [float(x) for x in v]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/health'):
            self._send(200, {'ok': True, 'model': MODEL, 'dims': DIMS})
        else:
            self._send(404, {'error': 'not found'})

    def do_POST(self):
        if not self.path.startswith('/embed'):
            return self._send(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            req = json.loads(self.rfile.read(n) or b'{}')
            text = req.get('text') or ''
            if not text.strip():
                return self._send(400, {'error': 'text required'})
            self._send(200, {'vector': embed(text, req.get('kind', 'query')), 'dims': DIMS})
        except Exception as e:  # never take the API down over one bad query
            self._send(500, {'error': str(e)[:200]})

    def log_message(self, *a):  # quiet: one line per request is noise
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
