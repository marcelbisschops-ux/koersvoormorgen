const ALLOWED_ORIGINS = [
  'https://koersvoormorgen.nl',
  'https://www.koersvoormorgen.nl',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];


// =====================================================
// BISSCHOPS FINANCING ECHTE DOCUMENT TEMPLATES
// Bron: BF feb 2026 documenten (upload Marcel Bisschops)
// =====================================================
const BF_TEMPLATES = {
  nda: `GEHEIMHOUDINGSOVEREENKOMST (NDA)
Partijen
[Naam Verstrekkende Partij], gevestigd te [adres], hierna: “Verstrekkende Partij”;
[Naam Ontvangende Partij], gevestigd te [adres], hierna: “Ontvangende Partij”;
Hierna gezamenlijk: “Partijen”.
Artikel 1 – Doel
Partijen overwegen een mogelijke Transactie en zullen in dat kader vertrouwelijke informatie uitwisselen. Deze overeenkomst regelt de geheimhouding en het gebruik van deze informatie.
Artikel 2 – Vertrouwelijke informatie
Onder vertrouwelijke informatie wordt verstaan alle informatie, ongeacht vorm, waaronder begrepen:
financiële gegevens;
bedrijfsinformatie;
contracten;
klanten- en leveranciersgegevens;
strategische plannen;
mondeling verstrekte informatie.
Informatie geldt ook als vertrouwelijk indien deze:
redelijkerwijs als vertrouwelijk moet worden beschouwd;
voortvloeit uit analyse van ontvangen informatie.
Artikel 3 – Verplichtingen Ontvangende Partij
De Ontvangende Partij zal:
vertrouwelijke informatie strikt geheimhouden;
deze uitsluitend gebruiken voor beoordeling van de mogelijke Transactie;
de informatie niet delen met derden, behoudens:
werknemers;
adviseurs;
financiers;
mits deze gebonden zijn aan een gelijkwaardige geheimhoudingsplicht.
Artikel 4 – Uitzonderingen
De geheimhoudingsplicht geldt niet voor informatie die:
reeds openbaar was;
rechtmatig van derden is verkregen;
onafhankelijk is ontwikkeld;
openbaar moet worden gemaakt op grond van wet of rechterlijk bevel (met voorafgaande kennisgeving indien toegestaan).
Artikel 5 – Duur
Deze geheimhoudingsverplichtingen gelden gedurende drie (3) jaar na ondertekening. Bedrijfsgeheimen blijven vertrouwelijk zolang zij hun vertrouwelijke karakter behouden.
Artikel 6 – Teruggave informatie
Op eerste verzoek zal de Ontvangende Partij:
alle ontvangen informatie retourneren of vernietigen;
schriftelijk bevestigen dat dit is gebeurd.
Artikel 7 – Geen verplichting tot transactie
Deze overeenkomst verplicht Partijen niet tot het aangaan van een Transactie.
Artikel 8 – Boetebeding
Bij overtreding van de geheimhoudingsplicht verbeurt de Ontvangende Partij een direct opeisbare boete van € 25.000 per overtreding, vermeerderd met € 2.500 voor iedere dag dat de overtreding voortduurt.
Deze boete laat onverlet het recht van de Verstrekkende Partij om daarnaast vergoeding van de daadwerkelijk geleden schade te vorderen, voor zover deze de boete overstijgt.
Artikel 9 – Rechtskeuze en forum
Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.
Ondertekening
Plaats: ____________________ Datum: ____________________
Verstrekkende Partij
Naam: ____________________
Handtekening: ____________________
Ontvangende Partij
Naam: ____________________
Handtekening: ____________________`,

  loi: `INTENTIEVERKLARING (LETTER OF INTENT)
Partijen
[Naam Koper], gevestigd te [adres], rechtsgeldig vertegenwoordigd door [naam], hierna: “Koper”;
[Naam Verkoper], gevestigd te [adres], rechtsgeldig vertegenwoordigd door [naam], hierna: “Verkoper”;
In aanwezigheid van en begeleid door Bisschops Financing B.V.
Artikel 1 – Doel en Transactie
Partijen hebben de intentie om te komen tot een transactie waarbij Koper 100% van de aandelen in [Naam Target B.V.] zal verwerven van Verkoper (de “Transactie”).
Artikel 2 – Indicatieve Koopprijs
Op basis van de huidige informatie biedt Koper een indicatieve koopprijs van € [Bedrag] (Cash-and-Debt-Free basis).
Deze prijs is gebaseerd op een genormaliseerde EBITDA van € [Bedrag] en een multiple van [X].
De definitieve prijs wordt vastgesteld na afronding van het Due Diligence onderzoek.
Artikel 3 – Voorwaarden (Conditions Precedent)
De definitieve Transactie is afhankelijk van de vervulling van de volgende opschortende voorwaarden:
Succesvolle afronding van het Due Diligence onderzoek (financieel, fiscaal, juridisch en operationeel) naar tevredenheid van Koper.
Het verkrijgen van passende financiering door Koper.
Overeenstemming over de definitieve Koopovereenkomst (SPA).
[Optioneel] Goedkeuring door de Autoriteit Consument & Markt (ACM) of andere toezichthouders.
Artikel 4 – Due Diligence en Tijdlijn
Verkoper verleent Koper en haar adviseurs toegang tot alle relevante informatie (via een Data Room) om het boekenonderzoek uit te voeren.
Start Due Diligence: [Datum]
Streefdatum Closing: [Datum]
Artikel 5 – Exclusiviteit
Gedurende de periode tot [Datum] (de “Exclusiviteitsperiode”) verleent Verkoper aan Koper exclusiviteit. Verkoper zal gedurende deze periode niet met derden onderhandelen over een vergelijkbare transactie.
(Zie ook de separate Exclusiviteitsbrief indien van toepassing).
Artikel 6 – Bindend vs. Niet-bindend
Niet-bindend: De voornemens in Artikel 1, 2 en 3 zijn uitsluitend intenties en scheppen geen juridische verplichting tot het tot stand brengen van de Transactie. Partijen kunnen zich te allen tijde terugtrekken zonder schadeplichtig te zijn (behoudens in geval van misbruik van recht).
Bindend: De bepalingen in Artikel 4 (Toegang), 5 (Exclusiviteit), 7 (Kosten), 8 (Geheimhouding) en 9 (Recht) zijn juridisch bindend.
Artikel 7 – Kosten
Iedere partij draagt haar eigen kosten in verband met deze LOI, het Due Diligence onderzoek en de onderhandelingen.
(Let op: Indien je voor de Verkoper werkt met "Kosten Koper", moet hier staan dat Koper de bemiddelingskosten van Bisschops Financing draagt bij closing).
Artikel 8 – Geheimhouding
De eerder getekende Geheimhoudingsovereenkomst (NDA) d.d. [Datum] blijft onverminderd van kracht.
Artikel 9 – Rechtskeuze en Forum
Op deze intentieverklaring is Nederlands recht van toepassing. Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.
Ondertekening
Plaats: ____________________ Datum: ____________________
Koper
Naam: ____________________
Handtekening: ____________________
Verkoper
Naam: ____________________
Handtekening: ____________________`,

  bem_verk: `BEMIDDELINGSOVEREENKOMST VERKOOP
(OPDRACHTGEVER – SELL-SIDE MANDATE)
Artikel 1 – Partijen
[Naam Opdrachtgever], gevestigd te [adres], rechtsgeldig vertegenwoordigd door [naam], hierna te noemen: “Opdrachtgever”;
Bisschops Financing B.V., gevestigd te Grotestraat 13, 5841AA Oploo, hierna te noemen: “Bisschops Financing”;
Opdrachtgever en Bisschops Financing hierna gezamenlijk te noemen: “Partijen”.
Artikel 2 – Opdracht en doel
Opdrachtgever verstrekt aan Bisschops Financing de exclusieve opdracht tot het begeleiden van de verkoop van (de aandelen in) de onderneming, activiteiten of vermogensbestanddelen.
De werkzaamheden van Bisschops Financing richten zich primair op procesbegeleiding en omvatten:
analyse van de onderneming en bepalen van de verkoopstrategie;
opstellen van informatiemateriaal (teaser en informatiememorandum);
structureren en begeleiden van het verkoopproces;
ondersteuning bij onderhandelingen tot en met closing.
Op de werkzaamheden rust uitsluitend een inspanningsverplichting en geen resultaatsverplichting.
Artikel 3 – Looptijd en Exclusiviteit
Deze overeenkomst wordt aangegaan voor een initiële exclusieve periode van vier (4) maanden.
Na afloop van deze periode wordt de overeenkomst stilzwijgend voortgezet voor onbepaalde tijd, met een opzegtermijn van één (1) maand.
Gedurende de looptijd van de overeenkomst zal Opdrachtgever:
geen andere M&A-adviseur of bemiddelaar inschakelen voor een vergelijkbare opdracht;
geen onderhandelingen voeren zonder directe betrokkenheid van Bisschops Financing;
potentiële kopers die zich rechtstreeks melden direct doorverwijzen naar Bisschops Financing.
Artikel 4 – Introductie en bescherming
Een Potentiële Koper geldt als door Bisschops Financing geïntroduceerd zodra identificerende gegevens door Bisschops Financing aan Opdrachtgever zijn verstrekt of een ontmoeting tot stand is gebracht.
Indien een Potentiële Koper reeds bij Opdrachtgever bekend is en in de zes (6) maanden voorafgaand aan de Introductie aantoonbaar contact heeft plaatsgevonden, dient Opdrachtgever dit binnen vijf (5) werkdagen na Introductie schriftelijk en met bewijsstukken aan Bisschops Financing te melden.
Bij gebreke van een tijdige en volledige melding wordt de Potentiële Koper onweerlegbaar geacht door Bisschops Financing te zijn geïntroduceerd.
Artikel 5 – Vergoedingen
Geen Succesfee voor Opdrachtgever: Opdrachtgever is aan Bisschops Financing geen succesfee verschuldigd bij het tot stand komen van een Transactie. Bisschops Financing zal haar honorarium voor de bemiddeling verhalen op de Kopende Partij.
Extra werkzaamheden (Uurtarief): Indien Opdrachtgever wenst dat Bisschops Financing werkzaamheden verricht die buiten de in Artikel 2 genoemde scope vallen, kan dit op basis van uurtarief worden overeengekomen. Dit geldt ongeacht of het verkooptraject volgens verwachting verloopt.
Voorbeelden van extra werk: Het actief benaderen van specifieke marktpartijen op verzoek van Opdrachtgever, extra financiële analyses of aanpassingen aan het informatiememorandum na eerdere goedkeuring, of intensieve begeleiding bij complexe vraagstukken die buiten de standaard procesregie vallen.
Beperking: Conform Artikel 3 van de Algemene Voorwaarden omvat dit extra werk nooit werkzaamheden die zijn voorbehouden aan accountants, fiscalisten of advocaten (zoals due diligence rapportages, belastingadvies of het opstellen van SPA's).
Tarief: Dit geschiedt uitsluitend na expliciete opdracht en tegen een tarief van € 250 exclusief btw per uur.
Artikel 6 – Beëindiging zonder Transactie
Indien de overeenkomst eindigt zonder dat een Transactie tot stand komt, is Opdrachtgever uitsluitend kosten verschuldigd in de volgende gevallen ("Break-fee"):
Intrekking: Indien Opdrachtgever de opdracht intrekt of beëindigt terwijl er concrete interesse is van Potentiële Kopers;
Weigering: Indien Opdrachtgever een marktconform bod weigert dat voldoet aan de vooraf vastgestelde criteria;
Toerekenbare tekortkoming: Indien het proces vastloopt door onjuiste informatieverstrekking of obstructie door Opdrachtgever.
In deze gevallen is Opdrachtgever aan Bisschops Financing een vergoeding verschuldigd van de daadwerkelijk bestede uren (à € 250/uur), met een minimum van € 5.000 exclusief btw.
Artikel 7 – Informatieverstrekking en vrijwaring
Opdrachtgever staat in voor de juistheid, volledigheid en tijdigheid van de aan Bisschops Financing verstrekte informatie. Opdrachtgever vrijwaart Bisschops Financing voor alle schade en aanspraken van derden die voortvloeien uit onjuiste of onvolledige informatieverstrekking.
Artikel 8 – Toepasselijkheid Algemene Voorwaarden
Op deze overeenkomst zijn de hieronder opgenomen Algemene Voorwaarden van Bisschops Financing B.V. integraal van toepassing.
In geval van strijdigheid tussen deze Overeenkomst en de Algemene Voorwaarden, prevaleren de bepalingen uit deze Overeenkomst.
Artikel 9 – Rechtskeuze en forum
Op deze overeenkomst is uitsluitend Nederlands recht van toepassing. Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.
Ondertekening
Plaats: ____________________ Datum: ____________________
Opdrachtgever
Naam: ____________________
Handtekening: ____________________
Bisschops Financing B.V.
Naam: ____________________
Handtekening: ____________________
ALGEMENE VOORWAARDEN
Bisschops Financing B.V.
Artikel 1 – Toepasselijkheid
Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, offertes, opdrachten, overeenkomsten en werkzaamheden van Bisschops Financing B.V. (hierna: Bisschops Financing).
Deze voorwaarden gelden mede ten behoeve van alle aan Bisschops Financing verbonden personen en rechtspersonen, waaronder bestuurders, aandeelhouders, werknemers, adviseurs en ingeschakelde derden.
Afwijkingen van deze voorwaarden zijn slechts geldig indien schriftelijk overeengekomen.
De toepasselijkheid van algemene voorwaarden van de wederpartij wordt uitdrukkelijk uitgesloten.
Artikel 2 – Definities
Opdrachtgever: De natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met Bisschops Financing, alsmede iedere rechtspersoon of persoon namens wie wordt gehandeld of die economisch met de opdracht is verbonden.
Gelieerde Entiteit: Iedere rechtspersoon of natuurlijke persoon die direct of indirect organisatorisch, juridisch, financieel of economisch is verbonden aan Opdrachtgever.
Introductie: Het moment waarop Bisschops Financing identificerende gegevens van een potentiële koper, verkoper, investeerder, target of andere transactiedeelnemer verstrekt, dan wel een ontmoeting of contact tot stand brengt.
Transactie: Iedere juridische of economische overdracht, participatie, samenwerking of gelijkwaardige constructie (aandelen, activa/passiva, fusie, etc.).
Transactiewaarde: De totale economische waarde van de Transactie, inclusief vaste koopsom, maximale earn-out, uitgestelde betalingen, vendor loans, overgenomen schulden en overige economische voordelen.
Artikel 3 – Aard van de dienstverlening
Bisschops Financing verricht haar werkzaamheden naar beste inzicht en vermogen op basis van een inspanningsverplichting.
Bisschops Financing treedt niet op als accountant, fiscalist, advocaat of Register Valuator. Eventuele adviezen van Bisschops Financing kunnen nimmer als zodanig worden opgevat.
Opdrachtgever blijft volledig verantwoordelijk voor due diligence, risicobeoordeling, fiscale/juridische toetsing en de uiteindelijke besluitvorming.
Artikel 4 – Vergoedingen en betaling
Tenzij schriftelijk anders overeengekomen gelden de volgende tarieven voor werkzaamheden op regiebasis:
uurtarief: € 250 exclusief btw;
reiskosten: € 0,35 per kilometer;
reistijd: 50% van het geldende uurtarief.
Facturen dienen te worden voldaan binnen veertien (14) dagen na factuurdatum.
Bij niet-tijdige betaling is Opdrachtgever van rechtswege in verzuim en is wettelijke handelsrente en incassokosten verschuldigd.
Artikel 5 – Succesfee en nawerking
Indien een Transactie tot stand komt met een door Bisschops Financing geïntroduceerde of betrokken partij, is de overeengekomen succesfee verschuldigd.
Dit recht blijft bestaan gedurende vierentwintig (24) maanden na de Introductie of beëindiging van de overeenkomst (nawerking).
Indien na ondertekening van een intentieverklaring (LOI) geen Transactie tot stand komt als rechtstreeks gevolg van:
een aan Opdrachtgever toerekenbare tekortkoming;
het afbreken van onderhandelingen in strijd met redelijkheid en billijkheid;
het omzeilen van Bisschops Financing;
is Opdrachtgever aan Bisschops Financing een vergoeding verschuldigd gelijk aan 50% van de overeengekomen succesfee (of de geschatte succesfee bij een marktconforme transactie).
Artikel 6 – Anti-omzeiling
Indien een Transactie direct of indirect wordt gerealiseerd via een Gelieerde Entiteit of alternatieve structuur, blijft de volledige succesfee verschuldigd.
Daarnaast verbeurt Opdrachtgever een direct opeisbare boete van € 25.000, onverminderd het recht op volledige schadevergoeding.
Artikel 7 – Aansprakelijkheid
Iedere aansprakelijkheid is uitgesloten, behoudens in geval van opzet of bewuste roekeloosheid van de leiding.
Aansprakelijkheid is beperkt tot uitsluitend directe schade. Indirecte schade (zoals gederfde winst, gemiste besparingen of bedrijfsstagnatie) is uitdrukkelijk uitgesloten.
Iedere aanspraak vervalt indien deze niet binnen twaalf (12) maanden na ontdekking schriftelijk is gemeld.
Artikel 8 – Geheimhouding
Partijen verplichten zich tot strikte geheimhouding van alle vertrouwelijke informatie, ook na beëindiging van de overeenkomst.
Artikel 9 – Rechtskeuze en forum
Op alle rechtsverhoudingen is uitsluitend Nederlands recht van toepassing.
Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.`,

  bem_koper: `BEMIDDELINGSOVEREENKOMST AANKOOP
(OPDRACHTGEVER – BUY-SIDE MANDATE)
Partijen
[Naam Opdrachtgever], gevestigd te [adres], rechtsgeldig vertegenwoordigd door [naam], hierna te noemen: “Opdrachtgever”;
Bisschops Financing B.V., gevestigd te Grotestraat 13, 5841AA Oploo, hierna te noemen: “Bisschops Financing”;
Opdrachtgever en Bisschops Financing hierna gezamenlijk te noemen: “Partijen”.
Artikel 1 – Opdracht en doel
Opdrachtgever verstrekt aan Bisschops Financing de opdracht tot het identificeren, benaderen en begeleiden van mogelijke Targets met het oog op het realiseren van een Transactie.
De werkzaamheden van Bisschops Financing omvatten onder meer, doch niet uitsluitend:
het vaststellen van zoekprofiel en investeringscriteria;
het selecteren en analyseren van potentiële Targets;
het tot stand brengen van introducties en eerste contacten;
het structureren en begeleiden van het acquisitieproces;
het ondersteunen van onderhandelingen tot en met closing;
het afstemmen met juridische, fiscale en financiële adviseurs.
Op de werkzaamheden rust uitsluitend een inspanningsverplichting en geen resultaatsverplichting.
Artikel 2 – Introductie en bescherming
Een Target geldt als door Bisschops Financing geïntroduceerd zodra identificerende gegevens door Bisschops Financing aan Opdrachtgever zijn verstrekt of een ontmoeting tot stand is gebracht.
Indien een Target reeds bij Opdrachtgever bekend is en in de zes (6) maanden voorafgaand aan de Introductie aantoonbaar contact heeft plaatsgevonden, dient Opdrachtgever dit binnen vijf (5) werkdagen na Introductie schriftelijk en met bewijsstukken aan Bisschops Financing te melden.
Bij gebreke van een tijdige en volledige melding wordt de Target onweerlegbaar geacht door Bisschops Financing te zijn geïntroduceerd.
Artikel 3 – Voorfasevergoeding en start van het traject
Een voorfasevergoeding wordt uitsluitend verschuldigd indien:
een eerste inhoudelijke kennismaking tussen Opdrachtgever en een door Bisschops Financing geïntroduceerde Target heeft plaatsgevonden; en
naar het oordeel van Bisschops Financing sprake is van wederzijdse intentie om het traject voort te zetten.
Van wederzijdse intentie is in ieder geval sprake indien:
aanvullende informatie wordt uitgewisseld;
vervolggesprekken worden gepland of gevoerd;
due diligence wordt voorbereid of gestart;
waardering, structuur of voorwaarden worden besproken;
anderszins blijkt dat partijen het traject wensen voort te zetten.
De vaststelling van wederzijdse intentie wordt door Bisschops Financing na schriftelijk akkoord van Opdrachtgever, waaronder per e-mail, bevestigd.
Vanaf het moment van deze bevestiging:
wordt de voorfasevergoeding verschuldigd;
geldt volledige bescherming van succesfee, nawerking en anti-omzeiling.
Partijen kiezen vooraf één van de volgende vergoedingsstructuren:
[ ] Optie A – Vaste startvergoeding: Een eenmalige, niet-verrekenbare vergoeding van € 10.000 exclusief btw.
[ ] Optie B – Regiebasis: Vergoeding op basis van bestede tijd en kosten conform de Algemene Voorwaarden.
Indien geen wederzijdse intentie ontstaat, is geen voorfasevergoeding verschuldigd.
Artikel 4 – Communicatie en exclusieve betrokkenheid
Vanaf het moment waarop wederzijdse intentie is vastgesteld, verloopt alle communicatie met de Target uitsluitend via Bisschops Financing, tenzij Partijen schriftelijk anders overeenkomen.
Opdrachtgever zal geen rechtstreekse onderhandelingen voeren zonder betrokkenheid van Bisschops Financing.
Artikel 5 – Succesfee
Bij het tot stand komen van een Transactie is Opdrachtgever aan Bisschops Financing een succesfee verschuldigd, berekend over de volledige Transactiewaarde volgens onderstaande staffel:
5% over de eerste € 1.000.000;
4% over de volgende € 1.000.000;
3% over het deel van € 2.000.000 tot € 5.000.000;
2% over het meerdere boven € 5.000.000.
De succesfee bedraagt minimaal € 25.000 exclusief btw.
Earn-out en uitgestelde componenten
De succesfee wordt berekend over de maximaal overeengekomen Transactiewaarde, inclusief:
earn-out-regelingen;
vendor loans;
uitgestelde betalingen;
economisch gelijkwaardige vergoedingen.
De succesfee vormt een onvoorwaardelijke betalingsverplichting van Opdrachtgever.
Betaling geschiedt overeenkomstig de betalingsmomenten van de Transactie, tenzij schriftelijk anders overeengekomen.
Artikel 6 – Beëindiging vóór closing
Indien de overeenkomst eindigt zonder closing, is Opdrachtgever aan Bisschops Financing verschuldigd:
vergoeding van bestede uren conform de Algemene Voorwaarden;
met een minimum van € 5.000 exclusief btw.
Een eventueel verschuldigde startvergoeding (zoals bedoeld in Artikel 3) blijft volledig verschuldigd.
Artikel 7 – Due diligence en verantwoordelijkheid
Opdrachtgever blijft volledig verantwoordelijk voor:
eigen onderzoek;
beoordeling van risico’s;
besluitvorming;
inschakeling van adviseurs.
Bisschops Financing aanvaardt geen aansprakelijkheid voor onjuistheden in door derden verstrekte informatie.
Artikel 8 – Geheimhouding
Opdrachtgever behandelt alle ontvangen informatie strikt vertrouwelijk.
Informatie wordt uitsluitend gebruikt voor het doel van de mogelijke Transactie.
Artikel 9 – Toepasselijkheid Algemene Voorwaarden
Op deze overeenkomst zijn de Algemene Voorwaarden van Bisschops Financing B.V. integraal van toepassing.
Bij strijdigheid prevaleren de bepalingen uit de Algemene Voorwaarden.
Artikel 10 – Rechtskeuze en forum
Op deze overeenkomst is Nederlands recht van toepassing.
Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.
Artikel 11 – Slotbepalingen
Wijzigingen zijn slechts geldig indien schriftelijk overeengekomen.
Indien een bepaling nietig blijkt, blijven overige bepalingen onverminderd van kracht.
Ondertekening
Plaats: ____________________ Datum: ____________________
Opdrachtgever
Naam: ____________________
Handtekening: ____________________
Bisschops Financing B.V.
Naam: ____________________
Handtekening: ____________________
ALGEMENE VOORWAARDEN
Bisschops Financing B.V.
Artikel 1 – Toepasselijkheid
Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, offertes, opdrachten, overeenkomsten en werkzaamheden van Bisschops Financing B.V. (hierna: Bisschops Financing).
Deze voorwaarden gelden mede ten behoeve van alle aan Bisschops Financing verbonden personen en rechtspersonen, waaronder bestuurders, aandeelhouders, werknemers, adviseurs en ingeschakelde derden.
Afwijkingen van deze voorwaarden zijn slechts geldig indien schriftelijk overeengekomen.
De toepasselijkheid van algemene voorwaarden van de wederpartij wordt uitdrukkelijk uitgesloten.
Artikel 2 – Definities
Opdrachtgever: De natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met Bisschops Financing, alsmede iedere rechtspersoon of persoon namens wie wordt gehandeld of die economisch met de opdracht is verbonden.
Gelieerde Entiteit: Iedere rechtspersoon of natuurlijke persoon die direct of indirect organisatorisch, juridisch, financieel of economisch is verbonden aan Opdrachtgever, waaronder groepsmaatschappijen, deelnemingen, holdings en bestuurdersvennootschappen.
Introductie: Het moment waarop Bisschops Financing identificerende gegevens van een potentiële koper, verkoper, investeerder, target of andere transactiedeelnemer verstrekt, dan wel een ontmoeting of contact tot stand brengt.
Transactie: Iedere juridische of economische overdracht, participatie, samenwerking of gelijkwaardige constructie, waaronder begrepen maar niet beperkt tot:
aandelenoverdracht;
activa-passiva-transacties;
overdracht van activiteiten, personeel, contracten of goodwill;
fusies, splitsingen of joint ventures;
participaties of financieringsstructuren;
iedere andere constructie die economisch gelijkstaat aan verkoop, investering of toetreding.
Transactiewaarde: De totale economische waarde van de Transactie, waaronder mede begrepen:
vaste koopsom;
earn-outregelingen gewaardeerd tegen de maximaal overeengekomen waarde;
uitgestelde betalingen en vendor loans;
overgenomen schulden of verplichtingen;
management-, consultancy-, huur- of leasevergoedingen en overige waardeoverdrachten;
ieder ander economisch voordeel samenhangend met de Transactie, ongeacht juridische vorm of betalingsmoment.
Artikel 3 – Aard van de dienstverlening
Bisschops Financing verricht haar werkzaamheden naar beste inzicht en vermogen.
Op alle werkzaamheden rust uitsluitend een inspanningsverplichting en nadrukkelijk geen resultaatsverplichting.
Bisschops Financing treedt niet op als accountant, fiscalist, advocaat, notaris of Register Valuator en verstrekt geen assurance-, waarderings- of certificeringsverklaringen.
Opdrachtgever blijft volledig verantwoordelijk voor:
het uitvoeren van due diligence;
het inwinnen van juridisch, fiscaal en financieel advies;
de uiteindelijke besluitvorming omtrent een Transactie.
Artikel 4 – Vergoedingen en betaling
Tenzij schriftelijk anders overeengekomen gelden de volgende tarieven:
uurtarief: € 250 exclusief btw;
reiskosten: € 0,35 per kilometer;
reistijd: 50% van het geldende uurtarief.
Facturen dienen te worden voldaan binnen veertien (14) dagen na factuurdatum.
Bij niet-tijdige betaling is Opdrachtgever van rechtswege in verzuim en is verschuldigd:
wettelijke handelsrente;
buitengerechtelijke incassokosten conform de wet.
Betalingen strekken eerst in mindering op kosten en rente en vervolgens op de hoofdsom.
Artikel 5 – Succesfee en nawerking
Indien een Transactie tot stand komt met een door Bisschops Financing geïntroduceerde of betrokken partij, is Opdrachtgever de overeengekomen succesfee verschuldigd.
Dit recht blijft bestaan gedurende vierentwintig (24) maanden na:
de Introductie; of
beëindiging van de overeenkomst.
Indien na ondertekening van een intentieverklaring, term sheet of vergelijkbaar document geen Transactie tot stand komt als rechtstreeks gevolg van:
een aan Opdrachtgever toerekenbare tekortkoming;
het afbreken van onderhandelingen in strijd met redelijkheid en billijkheid;
het omzeilen van Bisschops Financing;
is Opdrachtgever aan Bisschops Financing een vergoeding verschuldigd gelijk aan 50% van de overeengekomen succesfee, onverminderd het recht op aanvullende schadevergoeding indien de werkelijke schade hoger is.
Artikel 6 – Anti-omzeiling
Indien een Transactie direct of indirect wordt gerealiseerd via:
een Gelieerde Entiteit;
een alternatieve juridische structuur;
een economisch gelijkwaardige constructie;
blijft de volledige succesfee verschuldigd.
Daarnaast verbeurt Opdrachtgever een direct opeisbare boete van € 25.000, onverminderd het recht op volledige schadevergoeding.
De boete is cumulatief en treedt niet in de plaats van schadevergoeding.
Artikel 7 – Aansprakelijkheid
Iedere aansprakelijkheid van Bisschops Financing is, behoudens in geval van opzet of bewuste roekeloosheid van de leiding, uitgesloten.
Indien en voor zover ondanks het voorgaande aansprakelijkheid wordt aangenomen, is deze beperkt tot uitsluitend directe schade.
Aansprakelijkheid voor indirecte schade is uitdrukkelijk uitgesloten, waaronder begrepen:
gevolgschade;
gederfde winst;
gemiste besparingen;
reputatieschade;
schade door bedrijfsstagnatie.
Iedere aanspraak op schadevergoeding vervalt indien deze niet binnen twaalf (12) maanden na ontdekking schriftelijk bij Bisschops Financing is gemeld.
Artikel 8 – Geheimhouding
Partijen verplichten zich tot strikte geheimhouding van alle vertrouwelijke informatie die zij in het kader van de opdracht verkrijgen.
Vertrouwelijke informatie wordt uitsluitend gebruikt voor het doel waarvoor deze is verstrekt.
Deze verplichting blijft van kracht na beëindiging van de overeenkomst.
Artikel 9 – Rechtskeuze en forum
Op alle rechtsverhoudingen tussen Opdrachtgever en Bisschops Financing is uitsluitend Nederlands recht van toepassing.
Geschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.`,

  exclusief: `EXCLUSIVITEITSBRIEF
Artikel 1 – Verlening exclusiviteit
Verkoper verleent aan Koper exclusiviteit voor onderhandelingen inzake een mogelijke Transactie met betrekking tot [Naam Target/Onderneming].
De exclusiviteitsperiode loopt van [Startdatum] tot en met [Einddatum].
Artikel 2 – Verbod onderhandelingen met derden
Gedurende deze periode zal Verkoper:
geen gesprekken voeren met derden over verkoop of participatie;
geen informatie verstrekken aan derden (due diligence);
geen alternatieve transactiestructuren aangaan of initiëren.
Artikel 3 – Schending
Bij schending van de exclusiviteit is Verkoper gehouden tot vergoeding van:
alle door Koper gemaakte adviseurs- en onderzoekskosten;
aantoonbare directe schade.
Artikel 4 – Rechtskeuze
Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de Rechtbank Oost-Brabant.
Ondertekening
Plaats: ____________________ Datum: ____________________
Verkoper (Verleent exclusiviteit)
Naam: ____________________
Handtekening: ____________________
Koper (Ontvangt exclusiviteit)
Naam: ____________________
Handtekening: ____________________
Voor gezien en begeleiding:
Bisschops Financing B.V.
Naam: ____________________
Handtekening: ____________________`,

  closing: `CLOSING-CHECKLIST – M&A-TRANSACTIE
1. Juridische documentatie
koopovereenkomst
aandeelhoudersbesluiten
garanties en vrijwaringen
eventuele financieringsdocumentatie
2. Financiële afwikkeling
betaling koopsom
verrekening werkkapitaal/schuldpositie
escrow- of zekerheidsstructuren
3. Corporate handelingen
overdracht aandelen of activa
bestuurs- en aandeelhoudersbesluiten
inschrijving KvK indien vereist
4. Post-closing
earn-out-monitoring
overgang personeel/contracten
integratie-afspraken`,

};

// Document email helper
function maakDocEmail(type, kantoor, tekst) {
  const labels = { nda: 'Non-Disclosure Agreement (NDA)', loi: 'Letter of Intent (LoI)', bem: 'Bemiddelingsovereenkomst', exclusief: 'Exclusiviteitsbrief' };
  const label = labels[type] || type.toUpperCase();
  const safe = String(tekst||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').substring(0,50000);
  const html_tekst = safe
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^# (.+)$/gm,'<h2 style="font-family:Georgia,serif;font-size:1.1rem;margin:1rem 0 .3rem">$1</h2>')
    .replace(/^## (.+)$/gm,'<h3 style="font-family:Georgia,serif;font-size:.95rem;margin:.8rem 0 .2rem">$1</h3>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid #ddd;margin:.75rem 0">')
    .replace(/\n/g,'<br>');
  return {
    subject: label + ': ' + kantoor,
    html: '<div style="font-family:sans-serif;max-width:650px;margin:0 auto">'
      + '<div style="background:#1a7a5e;color:#fff;padding:1.25rem 1.5rem;border-radius:8px 8px 0 0">'
      + '<div style="font-size:11px;opacity:.8;margin-bottom:.2rem">Bisschops Financing B.V. — KantoorInzicht M&A</div>'
      + '<div style="font-size:1.1rem;font-weight:600">' + label + '</div>'
      + '<div style="font-size:13px;opacity:.8">Traject: ' + kantoor + '</div>'
      + '</div>'
      + '<div style="background:#fff;border:1px solid #ddd;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px">'
      + '<p style="font-size:13px;color:#5a5854;margin-bottom:1rem">Bijgaand het concept ' + label + '.</p>'
      + '<div style="background:#f9f8f5;border:1px solid #dddbd4;border-radius:6px;padding:1.25rem;font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#2a2825">' + html_tekst + '</div>'
      + '<p style="font-size:11px;color:#8a8880;margin-top:1.5rem;border-top:1px solid #eee;padding-top:.75rem">Bisschops Financing B.V. · Grotestraat 13, 5841AA Oploo · marcel@bisschopsfinancing.nl</p>'
      + '</div></div>'
  };
}

function getCORS(request) {
  const origin = request ? request.headers.get('Origin') || '' : '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, x-tussen-key, x-gebruiker-token',
  };
}

// -- DOCUMENT HELPERS ---------------------------------------------

// ── Getal normalisatie: accepteert alle gangbare Nederlandse/Europese notaties ──
function normaliseGetal(v) {
  if (v === null || v === undefined) return v;
  const s = String(v).trim();
  if (!s || s === 'null' || s === '-') return s;

  // Verwijder valutasymbolen en eenheden vooraf
  let n = s.replace(/^[€$£]\s*/, '').replace(/\s*(EUR|USD|GBP|mln|miljoen|k|K)\s*$/i, '').trim();

  // Miljoen-notatie: "2,85 mln" of "2.85 mln" → 2850000
  const mlnMatch = n.match(/^([\d.,]+)\s*mln$/i);
  if (mlnMatch) {
    const num = parseFloat(mlnMatch[1].replace(',', '.'));
    if (!isNaN(num)) return String(Math.round(num * 1000000));
  }
  // k-notatie: "285k" → 285000
  const kMatch = n.match(/^([\d.,]+)\s*[kK]$/);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(num)) return String(Math.round(num * 1000));
  }

  // Tel punten en kommas
  const nDots   = (n.match(/\./g) || []).length;
  const nCommas = (n.match(/,/g)  || []).length;

  if (nDots === 0 && nCommas === 0) return n; // puur getal, niks te doen

  // Nederlandse notatie: punt = duizendtalscheider, komma = decimaal
  // Bv: 2.847.000 of 1.523.000 of 706.056 of 24,8
  if (nDots >= 1 && nCommas === 0) {
    // Alle punten zijn duizendtalscheiders als elk segment na de eerste punt precies 3 cijfers is
    const parts = n.split('.');
    const allThree = parts.slice(1).every(p => /^\d{3}$/.test(p));
    if (allThree && parts[0].match(/^\d{1,3}$/)) {
      return parts.join(''); // 2.847.000 → 2847000
    }
    // Eén punt: decimaal (24.8) of duizendtal (706.056)?
    if (nDots === 1) {
      const [left, right] = n.split('.');
      if (right.length === 3 && /^\d+$/.test(left) && /^\d+$/.test(right)) {
        return left + right; // 706.056 → 706056
      }
      return n; // 24.8 → 24.8 (decimaal)
    }
  }

  // Komma als decimaal, geen punten: 24,8 → 24.8  (VOOR Engelse notatie check)
  if (nCommas === 1 && nDots === 0) {
    return n.replace(',', '.');
  }

  // Engelse notatie: komma = duizendtalscheider, meerdere kommas of komma + punt
  // Bv: 2,847,000
  if (nCommas >= 2 || (nCommas >= 1 && nDots >= 1)) {
    const withoutCommas = n.replace(/,/g, '');
    if (!isNaN(parseFloat(withoutCommas))) return withoutCommas;
  }

  return n; // ongewijzigd teruggeven als niks past
}

// ── Recursief alle getallen in een object normaliseren ────────
function normaliseObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) { out[k] = v; continue; }
    if (typeof v === 'object') { out[k] = normaliseObject(v); continue; }
    const s = String(v).trim();
    // Alleen normaliseren als het eruitziet als een getal (optioneel valutasymbool + cijfers + punten/kommas)
    if (/^[€$£]?[\d.,\s]+(mln|k|EUR)?$/i.test(s)) {
      out[k] = normaliseGetal(s);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function buildDocumentPrompt(fileName, faseId, extractedText, fileType, trajectContext) {
  var faseLabels = {
    financieel: 'Financieel (omzet, EBITDA, WIP, debiteuren)',
    commercieel: 'Klanten & commercieel (klantaantallen, churn, concentratie)',
    partner: 'Partners & personeel (FTE, partners, leeftijd, verloop)',
    compliance: 'Compliance & kwaliteit (NBA, Wwft, toetsingen)',
    it: 'IT & automatisering (software, automatiseringsgraad)',
    juridisch: 'Juridisch & fiscaal (rechtsvorm, structuur, huur)',
    strategisch: 'Strategisch & markt (positie, niche, AI-impact)',
  };
  var faseLabel = faseLabels[faseId] || faseId;
  var context = extractedText ? 'DOCUMENTINHOUD:\n' + extractedText.substring(0, 30000) : 'Analyseer het document op basis van bestandsnaam en type.';
  var trajectInfo = trajectContext ? '\nTRAJECT CONTEXT (gebruik dit voor crosschecks):\n' + trajectContext : '';
  // Fase-specifieke JSON templates — keys komen exact overeen met autoFillFromExtraction
  const jsonTemplates = {
    financieel: '{"entiteit_naam":null,"boekjaar":null,"omzet":null,"omzet_per_jaar":{"2022":null,"2023":null,"2024":null},"omzet_ytd":null,"ebitda_pct":null,"resultaat":null,"ohw":null,"debiteuren":null,"debiteuren_oud":null,"declarabiliteit":null,"partnerbeloning":null,"omzet_jaarwerk_pct":null,"omzet_advies_pct":null,"omzet_loon_pct":null,"omzet_fiscaal_pct":null,"omzet_overig_pct":null,"kosten_personeel_pct":null,"kosten_huisvesting_pct":null,"kosten_it_pct":null,"kosten_marketing_pct":null,"kosten_overig_pct":null,"crosscheck_waarschuwingen":[]}',
    commercieel: '{"entiteit_naam":null,"aantal_klanten":null,"churn":null,"gem_klantduur":null,"grootste_klant_pct":null,"top10_pct":null,"recurring":null,"cross_sell":null,"nieuwe_klanten":null,"verloren_klanten":null,"crosscheck_waarschuwingen":[]}',
    partner:     '{"entiteit_naam":null,"fte":null,"aantal_partners":null,"gem_leeftijd_partners":null,"omzet_per_partner":null,"pensioen_partners":null,"personeelsverloop":null,"openstaande_vacatures":null,"ra_aa_opleiding":null,"opvolgingskandidaat":null,"veranderbereidheid":null,"partnerovereenkomsten":null,"crosscheck_waarschuwingen":[]}',
    compliance:  '{"entiteit_naam":null,"nba_status":null,"afm_vergunning":null,"kwaliteitstoetsing_jaar":null,"kwaliteitstoetsing_oordeel":null,"tuchtzaken":null,"claims":null,"wwft":null,"integriteitsincidenten":null,"crosscheck_waarschuwingen":[]}',
    it:          '{"entiteit_naam":null,"software_primair":null,"overige_systemen":null,"automatiseringsgraad":null,"ai_tooling":null,"it_kosten":null,"cybersecurity":null,"it_risicos":null,"crosscheck_waarschuwingen":[]}',
    juridisch:   '{"entiteit_naam":null,"rechtsvorm":null,"aandeelhoudersstructuur":null,"huurcontract_looptijd":null,"vpb_discussies":null,"fiscale_risicos":null,"stak":null,"claims":null,"leaseverplichtingen":null,"crosscheck_waarschuwingen":[]}',
    strategisch: '{"entiteit_naam":null,"marktpositie":null,"niche":null,"concurrenten":null,"ai_impact":null,"cultuur":null,"vervolgstap":null,"tijdlijn":null,"crosscheck_waarschuwingen":[]}'
  };
  var jsonTemplate = jsonTemplates[faseId] || jsonTemplates.financieel;

  // Sector uit trajectContext halen
  var sectorMatch = trajectContext ? (trajectContext.match(/Sector:\s*(.+)/i) || [])[1] || 'accountants- of administratiekantoor' : 'accountants- of administratiekantoor';
  return 'Je bent een kritische M&A due diligence analist. Analyseer het volgende document voor een ' + sectorMatch.substring(0, 120) + '. Wees scherp, concreet en kritisch. Schrijf onpersoonlijk.'
    + trajectInfo + '\n\n'
    + 'Document: ' + fileName + ' (fase: ' + faseLabel + ')\n\n'
    + context + '\n\n'
    + '## STAP 1 — Entiteit en periode verificatie\n'
    + 'Controleer: van welke entiteit zijn deze cijfers? Klopt dat met de kantoornaam in het traject? Is het boekjaar recent (max 2 jaar oud)? Zijn dit geconsolideerde of enkelvoudige cijfers?\n\n'
    + '## STAP 2 — Samenvatting (2-3 alineas)\n'
    + 'Wat staat er in dit document en wat is relevant voor de M&A due diligence?\n\n'
    + '## STAP 3 — Financiële crosschecks (VERPLICHT voor financiële documenten)\n'
    + 'Voer de volgende checks uit en meld elke afwijking expliciet:\n'
    + '- Omzetgroei: consistent en realistisch? Grote sprongen verklaarbaar?\n'
    + '- EBITDA-marge: plausibel voor de sector (' + sectorDescr.substring(0,80) + ')? Afwijkingen verklaard?\n'
    + '- Personeelskosten als % van omzet: norm 45-65%\n'
    + '- Omzet per FTE: gebruik de sectorgemiddelden als referentie\n'
    + '- Debiteuren als % van omzet: norm max 15%. Hoog = cashflow risico\n'
    + '- OHW als % van omzet: norm max 10%. Hoog = factureringsprobleem\n'
    + '- Solvabiliteit: eigen vermogen / totaal vermogen, norm >25%\n'
    + '- Omzetverdeling: jaarwerk+advies+loon+fiscaal+overig = 100%?\n'
    + '- Zijn er bijzondere posten, herstructureringskosten of eenmalige baten/lasten?\n\n'
    + '## STAP 4 — Rode vlaggen\n'
    + 'Benoem concreet alle signalen die nader onderzoek vereisen. Geen vage termen, altijd met cijfer en context.\n\n'
    + '## STAP 5 — Extraheer gegevens als JSON\n'
    + 'KRITISCHE INSTRUCTIES — lees goed:\n'
    + '- Gebruik EXACT de keys uit het template hieronder — geen andere keys, geen vertaling\n'
    + '- Bedragen als KALE GEHELE GETALLEN zonder punten, kommas of valuta: 2847000 niet €2.847.000\n'
    + '- Percentages als getal zonder %-teken: 24.8 niet "24,8%" — gebruik punt als decimaalscheider\n'
    + '- Tekstvelden: korte feitelijke string, geen overbodige uitleg\n'
    + '- null als het veld echt niet uit het document te halen is\n'
    + '- omzet_per_jaar: vul alle jaren in die je kunt vinden als {"2022":2491000,"2023":2694000}\n'
    + '- crosscheck_waarschuwingen: array van strings, of lege array []\n\n'
    + '```json\n' + jsonTemplate + '\n```\n\n'
    + 'Schrijf alles in het Nederlands. Wees direct en cijfermatig.';
}

async function callClaudeLight(messages, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet geconfigureerd');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages })
  });
  if (!resp.ok) throw new Error('Claude API fout: ' + resp.status);
  const d = await resp.json();
  return d.content.filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('');
}

async function callClaude(messages, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet geconfigureerd');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25'
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 10000, messages })
  });
  if (!resp.ok) throw new Error('Claude API fout: ' + resp.status);
  const d = await resp.json();
  return d.content.filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('');
}

async function extractPdfText(bytes) {
  const str = new TextDecoder('latin1').decode(bytes);
  const textParts = [];
  const btRegex = /BT[\s\S]{0,2000}?ET/g;
  let m;
  while ((m = btRegex.exec(str)) !== null && textParts.join('').length < 100000) {
    const block = m[0];
    const tjMatches = block.match(/\(([^)]+)\)\s*T[jJ]/g) || [];
    for (const tj of tjMatches) {
      const text = tj.replace(/\(([^)]+)\)\s*T[jJ]/, '$1');
      if (text.trim()) textParts.push(text);
    }
  }
  if (textParts.length < 10) {
    const readable = str.replace(/[^ -~]/g, ' ').replace(/\s+/g, ' ');
    return readable.substring(0, 50000);
  }
  return textParts.join(' ').substring(0, 50000);
}

async function extractExcelText(bytes, ext) {
  if (ext === 'csv') {
    return new TextDecoder('utf-8').decode(bytes).substring(0, 30000);
  }
  const str = new TextDecoder('latin1').decode(bytes);
  const textParts = [];
  const siMatches = str.match(/<si><t[^>]*>([^<]*)<\/t><\/si>/g) || [];
  for (const si of siMatches) {
    const v = si.replace(/<si><t[^>]*>([^<]*)<\/t><\/si>/, '$1');
    if (v.trim()) textParts.push(v);
  }
  const vMatches = str.match(/<v>([^<]+)<\/v>/g) || [];
  for (const v of vMatches.slice(0, 500)) {
    const val = v.replace(/<v>([^<]+)<\/v>/, '$1');
    if (val.trim() && !isNaN(val)) textParts.push(val);
  }
  const result = textParts.slice(0, 2000).join(', ').substring(0, 30000);
  return result || 'Excel-bestand: kon inhoud niet extraheren. Sla op als CSV voor betere verwerking.';
}


// ── Database initialisatie (eenmalig per worker-instantie) ──
let _dbInitialized = false;
async function initDB(env) {
  if (_dbInitialized || !env.DB) return;
  _dbInitialized = true;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT, admin_email TEXT, admin_name TEXT, code TEXT, created_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, group_id TEXT, office_name TEXT, office_email TEXT, region TEXT, fte TEXT, revenue TEXT, ebitda TEXT, recurring TEXT, ambitie TEXT, specialisme TEXT, scores TEXT, overall INTEGER, top_scenario TEXT, created_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS callbacks (id TEXT PRIMARY KEY, naam TEXT, tel TEXT, email TEXT, tijd TEXT, kantoor TEXT, totaal INTEGER, scenario TEXT, created_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS scan_rapporten (id TEXT PRIMARY KEY, scan_id TEXT, email TEXT, kantoor_naam TEXT, overall INTEGER, scores TEXT, top_scenario TEXT, ambitie TEXT, regio TEXT, fte TEXT, omzet TEXT, rapport_tekst TEXT, created_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS rapport_usage (id TEXT PRIMARY KEY, email TEXT, ip TEXT, created_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS mna_trajecten (id TEXT PRIMARY KEY, kantoor_naam TEXT, contact_naam TEXT, contact_email TEXT, traject_type TEXT, notitie TEXT, status TEXT DEFAULT 'actief', created_at INTEGER, updated_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS mna_data (id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, data_json TEXT, checklist_json TEXT, notitie TEXT, updated_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS mna_groepen (id TEXT PRIMARY KEY, naam TEXT, omschrijving TEXT, tussen_code TEXT, created_at INTEGER, updated_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS mna_groep_trajecten (id TEXT PRIMARY KEY, groep_id TEXT, traject_id TEXT, added_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS mna_chat (
      id TEXT PRIMARY KEY,
      traject_id TEXT NOT NULL,
      auteur TEXT NOT NULL,
      naam TEXT,
      tekst TEXT NOT NULL,
      gelezen INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mna_documenten (id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, bestand_naam TEXT, bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, bewaard INTEGER, vergrendeld INTEGER DEFAULT 0, analyse TEXT, veld_extractie TEXT, methode TEXT, uploaded_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS kv_store (sleutel TEXT PRIMARY KEY, waarde TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_scans_group ON scans(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_scan_rapporten_scan_id ON scan_rapporten(scan_id)`,
    `CREATE INDEX IF NOT EXISTS idx_scan_rapporten_email ON scan_rapporten(email)`,
    `CREATE INDEX IF NOT EXISTS idx_rapport_usage_email ON rapport_usage(email)`,
    `CREATE INDEX IF NOT EXISTS idx_mna_data_traject ON mna_data(traject_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mna_documenten_traject ON mna_documenten(traject_id)`,
    `CREATE TABLE IF NOT EXISTS benchmarks (
      id TEXT PRIMARY KEY,
      categorie TEXT NOT NULL,
      sleutel TEXT NOT NULL,
      waarde REAL NOT NULL,
      omschrijving TEXT,
      bron TEXT NOT NULL,
      bron_url TEXT,
      peildatum TEXT,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_benchmarks_sleutel ON benchmarks(sleutel)`,
    `CREATE TABLE IF NOT EXISTS mna_audit (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      code      TEXT    NOT NULL,
      rol       TEXT,
      actie     TEXT    NOT NULL,
      ip        TEXT,
      ts        INTEGER NOT NULL,
      extra     TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_audit_code ON mna_audit(code)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_ts   ON mna_audit(ts)`,
    `CREATE TABLE IF NOT EXISTS mna_qa (
      id        TEXT    PRIMARY KEY,
      traject_id TEXT   NOT NULL,
      vraag_nr  INTEGER NOT NULL,
      fase_id   TEXT,
      vraag     TEXT    NOT NULL,
      antwoord  TEXT,
      status    TEXT    DEFAULT 'open',
      gesteld_door TEXT,
      beantwoord_door TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qa_traject ON mna_qa(traject_id)`,
    `CREATE TABLE IF NOT EXISTS bf_gebruikers (
      id          TEXT    PRIMARY KEY,
      naam        TEXT    NOT NULL,
      bedrijf     TEXT,
      email       TEXT    NOT NULL UNIQUE,
      ww_hash     TEXT,
      status      TEXT    DEFAULT 'uitgenodigd',
      invite_token TEXT,
      sessie_token TEXT,
      sessie_ts    INTEGER,
      plan        TEXT    DEFAULT 'basis',
      created_at  INTEGER NOT NULL,
      last_login  INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_gebruikers_email ON bf_gebruikers(email)`,
    `CREATE INDEX IF NOT EXISTS idx_gebruikers_invite ON bf_gebruikers(invite_token)`,
  ];
  for (const stmt of stmts) {
    await env.DB.prepare(stmt).run().catch(() => {});
  }
  // Extra kolommen via ALTER (idempotent)
  const alters = [
    `ALTER TABLE mna_trajecten ADD COLUMN koper_code TEXT`,
    `ALTER TABLE mna_trajecten ADD COLUMN tussen_code TEXT`,
    `ALTER TABLE mna_trajecten ADD COLUMN koper_vrijgegeven INTEGER DEFAULT 0`,
    `ALTER TABLE mna_trajecten ADD COLUMN vergrendeld_op INTEGER`,
  ];
  for (const alt of alters) {
    await env.DB.prepare(alt).run().catch(() => {});
  }
}


// ── Benchmark update functies ──
async function upsertBenchmark(env, id, categorie, sleutel, waarde, omschrijving, bron, bronUrl, peildatum) {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO benchmarks (id,categorie,sleutel,waarde,omschrijving,bron,bron_url,peildatum,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, categorie, sleutel, waarde, omschrijving, bron, bronUrl, peildatum, Date.now()).run().catch(()=>{});
}

async function getBenchmarks(env) {
  const rows = await env.DB.prepare('SELECT * FROM benchmarks').all().catch(()=>({results:[]}));
  const out = {};
  (rows.results||[]).forEach(r => { out[r.sleutel] = r; });
  return out;
}

async function updateCBS(env) {
  try {
    // CBS OData API - tabel 81156NED: Bedrijfsleven arbeids- en financiele gegevens per branche SBI2008
    // SBI 692 = Accountancy, belastingadvies en administratie
    // Filter op meest recente jaar, SBI 692
    const cbsUrl = 'https://opendata.cbs.nl/ODataApi/odata/81156NED/UntypedDataSet'
      + "?$filter=substringof('692',BedrijfstakkenBranchesSBI)"
      + '&$select=BedrijfstakkenBranchesSBI,Perioden,NettoomzetMlnEuro,ArbeidsjaareneenheidenArbeidsjaren'
      + '&$orderby=Perioden desc&$top=10&$format=json';
    
    const r = await fetch(cbsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 KantoorInzicht Benchmark Bot', 'Accept': 'application/json' }
    });
    
    if (!r.ok) throw new Error('CBS HTTP ' + r.status);
    const data = await r.json();
    const rows = data.value || [];
    
    // Zoek meest recente jaar met data voor SBI 692
    const relevant = rows.filter(r => r.NettoomzetMlnEuro && r.ArbeidsjaareneenheidenArbeidsjaren);
    if (relevant.length > 0) {
      const row = relevant[0];
      const omzetMln = parseFloat(row.NettoomzetMlnEuro);
      const aje = parseFloat(row.ArbeidsjaareneenheidenArbeidsjaren); // in 1000 AJE
      if (omzetMln > 0 && aje > 0) {
        const omzetPerAje = Math.round((omzetMln * 1000000) / (aje * 1000));
        const perioden = row.Perioden || '';
        if (omzetPerAje > 50000 && omzetPerAje < 500000) {
          await upsertBenchmark(env, 'cbs_omzet_aje_692', 'productiviteit', 'omzet_aje_sbi692', omzetPerAje,
            'Omzet per arbeidsjaar SBI 692 (accountancy, belasting, admin)', 'CBS StatLine 81156NED',
            'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/81156NED', perioden.trim());
          console.log('CBS SBI692 omzet/AJE:', omzetPerAje, 'periode:', perioden);
        }
      }
    }
    
    // Ook groeiindex ophalen - tabel 85828NED: omzetontwikkeling per branche
    const cbsIdx = 'https://opendata.cbs.nl/ODataApi/odata/85828NED/UntypedDataSet'
      + "?$filter=substringof('6920',BedrijfstakkenBranchesSBI)"
      + '&$select=BedrijfstakkenBranchesSBI,Perioden,Indexcijfer_1'
      + '&$orderby=Perioden desc&$top=5&$format=json';
    
    const r2 = await fetch(cbsIdx, {
      headers: { 'User-Agent': 'Mozilla/5.0 KantoorInzicht Benchmark Bot', 'Accept': 'application/json' }
    });
    if (r2.ok) {
      const data2 = await r2.json();
      const rows2 = (data2.value || []).filter(r => r.Indexcijfer_1);
      if (rows2.length > 0) {
        const idx = parseFloat(rows2[0].Indexcijfer_1);
        await upsertBenchmark(env, 'cbs_omzet_index_6920', 'groei', 'omzet_index_sbi6920', idx,
          'Omzetindex SBI 6920 accountancy (2021=100)', 'CBS StatLine 85828NED',
          'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/85828NED', (rows2[0].Perioden||'').trim());
        console.log('CBS omzetindex 6920:', idx);
      }
    }
    console.log('CBS update klaar');
  } catch(e) {
    console.error('CBS update fout:', e.message);
  }
}

async function updateAllBenchmarks(env) {
  await initDB(env);
  await Promise.allSettled([
    updateCBS(env),
  ]);
  console.log('Benchmark update cyclus klaar:', new Date().toISOString());
}

// ── Rate limiting (in-memory, per worker-instantie) ──────────
const _rateMap = new Map();
function checkRateLimit(key, maxPerWindow, windowMs) {
  const now = Date.now();
  let entry = _rateMap.get(key);
  if (!entry || now > entry.resetAt) entry = { count: 0, resetAt: now + windowMs };
  entry.count++;
  _rateMap.set(key, entry);
  return entry.count > maxPerWindow;
}

// ── Login rate limiting: max 15 pogingen per 10 min per IP ───
const _loginMap = new Map();
function checkLoginLimit(ip) {
  const now = Date.now();
  let entry = _loginMap.get(ip);
  if (!entry || now > entry.resetAt) entry = { count: 0, resetAt: now + 10 * 60 * 1000 };
  entry.count++;
  _loginMap.set(ip, entry);
  return entry.count > 15;
}


export default {
  // Dagelijkse AVG cleanup: verwijdert data ouder dan bewaartermijn
  async scheduled(event, env, ctx) {
    await initDB(env);
    if (!env.DB) return;
    // Benchmark update (geen admin key nodig)
    ctx.waitUntil(updateAllBenchmarks(env));
    // AVG cleanup (wel admin key nodig)
    if (!env.ADMIN_KEY) return;
    const ms12 = 12 * 30 * 24 * 60 * 60 * 1000;
    const ms6  =  6 * 30 * 24 * 60 * 60 * 1000;
    await env.DB.prepare('DELETE FROM scans WHERE created_at < ?').bind(Date.now() - ms12).run().catch(() => {});
    await env.DB.prepare('DELETE FROM scan_rapporten WHERE created_at < ?').bind(Date.now() - ms12).run().catch(() => {});
    await env.DB.prepare('DELETE FROM rapport_usage WHERE created_at < ?').bind(Date.now() - ms12).run().catch(() => {});
    await env.DB.prepare('DELETE FROM callbacks WHERE created_at < ?').bind(Date.now() - ms6).run().catch(() => {});
    console.log('AVG cleanup uitgevoerd:', new Date().toISOString());
    // Maandelijkse reminder op de 1e van de maand
    const nu = new Date();
    if (nu.getDate() === 1 && env.RESEND_API_KEY) {
      const maand = nu.toLocaleString('nl-NL', { month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });
      const bms = await env.DB.prepare('SELECT sleutel, peildatum, updated_at FROM benchmarks ORDER BY updated_at DESC').all().catch(() => ({results:[]}));
      const bmLijst = (bms.results||[]).map(b => '- ' + b.sleutel + ' (peildatum: ' + (b.peildatum||'onbekend') + ')').join('\n') || '  (geen benchmarks opgeslagen)';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({
          from: 'KantoorInzicht <noreply@koersvoormorgen.nl>',
          to: ['marcel@bisschopsfinancing.nl'],
          subject: 'KantoorInzicht — Benchmark check ' + maand,
          text: 'Maandelijkse reminder: controleer of de benchmarkdata nog actueel is.\n\n'
            + 'Huidige benchmarks in D1:\n' + bmLijst + '\n\n'
            + 'Acties:\n'
            + '- Nieuw Full Finance rapport? Upload via marilyn → Benchmarks → PDF analyseren\n'
            + '- Multiples bijwerken? marilyn → Benchmarks → Handmatig toevoegen\n'
            + '- Verouderde waarden verwijderen? marilyn → Benchmarks → rode kruisje\n\n'
            + 'https://koersvoormorgen.nl/marilyn.html'
        })
      }).catch(() => {});
      console.log('Maandelijkse benchmark reminder verstuurd.');
    }
  },

  async fetch(request, env, ctx) {
    // ── Gebruikers auth helpers ─────────────────────────────────────
    const hashWW = async (ww) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ww));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    };
    const gebruikerViaToken = async (req) => {
      const tok = req.headers.get('x-gebruiker-token') || req.headers.get('authorization')?.replace('Bearer ','') || new URL(req.url).searchParams.get('gtoken') || new URL(req.url).searchParams.get('token') || '';
      if (!tok || !env.DB) return null;
      const g = await env.DB.prepare('SELECT * FROM bf_gebruikers WHERE sessie_token=? AND status=\'actief\'').bind(tok).first().catch(() => null);
      if (!g) return null;
      // Sessie geldig voor 8 uur
      if (Date.now() - (g.sessie_ts || 0) > 8 * 60 * 60 * 1000) return null;
      return g;
    };
    const isSuperAdmin = (req, bodyKey) => {
      const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key') || bodyKey || '';
      return key === (env.ADMIN_KEY || '') && !!env.ADMIN_KEY;
    };
    // ────────────────────────────────────────────────────────────────

    const begeleiderAuth = async (req, trajectCode) => {
      const u = new URL(req.url);
      const key = req.headers.get('x-admin-key') || req.headers.get('x-tussen-key') || u.searchParams.get('key') || '';
      if (key === (env.ADMIN_KEY || '') && env.ADMIN_KEY) return { ok: true, rol: 'admin' };
      if (!env.DB) return { ok: false };
      const t = await env.DB.prepare('SELECT id, tussen_code FROM mna_trajecten WHERE id=? OR tussen_code=?')
        .bind((trajectCode||'').toUpperCase(), key.toUpperCase()).first().catch(() => null);
      if (t && t.tussen_code && key.toUpperCase() === t.tussen_code.toUpperCase()) return { ok: true, rol: 'begeleider', traject_id: t.id };
      return { ok: false };
    };
    // Parse body ongeacht Content-Type (JSON, text/plain, of form-encoded)
    async function parseBody(req) {
      try {
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
          const form = await req.formData();
          const data = form.get('data');
          return data ? JSON.parse(data) : {};
        }
        const text = await req.text();
        return JSON.parse(text);
      } catch(e) { return {}; }
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCORS(request) });
    }
    await initDB(env);

    const url = new URL(request.url);
    const path = url.pathname;

    // Rate limiting per IP - alleen op onbekende origins
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const reqOrigin = request.headers.get('Origin') || '';
    const isAdminPath = path.startsWith('/admin/') || path.startsWith('/mna/admin/');
    const isEmailPath = path.includes('/email');
    const isTrustedOrigin = reqOrigin === 'https://koersvoormorgen.nl' || reqOrigin === 'https://www.koersvoormorgen.nl';
    // Alleen rate limiting voor onbekende origins - email en admin altijd vrij
    if (!isAdminPath && !isEmailPath && !isTrustedOrigin) {
      const aiLimit = path === '/ai' && checkRateLimit(clientIP + ':ai', 15, 60000);
      const generalLimit = checkRateLimit(clientIP, 120, 60000);
      if (aiLimit) return new Response(JSON.stringify({ error: 'Te veel AI verzoeken. Wacht even.' }), { status: 429, headers: { ...getCORS(request), 'Content-Type': 'application/json', 'Retry-After': '60' } });
      if (generalLimit) return new Response(JSON.stringify({ error: 'Te veel verzoeken. Wacht even.' }), { status: 429, headers: { ...getCORS(request), 'Content-Type': 'application/json', 'Retry-After': '60' } });
    }

    // Benchmarks ophalen (publiek)
    if (path === '/benchmarks' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM benchmarks ORDER BY categorie, sleutel').all().catch(()=>({results:[]}));
      return new Response(JSON.stringify(rows.results||[]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    // Benchmarks handmatig bijwerken via admin
    if (path === '/admin/benchmarks/update' && request.method === 'POST') {
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const body = await request.json().catch(()=>({}));
      // body: { sleutel, waarde, omschrijving, bron, bron_url, peildatum }
      if (!body.sleutel || body.waarde === undefined) return new Response(JSON.stringify({error:'sleutel en waarde verplicht'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      await upsertBenchmark(env, body.sleutel, body.categorie||'algemeen', body.sleutel, parseFloat(body.waarde), body.omschrijving||'', body.bron||'Handmatig', body.bron_url||'', body.peildatum||new Date().toISOString().split('T')[0]);
      return new Response(JSON.stringify({ok:true}), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    // Benchmark verwijderen via admin
    if (path.startsWith('/admin/benchmarks/delete/') && request.method === 'POST') {
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const sleutel = decodeURIComponent(path.replace('/admin/benchmarks/delete/', ''));
      await env.DB.prepare('DELETE FROM benchmarks WHERE sleutel=? OR id=?').bind(sleutel, sleutel).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true}), {headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    /* BENCHMARKS: PDF ANALYSE */
    if (path === '/admin/benchmarks/pdf-analyse' && request.method === 'POST') {
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      try {
      const body = await request.json().catch(() => ({}));
      const { pdf_base64, bron, peildatum, bestandsnaam } = body;
      if (!pdf_base64 || !bron) return new Response(JSON.stringify({error:'pdf_base64 en bron verplicht'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});

      // AI prompt voor benchmark extractie
      const extractPrompt = `Je analyseert een PDF met benchmarkdata voor accountants- en administratiekantoren.
Extraheer alle relevante benchmarkwaarden en retourneer ALLEEN een JSON array zonder uitleg of markdown.

Zoek naar:
- Omzet per FTE of per medewerker (voor accountantskantoren en administratiekantoren)
- EBITDA marge of bedrijfsresultaat percentage
- Brutowinst marge of brutowinst per FTE
- Uurtarief personeel
- Waarderingsmultiples (EBITDA multiple, omzetmultiple)
- Vaste omzet percentage (recurring revenue)

Gebruik deze sleutels (kies de meest passende):
- omzet_fte_accountant (omzet/FTE accountantskantoor MKB)
- omzet_fte_admin (omzet/FTE administratiekantoor MKB)
- brutowinst_fte_accountant (brutowinst/FTE accountantskantoor)
- ebitda_marge_accountant (EBITDA% accountantskantoor)
- ebitda_marge_admin (EBITDA% administratiekantoor)
- uurtarief_personeel_klein (uurtarief klein kantoor)
- uurtarief_personeel_groot (uurtarief groot kantoor)
- multiple_acc_laag / multiple_acc_hoog (waarderingsmultiple accountantskantoor)
- multiple_adm_laag / multiple_adm_hoog (waarderingsmultiple administratiekantoor)

Voor omzet/FTE uit een ranglijst: bereken het gemiddelde van MKB-kantoren (5-100 FTE), sla grote outliers over.

Retourneer ALLEEN dit JSON formaat, geen tekst eromheen:
[
  {"sleutel": "omzet_fte_admin", "waarde": 135000, "categorie": "productiviteit", "omschrijving": "Gem. omzet/FTE administratiekantoren MKB (Top 20 2024)"},
  {"sleutel": "ebitda_marge_admin", "waarde": 18.5, "categorie": "winstgevendheid", "omschrijving": "Gem. EBITDA marge administratiekantoren 2024"}
]

Bron: ${bron}`;

      // Roep Anthropic API aan met PDF
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
              { type: 'text', text: extractPrompt }
            ]
          }]
        })
      });

      if (!aiResp.ok) {
        const errTxt = await aiResp.text().catch(() => '');
        return new Response(JSON.stringify({error:'AI API fout ' + aiResp.status + ': ' + errTxt.slice(0,200)}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      }
      const aiData = await aiResp.json();
      const tekst = (aiData.content?.[0]?.text || '').trim();
      if (!tekst) return new Response(JSON.stringify({error:'AI gaf leeg antwoord'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});

      // Parse JSON response
      let benchmarks = [];
      try {
        const clean = tekst.replace(/```json|```/g, '').trim();
        // Zoek JSON array ook als er tekst omheen staat
        const match = clean.match(/\[[\s\S]*\]/);
        benchmarks = JSON.parse(match ? match[0] : clean);
        if (!Array.isArray(benchmarks)) benchmarks = [];
      } catch(e) {
        return new Response(JSON.stringify({error:'AI gaf geen valide JSON: ' + e.message, raw: tekst.slice(0,500)}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      }

      // Sla elke benchmark op in D1
      const opgeslagen = [];
      for (const b of benchmarks) {
        if (!b.sleutel || typeof b.waarde !== 'number') continue;
        await upsertBenchmark(env, b.sleutel, b.categorie||'algemeen', b.sleutel, b.waarde,
          b.omschrijving||b.sleutel, bron, '', peildatum||new Date().getFullYear().toString());
        opgeslagen.push(b);
      }

      return new Response(JSON.stringify({ok:true, benchmarks: opgeslagen}), {headers:{...getCORS(request),'Content-Type':'application/json'}});
    } catch(pdfErr) {
      return new Response(JSON.stringify({error:'PDF analyse fout: ' + pdfErr.message}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    }

    // Benchmarks forceer update via admin
    if (path === '/admin/benchmarks/refresh' && request.method === 'POST') {
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      await updateAllBenchmarks(env);
      const rows = await env.DB.prepare('SELECT * FROM benchmarks').all().catch(()=>({results:[]}));
      return new Response(JSON.stringify({ok:true,count:(rows.results||[]).length}), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    if (path === '/ai' && request.method === 'POST') {
      // Rate limiting: alleen requests van koersvoormorgen.nl of met geldig intern token
      // Origin check verwijderd - bescherming via rate limiting en promptlengte
      const body = await request.json().catch(() => null);
      if (!body || !body.messages) {
        return new Response(JSON.stringify({ error: 'Missing messages' }), {
          status: 400, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
        });
      }
      // Input validatie: max prompt lengte (voorkomt kostenmisbruik)
      // Injecteer huidig jaar in alle AI prompts
      const huidigJaarAI = new Date().getFullYear();
      const msgs = body.messages || [];
      if (msgs.length > 0 && msgs[0].role === 'user' && typeof msgs[0].content === 'string') {
        msgs[0].content = '[Huidig jaar: ' + huidigJaarAI + '. Gebruik alleen kwartalen en datums die in ' + huidigJaarAI + ' of later liggen.]\n\n' + msgs[0].content;
      }
      body.messages = msgs;
      const totalLen = (body.messages || []).reduce((a, m) => a + (typeof m.content === 'string' ? m.content.length : 0), 0);
      if (totalLen > 12000) {
        return new Response(JSON.stringify({ error: 'Prompt te lang' }), {
          status: 400, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
        });
      }
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: Math.min(body.max_tokens || 16000, 16000),
          stream: false,
          messages: body.messages,
        }),
      });
      if (!aiResp.ok) {
        const errText = await aiResp.text();
        return new Response(JSON.stringify({ error: 'AI fout ' + aiResp.status + ': ' + errText.substring(0, 300) }), {
          status: aiResp.status, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
        });
      }
      const aiData = await aiResp.json();
      const aiText = aiData.content && aiData.content[0] ? aiData.content[0].text : '';
      if (!aiText) {
        return new Response(JSON.stringify({ error: 'Leeg antwoord: ' + JSON.stringify(aiData).substring(0, 200) }), {
          status: 500, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ text: aiText }), {
        headers: { ...getCORS(request), 'Content-Type': 'application/json' },
      });
    }

    if (path === '/group/create' && request.method === 'POST') {
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet geconfigureerd' }), {
        status: 503, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
      const body = await request.json().catch(() => ({}));
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      const adminCode = 'B' + Math.random().toString(36).slice(2, 8).toUpperCase();
      try { await env.DB.prepare('ALTER TABLE groups ADD COLUMN dashboard_public INTEGER DEFAULT 1').run(); } catch(e) {}
      try { await env.DB.prepare('ALTER TABLE groups ADD COLUMN admin_code TEXT').run(); } catch(e) {}
      const isPublic = body.dashboard_public !== false ? 1 : 0;
      await env.DB.prepare('INSERT INTO groups (id, name, admin_email, admin_code, created_at, dashboard_public) VALUES (?,?,?,?,?,?)')
        .bind(id, body.name || 'Groep', body.admin_email || '', adminCode, Date.now(), isPublic).run();
      return new Response(JSON.stringify({ group_id: id, admin_code: adminCode }), {
        headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
    }


    /* GROEP OPZOEKEN VIA ADMIN CODE */
    if (path.startsWith('/group/by-admin-code/') && request.method === 'GET') {
      const adminCode = path.replace('/group/by-admin-code/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      try { await env.DB.prepare('ALTER TABLE groups ADD COLUMN admin_code TEXT').run(); } catch(e) {}
      const group = await env.DB.prepare('SELECT id FROM groups WHERE admin_code=?').bind(adminCode).first().catch(() => null);
      if (!group) return new Response(JSON.stringify({ error: 'Beheerdscode niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ group_id: group.id }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    if (path === '/group/join' && request.method === 'POST') {
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet geconfigureerd' }), {
        status: 503, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
      const body = await request.json().catch(() => ({}));
      let group = await env.DB.prepare('SELECT id FROM groups WHERE id = ?').bind(body.group_id).first();
      if (!group) {
        if (body.group_id === 'SOLO') {
          await env.DB.prepare('INSERT OR IGNORE INTO groups (id, name, admin_email, created_at) VALUES (?,?,?,?)')
            .bind('SOLO', 'Individuele scans', 'system', Date.now()).run();
          group = { id: 'SOLO' };
        } else {
          return new Response(JSON.stringify({ error: 'Groepscode niet gevonden' }), {
            status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
          });
        }
      }
      const vals = Object.values(body.scores || {});
      const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      const id = Math.random().toString(36).slice(2, 14).toUpperCase();
      try { await env.DB.prepare('ALTER TABLE scans ADD COLUMN ebitda TEXT').run(); } catch(e) {}
      try { await env.DB.prepare('ALTER TABLE scans ADD COLUMN recurring TEXT').run(); } catch(e) {}
      try { await env.DB.prepare('ALTER TABLE scans ADD COLUMN ambitie TEXT').run(); } catch(e) {}
      try { await env.DB.prepare('ALTER TABLE scans ADD COLUMN specialisme TEXT').run(); } catch(e) {}
      await env.DB.prepare('INSERT INTO scans (id,group_id,office_name,office_email,region,fte,revenue,ebitda,recurring,ambitie,specialisme,scores,overall,top_scenario,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, body.group_id, body.office_name || '', body.office_email || '', body.region || '', body.fte || '', body.revenue || '', body.ebitda||'', body.recurring||'', body.ambitie||'', body.specialisme||'', JSON.stringify(body.scores || {}), overall, body.top_scenario || '', Date.now()).run();
      return new Response(JSON.stringify({ scan_id: id, overall }), {
        headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
    }

    if (path.startsWith('/group/') && request.method === 'GET') {
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet geconfigureerd' }), {
        status: 503, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
      const gid = path.split('/')[2];
      const url2 = new URL(request.url);
      const body2 = { admin_code: url2.searchParams.get('admin_code') || '' };
      const group = await env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(gid).first();
      if (!group) return new Response(JSON.stringify({ error: 'Groep niet gevonden' }), {
        status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
      const { results } = await env.DB.prepare('SELECT * FROM scans WHERE group_id = ? ORDER BY created_at ASC').bind(gid).all();
      const cumulative = {};
      results.forEach(row => {
        const s = JSON.parse(row.scores);
        Object.entries(s).forEach(([k, v]) => { cumulative[k] = (cumulative[k] || 0) + v; });
      });
      if (results.length > 0) Object.keys(cumulative).forEach(k => { cumulative[k] = Math.round(cumulative[k] / results.length); });
      const isAdmin = body2 && body2.admin_code && group.admin_code && body2.admin_code === group.admin_code;
      const showAll = group.dashboard_public || isAdmin;
      return new Response(JSON.stringify({
        group: { id: group.id, name: group.name, created_at: group.created_at, dashboard_public: group.dashboard_public },
        offices: showAll ? results.map(r => ({ id: r.id, name: r.office_name, email: r.office_email, region: r.region, fte: r.fte, revenue: r.revenue, ebitda: r.ebitda||"" , recurring: r.recurring||"", ambitie: r.ambitie||"", specialisme: r.specialisme||"", scores: JSON.parse(r.scores), overall: r.overall, top_scenario: r.top_scenario, created_at: r.created_at })) : [],
        cumulative: showAll ? cumulative : {},
        count: results.length,
        is_admin: isAdmin,
      }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* CALLBACK E-MAIL */
    if (path === '/callback' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { naam, tel, email, tijd, kantoor, scores, totaal, scenario } = body;

      // Sla op in D1 als fallback (altijd)
      if (env.DB) {
        try {
          await env.DB.prepare('CREATE TABLE IF NOT EXISTS callbacks (id TEXT PRIMARY KEY, naam TEXT, tel TEXT, email TEXT, tijd TEXT, kantoor TEXT, totaal INTEGER, scenario TEXT, created_at INTEGER)').run();
          const cbId = Math.random().toString(36).slice(2,14).toUpperCase();
          await env.DB.prepare('INSERT INTO callbacks (id,naam,tel,email,tijd,kantoor,totaal,scenario,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
            .bind(cbId, naam||'', tel||'', email||'', tijd||'', JSON.stringify(kantoor||{}), totaal||0, scenario||'', Date.now()).run();
        } catch(e) { console.error('DB callback error:', e); }
      }

      const scoreLines = Object.entries(scores||{})
        .map(([k,v]) => `${k}: ${v}/100`).join('\n');

      const isFeedback = body.type === 'feedback';
      console.log('Callback ontvangen: type='+body.type+', isFeedback='+isFeedback+', naam='+naam);
      const feedback = body.feedback || '';

      const emailBody = isFeedback ? `
FEEDBACK -- KantoorInzicht Scan

VAN:
Naam: ${naam}
Contact: ${tel||email||'Niet opgegeven'}

BERICHT:
${feedback}

KANTOORCONTEXT:
Naam kantoor: ${kantoor?.naam||'Anoniem'} | Ambitie: ${kantoor?.ambitie||'-'}
Totaalscore: ${totaal}/100 | Scenario: ${scenario}
      `.trim() : `
TERUGBELVERZOEK -- KantoorInzicht Scan

CONTACTGEGEVENS:
Naam: ${naam}
Telefoon: ${tel||'Niet opgegeven'}
E-mail: ${email||'Niet opgegeven'}
Beste beltijd: ${tijd||'Niet opgegeven'}

KANTOORPROFIEL:
Naam kantoor: ${kantoor?.naam||'Anoniem'}
Regio: ${kantoor?.regio||'-'}
Medewerkers: ${kantoor?.fte||'-'}
Omzet: ${kantoor?.omzet||'-'}
Specialisme: ${kantoor?.specialisme||'-'}
Ambitie: ${kantoor?.ambitie||'-'}

SCANRESULTATEN:
Totaalscore: ${totaal}/100
Aanbevolen scenario: ${scenario}

Scores per dimensie:
${scoreLines}
      `.trim();

      const emailSubject = isFeedback
        ? 'Feedback: ' + (naam||'Anoniem') + (kantoor?.naam ? ' - ' + kantoor.naam : '')
        : 'Terugbelverzoek: ' + (naam||'Anoniem') + ' - ' + (kantoor?.naam||'Anoniem kantoor') + ' (' + totaal + '/100)';

      // Stuur via Resend API
      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: 'KantoorInzicht <noreply@koersvoormorgen.nl>',
            to: ['marcel@bisschopsfinancing.nl'],
            subject: emailSubject,
            text: emailBody,
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...getCORS(request), 'Content-Type': 'application/json' }
      });
    }



    /* FIND GROUP BY EMAIL */
    if (path === '/group/find-by-email' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { email } = body;
      if (!email || !env.DB) return new Response(JSON.stringify({ error: 'Niet gevonden' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const group = await env.DB.prepare('SELECT id, name FROM groups WHERE admin_email=? ORDER BY created_at DESC LIMIT 1').bind(email).first().catch(() => null);
      if (group) {
        return new Response(JSON.stringify({ group_id: group.id, name: group.name }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Niet gevonden' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ADMIN: ALLE RAPPORTEN (alleen voor Marcel) */
    if (path === '/admin/scans' && request.method === 'GET') {
      // Brute-force bescherming op admin-login: max 10 pogingen per 5 min per IP
      if (checkRateLimit(clientIP + ':admin', 10, 5 * 60 * 1000)) {
        // Alert loggen
        console.warn('[SECURITY] Admin brute-force poging van IP:', clientIP, new Date().toISOString());
        return new Response(JSON.stringify({ error: 'Te veel pogingen. Wacht 5 minuten.' }), { status: 429, headers: { ...getCORS(request), 'Content-Type': 'application/json', 'Retry-After': '300' } });
      }
      const url2 = new URL(request.url);
      const adminKey = request.headers.get('x-admin-key') || url2.searchParams.get('key') || '';
      const validKey1 = env.ADMIN_KEY || '';
      if (!validKey1 || adminKey !== validKey1) {
        console.warn('[SECURITY] Ongeldige admin-key poging van IP:', clientIP, new Date().toISOString());
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const scans = await env.DB.prepare('SELECT s.*, g.name as group_name FROM scans s LEFT JOIN groups g ON s.group_id=g.id ORDER BY s.created_at DESC LIMIT 100').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(scans.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ADMIN: TERUGBELVERZOEKEN */
    if (path === '/admin/callbacks' && request.method === 'GET') {
      const url3 = new URL(request.url);
      const adminKey = request.headers.get('x-admin-key') || url3.searchParams.get('key') || '';
      const validKey2 = env.ADMIN_KEY || '';
      if (!validKey2 || adminKey !== validKey2) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const cbs = await env.DB.prepare('SELECT * FROM callbacks ORDER BY created_at DESC').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(cbs.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* RAPPORT OPSLAAN */

    if (path.startsWith('/rapport/') && !path.startsWith('/rapport/save') && request.method === 'GET') {
      const scan_id = path.replace('/rapport/', '').split('?')[0].toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      try {
        // Zoek op id (rapportcode) of scan_id
        let row = await env.DB.prepare('SELECT * FROM scan_rapporten WHERE id = ?').bind(scan_id).first().catch(()=>null);
        if (!row) row = await env.DB.prepare('SELECT * FROM scan_rapporten WHERE scan_id = ?').bind(scan_id).first().catch(()=>null);
        if (!row) return new Response(JSON.stringify({ error: 'Rapport niet gevonden voor code: ' + scan_id }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify(row), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }
    if (path === '/rapport/save' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { scan_id, email, kantoor_naam, overall, scores, top_scenario, ambitie, regio, fte, omzet, rapport_tekst } = body;
      if (!env.DB) return new Response(JSON.stringify({ ok: false, error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      try {
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS scan_rapporten (
          id TEXT PRIMARY KEY, scan_id TEXT, email TEXT, kantoor_naam TEXT,
          overall INTEGER, scores TEXT, top_scenario TEXT, ambitie TEXT,
          regio TEXT, fte TEXT, omzet TEXT, rapport_tekst TEXT, created_at INTEGER
        )`).run();
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_scan_rapporten_scan_id ON scan_rapporten(scan_id)').run().catch(()=>{});
        await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_scan_rapporten_email ON scan_rapporten(email)').run().catch(()=>{});
        const id = Math.random().toString(36).slice(2,10).toUpperCase();
        await env.DB.prepare('INSERT OR REPLACE INTO scan_rapporten (id,scan_id,email,kantoor_naam,overall,scores,top_scenario,ambitie,regio,fte,omzet,rapport_tekst,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, scan_id||'', email||'', kantoor_naam||'', overall||0, JSON.stringify(scores||{}), top_scenario||'', ambitie||'', regio||'', fte||'', omzet||'', rapport_tekst||'', Date.now())
          .run();
        return new Response(JSON.stringify({ ok: true, id }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }

    /* ADMIN: SCAN RAPPORTEN LIJST */
    if (path === '/admin/rapporten' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS scan_rapporten (id TEXT PRIMARY KEY, scan_id TEXT, email TEXT, kantoor_naam TEXT, overall INTEGER, scores TEXT, top_scenario TEXT, ambitie TEXT, regio TEXT, fte TEXT, omzet TEXT, rapport_tekst TEXT, created_at INTEGER)`).run().catch(() => {});
      const rows = await env.DB.prepare('SELECT id,scan_id,email,kantoor_naam,overall,top_scenario,ambitie,regio,fte,omzet,created_at FROM scan_rapporten ORDER BY created_at DESC LIMIT 200').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(rows.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ADMIN: SCAN RAPPORT DETAIL */
    if (path.startsWith('/admin/rapport/') && request.method === 'GET') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({}), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const rid = path.replace('/admin/rapport/', '');
      const row = await env.DB.prepare('SELECT * FROM scan_rapporten WHERE id=?').bind(rid).first().catch(() => null);
      return new Response(JSON.stringify(row||{}), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ADMIN: SCAN RAPPORT VERWIJDEREN */
    if (path.startsWith('/admin/delete/rapport/') && request.method === 'POST') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const rid = path.replace('/admin/delete/rapport/', '');
      await env.DB.prepare('DELETE FROM scan_rapporten WHERE id=?').bind(rid).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: TRAJECT AANMAKEN (admin) */
    if (path === '/mna/create' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      const validKey = env.ADMIN_KEY || '';
      if (key !== validKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      const { kantoor_naam, kantoor_rechtsvorm, contact_naam, contact_email, traject_type, sector, notitie, begeleider_naam, begeleider_email, koper_naam, koper_rechtsvorm, koper_contact, koper_email, koper_adres, koper_kvk, verkoper_adres, verkoper_kvk } = body;
      // Normaliseer rechtsvorm
      const rechtsvormen = {'bv':'B.V.','b.v.':'B.V.','nv':'N.V.','n.v.':'N.V.','vof':'V.O.F.','v.o.f.':'V.O.F.','eenmanszaak':'Eenmanszaak','stichting':'Stichting','cooperatie':'Coöperatie','coöperatie':'Coöperatie','holding':'Holding B.V.','maatschap':'Maatschap'};
      const rvNorm = koper_rechtsvorm ? (rechtsvormen[(koper_rechtsvorm||'').toLowerCase()] || koper_rechtsvorm) : '';
      // Bisschops Financing standaard KvK: 90006777
      const bf_kvk = '90006777'; // KvK Bisschops Financing B.V.
      if (!kantoor_naam) return new Response(JSON.stringify({ error: 'kantoor_naam verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Create tables if needed
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_trajecten (
        id TEXT PRIMARY KEY, kantoor_naam TEXT, contact_naam TEXT, contact_email TEXT,
        traject_type TEXT, notitie TEXT, status TEXT DEFAULT 'actief',
        created_at INTEGER, updated_at INTEGER
      )`).run().catch(() => {});
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_data (
        id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT,
        data_json TEXT, checklist_json TEXT, notitie TEXT, updated_at INTEGER
      )`).run().catch(() => {});
      // Voeg begeleider + koper kolommen toe indien nodig
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN begeleider_naam TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN begeleider_email TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_naam TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_rechtsvorm TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_contact TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_email TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_adres TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_kvk TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN verkoper_adres TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN verkoper_kvk TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN kantoor_rechtsvorm TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN sector TEXT DEFAULT \'accountancy\'').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN gebruiker_id TEXT').run().catch(() => {});
      // Generate unique code: 3 letters + 3 digits
      const code = Math.random().toString(36).slice(2,6).toUpperCase() + Math.floor(1000+Math.random()*9000);
      // Add koper_code column if not exists
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_code TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN tussen_code TEXT').run().catch(() => {});
      const koper_code = 'K' + Math.random().toString(36).slice(2,9).toUpperCase();
      const tussen_code = 'T' + Math.random().toString(36).slice(2,9).toUpperCase();
      await env.DB.prepare('INSERT INTO mna_trajecten (id,kantoor_naam,kantoor_rechtsvorm,contact_naam,contact_email,traject_type,sector,notitie,status,created_at,updated_at,koper_code,tussen_code,begeleider_naam,begeleider_email,koper_naam,koper_rechtsvorm,koper_contact,koper_email,koper_adres,koper_kvk,verkoper_adres,verkoper_kvk) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(code, kantoor_naam, kantoor_rechtsvorm||'', contact_naam||'', contact_email||'', traject_type||'Verkoop', sector||'accountancy', notitie||'', 'actief', Date.now(), Date.now(), koper_code, tussen_code, begeleider_naam||'', begeleider_email||'', koper_naam||'', rvNorm||'', koper_contact||'', koper_email||'', koper_adres||'', koper_kvk||'', verkoper_adres||'', verkoper_kvk||'').run();
      // Stuur e-mail naar begeleider met toegangscode
      if (begeleider_email && env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
            to: [begeleider_email],
            subject: 'M&A Traject: ' + kantoor_naam + ' — uw toegangscode',
            html: '<p>Beste ' + (begeleider_naam||'begeleider') + ',</p><p>U bent aangesteld als begeleider voor het M&A traject van <strong>' + kantoor_naam + '</strong>.</p><p><strong>Uw toegangscode: <span style="font-family:monospace;font-size:1.2em">' + tussen_code + '</span></strong></p><p>Gebruik deze code op <a href="https://koersvoormorgen.nl/mna.html">koersvoormorgen.nl/mna.html</a> om het traject in te zien en te begeleiden.</p><p>Met vriendelijke groet,<br>Marcel Bisschops<br>Bisschops Financing BV</p>'
          })
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true, code, koper_code, tussen_code }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: MAIL BEGELEIDER */
    if (path === '/mna/mail-begeleider' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (key !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      const { to, naam, trajectNaam, tussenCode, html } = body;
      if (!to || !tussenCode) return new Response(JSON.stringify({ error: 'to en tussenCode verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Resend niet geconfigureerd' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: [to], subject: 'Uitnodiging begeleider — ' + (trajectNaam || 'M&A traject'), html: html || '<p>Uw toegangscode: ' + tussenCode + '</p>' })
      }).catch(() => null);
      if (!r || !r.ok) return new Response(JSON.stringify({ error: 'E-mail versturen mislukt' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: LOI EMAIL VERSTUREN */
    if (path === '/mna/loi/email' && request.method === 'POST') {
      const loiBody = await request.json().catch(() => ({}));
      const { code, loi_tekst, to } = loiBody;
      if (!code || !loi_tekst) return new Response(JSON.stringify({ error: 'code en loi_tekst verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const tInfo = await env.DB.prepare('SELECT kantoor_naam FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
      const kantoor = tInfo?.kantoor_naam || code;
      const toList = Array.isArray(to) && to.length ? to : ['marcel@bisschopsfinancing.nl'];
      if (!toList.includes('marcel@bisschopsfinancing.nl')) toList.push('marcel@bisschopsfinancing.nl');
      if (!env.RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Resend niet geconfigureerd' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({
          from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
          to: toList,
          subject: 'Letter of Intent: ' + kantoor,
          html: '<p>Bijgaand de concept Letter of Intent voor <strong>' + kantoor + '</strong>.</p>'
            + '<p>Gelieve de LoI te beoordelen, ondertekend te retourneren via de beveiligde uploadomgeving op <a href="https://koersvoormorgen.nl/mna.html">koersvoormorgen.nl/mna.html</a> (fase Juridisch & Fiscaal).</p>'
            + '<hr style="border:none;border-top:1px solid #ddd;margin:1.5rem 0">'
            + '<div style="background:#f9f8f5;border:1px solid #dddbd4;border-radius:6px;padding:1.25rem;font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#2a2825">' + loi_tekst.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>').substring(0,50000) + '</div>'
            + '<hr style="border:none;border-top:1px solid #ddd;margin:1.5rem 0">'
            + '<p style="font-size:12px;color:#8a8880">Dit bericht is verstuurd via KantoorInzicht M&A &middot; Bisschops Financing BV &middot; marcel@bisschopsfinancing.nl</p>'
        })
      }).catch(() => {});
      // Sla LoI tekst op in D1
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN loi_tekst TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN loi_datum INTEGER').run().catch(() => {});
      await env.DB.prepare('UPDATE mna_trajecten SET loi_tekst=?, loi_datum=? WHERE id=?').bind(loi_tekst, Date.now(), code.toUpperCase()).run().catch(() => {});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_doc_versies (id TEXT PRIMARY KEY, traject_id TEXT, doc_type TEXT, versie INTEGER, tekst TEXT, verstuurd_naar TEXT, verstuurd_door TEXT, created_at INTEGER)').run().catch(() => {});
      const loiVId = 'V' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
      const loiVCount = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_doc_versies WHERE traject_id=? AND doc_type=?').bind(code.toUpperCase(), 'loi').first().catch(() => ({n:0}));
      await env.DB.prepare('INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(loiVId, code.toUpperCase(), 'loi', (loiVCount?.n||0)+1, loi_tekst, JSON.stringify(Array.isArray(to)&&to.length?to:[]), 'Marcel Bisschops', Date.now()).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }



    /* MNA: DOCUMENT VERSIES */
    if (path.startsWith('/mna/versies/') && request.method === 'GET') {
      const parts = path.replace('/mna/versies/', '').split('/');
      const vCode = parts[0]?.toUpperCase();
      const vType = parts[1] || null; // nda, loi, bem - of null voor alle
      if (!vCode) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Zoek traject
      let vTraject = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE id=?').bind(vCode).first().catch(() => null);
      if (!vTraject) vTraject = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE koper_code=?').bind(vCode).first().catch(() => null);
      if (!vTraject) vTraject = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE tussen_code=?').bind(vCode).first().catch(() => null);
      if (!vTraject) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_doc_versies (id TEXT PRIMARY KEY, traject_id TEXT, doc_type TEXT, versie INTEGER, tekst TEXT, verstuurd_naar TEXT, verstuurd_door TEXT, created_at INTEGER)').run().catch(() => {});
      const query = vType
        ? 'SELECT id, traject_id, doc_type, versie, verstuurd_naar, verstuurd_door, created_at FROM mna_doc_versies WHERE traject_id=? AND doc_type=? ORDER BY versie DESC'
        : 'SELECT id, traject_id, doc_type, versie, verstuurd_naar, verstuurd_door, created_at FROM mna_doc_versies WHERE traject_id=? ORDER BY created_at DESC';
      const rows = vType
        ? await env.DB.prepare(query).bind(vTraject.id, vType).all().catch(() => ({results:[]}))
        : await env.DB.prepare(query).bind(vTraject.id).all().catch(() => ({results:[]}));
      return new Response(JSON.stringify(rows.results || []), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: DOCUMENT VERSIE TEKST OPHALEN */
    if (path.startsWith('/mna/versie/') && request.method === 'GET') {
      const vId = path.replace('/mna/versie/', '');
      if (!vId) return new Response(JSON.stringify({ error: 'ID verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const versie = await env.DB.prepare('SELECT * FROM mna_doc_versies WHERE id=?').bind(vId).first().catch(() => null);
      if (!versie) return new Response(JSON.stringify({ error: 'Niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(versie), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }



    /* BEGELEIDER TEMPLATE UPLOAD */
    if (path === '/mna/template/upload' && request.method === 'POST') {
      const adminKeyT = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!adminKeyT || adminKeyT !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Geen toegang' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const uploadBody = await request.json().catch(() => ({}));
      const { doc_type, tekst, begeleider_naam, begeleider_email } = uploadBody;
      if (!doc_type || !tekst) return new Response(JSON.stringify({ error: 'doc_type en tekst verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!['nda', 'loi', 'bem_verk', 'bem_koper', 'exclusief'].includes(doc_type)) {
        return new Response(JSON.stringify({ error: 'Ongeldig doc_type' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_templates (id TEXT PRIMARY KEY, doc_type TEXT UNIQUE, tekst TEXT, begeleider_naam TEXT, begeleider_email TEXT, updated_at INTEGER)').run().catch(() => {});
      // Template is per begeleider - gebruik email als onderdeel van sleutel
      const safeEmail = (begeleider_email || 'default').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const tId = 'TPL_' + doc_type.toUpperCase() + '_' + safeEmail;
      await env.DB.prepare('INSERT OR REPLACE INTO mna_templates (id, doc_type, tekst, begeleider_naam, begeleider_email, updated_at) VALUES (?,?,?,?,?,?)').bind(tId, doc_type, tekst, begeleider_naam || '', begeleider_email || '', Date.now()).run();
      return new Response(JSON.stringify({ ok: true, doc_type }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* BEGELEIDER TEMPLATE OPHALEN */
    if (path.startsWith('/mna/template/') && request.method === 'GET') {
      const docType = path.replace('/mna/template/', '');
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_templates (id TEXT PRIMARY KEY, doc_type TEXT UNIQUE, tekst TEXT, begeleider_naam TEXT, begeleider_email TEXT, updated_at INTEGER)').run().catch(() => {});
      // Haal template op voor specifieke begeleider (of Marcel als fallback)
      const reqEmail = url.searchParams.get('email') || '';
      let tpl = null;
      if (reqEmail) {
        const safeReqEmail = reqEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        tpl = await env.DB.prepare('SELECT * FROM mna_templates WHERE doc_type=? AND begeleider_email=?').bind(docType, reqEmail).first().catch(() => null);
      }
      // Altijd BF standaard teruggeven - geen templates van andere begeleiders
      if (!tpl) {
        const bfTpl = BF_TEMPLATES[docType] || null;
        if (bfTpl) return new Response(JSON.stringify({ ok: true, tekst: bfTpl, bron: 'bf_standaard', doc_type: docType }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ ok: false, fallback: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, ...tpl }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    
    /* MNA: NDA EMAIL VERSTUREN */
    if (path === '/mna/nda/email' && request.method === 'POST') {
      const ndaBody = await request.json().catch(() => ({}));
      const { code, nda_tekst, to } = ndaBody;
      if (!code || !nda_tekst) return new Response(JSON.stringify({ error: 'code en nda_tekst verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const tInfo = await env.DB.prepare('SELECT kantoor_naam FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
      const kantoor = tInfo?.kantoor_naam || code;
      const toList = Array.isArray(to) && to.length ? to : ['marcel@bisschopsfinancing.nl'];
      if (!toList.includes('marcel@bisschopsfinancing.nl')) toList.push('marcel@bisschopsfinancing.nl');
      if (!env.RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Resend niet geconfigureerd' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const ndaEmail = maakDocEmail('nda', kantoor, nda_tekst);
      const ndaResendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: toList, subject: ndaEmail.subject, html: ndaEmail.html })
      }).catch((e) => null);
      if (!ndaResendResp || !ndaResendResp.ok) {
        const errBody = ndaResendResp ? await ndaResendResp.text().catch(()=>'') : 'netwerkfout';
        return new Response(JSON.stringify({ error: 'E-mail versturen mislukt: ' + errBody.substring(0,200) }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      // Sla NDA op in D1
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN nda_tekst TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN nda_datum INTEGER').run().catch(() => {});
      await env.DB.prepare('UPDATE mna_trajecten SET nda_tekst=?, nda_datum=? WHERE id=?').bind(nda_tekst, Date.now(), code.toUpperCase()).run().catch(() => {});
      // Sla versie op
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_doc_versies (id TEXT PRIMARY KEY, traject_id TEXT, doc_type TEXT, versie INTEGER, tekst TEXT, verstuurd_naar TEXT, verstuurd_door TEXT, created_at INTEGER)').run().catch(() => {});
      const vId = 'V' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
      const vCount = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_doc_versies WHERE traject_id=? AND doc_type=?').bind(code.toUpperCase(), 'nda').first().catch(() => ({n:0}));
      await env.DB.prepare('INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(vId, code.toUpperCase(), 'nda', (vCount?.n||0)+1, nda_tekst, JSON.stringify(toList), 'Marcel Bisschops', Date.now()).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }


    /* MNA: BEMIDDELINGSOVEREENKOMST EMAIL */
    if (path === '/mna/bem/email' && request.method === 'POST') {
      const bemBody = await request.json().catch(() => ({}));
      const { code, bem_tekst, to, type } = bemBody;
      try {
      if (!code || !bem_tekst) return new Response(JSON.stringify({ error: 'code en bem_tekst verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const tInfo = await env.DB.prepare('SELECT kantoor_naam FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
      const kantoor = tInfo?.kantoor_naam || code;
      const toList = Array.isArray(to) && to.length ? to : ['marcel@bisschopsfinancing.nl'];
      if (!toList.includes('marcel@bisschopsfinancing.nl')) toList.push('marcel@bisschopsfinancing.nl');
      if (!env.RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Resend niet geconfigureerd' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const typeLabel = type === 'aankoop' ? 'Bemiddelingsovereenkomst Aankoop' : 'Bemiddelingsovereenkomst Verkoop';
      // Echte Algemene Voorwaarden Bisschops Financing B.V.
      const avTekst = '\n\n---\n\nALGEMENE VOORWAARDEN\nBisschops Financing B.V.\nArtikel 1 – Toepasselijkheid\nDeze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, offertes, opdrachten, overeenkomsten en werkzaamheden van Bisschops Financing B.V. (hierna: Bisschops Financing).\nDeze voorwaarden gelden mede ten behoeve van alle aan Bisschops Financing verbonden personen en rechtspersonen, waaronder bestuurders, aandeelhouders, werknemers, adviseurs en ingeschakelde derden.\nAfwijkingen van deze voorwaarden zijn slechts geldig indien schriftelijk overeengekomen.\nDe toepasselijkheid van algemene voorwaarden van de wederpartij wordt uitdrukkelijk uitgesloten.\nArtikel 2 – Definities\nOpdrachtgever: De natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met Bisschops Financing, alsmede iedere rechtspersoon of persoon namens wie wordt gehandeld of die economisch met de opdracht is verbonden.\nGelieerde Entiteit: Iedere rechtspersoon of natuurlijke persoon die direct of indirect organisatorisch, juridisch, financieel of economisch is verbonden aan Opdrachtgever.\nIntroductie: Het moment waarop Bisschops Financing identificerende gegevens van een potentiële koper, verkoper, investeerder, target of andere transactiedeelnemer verstrekt, dan wel een ontmoeting of contact tot stand brengt.\nTransactie: Iedere juridische of economische overdracht, participatie, samenwerking of gelijkwaardige constructie (aandelen, activa/passiva, fusie, etc.).\nTransactiewaarde: De totale economische waarde van de Transactie, inclusief vaste koopsom, maximale earn-out, uitgestelde betalingen, vendor loans, overgenomen schulden en overige economische voordelen.\nArtikel 3 – Aard van de dienstverlening\nBisschops Financing verricht haar werkzaamheden naar beste inzicht en vermogen op basis van een inspanningsverplichting.\nBisschops Financing treedt niet op als accountant, fiscalist, advocaat of Register Valuator. Eventuele adviezen van Bisschops Financing kunnen nimmer als zodanig worden opgevat.\nOpdrachtgever blijft volledig verantwoordelijk voor due diligence, risicobeoordeling, fiscale/juridische toetsing en de uiteindelijke besluitvorming.\nArtikel 4 – Vergoedingen en betaling\nTenzij schriftelijk anders overeengekomen gelden de volgende tarieven voor werkzaamheden op regiebasis:\nuurtarief: € 250 exclusief btw;\nreiskosten: € 0,35 per kilometer;\nreistijd: 50% van het geldende uurtarief.\nFacturen dienen te worden voldaan binnen veertien (14) dagen na factuurdatum.\nBij niet-tijdige betaling is Opdrachtgever van rechtswege in verzuim en is wettelijke handelsrente en incassokosten verschuldigd.\nArtikel 5 – Succesfee en nawerking\nIndien een Transactie tot stand komt met een door Bisschops Financing geïntroduceerde of betrokken partij, is de overeengekomen succesfee verschuldigd.\nDit recht blijft bestaan gedurende vierentwintig (24) maanden na de Introductie of beëindiging van de overeenkomst (nawerking).\nIndien na ondertekening van een intentieverklaring (LOI) geen Transactie tot stand komt als rechtstreeks gevolg van:\neen aan Opdrachtgever toerekenbare tekortkoming;\nhet afbreken van onderhandelingen in strijd met redelijkheid en billijkheid;\nhet omzeilen van Bisschops Financing;\nis Opdrachtgever aan Bisschops Financing een vergoeding verschuldigd gelijk aan 50% van de overeengekomen succesfee (of de geschatte succesfee bij een marktconforme transactie).\nArtikel 6 – Anti-omzeiling\nIndien een Transactie direct of indirect wordt gerealiseerd via een Gelieerde Entiteit of alternatieve structuur, blijft de volledige succesfee verschuldigd.\nDaarnaast verbeurt Opdrachtgever een direct opeisbare boete van € 25.000, onverminderd het recht op volledige schadevergoeding.\nArtikel 7 – Aansprakelijkheid\nIedere aansprakelijkheid is uitgesloten, behoudens in geval van opzet of bewuste roekeloosheid van de leiding.\nAansprakelijkheid is beperkt tot uitsluitend directe schade. Indirecte schade (zoals gederfde winst, gemiste besparingen of bedrijfsstagnatie) is uitdrukkelijk uitgesloten.\nIedere aanspraak vervalt indien deze niet binnen twaalf (12) maanden na ontdekking schriftelijk is gemeld.\nArtikel 8 – Geheimhouding\nPartijen verplichten zich tot strikte geheimhouding van alle vertrouwelijke informatie, ook na beëindiging van de overeenkomst.\nArtikel 9 – Rechtskeuze en forum\nOp alle rechtsverhoudingen is uitsluitend Nederlands recht van toepassing.\nGeschillen worden exclusief voorgelegd aan de Rechtbank Oost-Brabant.';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({
          from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
          to: toList,
          ...maakDocEmail(type || 'bem', kantoor, bem_tekst + avTekst)
        })
      });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_doc_versies (id TEXT PRIMARY KEY, traject_id TEXT, doc_type TEXT, versie INTEGER, tekst TEXT, verstuurd_naar TEXT, verstuurd_door TEXT, created_at INTEGER)').run().catch(() => {});
      const bemVId = 'V' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
      const bemVCount = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_doc_versies WHERE traject_id=? AND doc_type=?').bind(code.toUpperCase(), 'bem').first().catch(() => ({n:0}));
      await env.DB.prepare('INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(bemVId, code.toUpperCase(), 'bem', (bemVCount?.n||0)+1, bem_tekst, JSON.stringify(Array.isArray(to)&&to.length?to:[]), 'Marcel Bisschops', Date.now()).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(bemErr) { return new Response(JSON.stringify({ error: 'Server fout: ' + bemErr.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } }); }
    }


    /* MNA: EXCLUSIVITEITSBRIEF EMAIL */
    if (path === '/mna/exclusief/email' && request.method === 'POST') {
      try {
        const exclBody = await request.json().catch(() => ({}));
        const { code, excl_tekst, to } = exclBody;
        if (!code || !excl_tekst) return new Response(JSON.stringify({ error: 'code en excl_tekst verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        const tInfo = await env.DB.prepare('SELECT kantoor_naam FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
        const kantoor = tInfo?.kantoor_naam || code;
        const toList = Array.isArray(to) && to.length ? to : ['marcel@bisschopsfinancing.nl'];
        if (!toList.includes('marcel@bisschopsfinancing.nl')) toList.push('marcel@bisschopsfinancing.nl');
        if (!env.RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Resend niet geconfigureerd' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        const exclEmail = maakDocEmail('exclusief', kantoor, excl_tekst);
        const exclResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
          body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: toList, subject: exclResp?.subject || 'Exclusiviteitsbrief — ' + kantoor, html: exclEmail.html })
        }).catch(() => null);
        // Sla op in versies
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_doc_versies (id TEXT PRIMARY KEY, traject_id TEXT, doc_type TEXT, versie INTEGER, tekst TEXT, verstuurd_naar TEXT, verstuurd_door TEXT, created_at INTEGER)').run().catch(() => {});
        const exclVId = 'V' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
        const exclVCount = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_doc_versies WHERE traject_id=? AND doc_type=?').bind(code.toUpperCase(), 'exclusief').first().catch(() => ({n:0}));
        await env.DB.prepare('INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(exclVId, code.toUpperCase(), 'exclusief', (exclVCount?.n||0)+1, excl_tekst, JSON.stringify(toList), 'Marcel Bisschops', Date.now()).run().catch(() => {});
        // Sla exclusiviteitsbrief op in traject
        await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN excl_tekst TEXT').run().catch(() => {});
        await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN excl_datum INTEGER').run().catch(() => {});
        await env.DB.prepare('UPDATE mna_trajecten SET excl_tekst=?, excl_datum=? WHERE id=?').bind(excl_tekst, Date.now(), code.toUpperCase()).run().catch(() => {});
        return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(exclErr) {
        return new Response(JSON.stringify({ error: 'Server fout: ' + exclErr.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }

    /* MNA: DOCUMENT TEKENEN */
    if (path === '/mna/teken' && request.method === 'POST') {
      const { code, document, naam } = body;
      if (!code || !document || !naam) return new Response(JSON.stringify({ error: 'code, document en naam verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // ALTER TABLE voor teken kolommen
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN nda_getekend TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN loi_getekend TEXT').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN nda_getekend_datum INTEGER').run().catch(() => {});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN loi_getekend_datum INTEGER').run().catch(() => {});
      // Zoek traject + verificeer rol via code
      const upperCode = code.toUpperCase();
      let traject = null;
      let tekenRol = null;
      const tVerk = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(upperCode).first().catch(() => null);
      if (tVerk) { traject = tVerk; tekenRol = 'verkoper'; }
      if (!traject) {
        const tKop = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE koper_code=?').bind(upperCode).first().catch(() => null);
        if (tKop) { traject = tKop; tekenRol = 'koper'; }
      }
      if (!traject) {
        const tTuss = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE tussen_code=?').bind(upperCode).first().catch(() => null);
        if (tTuss) { traject = tTuss; tekenRol = 'begeleider'; }
      }
      if (!traject) return new Response(JSON.stringify({ error: 'Traject niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Koper mag alleen LoI tekenen, verkoper mag NDA en LoI tekenen
      if (tekenRol === 'koper' && document === 'nda') {
        return new Response(JSON.stringify({ error: 'Koper tekent NDA niet via koperscode' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      const now = Date.now();
      const docLabel = document === 'nda' ? 'NDA (Geheimhoudingsovereenkomst)' : 'Letter of Intent (LoI)';
      if (document === 'nda') {
        await env.DB.prepare('UPDATE mna_trajecten SET nda_getekend=?, nda_getekend_datum=? WHERE id=?').bind(naam + ' (' + tekenRol + ')', now, traject.id).run();
      } else if (document === 'loi') {
        await env.DB.prepare('UPDATE mna_trajecten SET loi_getekend=?, loi_getekend_datum=? WHERE id=?').bind(naam + ' (' + tekenRol + ')', now, traject.id).run();
      }
      // Logboek notitie
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_logboek (id TEXT PRIMARY KEY, traject_id TEXT NOT NULL, auteur TEXT, auteur_type TEXT, bericht TEXT, fase TEXT, fase_gewijzigd INTEGER DEFAULT 0, created_at INTEGER NOT NULL)').run().catch(() => {});
      const logId = 'LOG' + now + Math.random().toString(36).slice(2,5).toUpperCase();
      await env.DB.prepare('INSERT INTO mna_logboek (id,traject_id,auteur,auteur_type,bericht,fase,fase_gewijzigd,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(logId, traject.id, naam, 'extern', '✅ ' + docLabel + ' digitaal geaccordeerd door ' + naam, traject.traject_fase || 'voorgesprek', 0, now).run();
      // E-mail notificatie naar Marcel + begeleider
      if (env.RESEND_API_KEY) {
        const toList = ['marcel@bisschopsfinancing.nl'];
        if (traject.begeleider_email && traject.begeleider_email !== 'marcel@bisschopsfinancing.nl') toList.push(traject.begeleider_email);
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
          body: JSON.stringify({
            from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
            to: toList,
            subject: '✅ ' + docLabel + ' geaccordeerd — ' + traject.kantoor_naam,
            html: '<div style="font-family:sans-serif;max-width:600px"><div style="background:#1a7a5e;color:#fff;padding:1.5rem;border-radius:8px 8px 0 0"><h2 style="margin:0;font-size:1.1rem">Akkoord ontvangen</h2></div><div style="background:#fff;border:1px solid #ddd;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px"><p style="font-size:13px;color:#2a2825"><strong>' + naam + '</strong> heeft digitaal akkoord gegeven op de <strong>' + docLabel + '</strong> voor traject <strong>' + traject.kantoor_naam + '</strong>.</p><p style="font-size:12px;color:#8a8880">Datum: ' + new Date(now).toLocaleString('nl-NL') + '</p><p style="font-size:12px;color:#8a8880">Opmerking: Dit is een digitale bevestiging. Voor juridische geldigheid wordt aanbevolen alsnog een handtekening op papier te verzamelen.</p></div></div>'
          })
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }


    /* MNA: TRAJECT BEWERKEN */
    if (path.startsWith('/mna/admin/update/') && request.method === 'POST') {
      const adminKeyU = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!adminKeyU || adminKeyU !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Geen toegang' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const updateId = path.replace('/mna/admin/update/', '').toUpperCase();
      const updateBody = await request.json().catch(() => ({}));
      const { kantoor_naam, contact_naam, contact_email, verkoper_kvk, verkoper_adres, begeleider_naam, begeleider_email, koper_naam, koper_rechtsvorm, koper_contact, koper_email, koper_kvk, koper_adres, verkoper_teken, verkoper_teken_grond, verkoper_teken2, koper_teken, koper_teken_grond, teken_status, notitie, volgend_overleg, extra_contact } = updateBody;
      // Voeg kolommen toe als ze ontbreken
      for (const col of ['verkoper_kvk', 'verkoper_adres', 'koper_kvk', 'koper_adres', 'koper_naam', 'koper_rechtsvorm', 'koper_contact', 'koper_email', 'begeleider_naam', 'begeleider_email', 'verkoper_teken', 'verkoper_teken_grond', 'verkoper_teken2', 'koper_teken', 'koper_teken_grond', 'teken_status', 'notitie', 'volgend_overleg', 'extra_contact']) {
        await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN ' + col + ' TEXT').run().catch(() => {});
      }
      await env.DB.prepare(
        'UPDATE mna_trajecten SET kantoor_naam=?, contact_naam=?, contact_email=?, verkoper_kvk=?, verkoper_adres=?, begeleider_naam=?, begeleider_email=?, koper_naam=?, koper_rechtsvorm=?, koper_contact=?, koper_email=?, koper_kvk=?, koper_adres=?, verkoper_teken=?, verkoper_teken_grond=?, verkoper_teken2=?, koper_teken=?, koper_teken_grond=?, teken_status=?, notitie=?, volgend_overleg=?, extra_contact=?, updated_at=? WHERE id=?'
      ).bind(
        kantoor_naam || '', contact_naam || '', contact_email || '',
        verkoper_kvk || '', verkoper_adres || '',
        begeleider_naam || '', begeleider_email || '',
        koper_naam || '', koper_rechtsvorm || '', koper_contact || '', koper_email || '',
        koper_kvk || '', koper_adres || '',
        verkoper_teken || '', verkoper_teken_grond || '', verkoper_teken2 || '',
        koper_teken || '', koper_teken_grond || '', teken_status || '',
        notitie || '', volgend_overleg || '', extra_contact || '',
        Date.now(), updateId
      ).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: KOPER REACTIE OPSLAAN */
    if (path === '/mna/koper/reactie' && request.method === 'POST') {
      const { code, fase_id, reactie } = body;
      if (!code || !fase_id) return new Response(JSON.stringify({ error: 'code en fase_id verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('ALTER TABLE mna_data ADD COLUMN koper_reactie TEXT').run().catch(() => {});
      await env.DB.prepare(`
        INSERT INTO mna_data (id, traject_id, fase_id, koper_reactie, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET koper_reactie=excluded.koper_reactie, updated_at=excluded.updated_at
      `).bind(code+'_'+fase_id, code.toUpperCase(), fase_id, reactie||'', Date.now()).run().catch(async () => {
        // Fallback: update bestaande rij
        await env.DB.prepare('UPDATE mna_data SET koper_reactie=?, updated_at=? WHERE traject_id=? AND fase_id=?')
          .bind(reactie||'', Date.now(), code.toUpperCase(), fase_id).run().catch(() => {});
      });
      // Notificeer Marcel + begeleider
      if (env.RESEND_API_KEY) {
        const tInfo = await env.DB.prepare('SELECT kantoor_naam, begeleider_email FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
        const kantoor = tInfo?.kantoor_naam || code;
        const faseLabels = {financieel:'I. Financieel',commercieel:'II. Klanten & commercieel',partner:'III. Partners & personeel',compliance:'IV. Compliance & kwaliteit',it:'V. IT & automatisering',juridisch:'VI. Juridisch & fiscaal',strategisch:'VII. Strategisch & markt'};
        const toList = ['marcel@bisschopsfinancing.nl'];
        if (tInfo?.begeleider_email && tInfo.begeleider_email !== 'marcel@bisschopsfinancing.nl') toList.push(tInfo.begeleider_email);
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
          body: JSON.stringify({
            from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
            to: toList,
            subject: 'Koper reactie: ' + kantoor + ' — ' + (faseLabels[fase_id]||fase_id),
            html: '<p>De koper heeft een reactie geplaatst bij <strong>' + (faseLabels[fase_id]||fase_id) + '</strong> voor traject <strong>' + kantoor + '</strong>.</p><blockquote style="border-left:3px solid #1a7a5e;padding:8px 12px;color:#5a5854;font-style:italic">' + (reactie||'').replace(/\n/g,'<br>') + '</blockquote><p><a href="https://koersvoormorgen.nl/marilyn.html">Bekijk in Marilyn</a></p>'
          })
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* SECURITY: LOG OPHALEN */
    if (path === '/admin/security-log' && request.method === 'GET') {
      const secKey = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!secKey || secKey !== (env.ADMIN_KEY||'')) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Haal rate limit status op
      const adminAttempts = _rateMap.get(clientIP + ':admin');
      const advAttempts = _rateMap.get(clientIP + ':advlogin');
      const stats = {
        timestamp: new Date().toISOString(),
        rate_limits: {
          admin_attempts_this_window: adminAttempts ? adminAttempts.count : 0,
          adv_attempts_this_window: advAttempts ? advAttempts.count : 0,
          total_tracked_ips: _rateMap.size
        },
        info: 'Security events worden gelogd via Cloudflare Worker logs (dashboard.cloudflare.com → Workers → kantoorinzicht → Logs)'
      };
      return new Response(JSON.stringify(stats),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* MNA: TRAJECT OPHALEN (kantoor login) */
    if (path.startsWith('/mna/traject/') && (request.method === 'GET' || request.method === 'POST')) {
      // Login rate limiting: max 15 pogingen per 10 min per IP
      const loginIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      if (checkLoginLimit(loginIP)) {
        return new Response(JSON.stringify({ error: 'Te veel inlogpogingen. Wacht 10 minuten en probeer opnieuw.' }), {
          status: 429,
          headers: { ...getCORS(request), 'Content-Type': 'application/json', 'Retry-After': '600' }
        });
      }
      const rawCode = path.replace('/mna/traject/', '').trim();
      if (rawCode.length < 5 || rawCode.length > 12) return new Response(JSON.stringify({ error: 'Ongeldige code' }), { status: 400, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Try as verkoper code first
      let traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(rawCode.toUpperCase()).first().catch(() => null);
      let rol = 'verkoper';
      // Try as koper code
      if (!traject) {
        traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE koper_code=?').bind(rawCode.toUpperCase()).first().catch(() => null);
        if (traject) rol = 'koper';
      }
      // Try as tussenpersoon code
      if (!traject) {
        traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE tussen_code=?').bind(rawCode.toUpperCase()).first().catch(() => null);
        if (traject) rol = 'tussenpersoon';
      }
      if (!traject) return new Response(JSON.stringify({ error: 'Code niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const trajectId = traject.id;
      const data = await env.DB.prepare('SELECT * FROM mna_data WHERE traject_id=?').bind(trajectId).all().catch(() => ({ results: [] }));
      // Audit: login registreren
      await env.DB.prepare('INSERT INTO mna_audit (code, rol, actie, ip, ts) VALUES (?,?,?,?,?)')
        .bind(rawCode.toUpperCase(), rol, 'login', loginIP, Date.now()).run().catch(() => {});
      return new Response(JSON.stringify({ traject, data: data.results, rol }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: AUDIT LOG OPSLAAN */
    if (path === '/mna/audit' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const { code, rol, actie, ts, ...extra } = body;
        if (!code || !actie || !env.DB) return new Response(JSON.stringify({ ok: false }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        // Verificeer dat de code een geldig traject is (voorkomt spam)
        const check = await env.DB.prepare(
          'SELECT id FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=? LIMIT 1'
        ).bind(code.toUpperCase(), code.toUpperCase(), code.toUpperCase()).first().catch(() => null);
        if (!check) return new Response(JSON.stringify({ ok: false }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        const auditIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
        const extraStr = Object.keys(extra).length ? JSON.stringify(extra) : null;
        await env.DB.prepare(
          'INSERT INTO mna_audit (code, rol, actie, ip, ts, extra) VALUES (?,?,?,?,?,?)'
        ).bind(code.toUpperCase(), rol || null, actie, auditIP, ts || Date.now(), extraStr).run().catch(() => {});
        return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }

    /* MNA: AUDIT LOG OPHALEN (admin) */
    if (path.startsWith('/mna/admin/audit/') && request.method === 'GET') {
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const trajectId = path.replace('/mna/admin/audit/', '').trim().toUpperCase();
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Haal alle codes op die bij dit traject horen
      const t = await env.DB.prepare('SELECT id, koper_code, tussen_code FROM mna_trajecten WHERE id=?').bind(trajectId).first().catch(() => null);
      const codes = t ? [t.id, t.koper_code, t.tussen_code].filter(Boolean) : [trajectId];
      const placeholders = codes.map(() => '?').join(',');
      const logs = await env.DB.prepare(
        `SELECT * FROM mna_audit WHERE code IN (${placeholders}) ORDER BY ts DESC LIMIT 200`
      ).bind(...codes).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(logs.results || []), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: DATA OPSLAAN (kantoor) */
    if (path === '/mna/save' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { code, fase_id, data_json, checklist_json, notitie } = body;
      if (!code || !fase_id || !env.DB) return new Response(JSON.stringify({ error: 'Ongeldig verzoek' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Check if vergrendeld
      const tCheck = await env.DB.prepare('SELECT status FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
      if (tCheck && tCheck.status === 'vergrendeld') return new Response(JSON.stringify({ error: 'vergrendeld', message: 'Dit traject is vergrendeld en kan niet meer worden gewijzigd.' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const id = code + '_' + fase_id;
      const dataStr = JSON.stringify(data_json||{});
      const aantalVelden = Object.keys(data_json||{}).length;
      await env.DB.prepare('INSERT OR REPLACE INTO mna_data (id,traject_id,fase_id,data_json,checklist_json,notitie,updated_at) VALUES (?,?,?,?,?,?,?)')
        .bind(id, code.toUpperCase(), fase_id, dataStr, JSON.stringify(checklist_json||{}), notitie||'', Date.now()).run();
      await env.DB.prepare('UPDATE mna_trajecten SET updated_at=?, status=? WHERE id=?')
        .bind(Date.now(), 'in_behandeling', code.toUpperCase()).run();
      // E-mail notificatie: niet-blokkerend via ctx.waitUntil
      if (env.RESEND_API_KEY && ctx) {
        ctx.waitUntil((async () => {
          try {
            await env.DB.prepare('CREATE TABLE IF NOT EXISTS kv_store (sleutel TEXT PRIMARY KEY, waarde TEXT)').run().catch(() => {});
            const drempelMs = 3 * 60 * 60 * 1000;
            const now = Date.now();
            const throttleKey = 'mail_throttle_' + code.toUpperCase();
            const throttleRow = await env.DB.prepare('SELECT waarde FROM kv_store WHERE sleutel=?').bind(throttleKey).first().catch(() => null);
            const lastSent = throttleRow ? parseInt(throttleRow.waarde || '0') : 0;
            if (now - lastSent > drempelMs) {
              const tInfo = await env.DB.prepare('SELECT kantoor_naam, contact_naam, contact_email, begeleider_email FROM mna_trajecten WHERE id=?').bind(code.toUpperCase()).first().catch(() => null);
              const kantoor = tInfo?.kantoor_naam || code;
              const alleData = await env.DB.prepare('SELECT fase_id, data_json FROM mna_data WHERE traject_id=?').bind(code.toUpperCase()).all().catch(() => ({results:[]}));
              const faseLabels = {financieel:'I. Financieel',commercieel:'II. Klanten',partner:'III. Partners',compliance:'IV. Compliance',it:'V. IT',juridisch:'VI. Juridisch',strategisch:'VII. Strategisch'};
              let overzicht = '';
              for (const row of (alleData.results || [])) {
                try {
                  const dj = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
                  const gevuld = Object.values(dj || {}).filter(v => v && v.value);
                  if (gevuld.length) overzicht += '<tr><td style="padding:6px 10px;font-weight:600;color:#1a7a5e">' + (faseLabels[row.fase_id]||row.fase_id) + '</td><td style="padding:6px 10px;font-size:12px;color:#5a5854">' + gevuld.map(v => v.label + ': ' + v.value).join('<br>') + '</td></tr>';
                } catch(e) {}
              }
              const toList = ['marcel@bisschopsfinancing.nl'];
              if (tInfo?.begeleider_email && tInfo.begeleider_email !== 'marcel@bisschopsfinancing.nl') toList.push(tInfo.begeleider_email);
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
                body: JSON.stringify({
                  from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>',
                  to: toList,
                  subject: 'M&A samenvatting: ' + kantoor + ' — voortgang bijgewerkt',
                  html: '<h2 style="font-family:sans-serif;color:#1a1815">M&A voortgang: ' + kantoor + '</h2>'
                    + '<p style="font-family:sans-serif;font-size:13px;color:#5a5854">Overzicht van alle ingevulde gegevens (verzonden max. 1x per 3 uur):</p>'
                    + (overzicht ? '<table style="border-collapse:collapse;width:100%;font-family:sans-serif">' + overzicht + '</table>' : '<p style="font-family:sans-serif;font-size:12px;color:#8a8880">Nog geen data ingevuld.</p>')
                    + '<p style="font-family:sans-serif;font-size:12px;margin-top:1rem"><a href="https://koersvoormorgen.nl/marilyn.html" style="color:#1a7a5e">Bekijk in Marilyn</a></p>'
                })
              }).catch(() => {});
              await env.DB.prepare('INSERT OR REPLACE INTO kv_store (sleutel, waarde) VALUES (?,?)').bind(throttleKey, String(now)).run().catch(() => {});
            }
          } catch(e) { /* mail throttle fout — geen probleem */ }
        })());
      }
      return new Response(JSON.stringify({ ok: true, fase_id, velden: aantalVelden }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    if (path === '/mna/scan-to-traject' && request.method === 'POST') {
      const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const body = await request.json().catch(() => ({}));
      const { scan_id, kantoor_naam, contact_email, contact_naam, traject_type, notitie } = body;
      if (!scan_id || !kantoor_naam) return new Response(JSON.stringify({error:'scan_id en kantoor_naam verplicht'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Genereer unieke trajectcode
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const code = Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
      const koperCode = Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
      const tussenCode = Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
      const now = Date.now();
      await env.DB.prepare('INSERT INTO mna_trajecten (id,kantoor_naam,contact_naam,contact_email,traject_type,notitie,status,created_at,updated_at,koper_code,tussen_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(code, kantoor_naam, contact_naam||'', contact_email||'', traject_type||'Verkoop', (notitie||'')+'\nGekoppeld aan scan: '+scan_id, 'actief', now, now, koperCode, tussenCode).run();
      return new Response(JSON.stringify({ ok: true, code, koper_code: koperCode, tussen_code: tussenCode }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: ALLE TRAJECTEN (admin) */
    if (path === '/mna/admin/lijst' && request.method === 'GET') {
      // Gebruiker-token check: adviseur ziet alleen eigen trajecten
      const gLijst = await gebruikerViaToken(request);
      if (gLijst && !isSuperAdmin(request)) {
        const lData = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE gebruiker_id=? ORDER BY created_at DESC').bind(gLijst.id).all().catch(()=>({results:[]}));
        return new Response(JSON.stringify(lData.results||[]),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      }
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      const validKey = env.ADMIN_KEY || '';
      if (key !== validKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const lijst = await env.DB.prepare('SELECT * FROM mna_trajecten ORDER BY updated_at DESC').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(lijst.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: TRAJECT DETAIL (admin) */
    if (path.startsWith('/mna/admin/detail/') && request.method === 'GET') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      const validKey = env.ADMIN_KEY || '';
      if (key !== validKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const code = path.replace('/mna/admin/detail/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(code).first().catch(() => null);
      const data = await env.DB.prepare('SELECT * FROM mna_data WHERE traject_id=?').bind(code).all().catch(() => ({ results: [] }));
      // Documenten meesturen voor debug (alleen naam, fase, extractie-methode en veld_extractie)
      const docs = await env.DB.prepare(
        'SELECT id, fase_id, bestand_naam, methode, veld_extractie, uploaded_at FROM mna_documenten WHERE traject_id=? ORDER BY uploaded_at ASC'
      ).bind(code).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ traject, data: data.results, documenten: docs.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: GESPREKKEN - OPHALEN (admin) */
    // GESPREKKEN via tussenpersoonscode (voor adviseurs zonder admin-key)
    if (path.startsWith('/mna/gesprekken/') && request.method === 'GET') {
      const tCode = path.replace('/mna/gesprekken/', '').split('?')[0].toUpperCase();
      const tGesp = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(tCode,tCode,tCode).first().catch(()=>null);
      if (!tGesp) return new Response(JSON.stringify({error:'Niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const trajId = tGesp.id;
      const gesprekken = await env.DB.prepare('SELECT * FROM mna_gesprekken WHERE traject_id=? ORDER BY datum DESC, created_at DESC').bind(trajId).all().catch(()=>({results:[]}));
      return new Response(JSON.stringify(gesprekken.results||[]),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    // GESPREK OPSLAAN via tussenpersoonscode
    if (path === '/mna/gesprek/opslaan' && request.method === 'POST') {
      const gBody = await request.json().catch(()=>({}));
      const tCode = (gBody.code||'').toUpperCase();
      const tGesp2 = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(tCode,tCode,tCode).first().catch(()=>null);
      if (!tGesp2) return new Response(JSON.stringify({error:'Traject niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const trajId = tGesp2.id;
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_gesprekken (id TEXT PRIMARY KEY, traject_id TEXT, datum TEXT, deelnemers TEXT, type TEXT, ruwe_notities TEXT, verslag TEXT, created_at INTEGER, updated_at INTEGER)').run().catch(()=>{});
      const gId = 'G' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
      await env.DB.prepare('INSERT INTO mna_gesprekken (id,traject_id,datum,deelnemers,type,ruwe_notities,verslag,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(gId, trajId, gBody.datum||new Date().toISOString().split('T')[0], gBody.deelnemers||'', gBody.type||'overig', gBody.ruwe_notities||'', gBody.verslag||'', Date.now(), Date.now())
        .run().catch(()=>{});
      return new Response(JSON.stringify({ok:true,id:gId}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path.startsWith('/mna/admin/gesprekken/') && request.method === 'GET') {
      const code = path.replace('/mna/admin/gesprekken/', '').split('?')[0].toUpperCase();
      const auth = await begeleiderAuth(request, code);
      if (!auth.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_gesprekken (
        id TEXT PRIMARY KEY,
        traject_id TEXT NOT NULL,
        datum TEXT,
        deelnemers TEXT,
        type TEXT DEFAULT 'gesprek',
        ruwe_notities TEXT,
        verslag TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`).run().catch(() => {});
      const gesprekken = await env.DB.prepare('SELECT * FROM mna_gesprekken WHERE traject_id=? ORDER BY datum DESC, created_at DESC').bind(code).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ gesprekken: gesprekken.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: GESPREKKEN - OPSLAAN (admin) */
    if (path.startsWith('/mna/admin/gesprekken/') && request.method === 'POST') {
      const code = path.replace('/mna/admin/gesprekken/', '').toUpperCase();
      const auth = await begeleiderAuth(request, code);
      if (!auth.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_gesprekken (
        id TEXT PRIMARY KEY,
        traject_id TEXT NOT NULL,
        datum TEXT,
        deelnemers TEXT,
        type TEXT DEFAULT 'gesprek',
        ruwe_notities TEXT,
        verslag TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`).run().catch(() => {});
      const now = Date.now();
      if (body.id) {
        // Update bestaand gesprek
        await env.DB.prepare('UPDATE mna_gesprekken SET datum=?, deelnemers=?, type=?, ruwe_notities=?, verslag=?, updated_at=? WHERE id=? AND traject_id=?')
          .bind(body.datum||'', body.deelnemers||'', body.type||'gesprek', body.ruwe_notities||'', body.verslag||'', now, body.id, code).run();
        return new Response(JSON.stringify({ ok: true, id: body.id }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } else {
        // Nieuw gesprek
        const gId = 'G' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
        await env.DB.prepare('INSERT INTO mna_gesprekken (id,traject_id,datum,deelnemers,type,ruwe_notities,verslag,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(gId, code, body.datum||'', body.deelnemers||'', body.type||'gesprek', body.ruwe_notities||'', body.verslag||'', now, now).run();
        return new Response(JSON.stringify({ ok: true, id: gId }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }

    /* MNA: GESPREKKEN - VERWIJDEREN (admin) */
    if (path.startsWith('/mna/admin/gesprek/delete/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (key !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const gId = path.replace('/mna/admin/gesprek/delete/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM mna_gesprekken WHERE id=?').bind(gId).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_gesprek_bijlagen WHERE gesprek_id=?').bind(gId).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: GESPREK BIJLAGE - UPLOAD */
    if (path.startsWith('/mna/admin/gesprek/bijlage/') && !path.includes('/delete/') && !path.includes('/bijlagen/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (key !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const gesprekId = path.replace('/mna/admin/gesprek/bijlage/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_gesprek_bijlagen (
        id TEXT PRIMARY KEY, gesprek_id TEXT NOT NULL, traject_id TEXT,
        bestand_naam TEXT, bestand_type TEXT, bestand_grootte INTEGER,
        r2_key TEXT, tekst TEXT, uploaded_at INTEGER NOT NULL
      )`).run().catch(() => {});
      let fileBytes, fileName, fileType, fileSize;
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return new Response(JSON.stringify({ error: 'Geen bestand' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        fileName = file.name || 'bijlage';
        fileType = file.type || 'application/octet-stream';
        const buffer = await file.arrayBuffer();
        fileBytes = new Uint8Array(buffer);
        fileSize = fileBytes.length;
      } catch(e) {
        return new Response(JSON.stringify({ error: 'Leesfout: ' + e.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      if (fileSize > 15 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Max 15MB' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const bijlageId = 'B' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
      const ext = fileName.split('.').pop().toLowerCase();
      let r2Key = null;
      if (env.DOCS_BUCKET) {
        r2Key = 'gesprekken/' + gesprekId + '/' + bijlageId + '.' + ext;
        await env.DOCS_BUCKET.put(r2Key, fileBytes, { httpMetadata: { contentType: fileType } });
      }
      let tekst = '';
      const isPdf = ext === 'pdf' || fileType.includes('pdf');
      const isText = ['txt','eml','msg','html','htm','md','csv'].includes(ext) || fileType.startsWith('text/');
      if (isText && fileSize < 500000) {
        tekst = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes).substring(0, 8000);
      } else if (isPdf && fileSize < 5 * 1024 * 1024 && env.ANTHROPIC_API_KEY) {
        try {
          const chunkSize = 8192; let b64 = '';
          for (let i = 0; i < fileBytes.length; i += chunkSize) {
            b64 += btoa(String.fromCharCode(...fileBytes.slice(i, i + chunkSize)));
          }
          const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000,
              messages: [{ role: 'user', content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
                { type: 'text', text: 'Extraheer de volledige tekst uit dit document. Geef alleen de tekst terug, geen commentaar.' }
              ]}]
            })
          });
          const aiData = await aiResp.json();
          tekst = aiData.content?.[0]?.text?.substring(0, 8000) || '';
        } catch(e) { tekst = ''; }
      }
      await env.DB.prepare('INSERT INTO mna_gesprek_bijlagen (id,gesprek_id,bestand_naam,bestand_type,bestand_grootte,r2_key,tekst,uploaded_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(bijlageId, gesprekId, fileName, fileType, fileSize, r2Key||'', tekst, Date.now()).run();
      return new Response(JSON.stringify({ ok: true, id: bijlageId, naam: fileName, tekst_beschikbaar: tekst.length > 0 }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: GESPREK BIJLAGEN - OPHALEN */
    if (path.startsWith('/mna/admin/gesprek/bijlagen/') && request.method === 'GET') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (key !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const gesprekId = path.replace('/mna/admin/gesprek/bijlagen/', '').split('?')[0];
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_gesprek_bijlagen (id TEXT PRIMARY KEY, gesprek_id TEXT NOT NULL, traject_id TEXT, bestand_naam TEXT, bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, tekst TEXT, uploaded_at INTEGER NOT NULL)').run().catch(() => {});
      const bijlagen = await env.DB.prepare('SELECT id,bestand_naam,bestand_type,bestand_grootte,tekst,uploaded_at FROM mna_gesprek_bijlagen WHERE gesprek_id=? ORDER BY uploaded_at ASC').bind(gesprekId).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ bijlagen: bijlagen.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: GESPREK BIJLAGE - VERWIJDEREN */
    if (path.startsWith('/mna/admin/gesprek/bijlage/delete/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (key !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const bId = path.replace('/mna/admin/gesprek/bijlage/delete/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const b = await env.DB.prepare('SELECT r2_key FROM mna_gesprek_bijlagen WHERE id=?').bind(bId).first().catch(() => null);
      if (b?.r2_key && env.DOCS_BUCKET) await env.DOCS_BUCKET.delete(b.r2_key).catch(() => {});
      await env.DB.prepare('DELETE FROM mna_gesprek_bijlagen WHERE id=?').bind(bId).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: STATUS WIJZIGEN (admin) */

    /* MNA: LOGBOEK - OPHALEN */
    if (path.startsWith('/mna/logboek/') && request.method === 'GET') {
      const url = new URL(request.url);
      const rawCode = path.replace('/mna/logboek/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // ALTER TABLE voor nieuwe kolommen
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN traject_fase TEXT DEFAULT \'voorgesprek\'').run().catch(() => {});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_logboek (id TEXT PRIMARY KEY, traject_id TEXT NOT NULL, auteur TEXT, auteur_type TEXT, bericht TEXT, fase TEXT, fase_gewijzigd INTEGER DEFAULT 0, created_at INTEGER NOT NULL)').run().catch(() => {});
      // Zoek traject op alle codes
      let traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(rawCode).first().catch(() => null);
      if (!traject) traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE koper_code=?').bind(rawCode).first().catch(() => null);
      if (!traject) traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE tussen_code=?').bind(rawCode).first().catch(() => null);
      if (!traject) return new Response(JSON.stringify({ error: 'Traject niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const logboek = await env.DB.prepare('SELECT * FROM mna_logboek WHERE traject_id=? ORDER BY created_at ASC').bind(traject.id).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ traject_fase: traject.traject_fase || 'voorgesprek', logboek: logboek.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* MNA: LOGBOEK - TOEVOEGEN */
    if (path.startsWith('/mna/logboek/') && request.method === 'POST') {
      const url = new URL(request.url);
      const rawCode = path.replace('/mna/logboek/', '').toUpperCase();
      const body = await request.json().catch(() => ({}));
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN traject_fase TEXT DEFAULT \'voorgesprek\'').run().catch(() => {});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_logboek (id TEXT PRIMARY KEY, traject_id TEXT NOT NULL, auteur TEXT, auteur_type TEXT, bericht TEXT, fase TEXT, fase_gewijzigd INTEGER DEFAULT 0, created_at INTEGER NOT NULL)').run().catch(() => {});
      // Auth: admin key of tussen_code
      const adminKey = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      const isAdmin = adminKey && adminKey === (env.ADMIN_KEY || '');
      // Zoek traject
      let traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(rawCode).first().catch(() => null);
      if (!traject) traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE tussen_code=?').bind(rawCode).first().catch(() => null);
      if (!traject) return new Response(JSON.stringify({ error: 'Traject niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const isBegeleider = traject.tussen_code && rawCode === traject.tussen_code;
      if (!isAdmin && !isBegeleider) return new Response(JSON.stringify({ error: 'Geen toegang' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const { bericht, nieuwe_fase, auteur_naam } = body;
      if (!bericht && !nieuwe_fase) return new Response(JSON.stringify({ error: 'bericht of nieuwe_fase verplicht' }), { status: 400, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const FASES = ['voorgesprek', 'kennismaking', 'pre_dd', 'due_diligence', 'verkoop'];
      const faseNamen = { voorgesprek: 'Voorgesprek', kennismaking: 'Kennismaking', pre_dd: 'Pre-DD (LoI)', due_diligence: 'Due Diligence', verkoop: 'Verkoop / Closing' };
      const logId = 'LOG' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
      const now = Date.now();
      const auteur_type = isAdmin ? 'admin' : 'begeleider';
      const fase_gewijzigd = nieuwe_fase && FASES.includes(nieuwe_fase) ? 1 : 0;
      const huidige_fase = traject.traject_fase || 'voorgesprek';
      const log_fase = nieuwe_fase || huidige_fase;
      const log_bericht = bericht || ('Fase gewijzigd naar: ' + (faseNamen[nieuwe_fase] || nieuwe_fase));
      await env.DB.prepare('INSERT INTO mna_logboek (id,traject_id,auteur,auteur_type,bericht,fase,fase_gewijzigd,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(logId, traject.id, auteur_naam || (isAdmin ? 'Marcel Bisschops' : traject.begeleider_naam || 'Begeleider'), auteur_type, log_bericht, log_fase, fase_gewijzigd, now).run();
      if (fase_gewijzigd) await env.DB.prepare('UPDATE mna_trajecten SET traject_fase=?, updated_at=? WHERE id=?').bind(nieuwe_fase, now, traject.id).run();
      // E-mail naar alle partijen
      if (env.RESEND_API_KEY) {
        const toList = ['marcel@bisschopsfinancing.nl'];
        if (traject.begeleider_email && !toList.includes(traject.begeleider_email)) toList.push(traject.begeleider_email);
        if (traject.contact_email && !toList.includes(traject.contact_email)) toList.push(traject.contact_email);
        if (traject.koper_email && !toList.includes(traject.koper_email)) toList.push(traject.koper_email);
        const faseLabel = faseNamen[log_fase] || log_fase;
        const subject = fase_gewijzigd ? 'Traject ' + traject.kantoor_naam + ' — nieuwe fase: ' + faseLabel : 'Logboeknotitie — ' + traject.kantoor_naam;
        const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto">'
          + '<div style="background:#1a7a5e;color:#fff;padding:1.5rem;border-radius:8px 8px 0 0"><h2 style="margin:0;font-size:1.1rem">KantoorInzicht M&A</h2><p style="margin:.3rem 0 0;opacity:.8;font-size:13px">Traject: ' + traject.kantoor_naam + '</p></div>'
          + '<div style="background:#fff;border:1px solid #ddd;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px">'
          + (fase_gewijzigd ? '<div style="background:#f0faf6;border-left:4px solid #1a7a5e;padding:.75rem 1rem;margin-bottom:1rem;border-radius:0 6px 6px 0"><strong>Fase gewijzigd naar: ' + faseLabel + '</strong></div>' : '')
          + '<p style="font-size:13px;color:#5a5854;line-height:1.7"><strong>' + (auteur_naam || (isAdmin ? 'Marcel Bisschops' : traject.begeleider_naam || 'Begeleider')) + ':</strong><br>' + log_bericht.replace(/\n/g,'<br>') + '</p>'
          + '<p style="font-size:12px;color:#8a8880;margin-top:1.5rem;border-top:1px solid #eee;padding-top:.75rem">Bekijk het traject op <a href="https://koersvoormorgen.nl/mna.html">koersvoormorgen.nl/mna.html</a></p>'
          + '</div></div>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
          body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: toList, subject, html })
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true, log_id: logId, fase: log_fase, fase_gewijzigd }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('/mna/admin/status/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      const validKey = env.ADMIN_KEY || '';
      if (key !== validKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const code = path.replace('/mna/admin/status/', '').toUpperCase();
      const body = await request.json().catch(() => ({}));
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('UPDATE mna_trajecten SET status=?, updated_at=? WHERE id=?').bind(body.status||'actief', Date.now(), code).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* MNA: VERGRENDEL TRAJECT (admin) */
    if (path.startsWith('/mna/admin/vergrendel/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if ((key) !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const code = path.replace('/mna/admin/vergrendel/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const vergrendeld_op = Date.now();
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN vergrendeld_op INTEGER').run().catch(() => {});
      await env.DB.prepare('UPDATE mna_trajecten SET status=?, vergrendeld_op=?, updated_at=? WHERE id=?')
        .bind('vergrendeld', vergrendeld_op, vergrendeld_op, code).run();
      return new Response(JSON.stringify({ ok: true, vergrendeld_op }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* DELETE: SCAN */
    if (path.startsWith('/admin/delete/scan/') && (request.method === 'DELETE' || request.method === 'POST')) {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const id = path.replace('/admin/delete/scan/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM scans WHERE id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM rapporten WHERE scan_id=?').bind(id).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* DELETE: CALLBACK */
    if (path.startsWith('/admin/delete/callback/') && (request.method === 'DELETE' || request.method === 'POST')) {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const id = path.replace('/admin/delete/callback/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM callbacks WHERE id=?').bind(id).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* DELETE: MNA TRAJECT */
    if (path.startsWith('/admin/delete/mna/') && (request.method === 'DELETE' || request.method === 'POST')) {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const id = path.replace('/admin/delete/mna/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM mna_groep_trajecten WHERE traject_id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_documenten WHERE traject_id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_data WHERE traject_id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_logboek WHERE traject_id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_doc_versies WHERE traject_id=?').bind(id).run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_templates WHERE id LIKE ?').bind('TPL_%').run().catch(() => {});
      await env.DB.prepare('DELETE FROM mna_trajecten WHERE id=?').bind(id).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('/admin/wis-data/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const id = path.replace('/admin/wis-data/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Wis alleen de DD-data (ingevulde velden) — documenten en traject blijven bewaard
      await env.DB.prepare('DELETE FROM mna_data WHERE traject_id=?').bind(id).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* VERSIE */
    if (path === '/mna/versie' && request.method === 'GET') {
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS kv_store (sleutel TEXT PRIMARY KEY, waarde TEXT)').run().catch(()=>{});
      const row = await env.DB.prepare('SELECT waarde FROM kv_store WHERE sleutel=?').bind('mna_versie').first().catch(()=>null);
      const versie = row ? row.waarde : '1.0';
      return new Response(JSON.stringify({ versie }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    if (path === '/admin/versie-reset' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(()=>({}));
      const nieuweVersie = body.versie || '1.0';
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS kv_store (sleutel TEXT PRIMARY KEY, waarde TEXT)').run().catch(()=>{});
      await env.DB.prepare('INSERT OR REPLACE INTO kv_store (sleutel, waarde) VALUES (?,?)').bind('mna_versie', nieuweVersie).run();
      return new Response(JSON.stringify({ ok: true, versie: nieuweVersie }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ADMIN LOGIN NOTIFICATION */
    if (path === '/admin/login-notify' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      const now = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });
      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
          body: JSON.stringify({
            from: 'KantoorInzicht <noreply@koersvoormorgen.nl>',
            to: ['marcel@bisschopsfinancing.nl'],
            subject: 'Admin login KantoorInzicht -- ' + now,
            text: 'Er is ingelogd op het admin-dashboard van KantoorInzicht.\n\nTijdstip: ' + now + '\nIP: ' + (body.ip || 'onbekend') + '\n\nAls u dit niet zelf was, wijzig dan direct uw admin-sleutel in Cloudflare.'
          })
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* == RAPPORT: CHECK LIMIT == */
    if (path === '/rapport/check' && request.method === 'GET') {
      const url = new URL(request.url);
      const email = (url.searchParams.get('email') || '').toLowerCase().trim();
      if (!email || !env.DB) return new Response(JSON.stringify({ blocked: false }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS rapport_usage (
        id TEXT PRIMARY KEY, email TEXT, ip TEXT, created_at INTEGER
      )`).run().catch(() => {});
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      // Whitelist: eigen e-mailadres altijd onbeperkt
      const WHITELIST = ['marcel@bisschopsfinancing.nl','info@kdobox.nl','marcel.bisschops@gmail.com'];
      if (WHITELIST.includes(email)) {
        return new Response(JSON.stringify({ blocked: false, whitelisted: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      const countEmail = await env.DB.prepare('SELECT COUNT(*) as n FROM rapport_usage WHERE email=?').bind(email).first().catch(() => ({ n: 0 }));
      const countIp = await env.DB.prepare('SELECT COUNT(*) as n FROM rapport_usage WHERE ip=? AND email!=?').bind(ip, email).first().catch(() => ({ n: 0 }));
      const blocked = (countEmail.n >= 5) || (countIp.n >= 10);
      return new Response(JSON.stringify({ blocked, count_email: countEmail.n, count_ip: countIp.n }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == RAPPORT: TRACK USAGE == */
    if (path === '/rapport/track' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const email = (body.email || '').toLowerCase().trim();
      if (!email || !env.DB) return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS rapport_usage (
        id TEXT PRIMARY KEY, email TEXT, ip TEXT, created_at INTEGER
      )`).run().catch(() => {});
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const id = email + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await env.DB.prepare('INSERT INTO rapport_usage (id, email, ip, created_at) VALUES (?, ?, ?, ?)').bind(id, email, ip, Date.now()).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == RAPPORT USAGE: ADMIN OVERZICHT == */
    if (path === '/admin/rapport-usage' && request.method === 'GET') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const rows = await env.DB.prepare('SELECT email, COUNT(*) as rapporten, MAX(created_at) as laatste FROM rapport_usage GROUP BY email ORDER BY rapporten DESC').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(rows.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* == MNA GROEP: AANMAKEN == */
    if (path === '/mna/groep/create' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_groepen (
        id TEXT PRIMARY KEY, naam TEXT, omschrijving TEXT, tussen_code TEXT,
        created_at INTEGER, updated_at INTEGER
      )`).run().catch(() => {});
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_groep_trajecten (
        id TEXT PRIMARY KEY, groep_id TEXT, traject_id TEXT, added_at INTEGER
      )`).run().catch(() => {});
      const groepId = 'G' + Math.random().toString(36).slice(2,6).toUpperCase();
      const tussenCode = 'GT' + Math.random().toString(36).slice(2,6).toUpperCase();
      await env.DB.prepare('INSERT INTO mna_groepen (id,naam,omschrijving,tussen_code,created_at,updated_at) VALUES (?,?,?,?,?,?)')
        .bind(groepId, body.naam||'Groep', body.omschrijving||'', tussenCode, Date.now(), Date.now()).run();
      return new Response(JSON.stringify({ ok: true, groep_id: groepId, tussen_code: tussenCode }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA GROEP: TRAJECT TOEVOEGEN == */
    if (path === '/mna/groep/koppel' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      if (!env.DB || !body.groep_id || !body.traject_id) return new Response(JSON.stringify({ error: 'groep_id en traject_id verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_groep_trajecten (
        id TEXT PRIMARY KEY, groep_id TEXT, traject_id TEXT, added_at INTEGER
      )`).run().catch(() => {});
      const koppelId = body.groep_id + '_' + body.traject_id;
      await env.DB.prepare('INSERT OR REPLACE INTO mna_groep_trajecten (id,groep_id,traject_id,added_at) VALUES (?,?,?,?)')
        .bind(koppelId, body.groep_id, body.traject_id.toUpperCase(), Date.now()).run();
      await env.DB.prepare('UPDATE mna_groepen SET updated_at=? WHERE id=?').bind(Date.now(), body.groep_id).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA GROEP: TRAJECT ONTKOPPELEN == */
    if (path === '/mna/groep/ontkoppel' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const koppelId = body.groep_id + '_' + body.traject_id;
      await env.DB.prepare('DELETE FROM mna_groep_trajecten WHERE id=?').bind(koppelId).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA GROEP: DETAIL (voor dashboard) == */
    if (path.startsWith('/mna/groep/detail/') && request.method === 'GET') {
      const rawCode = path.replace('/mna/groep/detail/', '').trim();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Accept groep_id or tussen_code
      let groep = await env.DB.prepare('SELECT * FROM mna_groepen WHERE id=?').bind(rawCode.toUpperCase()).first().catch(() => null);
      let rol = 'admin';
      if (!groep) {
        groep = await env.DB.prepare('SELECT * FROM mna_groepen WHERE tussen_code=?').bind(rawCode.toUpperCase()).first().catch(() => null);
        if (groep) rol = 'tussenpersoon';
      }
      if (!groep) return new Response(JSON.stringify({ error: 'Groep niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Get all trajecten in this groep
      const koppelingen = await env.DB.prepare('SELECT traject_id FROM mna_groep_trajecten WHERE groep_id=?').bind(groep.id).all().catch(() => ({ results: [] }));
      const trajectIds = koppelingen.results.map(r => r.traject_id);
      // Fetch traject info and data for each
      const trajecten = [];
      for (const tid of trajectIds) {
        const t = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(tid).first().catch(() => null);
        if (!t) continue;
        const data = await env.DB.prepare('SELECT fase_id, data_json, checklist_json, notitie FROM mna_data WHERE traject_id=?').bind(tid).all().catch(() => ({ results: [] }));
        trajecten.push({ traject: t, data: data.results });
      }
      return new Response(JSON.stringify({ groep, trajecten, rol }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA GROEP: LIJST (admin) == */
    if (path === '/mna/groep/lijst' && request.method === 'GET') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const groepen = await env.DB.prepare('SELECT g.*, COUNT(gt.traject_id) as aantal FROM mna_groepen g LEFT JOIN mna_groep_trajecten gt ON g.id=gt.groep_id GROUP BY g.id ORDER BY g.updated_at DESC').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(groepen.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA GROEP: VERWIJDEREN (admin) == */
    if (path.startsWith('/mna/groep/delete/') && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const groepId = path.replace('/mna/groep/delete/', '').toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM mna_groepen WHERE id=?').bind(groepId).run();
      await env.DB.prepare('DELETE FROM mna_groep_trajecten WHERE groep_id=?').bind(groepId).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* == MNA: KOPER VRIJGEVEN == */
    if (path.startsWith('/mna/admin/vrijgeven/') && request.method === 'POST') {
      const code = path.replace('/mna/admin/vrijgeven/', '').toUpperCase();
      const auth = await begeleiderAuth(request, code);
      if (!auth.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // NDA-check: koper mag dataroom pas zien als NDA getekend is
      const tCheck = await env.DB.prepare('SELECT nda_getekend, kantoor_naam FROM mna_trajecten WHERE id=?').bind(code).first().catch(() => null);
      const forceParam = url.searchParams.get('force');
      if (!tCheck?.nda_getekend && forceParam !== '1') {
        return new Response(JSON.stringify({ ok: false, nda_niet_getekend: true, kantoor: tCheck?.kantoor_naam || code }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN koper_vrijgegeven INTEGER DEFAULT 0').run().catch(() => {});
      await env.DB.prepare('UPDATE mna_trajecten SET koper_vrijgegeven=1, updated_at=? WHERE id=?').bind(Date.now(), code).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    if (path.startsWith('/mna/admin/intrekken/') && request.method === 'POST') {
      const code = path.replace('/mna/admin/intrekken/', '').toUpperCase();
      const auth = await begeleiderAuth(request, code);
      if (!auth.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('UPDATE mna_trajecten SET koper_vrijgegeven=0, updated_at=? WHERE id=?').bind(Date.now(), code).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
        /* == AVG: INZAGE VERZOEK == */
    if (path === '/avg/inzage' && request.method === 'GET') {
      const url = new URL(request.url);
      const email = (url.searchParams.get('email') || '').toLowerCase().trim();
      if (!email || !env.DB) return new Response(JSON.stringify({ error: 'Email verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const scans = await env.DB.prepare('SELECT id, office_name, region, fte, revenue, overall, created_at FROM scans WHERE office_email=?').bind(email).all().catch(() => ({ results: [] }));
      const callbacks = await env.DB.prepare('SELECT naam, tel, email, created_at FROM callbacks WHERE email=?').bind(email).all().catch(() => ({ results: [] }));
      const rapportUsage = await env.DB.prepare('SELECT email, created_at FROM rapport_usage WHERE email=?').bind(email).all().catch(() => ({ results: [] }));
      const mnaData = await env.DB.prepare('SELECT id, kantoor_naam, contact_naam, traject_type, created_at FROM mna_trajecten WHERE contact_email=?').bind(email).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ email, scans: scans.results, callbacks: callbacks.results, rapport_gebruik: rapportUsage.results, mna_trajecten: mnaData.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == AVG: VERWIJDERING VERZOEK == */
    if (path === '/avg/verwijder' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const email = (body.email || '').toLowerCase().trim();
      const token = body.token || '';
      const validToken = env.ADMIN_KEY || '';
      if (!email || !env.DB) return new Response(JSON.stringify({ error: 'Email verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (token !== validToken) return new Response(JSON.stringify({ error: 'Niet geautoriseerd - neem contact op met marcel@bisschopsfinancing.nl' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('DELETE FROM scans WHERE office_email=?').bind(email).run().catch(() => {});
      await env.DB.prepare('DELETE FROM callbacks WHERE email=?').bind(email).run().catch(() => {});
      await env.DB.prepare('DELETE FROM rapport_usage WHERE email=?').bind(email).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true, message: 'Gegevens verwijderd voor ' + email }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == AVG: AUTOMATISCH OPRUIMEN (bewaartermijn) == */
    if (path === '/avg/cleanup' && request.method === 'POST') {
      const url = new URL(request.url);
      const key = request.headers.get('x-admin-key') || url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const ms12 = 12 * 30 * 24 * 60 * 60 * 1000;
      const ms6 = 6 * 30 * 24 * 60 * 60 * 1000;
      const cutoff12 = Date.now() - ms12;
      const cutoff6 = Date.now() - ms6;
      const r1 = await env.DB.prepare('DELETE FROM scans WHERE created_at < ?').bind(cutoff12).run().catch(() => ({ changes: 0 }));
      const r2 = await env.DB.prepare('DELETE FROM rapport_usage WHERE created_at < ?').bind(cutoff12).run().catch(() => ({ changes: 0 }));
      const r3 = await env.DB.prepare('DELETE FROM callbacks WHERE created_at < ?').bind(cutoff6).run().catch(() => ({ changes: 0 }));
      return new Response(JSON.stringify({ ok: true, verwijderd: { scans: r1.changes||0, rapport_usage: r2.changes||0, callbacks: r3.changes||0 } }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        /* == DOCUMENT: UPLOAD EN ANALYSEER == */
    /* UPLOAD VIA BASE64 — geen multipart, werkt door Bot Fight Mode */
    if (path === '/mna/document/upload-base64' && request.method === 'POST') {
      const b64Params = await request.text().catch(()=>'');
      let b64Body = {};
      try { b64Body = JSON.parse(new URLSearchParams(b64Params).get('data') || '{}'); } catch(e) {}
      const { code, fase_id, bewaar, bestand_naam, bestand_type, base64 } = b64Body;
      if (!code || !fase_id || !base64) return new Response(JSON.stringify({error:'code, fase_id en base64 verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Zoek traject op id, koper_code of tussen_code
      const tB64 = await env.DB.prepare('SELECT id, status FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code.toUpperCase(), code.toUpperCase(), code.toUpperCase()).first().catch(()=>null);
      if (!tB64) return new Response(JSON.stringify({error:'Traject niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      if (tB64.status === 'vergrendeld') return new Response(JSON.stringify({error:'Traject vergrendeld'}),{status:403,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Decodeer base64
      const binStr = atob(base64);
      const fileBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) fileBytes[i] = binStr.charCodeAt(i);
      const fileSize = fileBytes.length;
      if (fileSize > 20 * 1024 * 1024) return new Response(JSON.stringify({error:'Bestand te groot (max 20MB)'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const fileName = bestand_naam || 'document';
      const fileType = bestand_type || 'application/octet-stream';
      // Whitelist veilige bestandstypen
      const ALLOWED_EXTENSIONS = ['pdf','doc','docx','txt','jpg','jpeg','png','xlsx','xls','csv','eml','msg','html','zip'];
      const fileExt = (fileName.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        return new Response(JSON.stringify({error:'Bestandstype niet toegestaan. Toegestaan: PDF, Word, Excel, afbeeldingen, tekst.'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      }
      const trajectId = tB64.id;
      const docId = 'D' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
      const r2Key = trajectId + '/' + docId + '/' + fileName;
      let bewaard = (bewaar !== false && bewaar !== 'false');
      if (bewaard && env.DOCS_BUCKET) {
        try { await env.DOCS_BUCKET.put(r2Key, fileBytes, {httpMetadata:{contentType:fileType}}); } catch(e) { bewaard = false; }
      }
      const ext = fileName.split('.').pop().toLowerCase();
      const isPdf = ext === 'pdf' || fileType.includes('pdf');
      let extractedText = '';
      if (isPdf && fileBytes.length < 5*1024*1024) {
        try {
          const pdfResp = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST', headers:{'Content-Type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','anthropic-beta':'pdfs-2024-09-25'},
            body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},{type:'text',text:'Extraheer alle tekst en financiële gegevens uit dit document. Geef een JSON object met alle gevonden waarden.'}]}]})
          });
          const pdfData = await pdfResp.json().catch(()=>({}));
          extractedText = pdfData.content?.[0]?.text || '';
        } catch(e) {}
      }
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_documenten (id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, bestand_naam TEXT, bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, bewaard INTEGER, vergrendeld INTEGER DEFAULT 0, analyse TEXT, veld_extractie TEXT, methode TEXT, uploaded_at INTEGER)').run().catch(()=>{});
      await env.DB.prepare('INSERT INTO mna_documenten (id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,r2_key,bewaard,vergrendeld,analyse,uploaded_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)').bind(docId,trajectId,fase_id,fileName,fileType,fileSize,bewaard?r2Key:'',bewaard?1:0,extractedText,Date.now()).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true,id:docId,naam:fileName,bewaard}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path === '/mna/document/upload' && request.method === 'POST') {
      const url = new URL(request.url);
      const code = (url.searchParams.get('code') || '').toUpperCase();
      const fase_id = url.searchParams.get('fase_id') || '';
      const bewaar = url.searchParams.get('bewaar') !== 'false';
      if (!code || !fase_id) return new Response(JSON.stringify({ error: 'code en fase_id verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Verificeer dat traject bestaat en code geldig is (voorkomt misbruik AI-kosten)
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });

      // Check traject exists — zoek op id, koper_code of tussen_code
      const traject = await env.DB.prepare('SELECT id, status FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code, code, code).first().catch(() => null);
      if (!traject) return new Response(JSON.stringify({ error: 'Traject niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (traject.status === 'vergrendeld') return new Response(JSON.stringify({ error: 'Traject vergrendeld' }), { status: 403, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const trajectId = traject.id; // gebruik altijd de echte traject id

      // Read file from form data
      let fileBytes, fileName, fileType, fileSize;
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return new Response(JSON.stringify({ error: 'Geen bestand ontvangen' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
        fileName = file.name || 'document';
        fileType = file.type || 'application/octet-stream';
        const buffer = await file.arrayBuffer();
        fileBytes = new Uint8Array(buffer);
        fileSize = fileBytes.length;
      } catch(e) {
        return new Response(JSON.stringify({ error: 'Fout bij lezen bestand: ' + e.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }

      // Size limit: 20MB
      if (fileSize > 20 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Bestand te groot (max 20MB)' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });

      // Whitelist veilige bestandstypen
      const ALLOWED_EXT = ['pdf','doc','docx','txt','jpg','jpeg','png','xlsx','xls','csv','eml','msg','html','zip'];
      const ext = fileName.split('.').pop().toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return new Response(JSON.stringify({ error: 'Bestandstype niet toegestaan.' }), { status: 400, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
      const isPdf = ext === 'pdf' || fileType.includes('pdf');
      const isExcel = ['xlsx','xls','csv'].includes(ext) || fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv');
      const isWord = ['docx','doc'].includes(ext) || fileType.includes('word');
      const isText = ['txt','eml','md','html','htm'].includes(ext) || (fileType.startsWith('text/') && !isExcel);
      const isSmall = fileSize < 5 * 1024 * 1024;

      // Store in R2 always (bewaar flag bepaalt wel of het als dataroom document telt)
      const docId = code + '_' + fase_id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      let r2Key = null;
      if (env.DOCS_BUCKET) {
        r2Key = 'mna/' + code + '/' + fase_id + '/' + docId + '.' + ext;
        await env.DOCS_BUCKET.put(r2Key, fileBytes, {
          httpMetadata: { contentType: fileType },
          customMetadata: { traject_id: code, fase_id, original_name: fileName, uploaded_at: Date.now().toString() }
        });
      }

      // Haal trajectcontext op voor crosschecks
      let trajectContext = '';
      if (env.DB) {
        try {
          const traj = await env.DB.prepare('SELECT kantoor_naam, contact_naam, sector FROM mna_trajecten WHERE id=?').bind(code).first().catch(() => null);
          if (traj) {
            trajectContext = 'Kantoornaam in traject: ' + (traj.kantoor_naam || 'onbekend') + '\n';
            trajectContext += 'Contactpersoon: ' + (traj.contact_naam || 'onbekend') + '\n';
            // SECTORGEBONDEN BENCHMARKS — bronnen vermeld per sector
            const sectorLabelsDoc = {
              accountancy: `accountants- of administratiekantoor.
BENCHMARKS (Dealsuite Overname Barometer H1-2025; Accountancy Vanmorgen/FD mei 2025; CBS/ING Research; Novak-benchmarkdata indien beschikbaar in systeem — gebruik Novak altijd als primaire bron voor accountancy):
- EBITDA-multiple zakelijke dienstverlening: gemiddeld 4,9x MKB (Dealsuite H1-2025, n=289 advieskantoren)
- Grote accountantskantoren bij PE-overname: 10–11x EBITDA (FD/Accountancy Vanmorgen, Baker Tilly/Grant Thornton deals mei 2025)
- Omzet/FTE norm: €80k–€140k (hogere ratio = efficiënter)
- EBITDA-marge gezond: 15–25%; kwetsbaar: <10%; sterk: >25%
- Personeelstekort: 4 op 10 kantoren (CBS/ING Research)
- BELANGRIJK: Gebruik Novak-benchmarkdata uit het systeem als die beschikbaar is — die heeft prioriteit boven bovenstaande cijfers`,

              mkb: `MKB bedrijf (retail, horeca, handel of productie).
BENCHMARKS (Dealsuite Overname Barometer H1-2025 en H2-2024, CBS):
- EBITDA-multiple gemiddeld MKB Nederland: 4,9x (Dealsuite H1-2025, n=289 advieskantoren)
- Detailhandel: 2,4x EBITDA (Dealsuite H2-2024)
- Horeca/food: 2,5–3,5x EBITDA
- Handel/groothandel: 3,5–5,0x EBITDA
- EBITDA-marge retail: 3–8%; horeca 5–12%; handel 5–10%
- Brutomarge retail: 30–50%; horeca 60–70% (food cost 28–35%)`,

              zorg: `zorgpraktijk (huisarts, tandarts of fysiotherapeut).
BENCHMARKS per deelsector:

HUISARTS (NZa tariefbeschikking 2026 TB/REG-26611-01; LHV tariefoverzicht 2026):
- Inschrijftarief 2026: €21,59 per kwartaal per patiënt (<65 jaar)
- Regulier consulttarief 2026: €13,18
- Goodwill: LHV is tégen; toch gebruikelijk; commerciële ketens tot €500k (Volkskrant 2022)
- NZa tarieven 2026 onder juridische procedure (definitief besluit verwacht 30 juni 2026)

TANDARTS (Aeternus M&A Advisors 2024; dentalinfo.nl 2025; ABN Amro marktanalyse 2025; KNMT):
- Klein (<€500k omzet): 1,5–4x EBITDA
- Middelgroot (€500k–€1M+): 5–7x EBITDA (Aeternus 2024)
- Keten: tot 10x EBITDA (ABN Amro 2025); eerder tot 16x
- Gemiddelde omzet per tandarts: €350k–€500k (Aeternus 2024)
- Omzet per patiënt NL 2024: €220–€250 (dentalinfo.nl)
- Aantal praktijken NL 2025: ca. 4.400; 13% in keten (KNMT/ABN Amro)

FYSIOTHERAPIE (Fact4Fysio benchmark 2024; MedischOndernemen/Open Future-congres jan 2024; NZa marktonderzoek 2024):
- Haalbare EBITDA-marge bij kostenbeheersing: ~15% (MedischOndernemen 2024)
- Personeelskosten norm: 55% van omzet; risico bij >70%
- Huisvestingskosten norm: ~10% van omzet (Fact4Fysio 2024)
- Overige kosten norm: ~15% van omzet`,

              itsoftware: `IT- of softwarebedrijf (SaaS, maatwerk of managed services).
BENCHMARKS (Dealsuite Overname Barometer H1-2025):
- Software/SaaS EBITDA-multiple: 7,3x (hoogste sector NL, Dealsuite H1-2025)
- SaaS ARR-multiple: 3–8x ARR afhankelijk van groei en churn
- Churn norm: <5% jaarlijks gezond; >10% risico
- Maatwerk IT EBITDA-marge: 12–20%
- MRR-groei gezond: >15% YoY`
            };
            trajectContext += 'Sector: ' + (sectorLabelsDoc[traj.sector||'accountancy'] || 'accountancy') + '\n';
          }
          // Eerder ingevulde financiële cijfers ophalen
          const bestaand = await env.DB.prepare('SELECT data_json FROM mna_data WHERE traject_id=? AND fase_id=?').bind(code, 'financieel').first().catch(() => null);
          if (bestaand && bestaand.data_json) {
            const bestaandData = typeof bestaand.data_json === 'string' ? JSON.parse(bestaand.data_json) : bestaand.data_json;
            const relevante = ['omzet1','omzet2','omzet3','ebitda','wip','debiteuren'];
            const ingevuld = relevante.filter(k => bestaandData[k] && bestaandData[k].value).map(k => bestaandData[k].label + ': ' + bestaandData[k].value);
            if (ingevuld.length) trajectContext += 'Eerder ingevulde cijfers: ' + ingevuld.join(', ') + '\n';
          }
        } catch(e) { /* geen context beschikbaar */ }
      }

      // ENTITEITSCHECK: alleen voor tekst/CSV bestanden (PDF is binair, niet leesbaar als tekst)
      const kantoorNaamCheck = trajectContext ? (trajectContext.match(/Kantoornaam(?:\s+in\s+traject)?:\s*(.+)/i) || [])[1]?.trim() : '';

      if (kantoorNaamCheck && (isText || isExcel) && !isPdf) {
        try {
          const previewText = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes.slice(0, 2000)).toLowerCase();
          const woorden = kantoorNaamCheck.toLowerCase().split(/\s+/).filter(w => w.replace(/[^a-z0-9]/g,'').length > 3);

          // Als GEEN enkel woord van de kantoornaam voorkomt → direct verwerpen
          const enkeleMatch = woorden.some(w => previewText.includes(w.replace(/[^a-z0-9]/g,'')));

          if (!enkeleMatch && woorden.length > 0) {
            // Geen enkel woord gevonden — verwerp direct, geen Haiku call nodig
            const reden = `Document bevat geen verwijzing naar "${kantoorNaamCheck}" — verworpen zonder verdere analyse.`;
            await env.DB.prepare('INSERT INTO mna_documenten (id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,r2_key,bewaard,analyse,veld_extractie,methode,uploaded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
              .bind(docId, trajectId||code, fase_id, fileName, fileType, fileSize, '', 0, reden, '{}', 'verworpen', Date.now()).run().catch(()=>{});
            return new Response(JSON.stringify({
              ok: true, doc_id: docId, analyse: reden,
              veld_extractie: {}, r2_opgeslagen: false,
              verworpen: true, verworpen_reden: reden,
              crosschecks: [], entiteit_naam: null
            }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
          }

          // Stap 2 uitgeschakeld — string-match is voldoende
        } catch(e) { /* entiteitscheck fout — gewoon doorgaan */ }
      }

      // Extract text for analysis
      let extractedText = '';
      let analysisMethod = 'direct';
      let veldExtractie = {}; // Vroeg declareren zodat CSV-parse hem kan vullen

      if (isPdf && isSmall) {
        // Small PDF: send directly to Claude as base64 document
        analysisMethod = 'pdf_direct';
        let base64 = '';
        const chunkSize = 8192;
        for (let i = 0; i < fileBytes.length; i += chunkSize) {
          base64 += String.fromCharCode(...fileBytes.subarray(i, i + chunkSize));
        }
        base64 = btoa(base64);
        const prompt = buildDocumentPrompt(fileName, fase_id, null, 'pdf', trajectContext);
        try {
          const resp = await callClaude([{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: prompt }
            ]
          }], env);
          extractedText = resp;
        } catch(e) {
          extractedText = 'Fout bij PDF-analyse: ' + e.message;
        }
      } else if (isExcel || ext === 'csv') {
        analysisMethod = 'text_extract';
        try {
          const rawText = await extractExcelText(fileBytes, ext);
          // Check of dit een gestructureerde testdata CSV is (fase_id,veld_id,label,waarde)
          const firstLine = rawText.split('\n')[0].toLowerCase().trim();
          const headers = firstLine.split(',').map(h => h.trim());

          if (headers.includes('fase_id') && headers.includes('veld_id') && headers.includes('waarde')) {
            // Formaat: fase_id,veld_id,label,waarde — direct parsen
            const lines = rawText.split('\n').slice(1);
            const directVelden = {};
            lines.forEach(line => {
              const cols = line.split(',');
              if (cols.length >= 4) {
                const fId = cols[0].trim();
                const vId = cols[1].trim();
                const waarde = cols.slice(3).join(',').trim().replace(/^"|"$/g,'');
                if (fId && vId && waarde) directVelden[fId + '_' + vId] = waarde;
              }
            });
            veldExtractie = directVelden;
            extractedText = 'Direct ingelezen uit gestructureerde CSV (fase_id/veld_id): ' + Object.keys(directVelden).length + ' velden.';

          } else if (headers[0] === 'veld' && (headers[1] === 'waarde' || headers[1] === 'value')) {
            // Formaat: veld,waarde[,toelichting] — key/value CSV, direct parsen
            const veldIdx = 0;
            const waardeIdx = 1;
            const lines = rawText.split('\n').slice(1);
            const directVelden = {};
            lines.forEach(line => {
              if (!line.trim()) return;
              // Splits op komma maar respecteer quotes
              const cols = [];
              let cur = '', inQ = false;
              for (const ch of line) {
                if (ch === '"') { inQ = !inQ; }
                else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
                else cur += ch;
              }
              cols.push(cur.trim());
              const veld = (cols[veldIdx] || '').trim().replace(/^"|"$/g, '');
              const waarde = (cols[waardeIdx] || '').trim().replace(/^"|"$/g, '');
              if (veld && waarde) directVelden[veld] = normaliseGetal(waarde) || waarde;
            });
            veldExtractie = directVelden;
            extractedText = 'Direct ingelezen uit veld/waarde CSV: ' + Object.keys(directVelden).length + ' velden.';

          } else {
            const prompt = buildDocumentPrompt(fileName, fase_id, rawText.substring(0, 8000), ext);
            extractedText = await callClaudeLight([{ role: 'user', content: prompt }], env);
          }
        } catch(e) {
          extractedText = 'Fout bij Excel-analyse: ' + e.message;
        }
      } else if (isPdf && !isSmall) {
        // Large PDF: extract text first
        analysisMethod = 'pdf_large';
        try {
          const text = await extractPdfText(fileBytes);
          const prompt = buildDocumentPrompt(fileName, fase_id, text.substring(0, 50000), 'pdf', trajectContext);
          extractedText = await callClaude([{ role: 'user', content: prompt }], env);
        } catch(e) {
          extractedText = 'Fout bij grote PDF-analyse: ' + e.message;
        }
      } else if (isWord) {
        analysisMethod = 'word';
        extractedText = 'Word-bestanden worden als tekst verwerkt. Upload bij voorkeur als PDF voor betere analyse.';
        const prompt = buildDocumentPrompt(fileName, fase_id, 'Word-document: ' + fileName, 'docx', trajectContext);
        try {
          extractedText = await callClaude([{ role: 'user', content: prompt }], env);
        } catch(e) { /* use fallback */ }
      } else if (isText) {
        analysisMethod = 'text';
        try {
          const rawText = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes).substring(0, 12000);

          // Pre-processor: probeer sleutel: waarde regels direct te parsen
          // Ondersteunt: "sleutel: waarde", "sleutel = waarde", "sleutel,waarde"
          const directVelden = {};
          const keyValuePattern = /^([a-z][a-z0-9_]{2,50})\s*[:\s=,]\s*(.+)$/i;
          rawText.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('=') || line.startsWith('-')) return;
            const m = line.match(keyValuePattern);
            if (m) {
              const key = m[1].trim().toLowerCase();
              const val = m[2].trim().replace(/^["']|["']$/g, '');
              if (val && val.length < 500) directVelden[key] = normaliseGetal(val);
            }
          });
          // Alleen direct gebruiken als er genoeg velden gevonden zijn (>= 5)
          if (Object.keys(directVelden).length >= 5) {
            veldExtractie = directVelden;
            analysisMethod = 'text_direct';
            // Stuur tekst ook naar AI voor de narratieve analyse, maar gebruik directVelden voor veld_extractie
            const prompt = buildDocumentPrompt(fileName, fase_id, rawText.substring(0, 8000), 'txt', trajectContext);
            extractedText = await callClaude([{ role: 'user', content: prompt }], env).catch(() => 'Analyse niet beschikbaar.');
          } else {
            const prompt = buildDocumentPrompt(fileName, fase_id, rawText, 'txt', trajectContext);
            extractedText = await callClaude([{ role: 'user', content: prompt }], env);
          }
        } catch(e) {
          extractedText = 'Fout bij tekstanalyse: ' + e.message;
        }
      } else {
        extractedText = 'Bestandstype niet ondersteund voor automatische analyse. Document opgeslagen als referentie.';
        veldExtractie._verworpen = true;
        veldExtractie._verworpen_reden = 'Bestandstype .' + ext + ' wordt niet herkend. Ondersteund: PDF, Word, Excel, CSV, TXT.';
      }

      // Parse structured fields from analysis
      // Let op: veldExtractie kan al gevuld zijn door directe CSV-parse — niet overschrijven!
      if (Object.keys(veldExtractie).length === 0) {
        try {
          // Zoek JSON codeblock - greedy zodat heel JSON object gepakt wordt
          const cbMatch = extractedText.match(/```(?:json)?\s*([\s\S]+?)```/s);
          if (cbMatch) {
            veldExtractie = normaliseObject(JSON.parse(cbMatch[1].trim()));
          } else {
            // Fallback: zoek eerste { tot bijpassende }
            const first = extractedText.indexOf('{');
            if (first >= 0) {
              let depth = 0, end = -1;
              for (let i = first; i < extractedText.length; i++) {
                if (extractedText[i] === '{') depth++;
                else if (extractedText[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
              }
              if (end > first) veldExtractie = normaliseObject(JSON.parse(extractedText.slice(first, end+1)));
            }
          }
        } catch(e) { /* no structured data */ }
      }

      // Store analysis in D1
      try {
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_documenten (
          id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, bestand_naam TEXT,
          bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, bewaard INTEGER,
          analyse TEXT, veld_extractie TEXT, methode TEXT, uploaded_at INTEGER
        )`).run().catch(() => {});
        await env.DB.prepare('INSERT INTO mna_documenten (id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,r2_key,bewaard,analyse,veld_extractie,methode,uploaded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(docId, code, fase_id, fileName, fileType, fileSize, r2Key||'', bewaar?1:0, extractedText, JSON.stringify(veldExtractie), analysisMethod, Date.now()).run()
      } catch(dbErr) {
        return new Response(JSON.stringify({ error: 'DB fout: ' + dbErr.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      };

      // Haal crosscheck waarschuwingen uit veldExtractie
      const crosschecks = veldExtractie.crosscheck_waarschuwingen || [];
      const entiteitNaam = veldExtractie.entiteit_naam || null;
      let verworpen = veldExtractie._verworpen || false;
      let verworpenReden = veldExtractie._verworpen_reden || null;
      delete veldExtractie.crosscheck_waarschuwingen;
      delete veldExtractie._verworpen;
      delete veldExtractie._verworpen_reden;

      // ENTITEITSCHECK: als de entiteit in het document niet overeenkomt met de kantoornaam,
      // markeer als verworpen en leeg de veld_extractie zodat er NIETS ingevuld wordt
      if (entiteitNaam && trajectContext) {
        const kantoorNaam = (trajectContext.match(/Kantoornaam(?:\s+in\s+traject)?:\s*(.+)/i) || [])[1]?.trim() || '';
        if (kantoorNaam) {
          const n1 = entiteitNaam.toLowerCase().replace(/[^a-z0-9]/g, '');
          const n2 = kantoorNaam.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Check of eerste woord van kantoornaam voorkomt in entiteitnaam of vice versa
          const w1 = kantoorNaam.toLowerCase().split(/\s+/)[0];
          const w2 = entiteitNaam.toLowerCase().split(/\s+/)[0];
          const match = n1.includes(n2.substring(0,6)) || n2.includes(n1.substring(0,6))
                     || n1.includes(w1.replace(/[^a-z0-9]/g,'')) || n2.includes(w2.replace(/[^a-z0-9]/g,''));
          if (!match) {
            verworpen = true;
            verworpenReden = 'Document hoort bij "' + entiteitNaam + '" maar traject is voor "' + kantoorNaam + '" — geen velden ingevuld.';
            // Leeg veldExtractie volledig zodat er niets foutief ingevuld wordt
            veldExtractie = {};
          }
        }
      }
      delete veldExtractie.entiteit_naam;

      // E-mail bij upload uitgeschakeld — notificatie gaat via fase-opslag
      return new Response(JSON.stringify({
        ok: true,
        doc_id: docId,
        analyse: extractedText,
        veld_extractie: veldExtractie,
        r2_opgeslagen: !!r2Key,
        verworpen: verworpen,
        verworpen_reden: verworpenReden,
        crosschecks: crosschecks,
        entiteit_naam: entiteitNaam
      }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == DOCUMENT: LIJST PER FASE == */
    if (path.startsWith('/mna/document/lijst/') && request.method === 'GET') {
      const parts = path.replace('/mna/document/lijst/', '').split('/');
      const code = (parts[0] || '').toUpperCase();
      const fase_id = parts[1] || '';
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const query = fase_id
        ? 'SELECT id,bestand_naam,bestand_type,bestand_grootte,bewaard,analyse,veld_extractie,methode,uploaded_at FROM mna_documenten WHERE traject_id=? AND fase_id=? ORDER BY uploaded_at DESC'
        : 'SELECT id,bestand_naam,bestand_type,bestand_grootte,bewaard,analyse,veld_extractie,methode,uploaded_at,fase_id FROM mna_documenten WHERE traject_id=? ORDER BY uploaded_at DESC';
      const docs = fase_id
        ? await env.DB.prepare(query).bind(code, fase_id).all().catch(() => ({ results: [] }))
        : await env.DB.prepare(query).bind(code).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(docs.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }



    /* == ADMIN: HERSTEL KANTOORNAMEN VANUIT MNA_DATA == */
    if (path === '/mna/admin/herstel-namen' && request.method === 'POST') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      try {
        // Haal alle trajecten op met onbekende naam
        const trajecten = await env.DB.prepare("SELECT id FROM mna_trajecten WHERE kantoor_naam='Onbekend' OR kantoor_naam=''").all().catch(() => ({ results: [] }));
        let updated = 0;
        for (const t of trajecten.results) {
          // Zoek kantoornaam in mna_data voor dit traject
          const data = await env.DB.prepare("SELECT data_json FROM mna_data WHERE traject_id=? LIMIT 10").bind(t.id).all().catch(() => ({ results: [] }));
          let naam = null;
          for (const row of data.results) {
            try {
              const dj = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
              // Zoek velden met kantoornaam
              for (const [k, v] of Object.entries(dj || {})) {
                if (v && v.value && (k.includes('naam') || k.includes('kantoor') || k.includes('bedrijf'))) {
                  naam = v.value;
                  break;
                }
              }
            } catch(e) {}
            if (naam) break;
          }
          if (naam) {
            await env.DB.prepare("UPDATE mna_trajecten SET kantoor_naam=? WHERE id=?").bind(naam, t.id).run();
            updated++;
          }
        }
        return new Response(JSON.stringify({ ok: true, updated, total: trajecten.results.length }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }



    /* == ADMIN: HERSTEL D1 VANUIT R2 (eenmalig) == */
    if (path === '/mna/admin/herstel-documenten' && request.method === 'POST') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DOCS_BUCKET) return new Response(JSON.stringify({ error: 'R2 bucket niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      try {
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_documenten (id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, bestand_naam TEXT, bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, bewaard INTEGER, vergrendeld INTEGER DEFAULT 0, analyse TEXT, veld_extractie TEXT, methode TEXT, uploaded_at INTEGER)').run();
        let inserted = 0, skipped = 0, cursor = undefined;
        do {
          const opts = { prefix: 'mna/', limit: 100 };
          if (cursor) opts.cursor = cursor;
          const list = await env.DOCS_BUCKET.list(opts);
          for (const obj of list.objects) {
            const parts = obj.key.split('/');
            if (parts.length < 4) { skipped++; continue; }
            const traject_id = parts[1];
            const fase_id = parts[2];
            const bestand_naam = parts.slice(3).join('/');
            const nm = bestand_naam.replace(/\.[^.]+$/, '').split('_');
            const doc_id = nm.length >= 4 ? nm[nm.length - 1] : ('doc' + inserted);
            const ts = nm.length >= 3 ? (parseInt(nm[nm.length - 2]) || Date.now()) : Date.now();
            const btype = bestand_naam.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
            await env.DB.prepare('INSERT OR IGNORE INTO mna_documenten (id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,r2_key,bewaard,analyse,veld_extractie,methode,uploaded_at) VALUES (?,?,?,?,?,?,?,1,"","[]","r2",?)').bind(doc_id, traject_id, fase_id, bestand_naam, btype, obj.size||0, obj.key, ts).run().catch(() => { skipped++; return; });
            inserted++;
          }
          cursor = list.truncated ? list.cursor : undefined;
        } while (cursor);
        return new Response(JSON.stringify({ ok: true, inserted, skipped }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      }
    }


    /* == ADMIN: VERGRENDEL DOCUMENT == */
    if (path.startsWith('/mna/admin/vergrendel-document/') && request.method === 'POST') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const docId = path.replace('/mna/admin/vergrendel-document/', '');
      const body = await request.json().catch(() => ({}));
      const vergrendeld = body.vergrendeld ?? 1;
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('ALTER TABLE mna_documenten ADD COLUMN vergrendeld INTEGER DEFAULT 0').run().catch(() => {});
      await env.DB.prepare('UPDATE mna_documenten SET vergrendeld=? WHERE id=?').bind(vergrendeld, docId).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == ADMIN: ALLE DOCUMENTEN == */
    if (path === '/mna/admin/documenten' && request.method === 'GET') {
      const url = new URL(request.url);
      const key = url.searchParams.get('key') || '';
      if (key !== env.ADMIN_KEY) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Zorg dat tabel bestaat ook als er nog nooit een document geupload is
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mna_documenten (
        id TEXT PRIMARY KEY, traject_id TEXT, fase_id TEXT, bestand_naam TEXT,
        bestand_type TEXT, bestand_grootte INTEGER, r2_key TEXT, bewaard INTEGER,
        analyse TEXT, veld_extractie TEXT, methode TEXT, uploaded_at INTEGER
      )`).run().catch(() => {});
      const docs = await env.DB.prepare(
        'SELECT id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,bewaard,COALESCE(vergrendeld,0) as vergrendeld,uploaded_at FROM mna_documenten ORDER BY uploaded_at DESC LIMIT 500'
      ).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(docs.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == DOCUMENT: VERWIJDEREN == */
    if (path.startsWith('/mna/document/delete/') && request.method === 'POST') {
      const delDocParams = await request.text().catch(()=>'');
      const parsedDelParams = new URLSearchParams(delDocParams);
      const key = parsedDelParams.get('key') || new URL(request.url).searchParams.get('key') || request.headers.get('x-admin-key') || '';
      const tussenCodeDel = parsedDelParams.get('code') || '';
      const docId = path.replace('/mna/document/delete/', '');
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Verifieer: admin-key OF tussenpersoonscode die bij dit document hoort
      const isAdminDel = key && key === (env.ADMIN_KEY||'');
      if (!isAdminDel && tussenCodeDel) {
        const docCheck = await env.DB.prepare('SELECT d.id FROM mna_documenten d JOIN mna_trajecten t ON d.traject_id=t.id WHERE d.id=? AND t.tussen_code=?').bind(docId, tussenCodeDel.toUpperCase()).first().catch(()=>null);
        if (!docCheck) return new Response(JSON.stringify({error:'Niet bevoegd'}),{status:403,headers:{...getCORS(request),'Content-Type':'application/json'}});
      } else if (!isAdminDel) {
        return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      }
      const doc = await env.DB.prepare('SELECT r2_key FROM mna_documenten WHERE id=?').bind(docId).first().catch(() => null);
      if (doc && doc.r2_key && env.DOCS_BUCKET) {
        await env.DOCS_BUCKET.delete(doc.r2_key).catch(() => {});
      }
      await env.DB.prepare('DELETE FROM mna_documenten WHERE id=?').bind(docId).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* VERSIE: VERWIJDEREN */
    if (path.startsWith('/mna/versie/delete/') && request.method === 'POST') {
      const vDelParams = await request.text().catch(()=>'');
      const vDelKey = new URLSearchParams(vDelParams).get('key') || new URL(request.url).searchParams.get('key') || '';
      if (!vDelKey || vDelKey !== (env.ADMIN_KEY||'')) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const vId = path.replace('/mna/versie/delete/','');
      await env.DB.prepare('DELETE FROM mna_document_versies WHERE id=?').bind(vId).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* == DOCUMENT: DOWNLOAD URL == */
    if (path.startsWith('/mna/document/download/') && request.method === 'GET') {
      const docId = path.replace('/mna/document/download/', '').split('?')[0];
      if (!env.DB || !env.DOCS_BUCKET) return new Response(JSON.stringify({ error: 'Niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Rol-check via code parameter
      const dlCode = url.searchParams.get('code') || '';
      const dlKey  = url.searchParams.get('key')  || '';
      let dlRol = null;
      if (dlKey && env.ADMIN_KEY && dlKey === env.ADMIN_KEY) {
        dlRol = 'admin';
      } else if (dlCode) {
        const dlT = await env.DB.prepare('SELECT id, koper_vrijgegeven, koper_code, tussen_code FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(dlCode.toUpperCase(), dlCode.toUpperCase(), dlCode.toUpperCase()).first().catch(() => null);
        if (dlT) {
          if (dlCode.toUpperCase() === dlT.id) dlRol = 'verkoper';
          else if (dlCode.toUpperCase() === dlT.koper_code) dlRol = dlT.koper_vrijgegeven ? 'koper' : null;
          else if (dlCode.toUpperCase() === dlT.tussen_code) dlRol = 'tussenpersoon';
        }
      }
      if (!dlRol) return new Response('Toegang geweigerd', { status: 403, headers: getCORS(request) });
      // Haal document op
      let doc = await env.DB.prepare('SELECT r2_key, bestand_naam, bestand_type, traject_id FROM mna_documenten WHERE id=?').bind(docId).first().catch(() => null);
      if (!doc || !doc.r2_key) return new Response(JSON.stringify({ error: 'Document niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const obj = await env.DOCS_BUCKET.get(doc.r2_key);
      if (!obj) return new Response(JSON.stringify({ error: 'Bestand niet beschikbaar' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const data = await obj.arrayBuffer();
      const safeNaam = (doc.bestand_naam || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');
      const isPdf = (doc.bestand_type || '').includes('pdf') || safeNaam.toLowerCase().endsWith('.pdf');
      // Audit log: document bekeken
      await env.DB.prepare('INSERT INTO mna_audit (code, rol, actie, ip, ts, extra) VALUES (?,?,?,?,?,?)').bind(dlCode.toUpperCase() || 'admin', dlRol, 'document_bekeken', request.headers.get('CF-Connecting-IP') || 'unknown', Date.now(), JSON.stringify({ doc_id: docId, doc_naam: doc.bestand_naam })).run().catch(() => {});
      // Koper: view-only voor PDF (inline, geen download), watermark via header
      if (dlRol === 'koper' && isPdf) {
        // Stuur PDF als inline (view-only in browser), geen attachment
        return new Response(data, { headers: {
          ...getCORS(request),
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="' + safeNaam + '"',
          'X-Watermark': 'VERTROUWELIJK — ' + dlCode.toUpperCase() + ' — ' + new Date().toLocaleDateString('nl-NL'),
          'Cache-Control': 'no-store, no-cache',
          'X-Frame-Options': 'SAMEORIGIN'
        }});
      }
      // Admin/verkoper/tussenpersoon: normale download
      return new Response(data, { headers: { ...getCORS(request), 'Content-Type': doc.bestand_type || 'application/octet-stream', 'Content-Disposition': 'attachment; filename="' + safeNaam + '"; filename*=UTF-8\'\'  ' + encodeURIComponent(doc.bestand_naam || 'download'), 'Cache-Control': 'no-store' } });
    }



    /* == Q&A: VRAAG STELLEN (koper) == */
    if (path.startsWith('/mna/qa/') && request.method === 'POST') {
      const code = path.replace('/mna/qa/', '').split('?')[0].toUpperCase();
      if (!code || !env.DB) return new Response(JSON.stringify({ error: 'Niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const qaBody = await request.json().catch(() => ({}));
      const { vraag, fase_id, gesteld_door } = qaBody;
      if (!vraag || !vraag.trim()) return new Response(JSON.stringify({ error: 'Vraag is verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Verificeer code
      const qaT = await env.DB.prepare('SELECT id, kantoor_naam, begeleider_email, tussen_code, koper_code, contact_email FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code, code, code).first().catch(() => null);
      if (!qaT) return new Response(JSON.stringify({ error: 'Traject niet gevonden' }), { status: 404, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const trajectId = qaT.id;
      // Volgnummer bepalen
      const nRow = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_qa WHERE traject_id=?').bind(trajectId).first().catch(() => ({n:0}));
      const vraagNr = (nRow?.n || 0) + 1;
      const qaId = 'QA' + Date.now() + Math.random().toString(36).slice(2,5).toUpperCase();
      await env.DB.prepare('INSERT INTO mna_qa (id,traject_id,vraag_nr,fase_id,vraag,status,gesteld_door,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(qaId, trajectId, vraagNr, fase_id || null, vraag.trim(), 'open', gesteld_door || 'Koper', Date.now()).run();
      // E-mail naar begeleider
      if (env.RESEND_API_KEY) {
        const toList = ['marcel@bisschopsfinancing.nl'];
        if (qaT.begeleider_email && qaT.begeleider_email !== 'marcel@bisschopsfinancing.nl') toList.push(qaT.begeleider_email);
        await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY }, body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: toList, subject: 'Nieuwe Q&A vraag #' + vraagNr + ' — ' + (qaT.kantoor_naam || trajectId), html: '<p><strong>Vraag #' + vraagNr + '</strong> van koper:</p><blockquote style="border-left:3px solid #c9a84c;padding:8px 12px;color:#5a5854">' + vraag.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</blockquote><p><a href="https://koersvoormorgen.nl/marilyn.html">Beantwoord in Marilyn</a></p>' }) }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true, vraag_nr: vraagNr, id: qaId }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == Q&A: LIJST OPHALEN == */
    if (path.startsWith('/mna/qa/') && request.method === 'GET') {
      const code = path.replace('/mna/qa/', '').split('?')[0].toUpperCase();
      if (!code || !env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const qaT2 = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code, code, code).first().catch(() => null);
      if (!qaT2) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const qas = await env.DB.prepare('SELECT * FROM mna_qa WHERE traject_id=? ORDER BY vraag_nr ASC').bind(qaT2.id).all().catch(() => ({results:[]}));
      return new Response(JSON.stringify(qas.results || []), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == Q&A: ANTWOORD GEVEN (begeleider/admin) == */
    if (path.startsWith('/mna/admin/qa/antwoord/') && request.method === 'POST') {
      const qaId = path.replace('/mna/admin/qa/antwoord/', '').split('?')[0];
      const auth = await begeleiderAuth(request, '');
      if (!auth.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const antBody = await request.json().catch(() => ({}));
      const { antwoord, beantwoord_door } = antBody;
      if (!antwoord || !antwoord.trim()) return new Response(JSON.stringify({ error: 'Antwoord is verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      // Haal vraag op voor e-mail
      const qaRow = await env.DB.prepare('SELECT q.*, t.contact_email, t.kantoor_naam FROM mna_qa q LEFT JOIN mna_trajecten t ON t.id=q.traject_id WHERE q.id=?').bind(qaId).first().catch(() => null);
      await env.DB.prepare('UPDATE mna_qa SET antwoord=?, status=?, beantwoord_door=?, updated_at=? WHERE id=?').bind(antwoord.trim(), 'beantwoord', beantwoord_door || 'Adviseur', Date.now(), qaId).run();
      // E-mail naar koper
      if (env.RESEND_API_KEY && qaRow?.contact_email) {
        await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY }, body: JSON.stringify({ from: 'KantoorInzicht M&A <noreply@koersvoormorgen.nl>', to: [qaRow.contact_email], subject: 'Antwoord op uw vraag #' + qaRow.vraag_nr + ' — ' + (qaRow.kantoor_naam || ''), html: '<p>Uw vraag is beantwoord:</p><p><em>' + (qaRow.vraag||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</em></p><p><strong>Antwoord:</strong></p><blockquote style="border-left:3px solid #1a7a5e;padding:8px 12px;color:#5a5854">' + antwoord.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</blockquote><p><a href="https://koersvoormorgen.nl/mna.html">Bekijk in KantoorInzicht</a></p>' }) }).catch(() => {});
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == EXPORT DOSSIER (admin) == */
    if (path.startsWith('/mna/admin/export/') && request.method === 'GET') {
      const code = path.replace('/mna/admin/export/', '').split('?')[0].toUpperCase();
      const key = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Unauthorized', { status: 401, headers: getCORS(request) });
      if (!env.DB) return new Response('DB niet beschikbaar', { status: 500, headers: getCORS(request) });
      // Haal alles op
      const [traject, data, docs, audit, gesprekken, qa] = await Promise.all([
        env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=?').bind(code).first().catch(() => null),
        env.DB.prepare('SELECT * FROM mna_data WHERE traject_id=? ORDER BY fase_id').bind(code).all().catch(() => ({results:[]})),
        env.DB.prepare('SELECT id, fase_id, bestand_naam, bestand_type, bewaard, uploaded_at FROM mna_documenten WHERE traject_id=? ORDER BY uploaded_at').bind(code).all().catch(() => ({results:[]})),
        env.DB.prepare('SELECT * FROM mna_audit WHERE code=? ORDER BY ts DESC LIMIT 500').bind(code).all().catch(() => ({results:[]})),
        env.DB.prepare('SELECT * FROM mna_gesprekken WHERE traject_id=? ORDER BY datum DESC').bind(code).all().catch(() => ({results:[]})),
        env.DB.prepare('SELECT * FROM mna_qa WHERE traject_id=? ORDER BY vraag_nr').bind(code).all().catch(() => ({results:[]}))
      ]);
      if (!traject) return new Response('Traject niet gevonden', { status: 404, headers: getCORS(request) });
      const faseLabels = {financieel:'I. Financieel',commercieel:'II. Klanten & commercieel',partner:'III. Partners & personeel',compliance:'IV. Compliance & kwaliteit',it:'V. IT & automatisering',juridisch:'VI. Juridisch & fiscaal',strategisch:'VII. Strategisch & markt'};
      let rapport = '='.repeat(60) + '\n';
      rapport += 'KANTOORINZICHT M&A — DOSSIER EXPORT\n';
      rapport += 'Traject: ' + (traject.kantoor_naam || code) + '\n';
      rapport += 'Trajectcode: ' + code + '\n';
      rapport += 'Type: ' + (traject.traject_type || '—') + '\n';
      rapport += 'Status: ' + (traject.status || '—') + '\n';
      rapport += 'Aangemaakt: ' + new Date(traject.created_at || 0).toLocaleDateString('nl-NL') + '\n';
      rapport += 'Export datum: ' + new Date().toLocaleDateString('nl-NL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) + '\n';
      rapport += '='.repeat(60) + '\n\n';
      // Partijgegevens
      rapport += 'PARTIJGEGEVENS\n' + '-'.repeat(40) + '\n';
      rapport += 'Verkoper: ' + (traject.kantoor_naam || '—') + '\n';
      rapport += 'Contactpersoon: ' + (traject.contact_naam || '—') + '\n';
      rapport += 'E-mail: ' + (traject.contact_email || '—') + '\n';
      rapport += 'Adres: ' + (traject.verkoper_adres || '—') + '\n';
      rapport += 'KvK: ' + (traject.verkoper_kvk || '—') + '\n';
      rapport += 'Koper: ' + (traject.koper_naam || '—') + '\n';
      rapport += 'Koper e-mail: ' + (traject.koper_email || '—') + '\n';
      rapport += 'Begeleider: ' + (traject.begeleider_naam || '—') + '\n\n';
      // DD data per fase
      rapport += 'DUE DILIGENCE DATA\n' + '='.repeat(60) + '\n';
      for (const row of (data.results || [])) {
        try {
          const dj = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
          const gevuld = Object.values(dj || {}).filter(v => v && v.value);
          rapport += '\n' + (faseLabels[row.fase_id] || row.fase_id) + '\n' + '-'.repeat(40) + '\n';
          gevuld.forEach(v => { rapport += (v.label || '?') + ': ' + v.value + '\n'; });
          if (row.notitie) rapport += '\nNotitie: ' + row.notitie + '\n';
        } catch(e) {}
      }
      // Q&A
      if ((qa.results || []).length) {
        rapport += '\n\nQ&A REGISTER\n' + '='.repeat(60) + '\n';
        (qa.results || []).forEach(q => {
          rapport += '\nVraag #' + q.vraag_nr + (q.fase_id ? ' [' + q.fase_id + ']' : '') + '\n';
          rapport += 'Gesteld door: ' + (q.gesteld_door || '—') + ' op ' + new Date(q.created_at).toLocaleDateString('nl-NL') + '\n';
          rapport += q.vraag + '\n';
          if (q.antwoord) rapport += 'Antwoord (' + (q.beantwoord_door || '—') + '): ' + q.antwoord + '\n';
          else rapport += 'Status: open\n';
        });
      }
      // Gesprekken
      if ((gesprekken.results || []).length) {
        rapport += '\n\nGESPREKSVERSLAGEN\n' + '='.repeat(60) + '\n';
        (gesprekken.results || []).forEach(g => {
          rapport += '\n' + (g.datum || '—') + ' — ' + (g.type || 'gesprek') + '\n';
          if (g.deelnemers) rapport += 'Deelnemers: ' + g.deelnemers + '\n';
          if (g.verslag) rapport += g.verslag + '\n';
        });
      }
      // Documenten
      rapport += '\n\nDOCUMENTENLIJST\n' + '='.repeat(60) + '\n';
      (docs.results || []).forEach(d => {
        rapport += (d.bewaard ? '[DATAROOM] ' : '[ANALYSE]  ') + (d.fase_id || '—') + ' | ' + (d.bestand_naam || '—') + ' | ' + new Date(d.uploaded_at || 0).toLocaleDateString('nl-NL') + '\n';
      });
      // Audit log
      rapport += '\n\nTOEGANGSLOG\n' + '='.repeat(60) + '\n';
      (audit.results || []).forEach(a => {
        rapport += new Date(a.ts).toLocaleString('nl-NL') + ' | ' + (a.rol || '—') + ' | ' + (a.actie || '—') + ' | IP: ' + (a.ip || '—') + '\n';
      });
      rapport += '\n' + '='.repeat(60) + '\nEinde dossier export KantoorInzicht\n';
      const encoder = new TextEncoder();
      const bytes = encoder.encode(rapport);
      const exportNaam = 'dossier-' + code + '-' + new Date().toISOString().split('T')[0] + '.txt';
      return new Response(bytes, { headers: { ...getCORS(request), 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + exportNaam + '"' } });
    }


    /* ═══════════════════════════════════════════════════════════════
       GEBRUIKERSBEHEER (multi-tenant)
    ═══════════════════════════════════════════════════════════════ */

    /* SUPER-ADMIN: gebruikers overzicht */
    if (path === '/gebruikers/lijst' && request.method === 'GET') {
      if (!isSuperAdmin(request)) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const lijst = await env.DB.prepare('SELECT id,naam,bedrijf,email,status,plan,created_at,last_login FROM bf_gebruikers ORDER BY created_at DESC').all().catch(()=>({results:[]}));
      // Voeg traject-aantallen toe
      const result = await Promise.all((lijst.results||[]).map(async g => {
        const n = await env.DB.prepare('SELECT COUNT(*) as n FROM mna_trajecten WHERE gebruiker_id=?').bind(g.id).first().catch(()=>({n:0}));
        return {...g, traject_count: n?.n || 0};
      }));
      return new Response(JSON.stringify(result),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* SUPER-ADMIN: uitnodiging versturen */
    if (path === '/gebruikers/uitnodigen' && request.method === 'POST') {
      if (!isSuperAdmin(request)) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const invBody = await request.json().catch(()=>({}));
      const { naam, bedrijf, email } = invBody;
      if (!naam || !email) return new Response(JSON.stringify({error:'naam en email verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Check of email al bestaat
      const bestaand = await env.DB.prepare('SELECT id FROM bf_gebruikers WHERE email=?').bind(email.toLowerCase()).first().catch(()=>null);
      if (bestaand) return new Response(JSON.stringify({error:'Dit e-mailadres is al uitgenodigd'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const gId = 'G' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await env.DB.prepare('INSERT INTO bf_gebruikers (id,naam,bedrijf,email,status,invite_token,created_at) VALUES (?,?,?,?,?,?,?)').bind(gId, naam, bedrijf||'', email.toLowerCase(), 'uitgenodigd', token, Date.now()).run();
      // Stuur invite e-mail
      if (env.RESEND_API_KEY) {
        const invLink = 'https://koersvoormorgen.nl/registreer.html?token=' + token;
        await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.RESEND_API_KEY},body:JSON.stringify({
          from: 'KantoorInzicht <noreply@koersvoormorgen.nl>',
          to: [email],
          subject: 'Uitnodiging KantoorInzicht M&A Platform',
          html: '<p>Dag ' + naam + ',</p><p>Marcel Bisschops nodigt je uit om te werken met het <strong>KantoorInzicht M&A Platform</strong>.</p><p>Klik op de link hieronder om je account te activeren en een wachtwoord in te stellen:</p><p><a href="' + invLink + '" style="background:#1a7a5e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-weight:600;display:inline-block">Account activeren</a></p><p style="font-size:12px;color:#888">Of kopieer deze link: ' + invLink + '</p><p>Met vriendelijke groet,<br>Marcel Bisschops<br>Bisschops Financing</p>'
        })}).catch(()=>{});
      }
      return new Response(JSON.stringify({ok:true, token, id: gId}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* SUPER-ADMIN: gebruiker verwijderen / deactiveren */
    // Wachtwoord vergeten — stap 1: aanvragen (publiek endpoint)
    if (path === '/gebruikers/ww-vergeten' && request.method === 'POST') {
      const body = await parseBody(request);
      const email = (body.email||'').toLowerCase().trim();
      if (!email) return new Response(JSON.stringify({ok:false,error:'E-mail verplicht'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare("SELECT * FROM bf_gebruikers WHERE email=? AND status='actief'").bind(email).first().catch(()=>null);
      // Altijd ok teruggeven (geen user enumeration)
      if (g) {
        const token = crypto.randomUUID().replace(/-/g,'');
        const expires = Date.now() + 3600000; // 1 uur
        await env.DB.prepare("UPDATE bf_gebruikers SET invite_token=?, sessie_ts=? WHERE id=?").bind('reset_' + token, expires, g.id).run().catch(()=>{});
        if (env.RESEND_API_KEY) {
          const resetUrl = 'https://koersvoormorgen.nl/registreer.html?reset=' + token;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':'Bearer ' + env.RESEND_API_KEY},
            body: JSON.stringify({
              from: 'KantoorInzicht <noreply@koersvoormorgen.nl>',
              to: [email],
              subject: 'Wachtwoord opnieuw instellen — KantoorInzicht',
              html: '<div style="font-family:sans-serif;max-width:520px"><div style="background:#1a1815;color:#f5f0e8;padding:1.5rem;border-radius:8px 8px 0 0"><h2 style="margin:0;font-size:1.1rem">Wachtwoord opnieuw instellen</h2></div><div style="background:#fff;border:1px solid #ddd;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px"><p style="font-size:14px;color:#2a2825">U heeft een verzoek ingediend om uw wachtwoord opnieuw in te stellen.</p><p style="font-size:14px;color:#2a2825">Klik op de knop hieronder om een nieuw wachtwoord in te stellen. De link is 1 uur geldig.</p><p style="margin:1.5rem 0"><a href="' + resetUrl + '" style="background:#2db88a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Wachtwoord instellen</a></p><p style="font-size:12px;color:#8a8880">Of kopieer deze link: ' + resetUrl + '</p><p style="font-size:12px;color:#8a8880;margin-top:1rem">Heeft u dit niet aangevraagd? Dan kunt u deze e-mail negeren.</p></div></div>'
            })
          }).catch(()=>{});
        }
      }
      return new Response(JSON.stringify({ok:true,msg:'Als dit e-mailadres bekend is, ontvangt u een resetlink.'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    // Wachtwoord vergeten — stap 2: token valideren + nieuw wachtwoord instellen
    if (path === '/gebruikers/ww-reset' && request.method === 'POST') {
      const body = await parseBody(request);
      const token = (body.token||'').trim();
      const wachtwoord = (body.wachtwoord||'').trim();
      if (!token || !wachtwoord || wachtwoord.length < 8) return new Response(JSON.stringify({ok:false,error:'Token en wachtwoord (min. 8 tekens) verplicht'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare("SELECT * FROM bf_gebruikers WHERE invite_token=?").bind('reset_' + token).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({ok:false,error:'Ongeldige of verlopen resetlink.'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      if (g.sessie_ts < Date.now()) return new Response(JSON.stringify({ok:false,error:'Resetlink verlopen. Vraag een nieuwe aan.'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(wachtwoord);
      await env.DB.prepare("UPDATE bf_gebruikers SET ww_hash=?, invite_token=NULL, sessie_ts=NULL WHERE id=?").bind(hash, g.id).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true,msg:'Wachtwoord succesvol ingesteld. U kunt nu inloggen.'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path.startsWith('/gebruikers/activeer/') && request.method === 'POST') {
      const actParams = await request.text().catch(()=>'');
      const actKey = new URLSearchParams(actParams).get('key') || new URL(request.url).searchParams.get('key') || '';
      if (!actKey || actKey !== (env.ADMIN_KEY||'')) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const gId = path.replace('/gebruikers/activeer/','');
      const gToActivate = await env.DB.prepare('SELECT id,status FROM bf_gebruikers WHERE id=?').bind(gId).first().catch(()=>null);
      if (!gToActivate) return new Response(JSON.stringify({ok:false,error:'Gebruiker niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare("UPDATE bf_gebruikers SET status='actief' WHERE id=?").bind(gId).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path.startsWith('/gebruikers/verwijder/') && request.method === 'POST') {
      const delParams = await request.text().catch(()=>'');
      const delKey = new URLSearchParams(delParams).get('key') || new URL(request.url).searchParams.get('key') || '';
      if (!delKey || delKey !== (env.ADMIN_KEY||'')) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const gId = path.replace('/gebruikers/verwijder/','');
      const gName = await env.DB.prepare('SELECT naam,email FROM bf_gebruikers WHERE id=?').bind(gId).first().catch(()=>null);
      await env.DB.prepare('DELETE FROM bf_gebruikers WHERE id=?').bind(gId).run().catch(()=>{});
      console.log('[AUDIT] Gebruiker verwijderd:', gId, gName?.email, 'door IP:', clientIP, new Date().toISOString());
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path.startsWith('/gebruikers/reset-ww/') && request.method === 'POST' && sleutel) {
      const gId = path.replace('/gebruikers/reset-ww/','');
      const body = await parseBody(request);
      if (!body.wachtwoord || body.wachtwoord.length < 8) return new Response(JSON.stringify({ok:false,error:'Wachtwoord te kort'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(body.wachtwoord);
      await env.DB.prepare("UPDATE bf_gebruikers SET ww_hash=? WHERE id=?").bind(hash, gId).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }
    if (path.startsWith('/gebruikers/deactiveer/') && request.method === 'POST') {
      const deactParams = await request.text().catch(()=>'');
      const deactKey = new URLSearchParams(deactParams).get('key') || new URL(request.url).searchParams.get('key') || '';
      if (!deactKey || deactKey !== (env.ADMIN_KEY||'')) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      if (!isSuperAdmin(request)) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const gId = path.replace('/gebruikers/deactiveer/','');
      await env.DB.prepare('UPDATE bf_gebruikers SET status=? WHERE id=?').bind('inactief', gId).run();
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* REGISTRATIE: token valideren */
    if (path === '/gebruikers/invite' && request.method === 'GET') {
      const tok = url.searchParams.get('token') || '';
      if (!tok) return new Response(JSON.stringify({error:'Token ontbreekt'}),{status:400,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare('SELECT id,naam,bedrijf,email,status FROM bf_gebruikers WHERE invite_token=?').bind(tok).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({error:'Ongeldige of verlopen uitnodiging'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      if (g.status === 'actief') return new Response(JSON.stringify({error:'Account is al geactiveerd. Log in via marilyn.html'}),{status:409,headers:{...getCORS(request),'Content-Type':'application/json'}});
      return new Response(JSON.stringify({ok:true, naam:g.naam, bedrijf:g.bedrijf, email:g.email}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* REGISTRATIE: wachtwoord instellen + activeren */
    if (path === '/gebruikers/activeer' && request.method === 'POST') {
      const actBody = await request.json().catch(()=>({}));
      const { token, wachtwoord } = actBody;
      if (!token || !wachtwoord || wachtwoord.length < 8) return new Response(JSON.stringify({error:'Token en wachtwoord (min 8 tekens) verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare('SELECT id,email,status FROM bf_gebruikers WHERE invite_token=?').bind(token).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({error:'Ongeldige uitnodiging'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      if (g.status === 'actief') return new Response(JSON.stringify({error:'Al geactiveerd'}),{status:409,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(wachtwoord);
      const sessieTok = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await env.DB.prepare('UPDATE bf_gebruikers SET ww_hash=?,status=?,sessie_token=?,sessie_ts=?,last_login=?,invite_token=NULL WHERE id=?').bind(hash,'actief',sessieTok,Date.now(),Date.now(),g.id).run();
      return new Response(JSON.stringify({ok:true, sessie_token:sessieTok, email:g.email}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* LOGIN: e-mail + wachtwoord */
    if (path === '/gebruikers/login' && request.method === 'POST') {
      const lgBody = await request.json().catch(()=>({}));
      const { email, wachtwoord } = lgBody;
      if (!email || !wachtwoord) return new Response(JSON.stringify({error:'E-mail en wachtwoord verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare('SELECT * FROM bf_gebruikers WHERE email=? AND status=\'actief\'').bind(email.toLowerCase()).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({error:'E-mail of wachtwoord onjuist'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(wachtwoord);
      if (hash !== g.ww_hash) return new Response(JSON.stringify({error:'E-mail of wachtwoord onjuist'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const sessieTok = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await env.DB.prepare('UPDATE bf_gebruikers SET sessie_token=?,sessie_ts=?,last_login=? WHERE id=?').bind(sessieTok,Date.now(),Date.now(),g.id).run();
      return new Response(JSON.stringify({ok:true, sessie_token:sessieTok, naam:g.naam, bedrijf:g.bedrijf, email:g.email, id:g.id, plan:g.plan}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GEBRUIKER: eigen trajecten ophalen */
    if (path === '/gebruikers/mna/lijst' && request.method === 'GET') {
      const g = await gebruikerViaToken(request);
      if (!g) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const lijst = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE gebruiker_id=? ORDER BY created_at DESC').bind(g.id).all().catch(()=>({results:[]}));
      return new Response(JSON.stringify(lijst.results||[]),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GEBRUIKER: traject aanmaken (koppelt aan gebruiker) */
    if (path === '/gebruikers/mna/create' && request.method === 'POST') {
      // Zorg dat tabel bestaat
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS bf_gebruikers (id TEXT PRIMARY KEY, naam TEXT NOT NULL, bedrijf TEXT, email TEXT NOT NULL UNIQUE, ww_hash TEXT, status TEXT DEFAULT \'uitgenodigd\', invite_token TEXT, sessie_token TEXT, sessie_ts INTEGER, plan TEXT DEFAULT \'basis\', created_at INTEGER NOT NULL, last_login INTEGER)').run().catch(()=>{});
      const g = await gebruikerViaToken(request);
      if (!g) return new Response(JSON.stringify({error:'Sessie verlopen of ongeldig. Log opnieuw in.'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Zelfde logica als /mna/create maar met gebruiker_id
      const crBody = await request.json().catch(()=>({}));
      const { kantoor_naam, kantoor_rechtsvorm, contact_naam, contact_email, traject_type, sector, notitie, begeleider_naam, begeleider_email, koper_naam, koper_rechtsvorm, koper_contact, koper_email, koper_adres, koper_kvk, verkoper_adres, verkoper_kvk } = crBody;
      if (!kantoor_naam) return new Response(JSON.stringify({error:'kantoor_naam verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const rechtsvormen = {'bv':'B.V.','b.v.':'B.V.','nv':'N.V.','n.v.':'N.V.','vof':'V.O.F.','v.o.f.':'V.O.F.','eenmanszaak':'Eenmanszaak','stichting':'Stichting','cooperatie':'Coöperatie','coöperatie':'Coöperatie','holding':'Holding B.V.','maatschap':'Maatschap'};
      const rvNorm = koper_rechtsvorm ? (rechtsvormen[(koper_rechtsvorm||'').toLowerCase()] || koper_rechtsvorm) : '';
      const code = Math.random().toString(36).slice(2,6).toUpperCase() + Math.floor(1000+Math.random()*9000);
      const koper_code = 'K' + Math.random().toString(36).slice(2,9).toUpperCase();
      const tussen_code = 'T' + Math.random().toString(36).slice(2,9).toUpperCase();
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN gebruiker_id TEXT').run().catch(()=>{});
      await env.DB.prepare('INSERT INTO mna_trajecten (id,kantoor_naam,kantoor_rechtsvorm,contact_naam,contact_email,traject_type,sector,notitie,status,created_at,updated_at,koper_code,tussen_code,begeleider_naam,begeleider_email,koper_naam,koper_rechtsvorm,koper_contact,koper_email,koper_adres,koper_kvk,verkoper_adres,verkoper_kvk,gebruiker_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(code,kantoor_naam,kantoor_rechtsvorm||'',contact_naam||'',contact_email||'',traject_type||'Verkoop',sector||'accountancy',notitie||'','actief',Date.now(),Date.now(),koper_code,tussen_code,begeleider_naam||g.naam,begeleider_email||g.email,koper_naam||'',rvNorm||'',koper_contact||'',koper_email||'',koper_adres||'',koper_kvk||'',verkoper_adres||'',verkoper_kvk||'',g.id).run();
      return new Response(JSON.stringify({ok:true,code,koper_code,tussen_code}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GEBRUIKER: toegang tot traject-detail (eigen trajecten) */
    if (path.startsWith('/gebruikers/mna/detail/') && request.method === 'GET') {
      const g = await gebruikerViaToken(request);
      if (!g) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const tCode = path.replace('/gebruikers/mna/detail/','').toUpperCase();
      const traject = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE id=? AND gebruiker_id=?').bind(tCode,g.id).first().catch(()=>null);
      if (!traject) return new Response(JSON.stringify({error:'Niet gevonden of geen toegang'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const data = await env.DB.prepare('SELECT * FROM mna_data WHERE traject_id=?').bind(tCode).all().catch(()=>({results:[]}));
      const docs = await env.DB.prepare('SELECT id,fase_id,bestand_naam,methode,veld_extractie,uploaded_at FROM mna_documenten WHERE traject_id=?').bind(tCode).all().catch(()=>({results:[]}));
      return new Response(JSON.stringify({traject,data:data.results,documenten:docs.results}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }


    /* == ADVISEUR: TRAJECTEN OVERZICHT == */
    if (path === '/adviseur/trajecten' && request.method === 'POST') {
      // Brute-force beveiliging adviseur login
      if (checkRateLimit(clientIP + ':advlogin', 10, 5 * 60 * 1000)) {
        console.warn('[SECURITY] Adviseur brute-force van IP:', clientIP, new Date().toISOString());
        return new Response(JSON.stringify({error:'Te veel inlogpogingen. Wacht 5 minuten.'}),{status:429,headers:{...getCORS(request),'Content-Type':'application/json','Retry-After':'300'}});
      }
      const body = await parseBody(request);
      const { email, wachtwoord } = body;
      if (!email || !wachtwoord) return new Response(JSON.stringify({error:'E-mail en wachtwoord verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS bf_gebruikers (id TEXT PRIMARY KEY, naam TEXT NOT NULL, bedrijf TEXT, email TEXT NOT NULL UNIQUE, ww_hash TEXT, status TEXT DEFAULT \'uitgenodigd\', invite_token TEXT, sessie_token TEXT, sessie_ts INTEGER, plan TEXT DEFAULT \'basis\', created_at INTEGER NOT NULL, last_login INTEGER)').run().catch(()=>{});
      const gCheck = await env.DB.prepare('SELECT * FROM bf_gebruikers WHERE email=?').bind(email.toLowerCase()).first().catch(()=>null);
      if (gCheck && gCheck.status === 'inactief') return new Response(JSON.stringify({error:'Uw account is gedeactiveerd. Neem contact op met uw beheerder.'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const g = await env.DB.prepare('SELECT * FROM bf_gebruikers WHERE email=? AND status=\'actief\'').bind(email.toLowerCase()).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({error:'E-mail of wachtwoord onjuist'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(wachtwoord);
      if (hash !== g.ww_hash) return new Response(JSON.stringify({error:'E-mail of wachtwoord onjuist'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Haal trajecten op
      const lijst = await env.DB.prepare('SELECT * FROM mna_trajecten WHERE gebruiker_id=? ORDER BY created_at DESC').bind(g.id).all().catch(()=>({results:[]}));
      await env.DB.prepare('UPDATE bf_gebruikers SET last_login=? WHERE id=?').bind(Date.now(),g.id).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true, naam:g.naam, bedrijf:g.bedrijf, id:g.id, trajecten:lijst.results||[]}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* == ADVISEUR: TRAJECT AANMAKEN == */
    if (path === '/adviseur/create' && request.method === 'POST') {
      const body = await parseBody(request);
      const { email, wachtwoord, traject } = body;
      if (!email || !wachtwoord) return new Response(JSON.stringify({error:'Auth verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS bf_gebruikers (id TEXT PRIMARY KEY, naam TEXT NOT NULL, bedrijf TEXT, email TEXT NOT NULL UNIQUE, ww_hash TEXT, status TEXT DEFAULT \'uitgenodigd\', invite_token TEXT, sessie_token TEXT, sessie_ts INTEGER, plan TEXT DEFAULT \'basis\', created_at INTEGER NOT NULL, last_login INTEGER)').run().catch(()=>{});
      const g = await env.DB.prepare('SELECT * FROM bf_gebruikers WHERE email=? AND status=\'actief\'').bind(email.toLowerCase()).first().catch(()=>null);
      if (!g) return new Response(JSON.stringify({error:'Authenticatie mislukt'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const hash = await hashWW(wachtwoord);
      if (hash !== g.ww_hash) return new Response(JSON.stringify({error:'Authenticatie mislukt'}),{status:401,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const { kantoor_naam, contact_naam, contact_email, traject_type, sector, notitie, koper_naam, koper_contact, koper_email, verkoper_adres, verkoper_kvk, kantoor_rechtsvorm, koper_adres, koper_kvk } = traject || {};
      if (!kantoor_naam) return new Response(JSON.stringify({error:'kantoor_naam verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare('ALTER TABLE mna_trajecten ADD COLUMN gebruiker_id TEXT').run().catch(()=>{});
      const code = Math.random().toString(36).slice(2,6).toUpperCase() + Math.floor(1000+Math.random()*9000);
      const koper_code = 'K' + Math.random().toString(36).slice(2,9).toUpperCase();
      const tussen_code = 'T' + Math.random().toString(36).slice(2,9).toUpperCase();
      const rechtsvormen = {'bv':'B.V.','nv':'N.V.','vof':'V.O.F.','eenmanszaak':'Eenmanszaak','maatschap':'Maatschap'};
      const rvNorm = kantoor_rechtsvorm ? (rechtsvormen[(kantoor_rechtsvorm||'').toLowerCase()] || kantoor_rechtsvorm) : '';
      await env.DB.prepare('INSERT INTO mna_trajecten (id,kantoor_naam,kantoor_rechtsvorm,contact_naam,contact_email,traject_type,sector,notitie,status,created_at,updated_at,koper_code,tussen_code,begeleider_naam,begeleider_email,koper_naam,koper_contact,koper_email,koper_adres,koper_kvk,verkoper_adres,verkoper_kvk,gebruiker_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(code,kantoor_naam,rvNorm,contact_naam||'',contact_email||'',traject_type||'Verkoop',sector||'accountancy',notitie||'','actief',Date.now(),Date.now(),koper_code,tussen_code,g.naam,g.email||'',koper_naam||'',koper_contact||'',koper_email||'',koper_adres||'',koper_kvk||'',verkoper_adres||'',verkoper_kvk||'',g.id).run();
      return new Response(JSON.stringify({ok:true,code,koper_code,tussen_code}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* == MNA CHAT: OPHALEN == */
    if (path.startsWith('/mna/chat/') && request.method === 'GET') {
      const code = path.replace('/mna/chat/', '').split('?')[0].toUpperCase();
      if (!code || !env.DB) return new Response(JSON.stringify({ berichten: [] }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_chat (id TEXT PRIMARY KEY, traject_id TEXT NOT NULL, auteur TEXT NOT NULL, naam TEXT, tekst TEXT NOT NULL, gelezen INTEGER DEFAULT 0, created_at INTEGER NOT NULL)').run().catch(() => {});
      // Zoek traject_id op (kan via verkoper, koper of tussen code)
      let traject = await env.DB.prepare('SELECT id FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code, code, code).first().catch(() => null);
      const tid = traject ? traject.id : code;
      const rows = await env.DB.prepare('SELECT * FROM mna_chat WHERE traject_id=? ORDER BY created_at ASC LIMIT 200').bind(tid).all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify({ berichten: rows.results }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* == MNA CHAT: VERSTUREN == */
    if (path.startsWith('/mna/chat/') && request.method === 'POST') {
      const code = path.replace('/mna/chat/', '').split('?')[0].toUpperCase();
      if (!code || !env.DB) return new Response(JSON.stringify({ error: 'Niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const body = await request.json().catch(() => ({}));
      const { auteur, naam, tekst } = body;
      if (!tekst || !auteur) return new Response(JSON.stringify({ error: 'tekst en auteur verplicht' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS mna_chat (id TEXT PRIMARY KEY, traject_id TEXT NOT NULL, auteur TEXT NOT NULL, naam TEXT, tekst TEXT NOT NULL, gelezen INTEGER DEFAULT 0, created_at INTEGER NOT NULL)').run().catch(() => {});
      let traject = await env.DB.prepare('SELECT id, kantoor_naam, begeleider_email, contact_email FROM mna_trajecten WHERE id=? OR koper_code=? OR tussen_code=?').bind(code, code, code).first().catch(() => null);
      const tid = traject ? traject.id : code;
      const id = tid + '_chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await env.DB.prepare('INSERT INTO mna_chat (id, traject_id, auteur, naam, tekst, gelezen, created_at) VALUES (?,?,?,?,?,0,?)').bind(id, tid, auteur, naam || auteur, tekst, Date.now()).run();
      // E-mail notificatie als begeleider een bericht stuurt aan verkoper
      if (auteur === 'begeleider' && traject && traject.contact_email && env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'KantoorInzicht <noreply@koersvoormorgen.nl>', to: [traject.contact_email], subject: 'Nieuw bericht van uw adviseur — ' + (traject.kantoor_naam || tid), html: '<p>Uw M&A adviseur heeft u een bericht gestuurd:</p><blockquote style="border-left:3px solid #1a7a5e;padding:8px 12px;color:#5a5854;font-style:italic">' + tekst.split('\n').join('<br>') + '</blockquote><p><a href="https://koersvoormorgen.nl/mna.html">Bekijk en reageer in KantoorInzicht</a></p>' }) });
        } catch(e) {}
      }
      return new Response(JSON.stringify({ ok: true, id }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* VERHUIS SCAN ENDPOINTS */
    if (path === '/verhuis/admin/scans' && request.method === 'GET') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      if (!env.DB) return new Response(JSON.stringify([]), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS verhuis_scans (id TEXT PRIMARY KEY, bedrijfsnaam TEXT, email TEXT, regio TEXT, scores TEXT, overall INTEGER, top_scenario TEXT, rapport_tekst TEXT, created_at INTEGER)').run().catch(() => {});
      const rows = await env.DB.prepare('SELECT id,bedrijfsnaam,email,regio,overall,top_scenario,created_at FROM verhuis_scans ORDER BY created_at DESC LIMIT 500').all().catch(() => ({ results: [] }));
      return new Response(JSON.stringify(rows.results), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    if (path.startsWith('/verhuis/admin/scan/') && request.method === 'GET') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const vid = path.replace('/verhuis/admin/scan/', '').split('?')[0];
      if (!env.DB) return new Response(JSON.stringify({}), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const row = await env.DB.prepare('SELECT * FROM verhuis_scans WHERE id=?').bind(vid).first().catch(() => null);
      return new Response(JSON.stringify(row || { error: 'Niet gevonden' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }
    if (path.startsWith('/verhuis/admin/delete/') && request.method === 'POST') {
      const url2 = new URL(request.url);
      const key2 = url2.searchParams.get('key') || '';
      if (key2 !== (env.ADMIN_KEY || '')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      const vid = path.replace('/verhuis/admin/delete/', '').split('?')[0];
      if (env.DB) await env.DB.prepare('DELETE FROM verhuis_scans WHERE id=?').bind(vid).run().catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

    /* ═══════════════════════════════════════════════════════════════
       VERHUISSCAN ENDPOINTS
    ═══════════════════════════════════════════════════════════════ */

    /* GET scan by ID */
    if (path.startsWith('/verhuis/scan/') && request.method === 'GET') {
      const sid = path.replace('/verhuis/scan/','').split('?')[0].toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({error:'DB niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const scan = await env.DB.prepare('SELECT * FROM verhuis_scans WHERE id=?').bind(sid).first().catch(()=>null);
      if (!scan) return new Response(JSON.stringify({error:'Scan niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      return new Response(JSON.stringify(scan),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* POST /verhuis/rapport — genereer AI rapport voor een scan */
    if (path === '/verhuis/rapport' && request.method === 'POST') {
      if (!env.DB || !env.ANTHROPIC_API_KEY) return new Response(JSON.stringify({error:'Niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const rapBody = await request.json().catch(()=>({}));
      const scanId = rapBody.id || '';
      if (!scanId) return new Response(JSON.stringify({error:'Scan ID ontbreekt'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const scan = await env.DB.prepare('SELECT * FROM verhuis_scans WHERE id=?').bind(scanId.toUpperCase()).first().catch(()=>null);
      if (!scan) return new Response(JSON.stringify({error:'Scan niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Haal antwoorden op (opgeslagen in antwoorden_json)
      let antw = {};
      try { antw = scan.antwoorden_json ? JSON.parse(scan.antwoorden_json) : {}; } catch(e) {}
      const scores = typeof scan.scores === 'string' ? JSON.parse(scan.scores || '{}') : (scan.scores || {});
      const overall = scan.overall || 0;
      const topScenario = scan.top_scenario || '';
      // Bouw AI-prompt
      const huidigeJaarV = new Date().getFullYear();
      const prompt = 'Je bent Marcel Bisschops, M&A-adviseur en specialist verhuisbranche. Het huidige jaar is ' + huidigeJaarV + '. Schrijf een persoonlijk strategisch rapport voor verhuisbedrijf "' + (scan.bedrijfsnaam||'') + '" (regio: ' + (scan.regio||'onbekend') + '). Gebruik alleen datums en kwartalen die in ' + huidigeJaarV + ' of later liggen.'
        + '\n\nBEDRIJFSCIJFERS:\n'
        + '- Omzet: ' + (antw.omzet||'niet opgegeven') + '\n'
        + '- FTE: ' + (antw.fte||'niet opgegeven') + '\n'
        + '- EBITDA-marge: ' + (antw.ebitda||'niet opgegeven') + '\n'
        + '- Omzet verhuizen: ' + (antw.omzet_verhuis||'niet ingevuld') + '\n'
        + '- Omzet opslag: ' + (antw.omzet_opslag||'niet ingevuld') + '\n'
        + '- Omzet circulair: ' + (antw.omzet_circulair||'niet ingevuld') + '\n'
        + '- Recurring omzet: ' + (antw.recurring||'niet ingevuld') + '\n'
        + '- Bedrijfstype: ' + (antw.bedrijf_type||'onbekend') + '\n'
        + '- Aantal voertuigen: ' + (antw.wagens_aantal||'onbekend') + '\n'
        + '- Vestigingen: ' + (antw.vestigingen||'1') + '\n'
        + '- Strategisch doel: ' + (antw.doel_periode||'niet opgegeven') + '\n'
        + '\nSCORES PER DIMENSIE (0-100):\n'
        + Object.entries(scores).map(function(e){return '- ' + e[0] + ': ' + e[1];}).join('\n')
        + '\n\nOVERAL SCORE: ' + overall + '/100'
        + '\nTOP SCENARIO: ' + topScenario
        + '\n\nOPEN ANTWOORDEN:\n'
        + (antw.open_financieel ? '- Financieel: ' + antw.open_financieel + '\n' : '')
        + (antw.open_wagenpark ? '- Wagenpark: ' + antw.open_wagenpark + '\n' : '')
        + (antw.open_markt ? '- Markt: ' + antw.open_markt + '\n' : '')
        + (antw.open_circulair ? '- Circulair: ' + antw.open_circulair + '\n' : '')
        + (antw.open_personeel ? '- Personeel: ' + antw.open_personeel + '\n' : '')
        + (antw.open_strategie ? '- Strategie: ' + antw.open_strategie + '\n' : '')
        + '\n\nSECTORBENCHMARKS VERHUISBRANCHE (CBS SBI 4942):\n'
        + '- EBITDA-marge: 6-12% gezond, <5% kwetsbaar, >15% sterk\n'
        + '- Omzet/FTE: €60k-€120k (verhuizen), hogere marge bij opslag\n'
        + '- Wagenpark: transitie naar elektrisch (EV-keurmerk aanbestedingsvoordeel)\n'
        + '- Opslag bezetting: >70% winstgevend, <50% verlieslatend\n'
        + '- Recurring omzet: >25% = sterk fundament\n'
        + '\nSchrijf een concreet, cijfermatig onderbouwd rapport in professioneel Nederlands. Gebruik de werkelijke cijfers van dit bedrijf. Vergelijk expliciet met sectorgemiddelden. Geef prioriteit aan de twee of drie zwakste dimensies. Sluit af met drie concrete aanbevelingen voor de komende 12 maanden.\n'
        + '\nStructuur (gebruik ## koppen):\n'
        + '## Strategisch profiel\n'
        + '## Financiële analyse\n'
        + '## Wagenpark & Duurzaamheid\n'
        + '## Markt & Groeikansen\n'
        + '## Personeel & Digitalisering\n'
        + '## Strategie & Opvolging\n'
        + '## Drie concrete aanbevelingen\n'
        + '\nMax 900 woorden. Schrijf alsof je het rechtstreeks tegen de ondernemer zegt.';

      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, messages: [{role:'user',content:prompt}] })
      });
      if (!aiResp.ok) {
        const errTxt = await aiResp.text();
        return new Response(JSON.stringify({error:'AI fout: '+errTxt.substring(0,200)}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      }
      const aiData = await aiResp.json();
      const tekst = aiData.content && aiData.content[0] ? aiData.content[0].text : '';
      if (!tekst) return new Response(JSON.stringify({error:'Leeg AI antwoord'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      // Sla rapport op
      await env.DB.prepare('UPDATE verhuis_scans SET rapport_tekst=? WHERE id=?').bind(tekst, scanId.toUpperCase()).run().catch(()=>{});
      // E-mail naar Marcel (niet-blokkerend)
      if (env.RESEND_API_KEY && ctx) {
        ctx.waitUntil((async()=>{
          try {
            await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.RESEND_API_KEY},body:JSON.stringify({
              from:'VerhuisScan <noreply@koersvoormorgen.nl>',
              to:['marcel@bisschopsfinancing.nl'],
              subject:'Nieuwe VerhuisScan: '+(scan.bedrijfsnaam||'onbekend')+' — '+overall+'/100',
              html:'<p><strong>'+(scan.bedrijfsnaam||'')+'</strong> ('+(scan.regio||'onbekend')+')</p>'
                +'<p>Score: '+overall+'/100 &middot; Scenario: '+topScenario+'</p>'
                +'<p>Omzet: '+(antw.omzet||'—')+' &middot; FTE: '+(antw.fte||'—')+' &middot; EBITDA: '+(antw.ebitda||'—')+'</p>'
                +'<p>E-mail: '+(scan.email||'—')+'</p>'
                +'<hr><pre style="font-size:12px">'+tekst.substring(0,2000)+'</pre>'
            })});
          } catch(e) {}
        })());
      }
      return new Response(JSON.stringify({ok:true, tekst}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GROEP AANMAKEN */
    if (path === '/verhuis/groep/create' && request.method === 'POST') {
      if (!env.DB) return new Response(JSON.stringify({error:'DB niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS verhuis_groepen (id TEXT PRIMARY KEY, naam TEXT, admin_email TEXT, admin_code TEXT, created_at INTEGER)').run().catch(()=>{});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS verhuis_groep_scans (groep_id TEXT, scan_id TEXT, PRIMARY KEY(groep_id,scan_id))').run().catch(()=>{});
      const gBody = await request.json().catch(()=>({}));
      if (!gBody.naam || !gBody.admin_email) return new Response(JSON.stringify({error:'naam en admin_email verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      const groepId = 'VS' + Math.random().toString(36).slice(2,6).toUpperCase();
      const adminCode = 'VA' + Math.random().toString(36).slice(2,8).toUpperCase();
      await env.DB.prepare('INSERT INTO verhuis_groepen (id,naam,admin_email,admin_code,created_at) VALUES (?,?,?,?,?)').bind(groepId,gBody.naam,gBody.admin_email,adminCode,Date.now()).run();
      return new Response(JSON.stringify({ok:true,groep_id:groepId,admin_code:adminCode}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GROEP OPHALEN (dashboard) */
    if (path.startsWith('/verhuis/groep/') && request.method === 'GET' && !path.includes('/by-admin/')) {
      const groepId = path.replace('/verhuis/groep/','').split('?')[0].toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({error:'DB niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const adminCode = url.searchParams.get('admin_code') || '';
      const groep = await env.DB.prepare('SELECT * FROM verhuis_groepen WHERE id=?').bind(groepId).first().catch(()=>null);
      if (!groep) return new Response(JSON.stringify({error:'Groep niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const isAdmin = adminCode && adminCode.toUpperCase() === groep.admin_code;
      const koppelingen = await env.DB.prepare('SELECT scan_id FROM verhuis_groep_scans WHERE groep_id=?').bind(groepId).all().catch(()=>({results:[]}));
      const scanIds = (koppelingen.results||[]).map(r=>r.scan_id);
      let scans = [];
      for (const sid of scanIds) {
        const s = await env.DB.prepare('SELECT id,bedrijfsnaam,regio,overall,top_scenario,scores FROM verhuis_scans WHERE id=?').bind(sid).first().catch(()=>null);
        if (s) scans.push(s);
      }
      scans.sort((a,b)=>b.overall-a.overall);
      // Cumulatieve scores
      let cumScores = {};
      if (scans.length) {
        scans.forEach(s => {
          const sc = typeof s.scores==='string'?JSON.parse(s.scores||'{}'):(s.scores||{});
          Object.entries(sc).forEach(([k,v])=>{if(!cumScores[k])cumScores[k]=[];cumScores[k].push(v);});
        });
        Object.keys(cumScores).forEach(k=>{cumScores[k]=Math.round(cumScores[k].reduce((a,b)=>a+b,0)/cumScores[k].length);});
      }
      return new Response(JSON.stringify({groep:{id:groep.id,naam:groep.naam,dashboard_public:true},scans,cumScores,is_admin:isAdmin}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* GROEP BY ADMIN CODE */
    if (path.startsWith('/verhuis/groep/by-admin/') && request.method === 'GET') {
      const adminCode = path.replace('/verhuis/groep/by-admin/','').split('?')[0].toUpperCase();
      if (!env.DB) return new Response(JSON.stringify({error:'DB niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const groep = await env.DB.prepare('SELECT * FROM verhuis_groepen WHERE admin_code=?').bind(adminCode).first().catch(()=>null);
      if (!groep) return new Response(JSON.stringify({error:'Beheerdscode niet gevonden'}),{status:404,headers:{...getCORS(request),'Content-Type':'application/json'}});
      return new Response(JSON.stringify({ok:true,groep_id:groep.id,naam:groep.naam}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    /* SCAN KOPPELEN AAN GROEP */
    if (path === '/verhuis/groep/join' && request.method === 'POST') {
      if (!env.DB) return new Response(JSON.stringify({error:'DB niet beschikbaar'}),{status:500,headers:{...getCORS(request),'Content-Type':'application/json'}});
      const jBody = await request.json().catch(()=>({}));
      const {groep_id, scan_id} = jBody;
      if (!groep_id||!scan_id) return new Response(JSON.stringify({error:'groep_id en scan_id verplicht'}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS verhuis_groep_scans (groep_id TEXT, scan_id TEXT, PRIMARY KEY(groep_id,scan_id))').run().catch(()=>{});
      await env.DB.prepare('INSERT OR IGNORE INTO verhuis_groep_scans (groep_id,scan_id) VALUES (?,?)').bind(groep_id.toUpperCase(),scan_id.toUpperCase()).run().catch(()=>{});
      return new Response(JSON.stringify({ok:true}),{headers:{...getCORS(request),'Content-Type':'application/json'}});
    }

    if (path === '/verhuis/scan' && request.method === 'POST') {
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB niet beschikbaar' }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS verhuis_scans (id TEXT PRIMARY KEY, bedrijfsnaam TEXT, email TEXT, regio TEXT, scores TEXT, overall INTEGER, top_scenario TEXT, rapport_tekst TEXT, created_at INTEGER)').run().catch(() => {});
      const body2 = await request.json().catch(() => ({}));
      const A = body2.antwoorden || {};

      // Bereken scores per dimensie
      function gemiddelde(keys) {
        const vals = keys.map(k => A[k]).filter(v => v != null && !isNaN(v));
        return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length * 20) : 50;
      }
      const scores = {
        'Financieel': gemiddelde(['omzet_groei','marge_kw','debiteur','bezetting']),
        'Wagenpark & Duurzaamheid': gemiddelde(['wagen_type','wagen_onderhoud','laadinfra','wagen_leeftijd']),
        'Markt & Diensten': gemiddelde(['zakelijk','internationaal','online','tarieven']),
        'Opslag & Circulair': gemiddelde(['opslag','circulair','certificaat']),
        'Personeel & Digitaal': gemiddelde(['personeel','software','offerte']),
        'Strategie': gemiddelde(['positie','opvolging','strategie']),
      };
      const overall = Math.round(Object.values(scores).reduce((a,b) => a+b, 0) / Object.values(scores).length);

      // Bepaal top scenario op basis van doel en scores
      const doel = A.doel_periode || '';
      let topScenario = 'Stabiliseren & Optimaliseren';
      if (doel === 'overdracht' || doel === 'financiering') topScenario = 'Bedrijfsoverdracht voorbereiden';
      else if (doel === 'groei' && scores['Markt & Diensten'] >= 60) topScenario = 'Groeistrategie uitbouwen';
      else if (doel === 'verduurzamen' || scores['Wagenpark & Duurzaamheid'] >= 70) topScenario = 'Duurzaamheidstransitie';
      else if (scores['Financieel'] < 50) topScenario = 'Financieel versterken';
      else if (scores['Personeel & Digitaal'] < 50) topScenario = 'Digitaliseren & Schalen';
      else if (overall >= 70) topScenario = 'Marktleiderschap consolideren';

      const vid2 = 'V' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
      await env.DB.prepare('ALTER TABLE verhuis_scans ADD COLUMN antwoorden_json TEXT').run().catch(()=>{});
      await env.DB.prepare('INSERT INTO verhuis_scans (id,bedrijfsnaam,email,regio,scores,overall,top_scenario,rapport_tekst,antwoorden_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(vid2, body2.bedrijfsnaam||'', body2.email||'', body2.regio||'', JSON.stringify(scores), overall, topScenario, '', JSON.stringify(A), Date.now()).run();
      return new Response(JSON.stringify({ ok: true, id: vid2, scores, overall, topScenario }), { headers: { ...getCORS(request), 'Content-Type': 'application/json' } });
    }

        return new Response(JSON.stringify({ status: 'KantoorInzicht Worker actief', path }), {
      headers: { ...getCORS(request), 'Content-Type': 'application/json' }
    });
  },
};
// Helper: accepteer admin-key OF tussen_code voor eigen traject
async function begeleiderAuth(request, env, trajectCode) {
  const url = new URL(request.url);
  const key = request.headers.get('x-admin-key') || request.headers.get('x-tussen-key') || url.searchParams.get('key') || '';
  if (key === (env.ADMIN_KEY || '')) return { ok: true, rol: 'admin' };
  if (!trajectCode || !env.DB) return { ok: false };
  const t = await env.DB.prepare('SELECT id, tussen_code FROM mna_trajecten WHERE id=? OR tussen_code=?').bind(trajectCode.toUpperCase(), key.toUpperCase()).first().catch(() => null);
  if (t && t.tussen_code && key.toUpperCase() === t.tussen_code.toUpperCase()) return { ok: true, rol: 'begeleider', traject_id: t.id };
  return { ok: false };
}


