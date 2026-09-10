# SPEC — MoU als eerste verticale slice

**Datum:** 2026-09-10 · **Status:** ter verificatie · **Context:** `MASTER-SPEC-TRANSACTION-OS.md` (D-04, D-16)

**Vervangt:** `SPEC-STAP-1-MOU-EN-VOETTEKST.md` deel 1B (MoU als losse template + `bgDoc('mou')`).
Deel 1A van dat document (reliance-voettekst op de bestaande generatoren) blijft geldig als losse
levering — zie `MASTER-SPEC` D-15.

---

## Waarom de MoU

Niet omdat het het belangrijkste document is, maar omdat het genoeg complexiteit heeft om
**blocks + binding-status + specialistreview + provenance + hard gates + reliance + versioning**
daadwerkelijk te testen, en klein genoeg is om laag-risico te zijn (de MoU is nieuw; de bestaande
generatoren blijven ongemoeid).

Als de slice werkt, is de LoI daarna grotendeels een nieuw `DocumentProfile` — niet opnieuw een
generator. Dat is de hefboom.

---

## Wat elke architectuurlaag alleen voor de MoU moet leveren

| Laag | Alleen voor de MoU-slice |
|---|---|
| **Transaction model** | Case/Transaction met de velden die de MoU-blocks voorvullen (partijen, object, structuur, indicatieve prijs, tijdpad, NDA-status, sector). Hergebruikt de bestaande `mna_trajecten` waar mogelijk; nieuwe velden alleen waar nodig. |
| **Provenance** | Elke voorgevulde waarde krijgt een type (`SOURCE_FACT` / `USER_FACT` / `AI_INFERENCE` / `CALCULATION` / `ASSUMPTION`) + bron. De indicatieve prijs uit de rekenkern = `CALCULATION` met parameters; een vrij ingetypte bandbreedte = `USER_FACT`. |
| **Block Framework** | De 23 fase-1-component*definities* (`SPEC-BLOCK-FRAMEWORK-V1.md`) — lege gestructureerde werkvelden, geen tekst. De MoU-`DocumentProfile` toont ze als menu; ~15 staan standaard aangevinkt. `BlockVersion` (structuur) append-only; de tekst per component ontstaat per dossier (AI-concept → specialist). |
| **Componentenmenu** | De adviseur en de specialist kiezen uit het menu welke componenten in de MoU komen, in welke volgorde, met een volledigheidscheck die aangeeft welke KERN-componenten ontbreken en waarom laat vastleggen leverage kost. |
| **Review engine** | `BlockReview` per `block_id@version`, statussen `REQUIRED → REQUESTED → IN_REVIEW → CHANGES_REQUESTED → APPROVED → REVOKED → SUPERSEDED`. Interim reviewer = `AdvisorReviewer` (de begeleider bevestigt met naam + datum, gelogd); dezelfde interface waar straks `LegalSpecialist` in past. |
| **Policy engine** | `canGenerate(case, 'MOU')`, `canExport(case, 'MOU')`, `requiredReviews(case, 'MOU')`, `requiredDisclaimer(case, 'MOU')`, `canAccess(user, resource)`, `canPublish(user, doc)`. Regels centraal, niet in `mna/04`. |
| **Document Composer** | Eén `DocumentProfile` (`MOU`): toegestane blocks, standaardblocks, volgorde, binding-defaults, required reviews, template, disclaimer, exportpolicy. |
| **Reliance/export** | Centrale `RELIANCE`-constante met `disclaimer_id + version + hash`; bij export opnieuw aangebracht; export zonder correcte reliance = geen geldige export. |
| **Audit** | Manifest-only (`ADR-AVG-AUDIT-MANIFEST.md`): documentversie, block-ID's + versies, review-ID's + hoedanigheid + status, disclaimer-versie, policy-versie, hashes, timestamps. |

Niets hoeft in deze slice al volledig generiek te zijn — maar wat gebouwd wordt, wordt zo ontworpen
dat LoI/NDA/dealvoorstel later dezelfde engine gebruiken (geen MoU-specifieke afslagen in de
gedeelde lagen).

---

## MoU-`DocumentProfile` (voorstel)

Standaardblocks, in volgorde:

```
parties · buyer · seller · target
transaction_scope · transaction_structure
indicative_price · price_mechanism · payment_terms
due_diligence · financing · conditions_precedent · timeline
exclusivity        (BINDING)
confidentiality    (BINDING)
costs              (BINDING)
governing_law      (BINDING)
jurisdiction       (BINDING)
binding_provisions        (samenvattend overzicht)
non_binding_provisions    (expliciete niet-bindendheid)
reliance
```

De begeleider kan binnen de `eligibility`-grenzen componenten uit het menu toevoegen/verwijderen
(bijv. `earn_out`, `change_of_control`, `announcements`, `non_compete`). De vier BINDING-componenten
worden in het document zichtbaar als bindend gemarkeerd. De volledigheidscheck toont welke
KERN-componenten nog niet zijn opgenomen.

---

## Acceptance criteria — de slice is klaar als een gebruiker kan:

1. een bestaand traject openen;
2. transactionele data gebruiken (voorgevuld, met zichtbaar provenance-type);
3. componenten kiezen uit het MoU-menu, met volledigheidscheck op de KERN-componenten;
4. per component de dataslots invullen (voorgevuld waar mogelijk);
5. een AI-concept in het vrije tekstveld van een component laten zetten, en dat als **concept**
   herkennen (`text_provenance = AI_INFERENCE`);
6. per component de provenance en de binding-status bekijken;
7. de vereiste specialistreview per component zien (`REQUIRED` / `APPROVED` / …);
8. als specialist (interim: `AdvisorReviewer`) de tekst **bewerken / vervangen / een component
   toevoegen of verwijderen / commentaar plaatsen / terugsturen / aftekenen** — waarna
   `text_provenance` `SPECIALIST_ASSESSMENT` wordt met naam + datum;
9. herkennen dat een **inhoudelijke wijziging ná `APPROVED`** (door de specialist óf de adviseur) de
   review op `SUPERSEDED` zet en een nieuwe review vereist;
10. een **divergentiewaarschuwing** zien wanneer een gekoppeld veld (bijv. exclusiviteitsduur)
    verschilt tussen de transactionele data, de professionele input en de documenttekst — binnen dit
    document en t.o.v. andere documenten van hetzelfde dossier;
11. de export laten **blokkeren** wanneer een vereiste review ontbreekt (hard gate, geen
    waarschuwing) — via **elke** route (preview, download, e-mail, API);
12. de reliance automatisch laten toevoegen (juiste versie + hash);
13. de definitieve versie exporteren (PDF + opslaan bij traject + verzendmail);
14. de audit trail / het manifest van die exportversie bekijken.

Pas wanneer alle 13 werken en de teststrategie groen is, uitbreiden naar het volgende documenttype
(`P-02`: LoI of NDA-migratie).

---

## Wat in deze slice bewust NIET zit

- De echte `LegalSpecialist` / `TaxSpecialist` / `ValuationSpecialist` rollen (fase E) — de slice
  gebruikt `AdvisorReviewer` op dezelfde interface.
- De specialistenpool.
- Redlining/commentaar-UI, document comparison, readiness-dashboard, timeline-UI.
- De overige ~100 blocks.
- Domeinspecifieke "niet-gereviewd"-disclaimers uit sectie 0.3 — die komen met de echte
  specialistrollen; in de slice geldt: interim-review vereist óf de begeleider zet `specialist_review`
  op `uit` (gelogd) en de sectie-0.3-disclaimer wordt gestempeld.

---

## Deploy

Staging eerst (nieuwe tabellen, policy-migratie, documentgeneratie naar tegenpartijen).
`SCHEMA_VERSION` ophogen. Volledige teststrategie groen vóór productie. De bestaande generatoren
blijven de hele tijd productief.
