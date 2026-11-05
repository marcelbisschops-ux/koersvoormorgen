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
`loadDataFromDB`, de formulieren, `S.data`/`S._groepData` en de bestaande consolidatieCheck-melding
met keuzeknoppen zijn niet gewijzigd. Sinds 12 okt 2026 houden de financiële opslagpaden in `mna/02` de
laatst door de server bevestigde groepsrij bij (zie "Actuele stand na opslaan").

## Backendafhankelijkheid

De UI leest alleen de metadata die de backend additief in `data_json` van de groepsrij zet
(backend `docs/group-consolidation.md`, `backend/worker/42-groepsbeeld.js`, commit `3a36fd2`):
`consolidatieCheck.groepsbeeld` met `versie: 1`, `selectie`, `eliminaties`, `drempel_pct` en
`velden[veld]`. De bron is de al geladen serverdata `S._mnaData` (gezet bij het laden van het
traject in `mna/06`) of, na een financiële opslag in dezelfde sessie, de groepsrij die de server
daarbij terugmeldt (zie "Actuele stand na opslaan"). De UI berekent niets zelf.

## Actuele stand na opslaan (12 okt 2026)

`mna/02` houdt per sessie in `S._gbBevestigd` de laatst door de server bevestigde groepsrij Financieel
bij (`gbOpslagStart`/`gbOpslagKlaar`). Dat gebeurt in de vier bestaande financiële opslagpaden:
`saveCurrent` → `_verstuurGeplandeSave`, `saveAll` (niet de beacon bij het sluiten), `saveEntiteitData`
en `saveGroepsniveauVelden`. Er komt geen nieuw verzoek, geen nieuwe route en geen scheduler bij.

| Antwoord van `/mna/save` | Stand in het paneel |
| --- | --- |
| Entiteit-save met `ok: true` en `groepswaarden` als object (de volledige groepsrij-`data_json` na `consolideerFase`, inclusief `consolidatieCheck.groepsbeeld`) | Precies die serverrij, status "bijgewerkt met de groepsrij die de server terugmeldde" |
| Groepsrij-save met `ok: true` (de server vervangt `data_json` door de verstuurde invoer en geeft geen groepsrij terug) | Vorige stand blijft, met waarschuwing "mogelijk niet meer actueel"; de verstuurde invoer wordt nooit als metadata getoond |
| Foutmelding, netwerkfout, geen JSON, leeg antwoord, `groepswaarden` ontbreekt/geen object, andere `fase_id` | Vorige stand blijft, met waarschuwing "geen bruikbare bevestiging"; nooit als actueel aangemerkt |

- Een antwoord telt alleen als het bij dezelfde sessie hoort (bij elke login en uitlog wordt `S` een
  nieuw object, ook bij dezelfde code), met dezelfde code en rol. Een volgnummer per sessie zorgt dat een
  ouder antwoord (succes of fout) nooit een later verstuurde opslag overschrijft. De volgorde is die van
  versturen; de server bevestigt zelf geen volgorde.
- Alleen het element `#gb-panel` wordt vervangen (`outerHTML`), geen `renderApp`. Formulierinvoer die
  nog niet is opgeslagen, focus en caret blijven staan. Staat het paneel niet in beeld, dan toont de
  volgende render de bewaarde stand. `S._mnaData`, `S.data` en de entiteitdata worden hiervoor niet
  gewijzigd. `mna/11` blijft een renderer zonder netwerk en leest `S._gbBevestigd` alleen als de code
  overeenkomt.
- Bewust geen herlezing via `/mna/traject/{code}`: die route telt server-side als login (rate limit van
  15 per 10 minuten per IP en een audit-regel `login`). Automatisch herlezen na elke opslag zou de echte
  login kunnen blokkeren en het audit-log vervuilen. Na een groepsrij-save blijft de stand daarom
  "mogelijk niet meer actueel" tot de volgende entiteit-save of opnieuw laden.

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
  herbouwd. Rol-, fase- en trajectwissel geven dus direct het juiste (of geen) paneel. `mna/11` doet zelf
  geen request; late opslagantwoorden worden in `mna/02` aan sessie, code en rol getoetst.
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
netwerk/save/AI en byte-gelijke formulier- en serverdata. Sectie 12 draait de echte opslagfuncties uit
`mna/02` met uitgestelde synthetische `/mna/save`-antwoorden: succes zonder herladen, fout/malformed na
en zonder eerdere bevestiging, uit volgorde, nieuwe sessie met dezelfde of een andere code, rolwissel,
groepsrij-save, groepsniveau-veld in entiteitcontext, `saveAll` met en zonder beacon, andere fase,
begeleider en paneel buiten beeld, plus behoud van dirty invoer, focus en caret zonder `renderApp`.
Dit is technisch bewijs, geen browserbewijs.

Releasebewijs (10 okt 2026): UI-checks (70), native audit en onafhankelijke review PASS; samenhangende
releasetest en review PASS. Staging: 16 synthetische API-/browserchecks en 18 kernrolchecks PASS (2
optionele AI-checks niet uitgevoerd). Productie, eigen synthetisch traject: groepssom 800000 exclusief
holding (9000000), aangeleverde correctie 1234600.5 behouden; audit, bronreferentie, UI, rollen en de
financiële en juridische functies behouden; versies, live bytes, publicatiebeveiliging en cleanup PASS.
De eerste gecombineerde postdeploy-proeven gingen uit van een verkeerde verwachting over de
standaardentiteit en de invoerselector; met de zichtbare Groep-kiezer en het bestaande readonly-veld
slaagden dezelfde assertions. Er was geen productfix nodig.

## Partnerregister: Bewerken (productpunt 18, 13 okt 2026)

Beide bestaande partneroverzichten hebben per rij een knop **Bewerken**: de begeleidermodal
(`toonPartnersModal`, `mna/04-begeleider-dashboard.js`) en het openingsscherm van de verkoper
(`renderOpening`/`bindOpeningScreen`, `mna/06-schermen.js`). Backendafhankelijkheid: de
resultaatcontrole in de bewerktak van `POST /mna/partners/:code` (backend `docs/group-consolidation.md`,
C2, nog niet gepubliceerd; gezamenlijke release vereist).

- Hetzelfde formulier wordt voorgevuld uit de laatst van de server gelezen rij: naam, leeftijd,
  veranderbereidheid, opvolgingskandidaat, omzet incl. team, winstaandeel (maatschap) en de
  entiteitkoppelingen. Een status "Bewerken: naam" en een knop **Annuleren** verschijnen; de hoofdknop
  heet dan **Opslaan**.
- Opslaan stuurt het bestaande `id` naar dezelfde POST-route met dezelfde headers als toevoegen
  (begeleider: `x-tussen-key`; verkoper: geen extra header). Geen verwijderen en opnieuw aanmaken,
  geen nieuwe route. Koppelingen waarvoor geen checkbox in beeld is en het winstaandeel zonder
  invoerveld gaan ongewijzigd mee. In het openingsscherm vervalt alleen de koppeling met een entiteit
  die tijdens het bewerken is verwijderd.
- Succes alleen bij HTTP 2xx met `ok: true` en hetzelfde `id`. Daarna wordt het formulier leeg en de lijst
  opnieuw van de server gelezen. Bij een fout, 404 ("Partner niet gevonden"), 401/403 ("Geen
  toestemming…"), netwerkfout of onbruikbaar antwoord blijven de invoer en de bewerkmodus staan.
- **Annuleren** doet geen request en zet de invoer terug van vóór de eerste Bewerken-klik.
- Een antwoord telt alleen voor dezelfde sessie (`S`), code en rol en een formulier dat nog in beeld is.
  Een intussen gestarte nieuwere bewerking wordt door een laat antwoord niet gesloten of gewist; een
  late fout wordt gemeld als "Opslaan van naam mislukt: …". Een leesantwoord telt alleen als laatste
  leesverzoek voor een overzicht dat nog in beeld is. Namen gaan via `esc` of `textContent`.

Testbewijs: sectie 13 van `tests/group-consolidation-ui.mjs` draait voor beide overzichten de echte
functies met een minimale DOM en een synthetische `/mna/partners` volgens het backendcontract:
voorvullen, opslaan, herladen met gelijk id en behouden koppelingen, geen winstaandeelveld, Annuleren,
serverfout, 404, 401/403, netwerkfout, kapotte JSON, `ok` zonder of met ander id, nieuwere bewerking,
nieuwe sessie, andere code, rolwissel, gesloten of opnieuw getekend scherm, oud leesantwoord,
HTML-escaping en (openingsscherm) entiteit verwijderen tijdens bewerken. Dit is technisch bewijs, geen
browser-, staging- of productiebewijs.

## Beperkingen en OPEN

- Opgelost (12 okt 2026): na het opslaan van entiteitcijfers toont het paneel de door de server
  teruggemelde groepsrij zonder herladen (zie "Actuele stand na opslaan").
- Na een groepsrij-save meldt de server geen groepsbeeld terug; het paneel toont dan de vorige stand
  met de waarschuwing "mogelijk niet meer actueel" tot de volgende entiteit-save of opnieuw laden.
- Buiten scope en ongewijzigd: de directe opslag bij het wisselen van fasekaart in `mna/06` houdt
  `S._gbBevestigd` niet bij; het paneel kan na zo'n opslag dus een oudere stand tonen zonder waarschuwing.
  De bestaande verwerking van `groepswaarden` in `S._groepData` in `mna/02`/`mna/06` controleert de sessie
  niet; die is niet aangepast.
- Geen officiële consolidatie; eliminaties blijven onbekend (nooit 0) en de juridische
  consolidatiekring is niet bewezen.
- OPEN: gedrag met echte klantdocumenten en klantdata, en live AI. Productie is alleen met een eigen
  synthetisch traject bewezen.
- Backendtaak administratief READY, niet native DONE (zie Status bovenaan).
