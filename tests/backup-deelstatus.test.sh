#!/bin/bash
# Back-up deelstatus (18-11-2026, n.a.v. Codex-review FAIL): draait het ECHTE R2-/documentatie-/meldblok uit
# scripts/backup.sh onder /bin/bash (macOS 3.2) met set -euo pipefail en een nagebootste wrangler. Geen netwerk,
# geen Cloudflare, geen melding naar de worker. Gebruik: bash tests/backup-deelstatus.test.sh (vanuit de repo-root).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SP="$(mktemp -d)"; trap 'chmod -R u+rw "$SP" 2>/dev/null; rm -rf "$SP"' EXIT
a=$(grep -n 'echo "▶ 2/4  Documenten (R2) ophalen' "$ROOT/scripts/backup.sh" | cut -d: -f1)
b=$(grep -n '^meld_backup_status "true"' "$ROOT/scripts/backup.sh" | cut -d: -f1)
[ -n "$a" ] && [ -n "$b" ] || { echo "✗ markers niet gevonden in scripts/backup.sh"; exit 1; }
{
cat <<'KOP'
set -euo pipefail
SP="$1"; MODUS="$2"; DOCMD="$3"
BACKEND_DIR="$SP"; BACKUP_DIR="$SP/out"; STAMP=T; OUT=x.sql; TABELLEN=177; HERSTELPROEF="herstelproef ok"; REPO_DIR="$SP"
rm -rf "$BACKUP_DIR"; mkdir -p "$BACKUP_DIR" "$SP/docsbron"; touch "$BACKUP_DIR/kantoorinzicht_T.sql"; rm -f "$SP"/docsbron/*.md
for i in $(seq 1 "$DOCMD"); do echo x > "$SP/docsbron/d$i.md"; done
[ "$MODUS" = kopiefout ] && chmod 000 "$SP/docsbron/d3.md"  # R-BACKUP 19-11: onleesbaar bronbestand → cp faalt
export KVM_DOCS_DIR="$SP/docsbron"
mkdir -p "$SP/scripts"; printf 'process.exit(0)\n' > "$SP/scripts/releaseherkomst.mjs"
wrangler_cmd() {
  if [ "$1" = d1 ]; then
    [ "$MODUS" = queryfout ] && return 1
    [ "$MODUS" = leeg ] && { echo '[{"results":[],"success":true}]'; return 0; }; echo '[{"results":[{"r2_key":"a/1.pdf"},{"r2_key":"a/2.pdf"}],"success":true}]'; return 0
  fi
  # r2 object get kantoorinzicht-docs/KEY --file=DEST
  local dest="${5#--file=}"
  if [ "$MODUS" = downloadfout ] && [ "$4" = "kantoorinzicht-docs/a/2.pdf" ]; then return 1; fi
  echo pdf > "$dest"
}
meld_backup_status() { echo "MELD ok=$1 :: $2"; }
KOP
sed -n "${a},${b}p" "$ROOT/scripts/backup.sh"
} > "$SP/run.sh"
ok=0; fout=0
proef() { # $1 modus, $2 aantal md, $3 verwachte exit, $4 verwachte meldtekst (regex)
  local out rc; out=$(/bin/bash "$SP/run.sh" "$SP" "$1" "$2" 2>&1); rc=$?
  if [ "$rc" = "$3" ] && echo "$out" | grep -Eq "$4"; then ok=$((ok+1)); echo "  ✓ $1 (md=$2): exit $rc"; else fout=$((fout+1)); echo "  ✗ $1 (md=$2): exit $rc"; echo "$out" | tail -5; fi
}
proef goed 6 0 'MELD ok=true :: OK'
proef leeg 6 0 'MELD ok=true :: OK — x.sql, 177 tabellen, 0 nieuwe'
proef queryfout 6 1 'MELD ok=false :: ONVOLLEDIG — R2: documentlijst niet opvraagbaar'
proef downloadfout 6 1 'MELD ok=false :: ONVOLLEDIG — R2: 1 document\(en\) niet opgehaald'
proef goed 2 1 'MELD ok=false :: ONVOLLEDIG — documentatie onvolledig: 2'
proef kopiefout 6 1 'MELD ok=false :: ONVOLLEDIG — documentatie: 1 bestand\(en\) niet gekopieerd \(d3.md'
echo "$ok/$((ok+fout)) geslaagd"; [ "$fout" = 0 ]
