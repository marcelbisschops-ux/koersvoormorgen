# Marilyn — Veiligheid-tab: overkoepelende status (productpunt 22)

## Wat is veranderd (10 okt 2026)

De banner bovenaan de Veiligheid-tab ("Veiligheid actueel — alle verplichte controles op schema")
telde de nachtelijke selfcheck en de ochtendcontrole niet mee, en sectie 0 noemde een ochtendcontrole
groen zodra `checks_geslaagd === checks_totaal` — dus ook bij `0/0` (wat de backend teruggeeft als
`ADMIN_KEY`/`DB` ontbreekt, `voerOchtendcontroleUit()` in `backend/worker/24-veiligheidsdashboard.js`).

Nu (`dagelijkseRunOordeel()` in `marilyn.html`) is een nachtelijke selfcheck of ochtendcontrole alleen
"actueel" als:

- er een run is (`laatste_selfcheck` / `laatste_ochtendcontrole` niet leeg);
- `checks_totaal` een geheel getal > 0 is en `0 <= checks_geslaagd <= checks_totaal`;
- `details` een lijst is met precies `checks_totaal` per-check-objecten met een booleaanse `geslaagd`,
  en het aantal `geslaagd: true` gelijk is aan `checks_geslaagd`;
- alle checks geslaagd zijn (anders: `FAIL (x/y geslaagd)`);
- `ran_at` een geldig tijdstip is en niet ouder dan de **bestaande** 2-dagengrens van knoppentest/E2E.

Anders staat de banner op "Veiligheid NIET actueel" met de reden, sectie 0 (ochtend) wordt rood en
sectie 1 toont onder de gauge "Niet actueel: <reden>". De overige criteria (open kritiek/hoog, diepe
audit, pentest, knoppentest, E2E) zijn ongewijzigd. Geen backend-, API-, rol- of schemawijziging;
geen nieuwe gate, cron of netwerkverzoek.

De statische push-audit (git-hook) wordt getoond als **historisch** gegeven: "laatst gemeld" met
volledige datum. Er is geen vaste pushcadans en hij telt niet mee in de actuele status; `0/0` is nooit
groen.

Actieknoppen (selfcheck, ochtendcontrole, diepe audit, red-team pentest, rapportlink, nieuwe link,
markeer opgelost) melden alleen succes bij een HTTP-succes mét `ok: true` (en voor de rapportlink een
URL). Een "Draai nu"-resultaat dat 0/0, FAIL of inconsistent is, geeft een waarschuwing, geen succes.

## Bewijs — twee gescheiden soorten

### 1. UI-functioneel getest (deze wijziging)

`tests/marilyn-veiligheid.mjs` (ook check 31 in `node tests/audit-consistentie.mjs`) laadt de echte
`marilyn.html` in `node:vm` met een minimale DOM-fixture en een nep-worker, logt echt in, rendert elke
veiligheidssectie en klikt elke actieknop tegen **synthetische** serverantwoorden: ontbrekend, 0/0,
FAIL, malformed, verouderd, ongeldige tijd, annuleren, succes, 401/403/500, netwerkfout, onjuiste JSON,
`ok:false`, en zonder superadmin/geldige sleutel. Er wordt geen echte omgeving, betaalde AI, audit,
mail of deploy aangeroepen.

Dit is **geen bewijs** dat de echte nachtelijke selfcheck of ochtendcontrole draait of slaagt — het
bewijst alleen dat de UI hun resultaten eerlijk weergeeft.

**Diagnose eerste native testrun (10 FAILs):** de vijf detail-varianten (details ontbreken, minder
details dan teller, detail FAIL bij groene teller, detail `null`, `geslaagd` als tekst) × nacht/ochtend
faalden niet op de productcode maar op de testverwachting: de regex verwachtte `<label> details per
check` direct na elkaar, terwijl de banner correct `<label> ongeldig resultaat (details per check
kloppen niet met de teller)` toont. `null`-details worden in de productcode al door de objectguard
afgevangen. Alleen de redenverwachting is aangepast naar deze volledige specifieke reden; `!groen`,
rood en alle negatieve checks zijn ongewijzigd, statusvoorwaarden zijn niet versoepeld.

### 2. Echte controlerun (niet door deze wijziging geleverd of vervangen)

Het bestaande live-bewijs van de echte controleruns (volgens de opdracht: nachtelijke selfcheck 13
checks, ochtendcontrole 10 checks) blijft het bewijs voor een echte controlerun. Het is hier niet
opnieuw uitgevoerd en niet door synthetische tests vervangen; de synthetische tests gebruiken bewust
andere aantallen (4 en 3).

## Status

De Veiligheid-UI hierboven is native afgerond (DONE, taak 7fb3, commit `97aeee4`). Dit document
claimt haar **nog niet live**: een productieclaim volgt pas uit de bestaande releasegates
(onafhankelijke review, commitgate, staging/productie-goedkeuring, postdeploy).

## Verwijderbeheer (10 okt 2026)

Status: **gericht onderdeel, geen volledig verwijderbeheer.** Deze sectie beschrijft alleen wat
aantoonbaar is gebouwd en getest. Ze claimt geen volledige dekking van bulkbeheer, gevolgen of
retentie.

### Stap 1 — foutafhandeling

De backend geeft bij een databasefout op `POST /gebruikers/verwijder/{id}` en
`POST /admin/benchmarks/delete/{sleutel}` een 500 met `{ok:false,error}` in plaats van een fictief
succes (zie `docs/marilyn-verwijderbeheer.md` in de backend-repo). Marilyn telt een verwijdering
daarom alleen als geslaagd bij HTTP-ok **én** `{ok:true}`, en toont nooit servertekst.

### Gebruikersoverzicht: gekozen gebruikers verwijderen

Plaats: `renderGebruikersTab()` in `marilyn.html` (tab **Gebruikers**, alleen voor de hoofdbeheerder).

| Onderdeel | Gedrag |
|---|---|
| Wie | Alleen bij `isSuperAdmin` én een beheerderssleutel (`adminKey`). Anders toont het overzicht geen vakjes, geen ✕ en geen groepsknop, en verstuurt de helper niets. De server controleert de sleutel bij elke POST opnieuw. |
| Selectie | Een vakje per gebruiker in het geladen overzicht. Niets is vooraf aangevinkt. Het kopvakje vinkt alleen de rijen aan die op dat moment in het overzicht staan. Het overzicht heeft geen filter of verborgen rijen, en elke getoonde gebruiker had al een losse ✕. |
| Knop | "Verwijder geselecteerde (n)" is alleen zichtbaar bij n > 0; de teller en het kopvakje volgen elk aan- en uitvinken. |
| Route | Per gekozen gebruiker precies één `POST /gebruikers/verwijder/{id}` (bestaande individuele route, `encodeURIComponent` op het ID, header `x-admin-key`). Geen nieuw endpoint, geen bulkroute, geen cascade, geen nieuw recht en geen automatische herhaling. |
| Losse ✕ | Gebruikt dezelfde helper (`verwijderGekozen()`), dezelfde route en dezelfde uitleg als de groepsactie. |
| Bevestiging | Toont vóór elke POST het aantal en de gekozen namen (met e-mail), plus de beperkte gevolgen: alleen het gebruikersaccount wordt verwijderd via de bestaande route, er wordt niet apart iets gewist van gekoppelde trajecten, documenten of administratie, en bij een weigering vanwege gekoppelde gegevens blijft de gebruiker staan. Er wordt niet beloofd dat gekoppelde gegevens gewist worden. |
| Annuleren | Verstuurt niets; selectie en bediening blijven ongewijzigd. |
| Overlap | Zolang er een verwijdering loopt (los of groep), staan alle ✕-knoppen, vakjes en het kopvakje uit, en weigert de handler een tweede start (`gebVerwijderBezig`). Een dubbelklik geeft één bevestiging en één POST per gebruiker. |
| Uitkomst | Alleen geslaagd bij HTTP-ok **én** `{ok:true}`. 401/403 wordt "geen toegang", 404 "niet meer gevonden", 409 "geweigerd omdat er nog gegevens aan gekoppeld zijn", een netwerkfout "geen verbinding", en 500, `ok:false` of een antwoord zonder JSON "tijdelijke storing". Bij een gemengde uitkomst een melding per reden, zonder statuscodes, ID's of servertekst. |
| Verversen | Na elke bevestigde actie wordt het overzicht opnieuw geladen. Lukt dat niet (netwerkfout, of geen toegang tot `/gebruikers/lijst`), dan staat er een zichtbare laadfout in plaats van een leeg overzicht of "Nog geen gebruikers". |

Bestaande acties per gebruiker (verkoop, eigen/extern, opnieuw sturen, wachtwoord resetten,
(de)activeren, uitnodigen) zijn ongewijzigd. In de gedeelde helper `verwijderGekozen()` krijgt
HTTP 409 nu een eigen reden ("geweigerd omdat er nog gegevens aan gekoppeld zijn"); voorheen viel
409 onder "tijdelijke storing". Dat geldt voor alle overzichten die de helper gebruiken; verder
verandert de uitkomstbepaling daar niet.

### Benchmarkmelding: benchmark verwijderen

Plaats: de `.btn-del-bench`-klikhandler in `marilyn.html` (benchmarkoverzicht). Na bevestiging gaat
één `POST /admin/benchmarks/delete/{sleutel}` (bestaande route, header `x-admin-key`). Alleen
HTTP-ok **én** `{ok:true}` herlaadt de lijst. Bij 500, 401, `ok:false`, een antwoord zonder `ok`,
onjuiste JSON of een netwerkfout verschijnt precies één neutrale foutmelding ("De benchmark kon niet
worden verwijderd. Probeer het later opnieuw.") zonder herladen en zonder servertekst. Annuleren
verstuurt niets. De handler gebruikt geen `innerHTML` en slikt geen fetch-fouten meer in.

### Benchmarkoverzicht: gekozen benchmarks verwijderen (10 okt 2026)

Plaats: `renderBenchmarksTab()` in `marilyn.html` (tab **Benchmarks**). Status: de gebruikers- en
benchmarkgroepsverwijdering zitten in de actuele frontendproductierelease `0202ce1` (DONE, taak 1935,
Pages-deployment `d792cc81`). De proeven in "Bewaking" hieronder blijven synthetisch (nep-worker).

| Onderdeel | Gedrag |
|---|---|
| Wie | Vakjes, kopvakje en groepsknop alleen bij `isSuperAdmin` én `adminKey`. Anders worden ze niet getoond en verstuurt de helper niets. De server controleert `x-admin-key` bij elke POST opnieuw. |
| Selectie | Een vakje per benchmark in het geladen overzicht; niets vooraf aangevinkt. Het kopvakje vinkt alleen de getoonde rijen aan. Het overzicht heeft geen filter of verborgen rijen. Er is geen "alles wissen". |
| Route | Per aangevinkte benchmark precies één `POST /admin/benchmarks/delete/{sleutel}` (bestaande individuele route, `encodeURIComponent` op de sleutel) via de gedeelde helper `verwijderGekozen()`. Geen nieuw endpoint, geen bulkroute, geen backendwijziging, geen automatische herhaling. |
| Losse ✕ | Ongewijzigd: eigen bevestiging, eigen neutrale foutmelding, dezelfde route. Nieuw is alleen dat de ✕ uit staat zolang zijn eigen verzoek of een groepsverwijdering loopt. |
| Bevestiging | Vooraf aantal en gekozen namen (sleutel + omschrijving), plus de gevolgen: alleen de benchmarkconfiguratie (waarde met bron en peildatum) wordt verwijderd; klantdocumenten, trajecten en de waarderingshistorie worden niet gewist. |
| Annuleren | Verstuurt niets; selectie en bediening blijven staan. |
| Overlap | Tijdens een groepsverwijdering staan groepsknop ("Verwijderen..."), vakjes, kopvakje en alle ✕ uit (`benchVerwijderBezig`); loopt een losse ✕, dan doet de groepsknop niets. Een dubbelklik geeft één bevestiging en één POST per benchmark. |
| Uitkomst | Alleen geslaagd bij HTTP 2xx **én** `ok === true` (de helper telt sinds deze stap ook in andere overzichten alleen exact `true`, niet een andere "waar"-waarde). 401/403 "geen toegang", 404 "niet meer gevonden", netwerkfout "geen verbinding", 500/`ok:false`/geen JSON "tijdelijke storing"; bij een gemengde uitkomst een melding per reden, zonder statuscodes of servertekst. |
| Verversen | Na elke bevestigde actie wordt de lijst opnieuw geladen; de selectie is daarna leeg en de knop verborgen. Mislukt het laden, dan staat er een laadfout en geen verouderde lijst met vinkjes. |

Scope en retentie: de backendroute verwijdert alleen de rij in `benchmarks` (op sleutel of id). De
backendtests bevestigen dat `benchmarks_historie` niet wordt geraakt. Klantdocumenten, trajecten en
waarderingen worden niet aangeraakt. Een verwijderde benchmark is niet terug te zetten via de app;
alleen opnieuw toevoegen (handmatig, PDF of "Bronnen updaten"). Er zijn geen bewaartermijnen
vastgelegd. Backendrelease `781654f` (DONE, taak f4a3, `verwijderBenchmarkAdmin` in `backend/cloudflare-worker.js`)
geeft voor een onbekende sleutel 404 met `{ok:false}` en bij een databasefout of onbetrouwbaar
DB-resultaat 500 met `{ok:false}`; alleen een werkelijk verwijderde rij geeft `{ok:true}`.

### Bewaking

`tests/n122-marilyn-verwijderen.mjs` (verplicht via check 21 in `node tests/audit-consistentie.mjs`,
elke gefaalde check telt als bevinding) laadt het echte script uit `marilyn.html` in `node:vm` met
een minimale DOM-fixture en een nep-worker; geen netwerk, geen browser, geen echte gegevens.

- **Gebruikers:** selectie en alleen-gekozen (teller 2 → 1 → 2, gecodeerd padsegment, niet-gekozen
  blijven staan), nulselectie, annuleren, bevestigingstekst, kopvakje, dubbelklik en overlap
  los/groep, gedeeltelijke uitkomst (ok + 409 + netwerkfout), 500/`ok:false`/geen JSON zonder
  herhaling, mislukte verversing zichtbaar, authfail (401) als "geen toegang", en rol (zonder
  superadmin of sleutel geen bediening en geen POST).
- **Benchmarks:** de echte `.btn-del-bench`-handler in een eigen `node:vm`-context: annuleren zonder
  verzoek; succes via de bestaande URL/POST/`x-admin-key` herlaadt precies één keer; 500, 401,
  `ok:false`, zonder `ok`, 500 met `ok:true`, onjuiste JSON en netwerkfout tonen elk precies één
  neutrale foutmelding zonder herladen of servertekst; geen `innerHTML` in de handler; een
  uitgeschakelde ✕ vraagt en verstuurt niets.
- **Benchmarks groepsverwijdering:** echte login en Benchmarks-tab: vakjes en teller, annuleren,
  bevestiging met aantal/namen/gevolgen, dubbelklik plus ✕ en kopvakje tijdens de actie (één POST per
  gekozen benchmark, gecodeerde sleutel), verversen zonder restselectie, losse ✕ ongewijzigd,
  kopvakje aan/uit, gedeeltelijke uitkomst (ok + 403 + netwerkfout), 500/`ok:false`/geen JSON/
  `ok:"true"` zonder herhaling, 401 als "geen toegang", overlap los → groep, mislukte verversing, en
  rol (zonder superadmin geen vakjes of groepsknop en geen POST).

### Open (niet in deze stap)

- **Afhankelijkheden en retentie:** wat er met gekoppelde trajecten, documenten, sessies,
  kantoorlidmaatschappen, CRM en administratie gebeurt als een gebruikersaccount verwijderd wordt,
  is niet onderzocht of geregeld. Er wordt niets beloofd over opruiming of behoud, en er zijn geen
  bewaartermijnen vastgelegd.
- **Overige overzichten:** de andere verwijderpaden in `marilyn.html` (o.a. `deleteScan`,
  `deleteCallback`, `deleteMna`) zijn in deze stap niet opnieuw beoordeeld; hun dekking staat alleen
  in de bestaande N-122/N-124-checks. Callbackverwijderen is apart afgerond (DONE, taak 889d,
  release `b3f69cc`); dit document beschrijft die wijziging niet.
- **Echte omgeving:** de proeven hierboven draaien uitsluitend tegen een nep-worker. Het
  productiebewijs voor de gebruikers- en benchmarkgroepsverwijdering is release `0202ce1`; andere
  onderdelen in dit document worden niet als live geclaimd.
- `tests/README.md` noemt het gebruikersoverzicht en de benchmarkgroepsverwijdering nog niet bij de
  helper `verwijderGekozen()`.

## Productpunt 22 — dagelijkse CI-dekking: OPEN

Status: **OPEN**. De CI-reparatie staat in de bron sinds commit `6fee47d`
(`.github/workflows/checks.yml` en `tests/audit-consistentie.mjs`) en gaat ongewijzigd mee in de
release met drie paden; er komen geen nieuwe of historische hulpbestanden bij.

Wat de bestaande code doet (job `checks`):

- **Vertrouwde triggers:** `BACKEND_BRON_VERTROUWD` is `1` alleen bij `schedule`, `workflow_dispatch`
  en `push` naar de default branch. Bij `pull_request` en andere pushes wordt geen private bron
  opgehaald en komt het token niet in de job; een waarschuwing meldt dat backend-afhankelijke checks
  daar niet als PASS gelden.
- **Poort:** zonder secret `BACKEND_SOURCE_READ_TOKEN`, met een andere repository of een ongeldige
  `BACKEND_SOURCE_REF` faalt de stap hard; er wordt nooit stilzwijgend zonder backend doorgegaan. Het
  token staat alleen op de poort- en checkoutstap, niet op jobniveau.
- **Read-only checkout:** `marcelbisschops-ux/koersvoormorgen-backend`, ondiep, `persist-credentials:
  false`, sparse alleen `backend/cloudflare-worker.js` en `backend/worker/`, naar `.kvm-backend-bron`.
- **Binding:** de workflow controleert HEAD, herkomst, geen credentialrest, geen symlinks en geen
  bestanden buiten de sparse-set. Daarna legt `node tests/audit-consistentie.mjs --bronhash` de
  bron-sha256 vast in `KVM_BACKEND_BRON_SHA256`. Gelogd worden alleen repository, HEAD en hash.
- **Audit:** draait met `KVM_BACKEND_BRON=.kvm-backend-bron/backend` en `KVM_BACKEND_BRON_VERPLICHT=1`.
  Een ontbrekende, externe, gesymlinkte of ongebonden bron is een bevinding. De volledige uitvoer gaat
  naar een tijdelijk bestand; de publieke log toont alleen exitcode, uitvoer-sha256, aantal
  bevindingen en sectietitels. De echte exitcode blijft leidend.
- **Opruimen:** altijd (`always()`, ook na FAIL of annulering) worden `.kvm-backend-bron` en de
  tijdelijke log verwijderd; lukt dat niet, dan faalt de stap.
- **Ongewijzigd:** E2E-job `e2e-3rollen`, cron `30 4 * * *`, concurrency en de rapportage naar
  Marilyn (`E2E_REPORT_KEY`).

Bewijs, gescheiden:

- **Synthetisch:** check 32 in `node tests/audit-consistentie.mjs` test de bronresolver
  (ontbrekend/extern/symlink/hashbinding) en analyseert `checks.yml` statisch. Geen netwerk, geen echte
  secrets.
- **Configuratie:** dat secret `BACKEND_SOURCE_READ_TOKEN` bestaat, is op 10 okt 2026 via GitHub
  bevestigd. De waarde en geldigheid zijn niet gecontroleerd.
- **Echte CI-run (nog uit te voeren):** of de echte dagelijkse GitHub-run met private backendbron en
  volledige E2E slaagt en de rapportage in Marilyn → Veiligheid PASS toont, is **ONBEWEZEN** tot een
  echte run PASS geeft. Productpunt #22 blijft OPEN; dit document is geen PASS-rapport.

### Opruimcredentials voor eigen staging-testdata (11 okt 2026)

Aanleiding: GitHub-run `38130393446` (`workflow_dispatch`, #499). Staging-admin werkte en de functionele
API-checks slaagden, maar de opruiming in de job `checks` faalde: de stap
`Volledige e2e-testsuite tegen staging (admin-key vereist)` kreeg geen D1-credential mee.
`tests/lib.mjs` `ruimTrajectOp` en `verwijderTestGebruiker` lezen eerst de staging-D1 via `d1()`
(alleen SELECT). Daarna roept de staging-only helper `testOpruimAanroep` de route `/test/opruimen` aan
met `TEST_CLEANUP_KEY`. Gebruik in de specs: `tests/e2e-api.mjs` (`ruimTrajectOp`,
`verwijderTestGebruiker`), en `tests/e2e-3rollen-regressie.spec.js` en
`tests/e2e-regressie-uitbreiding.spec.js` (`ruimTestTrajectOp`, `verwijderTestGebruiker`).

Wijziging in `.github/workflows/checks.yml`:

- **Job `checks`, admin-E2E-stap:** krijgt het bestaande `CLOUDFLARE_API_TOKEN_D1_READ` (Read-only,
  nooit Edit), het bestaande account-id `280ee5671bc3c27b895246a620dbc97b` (geen secret) en
  `TEST_CLEANUP_KEY`. Beide credentials staan uitsluitend op deze stap en zijn alleen gevuld als
  `BACKEND_BRON_VERTROUWD == '1'`. Op `pull_request` en forks blijven ze leeg.
- **Job `e2e-3rollen`:** `E2E_STAGING_VERTROUWD` is de vertrouwensvlag op jobniveau, met dezelfde
  expressie. Het is geen credential. `TEST_CLEANUP_KEY` staat uitsluitend op de drie bestaande
  playwright-stappen (3-rollen push/PR, 3-rollen incl. AI, uitbreiding) en is alleen op vertrouwde
  triggers gevuld. De bestaande D1-tokens per stap (Read, en Edit alleen bij de uitbreiding) zijn
  ongewijzigd.
- **Fail-closed poort:** beide jobs hebben vóór de eerste testdatacreatie een stap
  `Opruimcredentials-poort voor staging-testdata (hard FAIL vóór creatie)`. Die draait op vertrouwde
  triggers (in `checks` alleen als de admin-E2E-stap ook draait). Ontbreekt
  `CLOUDFLARE_API_TOKEN_D1_READ` of `TEST_CLEANUP_KEY`, dan faalt de stap hard. Er wordt niets
  overgeslagen en er is geen override. Gelogd wordt alleen of een secret aanwezig is, nooit de waarde.
- **Ongewijzigd:** triggers, cron, concurrency, de backendbroncontext-keten, de audit, de
  dependency-scan, de secret-scan, de publieke E2E, de AI-stap en de rapportage (`E2E_REPORT_KEY`).
  De testhelpers en de backend zijn ook niet aangepast.

Bekende grens: op onvertrouwde triggers (`pull_request` uit dezelfde repo, pushes naar een andere
branch dan de default branch) krijgen de E2E-stappen bewust geen opruimcredentials. De bestaande
opruimchecks melden daar nog steeds FAIL, zoals vóór deze wijziging. Dat is geen PASS en is niet
verzwakt.

**Menselijke credentialinvoer nodig (OPEN):** volgens een read-only controle van de secretnamen op
11 okt 2026 bestaan `CLOUDFLARE_API_TOKEN_D1_READ`, `CLOUDFLARE_API_TOKEN_D1_EDIT`, `E2E_REPORT_KEY`
en `STAGING_ADMIN_KEY`. **`TEST_CLEANUP_KEY` ontbreekt.** Marcel moet dit secret zelf aanmaken via
repo Settings → Secrets and variables → Actions, met de staging-testopruimsleutel (nooit een
productiesleutel). Tot dat gebeurd is, faalt elke vertrouwde run bewust hard op de opruimpoort. De
waarden en geldigheid van de secrets zijn niet gecontroleerd. Productpunt **#22 blijft OPEN**: de
volledige dagelijkse E2E met opruiming is **ONBEWEZEN** tot een echte run PASS geeft.
