# TESTSTRATEGIE — Transaction OS

**Datum:** 2026-09-10 · **Status:** ter verificatie · **Context:** `MASTER-SPEC-TRANSACTION-OS.md` §6 FASE C

Uitbreiding op de bestaande suite (`tests/e2e-api.mjs`, `tests/e2e-ui.spec.js`,
`tests/policy-equivalentie.mjs`, `tests/audit-consistentie.mjs`, `tests/audit-backend.mjs`,
`tests/e2e-crosspath-fixes.mjs`, `tests/schema-gate.mjs`). Alles hieronder draait in
`predeploy.sh` / CI en gate't de deploy.

---

## 1. Policy-equivalentietests (verplicht vóór elke migratiestap)

- Basis: `tests/policy-equivalentie.mjs` (nu 54 checks voor `resolveRol` / `filterExternTraject`).
- **Voor elke client-side check die naar de policy engine migreert:** eerst een equivalentietest die
  bewijst dat de engine exact hetzelfde antwoord geeft als de bestaande check, voor alle rollen en
  randgevallen — daarna pas de client-side check verwijderen.
- Acceptance: **geen regressie** in bestaande toegangsrechten + alle nieuwe negatieve cases getest.
- Nieuwe engine-functies met eigen equivalentie-/eenheidstests: `canGenerate`, `canExport`,
  `requiredReviews`, `requiredDisclaimer`, `canAccess`, `canPublish`.

---

## 2. Negatieve-roltestbatterij (CI-gate)

Voor elke kritieke rol: test niet alleen wat mag, expliciet wat **niet** mag. Minimaal:

```
advisor / begeleider
  CAN_READ_OWN_CASE                       = TRUE
  CAN_READ_OTHER_ADVISOR_CASE             = FALSE
  CAN_EXPORT_WITHOUT_REQUIRED_REVIEW      = FALSE
  CAN_STRIP_RELIANCE_FROM_EXPORT          = FALSE

client / verkoper / koper
  CAN_READ_ASSIGNED_CASE_SCOPE           = TRUE
  CAN_READ_INTERNAL_BLOCKS/REVIEWS       = FALSE
  CAN_READ_OTHER_PARTY_ONLY_DATA         = FALSE
  CAN_SEE_TUSSEN_CODE / AUTH_KEYS        = FALSE

legal / tax / valuation specialist  (fase E)
  CAN_READ_ASSIGNED_BLOCKS              = TRUE
  CAN_READ_NON_SCOPED_BLOCKS            = FALSE
  CAN_APPROVE_BLOCK_OUTSIDE_DOMAIN      = FALSE

pool specialist  (fase E)
  CAN_READ_ASSIGNED_CASE                = TRUE
  CAN_READ_OTHER_CASE                   = FALSE
  CAN_SEARCH_ALL_CASES                  = FALSE
  CAN_EDIT_PERMISSIONS / CHANGE_ROLE    = FALSE
  CAN_INVITE_USERS                      = FALSE
  CAN_CHANGE_PLATFORM_SETTINGS          = FALSE
  CAN_CHANGE_COMMERCIAL_TERMS           = FALSE
  CAN_APPROVE_OWN_FEE                   = FALSE
  CAN_ACCESS_AI_CONFIG                  = FALSE
  ACCESS_GONE_AFTER_ASSIGNMENT_EXPIRES  = TRUE

admin / Marcel
  CAN_READ_EXTERNAL_ADVISOR_PRICE_DATA  = FALSE   (bestaande "muur"-invariant)
```

Uitbreidt `tests/e2e-crosspath-fixes.mjs` (de CONF-vertrouwelijkheidsmatrix).

---

## 3. Versioning-tests

- Een `block_version`-wijziging maakt een nieuwe onveranderlijke rij; de oude blijft byte-identiek.
- Een `APPROVED` review op `@v4` wordt `SUPERSEDED` zodra `@v5` bestaat; `@v5` staat op `REQUIRED`.
- Een `DocumentVersion` verwijst naar exacte `block_id@version`-paren; het opnieuw samenstellen van
  dezelfde documentversie levert dezelfde blockselectie.
- Een oude approval "schuift" nooit door naar een nieuwe versie (negatief).

---

## 4. Autoriteitsgrens-tests (RV-5) + AI-eigenaarschap (D-07)

- **AI mag goedgekeurde/bewerkte tekst niet herschrijven.** Zet een AI-concept in een component →
  laat de specialist het bewerken (`text_provenance = SPECIALIST_ASSESSMENT`) → draai de compositie
  20× met wisselende AI-runs → de specialist-tekst verandert **byte-identiek nooit**.
- **Eigenaarschap wisselt bij bewerking.** Na een specialist-bewerking is `text_provenance` geen
  `AI_INFERENCE` meer; na een adviseur-bewerking buiten review is het `USER_FACT`. Assert dat AI
  daarna geen automatische wijziging meer aanbrengt.
- **Goedkeuring-invalidatie.** Component `APPROVED` → wijzig de vrije tekst of een dataslot (als
  specialist én, in een tweede test, als adviseur) → de `BlockReview` staat op `SUPERSEDED`, export
  geblokkeerd tot nieuwe `APPROVED`.
- **Het platform presenteert documenttekst nooit als "professioneel juist".** Statische + UI-check:
  overal waar componenttekst wordt getoond staat de provenance-/reviewstatus erbij; er is geen
  codepad dat een `APPROVED`-status zet zonder een echte reviewer (naam + hoedanigheid + datum +
  versie); er is geen "gecontroleerd door Koers voor Morgen"-tekst.
- Statische check (patroon `audit-consistentie` check 8/9): de composer levert de instance-tekst
  letterlijk door en de AI-prompt bevat de expliciete "niet herschrijven / geen oordeel"-instructie.

---

## 4b. Divergentiedetectie-tests (D-17 / RV-2)

Uitgangspunt: binding numerieke/datum-termen leven **uitsluitend in gestructureerde dataslots** van
de component-instance (single source). De vrije tekst toont ze via een token. Een wijziging aan zo'n
gekoppeld dataslot van een `APPROVED` instance zet de review **altijd** op `SUPERSEDED` — of de
wijziging nu in de tekst of in de dealdata begint. De divergentiewaarschuwing en de
review-invalidatie zijn twee kanten van dezelfde gebeurtenis.

- Zet exclusiviteitsduur (dataslot) op 90 → component `APPROVED` → wijzig het dataslot naar 120
  (als specialist, en in een tweede test als adviseur) → assert: (a) `BlockReview` → `SUPERSEDED`,
  (b) export geblokkeerd, (c) **divergentiewaarschuwing** als een ander document van hetzelfde
  dossier nog 90 in zijn gekoppelde dataslot heeft.
- Zelfde dataslot verschilt tussen MoU-instance (120) en LoI-instance (90) van hetzelfde dossier →
  waarschuwing, met beide bronnen genoemd.
- De specialist overschrijft de tokenzin met een letterlijk getal dat afwijkt van het dataslot →
  dit is een expliciete, gemarkeerde **override** → review `SUPERSEDED` + waarschuwing "documenttekst
  wijkt af van het gekoppelde veld".
- Alle gekoppelde dataslots weer gelijkgetrokken (120 overal) → de waarschuwing verdwijnt; de
  reviews blijven `SUPERSEDED` tot ze opnieuw zijn afgetekend (gelijktrekken heft de invalidatie
  niet op).
- Negatief: een wijziging aan **niet-gekoppelde vrije prozatekst** (een toelichtende zin zonder
  binding-term) triggert géén invalidatie en géén waarschuwing.

---

## 5. Retention / purge-tests

- Maak een case met blocks, evidence, documenten, reviews, een manifest-record → draai de
  purge-cascade → alle **CONTENT**-rijen weg (assert per tabel), alle **MANIFEST**-rijen blijven,
  block-definities ongemoeid, `platform_fees` ongemoeid.
- `/avg/verwijder` op een betrokkene-e-mail → CONTENT weg, manifest geanonimiseerd volgens de
  jurist-keuze (`L-02`).
- Een nieuwe CONTENT-tabel zonder cascade-koppeling → `tests/audit-consistentie.mjs` check 6 /
  `tests/audit-backend.mjs` check 4 faalt (bewijs dat het vangnet werkt).
- Geen enkel pad schrijft trajectdata naar een MANIFEST-tabel (statische scan op de write-paden).

---

## 6. Gate-integriteitstests (reviewvraag RV-4 — kritiek)

Voor een case met een ontbrekende vereiste review, probeer een export te forceren via **elke** route
en assert dat elke route blokkeert:

```
PREVIEW_BLOCKED_WHEN_REVIEW_MISSING          (canAccess op de renderende view)
DOWNLOAD_BLOCKED_WHEN_REVIEW_MISSING         (canExport)
EMAIL_SEND_BLOCKED_WHEN_REVIEW_MISSING       (canExport + canPublish)
API_DOCUMENT_ENDPOINT_BLOCKED               (canExport)
DOSSIER_ZIP_EXCLUDES_UNAPPROVED_DOCUMENT    (canExport per document)
BACKGROUND_EXPORT_JOB_BLOCKED               (canExport namens de gebruiker)
OLD_GENERATOR_HAS_NO_COMPOSER_OUTPUT_PATH   (de MoU/composer-uitgang bestaat niet in de oude generatoren)
RELIANCE_MISSING_MAKES_EXPORT_INVALID       (export zonder correcte disclaimer-versie faalt)
NO_DOCUMENT_CONTENT_IN_ERROR_RESPONSE       (een geblokkeerde export lekt geen tekst in de foutrespons)
NO_DOCUMENT_CONTENT_IN_LOGS                 (geen componenttekst in console/wrangler-tail-logs)
AI_CONTEXT_RESPECTS_SPECIALIST_HOLD         (tekst van een component onder specialist-hold gaat niet
                                            als AI-context naar Anthropic zonder expliciete instemming)
```

Plus: een export die wél slaagt bevat de juiste `disclaimer_version + hash`, en het manifest van die
export bevat exact de block-/review-/policy-versies die golden op het moment van export.

---

## 7. Performance-tests (`S-01`)

- Een case openen met 25 blocks + reviews doet ≤ N D1-queries (N vast te stellen in de spike; richt
  op ≤ ~10, geen N+1).
- Een koude worker-start met het uitgebreide schema voegt geen extra `initDB`-statements toe buiten
  de `SCHEMA_VERSION`-fast-path.
- Een officiële export schrijft ≤ M rijen (manifest + audit events, gebatcht).
- Append-only tabelgroei per case blijft binnen een bovengrens; de MANIFEST-bewaartermijn is eindig.

---

## 8. Reproduceerbaarheidstest

- Exporteer MoU-versie 8 → verwijder de case-inhoud (purge) → vraag het systeem "waaruit bestond
  MoU v8?" → het antwoord komt volledig uit het manifest (block-ID's + versies + reviews + hoedanigheid
  + disclaimer-versie + hashes), zonder handmatig speurwerk, zonder dat de inhoud nog bestaat.

---

## 9. Bestaande checks die groen moeten blijven

Alle huidige checks in `predeploy.sh` en de git-hooks: `node --check` op alle JS,
`tests/audit-backend.mjs`, `tests/audit-consistentie.mjs` (12 checks),
`tests/policy-equivalentie.mjs`, `tests/schema-gate.mjs`, de e2e-suite, de dealvoorstel-/contract-
outputchecks, de contrast- en load-bearing-pages-checks.
