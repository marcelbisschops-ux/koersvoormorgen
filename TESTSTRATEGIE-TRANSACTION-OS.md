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

## 4b. Divergentiedetectie-tests (D-17 / RV-2 verwante)

- Zet exclusiviteitsduur op 90 in de dealdata en de gegenereerde MoU-tekst → laat de specialist de
  MoU-tekst naar 120 wijzigen → assert: het platform toont een **divergentiewaarschuwing** aan de
  adviseur ("verschil tussen transactionele gegevens en juridisch aangepaste documenttekst").
- Zelfde veld verschilt tussen twee documenten van hetzelfde dossier (MoU 120, LoI 90) → waarschuwing.
- De adviseur past de dealdata aan naar 120 zodat alles gelijk is → de waarschuwing verdwijnt; de
  eerder `APPROVED` MoU-component blijft `APPROVED` (de dealdata volgde de tekst, niet andersom) —
  tenzij de dealdata-wijziging zelf een gekoppeld reviewveld raakt, dan `SUPERSEDED` (D-10).
- Negatief: een niet-gekoppeld tekstverschil (bijv. een toelichtende zin) triggert **geen**
  waarschuwing.

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
