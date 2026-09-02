# Running LegalCareAI locally (no AWS)

The whole stack runs on this machine: React frontend, Node backend, a local
embedding model, and the legal corpora. Nothing here needs AWS or OpenAI.

## Start / stop

```bash
./start-legalcare.sh            # backend + embedding sidecar
./start-legalcare.sh --tunnel   # also publish it on the internet via Cloudflare
./start-legalcare.sh --stop     # stop everything
npm run dev                     # frontend -> http://localhost:4000
```

## The three processes

| Process | Port | Why it exists |
|---|---|---|
| `node server.js` | 8080 | the API + RAG retrieval + LLM calls |
| `embed_service.py` | 8399 | **query embeddings** — see below |
| `cloudflared` | – | optional public URL |

**Why the Python sidecar?** The corpora are embedded with `multilingual-e5-small`
(384-dim), so queries must use the same model. `transformers.js` does this
in-process on Linux and Apple Silicon, but `onnxruntime-node` ships **no
darwin/x64 binary** — on an Intel Mac Node cannot embed at all. The sidecar runs
the model in Python (MPS) and Node calls it over localhost. `localEmbed.js` tries
in-process first, then the sidecar, then falls back to keyword-only search.
On the Linux server the sidecar is not needed.

## Where the data lives

Large indexes are found through `RAG_DATA_DIRS` in `server/.env` (colon-separated,
searched in order, before the bundled `server/data`):

```
RAG_DATA_DIRS=/Users/apple/legalcare-work/active:/Volumes/Disk1/LegalCareAI-data
```

Internal SSD first, external drive second. This matters: the external drive
writes at **~14 MB/s** vs the SSD's **~1000 MB/s**, so always *build* indexes on
the SSD and copy the finished file to the drive. Building a 20M-row FTS index
directly on the drive took over 100 minutes with no end in sight; on the SSD it
took 35.

| File | Contents |
|---|---|
| `statute-rag-index.json` | 40,797 sections of ~800 central acts (vector + keyword) |
| `judgment-rag-index.json` | 38,362 Supreme Court judgments (vector + keyword) |
| `state-law-index.json` | 10,104 state/UT act titles (vector + keyword) |
| `case-law.db` | **20,635,326** High Court + Supreme Court judgments (keyword-only) |
| `subordinate-legislation.db` | 26,187 rules / notifications / circulars |
| `state-fulltext.db` | 9,485 state acts, full section text, 36 states |

`case-law.db` is deliberately **keyword-only (FTS5)**: embedding 20M judgments
would take days, and case lookups are literal anyway (party name, case number,
judge, court). Semantic questions are served by the statute/rules vector indexes.

## Publishing it on your own domain

One-time authorisation (opens your browser, needs your Cloudflare login):

```bash
cloudflared tunnel login
```

Then:

```bash
bash /Volumes/Disk1/LegalCareAI-work/setup_domain_tunnel.sh api.legalcareai.com
```

That creates the tunnel, points the DNS record at it, and writes
`~/.cloudflared/config.yml`. Afterwards `./start-legalcare.sh --tunnel` uses the
named tunnel automatically. Set the deployed frontend's API url in
`public/legalcare-config.js`.

Caveats: this machine must stay awake with the drive attached; the URL is public,
so anyone holding it spends your LLM credits; and login/OTP still needs AWS
Cognito, which is unrelated to the tunnel.

## Frontend API url resolution

`src/lib/api.ts` picks, in order:

1. `VITE_API_URL` **when running `npm run dev`**
2. `window.__LEGALCARE_CONFIG__.apiUrl` from `public/legalcare-config.js` (runtime)
3. `VITE_API_URL` (build time)

Rule 1 exists because `legalcare-config.js` ships a *production* url; without it,
local development silently talks to the deployed backend. `.env.local` sets the
dev value and is git-ignored.

## Rebuilding indexes

```bash
# re-embed a corpus at 384d (resumable; writes .npy parts then block json)
python3.11 /Users/apple/legalcare-work/embed_local.py rules blocks
python3.11 /Users/apple/legalcare-work/embed_local.py statefull blocks

# build the sqlite-vec databases from those blocks
node server/scripts/build_subordinate_db.mjs   out.db  .../rules/block_*.json
node server/scripts/build_state_db_blocks.mjs  out.db  .../statefull/block_*.json
```

Every retriever refuses to load an index whose dimension isn't 384, logging
`skipped: NNNd != 384d`. That is the guard that keeps a stale index from being
silently mixed with current ones — if retrieval goes quiet, check the boot log
first.

## Known gaps

Not covered: tribunals (NCLT, NCLAT, ITAT, CESTAT, NGT), district courts, most
regulator circulars (RBI/SEBI/CBDT/CBIC), the full e-Gazette, and municipal
bye-laws beyond five metros. High Court data is **citations, not full text** — the
model can name a case, court, judge and date, but cannot quote its holding.
`subordinate-legislation.db` also caps long documents at 10 chunks each: all
26,187 documents are present, but 11,508 long ones are truncated.
