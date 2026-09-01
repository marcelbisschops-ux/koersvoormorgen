# Herontwerp Koers voor Morgen — FASE 1: strategische analyse

Opgesteld 1 september 2026. Bronnen: de daadwerkelijke huidige website + codebase, Marcels
positioneringsbesluit van 1 sep, en `Marcel Bisschops CV July 26 Deze gebruiken.docx`.
Conform de opdracht: geen verzonnen klanten, cijfers, cases of resultaten. Ontbrekende
informatie = **[NOG INVULLEN]**.

---

## 0. Merkarchitectuur — BESLIST (Marcel, 1 sep 2026)

> **Bijgesteld in de correctieronde van 1 sep — zie `HERONTWERP-FASE3.md` §0, dat is leidend
> waar het afwijkt.** Belangrijkste wijziging: spoor 2 heet voortaan **"M&A Expertise"** (niet
> "Senior M&A"); URL-root **`/m-en-a-expertise/`**. De rest van deze §0 blijft geldig.

**Eén merk, twee commercieel onafhankelijke proposities. Geen "Marcel + een tool".**

```
KOERS VOOR MORGEN   (merk + gedachtegoed: van complexiteit naar koers, van besluit naar beweging)
│
├── 1. HET PLATFORM            — zelfstandig commercieel M&A-product
│                                (moet 100% werken en geloofwaardig zijn ZONDER Marcel)
│
└── 2. MARCEL — SENIOR M&A     — Marcel persoonlijk voor complexe transacties/vraagstukken
                                 (moet geloofwaardig zijn ZONDER het platform)
```

De twee versterken elkaar en verwijzen naar elkaar, maar **geen van beide is afhankelijk van de
ander**. De homepage biedt vanaf de eerste schermvulling twee duidelijke routes.

### Propositie 1 — Koers voor Morgen Platform
- **Wat:** M&A-intelligence — assessments, analyses, workflows, dossiervorming, rapportages voor
  het hele overnametraject (voorbereiding → due diligence → vragen → onderhandeling → closing).
- **Doelgroep:** M&A-adviseurs · corporate finance · PE / investment professionals · dealteams ·
  eventueel ondernemers/directies.
- **Belofte:** professionals nemen zelfstandig betere M&A-beslissingen — sneller, gestructureerd,
  met elke waarde herleidbaar naar het brondocument.
- **Model:** een andere adviseur koopt/gebruikt het platform bij zijn eigen klanten, zonder dat
  Marcel erbij nodig is (betaald adviseursmodel: trajectlimiet + modules).

### Propositie 2 — Marcel, senior M&A-professional
- **Wat:** senior ervaring, oordeel en regie bij complexe transacties, strategische vraagstukken,
  due diligence, integratie, transformatie en waardecreatie.
- **Doelgroep:** directie / DGA / aandeelhouder / PE bij transacties waar de complexiteit,
  belangen of stakes hoog zijn.
- **Belofte:** wanneer de complexiteit of het belang toeneemt, voeg je senior ervaring en oordeel
  toe — iemand die het vraagstuk terugbrengt tot de essentie, keuzes scherp maakt en de regie
  pakt tot de koers werkt.

### Wat dit betekent voor de IA
- De homepage is een **splitsing**, geen trechter: "Voor M&A-adviseurs & dealteams → Platform"
  naast "Voor complexe transacties → Marcel". Daarboven één merkverhaal.
- Twee onafhankelijke content-sporen, elk met eigen landingspagina's, eigen CTA-taal, eigen
  bewijs, eigen SEO-intentie.
- Verbindende laag: het gedachtegoed ("koers → beweging → resultaat"), de visuele identiteit, en
  het "de lijn van koers"-motief.
- Gedeeld maar bij het platform-spoor: de **bedrijfsscan** (kan als losse commerciële
  landingspagina onder het platform-spoor of als eigen ingang — zie §3).

---

## 1. Analyse van de huidige website

### 1.1 Huidige positionering
"Digitale procesomgeving voor overnametrajecten." De site draait **volledig om het platform** —
dataroom per DD-categorie, vragen/acties, gekoppelde overleggen, documentdekking per fase,
AI-signalen (ontbrekende docs, cijferafwijking, openstaande vraag), "elke waarde herleidbaar naar
het brondocument", "AI helpt, u beslist". Afgezet tegen "een dataroom voor één fase".
→ Dit is nu al feitelijk propositie 1. **Propositie 2 (Marcel) komt op de huidige site niet voor.**

### 1.2 Huidige doelgroep
Adviseurs/accountants die transacties begeleiden binnen MKB, Accountancy, Zorg, IT — plus de
koper/verkoper die zij uitnodigen. De directie/DGA-doelgroep van propositie 2 ontbreekt.

### 1.3 Huidige diensten / proposities op de site
1. Het M&A-platform (`mna.html`) — kern.
2. Betaald adviseursmodel (`adv.html`): trajectlimiet + modules (contracten, AI-analyse, Q&A,
   export, meekijkers, marketing/matching).
3. Gratis **bedrijfsscan** (`bedrijfsscan.html`): strategische zelfanalyse, multi-sector
   (accountancy/mkb/zorg/IT), 11 dimensies, scenario's, AI-adviesrapport. Waardering alleen voor
   accountancy.
4. Matching-platform (`matching-platform.html`) — anonieme sector/regio-matching koper↔traject.
5. VerhuisScan (`hugo.html`/`verhuis.html`) — losstaand, andere sector.

### 1.4 Huidige tone of voice
Zakelijk, nuchter, feitelijk, **defensief-zorgvuldig** ("geen los verkooppraatje", "AI doet bij
twijfel geen aanname, maar meldt het"). Weinig spanning/beweging. Bijna geen "ik"/Marcel — het is
productcopy. Werkt redelijk voor propositie 1, is **volledig afwezig** voor propositie 2 (die
"ik pak de regie", scherp, persoonlijk vraagt).

### 1.5 Huidige visuele identiteit
Tot 1 sep: warm off-white + accountancy-groen + spaarzaam goud. Statisch, "brochure". De hex-swap
naar nachtblauw/petrol van 1 sep is door Marcel afgekeurd ("lelijk en slecht"); bevestigt dat een
kleurvervanging geen herontwerp is. Wordt door dit traject volledig vervangen.

### 1.6 Bestaande cases
**Geen individuele cases** op de site of in de codebase (werkregel 14 verbiedt echte cliëntnamen
in de repo). Wél generiek bewijs uit de CV (zie §4). → Individuele case-verhalen: **[NOG INVULLEN]**.

### 1.7 Bewijsvoering die er nu wél is (site)
- Concrete productdemonstratie: 3 échte AI-signalen die het platform geeft.
- Data/compliance: EU-opslag (Cloudflare Frankfurt, ISO 27001 / SOC 2), TLS, rol/fase-toegang,
  meekijker read-only + intrekbaar, AI via SCC's, 14-dagen-verwijdering, technisch afgedwongen
  muur tegen inzage in andermans trajecten, sub-verwerkerslijst.
→ Sterk voor propositie 1. Zegt niets over Marcel.

### 1.8 Bestaande teksten die behouden kunnen blijven
- De data/compliance-paragraaf (6 blokken) — sterk, concreet. Naar een pagina "Beveiliging &
  gegevens" of de platform-DD-pagina.
- De 3 AI-signaal-voorbeelden — bewijsblok op de platform-pagina.
- "AI helpt, u beslist" + "elke waarde herleidbaar naar het brondocument" — kernclaims, houden.
- Het onderscheid "dataroom = één fase / KvM = heel traject" — houden, scherper.
- De 5-staps-procesuitleg (Start → Dataroom → Vragen & acties → Voortgang → Closing) — als
  procesvisualisatie op de platform-pagina.
- Juridische pagina's — inhoud houden, opnieuw vormgeven.

### 1.9 Inhoud die ontbreekt
- **Het hele Marcel-spoor** (propositie 2): homepage-route, "Over Marcel", en de
  senior-M&A-dienstpagina's (complexe transacties, DD-begeleiding, integratie/PMI, value creation,
  strategische vraagstukken, regie).
- **Regie** als expliciete propositie — de CV noemt "regie" herhaaldelijk als kernwoord, de site
  gebruikt het niet.
- **Cases** (structuur + inhoud). **[NOG INVULLEN]**
- **Inzichten** / contentomgeving — bestaat niet.
- Contextuele CTA's — nu overal "Plan een kennismaking".
- Volledige SEO-structuur per pagina + redirects.
- Beeld/fotografie — nu alleen productscreenshots (`product-dashboard.png` is bovendien kapot).

### 1.10 Pagina's: schrappen / samenvoegen / verdiepen
| Pagina | Advies |
|---|---|
| `index.html` | Volledig herschrijven als merk-homepage met twee routes. |
| `bedrijfsscan.html` | **Verdiepen** tot een echte commerciële landingspagina. Het instrument blijft; de landing eromheen wordt nieuw. Hoort bij het platform-spoor. |
| `adv.html` (login) | Blijft functioneel, wordt geen marketingpagina. "Word adviseur op het platform" = aparte pagina in het platform-spoor. |
| `matching-platform.html` | Onderdeel van het platform-spoor (aparte pagina), niet in de hoofd-nav. |
| `hugo.html` / `verhuis.html` (VerhuisScan) | Andere sector, losstaand. **Buiten scope** — apart houden / eigen domein. |
| `handleiding.html` | Achter login; niet in de publieke IA. |
| `kantoorscan.html` | Redirect-stub → laten. |
| `lead-aandragen.html` | Kleine functionele pagina; visueel meenemen. |
| `testvoorwaarden.html` / `voorwaarden.html` / `platformvoorwaarden.html` | Consolideren — **[NOG INVULLEN: welke versie is juridisch leidend?]** |

### 1.11 Houden / verbeteren / schrappen / toevoegen
- **Houden:** platform-kern, bedrijfsscan-instrument, data/compliance-verhaal, "AI helpt, u
  beslist", traject-vs-dataroom-onderscheid, juridische basis.
- **Verbeteren:** merk-homepage (twee routes), tone (scherper/persoonlijker, meer beweging),
  visuele identiteit (echt systeem), bedrijfsscan-landing, IA, CTA-differentiatie, SEO.
- **Schrappen uit de hoofd-nav:** VerhuisScan, losse voorwaarden-varianten. Matching → onder
  platform-spoor.
- **Toevoegen:** het complete **Marcel-spoor** (homepage-route, Over Marcel, senior-M&A-diensten,
  Regie), Cases-structuur, Inzichten, contextuele CTA's, fotografieconcept, "de lijn van
  koers"-motief, volledig SEO- en interne-linkplan.

---

## 2. Positionering, onderscheid, merkbelofte, tone

### 2.1 Merkbelofte (verbindend, beide sporen)
"Van complexiteit naar duidelijke koers. Van besluit naar beweging." — gedachtegoed, niet per se
vaste slogan.

### 2.2 Onderscheid per spoor
- **Platform:** geen losse tool per fase, geen los "FDD-trucje" — één doorlopend dossier, elke
  waarde herleidbaar, AI die signaleert maar niet beslist. Zelfstandig bruikbaar door elke
  adviseur.
- **Marcel:** senior, onafhankelijk oordeel + daadwerkelijke regie en realisatie. Niet "advies en
  weg", wel betrokken tot de gekozen koers werkt. ~30 jaar, bestuurskamer- én
  transactie-ervaring, Big-4-origine, diepe accountancy-sectorkennis.

### 2.3 Tone of voice
Nederlands, zakelijk, scherp, rustig, persoonlijk. Geen buzzwords (synergie, ontzorgen,
holistisch, trusted advisor, next level). Platform-spoor: aanscherpen van de bestaande
productcopy. Marcel-spoor: nieuw schrijven — "Ik breng het terug tot de essentie", niet "wij
streven ernaar". Alsof Marcel tegenover een DGA/PE-partner zit.

---

## 3. Voorgestelde sitemap

```
/
├── platform/                         [SPOOR 1]
│   ├── overzicht  (wat het is, voor wie, hoe het werkt — huidige index-inhoud, scherper)
│   ├── dataroom-en-fases
│   ├── ai-signalen
│   ├── beveiliging-en-gegevens       (huidige data-paragraaf, uitgebouwd)
│   ├── voor-adviseurs                (het betaalde model: modules, limieten)
│   └── matching                      (het losse matching-platform, uitgelegd)
│
├── bedrijfsscan                      (commerciële landing; instrument erachter; hoort bij spoor 1)
│
├── senior-ma/                        [SPOOR 2 — Marcel]
│   ├── complexe-transacties
│   ├── due-diligence-begeleiding
│   ├── integratie-en-pmi
│   ├── value-creation
│   ├── strategische-vraagstukken
│   └── regie                          (het onderscheidende element uit de CV)
│
├── over-marcel                        (feitenbasis grotendeels uit de CV — zie §4)
├── cases
│   └── [CASE NOG INVULLEN] × 3
├── inzichten
│   └── m-en-a | due-diligence | integratie | strategie | ai-in-m-en-a
├── contact
└── inloggen                           → app (mna.html / adv.html / marilyn.html)
```

Homepage-navigatie (max 6): **Platform · Senior M&A · Bedrijfsscan · Cases · Inzichten · Contact**
+ opvallende CTA rechts. (Of "Aanpak" vervangen door de twee spoor-ingangen prominenter in de hero.)

**Redirects (FASE 5):** `/mna.html`, `/adv.html`, `/bedrijfsscan.html`, `/kantoorscan.html`,
`/matching-platform.html`, de juridische pagina's → nieuwe plek, 1-op-1.

---

## 4. Feitenbasis Marcel (uit de CV — bruikbaar, niet verzonnen)

- **Naam / titel:** Marcel Bisschops, Drs. Bestuurskunde (Rijksuniversiteit Leiden).
  Talen: Nederlands, Engels, Duits. Werkgebied: heel Nederland (Oploo, Land van Cuijk).
- **Contact (publiek volgens CV):** 06 38 68 98 88 · marcel.bisschops@gmail.com ·
  linkedin.com/in/marcelbisschops. → **[BEVESTIGEN: mag het privé-gmail publiek op de site, of
  komt er een @bisschopsfinancing-adres? Zie het privé-gmail-geheugen.]**
- **Positioneringszin CV:** "Bestuurder die organisaties onder druk terugbrengt naar rust, regie
  en resultaat."
- **Loopbaan (M&A-/bestuur-relevant):**
  - Zelfstandig interim bestuurder — Bisschops Interim Management, okt 2025–heden. Begeleidt als
    M&A-adviseur accountants-/administratiekantoren bij verkoop, fusie, opvolging, positionering
    (koersvoormorgen.nl). Ontwikkelde het AI-M&A-platform.
  - Voorzitter RvB / Statutair Bestuurder — Netsam Participaties (ventureholding tech + financiële
    dienstverlening; €40 mln beheerd kapitaal, ~175 FTE), 2019–2025.
  - Bestuurslid/Toezichthouder + Lid RvA — Finturi (fintech onder AFM-toezicht), 2018/2019–2023.
  - Bestuurder a.i. — Ledger Leopard (blockchain), 2019.
  - Statutair Bestuurder — 216 Accountants (~100 FTE), 2016–2018.
  - Corporate Finance Adviseur — Fidelis Bedrijfsadvies (M&A-adviespraktijk), 2013–2015.
  - COO — Accon AVM (Flynth) (~1.000 FTE, €100 mln omzet), 2009–2013 — regie op de volledige
    M&A-cyclus, van strategie tot integratie en synergie.
  - Senior Manager — KPMG Advisory (risk & control), 2003–2009 — toegelaten tot het partnertraject,
    genomineerd als beste adviseur KPMG Nederland.
  - Eerder: Philip Morris (Internal Audit a.i.), Liberty Global (Shared Services), CTG (Business
    Consultant, ITIL-gecertificeerd).
- **Hoogtepunten (bewijs, letterlijk uit de CV — bruikbaar als claim):**
  - "Meer dan 20 succesvolle en gecompliceerde fusies en overnames aan koop- en verkoopzijde, met
    een gezamenlijke transactiewaarde van €60 mln, van strategie en onderhandeling tot integratie."
  - Bestuurlijke continuïteit geborgd na meerdere ingrijpende overnames/herstructureringen;
    organisaties bleven stabiel presteren ondanks substantiële FTE-reducties.
  - M&A-trajecten versneld met het zelf-ontwikkelde AI-platform.
  - KPMG: partnertraject + nominatie beste adviseur.
  - Referenties op aanvraag.
- **Kerncompetenties (CV):** strategievorming & portfoliosturing · bestuurlijke aansturing ·
  transformatie & herstructurering · proces- & systeemverbetering · bedrijfsvoering,
  executiekracht & resultaatsturing · governance & risicobeheersing · M&A, integratie &
  waardecreatie · AI-gedreven proces- & besluitvorming · crisis- & herstelmanagement.
- **Sectoren (CV):** accountancy & advies · fintech (AFM) · technologie & blockchain · IT &
  consultancy · investeringen & participaties.

### Nog nodig van Marcel voor het Marcel-spoor
1. **Contact-e-mail** die publiek mag (privé-gmail of zakelijk adres).
2. **1–3 case-verhalen** (geanonimiseerd mag): situatie / vraagstuk / aanpak / complexiteit /
   resultaat / rol. De "20+ deals / €60 mln" is aggregaat-bewijs, geen verhaal.
3. **Werkwijze in eigen woorden** (2–4 zinnen) — hoe pakt hij een complexe transactie aan.
4. **Eigen foto** in een echte werkomgeving (geen LinkedIn-portret), of stock-alternatief.

### Nog nodig voor het platform-spoor
5. Wordt de **bedrijfsscan** commercieel aangeboden (varianten? betaald? doelgroep exact)?
6. Domein/tech: het platform (`mna.html`/`adv.html`/`marilyn.html`) naar `app.koersvoormorgen.nl`
   of blijft alles op één domein onder `/`?
7. Welke **voorwaardenversie** is leidend; mag `testvoorwaarden.html` weg.

---

## 5. Volgorde vanaf hier

- **FASE 2 (copy)** kan starten voor het **platform-spoor** zodra §4 punt 5–7 beantwoord zijn —
  de feitenbasis daarvoor staat grotendeels al op de site.
- **FASE 2 voor het Marcel-spoor** kan starten zodra §4 punt 1–4 er zijn. Zonder de case-verhalen
  en de werkwijze-in-eigen-woorden wordt die copy of hol of verzonnen — en de brief verbiedt beide.
- FASE 3–6 (UX per pagina, visual system, SEO, conversie) volgen op de goedgekeurde copy en IA.
