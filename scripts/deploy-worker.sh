#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# KantoorInzicht — veilige deploy van de worker
#
# Wat dit doet: draait ALTIJD eerst de syntax-check, de statische
# veiligheidsaudit en de API-testsuite (tegen staging, niet productie). Pas
# als die alle drie groen zijn, wordt eerst naar staging en dan naar
# productie gedeployed. Zo kan een fix die de tests niet gehaald heeft nooit
# per ongeluk live komen te staan.
#
# Bijgewerkt 25 juli 2026 (audit-fix P2): de backend-repo
# (~/Documents/GitHub/koersvoormorgen-backend/backend/) is nu de canonieke
# bron — dit script kopieerde voorheen vanuit ~/Downloads, dat na de
# repo-splitsing van 23 juli 2026 niet meer werd bijgewerkt en dus stille
# schade zou hebben aangericht bij gebruik. Geen kopieerstap meer nodig.
#
# Gebruik:
#   ADMIN_KEY=xxx bash scripts/deploy-worker.sh
#
# Noodgeval (audit/tests bewust overslaan, alleen met expliciete reden):
#   ADMIN_KEY=xxx SKIP_TESTS=1 bash scripts/deploy-worker.sh
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/../koersvoormorgen-backend/backend"
WORKER_SRC="$BACKEND_DIR/cloudflare-worker.js"

if [ ! -f "$WORKER_SRC" ]; then
  echo "✗ Worker-bestand niet gevonden op $WORKER_SRC" >&2
  echo "  Verwacht de backend-repo als sibling-map naast deze repo." >&2
  exit 1
fi

echo "── 1/4 · Syntax-check (entry + modules) ──"
node --check "$WORKER_SRC"
for f in "$BACKEND_DIR"/worker/*.js; do
  node --check "$f"
done
echo "✓ Syntax OK"

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

  echo "── 3/4 · API-testsuite tegen STAGING (Deel A) ──"
  if [ -z "${ADMIN_KEY:-}" ]; then
    echo "✗ ADMIN_KEY niet gezet — kan de testsuite niet draaien. Deploy gestopt." >&2
    echo "  Gebruik: ADMIN_KEY=xxx bash scripts/deploy-worker.sh (staging-ADMIN_KEY, niet productie)" >&2
    exit 1
  fi
  if ! WORKER_URL="https://kantoorinzicht-staging.marcel-bisschops.workers.dev" node "$REPO_DIR/tests/e2e-api.mjs" --key="$ADMIN_KEY"; then
    echo "✗ API-testsuite tegen staging gefaald — deploy gestopt." >&2
    exit 1
  fi
  echo "✓ Testsuite groen op staging"
fi

echo "── 4a/4 · Eerst deployen naar STAGING ──"
cd "$BACKEND_DIR"
npx wrangler deploy cloudflare-worker.js --env=staging

echo "── 4b/4 · Deployen naar PRODUCTIE ──"
npx wrangler deploy cloudflare-worker.js

echo ""
echo "✓ Deploy voltooid (staging + productie)."
