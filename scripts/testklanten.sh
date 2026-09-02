#!/usr/bin/env bash
# Maakt 3 fictieve M&A-testtrajecten aan op de LIVE worker en vult ze met
# realistische data, zodat Marcel screenshots kan maken vanuit verkoper,
# koper en adviseur. Alles fictief en achteraf te wissen (marilyn -> M&A
# Trajecten -> verwijderen, of /admin/delete/mna/<code>).
#
# Gebruik:   ADMIN_KEY='jouw-admin-key' bash scripts/testklanten.sh
# (de sleutel staat in Cloudflare; plak 'm in je terminal, NIET in een bestand)
set -euo pipefail
WORKER="https://kantoorinzicht.marcel-bisschops.workers.dev"
: "${ADMIN_KEY:?Zet ADMIN_KEY als env-var: ADMIN_KEY='...' bash scripts/testklanten.sh}"

jqget() { python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get(sys.argv[1],""))' "$1"; }

create() { # $1=json-body  -> print "code koper_code tussen_code"
  local resp
  resp=$(curl -sS -X POST "$WORKER/mna/create" \
    -H "x-admin-key: $ADMIN_KEY" -H 'Content-Type: application/json' -d "$1")
  local code kcode tcode
  code=$(printf '%s' "$resp" | jqget code)
  kcode=$(printf '%s' "$resp" | jqget koper_code)
  tcode=$(printf '%s' "$resp" | jqget tussen_code)
  if [ -z "$code" ]; then echo "FOUT bij aanmaken: $resp" >&2; exit 1; fi
  echo "$code $kcode $tcode"
}

save() { # $1=code $2=fase_id $3=data_json $4=checklist_json
  curl -sS -X POST "$WORKER/mna/save" -H 'Content-Type: application/json' \
    -d "{\"code\":\"$1\",\"fase_id\":\"$2\",\"data_json\":$3,\"checklist_json\":$4}" >/dev/null
}

# helper: checklist met de eerste N items aangevinkt (van 8), geen redflags
cl() { python3 -c 'import json,sys;n=int(sys.argv[1]);print(json.dumps({"items":{str(i):(i<n) for i in range(8)},"redflags":{}}))' "$1"; }
# helper: checklist met N items + M redflags
clrf() { python3 -c 'import json,sys;n,m=int(sys.argv[1]),int(sys.argv[2]);print(json.dumps({"items":{str(i):(i<n) for i in range(8)},"redflags":{str(i):(i<m) for i in range(4)}}))' "$1" "$2"; }

echo "== 1/3  Berg & Molenaar Accountants  (verkoper-perspectief) =="
read -r C1 K1 T1 <<< "$(create '{
  "kantoor_naam":"Berg & Molenaar Accountants",
  "kantoor_rechtsvorm":"bv","structuur_type":"bv","sector":"accountancy",
  "contact_naam":"Willem Berg","contact_email":"willem@bergmolenaar-test.nl",
  "traject_type":"Verkoop","opdrachtgever_rol":"verkoper",
  "begeleider_naam":"Marcel Bisschops","begeleider_email":"",
  "verkoper_adres":"Zuidsingel 44, 3811 HB Amersfoort","verkoper_kvk":"61120034",
  "notitie":"FICTIEF TESTTRAJECT - voor screenshots. Verwijderen na gebruik."
}')"
save "$C1" financieel '{
  "omzet1":{"value":"3.640.000","label":"Jaaromzet jaar 1","req":true},
  "omzet2":{"value":"3.910.000","label":"Jaaromzet jaar 2","req":true},
  "omzet3":{"value":"4.180.000","label":"Jaaromzet jaar 3","req":true},
  "omzetYTD":{"value":"2.520.000","label":"Omzet YTD","req":true},
  "ebitda":{"value":"690.000","label":"EBITDA jaar 3","req":true},
  "ebitdaMarge":{"value":"16,5","label":"EBITDA-marge","req":true},
  "partnerBel":{"value":"360.000","label":"Partnerbeloning","req":true},
  "recurring":{"value":"58","label":"Recurring omzet","req":true},
  "omzetPerDienst":{"value":"42% jaarwerk, 22% advies, 21% loon, 15% fiscaal","label":"Omzet per dienstlijn","req":false}
}' "$(cl 6)"
save "$C1" commercieel '{
  "aantalKlanten":{"value":"310","label":"Aantal actieve klanten","req":true},
  "top1pct":{"value":"6","label":"Grootste klant","req":true},
  "top10pct":{"value":"28","label":"Top 10 klanten","req":true},
  "omzetPerKlant":{"value":"13.400","label":"Gem. omzet per klant","req":false}
}' "$(cl 3)"
save "$C1" partner '{
  "aantalP":{"value":"2","label":"Aantal partners","req":true},
  "gemLeeftijd":{"value":"59","label":"Gem. leeftijd partners","req":true},
  "fte":{"value":"34","label":"Totaal FTE","req":true},
  "omzetPerP":{"value":"2.090.000","label":"Omzet per partner","req":true},
  "eigendomsStructuur":{"value":"50/50","label":"Eigendomsstructuur","req":true},
  "opvolging":{"value":"Geen interne opvolgingskandidaat","label":"Opvolgingskandidaat","req":true},
  "verandering":{"value":"Beperkt - partners willen binnen 2 jaar stoppen","label":"Veranderbereidheid","req":true},
  "keyPersonAfhank":{"value":"35","label":"Key-person-afhankelijkheid","req":true}
}' "$(cl 4)"
save "$C1" compliance '{}' "$(cl 3)"
save "$C1" it '{}' "$(cl 2)"
save "$C1" juridisch '{"rechtsvorm":{"value":"B.V.","label":"Rechtsvorm","req":false}}' "$(cl 2)"
save "$C1" strategisch '{}' "$(cl 1)"

echo "== 2/3  Praktijk Van der Meer & Co  (koper-perspectief, post-LOI) =="
read -r C2 K2 T2 <<< "$(create '{
  "kantoor_naam":"Praktijk Van der Meer & Co",
  "kantoor_rechtsvorm":"bv","structuur_type":"bv","sector":"accountancy",
  "contact_naam":"Sanne van der Meer","contact_email":"sanne@vandermeer-test.nl",
  "traject_type":"Verkoop","opdrachtgever_rol":"koper",
  "begeleider_naam":"Marcel Bisschops","begeleider_email":"",
  "koper_naam":"Horizon Accountants Groep B.V.","koper_rechtsvorm":"bv",
  "koper_contact":"Peter Horstman","koper_email":"p.horstman@horizon-test.nl",
  "koper_adres":"Keizersgracht 210, 1016 DX Amsterdam","koper_kvk":"58990021",
  "verkoper_adres":"Marktplein 8, 7311 LW Apeldoorn","verkoper_kvk":"09088771",
  "notitie":"FICTIEF TESTTRAJECT - voor screenshots. Verwijderen na gebruik."
}')"
save "$C2" financieel '{
  "omzet1":{"value":"2.780.000","label":"Jaaromzet jaar 1","req":true},
  "omzet2":{"value":"2.950.000","label":"Jaaromzet jaar 2","req":true},
  "omzet3":{"value":"3.120.000","label":"Jaaromzet jaar 3","req":true},
  "omzetYTD":{"value":"1.980.000","label":"Omzet YTD","req":true},
  "ebitda":{"value":"470.000","label":"EBITDA jaar 3","req":true},
  "ebitdaMarge":{"value":"15,1","label":"EBITDA-marge","req":true},
  "partnerBel":{"value":"240.000","label":"Partnerbeloning","req":true},
  "recurring":{"value":"61","label":"Recurring omzet","req":true},
  "ebitdaNorm":{"value":"505.000","label":"Genormaliseerde EBITDA","req":true},
  "wip":{"value":"185.000","label":"Onderhanden werk","req":true},
  "debiteuren":{"value":"312.000","label":"Debiteuren totaal","req":true},
  "resultaat":{"value":"268.000","label":"Nettoresultaat","req":false},
  "eigenVermogen":{"value":"640.000","label":"Eigen vermogen","req":false}
}' "$(cl 8)"
save "$C2" commercieel '{
  "aantalKlanten":{"value":"245","label":"Aantal actieve klanten","req":true},
  "top1pct":{"value":"9","label":"Grootste klant","req":true},
  "top10pct":{"value":"34","label":"Top 10 klanten","req":true},
  "churn":{"value":"7","label":"Klantverloop","req":false},
  "klantduur":{"value":"11","label":"Gem. klantduur","req":false}
}' "$(cl 4)"
save "$C2" partner '{
  "aantalP":{"value":"3","label":"Aantal partners","req":true},
  "gemLeeftijd":{"value":"52","label":"Gem. leeftijd partners","req":true},
  "fte":{"value":"26","label":"Totaal FTE","req":true},
  "omzetPerP":{"value":"1.040.000","label":"Omzet per partner","req":true},
  "eigendomsStructuur":{"value":"40/30/30","label":"Eigendomsstructuur","req":true},
  "opvolging":{"value":"Eén kandidaat in tweede echelon","label":"Opvolgingskandidaat","req":true},
  "verandering":{"value":"Positief","label":"Veranderbereidheid","req":true},
  "keyPersonAfhank":{"value":"22","label":"Key-person-afhankelijkheid","req":true}
}' "$(cl 4)"
save "$C2" compliance '{}' "$(cl 5)"
save "$C2" it '{}' "$(cl 3)"
save "$C2" juridisch '{}' "$(cl 4)"
save "$C2" strategisch '{}' "$(cl 2)"

echo "== 3/3  Van Dijk Bedrijfsadvies  (adviseur-perspectief, met signalen) =="
read -r C3 K3 T3 <<< "$(create '{
  "kantoor_naam":"Van Dijk Bedrijfsadvies",
  "kantoor_rechtsvorm":"bv","structuur_type":"bv","sector":"accountancy",
  "contact_naam":"Hans van Dijk","contact_email":"hans@vandijkadvies-test.nl",
  "traject_type":"Verkoop","opdrachtgever_rol":"verkoper",
  "begeleider_naam":"Marcel Bisschops","begeleider_email":"",
  "verkoper_adres":"Industrieweg 5, 5145 PD Waalwijk","verkoper_kvk":"17240099",
  "notitie":"FICTIEF TESTTRAJECT - voor screenshots. Verwijderen na gebruik."
}')"
save "$C3" financieel '{
  "omzet1":{"value":"1.820.000","label":"Jaaromzet jaar 1","req":true},
  "omzet2":{"value":"1.760.000","label":"Jaaromzet jaar 2","req":true},
  "omzet3":{"value":"1.690.000","label":"Jaaromzet jaar 3","req":true},
  "omzetYTD":{"value":"980.000","label":"Omzet YTD","req":true},
  "ebitda":{"value":"210.000","label":"EBITDA jaar 3","req":true},
  "ebitdaMarge":{"value":"12,4","label":"EBITDA-marge","req":true},
  "partnerBel":{"value":"150.000","label":"Partnerbeloning","req":true},
  "recurring":{"value":"39","label":"Recurring omzet","req":true},
  "wip":{"value":"260.000","label":"Onderhanden werk","req":true},
  "debiteuren":{"value":"340.000","label":"Debiteuren totaal","req":true},
  "debiteurenOud":{"value":"31","label":"Debiteuren >90 dagen","req":false}
}' "$(clrf 5 3)"
save "$C3" commercieel '{
  "aantalKlanten":{"value":"140","label":"Aantal actieve klanten","req":true},
  "top1pct":{"value":"14","label":"Grootste klant","req":true},
  "top10pct":{"value":"46","label":"Top 10 klanten","req":true}
}' "$(clrf 2 2)"
save "$C3" partner '{
  "aantalP":{"value":"1","label":"Aantal partners","req":true},
  "gemLeeftijd":{"value":"63","label":"Gem. leeftijd partners","req":true},
  "fte":{"value":"12","label":"Totaal FTE","req":true},
  "omzetPerP":{"value":"1.690.000","label":"Omzet per partner","req":true},
  "opvolging":{"value":"Geen","label":"Opvolgingskandidaat","req":true},
  "verandering":{"value":"Laag","label":"Veranderbereidheid","req":true},
  "keyPersonAfhank":{"value":"58","label":"Key-person-afhankelijkheid","req":true}
}' "$(clrf 3 2)"
save "$C3" compliance '{}' "$(cl 2)"
save "$C3" it '{}' "$(cl 1)"
save "$C3" juridisch '{}' "$(cl 2)"
save "$C3" strategisch '{}' "$(cl 0)"

cat <<EOF

============================================================
KLAAR. 3 fictieve testtrajecten aangemaakt en gevuld.
Alles staat op https://koersvoormorgen.nl/mna.html (verkoper/koper)
en /adv.html of code op mna.html (adviseur/begeleider).

------------------------------------------------------------
TRAJECT 1 — Berg & Molenaar Accountants   (~65-70% gevuld)
  verkopercode  : $C1
  kopercode     : $K1
  begeleidercode: $T1
  SHOTS:
   1. Log in op mna.html met  $C1  -> dashboard met de fase-balken
      (I Financieel ~100%, II Klanten hoog, III Partners ~60%, rest laag).
      -> vervangt platform-dashboard.jpg  (KOP /platform + homepage)
   2. Klik fase 'I Financieel' open -> ingevulde velden (omzet, EBITDA, recurring).
      -> vervangt platform-dataroom-fases.jpg
   3. Klik 'Documenten' / uploadscherm (leeg is ok) -> de documentcategorieen per fase.

TRAJECT 2 — Praktijk Van der Meer & Co    (~85%, met koper)
  verkopercode  : $C2
  kopercode     : $K2
  begeleidercode: $T2
  SHOTS:
   4. Log in op mna.html met de KOPERCODE  $K2  -> het koper-portaal
      (wat een koper ziet: vrijgegeven data, geen interne notities).
   5. Ga naar 'Vragen' / Q&A in dat koperscherm -> Q&A-lijst.
      -> vervangt de Q&A-hoek van platform-voortgang.jpg
   6. Log in met verkopercode $C2 -> voortgang / dekking per fase (verder gevuld).

TRAJECT 3 — Van Dijk Bedrijfsadvies       (mid-stage, rode vlaggen aan)
  verkopercode  : $C3
  kopercode     : $K3
  begeleidercode: $T3
  SHOTS:
   7. Log in met de BEGELEIDERCODE  $T3  op mna.html -> begeleider-dashboard.
   8. Open fase 'I Financieel' -> scrol naar 'Checklist / rode vlaggen' ->
      klik 'Genereer advies' -> screenshot het AI-advies + de rode vlaggen.
      -> vervangt platform-ai-signalen.jpg
   9. Dashboard-overzicht met de gemengde fase-balken (100% / goud / rood).
      -> tweede optie voor platform-voortgang.jpg

------------------------------------------------------------
OPRUIMEN (na de screenshots):
  marilyn -> tab 'M&A Trajecten' -> verwijder $C1, $C2, $C3
  (of:  curl -X POST "$WORKER/admin/delete/mna/$C1" -H "x-admin-key: \$ADMIN_KEY"  per code)
============================================================
EOF
