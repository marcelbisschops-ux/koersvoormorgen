#!/usr/bin/env python3
"""
Bouwt alle pagina's van het herontwerp uit één sjabloon + losse main-content
in _src/. Zo staan nav, footer en <head> op één plek (geen copy-paste-drift).

Gebruik:  python3 build.py           # bouwt alles
Elke _src/*.html bevat alleen de <main>-inhoud en gebruikt {{ROOT}} als
relatief pad naar de site-root ("" op de root, "../" een niveau diep, enz.).
"""
import pathlib, re

HERE = pathlib.Path(__file__).parent
SRC  = HERE / "_src"

NAV_ITEMS = [
    ("{{ROOT}}platform/", "Platform"),
    ("{{ROOT}}m-en-a-expertise/", "M&amp;A Expertise"),
    ("{{ROOT}}bedrijfsscan.html", "Bedrijfsscan"),
    ("{{ROOT}}cases/", "Cases"),
    ("{{ROOT}}inzichten/", "Inzichten"),
]

def nav():
    links = "\n      ".join(
        f'<a href="{href}">{label}</a>' for href, label in NAV_ITEMS
    )
    return f"""<header class="nav">
  <div class="nav__in">
    <a class="nav__brand" href="{{{{ROOT}}}}">Koers voor <b>Morgen</b></a>
    <button class="nav__toggle" aria-label="Menu" aria-expanded="false">&#9776;</button>
    <nav class="nav__links" aria-label="Hoofdnavigatie">
      {links}
      <a class="nav__cta" href="{{{{ROOT}}}}contact.html">Plan een gesprek</a>
      <a class="nav__login" href="{{{{ROOT}}}}inloggen.html">Inloggen</a>
    </nav>
  </div>
</header>

<div class="spine" aria-hidden="true"></div>"""

def foot():
    return """<footer class="foot">
  <div class="foot__grid">
    <div class="foot__brand"><b>Koers voor Morgen</b>Van complexiteit naar koers, van besluit naar beweging. Een initiatief van Bisschops Financing B.V.</div>
    <div><h4>Platform</h4><ul>
      <li><a href="{{ROOT}}platform/">Overzicht</a></li>
      <li><a href="{{ROOT}}platform/dataroom-en-fases.html">Dataroom &amp; fases</a></li>
      <li><a href="{{ROOT}}platform/ai-signalen.html">AI-signalen</a></li>
      <li><a href="{{ROOT}}platform/beveiliging-en-gegevens.html">Beveiliging &amp; gegevens</a></li>
      <li><a href="{{ROOT}}platform/voor-adviseurs.html">Voor adviseurs</a></li>
      <li><a href="{{ROOT}}platform/matching.html">Matching <span style="color:var(--muted-d)">(b&#232;ta)</span></a></li>
    </ul></div>
    <div><h4>M&amp;A Expertise</h4><ul>
      <li><a href="{{ROOT}}m-en-a-expertise/">Overzicht</a></li>
      <li><a href="{{ROOT}}m-en-a-expertise/complexe-transacties.html">Complexe transacties</a></li>
      <li><a href="{{ROOT}}m-en-a-expertise/due-diligence-begeleiding.html">Due diligence</a></li>
      <li><a href="{{ROOT}}m-en-a-expertise/integratie-en-pmi.html">Integratie &amp; PMI</a></li>
      <li><a href="{{ROOT}}m-en-a-expertise/regie.html">Regie</a></li>
    </ul></div>
    <div><h4>Meer</h4><ul>
      <li><a href="{{ROOT}}bedrijfsscan.html">Bedrijfsscan</a></li>
      <li><a href="{{ROOT}}cases/">Cases</a></li>
      <li><a href="{{ROOT}}inzichten/">Inzichten</a></li>
      <li><a href="{{ROOT}}contact.html">Contact</a></li>
      <li><a href="{{ROOT}}inloggen.html">Inloggen</a></li>
    </ul></div>
  </div>
  <div class="foot__legal">
    <span>&copy; 2026 Bisschops Financing B.V.</span>
    <a href="{{ROOT}}privacy.html">Privacyverklaring</a>
    <a href="{{ROOT}}voorwaarden.html">Voorwaarden</a>
    <a href="https://www.linkedin.com/in/marcelbisschops">LinkedIn</a>
    <a href="mailto:marcel@bisschopsfinancing.nl">marcel@bisschopsfinancing.nl</a>
    <a href="tel:+31638689888">+31 6 38 68 98 88</a>
  </div>
</footer>"""

SKELETON = """<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">{robots}
<meta property="og:type" content="{ogtype}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://koersvoormorgen.nl/assets/og/{ogimg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="{{{{ROOT}}}}assets/kvm.css">
{ld}
</head>
<body>

{nav}

<main>
{main}
</main>

{foot}

<script src="{{{{ROOT}}}}assets/kvm.js"></script>
</body>
</html>
"""

# ---- pagina-configuratie -------------------------------------------------
# (bestandspad, diepte, <title>, meta-description, canonical-pad, og:image, og:type, extra JSON-LD-graph-items)
PAGES = [
    ("index.html", 0,
     "Koers voor Morgen, M&amp;A-platform en M&amp;A Expertise",
     "Een zelfstandig M&amp;A-platform voor adviseurs en dealteams, en senior M&amp;A-ervaring voor complexe transacties. Van doorzien tot realiseren.",
     "https://koersvoormorgen.nl/", "hero-weg.jpg", "website", "home"),

    ("platform/index.html", 1,
     "M&amp;A-platform · één traject, één dossier · Koers voor Morgen",
     "Voer overnametrajecten van voorbereiding tot closing in één omgeving. Documenten per DD-categorie, AI-signalen, Q&amp;A, voortgang. Zelfstandig inzetbaar.",
     "https://koersvoormorgen.nl/platform", "platform-dashboard.jpg", "website", "platform"),

    ("platform/dataroom-en-fases.html", 1,
     "Dataroom en fases · M&amp;A-platform · Koers voor Morgen",
     "Documenten gestructureerd per due-diligence-categorie en fase, met rol- en fase-toegang en volledige herleidbaarheid naar het brondocument.",
     "https://koersvoormorgen.nl/platform/dataroom-en-fases", "platform-dashboard.jpg", "website", "platform-sub"),

    ("platform/ai-signalen.html", 1,
     "AI-signalen in due diligence · Koers voor Morgen",
     "De AI signaleert ontbrekende documenten en afwijkingen tussen stukken. Ze vult niets in en doet geen aanname, de beoordeling blijft bij de adviseur.",
     "https://koersvoormorgen.nl/platform/ai-signalen", "platform-dashboard.jpg", "website", "platform-sub"),

    ("platform/beveiliging-en-gegevens.html", 1,
     "Beveiliging en gegevens · M&amp;A-platform · Koers voor Morgen",
     "EU-opslag (Frankfurt, ISO 27001 / SOC 2), TLS, rol- en fase-toegang, 14-dagen-verwijdering, technisch afgedwongen scheiding tussen trajecten.",
     "https://koersvoormorgen.nl/platform/beveiliging-en-gegevens", "platform-dashboard.jpg", "website", "platform-sub"),

    ("platform/voor-adviseurs.html", 1,
     "Het platform voor uw eigen M&amp;A-praktijk · Koers voor Morgen",
     "Zet Koers voor Morgen zelfstandig in bij uw eigen klanten en transacties, eigen huisstijl, eigen regie, trajectlimiet en modules naar keuze.",
     "https://koersvoormorgen.nl/platform/voor-adviseurs", "platform-dashboard.jpg", "website", "platform-sub"),

    ("platform/matching.html", 1,
     "Anonieme koper–verkoper-matching · Koers voor Morgen",
     "Anoniem matchen op sector en regio, waarbij de adviseur de regie houdt. Geen open marktplaats, geen automatische deal.",
     "https://koersvoormorgen.nl/platform/matching", "bedrijfsscan-polder.jpg", "website", "platform-sub"),

    ("proefaccount.html", 0,
     "Proefaccount aanvragen · Koers voor Morgen Platform",
     "Vraag een proefaccount aan voor het M&amp;A-platform: één traject, dertig dagen, na goedkeuring door Bisschops Financing. Geen demo vooraf nodig.",
     "https://koersvoormorgen.nl/proefaccount", "platform-dashboard.jpg", "website", "simple|Proefaccount"),

    ("bedrijfsscan.html", 0,
     "Gratis bedrijfsscan, weet of uw koers nog klopt",
     "Een gratis strategische zelfanalyse met adviesrapport, voor accountancy, mkb, zorg en IT. ±15 minuten, direct resultaat.",
     "https://koersvoormorgen.nl/bedrijfsscan", "bedrijfsscan-polder.jpg", "website", "bedrijfsscan"),

    ("m-en-a-expertise/index.html", 1,
     "M&amp;A Expertise · Marcel Bisschops · Koers voor Morgen",
     "Senior M&amp;A-ervaring voor complexe transacties, due diligence, integratie, value creation, strategie en regie. Ruim 30 jaar, 20+ deals koop- én verkoopzijde.",
     "https://koersvoormorgen.nl/m-en-a-expertise", "expertise-oversteek.jpg", "website", "ma"),

    ("m-en-a-expertise/complexe-transacties.html", 1,
     "Begeleiding bij complexe overnames · Koers voor Morgen",
     "Senior begeleiding bij transacties waar de belangen, complexiteit of stakes hoog zijn, van strategie en onderhandeling tot closing.",
     "https://koersvoormorgen.nl/m-en-a-expertise/complexe-transacties", "expertise-staal.jpg", "website", "ma-sub|Complexe transacties"),

    ("m-en-a-expertise/due-diligence-begeleiding.html", 1,
     "Due diligence-begeleiding · Koers voor Morgen",
     "Financiële, commerciële, operationele, IT-, organisatorische en strategische due diligence, verbonden tot één beeld van de deal.",
     "https://koersvoormorgen.nl/m-en-a-expertise/due-diligence-begeleiding", "expertise-staal.jpg", "website", "ma-sub|Due diligence-begeleiding"),

    ("m-en-a-expertise/integratie-en-pmi.html", 1,
     "Post-merger integratie (PMI) · Koers voor Morgen",
     "Regie op de integratie na de deal: operating model, leiderschap, systemen en een ritme waarin de synergie ook echt gerealiseerd wordt.",
     "https://koersvoormorgen.nl/m-en-a-expertise/integratie-en-pmi", "expertise-oversteek.jpg", "website", "ma-sub|Integratie en PMI"),

    ("m-en-a-expertise/value-creation.html", 1,
     "Waardecreatie na de transactie · Koers voor Morgen",
     "Van transactie naar rendement: de keuzes en de uitvoering die een overname daadwerkelijk waardevol maken.",
     "https://koersvoormorgen.nl/m-en-a-expertise/value-creation", "expertise-staal.jpg", "website", "ma-sub|Value creation"),

    ("m-en-a-expertise/strategische-vraagstukken.html", 1,
     "Strategische vraagstukken rond een transactie · Koers voor Morgen",
     "Wanneer de strategie niet meer het hele antwoord geeft en er een transactie speelt: het vraagstuk terugbrengen tot de essentie en de keuzes scherp maken.",
     "https://koersvoormorgen.nl/m-en-a-expertise/strategische-vraagstukken", "expertise-staal.jpg", "website", "ma-sub|Strategische vraagstukken"),

    ("m-en-a-expertise/regie.html", 1,
     "Regie op een complex transactietraject · Koers voor Morgen",
     "Eén ervaren hand op het stuur in een traject met veel partijen, veel belangen en weinig ruimte voor fouten.",
     "https://koersvoormorgen.nl/m-en-a-expertise/regie", "expertise-oversteek.jpg", "website", "ma-sub|Regie"),

    ("over-marcel.html", 0,
     "Over Marcel Bisschops, M&amp;A, bestuur en transacties",
     "Ruim 30 jaar op het snijvlak van strategie, bestuur, transactie en uitvoering. COO, voorzitter RvB, toezichthouder, 20+ fusies en overnames.",
     "https://koersvoormorgen.nl/over-marcel", "marcel-portret.jpg", "profile", "over-marcel"),

    ("cases/index.html", 1,
     "Cases · Koers voor Morgen",
     "Geanonimiseerde M&amp;A-trajecten met situatie, rol, interventie en resultaat. Ervaring, geen beloften.",
     "https://koersvoormorgen.nl/cases", "expertise-staal.jpg", "website", "cases"),

    ("cases/verkoop-accountantskantoor-opvolging.html", 1,
     "Case: verkoop accountantskantoor met opvolgingsvraag · Koers voor Morgen",
     "Twee vertrekkende partners, geen interne opvolging, een gestructureerd verkooptraject zonder het kantoor te destabiliseren.",
     "https://koersvoormorgen.nl/cases/verkoop-accountantskantoor-opvolging", "expertise-staal.jpg", "article", "case|Verkoop accountantskantoor"),

    ("cases/post-merger-integratie.html", 1,
     "Case: post-merger integratie die niet op gang kwam · Koers voor Morgen",
     "Zes maanden na de deal nog twee losse bedrijven, binnen een kwartaal één operating model en één managementteam.",
     "https://koersvoormorgen.nl/cases/post-merger-integratie", "expertise-oversteek.jpg", "article", "case|Post-merger integratie"),

    ("cases/portefeuille-deelnemingen.html", 1,
     "Case: portefeuille van deelnemingen zonder grip · Koers voor Morgen",
     "Governance en financiële sturing hersteld; de portefeuille geherstructureerd richting externe groeifinanciering.",
     "https://koersvoormorgen.nl/cases/portefeuille-deelnemingen", "expertise-staal.jpg", "article", "case|Portefeuille van deelnemingen"),

    ("contact.html", 0,
     "Contact · plan een gesprek · Koers voor Morgen",
     "Plan een gesprek over het platform of over een transactie of vraagstuk. marcel@bisschopsfinancing.nl · +31 6 38 68 98 88.",
     "https://koersvoormorgen.nl/contact", "hero-weg.jpg", "website", "simple|Contact"),

    ("contact-verzonden.html", 0,
     "Bericht ontvangen · Koers voor Morgen",
     "Uw bericht is ontvangen. Marcel neemt doorgaans binnen één werkdag contact op.",
     "https://koersvoormorgen.nl/contact-verzonden", "hero-weg.jpg", "website", "noindex"),

    ("inloggen.html", 0,
     "Inloggen · Koers voor Morgen",
     "Naar het verkoper- en koperportaal of het adviseursportaal van het Koers voor Morgen-platform.",
     "https://koersvoormorgen.nl/inloggen", "hero-weg.jpg", "website", "simple|Inloggen"),

    ("404.html", 0,
     "Pagina niet gevonden · Koers voor Morgen",
     "Deze pagina bestaat niet meer. Ga naar het platform, M&amp;A Expertise of de homepage.",
     "https://koersvoormorgen.nl/404", "hero-weg.jpg", "website", "noindex"),

    ("inzichten/index.html", 1,
     "Inzichten over M&amp;A, due diligence en integratie · Koers voor Morgen",
     "Stukken die een vraagstuk scherper maken, over M&amp;A, due diligence, integratie, strategie en AI in M&amp;A.",
     "https://koersvoormorgen.nl/inzichten", "expertise-staal.jpg", "website", "simple|Inzichten"),

    ("inzichten/wat-ai-wel-en-niet-doet-in-due-diligence.html", 1,
     "Wat AI wél en niet doet in due diligence · Koers voor Morgen",
     "De grens tussen signaleren en beoordelen in AI-ondersteunde due diligence, en waarom die grens ertoe doet.",
     "https://koersvoormorgen.nl/inzichten/wat-ai-wel-en-niet-doet-in-due-diligence", "platform-dashboard.jpg", "article", "post|AI in M&A|Wat AI wél en niet doet in due diligence"),

    ("inzichten/een-overnametraject-als-een-dossier.html", 1,
     "Een overnametraject als één dossier · Koers voor Morgen",
     "Waarom een dataroom niet genoeg is, en wat er misgaat als een overnametraject verspreid raakt over e-mail en Excel.",
     "https://koersvoormorgen.nl/inzichten/een-overnametraject-als-een-dossier", "platform-dashboard.jpg", "article", "post|M&A|Een overnametraject als één dossier"),

    ("inzichten/waarom-integraties-vastlopen.html", 1,
     "Waarom integraties vastlopen · Koers voor Morgen",
     "Integraties lopen zelden vast op de inhoud, maar op de knopen die niemand doorhakt. Over patroon en aanpak.",
     "https://koersvoormorgen.nl/inzichten/waarom-integraties-vastlopen", "expertise-oversteek.jpg", "article", "post|Integratie|Waarom integraties vastlopen"),

    ("inzichten/wat-een-dataroom-niet-laat-zien.html", 1,
     "Wat een dataroom niet laat zien · Koers voor Morgen",
     "De cijfers kloppen en de dataroom is compleet, en toch valt een overname soms tegen. Wat de waarde bepaalt, staat zelden in de stukken.",
     "https://koersvoormorgen.nl/inzichten/wat-een-dataroom-niet-laat-zien", "expertise-staal.jpg", "article", "post|Due diligence|Wat een dataroom niet laat zien"),

    ("inzichten/kopen-omdat-het-kan-is-geen-strategie.html", 1,
     "Kopen omdat het kan is geen strategie · Koers voor Morgen",
     "Een overnamekans voelt als vooruitgang. Maar een deal die niet bij de richting past, kost meer dan hij oplevert, ook bij een goede prijs.",
     "https://koersvoormorgen.nl/inzichten/kopen-omdat-het-kan-is-geen-strategie", "expertise-staal.jpg", "article", "post|Strategie|Kopen omdat het kan is geen strategie"),

    ("inzichten/de-momenten-waarop-een-deal-klapt.html", 1,
     "De momenten waarop een deal alsnog klapt · Koers voor Morgen",
     "De meeste transacties lopen niet vast op de prijs, maar op de momenten waarop informatie, belangen of tempo uit elkaar lopen.",
     "https://koersvoormorgen.nl/inzichten/de-momenten-waarop-een-deal-klapt", "expertise-oversteek.jpg", "article", "post|M&A|De momenten waarop een deal alsnog klapt"),

    ("inzichten/personeel-behouden-na-een-overname.html", 1,
     "Personeel behouden na een overname · Koers voor Morgen",
     "De human factor bij integratie, overnames en PE: waarom mensen vertrekken, wat werkt in de eerste honderd dagen, en waarom retentiebonussen geen strategie zijn.",
     "https://koersvoormorgen.nl/inzichten/personeel-behouden-na-een-overname", "expertise-oversteek.jpg", "article", "post|Integratie|Personeel behouden na een overname"),

    ("privacy.html", 0,
     "Privacyverklaring · Koers voor Morgen",
     "Hoe Koers voor Morgen omgaat met persoonsgegevens: welke gegevens, welke grondslag, welke bewaartermijnen en uw rechten onder de AVG.",
     "https://koersvoormorgen.nl/privacy", "hero-weg.jpg", "website", "simple|Privacyverklaring"),

    ("voorwaarden.html", 0,
     "Gebruiksvoorwaarden · Koers voor Morgen",
     "De gebruiksvoorwaarden voor verkopers, kopers en andere partijen in een M&amp;A-traject op het Koers voor Morgen-platform.",
     "https://koersvoormorgen.nl/voorwaarden", "hero-weg.jpg", "website", "simple|Gebruiksvoorwaarden"),
]

LD_COMMON = '{ "@type": "Organization", "@id": "https://koersvoormorgen.nl/#org", "name": "Koers voor Morgen", "url": "https://koersvoormorgen.nl/", "parentOrganization": { "@type": "Organization", "name": "Bisschops Financing B.V." }, "sameAs": ["https://www.linkedin.com/in/marcelbisschops"] }'
LD_SITE = '{ "@type": "WebSite", "@id": "https://koersvoormorgen.nl/#site", "url": "https://koersvoormorgen.nl/", "name": "Koers voor Morgen", "publisher": { "@id": "https://koersvoormorgen.nl/#org" }, "inLanguage": "nl-NL" }'
LD_SOFTWARE = '{ "@type": "SoftwareApplication", "name": "Koers voor Morgen Platform", "applicationCategory": "BusinessApplication", "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "description": "Gratis bedrijfsscan; adviseursmodel op aanvraag." }, "publisher": { "@id": "https://koersvoormorgen.nl/#org" } }'
LD_PERSON = '{ "@type": "Person", "@id": "https://koersvoormorgen.nl/#marcel", "name": "Marcel Bisschops", "jobTitle": "M&A-professional", "worksFor": { "@type": "Organization", "name": "Bisschops Financing B.V." }, "alumniOf": "Rijksuniversiteit Leiden", "knowsAbout": ["Fusies en overnames", "Due diligence", "Post-merger integratie", "Value creation", "Corporate governance"], "sameAs": ["https://www.linkedin.com/in/marcelbisschops"] }'

def breadcrumb_ld(items):
    els = ", ".join(
        f'{{ "@type": "ListItem", "position": {i+1}, "name": "{name}", "item": "{url}" }}'
        for i, (name, url) in enumerate(items)
    )
    return f'{{ "@type": "BreadcrumbList", "itemListElement": [{els}] }}'

def ld_for(kind, canon):
    parts = kind.split("|")
    kind = parts[0]
    label = parts[1] if len(parts) > 1 else None
    title = parts[2] if len(parts) > 2 else None
    graph = [LD_COMMON, LD_SITE]
    if kind in ("home", "platform", "platform-sub", "bedrijfsscan"):
        graph.append(LD_SOFTWARE)
    if kind in ("home", "ma", "ma-sub", "over-marcel", "case"):
        graph.append(LD_PERSON)
    if kind == "ma-sub":
        st = label or canon.rsplit("/", 1)[-1].replace("-", " ").capitalize()
        graph.append('{ "@type": "Service", "serviceType": "%s", "provider": { "@id": "https://koersvoormorgen.nl/#marcel" }, "areaServed": "NL" }' % st)
    if kind == "platform":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), ("Platform", canon)]))
    if kind == "ma":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), ("M&A Expertise", canon)]))
    if kind == "bedrijfsscan":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), ("Bedrijfsscan", canon)]))
    if kind == "over-marcel":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), ("Over Marcel", canon)]))
    if kind == "cases":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), ("Cases", canon)]))
    if kind == "case":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"),
                                    ("Cases", "https://koersvoormorgen.nl/cases"),
                                    (label or "Case", canon)]))
    if kind == "platform-sub":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"),
                                    ("Platform", "https://koersvoormorgen.nl/platform"),
                                    (canon.rsplit("/", 1)[-1].replace("-", " ").capitalize(), canon)]))
    if kind == "ma-sub":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"),
                                    ("M&A Expertise", "https://koersvoormorgen.nl/m-en-a-expertise"),
                                    (label or canon.rsplit("/", 1)[-1].replace("-", " ").capitalize(), canon)]))
    if kind == "simple":
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"), (label or "Pagina", canon)]))
    if kind == "post":
        graph.append('{ "@type": "Article", "headline": "%s", "author": { "@id": "https://koersvoormorgen.nl/#marcel" }, "publisher": { "@id": "https://koersvoormorgen.nl/#org" }, "articleSection": "%s" }' % (title or "", label or ""))
        graph.append(LD_PERSON)
        graph.append(breadcrumb_ld([("Home", "https://koersvoormorgen.nl/"),
                                    ("Inzichten", "https://koersvoormorgen.nl/inzichten"),
                                    (title or "Artikel", canon)]))
    body = ",\n    ".join(graph)
    return '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@graph": [\n    ' + body + '\n  ]\n}\n</script>'

def build():
    nav_html, foot_html = nav(), foot()
    for path, depth, title, desc, canon, ogimg, ogtype, kind in PAGES:
        src_file = SRC / (
            "home.html" if path == "index.html" else
            (pathlib.Path(path).parent.name + ".html" if pathlib.Path(path).name == "index.html"
             else pathlib.Path(path).stem + ".html")
        )
        if not src_file.exists():
            print(f"  ! ontbreekt: _src/{src_file.name}  (overgeslagen)")
            continue
        main = src_file.read_text(encoding="utf-8")
        robots = '\n<meta name="robots" content="noindex,follow">' if kind.split("|")[0] == "noindex" else ""
        html = SKELETON.format(
            title=title, desc=desc, canon=canon, ogimg=ogimg, ogtype=ogtype, robots=robots,
            ld=ld_for(kind, canon), nav=nav_html, main=main, foot=foot_html,
        )
        root = "../" * depth if depth else "./"
        html = html.replace("{{ROOT}}", root)
        out = HERE / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print(f"  gebouwd: {path}")

def sitemap():
    urls = []
    for path, depth, title, desc, canon, ogimg, ogtype, kind in PAGES:
        if kind.split("|")[0] == "noindex":
            continue
        urls.append(canon)
    body = "\n".join(
        f"  <url><loc>{u}</loc></url>" for u in urls
    )
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + body + "\n</urlset>\n")
    (HERE / "sitemap.xml").write_text(xml, encoding="utf-8")
    (HERE / "robots.txt").write_text(
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /mna.html\n"
        "Disallow: /adv.html\n"
        "Disallow: /marilyn.html\n"
        "Disallow: /viewer.html\n"
        "Disallow: /matching-platform.html\n\n"
        "Sitemap: https://koersvoormorgen.nl/sitemap.xml\n",
        encoding="utf-8",
    )
    print(f"  sitemap.xml ({len(urls)} URL's) + robots.txt")

if __name__ == "__main__":
    build()
    sitemap()
    print("klaar.")
