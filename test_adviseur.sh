#!/bin/bash
# ══════════ TESTSCRIPT ADVISEUR-VERKOOPMODEL ══════════
# Gebruik:  bash test_adviseur.sh JOUW_ADMIN_KEY
# Test het hele verkoopmodel via de échte worker-endpoints:
# uitnodigen → activeren → limiet/modules → aanmaken → blokkeren.

W="https://kantoorinzicht.marcel-bisschops.workers.dev"
KEY="$1"
if [ -z "$KEY" ]; then echo "Gebruik: bash test_adviseur.sh JOUW_ADMIN_KEY"; exit 1; fi

EMAIL="test-adviseur-$(date +%s)@bisschopsfinancing.test"
WW="TestWachtwoord123"

echo "═══ 1. Adviseur uitnodigen ═══"
RESP=$(curl -s -X POST "$W/gebruikers/uitnodigen" -H "x-admin-key: $KEY" -H 'Content-Type: application/json' \
  -d "{\"naam\":\"Test Adviseur\",\"bedrijf\":\"Testkantoor BV\",\"email\":\"$EMAIL\"}")
echo "$RESP"
TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
GID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN" ] && echo "❌ GEFAALD: geen invite-token ontvangen" && exit 1
echo "→ email: $EMAIL, id: $GID"

echo ""
echo "═══ 2. Account activeren (wachtwoord instellen) ═══"
curl -s -X POST "$W/gebruikers/activeer" -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"wachtwoord\":\"$WW\"}"
echo ""

echo ""
echo "═══ 3. Verkoop: limiet op 1, alleen module traject ═══"
curl -s -X POST "$W/gebruikers/verkoop/$GID" -H "x-admin-key: $KEY" -H 'Content-Type: application/json' \
  -d '{"traject_limiet":1,"modules":{"traject":true,"contracten":false,"ai_analyse":false,"qa":false,"export":false}}'
echo ""

echo ""
echo "═══ 4. Login (adviseur/trajecten) — moet limiet 1 en 0 trajecten tonen ═══"
curl -s -X POST "$W/adviseur/trajecten" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\"}"
echo ""

echo ""
echo "═══ 5. Traject aanmaken (moet LUKKEN) ═══"
curl -s -X POST "$W/adviseur/create" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\",\"traject\":{\"kantoor_naam\":\"Testkantoor Overname BV\"}}"
echo ""

echo ""
echo "═══ 6. Tweede traject (moet FALEN: limiet bereikt) ═══"
curl -s -X POST "$W/adviseur/create" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\",\"traject\":{\"kantoor_naam\":\"Tweede Kantoor BV\"}}"
echo ""

echo ""
echo "═══ 7. Jij verkoopt uitbreiding: limiet naar 2 ═══"
curl -s -X POST "$W/gebruikers/verkoop/$GID" -H "x-admin-key: $KEY" -H 'Content-Type: application/json' \
  -d '{"traject_limiet":2}'
echo ""

echo ""
echo "═══ 8. Tweede traject opnieuw (moet nu LUKKEN) ═══"
curl -s -X POST "$W/adviseur/create" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\",\"traject\":{\"kantoor_naam\":\"Tweede Kantoor BV\"}}"
echo ""

echo ""
echo "═══ 9. Module traject uitzetten → aanmaken moet FALEN met upsell-melding ═══"
curl -s -X POST "$W/gebruikers/verkoop/$GID" -H "x-admin-key: $KEY" -H 'Content-Type: application/json' \
  -d '{"modules":{"traject":false},"traject_limiet":5}'
echo ""
curl -s -X POST "$W/adviseur/create" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\",\"traject\":{\"kantoor_naam\":\"Derde Kantoor BV\"}}"
echo ""

echo ""
echo "═══ 10. Account deactiveren → login moet FALEN ═══"
curl -s -X POST "$W/gebruikers/deactiveer/$GID" -H "x-admin-key: $KEY" -H 'Content-Type: application/json' -d '{}'
echo ""
curl -s -X POST "$W/adviseur/trajecten" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"wachtwoord\":\"$WW\"}"
echo ""

echo ""
echo "═══ CHECKLIST ═══"
echo "✓ stap 1: ok:true met token en id"
echo "✓ stap 4: ok:true, traject_limiet:1, trajecten:[]"
echo "✓ stap 5: ok:true met code/koper_code/tussen_code"
echo "✓ stap 6: foutmelding 'Trajectlimiet bereikt (1)'"
echo "✓ stap 8: ok:true, tweede traject aangemaakt"
echo "✓ stap 9: foutmelding 'Module Traject niet actief...'"
echo "✓ stap 10: foutmelding 'account gedeactiveerd' of 'onjuist'"
echo ""
echo "Opruimen: verwijder het testaccount ($EMAIL) en de testtrajecten via marilyn"
echo "  (of: curl -X POST \"$W/gebruikers/verwijder/$GID\" -H \"x-admin-key: $KEY\")"
