#!/bin/bash
# Proef voor scripts/fe-suite-slot.sh (poortpool, 27-11-2026): twee gelijktijdige suites krijgen verschillende poorten,
# een derde wacht, vrijgave bij afsluiten, opruimen achtergebleven slot, oud handmatig slot bezet 8799, wachttijdgrens.
# Gebruikt tijdelijke slotmappen, raakt de echte slots niet.
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"; T=$(mktemp -d); export KVM_FE_SUITE_SLOT="$T/slot" KVM_FE_SUITE_OUD="$T/oud"; n=0; f=0
ok() { n=$((n+1)); if [ "$1" = 0 ]; then echo "PASS $2"; else f=$((f+1)); echo "FAIL $2"; fi; }
houder() { ( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null; echo "$1 $KVM_FE_PORT start $(date +%s%N)" >> "$T/log"; sleep "$2"; echo "$1 $KVM_FE_PORT eind $(date +%s%N)" >> "$T/log" ); }
# 1. A en B tegelijk → verschillende poorten, parallel; C wacht tot er een vrijkomt.
houder A 3 & sleep 0.3; houder B 3 & sleep 0.3; houder C 0 & wait
pa=$(awk '$1=="A"&&$3=="start"{print $2}' "$T/log"); pb=$(awk '$1=="B"&&$3=="start"{print $2}' "$T/log")
ok $([ -n "$pa" ] && [ -n "$pb" ] && [ "$pa" != "$pb" ] && echo 0 || echo 1) "A en B tegelijk op verschillende poorten ($pa, $pb)"
bs=$(awk '$1=="B"&&$3=="start"{print $4}' "$T/log"); ae=$(awk '$1=="A"&&$3=="eind"{print $4}' "$T/log"); cs=$(awk '$1=="C"&&$3=="start"{print $4}' "$T/log")
ok $([ "$bs" -lt "$ae" ] && echo 0 || echo 1) "A en B liepen werkelijk parallel"
ok $([ "$cs" -gt "$ae" ] && echo 0 || echo 1) "C startte pas nadat een poort vrijkwam"
ok $([ -z "$(ls -d "$T"/slot-* 2>/dev/null)" ] && echo 0 || echo 1) "alle slots vrijgegeven na afsluiten"
# 2. Achtergebleven slot (dood proces) op 8799 wordt opgeruimd en hergebruikt.
mkdir "$T/slot-8799"; echo "999999 /oud" > "$T/slot-8799/eigenaar"
( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null && echo "$KVM_FE_PORT" > "$T/r2" )
ok $([ "$(cat "$T/r2")" = 8799 ] && echo 0 || echo 1) "achtergebleven slot op 8799 opgeruimd en overgenomen"
# 3. Oud handmatig slot aanwezig → 8799 overgeslagen, 8801 gekozen.
mkdir "$T/oud"; ( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null && echo "$KVM_FE_PORT" > "$T/r3" ); rmdir "$T/oud"
ok $([ "$(cat "$T/r3")" = 8801 ] && echo 0 || echo 1) "oud handmatig slot bezet 8799: suite kiest 8801"
# 4. Alles bezet door levende processen + wachttijd 0 → weigeren, andermans slots blijven staan.
for p in 8799 8801; do mkdir "$T/slot-$p"; echo "$$ /levend" > "$T/slot-$p/eigenaar"; done
( . "$DIR/scripts/fe-suite-slot.sh"; KVM_FE_SUITE_WACHT_MIN=0 fe_suite_slot_pak >/dev/null 2>&1 ); rc=$?
ok $([ "$rc" != 0 ] && [ -f "$T/slot-8799/eigenaar" ] && [ -f "$T/slot-8801/eigenaar" ] && echo 0 || echo 1) "alles bezet: weigert na wachttijd, raakt andermans slots niet aan"
rm -rf "$T"
echo "$((n-f))/$n geslaagd"; [ "$f" = 0 ]
