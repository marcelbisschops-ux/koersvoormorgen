# SPEC — FASE B-ontwerp: de MoU verticale slice

**Datum:** 2026-09-10 · **Status:** ontwerp ter `/code-review`, dan implementatie. **Nog geen code.**
**Context:** `MASTER-SPEC-TRANSACTION-OS.md` FASE B · `SPEC-MOU-FIRST-VERTICAL-SLICE.md` ·
`SPEC-BLOCK-FRAMEWORK-V1.md` · `SPEC-DATA-LIFECYCLE.md` · `ARCHITECTUURREVIEW-TRANSACTION-OS.md`

Dit document maakt de MoU-slice concreet genoeg om te bouwen: **D1-datamodel (DDL)**,
**component-definitieschema + de 23 seed-componenten**, de **policy-engine-interface**, de
**endpoints**, en de **composer-UX**. Coëxistentie met alles wat er nu draait is een harde eis.

---

## 1. Scope & coëxistentie

**Levert:** de 14 acceptance-criteria uit `SPEC-MOU-FIRST-VERTICAL-SLICE.md`.

**Hergebruikt ongewijzigd:** `mna_trajecten` (traject-basis), `worker/00-policy.js`
(`resolveRol`/`begeleiderAuth`), de `/ai`-infra + prompt-caching, de bestaande PDF/print/mail-helpers,
de rekenkern (`mna/03` + backend — alleen gelezen, `D-18`).

**Raakt niet:** de bestaande NDA/LoI/BEM/dealvoorstel/teaser/memorandum-generatoren, de DD-fases,
VOK/GV/AV, agenda, sourcing, Postvak, MFA, bewaartermijn. Nieuwe code zit in **één nieuwe module
`backend/worker/31-tos.js`** + een nieuw front-end-blok in `mna/04-begeleider-dashboard.js`.

**Feature-gate:** de MoU-composer is alleen zichtbaar/bereikbaar voor een traject waar de begeleider
hem expliciet aanzet (nieuw veld `mna_trajecten.tos_actief INTEGER DEFAULT 0`), zodat bestaande
gebruikers niets merken tot ze het kiezen.

---

## 2. Datamodel — D1 DDL

Alle `CREATE TABLE` **centraal in `initDB()`** (`cloudflare-worker.js`), `SCHEMA_VERSION` +1.
Twee bewaarklassen (zie `SPEC-DATA-LIFECYCLE.md`):

- **CONTENT** (met een `traject_id`-kolom): valt onder de purge, gaat in **beide** verwijder-cascades
  (`verwijderTrajectData()` in `worker/02` én `/avg/verwijder` in `worker/06`) + de audit-checks
  (`tests/audit-consistentie.mjs` check 6, `tests/audit-backend.mjs` check 4).
- **PLATFORM / MANIFEST** (géén rauwe `traject_id`; waar een dossierverwijzing nodig is: een
  `traject_ref` = SHA-256 van het traject-id, zodat de tabel niet door de cascade-grep wordt geraakt
  en manifest-veilig is by construction).

### 2.1 PLATFORM — component-definities (geen persoonsgegevens, geen professionele tekst)

```sql
CREATE TABLE IF NOT EXISTS tos_component (
  block_id        TEXT PRIMARY KEY,          -- "exclusivity"
  status          TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT | ACTIVE | RETIRED
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tos_component_version (
  block_id         TEXT NOT NULL,
  version          INTEGER NOT NULL,         -- structuurversie, append-only
  category         TEXT NOT NULL,            -- PARTIES|TRANSACTION|ECONOMICS|PROCESS|LEGAL|DOCUMENT_STATUS
  title            TEXT NOT NULL,
  data_fields_json TEXT NOT NULL,            -- [{key,label,type,required,source_hint}]
  review_domain    TEXT NOT NULL,            -- LEGAL|TAX|VALUATION|NONE
  review_trigger   TEXT NOT NULL,            -- 'altijd' | 'bij_bewerking' | 'nooit'
  binding_default  TEXT NOT NULL,            -- BINDING|NON_BINDING|SUBJECT_TO_DOCUMENTATION|INFORMATIONAL
  completeness_role TEXT NOT NULL,           -- 'kern' | 'aanbevolen' | 'optioneel'
  eligibility_json TEXT NOT NULL,            -- ["MOU","LOI"]
  created_at       INTEGER NOT NULL,
  PRIMARY KEY (block_id, version)
);

CREATE TABLE IF NOT EXISTS tos_document_profile (
  profile_id           TEXT NOT NULL,        -- "MOU"
  version              INTEGER NOT NULL,     -- append-only (O-05)
  title                TEXT NOT NULL,
  allowed_json         TEXT NOT NULL,        -- block_ids toegestaan
  default_json         TEXT NOT NULL,        -- block_ids standaard aangevinkt
  order_json           TEXT NOT NULL,        -- volgorde
  binding_override_json TEXT,                -- {block_id: binding_status}
  required_reviews_json TEXT NOT NULL,       -- {LEGAL:true, TAX:false, VALUATION:false}
  disclaimer_id        TEXT NOT NULL,
  created_at           INTEGER NOT NULL,
  PRIMARY KEY (profile_id, version)
);

CREATE TABLE IF NOT EXISTS tos_disclaimer (
  disclaimer_id  TEXT NOT NULL,
  version        INTEGER NOT NULL,
  content        TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  approved_by    TEXT,
  effective_date INTEGER NOT NULL,
  PRIMARY KEY (disclaimer_id, version)
);
```

### 2.2 CONTENT — dossierdata (traject_id, valt onder de purge)

```sql
CREATE TABLE IF NOT EXISTS tos_document (
  id              TEXT PRIMARY KEY,
  traject_id      TEXT NOT NULL,
  profile_id      TEXT NOT NULL,
  profile_version INTEGER NOT NULL,
  doc_type        TEXT NOT NULL,             -- 'mou'
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | finalised | exported
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by      TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tos_document_traject ON tos_document(traject_id);

CREATE TABLE IF NOT EXISTS tos_document_version (
  id                 TEXT PRIMARY KEY,
  traject_id         TEXT NOT NULL,          -- gedenormaliseerd voor de cascade + index
  document_id        TEXT NOT NULL,
  version_no         INTEGER NOT NULL,
  instance_ids_json  TEXT NOT NULL,          -- geordende lijst component_instance-ids
  reliance_version   INTEGER,
  policy_version     TEXT,
  export_hash        TEXT,                   -- gevuld bij officiële export
  created_by         TEXT NOT NULL,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tos_docver_traject ON tos_document_version(traject_id);
CREATE INDEX IF NOT EXISTS idx_tos_docver_doc ON tos_document_version(document_id, version_no);

CREATE TABLE IF NOT EXISTS tos_component_instance (
  id               TEXT PRIMARY KEY,
  traject_id       TEXT NOT NULL,
  document_id      TEXT NOT NULL,
  block_id         TEXT NOT NULL,
  block_version    INTEGER NOT NULL,
  data_values_json TEXT NOT NULL,            -- {key:{value,provenance_type,source}}
  text             TEXT,                     -- vrije tekst; AI-concept of specialist-input
  text_provenance  TEXT NOT NULL DEFAULT 'AI_INFERENCE',
  binding_status   TEXT NOT NULL,
  instance_status  TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | REMOVED_IN_v<n>
  review_id        TEXT,
  last_changed_by  TEXT NOT NULL,
  last_changed_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tos_inst_traject ON tos_component_instance(traject_id);
CREATE INDEX IF NOT EXISTS idx_tos_inst_doc ON tos_component_instance(document_id);

CREATE TABLE IF NOT EXISTS tos_block_review (
  id                    TEXT PRIMARY KEY,
  traject_id            TEXT NOT NULL,
  component_instance_id TEXT NOT NULL,
  block_id              TEXT NOT NULL,
  block_version         INTEGER NOT NULL,
  review_domain         TEXT NOT NULL,
  reviewer_id           TEXT,
  reviewer_naam         TEXT,
  reviewer_hoedanigheid TEXT,
  review_kind           TEXT NOT NULL,       -- SPECIALIST | ADVISOR | SELF_REVIEW
  status                TEXT NOT NULL DEFAULT 'REQUIRED',
  comments_json         TEXT,               -- draad; verdwijnt bij purge, niet in het manifest
  reviewed_at           INTEGER,
  supersedes_review_id  TEXT,
  created_at            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tos_review_traject ON tos_block_review(traject_id);
CREATE INDEX IF NOT EXISTS idx_tos_review_instance ON tos_block_review(component_instance_id);

CREATE TABLE IF NOT EXISTS tos_divergence_flag (
  id           TEXT PRIMARY KEY,
  traject_id   TEXT NOT NULL,
  dataslot_key TEXT NOT NULL,               -- "exclusivity.duur"
  instances_json TEXT NOT NULL,             -- [{instance_id, document_id, value}]
  created_at   INTEGER NOT NULL,
  resolved_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tos_diverg_traject ON tos_divergence_flag(traject_id);

CREATE TABLE IF NOT EXISTS tos_review_setting (
  traject_id  TEXT PRIMARY KEY,
  juridisch   TEXT NOT NULL DEFAULT 'vereist',  -- 'vereist' | 'uit'
  fiscaal     TEXT NOT NULL DEFAULT 'vereist',
  cijfers     TEXT NOT NULL DEFAULT 'vereist',
  set_by      TEXT,
  set_at      INTEGER,
  optout_log_json TEXT                      -- [{domein, van, naar, door, ts}]
);
```

### 2.3 MANIFEST — overleeft de purge (geen rauw traject_id)

```sql
CREATE TABLE IF NOT EXISTS tos_audit_event (
  id            TEXT PRIMARY KEY,
  traject_ref   TEXT,                       -- SHA-256(traject_id) — niet de rauwe id
  actor_role    TEXT NOT NULL,              -- rol, niet de naam (naam alleen zolang CONTENT bestaat)
  actor_id_hash TEXT,
  ts            INTEGER NOT NULL,
  object_type   TEXT NOT NULL,
  object_id     TEXT NOT NULL,
  object_version TEXT,
  action        TEXT NOT NULL,
  meta_json     TEXT,                       -- nooit documentinhoud
  hash          TEXT NOT NULL               -- hash van (vorige hash + deze rij) = append-only-keten
);
CREATE INDEX IF NOT EXISTS idx_tos_audit_ref ON tos_audit_event(traject_ref, ts);

CREATE TABLE IF NOT EXISTS tos_manifest (
  id                 TEXT PRIMARY KEY,
  traject_ref        TEXT NOT NULL,
  document_id_hash   TEXT NOT NULL,
  document_version   INTEGER NOT NULL,
  profile_ref        TEXT NOT NULL,         -- "MOU@v1"
  component_refs_json TEXT NOT NULL,        -- ["exclusivity@3","confidentiality@1", …]
  review_refs_json   TEXT NOT NULL,         -- [{domain,hoedanigheid,status,reviewed_at}]
  disclaimer_ref     TEXT NOT NULL,         -- "reliance@6"
  disclaimer_hash    TEXT NOT NULL,
  policy_version     TEXT NOT NULL,
  content_hash       TEXT NOT NULL,         -- hash van het geëxporteerde document
  manifest_hash      TEXT NOT NULL,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tos_manifest_ref ON tos_manifest(traject_ref);
```

### 2.4 Cascade & checklist

- **In beide verwijder-cascades + de audit-checks:** `tos_document`, `tos_document_version`,
  `tos_component_instance`, `tos_block_review`, `tos_divergence_flag`, `tos_review_setting`.
  Bij purge: van `tos_block_review` blijft niets (comments = CONTENT); vóór de delete wordt per review
  een `tos_manifest`-review-ref al geschreven bij de export, dus er gaat geen bewijs verloren.
- **Niet in de cascade** (platform/manifest): `tos_component*`, `tos_document_profile`,
  `tos_disclaimer`, `tos_audit_event`, `tos_manifest`. Deze gebruiken `traject_ref` (hash), geen
  `traject_id`, dus de cascade-grep raakt ze niet — dit is de bewuste, gedocumenteerde uitzondering
  (zelfde lijn als `mna_audit`).
- **`mna_trajecten.tos_actief`** kolom toevoegen (feature-gate).
- `SCHEMA_VERSION` ophogen; alle nieuwe statements in `initDB()`.

---

## 3. Component-definitieschema + de 23 seed-componenten

`data_fields_json` per veld: `{ key, label, type, required, source_hint }`.
`type` ∈ `text | number | date | days | percent | bool | enum(...)`.
`source_hint` = waar het voorvullen vandaan komt: `traject.<kol>` · `rekenkern.<sleutel>` · `nvt`.

**Seed (fase 1, `P-01`).** Elke component: `block_id · category · title · review_domain ·
review_trigger · binding_default · completeness_role · eligibility` + `data_fields`.

| block_id | cat | domein | trigger | binding | rol | data_fields (key:type) |
|---|---|---|---|---|---|---|
| `parties` | PARTIES | LEGAL | bij_bewerking | INFORMATIONAL | kern | rol_verkoper:text, rol_koper:text, begeleider:text |
| `buyer` | PARTIES | LEGAL | bij_bewerking | INFORMATIONAL | kern | naam:text, rechtsvorm:text, kvk:text, adres:text |
| `seller` | PARTIES | LEGAL | bij_bewerking | INFORMATIONAL | kern | naam:text, rechtsvorm:text, kvk:text, adres:text |
| `target` | PARTIES | LEGAL | bij_bewerking | INFORMATIONAL | kern | naam:text, entiteit:text |
| `transaction_scope` | TRANSACTION | LEGAL | bij_bewerking | NON_BINDING | kern | object:enum(aandelen,activa_passiva), belang_pct:percent |
| `transaction_structure` | TRANSACTION | LEGAL | bij_bewerking | NON_BINDING | kern | structuur:text, toelichting:text |
| `indicative_price` | ECONOMICS | VALUATION | bij_bewerking | NON_BINDING | kern | bedrag_of_band:text (`rekenkern.waardering`), grondslag:text |
| `price_mechanism` | ECONOMICS | LEGAL | bij_bewerking | SUBJECT_TO_DOCUMENTATION | aanbevolen | mechanisme:enum(locked_box,completion_accounts,nader_te_bepalen) |
| `payment_terms` | ECONOMICS | LEGAL | bij_bewerking | SUBJECT_TO_DOCUMENTATION | aanbevolen | cash_pct:percent, escrow_pct:percent, earn_out_pct:percent, vendor_loan_pct:percent |
| `due_diligence` | PROCESS | LEGAL | bij_bewerking | NON_BINDING | aanbevolen | periode_weken:number, scope:text |
| `financing` | PROCESS | LEGAL | bij_bewerking | NON_BINDING | aanbevolen | zekerheid:enum(eigen_middelen,commitment_brief,nog_te_regelen) |
| `conditions_precedent` | PROCESS | LEGAL | bij_bewerking | NON_BINDING | aanbevolen | lijst:text |
| `timeline` | PROCESS | NONE | nooit | NON_BINDING | aanbevolen | loi_datum:date, dd_start:date, signing_streef:date, closing_streef:date |
| `confidentiality` | LEGAL | LEGAL | bij_bewerking | BINDING | kern | verwijst_naar_nda:bool, duur_maanden:number |
| `exclusivity` | LEGAL | LEGAL | bij_bewerking | BINDING | kern | duur_dagen:days, startdatum:date, wederkerig:bool |
| `costs` | LEGAL | LEGAL | bij_bewerking | BINDING | kern | verdeling:enum(ieder_eigen,anders), toelichting:text |
| `governing_law` | LEGAL | LEGAL | bij_bewerking | BINDING | kern | rechtsstelsel:text (default "Nederlands recht") |
| `jurisdiction` | LEGAL | LEGAL | bij_bewerking | BINDING | kern | forum:text (default "Rechtbank Oost-Brabant") |
| `announcements` | LEGAL | LEGAL | bij_bewerking | BINDING | optioneel | regeling:text |
| `binding_provisions` | DOCUMENT_STATUS | LEGAL | nooit | INFORMATIONAL | kern | (auto: lijst van BINDING-componenten in dit document) |
| `non_binding_provisions` | DOCUMENT_STATUS | LEGAL | altijd | INFORMATIONAL | kern | tekst (auto-concept: expliciete niet-bindendheid) |
| `reliance` | DOCUMENT_STATUS | NONE | nooit | INFORMATIONAL | kern | (auto: centrale reliance-tekst @version) |
| `earn_out` | ECONOMICS | VALUATION | bij_bewerking | SUBJECT_TO_DOCUMENTATION | optioneel | meetgrondslag:enum(omzet,ebitda,milestone), periode_jaren:number, cap:text, bescherming:text |

**MoU-`DocumentProfile` v1:** `default` = alle `kern` + alle `aanbevolen`; `allowed` = alle 23;
`order` = tabelvolgorde; `required_reviews` = `{LEGAL: true, TAX: false, VALUATION: false}` (fase 1
gebruikt de MoU geen fiscale/waarderingscomponenten in `default`; zet je `indicative_price` of
`earn_out` erin, dan wordt VALUATION `required`).

---

## 4. Policy-engine-interface

Nieuw bestand `backend/worker/00b-tos-policy.js`, geïmporteerd in `cloudflare-worker.js` naast
`worker/00-policy.js`. Alle functies puur (geen side-effects), testbaar zonder DB via injectie van de
opgehaalde rijen.

```js
// ctx = { rol, traject_id, gebruiker_id, is_eigen, is_tester }
tosCanGenerate(ctx, docType) -> { ok:boolean, reason?:string }
   // rol === 'begeleider'/'admin' en traject.tos_actief

tosRequiredReviews(ctx, docState) -> [{ domain:'LEGAL'|'TAX'|'VALUATION', status }]
   // op basis van de componenten IN het document + tos_review_setting (vereist/uit)

tosCanExport(ctx, docState) -> { ok:boolean, blockers:[{code,msg,action}] }
   // blocker-codes:
   //   REVIEW_MISSING       (een required review is niet APPROVED)
   //   REVIEW_SUPERSEDED    (component gewijzigd na goedkeuring)
   //   RELIANCE_MISSING     (geen geldige disclaimer-versie gekoppeld)
   //   OPEN_PLACEHOLDER     (verplicht dataslot leeg in een opgenomen component)
   // divergentie is GEEN blocker op zich — maar leidt tot REVIEW_SUPERSEDED, wat wel blokkeert

tosRequiredDisclaimer(ctx, docType) -> { disclaimer_id, version, hash }

tosCanAccess(ctx, resourceType, resource) -> boolean
   // begeleider/admin: alles binnen eigen traject
   // verkoper/koper: alleen een tos_document dat naar hen is verstuurd (status 'exported' + adressaat)
   // specialist (fase E): alleen scoped componenten  — in de slice n.v.t.

tosCanPublish(ctx, docState) -> { ok:boolean, blockers }
   // = tosCanExport + verzendrecht van de rol

tosAssertEgress(ctx, docState, route) -> { ok, blockers }
   // ELKE uitgangsroute roept dit aan: preview, download, mail, api, zip, background job.
   // route ∈ 'preview'|'download'|'email'|'api'|'zip'|'job'
   // 'preview' → tosCanAccess ; overige → tosCanPublish/tosCanExport
```

**Equivalentie:** `tests/policy-equivalentie.mjs` krijgt een `tos`-sectie met vaste
in/uit-vectoren per rol × docState. Deze sectie moet groen zijn vóór de eerste `tosAssertEgress`
in een egress-pad live gaat.

---

## 5. Endpoints — `backend/worker/31-tos.js`

Handler `handleTos(ctx, getCORS)` → `null` als geen route matcht (patroon van de andere modules).
Auth: begeleider via `x-tussen-key` (`begeleiderAuth`), admin via `x-admin-key`.

| Method + pad | Doet |
|---|---|
| `POST /mna/tos/activeer/{traject}` | `mna_trajecten.tos_actief = 1` (begeleider/admin) |
| `GET /mna/tos/menu/{traject}?profile=MOU` | het componentenmenu: definities (`ACTIVE`) + `eligibility` + volledigheidscheck-status |
| `POST /mna/tos/document` | maak een `tos_document` (MOU) voor het traject; instantieert de `default`-componenten met lege dataslots + voorgevulde waarden uit `traject`/rekenkern (provenance-getypeerd) |
| `GET /mna/tos/document/{id}` | volledige documentstaat: instances + data_values + text + provenance + binding + reviewstatus + divergence-flags |
| `POST /mna/tos/document/{id}/component` | voeg een component uit het menu toe |
| `POST /mna/tos/document/{id}/component/{iid}/verwijder` | `instance_status = REMOVED_IN_v<n>` (geen delete) |
| `PATCH /mna/tos/component/{iid}` | wijzig `data_values` en/of `text`; herberekent `text_provenance`, triggert review-`SUPERSEDED` bij een gekoppeld binding-veld, draait de event-driven divergentiecheck |
| `POST /mna/tos/component/{iid}/concept` | AI-concept in het vrije tekstveld (`AI_INFERENCE`); input = block_id + data_values (+ optioneel geüpload sjabloon) |
| `POST /mna/tos/component/{iid}/review` | review-actie: `REQUESTED`/`IN_REVIEW`/`CHANGES_REQUESTED`/`APPROVED`; legt `review_kind` vast (`SELF_REVIEW` als reviewer == laatste bewerker) |
| `POST /mna/tos/document/{id}/setting` | `tos_review_setting` zetten (vereist/uit per domein); opt-out → `optout_log_json` + audit |
| `GET /mna/tos/document/{id}/exportcheck` | `tosCanExport` → `{ok, blockers}` voor de UI |
| `POST /mna/tos/document/{id}/finaliseer` | maakt `tos_document_version` (immutable), koppelt reliance@version, schrijft het `tos_manifest`, zet `status='exported'`; **weigert** als `tosAssertEgress` blokkeert |
| `POST /mna/tos/document/{id}/verstuur` | mail naar verkoper/koper; roept `tosAssertEgress(...,'email')`; hangt de reliance-voettekst er (opnieuw) onder |
| `GET /mna/tos/document/{id}/manifest` | het manifest van een geëxporteerde versie (reproduceerbaarheid) |

Alle mutaties schrijven een `tos_audit_event` (append-only hash-keten).

---

## 6. AI-concept-generatie

Bestaande `/ai`-infra + prompt-caching. Vast `system`-blok (cachebaar):

> "Je stelt een **concept** op voor het onderdeel «{title}» van een {doctype}. Gebruik uitsluitend de
> meegegeven gegevens. Voeg geen andere onderdelen, clausules of bepalingen toe. Geef geen juridisch,
> fiscaal of waarderingsoordeel. Markeer wat onzeker of onbekend is expliciet. Dit is een concept ter
> beoordeling door de adviseur en, waar vereist, een bevoegd specialist — geen advies."

`user`: het `data_values`-JSON + (optioneel) de geüploade sjabloontekst met het label
"eerdere sjabloontekst, niet getoetst". Output → `tos_component_instance.text`,
`text_provenance='AI_INFERENCE'`. Zodra een mens `PATCH`t: provenance → `SPECIALIST_ASSESSMENT`
(reviewerrol) of `USER_FACT` (adviseur buiten review); AI raakt die tekst daarna niet meer aan
(`D-07`).

---

## 7. Composer-UX (in `mna/04-begeleider-dashboard.js`)

Nieuw blok, alleen zichtbaar als `traject.tos_actief`. Knop **"MoU (composer)"** in de
documentenflow, tussen NDA en LoI.

**Scherm 1 — Menu & samenstelling.** Twee kolommen: links het menu (KERN / AANBEVOLEN / OPTIONEEL,
checkboxes), rechts het samengestelde document als lijst componenten in volgorde. Bovenaan de
**volledigheidsbalk**: "3 van 9 KERN-componenten nog niet opgenomen" + per ontbrekende component de
generieke toelichting (RV-5: geen casus-specifiek oordeel). Sleepbare volgorde.

**Scherm 2 — Component-editor** (klik op een component). Toont: de dataslots (invulbaar, voorgevulde
waarden met een provenance-badge — 🟦 bron / 🟩 berekend / 🟨 aanname / 🤖 AI), het vrije tekstveld
met knoppen **[AI-concept]** · **[Bewerk]** · **[Vervang]**, de **binding-badge**, en de
**reviewstatus** (`VEREIST` / `GEVRAAGD` / `GEWIJZIGD NA GOEDKEURING` / `GOEDGEKEURD door … op …`).
Bewerkt de gebruiker een gekoppeld binding-veld van een goedgekeurde component → inline melding
"hierdoor vervalt de goedkeuring; er is een nieuwe review nodig".

**Divergentiebanner.** Verschijnt boven het document zodra een `tos_divergence_flag` open staat:
"De exclusiviteitsduur verschilt: dealgegevens 90, MoU-tekst 120. [Naar het veld]".

**Reviewpaneel.** Per domein (juridisch / fiscaal / cijfers): status + knop **[Review aanvragen]** /
**[Markeer als beoordeeld]** (interim: de begeleider zelf; loggt `SELF_REVIEW`). Bovenaan de
**instelling** "Specialistbeoordeling vereist voor: [juridisch ▾] [fiscaal ▾] [cijfers ▾]"; op "uit"
verschijnt een bevestiging + de sectie-0.3-disclaimer wordt op het document gestempeld.

**Export.** Knop **[Finaliseer & exporteer]**. Bij blokkade géén `403` maar een paneel:
"Dit document kan nog niet worden verstuurd" + de `blockers` met per regel een actie
(**[Review aanvragen]** / **[Vul in]**). Bij succes: PDF + opslaan bij traject + **[Versturen naar
partijen]**, met de reliance-voettekst eronder, en een link **[Manifest bekijken]**.

**adv.html:** dezelfde composer-flow spiegelen zodra de slice op productie staat (werkregel 6);
in de eerste iteratie mag adv.html achterlopen mits expliciet benoemd.

---

## 8. Migratie & coëxistentie

- Niets aan de bestaande generatoren. `worker/31-tos.js` is puur additief; dispatch-regel in
  `cloudflare-worker.js` ná de bestaande modules, vóór de 404.
- `SPEC-STAP-1` deel 1A (reliance-voettekst op de **bestaande** generatoren, `D-15`) blijft een losse,
  parallelle levering; de composer heeft zijn eigen reliance-injectie.
- Geen extractie van clausuletekst uit de oude templates naar een bibliotheek (`S-03` gaat alleen
  over **structuur**: welke dataslots een documenttype heeft).

---

## 9. Testplan voor de slice (mapt op `TESTSTRATEGIE-TRANSACTION-OS.md`)

| Categorie | Concreet voor deze slice |
|---|---|
| Policy-equivalentie | `tos`-sectie in `tests/policy-equivalentie.mjs`: rol × docState → verwachte `canExport`/`canAccess` |
| Negatieve rollen | verkoper/koper kan een niet-verstuurd `tos_document` niet lezen; begeleider van traject B niet dat van A; `tussen_code` nooit in een respons |
| Versioning | `PATCH` op een gekoppeld veld van een `APPROVED` instance → `SUPERSEDED`; oude review blijft aan de oude instance-versie |
| Invalidatie/divergentie | de zeven cases uit `TESTSTRATEGIE §4b` |
| Retention/purge | traject met tos_document + instances + reviews + manifest → purge → alle CONTENT-tabellen leeg, `tos_manifest` + `tos_audit_event` blijven, `tos_component*` ongemoeid |
| Gate-integriteit | `tosAssertEgress` op preview/download/email/api/zip/job + geen inhoud in errors/logs + AI-context respecteert een hold |
| Autoriteitsgrens | geen codepad zet `APPROVED` zonder reviewer; volledigheidscheck-teksten zijn statisch, geen AI; nergens "gecontroleerd door Koers voor Morgen" |
| Performance | een `tos_document` met 12 componenten openen ≤ ~8 D1-queries; divergentiecheck alleen bij een gekoppeld-veld-`PATCH` |
| Reproduceerbaarheid | exporteer v-n → purge → `GET …/manifest` levert block-/review-/disclaimer-refs zonder inhoud |

---

## 10. Open items die in de bouw landen

`O-01`..`O-05` · `S-01` (D1-performance — meet tijdens de bouw) · `S-02` (conflict-check: pas fase E,
mini-ADR) · `S-03` (structuur-extractie uit oude generatoren) · `S-04` (`tosAssertEgress` als de
concrete egress-implementatie). `P-01` (de 23-lijst hierboven is het voorstel; Marcel/Hans bevestigen
vóór de seed) · `P-02` (na de slice: LoI of NDA) · `P-03` (pool, fase E).

---

## 11. Deploy

Staging eerst (nieuwe tabellen, policy-laag, documentgeneratie naar tegenpartijen).
`SCHEMA_VERSION` +1. Volledige teststrategie groen. `predeploy.sh` (`audit-backend.mjs` +
`policy-equivalentie.mjs`) groen. Bestaande generatoren en alle overige features draaien ongewijzigd
door. Daarna productie via `scripts/deploy.sh`.

---

## 12. Volgende stap

`/code-review` op dit FASE B-ontwerp (datamodel, policy-interface, endpoints, cascade-dekking,
gate-integriteit). Daarna: implementeren in de volgorde FASE B 10→19 uit de master-spec, één
onderdeel tegelijk met een echte test per stap (werkregel 1), staging-first.
