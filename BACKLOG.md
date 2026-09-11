# Koers voor Morgen — Backlog

**Bouwfreeze OPGEHEVEN (Marcel, 31 augustus 2026).** Backlogpunten mogen gewoon opgepakt worden.
Discipline blijft: één wijziging tegelijk, testen vóór opleveren, bij onduidelijke scope eerst
afstemmen.

Afgeronde/afgewezen punten: `BACKLOG-ARCHIEF.md` (wordt niet standaard meegewogen). Dit bestand =
**alleen wat nu nog open staat.** Volledig herschreven op **31 augustus 2026** (na de twee
ChatGPT-reviewrondes) met pri[oriteit] + noodzaak per punt.

**Geverifieerd tegen de huidige staat op 11 september 2026** (dit bestand liep flink achter — meerdere
"nog open"-punten bleken al af): 0.1, 2.1's push-restpunt en 2.3's afwijs-toelichting/staging-cleanup
zijn toen als afgerond gemarkeerd; 2.2 is als "status onduidelijk" gemarkeerd (het formulier waar het
over gaat lijkt nergens meer gelinkt). Secties 1 (jouw beslissingen) en 3 (bewust geparkeerd) zijn
niet apart tegen de code geverifieerd — check die zelf nog even inhoudelijk als je ze oppakt.

**Prioriteit:** P1 = nu / deze week · P2 = binnenkort · P3 = later.
**Noodzaak:** 🔴 moet gebeuren · 🟡 zou goed zijn · ⚪ afweging / optioneel.

---

## 0. Infrastructuur & hygiëne

### 0.1 — Backend committen + pushen (en deploy-staat verifiëren) · **AFGEROND, geverifieerd 11 sep 2026** ✅
Geverifieerd: `git status` in beide repo's is schoon, `main` staat gelijk aan GitHub, en elke
backend-wijziging deployt sindsdien standaard via `scripts/deploy.sh`/`wrangler deploy`
(staging → productie). Onderstaande tekst is de oorspronkelijke (31 aug 2026) probleembeschrijving,
bewaard voor context — niet meer actueel.

<details><summary>Oorspronkelijke tekst (31 aug 2026, niet meer actueel)</summary>

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

</details>

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

### 1.1 — MKB-multiple: 2,5–4,5× herijken? · **AFGEROND 11 sep 2026 (herzien, zelfde dag)** ✅
Marcel: "ja" (ophogen richting Brookz) → eerst herijkt naar 4,0–6,0×, gecentreerd op het Brookz-
gemiddelde van 5,0×. Bij het 1.3b-onderzoek hieronder bleek dat gemiddelde het **blended** cijfer
over alle sectoren te zijn, niet specifiek voor retail/horeca/handel/ambacht — de echte Brookz-
cijfers per sector (retail 2,5×, horeca 3,3×) lagen juist ónder de nieuwe band. Zelf teruggezet naar
de oorspronkelijke **2,5–4,5×**. Details: `SECTORPROFIEL-BRONNEN.md`.

### 1.2 — Zorg-multiple: 1–3× omzet begrenzen? · **AFGEROND 11 sep 2026** ✅
Marcel koos (via vraag met twee opties): **omvangsafhankelijk maken**. Geïmplementeerd: groeps-FTE
(`partner_fte`) ≤5 → 1–3× omzet blijft gelden; >5 FTE → 6,0–7,3× EBITDA (Brookz "zorg & farmacie").
Onafhankelijk gevalideerd tegen het rekenvoorbeeld uit de bron (`scripts/validate-zorg-omvang-
multiple.mjs`, 15/15 checks). Details: `SECTORPROFIEL-BRONNEN.md`.

### 1.3b — Gebronde benchmarkdata voor de niet-accountancy bedrijfsscan · **P2 · 🟡**
De bedrijfsscan-AI is buiten accountancy "weinig zeggend" (Marcel, 31 aug 2026, over MKB). Oorzaak:
voor niet-accountancy krijgt de AI géén benchmarks en géén waardering mee (`benchmarkFte=0`,
`cbsGroeiIndex=null`, `sectorBenchmarkZin` leeg, `waardering`="niet beschikbaar") — er is geen
gebronde data en de gouden standaard verbiedt verzonnen getallen. **Al gedaan (31 aug):** kwalitatieve
`SECTOR_AI_CONTEXT` per sector (mkb/zorg/itsoftware) toegevoegd aan de scan-prompt — overname-
aandachtspunten, koperstypes, geen cijfers. **Nog te doen:** echte, gebronde MKB-/zorg-/IT-
kengetallen (EBITDA-marge-ranges, omzet/FTE per subsector, groei-index) toevoegen aan
`/benchmarks` (backend) + wiren in de scan-prompt zoals accountancy dat heeft.
**Deelbevinding 11 sep 2026:** Brookz Overnamebarometer H2-2025 geeft per sector (niet alleen het
blended MKB-gemiddelde): Detailhandel 2,5×, Horeca/Toerisme/Recreatie 3,3×, IT-diensten 6,7×,
Softwareontwikkeling 7,5×, Zorg & Farmacie 6,5×. Retail/horeca al verwerkt in 1.1 hierboven; de
IT/software-multiple (nu 4–6×) ligt duidelijk onder de gevonden 6,7–7,5× — nog niet doorgevoerd,
wacht op jouw beslissing. Handel/ambacht: geen aparte cijfers gevonden.
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

### 2.1 — Bod-vergelijker: laatste stappen · **grotendeels AFGEROND, geverifieerd 11 sep 2026**
Kern + code staan (onderdeel 4 van het onderhandel-playbook). `git status` bevestigt: alle genoemde
bestanden (`mna/03-rekenkern-waardering.js`, `mna/08-handleiding.js`, `adv.html`,
`scripts/validate-bod-vergelijker.mjs`, `scripts/testklant-onderdeel6.mjs`) zijn gecommit en
gepusht — dat restpunt is klaar. **Nog open, optioneel, ⚪:**
- De **negatief-rolgeval-test** in `tests/e2e-crosspath-fixes.mjs` één keer tegen de live worker
  draaien (koper-code → 401, verkopercode → 401, onbekende code → 401, begeleidercode → 200
  "geen_groep").
- Opnieuw testen met een gevulde testklant — `ADMIN_KEY=… node scripts/testklant-onderdeel6.mjs`
  (`--leeg` voor een externe tester). Beide vereisen Marcels ADMIN_KEY (Claude Code heeft die niet
  standaard) — commando's staan hierboven kant-en-klaar.

### 2.2 — Cloudflare Turnstile op het testtraject-formulier · **GESCHRAPT 11 sep 2026** ✅
Marcel (11 sep 2026, op de vraag hierboven): "geen idee, los op" — zelf besloten: het formulier
was al vervangen door de proefaccount-flow (zie 2.3) en linkte nergens meer vanaf een pagina.
Het dode backend-endpoint `/leads/testtraject` + de bijbehorende Turnstile-verificatie zijn uit
`worker/23-leads.js` verwijderd (`/leads/aandragen`, ongerelateerd, blijft ongewijzigd). Bestaande
`mna_leads`-rijen met bron='testtraject' blijven staan als historie. Geen Turnstile-secret was
ooit ingesteld, dus dit had ook nooit effect.

### 2.3 — Proefaccount voor adviseurs · **LIVE 2 sep 2026** ✅ (één restpunt, zie onder)
Marcel wil de drempel verlagen: naast "plan een demo" ook een **proefaccount na goedkeuring door
Marcel**. Aanvraag → marilyn goedkeuren → automatisch tijdelijk adviseursaccount (1 traject,
30 dagen, modules dossier + AI-analyse + Q&A; contracten/export uit) + activatiemail.

**Gebouwd + op STAGING (2 sep 2026), nog niet productie:**
- Backend `worker/25-adviseur-proef.js`: openbaar `POST /adviseur/proef/aanvraag` (rate-limit
  3/uur, honeypot, notificatiemail) + admin `GET /adviseur/proef/aanvragen` +
  `POST /adviseur/proef/aanvraag/{id}/besluit` (goedkeuren/afwijzen, idempotent).
- Schema: tabel `adviseur_proef_aanvragen` + kolommen `proef` / `proef_tot` / `proef_status` op
  `bf_gebruikers`. `SCHEMA_VERSION` → 2.
- Vervalcheck op het login-pad (`/gebruikers/login` + `/adviseur/trajecten`): verlopen proef →
  403 met nette melding (`PROEF_VERLOPEN_MELDING` in `worker/02-config-constanten.js`).
- Nachtelijke `scheduled()`-taak: verlopen proef → `proef_status='verlopen'`, `status='inactief'`,
  sessietoken gewist.
- marilyn: tab **Proefaanvragen** (lijst + goedkeuren/afwijzen). Frontend al gepusht? nee — zit in
  de lokale marilyn.html-wijziging, moet mee met de rest.

**Gebouwd 2 sep 2026 (staging, geverifieerd) — vervolg op bovenstaande:**
- ✅ Goedkeur-flow end-to-end getest op staging: account aangemaakt met juiste proef-velden,
  idempotent bij dubbel goedkeuren. (mail niet getest — staging heeft geen RESEND-sleutel.)
- ✅ 5-dagen-vooraf herinneringsmail (`scheduled()`, tussenstatus `proef_status='herinnerd'`).
- ✅ Definitieve dataopruiming (`scheduled()`): 30 dagen grace ná `proef_tot` → trajecten via
  `archiveerEnPurgeerTraject` + aanvraag-PII gewist + `bf_gebruikers`-rij weg. `/avg/verwijder`
  wist nu ook `adviseur_proef_aanvragen` op e-mail.
- ✅ "Omzetten naar betalend": endpoint `POST /adviseur/proef/omzetten/{id}` + knop in de
  marilyn-tab Proefaanvragen (op goedgekeurde rijen).
- ✅ Frontend: `_src/proefaccount.html` (formulier + uitleg, JSON-submit via `#proefform`-handler
  in `kvm.js`) + knop "Vraag een proefaccount aan" op `voor-adviseurs.html` en de voet-CTA van
  `platform.html`; geregistreerd in `build.py` + sitemap. Pagina rendert, formulier getest tegen
  staging (aanvraag → succesmelding).
- ✅ Handleiding (`adv.html` `renderAdvHandleiding()` stap 4): toont bij een proefaccount "1 traject,
  30 dagen tot <datum>". Vereiste `proef`/`proef_tot` in de adviseur-login-DTO (`worker/16-adviseur.js`).

**Voorwaarden (werkregel 17) — Marcel akkoord 2 sep 2026, verwerkt op staging:**
- ✅ `privacy.html`: rij "Proefaccount aanvragen (adviseur)" toegevoegd; versie 1.7 → 1.8 · September 2026.
- ✅ Adviseurs-GV (backend-tekst): één zin in Artikel 7 ("Een proefaccount eindigt van rechtswege op
  de bij aanvang meegedeelde einddatum; voortzetting daarna vereist een nieuwe afspraak").
  `GV_VERSIE` 1.8 → 1.9. **Neveneffect:** bestaande adviseurs krijgen bij eerstvolgende login
  eenmalig opnieuw het GV-acceptatiescherm (bestaand mechanisme).
- `voorwaarden.html` (v2.2, verkoper/koper): geen wijziging — proefaccount raakt die rol niet.

**Live 2 sep 2026:** backend gedeployed naar productie (schema v2 gemigreerd, endpoints geverifieerd,
GV 1.9); frontend gecommit + gepusht. Werkt end-to-end.

**3 sep 2026 — afwijzing stuurt nu een mail** aan de aanvrager (backend live op productie). De
bijbehorende marilyn-wijziging (bij "Afwijzen" een optioneel toelichtingsveldje dat in de mail komt)
staat **lokaal in `marilyn.html`, nog niet gecommit/gepusht** — zonder die push wijst marilyn wel af
mét mail, alleen zonder het toelichtingsveld.

**Restpunten:**
- ✅ `marilyn.html` (afwijs-toelichting) — geverifieerd 11 sep 2026: staat er, gecommit en gepusht
  (de `prompt()` voor "reden" bij Afwijzen).
- ✅ Staging-testdata opgeruimd (11 sep 2026): de 2 openstaande testaanvragen
  (`proeftest+stg`/`previewtest+stg`) verwijderd; de testaccount `G1788384100946REC6` bleek al
  automatisch opgeruimd (de nachtelijke purge-taak deed zijn werk).
- **Nog open, jouw beslissing:** vervangt de proefaccount-flow de oudere `/leads/testtraject`-flow
  volledig, of moeten die naast elkaar blijven bestaan? Zie ook punt 2.2 hierboven — dat formulier
  lijkt inmiddels nergens meer gelinkt.

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
