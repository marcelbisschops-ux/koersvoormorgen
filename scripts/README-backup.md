# Back-up & herstel — Koers voor Morgen

Doel: al het werk (code) én de klantdata veilig bewaren, **los van het draaiende
systeem** (Cloudflare), zodat niets verloren gaat bij een fout, verwijdering of
accountprobleem.

## Wat wordt waar bewaard

| Onderdeel | Draait op | Back-up (los van systeem) |
|-----------|-----------|---------------------------|
| Frontend (mna/marilyn/adv/index …) | Cloudflare Pages | **GitHub** (`koersvoormorgen`, elke push) |
| Backend (worker) | Cloudflare Workers | **GitHub**, aparte private repo `koersvoormorgen-backend` (los van dit backup-script — zie hieronder) |
| Klantdata (database D1) | Cloudflare D1 | **`.sql`-export** in je back-upmap (buiten Cloudflare) |
| Documenten (R2) | Cloudflare R2 | **kopie in je back-upmap** (`documenten/`, via `scripts/backup.sh`) |

## Dagelijkse/periodieke back-up draaien

```bash
cd ~/Documents/GitHub/koersvoormorgen
bash scripts/backup.sh
```

Dit exporteert de volledige database naar `~/KoersVoorMorgen-Backups/` en ververst
de backend-codekopie in de repo. Zet die back-upmap in **iCloud Drive** of op een
**externe schijf** — dan staat de klantdata automatisch los van je Mac én van Cloudflare.

Na afloop: commit + push (voor de backend-codekopie naar GitHub):
```bash
git add backend/ && git commit -m "Backend-backup $(date +%F)" && git push
```
> De `.sql`-dump met klantdata gaat **niet** naar GitHub (staat in `.gitignore`).

## Automatisch elke dag (launchd)

De Mac-taak `scripts/backup.plist` (dagelijks 20:00) is klaargezet en geïnstalleerd
in `~/Library/LaunchAgents/`. Modern macOS blokkeert achtergrondtaken echter de
toegang tot beschermde mappen (Documenten, Downloads, iCloud) — daarom is **één
eenmalige instelling** nodig:

**Stap 1 — Volledige schijftoegang geven (30 sec):**
1. Open **Systeeminstellingen → Privacy en beveiliging → Volledige schijftoegang**.
2. Klik op **+**. Druk **Cmd+Shift+G**, typ `/bin/bash`, klik **Ga** → **Open**.
3. Zet het schakelaartje achter **bash** **aan**.

**Stap 2 — De dagelijkse taak inschakelen** (Terminal, één keer):
```bash
launchctl load ~/Library/LaunchAgents/com.bisschopsfinancing.kantoorinzicht-backup.plist
```
Testen of het werkt:
```bash
launchctl start com.bisschopsfinancing.kantoorinzicht-backup
cat ~/Library/Logs/kantoorinzicht-backup.log
```
In het log moet "✓ kantoorinzicht_… .sql" staan. Vanaf dan draait de back-up elke
dag om 20:00 automatisch (mits je Mac dan aan staat).

**Alternatief zonder instellingen — handmatig ritme:** draai `bash scripts/backup.sh`
vóór elke grote wijziging en minstens 1× per week. Dat werkt altijd, zonder
schijftoegang-instelling.

## Herstellen (in geval van nood)

Database terugzetten vanuit een `.sql`-back-up naar een (nieuwe) D1-database:
```bash
# 1. Kies de gewenste back-up
ls -1 ~/KoersVoorMorgen-Backups/
# 2. Importeer in de database (LET OP: overschrijft bestaande data)
cd ~/Documents/GitHub/koersvoormorgen-backend/backend
npx wrangler d1 execute kantoorinzicht --remote --file="~/KoersVoorMorgen-Backups/kantoorinzicht_JJJJ-MM-DD_UUMM.sql"
```
**Sneller alternatief voor recente data (tot 30 dagen terug):** D1 heeft een
ingebouwde Time Travel-functie, los van dit script:
```bash
cd ~/Documents/GitHub/koersvoormorgen-backend/backend
npx wrangler d1 time-travel info kantoorinzicht --remote          # beschikbare bookmarks bekijken
npx wrangler d1 time-travel restore kantoorinzicht --bookmark=<id> --remote
```
Backend (code) terugzetten: vanuit `~/Documents/GitHub/koersvoormorgen-backend/backend`
een eerdere commit uitchecken en `npx wrangler deploy cloudflare-worker.js` draaien.

## Rollback bij een slechte deploy (geen dataherstel, alleen code)

Cloudflare bewaart automatisch alle eerdere Worker-versies. Bij een deploy die een
regressie blijkt (bug, syntaxfout die er toch doorheen glipte):
```bash
cd ~/Documents/GitHub/koersvoormorgen-backend/backend
npx wrangler deployments list          # bekijk eerdere versies met timestamp
npx wrangler rollback [version-id]     # zonder version-id: rollt terug naar de vorige
```
Dit is direct (seconden), raakt geen data, en is de snelste eerste stap bij een
productie-incident vóórdat je een inhoudelijke fix uitzoekt.

## RTO/RPO — realistische inschatting (geen formeel vastgelegde norm, wel een richtlijn)

- **Code/worker-herstel:** enkele minuten (rollback hierboven, of een eerdere commit
  herdeployen) — RTO is dus laag.
- **Database (D1):** Time Travel dekt de laatste 30 dagen automatisch, ongeacht of
  `backup.sh` die dag heeft gedraaid — RPO voor D1 is dus in de praktijk goed, mits
  binnen 30 dagen ontdekt.
- **Documenten (R2):** géén platform-eigen Time Travel-achtige voorziening. Het enige
  vangnet is `scripts/backup.sh` — RPO voor documenten is dus zo actueel als de
  laatste keer dat dit script daadwerkelijk draaide (zie hierboven: geautomatiseerd
  dagelijks vereist de eenmalige launchd-instelling; zonder die instelling is het
  RPO "sinds de laatste handmatige run", wat kan oplopen als dat een tijd geleden is).

## Documenten (R2)

`scripts/backup.sh` haalt de geüploade bestanden (R2-bucket `kantoorinzicht-docs`)
automatisch op naar `documenten/` in je back-upmap. Het is **incrementeel**: alleen
nieuwe bestanden worden gedownload (documenten wijzigen niet na upload), dus latere
runs blijven snel. De database (`.sql`) is de bron van waarheid voor welke bestanden
bestaan — zo blijven metadata en bestanden in sync.

Terugzetten van een document naar R2 (in geval van nood):
```bash
cd ~/Documents/GitHub/koersvoormorgen-backend/backend
npx wrangler r2 object put "kantoorinzicht-docs/<r2_key>" --file="<pad naar back-up>" --remote
```

## Controle 11 november 2026 (stand en verbeteringen)
- **Dagelijkse run:** launchd `com.bisschopsfinancing.kantoorinzicht-backup`, elke dag 20:00. Liep dagelijks van 9 sep t/m 8 nov 2026 (één gat op 30 okt). **9 en 10 nov mislukt:** `npx wrangler` haalde een nieuwe wrangler-versie op; die download was onvolledig (platformbinary ontbrak). Hersteld op 11 nov door de ontbrekende afhankelijkheid in de npx-cache te installeren; daarna handmatige run geslaagd (`kantoorinzicht_2026-11-11_1304.sql`, 173 tabellen, 67/67 documenten).
- **Melding bij mislukken:** werkte niet sinds de sleutelrotatie van 19 sep (verouderde sleutel in de launchd-plist; de 401 werd genegeerd). Nu: het script leest de beheersleutel uit de macOS-sleutelhanger (`kantoorinzicht-production-admin-key`), logt een geweigerde melding, en toont bij elke mislukking ook een lokale macOS-melding. De verouderde sleutel in de plist is ongeldig en wordt niet meer gebruikt; Marcel kan hem verwijderen.
- **Integriteit:** per back-up een `.sha256` van de SQL-export en een SHA-256-manifest van de documentenmap (vanaf 11 nov handmatig, zie hieronder voor automatisering).
- **Hersteltest 11 nov (geïsoleerd, lokaal, daarna gewist):** SQL-hash OK; terugzetten in een lege SQLite-database zonder fouten, `integrity_check` = ok; 67/67 documentkoppelingen aanwezig; 65/65 documenten met opgeslagen hash byte-identiek (2 oudere zonder hash, wel aanwezig).
- **Dekking R2:** de back-up haalt alle documenten op die in `mna_documenten` staan (alle objecten van bestaande trajecten: 67). Niet meegenomen: adviseurslogo's (`branding/`), exportbestanden (`export/`) en objecten van trajecten die niet meer in de database staan (zie MASTER N-186).
- **Bewaartermijn:** database-exports 60 dagen; documentenmap wordt niet opgeschoond (documenten van inmiddels verwijderde trajecten blijven in de back-up staan, zie N-186).
- **Cloudflare-eigen herstel:** D1 Time Travel actief (herstelpunt per moment, binnen de bewaarperiode van het abonnement); R2 heeft geen objectversiebeheer, herstel van documenten loopt via deze back-up.
