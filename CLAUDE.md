# KantoorInzicht — projectinstructies voor Claude Code

## Taal en stijl
- Communiceer in het Nederlands.
- Compact en direct. Geen lange uitleg vooraf; eerst doen, dan kort rapporteren.
- Marcel is geen programmeur: leg wijzigingen uit in gewone taal (wat het doet, niet hoe de code werkt), tenzij hij om detail vraagt.

## Wat is dit project
KantoorInzicht: AI-gedreven M&A due-diligence platform voor overnames van accountantskantoren.
Eigenaar: Marcel Bisschops (Bisschops Financing B.V.).

## Bestanden en rollen
- `cloudflare-worker.js` — backend (Cloudflare Worker): het hoofdbestand is nu alleen nog top-level setup (imports, auth-closures als `begeleiderAuth`/`isEigenTraject`/`hashWW` e.d., helperfuncties, `scheduled()`) + een korte keten van module-aanroepen in `fetch()` (~970 regels, was ~6800). Alle 165 MNA-routes staan in 20 genummerde modules onder `worker/` (01-verhuisscan t/m 20-signhost-vok). Patroon: elke module exporteert een handler die `null` teruggeeft als de route niet matcht (dan probeert de volgende module het); auth-closures blijven in het hoofdbestand gedefinieerd en worden als kant-en-klare parameters meegegeven aan de module die ze nodig heeft — nieuwe route toevoegen die zo'n closure nodig heeft? Geef 'm mee bij de bestaande dispatch-aanroep in cloudflare-worker.js. Nieuwe route: in de module waar het thematisch hoort, of een nieuwe module + import + dispatch-regel in cloudflare-worker.js. **Let op (23 juli 2026): `backend/` (deze bestanden) is verplaatst naar een aparte, PRIVATE repo** `koersvoormorgen-backend` (lokaal naast deze repo: `~/Documents/GitHub/koersvoormorgen-backend/backend/`) — deze publieke repo bevatte anders de volledige beveiligingslogica publiek zichtbaar. Ook uit de git-geschiedenis van deze repo verwijderd. Werk aan backend-code in die aparte map/repo, niet hier.
- `mna.html` + `mna/*.js` — verkoper/koper-portaal (het hoofdproduct). Sinds juli 2026 opgesplitst: mna.html is alleen nog HTML/CSS-skelet; de applicatiecode staat in 7 genummerde modules in `mna/` (01-config-sectorprofielen t/m 07-start-chat). **Laadvolgorde is belangrijk** — latere modules gebruiken functies uit eerdere; nieuwe code toevoegen in de module waar het thematisch hoort, of achteraan
- `marilyn.html` — admin-paneel van Marcel
- `adv.html` — adviseursportaal (betaalde externe adviseurs; login met e-mail + wachtwoord)
- `index.html` — scan-tool
- `hugo.html` — VerhuisScan (aparte module, andere sector)

## Infrastructuur
- Worker live op: https://kantoorinzicht.marcel-bisschops.workers.dev
- Frontend: GitHub Pages op koersvoormorgen.nl (repo `marcelbisschops-ux/koersvoormorgen`, branch `main`)
- Database: Cloudflare D1 `kantoorinzicht` · Documenten: R2 `kantoorinzicht-docs`
- AI-model in de worker: `claude-sonnet-4-6`

## Deployen
- **Worker:** `npx wrangler deploy cloudflare-worker.js` — draaien vanuit de map waar de wrangler-configuratie staat (historisch: ~/Downloads). Marcel heeft staand akkoord gegeven voor workerdeploys (7 juli 2026) — geen bevestiging per keer meer nodig; wel altijd eerst `node --check` en een lokale test.
- **Frontend:** commit + push naar `main` (GitHub Desktop of `git push`); GitHub Pages publiceert automatisch binnen 1-2 min. Herinner Marcel aan hard-refresh (Cmd+Shift+R) na publicatie.
- **Secrets** (ADMIN_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY) staan in Cloudflare. NOOIT een secret in een bestand of commit zetten. Nieuwe secret: `npx wrangler secret put NAAM`.

## Werkregels (hard, niet onderhandelbaar)
1. **Eén wijziging tegelijk.** Bevestig werkend (echte test, niet alleen "geen error") vóór de volgende stap.
2. **Nooit reverten — fix forward.**
3. **Test het hele systeem**, niet alleen het gewijzigde deel.
4. **Diff tegen de huidige versie** vóór opleveren; alleen de gevraagde scope wijzigen, niets erbuiten.
5. **Geen diagnose zonder data.** Niet gokken; eerst code of logs lezen (`npx wrangler tail` voor live worker-logs).
6. **Elke fix in `mna.html` ook doorvoeren in `adv.html`** (en omgekeerd waar relevant), tenzij aantoonbaar specifiek voor één van beide.
7. **Bij elke code-wijziging een test meeleveren:** curl-commando's, een checklist, of een testscript — iets waarmee Marcel zelf kan verifiëren.
8. **GOUDEN STANDAARD — nooit gokken in het platform zelf (Marcel, 24 juli 2026, mag nooit gebroken worden):** het systeem (AI-extractie, classificatie, entiteit-routing, waardering, elke automatische beslissing) mag NOOIT een onzekere waarde verzinnen of stilzwijgend een aanname doorvoeren. Bij twijfel: altijd een melding aan de gebruiker, nooit een default/gok. Specifiek bij documentclassificatie/-routing: als niet met zekerheid vaststaat bij welke entiteit/fase/veld een document hoort, dan wordt het gelabeld "handmatig toevoegen" (of gelijkwaardig) in plaats van automatisch (fout) ingedeeld. Geldt voor alle bestaande én nieuwe AI/automatiserings-code — bij twijfel over of een stuk logica hieraan voldoet: expliciet testen tegen deze regel vóór opleveren.
9. **GOUDEN STANDAARD — ook voor Claude Code zelf, niet alleen het platform (Marcel, 24 juli 2026, mag nooit gebroken worden):** vóór je iets gaat doen, vertel exact wat je waar gaat doen, welke risico's daarbij horen en hoe je die mitigeert — pas daarna uitvoeren. En: als iets niet weet, niet volledig snapt, of niet is vastgelegd (bijv. of een stuk data/benchmarktekst/claim daadwerkelijk geverifieerd is of ooit door een AI is verzonnen) — meld dat expliciet en vraag om informatie of geef concrete mogelijke antwoorden ter keuze. Nooit gokken of verzinnen, ook niet "het zal wel kloppen". Dit geldt net zo hard als punt 8 hierboven, en is er een aanvulling op, geen vervanging.
10. **Handleiding bijhouden (Marcel, 25 juli 2026):** de uitgebreide handleiding (`renderHandleiding()` in `mna/08-handleiding.js`, gedupliceerd als `renderAdvHandleiding()` in `adv.html` — zelfde inhoud, los script-context) staat achter de bestaande login, bereikbaar via de "📖 Handleiding"-knop in elk dashboard. Bij elke gebruikersgerichte wijziging (nieuwe feature, gewijzigde flow, nieuw documenttype e.d.) hoort de relevante sectie in **beide** bestanden in dezelfde wijziging bijgewerkt te worden — geen apart automatisch systeem, dit is een vaste werkregel voor mij.

## Technische valkuilen (eerder geleerd)
- `node --check` op elk JS-bestand vóór opleveren; voor HTML-bestanden met inline script (marilyn/adv/index/hugo/verhuis): het `<script>`-blok extraheren en checken. Voor mna: direct `node --check mna/*.js`.
- docx/xlsx zijn ZIP-bestanden met DEFLATE-compressie: uitpakken via de bestaande `unzipEntryText`-helper in de worker, nooit tekst-zoeken in de rauwe bytes.
- Geneste template-literals in de worker veroorzaken syntaxfouten; gebruik string-concatenatie in gegenereerde HTML.
- DELETE-methode wordt door CORS geblokkeerd; gebruik POST.
- Bij traject-verwijdering NOOIT platformbrede data (zoals `mna_templates`) meewissen.

## Verkoopmodel adviseurs (adv.html)
- Gebruikers in tabel `bf_gebruikers` met `traject_limiet` en `modules` (JSON: traject, contracten, ai_analyse, qa, export).
- Limiet/modules beheert Marcel via marilyn → Gebruikers → € Verkoop, of endpoint `/gebruikers/verkoop/{id}` (admin-key).
- Geblokkeerde acties tonen altijd: "Neem contact op met Bisschops Financing".

## Testtrajecten
- De Vries & Partners (`UZ24377`) is door Marcel zelf verwijderd (juli 2026) en wordt bewust NIET meer aangemaakt. De E2E-testsuite (`tests/e2e-ui.spec.js`) leunt hier niet meer op — die maakt en ruimt een eigen tijdelijk testtraject op.
- Marilyn en Co / Bisschops & Co: realistische testsets (echte jaarrekening-PDF's met kloppende balans) staan lokaal op het bureaublad, voor handmatig testen van uploads/extractie/groepsstructuur.

## Openstaande punten (juli 2026)
- Eigen document-templates (NDA/LoI/BEM) opnieuw uploaden in marilyn (gewist door inmiddels gefixte bug) — bewust uitgesteld door Marcel
- Volledige backlog (12 taken, eenvoudig → moeilijk, met kosteninschatting) + geautomatiseerd E2E-testplan: zie `BACKLOG.md`

### Afgerond (juli 2026)
- Stap 3 adviseursportaal: contracten-flow (NDA/LoI/BEM/Excl) achter het module-slot `contracten` — knoppen in het begeleider-dashboard van mna.html checken nu `modules.contracten`
- Prompt caching in de worker: vaste instructies + JSON-extractieschema van de documentanalyse gaan als cachebaar `system`-block mee (bevestigd: cache-hits in productie)
- EBITDA-correctie De Vries: marge 13.0 + genormaliseerd 310000 — vrijgave-flow end-to-end getest
- UptimeRobot ingesteld op `/health` (nieuw endpoint, checkt ook DB-verbinding)
