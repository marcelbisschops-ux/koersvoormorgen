# Koers voor Morgen — Archief (uitgesteld / afgerond / afgewezen)

Afgesplitst van `BACKLOG.md` op 26 juli 2026, op Marcels verzoek: het platform gaat nu de externe
testfase in en er wordt bewust **niets meer gebouwd** tot na die fase (tenzij een test een echte bug
blootlegt — dat is geen nieuw bouwwerk, dat blijft altijd meteen oppakken). Dit bestand is geheugen,
geen actuele to-do — wordt niet standaard meegewogen tenzij Marcel het zelf noemt.

---

## Wacht op jou — korte eigen actie, geen coderingswerk

| # | Punt | Actie |
|---|------|-------|
| 1 | Eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn | Eerder gewist door een inmiddels gefixte bug — bewust uitgesteld op Marcels verzoek (26 juli 2026) |

## Bewust uitgesteld (beoordeeld, geen actieve kwetsbaarheid)

| # | Punt | Beoordeling (26 juli 2026) | Trigger om op terug te komen |
|---|------|------------------------------|-------------------------------|
| 5 | Adviseur-login-flow lijkt halfafgemaakt — `adv.html` bewaart e-mail+wachtwoord in JS-geheugen (`G.ww`) i.p.v. het bestaande `sessie_token`-mechanisme; `marilyn.html`'s `gebruikerToken` wordt nooit gezet; `registreer.html` slaat na activeren wél een `sessie_token` op maar niets leest 'm terug | **Geen actie nu.** Geen aangetoond datalek: verbinding loopt over HTTPS, en `/adviseur/trajecten` her-authenticeert sowieso al bij elke actie — het wachtwoord staat dus niet langer "geldig" dan nodig, alleen vaker in het geheugen dan strikt nodig. Dit is onafgemaakte code (het token-mechanisme bestaat al half), geen ontworpen kwetsbaarheid — passend bij een bouwfreeze om dit niet nu aan te pakken | Oppakken in de eerste bouwronde ná de externe testfase: `adv.html`/`marilyn.html` omzetten naar het bestaande `sessie_token`-patroon (token opslaan bij login, meesturen i.p.v. wachtwoord, backend valideert token) — bestaande bouwstenen zijn er al, dus relatief klein werk |

## Wacht op je jurist

| # | Punt | Status |
|---|------|--------|
| 6 | AV-concept (`AV-Bisschops-Financing-v2.0-CONCEPT.docx`, staat in Downloads) | Nog naar de jurist te sturen |
| 7 | VOK Artikel 9-concept (geanonimiseerd trajectdata-gebruik voor sectorbenchmarks/AI-verbetering) | Concept-tekst ligt klaar, wacht op jurist. Geen techniek bouwen vóór bevestiging |
| 8 | SPA-template (concept-koopovereenkomst) laten toetsen | Vóór het model als "getoetst" gebruikt wordt |

## Klaar om te bouwen — wacht op jouw inhoudelijke input

| # | Punt | Toelichting |
|---|------|-------------|
| 9 | Nieuwe sectorprofielen | DD-velden/checklists/normen per nieuwe sector — techniek staat al klaar |
| 10 | Pilot algemene DD-tool (MKB) | Bundelt bestaande sectorneutrale AI-extractie/benchmarks tot verkoopbaar algemeen product |
| 11 | Accountancy-sectorprofiel: gestructureerde omzetsplitsing + winst-per-partner | Vereist input over gewenste velden/definities |

## Bewust uitgesteld — risico-afweging, trigger om terug te komen

| # | Punt | Waarom uitgesteld | Trigger om op terug te komen |
|---|------|--------------------|-------------------------------|
| 19 | Geautomatiseerde risicoscore | Alle redflags zijn nu statische, handmatig af te vinken checklist-items | Bouwstenen zijn er al; oppakken wanneer gewenst |
| 20 | Interactieve closing-checklist | Nu een read-only tekst-textarea van een statisch sjabloon. Herbevestigd door Marcel 26 juli 2026: "closing checklist erg mager" | Oppakken wanneer gewenst — Marcels signaal dat dit prioriteit mag krijgen |
| 21 | Cloudflare WAF-upgrade | koersvoormorgen.nl staat niet op Cloudflare (DNS via TransIP, direct naar GitHub Pages), Worker heeft geen eigen route/zone — technisch niet zomaar aan te zetten. Bestaande lagen (rate-limiting, gehashte wachtwoorden, HTTPS, geparametriseerde queries, XSS-escaping) dekken het huidige risico al grotendeels | Zodra er echte betalende externe partijen met doorlopende echte dealdata actief zijn — dan eerst DNS naar Cloudflare verhuizen, daarna zone-level plan checken |
| 22 | Externe pentest | Nog nooit gedaan | Zodra er meer dan een handvol bekende testgebruikers is |
| 23 | Deal comparison / scenariovergelijking naast elkaar | Marcels woorden: "nog niet" | Op signaal |
| 24 | Dealflow-CRM / pipeline-management + target screening | Expliciet gedeprioriteerd | Op signaal |
| 25 | Geanonimiseerde cross-adviseur benchmarks | Hangt af van punt 7 (VOK Artikel 9 bij jurist) | Ná juridische goedkeuring én expliciet verzoek |
| 26 | SBR/XBRL uitbreiden (meer velden, entiteitsnaam-verificatie, namespace-validatie) | v1 is af en live | Niet urgent |
| 27 | AI-model omzetten naar `claude-sonnet-5` (nu `claude-sonnet-4-6`) | Eerst kwaliteitstest op staging vóór productie — deal-kritieke AI-extractie | Wanneer Marcel groen licht geeft voor de staging-test |
| 28 | Route/business/data-scheiding in de workermodules | Bemoeilijkt geïsoleerd testen | Architectuurkeuze, oppakken bij grotere refactor-ronde |

## Kleine, niet-urgente technische schuld

| # | Punt | Toelichting |
|---|------|-------------|
| 29 | D1-database `jurisdiction: null` | Draait feitelijk al in West-Europa, niet hard afgedwongen in config |
| 30 | Playwright-test "Gelijktijdige multi-upload" — kleine restflakiness | Root cause gevonden (300ms-vertraging in UX-code), test gefixt, 7/8 herhalingen groen |
| 31 | "Confidence score bij documentextractie"-claim is overstated | Alleen binaire leesbaar/onleesbaar-vlag, geen graduele betrouwbaarheid |
| 32 | `veiligeCode()` heeft een verwaarloosbare modulo-bias | Statistisch te verwaarlozen, puur cosmetisch |
| 33 | adv.html-documententabel + fase-detailscherm missen overflow-bescherming op mobiel | Kleine restpunten van de eerdere responsive-fix |

## Terugkerend, geen actie nu

| # | Punt | Eerstvolgende moment |
|---|------|----------------------|
| 34 | Kwartaalcheck 7 juridische templates + sector-benchmarks op actualiteit | Streefdatum 2026-10-05 |
| 35 | Maandelijkse kwaliteitsaudit (werkregel #12) | Elke maand + vóór elke grote release + op verzoek — **on hold tijdens de externe testfase-freeze**, tenzij Marcel er zelf om vraagt |

## Afgewezen — niet opnieuw voorstellen

- MIP / fiscale structuuroptimalisatie — Marcels woorden: "nee"
- "Strikte scheiding" tussen platform en eigen adviespraktijk juridisch claimen — feitelijk onwaar zolang het één eenmanszaak is

---

## Historie: recent afgerond (context, geen actie)

**26 juli 2026:** Signhost-checksum ingesteld (beide omgevingen), GitHub Actions-secret vervangen, beide repo's gesynchroniseerd op GitHub. Dark-mode-leesbaarheidsbug gefixt (LoI/BEM/NDA-modals + 9 modal-titels). Modal-toegankelijkheid volledig afgerond (29 modal-overlays, `role="dialog"`/`aria-modal`/`aria-labelledby`).

**26 juli 2026:** Documentknoppen hergroepeerd (NDA→BEM→LoI→Excl→Dealvoorstel→Bieding). Per-fase-intro voor de verkoper. Verplicht openingsscherm verkoper (adres/KvK/tekenbevoegde) bij nieuwe trajecten. HTTP-statuscode-consistentie (89 responses). Response-envelope-duplicatie opgelost (598 blokken → 1 helper). Foreign keys D1-schema volledig afgerond (19 tabellen, `ON DELETE CASCADE`) — zie `MIGRATIE-FOREIGN-KEYS.md` in de backend-repo.

**26 juli 2026:** Earn-out toegevoegd aan dealvoorstel-generatie (`dvBerekenEarnOut`, handmatig doorgerekend en live geverifieerd). LoI neemt dealvoorstel-cijfers automatisch over (`cijfers_json`, live geverifieerd). Fase-2-vrijgave-bug na LoI-ondertekening gevonden en gefixt (`S.loiGetekend` werd niet lokaal gezet bij de "buiten Signhost om getekend"-flow).

Voor oudere geschiedenis: zie git-log van beide repo's en de audit-logboeken (`AUDIT-STANDAARD.md`, `tests/AUDIT-LOG.md`).

## Afgerond ná bouwfreeze (logboek, verplaatst uit `BACKLOG.md` op 26 augustus 2026 bij het opschonen/hernummeren van de actuele lijst)

1. **Begeleider-dashboard (mna.html) onoverzichtelijk** — **afgerond 16 augustus 2026**: volledig uitgeschreven documentnamen, groepering per dealfase (Voorfase/Onderhandeling/Afronding), Documenten/Communicatie/Analyse nu los inklapbaar. Getest op staging (browser).
2. **Eigen bem_koper-sjabloon (echte tarieven)** — **afgerond 16 augustus 2026**: op basis van een getekende bemiddelingsovereenkomst uit een eigen dossier is een eigen template gebouwd (succesfee 4,5%/3,5%/2,75%/2%, min €25.000; voorfase Fase 0 €4.000 + Fase 1 €6.000; uurtarief €250; forum Rechtbank Oost-Brabant), geüpload en geverifieerd in productie. Alleen voor Marcels eigen account (begeleider_email marcel@bisschopsfinancing.nl) — niet het platform-brede standaardsjabloon.
3. **bem_verk-sjabloon (verkoop-mandaat)** — **afgerond 24 augustus 2026**: Marcel gaf expliciet akkoord om dezelfde tarieven als bem_koper te hanteren ("zelfde tarieven als een koop mandaat, en dat heb je"). Eigen template gebouwd op basis van de bestaande bem_koper-tekst, aangepast naar verkoopcontext (Opdrachtgever = verkoper, Fase 0/1 beschrijven teaser/informatiememorandum i.p.v. bod-voorbereiding). Alleen voor Marcels eigen account. Geüpload naar productie, live geverifieerd.
4. **Volledig MKB-overname-testscript** — **materiaal opgeleverd 19 augustus 2026, uitgebreid 20 augustus 2026**: fictief testpakket (holding + werkmaatschappij, later uitgebreid met 3 losstaande niet-accountancy-testpakketten: restaurant, autodealer, snoepwinkel) + stapsgewijs testscript. 20 augustus: op Marcels correctie opnieuw opgezet zodat de **uploadbestanden** 100% van de mkb-sectorprofielvelden dekken en door de échte AI-extractiepijplijn heen gaan (niet rechtstreeks in de database gezet). Onderweg een structurele mkb-koppeltabelbug gevonden en gefixt (`autoFillFromExtraction()`, was ~49% dekking, nu potentieel 97/97). Eindresultaten: restaurant 97/97 (100%), autodealer 95/97 (98%), snoepwinkel 94/97 (97%) — de laatste velden zijn hetzij correct "nooit gokken"-gedrag, hetzij een vermoedelijke Cloudflare Bot Fight Mode-blokkade. Canonieke regel vastgelegd in `CLAUDE.md` (Testdocumenten-standaard, punt 6). De laatste paar ontbrekende velden en de handmatige doorloop van de vervolgstappen zijn bewust niet verder opgepakt (Marcel, 26 augustus 2026: "kan eraf").
5. **Alle P1's en P2's uit de zesde heraudit (19 augustus 2026)** — **afgerond 19 augustus 2026**: kritieke IDOR in document-download (cross-traject), niet-atomaire waardering-configuratiewijziging, `--muted`-contrasttoken + hardcoded donkere-modus-kleur, inconsistente e-mail-escaping, persistente logging, rate-limiting-gaten, geen centrale foutafhandeling in `fetch()`, toetsenbord-toegankelijkheid + focus-trap/-return op modals. Volledige testsuite (53 API + 9 UI + 7 consistentie) groen, staging+productie getest. Zie `AUDIT-STANDAARD.md` voor het volledige overzicht.
6. **Cross-path-informatielek-audit F1-F13** — **volledig afgerond 19 augustus 2026 (13/13)**: cross-traject-auth-lekken, koper-categorie-intrekking niet doorgevoerd, marcel-CC onvoorwaardelijk bij externe-adviseurstrajecten, chat-state niet gereset bij uitloggen, waarderingsgeschiedenis zonder auth, zwakke validatie op mail-begeleider, muur tegen externe adviseurs miste 4 routes, dode `/mna/groep/*`-routes verwijderd, existence-oracle bij Q&A, wees-R2-bestanden bij trajectverwijdering, generieke `/ai`-proxy-architectuurrichtlijn vastgelegd, meekijkers-route zonder muur bij admin-key. Permanente regressietest `tests/e2e-crosspath-fixes.mjs` (39/39) groen. Volledig logboek: `CROSS-PATH-SECURITY-STANDAARD.md`. Daarnaast als nieuwe features gebouwd: SWOT/PESTEL/Porter-risicoraamwerk, AI-extractie-betrouwbaarheidsscore, en een veiligheidsdashboard in marilyn.html (tabblad "Veiligheid") met dagelijkse geautomatiseerde selfcheck.
7. **Adviseur-exportfeature** — **afgerond 26 augustus 2026**: nieuw endpoint `/adviseur/export/{code}` (`backend/worker/16-adviseur.js`), adviseur-sessietoken + eigenaarschapscheck (`gebruiker_id`-match) + `heeftModule('export')`-gate. Vinkje "Export & rapportage" teruggezet in marilyn/adv.html. Getest op staging + productie (eigenaar 200, andere adviseur 403, geen token 401, module uit 403), testdata opgeruimd. Bijvangst: hardcoded "KANTOORINZICHT" in de admin-exporttekst gefixt (rebranding-miss door hoofdlettergevoelige zoekopdracht), en een ontbrekende `Access-Control-Expose-Headers: Content-Disposition` in de CORS-config gefixt (brak bestandsnaam-detectie bij alle fetch-downloads, oud én nieuw). Nieuwe SELECT-*-audit-waarschuwing (check 5) handmatig geverifieerd (9 niet-gevoelige velden, geen tussen_code/koper_code/tekenbevoegdheid) vóór whitelisting. Handleiding bijgewerkt in `mna/08-handleiding.js` en `adv.html`.
8. **Rebranding: "KantoorInzicht" → uitsluitend "Koers voor Morgen"** — **volledig afgerond 24-25 augustus 2026**. 23 bestanden hoofdrepo + 6 backend + 1 bonus-fix bijgewerkt, daarna ook de 4 juridische documenten. Echte back-upmap op Marcels Mac hernoemd naar `KoersVoorMorgen-Backups` (launchd-Label bewust ongewijzigd — apart, risicovoller). Stray-bestand `index .html` verwijderd. Alle testsuites groen, geen enkele resterende `KantoorInzicht`-referentie in de codebase.
9. **Server-side module-enforcement (23-24 augustus 2026, "ja fix dat")** — marilyn's modulevinkjes (traject/contracten/ai_analyse/qa/export/meekijker/marketing) werden tot dan toe alleen client-side afgedwongen. Per module gefixt met een herbruikbare `heeftModule()`-helper (fail-open voor eigen/Marcel-trajecten zonder gekoppeld adviseursaccount, admin-bypass via ADMIN_KEY), telkens staging-getest en live gedeployed: Marketing, Contracten (8 endpoints), AI-analyse (bleek zonder gate, 4 endpoints + 2 knoppen), Q&A (bleek zonder gate, 5 endpoints + paneel), Meekijkers (bleek al gegated), Export (zie punt 7 hierboven).

### Afgerond 30-31 augustus 2026 (verplaatst uit `BACKLOG.md` bij het hernummeren op 31 aug — detail in de git-historie van beide repo's)

10. **Doorlopend genummerde BTW-factuur (21%)** — backend + marilyn, live 31 aug. `factuur_reeks`-tabel (`YYYY-NNNN`, atomair opgehoogd), `GET /mna/admin/factuur/{id}` herschreven van "kostenoverzicht" naar officiële factuur (excl./BTW/incl., BTW-nr + KvK 82085200 + betaalinstructie, fee-events gemarkeerd als gefactureerd), `GET`/`POST /mna/admin/factuurconfig` (weigert factuurgeneratie zonder ingesteld BTW-nr + IBAN). Marcel heeft ná deploy het echte BTW-nr + IBAN ingevuld.
11. **"M" van M&A — aandelenruil + governance** (deelpunten 1/3/5 van het oude backlog-item 4). `dvBerekenRuilverhouding()`/`dvTabelRuilverhouding()` + cap-table-velden in het dealvoorstel-formulier (27 aug, waarde-evenredig, externe koperswaarde nooit geschat). Fusie-dual-approval: de "intern goedgekeurd door"-stap bij LoI/Bieding vraagt bij `traject_type='Fusie'` twee namen (één per fusiepartij), beide verplicht + gelogd (31 aug). Deelpunt 2 (rolmodel) en deelpunt 4 (echte juridische fusie) blijven open — zie `BACKLOG.md` A3/A4.
12. **Onderhandel-playbook — 5 onderdelen (30-31 aug).** Opbrengst-brug (`dvBerekenOpbrengstBrug` — EV → equity value → cash bij closing, aftrekposten als begeleider-aanname); ZOPA trade-space (`dvBerekenZopaTradeSpace` — herindeling naar zekerheid × timing); BATNA & walk-away (`dvBerekenBatna` — BOVEN/KRAP/ONDER, alleen verkoperszijde, walk-away leeg = geen oordeel); LoI = SPA-checklist (`dvTabelLoiChecklist` — 15 kern-economics gedekt/deels/"leg vast in LoI"); bod-vergelijker / Deal Value Matrix (`dvBerekenBiedingVergelijking` — gekoppelde-trajecten-variant: `verkoper_groep_id`-kolom, `koppel_aan_traject` bij `/mna/create`, `GET /mna/biedingen/vergelijk` met per-traject `begeleiderAuth`). Plus een begrippenlijst (~38 termen) + berekeningsuitleg per model in `mna/08-handleiding.js` + `adv.html`, voor elke rol zichtbaar. 5 validatiescripts (142 checks), rekenkern-e2e 12/0. Afronding (staging-test negatief rolgeval, `kopieer_dd_van`-fix deployen, testklant draaien) staat als open punt B6 in `BACKLOG.md`.
13. **Management-/directie-diepte als waarderings-/PMI-factor** — 3 velden (`tweedeEchelon`, `keyPersonAfhank`, `mgmtRetentie`) toegevoegd aan de partner-fase van alle 4 sectorprofielen (fase 1/2); backend-schema (`DOC_EXTRACTIE_JSON_SCHEMA_BASIS` + extractie-instructies + `DEFAULT_SECTOR_PROFIELEN`) live op productie (Version 5aa34ec3); cijferoverzicht-rijen in het dealvoorstel + AI-prompt-weging + nieuw `dvManagementRisico()`/`dvTabelManagementRisico()`-blok (kwalitatief laag/midden/hoog, raakt nooit de multiple, "onvoldoende ingevuld" bij te veel onbekend). e2e + maatschap-validatie groen.
14. **Maatschap-/eigenaarstructuur + sectorbewuste terminologie.** `getPartnerTerm()` (accountancy→partners, zorg→maten/praktijkhouders, mkb→eigenaren/DGA, itsoftware→founders). `structuur_type`-kolom (bv/maatschap/eenmanszaak, expliciet genormaliseerd) op `mna_trajecten` via `initDB` + `/adviseur/create` + `/mna/create`; `winstaandeel_pct` per maat op `mna_partners`; `consolideerFase()` maatschap-tak (holding niet uitgesloten); rekenkern-maatschap-tak (`dvGetDefaults`/`dvBerekenWaardering` — grondslag = winst ná marktconform ondernemersloon, `vpbPct=0`, w-waardes `null` bij ontbrekende beloning). `scripts/validate-maatschap-waardering.mjs` 30 checks (incl. BV-regressie ongewijzigd).
15. **Bedrijfsscan (voorheen "kantoorscan") multi-sector.** Sectorkiezer op het introscherm → accountancy / mkb / zorg / itsoftware, elk met eigen `SECTIONS`/`SCENARIOS`/`REVERSE` (zelfde dimensie- en vraag-id-schema). Guardrails: buiten accountancy geen accountancy-benchmark en geen waardering (nette "nog niet beschikbaar"-melding). `git mv kantoorscan.html → bedrijfsscan.html` + redirect-stub (oude links blijven werken). `index.html` verbreed ("accountancy, mkb, zorg en IT"); groepsmodus-AI + managementsamenvatting sectorbewust. `voorwaarden.html` v2.2 / `privacy.html` v1.7 (terminologie "kantoorscan"→"bedrijfsscan"). Backend: kolom `sector` op `scan_rapporten` (`/rapport/save`) en `scans` (`/group/join`), live. Losse eindjes staan als open punt B8 in `BACKLOG.md`.
16. **Testaccounts zien geen platformprijzen** — `is_tester` (op `bf_gebruikers`) verbergt de commerciële platformtarieven (trajectfee/AI-fee/lead-inbreng/meekijker/teaser/memorandum/matching) in `adv.html`, en het `/adviseur/kosten`-endpoint geeft voor een tester `{events:[],totaal:0,verborgen_tester:true}`; matching-notificatie logt geen `platform_fee_event`. De **dealbedragen** in een traject (waardering/dealvoorstel/bieding) blijven volledig zichtbaar.
17. **Landingspagina: "vraag een testtraject aan" i.p.v. "plan een demo" via WhatsApp** — de 3 WhatsApp-CTA's vervangen door een `<dialog>`-formulier (naam/organisatie/e-mail/KvK/rol/toelichting) + honeypot; `POST /leads/testtraject` → `mna_leads` met `bron='testtraject'` (+ kolommen `kvk`/`bron`) + mail naar Marcel. marilyn Leads-tab: type-badge (Testtraject/Overname) + KvK. `privacy.html`: nieuwe rij. Turnstile + rate-limiter bewust weggelaten in v1 → open punt B7.
18. **Homepage** — (a) visuele/positionerings-upgrade (26 aug): echte productscreenshot-hero-visual, "proof band" met AI-gevulde Financieel-DD-screenshot, nieuwe "AI die het dossier bewaakt"-sectie, scan-/matching-blokken naar een lichter gewogen "Ook van Koers voor Morgen"-sectie. (b) desktop-layout opschonen (31 aug): hero op desktop 2-koloms, hero-visual gecropt met mask-fade i.p.v. een volle platte lijst; mobiel ongewijzigd.
19. **Backend-audit draait nu bij elke deploy** — de statische audit hing aan de pre-push git-hook, maar backenddeploys gaan via `wrangler deploy`, niet via `git push` (dashboard stond wekenlang op een oude run). Opgelost met `backend/predeploy.sh` + `[build].command = "./predeploy.sh"` in `wrangler.toml` (syntax + `tests/audit-backend.mjs` + dashboard-melding; bevinding → deploy breekt af; noodstop `KVM_SKIP_PREDEPLOY=1`). Plus `scripts/deploy.sh` als standaard-deployscript (backend staging → bevestigen → productie + health-check; frontend blijft GitHub Desktop).

### ChatGPT-audits van de rekenkern + de AI-prompts (31 augustus 2026, gepusht — actieve BACKLOG bewust leeg gehouden op Marcels verzoek)

20. **Rekenkern-review (ChatGPT, hele `mna/03`).** 12 bevindingen, allemaal tegen de code geverifieerd (geen false positives), allemaal in code opgelost + 255 validatiechecks (8 scripts, waarvan nieuw `validate-grondslag.mjs` en `validate-edge-cases.mjs`):
    - **#2 (kritiek) zorg omzet-multiple:** `dvGetDefaults()` negeerde `multipleBasis:'omzet'` → het dealvoorstel rekende 1–3× op EBITDA i.p.v. omzet. Nu volledige **grondslag-schakelaar** (`p.grondslag` + `grondslagBewezen/Prognose`; closing/prijsmechanisme/cliff/gevoeligheid/opbrengst-brug rekenen op omzet; schuldafbouw/DCF bewust op EBITDA). Eigen omzet-grondslagvelden in de modal. Dit is **toegevoegde** functionaliteit — zorg werd hiervoor gewoon fout gewaardeerd.
    - **#1** onbekende/ongeconfigureerde sector → géén gegokte `4,5–5,5×` meer (melding i.p.v. getal). Raakt geen enkel echt traject: de sectorkiezer zet altijd een geldige sector, en legacy-trajecten zonder sector vallen nog steeds terug op de (correcte) accountancy-multiples.
    - **#3** ontbrekende omzethistorie → `gemGroei=null` en de rolling-forecast-tabel wordt vervangen door "geen groeiraming mogelijk" i.p.v. een stille 3%-aanname door te rekenen.
    - **#11** de altijd-getoonde regel "Omzetmethode (0.8×)" op het waarderingsscherm + in de CSV is **verwijderd** — het was een nergens onderbouwde, sectoronafhankelijke 0,8×-multiple (schending gouden standaard). De legitieme omzet-waardering (voor omzet-multiple-sectoren) zit in `wLaag/wMid/wHoog` en is intact.
    - **#4** negatieve equity → verkoperscash geclampt op €0 + waarschuwing "schuld > ondernemingswaarde" i.p.v. een negatief bedrag tonen.
    - **#8** quick ratio sluit nu **onderhanden werk uit** (klassieke acid-test-definitie) — de getoonde quick ratio verandert dus voor bedrijven met OHW; de current ratio (die OHW wél mag bevatten) is ongewijzigd.
    - **#6/#7/#9/#10/#12** relabeling + optionele parameters, met defaults zó dat elke bestaande berekening bit-voor-bit identiek blijft: "FCFF" → "vereenvoudigde unlevered kasstroom" + optioneel `afschrijvingenPct`; "DSCR" → "EBITDA-dekking schuldendienst"; `capex = max(0, EBITDA) × %`; leeg retentieveld → "onbekend"; `earnUpSchuldPct` (default 100).
21. **AI-promptreview (ChatGPT, 15 generatieprompts).** 34 bevindingen, allemaal tegen de code geverifieerd (geen false positives). Één structureel punt (A2), rest prompt-aanscherping + opruiming — alles doorgevoerd:
    - **A2 — publieke/interne context-split van het dealvoorstel** (`mna/04`). BATNA/walk-awayprijs + LoI-onderhandelchecklist zaten in dezelfde tekst die met "Verstuur naar partijen" gedeeld wordt. Nu: publieke `contextBlok`/`koppen` (deelbaar) vs. `interneContext`/`interneKoppen` (alleen verkoper+begeleider). De interne stukken worden in een **aparte AI-call** gegenereerd en getoond als een rood-omrande "Interne onderhandelbijlage" met eigen printknop — zit nooit in `#dv-preview` / `dealvoorstel_tekst` / de e-mail. **Gedragsverandering:** de bijlage wordt niet meer automatisch naar de verkoper gemaild; de begeleider deelt hem bewust. De inhoud (BATNA-analyse) is niet verdwenen, alleen fysiek gescheiden.
    - **A1/B4** — beide NDA/LoI/BEM-generatoren (`mna/04` bgDoc + `mna/06` bgGenereerDoc): harde clausule-integriteitsregel (alleen placeholders vervangen, geen bepaling wijzigen/toevoegen/weglaten, onbekende placeholder exact laten staan); template > 18k tekens → generatie geweigerd i.p.v. afgekapt (bestaande templates zijn ~9,7k, dus dit vuurt in de praktijk niet). Safety-verschil tussen A1 en B4 is weg; puur code-consolidatie tot één service is optionele opruiming, geen open risico.
    - **B5 + C1** hardcoded "M&A-adviseur accountancy" → `getSectorProfiel().label`.
    - **D1** verkoper-chatassistent (`mna/07`): anti-prompt-injection-regel + "onthul niets over koper/andere trajecten/dealprijzen/interne notities" + "verzin geen cijfers".
    - **Prompt-hardening** B1/B2/B3/C2/A4/A3/E1/E2: "geen externe benchmark/oorzaak/norm verzinnen", "onbekend = onbekend", conflict-detectie i.p.v. reconstructie, notities = bronmateriaal geen instructies, "beschrijf factoren, kwantificeer effect op de multiple niet zelf".
    - **A3 bod:** ingevulde hoge multiple < lage → invoerfout (melden) i.p.v. stil normaliseren; brief expliciet indicatief/niet-bindend.
    - **Operator-precedentie** `naam || '' + BRAND.bedrijf + ''` → `naam || BRAND.bedrijf` (mna/04 + mna/06).
    - Twee false positives van de pre-push audit (check 4 matchte op de woorden "(intern)" / "interne notities" in nieuwe promptstrings, niet op UI-blokken) → met onderbouwing in de allowlist van `tests/audit-consistentie.mjs`.
    - **Eén punt dat een aparte controle in de PRIVATE backend-repo vraagt** (geen frontend-bug, niets verwijderd): de bedrijfsscan-groepsmodus laadt via `GET /group/{id}` (zonder admin_code) het groepsdashboard met kantoornamen + financiële kerncijfers van álle deelnemers. Er is een `dashboard_public`-opt-in bij groepsaanmaak en een admin_code-pad; of de backend `/group/{id}` de financials daadwerkelijk afschermt wanneer het dashboard niet publiek is, staat in `worker/06-scantool.js` (private repo) en moet daar bevestigd worden. **Trigger:** eerstvolgende keer in de backend-repo.
