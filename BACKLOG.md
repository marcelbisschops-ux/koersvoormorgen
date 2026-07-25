# KantoorInzicht — Backlog

Vervangt de vorige versie (juli 2026), die na 24 afgeronde punten grotendeels ✅-ruis was geworden.
Deze versie bevat **alleen wat nog daadwerkelijk openstaat**, per 25 juli 2026. Zodra een punt
wordt afgerond: hier direct wegstrepen/verwijderen, niet laten aanslibben.

**Model per taak** — vóór de start van elke taak het juiste model inschakelen:
- Sonnet (`/model claude-sonnet-5`) — routinewerk
- Opus (`/model claude-opus-4-8`) — ontwerp- en integratiewerk

---

## 1. Wacht op jou — korte eigen actie, geen coderingswerk

| # | Punt | Actie |
|---|------|-------|
| 1 | Signhost-checksum (2e beveiligingslaag) | Shared secret ophalen uit portal.signhost.com/RegisteredPostbacks, dan hier laten uitvoeren: `wrangler secret put SIGNHOST_WEBHOOK_SECRET` |
| 2 | Beide repo's staan lokaal vóór op GitHub | Frontend 2 commits, backend 47 commits — pushen lukt niet vanuit deze omgeving (credential-issue). Nodig via GitHub Desktop, anders komt de laatste frontend-fix (Dealvoorstel-secties) nooit online |
| 3 | Eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn | Eerder gewist door een inmiddels gefixte bug — bewust door jou uitgesteld, nog steeds jouw actie zodra je eraan toekomt |

## 2. Wacht op je jurist

| # | Punt | Status |
|---|------|--------|
| 4 | AV-concept (`AV-Bisschops-Financing-v2.0-CONCEPT.docx`, staat in Downloads) | Nog naar de jurist te sturen |
| 5 | VOK Artikel 9-concept (geanonimiseerd trajectdata-gebruik voor sectorbenchmarks/AI-verbetering) | Concept-tekst ligt klaar (zie `project_data_optimalisatie_vok`-geheugen), wacht op jouw jurist. **Geen techniek bouwen** vóór bevestiging — nieuw verwerkingsdoel zonder bijgewerkte VOK is een AVG-risico |
| 6 | SPA-template (concept-koopovereenkomst) laten toetsen | Vóór het model als "getoetst" gebruikt wordt, niet alleen als CONCEPT-werkdocument |

## 3. Klaar om te bouwen — wacht op jouw inhoudelijke input

| # | Punt | Toelichting |
|---|------|-------------|
| 7 | Nieuwe sectorprofielen | DD-velden/checklists/normen per nieuwe sector — jouw domeinexpertise, techniek staat al klaar (marilyn → Sectoren). ~2-4 u techniek per sector zodra de inhoud er is |
| 8 | Pilot algemene DD-tool (MKB) | Bundelt bestaande sectorneutrale AI-extractie/benchmarks tot verkoopbaar algemeen product — 2-3 dagen zodra je de MKB-inhoud aanlevert |

## 4. Concrete openstaande features (jouw eigen 25-juli-lijst, nog niet gestart)

| # | Punt | Toelichting |
|---|------|-------------|
| 9 | Earn-out meenemen in dealvoorstel-generatie | Jouw woorden: "dat is vaak regel en moet meegenomen worden" |
| 10 | LoI moet waarden overnemen van het dealvoorstel | Nu volledig los van elkaar — dealvoorstel-cijfers worden niet automatisch doorgezet naar de LoI-tekst |
| 11 | Fase-2-vrijgave na LoI-ondertekening — **nog te onderzoeken, niet per se een bug** | Handleidingtekst claimt dat ondertekening van de LoI bij de verkoper automatisch de diepere fase-2-DD-vragen ontgrendelt (`mna/08-handleiding.js`) — jij zag dit niet gebeuren. Eerst uitzoeken of dit alleen documentatie zonder implementatie is, of een echte bug, vóórdat er gebouwd wordt |

## 5. Bewust uitgesteld — risico-afweging, trigger om terug te komen

| # | Punt | Waarom uitgesteld | Trigger om op terug te komen |
|---|------|--------------------|-------------------------------|
| 12 | Response-envelope-duplicatie (463× patroon over 20 workermodules) | Mechanisch, maar over zoveel plekken dat een regressie makkelijk onopgemerkt blijft zonder gerichte test-ronde | Een moment met ruimte voor een dedicated refactor-+-testronde |
| 13 | Foreign keys toevoegen aan het D1-schema | Vereist tabel-rebuild op levende productiedata (SQLite kan geen kolomconstraints achteraf toevoegen) — een fout hierin is niet lokaal herstelbaar zoals de meeste andere fixes | Alleen met een uitgebreid rollback-plan, niet tussendoor |
| 14 | Cloudflare WAF-upgrade | Huidige schaal (jij, testadviseurs) weegt niet op tegen de kosten; bestaande lagen (rate-limiting, gehashte wachtwoorden, HTTPS, gratis DDoS-bescherming) dekken het risico al grotendeels | Zodra er **echte betalende externe adviseurs** actief zijn — dan eerst zone-level Pro-plan checken vóór Enterprise |
| 15 | Externe pentest | Nog nooit gedaan, logische vervolgstap | Zodra er meer dan een handvol bekende testgebruikers is |
| 16 | Deal comparison / scenariovergelijking naast elkaar | Jouw woorden: "nog niet" | Op jouw signaal |
| 17 | Dealflow-CRM / pipeline-management + target screening | Expliciet gedeprioriteerd: "vind ik nu niet belangrijk, kan naar achteren" | Op jouw signaal |
| 18 | Geanonimiseerde cross-adviseur benchmarks (met terugdeling aan bijdragende adviseurs) | Nieuwe feature, hangt af van punt 5 (VOK Artikel 9 bij jurist) | Ná juridische goedkeuring én expliciet verzoek |
| 19 | SBR/XBRL uitbreiden (meer velden dan omzet/debiteuren, entiteitsnaam-verificatie voor XBRL-uploads, namespace-URI-validatie) | v1 (omzet/debiteuren, RGS/NT-taxonomie-conform) is af en live; dit is bewust beperkte vervolgwerk, geen bug | Niet urgent, oppakken wanneer gewenst |
| 20 | AI-model in het platform omzetten naar `claude-sonnet-5` (nu `claude-sonnet-4-6`) | Eerst kwaliteitstest op staging met echte [dossier]-achtige documenten vóór productie wordt aangeraakt — deal-kritieke AI-extractie | Wanneer jij groen licht geeft voor de staging-test |

## 6. Kleine, niet-urgente technische schuld

| # | Punt | Toelichting |
|---|------|-------------|
| 21 | D1-database `jurisdiction: null` | Draait feitelijk al in West-Europa (bevestigd via wrangler), maar niet hard afgedwongen in de config |
| 22 | Playwright-test "Gelijktijdige multi-upload" — bekende flakiness | Faalde één keer op een race-timing, reproduceerde niet bij herhaling, nog niet verhard |

## 7. Terugkerend, geen actie nu

| # | Punt | Eerstvolgende moment |
|---|------|----------------------|
| 23 | Kwartaalcheck 7 juridische templates + sector-benchmarks op actualiteit | Streefdatum **2026-10-05** — bij sessiestart rond/na die datum proactief voorstellen |
| 24 | Maandelijkse kwaliteitsaudit (werkregel #12) | Elke maand + vóór elke grote release + op verzoek |

## 8. Afgewezen — niet opnieuw voorstellen

- MIP / fiscale structuuroptimalisatie — jouw woorden: "nee" (logische omissie voor 1-op-1-overnames, geen fondsstructurering)
- "Strikte scheiding" tussen platform en je eigen adviespraktijk juridisch claimen — feitelijk onwaar zolang het één eenmanszaak is; zou geloofwaardigheid ondermijnen. Enige echte weg is een aparte rechtspersoon — een ondernemingsbeslissing, geen tekstwijziging

---

## Testplan: geautomatiseerde end-to-end test (blijft geldig, zie `tests/README.md`)

Doel: vóór elke deploy met één commando bevestigen dat het hele systeem werkt.

### Deel A — API-tests (Node-script, `tests/e2e-api.mjs`)
Tegen de live worker, met eigen testdata die het script zelf aanmaakt én opruimt:
1. `/health` — 200 + `ok:true`
2. Adviseur-lifecycle: uitnodigen → activeren → verkoop (limiet/modules) → traject aanmaken → limiet afdwingen → module-gating (traject uit → geblokkeerd) → deactiveren → verwijderen
3. Rollen-login: verkoper-, koper- en tussenpersoonscode geven elk de juiste rol en (voor tussenpersoon) de juiste `modules`
4. Documentupload (multipart, klein testbestand) → analyse aanwezig → `veld_extractie` gevuld → cache-logregel
5. DD-data opslaan (`/mna/save`) en teruglezen
6. Fase-wijziging via logboek-endpoint → `traject_fase` verifiëren → terugzetten
7. Waardering genereren → JSON-structuur valideren
8. Document-e-mailendpoints (nda/loi/bem/dealvoorstel/bieding) naar een testadres → `ok:true` + versie in `mna_doc_versies`
9. Volledige opruiming (testaccount, testtraject incl. documenten via `/admin/delete/mna/`)

AI-afhankelijke stappen (4, 7) krijgen een `--skip-ai` vlag zodat een goedkope snelle run mogelijk is; volledige run kost enkele dubbeltjes aan API-calls.

### Deel B — UI-tests (Playwright, `tests/e2e-ui.spec.js`)
Headless browser tegen lokale mna.html + live worker:
1. Login-schermen: drie rollen, foutmelding bij ongeldige code
2. Begeleider-dashboard: alle knoppen aanwezig; met module `contracten` uit zijn de 6 documentknoppen disabled met de juiste tooltip
3. Dealvoorstel-modal: bekende invoer → **asserten dat de berekende tabelwaarden exact kloppen** (prijsmechanisme, schuldafbouw, buy-and-build) — dit beschermt de rekenkern
4. Bieding-modal: bod = EBITDA × multiple exact; vervolgstappen-paneel verschijnt
5. Informatieverzoek: bestaande knop → fase 1; via bieding-paneel → fase 2 met DD-categorieën
6. Verkoper-flow: inloggen, velden zichtbaar, verversen werkt

### Draaien
```
node tests/e2e-api.mjs            # of: --skip-ai voor snelle run
npx playwright test               # UI-suite
```
Afspraak: beide suites groen vóór elke worker-deploy en vóór elke frontend-push.
