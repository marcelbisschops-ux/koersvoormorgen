# Ontwikkel- en testmethodiek — Koers voor Morgen

**Doel van dit document:** een volledig, op zichzelf staand overzicht van hoe dit platform gebouwd,
getest, beveiligd en gedeployed wordt — bedoeld om aan een onafhankelijke partij (ChatGPT of iemand
anders) voor te leggen met de vraag: *wat ontbreekt hier nog, wat is zwak, wat zou een serieus
software-/securityteam hier anders doen?* Vastgelegd op verzoek van Marcel Bisschops (12 sep 2026), na
een sessie waarin een live doorloop van het platform 15+ bugs blootlegde die alle bestaande audits en
tests hadden gemist.

Twee repo's: `koersvoormorgen` (publieke frontend, GitHub Pages) en `koersvoormorgen-backend` (private,
Cloudflare Worker). Stack: vanilla JavaScript (geen framework) + Cloudflare Workers/D1/R2, Playwright
voor UI-tests, Node.js voor scripts. AI: Anthropic Claude (Sonnet).

---

## 1. De vier(+) staande kwaliteitsstandaarden

Elk een eigen document, elk met een eigen logboek van uitgevoerde rondes, elk periodiek verplicht
(zie sectie 3 voor cadans):

| Standaard | Bestand | Kernvraag |
|---|---|---|
| Kwaliteitsaudit | `AUDIT-STANDAARD.md` | Klopt architectuur, codekwaliteit, waarderingsmethodiek, teststrategie, compliance — technologie-onafhankelijk, als multidisciplinair reviewteam? |
| Cross-path security | `CROSS-PATH-SECURITY-STANDAARD.md` | Kan informatie via een omweg (search, AI-context, cache, metadata, export, notificaties) alsnog lekken tussen rollen/trajecten, ook als de directe toegang correct is? Logboek F1-F16+. |
| Red-team pentest | `RED-TEAM-PENTEST-STANDAARD.md` | Actief proberen te exploiteren (geen checklist) — verplicht GO/GO WITH CONDITIONS/NO-GO-oordeel + doorlopende regressietabel tegen alle eerdere bevindingen. 31 secties. |
| KVM Quality Gate | `KVM-QUALITY-GATE.md` | Kan elke rol (verkoper/koper/begeleider/adviseur/meekijker/specialist) het bedoelde werkproces daadwerkelijk uitvoeren zoals in de praktijk — niet alleen "werkt de feature technisch"? Plus: elke gevonden fout activeert een Foutpropagatie-check (alle vergelijkbare onderdelen meecontroleren). |
| Security-invarianten | `SECURITY-INVARIANTS.md` | Vaste, nooit te breken regels per endpoint/datamodel/export/auth (bijv. `tussen_code` gaat nooit naar verkoper/koper, elke rol een allow-list, geen deny-list). |
| Product-improvement | `PRODUCT-IMPROVEMENT-STANDAARD.md` | Observeren vóór wijzigen, bewijs per wijziging, onafhankelijke-criticusfase ná substantiële wijzigingen. |

Daarnaast: `SECTORPROFIEL-BRONNEN.md` (herkomst van elk sectorbenchmark-getal, 🟢/🟡/🔴 gemarkeerd) en
`LOAD-BEARING-PAGES.md` (register van frontend-pagina's waar een backend-flow van afhangt — voorkomt
een pagina per ongeluk tot redirect-stub maken terwijl er een gemailde activatielink naartoe wijst).

## 2. Automatische statische audits (draaien bij élke push/deploy, blokkerend)

- **`tests/audit-consistentie.mjs`** (frontend, 14 checks): veldreferentie-consistentie tegen
  sectorprofielen, function/const-shadowing-risico, `begeleiderAuth`-aanroepen met verdacht argument,
  "(intern)"-labels vs. koper-afscherming, `SELECT *` buiten `/admin/`-routes, traject-verwijder-
  cascade-dekking, echte cliëntnamen/traject-codes uit `.gevoelige-termen.local.txt`, dealvoorstel
  publiek/intern-scheiding, documentgenerator-clausule-integriteit, WCAG AA-kleurcontrast, load-bearing
  pagina's, cross-document-consistentiecheck-guardrails, reliance-voettekst-mechanisme, en (nieuw, 12
  sep 2026) een vergrendeling tegen het terugkeren van de NDA/LoI/MOU-documentcontent-race.
- **`tests/audit-backend.mjs`** (backend, 7 checks): shadowing-risico, `begeleiderAuth`-argumenten,
  `SELECT *`-controle, verwijder-cascade-dekking, cliëntnamen-check, load-bearing-pagina's,
  reliance-voettekst in de PDF/mail-routes.
- Beide zijn **mechanisch** (geen AI, geen live traffic, geen kosten) en draaien in ~1 seconde — bedoeld
  om bugklasses te vangen die functionele e2e-tests niet raken (verkeerde/vergeten veldverwijzingen,
  geshadowde functienamen, verdachte auth-argumenten).
- Beide zitten in de pre-push git-hook (`.githooks/pre-push` in elke repo) én, voor de backend, in
  `predeploy.sh` (draait automatisch vóór élke `wrangler deploy`/`wrangler dev` via `[build].command`
  in `wrangler.toml` — anders zou een backend-wijziging die buiten `git push` om gedeployed wordt de
  audit stilzwijgend overslaan).
- Noodgeval-override bestaat (`git push --no-verify`, `KVM_SKIP_PREDEPLOY=1`) — alleen met expliciete
  reden, nooit stilzwijgend.

## 3. Functionele/e2e-tests

- **`tests/e2e-ui.spec.js`** (Playwright, browser-gedreven): rekenkern-dealvoorstel (pure functies,
  exacte waarden), login & rollen (eigen tijdelijk testtraject, opgeruimd na afloop), dashboard-
  module-gating, cross-entiteit-databeveiliging (regressie), gelijktijdige multi-upload (race-conditie-
  regressie), en (nieuw) de NDA/LoI-documentcontent-race. Sommige tests vereisen een `ADMIN_KEY` en
  worden anders overgeslagen (netjes gemeld, niet stil).
- **`tests/e2e-api.mjs`** / **`tests/e2e-crosspath-fixes.mjs`** / **`tests/e2e-tos.mjs`**: API-niveau
  regressietests, waaronder de CONF-vertrouwelijkheidsmatrix (elke rol-combinatie expliciet negatief
  getest: rol X mag data van rol Y niet zien) en de Transaction-OS/composer-regressies.
- **`tests/rekenkern-verlieslatend.mjs`**, **`scripts/validate-*.mjs`** (8 scripts): losse,
  onafhankelijke rekenscripts per waarderingsonderdeel (BATNA/walk-away, bod-vergelijker, edge cases,
  grondslag, maatschap-waardering, opbrengstbrug, verkoperbedragen, ZOPA-trade-space, zorg-omvang-
  multiple) — handmatig doorgerekende testcases, niet alleen "geen crash".
- **`scripts/check-dealvoorstel-output.mjs`** / **`check-contract-output.mjs`** / **`check-consistentie-
  output.mjs`**: draaien tegen een écht gegenereerd document/contract, controleren op afwezigheid van
  gegokte cijfers, aanwezigheid van verplichte secties, clausule-integriteit.
- **`scripts/check-contrast.mjs`**: WCAG AA-kleurcontrast, alle tekst/oppervlak-tokencombinaties.
- **`tests/schema-gate.mjs`** + **`tests/schema-baseline.json`**: bewaakt onbedoelde D1-schemadrift.

## 4. Werkwijze per wijziging (CLAUDE.md, 27 werkregels — kern)

- Eén wijziging tegelijk, echte test vóór de volgende stap (werkregel 1).
- Diff tegen huidige versie, alleen gevraagde scope (4).
- Geen diagnose zonder data — eerst code/logs lezen, nooit gokken (5, 8).
- Fix in mna.html ⇒ ook in adv.html waar relevant, en omgekeerd (6).
- Elke wijziging levert een test/checklist mee waarmee de eigenaar zelf kan verifiëren (7).
- **GOUDEN STANDAARD:** het platform verzint nooit een onzekere waarde; bij twijfel een melding, nooit
  een aanname (8). Geldt evengoed voor Claude Code zelf — vooraf plan+risico's melden (9).
- Rol-/rechtengevoelige wijzigingen: expliciet het negatieve geval testen (rol X ziet data van rol Y
  niet) — dit platform had al meerdere kritieke cross-rol-lekken (11d).
- **Verplichte onafhankelijke tegenspraak-stap** (19) bij vier risicozones: rekenkern/waardering,
  AI-prompts naar een tegenpartij, auth/rolgrenzen, harde documentworkflow-gates — een aparte sub-
  agent/ChatGPT/`/code-review` beoordeelt de diff vóórdat het als "af" geldt. Reden: dezelfde
  redenering die een fix schrijft, vangt een fout in díé fix niet betrouwbaar.
- **GOUDEN STANDAARD** rekenkern (13): elke wijziging aan waarderingslogica expliciet gevalideerd met
  een los rekenscript/handmatig doorgerekende testcase, nooit alleen "geen foutmelding".
- **GOUDEN STANDAARD** nooit een echte cliëntnaam in code/commits (14) — automatisch bewaakt.
- Na elke bouw terugstappen naar het geheel: past dit in de bestaande workflow, is er een tussenstap
  gemist, klopt publieke tekst nog (18)? Na élke wijziging teksten/links/logica volledig doornemen (24).
- Nooit interne werkafspraken als zichtbare tekst op het platform/in juridische documenten (25).
- **KVM Quality Gate** (27, nieuw 12 sep 2026): FEATURE → TECHNISCHE TEST → FUNCTIONELE TEST → ROL
  CLICK-THROUGH → FOUTPROPAGATIE-CHECK → REGRESSIE → DONE.

## 5. Periodieke cadans

| Wat | Cadans |
|---|---|
| Volledige kwaliteitsaudit (AUDIT-STANDAARD) | Maandelijks + vóór elke grote release + op verzoek |
| `/code-review ultra` (onafhankelijke multi-agent cloud-review) | Elk kwartaal + vóór elke grote nieuwe feature die externe adviseurs gaan gebruiken |
| Cross-path-security-checklist | Elke periodieke audit (dus maandelijks) |
| Red-team pentest | Maandelijks/per release/kwartaal/jaarlijks, oplopend in diepgang (sectie 29 van de standaard) |
| KVM Quality Gate (Rol Click-Through) | Bij elke wijziging die het rolpad raakt, plus periodiek als vierde standaard |
| Sectorbenchmark-bronnencheck | Per kwartaal |
| Lichte diff-review door een verse AI ("wat is veranderd, wat is riskant") | Maandelijks |
| Dagelijkse geautomatiseerde diepe-audit/pentest-routine (scheduled task, `kantoorinzicht-diepe-audit-routine`) | Dagelijks, 06:07 — polls een wachtrij in marilyn.html, voert een begrensde audit- of red-team-ronde uit, rapporteert terug in het beveiligingsdashboard |
| Git-tag `known-good-JJJJMMDD` | Na elke groene audit + gevalideerde/gedeployde staat |

## 6. Deploy- en releaseproces

- **Backend:** `~/.../koersvoormorgen-backend/backend/` → staging (`npx wrangler deploy
  cloudflare-worker.js --env=staging`) → smoke-test → productie. `predeploy.sh` draait automatisch bij
  elke `wrangler deploy` (syntaxcheck + `audit-backend.mjs`); een bevinding breekt de deploy af.
  `SCHEMA_VERSION` moet bij elke schema-wijziging worden opgehoogd (anders draait de migratie nooit op
  een bestaande database — een bekende, herhaaldelijk misgegane valkuil).
- **Frontend:** commit + push naar `main`; GitHub Pages publiceert automatisch. Pre-push-hook draait
  `audit-consistentie.mjs` + de volledige Playwright-suite — faalt een van beide, dan wordt de push
  geweigerd.
- **Standaardscript:** `scripts/deploy.sh` (staging → bevestigen → productie met health-check, dan de
  frontend-push, in de juiste volgorde) — één commando voor het hele releaseproces.
- **CI:** `.github/workflows/checks.yml` (GitHub Actions) draait e2e-tests tegen staging na elke push.
- **Rollback:** een Worker-deploy is bij Cloudflare goedkoop terug te zetten (vorige Version ID); D1
  heeft Time Travel voor databaseherstel. Bij een productie-incident: eerst herstellen, dan pas de
  oorzaak analyseren.
- **Back-up:** `scripts/backup.sh`, dagelijks (launchd, 20:00) — volledige D1-export + backend-code-
  kopie naar een externe locatie, met mailalert bij een mislukte run. RTO/RPO gedocumenteerd in
  `scripts/README-backup.md`.
- **Monitoring:** UptimeRobot op `/health` (checkt ook de DB-verbinding) + `npx wrangler tail` voor live
  worker-logs.

## 7. Wat hier NIET (of maar gedeeltelijk) geautomatiseerd is — bekende grenzen

- **Playwright draait alleen tegen Chromium** — geen geautomatiseerde Firefox/Safari/mobiele-browser-
  regressietests.
- **Toegankelijkheid** is alleen op kleurcontrast geautomatiseerd gecontroleerd (`check-contrast.mjs`)
  — geen geautomatiseerde screenreader-/volledige-toetsenbordnavigatie-test (wel een aantal losse,
  bekende bevindingen hierover, zie `OPEN-BEVINDINGEN.md` P2/P3).
- **Belasting-/prestatietests onder realistische gelijktijdige gebruikersaantallen** ontbreken — er zijn
  wel gerichte concurrency-regressietests (dubbele klikken, race conditions bij specifieke bekende
  bugs), maar geen generieke load-test.
- **Dependency-/supply-chain-scanning** (npm-pakketten, lockfile-integriteit, bekende kwetsbaarheden in
  gebruikte libraries) is niet als vaste, geautomatiseerde stap ingericht.
- **Externe (onafhankelijke, betaalde) penetratietest door een gespecialiseerd bureau** heeft nog nooit
  plaatsgevonden — de red-team-pentest-standaard hierboven is zelf uitgevoerd (door Claude/ChatGPT),
  geen externe partij.
- **Rol Click-Through (KVM Quality Gate)** is deels geautomatiseerd (nieuwe Playwright-tests) maar leunt
  ook op een daadwerkelijke, handmatige doorloop door Marcel zelf — dat is precies hoe de bugs van 12
  sep 2026 ontdekt zijn; er is geen vaste cadans afgesproken voor hoe vaak zo'n handmatige doorloop
  herhaald wordt.
- **Incident-response-draaiboek** (wie doet wat, in welke volgorde, binnen welke tijd, bij een
  daadwerkelijk datalek/uitval/misbruik) bestaat niet als apart, geoefend document — de reactie tot nu
  toe was ad-hoc per incident.
- **Generieke element-id-hergebruik-detector** (zou het patroon achter de NDA/LoI-documentcontent-race
  automatisch opsporen bij toekomstige, vergelijkbare code) is bewust nog niet gebouwd — een eerste
  opzet bleek te ruw (valse positieven); alleen de specifieke, al gevonden regressie is vergrendeld.
