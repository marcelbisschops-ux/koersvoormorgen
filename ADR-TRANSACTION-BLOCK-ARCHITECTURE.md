# ADR — Transaction Block + Composer architectuur

**Datum:** 2026-09-10 · **Status:** VOORGESTELD (wacht op GO/NO-GO van Marcel + jurist)
**Context:** `MASTER-SPEC-TRANSACTION-OS.md`

---

## Beslissing

Koers voor Morgen wordt gebouwd rond één transactioneel regieplatform:

```
ONE TRANSACTION DATA MODEL
 → ONE EVIDENCE / PROVENANCE LAYER
 → ONE TRANSACTION BLOCK LIBRARY
 → ONE REVIEW ENGINE
 → ONE POLICY ENGINE
 → ONE DOCUMENT COMPOSER
 → MANY DOCUMENT TYPES (NDA, LoI, MoU, teaser, memorandum, dealvoorstel, later SPA e.a.)
```

Documenten zijn composities van herbruikbare, geversioneerde **blocks**. Ze krijgen geen eigen
inhoudelijke generatielogica. Het kernprincipe is **REGIE, GEEN AUTORITEIT** (sectie 0 van
`ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`), technisch afgedwongen.

## Status van deze beslissing

`DECIDED` als doelarchitectuur. De **implementatie** verloopt via verticale slices (de MoU eerst),
niet als big-bang. Zie `MASTER-SPEC-TRANSACTION-OS.md` §6.

---

## Waarom

**Het probleem vandaag.** NDA, LoI, BEM, dealvoorstel, teaser en verkoopmemorandum hebben elk hun
eigen generatiecode, prompts en templates. Elke nieuwe wens (MoU, dan een clausulemenu, dan
specialistrollen) wordt er als losse feature bijgebouwd en moet later worden opengebroken. Provenance,
review en versiebeheer zijn per document opnieuw geregeld of afwezig.

**Wat de blockarchitectuur oplost:**

1. **Geen duplicatie van documentlogica.** `parties`, `price_mechanism`, `exclusivity`,
   `confidentiality` bestaan één keer; LoI en MoU verschillen alleen in selectie, volgorde, context,
   binding-status en presentatie.
2. **Provenance centraal.** Elke block draagt zijn bron/versie/toetsdatum; een document erft dat.
3. **Review schaalbaar.** Een jurist tekent `exclusivity@v4` + `governing_law@v3` af, niet "de hele
   LoI". Een kleine wijziging aan één clausule triggert geen volledige her-review.
4. **Versiegebonden goedkeuring.** `APPROVED` geldt alleen voor de exacte `block_id@version`; nieuwe
   versie → oude review `SUPERSEDED`.
5. **Auditability.** Een officieel document verwijst naar exacte blockversies + reviews + disclaimer-
   versie; het is reproduceerbaar via het manifest (`ADR-AVG-AUDIT-MANIFEST.md`).
6. **Nieuwe documenttypen = configuratie.** Een `DocumentProfile` (toegestane blocks, defaults,
   volgorde, required reviews, template, disclaimer, exportpolicy) — geen nieuwe code.
7. **AI wordt een compositorische laag** bovenop gestructureerde data i.p.v. de bron van waarheid.

---

## Alternatieven en waarom niet

| Alternatief | Waarom niet |
|---|---|
| **Afzonderlijke documentgeneratoren** (huidige situatie) | Duplicatie, geen centrale governance, review per document is niet schaalbaar, elke nieuwe feature breekt latere op |
| **Eén grote AI-prompt per documenttype** | Geen provenance, geen versiegebonden review, AI wordt de facto de bron van waarheid, niet reproduceerbaar, hallucinatierisico op juridische tekst |
| **Template-only model** (vaste sjablonen, alleen placeholder-fill) | Geen modulariteit, geen block-level review, elke clausulevariant is een nieuw sjabloon, geen volledigheidslogica |

---

## Consequenties

### Positief

- Hergebruik van clausules en logica over alle documenttypen.
- Consistente governance: één plek voor provenance, review, gates, reliance.
- Schaalbare specialistreview (per block, per versie).
- Betere auditability en reproduceerbaarheid.
- Nieuwe documenttypen (SPA, aandeelhoudersovereenkomst, disclosure letter) worden goedkoop.

### Negatief / kosten

- **Initieel complexer datamodel.** Meer tabellen (blocks, versies, reviews, profielen, manifest,
  snapshots). Ontwerp eerst, UI later.
- **De blockbibliotheek vereist doorlopend juridisch onderhoud.** Elke standaardpassage heeft een
  juridisch eigenaar, toetsdatum en versiebeheer; een wijziging = her-toetsing. Aparte werkstroom
  met eigen budget (`LEGAL CONTENT LIBRARY`).
- **Migratie-inspanning.** De bestaande generatoren moeten geleidelijk worden ontmanteld;
  client-side checks moeten naar de policy engine.
- **De policy engine wordt kritieke infrastructuur.** Eén bug = of legitiem werk hard geblokkeerd,
  of een lek. Vereist een equivalentie-testharnas vanaf de eerste commit en gating op elke
  regelwijziging.
- **D1/Worker-druk.** Diepe versionering + append-only audit + snapshots per export is schrijf-zwaar
  en groeit; moet passen binnen de bestaande DB-realiteit (`initDB` was al traag). Technische spike
  vereist.

---

## Mitigaties

- **Verticale slices** in plaats van big-bang: elke architectuurlaag alleen zo ver bouwen als de
  MoU-slice die nodig heeft.
- **Blockbibliotheek klein starten** (~23 blocks), rest als toekomstcatalogus.
- **Juridische content als aparte werkstroom** met eigen planning en acceptance.
- **Policy-equivalentietests** (`tests/policy-equivalentie.mjs`) uitbreiden vóór elke migratiestap;
  geen client-side check verwijderen zonder gedekte equivalent in de engine.
- **Datalifecycle expliciet ontwerpen** (`SPEC-DATA-LIFECYCLE.md`) zodat versionering/audit de
  14/365-dagenretentie niet omzeilen.
- **Gate-integriteit** als expliciete ontwerpeis: één egress-policy over alle uitgangsroutes.

---

## Terugdraaibaarheid

De bestaande generatoren blijven tijdens de hele migratie productief. Faalt de blockarchitectuur op
de MoU-slice, dan is er geen productieregressie: de MoU is nieuw, de rest is ongemoeid. Dat maakt de
slice een echte, laag-risico proeftuin.
