# LegalCareAI — Complete Project Bundle

Self-hosted RAG legal-AI for Indian law (Acts, state laws, rules/notifications,
Supreme Court judgments). React frontend + Node RAG API backend.

## What's in this bundle

```
legal-easy-craft-main/
├── src/                         Frontend (React + Vite + Tailwind)
├── public/                      Frontend static assets, service worker, config
├── server/                      Backend RAG API (Node, Express)
│   ├── server.js                Main API + LLM orchestration + email/OTP
│   ├── statuteRag.js            Central bare-act section retrieval (hybrid)
│   ├── judgmentRag.js           Supreme Court judgment retrieval
│   ├── stateLawRag.js           State/UT act metadata retrieval
│   ├── stateFullTextRag.js      State act FULL TEXT (disk sqlite-vec)
│   ├── subordinateRag.js        Rules / notifications (disk sqlite-vec)
│   ├── hybrid.js                Shared FTS5 + RRF fusion + query expansion
│   ├── localEmbed.js            Self-hosted query embeddings (e5, transformers.js)
│   ├── s3Index.js               Downloads the big .db files from S3 at boot
│   ├── models/                  Bundled embedding model (multilingual-e5-small, q8)
│   ├── data/                    Search indexes + vector DBs (see below)
│   ├── scripts/                 DB build scripts (build_*_db.mjs)
│   ├── eval/                    Head-to-head eval harness (vs raw Grok)
│   └── .platform/               Elastic Beanstalk deploy hooks
└── PROJECT_BUNDLE_README.md     This file
```

### server/data (the knowledge base)
| File | Contents |
|---|---|
| statute-rag-index.json | ~40k central bare-act sections + embeddings |
| judgment-rag-index.json | ~38k Supreme Court judgments + embeddings |
| state-law-index.json | ~10k state/UT act metadata + embeddings |
| state-fulltext.db | ~406k chunks of full state-act text (sqlite-vec) |
| subordinate-legislation.db | ~177k rules/notifications chunks (sqlite-vec) |

NOTE: the current index embeddings are 512-dim OpenAI (text-embedding-3-small).
An in-progress migration to self-hosted 384-dim multilingual-e5-small is staged in
the code (localEmbed.js + the dims-guard in each retriever) but the re-embedded
indexes were not yet built at bundle time.

## How to run locally

Backend:
```
cd server
npm install
# set env in server/.env: LLM_API_KEY / LLM_BASE_URL / LLM_MODEL (chat LLM),
#   email SMTP creds for OTP, AWS creds if using S3-served DBs
node server.js            # or: npx pm2-runtime start server.js
```
The two big .db files load from local server/data if present, otherwise are
downloaded from S3 (see s3Index.js).

Frontend:
```
npm install
npm run dev               # Vite dev server
npm run build             # production build -> dist/ (deployed to Cloudflare Pages)
```

## Rebuilding the raw corpora (if you want the source data)
- Central acts / rules / notifications: Hugging Face `kanoongpt/indian-legal-documents` (Apache-2.0)
- Supreme Court judgments: AWS Open Data `indian-supreme-court-judgments` (per-year tars)
- State act full text: India Code repository PDFs

Build scripts to turn embedded blocks into the .db files live in server/scripts/.

## Deploy targets
- Backend: AWS Elastic Beanstalk (app `legalcare-api`, env `legalcare-api-prod`, ap-south-1)
- Frontend: Cloudflare Pages (project `legalcareai`)
