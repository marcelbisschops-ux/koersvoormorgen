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

1. **Begeleider-dashboard (mna.html) is onoverzichtelijk** (Marcel, 16 augustus 2026, tijdens de meekijker-bouwsessie) — de knoppenwand onder "Documenten" (NDA/BEM/LoI/Excl/Dealvoorstel/Indicatieve bieding/Aandachtspunten SPA/Closing-checklist) en de secties eronder (Communicatie/Analyse) nodigen niet genoeg uit en zijn te dicht op elkaar. Marcel wil: volledig uitgeschreven documentnamen i.p.v. afkortingen, betere groepering, en inklapbare secties/dropdowns i.p.v. alles in beeld tegelijk. Nog niet opgepakt — bewust apart gehouden van de meekijker-bouwsessie waarin dit werd gesignaleerd. Bestand: `mna/04-begeleider-dashboard.js` (renderBegeleiderDashboard-achtige functie, zie de knoppenrij rond "Documenten").

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
