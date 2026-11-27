#!/bin/bash
# Centraal slot voor de UI-testsuite (26-11-2026, poortpool 27-11-2026). Parallelle werkbomen delen de staging-backend;
# per poort mag één suite tegelijk draaien. De pool (standaard 8799 en 8801, beide alleen in de staging-CORS toegestaan)
# laat twee suites parallel lopen zonder elkaar te raken (N-205 bewaakt daarnaast dat een suite alleen de eigen werkboom
# test). fe_suite_slot_pak kiest de eerste vrije poort, zet KVM_FE_PORT en geeft het slot bij het afsluiten vrij.
# Een achtergebleven slot (eigenaar-proces bestaat niet meer) wordt automatisch opgeruimd. Een oud handmatig slot
# (~/Developer/KVM/.fe-suite-lock, wrapper van vóór 26-11) telt als bezetting van poort 8799.
# Instellingen: KVM_FE_SUITE_SLOT (basisnaam, tests), KVM_FE_SUITE_POORTEN, KVM_FE_SUITE_WACHT_MIN (standaard 60).
FE_SUITE_SLOT="${KVM_FE_SUITE_SLOT:-$HOME/Developer/KVM/.fe-suite-slot}"
FE_SUITE_OUD="${KVM_FE_SUITE_OUD:-$HOME/Developer/KVM/.fe-suite-lock}"
_fe_slot_vrij_maken() { # $1 = slotmap; ruimt alleen een aantoonbaar verlaten slot op
  local d="$1" pid; pid=$(cut -d' ' -f1 "$d/eigenaar" 2>/dev/null)
  if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then echo "⚠ Achtergebleven UI-suiteslot van proces $pid (bestaat niet meer) opgeruimd."; rm -f "$d/eigenaar"; rmdir "$d" 2>/dev/null; return 0; fi
  if [ -z "$pid" ] && [ -d "$d" ] && [ $(( $(date +%s) - $(stat -f %m "$d" 2>/dev/null || date +%s) )) -gt 30 ]; then echo "⚠ UI-suiteslot zonder eigenaar (ouder dan 30 s) opgeruimd."; rmdir "$d" 2>/dev/null; return 0; fi
  return 1
}
fe_suite_slot_pak() {
  local max=$(( ${KVM_FE_SUITE_WACHT_MIN:-60} * 60 )) begin=$SECONDS gemeld=0 p d
  mkdir -p "$(dirname "$FE_SUITE_SLOT")"
  while :; do
    for p in ${KVM_FE_SUITE_POORTEN:-8799 8801}; do
      [ "$p" = 8799 ] && [ -d "$FE_SUITE_OUD" ] && [ "${KVM_FE_SUITE_OUD_IS_EIGEN:-}" != 1 ] && continue
      d="$FE_SUITE_SLOT-$p"
      if mkdir "$d" 2>/dev/null || { _fe_slot_vrij_maken "$d" && mkdir "$d" 2>/dev/null; }; then
        echo "$$ $(git rev-parse --show-toplevel 2>/dev/null || pwd)" > "$d/eigenaar"
        FE_SUITE_SLOT_MAP="$d"; export KVM_FE_PORT="$p"
        trap 'fe_suite_slot_geef' EXIT
        echo "UI-suite gebruikt poort $p."
        return 0
      fi
    done
    if [ $(( SECONDS - begin )) -ge "$max" ]; then echo "✗ Alle UI-suiteslots na ${KVM_FE_SUITE_WACHT_MIN:-60} min nog bezet; niets gedraaid." >&2; return 1; fi
    if [ "$gemeld" = 0 ] || [ $(( SECONDS - gemeld )) -ge 60 ]; then echo "… UI-suite wacht: alle poorten bezet (${KVM_FE_SUITE_POORTEN:-8799 8801})"; gemeld=$SECONDS; fi
    sleep 5
  done
}
fe_suite_slot_geef() {
  [ -n "${FE_SUITE_SLOT_MAP:-}" ] || return 0
  if [ "$(cut -d' ' -f1 "$FE_SUITE_SLOT_MAP/eigenaar" 2>/dev/null)" = "$$" ]; then rm -f "$FE_SUITE_SLOT_MAP/eigenaar"; rmdir "$FE_SUITE_SLOT_MAP" 2>/dev/null; fi
}
