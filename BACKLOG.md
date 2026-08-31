# Koers voor Morgen — Backlog

**Bouwfreeze OPGEHEVEN (Marcel, 31 augustus 2026: "vergeet de freeze").** Backlogpunten mogen
gewoon opgepakt worden. De onderliggende discipline blijft: één wijziging tegelijk, testen vóór
opleveren, bij onduidelijke scope/aanpak eerst afstemmen.

Afgeronde en afgewezen punten staan in `BACKLOG-ARCHIEF.md` (wordt niet standaard meegewogen,
alleen op verzoek). Dit bestand bevat **alleen wat nu nog open staat**.

Hernummerd op 26 augustus 2026 en opnieuw op **31 augustus 2026** (op Marcels verzoek), nadat een
grote reeks punten was afgerond — de vorige nummering (1-13, afgerond en open door elkaar) is naar
het archief verplaatst. Detail van de afgeronde punten: zie `BACKLOG-ARCHIEF.md` + de git-historie
van beide repo's.

---

## Openstaande punten

### A. Grote onderwerpen — bewust geparkeerd, wachten op Marcels go

1. **Verkoper-zelfregistratie zonder begeleider** (24 aug 2026). Nu komt elke verkoper-listing via
   een traject dat een begeleider heeft aangemaakt — asymmetrisch met de koper-zelfregistratie die
   al bestaat. Symmetrisch maken is een groter, gevoeliger ontwerp (wie wordt de begeleider van zo'n
   traject, welke data mag ongecontroleerd van een anonieme inzending binnenkomen).

2. **Automatische betaalintegratie voor facturen** (24 aug 2026). Marcel: "uiteindelijk automatisch
   via directe bankbetaling, nu te kostbaar." Tussenstap staat live: de doorlopend genummerde
   BTW-factuur per adviseur (PDF), die Marcel zelf verstuurt. Een echte iDEAL-integratie
   (Mollie/Stripe) is bewust uitgesteld, geen datum.

3. **Echte juridische fusie — Boek 2 BW-documenten.** Deelpunt van "de M van M&A". BEM/LoI/SPA zijn
   nu vanuit koop/verkoop-taal geschreven; een echte fusieprocedure (fusievoorstel, KvK-deponering,
   wettelijke verzetstermijn crediteuren, notariële fusieakte) is een apart, groot stuk. Het
   dealvoorstel heeft al wél een informatief hoofdstuk dat die procedure generiek toelicht en
   benadrukt dat het platform die niet doorloopt of vervangt.

4. **Rolmodel: twee gelijkwaardige partijen i.p.v. koper/verkoper.** Deelpunt van "de M van M&A",
   door Marcel expliciet **buiten scope** gezet ("te veel inbreuk") — `mna_trajecten` heeft één
   koper-koppeling en één eenzijdig beoordeelde DD-dataset; raakt `begeleiderAuth`/`rolVanCode`/alle
   moduleslots door bijna de hele backend. **Ook** de volwaardige bod-vergelijker (één gedeelde
   DD-dataset die meerdere koperstrajecten voedt, met per-document per-koper zichtbaarheid) valt
   hieronder — de lichte "gekoppelde trajecten"-variant is 31 aug gebouwd (elk traject een eigen
   silo, alleen de dealvoorstel-cijfers worden vergeleken).

5. **Post-merger integratie (PMI): earn-out-/vendor-loan-bewaking + 100-dagenplan.** Geldt voor
   élke deal, niet alleen fusies. De rekenkern berekent earn-out-schema's, vendor loans en de
   synergie-aanname wél, maar niets bewaakt ná closing of de targets gehaald worden. Botst met de
   14-dagen-dataverwijderregel → oplossing: opt-in per traject dat de 14-dagenregel opheft, met een
   eigen privacy.html-rij (nieuw verwerkingsdoel/bewaartermijn). Volledig ontwerp (nieuwe fase
   "Integratie", `mna_post_closing_periode`-tabel, kanban-100-dagenplan) staat in de git-historie
   van dit bestand. **Uitdrukkelijk niet bouwen, alleen vastgelegd.**

### B. Kleine vervolgpunten uit afgeronde bouwsessies

6. **Bod-vergelijker — laatste stappen** (onderdeel 4 van het onderhandel-playbook — kern + code staan; 31 aug afgerond wat kon).
   - `kopieer_dd_van`-rij-id-fix (`worker/10-mna-communicatie.js`) + een **permanente negatief-rolgeval-test** in `tests/e2e-crosspath-fixes.mjs` (koper-code → 401, verkopercode → 401, onbekende code → 401, begeleider-code → 200 "geen_groep") staan klaar. **Rest = deploy** (`scripts/deploy.sh`) + de test één keer draaien tegen de live worker.
   - De **gevulde testklant** draaien wanneer je wilt: `ADMIN_KEY=… node scripts/testklant-onderdeel6.mjs` (of `--leeg` voor een externe tester).

7. **Testtraject-formulier `/leads/testtraject` — grotendeels afgerond 31 aug 2026 (frontend + backend, niet gepusht/gedeployd).** Rate-limiter live in `worker/23-leads.js` (max 5 inzendingen / 15 min / IP, geldt ook voor `/leads/aandragen`; `clientIP`+`checkRateLimit` doorgegeven vanuit `cloudflare-worker.js`). Cloudflare Turnstile-ondersteuning ingebouwd maar **uit tot geconfigureerd**: backend verifieert `turnstileToken` alleen als `env.TURNSTILE_SECRET` is gezet; `index.html` toont de widget alleen als `TT_TURNSTILE_SITEKEY` is ingevuld (leeg = honeypot + rate-limiter dragen de bescherming, formulier werkt ongewijzigd). **Om Turnstile aan te zetten:** widget aanmaken in Cloudflare (Turnstile → koersvoormorgen.nl), site key in `index.html` plakken, `npx wrangler secret put TURNSTILE_SECRET`. **Werkregel 17:** zodra Turnstile actief is, een regel toevoegen aan `privacy.html` (Cloudflare Turnstile verwerkt IP + gedragssignaal voor botdetectie, cookieloos) — nu niet nodig omdat het uit staat.

8. **Bedrijfsscan — losse eindjes.** (a) **AFGEROND 31 aug 2026 (niet gepusht):** de groepsmodus-AI (`genereerKantoorAI`/`genereerGroepsAI`) gebruikt nu de sector van de *opgeslagen scan* — per kantoor `o.sector`, voor het groepsrapport de gedeelde sector als alle deelnemers gelijk zijn, anders sectorneutrale bewoording ("onderneming(en)"). Oude scans zonder sector vallen terug op de scan-sector. Helpers `labelsVoorSector()`/`groepSectorLabels()` in de browser geverifieerd. (b) **Nog open:** fase 3 — bredere marketing-/positioneringstekst (`index.html` naast de al aangepaste offer-card, plus `privacy.html`/`voorwaarden.html`) zodra een niet-accountancy sector actief wordt gepromoot. Jouw call.

9. ~~Check marilyn structuur_type-selector~~ — **GECONTROLEERD 31 aug 2026: niet nodig.** `marilyn.html` heeft `#m-structuur` (bv/maatschap/eenmanszaak) in de aanmaakmodal en stuurt `structuur_type` mee in `/mna/create` (regel ~2867/2958). Niets te doen.

10. **Marcel bekijkt zelf** of de rest van de desktop-homepage nog aandacht nodig heeft (hero +
    hero-visual zijn 31 aug gedaan).

### Aandachtspunt (geen genummerd bouwpunt)

De `🧪 TEST`-naamgevingsconventie maakt geen onderscheid tussen kortlevende verificatie-testdata en
bewust-blijvende referentiepakketten — een admin-opschoonactie kan per ongeluk een blijvend
testpakket meepakken (gebeurd 21-22 aug 2026 bij drie MKB-testpakketten). Geen actie ondernomen.

---

## Testplan: geautomatiseerde end-to-end test (zie `tests/README.md`)

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
3. Dealvoorstel-modal: bekende invoer → **asserten dat de berekende tabelwaarden exact kloppen** (prijsmechanisme, schuldafbouw, buy-and-build, opbrengst-brug, ZOPA, BATNA, LoI-checklist, bod-vergelijker) — dit beschermt de rekenkern
4. Bieding-modal: bod = EBITDA × multiple exact; vervolgstappen-paneel verschijnt
5. Informatieverzoek: bestaande knop → fase 1; via bieding-paneel → fase 2 met DD-categorieën
6. Verkoper-flow: inloggen, velden zichtbaar, verversen werkt

Daarnaast losse validatiescripts voor de rekenkern (`scripts/validate-*.mjs`): opbrengstbrug,
maatschap-waardering, zopa-tradespace, batna-walkaway, bod-vergelijker — samen 142 checks.

### Draaien
```
node tests/e2e-api.mjs            # of: --skip-ai voor snelle run
npx playwright test               # UI-suite
for f in scripts/validate-*.mjs; do node "$f"; done   # rekenkern-checks
```
Afspraak: alles groen vóór elke worker-deploy en vóór elke frontend-push.
