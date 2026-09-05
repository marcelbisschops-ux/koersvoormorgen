#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# KantoorInzicht — back-up van klantdata (D1)
#
# Wat dit doet:
#   1. Exporteert de VOLLEDIGE database (alle trajecten, DD-data, gebruikers,
#      documenten-metadata, waarderingen, audit) naar een gedateerd .sql-bestand.
#   2. Haalt de geüploade documenten uit R2 op (incrementeel — alleen nieuwe).
#   3. Herinnert eraan om openstaande wijzigingen in de backend-repo te committen/pushen
#      (de backend-code zelf is sinds 25 juli 2026 canoniek in
#      ~/Documents/GitHub/koersvoormorgen-backend/backend/ — dat IS al de git-back-up,
#      dit script hoeft er niets meer naartoe te kopiëren).
#   4. Ruimt database-back-ups ouder dan 60 dagen op.
#
# Bijgewerkt 25 juli 2026 (audit-fix P1/P3): dit script draaide voorheen vanuit/naar
# ~/Downloads, dat na de repo-splitsing van 23 juli 2026 niet meer werd bijgewerkt —
# stap 3 kopieerde daardoor mogelijk VEROUDERDE code overheen in de canonieke
# backend-repo (een "backup" die actief schade had kunnen aanrichten). Gefixt.
#
# De .sql-dump bevat KLANTDATA en wordt bewust BUITEN de git-repo opgeslagen
# (standaard ~/KantoorInzicht-Backups). Zet die map in iCloud Drive of op een
# externe schijf zodat de back-up los van het draaiende systeem (Cloudflare) staat.
#
# Gebruik:   bash scripts/backup.sh
#            BACKUP_DIR="/Volumes/Backup/KI" bash scripts/backup.sh   (eigen locatie)
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

# Standaard: iCloud Drive (staat los van Cloudflare én van dit apparaat).
# Val terug op de home-map als iCloud Drive niet beschikbaar is.
ICLOUD_BASE="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
if [ -z "${BACKUP_DIR:-}" ]; then
  if [ -d "$ICLOUD_BASE" ]; then
    BACKUP_DIR="$ICLOUD_BASE/KoersVoorMorgen-Backups"
  else
    BACKUP_DIR="$HOME/KoersVoorMorgen-Backups"
  fi
fi
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_REPO_DIR="$HOME/Documents/GitHub/koersvoormorgen-backend"
BACKEND_DIR="$BACKEND_REPO_DIR/backend"
STAMP="$(date +%Y-%m-%d_%H%M)"

if [ ! -f "$BACKEND_DIR/wrangler.toml" ]; then
  echo "✗ $BACKEND_DIR/wrangler.toml niet gevonden — kan D1/R2 niet bereiken. Backup gestopt." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Audit-fix P1 (5 sep 2026): meldt het resultaat van deze run aan de Worker, zodat een mislukking
# een e-mailalert oplevert (bestaande Resend-route, hergebruikt) i.p.v. alleen zichtbaar te zijn in
# een lokaal logbestand dat niemand actief in de gaten houdt. ADMIN_KEY komt uit de omgeving (in de
# launchd-plist gezet, niet in dit script of git) — ontbreekt hij (bijv. een handmatige run zonder
# ~/.zshrc geladen), dan wordt de melding overgeslagen, nooit de back-up zelf geblokkeerd.
meld_backup_status() {
  local ok="$1" details="$2"
  if [ -z "${ADMIN_KEY:-}" ]; then
    echo "   ⊘ ADMIN_KEY niet in de omgeving — melding aan de worker overgeslagen." >&2
    return 0
  fi
  curl -s -m 15 -X POST -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" \
    "https://kantoorinzicht.marcel-bisschops.workers.dev/mna/admin/veiligheid/backup-melding" \
    -d "{\"ok\":$ok,\"details\":$(printf '%s' "$details" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')}" \
    >/dev/null 2>&1 || echo "   ⊘ Melding aan de worker mislukte (netwerk?) — geen blokkade van de back-up zelf." >&2
}

# Audit-fix P1 (24 aug 2026, zevende heraudit): de export hieronder stond drie dagen op rij
# (22/23 augustus) stil, exact ná deze regel, zonder één foutregel in het launchd-logbestand
# (~/Library/Logs/kantoorinzicht-backup.log) — de oorzaak was zelf-veroorzaakte blindheid: alle
# output van het wrangler-commando ging naar /dev/null, dus zelfs een harde fout of een hangende
# interactieve prompt (macOS heeft geen ingebouwde 'timeout'-command, dus zoiets zou voor altijd
# blijven hangen) liet nul sporen na. Twee onafhankelijke maatregelen hieronder:
#  1. Geen output-onderdrukking meer — alles stroomt door naar het launchd-logbestand.
#  2. Een handmatige timeout (10 min) rond het commando, zodat een hang een duidelijke, geloggde
#     mislukking wordt in plaats van een script dat voor altijd blijft hangen.
# WRANGLER_SEND_METRICS/CI verkleinen de kans op een interactieve telemetrie-/consent-prompt die in
# deze niet-interactieve launchd-context nooit een antwoord zou krijgen.
# Root cause NIET vastgesteld binnen deze sessie: een handmatige herhaling van exact hetzelfde
# commando (interactief, in deze sessie) lukte meteen — dat wijst op iets specifiek aan de
# launchd-achtergrondcontext (bijv. een TCC/Full Disk Access-regressie, zelfde categorie als het
# eerdere back-up-incident van 25 juli 2026) die alleen Marcel op zijn eigen Mac kan onderzoeken/
# oplossen (System Settings → Privacy & Security → Full Disk Access controleren, of
# `launchctl kickstart -k` draaien en Console.app/Activiteitenweergave live meekijken).
export WRANGLER_SEND_METRICS=false CI=true
echo "▶ 1/4  Database exporteren (kantoorinzicht) ..."
OUT="$BACKUP_DIR/kantoorinzicht_$STAMP.sql"
EXPORT_TIMEOUT=600

# Audit-fix P1 (5 sep 2026, na een hernieuwde mislukking op 4→5 sep): het wrangler-debuglog van die
# mislukking liet zien dat het proces vastliep op één enkel netwerkverzoek naar Cloudflare (GET
# /client/v4/memberships), niet op een geweigerde inlog — past bij een kortstondige netwerkhapering
# rond het geplande tijdstip (bijv. Mac net wakker, wifi nog niet volledig verbonden). Eén
# automatische herkansing na een korte pauze vangt precies dit scenario op zonder de wrangler-
# authenticatie zelf aan te hoeven passen.
probeer_export() {
  ( cd "$BACKEND_DIR" && npx wrangler d1 export kantoorinzicht --remote --output="$OUT" ) &
  local export_pid=$!
  ( sleep "$EXPORT_TIMEOUT" && kill -TERM "$export_pid" 2>/dev/null ) &
  local watcher_pid=$!
  if wait "$export_pid" 2>/dev/null; then local status=0; else local status=$?; fi
  kill "$watcher_pid" 2>/dev/null || true
  wait "$watcher_pid" 2>/dev/null || true
  return "$status"
}

EXPORT_FOUTMELDING=""
if probeer_export; then
  EXPORT_STATUS=0
else
  EXPORT_STATUS=$?
  echo "   ⚠ Eerste poging mislukt/vastgelopen (exitcode $EXPORT_STATUS) — 2 minuten wachten en één keer herkansen ..." >&2
  sleep 120
  if probeer_export; then
    EXPORT_STATUS=0
    echo "   ✓ Herkansing geslaagd."
  else
    EXPORT_STATUS=$?
    EXPORT_FOUTMELDING="Export mislukt of vastgelopen, ook na 1 herkansing (laatste exitcode $EXPORT_STATUS, timeout ${EXPORT_TIMEOUT}s per poging)."
  fi
fi

if [ "$EXPORT_STATUS" -ne 0 ] || [ ! -s "$OUT" ]; then
  [ -z "$EXPORT_FOUTMELDING" ] && EXPORT_FOUTMELDING="Export mislukt — geen (leeg) bestand geschreven, exitcode $EXPORT_STATUS."
  echo "   ✗ $EXPORT_FOUTMELDING Controleer 'npx wrangler whoami' en ~/Library/Logs/kantoorinzicht-backup.log." >&2
  meld_backup_status "false" "$EXPORT_FOUTMELDING"
  exit 1
fi
TABELLEN=$(grep -c "CREATE TABLE" "$OUT" || true)
echo "   ✓ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1), $TABELLEN tabellen)"

echo "▶ 2/4  Documenten (R2) ophalen ..."
DOCS_DIR="$BACKUP_DIR/documenten"
mkdir -p "$DOCS_DIR"
# De database is de bron van waarheid voor welke bestanden in R2 staan (r2_key).
KEYS=$( ( cd "$BACKEND_DIR" && npx wrangler d1 execute kantoorinzicht --remote --json \
  --command "SELECT r2_key FROM mna_documenten WHERE r2_key IS NOT NULL AND r2_key != ''" ) 2>/dev/null \
  | { grep -o '"r2_key": "[^"]*"' || true; } | sed 's/"r2_key": "//;s/"//' )
DOC_OK=0; DOC_SKIP=0
if [ -n "$KEYS" ]; then
  while IFS= read -r KEY; do
    [ -z "$KEY" ] && continue
    DEST="$DOCS_DIR/$KEY"
    if [ -f "$DEST" ]; then DOC_SKIP=$((DOC_SKIP+1)); continue; fi  # al gebackupt (documenten wijzigen niet)
    mkdir -p "$(dirname "$DEST")"
    if ( cd "$BACKEND_DIR" && npx wrangler r2 object get "kantoorinzicht-docs/$KEY" --file="$DEST" --remote ) >/dev/null 2>&1 && [ -s "$DEST" ]; then
      DOC_OK=$((DOC_OK+1))
    else
      rm -f "$DEST"; echo "   ⚠ kon niet ophalen: $KEY"
    fi
  done <<< "$KEYS"
  echo "   ✓ $DOC_OK nieuw opgehaald, $DOC_SKIP al aanwezig ($DOCS_DIR)"
else
  echo "   ⊘ geen documenten in R2 (of database niet bereikbaar)"
fi

echo "▶ 3/4  Backend-code-status controleren ..."
if [ ! -d "$BACKEND_REPO_DIR/.git" ]; then
  echo "   ⊘ $BACKEND_REPO_DIR bestaat niet (of is geen git-repo) — niets te controleren"
elif [ -n "$(cd "$BACKEND_REPO_DIR" && git status --porcelain 2>/dev/null)" ]; then
  echo "   ⚠ Er staan ongecommitte wijzigingen in $BACKEND_REPO_DIR — commit + push die zelf om ze veilig te stellen (dit script kopieert daar niets meer naartoe, de repo IS al de back-up)."
else
  echo "   ✓ $BACKEND_REPO_DIR is schoon (alles gecommit)"
fi

echo "▶ 4/4  Oude database-back-ups opruimen (>60 dagen) ..."
find "$BACKUP_DIR" -maxdepth 1 -name "kantoorinzicht_*.sql" -mtime +60 -delete 2>/dev/null || true
AANTAL=$(ls -1 "$BACKUP_DIR"/kantoorinzicht_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "   ✓ $AANTAL database-back-up(s) in $BACKUP_DIR"

meld_backup_status "true" "OK — $(basename "$OUT"), $TABELLEN tabellen, $DOC_OK nieuwe document(en)."

echo ""
echo "Klaar. Bewaar $BACKUP_DIR op een plek los van Cloudflare (iCloud Drive / externe schijf)."
echo "Terugzetten (in geval van nood): zie scripts/README-backup.md"
