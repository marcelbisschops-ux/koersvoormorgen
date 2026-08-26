# Koers voor Morgen — Backlog

**Bouwfreeze vanaf 26 juli 2026 (Marcels besluit):** het platform gaat nu de externe testfase in.
Er wordt niets nieuws meer gebouwd tot na die fase — met één uitzondering: als het testen een
échte bug blootlegt, wordt die gewoon meteen opgepakt (dat is geen "nieuw bouwen", dat is het
platform werkend houden). Bij twijfel of iets onder de freeze valt: eerst expliciet aan Marcel
voorleggen, nooit zelf beslissen om toch te bouwen.

Alles wat afgerond/afgewezen is (t/m 26 augustus 2026) en de langlopende "wacht op jou/jurist"-
punten staan in `BACKLOG-ARCHIEF.md` — die wordt niet standaard meegewogen, alleen op Marcels
verzoek. Dit bestand (`BACKLOG.md`) bevat alleen wat nu daadwerkelijk nog open staat.

Hernummerd op 26 augustus 2026 (op Marcels verzoek) — de oude nummering (1-11, afgeronde en open
punten door elkaar) is opgeschoond; afgeronde punten zijn verplaatst naar het archief.

---

## Openstaande punten

1. **Verkoper zelfregistratie zonder begeleider** (24 augustus 2026) — kan een bedrijf zichzelf als verkoper op het matching-platform zetten, zonder dat er al een adviseur/begeleider bij betrokken is? Antwoord op dit moment: nee — elke verkoper-listing komt altijd via een traject dat door een begeleider is aangemaakt (bewust, het platform draait om M&A-*begeleiding*). Dit is asymmetrisch met de koper-zelfregistratie die al wél bestaat. Symmetrisch maken is een groter, gevoeliger ontwerp — wie wordt dan de begeleider van zo'n traject, welke data mag ongecontroleerd van een anonieme inzending binnenkomen. Bewust nog niet gebouwd.

2. **Automatische bankbetaling voor facturen** (24 augustus 2026) — Marcel expliciet: "uiteindelijk automatisch via directe bankbetaling, nu te kostbaar om te bouwen." Tussenstap staat al live: een downloadbaar PDF-kostenoverzicht per adviseur dat Marcel zelf handmatig kan versturen. Een echte betaalintegratie (bijv. Mollie/Stripe iDEAL) is bewust uitgesteld, geen ingeschatte datum.

3. **Geformaliseerde, doorlopend genummerde BTW-factuur** (24 augustus 2026) — het huidige `/mna/admin/factuur/{gebruiker_id}`-endpoint genereert bewust een "kostenoverzicht", geen officiële BTW-factuur (GOUDEN STANDAARD: geen BTW-percentage of officieel doorlopend factuurnummer verzinnen zonder dat het platform Marcels echte boekhoud-/factuurnummering kent). Nodig vóór dit gebouwd kan worden: BTW-regime/-percentage, en of er een bestaande doorlopende factuurnummerreeks is waar dit platform op moet aansluiten (of dat het platform zijn eigen reeks mag beginnen).

4. **De "M" van M&A — echte fusie-ondersteuning** (25 augustus 2026, Marcel: "platform is nu de A van M&A, wat zou er gebouwd moeten worden om ook het merger deel mee te nemen"). **Uitdrukkelijk niet bouwen, alleen vastgelegd** ("Niet bouwen!"). Het platform is nu volledig doorgerekend als een acquisitie (één koper betaalt één verkoper een prijs) — "Fusie" bestaat alleen oppervlakkig als label in marilyn's `partijLabels()`, niet in de rekenkern, het rolmodel of het datamodel. Vijf structurele gaten, gerangschikt naar omvang:
   1. **Waardering — ruilverhouding i.p.v. prijs** (middelgroot): een fusie heeft geen koopsom maar een ruilverhouding (welk % van de gecombineerde onderneming per aandeelhoudersgroep) — een nieuwe berekeningslaag, kan bestaande waarderingsbouwstenen (EBITDA-multiple e.d.) als input hergebruiken.
   2. **Rolmodel — twee gelijkwaardige partijen i.p.v. koper/verkoper** (grootst/risicovolst): `mna_trajecten` heeft één koper-koppeling en één eenzijdig beoordeelde DD-dataset; een fusie vereist dat beide partijen tegelijk DD op elkaar doen als gelijken. Raakt `begeleiderAuth`/`rolVanCode`/alle moduleslots door bijna de hele backend — een herontwerp van een fundament, geen los stuk bouwen. Qua omvang vergelijkbaar met de server-side-module-enforcement-ronde + de cross-path-audit F1-F13 samen.
   3. **Aandelenruil/cap table** (middelgroot): het datamodel is nu volledig geld-centrisch (vaste koopsom, earn-out, vendor loan) — geen enkel veld voor aandelen-voor-aandelen.
   4. **Documenten** (middelgroot tot groot, afhankelijk van scope): BEM/LoI/SPA zijn geschreven vanuit koop/verkoop-taal. Een **echte juridische fusie** (Boek 2 BW) heeft bovendien een fundamenteel andere procedure dan een aandelenoverdracht (fusievoorstel, deponering bij de KvK, verzetstermijn crediteuren, notariële fusieakte) — geen SPA-achtig traject, een apart, groot stuk werk op zichzelf.
   5. **Governance/gezamenlijke besluitvorming** (kleinst): nu één Opdrachtgever die een bemiddelaar inschakelt; een fusie vereist vaak gezamenlijke besluitvorming vanuit beide besturen — kan mogelijk aanhaken op de bestaande "intern goedgekeurd door"-achtige goedkeuringsflow bij LoI/Bieding.

   **Belangrijkste scope-keuze vóór ooit met bouwen te beginnen:** een **echte juridische fusie** (Boek 2 BW-procedure, apart en groot) versus **aandelen-voor-aandelen als dealstructuur binnen het bestaande koper/verkoper-model** (veel kleiner, hergebruikt bijna alles, mist alleen de ruilverhouding-rekenkern en het cap table-stukje) — bij oppakken wordt de tweede optie als eerste stap aangeraden.

5. **Post-merger integratie (PMI) — earn-out-/vendor-loan-bewaking en 100-dagenplan** (25 augustus 2026, vervolg op punt 4 maar los onderwerp: geldt voor élke deal, niet alleen fusies). **Uitdrukkelijk niet bouwen, alleen vastgelegd.** Het platform stopt nu bewust bij Closing (dataroom-documenten worden 14 dagen na afsluiting verwijderd) — post-merger-tracking vereist het tegenovergestelde: data die juist maanden tot jaren blijft groeien ná de deal. Twee delen zijn verschillend van aard:
   - **Sluit niet aan:** organisatie-integratie, cultuur, systemen samenvoegen — een andere productcategorie (project-/OKR-tooling), geen natuurlijke uitbreiding van een DD-platform.
   - **Sluit wél aan, en is nu een gat:** de rekenkern berekent al earn-out-schema's (`dvBerekenEarnOut`) en vendor loans, en de synergie-aanname die de prijs pre-deal onderbouwde (`dvBerekenSynergie`) — maar er is geen enkel mechanisme om ná closing te bewaken of de earn-out-targets gehaald worden, de vendor loan volgens schema wordt afgelost, of de synergie daadwerkelijk gerealiseerd wordt. De structuur wordt berekend, nooit bewaakt.

   **Ontwerp indien ooit gebouwd:**
   - Nieuwe fase "Integratie" ná Closing, die alleen ontgrendelt bij deals met een earn-out/vendor loan/synergie-aanname.
   - **Earn-out-/vendor-loan-tracking:** nieuwe tabel (bijv. `mna_post_closing_periode`) met per periode een target (al bekend uit de bestaande berekening) tegenover een actual die de koper zelf invult (omzet/EBITDA van die periode). Automatische verdict (op schema/eronder/erboven) + herberekende uitkering via de bestaande `dvBerekenEarnOut`-logica — nu met een echte ingevulde waarde i.p.v. een projectie. Koper vult in, begeleider verifieert/accordeert (zelfde patroon als de bestaande Q&A-goedkeuring). Periodieke e-mailherinnering wanneer een periode moet worden ingevuld (bestaand e-mailpatroon hergebruiken).
   - **100-dagenplan:** een taken-/kanbanlijst per categorie (systemen, personeel, klanten, financiële administratie, branding), met eigenaar/deadline/status — qua patroon bijna identiek aan de al bestaande closing-checklist (`mna_closing_checklist_status`), geen nieuw concept nodig, alleen een nieuwe fase.
   - **Synergie-terugkoppeling:** de pre-deal-aanname naast wat er daadwerkelijk gerealiseerd is, puur informatief, geen betalingsconsequentie.
   - **Rolgevolg:** "koper" is na closing niet meer een kandidaat maar de partij die het bedrijf runt — die rol moet nu actief data invoeren i.p.v. alleen lezen, een echte gedragsverandering van die rol.

   **Architecturaal knelpunt + voorgestelde oplossing (Marcel, 25 augustus 2026):** een traject kan na closing nog 1-3 jaar "leven" voor de earn-out-periode afloopt — botst met de 14-dagenregel en de AVG-verwijderrecht-/archiveringslogica die aanneemt dat een traject snel wordt opgeruimd na afsluiting. Oplossing: **de 14-dagenregel vervalt alleen als de partij expliciet kiest om PMI via het platform te doen** — een bewuste opt-in per traject, geen blanket-beleidswijziging voor alle trajecten. Vereist een eigen rij in privacy.html (nieuw verwerkingsdoel, eigen grondslag/bewaartermijn), naast de bestaande "M&A Begeleiding"-rij die nu nog expliciet bij 14 dagen stopt.

6. **Homepage — visuele/positionerings-upgrade** (26 augustus 2026, Marcel deelde een externe (AI-gegenereerde) review van koersvoormorgen.nl). Kernoordeel: structuur/tekst/duidelijkheid waren al sterk, maar de site oogde meer als "nette SaaS-tool" dan als premium M&A-platform — vooral omdat er nergens een echt productbeeld stond. Vier deelpunten; **1, 2 en 3 zijn afgerond en live (lokaal, nog niet gepusht), 4 blijft bewust open:**
   1. ~~Hero-visual boven de vouw~~ — **afgerond 26 augustus 2026**: een echte, met Playwright vastgelegde schermafbeelding van het begeleider-dashboard (documentflow: BEM→teaser→NDA→verkoopmemorandum→bieding→LoI→informatieverzoek) staat nu prominent onder de hero-tekst, in een licht "productvenster"-frame (`.hero-visual`/`.product-frame` in `index.html`).
   2. ~~Premiumere visuele stijl~~ — **afgerond 26 augustus 2026**: grotere/strakkere hero-kop (2.7rem→2.95rem, tighter line-height, `text-wrap:balance`), grotere sectiekoppen (1.7rem→1.85rem) — bewust een aanscherping, geen herontwerp.
   3. ~~Featurekaarten met echte productscreenshots~~ — **afgerond 26 augustus 2026**: i.p.v. alle 8 featuretegels te voorzien van een screenshot (te druk) is gekozen voor één "proof band" direct na de featuregrid (`.proof-band`) met een echte, met echte AI-extractie gevulde Financieel-DD-schermafbeelding + bronvermelding, en een nieuwe eigen sectie "AI die het dossier bewaakt" (`.ai-grid`, 3 concrete voorbeeldkaarten: ontbrekende documenten / afwijking gesignaleerd / actie vereist — pakt meteen ook de eerdere review-suggestie voor een aparte AI-sectie mee). Beide beelden zijn 100% fictief: een nieuw testtraject "🧪 TEST — Fysiopraktijk De Beweging B.V." (production-traject `TNGNKCLR`, tussen_code `TBDKJNHW`) is aangemaakt en met 21 realistische documenten gevuld via de échte `/mna/document/upload`-AI-pijplijn (bronmateriaal: `~/Desktop/testtrajecten-compleet/fysiopraktijk-de-beweging/`), exact volgens de Testdocumenten-standaard. **Bijvangst tijdens het bouwen:** de eerder als "klaar voor gebruik" gedocumenteerde MKB-testtrajecten (restaurant/autodealer/snoepwinkel, zie punt 4 in het archief) bleken alle drie leeg — een admin-actie rond 21-22 augustus had bij alle `🧪 TEST —`-trajecten de documenten/DD-data gewist (nette wijzigingenlog-vermeldingen, dus geen bug, wel een **niet eerder opgemerkt risico**: de naamgevingsconventie maakt geen onderscheid tussen kortlevende verificatietestdata en bewust-blijvende referentiepakketten, dus een volgende opschoonactie kan zomaar weer per ongeluk een pakket als dit fysiopraktijk-traject meepakken. Geen actie ondernomen — hieronder als aandachtspunt genoemd, geen apart genummerd puntje omdat het geen productwijziging betreft.
   4. **Scherpere propositie op de homepage** — **blijft open**, bewust niet gebouwd: de homepage combineert nog drie proposities (platform/kantoorscan/matching) die om aandacht concurreren; sluit aan bij de bevinding van 23 augustus 2026 (werkregel 18, CLAUDE.md) dat dit destijds ook al niet scherp was. Voorstel uit de review: kantoorscan als duidelijke secondary CTA, matching-platform als aparte propositie behandelen — vereist een keuze van Marcel over de gewenste homepage-indeling vóór bouwen, is geen stijlwijziging.

   (De review noemde ook een aparte "AI die het dossier bewaakt"-sectie met concrete voorbeelden (ontbrekende documenten/afwijkingen/openstaande acties) — inhoudelijk het minst risicovolle deelpunt, kan los van de andere drie als eerste stap worden opgepakt zodra hiermee wordt begonnen.)

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
