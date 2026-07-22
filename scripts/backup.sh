#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# KantoorInzicht — back-up van klantdata (D1) + backend-code
#
# Wat dit doet:
#   1. Exporteert de VOLLEDIGE database (alle trajecten, DD-data, gebruikers,
#      documenten-metadata, waarderingen, audit) naar een gedateerd .sql-bestand.
#   2. Haalt de geüploade documenten uit R2 op (incrementeel — alleen nieuwe).
#   3. Ververst de backend-codekopie in de repo (backend/) vanuit ~/Downloads,
#      zodat de git-backup van de worker actueel blijft.
#   4. Ruimt database-back-ups ouder dan 60 dagen op.
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
DOWNLOADS_WORKER="$HOME/Downloads/cloudflare-worker.js"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M)"

mkdir -p "$BACKUP_DIR"

echo "▶ 1/4  Database exporteren (kantoorinzicht) ..."
OUT="$BACKUP_DIR/kantoorinzicht_$STAMP.sql"
# --remote = de live productie-database (niet een lokale kopie)
( cd "$HOME/Downloads" && npx wrangler d1 export kantoorinzicht --remote --output="$OUT" ) >/dev/null 2>&1
if [ -s "$OUT" ]; then
  TABELLEN=$(grep -c "CREATE TABLE" "$OUT" || true)
  echo "   ✓ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1), $TABELLEN tabellen)"
else
  echo "   ✗ Export mislukt — geen bestand geschreven. Controleer 'npx wrangler whoami'."
  exit 1
fi

echo "▶ 2/4  Documenten (R2) ophalen ..."
DOCS_DIR="$BACKUP_DIR/documenten"
mkdir -p "$DOCS_DIR"
# De database is de bron van waarheid voor welke bestanden in R2 staan (r2_key).
KEYS=$( ( cd "$HOME/Downloads" && npx wrangler d1 execute kantoorinzicht --remote --json \
  --command "SELECT r2_key FROM mna_documenten WHERE r2_key IS NOT NULL AND r2_key != ''" ) 2>/dev/null \
  | { grep -o '"r2_key": "[^"]*"' || true; } | sed 's/"r2_key": "//;s/"//' )
DOC_OK=0; DOC_SKIP=0
if [ -n "$KEYS" ]; then
  while IFS= read -r KEY; do
    [ -z "$KEY" ] && continue
    DEST="$DOCS_DIR/$KEY"
    if [ -f "$DEST" ]; then DOC_SKIP=$((DOC_SKIP+1)); continue; fi  # al gebackupt (documenten wijzigen niet)
    mkdir -p "$(dirname "$DEST")"
    if ( cd "$HOME/Downloads" && npx wrangler r2 object get "kantoorinzicht-docs/$KEY" --file="$DEST" --remote ) >/dev/null 2>&1 && [ -s "$DEST" ]; then
      DOC_OK=$((DOC_OK+1))
    else
      rm -f "$DEST"; echo "   ⚠ kon niet ophalen: $KEY"
    fi
  done <<< "$KEYS"
  echo "   ✓ $DOC_OK nieuw opgehaald, $DOC_SKIP al aanwezig ($DOCS_DIR)"
else
  echo "   ⊘ geen documenten in R2 (of database niet bereikbaar)"
fi

echo "▶ 3/4  Backend-code in repo verversen ..."
if [ -f "$DOWNLOADS_WORKER" ]; then
  cp "$DOWNLOADS_WORKER" "$REPO_DIR/backend/cloudflare-worker.js"
  [ -f "$HOME/Downloads/wrangler.toml" ] && cp "$HOME/Downloads/wrangler.toml" "$REPO_DIR/backend/wrangler.toml"
  # Sinds de gefaseerde workeropsplitsing (juli 2026) staat een deel van de backend ook als
  # losse modules in ~/Downloads/worker/ — die horen bij dezelfde backup mee te gaan.
  if [ -d "$HOME/Downloads/worker" ]; then
    mkdir -p "$REPO_DIR/backend/worker"
    cp "$HOME/Downloads"/worker/*.js "$REPO_DIR/backend/worker/" 2>/dev/null || true
    echo "   ✓ backend/cloudflare-worker.js + backend/worker/*.js bijgewerkt (commit + push om te backuppen naar GitHub)"
  else
    echo "   ✓ backend/cloudflare-worker.js bijgewerkt (commit + push om te backuppen naar GitHub)"
  fi
else
  echo "   ⊘ ~/Downloads/cloudflare-worker.js niet gevonden — backend-kopie overgeslagen"
fi

echo "▶ 4/4  Oude database-back-ups opruimen (>60 dagen) ..."
find "$BACKUP_DIR" -maxdepth 1 -name "kantoorinzicht_*.sql" -mtime +60 -delete 2>/dev/null || true
AANTAL=$(ls -1 "$BACKUP_DIR"/kantoorinzicht_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "   ✓ $AANTAL database-back-up(s) in $BACKUP_DIR"

echo ""
echo "Klaar. Bewaar $BACKUP_DIR op een plek los van Cloudflare (iCloud Drive / externe schijf)."
echo "Terugzetten (in geval van nood): zie scripts/README-backup.md"
