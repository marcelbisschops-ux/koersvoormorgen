# Documentuitvoer: veilige tekstopmaak en publieke trajectreferentie

Stand: 7 okt 2026, branch `codex/weekend-option2`. Dit bestand beschrijft de huidige frontenduitvoer. Er is nog geen browser-, staging- of productiebewijs. Dat volgt apart.

## Wat er mis was

1. **`mdToHtml`** (`mna/02-state-opslag-documenten.js`). Deze functie wordt gebruikt voor het waarderingsrapport en andere AI-rapporten. Hij begon met `String(text)` en escapete niets. Bron-HTML zoals `<img src=x onerror=…>` kwam daardoor als actieve HTML in de uitvoer, en ook in de opgeslagen `rapport_tekst`.
2. **`printDocNaAkkoord`** (`mna/05-documentflow-partijen.js`). Deze functie bouwt het print-/bekijkvenster na de reliance-pop-up. Hij verwerkte de documenttekst, de titel, het bedrijf, het adres en de alt-tekst van het logo ongeëscapet. Daarnaast drukte hij `S.code` af in de documentkop, en dat is een toegangscode.

## Huidige uitvoer

### `mdToHtml` (rapporten)

- Eerst wordt alleen **attribuutloze** opmaak uit de bron omgezet:
  - `<br>`, `<br/>` en `<br />` worden een regelovergang.
  - `<em>x</em>` en `<i>x</i>` worden platte tekst `x`.
  - `<b>x</b>` en `<strong>x</strong>` worden `**x**` en daarna `<strong>x</strong>`.
- Andere tags worden **weggelaten**. Dat geldt ook voor tags met attributen, zoals `<b class="…">`. De inhoud van `<script>`/`<style>` en HTML-commentaar verdwijnt helemaal. Tekst tussen andere tags blijft staan.
- Daarna wordt alles geëscapet met de bestaande `esc()`. Pas daarna maakt de functie de eigen, vaste opmaak: `<h3>`, `<strong>`, `<p>`, `<br>`, `<ul>`, `<ol>` en `<li>`.
- De Markdown-opmaak werkt zoals voorheen: koppen `#`–`###`, `**vet**`, lijsten met `-`/`•` en `1.`/`1)`, alinea's, pipe-tabellen en het weglaten van `---`.
- Waarom weglaten en niet zichtbaar escapen: de rapportweergave saneert al met `wSaneerRapport`, en de bestaande waarderingsproef (`tests/waardering-genereren.mjs`) eist dat er geen `onerror`/`alert` als tekst overblijft.

### `printDocNaAkkoord` (print/bekijken)

- **Tekst**: dezelfde attribuutloze omzetting van `<br>`, `<em>`/`<i>` en `<b>`/`<strong>`. Daarna wordt alles geëscapet met `esc()`. Andere HTML blijft als **inerte, zichtbare tekst** staan, bijvoorbeeld `&lt;b class="x"&gt;`. De backend-renderer `fmtDocumentTekst` (worker/36) doet dit ook zo. Juridische tekst valt dus niet stil weg.
- Bestaande printopmaak die blijft werken: `Artikel N`-koppen, `##`-koppen, koppen in HOOFDLETTERS (ook met `&`, bijv. `FUSIE & OVERNAME`), `**vet**`, lijsten, alinea's en tekenregels `Naam/Handtekening/Plaats/Datum: ___`.
- **Titel** (`<title>` en de kop): wordt geëscapet. Named of numerieke entiteiten die een aanroeper bewust meegeeft, zoals `&mdash;` in de MoU-titel, blijven werken. Een entiteit is tekst en geen markup.
- **Bedrijf en adres** (footer) en de **alt-tekst van het logo** worden geëscapet. Een attribuut- of title-injectie is daardoor niet mogelijk.
- **Logo**: wordt alleen getoond bij een `https://`-URL zonder spaties, quotes of `<>`, zoals de bestaande R2-logoroute `…/adviseur/logo/{id}?v=…`. Een `data:image/(png|jpeg|webp|gif|svg+xml);base64,…` mag ook. Bij alle andere waarden komt er geen logo: `javascript:`, `data:text/html`, `http:` en waarden met quotes. De waarde wordt geëscapet.
- **Referentie in de kop**: alleen `Trajectreferentie: TR-XXXX-XXXX-XXXX-XXXX` uit `S.traject.publieke_referentie`. Die komt uit de backend-DTO van `GET/POST /mna/traject/{code}`. De referentie wordt alleen getoond als de waarde precies dezelfde vorm heeft als in backend worker/36. Ontbreekt de waarde, is hij leeg of heeft hij een andere vorm (bijvoorbeeld de vorm van een code)? Dan staat er **geen** referentie. Er is nooit een terugval op `S.code`, `id`, `koper_code` of `tussen_code`.
- Ongewijzigd: de reliance-pop-up en audit (`toonRelianceAkkoord`/`secAuditLog`), het CONCEPT-watermerk (niet bij teaser/memo), de statusregel bij memo, `printHtmlDocument`, de auth en rolgrenzen.

## Grenzen en open punten

- **Al verstuurde of ondertekende documenten** (Signhost-PDF's, R2, documentversies) en eerder opgeslagen `rapport_tekst` worden **niet** herschreven. Eerder geprinte of verspreide documenten kunnen de oude code nog bevatten. Of codes geroteerd moeten worden, is een aparte beslissing.
- **Titels die aanroepers zelf opbouwen**: een paar aanroepen in `mna/04` gebruiken `kantoor_naam||S.code` als titel voor MoU, verkoopmemorandum en closing-checklist. Als `kantoor_naam` ontbreekt, kan de code dus nog via de *titel* in de print komen. Dat valt buiten deze wijziging (`mna/04` hoort niet bij de scope) en staat open als vervolgpunt.
- **Backend worker/36** zet `<b>`/`<br>` uit de bron niet om. In de verstuurde PDF blijven die als geëscapete tekst zichtbaar. De printweergave toont ze als opmaak. De backend is hier alleen-lezen en is niet aangepast.
- Een eerdere handmatige bevinding (opmaakmarkers in een document) is met deze formatterproeven **niet** als volledig opgelost aangetoond. De oorspronkelijke plek is historisch niet genoeg bewezen.

## Composer: onopgeslagen invoer bij blur en hertekenen (productpunt 19, 11 okt 2026)

### Oorzaak (`mna/04-begeleider-dashboard.js`)

- Een veld in de MoU/LoI/NDA-composer slaat op bij `blur` (bestaande `PATCH /mna/tos/component/{iid}`). Na een geslaagde opslag riep de handler `bgMouRender()` aan. Die bouwt de hele composer opnieuw op via `out.innerHTML`. Alles wat nog niet was opgeslagen, verdween daardoor stil: een ander veld waarin nog werd getypt en de vrije tekst (die alleen via "Tekst opslaan" wordt bewaard). De focus ging ook verloren.
- Bij een mislukte opslag zette de handler het veld stil terug naar de oude waarde (`inp.value=data-orig`).
- De documentkeuze (`mou-kies`) zette `_mouDocId` al vóór het laden. Invoer in het nog zichtbare oude document kon zo onder het nieuwe document vallen.

### Huidig gedrag

- Elke invoer (`input`) houdt een concept bij **in het geheugen van de composer**. Dat gebeurt per traject (`S.code`), per document, per onderdeel (`instance_id`) en per veld (of de vrije tekst). Er is geen tweede opslagsysteem: geen localStorage of sessionStorage, geen backend- of schemawijziging. Opslaan gaat alleen via de bestaande PATCH.
- Na elke volledige hertekening (`bgMouRender`, ná `bgMouWire`) worden concepten van **hetzelfde traject en document** teruggezet in hetzelfde veld. Focus en cursor gaan terug naar het veld waarin werd getypt. Velden met onopgeslagen invoer krijgen een gouden rand met de titel "Nog niet opgeslagen".
- Elke invoer krijgt een volgnummer. Een geslaagde opslag wist het concept alleen als er sindsdien niets nieuws is getypt. Een oudere, vertraagde opslag overschrijft nieuwere invoer dus niet.
- Na een mislukte opslag blijft de invoer staan. Het veld krijgt een rode rand, `aria-invalid` en de foutmelding als titel. De melding zegt: "… uw invoer is niet opgeslagen en blijft staan". De fout blijft ook na een volgende hertekening zichtbaar.
- Wanneer een vertraagd antwoord binnenkomt nadat al een ander document is gekozen, wordt dat andere document niet opnieuw geladen. De opslag geldt alleen voor het onderdeel waarvoor hij is verstuurd.
- **Bevroren documenten** (gefinaliseerd of verstuurd) krijgen nooit concepten terug. De velden blijven disabled met de opgeslagen waarden. De concepten van dat document vervallen, met de melding "N niet-opgeslagen wijzigingen niet toegepast: dit document is vergrendeld". De backend weigert een PATCH op een bevroren document al (409). Er wordt niets opnieuw verstuurd.
- Een blur die ontstaat doordat de composer zelf het veld vervangt (Chromium kan die vuren), start geen opslag.
- "AI-concept" vraagt niets aan zolang het onderdeel onopgeslagen tekst heeft. Anders zou het teruggezette concept het AI-resultaat op het scherm verbergen. Er is geen automatische AI-aanroep of verzending.
- "Finaliseer & exporteer" waarschuwt eerst als er onopgeslagen wijzigingen zijn.
- Print/PDF en Signhost lezen, zoals voorheen, wat op het scherm staat.

### Grenzen en open punten

- Concepten leven alleen zolang deze dashboardweergave bestaat. Een volledige dashboard-hertekening (`refreshData`/"Ververs", bijvoorbeeld na "Buiten Signhost om getekend") of het herladen van de pagina sluit de composer, en dan zijn de concepten weg. Bewust: geen tweede opslag.
- Twee begeleiders die tegelijk hetzelfde document bewerken: het lokale concept gaat op het scherm vóór de serverwaarde. Het blijft gemarkeerd als "Nog niet opgeslagen". Er is geen conflictdetectie (die zat er ook niet).
- **Stand van het bewijs (11 okt 2026).**
  - Native: de bridge meldt de productcode op `76319fe` als READY.
  - Chromium: buiten deze repo is een aparte proef gedaan met echte Chromium en een synthetisch netwerk. Het resultaat staat in `productpunt19-bewijs/chromium-acceptatie.json`. Die proef hoort bij `mna/04-begeleider-dashboard.js` met SHA-256 `7513195d549d71f1b77712aec2c8944082aa1864cfd6d92604345dd6c4e460de`. Volgens die proef blijft een tweede, nog niet opgeslagen invoer behouden (SECOND UNSAVED). Deze documentatiewijziging heeft die proef niet zelf gedraaid en het bestand niet zelf ingezien. Er is ook geen Playwright-run gedaan in deze repo, en `tests/e2e-ui.spec.js` valt buiten de scope.
  - Staging en productie staan nog **open**. `.pages-dist/` is niet bijgewerkt (buildartefact).

### Vervolg: sluiten met een lopende opslag (12 okt 2026)

**Oorzaak.** "Sluiten" (`mou-close`) verbergt en leegt `bg-doc-out`, maar `_mouDocId` blijft staan. Een opslag die nog liep, zag na de `await` nog steeds "zelfde traject en document" en riep `bgMouRender()` aan. Die vulde de gesloten (verborgen) composer opnieuw en startte een nieuwe `_mouGen`. Was intussen een andere composer geopend (bijvoorbeeld LoI na het sluiten van de MoU), dan brak die af en verscheen de MoU in plaats van de LoI. Hetzelfde gebeurde bij een documentwissel (`mou-kies`) die nog aan het laden was: de late reactie laadde het oude document opnieuw en de wissel ging verloren.

**Huidig gedrag.**

- Na een opslag wordt alleen hertekend als hetzelfde traject en document nog getoond worden, de composer nog in beeld is (`mou-close` bestaat) en de laatst gestarte `bgMouRender` ook voor dit document is (`_mouDocDoel`). Anders wordt niets hertekend en blijft `_mouGen` ongewijzigd.
- Bij een geslaagde late opslag vervalt het concept, zoals voorheen alleen als er sindsdien niets nieuws is getypt. Bij een late fout blijft het concept staan, met de fout. De melding (toast) verschijnt in beide gevallen.
- Na sluiten blijven de concepten van andere velden en van de vrije tekst in het geheugen. Bij **expliciet heropenen** van hetzelfde document komen ze terug, een mislukt veld met de foutmarkering. Sluiten en heropenen versturen niets automatisch: geen PATCH, geen AI, niet finaliseren of versturen.
- Een gewone opslag in een composer die open is, hertekent zoals voorheen. Een lopende hertekening van hetzelfde document blokkeert dat niet. Er is geen algemene onderdrukking van hertekenen.
- Ongewijzigd: de scheiding per traject en document, het bevroren document (geen concepten terug, eerlijke melding), de generatiebewaking en de rechtencontrole in de backend.

**Bewijs (sectie G).** `composer sluiten`, `composer sluiten andere weergave` en `composer sluiten traject/bevroren` gebruiken de echte `bgMouComposer` om te openen en te heropenen. Ze dekken: een vrije tekst en een tweede veld met onopgeslagen invoer, twee PATCHes die nog lopen, sluiten, daarna een late geslaagde opslag en een late fout (geen GET, geen nieuwe generatie, de DOM blijft leeg), heropenen van hetzelfde document, een LoI die opent terwijl de late MoU-reactie binnenkomt, een documentwissel die nog laadt, een trajectwissel en een document dat intussen bevroren is. Dit is synthetisch bewijs in `node:vm`, geen Chromium-, staging- of productiebewijs.

### Vervolg: upload tijdens uitloggen en opnieuw inloggen met dezelfde code (productpunt 1, 12 okt 2026)

**Oorzaak (`mna/02-state-opslag-documenten.js`).** `uploadDocumentenSequentieel`, `uploadDocument` (`nogActueel`) en `centraalUploadFiles` controleerden na de `await` alleen of `S.code` nog gelijk was. `uitloggen()` en de login (`mna/06`) maken elk een nieuw `S`-object, maar bij direct opnieuw inloggen met dezelfde code was de oude reactie dan toch weer "actueel". Die kon een rij in de nieuwe `DOCS` zetten, financiële velden automatisch invullen, toasts en hertekening geven, en de volgende oude batch- of fasebestanden alsnog versturen.

**Huidig gedrag.** Elke reeks en elk verzoek legt bij de start het `S`-object vast (bestaand sessiepatroon, geen nieuwe opslag). Alleen als `S` nog hetzelfde object is én de code gelijk is, wordt iets geschreven of de volgende upload gestart. Een oude reactie (succes of fout) krijgt de uitkomst "onbekend": niet meer getoond, het bestand kan wel op de server zijn opgeslagen, controleer de documentenlijst. Er wordt niets op de server gewist en niets als geannuleerd gepresenteerd. Ongewijzigd: gewone upload, gedeeltelijke fout, annuleren, trajectwissel, GROUP/ENTITY/GENERAL-classificatie, handmatige invoer en bronmapping.

**Bewijs.** `tests/document-processing-ui.mjs` (check 25 van `tests/audit-consistentie.mjs`) draait de echte functies met synthetische, uitgestelde antwoorden: een lopende upload, uitloggen, opnieuw inloggen met dezelfde code met nieuwe `S`/`DOCS`/handmatige data, daarna een oud succes en een oude fout, plus een centrale upload over twee fases. Gecontroleerd: geen tweede verzoek, nieuwe `DOCS` en data ongewijzigd, geen autofill, toast, render, lijstherlaad of opslag, en een eerlijke uitkomst. Synthetisch bewijs in `node:vm`, geen browser-, staging- of productiebewijs.

### Vervolg: documentenlijst tijdens uitloggen en opnieuw inloggen met dezelfde code (productpunt 1, 12 okt 2026)

**Oorzaak (`mna/02-state-opslag-documenten.js`).** `loadDocsForFase` en de interne `laadFout` controleerden na de fetch alleen `S.code`. Dit randgeval stond nog open sinds de rootcausematrix van 7 okt. Bij direct opnieuw inloggen met dezelfde code kon een oude lijstreactie de nieuwe `DOCS[fase]` vervangen. Een oude fout kon `_docsLaadFout` in de nieuwe sessie zetten of wissen en een hertekening geven.

**Huidig gedrag.** `loadDocsForFase` legt bij de start het `S`-object vast, net als de upload- en batchfuncties. Een antwoord wordt alleen verwerkt als `S` nog hetzelfde object is én de code gelijk is. Dat geldt voor succes, HTTP-fout, ongeldige JSON en netwerkfout. Er komt geen nieuwe requestplanner en geen nieuwe opslag. Ongewijzigd zijn het gewone laden, het behouden van de cache bij een fout, de lokale uploadwachtrij van hetzelfde traject en het negeren van een andere code.

**Bewijs.** `tests/document-processing-ui.mjs` (check 25) laat de echte `loadDocsForFase` een uitgesteld lijstantwoord krijgen. Tussendoor wordt uitgelogd en opnieuw ingelogd met dezelfde code, met een nieuwe `S`, een nieuw document in `DOCS`, handmatige financiële invoer en een eigen foutstatus. Daarna komt een oud succes, een oude 503, ongeldige JSON of een netwerkfout binnen, en voor de controle ook een oud succes bij een andere code. Gecontroleerd: `DOCS`, foutstatus en data blijven ongewijzigd, en er volgt geen render, toast, autofill, opslag of extra lijstlading. Een positieve controle laat zien dat een vertraagd antwoord binnen dezelfde sessie gewoon wordt verwerkt en dat de lokale lopende upload blijft staan. Synthetisch bewijs in `node:vm`, geen browser-, staging- of productiebewijs.

## Bewijs

**Composer (sectie G van `tests/document-output-security.mjs`).** De proef draait de echte `bgMouRender`/`bgMouWire`/`bgMouApi` uit mna/04 en `esc` uit mna/02 in `node:vm`. Daarbij horen een minimale synthetische DOM, een nep-fetch met vertraagde PATCH-antwoorden en twee synthetische documenten. De proef controleert:

- Twee velden en de vrije tekst blijven behouden over blur, een geslaagde opslag en het volledig hertekenen. Focus en cursor komen terug. Een Chromium-achtige blur bij het vervangen start geen opslag.
- Een oudere, vertraagde veld- of tekstopslag overschrijft nieuwere invoer niet.
- Een mislukte opslag houdt de invoer, met een geëscapete, eerlijke fout. Dat geldt ook na een nieuwe hertekening.
- Bij een documentwissel wordt niets naar het andere document overgedragen, ook niet bij invoer tijdens het laden. Een late opslag hertekent het nieuwe document niet. Onder een ander traject worden geen concepten toegepast.
- Een bevroren document krijgt geen concepten terug, de velden zijn disabled en er komt een eerlijke melding. Een late 409 maakt geen concept opnieuw aan.
- Er gaat geen AI-verzoek uit zolang er onopgeslagen tekst is. Finaliseren waarschuwt eerst. Er is geen localStorage of sessionStorage.

**Aanhaakpunten in de bron (sectie H van `tests/document-output-security.mjs`).** Drie statische checks op mna/04 controleren het volgende:

- In `bgMouRender` gaan de concepten pas terug ná `out.innerHTML` en `bgMouWire` (volgorde `innerHTML` → `bgMouWire` → `bgMouConceptenToepassen`).
- Er is geen stille terugzetting `inp.value=…data-orig` meer.
- `_mouDocId=this.value` komt niet meer voor in de documentkeuze.

Dezelfde drie checks staan ook in check 14 van `tests/audit-consistentie.mjs`, maar in die versie van de audit zit ook nog niet vrijgegeven CI-werk (#22). Voor een beperkte release van #19 hoeft die audit dus niet mee. De suite draait via de bestaande import en `await` in check 26 (`draaiDocumentOutputSecurityChecks`). Productcode, audit en workflow zijn hiervoor niet gewijzigd.

**Documentuitvoer.**

`tests/document-output-security.mjs` (ook check 26 in `tests/audit-consistentie.mjs`) draait de echte `esc`/`mdToHtml` uit mna/02 en de echte `printDocNaAkkoord` uit mna/05 in `node:vm`, met een synthetisch window/document, nep-fetch en een vastgelegde `printHtmlDocument`. De proef controleert:

- Er staan alleen eigen tags met gequote, toegestane attributen in de uitvoer. Script, img, onerror, `javascript:`-URL's en quotes zijn niet actief.
- `<b>Rechtsvorm</b>` en dergelijke zijn leesbaar, zonder markers.
- De bestaande Markdown- en printopmaak werkt nog.
- Titel, header, footer en logo-alt zijn veilig.
- Het logo verschijnt alleen bij https of base64.
- De referentie heeft het juiste label en er staat geen code in.
- Er zijn geen fetch-, audit-, opslag- of navigatie-effecten, en `S` blijft ongewijzigd.
