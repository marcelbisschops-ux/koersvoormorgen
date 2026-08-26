# Koers voor Morgen — end-to-end testsuite

Eén commando dat vóór elke deploy bevestigt dat het hele systeem werkt. Vangnet
voor grotere wijzigingen (o.a. de geplande `mna.html`-refactor).

De tests draaien tegen de **live worker**. Ze maken hun eigen testdata aan
(een testadviseur + testtrajecten) en ruimen die aan het eind volledig op.
Het gevalideerde De Vries-demodossier (`UZ24377`) wordt **nooit** aangeraakt.

## Eenmalig installeren
```
npm install
npx playwright install chromium
```

## Deel A — API-tests (`tests/e2e-api.mjs`)
Test de worker-endpoints direct. De admin-key geef je mee via `--key=` of de
omgevingsvariabele `ADMIN_KEY` (nooit in een bestand opslaan).

```
# Snel, gratis, stil — géén AI-kosten, géén e-mails (voor vóór elke deploy):
node tests/e2e-api.mjs --key=JOUW_ADMIN_KEY

# Inclusief AI-stappen (documentextractie + waardering) — kost enkele centen:
node tests/e2e-api.mjs --key=JOUW_ADMIN_KEY --ai

# Inclusief echte e-mail (NDA-testmail via Resend naar je eigen inbox):
node tests/e2e-api.mjs --key=JOUW_ADMIN_KEY --email

# Alles in één keer:
node tests/e2e-api.mjs --key=JOUW_ADMIN_KEY --full
```

Wat wordt gecheckt: health · ongeldige login · adviseur-lifecycle
(uitnodigen → activeren → verkoop) · trajectlimiet · module-gating · rollen-login
(verkoper/koper/tussenpersoon) · DD-data opslaan en teruglezen · fasewijziging via
logboek · [--ai] documentupload + veld-extractie · [--ai] waardering-JSON ·
[--email] document-e-mail + versiehistorie · volledige opruiming.

## Deel B — UI-tests (`tests/e2e-ui.spec.js`, Playwright)
Start automatisch een lokale server voor `mna.html` en test in een headless browser.

```
npx playwright test                         # zonder admin-key: gating-groep wordt overgeslagen
ADMIN_KEY=JOUW_ADMIN_KEY npx playwright test  # inclusief module-gating-test
```

Wat wordt gecheckt:
- **Rekenkern** — de dealvoorstel-berekeningen (closing/earn-up, prijsmechanisme
  met cliff + interpolatie, buy-and-build met instelbare aannames, ruilverhouding
  bij een aandelenruil) met exacte bedragen. Dit beschermt de commerciële kern
  tegen sluipende rekenfouten.
- **Login & rollen** — foutmelding bij ongeldige code; verkoper- en
  begeleider-weergave van het De Vries-dossier.
- **Module-gating** — met module "contracten" uit zijn de zes documentknoppen
  vergrendeld. (Maakt eigen testdata; vereist admin-key.)

## Deel C — Consistentie- en veiligheidsaudit (`tests/audit-consistentie.mjs`)
Statische, lokale check — geen live traffic, geen kosten. Vangt bugklasses die
de functionele tests niet raken:
1. verkeerde/vergeten veld-referenties (mna/*.js tegen de sectorprofielen)
2. functies die per ongeluk een gelijknamige module-level function shadowen
3. `begeleiderAuth(...)`-aanroepen met een leeg/verdacht trajectCode-argument
   (het patroon achter het cross-traject-lek van 10 juli 2026, zie memory
   `project_begeleiderauth_crosstraject_lek`)
4. `"(intern)"`-gelabelde UI-blokken (checklist/notities/AI-advies) die niet
   aantoonbaar zijn afgeschermd voor de koper-rol (het patroon achter het
   rolgrens-lek van 10 juli 2026 — koper zag de interne werkaantekeningen
   van de begeleider, zie memory `project_rolgrens_lek_koper_intern`)
5. `SELECT *` op `mna_trajecten`/`mna_gesprekken` buiten een `/admin/`-route
   die binnen dezelfde handler ook `JSON.stringify(...)` teruggeeft — kandidaat
   voor een veldenlek naar een rol die daar geen recht op heeft (het patroon
   achter hetzelfde lek: `/mna/traject/` en `/mna/gesprekken/` stuurden alle
   kolommen naar elke rol, ongeacht wat die rol hoorde te zien)

```
node tests/audit-consistentie.mjs
```

Vereist dat `backend/cloudflare-worker.js` gesynct is vanuit `~/Downloads/cloudflare-worker.js`
(checks 2, 3 en 5 draaien op dat bestand). Exit code 1 bij bevindingen. Checks 4
en 5 zijn heuristisch (regelvenster-gebaseerd, geen echte parser) — een melding
betekent "controleer dit handmatig", niet automatisch "dit is stuk".

## Afspraak
Alle vijf checks groen vóór elke worker-deploy en vóór elke frontend-push.
Draait ook **wekelijks automatisch** (geplande taak, zie hieronder) — bij
bevindingen worden kleine/duidelijke fixes zelfstandig doorgevoerd en gemeld;
bij twijfel of impact wordt eerst gewacht op Marcels akkoord in de eerstvolgende sessie.

## Extra hulpmiddel — documenten uploaden via een echte browsersessie (`tests/upload-via-browser.mjs`)
De AI-extractie/velden-merge (`autoFillFromExtraction`, `mna/02-state-opslag-documenten.js`)
draait uitsluitend client-side; een document rechtstreeks via curl naar
`/mna/document/upload` sturen slaat het bestand en de AI-analyse wel op, maar
vult **nooit** de DD-velden — dat vereist altijd een browserstap (bewuste
architectuurkeuze, geen bug — de merge-logica server-side dupliceren zou het
dubbele-bron-risico herintroduceren waar dit project al eerder door is
gebeten). Voor het opbouwen van testpakketten (bijv. via een achtergrondtaak
zonder eigen browser) dit script gebruiken in plaats van curl:

```
node tests/upload-via-browser.mjs --code=<toegangscode> --fase=<fase_id> --file=/pad/naar/doc.pdf [--file=... | --dir=/pad/naar/map]
```

Automatiseert exact de bestaande, echte browserflow (login → fase → "Document
toevoegen") — geen nieuwe merge-logica. Wacht per bestand écht op de
upload- en save-netwerkresponsen (niet op een vaste sleep — AI-analyse duurt
10-30+ seconden) en meldt per bestand `verwerkt`/`AFGEWEZEN`. Zie de
commentaarblok bovenin het script voor alle opties.

## Bekende beperking
De module-gating-test tekent een verwerkersovereenkomst (VOK) voor zijn
testtraject. Die regel in `mna_vok` wordt niet door de traject-opruiming
meegewist (er is geen delete-endpoint voor). Het is een onschadelijke losse
regel met een testcode; geen klantdata.
