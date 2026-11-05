# Audit-log — wekelijkse controle Koers voor Morgen

## 2026-09-19

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg (`{"ok":true,"opdracht":null}`). Vandaag (19e) valt buiten het 1e-3e-van-de-maand-venster voor de automatische maandelijkse cadans, dus geen zelf-aanvraag ingediend. Geen audit uitgevoerd, niets gewijzigd. Opmerking: de working tree van de frontend-repo had bij aanvang onopgeslagen wijzigingen (`bedrijfsscan-start.html`, `mna/04-begeleider-dashboard.js`, `mna/06-schermen.js`) + een aantal ongecommitte BATCH-patchbestanden op de repo-root — niet aangeraakt door deze routine, vermoedelijk lopend handwerk van Marcel/een eerdere sessie.

## 2026-09-20

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg (`{"ok":true,"opdracht":null}`). Vandaag (20e) valt buiten het 1e-3e-van-de-maand-venster, dus geen zelf-aanvraag ingediend. Geen audit uitgevoerd, niets gewijzigd. Opmerking: de working tree had bij aanvang `bedrijfsscan-start.html` gewijzigd + een reeks ongecommitte BATCH3-patchbestanden op de repo-root — niet aangeraakt door deze routine, vermoedelijk lopend handwerk van Marcel/een eerdere sessie.

## 2026-09-20 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** rol **meekijker** (nog geen enkele automatische knoppentest-run had deze rol gedekt —
expliciet als prioriteit genoteerd op 19 sep), sector **zorg** (nog niet eerder getest door deze
routine — 18 sep transport, 19 sep bouw), trajecttype **Opvolging** (nog niet eerder gebruikt — 18 sep
Overname, 19 sep Fusie), fasen Financieel (scope van de meekijker) + Juridisch & fiscaal (om de
scope-grens van de meekijker aantoonbaar te testen, niet alleen de fase die hij wél mag zien). Reden:
brede combinatie-rotatie + gerichte dekking van de expliciete "niet getest deze ronde"-lijst van 19
sep (werkregel 15/36 punt 1).

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK, `tests/.env.staging.local`
aanwezig). Testtraject `DAILY_QA_20260920` (fictief: "Zorggroep De Lindeboom B.V.", kleinschalige
ouderenzorgorganisatie), aangemaakt/getest/opgeruimd via een los Node-testscript op basis van
`tests/lib.mjs` (bouwstenen, geen dubbel werk met `tests/e2e-api.mjs`/`run-rolflows.sh`).

**Doorlopen flow (klik → request → backend → database → response → resultaat), 39/39 checks OK bij de
definitieve run (één eerdere run had 3 gefaalde checks — bleken alle drie testscriptbugs te zijn, geen
platformbug: verkeerd gelezen responsvelden (`traject.sector`/`traject.traject_type` i.p.v. top-level,
en `veld_extractie` i.p.v. het niet-bestaande `velden`) — bewijs hieronder onder "Foutpropagatie-
check op de eigen bevindingen"):**
1. Traject aanmaken (`/mna/create`, sector zorg, traject_type Opvolging) — sector/type correct
   teruggelezen via `/mna/traject/{code}` voor de verkoper-rol.
2. Fase Financieel: verkoper mag opslaan; koper expliciet geblokkeerd (403, bekende regel sinds
   15 sep — koper heeft nergens schrijfrecht op DD-gegevens).
3. Documentupload + echte AI-extractie: een realistische, meerdere-secties jaarrekening 2025 voor de
   fictieve zorgorganisatie (bestuursverslag/balans+vergelijkende cijfers/W&V 3 jaar/kasstroom/
   grondslagen conform RJ 655/toelichting/samenstellingsverklaring — geen kaal 1-paginadocument).
   Upload geaccepteerd, velden geëxtraheerd, **geen** accountancy-sectorlabel-lek in de analysetekst
   (P2-64-regressiecontrole voor sector zorg — zorg is een van de oudere sectoren met een eigen
   `docBenchmarks`-rij, dus dit bevestigt vooral dat de 19-sep-structuurfix andere sectoren niet heeft
   geraakt, geen nieuwe P2-64-reproductie).
4. Reject-pad: een irrelevant document (meubilaircontract, andere entiteit) correct verworpen zonder
   velden in te vullen.
5. Fase Juridisch & fiscaal: begeleider mag opslaan (rolgrens correct, spiegelbeeld van punt 2).
6. **Meekijker aanmaken** (`/mna/admin/viewer/aanmaken`, begeleider-rol via `tussen_code`, scope
   Financieel): geweigerd zonder `toestemming_bevestigd:true` (GV Artikel 3-check), geslaagd mét.
7. **Meekijker-flow, structureel getest tegen de eigen documentatie van `worker/21-meekijker.js`:**
   - `/mna/viewer/info`: werkt zonder acceptatie, toont `voorwaarden_akkoord:false` en sector correct.
   - `/mna/viewer/data` + `/mna/viewer/documenten`: beide 403 (`voorwaarden_niet_geaccepteerd`) vóór
     acceptatie van de vertrouwelijkheidsverklaring.
   - Ná `/mna/viewer/voorwaarden/accepteren`: beide endpoints 200, en **scope-filter werkt correct** —
     alleen fase Financieel zichtbaar, het juridische veld (`kvk_nummer`) dat de begeleider apart
     invulde is NIET in de viewer-data-respons aanwezig (geen scope-lek naar Juridisch).
   - Geen `checklist_json`/`notitie` (interne DD-werknotities) in de viewer-data-respons — bevestigt
     de bewuste ontwerpkeuze in de code-comments.
   - Geen `r2_key`/downloadlink in de viewer-documentenrespons — bevestigt "inzicht, geen
     documentbeheer" voor deze rol.
   - Defense-in-depth: `POST /mna/viewer/data` expliciet 405 (viewer-routes zijn hard GET-only, op de
     ene bewuste schrijfuitzondering na).
   - Ongeldige viewer-code → 401, geen informatie-lek.
   - Rolgrens: een geldige **koper**-code geeft GEEN toegang tot `/mna/admin/viewer/aanmaken` (401) —
     alleen begeleider/admin mag meekijker-codes beheren.
8. Begeleider-kant: `/mna/admin/viewer/lijst` toont de meekijker met `laatst_bekeken` correct gezet ná
   de view-acties; `/mna/admin/viewer/log` bevat zowel een `data`- als een `documenten`-actieregel
   (audit-logging, sessie 3 van het meekijker-bouwplan van 16 aug, werkt zoals gedocumenteerd).
9. Intrekken (`/mna/admin/viewer/intrekken`): de viewer-code is **direct** ongeldig (401,
   reden `ingetrokken`) — geen vertraging, geen cache-doorwerking.

**Resultaat: geen enkele functionele of security-bevinding binnen deze combinatie.** De meekijker-rol
(een rol die nog nooit door een automatische test was gedekt en die per ontwerp gevoelig is voor
precies het soort rolgrens-lek dat eerder wél is gevonden bij koper/begeleider, zie
`project_rolgrens_lek_koper_intern`) bleek bij eerste keer testen volledig conform de eigen
documentatie en zonder scope-lekken.

**Foutpropagatie-check op de eigen bevindingen (werkregel 4/38 — code- vs. reproductiebewijs niet
vermengen):** de eerste testrun gaf 3 faalmeldingen. Vóór het als "bevinding" te loggen zijn deze
onderzocht met losse curl/node-reproducties tegen de daadwerkelijke productiecode
(`worker/11-mna-tekenen-beheer.js` regel ~460 e.v. voor de DTO, `worker/14-document-upload-analyse.js`
voor de upload-respons): `/mna/traject/{code}` nestelt traject-velden bewust onder een `traject`-sleutel
(niet top-level) en de upload-respons heet het extractieveld `veld_extractie` (niet `velden`) — beide
bevestigd door de brondocumentatie/code zelf, dus test-scriptbugs, geen platformgedrag dat is gewijzigd.
Na correctie: 39/39. Geen codewijziging nodig.

**Zelfstandig opgelost + gedeployed:** niets — geen platformbug gevonden binnen deze combinatie.

**Opgeruimd:** het testtraject verwijderd via `/admin/delete/mna/` op staging; 0 resterende
`DAILY_QA_20260920`-trajecten geverifieerd via `/mna/admin/lijst`.

**Niet getest deze ronde (expliciet, geen gok):** rollen adviseur en eigen specialist (nog steeds geen
enkele automatische knoppentest-run heeft deze gedekt — blijft prioriteit voor een volgende rotatie);
sectoren handel/consultancy/verhuizingen/mkb/itsoftware/accountancy (dit keer niet aan de beurt);
concurrency/race-conditions op de meekijker-module (het bestaande, al gedocumenteerde
`genViewerCode()`-race-fix van 15 sep is niet opnieuw belast — geen nieuwe aanleiding, werkregel 40
test-economy); viewer.html zelf niet in de browser doorgeklikt (alleen de backend-API die de frontend
aanroept is functioneel getest) — de frontend is een dunne laag over exact deze endpoints (bevestigd
door de broncode van `viewer.html` te lezen), dus dit is een bewuste, beargumenteerde keuze, geen gok;
rate-limiting op `/mna/viewer/*` (15/10min) niet uitgeput getest (zou 15+ aanroepen vergen voor geen
nieuwe informatie boven wat de code al aantoont — werkregel 40).

**Score aan marilyn:** 100 — geen bevindingen binnen de geteste combinatie vandaag. Dit betekent
uitdrukkelijk niet dat het platform foutloos is, alleen dat deze specifieke combinatie (meekijker/
zorg/Opvolging/Financieel+Juridisch) geen fout aan het licht bracht.

**Opmerking working tree:** bij aanvang stonden `bedrijfsscan-start.html` (gewijzigd) en zeven
ongecommitte `BATCH3*`-patchbestanden op de repo-root — niet aangeraakt door deze routine, lopend
handwerk van Marcel/een eerdere sessie.

## 2026-09-14

**wekelijkse-audit (geautomatiseerde scheduled task) — alles groen, niets gewijzigd.**
1. Syntax-check: `node --check` op de canonieke worker (`~/Documents/GitHub/koersvoormorgen-backend/backend/cloudflare-worker.js`) en op alle `mna/*.js`-modules in deze repo — allemaal OK.
2. `node tests/audit-consistentie.mjs` — alle 15 checks (veldreferenties, functie-shadowing, begeleiderAuth-scoping, koper-afscherming, SELECT *-audit, traject-verwijder-cascade, gevoelige-termen, dealvoorstel publiek/intern-scheiding, bgDoc-clausule-integriteit, kleurcontrast, load-bearing pagina's, AI-guardrails, reliance-voettekst, NDA/LoI/MOU-documentcontent-race, bgDocSpa-route): "Geen bevindingen".
3. `node tests/e2e-api.mjs` — geen `ADMIN_KEY` in deze sessie-omgeving, dus alleen health-check + toegangscode-weigering getest (stappen 3-9 overgeslagen). 4 geslaagd, 0 gefaald, 1 overgeslagen. Worker live en gezond (`/health` → 200, `ok:true`).

**Bevindingen:** geen.

**Zelfstandig opgelost:** niets nodig — geen bevindingen.

**Wacht op Marcel's akkoord:** niets.

## 2026-09-11

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg. Laatste diepe audit: 6 september 2026, score 73/100 (5 dagen geleden) — ruim binnen de 25-dagen-cadans; vandaag (11e) valt bovendien buiten het 1e-3e-van-de-maand-venster. Geen zelf-aanvraag ingediend, geen audit uitgevoerd, niets gewijzigd.

## 2026-09-05

**diepe-audit-routine (geautomatiseerde scheduled task) — begrensde ronde, aanvraag `AV1788511737513KK4F`.** Volledig rapport: https://claude.ai/code/artifact/2f9b1e77-bba2-47ac-ad50-5a03c2595862 (ook toegevoegd aan `AUDIT-STANDAARD.md`-logboek). Score 67/100 (van 64 op 24 aug). Alle harde checks groen: `node --check` (worker + 20 backend-modules + 7 mna-modules), `audit-consistentie.mjs` 9/9, backend `audit-backend.mjs` 5/5, `policy-equivalentie.mjs` 54/54, `legal/retention/test/retention.test.mjs` 16/16, `e2e-api.mjs` 44/44 (3 ovg: AI/e-mail), `e2e-crosspath-fixes.mjs` 72/72, en acht `scripts/validate-*.mjs`-rekenkernchecks samen 282/282 — totaal 482/482, 0 gefaald. Diff-review sinds de vorige volledige audit (24 aug) gaf: forse rekenkern-uitbreiding (BATNA/walk-away, ZOPA, ruilverhouding, bod-vergelijker — `mna/03` +1038 regels, `mna/04` +463 regels), volledig gedekt door de validatiescripts hierboven; Cliëntacceptatie/Wwft-bevestigingsveld, VOK-canonieke-bron, matching-akkoordverklaring toegevoegd; geen nieuwe tabel buiten bestaande cascade-dekking. Eén P4-aandachtspunt (niet-beschrijvende rekenkern-commitberichten, geen functionele fout) + één niet-uitgevoerde check (`check-dealvoorstel-output.mjs`/`check-contract-output.mjs` vereisen een vers gegenereerd document — kosten, bewust overgeslagen in deze onbeheerde ronde; aanbeveling: handmatig draaien op het eerstvolgende dealvoorstel met de nieuwe module). Laatste volledige AUDIT-STANDAARD.md-ronde 24 aug (11 dagen) — binnen cadans, geen acute aanbeveling; wel kandidaat voor een vervroegde `/code-review ultra` gezien de omvang van de rekenkern-wijziging. Terugmelding aan de worker gedaan (aanvraag op 'klaar'); git-push nog nodig door Marcel (geen credentials in deze sessie).

**Vervolg, zelfde dag — score gecorrigeerd 67→65, na Marcels navraag "waarom open punten niet opnieuw getest?".** Terecht punt: de 67 nam aan dat de 24-augustus-bevindingen grotendeels waren opgelost, zonder dat opnieuw te checken. Alle 24 P1-P4-items uit die audit nu voor het eerst één voor één met bewijs herverifieerd (grep/berekening/logbestand) en vastgelegd in het nieuwe blijvende register `OPEN-BEVINDINGEN.md`: 8 aantoonbaar gefixt, 3 gedeeltelijk/terugkerend (opvallend: de dagelijkse D1-backup faalt nog steeds af en toe — laatste mislukte poging de nácht vóór deze audit, nog geen mailalert; `--muted`-kleurcontrast meermaals aangepast maar nog steeds onder de WCAG-AA-grens op meerdere plekken, ook in de gloednieuwe marketing-site-CSS), 9 nog volledig open (o.a. matching-wachtwoord buiten de rate-limiter, foreign keys niet in de broncode, N+1-query matching-overzicht, dode `marketing_prijs`-kolom), 2 wachten op Marcels keuze. Score dus 65/100.

**Tweede vervolg, zelfde dag — score nogmaals gecorrigeerd 65→68, ditmaal wegens twee eigen verificatiefouten.** Marcel zei "ja" op het aanbod de twee resterende P2's (matching-wachtwoord-rate-limiter, foreign-keys-niet-in-broncode) zelfstandig te fixen. Bij het daadwerkelijk willen doorvoeren bleken **beide allang opgelost**: (1) de grep zocht op `function matchingAuthOk` terwijl de code `const matchingAuthOk = async (req) => {}` gebruikt — vond niets, verkeerd gelezen als "geen limiter"; `matchingAuthOk()` deelt al sinds 24 aug een 10/uur-ratelimiet met `/mna/matching/login`. (2) `grep -c "FOREIGN KEY"` gaf letterlijk `cloudflare-worker.js:20` terug maar is fout gelezen als "0 treffers" — `initDB()` bevat 20 CREATE TABLE-statements met `FOREIGN KEY ... ON DELETE CASCADE`, dekt alle 19 gemigreerde tabellen (de 2 "ontbrekende" tabelnamen bleken vestigiaal, nooit gebouwd, expliciet gedocumenteerd in de code). Bijvangst: de marilyn-modals-telling (P2-11) was zelf te grof, blijkt 1 van minstens 7 modals te zijn i.p.v. 1 van ~4 — dat punt is dus eerder erger dan beter dan eerder gemeld. Netto na correctie: 10 gefixt, 3 gedeeltelijk, 7 open, 2 wacht-op-Marcel, 2 niet gecontroleerd. Score 68/100. Geen van beide P2's is alsnog gefixt — er was niets te fixen. **Nieuwe vaste regel:** elke audit — ook deze begrensde scheduled-task-routine — doorloopt voortaan verplicht `OPEN-BEVINDINGEN.md` en laat het cijfer zichtbaar bewegen op basis van wat daarin verandert (vastgelegd in zowel `AUDIT-STANDAARD.md` als de scheduled-task-instructie zelf). Rapport-artifact bijgewerkt: https://claude.ai/code/artifact/2f9b1e77-bba2-47ac-ad50-5a03c2595862. Worker-melding met het gecorrigeerde cijfer opnieuw verstuurd.

## 2026-09-02

**diepe-audit-routine (geautomatiseerde scheduled task):** kon niet draaien. `AUDIT_TRIGGER_KEY` ontbreekt in de omgeving (`~/.zshrc`), dus de audit-wachtrij (`GET /mna/veiligheid/audit-opdracht`) is niet leesbaar — geen manier om te bepalen of er een openstaande "Draai diepe audit nu"-aanvraag is. Aanvullend: de `ADMIN_KEY` uit `~/.zshrc` geeft `Unauthorized` op `/mna/admin/veiligheid/overzicht`, dus de fallback-route (laatste diepe-auditdatum ophalen voor de maandcadans-check) werkt ook niet. Worker zelf is gezond (`/health` → 200). **Actie Marcel:** `export AUDIT_TRIGGER_KEY=...` in `~/.zshrc` zetten met dezelfde waarde als de Cloudflare-secret; controleren of de `ADMIN_KEY`-waarde in `~/.zshrc` nog klopt (roteren indien nodig). Geen audit uitgevoerd, geen bevindingen, niets gewijzigd behalve deze logregel.

**Vervolg 2026-09-03:** `AUDIT_TRIGGER_KEY` opnieuw gegenereerd (`openssl rand -hex 32`) en gezet als Cloudflare-secret op productie én staging (`wrangler secret put`); dezelfde waarde in `~/.zshrc`. Geverifieerd: `GET /mna/veiligheid/audit-opdracht` → `{"ok":true,"opdracht":null}` op beide omgevingen, foute sleutel → 401. Wachtrij dus weer leesbaar, geen openstaande aanvraag. `AUDIT_TRIGGER_KEY` bewaakt alléén de twee audit-wachtrij-routes (`worker/24-veiligheidsdashboard.js`); marilyn's knop gebruikt `ADMIN_KEY` — niets anders geraakt. **Blijft openstaan:** `ADMIN_KEY` in `~/.zshrc` (regel 5, nu met waarschuwcomment) klopt nog steeds niet — 401 op prod én staging. Marcel moet die vervangen door zijn marilyn-inlogcode.

**Afgerond 2026-09-03 (2e sessie):**
- `ADMIN_KEY` in `~/.zshrc` rechtgezet: Marcels sleutel bevat `&`-tekens en stond zonder quotes → shell knipte de regel op (`ADMIN_KEY` werd maar `7EQ`). Nu tussen enkele quotes. **Werkt op productie** (`/mna/admin/lijst` → 200). Staging-`ADMIN_KEY` is een andere waarde en werkt hier nog niet (401) — alleen relevant voor het losse `~/Desktop/test-proef-staging.sh`, niet voor de audit-routine.
- Diepe-audit-status opgehaald via prod (`/mna/admin/veiligheid/overzicht`): laatste volledige diepe audit was **24 augustus 2026, score 64** (7e heraudit) — dus de maandcadans is NIET over tijd (10 dagen geleden). Geen zelf-aanvraag ingediend (Stap 1b-voorwaarde ">25 dagen" niet gehaald).
- Eén audit-aanvraag stond sinds **1 september 2026** vast op status `bezig` (opgehaald 16:41, nooit `afgerond` — een eerdere runner had de sleutel nog wél en is halverwege gestopt). De backend heeft geen stale-timeout, dus die rij blokkeerde permanent nieuwe "Draai diepe audit nu"-aanvragen. Rij `AV1788277493818I2ZF` verwijderd uit `security_diepe_audit_verzoek` (prod D1) — géén `diepe_audit_log`-regel toegevoegd (er is niets uitgevoerd). Wachtrij nu leeg; knop werkt weer.
- **Backend-gap gesignaleerd (geen fix zonder Marcels akkoord):** `security_diepe_audit_verzoek` kent geen verval/timeout op `bezig`-aanvragen en geen reset-endpoint — een gecrashte runner blokkeert de knop voor onbepaalde tijd. Aanbeveling: bij het oppikken (`GET /audit-opdracht`) ook `bezig`-rijen ouder dan bijv. 6 uur als verlopen behandelen, of een admin-reset toevoegen.
- **Aandachtspunt cloud-routine:** als er náást deze lokale scheduled task nóg een audit-runner bestaat met de oude `AUDIT_TRIGGER_KEY` in z'n eigen config (bijv. een claude.ai-routine — de worker-comment noemt "routine-config bij Anthropic"), dan is die door de sleutelrotatie afgesneden en moet daar de nieuwe waarde in. De vastgelopen `bezig`-rij van 1 sep wijst erop dat zo'n runner mogelijk bestaat maar al onbetrouwbaar was.

**Taak B — proefaccount-goedkeuring op staging (los verzoek, `~/Desktop/test-proef-staging.sh`):** staging had een andere `ADMIN_KEY` dan productie; op Marcels keuze ("optie 1") de staging-secret gelijkgezet aan die van productie (`wrangler secret put ADMIN_KEY --env=staging`) — staging bevat alleen testdata. Script gedraaid: sleutelcheck OK (200), maar de doelaanvraag `gktest+stg@example.com` (`PAMTKL3NEI1SPZ`) was al `goedgekeurd` uit een eerdere run, dus het script stopte netjes vóór de goedkeur-stappen. Idempotentie apart gecontroleerd: nogmaals `POST …/besluit {"besluit":"goedkeuren"}` → `{"ok":true,"herhaald":true,"gebruiker_id":"G1788384100946REC6"}`, `behandeld_at` onveranderd, en `bf_gebruikers` (staging) bevat exact **1** rij voor dat e-mailadres (`proef=1`, `proef_status='actief'`, `traject_limiet=1`). Idempotentiegarantie werkt dus: herhaald goedkeuren maakt geen tweede account. De twee écht openstaande aanvragen (`previewtest+stg`, `proeftest+stg`) bewust niet goedgekeurd (zou testaccounts + activatiemails aanmaken).

**Vervolg 2026-09-03 (3e sessie) — de twee openstaande aandachtspunten opgepakt:**

*Punt 1 — backend-gap "vastgelopen `bezig`-aanvragen" GEFIXT (backend-repo commit `27aeff0`, staging + productie live).* `worker/24-veiligheidsdashboard.js`: constante `AUDIT_VERZOEK_STALE_MS = 6 uur`. `GET /mna/veiligheid/audit-opdracht` pakt nu ook een `bezig`-rij op waarvan `opgehaald_op` > 6 uur oud is (of `NULL`); de bestaande `UPDATE … SET opgehaald_op=now` herstempelt 'm, dus een net-herpakte rij telt niet meteen weer als verlopen. `POST …/diepe-audit/aanvragen` (marilyn-knop): een verlopen `bezig`-rij blokkeert géén nieuwe aanvraag meer; verse rijen (< 6 uur) en `open`-rijen blokkeren wél (10-min-rate-limit intact). `POST …/afronden`: guard tegen een dubbele `security_diepe_audit_log`-regel als twee runners dezelfde herpakte aanvraag afronden → `{ok:true, al_afgerond:true}`. **Getest op staging** (rijen daarna opgeruimd, staging weer 0/0): verlopen rij van 7 u + rij met `opgehaald_op=NULL` worden opgepakt en herstempeld; verse rij van 10 min niet en blokkeert een nieuwe aanvraag; dubbel afronden → geen 2e logregel; lege wachtrij en verse `open`-rij ongewijzigd gedrag. `e2e-api` 45/0 (3 AI/e-mail overgeslagen), `e2e-crosspath-fixes` 72/0, statische audits front + back "geen bevindingen". Prod-smoke na deploy: `/health` 200, `audit-opdracht` `{ok:true,opdracht:null}`, wachtrij 0 rijen.

*Punt 2 — tweede audit-runner: onderzocht, kan niet vanaf deze Mac worden afgerond.* Op deze Mac draaien 3 Claude Code scheduled tasks (`kantoorinzicht-diepe-audit-routine` dagelijks 06:07, `-wekelijkse-audit` ma 07:17, `-maandelijkse-todo` 1e vd maand). Alleen de eerste gebruikt `AUDIT_TRIGGER_KEY`, en die leest 'm nu uit `~/.zshrc` (gefixt). De vastgelopen `bezig`-rij van 1 sep 16:41 UTC kan NIET van deze taak zijn geweest (draait 06:07, en de taak bestond op 1 sep om 16:41 nog niet — map aangemaakt ~18:16). Iets ánders had toen de oude sleutel — vrijwel zeker de claude.ai-cloud-routine die de worker-comment beschrijft ("routine-config bij Anthropic"). **Actie Marcel:** kijk in je claude.ai-routines of daar nog een routine staat die `/mna/veiligheid/audit-opdracht` pollt. Zo ja: óf verwijderen (aanrader — twee runners naast elkaar racen om dezelfde aanvraag; dat is waarschijnlijk precies wat de vastloper van 1 sep veroorzaakte, en de Mac-taak dekt de job nu volledig), óf de nieuwe `AUDIT_TRIGGER_KEY` (staat in `~/.zshrc` regel 7) in de routine-config zetten. Zolang dit niet is nagekeken: een claude.ai-routine met de oude sleutel krijgt sinds de rotatie 401 op elke poll — hinderlijk maar niet gevaarlijk.

*Punt 2 — bevestigd via screenshots (Marcel, 3 sep):* de cloud-routine **"KantoorInzicht Diepte Audit"** (dagelijks 11:00 GMT+2) is inderdaad de tweede runner, maar zit al sinds ± 23 aug vast op `EGRESS_BLOCKED` / 403 — het cloud-environment mag `*.workers.dev` niet bereiken (organisatiebeleid egress-proxy). Dezelfde blokkade treft de cloud-routine "waarderingsmodel — maandelijkse marktdata-check" (ook naar `accountant.nl` / `accountancyvanmorgen.nl`). Die routines doen dus feitelijk niets. **Keuze Marcel:** egress-allowlist van dat environment uitbreiden met die domeinen, óf beide cloud-routines verwijderen nu de lokale Mac-taken het werk doen. Blijft een actie in de Routines-UI, geen code.

**Feature op verzoek (Marcel, 3 sep) — proefaanvragen definitief kunnen verwijderen:** `marilyn.html` → tab **Proefaanvragen** kreeg per rij een rode "🗑 Verwijderen"-knop met harde bevestiging ("kan niet ongedaan worden gemaakt"); bij een goedgekeurde aanvraag noemt de dialoog expliciet dat het gekoppelde proefaccount blijft bestaan. Backend: nieuw admin-endpoint `POST /adviseur/proef/aanvraag/{id}/verwijderen` in `worker/25-adviseur-proef.js` (zelfde `adminOk()` als goedkeuren/afwijzen). Verwijdert **alleen** de rij uit `adviseur_proef_aanvragen`; een eventueel al aangemaakt proefaccount (`gebruiker_id`) blijft bestaan en wordt in de respons genoemd (`account_behouden`) — bewust geen stille cascade naar `bf_gebruikers` (die beheert Marcel via Gebruikers/€ Tarieven). Getest op staging: aanmaken via publieke endpoint → verwijderen met key `{ok:true}`; zonder key 401; onbekend id 404; GET i.p.v. POST valt door (geen delete); goedgekeurde aanvraag → rij weg, `bf_gebruikers`-account intact + `account_behouden` gevuld. Statische audits front + back "geen bevindingen", `e2e-api` 45/0. Backend live op staging + productie (prod-smoke groen na propagatie: 401/404/GET-doorval correct, bestaande productie-aanvraag ongemoeid). Commits: backend `4a7e8dd`, frontend `f5428b6` (beide door Marcel gecommit + gepusht). **Niet geraakt / bewust niet:** `adv.html` (marilyn-only, geen platformgebruiker-functie — werkregel 6 n.v.t.); handleiding `mna/08` + `adv.html` (werkregel 10 — dit is een marilyn-adminfunctie, niet gebruikersgericht); AV/VOK/privacyverklaring (werkregel 17 — de mogelijkheid om aanvraagdata te wissen is dataminimalisatie-positief, verandert niets aan wat verzameld/verwerkt wordt, geen nieuwe module/prijs → geen wijziging nodig). **Aandachtspunt gebruiker:** frontend-wijziging staat live zodra GitHub Pages herbouwt (~1-2 min); hard-refresh (Cmd+Shift+R) in marilyn nodig.

**Release-gate review (Marcel, 3 sep) — besluit: GO.** Scope: auth, autorisatie/rollen, cross-tenant, documenttoegang, IDOR/object-level, upload/download, intrekken, unauth-API-data, A→B-datazichtbaarheid, bedrijfsscan/contactflows. Bewijs: 7 data-/admin-endpoints zonder key → 401; `e2e-crosspath-fixes` 72/0 (kopercode/verkoperscode geweigerd op begeleider-endpoints, `/mna/versie/{id}` IDOR → 403, geen existence-oracle, F8/F11/F13-muur, pre-NDA geen verkopersidentiteit); `e2e-api` 45/0 (rol-login, gefaseerde koper-toegang + intrekken, AVG-cascade incl. meekijker); prod-selfcheck 10/10. Geen P0/P1 gevonden. **Wel gevonden en meteen gefixt (backend `49ce896`, frontend `7b9ac7e`, staging + productie live):**
- *Bedrijfsscan-rapport capability-URL (`GET /rapport/{code}`).* (a) `GET /rapport/` zónder code gaf via `WHERE scan_id = ''` een willekeurig rapport zonder scan_id terug (naam + e-mail + adviestekst) — op productie momenteel latent (0 rijen met lege scan_id, gaf 404), maar armbaar zodra één zo'n rij ontstaat. (b) codes kwamen uit `Math.random().slice(2,10)` (8 tekens), zonder rate-limit op de GET, respons was `SELECT *`. Fixes: min. codelengte 8 vóór DB-lookup + `scan_id != ''` in de fallback (sluit a af); nieuwe codes via `veiligeCode(10)` CSPRNG (zelfde fix als de scan-groepscodes op 17 aug); rate-limit 40/10 min per IP op de GET (best-effort per-isolate, zoals de rest). Bestaande 8-teken codes blijven werken (geen regressie op gedeelde links). Getest staging + prod: leeg/kort → 404, geldige code → 200 + data (resume-flow intact), nieuwe code 10 tekens, bestaand prod-rapport nog opvraagbaar. e2e-api 45/0, statische audits front + back groen.
- *Zichtbare build-stamp `27 May 10:45`* rechtsonder op de publieke bedrijfsscan verwijderd (`bedrijfsscan-start.html`).

**Nog open na livegang (P2/P3, geen blockers):** (1) rate-limiter is per-isolate, niet edge-breed — bekende, gedocumenteerde beperking van álle limiters in deze codebase; Cloudflare bot/DDoS-bescherming is de backstop. (2) portaal-HTML (mna/adv/marilyn) op GitHub Pages heeft geen X-Frame-Options/CSP-header (GH Pages kan geen headers zetten); clickjacking van een ingelogde adviseur is theoretisch, kleine gebruikersgroep, tokens niet ambient — JS frame-buster is optioneel. (3) diverse niet-opzoekbare id's in de scantool (callbacks, contact, `rapport_usage`) gebruiken nog `Math.random()` — hygiëne, geen risico.

## 2026-08-31

**Uitgevoerd:**
1. Syntax-check: `node --check` op de canonieke worker (`~/Documents/GitHub/koersvoormorgen-backend/backend/cloudflare-worker.js`) en op alle `mna/*.js`-modules in deze repo — allemaal OK.
2. `node tests/audit-consistentie.mjs` — alle 7 checks (veldreferenties, functie-shadowing, begeleiderAuth-scoping, koper-afscherming, SELECT *-audit, traject-verwijder-cascade, gevoelige-termen-check): "Geen bevindingen".
3. `node tests/e2e-api.mjs` — geen ADMIN_KEY in deze sessie-omgeving, dus alleen health-check + toegangscode-weigering getest (stappen 3-9 overgeslagen). 4 geslaagd, 0 gefaald, 1 overgeslagen. Worker live en gezond (`/health` → 200, `ok:true`).

**Bevindingen:** geen. Alles groen.

**Zelfstandig opgelost:** niets nodig — geen bevindingen.

**Wacht op Marcel's akkoord:** niets.

## 2026-08-24

**Uitgevoerd:**
1. Syntax-check: `node --check` op de canonieke worker (`~/Documents/GitHub/koersvoormorgen-backend/backend/cloudflare-worker.js`) en op alle `mna/*.js`-modules in deze repo.
2. `node tests/audit-consistentie.mjs` (veldreferenties, functie-shadowing, begeleiderAuth-scoping, koper-afscherming, SELECT *-audit, traject-verwijder-cascade, gevoelige-termen-check — 7 checks).
3. `node tests/e2e-api.mjs` — geen ADMIN_KEY beschikbaar in deze sessie, dus alleen health-check en toegangscode-weigering getest (stappen 3-9 overgeslagen).

**Bevindingen:** geen. Alle syntax-checks slagen, consistentie-audit geeft "Geen bevindingen" op alle 7 checks, health-check en basis-API-tests slagen (4 geslaagd, 0 gefaald, 1 overgeslagen wegens ontbrekende key).

**Zelfstandig opgelost:** niets nodig — geen bevindingen.

**Overig:** de SKILL.md van deze scheduled task verwijst inmiddels correct naar de backend-repo als canonieke bron (het aandachtspunt uit de 2026-08-17-run is kennelijk al verwerkt) — geen actie nodig.

**Wacht op Marcel's akkoord:** niets.

## 2026-08-17

**Uitgevoerd:**
1. Syntax-check: `node --check` op de canonieke worker (`~/Documents/GitHub/koersvoormorgen-backend/backend/cloudflare-worker.js` + alle `worker/*.js`-modules) en op alle `mna/*.js`-modules in deze repo.
2. `node tests/audit-consistentie.mjs` (veldreferenties, functie-shadowing, begeleiderAuth-scoping, koper-afscherming, SELECT *-audit, traject-verwijder-cascade, gevoelige-termen-check — 7 checks).
3. `node tests/e2e-api.mjs` — geen ADMIN_KEY beschikbaar in deze sessie, dus alleen health-check en toegangscode-weigering getest (stappen 3-9 overgeslagen).

**Bevindingen:** geen inhoudelijke bevindingen. Alle syntax-checks slagen, consistentie-audit geeft "Geen bevindingen" op alle 7 checks, health-check en basis-API-tests slagen (4 geslaagd, 0 gefaald, 1 overgeslagen wegens ontbrekende key).

**Zelfstandig opgelost:** niets nodig — geen bevindingen.

**Aandachtspunt voor Marcel (proces, geen platformbug):** de instructietekst van deze scheduled task (stap 1) verwijst nog naar de oude workflow — kopiëren van `~/Downloads/cloudflare-worker.js` naar `backend/cloudflare-worker.js` in déze repo. Die situatie bestaat niet meer: `backend/` is op 23 juli verplaatst naar de aparte private repo `koersvoormorgen-backend`, en sinds 25 juli is die backend-repo zelf canoniek (`~/Downloads` speelt geen rol meer, zie het geheugen `reference_worker_buiten_git`). Ik heb dit run zelfstandig aangepast (rechtstreeks `node --check` op de backend-repo uitgevoerd, geen kopieerstap), maar de SKILL.md van deze scheduled task zelf is niet bijgewerkt — dat vereist een bewuste aanpassing van de taakdefinitie, die ik hier niet zelfstandig doe. Wil je dat ik die bijwerk?

**Wacht op Marcel's akkoord:** alleen bovenstaand aandachtspunt (SKILL.md van de scheduled task bijwerken naar de huidige backend-repo-workflow). Verder niets.

## 2026-07-22

**Uitgevoerd:**
1. Sync `~/Downloads/cloudflare-worker.js` → `backend/cloudflare-worker.js` + `node --check` op worker en alle `mna/*.js`-modules.
2. `node tests/audit-consistentie.mjs` (veldreferenties, functie-shadowing, begeleiderAuth-scoping, koper-afscherming, SELECT *-audit).
3. `node tests/e2e-api.mjs` — geen ADMIN_KEY beschikbaar in deze sessie, dus alleen health-check en toegangscode-weigering getest (stappen 3-9 overgeslagen).

**Bevindingen:** geen. Alle syntax-checks slagen, consistentie-audit geeft "Geen bevindingen" op alle 5 checks, health-check en basis-API-tests slagen (4 geslaagd, 0 gefaald, 1 overgeslagen wegens ontbrekende key).

**Zelfstandig opgelost:** niets nodig — geen bevindingen.

**Wacht op Marcel's akkoord:** niets.

## 2026-09-05 (vervolg) — achtste volledige AUDIT-STANDAARD.md-heraudit

Op Marcels expliciete verzoek gedraaid dezelfde dag als de begrensde routine-ronde hierboven — vijf onafhankelijke parallelle deelaudits (subagents). Score **58/100** (van 64 op 24 aug), bewust geen gemiddelde van de 15 deelscores. Financiële correctheid steeg naar 92/100 (hoogste ooit) en M&A-functionaliteit naar 86/100 — maar twee NIEUWE kritieke bevindingen wegen zwaarder: (1) `/mna/chat/{code}` laat een koper het verkoper↔begeleider-gesprek lezen én zich voordoen als begeleider (`backend/worker/17-mna-chat.js:6-31`, exact het cross-rol-lekpatroon dat dit platform al vaker trof), en (2) CI staat al 50+ runs / 5+ dagen rood op de zwaarste teststap (e2e tegen staging), onopgemerkt. 5 P2's + 6 P3's + 6 P4's, zie het volledige rapport. Volledig artifact: https://claude.ai/code/artifact/ba7699ae-3e02-4782-9ef3-52285402d76b. Beide P1's wachten op Marcels akkoord vóór zelfstandige fix (auth-wijziging resp. CI-diepgraving, werkregel 19). Gelogd in `AUDIT-STANDAARD.md`.

## 2026-09-05 (vervolg 2) — beide P1's uit de achtste heraudit gefixt

**P1-25 (chat-datalek):** opgelost + uitgebreid tot een nieuwe feature op Marcels verzoek — koper en verkoper hebben nu elk een eigen, gescheiden gesprek met de begeleider (nieuwe `kanaal`-kolom op `mna_chat`, rol server-side bepaald via `resolveRol()`, `auteur` nooit meer uit de request-body). 9 nieuwe regressiechecks (NF-1) in `tests/e2e-crosspath-fixes.mjs`, 81/81 groen tegen productie. Gedeployed op staging + productie. Handleiding bijgewerkt (mna/08 + adv.html).

**P1-26 (CI rood):** bleek geen functionele bug — `STAGING_ADMIN_KEY` in GitHub Actions kwam niet meer overeen met de daadwerkelijke `ADMIN_KEY` op staging in Cloudflare (elke falende check was "Unauthorized" vanaf de eerste admin-aanroep, bevestigd via de daadwerkelijke CI-log die Marcel handmatig deelde — logdownload zelf bleek geen GitHub-token beschikbaar in deze sessie). Marcel heeft beide kanten zelf gelijkgetrokken met een nieuwe waarde. Deze commit triggert de eerstvolgende CI-run als verificatie.

Beide P1's uit `OPEN-BEVINDINGEN.md` staan nu op 🟢.

## 2026-09-06 — diepe-audit-routine (scheduled task)

diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken. Wachtrij gepolld
(`GET /mna/veiligheid/audit-opdracht` → HTTP 200, `{"ok":true,"opdracht":null}`). Vandaag is de 6e
dag van de maand (maandelijkse cadans-trigger is 1e–3e), en de achtste volledige AUDIT-STANDAARD.md-
heraudit is gisteren (5 sep) nog gedraaid — geen zelf-aangevraagde ronde nodig. Geen begrensde ronde
uitgevoerd, geen wijzigingen.

Procesnotitie: `AUDIT_TRIGGER_KEY`/`ADMIN_KEY` stonden niet in de omgeving van de scheduled-task-shell;
wel in `~/.zshrc` (na `source` werkte de poll). `~/.zshrc` bevat meerdere conflicterende `export`-regels
voor beide sleutels (regels 6–10); de laatst-winnende waarde is voor `ADMIN_KEY` én `AUDIT_TRIGGER_KEY`
identiek — ziet eruit als een bewerkingsfout. Niet zelf aangepast (credential-config van Marcel).

## 2026-09-06 — root cause van de e2e-flakiness bevestigd: gedeeld rate-limit-budget met productie

Marcels eigen `git push` faalde op 5 (niet 1) UI-tests tegelijk — alle vijf tests die een echte login op de test-traject nodig hebben. Direct gereproduceerd: dezelfde volledige suite gaf bij mij, kort erna, gewoon 18/18 groen. Root cause bevestigd: `mna.html` praat standaard altijd met de LIVE productie-worker (`WORKER`-constante in `mna/01-config-sectorprofielen.js`, geen `?worker=`-override in `tests/e2e-ui.spec.js`), en de login-rate-limiter (`checkLoginLimit`, 15 pogingen/10 min per IP, `cloudflare-worker.js`) is een in-memory Map per Worker-instantie — dus gedeeld tussen ALLE verkeer naar productie vanaf hetzelfde IP, inclusief elke handmatige `e2e-api.mjs`/`e2e-crosspath-fixes.mjs`/Playwright-run die een sessie als vanavond (veel deploys, veel testruns, allemaal vanaf hetzelfde Mac-IP) toevallig kort ervoor heeft gedraaid. Dit is geen productiebug — de rate-limiter doet precies waarvoor hij bedoeld is (anti-brute-force op de trajectcode) — maar wel een test-infrastructuurgebrek: de pre-push-hook-testsuite deelt ongewild hetzelfde budget als reëel verkeer én handmatig testwerk.

Structurele fix (nog niet uitgevoerd, genoeg bewegende delen voor een eigen sessie): de Playwright-suite tegen staging laten praten i.p.v. productie. Vereist: (1) een `?worker=<staging-url>`-override bij elke test-navigatie of een globale `page.route()`-interceptie, (2) de Node-side `api()`-testhelper (buiten de browser om, voor `beforeAll`-setup) een eigen staging-basis-URL geven, (3) `STAGING_ADMIN_KEY` i.p.v. `ADMIN_KEY` gebruiken voor die admin-setup-calls. Staging heeft een volledig eigen, geïsoleerde rate-limit-teller (aparte Worker-instantie), dus dit sluit het probleem structureel uit i.p.v. het toevallig te vermijden.

Advies voor nu: bij een pre-push-testfaling die specifiek de "eigen testtraject"-tests raakt (regel 322/331/374/431/520 in tests/e2e-ui.spec.js), eerst een paar minuten wachten en opnieuw proberen vóór er verder onderzocht wordt — dit patroon is nu tweemaal onafhankelijk bevestigd (5 sep en 6 sep 2026).

---

**2026-09-07 — diepe-audit-routine (scheduled task):** geen open aanvraag in de wachtrij; maandelijkse cadans nog niet verstreken (vandaag is de 7e, cadans-venster is dag 1-3). Geen audit-ronde gedraaid. Check draaide wel.

## 2026-09-07 — wekelijkse-audit (scheduled task)

**Uitgevoerd:**
1. `node --check` op `~/Documents/GitHub/koersvoormorgen-backend/backend/cloudflare-worker.js` + alle 30 `worker/*.js`-modules + alle 8 `mna/*.js`-modules — allemaal OK.
2. `node tests/audit-consistentie.mjs` — 10/10 checks groen, "Geen bevindingen". Check 10 (WCAG-kleurcontrast, terugkerend probleem P1-4) haalt nu alle tekst/oppervlak-combinaties ≥ 4,5:1.
3. `node tests/e2e-api.mjs` — geen ADMIN_KEY in deze sessie-omgeving, dus alleen stap 1-2 (health 200 + ok:true, onbekende toegangscode → 404 + foutmelding): 4 geslaagd, 0 gefaald, admin-afhankelijke stappen 3-9 overgeslagen (verwacht, geen fout).

**Herverificatie open P1-bevindingen (OPEN-BEVINDINGEN.md), voor zover binnen de scope van deze begrensde ronde:**
- **P1-1** (CI YAML-fout) — 🟢 bevestigd: `.github/workflows/checks.yml` gebruikt `env.STAGING_ADMIN_KEY` + expliciete "Audit-fix P1"-commentaarregel aanwezig.
- **P1-3** (koperkaarten toetsenbord) — 🟢 bevestigd: `.buyer-card` heeft `tabindex="0" role="button" aria-pressed aria-label` + Enter/Spatie-keydown-handler + `:focus-visible`-outline in `matching-platform.html`.
- **P1-4** (`--muted` WCAG AA, 3× eerder teruggekeerd) — 🟢 bevestigd: audit-consistentie check 10 (geautomatiseerde contrastberekening) draait mee en is groen.
- **P1-25** (chat-datalek) / **P1-26** (CI rood) — 🟢 volgens de fixronde van 5 sep (niet opnieuw end-to-end getest deze ronde; geen ADMIN_KEY/GitHub-token).
- **P1-2** (dagelijkse D1-backup faalt intermitterend, geen mailalert) — **blijft 🟡.** Update uit `~/Library/Logs/kantoorinzicht-backup.log`: de twee meest recente geplande runs zijn wél geslaagd (5 sep 86 tabellen, 6 sep 87 tabellen); de laatste mislukte run was de nacht van 4→5 sep (Cloudflare API-export-fout, exitcode 1). Het faalpatroon (26/28/30 aug, ~4 sep) is dus nog niet weg en er is nog steeds geen alert. De aanbevolen fix (wrangler op een API-token i.p.v. OAuth voor de launchd-context + mailalert bij een faalrun) raakt credentials → **wacht op Marcels akkoord**, ongewijzigd t.o.v. 5 sep.

**Bevindingen:** geen nieuwe. Alle harde checks groen.

**Zelfstandig opgelost + gedeployed:** niets nodig — geen bevindingen.

**Wacht op Marcels akkoord:** alleen het bestaande, al gerapporteerde P1-2-actiepunt (backup-authenticatie OAuth → API-token + mailalert). Geen nieuwe punten.

---

**2026-09-08 — diepe-audit-routine (scheduled task):** wachtrij gepolld (`GET /mna/veiligheid/audit-opdracht` → `{"ok":true,"opdracht":null}`), geen open "Draai diepe audit nu"-aanvraag. Maandelijkse cadans niet van toepassing: vandaag is de 8e, het cadans-venster is dag 1-3 van de maand. Geen audit-ronde gedraaid. Check draaide wel; worker gezond. Niets gewijzigd behalve deze logregel.

---

**2026-09-08 — productie-incident (door Marcel gemeld tijdens de diepe-audit-sessie):** adviseur-activatie stuk.
`registreer.html` was bij het herontwerp van 1 sep (commit `93495bf`) vervangen door een redirect-stub naar
`/platform/voor-adviseurs`. Elke adviseur die na 1 sep op de activatie-/resetlink in zijn uitnodigings- of
proefaccountmail klikte kwam op een marketingpagina terecht i.p.v. het wachtwoord-instelscherm — lus zonder
toegang. Blast radius: proefaccount-activatie (`worker/25-adviseur-proef.js:196`), gewone adviseur-uitnodiging
(`worker/09-gebruikersbeheer.js:53`) én wachtwoord-reset (`:85`). Bewezen slachtoffer: proefaccount Thijs
Muijsenberg. **Fix:** functionele `registreer.html` teruggezet (identiek aan `93495bf^`), commit `980864b`,
gepusht, live geverifieerd. Geen backend-wijziging nodig — de drie endpoints (`/gebruikers/invite`,
`/gebruikers/activeer`, `/gebruikers/ww-reset`) bestaan onveranderd. Zie OPEN-BEVINDINGEN.md P1-44 voor de
restpunten (o.a. `info@odr9.nl` mogelijk ook geraakt; pagina nog op oude huisstijl).

**2026-09-08 — vervolg P1-44 (registreer.html):** pagina herbouwd in de nieuwe huisstijl via
`_src/registreer.html` + `build.py` (noindex; `build.py` gaf nul diff op andere pagina's). Afrondscherm
niet meer "u wordt doorgestuurd" (adv.html leest geen localStorage-sessie) maar "log in met uw nieuwe
wachtwoord" + knop. End-to-end getest tegen productie met een wegwerp-testaccount (activeren → inloggen
op adv.html → GV-scherm → dashboard; account daarna verwijderd). `info@odr9.nl` (uitgenodigd sinds 28
aug) wordt door de fix automatisch gedekt — invite-token nog geldig. Bredere herontwerp-sweep: `93495bf`
raakte maar 3 niet-gegenereerde pagina's (index = bewust nieuw, kantoorscan = was al stub, registreer =
dit gat); alle 9 worker-e-maillinks live 200; geen kapotte relatieve .html-links in de repo. registreer.html
was het enige echte gat. Commit `2fced01`.

**2026-09-08 — oorzaakanalyse P1-44 + gouden regel ingebouwd (op verzoek van Marcel).** Oorzaak: het
herontwerp-plan noemde `registreer.html` in twee tegenstrijdige lijsten ("buiten scope, laat staan"
én "→ stub"); de stub-tabel won bij uitvoering. Niets ving het 7 dagen lang omdat de afhankelijkheid
(worker mailt `registreer.html?token=…`) in de aparte private backend-repo leeft, geen pagina op de
site ernaar linkt, `build.py` de pagina niet kende, en geen test de activatieflow loopt. Ingebouwd:
CLAUDE.md werkregel 22 (GOUDEN STANDAARD — een pagina waar een backend-flow van afhangt wordt nooit
stilzwijgend gesloopt) + `LOAD-BEARING-PAGES.md` (register) + check 11 in `tests/audit-consistentie.mjs`
(grep't de backend-repo op `koersvoormorgen.nl/<pad>` en faalt bij een ontbrekende/gestubde/
niet-geregistreerde pagina; draait in pre-push-hook, CI en elke worker-deploy). Negatief getest: exit 1
bij een her-gestubde `registreer.html`. Alle 11 checks groen op de huidige boom.

**2026-09-09 — diepe-audit-routine (scheduled task): geen open aanvraag in de wachtrij, maandelijkse cadans nog niet verstreken (dag 9, self-request alleen dag 1-3). Geen auditronde uitgevoerd; check draaide en is hiermee gelogd.**

**2026-09-10 — diepe-audit-routine (scheduled task): geen open aanvraag in de wachtrij, maandelijkse cadans nog niet verstreken (dag 10, self-request alleen dag 1-3). Geen auditronde uitgevoerd; check draaide en is hiermee gelogd.**

**2026-09-12 — diepe-audit-routine (scheduled task): GEBLOKKEERD, `AUDIT_TRIGGER_KEY` wordt door de worker geweigerd.** `AUDIT_TRIGGER_KEY` staat wél in `~/.zshrc` (64-teken hex, geen quotes/witruimte/regeleinde-vervuiling — gecontroleerd met een hexdump), maar `GET /mna/veiligheid/audit-opdracht` met die sleutel gaf `{"error":"Unauthorized"}` i.p.v. de verwachte wachtrij-respons. Dit is geen "sleutel ontbreekt"-geval (dat dekt de routine-instructie al af) maar een **mismatch**: de lokale waarde komt kennelijk niet meer overeen met de Cloudflare-secret die de worker gebruikt (`worker/24-veiligheidsdashboard.js:409-410`, exacte `===`-vergelijking). `ADMIN_KEY` ontbreekt ook in deze omgeving, dus geen fallback mogelijk voor de maandelijkse-cadans-check (was toch niet van toepassing: vandaag is de 12e, buiten het dag 1-3-venster) of de `/afronden`-terugmelding. Geen wijziging aangebracht buiten deze logregel; geen audit/pentest uitgevoerd. **Actie voor Marcel:** controleer of `AUDIT_TRIGGER_KEY` recent geroteerd is via `npx wrangler secret put AUDIT_TRIGGER_KEY` zonder dat `~/.zshrc` is bijgewerkt (of andersom) — Claude Code kan Cloudflare-secrets niet zelf lezen om dit te bevestigen.

**2026-09-13 — diepe-audit-routine (scheduled task): wachtrij weer bereikbaar, geen open aanvraag, cadans nog niet verstreken.** `AUDIT_TRIGGER_KEY` gaf ditmaal wél `{"ok":true,"opdracht":null}` terug (na `source ~/.zshrc` in de Bash-tool-shell — die leest dat bestand niet automatisch in; los probleem van de mismatch van 12 sep) — de sleutel-mismatch die de vorige run blokkeerde lijkt dus vanzelf opgelost of inmiddels gecorrigeerd; geen verdere actie nodig tenzij het terugkomt. Geen aanvraag in de wachtrij, en vandaag (dag 13) valt buiten het dag 1-3-zelfaanvraagvenster voor de maandelijkse cadans. `ADMIN_KEY` ontbreekt nog steeds in deze omgeving (geen impact deze ronde, wel relevant zodra een aanvraag daadwerkelijk moet worden uitgevoerd — dan zijn e2e-API-tests en de ADMIN_KEY-fallback-terugmelding niet beschikbaar). Geen auditronde uitgevoerd; check draaide en is hiermee gelogd.

## 2026-09-18 — diepe-audit-routine (scheduled task)

Geen open aanvraag in de wachtrij (`/mna/veiligheid/audit-opdracht` gaf `opdracht:null`). Vandaag
(18 sep) valt buiten het maandelijkse cadans-venster (1e-3e dag van de maand), dus geen zelf-
ingediende `diepe_audit`-aanvraag conform de scheduled-task-instructie (Stap 1b). Geen actie nodig.

## 2026-09-19 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **bouw** (nog niet eerder getest door deze routine — gisteren transport),
trajecttype **Fusie** (gisteren Overname), `opdrachtgever_rol:"koper"` (Marcel als bemiddelaar
namens de koper — gisteren niet gespecificeerd), rollen verkoper/koper/tussenpersoon, fasen
Financieel + Juridisch & fiscaal (gisteren alleen Financieel). Reden: brede rotatie op combinatie
+ verhoogde prioriteit voor sector bouw omdat die tot de vijf sectoren behoort waar P2-64 (16 sep,
zie `OPEN-BEVINDINGEN.md`) al voor transport was aangetoond — werkregel 15 ("historische fouten
zijn risicosignalen": eerder gevonden foutpatroon → elders controleren, niet alleen bij transport).

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK, `tests/.env.staging.local`
aanwezig). Testtraject `DAILY_QA_20260919` (fictief: "Van der Steen Bouw & Infra B.V." / "Deltabouw
Groep Holding B.V."), aangemaakt/getest/opgeruimd via een los Node-scriptje op basis van
`tests/lib.mjs` (bouwstenen, geen dubbel werk met `tests/e2e-api.mjs`/`run-rolflows.sh`).

**Doorlopen flow (klik → request → backend → database → response → UI-equivalent):**
1. Traject aanmaken (`/mna/create`, admin-key) — sector/traject_type/codes geverifieerd via
   `/mna/traject/{code}` voor alle drie rollen.
2. Fase Financieel — rolgrenzen: verkoper mag opslaan, begeleider geblokkeerd (403, bekende regel
   van 12 sep "verkoper moet dit zelf doen"), koper overal geblokkeerd (403, ook op juridisch).
3. Fase Juridisch & fiscaal — begeleider mag wél opslaan; teruggelezen via een verse
   `/mna/traject/{code}`-call (niet alleen het save-response) en waarde geverifieerd.
4. Documentupload + echte AI-extractie: een realistische, meerdere-secties jaarrekening 2025
   (bestuursverslag/balans+vergelijkende cijfers/W&V 3 jaar/kasstroom/grondslagen/toelichting/
   vrijstellingsverklaring, geen kaal 1-pagina-document) voor de fictieve bouwonderneming, geüpload
   als verkoper op fase Financieel. Upload slaagde, niet verworpen, velden geëxtraheerd.
5. Reject-pad: een irrelevant document (meubilair-leveringscontract, andere bedrijfsnamen) geüpload
   → correct verworpen zonder AI-kosten (entiteitscheck op tekstmatch, geen gok).
6. P1-63-regressie (fix van 18 sep, nog niet naar productie): `/mna/gesprek/opslaan` met koper- én
   verkoper-code geeft nu 403 ("Alleen de begeleider mag..."), begeleider-code geeft 200 — fix staat
   nog overeind op staging.

**Resultaat:** 21/21 checks OK bij de definitieve run (2 eerdere runs faalden op scriptfouten in het
eigen testscript — verkeerd multipart-veldnaam `bestand` i.p.v. het echte `file`, en `sector`/
`traject_type` op het verkeerde JSON-niveau gelezen; geen productiebug, wel 2 extra testtrajecten
die meteen zijn opgeruimd samen met de definitieve). Geen nieuwe functionele fout gevonden binnen
deze combinatie.

**Bevinding (foutpropagatie, geen nieuwe bug — bevestiging van bestaande P2-64):** de documentupload-
AI-analyse gaf voor het bouwbedrijf expliciet het sectorlabel "accountants- of administratiekantoor"
en toetste de EBITDA-marge aan de accountancy-norm — live gereproduceerd op staging, zelfde
onderliggende oorzaak als P2-64 (16 sep, sector transport): `worker/14-document-upload-analyse.js`
valt terug op `DEFAULT_DOC_BENCHMARKS.accountancy` omdat geen van de vijf op 15 sep toegevoegde
sectoren een `docBenchmarks`-veld in de database heeft (bevestigd via `GET /mna/sectorprofielen` op
staging: `bouw`/`transport`/`handel`/`consultancy`/`verhuizingen` alle vijf `false`). Het AI-model
signaleerde de mismatch overigens zelf in de analysetekst ("de sectorclassificatie ... is onjuist"),
dus geen stille misleiding richting de gebruiker in dít specifieke geval — de onderliggende
contextinjectie is wel degelijk fout. **Niet zelf gefixt**: dit is dezelfde bewust-aan-Marcel-
voorgelegde architectuurkeuze als bij de oorspronkelijke P2-64-melding (gedeelde sector-normen-
lookup vs. eigen doc-extractie-fallback) — een tweede reproductie verandert die scope-vraag niet,
wel het gewicht ervan (2 van 5 sectoren nu concreet met een echte AI-call bevestigd, de overige 3
alleen op DB-niveau). Volledig bijgewerkt in `OPEN-BEVINDINGEN.md` (P2-64).

**Zelfstandig opgelost + gedeployed:** niets — geen nieuwe bug binnen deze combinatie, dus geen
fix/deploy deze ronde.

**Opgeruimd:** alle drie de testtrajecten (`5WUGG0IT`, `3U82ESKO`, `Y34S8U5C` — de eerste twee uit
mislukte scriptpogingen) verwijderd via `/admin/delete/mna/` op staging; nul `DAILY_QA_20260919`-
trajecten resterend, geverifieerd via `/mna/admin/lijst`.

**Zijstap: pre-push-testsuite gaf bij de eerste pushpoging 8 gefaalde tests.** Onderzocht vóórdans
als "waarschijnlijk vals" af te doen (werkregel 4, geen diagnose zonder bewijs). Oorzaak gevonden:
de pre-push-hook draaide `tests/e2e-3rollen-regressie.spec.js` + 2 andere Playwright-bestanden tegen
staging op het moment dat dit sessies eigen daily-qa-script (met échte AI-documentuploads) óók nog
tegen dezelfde staging-worker liep — resourcecontentie/timing, geen productiebug. Bewijs: een
volledige, schone herhaling van `e2e-3rollen-regressie.spec.js` (18 tests, geen gelijktijdige
belasting meer) gaf 16/16 geslaagd (2 bewust overgeslagen [AI]-tests); een volledige herhaling van
`e2e-adv-bewerkmodal.spec.js` + `e2e-regressie-uitbreiding.spec.js` gaf 9/10 geslaagd, met de ene
resterende faal (test 8, document-verwijderen) die bij een geïsoleerde herhaling meteen slaagde
(11,7s, geen timeout). Geen enkele van de 8 oorspronkelijke fails was bij hertest nog reproduceerbaar.
**Geleerde les (geen codewijziging, wel een procesnotitie):** een scheduled-task-sessie die zelf
staging belast (documentuploads, trajecten aanmaken) moet dat niet gelijktijdig laten lopen met een
`git push` naar dezelfde repo (de pre-push-hook draait zijn eigen staging-testsuite) — voortaan eerst
het eigen testscript volledig laten afronden vóór een push.

**Niet getest deze ronde (expliciet, geen gok):** rollen adviseur/meekijker/eigen specialist (nog
geen enkele automatische knoppentest-run heeft deze gedekt — verdient prioriteit in een volgende
rotatie); sectoren handel/consultancy/verhuizingen alleen op DB-niveau bevestigd voor P2-64, niet via
een echte documentupload; entiteiten/holding-consolidatie niet apart getest deze ronde (al dekkend
gecovered door de bestaande regressietest in `tests/e2e-api.mjs` STAP 6b, geen toegevoegde waarde om
te herhalen — werkregel 40, test economy).

**Score aan marilyn:** 75 (100 − 25). Geen nieuwe, ongeziene fout, maar wél een concreet gereproduceerde,
nog niet opgeloste bevinding binnen de scope van vandaag (P2-64 voor sector bouw) — dat verdient
eerlijk een aftrek, ook al is de onderliggende oorzaak al bekend en bewust bij Marcel neergelegd.
100 zou ten onrechte "niets gevonden" suggereren.

## 2026-09-19 (vervolg) — P2-64 volledig opgelost (Marcel: expliciete GO)

Naar aanleiding van de bevinding hierboven gaf Marcel expliciet akkoord om P2-64 zelfstandig
volledig op te lossen t/m productie, buiten de normale dagelijkse-knoppentest-scope. Volledig
verslag (oorzaak, exacte fix, bestanden/commits, regressietests, staging-/productieresultaat,
production smoke, cleanup) staat in `OPEN-BEVINDINGEN.md` bij P2-64 ("Fix 19 sep 2026"). Kort:

- **Oorzaak:** `worker/14-document-upload-analyse.js` viel bij een ontbrekende `docBenchmarks` voor
  een sector stilzwijgend terug op de accountancy-benchmarktekst.
- **Fix:** structurele terugvalvolgorde (DB-docBenchmarks → `DEFAULT_DOC_BENCHMARKS` → sector-eigen
  `aiNormen`/`label` → neutrale "geen benchmark"-melding) — nooit meer een andere sector lenen.
  Backend-commit `b8b7ad7`.
- **Regressietests (nieuw):** `tests/regressie-p264-sectorbenchmark.mjs` (staging, 20/20) + nieuwe
  production-smoke-batch `P264` in `tests/prod-smoke.mjs` (commits `c6fd12d`, `afb6942`).
- **Bestaande regressietests herdraaid op staging:** `e2e-3rollen-regressie.spec.js` met
  `KVM_DOE_AI=1` 18/18, `e2e-api.mjs --ai` 51/51, `audit-consistentie.mjs` 15/15 — allemaal groen.
- **Staging → productie:** staging Version ID `20e9cefa`, productie Version ID `04c71416`.
- **Production smoke:** `node tests/prod-smoke.mjs P264` — 11/11 PASS, D1-cleanup bevestigd.
- **Niet meegenomen (expliciet buiten scope):** `SECTOR_EXTRACTIE_EXTRA`-velddekking voor de 5
  nieuwere sectoren (P3-61, aparte al bestaande bevinding, ongewijzigd); geen andere openstaande
  punten aangeraakt; Marcels WIP-bestanden (`mna/04-begeleider-dashboard.js`, `mna/06-schermen.js`,
  `bedrijfsscan-start.html`) ongemoeid gelaten.
- **Zijstap tijdens deze sessie:** de pre-push-testsuite gaf bij twee eerdere pushpogingen (van de
  eerdere daily-QA-commits) telkens 1-8 tijdelijke fails door staging-resourcecontentie (eigen
  testscript liep gelijktijdig) — nader onderzocht en bevestigd géén productieregressie (zie eerdere
  logregel vandaag); Marcel heeft daarnaast bevestigd dat de WIP-diff in mna/04+mna/06 (alleen een
  `fetchMetTimeout()`-toepassing) daar geen verklarende rol in speelt.

## 2026-09-19 (vervolg) — dagelijkse GitHub Actions-cron gefixt en bewezen

Marcel meldde dat de `schedule`-trigger (`30 4 * * *`) op zijn eerste geplande gelegenheid (19 sep
04:30 UTC) niet was gevuurd — alle laatste 100 runs waren `push`-events. Preconditie-check via de
GitHub API (workflow `state=active`, Actions `enabled`/`allowed_actions=all`, repo niet gearchiveerd,
default branch `main`, YAML stabiel op `main` ruim vóór 04:30 UTC) toonde geen configuratiefout;
GitHub biedt geen inzicht in waarom de scheduler dat specifieke moment miste (bekend, gedocumenteerd
gedrag bij load, geen bewijs van een structureel defect).

**Fix 1** (commit `446c074`): `workflow_dispatch` toegevoegd — ontbrak volledig, dus was er geen
manier om de exacte dagelijkse keten op afroep te draaien.

**Toevalstreffer:** direct na de push vuurde de `schedule`-trigger voor het eerst zelf (run
`35433254974`) — mogelijk gerelateerd aan de push, mogelijk toeval. Deze run faalde: de job draaide
het volledige spec-bestand TWEE keer (eerst zonder AI, dan met AI) — 16/16 groen, daarna 9 gefaald/9
geslaagd met verspreide `page.waitForFunction`-timeouts.

**Fix 2** (commit `bce1cf1`): de AI-loze pass wordt nu overgeslagen op `schedule`/`workflow_dispatch`
(de AI-pass is een strikte superset). Op de eerste 2 herhalingen daarna: 16/18 en 16/18 groen, met
telkens 2 andere, niet-herhalende fails (B4/B5: een korte netwerk-achtige hik resp. een DOM-detach-
race; B6: risicoraamwerk-AI-call, 2x — onderzocht via een live `wrangler tail` op staging tijdens een
vierde run) — **4e run volledig groen: 18/18 + 9/9 (27/27).** Onafhankelijk bevestigd via een directe
D1-query op productie (`security_selfcheck_log`, bron `e2e-3rollen`): laatste rij `checks_totaal=18,
checks_geslaagd=18`. Cleanup onafhankelijk gecontroleerd: 0 resterende E2E-testtrajecten op staging.

Geen productiecode aangeraakt; alleen `.github/workflows/checks.yml`. Marcels WIP-bestanden
ongemoeid gelaten. Volledig verslag (met precieze foutmeldingen per poging) in de sessie zelf.

---

**2026-09-21** — diepe-audit-routine: geen open aanvraag in de wachtrij; vandaag is dag 21 van de maand (buiten het 1e-3e-dag-venster voor de maandelijkse cadans-trigger), dus geen eigen aanvraag ingediend. Geen verdere actie.

---

## 2026-09-21 (vervolg) — wekelijkse-audit-routine (scheduled task)

**Stap 1 — sync en syntax:** `node --check` op `backend/cloudflare-worker.js` (canonieke bron in de
aparte backend-repo) en alle `backend/worker/*.js`-modules: allemaal groen. `node --check` op alle
`mna/*.js`-modules (frontend): allemaal groen. Geen syntaxfouten.

**Stap 2 — consistentie-/veiligheidsaudit:** `node tests/audit-consistentie.mjs` — alle 15 checks
groen (veldreferenties, shadowing, begeleiderAuth-scoping, intern/koper-afscherming, SELECT *-scope,
traject_id-verwijdercascade (41 tabellen), gevoelige-termen-check, dealvoorstel BATNA-scheiding,
bgDoc-clausule-integriteit, kleurcontrast WCAG AA, load-bearing pagina's, cross-document-guardrails,
reliance-voettekst, NDA/LoI/MOU-generatierace-bewaking, bgDocSpa-route). Geen bevindingen.

**Stap 3 — functionele testsuite (`tests/e2e-api.mjs`, tegen productie):** kon niet volledig slagen.
`/health` en de ongeldige-toegangscode-check (geen sleutel nodig) slaagden (4/13 checks groen); elke
stap die de `ADMIN_KEY`-omgevingsvariabele nodig heeft (adviseur uitnodigen, verkoop-instelling,
traject aanmaken/limiet) gaf `Unauthorized`/`Authenticatie mislukt`. Dit is beoordeeld als een
**sleutel-/omgevingskwestie, geen platformbug**: stap 1 en 2 tonen geen enkele autorisatie-afwijking,
en het geheugen van deze sessie bevestigt dat de productie-`ADMIN_KEY` op 19 sep 2026 is geroteerd na
een per-ongeluk-blootstelling. Zeer aannemelijk dat de omgevingsvariabele die aan déze geplande taak
gekoppeld is nog de vóór-19-sep-waarde bevat. Deze routine heeft geen eigen live `ADMIN_KEY`-toegang
en kan/mag de sleutel niet zelf raden, invullen of tonen (GOUDEN STANDAARD secrets, werkregel/CLAUDE.md)
— dit wacht dus op Marcel: de omgevingsvariabele van deze scheduled task bijwerken naar de huidige
sleutel. Resterende teststappen (10-13) zijn als gevolg daarvan overgeslagen, geen platformdefect.

**Stap 4 — zelfstandig verbetertraject:** geen bevindingen om op te lossen — stap 1 en 2 volledig
groen, en de enige stap-3-uitval is de hierboven beschreven omgevingskwestie, niet iets dat in code
te repareren is. Geen wijzigingen aan productie- of backend-code deze ronde.

**Zijstap — bestaande working-tree-rommel gecontroleerd, niet aangeraakt:** `bedrijfsscan-start.html`
had bij aanvang nog altijd de al eerder (19/20 sep) genoteerde 460 regels onopgeslagen toevoegingen
(Marcels/een eerdere sessie's lopend handwerk) — ongemoeid gelaten. Zeven ongecommitte
`BATCH3*`-patchbestanden op de repo-root nader bekeken (niet toegepast, alleen gelezen): BATCH3B
(adviseur `opdrachtgever_rol`), BATCH3C (`mailFoutmelding`-nette foutafhandeling), BATCH3D
(teaser-`max_tokens` 700→2000) en BATCH3E (info-fases-analyse-`max_tokens` 1000→2000) blijken
inhoudelijk al live in de backend-repo te staan — deze patchbestanden zijn dus achterhaald.
BATCH3F (bijlage-extractie-`max_tokens` 2000→8000) is **bewust niet** toegepast: de live code bevat
al een gedateerde (16 sep 2026) toelichting die expliciet motiveert waarom 2000 gehandhaafd blijft na
diagnostisch onderzoek (test-economy-regel, werkregel 40) — dit patchbestand is dus een achterhaald
alternatief, geen openstaande fix. BATCH3Fa (base64-chunking-fix bij bijlagen >8192 bytes) staat óók
al live (`btoa()` nu ná volledige concatenatie i.p.v. per chunk) — beide 3Fa-patchbestanden
(testinfra + voorgestelde fix) zijn dus eveneens achterhaald. Niets verwijderd of gewijzigd (niet in
scope van deze routine); Marcel kan deze zeven bestanden waarschijnlijk zonder gevolgen opruimen
zodra hij dat zelf bevestigt.

**Samenvatting:** 🟠 alles wat automatisch getest kon worden is groen (syntax + consistentie-audit);
de functionele testsuite kon niet volledig draaien door een vermoedelijk verlopen `ADMIN_KEY` in de
omgeving van deze geplande taak — geen aanwijzing voor een platformbug, wel een openstaand punt voor
Marcel (sleutel bijwerken in de scheduled-task-omgeving). Geen code gewijzigd, geen deploy.

## 2026-09-21 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** rol **adviseur** + **eigen specialist** (beide nog nooit gedekt door deze routine —
adviseur/adv.html-flow en de "eigen specialist"-feature van `worker/34-eigen-specialisten.js` stonden
allebei nog open op de "niet getest deze ronde"-lijst van 19/20 sep), sector **handel** (tot nu toe
alleen op DB-niveau bevestigd voor P2-64, nog niet via een echte documentupload), trajecttype
**Verkoop** (nog niet eerder gebruikt door deze routine). Reden: brede combinatie-rotatie + gerichte
dekking van twee expliciet genoteerde open prioriteiten.

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK). Testtraject/-accounts
`DAILY_QA_20260921` (fictief: "Handelshuis Van Doren B.V." + een tweede kort traject), aangemaakt via
een los Node-testscript op basis van `tests/lib.mjs`.

**Doorlopen flow, 41/41 checks OK bij de definitieve run:**
1. Adviseursaccount aangemaakt (`/gebruikers/uitnodigen` → activeren → GV accepteren → MFA-bypass via
   `zetMfaUitVoorTest()` → `/gebruikers/verkoop/` met `traject_limiet:2` + alle modules aan).
2. Login (`/adviseur/trajecten`, wachtwoord-pad) — sessie_token, lege trajectenlijst, correcte
   `traject_limiet`/`modules`/`voorwaarden.gv_akkoord` teruggegeven; fout wachtwoord blijft 401
   (geen auth-lek door de MFA-bypass).
3. Traject aangemaakt via `/adviseur/create` (sector handel, type Verkoop, opdrachtgever_rol
   verkoper) — sector/type/structuur_type correct teruggelezen via `/mna/traject/{code}`.
4. **Eigen specialist** (`/mna/eigen-specialist`) toegevoegd, teruggelezen door de begeleider
   (tussen_code), ingetrokken en daarna niet meer in de actieve lijst — **privacy-invariant
   bevestigd**: `GET /mna/eigen-specialisten/{traject}` met `x-admin-key` (zónder tussen_code) geeft
   403, exact zoals de code-comments in `worker/34-eigen-specialisten.js` beloven; alleen een echte
   begeleider-`tussen_code` werkt. Rolgrens ook bevestigd: de verkoper-code (niet de tussen_code) mag
   geen eigen specialist toevoegen (403).
5. Documentupload + echte AI-extractie voor sector **handel** met een realistische, meerdere-secties
   jaarrekening (bestuursverslag/balans+vergelijkende cijfers/W&V 3 jaar/kasstroom/grondslagen/
   toelichting/samenstellingsverklaring) — geaccepteerd, **geen accountancy-sectorlabel-lek**
   (P2-64-regressiecontrole: de structurele fix van 19 sep 2026 werkt ook voor handel, een sector die
   toen niet los via een runtime-upload was bevestigd).
6. Reject-pad: irrelevant document (andere entiteit, geen tekstuele match) correct verworpen zonder
   AI-kosten.
7. Trajectlimiet: 2e traject binnen de limiet geslaagd, 3e traject correct 403.
8. Module-gate: een tweede adviseursaccount met `modules.traject:false` kreeg correct 403 bij
   `/adviseur/create`.

**Gevonden fout (P1) — AI-generatie-/documentupload-`fetch()` zonder timeout kon oneindig hangen:**
- **Probleem:** tijdens stap 5 hierboven hing het eigen testscript (een kale `fetch()`, zonder
  timeout) ~5 minuten vast op de documentupload voordat de verbinding zelf afbrak — geen enkele
  foutmelding, geen HTTP-respons. Zelfde bugklasse als de al vastgelegde valkuil in `CLAUDE.md`
  ("Een AI-generatie-`fetch()` zonder timeout kan voor altijd blijven hangen", fix 15 sep 2026), maar
  dan in een plek die de 15-sep-fixronde niet had gedekt.
- **Oorzaak (code gelezen, niet gegokt):** `uploadDocument()` in `mna/02-state-opslag-documenten.js`
  (de fase-specifieke uploadzone in mna.html) en de adviseur-uploadmodal in `adv.html` gebruikten
  allebei een kale `fetch()` naar `/mna/document/upload` — zonder de al bestaande
  `fetchMetTimeout()`-wrapper. Ter vergelijking: `window.centraalUploadFiles()` (de bulk-uploadflow,
  zelfde bestand) had voor **exact dezelfde** endpoint-aanroep al wél een eigen 45s
  AbortController-timeout — deze twee andere plekken waren destijds gemist.
- **Foutpropagatie-check (werkregel 15/16):** alle overige kale `fetch()`-aanroepen naar AI-generatie-
  achtige endpoints doorzocht in `mna/*.js` + `adv.html`. Nog 12 extra plekken gevonden zonder
  timeout: `/mna/bankmutaties/analyse/genereren` + `/mna/bankmutaties/upload`
  (`mna/02-state-opslag-documenten.js`, de red-flag-analyse op bankmutaties — UI zegt zelf al "kan een
  minuut duren"), en 10 bare aanroepen naar de generieke `/ai`-proxy verspreid over
  `mna/02-state-opslag-documenten.js` (consolidatie-analyse), `mna/03-rekenkern-waardering.js`
  (vergaderverslag-structurering), `mna/04-begeleider-dashboard.js` (contract-invulling NDA/LoI/BEM,
  dealvoorstel-tekst + interne bijlage, biedingsbrief-invulling, gespreksverslag — 3 daarvan met
  `max_tokens:16000`, dezelfde orde van grootte als het eerder al gefixte verkoopmemorandum),
  `mna/06-schermen.js` (eindcontrole-samenvatting, DD-samenvatting, waarderingsrapport ×2) en
  `mna/07-start-chat.js` (de chat-assistent).
- **Fix:** alle **14 call-sites** gebruiken nu `fetchMetTimeout(...,60000)` i.p.v. een kale `fetch()`
  — dezelfde, al bestaande wrapper, geen nieuwe abstractie. `node --check` op alle 6 gewijzigde
  bestanden (`mna/02`, `mna/03`, `mna/04`, `mna/06`, `mna/07`, `adv.html`-scriptblok) groen.
- **Validatie:** (1) eigen reproductiescript op staging herhaald — documentupload keert nu direct
  terug i.p.v. te hangen, alle 41 checks groen; (2) `tests/e2e-3rollen-regressie.spec.js` met
  `KVM_DOE_AI=1` — 18/18 groen, incl. V5 (documentupload, echte AI, 44.2s) en B6 (risicoraamwerk,
  echte AI, 16.4s) — beide ruim binnen de 60s-marge; (3) `tests/audit-consistentie.mjs` — 15/15 groen;
  (4) volledige pre-push-testsuite (alle 4 spec-bestanden, 56 tests, 54 geslaagd/2 bewust
  overgeslagen zonder `KVM_DOE_AI`) — allemaal groen.
- **Regressie:** geen. Impact surface bewust breed gecheckt (werkregel 3): alle bare `/ai`- en
  document-upload-achtige `fetch()`-aanroepen in zowel `mna.html` als `adv.html` (werkregel 8),
  niet alleen de ene die zich meldde.
- **Status:** gecommit (`c716c71`) en gepusht naar `main` (pre-push-hook, incl. de volledige
  testsuite tegen staging, groen). **Nog niet gedeployed** naar Cloudflare Pages — wacht op Marcels
  beoordeling van een preview vóór productie (werkregel 27), conform de scope van deze routine
  ("niet zelf naar productie deployen").

**Opgeruimd:** beide testtrajecten + beide testaccounts verwijderd via de bestaande endpoints;
0 resterende `DAILY_QA_20260921`/`daily-qa-20260921`-rijen geverifieerd via een directe D1-query
(zowel `mna_trajecten` als `bf_gebruikers`) — één restant van een eerdere mislukte scriptpoging
(wrangler-CLI-hik bij de MFA-bypass) apart via `/gebruikers/verwijder/` opgeruimd.

**Zijstap — beveiligingsincident (secret-blootstelling, GOUDEN STANDAARD werkregel/geheugenregel
"nooit secret in chat-output"):** bij het diagnosticeren van de mislukte marilyn-terugmelding (stap
5b) is per ongeluk een `ADMIN_KEY`-waarde uit de sessie-omgeving zichtbaar geworden in tool-output
(`env | grep -i ADMIN_KEY`) — een directe schending van de vaste regel dat een secret nooit in
chat/log/output mag verschijnen, ongeacht hoe klein het risico lijkt. **Direct gestopt** met verder
onderzoek langs die weg. De waarde bleek bij een daadwerkelijke aanroep (`/mna/admin/veiligheid/
diepe-audit`) **401 Unauthorized** te geven — dus vermoedelijk dezelfde reeds-ongeldige/verlopen
waarde die de wekelijkse-audit-routine van vandaag ook al tegenkwam (zie het logblok direct hierboven,
"vermoedelijk verlopen ADMIN_KEY"), mogelijk een leftover/placeholder-waarde in de shell-omgeving in
plaats van een echt geldig geheim. Dat verandert niets aan de regel: **Marcel wordt met klem
geadviseerd te verifiëren of dit een echte, ooit-geldige credential was en, bij twijfel, de
productie-`ADMIN_KEY` te roteren** (`wrangler secret put ADMIN_KEY`) — "gewoon roteren is goedkoper
dan uitzoeken". Marilyn-terugmelding (stap 5b) is hierdoor **niet gelukt** (401) — dit blokkeert de
rest van de routine niet, AUDIT-LOG.md is bijgewerkt als primair record.

**Niet getest deze ronde:** rol eigen specialist als los, doorlopend traject vanaf de review-/
aftekenflow (`worker/32-pool.js`-machinerie) — alleen de toevoeg-/inzage-/intrek-cyclus is getest,
niet het accepteren/dossier-inzien/aftekenen door de specialist zelf (aparte, grotere flow, geen
aanleiding vandaag); sectoren mkb/itsoftware/accountancy/consultancy/verhuizingen (dit keer niet aan
de beurt); concurrency op `/mna/eigen-specialist` (bestaande dubbelklik-guard niet opnieuw belast,
geen nieuwe aanleiding, werkregel 40 test-economy).

**Score aan marilyn:** kon niet gemeld worden (401, zie hierboven) — zou anders 90 zijn geweest
(100 − 10, één fout gevonden én zelfstandig opgelost+getest+gepusht).

## 2026-09-23

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg (`{"ok":true,"opdracht":null}`). Vandaag (23e) valt buiten het 1e-3e-van-de-maand-venster voor de automatische maandelijkse cadans, dus geen zelf-aanvraag ingediend. Geen audit uitgevoerd, niets gewijzigd. Opmerking: de working tree van de frontend-repo had bij aanvang onopgeslagen wijzigingen (`mna/04-begeleider-dashboard.js`, `mna/06-schermen.js`, `testvoorwaarden.html`, `viewer.html`, `voorwaarden.html`) — niet aangeraakt door deze routine, vermoedelijk lopend handwerk van Marcel/een eerdere sessie.

## 2026-09-23 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Vooraf geconstateerd, niet aangeraakt (relevant voor context):** bij aanvang stonden in **beide**
repo's substantiële, onopgeslagen wijzigingen open — frontend (5 bestanden, zie hierboven) én
backend (`~/Documents/GitHub/koersvoormorgen-backend`, 9 bestanden/274 regels: een nieuwe
`worker/00d-platformvoorwaarden-gate.js` + wijzigingen in 8 andere modules, kennelijk een
in-uitvoering-zijnde feature "S1.2/S1.2b — platformvoorwaarden-acceptatie + testaccount-IP-binding",
gedateerd 22-23 sep in de code-comments zelf). Expliciet gecontroleerd of dit al ergens live stond
vóórdat deze routine startte: `GET /mna/platformvoorwaarden/tekst` op staging gaf de generieke
catch-all-respons ("Koers voor Morgen Worker actief"), niet de nieuwe routehandler — dus deze WIP is
**niet** gedeployed, staging draait nog de laatst gecommitte code. Niet gewijzigd, niet gecommit, niet
gestaged door deze routine (werkregel 1: geen ander werk vermengen). Enige aanbeveling: dit is
substantieel werk dat nog nergens in git-historie staat (dus niet backed-up) — de moeite waard om bij
gelegenheid af te ronden of expliciet even te bewaren (`git stash`/eigen branch), puur ter info, geen
actie van deze routine zelf.

**Rotatiekeuze:** sector **itsoftware** en trajecttype **PE-traject** (beide nog nooit eerder getest
door deze routine — voorgaande dagen: transport/Overname, bouw/Fusie, zorg/Opvolging, handel/Verkoop),
rollen verkoper/koper/tussenpersoon, fasen Financieel + Technologie & architectuur (it) + Beveiliging
& compliance. Reden: brede sector-/trajecttype-rotatie; alle 6 rollen zijn inmiddels minstens één keer
gedekt door eerdere rondes (18-21 sep), dus vandaag lag de nadruk weer op sector-/fase-dekking.

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK, `tests/.env.staging.local`
aanwezig).

**Doorlopen flow (eigen Node-testscript op basis van `tests/lib.mjs`, klik→request→backend→database→
response, geen dubbel werk met de bestaande suites):**
1. Traject aangemaakt (`/mna/create`, admin-key, sector itsoftware, traject_type PE-traject,
   opdrachtgever_rol verkoper) — sector/traject_type correct teruggelezen via `/mna/traject/{code}`
   voor alle drie rollen (verkoper/koper/tussenpersoon correct geresolved).
2. Fase Financieel: verkoper mag opslaan (ok:true), begeleider geblokkeerd (403, bekende regel
   "moet verkoper zelf doen"), koper geblokkeerd (403).
3. Fase Technologie & architectuur (it, nog niet eerder door deze routine getest): verkoper mag
   opslaan, begeleider mag óók opslaan (niet-Financieel, dus toegestaan), koper geblokkeerd (403).
4. Fase Beveiliging & compliance (nog niet eerder getest): begeleider slaat op, teruggelezen via een
   verse `/mna/traject/{code}`-call en waarde geverifieerd (niet alleen het save-response).
5. Documentupload + echte AI-extractie: een realistisch, 13-secties technologie-/
   informatiebeveiligingsrapport (~1.100 woorden, geen kaal 1-pagina-document) voor de fictieve
   itsoftware-onderneming, geüpload op fase 'it'. Upload slaagde, niet verworpen.
6. Reject-pad: een irrelevant document (cateringfactuur, andere bedrijfsnamen) geüpload op fase
   Financieel → correct herkend als niet-passend.
7. Traject volledig opgeruimd (`/admin/delete/mna/`, ok:true).

**Eigen testfout (geen platformbug), vastgelegd voor transparantie:** de eerste volledige testrun gaf
1 FAIL ("AI-extractie heeft (extra) it-velden gevuld") — bleek een fout in mijn eigen testopzet: de
backend `/mna/document/upload`-route persisteert geëxtraheerde velden bewust NIET zelf in `mna_data`
(dat doet in de echte applicatie de frontend, `autoFillFromExtraction()` in `mna/02`, via een eigen
vervolg-`/mna/save`-aanroep) — mijn ruwe API-test las dus terecht geen extra velden, want die worden
nooit server-side weggeschreven zonder de frontend-laag. Losse, gerichte reproductie (1 run, niet de
volledige suite herhaald — werkregel 40 test-economy) bevestigde: de 4 handmatig opgeslagen it-velden
bleven na de upload exact ongewijzigd aanwezig (geen dataverlies), en de AI-extractie zelf werkte wél
correct — de vrije tekst over ISO 27001-certificering uit het testdocument kwam terug in het
`cybersecurity`-veld van de extractierespons.

**Bevinding (nieuw, P2-65 — zie `OPEN-BEVINDINGEN.md` voor het volledige bewijs):** die laatste
observatie leidde tot een gerichte verdiepingscontrole (werkregel 15/16 — bij twijfel het patroon
uitzoeken): itsoftware's sectorprofielveld `compliance_iso` ("ISO 27001/SOC2/NEN7510 certificering",
`doc:true`) heeft **geen enkele extractiekoppeling**, ondanks dat het testdocument de certificering
expliciet en in detail noemde — het veld bleef na de upload leeg. Foutpropagatie-check breder
uitgevoerd: dezelfde onderliggende oorzaak (ontbrekende `SECTOR_EXTRACTIE_EXTRA`-sleutel) geldt
op code-niveau ook voor de complete fase-2-balansvelden-groep (resultaat/eigenVermogen/balansTotaal/
liquideMiddelen/kortlopendeSchulden/langlopendeSchulden/rentelasten/aflossingVerplicht) bij 8 van de
9 sectoren — alleen mkb kreeg deze koppeling ooit (20 aug 2026-fix). Niet zelf gefixt: de structureel
juiste oplossing raakt het gedeelde basis-extractieschema voor alle sectoren (incl. accountancy),
dezelfde categorie wijziging als P3-61/P2-64 die toen ook pas na Marcels expliciete GO zijn
doorgevoerd — dus bewust aan Marcel voorgelegd i.p.v. zelfstandig ingevuld, conform de scope van deze
dagelijkse routine.

**Zelfstandig opgelost + gedeployed:** niets — de enige "fout" die de testrun opleverde was een fout
in mijn eigen testscript (zie hierboven), geen platformbug om te fixen. De wél gevonden platformbug
(P2-65) valt buiten de zelfstandige-fix-scope van deze routine (architectuurkeuze, zie boven).

**Opgeruimd:** beide testtrajecten (het hoofdtraject uit de volledige run + het losse
reproductietraject `DAILY_QA_20260923_REPRO`) verwijderd via `/admin/delete/mna/` op staging, beide
`ok:true` bevestigd in de response.

**Niet getest deze ronde (expliciet, geen gok):** rol eigen specialist als doorlopend traject
vanaf de review-/aftekenflow (nog steeds niet opgepakt, zie 21 sep-notitie); sectoren mkb/zorg/
accountancy/bouw/transport/handel/consultancy/verhuizingen (dit keer niet aan de beurt — zorg was al
op 20 sep aan de beurt); concurrency (geen nieuwe aanleiding vandaag, werkregel 40 test-economy).

**Score aan marilyn:** zou 75 zijn geweest (100 − 25, één nieuwe, concreet reproduceerbare bevinding
P2-65 binnen de scope van vandaag, niet zelfstandig opgelost — architectuurkeuze, zelfde eerlijke
aftrek-logica als de 19 sep-score voor P2-64 vóór die werd opgelost) — **melding aan marilyn is
NIET gelukt: 401 Unauthorized** op `POST /mna/admin/veiligheid/diepe-audit` met de productie-`ADMIN_KEY`
uit de sessie-omgeving. Zelfde symptoom als de 21 sep-run al meldde ("vermoedelijk verlopen ADMIN_KEY")
— dit is dus een tweede, opeenvolgende dag met dezelfde 401 op dit specifieke endpoint, geen
incidentele hik. De sleutelwaarde zelf is niet onderzocht/uitgeprint (GOUDEN STANDAARD: nooit een
secret in output). **Aanbeveling aan Marcel (herhaald van 21 sep, nu met extra gewicht):** verifiëren
of de `ADMIN_KEY` in `~/.zshrc` nog overeenkomt met de daadwerkelijke Cloudflare-secret op productie,
en bij twijfel roteren (`wrangler secret put ADMIN_KEY`) — dit blokkeert al twee dagen op rij de
zichtbaarheid van de dagelijkse knoppentest in marilyn.html → Veiligheid. Blokkeert de rest van deze
routine niet — `tests/AUDIT-LOG.md` en `OPEN-BEVINDINGEN.md` zijn het primaire record.

## 2026-09-24

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg (`{"ok":true,"opdracht":null}`). Vandaag (24e) valt buiten het 1e-3e-van-de-maand-venster voor de automatische maandelijkse cadans, dus geen zelf-aanvraag ingediend. Geen audit uitgevoerd, niets gewijzigd. Opmerking: de working tree had bij aanvang al de nodige onopgeslagen wijzigingen (o.a. `mna/04-begeleider-dashboard.js`, `mna/06-schermen.js`, meerdere `tests/*`-bestanden, `scripts/deploy.sh`, `voorwaarden.html`/`testvoorwaarden.html`/`viewer.html`) — niet aangeraakt door deze routine, vermoedelijk lopend handwerk van Marcel/een eerdere sessie. Zie ook de 23 sep-notitie in dit bestand: de ADMIN_KEY-401 op `/mna/admin/veiligheid/diepe-audit` was daar een probleem voor de knoppentest-routine, niet voor deze audit-routine (die gebruikt alleen `AUDIT_TRIGGER_KEY`, en die werkte vandaag probleemloos) — niet opnieuw getest vandaag, want niet relevant voor deze run.

## 2026-09-24 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Vooraf geconstateerd, niet aangeraakt (relevant voor context):** bij aanvang stonden in beide
repo's dezelfde substantiële, onopgeslagen WIP-wijzigingen open als gisteren gemeld (S1.2/S1.2b
platformvoorwaarden-gate). **Nieuw vandaag:** die gate bleek — ondanks nog steeds uncommitted lokaal
— sinds gisteren daadwerkelijk **live gedeployed op staging** (`GET /mna/platformvoorwaarden/tekst`
gaf nu echte inhoud i.p.v. de generieke catch-all-respons van gisteren; `/mna/save` zonder acceptatie
gaf `{"error":"voorwaarden_niet_geaccepteerd"}`). Dit moet buiten deze routine om gebeurd zijn (een
eigen sessie van Marcel, vermoedelijk) — geconstateerd, niet zelf gedaan. **Aandachtspunt voor
Marcel:** de gate draait dus op staging zonder dat de bijbehorende code ergens gecommit is — bij
sessieverlies is dit werk niet in git-historie terug te vinden. Verder niet aangeraakt (werkregel 1).

**Rotatiekeuze:** sector **accountancy** (het vlaggenschip — opvallend genoeg nog nooit eerder door
deze routine getest; voorgaande dagen: transport/Overname, bouw/Fusie, zorg/Opvolging, handel/Verkoop,
itsoftware/PE-traject), trajecttype **Verkoop**, rollen verkoper/koper/begeleider, fasen Financieel +
Compliance (NBA/Wwft/kwaliteitstoetsing — accountancy-specifiek, niet eerder getest). Extra: de
"eigen specialist"-flow (`worker/34-eigen-specialisten.js`) werd voor het eerst getest door deze
routine — de aftekencyclus via de specialistenpool (`worker/32-pool.js`) vereist een bestaand
tos_document in scope (`POST /mna/pool/opdracht` valideert dit hard) en is dus een aparte, grotere
flow die vandaag bewust niet is opgetuigd (zelfde afweging als 21/23 sep) — wel getest: toevoegen,
privacy-invariant (admin/koper geen toegang), lijst, dubbelklik-guard, intrekken.

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK, `tests/.env.staging.local`
aanwezig).

**Doorlopen flow (eigen Node-testscript op basis van `tests/lib.mjs`, klik→request→backend→database→
response):**
1. Traject aangemaakt (sector accountancy, type Verkoop, admin-key) — 3 codes teruggekregen.
2. Platformvoorwaarden-gate: status vóór acceptatie `akkoord:false`; `/mna/save` zonder acceptatie
   correct geblokkeerd (`voorwaarden_niet_geaccepteerd`); acceptatie voor alle 3 rolcodes gelukt en
   onafhankelijk via `/mna/platformvoorwaarden/status` geverifieerd.
3. Traject-readback per rol: sector/traject_type kwamen voor verkoper/koper/tussenpersoon correct terug.
4. Fase Financieel: verkoper mag opslaan; begeleider 403 (bekende regel); koper 403.
5. Fase Compliance (nooit eerder getest): verkoper slaat 6 velden op (nba/toetsDatum/toetsOordeel/
   tuchtzaken/wwft/klachtenReg); begeleider leest ze correct terug via een verse call.
6. Documentupload — zie P2-66 hieronder (gevonden én gefixt).
7. Reject-pad (cateringfactuur, echt irrelevant): correct verworpen, vóór én na de P2-66-fix.
8. Eigen specialist toevoegen/lijst/dubbelklik-guard/intrekken — zie P3-67 hieronder (gevonden én
   gefixt). Privacy-invariant bevestigd: admin-key én koper-code krijgen beide correct 403 op de
   specialistenlijst (worker/34-eigen-specialisten.js's eigen, bewuste uitsluiting van rol='admin').
9. Cross-traject-check: intrekken van de specialist met een verkeerde (koper-)code correct 403.

**Eigen testfout (geen platformbug), vastgelegd voor transparantie:** de eerste documentupload-poging
gebruikte een jaarrekening met een ANDERE fictieve bedrijfsnaam dan de traject-`kantoor_naam` —
correct verworpen door de entiteitscheck. Bij het herstellen daarvan (bedrijfsnaam gelijkgetrokken)
bleef de verwerping echter bestaan — dát bleek geen testfout, maar een echte platformbug (P2-66).

**Gevonden fouten (2, allebei dezelfde dag gereproduceerd, gefixt, hertest, gedeployed naar staging):**

### 1. P2-66 — Documentupload verwerpt ten onrechte passende documenten bij een kantoornaam met interne punctuatie
- **Probleem:** de entiteitscheck in `worker/14-document-upload-analyse.js` stript niet-alfanumerieke
  tekens uit de woorden van de bekende kantoornaam vóór de substring-match, maar nooit uit de
  documenttekst zelf. Een naam-"woord" met interne punctuatie (underscore, koppelteken zonder
  spaties — bijv. testtrajectnamen als `DAILY_QA_...`, of een reële dubbele achternaam als
  "Jansen-de-Vries") kan daardoor nooit matchen, ook al staat de naam letterlijk in het document.
- **Reproductie:** een 830-woorden jaarrekening met de exacte traject-kantoornaam erin werd toch
  verworpen ("Document bevat geen verwijzing naar ..."), zonder dat er een AI-call plaatsvond.
- **Oorzaak:** asymmetrische normalisatie tussen het naam-woord (wél gestript) en `previewText`
  (niet gestript) vóór de `includes()`-vergelijking.
- **Fix:** `previewText` wordt nu identiek genormaliseerd vóór de vergelijking (5 regels,
  `worker/14-document-upload-analyse.js`). Matchlogica zelf ongewijzigd.
- **Validatie:** `node --check` groen; staging-deploy (predeploy-audit 45/45 groen, Version ID
  `0de52cb8-0017-4d00-8f51-b2c1abb41618`); zelfde document opnieuw geüpload → `verworpen:false`,
  78 velden geëxtraheerd (incl. correcte compliance-velden nba_status/afm_vergunning/
  kwaliteitstoetsing_*/tuchtzaken/claims/wwft/integriteitsincidenten).
- **Regressie:** de cateringfactuur (écht irrelevant) blijft na de fix correct `verworpen:true` —
  de fix verzwakt de check niet.
- **Foutpropagatie:** dit is een generieke matchfunctie (één plek, niet per sector gedupliceerd),
  dus geen elders te herhalen variant gevonden — wel een nieuw datapunt voor werkregel 15: een
  volgend "document wordt onterecht verworpen"-signaal verdient voortaan eerst deze functie te
  checken vóór een AI-/extractieprobleem wordt vermoed.
- **Niet naar productie gedeployed** — wacht op Marcels beoordeling (werkregel 27, buiten scope
  van deze routine om zelf te beslissen).

### 2. P3-67 — `?code=`-fallback voor de eigen-specialisten-lijst was inert (geen productie-impact)
- **Probleem:** `GET /mna/eigen-specialisten/{traject}?code=<geldige tussen_code>` gaf altijd
  `{"error":"Geen toegang"}`, ook met een net-succesvol-gebruikte tussen_code.
- **Oorzaak:** `begeleiderAuth()` leest de credential uitsluitend via headers/`?key=`
  (`worker/00-policy.js leesSleutel()`); het los meegegeven `code`-argument in
  `worker/34-eigen-specialisten.js magBegeleider()` werd alleen gebruikt om het traject op te
  zoeken, nooit als credential — de gedocumenteerde `?code=`-fallback werkte dus voor geen enkele
  waarde. **Geen productie-impact:** de echte UI (`bgPoolApi()` in `mna/04-begeleider-dashboard.js`)
  gebruikt altijd de `x-tussen-key`-header, nooit `?code=`.
- **Fix:** een synthetische `x-tussen-key`-header wordt nu gezet wanneer alleen `?code=` is
  meegegeven, vóór de aanroep naar `begeleiderAuth()`. De bestaande `rol==='begeleider'`-uitsluiting
  blijft van kracht (geverifieerd: `rol==='admin'` faalt nog steeds op die check — geen nieuw
  ADMIN_KEY-via-`?code=`-lek).
- **Validatie:** `node --check` groen; zelfde staging-deploy als hierboven; `?code=`-aanroep werkt nu
  correct; admin-key/koper-code via `?code=` blijven beide 403.
- **Niet naar productie gedeployed** — wacht op Marcels beoordeling.

**Positieve bevinding (geen bug, ter info):** de "nieuwe DB-tabel"-checklist uit CLAUDE.md (beide
verwijder-cascades moeten élke traject-gebonden tabel dekken) is inmiddels structureel geborgd —
`/admin/delete/mna/` én `/avg/verwijder` roepen nu allebei dezelfde gedeelde
`verwijderTrajectData()` (`worker/02-config-constanten.js`) aan, die o.a. `pool_opdrachten`/
`pool_reviews`/`mna_eigen_specialisten`/alle `tos_*`-tabellen dekt. Geverifieerd via grep — geen
losse, onafhankelijk onderhouden tweede lijst meer (het historische risico dat CLAUDE.md nog als
waarschuwing vermeldt, lijkt hiermee opgelost; niet apart live getest vandaag, want al bewezen via de
predeploy-audit hierboven, checks 6/7).

**P2-65 (open van 23 sep):** aanvullend live gereproduceerd voor accountancy vandaag — de
balansveldenlacune blijkt dus niet itsoftware-specifiek maar platformbreed. Zie bijgewerkte
`OPEN-BEVINDINGEN.md`. Nog steeds niet zelf gefixt (architectuurkeuze, zelfde afweging als eerder).

**Niet getest deze ronde (expliciet, geen gok):** de volledige eigen-specialist-aftekencyclus via de
specialistenpool (vereist een bestaand tos_document — aparte, grotere flow, geen aanleiding om dat
vandaag op te tuigen); sectoren mkb/zorg/bouw/transport/handel/consultancy/verhuizingen (dit keer
niet aan de beurt); concurrency (geen nieuwe aanleiding, werkregel 40 test-economy).

**Opgeruimd:** alle 3 testtrajecten (het hoofdtraject uit het script + het losse debug-traject +
een eerste handmatig aangemaakt probe-traject dat per ongeluk niet meteen was opgeruimd) verwijderd
via `/admin/delete/mna/` op staging; geverifieerd met een directe D1-query
(`SELECT COUNT(*) FROM mna_trajecten WHERE kantoor_naam LIKE '%DAILY_QA%'` → 0).

**Score aan marilyn:** 80 (100 − 10 − 10, twee gevonden fouten, beide zelfstandig opgelost + getest +
gedeployed naar staging binnen de scope van vandaag).

**Addendum (zelfde dag) — pushstatus + derde gevonden/gefixte fout:**

Bij het pushen van de logwijzigingen hierboven bleek de bestaande pre-push-hook (statische
veiligheidsaudit, `tests/audit-consistentie.mjs`) een 3e bug op te leveren, gevonden tijdens
diezelfde pushpoging:

### P3-68 · Pre-push cascade-check (audit-consistentie.mjs, check 6) had een vaste 6000-tekens-scanvenster, inmiddels te klein
🟢 **Gevonden + gefixt + hertest, dezelfde sessie.** De check scande `verwijderTrajectData()`
(backend/worker/02-config-constanten.js) met een vaste `fnStart+6000`-tekens-vensterlengte. Die
functie is door accumulerende uitlegcomments gegroeid tot >6250 tekens, waardoor de laatste 2
DELETE-regels (`mna_eigen_specialisten`, `mna_koper_biedingen`) buiten het venster vielen en de
check ze ten onrechte als "ontbrekend in de cascade" rapporteerde — terwijl ze er al in stonden
(bevestigd via directe code-inspectie én de backend-eigen runtime-check, die al die tijd groen was,
zie predeploy-audit hierboven). Dit blokkeerde een legitieme push. Fix: het scanvenster loopt nu tot
de eerstvolgende top-level `export`, in plaats van een vaste lengte — groeit voortaan automatisch mee
met de functie i.p.v. bij de volgende toevoeging opnieuw stil te breken (exact hetzelfde
groeipatroon, P4-22, dat deze check zelf bewaakt). `node --check` groen, check 6 hertest: 42 tabellen
gecontroleerd, allemaal gedekt, 0 bevindingen.

**Pushstatus:** de 3 commits van vandaag (2× logboek/fix + deze check-fix) staan lokaal gecommit.
Push naar `origin/main` lukte niet binnen deze sessie — niet door mijn eigen wijzigingen, maar
doordat de pre-push-hook óók de volledige Playwright-suite (`tests/e2e-3rollen-regressie.spec.js`)
tegen staging draait, en 3 tests faalden: B2/B3/B4 (allemaal begeleider-rol, "Geen begeleiderssessie
zichtbaar na login"). **Vermoedelijke oorzaak (niet verder onderzocht — buiten scope, actief WIP van
Marcel):** de nieuwe S1.2b-platformvoorwaarden-gate is sinds gisteren live op de staging-Worker (zie
hierboven), en de bijbehorende frontend-UI-code (`mna/04-begeleider-dashboard.js`,
`mna/06-schermen.js` — precies de 2 bestanden die al bij aanvang van deze sessie onopgeslagen in de
working tree stonden) bevat wel al `platformvoorwaarden`-referenties, maar is zelf nog nooit
gecommit of naar de staging-Pages-omgeving gedeployed. Als de backend-gate al blokkeert vóórdat de
frontend weet hoe te accepteren, zou een echte browser-login van een begeleider inderdaad vastlopen
— exact het Playwright-symptoom. **Dit is niet zelf verder gediagnosticeerd of gefixt**: dit raakt
Marcels eigen, actief in ontwikkeling zijnde WIP-feature (werkregel 5 — geen wezenlijke
productlogica-wijziging zonder overleg), en `git push --no-verify` is bewust niet gebruikt (de hook
faalde niet door mijn wijzigingen, en overslaan zou een mogelijk echt kapotte begeleider-loginflow op
staging kunnen maskeren). **Aanbevolen aan Marcel:** vóór de volgende push/deploy van de
platformvoorwaarden-gate-feature, de frontend-UI (mna/04 + mna/06) en de backend-gate samen als één
geheel testen/deployen — en dan pas de 3 lokale commits van vandaag alsnog pushen (`git push`, geen
`--no-verify` nodig zodra de Playwright-suite weer groen is).

**Terzijde geconstateerd (niet aangeraakt):** op staging bleken 7 losse `E2E-UITBR-...`-trajecten te
bestaan (uit `tests/e2e-regressie-uitbreiding.spec.js`, tijdstempels van vóór vandaag) — geen
`DAILY_QA_`-testdata van deze routine (die is volledig opgeruimd, 0 resterend, apart geverifieerd),
dus buiten de opruimscope van deze routine. Vermeld puur ter info.

## 2026-09-25

**diepe-audit-routine (geautomatiseerde scheduled task): geen open aanvraag, cadans nog niet verstreken.** Wachtrij (`/mna/veiligheid/audit-opdracht`) leeg (`{"ok":true,"opdracht":null}`). Vandaag (25e) valt buiten het 1e-3e-van-de-maand-venster voor de automatische maandelijkse cadans, dus geen zelf-aanvraag ingediend. Geen audit uitgevoerd, niets gewijzigd. Opmerking: de working tree had bij aanvang een groot aantal onopgeslagen wijzigingen (`mna/04-begeleider-dashboard.js`, `mna/06-schermen.js`, `scripts/deploy.sh`, meerdere `tests/*`-bestanden, `testvoorwaarden.html`, `viewer.html`, `voorwaarden.html`) — overeenkomend met de al eerder gelogde platformvoorwaarden-gate-WIP (zie logboek 19-24 sep) — niet aangeraakt door deze routine.

## 2026-09-25 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Vooraf geconstateerd, niet aangeraakt (relevant voor context):** bij aanvang stonden dezelfde
substantiële, onopgeslagen WIP-wijzigingen open als de afgelopen dagen (S1.2/S1.2b
platformvoorwaarden-gate), nu in **beide** repo's: frontend (20 bestanden, zie hierboven bij de
diepe-audit-routine van vandaag) én backend (`~/Documents/GitHub/koersvoormorgen-backend`, o.a. een
nieuwe, nog niet gecommitte `worker/00d-platformvoorwaarden-gate.js` + wijzigingen in 8 andere
modules, plus nieuwe niet-gecommitte testbestanden `tests/s1.2b-platformvoorwaarden.mjs`,
`tests/p1-ai-rate-limit.mjs`, `tests/audit-backend-cascade-scope.mjs`). Frontend blijft 12 commits
vóór op `origin/main` (pushblokkade van 24 sep nog niet opgelost — zie addendum die dag). Niets van
dit alles gewijzigd, gecommit of gestaged door deze routine (werkregel 1). De reeds bestaande,
uncommitte `accepteerPlatformvoorwaarden()`-helper in `tests/lib.mjs` (van dezelfde WIP) is wél
**read-only hergebruikt** in het testscript van vandaag — dezelfde functie die de daily-test-routine
van 24 sep ook al gebruikte, dus geen nieuwe afhankelijkheid.

**Rotatiekeuze:** sector **mkb** (nog nooit eerder getest door déze routine — voorgaande dagen:
transport/Overname, bouw/Fusie, zorg/Opvolging, handel/Verkoop, itsoftware/PE-traject,
accountancy/Verkoop; mkb was eerder wel apart getest via een los testpakket op 20 augustus 2026, maar
niet via de volledige rol-/rechten-/workflow-dekking van déze dagelijkse routine), trajecttype
**Overname** (langst niet meer getest — laatst 18 sep), rollen verkoper/koper/tussenpersoon, fasen
Financieel + **Personeel & organisatie** ("partner"-fase-id, nog nooit eerder getest door deze
routine). Reden: brede sector-/trajecttype-/fase-rotatie, met verhoogde aandacht voor mkb omdat die
sector een bekende historische foutklasse heeft (veldkoppelingsbug 20 aug 2026, zie
`project_mkb_testpakket_v2`-geheugen) — werkregel 15.

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health-check 200 OK, `tests/.env.staging.local`
aanwezig). Testtraject `DAILY_QA_20260925` (fictief: "Warenhuis De Jonge-Bakker B.V.", retail/mkb),
aangemaakt/getest/opgeruimd via een los Node-testscript op basis van `tests/lib.mjs` (bouwstenen,
geen dubbel werk met `tests/e2e-api.mjs`/`run-rolflows.sh`).

**Doorlopen flow (klik → request → backend → database → response → resultaat), 44/44 checks OK:**
1. Traject aangemaakt (`/mna/create`, sector mkb, type Overname, admin-key) — 3 codes ontvangen.
2. **S1.2b-platformvoorwaarden-contract expliciet geverifieerd** (nog niet eerder als los contract
   getest door deze routine, alleen impliciet "geaccepteerd en toen werkte het" op 24 sep): vóór
   acceptatie geeft `/mna/traject/{code}` voor alle 3 rolcodes uitsluitend `rol` +
   `platform_voorwaarden_akkoord:false` + de voorwaardentekst terug — **geen** dossier
   (sector/traject_type/data), exact zoals de code-comments in `worker/00d-platformvoorwaarden-gate.js`
   en `worker/11-mna-tekenen-beheer.js` beloven. Ná acceptatie (voor alle 3 rollen, onafhankelijk
   geverifieerd via `/mna/platformvoorwaarden/status`) verschijnt het dossier alsnog correct
   (sector=mkb, traject_type=Overname, genest onder `traject.*`). **Eigen testfout onderweg (geen
   platformbug):** de eerste versie van dit testscript verwachtte het dossier al vóór acceptatie —
   faalde 6 checks, bleek na code-inspectie (`worker/00d-platformvoorwaarden-gate.js` regel ~65) een
   verkeerde aanname in het testscript zelf te zijn, precies zoals eerder op 20 sep 2026 gebeurde met
   een ander responsveld — zelfde geleerde les opnieuw bevestigd: eerst de daadwerkelijke
   response-vorm verifiëren vóór een assertie schrijven.
3. Onbekende code → 404, geen info-lek.
4. Fase Financieel: verkoper mag opslaan, koper 403, begeleider 403 (bekende regel); teruggelezen en
   waarde geverifieerd.
5. Fase **Personeel & organisatie** ("partner", mkb-specifiek, voor het eerst getest door deze
   routine): verkoper slaat aantalFte/sleutelpersonen/overdraagbaarheid op; koper 403; begeleider
   leest de opgeslagen waarden correct terug via een verse call (begeleider mag hier wél lezen, ook al
   mag hij niet opslaan).
6. Documentupload + echte AI-extractie: een realistische, meerdere-secties jaarrekening (bestuurs-
   verslag/balans met vergelijkende cijfers/W&V 3 jaar/kasstroom/grondslagen/toelichting/
   samenstellingsverklaring, geen kaal 1-pagina-document) voor een fictieve retailonderneming met
   **bewust een koppelteken in de kantoornaam** ("De Jonge-Bakker") — **P2-66-regressiecheck**: de op
   24 sep gefixte entiteitscheck (`worker/14-document-upload-analyse.js`) faalt niet opnieuw, upload
   slaagt (`verworpen:false`), fix houdt dus stand voor mkb. 121 extractiesleutels in de respons
   (grotendeels `null` voor niet-aanwezige info — **geen hallucinatie**, expliciet gecontroleerd op
   waardeniveau, niet alleen sleutelnamen: bijv. `nba_status`/`wwft`/`aandeelhoudersstructuur` — geen
   van alle in het document — kwamen terug als `null`, nooit als verzonnen waarde, conform werkregel 6
   GOUDEN STANDAARD). `_bron_fragmenten` en `_extractie_betrouwbaarheid:"gemiddeld"` correct meegegeven.
7. **P2-65-gerelateerde aanvullende controle (geen nieuwe bevinding, bevestiging van de bestaande
   code-analyse):** een los, gericht documentje met expliciete balanscijfers (eigen vermogen/
   balanstotaal/liquide middelen/kortlopende+langlopende schulden/debiteuren) liet zien dat **mkb**
   deze velden wél correct extraheert (alle 5 met de juiste waarde terug) — dit is precies wat
   `OPEN-BEVINDINGEN.md` P2-65 als stand van zaken beschrijft (mkb is de ENIGE sector met de
   `SECTOR_EXTRACTIE_EXTRA`-koppeling voor deze velden, sinds de fix van 20 aug 2026); de overige 8
   sectoren missen 'm nog steeds (code-niveau, niet vandaag opnieuw voor alle 8 herbevestigd — geen
   aanleiding, al twee keer runtime-bevestigd op 23/24 sep). Geen wijziging aan `OPEN-BEVINDINGEN.md`
   nodig anders dan deze bevestigende regel.
8. Reject-pad: een irrelevant document (menukaart, geen enkele relatie tot de onderneming) wordt
   correct verworpen, ook ná de P2-66-fix — bevestigt dat de fix de check niet heeft verzwakt.
9. Cross-traject-isolatie: een tweede, leeg traject (zonder platformvoorwaarden-acceptatie) bevat geen
   enkele data van het hoofdtraject — geen lek tussen trajecten.

**Gevonden fouten: 0.** Geen nieuwe platformbugs deze ronde — alle 44 checks slaagden na correctie van
de eigen testscriptfout in stap 2 hierboven (die faalde 6x vóór correctie, telt niet mee als
platformbevinding, zie werkregel 31/38-onderscheid: dit was code-niveau eigen-testfout, geen
runtime-platformgedrag).

**Niet getest deze ronde (expliciet, geen gok):** rollen meekijker/adviseur/eigen specialist (al
eerder gedekt op 20/21/24 sep, geen nieuwe aanleiding vandaag — werkregel 40 test-economy); sectoren
zorg/bouw/transport/handel/consultancy/verhuizingen/accountancy/itsoftware (niet aan de beurt); fasen
Compliance/IT/Juridisch/Strategisch voor mkb (Financieel + Personeel & organisatie waren vandaag de
prioriteit); concurrency (geen nieuwe aanleiding).

**Opgeruimd:** beide testtrajecten van vandaag verwijderd via `/admin/delete/mna/` op staging;
onafhankelijk geverifieerd met een directe D1-query
(`SELECT COUNT(*) FROM mna_trajecten WHERE kantoor_naam LIKE '%DAILY_QA_20260925%'` → 0). Het losse
debug-/verificatietraject van stap 2/6/7 hierboven (drie extra korte trajecten, gebruikt om de
gate-response-vorm en de P2-65-balansvelden te controleren) is ook telkens direct na gebruik
verwijderd via hetzelfde endpoint.

**Pushstatus:** geen nieuwe code-wijzigingen vandaag (alleen dit logboek + evt. `OPEN-BEVINDINGEN.md`),
dus geen nieuwe pushpoging ondernomen — de bestaande pushblokkade van 24 sep (Playwright-fails op
begeleider-login door de niet-gedeployde WIP-frontend van de platformvoorwaarden-gate) is een
onopgeloste, aan Marcel voorgelegde blokkade en niet opnieuw getest (zou toch hetzelfde resultaat
geven zolang die WIP niet is afgerond — werkregel 40 test-economy, geen zinloze herhaling).

**Score aan marilyn:** 100 (geen bevindingen deze ronde).

- 2026-09-26 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 26, geen dag 1–3).

## 2026-09-26 (vervolg) — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **consultancy** (nog nooit door deze routine getest; voorgaande dagen
transport/bouw/zorg/handel/itsoftware/accountancy/mkb), trajecttype **Fusie** (laatst 19 sep), rollen
verkoper/koper/begeleider/**meekijker** (meekijker laatst 20 sep, nu met een andere scope), fasen
Financieel + Klanten & contracten + Personeel & organisatie. Nieuw accent t.o.v. eerdere rondes:
**gefaseerde koper-toegang per categorie** (alleen `commercieel` vrijgegeven) en de documentpaden
van de koper (lijst + download), niet alleen de DD-data.

**Omgeving:** volledig tegen `kantoorinzicht-staging` (health 200). Fictief traject
`DAILY_QA_20260926` ("Adviesbureau Stroomlijn B.V."), los Node-script op basis van `tests/lib.mjs`.
Wrangler-OAuth was bij de eerste run verlopen (D1-query faalde met code 10000); ververste zichzelf,
tweede run normaal.

**Doorlopen (36 checks + 3 reproductiechecks):** create (sector/type teruggelezen); verkoper slaat
Financieel + Klanten & contracten op, koper en begeleider 403 op Financieel, DB-waarde onafhankelijk
via D1 bevestigd; koper zonder vrijgave ziet geen DD-data; koper- en verkopercode kunnen geen
categorie vrijgeven; vrijgave zonder NDA geblokkeerd (`nda_niet_getekend`); met force alleen
`commercieel` vrij → koper ziet commercieel, geen financieel, geen tussen_code; upload rijke
consultancy-jaarrekening (bestuursverslag/balans/W&V 3 jaar/kasstroom/grondslagen/toelichting) → AI
extraheert o.a. omzet 3 jaar, EBITDA 662.000, OHW 286.000, declarabiliteit 71, retainer 38, grootste
klant 14, en alle balansvelden (EV/balanstotaal/liquide/kort-/langlopend) correct (P2-65-correctie voor
consultancy op staging dus actief); geen accountancy-label in de analyse (P2-64); meekijker met scope
`commercieel`: aanmaken, dubbele aanmaak idempotent, verkopercode geweigerd, ziet alleen commercieel
(data én documenten), intrekken → direct 401; koper-vrijgave intrekken → koper ziet niets.

**Gevonden (1 platformbevinding): P1-93 / MASTER N-71** — autorisatiebevinding in de koper-documentpaden (koper kan onder bepaalde omstandigheden niet-vrijgegeven DD-documenten zien/downloaden). Runtime gereproduceerd op staging, productie draait dezelfde code (niet op productie gereproduceerd). Foutpropagatie uitgevoerd (backend-breed gegrept; meekijker- en versiepaden niet geraakt). Bewust geen mechanisme/regelnummers in dit publieke logboek zolang het open staat — volledige reproductie, oorzaak en fixopties in de lokale `OPEN-BEVINDINGEN.md` (P1-93). **Niet zelf gefixt:** autorisatie (werkregel 26 zone C) + productkeuze.

**Eigen testfouten (geen platformbug):** (1) assertie "koper-respons zonder checklist_json/notitie"
was fout: binnen een vrijgegeven categorie ziet de koper die bewust (Marcel 1 sep 2026, comment in
`worker/11-mna-tekenen-beheer.js:486`); de interne notitie uit het niet-vrijgegeven Financieel lekte
níet. (2) P2-64-regex matchte "accountantskantoor" uit de samenstellingsverklaring van mijn eigen
testdocument; na aanscherping groen.

**Niet getest:** adviseur/eigen specialist (21 sep gedekt), documentgeneratie en waardering (geen
aanleiding deze ronde, werkregel 40), UI-klikpad in de browser (alleen API), productie.

**Opgeruimd:** alle drie de staging-trajecten van vandaag via `/admin/delete/mna/` (200); D1-controle
`kantoor_naam LIKE '%DAILY_QA_20260926%'` → 0.

**Score aan marilyn:** 75 (1 bevinding, wacht op Marcel).

## 2026-09-30 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **verhuizingen** (de enige sector die deze routine nog nooit had getest),
trajecttype **Verkoop**, rollen verkoper/koper/begeleider, fasen Financieel + IT + Juridisch + Strategisch.
Nieuw accent ten opzichte van eerdere rondes: de **documentlevenscyclus per rol** (uploaden, lijst,
downloaden, verwijderen, herclassificeren, versies), met ook de acties die de UI voor een rol verbergt maar
die via de directe API aan te roepen zijn. Daarnaast een hertest van het bekende risico N-71/P1-93
(koper-documentpaden) en één teaser-generatie op een rijk gevuld traject (werkregel 30).

**Omgeving:** volledig tegen `kantoorinzicht-staging`. Fictief traject `DAILY_QA_20260930`
("Verhuizingen Zuidwest B.V."). Script lokaal, buiten git. Het wrangler-OAuth-token was bij de eerste
run weer verlopen (D1 code 10000) en ververste zichzelf bij de volgende aanroep, net als op 26 sep.

**Doorlopen (42 checks + 2 reproductiescripts):**
- Create: sector/type onafhankelijk via D1 bevestigd.
- Opslaan vóór platformvoorwaarden: 403.
- Verkoper slaat verhuizingen-velden op (wagenparkWaarde e.d.), DB bevestigd.
- Begeleider en koper krijgen 403 op Financieel, koper ook op IT. DB is ongewijzigd na de geweigerde pogingen.
- Uploads (IT-systemenoverzicht, huurovereenkomst): de AI-analyse is aanwezig en er staat geen accountancy-label in.
- Koper zonder vrijgave: ziet niets en een download geeft 403.
- Vrijgave van alleen IT: de koper ziet het IT-document en kan het downloaden (200). Het juridisch document geeft 403.
- N-71-hertest: een BEM-bestand in een wél vrijgegeven categorie blijft onzichtbaar en de download geeft 403 (fix houdt stand).
- Koper op versies/herclassificeren/koppel-entiteit: 403/401/401.
- Begeleider herclassificeert (DB bevestigd) en ziet de versies. De verkoper verwijdert een eigen document (DB bevestigd).
- Teaser: koper en verkoper krijgen 401. Voor de begeleider werkt het; de teaser gaat over een verhuisbedrijf,
  zonder bedrijfsnaam, zonder exacte omzet en zonder accountancy.

**Gevonden (1 platformbevinding, 3 plekken): P1-94 / MASTER N-85.** Autorisatiebevinding in
schrijfacties op de dataroom via de directe API (de koper kan acties uitvoeren die de UI voor hem
verbergt). Runtime gereproduceerd op staging; productie draait dezelfde code (niet op productie
gereproduceerd). Foutpropagatie is uitgevoerd over de verwante document-, save- en bankmutatieroutes.
Mechanisme en regelnummers staan bewust niet in dit publieke logboek zolang het open staat. De volledige
reproductie en de klaarliggende patch staan lokaal in `OPEN-BEVINDINGEN.md` P1-94.
**Niet zelf gefixt:** dit is autorisatie (zone C, Breaker-review verplicht), en de backend-werkboom bevat
veel niet-gecommitte wijzigingen die een deploy zou meenemen (werkregel 44.4). Er is dus niets gedeployed,
niet naar staging en niet naar productie.

**Eigen testfouten (geen platformbug):** een verkeerde kolomnaam (`analyse_json` in plaats van `analyse`) en
een verkeerde tabelnaam in het reproductiescript. Beide zijn gecorrigeerd of bleken niet nodig.

**Niet getest:** adviseur, meekijker en eigen specialist (niet aan de beurt), waardering/dealvoorstel,
het UI-klikpad in de browser (alleen API), productie, en `upload-base64` voor de koper (alleen
code-niveau).

**Opgeruimd:** alle 5 staging-trajecten van vandaag via `/admin/delete/mna/` (ok:true). D1-controle
`kantoor_naam LIKE '%DAILY_QA_20260930%'` gaf 0.

**Score aan marilyn:** 75 (1 bevinding, wacht op Marcel).

- 2026-10-01 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken. Wachtrij leeg (`{"ok":true,"opdracht":null}`). Vandaag is dag 1 (binnen het venster), maar de laatste `diepe_audit` in het dashboard is van 6 sep 2026 17:23 (24,5 dagen, worker meldt `dagen_geleden: 24`), dus niet >25 dagen: geen zelf-aanvraag. Bij ongewijzigde stand valt de run van 3 okt wél over de grens (26,5 dagen). Procesnotitie: de `ADMIN_KEY` die de scheduled-task-shell erft gaf 401; na `source ~/.zshrc` gaf dezelfde aanroep 200 (verouderde waarde in de geërfde omgeving, geen platformprobleem).

## 2026-10-01 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **transport** (het langst geleden getest: 18 sep), trajecttype **Opvolging** (alleen
op 20 sep gebruikt), rollen **adviseur** (extern traject via `/adviseur/create`, laatst 21 sep), verkoper,
koper en begeleider (tussen-key), fasen Financieel + Compliance. Nieuw accent: de **closing-checklist**
(eigen punten, aanvinken, verwijderen, concurrency, cross-traject) en de **Q&A-levenscyclus** (vraag →
antwoord → reactie, categoriefilter, intrekken), beide nog nooit door deze routine getest. Daarnaast de
begeleider-only routes per rol en een hertest van het bekende risico P1-94 (werkregel 15).
Script: `reports/daily-qa/daily-qa-20261001.mjs` (alleen staging).

**Resultaat: 73 van 74 checks geslaagd.** Doorlopen (klik-equivalent → request → backend → D1 → response):
- Adviseur uitgenodigd, geactiveerd, GV geaccepteerd; twee externe trajecten aangemaakt. D1 bevestigt sector
  transport, type Opvolging, sell-side en koppeling aan de adviseur. Adviseur ziet beide trajecten in het
  adv-overzicht.
- Verkoper slaat financieel op (teruggelezen uit D1). Upload van een wagenpark-/vergunningenoverzicht met
  echte AI-analyse: de analyse stelt correct vast dat er geen gerealiseerde financiële cijfers in staan en
  laat de financiële velden leeg (geen gok, werkregel 6).
- Closing-checklist, infofase, waarderingsgeschiedenis, documentdekking en biedingen: begeleider 200;
  verkoper-code, koper-code, geen sleutel en de begeleider van een ander traject worden geweigerd; admin-key
  krijgt op een extern traject geen bodgegevens (muur).
- Closing-checklist: twee verschillende items gelijktijdig aangevinkt (beide bewaard, geen verloren update);
  hetzelfde item 4x gelijktijdig (precies 1 rij); uitvinken bewaard; verkoper en koper kunnen niet vinken;
  3 eigen punten gelijktijdig toegevoegd (precies 3 rijen); 301 tekens en lege tekst → 400; eigen punt is
  zichtbaar met vinkstatus; verwijderpoging vanuit een ander traject laat het punt staan; verwijderen haalt
  punt én vinkstatus weg. UI-escaping van de punttekst gecontroleerd in `mna/04` (code-niveau).
- Q&A: koper stelt 3 vragen (nummers 1, 2, 3); lege vraag → 400; begeleider antwoordt; verkoper-code en
  begeleider van een ander traject kunnen niet antwoorden; koper reageert in de thread; koper van een ander
  traject → 404, ongeldige code → 401. Koper ziet alleen de vraag in de vrijgegeven categorie plus de
  algemene vraag, met antwoord en reactie; verkoper ziet alle 3; koper van een ander traject ziet niets;
  admin-key op extern traject krijgt een lege lijst. Na intrekken van de categorie verdwijnt de bijbehorende
  vraag voor de koper.

**Gevonden: geen nieuwe bevinding.** De enige rode check is de **bekende open bevinding P1-94 / MASTER N-85**,
vandaag opnieuw runtime gereproduceerd op staging, nu ook op een **extern adviseurstraject** (eerder alleen
op een eigen traject). Details staan lokaal in `OPEN-BEVINDINGEN.md` P1-94. Niet zelf gefixt (zone C,
Breaker-review verplicht). Wel veranderd sinds 30 sep: de backend-werkboom is nu schoon (laatste commit
`61a3755`), dus de tweede reden om niet te deployen (werkregel 44.4) is vervallen.

**Infra (geen productbevinding):** de eerste run brak af op tijdelijke netwerk-/D1-onbereikbaarheid vanaf
deze machine (`fetch failed`, D1-timeout). Achtergebleven testdata direct opgeruimd; tweede run volledig.

**Niet getest:** meekijker en eigen specialist (niet aan de beurt), waardering/dealvoorstel en
documentgeneratie, het UI-klikpad in de browser (alleen API + code-review van de renderfunctie), productie.

**Opgeruimd:** alle 4 staging-trajecten van beide runs via `/admin/delete/mna/` (ok:true), beide
testadviseurs via `/gebruikers/verwijder/`. D1-controle `kantoor_naam LIKE '%DAILY_QA_20261001%'` gaf 0.

**Score aan marilyn:** 75 (geen nieuwe bevinding; bekende P1-94 nog open en wacht op Marcel).
- 2026-10-02 — diepe-audit-routine: geen open aanvraag (`{"ok":true,"opdracht":null}`, AUDIT_TRIGGER_KEY werkt). Dag 2 valt in het venster; volgens de notitie van 1 okt was de laatste `diepe_audit` op 6 sep 17:23, dus om 06:13 vandaag ~25,5 dagen (worker rondt af op 25 dagen, niet >25). Cadans kon niet live worden bevestigd en een zelf-aanvraag kon niet worden ingediend: `ADMIN_KEY` uit `~/.zshenv` geeft 401 op `/mna/admin/veiligheid/overzicht`, ook na `source ~/.zshrc` (gisteren nog 200, vermoedelijk geroteerd). Geen audit uitgevoerd, niets gewijzigd. Actie Marcel: lokale `ADMIN_KEY` in `~/.zshenv` bijwerken naar de huidige Cloudflare-waarde; de run van 3 okt valt hoe dan ook over de grens (~26,5 dagen) en heeft die sleutel nodig om zelf de aanvraag in te dienen (of Marcel klikt "Draai diepe audit nu" in marilyn).

## 2026-10-02 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **bouw** (het langst geleden getest: 19 sep), trajecttype **Overname** (het langst
geleden: 18 sep), `opdrachtgever_rol:"koper"` (koperszijde), rollen adviseur (extern traject), verkoper, koper,
begeleider en **eigen specialist**. Accent: de volledige review-/aftekenflow van de eigen specialist (opdracht →
accepteren → dossier → aftekenen via de pool-tokenmachinerie), die op 21 sep expliciet als "niet getest" stond.
Script: `reports/daily-qa/daily-qa-20261002.mjs` (alleen staging).

**Doorlopen (51 checks eerste run):** adviseur + 2 externe trajecten (D1: bouw/Overname/koper); verkoper slaat
financieel op (teruggelezen) en uploadt een orderportefeuille (echte AI-analyse, correct herkend als operationeel
brondocument); TOS activeren en MoU maken (verkoper/koper geweigerd); eigen specialist toevoegen (koper en
ADMIN_KEY-als-?code= geweigerd, fee 50 zonder identiteit in omschrijving, admin-lijst 403, begeleider B ziet niets);
review-opdracht (admin 403, begeleider B kan specialist van A niet hergebruiken, koper 403, lege scope 400,
conflictsignaal C1 correct met bevestiging); specialist: token, ongeldig token 403, dossier/aftekenen vóór
accepteren geweigerd, 3x gelijktijdig accepteren → precies 1x 200, dossier zonder VALUATION-onderdelen, 2x
gelijktijdig aftekenen → precies 1x 200, 16 APPROVED reviews, 1 pool_reviews-rij, geen pool-fee; admin-overzichten
maskeren/sluiten uit; afgeronde review niet intrekbaar; intrekken specialist blokkeert nieuwe opdrachten.

**Gevonden en (op staging) opgelost:**
1. **P1-95 / N-111 — privacy-invariant 12:** `GET /mna/tos/document/{id}` met `x-admin-key` gaf na aftekenen de
   naam en het inschrijvingsnummer van de eigen specialist terug (runtime gereproduceerd). Oorzaak: niet-externe
   aanroepers kregen de ruwe review-rij. Fix: admin krijgt nooit `reviewer_naam` (geen frontend leest dit veld).
2. **N-112 — onjuiste tekst:** aftekening door een eigen specialist kreeg ", via de Koers voor Morgen-pool" in de
   hoedanigheid (zichtbaar voor partijen). Fix: alleen bij poolspecialist.
   Backend-branch `fix/daily-qa-20261002-eigen-specialist`, commit `896346a`, **staging `f55fa6b2`**, niet naar
   productie (zone C, Breaker-review + akkoord Marcel nodig). Hertest: 47/49 groen, naam weg voor admin.
   **Foutpropagatie:** alle lees-paden van `reviewer_naam`/`reviewer_hoedanigheid` gegrept (backend + mna/adv/
   marilyn): alleen 31-tos.js (document-GET, manifest met alleen hoedanigheid) en 32-pool.js; geen PDF/ZIP-export
   en geen frontend gebruikt de naam. Restant: het inschrijvingsnummer zit in de hoedanigheid en blijft voor
   admin zichtbaar (beslissing Marcel, N-112).
   **Regressie:** `tests/e2e-tos.mjs` 228/228 na een testcorrectie: de test tekende de NDA direct na versturen,
   terwijl de tekengate sinds 21 sep eerst akkoord van de partijen vraagt (2 rode checks, testfout, niet door
   deze fix; test aangevuld met de akkoord-stap).

**Gevonden, niet zelf gewijzigd (wacht op Marcel):** N-113 / P3-70 — een al uitgegeven reviewtoken blijft werken
nadat de begeleider de eigen specialist intrekt (geen UI-knop, alleen API); `specialist.html` toont
platformbeheerde/niet-domein-onderdelen blijvend als "te beoordelen".

**Infra:** eerste run: MFA-bypass via wrangler faalde eenmalig (tijdelijk), flow liep door; één D1-retry.

**Niet getest:** meekijker (niet aan de beurt), poolspecialist (alleen eigen), waardering/dealvoorstel, het
UI-klikpad in de browser (alleen API + code-lezing van specialist.html), productie.

**Opgeruimd:** 4 staging-trajecten (2 runs) via `/admin/delete/mna/` (ok:true), beide testadviseurs. D1-controle
trajecten/gebruikers/eigen specialisten met `DAILY_QA_20261002` = 0/0/0. **Let op:** staging draait nu de
fix-branch (`f55fa6b2`); een volgende `scripts/deploy.sh` vanaf main zet dat terug.

**Score aan marilyn:** 55 (2 fouten zelf opgelost op staging −20, 1 bevinding wacht op Marcel −25).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale ADMIN_KEY (zelfde oorzaak als de diepe-audit-notitie van vandaag, N-110).
- 2026-10-03 — diepe-audit-routine: geen open aanvraag; cadans verstreken (laatste diepe audit 6 sep, 27 dagen). Zelf-aanvraag en terugmelding onmogelijk (ADMIN_KEY 401, N-110), daarom de begrensde ronde lokaal gedraaid zonder aanvraag-id. Alle statische checks groen; P1-94 fix staat op main maar niet in productie; score 60/100. Rapport `tests/rapporten/diepe_audit-20261003.html`. Score staat NIET in het marilyn-dashboard.

## 2026-10-03 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **zorg** (het langst geleden: 20 sep), trajecttype **Fusie** (het langst geleden: 19 sep),
sell-side, extern adviseurstraject. Rollen adviseur, verkoper, koper, begeleider en **meekijker** (laatst 26 sep). Accent:
meekijker-levenscyclus gecombineerd met dossier-vrijgave + zacht verwijderen, en de **waarderingsrapport-flow** per rol
(stond bij elke eerdere run als "niet getest"). Script: `reports/daily-qa/daily-qa-20261003.mjs` (alleen staging).

**Resultaat: 48 van 50 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: zorg/Fusie/verkoper/adviseur); verkoper
slaat financieel op en uploadt 2 documenten (echte AI-analyse, beide met analyse in D1); meekijker aanmaken (zonder
toestemming 400, koper-/verkopercode en begeleider B geweigerd, 2 fee-events); voorwaarden-gate (data vóór akkoord 403);
meekijker ziet financieel zonder checklist/notitie; POST op viewer-route 405; viewer-code via /mna/save wijzigt niets;
scope financieel strikt; geen r2_key; viewerlijst cross-traject geweigerd; dossier vrijgeven + zacht verwijderen (D1
verwijderd=1, verkoperlijst toont het niet); rapport-genereren en waardering-geschiedenis geweigerd voor koper, verkoper,
begeleider B en (muur) admin; begeleider genereert waarderingsrapport met echte AI (10 verplichte koppen, aangeleverde
waarde 1.755.000 genoemd, geen accountancy-norm in een zorgtraject); koper kan rapporten niet lezen; intrekken
(begeleider B geweigerd, ingetrokken code 401, andere meekijker blijft werken).

**Gevonden (2, beide runtime gereproduceerd op staging, niet zelf gewijzigd):**
1. **P1-96 / MASTER N-118** — autorisatie-/integriteitsbevinding rond de waarderingsrapport-flow (een rol buiten de
   begeleider kan iets wegschrijven dat de begeleider daarna te zien krijgt). Zone C. Bewust geen mechanisme in dit
   publieke logboek zolang het open staat; reproductie, oorzaak, foutpropagatie en fixvoorstel staan lokaal in
   `OPEN-BEVINDINGEN.md` P1-96 en de MASTER.
2. **P2-67 / MASTER N-119** — de meekijker ziet documenten die de verkoper na dossier-vrijgave heeft verwijderd.
   Minimale patch klaar (lokaal, `reports/`), past schoon op backend-HEAD. Foutpropagatie: andere lees-paden nemen
   verwijderde stukken ook mee (mogelijk bewust, beslissing nodig), details lokaal.

**Niet gedeployed, waarom:** staging stond op de "bewezen stagingversie" van de N-100-releasegate (2 okt) en de
backend-werkboom bevat niet-gecommitte wijzigingen van een andere sessie (werkregel 44.4). Beide fixes raken een
rolgrens (zone C) en vragen Breaker-review + akkoord.

**Infra:** Sleutelhanger-sleutel en `ADMIN_KEY` uit `tests/.env.staging.local` geven op staging 401; `STAGING_ADMIN_KEY`
werkt (aanvulling bij N-117). Productie-`ADMIN_KEY` gaf eerder 401 (N-110).

**Niet getest:** teaser/verkoopmemorandum/dealvoorstel-generatie, de weergave van bevinding 1 in een echte browser
(mna.html wijst naar de productie-worker), koper-Q&A en biedingen (eerder gedekt), eigen specialist, productie.

**Opgeruimd:** beide trajecten via de staging-opruimroute (ok), testadviseur verwijderd; D1-controle trajecten en
meekijkers met `DAILY_QA_20261003` = 0/0.

**Score:** 50 (2 bevindingen niet zelf opgelost, −25 elk).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale productie-ADMIN_KEY (N-110, ongewijzigd).

- 2026-10-04 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 4, buiten 1e-3e-venster).

## 2026-10-04 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **handel** (het langst geleden: 21 sep), trajecttype **PE-traject** (het langst geleden: 23 sep),
sell-side, extern adviseurstraject. Rollen adviseur, verkoper, koper en begeleider. Accent: **teaser- en
verkoopmemorandum-generatie** op een rijk gevuld traject (stond bij elke eerdere run als "niet getest"; bekende
foutklasse max_tokens/timeout, werkregel 15) en de **koper-Q&A-levenscyclus** (vraag, beheer, antwoord, reactie,
categorie-intrekking). Scripts: `reports/daily-qa/daily-qa-20261004*.mjs` (alleen staging).

**Hoofdrun: 53 van 56 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: handel/PE-traject/verkoper/adviseur);
verkoper slaat 51 velden over 7 fases op (teruggelezen); teaser: koper/verkoper/begeleider B/ADMIN_KEY (muur) geweigerd,
begeleider genereert met echte AI (209 woorden, anoniem, omzetklasse i.p.v. exacte omzet, onbewerkt opslaanbaar, fee 1x);
verkoopmemorandum: koper/verkoper/begeleider B geweigerd, zonder NDA-bevestiging of zonder naam 400, met bevestiging 200
(bedrijfsnaam + aangeleverde omzet, verplichte koppen, binnen 2000 woorden, NDA-spoor in D1); koper kan teaser/VM niet
opslaan of versturen; Q&A: eigen nummering per traject, beheer/antwoord door koper en begeleider B geweigerd, reactie
cross-traject geweigerd, categorie-intrekking verbergt de vraag voor de koper, verkoper ziet alles, admin-muur leeg.
Rode checks: MFA-bypass via wrangler (tijdelijk, flow liep door), een te strikte teaser-regex in mijn eigen test
("tussen de €5 en €10 miljoen" is correct; testfout, geen platformfout), en de Q&A-check die tot bevinding 1 leidde.
Twee gerichte vervolgruns (werkregel 40: één run per open vraag).

**Gevonden (2, beide runtime gereproduceerd op staging):**
1. **P0-1 / MASTER N-120** — rolgrensbevinding: externe rollen kunnen een auth-sleutel van een andere rol bemachtigen.
   Zone C. Bewust geen mechanisme in dit publieke logboek zolang het open staat; reproductie, foutpropagatie (33
   GET-routes gescand) en lekpaden lokaal in `OPEN-BEVINDINGEN.md` P0-1 en de MASTER. Deel van de fix gebouwd op
   backend-branch `fix/daily-qa-20261004-n120` (`96910d3`), lokaal bewezen tegen de gepatchte worker (14/14, audit-backend
   schoon, policy-equivalentie 133/133); de rest vraagt een besluit van Marcel.
2. **P2-80 / MASTER N-121** — verkoopmemorandum-generatie duurt bij een rijk traject 57 s (51 velden) en 62 s (82
   velden), terwijl de knop na 60 s afbreekt; geldt voor meer AI-knoppen met 16k-tokenbudget. Ontwerpkeuze (langere
   timeout / streaming / achtergrondtaak), niet zelf gewijzigd.

**Observatie (geen bevinding):** via de directe API kan de koper een vraag stellen in, of reageren op een vraag uit, een
niet-vrijgegeven categorie (200); de UI biedt dat niet aan en er komt geen inhoud terug.

**Niet gedeployed, waarom:** staging staat op de N-100-releasegate-versie, de backend-werkboom bevat niet-gecommitte
wijzigingen van een andere sessie (werkregel 44.4, daarom geïsoleerde worktree), en de fix raakt een rolgrens (zone C:
Breaker-review + akkoord). Bij P0 wél aandacht vandaag nodig.

**Niet getest:** browser-klikpad (mna.html wijst naar de productie-worker), teaser/VM-verzending per mail (verstuurt echte
mail), dealvoorstel/SPA/bieding-generatie (zelfde timeout-risico, niet apart gemeten), meekijker/eigen specialist op alle
GET-routes, productie.

**Opgeruimd:** 4 staging-trajecten over 3 runs via de opruimroute (ok), 3 testadviseurs verwijderd; D1-controle trajecten
en Q&A-rijen met `DAILY_QA_20261004` = 0/0. Lokale testworker en worktree verwijderd.

**Score:** 50 (2 bevindingen niet volledig zelf opgelost, −25 elk).

- 2026-10-08 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 8, geen dag 1–3).

## 2026-10-08 — dagelijkse-knoppentest-routine (scheduled task) — AFGEBROKEN (infra)

**Rotatiekeuze:** sector **itsoftware** (het langst geleden: 23 sep), trajecttype **Verkoop** (laatst 30 sep),
**kopers-zijde** (`opdrachtgever_rol: koper`, laatst 19 sep), extern adviseurstraject. Accent: indicatieve
biedingsbrief en SPA-generatie met echte AI (stonden bij elke eerdere run als "niet getest"; bekende foutklasse
max_tokens/60s-timeout, N-121) + hertest van P0-1 (bekend risico, werkregel 15). Script:
`reports/daily-qa/daily-qa-20261008.mjs` (alleen staging; klaar voor een herhaalrun).

**Wat gebeurde:** adviseur uitgenodigd en 2 trajecten aangemaakt (beide 200). Daarna faalde elke D1-stap:
de wrangler-OAuth-login is verlopen (7 okt 20:21 UTC) en kan in een niet-interactieve sessie niet worden ververst
(`wrangler whoami`). Zonder D1 werken MFA-bypass, DB-controles en de opruimhelpers niet; het script brak af vóór
de eigenlijke tests. **Geen productbevindingen** (er is niets inhoudelijks getest).

**Infra-bevinding:** MASTER **N-122** (wrangler-login verlopen, onbewaakte routines kunnen D1 niet lezen). Niet zelf
op te lossen: vraagt een interactieve `wrangler login` of een besluit over een eigen staging-token.

**Niet opgeruimd (wacht op N-122):** 2 staging-trajecten + 1 testadviseur `DAILY_QA_20261008`. Via de API niet op te
ruimen (admin-lijst geeft door de muur geen codes; adviseur-login vraagt MFA, staging verstuurt geen mail).
Opruimscript klaar: `reports/daily-qa/opruim-20261008.mjs` (na `npx wrangler login`). Geen productiedata geraakt.

**Niet getest:** alles behalve traject aanmaken (bieding, SPA, biedingen-vergelijk, P0-1-hertest, upload).

**Score:** 75 (1 bevinding niet zelf op te lossen, −25).
- 2026-10-09 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 9, niet 1e-3e van de maand).

## 2026-10-09 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** de gisteren afgebroken combinatie opnieuw: sector **itsoftware**, trajecttype **Verkoop**,
**kopers-zijde** (`opdrachtgever_rol: koper`). Rollen verkoper, koper, begeleider A en begeleider B. Accent:
**indicatieve biedingsbrief en SPA met echte AI** (stonden nog nooit als getest) + hertest P0-1/N-120 (bekend risico,
werkregel 15). Script: `reports/daily-qa/daily-qa-20261009.mjs` (alleen staging).

**Aangepaste opzet wegens N-122 (wrangler-login nog steeds verlopen, `wrangler whoami` 9 okt):** D1-vrije variant.
Eigen (platform)trajecten via `/mna/create` met de staging-admin-sleutel (die geeft de tussen_code terug), read-back via
de API in plaats van D1, opruimen via `/test/opruimen` met die tussen_code. Gevolg: extern adviseurstraject en adviseur-
rol vandaag niet getest (adviseur-login vraagt MFA-bypass via D1).

**Resultaat: 46 van 47 checks geslaagd.** Doorlopen: 2 trajecten (read-back itsoftware/Verkoop/buy-side, koper_naam met
"&" ongeëscaped); verkoper slaat 40 velden over 4 fases op (teruggelezen); koper kan verkoperdata niet overschrijven;
upload IT/SLA-overzicht met echte AI-analyse (in documentlijst, geen r2_key). Biedingsbrief: koper/verkoper/begeleider B
geweigerd, zonder EBITDA 400, begeleider genereert in 22 s (bandbreedte 6.900.000–8.050.000, EBITDA en multiple juist,
geen verzonnen bedragen, geldigheid + 8 weken exclusiviteit, expliciet indicatief); koper kan niet versturen, begeleider
zonder interne goedkeuring 400. SPA: koper/verkoper/begeleider B en cross-traject geweigerd; begeleider genereert in 71 s
(10.823 tekens, partijen correct, zonder dealvoorstel geen verzonnen koopsom, placeholders blijven staan). Biedingen-
vergelijk: koper en begeleider B geweigerd, begeleider A "geen_groep". P0-1-hertest: 5 koper-GET-routes geven geen
verkoper- of begeleidercode terug (bevestigt de N-120-fix op staging).

**De ene rode check is een testfout, geen platformfout:** mijn script toetste nog aan de oude 60 s-frontendtimeout. De
SPA-knop wacht in productie al 180 s (N-121, gecontroleerd in de live `mna/04-begeleider-dashboard.js`), dus 71 s rondt
af. Drempel in het script naar 180 s gezet; niet opnieuw gedraaid (werkregel 40, het bewijs staat).

**Observatie (geen productbevinding):** de N-121-fix (`03b3aab`) staat op branch `codex/weekend-option2` en niet op de
lokale `main`; lokale `main` toont dus nog 60 s terwijl productie 180 s heeft. Wie vanaf `main` naar productie publiceert,
zou die fix terugdraaien. Ter controle voor Marcel/Bridge-releasepad.

**Gevonden:** geen bevindingen binnen de geteste combinatie vandaag. Dat betekent niet dat het platform foutloos is.

**Niet getest:** adviseur-rol en extern adviseurstraject (N-122), D1-controles op database-niveau (alleen API-read-back),
browser-klikpad, bieding-verzending per mail, meekijker/eigen specialist, productie.

**Opgeruimd:** beide `DAILY_QA_20261009`-trajecten via de opruimroute (ok, daarna niet meer opvraagbaar). **Nog niet
opgeruimd:** de 2 trajecten + 1 testadviseur `DAILY_QA_20261008` (wacht op N-122, `reports/daily-qa/opruim-20261008.mjs`).

**Score:** 100 (geen bevindingen).
Melding aan marilyn (stap 5b): gelukt (200) met de productiesleutel uit de Sleutelhanger (`kantoorinzicht-production-admin-key`); de `ADMIN_KEY` uit de shell-omgeving gaf 401 en is dus verouderd.

- 2026-10-10 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 10, niet 1e-3e van de maand).

## 2026-10-10 — dagelijkse-knoppentest-routine (scheduled task)

**Vooraf:** wrangler-login werkt weer (MASTER N-122/P2-81 punt 1). `reports/daily-qa/opruim-20261008.mjs` gedraaid:
2 trajecten + 1 testadviseur `DAILY_QA_20261008` verwijderd, 0 restanten (4/4).

**Rotatiekeuze:** sector **accountancy** (het langst geleden: 24 sep), trajecttype **Opvolging** (het langst geleden: 1 okt),
sell-side, extern adviseurstraject. Rollen adviseur, verkoper, koper, begeleider A/B en **meekijker** met fase-scope
compliance. Accent: accountancy-compliancefase (NBA, kwaliteitstoetsing, Wwft, tuchtzaken), fase-afronden/-status en
dossier-vrijgave per rol (niet eerder door deze routine getest), plus hertest van eerdere bevindingen (werkregel 15):
N-119 (meekijker + zacht verwijderd) en N-120 punt 4 voor de meekijker (document-id's). Script:
`reports/daily-qa/daily-qa-20261010.mjs` (alleen staging; staging-Worker versie 3eb20baf, 10 okt 01:12 UTC).

**Resultaat: 34 van 35 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: accountancy/Opvolging/sell-side, "&" in
naam ongeëscaped); verkoper slaat compliance + partner op (D1-read-back); koper en begeleider B kunnen niet schrijven;
upload compliancedossier (verkoper) en opvolgingsnotitie (begeleider, tussen_code), beide met echte AI-analyse (analyse
herkent de entiteit, noemt de toetsing 2023 en "geen lopende tuchtzaken", geen verzonnen claim); documentdekking: koper
en begeleider B geweigerd. Fase afronden: verkoper zichtbaar in fase-status; koper-code rondt geen verkoperfase af;
niet-bestaande code geweigerd zonder rij in `mna_fase_status`. Meekijker: begeleider B en koper kunnen er geen maken;
info/data lekken geen codes; scope compliance toont alleen compliance-data en het ene compliancedocument zonder r2_key.
Dossier-vrijgave: koper-code geeft niets vrij (D1 `verkoper_klaar` blijft 0), verkoper wel; verwijderen na vrijgave is
zacht. **Hertests groen op staging:** N-119 (meekijker ziet het zacht verwijderde document niet meer) en N-120 punt 4
(document-id's bij de meekijker bevatten geen verkopercode of tussen_code). Intrekken → meekijker 401.

**De ene rode check is een testfout:** ik verwachtte de compliancefase in `/mna/documentdekking/`, maar die toont alleen
fases met `vereisteDocumenten`, en accountancy-compliance heeft er geen (sectorprofiel). Endpoint gaf 200 met de juiste
fases. Script aangepast (check op partner); niet opnieuw gedraaid (werkregel 40).

**Observatie (administratief, geen productbevinding):** master-ID **N-122** is dubbel in gebruik (tabelregel ~128 =
Marilyn-groepsverwijderactie, DONE; sectie verderop = wrangler-login). Genoteerd bij het item, niet hernummerd.

**Gevonden:** geen bevindingen binnen de geteste combinatie vandaag. Dat betekent niet dat het platform foutloos is.

**Niet getest:** browser-klikpad, documentgeneratie (niet aan de beurt), mailverzending (dossier-vrijgave-mail), eigen
specialist, N-119/N-120 op productie, AI-veldextractie naar het formulier (frontend `autoFillFromExtraction`).

**Opgeruimd:** beide `DAILY_QA_20261010`-trajecten, testadviseur, meekijker en de testrij `mna_fase_status` (D1-controle 0).

**Score:** 100 (geen bevindingen).
- 2026-10-11 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 11, buiten venster 1e–3e).

## 2026-10-11 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **mkb** (het langst geleden: 25 sep), trajecttype **Overname** (het langst geleden: 2 okt),
`opdrachtgever_rol:"verkoper"` (2 okt was koperszijde), rollen adviseur (extern traject), verkoper, koper, begeleider
en **eigen specialist** (bekend risico: leverde 2 okt N-111/N-112/N-113 op, werkregel 15). Fases commercieel +
juridisch. Script: `reports/daily-qa/daily-qa-20261011.mjs` (alleen staging).

**Resultaat definitieve run: 40 van 40 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: mkb/Overname/
verkoperszijde); verkoper slaat commercieel en juridisch op (D1-read-back); koper kan niet schrijven of uploaden;
begeleider B schrijft alleen in traject B, A blijft ongewijzigd; begeleider kan Financieel niet schrijven (403).
Upload van een CSV-klantenoverzicht en een fiscale notitie, beide met echte AI-analyse. Die analyse zegt terecht dat
de entiteit niet in de CSV zelf staat ("kan niet uit het document zelf worden bevestigd": nooit-gokken correct) en
noemt de fiscale notitie geen brondocument met gerealiseerde cijfers. TOS + MoU; eigen specialist: verkoper en
ADMIN_KEY als `x-tussen-key` geweigerd bij toevoegen en lijst; verkoper kan geen opdracht aanvragen; onbekend domein
400; opdracht kosten 0; specialist ziet mkb/Overname, accepteert, dossier zonder VALUATION en zonder verkoper-/koper-/
tussen_code; aftekenen = aantal LEGAL-onderdelen = APPROVED-rijen in D1.
**Hertests (bekend risico) groen op staging:** N-111 (admin `GET /mna/tos/document/{id}` toont geen naam en geen
inschrijvingsnummer; admin opdrachten-detail gemaskeerd), N-112 (hoedanigheid zonder "pool"). Kanttekening N-112: de
hoedanigheid bevat nog het inschrijvingsnummer (open beslissing Marcel, ongewijzigd).

**Eerste run: 1 rode check = testfout.** Mijn negatieve test "begeleider B schrijft in A" stuurde de verkopercode van
A in de body mee; `/mna/save` autoriseert op `body.code` (`worker/11-mna-tekenen-beheer.js:743`) en negeert de
header, dus dit was gewoon de verkoper. Geen lek. Script gecorrigeerd; daarnaast een kolomnaamfout in de
documentquery (`bestand_naam`). Tweede run was nodig omdat de eerste vóór het TOS-/specialistdeel afbrak.

**N-113 niet conclusief:** het token van een tweede opdracht gaf na intrekken van de specialist 403, maar het script
controleerde niet of die tweede opdracht echt was aangemaakt (leeg token geeft ook 403). Code-niveau: `magPool()` in
`worker/32-pool.js` controleert de status van de eigen specialist nog steeds niet, dus N-113 blijft open (BLOCKED
MARCEL, ongewijzigd). Script aangevuld zodat dit voortaan zichtbaar is; niet opnieuw gedraaid (werkregel 40).

**Observatie (niet aangeraakt):** MoU bevat geen TAX-onderdelen (LEGAL 18, VALUATION 1, NONE 1), dus een fiscale eigen
specialist kan op een MoU alleen een LEGAL-opdracht krijgen. Geen fout, wel ter info. Backend-werkboom staat op branch
`fix/daily-qa-20261002-eigen-specialist` met niet-gecommitte WIP (N-114 beheerdersmuur in 32-pool.js, N-100 in
24-veiligheidsdashboard.js) van een andere sessie; niet aangeraakt.

**Gevonden:** geen bevindingen binnen de geteste combinatie vandaag. Dat betekent niet dat het platform foutloos is.

**Niet getest:** browser-klikpad, documentgeneratie, TAX-domein (geen TAX-onderdelen in MoU), N-113 conclusief,
mailverzending, meekijker, productie.

**Opgeruimd:** 4 staging-trajecten (2 runs) en 2 testadviseurs; D1-controle trajecten/specialisten/gebruikers met
`DAILY_QA_20261011` = 0/0/0.

**Score:** 100 (geen bevindingen).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale ADMIN_KEY (zelfde oorzaak als N-110). Score staat NIET in het marilyn-dashboard.
- 2026-10-12 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 12, buiten venster 1–3).
- 2026-10-13 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (13e van de maand).

## 2026-10-13 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **consultancy** (het langst geleden: 26 sep), trajecttype **Fusie** (het langst geleden: 3 okt),
`opdrachtgever_rol:"koper"`, extern adviseurstraject; rollen adviseur, verkoper, koper, begeleider A/B. Accent:
**documentgeneratie (teaser)**, die al weken bij "niet getest" stond. Script: `reports/daily-qa/daily-qa-20261013.mjs`
(alleen staging, één run, twee AI-aanroepen: teaser + documentanalyse).

**Resultaat: 33 van 33 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: consultancy/Fusie/koperszijde);
teaser vóór data → 400 met lijst ontbrekende velden; verkoper vult financieel/commercieel/partner/strategisch
(D1-read-back); koper kan niet schrijven. Teaser-rolgrenzen: zonder header 401, koper-code en verkopercode als
tussen-key geweigerd, begeleider B op traject A geweigerd, D1 daarna nog leeg. Teaser door begeleider A: 198 woorden,
geen bedrijfsnaam/plaatsnaam/exacte omzet (alleen omzetklasse, regio gegeneraliseerd naar "Midden-Nederland"), D1
`teaser_tekst` + status gegenereerd, precies 1 fee-event. Opslaan: koper geweigerd, 300 woorden → 400 en D1 ongewijzigd,
bewerkte tekst → D1 status bewerkt, traject B onaangeroerd; koper kan teaser niet versturen. Upload project-/
klantenoverzicht met echte AI-analyse (herkent entiteit en jaar, zegt terecht dat omzet/EBITDA niet als bedrag in het
document staan); koper kan niet uploaden.

**Gevonden (1): MASTER N-127 / OPEN-BEVINDINGEN P3-71.** Teaser laat klantenband en terugkerende omzet altijd weg.
Oorzaak (code-niveau bewezen): `/mna/teaser/genereer` haalt fase `commercieel` niet op maar leest er `aantalKlanten` uit;
`recurring` wordt alleen in `financieel` gezocht, terwijl 6 sectoren het in `commercieel` hebben (itsoftware:
`financieel.recurringPct`). Runtime-observatie: teaser noemde 16% marge (opgehaalde fase) maar niet de klantenband of
72% retainer. Foutpropagatie: matching (`19c`) leest alleen fases die het ophaalt, verkoopmemorandum haalt alle fases
op, bankmutaties alleen financieel; geen andere treffer. Fix gebouwd als patch
(`reports/daily-qa/0002-teaser-commercieel-velden.patch`, schone worktree vanaf backend `main`), `node --check` groen,
`git apply --check` ook op de huidige backend-branch groen, keuzelogica lokaal gesimuleerd (consultancy/itsoftware/
accountancy/leeg). **Niet gedeployd** (ook niet naar staging): zone B klantdocument vereist Breaker-review (werkregel 26),
en de backend-werkboom staat op `fix/daily-qa-20261002-eigen-specialist` met WIP van een andere sessie. Wacht op
Breaker-review en daarna staging + productie.

**Observatie (geen bevinding):** de teaser begint met "Te koop:" in een Fusie-traject; de prompt vraagt generiek om een
overname-teaser. Ter info, niet aangeraakt.

**Niet getest:** browser-klikpad, verkoopmemorandum/dealvoorstel/contracten, teaser-verzending per mail (staging zonder
RESEND), regeneratie zonder dubbele fee (bewust één AI-run, werkregel 40), meekijker, eigen specialist, productie.

**Opgeruimd:** beide `DAILY_QA_20261013`-trajecten en de testadviseur; D1-controle trajecten/gebruikers = 0/0.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op Breaker-review en deploy).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale ADMIN_KEY (zelfde als 11 okt, N-110-patroon). Score staat NIET in het marilyn-dashboard.

- 2026-10-15 diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 15, buiten dag 1-3).

## 2026-10-15 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **verhuizingen** (het langst geleden: 30 sep), trajecttype **PE-traject** (het langst geleden:
4 okt), `opdrachtgever_rol:"koper"`, extern adviseurstraject; rollen adviseur, verkoper, koper, begeleider A/B. Accent:
**groepsstructuur en consolidatie** (holding + 2 werkmaatschappijen, holding-uitsluiting, entiteit verwijderen) en
**traject afsluiten + dossier-ZIP-export**: beide nog niet eerder door deze routine getest. Geen AI-aanroepen. Script:
`reports/daily-qa/daily-qa-20261015.mjs` (alleen staging, één run).

**Resultaat: 38 van 42 checks geslaagd.** Doorlopen: adviseur + 2 trajecten (D1: verhuizingen/PE-traject/koperszijde,
"&" ongeëscaped). Entiteiten: verkoper maakt holding + WM aan, begeleider A een tweede WM; koper en begeleider B
geweigerd (401); koper zonder vrijgave ziet lege groepsstructuur. Financieel per entiteit door verkoper: groepsrij
5,0 mln / EBITDA 400k / marge 8,0 (holding terecht niet dubbel geteld); begeleider en koper kunnen financieel per
entiteit niet schrijven (403), groep ongewijzigd. Begeleider B kan entiteit van A niet verwijderen via eigen pad (data
intact). Afsluiten: koper, verkoper en begeleider B geweigerd; begeleider A sluit af → status afgesloten, ZIP downloadbaar
(PK, 4 bestanden incl. DD-eindrapport.pdf, groepsstructuur aanwezig), tweede download binnen coulance-uur 200, onbekend
token 404, opslaan na afsluiten 403, tweede afsluitpoging 400, traject B onaangeroerd.

**Gevonden (1): MASTER N-128 / OPEN-BEVINDINGEN P2-82 (runtime gereproduceerd + code-niveau).** Na verwijderen van
werkmaatschappij WM2 wordt de entiteitdata correct gewist, maar het groepstotaal blijft 5,0 mln / 400k / 8% (verwacht
3,0 mln / 300k / 10%). Oorzaak: de verwijdertak in `worker/07-mna-groepen.js` roept `consolideerFase()` niet aan, en
`consolideerFase()` schrijft niets bij nul resterende entiteiten. Bevestigd aanwezig in de actuele releasebasis
(`/private/tmp/kvm-weekend-option2-h_nlnin8`, 48e8f19) en alle `KVM-releases/*-20261010`. Foutpropagatie: alle
schrijvers naar `mna_data` gegrept; broncorrectie (`worker/40-financiele-broncontrole.js`) wijzigt ook een entiteitrij
zonder te consolideren (code-niveau, niet runtime getest). **Niet zelf gefixt of gedeployd:** staging draait uit de
Codex-releaseketen met globale builderlock (KVM-OVERDRACHT); de lege-groep-situatie vraagt een keuze (auto-velden wissen
vs. handmatige groepswaarden behouden); raakt waarderingsinvoer (Breaker-review nodig).

**Testfouten (geen platformfout):** (1) MFA-bypass via wrangler D1 faalde eenmalig (wrangler-uitvoer, latere D1-queries
werkten; flow liep door). (2) Mijn audit-check zocht de download-regel op `extra`, maar die logt `code=traject_id`;
alleen "aangemaakt" gevonden. Code-niveau logt de download wel (`worker/13` r.129). Script gecorrigeerd, niet opnieuw
gedraaid (werkregel 40).

**Observatie:** `download_url` uit afsluiten wijst ook op staging naar de productie-Worker-host (hardcoded); op staging
werkt de link dus alleen met handmatig vervangen host. Geen productiefout, ter info.

**Niet getest:** browser-klikpad, broncorrectie-pad (N-128 propagatie), maatschap-structuur, partnerregister,
koper na vrijgave, ZIP-download na coulance-uur (vereist tijd), afsluitmail (staging zonder RESEND), meekijker,
eigen specialist, productie.

**Opgeruimd:** beide `DAILY_QA_20261015`-trajecten en de testadviseur; D1-controle trajecten/gebruikers/entiteiten =
0/0/0. Export-ZIP in staging-R2 niet apart gecontroleerd.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op releaseketen/keuze lege groep).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale ADMIN_KEY (N-110-patroon, zelfde als 11 en 13 okt). Score staat NIET in het marilyn-dashboard.

- 2026-10-16 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 16, maandelijkse check alleen op dag 1–3).

## 2026-10-16 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **transport** (het langst geleden: 1 okt), trajecttype **Verkoop** (het langst geleden: 9 okt),
`opdrachtgever_rol:"verkoper"`, extern adviseurstraject; rollen adviseur, verkoper, koper, begeleider A/B en
platformbeheerder (ADMIN_KEY-muur). Accent: **gesprekken/logboek, gespreksconcept (autosave), informatieverzoek en
wijzigingenlog**, nauwelijks eerder door deze routine getest, en bekend risico (eerdere rolgrenslekken bij interne
gesprekken, werkregel 15). Geen AI-aanroepen. Script: `reports/daily-qa/daily-qa-20261016.mjs` (alleen staging, één run).

**Resultaat: 31 van 37 checks geslaagd.** Goed: begeleider legt 3 gesprekken vast (D1 op traject-id); verkoper ziet alleen
"verkoper"+"iedereen", koper alleen "iedereen", geen van beiden ruwe notities; begeleider B en ADMIN_KEY (extern traject)
zien niets; verkoper/koper kunnen geen gesprek vastleggen (403/401); begeleider B kan gesprek van A niet overschrijven,
A wel (D1 V2 + vergrendeld); ADMIN_KEY kan niet verwijderen (muur). Informatieverzoek: opslaan/teruglezen per fase,
geen cross-traject. Wijzigingenlog: oud→nieuw zichtbaar voor begeleider A, 401 voor verkoper/koper/begeleider B.

**Gevonden (1, P1): MASTER N-129 / OPEN-BEVINDINGEN P1-97 (runtime gereproduceerd + code-niveau).** Verkoper én koper
lezen het gespreksconcept van de begeleider inclusief ruwe notities (`GET /mna/gesprek/concept/{code}` → 200); koper kan
het overschrijven en wissen; verkoper kan de informatieverzoek-selectie overschrijven. Oorzaak: vier routes in
`worker/12-mna-gesprekken-logboek.js` zonder rolcontrole; enige aanroepers zijn begeleiderschermen. Corrigeert de
beoordeling van 18 sep (P1-25-vervolg) dat het concept door alle rollen wordt gebruikt. Fix gebouwd als patch
(`reports/daily-qa/0003-gespreksconcept-infoverzoek-alleen-begeleider.patch`), `node --check` groen, toepasbaar op
releasebasis 8a3c8fb, lokale routetest 15/15 PASS (ongepatcht 7/15). Foutpropagatie: alle multi-rol-lookups
geïnventariseerd; vergelijkbare begeleider-features hebben wel een rolcontrole. **Niet gedeployd** (ook niet naar
staging): zone C vereist Breaker-review; backend loopt via de releaseketen (KVM-OVERDRACHT).

**Gevonden (2, P3): MASTER N-130 / P3-72.** Trajectverwijdering laat de `kv_store`-rijen `infoverzoek_*` en
`gesprek_concept_*` staan (runtime: 1 rij bleef staan; code: geen van beide cascades kent de sleutels). Niet gebouwd.

**Testfout (geen platformfout):** MFA-bypass via wrangler D1 faalde eenmalig (zelfde als 15 okt); flow liep door.

**Niet getest:** browser-klikpad, gespreksverslag-AI-generatie, gespreksbijlagen, informatieverzoek versturen (mail),
meekijker, eigen specialist, productie.

**Opgeruimd:** beide `DAILY_QA_20261016`-trajecten en de testadviseur; D1-controle trajecten/gebruikers/gesprekken/
concepten/wijzigingen = 0; de achtergebleven infoverzoek-rij (N-130) handmatig verwijderd, daarna 0.

**Score:** 50 (twee bevindingen niet zelfstandig opgelost: wachten op Breaker-review en releaseketen).
Melding aan marilyn (stap 5b) mislukt: 401 met de lokale ADMIN_KEY (N-110-patroon, zelfde als 11, 13 en 15 okt). Score staat NIET in het marilyn-dashboard.

## 2026-10-17 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **bouw** (het langst geleden: 2 okt), trajecttype **Opvolging** (het langst geleden: 10 okt),
`opdrachtgever_rol:"verkoper"`, extern adviseurstraject; rollen adviseur, verkoper, koper, begeleider A/B en
platformbeheerder (ADMIN_KEY-muur). Accent: **Q&A-flow** (vraag, voorstel met bedrag, antwoord, accepteren, deadline/
toewijzing, reacties, categorie-intrekking, volgnummer bij gelijktijdige vragen) en de **closing-checklist** (vinken,
eigen punt toevoegen/verwijderen, rolgrenzen, cross-traject, verwijdercascade). Beide nog niet eerder door deze routine
getest; bekend risico N-129 (multi-rol-lookups zonder rolcontrole). Geen AI-aanroepen. Script:
`reports/daily-qa/daily-qa-20261017.mjs` (alleen staging, één run).

**Resultaat: 32 van 34 checks geslaagd.** Goed: D1 bouw/Opvolging/verkoperszijde, "&" ongeëscaped. Koper kan zelf geen
categorieën vrijgeven (401). Koper ziet vragen, voorstel met type + bedrag; koper van B en ADMIN_KEY (extern traject) zien
niets. Deadline/toewijzing alleen door begeleider A (B, koper, verkoper 401, DB ongewijzigd). Antwoorden: koper en B 401,
leeg 400; A beantwoordt en accepteert (DB-status beantwoord/geaccepteerd); onbekende status valt terug op beantwoord.
Reacties: koper + begeleider ok; koper van B 404; ongeldige code 401, ook bij onbekende qa-id (geen existence-oracle).
Na intrekken van categorie financieel verdwijnt die thread incl. antwoord en reacties voor de koper; begeleider ziet alles.
Closing-checklist: verkoper/koper/begeleider B 401; eigen punt toevoegen (301 tekens → 400, koper/B 401), zichtbaar alleen
in traject A, B kan het niet verwijderen, A verwijdert item + vinkstatus. Verwijdercascade: 0 restanten in mna_qa,
mna_qa_reacties, closing-checklist-status en eigen punten.

**Gevonden (1, P2): MASTER N-131 / OPEN-BEVINDINGEN P2-83 (runtime gereproduceerd + schema-niveau op staging en
productie).** Drie gelijktijdige koper-vragen gaven vraagnummers 1,2,3,3. Oorzaak: bij de FK-migratie van 26 juli
(`RENAME TO *_backup_20260726`) verhuisden 18 (productie) / 19 (staging) indexen mee naar de back-uptabellen; de
`CREATE INDEX IF NOT EXISTS` met dezelfde naam in `initDB()` is sindsdien een no-op. Daardoor ontbreken o.a. de UNIQUE-
indexen voor Q&A-nummers en documentversienummers (vangnet van `metVolgnummerRetry`/`metDocVersieRetry`) plus 14
traject_id-indexen. Productie gelezen via `sqlite_master` + tellingen (geen inhoud): 0 bestaande dubbelen. Foutpropagatie:
geen andere hernoemde tabellen met indexen, geen `RENAME TO` in workercode. Fix als patch
(`reports/daily-qa/0004-indexen-terug-op-live-tabellen-v38.patch`, SCHEMA_VERSION 38, 16 `_v38`-indexen, additief) op
releasebasis 51bb982; `node --check` groen, `git apply --check` groen, audit-backend met/zonder patch identiek, SQLite-
reproductie van het RENAME-scenario (zonder fix dubbel toegestaan, met fix geweigerd). **Niet gedeployd:** releaseketen
met builderlock (#14 stagingdeploy loopt) en SCHEMA_VERSION-bump kan botsen met een parallelle bump.

**Gevonden (2, P3): MASTER N-132 / P3-73.** Q&A-reactie neemt `auteur_naam` uit het verzoek over: koper reageerde onder
de naam van de begeleider (opgeslagen als begeleidersnaam met rol koper; UI toont de naam). Niet gebouwd (weergavekeuze).

**Observaties (geen bevinding):** koper kan vóór categorie-vrijgave een vraag stellen (200) maar ziet die zelf niet;
verkopercode kan de volledige Q&A lezen (geen UI-pad voor de verkoper; productkeuze, niet aangeraakt).

**Testfout (geen platformfout):** mijn script nam aan dat checklist-items objecten met `key` zijn; het zijn tekst-items
met categorie/index-sleutels. Daardoor zijn aan-/uitvinken van een standaarditem en de negatieve vinktests voor koper/B
niet uitgevoerd. Vinken van een eigen punt (sleutel `eigen_…`) liep wel en werd bij verwijderen correct opgeruimd; de
vinkroute heeft code-niveau dezelfde rolcontrole als toevoegen. Script niet opnieuw gedraaid (werkregel 40).

**Niet getest:** browser-klikpad, vinken standaard-checklistitem + negatieve vinktests (zie testfout), Q&A-mails (staging
zonder RESEND), Q&A met module uit, Q&A-export, meekijker, eigen specialist, productie (alleen schema gelezen).

**Opgeruimd:** beide `DAILY_QA_20261017`-trajecten en de testadviseur; D1-controle trajecten/gebruikers/qa/reacties/
checklist = 0. Tijdelijke git-werkboom `/private/tmp/dailyqa-20261017-be` verwijderd (patch bewaard).

**Score:** 50 (twee bevindingen niet zelfstandig opgelost: N-131 wacht op de releaseketen, N-132 op een weergavekeuze).
Melding aan marilyn (stap 5b) gelukt: HTTP 200 (score 50 staat in het marilyn-dashboard).

## 2026-10-17 — red-team-pentest-routine (scheduled task, Stap 2B, aanvraag AV1792153119600QISX)

**Eindoordeel: GO WITH CONDITIONS, score 60.** Rapport: `tests/rapporten/red_team_pentest-20261017.html`.
Begrensde ronde op staging: F1-F17-regressieset (`tests/e2e-crosspath-fixes.mjs`, 2 runs: 87/90, na testcorrectie 95/96;
enige rood = F17-upload 502 door de bekende staging-AI-storing, beveiligingschecks F17 groen), verse cross-traject-
aanvallen met twee aparte externe adviseurs + twee koopmandaten (`tests/redteam-crosstraject-20261017.mjs`, 39/40; de
rode check was een fout in de eigen assertie, los nagecontroleerd), diff van `00-policy.js` sinds 17 sep en een sweep
van alle 72 `begeleiderAuth`-aanroepen en de directe koperpaden (P1C-grens) in de releasebron
`KVM-releases/koersvoormorgen-backend` (10 okt).

**Cross-traject-verdict: NEE** (136 live combinaties, positieve merkteken-isolatie).

**Gevonden HIGH (MASTER N-133), runtime staging + code-niveau:** `GET /mna/signhost/status/{code}` heeft geen
rolcontrole en geeft rauwe `signhost_transactions` (ondertekenaar-e-mail, doc_type incl. BEM) aan de koper, vóór NDA en
langs de P1C-vrijgavegrens. Reproductie: `tests/redteam-signhost-status-20261017.mjs`. Niet zelf gefixt (zone C,
werkregel 26/39; releaseketen, lokale backend-repo loopt achter op productie). Productie: alleen code-niveau.
**LOW:** N-134 (CRM-activiteit traject_id/target_id niet kantoor-gecontroleerd, geen leespad), N-135
(resolveMandaatRol-comment vs. code).
**Testdrift opgelost:** `publieke_referentie` (bewust publiek, geen lookup-sleutel) toegevoegd aan KOPER_ALLOW.
**Niet getest:** AI/RAG, TOS-finalisatieraces, policy-equivalentie, brede injectiesweep, export/sessie, CRM live,
productie. **Opgeruimd:** 5 testtrajecten, 5 testadviseurs, 3 koopmandaten (alle opruimchecks groen).

- 2026-10-18 — diepe-audit-routine: aanvraag `AV1792153125684IJNK` uitgevoerd (begrensde ronde). Score 66 (van 60). Checks groen; e2e productie niet gedraaid (ADMIN_KEY 401). 9 items 🔴/🟡→🟢 (code-niveau productie fbe49ad), P0-1 punt 4 🟡, 5 items blijven 🔴 (P1-97, P2-82, P2-83, P3-71, P3-73), P4-22 verergerd, 1 nieuwe waarneming P3-74. Rapport: `tests/rapporten/diepe_audit-20261018.html`.

## 2026-10-18 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **zorg** (het langst geleden: 3 okt), trajecttype **Overname** (het langst geleden: 12 okt),
`opdrachtgever_rol:"koper"` (vorige twee dagen verkoperszijde), extern adviseurstraject; rollen adviseur/begeleider A/B,
verkoper, koper, platformbeheerder (ADMIN_KEY-muur) en **poolspecialist** (token). Accent: **specialistenpool**
(`worker/32-pool.js`), nog nooit door deze routine getest (2 okt alleen de eigen specialist), plus bekend risico N-113
(actorintrekking die een lopend token niet raakt, werkregel 15). Geen AI-aanroepen. Code gelezen uit de releasebron
`KVM-releases/koersvoormorgen-backend` (de lokale backend-repo loopt achter, bijv. N-119 ontbreekt daar). Script:
`reports/daily-qa/daily-qa-20261018.mjs` (alleen staging).

**Resultaat: 42 van 44 checks geslaagd** (tweede run; de eerste brak na sectie 7 af op een fout in mijn eigen script,
zie testfout). Goed: TOS activeren + 3 MoU's; admin voegt poolspecialisten toe, begeleider kan dat niet (403); bladeren
op sector zorg zonder e-mail; verkoper/koper bladeren en aanvragen niet (403); begeleider B met document + code van A
→ 400, geen opdracht; ADMIN_KEY op extern traject → 403 (muur, ook op lijst en intrekken); ongeldig domein/lege scope
400, onbekende specialist 404. Tokenflow: opdracht zonder rolcodes, dossier vóór accepteren 403, twee gelijktijdige
acceptaties precies één 200 + één 409, dossier bevat alleen de gescopte MoU (niet de tweede MoU van A, niet B),
verzonnen token 403. Begeleider B/koper/ADMIN_KEY kunnen O1 niet intrekken (DB ongewijzigd). Na aftekenen: reviews +
fee-events + audit-keten REVIEW_APPROVED, tweede aftekening 409 zonder extra fee, afgeronde review niet intrekbaar (409).
Afwijzen en intrekken maken het token ongeldig (dossier/aftekenen 403), onbekende actie 400. Admin-overzicht toont de
opdrachten met "(extern traject)", zonder tokens; begeleider krijgt het niet (403).

**Gevonden (1, MEDIUM): MASTER N-136 / OPEN-BEVINDINGEN P2-84 (runtime gereproduceerd, 2 runs, + code-niveau).**
Na royeren van de poolspecialist blijven opdracht, dossier en aftekenen met het al uitgegeven token werken (200);
aftekenen zette 16 LEGAL-onderdelen op APPROVED "via de Koers voor Morgen-pool" en boekte honorarium 450 + marge 75.
Nieuwe opdrachten voor die specialist zijn wel geblokkeerd (404). Oorzaak: `magPool()` controleert bij poolbron de
status van `pool_specialisten` niet (eigen specialist sinds N-113 wel). **Niet zelf gefixt:** marilyn zegt bij royeren
"Lopende opdrachten blijven staan", dus het gedrag kan bewust zijn; besluit van Marcel nodig. Patch voor de keuze
"intrekken" klaar (`reports/daily-qa/0005-pool-geroyeerde-specialist-token-intrekken.patch`, `node --check` groen,
niet toegepast, niet gedeployd; zone C vraagt daarna Breaker-review en de releaseketen). Foutpropagatie: meekijker
(`viewerAuth` toetst ingetrokken/verlopen) en eigen specialist (N-113-check in `magPool`) zijn wel fail-closed; voor
een uitgeschakelde adviseur bestaat geen status in `bf_gebruikers` (geen vergelijkbaar pad gevonden via grep).

**Observaties (geen bevinding):** `POST /mna/pool/opdracht` toetst `status='actief'` maar niet `beschikbaar`;
staging-`pool_specialisten` bevat geroyeerde rijen van eerdere `e2e-tos`-runs (die suite royeert maar verwijdert niet).

**Testfout (geen platformfout):** mijn auditcheck zocht `tos_audit_event.traject_id`; die kolom heet `traject_ref`.
Gecorrigeerd (zoeken op opdracht-id in `meta_json`) en één keer opnieuw gedraaid, omdat secties 8–9 niet waren
uitgevoerd (werkregel 40: nieuwe informatie, geen herhaling van bewezen checks).

**Niet getest:** browser-klikpad (specialist.html en het poolscherm van de begeleider), poolmails (staging zonder
RESEND), deadline-plus-coulance-verloop (vereist tijd), VALUATION-scope, conflictsignalen C1–C4, meekijker, eigen
specialist, productie.

**Opgeruimd:** per run beide `DAILY_QA_20261018`-trajecten, de testadviseur en de twee testpoolspecialisten (D1, er is
geen verwijderroute); D1-controle trajecten/gebruikers/pool-opdrachten/-reviews/fee-events/tos-documenten/-reviews/
poolspecialisten = 0. `tos_audit_event` is append-only en bewust niet in de cascade.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op een besluit van Marcel).

- 2026-10-22 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 22, maandelijkse zelf-indiening alleen op dag 1-3).

## 2026-10-22 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **handel** (het langst geleden: 4 okt), trajecttype **Fusie** (het langst geleden: 13 okt),
`opdrachtgever_rol:"verkoper"` (gisteren-run 18 okt was koperszijde), extern adviseurstraject met groepsstructuur
(holding + werkmaatschappij). Rollen adviseur/begeleider A/B, verkoper, koper, platformbeheerder (ADMIN_KEY-muur) en
**meekijker** (laatst 3 okt; 17 en 18 okt als "niet getest"). Accent: de randen van de meekijker-levenscyclus die 3 okt
niet gedekt waren, plus de foutklasse van N-113/N-136 (intrekking die een lopende toegang niet raakt, werkregel 15).
Geen AI-aanroepen. Code gelezen uit de releasebron `KVM-releases/koersvoormorgen-backend` (P3-74). Script:
`reports/daily-qa/daily-qa-20261022.mjs` (alleen staging). 19, 20 en 21 okt staan niet in dit logboek (zie N-137).

**Resultaat: 38 van 39 checks geslaagd** (één run). Goed: module "meekijker" uit → adviseur-begeleider 403 en geen rij;
begeleider B en ADMIN_KEY (muur) geweigerd; 5 gelijktijdige aanmaakverzoeken → precies 1 actieve code en 1 fee-event
(15 sep-racefix houdt); viewercode in kleine letters werkt; data vóór acceptatie 403; scope financieel strikt (geen
commercieel-velden, geen checklist/notitie); acceptatie van een oudere voorwaardenversie telt niet (data 403, info
akkoord=false); scope alle toont financieel + commercieel; documenten zonder r2_key; POST op viewer-route 405;
viewercode werkt niet als traject- of meekijkerscode (404); verkoper/koper/begeleider zien de meekijkerslijst zonder
codes, verkoper B ziet die van A niet, ADMIN_KEY op extern traject afgeschermd; viewerlog voor begeleider A (data +
documenten), niet voor B of koper. Verloop: kortlopende code (≈4 s) daarna 401 op info/accepteren/data en uit de
transparantielijst. Intrekken: B (met traject_id A of B) en koper trekken niet in (DB ongewijzigd, code blijft werken);
na intrekken door A geeft de code 401 op info/data/documenten/accepteren, de andere meekijker blijft werken, opnieuw
aanmaken geeft een nieuwe werkende code terwijl de oude dood blijft; begeleiderlijst toont ingetrokken/verlopen/actief.
Viewer-rate-limiter (15 per 10 min per IP, in-memory per isolate): 22 viewer-aanroepen zonder 429 (dus niet
reproduceerbaar als hinder voor een gewone meekijker in deze run; geen conclusie over één isolate).

**Gevonden (1, LOW/P3): MASTER N-139 / OPEN-BEVINDINGEN P3-75 (runtime staging-API + code-niveau live viewer.html).**
Bij een groepsstructuur krijgt de meekijker per fase één rij per entiteit zonder entiteit_id of naam; `viewer.html`
toont ze als twee blokken "Financieel" met dezelfde jaaromzet, zonder te zeggen welke de groep is. Geen rolgrenslek.
Niet zelf gebouwd: productkeuze (entiteitnaam via allowlist tonen, of alleen groepsniveau). Foutpropagatie: de
meekijkerdocumentenlijst selecteert evenmin entiteit_id (zelfde patroon, geen uploads gedaan om het te tonen); de
eigen documentenlijst van de portalen geeft entiteit_id wél mee.

**Observaties (geen bevinding):** `scope_fase:"   "` wordt opgeslagen als lege string; `/mna/viewer/data` filtert dan
niet (code-niveau, lege string is falsy) en de transparantielijst toont een lege scope i.p.v. "alle". Alleen bereikbaar
voor de begeleider zelf via de directe API, die ook gewoon "alle" kan kiezen. `verloopt_dagen` wordt niet gevalideerd
(tekst = nooit verlopen, negatief = direct verlopen); ook alleen begeleider-zijde.

**Testfout (geen platformfout):** mijn check verwachtte dat `/mna/document/lijst/{viewercode}` geen 200 geeft; die route
geeft voor elke onbekende code `200 []` (los bevestigd met een verzonnen code). Geen inhoud, geen lek.

**Niet getest:** browser-klikpad van viewer.html (alleen API + broncode), meekijker-documenten met echte uploads
(bewust geen AI-kosten, 3 okt gedekt), meekijkermails (staging zonder RESEND), eigen specialist, poolspecialist,
productie. Welke backendversie op staging draait is niet apart vastgesteld.

**Opgeruimd:** beide `DAILY_QA_20261022`-trajecten via de test-opruimroute (200) en de testadviseur (200); D1-controle
trajecten/gebruikers/meekijkers/viewerlog/entiteiten/data/fee-events = 0.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op een productkeuze van Marcel).
Melding aan marilyn (stap 5b) gelukt: HTTP 200.

- 2026-10-23 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 23, buiten venster 1e-3e).

## 2026-10-23 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **itsoftware** (het langst geleden: 8/9 okt), trajecttype **PE-traject** (het langst geleden:
15 okt), **koperszijde** (22 okt was verkoperszijde). Rollen: adviseur A (eigenaar), adviseur B (ander kantoor),
mandaat-begeleider (tussen_code), mandaat-koper (koper_code), platformbeheerder (ADMIN_KEY-muur), en op de trajecten
verkoper/koper/begeleider. Accent: **koopmandaat** (`worker/37-koopmandaat.js`, buy-side: mandaat, targets, promotie)
en **koper-bod** (`worker/35-koper-bod.js`): beide nog nooit door deze routine getest. Geen AI-aanroepen. Code gelezen
uit de releasebron `KVM-releases/koersvoormorgen-backend`. Script: `reports/daily-qa/daily-qa-20261023.mjs` (alleen
staging, één run).

**Resultaat: 64 van 67 checks geslaagd; de 3 rode checks waren verwachtingsfouten in mijn script (zie testfouten), geen
platformfout.** Goed: mandaat aanmaken door adviseur zonder sessie 401, meegestuurde `tussen_code`/`gebruiker_id` 400,
lege koper_naam en tekst als omzet 400; eigenaar/kantoor/begeleider komen uit de sessie (DB). Targets: koper, sleutel
van mandaat B en ADMIN_KEY (muur) kunnen niets toevoegen (exact 4 targets in DB); ongeldige targetflow en lege naam 400.
Bijwerken: 5 gelijktijdige contactlog-toevoegingen → alle 5 in DB (geen lost update); handmatig match/gepromoveerd/
onbekende status 400; koper 401, mandaat B 404, DB ongewijzigd. Per rol: begeleider ziet notities/contactlog/bron, koper
ziet geen notities, contactlog, bron, codes of contactgegevens; ADMIN_KEY op extern mandaat 401, admin-overzicht toont
het alleen als administratieve regel. Promotie: alleen mandaatsleutel 403 `identiteit_onbekend`, sessie van B 403
`fee_recht_niet_besloten`, eigenaar ziet 3 pakketten; generieke target zonder match 409; target zonder sector 400
`sector_ontbreekt` (geen aanname); zonder/onbekend pakket en meegestuurd bedrag 400. **5 gelijktijdige promoties →
precies één 200 + vier 409**, DB: 1 traject (Overname/itsoftware/koperszijde, koppelingen + voorinvulling, verkoper-
contact leeg), 1 pakket-fee-event, 1 startrij; daarna status wijzigen en opnieuw promoveren 409; koper ziet geen
trajectcodes. Koper-bod: sell-side vóór dossiervrijgave 403, daarna 200; negatief bedrag 400; verkoper 403; **PE-traject
koperszijde 403 "niet beschikbaar"** (Marcels randvoorwaarde houdt); begeleider ziet het bod, koper niet (403).
Trajectlimiet (3 bereikt): promotieprijs en promotie 403, target blijft kandidaat zonder claim, geen extra fee-event.

**Gevonden: geen bevindingen binnen de geteste combinatie vandaag** (geen bewijs dat het platform foutloos is).

**Testfouten (geen platformfout):** (1) begeleider van traject X met het pad van traject Y op `/mna/begeleider/
biedingen/` → 403 i.p.v. mijn verwachte lege lijst: strenger, fail-closed. (2) ADMIN_KEY op een extern traject geeft
daar 403 i.p.v. de lege lijst uit de routecomment: de centrale muur `begeleiderAuthMetMuur` (00-policy) weigert al vóór
de eigen admin-tak van de route; geen lek. (3) mijn fee-telling verwachtte 1 event, het waren er 3: `/adviseur/create`
boekt per traject een trajectfee (code-niveau `worker/16-adviseur.js`), dus 1 promotie + 2 trajectaanmaken; de
mislukte promotie bij de limiet voegde niets toe. Niet opnieuw gedraaid (werkregel 40: de uitkomst is verklaard).

**Observaties (geen bevinding):** na opruimen blijven 2 regels (`target_aangemaakt`, `target_status`, categorie audit)
in `mna_koopmandaat_introductie_bewijs` staan: bewust zonder cascade (N-115, 12 maanden), zonder inhoud of
persoonsgegevens. De admin-tak in `35-koper-bod.js` (lege lijst bij extern traject) is voor externe trajecten niet meer
bereikbaar door de centrale muur; alleen een verouderde comment. Eén alleen-lezen controlequery (SELECT op de
introductiebewijstabel, lege uitkomst) liep per ongeluk tegen de productie-D1 omdat WORKER_URL in die losse shell niet
gezet was; meteen tegen staging herhaald. Geen schrijfactie op productie.

**Niet getest:** browser-klikpad (koopmandaatscherm in mna.html/adv.html), generieke targetflow verder dan de
match-poort (introductieovereenkomst, N-115-vrijgave, match), CRM-koppeling (`organisatie_id`), introductiemails
(staging zonder RESEND), testaccount-variant (`is_tester`), productie. Welke backendversie op staging draait is niet
apart vastgesteld.

**Opgeruimd:** 3 trajecten via de test-opruimroute (200), 2 mandaten (200), 2 testadviseurs (200); D1-controle
trajecten/mandaten/targets/gebruikers/fee-events/biedingen = 0.

**Score:** 100 (geen bevindingen in deze combinatie).
- 2026-10-23 — dagelijkse knoppentest: melding aan marilyn (stap 5b) gelukt, HTTP 200.
- 2026-10-24 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 24, geen eigen aanvraag ingediend).
- 2026-10-25 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 25, buiten venster 1–3).

## 2026-10-25 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **mkb** (het langst geleden in dit logboek: 11 okt), trajecttype **Opvolging** (17 okt; Verkoop
16 okt is ouder, maar het niet-gelogde script van 24 okt was accountancy/Verkoop), **koperszijde** (`opdrachtgever_rol:
"koper"`; 23 okt koper, 24 okt verkoper). Rollen: adviseur (extern traject), verkoper, begeleider A/B, koper. Accent:
**meerdere schrijvers op dezelfde fase** via `/mna/save` (werkregel 14) en de **wijzigingenlog**, nog nooit door deze
routine getest. Geen AI. Code gelezen uit de releasebron `KVM-releases/koersvoormorgen-backend` + frontend `mna/02`.
Script: `reports/daily-qa/daily-qa-20261025.mjs` (alleen staging, één run).

**Vooraf:** 24 okt staat niet in dit logboek terwijl `reports/daily-qa/daily-qa-20261024.mjs` (accountancy/Verkoop,
CRM-relatielaag) bestaat; of en hoe ver die ronde liep is niet vast te stellen. Staging-D1 gecontroleerd: geen
`DAILY_QA_20261024`-restanten (trajecten, gebruikers, CRM-organisaties = 0). Wel 5 oudere restanten met `DAILY_QA` in
de naam (4× "DAILY_QA Traject van Eigenaar/Lid A", eind sep; 1× `DAILY_QA_KMF1_… race`, begin okt), niet van deze
routine; bewust niet aangeraakt.

**Resultaat: 23 van 28 checks geslaagd; de 5 rode checks horen bij één bevinding.** Goed: trajecten in DB als mkb/
Opvolging/koperszijde; opslaan vóór platformvoorwaarden 403; verkoper slaat commercieel op (velden, checklist, notitie,
DB teruggelezen); begeleider leest traject en voegt veld toe (DB 4 velden); wijzigingenlog toont per rol wie wat
wijzigde (begeleider ja, koper 401, begeleider B leeg); koper kan niet schrijven (403, DB ongewijzigd); begeleider
niet in financieel (403), verkoper wel (200, DB); begeleider B schrijft alleen in traject B; objectwaarde 400;
onbekende code 404.

**Gevonden (1, P1 data-integriteit): MASTER N-146 / OPEN-BEVINDINGEN P1-98 (runtime staging serverhelft + code-niveau
browserhelft).** Probleem: verkoper en begeleider overschrijven elkaars invoer in dezelfde fase zonder melding.
Reproductie: begeleider voegt Orderportefeuille + checklistpunt + notitie toe; verkoper slaat daarna op vanuit zijn
eerder geladen staat (alleen een percentage gewijzigd) → alle drie weg in D1; de wijzigingenlog meldt het verdwijnen
niet. Oorzaak: `/mna/save` vervangt per fase de hele data_json/checklist/notitie (`worker/11` r.979-982) en
`saveAll()` (`mna/02` r.551-609; Opslaan, uitloggen, tabwissel, 30s-autosave, pagina verlaten) stuurt alle fases met
data vanuit de lokale browserstaat, zonder verversen of versiecontrole. De browserhelft is code-niveau, niet in een
browser gereproduceerd. Aanvullend: 5 gelijktijdige saves met elk één ander veld laten 1 veld over; dat bevestigt
alleen dezelfde vervang-semantiek (de frontend stuurt altijd de hele fase), geen aparte fout. Fix: niet zelf gebouwd,
ontwerpkeuze (samenvoegen per veld, versiecontrole + conflictmelding, of alleen gewijzigde velden sturen) en zone
data-integriteit/Breaker-review. Foutpropagatie: adv.html gebruikt `/mna/save` niet (grep); het groepsrij-pad
(`saveGroepsniveauVelden`) heeft dezelfde vervang-semantiek (N-37/#37 al bekend voor consolidatieCheck); andere
JSON-blob-schrijvers met meerdere rollen niet verder doorzocht in deze ronde.

**Niet getest:** browser-klikpad (de stale-staat-kant is code-niveau), entiteit-rijen (consolideerFase), documentupload
(bewust geen AI-kosten), e-mailnotificatie na opslaan (staging zonder RESEND), meekijker/eigen specialist, productie.
Welke backendversie op staging draait is niet apart vastgesteld.

**Opgeruimd:** beide `DAILY_QA_20261025`-trajecten (200) en de testadviseur (200); D1-controle trajecten/mna_data/
mna_wijzigingen/gebruikers = 0.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op een ontwerpkeuze van Marcel).
- 2026-10-25 — dagelijkse knoppentest: melding aan marilyn (stap 5b) gelukt, HTTP 200.
- 2026-10-29 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (dag 29, buiten venster 1–3).

## 2026-10-29 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **consultancy** (het langst geleden in dit logboek: 13 okt), trajecttype **Verkoop** (16 okt;
24 okt ongelogd), **verkoperszijde** (25 okt was koperszijde). Rollen: adviseur (extern traject), verkoper, begeleider
A/B, koper, ADMIN_KEY (muur). Accent: **financiële broncontrole + correctie** (`worker/40`, routes in `worker/11`) en
**juridische broncontrole** (`worker/41`) op een groepsstructuur (holding + 2 werkmaatschappijen, groepsbeeld
`worker/42`); nog nooit door deze routine getest. Eigen specialist overwogen, maar al gedekt op 2 en 11 okt. Uploads als
veld/waarde-CSV (deterministisch, `methode: text_extract`), dus geen AI. Code gelezen uit de releasebron
`Codex/KVM-releases/koersvoormorgen-backend`. Staging-Worker 320b4f70 (deploy 28 okt 22:51). Script:
`reports/daily-qa/daily-qa-20261029.mjs` (alleen staging, één run).

**Resultaat: 61 van 61 checks geslaagd.** Goed: broncontrole vóór platformvoorwaarden 403; entiteiten (holding-rol in
DB), koper kan geen entiteit toevoegen (401); groepsbeeld 4,1 mln / 690k met holding uitgesloten, `BRUTO_BEREKEND`,
`officiele_consolidatie:false`; upload financieel door begeleider en koper 403, verkoper 200 (DB: juiste entiteit,
PROCESSED). Lezen: verkoper 200 + correctierecht, begeleider 200 zonder correctierecht, koper 403 zonder inhoud,
ADMIN_KEY op extern traject 403, entiteit van traject B 404, begeleider B 404, ongeldige entiteit_id 400; scope per
entiteit klopt, bron 2.450.000 naast huidige 2.400.000, crosscheck eerlijk `ONVOLDOENDE_BRONNEN`; DTO zonder
toegangscodes of r2_key. Correctie: begeleider/koper/ADMIN_KEY 403; onbekend veld, korte reden, niet-canoniek bedrag,
niet-corrigeerbaar veld 400; bron van andere entiteit 409; verouderde verwachte waarde 409 met huidige waarde; DB en
audit ongewijzigd na alle weigeringen. **5 gelijktijdige correcties → precies één 200 + vier 409 VEROUDERD**, één
auditrij (rol verkoper, document gekoppeld, schema v1), label en overige velden behouden, `nog_actueel` true; afgeleide
groepswaarde niet corrigeerbaar. Juridisch: verkoper/begeleider 200 (alleen begeleider beoordelingsrecht), koper en
ADMIN_KEY 403; zonder AI-bron 0 bruikbare bronnen en `ONVOLDOENDE_BRONINFORMATIE` (niets verzonnen); beoordeling zonder
bronvoorstel 409, verkoper/ADMIN_KEY 403, verkeerde digest 409, ongeldige beslissing 400; geen auditrij, entiteiten
ongewijzigd. Entiteit verwijderen: data weg, document losgekoppeld (daarna zichtbaar op trajectniveau), groepsrij
herberekend (4,1 → 2,45 mln): het N-128-herstel werkt kennelijk op staging (welke build precies is niet vastgesteld).

**Gevonden (1, P2 data-integriteit): MASTER N-149 / OPEN-BEVINDINGEN P2-85 (runtime staging + code-niveau).** Probleem:
na een financiële broncorrectie op een werkmaatschappij blijft het groepstotaal op de oude som staan. Reproductie: WM1
2,4 → 2,45 mln via de correctieroute (200) → groepsrij omzet3 blijft 4,1 mln, entiteiten tellen 4,15 mln op. Oorzaak:
`voerFinancieleBroncorrectieUit` wijzigt alleen de entiteit-rij en draait bewust geen `consolideerFase`
(`docs/financial-source-control.md`); dat botst met het besluit bij N-128. Fix: niet zelf gebouwd (zone A, gedocumenteerde
ontwerpkeuze); kleinste optie staat in N-149. Foutpropagatie: alle `mna_data`-schrijvers gegrept; `/mna/save` en de
verwijdertak (staging) herberekenen, de overige schrijvers raken geen entiteit-rijen. Blootstelling beperkt: geen
frontend roept de broncontrole aan (alleen directe API).

**Niet getest:** browser-klikpad (er is geen UI voor de broncontrole), juridische beoordeling met een echt AI-bronvoorstel
(bewust geen AI-kosten), crosscheck met twee onafhankelijke bronnen, correctie op een vergrendeld traject, meekijker/eigen
specialist, productie.

**Opgeruimd:** beide `DAILY_QA_20261029`-trajecten (200) en de testadviseur (200); D1-controle trajecten/data/
entiteiten/documenten/wijzigingen/gebruikers = 0.

**Score:** 75 (één bevinding niet zelfstandig opgelost: wacht op besluit van Marcel).
- 2026-10-29 — dagelijkse knoppentest: melding aan marilyn (stap 5b) gelukt, HTTP 200.
- 2026-11-05 — diepe-audit-routine: geen open aanvraag, cadans nog niet verstreken (5 nov, geen dag 1-3).

## 2026-11-05 — dagelijkse-knoppentest-routine (scheduled task)

**Rotatiekeuze:** sector **verhuizingen** (het langst geleden in dit logboek: 15 okt), trajecttype **Overname** (18 okt),
**koperszijde** (`opdrachtgever_rol: "koper"`; 29 okt verkoperszijde). Rollen: adviseur (extern traject), verkoper,
begeleider A/B, koper. Accent: **documentclassificatie** (productpunt 6/7: `worker/43`, upload-routes in `worker/14`,
lijst/versies in `worker/15`), nog nooit door deze routine getest. Uploads als veld/waarde-CSV of txt (geen AI). Code
gelezen uit de releasebron `KVM-releases/koersvoormorgen-backend` en de nieuwste kandidaat `wf001-be-20261105`. Welke
build precies op staging draait is niet vastgesteld (`wrangler deployments list` gaf geen uitvoer). Script:
`reports/daily-qa/daily-qa-20261105.mjs` (+ `-repro.mjs`), alleen staging.

**Verloop runs (eerlijk):** run 1 liep na 15 uploads tegen de AI-kostenlimiet (15/min per IP op de uploadroutes,
bedoeld gedrag): testontwerp, opgelost in de test met ruim 4,3 s tussen uploads. Runs 2–4 braken af op lokale
netwerktime-outs (ETIMEDOUT, ook richting productie-/health, niet richting cloudflare.com): infra, geen productbevinding;
het script probeert nu alleen bij een verbindingsfout vóór het verzoek opnieuw en logt dat. Bij één commando liep per
vergissing een tweede, stille run mee; die is aantoonbaar opgeruimd (D1: 0 trajecten/gebruikers). Run 5: 53/54; de ene
rode check (koper ziet lege lijst) bleek verwachting in de test, zie hieronder. Run 6 (eindrun): **56 van 56 geslaagd.**

**Goed:** trajecten in DB als verhuizingen/Overname/koperszijde; upload vóór platformvoorwaarden 403. 14 ongeldige
classificaties → elk 400 met de juiste foutcode en `geregistreerd:false` (onvolledig, GENERAL met overzicht of entiteit,
onbekend overzicht/cijfersoort, periode > 1 jaar, niet-bestaande datum, eind vóór begin, FY buiten bereik, GROUP met
entiteit, ENTITY zonder/met vreemde/met SQL-achtige entiteit, query en formulier tegenstrijdig) en D1 bevat daarna alleen
het ene geaccepteerde document (query = formulier). GENERAL → STORED, niet geanalyseerd, overige velden null. ENTITY
FORECAST FY2026 en GROUP ACTUAL halfjaar → NEEDS_REVIEW `GEEN_JAARREALISATIE`, geen velden, prognosecijfer nergens als
realisatie. ENTITY ACTUAL gebroken boekjaar (1-4-2025 t/m 31-3-2026) → realisatie toepasbaar, `text_extract` PROCESSED,
record met herkomst GEBRUIKER + 64-hex binding. Base64: GENERAL STORED met classificatie, entiteit van traject B 400 zonder
registratie, koper 403; multipart koper 403; begeleider GENERAL in juridisch 200, in financieel 403. Lijst verkoper en
begeleider: gesaneerde `documentclassificatie`, nooit `_documentclassificatie`/binding; vaste reden bij review;
begeleider B ziet niets van A. Koper (na NDA): alleen goede documenten, geen classificatie/binding/verwerkingsvelden,
geen interne id's, review-documenten onzichtbaar. Versies: v2 met andere periode, keten toont beide classificaties, geen
binding, koper 403, verkoper B 404, standaardlijst alleen v2. **Integriteit:** cijfersoort in D1 gemanipuleerd → geen
classificatie getoond; geldig record overgezet op ander document → geen classificatie; origineel teruggezet → weer
zichtbaar. Verwijderen door verkoper werkt, koper kan niet verwijderen.

**Gevonden: geen productbevindingen binnen deze combinatie.** Wel één testverwachting bijgesteld: na categorievrijgave
met `force=1` maar zonder geldige NDA ziet de koper een lege documentenlijst (ook voor een document zonder
classificatie, gereproduceerd met `-repro.mjs`). Dat is het N-151-besluit van Marcel (29-10: dataroom pas ná geldige NDA)
en exact het testpatroon van N-157; de test controleert nu eerst dat lege resultaat en laat de koper daarna op het
platform tekenen. Kanttekening (geen bevinding, al onderdeel van N-151/N-157): de vrijgaveroute antwoordt dan
`koper_vrijgegeven:1` terwijl de koper niets ziet; of de begeleider-UI dat verschil toont is niet in de browser bekeken.
Observatie: de base64-route zet een ENTITY FORECAST op STORED (niet NEEDS_REVIEW); die route analyseert nooit, dus er
wordt niets overgenomen, consistent met het bewijsstuk-pad; niet als fout aangemerkt.

**Niet getest:** browser-klikpad (geen UI-classificatiekeuze bekeken), AI-extractie met classificatie (bewust geen
AI-kosten), consolidatie/groepsbeeld na een geclassificeerde upload, meekijkerweergave met classificatie (code-niveau:
`worker/21` saneert via `zonderClassificatie`), eigen specialist, productie.

**Opgeruimd:** alle `DAILY_QA_20261105`-trajecten (elke run, 200) en testadviseurs (200); D1-controle na de eindrun
trajecten/documenten/entiteiten/gebruikers = 0.

**Score:** 100 (geen bevindingen in deze combinatie; geen bewijs van foutloosheid).
- 2026-11-05 — dagelijkse knoppentest: melding aan marilyn (stap 5b) gelukt, HTTP 200.
