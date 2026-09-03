# LEGAL_INVENTORY.md — Juridische documentinventarisatie

**Project:** Koers voor Morgen (platform) + M&A-praktijk Bisschops Financing B.V.
**Fase:** 1 — inventarisatie. **Er is in deze fase niets gewijzigd.**
**Datum inventarisatie:** 2026-09-03
**Repositories doorzocht:**
- Frontend (publiek): `~/Documents/GitHub/koersvoormorgen/` — alle `*.html`, `*.md`, `_src/`
- Backend (privaat): `~/Documents/GitHub/koersvoormorgen-backend/backend/` — `cloudflare-worker.js`, `worker/*.js`

**Zoekmethode:** bestandsnamen; volledige grep op juridische signaalwoorden (aansprakelijk, vrijwaring, voorwaarden, geheimhouding, verwerker, IE, toepasselijk recht, succesfee, retainer, exclusiviteit, non-circumvention, overmacht, ontbinding, incasso, AVG…) over HTML + JS; volgen van dynamische `fetch()`-endpoints naar backend-tekstbronnen; inspectie van template-/contractgeneratie-modules.

---

## A. Platformvoorwaarden — verkoper / koper / meekijker (via een adviseur)

### A1. `voorwaarden.html`
- **Type:** Gebruiksvoorwaarden (algemene voorwaarden B2B, deels mogelijk B2C).
- **Doelgroep:** verkoper, koper, meekijker en "andere partij" die via een adviseur toegang krijgt tot een M&A-traject op het platform.
- **Toepassing:** aanvaard "door in te loggen met persoonlijke toegangscode". Gepubliceerd op `koersvoormorgen.nl/voorwaarden.html`; gelinkt vanuit footer van álle publieke pagina's en vanuit `privacy.html`.
- **Afhankelijkheden:** verwijst naar (a) `privacy.html`; (b) "de Algemene Voorwaarden van Bisschops Financing B.V." voor het geval BF zelf als adviseur optreedt — **dat document bestaat niet als vindbare, gepubliceerde tekst** (zie C-groep); (c) "aparte, kortere voorwaarden" voor de bedrijfsscan (zie E1).
- **Status:** live. Versie 2.2 · augustus 2026. KvK 82085200.
- **Belangrijkste aandachtspunten (voor FASE 2/3):**
  1. Verwijzing naar niet-bestaand/niet-gepubliceerd "AV Bisschops Financing".
  2. Aansprakelijkheidscap **€ 10.000 per traject** voor beveiligings-/data-/beschikbaarheidsschade; uitzonderingen (opzet, bewuste roekeloosheid, onvoldoende passende beveiliging). Consistentie met adviseur-GV (10× platformvergoeding) en AV M&A-praktijk (geheel uitgesloten) te toetsen.
  3. 24-uurs meld- en medewerkingsplicht bij kwetsbaarheid/incident, met "eerst BF gelegenheid geven" vóór eigen/externe melding — afdwingbaarheid en verhouding tot wettelijke meldplichten (AVG art. 33/34, responsible disclosure) toetsen.
  4. Bestuurdersvrijwaring ("bestuurder niet persoonlijk aansprakelijk, behoudens opzet/fraude/bewuste roekeloosheid") — werking jegens derden.
  5. Toepasselijkheid op consumenten? Een verkoper kan een natuurlijk persoon zijn (DGA/familie). Toetsing aan afd. 6.5.3 BW (zwarte/grijze lijst) nodig.
  6. Eenzijdig wijzigingsbeding (art. 7) zonder opzeg-/weigeringsrecht voor de gebruiker.
  7. Geen regeling: overmacht, opschorting, verval-/klachttermijn, elektronische handtekening/bewijs, overdracht rechten, informed consent meekijker.

### A2. `_src/voorwaarden.html`
- **Type:** bronbestand/concept van A1.
- **Status:** wijkt **99 diff-regels** af van de live `voorwaarden.html`. Onduidelijk of dit een verouderd concept of een niet-gepubliceerde nieuwere versie is.
- **Aandachtspunt:** vaststellen welke versie leidend is; `_src/` opschonen of synchroniseren.

---

## B. Platformvoorwaarden — adviseur (bf_gebruikers)

### B1. `GEBRUIKSVOORWAARDEN_TEKST` (in `backend/cloudflare-worker.js`, ~regel 764–806)
- **Type:** Gebruiksvoorwaarden platform voor **adviseurs**.
- **Doelgroep:** externe (betaalde) adviseurs en proefaccount-adviseurs die het platform onder eigen huisstijl gebruiken.
- **Toepassing:** opgehaald via `GET /gebruiker/voorwaarden`, getoond door de stub `platformvoorwaarden.html`, en **verplicht geaccepteerd** bij (eerste) inlog + bij versieverhoging (`/gebruiker/voorwaarden/accepteren`, `worker/16-adviseur.js`).
- **Afhankelijkheden:** verwijst naar de **separate verwerkersovereenkomst** (zie F2/F3); grenst zich expliciet af van de "Algemene Voorwaarden van Bisschops Financing" (die gelden alleen voor BF's eigen M&A-adviesdienst, niet voor platform-only adviseurs — art. 1).
- **Status:** live. `GV_VERSIE = '1.9'` · september 2026. Daarnaast `AV_VERSIE = '1.1'` in dezelfde file (zie C3).
- **Belangrijkste aandachtspunten:**
  1. "as is", geen beschikbaarheids-/foutvrijheidsgarantie.
  2. Aansprakelijkheidscap **10× de per traject in rekening gebrachte platformvergoeding** voor beveiligings-/dataverliesschade. Bij een gratis proefaccount = 10 × € 0 = € 0 → cap-mechaniek bij nul-vergoeding toetsen.
  3. Uitgebreide **vrijwaring van BF door de adviseur** voor (a) IE/gerechtigdheid van geüploade stukken en (b) AVG art. 82-vorderingen van betrokkenen bij aan de adviseur toerekenbare oorzaken. Redelijkheid/wederkerigheid toetsen.
  4. Uitleg "opzet/bewuste roekeloosheid" met een hoge bewijsdrempel ("daadwerkelijk bewust van aanzienlijk risico") — houdbaarheid t.o.v. art. 6:248 BW.
  5. Meekijker-inzage: adviseur "staat ervoor in dat hij bevoegd is" — grondslag/toestemming bij zijn opdrachtgever.
  6. Sub-verwerkers: 30 dagen vooraankondiging + bezwaarrecht op AVG-gronden — consistentie met de VOK-tekst zelf.
  7. Beëindiging: onmiddellijke opschorting bij "ernstige tekortkoming" incl. betalingsverzuim; geen expliciete uitloop-/datateruggavetermijn los van de 14-dagenregel.

### B2. `platformvoorwaarden.html`
- **Type:** weergave-stub (geen eigen inhoud) — haalt B1 op en toont `gv.tekst` + `gv.versie`.
- **Status:** live. Toont "Kon de voorwaarden niet laden" bij een API-fout — geen offline fallback.

---

## C. M&A-praktijk — Algemene Voorwaarden / bemiddeling / fee (Bisschops Financing als adviseur)

> **Structureel kernpunt:** er is **geen zelfstandig, gepubliceerd document** "Algemene Voorwaarden Bisschops Financing B.V.". De AV bestaat uitsluitend als (a) een dynamisch gegenereerde bijlage `buildAvTekst(brand)` en (b) letterlijk **ingebedde kopieën** onderaan elk bemiddelingsovereenkomst-sjabloon. De AV is bovendien geparametriseerd met `{{BEGELEIDER_NAAM}}` en wordt dus óók door externe adviseurs onder hun eigen naam gebruikt.

### C1. `BF_TEMPLATES.bem_verk` — Bemiddelingsovereenkomst Verkoop (sell-side mandate)
- **Bestand:** `backend/worker/02-config-constanten.js` (const `BF_TEMPLATES`).
- **Type:** opdracht-/bemiddelingsovereenkomst + ingebedde AV-bijlage.
- **Doelgroep:** opdrachtgever (verkoper) van een M&A-begeleidingsopdracht.
- **Toepassing:** basissjabloon voor AI-generatie in het begeleider-dashboard (`bgDoc` in `mna/04`) én bewerkbaar in marilyn (`mna_templates`-tabel). Ondertekening via Signhost.
- **Kernbepalingen:** exclusiviteit 4 mnd + stilzwijgend onbepaald (opzeg 1 mnd); introductie-/tail-bescherming met **onweerlegbaar vermoeden** bij niet-tijdige melding (5 werkdagen); succesfee-staffel 5/4/3/2 %, **minimum € 25.000 excl. btw**; earn-out/vendor loan/uitgestelde betaling meegerekend tegen **maximale** waarde; break-fee bij beëindiging zonder transactie (uren à € 250, min. € 5.000); informatiegarantie + vrijwaring door opdrachtgever; forum Rechtbank Oost-Brabant.
- **Aandachtspunten:** onweerlegbaar bewijsvermoeden (dwingend bewijsrecht / onredelijk bezwarend?); matiging boete/fee (art. 6:94, 6:2/6:248 BW); consumententoetsing bij natuurlijk-persoon-opdrachtgever; "volledige Transactiewaarde" incl. schuldovername — dubbeltellingsrisico; verhouding "prevaleert de Overeenkomst boven de AV" vs. AV-artikelen die strenger zijn.

### C2. `BF_TEMPLATES.bem_opvolging` — Bemiddelingsovereenkomst Bedrijfsopvolging
- Als C1, maar toegesneden op opvolging (incl. reeds bekende opvolger via Bijlage 1). **Succesfee ook verschuldigd bij een reeds bekende interne opvolger** ("voor de begeleiding als zodanig"). Voorfasevergoeding: Optie A vast € 10.000 óf Optie B regie.
- **Aandachtspunten:** bij familie-/interne opvolging is de opdrachtgever vaak een natuurlijk persoon → consumentenrecht; "wederzijdse intentie" als trigger voor volledige fee-bescherming is ruim en subjectief ("naar het oordeel van {{BEGELEIDER_KORT}}"); succesfee zonder resultaat bij bekende opvolger moet als rechtsgeldige prijsafspraak onderbouwd zijn.

### C3. `BF_TEMPLATES.bem_koper` — Bemiddelingsovereenkomst Aankoop (buy-side mandate)
- Als C1 voor de koperszijde; ruimste definities van "Transactie", "Gelieerde Entiteit" en "Transactiewaarde" (incl. management-/consultancy-/huurvergoedingen, "ieder economisch voordeel ongeacht vorm of moment"). Anti-omzeiling boete € 25.000 **cumulatief** met schadevergoeding.
- **Aandachtspunten:** zeer ruime "Transactiewaarde" (mgmt fees, huur) — grondslag en dubbeltelling; cumulatie boete + volledige schade; 24 mnd nawerking.

### C4. `buildAvTekst(brand)` — Algemene Voorwaarden (bijlage)
- **Bestand:** `backend/cloudflare-worker.js`.
- **Type:** AV die als bijlage onder elke bemiddelingsovereenkomst wordt geplakt; ook via `AV_VERSIE`.
- **Kern:** inspanningsverplichting; "geen accountant/fiscalist/advocaat/Register Valuator"; regie-tarief € 250/uur, € 0,35/km, reistijd 50 %; betaaltermijn **14 dagen**, wettelijke **handelsrente** + incassokosten; **succesfee-nawerking 24 maanden**; 50 %-vergoeding bij afgebroken traject na LOI door toerekenbare oorzaak/omzeiling; anti-omzeiling boete € 25.000; **aansprakelijkheid geheel uitgesloten** behoudens opzet/bewuste roekeloosheid van "de leiding", alleen directe schade, **verval 12 maanden** na ontdekking; forum Oost-Brabant.
- **Aandachtspunten:** géén **bedrag-cap** (alleen "directe schade") — marktstandaard voor advisory is doorgaans een cap (bijv. fee-bedrag of vast maximum) + PI-verzekeringsdekking; volledige uitsluiting kan als onredelijk bezwarend / niet te goeder trouw sneuvelen; "de leiding" niet gedefinieerd; wettelijke **handelsrente** veronderstelt een handelsovereenkomst — bij consument-opdrachtgever geldt de gewone wettelijke rente; geen Wwft-/cliëntenonderzoek-, belangenconflict-, klachten-/tuchtbepaling.

### C5. AV-kopieën ingebed in de sjablonen
- De volledige AV-tekst staat **letterlijk herhaald** onderaan `bem_verk`, `bem_opvolging` en `bem_koper` in `02-config-constanten.js`, náást `buildAvTekst()` in `cloudflare-worker.js`. **≥ 4 kopieën.**
- **Aandachtspunt:** drift-risico — de ingebedde AV (bv. in `bem_verk`) en `buildAvTekst()` zijn nu al niet woord-voor-woord identiek (bv. bestuurdersvrijwaring-alinea zit wél in `buildAvTekst`, niet overal in de ingebedde versies). Eén bronbestand nodig.

### C6. `voor-adviseurs` / `m-en-a-expertise/*` — geen engagement-tekst
- De M&A-Expertise-pagina's linken alleen naar `voorwaarden.html` (platform-GV), die expliciet **niet** de advies-/bemiddelingsrelatie dekt. Voor een bezoeker die Marcel als adviseur inschakelt is er geen vindbare set voorwaarden vóór opdrachtverstrekking.

---

## D. Gegenereerde transactiedocumenten (sjablonen — output naar tegenpartijen)

Alle in `BF_TEMPLATES` (`backend/worker/02-config-constanten.js`), bewerkbaar in marilyn (`mna_templates`), gegenereerd/afgekapt-bewaakt door `bgDoc()` (`mna/04-begeleider-dashboard.js`; "clausule-integriteitsregel + afkap-weigering" — CLAUDE.md werkregel 19), ondertekend via Signhost.

| ID | Document | Doelgroep | Kernrisico's voor FASE 2 |
|---|---|---|---|
| `nda` | Geheimhoudingsovereenkomst | verstrekkende/ontvangende partij | Boete **€ 25.000 + € 2.500/dag** cumulatief met schade (matiging art. 6:94); niet-afwervingsbeding 12 mnd (reikwijdte/redelijkheid); duur 3 jaar + bedrijfsgeheimen onbeperkt. |
| `loi` | Intentieverklaring (LOI) | koper/verkoper | Bindend/niet-bindend afbakening; MAC-clausule; break-up cost cap "€ [Bedrag]" placeholder blijft leeg; Art. 7 bevat een **redactie-instructie aan de gebruiker** ("Let op: indien je voor de Verkoper werkt…") die in een uitgaand document niet thuishoort. |
| `bieding` | Indicatief niet-bindend bod | koper→verkoper | Sterk niet-bindend geformuleerd (goed); controleren dat generatie geen bedragen "hard" maakt. |
| `spa` | **Aandachtspuntenlijst** SPA (géén concept-overeenkomst) | opdrachtgever→eigen jurist | Bewust géén overeenkomst; verwijst naar "Artikel 3 van de AV van {{BEGELEIDER_NAAM}}" — kruisverwijzing klopt alleen als AV daadwerkelijk meegeleverd is. |
| `exclusief` | Exclusiviteitsbrief | verkoper→koper | Schade-omvang bij schending (kosten + directe schade); samenhang met LOI Art. 5. |
| `closing` | Closing-checklist | intern/opdrachtgever | Geen overeenkomst; laag risico. |
| (AV-bijlage) | zie C4/C5 | opdrachtgever | zie C. |

**Algemeen aandachtspunt D:** placeholders (`[Bedrag]`, `[Datum]`, `[Naam …]`) — borgt `bgDoc()` dat een document met resterende placeholders niet als "definitief/ondertekenbaar" de deur uit gaat? Te verifiëren in FASE 2.

---

## E. Consument-/leadgeneratie-teksten (publiek, zonder login)

### E1. Bedrijfsscan — `bedrijfsscan.html` (marketing) + `bedrijfsscan-start.html` (de tool)
- **Type:** gratis zelfanalyse-instrument met AI-adviesrapport; e-mailadres + bedrijfsgegevens + scores.
- **Juridische elementen aanwezig in `bedrijfsscan-start.html`:** inline **Disclaimer** ("gegenereerd op basis van zelfrapportage … uitsluitend indicatief strategisch oriëntatie-instrument … geen formeel advies … BF aanvaardt geen aansprakelijkheid voor beslissingen die (mede) op basis hiervan worden genomen"); **Privacy note-box** + link naar `privacy.html`; opslag-EU-melding.
- **Afhankelijkheid:** `voorwaarden.html` art. 1 belooft "aparte, kortere voorwaarden die **op dat instrument zelf staan vermeld**".
- **Aandachtspunten:** volstaat een losse disclaimer-alinea + privacy-note als de beloofde "voorwaarden"? Ontbreekt: IE op het rapport, gebruiksrecht, toepasselijk recht/forum, wijzigingsbeding, expliciete grondslag/toestemming bij opslaan + groepsdeelname (privacy.html noemt "toestemming voor opslaan bij groepsdeelname"). Rapportcode = capability-URL (zie SECURITY-notitie in `tests/AUDIT-LOG.md` 2026-09-03) — privacyrelevant.
- **`kantoorscan.html`** = redirect-stub → `bedrijfsscan.html` (oude links). Geen eigen inhoud.

### E2. `proefaccount.html`
- **Type:** aanvraagformulier proefaccount voor adviseurs (naam, kantoor, e-mail, KvK, motivatie, IP).
- **Toepassing:** aanvraag → beoordeling door Marcel in marilyn → bij goedkeuring account + activatiemail; acceptatie GV (B1) bij activatie.
- **Aandachtspunten:** grondslag (privacy.html: "toestemming / gerechtvaardigd belang"); worden de GV/relevante voorwaarden getoond/gelinkt op het aanvraagformulier zelf?

### E3. `contact.html` + `contact-verzonden.html`
- **Type:** contactformulier (naam, e-mail, onderwerp, bericht) → `POST /contact` (rate-limited 5/10 min).
- **Aandachtspunten:** privacyverwijzing op het formulier; bewaartermijn (privacy.html: terugbelverzoek 6 mnd — dekt dat ook het contactformulier?).

### E4. `lead-aandragen.html`
- **Type:** "Draag een overname aan" — introducer/aanbrengformulier (bank/accountant/particulier).
- **Juridisch element:** één zin: "gegevens uitsluitend gebruikt om deze aandracht te beoordelen … Zie de Privacyverklaring."
- **Aandachtspunten:** **geen referral-/introducervoorwaarden** (of/hoe/wanneer een aanbrengvergoeding, exclusiviteit van de aandracht, wat als meerdere partijen dezelfde onderneming aandragen, geen garantie op vergoeding of traject). Privacy.html noemt wel "fee-afspraak van de aandragende partij" als trajectveld, maar er is geen document dat die afspraak regelt.

### E5. `matching-platform.html`
- **Type:** anoniem koper-matchingplatform (bèta). Bezoeker meldt interesse → wordt **geregistreerd als koper op het traject** + krijgt inlogcode.
- **Afhankelijkheid:** bij registratie als koper zou de koper de platform-GV (A1) moeten aanvaarden; matching-eigen voorwaarden (anonimiteit, geen garantie op contact, gedrag, misbruik) ontbreken als document.
- **Aandachtspunten:** welk moment/welke tekst aanvaardt de matching-koper? Rate-limiter op matching-login/-wachtwoord is per-isolate (bekende beperking).

### E6. `viewer.html`
- **Type:** meekijker-portaal (alleen-lezen, één fase, intrekbaar).
- **Afhankelijkheid:** meekijker "gaat akkoord door in te loggen met toegangscode" (A1 art. 1).
- **Aandachtspunt:** krijgt de meekijker de voorwaarden + de reikwijdte van zijn geheimhoudingsplicht te zien **vóór** inlog? Flow te verifiëren.

---

## F. Gegevensbescherming

### F1. `privacy.html`
- **Type:** Privacyverklaring (AVG art. 13/14).
- **Doelgroep:** alle betrokkenen (scan, MNA, meekijker, matching, terugbel, lead, proef, test).
- **Status:** live. Versie **1.8** · september 2026.
- **Inhoud:** gelaagde verwerkingsverantwoordelijkheid (scan/terugbel/eigen trajecten = BF verantwoordelijke; MNA via adviseur = adviseur verantwoordelijke, BF verwerker); gegevenstabel per dienst met grondslag + bewaartermijn; sub-verwerkers (Cloudflare EU, Anthropic VS, Resend VS, Signhost NL/EU) met SCC; doorgifte buiten EU; betrokkenenrechten; 72-uurs datalekmelding; AI-gebruik ("geen training"); "geen cookies/tracking pixels".
- **Aandachtspunten:** claim "geen cookies of tracking pixels" — technisch verifiëren (analytics, embeds, localStorage-gebruik voor niet-noodzakelijke doeleinden). "Gerechtvaardigd belang" als grondslag voor scan én rapport-usage — belangenafweging/DPIA-lichttoets. Bewaartermijn contactformulier niet expliciet (alleen "terugbelverzoek 6 mnd"). Verhouding tot de VOK (F2/F3) op sub-verwerkers, meldtermijn en auditrecht.

### F2. VOK — adviseurweergave: `VOK_TEKST` / `VOK_VERSIE` in `mna/04-begeleider-dashboard.js`
- **Type:** verwerkersovereenkomst (AVG art. 28) tussen BF (verwerker) en adviseur (verwerkingsverantwoordelijke) — **de tekst die de adviseur te zien krijgt** vóór akkoord/ondertekening.

### F3. VOK — opgeslagen/ondertekende tekst: `vokTekst` in `backend/worker/20-signhost-vok.js` (~regel 272)
- **Type:** de VOK-tekst die daadwerkelijk wordt vastgelegd/ondertekend (Signhost) en de status ervan (`/mna/...vok...`).
- **KRITIEK STRUCTUURPUNT (al in de code benoemd):** `worker/20-signhost-vok.js` regel ~267 bevat een comment die een **mismatch** vaststelt: *"De gebruiker tekende dus voor tekst A (VOK_TEKST in mna/04-begeleider-dashboard.js) maar [tekst B]"*. Getoonde en vastgelegde/ondertekende VOK-tekst lopen (liepen) uiteen. Voor FASE 2 met hoge prioriteit: vaststellen of dit nog speelt en wat de rechtsgeldig overeengekomen tekst is.
- **Aandachtspunten:** één canonieke VOK-bron; volledige art. 28 lid 3-checklist (instructies, geheimhouding personeel, beveiliging, sub-verwerkers + toestemming, bijstand rechten/DPIA, teruggave/verwijdering, audit/inspectie, melding lek); verhouding tot GV-adviseur art. 4/5/6.

---

## G. Test-/stagingvoorwaarden

### G1. `testvoorwaarden.html`
- **Type:** voorwaarden voor gebruik van de testomgeving (staging) / test-/proefgebruiker.
- **Status:** live. Versie **1.2** · augustus 2026. "Gaat vóór op de reguliere Gebruiksvoorwaarden voor zover strijdig."
- **Inhoud:** geen productieomgeving; **aansprakelijkheid nihil** behoudens opzet/bewuste roekeloosheid; data kan zonder kennisgeving worden gewist; toegang op elk moment intrekbaar; zelfde 24-uurs meldplicht als A1; IE platform; forum Oost-Brabant.
- **Aandachtspunten:** verbod om "echte, vertrouwelijke of persoonsgegevens van derden" in te voeren — handhaving/technische borging; "nihil"-aansprakelijkheid als exoneratie — grens art. 6:248 BW; IE/copyright-erkenning van testers ontbreekt (zie backlog-memo `project_ip_erkenning_testers_gebruikers`).

### G2. `testvoorwaarden.html` vs `voorwaarden.html` — samenloop
- Twee documenten met een expliciete voorrangsregel; in FASE 3 op mazen toetsen (bv. welke geldt voor een proefaccount-adviseur die op productie werkt?).

---

## H. Marketing-/informatiepagina's met juridisch relevante beweringen

| Bestand | Relevante bewering(en) | Aandachtspunt (FASE 2) |
|---|---|---|
| `index.html`, `over-marcel.html`, `m-en-a-expertise/*` | "20+ transacties koop- én verkoopzijde", "~30 jaar bestuurskamer", "KPMG partnertraject", "referenties op aanvraag" | Onderbouwbaarheid van kwantitatieve/kwalitatieve claims (art. 6:194 BW misleidende mededelingen; reclamerecht). |
| `cases/*` | "ruim 80% van de synergie kwam binnen het jaar", "alle circa 35 medewerkers gingen mee over" | Resultaatclaims — onderbouwing + "geanonimiseerd, illustratief"-voorbehoud voldoende prominent? |
| `platform/beveiliging-en-gegevens.html`, `worker/24` pillar-tekst, `privacy.html` | "EU (Frankfurt, ISO 27001 / SOC 2 Type II)", "technisch afgedwongen scheiding tussen trajecten van verschillende adviseurs" | ISO 27001 / SOC 2 zijn **Cloudflare's** certificeringen — formulering mag niet suggereren dat BF zelf gecertificeerd is. "Technisch afgedwongen scheiding" is een harde belofte — moet aantoonbaar kloppen (cross-path-audits). |
| `platform/*` | "verwijdering na 14 dagen" | Consistent met A1 art. 4, B1 art. 3, F1 §7 — controleren op exacte gelijkluidendheid. |
| `handleiding.html`, `HANDLEIDING-ADVISEUR.md`, `mna/08-handleiding.js` | operationele uitleg incl. juridische stappen (VOK, tekenen) | Consistentie met de daadwerkelijke documenten. |

---

## I. Aangrenzend / vermoedelijk buiten scope

| Bestand | Wat | Voorstel |
|---|---|---|
| `hugo.html`, `verhuis.html` | **VerhuisScan** — een apart product/andere sector (verhuizen), met eigen juridische termen (5 signaalwoord-treffers). | Bevestigen of dit binnen deze juridische review valt. Vermoedelijk apart traject. |
| `registreer.html` | Pure redirect-stub → `/platform/voor-adviseurs`. Geen juridische inhoud. | Geen actie. |
| `inloggen.html`, `404.html`, `handleiding.html` | Navigatie/utility. | Geen actie (behalve H-consistentie). |
| `.claude/worktrees/*` | Git-worktrees met oudere kopieën van o.a. `voorwaarden.html`, `adv.html`. | Negeren voor review (werkkopieën); niet als aparte documenten tellen. |

---

## Voorlopige cross-document signalen (uitwerking volgt in FASE 3 — hier alleen gemarkeerd)

1. **Ontbrekend gepubliceerd document:** standalone "Algemene Voorwaarden Bisschops Financing B.V." waarnaar `voorwaarden.html` verwijst (C-groep).
2. **Ontbrekend document:** engagement letter / opdrachtbevestiging-structuur voor de M&A-praktijk als afzonderlijk stuk (nu alleen de bemiddelingsovereenkomst-sjablonen).
3. **Ontbrekend document:** referral-/introducervoorwaarden bij `lead-aandragen.html` (E4) en de "fee-afspraak aandragende partij".
4. **Ontbrekend document:** matching-specifieke voorwaarden (E5).
5. **Duplicatie / drift:** AV-tekst ≥ 4× (buildAvTekst + 3 ingebedde kopieën) — al niet meer identiek.
6. **Duplicatie / mismatch:** VOK getoond (F2) ≠ VOK vastgelegd/ondertekend (F3) — expliciet in code benoemd.
7. **Inconsistente versienummering:** A1 v2.2 (aug) · F1 v1.8 (sep) · B1 GV v1.9 (sep) · C4 AV v1.1 · F2/F3 VOK eigen versie · G1 v1.2 (aug). Geen centraal versieregister.
8. **Verschillende aansprakelijkheidsregimes** zonder onderlinge verwijzing: A1 € 10.000/traject · B1 10× platformvergoeding/traject · C4 geen cap (alleen "directe schade") · G1 nihil. Consistentie + mazen te toetsen.
9. **Verschillende vervaltermijnen:** C4/AV 12 mnd na ontdekking · A1 geen · succesfee-nawerking 24 mnd.
10. **Forumkeuze consistent** (Rechtbank Oost-Brabant overal) — positief; wel toetsen op geldigheid bij consument-wederpartij (art. 108 Rv).
11. **Consumentenrecht-blootstelling:** meerdere M&A-documenten (met name `bem_opvolging`) kunnen een natuurlijk persoon als opdrachtgever/verkoper hebben → afd. 6.5.3 BW van toepassing op boetes, nawerking, onweerlegbaar vermoeden, exoneratie.
12. **Wwft / cliëntenonderzoek / UBO / herkomst van middelen / sanctiescreening / PEP:** komt in geen enkel document voor richting de eigen opdrachtgever. **JURIDISCHE ONZEKERHEID (kandidaat):** of en in welke mate Bisschops Financing als bemiddelaar bij bedrijfsovernames Wwft-plichtig is, is niet eenduidig — vergt aparte beoordeling in FASE 2.
13. **Belangenconflict / dubbele petten:** platform faciliteert verkoper én koper in één traject; Marcel kan tevens adviseur zijn. Geen document regelt belangenconflicten, meerdere opdrachtgevers, of "Chinese walls".
14. **Beroeps-/tuchtregels & klachtenregeling:** niet geadresseerd; wordt relevanter bij aansluiting BOBB / Overname-Experts.
15. **Geen apart cookiebeleid** — verdedigbaar mits feitelijk geen niet-noodzakelijke cookies/trackers (technisch te bevestigen).

---

## Statusoverzicht per document

| # | Document | Locatie | Versie | Status |
|---|---|---|---|---|
| A1 | Gebruiksvoorwaarden (verkoper/koper/meekijker) | `voorwaarden.html` | 2.2 (aug 2026) | Live |
| A2 | Idem — bron/concept | `_src/voorwaarden.html` | — | Wijkt 99 regels af; herkomst onduidelijk |
| B1 | Gebruiksvoorwaarden platform (adviseur) | `backend/cloudflare-worker.js` → `/gebruiker/voorwaarden` | GV 1.9 (sep 2026) | Live, verplichte acceptatie |
| B2 | Weergave-stub adviseur-GV | `platformvoorwaarden.html` | — | Live |
| C1 | Bemiddelingsovereenkomst Verkoop + AV-bijlage | `backend/worker/02-config-constanten.js` (`BF_TEMPLATES.bem_verk`) | — | Live sjabloon (marilyn-bewerkbaar) |
| C2 | Bemiddelingsovereenkomst Opvolging + AV-bijlage | idem (`bem_opvolging`) | — | Live sjabloon |
| C3 | Bemiddelingsovereenkomst Aankoop + AV-bijlage | idem (`bem_koper`) | — | Live sjabloon |
| C4 | Algemene Voorwaarden (bijlage-generator) | `backend/cloudflare-worker.js` (`buildAvTekst`) | AV 1.1 | Live |
| C5 | AV — ingebedde kopieën | `BF_TEMPLATES.*` | — | Live; drift t.o.v. C4 |
| D | NDA / LOI / bieding / SPA-aandachtspunten / exclusief / closing | `BF_TEMPLATES` | — | Live sjablonen |
| E1 | Bedrijfsscan-disclaimer + privacy-note | `bedrijfsscan-start.html` (+ `bedrijfsscan.html`) | — | Live |
| E2 | Proefaccount-aanvraag | `proefaccount.html` | — | Live |
| E3 | Contactformulier | `contact.html` / `contact-verzonden.html` | — | Live |
| E4 | Overname aandragen | `lead-aandragen.html` | — | Live; minimale privacyzin |
| E5 | Matching-platform | `matching-platform.html` | bèta | Live |
| E6 | Meekijker-portaal | `viewer.html` | — | Live |
| F1 | Privacyverklaring | `privacy.html` | 1.8 (sep 2026) | Live |
| F2 | VOK — adviseurweergave | `mna/04-begeleider-dashboard.js` (`VOK_TEKST`) | `VOK_VERSIE` | Live |
| F3 | VOK — opgeslagen/ondertekend | `backend/worker/20-signhost-vok.js` (`vokTekst`) | — | Live; mismatch met F2 in code benoemd |
| G1 | Testvoorwaarden | `testvoorwaarden.html` | 1.2 (aug 2026) | Live |
| H | Marketing-claims (platform/expertise/cases/beveiliging) | diverse `*.html` + `worker/24` | — | Live |
| I | VerhuisScan-teksten | `hugo.html`, `verhuis.html` | — | Live; scope te bevestigen |

---

**FASE 1 afgerond. Geen bestanden met juridische inhoud gewijzigd.**
Wacht op akkoord van de opdrachtgever vóór FASE 2 (juridische review per document + kader A/B/C/D) en FASE 3 (cross-document consistentie).
