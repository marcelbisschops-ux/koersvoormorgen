# KantoorInzicht — Backlog

Vervangt de vorige versie (juli 2026), die na 24 afgeronde punten grotendeels ✅-ruis was geworden.
Deze versie bevat **alleen wat nog daadwerkelijk openstaat**, bijgewerkt 26 juli 2026 na de vijfde
audit-heraudit en de daaropvolgende fixronde. Zodra een punt wordt afgerond: hier direct
wegstrepen/verwijderen, niet laten aanslibben.

**Model per taak** — vóór de start van elke taak het juiste model inschakelen:
- Sonnet (`/model claude-sonnet-5`) — routinewerk
- Opus (`/model claude-opus-4-8`) — ontwerp- en integratiewerk

---

## 1. Wacht op jou — korte eigen actie, geen coderingswerk

| # | Punt | Actie |
|---|------|-------|
| 1 | Eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn | Eerder gewist door een inmiddels gefixte bug — **bewust uitgesteld op jouw verzoek (26 juli 2026), niet opnieuw voorstellen tot je 'm zelf noemt** |
| 2 | Oud testtraject op staging opruimen? | `AUDITTEST2870` / "Batchtest BV" — leftover van eerder testwerk, niet van de sessie van 25/26 juli. Jouw keuze: laten staan of opruimen |

**Afgerond 26 juli 2026:** Signhost-checksum ingesteld (beide omgevingen), GitHub Actions-secret vervangen (oude productie-`ADMIN_KEY` verwijderd uit de backend-repo, nieuwe aparte `STAGING_ADMIN_KEY` aangemaakt + functioneel getest tegen staging), beide repo's volledig gesynchroniseerd op GitHub (Terminal + PAT, `repo`+`workflow`-scope). Onderweg twee bijgevangen bevindingen, allebei gefixt: een GitHub-Desktop-vs-Terminal-omgevingsverschil met de pre-push-hook, en een CORS-regressie die dezelfde fixronde zelf veroorzaakte (localhost:8799, de Playwright-testserver, stond niet op de whitelist).

## 2. Wacht op jouw beslissing — ontdekt tijdens het bouwen, geen blinde fix

| # | Punt | Wat er speelt |
|---|------|----------------|
| 5 | Adviseur-login-flow lijkt halfafgemaakt | Ontdekt tijdens de sessie-invalidatie-fix (26 juli): `adv.html` authenticeert bij elke actie opnieuw met e-mail+wachtwoord in JS-geheugen (`G.ww` bevat het wachtwoord in leesbare vorm zolang de pagina open staat) i.p.v. het bestaande `sessie_token`-mechanisme te gebruiken. `marilyn.html`'s `gebruikerToken`-variabele wordt nergens op een echte waarde gezet. `registreer.html` slaat na activeren wél een `sessie_token` op in `localStorage` ('ki_sessie_token'), maar geen enkele pagina leest die ooit terug. Dit lijkt een nooit-voltooide adviseur-login-flow, geen actief beveiligingsgat op zich (geen datalek aangetoond), maar wel onnodig risico (wachtwoord in geheugen) en verwarrende dode code. Vraag aan jou: is dit bewust zo (bijv. omdat `/adviseur/trajecten` toch al bij elke actie herauthenticeert), of moet dit alsnog naar het `sessie_token`-patroon? |

## 3. Wacht op je jurist

| # | Punt | Status |
|---|------|--------|
| 6 | AV-concept (`AV-Bisschops-Financing-v2.0-CONCEPT.docx`, staat in Downloads) | Nog naar de jurist te sturen |
| 7 | VOK Artikel 9-concept (geanonimiseerd trajectdata-gebruik voor sectorbenchmarks/AI-verbetering) | Concept-tekst ligt klaar (zie `project_data_optimalisatie_vok`-geheugen), wacht op jouw jurist. **Geen techniek bouwen** vóór bevestiging — nieuw verwerkingsdoel zonder bijgewerkte VOK is een AVG-risico |
| 8 | SPA-template (concept-koopovereenkomst) laten toetsen | Vóór het model als "getoetst" gebruikt wordt, niet alleen als CONCEPT-werkdocument |

## 4. Klaar om te bouwen — wacht op jouw inhoudelijke input

| # | Punt | Toelichting |
|---|------|-------------|
| 9 | Nieuwe sectorprofielen | DD-velden/checklists/normen per nieuwe sector — jouw domeinexpertise, techniek staat al klaar (marilyn → Sectoren). ~2-4 u techniek per sector zodra de inhoud er is |
| 10 | Pilot algemene DD-tool (MKB) | Bundelt bestaande sectorneutrale AI-extractie/benchmarks tot verkoopbaar algemeen product — 2-3 dagen zodra je de MKB-inhoud aanlevert |
| 11 | Accountancy-sectorprofiel: gestructureerde omzetsplitsing + winst-per-partner | Controle/samenstel/fiscaal/advies-omzet zit nu in één vrij tekstveld i.p.v. vier aparte %-velden; geen winst-per-partner (alleen omzet-per-partner) en geen partnerafhankelijkheidsscore. Gevonden bij de heraudit — vereist jouw input over de gewenste velden/definities |

## 5. Concrete openstaande features (jouw eigen 25-juli-lijst, nog niet gestart)

| # | Punt | Toelichting |
|---|------|-------------|
| 12 | Earn-out meenemen in dealvoorstel-generatie | Jouw woorden: "dat is vaak regel en moet meegenomen worden" |
| 13 | LoI moet waarden overnemen van het dealvoorstel | Nu volledig los van elkaar — dealvoorstel-cijfers worden niet automatisch doorgezet naar de LoI-tekst |
| 14 | Fase-2-vrijgave na LoI-ondertekening — **nog te onderzoeken, niet per se een bug** | Handleidingtekst claimt dat ondertekening van de LoI bij de verkoper automatisch de diepere fase-2-DD-vragen ontgrendelt (`mna/08-handleiding.js`) — jij zag dit niet gebeuren. Eerst uitzoeken of dit alleen documentatie zonder implementatie is, of een echte bug, vóórdat er gebouwd wordt |

## 6. Bewust uitgesteld — risico-afweging, trigger om terug te komen

| # | Punt | Waarom uitgesteld | Trigger om op terug te komen |
|---|------|--------------------|-------------------------------|
| 15 | Response-envelope-duplicatie (580× patroon over 20 workermodules) | Mechanisch, maar over zoveel plekken dat een regressie makkelijk onopgemerkt blijft zonder gerichte test-ronde | Een moment met ruimte voor een dedicated refactor-+-testronde |
| 16 | Foreign keys toevoegen aan het D1-schema | Vereist tabel-rebuild op levende productiedata (SQLite kan geen kolomconstraints achteraf toevoegen) — een fout hierin is niet lokaal herstelbaar zoals de meeste andere fixes. `schema.sql` in deze repo is bovendien een verouderd artefact dat wél FK's claimt — niet actief gebruikt, wel verwarrend | Alleen met een uitgebreid rollback-plan, niet tussendoor |
| 17 | Volledige modal-toegankelijkheid + dark-mode-refactor | De P2-fix van 25 juli dekte alleen de Dealvoorstel-modal. 9 van 10 onderzochte modals (koper-toegang, groepsstructuur, partners, de 5 adv.html-modals) missen nog `role="dialog"`/`aria-modal`/`label-for`. Dark-mode hardcoded kleuren blijken breder dan bekend: LoI/BEM/NDA-documentviewers in `06-schermen.js` (juist de juridisch belangrijkste teksten) en adv.html's toast zijn onleesbaar in donkere modus | Eén gerichte ronde: een generieke `maakModal()`-helper voor alle 14+ modals tegelijk, i.p.v. losse patches |
| 18 | HTTP-statuscode-consistentie | 88 van 361 foutresponses missen een expliciete status (blijven impliciet 200) — bijv. hetzelfde "DB niet beschikbaar" geeft op de ene plek 503, op de andere 200 | Een gerichte ronde die alle 88 nazoekt en normaliseert, niet blind een paar losse endpoints |
| 19 | Geautomatiseerde risicoscore | Alle redflags zijn nu statische, handmatig af te vinken checklist-items — geen enkele automatische waarschuwing op basis van ingevulde cijfers (bijv. klantconcentratie >40%) | Bouwstenen (cijfers) zijn er al; oppakken wanneer gewenst, geen bug |
| 20 | Interactieve closing-checklist | Nu een read-only tekst-textarea van een statisch sjabloon, geen per-item afvinkstatus zoals de rest van het platform | Oppakken wanneer gewenst, geen bug |
| 21 | Cloudflare WAF-upgrade | Huidige schaal (jij, testadviseurs) weegt niet op tegen de kosten; bestaande lagen (rate-limiting nu ook op alle admin-routes, gehashte wachtwoorden, HTTPS, gratis DDoS-bescherming) dekken het risico al grotendeels | Zodra er **echte betalende externe adviseurs** actief zijn — dan eerst zone-level Pro-plan checken vóór Enterprise |
| 22 | Externe pentest | Nog nooit gedaan, logische vervolgstap | Zodra er meer dan een handvol bekende testgebruikers is |
| 23 | Deal comparison / scenariovergelijking naast elkaar | Jouw woorden: "nog niet" | Op jouw signaal |
| 24 | Dealflow-CRM / pipeline-management + target screening | Expliciet gedeprioriteerd: "vind ik nu niet belangrijk, kan naar achteren" | Op jouw signaal |
| 25 | Geanonimiseerde cross-adviseur benchmarks (met terugdeling aan bijdragende adviseurs) | Nieuwe feature, hangt af van punt 7 (VOK Artikel 9 bij jurist) | Ná juridische goedkeuring én expliciet verzoek |
| 26 | SBR/XBRL uitbreiden (meer velden dan omzet/debiteuren, entiteitsnaam-verificatie voor XBRL-uploads, namespace-URI-validatie) | v1 (omzet/debiteuren, RGS/NT-taxonomie-conform) is af en live; dit is bewust beperkte vervolgwerk, geen bug | Niet urgent, oppakken wanneer gewenst |
| 27 | AI-model in het platform omzetten naar `claude-sonnet-5` (nu `claude-sonnet-4-6`) | Eerst kwaliteitstest op staging met echte [dossier]-achtige documenten vóór productie wordt aangeraakt — deal-kritieke AI-extractie | Wanneer jij groen licht geeft voor de staging-test |
| 28 | Route/business/data-scheiding in de workermodules | Routing, businesslogica en data-access zitten door elkaar in één functie per route — bemoeilijkt geïsoleerd testen, verhoogt kans op inconsistenties tussen bijna-identieke routes | Architectuurkeuze, geen losse bugfix — oppakken bij een grotere refactor-ronde |

## 7. Kleine, niet-urgente technische schuld

| # | Punt | Toelichting |
|---|------|-------------|
| 29 | D1-database `jurisdiction: null` | Draait feitelijk al in West-Europa (bevestigd via wrangler), maar niet hard afgedwongen in de config |
| 30 | Playwright-test "Gelijktijdige multi-upload" faalt nu consistent | Bijgewerkt 26 juli 2026: bleek eerder eenmalig/niet-reproduceerbaar, faalt nu bij herhaling consistent op `wachtrijLengte` (0 i.p.v. ≥1) — het tweede conflict (doc3 vs doc2) wordt niet gequeued. Losstaand van de CORS-regressie die dezelfde push blokkeerde (die is gefixt). Client-side conflict-dialoog-logica (`mna/02-state-opslag-documenten.js`), geen van de vandaag gewijzigde bestanden — nog te onderzoeken of dit een echte timing-bug in de app is of alleen in de test |
| 31 | "Confidence score bij documentextractie"-claim is overstated | Er bestaat alleen een binaire leesbaar/onleesbaar-vlag per document, geen graduele betrouwbaarheid per veld zoals de term suggereert — tekstfix (claim corrigeren) of alsnog een echte indicator bouwen |
| 32 | `veiligeCode()` heeft een verwaarloosbare modulo-bias | 256 niet deelbaar door 36 → lichte voorkeur voor bepaalde tekens. Statistisch te verwaarlozen, puur cosmetisch, niet met prioriteit oppakken |
| 33 | adv.html-documententabel + `mna/06-schermen.js` fase-detailscherm missen overflow-bescherming op mobiel | Kleine restpunten van de eerdere responsive-fix |

## 8. Terugkerend, geen actie nu

| # | Punt | Eerstvolgende moment |
|---|------|----------------------|
| 34 | Kwartaalcheck 7 juridische templates + sector-benchmarks op actualiteit | Streefdatum **2026-10-05** — bij sessiestart rond/na die datum proactief voorstellen |
| 35 | Maandelijkse kwaliteitsaudit (werkregel #12) | Elke maand + vóór elke grote release + op verzoek |

## 9. Afgewezen — niet opnieuw voorstellen

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
