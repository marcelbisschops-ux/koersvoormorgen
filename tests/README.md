# KantoorInzicht — end-to-end testsuite

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
  met cliff + interpolatie, buy-and-build met instelbare aannames) met exacte
  bedragen. Dit beschermt de commerciële kern tegen sluipende rekenfouten.
- **Login & rollen** — foutmelding bij ongeldige code; verkoper- en
  begeleider-weergave van het De Vries-dossier.
- **Module-gating** — met module "contracten" uit zijn de zes documentknoppen
  vergrendeld. (Maakt eigen testdata; vereist admin-key.)

## Afspraak
Beide suites groen vóór elke worker-deploy en vóór elke frontend-push.

## Bekende beperking
De module-gating-test tekent een verwerkersovereenkomst (VOK) voor zijn
testtraject. Die regel in `mna_vok` wordt niet door de traject-opruiming
meegewist (er is geen delete-endpoint voor). Het is een onschadelijke losse
regel met een testcode; geen klantdata.
