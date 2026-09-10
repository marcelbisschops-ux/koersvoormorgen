# MASTER-SPEC — Koers voor Morgen Transaction OS

**Datum:** 2026-09-10 · **Versie:** 3 (GO ontvangen; jurist akkoord; architectuurreview verwerkt)
**Status:** architecture/design decision document. **Nog geen bouwopdracht.**
**Besluit:** Marcel gaf **GO** op de architectuur + fasering (2026-09-10) en meldde **jurist akkoord**
op `ADR-AVG-AUDIT-MANIFEST.md`. De architectuurreview (`ARCHITECTUURREVIEW-TRANSACTION-OS.md`) is
afgerond en verwerkt: één tegenstrijdigheid opgelost, twee faseringsgaten gedicht, drie open
ontwerpkeuzes aangescherpt. Volgende stap: FASE B-ontwerp (de MoU-slice concreet uittekenen).

**Herkomst:** consolideert Marcels master-spec, twee reviewrondes, sectie 0 van
`ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`, en de eerdere specs voor MoU en de specialistenpool.

**Deelt in met:**
[`ADR-TRANSACTION-BLOCK-ARCHITECTURE.md`](ADR-TRANSACTION-BLOCK-ARCHITECTURE.md) ·
[`ADR-AVG-AUDIT-MANIFEST.md`](ADR-AVG-AUDIT-MANIFEST.md) ·
[`SPEC-MOU-FIRST-VERTICAL-SLICE.md`](SPEC-MOU-FIRST-VERTICAL-SLICE.md) ·
[`SPEC-BLOCK-FRAMEWORK-V1.md`](SPEC-BLOCK-FRAMEWORK-V1.md) ·
[`SPEC-DATA-LIFECYCLE.md`](SPEC-DATA-LIFECYCLE.md) ·
[`TESTSTRATEGIE-TRANSACTION-OS.md`](TESTSTRATEGIE-TRANSACTION-OS.md) ·
[`ARCHITECTUURREVIEW-TRANSACTION-OS.md`](ARCHITECTUURREVIEW-TRANSACTION-OS.md)

---

## 0. Kernprincipe

**REGIE, GEEN AUTORITEIT.** Het platform organiseert transactionele gegevens, bronnen, aannames,
berekeningen, documenten, specialistische reviews en besluitvorming. Het neemt zelf geen juridische,
fiscale of formele waarderingsautoriteit over. Technisch afgedwongen, niet alleen in disclaimers.
Volledige uitwerking: sectie 0 van `ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`.

---

## 1a. CORRECTIE — geen professionele tekstbibliotheek (Marcel, 2026-09-10)

Een eerdere versie van deze spec ging uit van een **clausulebibliotheek met vooraf juridisch
getoetste standaardteksten**. Dat is bewust geschrapt. Het maakt Koers voor Morgen zwaar, duur en
aansprakelijkheidsgevoelig, en het botst met "regie, geen autoriteit".

**De vaste regel:**

> **GEEN JURIDISCHE, FISCALE OF WAARDERINGSTEKSTBIBLIOTHEEK.**
> Koers voor Morgen onderhoudt geen inhoudelijke professionele kennisbank met standaardclausules of
> fiscaal advies. Het platform levert uitsluitend de transactionele structuur, data, workflow,
> provenance, versiebeheer en reviewmechaniek.
> AI mag een conceptvoorstel doen. De bevoegde specialist kan dit volledig wijzigen, vervangen,
> aanvullen of verwijderen. De door de specialist gewijzigde versie wordt als **dossier-specifieke
> professionele input** opgeslagen, niet als herbruikbare bibliotheek-entry.
> Iedere inhoudelijke wijziging ná specialistische goedkeuring maakt die goedkeuring ongeldig en
> triggert een nieuwe review — óók als de adviseur wijzigt.
> De specialist is verantwoordelijk voor zijn professionele inhoud; Koers voor Morgen faciliteert de
> workflow en registreert wie wat wanneer heeft beoordeeld.

**Wat WEL blijft — het componentenmenu (Hans' voorstel):** de adviseur en de specialist stellen een
document samen uit een **menu van componenten** (earn-out, exclusiviteit, change of control,
vermogensinstandhoudingsverklaring, garanties, geheimhouding, prijsmechanisme, …), kiezen de
volgorde, en zien een **volledigheidscheck** die aangeeft wat een compleet document nog mist en
waarom dat leverage kost. Dat is de `DocumentComposer` op het Block Framework en het is een
kernfeature.

**Wat vervalt** is uitsluitend een door Koers voor Morgen onderhouden, gecureerde en versiebeheerde
bibliotheek van vooraf-getoetste clausule*teksten* waar het platform juridisch achter staat.

**AI-voorstellen voor juridisch en fiscaal blijven — precies zoals nu.** Het "lege werkveld" is de
opslagvorm, geen stap terug. AI vult het met een **substantieel concept** op basis van de
dealgegevens en de context (een concept-exclusiviteitsbepaling, een concept-geheimhoudingsclausule,
een fiscale aandachtsnotitie), gemarkeerd als `AI_INFERENCE` / concept, geen advies. Optioneel
geseed door een door de adviseur geüpload sjabloon, met het label "eerdere sjabloontekst, niet
getoetst". De specialistlaag (jurist/fiscalist) komt daar **bovenop**, niet in plaats van.

**Gevolg voor de architectuur:** "Block Library" heet nu **Transaction Block Framework**. Een
component in het menu = een **leeg gestructureerd werkveld** (dataslots + één vrij tekstveld +
provenance + reviewstate). AI zet er een concept in; de specialist maakt de professionele tekst.
Zie `SPEC-BLOCK-FRAMEWORK-V1.md`.

### De drie waarheden

Het platform verbindt drie dingen en houdt ze uit elkaar:

1. **Transactionele waarheid** — wat partijen/adviseur als dealgegevens hebben ingevoerd (met
   provenance-type per waarde).
2. **Professionele beoordeling** — wat jurist, fiscalist en waarderingsspecialist er professioneel
   van vinden, binnen hun eigen rol en verantwoordelijkheid.
3. **Documenttekst** — wat uiteindelijk daadwerkelijk in het document staat.

Koers voor Morgen verbindt de drie, maar claimt **nooit** dat de derde professioneel juist is.

### Divergentiedetectie

Wijkt de documenttekst af van de transactionele data, of van een ander document in hetzelfde
dossier (bijv. exclusiviteit 90 dagen in de dealdata en de LoI, 120 in de door de jurist bewerkte
MoU), dan waarschuwt het platform de adviseur: "verschil tussen de transactionele gegevens en de
juridisch aangepaste documenttekst". De specialist functioneert dus als **professionele editor**,
niet alleen als meekijker; het platform bewaakt de consistentie.

---

## 2. OPEN ARCHITECTURE DECISIONS

`DECIDED` = vastgelegd. `OPEN` = ontwerpkeuze te maken. `REQUIRES LEGAL VALIDATION` = niet
implementeren vóór jurist-akkoord. `REQUIRES PRODUCT DECISION` = Marcel beslist.
`REQUIRES TECHNICAL SPIKE` = eerst een korte technische verkenning.

| # | Beslissing | Status |
|---|---|---|
| D-01 | Doelarchitectuur: één transaction data model → één evidence/provenance-laag → **één Transaction Block Framework** → één review engine → één policy engine → één document composer → veel documenttypen | **DECIDED** |
| D-02 | REGIE, GEEN AUTORITEIT als afgedwongen invariant (sectie 0) | **DECIDED** |
| D-03 | Geen big-bang. Elke architectuurlaag wordt gebouwd voor zover een concrete verticale slice die nodig heeft | **DECIDED** |
| D-04 | De **MoU** is de eerste verticale slice die de architectuur bewijst | **DECIDED** |
| D-05 | **Componentenmenu blijft** (Hans' voorstel): de `DocumentComposer` laat adviseur/specialist componenten kiezen + ordenen + een volledigheidscheck zien. Wat vervalt is de vooraf-getoetste-*tekst*-bibliotheek. Blocks = lege gestructureerde werkvelden. Fase 1: ~23 block-*definities* (welke componenten/werkvelden), geen tekstinhoud | **DECIDED** |
| D-06 | ~~Juridische blocktekst als aparte `LEGAL CONTENT LIBRARY`-werkstroom~~ **VERVALLEN** door §1a. Er is geen standaardtekst-werkstroom; de specialist levert de tekst per dossier | **DECIDED** |
| D-07 | AI blijft substantiële conceptvoorstellen doen voor juridische én fiscale componenten, zoals nu in de jura-generatoren (concept, `AI_INFERENCE`, geen advies; optioneel geseed door een adviseur-sjabloon). Zodra de specialist óf de adviseur de tekst wijzigt, is AI niet meer eigenaar; de wijzigende partij wordt eigenaar/reviewer van die versie. AI "verbetert" nooit ongevraagd bestaande dossiertekst | **DECIDED** |
| D-18 | **De volledige rekenkern blijft ongewijzigd bestaan.** `mna/03-rekenkern-waardering.js` + alle backend-waarderingslogica + alle modellen: EBITDA/EBIT-multiple, DCF, intrinsieke waarde, liquidatiewaarde, goodwill via overwinst, synergie-analyse, scenario-analyse, earn-out, vendor loan, aandelenruil, bod-vergelijker (Deal Value Matrix), opbrengst-brug, onderhandelruimte, BATNA. De Transaction OS **voegt toe** (provenance op elke uitkomst, een reviewgate voor de waarderingsspecialist, de opbouwsheet) en raakt **geen formule** — werkregel 13 (GOUDEN STANDAARD) blijft heilig | **DECIDED** |
| D-08 | Policy engine wordt de centrale autorisatielaag; migratie alleen met behoud van bestaand gedrag, geverifieerd door een uitgebreide `tests/policy-equivalentie.mjs` vóór verwijderen van client-side checks | **DECIDED** |
| D-09 | Negatieve roltests voor alle kritieke rollen, in CI | **DECIDED** |
| D-10 | `BlockReview` geldt voor `block_id + block_version + dossier`. Iedere inhoudelijke wijziging na goedkeuring → oude review `SUPERSEDED`/`REVOKED` + nieuwe review nodig, ongeacht wie wijzigt | **DECIDED** |
| D-11 | Specialistenpool is een *provider van reviewers* binnen de algemene review-engine, niet een eigen reviewarchitectuur; nog niet volledig bouwen | **DECIDED** |
| D-12 | Bestaande generatoren (NDA/LoI/BEM/dealvoorstel/teaser/memorandum) blijven werken tijdens migratie; geen nieuwe documentlogica erin | **DECIDED** |
| D-13 | Naam overal: **Koers voor Morgen** (niet "van") | **DECIDED** |
| D-14 | Gate-integriteit: elke uitgangsroute loopt door dezelfde policy; een hard gate mag via geen enkele route te omzeilen zijn. Routes: preview, download, API, e-mail, background job, oude generator, ZIP-export, **plus foutresponses, logs (`wrangler tail`) en de AI-context naar Anthropic** — geen documentinhoud in errors/logs, en geen tekst van een component onder specialist-hold als AI-context zonder expliciete instemming | **DECIDED** (uitwerking: `S-04`) |
| D-15 | SPEC-STAP-1 deel 1A (reliance-voettekst op de bestaande generatoren) als losse, veilige levering — nu, of in de slice | **REQUIRES PRODUCT DECISION** |
| D-16 | SPEC-STAP-1 deel 1B (MoU als losse template + `bgDoc('mou')`) **vervalt**, gaat op in de verticale slice | **DECIDED** |
| D-17 | **Divergentiedetectie** (§1a): het platform signaleert verschil tussen transactionele data, professionele input en documenttekst — binnen één document en tussen documenten van hetzelfde dossier | **DECIDED** (mechaniek: `OPEN` O-04) |
| L-01 | AVG vs. reproduceerbaarheid: `AUDIT MANIFEST ≠ CONTENT ARCHIVE`. Manifest (geen persoonsgegevens) mogelijk langdurig; inhoud/facts/evidence/specialisttekst volgen de bestaande 14/365-dagenretentie | **REQUIRES LEGAL VALIDATION** — zie `ADR-AVG-AUDIT-MANIFEST.md` |
| L-02 | Welke velden precies in het manifest mogen (echt geen herleidbare persoonsgegevens?) | **REQUIRES LEGAL VALIDATION** |
| L-03 | Reliance/disclaimer met eigen versiebeheer + hash; een export zonder correcte reliance is geen geldige export | **DECIDED** technisch; **REQUIRES LEGAL VALIDATION** op de tekst per versie |
| L-04 | Aansprakelijkheid: de specialist is verantwoordelijk voor zijn professionele inhoud; het platform faciliteert en registreert. Vastleggen in VOK/GV en in de specialistovereenkomst | **REQUIRES LEGAL VALIDATION** |
| P-01 | Exacte fase-1 block-*definitielijst* (welke werkvelden, per documentprofiel), op basis van de bestaande MoU/LoI-use cases van Marcel/Hans | **REQUIRES PRODUCT DECISION** — voorstel in `SPEC-BLOCK-FRAMEWORK-V1.md` |
| P-02 | Welk documentprofiel na de MoU als eerste: LoI, of NDA-migratie | **REQUIRES PRODUCT DECISION** |
| P-03 | Specialistenpool: fee-model, timing van fase E | **REQUIRES PRODUCT DECISION** |
| S-01 | D1-performance van diepe versionering + append-only audit + snapshots per export; `initDB` was al traag | **REQUIRES TECHNICAL SPIKE** — `SPEC-DATA-LIFECYCLE.md` §Performance |
| S-02 | Cross-case conflict-check zonder een algemene dossierzoekfunctie te bouwen | **REQUIRES TECHNICAL SPIKE** — aparte mini-ADR |
| S-03 | Migratiepad: hoe extraheer je herbruikbare **structuur** (werkvelden) uit de bestaande generatoren zonder productie te breken. NB: geen clausuletekst extraheren als bibliotheek | **REQUIRES TECHNICAL SPIKE** |
| S-04 | Gate-integriteit over alle uitgangsroutes (D-14) | **REQUIRES TECHNICAL SPIKE** |
| O-01 | Mag een block-*definitie* worden verwijderd terwijl een dossier/review ernaar verwijst? Voorstel: nee — append-only, alleen `status=RETIRED` | **OPEN** |
| O-02 | Waar leven snapshots/manifest fysiek: D1 of R2 | **OPEN** |
| O-03 | Concreet mechanisme om `AI_INFERENCE` te promoveren naar `USER_FACT`/`SPECIALIST_ASSESSMENT` (verplichte bevestigingsstap) | **OPEN** |
| O-04 | Divergentiedetectie-mechaniek (D-17). **Aanbeveling uit de architectuurreview:** binding numerieke/datum-termen leven **uitsluitend in gestructureerde dataslots** (single source); de vrije tekst toont ze via een token. Overschrijft de specialist de tokenzin met een letterlijk getal, dan is dat een expliciete, gekoppelde **override** (gemarkeerde, review-triggerende handeling), niet iets wat het systeem uit proza raadt. Vrije proza zonder binding-term wordt niet vergeleken. Check is **event-driven** (bij wijziging aan een gekoppeld dataslot), niet bij elke render | **OPEN** (aanbeveling ligt er) |
| O-05 | `DocumentProfile`-versionering: zelfde append-only versiemodel als een component-definitie; een document is gepind op een profielversie; een nieuwer profiel markeert bestaande documenten als "profiel v_n beschikbaar" zonder te forceren | **OPEN** (voorstel ligt er) |

---

## 3. Doelarchitectuur

```
                         KOERS VOOR MORGEN
                                  │
                         TRANSACTION / CASE
                                  │
             ┌────────────────────┼────────────────────┐
         FACTS & DATA          EVIDENCE             TIMELINE
             └────────────────────┼────────────────────┘
                                  │
              TRANSACTION BLOCK FRAMEWORK  (lege werkvelden, per dossier ingevuld)
                                  │
                    AI-CONCEPT  →  SPECIALIST-EDITOR  →  REVIEW / APPROVAL
                                  │            (per block_id@version@dossier)
                                  │
                         POLICY ENGINE   (canGenerate / canExport / …)
                                  │
                         DOCUMENT COMPOSER
                                  │
        ┌───────────┬─────────────┼─────────────┬────────────┐
       NDA         LoI           MoU          Teaser    Memorandum
        └───────────┴─────────────┼─────────────┴────────────┘
                                  │
        DIVERGENTIEDETECTIE  (dealdata  ⇆  professionele input  ⇆  documenttekst)
                                  │
                    RELIANCE / EXPORT  (disclaimer @ version + hash)
                                  │
                       AUDIT MANIFEST + SNAPSHOT
```

**De belangrijkste regel:** bouw geen documentgeneratoren en geen kennisbank. Bouw een transactionele
**werkveld- en review-engine** waarin adviseur + jurist + fiscalist + waarderingsspecialist
samenwerken; documenten worden daaruit samengesteld.

---

## 4. Workflow

```
ADVISEUR
   │  dealgegevens + gewenste transactie
   ▼
AI maakt een concept per werkveld
   ▼
JURIST        ziet alleen zijn domein: bewerken / vervangen / clausule toevoegen /
   │          verwijderen / commentaar / vraag stellen / akkoord / terugsturen
   ▼
FISCALIST     ziet alleen de fiscale werkvelden en -data: aannames aanpassen /
   │          opmerkingen / tekst aanpassen / ontbrekende feiten opvragen /
   │          alternatief scenario / akkoord
   ▼
WAARDERINGSSPECIALIST (Register Valuator)
   │          ziet omzet/EBITDA/add-backs/schulden/multiples/aannames:
   │          cijfers corrigeren / add-backs wijzigen / aannames wijzigen /
   │          methodiek kiezen / toelichting / aftekenen
   ▼
EINDVERSIE
```

Iedere specialist ziet alleen zijn eigen domein, tenzij de begeleider expliciet meer toegang geeft.
Zodra een specialist iets wijzigt, wordt hij eigenaar/reviewer van díé versie en is AI dat niet meer.
Wijzigt de adviseur daarna een gekoppeld veld, dan **vervalt de betreffende specialistgoedkeuring
automatisch** (D-10) en volgt een nieuwe review.

---

## 5. Provenance / informatietypen

Iedere informatie-eenheid krijgt precies één type: `SOURCE_FACT` · `USER_FACT` · `AI_INFERENCE` ·
`CALCULATION` · `ASSUMPTION` · `SPECIALIST_ASSESSMENT` · `UNVERIFIED`.

- Geen materiële claim zonder herleidbare grondslag, tenzij expliciet `ASSUMPTION` of `AI_INFERENCE`.
- **AI mag nooit stilzwijgend `AI_INFERENCE` → `SOURCE_FACT` maken** (`O-03`).
- Een door de specialist bewerkte of vervangen tekst krijgt type `SPECIALIST_ASSESSMENT` met
  wie/wanneer/hoedanigheid.

---

## 6. Wat we nu bouwen — en wat bewust niet

### Nu (fase A + B, de MoU-slice)

- Transaction/Case datamodel (voor zover de MoU het raakt).
- Evidence/provenance-model (typen + velden + promotie-`OPEN`).
- **Transaction Block Framework**: block-*definities* (welke werkvelden) + `BlockVersion` append-only
  + per-dossier block-instances met een vrij tekstveld.
- AI-concept-generatie per werkveld (strikt: voorstel, geen autoriteit).
- Specialist-editor-workflow + `BlockReview` per `block_id@version@dossier` + goedkeuring-invalidatie.
- Divergentiedetectie tussen dealdata, professionele input en documenttekst (mechaniek `O-04`).
- Policy engine (`canGenerate / canExport / requiredReviews / requiredDisclaimer / canAccess /
  canPublish`), gemigreerd onder equivalentietests.
- `DocumentComposer` + één `DocumentProfile` (MOU).
- Reliance/disclaimer met versie + hash; export-gate.
- Audit manifest + snapshot (manifest-only, `ADR-AVG-AUDIT-MANIFEST.md`).
- ~23 block-definities (`SPEC-BLOCK-FRAMEWORK-V1.md`).
- De hele teststrategie (`TESTSTRATEGIE-TRANSACTION-OS.md`).

### Bewust nog niet

- De volledige ~120-block-definitiecatalogus.
- LoI / NDA / dealvoorstel / teaser / memorandum als composer-profielen (fase D).
- De specialistenpool met `pool_*`-tabellen / fee-flow / conflict-check / matching / marilyn-tab
  (fase E).
- De cross-case conflict-check (eerst mini-ADR, `S-02`).
- Readiness-dashboard, transaction timeline, document comparison als aparte UI (fase C/D).

### Blijft ongemoeid tijdens de migratie

- De bestaande NDA/LoI/BEM/exclusiviteit/dealvoorstel/teaser/verkoopmemorandum-generatoren blijven
  productief. Geen nieuwe documentlogica erin.
- **De volledige rekenkern en alle waarderingsmodellen blijven onaangeroerd** (D-18). De Transaction
  OS bouwt eromheen: uitkomsten krijgen een `CALCULATION`-provenance (welke figuur, welk model, welke
  parameters) en voeden de economics-componenten; de waarderingsspecialist reviewt de *inputs*
  (add-backs, multiple, aannames) en tekent de *uitkomst* af. De formules zelf veranderen niet.
- DD-fases (sectorprofielen), VOK/GV/AV, agenda, sourcing, Postvak, MFA, bewaartermijn-feature —
  ongewijzigd.
- `worker/00-policy.js` blijft de bron; de nieuwe policy engine breidt uit, vervangt niet in één keer.

### Moet migreren

- Client-side security-/governance-checks (bijv. `modules.contracten` in `mna/04`) → naar de policy
  engine, onder equivalentietests.
- Herbruikbare **structuur** (welke werkvelden een NDA/LoI/MoU heeft) uit de bestaande generatoren →
  naar de block-definities. **Geen clausuletekst als bibliotheek.**

### Juridische content die nog moet worden opgesteld

- **Geen standaardclausules meer.** Wel: reliance/disclaimer-tekst per versie (`L-03`), de
  MoU-`DocumentProfile`-template (het kader/kopjes, niet de inhoudelijke bepalingen), en de
  aansprakelijkheids-/verantwoordelijkheidsbepalingen voor de specialistrol in VOK/GV en de
  specialistovereenkomst (`L-04`).

### Beslissingen die eerst moeten worden genomen

`L-01`–`L-04` (jurist) · `P-01`–`P-03` (Marcel) · `D-15` (Marcel) · `S-01`–`S-04` (spikes) ·
`O-01`–`O-05` (ontwerpkeuzes in de review).

---

## 7. Architectuur-reviewvragen — te beantwoorden vóór de eerste code-review

| # | Vraag | Waar geadresseerd |
|---|---|---|
| RV-1 | Kan een block-definitie worden verwijderd terwijl een dossier/review ernaar verwijst? | `SPEC-DATA-LIFECYCLE.md` (`O-01`: nee, alleen `RETIRED`) |
| RV-2 | Wat gebeurt er met een review wanneer de tekst wordt gewijzigd — door de specialist óf door de adviseur? | `D-10` + `SPEC-DATA-LIFECYCLE.md` (`SUPERSEDED`, nieuwe review vereist, ongeacht wie wijzigt) |
| RV-3 | Wat blijft er na de AVG-purge precies in de auditlaag staan? | `ADR-AVG-AUDIT-MANIFEST.md` |
| RV-4 | Kan iemand via een andere route (preview / download / API / e-mail / background job / oude generator) alsnog een hard gate omzeilen? | `D-14` + `S-04` + `TESTSTRATEGIE-TRANSACTION-OS.md` §Gate-integriteit |
| RV-5 | Kan het platform ergens tóch documenttekst als "professioneel juist" presenteren, of een specialistgoedkeuring simuleren? | §1a + `TESTSTRATEGIE-TRANSACTION-OS.md` §Autoriteitsgrens |

RV-4 en RV-5 zijn de belangrijkste. RV-4: één egress-policy. RV-5: het platform toont documenttekst
altijd met zijn provenance-/reviewstatus, nooit als geverifieerd feit; een goedkeuring bestaat alleen
als een echte reviewer die met naam + hoedanigheid + datum + versie heeft afgegeven.

---

## 8. Uitvoeringsvolgorde

### FASE A — DESIGN (deze documenten; geen code)

1. Data model · 2. Block-framework-model · 3. Provenance model · 4. Review model · 5. Policy model ·
6. Permission model · 7. Data lifecycle · 8. ADR's · 9. AVG/legal validation (`L-01`–`L-04`).

**Status FASE A:** GO gegeven, jurist akkoord op `L-01`–`L-04`, de vijf reviewvragen beantwoord in
`ARCHITECTUURREVIEW-TRANSACTION-OS.md`. **Poort naar code:** het FASE B-ontwerp (datamodel-DDL,
component-definitieschema, policy-engine-interface, composer-UX) + een korte `/code-review`-pass
daarop. Geen code vóór dat FASE B-ontwerp er ligt.

### FASE B — EERSTE VERTICALE SLICE (MoU)

10. MoU-block-definities · 11. Block Composer · 12. MoU `DocumentProfile` · 13. AI-concept per veld ·
14. Specialist-editor + `BlockReview` + invalidatie · 15. Divergentiedetectie · 16. Policy gates ·
17. Reliance injection · 18. Audit manifest · 19. Export.

### FASE C — HARDENING

20. Equivalentietests · 21. Negatieve roltests · 22. Versioning-tests · 23. Invalidatie-/
divergentietests · 24. Retention/purge-tests · 25. Performance-tests · 26. Gate-integriteitstests
(RV-4) · 27. Autoriteitsgrens-tests (RV-5).

### FASE D — EXPANSION (documentprofielen)

28. LoI · 29. NDA-migratie · 30. Dealvoorstel · 31. Teaser · 32. Memorandum. Elk een nieuw
`DocumentProfile`, geen nieuwe generator.

### FASE D-bis — VERDIEPING INHOUD (Hans' oorspronkelijke vragen, onder sectie 0)

33. **Juridische DD-checklist** — DD-fase VI wordt een gestructureerde checklist (organogram,
    aandeelhoudersovereenkomst, change-of-control-scan op materiële contracten, vergunning-
    overdraagbaarheid, lopende/dreigende procedures, compliance). Bevindingen werken door naar de
    SPA-garantie-componenten als voorstel. AI maakt concepten; jurist tekent af.
34. **Fiscale DD + structureringsmodule** — fiscale eenheid, deelnemingsvrijstelling, verrekenbare
    verliezen, overdrachtsbelasting, transfer pricing, DGA-loon; asset deal vs. share deal, earn-out-
    behandeling, BOR bij opvolging. AI maakt concepten; fiscalist tekent af. Werkt door naar de
    netto-opbrengst-regel in het dealvoorstel.
35. **Waarderings-opbouwsheet** — genormaliseerde EBITDA-brug (add-backs regel voor regel), multiple-
    onderbouwing, equity-value-brug, kruischecks. **Leest de bestaande, onaangeroerde rekenkern**
    (`D-18`), voegt provenance + een waarderingsspecialist-reviewgate toe. Formules ongewijzigd.

### FASE E — SPECIALISTENPOOL

36. Reviewer-interface veralgemenen · 37. Assignment-abstractie · 38. Specialist profiles ·
39. Conflict-check (na mini-ADR `S-02`) · 40. Scoped access · 41. Fees · 42. Pool-UI (marilyn).

---

## 9. ADR — samenvatting

Volledige tekst: `ADR-TRANSACTION-BLOCK-ARCHITECTURE.md`.

- **Beslissing:** Transaction Block Framework + Composer — **structuur, data, workflow, provenance,
  versiebeheer en reviewmechaniek; géén professionele kennisbank**.
- **Waarom:** voorkomt duplicatie van documentlogica; maakt provenance, review en versioning
  centraal; maakt specialistreview schaalbaar; houdt het platform licht en buiten de
  professionele-aansprakelijkheidssfeer; nieuwe documenttypen worden configuratie i.p.v. code.
- **Alternatieven:** afzonderlijke documentgeneratoren · één grote AI-prompt · template-only model ·
  ~~clausulebibliotheek met getoetste standaardteksten~~ (geschrapt, §1a).
- **Consequenties positief:** hergebruik van structuur, consistente governance, schaalbare review,
  auditability, licht platform, geen doorlopend juridisch tekstonderhoud.
- **Consequenties negatief:** initieel complexer datamodel; migratie-inspanning; de policy engine
  wordt kritieke infrastructuur; zonder specialist blijft een document juridisch "concept" (dat is
  bedoeld).

---

## 10. Beslissing gevraagd

Aan Marcel + jurist: **GO / NO-GO / CHANGES REQUIRED** op deze master-spec en de zes deeldocumenten,
met per open beslissing (`L-*`, `P-*`, `S-*`, `O-*`) een richting. Geen code vóór die beslissing.
