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
