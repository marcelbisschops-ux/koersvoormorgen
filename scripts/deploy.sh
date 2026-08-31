#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# Koers voor Morgen — standaard deploy
#
# Twee onderdelen, in deze volgorde:
#   1. BACKEND (Cloudflare Worker)  — staging → testen → productie
#   2. FRONTEND (GitHub Pages)      — git push naar main
#
# Gebruik:
#   scripts/deploy.sh            # BACKEND: staging → bevestigen → productie (+ health-check)
#   scripts/deploy.sh staging    # alleen backend-staging (geen productie)
#   scripts/deploy.sh frontend   # toont alleen de frontend-status (push zelf via GitHub Desktop)
#
# De frontend gaat NIET via dit script — die push je altijd zelf via GitHub Desktop.
#
# De backend-deploy draait AUTOMATISCH eerst backend/predeploy.sh (syntaxcheck +
# tests/audit-backend.mjs + melding aan het veiligheidsdashboard) via [build] in
# wrangler.toml. Bij een auditbevinding breekt de deploy af.
# Noodgeval (audit bewust overslaan, alleen met reden):
#   KVM_SKIP_PREDEPLOY=1 npx wrangler deploy cloudflare-worker.js
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

FE_DIR="$HOME/Documents/GitHub/koersvoormorgen"
BE_DIR="$HOME/Documents/GitHub/koersvoormorgen-backend/backend"
WORKER_URL="https://kantoorinzicht.marcel-bisschops.workers.dev"
WAT="${1:-alles}"

deploy_backend_staging() {
  echo ""
  echo "════════ BACKEND · STAGING ════════"
  cd "$BE_DIR"
  npx wrangler deploy cloudflare-worker.js --env=staging
  echo ""
  echo "Staging live: https://kantoorinzicht-staging.marcel-bisschops.workers.dev/health"
  echo "Test daar de gewijzigde route(s) vóór je verdergaat."
}

deploy_backend_prod() {
  echo ""
  read -rp "Staging getest en akkoord? Doorgaan naar PRODUCTIE? (ja/nee): " OK
  if [ "$OK" != "ja" ]; then
    echo "Productie overgeslagen. Later handmatig:"
    echo "  cd $BE_DIR && npx wrangler deploy cloudflare-worker.js"
    return
  fi
  echo ""
  echo "════════ BACKEND · PRODUCTIE ════════"
  cd "$BE_DIR"
  npx wrangler deploy cloudflare-worker.js
  echo ""
  echo -n "Health check: "
  curl -s "$WORKER_URL/health" || echo "(health-check mislukt — controleer handmatig)"
  echo ""
  echo "Rollback indien nodig: vorige Version ID opnieuw deployen (staat in de output hierboven)."
}

deploy_frontend_status() {
  echo ""
  echo "════════ FRONTEND · GITHUB PAGES ════════"
  cd "$FE_DIR"
  if [ -z "$(git status --porcelain)" ]; then
    echo "Geen openstaande frontend-wijzigingen."
  else
    echo "Nog niet gepusht (push zelf via GitHub Desktop):"
    git status --short
  fi
  echo "GitHub Pages publiceert 1-2 min na je push — daarna Cmd+Shift+R (hard refresh)."
}

case "$WAT" in
  staging)          deploy_backend_staging ;;
  ""|backend|alles) deploy_backend_staging; deploy_backend_prod; deploy_frontend_status ;;
  frontend)         deploy_frontend_status ;;
  *) echo "Gebruik: scripts/deploy.sh [backend|staging|frontend]"; exit 2 ;;
esac

echo ""
echo "Klaar."
