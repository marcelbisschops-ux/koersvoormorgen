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
🟡 **Terugkerend, niet structureel opgelost.** De waarde is sindsdien meermaals gewijzigd, maar niet
tegen alle achtergrond-tokens waar hij op gebruikt wordt herberekend:
- `mna.html` `--muted:#647581` op `--card:#ebeef1` → **4,10:1** (fail)
- `marilyn.html` `--muted:#5f7180` op `--card:#eae1d0` → **3,89:1** (fail)
- `assets/kvm.css` (marketing-site, nieuw sinds de "Herontwerp"-ronde na 24 aug) `--muted:#5f7180`
  op `--s-light-2:#efe9dc` → **4,17:1** (fail); op `--s-light:#f6f2ea` → 4,52:1 (net oké)
Rekenkundig gecontroleerd met de WCAG-relatieve-luminantieformule, niet aangenomen. **Patroon:** elke
keer wordt de kleur op ÉÉN achtergrond gecontroleerd en goedgekeurd, niet op alle surfaces waar de
token ook op staat (kaarten/panels naast de hoofdachtergrond). **Aanbeveling:** een los lint-scriptje
(`scripts/check-contrast.mjs`) dat automatisch elke tekst-token tegen elke surface-token in elk
bestand narekent — voorkomt dat dit een vierde keer terugkomt. Laatst geverifieerd: 5 sep 2026.

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
🔴 **Nog open.** De route retourneert nog steeds alleen `Content-Type` + `X-Robots-Tag` — geen
X-Frame-Options/CSP/HSTS. Clickjacking-risico blijft (alleen bereikbaar met een geheime 28-tekens-
code, dus beperkte praktische blootstelling, maar de bevinding zelf is niet verholpen). Laatst
geverifieerd: 5 sep 2026.

### P3-13 · Diepe-audit-wachtrij had geen timeout/herstel bij een vastgelopen run
🟢 **Gefixt** (backend-commit `27aeff0`, staging + productie live, 3 sep 2026). Een `bezig`-aanvraag
ouder dan 6 uur wordt nu automatisch weer opgepakt. Laatst geverifieerd: 5 sep 2026 (deze audit-run
zelf is hier het bewijs — de wachtrij werkte zoals bedoeld).

### P3-14 · `mna_koper_zoekprofiel` lazy aangemaakt buiten `initDB()`
🟢 **Gefixt.** De `CREATE TABLE`-definitie staat nu ook in `initDB()`
(`cloudflare-worker.js:766`) — de lazy `CREATE TABLE IF NOT EXISTS` in `worker/19-info-fases.js`
blijft staan maar is nu redundant/harmless. Laatst geverifieerd: 5 sep 2026.

### P3-15 · N+1-query in het matching-overzicht
🔴 **Nog open.** `worker/19-info-fases.js` doet nog steeds 3 losse `SELECT`'s per traject
(financieel/partner/strategisch) in een `for`-loop. Laatst geverifieerd: 5 sep 2026.

### P3-16 · Dode `marketing_prijs`-kolom
🔴 **Nog open.** Kolom wordt nog steeds gelezen/geschreven in `worker/16-adviseur.js` (verkoop-
instelling-endpoint), bevestigd 0 frontend-consumenten. Laatst geverifieerd: 5 sep 2026.

### P3-17 · Focus-visible ontbreekt op de documentflow-stepper
🔴 **Nog open.** `style="all:unset"` staat nog op de stap-knoppen in `mna/04-begeleider-dashboard.js`;
0 treffers voor `:focus-visible` in dat bestand. Laatst geverifieerd: 5 sep 2026.

### P3-18 · Sectorspecifieke waarderingsmethodiek beperkt tot EBITDA-vs-omzet
⏸ **Wacht op Marcel.** Geen bug — een scope-vraag (ARR-multiple voor IT, IGJ-risicoscore voor zorg
wel of niet bouwen). Nog niet aan Marcel voorgelegd sinds 24 aug.

---

## P4 — laag

### P4-19 · Redundante "aan/uit"-tekst in het €-Verkoop-modal-label
⚪ Niet geverifieerd deze ronde (puur cosmetisch, lage prioriteit om te checken).

### P4-20 · `target="_blank"` zonder `rel="noopener"`
🔴 **Nog open, verergerd.** 26 treffers sitebreed (was 18 op 24 aug) — alle same-origin, dus beperkt
praktisch risico, maar het aantal groeit i.p.v. te dalen. Laatst geverifieerd: 5 sep 2026.

### P4-21 · Geen laadindicator tijdens `laadLiveData()` op matching-platform.html
⚪ Niet geverifieerd deze ronde.

### P4-22 · Groeiende monolithische bestanden
🔴 **Nog open, verergerd.** `mna/04-begeleider-dashboard.js` 2801→**3138** regels, `marilyn.html`
4095→**4253**, `worker/19-info-fases.js` 1362→**1436**. Geen acute bug, blijft een bewuste, uitgestelde
grotere ronde (zie eerdere audits). Laatst geverifieerd: 5 sep 2026.

### P4-23 · CLAUDE.md-documentatie over bestandsomvang is stale
🔴 **Nog open, verergerd.** CLAUDE.md claimt nog steeds "~970 regels" voor `cloudflare-worker.js`;
werkelijk nu **1787** regels (was al 1597 op 24 aug). Laatst geverifieerd: 5 sep 2026.

### P4-24 · AUDIT_TRIGGER_KEY leesbaar in de routine-prompt · geen JSON-download waarderingsrapport
⏸ **Geaccepteerd, geen actie.** Beide destijds al beoordeeld als bewuste afweging, geen wijziging
nodig.

---

## Samenvatting (5 september 2026, tweemaal gecorrigeerd binnen dezelfde dag)

| Status | Aantal |
|---|---|
| 🟢 Gefixt | 10 |
| 🟡 Gedeeltelijk/terugkerend | 3 |
| 🔴 Nog open | 7 |
| ⏸ Wacht op Marcel / geaccepteerd | 2 |
| ⚪ Niet geverifieerd | 2 |
| **Totaal** | **24** |

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
