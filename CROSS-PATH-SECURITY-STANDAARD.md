# Cross-Path Information-Flow Audit — vaste standaard

Vastgelegd op 19 augustus 2026, op instructie van Marcel: "los ook alle P3s op. zie dit
bijgevoegd testscript, pas het standaard toe bij programmeren en bij het doen van audits."
Dit bestand bevat de opdracht **verbatim** zoals Marcel hem heeft aangeleverd — niet
parafraseren bij het uitvoeren, wel toepassen op de daadwerkelijke stack van dit platform.

**Verhouding tot de bestaande GOUDEN STANDAARD (CLAUDE.md) en AUDIT-STANDAARD.md:** deze
standaard **versterkt en verbijzondert** de bestaande regels (met name werkregel 8/9/11d over
rolgrenzen en "nooit gokken", en de al bestaande security-sectie van `AUDIT-STANDAARD.md`) — hij
vervangt ze niet en mag er nooit mee in tegenspraak zijn. Bij twijfel geldt de striktste van de
twee. Draai deze audit **samen met** `AUDIT-STANDAARD.md`, niet als vervanging.

**Vertaling naar de daadwerkelijke architectuur van dit platform (Cloudflare Worker + D1 + R2,
geen GraphQL, geen vector-database/RAG in de klassieke zin, geen multi-tenant-SaaS met
losstaande tenants — hier is de scheiding rol-gebaseerd binnen één traject: verkoper/koper/
tussenpersoon/adviseur, en traject-gebaseerd tussen trajecten):**
- "Deal" = `mna_trajecten`-rij (traject). "Tenant" = adviseur (`bf_gebruikers`/`gebruiker_id`) voor
  de adviseursmuur, of traject voor de gewone rolscheiding.
  "Data room" = de documenten/DD-data van één traject.
- "Search index"/"AI-RAG" = de document-AI-extractie (`worker/14-document-upload-analyse.js`) en
  de AI-samenvatting/beoordelingsfuncties (`worker/19-info-fases.js`) — geen losse vector-store,
  wel een reëel cross-traject-risico via context die aan Claude wordt meegegeven.
  "Signed URL" = R2-documentdownload via `/mna/document/download/{id}?code=...`.
  "Webhook" = Signhost-webhook (`worker/20-signhost-vok.js`).
- Secties die niet van toepassing zijn op deze architectuur (GraphQL, losstaande vector-DB,
  Slack/Teams-integraties, CDN-caching van dynamische content) markeer je expliciet als **N.V.T.
  — niet aanwezig in deze architectuur**, zonder negatieve score, conform de bestaande
  N.V.T.-regel in `AUDIT-STANDAARD.md`.

---

## Checklist — Cross-Path Information Leakage Audit

Zeker. Voor een M&A-platform zou ik Claude niet alleen laten controleren op "heeft deze
gebruiker toegang?", maar vooral op "kan informatie via een indirect pad alsnog bij een partij
terechtkomen die er niet bij mag?".

De kern is een cross-path / information-flow audit: controleer iedere mogelijke route tussen
deal, gebruiker, document, metadata, search, AI, notificaties en exports.

### 1. Basisprincipe: default deny

- Is iedere gebruiker standaard uitgesloten van alle deals, rooms, documenten en datasets
  waarvoor geen expliciete autorisatie bestaat?
- Is toegang gebaseerd op een expliciete authorization decision, niet op het feit dat een object
  technisch vindbaar is?
- Is server-side authorization leidend en kan de frontend dit nooit omzeilen?
- Kan een gebruiker nooit toegang krijgen door een ID, URL, UUID, slug of andere
  objectidentifier handmatig te wijzigen?
- Zijn alle API-endpoints afzonderlijk geautoriseerd, inclusief endpoints die niet vanuit de UI
  bereikbaar zijn?
- Zijn background jobs, workers, webhooks en interne services onderworpen aan dezelfde
  toegangsregels?

### 2. Maak een information-flow matrix

Controleer iedere combinatie van: **Bron → tussenlaag → bestemming**

Bronnen: Deal · Project/workspace · Data room · Document · Documentversie · Folder · Comment ·
Q&A · User · Company/organization · Contact · Search index · AI/RAG-index · Analytics · Audit
logs · Notifications · Email · Export · Cache · Database replica · Object storage · Backups.

Bestemmingen: Andere deal · Andere workspace · Andere gebruiker · Andere organisatie · Andere
investeerder/bidder · Externe gebruiker · Admin · Support · AI-agent · Browser/client · Email ·
Webhook · Export/download.

Voor iedere route: is de route expliciet toegestaan? Zo niet: wordt de route server-side
geblokkeerd? Kan data via metadata, een afgeleide dataset, caching, logging, foutmeldingen of
timing/statusinformatie alsnog lekken?

### 3. Cross-deal isolation

Test expliciet: User A heeft toegang tot Deal A, maar niet Deal B. User A kan geen document,
document-ID, zoekresultaat, autocomplete-resultaat, documenttitel, foldernaam,
thumbnail/preview, comment, Q&A, gebruikersnaam, analytics, export, signed URL, downloadlink of
notificatie van/over Deal B krijgen.

### 4. User-to-user isolation

Kan User A nooit content zien die alleen voor User B bedoeld is? Zijn comments/mentions correct
geïsoleerd? Zijn private notes daadwerkelijk private? Zijn drafts niet zichtbaar voor
onbevoegde gebruikers? Kunnen notifications geen restricted content onthullen? Kan een
gebruiker via een mention of via sharing toegang/privilege escalation afdwingen? Worden revoked
users onmiddellijk geblokkeerd?

### 5. Search isolation

Een van de belangrijkste aanvalsvlakken. Filtert search vóór retrieval op authorization? Kan
full-text search, autocomplete, fuzzy search, snippets of highlights nooit restricted
content/resultaten onthullen? Is search-index data per tenant/deal logisch of fysiek
geïsoleerd? Is filtering niet alleen een UI-filter? Kan een gebruiker via result counts of
zoekfilters informatie over andere deals afleiden?

### 6. AI / RAG / Claude

Behandel AI als een nieuwe potentiële cross-path. Wordt authorization gecontroleerd vóór
documenten aan de AI-context worden toegevoegd? Kan de retrieval-laag uitsluitend documenten
ophalen die de huidige user mag zien? Kan Claude informatie uit Deal A gebruiken bij een vraag
over Deal B? Zijn embeddings/vector stores tenant/deal-aware? Kan semantic search restricted
documenten ophalen? Kan een prompt indirect restricted informatie laten terugkomen? Kan
conversation/agent memory tussen gebruikers of deals lekken? Worden tool calls opnieuw
server-side geautoriseerd? Kan Claude via een tool of via een combinatie van meerdere toegestane
bronnen een verboden conclusie/restricted metadata produceren? Kan Claude informatie uit
eerdere gesprekken gebruiken in een andere authorization context? Worden AI logs/traces
eveneens geïsoleerd? Zijn prompts, context windows, embeddings, caches en tool outputs
onderdeel van de security boundary?

### 7. API & object-level authorization

Test iedere endpointcategorie (GET/POST/PUT/PATCH/DELETE, bulk/batch, GraphQL, WebSocket,
streaming, download, preview, export, search). Voor elk object: kan object ID enumeration
informatie onthullen? Is object-level én parent-authorization gecontroleerd? Kan een
child-object worden benaderd nadat toegang tot de parent is ingetrokken? Kan een object via een
alternatieve endpoint worden opgehaald? Kan bulk retrieval individuele authorization checks
omzeilen?

### 8. Files & storage

Zijn storage buckets/prefixes logisch geïsoleerd? Zijn signed URLs user- en object-specific en
verlopen ze correct? Kan een oude signed URL na revoke nog werken? Zijn thumbnails/previews,
OCR-bestanden, extracted-text-bestanden, documentversies en tijdelijke bestanden afzonderlijk
beveiligd? Zijn backups niet rechtstreeks toegankelijk? Zijn CDN-caches authorization-aware?

### 9. Cache & state leakage

Is iedere cache key gekoppeld aan de juiste authorization context? Kan User B een response uit
de cache van User A krijgen? Kan een browsercache restricted content tonen na logout? Kan een
shared CDN-cache restricted content teruggeven? Wordt state na switching van
deal/workspace/entiteit correct gewist? Wordt client-side state volledig vervangen bij
tenant/deal-switching? Blijven oude search results of AI-contexten in de client staan na het
verlaten van een deal?

### 10. Metadata leakage

Controleer niet alleen de inhoud, maar ook: bestandsnaam, documenttitel, foldernaam,
bestandsgrootte, upload-/modified-tijd, auteur, owner, comment/view/download-count, status,
approval-status, documenttype, tags, search-result-count, user presence, activity timestamps,
audit events. Kan één van deze velden informatie over een restricted object onthullen?

### 11. Notifications & integrations

Kunnen e-mail-/push-notificaties restricted informatie bevatten? Kunnen
Slack/Teams-integraties, webhooks of calendar-integraties data/informatie naar de verkeerde
tenant/partij sturen of dealinformatie onthullen? Zijn webhook destinations per tenant
geïsoleerd? Kunnen external integrations oude authorization blijven gebruiken? Worden revoked
integrations onmiddellijk geblokkeerd?

### 12. Export & reporting

Worden exports opnieuw volledig geautoriseerd? Kan een bulk-export records uit meerdere deals
combineren? Zijn CSV/XLSX/PDF-exports en reports deal-/tenant-scoped? Kunnen dashboards of
aggregaties data/informatie van meerdere deals combineren of over restricted records
onthullen? Kan een gebruiker door filters of totalen informatie afleiden die hij niet mag zien?

### 13. Admin & support

Zijn admin-accounts expliciet onderscheiden van normale gebruikers? Kan support-tooling
restricted content zien? Zijn impersonation/session-switch-functies veilig en ge-audit? Kan een
supportmedewerker via search alle deals vinden? Kunnen interne dashboards data tussen tenants
combineren? Zijn production logs vrij van documentinhoud en secrets?

### 14. Revocation tests

Test altijd de overgang: access granted → data accessed → access revoked → data requested
again. Wordt toegang onmiddellijk ingetrokken? Werken oude URLs, downloadlinks of API-tokens
niet meer? Verdwijnt data uit search, AI-retrieval en caches? Worden bestaande sessions opnieuw
gevalideerd? Kunnen bestaande websocket-connections nog restricted events ontvangen?

### 15. Indirect leakage / inference

Laat Claude specifiek proberen om informatie te verkrijgen zonder het verboden object direct op
te vragen — bijv. "welke documenten bestaan er over Deal B?", "hoeveel documenten heeft Deal
B?", "wie heeft gisteren documenten geüpload?", "wat is de gemiddelde omzet in Deal B?", "kun je
op basis van alles wat je kunt zien zeggen of er een bieding is gedaan?". Kan een combinatie van
toegestane outputs restricted informatie reconstrueren? Kan verschilanalyse tussen twee
responses informatie onthullen?

### 16. Attack-path testing

Maak voor iedere gevoelige resource een graph: User → UI → API → authorization → service →
database/storage → cache/search/AI → response. Is ieder edge/pad geautoriseerd? Bestaat er een
alternatieve route naar dezelfde data? Kan een child service authorization van de parent
impliciet vertrouwen? Kan data via een "trusted internal service" ontsnappen? Kan een
low-privilege user een high-privilege workflow triggeren of data via een combinatie van meerdere
low-privilege endpoints reconstrueren?

### 17. Automated adversarial test

Laat Claude minimaal deze persona's testen: user met toegang tot Deal A / Deal B / beide /
geen; revoked user; external user; admin; support user; service account. Laat iedere persona
proberen: ID enumeration, URL-manipulatie, search-/filter-manipulatie, bulk API-toegang,
export-/download-misbruik, AI-prompt-/tool-call-manipulatie, cross-deal inference,
cache-poisoning/-toegang, session-switching, privilege escalation.

### 18. Hard security invariant

Claude mag pas "PASS" geven als deze invariant voor iedere gevoelige resource geldt: **Een
gebruiker kan geen informatie ontvangen, direct of indirect, tenzij die informatie voortvloeit
uit resources waarvoor die gebruiker op het moment van de request expliciet geautoriseerd is.**
"Informatie" = content + metadata + derived data + search results + AI context + AI output +
aggregates + existence signals + timing signals + errors + notifications + exports.

### 19. Eindcontrole

Is de authorization matrix formeel vastgelegd? Is iedere resource aan één of meer security
boundaries gekoppeld? Zijn alle cross-paths, alternatieve endpoints, indirecte leaks,
AI/RAG-paden, cache/CDN-paden, integrations en revoke-scenario's getest? Zijn negatieve tests
geautomatiseerd? Zijn tests uitgevoerd met minstens twee volledig gescheiden deals? Is bewezen
dat Deal A → Deal B-leakage = 0, User A → User B-leakage = 0, tenant A → tenant B-leakage = 0?
Zijn alle failures voorzien van een reproduceerbaar test case? Is een test alleen PASS als de
server-side authorization daadwerkelijk de blokkade veroorzaakt?

---

## Eindrapport-formaat per finding

1. **Source** — waar kan de informatie vandaan komen?
2. **Path** — via welke keten kan ze bewegen?
3. **Destination** — wie kan de informatie ontvangen?
4. **Authorization boundary** — waar had de toegang moeten stoppen?
5. **Exploitability** — hoe eenvoudig is het lek te exploiteren?
6. **Impact** — welke vertrouwelijke informatie kan uitlekken?
7. **Reproduction** — exacte stappen om het lek te reproduceren.
8. **Fix** — concrete technische remedie.
9. **Regression test** — test die voorkomt dat het lek terugkomt.
10. **Status** — PASS / FAIL / BLOCKED / NEEDS HUMAN REVIEW.

## Absolute stopregel

- Bij één bevestigde cross-deal- of cross-tenant-information-leak: security audit = FAIL.
- Niet compenseren met een frontend-fix als de server-side authorization ontbreekt.
- Niet als "veilig" classificeren omdat de route niet via de normale UI bereikbaar is.
- Niet als "veilig" classificeren wanneer Claude de informatie alleen via inference kan
  reconstrueren.

---

## Architectuurprincipe (waarom dit werkt, en waarom Claude nooit zelf de authorization-vraag mag beantwoorden)

De grootste zwakte is niet Claude zelf, maar een architectuur waarin de security boundary op de
verkeerde plek zit: **"Claude weet dat User A Deal A mag zien en Deal B niet → dus Claude zal
Deal B niet tonen"** is onvoldoende. Een LLM mag nooit de uiteindelijke authorization-beslissing
maken (OWASP: authorization moet server-side, bij iedere request en met deny-by-default worden
afgedwongen).

Gevaarlijke architectuur: `User → Claude/AI-agent → "welke documenten mag ik gebruiken?" →
Database/Vector DB` (vertrouwt op correcte redenering door Claude).

Gewenste architectuur: `User → API → AUTHORIZATION ENGINE (harde boundary) → alleen toegestane
data → Search/RAG/Claude → output policy check → User`. Claude mag de vraag "mag deze gebruiker
dit document zien?" nooit zelf beantwoorden — de applicatie moet die vraag al hebben beantwoord
vóórdat Claude het document kan zien. Vertaald naar dit platform: elke route naar `mna_data`/
`mna_documenten`/`mna_doc_versies` moet via een expliciete, server-side rolcheck lopen
(`begeleiderAuth`/`rolVanCode`/`magDocTypeZien`/`koperMagCategorie` e.d.) — nooit via een
aanname dat de aanroepende code al impliciet correct is, en nooit via een AI-prompt-instructie
("gebruik alleen wat de gebruiker mag zien") als enige waarborg.

### Praktische, geautomatiseerde mitigatie (richting, niet per se 1-op-1 te bouwen op deze schaal)

- Authorization als onafhankelijke kernel: `canAccess(user, action, resource, context) → ALLOW/DENY`,
  waar iedere route naartoe moet — Claude mag deze aanroepen, nooit vervangen door eigen
  `if`-logica.
- Canary-secrets in testtrajecten: unieke, herkenbare testwaarden per traject (bijv. een uniek
  bedrag/codewoord) waarmee een geautomatiseerde test kan bevestigen dat traject A's data nooit
  in traject B's response, zoekresultaat of AI-antwoord verschijnt.
  Vertaald naar dit platform: reeds deels aanwezig via de bestaande e2e-testsuite
  (`tests/e2e-api.mjs`/`tests/e2e-ui.spec.js`), die al specifieke cross-traject-scenario's test —
  dit principe verder uitbouwen bij nieuwe features die data across trajecten aanraken.
  Elke output krijgt idealiter lineage (`response ← document ← traject ← rol/autorisatie-beslissing`).
- Property-based/fuzz-testing op authorization-invarianten i.p.v. alleen vooraf bedachte
  ID's — waar haalbaar binnen de bestaande testtooling.
  RAG/AI als aparte security boundary: retrieval-query's altijd constrained door authorization
  vóór iets bij Claude terechtkomt, nooit "Claude, gebruik alleen wat de gebruiker mag zien" als
  enige control.
- Claude/AI zo min mogelijk macht: specifieke, hard-coded capabilities
  (`search_authorized_documents()`, `get_authorized_document()`) i.p.v. onbeperkte
  database/filesystem-toegang.
- Bij een M&A-platform: een blijvende, herkenbare testdataset per rol/traject (canary-fixtures)
  is waardevoller dan losse ad-hoc tests — sluit aan bij de bestaande
  Testdocumenten-standaard in CLAUDE.md.

## Cadans

Draai deze audit **samen met** de reguliere periodieke kwaliteitsaudit (`AUDIT-STANDAARD.md`,
maandelijks) als vast onderdeel van de security-sectie daarvan — niet als apart, losstaand
proces. Ook uit te voeren bij elke wijziging die een nieuwe cross-rol- of cross-traject-route
introduceert (nieuwe endpoint, nieuwe AI-functie, nieuwe export/notificatie), vóór oplevering.

## Logboek van uitgevoerde audits

- **19 augustus 2026 — eerste uitvoering**, direct na ontvangst van deze standaard. Multi-agent
  cross-path-informatieflow-audit (object-level authorization/IDOR-klasse, revocation-tests, muur-
  tegen-externe-adviseurs, indirecte leakage via notificaties/Q&A). Eindverdict: **FAIL**, 13
  bevindingen (F1-F13), geprioriteerd naar ernst. Status per bevinding:

  | # | Bevinding (kort) | Status |
  |---|---|---|
  | F1 | `/mna/uitnodiging`: geen cross-traject-auth (tussen_code van traject A werkte op traject B) | **Gefixt** — traject eerst herleiden uit `code`, dan pas `tussenKey` valideren tegen dát traject |
  | F2 | `/mna/signhost/stuur`: idem, plus `code`/`traject.id`-verwarring in 3 downstream statements | **Gefixt** — zelfde patroon als F1 + 3 downstream fixes (Reference-veld, UPDATE, transactielookup) |
  | F3 | Koper-categorie-intrekking niet doorgevoerd naar entiteiten/partners/qa/bankmutaties | **Gefixt** — `koperCategorieLijst`/`koperMagCategorie` toegepast in `worker/07-mna-groepen.js`, `worker/08-mna-qa-export.js`, `worker/22-bankmutaties.js` |
  | F4 | `marcel@bisschopsfinancing.nl` onvoorwaardelijk in CC bij externe-adviseurstrajecten (6+ mailflows) | **Gefixt** — gegated achter `isEigenTraject()`; 3 bewuste uitzonderingen (feedback-mail, VOK-bevestiging, admin-login-alert) expliciet niet gewijzigd |
  | F5 | Chat-state (CHAT-object) niet gereset bij uitloggen/rolwissel — mogelijk cross-sessie-lek in browser-geheugen | **Gefixt** — CHAT-reset toegevoegd aan dezelfde reset-blokken als de rest van de state |
  | F6 | `/mna/waardering/geschiedenis/{code}` zonder enige auth (elke geldige code) | **Gefixt** — `begeleiderAuth`-only, zelfde gate als `/mna/infofase/{code}` |
  | F7 | `/mna/mail-begeleider`: zwakke/geen tussen_code-validatie | **Gefixt** — verplichte exacte match tegen het herleide traject |
  | F8 | Gesprek-bijlage-routes (upload/lijst/delete/gesprek-delete) misten de `isEigenTraject`-muur die de zustergroute (`GET /mna/admin/gesprekken/{code}`) al had | **Gefixt** — 4 routes in `worker/12-mna-gesprekken-logboek.js` |
  | F9 | Dead code `/mna/groep/*` (worker/07) zonder eigen autorisatie, ongebruikt door de huidige frontend | **Bewust uitgesteld** — beslissing nodig: authorizeren of verwijderen; geen actief risico zolang ongebruikt (geverifieerd via grep) |
  | F10 | `/mna/qa/reactie/{qaId}`: existence-oracle (404 vóór authcheck) | **Gefixt** — traject eerst uit `code` herleiden, dan pas de qa-id-existence checken |
  | F11 | `mna_gesprek_bijlagen.traject_id` nooit gevuld bij INSERT — cascade (`verwijderTrajectData`) filterde al wel op deze kolom maar trof 0 rijen; R2-bestand werd nooit opgeruimd | **Gefixt** — `traject_id` nu gevuld bij upload + R2-cleanup toegevoegd aan de cascade. **Bekende beperking**: bijlages die vóór 19 aug 2026 zijn geüpload hebben nog `traject_id=NULL` en blijven wees bij trajectverwijdering — geen geautomatiseerde backfill uitgevoerd (zou een aparte, bewuste actie moeten zijn) |
  | F12 | Architectuur: generieke `/ai`-proxy (worker/06-scantool.js) heeft geen server-side traject-binding | **Bewust uitgesteld** — richtlijn voor nieuwe features (dedicated, code-geauthenticeerde endpoints), geen retroactieve fix aan bestaand gebruik zonder aparte scope-beslissing |
  | F13 | `/mna/meekijkers/{code}`: geen muur tegen ADMIN_KEY-aanroep op extern traject (marilyn toont tussen_code ook voor externe trajecten) | **Gefixt** — muur alleen bij expliciete `x-admin-key`-aanroep; normale portal-aanroep (mna.html) ongewijzigd |

  **Verificatie**: volledige bestaande e2e-suite (`tests/e2e-api.mjs`, 44/44) + consistentie-audit
  (`tests/audit-consistentie.mjs`, schoon na 2 handmatig geverifieerde false-positives toegevoegd
  aan de whitelist) + nieuwe permanente regressietest `tests/e2e-crosspath-fixes.mjs` (39/39, dekt
  F3/F6/F8/F10/F11/F13 met échte cross-rol-aanroepen tegen productie, niet alleen "geen crash").
  Alle wijzigingen gedeployed naar productie en gepusht (beide repo's, commits `28470d3`/`f6275e2`
  in het backend-repo, `1d00ba0`/`24f2768` in dit repo).

  F11's legacy-wees-bijlagen (vóór de fix) zijn niet met terugwerkende kracht opgeruimd.

  **Zelfde dag, F9 en F12 door Marcel besloten (13/13 nu afgehandeld):**
  - **F9 — gefixt**: de 6 dode `/mna/groep/*`-routes (nooit door enige frontend aangeroepen, nul
    groepen in productie) zijn verwijderd, inclusief de CREATE TABLE-definities en de
    cascade-DELETE ernaar. Backend-commit `90ff513`.
  - **F12 — bewust vastgelegd als richtlijn, geen codewijziging**: de generieke `/ai`-proxy blijft
    ongewijzigd (in gebruik voor de scan-tool op index.html/kantoorscan.html, leest zelf niets uit
    de database — geen actief lek). Vastgelegde regel: elke nieuwe traject-gebonden AI-feature
    krijgt een eigen, code-geauthenticeerde route (zoals `/mna/risicoraamwerk/genereer`), nooit de
    generieke `/ai`-proxy.

  **Zelfde dag, aanvulling — veiligheidsdashboard (marilyn.html):** de F1-F13-historie is
  gestructureerd vastgelegd in een nieuwe D1-tabel (`security_audit_log`, backend-commit
  `bb90abb`) en zichtbaar gemaakt via een nieuw "Veiligheid"-tabblad in marilyn.html
  (frontend-commit `6086d57`) — twee gauges (rood/oranje/groen), open bevindingen met "markeer
  opgelost", en een lijst recent gefixte bevindingen. Dit dient tevens als het door Marcel
  gevraagde bewijsvoerings-overzicht (expliciet doel: aantoonbaar maken dat veiligheid structureel
  prioriteit #1 is, o.a. relevant bij een eventueel juridisch geschil). Daarnaast draait er nu een
  **dagelijkse geautomatiseerde selfcheck** (aangehaakt op de bestaande nachtelijke cron in
  `scheduled()`) die in productie een eigen, zichzelf opruimend testtraject aanmaakt en de
  kern-invarianten van F3/F6/F8/F10/F13 live hertest — bij een gefaalde check ontstaat automatisch
  een nieuwe, kritieke bevinding + een waarschuwingsmail, zodat een toekomstige regressie niet stil
  kan sluipen tussen twee handmatige audits in.
