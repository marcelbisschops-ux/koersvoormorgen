# Platform-overzicht + branding & verkoop

*Laatst bijgewerkt: 4 juli 2026. Bedoeld als leesbaar overzicht voor Marcel — wat er is, wat mogelijk is, en hoe je het kunt branden en verkopen.*

---

## Deel 1 — Wat je nu hebt

### Twee productlijnen op één fundament

| | **KantoorInzicht** (accountancy / M&A) | **VerhuisScan** (verhuisbedrijven) |
|---|---|---|
| Publieke scan | `index.html` | `verhuis.html` |
| Volledig M&A-traject | `mna.html` (verkoper/koper/begeleider) | — |
| Adviseursportaal | `adv.html` (betaalde externe adviseurs) | — |
| Beheer (admin) | `marilyn.html` (Marilyn) | `hugo.html` (Hugo) |
| Activiteit nu | 1 scan · 7 M&A-trajecten | **22 scans** |

Alles draait op **één Cloudflare-worker + één database (D1) + documentopslag (R2)**. De twee productlijnen delen de infrastructuur maar hebben eigen endpoints en tabellen — data blijft gescheiden.

### Wat het M&A-product (KantoorInzicht) kan
- **Scan → rapport**: strategische zelfscan met AI-adviesrapport (index.html).
- **Volledig M&A-traject** (mna.html): drie rollen (verkoper, koper, begeleider), due-diligencedossier in 7 categorieën, documentupload met **AI-extractie** (sector-bewust), waardering, dataroom.
- **Gefaseerde koper-toegang**: begeleider geeft per DD-categorie vrij wat de koper mag zien (velden én documenten).
- **Documentgeneratoren** (achter het `contracten`-modulerecht): NDA, LoI, Bemiddelingsovereenkomst, Exclusiviteitsbrief, **Dealvoorstel** (met reken­kern: prijsmechanisme, schuldafbouw, buy-and-build), **Indicatieve bieding**, **Concept-koopovereenkomst (SPA)**. Verplichte controlestap vóór versturen.
- **Ondertekening** via Signhost, e-mail via Resend.

### Verkoopmodel voor externe adviseurs — *dit is al ingebouwd*
Adviseurs staan in de tabel `bf_gebruikers` met twee verkoopknoppen:
- **`traject_limiet`** — hoeveel trajecten een adviseur mag aanmaken.
- **`modules`** (JSON) — welke functies aan staan: `traject`, `contracten`, `ai_analyse`, `qa`, `export`.

Je beheert dit in **marilyn → Gebruikers → € Verkoop**. Geblokkeerde functies tonen automatisch "Neem contact op met Bisschops Financing". **Dit is de kern van een verkoop-/licentiemodel dat er al staat.**

### Operationele volwassenheid (nieuw, deze periode)
- **Testsuite** (`tests/`): 46 API-checks + 7 UI-tests. Eén commando bevestigt dat het hele systeem werkt vóór elke wijziging. Vangnet voor uitbreidingen.
- **Back-ups** (`scripts/backup.sh`): dagelijkse export van álle klantdata + documenten naar iCloud, plus de backend-code in git. Los van Cloudflare — je raakt niets kwijt.
- **White-label basis**: centrale `BRAND`-config in alle 6 portals — merknaam wisselen = één regel per portaal.

---

## Deel 2 — De mogelijkheden

1. **White-label verkopen aan andere M&A-adviseurs.** Zij gebruiken het platform onder hun eigen merk; jij levert de techniek. Het verkoopmodel (limiet + modules) bepaalt wat ze mogen.
2. **De scan-tool licentiëren per sector/branche.** VerhuisScan bewijst dit al: dezelfde scan-motor, andere sector. Brancheorganisaties of franchises kunnen een eigen scan aanbieden aan hun leden.
3. **Nieuwe sectoren toevoegen.** Nu nog als aparte kopie (zoals VerhuisScan). Met taak **#24 (sectorparameters uit database)** wordt een nieuwe sector een *instelling* in plaats van bouwwerk — dan schaal je zonder ontwikkelwerk.
4. **Algemeen DD-/MKB-product** (backlog #11/#21): het M&A-traject breder inzetbaar maken dan alleen accountancy.
5. **Per-module verkopen** (upsell): basis = scan; betaald = contracten, AI-analyse, Q&A, export. De techniek hiervoor staat er al.

---

## Deel 3 — Hoe je gaat branden en verkopen

### A. Branden (white-label) — de techniek staat klaar
Elk portaal heeft bovenin een `BRAND`-blok, bv. in `mna.html`:
```js
var BRAND = { platform:'KantoorInzicht', bedrijf:'Bisschops Financing B.V.', suffix:'M&A' };
```
Merknaam wijzigen = deze regel aanpassen → hele portaal herbrandt (headers, titels, footers). Live getest met "DealScope", "MoveScan", "ScanPro".

**Nog te doen voor een verkoopklare white-label** (taak #29):
- De *diepere* merkverwijzingen configureerbaar maken: juridische copyright/disclaimers, de AI-prompts, en de contract-templates die nu "Bisschops Financing" / "accountancy" noemen.
- **Eén centrale plek** i.p.v. per portaal (nu 6 configs) — het schoonst via de database (taak #24), zodat je per klant/adviseur een merk instelt zonder code te wijzigen.
- **Eigen domein** per klant (bv. `mna.hunbedrijf.nl`) — kan via Cloudflare Pages custom domains.

### B. Verkopen — drie concrete routes

**Route 1 — Losse adviseurs (snelst te starten).**
Je hebt het model al: nodig een adviseur uit (marilyn), zet limiet + modules, factureer per periode of per traject. Geblokkeerde modules sturen de klant vanzelf naar jou voor upsell.
- *Pakketvoorbeeld:* Basis (alleen `traject`) → Plus (+`contracten`, `ai_analyse`) → Pro (+`qa`, `export`, hogere limiet).

**Route 2 — White-label voor een M&A-kantoor.**
Een ander kantoor krijgt het platform onder eigen merk (BRAND-config + eigen domein). Jij levert onderhoud/hosting; zij betalen licentie per jaar + evt. per traject.
- *Nodig vóór verkoop:* #29 (diepe branding) + AVG-afspraken per klant (zij worden verwerkingsverantwoordelijke; jij verwerker — de VOK-tekst in het platform is hiervoor al de basis).

**Route 3 — Sector-/branchelicentie (schaalbaar).**
Een brancheorganisatie biedt jouw scan aan haar leden (zoals VerhuisScan). Per sector een eigen scan + benchmarks.
- *Nodig om zonder bouwwerk te schalen:* #24 (sectorparameters uit database) + #20 (sectorinhoud — jouw domeinexpertise per sector).

### C. Aanbevolen volgorde om verkoopklaar te worden
1. **#29 — diepe branding afmaken** (legal/AI/copyright configureerbaar). Dan is white-label écht compleet.
2. **Eigen domein per klant** instellen (Cloudflare Pages) — kleine technische stap, groot professioneel effect.
3. **#24 — sectorparameters uit database** — de hefboom: nieuwe sectoren en merken worden instellingen i.p.v. maatwerk. Dit maakt route 2 en 3 echt schaalbaar.
4. **Eén pilot per route** — één losse adviseur, één white-label-kantoor, één branche — voordat je breed uitrolt.
5. **Prijs/pakketten vastleggen** op basis van het module-model dat er al is.

### D. Aandachtspunten (eerlijk)
- **AVG/verwerkersovereenkomst per white-label-klant** — de klant wordt verwerkingsverantwoordelijke. De VOK in het platform is de basis; laat dit per verkoop juridisch checken.
- **Contract-templates juridisch laten toetsen** vóór externe verkoop (het SPA-concept en de overige templates).
- **Back-up per klant** — als data van klanten gescheiden moet blijven, is dat een aandachtspunt bij opschalen (nu één gedeelde database).

---

## Deel 4 — Openstaande backlog (kort)
Zie `BACKLOG.md` voor details en kosteninschatting. Grote resterende brokken:
- **#24** Sectorparameters zelf-service (database) — *de hefboom voor schaalbaar white-label.*
- **#29** Diepe branding (legal/AI/copyright).
- **#20** Nieuwe sectorprofielen (jouw domeininhoud).
- **#22** `mna.html` opsplitsen (technisch onderhoud; testsuite staat klaar als vangnet).

*Alles wat deze periode is afgerond staat afgevinkt in `BACKLOG.md`.*
