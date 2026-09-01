# Herontwerp Koers voor Morgen — FASE 3: UX per pagina

Opgesteld 1 sep 2026. Bouwt voort op FASE 1 (sitemap, merkarchitectuur) en FASE 2 (copy is
akkoord). Dit document is de **paginablauwdruk**: per pagina het doel, de bezoeker, de CTA's, de
sectievolgorde, de interne links en de benodigde beelden. Nog geen HTML — dat is de bouwstap na
akkoord op FASE 3–6.

> **Correctieronde 1 sep 2026 (Marcel).** Dit document is gericht bijgesteld; de structuur blijft.
> §0 hieronder is nieuw en **leidend** waar het afwijkt van FASE 1/FASE 2. Kernpunten: (1) de hero
> wordt commercieel scherper op M&A i.p.v. de algemene merkgedachte; (2) de merkarchitectuur wordt
> explicieter — twee **zelfstandig verkoopbare** proposities; (3) het spoor "Senior M&A" heet
> voortaan **M&A Expertise** (zie §0.3); (4) de platform-copy benadrukt overal **zelfstandige
> inzet door een adviseur**; (5) op platformpagina's is Marcel alleen een *optionele verdieping*.

---

## 0. CORRECTIERONDE — merkregel, architectuur, naamgeving, hero

### 0.1 Overkoepelende merkregel (staat boven alle pagina's)

> Koers voor Morgen is **een M&A-platform dat zelfstandig waarde levert, gebouwd vanuit echte
> dealervaring — met daarnaast toegang tot senior M&A-expertise wanneer de situatie daarom vraagt.**

Twee dingen die de site nooit mag uitstralen:
- ❌ een traditioneel consultancybureau dat toevallig software heeft;
- ❌ een softwarebedrijf met een consultant ernaast.

De twee proposities **versterken** elkaar en verwijzen naar elkaar, maar zijn **commercieel niet
van elkaar afhankelijk**. Een klant moet platformklant kunnen worden zonder ooit met Marcel te
spreken; en iemand moet Marcel kunnen inhuren zonder het platform.

### 0.2 Merkarchitectuur (expliciet)

```
KOERS VOOR MORGEN
  merk + gedachtegoed — van complexiteit naar koers, van besluit naar beweging
│
├── PLATFORM          M&A-intelligence / transactieplatform
│                     Zelfstandig product. M&A-adviseurs en dealteams kopen het en zetten
│                     het zelfstandig in bij hun eigen klanten, trajecten en dealteams —
│                     zonder Marcel. Groeit als eigenstandig product.
│
└── M&A EXPERTISE     Senior M&A-expertise — Marcel Bisschops
                      Complexe transacties, due diligence, integratie & PMI, value creation,
                      strategische vraagstukken, regie. Volledig geloofwaardig en inzetbaar
                      zonder het platform.
```

Dit is **niet** "Marcel + zijn software". Het is: **één merk — twee zelfstandige proposities.**

### 0.3 Naamgeving: "Senior M&A" → **"M&A Expertise"** (aanbeveling)

**Aanbeveling: gebruik "M&A Expertise" als propositienaam en navigatielabel.** Reden:
- "Senior M&A" leest als een **functietitel** (vgl. "Senior Manager M&A") en werkt slecht als
  propositienaam — "Werk met Senior M&A" loopt niet.
- "M&A Expertise" is een **propositie**, staat symmetrisch naast "Platform", en is commercieel
  en semantisch helderder ("Platform | M&A Expertise").
- "Senior" blijft z'n werk doen in de **lopende tekst** — als bijvoeglijk naamwoord ("senior
  M&A-expertise", "senior oordeel en regie"), waar het geloofwaardigheid toevoegt zonder als
  titel te klinken.

Doorgevoerd in dit document: spoor = **M&A Expertise**, URL-root **`/m-en-a-expertise/`**
(keyword-rijk, vervangt `/senior-ma/`), CTA op de homepage-routekaart blijft **"Werk met Marcel"**
(persoonlijker dan "Bekijk M&A Expertise").

### 0.4 Hero (vervangt FASE 2 §1.2 als eerste commerciële boodschap)

De merkgedachte *"Koers bepalen. Verandering realiseren."* blijft — maar **als merkregel**
(kleine eyebrow / in het proces-blok / footer), **niet** als H1. De H1 moet binnen ~5 seconden
zeggen: dit gaat over M&A, deal intelligence en senior M&A-expertise.

**Aanbevolen (optie A):**
> **Eyebrow:** M&A-platform & senior M&A-expertise · Koers voor Morgen
>
> **H1:** Betere beslissingen. Betere deals.
>
> **Sub:** Een zelfstandig M&A-platform voor adviseurs en dealteams — en senior M&A-expertise
> voor transacties waar ervaring, oordeel en regie het verschil maken.

**Alternatief (optie B, onderscheidender, haakt aan op het model in §0.5):**
> **H1:** De deal doorzien. De juiste keuzes maken. De waarde realiseren.

**Alternatief (optie C, meest verklarend):**
> **H1:** M&A-intelligence en senior expertise, onder één merk.

→ Voorkeur A voor punch, B als Marcel het model uit §0.5 leidend wil maken. C alleen als test
uitwijst dat A/B te cryptisch zijn.

**Twee gelijkwaardige routekaarten, direct onder de sub** (op desktop naast elkaar, op mobiel
onder elkaar — zelfde inhoud, zelfde volgorde):

| PLATFORM | M&A EXPERTISE |
|---|---|
| **Voor M&A-adviseurs en dealteams.** | **Voor directies, aandeelhouders, PE en dealteams.** |
| Een professionele M&A-omgeving die u zelfstandig inzet bij uw eigen klanten en transacties. | Senior M&A-expertise voor complexe transacties en vraagstukken waarbij ervaring, oordeel en regie het verschil maken. |
| → **Bekijk het platform** | → **Werk met Marcel** |

Geen aparte grote hero-CTA — de twee kaarten *zijn* de CTA. Wel rechtsboven in de nav de vaste
knop **"Plan een gesprek"**.

### 0.5 Het verbindende model: **Doorzien → Beslissen → Realiseren**

Op de homepage (en als framing op de M&A Expertise-overzichtspagina) staat één model dat laat
zien waar het platform ophoudt en Marcel begint:

| Fase | Wat er gebeurt | Wie/wat |
|---|---|---|
| **Doorzien** | Het bedrijf en de deal begrijpen; risico's en kansen scherp krijgen. | **Platform** — dataroom, documentstructuur, AI-signalen, Q&A, analyse, FDD als één van de lenzen. |
| **Beslissen** | De juiste keuzes maken; scenario's en consequenties wegen. | **Marcel** — senior oordeel, strategische beoordeling, onderhandelingsregie. |
| **Realiseren** | De deal omzetten in waarde. | **Marcel** — integratie & PMI, regie, value creation. Platform bewaakt voortgang en dossier. |

Kernzin onder het model: *"Het platform levert de intelligence. Marcel brengt het oordeel en de
uitvoering."* (Engelse variant *See · Decide · Execute* alleen als bewust internationale keuze;
hoofdtekst blijft Nederlands.)

### 0.6 Navigatie (bijgesteld)

**Platform · M&A Expertise · Bedrijfsscan · Cases · Inzichten · Contact** — max 6, plus rechts de
vaste knop **Plan een gesprek**. **Inloggen** = kleine tekstlink uiterst rechts →
`app.koersvoormorgen.nl`. Op mobiel: hamburger, dezelfde 6 + knop.

### 0.7 Terugkerende bouwstenen (uitwerking in FASE 4)
- **Sectieritme** donker (nachtblauw) ↔ licht (warm off-white) ↔ petrol (statement).
- **"De lijn van koers"** — dunne petrol lijn door sectie-overgangen en procesvisualisaties.
- **Dynamiek** (FASE 4): asymmetrische composities, grote typografie, beeld dat door secties heen
  loopt, subtiele scrollbeweging, wisseling donker/licht/petrol, grote fotografische statements,
  echte productscreenshots en UI-crops, horizontale beweging waar functioneel. **Geen animatie om
  de animatie**; alles respecteert `prefers-reduced-motion`. Doel: senior + premium + dynamisch —
  niet senior + statisch + corporate.
- **Eén desktop = mobiel-logica:** geen 2-koloms-hero die op mobiel omklapt; secties verbreden op
  desktop, ze herschikken niet.

### 0.8 Beeldstrategie (bijgesteld)
Volledig plan per URL: **`HERONTWERP-BEELDPLAN.md`** (leidend). Kern:
- **Liever één extreem sterk beeld dan zes middelmatige.** Geen generieke consultancyfoto's.
- Werkwijze: **eerst 6 hero-beelden** kiezen (homepage · platform · M&A Expertise · complexe
  transacties · bedrijfsscan · Over Marcel), als set beoordelen, dan de rest afleiden.
- Twee gescheiden beeldwerelden — **Platform:** architectuur, infrastructuur, abstracte
  datavisualisatie, echte productscreenshots, document-/dossierbeelden. **M&A Expertise:**
  bruggen, complexe constructies, wegen, perspectief, industrie, architectuur, echte natuurlijke
  portretten van Marcel (eigen fotografie, geen stock).
- Waar het product bestaat: **echte screenshots > stock**.
- Vaste ratio's: hero 16:9/21:9 · content 4:3 · portret 4:5. Eén grade over alles (donkere
  schaduwen, lage verzadiging, nachtblauw/petrol middentonen, warm licht behouden).
De fotografie straalt **complexiteit, perspectief, verbinding en beweging** uit.

### 0.9 Interne-linklogica (bijgesteld — de rode draad door §1–§9)
- **Platform → M&A Expertise:** alleen als *optionele verdieping*, één zin, niet prominent —
  "Voor complexe trajecten kunt u daarnaast senior M&A-expertise inschakelen." **Nooit** "het
  platform werkt samen met Marcel".
- **M&A Expertise → Platform:** het platform mag genoemd worden als gereedschap dat Marcel kán
  inzetten, nooit als voorwaarde.
- **Homepage:** hero-routekaarten → `/platform` en `/m-en-a-expertise`; model (§0.5) → beide.
- **Bedrijfsscan-funnel:** scan → rapport → `/platform` → (eventueel) `/m-en-a-expertise` — zie §3.
- **Cases:** elke case linkt naar het spoor van zijn *roltype* (§6).
- **Footer:** identiek overal, met beide sporen als aparte kolom.

---

## 1. HOMEPAGE — `/`

| | |
|---|---|
| **Doel** | Binnen ~5 seconden duidelijk maken: wat is het platform, wat doet Marcel, voor wie is elk spoor. Dan de bezoeker een route laten kiezen. |
| **Primaire bezoeker** | Twee, gelijkwaardig: (a) M&A-adviseur / corporate finance / dealteam dat een professionele M&A-omgeving zoekt; (b) directie / DGA / aandeelhouder / PE met een complexe transactie of vraagstuk. |
| **Primaire CTA** | De twee routekaarten in de hero ("Bekijk het platform" / "Werk met Marcel"). |
| **Secundaire CTA** | Nav-knop "Plan een gesprek"; onderaan "Plan een gesprek" (eind-CTA-vlak). |
| **Microconversie** | Doorklik naar `/platform`, `/m-en-a-expertise`, `/bedrijfsscan`, of scroll voorbij de hero. |

**Sectievolgorde** (bijgesteld — Marcels volgorde van 1 sep; copy grotendeels uit FASE 2 §1,
her-gesequenced):
1. **Hero** (nachtblauw) — eyebrow, H1 uit §0.4 ("Betere beslissingen. Betere deals."), sub,
   **twee routekaarten** (Platform | M&A Expertise). *Merkregel "Koers bepalen. Verandering
   realiseren." klein in de eyebrow of net onder de hero, niet als H1.*
2. **Twee proposities** (licht → petrol) — Blok 1 Platform: "wat kan een adviseur hier
   zelfstandig mee?" · Blok 2 M&A Expertise: "wanneer haal je Marcel erbij?". Elk kort, elk met
   eigen doorklik.
3. **Herkenning: wanneer heb je dit nodig?** (warm off-white) — "Soms weet je dat er iets moet
   gebeuren…", toegespitst op deal-/transactiesituaties (overname die op papier klopt maar niet
   samen werkt; traject verspreid over e-mail/Excel/datarooms; integratie die niet landt; besluit
   dat niet in beweging komt).
4. **Platform uitgelicht** (nachtblauw) — 3–4 concrete dingen die een adviseur zelfstandig doet
   (eigen klanten & trajecten, eigen huisstijl, centrale dataroom, AI-signalen, Q&A, voortgang,
   export). Link → `/platform`.
5. **M&A Expertise uitgelicht** (petrol) — wanneer Marcel: complexiteit, belangen of stakes nemen
   toe. De zes vraagstukken kort. Link → `/m-en-a-expertise` + `/over-marcel`.
6. **Doorzien → Beslissen → Realiseren** (nachtblauw) — het model uit §0.5 als "lijn van
   koers"-visualisatie; kernzin "het platform levert de intelligence, Marcel het oordeel en de
   uitvoering". *(De 6 fijnmazige stappen uit FASE 2 §1.5 — vraagstuk/richting/besluit/regie/
   realisatie/resultaat — mogen als sublabels onder de drie hoofdfasen.)*
7. **Cases / bewijs** (warm off-white, terughoudend) — 20+ / €60 mln / ~30 jaar / KPMG /
   referenties op aanvraag + 1–2 case-kaarten met roltype-label (§6). Link → `/cases`.
8. **Bedrijfsscan** (licht) — de gratis, zelfstandig waardevolle ingang; één alinea + CTA.
   Link → `/bedrijfsscan`.
9. **Over Marcel** (nachtblauw, compact) — portret + 3 regels + "ervaring + oordeel + regie".
   Link → `/over-marcel`.
10. **Eind-CTA** (nachtblauw vlak) — "Staat u voor een belangrijk kruispunt?" → Plan een gesprek.
11. **Footer** (nachtblauw).

*(De FASE 2-secties "Positionering — Geen rapport om het rapport" en "Wanneer Koers voor Morgen —
vier blokken" vervallen als aparte homepage-secties: "geen rapport om het rapport" wordt één zin
in sectie 5; de vier blokken zijn vervangen door de zes vraagstukken in sectie 5 en het model in
sectie 6. Copy is niet weggegooid — hij verhuist naar de spoorpagina's.)*

**Interne links eruit:** hero-routekaarten → `/platform` + `/m-en-a-expertise`; sectie 2 blokken
→ idem + `/bedrijfsscan` + `/over-marcel`; sectie 4 → `/platform` (+ `/platform/voor-adviseurs`);
sectie 5 → `/m-en-a-expertise` + de zes subpagina's + `/over-marcel`; sectie 6 model → `/platform`
en `/m-en-a-expertise`; sectie 7 → `/cases`; sectie 8 → `/bedrijfsscan`; sectie 9 →
`/over-marcel`; footer → alle hoofdpagina's + Privacy/Voorwaarden/Inloggen.

**Beelden:** hero — één groot fotografisch statement: brede weg/infrastructuur richting horizon,
perspectief en beweging (Marcels bergpasfoto egaal nabewerkt, óf premium stock; FASE 2 §5.1 +
§0.8). Sectie 4 — echte productscreenshot(s) in strak browser-frame. Sectie 6 — geen foto, alleen
de lijn-visualisatie. Secties 7/8 — geen foto (timeline / UI-crop). Sectie 9 — portret van Marcel.
Principe: één sterk beeld per betekenisvolle sectie, niet elke sectie een plaatje (§0.8).

---

## 2. PLATFORM-SPOOR

### 2.0 Gedeeld sjabloon voor alle `/platform/*`-pagina's

- **Toon:** productcopy, aangescherpt. Feitelijk, rustig, "u beslist". **Zelfstandig geformuleerd**
  — de adviseur is de hoofdpersoon, niet het platform. Dus **niet** "het platform ondersteunt uw
  M&A-traject", maar "u voert uw eigen transacties, klanten en dealteams in één omgeving". De
  lezer moet denken: *"dit kan ik bij mijn eigen klant inzetten."*
- **Feitelijk te onderbouwen kernpunten** (alleen bestaande functionaliteit — niets verzinnen):
  eigen klanten · eigen trajecten · eigen huisstijl · eigen regie · schaalbaarheid (trajectlimiet
  + modules) · zelfstandige inzet zonder Marcel · centrale dossieromgeving · AI-signalen ·
  documentstructuur per DD-categorie & fase · Q&A · voortgang · rapportage/export · matching.
- **Marcel op platformpagina's = alleen optionele verdieping.** Maximaal één zin, niet prominent:
  *"Voor complexe trajecten kunt u daarnaast senior M&A-expertise inschakelen."* → `/m-en-a-expertise`.
  **Nooit** "het platform werkt samen met Marcel". Klant kunnen worden zonder ooit met Marcel te
  spreken is het uitgangspunt.
- **Vaste kop:** eyebrow "Koers voor Morgen Platform" + H1 + korte sub + primaire CTA.
- **Vaste voet:** blok "Zelf uitproberen" → **Gratis bedrijfsscan** (primair) + **Word adviseur
  op het platform** (secundair) + **Inloggen** (tekstlink).
- **Zijnavigatie / broodkruimel:** Platform › [subpagina]. Onderaan "Verder lezen"-links naar de
  andere platform-subpagina's.
- **Beeld:** abstract/architectonisch of een echte productscreenshot in een strak browser-frame.
  **Geen** stockfoto's van handen-op-laptop. `product-dashboard.png` moet vervangen worden door
  een echte screenshot met een fictief traject.

### 2.1 `/platform` (overzicht)

| | |
|---|---|
| **Doel** | Volledig beeld geven van wat het platform is en voor wie, en doorverwijzen naar de diepere subpagina's + de bedrijfsscan. |
| **Primaire bezoeker** | M&A-adviseur / corporate finance / dealteam die overweegt het platform bij eigen klanten in te zetten. |
| **Primaire CTA** | "Start gratis met de bedrijfsscan". |
| **Secundaire CTA** | "Word adviseur op het platform" (→ `/platform/voor-adviseurs`); "Inloggen". |

**Sectievolgorde** (copy: FASE 2 §4):
1. Kop — H1 "Eén traject. Eén dossier. Van voorbereiding tot closing." + sub (verspreide
   e-mail/Excel/datarooms → één omgeving).
2. Het onderscheid — "dataroom = één fase / Koers voor Morgen = heel traject", scherper.
3. Alles per fase en per rol (bestaande feature-tekst).
4. Eén centrale dataroom · Vragen, antwoorden en overleggen bij elkaar · Altijd zicht op
   ontbrekende documenten (bestaande feature-teksten).
5. AI die het dossier bewaakt — de drie échte signaalvoorbeelden. Link → `/platform/ai-signalen`.
6. Elke waarde herleidbaar naar het brondocument + "AI helpt, u beslist".
7. Zo werkt een traject — 5 stappen (Start → Dataroom → Vragen & acties → Voortgang → Closing)
   als procesvisualisatie ("lijn van koers").
8. Voor adviseurs die regie willen houden — korte teaser → `/platform/voor-adviseurs`.
9. Zo gaan we om met uw transactiedata — samenvatting (6 blokken kort) → `/platform/beveiliging-en-gegevens`.
10. Voet-blok "Zelf uitproberen".

**Interne links:** → `/platform/dataroom-en-fases`, `/platform/ai-signalen`,
`/platform/beveiliging-en-gegevens`, `/platform/voor-adviseurs`, `/platform/matching`,
`/bedrijfsscan`, `app.koersvoormorgen.nl`.

**Beelden:** één brede productscreenshot (dashboard, fictief traject) in browser-frame bovenaan;
kleine deel-screenshots bij secties 3–5.

### 2.2 `/platform/dataroom-en-fases`

| | |
|---|---|
| **Doel** | Laten zien hoe documenten per DD-categorie en per fase gestructureerd worden, en hoe rol/fase-toegang werkt. |
| **Primaire bezoeker** | Adviseur die de dagelijkse werking wil beoordelen. |
| **Primaire CTA** | "Bekijk het volledige platform" (→ `/platform`) of "Start met de bedrijfsscan". |
| **Secundaire CTA** | "Zo bewaken we de gegevens" → `/platform/beveiliging-en-gegevens`. |

**Secties:** kop → DD-categorieën per fase → documentdekking ("wat is er, wat ontbreekt") →
rol- en fase-toegang → versiebeheer/herleidbaarheid → voet-blok.
**Beeld:** screenshot documentoverzicht + een klein diagram fase × rol.

### 2.3 `/platform/ai-signalen`

| | |
|---|---|
| **Doel** | De AI-rol scherp afbakenen: signaleert, vult niet in, doet geen aanname. |
| **Primaire bezoeker** | Adviseur die sceptisch is over "AI in due diligence". |
| **Primaire CTA** | "Bekijk het volledige platform". |
| **Secundaire CTA** | "Elke waarde herleidbaar" → sectie op `/platform`. |

**Secties:** kop → de drie échte signaalvoorbeelden (ontbrekend document / afwijking tussen
documenten / actie vereist), elk met een concreet mini-scenario → "AI helpt, u beslist" (de
grens) → herleidbaarheid naar brondocument → wat de AI **niet** doet (geen waardeoordeel, geen
automatische invulling) → voet-blok.
**Beeld:** drie kleine screenshot-crops van echte signalen; verder tekst.

### 2.4 `/platform/beveiliging-en-gegevens`

| | |
|---|---|
| **Doel** | Alle compliance-/datazekerheid op één plek — het bestaande sterke verhaal, uitgebouwd. |
| **Primaire bezoeker** | Adviseur + diens klant (verkoper/koper) die "waar staat mijn data" vraagt; inkoop/DPO. |
| **Primaire CTA** | "Bekijk het volledige platform". |
| **Secundaire CTA** | "Voorwaarden" + "Privacy" (tekstlinks). |

**Secties:** kop → EU-opslag (Cloudflare Frankfurt, ISO 27001 / SOC 2) → versleuteling (TLS) →
rol/fase-toegang → meekijker read-only + intrekbaar → AI-verwerking via SCC's → 14-dagen-
verwijdering + AVG-rechten → de technisch afgedwongen muur tegen inzage in andermans trajecten →
sub-verwerkerslijst → contact voor een verwerkersovereenkomst → voet-blok.
**Beeld:** geen foto's; eventueel een schematische datastroom-tekening in de "lijn van koers"-stijl.

### 2.5 `/platform/voor-adviseurs`

| | |
|---|---|
| **Doel** | Het **betaalde** adviseursmodel uitleggen (trajectlimiet + modules) en aanzetten tot contact. |
| **Primaire bezoeker** | Zelfstandig M&A-adviseur / klein kantoor dat het platform commercieel wil inzetten. |
| **Primaire CTA** | "Vraag toegang aan" → contactformulier / `marcel@bisschopsfinancing.nl`. |
| **Secundaire CTA** | "Probeer eerst de gratis bedrijfsscan". |

**Secties:** kop ("Voor adviseurs die regie willen houden") → hoe het model werkt (traject =
eenheid; limiet; modules: contracten, AI-analyse, Q&A, export, meekijkers, matching) → wat je
zelfstandig kunt (eigen klanten, eigen huisstijl) → wat het kost / hoe toegang werkt (zonder
harde prijs op de pagina als Marcel dat niet wil — dan "op aanvraag" + contact) → geblokkeerde
acties tonen altijd "Neem contact op met Bisschops Financing" → voet-blok.
**Beeld:** screenshot module-instellingen + het **huisstijl-scherm** (geverifieerd 1 sep: de
white-label-functie bestaat en is live — `adv.html` `renderHuisstijlModal`: platformnaam,
accentkleur met contrast-veiligheid, logo-URL, adres, KvK; werkt door naar de mna-trajecten die
de adviseur aanmaakt; niet achter een betaalde module; logo = URL, geen upload).
**Let op (werkregel 17):** introduceert dit een nieuwe prijsstelling/module-uitleg publiek? →
check of Voorwaarden/AV aangepast moeten. Nu: **geen wijziging**, het model bestaat al; wél
opnieuw checken zodra er publieke prijzen op komen.

### 2.6 `/platform/matching`

| | |
|---|---|
| **Doel** | Het anonieme sector/regio-matching-platform uitleggen (koper ↔ traject), zonder valse verwachting. |
| **Primaire bezoeker** | Adviseur met een verkooptraject dat baat heeft bij extra kopers; potentiële koper. |
| **Primaire CTA** | "Meld een zoekprofiel aan" / "Lees hoe matching werkt". |
| **Secundaire CTA** | "Terug naar het platform". |

**Secties:** kop → hoe het werkt (anoniem, sector + regio, adviseur houdt de regie) → wat het
**niet** is (geen open marktplaats, geen automatische deal) → privacy (niets herleidbaars zichtbaar
vóór wederzijdse interesse) → voet-blok.
**Beeld:** abstract kaart/regio-motief; geen mensen.

---

## 3. `/bedrijfsscan` — commerciële landingspagina

| | |
|---|---|
| **Doel** | Bezoeker de gratis scan laten starten. Zelfstandig waardevol product **én** de laagdrempelige ingang naar het platform-spoor. |
| **Primaire bezoeker** | Ondernemer / DGA / bestuurder (accountancy, mkb, zorg, IT) die twijfelt over richting, opvolging of verkoop. |
| **Primaire CTA** | "Start de gratis bedrijfsscan" (bovenaan én halverwege én onderaan). |
| **Secundaire CTA** | "Bespreek de uitkomst met Marcel" → `/contact` (na afronden scan prominenter). |
| **Microconversie** | Sectorkeuze maken / eerste vraag beantwoorden. |

**De funnel (expliciet, maar niet geforceerd):**

> **Gratis bedrijfsscan** → **inzicht + adviesrapport** → **Platform** (het traject verder
> gestructureerd voeren) → *eventueel* **M&A Expertise** (Marcel, als de complexiteit daarom vraagt).

- Elke stap is **op zichzelf compleet**: de scan levert een bruikbaar rapport, ook als de
  bezoeker daarna niets meer doet. Geen "je moet doorklikken om iets van waarde te krijgen".
- De vervolgstap wordt **pas ná het rapport** prominent (sectie 7 hieronder), niet als druk
  tijdens de scan.
- Platform en M&A Expertise zijn **twee losse vervolgen**, geen verplichte volgorde — een
  bezoeker mag direct van de scan naar `/contact`.

**Sectievolgorde:**
1. Kop (nachtblauw) — H1 sectorneutraal ("Weet u of uw koers nog klopt?"), sub, CTA + "±15 min,
   direct een adviesrapport, gratis".
2. Voor wie / wanneer herkenbaar — de vraagstukken (opvolging, verkoopgereedheid, strategie die
   niet meer past).
3. Wat de scan doet — 11 dimensies, scenario's, AI-adviesrapport; **let op:** waardering alleen
   voor accountancy, andere sectoren kwalitatief (nette "nog niet"-melding, geen verkeerde norm).
4. Wat je krijgt — voorbeeld-rapportstructuur (geen verzonnen cijfers).
5. Hoe het met je data gaat — kort, link → `/platform/beveiliging-en-gegevens`.
6. Start-CTA (petrol) — sectorkiezer of knop naar de tool (`bedrijfsscan.html` / de tool zelf).
7. "En daarna?" — de funnel expliciet: de scan is gratis en compleet; wilt u het traject verder
   voeren → **Platform**; is het vraagstuk complex → **M&A Expertise**. Twee losse routes,
   geen verplichte volgorde.
8. Voet — kort merkblok.

**Interne links:** → de scan-tool zelf, `/platform`, `/m-en-a-expertise/strategische-vraagstukken`,
`/contact`, `/platform/beveiliging-en-gegevens`.
**Beeld:** Nederlands landschap/weg-luchtfoto in de hero (merklaag), daarna vooral echte UI-crops
van de scan (sectorkeuze, eerste vraag, voortgang, voorbeeldrapport) — "dit kan ik nu meteen
gebruiken". Zie beeldplan.
**Let op (werkregel 17):** de scan verwerkt persoonsgegevens — bij tekstwijziging aan wat er
verzameld wordt: Privacy/Voorwaarden checken. Nu: bestaande verwerking, geen wijziging.

---

## 4. M&A EXPERTISE-SPOOR (Marcel) — was "Senior M&A", zie §0.3

### 4.0 Gedeeld sjabloon voor alle `/m-en-a-expertise/*`-pagina's

- **Toon:** eerste persoon, scherp, zakelijk, rustig. Spreekt **primair een dealpubliek** aan —
  DGA, aandeelhouder, directie, PE, corporate finance, M&A-professional, dealteam. Dus
  deal-taal, geen algemeen veranderkundig jargon:
  - niet *"er moet iets veranderen"* → wel *"de deal is rond, nu begint het werk dat de waarde
    moet realiseren"*;
  - niet *"een complexe verandering vraagt om regie"* → wel *"veel partijen, veel belangen,
    weinig ruimte voor fouten"*.
  Professioneel en internationaal van toon; hoofdtekst blijft Nederlands.
- **Vaste kop:** eyebrow "M&A Expertise" + H1 (het vraagstuk in klanttaal) + korte sub + CTA.
- **Vaste voet:** blok "Even sparren?" → **Plan een gesprek** (primair) + `marcel@bisschopsfinancing.nl`
  + `+31 6 38 68 98 88` + "Over Marcel" (secundair).
- **Broodkruimel:** M&A Expertise › [subpagina]. Onderaan "Gerelateerd" naar 2 andere subpagina's
  + 1 relevante case.
- **Bewijsstrip** (klein, elke pagina): 20+ deals · €60 mln · ~30 jaar · KPMG-origine ·
  referenties op aanvraag.
- **Platform op deze pagina's:** mag genoemd worden als gereedschap dat Marcel *kan* inzetten
  (bijv. de dataroom/AI-signalen tijdens DD) — **nooit als voorwaarde**. Iemand huurt Marcel in
  zonder platform.
- **Beeld:** één sterk architectuur-/infrastructuurbeeld per pagina (brug, constructie, weg,
  knooppunt), egaal nabewerkt naar de gemeenschappelijke grade. Geen geposeerde vergadertafels,
  geen CEO-stock. Zie beeldplan.

### 4.1 `/m-en-a-expertise` (spoor-overzicht)

| | |
|---|---|
| **Doel** | Marcel als zelfstandige propositie neerzetten; het model Doorzien → Beslissen → Realiseren tonen; doorverwijzen naar het juiste vraagstuk + Over Marcel + Cases. |
| **Primaire bezoeker** | Directie / DGA / aandeelhouder / PE / corporate finance met een concrete, complexe transactie of vraagstuk. |
| **Primaire CTA** | "Plan een gesprek". |
| **Secundaire CTA** | "Over Marcel"; "Bekijk cases". |

**Secties:** kop ("Ervaring die telt wanneer het ingewikkeld wordt") → wanneer je mij inschakelt
(complexiteit / belangen / stakes nemen toe) → **het model Doorzien → Beslissen → Realiseren**
(§0.5) met de rolverdeling platform = intelligence, Marcel = oordeel + ervaring + uitvoering →
de zes vraagstukken als kaartenraster (elk → subpagina) → hoe ik werk (kort, → `/over-marcel`) →
bewijsstrip + 1 uitgelichte case → voet-blok.
**Interne links:** de 6 subpagina's, `/over-marcel`, `/cases`, `/contact`, en één optionele
verwijzing naar `/platform` (als gereedschap, niet als voorwaarde).
**Beeld:** grote brug / constructie bij blue hour als hoofdbeeld (structuur, verbinding,
avondlicht). Zie beeldplan.

### 4.2 De zes vraagstuk-subpagina's

Zelfde structuur, per pagina ingevuld. Structuur:
1. Kop — H1 = het vraagstuk in de woorden van de klant (deal-taal, zie §4.0).
2. Herkenning — 3–4 zinnen "dit speelt bij u als…", concreet op transactie-/dealsituaties.
3. Hoe ik het aanpak — 3 stappen (essentie → keuzes scherp → regie tot het werkt), toegespitst.
4. Wat je van mij krijgt — één ervaren aanspreekpunt, geen consultantsleger, betrokken tot het
   werkt.
5. Bewijsstrip + 1 relevante case (met roltype-label, §6).
6. Voet-blok "Even sparren?".

| Pagina | H1 (deal-taal) | Primaire CTA | Relevante case | Gerelateerd |
|---|---|---|---|---|
| `/m-en-a-expertise/complexe-transacties` | "Een transactie die te veel raakt om aan het toeval over te laten." | Bespreek uw transactie | Case 1 | due-diligence-begeleiding, integratie-en-pmi |
| `/m-en-a-expertise/due-diligence-begeleiding` | "Weet wat u koopt — en wat het straks waard is." | Bespreek uw transactie | Case 1 | complexe-transacties, `/platform/ai-signalen` |
| `/m-en-a-expertise/integratie-en-pmi` | "De deal is rond. Nu begint het werk dat de waarde moet realiseren." | Bespreek de integratie | Case 2 | value-creation, regie |
| `/m-en-a-expertise/value-creation` | "De transactie is gedaan. Het rendement moet nog komen." | Bespreek uw vraagstuk | Case 2 | integratie-en-pmi, strategische-vraagstukken |
| `/m-en-a-expertise/strategische-vraagstukken` | "Uw strategie geeft niet meer het hele antwoord — en er speelt een transactie." | Bespreek uw strategische vraagstuk | Case 3 | regie, value-creation |
| `/m-en-a-expertise/regie` | "Veel partijen, veel belangen, weinig ruimte voor fouten." | Bespreek het traject | Case 3 | integratie-en-pmi, strategische-vraagstukken |

**FDD (op `due-diligence-begeleiding`):** presenteer financiële due diligence **niet als
losstaand product**. Het verhaal: FDD is één van de bronnen waarmee je de deal begrijpt en
risico's en kansen scherp krijgt; daaromheen kijk je ook naar commercieel, operationeel, IT,
organisatie, strategie en integratie. Kern: **Marcel verbindt die perspectieven** tot één beeld
van de deal. Extra sectie op deze subpagina: "De lenzen op een deal" (financieel · commercieel ·
operationeel · IT · organisatie · strategie · integratie) met FDD als één ervan.

**Beeld per pagina** (detail in beeldplan): complexe-transacties → constructie/brug-detail (niet
de hele brug — detail geeft spanning); due-diligence → vooral platformbeeld / documentfragmenten
/ analyse, evt. abstract staal; integratie-en-pmi → twee structuren die samenkomen (geen
puzzelstukken); value-creation → weg die stijgt naar de horizon, iets meer licht;
strategische-vraagstukken → luchtfoto knooppunt / wegen met meerdere richtingen (het meest
"intellectuele" beeld); regie → overhead-patroon waarin veel onderdelen samenkomen.

---

## 5. `/over-marcel`

| | |
|---|---|
| **Doel** | Marcel **zelfstandig verkopen** als senior M&A-professional. De lezer moet denken: *"deze man wil ik bij mijn deal hebben"* — niet *"hij heeft ook een platform gebouwd"*. |
| **Primaire bezoeker** | Wie op het M&A Expertise-spoor twijfelt "is dit de juiste persoon". |
| **Primaire CTA** | "Plan een gesprek". |
| **Secundaire CTA** | "Bekijk cases". |

**Hoofdboodschap:** ervaring + oordeel + senioriteit + regie. Concrete ervaring, aantoonbare
resultaten, geen opgeblazen claims. Het platform is hier **bewijs van ondernemerschap en
innovatie** — een klein blok laag op de pagina, **niet** het hoofdverhaal.

**Sectievolgorde** (copy: FASE 2 §2):
1. Kop + portret — H1 "Ervaring die telt wanneer het ingewikkeld wordt" + intro-alinea.
2. Hoe ik werk — de werkwijze-alinea (concept, Marcel stelt bij).
3. Kernervaring — vier blokken (M&A / Bestuur & toezicht / Transformatie & herstel / Advies) +
   achtergrond (Drs. Bestuurskunde Leiden, talen, heel Nederland).
4. Cijfers/bewijs — 20+ / €60 mln / ~30 jaar / KPMG-nominatie / referenties op aanvraag.
5. Loopbaan-timeline — de CV-rollen als "lijn van koers"-tijdlijn (Fidelis → Accon AVM/COO →
   216 Accountants → Ledger Leopard a.i. → Finturi → Netsam → Bisschops Interim / Koers voor Morgen).
6. Sectoren — accountancy & advies · fintech (AFM) · technologie · IT & consultancy ·
   investeringen & participaties.
7. **"Ik bouwde ook het platform"** — klein blok, één alinea: bewijs van ondernemerschap en van
   hoe diep de M&A-praktijk in het werk zit. Link → `/platform`. Nadrukkelijk ondergeschikt.
8. CTA-blok — "Heeft u een transactie of vraagstuk waar u eens scherp naar wilt kijken?" +
   e-mail + telefoon.
9. Voet.

**Interne links:** → `/cases`, elke `/m-en-a-expertise/*`, `/platform` (klein, sectie 7),
`/contact`, LinkedIn.
**Beeld:** geen stock. **Nu:** de bestaande portretfoto (okerkleurige trui), gegradeerd, 4:5 of
1:1 — één beeld volstaat voor livegang. Een eigen fotosessie is later (geen prioriteit, geen
tijd nu). **Niet:** stijve LinkedIn-foto, Marcel met zes mensen rond een vergadertafel,
stoomtrein, strand. Zie beeldplan.

---

## 6. `/cases` + case-detailpagina's

### 6.1 `/cases` (overzicht)

| | |
|---|---|
| **Doel** | Bewijs door verhaal — drie archetypische trajecten die het patroon "complexiteit → koers → beweging" tonen. |
| **Primaire bezoeker** | M&A Expertise-bezoeker die na Over Marcel "laat maar zien" denkt; ook platform-bezoekers zodra er een Platform-case is. |
| **Primaire CTA** | "Plan een gesprek". |
| **Secundaire CTA** | Doorklik naar de losse case; "Over Marcel". |

**Secties:** kop ("Ervaring, geen beloften") → drie case-kaarten (roltype-label + titel + situatie
+ één resultaatzin) → strip "Referenties op aanvraag" → CTA-blok.

**Roltype-label — verplicht en zichtbaar op elke case** (voorkomt dat de twee proposities door
elkaar lopen):
- **M&A Expertise-case** — Marcel had een inhoudelijke en/of regierol. *(De 3 huidige concepten
  uit FASE 2 §3 zijn alle drie van dit type.)*
- **Platform-case** — een adviseur zette Koers voor Morgen zelfstandig in bij een eigen klant of
  deal. **[NOG INVULLEN — vereist een echte platformgebruiker die dit vrijgeeft; nog niet
  beschikbaar.]**
- **Combinatiecase** — platform én Marcel, **alleen** als dat daadwerkelijk zo gelopen is.

Nooit een case waarin onduidelijk is wie wat deed.

**Let op:** cases zijn nu **[CONCEPT]** met op CV-basis ingevulde resultaten (FASE 2 §3). Vóór
livegang: Marcel controleert elk cijfer/bewering, of vervangt door een echt geanonimiseerd
traject. Werkregel 14 — nooit een echte naam/dossier in de repo, ook niet in deze paginabron.

### 6.2 Case-detail (3×, zelfde sjabloon)

**Secties:** kop (**roltype-label** + titel + één regel context) → Situatie → Vraagstuk → Aanpak
→ Complexiteit → Resultaat → Rol → "Herkent u dit?" CTA-blok → link naar het spoor van het
roltype (M&A Expertise-case → best passende `/m-en-a-expertise/*`; Platform-case → `/platform`).
**Beeld:** één abstract architectuur-/structuurbeeld per case, consistent met het spoor. Geen
herleidbare details (logo's, plaatsnamen, bedragen tenzij vrijgegeven).

---

## 7. `/inzichten` + artikelen

| | |
|---|---|
| **Doel** | SEO + autoriteit voor beide sporen. Geen blog-om-de-blog; alleen stukken die een vraagstuk scherper maken. |
| **Primaire bezoeker** | Zoekverkeer op M&A-, DD-, integratie-, strategie- en "AI in M&A"-termen. |
| **Primaire CTA** | Contextueel per artikel (platform-artikel → bedrijfsscan/platform; Marcel-artikel → gesprek). |
| **Secundaire CTA** | Nieuwsbrief/volgen — **[NOG BESLISSEN: wil Marcel een nieuwsbrief?]** |

**Overzichtspagina:** kop → filter op categorie (M&A · Due diligence · Integratie · Strategie ·
AI in M&A) → artikelenlijst (kaart: titel, categorie, 1 zin, leestijd) → CTA-blok.
**Artikelsjabloon:** H1 → intro → body (H2/H3, pull quotes in "lijn van koers"-stijl) → "Over de
auteur" mini-blok (Marcel, → `/over-marcel`) → contextuele CTA → 2–3 gerelateerde artikelen.
**Start:** 1 artikel per categorie bij livegang is genoeg; dit spoor mag groeien.
**Beeld:** per artikel één beeld uit de bestaande beeldtaal; geen stockclichés.

---

## 8. `/contact`

| | |
|---|---|
| **Doel** | Drempelloos een gesprek laten aanvragen, met de juiste verwachting per spoor. |
| **Primaire bezoeker** | Iedereen die verder wil — platform-interesse of Marcel-vraagstuk. |
| **Primaire CTA** | Formulier verzenden ("Plan een gesprek"). |
| **Secundaire CTA** | Direct mailen/bellen: `marcel@bisschopsfinancing.nl` · `+31 6 38 68 98 88` · LinkedIn. |

**Secties:** kop ("Soms is één goed gesprek genoeg") → korte keuze "waar gaat het over?"
(platform / een transactie of vraagstuk / iets anders) → formulier (naam, e-mail, organisatie,
korte omschrijving; **geen** gevoelige velden) → direct-contactblok → verwachting (wat gebeurt er
na je bericht, binnen welke termijn) → voet.
**AVG:** formulier = persoonsgegevens → privacyverklaring-link bij de verzendknop; geen
tracking-cookies vóór toestemming. **Cookie-consent:** Marcel vroeg eerder "waar is mijn cookie-
consent" — meenemen in FASE 4/6: alleen nodig als er niet-essentiële cookies/tracking zijn;
zo niet, dan een korte cookieverklaring zonder banner. **[BESLISSEN: komt er analytics?]**
**Beeld:** geen, of één rustig sfeerbeeld.

---

## 9. `/inloggen`

Geen echte pagina — directe redirect (of tussenpagina met drie knoppen) naar
`app.koersvoormorgen.nl`: **Verkoper/koper-portaal** (`mna.html`), **Adviseursportaal**
(`adv.html`), **Beheer** (`marilyn.html`, alleen Marcel). Kleine tekstlink in de nav, niet in de
inhoudelijke IA.

---

## 10. Globale UX-afspraken (alle pagina's)

- **Eén primaire CTA per scherm** — nooit twee knoppen met gelijk gewicht naast elkaar, behalve
  bewust op de homepage-hero (de twee routes).
- **Sticky nav** met de "Plan een gesprek"-knop altijd zichtbaar.
- **Broodkruimels** op alle subpagina's van beide sporen.
- **Footer** identiek overal: merkblok · Platform-links (kolom) · M&A Expertise-links (kolom) ·
  Bedrijfsscan · Cases · Inzichten · Privacy · Voorwaarden · Inloggen · LinkedIn · e-mail ·
  telefoon. De twee sporen staan als **aparte kolommen** — visueel gelijkwaardig.
- **Toegankelijkheid:** contrast AA, focus-states zichtbaar, `prefers-reduced-motion`
  gerespecteerd, alt-teksten op alle beelden, semantische koppenhiërarchie.
- **Performance:** beelden als `webp`/`avif` met `width`/`height`, lazy-load onder de vouw, fonts
  met `font-display: swap`, geen externe scripts behalve (indien gekozen) privacy-vriendelijke
  analytics.
- **Desktop = mobiel:** elke sectie is één kolom die op desktop hooguit *verbreedt*, niet
  *herschikt*. Geen content die alleen op één breedte bestaat.

---

## 11. Wat FASE 4–6 hierna oppakt

- **FASE 4 — visueel systeem:** kleurtokens (nachtblauw/petrol/warm off-white + semantisch),
  typografie definitief (Newsreader/Source Serif 4 + Inter — FASE 2 §"FASE 4"), componenten
  (buttons, cards, pull quotes, case labels, breadcrumbs, bewijsstrip, procesvisualisatie), de
  "lijn van koers" technisch uitgewerkt, licht/donker-ritme per pagina vastgelegd.
- **FASE 5 — SEO & techniek:** definitieve URL's (deze sitemap; let op de rename `/senior-ma/` →
  `/m-en-a-expertise/`), `title`/`meta`/`H1` per pagina, schema (`Person` voor Marcel,
  `SoftwareApplication` voor het platform, `FAQ` waar zinvol), interne-linkmatrix,
  **redirectlijst** van elke huidige `.html` → nieuwe URL (1-op-1).
  **SEO wordt per propositie apart opgebouwd** (Marcel, 1 sep) — eerst zoekwoordonderzoek, dan
  definitieve termen:
  - *Platform (product):* M&A software · M&A platform · due diligence software · M&A workflow ·
    deal management · transaction management · M&A software voor adviseurs · virtual data room …
  - *M&A Expertise (Marcel):* M&A adviseur · senior M&A adviseur · overnamebegeleiding · due
    diligence begeleiding · post merger integration · PMI · value creation · M&A begeleiding …
  De twee clusters krijgen eigen landingspagina's, eigen `title`/`meta`, eigen interne linking.
  Bedrijfsscan heeft z'n eigen set (bedrijfsscan · strategische scan · bedrijfswaardering
  accountancy …).
- **FASE 6 — conversie:** per pagina primaire + secundaire CTA + microconversie (grotendeels al
  in dit document ingevuld — FASE 6 maakt het meetbaar), CTA-teksten per context, formulier- en
  bedanktflow, meet-/analytics-keuze + cookie-aanpak.

### Open beslissingen (Marcel)
- **Naam spoor 2:** akkoord met **"M&A Expertise"** (i.p.v. "Senior M&A")? Zie §0.3.
- **Hero-H1:** akkoord met optie A ("Betere beslissingen. Betere deals.")? Zie §0.4.
- **Model:** akkoord met "Doorzien → Beslissen → Realiseren" als NL-variant van See/Decide/Execute?
  Zie §0.5.
- Nieuwsbrief bij `/inzichten`: ja/nee.
- Analytics op de site: ja/nee (bepaalt of er een cookiebanner nodig is).
- Publieke prijzen op `/platform/voor-adviseurs`: ja/nee (zo ja → Voorwaarden-check, werkregel 17).
- Welke `voorwaarden`-versie is juridisch leidend (FASE 1 §1.10).
- ✅ Huisstijl/white-label-functie geverifieerd (1 sep) — bestaat en is live; `/platform/voor-adviseurs`
  mag "eigen huisstijl" tonen. Zie §2.5.
