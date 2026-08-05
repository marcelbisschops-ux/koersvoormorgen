# KantoorInzicht — Archief (uitgesteld / afgerond / afgewezen)

Afgesplitst van `BACKLOG.md` op 26 juli 2026, op Marcels verzoek: het platform gaat nu de externe
testfase in en er wordt bewust **niets meer gebouwd** tot na die fase (tenzij een test een echte bug
blootlegt — dat is geen nieuw bouwwerk, dat blijft altijd meteen oppakken). Dit bestand is geheugen,
geen actuele to-do — wordt niet standaard meegewogen tenzij Marcel het zelf noemt.

---

## Wacht op jou — korte eigen actie, geen coderingswerk

| # | Punt | Actie |
|---|------|-------|
| 1 | Eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn | Eerder gewist door een inmiddels gefixte bug — bewust uitgesteld op Marcels verzoek (26 juli 2026) |

## Bewust uitgesteld (beoordeeld, geen actieve kwetsbaarheid)

| # | Punt | Beoordeling (26 juli 2026) | Trigger om op terug te komen |
|---|------|------------------------------|-------------------------------|
| 5 | Adviseur-login-flow lijkt halfafgemaakt — `adv.html` bewaart e-mail+wachtwoord in JS-geheugen (`G.ww`) i.p.v. het bestaande `sessie_token`-mechanisme; `marilyn.html`'s `gebruikerToken` wordt nooit gezet; `registreer.html` slaat na activeren wél een `sessie_token` op maar niets leest 'm terug | **Geen actie nu.** Geen aangetoond datalek: verbinding loopt over HTTPS, en `/adviseur/trajecten` her-authenticeert sowieso al bij elke actie — het wachtwoord staat dus niet langer "geldig" dan nodig, alleen vaker in het geheugen dan strikt nodig. Dit is onafgemaakte code (het token-mechanisme bestaat al half), geen ontworpen kwetsbaarheid — passend bij een bouwfreeze om dit niet nu aan te pakken | Oppakken in de eerste bouwronde ná de externe testfase: `adv.html`/`marilyn.html` omzetten naar het bestaande `sessie_token`-patroon (token opslaan bij login, meesturen i.p.v. wachtwoord, backend valideert token) — bestaande bouwstenen zijn er al, dus relatief klein werk |

## Wacht op je jurist

| # | Punt | Status |
|---|------|--------|
| 6 | AV-concept (`AV-Bisschops-Financing-v2.0-CONCEPT.docx`, staat in Downloads) | Nog naar de jurist te sturen |
| 7 | VOK Artikel 9-concept (geanonimiseerd trajectdata-gebruik voor sectorbenchmarks/AI-verbetering) | Concept-tekst ligt klaar, wacht op jurist. Geen techniek bouwen vóór bevestiging |
| 8 | SPA-template (concept-koopovereenkomst) laten toetsen | Vóór het model als "getoetst" gebruikt wordt |

## Klaar om te bouwen — wacht op jouw inhoudelijke input

| # | Punt | Toelichting |
|---|------|-------------|
| 9 | Nieuwe sectorprofielen | DD-velden/checklists/normen per nieuwe sector — techniek staat al klaar |
| 10 | Pilot algemene DD-tool (MKB) | Bundelt bestaande sectorneutrale AI-extractie/benchmarks tot verkoopbaar algemeen product |
| 11 | Accountancy-sectorprofiel: gestructureerde omzetsplitsing + winst-per-partner | Vereist input over gewenste velden/definities |

## Bewust uitgesteld — risico-afweging, trigger om terug te komen

| # | Punt | Waarom uitgesteld | Trigger om op terug te komen |
|---|------|--------------------|-------------------------------|
| 19 | Geautomatiseerde risicoscore | Alle redflags zijn nu statische, handmatig af te vinken checklist-items | Bouwstenen zijn er al; oppakken wanneer gewenst |
| 20 | Interactieve closing-checklist | Nu een read-only tekst-textarea van een statisch sjabloon. Herbevestigd door Marcel 26 juli 2026: "closing checklist erg mager" | Oppakken wanneer gewenst — Marcels signaal dat dit prioriteit mag krijgen |
| 21 | Cloudflare WAF-upgrade | koersvoormorgen.nl staat niet op Cloudflare (DNS via TransIP, direct naar GitHub Pages), Worker heeft geen eigen route/zone — technisch niet zomaar aan te zetten. Bestaande lagen (rate-limiting, gehashte wachtwoorden, HTTPS, geparametriseerde queries, XSS-escaping) dekken het huidige risico al grotendeels | Zodra er echte betalende externe partijen met doorlopende echte dealdata actief zijn — dan eerst DNS naar Cloudflare verhuizen, daarna zone-level plan checken |
| 22 | Externe pentest | Nog nooit gedaan | Zodra er meer dan een handvol bekende testgebruikers is |
| 23 | Deal comparison / scenariovergelijking naast elkaar | Marcels woorden: "nog niet" | Op signaal |
| 24 | Dealflow-CRM / pipeline-management + target screening | Expliciet gedeprioriteerd | Op signaal |
| 25 | Geanonimiseerde cross-adviseur benchmarks | Hangt af van punt 7 (VOK Artikel 9 bij jurist) | Ná juridische goedkeuring én expliciet verzoek |
| 26 | SBR/XBRL uitbreiden (meer velden, entiteitsnaam-verificatie, namespace-validatie) | v1 is af en live | Niet urgent |
| 27 | AI-model omzetten naar `claude-sonnet-5` (nu `claude-sonnet-4-6`) | Eerst kwaliteitstest op staging vóór productie — deal-kritieke AI-extractie | Wanneer Marcel groen licht geeft voor de staging-test |
| 28 | Route/business/data-scheiding in de workermodules | Bemoeilijkt geïsoleerd testen | Architectuurkeuze, oppakken bij grotere refactor-ronde |

## Kleine, niet-urgente technische schuld

| # | Punt | Toelichting |
|---|------|-------------|
| 29 | D1-database `jurisdiction: null` | Draait feitelijk al in West-Europa, niet hard afgedwongen in config |
| 30 | Playwright-test "Gelijktijdige multi-upload" — kleine restflakiness | Root cause gevonden (300ms-vertraging in UX-code), test gefixt, 7/8 herhalingen groen |
| 31 | "Confidence score bij documentextractie"-claim is overstated | Alleen binaire leesbaar/onleesbaar-vlag, geen graduele betrouwbaarheid |
| 32 | `veiligeCode()` heeft een verwaarloosbare modulo-bias | Statistisch te verwaarlozen, puur cosmetisch |
| 33 | adv.html-documententabel + fase-detailscherm missen overflow-bescherming op mobiel | Kleine restpunten van de eerdere responsive-fix |

## Terugkerend, geen actie nu

| # | Punt | Eerstvolgende moment |
|---|------|----------------------|
| 34 | Kwartaalcheck 7 juridische templates + sector-benchmarks op actualiteit | Streefdatum 2026-10-05 |
| 35 | Maandelijkse kwaliteitsaudit (werkregel #12) | Elke maand + vóór elke grote release + op verzoek — **on hold tijdens de externe testfase-freeze**, tenzij Marcel er zelf om vraagt |

## Afgewezen — niet opnieuw voorstellen

- MIP / fiscale structuuroptimalisatie — Marcels woorden: "nee"
- "Strikte scheiding" tussen platform en eigen adviespraktijk juridisch claimen — feitelijk onwaar zolang het één eenmanszaak is

---

## Historie: recent afgerond (context, geen actie)

**26 juli 2026:** Signhost-checksum ingesteld (beide omgevingen), GitHub Actions-secret vervangen, beide repo's gesynchroniseerd op GitHub. Dark-mode-leesbaarheidsbug gefixt (LoI/BEM/NDA-modals + 9 modal-titels). Modal-toegankelijkheid volledig afgerond (29 modal-overlays, `role="dialog"`/`aria-modal`/`aria-labelledby`).

**26 juli 2026:** Documentknoppen hergroepeerd (NDA→BEM→LoI→Excl→Dealvoorstel→Bieding). Per-fase-intro voor de verkoper. Verplicht openingsscherm verkoper (adres/KvK/tekenbevoegde) bij nieuwe trajecten. HTTP-statuscode-consistentie (89 responses). Response-envelope-duplicatie opgelost (598 blokken → 1 helper). Foreign keys D1-schema volledig afgerond (19 tabellen, `ON DELETE CASCADE`) — zie `MIGRATIE-FOREIGN-KEYS.md` in de backend-repo.

**26 juli 2026:** Earn-out toegevoegd aan dealvoorstel-generatie (`dvBerekenEarnOut`, handmatig doorgerekend en live geverifieerd). LoI neemt dealvoorstel-cijfers automatisch over (`cijfers_json`, live geverifieerd). Fase-2-vrijgave-bug na LoI-ondertekening gevonden en gefixt (`S.loiGetekend` werd niet lokaal gezet bij de "buiten Signhost om getekend"-flow).

Voor oudere geschiedenis: zie git-log van beide repo's en de audit-logboeken (`AUDIT-STANDAARD.md`, `tests/AUDIT-LOG.md`).
