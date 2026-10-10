# Juridische broncontrole: UI (productpunt 4)

Status 10 okt 2026: de frontend is gebouwd en technisch getest met synthetische data. Staging, echte
documenten (KvK-uittreksels, statuten) en productie staan nog **OPEN** (zie onderaan). Deze bouwtaak
bevat geen deployment en geen release.

Code: `mna/10-juridische-broncontrole.js` (gewone scriptmodule, in `mna.html` geladen na
`mna/09-financiele-broncontrole.js` en vóór `mna/06-schermen.js`) en één aanroep
`renderJuridischeBroncontrole(f.id)` in `renderMain` (`mna/06-schermen.js`). Er is geen nieuwe API,
geen nieuw schema, geen dependency, geen documentsysteem en geen AI-aanroep. De financiële
broncontrole (mna/09) en de upload-/documentflow zijn niet gewijzigd.

## Backendafhankelijkheid

De UI gebruikt alleen de bestaande, gecommitte backendroutes (backend `docs/legal-structure-control.md`,
`worker/11-mna-tekenen-beheer.js`, `worker/41-juridische-broncontrole.js`):

- `GET /mna/juridisch/broncontrole/{code}`: lezen.
- `POST /mna/juridisch/broncontrole/beoordeling` met precies `code`, `snapshot_digest`, `beslissing`
  (`BEVESTIGD`/`AFGEWEZEN`), `reden` en optioneel `verschil_id`.

De backend is nog niet gereleased. Zolang deze routes niet op de gebruikte worker draaien, geeft de UI
de melding "niet beschikbaar (404): de serverfunctie is mogelijk nog niet vrijgegeven". Dat is nooit
een succes. Releasevolgorde: eerst de backend, dan deze frontend. De financiële release blijft hiervan
los en is niet aangeraakt.

## Gebruikersstappen

1. Open de fase **Juridisch** (VI). Onder het invulscherm staat het paneel **Juridische broncontrole**.
2. Klik op **Broncontrole starten**. Er wordt niets automatisch geladen en er wordt nooit AI gestart.
   Daarna heet de knop **Verversen**. Bij hertekenen blijft getypte maar nog niet opgeslagen invoer in
   de velden van de fase staan; het paneel slaat zelf niets op.
3. Het paneel toont:
   - de serverstatus: **Onvoldoende broninformatie**, **Verschillen gesignaleerd** of **Geen
     verschillen gesignaleerd (geen juridische goedkeuring)**, het aantal bruikbare bronnen en de
     controlesnapshot (verkorte digest);
   - een waarschuwing als de controle niet volledig is (afkapping van entiteiten, documenten of
     voorstellen);
   - **Verschillen** (signalen, geen juridische feiten), elk met platformzijde, bronzijde en
     bronverwijzingen;
   - **Onbekenden en onzekerheden** (bijv. moeder onbekend, consolidatiekring/verkoopperimeter
     onbekend, bronnen niet meegenomen, afgekapt);
   - de **Platformstructuur (handmatig register)** met naam, KvK (of "niet vastgelegd"/"ongeldig
     formaat") en rol, plus wat het platform níet vastlegt (moeder-dochterrelaties, percentages,
     handelsnamen, consolidatiekring, verkoopperimeter). Dat wordt niet afgeleid;
   - het **Bronvoorstel uit documenten**, overal gelabeld **ONBEVESTIGD VOORSTEL · AI-INTERPRETATIE**:
     bronentiteiten met koppeling aan het platform (op KvK of naam, of geen koppeling),
     eigendomsrelaties (percentage alleen "volgens bron", anders onbekend/ongeldig; een natuurlijk
     persoon als houder blijft afgeschermd), en consolidatiekring/verkoopperimeter per bron;
   - **Documenten en bruikbaarheid**: bestandsnaam, referentie-id, versie, verkorte inhoudshash,
     status, methode, of het juridische voorstel gebruikt is, de reden waarom niet, en het
     AI-zelfoordeel als "niet geverifieerd";
   - **Menselijke beoordelingen**: **ACTUEEL** alleen als de server dat meldt én de digest exact gelijk
     is aan de getoonde snapshot; anders **HISTORISCH_VEROUDERD** (of "status onzeker"). Met
     beslissing, motivatie, tijdstip, rol, audit-id en snapshot.
4. Elke bronverwijzing toont document-id, versie, hash, pagina en het AI-bronfragment (niet
   geverifieerd). Wat ontbreekt staat als **Ontbrekend bewijs** (bijv. "pagina, bronfragment"). De UI
   verzint geen naam, KvK, percentage, moeder, consolidatiekring of perimeter.
5. Documenten krijgen geen link: openen gaat via de bestaande documentenlijst van de fase.
6. De weergave is begrensd (30 verschillen, 30 onbekenden, 50 platformentiteiten, 30 bronentiteiten,
   30 relaties, 10 kring-/perimetervermeldingen, 50 documenten, 20 beoordelingen, 5 bronverwijzingen
   per item). Is er meer, dan staat er "X van Y getoond — deze weergave is niet volledig."

### Beoordeling vastleggen (alleen de eigen begeleider)

De knoppen **Hele controlesnapshot beoordelen** en **Dit verschil beoordelen** verschijnen alleen als
aan alles is voldaan: frontendrol begeleider (`isTussen()`), serverantwoord `rol: "begeleider"` en
`beoordeling_toegestaan === true`, traject niet vergrendeld of afgesloten, minstens één bruikbare bron
en een geldige snapshotdigest (64 hex).

Het formulier vraagt een beslissing **BEVESTIGD** of **AFGEWEZEN**, een motivatie van 10 tot 1000
tekens (getrimd, zonder stuurtekens) en een expliciete bevestiging dat dit een menselijke beoordeling
van een onbevestigd bronvoorstel is en **geen juridische totaalgoedkeuring**. De knop is tijdens het
vastleggen uitgeschakeld (dubbelklik geeft één POST) en verversen is dan geblokkeerd.

Succes wordt alleen gemeld bij HTTP 200 met `ok: true`, dezelfde beslissing, snapshotdigest en
`verschil_id`, een audit-id (`WZ…`), `juridisch_bewezen: false` en `entiteiten_gewijzigd: false`.
Daarna wordt de controle opnieuw gelezen, zodat de nieuwe beoordeling in de lijst staat.

## Rolrechten

| Rol | Paneel | GET | POST |
|---|---|---|---|
| Verkoper | ja, alleen lezen | na klik | nooit |
| Begeleider | ja | na klik | alleen onder de voorwaarden hierboven |
| Koper, meekijker, onbekende rol | nee | nooit | nooit |
| Beheerder (`ADMIN_KEY`) | de UI stuurt nooit een beheerderssleutel; een serverantwoord met `rol: "admin"` past niet bij de frontendrol en wordt niet getoond | — | nooit |

De server bepaalt de bovengrens; het paneel krijgt geen eigen rechten en gebruikt de bestaande
rolherleiding via de trajectcode.

## Audit

De UI schrijft zelf niets. De backend legt per beoordeling precies één `mna_wijzigingen`-rij vast
(`type = 'juridische_broncontrole_beoordeling'`) met beslissing, motivatie, `verschil_id`,
snapshotdigest en bronbinding. De UI toont het audit-id na succes en in de beoordelingslijst.
Entiteiten, formulierdata (`S.data`), documenten en bronvoorstellen worden niet gewijzigd; er is geen
`saveCurrent` en geen aanroep van de entiteitenroute. Correcties aan entiteiten lopen via het
bestaande entiteitenregister.

## Fouten en scope

- **GET**: 404 (niet vrijgegeven/niet gevonden), 403 (geen toegang of platformvoorwaarden), 400,
  503/overig, netwerk/time-out, onleesbaar of onverwachte vorm (ook `juridisch_bewezen` ≠ `false`,
  onbekende status of verkeerde rol): een duidelijke melding, geen data en geen schijnsucces.
- **POST 409** (`VEROUDERD`, `VERSCHIL_NIET_IN_SNAPSHOT`, `GEEN_BRONVOORSTEL`): niets opnieuw
  verstuurd. De controle wordt opnieuw gelezen; de motivatie blijft staan, maar beslissing en
  bevestiging moeten opnieuw. Is een verschil verdwenen, dan wordt het besluit niet stil omgezet naar
  de hele snapshot.
- **POST 403/404/400/503/500/netwerk/onverwacht 200**: een duidelijke melding, geen retry, geen vals
  succes; de motivatie blijft staan.
- **Scopebinding**: elk verzoek hoort bij code, rol, scherm en fase. Bij een wissel worden brondata,
  meldingen en een begonnen motivatie gewist en worden late GET- of POST-antwoorden genegeerd. Er is
  geen cache tussen klanten; na een (latere) rolwissel is nooit oude brondata zichtbaar.
- Alle servertekst (ook in attributen) gaat door `jbcEsc`.

## Test

`node tests/legal-structure-ui.mjs` draait ook als check 28 in `node tests/audit-consistentie.mjs`.
De test draait de echte `mna/10` met de echte `fetchMetTimeout` (mna/01) en rolhelpers (mna/02) in
`node:vm`, tegen synthetische antwoorden in de vorm van worker/41. Er is geen netwerk, geen browser,
geen live API, geen AI en geen klantdata. Gedekt: render/GET/POST, verkoper alleen lezen,
begeleiderbeoordeling, admin/geen recht zonder POST, koper/meekijker zonder verzoek, verschillen,
onbekenden, AI niet als feit, bron/versie/hash, historische beoordeling, XSS,
malformed/404/403/503/netwerk, 409 zonder retry, dubbelklik, late antwoorden bij een andere klant of
ander scherm, onopgeslagen formulierinvoer, motivatievalidatie, geen entiteitmutatie en geen AI.

## OPEN

- Backenddeploy van de juridische routes (nog niet gereleased) en daarna frontendrelease.
- Stagingvalidatie in een echte browser met echte rollen en platformvoorwaarden.
- Validatie met echte juridische documenten; de AI-kwaliteit van de bronvoorstellen is onbewezen.
- Productie.
- De bestaande begeleiderweergave "Wijzigingen" toont de auditenvelop nog als tekst (backendbeperking,
  niet in deze taak).
