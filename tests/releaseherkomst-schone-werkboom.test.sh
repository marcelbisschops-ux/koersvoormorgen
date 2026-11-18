#!/bin/bash
# Releaseherkomst (Codex-review 18-11, P2): herkomst_controle uit scripts/deploy.sh weigert gewijzigde én niet-vastgelegde
# (niet-genegeerde) bestanden; genegeerde bestanden zijn toegestaan (die neemt de build niet mee). Echte functie, tijdelijke repo, geen netwerk.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNC="$(awk '/^herkomst_controle\(\) \{/{f=1} f{print} f&&/^\}/{exit}' "$ROOT/scripts/deploy.sh")"
[ -n "$FUNC" ] || { echo "✗ herkomst_controle niet gevonden"; exit 1; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
git init -q --bare "$T/bron"
git clone -q "$T/bron" "$T/repo"; cd "$T/repo"
printf 'node_modules/\n' > .gitignore; echo '<p>x</p>' > index.html
git add . && git -c user.email=t@t.invalid -c user.name=t commit -q -m inhoud && git push -q origin HEAD 2>/dev/null; git fetch -q origin
fouten=0; n=0
probeer() { # $1 = omschrijving, $2 = verwachte exitcode
  n=$((n+1)); ( eval "$FUNC"; herkomst_controle "$T/repo" branch ) >/dev/null 2>&1; local rc=$?
  if [ "$rc" = "$2" ]; then echo "✓ $1"; else echo "✗ $1 (exit $rc, verwacht $2)"; fouten=$((fouten+1)); fi
}
probeer "schone werkboom op GitHub-commit: toegestaan" 0
mkdir -p node_modules && echo x > node_modules/a.js
probeer "genegeerd bestand (node_modules/): toegestaan" 0
echo '<p>los</p>' > extra.html
probeer "niet-vastgelegd publiek bestand (extra.html): geweigerd" 1
rm extra.html; echo '<p>y</p>' > index.html
probeer "gewijzigd vastgelegd bestand: geweigerd" 1
git checkout -q index.html
probeer "na herstel weer toegestaan" 0
[ "$fouten" = 0 ] && echo "$n/$n geslaagd" || { echo "✗ $fouten/$n gefaald"; exit 1; }
