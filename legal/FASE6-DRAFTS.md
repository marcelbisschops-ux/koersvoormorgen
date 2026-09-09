# FASE 6 — Concept-teksten voor de jurist (handelsnaam, reliance, AI-annex)

**Datum:** 2026-09-09 · **Basis:** feedback externe fiscalist/AI-review + keuzes Marcel (branding, beveiliging "wat is echt nodig").
**Status:** **concept, nog niet toegepast op enig live juridisch document.** Werkregel 17: AV/VOK/GV/privacy worden nooit automatisch gewijzigd. Deze teksten zijn bedoeld voor toetsing door de jurist; daarna pas toepassen via de gebruikelijke keten (`node --check` + audits → staging → productie).
**Samenhang:** [`LEGAL_ISSUES.md`](LEGAL_ISSUES.md), [`FASE5-WIJZIGINGEN.md`](FASE5-WIJZIGINGEN.md), [`INCIDENTPROCEDURE.md`](INCIDENTPROCEDURE.md).

Wat al **wel** live is (branding, 2026-09-09): de narratieve, niet-juridische "neem contact op met Bisschops Financing"-teksten in het platform (proefaccount-melding, module-/limiet-meldingen, adviseur-mails) en de publieke site (footer, positioneringsalinea op `platform/`) verwijzen nu naar **koersvoormorgen.nl**. De contracttekst (AV, VOK, GV) is bewust ongemoeid gelaten en staat hieronder als concept.

---

## 1. Handelsnaam-zin

**Doel:** vastleggen dat "Koers voor Morgen" een handelsnaam is van Bisschops Financing B.V., zodat de merknaam op de site en in het product consistent gebruikt kan worden zonder dat onduidelijk wordt wie de contractspartij is.

### 1a. Voorgestelde standaardzin (overal identiek)

> Koers voor Morgen is een handelsnaam van Bisschops Financing B.V. (KvK 82085200), gevestigd te Oploo. Waar in deze [voorwaarden / verklaring / overeenkomst] "Koers voor Morgen" of "het platform" staat, wordt Bisschops Financing B.V. als contractspartij bedoeld.

### 1b. Plaatsen om op te nemen (na jurist-akkoord)

| Document | Plek | Opmerking |
|---|---|---|
| `voorwaarden.html` | begin, bij de partij-aanduiding | vervangt niets, voegt de handelsnaam-koppeling toe |
| `privacy.html` | §1 (verwerkingsverantwoordelijke) | naam van de verwerkingsverantwoordelijke blijft Bisschops Financing B.V. |
| Gebruiksvoorwaarden platform (`cloudflare-worker.js`, `buildGvTekst`) | art. 1 | `WORKER_BRAND.naam` blijft de juridische naam; zin toevoegen |
| Verwerkersovereenkomst (`worker/20-signhost-vok.js` + `mna/04` `VOK_TEKST`) | onder "Partijen" | Verwerker blijft "Bisschops Financing B.V."; zin toevoegen onder de partij-aanduiding |
| `platformvoorwaarden.html` | begin | idem |

### 1c. Wat **niet** verandert

- De juridische naam in alle contracten blijft **Bisschops Financing B.V.**
- De copyrightregel (`© 2026 Bisschops Financing B.V.`) blijft ongewijzigd.
- `WORKER_BRAND.naam` / `BRAND.bedrijf` in de code blijven "Bisschops Financing B.V." (dat is de contractspartij-token). Alleen `.kort` in *narratieve* UI-teksten is naar "Koers voor Morgen" gegaan; in de VOK/GV-contracttekst blijft `.kort` = "Bisschops Financing" tot de jurist de zin hierboven heeft goedgekeurd.
- Het factuuradres, BTW-id en IBAN staan op naam van Bisschops Financing B.V.

---

## 2. Reliance-clausule (op wie mogen platform-uitkomsten worden gebaseerd)

**Probleem dat dit adresseert:** het platform genereert een due-diligence-dossier, indicatieve waarderingen en concept-documenten (NDA/LoI/BEM/dealvoorstel/teaser/memorandum). Zonder expliciete clausule bestaat het risico dat een tegenpartij, financier of andere derde zich op zo'n uitkomst beroept als ware het een professioneel advies of taxatierapport aan hem gericht.

**Bestaande gedeeltelijke dekking:** de waarderingsmodule toont al een disclaimer ("Indicatieve waardering ... geen formeel taxatierapport ... aanvaardt geen aansprakelijkheid voor beslissingen op basis van dit overzicht", `mna/03:1852`). Deze clausule tilt dat naar het niveau van de voorwaarden en breidt het uit naar álle platform-uitkomsten.

### 2a. Concepttekst — op te nemen in AV en in de Gebruiksvoorwaarden

> **Geen advies aan of inroepbaarheid door derden.**
> De via het platform gegenereerde uitkomsten (waaronder het due-diligence-dossier, samenvattingen, indicatieve waarderingen, scenario- en gevoeligheidsanalyses, en concept-documenten zoals geheimhoudingsovereenkomst, intentieovereenkomst, bemiddelingsovereenkomst, dealvoorstel, teaser en verkoopmemorandum) zijn hulpmiddelen ter ondersteuning van de adviseur en diens opdrachtgever. Zij vormen geen accountantsverklaring, geen fiscaal, juridisch of financieel advies, en geen formeel taxatierapport.
> Deze uitkomsten zijn uitsluitend bestemd voor de adviseur en diens opdrachtgever in het betreffende traject. Geen andere partij, waaronder een wederpartij bij de transactie, een financier, een verzekeraar of enige overige derde, kan aan deze uitkomsten rechten ontlenen of zich daarop jegens Bisschops Financing B.V. of de adviseur beroepen. Bisschops Financing B.V. aanvaardt geen aansprakelijkheid jegens een derde die desondanks op een platform-uitkomst is afgegaan.
> De adviseur is verantwoordelijk voor de professionele beoordeling, aanvulling en het gebruik van elke platform-uitkomst voordat deze met een derde wordt gedeeld of aan een transactiebesluit ten grondslag wordt gelegd.

### 2b. Concept — korte, zichtbare variant in het product

Voor het voettekst-/exportkader van gegenereerde documenten en het DD-dossier (naast de bestaande waarderings-disclaimer):

> Dit document is via het Koers voor Morgen-platform opgesteld als hulpmiddel voor de begeleidende adviseur en diens opdrachtgever. Het is geen professioneel advies of taxatierapport en is niet bestemd voor, of inroepbaar door, derden.

### 2c. Aandachtspunten voor de jurist

- Verhouding tot de bestaande aansprakelijkheids-cap (€ 10.000/traject + € 10.000/jaar, ISSUE-05/10). De reliance-clausule beperkt de *kring* van gerechtigden; de cap beperkt het *bedrag*. Beide moeten naast elkaar houdbaar zijn.
- Bij een consument-opdrachtgever (voorwaardelijke consumentenclausule, ISSUE-03): een uitsluiting jegens de opdrachtgever zelf is kwetsbaar; de tekst hierboven sluit alleen *derden* uit, niet de opdrachtgever. Graag bevestigen dat dat onderscheid volstaat.
- Wenselijkheid van een expliciete vrijwaring door de adviseur voor claims van derden die hij zelf het document heeft laten zien.

---

## 3. AI-verwerking-annex

**Doel:** één samenhangende bijlage die beschrijft hoe het platform AI inzet, in plaats van de nu verspreide bepalingen (VOK art. 3 en art. 6). Marcel: akkoord om te bouwen. Grotendeels consolidatie van bestaande, al geaccepteerde tekst; toetsing door de jurist op volledigheid en op de AI-Verordening (AI Act) transparantieverplichtingen.

### 3a. Concept — "Bijlage AI-verwerking" bij de Verwerkersovereenkomst

> **Bijlage — Verwerking met behulp van AI**
>
> **1. Doel.** Het platform gebruikt AI-taalmodellen om geüploade documenten te analyseren, gegevens daaruit te extraheren naar het due-diligence-dossier, en concept-rapportages en -documenten te genereren. Het doel is automatisering en versnelling van het due-diligence-proces. De AI-uitkomsten zijn concept en worden door de adviseur beoordeeld (zie de reliance-clausule).
>
> **2. Ingeschakelde dienst.** De AI-verwerking vindt plaats bij Anthropic PBC (Verenigde Staten), via de Claude-modellen. Anthropic treedt op als sub-verwerker.
>
> **3. Welke gegevens.** Aan de AI-dienst worden voorgelegd: de inhoud van door of namens de adviseur geüploade documenten en de in het traject ingevoerde gegevens, voor zover nodig voor de in punt 1 genoemde taken. De verwerking blijft beperkt tot de context van het specifieke traject waarvoor de gegevens zijn aangeleverd.
>
> **4. Geen training.** De aangeleverde gegevens en documenten worden niet gebruikt voor het trainen of verbeteren van AI-modellen van Anthropic of van Bisschops Financing B.V., tenzij de adviseur daarvoor vooraf uitdrukkelijk toestemming geeft.
>
> **5. Doorgifte buiten de EU.** Voor zover persoonsgegevens naar Anthropic PBC in de Verenigde Staten worden doorgegeven, gebeurt dit op basis van de EU-modelcontractbepalingen (Standard Contractual Clauses) tussen Bisschops Financing B.V. en Anthropic PBC, ter waarborging van een passend beschermingsniveau conform de AVG.
>
> **6. Bewaring bij de AI-dienst.** Bisschops Financing B.V. maakt gebruik van de zakelijke API van Anthropic, waarbij invoer en uitvoer niet blijvend worden opgeslagen voor andere doeleinden dan het leveren van de dienst en het voldoen aan wettelijke verplichtingen. [Jurist: exacte retentietermijn van Anthropic bevestigen en hier invullen.]
>
> **7. Menselijke tussenkomst.** Elke AI-uitkomst die naar een tegenpartij of cliënt gaat (dealvoorstel, LoI, NDA, BEM, biedingsbrief, scan-rapport, teaser, memorandum) wordt door de adviseur beoordeeld en vrijgegeven. Het platform kent geen volautomatische besluitvorming met rechtsgevolg voor betrokkenen in de zin van art. 22 AVG.
>
> **8. Transparantie richting betrokkenen.** De adviseur informeert zijn cliënten dat in het traject AI wordt ingezet voor documentanalyse en conceptgeneratie. Het platform stelt daarvoor standaardtekst beschikbaar (privacyverklaring §[..] en de meldingsregel onder aan gegenereerde stukken: "Verwerkt via het Koers voor Morgen-platform").
>
> **9. Nauwkeurigheid.** AI-extractie kan onjuist of onvolledig zijn. Het platform markeert onzekere waarden als "niet vermeld" / "handmatig controleren" in plaats van te gokken (interne gouden standaard). De adviseur controleert geëxtraheerde cijfers vóór gebruik in een waardering of document.

### 3b. Aandachtspunten voor de jurist

- AI Act: het platform valt vermoedelijk niet onder "hoog risico", maar de transparantieverplichting (art. 50 AI Act, gebruiker informeren dat hij met AI-gegenereerde inhoud te maken heeft) is relevant voor de gegenereerde documenten. Punt 8 hierboven beoogt dat te dekken; graag toetsen.
- Consistentie met de bestaande VOK art. 3 en 6: bij invoering wordt die tekst vervangen door een verwijzing naar deze bijlage, of blijft art. 3/6 staan met deze bijlage als uitwerking. Voorkeur jurist?
- Punt 6 (retentie bij Anthropic): feitelijke termijn nog invullen op basis van de actuele Anthropic-voorwaarden / DPA.

---

## 4. Per-traject bewaartermijn (VOK Artikel 5)

**Aanleiding:** de standaard is 14 dagen na afsluiting, daarna volledige purge (Marcel, 22 aug 2026: "alle data asap weg"). Er is nu een technische mogelijkheid om per traject een langere bewaartermijn te zetten (kolom `mna_trajecten.bewaartermijn_dagen`, alleen door de beheerder, begrensd op 365 dagen, endpoint `POST /mna/admin/bewaartermijn/{id}`). Die staat standaard uit (NULL = 14).

**Waarom dit langs de jurist moet:** VOK Artikel 5 zegt nu letterlijk "gedurende het traject en gedurende veertien (14) dagen na afsluiting". Een langere bewaartermijn voor een concreet traject wijkt daarvan af. De technische knop is bewust inert gelaten tot de VOK dit dekt.

### 4a. Concept-aanpassing VOK Artikel 5 (alleen de bewaartermijn-zin)

> Geüploade documenten en alle overige trajectgegevens worden bewaard gedurende het traject en gedurende veertien (14) dagen na afsluiting van het traject, dan wel gedurende een langere termijn van ten hoogste driehonderdvijfenzestig (365) dagen indien dat voor het betreffende traject uitdrukkelijk tussen Gebruiker en Bisschops Financing B.V. is overeengekomen. In die periode wordt een volledig dossier eenmalig als downloadbaar bestand beschikbaar gesteld aan Gebruiker. Na afloop van de toepasselijke termijn worden alle trajectgegevens definitief van het platform verwijderd, met uitzondering van de in dit artikel genoemde archiefregel.

### 4b. Aandachtspunten voor de jurist

- Dataminimalisatie (art. 5 lid 1 sub e AVG): een langere bewaartermijn moet per traject een concrete grondslag hebben (lopend geschil, wettelijke bewaarplicht die de adviseur bij ons wil beleggen). Wenselijk om dat als voorwaarde in de tekst te zetten?
- De 365-dagen-bovengrens is een productkeuze (voorkomen dat het platform permanente opslag wordt). Akkoord, of anders?
- Verhouding tot de 3-maanden-inactiviteitssluiting: die blijft ongewijzigd; de langere bewaartermijn gaat pas lopen ná (automatische of handmatige) afsluiting.

---

## 5. Volgorde van toepassing (na jurist-akkoord, per onderdeel)

1. Handelsnaam-zin → in de vijf genoemde documenten; `WORKER_BRAND.kort` in de contracttekst kan daarna mee naar "Koers voor Morgen" of blijven, afhankelijk van de gekozen formulering.
2. Reliance-clausule → AV + GV + de zichtbare korte variant in `bgDoc()` / DD-export.
3. AI-annex → als bijlage bij de VOK; VOK art. 3/6 daarop afstemmen.

Elk onderdeel: eigen redline in dit bestand bijwerken naar "toegepast", `AV_VERSIE` / VOK-versienr. ophogen, audits draaien, staging, productie.
