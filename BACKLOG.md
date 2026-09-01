# Koers voor Morgen — Backlog

**Bouwfreeze OPGEHEVEN (Marcel, 31 augustus 2026).** Backlogpunten mogen gewoon opgepakt worden.
Discipline blijft: één wijziging tegelijk, testen vóór opleveren, bij onduidelijke scope eerst
afstemmen.

Afgeronde/afgewezen punten: `BACKLOG-ARCHIEF.md` (wordt niet standaard meegewogen). Dit bestand =
**alleen wat nu nog open staat.** Volledig herschreven op **31 augustus 2026** (na de twee
ChatGPT-reviewrondes) met pri[oriteit] + noodzaak per punt.

**Prioriteit:** P1 = nu / deze week · P2 = binnenkort · P3 = later.
**Noodzaak:** 🔴 moet gebeuren · 🟡 zou goed zijn · ⚪ afweging / optioneel.

---

## 0. Infrastructuur & hygiëne

### 0.1 — Backend committen + pushen (en deploy-staat verifiëren) · **P1 · 🔴**
De **backend-repo** (`~/Documents/GitHub/koersvoormorgen-backend`) staat **20 commits vóór op GitHub
én heeft ~21 ongecommitte bestanden** + `backend/predeploy.sh` untracked. Daarin zit al het
backend-werk van de afgelopen ~2 weken: matching-platform, teaser-/verkoopmemorandum-generatoren,
server-side moduleslots (Q&A / AI-analyse / contracten / marketing), mkb AI-extractieschema
12 → 56 velden, de leads-rate-limiter + Turnstile-ondersteuning, `wrangler.toml` predeploy-hook.
- **Wat:** `git add` + commit in logische brokken + `git push`. `predeploy.sh` mee-committen.
- **Waarom 🔴:** zolang dit niet in versiebeheer staat is er **geen schone rollback en geen backup**
  van de huidige backend; de GitHub-backendrepo is verouderd, dus verwijzingen vanuit de frontend
  kloppen mogelijk niet meer met wat er op GitHub staat.
- **Apart nagaan:** draait alles wat lokaal staat ook echt op **Cloudflare productie**? Een
  backenddeploy gaat via `npx wrangler deploy`, losgekoppeld van git — dus "lokaal aanwezig" ≠
  "live". Vergelijk de laatste `wrangler deploy`-Version-ID met de lokale staat, of doe een verse
  staging → productie-deploy via `scripts/deploy.sh backend`.
- **Wie:** Marcel (review wat er in de 20 commits zit) + ik voor het opdelen/committen op verzoek.
  Auth-/betaal-/matching-code → eerst staging.

### 0.2 — Allow-list DTO-architectuur voor deal-data-endpoints · **AFGEROND 1 sep 2026** ✅
Volledig gebouwd, gereviewd en **live op productie**. Volledige log + ontwerp: `POLICY-LAAG-ONTWERP.md`.
Kort:
- Elke deal-data-endpoint naar een externe rol: `SELECT *` + deny-list → **expliciete allow-list**.
- Centrale policy-laag `worker/00-policy.js` (`resolveRol` + `filterExternTraject`); `begeleiderAuth`
  en `rolVanCode` delegeren ernaartoe; de marilyn-"muur" is nu ook een allow-list.
- Vier echte lekken gedicht: `tussen_code`/`traject.id` naar de koper (privilege-escalatie),
  fee-/memorandum-velden van externe adviseurs naar de platformbeheerder, DD-data van een extern
  traject wisbaar met ADMIN_KEY.
- Regressienetten: `tests/policy-equivalentie.mjs` (54 checks) in `predeploy.sh`; schema-drift-gate
  `tests/schema-gate.mjs` met vastgelegde baseline (`tests/schema-baseline.json`); CONF-matrix
  uitgebreid.
- Bewust NIET: stap 4 (login-DTO fysiek verhuizen naar `00-policy.js`) — stond al als één expliciete
  lijst in `worker/11`, verplaatsen = alleen drift-risico, geen winst.

---

## 1. Beslissingen die op jou wachten (geen code van mij nodig)

### 1.1 — MKB-multiple: 2,5–4,5× herijken? · **P2 · 🟡**
Het MKB-sectorprofiel gebruikt een EBITDA-multiple-range van **2,5–4,5×**. De actuele Brookz
Overnamebarometer (H2-2025) geeft een **gemiddelde van 5,0×** ("hoogste in tien jaar"). De bovengrens
van het profiel ligt daar dus onder. Bewust conservatief kan — maar het is een keuze.
- **Beslissing:** laten staan (en in `SECTORPROFIEL-BRONNEN.md` documenteren als bewuste ondergrens),
  of ophogen richting Brookz.
- Volledige onderbouwing: `SECTORPROFIEL-BRONNEN.md`.

### 1.2 — Zorg-multiple: 1–3× omzet begrenzen? · **P2 · 🟡**
Het zorgprofiel waardeert op **1–3× omzet** ("praktijkwaarde"). Dat is alleen verdedigbaar voor
**kleine, eigenaar-gedreven solopraktijken**; voor grotere praktijken/ketens hanteert de markt een
EBITDA-multiple (~6,0–7,3×).
- **Beslissing:** begrenzen tot kleine praktijken (met die randvoorwaarde in de tekst), of
  omvangsafhankelijk maken (klein = omzet-multiple, groter = EBITDA-multiple). Evt. met een
  zorgadviseur toetsen.

### 1.3b — Gebronde benchmarkdata voor de niet-accountancy bedrijfsscan · **P2 · 🟡**
De bedrijfsscan-AI is buiten accountancy "weinig zeggend" (Marcel, 31 aug 2026, over MKB). Oorzaak:
voor niet-accountancy krijgt de AI géén benchmarks en géén waardering mee (`benchmarkFte=0`,
`cbsGroeiIndex=null`, `sectorBenchmarkZin` leeg, `waardering`="niet beschikbaar") — er is geen
gebronde data en de gouden standaard verbiedt verzonnen getallen. **Al gedaan (31 aug):** kwalitatieve
`SECTOR_AI_CONTEXT` per sector (mkb/zorg/itsoftware) toegevoegd aan de scan-prompt — overname-
aandachtspunten, koperstypes, geen cijfers. **Nog te doen:** echte, gebronde MKB-/zorg-/IT-
kengetallen (EBITDA-marge-ranges, omzet/FTE per subsector, groei-index) toevoegen aan
`/benchmarks` (backend) + wiren in de scan-prompt zoals accountancy dat heeft.
- **Wie/wat:** jij levert of bevestigt de bron (Brookz-subsectoren, brancheorganisaties, CBS-SBI);
  ik bouw. Raakt de gouden standaard (herkomst benchmarks) — bron eerst vastleggen in
  `SECTORPROFIEL-BRONNEN.md`.

### 1.3 — Bredere marketing-/positioneringstekst voor niet-accountancy · **P2 · 🟡**
De scan en het M&A-platform zijn nu multi-sector (accountancy/mkb/zorg/IT). `index.html` (naast de
al aangepaste offer-card), `privacy.html` en `voorwaarden.html` zijn nog grotendeels
accountancy-geframed. Aanpassen zodra je een niet-accountancy sector actief gaat promoten.
- **Wie:** jouw call op timing + toon; ik voer uit.

### 1.4 — Desktop-homepage: rest bekijken · **P3 · ⚪**
Hero + hero-visual zijn 31 aug opgeschoond. Kijk zelf of de rest van de desktop-layout nog aandacht
nodig heeft; meld wat je wilt en ik pak het op.

---

## 2. Afronden wat al grotendeels gebouwd is

### 2.1 — Bod-vergelijker: laatste stappen · **P2 · 🟡**
Kern + code staan (onderdeel 4 van het onderhandel-playbook). De twee rekenfouten die jouw eerste
vergelijking (T7OFKL11) liet zien zijn opgelost en met een los rekenscript nagerekend — details in
`BACKLOG-ARCHIEF.md` #23. Rest:
- Backend deployen (`scripts/deploy.sh backend`) — draagt o.a. de `kopieer_dd_van`-rij-id-fix in
  `worker/10-mna-communicatie.js`. *(Zit in punt 0.1.)*
- **Frontend pushen** — `mna/03-rekenkern-waardering.js`, `mna/08-handleiding.js`, `adv.html`,
  `scripts/validate-bod-vergelijker.mjs`, `scripts/testklant-onderdeel6.mjs`.
- De **negatief-rolgeval-test** in `tests/e2e-crosspath-fixes.mjs` één keer tegen de live worker
  draaien (koper-code → 401, verkopercode → 401, onbekende code → 401, begeleidercode → 200
  "geen_groep").
- Opnieuw testen met een gevulde testklant — `ADMIN_KEY=… node scripts/testklant-onderdeel6.mjs`
  (`--leeg` voor een externe tester). Volg stap 2 in de scriptuitvoer: **belang% in beide trajecten
  gelijk houden**, alleen escrow/earn-out/financiering/timing/fit variëren.

### 2.2 — Cloudflare Turnstile aanzetten op het testtraject-formulier · **P3 · ⚪**
Frontend + backend zijn klaar en **veilig uit** tot geconfigureerd (honeypot + rate-limiter dragen
nu de bescherming; het formulier werkt ongewijzigd). Aanzetten:
1. Turnstile-widget aanmaken in Cloudflare (koersvoormorgen.nl).
2. Site key in `index.html` (`TT_TURNSTILE_SITEKEY`).
3. `npx wrangler secret put TURNSTILE_SECRET`.
4. **Werkregel 17:** dan een regel toevoegen aan `privacy.html` (Turnstile verwerkt IP +
   gedragssignaal voor botdetectie, cookieloos).

---

## 3. Grote onderwerpen — bewust geparkeerd, wachten op jouw go

### 3.1 — Verkoper-zelfregistratie zonder begeleider · **P3 · ⚪**
Nu komt elke verkoper-listing via een traject dat een begeleider aanmaakt — asymmetrisch met de al
bestaande koper-zelfregistratie. Symmetrisch maken is een groter, gevoelig ontwerp (wie wordt de
begeleider, welke data mag ongecontroleerd van een anonieme inzending binnenkomen).

### 3.2 — Automatische betaalintegratie (iDEAL / Mollie / Stripe) · **P3 · ⚪**
Tussenstap staat live: de doorlopend genummerde BTW-factuur per adviseur (PDF) die je zelf verstuurt.
Een echte iDEAL-integratie is bewust uitgesteld ("nu te kostbaar"). Geen datum.

### 3.3 — Echte juridische fusie (Boek 2 BW-documenten) · **P3 · ⚪**
BEM/LoI/SPA zijn nu vanuit koop/verkoop-taal geschreven. Een echte fusieprocedure (fusievoorstel,
KvK-deponering, wettelijke verzetstermijn crediteuren, notariële fusieakte) is een apart, groot stuk.
Het dealvoorstel licht die procedure al informatief toe en benadrukt dat het platform hem niet
doorloopt of vervangt.

### 3.4 — Rolmodel: twee gelijkwaardige partijen i.p.v. koper/verkoper · **P3 · ⚪**
Door jou expliciet **buiten scope** gezet ("te veel inbreuk"). Raakt `begeleiderAuth` / `rolVanCode`
/ alle moduleslots door bijna de hele backend. Óók de volwaardige bod-vergelijker (één gedeelde
DD-dataset, per-koper zichtbaarheid) valt hieronder — de lichte "gekoppelde trajecten"-variant is
31 aug gebouwd.

### 3.5 — Post-merger integratie (PMI): earn-out-/vendor-loan-bewaking + 100-dagenplan · **P3 · ⚪**
De rekenkern berekent earn-out-schema's en vendor loans wél, maar niets bewaakt ná closing of de
targets gehaald worden. Botst met de 14-dagen-dataverwijderregel → opt-in per traject dat die regel
opheft, met een eigen privacy.html-rij. Volledig ontwerp staat in de git-historie van dit bestand.
**Uitdrukkelijk niet bouwen, alleen vastgelegd.**

---

## 4. Kwaliteit / hardening — optioneel, reageren i.p.v. preventief

### 4.1 — Volledige "genereer-en-diff"-ijkregressie voor het dealvoorstel · **P3 · ⚪**
De 95-regel prompt-opbouw in `mna/04` refactoren tot een pure functie, zodat de opbouw getest kan
worden zonder een live AI-call. Per **werkregel 19** eerst een aparte onafhankelijke review, omdat
het je belangrijkste document raakt en niet end-to-end te verifiëren is vanuit een bouwsessie.
**Alleen doen als de lichtere bescherming tekortschiet.** Nu al actief: `audit-consistentie.mjs`
check 8 + 9, `scripts/check-dealvoorstel-output.mjs`, `scripts/check-contract-output.mjs`.

### 4.2 — B4: pure getal-herhalende AI-zinnen vervangen door vaste zinnen · **P3 · ⚪**
**Afgesproken: niet preventief doen.** Reageren op een waargenomen fout — als een gegenereerd
dealvoorstel de AI ergens een bedrag ziet verhaspelen in een zin die alleen een tabelwaarde
herhaalt, dán die specifieke zin vastzetten. Alles dichttimmeren zou de tekst robotachtig maken.

---

## Vaste checks & cadans (geen backlog — staat in `CLAUDE.md` → "Vaste checks & cadans")

- Sectorbenchmark-bronnencheck (`SECTORPROFIEL-BRONNEN.md`) — per kwartaal
- Lichte diff-review van de maand-commits door een verse AI — maandelijks
- `/code-review ultra` — per kwartaal + vóór de eerste betalende adviseur (jij triggert, kost geld)
- `known-good-JJJJMMDD` git-tag na elke groene/gedeployde staat
- Bij een nieuw AI-model: `scripts/check-dealvoorstel-output.mjs` draaien + één dealvoorstel nalezen
- Werkregel 19: verse onafhankelijke review van de diff vóór oplevering bij wijzigingen aan de
  rekenkern, aan een tegenpartij-/klant-prompt, of aan auth/rechten

---

## Aandachtspunt (geen genummerd bouwpunt)

De `🧪 TEST`-naamgevingsconventie maakt geen onderscheid tussen kortlevende verificatie-testdata en
bewust-blijvende referentiepakketten — een admin-opschoonactie kan per ongeluk een blijvend
testpakket meepakken (gebeurd 21-22 aug 2026 bij drie MKB-testpakketten). Geen actie ondernomen.

---

## Testplan: geautomatiseerde end-to-end test (zie `tests/README.md`)

Doel: vóór elke deploy met één commando bevestigen dat het hele systeem werkt.

### Deel A — API-tests (`tests/e2e-api.mjs`, tegen de live worker, eigen wegwerp-testdata)
1. `/health` — 200 + `ok:true`
2. Adviseur-lifecycle: uitnodigen → activeren → verkoop (limiet/modules) → traject aanmaken →
   limiet afdwingen → module-gating → deactiveren → verwijderen
3. Rollen-login: verkoper-, koper- en tussenpersoonscode → juiste rol + `modules`
4. Documentupload (multipart) → analyse aanwezig → `veld_extractie` gevuld → cache-logregel
5. DD-data opslaan (`/mna/save`) en teruglezen
6. Fase-wijziging via logboek-endpoint → `traject_fase` verifiëren → terugzetten
7. Waardering genereren → JSON-structuur valideren
8. Document-e-mailendpoints (nda/loi/bem/dealvoorstel/bieding) → `ok:true` + versie in `mna_doc_versies`
9. Volledige opruiming (testaccount + testtraject incl. documenten)

AI-stappen (4, 7) achter `--skip-ai` voor een goedkope snelle run.

### Deel B — UI-tests (Playwright, `tests/e2e-ui.spec.js`, headless tegen lokale mna.html + live worker)
1. Login-schermen: drie rollen, foutmelding bij ongeldige code
2. Begeleider-dashboard: alle knoppen aanwezig; met module `contracten` uit → 6 documentknoppen
   disabled met de juiste tooltip
3. Dealvoorstel-modal: bekende invoer → **asserten dat de berekende tabelwaarden exact kloppen**
   (prijsmechanisme, schuldafbouw, buy-and-build, opbrengst-brug, ZOPA, BATNA, LoI-checklist,
   bod-vergelijker) — beschermt de rekenkern
4. Bieding-modal: bod = EBITDA × multiple exact; vervolgstappen-paneel verschijnt
5. Informatieverzoek: bestaande knop → fase 1; via bieding-paneel → fase 2 met DD-categorieën
6. Verkoper-flow: inloggen, velden zichtbaar, verversen werkt

Losse rekenkern-validatiescripts (`scripts/validate-*.mjs`): opbrengstbrug, maatschap-waardering,
zopa-tradespace, batna-walkaway, bod-vergelijker, grondslag, edge-cases, verkoper-bedragen —
samen 255 checks.

### Draaien
```
node tests/e2e-api.mjs            # of: --skip-ai voor snelle run
npx playwright test               # UI-suite
for f in scripts/validate-*.mjs; do node "$f"; done   # rekenkern-checks
node tests/audit-consistentie.mjs                     # statische consistentie/security-audit (9 checks)
```
Afspraak: alles groen vóór elke worker-deploy en vóór elke frontend-push.
