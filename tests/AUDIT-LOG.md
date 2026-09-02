# Audit-log — wekelijkse controle Koers voor Morgen

## 2026-09-02

**diepe-audit-routine (geautomatiseerde scheduled task):** kon niet draaien. `AUDIT_TRIGGER_KEY` ontbreekt in de omgeving (`~/.zshrc`), dus de audit-wachtrij (`GET /mna/veiligheid/audit-opdracht`) is niet leesbaar — geen manier om te bepalen of er een openstaande "Draai diepe audit nu"-aanvraag is. Aanvullend: de `ADMIN_KEY` uit `~/.zshrc` geeft `Unauthorized` op `/mna/admin/veiligheid/overzicht`, dus de fallback-route (laatste diepe-auditdatum ophalen voor de maandcadans-check) werkt ook niet. Worker zelf is gezond (`/health` → 200). **Actie Marcel:** `export AUDIT_TRIGGER_KEY=...` in `~/.zshrc` zetten met dezelfde waarde als de Cloudflare-secret; controleren of de `ADMIN_KEY`-waarde in `~/.zshrc` nog klopt (roteren indien nodig). Geen audit uitgevoerd, geen bevindingen, niets gewijzigd behalve deze logregel.

**Vervolg 2026-09-03:** `AUDIT_TRIGGER_KEY` opnieuw gegenereerd (`openssl rand -hex 32`) en gezet als Cloudflare-secret op productie én staging (`wrangler secret put`); dezelfde waarde in `~/.zshrc`. Geverifieerd: `GET /mna/veiligheid/audit-opdracht` → `{"ok":true,"opdracht":null}` op beide omgevingen, foute sleutel → 401. Wachtrij dus weer leesbaar, geen openstaande aanvraag. `AUDIT_TRIGGER_KEY` bewaakt alléén de twee audit-wachtrij-routes (`worker/24-veiligheidsdashboard.js`); marilyn's knop gebruikt `ADMIN_KEY` — niets anders geraakt. **Blijft openstaan:** `ADMIN_KEY` in `~/.zshrc` (regel 5, nu met waarschuwcomment) klopt nog steeds niet — 401 op prod én staging. Marcel moet die vervangen door zijn marilyn-inlogcode; pas daarna kan de maand-cadans-audit (werkregel 12, sinds 25 juli niet meer gedraaid → ruim over tijd) via de marilyn-knop worden aangevraagd.

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
