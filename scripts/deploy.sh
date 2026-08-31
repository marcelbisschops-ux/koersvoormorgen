#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# Koers voor Morgen — standaard deploy
#
# Twee onderdelen, in deze volgorde:
#   1. BACKEND (Cloudflare Worker)  — staging → testen → productie
#   2. FRONTEND (GitHub Pages)      — git push naar main
#
# Gebruik:
#   scripts/deploy.sh            # backend (staging + productie) + daarna frontend-reminder
#   scripts/deploy.sh backend    # alleen backend
#   scripts/deploy.sh frontend   # alleen frontend
#   scripts/deploy.sh staging    # alleen backend-staging (geen productie)
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

deploy_frontend() {
  echo ""
  echo "════════ FRONTEND · GITHUB PAGES ════════"
  cd "$FE_DIR"
  if [ -z "$(git status --porcelain)" ]; then
    echo "Geen wijzigingen in de frontend-repo — niets te pushen."
    return
  fi
  echo "Nog niet gepusht:"
  git status --short
  echo ""
  echo "Pushen doe je zoals altijd (GitHub Desktop, of hieronder via CLI)."
  read -rp "Nu committen + pushen via CLI? Geef een commit-bericht (leeg = overslaan): " MSG
  if [ -n "$MSG" ]; then
    git add -A
    git commit -m "$MSG"
    git push origin main    # pre-push hook draait tests/audit-consistentie.mjs
    echo "✓ Gepusht. GitHub Pages publiceert binnen 1-2 min — daarna Cmd+Shift+R (hard refresh)."
  else
    echo "Frontend overgeslagen — push zelf via GitHub Desktop wanneer je klaar bent."
  fi
}

case "$WAT" in
  staging)  deploy_backend_staging ;;
  backend)  deploy_backend_staging; deploy_backend_prod ;;
  frontend) deploy_frontend ;;
  alles)    deploy_backend_staging; deploy_backend_prod; deploy_frontend ;;
  *) echo "Gebruik: scripts/deploy.sh [alles|backend|frontend|staging]"; exit 2 ;;
esac

echo ""
echo "Klaar."
