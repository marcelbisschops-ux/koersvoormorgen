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
7. Automatische back-up draait niet — **open, vereist actie van Marcel zelf (Mac-permissie)**

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

  **P2 nog open (2 van 10) + P3/P4 (13+3, ongewijzigd):**
  12. Toegankelijkheid nieuwe features (aria-modal, SVG title/desc, label-for-koppeling) — nog niet
     opgepakt, vereist zorgvuldiger werk per modal dan in deze sessie nog paste.
  17. EBITDA-normalisatie niet automatisch herberekend — bewust niet blind gefixt: `ebitdaNorm` is
     expliciet gelabeld "(gevalideerd)", een auto-overschrijving zou net zo goed een bewust
     gevalideerd cijfer kunnen overschrijven. Vereist een ontwerpkeuze (hint tonen vs. blijven
     negeren), niet gedaan zonder Marcel te raadplegen.

  **Nieuw gevonden tijdens het fixen (niet in de oorspronkelijke bevindingenlijst), apart
  weggezet voor een volgende ronde:** de hardcoded-hex-kleurenkwestie (P2 #15) bleek bij nader
  onderzoek een veel breder, al langer bestaand patroon te zijn dan de 5 die-vandaag-toegevoegde
  plekken die de audit noemde — tientallen andere modals in `mna/04-begeleider-dashboard.js`
  (groepsstructuur/partners/koper-toegang/feedback e.d.) gebruiken dezelfde hardcoded kleuren,
  van vóór vandaag. Bewust niet meegenomen (te groot, te veel regressierisico om zonder gerichte
  ronde te doen) — zie sessie-geheugen.
