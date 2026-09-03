# LEGAL_REVIEW.md — Juridische reviewstatus & proces

Reviewregels: [`../REVIEW.md`](../REVIEW.md) · Inventaris: [`LEGAL_INVENTORY.md`](LEGAL_INVENTORY.md) · Bevindingen: [`LEGAL_ISSUES.md`](LEGAL_ISSUES.md)

---

## Reviewstatus

| Veld | Waarde |
|---|---|
| Datum laatste volledige review | **2026-09-03** (FASE 1 inventaris + FASE 2–4 bevindingen) |
| Datum laatste update | 2026-09-03 |
| Reviewer | Claude Code (juridische kwaliteitsreview, opdracht Marcel Bisschops) |
| Volgende geplande review | 2026-12-03 (kwartaal) of vóór een grote release |

### Documenten gecontroleerd (FASE 2)

| Document | Locatie | Gereviewd | Opmerking |
|---|---|---|---|
| Gebruiksvoorwaarden verkoper/koper/meekijker | `voorwaarden.html` | ✅ volledig | ISSUE-02, 15, 18; C-4, C-5 |
| — bronfragment | `_src/voorwaarden.html` | ✅ | Identieke bodytekst; alleen build-wrapper (ISSUE-17, gesloten) |
| Gebruiksvoorwaarden platform (adviseur) | `cloudflare-worker.js` → `/gebruiker/voorwaarden` | ✅ volledig | ISSUE-10, 15; C-4, C-5 |
| — weergavestub | `platformvoorwaarden.html` | ✅ | Geen eigen inhoud |
| Algemene Voorwaarden (M&A-praktijk) | `buildAvTekst()` + ingebed in `BF_TEMPLATES` | ✅ volledig | ISSUE-02, 05, 06, 12, 13, 23, 24; C-3 |
| Bemiddelingsovereenkomst Verkoop | `BF_TEMPLATES.bem_verk` | ✅ volledig | ISSUE-03, 04, 06 |
| Bemiddelingsovereenkomst Opvolging | `BF_TEMPLATES.bem_opvolging` | ✅ volledig | ISSUE-03, 04, 14 |
| Bemiddelingsovereenkomst Aankoop | `BF_TEMPLATES.bem_koper` | ✅ volledig | ISSUE-06, 07, 09, 14; C-8 |
| NDA | `BF_TEMPLATES.nda` | ✅ volledig | ISSUE-09 |
| Intentieverklaring (LOI) | `BF_TEMPLATES.loi` | ✅ volledig | ISSUE-08 |
| Indicatief bod | `BF_TEMPLATES.bieding` | ✅ | Geen materiële bevinding (sterk niet-bindend) |
| SPA-aandachtspuntenlijst | `BF_TEMPLATES.spa` | ✅ | Bewust geen overeenkomst; kruisverwijzing naar AV art. 3 (afhankelijk van ISSUE-06) |
| Exclusiviteitsbrief | `BF_TEMPLATES.exclusief` | ✅ | Samenhang met LOI art. 5; boete-omvang (raakt ISSUE-09-lijn) |
| Closing-checklist | `BF_TEMPLATES.closing` | ✅ | Geen overeenkomst; geen bevinding |
| Privacyverklaring | `privacy.html` | ✅ volledig | ISSUE-11; C-6, C-11 |
| Verwerkersovereenkomst — weergave | `mna/04-begeleider-dashboard.js` `VOK_TEKST` v1.5 | ✅ volledig | ISSUE-01; C-1 |
| Verwerkersovereenkomst — bewijs/e-mail | `worker/20-signhost-vok.js` `vokTekst` | ✅ volledig | ISSUE-01 (drift t.o.v. v1.5); C-1 |
| Testvoorwaarden | `testvoorwaarden.html` | ✅ volledig | ISSUE-15; C-4 |
| Bedrijfsscan-disclaimer + privacynote | `bedrijfsscan-start.html` / `bedrijfsscan.html` | 🟡 grotendeels | ISSUE-18 — exacte scan-"voorwaarden"-tekst nog integraal te wegen |
| Contactformulier | `contact.html` / `contact-verzonden.html` | ✅ | Alleen privacyverwijzing; C-6 (bewaartermijn contact niet expliciet) |
| Proefaccount-aanvraag | `proefaccount.html` | ✅ | GV geaccepteerd bij activatie, niet bij aanvraag — licht aandachtspunt |
| Overname aandragen | `lead-aandragen.html` | ✅ | ISSUE-20 |
| Matching-platform | `matching-platform.html` | 🟡 deels | ISSUE-21 — `worker/19-info-fases.js` (koperregistratie) nog te lezen |
| Meekijker-portaal | `viewer.html` | 🟡 deels | ISSUE-22 — `viewer.html`-JS + `worker/21-meekijker.js` nog te lezen |
| Adviseur-acceptatieflow | `adv.html` + `worker/16-adviseur.js` | 🟡 deels | Acceptatie-UI-tekst + endpoint-logica nog integraal te lezen |
| E-mailsjablonen met juridische zinnen | `worker/10-mna-communicatie.js` | 🟡 deels | 73 signaalwoord-treffers; nog te wegen |
| Marketingclaims | `index.html`, `cases/*`, `platform/beveiliging-en-gegevens.html`, `worker/24` | ✅ | ISSUE-19 |
| VerhuisScan | `hugo.html`, `verhuis.html` | ⛔ buiten scope | Offline gehaald 2026-09-03, bewaard in `_gearchiveerd/verhuisscan/` |

### Openstaande juridische aandachtspunten

Zie `LEGAL_ISSUES.md` — 25 bevindingen + 12 cross-document consistentiepunten.
Stand 2026-09-03: **0 toegepast op live bestanden.** FASE 5 voorbereid: commerciële keuzes gemaakt, volledige nieuwe tekst uitgewerkt in `FASE5-WIJZIGINGEN.md` + `CLIENTACCEPTATIE-BESLISBOOM.md`. Wacht op "ja op de redline" + één sub-keuze (ISSUE-10 H1: variant A of B).

### Bekende juridische onzekerheden

| # | Onzekerheid | Waarom | Vervolg |
|---|---|---|---|
| JUR-1 | Is Bisschops Financing Wwft-plichtig als M&A-bemiddelaar? | Wwft art. 1a somt instellingen limitatief op; "M&A-adviseur" staat er niet, maar "advies/bijstand bij aan-/verkoop van aandelen / vennootschapsstructuren" kan eronder vallen (art. 1a lid 4 sub c). Casuïstisch. | Eenmalige specialistische toetsing; uitkomst hier vastleggen. Cliëntacceptatiebepaling (ISSUE-12) nu al opnemen. |
| JUR-2 | Geldt art. 7:417/7:418 BW (twee heren dienen) onverkort voor M&A-procesbegeleiding? | Die artikelen zijn geschreven voor bemiddeling/lastgeving; toepassing op moderne M&A-advisering is niet in alle gevallen uitgemaakt. | Veilige lijn: bepalingen respecteren (ISSUE-13). |
| JUR-3 | Houdt een volledige aansprakelijkheidsuitsluiting stand? | Afhankelijk van omstandigheden (art. 6:233a/6:248 lid 2). Een cap is aantoonbaar veiliger. | Overstappen op cap (ISSUE-05); niet als onzekerheid laten bestaan. |
| JUR-4 | Kwalificeert een verkopende privé-DGA/aandeelhouder als "consument"? | Casuïstisch; geen eenduidige lijn. | B2C-clausule die intreedt zodra opdrachtgever een niet-beroepsmatig handelend natuurlijk persoon is (ISSUE-03). |

### Relevante wets-/regelgevingscontext (gecontroleerd 2026-09-03)

- **BW Boek 6, titel 5, afd. 3** (algemene voorwaarden): art. 6:231–6:238, in het bijzonder 6:233 (onredelijk bezwarend / informatieplicht), 6:234 (kennisname), 6:236 (zwarte lijst), 6:237 (grijze lijst), 6:238 lid 2 (transparantie).
- **BW Boek 6:** 6:92/6:94 (boetebeding + dwingende matiging), 6:101 (eigen schuld), 6:119/6:119a (wettelijke rente / handelsrente), 6:194 (misleidende mededeling B2B), 6:248 lid 2 (beperkende werking redelijkheid en billijkheid), 6:233a.
- **BW Boek 7:** 7:400 e.v. (opdracht), 7:401 (goed opdrachtnemerschap), 7:408 (opzegging), 7:411 (loon bij voortijdig einde), 7:417/7:418 (bemiddeling; twee heren dienen; tegenstrijdig belang).
- **Rv:** art. 108 (forumkeuze), art. 153 (bewijsovereenkomst).
- **AVG / UAVG:** art. 5, 6, 13/14, 28 (verwerkersovereenkomst), 32 (beveiliging), 33/34 (datalekmelding), 44–49 + hfdst. V (doorgifte, SCC), 82 (aansprakelijkheid).
- **Wwft:** art. 1a (instellingen), art. 3 e.v. (cliëntenonderzoek), art. 16 (melding ongebruikelijke transacties); toezicht BFT voor deze sector.
- **Rechtspraak-signaal:** LG München I 20-01-2022 (Google Fonts / IP-doorgifte).

### Voorgestelde toekomstige verbeteringen (na de huidige ronde)

- `algemene-voorwaarden.html` publiceren en tot single source maken (ISSUE-02/06).
- Google Fonts self-hosten (ISSUE-11).
- `bgDoc()` placeholder-/clausule-integriteitscheck uitbreiden (ISSUE-25).
- Eén datum-gebaseerd versieschema over alle juridische documenten.
- Cookie-/trackingscan van de publieke site als terugkerende check.

### Wijzigingen sinds vorige review

Eerste volledige review — geen voorgaande. Eerdere losse juridische correcties (VOK-versies, KvK-nummer 82085200, 14-dagenbewaartermijn i.p.v. 7 jaar, VOK-tekst-sync juli 2026, "kantoorscan"→"bedrijfsscan" in v2.2/v1.7) staan in de git-historie en het sessiegeheugen, niet in dit register.

---

## Versieregister juridische documenten (ISSUE-16 / C-10)

| Document | Huidige versie | Datum in tekst | Acceptatieflow | Bron |
|---|---|---|---|---|
| Gebruiksvoorwaarden verkoper/koper/meekijker | **2.2** | augustus 2026 | impliciet ("door in te loggen") | `voorwaarden.html` |
| Gebruiksvoorwaarden platform (adviseur) | **GV 1.9** | september 2026 | expliciet, herhaald bij versieverhoging | `cloudflare-worker.js` `GV_VERSIE` |
| Algemene Voorwaarden (M&A-praktijk) | **AV 1.1** | — | als bijlage bij ondertekende BEM | `cloudflare-worker.js` `AV_VERSIE` / `buildAvTekst()` |
| Verwerkersovereenkomst | **VOK 1.5** | augustus 2026 (frontend) / "Juli 2026" (backend-e-mail — **fout**, ISSUE-01) | expliciet, `VOK_VERSIE` | `mna/04` `VOK_TEKST` ↔ `worker/20` `vokTekst` |
| Privacyverklaring | **1.8** | september 2026 | n.v.t. (informatief) | `privacy.html` |
| Testvoorwaarden | **1.2** | augustus 2026 | impliciet (staging-gebruik) | `testvoorwaarden.html` |
| Bemiddelingsovereenkomsten + NDA/LOI/excl. | ongenummerd | — | ondertekening via Signhost | `BF_TEMPLATES` (marilyn-bewerkbaar) |

**Regel:** bij een inhoudelijke wijziging aan een genummerd document → versienr. ophogen + datum bijwerken + regel toevoegen aan "Wijzigingen sinds vorige review" + acceptatie-impact wegen. Ongenummerde sjablonen: wijziging vastleggen in de git-commit + hier onder "Wijzigingen".

---

## Herhaalbaar proces — "Run legal review"

Wanneer Marcel zegt **"Run legal review"** (of bij de kwartaalcadans / vóór een grote release):

1. **Herinventariseren.** Loop de bestandslijst in `LEGAL_INVENTORY.md` + `REVIEW.md` (toepassingsgebied) opnieuw langs. Nieuwe juridisch relevante bestanden/teksten toevoegen; VerhuisScan overslaan zolang die in `_gearchiveerd/` staat.
2. **Diff sinds vorige review.** `git log --since="<datum laatste review>" -- voorwaarden.html privacy.html testvoorwaarden.html platformvoorwaarden.html bedrijfsscan-start.html proefaccount.html contact.html lead-aandragen.html matching-platform.html viewer.html legal/` en in de backend-repo `git log --since=… -- backend/cloudflare-worker.js backend/worker/02-config-constanten.js backend/worker/20-signhost-vok.js` + grep op `VOK_TEKST`/`GEBRUIKSVOORWAARDEN_TEKST`/`buildAvTekst`/`BF_TEMPLATES`. Alleen gewijzigde documenten diepgaand herzien; ongewijzigde als "OK — geen wijziging" markeren.
3. **Nieuwe regelgeving.** Controleer op wijzigingen sinds de vorige datum in: BW Boek 6 afd. 6.5.3 / Boek 7 titel 7, AVG/UAVG, Wwft, e-commerce/DSA/Data Act voor zover van toepassing, en relevante Nederlandse rechtspraak (algemene voorwaarden, bemiddeling, exoneratie, datalek). Noteer datum van controle.
4. **Marktstandaard opnieuw wegen.** Alleen als een concrete aanleiding bestaat (nieuwe branchevoorwaarden, BOBB-/Overname-Experts-gedragsregels, gangbare M&A-engagement-letter-praktijk).
5. **Alleen relevante nieuwe risico's/verbeteringen rapporteren.** Geen herformulering "omdat het mooier klinkt" — een wijziging heeft een reden uit `REVIEW.md` § Wijzigingsdiscipline. Bevindingen in het format probleem/risico/huidige tekst/voorgestelde tekst/reden/prioriteit; toevoegen aan `LEGAL_ISSUES.md` met een nieuw ISSUE-nummer.
6. **Regressiecheck.** Voor elke doorgevoerde wijziging: raakt die bescherming of commerciële werking uit een ander document? (aansprakelijkheidsregime, fee, bewaartermijn, definities, forumkeuze, kruisverwijzingen). Draai `node tests/audit-consistentie.mjs` (o.a. de publiek/interne-scheiding- en dubbele-bron-checks) en, in de backend-repo, `node tests/audit-backend.mjs`.
7. **Registers bijwerken.** `LEGAL_REVIEW.md` (datum, gecontroleerde documenten, wijzigingen, versieregister) en `LEGAL_ISSUES.md` (status per bevinding).

Een periodieke review betekent **niet** dat documenten standaard worden herschreven — alleen wijzigen bij een concrete juridische, commerciële, technische of redactionele reden.
