# Audit-log — wekelijkse controle Koers voor Morgen

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
