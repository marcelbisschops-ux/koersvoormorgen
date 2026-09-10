# FASE 6 — Voorstel ter verificatie door de jurist (v2, na eerste juridische review)

**Datum:** 2026-09-10 · **Versie:** 2 (redlines eerste jurist-review verwerkt)
**Van:** Bisschops Financing B.V. (opgesteld ter voorbereiding, nog niet toegepast)
**Aan:** de jurist, ter tweede toetsing en akkoord
**Betreft:** vier samenhangende tekstwijzigingen in de contractdocumenten van het Koers voor Morgen-platform

## Verwerking van de eerste review

| Onderdeel | Oordeel eerste review | Verwerkt in v2 |
|---|---|---|
| 1 · Handelsnaam | 🟢 akkoord, redactie aanpassen — géén blanket-vervanging van "Bisschops Financing" | Tekst herzien naar "handelend onder de naam …"; het voorstel om de verkorte aanduiding overal te vervangen is **ingetrokken** |
| 2 · Reliance | 🟢 in beginsel, vrijwaring aanscherpen + "geen rechten ontlenen" nuanceren | Beide herzien (zie hieronder) |
| 3 · AI-bijlage | 🟠 eerst contractuele/feitelijke verificatie | **Verificatie afgerond op 2026-09-10** (zie §3-verificatie). ZDR staat **uit** → standaardretentie 30 dagen (variant B, nu de vaste tekst). Geen apart Anthropic-contract → standaard Commercial Terms + DPA (met SCC's). Model `claude-sonnet-4-6` is geen Covered Model. Art. 22: codedoorloop uitgevoerd, geen uitsluitend geautomatiseerd besluit met rechtsgevolg. Rest voor de jurist: de rolverdeling-splitsing (punt 8a/8b) en de juridische kwalificatie. **Klaar voor jurist-ronde 2.** |
| 4 · Bewaartermijn | 🟢 in beginsel, redactie aanscherpen (wie/waarom/hoelang/einde/verwijdering) | Tekst herzien met die vijf elementen; fee-zin genuanceerd. **DOORGEVOERD op 2026-09-10 op instructie van Marcel** (jurist akkoord in beginsel): VOK v1.5 → v1.6, GV v2.0 → v2.1, live op productie. De technische koppeling (opslagfee bij verlenging) is meegebouwd. **Openstaand:** de AV (`voorwaarden.html`) noemt nog een platte 14-dagentermijn; die consistentie-aanpassing valt buiten wat de jurist voor onderdeel 4 zag en wacht op zijn oordeel. |
| Volgorde | wijzigen: eerst 3 (AI), dan 1, 2, 4 | Overgenomen |

---

**Vaste gegevens die in alle teksten terugkomen**

| | |
|---|---|
| Juridische naam contractspartij | Bisschops Financing B.V. |
| KvK-nummer | 08208520 |
| Vestiging | Grotestraat 13, 5841 AA Oploo |
| Handels-/platformnaam | Koers voor Morgen |
| Aansprakelijkheidsbeperking (bestaand) | € 10.000 per traject |
| AI-subverwerker | Anthropic PBC (Verenigde Staten), model Claude (`claude-sonnet-4-6`), zakelijke API `api.anthropic.com` |

**Documenten die geraakt worden**

| Afk. | Document | Waar | Huidige versie |
|---|---|---|---|
| AV | Voorwaarden voor verkoper/koper/derden | `voorwaarden.html` | 2.2 |
| GV | Gebruiksvoorwaarden platform (adviseur) | worker, `GEBRUIKSVOORWAARDEN_TEKST` | 2.0 |
| VOK | Verwerkersovereenkomst (adviseur) | worker, `bouwVokTekst` | 1.5 |
| PV | `platformvoorwaarden.html` (publieke kopie) | frontend | — |
| PRIV | Privacyverklaring | `privacy.html` | 1.7 |

---

## Onderdeel 1 — Handelsnaam-zin  🟢 (redactie herzien)

**Wat het regelt:** vastleggen dat "Koers voor Morgen" een handelsnaam is van Bisschops Financing B.V.,
zodat de merknaam consistent gebruikt kan worden terwijl **Bisschops Financing B.V. de contractspartij
blijft**.

### Herziene voorgestelde tekst (bij de eerste partij-aanduiding in elk document)

> Bisschops Financing B.V., statutair gevestigd te Oploo, ingeschreven in het handelsregister onder
> nummer 08208520, handelend onder de naam **Koers voor Morgen** (hierna: "Koers voor Morgen").
> Waar in [deze voorwaarden / deze overeenkomst / deze verklaring] "Koers voor Morgen" of "het
> platform" wordt gebruikt, wordt Bisschops Financing B.V. bedoeld.

### Plaatsing

| Document | Plek |
|---|---|
| AV | in het openingsblok "Bisschops Financing B.V. / KvK-nummer …", als sluitzin |
| GV | Artikel 1 (Toepasselijkheid), eerste vermelding van de partij |
| VOK | onder "Partijen", bij de aanduiding van de Verwerker |
| PV | zelfde plek als in de AV |
| PRIV | § verwerkingsverantwoordelijke |

### Gemaakte keuzes / wat is aangepast t.o.v. v1

1. **KvK-nummer:** 08208520 (was in het allereerste concept per abuis 82085200).
2. **Verkorte aanduiding:** het v1-voorstel om overal in de lopende contracttekst "Bisschops
   Financing" te vervangen door "Koers voor Morgen" is **ingetrokken** naar aanleiding van de review.
   In plaats daarvan: de "handelend onder de naam"-formule bij de eerste vermelding, met een
   definitie zodat daarna "Koers voor Morgen" gebruikt kan worden. De volledige juridische naam
   blijft leidend waar het op de contractspartij aankomt.

### Vraag aan de jurist

- Akkoord met de "handelend onder de naam"-formulering en de definitie?
- Op welke plaatsen in de lopende tekst wilt u "Bisschops Financing B.V." expliciet gehandhaafd zien
  (bijv. aansprakelijkheids-, IE- en rechtskeuze-artikelen), zodat "Koers voor Morgen" alleen de
  neutrale/beschrijvende zinnen vervangt?

---

## Onderdeel 2 — Reliance-clausule  🟢 in beginsel (tekst aangescherpt)

**Wat het regelt:** het platform genereert een due-diligence-dossier, indicatieve waarderingen en
concept-documenten. Zonder bepaling bestaat het risico dat een wederpartij, financier of andere derde
zich op zo'n uitkomst beroept als ware het een aan hem gericht professioneel advies of taxatierapport.

### Herziene voorgestelde tekst — op te nemen in AV en GV

> **Geen advies aan of zorgplicht jegens derden.**
> De via het platform gegenereerde uitkomsten (waaronder het due-diligence-dossier, samenvattingen,
> indicatieve waarderingen, scenario- en gevoeligheidsanalyses, en concept-documenten zoals de
> geheimhoudingsovereenkomst, de intentieovereenkomst, de bemiddelingsovereenkomst, het dealvoorstel,
> de teaser en het verkoopmemorandum) zijn hulpmiddelen ter ondersteuning van de adviseur en diens
> opdrachtgever. Zij vormen geen accountantsverklaring, geen fiscaal, juridisch of financieel advies,
> en geen formeel taxatierapport.
>
> Deze uitkomsten worden opgesteld ten behoeve van, en zijn uitsluitend gericht tot, de adviseur en
> diens opdrachtgever in het betreffende traject. Zij zijn niet bedoeld om door een andere partij te
> worden gebruikt, waaronder een wederpartij bij de transactie, een financier, een verzekeraar of
> enige overige derde. Bisschops Financing B.V. aanvaardt jegens een zodanige derde geen zorgplicht
> en geen aansprakelijkheid met betrekking tot deze uitkomsten, ongeacht of die derde daarvan kennis
> heeft genomen.
>
> De adviseur is verantwoordelijk voor de professionele beoordeling, aanvulling en het gebruik van
> elke platform-uitkomst voordat deze met een derde wordt gedeeld of aan een transactiebesluit ten
> grondslag wordt gelegd. Voor zover de adviseur een platform-uitkomst aan een derde verstrekt of ter
> beschikking stelt en die derde Bisschops Financing B.V. daarop aanspreekt, vrijwaart de adviseur
> Bisschops Financing B.V. voor die aanspraak, doch uitsluitend voor zover Bisschops Financing B.V.
> voor de betreffende schade niet reeds op grond van deze [voorwaarden / overeenkomst] jegens de
> adviseur aansprakelijk is, en behoudens opzet of bewuste roekeloosheid van Bisschops Financing B.V.

### Korte zichtbare variant in het product (documentvoettekst, naast de bestaande waarderings-disclaimer)

> Dit document is via het Koers voor Morgen-platform opgesteld als hulpmiddel voor de begeleidende
> adviseur en diens opdrachtgever. Het is geen professioneel advies of taxatierapport en is niet
> bestemd voor gebruik door derden.

### Wat is aangepast t.o.v. v1

1. **"Geen rechten ontlenen" → genuanceerd.** De absolute formulering ("geen andere partij kan aan
   deze uitkomsten rechten ontlenen") is vervangen door een omschrijving van *bestemming en
   gerichtheid* plus een uitsluiting van *zorgplicht en aansprakelijkheid* jegens derden. De clausule
   pretendeert niet langer elke mogelijke buitencontractuele aanspraak van een derde bij voorbaat
   weg te contracteren.
2. **Vrijwaring → versmald.** Nu beperkt tot: aanspraken die voortvloeien uit het door de adviseur
   *verstrekken/ter beschikking stellen* van een uitkomst aan die derde; uitsluitend voor zover
   Bisschops Financing niet zelf reeds jegens de adviseur aansprakelijk is; met behoud van de
   uitzondering voor opzet/bewuste roekeloosheid.
3. Verhouding tot de cap (€ 10.000/traject) en tot de voorwaardelijke consumentenclausule
   ongewijzigd: de clausule raakt de *kring* van gerechtigden, niet het *bedrag*, en sluit alleen
   derden uit, niet de opdrachtgever zelf.

### Vraag aan de jurist

- Is de nieuwe "bestemming/gerichtheid + geen zorgplicht"-formulering houdbaar, of wilt u een andere
  redactie?
- Akkoord met de versmalde vrijwaring?

---

## Onderdeel 3 — Bijlage AI-verwerking bij de VOK  🟡 verificatie afgerond, klaar voor jurist-ronde 2

De eerste review gaf hier geen akkoord zonder feitelijke en contractuele verificatie. Die is op
2026-09-10 afgerond (zie §3-verificatie): geen apart Anthropic-contract, ZDR staat uit (30-dagen-
retentie), `claude-sonnet-4-6` is geen Covered Model, en de codedoorloop wijst geen artikel
22-verwerking uit. De bijlagetekst hieronder is daarop aangepast (punt 6 vast op 30 dagen). Nog aan
de jurist: de juridische kwalificaties (art. 22, rolverdeling) en definitief akkoord.

### Bijlagetekst — "Bijlage — Verwerking met behulp van AI"

> **1. Doel.** Het platform gebruikt AI-taalmodellen om geüploade documenten te analyseren, gegevens
> daaruit te extraheren naar het due-diligence-dossier, en concept-rapportages en -documenten te
> genereren. De AI-uitkomsten zijn concept en worden door de adviseur beoordeeld.
>
> **2. Ingeschakelde dienst.** De AI-verwerking vindt plaats bij Anthropic PBC (Verenigde Staten),
> via de Claude-modellen op de zakelijke API `api.anthropic.com`, waarbij Anthropic optreedt als
> data processor / sub-verwerker.
>
> **3. Welke gegevens.** Aan de AI-dienst worden voorgelegd: de inhoud van door of namens de adviseur
> geüploade documenten en de in het traject ingevoerde gegevens, voor zover nodig voor de in punt 1
> genoemde taken, en uitsluitend binnen de context van het betreffende traject.
>
> **4. Geen training.** De aangeleverde gegevens en documenten worden niet gebruikt voor het trainen
> of verbeteren van AI-modellen van Anthropic of van Bisschops Financing B.V.
>
> **5. Doorgifte buiten de EU.** Voor zover persoonsgegevens naar Anthropic PBC in de Verenigde
> Staten worden doorgegeven, gebeurt dit op basis van de EU Standard Contractual Clauses die deel
> uitmaken van het Data Processing Addendum tussen Bisschops Financing B.V. en Anthropic PBC.
>
> **6. Bewaring bij de AI-dienst.** Bisschops Financing B.V. maakt gebruik van de zakelijke API van
> Anthropic. Anthropic verwijdert invoer en uitvoer binnen dertig (30) dagen na ontvangst
> respectievelijk het genereren daarvan. Anthropic kan gegevens langer bewaren voor zover de wet dat
> vereist of voor zover een verzoek door de geautomatiseerde misbruikdetectie van Anthropic is
> gemarkeerd; in dat laatste geval worden invoer en uitvoer tot ten hoogste twee (2) jaar bewaard en
> classificatiescores tot ten hoogste zeven (7) jaar. Anthropic gebruikt deze gegevens niet voor
> modeltraining.
>
> **7. Menselijke tussenkomst.** Elke AI-uitkomst die naar een tegenpartij of cliënt gaat, wordt door
> de adviseur beoordeeld en vrijgegeven voordat deze wordt verzonden of gedeeld. Voor zover Bisschops
> Financing B.V. AI inzet in een verwerking waarvoor zij zelf verwerkingsverantwoordelijke is (de
> zelf-scan, zie punt 8), vindt daarbij geen uitsluitend geautomatiseerde besluitvorming plaats die
> voor de betrokkene rechtsgevolgen heeft of hem anderszins in aanmerkelijke mate treft in de zin van
> artikel 22 AVG.
>
> **8. Transparantie richting betrokkenen.**
> (a) Voor de M&A-trajecten, waarin de adviseur verwerkingsverantwoordelijke is en Bisschops
> Financing B.V. verwerker: de adviseur informeert zijn cliënten dat in het traject AI wordt ingezet
> voor documentanalyse en conceptgeneratie; het platform stelt daarvoor standaardtekst beschikbaar.
> (b) Voor verwerkingen waarvoor Bisschops Financing B.V. zelf verwerkingsverantwoordelijke is (de
> zelf-scan): Bisschops Financing B.V. informeert de betrokkene rechtstreeks via de privacyverklaring
> en een melding bij het scanresultaat.
>
> **9. Nauwkeurigheid.** AI-extractie kan onjuist of onvolledig zijn. Het platform markeert onzekere
> waarden als "niet vermeld" of "handmatig controleren" in plaats van een waarde te schatten. De
> adviseur controleert geëxtraheerde cijfers voordat hij ze in een waardering of document gebruikt.

### §3-verificatie — afgerond op 2026-09-10

| # | Te verifiëren | Uitkomst | Status |
|---|---|---|---|
| 1 | Aanvaarde Anthropic-stukken | Marcel bevestigt: **geen apart onderhandeld contract**. Het account draait op de standaard **Commercial Terms of Service** + het **Commercial Data Processing Addendum**, geaccepteerd bij het aanmaken van API-toegang. Het DPA bevat de EU Standard Contractual Clauses voor de VS-doorgifte. Anthropic publiceert de actuele sub-verwerkerslijst op zijn Trust Center / `anthropic.com/legal`. | 🟢 |
| 2 | Account-instelling ZDR | Screenshot Anthropic Console → Privacy controls (2026-09-10): **Data retention: "On · 30 days"** — Zero Data Retention staat **uit**, standaardretentie 30 dagen. "Allow user feedback" staat uit; het Development Partner Program is niet aangesloten (geen extra data-deling voor training). Claude Code metrics logging staat aan, maar dat betreft de dev-tooling van de beheerder, niet de platform-API-verwerking. De worker gebruikt uitsluitend `/v1/messages` met prompt caching — geen Files API, Batch API of code-execution. → **punt 6 = de 30-dagentekst** (voorheen "variant B"). | 🟢 |
| 3 | Model | De worker gebruikt `claude-sonnet-4-6` — geen "Covered Model" (alleen de Fable-/Mythos-modellen vereisen verplichte 30-dagenretentie), dus ZDR-geschikt indien later gewenst. | 🟢 |
| 4 | Artikel 22 AVG | Codedoorloop uitgevoerd (backend-modules + cron). Automatisch draaien: (a) een traject zonder activiteit wordt na 3 maanden + 14 dagen waarschuwing afgesloten en daarna gewist — een gegevens-lifecyclehandeling, geen besluit over de rechtspositie van een persoon; (b) AI-extractie en indicatieve waardering — concept, altijd door de adviseur beoordeeld, niets gaat naar een tegenpartij zonder handmatige vrijgave; (c) proefaccount goed/afkeuren, afspraak bevestigen, fase vrijgeven — telkens een menselijke klik. **Geen uitsluitend geautomatiseerd besluit met rechtsgevolg of aanmerkelijk effect voor een betrokkene.** Marcel bevestigt dat dit met de feitelijke werking klopt. Juridische kwalificatie ter toetsing bij de jurist. | 🟢 (feitelijk) |
| 5 | Rolverdeling verwerkingsverantwoordelijke/verwerker | M&A-platform → adviseur = verwerkingsverantwoordelijke, Bisschops Financing = verwerker (VOK). Zelf-scan → Bisschops Financing = verwerkingsverantwoordelijke (privacyverklaring). Punt 8 is daarop gesplitst (8a/8b). | ter toetsing jurist |

### Gebronde Anthropic-feiten (publiek, als referentie voor de verificatie)

- **Standaardretentie zakelijke API:** invoer en uitvoer worden **binnen 30 dagen** na ontvangst/generatie van de back-end verwijderd. ([Anthropic Privacy Center — commercial data retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data))
- **Gemarkeerde content (trust & safety):** ook onder ZDR/HIPAA kan Anthropic invoer en uitvoer **tot 2 jaar** bewaren als een verzoek door de geautomatiseerde misbruikdetectie is gemarkeerd; **classificatiescores tot 7 jaar**. ([Anthropic — API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention); [Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data))
- **ZDR:** voor de Claude API is Zero Data Retention beschikbaar; conversatie-inhoud wordt dan niet at-rest opgeslagen na het API-antwoord. Geldt niet voor "Covered Models" (Fable/Mythos) en niet voor stateful features (Files API, Batch API, code execution). ([Anthropic — API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention))
- **Training:** de Commercial Terms bepalen dat Anthropic geen modellen traint op "Customer Content from Services"; API-prompts en -outputs worden niet gebruikt voor training. ([Anthropic Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms))
- **Prompt caching** (de worker gebruikt dit): ZDR-geschikt; prompts/outputs worden niet opgeslagen, alleen KV-cacherepresentaties en hashes voor de cache-TTL, daarna direct verwijderd. ([Anthropic — API and data retention, feature eligibility](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention))

### Vraag aan de jurist

- De feitelijke verificatie (punten 1 t/m 4) is afgerond; akkoord met de bijlagetekst zoals die er
  nu staat, met de 30-dagenformulering in punt 6?
- Is de juridische kwalificatie "geen artikel 22-verwerking" houdbaar gegeven de feitelijke
  beschrijving in punt 4?
- Is de gesplitste transparantiebepaling (punt 8a/8b) de juiste manier om de dubbele rol van
  Bisschops Financing (verwerker bij M&A, verwerkingsverantwoordelijke bij de scan) te ondervangen?
- Blijven VOK-artikel 3 en 6 staan met een verwijzing naar deze bijlage (voorkeur), of samenvoegen?

---

## Onderdeel 4 — Bewaartermijn per traject (VOK Artikel 5)  🟢 in beginsel (redactie aangescherpt)

**Wat het regelt:** de standaard is 14 dagen na afsluiting, daarna volledige verwijdering. Er is nu
een technische mogelijkheid om per traject, alleen door de beheerder, een langere bewaartermijn te
zetten (ten hoogste 365 dagen). De knop is inert tot de VOK dit dekt.

### Herziene voorgestelde vervangende tekst voor de bewaartermijn-passage in Artikel 5

> Geüploade documenten en alle overige trajectgegevens worden bewaard gedurende het traject en
> gedurende veertien (14) dagen na afsluiting daarvan. In die periode wordt een volledig dossier
> eenmalig als downloadbaar bestand aan Gebruiker beschikbaar gesteld.
>
> Op **schriftelijk verzoek van Gebruiker** kan deze bewaartermijn voor een concreet traject worden
> verlengd, indien en voor zover Gebruiker daarbij een **concrete noodzaak** aangeeft — zoals een
> lopend of dreigend geschil ten aanzien van de betreffende transactie, of een op Gebruiker rustende
> wettelijke bewaarplicht die Gebruiker via het platform wenst na te komen. De verlenging wordt
> vastgelegd voor een **bepaalde termijn van ten hoogste driehonderdvijfenzestig (365) dagen** na
> afsluiting van het traject. De verlenging **eindigt** op de overeengekomen einddatum, dan wel
> zodra de aangegeven noodzaak is komen te vervallen indien dat eerder is; Gebruiker meldt dat laatste
> zonder onredelijke vertraging aan Bisschops Financing B.V.
>
> Na afloop van de toepasselijke termijn (de standaardtermijn van veertien dagen, dan wel de
> overeengekomen verlengde termijn) worden alle trajectgegevens **definitief van het platform
> verwijderd**, met uitzondering van de in dit artikel genoemde beperkte archiefregel.

De overige zinnen van Artikel 5 (archiefregel, eigen bewaarplicht adviseur, drie-maanden-inactiviteit,
back-upretentie van 60 dagen) blijven ongewijzigd.

### Bijbehorende bepaling in de GV (opslagvergoeding)

> Voor een op verzoek van Gebruiker verlengde bewaartermijn als bedoeld in artikel 5 van de
> Verwerkersovereenkomst brengt Koers voor Morgen een opslagvergoeding in rekening conform het op dat
> moment geldende tarievenoverzicht; deze bedraagt thans € 25 per aangevangen maand per traject,
> gerekend vanaf de vijftiende dag na afsluiting. Deze vergoeding is de commerciële tegenprestatie
> voor de langere opslag; zij schept op zichzelf geen recht op bewaring. De toelaatbaarheid en de
> duur van de verlengde bewaring worden bepaald door artikel 5 van de Verwerkersovereenkomst en de
> daarin bedoelde concrete noodzaak.

### Wat is aangepast t.o.v. v1

De vijf door de review gevraagde elementen zijn nu expliciet:
1. **Wie** — schriftelijk verzoek van Gebruiker (de adviseur).
2. **Waarom** — concrete noodzaak; lopend/dreigend geschil of wettelijke bewaarplicht op Gebruiker.
3. **Hoe lang** — bepaalde termijn, ten hoogste 365 dagen na afsluiting, vastgelegd.
4. **Einde** — de overeengekomen einddatum, of eerder zodra de noodzaak vervalt (meldplicht Gebruiker).
5. **Verwijdering** — na afloop definitieve verwijdering van het platform, behoudens de archiefregel.
6. **Fee-zin genuanceerd** — betaling schept geen recht op bewaring; de verwerkingsgrond blijft
   leidend, de € 25/maand is enkel de commerciële consequentie.

### Vraag aan de jurist

- Is "concrete noodzaak" met deze twee voorbeelden voldoende afgebakend, of wilt u een limitatieve
  opsomming?
- Akkoord met de meldplicht bij het vervallen van de noodzaak, en met "per aangevangen maand" als
  rekeneenheid?

---

## Herziene volgorde van doorvoeren (na jurist-akkoord)

Per onderdeel: versieophoging van het betreffende document, bestaande audits, eerst staging, dan
productie.

1. **Onderdeel 3 (AI-bijlage)** — §3-verificatie is afgerond; na jurist-akkoord: de bijlage bij de
   VOK + de verwijzingen in artikel 3 en 6.
2. **Onderdeel 1 (handelsnaam-zin)** — in AV, GV, VOK, PV, PRIV.
3. **Onderdeel 2 (reliance-clausule)** — in AV en GV, plus de korte variant in de documentvoettekst.
4. **Onderdeel 4 (VOK Artikel 5 + GV-opslagvergoeding)** — ✅ **live sinds 2026-09-10** (VOK v1.6,
   GV v2.1); de technische koppeling die de € 25/maand automatisch boekt is meegebouwd.

---

## Status van de verificatie voor onderdeel 3 (afgerond 2026-09-10)

- **Anthropic-voorwaarden:** geen apart contract; standaard Commercial Terms of Service + Commercial
  DPA (met SCC's). Marcel bevestigd.
- **Zero Data Retention:** staat uit (Anthropic Console → Privacy controls, gecontroleerd 2026-09-10:
  "Data retention — Organization default: On · 30 days"). → 30-dagenretentie in de bijlage.
- **Artikel 22 AVG:** codedoorloop uitgevoerd, geen uitsluitend geautomatiseerd besluit met
  rechtsgevolg. Marcel bevestigt de feitelijke werking. Juridische kwalificatie ter toetsing bij de
  jurist.
- **Nog openstaand puntje buiten onderdeel 3:** de AV (`voorwaarden.html`) noemt nog een platte
  14-dagentermijn — consistentie-aanpassing meenemen in jurist-ronde 2.
