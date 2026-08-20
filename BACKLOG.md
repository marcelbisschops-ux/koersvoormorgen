# KantoorInzicht — Backlog

**Bouwfreeze vanaf 26 juli 2026 (Marcels besluit):** het platform gaat nu de externe testfase in.
Er wordt niets nieuws meer gebouwd tot na die fase — met één uitzondering: als het testen een
échte bug blootlegt, wordt die gewoon meteen opgepakt (dat is geen "nieuw bouwen", dat is het
platform werkend houden). Bij twijfel of iets onder de freeze valt: eerst expliciet aan Marcel
voorleggen, nooit zelf beslissen om toch te bouwen.

Alles wat uitgesteld/afgewezen/afgerond is, staat in `BACKLOG-ARCHIEF.md` — die wordt niet
standaard meegewogen, alleen op Marcels verzoek. Dat geldt ook voor punt 5 (adviseur-login-flow,
wachtwoord in JS-geheugen): beoordeeld op 26 juli 2026 als geen actieve kwetsbaarheid (HTTPS +
her-authenticatie bij elke actie dekt het risico al) — geen actie nu, oppakken in de eerste
bouwronde ná de testfase.

Er staat momenteel **niets open** dat vóór of tijdens de externe testfase actie vereist (stand 26 juli 2026 — zie hieronder voor nieuwe punten van ná die datum).

---

## Openstaande punten (ná bouwfreeze, op Marcels verzoek toegevoegd)

1. ~~Begeleider-dashboard (mna.html) is onoverzichtelijk~~ — **afgerond 16 augustus 2026**: volledig uitgeschreven documentnamen, groepering per dealfase (Voorfase/Onderhandeling/Afronding), Documenten/Communicatie/Analyse nu los inklapbaar. Getest op staging (browser).
2. ~~Eigen bem_koper-sjabloon (echte tarieven)~~ — **afgerond 16 augustus 2026**: op basis van een getekende bemiddelingsovereenkomst uit een eigen dossier is een eigen template gebouwd (succesfee 4,5%/3,5%/2,75%/2%, min €25.000; voorfase Fase 0 €4.000 + Fase 1 €6.000; uurtarief €250; forum Rechtbank Oost-Brabant), geüpload en geverifieerd in productie. Alleen voor Marcels eigen account (begeleider_email marcel@bisschopsfinancing.nl) — niet het platform-brede standaardsjabloon. bem_verk (verkoop-mandaat) nog niet gedaan — geen getekend voorbeeld beschikbaar; voorstel hieronder.
3. **bem_verk-sjabloon (verkoop-mandaat) — voorstel** (16 augustus 2026): geen getekend voorbeeld beschikbaar, dus geen eigen tarieven te verifiëren. Het platform-brede standaardsjabloon (`bem_verk` in `worker/02-config-constanten.js`) hanteert nu al een ander verdienmodel dan bem_koper: geen succesfee voor de verkopende Opdrachtgever, honorarium wordt verhaald op de kopende partij. Voorstel: dit ongewijzigd laten totdat er een getekend verkoop-mandaat is om tegen te verifiëren — geen tarieven verzinnen zonder brondocument.
4. ~~Volledig MKB-overname-testscript~~ — **materiaal opgeleverd 19 augustus 2026**: fictief testpakket (holding VMB Groep Holding B.V. + werkmaatschappij Van der Meulen & Berkhout Accountants B.V., 17 documenten over alle DD-fases + 2 bewuste randgevallen — onduidelijke bankmutaties-CSV en een entiteit-mismatch-PDF, gemengde formaten pdf/docx/xlsx/csv/jpg, intern kloppende cijfers) + stapsgewijs testscript (`00_TESTSCRIPT.md`), naar Marcel gestuurd als zip. Directe aanleiding: sessie van 19 augustus 2026 waarin bleek dat gegenereerde NDA/LoI-documenten die nooit verstuurd/getekend werden, spoorloos verdwenen (gefixt) — en waarbij het testscript zelf twee echte groepsniveau-databugs in de waardering/bankmutaties/documentextractie blootlegde (eveneens gefixt, zie git-log backend-repo commit 9a5d4ec). **Aanvulling zelfde dag (Marcel, terecht): het eerste pakket was wéér een accountantskantoor** — drie aanvullende, losstaande testpakketten buiten accountancy geleverd (restaurant Bistro De Wilde Eend, autodealer Van Haaften, snoepwinkel De Kleine Beer — alle drie onder het generieke MKB-profiel, elk 7 documenten + randgeval + eigen testscript-sectie). **Aanvulling 20 augustus 2026 (Marcel: "veel te dun", wil 100% velddekking + vooraf ingevuld):** de 3 MKB-testcases opnieuw opgezet — nu met 100% van de ~97 mkb-sectorprofielvelden (alle 7 fases) én rechtstreeks als volledig ingevuld traject in productie aangemaakt (niet als los materiaal), zodat Marcel meteen kan doorlopen zonder zelf iets in te typen. Marcel is in elke testcase de bemiddelaar; `opdrachtgever_rol` wisselt bewust (restaurant: namens verkoper, autodealer: namens koper, snoepwinkel: Opvolging — test meteen ook de nieuwe bem_opvolging-flow). Trajectcodes: `2ONK4FVO` (restaurant), `45OH8R0N` (autodealer), `F3JIR4RV` (snoepwinkel) — kantoornaam begint met "🧪 TEST —", makkelijk te vinden/verwijderen in marilyn. Canonieke regel nu vastgelegd in `CLAUDE.md` (Testdocumenten-standaard, punt 6). **Nog open: Marcel moet de trajecten daadwerkelijk zelf doorlopen** — dit levert het ingevulde materiaal, geen bevestiging dat elke stap ook klopt.
5. ~~Alle P1's en P2's uit de zesde heraudit (19 augustus 2026)~~ — **afgerond 19 augustus 2026**: kritieke IDOR in document-download (cross-traject), niet-atomaire waardering-configuratiewijziging, `--muted`-contrasttoken + hardcoded donkere-modus-kleur, inconsistente e-mail-escaping, persistente logging, rate-limiting-gaten, geen centrale foutafhandeling in `fetch()`, toetsenbord-toegankelijkheid + focus-trap/-return op modals. Volledige testsuite (53 API + 9 UI + 7 consistentie) groen, staging+productie getest. Zie `AUDIT-STANDAARD.md` voor het volledige overzicht. **Kanttekening:** de nieuwe toetsenbordbediening (Enter op de "Juridische documenten"-toggle) kon in deze sessie niet interactief in de browser-testtool worden geverifieerd — zelfde nooit-opgeloste stale-`bindAll()`-eigenaardigheid van deze specifieke testtool als eerder deze week (curl/fetch bevestigen wél de correcte code op de live site); de reguliere Playwright-testsuite (een échte headless browser, niet deze testtool) draait wél groen.
6. ~~Cross-path-informatielek-audit F1-F13~~ — **volledig afgerond 19 augustus 2026 (13/13)**: cross-traject-auth-lekken (F1/F2), koper-categorie-intrekking niet doorgevoerd naar 4 routefamilies (F3), marcel-CC onvoorwaardelijk bij externe-adviseurstrajecten in 6+ mailflows (F4), chat-state niet gereset bij uitloggen (F5), waarderingsgeschiedenis zonder auth (F6), zwakke validatie op mail-begeleider (F7), muur tegen externe adviseurs miste 4 gesprek-bijlage-routes (F8), dode `/mna/groep/*`-routes verwijderd (F9), existence-oracle bij Q&A-reactie (F10), gesprek-bijlage-`traject_id` nooit gevuld → wees-R2-bestanden bij trajectverwijdering (F11), generieke `/ai`-proxy-architectuurrichtlijn vastgelegd (F12, bewust geen codewijziging), meekijkers-route zonder muur bij admin-key-aanroep (F13). Volledige testsuite + permanente regressietest `tests/e2e-crosspath-fixes.mjs` (39/39) groen tegen productie, beide repo's gepusht. Volledig logboek: `CROSS-PATH-SECURITY-STANDAARD.md`.
   - Daarnaast als **nieuwe features** gebouwd (niet uit de audit zelf, maar de eerder toegezegde P3's): SWOT/PESTEL/Porter-risicoraamwerk en AI-extractie-betrouwbaarheidsscore, beide live + handleiding bijgewerkt.
   - En een **veiligheidsdashboard** in marilyn.html (tabblad "Veiligheid"): gauges, open-bevindingen-lijst, en een dagelijkse geautomatiseerde selfcheck (eigen cron-taak) die de kern-invarianten in productie blijft hertesten — zie `CROSS-PATH-SECURITY-STANDAARD.md`-logboek voor details.

---

## Testplan: geautomatiseerde end-to-end test (blijft geldig tijdens de freeze, zie `tests/README.md`)

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
