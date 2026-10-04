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

## Deel D — Marilyn: gekozen records verwijderen (`tests/n122-marilyn-verwijderen.mjs`, N-122/N-124)
Lokale runtimetest, geen netwerk, geen browser, geen node_modules. Laadt het echte
script uit `marilyn.html` in `node:vm` met een minimale DOM-fixture en een nep-worker,
logt in via de echte `doLogin()` en klikt tabbladen, vinkjes en knoppen. Alle data
is synthetisch. Draait ook als check 21 van `tests/audit-consistentie.mjs`.

```
node tests/n122-marilyn-verwijderen.mjs
```

Wat er in Marilyn veranderd is:
- **Leads**, **Proefaanvragen** en **Koopmandaten** (onder M&A Trajecten) hebben nu
  selectievakjes, een kopvakje dat alle records in die lijst aanvinkt en een knop
  **Verwijder geselecteerde (n)**. Onder elke lijst staat een korte instructie.
- De bestaande groepsacties (scans, terugbelverzoeken, trajecten, documenten,
  scan-rapporten) melden nu hoeveel records wél en níet verwijderd zijn, met een
  reden in gewone taal (geen toegang, niet meer gevonden, geen verbinding,
  storing). Eerder werden mislukte verwijderingen bij scans, terugbelverzoeken,
  trajecten en scan-rapporten stil overgeslagen.
- Groepsactie en losse prullenbak van leads, proefaanvragen en koopmandaten gebruiken
  dezelfde helper (`verwijderGekozen()` in `marilyn.html`): eerst een bevestiging met
  aantal en namen, daarna per record één POST naar de bestaande individuele route
  (`/admin/delete/lead/{id}`, `/adviseur/proef/aanvraag/{id}/verwijderen`,
  `/mna/admin/koopmandaat/verwijderen/{tussen_code}`), met gecodeerd padsegment.
  Er is geen bulk-endpoint, en een mislukte verwijdering wordt niet automatisch
  opnieuw geprobeerd. Daarna wordt de lijst altijd ververst en is de knop weer bruikbaar.
- Een proefaanvraag verwijderen haalt alleen de aanvraag weg. Een al aangemaakt
  proefaccount blijft bestaan en verwijdert u apart via Gebruikers. De bevestiging
  legt dit uit, zonder technische gebruikers-ID.
- Een koopmandaat verwijderen verwijdert ook de bijbehorende targets (dat deed de
  bestaande route al). Trajecten die al vanuit het koopmandaat zijn gestart blijven
  bestaan; alleen de verwijzing verdwijnt. De bevestiging noemt dit.
- Uitgesloten van selectie: vergrendelde trajecten en documenten (vakje
  uitgeschakeld), afgeschermde trajecten en koopmandaten van externe adviseurs
  (slotje, geen vakje en geen verwijderknop). De backendmuur is ongewijzigd.
  Bij documenten en scan-rapporten vinkt het kopvakje alleen de zichtbare rijen
  aan, en wat door de zoekterm verdwijnt gaat uit de selectie.

Wat de test controleert: annuleren verstuurt niets · 2 aangevinkte records worden
verwijderd en het niet-aangevinkte record blijft · HTTP 403/404/500 en netwerkfout
worden gemeld zonder statuscode of serverfouttekst · een gedeeltelijk mislukte actie
wordt als gedeeltelijk gemeld · geen automatische herhaling · dubbelklik geeft geen
dubbele POST · knop hersteld na fout (ook als verversen mislukt) · lijst ververst ·
vergrendelde/afgeschermde records en een sessie zonder superadmin of beheerderssleutel
uitgesloten · uitleg over behouden proefaccount en koopmandaat-targets.

**Acceptatie op staging (handmatig, alleen synthetische testrecords):**
open `marilyn.html?worker=https://kantoorinzicht-staging.marcel-bisschops.workers.dev`,
log in en maak per lijst minstens drie eigen testrecords aan. Controleer per lijst
(Leads, Proefaanvragen, Koopmandaten):
1. Vink twee records aan; de knop toont "Verwijder geselecteerde (2)".
2. Klik en kies **Annuleren**: er verdwijnt niets.
3. Klik opnieuw en bevestig: de bevestiging noemt beide namen (bij een proefaanvraag
   met account: dat het proefaccount blijft bestaan; bij koopmandaten: dat de targets
   ook verdwijnen en gestarte trajecten blijven). Na afloop staan de twee records er
   niet meer, het derde wel, en er verschijnt een gewone succesmelding.
4. Bij een proefaanvraag met account: het account staat nog onder Gebruikers.
5. Bij een koopmandaat waaruit een traject is gestart: dat traject staat er nog.
Verwijder geen klantdata en verwijder niets op productie om dit te testen.

**Bewust zonder groepsverwijdering (alleen losse verwijderknop):** Gebruikers,
Sectoren, Benchmarks, Matching-zoekprofielen, Agenda-blokkades en, in de trajectdetails,
documenten, versies en gesprekken. Het Postvak houdt zijn bestaande losse knop en
"Alles"-actie, ongewijzigd. Pool, specialisten en templates hebben in Marilyn geen
verwijderactie. Kantoren hebben alleen de losse actie uit Deel E (één geopend kantoor
tegelijk). Groepsverwijdering voor gebruikers, pool, specialisten, templates en
kantoren is er niet.

## Deel E — Marilyn: kantoor verwijderen (`tests/n123-kantoor-ui.mjs`, N-123/N-124)
Lokale runtimetest met dezelfde opzet als Deel D: het echte script uit `marilyn.html`
in `node:vm`, een minimale DOM-fixture en een nep-worker die het backendcontract volgt.
Geen netwerk, geen browser, geen node_modules, alleen synthetische kantoren. Draait ook
als check 22 van `tests/audit-consistentie.mjs`.

```
node tests/n123-kantoor-ui.mjs
```

Wat er in Marilyn veranderd is (tab **Kantoren**, alleen voor de beheerder met
beheerderssleutel):
- Open een kantoor met **Bekijken**; onder het detail staat de knop **Kantoor verwijderen**.
  Die geldt alleen voor dat geopende kantoor. Boven de lijst staat een korte uitleg.
- Eerst volgt een bevestiging met de kantoornaam (geen technisch ID). Annuleren verstuurt niets.
- Na bevestigen gaat er precies één `POST /mna/admin/kantoren/{id}/verwijderen` met
  `x-admin-key` en gecodeerd padsegment naar de bestaande backendroute. Er is geen bulkroute,
  er wordt niet automatisch opnieuw geprobeerd en een dubbelklik geeft geen tweede verzoek.
- Wat de backend doet: alleen een leeg kantoor wordt verwijderd, dus zonder leden (ook niet
  uitgenodigd of inactief), CRM-organisaties, CRM-opportunities, CRM-activiteiten of
  koopmandaten. Het verwijderen is logisch: het kantoor krijgt status `verwijderd` en
  verdwijnt uit de lijst. De kantoorrij, modules en prijsafspraken en de wijzigingshistorie
  blijven bewaard, en de verwijdering wordt zelf als wijziging vastgelegd. Er wordt niets
  fysiek gewist en koppelingen worden niet verwijderd. Terugzetten kan niet vanuit Marilyn.
- Een gekoppeld kantoor weigert de backend met HTTP 409. Er wordt dan niets verwijderd, en
  Marilyn meldt per soort hoeveel er nog aan hangt (bijvoorbeeld "2 leden en 1
  CRM-organisatie"). Verplaats of rond die eerst af.
- Alleen als de server het verwijderen bevestigt (`ok:true`, status `verwijderd`), sluit
  Marilyn het detail en laadt de lijst opnieuw. Bij geen toegang, niet gevonden, een gekoppeld
  kantoor, een storing, een onleesbaar antwoord of geen verbinding blijft alles staan. Er komt
  dan een gewone melding zonder statuscode of servertekst en de knop is weer bruikbaar.
- Als de kantorenlijst zelf niet laadt (geen toegang, storing, onleesbaar antwoord of geen
  verbinding), staat er een gewone melding in plaats van een lege lijst of technische fout.

Wat de test controleert: alleen het geopende kantoor wordt verwijderd · annuleren verstuurt
niets · exacte route met gecodeerd padsegment en sleutel · dubbelklik geeft één POST ·
herladen en detail sluiten alleen na succes · 409 met opsomming, niets gewijzigd · 401/403/404/500,
netwerkfout, onjuiste JSON en `ok:false` zonder vals succes en zonder herhaling, knop hersteld ·
laadfouten van de lijst begrijpelijk · geen knop of actie zonder superadmin of sleutel · deze
sectie en de uitleg in Marilyn beschrijven het feitelijke gedrag.

**Acceptatie op staging (handmatig, alleen synthetische kantoren):** open
`marilyn.html?worker=https://kantoorinzicht-staging.marcel-bisschops.workers.dev` en volg de
acceptatiestappen uit het backenddocument `docs/beheer-kantoren.md`. Maak een synthetisch kantoor
met één lid. Kantoor verwijderen geeft dan een melding met "1 lid" en het kantoor blijft staan.
Verplaats het lid en verwijder opnieuw: het kantoor verdwijnt uit de lijst. Verwijder nooit
klantkantoren en niets op productie om dit te testen.

## Deel F — Koopmandaat: generieke targetflow (`tests/koopmandaat-targetflow-ui.mjs`, `tests/koopmandaat-targetflow.spec.js`)
Backendcontract: `docs/koopmandaat-targetflow.md` in de private backendrepo
(`worker/37-koopmandaat.js`). Er zijn drie soorten bewijs. Ze vervangen elkaar niet.

**1. DOM-handlertest** (`node tests/koopmandaat-targetflow-ui.mjs`, ook check 23 van
`tests/audit-consistentie.mjs`). Draait de echte koopmandaatcode uit `mna/04` (kaarten,
targetformulier, targetflow-acties, historie, bevestigingsvenster, koperkaart), de P1C-meldingen
uit `adv.html` en het script van `introductie.html` in `node:vm`, met een minimale DOM-fixture en
een nep-worker volgens het contract. Er wordt echt geklikt, ingevuld en bevestigd. Geen netwerk,
geen browser, alleen synthetische gegevens. Dit bewijst welke verzoeken de UI stuurt en wat de
gebruiker daarna ziet. Het bewijst niet dat de backend of de gebruikersflow werkt.

**2. Browserflow, lokaal geïntercepteerd** (`npx playwright test tests/koopmandaat-targetflow.spec.js`).
Echte pagina's in Chromium. Verzoeken naar `/mna/koopmandaat/…` gaan naar de echte
`handleKoopmandaat` uit de gekoppelde backend op `node:sqlite` (`tests/n115-e2e-lokaal.mjs`).
De adviseurslogin en de sectorlijst van `adv.html` zijn fixtures. Al het andere buiten localhost
wordt afgebroken. De flow:
- een leeg koopmandaat (0 targets) opslaan, sluiten en heropenen;
- drie targets via het formulier (altijd generiek), elk apart bewerken, status en contactlog;
- target A: concept → vaststellen → link → mailprogrammaknop (mailto-inhoud gecontroleerd) →
  "Link aangemaakt" en "verzonden" als aparte stappen → document opnieuw openen na verversen →
  akkoord van de onderneming → teaser → voorstellen → koper kiest zelf (geen interesse, daarna
  interesse) → expliciete match (koper blijft anoniem) → afzonderlijke vrijgave → P1C-promotie met
  kostenbevestiging. Gegevens worden overgenomen zonder herinvoer en het bewijs blijft bewaard;
- target B: wijzigingsverzoek (versie, status en tijd zichtbaar), daarna archiveren, herstellen en
  opnieuw archiveren. De link is ingetrokken en niets is verwijderd;
- target C blijft na de promotie van A los bruikbaar;
- rollen: koper, begeleider, ander mandaat, plus de allow-list van de koperlijst;
- koperdoorgang naar de eigen trajectkopercode.

Het reguliere traject na de promotie zit niet in de lokale handler. Die test staat lokaal
expliciet als *overgeslagen*, niet als geslaagd.

**3. Dezelfde flow live op staging** (de coördinator draait dit):
```
KVM_TARGETFLOW_LIVE=1 WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
  npx playwright test tests/koopmandaat-targetflow.spec.js
```
- Echte verzoeken naar de bestaande staging-host. Elke andere host, ook productie, wordt afgebroken.
- Sleutels komen uitsluitend tijdens het draaien uit de bestaande helpers in `tests/lib.mjs`
  (`leesAdminKey`, `TEST_CLEANUP_KEY`, `d1` via wrangler, `zetMfaUitVoorTest`).
- Er wordt niets weggeschreven. Trace, screenshot en video staan uit, en eigen meldingen maskeren
  codes, tokens en sessies.
- Een synthetische adviseur (`.test`-adres) maakt het koopmandaat via de bestaande adviseursroute.
  Daarna volgt dezelfde flow, met de echte adviseurslogin in `adv.html`.
- Daarna wordt A een gewone verkoper in het bestaande reguliere traject. De verkoper vult
  Financieel in en levert een document aan als bewijsstuk (zonder AI). De adviseur controleert
  dat. De koper ziet vóór de vrijgave niets. De adviseur geeft via "Beheer koper-toegang" alleen
  Financieel vrij. De koper ziet daarna die waarde, maar niet wat in Commercieel staat.
- De VOK van de nieuwe begeleider wordt via de bestaande route getekend, zoals in
  `e2e-3rollen-regressie.spec.js`.
- Opruimen gebeurt altijd via de bestaande staging-opruimroutes, met een onafhankelijke D1-telling.
  Synthetische bewijsregels die buiten die opruiming vallen, staan als annotatie in het rapport.
- De isolatie tussen verschillende mandaten wordt alleen lokaal getest.

In geen van beide modi wordt een e-mail echt bezorgd. De knop "E-mail openen in uw
mailprogramma" wordt geklikt. Alleen de overdracht aan het besturingssysteem wordt opgevangen,
en het rapport meldt dat als "niet uitgevoerd". Een geslaagde lokale run is geen
staging-acceptatie. Een geslaagde live-run is geen productie- of juridische acceptatie: de
bevestigingstekst en het bewaarbeleid zijn nog juridisch te valideren.

## Afspraak
Alle checks van `tests/audit-consistentie.mjs` groen vóór elke worker-deploy en vóór elke frontend-push.
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
