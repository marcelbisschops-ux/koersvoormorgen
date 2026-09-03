# LEGAL REVIEW RULES

Deze regels gelden bij **iedere** wijziging aan een juridisch document in dit project.
Ze horen bij de juridische kwaliteitsreview; de inventaris staat in
[`legal/LEGAL_INVENTORY.md`](legal/LEGAL_INVENTORY.md), openstaande punten in
`legal/LEGAL_ISSUES.md`, de reviewstatus in `legal/LEGAL_REVIEW.md`.

**Wat telt als juridisch document (toepassingsgebied):**
`voorwaarden.html`, `_src/voorwaarden.html`, `privacy.html`, `platformvoorwaarden.html`,
`testvoorwaarden.html`, de scan-disclaimer/privacyteksten in `bedrijfsscan-start.html`
en `bedrijfsscan.html`, `proefaccount.html`, `contact.html`, `contact-verzonden.html`,
`lead-aandragen.html`, `matching-platform.html`, `viewer.html`; en in de backend-repo
`koersvoormorgen-backend`: `GEBRUIKSVOORWAARDEN_TEKST` / `buildAvTekst()` /
`AV_VERSIE` / `GV_VERSIE` in `cloudflare-worker.js`, `BF_TEMPLATES` (NDA, LOI, bieding,
SPA-aandachtspunten, bemiddelingsovereenkomsten verkoop/opvolging/aankoop,
exclusiviteitsbrief, closing-checklist, ingebedde AV) in
`worker/02-config-constanten.js`, de VOK-tekst in `worker/20-signhost-vok.js`, en
`VOK_TEKST` / `VOK_VERSIE` in `mna/04-begeleider-dashboard.js`. Ook juridisch relevante
beweringen op marketingpagina's (claims, certificeringen, bewaartermijnen) vallen eronder.

---

## Algemene regel

Beoordeel juridische wijzigingen **inhoudelijk, niet alleen syntactisch**.

## Verplicht controleren

Bij iedere wijziging aan juridische documenten:

- definities
- scope
- verplichtingen
- rechten
- aansprakelijkheid
- betaling
- beëindiging
- vertrouwelijkheid
- privacy
- intellectueel eigendom
- toepasselijk recht
- forumkeuze
- onderlinge consistentie.

## M&A

Bij iedere wijziging aan M&A-documenten expliciet controleren:

- fee entitlement
- transaction definition
- tail period
- indirect transaction
- affiliated parties
- introduced parties
- non-circumvention
- exclusivity
- termination
- confidentiality
- liability
- client information responsibility
- conflicts of interest.

## Wijzigingsdiscipline

Niet wijzigen omdat een andere formulering "mooier" klinkt.

Een wijziging moet minimaal één van deze redenen hebben:

1. juridisch risico verminderen;
2. bescherming verbeteren;
3. inconsistentie oplossen;
4. wettelijke/regelgevende wijziging verwerken;
5. aantoonbare marktstandaard verbeteren;
6. materiële onduidelijkheid oplossen.

## Geen disclaimer-reflex

Niet automatisch adviseren om een advocaat te raadplegen.

Alleen een juridisch onzeker punt escaleren wanneer er daadwerkelijk relevante
onzekerheid bestaat. Markeer dat dan als **JURIDISCHE ONZEKERHEID** met een korte
uitleg waarom verschillende interpretaties mogelijk zijn.

## Output

Iedere materiële bevinding bevat:

- probleem
- risico
- huidige tekst
- voorgestelde tekst
- reden
- prioriteit.

Prioriteitsniveaus: **CRITICAL** (materieel juridisch/financieel/operationeel risico) ·
**HIGH** (belangrijk risico of duidelijke afwijking van professionele standaard) ·
**MEDIUM** (juridisch of commercieel relevante verbetering) · **LOW** (redactioneel/
structureel) · **INFO** (optimalisatie, geen fout).

## Regression check

Controleer na iedere wijziging of de wijziging geen bescherming of commerciële werking
uit een **ander** juridisch document onbedoeld aantast. Loop daarvoor minimaal na:
aansprakelijkheidsregime, fee-/betaalafspraken, bewaartermijnen, definities van
"transactie" / "opdracht" / "cliënt", forumkeuze, en kruisverwijzingen tussen documenten.

## Behoud van commerciële bedoeling

- Behoud de commerciële bedoeling van de bepaling.
- Maak bepalingen niet onnodig agressief; geen onredelijke of moeilijk afdwingbare clausules.
- Verander geen commerciële voorwaarde (bedragen, percentages, termijnen, fee-grondslag)
  zonder dat expliciet als zodanig te markeren.
- Verwijder geen belangrijke bescherming zonder in de bevinding te benoemen waarom dat kan.
- Schrijf helder Nederlands; vermijd jargon dat niets toevoegt; behoud branding en tone of voice.

## Bronnen

Bij een materiële juridische wijziging: noem de relevante wettelijke/regelgevende basis
(BW-artikel, AVG-artikel, afd. 6.5.3 BW, Rv, Wwft waar relevant) en de datum van controle.
Gebruik geen willekeurige online template als "standaard" zonder te toetsen of die past
bij deze situatie (Nederlands recht, B2B met mogelijke B2C-uitloop, digitale dienst +
M&A-bemiddeling).

## Versiebeheer

Bij een inhoudelijke wijziging aan een document met een versienummer: hoog het
versienummer op, werk de datum bij, en registreer de wijziging in `legal/LEGAL_REVIEW.md`.
Documenten met een acceptatieflow (adviseur-GV `GV_VERSIE`, VOK `VOK_VERSIE`,
`AV_VERSIE`) triggeren daarmee hernieuwde acceptatie — weeg of dat gewenst/proportioneel is.

## Periodieke review ("Run legal review")

Zie `legal/LEGAL_REVIEW.md`. Een periodieke review herschrijft niet standaard documenten;
alleen wijzigen bij een concrete reden uit de lijst onder **Wijzigingsdiscipline**.
