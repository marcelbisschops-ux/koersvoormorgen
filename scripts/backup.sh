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
    BACKUP_DIR="$ICLOUD_BASE/KantoorInzicht-Backups"
  else
    BACKUP_DIR="$HOME/KantoorInzicht-Backups"
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
# --remote = de live productie-database (niet een lokale kopie)
( cd "$BACKEND_DIR" && npx wrangler d1 export kantoorinzicht --remote --output="$OUT" ) &
EXPORT_PID=$!
( sleep "$EXPORT_TIMEOUT" && kill -TERM "$EXPORT_PID" 2>/dev/null ) &
WATCHER_PID=$!
if wait "$EXPORT_PID" 2>/dev/null; then EXPORT_STATUS=0; else EXPORT_STATUS=$?; fi
kill "$WATCHER_PID" 2>/dev/null || true
wait "$WATCHER_PID" 2>/dev/null || true

if [ "$EXPORT_STATUS" -ne 0 ]; then
  echo "   ✗ Export mislukt of vastgelopen (exitcode $EXPORT_STATUS, timeout ${EXPORT_TIMEOUT}s) — zie eventuele foutmelding hierboven." >&2
  exit 1
fi
if [ -s "$OUT" ]; then
  TABELLEN=$(grep -c "CREATE TABLE" "$OUT" || true)
  echo "   ✓ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1), $TABELLEN tabellen)"
else
  echo "   ✗ Export mislukt — geen bestand geschreven. Controleer 'npx wrangler whoami'." >&2
  exit 1
fi

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

echo ""
echo "Klaar. Bewaar $BACKUP_DIR op een plek los van Cloudflare (iCloud Drive / externe schijf)."
echo "Terugzetten (in geval van nood): zie scripts/README-backup.md"
