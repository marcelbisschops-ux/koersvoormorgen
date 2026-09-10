# FASE 6 — Voorstel ter verificatie door de jurist

**Datum:** 2026-09-10
**Van:** Bisschops Financing B.V. (opgesteld ter voorbereiding, nog niet toegepast)
**Aan:** de jurist, ter toetsing en akkoord
**Betreft:** vier samenhangende tekstwijzigingen in de contractdocumenten van het Koers voor Morgen-platform

Dit stuk bevat de **concrete, kant-en-klare tekstvoorstellen**. Per onderdeel staat: de voorgestelde
tekst, waar die landt, welke keuze op de nog openstaande punten is gemaakt en waarom, en de vraag
die aan u voorligt. Achtergrond en de eerdere conceptversie: `FASE6-DRAFTS.md`.

**Vaste gegevens die in alle teksten terugkomen**

| | |
|---|---|
| Juridische naam contractspartij | Bisschops Financing B.V. |
| KvK-nummer | 08208520 |
| Vestiging | Grotestraat 13, 5841 AA Oploo |
| Handels-/platformnaam | Koers voor Morgen |
| Aansprakelijkheidsbeperking (bestaand) | € 10.000 per traject |
| AI-subverwerker | Anthropic PBC (Verenigde Staten), model Claude, zakelijke API |

**Documenten die geraakt worden**

| Afkorting | Document | Waar | Huidige versie |
|---|---|---|---|
| AV | Algemene/Gebruiksvoorwaarden voor verkoper/koper/derden | `voorwaarden.html` | 2.2 |
| GV | Gebruiksvoorwaarden platform (adviseur) | worker, `GEBRUIKSVOORWAARDEN_TEKST` | 2.0 |
| VOK | Verwerkersovereenkomst (adviseur) | worker, `bouwVokTekst` | 1.5 |
| PV | `platformvoorwaarden.html` (publieke kopie) | frontend | — |
| PRIV | Privacyverklaring | `privacy.html` | 1.7 |

---

## Onderdeel 1 — Handelsnaam-zin

**Wat het regelt:** vastleggen dat "Koers voor Morgen" een handelsnaam is van Bisschops Financing B.V.,
zodat de merknaam overal consistent gebruikt kan worden zonder onduidelijkheid over wie de
contractspartij is.

### Voorgestelde tekst (identiek in elk document, direct bij de partij-aanduiding)

> Koers voor Morgen is een handelsnaam van Bisschops Financing B.V. (KvK 08208520), gevestigd te
> Oploo. Waar in [deze voorwaarden / deze overeenkomst / deze verklaring] "Koers voor Morgen" of
> "het platform" wordt gebruikt, wordt Bisschops Financing B.V. als contractspartij bedoeld.

### Plaatsing

| Document | Plek |
|---|---|
| AV | onder "Bisschops Financing B.V. / KvK-nummer …", als afsluitende zin van dat blok |
| GV | Artikel 1 (Toepasselijkheid), als tweede zin |
| VOK | onder "Partijen", direct na de aanduiding van de Verwerker |
| PV | zelfde plek als in de AV |
| PRIV | § verwerkingsverantwoordelijke |

### Gemaakte keuzes

1. **KvK-nummer:** 08208520 (in de eerdere conceptversie stond per abuis 82085200; dat is gecorrigeerd).
2. **Verkorte naam in de contracttekst:** in de lopende tekst van GV en VOK staat nu nog "Bisschops
   Financing" als verkorte aanduiding. Voorstel: **die verkorte aanduiding overal vervangen door
   "Koers voor Morgen"**, zodra de zin hierboven is opgenomen. De definitiezin neemt de dubbelzinnigheid
   weg, en het platform, de website en alle overige communicatie gebruiken inmiddels consequent "Koers
   voor Morgen". De volledige juridische naam ("Bisschops Financing B.V."), de copyrightregel en het
   factuuradres blijven ongewijzigd.

### Vraag aan de jurist

- Is de formulering van de handelsnaam-zin juridisch sluitend, of prefereert u een andere redactie?
- Akkoord met het overzetten van de verkorte aanduiding naar "Koers voor Morgen" in de lopende
  contracttekst, gegeven de definitiezin?

---

## Onderdeel 2 — Reliance-clausule (inroepbaarheid door derden)

**Wat het regelt:** het platform genereert een due-diligence-dossier, indicatieve waarderingen en
concept-documenten (NDA, LoI, bemiddelingsovereenkomst, dealvoorstel, teaser, verkoopmemorandum).
Zonder expliciete bepaling bestaat het risico dat een wederpartij, financier of andere derde zich
op zo'n uitkomst beroept als ware het een aan hem gericht professioneel advies of taxatierapport.
De waarderingsmodule bevat al een disclaimer op dat punt; deze clausule tilt dat naar het niveau
van de voorwaarden en breidt het uit naar alle platform-uitkomsten.

### Voorgestelde tekst — op te nemen in AV en GV

> **Geen advies aan of inroepbaarheid door derden.**
> De via het platform gegenereerde uitkomsten (waaronder het due-diligence-dossier, samenvattingen,
> indicatieve waarderingen, scenario- en gevoeligheidsanalyses, en concept-documenten zoals de
> geheimhoudingsovereenkomst, de intentieovereenkomst, de bemiddelingsovereenkomst, het dealvoorstel,
> de teaser en het verkoopmemorandum) zijn hulpmiddelen ter ondersteuning van de adviseur en diens
> opdrachtgever. Zij vormen geen accountantsverklaring, geen fiscaal, juridisch of financieel advies,
> en geen formeel taxatierapport.
>
> Deze uitkomsten zijn uitsluitend bestemd voor de adviseur en diens opdrachtgever in het betreffende
> traject. Geen andere partij, waaronder een wederpartij bij de transactie, een financier, een
> verzekeraar of enige overige derde, kan aan deze uitkomsten rechten ontlenen of zich daarop jegens
> Bisschops Financing B.V. of de adviseur beroepen. Bisschops Financing B.V. aanvaardt geen
> aansprakelijkheid jegens een derde die desondanks op een platform-uitkomst is afgegaan.
>
> De adviseur is verantwoordelijk voor de professionele beoordeling, aanvulling en het gebruik van
> elke platform-uitkomst voordat deze met een derde wordt gedeeld of aan een transactiebesluit ten
> grondslag wordt gelegd. Verstrekt de adviseur een platform-uitkomst aan een derde, dan vrijwaart
> de adviseur Bisschops Financing B.V. voor aanspraken van die derde die voortvloeien uit dat gebruik,
> behoudens voor zover de aanspraak het gevolg is van opzet of bewuste roekeloosheid van Bisschops
> Financing B.V.

### Voorgestelde tekst — korte zichtbare variant in het product

Voor de voettekst van gegenereerde documenten en van de dossier-export, naast de bestaande
waarderings-disclaimer:

> Dit document is via het Koers voor Morgen-platform opgesteld als hulpmiddel voor de begeleidende
> adviseur en diens opdrachtgever. Het is geen professioneel advies of taxatierapport en is niet
> bestemd voor, of inroepbaar door, derden.

### Plaatsing

| Document | Plek |
|---|---|
| AV | nieuw artikel, direct na het aansprakelijkheidsartikel |
| GV | nieuw artikel, direct na het aansprakelijkheidsartikel |
| Product | voettekstkader van `bgDoc()`-documenten en van de dossier-export (technische wijziging, valt buiten deze toetsing behalve de tekst zelf) |

### Gemaakte keuzes

1. **Vrijwaring door de adviseur (open punt 2c uit `FASE6-DRAFTS.md`):** opgenomen als **lichte
   vrijwaring** in de laatste alinea. De adviseur bepaalt zelf of en aan wie hij een platform-uitkomst
   verstrekt; het risico van dat verspreiden hoort daarom bij hem, met de gebruikelijke uitzondering
   voor opzet/bewuste roekeloosheid aan onze kant. Als u de vrijwaring liever weglaat of anders
   begrenst, hoor ik dat graag.
2. **Verhouding tot de aansprakelijkheidscap (€ 10.000/traject):** de reliance-clausule beperkt de
   *kring* van gerechtigden, de cap beperkt het *bedrag*. Ze zijn zo geredigeerd dat ze naast elkaar
   staan.
3. **Consument-opdrachtgever:** de tekst sluit alleen *derden* uit, niet de opdrachtgever zelf, met
   het oog op de bestaande voorwaardelijke consumentenclausule.

### Vraag aan de jurist

- Is de uitsluiting jegens derden in deze vorm houdbaar naast de bestaande cap en naast de
  voorwaardelijke consumentenclausule?
- Akkoord met de lichte vrijwaring door de adviseur, of aanpassen?

---

## Onderdeel 3 — Bijlage AI-verwerking bij de VOK

**Wat het regelt:** één samenhangende bijlage die beschrijft hoe het platform AI inzet, in plaats
van de nu over VOK-artikel 3 en 6 verspreide bepalingen. Grotendeels consolidatie van al
geaccepteerde tekst; de toets betreft de volledigheid en de transparantieverplichting uit de
AI-Verordening.

### Voorgestelde tekst — "Bijlage — Verwerking met behulp van AI"

> **1. Doel.** Het platform gebruikt AI-taalmodellen om geüploade documenten te analyseren, gegevens
> daaruit te extraheren naar het due-diligence-dossier, en concept-rapportages en -documenten te
> genereren. Het doel is automatisering en versnelling van het due-diligence-proces. De AI-uitkomsten
> zijn concept en worden door de adviseur beoordeeld (zie de bepaling "Geen advies aan of
> inroepbaarheid door derden").
>
> **2. Ingeschakelde dienst.** De AI-verwerking vindt plaats bij Anthropic PBC (Verenigde Staten),
> via de Claude-modellen. Anthropic treedt op als sub-verwerker.
>
> **3. Welke gegevens.** Aan de AI-dienst worden voorgelegd: de inhoud van door of namens de adviseur
> geüploade documenten en de in het traject ingevoerde gegevens, voor zover nodig voor de in punt 1
> genoemde taken. De verwerking blijft beperkt tot de context van het specifieke traject waarvoor de
> gegevens zijn aangeleverd.
>
> **4. Geen training.** De aangeleverde gegevens en documenten worden niet gebruikt voor het trainen
> of verbeteren van AI-modellen van Anthropic of van Bisschops Financing B.V., tenzij de adviseur
> daarvoor vooraf uitdrukkelijk toestemming geeft.
>
> **5. Doorgifte buiten de EU.** Voor zover persoonsgegevens naar Anthropic PBC in de Verenigde
> Staten worden doorgegeven, gebeurt dit op basis van de EU-modelcontractbepalingen (Standard
> Contractual Clauses) tussen Bisschops Financing B.V. en Anthropic PBC, ter waarborging van een
> passend beschermingsniveau conform de AVG.
>
> **6. Bewaring bij de AI-dienst.** Bisschops Financing B.V. maakt gebruik van de zakelijke API van
> Anthropic. Invoer en uitvoer worden door Anthropic bewaard gedurende ten hoogste dertig (30) dagen
> en uitsluitend voor het leveren van de dienst, misbruikdetectie en het voldoen aan wettelijke
> verplichtingen, waarna zij worden verwijderd. Anthropic gebruikt deze gegevens niet voor
> modeltraining.
>
> **7. Menselijke tussenkomst.** Elke AI-uitkomst die naar een tegenpartij of cliënt gaat
> (dealvoorstel, intentieovereenkomst, geheimhoudingsovereenkomst, bemiddelingsovereenkomst,
> biedingsbrief, scan-rapport, teaser, verkoopmemorandum) wordt door de adviseur beoordeeld en
> vrijgegeven. Het platform kent geen volautomatische besluitvorming met rechtsgevolg voor
> betrokkenen in de zin van artikel 22 AVG.
>
> **8. Transparantie richting betrokkenen.** De adviseur informeert zijn cliënten dat in het traject
> AI wordt ingezet voor documentanalyse en conceptgeneratie. Het platform stelt daarvoor
> standaardtekst beschikbaar (in de privacyverklaring en in de meldingsregel onder aan gegenereerde
> stukken: "Verwerkt via het Koers voor Morgen-platform").
>
> **9. Nauwkeurigheid.** AI-extractie kan onjuist of onvolledig zijn. Het platform markeert onzekere
> waarden als "niet vermeld" of "handmatig controleren" in plaats van een waarde te schatten. De
> adviseur controleert geëxtraheerde cijfers voordat hij ze in een waardering of document gebruikt.

### Aanpassing van VOK-artikel 3 en 6

Voorstel: **artikel 3 en 6 blijven staan als korte verankering en verwijzen naar de bijlage.**

- Artikel 3, slotzin toevoegen: "De wijze waarop AI wordt ingezet is nader uitgewerkt in de Bijlage
  — Verwerking met behulp van AI, die deel uitmaakt van deze overeenkomst."
- Artikel 6, na de Anthropic-zin toevoegen: "Zie voor de AI-verwerking door Anthropic PBC de Bijlage
  — Verwerking met behulp van AI."

Reden: de bijlage volledig in de artikelen verwerken zou de nummering van een reeds ondertekende
overeenkomst omgooien; een korte verwijzing plus bijlage houdt de wijziging ten opzichte van de
getekende versie klein en overzichtelijk.

### Gemaakte keuzes

1. **Retentietermijn bij Anthropic (open punt, `[Jurist: …]` in het concept):** ingevuld als **ten
   hoogste 30 dagen**. Dit is de standaardtermijn van de zakelijke API van Anthropic (bewaring voor
   dienstverlening en misbruikdetectie, geen modeltraining). **Graag verifiëren tegen de actuele
   Anthropic Commercial Terms of Service en de DPA/subverwerkersvoorwaarden**; als Bisschops Financing
   een Zero-Data-Retention-afspraak met Anthropic sluit, wordt deze termijn korter en past de tekst
   daarop aan.
2. **Structuur (open punt 3b):** artikel 3/6 behouden met verwijzing, bijlage als uitwerking. Zie
   hierboven.

### Vraag aan de jurist

- Klopt de 30-dagentermijn in punt 6, of moet daar een andere termijn / formulering staan?
- Akkoord met "artikel 3/6 behouden + bijlage", of liever de bepalingen samenvoegen?
- Dekt punt 8 de transparantieverplichting uit artikel 50 AI-Verordening voldoende af?

---

## Onderdeel 4 — Bewaartermijn per traject (VOK Artikel 5)

**Wat het regelt:** de standaard is 14 dagen na afsluiting, daarna volledige verwijdering. Er is nu
een technische mogelijkheid om per traject, alleen door de beheerder, een langere bewaartermijn te
zetten (ten hoogste 365 dagen). VOK Artikel 5 zegt nu letterlijk "veertien (14) dagen na afsluiting";
een langere termijn voor een concreet traject wijkt daarvan af. De knop is bewust inert tot de VOK
dit dekt.

### Voorgestelde vervangende tekst voor de bewaartermijn-passage in Artikel 5

> Geüploade documenten en alle overige trajectgegevens worden bewaard gedurende het traject en
> gedurende veertien (14) dagen na afsluiting van het traject, dan wel gedurende een langere termijn
> van ten hoogste driehonderdvijfenzestig (365) dagen indien Gebruiker en Bisschops Financing B.V.
> dat voor het betreffende traject schriftelijk zijn overeengekomen op grond van een concrete
> noodzaak, zoals een lopend geschil of een op Gebruiker rustende wettelijke bewaarplicht. In die
> periode wordt een volledig dossier eenmalig als downloadbaar bestand aan Gebruiker beschikbaar
> gesteld. Na afloop van de toepasselijke termijn worden alle trajectgegevens definitief van het
> platform verwijderd, met uitzondering van de in dit artikel genoemde beperkte archiefregel.

De overige zinnen van Artikel 5 (archiefregel, eigen bewaarplicht adviseur, drie-maanden-inactiviteit,
back-upretentie van 60 dagen) blijven ongewijzigd.

### Bijbehorende bepaling in de GV (opslagvergoeding)

Om de vergoeding voor een verlengde bewaartermijn een contractuele grondslag te geven, voorstel voor
een zin in het GV-artikel over kosten/tarieven:

> Voor een op verzoek van de adviseur verlengde bewaartermijn als bedoeld in de Verwerkersovereenkomst
> brengt Koers voor Morgen een opslagvergoeding in rekening conform het op dat moment geldende
> tarievenoverzicht. Deze bedraagt thans € 25 per aangevangen maand per traject, gerekend vanaf de
> vijftiende dag na afsluiting.

### Gemaakte keuzes

1. **Concrete grondslag (open punt 4b):** als voorwaarde in de tekst opgenomen ("op grond van een
   concrete noodzaak, zoals …"), met het oog op dataminimalisatie (artikel 5 lid 1 sub e AVG). Als u
   dit te beperkend of juist te ruim vindt, hoor ik het graag.
2. **Bovengrens 365 dagen:** productkeuze, om te voorkomen dat het platform permanente opslag wordt.
3. **Verhouding tot de drie-maanden-inactiviteitssluiting:** ongewijzigd; de langere bewaartermijn
   gaat pas lopen na (automatische of handmatige) afsluiting.
4. **Opslagvergoeding:** € 25 per aangevangen maand per traject, boven de gratis termijn van 14 dagen.
   Technisch wordt dit als factuurregel geboekt op het moment dat de beheerder de langere termijn
   instelt.

### Vraag aan de jurist

- Is de voorwaarde "op grond van een concrete noodzaak" voldoende, of moet dit strakker (limitatieve
  opsomming) of juist losser?
- Akkoord met de opslagvergoeding-zin in de GV, en met "per aangevangen maand" als rekeneenheid?

---

## Na uw akkoord — volgorde van doorvoeren

Per onderdeel, in deze volgorde, telkens met versieophoging van het betreffende document, de
bestaande audits, eerst staging en dan productie:

1. **Onderdeel 4 (VOK Artikel 5 + GV-opslagvergoeding).** Hieraan hangt de technische koppeling die
   de € 25/maand automatisch als factuurregel boekt zodra de beheerder een langere bewaartermijn zet.
2. **Onderdeel 1 (handelsnaam-zin)** in AV, GV, VOK, PV, PRIV.
3. **Onderdeel 2 (reliance-clausule)** in AV en GV, plus de korte variant in de documentvoettekst.
4. **Onderdeel 3 (AI-bijlage)** bij de VOK, met de verwijzingen in artikel 3 en 6.
