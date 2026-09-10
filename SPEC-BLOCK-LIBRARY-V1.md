# SPEC — Block Library V1 (fase 1)

**Datum:** 2026-09-10 · **Status:** ter verificatie · **Context:** `MASTER-SPEC-TRANSACTION-OS.md` (D-05, D-06, D-07, P-01)

De ~120-blockcatalogus uit Marcels master-spec is het **doelbeeld**. Fase 1 = maximaal ~23 blocks,
precies genoeg om de MoU-slice te bouwen en zó ontworpen dat LoI/NDA later dezelfde blocks gebruiken.

---

## 1. Block-schema

```
block_id            stabiele sleutel, bijv. "exclusivity"
block_type          machine-leesbaar type
block_version       integer, monotoon; elke wijziging = nieuwe versie (append-only)
category            PARTIES | TRANSACTION | ECONOMICS | PROCESS | LEGAL | DOCUMENT_STATUS
title               weergavenaam
content             standaardtekst met genummerde placeholders  ({{party_seller_name}} enz.)
variants            0..n benoemde varianten (bijv. exclusivity: wederzijds / eenzijdig-koper)
fields              invulvelden: naam, type, verplicht, bron-hint (voorvullen uit transaction data)
binding_status      BINDING | NON_BINDING | SUBJECT_TO_DOCUMENTATION | INFORMATIONAL
review_domain       LEGAL | TAX | VALUATION | NONE
review_required     bool  (of: "alleen bij bewerking / vrije tekst")
eligibility         welke DocumentProfiles deze block mogen gebruiken
status              DRAFT | ACTIVE | RETIRED   (nooit DELETE — zie SPEC-DATA-LIFECYCLE.md O-01)
legal_owner         wie de tekst juridisch bezit  (LEGAL CONTENT LIBRARY)
reviewed_on         datum juridische toetsing van deze versie
source_ref          herkomst van de standaardtekst
created_by / at, updated_by / at
```

Een `BlockVersion` is onveranderlijk. `exclusivity@v3` → `exclusivity@v4` bij elke inhoudelijke
wijziging; oude reviews blijven aan v3 gekoppeld en worden `SUPERSEDED`.

---

## 2. De fase-1-blocklijst (voorstel, `REQUIRES PRODUCT DECISION` P-01)

Gekozen op basis van wat een MoU en een LoI beide nodig hebben. 23 blocks.

### PARTIES (4)

| block_id | binding | review_domain |
|---|---|---|
| `parties` | INFORMATIONAL | LEGAL |
| `buyer` | INFORMATIONAL | LEGAL |
| `seller` | INFORMATIONAL | LEGAL |
| `target` | INFORMATIONAL | LEGAL |

### TRANSACTION (2)

| `transaction_scope` | NON_BINDING | LEGAL |
| `transaction_structure` | NON_BINDING | LEGAL |

### ECONOMICS (3)

| `indicative_price` | NON_BINDING | VALUATION |
| `price_mechanism` | SUBJECT_TO_DOCUMENTATION | LEGAL |
| `payment_terms` | SUBJECT_TO_DOCUMENTATION | LEGAL |

### PROCESS (4)

| `due_diligence` | NON_BINDING | LEGAL |
| `financing` | NON_BINDING | LEGAL |
| `conditions_precedent` | NON_BINDING | LEGAL |
| `timeline` | NON_BINDING | NONE |

### LEGAL (7)

| `confidentiality` | BINDING | LEGAL |
| `exclusivity` | BINDING | LEGAL |
| `costs` | BINDING | LEGAL |
| `governing_law` | BINDING | LEGAL |
| `jurisdiction` | BINDING | LEGAL |
| `notices` | INFORMATIONAL | LEGAL |
| `announcements` | BINDING | LEGAL |

### DOCUMENT_STATUS (3)

| `binding_provisions` | INFORMATIONAL | LEGAL |
| `non_binding_provisions` | INFORMATIONAL | LEGAL |
| `reliance` | INFORMATIONAL | NONE (centraal beheerd, zie `MASTER-SPEC` L-03) |

**Ruimte voor 3–5 extra blocks** als de concrete MoU-use case van Marcel/Hans dat aantoonbaar
vereist (kandidaten: `earn_out`, `management_continuity`, `non_compete`, `subject_to_documentation`
als losse notice, `regulatory_approval`). Toevoegen alleen met een use-case-onderbouwing, niet
preventief.

Alle overige blocks uit de ~120-catalogus: **alleen als toekomstige catalogus beschreven**, niet
gebouwd, niet juridisch getoetst tot er een documentprofiel is dat ze nodig heeft.

---

## 3. Twee gescheiden werkstromen

### `SOFTWARE WORK`

Het block-datamodel, de versionering, de composer, de review-koppeling, de policy-gates, de
placeholder-invulling, de tests. Levert een **leeg** blocksysteem dat werkt zodra er blocktekst in
zit.

### `LEGAL CONTENT LIBRARY`

Voor elke van de 23 blocks: standaardtekst, toegestane varianten, invulvelden, binding-status,
reviewvereiste, versie, juridisch eigenaar, toetsdatum. **Dit is geen automatisch gevolg van de
softwarebouw.** Aparte planning, budget en acceptance. Zonder deze werkstroom is de MoU-slice
technisch klaar maar juridisch leeg.

Acceptance per block: (a) tekst getoetst en gedateerd door een benoemde jurist; (b) binding-status
expliciet vastgesteld; (c) varianten en invulvelden compleet; (d) opgenomen in het versiebeheer met
`reviewed_on`.

---

## 4. AI-invariant (D-07)

Bij een block met `status=ACTIVE` en een geldige juridische toetsing mag de AI **uitsluitend**:
placeholders invullen, toegestane parameters/varianten verwerken, blockvolgorde verzorgen, en
verbindende **niet-juridische** tekst genereren waar het profiel dat toestaat.

De AI mag **niet**: woorden wijzigen, zinnen herschrijven, juridische betekenis veranderen, een
goedgekeurde block "verbeteren". Nodig een inhoudelijke wijziging? → nieuwe `block_version` → nieuwe
review. Technisch afgedwongen (de composer levert approved-blocktekst letterlijk door) en in de
testsuite (`TESTSTRATEGIE-TRANSACTION-OS.md` §Clause-integriteit).

---

## 5. Verhouding tot de bestaande generatoren

De huidige NDA/LoI/BEM-templates bevatten al bruikbare clausuletekst. `S-03` (technische spike):
extraheer daaruit de kandidaat-standaardteksten voor `confidentiality`, `exclusivity`,
`governing_law`, `costs` enz., leg ze voor aan de jurist voor de `LEGAL CONTENT LIBRARY`, en laat de
oude generatoren ongemoeid tot hun documenttype een composer-profiel heeft (fase D).
