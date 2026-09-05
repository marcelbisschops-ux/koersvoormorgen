# Open-bevindingen-register — Koers voor Morgen

**Doel van dit bestand:** één blijvende, doorlopend bijgehouden lijst van elke P1/P2/P3/P4-bevinding
uit een audit (volledig of begrensd) die nog niet aantoonbaar is opgelost. Vastgelegd op verzoek van
Marcel, 5 september 2026: *"ik wil dat openstaande punten altijd meegenomen worden"* — een audit die
alleen naar nieuwe bevindingen kijkt en oude negeert, laat het cijfer kunstmatig laag hangen én maakt
een echte fix onzichtbaar.

**Vaste regel vanaf nu (zie ook AUDIT-STANDAARD.md en de scheduled-task-instructie):** **elke** audit
— volledig óf begrensd — loopt dit bestand door, verifieert elk item opnieuw met bewijs (grep/test/
berekening, niet aannemen), werkt de status bij, en telt het resultaat mee in het eindcijfer. Een item
wordt hier alleen verwijderd als het aantoonbaar is opgelost (niet: "waarschijnlijk", "zou nu moeten").
Nieuwe bevindingen uit een audit worden hier direct aan toegevoegd, niet alleen in het losse
AUDIT-STANDAARD.md-logboek.

**Statuscodes:** 🔴 open · 🟡 gedeeltelijk/terugkerend · 🟢 gefixt (datum + bewijs) · ⏸ wacht op Marcel
(geen bug, een keuze) · ⚪ niet geverifieerd deze ronde.

---

## P1 — kritiek

### P1-1 · CI draaide geen enkele stap meer (YAML-fout, beide repo's)
🟢 **Gefixt** (24 aug 2026). Bewijs: `.github/workflows/checks.yml` gebruikt nu `env.STAGING_ADMIN_KEY`
i.p.v. de kapotte `${{ secrets.X != '' }}`-expressie-conditie; code bevat een expliciete
"Audit-fix P1 (24 aug 2026)"-commentaarregel. Laatst geverifieerd: 5 sep 2026.

### P1-2 · Dagelijkse D1-backup — stil gefaald, geen alert
🟡 **Gedeeltelijk.** Het *silent-failure*-symptoom is gefixt (`scripts/backup.sh` onderdrukt de
wrangler-output niet meer naar `/dev/null`, heeft nu `CI=true` + een timeout/watcher-mechanisme die
een echte foutmelding + exitcode teruggeeft). **Maar de onderliggende oorzaak is niet weg:** het
faalpatroon in `~/Library/Logs/kantoorinzicht-backup.log` blijft intermitterend optreden (25, 27, 29,
30 aug, en **4 sep — de meest recente run, gisterennacht**) — steeds direct na een `wrangler whoami`-
achtige account-/permissie-dump in plaats van de daadwerkelijke export, wat wijst op een OAuth/
keychain-herauthenticatie-poging die niet non-interactief kan afronden onder launchd (bevestigt het
24-aug-vermoeden). **Er is nog geen mailalert toegevoegd** (`grep -n "resend\|mail\|alert"
scripts/backup.sh` → 0 treffers) — bij een faalrun ziet niemand het zonder zelf het logbestand te
openen. Laatste geslaagde run: 3 sep 2026 20:00 (85 tabellen). **Aanbeveling:** wrangler op een
API-token laten authenticeren i.p.v. OAuth voor deze niet-interactieve launchd-context (voorkomt de
herauth-trigger), plus het geplande mailalert bij een faalrun. Vereist Marcels akkoord (credential-
wijziging). Laatst geverifieerd: 5 sep 2026.

### P1-3 · Koperkaarten op matching-platform.html niet toetsenbord-bedienbaar
🟢 **Gefixt** (24 aug 2026). Bewijs: `.buyer-card` heeft nu `tabindex="0" role="button"
aria-pressed aria-label` + een `keydown`-handler voor Enter/Spatie, met een expliciete
"Audit-fix P1 (24 aug 2026)"-commentaarregel. Laatst geverifieerd: 5 sep 2026.

### P1-4 · `--muted`-kleurtoken onder WCAG AA (4,5:1) — terugkerend probleem
🟢 **Structureel gefixt (5 sep 2026).** Nieuwe waarden die op ALLE relevante achtergronden slagen:
`mna.html`/`adv.html`/`matching-platform.html` `--muted:#5a6974` (4,86-5,07:1), `marilyn.html`
`--muted:#556573` (4,63-5,11:1), `assets/kvm.css` `--muted:#556573` (4,97-5,38:1). Belangrijker dan de
kleurwaarde zelf: **`scripts/check-contrast.mjs`** toegevoegd (nieuw, rekent elke tekst-token tegen
elke surface-token na, WCAG-relatieve-luminantieformule) en verplicht ingebakken als **check 10** in
`tests/audit-consistentie.mjs` — draait dus voortaan bij elke push, geen handmatige één-achtergrond-
check meer per fix-poging. Dit is precies het patroon dat de eerdere drie fixes (19 aug, en twee keer
sindsdien) misten.

---

## P2 — hoog

### P2-5 · Matching-wachtwoord buiten de bedoelde rate-limiter te raden
🟢 **Gefixt** (24 aug 2026, met een expliciete "Audit-fix P2"-commentaarregel in de code).
**Correctie 5 sep 2026:** eerder in deze ronde ten onrechte op 🔴 gezet — die grep zocht op
`function matchingAuthOk` terwijl de code `const matchingAuthOk = async (req) => {...}` gebruikt,
dus de zoekopdracht vond niets en werd verkeerd gelezen als "geen limiter aanwezig". Bij het
daadwerkelijk willen fixen bleek `matchingAuthOk()` (`worker/19-info-fases.js:931-937`) allang een
`checkRateLimit(clientIP + ':matching-login', 10, 60*60*1000)`-aanroep te bevatten, die hetzelfde
budget deelt met `/mna/matching/login`. Geen actie nodig.

### P2-6 · Teaser/verkoopmemorandum misten de striktere AI-kostenlimiter
🟢 **Gefixt.** Bewijs: `AI_KOSTEN_PADEN` in `cloudflare-worker.js` bevat nu `/mna/teaser/genereer` en
`/mna/verkoopmemorandum/genereer`. Laatst geverifieerd: 5 sep 2026.

### P2-7 · Race condition op de teaser/verkoopmemorandum-eerstegeneratie-fee
🟢 **Gefixt** (alternatieve, door de audit zelf voorgestelde route: conditionele UPDATE i.p.v.
`isDubbeleVerzending()` hergebruiken). Bewijs: beide schrijfacties in `worker/19-info-fases.js`
gebruiken nu `UPDATE ... WHERE id=? AND teaser_tekst IS NULL` / `... AND verkoopmemorandum_tekst IS
NULL` — atomair, geen dubbele fee mogelijk. Laatst geverifieerd: 5 sep 2026.

### P2-8 · Cascade-veiligheidsnet scande alleen het hoofdbestand
🟢 **Gefixt.** Bewijs: `tests/audit-consistentie.mjs` doet nu `readdirSync` over de hele
`worker/*.js`-modulemap, niet alleen `cloudflare-worker.js`. Laatst geverifieerd: 5 sep 2026 (ook
bevestigd via een groene testrun: 27 tabellen gedekt).

### P2-9 · Foreign keys bestaan op productie, niet in de broncode
🟢 **Gefixt.** **Correctie 5 sep 2026:** eerder in deze ronde ten onrechte op 🔴 gezet — de
verificatie-grep (`grep -c "FOREIGN KEY" ... | grep -v ":0"`) gaf letterlijk `cloudflare-worker.js:20`
terug (20 treffers), maar werd fout gelezen/becommentarieerd als "0 treffers". Bij het daadwerkelijk
willen fixen bleek `initDB()` in `cloudflare-worker.js` 20 `CREATE TABLE`-statements met een
`FOREIGN KEY (traject_id) REFERENCES mna_trajecten(id) ON DELETE CASCADE`-clausule te bevatten —
dekt alle 19 tabellen uit `MIGRATIE-FOREIGN-KEYS.md` plus 2 nieuwere tabellen die de FK al vanaf
hun ontstaan meekregen. De twee destijds genoemde "ontbrekende" tabellen (`mna_gesprek_concepten`,
`mna_infoverzoek`) blijken vestigiale namen zonder ooit gebouwde `CREATE TABLE` te zijn (expliciet
gedocumenteerd in `worker/02-config-constanten.js:805-808` — bewust buiten de verwijder-cascade
gehouden om precies deze reden). Enige kleine restpunt (geen FK-gat, puur hygiëne): `mna_wijzigingen`
heeft een tweede, redundante `CREATE TABLE IF NOT EXISTS`-statement zonder FK in de losse
`loglWijziging()`-helper (`cloudflare-worker.js:1588`) — harmless, want `initDB()` (met de
FK-versie) draait bij elke request altijd eerst (`fetch()` roept `initDB(env)` aan vóór route-
dispatch), dus de FK-loze variant wint nooit in de praktijk. Kan bij gelegenheid opgeruimd worden,
is geen bug.

### P2-10 · Formuliervelden op matching-platform.html zonder `<label>`
🟢 **Vermoedelijk gefixt** — 5 `<label>`-elementen tegenover 4 `placeholder`-velden (was 0 tegenover
4). Niet één-op-één doorgelopen welk veld welk label kreeg. Laatst geverifieerd: 5 sep 2026.

### P2-11 · marilyn.html-modals zonder `aria-modal`/`role="dialog"`
🟡 **Gedeeltelijk — erger dan eerder gemeld.** Alleen het €-Verkoop-modal is gefixt (`role="dialog"
aria-modal="true" aria-labelledby`). **Correctie 5 sep 2026:** de eerste telling ("~4 modals, 1
gefixt") was zelf te grof (ruwe grep op `position:fixed.*z-index`). Een preciezere telling op
daadwerkelijke modal-openende functies (`toonBewerkModal`, `toonGesprekModal`,
`toonBegeleiderModal`, `toonMeekijkersModal`, `toonNieuwModal`, `toonUitnodigenModal`, plus het
€-Verkoop-modal) geeft minstens **7** modals — dus 1 van de 7 gefixt, niet 1 van de 4. Nog steeds
geen structurele fix (geen gedeelde modal-helper met ingebouwde `aria-modal`), status blijft 🟡
maar de resterende oppervlakte is groter dan gedacht.

---

## P3 — midden

### P3-12 · `/beveiliging`-route mist alle security-headers
🟢 **Gefixt (5 sep 2026).** Eigen headerset toegevoegd (X-Frame-Options: DENY, CSP afgestemd op de
daadwerkelijke inline stijlen/Google Fonts/inline onclick, HSTS, Referrer-Policy) — `getCORS()`'s
`default-src 'none'` blijft terecht voor de rest van de worker (JSON-only), maar was niet geschikt
voor deze ene HTML-route. Geverifieerd op staging én productie met een echte GET (een eerdere
HEAD-test gaf een vals beeld, zie audit-notitie).

### P3-13 · Diepe-audit-wachtrij had geen timeout/herstel bij een vastgelopen run
🟢 **Gefixt** (backend-commit `27aeff0`, staging + productie live, 3 sep 2026). Een `bezig`-aanvraag
ouder dan 6 uur wordt nu automatisch weer opgepakt. Laatst geverifieerd: 5 sep 2026 (deze audit-run
zelf is hier het bewijs — de wachtrij werkte zoals bedoeld).

### P3-14 · `mna_koper_zoekprofiel` lazy aangemaakt buiten `initDB()`
🟢 **Gefixt.** De `CREATE TABLE`-definitie staat nu ook in `initDB()`
(`cloudflare-worker.js:766`) — de lazy `CREATE TABLE IF NOT EXISTS` in `worker/19-info-fases.js`
blijft staan maar is nu redundant/harmless. Laatst geverifieerd: 5 sep 2026.

### P3-15 · N+1-query in het matching-overzicht
🟢 **Gefixt (5 sep 2026).** Eén query met `traject_id IN (...)` + groeperen in JS, i.p.v. 3 losse
SELECT's per traject in een loop. Zelfde patroon als de eerdere `/gebruikers/lijst`-fix (19 aug).

### P3-16 · Dode `marketing_prijs`-kolom
🟢 **Gefixt (5 sep 2026).** Kolom wordt niet meer gelezen/geschreven in `worker/16-adviseur.js`. De
kolom zelf blijft in het schema staan (verwijderen is een schema-wijziging buiten "ADD COLUMN",
bewust niet meegenomen — puur cosmetisch, geen risico).

### P3-17 · Focus-visible ontbreekt op de documentflow-stepper
🟢 **Gefixt (5 sep 2026).** `.stap-btn`-class toegevoegd aan de stepper-knop + één CSS-regel
(`.stap-btn:focus-visible{outline:...!important}`) — `!important` is nodig omdat de bestaande
inline `style="all:unset"` anders altijd wint van een externe class-regel.

### P3-18 · Sectorspecifieke waarderingsmethodiek beperkt tot EBITDA-vs-omzet
⏸ **Wacht op Marcel.** Geen bug — een scope-vraag (ARR-multiple voor IT, IGJ-risicoscore voor zorg
wel of niet bouwen). Nog niet aan Marcel voorgelegd sinds 24 aug.

---

## P4 — laag

### P4-19 · Redundante "aan/uit"-tekst in het €-Verkoop-modal-label
⚪ Niet geverifieerd deze ronde (puur cosmetisch, lage prioriteit om te checken).

### P4-20 · `target="_blank"` zonder `rel="noopener"`
🟢 **Gefixt (5 sep 2026).** Alle 27 treffers sitebreed kregen `rel="noopener"` (1 had 'm al). Geen
functionele wijziging (alle links waren al same-origin), pure hygiëne.

### P4-21 · Geen laadindicator tijdens `laadLiveData()` op matching-platform.html
⚪ Niet geverifieerd deze ronde.

### P4-22 · Groeiende monolithische bestanden
🔴 **Nog open, verergerd.** `mna/04-begeleider-dashboard.js` 2801→**3138** regels, `marilyn.html`
4095→**4253**, `worker/19-info-fases.js` 1362→**1436**. Geen acute bug, blijft een bewuste, uitgestelde
grotere ronde (zie eerdere audits). Laatst geverifieerd: 5 sep 2026.

### P4-23 · CLAUDE.md-documentatie over bestandsomvang is stale
🟢 **Gefixt (5 sep 2026).** Bijgewerkt naar het actuele regelaantal (1787) + een opmerking dat dit
periodiek moet worden bijgewerkt i.p.v. aannemen dat het klopt.

### P4-24 · AUDIT_TRIGGER_KEY leesbaar in de routine-prompt · geen JSON-download waarderingsrapport
⏸ **Geaccepteerd, geen actie.** Beide destijds al beoordeeld als bewuste afweging, geen wijziging
nodig.

---

---

## Nieuw sinds de achtste volledige heraudit (5 september 2026, zelfde dag)

Vijf parallelle deelaudits vonden deze nieuwe punten, bovenop de rondes hierboven. Volledig rapport:
https://claude.ai/code/artifact/ba7699ae-3e02-4782-9ef3-52285402d76b

### P1-25 · `/mna/chat/{code}` — koper leest verkoper↔begeleider-chat + kan begeleider spoofen
🟢 **Gefixt (5 sep 2026), en uitgebreid tot een nieuwe feature.** Marcel koos ervoor om koper niet
simpelweg uit te sluiten, maar een eigen, gescheiden koper↔begeleider-kanaal te bouwen (nieuwe
`kanaal`-kolom op `mna_chat`, rol altijd server-side bepaald via `resolveRol()` uit `worker/00-policy.js`,
`auteur` nooit meer uit de request-body). Begeleider schakelt in de UI tussen een "Verkoper"- en
"Koper"-tab. 9 nieuwe regressiechecks (NF-1) toegevoegd aan `tests/e2e-crosspath-fixes.mjs`, allemaal
groen tegen productie (81/81 totaal). Handleiding bijgewerkt in beide bestanden (mna/08 + adv.html).

### P1-26 · CI staat al 50+ runs / 5+ dagen rood op de e2e-tegen-staging-stap
🟢 **Gefixt (5 sep 2026).** Geen functionele bug — een pure authenticatiemismatch: `STAGING_ADMIN_KEY`
in GitHub Actions kwam niet meer overeen met de daadwerkelijke `ADMIN_KEY` op de staging-Worker in
Cloudflare (elk faalgeval in de CI-log was "Unauthorized"/"Authenticatie mislukt" vanaf de allereerste
admin-vereiste aanroep). Beide kanten opnieuw gelijkgetrokken met een nieuwe waarde
(`wrangler secret put ADMIN_KEY --env=staging` + de GitHub Actions-secret bijgewerkt). Live geverifieerd: de eerstvolgende CI-run (commit e2477cd) slaagde volledig
(`conclusion: success`) — de eerste groene run sinds minstens 1 september.

### P2-27 · Sequentiële INSERT's bij bankmutatie-CSV-import (geen batch)
🟢 **Gefixt (5 sep 2026).** `env.DB.batch()` in stukken van 100, in zowel `worker/22-bankmutaties.js`
als de koper-criteria-opslag in `worker/19-info-fases.js`.

### P2-28 · ~200+ velden met niet-programmatisch-gekoppeld label (geen `for=`)
🟡 **Grotendeels gefixt (5 sep 2026).** marilyn.html 70/107 → nu correct gekoppeld, adv.html 40/46,
plus de centrale DD-veld-renderfunctie in `mna/06-schermen.js` (raakt de meeste runtime-instanties
van het hele due-diligence-formulier, ook al is het maar 1 broncode-locatie) en 9 velden in
`mna/04-begeleider-dashboard.js`. **Resterend:** ~27 complexere gevallen in
`mna/04-begeleider-dashboard.js` waar het label niet direct gevolgd wordt door het invoerveld
(wrapper-elementen, tussenliggende content) — vereist individuele beoordeling, bewust niet blind
gefixt. Enkele velden in `mna/02-state-opslag-documenten.js` (4) en `mna/06-schermen.js` (2
resterend van de 10) eveneens nog open.

### P2-29 · adv.html "Terug naar overzicht" niet toetsenbordbedienbaar
🟢 **Gefixt (5 sep 2026).** `tabindex="0" role="button" aria-label` + Enter/Spatie-handler +
`:focus-visible`-stijl, zelfde patroon als de eerder gefixte `.buyer-card`.

### P2-30 · Toast-meldingen missen `aria-live`
🟢 **Gefixt (5 sep 2026).** `role="status" aria-live="polite"` toegevoegd in alle drie bestanden
(mna/02, marilyn.html, adv.html).

### P2-31 · Geen rate-limiting op chat-/Q&A-schrijfroutes
🟢 **Gefixt (5 sep 2026).** 30/uur per IP+traject op `/mna/chat/*` (POST) en beide Q&A-schrijfroutes
(`/mna/qa/*`, `/mna/qa/reactie/*`) in `worker/08-mna-qa-export.js`.

### P3-32 · Misleidend "wordt door niets aangeroepen"-commentaar in `worker/00-policy.js`
🔴 Nog open. Module is de daadwerkelijke implementatie achter `begeleiderAuth`/`rolVanCode`.

### P3-33 · Backup-fix nog niet bewezen door een echte geplande run
🟡 CLOUDFLARE_API_TOKEN staat sinds 5 sep 16:27 in de plist — eerste echte test vanavond 20:00.

### P3-34 · Geen echte pagination · P3-35 · Geen gedeelde response-body-helper
🔴 Beide bekend, bewust uitgesteld, herbevestigd ongewijzigd.

### P3-36 · Groeiende monolithische bestanden (verder toegenomen)
🔴 `worker/19-info-fases.js` 1436→1449 regels, ook al binnen dezelfde dag.

### P3-37 · Overige niet-toetsenbordbedienbare uitklap-toggles
🔴 `adv.html:751`, `mna/02-state-opslag-documenten.js:776`.

### P4-38 t/m P4-43 · CLAUDE.md-moduleaantal stale (20 vs. 28) · lazy CREATE TABLE zonder FK in `loglWijziging()` · ontbrekend `alt` op logo-preview (`adv.html:579`) · `koperMagCategorie()` null-default niet volledig geverifieerd · DSCR-label mogelijk niet in PDF-print · retentietest-pad bestaat niet meer op de gedocumenteerde locatie
🔴/⚪ Zie artifact voor volledige onderbouwing per punt.

---

## Samenvatting (5 september 2026 — bijgewerkt na een fixronde dezelfde dag)

| Status | Aantal |
|---|---|
| 🟢 Gefixt | 17 |
| 🟡 Gedeeltelijk/terugkerend | 2 |
| 🔴 Nog open | 1 |
| ⏸ Wacht op Marcel / geaccepteerd | 2 |
| ⚪ Niet geverifieerd | 2 |
| **Totaal** | **24** |

**Ná de eerste registerversie van vandaag is een fixronde gedraaid:** P1-4 (`--muted`-contrast,
structureel via een nieuw lint-script `scripts/check-contrast.mjs` + check 10 in
`tests/audit-consistentie.mjs`), P3-12 (`/beveiliging`-headers), P3-15 (N+1-query), P3-16 (dode
kolom), P3-17 (focus-visible), P4-20 (`target=_blank`) en P4-23 (stale documentatie) zijn allemaal
gefixt, getest (staging+productie, 44/44 e2e-API, 72/72 cross-path, 18/18 Playwright) en gedeployed.
Resterend: P1-2 (backup, gedeeltelijk — root cause wél gefixt via `CLOUDFLARE_API_TOKEN`, nog niet
lang genoeg bewezen om op 🟢 te zetten), P2-11 (marilyn-modals, 1 van 7), P3-18 (scope-vraag aan
Marcel), P4-19/21/24 (niet gecheckt/geaccepteerd), en P4-22 (groeiende bestanden — bewust niet
opgepakt, een aparte grotere ronde per eerdere audits).

Dit is de eerste keer dat dit register is samengesteld — voorheen werd elke "gefixt dezelfde dag"-
claim niet apart herbevestigd in een latere ronde. Vanaf nu: elke audit (volledig of begrensd) werkt
dit bestand bij, met bewijs, vóór er een nieuw cijfer wordt vastgesteld.

**Eerlijkheidshalve:** de eerste versie van dit register (67/100) bleek zelf twee verificatiefouten
te bevatten — P2-5 en P2-9 waren ten onrechte op 🔴 gezet door een verkeerd grep-patroon
respectievelijk een fout gelezen commando-uitvoer. Beide bleken bij een daadwerkelijke fixpoging
allang opgelost te zijn. Gecorrigeerd naar 10 gefixt / 7 open (was 8/9). Zie de individuele
correctie-aantekeningen bij P2-5, P2-9 en P2-11 hierboven. Les: "grep geeft niets terug" bewijst
niet dat iets ontbreekt als het patroon zelf fout kan zijn — en de output van een commando moet
echt gelezen worden, niet aangenomen op basis van een vooraf bedachte verwachting.
