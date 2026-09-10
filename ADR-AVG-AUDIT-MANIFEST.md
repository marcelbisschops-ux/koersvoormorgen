# ADR — AVG versus reproduceerbaarheid: audit manifest ≠ content archive

**Datum:** 2026-09-10 · **Status:** VOORGESTELD · **`REQUIRES LEGAL VALIDATION`**
**Context:** `MASTER-SPEC-TRANSACTION-OS.md` (D-01, L-01, L-02, RV-3), `SPEC-DATA-LIFECYCLE.md`

> **Presenteer dit niet als reeds juridisch vastgesteld.** Geen implementatie van langdurige
> auditbewaring vóór expliciete validatie door de jurist.

---

## Het probleem

De Transaction OS-architectuur wil dat een officieel document jaren later exact reproduceerbaar is:
welke gegevens, bronnen, blocks, reviews en disclaimer waren onderdeel van dit exacte document?

De bestaande, net vastgelegde bewaartermijn (VOK Artikel 5 v1.7, GV v2.2) zegt:

- trajectinhoud wordt **14 dagen na afsluiting** van het traject verwijderd;
- **maximaal 365 dagen** wanneer daarvoor tussen Gebruiker en Bisschops Financing een geldige,
  onderbouwde bewaartermijn is overeengekomen;
- daarna volledige verwijdering, op een minimale archiefregel na.

Feiten, evidence en documentinhoud **zijn persoonsgegevens**. "Reproduceer het volledige document
inclusief facts en evidence" botst dus frontaal met de bewaartermijn. Deze tegenstrijdigheid is
load-bearing en moet vóór FASE B worden opgelost.

---

## Voorgestelde beslissing

Scheid twee dingen die de oorspronkelijke spec op één hoop gooide:

### `CONTENT ARCHIVE` — volgt het bestaande bewaarbeleid

De inhoudelijke laag: transaction-data, facts, evidence, documentinhoud, de vrije tekst per
component-instance (AI-concept én specialist-input), gegenereerde documenten. Wordt verwijderd
volgens de bestaande 14/365-dagenretentie. **De nieuwe architectuur gaat niet uit van onbeperkte
opslag van dossierinhoud — ook niet van professionele input van de specialist.**

### `AUDIT MANIFEST` — mogelijk langdurig, mits geen persoonsgegevens

Een compact, onveranderlijk record per officiële export dat vastlegt *wat* is goedgekeurd op *welke
versie*, zonder de inhoud zelf. Kandidaat-velden:

| Veld | Persoonsgegeven? |
|---|---|
| document-ID | nee |
| documentversie | nee |
| documenttype / `DocumentProfile`-ID + versie | nee |
| block-ID's | nee |
| block-versies | nee |
| review-ID's | nee |
| reviewer-hoedanigheid (bijv. "advocaat", "RB", "Register Valuator") | **te toetsen** — hoedanigheid zonder naam is vermoedelijk geen persoonsgegeven, mét naam wel |
| review-status per block | nee |
| timestamps (created, reviewed, exported) | nee |
| policy-engine-versie | nee |
| disclaimer/reliance-versie + hash | nee |
| content-hash van het geëxporteerde document | nee (hash, niet omkeerbaar) |
| manifest-hash | nee |

**Wat er expliciet NIET in het manifest staat:** namen, e-mailadressen, bedrijfsnamen, bedragen,
clausuletekst, DD-bevindingen, bronnen, citaten, IP-adressen, elke vrije tekst uit het dossier.

### Wat "reproduceren" dan betekent

Niet: het document opnieuw genereren. Wel: **aantonen wat er is goedgekeurd** — "documentversie 8
bestond uit block X@v4 (jurist-goedgekeurd op datum, review-ID …), block Y@v2 (…), disclaimer v6
(hash …); de content-hash van de export was …". Dat is een auditspoor, geen kopie van de inhoud.

---

## `REQUIRES LEGAL VALIDATION` — vragen aan de jurist

1. Is het manifest zoals hierboven gedefinieerd **geen** verzameling persoonsgegevens, zodat het
   buiten de 14/365-dagenretentie mag vallen?
2. Mag "reviewer-hoedanigheid" (zonder naam) in het manifest? Of moet ook dat na de purge weg, en
   volstaat een geanonimiseerde rol ("juridische review uitgevoerd: ja, datum …")?
3. Is een content-hash van een verwijderd document toelaatbaar om langdurig te bewaren (het is
   onomkeerbaar, maar wel afgeleid van persoonsgegevens)?
4. Hoe lang mag/moet het manifest bewaard blijven? Gelijk aan de bestaande `mna_audit`-uitzondering
   (P4-besluit 25 juli 2026: bewust bewaard), of een eigen termijn?
5. Volstaat het manifest als bewijsmiddel bij een geschil over wat er is goedgekeurd, of is daarvoor
   toch de inhoud nodig — en zo ja, valt dat traject dan onder de 365-dagen-verlenging met een
   "lopend of dreigend geschil"-grondslag (die staat al in VOK Art. 5)?

---

## Antwoord op reviewvraag RV-3 — wat blijft na de AVG-purge

| Blijft | Verdwijnt |
|---|---|
| Audit manifest (bovenstaande velden) | Alle transaction-data, facts, evidence |
| Audit events (append-only, geanonimiseerd — actor-rol i.p.v. actor-naam waar de purge dat eist) | Alle documentinhoud en de vrije tekst per component (AI-concept én specialist-input) |
| Content-/document-/disclaimer-hashes | Gegenereerde documenten (PDF/tekst) |
| De bestaande minimale archiefregel uit VOK Art. 5 (trajectnaam, sector, type, data, betrokken partijen) — ongewijzigd | Reviews-met-inhoud (opmerkingen, redlines); alleen de review-ID + status + versie + hoedanigheid blijven in het manifest |
| `mna_audit` zoals nu (bestaande uitzondering) | Snapshots met inhoud |

De datalifecycle per object staat volledig in `SPEC-DATA-LIFECYCLE.md`.

---

## Consequenties

- **Positief:** de architectuur kan reproduceerbaarheid/auditability claimen zonder de AVG-belofte te
  breken; het manifest is klein en goedkoop op te slaan; geen conflict met de VOK die we net live
  hebben gezet.
- **Negatief:** "reproduceren" is beperkter dan "regenereren" — bij een echt geschil over de
  *inhoud* van een oud document is het manifest alleen bewijs van goedkeuring, niet van tekst. Dat
  is een bewuste keuze; de 365-dagen-geschilgrondslag in VOK Art. 5 vangt de acute gevallen op.
- **Afhankelijkheid:** FASE B mag pas mergen als deze ADR `DECIDED` is.
