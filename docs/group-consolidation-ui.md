# Groepsbeeld: UI (productpunt 5)

Status 10 okt 2026: **live in productie** op koersvoormorgen.nl. Frontend `6bc13ae` (Pages-deployment
`6c7fc05f-1544-43b4-987f-45e51cd72489`) en backend `d889d28` (Worker-versie
`5f75c91c-24f5-4a89-81c9-8d8a57e107e1`) zijn live. De frontendtaak is DONE. De backendtaak staat op
READY, niet native DONE: productie- en releasebewijs zijn vastgelegd, maar de administratieve
DONE-overgang blokkeert omdat een historische architectuurbron later in de native werkboom is gewijzigd.
Echte klantdocumenten en live AI blijven **OPEN** (zie onderaan). Bewijs: `inbox/productpunt5-ui/afgerond.json`.

Code: `mna/11-groepsbeeld.js` (gewone scriptmodule, in `mna.html` geladen na
`mna/10-juridische-broncontrole.js` en vóór `mna/06-schermen.js`) en één aanroep
`renderGroepsbeeld(f.id)` in `renderMain` (`mna/06-schermen.js`), direct na de financiële broncontrole.
Er is geen nieuwe API, geen nieuw schema, geen dependency, geen netwerkaanroep en geen AI-aanroep.
`loadDataFromDB`, `mna/02`, de formulieren, `S.data`/`S._groepData` en de bestaande
consolidatieCheck-melding met keuzeknoppen zijn niet gewijzigd.

## Backendafhankelijkheid

De UI leest alleen de metadata die de backend additief in `data_json` van de groepsrij zet
(backend `docs/group-consolidation.md`, `backend/worker/42-groepsbeeld.js`, commit `3a36fd2`):
`consolidatieCheck.groepsbeeld` met `versie: 1`, `selectie`, `eliminaties`, `drempel_pct` en
`velden[veld]`. De bron is de al geladen serverdata `S._mnaData` (gezet bij het laden van het
traject in `mna/06`). De UI berekent niets zelf.

De backend met deze metadata staat live (release `d889d28`). Zolang de metadata in een groepsrij
ontbreekt, toont het paneel
"Nog geen brongebonden groepsbeeldinformatie beschikbaar" en noemt het het bestaande groepsgetal nooit
officieel, geconsolideerd of bruto berekend.

## Gebruikersstappen

1. Verkoper of begeleider opent de fase **Financieel**. Onder het invulscherm staat het paneel
   **Groepsbeeld: bruto berekend versus aangeleverd**. Het paneel heeft geen knoppen en slaat niets op.
2. Bovenaan staan de rekenselectie (`BV_ZONDER_HOLDING`: BV zonder holding, of
   `MAATSCHAP_ALLE_ENTITEITEN`: alle entiteiten) met het aantal geselecteerde en onleesbare entiteiten,
   de juridische consolidatiekring (altijd **niet bewezen**; de rekenselectie is geen juridische
   selectie), de groepseliminaties (onbekend, nooit 0) en de signaleringsdrempel.
3. Per veld (maximaal 40, daarna een afkapmelding) staat:
   - bruto berekend met `bruto_status`, altijd met "geen officiële consolidatie";
   - invoeraantallen: met waarde, ontbrekend, onbruikbaar, ambigu, onleesbare entiteitrijen;
   - aangeleverd: status (niet geverifieerd, of ambigu/onbruikbaar), de gelezen waarde, de oorspronkelijke
     invoer uit de groepsrij (ongewijzigd, ook een echte `0`) en "officiële consolidatie: niet vastgesteld";
   - gebruikte waarde in de groepsrij (aangeleverd of bruto berekend, anders "geen");
   - bekende correcties en eliminaties: onbekend, nooit 0;
   - gereconcilieerd bedrag (`null` → "geen") en reconciliatie "niet mogelijk";
   - verschil, onverklaard verschil en verschilpercentage als **signaal**: boven de drempel "te beoordelen,
     geen bewijs van een fout", binnen de drempel "geen bewijs van juistheid";
   - periode (prognose, boekjaar, periodestatus) apart van de lijst "Ontbreekt".
4. Onbekende of ongeldige statussen worden als "onbekende status: …" of "onbekend" getoond, nooit
   geïnterpreteerd. Velden met onleesbare metadata worden geteld en gemeld.

## Regels

- Alleen verkoper (`verkoper`) en begeleider (`tussenpersoon`) met trajectcode, alleen in fase Financieel.
  Koper, meekijker en elke andere rol krijgen geen paneel; `S._mnaData` wordt dan niet eens gelezen.
- Uitsluitend de groepsrij: `fase_id === 'financieel'` en `entiteit_id` `null` of ontbrekend. Geen of
  meerdere groepsrijen, onleesbare `data_json` (parsefout zonder crash), ontbrekende (legacy) of
  onbekende metadata → expliciet geen brongebonden informatie.
- Geen moduletoestand of cache: elke render leest opnieuw uit `S`, dat bij inloggen volledig wordt
  herbouwd. Rol-, fase- en trajectwissel geven dus direct het juiste (of geen) paneel; er is geen request
  en dus geen laat antwoord.
- Alle servertekst (veldnamen, statussen, toelichting, oorspronkelijke invoer) gaat door `gbEsc`.
  Bedragen gebruiken de bestaande opmaak `fbcBedrag` (mna/09) op een stringkopie; er wordt geen eenheid
  toegevoegd. Er worden geen document- of entiteitnamen of codes getoond of verzonnen.

## Testbewijs

`node tests/group-consolidation-ui.mjs` (ook check 29 in `node tests/audit-consistentie.mjs`) draait de
echte `mna/11` met de rolhelpers uit `mna/02` en de opmaakhelpers uit `mna/09` in `node:vm` tegen
synthetische `S._mnaData` in de vorm van worker/42. Gedekt: laadvolgorde en integratie, rollen en fase,
juiste groepsrij, bruto versus aangeleverde echte 0, onvolledig/onbruikbaar/ambigu/PROGNOSE/periode
onbekend, eliminaties onbekend nooit 0, verschil geen foutbewijs, geen/malformed/legacy/onbekende
metadata, HTML-injectie, onverklaarde statussen, afkapping, rol-/trajectwissel zonder cache, geen
netwerk/save/AI en byte-gelijke formulier- en serverdata. Dit is technisch bewijs, geen browserbewijs.

Releasebewijs (10 okt 2026): UI-checks (70), native audit en onafhankelijke review PASS; samenhangende
releasetest en review PASS. Staging: 16 synthetische API-/browserchecks en 18 kernrolchecks PASS (2
optionele AI-checks niet uitgevoerd). Productie, eigen synthetisch traject: groepssom 800000 exclusief
holding (9000000), aangeleverde correctie 1234600.5 behouden; audit, bronreferentie, UI, rollen en de
financiële en juridische functies behouden; versies, live bytes, publicatiebeveiliging en cleanup PASS.
De eerste gecombineerde postdeploy-proeven gingen uit van een verkeerde verwachting over de
standaardentiteit en de invoerselector; met de zichtbare Groep-kiezer en het bestaande readonly-veld
slaagden dezelfde assertions. Er was geen productfix nodig.

## Beperkingen en OPEN

- `S._mnaData` wordt alleen bij het laden van het traject gezet. Na het opslaan van entiteitcijfers in
  dezelfde sessie toont het paneel de oude stand tot opnieuw laden; het paneel meldt dat.
- Geen officiële consolidatie; eliminaties blijven onbekend (nooit 0) en de juridische
  consolidatiekring is niet bewezen.
- OPEN: gedrag met echte klantdocumenten en klantdata, en live AI. Productie is alleen met een eigen
  synthetisch traject bewezen.
- Backendtaak administratief READY, niet native DONE (zie Status bovenaan).
