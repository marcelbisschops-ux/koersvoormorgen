# LEGAL_ISSUES.md — Juridische review (FASE 2–4)

**Datum:** 2026-09-03 · **Rechtstelsel:** Nederlands recht · **Context:** B2B digitale dienst (platform) + M&A-procesbegeleiding, met reële B2C-uitloop bij opvolgings-/privétransacties.
**Basis:** [`LEGAL_INVENTORY.md`](LEGAL_INVENTORY.md). Reviewregels: [`../REVIEW.md`](../REVIEW.md).
**Status van dit document:** analyse + tekstvoorstellen. **Er is nog geen enkel juridisch document gewijzigd.** Toepassing (FASE 5) gebeurt pas na akkoord per bevinding — zie "Direct aan te passen" onderaan.

> **Update 2026-09-03 — FASE 5 voorbereid.** Marcel heeft de commerciële keuzes gemaakt (ISSUE-05: cap € 10.000/opdracht + € 10.000/jaar, geen verzekering · ISSUE-03: voorwaardelijke consumentenclausule · ISSUE-07: strakke Transactiewaarde-definitie · ISSUE-09: verrekenbare, begrensde boete · ISSUE-02: geen losse AV-pagina · ISSUE-12: AV-bepaling + adviseur-beslisboom, niet-blokkerend). De volledige nieuwe tekst per document staat in [`FASE5-WIJZIGINGEN.md`](FASE5-WIJZIGINGEN.md); de Wwft-werkinstructie in [`CLIENTACCEPTATIE-BESLISBOOM.md`](CLIENTACCEPTATIE-BESLISBOOM.md). Nog toe te passen op de live bestanden na "ja op de redline". Eén open sub-keuze: ISSUE-10 H1 (voorstel A met € 10.000-bodem, of voorstel B).

Wetsverwijzingen gecontroleerd op 2026-09-03 tegen wetten.overheid.nl (BW Boek 6 titel 5 afd. 3, Boek 7 titel 7; Rv; AVG/UAVG; Wwft). Waar de toepassing casuïstisch is, staat **JURIDISCHE ONZEKERHEID** met uitleg.

---

## Prioriteitentabel

| Prioriteit | Document | Issue | Risico | Aanbevolen actie | Status |
|---|---|---|---|---|---|
| CRITICAL | VOK (`mna/04` ↔ `worker/20`) | ISSUE-01 · Geaccepteerde VOK-tekst (v1.5, 12 art) ≠ bewijs-e-mailtekst (Juli, 11 art); DB slaat alleen versienr. op | Geen sluitend bewijs van de art. 28 AVG-afspraken; e-mail mist 72u-meldplicht + auditrecht; interne tegenstrijdigheid ("Versie 1.5 \| Juli 2026") | Eén canonieke VOK-bron; volledige tekst (of hash) opslaan bij acceptatie; backend-tekst nu verbatim gelijktrekken | Open — voorstel |
| CRITICAL/HIGH | `voorwaarden.html` + `m-en-a-expertise/*` | ISSUE-02 · Verwijzing naar niet-gepubliceerde "Algemene Voorwaarden Bisschops Financing B.V."; geen kenbare voorwaarden vóór opdracht | Vernietigbaarheid AV-bedingen (art. 6:233 sub b jo. 6:234 BW); onduidelijkheid welke voorwaarden gelden | Publiceer `algemene-voorwaarden.html` als single source; link vanuit expertise-pagina's + `voorwaarden.html` art. 2 | Open — voorstel |
| HIGH | `bem_opvolging`, `bem_verk`, AV | ISSUE-03 · Consumentenrecht (afd. 6.5.3 BW) niet verwerkt terwijl opdrachtgever een natuurlijk persoon kan zijn | Kernbedingen (exoneratie, boete, bewijsvermoeden, nawerking) vernietigbaar bij consument | Consumentenclausule of B2C-variant; zwarte/grijze lijst respecteren | Open — voorstel (commercieel) |
| HIGH | `bem_*` art. 4 / AV art. 5 | ISSUE-04 · "Onweerlegbaar" bewijsvermoeden introductie | Het beschermingsbeding dat je het meest nodig hebt is het meest kwetsbaar (art. 153 Rv; 6:236 sub k bij consument; 6:248 lid 2) | Maak het weerlegbaar met omgekeerde bewijslast + haalbare meldprocedure | Open — voorstel |
| HIGH | AV art. 7 | ISSUE-05 · Aansprakelijkheid geheel uitgesloten, geen bedrag-cap | Volledige uitsluiting eerder onredelijk bezwarend/onaanvaardbaar dan een cap; afwijkend van marktstandaard M&A-advies | Vervang door beperking tot fee-bedrag met absoluut plafond € [X]; koppel aan beroepsaansprakelijkheidsverzekering | Open — voorstel (commercieel + JUR. ONZEKERHEID) |
| HIGH | `buildAvTekst()` ↔ `BF_TEMPLATES.*` | ISSUE-06 · AV-tekst ≥ 4× gedupliceerd en al gedrift (bestuurdersvrijwaring-alinea niet overal) | Ondertekende BEM-bijlage wijkt af van "de" AV; onduidelijk welke geldt | Eén canonieke AV; `bgDoc()` voegt die dynamisch toe i.p.v. hardgecodeerd inbedden | Open — voorstel (structureel) |
| HIGH | `bem_koper` AV art. 2 + succesfee | ISSUE-07 · "Transactiewaarde" te ruim: schuldovername + toekomstige huur/mgmt-fees + max earn-out in de fee-grondslag | Dubbeltelling; transparantievereiste (6:238 lid 2); fee over niet-ontvangen bedragen | Herdefinieer strak: aan verkoper toekomende tegenprestatie; earn-out-fee bij daadwerkelijke uitbetaling; geen dubbeltelling schuld | Open — voorstel (commercieel) |
| HIGH | `loi` art. 7 | ISSUE-08 · Redactie-instructie aan de gebruiker staat in de te ondertekenen documenttekst | Verwarring/geschil over het overeengekomene; verraadt fee-structuur aan de tegenpartij; onprofessioneel | Verwijder de parenthetische instructie; verplaats naar toelichting/`{{optie}}` | **Direct aan te passen** |
| HIGH | `nda` art. 8, `bem_koper` AV art. 6 | ISSUE-09 · Boetes cumulatief met volledige schade; ongelimiteerde dagboete | Art. 6:92 lid 2 BW (boete i.p.v. schade, tenzij anders); matiging art. 6:94 (dwingend); onredelijk-bezwarend-risico | Kies per beding: gefixeerde minimumschade óf begrensde prikkelboete; begrens de € 2.500/dag | Open — voorstel (commercieel) |
| HIGH | `voorwaarden.html` / adviseur-GV / testvoorwaarden / AV | ISSUE-10 · Vier aansprakelijkheidsregimes zonder samenloopregel; adviseur-cap = € 0 bij gratis proef | Twee caps voor dezelfde gebeurtenis op één traject; feitelijk absolute uitsluiting bij nul-vergoeding | Bodembedrag naast de 10×-formule; expliciete samenloopbepaling (één maximum per gebeurtenis per traject) | Open — voorstel (commercieel) |
| HIGH | AV / `bem_*` | ISSUE-13 · Belangenconflict / dienen van verkoper én koper niet geregeld | Art. 7:417/7:418 BW (twee heren dienen; tegenstrijdig belang); vernietiging/loonverlies; dubbele courtage bij consument verboden (7:417 lid 4) | Belangenconflict-bepaling in de AV; geen fee van de andere zijde bij consument aan één zijde | Open — voorstel (deels JUR. ONZEKERHEID) |
| MEDIUM/HIGH | AV / `bem_*` | ISSUE-12 · Wwft / cliëntenonderzoek / UBO / PEP / herkomst middelen / sanctiescreening nergens geadresseerd | Handhavingsrisico (BFT) indien plichtig; witwas-/reputatieblootstelling | (a) laten toetsen of Wwft van toepassing is; (b) hoe dan ook een cliëntacceptatie-/integriteitsbepaling opnemen | Open — **JURIDISCHE ONZEKERHEID** + voorstel |
| MEDIUM | `privacy.html` §4 + alle publieke pagina's | ISSUE-11 · "Geen cookies of tracking pixels" terwijl Google Fonts van `fonts.gstatic.com` het IP-adres naar Google (VS) stuurt | Onvolledige privacyverklaring (art. 13 AVG); bekende "Google Fonts"-doorgifte­kwestie | Self-host de fonts; tot dan: Google toevoegen aan doorgiftetabel + zin nuanceren | Open — voorstel (tekst) + technische taak |
| MEDIUM | `bem_opvolging`/`bem_koper` art. 3/5 | ISSUE-14 · Betalingsverplichting ontstaat "naar het oordeel van {{BEGELEIDER_KORT}}" | Potestatief element; kwetsbaar (6:23/6:248; 6:237 sub c bij consument) | Maak het schriftelijk akkoord van Opdrachtgever constitutief | Open — voorstel |
| MEDIUM | `voorwaarden.html` art. 6 / adviseur-GV art. 6 / testvoorwaarden art. 2 | ISSUE-15 · 24u-meldplicht + "eerst BF, dan pas extern/toezichthouder melden" + "schade voor eigen rekening" | Botsing met AVG art. 33/34-meldplichten; verkapte vrijtekening | Herformuleer als samenwerkings-/meldbepaling zonder opschorting van wettelijke meldingen; eigen-schuld i.p.v. "voor eigen rekening" | Open — voorstel (deels redactioneel) |
| MEDIUM | `voorwaarden.html` art. 1 + `bedrijfsscan-start.html` | ISSUE-18 · Belofte "aparte, kortere voorwaarden op het instrument" ≠ feitelijke losse disclaimer | Belofte suggereert meer dan er staat | Compacte "Voorwaarden bedrijfsscan"-sectie óf art. 1 nuanceren | Open — voorstel |
| MEDIUM | `index.html`/`cases/*`/`platform/beveiliging-en-gegevens.html`/`worker/24` | ISSUE-19 · Onderbouwing kwantitatieve claims; ISO 27001/SOC 2 zijn Cloudflare's certificeringen | Art. 6:194 BW misleidende mededeling (B2B); Reclame Code | Claims onderbouwbaar houden; certificeringen expliciet aan de hostingpartij toeschrijven | Open — voorstel |
| MEDIUM | `lead-aandragen.html` | ISSUE-20 · Geen aanbreng-/referralvoorwaarden bij "fee-afspraak aandragende partij" | Geschil over vergoeding/exclusiviteit/geheimhouding aangedragen naam | Korte "Voorwaarden voor het aandragen van een overname" | Open — voorstel |
| MEDIUM | `matching-platform.html` + `worker/19` | ISSUE-21 · Aanvaardingsmoment/voorwaarden voor de zich-aanmeldende matching-koper onduidelijk | Geen kenbare GV-/matchingvoorwaarde bij interesse-aanmelding | Aanvaardingsvinkje + matching-specifieke voorwaarde (anonimiteit niet gegarandeerd, geen recht op contact/transactie, geheimhouding teaser) | Open — **FASE 2 vervolg** (worker/19 nog te lezen) |
| MEDIUM | `viewer.html` + `worker/21-meekijker` | ISSUE-22 · Krijgt de meekijker geheimhouding + reikwijdte kenbaar vóór/bij eerste inlog? | Zwakke afdwingbaarheid geheimhoudingsplicht meekijker | Kernpunten tonen bij eerste inlog (alleen-lezen, één fase, geen verspreiding, intrekbaar) | Open — **FASE 2 vervolg** (viewer.js nog te lezen) |
| MEDIUM | `bgDoc()` (`mna/04`) | ISSUE-25 · Borgt de generator dat geen document met open `[...]`/`{{...}}`-placeholders als definitief/ondertekenbaar wordt aangeboden? | Ondertekening van een onvolledig document | Placeholder-check uitbreiden in de bestaande clausule-integriteitsregel | Open — technische/procescheck |
| LOW | AV art. 4 / `bem_*` | ISSUE-23 · "Wettelijke handelsrente" ongeacht of Opdrachtgever consument is | Bij consument geldt art. 6:119, niet 6:119a BW | "(handels)rente als bedoeld in art. 6:119a BW, dan wel art. 6:119 BW indien Opdrachtgever een consument is" | **Direct aan te passen** |
| LOW | AV art. 7 / templates | ISSUE-24 · "de leiding" niet gedefinieerd | Uitleg-onzekerheid bij een exoneratie-uitzondering | Definieer ("het bestuur, dan wel leidinggevenden die de opdracht rechtstreeks uitvoerden") | **Direct aan te passen** |
| LOW | versiebeheer alle documenten | ISSUE-16 · Geen centraal versieregister; nummering loopt uiteen | Onduidelijk welke versie geldt/geaccepteerd is | Versietabel in `LEGAL_REVIEW.md` (hieronder aangemaakt) | **Gedaan (register)** |
| LOW/INFO | `_src/voorwaarden.html` | ISSUE-17 · Bevestigd: identieke juridische bodytekst, alleen build-wrapper-fragment | Geen inhoudelijk risico | Eén versie bijhouden of buildproces documenteren | Gesloten — geen divergentie |

---

## Uitwerking per bevinding (probleem · risico · huidige tekst · voorgestelde tekst · reden · prioriteit)

### ISSUE-01 — VOK: geaccepteerde tekst ≠ bewijs-tekst · **CRITICAL**

**Probleem.** De adviseur ziet en accepteert in het begeleider-dashboard `VOK_TEKST` (`mna/04-begeleider-dashboard.js`): **versie 1.5, "Augustus 2026", 12 artikelen**, inclusief IE-/eigendomsbehoud (art. 2), backup-bewaartermijn (art. 5), algemene sub-verwerker-toestemming + 30 dagen notice (art. 6), **datalekmelding binnen 72 uur** (art. 8) en een **volledig Auditrecht** (art. 9). De bevestigingsmail die als "bewijs van acceptatie" wordt verstuurd, bevat `vokTekst` uit `worker/20-signhost-vok.js`: **"Versie ${vokVersie} \| Juli 2026", 11 artikelen**, met de oude datalekbepaling ("zonder onredelijke vertraging", geen 72u) en **zonder Auditrecht-artikel**. De header interpoleert het actuele versienummer, zodat de mail letterlijk "Versie 1.5 | Juli 2026" kan zeggen boven de juli-tekst. In `mna_vok` wordt alleen `(id, tussen_code, naam, datum, versie, ip)` opgeslagen — **niet de tekst zelf**.

**Risico.** (1) Er is geen betrouwbare vastlegging van de art. 28 lid 3 AVG-afspraken zoals feitelijk overeengekomen: de enige artefacten zijn de code op het moment van acceptatie en een e-mail met een andere, oudere tekst. (2) Bij een datalek of geschil kan discussie ontstaan welke tekst geldt; de "bewijs"-e-mail mist juist de bepalingen die zowel BF (72u = ook een BF-beperking) als de adviseur (auditrecht) aangaan. (3) De interne tegenstrijdigheid ("Versie 1.5 | Juli 2026") ondermijnt de bewijswaarde. Een codecommentaar in `worker/20` (25 juli 2026) signaleerde exact dit patroon, trok het toen gelijk, en waarschuwde dat het zou terugkeren — dat is nu gebeurd.

**Huidige tekst.** `worker/20-signhost-vok.js` → `const vokTekst = "VERWERKERSOVEREENKOMST … Versie ${vokVersie} | Juli 2026 … Artikel 8 — Datalekken\n${…kort} informeert Gebruiker zonder onredelijke vertraging na ontdekking van een datalek. … Artikel 9 — Toepasselijk recht …"` (11 art, geen auditrecht).

**Voorgestelde tekst / aanpak.**
1. **Structureel (voorkeur):** maak de VOK één canonieke bron in de backend (net als de adviseur-GV via `/gebruiker/voorwaarden`). De frontend haalt de tekst + versie op; de bevestigingsmail gebruikt exact diezelfde string. Eén plek om te wijzigen.
2. **Bewijs:** sla bij acceptatie de **volledige tekst** (of een SHA-256 hash daarvan + de tekst in een `vok_versies`-tabel) op in `mna_vok`, zodat per acceptatie herleidbaar is wat is overeengekomen.
3. **Direct (tot 1/2 er is):** vervang `vokTekst` in `worker/20` verbatim door de huidige `VOK_TEKST` (v1.5, 12 artikelen), en corrigeer "Juli 2026" → "Augustus 2026".

**Reden.** AVG art. 28 lid 9 (schriftelijke/elektronische verwerkersovereenkomst) + bewijspositie. Geen commerciële voorwaarde betrokken — dit is zuiver consistentie + vastlegging.

---

### ISSUE-02 — Verwijzing naar niet-gepubliceerde "Algemene Voorwaarden Bisschops Financing B.V." · **CRITICAL/HIGH**

**Probleem.** `voorwaarden.html` art. 2: *"tenzij Bisschops Financing B.V. zelf als uw adviseur optreedt; in dat geval gelden daarnaast de Algemene Voorwaarden van Bisschops Financing B.V. voor die dienstverlening."* Zo'n document bestaat niet als vindbare, gepubliceerde tekst. De M&A-Expertise-pagina's linken uitsluitend naar `voorwaarden.html` (dat de advies-/bemiddelingsrelatie juist uitsluit). De AV bestaat alleen als bijlage onderin de bemiddelingsovereenkomst-sjablonen en als `buildAvTekst()`.

**Risico.** Bedingen uit algemene voorwaarden zijn vernietigbaar als de gebruiker de wederpartij niet een redelijke mogelijkheid heeft geboden er kennis van te nemen (art. 6:233 sub b jo. 6:234 BW). Voor de BEM's waar de AV fysiek als bijlage meegaat is dat op zichzelf ondervangen; maar (a) de verwijzing in `voorwaarden.html` wekt de indruk van een apart raadpleegbaar document dat er niet is, en (b) een opdrachtgever die Marcel als adviseur overweegt, heeft vóór opdrachtverlening geen kenbare voorwaarden.

**Voorgestelde aanpak.**
1. Publiceer **`algemene-voorwaarden.html`** ("Algemene Voorwaarden Bisschops Financing B.V. — M&A-advies en bemiddeling"), gebaseerd op de huidige `buildAvTekst()`-inhoud, met de verbeteringen uit ISSUE-04/05/09/12/13/23/24 verwerkt.
2. Link ernaar vanaf elke `m-en-a-expertise/*`-pagina (footer + een regel "Op mijn dienstverlening zijn de Algemene Voorwaarden van toepassing") en vanuit `voorwaarden.html` art. 2.
3. Maak die HTML de single source; `buildAvTekst()` / `bgDoc()` genereren de BEM-bijlage daaruit (lost ook ISSUE-06 op).
4. Optioneel: deponeer bij de KvK (niet verplicht, wel gebruikelijk en het versterkt het "ter hand gesteld/kenbaar"-argument).

**Reden.** Art. 6:233/6:234 BW; marktstandaard advisory (voorwaarden vindbaar vóór opdracht).

---

### ISSUE-03 — Consumentenrecht niet verwerkt in M&A-documenten · **HIGH**

**Probleem.** `bem_opvolging` (en soms `bem_verk`) kan een natuurlijk persoon als opdrachtgever hebben: een DGA die privé zijn aandelen verkoopt, een familielid bij opvolging, een ondernemer zonder rechtspersoon. Geen enkel M&A-document maakt onderscheid of past bedingen aan voor die situatie.

**Risico.** Zodra de opdrachtgever een consument is (natuurlijk persoon, niet handelend in beroep/bedrijf), gelden afd. 6.5.3 BW en de reflexwerking. Kwetsbaar:
- **Volledige aansprakelijkheidsuitsluiting** — art. 6:237 sub f (vermoed onredelijk bezwarend).
- **Onweerlegbaar bewijsvermoeden introductie** — art. 6:236 sub k (bewijsbeding ten nadele van de consument = zwart → vernietigbaar).
- **€ 25.000 boete anti-omzeiling + 50%-fee zonder transactie + 24 mnd nawerking** — art. 6:237 sub i (onredelijk bezwarende schadevergoeding).
- **Exclusiviteit die na 4 mnd stilzwijgend voor onbepaalde tijd doorloopt** — Wet van Dam / art. 6:236 sub j; opzegtermijn 1 mnd is aanwezig, maar de constructie moet toetsbaar blijven.

**JURIDISCHE ONZEKERHEID.** Of een verkopende DGA/privé-aandeelhouder in een concreet geval "consument" is, is casuïstisch. De veilige route is bedingen die de zwarte/grijze lijst respecteren zodra de opdrachtgever een natuurlijk persoon is die niet beroepsmatig handelt.

**Voorgestelde tekst (nieuwe clausule in de AV en/of elke BEM).**
> **Consument-opdrachtgever.** Is Opdrachtgever een natuurlijk persoon die de overeenkomst niet sluit in de uitoefening van een beroep of bedrijf, dan gelden de volgende bepalingen in aangepaste vorm: (a) de aansprakelijkheid van {{BEGELEIDER_KORT}} is niet uitgesloten maar beperkt tot het bedrag van de in het kader van de opdracht in rekening gebrachte vergoeding, met een absoluut maximum van € [X]; (b) een vermoeden van introductie als bedoeld in artikel [4] is weerlegbaar; (c) een boete of forfaitaire vergoeding kan door Opdrachtgever ter toetsing aan de rechter worden voorgelegd en wordt zo nodig gematigd; (d) de nawerking van artikel [5] bedraagt twaalf (12) maanden. Overige bepalingen blijven van kracht voor zover zij de consument-opdrachtgever niet onredelijk benadelen.

**Reden.** Afd. 6.5.3 BW; behoudt de commerciële kern voor B2B en maakt de B2C-variant afdwingbaar i.p.v. vernietigbaar.

---

### ISSUE-04 — "Onweerlegbaar" bewijsvermoeden introductie · **HIGH**

**Probleem.** `bem_verk` art. 4 / `bem_opvolging` art. 4 / AV art. 5-context: *"Bij gebreke van een tijdige en volledige melding wordt de Potentiële Koper onweerlegbaar geacht door {{BEGELEIDER_KORT}} te zijn geïntroduceerd."* Meldtermijn 5 werkdagen, met bewijsstukken.

**Risico.** Een onweerlegbaar (dwingend) bewijsvermoeden ten laste van de wederpartij staat op gespannen voet met art. 153 Rv (bewijsovereenkomsten zijn toegestaan, maar niet voor zover zij leiden tot een redelijkerwijs niet te leveren tegenbewijs of in strijd zijn met de openbare orde) en, bij consument, met art. 6:236 sub k BW (nietig/vernietigbaar). Ook zonder consument kan de rechter een onweerlegbaar vermoeden op grond van art. 6:248 lid 2 buiten toepassing laten. Praktisch: juist het beding dat omzeiling moet tegengaan is het meest kwetsbaar bij aanvechting; een gematigde variant is beter afdwingbaar.

**Huidige tekst.** *"Indien een Potentiële Koper reeds bij Opdrachtgever bekend is en in de zes (6) maanden voorafgaand aan de Introductie aantoonbaar contact heeft plaatsgevonden, dient Opdrachtgever dit binnen vijf (5) werkdagen na Introductie schriftelijk en met bewijsstukken aan {{BEGELEIDER_KORT}} te melden. Bij gebreke van een tijdige en volledige melding wordt de Potentiële Koper onweerlegbaar geacht door {{BEGELEIDER_KORT}} te zijn geïntroduceerd."*

**Voorgestelde tekst.**
> Indien een Potentiële Koper reeds bij Opdrachtgever bekend is en in de zes (6) maanden vóór de Introductie aantoonbaar zakelijk contact over een mogelijke transactie heeft plaatsgevonden, meldt Opdrachtgever dit binnen tien (10) werkdagen na de Introductie schriftelijk aan {{BEGELEIDER_KORT}}, onder overlegging van verifieerbare stukken (zoals correspondentie of gespreksverslagen met datum). Doet Opdrachtgever dat niet, dan wordt de Potentiële Koper **vermoed** door {{BEGELEIDER_KORT}} te zijn geïntroduceerd; het staat Opdrachtgever vrij dit vermoeden te weerleggen met verifieerbaar bewijs van eerder eigen contact. Een niet aan Opdrachtgever toe te rekenen overschrijding van de meldtermijn wordt hersteld indien de melding alsnog onverwijld na het wegvallen van de verhindering wordt gedaan.

**Reden.** Art. 153 Rv; 6:236 sub k / 6:248 lid 2 BW. Behoudt de bescherming (bewijslast verschuift naar Opdrachtgever) zonder het afdwingbaarheidsrisico van "onweerlegbaar".

---

### ISSUE-05 — AV art. 7: aansprakelijkheid geheel uitgesloten, geen cap · **HIGH** · JURIDISCHE ONZEKERHEID

**Probleem.** AV art. 7: *"Iedere aansprakelijkheid is uitgesloten, behoudens in geval van opzet of bewuste roekeloosheid van de leiding. Aansprakelijkheid is beperkt tot uitsluitend directe schade. … Iedere aanspraak vervalt indien deze niet binnen twaalf (12) maanden na ontdekking schriftelijk is gemeld."* Geen bedrag; geen koppeling aan de fee of aan een verzekering.

**Risico.** Een volledige *uitsluiting* (i.p.v. een *beperking* tot een bedrag) wordt in de rechtspraak eerder als onredelijk bezwarend (art. 6:233a) of naar maatstaven van redelijkheid en billijkheid onaanvaardbaar (art. 6:248 lid 2) terzijde geschoven — te meer bij een dienstverlener wiens hele propositie "ervaring, oordeel en regie" is. Slaagt dat beroep, dan valt de exoneratie **volledig** weg (geen subsidiair plafond). Marktstandaard voor M&A-/corporate-finance-advies is een **beperking tot** een bedrag: doorgaans de in de zaak gefactureerde fee, of een vast plafond, meestal in lijn met de dekking van de beroepsaansprakelijkheidsverzekering.

**JURIDISCHE ONZEKERHEID.** Of een volledige uitsluiting standhoudt, hangt af van de omstandigheden (aard opdracht, deskundigheid partijen, verzekerbaarheid, schadeomvang). Een cap is aantoonbaar veiliger én marktconform; een volledige uitsluiting is een gok.

**Voorgestelde tekst.**
> **Artikel 7 — Aansprakelijkheid.** De aansprakelijkheid van {{BEGELEIDER_KORT}} voor schade die voortvloeit uit of verband houdt met de opdracht is beperkt tot het bedrag dat in de betreffende opdracht in de twaalf (12) maanden vóór de schadeveroorzakende gebeurtenis aan {{BEGELEIDER_KORT}} in rekening is gebracht, met een absoluut maximum van € [X] per opdracht en € [Y] per kalenderjaar. Aansprakelijkheid bestaat uitsluitend voor directe schade; indirecte schade (waaronder gederfde winst, gemiste besparingen, reputatieschade en bedrijfsstagnatie) is uitgesloten. De beperkingen in dit artikel gelden niet bij opzet of bewuste roekeloosheid van het bestuur van {{BEGELEIDER_KORT}}. Voor zover {{BEGELEIDER_KORT}} voor de betreffende schade een beroepsaansprakelijkheidsverzekering heeft die uitkeert, is de aansprakelijkheid ten minste gelijk aan het uitgekeerde bedrag. Iedere aanspraak vervalt indien deze niet binnen twaalf (12) maanden na ontdekking, en in elk geval binnen vierentwintig (24) maanden na de gebeurtenis, schriftelijk bij {{BEGELEIDER_KORT}} is ingediend.

**Reden.** Art. 6:233a/6:248 BW; marktstandaard advisory; behoudt een verdedigbaar plafond óók als de rechter de ruimste exoneratie afwijst.
**Aandachtspunt voor Marcel (business, geen tekst):** is er een **beroepsaansprakelijkheidsverzekering**? Zo niet, dan is dat een groter praktijkrisico dan de clausuleformulering, en bepaalt het mede het cap-bedrag.

---

### ISSUE-06 — AV-tekst ≥ 4× gedupliceerd en gedrift · **HIGH** (structureel)

**Probleem.** De AV staat als `buildAvTekst(brand)` in `cloudflare-worker.js` én letterlijk ingebed onderaan `BF_TEMPLATES.bem_verk`, `bem_opvolging` en `bem_koper` in `worker/02-config-constanten.js`. De versies lopen al uiteen (o.a. de alinea "Aansprakelijkheid … rust uitsluitend op … de bestuurder … niet persoonlijk aansprakelijk" zit wél in `buildAvTekst()` en niet in alle ingebedde kopieën; `bem_koper` art. 7 is anders geformuleerd dan `bem_verk` art. 7).

**Risico.** Bij een wijziging wordt één plek bijgewerkt en de andere niet. Een ondertekende BEM bevat dan een AV-bijlage die afwijkt van "de" AV. BEM art. 8 zegt "de hieronder opgenomen Algemene Voorwaarden" → de (mogelijk niet-onderhouden) ingebedde kopie prevaleert.

**Voorgestelde aanpak.** Eén canonieke AV (de `algemene-voorwaarden.html` uit ISSUE-02, of één constant `AV_TEKST`). `bgDoc()` voegt die bij het genereren dynamisch toe onder de BEM i.p.v. de hardgecodeerde inbedding. `buildAvTekst()` wordt een dunne wrapper om die ene bron.

**Reden.** DRY voor juridische tekst is geen cosmetica maar risicobeheersing: het voorkomt dat partijen verschillende versies tekenen.

---

### ISSUE-07 — "Transactiewaarde" te ruim (bem_koper) · **HIGH** (commercieel)

**Probleem.** `bem_koper` AV art. 2: Transactiewaarde = vaste koopsom + max earn-out + uitgestelde betalingen + vendor loans + **overgenomen schulden of verplichtingen** + **management-, consultancy-, huur- of leasevergoedingen** + *"ieder ander economisch voordeel samenhangend met de Transactie, ongeacht juridische vorm of betalingsmoment"*. De succesfee-staffel loopt over dat geheel.

**Risico.**
1. **Dubbeltelling.** Een koopsom op cash-and-debt-free basis is al ná verrekening van schuld. "Overgenomen schulden" er nog bij optellen telt hetzelfde effect twee keer.
2. **Transparantie (art. 6:238 lid 2 BW).** Toekomstige huur-/managementvergoedingen aan verkoper in de fee-grondslag is atypisch en onduidelijk; bij twijfel over de uitleg geldt de voor de wederpartij gunstigste (contra proferentem).
3. **Fee over niet-ontvangen geld.** "maximale earn-out" als grondslag terwijl earn-outs vaak niet volledig worden gehaald.

**Marktstandaard.** Fee over de aan verkoper(s) toekomende tegenprestatie voor de aandelen/activa; earn-out-deel van de fee verschuldigd bij daadwerkelijke uitbetaling (of contant gemaakt tegen een expliciete aanname); geen dubbeltelling van reeds in de koopsom verdisconteerde schuld.

**Voorgestelde tekst.**
> **Transactiewaarde:** de som van alle vergoedingen die de verkopende partij(en) voor de aandelen of activa ontvangen of gaan ontvangen, bestaande uit: (a) de koopsom; (b) uitgestelde betalingen en de hoofdsom van een vendor loan; (c) earn-out- en overige voorwaardelijke betalingen, meegeteld naar het bedrag dat daadwerkelijk wordt uitbetaald; en (d) overige aan de verkoper toekomende vergoedingen die naar hun aard deel uitmaken van de tegenprestatie voor de onderneming. Schulden die reeds zijn verdisconteerd in de koopsom (cash-and-debt-free) worden niet afzonderlijk meegeteld. Het deel van de succesfee dat betrekking heeft op earn-out- of voorwaardelijke componenten wordt opeisbaar naarmate die componenten worden uitbetaald.

**Reden.** Voorkomt dubbeltelling en een aanvechtbaar/onduidelijk kernbeding; sluit aan bij marktpraktijk. **Dit verlaagt de fee-grondslag in sommige gevallen — commerciële keuze voor Marcel.**

---

### ISSUE-08 — LOI-template bevat een instructie aan de gebruiker in de documenttekst · **HIGH** · Direct aan te passen

**Probleem.** `BF_TEMPLATES.loi` art. 7: *"(Let op: Indien je voor de Verkoper werkt met "Kosten Koper", moet hier staan dat Koper de bemiddelingskosten van {{BEGELEIDER_KORT}} draagt bij closing)."*

**Risico.** Deze interne instructie komt mee in een document dat tussen koper en verkoper wordt ondertekend. Onprofessioneel; kan verwarring of geschil geven over het overeengekomene; onthult de fee-structuur aan de tegenpartij.

**Huidige tekst.** Art. 7 tweede alinea: de parenthetische "(Let op: …)".

**Voorgestelde tekst.** Verwijder de parenthese uit de template. Vervang door een neutrale, invulbare zin:
> Tenzij schriftelijk anders overeengekomen draagt iedere partij haar eigen kosten. {{KOSTEN_REGELING}}

waarbij `{{KOSTEN_REGELING}}` door de begeleider wordt ingevuld (bijv. "De bemiddelingskosten van {{BEGELEIDER_KORT}} komen bij closing voor rekening van Koper.") of leeg blijft. De uitlegtekst verhuist naar de handleiding.

**Reden.** Documentintegriteit; voorkomt een geschil over de contractinhoud. Geen commerciële wijziging.

---

### ISSUE-09 — Boetes cumulatief met volledige schade; ongelimiteerde dagboete · **HIGH** (commercieel)

**Probleem.** `nda` art. 8: € 25.000 per overtreding + **€ 2.500 voor iedere dag** dat de overtreding voortduurt + "onverlet het recht op vergoeding van de daadwerkelijk geleden schade voor zover die de boete overstijgt". `bem_koper` AV art. 6: "De boete is cumulatief en treedt niet in de plaats van schadevergoeding."

**Risico.** Art. 6:92 lid 2 BW: een boetebeding treedt in beginsel *in de plaats van* schadevergoeding, tenzij anders overeengekomen — "anders overeenkomen" mag, maar de rechter toetst een stapeling van forfaitaire boete + volledige schade kritisch, en de matigingsbevoegdheid (art. 6:94 BW) is **dwingend** en niet uit te sluiten. Een ongelimiteerde dagboete van € 2.500 kan snel disproportioneel worden en wordt dan fors gematigd — mogelijk tot onder wat een enkelvoudige, redelijk onderbouwde boete zou hebben opgeleverd.

**Voorgestelde tekst (NDA art. 8).**
> Bij overtreding van de geheimhoudingsplicht verbeurt de Ontvangende Partij een direct opeisbare boete van € 25.000 per overtreding, vermeerderd met € 2.500 voor iedere dag dat een voortdurende overtreding na schriftelijke aanmaning voortduurt, tot ten hoogste € 50.000 aan dagboetes per overtreding. De boete strekt tot vergoeding van schade en wordt in mindering gebracht op een eventueel hogere, bewezen werkelijke schade; het recht om die meerdere schade te vorderen blijft bestaan. Dit beding laat de bevoegdheid van de rechter tot matiging onverlet.

**Reden.** Art. 6:92/6:94 BW; een begrensde, met de schade verrekenbare boete is beter afdwingbaar dan een ongelimiteerde stapeling. **Wijzigt de commerciële prikkel — keuze voor Marcel.**

---

### ISSUE-10 — Vier aansprakelijkheidsregimes zonder samenloopregel · **HIGH** (commercieel)

**Probleem.** `voorwaarden.html` (verkoper/koper/meekijker): € 10.000 per traject. Adviseur-GV art. 6: 10× de per traject in rekening gebrachte platformvergoeding. AV M&A: geheel uitgesloten (ISSUE-05). Testvoorwaarden: nihil. Geen enkel document verwijst naar de andere; geen samenloopregel. Bij een **gratis proefaccount** is de adviseur-cap 10 × € 0 = € 0.

**Risico.** Eén beveiligingsincident op één traject kan BF blootstellen aan claims van zowel de adviseur (10×-cap) als diens verkoper (€ 10.000-cap), zonder dat de documenten regelen dat dit samen één maximum is. De € 0-cap bij een gratis proef is vermoedelijk niet bedoeld en oogt als een feitelijk absolute uitsluiting (kwetsbaar, zie ISSUE-05).

**Voorgestelde tekst (toe te voegen aan de adviseur-GV art. 6 en `voorwaarden.html` art. 6).**
> **Bodem en samenloop.** De in dit artikel bedoelde beperking bedraagt ten minste € 10.000 en ten hoogste € [X] per traject. Is Bisschops Financing B.V. ter zake van dezelfde gebeurtenis met betrekking tot één traject aansprakelijk jegens meerdere partijen (waaronder de adviseur en diens cliënten), dan geldt het in dit artikel genoemde maximum als één gezamenlijk maximum voor al die aanspraken tezamen.

**Reden.** Voorkomt cumulatie van caps en een € 0-cap; maakt het regime uitlegbaar. **Bedrag € [X] is een commerciële keuze.**

---

### ISSUE-11 — "Geen cookies of tracking pixels" vs. Google Fonts-doorgifte · **MEDIUM**

**Probleem.** `privacy.html` §4: *"Geen gebruik van cookies of tracking pixels."* Alle publieke pagina's laden lettertypen van `https://fonts.googleapis.com` en `https://fonts.gstatic.com`. Bij het ophalen van een fontbestand ontvangt Google het IP-adres van de bezoeker (server in de VS). Dat is geen cookie, maar wel een verwerking + doorgifte die de stellige "wij verwerken niet"-toon niet dekt, en sinds LG München I (20 jan. 2022, 3 O 17493/20 — "Google Fonts") een bekend aandachtspunt is.

**Risico.** Onvolledige informatie in de privacyverklaring (art. 13 AVG). Beperkt maar reëel; makkelijk weg te nemen.

**Voorgestelde aanpak.**
1. **Self-host de Google Fonts** (de licentie — SIL Open Font License — staat dit toe). Dan vervalt de doorgifte en klopt de tekst zoals hij is.
2. Zolang dat niet gebeurd is: voeg aan de doorgiftetabel (§4/§5) toe: *"Google LLC — laden van weblettertypen (Google Fonts); ontvangt het IP-adres van de bezoeker; VS; grondslag: gerechtvaardigd belang (consistente presentatie), SCC"*, en pas de zin aan naar *"Wij plaatsen geen cookies en gebruiken geen trackers voor analyse of profilering. Voor de weergave van lettertypen wordt een verbinding met Google gemaakt; zie de doorgiftetabel."*

**Reden.** Art. 13 AVG (volledigheid); optie 1 is de nette structurele oplossing.

---

### ISSUE-12 — Wwft / cliëntenonderzoek nergens geadresseerd · **MEDIUM/HIGH** · JURIDISCHE ONZEKERHEID

**Probleem.** Geen document (AV, BEM, onboarding) noemt cliëntidentificatie, UBO-verificatie, PEP-toets, herkomst van middelen, sanctielijst-screening of het opschorten/beëindigen van de opdracht bij integriteitstwijfel.

**JURIDISCHE ONZEKERHEID.** De Wwft somt de instellingen limitatief op (art. 1a). "M&A-adviseur bij bedrijfsovernames" staat er niet met zoveel woorden; wél o.a. "bemiddelaars bij aan-/verkoop van onroerende zaken", belastingadviseurs, administratiekantoren, en — ruim — degene die "als natuurlijke persoon, rechtspersoon of vennootschap beroeps- of bedrijfsmatig advies geeft of bijstand verleent" bij bepaalde vennootschapsrechtelijke structuren en bij "de aan- of verkoop van aandelen in … een vennootschap" (vgl. art. 1a lid 4 sub c Wwft). Of Bisschops Financing daaronder valt, hangt af van de precieze werkzaamheden (zuivere procesbegeleiding vs. advies/bijstand bij de aandelentransactie zelf). Toezichthouder voor deze sector: BFT. Dit is een echte kwalificatievraag die specialistische toetsing vraagt.

**Risico.** Indien wél plichtig: het ontbreken van cliëntenonderzoek en van melding ongebruikelijke transacties (FIU-Nederland) is een handhavingsrisico. Ongeacht de kwalificatie: reputatie- en witwasblootstelling bij een transactie met dubieuze herkomst van de koopsom; BOBB-/marktstandaard is een cliëntacceptatiebeleid.

**Voorgestelde tekst (nieuwe AV-bepaling, ongeacht de Wwft-uitkomst).**
> **Cliëntacceptatie en integriteit.** Opdrachtgever verstrekt op eerste verzoek de gegevens en documenten die {{BEGELEIDER_KORT}} nodig acht om de identiteit van Opdrachtgever, van de bij de transactie betrokken (rechts)personen en van de uiteindelijk belanghebbenden vast te stellen, alsook informatie over de herkomst van de bij de transactie betrokken middelen. {{BEGELEIDER_KORT}} kan de uitvoering van de opdracht opschorten of de opdracht met onmiddellijke ingang beëindigen indien deze gegevens niet tijdig worden verstrekt, indien screening tegen toepasselijke sanctielijsten daartoe aanleiding geeft, of indien {{BEGELEIDER_KORT}} gerede twijfel heeft over de integriteit van de transactie of de herkomst van middelen. Voor zover op {{BEGELEIDER_KORT}} een wettelijke meldplicht rust, gaat die verplichting voor op de geheimhouding uit deze voorwaarden.

**Aanbevolen actie.** (a) Laat de Wwft-kwalificatie eenmalig specialistisch toetsen; leg de uitkomst vast in `LEGAL_REVIEW.md`. (b) Neem de bepaling hierboven nu al op — ze is nuttig ongeacht de uitkomst.

---

### ISSUE-13 — Belangenconflict / verkoper én koper dienen · **HIGH** · deels JURIDISCHE ONZEKERHEID

**Probleem.** Het platform faciliteert verkoper en koper in één traject; Marcel kan tevens als adviseur van één zijde optreden; noch de AV noch de BEM's regelen belangenconflicten of het van beide zijden bedingen van een fee in dezelfde transactie.

**Risico.** Art. 7:401 BW (goed opdrachtnemerschap) en art. 7:417/7:418 BW ("twee heren dienen" / tegenstrijdig belang van de tussenpersoon). Bij een niet-consument mag van beide zijden loon worden bedongen, mits meegedeeld; is aan één zijde een **consument** betrokken, dan heeft de tussenpersoon in beginsel **geen** recht op loon jegens de andere partij (art. 7:417 lid 4 BW). Bij niet-melding van een tegenstrijdig belang kan de opdrachtgever de rechtshandeling vernietigen en/of het loon aantasten (art. 7:418 lid 2).

**JURIDISCHE ONZEKERHEID.** In hoeverre art. 7:417/7:418 (geschreven voor bemiddeling/lastgeving) onverkort geldt voor M&A-*procesbegeleiding* is niet in alle gevallen uitgemaakt; de veilige lijn is de bepalingen te respecteren alsof zij gelden.

**Voorgestelde tekst (nieuwe AV-bepaling).**
> **Belangen en onafhankelijkheid.** {{BEGELEIDER_KORT}} treedt per transactie voor één partij op. {{BEGELEIDER_KORT}} treedt niet gelijktijdig voor beide zijden van dezelfde transactie op en bedingt niet van beide zijden een vergoeding, tenzij beide opdrachtgevers daarmee, na schriftelijke mededeling van het tweezijdige optreden en van de vergoedingsafspraken, uitdrukkelijk instemmen. Is aan één zijde een consument betrokken, dan bedingt {{BEGELEIDER_KORT}} geen vergoeding van de andere zijde. {{BEGELEIDER_KORT}} meldt Opdrachtgever een belang dat met de opdracht kan conflicteren zodra dat bekend wordt.

**Reden.** Art. 7:401/7:417/7:418 BW; voorkomt loonverlies en vernietiging.

---

### ISSUE-14 — Potestatieve trigger voorfasevergoeding · **MEDIUM**

**Probleem.** `bem_opvolging`/`bem_koper` art. 3/5: bescherming + voorfasevergoeding ontstaan zodra "naar het oordeel van {{BEGELEIDER_KORT}} sprake is van wederzijdse intentie", bevestigd "na schriftelijk akkoord van Opdrachtgever".

**Risico.** Een betalingsverplichting die de wederpartij niet kan voorzien omdat de gebruiker eenzijdig bepaalt wanneer die ontstaat, is kwetsbaar (art. 6:23, 6:248; bij consument art. 6:237 sub c). Het "schriftelijk akkoord Opdrachtgever" mitigeert dit, maar de tekst laat in het midden of dat akkoord constitutief is.

**Voorgestelde tekst.**
> De voorfasevergoeding en de volledige bescherming van succesfee, nawerking en anti-omzeiling ontstaan op het moment waarop Opdrachtgever schriftelijk (waaronder per e-mail) bevestigt dat van wederzijdse intentie sprake is. {{BEGELEIDER_KORT}} legt dat moment schriftelijk vast en bevestigt het aan Opdrachtgever. Zonder die bevestiging ontstaat geen voorfasevergoeding.

**Reden.** Neemt het potestatieve element weg; maakt het beding voorzienbaar en afdwingbaar.

---

### ISSUE-15 — 24u-meldplicht + "eerst BF, dan pas extern melden" · **MEDIUM**

**Probleem.** `voorwaarden.html` art. 6, adviseur-GV art. 6, testvoorwaarden art. 2: verplichte melding binnen 24 uur + BF *eerst* gelegenheid geven vóór eigen herstel of externe/toezichthouder-melding, met "schade voor eigen rekening" bij niet-nakoming. Er staat "tenzij een wettelijke verplichting zich daartegen verzet".

**Risico.** De formulering "eerst BF, dan pas extern melden" blijft ongelukkig naast de eigen AVG-meldplichten van de adviseur (art. 33: 72u aan de AP; art. 34: aan betrokkenen), ook al is die grotendeels afgevangen door de "tenzij". "Schade voor eigen rekening" is een verkapte vrijtekening die als onredelijk bezwarend kan worden gezien; art. 6:101 BW (eigen schuld) regelt dit al genuanceerder.

**Voorgestelde tekst (kern).**
> De adviseur meldt een ontdekte kwetsbaarheid, een (dreigend) beveiligingsincident of een datalek onverwijld aan Bisschops Financing B.V. en werkt redelijkerwijs mee aan het beperken en verhelpen daarvan. Deze bepaling laat de eigen wettelijke meldplichten van de adviseur (waaronder jegens de Autoriteit Persoonsgegevens en betrokkenen) onverlet; de adviseur stemt de timing en inhoud van een externe melding waar mogelijk met Bisschops Financing B.V. af. Voor zover schade is ontstaan of vergroot doordat de adviseur deze meld- of medewerkingsplicht niet is nagekomen, wordt daarmee bij de vaststelling van de schadevergoeding rekening gehouden overeenkomstig artikel 6:101 BW.

**Reden.** Verwijdert de suggestie dat wettelijke meldingen worden opgeschort en de verkapte vrijtekening, zonder de samenwerkingsgedachte te verliezen. Grotendeels redactioneel.

---

### ISSUE-16 t/m ISSUE-25 — samengevat

- **ISSUE-16 (LOW):** versieregister aangemaakt in `LEGAL_REVIEW.md`; bij elke inhoudelijke wijziging versienr. + datum + acceptatie-impact bijwerken.
- **ISSUE-17 (INFO, gesloten):** `_src/voorwaarden.html` = build-fragment met identieke juridische bodytekst; geen divergentie. Houd één bron of documenteer de build.
- **ISSUE-18 (MEDIUM):** `voorwaarden.html` art. 1 belooft "aparte, kortere voorwaarden op het instrument"; feitelijk staat er een disclaimer + privacynote. Voorstel: óf een compacte sectie "Voorwaarden bedrijfsscan" toevoegen (AI-disclaimer; geen advies; geen aansprakelijkheid voor beslissingen; rapport = beperkt persoonlijk gebruiksrecht, IE bij BF; Nederlands recht; toestemming voor opslag/groepsdeelname), óf art. 1 nuanceren naar "op het instrument staat een disclaimer en een verwijzing naar deze voorwaarden en de privacyverklaring".
- **ISSUE-19 (MEDIUM):** onderbouwing van kwantitatieve claims ("20+ transacties", cases-percentages) — art. 6:194 BW / Reclame Code; bewaar per claim de onderbouwing. Schrijf ISO 27001 / SOC 2 expliciet toe aan de hostingpartij ("onze infrastructuur draait bij Cloudflare, dat ISO 27001 / SOC 2 Type II gecertificeerd is"), niet aan BF. Toets dat "technisch afgedwongen scheiding tussen adviseurs" aantoonbaar is (verwijst naar de cross-path-audits).
- **ISSUE-20 (MEDIUM):** `lead-aandragen.html` — voeg een korte "Voorwaarden voor het aandragen van een overname" toe: aandragen geeft geen recht op vergoeding of op een traject; een eventuele aanbrengvergoeding wordt vooraf en schriftelijk apart afgesproken; bij dubbele aandracht geldt de eerst gedocumenteerde; de aandrager staat ervoor in dat hij de bedrijfsnaam mag delen; geheimhouding van de aangedragen naam.
- **ISSUE-21 (MEDIUM, FASE 2 vervolg):** matching-koper — `worker/19-info-fases.js` nog te lezen: bepaal het aanvaardingsmoment en voeg een aanvaardingsvinkje + matchingvoorwaarde toe (anonimiteit niet gegarandeerd; geen recht op contact of transactie; geheimhouding van de teaser-informatie; misbruik-/gedragsregels).
- **ISSUE-22 (MEDIUM, FASE 2 vervolg):** meekijker — `viewer.html`/`worker/21-meekijker.js` nog te lezen: toon bij eerste inlog de kernpunten (alleen-lezen, één fase, geheimhouding, geen verspreidingsrecht, op elk moment intrekbaar).
- **ISSUE-23 (LOW, direct):** AV art. 4 / BEM — "wettelijke handelsrente" → *"de wettelijke handelsrente (art. 6:119a BW), dan wel de wettelijke rente (art. 6:119 BW) indien Opdrachtgever een consument is"*.
- **ISSUE-24 (LOW, direct):** AV art. 7 / templates — definieer "de leiding": *"het bestuur van {{BEGELEIDER_KORT}}, dan wel leidinggevende functionarissen die de opdracht rechtstreeks hebben uitgevoerd"*.
- **ISSUE-25 (MEDIUM, technisch):** `bgDoc()` — breid de clausule-integriteitsregel uit met een placeholder-check: een document met resterende `[...]`- of `{{...}}`-tekst wordt niet als definitief/ter ondertekening aangeboden.

---

## FASE 3 — LEGAL CONSISTENCY ISSUES (cross-document)

| # | Onderwerp | Documenten | Inconsistentie | Voorstel |
|---|---|---|---|---|
| C-1 | VOK-tekst | `mna/04` `VOK_TEKST` v1.5 (12 art) ↔ `worker/20` `vokTekst` (11 art, "Juli") ↔ `mna_vok` (geen tekst) | Getoond/geaccepteerd ≠ bewijs; geen opslag van de tekst | ISSUE-01: één bron + tekst opslaan |
| C-2 | "Algemene Voorwaarden BF" | `voorwaarden.html` art. 2 verwijst; bestaat alleen ingebed in BEM's | Verwezen document niet publiek kenbaar | ISSUE-02: publiceren + linken |
| C-3 | AV-tekst | `buildAvTekst()` ↔ 3× ingebed in `BF_TEMPLATES` | Al gedrift (bestuurdersvrijwaring-alinea; art. 7 bem_koper) | ISSUE-06: single source |
| C-4 | Aansprakelijkheidsplafond | `voorwaarden.html` (€ 10.000) · adviseur-GV (10× vergoeding, = € 0 bij proef) · AV (geheel uitgesloten) · testvoorwaarden (nihil) | Geen samenloopregel; € 0-cap; geen onderlinge verwijzing | ISSUE-05 + ISSUE-10: cap met bodem/plafond + samenloopbepaling |
| C-5 | Vervaltermijn claims | AV: 12 mnd na ontdekking · `voorwaarden.html`/adviseur-GV: geen · succesfee-nawerking: 24 mnd | Inconsistent; deels afwezig | Uniforme vervalregeling opnemen in `voorwaarden.html` en adviseur-GV (12 mnd na ontdekking, 24 mnd na gebeurtenis) |
| C-6 | Bewaartermijn 14 dagen | `voorwaarden.html` art. 4 · adviseur-GV art. 3 · `privacy.html` §7 · VOK art. 5 | Materieel gelijk, formulering verschilt licht (o.a. "trajectmetadata" vs. "archiefregel: trajectnaam, sector, type, data, partijen") | Eén exacte formulering overnemen in alle vier |
| C-7 | Rente bij consument | AV art. 4 / BEM: "wettelijke handelsrente" onvoorwaardelijk | Onjuist bij consument-opdrachtgever | ISSUE-23 |
| C-8 | Definitie "Transactie(waarde)" | `bem_verk` (beknopt) vs. `bem_koper` (zeer ruim, incl. huur/mgmt/schuld) vs. AV-bijlage | Zelfde begrip, verschillende reikwijdte per document | ISSUE-07: één strakke definitie in de AV, waarnaar de BEM's verwijzen |
| C-9 | Forumkeuze | Overal "Rechtbank Oost-Brabant, exclusief" | Consistent (positief). Aandachtspunt: bij consument-wederpartij is een exclusieve forumkeuze pas geldig ná het ontstaan van het geschil, of moet de consument de keuze voor de wettelijk bevoegde rechter laten (art. 6:236 sub n BW / art. 108 Rv) | Voeg toe: "Is de wederpartij een consument, dan kan deze binnen één maand nadat {{BEGELEIDER_KORT}} zich op deze forumkeuze beroept, kiezen voor de volgens de wet bevoegde rechter." |
| C-10 | Versienummering | v2.2 / v1.8 / v1.9 / v1.1 / v1.5 / v1.2 | Geen samenhangend schema of register | `LEGAL_REVIEW.md` versietabel; overweeg één datum-gebaseerd schema (JJJJ-MM) |
| C-11 | Privacy "geen cookies/trackers" | `privacy.html` §4 ↔ feitelijke Google Fonts-doorgifte | Verklaring onvolledig | ISSUE-11 |
| C-12 | Consumentenbescherming | Alle M&A-documenten | Nergens verwerkt terwijl opdrachtgever consument kan zijn | ISSUE-03 |

---

## Managementsamenvatting

### 5 grootste risico's
1. **VOK — bewijs klopt niet (ISSUE-01).** De adviseur accepteert v1.5 (12 art), maar de "bewijs van acceptatie"-e-mail bevat een oudere v1.x (11 art, zonder 72u-meldplicht en zonder auditrecht); de tekst wordt nergens opgeslagen. Zwakke art. 28 AVG-positie.
2. **AV niet publiek kenbaar (ISSUE-02).** `voorwaarden.html` verwijst naar "Algemene Voorwaarden Bisschops Financing" die niet bestaan als vindbaar document → vernietigbaarheidsrisico + onduidelijkheid welke voorwaarden gelden voor Marcels eigen advieswerk.
3. **Consumentenrecht genegeerd in de M&A-documenten (ISSUE-03).** Bij een privé-verkoper/opvolger zijn de kernbedingen (volledige exoneratie, boetes, onweerlegbaar bewijsvermoeden, 24 mnd nawerking) vernietigbaar (afd. 6.5.3 BW).
4. **Aansprakelijkheid geheel uitgesloten, geen cap (ISSUE-05) + geen samenloopregel + € 0-cap bij gratis proef (ISSUE-10).** Een all-or-nothing exoneratie sneuvelt eerder dan een cap; als hij sneuvelt is er geen plafond.
5. **Wwft / cliëntenonderzoek / belangenconflict (ISSUE-12 + ISSUE-13).** Geen cliëntacceptatiebeleid, geen belangenconflictbepaling; bij een consument aan één zijde kan een tweezijdige fee-aanspraak het loon volledig raken (art. 7:417 lid 4 BW).

### 5 grootste verbeteringen
1. Eén canonieke VOK + AV, met vastlegging van de geaccepteerde tekst (ISSUE-01, ISSUE-06).
2. Gepubliceerde `algemene-voorwaarden.html` gelinkt vóór opdrachtverlening (ISSUE-02).
3. Aansprakelijkheid: van "geheel uitgesloten" naar "beperkt tot fee met plafond € [X]", met bodem/samenloop en verzekeringskoppeling (ISSUE-05, ISSUE-10).
4. Bewijsvermoeden introductie van "onweerlegbaar" naar "weerlegbaar met omgekeerde bewijslast" + haalbare meldprocedure (ISSUE-04).
5. Nieuwe AV-bepalingen: cliëntacceptatie/integriteit, belangenconflict, consument-opdrachtgever (ISSUE-12, ISSUE-13, ISSUE-03).

### Wat direct aangepast is
**Nog niets.** Alle wijzigingen wachten op akkoord (zie hieronder).

### Wat bewust (nog) niet aangepast is
- Alle bevindingen die een **commerciële voorwaarde** verschuiven (fee-grondslag, boetehoogtes, aansprakelijkheidsbedragen, nawerkingstermijnen): ISSUE-03, 05, 07, 09, 10 — deze vereisen een keuze van Marcel over het gewenste beschermings-/commercieel niveau en concrete bedragen.
- De **JURIDISCHE ONZEKERHEID**-punten die specialistische toetsing vragen vóór definitieve tekst: ISSUE-12 (Wwft-kwalificatie), deels ISSUE-13 (reikwijdte 7:417/7:418 op M&A-procesbegeleiding), deels ISSUE-05 (houdbaarheid volledige exoneratie).
- **Structurele backend-refactors** (één VOK/AV-bron, `bgDoc()` dynamische bijlage): ISSUE-01/06 — apart in te plannen, met eigen test + staging + deploy.

### Wat monitoring nodig heeft
- Wwft-toezicht/­jurisprudentie op M&A-bemiddeling (BFT) — ISSUE-12.
- Google Fonts-doorgifte tot self-hosting is doorgevoerd — ISSUE-11.
- Bij aansluiting BOBB / Overname-Experts: gedrags-/tucht-/klachtenregels van die organisatie verwerken in de AV.
- Consumentenrechtspraak over de kwalificatie van de verkopende DGA/aandeelhouder — ISSUE-03.
- Elke wijziging aan `BF_TEMPLATES` / `buildAvTekst` / `VOK_TEKST` / `GEBRUIKSVOORWAARDEN_TEKST`: de dubbele-bron-checks uit REVIEW.md draaien.

---

## Direct aan te passen (na jouw "ja") — geen commerciële wijziging

| Bevinding | Bestand | Aard |
|---|---|---|
| ISSUE-01 (deel 3) | `worker/20-signhost-vok.js` | `vokTekst` verbatim gelijktrekken met `VOK_TEKST` v1.5; "Juli"→"Augustus" |
| ISSUE-08 | `worker/02-config-constanten.js` (`BF_TEMPLATES.loi`) | Redactie-instructie uit de LOI-template halen |
| ISSUE-23 | `worker/…` AV / BEM-teksten | Rente-nuance consument |
| ISSUE-24 | `worker/…` AV / templates | "de leiding" definiëren |
| ISSUE-16 | `legal/LEGAL_REVIEW.md` | Versieregister (al aangemaakt) |
| C-6 | 4 bestanden | Bewaartermijn-formulering woordelijk gelijktrekken |

Alle overige bevindingen: **tekstvoorstel ligt hierboven, wacht op jouw inhoudelijke akkoord** (met name de bedragen bij ISSUE-05/10 en de keuzes bij ISSUE-03/07/09).
