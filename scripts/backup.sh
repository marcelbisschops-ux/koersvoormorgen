#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# KantoorInzicht — back-up van klantdata (D1)
#
# Wat dit doet:
#   1. Exporteert de VOLLEDIGE database (alle trajecten, DD-data, gebruikers,
#      documenten-metadata, waarderingen, audit) naar een gedateerd .sql-bestand.
#   2. Haalt de geüploade documenten uit R2 op (incrementeel — alleen nieuwe).
#   3. Kopieert de lokale, bewust niet-gecommitte .md-documentatie (CLAUDE.md, het technisch
#      overdrachtsdocument, BACKLOG.md e.d. — zie .gitignore /*.md) mee, zodat operationele kennis
#      niet uitsluitend op dit ene apparaat bestaat (toegevoegd 13 sep 2026, doorlichtingsopdracht).
#   4. Herinnert eraan om openstaande wijzigingen in de backend-repo te committen/pushen
#      (de backend-code zelf is sinds 25 juli 2026 canoniek in
#      ~/Documents/GitHub/koersvoormorgen-backend/backend/ — dat IS al de git-back-up,
#      dit script hoeft er niets meer naartoe te kopiëren).
#   5. Ruimt database-back-ups ouder dan 60 dagen op.
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
# 18-11-2026 (back-up-betrouwbaarheid): `npx wrangler` zonder versie vroeg bij elke run het npm-register naar de
# nieuwste versie en installeerde die opnieuw; een trage registry gaf EIDLETIMEOUT (back-ups 14-11 mislukt, zie log).
# Nu een vaste versie uit de lokale npx-cache, eerst offline. Ophogen = deze ene regel aanpassen.
WRANGLER_VERSIE="${KVM_WRANGLER_VERSIE:-4.164.0}"
wrangler_cmd() { npx --yes --prefer-offline "wrangler@$WRANGLER_VERSIE" "$@"; }
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
# 11 nov 2026: de sleutel uit de launchd-plist bleek verouderd na de rotatie van 19 sep; curl -s negeerde de 401,
# waardoor de mislukte back-ups van 9 en 10 nov nergens gemeld werden. Nu: eerst de macOS-sleutelhanger (dezelfde
# bron als de tests, altijd actueel), dan pas de omgeving; een geweigerde melding (HTTP-fout) wordt gelogd; en bij
# een mislukte back-up verschijnt altijd ook een lokale macOS-melding, los van het netwerk of de worker.
KC_SLEUTEL=$(/usr/bin/security find-generic-password -a "$(id -un)" -s kantoorinzicht-production-admin-key -w 2>/dev/null || true)
[ -n "$KC_SLEUTEL" ] && ADMIN_KEY="$KC_SLEUTEL"
unset KC_SLEUTEL
meld_backup_status() {
  local ok="$1" details="$2"
  if [ "$ok" != "true" ]; then
    /usr/bin/osascript -e 'display notification "Dagelijkse back-up Koers voor Morgen mislukt. Zie ~/Library/Logs/kantoorinzicht-backup.log" with title "Back-up mislukt" sound name "Basso"' >/dev/null 2>&1 || true
  fi
  if [ -z "${ADMIN_KEY:-}" ]; then
    echo "   ⊘ Geen beheersleutel (sleutelhanger of omgeving) — melding aan de worker overgeslagen." >&2
    return 0
  fi
  local code
  code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" \
    "https://kantoorinzicht.marcel-bisschops.workers.dev/mna/admin/veiligheid/backup-melding" \
    -d "{\"ok\":$ok,\"details\":$(printf '%s' "$details" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')}" 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    echo "   ⊘ Melding aan de worker niet aangekomen (HTTP $code) — geen blokkade van de back-up zelf." >&2
    /usr/bin/osascript -e 'display notification "Back-upmelding aan het veiligheidsdashboard is niet aangekomen" with title "Back-up: melding mislukt"' >/dev/null 2>&1 || true
  fi
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
  ( cd "$BACKEND_DIR" && wrangler_cmd d1 export kantoorinzicht --remote --output="$OUT" ) &
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
# Integriteit (11 nov 2026): hash van de export ernaast, zodat een herstel kan aantonen dat het bestand ongewijzigd is.
( cd "$BACKUP_DIR" && shasum -a 256 "$(basename "$OUT")" > "$(basename "$OUT").sha256" ) || echo "   ⚠ hash van de export niet vastgelegd" >&2
echo "   ✓ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1), $TABELLEN tabellen)"
# Herstelproef (18-11-2026): de export wordt dagelijks in een lege, tijdelijke SQLite-database geladen en gecontroleerd
# (integriteit + aantal tabellen). Zo is herstelbaarheid elke dag aantoonbaar, niet alleen bij de maandelijkse C13.
HERSTEL_DB=$(mktemp -t kvm-herstelproef).db
if /usr/bin/sqlite3 "$HERSTEL_DB" < "$OUT" >/dev/null 2>&1 \
   && [ "$(/usr/bin/sqlite3 "$HERSTEL_DB" 'PRAGMA integrity_check;' 2>/dev/null)" = "ok" ]; then
  HERSTEL_TABELLEN=$(/usr/bin/sqlite3 "$HERSTEL_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo 0)
  if [ "${HERSTEL_TABELLEN:-0}" -ge 150 ]; then
    HERSTELPROEF="herstelproef ok ($HERSTEL_TABELLEN tabellen, integriteit ok)"
    echo "   ✓ $HERSTELPROEF"
  else
    HERSTELPROEF="herstelproef ONVOLLEDIG ($HERSTEL_TABELLEN tabellen)"
    echo "   ✗ $HERSTELPROEF" >&2
  fi
else
  HERSTELPROEF="herstelproef MISLUKT (laden of integriteitscontrole faalt)"
  echo "   ✗ $HERSTELPROEF" >&2
fi
rm -f "$HERSTEL_DB"
case "$HERSTELPROEF" in
  "herstelproef ok"*) ;;
  *) meld_backup_status "false" "Export gelukt maar $HERSTELPROEF — back-up niet bruikbaar voor herstel."; exit 1 ;;
esac

echo "▶ 2/4  Documenten (R2) ophalen ..."
DOCS_DIR="$BACKUP_DIR/documenten"
mkdir -p "$DOCS_DIR"
# De database is de bron van waarheid voor welke bestanden in R2 staan (r2_key).
KEYS=$( ( cd "$BACKEND_DIR" && wrangler_cmd d1 execute kantoorinzicht --remote --json \
  --command "SELECT r2_key FROM mna_documenten WHERE r2_key IS NOT NULL AND r2_key != ''" ) 2>/dev/null \
  | { grep -o '"r2_key": "[^"]*"' || true; } | sed 's/"r2_key": "//;s/"//' )
DOC_OK=0; DOC_SKIP=0
if [ -n "$KEYS" ]; then
  while IFS= read -r KEY; do
    [ -z "$KEY" ] && continue
    DEST="$DOCS_DIR/$KEY"
    if [ -f "$DEST" ]; then DOC_SKIP=$((DOC_SKIP+1)); continue; fi  # al gebackupt (documenten wijzigen niet)
    mkdir -p "$(dirname "$DEST")"
    if ( cd "$BACKEND_DIR" && wrangler_cmd r2 object get "kantoorinzicht-docs/$KEY" --file="$DEST" --remote ) >/dev/null 2>&1 && [ -s "$DEST" ]; then
      DOC_OK=$((DOC_OK+1))
    else
      rm -f "$DEST"; echo "   ⚠ kon niet ophalen: $KEY"
    fi
  done <<< "$KEYS"
  echo "   ✓ $DOC_OK nieuw opgehaald, $DOC_SKIP al aanwezig ($DOCS_DIR)"
else
  echo "   ⊘ geen documenten in R2 (of database niet bereikbaar)"
fi

# Manifest van de documentenmap (11 nov 2026): SHA-256 per bestand, voor een aantoonbare integriteitscontrole bij herstel.
( cd "$BACKUP_DIR" && find documenten -type f | sort | while IFS= read -r f; do shasum -a 256 "$f"; done > "documenten-manifest_$STAMP.sha256" ) 2>/dev/null || echo "   ⚠ documentenmanifest niet vastgelegd" >&2
find "$BACKUP_DIR" -maxdepth 1 -name "documenten-manifest_*.sha256" -mtime +60 -delete 2>/dev/null || true
echo "▶ 3/5  Lokale (niet-gecommitte) documentatie back-uppen ..."
# Bevinding 13 sep 2026 (doorlichtingsopdracht, technisch overdrachtsdocument): CLAUDE.md, het
# technisch overdrachtsdocument zelf (kantoorinzicht_documentatie.md), BACKLOG.md en alle overige
# root-level .md-bestanden in deze repo staan bewust in .gitignore (/*.md) — ze bevatten
# infrastructuur-ID's en interne werkafspraken die niet in de publieke repo horen (werkregel 25).
# Daardoor stonden ze NERGENS geback-upt: bij verlies van dit apparaat was alle vastgelegde
# operationele kennis (gouden regels, architectuur, herstelprocedures) weg, los van de D1-data zelf.
# 18-11-2026: de back-up draait vanuit een vaste ops-werkboom op main (launchd), maar deze interne .md-bestanden
# (MASTER, CLAUDE.md, standaarden) staan alleen in de hoofdmap. Bron daarom expliciet, niet afgeleid van de scriptmap.
DOCS_BRON_DIR="${KVM_DOCS_DIR:-$HOME/Documents/GitHub/koersvoormorgen}"
DOCS_BACKUP_DIR="$BACKUP_DIR/lokale-documentatie_$STAMP"
mkdir -p "$DOCS_BACKUP_DIR"
DOC_COUNT=0
for f in "$DOCS_BRON_DIR"/*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$DOCS_BACKUP_DIR/" && DOC_COUNT=$((DOC_COUNT+1))
done
if [ "$DOC_COUNT" -lt 5 ]; then
  echo "   ✗ slechts $DOC_COUNT .md-bestanden in $DOCS_BRON_DIR — documentatieback-up onvolledig" >&2
  DOCS_STATUS="documentatie ONVOLLEDIG ($DOC_COUNT)"
else
  DOCS_STATUS="documentatie $DOC_COUNT bestanden"
fi
echo "   ✓ $DOC_COUNT lokale .md-bestanden gekopieerd naar $DOCS_BACKUP_DIR (bron $DOCS_BRON_DIR)"
# Oudere kopieën van deze documentatie-back-up opruimen (>60 dagen, zelfde bewaartermijn als de
# database-dumps hieronder) — voorkomt dat elke dagelijkse run een aparte, nooit-opgeruimde map achterlaat.
find "$BACKUP_DIR" -maxdepth 1 -name "lokale-documentatie_*" -type d -mtime +60 -exec rm -rf {} + 2>/dev/null || true

echo "▶ 4/5  Releaseherkomst productie controleren ..."
# 18-11-2026: vervangt de controle op de backend-hoofdmap (die staat op een oude branch en zei niets over productie).
# Dagelijks via deze bestaande planner: is wat in productie draait herleidbaar tot een commit op GitHub-main?
if HERKOMST=$(node "$REPO_DIR/scripts/releaseherkomst.mjs" 2>&1); then
  echo "$HERKOMST" | sed 's/^/   /'
  HERKOMST_STATUS="releaseherkomst ok"
else
  echo "$HERKOMST" | sed 's/^/   /' >&2
  HERKOMST_STATUS="releaseherkomst AFWIJKING (zie log)"
  /usr/bin/osascript -e 'display notification "Productie is niet herleidbaar tot GitHub. Zie ~/Library/Logs/kantoorinzicht-backup.log" with title "KVM releaseherkomst"' >/dev/null 2>&1 || true
fi

echo "▶ 5/5  Oude database-back-ups opruimen (>60 dagen) ..."
find "$BACKUP_DIR" -maxdepth 1 -name "kantoorinzicht_*.sql" -mtime +60 -delete 2>/dev/null || true
find "$BACKUP_DIR" -maxdepth 1 -name "kantoorinzicht_*.sql.sha256" -mtime +60 -delete 2>/dev/null || true
AANTAL=$(ls -1 "$BACKUP_DIR"/kantoorinzicht_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "   ✓ $AANTAL database-back-up(s) in $BACKUP_DIR"

meld_backup_status "true" "OK — $(basename "$OUT"), $TABELLEN tabellen, $DOC_OK nieuwe document(en); $HERSTELPROEF; $DOCS_STATUS; $HERKOMST_STATUS."

echo ""
echo "Klaar. Bewaar $BACKUP_DIR op een plek los van Cloudflare (iCloud Drive / externe schijf)."
echo "Terugzetten (in geval van nood): zie scripts/README-backup.md"
