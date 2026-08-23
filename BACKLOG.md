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
4. ~~Volledig MKB-overname-testscript~~ — **materiaal opgeleverd 19 augustus 2026**: fictief testpakket (holding VMB Groep Holding B.V. + werkmaatschappij Van der Meulen & Berkhout Accountants B.V., 17 documenten over alle DD-fases + 2 bewuste randgevallen — onduidelijke bankmutaties-CSV en een entiteit-mismatch-PDF, gemengde formaten pdf/docx/xlsx/csv/jpg, intern kloppende cijfers) + stapsgewijs testscript (`00_TESTSCRIPT.md`), naar Marcel gestuurd als zip. Directe aanleiding: sessie van 19 augustus 2026 waarin bleek dat gegenereerde NDA/LoI-documenten die nooit verstuurd/getekend werden, spoorloos verdwenen (gefixt) — en waarbij het testscript zelf twee echte groepsniveau-databugs in de waardering/bankmutaties/documentextractie blootlegde (eveneens gefixt, zie git-log backend-repo commit 9a5d4ec). **Aanvulling zelfde dag (Marcel, terecht): het eerste pakket was wéér een accountantskantoor** — drie aanvullende, losstaande testpakketten buiten accountancy geleverd (restaurant Bistro De Wilde Eend, autodealer Van Haaften, snoepwinkel De Kleine Beer — alle drie onder het generieke MKB-profiel, elk 7 documenten + randgeval + eigen testscript-sectie). **Aanvulling 20 augustus 2026 (Marcel: "veel te dun", wil 100% velddekking):** de 3 MKB-testcases opnieuw opgezet. Eerste poging (velden rechtstreeks via `/mna/save` posten) was fout begrepen — Marcel corrigeerde: de **uploadbestanden** moeten 100% dekkend zijn, en moeten door de échte `/mna/document/upload`-AI-extractie heen, niet rechtstreeks in de database gezet worden. Opnieuw gebouwd: per bedrijf 10 realistische documenten (pdf/docx/xlsx/csv, incl. 1 bewust afgewezen randgeval) die samen alle 97 mkb-sectorprofielvelden dekken, geüpload via de echte pijplijn. Onderweg bleek de AI-extractie voor mkb structureel maar ~49% van de velden kón vullen (koppeltabel-gat in `autoFillFromExtraction()`, niet een documentprobleem) — gefixt naar 97/97 potentieel gekoppeld (`mna/02-state-opslag-documenten.js` + backend `SECTOR_EXTRACTIE_EXTRA.mkb`, beide gedeployed/gepusht). Eindresultaat, echt gemeten na echte AI-extractie: restaurant `R91KAD06` 97/97 (100%), autodealer `TIEWQECB` 95/97 (98%), snoepwinkel `1JRL5456` 94/97 (97%) — de paar resterende lege velden zijn hetzij correct "nooit gokken"-gedrag (bijv. geen huurtermijn verzinnen voor een pand in eigendom), hetzij nog niet geüpload door een vermoedelijke Cloudflare Bot Fight Mode-blokkade na veel automatische testuploads in korte tijd (zie `project_mkb_testpakket_v2`-geheugen voor details). Kantoornaam begint met "🧪 TEST —", makkelijk te vinden/verwijderen in marilyn. Canonieke regel nu vastgelegd in `CLAUDE.md` (Testdocumenten-standaard, punt 6). De eerdere trajectcodes uit de foute eerste poging (`2ONK4FVO`/`45OH8R0N`/`F3JIR4RV`) zijn verwijderd. **Nog open:** de laatste 3-4 velden (autodealer.tuchtzaken, snoepwinkel.aantalKlanten/pContract/tuchtzaken) alsnog uploaden zodra de vermoedelijke rate-limit is gereset; Marcel moet de trajecten zelf doorlopen om te bevestigen dat ook elke vervolgstap (niet alleen de dataverzameling) klopt.
5. ~~Alle P1's en P2's uit de zesde heraudit (19 augustus 2026)~~ — **afgerond 19 augustus 2026**: kritieke IDOR in document-download (cross-traject), niet-atomaire waardering-configuratiewijziging, `--muted`-contrasttoken + hardcoded donkere-modus-kleur, inconsistente e-mail-escaping, persistente logging, rate-limiting-gaten, geen centrale foutafhandeling in `fetch()`, toetsenbord-toegankelijkheid + focus-trap/-return op modals. Volledige testsuite (53 API + 9 UI + 7 consistentie) groen, staging+productie getest. Zie `AUDIT-STANDAARD.md` voor het volledige overzicht. **Kanttekening:** de nieuwe toetsenbordbediening (Enter op de "Juridische documenten"-toggle) kon in deze sessie niet interactief in de browser-testtool worden geverifieerd — zelfde nooit-opgeloste stale-`bindAll()`-eigenaardigheid van deze specifieke testtool als eerder deze week (curl/fetch bevestigen wél de correcte code op de live site); de reguliere Playwright-testsuite (een échte headless browser, niet deze testtool) draait wél groen.
6. ~~Cross-path-informatielek-audit F1-F13~~ — **volledig afgerond 19 augustus 2026 (13/13)**: cross-traject-auth-lekken (F1/F2), koper-categorie-intrekking niet doorgevoerd naar 4 routefamilies (F3), marcel-CC onvoorwaardelijk bij externe-adviseurstrajecten in 6+ mailflows (F4), chat-state niet gereset bij uitloggen (F5), waarderingsgeschiedenis zonder auth (F6), zwakke validatie op mail-begeleider (F7), muur tegen externe adviseurs miste 4 gesprek-bijlage-routes (F8), dode `/mna/groep/*`-routes verwijderd (F9), existence-oracle bij Q&A-reactie (F10), gesprek-bijlage-`traject_id` nooit gevuld → wees-R2-bestanden bij trajectverwijdering (F11), generieke `/ai`-proxy-architectuurrichtlijn vastgelegd (F12, bewust geen codewijziging), meekijkers-route zonder muur bij admin-key-aanroep (F13). Volledige testsuite + permanente regressietest `tests/e2e-crosspath-fixes.mjs` (39/39) groen tegen productie, beide repo's gepusht. Volledig logboek: `CROSS-PATH-SECURITY-STANDAARD.md`.
   - Daarnaast als **nieuwe features** gebouwd (niet uit de audit zelf, maar de eerder toegezegde P3's): SWOT/PESTEL/Porter-risicoraamwerk en AI-extractie-betrouwbaarheidsscore, beide live + handleiding bijgewerkt.
   - En een **veiligheidsdashboard** in marilyn.html (tabblad "Veiligheid"): gauges, open-bevindingen-lijst, en een dagelijkse geautomatiseerde selfcheck (eigen cron-taak) die de kern-invarianten in productie blijft hertesten — zie `CROSS-PATH-SECURITY-STANDAARD.md`-logboek voor details.
7. **Adviseur-exportfeature (nieuw, 24 augustus 2026):** bij het server-side afdwingen van alle moduleslots (zie hieronder, "Server-side module-enforcement") bleek het vinkje "Export & rapportage" in marilyn niets te blokkeren — het enige exportendpoint (`/mna/admin/export/{code}`, dossier-export als tekstbestand) is uitsluitend met de ADMIN_KEY bereikbaar, dus alleen Marcel kan het via marilyn aanroepen. Externe adviseurs hebben nergens een eigen exportknop. Marcels beslissing (24 augustus): vinkje voorlopig **verwijderd** uit marilyn/adv.html (voorkomt dat een adviseur ooit voor een niet-functionele module betaalt); een échte adviseur-exportfeature (wat export je precies, welke rolbeperkingen, formaat) is een aparte, nog niet gescopete beslissing voor later.

### Server-side module-enforcement (23-24 augustus 2026, "ja fix dat")
Ontdekking: marilyn's modulevinkjes (traject/contracten/ai_analyse/qa/export/meekijker/marketing) werden tot dan toe uitsluitend client-side afgedwongen — een directe API-aanroep omzeilde elk moduleslot volledig. Per module gefixt (herbruikbare `heeftModule()`-helper in cloudflare-worker.js, fail-open voor eigen/Marcel-trajecten zonder gekoppeld adviseursaccount, admin-bypass via ADMIN_KEY), telkens staging-getest (module-uit→geblokkeerd, module-aan→werkt, geen adviseur→fail-open) en live gedeployed:
- **Marketing** (teaser/verkoopmemorandum/matching) — gefixt (vorige sessie-stap, 23 aug).
- **Contracten** — 8 endpoints (6 document-e-mails, concept-opslaan, tekenen, closing-checklist) — gefixt 23 aug.
- **AI-analyse** — bleek zelfs géén client-side gate te hebben; 4 endpoints (risicobeoordeling opslaan/AI-suggestie, risicoraamwerk genereren/ophalen) + 2 dashboardknoppen gefixt 23-24 aug.
- **Q&A** — ook geen enkele gate; alle 5 endpoints + het hele Q&A-paneel in mna/06-schermen.js gefixt 24 aug.
- **Meekijkers** — bleek al volledig gegated sinds 16 augustus 2026 (server + client), geen actie nodig.
- **Export** — geen adviseur-toegangspunt aanwezig, zie punt 7 hierboven.

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
