# MASTER-SPEC — Koers voor Morgen Transaction OS

**Datum:** 2026-09-10 · **Status:** architecture/design decision document. **Nog geen bouwopdracht.**
**Beslissing gevraagd:** GO / NO-GO / CHANGES REQUIRED, samen met de jurist.

**Herkomst:** consolideert Marcels master-spec, de reviewreactie, sectie 0 van
`ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`, en de eerdere specs voor MoU en de specialistenpool.

**Deelt in met:**
[`ADR-TRANSACTION-BLOCK-ARCHITECTURE.md`](ADR-TRANSACTION-BLOCK-ARCHITECTURE.md) ·
[`ADR-AVG-AUDIT-MANIFEST.md`](ADR-AVG-AUDIT-MANIFEST.md) ·
[`SPEC-MOU-FIRST-VERTICAL-SLICE.md`](SPEC-MOU-FIRST-VERTICAL-SLICE.md) ·
[`SPEC-BLOCK-LIBRARY-V1.md`](SPEC-BLOCK-LIBRARY-V1.md) ·
[`SPEC-DATA-LIFECYCLE.md`](SPEC-DATA-LIFECYCLE.md) ·
[`TESTSTRATEGIE-TRANSACTION-OS.md`](TESTSTRATEGIE-TRANSACTION-OS.md)

---

## 0. Kernprincipe

**REGIE, GEEN AUTORITEIT.** Het platform organiseert informatie, bronnen, aannames, berekeningen,
documenten, specialistische reviews en besluitvorming. Het neemt zelf geen juridische, fiscale of
formele waarderingsautoriteit over. Dit principe wordt technisch in de architectuur afgedwongen, niet
alleen in disclaimers. De volledige uitwerking staat in sectie 0 van
`ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`; deze master-spec is de technische vertaling ervan.

---

## 1. OPEN ARCHITECTURE DECISIONS

Elk punt is getagd. `DECIDED` = vastgelegd, mag als uitgangspunt. `OPEN` = ontwerpkeuze te maken.
`REQUIRES LEGAL VALIDATION` = niet implementeren vóór jurist-akkoord. `REQUIRES PRODUCT DECISION` =
Marcel beslist. `REQUIRES TECHNICAL SPIKE` = eerst een korte technische verkenning.

| # | Beslissing | Status |
|---|---|---|
| D-01 | Doelarchitectuur: één transaction data model → één evidence/provenance-laag → één block library → één review engine → één policy engine → één document composer → veel documenttypen | **DECIDED** |
| D-02 | REGIE, GEEN AUTORITEIT als afgedwongen invariant (sectie 0) | **DECIDED** |
| D-03 | Geen big-bang. Elke architectuurlaag wordt gebouwd voor zover een concrete verticale slice die nodig heeft | **DECIDED** |
| D-04 | De **MoU** is de eerste verticale slice die de architectuur bewijst | **DECIDED** |
| D-05 | Fase 1 blockbibliotheek: max ~20–25 blocks; de rest is toekomstcatalogus | **DECIDED** (exacte lijst: zie D-18) |
| D-06 | Juridische blocktekst is een aparte werkstroom (`LEGAL CONTENT LIBRARY`) met eigen planning/budget/acceptance, los van de softwarebouw | **DECIDED** |
| D-07 | AI mag jurist-goedgekeurde blocktekst **nooit** herschrijven — harde invariant, technisch + testsuite | **DECIDED** |
| D-08 | Policy engine wordt de centrale autorisatielaag; migratie alleen met behoud van bestaand gedrag, geverifieerd door een uitgebreide `tests/policy-equivalentie.mjs` vóór verwijderen van client-side checks | **DECIDED** |
| D-09 | Negatieve roltests voor alle kritieke rollen, in CI | **DECIDED** |
| D-10 | `BlockReview` geldt voor `block_id + block_version`; nieuwe versie → oude review `SUPERSEDED` + nieuwe review nodig | **DECIDED** |
| D-11 | Specialistenpool is een *provider van reviewers* binnen de algemene review-engine, niet een eigen reviewarchitectuur; nog niet volledig bouwen | **DECIDED** |
| D-12 | Bestaande generatoren (NDA/LoI/BEM/dealvoorstel/teaser/memorandum) blijven werken tijdens migratie; geen nieuwe documentlogica meer erin | **DECIDED** |
| D-13 | Naam overal: **Koers voor Morgen** (niet "van") — normaliseren in document/DB/UI/code/prompts/templates/comments/tests/gegenereerde documenten | **DECIDED** |
| D-14 | Gate-integriteit: elke uitgangsroute (preview, download, API, e-mail, background job, oude generator, export) loopt door dezelfde policy; een hard gate mag via geen enkele route te omzeilen zijn | **DECIDED** (uitwerking: `REQUIRES TECHNICAL SPIKE`, zie S-04) |
| D-15 | SPEC-STAP-1 deel 1A (reliance-voettekst op de bestaande generatoren) blijft een losse, veilige levering die nu al kan en het laatste FASE6-puntje sluit | **REQUIRES PRODUCT DECISION** (nu los leveren, of meenemen in de slice) |
| D-16 | SPEC-STAP-1 deel 1B (MoU als losse template + `bgDoc('mou')`) **vervalt** en gaat op in de verticale slice | **DECIDED** |
| L-01 | AVG vs. reproduceerbaarheid: `AUDIT MANIFEST ≠ CONTENT ARCHIVE`. Manifest (geen persoonsgegevens) mogelijk langdurig bewaren; inhoud/facts/evidence volgen de bestaande 14/365-dagenretentie | **REQUIRES LEGAL VALIDATION** — zie `ADR-AVG-AUDIT-MANIFEST.md` |
| L-02 | Welke velden precies in het manifest mogen (bevatten ze echt geen herleidbare persoonsgegevens?) | **REQUIRES LEGAL VALIDATION** |
| L-03 | Reliance/disclaimer met eigen versiebeheer + hash; een export zonder correcte reliance is geen geldige export | **DECIDED** technisch; **REQUIRES LEGAL VALIDATION** op de tekst per versie |
| P-01 | Exacte fase-1 blocklijst, op basis van de bestaande MoU/LoI-use cases van Marcel/Hans | **REQUIRES PRODUCT DECISION** — voorstel in `SPEC-BLOCK-LIBRARY-V1.md` |
| P-02 | Welk documentprofiel na de MoU als eerste: LoI, of NDA-migratie | **REQUIRES PRODUCT DECISION** |
| P-03 | Specialistenpool: fee-model (honorarium + platformmarge), timing van fase E | **REQUIRES PRODUCT DECISION** |
| S-01 | D1-performance van diepe versionering + append-only audit + snapshots per export; `initDB` was al traag (~180 statements koude start) | **REQUIRES TECHNICAL SPIKE** — zie `SPEC-DATA-LIFECYCLE.md` §Performance |
| S-02 | Cross-case conflict-check zonder een algemene dossierzoekfunctie te bouwen | **REQUIRES TECHNICAL SPIKE** — aparte mini-ADR vóór implementatie |
| S-03 | Migratiepad: hoe extraheer je herbruikbare blocks uit de bestaande generatoren zonder productie te breken | **REQUIRES TECHNICAL SPIKE** |
| S-04 | Gate-integriteit over alle uitgangsroutes (D-14) | **REQUIRES TECHNICAL SPIKE** |
| O-01 | Mag een block verwijderd worden terwijl een document/review ernaar verwijst? Voorstel: nee — blocks zijn append-only, alleen `status=RETIRED` | **OPEN** — zie `SPEC-DATA-LIFECYCLE.md` |
| O-02 | Waar leven snapshots/manifest fysiek: D1 of R2 | **OPEN** |
| O-03 | Concreet mechanisme om `AI_INFERENCE` te promoveren naar `USER_FACT`/`SPECIALIST_ASSESSMENT` (verplichte bevestigingsstap) | **OPEN** — zie sectie 3 |

---

## 2. Doelarchitectuur

```
                         KOERS VOOR MORGEN
                                  │
                         TRANSACTION / CASE
                                  │
             ┌────────────────────┼────────────────────┐
         FACTS & DATA          EVIDENCE             TIMELINE
             └────────────────────┼────────────────────┘
                                  │
                         TRANSACTION BLOCKS  (block_id @ version)
                                  │
             ┌────────────────────┼────────────────────┐
          LEGAL                FINANCIAL              TAX
             └────────────────────┼────────────────────┘
                                  │
                    REVIEW / APPROVAL  (BlockReview per versie)
                                  │
                         POLICY ENGINE   (canGenerate / canExport / …)
                                  │
                         DOCUMENT COMPOSER
                                  │
        ┌───────────┬─────────────┼─────────────┬────────────┐
       NDA         LoI           MoU          Teaser    Memorandum
        └───────────┴─────────────┼─────────────┴────────────┘
                                  │
                    RELIANCE / EXPORT  (disclaimer @ version + hash)
                                  │
                       AUDIT MANIFEST + SNAPSHOT
```

**De belangrijkste regel:** bouw geen documentgeneratoren, bouw een transactionele block- en
review-engine waar documenten uit worden samengesteld. LoI en MoU worden dan twee `DocumentProfile`s
van dezelfde infrastructuur, geen losse features.

---

## 3. Provenance / informatietypen

Iedere informatie-eenheid krijgt precies één type:

`SOURCE_FACT` · `USER_FACT` · `AI_INFERENCE` · `CALCULATION` · `ASSUMPTION` · `SPECIALIST_ASSESSMENT`
· `UNVERIFIED`

- Geen materiële claim zonder herleidbare grondslag, tenzij expliciet als `ASSUMPTION` of
  `AI_INFERENCE` gemarkeerd.
- **AI mag nooit stilzwijgend `AI_INFERENCE` → `SOURCE_FACT` maken.** `O-03`: het promotiemechanisme
  (een mens of specialist bevestigt expliciet, waarna het type wijzigt naar `USER_FACT` resp.
  `SPECIALIST_ASSESSMENT`, met wie/wanneer in de audit) is nog uit te werken.
- Provenance-velden per financiële/juridische claim: bron, locatie (document + pagina), datum,
  transformatie/adjustment + reden, benchmarkstatus (🟢/🟡/🔴), verificatiestatus, reviewkoppeling.

---

## 4. Wat we nu bouwen — en wat bewust niet

### Nu (fase A + B, de MoU-slice)

- Transaction/Case datamodel (voor zover de MoU het raakt).
- Evidence/provenance-model (typen + velden + het promotie-`OPEN`-punt).
- `TransactionBlock` + `BlockVersion` (append-only).
- `BlockReview` per `block_id@version`.
- Policy engine met `canGenerate / canExport / requiredReviews / canAccess / canPublish`, gemigreerd
  onder equivalentietests.
- `DocumentComposer` + één `DocumentProfile` (MOU).
- Reliance/disclaimer met versie + hash; export-gate.
- Audit manifest + snapshot (manifest-only, zie `ADR-AVG-AUDIT-MANIFEST.md`).
- ~23 fase-1-blocks (`SPEC-BLOCK-LIBRARY-V1.md`).
- De hele teststrategie (`TESTSTRATEGIE-TRANSACTION-OS.md`).

### Bewust nog niet

- De volledige ~120-blockbibliotheek.
- LoI / NDA / dealvoorstel / teaser / memorandum als composer-profielen (fase D).
- De specialistenpool met `pool_specialisten` / `pool_opdrachten` / `pool_reviews` / fee-flow /
  conflict-check / matching / marilyn-tab (fase E).
- De cross-case conflict-check (eerst mini-ADR, `S-02`).
- Redlining/commentaar-UI, document comparison, readiness-dashboard, transaction timeline (fase C/D).

### Blijft ongemoeid tijdens de migratie

- De bestaande NDA/LoI/BEM/exclusiviteit/dealvoorstel/teaser/verkoopmemorandum-generatoren blijven
  productief. Geen nieuwe documentlogica erin.
- De bestaande DD-fases (sectorprofielen), de rekenkern, de VOK/GV/AV, de agenda, sourcing, Postvak,
  MFA, de bewaartermijn-feature — allemaal ongewijzigd.
- `worker/00-policy.js` (`resolveRol` / `filterExternTraject`) blijft de bron; de nieuwe policy
  engine breidt uit, vervangt niet in één keer.

### Moet migreren

- Client-side security-/governance-checks (bijv. `modules.contracten` in `mna/04`) → naar de policy
  engine, onder equivalentietests.
- Herbruikbare clausuletekst uit de bestaande generatoren → naar de blockbibliotheek (`S-03`).

### Juridische content die nog moet worden opgesteld

- De ~23 fase-1-blockteksten met varianten, invulvelden, binding-status, reviewvereiste, juridisch
  eigenaar, toetsdatum (`SPEC-BLOCK-LIBRARY-V1.md`, `LEGAL CONTENT LIBRARY`-werkstroom).
- Reliance/disclaimer-tekst per versie (`L-03`).
- De MoU-`DocumentProfile`-template.

### Beslissingen die eerst moeten worden genomen

`L-01`, `L-02`, `L-03` (jurist) · `P-01`, `P-02`, `P-03` (Marcel) · `D-15` (Marcel) ·
`S-01`–`S-04` (technische spikes) · `O-01`–`O-03` (ontwerpkeuzes in de review).

---

## 5. Architectuur-reviewvragen — te beantwoorden vóór de eerste code-review

| # | Vraag | Waar geadresseerd |
|---|---|---|
| RV-1 | Kan een block worden verwijderd terwijl een document/review ernaar verwijst? | `SPEC-DATA-LIFECYCLE.md` (`O-01`: nee, alleen `RETIRED`) |
| RV-2 | Wat gebeurt er met een review wanneer een block wordt gewijzigd? | `D-10` + `SPEC-DATA-LIFECYCLE.md` (`SUPERSEDED`, nieuwe review vereist) |
| RV-3 | Wat blijft er na de AVG-purge precies in de auditlaag staan? | `ADR-AVG-AUDIT-MANIFEST.md` |
| RV-4 | Kan iemand via een andere route (preview / download / API / e-mail / background job / oude generator) alsnog een hard gate omzeilen? | `D-14` + `S-04` + `TESTSTRATEGIE-TRANSACTION-OS.md` §Gate-integriteit |

RV-4 is het belangrijkst en krijgt een eigen ontwerpeis: **één egress-policy**. Elk pad dat
documentinhoud of dossierdata naar buiten brengt, roept dezelfde `canExport` / `canPublish` /
`canAccess` aan; er is geen pad dat de policy overslaat.

---

## 6. Uitvoeringsvolgorde

### FASE A — DESIGN (dit document + de zes deeldocumenten; geen code)

1. Data model · 2. Block model · 3. Provenance model · 4. Review model · 5. Policy model ·
6. Permission model · 7. Data lifecycle · 8. ADR's · 9. AVG/legal validation (`L-01`/`L-02`/`L-03`).

**Poort:** geen slice-code merget vóór `L-01` = `DECIDED` en de vier reviewvragen beantwoord.

### FASE B — EERSTE VERTICALE SLICE (MoU)

10. MoU-blocks · 11. Block Composer · 12. MoU `DocumentProfile` · 13. `BlockReview` ·
14. Policy gates · 15. Reliance injection · 16. Audit manifest · 17. Export.

### FASE C — HARDENING

18. Equivalentietests · 19. Negatieve roltests · 20. Versioning-tests · 21. Clause-integriteitstests
· 22. Retention/purge-tests · 23. Performance-tests · 24. Gate-integriteitstests (RV-4).

### FASE D — EXPANSION

25. LoI · 26. NDA-migratie · 27. Dealvoorstel · 28. Teaser · 29. Memorandum.
Elk een nieuw `DocumentProfile`, geen nieuwe generator.

### FASE E — SPECIALISTENPOOL

30. Reviewer-interface veralgemenen · 31. Assignment-abstractie · 32. Specialist profiles ·
33. Conflict-check (na mini-ADR) · 34. Scoped access · 35. Fees · 36. Pool-UI (marilyn).

---

## 7. ADR — samenvatting

Volledige tekst: `ADR-TRANSACTION-BLOCK-ARCHITECTURE.md`.

- **Beslissing:** Transaction Block + Composer-architectuur.
- **Waarom:** voorkomt duplicatie van documentlogica; maakt provenance, review en versioning
  centraal; maakt specialistreview schaalbaar; betere auditability; nieuwe documenttypen worden
  configuratie i.p.v. code.
- **Alternatieven:** afzonderlijke documentgeneratoren (huidige situatie) · één grote AI-prompt ·
  template-only model.
- **Consequenties positief:** hergebruik, consistente governance, schaalbare review, auditability,
  eenvoudiger nieuwe documenttypen.
- **Consequenties negatief:** initieel complexer datamodel; blockbibliotheek vereist doorlopend
  juridisch onderhoud; migratie-inspanning; de policy engine wordt kritieke infrastructuur.

---

## 8. Beslissing gevraagd

Aan Marcel + jurist: **GO / NO-GO / CHANGES REQUIRED** op deze master-spec en de zes deeldocumenten,
met per open beslissing (`L-*`, `P-*`, `S-*`, `O-*`) een richting. Geen code vóór die beslissing.
