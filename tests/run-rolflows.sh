#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# Live rol-click-through-tests draaien tegen STAGING (nooit productie),
# met een aparte, staging-only ADMIN_KEY die nooit toegang tot productie
# geeft (werkregel 29, 12 sep 2026 — mechanisme i.p.v. nog een regel).
#
# Doel: Claude Code kan hiermee ZELF de rol-/rechten-tests uitvoeren die
# tot nu toe altijd overgeslagen werden ("SKIPPED") omdat er geen
# ADMIN_KEY beschikbaar was — zonder dat Marcel iedere keer handmatig
# een sleutel hoeft aan te leveren of te bevestigen.
#
# Vereist: tests/.env.staging.local (twee regels: ADMIN_KEY=... en
# WORKER_URL=...). Bestaat dat bestand niet, dan stopt dit script met
# een duidelijke foutmelding i.p.v. stil tegen productie te draaien.
#
# Veiligheid:
#   - WORKER_URL wijst hier altijd naar kantoorinzicht-staging, nooit
#     naar productie — ook al staat er per ongeluk een andere waarde in
#     de omgeving, dit script overschrijft die bewust.
#   - De sleutel in .env.staging.local is een EIGEN secret, apart gezet
#     via `wrangler secret put ADMIN_KEY --env=staging` — geen kopie van
#     en geen toegang tot de productie-ADMIN_KEY.
#   - Elke test maakt zijn eigen testtraject aan en ruimt dat aan het
#     eind zelf weer op (bestaand gedrag van tests/e2e-ui.spec.js).
# ══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="tests/.env.staging.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "✕ $ENV_FILE ontbreekt — geen staging-testsleutel beschikbaar."
  echo "  Opnieuw inrichten: zie tests/README.md, sectie 'Staging-testidentiteit'."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Nooit productie, ongeacht wat er in .env.staging.local staat aan WORKER_URL —
# dit script bestaat juist om per ongeluk tegen productie draaien te voorkomen.
export WORKER_URL="https://kantoorinzicht-staging.marcel-bisschops.workers.dev"

if [ -z "${ADMIN_KEY:-}" ]; then
  echo "✕ ADMIN_KEY niet gevonden in $ENV_FILE."
  exit 1
fi

echo "→ Rol-click-through-tests tegen STAGING ($WORKER_URL)"
npx playwright test tests/e2e-ui.spec.js "$@"
