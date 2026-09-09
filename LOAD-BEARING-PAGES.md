# Load-bearing pagina's — frontend

**Waarom dit bestand bestaat.** Op 1 september 2026 werd bij het herontwerp van de site
`registreer.html` vervangen door een redirect-stub naar een marketingpagina. Die pagina is de
enige plek waar een uitgenodigde adviseur zijn wachtwoord instelt en zijn account activeert — de
worker mailt er een eenmalige token-link naartoe (`registreer.html?token=…`). Een redirect gooit
die token weg. Zeven dagen lang kwam iedereen die op "Account activeren" klikte in een lus zonder
toegang; het werd pas ontdekt toen een echte prospect (Thijs) het meldde.

De fout kon ontstaan omdat de afhankelijkheid **onzichtbaar was vanuit deze repo**:
- de link wordt gebouwd in de **aparte, private backend-repo** (`koersvoormorgen-backend`), niet hier;
- **geen enkele pagina op de site linkt naar `registreer.html`** — een "checken of alle interne
  links kloppen"-sweep vindt 'm dus nooit;
- `build.py` kende de pagina niet (stond niet in `PAGES`), dus er werd niets gegenereerd of
  gevalideerd;
- geen enkele test loopt de uitnodigen → activeren → inloggen-flow end-to-end.

Voor een bulk-refactor zag `registreer.html` er daardoor uit als een oude losse `.html` die weg kon,
net als `kantoorscan.html`. Het herontwerp-plan zette 'm zelfs in **twee** lijstjes tegelijk:
"buiten scope, functioneel, laat staan" én "→ stub". Het tweede won.

---

## De regel (CLAUDE.md werkregel 22)

**Vóór je een bestaande, publiek geserveerde pagina verwijdert, hernoemt, tot stub maakt of
laat redirecten, controleer je eerst of een backend-flow of extern systeem ervan afhangt.**
Concreet: `grep -rn "koersvoormorgen.nl/<bestandsnaam>" ~/Documents/GitHub/koersvoormorgen-backend/backend/`
en check deze lijst. Hangt er iets van af, dan blijft de pagina functioneel — een redirect is
alleen toegestaan als de flow ná de redirect nog stééds afrondt (bij een eenmalige token-link is
dat per definitie niet zo).

Elke bulk-wijziging aan pagina's (herontwerp, IA-migratie, opschoning) loopt deze lijst expliciet
langs vóór oplevering.

De geautomatiseerde bewaker hiervan is **check 11 in `tests/audit-consistentie.mjs`** (draait bij
elke push via de pre-push-hook, in CI, en bij elke worker-deploy). Die grep't de backend-repo op
`koersvoormorgen.nl/<pad>`-verwijzingen en faalt als een genoemde pagina ontbreekt, een
redirect-stub is geworden, of niet in dit bestand staat.

---

## De lijst

Machine-leesbaar: check 11 in `tests/audit-consistentie.mjs` parse't de regels in het gemarkeerde
blok hieronder (de BEGIN/END-MANIFEST-HTML-commentaarregels, elk alleen op hun eigen regel).
Formaat per regel: `pad | mag-stub-zijn(ja/nee) | wat er breekt | hoe te testen`.
`pad` is relatief aan de site-root (zoals de worker het mailt).

<!-- BEGIN-MANIFEST -->
```
registreer.html | nee | Adviseur-uitnodiging, proefaccount-activatie én wachtwoord-reset. De worker (worker/09-gebruikersbeheer.js, worker/25-adviseur-proef.js) mailt registreer.html?token=… / ?reset=… . Stub of verwijderen = niemand kan meer activeren of z'n wachtwoord resetten. | Maak via POST /gebruikers/uitnodigen een wegwerp-uitnodiging (geeft de token terug), open registreer.html?token=<token>&redirect=adv, zet een wachtwoord, log in op adv.html. Ruim het account daarna op met POST /gebruikers/verwijder/<id>.
contact.html | nee | Contactformulier. De progressive-enhancement-fallback in assets/kvm.js POST't naar de worker /contact; zonder JS doet het formulier een gewone POST naar dezelfde pagina-URL. Pagina weg = contactformulier weg. | Open contact.html, verstuur het formulier, controleer dat er een rij in contact_berichten komt en dat de bedankpagina verschijnt.
contact-verzonden.html | nee | Bedankpagina ná het contactformulier zonder JavaScript. De worker /contact doet Response.redirect naar https://koersvoormorgen.nl/contact-verzonden (worker/06-scantool.js). Pagina weg = 404 na versturen. | Verstuur het contactformulier met JavaScript uit; je hoort op contact-verzonden.html te landen.
proefaccount.html | nee | Aanvraagformulier proefaccount. Het formulier (assets/kvm.js) POST't JSON naar de worker /adviseur/proef/aanvraag. Pagina weg = adviseurs kunnen geen proefaccount meer aanvragen. | Open proefaccount.html, dien een aanvraag in, controleer dat er een rij in adviseur_proef_aanvragen komt.
afspraak.html | nee | Zelf-boekbare afspraken. De pagina praat met de worker /agenda/slots|boek|voorstel; de worker mailt in bevestigings-/afwijzings-/annuleringsmails (worker/28-agenda.js) naar koersvoormorgen.nl/afspraak.html. Pagina is ook het doel van de nav-CTA "Plan een gesprek". Weg = niemand kan meer een afspraak plannen. | Open afspraak.html, kies een di/do-middag-slot, bevestig; controleer dat er een rij in agenda_afspraken komt (status bevestigd) en dat er een .ics-bevestigingsmail uitgaat.
voorwaarden.html | nee | Gebruiksvoorwaarden. Gelinkt vanuit worker-mails (o.a. worker/20-signhost-vok.js, cloudflare-worker.js footer) en vanuit adv.html/mna.html. | Open de links in een uitnodigings- of ondertekenmail; ze moeten de voorwaarden tonen, geen 404.
privacy.html | nee | Privacyverklaring. Idem: gelinkt vanuit worker-mailfooters en de portalen. | Als voorwaarden.html.
testvoorwaarden.html | nee | Testvoorwaarden. Gelinkt in de uitnodigingsmail voor testaccounts (worker/09-gebruikersbeheer.js, testerBlok). | Nodig een testaccount uit (is_tester:true) en volg de testvoorwaarden-link in de mail.
mna.html | nee | Verkoper-/koperportaal. De worker mailt koersvoormorgen.nl/mna.html naar verkopers, kopers, begeleiders en Q&A-deelnemers (worker/10, 11, 12, 17, 08, 19c). Dit is het hoofdproduct; een redirect is alleen acceptabel als hij eindigt op een werkend inlogscherm mét de trajectcode-flow intact. | Open een van die mails, log in met de meegestuurde code.
marilyn.html | nee | Admin-paneel. Gelinkt vanuit interne worker-notificaties (worker/11, cloudflare-worker.js). Geen publieke stub; moet blijven werken voor Marcel. | Open marilyn.html, log in.
```
<!-- END-MANIFEST -->

**Nieuwe afhankelijkheid toevoegen?** Zodra de backend een nieuwe `koersvoormorgen.nl/<pagina>`-link
in een mail of redirect zet, hoort die pagina hier in dezelfde wijziging bij — anders faalt check 11
bij de volgende push.
