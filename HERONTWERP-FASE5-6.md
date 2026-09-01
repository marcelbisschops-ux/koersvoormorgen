# Herontwerp Koers voor Morgen — FASE 5 (SEO & techniek) + FASE 6 (conversie)

Opgesteld 1 sep 2026. Bouwt voort op FASE 1–4 (alle akkoord). Dit zijn de laatste twee
specificatie-fases; daarna volgt de bouw.

Hosting = **GitHub Pages** op `koersvoormorgen.nl` (repo `marcelbisschops-ux/koersvoormorgen`,
branch `main`). Geen server-side redirects (`_redirects`/`.htaccess` werken hier niet) — redirects
gaan via kleine HTML-stubs (§5.3). GitHub Pages serveert `map/pagina.html` ook op
`/map/pagina` (schone URL's zonder `.html`).

---

# FASE 5 — SEO & techniek

## 5.1 Definitieve URL-structuur

Spoor 2 = `/m-en-a-expertise/` (FASE 3 §0.3). App-pagina's verhuizen naar
`app.koersvoormorgen.nl` (apart in te richten subdomein; tot dan blijven ze op de root werken en
wijzen de stubs daarheen).

| Pagina | URL | Bronbestand |
|---|---|---|
| Homepage | `/` | `index.html` |
| Platform — overzicht | `/platform` | `platform/index.html` |
| Platform — dataroom & fases | `/platform/dataroom-en-fases` | `platform/dataroom-en-fases.html` |
| Platform — AI-signalen | `/platform/ai-signalen` | `platform/ai-signalen.html` |
| Platform — beveiliging & gegevens | `/platform/beveiliging-en-gegevens` | `platform/beveiliging-en-gegevens.html` |
| Platform — voor adviseurs | `/platform/voor-adviseurs` | `platform/voor-adviseurs.html` |
| Platform — matching | `/platform/matching` | `platform/matching.html` |
| Bedrijfsscan (landing) | `/bedrijfsscan` | `bedrijfsscan.html` (landing herschreven; de tool blijft erachter) |
| M&A Expertise — overzicht | `/m-en-a-expertise` | `m-en-a-expertise/index.html` |
| — complexe transacties | `/m-en-a-expertise/complexe-transacties` | `m-en-a-expertise/complexe-transacties.html` |
| — due diligence-begeleiding | `/m-en-a-expertise/due-diligence-begeleiding` | `m-en-a-expertise/due-diligence-begeleiding.html` |
| — integratie & PMI | `/m-en-a-expertise/integratie-en-pmi` | `m-en-a-expertise/integratie-en-pmi.html` |
| — value creation | `/m-en-a-expertise/value-creation` | `m-en-a-expertise/value-creation.html` |
| — strategische vraagstukken | `/m-en-a-expertise/strategische-vraagstukken` | `m-en-a-expertise/strategische-vraagstukken.html` |
| — regie | `/m-en-a-expertise/regie` | `m-en-a-expertise/regie.html` |
| Over Marcel | `/over-marcel` | `over-marcel.html` |
| Cases — overzicht | `/cases` | `cases/index.html` |
| Case-detail (×3) | `/cases/{slug}` | `cases/{slug}.html` |
| Inzichten — overzicht | `/inzichten` | `inzichten/index.html` |
| Inzichten — artikel | `/inzichten/{slug}` | `inzichten/{slug}.html` |
| Contact | `/contact` | `contact.html` |
| Inloggen (doorverwijs) | `/inloggen` | `inloggen.html` → keuzescherm/redirect naar `app.koersvoormorgen.nl` |
| Privacyverklaring | `/privacy` | `privacy.html` (bestaand, opnieuw vormgegeven) |
| Voorwaarden | `/voorwaarden` | `voorwaarden.html` (leidende versie — **[Marcel: bevestigen welke]**) |
| 404 | `/404.html` | `404.html` (opnieuw vormgegeven) |

**Buiten scope van het herontwerp** (functioneel, eigen subdomein/plek): `mna.html`, `adv.html`,
`marilyn.html`, `viewer.html`, `registreer.html`, `handleiding.html`, `matching-platform.html`
(de tool zelf; de uitleg-pagina is `/platform/matching`), `hugo.html`/`verhuis.html`
(VerhuisScan — ander domein/los).

## 5.2 Slugs voor cases & eerste artikelen

**Cases** (FASE 2 §3, concept — Marcel bevestigt):
- `/cases/verkoop-accountantskantoor-opvolging`
- `/cases/post-merger-integratie`
- `/cases/portefeuille-deelnemingen`

**Inzichten — 1 artikel per categorie bij livegang** (FASE 3 §7):
- `/inzichten/due-diligence-die-verder-kijkt-dan-de-cijfers`
- `/inzichten/waarom-integraties-vastlopen`
- `/inzichten/strategie-herijken-voor-een-transactie`
- `/inzichten/wat-ai-wel-en-niet-doet-in-due-diligence`
- `/inzichten/een-overnametraject-als-een-dossier`

## 5.3 Redirect-aanpak (GitHub Pages)

Elke oude top-level `.html` wordt een **redirect-stub**: 200-byte HTML met

```html
<!doctype html><html lang="nl"><head><meta charset="utf-8">
<title>Verplaatst</title>
<link rel="canonical" href="https://koersvoormorgen.nl/NIEUWE-PAD">
<meta http-equiv="refresh" content="0; url=https://koersvoormorgen.nl/NIEUWE-PAD">
<meta name="robots" content="noindex,follow">
<script>location.replace("https://koersvoormorgen.nl/NIEUWE-PAD"+location.search+location.hash)</script>
</head><body>Deze pagina is verplaatst naar <a href="https://koersvoormorgen.nl/NIEUWE-PAD">koersvoormorgen.nl/NIEUWE-PAD</a>.</body></html>
```

`canonical` + `refresh` + JS `replace` samen — zo pikken zoekmachines de nieuwe URL op en gaat
er geen geschiedenis-vervuiling op. `noindex,follow` op de stub zelf.

## 5.4 Redirectlijst (oud → nieuw, 1-op-1)

| Oude URL | Nieuwe URL | Type |
|---|---|---|
| `/index.html` | `/` | canonical (geen stub nodig; homepage) |
| `/kantoorscan.html` | `/bedrijfsscan` | stub (bestaat al als redirect naar `bedrijfsscan.html`; doel bijwerken) |
| `/bedrijfsscan.html` | `/bedrijfsscan` | canonical (zelfde bestand, schone URL) |
| `/matching-platform.html` | `/platform/matching` | stub (uitlegpagina); de tool zelf blijft op `matching-platform.html` |
| `/lead-aandragen.html` | `/platform/matching` | stub (of eigen kleine pagina — **[Marcel: houden of opgaan in matching?]**) |
| `/mna.html` | `https://app.koersvoormorgen.nl/mna.html` | stub (tot subdomein er is: `/inloggen`) |
| `/adv.html` | `https://app.koersvoormorgen.nl/adv.html` | stub → `/inloggen` |
| `/marilyn.html` | `https://app.koersvoormorgen.nl/marilyn.html` | geen publieke stub (admin) |
| `/registreer.html` | `/platform/voor-adviseurs` | stub |
| `/handleiding.html` | achter login houden | geen publieke redirect |
| `/platformvoorwaarden.html` | `/voorwaarden` | stub (na consolidatie — **[Marcel: welke versie leidend]**) |
| `/testvoorwaarden.html` | `/voorwaarden` | stub (of verwijderen als niet meer gebruikt) |
| `/privacy.html` | `/privacy` | canonical |
| `/voorwaarden.html` | `/voorwaarden` | canonical |
| `/hugo.html`, `/verhuis.html` | ongewijzigd | buiten scope (VerhuisScan) |
| `/viewer.html` | ongewijzigd | functioneel (meekijker) |

## 5.5 Per pagina — `title`, `meta description`, `H1`

Titels: `{Pagina} — Koers voor Morgen` (merk achteraan; homepage andersom). Meta description
≤ 155 tekens, actief geformuleerd, met de kernterm vooraan.

| Pagina | `<title>` | Meta description | `H1` |
|---|---|---|---|
| `/` | Koers voor Morgen — M&A-platform en senior M&A-expertise | Een zelfstandig M&A-platform voor adviseurs en dealteams, en senior M&A-expertise voor complexe transacties. Van doorzien tot realiseren. | Betere beslissingen. Betere deals. |
| `/platform` | M&A-platform — één traject, één dossier — Koers voor Morgen | Voer overnametrajecten van voorbereiding tot closing in één omgeving. Documenten per DD-categorie, AI-signalen, Q&A, voortgang. Zelfstandig inzetbaar. | Eén traject. Eén dossier. Van voorbereiding tot closing. |
| `/platform/dataroom-en-fases` | Dataroom en fases — M&A-platform — Koers voor Morgen | Documenten gestructureerd per due-diligence-categorie en fase, met rol- en fase-toegang en volledige herleidbaarheid naar het brondocument. | Documenten die zichzelf ordenen — per fase, per rol. |
| `/platform/ai-signalen` | AI-signalen in due diligence — Koers voor Morgen | De AI signaleert ontbrekende documenten en afwijkingen tussen stukken. Ze vult niets in en doet geen aanname — de beoordeling blijft bij de adviseur. | AI die het dossier bewaakt. U beslist. |
| `/platform/beveiliging-en-gegevens` | Beveiliging en gegevens — M&A-platform — Koers voor Morgen | EU-opslag (Frankfurt, ISO 27001 / SOC 2), TLS, rol- en fase-toegang, 14-dagen-verwijdering, technisch afgedwongen scheiding tussen trajecten. | Zo gaan we om met uw transactiedata. |
| `/platform/voor-adviseurs` | Het platform voor uw eigen M&A-praktijk — Koers voor Morgen | Zet Koers voor Morgen zelfstandig in bij uw eigen klanten en transacties — eigen huisstijl, eigen regie, trajectlimiet en modules naar keuze. | Voor adviseurs die regie willen houden. |
| `/platform/matching` | Anonieme koper–verkoper-matching — Koers voor Morgen | Anoniem matchen op sector en regio, waarbij de adviseur de regie houdt. Geen open marktplaats, geen automatische deal. | Kopers vinden, zonder de etalage. |
| `/bedrijfsscan` | Gratis bedrijfsscan — weet of uw koers nog klopt | Een gratis strategische zelfanalyse met adviesrapport, voor accountancy, mkb, zorg en IT. ±15 minuten, direct resultaat. | Weet u of uw koers nog klopt? |
| `/m-en-a-expertise` | Senior M&A-expertise — Marcel Bisschops — Koers voor Morgen | Senior M&A-expertise voor complexe transacties, due diligence, integratie, value creation, strategie en regie. Ruim 30 jaar, 20+ deals. | Ervaring die telt wanneer het ingewikkeld wordt. |
| `…/complexe-transacties` | Begeleiding bij complexe overnames — Koers voor Morgen | Senior begeleiding bij transacties waar de belangen, complexiteit of stakes hoog zijn — van strategie en onderhandeling tot closing. | Een transactie die te veel raakt om aan het toeval over te laten. |
| `…/due-diligence-begeleiding` | Due diligence-begeleiding — Koers voor Morgen | Financiële, commerciële, operationele, IT-, organisatorische en strategische due diligence, verbonden tot één beeld van de deal. | Weet wat u koopt — en wat het straks waard is. |
| `…/integratie-en-pmi` | Post-merger integratie (PMI) — Koers voor Morgen | Regie op de integratie na de deal: operating model, leiderschap, systemen en een ritme waarin de synergie ook echt gerealiseerd wordt. | De deal is rond. Nu begint het werk dat de waarde moet realiseren. |
| `…/value-creation` | Waardecreatie na de transactie — Koers voor Morgen | Van transactie naar rendement: de keuzes en de uitvoering die een overname daadwerkelijk waardevol maken. | De transactie is gedaan. Het rendement moet nog komen. |
| `…/strategische-vraagstukken` | Strategische vraagstukken rond een transactie — Koers voor Morgen | Wanneer de strategie niet meer het hele antwoord geeft en er een transactie speelt: het vraagstuk terugbrengen tot de essentie en de keuzes scherp maken. | Uw strategie geeft niet meer het hele antwoord — en er speelt een transactie. |
| `…/regie` | Regie op een complex transactietraject — Koers voor Morgen | Eén ervaren hand op het stuur in een traject met veel partijen, veel belangen en weinig ruimte voor fouten. | Veel partijen, veel belangen, weinig ruimte voor fouten. |
| `/over-marcel` | Over Marcel Bisschops — senior M&A-professional | Ruim 30 jaar op het snijvlak van strategie, bestuur, transactie en uitvoering. COO, voorzitter RvB, toezichthouder, 20+ fusies en overnames. | Ervaring die telt wanneer het ingewikkeld wordt. |
| `/cases` | Cases — Koers voor Morgen | Geanonimiseerde trajecten die het patroon laten zien: van complexiteit naar koers, van besluit naar beweging. Ervaring, geen beloften. | Ervaring, geen beloften. |
| `/inzichten` | Inzichten over M&A, due diligence en integratie — Koers voor Morgen | Stukken die een vraagstuk scherper maken — over M&A, due diligence, integratie, strategie en AI in M&A. | Inzichten. |
| `/contact` | Contact — plan een gesprek — Koers voor Morgen | Plan een gesprek over het platform of over een transactie of vraagstuk. marcel@bisschopsfinancing.nl · +31 6 38 68 98 88. | Soms is één goed gesprek genoeg. |

Binnenpagina's: één `H1`, daarna `H2` per sectie in de volgorde uit FASE 3. Nooit twee `H1`.

## 5.6 Schema.org (JSON-LD)

| Waar | Type | Kernvelden |
|---|---|---|
| Alle pagina's | `WebSite` + `Organization` | naam "Koers voor Morgen", `url`, `logo`, `Organization.parentOrganization` = Bisschops Financing B.V., `sameAs` = LinkedIn |
| Alle binnenpagina's | `BreadcrumbList` | volgt de broodkruimel uit FASE 3 |
| `/` en `/platform*` | `SoftwareApplication` | naam "Koers voor Morgen Platform", `applicationCategory` "BusinessApplication", `operatingSystem` "Web", `offers` (bedrijfsscan gratis; adviseursmodel op aanvraag) — **geen verzonnen reviews/ratings** |
| `/over-marcel`, `/m-en-a-expertise*` | `Person` | naam "Marcel Bisschops", `jobTitle` "Senior M&A-professional", `worksFor` Bisschops Financing B.V., `alumniOf` Rijksuniversiteit Leiden, `knowsAbout` (M&A, due diligence, PMI, value creation, governance), `sameAs` LinkedIn |
| `/m-en-a-expertise*` | `Service` | `serviceType` per pagina (bijv. "Post-merger integration"), `provider` = de `Person`, `areaServed` "NL" |
| `/inzichten/{slug}` | `Article` | `headline`, `author` = de `Person`, `datePublished`, `about` |
| Pagina's met een echte veelgestelde-vraag-sectie | `FAQPage` | alleen als de vragen letterlijk op de pagina staan |

Nooit `AggregateRating`, `Review` of cijfers die niet op de pagina staan en niet echt zijn
(werkregel 8/14).

## 5.7 Zoekwoorden per propositie — richtingen, nog te valideren

Marcel: doe zoekwoordonderzoek (volume + concurrentie) vóór definitieve keuze. Hieronder de
intentie-clusters + het beoogde doelzoekwoord per pagina.

**Platform (product-intentie):**
`M&A software` · `due diligence software` · `M&A platform` · `deal management software` ·
`virtual data room M&A` · `M&A workflow` · `overname software adviseur` · `transaction management`.
Doel per pagina: `/platform` → "M&A software / M&A platform"; `/platform/dataroom-en-fases` →
"due diligence dataroom"; `/platform/ai-signalen` → "AI due diligence"; `/platform/voor-adviseurs`
→ "M&A software voor adviseurs".

**M&A Expertise (dienst-intentie, Marcel):**
`M&A adviseur` · `senior M&A adviseur` · `overnamebegeleiding` · `due diligence begeleiding` ·
`post merger integration` / `PMI adviseur` · `value creation M&A` · `strategisch advies overname` ·
`bedrijfsovername begeleiding`. Doel per pagina = de subpagina-titel.

**Bedrijfsscan (informatie → lead):**
`bedrijfsscan` · `strategische scan bedrijf` · `bedrijfswaardering accountantskantoor` ·
`overname accountantskantoor` · `verkoop accountantskantoor`.

De twee sporen krijgen **eigen** landingspagina's, eigen `title`/`meta` en eigen interne linking —
geen gedeelde pagina die beide probeert te ranken.

## 5.8 Interne-linkmatrix (kern)

| Van | Naar (contextueel, in de tekst) |
|---|---|
| `/` hero-routekaarten | `/platform` · `/m-en-a-expertise` |
| `/` model-sectie | `/platform` (Doorzien) · `/m-en-a-expertise` (Beslissen/Realiseren) |
| `/` bewijs | `/cases` · `/over-marcel` |
| `/` bedrijfsscan-sectie | `/bedrijfsscan` |
| `/platform` | alle `/platform/*` · `/bedrijfsscan` · 1× optioneel `/m-en-a-expertise` (verdieping) |
| `/platform/*` voet | `/bedrijfsscan` (primair) · `/platform/voor-adviseurs` · `/inloggen` |
| `/bedrijfsscan` "en daarna" | `/platform` · `/m-en-a-expertise` · `/contact` |
| `/m-en-a-expertise` | de 6 subpagina's · `/over-marcel` · `/cases` · 1× optioneel `/platform` (gereedschap) |
| elke `/m-en-a-expertise/{sub}` | 2 verwante subpagina's + 1 relevante case (FASE 3 §4.2-tabel) |
| `/over-marcel` | `/cases` · elke `/m-en-a-expertise/*` · klein blok → `/platform` |
| `/cases/{slug}` | het spoor van het roltype (Platform → `/platform`; M&A Expertise → best passende subpagina) |
| `/inzichten/{slug}` | "over de auteur" → `/over-marcel` · contextuele CTA · 2–3 verwante artikelen |
| footer (overal) | alle hoofdpagina's, met Platform en M&A Expertise als aparte kolommen |

Regels (FASE 3 §0.9): platform → M&A Expertise alleen als niet-prominente verdieping; M&A
Expertise → platform alleen als optioneel gereedschap.

## 5.9 Techniek-checklist

- `sitemap.xml` in de root met alle indexeerbare URL's (geen stubs, geen app-pagina's);
  `robots.txt` verwijst ernaar en staat `Disallow: /mna.html /adv.html /marilyn.html /viewer.html`.
- `<link rel="canonical">` op elke pagina naar de schone URL.
- `<html lang="nl">`. Eén taal → geen `hreflang` nodig.
- Open Graph + Twitter Card per pagina: `og:title` = H1, `og:description` = meta description,
  `og:image` = het hero-beeld van die pagina (1200×630 uitsnede), `og:type` = `website`
  (`article` voor inzichten).
- Prestatie (FASE 4 §8): `webp`/`avif`, `width`/`height`, `loading="lazy"`, `font-display:swap`,
  geen render-blokkerende externe scripts.
- 404: de nieuw vormgegeven `/404.html` met links naar de twee sporen + zoek/contact.

---

# FASE 6 — conversie

## 6.1 CTA-architectuur per pagina

Eén primaire CTA per scherm (FASE 3 §10), behalve de homepage-hero (twee gelijkwaardige routes).
"Microconversie" = de kleine stap die telt als vooruitgang, ook zonder gesprek.

| Pagina | Primaire CTA | Secundaire CTA | Microconversie (meetbaar event) |
|---|---|---|---|
| `/` | Routekaart → `/platform` · Routekaart → `/m-en-a-expertise` | Nav: "Plan een gesprek"; eind-CTA "Plan een gesprek" | `route_click` (welke kaart), scroll-diepte ≥ 50%, `cta_plan_gesprek_view` |
| `/platform` (+ subs) | "Start gratis met de bedrijfsscan" | "Word adviseur op het platform"; "Inloggen" | `scan_start_click`, `adviseur_interesse_click`, doorklik naar een subpagina |
| `/bedrijfsscan` | "Start de gratis bedrijfsscan" | "Bespreek de uitkomst met Marcel" (prominent ná het rapport) | `scan_sector_gekozen`, `scan_vraag_1_beantwoord`, `scan_afgerond`, `scan_rapport_gedownload` |
| `/m-en-a-expertise` (+ subs) | "Plan een gesprek" / per sub de contextuele variant (§6.2) | "Over Marcel"; "Bekijk cases" | `contact_intent_click`, doorklik naar case of subpagina, telefoon-/mailto-klik |
| `/over-marcel` | "Plan een gesprek" | "Bekijk cases" | `mailto_click`, `tel_click`, doorklik naar een subpagina |
| `/cases` (+ detail) | "Plan een gesprek" | Doorklik naar losse case / naar het spoor | case-detail geopend, CTA-klik |
| `/inzichten/{slug}` | contextueel (platform-artikel → scan/platform; Marcel-artikel → gesprek) | verwant artikel | leesdiepte ≥ 75%, CTA-klik, doorklik verwant artikel |
| `/contact` | Formulier verzenden ("Plan een gesprek") | `mailto:` · `tel:` · LinkedIn | `contact_form_start`, `contact_form_submit`, `mailto_click`, `tel_click` |

## 6.2 Contextuele CTA-teksten

| Context | Primaire CTA-tekst |
|---|---|
| Homepage | Plan een gesprek |
| Platform-spoor | Start gratis met de bedrijfsscan · Bekijk het platform |
| Adviseursmodel | Vraag toegang aan |
| Bedrijfsscan | Start de gratis bedrijfsscan |
| M&A — complexe transacties / DD / value creation | Bespreek uw transactie |
| M&A — integratie & PMI | Bespreek de integratie |
| M&A — strategische vraagstukken | Bespreek uw strategische vraagstuk |
| M&A — regie | Bespreek het traject |
| Over Marcel / Cases | Plan een gesprek |
| Inzichten (Marcel-spoor) | Leg uw vraagstuk voor |

Knopstijl: primair = petrol-vulling (FASE 4 §4.1). Nooit twee even zware knoppen naast elkaar
behalve de hero-routekaarten.

## 6.3 Contactformulier + bedankt-flow

**Formulier** (`/contact`, FASE 3 §8): velden **naam · e-mailadres · organisatie (optioneel) ·
"Waar gaat het over?" (keuze: Het platform / Een transactie of vraagstuk / Iets anders) ·
bericht**. Geen telefoonveld verplicht, geen gevoelige velden. Labels boven het veld (bestaande
harde regel: geen placeholder-als-label). Privacyverklaring-link direct bij de verzendknop; geen
tracking-cookies vóór toestemming.

**Verwerking:** het formulier POST't naar
`https://kantoorinzicht.marcel-bisschops.workers.dev/contact` (**endpoint nog te bouwen in de
backend-repo**): valideren, honeypot-veld `website` controleren, **rate-limiting** (werkregel 15),
e-mail naar `marcel@bisschopsfinancing.nl` met het onderwerp uit de keuzevraag, bevestigingsmail
naar de inzender met homepage-verwijzing, en bij een gewone (non-JS) POST een redirect naar
`/contact-verzonden`. De pagina heeft progressive-enhancement-JS: `fetch`-POST met inline
succes-/foutmelding, val terug op de normale POST als `fetch` ontbreekt. Geen CAPTCHA.
Bedankt-pagina = `contact-verzonden.html` (`noindex`).

**Bedankt-pagina** `/contact/verzonden` (`noindex`): "Bericht ontvangen. Marcel reageert
doorgaans binnen één werkdag." + terug naar de homepage + 1 relevante link (naar het spoor waar
de bezoeker vandaan kwam, meegегeven als querystring). Telt als `contact_form_submit`.

## 6.4 Meten — analytics & cookies

**Beslissing nodig (Marcel):** wel/geen analytics.
**Aanbeveling:** privacy-vriendelijke, cookieloze telling (server-side of een script als Plausible/
Umami, self-hosted of EU). Dan is er **geen cookiebanner** nodig — alleen een korte alinea in de
privacyverklaring. Dit past bij de rest van het compliance-verhaal (EU-opslag, dataminimalisatie)
en voorkomt de banner-frictie die Marcel eerder signaleerde ("waar is mijn cookie-consent" — het
antwoord wordt dan: die is er bewust niet, omdat er niets te consenten valt).
Als Marcel tóch Google Analytics/Ads-tracking wil: dan een echte consent-banner (privacy-eerst,
niet-essentieel standaard uit) + de privacyverklaring en Voorwaarden uitbreiden (werkregel 17).

**Events die hoe dan ook nuttig zijn** (ook cookieloos te tellen als pageview-achtige hits):
`route_click`, `scan_start_click`, `scan_afgerond`, `contact_form_submit`, `mailto_click`,
`tel_click`, `adviseur_interesse_click`.

## 6.5 KPI per spoor

| Spoor | Hoofd-KPI | Ondersteunend |
|---|---|---|
| Platform | scans gestart / afgerond; adviseur-interesse-klikken | doorklik homepage → `/platform`, tijd op subpagina's |
| M&A Expertise | gesprek-aanvragen (formulier + mailto + tel) | doorklik homepage → `/m-en-a-expertise`, case-detail-weergaven |
| Merk | terugkerend verkeer, directe verkeer op merknaam, LinkedIn-verwijzingen | scroll-diepte homepage, `/inzichten`-leesdiepte |

---

## Beslissingen (Claude, 1 sep — "kies jij en ga door")

1. **Voorwaarden leidend = `voorwaarden.html` → `/voorwaarden`.** Alleen `voorwaarden.html` +
   `privacy.html` worden opnieuw vormgegeven (geen inhoudelijke wijziging — werkregel 11d).
   `platformvoorwaarden.html` en `testvoorwaarden.html` blijven voorlopig ongemoeid; consolidatie
   (stub → `/voorwaarden`) pas ná Marcels expliciete akkoord, want dat verandert wat een gebruiker
   juridisch te zien krijgt.
2. **`lead-aandragen.html` blijft een eigen functionele pagina.** `/platform/matching` linkt
   ernaar. Niet in de kern-bouw; later visueel meenemen.
3. **Analytics: cookieloos, geen banner — voorlopig zelfs helemaal geen tracker.** De site gaat
   live zonder analytics-script; Marcel kan later een EU/cookieloze teller (Plausible/Umami)
   toevoegen. Privacyverklaring krijgt één zin: "deze site plaatst geen tracking-cookies". Geen
   juridische uitbreiding nodig.
4. **Nieuwsbrief bij `/inzichten`: nee, niet nu.** Voorkomt een double-opt-in-flow en een extra
   verwerking (werkregel 17). `/inzichten` start met 1 artikel per categorie, geen inschrijfblok.
5. **`app.koersvoormorgen.nl`: later.** `/inloggen` wordt nu een klein keuzescherm dat naar de
   huidige `mna.html` / `adv.html` op hetzelfde domein wijst; app-stubs (`/mna.html` e.d.) →
   `/inloggen`. Zodra het subdomein er is, hoeft alleen `/inloggen` aangepast te worden.
6. **Casetitels/slugs: de voorstellen uit §5.2 aangehouden.** Slugs zijn vóór livegang goedkoop
   te wijzigen; Marcel bepaalt de definitieve titels bij het invullen van de case-resultaten.

## Bouw-opzet (Claude, 1 sep)

Het herontwerp wordt gebouwd in een **aparte map `herontwerp/`** in de repo, zodat de live site
onaangeroerd blijft tijdens het bouwen (previewbaar op `koersvoormorgen.nl/herontwerp/` na push).
Bij akkoord op het geheel wordt de inhoud naar de root verplaatst en worden de redirect-stubs
geplaatst. Gedeelde stijl + gedrag: `herontwerp/assets/kvm.css` + `herontwerp/assets/kvm.js`.
Nav en footer worden per pagina herhaald (statische site, geen includes) — bewust, voor SEO en
werking zonder JS.

## Bouwstatus (1 sep 2026) — COMPLEET in `herontwerp/`

Alle 31 pagina's gebouwd. De live site is niet aangeraakt; alles staat in `herontwerp/`,
previewbaar op `koersvoormorgen.nl/herontwerp/` zodra dat gepusht is. Bron: `herontwerp/_src/*`
(alleen `<main>`-inhoud) + `herontwerp/build.py` (nav/footer/`<head>`/JSON-LD centraal) →
`python3 herontwerp/build.py` genereert alle HTML + `sitemap.xml` + `robots.txt`.

| Blok | Pagina's | Status |
|---|---|---|
| Fundament | `assets/kvm.css`, `assets/kvm.js`, 6 hero-beelden + 6 OG-beelden (1200×630) | ✅ |
| Homepage | `index.html` | ✅ |
| Platform | overzicht + dataroom-en-fases · ai-signalen · beveiliging-en-gegevens · voor-adviseurs · matching | ✅ (6) |
| Bedrijfsscan | `bedrijfsscan.html` (landing; scan-tool-CTA → huidige live tool) | ✅ |
| M&A Expertise | overzicht + complexe-transacties · due-diligence-begeleiding · integratie-en-pmi · value-creation · strategische-vraagstukken · regie | ✅ (7) |
| Over Marcel + Cases | `over-marcel.html` · `cases/` + 3 details (illustratief, gemarkeerd) | ✅ (5) |
| Inzichten | overzicht + 3 artikelen (concept, gemarkeerd) | ✅ (4) |
| Contact e.a. | `contact.html` + `contact-verzonden.html` (noindex) · `inloggen.html` · `404.html` (noindex) | ✅ (4) |
| Juridisch | `privacy.html` + `voorwaarden.html` — **alleen omlijsting vernieuwd; prozatekst byte-identiek geverifieerd** | ✅ |
| Techniek | `sitemap.xml` (28 URL's) · `robots.txt` · redirect-stubs `kantoorscan.html` → `/bedrijfsscan`, `registreer.html` → `/platform/voor-adviseurs` | ✅ |

### Nog te doen vóór livegang (Marcel / aparte stappen)
1. **Alles end-to-end doorlopen** op `/herontwerp/` en akkoord geven.
2. ✅ **Contact-endpoint** `POST /contact` gebouwd + gedeployd (staging + productie, 1 sep). In
   `backend/worker/06-scantool.js`: honeypot, rate-limit (best-effort, zoals de rest van de
   worker), validatie, opslag in `contact_berichten`, mail naar Marcel + bevestiging naar de
   inzender, JSON `{ok:true}` of 303 → `/contact-verzonden`. Plus `GET /admin/contact` (admin-key)
   en `DELETE FROM contact_berichten` in `/avg/verwijder`. Rest-net: tabel eventueel naar
   `initDB()` + bewaartermijn in `avgBewaartermijnOpruimen`.
3. **Case-resultaten** verifiëren of vervangen door echte geanonimiseerde trajecten (nu illustratief).
4. ✅ **Realistische productscreenshot** (`assets/img/platform-dashboard.jpg` + OG-versie) —
   gebouwd op de échte `mna.html`-code: kleurenset, Playfair/Plex, `fase-grid` met de 7
   accountancy-fases, AI-afwijkingssignaal, entiteit-kiezer, echte veldlabels. Fictief traject
   "Praktijk Van der Meer & Co".
5. **Inzichten-artikelen** definitief maken (nu concept).
6. **Legal diff** zelf nalopen ter bevestiging dat privacy/voorwaarden inhoudelijk ongewijzigd zijn.

### De swap naar de root (als alles akkoord is)
- Verplaats de inhoud van `herontwerp/` naar de repo-root (behoud `_src/` + `build.py` op een
  logische plek; `assets/` en alle HTML naar root). De bestaande `mna.html`, `adv.html`,
  `marilyn.html`, `viewer.html`, `matching-platform.html`, `hugo.html`, `verhuis.html`,
  `lead-aandragen.html`, `handleiding.html`, `platformvoorwaarden.html`, `testvoorwaarden.html`
  blijven staan (functioneel / bewust ongemoeid).
- `index.html`, `bedrijfsscan.html`, `privacy.html`, `voorwaarden.html`, `kantoorscan.html`,
  `404.html` worden overschreven door de nieuwe versies.
- Push naar `main`; GitHub Pages publiceert. Hard-refresh (Cmd+Shift+R).
