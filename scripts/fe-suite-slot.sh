#!/bin/bash
# Centraal slot voor de UI-testsuite (26-11-2026). Parallelle werkbomen delen poort 8799 en de staging-backend; twee
# suites tegelijk geven valse fouten (N-205 voorkomt al dat een suite andermans bestanden test, maar niet de botsing).
# Gebruik: source dit bestand en roep fe_suite_slot_pak aan; het slot wordt bij het afsluiten van het proces vrijgegeven.
# Een achtergebleven slot (eigenaar-proces bestaat niet meer) wordt automatisch opgeruimd. Overschrijven met
# KVM_FE_SUITE_SLOT=<map> (tests); maximale wachttijd KVM_FE_SUITE_WACHT_MIN (standaard 60 minuten).
FE_SUITE_SLOT="${KVM_FE_SUITE_SLOT:-$HOME/Developer/KVM/.fe-suite-slot}"
fe_suite_slot_pak() {
  local max=$(( ${KVM_FE_SUITE_WACHT_MIN:-60} * 60 )) begin=$SECONDS gemeld=0
  mkdir -p "$(dirname "$FE_SUITE_SLOT")"
  while ! mkdir "$FE_SUITE_SLOT" 2>/dev/null; do
    local pid; pid=$(cat "$FE_SUITE_SLOT/eigenaar" 2>/dev/null | cut -d' ' -f1)
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "⚠ Achtergebleven UI-suiteslot van proces $pid (bestaat niet meer) opgeruimd."
      rm -f "$FE_SUITE_SLOT/eigenaar"; rmdir "$FE_SUITE_SLOT" 2>/dev/null; continue
    fi
    if [ -z "$pid" ] && [ -d "$FE_SUITE_SLOT" ] && [ $(( $(date +%s) - $(stat -f %m "$FE_SUITE_SLOT" 2>/dev/null || date +%s) )) -gt 30 ]; then
      echo "⚠ UI-suiteslot zonder eigenaar (ouder dan 30 s) opgeruimd."; rmdir "$FE_SUITE_SLOT" 2>/dev/null; continue
    fi
    if [ $(( SECONDS - begin )) -ge "$max" ]; then echo "✗ UI-suiteslot na ${KVM_FE_SUITE_WACHT_MIN:-60} min nog bezet (proces $pid); niets gedraaid." >&2; return 1; fi
    if [ $(( SECONDS - gemeld )) -ge 60 ] || [ "$gemeld" = 0 ]; then echo "… UI-suite wacht: slot bezet door proces ${pid:-?} ($(cat "$FE_SUITE_SLOT/eigenaar" 2>/dev/null | cut -d' ' -f2-))"; gemeld=$SECONDS; fi
    sleep 5
  done
  echo "$$ $(git rev-parse --show-toplevel 2>/dev/null || pwd)" > "$FE_SUITE_SLOT/eigenaar"
  trap 'fe_suite_slot_geef' EXIT
}
fe_suite_slot_geef() {
  if [ "$(cut -d' ' -f1 "$FE_SUITE_SLOT/eigenaar" 2>/dev/null)" = "$$" ]; then rm -f "$FE_SUITE_SLOT/eigenaar"; rmdir "$FE_SUITE_SLOT" 2>/dev/null; fi
}
