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
- Ongewijzigd: de reliance-pop-up en audit (`toonRelianceAkkoord`/`secAuditLog`), het CONCEPT-watermerk (niet bij de teaser), de statusregel bij memo, `printHtmlDocument`, de auth en rolgrenzen. Sinds 14 okt 2026 (B2, zie onder) krijgt het verkoopmemorandumconcept (`memo`) wél het watermerk; alleen `memo_definitief` niet. Sinds 17 okt 2026 (productpunt 14, zie onder) heeft ook een definitieve MOU/LoI/NDA geen watermerk, maar alleen na servercontrole van de printtekst. Een docType alleen zet het watermerk nooit uit.

## Grenzen en open punten

- **Al verstuurde of ondertekende documenten** (Signhost-PDF's, R2, documentversies) en eerder opgeslagen `rapport_tekst` worden **niet** herschreven. Eerder geprinte of verspreide documenten kunnen de oude code nog bevatten. Of codes geroteerd moeten worden, is een aparte beslissing.
- **Titels die aanroepers zelf opbouwen**: een paar aanroepen in `mna/04` gebruiken `kantoor_naam||S.code` als titel voor MoU en closing-checklist. Als `kantoor_naam` ontbreekt, kan de code dus nog via de *titel* in de print komen. Dat staat open als vervolgpunt. Het verkoopmemorandum valt sinds B2 (14 okt 2026) niet meer terug op `S.code`: zonder `kantoor_naam` is de titel alleen "Verkoopmemorandum".
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
- Print/PDF en Signhost lezen, zoals voorheen, wat op het scherm staat. Uitzondering sinds 17 okt 2026: Print/PDF van een definitieve MOU/LoI/NDA gebruikt de geverifieerde servertekst (productpunt 14, zie onder).

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

### Vervolg: autosave bevestigt alleen wat werkelijk is opgeslagen (productpunt 19, 12 okt 2026)

**Oorzaak (`mna/02-state-opslag-documenten.js`).** Twee paden:

- `saveAll` zette `S._dirty=false` en `_lastSavedHash` al direct na het **versturen**. Het 30s-interval toonde meteen "Auto-opgeslagen ✓". Faalde het verzoek daarna (netwerk, HTTP-fout, onleesbaar antwoord), dan bleef de groene melding staan, was de staat schoon en volgde geen nieuwe poging.
- `userEdit` zette getypte invoer tot de debounce (1200 ms) alleen in de DOM. Een `renderApp` in die tussentijd tekende het veld leeg uit `S.data`. Daarna verstuurde `saveCurrent` een lege financiële waarde en meldde de server die als geslaagd (staging-tijdlijn: invoer → 39 ms lege render → 2010 ms leeg verzoek → 200 ok). Er is geen backendfout; de server sloeg op wat hij kreeg.

**Huidig gedrag (criteria).**

- Een opslag telt alleen als bevestigd bij **HTTP 2xx én leesbare JSON met `ok:true` en zonder `error`**. Netwerkfout, ongeldige JSON, lege body, onbekend antwoord (`{}`, `null`, `ok` ontbreekt of `false`) en elke non-2xx zijn een fout.
- `saveAll` (30s-interval, tabwissel, uitloggen, na upload) maakt `S` pas schoon (`_dirty=false`, `_lastSavedHash`) en toont pas "Auto-opgeslagen ✓"/"Opgeslagen ✓" als **alle** verstuurde fasen zo zijn bevestigd. Bij één mislukte fase (ook als de andere slagen) blijft alles dirty en verschijnt één eerlijke melding: "… niet opgeslagen; probeer het opnieuw". De volgende intervaltik probeert het opnieuw; zolang een ronde loopt, start het interval geen tweede.
- `markDirty` telt een wijzigingsnummer (`S._dirtyRev`). Een bevestiging maakt alleen schoon als sinds het versturen niets is gewijzigd en de hash gelijk is. Een nieuwere invoer met dezelfde hash (bv. een notitie, of dezelfde waarde opnieuw getypt) blijft dus dirty.
- Een antwoord telt alleen voor hetzelfde `S`-object, dezelfde code en dezelfde rol. Na uitloggen en opnieuw inloggen (ook met dezelfde code) of een rolwissel geeft een oud antwoord geen groen, geen melding, maakt niets schoon en schrijft geen groepswaarden. Een late debouncetimer start geen `saveCurrent` in een nieuwe sessie.
- `sendBeacon` (pagehide/beforeunload) is alleen "in de wachtrij gezet", geen serverbevestiging: dirty en hash blijven staan en er komt geen melding. `false` of een exceptie geeft geen valse opslag. Per wijzigingsstand gaat hooguit één beaconronde uit.
- `saveCurrent`/`_verstuurGeplandeSave` toont "Opgeslagen ✓" volgens dezelfde regel. Bij een groepsniveau-veld in entiteitcontext pas als ook de groepsrij-save (`saveGroepsniveauVelden`) zo is bevestigd. Een netwerkfout of onleesbaar antwoord geeft nu een melding in plaats van stilte.
- `userEdit` zet elke invoer direct in het bestaande datamodel van de sessie/fase/entiteit (`S.data`, of `S._groepData` voor een groepsniveau-veld). Dit gebeurt met dezelfde poorten als `saveCurrent`: niet voor de koper, niet voor de begeleider in Financieel en niet bij een vergrendeld traject. De bronstatus "handmatig" blijft zoals hij was. Een hertekening vóór de debounce toont de waarde dus, en de opslag verstuurt exact wat is getypt.

Ongewijzigd: snapshot/pending per fase/entiteit in `saveCurrent`, rol- en vergrendelpoorten, de groepsbeeld-callbacks (`gbOpslagStart`/`gbOpslagKlaar`, productpunt 5), de upload- en lijstsessieveiligheid, de API, het schema en de backend. Er is geen nieuwe opslag of planner bijgekomen.

**Bewijs.** `tests/document-processing-ui.mjs` (check 25) draait de echte `markDirty`/`_dataHash`/`saveAll`, het 30s-interval en de visibilitychange/pagehide/beforeunload-handlers. Daarnaast draait de test `userEdit`/`schedSave`/`saveCurrent`/`_verstuurGeplandeSave`/`saveGroepsniveauVelden`/`getDataForFase`/`loadDataFromDB`/`showSaveIndicator`, zonder saveAll-stub, tegen uitgestelde synthetische `/mna/save`-antwoorden. De test controleert:

- pending (dirty, hash oud, geen groen);
- elke foutsoort hierboven, met daarna een nieuwe poging;
- meerdere fasen met een gedeeltelijke fout en in omgekeerde volgorde;
- een nieuwere edit met dezelfde hash;
- sessiereset met dezelfde code, een andere rol en een rolwissel;
- beacon `true`/`false`/exceptie;
- de invoerroute: exact `234567` → hertekening vóór de 1200 ms-timer → opslag → bevestiging → heropenen als verkoper en als begeleider via `loadDataFromDB`;
- fouten op het `saveCurrent`-pad, een geannuleerde debounce (uitlogpad), een entiteitwissel en een groepsniveau-veld met twee bevestigingen.

Dit is synthetisch bewijs in `node:vm`, geen browser-, staging- of productiebewijs. Wat de koper ziet vóór en na de financiële vrijgave bepaalt de backend. Dat wordt na de release in de volledige bestaande LIVE-targetflow gecontroleerd en valt buiten deze frontendtest.

**Vervolg fasenotitie (15 okt 2026).** De textarea `notitie_<fase>` (mna/06) had alleen `oninput="schedSave()"`. `saveCurrent` las `S.notities[fase]` pas na de debounce uit de DOM. Een `renderApp` in die tussentijd tekende de textarea opnieuw uit de oude `S.notities`, waarna de oude notitie werd verstuurd en door de server als geslaagd bevestigd. Nu roept de textarea `notitieEdit(this)` aan (mna/02, naast `userEdit`). Die zet de waarde direct in `S.notities` van de huidige sessie/fase en roept daarna `schedSave` aan. De poorten zijn dezelfde als bij `userEdit`/`saveCurrent`: niet voor de koper, niet voor de begeleider in Financieel en niet bij een vergrendeld traject. De pending/snapshot/entiteitlogica in `saveCurrent` is ongewijzigd. De test controleert (synthetisch, `node:vm`): notitie getypt → hertekening vóór de 1200 ms-timer → het verzoek bevat de nieuwe notitie → "Opgeslagen ✓" pas na het antwoord. Daarnaast: koper/begeleider-in-Financieel/vergrendeld muteren `S.notities` niet, en de gewone opslag (notitie zonder hertekening, alleen veldinvoer) blijft ongewijzigd.

### Vervolg: leesfouten in de documentgeschiedenis (productpunt 16, 13 okt 2026)

**Oorzaak.** De backend (`GET /mna/versies/:code[/type]`, backendtaak T20261013-083323-d1cc, commit `3f46b10`) geeft bij een DB-leesfout nu een veilige 5xx. `200 []` betekent alleen nog een echt lege historie. De frontend maakte dat onderscheid niet. Sommige leespaden vingen fouten af als `[]`. Andere lazen de JSON zonder HTTP-controle of arraycontrole. Gevolgen:

- `toonDocWaarschuwing` (mna/05) gaf dan een onterechte blokkade ("BEM nog niet aangemaakt"). Of er kwam geen waarschuwing, waarna `onDoorgaan` (genereren) direct startte.
- `bgToonOfGenereerDoc` (mna/04) zag "geen versie" en ging naar het genereerpad, terwijl er al een versie kon bestaan.
- `laadBgDocs` (mna/04) toonde bij `{error}` "Nog geen documenten.".
- `laadPartijDocs` (mna/05) en het waarderingsrapport (mna/06) verdwenen stil. Het rapport leek dan "nog niet gegenereerd".
- De LoI-melding in `bgDoc` zei "geen eerder dealvoorstel gevonden".

**Huidig gedrag.**

- Eén kleine helper `leesVersieLijst(url, opts)` in mna/05 wordt ook vanuit mna/04 aangeroepen. Alleen HTTP 2xx met een leesbare array telt als historie. Netwerkfout, 401/403/5xx, ongeldige JSON, `null` of een object gooien een fout. mna/06 doet dezelfde controle inline, omdat `tests/waardering-genereren.mjs` dat fragment los draait. Er zijn geen nieuwe API's, modules of instellingen bijgekomen, en de headers en rolfilters zijn ongewijzigd.
- **Legitiem `200 []`** volgt overal de bestaande workflow: de bestaande blokkades en waarschuwingen, het genereerpad, "Nog geen documenten" en het lege waarderingsoverzicht.
- **Bij een leesfout** verschijnt in de huidige context een neutrale melding met "Opnieuw proberen". Er komt geen ruwe foutmelding in beeld. Per plek:
  - `toonDocWaarschuwing`: een blokkerende modal met alleen de leesfout. Er volgt geen aanwezigheidsoordeel en geen "Toch doorgaan". `onDoorgaan` wordt niet aangeroepen.
  - `bgToonOfGenereerDoc`: geen documentwaarschuwing en geen generatie.
  - `laadBgDocs` en `laadPartijDocs`: de melding staat in de documentsectie.
  - Waarderingsrapport: de melding staat in `w-ai-hist`. Een mislukte lezing van de laatste versie (`/mna/versie/:id`) telt ook als leesfout. Het getoonde rapport blijft staan.
  - LoI (`bgLeesDealvoorstelCijfers`): de melding zegt dat het dealvoorstel niet gelezen kon worden en dat er geen cijfers zijn overgenomen. De expliciet gevraagde, server-side generatie gaat gewoon door, want die gebruikt deze cijfers niet.
- Er wordt niets automatisch opgeslagen, leeggemaakt, gegenereerd of verstuurd op basis van een onbekende historie. Getypte en geladen tekst elders op het scherm blijft staan.
- **Oude antwoorden.** Een antwoord wordt alleen verwerkt als aan alle voorwaarden voor die plek is voldaan:
  - het `S`-object en de code zijn nog dezelfde (zo nodig ook de rol en het scherm);
  - de doelsectie wordt nog getoond;
  - bij `bgToonOfGenereerDoc` en `laadBgDocs`: het is de laatste aanroep (volgnummer). Bij `bgToonOfGenereerDoc` moet ook het eigen "Laden..."-blok nog in `bg-doc-out` staan;
  - bij het waarderingsrapport: er wordt intussen geen rapport gegenereerd of getoond.

  Anders gebeurt er niets. `bgDoc` stopt na de dealvoorstellezing als de sessie of het traject is gewisseld.

**Grenzen.**

- `bgToonOfGenereerDoc` vervangt, zoals voorheen, bij de klik meteen de inhoud van `bg-doc-out` door "Laden...". Dat gebeurt los van de leesuitkomst.
- `/mna/versie/:id` (één versie lezen), de dataroomlijst en de Signhost-status zijn niet aangepast, behalve de genoemde lezing van het laatste waarderingsrapport.
- `marilyn.html` valt buiten de scope. `.pages-dist/` (buildartefact) is niet bijgewerkt.

**Bewijs (sectie I van `tests/document-output-security.mjs`).** De test draait de echte `toonDocWaarschuwing`, `laadPartijDocs`, `bgToonOfGenereerDoc`, `bgLeesDealvoorstelCijfers`, `laadBgDocs`, `wLaadGeschiedenis` en `wLaadLaatsteRapport` met de echte `leesVersieLijst` en `esc`. De DOM en de antwoorden zijn synthetisch. Per functie dekt de test:

- de antwoorden geldig, `200 []`, 500, 401, 403, netwerkfout, ongeldige JSON, `200 {…}` en `200 null`;
- opnieuw proberen;
- behoud van getypte tekst en van het getoonde rapport;
- geen onterechte `onDoorgaan`, generatie of vervolgverzoek;
- late antwoorden na een sessie-, traject-, rol-, scherm- of weergavewissel, een dubbelklik of een herlaad.

Een statische check eist bovendien dat elke `/mna/versies`-lezing in mna/04, 05 en 06 via de helper of met een HTTP-controle loopt.

Dit is synthetisch bewijs in `node:vm`. Tijdens het bouwen is de suite niet lokaal gedraaid; de bridge voert hem uit via check 26. Browser-, staging- en productiebewijs staan nog open. De frontend gaat alleen samen met de backend naar staging en release; een backend-READY telt niet als product-DONE.

### Vervolg: verkoopmemorandum concept → definitief in de bestaande UI (B2, productpunten 13/14/16, 14 okt 2026)

**Oorzaak.** De backend (B1, `worker/19b-waardering-communicatie.js`, zie `docs/verkoopmemorandum-lifecycle.md` in de backendrepo) kent sinds productpunt 14 de status `definitief`, met snapshot en hash. Het bestaande memorandumvenster in `mna/04` (`toonVerkoopmemoModal`) kon dat niet gebruiken. Het toonde de status als losse tekst, sloeg op met `fetch` zonder HTTP-controle (`.catch → {}`), had geen vaststelling en geen nieuwe conceptversie, en drukte elk memorandum zonder watermerk af. Een 409 van de backend werd alleen als toast getoond.

**Backendcontract (alleen gelezen, niet gewijzigd).**

- `POST /mna/verkoopmemorandum/opslaan` `{code, tekst}`; op een definitief memorandum alleen met `nieuw_concept:true` + `definitief_sha256` (SHA-256, 64 hex, van de actuele definitieve tekst). Antwoord `{ok, status:'bewerkt', tekst_sha256}`, bij een nieuw concept ook `nieuw_concept:true`, `basis_definitief_sha256`, `audit_id`. 409 `DEFINITIEF` of `VEROUDERD`.
- `POST /mna/verkoopmemorandum/definitief` `{code, tekst_sha256, vastgesteld_door (1–120), tekst}` met `x-tussen-key`. Antwoord `{ok, status:'definitief', definitief_versie, tekst_sha256, audit_id, vastgesteld_door, vastgesteld_op, al_definitief}`. 409 `VEROUDERD`/`GEEN_MEMORANDUM`, 400/401/403/500/503.
- De hash is SHA-256 over exact de opgeslagen tekst (de backend slaat getrimd op). Het snapshot staat in `mna_wijzigingen` (`type 'verkoopmemorandum_definitief'`, `nieuwe_waarde` = envelop `verkoopmemorandum-lifecycle/1` met `definitief_versie` en `tekst_sha256`). Dat is leesbaar via de bestaande, begeleider-only route `GET /mna/wijzigingen/{code}`.
- Readiness komt uitsluitend uit `/mna/verkoopmemorandum/genereer`: `readiness.blocking_validations` (400 `ONVOLDOENDE_DATA`; minimale basis omzet3/financieel, fte/partner, niche/strategisch) en `readiness.warnings` (andere fases ontbreken; geen blokkade).
- De memorandumstatus (`verkoopmemorandum_status`) zit al in de begeleider-DTO van `POST /mna/traject/{code}`.

**Huidig gedrag (`mna/04`).**

- Bovenaan staat "CONCEPT · \<status>" of "DEFINITIEF · versie N". De status komt uit de server. Bij een definitief memorandum leest het venster het snapshot via `/mna/wijzigingen`. Alleen als de hash van dat snapshot gelijk is aan de SHA-256 van de opgeslagen tekst, telt de vaststelling als bevestigd en toont het venster de versie, de vaststeller en de datum. Lukt dat niet (leesfout, afgeschermd, geen of afwijkend snapshot), dan verschijnt een eerlijke melding met "Opnieuw lezen", en Print / PDF krijgt het CONCEPT-watermerk.
- Readiness: de blokkades en waarschuwingen uit het genereerantwoord worden letterlijk (geëscapet) getoond. De frontend rekent zelf geen readiness uit en blokkeert vaststellen niet op ontbrekende fases.
- **Opslaan** (`fetchMetTimeout`, 30 s) telt alleen als geslaagd bij HTTP 2xx, leesbare JSON en `ok:true`. Bij een nieuwe conceptversie moet ook `nieuw_concept:true` terugkomen. Daarna nemen `S.traject.verkoopmemorandum_tekst/_status` de bevestigde waarden over.
- **Definitief vaststellen** is een expliciete handeling: de tekst moet opgeslagen zijn (anders "Sla eerst op"), en er zijn een naam (max. 120 tekens) en een aangevinkte bevestiging nodig. De browser berekent de SHA-256 (WebCrypto) van exact de opgeslagen tekst en stuurt hash, naam en tekst mee. Als definitief getoond wordt het pas na een 2xx met `ok:true`, `status:'definitief'` en dezelfde hash. Daarna is het tekstvak alleen-lezen en verdwijnen Opslaan en Opnieuw genereren.
- **409, netwerkfout, time-out of een onleesbaar/afwijkend 2xx-antwoord**: de tekst blijft staan, er is niets als opgeslagen of definitief getoond en de melding vraagt om "Opnieuw lezen". Opslaan en vaststellen zijn geblokkeerd tot er opnieuw is gelezen. Er wordt nooit iets geforceerd en er gaat nooit automatisch een `nieuw_concept` mee. "Opnieuw lezen" gebruikt dezelfde trajectaanroep als `refreshData` en neemt alleen de memorandumtekst en -status over. Een eigen tekst die afwijkt, blijft als "Uw eigen tekst" zichtbaar en kan worden teruggezet. Een bekende serverfout (400/401/403/500) mag direct opnieuw geprobeerd worden.
- **Nieuwe conceptversie**: alleen via de knop. Die opent eerst lokaal een bewerkbaar concept, zonder verzoek. Pas Opslaan stuurt `nieuw_concept:true` + `definitief_sha256`. Het definitieve snapshot blijft op de server staan. Vaststellen of verzenden van een nog niet opgeslagen nieuwe conceptversie kan niet. Annuleren gaat terug naar de definitieve weergave, en de getypte tekst blijft als "Uw eigen tekst" staan.
- **Dubbelklik**: zolang een opslag, vaststelling of herlezing loopt, worden extra klikken genegeerd en zijn de knoppen uitgeschakeld.
- **Late antwoorden**: een antwoord wordt alleen verwerkt voor hetzelfde `S`-object, dezelfde code en hetzelfde `S.traject`. Na een sessiewissel (ook met dezelfde code) gebeurt er niets. Na sluiten of heropenen werkt alleen het traject bij met de door de server bevestigde waarde. Er komt dan geen render en geen toast, en de nieuwe weergave en de invoer daarin blijven onaangeroerd.
- **Print / PDF** (`mna/05`): `memo` (concept) heeft nu het CONCEPT-watermerk plus de bestaande conceptregel. `memo_definitief` heeft geen watermerk en geen conceptregel, met "(definitieve versie N)" in de titel. Dat wordt alleen gebruikt bij een bevestigd snapshot en dan met exact de opgeslagen tekst. De titel valt niet meer terug op `S.code`. De teaser is ongewijzigd.
- E-mail: bij een definitief memorandum gaat exact de opgeslagen tekst mee (de backend eist dat). Bij een nieuwe, nog niet opgeslagen conceptversie is verzenden verborgen. Bij een concept werkt het zoals voorheen.
- NDA: "Annuleren" in de NDA-bevestiging gaat, als er al een memorandum is, terug naar de editor met de eigen concepttekst in plaats van het venster te sluiten.
- Geen autosave en geen automatische vaststelling: openen, heropenen, sluiten en opnieuw lezen versturen nooit opslaan of definitief.

**Bewijs (sectie K van `tests/document-output-security.mjs`).** De test draait de echte `toonVerkoopmemoModal` met de echte `fetchMetTimeout`/`esc`/`bgToonUitvoer` tegen een synthetische backend die het B1-contract volgt, met de hash via `node:crypto`. Hij dekt:

- de reis open → bewerken → opslaan → heropenen → definitief → PDF → heropenen definitief → nieuwe conceptversie → versie 2, waarbij de printaanroep door de echte `printDocNaAkkoord` gaat (watermerk concept vs. definitief);
- de controle dat niet vastgesteld wordt met onopgeslagen tekst, zonder naam of zonder bevestiging;
- dubbelklik op opslaan en vaststellen;
- stale 409 → opnieuw lezen → eigen tekst terug → bewust opslaan en vaststellen;
- 409 `DEFINITIEF` bij opslaan;
- koper- en verkopercode (401);
- 500 met HTML, een netwerkfout, ongeldige JSON en een 2xx met een afwijkende hash;
- een time-out met een server die toch vastlegde;
- late antwoorden na een sessiewissel, sluiten en heropenen;
- backendreadiness (blokkade en waarschuwing, geen eigen frontendreadiness) en genereren op een intussen definitief memorandum;
- NDA-bevestiging en annuleren;
- een niet-controleerbaar snapshot (ontbreekt, andere tekst, 500, netwerk, afgeschermd);
- een statische check: geen interval, browseropslag of force.

De bestaande N-121-proef (`tests/n121-ai-timeouts.mjs`) draait dezelfde functie en blijft ongewijzigd. Dit is synthetisch bewijs in `node:vm`. Tijdens het bouwen is niets lokaal gedraaid (geen shell); de bridge voert de suite uit via check 26. Echte gegenereerde PDF's, browser, staging en productie staan nog open.

**Grenzen.** Readiness is alleen zichtbaar direct na genereren in dezelfde weergave; bij heropenen rekent de frontend die niet zelf na. De volgorde van `mna_wijzigingen` (max. 300 rijen) is van de backend. Bij een traject met meer dan 300 wijzigingen kan het snapshot buiten de lijst vallen, en dan krijgt Print / PDF eerlijk het CONCEPT-watermerk. `.pages-dist/` (buildartefact) is niet bijgewerkt.

### Vervolg: niet-opgeslagen memorandumtekst blijft bij sluiten/heropenen (productpunt 19, 16 okt 2026)

Dit vervolg dekt alleen het nog openstaande criterium uit de acceptatie van 7 okt (§22): conceptbehoud in de memorandumeditor. Het is geen afronding van productpunt 19 als geheel. De aanleiding was een Chromium-proef met de productiecode (`productie19-memo-sluiten.json`). Daarin werd nieuwe, nog niet opgeslagen invoer na sluiten en heropenen vervangen door de opgeslagen brontekst.

- **Waar het concept staat**: alleen in het geheugen van het sessieobject (`S._vmConcept`). Het wordt synchroon bijgewerkt bij elke invoer (`oninput`), bij elke render en bij Sluiten. Er is geen autosave, geen browseropslag, geen nieuwe route en geen verzoek. Uitloggen vervangt `S`, dus het concept is dan weg. Openen in een ander traject (`S.code`) wist het concept; het verschijnt daar nooit.
- **Heropenen** (ook na hertekening van de flow, bijvoorbeeld na verversen) in dezelfde sessie en hetzelfde traject toont de eigen tekst weer in de editor. Dat gebeurt alleen als de opgeslagen tekst en status gelijk zijn aan die waarop het concept rust. Is een expliciet geopende nieuwe conceptversie op een definitief memorandum nog open, dan komt die ook terug. Een eerder bewaarde melding dat het memorandum verouderd is (409 of onbekende uitkomst), komt mee terug, met "Opnieuw lezen". Opslaan blijft dan geblokkeerd, zoals voorheen.
- **Gewijzigde basis**: is de opgeslagen tekst of status intussen anders, bijvoorbeeld door een collega of omdat het memorandum definitief is geworden? Dan blijft de opgeslagen of definitieve tekst in de editor staan (definitief: read-only). De eigen tekst komt apart onder "Uw eigen tekst". Een definitieve tekst wordt nooit overschreven.
- **Opslaan**: een bevestigde opslag (ack) ruimt het concept alleen op als het precies de bevestigde tekst is. Dat geldt ook als het antwoord pas na het sluiten komt. Wat na de klik nog is getypt, blijft staan. Bij een fout of een laat 409 blijft de eigen tekst staan.

**Bewijs** (`tests/document-output-security.mjs`, blok "verkoopmemo conceptbehoud", synthetisch in `node:vm`). Het blok dekt deze gevallen:

- getypt → sluiten → heropenen;
- hertekening met dezelfde en met een gewijzigde servertekst;
- opslaan tegenover nieuwere invoer, ook met een late ack na sluiten;
- een serverfout (500) en een late 409 na sluiten, met daarna opnieuw lezen;
- een nieuwe sessie en een ander traject;
- een definitief memorandum met een nieuwe conceptversie en annuleren;
- een memorandum dat intussen definitief is geworden;
- dat er geen automatisch verzoek gaat.

Er is tijdens het bouwen niets lokaal gedraaid. Herhaling in een echte browser staat nog open.

### Vervolg: definitieve MOU/LoI/NDA-print uit de geverifieerde serverversie (productpunt 14, frontenddeel, 17 okt 2026)

Status: frontendwijziging, nog niet uitgerold. Productpunt 14 is **niet** af: de gezamenlijke FE/BE-acceptatie op staging en de productieacceptatie volgen nog. Het backenddeel is `GET /mna/tos/document/{id}/printversie` (backend `docs/tos-ontvangers.md`, check 31 van `tests/audit-backend.mjs`).

Wat er mis was: de knop **Print / PDF** in de composer drukte ook een gefinaliseerd, verstuurd of goedgekeurd document altijd met het CONCEPT-watermerk af.

Wat de gebruiker ziet: dezelfde knop. Bij een concept (en elke andere niet-definitieve status) werkt die precies als voorheen: de tekst op het scherm, inclusief onopgeslagen invoer, met CONCEPT-watermerk. Bij de status `exported`, `verstuurd` of `goedgekeurd` gebeurt het volgende:

- `mna/04` (`bgMouPrintDefinitief`) vraagt via de bestaande `bgMouApi` de printversie op. Vooraf worden sessie, sleutel, document-id, profiel, status en versie vastgelegd.
- `mna/05` (`printTosDefinitief.controleer`) controleert het hele contract: `ok:true`, `document.id`/`doc_type`/`status`/`version` gelijk aan het getoonde document (type `mou`/`loi`/`nda`, definitieve status, versie ≥ 2 als getal), `titel` en een niet-lege `printtekst` als tekst, en `print_hash`, `content_hash` en `manifest_hash` alle drie als 64 kleine hex-tekens. Daarna rekent de browser `print_hash` zelf na: SHA-256 over de `printtekst` via WebCrypto.
- Na het antwoord, na de hashcontrole en in de callback van de reliance-pop-up wordt opnieuw gecontroleerd of hetzelfde document nog in beeld is, met dezelfde status en versie, in dezelfde sessie, en of er geen nieuwere klik is. Is dat niet zo, door een documentwissel, sluiten, uitloggen of een nieuwere versie, dan wordt niets afgedrukt.
- Alleen dan gaat exact de servertekst door de bestaande escapende printflow (`printDocNaAkkoord`): reliance-pop-up en audit, footer, publieke trajectreferentie en het printvenster blijven zoals ze waren. Het watermerk vervalt door een eenmalige vrijgave die alleen een geverifieerd resultaat kan zetten. Er is geen nieuw docType en geen nieuwe PDF-engine.
- In de titel komt alleen "(definitief — versie N, status)". De titel valt niet terug op `S.code`. Er komen geen document-id's, hashes of interne referenties in het printvenster.

Bij een fout komt er geen PDF, ook niet als concept, maar een gerichte melding: geen toegang (401/403), definitieve versie niet bevestigd (409), tijdelijk niet te controleren (503, andere 5xx of een netwerkfout), niet te verifiëren (afwijkend of onvolledig antwoord, verkeerde hash, ongeldige JSON), het document is intussen gewijzigd, of in deze browser niet te controleren (geen WebCrypto). De serverfouttekst wordt niet getoond. Invoer en composerstaat (productpunt 19) blijven onaangeroerd. Memorandum, teaser, andere contracten, Signhost, mail, finaliseren, review en rollen zijn niet gewijzigd.

**Bewijs (sectie L van `tests/document-output-security.mjs`).** De echte composer uit mna/04 en de echte reliance- en printketen uit mna/05 draaien tegen een synthetische printversie volgens het contract van worker/31, met echte WebCrypto (`node:crypto`). De proef dekt:

- MOU, LoI en NDA definitief: de body is gelijk aan die van de bestaande printflow, zonder watermerk, met status en versie in de titel, en zonder id, hash, code of sleutel;
- concept: de schermtekst mét CONCEPT, zonder printversie-aanvraag, en de invoer blijft intact;
- een verkeerde, ontbrekende of verkeerd opgemaakte hash, een ander id/type/speciaal type/versie/status, een ontbrekend veld, ongeldige JSON, HTTP 401/403/404/409/500/503, een netwerkfout, geen WebCrypto en een falende digest;
- een laat antwoord na documentwissel, uitloggen, nieuwere versie of sluiten, een dubbele klik, en reliance annuleren of na een documentwissel bevestigen;
- geen omzeiling: een speciaal docType, een "definitieve" titel, een zelfgemaakt resultaatobject, een losse vrijgave of een vervalste clientstatus geven nooit een print zonder watermerk.

Tijdens het bouwen is niets lokaal gedraaid. Een echte browser en staging volgen nog.

### Vervolg: dealvoorstel stuurt een gestructureerde cijferlijst (productpunt 13 §31 fase 1b, frontenddeel, 17 okt 2026)

Status: frontendwijziging, nog niet uitgerold. Gaat alleen samen met backend 2b18cc0 live: die eist `cijfers` voor `POST /mna/dealvoorstel/hoofdstukken/genereer` en `/mna/dealvoorstel/bijlage/genereer`, laat de AI cijfers uitsluitend als `[CIJFER:sleutel]` schrijven en vult ze zelf in (backend `docs/document-processing.md`, fase 1b).

- `mna/04` (`dvBouwCijfers`) bouwt naast `contextBlok`/`interneContext` een lijst `{sleutel, label, eenheid, waarde}` uit de al berekende rekenkernresultaten. De lijst bevat alleen wat nu al in de context staat, met exact hetzelfde getal: bedragen via dezelfde `Math.round`, afgeleide percentages via dezelfde `toFixed`, invoerwaarden (multiples, percentages, looptijden) ongewijzigd. Er is geen nieuwe rekenlogica en geen nieuwe `S.data`-lezing; `dvManagementRisico()` wordt één keer aangeroepen en gedeeld door context en lijst.
- Eenheden: `eur`, `pct`, `multiple`, `aantal` (ook looptijden en procentpunten) en `tekst` (partijnamen). Een waarde die niet eindig of niet eenduidig is (NaN, exponentnotatie, tekst langer dan 120 tekens) wordt weggelaten, nooit afgerond of ingekort.
- Twee lijsten, net als de context (A2): `cijfers` bij hoofdstukken bevat alleen publieke waarden; `cijfers` bij de bijlage bevat alleen de waarden uit `interneContext` (cash bij closing, totale tegenprestatie, BATNA/walk-away). BATNA komt nooit in de publieke lijst.
- Fouten: 502 `BRONFEITEN_AFWIJKING` → vaste melding "De AI-tekst bevatte een cijfer dat niet uit de berekening komt; er is niets overgenomen. Probeer opnieuw."; 400 `CIJFERS_ONTBREKEN`/`CIJFERS_ONGELDIG` → de servermelding. Weergave via `textContent` (hoofddocument) of `esc()` (bijlage). Timeout (180 s) en `fetchMetTimeout` blijven gelijk; `[TABEL:]`-afhandeling (`dvBouwRapportHtml`, mna/03) is niet aangeraakt.
- `tests/n121-ai-timeouts.mjs` legt de twee verzoekopties nu vast met het veld `cijfers`; headers en 180000 ms zijn gelijk gebleven.
- Handleiding (mna/08, begeleider stap 4): één zin dat cijfers in de AI-tekst uitsluitend uit de berekening komen en een afwijkende tekst wordt geweigerd. `adv.html` heeft geen dealvoorstel-AI-aanroep (alleen beschrijvende handleidingtekst) en is niet gewijzigd.

**Bewijs (sectie M van `tests/document-output-security.mjs`).** De echte `toonDealvoorstelModal`-handler, `dvBouwCijfers` en `dvGenereerFout` uit mna/04 draaien met `esc` uit mna/02 tegen synthetische rekenkernresultaten met decimalen en een gestubde `fetchMetTimeout`. De proef controleert: beide lijsten voldoen aan het contract van `dvValideerCijfers` (sleutelpatroon, uniek, label, eenheid, eenduidige waarde, max. 300); elke waarde staat letterlijk in de context van hetzelfde request; bedragen zijn `Math.round` van de rekenkernwaarde en invoer is niet afgerond; BATNA alleen in de bijlagelijst; koperzijde stuurt alleen het hoofdstukkenverzoek; 502/400-meldingen bij hoofdstukken en bijlage, met HTML in de servermelding als tekst of ge-escaped. Tijdens het bouwen is niets lokaal gedraaid; staging met de backend volgt nog.

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
