# Standaard periodieke kwaliteitsaudit — KantoorInzicht

Vastgelegd op 25 juli 2026 op verzoek van Marcel, diezelfde dag tweemaal aangescherpt tot de
huidige, volledige versie. Dit is de vaste, technologie-onafhankelijke audit-opdracht die Claude
Code periodiek (zie cadans onderaan) en bij elke nieuwe sessie die hierom vraagt, uitvoert op de
**volledige codebase, front- én backend**: deze frontend-repo (`mna.html`+`mna/*.js`, `adv.html`,
`marilyn.html`, `index.html`, `hugo.html`) + de aparte private backend-repo
`koersvoormorgen-backend` (`cloudflare-worker.js` + `worker/*.js`). Zie CLAUDE.md, werkregel #12,
voor de verwijzing hiernaartoe.

Dit bestand bevat de opdracht **verbatim** zoals Marcel hem heeft aangescherpt — niet parafraseren
bij het uitvoeren, wel toepassen op de daadwerkelijke stack (Cloudflare Worker/JavaScript, geen Java).

**Continue verbetering (staande afspraak, 25 juli 2026):** deze opdracht is geen bevroren
document. Zodra tijdens het uitvoeren van een audit, tijdens regulier ontwikkelwerk, of via een
extern inzicht (nieuwe OWASP-richtlijn, nieuwe WCAG-versie, een relevante M&A-/waarderingspraktijk
die nog niet in de checklist stond, een nieuwe compliance-eis) een controlepunt naar voren komt dat
hier ontbreekt en aantoonbaar waarde toevoegt, wordt dat als nieuwe sectie/regel aan dit bestand
toegevoegd — met een korte reden in het logboek onderaan waarom. Geen wijziging aan de opdracht
zonder zo'n reden; dit blijft de opdracht van Marcel, niet een vrij invulbaar sjabloon.

---

## M&A Applicatie Validatie-opdracht (Volledige Audit op Volledigheid)

### Doel
Dit is geen verzoek om nieuwe functionaliteit te ontwikkelen. Ga ervan uit dat er reeds een
werkende applicatie bestaat voor de waardering van ondernemingen. De taak is uitsluitend om de
bestaande codebase, architectuur, businesslogica en gebruikersinterface te analyseren en te
beoordelen op volledigheid, kwaliteit, veiligheid, onderhoudbaarheid, prestaties en
M&A-correctheid. Identificeer uitsluitend aantoonbaar ontbrekende functionaliteit, risico's en
verbeterpunten die de kwaliteit van de applicatie daadwerkelijk verhogen. Voer geen cosmetische
refactoring uit en doe geen aanbevelingen die uitsluitend gebaseerd zijn op voorkeur voor een
bepaalde programmeertaal, framework of architectuur.

### Rol
Gedraag je als een multidisciplinair reviewteam bestaande uit: Senior Software Architect, Lead
Software Engineer, Security Architect, Cloud Architect, DevOps Engineer, QA Lead, Register
Valuator, Corporate Finance Consultant, M&A Adviseur, Financial Modelling Specialist, Business
Analyst, UX Specialist, Data Architect.

### Belangrijke uitgangspunten
Beoordeel uitsluitend de daadwerkelijk aanwezige implementatie. Pas je beoordeling aan op de
gebruikte technologie. Wanneer een controlepunt niet van toepassing is vanwege de gekozen
architectuur of technologie, markeer dit als **N.V.T. – Niet van toepassing vanwege de gebruikte
technologie of architectuur**, zonder negatieve score, zonder fictieve tekortkomingen, zonder
aanbevelingen om uitsluitend een andere technologie te gebruiken. Baseer alle conclusies op
aantoonbare bevindingen. Maak onderscheid tussen: Aantoonbaar aanwezig; Aantoonbaar ontbrekend;
Waarschijnlijk aanwezig maar niet verifieerbaar; Niet van toepassing.

### Bedrijfstypen
Controleer of de applicatie geschikt is voor: MKB-ondernemingen, accountantskantoren,
administratiekantoren, zorginstellingen, zakelijke dienstverlening, familiebedrijven,
groeibedrijven, scale-ups, holdingstructuren, participatiemaatschappijen.

### Architectuur
Modulaire architectuur; scheiding van verantwoordelijkheden; schaalbaarheid; onderhoudbaarheid;
uitbreidbaarheid; losgekoppelde componenten; configuratiebeheer; validatie; logging;
foutafhandeling; domeinmodellering; service-architectuur; API-ontwerp; event-driven architectuur
indien relevant; herbruikbare componenten; dependency management; ontwerpprincipes (SOLID, DRY,
KISS); design patterns waar passend; testbaarheid.

### Backend
Businesslogica; services; validaties; foutafhandeling; API's; autorisatie; authenticatie; caching;
asynchrone verwerking; transactieverwerking; configuratie; dependency management; resourcebeheer;
schaalbaarheid; performance.

### Frontend
UI-consistentie; UX; responsive design; mobiele bruikbaarheid; toegankelijkheid (WCAG); formulieren;
validatie; foutmeldingen; loading states; empty states; navigatie; interactieve dashboards;
grafieken; tabellen; exportfunctionaliteit; gebruiksgemak; consistent kleurgebruik;
componenthergebruik; browsercompatibiliteit; toetsenbordnavigatie; focus management; kleurcontrast;
gebruikersfeedback; performance. Aanvullend expliciet te checken: consistente vormgeving,
state management, event handling, dark/light mode indien aanwezig, interactieve grafieken,
realtime updates, Core Web Vitals waar relevant.

### API & Integraties
REST/API-ontwerp; versiebeheer; consistente endpoints; foutcodes; request-validatie;
response-validatie; JSON-schema's; authenticatie; autorisatie; rate limiting; pagination;
filtering; sorting; caching; backwards compatibility; idempotency; webhook-ondersteuning; externe
integraties; audittrail.

### Data
Datamodellen; dataconsistentie; validatie; referentiële integriteit; configuratiedata; migraties;
import; export; auditgegevens; versiebeheer van gegevens; historische gegevens.

### Codekwaliteit
Duplicatie; code smells; onnodige complexiteit; leesbaarheid; onderhoudbaarheid; consistente
naamgeving; documentatie; foutafhandeling; cyclomatische complexiteit; geheugenbeheer;
resourcebeheer; asynchrone verwerking; concurrency-problemen; technische schuld.

### Security
Minimaal: OWASP Top 10; inputvalidatie; outputencoding; authenticatie; autorisatie; sessiebeheer;
secrets management; encryptie; hashing; tokenvalidatie; auditlogging; dependency vulnerabilities;
least privilege; veilige configuratie; rate limiting; SQL-injection; NoSQL-injection; command
injection; XSS; CSRF; SSRF; path traversal; insecure deserialization; CORS; security headers.

### Teststrategie
Unit tests; integratietests; regressietests; end-to-endtests; API-tests; performancetests;
securitytests; edge cases; boundary testing; negatieve tests; testautomatisering; testdekking —
passend bij de daadwerkelijk gebruikte stack (in dit project: geen JUnit/Mockito, wel de eigen
Playwright-, API- en regressietestomgeving in `tests/`).

### Waarderingsmodellen
Controleer volledige implementatie van:

- **EBITDA Multiple**: genormaliseerde EBITDA; normalisaties; eigenaarssalaris; incidentele
  posten; synergie; sectorafhankelijke multiples; multiplebandbreedtes.
- **EBIT Multiple**: correcte implementatie.
- **DCF**: vrije kasstromen; CAPEX; werkkapitaal; belasting; terminal value; Gordon Growth; exit
  multiple; WACC; discontering; scenarioanalyse; gevoeligheidsanalyse.
- **Asset Based**: intrinsieke waarde; gecorrigeerde intrinsieke waarde; stille reserves; stille
  lasten.
- **Liquidatiewaarde**: correcte implementatie.
- **Goodwill**: overwinstmethode; kapitalisatiemethode; economische goodwill.

**Verplichte werkwijze bij elke controle van dit onderdeel** (toegevoegd 25 juli 2026, na een
externe "Enterprise Validation Framework"-testset van Marcel — zie logboek voor welke onderdelen
daarvan wel/niet zijn overgenomen en waarom): voor elke waarderingsformule die gecontroleerd wordt,
(1) toon de gebruikte formule expliciet, (2) reken een concreet testgeval onafhankelijk na met de
hand/een los scriptje (niet vertrouwen op de code zelf om zichzelf te controleren), (3) vergelijk
met de daadwerkelijke functie-uitkomst, (4) stress-test met 0/negatieve/extreme invoer op
crash/NaN/Infinity, (5) controleer reproduceerbaarheid (zelfde invoer → zelfde uitkomst — triviaal
waar, maar wel controleren, want een toekomstige niet-deterministische toevoeging zou dit breken).
Wanneer een gecontroleerd onderdeel (bijv. CAPM-gebaseerde WACC-opbouw, een volledige
resultatenrekening-opbouw vanaf omzet, peer-group-multiples, Monte Carlo) niet in dit platform
bestaat: markeer expliciet **N.V.T. — niet geïmplementeerd in dit datamodel**, nooit een fictieve
berekening ophangen aan data die het platform niet vastlegt.

### Financiële analyse
EBITDA; EBIT; Nettowinst; Brutomarge; Current Ratio; Quick Ratio; Solvabiliteit; Rentabiliteit;
ROE; ROA; ROS; DSCR; Interest Coverage; Net Debt; Working Capital; Cash Conversion; Vrije
kasstroom; Burn Rate; Runway; Omzetgroei; EBITDA-marge; Netto kaspositie.

### Sectorspecifieke waardering
Controleer ondersteuning voor: MKB, Accountancy, Administratiekantoren, Zorg, ICT, Software,
Consultancy, Industrie, Retail, Groothandel.

**Accountantskantoren**: recurring omzet; controleomzet; samenstelomzet; fiscale omzet;
adviesomzet; declarabiliteit; bezettingsgraad; omzet per FTE; winst per partner;
partnerafhankelijkheid; automatiseringsgraad; AI-volwassenheid; compliance-risico; klantverloop.

**Administratiekantoren**: abonnementen; terugkerende omzet; loonadministratie; boekhouding;
fiscale dienstverlening; automatiseringsgraad; klantretentie.

**Zorg**: WTZA; NZa; contractering; zorgverzekeraars; personeelstekorten; omzetmix;
kwaliteitsindicatoren; IGJ-risico; vastgoed; wachtlijsten.

### Risicoanalyse
SWOT; PESTEL; Porter; klantconcentratie; leveranciersconcentratie; personeelsafhankelijkheid;
juridische risico's; compliance; cybersecurity; ESG; operationele risico's; financiële risico's.

### AI-functionaliteit
Automatische risicoscore; waarderingsadvies; onderbouwing van de waardering; confidence score;
scenarioanalyse; benchmarking; detectie van ontbrekende data; kwaliteitscontrole van invoer;
AI-verklaarbaarheid; consistentiecontrole.

### Rapportage
PDF; Excel; CSV; JSON; API-output; dashboards; grafieken; waterfall; gevoeligheidsanalyse;
managementrapport; investeringsrapport; exportmogelijkheden; printvriendelijke rapporten.

### Performance
Schaalbaarheid; prestaties bij grote datasets; caching; query-optimalisatie; databaseprestaties;
geheugenverbruik; asynchrone verwerking; responstijden; cloud-efficiëntie.

### Cloud & Deployment
CI/CD; deploymentstrategie; rollback-mogelijkheden; monitoring; metrics; alerting; logging;
secrets management; environment-configuratie/-management; fouttolerantie; back-upstrategie;
disaster recovery; schaalbaarheid; beschikbaarheid/uptime; kostenoptimalisatie/cloudkosten.

### Compliance
AVG/GDPR; audittrail; logging; versiebeheer van berekeningen; reproduceerbaarheid;
herleidbaarheid; bewaartermijnen; gegevensclassificatie.

### Verwachte output
Uitsluitend een auditrapport. Voor ieder controleonderdeel:

- **Status** (OK / Waarschuwing / Ontbreekt / N.V.T.)
- **Risico** (Laag / Midden / Hoog / Kritiek)
- **Technische onderbouwing**
- **Zakelijke impact**
- **Aanbevolen oplossing**
- **Prioriteit** (P1 t/m P4)

Maak duidelijk onderscheid tussen: Aantoonbaar aanwezig; Aantoonbaar ontbrekend; Niet
verifieerbaar; Niet van toepassing.

Sluit af met objectieve scores (0–100) voor:
1. Architectuur
2. Backendkwaliteit
3. Frontendkwaliteit
4. API & Integraties
5. Datakwaliteit
6. Codekwaliteit
7. Security
8. Testkwaliteit
9. Performance
10. Cloud-/Deploymentkwaliteit
11. M&A-functionaliteit
12. Financiële correctheid
13. Onderhoudbaarheid
14. Enterprise Readiness
15. Totale applicatiekwaliteit

Sluit af met een geprioriteerde lijst van alle ontbrekende functionaliteiten, risico's en
verbeterpunten die noodzakelijk zijn om de applicatie geschikt te maken voor professioneel gebruik
door corporate-financeadviseurs, register valuators, accountantskantoren, M&A-specialisten,
investeerders en private-equitypartijen. Iedere aanbeveling moet gebaseerd zijn op aantoonbare
bevindingen uit de bestaande applicatie en mag nooit gebaseerd zijn op aannames of voorkeuren voor
een specifieke programmeertaal, framework of architectuur.

---

## Cadans

Elke maand (sinds 25 juli 2026 — zie logboek-toelichting hieronder; was daarvoor elk kwartaal).
Ook uit te voeren vóór een grote release of wanneer Marcel erom vraagt. De aparte kwartaalcheck
voor sjablonen/benchmarks (zie CLAUDE.md "Openstaande punten") loopt op zijn eigen, ongewijzigde
kwartaalcadans — deze audit is daar niet meer aan gekoppeld.
Bevindingen die na een audit zijn opgelost, hoeven bij de volgende audit niet opnieuw als
aanbeveling te verschijnen — wel kort als "OK/aantoonbaar aanwezig", zodat regressie zichtbaar
wordt als dat verandert. Elke audit dekt zowel de frontend- als de backend-repo; een audit die
alleen één van beide behandelt telt niet als volledig.

## Logboek van uitgevoerde audits

- **25 juli 2026 (externe testset — "Enterprise Validation Framework", 21 modules EVF-001 t/m
  EVF-026, door Marcel aangeleverd)** — op zijn instructie ("alleen die onderdelen toevoegen die
  relevant zijn voor mijn platform en die nog niet in je eigen script zitten") getrieerd i.p.v.
  letterlijk uitgevoerd: de meeste modules (PPA/IFRS3, CAPM-WACC-opbouw, peer-group-multiplestatistiek,
  Monte Carlo, LBO-cash-sweep, ESG-scoring-engine, formele pentest/CVSS, 24-uurs-loadtests met
  duizenden gelijktijdige gebruikers, organisatie-governance/RACI) bestaan niet in dit platform of
  vergen infrastructuur/tooling die hier niet beschikbaar is — expliciet als N.V.T. gemarkeerd,
  niet uitgevoerd met verzonnen data. Het financieel-rekenkundige deel (EVF-001/002/004/005) is wél
  uitgevoerd als een echte, onafhankelijke herberekening tegen de daadwerkelijke code
  (`mna/03-rekenkern-waardering.js`) met de door Marcel aangeleverde testcijfers (Alpha Holding BV),
  plus stress-tests (nul/negatief/extreem) en een reproduceerbaarheidscheck — 16/16 geslaagd (één
  aanvankelijke "fout" bleek een eigen testscript-fout, geen platformbug: ontbrekende `vpbPct` in de
  teststub, niet in de code zelf).

  **Eén nieuwe, echte bevinding (geen P1/P2 — bewuste, veilige-richting vereenvoudiging, geen bug):**
  de DCF-vrije-kasstroom belast de volledige EBITDA i.p.v. EBIT (EBITDA minus afschrijvingen/
  amortisatie) — standaard corporate-finance-theorie belast EBIT en telt D&A daarna niet-cash terug
  op (het "depreciation tax shield"). Het platform kent geen los DD-veld voor afschrijvingen/
  amortisatie (zit besloten in het EBITDA-cijfer), dus dit is een structurele modelkeuze, geen losse
  fout — en werkt in de veilige richting (onderschat de FCF/waarde licht, i.p.v. overschat, in
  tegenstelling tot de eerdere P1 #6-bug van dezelfde dag die wél overschatte). Bewust niet blind
  gefixt: zou een nieuw DD-veld (afschrijvingen) vereisen, een scope-keuze net als bij eerdere
  P1-punten vandaag — aan Marcel voorgelegd, niet unilateral gebouwd.

  De methodologie (formule tonen, onafhankelijk narekenen, vergelijken, stress-testen,
  reproduceerbaarheid checken) is overgenomen als vaste werkwijze-eis voor de
  Waarderingsmodellen-sectie hierboven — dat is het deel van deze externe testset dat aantoonbaar
  waarde toevoegde aan de bestaande audit-opdracht.

- **25 juli 2026 (cadans-wijziging)** — Marcel: cadans van elk kwartaal naar elke maand, wegens het
  hoge bouwtempo (12 features in één sessie op 25 juli) — sneller signaal nodig dan een kwartaal kan
  geven. De aparte sjabloon-/benchmark-kwartaalcheck blijft ongewijzigd per kwartaal.

- **25 juli 2026** — eerste, verkennende uitvoering (Correct/Verbeterbaar/Ontbreekt/N.v.t.-formaat,
  vóórdat deze opdracht als werkregel #12 werd vastgelegd). Twee kritieke, zelf-in-de-code-
  geverifieerde bevindingen: adviseur-login (`adv.html`) crasht altijd doordat `verifyWW` nergens
  is gedefinieerd/doorgegeven; hoofdwaarderingsscherm claimt sectorbenchmarks te gebruiken maar
  gebruikt een vaste multiple ongeacht sector.

- **25 juli 2026 (zelfde dag, tweede ronde)** — volledige uitvoering tegen de eerste
  technologie-onafhankelijke versie van deze opdracht (10 scores). Scores: Architectuur 72,
  Codekwaliteit 68, Security 66, M&A-functionaliteit 58, Financiële correctheid 54,
  Onderhoudbaarheid 66, Performance 64, Testkwaliteit 52, Cloud-/Enterprise Readiness 50,
  **Totaal 62/100**. Vier P1-bevindingen (alle vier zelf in de code geverifieerd):
  1. Adviseur-login crasht altijd (`verifyWW` ontbreekt, zie hierboven).
  2. Hoofdwaarderingsscherm gebruikt een vaste multiple ongeacht sector, ondanks claim van het
     tegendeel (zie hierboven).
  3. AI-modelversie/promptversie wordt niet vastgelegd bij een waardering (`mna_waarderingen`) —
     bij een toekomstige modelwissel niet meer herleidbaar welk model een eerdere waardering
     produceerde.
  4. Geconsolideerde EBITDA-marge kan een verzonnen "0,0%" tonen wanneer omzet wel maar EBITDA nog
     niet is aangeleverd (`cloudflare-worker.js:85-89`) — schendt de gouden standaard.

  Verder 10 P2-punten (o.a. AVG-verwijderrecht dekt geen enkele `mna_*`-tabel, DCF mist
  werkkapitaalmutatie/WACC, wachtwoord-hashing zwak, geen zichtbare waarderingsgeschiedenis in de
  UI, klassieke financiële ratio's ontbreken volledig, security headers ontbreken, CI draait de
  deal-kritieke tests niet automatisch), plus P3/P4-lijsten met kleinere verbeterpunten.

- **25 juli 2026 (zelfde dag, derde ronde — opdracht aangescherpt naar huidige, volledige versie)**
  — Marcel voegde Cloud & Deployment, Data & API-diepgang en Frontend/UX-toegankelijkheidsdetails
  toe en breidde de scoreset uit naar 15. Reden voor de uitbreiding: eerdere versie miste
  operationele/enterprise-aspecten (CI/CD-volwassenheid, monitoring/alerting/DR, WCAG/Core Web
  Vitals, API-idempotency/pagination/versiebeheer, datamigraties/referentiële integriteit) die voor
  professioneel gebruik door corporate-finance-partijen relevant zijn. Deelaudit specifiek op deze
  delta uitgevoerd (niet opnieuw wat al gedekt was in ronde 2). Drie nieuwe P1-bevindingen (naast de
  vier uit ronde 2, totaal 7), alle zelf geverifieerd:
  5. Signhost-webhook (`worker/20-signhost-vok.js:120-175`) accepteert elke afzender zonder
     signature/HMAC-verificatie — wie een trajectcode kent (niet geheim) kan een NDA/LoI/BEM laten
     overkomen als digitaal ondertekend zonder dat er ooit is getekend.
  6. Entiteit-verwijdering (`worker/07-mna-groepen.js:166-169`) laat wees-data achter in
     `mna_data`/`mna_documenten`/`mna_partners.entiteit_ids` — zelfde patroon als de al gefixte
     trajectniveau-bug, hier nog niet gefixt.
  7. Automatische back-up draait niet: `scripts/backup.sh` is correct, maar het launchd-job staat
     niet geladen (ontbrekende Volledige Schijftoegang) — recente back-ups zijn handmatig, niet
     dagelijks automatisch. **Dit is geen codefix — vereist dat Marcel zelf Volledige Schijftoegang
     verleent en het launchd-job herlaadt op zijn Mac.**

  Bijgewerkte scores (15, kwalitatief oordeel): Architectuur 70, Backendkwaliteit 64,
  Frontendkwaliteit 60, API & Integraties 48, Datakwaliteit 55, Codekwaliteit 66, Security 60,
  Testkwaliteit 52, Performance 64, Cloud-/Deploymentkwaliteit 46, M&A-functionaliteit 58,
  Financiële correctheid 54, Onderhoudbaarheid 64, Enterprise Readiness 48, **Totaal 58/100**.
  Volledig rapport (alle 3 rondes samengevoegd in één artifact met 8 domeinsecties) opgeleverd; zie
  sessie-geheugen `project_validatie_audit_25juli` voor de volledige bijgewerkte P1-P4-lijst.

  **Vervolgstap (lopend):** alle punten in prioriteitsvolgorde oppakken zonder tussentijds te
  vragen (P1 → P2 → P3 → P4), per werkregel #1 wel elke stap apart getest vóór de volgende. Dit
  logboek en de status hieronder wordt bijgewerkt zodra een punt is opgelost — check hier eerst
  vóór je opnieuw begint aan een van bovenstaande punten.

### Status P1-bevindingen (bijgewerkt zodra iets is opgelost)
1. Adviseur-login crasht (`verifyWW`) — **gefixt en live geverifieerd (25 juli 2026)**. Tijdens het
   fixen bleek de deploy-bron zelf ook stil te zijn achtergebleven: `~/Downloads` (de tot dan toe
   gedocumenteerde deploy-map) was verouderd t.o.v. de backend-git-repo. Marcel bevestigde: voortaan
   direct vanuit `~/Documents/GitHub/koersvoormorgen-backend/backend/` deployen — CLAUDE.md en
   geheugen bijgewerkt. Ook bleek de backend-repo al (ongecommit) call-site-wijzigingen naar
   `verifyWW` te bevatten op 5 plekken (met een `needsRehash`-uitbreidingspunt) — vermoedelijk een
   eerder gestaakte migratiepoging; nu afgerond en gecommit.
2. Hoofdwaardering vaste multiple i.p.v. sectorbewust — **gefixt en live geverifieerd (25 juli
   2026)**, visueel bevestigd in de echte UI (mkb-traject toont nu 2,5×/3,5×/4,5× i.p.v. de oude
   vaste 4,6×/5,05×/5,5×).
3. AI-modelversie niet vastgelegd bij waarderingen — **gefixt en live geverifieerd (25 juli
   2026)**.
4. EBITDA-marge kan verzonnen "0,0%" tonen — **gefixt en live geverifieerd (25 juli 2026)**, guard
   toegevoegd + getest op staging vóór productie-deploy.
5. Signhost-webhook zonder signature-verificatie — **grotendeels gefixt (25 juli 2026)**: webhook
   accepteert nu alleen transactionId's die we zelf hebben aangemaakt (getest op staging: vervalste
   ID genegeerd, echte ID verwerkt) — dit sluit de praktische aanval af. Checksum-verificatie is
   voorbereid maar staat uit tot Marcel actie onderneemt: **shared secret ophalen via
   portal.signhost.com/RegisteredPostbacks en instellen met
   `wrangler secret put SIGNHOST_WEBHOOK_SECRET` (prod + staging)**.
6. Entiteit-verwijdering laat wees-data achter — **gefixt en live geverifieerd (25 juli 2026)**,
   volledig scenario getest op staging (entiteit+data+document+partnerkoppeling).
7. Automatische back-up draait niet — **gefixt, geverifieerd operationeel (bevestigd 19 augustus
   2026 via launchd-status + geslaagde runs in het back-uplog van 16/17/18 augustus)**.
8. Cross-traject document-download (IDOR) — `worker/15-document-beheer.js`: verkoper/koper/
   tussenpersoon konden met een geldig eigen traject-code een documentId van een willekeurig
   ánder traject downloaden (geen check of het document bij het eigen traject hoort). **Gefixt en
   live geverifieerd (19 augustus 2026)** met een zelfopruimend testscript (twee losse
   trajecten): cross-traject-poging nu 403, eigen-traject-toegang blijft 200.
9. Waardering-configuratiewijziging niet atomair (`worker/21-waarderingsmodel.js:205-253`) — een
   mislukte tweede schrijfactie bij het goedkeuren van een basisconfig-wijziging wordt niet
   herkend; het voorstel wordt hoe dan ook op "goedgekeurd" gezet. **Gefixt (19 augustus 2026)**:
   UPDATE+INSERT nu in `env.DB.batch()`, JSON.parse in try/catch, voorstel blijft op "voorgesteld"
   bij een mislukte write. Positieve pad geverifieerd via volledige testsuite (geen regressie);
   het faal-pad zelf (D1-write die daadwerkelijk mislukt) is niet los reproduceerbaar getest —
   correctheid steunt op codereview + de D1 batch()-documentatie (atomair per definitie).

**Alle P2's uit de zesde heraudit (19 augustus 2026) gefixt, staging+productie getest:**
`--muted`-contrasttoken (WCAG AA, 481 toepassingen), hardcoded closing-checklist-kleur die in
donkere modus brak, inconsistente e-mail-escaping (nieuwe gedeelde `escHtml()`-helper, 6
bestanden), persistente logging (Cloudflare Workers Logs ingeschakeld), rate-limiting-gaten
(`/gebruikers/login` + AI-kosten-endpoints buiten `/ai`), geen centrale foutafhandeling in
`fetch()`, "Juridische documenten"-toggle niet toetsenbord-bedienbaar, geen focus-trap/-return op
de ~32 modals. Volledige testsuite (53 API + 9 UI + 7 consistentie) groen na alle wijzigingen. Eén
kanttekening: de nieuwe login-rate-limiter is logisch geverifieerd (losstaande unit-test, 11e
poging correct geblokkeerd) maar niet end-to-end tegen productie reproduceerbaar — bevestigt de
al bekende, gedocumenteerde beperking dat de in-memory rate limiter per-isolate werkt, niet
edge-breed gedeeld (zelfde beperking als de bestaande admin-limiter, zie P3 hieronder).

- **25 juli 2026 (zelfde dag, afwerkronde)** — op verzoek van Marcel ("alles moet afgewerkt
  worden, vraag niet of je door moet gaan") alle P1- en P2-bevindingen uit de drie audit-rondes
  opgepakt, plus een selectie van de belangrijkste/veiligste P3-bevindingen. Elke fix: eigen commit
  in de juiste repo, getest (staging waar mogelijk, anders directe SQL-validatie of node --check),
  daarna gedeployed naar staging + productie. Volledige lijst met wat gefixt is en waarom, zie de
  git-log van beide repo's (elke commit heeft een uitgebreide beschrijving) en
  sessie-geheugen `project_validatie_audit_25juli`.

  **Volledig afgerond (P1, 6 van 7 — #7 vereist Marcels eigen actie, zie hierboven):** 1, 2, 3
  (grotendeels — checksum-laag staat klaar, vereist Signhost-portal-actie), 4, 6. Punt 3
  (AI-modelversie) volledig.

  **Volledig afgerond (P2, 14 van 14):** AVG-verwijderrecht, DCF-werkkapitaalmutatie +
  WACC-transparantie, wachtwoord-hashing (PBKDF2), waarderingsgeschiedenis-API, security headers,
  CI-automatisering (vereist nog wel Marcels GitHub-secret, zie hieronder), audittrail bij
  admin-acties, rate-limiting-fix, deploy-worker.sh-reparatie, DB-statuscodes, Resend-silent-fail,
  sectorprofiel/benchmark-historie, kleurcontrast (gerichte fix), toegankelijkheid (chat-knop +
  Escape-op-modals).

  **Deels afgerond (P3):** D1-indexen (14 toegevoegd), sessietokens naar crypto.randomUUID(),
  idempotency-guard dossier-vrijgeven, adv.html-responsive-breakpoint, back-up-script gerepareerd
  (ontdekt tijdens het uitzoeken van P1 #7 — bevatte een tweede, ernstiger bug, zie backup.sh-
  commit), rollback/DR gedocumenteerd. **Bewust niet gedaan** (te grote refactor-omvang/regressie-
  risico om zonder uitgebreide visuele/functionele regressietest te rechtvaardigen binnen deze
  sessie): het samenvoegen van de 105 gedupliceerde response-envelope-regels tot een helper, de
  N+1-fix in groepsdetail, een cachinglaag voor sectorprofielen/benchmarks, machineleesbare
  foutcodes, timeouts op Anthropic-calls, en een gedeelde modal-helper (overlay+focus-trap) ter
  vervanging van de 15 losse modal-implementaties. Deze blijven in de P3-lijst hierboven staan voor
  een volgende ronde.

  **Twee acties die alleen Marcel zelf kan afronden:**
  - Back-up-automatisering (P1 #7): Volledige Schijftoegang verlenen + `launchctl load`, zie
    `scripts/README-backup.md`.
  - Signhost-checksum (P1 #3, tweede beveiligingslaag): shared secret ophalen via
    portal.signhost.com/RegisteredPostbacks, instellen met
    `wrangler secret put SIGNHOST_WEBHOOK_SECRET` (prod + staging).
  - CI-secret (P2 #10): `STAGING_ADMIN_KEY` toevoegen via GitHub repo Settings → Secrets and
    variables → Actions (de staging-sleutel, nooit de productie-sleutel).

  **Verificatie na afronding:** een volledige, visuele end-to-end-test uitgevoerd op staging via de
  echte mna.html-frontend (niet alleen API-calls): begeleider-login + VOK-acceptatie, verkoper-
  login, DD-data invullen en opslaan (bevestigd: "✓ Opgeslagen"), een echt testdocument geüpload
  (CSV-jaarrekening uit Marcels eigen testpakket op het bureaublad) — AI-extractie werkte correct
  én detecteerde zelf een bewust ingebouwde inconsistentie tussen de handmatig ingevulde cijfers en
  het document, gerapporteerd als `crosscheck_waarschuwingen` in plaats van stilzwijgend een van
  beide te negeren (bevestigt de gouden standaard werkt end-to-end). Het waarderingsscherm als
  begeleider bekeken: toont voor dit mkb-traject nu 2,5×/3,5×/4,5× — zichtbaar bewijs dat de
  sectorbewuste-multiple-fix (P1 #2) live werkt. Wijzigingenlog toonde correct "8 nieuw" na de
  testacties. Alle testdata (traject, document, R2-object) na afloop volledig opgeruimd.
  Document-upload via de browser-UI zelf kon niet worden getest (deze automatiseringstool kan geen
  bestandskiezers bedienen) — opgevangen door hetzelfde upload-endpoint direct te testen, wat de
  volledige backend-pipeline (opslag + AI-extractie) evengoed dekt.

  **Niet getest binnen deze sessie:** de volledige Signhost-ondertekenflow (vereist echte
  Signhost-sandboxtoegang), LoI/dealvoorstel-PDF-generatie end-to-end, en de adviseur-portaal-login
  (adv.html) met een echt e-mail+wachtwoord-account (vereist ADMIN_KEY om een adviseur aan te
  maken, niet beschikbaar in deze sessie) — de onderliggende code is wel apart getest (zie P1 #1).

- **25 juli 2026 (vierde ronde, na de 12-features-bouwdag)** — volledige onafhankelijke audit door
  vijf gespecialiseerde deelonderzoeken (security; architectuur/backend/API/data; frontend/UX;
  waarderingsmodellen; teststrategie/cloud/compliance), elk zelf de code lezend, niet vertrouwend op
  eerdere logboek-claims. Scores: Architectuur 68, Backendkwaliteit 60, Frontendkwaliteit 55,
  API & Integraties 46, Datakwaliteit 50, Codekwaliteit 62, Security 63, Testkwaliteit 42,
  Performance 64, Cloud-/Deploymentkwaliteit 44, M&A-functionaliteit 72, Financiële correctheid 46,
  Onderhoudbaarheid 60, Enterprise Readiness 44, **Totaal 56/100** (vrijwel vlak t.o.v. 58, andere
  samenstelling: minder "ontbrekend", meer "gebouwd maar onvoldoende geverifieerd"). Volledig
  rapport: zie artifact `audit-25juli-vierde-ronde.html` / sessie-geheugen
  `project_audit_vierde_ronde_25juli`.

  Zes P1-bevindingen:
  8. Sector-multiple wordt op de verkeerde grootheid toegepast bij zorg/SaaS (regex onderscheidt
     niet EBITDA/omzet/ARR-multiple) — tot >70% waarderingsafwijking, zonder waarschuwing.
     `mna/03-rekenkern-waardering.js:32-39,830-832`.
  9. Stored XSS via contactnaam in het chatvenster — cross-role. `mna/07-start-chat.js:151`.
  10. Back-up nog steeds niet actueel/werkend (launchd exit 126, dump 21 dagen oud) — bevestigt P1
      #7 hierboven — **opgelost 25 juli 2026, zelfde dag**: Marcel heeft Volledige Schijftoegang
      verleend; geverifieerd met een echte `launchctl kickstart` (het daadwerkelijke dagelijkse
      20:00-pad, niet alleen een handmatige terminal-run) — exit status 0, nieuwe dump
      (`kantoorinzicht_2026-07-25_1719.sql`, 42 tabellen) succesvol weggeschreven naar de
      iCloud-map.
  11. AVG-verwijderrecht blijkt bij herverificatie nog incompleet (`mna_partners`,
      `mna_koper_criteria`, `mna_audit` niet in de delete-cascade) — ondanks eerdere "14/14
      afgerond"-status bij P2.
  12. Goodwill/overwinstmethode is geen overwinstmethode — arbitrair omzetpercentage,
      misleidende functienaam/comment. `mna/03-rekenkern-waardering.js:252`.
  13. DCF combineert een na-rente kasstroom (FCFE) met WACC — dubbele verdiscontering van het
      financieringseffect, structureel te lage uitkomst bij schuldfinanciering.
      `mna/03-rekenkern-waardering.js:160,526,539`.

  Plus 10 P2-, 13 P3- en 3 P4-bevindingen — volledige lijst in het artifact/geheugen. Twee eerder
  als "volledig afgerond" gelogde punten (sectorbewuste multiple uit ronde 3, AVG-verwijderrecht uit
  P2) bleken bij deze onafhankelijke herverificatie nog gaten te hebben — reden om voortaan bij elke
  audit expliciet eerder-"afgeronde" punten opnieuw te verifiëren i.p.v. te vertrouwen op de
  logboekstatus.

  **Alle 6 P1's afgerond, zelfde dag (25 juli 2026):**
  1. Sector-multiple-type expliciet (multipleBasis/multipleLaag/multipleHoog per sectorprofiel,
     i.p.v. regex-parse) — hoofdwaarderingsscherm past nu correct EBITDA- of omzet-multiple toe.
     Scope bewust beperkt tot het hoofdscherm (Marcels keuze); Dealvoorstel-scherm blijft EBITDA-
     based met een waarschuwing bij omzet-basis-sectoren. Live geverifieerd op staging + productie.
  2. Stored XSS in chatvenster — naam wordt nu geëscaped net als het berichtveld.
  3. Back-up — Marcel heeft Volledige Schijftoegang verleend; geverifieerd met een echte
     `launchctl kickstart` (exit 0, nieuwe dump succesvol).
  4. AVG-verwijderrecht — mna_partners/mna_koper_criteria toegevoegd aan beide delete-routes,
     geverifieerd op staging via directe D1-rijen.
  5. Goodwill — Marcel koos de echte overwinstmethode i.p.v. alleen herbenoemen. Nieuwe formule
     (overwinst = nettowinst − normrendement×eigen vermogen; goodwill = overwinst/kapitalisatievoet),
     hergebruikt het al bestaande DD-veld "nettoresultaat", geen nieuwe velden nodig.
  6. DCF FCFE/WACC-methodefout — nieuwe gedeelde helper dvFcffRijen() levert een kasstroom vóór
     financieringseffecten; d≤g geeft nu consistent null i.p.v. een gefabriceerde 0.

  Bijvangst tijdens punt 1: het sync-script (`backend/scripts/sync-sectorprofielen.js`) bleek zelf
  ook een gat te hebben — het vergeleek alleen DD-velden, niet top-level sectorprofiel-velden, dus
  een `--apply` van een top-level wijziging sloeg zichzelf stilzwijgend over. Gefixt in dezelfde ronde.

  Alle zes P1-commits staan los in de git-historie van beide repo's (frontend + backend), elk met
  een eigen test (pure-functietests met Node, directe D1-verificatie op staging, of een echte
  `launchctl kickstart`) vóór de deploy naar productie.

  **P2, zelfde dag, 6 van 10 afgerond:**
  8. Net Debt/EBITDA gebruikte liquide middelen met een `||0`-fallback ook als dat veld niet was
     ingevuld — vereist nu expliciet dat het is ingevuld, anders null i.p.v. een gok.
  11. Toegangscodes (traject/koper/tussenpersoon) van Math.random() naar een CSPRNG-helper
     (`veiligeCode()`, Web Crypto API) — vier aanmaakpunten gefixt.
  13. adv.html-handleiding noemde de Q&A-uitbreiding (deadline/toewijzing/reactiedraad) niet —
     tekstfix; adv.html heeft zelf geen Q&A-UI (verloopt via mna.html), dus geen functionele
     duplicatie nodig.
  14. `#dv-preview` (Dealvoorstel) miste `overflow-x:auto` — nieuwe brede tabellen braken uit op
     mobiel.
  15. Hardcoded hex-kleuren in de Dealvoorstel-modal (veld()-helper) en synergie-/scenario-hint-
     boxen vervangen door CSS-variabelen; het losse print-document (`printDealvoorstel`, eigen
     window zonder toegang tot de app-CSS) kreeg een eigen `:root`-fallback met de lichte-thema-
     waarden zodat dezelfde HTML in beide contexten correct blijft.
  16. Signhost-checksum blijft **open** — vereist Marcels actie in het Signhost-portaal
     (`SIGNHOST_WEBHOOK_SECRET`).

  **P2: alle 10 afgerond** (#12 toegankelijkheid en #17 EBITDA-normalisatie-hint later dezelfde dag
  alsnog gebouwd, zie hieronder). Alleen #16 (Signhost-checksum) blijft open — vereist Marcels eigen
  actie in het Signhost-portaal, geen codepunt.

  **P3, 6 van 13 afgerond (zelfde dag, latere ronde):**
  - Toegankelijkheid nieuwe features (P2 #12, hierboven al als "open" genoemd — alsnog gedaan):
    `role="dialog"`/`aria-modal`/`aria-labelledby` op de Dealvoorstel-modal, label-for-koppeling op
    de 16 nieuwe velden, `role="img"`/`aria-label`/`<title>` op de twee SVG-grafieken.
  - EBITDA-normalisatie-hint (P2 #17, hierboven al als "open" genoemd — Marcels keuze: hint tonen,
    nooit automatisch overschrijven): niet-blokkerende waarschuwing als het ingevulde bedrag afwijkt
    van ebitda + normalisatie.
  - Route-prefix-overlap `/group/` vs. `/group/by-admin-code/` (worker/06-scantool.js) alsnog
    afgeschermd — zelfde patroon als de eerder gefixte qa-route-bug.
  - Wachtwoordvergelijking nu constant-time (eigen `constantTimeEqual()`, Web Crypto API heeft geen
    ingebouwde timingSafeEqual).
  - Volledige trajectverwijdering logt nu vooraf naar `mna_audit` (overleeft de cascade) — voorheen
    verdween het logboek zelf mee met de verwijdering.
  - `mna_doc_versies` nu ook in de centrale schema-lijst (was alleen lazy aangemaakt op 9 plekken).
  - DSCR expliciet gelabeld als vereenvoudiging (tooltip + CSV-kolomnaam).

  **P3, tweede ronde (zelfde dag) — nog 3 afgerond, waaronder een grotere, onderweg ontdekte
  vondst:**
  - `env.DB.batch()` voor beide delete-cascade-routes — atomair i.p.v. losse `.catch(()=>{})`-deletes.
    Eerste poging faalde op staging (mna_feedback bestond nergens) — zie hieronder.
  - **Nieuwe, bredere vondst tijdens het testen:** 11 van de 21 tabellen in de delete-cascades bleken
    alleen lazy aangemaakt te worden, nooit centraal in `initDB()` — werkte tot nu toe alleen omdat
    elke DELETE een eigen tolerante `.catch()` had. Alle 11 nu alsnog centraal toegevoegd (puur
    additief, `IF NOT EXISTS`), waarna de batch()-fix opnieuw en ditmaal succesvol is gedaan.
    Bijvangst: `mna_gesprek_concepten` en `mna_infoverzoek` bleken vestigiale tabelverwijzingen
    zonder ooit bestaan te hebben CREATE TABLE — bewust uit de delete-cascade gehaald i.p.v. een
    schema te verzinnen.
  - Atomiciteit expliciet bewezen op staging: een batch met een opzettelijk falende statement liet
    de daarvoor al uitgevoerde DELETE aantoonbaar niet doorgaan.

  **P3 nog open (4 van 13) — bewust niet gedaan, groter regressierisico of aparte ontwerpkeuze
  nodig, niet zonder gerichte review-tijd:**
  - 463× gedupliceerde response-envelope over de 20 workermodules.
  - Race condition op documentversienummer — een `CREATE UNIQUE INDEX` zou dit oplossen (SQLite
    ondersteunt dat zonder tabel-rebuild), maar vereist eerst controleren of er al bestaande
    duplicaten in productiedata zitten (anders faalt de index-creatie zelf) — niet gedaan zonder
    die data-veiligheidscheck vooraf.
  - Geen pagination op lijst-endpoints.
  - Geen foreign keys in het D1-schema.
  - Server-side validatie van de 12 nieuwe features ontbreekt (alleen client-side).
  - Synergie-NPV zonder fiscale correctie (VpB) — vereist een ontwerpkeuze zoals bij de eerdere
    P1/P2-punten, niet zonder Marcel te raadplegen.
  - Dealvoorstel-modal cognitief dicht bij overladen — UX-herontwerp, subjectief/groter.

  **P4, 1 van 3 afgerond:** HSTS + Referrer-Policy-headers toegevoegd aan `getCORS()`, live
  geverifieerd op staging en productie. Nog open: foutmeldingscasing, mna_audit-bewaarbeleid.

  **P3/P4, vijfde ronde (zelfde dag) — de resterende 5 punten afgerond:**
  - Documentversie race condition — alsnog gedaan (was in de vierde ronde nog aangehouden
    vanwege de data-veiligheidscheck): `metDocVersieRetry()`-helper (5 pogingen, hertelt bij
    conflict) + `CREATE UNIQUE INDEX idx_doc_versies_uniek ON mna_doc_versies(traject_id,
    doc_type, versie)`, op alle 9 plekken die voorheen los `COUNT()+INSERT` deden. Getest:
    UNIQUE-constraint bewezen op staging (dubbele insert faalt), retry-logica los gesimuleerd,
    index bevestigd aanwezig op staging én productie.
  - Server-side validatie op `/mna/save` (data_json/checklist_json): vorm moet een plain object
    zijn, elk veld.value moet een primitief zijn (geen geneste object/array), payload max 500KB.
    Bewust kleiner dan "volledige schema-validatie per sectorprofiel-veld" (dat vereist per-veld
    definities per sector, een groter project) — een generieke ondergrens tegen misbruik/corrupte
    data, niet per-veld business-rule-validatie. Getest: 13 isolatietests + 4 live staging-curls
    (3× correcte afwijzing, 1× geldige payload loopt door) + een volledige end-to-end save op
    een echt (aangemaakt+opgeruimd) testtraject.
  - Pagination op lijst-endpoints: `/mna/admin/lijst` (beide varianten) en `/gebruikers/lijst`
    kregen een `LIMIT 5000`-veiligheidsplafond. Bewust GEEN echte UI-paginering — marilyn.html
    berekent totalen/aggregaten client-side over de volledige lijst, dus paginering zou die
    som stilzwijgend fout maken zonder frontend-herontwerp (aparte ontwerpkeuze, niet blind
    gedaan). Huidige rijaantallen triviaal klein (1 traject, 1 gebruiker) — dit is
    toekomstbestendiging, geen actief probleem.
  - Foutmeldingscasing: 62 berichten die met een kleine letter begonnen ('unauthorized', 'code
    verplicht', ...) genormaliseerd naar hoofdletter-eerste-letter, in lijn met de meerderheid
    van de bestaande berichten. Bewust NIET aangeraakt: 'vergrendeld' en
    'voorwaarden_niet_geaccepteerd' — machine-leesbare error-codes die de frontend programmatisch
    vergelijkt (`d.error==='vergrendeld'`), geen weergavetekst. Frontend gecontroleerd op exacte
    string-vergelijkingen tegen de gewijzigde teksten — geen gevonden.
  - Dealvoorstel-modal cognitieve overload: 6 sectiekopjes toegevoegd boven de 16 altijd-
    zichtbare velden (EBITDA & belang / Multiples & earn-out / Escrow / Financiering / Fiscaal &
    operationeel / Kruiscontrole) — puur visueel, geen veld-ID of rekenlogica aangeraakt. De 6
    optionele secties hadden al hun eigen checkbox-kop. Visueel geverifieerd in licht én donker
    thema via een geïsoleerde HTML-reconstructie met de echte CSS-variabelen.
  - mna_audit-bewaarbeleid: bleek bij controle al de feitelijke praktijk (mna_audit staat in
    geen van beide delete-cascades) — Marcels eerdere keuze ("bewaren") vereiste geen
    codewijziging, alleen een expliciete comment op beide plekken zodat de weglating herkenbaar
    is als bewuste keuze.

  **P3: 13 van 13 afgerond. P4: 3 van 3 afgerond (Signhost-checksum uitgezonderd — vereist
  Marcels eigen actie in het Signhost-portaal, geen codepunt).**

  **Resterend, bewust niet aangepakt in deze fixronde (zie ook eerdere vermelding hierboven):**
  - 463× gedupliceerde response-envelope over de 20 workermodules — mechanische refactor,
    maar over zoveel plekken dat een regressie makkelijk onopgemerkt blijft zonder een gerichte
    ronde met extra testtijd.
  - Geen foreign keys in het D1-schema — vereist tabel-rebuild op levende productiedata in
    SQLite (kolomniveau-constraints kunnen niet worden toegevoegd aan bestaande tabellen zonder
    ze opnieuw aan te maken); een fout hierin is niet lokaal te herstellen zoals de meeste
    andere fixes vandaag. Niet blind gedaan.

  ---

  **Vijfde ronde — volledige heraudit, 25 juli 2026 (op Marcels verzoek: "welk cijfer geef je
  platform nu?" → "ja [draai de audit opnieuw] en maak daarna een back-up").** Vijf onafhankelijke
  deelaudits (Explore-agents, elk met eigen scope: architectuur/backend/data, security, frontend/
  UX/API, cloud/deployment/compliance, M&A-functionaliteit) plus een eigen, handmatige
  onafhankelijke herberekening van de volledige waarderingsrekenkern (Node-testscript,
  `mna/03-rekenkern-waardering.js` geladen in een vm-sandbox, 50 checks: EBITDA-multiple, DCF/
  Gordon-Growth-geldigheid, Goodwill-overwinstmethode, Liquidatiewaarde, Synergie-NPV-na-belasting,
  Vendor loan, prijsmechanisme, plus stress-tests 0/negatief/extreem en reproduceerbaarheid —
  49/50 groen, zie hieronder de ene bevinding).

  **Volledig rapport (15 scores + geprioriteerde bevindingenlijst) als artifact opgeleverd** — zie
  sessie-geheugen `project_validatie_audit_25juli` voor de link/inhoud. Score: **64/100**, op van
  58. Bewust géén hogere score ondanks dat alle P1-P4 van de vorige ronde zijn afgevinkt: deze
  heraudit ging dieper (5 gespecialiseerde deelaudits i.p.v. één brede pas) en vond daardoor
  ongeveer evenveel nieuwe, echte gaten als er zijn dichtgemaakt — met name idempotency op
  e-mail-endpoints (bijna nergens toegepast), rate limiting op admin-routes (vrijwel afwezig,
  ADMIN_KEY dus brute-forceable), en een juridische tekstinconsistentie tussen de getekende VOK
  en de Signhost-bevestigingsmail. Financiële correctheid steeg wél stevig (54→78) — de
  waarderingsrekenkern is nu onafhankelijk handmatig nagerekend en klopt aantoonbaar.

  **Drie regressies gevonden in het eigen werk van eerder vandaag, direct gefixt (niet blind
  toegevoegd aan de wachtlijst, want het waren gaten in dezelfde-dag-fixes):**
  1. `mna_wijzigingen` had alleen een index in `initDB()`, nooit de `CREATE TABLE` zelf (alleen
     lazy in `loglWijziging()`) — zou de eerder vandaag gebouwde atomaire batch()-delete-cascade
     hebben laten FALEN op een traject waar nog nooit een DD-veld is gewijzigd.
  2. `mna_vok` (naam+IP van wie de VOK accepteerde) stond in geen van beide delete-cascades — een
     AVG-verwijderverzoek liet deze persoonsgegevens dus altijd staan. Sleutelt op `tussen_code`,
     niet `traject_id`.
  3. Documenten in R2 werden bij géén van beide delete-cascades opgeruimd — voor
     `/admin/delete/mna/{id}` een opslagkosten-probleem, voor `/avg/verwijder` (het AVG-recht-op-
     vergetelheid-endpoint) een compliance-gat.

  Getest: de exacte 21-statement cascade rechtstreeks tegen D1 staging uitgevoerd (geen "no such
  table"-fouten, alle rijen bevestigd op 0 na afloop, incl. een los aangemaakt R2-testobject vóór
  de test). Staging- en productiedeploy, health-check groen. Commit `cc0e8be`.

  **~34 overige bevindingen (nieuw of nog openstaand), geprioriteerd P1-P4, staan in het
  artifact-rapport** — niet blind opgepakt in dezelfde sessie (zelfde discipline als eerdere
  rondes: audit eerst, Marcel prioriteert daarna wat wordt gefixt). Zwaarste nieuwe P1's:
  approval-workflow volledig omzeilbaar (geen server-side afdwinging), nieuw partnerregister niet
  gekoppeld aan consolidatie/waardering (twee niet-gesynchroniseerde databronnen), backend-CI mist
  de staging-override die de frontend-CI al kreeg (kan bij ingesteld secret tegen productie
  draaien), 47 backend-commits + 1 frontend-commit niet gepusht naar GitHub (ondermijnt zowel CI
  als de "repo is de back-up"-garantie).

  Na de audit: op Marcels verzoek een verse handmatige back-up gedraaid (`scripts/backup.sh`) —
  42 tabellen, 2.438 rijen, 536K, geverifieerd (structuur + integriteit gecontroleerd, bevat de
  schema-fixes van vandaag). Zie `project_backups`-geheugen.

  **Nieuw gevonden tijdens het fixen (niet in de oorspronkelijke bevindingenlijst), apart
  weggezet voor een volgende ronde:** de hardcoded-hex-kleurenkwestie (P2 #15) bleek bij nader
  onderzoek een veel breder, al langer bestaand patroon te zijn dan de 5 die-vandaag-toegevoegde
  plekken die de audit noemde — tientallen andere modals in `mna/04-begeleider-dashboard.js`
  (groepsstructuur/partners/koper-toegang/feedback e.d.) gebruiken dezelfde hardcoded kleuren,
  van vóór vandaag. Bewust niet meegenomen (te groot, te veel regressierisico om zonder gerichte
  ronde te doen) — zie sessie-geheugen.

  ---

  **Vervolgronde — resterende P1's/P2's/enkele P3-P4's opgepakt (25/26 juli 2026, na de
  score-vraag "welk cijfer geef je platform nu?").** Marcel: "ga door met de Ps, doe alleen de Ps
  die zonder mijn interventie door kunnen lopen; Ps waarbij ik handelingen moet verrichten zet je
  met prio in de backlog." Alle auto-doable P1's en P2's uit het vijfde-ronde-artifact zijn nu
  gefixt, getest (staging eerst) en live:

  **P1 (6 van 7 auto-doable, 1 vereist Marcels actie):**
  - Rate limiting op alle admin-routes (60/5min per IP) — voorheen alleen `/admin/scans`.
    Getest onder realistisch aanvalsvolume (700 requests, 20 gelijktijdig -> 258 kregen 429);
    een eerste, te trage sequentiële test gaf een vals-negatief resultaat door Cloudflare
    Workers-isolate-hergebruik, geen echt probleem.
  - Backend-CI-workflow kreeg de staging-override (WORKER_URL + STAGING_ADMIN_KEY-secret) die de
    frontend-CI al had — kon voorheen bij een ingesteld ADMIN_KEY-secret tegen productie draaien.
  - Approval workflow (interne goedkeuring) nu server-side afgedwongen op `/mna/loi/email` en
    `/mna/bieding/email`, ook bij de eigen-PDF-upload-route (was daar volledig omzeild).
  - VOK-bevestigingsmail-tekst (Signhost) letterlijk gelijkgetrokken met de getekende VOK (was 8
    artikelen/oude bewaartermijn/"Mei 2026", nu 11 artikelen/versie 1.3/juli 2026).
  - Idempotency op alle 6 document-verstuurendpoints (NDA/LoI/BEM/Excl/Dealvoorstel/Bieding) —
    nieuwe helper `isDubbeleVerzending()`, 15s-debounce-venster.
  - Partnerregister-afwijking zichtbaar gemaakt (niet-blokkerende waarschuwing in de
    Partners-modal) i.p.v. twee stil uiteenlopende databronnen.
  - **Nog open, vereist Marcel:** 47 backend- + 1 frontend-commit pushen naar GitHub.

  **P2 (6 van 6 auto-doable):**
  - Twee muur-lekken gedicht (`/mna/admin/documenten`, `/mna/admin/audit/{id}`) + een
    write-integriteitsgat (`/mna/admin/update/{id}` kon een extern traject overschrijven).
  - CORS-whitelist daadwerkelijk afgedwongen (viel voorheen terug op `*` voor elke origin).
  - `mna_qa.vraag_nr` had dezelfde race condition als documentversies eerder hadden — nieuwe
    generieke helper `metVolgnummerRetry()` + UNIQUE INDEX.
  - `checklist_json` kreeg dezelfde 500KB-groottelimiet als `data_json`.
  - Signhost-webhook-idempotency: een herhaalde delivery (webhook-providers zijn standaard
    "at-least-once") stuurde niet langer een dubbele "ondertekend"-e-mail/logregel.
  - Server-side sessie-invalidatie: nieuw endpoint `/gebruikers/logout`. **Bijvangst tijdens het
    bouwen:** het `sessie_token`-mechanisme blijkt in de huidige frontend nergens actief
    geconsumeerd te worden (adv.html authenticeert direct met e-mail+wachtwoord, marilyn.html's
    `gebruikerToken` wordt nooit op een echte waarde gezet, registreer.html slaat een token op in
    localStorage die niets ooit terugleest) — een kennelijk halfafgemaakte adviseur-login-flow,
    apart in de backlog gezet, niet zelfstandig doorontwikkeld.

  **Een paar snelle P3/P4-wins meegenomen:**
  - Negatieve-bewezen-EBITDA-edge-case in de schuldafbouw (gevonden tijdens de onafhankelijke
    stress-test) — nettoSchuld bij closing geclampt op 0.
  - Quick ratio kreeg een tooltip-label (bevat OHW, afwijkend van de klassieke definitie) net als
    DSCR al had.
  - Verouderd, ongebruikt `wrangler.toml` verwijderd uit de publieke frontend-repo.
  - `README-backup.md` verwees nog naar het verouderde `~/Downloads`-pad — gecorrigeerd.

  **Bewust nog niet opgepakt (groter scope, zie het artifact voor de volledige lijst):**
  response-envelope-duplicatie (580×), ontbrekende foreign keys, volledige
  modal-toegankelijkheids-/dark-mode-refactor, HTTP-statuscode-consistentie over 88 responses,
  gestructureerde omzetsplitsing in het accountancy-sectorprofiel, geautomatiseerde risicoscore,
  interactieve closing-checklist, route/business/data-scheiding. Elk hiervan is een eigen,
  grotere ronde waard — niet blind meegenomen in deze fixronde.

- **19 augustus 2026 — zesde volledige heraudit (op Marcels verzoek "cijfer platform?", nadat een
  live sessie diezelfde dag al drie functionele bugs blootlegde — zie hieronder).** Vijf
  onafhankelijke deelaudits (architectuur/backend/data/code/API/performance;
  security; frontend/UX; cloud/deployment/teststrategie/compliance; M&A-functionaliteit +
  onafhankelijke herberekening van de volledige waarderingsrekenkern, 105/105 checks groen).
  Volledig rapport (14 deelscores + geprioriteerde bevindingenlijst) als artifact opgeleverd —
  zie sessie-geheugen. **Score: 69/100, op van 64** (25 juli). Geen inflatie: Frontendkwaliteit
  daalde licht (60→58, dieper contrastonderzoek legde bloot dat het probleem in de
  `--muted`-kleurvariabele zelf zit — 481 toepassingen, niet louter hardcoded hex zoals eerder
  aangenomen); Financiële correctheid steeg het sterkst (78→84) door twee onafhankelijk
  bevestigde bugfixes.

  **Directe aanleiding van diezelfde sessie, vóór de audit zelf al gevonden en gefixt:**
  1. Gegenereerde NDA/LoI/BEM/Exclusiviteitsbrief werden nooit opgeslagen tenzij verstuurd/
     getekend — een puur gegenereerd document verdween spoorloos bij wegnavigeren. Nieuw endpoint
     `/mna/document/concept-opslaan`, meteen aangeroepen na generatie.
  2. Groepsniveau-bug (zelfde klasse als de 18 aug-fix): `/mna/waardering/genereer`,
     bankmutaties-red-flag-analyse en document-upload-AI-context lazen `mna_data` zonder filter
     op `entiteit_id` — konden bij een traject met entiteiten de cijfers van één werkmaatschappij
     pakken i.p.v. de groep. Alle drie plekken gefixt (`WHERE entiteit_id IS NULL`).

  **Eén nieuwe P1 gevonden tijdens de audit zelf, dezelfde dag gefixt en geverifieerd — zie
  Status P1-bevindingen hieronder (#8).**

  **Overige nieuwe bevindingen (niet blind opgepakt, Marcel prioriteert):** een niet-atomaire
  waardering-configuratiewijziging die zichzelf als "goedgekeurd" kan markeren ondanks een
  mislukte schrijfactie (P1, `worker/21-waarderingsmodel.js`); inconsistente HTML-escaping in
  uitgaande e-mails (P2); geen persistente/doorzoekbare logging buiten een actieve `wrangler
  tail`-sessie (P2); onzekerheid of CI/de wekelijkse taak zonder `STAGING_ADMIN_KEY`-secret wel
  de volle testsuite draait (P2); de nieuw gebouwde "Juridische documenten"-toggle niet
  toetsenbord-bedienbaar (P2); geen centrale foutafhandeling rond de dispatch-keten in `fetch()`
  (P2). Volledige lijst in het artifact.

  **Positief, expliciet (her)geverifieerd, niet aangenomen:** alle zes eerder gemelde P1/P2-fixes
  uit de 25/26 juli-ronde staan nog overeind; de trajectverwijder-cascade is geconsolideerd tot
  één gedeelde bron die aantoonbaar alle 25 `traject_id`-tabellen dekt; de dagelijkse back-up
  draait daadwerkelijk (launchd-log bevestigt geslaagde runs 16/17/18 augustus); geen
  SQL-injectie in 770 gecontroleerde queries; geen hardcoded secrets; AI schrijft nooit zelf een
  waarderingsuitkomst (server berekent deterministisch, AI-tekst wordt hard overschreven op de
  numerieke velden).
