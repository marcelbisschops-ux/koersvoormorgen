#!/bin/bash
# ══════════ TESTSCRIPT ADVISEUR MODULE (stap 1) ══════════
# Gebruik: eerst deployen, dan:  bash test_adviseur.sh JOUW_ADMIN_KEY
# Test het hele verkoopmodel: aanmaken, limiet, module-slot, blokkeren.

W="https://kantoorinzicht.marcel-bisschops.workers.dev"
KEY="$1"
if [ -z "$KEY" ]; then echo "Gebruik: bash test_adviseur.sh JOUW_ADMIN_KEY"; exit 1; fi

echo "═══ 1. Adviseur aanmaken (limiet 1, alleen module traject) ═══"
RESP=$(curl -s -X POST "$W/mna/admin/adviseur/create?key=$KEY" -H 'Content-Type: application/json' \
  -d '{"naam":"Test Adviseur","email":"","bedrijf":"Testkantoor BV","traject_limiet":1}')
echo "$RESP"
ADV=$(echo "$RESP" | grep -o '"code":"ADV[A-Z0-9]*"' | cut -d'"' -f4)
echo "→ Adviseurscode: $ADV"
[ -z "$ADV" ] && echo "❌ GEFAALD: geen code ontvangen" && exit 1

echo ""
echo "═══ 2. Login werkt, toont modules en 0 trajecten ═══"
curl -s -X POST "$W/mna/adv/login" -H 'Content-Type: application/json' -d "{\"code\":\"$ADV\"}"
echo ""

echo ""
echo "═══ 3. Traject aanmaken (moet lukken, resterend: 0) ═══"
curl -s -X POST "$W/mna/adv/traject/create" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADV\",\"kantoor_naam\":\"Testkantoor Overname BV\"}"
echo ""

echo ""
echo "═══ 4. Tweede traject (moet FALEN: limiet bereikt) ═══"
curl -s -X POST "$W/mna/adv/traject/create" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADV\",\"kantoor_naam\":\"Tweede Kantoor BV\"}"
echo ""

echo ""
echo "═══ 5. Jij verkoopt uitbreiding: limiet naar 2 ═══"
curl -s -X POST "$W/mna/admin/adviseur/update/$ADV?key=$KEY" -H 'Content-Type: application/json' \
  -d '{"traject_limiet":2}'
echo ""

echo ""
echo "═══ 6. Tweede traject opnieuw (moet nu LUKKEN) ═══"
curl -s -X POST "$W/mna/adv/traject/create" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADV\",\"kantoor_naam\":\"Tweede Kantoor BV\"}"
echo ""

echo ""
echo "═══ 7. Module traject uitzetten → aanmaken moet FALEN met upsell-melding ═══"
curl -s -X POST "$W/mna/admin/adviseur/update/$ADV?key=$KEY" -H 'Content-Type: application/json' \
  -d '{"modules":{"traject":false},"traject_limiet":5}'
echo ""
curl -s -X POST "$W/mna/adv/traject/create" -H 'Content-Type: application/json' \
  -d "{\"code\":\"$ADV\",\"kantoor_naam\":\"Derde Kantoor BV\"}"
echo ""

echo ""
echo "═══ 8. Account blokkeren → login moet FALEN ═══"
curl -s -X POST "$W/mna/admin/adviseur/update/$ADV?key=$KEY" -H 'Content-Type: application/json' -d '{"actief":false}'
echo ""
curl -s -X POST "$W/mna/adv/login" -H 'Content-Type: application/json' -d "{\"code\":\"$ADV\"}"
echo ""

echo ""
echo "═══ 9. Adviseurslijst (voor de marilyn-beheertab van stap 5) ═══"
curl -s "$W/mna/admin/adviseurs?key=$KEY"
echo ""
echo ""
echo "═══ CHECKLIST ═══"
echo "✓ stap 3: ok:true met verkoper- en kopercode, tussen_code = adviseurscode"
echo "✓ stap 4: foutmelding 'Trajectlimiet bereikt (1)'"
echo "✓ stap 6: ok:true, resterend 0"
echo "✓ stap 7: foutmelding 'Module Traject niet actief...'"
echo "✓ stap 8: foutmelding 'Account gedeactiveerd...'"
echo "✓ BONUS: log in op adv.html met de adviseurscode — het testtraject is zichtbaar"
echo "  (de code werkt als tussen_code, dus bestaande documenten/gesprekken-endpoints werken al)"
echo ""
echo "Opruimen: verwijder de testtrajecten via marilyn (prullenbak/wis-data)"
