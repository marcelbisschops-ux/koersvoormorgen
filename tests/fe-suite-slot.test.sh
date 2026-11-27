#!/bin/bash
# Proef voor scripts/fe-suite-slot.sh (26-11-2026): wederzijdse uitsluiting, vrijgave bij afsluiten, opruimen achtergebleven
# slot, wachttijdgrens. Gebruikt een tijdelijke slotmap, raakt het echte slot niet.
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"; T=$(mktemp -d); export KVM_FE_SUITE_SLOT="$T/slot"; n=0; f=0
ok() { n=$((n+1)); if [ "$1" = 0 ]; then echo "PASS $2"; else f=$((f+1)); echo "FAIL $2"; fi; }
# 1. Twee gelijktijdige houders: de tweede start pas na vrijgave door de eerste.
( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null; echo "A-start $(date +%s%N)" >> "$T/log"; sleep 3; echo "A-eind $(date +%s%N)" >> "$T/log" ) &
sleep 0.5
( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null; echo "B-start $(date +%s%N)" >> "$T/log"; echo "B-eind $(date +%s%N)" >> "$T/log" ) &
wait
volg=$(cut -d' ' -f1 "$T/log" | tr '\n' ' ')
ok $([ "$volg" = "A-start A-eind B-start B-eind " ] && echo 0 || echo 1) "wederzijdse uitsluiting: B start pas na A ($volg)"
ok $([ ! -e "$KVM_FE_SUITE_SLOT" ] && echo 0 || echo 1) "slot vrijgegeven na afsluiten"
# 2. Achtergebleven slot van een niet-bestaand proces wordt opgeruimd.
mkdir "$KVM_FE_SUITE_SLOT"; echo "999999 /oud" > "$KVM_FE_SUITE_SLOT/eigenaar"
( . "$DIR/scripts/fe-suite-slot.sh"; fe_suite_slot_pak >/dev/null && echo gepakt > "$T/r2" )
ok $([ "$(cat "$T/r2" 2>/dev/null)" = gepakt ] && [ ! -e "$KVM_FE_SUITE_SLOT" ] && echo 0 || echo 1) "achtergebleven slot (dood proces) opgeruimd en overgenomen"
# 3. Bezet door een levend proces + wachttijd 0 → weigeren, slot van de ander blijft staan.
mkdir "$KVM_FE_SUITE_SLOT"; echo "$$ /levend" > "$KVM_FE_SUITE_SLOT/eigenaar"
( . "$DIR/scripts/fe-suite-slot.sh"; KVM_FE_SUITE_WACHT_MIN=0 fe_suite_slot_pak >/dev/null 2>&1 ); rc=$?
ok $([ "$rc" != 0 ] && [ "$(cut -d' ' -f1 "$KVM_FE_SUITE_SLOT/eigenaar")" = "$$" ] && echo 0 || echo 1) "bezet door levend proces: weigert na wachttijd, raakt andermans slot niet aan"
rm -rf "$T"
echo "$((n-f))/$n geslaagd"; [ "$f" = 0 ]
