#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# KantoorInzicht — veilige deploy van de worker
#
# Wat dit doet: draait ALTIJD eerst de syntax-check, de statische
# veiligheidsaudit en de API-testsuite. Pas als die alle drie groen zijn,
# wordt de worker daadwerkelijk naar Cloudflare gedeployed. Zo kan een
# fix die de tests niet gehaald heeft nooit per ongeluk live komen te staan
# (afspraak in tests/README.md, tot 13-07-2026 niet consequent nageleefd).
#
# Gebruik:
#   ADMIN_KEY=xxx bash scripts/deploy-worker.sh
#
# Noodgeval (audit/tests bewust overslaan, alleen met expliciete reden):
#   ADMIN_KEY=xxx SKIP_TESTS=1 bash scripts/deploy-worker.sh
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_SRC="$HOME/Downloads/cloudflare-worker.js"

if [ ! -f "$WORKER_SRC" ]; then
  echo "✗ Worker-bestand niet gevonden op $WORKER_SRC" >&2
  exit 1
fi

echo "── 1/4 · Syntax-check ──"
node --check "$WORKER_SRC"
echo "✓ Syntax OK"

echo "── Backend-kopie synchroniseren naar git ──"
cp "$WORKER_SRC" "$REPO_DIR/backend/cloudflare-worker.js"

if [ "${SKIP_TESTS:-0}" = "1" ]; then
  echo "⚠ SKIP_TESTS=1 — audit en testsuite bewust overgeslagen. Alleen gebruiken met een expliciete reden."
else
  echo "── 2/4 · Statische veiligheidsaudit ──"
  if ! node "$REPO_DIR/tests/audit-consistentie.mjs"; then
    echo "✗ Audit heeft bevindingen — deploy gestopt. Controleer de bevindingen hierboven." >&2
    echo "  (Noodgeval? SKIP_TESTS=1 bash scripts/deploy-worker.sh — alleen met expliciete reden.)" >&2
    exit 1
  fi
  echo "✓ Audit schoon"

  echo "── 3/4 · API-testsuite (Deel A, snel/gratis) ──"
  if [ -z "${ADMIN_KEY:-}" ]; then
    echo "✗ ADMIN_KEY niet gezet — kan de testsuite niet draaien. Deploy gestopt." >&2
    echo "  Gebruik: ADMIN_KEY=xxx bash scripts/deploy-worker.sh" >&2
    exit 1
  fi
  if ! node "$REPO_DIR/tests/e2e-api.mjs" --key="$ADMIN_KEY"; then
    echo "✗ API-testsuite gefaald — deploy gestopt." >&2
    exit 1
  fi
  echo "✓ Testsuite groen"
fi

echo "── 4/4 · Deployen naar Cloudflare ──"
cd "$HOME/Downloads"
npx wrangler deploy cloudflare-worker.js

echo ""
echo "✓ Deploy voltooid."
