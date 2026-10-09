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

## Bewijs

`tests/document-output-security.mjs` (ook check 26 in `tests/audit-consistentie.mjs`) draait de echte `esc`/`mdToHtml` uit mna/02 en de echte `printDocNaAkkoord` uit mna/05 in `node:vm`, met een synthetisch window/document, nep-fetch en een vastgelegde `printHtmlDocument`. De proef controleert:

- Er staan alleen eigen tags met gequote, toegestane attributen in de uitvoer. Script, img, onerror, `javascript:`-URL's en quotes zijn niet actief.
- `<b>Rechtsvorm</b>` en dergelijke zijn leesbaar, zonder markers.
- De bestaande Markdown- en printopmaak werkt nog.
- Titel, header, footer en logo-alt zijn veilig.
- Het logo verschijnt alleen bij https of base64.
- De referentie heeft het juiste label en er staat geen code in.
- Er zijn geen fetch-, audit-, opslag- of navigatie-effecten, en `S` blijft ongewijzigd.
