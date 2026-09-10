# SPEC — Stap 1: MoU-generator + reliance-voettekst

**Hoort bij:** `ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`, bouwvolgorde stap 1.
**Datum:** 2026-09-10 · **Status:** ter verificatie door Marcel, nog niet gebouwd.
**Doel:** het ontbrekende opstapdocument (MoU / term sheet) toevoegen, en meteen het laatste
open FASE6-puntje afmaken: de zichtbare disclaimer-voettekst op alle gegenereerde documenten.

Twee losse deelleveringen, samen één stap.

---

## Deel 1A — Reliance-voettekst op alle gegenereerde documenten

### Wat

Een vaste, niet door de gebruiker of de AI te wijzigen slotregel onder elk document dat het
platform genereert en onder de dossier-export:

> "Dit document is via het Koers voor Morgen-platform opgesteld als hulpmiddel voor de begeleidende
> adviseur en diens opdrachtgever. Het is geen professioneel advies of taxatierapport en is niet
> bestemd voor gebruik door derden."

Dit is de tekst die de jurist in ronde 2 heeft goedgekeurd.

### Waar hij verschijnt

| Bron | Plek |
|---|---|
| `bgDoc()` — NDA, LoI, BEM, exclusiviteitsbrief (`mna/04`) | onderaan de gegenereerde tekst, vóór de bestaande "AI-gegenereerd (bèta)"-melding; en als slotblok in print/PDF; en als vaste alinea in de verzendmail |
| Dealvoorstel (`dealvoorstel_tekst`) | onderaan het document en in de mail |
| Teaser, verkoopmemorandum | onderaan |
| Biedingsbrief, SPA, closing-checklist | onderaan |
| DD-dossier ZIP-export (worker) | in het omslag/indexbestand van de ZIP |
| MoU (deel 1B) | onderaan |

### Hoe

- **Eén constante** (`RELIANCE_VOETTEKST`) in `mna/04` (frontend-generatie) en dezelfde string in
  `worker/02-config-constanten.js` (voor de mail-endpoints en de ZIP-export). Byte-identiek houden,
  net als bij `VOK_TEKST`.
- **Niet in de AI-prompt.** De generator/print/mail-code plakt de voettekst er ná de documenttekst
  bij, zodat de AI hem niet kan weglaten of herschrijven en de gebruiker hem niet uit het tekstvak
  kan knippen: bij verzenden/printen wordt hij opnieuw aangehecht, ongeacht wat er in het tekstvak
  staat.
- **Print/PDF:** als herhalende voetregel op elke pagina óf als slotblok (implementatiekeuze;
  slotblok is het eenvoudigst en juridisch voldoende).
- **Eigen PDF-upload** (`bgPdfStaat`): de voettekst kan niet in een geüpload PDF worden geïnjecteerd;
  in plaats daarvan draagt de begeleidende e-mail de disclaimer, en het platform logt dat een
  eigen-PDF is gebruikt.

### Verhouding tot sectie 0

Dit is de **basislaag**. Hij staat er altijd. De domeinspecifieke disclaimers uit sectie 0.3
("niet beoordeeld door een jurist/fiscalist/waarderingsspecialist") komen er in stap 3 bovenop
wanneer een aftekening is uitgeschakeld.

### Tests

- `scripts/check-contract-output.mjs`: de voettekststring aanwezig in elk gegenereerd
  NDA/LoI/BEM/excl/MoU.
- `scripts/check-dealvoorstel-output.mjs`: aanwezig in het dealvoorstel.
- `tests/audit-consistentie.mjs`: statische check dat de constante bestaat en dat elke
  generatie-/print-/mail-route ernaar verwijst (patroon van check 8/9).
- Handmatig: van elk documenttype één genereren, voettekst controleren op scherm + in de PDF +
  in de ontvangen e-mail.

### Buiten scope 1A

Clausuleteksten wijzigen; de domeinspecifieke disclaimers (stap 3).

---

## Deel 1B — MoU-generator

### Wat een MoU hier is

Een kort (1–2 pagina's), grotendeels **niet-bindend** document dat vastlegt wat partijen na het
eerste contact op hoofdlijnen zijn overeengekomen, vóór de LoI en de diepe due diligence.

### Plek in de flow

In de documentenflow van het begeleider-dashboard, tussen kennismaking/teaser en de LoI:

`Teaser → (NDA) → MoU → LoI → BEM/Excl → Dealvoorstel → SPA → Closing-checklist`

### Vaste inhoud (de MoU-clauseset)

| # | Clausule | Bindend? |
|---|---|---|
| 1 | Partijen (verkoper, koper; de begeleider begeleidt het proces) | nee |
| 2 | Object van de beoogde transactie (aandelen / activa-passiva; welke entiteit; welk % belang) | nee |
| 3 | Indicatieve koopprijs en -structuur (bandbreedte of vast bedrag; cash / earn-out / vendor loan / aandelen op hoofdlijnen; prijsmechanisme locked box vs. completion accounts indien bekend, anders "nader te bepalen") | nee |
| 4 | Beoogd tijdpad (LoI-datum, DD-periode, streefdatum signing/closing) | nee |
| 5 | Exclusiviteit (duur; wederzijds of eenzijdig) | **ja** |
| 6 | Geheimhouding (verwijzing naar de getekende NDA, of korte bepaling) | **ja** |
| 7 | Kostenverdeling (ieder draagt eigen kosten, tenzij anders) | **ja** |
| 8 | Voorbehouden (goedkeuring bestuur/aandeelhouders/financier; bevredigende DD) | nee |
| 9 | Rechtskeuze en forum | **ja** |
| 10 | Uitdrukkelijke niet-bindendheid: behalve de als bindend aangemerkte clausules schept dit document geen verplichting tot het aangaan van de transactie | n.v.t. |
| 11 | Reliance-voettekst (deel 1A) | n.v.t. |

De bindende clausules worden in het document **zichtbaar als bindend gelabeld**.

### Hoe het wordt gegenereerd (zel-fde patroon als de bestaande generatoren)

- Marcel uploadt in marilyn → Sjablonen een template van type `mou` (en optioneel `mou_koper`,
  `mou_opvolging`), net als `nda` / `loi` / `bem_verk`.
- Backend:
  - `GET /mna/template/mou` (bestaande template-route, nieuw type toegevoegd aan de lijst).
  - `POST /mna/mou/email` — spiegelt `/mna/nda/email` en `/mna/loi/email` (auth via `x-tussen-key`,
    `to`-lijst, `mou_tekst`, opslag als documentversie, verzendlog).
- Frontend `bgDoc('mou')` in `mna/04`: template ophalen → AI vult placeholders onder de bestaande
  strikte clausule-integriteitsregel (geen eigen clausules) → bewerkbaar tekstvak → print / e-mail /
  opslaan bij traject. Knop in de documentenflow tussen NDA en LoI.
- **Voorvullen uit trajectdata:** partijen, object (traject_type, kantoor_naam, structuur_type),
  indicatieve prijs (uit de rekenkern/het dealvoorstel als aanwezig, anders "nader te bepalen"),
  NDA-status (link naar de getekende NDA), sector, beoogd tijdpad (leeg, begeleider vult in).
- Versiebeheer per document: bestaand mechanisme (`doc_type='mou'`).

### Datamodel

- Nieuwe templatetypes in de sjablonentabel: `mou`, `mou_koper`, `mou_opvolging`. Geen
  schemawijziging als de MoU dezelfde geversioneerde documentopslag gebruikt als NDA/LoI —
  te bevestigen dat de opslagsleutel een nieuw `doc_type` toelaat; zo niet, één kolom/afspraak erbij.
- Audit: generatie + verzending gelogd zoals de andere documenten.
- Geen nieuwe tabel met `traject_id` → geen wijziging aan de verwijder-cascades. (Wel controleren
  volgens de CLAUDE.md-checklist.)

### Verhouding tot sectie 0

- De MoU raakt **juridisch** (bindende clausules: exclusiviteit, geheimhouding, kostenverdeling,
  rechtskeuze). Staat `specialist_review.juridisch = 'vereist'` (default), dan is de MoU
  "concept — wacht op goedkeuring" en niet verzendbaar tot de jurist-aftekening (stap 3) of, in de
  tussenperiode, tot de begeleider een bevestiging "een jurist heeft dit beoordeeld — naam + datum"
  invult (vrije tekst, gelogd). Staat het op `'uit'`, dan wordt de sectie-0.3-disclaimer op het
  document gestempeld en is geen bevestiging nodig.
- De indicatieve prijs raakt **cijfers**: komt het bedrag uit de rekenkern, dan geldt dezelfde
  logica met de waarderingsspecialist-aftekening; is het een vrij door de begeleider ingetypte
  bandbreedte, dan is de grondslag "opgave adviseur" en volstaat dat.
- Elke MoU-clausule draagt zijn grondslag: standaardpassage uit sjabloon `mou` met toetsdatum.

### Interim-afhandeling van de aftekeneis (stap 1 gaat live vóór stap 3)

- Nieuwe per-traject-instelling `specialist_review = { juridisch, fiscaal, cijfers }`, elk
  `'vereist'` (default) of `'uit'`, gezet door de begeleider bij trajectstart (en later wijzigbaar,
  met logging).
- Zolang er nog geen jurist-rol is: `'vereist'` betekent de begeleider-bevestiging hierboven;
  `'uit'` betekent de gestempelde disclaimer.
- Zodra stap 3 er is: `'vereist'` wordt een echte aftekening door een uitgenodigde jurist; de
  begeleider-bevestiging blijft alleen de terugval als er geen jurist is uitgenodigd.
- Zo werkt het grondprincipe vanaf dag één, zonder op het volledige rolmodel te wachten.

### Rollen / rechten

- Genereren en verzenden: de begeleider (`tussen_code`-auth), net als NDA/LoI.
- Koper ziet de MoU pas nadat die naar hem is verstuurd.
- Negatief: koper of begeleider van een ánder traject kan deze MoU niet ophalen.

### Handleiding (werkregel 10)

Nieuwe stap voor de MoU in `mna/08-handleiding.js` én `adv.html`: waar hij in de flow zit, dat hij
grotendeels niet-bindend is, welke clausules wél binden, en de aftekening/opt-out.

### Tests

- `scripts/check-contract-output.mjs --template mou`: MoU bevat alle 11 elementen; de
  niet-bindendheidsclausule aanwezig; bindende clausules gelabeld; reliance-voettekst aanwezig.
- e2e: testtraject → mou-template uploaden → `bgDoc('mou')` → tekstvakinhoud controleren → verzenden
  → `/mna/mou/email` 200 + opgeslagen versie.
- Negatief: cross-traject ophalen geblokkeerd.
- Aftekenpoort: met `juridisch:'vereist'` en zonder bevestiging is verzenden geblokkeerd; met
  `juridisch:'uit'` lukt verzenden en staat de disclaimer in de output.
- `node --check` op alle gewijzigde JS; audit-consistentie groen.

### Buiten scope stap 1

- De clausulebibliotheek / modulaire bouwer (stap 2). De MoU in stap 1 is één template zoals de
  andere.
- De echte jurist-rol (stap 3).
- Earn-out / garanties / change-of-control als kiesbare modules (stap 2).

### Deploy

Staging eerst (raakt documentgeneratie naar tegenpartijen + een nieuw mail-endpoint), dan productie.
Backend + frontend. `SCHEMA_VERSION` alleen ophogen als er toch een kolom bijkomt.
