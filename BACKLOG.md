# KantoorInzicht — Backlog (juli 2026)

Geordend van eenvoudig naar moeilijk. **Uren** = geschatte bouw- en testtijd met Claude Code (Marcels tijd aan de sessie; API-kosten verwaarloosbaar, valt binnen abonnement). **€-indicatie** = referentie wat dit extern zou kosten bij ~€100/uur, als zakelijk vergelijkingskader.

**Model per taak — vóór de start van elke taak het juiste model inschakelen:**
- Sonnet: `/model claude-sonnet-5` — routinewerk, snelst/goedkoopst in verbruik
- Opus: `/model claude-opus-4-8` — ontwerp- en integratiewerk
- Fable: `/model claude-fable-5` — alleen voor de grote refactor (#12); dubbel tokenverbruik, dus niet voor routinetaken
- NB: Fable 5 zit t/m **7 juli 2026** gratis in Marcels Pro-abonnement ("Included until July 7"). Als Fable daarna niet meer beschikbaar is: gebruik voor #12 gewoon Opus 4.8 — met de E2E-testsuite (#4) als vangnet is dat een prima alternatief. De refactor NIET haasten om de actieperiode te halen.

| # | Taak | Model | Inspanning | €-indicatie extern | Toelichting |
|---|------|-------|-----------|--------------------|-------------|
| 1 | Waarschuwing in modals als kopernaam ontbreekt | Sonnet | 0,5–1 u | €50–100 | Voorkomt brieven met generieke partijnamen |
| 2 | Bevestigingsstap vóór versturen AI-documenten | Sonnet | 2–3 u | €200–300 | Verplichte controle-stap + evt. CONCEPT-watermerk; systeem dwingt review af |
| 3 | Buy-and-build aannames instelbaar | Sonnet | 1–2 u | €100–200 | Vaste aannames (55% acquisitieschuld, 15% aflossing) als invulvelden |
| 4 | ~~**Geautomatiseerde end-to-end testsuite**~~ ✅ AFGEROND | Opus | 8–16 u | €800–1.600 | Zie `tests/README.md`. Deel A (API) + Deel B (Playwright UI) draaien groen. Vond+fixte meteen een waardering-bug. Voorwaarde voor #12/refactor is hiermee vervuld |
| 5 | ~~Gefaseerde dataroom-toegang koper~~ ✅ AFGEROND | Opus | 6–10 u | €600–1.000 | Vrijgave per DD-categorie (aanvinken) i.p.v. alles-of-niets; velden én documenten, server-side gefilterd. Begeleider-modal "🔓 Koper-toegang". Backward-compatible (bestaande trajecten = alles). Getest via e2e-suite STAP 7b |
| 6 | ~~Concept-SPA-generator (werkdocument jurist)~~ ✅ AFGEROND | Opus | 4–6 u | €400–600 + €500–1.500 eenmalige juridische template-review | Knop "📜 Concept-SPA" in begeleider-dashboard, print-only, nadrukkelijk CONCEPT-label. Template in marilyn (upload eigen getoetste versie). **Nog te doen: jurist het BF-standaard SPA-template laten reviewen vóór echt gebruik** |
| 7 | ~~Branding neutraliseren (white-label basis)~~ ✅ VOLLEDIG AFGEROND | Sonnet | 6–10 u | €600–1.000 | Centrale `BRAND`-config in **alle zes portals** (mna, adv, marilyn, index, hugo, verhuis) + de worker (`WORKER_BRAND`). Alle UI-chrome, e-mails, legal-templates (NDA/LoI/BEM/SPA/Bieding/VOK/Algemene Voorwaarden) en foutmeldingen eraan gekoppeld. Live bewezen op elk portaal + echte documentgeneratie getest (BEM in marilyn, waardering-flow). **Onderweg een kritieke zelfreferentie-bug gevonden en gefixt** (bulk-vervanging raakte per ongeluk de eigen configregel) — testsuite + live checks vingen dit vóór het live kon gaan. Rest: alleen nog domeingebonden e-mailadressen/telefoonnummers indien gewenst per klant (kleine nazorg) |
| 8 | ~~AI-extractieschema's per sector~~ ✅ AFGEROND | Opus | 4–6 u | €400–600 | Gecacht systeem-blok is nu sector-neutraal: financiële beoordeling toetst aan de sectorbenchmarks uit de context (al aanwezig per sector) i.p.v. hardgecodeerde accountancy-normen. Caching intact (één gedeelde cache). Live geverifieerd: retail-doc → retail-normen 3-8% |
| 9 | ~~Benchmarks & AI-prompts per sector~~ ✅ AFGEROND | Sonnet | 4–8 u | €400–800 | De documentanalyse-benchmarks (voorheen hardgecodeerd `sectorLabelsDoc`) zitten nu in het sectorprofiel als `docBenchmarks` — bewerkbaar in marilyn → Sectoren, met de ingebouwde tekst als default. Worker leest de DB-versie bij documentupload. **Live bewezen**: aangepaste MKB-benchmark (uniek testgetal) verscheen exact in de AI-analyse. Eén bewerkbare plek voor alle sectorbenchmarks. Benchmarkinhoud (de cijfers) blijft Marcels domeinwerk |
| 10 | Nieuwe sectorprofielen (inhoud + inbouw) | Sonnet | 2–4 u techniek per sector | €200–400 per sector | DD-velden/checklists/normen/infoverzoek — inhoud = Marcels expertise |
| 11 | Pilot algemene DD-tool (MKB afronden) | Opus | 2–3 dagen | €1.600–2.400 | Bundelt #7+#8+#9 voor sector MKB → verkoopbaar algemeen product |
| 12 | ~~mna.html opsplitsen (refactor)~~ ✅ AFGEROND | **Fable 5** | 2–4 dagen | €1.600–3.200 | mna.html (5221 regels) → HTML-skelet (144 regels) + 7 genummerde modules in `mna/` (config-sectorprofielen, state-opslag-documenten, rekenkern-waardering, begeleider-dashboard, documentflow-partijen, schermen, start-chat). **Byte-identieke partitie** (samengevoegd = exact het originele script, bewijsbaar) — nul gedragswijziging. Volledig geverifieerd: UI-suite 7/7 + API-suite 37/37 groen, De Vries begeleider-login + dashboard live getest. CLAUDE.md bijgewerkt (structuur + testritueel) |
| 13 | ~~Sectorparameters zelf-service voor adviseurs~~ ✅ AFGEROND (globaal beheer) | Opus | 1–2 dagen | €800–1.600 | Sectorprofielen (label/aiNormen/fases/velden/checklists) van code → database. Worker: `DEFAULT_SECTOR_PROFIELEN` + tabel `sector_profielen` + GET `/mna/sectorprofielen` (merge defaults+DB) + admin POST. mna.html laadt uit DB (hardgecodeerde fallback). **Marilyn → Sectoren-tab**: label/benchmarks per sector bewerken, volledig profiel via JSON, sector toevoegen/verwijderen, reset naar standaard. Live end-to-end getest (opslaan → mna.html pikt op → reset). Backward-compatible, testsuite groen. Scope: globaal (admin). Per-adviseur = latere uitbreiding |

**Quick wins (#1–3):** samen ~4–6 uur. **Hele backlog:** ruwweg 60–90 uur (extern €6.000–9.000).

NB: het AI-model **ín het platform** (documentanalyse in de worker: `claude-sonnet-4-6`) is een aparte keuze en blijft ongewijzigd — dit gaat alleen over het bouwmodel in Claude Code.

Eerder bewust geparkeerd (staat los van deze lijst): eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn.

---

## Testplan: geautomatiseerde end-to-end test (#4)

Doel: vóór elke deploy met één commando bevestigen dat het hele systeem werkt — en verplicht vangnet vóór de refactor (#12).

### Deel A — API-tests (Node-script, `tests/e2e-api.mjs`)
Tegen de live worker, met eigen testdata die het script zelf aanmaakt én opruimt:
1. `/health` — 200 + `ok:true`
2. Adviseur-lifecycle: uitnodigen → activeren → verkoop (limiet/modules) → traject aanmaken → limiet afdwingen → module-gating (traject uit → geblokkeerd) → deactiveren → verwijderen (de bestaande `test_adviseur.sh` als basis, geporteerd naar Node)
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
6. Verkoper-flow: inloggen De Vries, velden zichtbaar, verversen werkt

### Draaien
```
node tests/e2e-api.mjs            # of: --skip-ai voor snelle run
npx playwright test               # UI-suite
```
Afspraak: beide suites groen vóór elke worker-deploy en vóór elke frontend-push.
