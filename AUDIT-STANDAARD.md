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

Elk kwartaal, aansluitend op de bestaande kwartaalcheck voor sjablonen/benchmarks (zie CLAUDE.md
"Openstaande punten"). Ook uit te voeren vóór een grote release of wanneer Marcel erom vraagt.
Bevindingen die na een audit zijn opgelost, hoeven bij de volgende audit niet opnieuw als
aanbeveling te verschijnen — wel kort als "OK/aantoonbaar aanwezig", zodat regressie zichtbaar
wordt als dat verandert. Elke audit dekt zowel de frontend- als de backend-repo; een audit die
alleen één van beide behandelt telt niet als volledig.

## Logboek van uitgevoerde audits

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
2. Hoofdwaardering vaste multiple i.p.v. sectorbewust — **open**
3. AI-modelversie niet vastgelegd bij waarderingen — **open**
4. EBITDA-marge kan verzonnen "0,0%" tonen — **gefixt en live geverifieerd (25 juli 2026)**, guard
   toegevoegd + getest op staging vóór productie-deploy.
5. Signhost-webhook zonder signature-verificatie — **open**
6. Entiteit-verwijdering laat wees-data achter — **open**
7. Automatische back-up draait niet — **open, vereist actie van Marcel zelf (Mac-permissie)**
