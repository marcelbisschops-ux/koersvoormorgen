# Financiële broncontrole: UI (productpunt 3)

Status 9 okt 2026: de frontend is gebouwd en technisch getest met synthetische data. Bewijs via docs,
staging en productie staat nog **OPEN** (zie onderaan). Deze bouwtaak bevat geen deployment.

Code: `mna/09-financiele-broncontrole.js` (gewone scriptmodule, in `mna.html` geladen vóór
`mna/06-schermen.js`) en één aanroep in `renderMain` (`mna/06-schermen.js`). Er is geen nieuwe API,
geen nieuw schema, geen dependency en geen AI-aanroep.

## Backendafhankelijkheid

De UI gebruikt alleen de bestaande, gecommitte backendroutes (backend `docs/financial-source-control.md`,
`worker/11-mna-tekenen-beheer.js`, `worker/40-financiele-broncontrole.js`):

- `GET /mna/financieel/broncontrole/{code}[?entiteit_id=…]`: lezen.
- `POST /mna/financieel/broncontrole/correctie` met precies `code`, `entiteit_id`, `veld_id`,
  `nieuwe_waarde`, `verwachte_oude_waarde`, `reden` en `bron_document_id`.

Zolang deze routes niet op de gebruikte worker draaien, geeft de UI een duidelijke melding "niet
beschikbaar (404)". Dat is nooit een succes. Releasevolgorde: eerst de backend, dan deze frontend.

## Gebruik

1. Open de fase **Financieel**. Onder het invulscherm staat het paneel **Financiële broncontrole**.
2. Klik op **Broncontrole starten**. Er wordt niets automatisch geladen. Daarna heet de knop
   **Verversen**. Wordt het scherm daarbij opnieuw getekend, dan blijft getypte maar nog niet
   opgeslagen invoer in de financiële velden staan. Het paneel slaat zelf niets op. Verversen sluit
   een correctie die nog niet is verstuurd.
3. De scope volgt de bestaande kiezer "Invullen voor". Zonder entiteit gaat het om de
   trajectniveau-rij. Die is **niet automatisch geconsolideerd**: of een bron enkelvoudig of
   geconsolideerd is, blijkt alleen uit de bronbasis per bron.
4. Per grootheid ziet u:
   - de huidige ingevoerde waarde (zekerheid onbekend, geen bewezen bronbinding) en de laatste
     broncorrectie;
   - de bronnen met een label **BRONFEIT**, **AI-INTERPRETATIE** of **ONZEKER**;
   - het origineel uit de bron en de genormaliseerde waarde naast elkaar;
   - valuta, eenheid, periode (realisatie ACTUAL of prognose FORECAST), entiteitscope (enkelvoudig,
     geconsolideerd met kring, of onbekend), bronlocatie, methode en wat er ontbreekt;
   - een eventueel AI-voorstel, apart en als onbevestigd gemarkeerd;
   - de crosscheck: status, absoluut en relatief verschil, tolerantie, redenen en hypothesen (niet
     bewezen).
5. Ontbrekende informatie staat er als "onbekend" of onder "Ontbrekend". De UI raadt geen waarde,
   periode, scope of origineel.
6. Een document staat er als bestandsnaam met een referentie (id), zonder link. Openen gaat via de
   bestaande documentenlijst van de fase. Een afgeschermd id heet "afgeschermd".
7. De weergave is begrensd tot 50 documenten, 10 bronnen en 10 vergelijkingen per grootheid. Is er
   meer, dan staat er "X van Y getoond — deze weergave is niet volledig."

### Correctie (alleen de verkoper)

De knop **Corrigeren met reden** verschijnt alleen als aan alle voorwaarden is voldaan:

- de gebruiker is de verkoper;
- de server meldt `correctie_toegestaan: true`;
- het traject is niet vergrendeld of afgesloten;
- de waarde is geen automatisch afgeleide groepswaarde.

Het formulier vraagt het volgende:

- **Nieuwe waarde** in Nederlandse notatie, bijvoorbeeld `1.234.600` of `-12500,50`. Een dubbelzinnige
  notatie zoals `1234.5` of `1,234`, tekst, een leeg veld en meer dan twee decimalen worden geweigerd.
  Een leeg veld wordt nooit 0. De UI toont welke canonieke waarde wordt vastgelegd en controleert die
  met de bestaande `parseGeld`.
- **Brondocument**: alleen documenten van deze scope met een id en een bruikbare status.
- **Reden en bewijs**: 10 tot 1000 tekens.
- **Bevestiging**: de correctie is een gebruikerscorrectie met auditspoor en géén automatisch bronfeit.

Als verwachte oude waarde stuurt de UI exact de serverwaarde mee die in het paneel staat.

Heeft het formulierveld een andere waarde dan de server, of wacht er nog een opslag, dan wordt de
correctie geblokkeerd. Sla eerst gewoon op en ververs het paneel. De UI roept zelf nooit
`saveCurrent` of `/mna/save` aan.

Na een geslaagd serverantwoord gebeurt het volgende:

- De lokale waarde van precies die scope wordt bijgewerkt met de door de server bevestigde Nederlandse opslagnotatie (bijvoorbeeld `1234600,5`). API en audit houden de canonieke waarde `1234600.5`; de bestaande rekenkern leest daardoor hetzelfde bedrag, ook na herladen. Een ontbrekende of afwijkende opslagwaarde in het antwoord wordt niet als bevestigd succes verwerkt. Heeft de gebruiker intussen in het veld
  getypt, dan blijft die invoer staan en wordt dat gemeld.
- Het paneel laadt opnieuw.
- De melding toont het audit-id en "geen bronfeit".
- De oorspronkelijke bronwaarden en documenten blijven ongewijzigd.

Tijdens het vastleggen is de knop geblokkeerd, dus een dubbelklik verstuurt maar één verzoek.

## Rechten

| Rol | Paneel | Lezen | Correctie |
|---|---|---|---|
| Verkoper | ja | ja | ja, onder de voorwaarden hierboven |
| Begeleider | ja | ja | nooit (alleen lezen) |
| Koper / onbekende rol | nee | geen verzoek | nee |

De beheerder (`ADMIN_KEY`) heeft in deze UI geen eigen rol en corrigeert nooit. De server blijft de
autoriteit: rol, traject en entiteit worden daar opnieuw gecontroleerd.

## Scopebinding

Elk verzoek hoort bij precies één combinatie van code, rol, entiteit, scherm en fase. Wisselt een
daarvan, dan wordt de geladen data gewist en wordt een laat antwoord genegeerd. Er komt dan niets
in een ander traject, een andere entiteit, een andere rol of een ander scherm terecht.

Een te laat geslaagd correctieantwoord werkt alleen de lokale waarde van de oorspronkelijke entiteit
bij, binnen dezelfde sessie. De nieuwe scope ziet er niets van.

Een leesantwoord wordt alleen getoond als het `ok: true` heeft, de verwachte rol (`verkoper` of
`begeleider`), dezelfde `entiteit_id` en de verwachte structuur.

## Foutmeldingen

| Situatie | Lezen | Correctie |
|---|---|---|
| 404 zonder foutcode | "niet beschikbaar (404)": de functie is mogelijk nog niet vrijgegeven | idem, "er is niets vastgelegd" |
| 404 entiteit / brondocument / gegevensrij | entiteit hoort niet bij dit traject | servermelding |
| 403 voorwaarden | eerst de platformvoorwaarden accepteren | idem |
| 403 overig | geen toegang | vergrendeld, of alleen de verkoper |
| 400 / 413 | ongeldig verzoek | servermelding (geëscapet) |
| 409 | n.v.t. | melding, daarna alleen opnieuw lezen; geen automatische retry |
| 500 / 503 / overig | tijdelijk niet beschikbaar (HTTP-code) | niet bevestigd, geen retry |
| Netwerk / time-out | geen verbinding | onbekend of het aankwam, geen retry, eerst verversen |
| Onleesbaar of onverwacht 200 | onleesbaar of onverwachte vorm, geen data | niet bevestigd, lokaal niets aangepast |

Alle servertekst wordt geëscapet, ook in attributen.

## Tests

- `node tests/financial-source-ui.mjs`. Draait ook als check 27 in `node tests/audit-consistentie.mjs`.
- De test laadt de echte `mna/09`, plus `fetchMetTimeout` (mna/01), `esc` en de rolhelpers (mna/02) en
  `parseGeld` (mna/03), in `node:vm`. Fetch en DOM zijn synthetische stubs met antwoorden in de vorm
  van de gecommitte backend.
- Er is geen netwerk, geen browser, geen live API, geen AI en geen klantdata.

## OPEN (niet door deze bouwtaak bewezen)

- Onafhankelijke review en de normale commitroute.
- Browserbewijs van layout en klikgedrag in `mna.html`.
- Staging: de backendroutes draaien op de stagingworker, met echte rollen (verkoper, begeleider,
  koper) en een echte 409.
- Productie: release van de backend vóór de frontend, en daarna een rooktest.
- Een nette weergave van broncorrecties in het begeleiderslogboek "Wijzigingen" valt buiten deze
  taak.

Huidige en oude veldwaarden worden expliciet als Nederlandse notatie weergegeven: `300.000` blijft driehonderdduizend. Genormaliseerde bronwaarden en nieuwe auditbedragen worden expliciet als canonieke bedragen weergegeven. Er wordt niet geraden welke notatie een bedrag heeft. Deze UI vereist het backendcontract met `opgeslagen_waarde` uit commit `da95d0cf503ce63c3ab62dba51e923a8248f3890`. De frontendcorrectie is afzonderlijk door Marcel geautoriseerd buiten builder-WRITE; oorspronkelijke builderbewijzen blijven bewaard.
