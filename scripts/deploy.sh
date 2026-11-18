#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# Koers voor Morgen — standaard deploy
#
# Twee onderdelen, in deze volgorde:
#   1. BACKEND (Cloudflare Worker)   — staging → verplichte regressietest → productie
#   2. FRONTEND (Cloudflare Pages)   — wrangler pages deploy: preview → productie
#
# Gebruik:
#   scripts/deploy.sh            # BACKEND (staging → regressie → productie) + FRONTEND (preview → productie)
#   scripts/deploy.sh staging    # alleen backend-staging (geen productie)
#   scripts/deploy.sh backend    # alleen backend: staging → regressie → productie
#   scripts/deploy.sh frontend   # alleen frontend: preview → productie
#
# Beleid productie-doorgang (Marcel, 23 sep 2026 — vervangt de eerdere "altijd expliciet
# akkoord per keer"-afspraak van 12 sep 2026 voor het standaardpad van dit script):
#   🟢 staging-deploy + verplichte regressietest volledig groen → het script gaat
#      automatisch door naar productie, zonder aparte bevestigingsvraag.
#   🟠 / 🔴 (regressietest faalt, of staging-/preview-deploy faalt) → productie wordt
#      NIET gestart; het script stopt vóór productie met een duidelijke melding.
#   Dit geldt voor het standaardpad van dit script. Het ontslaat niemand van de aparte,
#   inhoudelijke staging-beoordeling die voor risicovolle wijzigingen nodig kan zijn
#   (zie CLAUDE.md) — dat is een menselijke afweging vóórdat dit script gestart wordt,
#   geen stap die dit script zelf afdwingt.
#
# scripts/deploy-worker.sh is GEEN regulier releasepad meer (verouderd, niet bijgewerkt
# voor dit beleid) — gebruik dit script.
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
# draai_regressietest() hieronder). De uitkomst wordt expliciet als 🟢/🔴 vastgelegd in
# $REGRESSIE_STATUS en vóór elke productiestap gecontroleerd.
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

# 12-11-2026 (releasegate N-203): releases worden vanuit een releasewerkboom gebouwd, niet vanuit de hoofdcheckout.
# Zonder deze overschrijving werd het script in de praktijk omzeild met losse commando's (precies waar de gate brak).
FE_DIR="${KVM_FE_DIR:-$HOME/Documents/GitHub/koersvoormorgen}"
BE_DIR="${KVM_BE_DIR:-$HOME/Documents/GitHub/koersvoormorgen-backend/backend}"
WORKER_URL="https://kantoorinzicht.marcel-bisschops.workers.dev"
PAGES_PROJECT="kantoorinzicht-frontend"
WAT="${1:-alles}"
REGRESSIE_STATUS="onbekend"

# ── Releaseherkomst (Marcel 18-11-2026) ─────────────────────────────────────────────────────────────────────
# GitHub is leidend. Elke deploy komt uit een schone werkboom met een commit die op GitHub staat; productie alleen
# uit de geschiedenis van main. Elke Worker-versie krijgt de commit als tag. Na productie controleert
# scripts/releaseherkomst.mjs of wat werkelijk draait herleidbaar is; bij een afwijking: waarschuwen en stoppen,
# nooit automatisch overschrijven. Productie vraagt altijd Marcels expliciete GO per release (besluit 18-11-2026).
herkomst_controle() { # $1 = repo-map, $2 = 'main' (productie) of 'branch' (staging/preview); zet HERKOMST_COMMIT
  local map="$1" eis="$2" root
  root=$(git -C "$map" rev-parse --show-toplevel)
  if [ -n "$(git -C "$root" status --porcelain --untracked-files=no)" ]; then
    echo "🔴 Releaseherkomst: werkboom $root heeft niet-vastgelegde wijzigingen — niet uitrollen."; exit 1
  fi
  git -C "$root" fetch -q origin
  HERKOMST_COMMIT=$(git -C "$root" rev-parse HEAD)
  if [ "$eis" = "main" ]; then
    git -C "$root" merge-base --is-ancestor "$HERKOMST_COMMIT" origin/main \
      || { echo "🔴 Releaseherkomst: commit ${HERKOMST_COMMIT:0:12} staat niet in de geschiedenis van origin/main — productie alleen vanaf main."; exit 1; }
  else
    [ -n "$(git -C "$root" branch -r --contains "$HERKOMST_COMMIT" 2>/dev/null)" ] \
      || { echo "🔴 Releaseherkomst: commit ${HERKOMST_COMMIT:0:12} staat nog niet op GitHub — eerst pushen."; exit 1; }
  fi
  echo "🟢 Releaseherkomst: ${HERKOMST_COMMIT:0:12} ($(git -C "$root" log -1 --format=%s "$HERKOMST_COMMIT" | cut -c1-70))"
}
vraag_release_go() { # $1 = onderdeel; vereist expliciete GO voor exact deze commit
  local kort="${HERKOMST_COMMIT:0:12}" antw
  if [ "${KVM_RELEASE_GO:-}" = "$kort" ]; then echo "🟢 GO Marcel voor $1 ${kort} (KVM_RELEASE_GO)."; return 0; fi
  if [ -t 0 ]; then
    read -rp "Productierelease $1 commit $kort. Alleen met GO van Marcel: typ 'GO $kort' om door te gaan: " antw
    [ "$antw" = "GO $kort" ] && return 0
  fi
  echo "🔴 Geen expliciete GO voor $1 ${kort} — productie wordt NIET gestart."; exit 1
}
controleer_productieherkomst() {
  if node "$FE_DIR/scripts/releaseherkomst.mjs"; then return 0; fi
  echo "🔴 AFWIJKING: de draaiende productie is niet herleidbaar tot GitHub (zie hierboven). Niets overschreven; onderzoek voordat je verdergaat."
  exit 1
}

deploy_backend_staging() {
  echo ""
  echo "════════ BACKEND · STAGING ════════"
  herkomst_controle "$BE_DIR" branch
  cd "$BE_DIR"
  npx wrangler deploy cloudflare-worker.js --env=staging --tag "${HERKOMST_COMMIT:0:12}" --message "commit $HERKOMST_COMMIT"
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
    if KVM_DOE_AI=1 npx playwright test tests/e2e-3rollen-regressie.spec.js; then
      echo "🟢 18/18 groen."
      REGRESSIE_STATUS="groen"
    else
      echo "🔴 Regressietest gefaald (niet alle 18 groen)."
      REGRESSIE_STATUS="rood"
    fi
  else
    echo "→ 16/16 deterministische tests (verplichte release gate)"
    if npx playwright test tests/e2e-3rollen-regressie.spec.js; then
      echo "🟢 16/16 groen."
      REGRESSIE_STATUS="groen"
    else
      echo "🔴 Regressietest gefaald (niet alle 16 groen)."
      REGRESSIE_STATUS="rood"
    fi
  fi
}

# Beleid: tot 18-11-2026 ging het standaardpad bij 🟢 automatisch door naar productie (23 sep 2026); sinds
# 18-11-2026 vraagt productie altijd Marcels expliciete GO per release (vraag_release_go). Bij alles anders dan 🟢 (🔴 hier;
# een eventuele 🟠 — automatisch deel groen maar een menselijke controle nog open — is voor
# dit script gelijk aan stoppen, want dit script kan die controle zelf niet vaststellen)
# stopt het script vóór productie.
deploy_backend_prod() {
  echo ""
  if [ "$REGRESSIE_STATUS" != "groen" ]; then
    echo "🔴 Geen groen regressiebewijs (status: $REGRESSIE_STATUS) — productie wordt NIET gestart."
    echo "Los eerst de fout op en start het script opnieuw."
    exit 1
  fi
  echo "🟢 Staging + regressietest volledig groen."
  herkomst_controle "$BE_DIR" main
  vraag_release_go backend
  echo ""
  echo "════════ BACKEND · PRODUCTIE ════════"
  cd "$BE_DIR"
  npx wrangler deploy cloudflare-worker.js --tag "${HERKOMST_COMMIT:0:12}" --message "commit $HERKOMST_COMMIT (main)"
  echo ""
  echo -n "Health check: "
  curl -s "$WORKER_URL/health" || echo "(health-check mislukt — controleer handmatig)"
  echo ""
  controleer_productieherkomst
  echo "Rollback indien nodig: vorige Version ID opnieuw deployen (staat in de output hierboven)."
}

# Frontend-publicatie sinds 12 sep 2026: Cloudflare Pages (project "$PAGES_PROJECT"),
# niet meer GitHub Pages (die staat er nog, ongebruikt, als bewuste noodval — zie CLAUDE.md
# "Infrastructuur"). Elke `wrangler pages deploy` krijgt een eigen preview-URL; alleen een
# deploy op de productie-branch (main) raakt ook koersvoormorgen.nl. Preview eerst, dan pas
# productie — zelfde 🟢/🔴-beleid als de backend hierboven.
#
# N-83 (27 sep 2026, structurele fix): deployt sindsdien NIET meer de hele repo-map (`.`), maar een
# allowlist-gebaseerde build-output (`scripts/build-frontend-release.mjs` → `.pages-dist/`) — zie dat
# script voor de toelichting. `functions/_middleware.js` blijft als tweede verdedigingslaag bestaan.
# Vóór én ná elke deploy draait de verplichte negatieve releasetest
# (`tests/verify-n83-geen-publieke-lek.mjs`) — faalt die, dan stopt het script vóór productie.
deploy_frontend() {
  echo ""
  echo "════════ FRONTEND · BUILD (allowlist-gebaseerd, N-83) ════════"
  cd "$FE_DIR"
  node scripts/build-frontend-release.mjs

  echo ""
  echo "════════ FRONTEND · CLOUDFLARE PAGES (preview) ════════"
  PREVIEW_LOG=$(mktemp)
  if npx wrangler pages deploy .pages-dist --project-name="$PAGES_PROJECT" --branch=preview | tee "$PREVIEW_LOG"; then
    echo ""
    echo "🟢 Preview-deploy gelukt (preview-URL hierboven)."
  else
    echo ""
    echo "🔴 Preview-deploy gefaald — productie (koersvoormorgen.nl) wordt NIET aangeraakt."
    rm -f "$PREVIEW_LOG"
    exit 1
  fi
  # N-83-nasleep (27 sep 2026): de branch-ALIAS-URL (preview.kantoorinzicht-frontend.pages.dev) bleek
  # in de praktijk verouderde/gecachte responses te kunnen teruggeven kort na een deploy — de
  # negatieve test daartegen gaf dan valse meldingen. Test daarom tegen de exacte, unieke
  # deployment-hash-URL die wrangler zelf net printte (nooit gecached van een eerdere deploy).
  PREVIEW_URL=$(grep -oE 'https://[a-z0-9]+\.kantoorinzicht-frontend\.pages\.dev' "$PREVIEW_LOG" | head -1)
  rm -f "$PREVIEW_LOG"
  if [ -z "$PREVIEW_URL" ]; then
    echo "🔴 Kon de preview-deployment-URL niet uit de wrangler-output halen — productie wordt NIET aangeraakt."
    exit 1
  fi

  echo ""
  echo "════════ FRONTEND · NEGATIEVE RELEASETEST (N-83, verplicht vóór productie) ════════"
  # Releasegate (12-11-2026): het previewresultaat wordt vastgelegd voor exact deze build. Rood = harde
  # blokkade voor deze build, ook als een latere controle groen zou zijn (scripts/frontend-release-gate.mjs).
  if ! node scripts/frontend-release-gate.mjs preview "$PREVIEW_URL"; then
    echo ""
    echo "🔴 N-83-releasegate faalt op de preview — productie (koersvoormorgen.nl) wordt NIET aangeraakt."
    exit 1
  fi
  echo "🟢 Negatieve releasetest groen."
  herkomst_controle "$FE_DIR" main
  vraag_release_go frontend

  echo ""
  echo "════════ FRONTEND · CLOUDFLARE PAGES (productie) ════════"
  if ! node scripts/frontend-release-gate.mjs check; then
    echo "🔴 Releasegate: geen geldige groene preview voor deze build — productie wordt NIET aangeraakt."
    exit 1
  fi
  npx wrangler pages deploy .pages-dist --project-name="$PAGES_PROJECT" --branch=main
  controleer_productieherkomst
  echo ""
  echo "════════ FRONTEND · NEGATIEVE RELEASETEST (N-83, controle op productie zelf) ════════"
  if ! node tests/verify-n83-geen-publieke-lek.mjs "https://koersvoormorgen.nl"; then
    echo ""
    echo "🔴 N-83-releasegate faalt op PRODUCTIE zelf — direct onderzoeken (mogelijk een CDN-cache-"
    echo "vertraging; her-run dit losse commando over enkele seconden voordat je iets anders aanneemt)."
    exit 1
  fi
  echo "🟢 Productie geverifieerd: geen interne bestanden publiek bereikbaar."
  echo ""
  echo "Live op https://koersvoormorgen.nl — vraag Marcel om een hard-refresh (Cmd+Shift+R)."
}

case "$WAT" in
  staging)   deploy_backend_staging ;;
  ""|alles)  deploy_backend_staging; draai_regressietest; deploy_backend_prod; deploy_frontend ;;
  backend)   deploy_backend_staging; draai_regressietest; deploy_backend_prod ;;
  frontend)  deploy_frontend ;;
  *) echo "Gebruik: scripts/deploy.sh [backend|staging|frontend]"; exit 2 ;;
esac

echo ""
echo "Klaar."
