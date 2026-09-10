# SPEC — Transaction Block Framework V1 (fase 1)

**Datum:** 2026-09-10 · **Versie:** 2 (correctie: componentenmenu blijft, tekstbibliotheek vervalt)
**Status:** ter verificatie · **Context:** `MASTER-SPEC-TRANSACTION-OS.md` §1a, D-05, D-07, P-01

---

## 1. Wat dit is — en wat het niet is

**Wel:** een **menu van componenten** waaruit de adviseur en de specialist een document samenstellen
(Hans' voorstel). Elk menu-item is een **leeg gestructureerd werkveld** met dataslots, één vrij
tekstveld, provenance en reviewstate. Het framework levert de structuur, de volgorde, de
volledigheidscheck en de reviewmechaniek.

**Niet:** een door Koers voor Morgen onderhouden bibliotheek van vooraf juridisch/fiscaal getoetste
clausuleteksten. Er is geen `content` = standaardtekst-met-placeholders op bibliotheekniveau. De
inhoudelijke tekst ontstaat **per dossier**: AI zet een concept in het vrije tekstveld, de bevoegde
specialist maakt daar de professionele versie van.

---

## 2. Twee niveaus

### 2a. Block-*definitie* (platformdata, geen persoonsgegevens, geen professionele inhoud)

```
block_id            stabiele sleutel, bijv. "exclusivity"
block_type          machine-leesbaar type
block_version       integer, monotoon; wijziging aan de STRUCTUUR = nieuwe versie (append-only)
category            PARTIES | TRANSACTION | ECONOMICS | PROCESS | LEGAL | VALUATION | TAX | DOCUMENT_STATUS
title              weergavenaam in het menu
data_fields        gestructureerde slots die uit de transactiedata gevuld kunnen worden
                   (bijv. exclusivity: duur, startdatum, wederkerig ja/nee)
free_text_slot     één vrij tekstveld per dossier-instance — LEEG in de definitie
review_domain      LEGAL | TAX | VALUATION | NONE
review_trigger     "altijd" | "bij vrije tekst / bewerking" | "nooit"
binding_default     BINDING | NON_BINDING | SUBJECT_TO_DOCUMENTATION | INFORMATIONAL
                   (default; per documentprofiel te overschrijven)
eligibility         welke DocumentProfiles dit component in het menu tonen
completeness_role   "kern" | "aanbevolen" | "optioneel"  — voedt de volledigheidscheck
status             DRAFT | ACTIVE | RETIRED   (nooit hard delete — SPEC-DATA-LIFECYCLE.md O-01)
created_by/at, updated_by/at
```

De definitie bevat **geen** clausuletekst, geen varianten met vaste formuleringen, geen juridisch
eigenaar en geen toetsdatum. Een structuurwijziging (veld erbij, andere dataslots) maakt een nieuwe
`block_version`.

### 2b. Block-*instance* (dossierdata, CONTENT-klasse, valt onder de 14/365-dagenretentie)

```
instance_id
dossier_id / document_version_id
block_id @ block_version
data_values        de ingevulde dataslots, elk met provenance-type + bron
text               de vrije tekst voor dit component in dit dossier
text_provenance    AI_INFERENCE (concept)  →  SPECIALIST_ASSESSMENT (na bewerking door specialist)
                                            →  USER_FACT (na bewerking door adviseur, buiten review)
binding_status     effectief voor dit document
review             koppeling naar BlockReview (zie §4)
instance_status    ACTIVE | REMOVED_IN_v<n>   (uit een document gehaald = geen hard delete;
                   blijft aan de vorige documentversie + het manifest gekoppeld — SPEC-DATA-LIFECYCLE RV-1)
last_changed_by / at
```

---

## 3. Het componentenmenu (de DocumentComposer)

Per `DocumentProfile` (MOU, later LoI/NDA/…) toont het menu de `eligibility`-componenten,
gegroepeerd per categorie:

```
DOCUMENT: MoU

KERN            [✓] Partijen        [✓] Transactiestructuur   [✓] Prijsmechanisme
                [✓] Exclusiviteit   [✓] Geheimhouding         [✓] Kostenverdeling
                [✓] Rechtskeuze     [✓] Niet-bindendheid      [✓] Reliance

AANBEVOLEN      [✓] Due diligence   [✓] Financiering          [✓] Tijdpad
                [ ] Voorbehouden

OPTIONEEL       [+] Earn-out                     [+] Change of control
                [+] Vermogensinstandhouding      [+] Non-concurrentie
                [+] Managementcontinuïteit       [+] Aankondigingen
```

Per component in het menu: titel, `binding_status`, reviewstatus, versie, en welke dataslots nog
leeg zijn. De **volledigheidscheck** toont welke KERN-componenten ontbreken.

**Grens (RV-5):** de volledigheidscheck noemt alleen **generiek verwachte componenten** met een
**generieke, vooraf één keer geschreven en gereviewde** toelichting ("een MoU/LoI bevat gewoonlijk
een change-of-control-bepaling; wie dat pas in de SPA regelt, geeft leverage weg"). Nooit een
casus-specifiek oordeel ("in jouw situatie heb je X nodig vanwege Y"). De toelichtingsteksten zijn
platform-copy, geen AI-generatie per dossier, en dragen zelf de reliance-disclaimer. De check
adviseert niet, hij inventariseert.

De adviseur bepaalt de selectie en de volgorde; de specialist kan binnen zijn domein componenten
toevoegen of verwijderen (een verwijdering = `instance_status = REMOVED_IN_v<n>`, geen hard delete).

---

## 4. Review op instance-niveau

`BlockReview` hangt aan `block_id @ block_version @ dossier` (dus aan de instance, niet aan een
abstracte bibliotheektekst). Statussen: `REQUIRED → REQUESTED → IN_REVIEW → CHANGES_REQUESTED →
APPROVED → REVOKED → SUPERSEDED`.

- `review_trigger = "altijd"`: het component moet worden afgetekend vóór export.
- `review_trigger = "bij vrije tekst / bewerking"`: aftekening pas nodig zodra er tekst in het vrije
  veld staat of een dataslot is aangepast.
- **Iedere inhoudelijke wijziging ná `APPROVED` zet de review op `SUPERSEDED`/`REVOKED`** en vereist
  een nieuwe review — ongeacht of de specialist óf de adviseur wijzigt (`MASTER-SPEC` D-10).

---

## 5. De fase-1-componentenlijst (voorstel, `REQUIRES PRODUCT DECISION` P-01)

Gekozen op wat een MoU en een LoI beide nodig hebben. 23 componenten. Dit zijn **werkveld-definities**,
geen teksten.

| Categorie | Componenten |
|---|---|
| PARTIES | `parties` · `buyer` · `seller` · `target` |
| TRANSACTION | `transaction_scope` · `transaction_structure` |
| ECONOMICS | `indicative_price` · `price_mechanism` · `payment_terms` |
| PROCESS | `due_diligence` · `financing` · `conditions_precedent` · `timeline` |
| LEGAL | `confidentiality` · `exclusivity` · `costs` · `governing_law` · `jurisdiction` · `announcements` |
| DOCUMENT_STATUS | `binding_provisions` · `non_binding_provisions` · `reliance` |

Per component: `data_fields`, `review_domain`, `review_trigger`, `binding_default`,
`completeness_role`. Voorbeeld:

```
exclusivity
  data_fields:      duur (dagen), startdatum, wederkerig (bool)
  review_domain:    LEGAL
  review_trigger:   bij vrije tekst / bewerking
  binding_default:  BINDING
  completeness_role: kern
  eligibility:      [MOU, LOI]
```

**Ruimte voor 3–5 extra componenten** als de concrete MoU-use case dat vereist (kandidaten:
`earn_out`, `change_of_control`, `net_worth_undertaking`, `management_continuity`, `non_compete`) —
toevoegen met een use-case-onderbouwing, niet preventief. De overige ~100 componenten uit Marcels
catalogus: alleen als toekomstig menu-item beschreven, niet gebouwd.

**ECONOMICS-componenten worden gevoed door de bestaande rekenkern** (`MASTER-SPEC` D-18). De
dataslots van `indicative_price`, `price_mechanism` en `payment_terms` — en later een expliciete
`valuation`-component — krijgen hun waarden uit `mna/03-rekenkern-waardering.js` en de
backend-waarderingslogica, met `provenance = CALCULATION` (welke figuur, welk model, welke
parameters). De rekenkern en alle modellen (DCF, multiples, goodwill/overwinst, synergie, scenario,
earn-out, vendor loan, aandelenruil, bod-vergelijker, opbrengst-brug, onderhandelruimte, BATNA)
blijven ongewijzigd. De waarderingsspecialist reviewt de *inputs* (add-backs, multiple, aannames)
en tekent de *uitkomst* af; de formules veranderen niet (werkregel 13).

---

## 6. AI-rol (D-07)

Per component maakt AI een **substantieel conceptvoorstel** in het vrije tekstveld, op basis van de
ingevulde dataslots en de dealcontext — **precies zoals de bestaande jura-generatoren dat nu doen**.
Dit geldt voor juridische componenten (concept-exclusiviteitsbepaling, concept-geheimhoudingsclausule,
concept-kostenverdeling) én voor fiscale componenten (concept-fiscale aandachtsnotitie,
concept-structureringsoverweging). De output is altijd `text_provenance = AI_INFERENCE`, zichtbaar
als **concept, geen advies**.

Optioneel kan de adviseur een eigen sjabloon uploaden dat het AI-concept seed; dat sjabloon wordt
getoond met het label "eerdere sjabloontekst, niet getoetst — vervang door specialist-input". Koers
voor Morgen onderhoudt en garandeert die sjabloontekst niet.

Zodra de specialist of de adviseur de tekst wijzigt:

- is AI **niet meer eigenaar** van die tekst; `text_provenance` wordt `SPECIALIST_ASSESSMENT` (bij de
  specialist) of `USER_FACT` (bij de adviseur);
- AI mag die tekst daarna **niet ongevraagd "verbeteren", herschrijven of van betekenis veranderen**.
  Een verzoek om herformulering levert een nieuw concept in een aparte laag; overnemen is een
  expliciete handeling van een mens, die daarmee eigenaar wordt.

Technisch afgedwongen (de composer levert de instance-tekst letterlijk door) en in de testsuite
(`TESTSTRATEGIE-TRANSACTION-OS.md` §Autoriteitsgrens).

---

## 7. Wat er juridisch nog moet gebeuren — beperkt

- **Geen standaardclausules opstellen.** Die verantwoordelijkheid ligt bij de specialist per dossier.
- Wel: de `reliance`-tekst per versie (`L-03`), de MoU-`DocumentProfile`-template (kopjes/kader), en
  de bepalingen in VOK/GV + specialistovereenkomst dat de specialist verantwoordelijk is voor zijn
  professionele inhoud en het platform de workflow faciliteert (`L-04`).

---

## 8. Verhouding tot de bestaande generatoren (`S-03`)

Uit de bestaande NDA/LoI/BEM-templates wordt alleen de **structuur** overgenomen (welke componenten
een document heeft, welke dataslots). De clausuletekst in die templates wordt **niet** een
bibliotheek; hij kan hooguit als niet-bindende suggestie aan de adviseur worden getoond met een
duidelijk label "eerdere sjabloontekst, niet getoetst, vervang door specialist-input". De oude
generatoren blijven ongemoeid tot hun documenttype een composer-profiel heeft (fase D).
