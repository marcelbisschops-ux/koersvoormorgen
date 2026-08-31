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

11. **Dealvoorstel-consistentie na ChatGPT-review — AFGEROND 31 aug 2026 (niet gepusht).** Marcel
    haalde een gegenereerd dealvoorstel door ChatGPT; twee rode + drie oranje bevindingen bleven na
    verificatie overeind. Gefixt in `mna/03-rekenkern-waardering.js` + `mna/04-begeleider-dashboard.js`
    + handleiding (`mna/08` + `adv.html`):
    - **Nieuwe centrale bron van waarheid** `dvVerkoperBedragen()` — vijf strikt gescheiden grootheden
      (`verkopersopbrengstCashClosing` / `toegerekendeEVVerkochtBelang` / `retainedEquity` /
      `earnUpEVAllocation` / `earnUpSellerConsideration`). De AI-prompt krijgt ze nu expliciet
      gelabeld aangereikt met de instructie €367k-achtige EV-toerekening nooit "opbrengst voor de
      verkoper" te noemen (dat is de opbrengst-brug-cash).
    - **Earn-up zit nu in de "voorwaardelijk"-bucket** van de ZOPA trade-space (herrekend naar
      equity/cash-basis met de EV→equity-verhouding van de brug) — "voorwaardelijk 0%" terwijl er een
      earn-up bestaat kan niet meer. Nieuwe invariant + validatiescript.
    - **"totale tegenprestatie" → "waardepositie verkoper"**; behouden belang expliciet gemarkeerd als
      niet door de koper betaald.
    - **DCF-tabel:** "Discontofactor" → "Oprentingsfactor (1+r)^t"; WACC + terminale groeivoet nu
      zichtbaar in de samenvatting + Gordon-Growth-formule in een noot.
    - **Schuldbrug:** context + sectie-instructie leggen nu uit dat bestaande netto schuld doelwit
      (opbrengst-brug) en nieuwe acquisitiefinanciering (schuldafbouwmodel, × bewezen EBITDA) twee
      verschillende posten zijn.
    - Validatie: 176 checks groen (`scripts/validate-*.mjs`, incl. nieuw
      `validate-verkoper-bedragen.mjs` met de exacte ChatGPT-testcase), `tests/e2e-ui.spec.js`
      ZOPA-test bijgewerkt, browsertest tegen de exacte cijfers (367.200 vs 79.707 nu gescheiden;
      voorwaardelijk 40,6% i.p.v. 0%).

12. **Volledige rekenkern-review (ChatGPT, hele module) — AFGEROND 31 aug 2026 (niet gepusht).**
    Marcel liet `mna/03-rekenkern-waardering.js` volledig reviewen (reviewpakket op `~/Desktop/rekenkern-review/`).
    12 bevindingen — alle 12 tegen de code geverifieerd, geen false positives — allemaal gefixt:
    - **#2 (🔴) zorg omzet-multiple:** `dvGetDefaults()` negeerde `multipleBasis:'omzet'`; het dealvoorstel
      rekende 1–3× op EBITDA i.p.v. op omzet. Nu volledige **grondslag-schakelaar** (`p.grondslag`
      + `grondslagBewezen/Prognose`, helpers `dvGrondslagBewezen/Prognose`): closing, prijsmechanisme,
      cliff, gevoeligheid en opbrengst-brug rekenen op de omzet; schuldafbouw/DCF bewust op EBITDA.
      Eigen omzet-grondslagvelden in de dealvoorstel-modal + AI-prompt grondslag-bewust. Nieuw
      `validate-grondslag.mjs` (37 checks).
    - **#1 sectorfallback:** `dvSectorMultipleRange()` geeft geen gegokte `4,5–5,5×` meer — onbekende
      sector / sector zonder range → `bekend:false`, geen multiple; melding i.p.v. getal in dealvoorstel + waarderingsscherm.
    - **#3 forecast-gok:** ontbrekende omzethistorie gaf stil 3% groei → nu `gemGroei:null` + rolling
      forecast verborgen met melding.
    - **#4 negatieve equity:** opbrengst-brug clampt verkoperscash op €0 + `equityNegatief`-vlag +
      waarschuwing "schuld > ondernemingswaarde".
    - **#5 parse-gok:** `dvGeldOfNull()` geeft `null` bij niet-lege maar cijferloze invoer ("onbekend").
    - **#6 DCF:** "FCFF" → "vereenvoudigde unlevered kasstroom" + optionele `afschrijvingenPct`
      (0 = belasting over EBITDA zoals nu; >0 = over EBIT).
    - **#7/#8:** DSCR-label → "EBITDA-dekking schuldendienst (vereenvoudigd)"; quick ratio zonder OHW/voorraad.
    - **#9:** `capex = max(0, ebitda) × %` + NWC-mutatie 0 bij negatieve EBITDA.
    - **#10:** leeg `mgmtRetentie` → `onbekend` (geen risicopunt).
    - **#11:** hardcoded `0,8×` omzetmethode verwijderd uit waarderingsscherm + CSV.
    - **#12:** `earnUpSchuldPct` (default 100 = huidig gedrag) — aandeel earn-up dat op de bankschuld drukt, instelbaar.
    - Validatie: **255 checks groen** over 8 scripts (nieuw: `validate-grondslag.mjs`,
      `validate-edge-cases.mjs`), browsertest zorg/onbekend/negatieve-equity-paden. **Rest = frontend-push**
      (via GitHub Desktop): `mna/03`, `mna/04`, `mna/08`, `adv.html`, `tests/e2e-ui.spec.js`,
      `scripts/validate-*.mjs` (7 stuks), `BACKLOG.md`.

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
