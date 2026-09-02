#!/bin/bash
# Bring the whole LegalCareAI stack up locally.
#
#   ./start-legalcare.sh            backend + embedding sidecar
#   ./start-legalcare.sh --tunnel   also expose it publicly via Cloudflare
#   ./start-legalcare.sh --stop     stop everything this script started
#
# The embedding sidecar is required on Intel Macs: onnxruntime-node ships no
# darwin/x64 binary, so the Node server cannot embed queries in-process and would
# silently fall back to keyword-only retrieval.
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRV="$ROOT/server"
LOGS="${LEGALCARE_LOGS:-/Users/apple/legalcare-work/logs}"
mkdir -p "$LOGS"

stop_all () {
  echo "stopping ..."
  pkill -f "node server.js"        2>/dev/null && echo "  backend stopped"
  pkill -f "embed_service.py"      2>/dev/null && echo "  sidecar stopped"
  pkill -f "cloudflared tunnel"    2>/dev/null && echo "  tunnel stopped"
  exit 0
}
[ "${1:-}" = "--stop" ] && stop_all

# ---- 1. embedding sidecar --------------------------------------------------
if curl -s --max-time 3 http://127.0.0.1:8399/health >/dev/null 2>&1; then
  echo "sidecar: already running"
else
  echo "sidecar: starting ..."
  ( cd "$SRV" && nohup python3.11 embed_service.py 8399 > "$LOGS/sidecar.log" 2>&1 & )
  for i in $(seq 1 40); do
    curl -s --max-time 2 http://127.0.0.1:8399/health >/dev/null 2>&1 && break
    sleep 3
  done
  curl -s --max-time 3 http://127.0.0.1:8399/health >/dev/null 2>&1 \
    && echo "sidecar: ready" \
    || echo "sidecar: FAILED to start (see $LOGS/sidecar.log) — retrieval will be keyword-only"
fi

# ---- 2. backend ------------------------------------------------------------
pkill -f "node server.js" 2>/dev/null
sleep 2
echo "backend: starting ..."
( cd "$SRV" && nohup node server.js > "$LOGS/server.log" 2>&1 & )
for i in $(seq 1 60); do
  grep -q "Server running" "$LOGS/server.log" 2>/dev/null && break
  sleep 2
done
if grep -q "Server running" "$LOGS/server.log" 2>/dev/null; then
  echo "backend: ready on http://localhost:8080"
  echo "--- indexes loaded ---"
  grep -E "\[rag\].*(loaded|skipped|not present)" "$LOGS/server.log" | sed 's/^/    /'
else
  echo "backend: FAILED (see $LOGS/server.log)"; exit 1
fi

# ---- 3. optional public tunnel --------------------------------------------
if [ "${1:-}" = "--tunnel" ]; then
  if [ -f "$HOME/.cloudflared/config.yml" ]; then
    echo "tunnel: starting named tunnel (your domain) ..."
    nohup cloudflared tunnel run > "$LOGS/tunnel.log" 2>&1 &
  else
    echo "tunnel: no named tunnel configured, using a temporary quick tunnel"
    nohup cloudflared tunnel --url http://localhost:8080 --no-autoupdate > "$LOGS/tunnel.log" 2>&1 &
    for i in $(seq 1 30); do
      grep -qE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOGS/tunnel.log" 2>/dev/null && break
      sleep 2
    done
    grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOGS/tunnel.log" | head -1 | sed 's/^/    public url: /'
  fi
fi

echo
echo "frontend:  npm run dev     (then open http://localhost:4000)"
echo "stop all:  ./start-legalcare.sh --stop"
