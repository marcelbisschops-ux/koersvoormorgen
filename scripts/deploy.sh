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
#
# 18 sep 2026 (Checkpoint 2): ná de staging-deploy draait hier ook de vaste 3-rollen-
# regressietest (tests/e2e-3rollen-regressie.spec.js) als release-kwaliteitshek — 16/16
# deterministisch is altijd verplicht; de 2 AI-tests alleen op expliciet verzoek (zie
# draai_regressietest() hieronder). set -e (hieronder) zorgt dat een falende test het hele
# script stopt, vóór de productie-prompt ooit wordt getoond — geen aparte foutafhandeling nodig.
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

# Release-kwaliteitshek (Checkpoint 2, 18 sep 2026): draait de vaste 3-rollen-regressietest tegen
# staging. 16/16 deterministisch is ALTIJD verplicht — geen manier om dit over te slaan. De 2 echte
# AI-tests (document-extractie + risicoraamwerk) draaien alleen als hier expliciet "ja" op wordt
# geantwoord; standaard "nee" laat de dagelijkse CI-cron die dekking leveren. Bewust geen
# automatische detectie van "raakt deze wijziging AI-bestanden" — Marcel, 18 sep 2026: te fragiel,
# een directe vraag aan de mens die de wijziging het beste kent is simpeler en feilloos actueel.
draai_regressietest() {
  echo ""
  echo "════════ REGRESSIETEST · STAGING (release-kwaliteitshek) ════════"
  cd "$FE_DIR"
  set -a && source tests/.env.staging.local && set +a
  export WORKER_URL="https://kantoorinzicht-staging.marcel-bisschops.workers.dev"

  echo ""
  read -rp "Deze deploy bevat wijzigingen die AI-functionaliteit kunnen beïnvloeden. Wil je de 2 AI-regressietests uitvoeren? (ja/nee): " DOE_AI_NU
  if [ "$DOE_AI_NU" = "ja" ]; then
    echo "→ 18/18 (incl. 2 echte AI-tests — kost enkele centen, duurt ~2 min)"
    KVM_DOE_AI=1 npx playwright test tests/e2e-3rollen-regressie.spec.js
    echo "✓ 18/18 groen — regressietest is geen blokkade voor productie."
  else
    echo "→ 16/16 deterministische tests (verplichte release gate)"
    npx playwright test tests/e2e-3rollen-regressie.spec.js
    echo "✓ 16/16 groen — regressietest is geen blokkade voor productie."
  fi
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
  ""|backend|alles) deploy_backend_staging; draai_regressietest; deploy_backend_prod; deploy_frontend_status ;;
  frontend)         deploy_frontend_status ;;
  *) echo "Gebruik: scripts/deploy.sh [backend|staging|frontend]"; exit 2 ;;
esac

echo ""
echo "Klaar."
