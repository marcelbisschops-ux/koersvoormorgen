# KantoorInzicht — Technische Documentatie
*Gegenereerd: 20 mei 2026*

---

## Architectuur

| Component | Technologie | Details |
|-----------|-------------|---------|
| Frontend | HTML/CSS/JS (single file) | koersvoormorgen.nl (GitHub Pages) |
| Backend | Cloudflare Worker | kantoorinzicht.marcel-bisschops.workers.dev |
| Database | Cloudflare D1 | ID: 8565fdcb-b598-4739-9f7f-2c9b456300f1 |
| Opslag | Cloudflare R2 | kantoorinzicht-docs |
| AI | Anthropic Claude Sonnet 4.6 | Via worker /ai endpoint |
| E-mail | Resend API | marcel@bisschopsfinancing.nl |
| Admin | marilyn.html | koersvoormorgen.nl/marilyn.html |

---

## Deployment

### Frontend (index.html)
```
GitHub Desktop → push naar marcelbisschops-ux/koersvoormorgen (branch: main)
GitHub Pages serveert automatisch
```

### Worker (cloudflare-worker.js)
```bash
cd ~/Downloads && npx wrangler deploy
```

### Wrangler configuratie (wrangler.toml)
```toml
name = "kantoorinzicht"
main = "cloudflare-worker.js"
compatibility_date = "2024-09-02"
cron = "0 2 * * *"  # Dagelijkse AVG cleanup om 02:00 UTC
```

---

## Environment Variables (Cloudflare Worker)

| Variabele | Gebruik |
|-----------|---------|
| `ANTHROPIC_API_KEY` | Claude AI API sleutel |
| `RESEND_API_KEY` | E-mail versturen |
| `ADMIN_KEY` | Toegang admin endpoints |

**Belangrijk:** Zonder `ADMIN_KEY` in Cloudflare env vars geven alle admin-endpoints 401. Geen fallback.

---

## Database Tabellen (D1)

| Tabel | Inhoud | Bewaartermijn |
|-------|--------|---------------|
| `scans` | Groepsscans (scores, profiel) | 12 maanden |
| `scan_rapporten` | Individuele rapporten + AI-tekst | 12 maanden |
| `rapport_usage` | E-mail/IP tracking voor limiet | 12 maanden |
| `callbacks` | Terugbelverzoeken en feedback | 6 maanden |
| `groups` | Groepen (naam, admin, code) | Permanent |
| `mna_trajecten` | M&A trajecten | Permanent |
| `mna_data` | Due diligence data per fase | Permanent |
| `mna_documenten` | Geüploade documenten metadata | Permanent |
| `mna_groepen` | M&A groepen | Permanent |
| `mna_groep_trajecten` | Koppelingen groep-traject | Permanent |

**AVG cleanup:** Draait automatisch dagelijks om 02:00 UTC via Cloudflare Cron.

---

## Worker Endpoints

### Publiek (geen auth)
| Endpoint | Methode | Gebruik |
|----------|---------|---------|
| `/ai` | POST | AI rapport genereren (max 12.000 tekens prompt) |
| `/group/create` | POST | Groep aanmaken |
| `/group/join` | POST | Scan opslaan in groep |
| `/group/find-by-email` | POST | Groep ophalen op e-mail |
| `/group/data` | GET | Groepsdashboard data |
| `/rapport/save` | POST | Rapport opslaan |
| `/rapport/:id` | GET | Rapport ophalen op code |
| `/rapport/check` | GET | Limiet check (5x per e-mail) |
| `/rapport/track` | POST | Gebruik registreren |
| `/callback` | POST | Terugbelverzoek / feedback |
| `/mna/traject/:code` | GET | M&A traject ophalen |
| `/mna/save` | POST | M&A data opslaan |
| `/mna/document/upload` | POST | Document uploaden + analyseren |
| `/avg/inzage` | GET | AVG inzageverzoek |
| `/avg/verwijder` | POST | AVG verwijderverzoek (vereist admin token) |

### Admin (vereist `x-admin-key` header of `?key=`)
| Endpoint | Gebruik |
|----------|---------|
| `/admin/scans` | Alle scans |
| `/admin/callbacks` | Alle callbacks/feedback |
| `/admin/rapporten` | Alle rapporten |
| `/admin/rapport-usage` | Gebruik per e-mail |
| `/mna/admin/lijst` | Alle M&A trajecten |
| `/mna/admin/detail/:code` | Traject detail |
| `/mna/admin/status/:code` | Status wijzigen |
| `/mna/admin/vergrendel/:code` | Traject vergrendelen |
| `/mna/admin/vrijgeven/:code` | Koper vrijgeven |
| `/mna/groep/*` | M&A groepsbeheer |
| `/avg/cleanup` | Handmatige AVG cleanup |

---

## Frontend Architectuur (index.html)

### State object (ST)
```javascript
ST = {
  screen: 'intro',        // intro | intake | questions | results | rapport | dashboard
  section: 0,             // huidige vraag-sectie (0-10)
  answers: {},            // vraagantwoorden {s1:3, o1:2, ...}
  scores: null,           // berekende dimensiescores
  scenarios: null,        // gerangschikte scenario's
  aiText: null,           // gegenereerde rapport-tekst
  aiLoading: false,       // rapport wordt geladen
  _smvKlaar: false,       // samenvatting-box al gevuld
  groupId: null,          // actieve groepscode
  savedScanId: null,      // rapportcode (na opslaan)
  profile: { ... },       // kantoorprofiel
  groupData: null,        // groepsdashboard data
}
```

### Kritieke functies
| Functie | Doel |
|---------|------|
| `callAI(prompt, maxTokens)` | Centrale AI-transport naar worker |
| `generateAI()` | Rapport genereren (autostart na scan) |
| `renderSummary()` | Managementsamenvatting (data-gebaseerd) |
| `updateAI(final)` | ai-out en summary-box verversen |
| `renderAIText(text)` | Markdown → HTML converter |
| `rankScenarios(scores)` | Scenario-ranking berekening |
| `saveScanToGroup()` | Scan opslaan in groep |
| `genereerGroepsAI()` | Groepsanalyse genereren |
| `genereerKantoorAI(o, el)` | Kantoor-AI in dashboard |

### 11 Dimensies (SECTIONS)
1. Strategische positie (s)
2. Opvolgingsrisico (o)
3. Winstkwaliteit (w)
4. Schaalbaarheid (schaal)
5. Automatiseringsgraad (a)
6. Partnerafhankelijkheid (partner)
7. Klantconcentratie (klant)
8. Fusiegereedheid (fusie)
9. AI-risico & weerbaarheid (ai_dim)
10. Personeelsdruk & talent (personeel)
11. Commerciële kracht (commercieel)

---

## Rapport Limieten

- **5 rapporten per e-mailadres**
- **10 rapporten per IP** (voor anonieme gebruikers)
- **Whitelist:** marcel@bisschopsfinancing.nl, info@kdobox.nl, marcel.bisschops@gmail.com

---

## Rapportcode Systeem

1. Scan afronden → `saveScanToGroup()` → `scan_id` opgeslagen in ST
2. Rapport genereren → `/rapport/save` → `id` (rapportcode) teruggegeven
3. `scan_id` wordt als koppeling opgeslagen in `scan_rapporten`
4. Ophalen: `/rapport/:code` zoekt op `id` eerst, dan `scan_id` als fallback

---

## AI Prompts

### Individueel rapport (generateAI)
- Model: claude-sonnet-4-6
- Max tokens: 4000 (rapport), 500 (samenvatting was twee-calls, nu één)
- Bevat: kantoorprofiel, 22 vraagantwoorden, benchmarks, software-analyse, waardering, alarmsignalen
- Verboden: eerste persoon, markdown-tabellen, titelpagina
- Structuur: 6 vaste ## koppen

### Groepsanalyse (genereerGroepsAI)
- 800-1000 woorden
- Per kantoor: naam + 2-3 specifieke observaties
- Zelfde verboden als individueel rapport

### Kantoor-AI dashboard (genereerKantoorAI)
- 400-500 woorden
- Alleen voor beheerderdashboard

---

## Security

| Maatregel | Status |
|-----------|--------|
| CORS beperkt tot koersvoormorgen.nl | ✅ |
| Admin key via env var (geen hardcoded fallback) | ✅ |
| AI input max 12.000 tekens | ✅ |
| Rate limiting (5x email, 10x IP) | ✅ |
| Database indexen op scan_id, email | ✅ |
| AVG endpoints (inzage, verwijder, cleanup) | ✅ |
| Automatische cleanup via cron | ✅ |

---

## Bekende Beperkingen

1. `back-intro` reset de state niet volledig (alleen scherm-navigatie)
2. Rapport ophalen toont scores maar niet de originele antwoorden
3. M&A documenten: Word-bestanden worden beperkt geanalyseerd (PDF aanbevolen)
4. Groepsanalyse prompt heeft geen toegang tot individuele vraagantwoorden

---

## Open Punten (volgende sessie)

- [ ] AVG privacyverklaring inhoudelijk reviewen
- [ ] Scenario-ranking edge cases testen
- [ ] Foutmelding bij netwerkproblemen verbeteren
- [ ] Rapport ouder dan X dagen: wat toont de gebruiker?
- [ ] `back-intro` volledige state reset overwegen

