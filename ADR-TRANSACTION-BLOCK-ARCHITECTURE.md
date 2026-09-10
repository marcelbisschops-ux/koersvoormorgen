# ADR — Transaction Block + Composer architectuur

**Datum:** 2026-09-10 · **Status:** VOORGESTELD (wacht op GO/NO-GO van Marcel + jurist)
**Context:** `MASTER-SPEC-TRANSACTION-OS.md`

---

## Beslissing

Koers voor Morgen wordt gebouwd rond één transactioneel regieplatform:

```
ONE TRANSACTION DATA MODEL
 → ONE EVIDENCE / PROVENANCE LAYER
 → ONE TRANSACTION BLOCK FRAMEWORK   (lege gestructureerde werkvelden, geen kennisbank)
 → ONE REVIEW ENGINE
 → ONE POLICY ENGINE
 → ONE DOCUMENT COMPOSER              (componentenmenu + volledigheidscheck)
 → MANY DOCUMENT TYPES (NDA, LoI, MoU, teaser, memorandum, dealvoorstel, later SPA e.a.)
```

Documenten zijn composities van herbruikbare, geversioneerde **componenten** die de adviseur en de
specialist uit een menu kiezen. Een component is een leeg gestructureerd werkveld (dataslots + één
vrij tekstveld + provenance + reviewstate); AI zet er een concept in, de specialist maakt de
professionele tekst. Documenten krijgen geen eigen inhoudelijke generatielogica, en het platform
onderhoudt **geen** bibliotheek van professionele standaardteksten. Het kernprincipe is
**REGIE, GEEN AUTORITEIT** (sectie 0 van `ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`), technisch
afgedwongen. Zie `MASTER-SPEC-TRANSACTION-OS.md` §1a.

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
| **Template-only model** (vaste sjablonen, alleen placeholder-fill) | Geen modulariteit, geen component-level review, geen volledigheidslogica |
| **Componentenmenu mét onderhouden clausuletekstbibliotheek** | Maakt het platform zwaar, duur en aansprakelijkheidsgevoelig; botst met "regie, geen autoriteit"; doorlopend juridisch onderhoud. Geschrapt door Marcel op 2026-09-10 (`MASTER-SPEC` §1a). Het menu blijft, de tekstbibliotheek niet. |

---

## Consequenties

### Positief

- Hergebruik van **structuur** (welke componenten een documenttype heeft) over alle documenttypen.
- Consistente governance: één plek voor provenance, review, gates, reliance.
- Schaalbare specialistreview (per component, per versie, per dossier).
- Betere auditability en reproduceerbaarheid.
- Nieuwe documenttypen (SPA, aandeelhoudersovereenkomst, disclosure letter) worden goedkoop.
- **Licht platform, buiten de professionele-aansprakelijkheidssfeer.** Geen onderhouden juridische
  kennisbank; de specialist is verantwoordelijk voor zijn inhoud.

### Negatief / kosten

- **Initieel complexer datamodel.** Meer tabellen (component-definities, versies, dossier-instances,
  reviews, profielen, manifest, snapshots). Ontwerp eerst, UI later.
- **Zonder specialist blijft een document juridisch "concept".** Dat is bedoeld: het platform tekent
  niet zelf af. Wel wringt het als een adviseur snel iets wil versturen zonder specialist — daarvoor
  is de opt-out-met-disclaimer uit sectie 0.3.
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
- **Block Framework klein starten** (~23 component-definities), rest als toekomstig menu.
- **Geen juridische tekstwerkstroom.** De specialist levert de professionele tekst per dossier; het
  platform onderhoudt geen kennisbank (`MASTER-SPEC` §1a).
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
