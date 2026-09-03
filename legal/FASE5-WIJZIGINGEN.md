# FASE 5 — Concrete wijzigingen (redlines)

**Datum:** 2026-09-03 · **Basis:** [`LEGAL_ISSUES.md`](LEGAL_ISSUES.md) + de keuzes van Marcel (3 sep).
**Status:** voorgestelde definitieve tekst. **Nog niet toegepast op live bestanden** — wacht op "ja op de redline". Na akkoord: toepassen → `node --check` + audits → staging → productie-deploy.

## Vastgelegde keuzes van Marcel (3 sep 2026)

| Bevinding | Keuze |
|---|---|
| ISSUE-05 (aansprakelijkheid) | Geen beroepsaansprakelijkheidsverzekering. Cap: **€ 10.000 per opdracht én € 10.000 per kalenderjaar**. Verzekeringszin vervalt. |
| ISSUE-03 (consument) | Claude kiest → **voorwaardelijke consumentenclausule** in de AV (geen aparte B2C-set). Treedt in werking zodra Opdrachtgever een niet-beroepsmatig handelend natuurlijk persoon is. |
| ISSUE-07 (Transactiewaarde) | Claude kiest → **strakke definitie**: aan verkoper toekomende tegenprestatie; earn-out-fee bij daadwerkelijke uitbetaling; geen dubbeltelling van in de koopsom verdisconteerde schuld; management-/huurvergoedingen alleen voor zover verkapte koopsom. |
| ISSUE-09 (boetes) | Eens — **zo laag mogelijk matigingsrisico**: boete verrekenbaar met werkelijke schade (niet cumulatief), dagboete begrensd, matigingsbevoegdheid rechter expliciet onverlet. |
| ISSUE-02 (standalone AV publiceren) | Alleen als nodig; commercieel onhandig → **niet publiceren als losse pagina**. In plaats daarvan: verwijzing in `voorwaarden.html` art. 2 niet meer laten suggereren dat er een apart vindbaar document is; AV blijft de bijlage bij elke ondertekende bemiddelingsovereenkomst (single source via `buildAvTekst()`, ISSUE-06). |
| ISSUE-12 (Wwft/cliëntacceptatie) | **Mag de flow niet blokkeren.** AV-bepaling opnemen + een **beslisboom** (wel/geen cliëntenonderzoek). De cliënt vult niets zelf in — de **adviseur** doorloopt de beslisboom en **vinkt aan** dat hij dit heeft getoetst, zowel via openbare bronnen als bij de cliënt zelf. |

---

## A. Algemene Voorwaarden — volledige nieuwe tekst (`buildAvTekst()` in `cloudflare-worker.js`)

De AV wordt herschreven en genummerd 1–12. `{{...}}`-tokens worden door `buildAvTekst(brand)` gevuld (`brand.naam`, `brand.kort`). **`AV_VERSIE` → `1.2`.**

> **ALGEMENE VOORWAARDEN**
> {{brand.naam}} — M&A-advies en bemiddeling · versie 1.2 · september 2026
>
> **Artikel 1 — Toepasselijkheid**
> Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, offertes, opdrachten, overeenkomsten en werkzaamheden van {{brand.naam}} (hierna: {{brand.kort}}) op het gebied van M&A-advies en -bemiddeling. Zij gelden mede ten behoeve van alle aan {{brand.kort}} verbonden personen en rechtspersonen, waaronder bestuurders, aandeelhouders, werknemers en door {{brand.kort}} ingeschakelde derden. Afwijkingen gelden alleen indien schriftelijk overeengekomen. De toepasselijkheid van voorwaarden van de wederpartij wordt uitdrukkelijk uitgesloten.
>
> **Artikel 2 — Definities**
> *Opdrachtgever:* de natuurlijke persoon of rechtspersoon die een overeenkomst aangaat met {{brand.kort}}, alsmede iedere (rechts)persoon namens wie wordt gehandeld of die economisch met de opdracht is verbonden.
> *Gelieerde Entiteit:* iedere (rechts)persoon die direct of indirect organisatorisch, juridisch, financieel of economisch met Opdrachtgever is verbonden, waaronder groepsmaatschappijen, deelnemingen, holdings en bestuurdersvennootschappen.
> *Introductie:* het moment waarop {{brand.kort}} identificerende gegevens van een potentiële koper, verkoper, opvolger, investeerder of andere transactiedeelnemer aan Opdrachtgever verstrekt, dan wel een contact of ontmoeting tot stand brengt.
> *Transactie:* iedere juridische of economische overdracht, participatie, samenwerking of daarmee gelijk te stellen constructie, waaronder aandelenoverdracht, activa-/passivatransactie, fusie, splitsing, joint venture en financieringsstructuur.
> *Transactiewaarde:* de som van alle vergoedingen die de verkopende partij(en) voor de aandelen of activa ontvangen of gaan ontvangen, bestaande uit (a) de koopsom; (b) uitgestelde betalingen en de hoofdsom van een vendor loan; (c) earn-out- en overige voorwaardelijke betalingen, meegeteld naar het bedrag dat daadwerkelijk wordt uitbetaald; en (d) overige aan de verkoper toekomende vergoedingen die naar hun aard deel uitmaken van de tegenprestatie voor de onderneming, waaronder management-, consultancy-, huur- of leasevergoedingen voor zover die niet een marktconforme vergoeding vormen voor daadwerkelijk te verrichten werkzaamheden of gebruik. Schulden die reeds in de koopsom zijn verdisconteerd (cash-and-debt-free), worden niet afzonderlijk meegeteld.
>
> **Artikel 3 — Aard van de dienstverlening**
> {{brand.kort}} verricht haar werkzaamheden naar beste inzicht en vermogen op basis van een inspanningsverplichting; op geen enkele werkzaamheid rust een resultaatsverplichting. {{brand.kort}} treedt niet op als accountant, fiscalist, advocaat, notaris of Register Valuator en verstrekt geen assurance-, waarderings- of certificeringsverklaringen; eventuele adviezen kunnen nimmer als zodanig worden opgevat. Opdrachtgever blijft volledig verantwoordelijk voor het (laten) uitvoeren van due diligence, voor de fiscale, juridische en financiële toetsing, voor de beoordeling van risico's en voor de uiteindelijke besluitvorming over een Transactie. {{brand.kort}} staat niet in voor de juistheid of volledigheid van informatie die afkomstig is van Opdrachtgever of van derden.
>
> **Artikel 4 — Cliëntacceptatie en integriteit**
> Opdrachtgever verstrekt op eerste verzoek de gegevens en documenten die {{brand.kort}} nodig acht om de identiteit vast te stellen van Opdrachtgever, van de bij de Transactie betrokken (rechts)personen en van de uiteindelijk belanghebbenden, alsook informatie over de herkomst van de bij de Transactie betrokken middelen. {{brand.kort}} kan de uitvoering van de opdracht opschorten of de opdracht met onmiddellijke ingang beëindigen indien deze gegevens niet tijdig worden verstrekt, indien screening tegen toepasselijke sanctielijsten daartoe aanleiding geeft, of indien bij {{brand.kort}} gerede twijfel bestaat over de integriteit van de Transactie of de herkomst van middelen. Rust op {{brand.kort}} een wettelijke meldplicht, dan gaat die voor op de geheimhouding uit deze voorwaarden. Opschorting of beëindiging op grond van dit artikel laat de betalingsverplichtingen voor reeds verrichte werkzaamheden onverlet.
>
> **Artikel 5 — Belangen en onafhankelijkheid**
> {{brand.kort}} treedt per Transactie voor één partij op. {{brand.kort}} treedt niet gelijktijdig voor beide zijden van dezelfde Transactie op en bedingt niet van beide zijden een vergoeding, tenzij beide opdrachtgevers daarmee, na schriftelijke mededeling van het tweezijdige optreden en van de vergoedingsafspraken, uitdrukkelijk instemmen. Is aan één zijde van de Transactie een consument betrokken, dan bedingt {{brand.kort}} geen vergoeding van de andere zijde. {{brand.kort}} meldt Opdrachtgever een belang dat met de opdracht kan conflicteren zodra dat bij {{brand.kort}} bekend wordt.
>
> **Artikel 6 — Vergoedingen en betaling**
> Tenzij schriftelijk anders overeengekomen gelden voor werkzaamheden op regiebasis: een uurtarief van € 250 exclusief btw, reiskosten van € 0,35 per kilometer en reistijd tegen 50% van het uurtarief. Facturen worden voldaan binnen veertien (14) dagen na factuurdatum. Bij niet-tijdige betaling is Opdrachtgever van rechtswege in verzuim en is hij de wettelijke handelsrente als bedoeld in artikel 6:119a BW verschuldigd, dan wel — indien Opdrachtgever een consument is — de wettelijke rente als bedoeld in artikel 6:119 BW, alsmede de buitengerechtelijke incassokosten conform de wet. Betalingen strekken eerst in mindering op kosten en rente en vervolgens op de hoofdsom.
>
> **Artikel 7 — Succesfee en nawerking**
> Komt een Transactie tot stand met een door {{brand.kort}} geïntroduceerde of bij de opdracht betrokken partij, dan is Opdrachtgever de overeengekomen succesfee verschuldigd, berekend over de Transactiewaarde. Het deel van de succesfee dat betrekking heeft op earn-out- of andere voorwaardelijke componenten wordt opeisbaar naarmate die componenten worden uitbetaald. Dit recht blijft bestaan gedurende vierentwintig (24) maanden na de Introductie of na beëindiging van de overeenkomst (nawerking). Komt na ondertekening van een intentieverklaring, term sheet of vergelijkbaar document geen Transactie tot stand als rechtstreeks gevolg van een aan Opdrachtgever toerekenbare tekortkoming, van het afbreken van onderhandelingen in strijd met de redelijkheid en billijkheid, of van het omzeilen van {{brand.kort}}, dan is Opdrachtgever aan {{brand.kort}} een vergoeding verschuldigd gelijk aan 50% van de overeengekomen of, bij gebreke daarvan, de bij een marktconforme Transactie te verwachten succesfee.
>
> **Artikel 8 — Anti-omzeiling**
> Wordt een Transactie direct of indirect gerealiseerd via een Gelieerde Entiteit, een alternatieve juridische structuur of een economisch gelijkwaardige constructie, dan blijft de volledige succesfee verschuldigd. Daarnaast is Opdrachtgever een direct opeisbare boete van € 25.000 verschuldigd. Deze boete strekt tot vergoeding van schade en wordt in mindering gebracht op een eventueel hogere, door {{brand.kort}} te bewijzen werkelijke schade; het recht die meerdere schade te vorderen blijft bestaan. Dit beding laat de bevoegdheid van de rechter tot matiging onverlet.
>
> **Artikel 9 — Aansprakelijkheid**
> De aansprakelijkheid van {{brand.kort}} voor schade die voortvloeit uit of verband houdt met de opdracht is beperkt tot € 10.000 per opdracht en tot € 10.000 per kalenderjaar. Aansprakelijkheid bestaat uitsluitend voor directe schade; indirecte schade — waaronder gederfde winst, gemiste besparingen, reputatieschade en schade door bedrijfsstagnatie — is uitgesloten. De beperkingen in dit artikel gelden niet bij opzet of bewuste roekeloosheid van het bestuur van {{brand.kort}} of van leidinggevende functionarissen die de opdracht rechtstreeks hebben uitgevoerd. Iedere aanspraak vervalt indien deze niet binnen twaalf (12) maanden na ontdekking, en in elk geval binnen vierentwintig (24) maanden na de schadeveroorzakende gebeurtenis, schriftelijk bij {{brand.kort}} is ingediend.
>
> **Artikel 10 — Geheimhouding**
> Partijen houden alle vertrouwelijke informatie die zij in het kader van de opdracht verkrijgen strikt geheim en gebruiken deze uitsluitend voor het doel waarvoor zij is verstrekt. Deze verplichting blijft na beëindiging van de overeenkomst van kracht.
>
> **Artikel 11 — Consument-opdrachtgever**
> Is Opdrachtgever een natuurlijk persoon die de overeenkomst niet sluit in de uitoefening van een beroep of bedrijf, dan gelden de volgende bepalingen in aangepaste vorm: (a) een vermoeden van Introductie is steeds weerlegbaar; (b) een boete of forfaitaire vergoeding uit deze voorwaarden of uit de overeenkomst kan door Opdrachtgever ter toetsing aan de rechter worden voorgelegd en wordt zo nodig gematigd; (c) de nawerkingstermijn van artikel 7 bedraagt twaalf (12) maanden; (d) de aansprakelijkheidsbeperking van artikel 9 blijft van toepassing, met dien verstande dat zij niet geldt voor schade door dood of letsel. De overige bepalingen blijven van kracht voor zover zij de consument-opdrachtgever niet onredelijk benadelen.
>
> **Artikel 12 — Rechtskeuze en forum**
> Op alle rechtsverhoudingen tussen Opdrachtgever en {{brand.kort}} is uitsluitend Nederlands recht van toepassing. Geschillen worden bij uitsluiting voorgelegd aan de Rechtbank Oost-Brabant. Is Opdrachtgever een consument, dan kan deze binnen één maand nadat {{brand.kort}} zich schriftelijk op deze forumkeuze beroept, kiezen voor beslechting door de volgens de wet bevoegde rechter.

**Wat verandert t.o.v. nu · waarom · risico verminderd**
| Art. | Wijziging | Waarom | Risico ↓ |
|---|---|---|---|
| 2 | "Transactiewaarde" strak geherdefinieerd | Huidige definitie (schuldovername + toekomstige huur/mgmt + max earn-out) = dubbeltelling + onduidelijk kernbeding (art. 6:238 lid 2 BW) | Aanvechtbaarheid fee-grondslag; contra-proferentem-uitleg |
| 3 | "staat niet in voor juistheid/volledigheid informatie derden" toegevoegd | Was alleen in de BEM-templates, niet in de AV | Informatieverantwoordelijkheid cliënt geborgd in de AV zelf |
| 4 (nieuw) | Cliëntacceptatie/integriteit, niet-blokkerend | Wwft-onzekerheid + witwas-/reputatierisico; marktstandaard BOBB | Handhavings-/integriteitsrisico; opschortingsgrond |
| 5 (nieuw) | Belangen en onafhankelijkheid | Art. 7:401/7:417/7:418 BW (twee heren dienen; tegenstrijdig belang) | Vernietiging/loonverlies bij niet-melding; dubbele courtage bij consument |
| 6 | "handelsrente … dan wel wettelijke rente indien consument" | Art. 6:119a geldt alleen bij handelsovereenkomst | Onjuiste renteclaim bij consument |
| 7 | Earn-out-fee opeisbaar bij daadwerkelijke uitbetaling | Fee over niet-ontvangen geld; sluit aan bij marktpraktijk | Onredelijk-bezwarend-risico; incasso-onzekerheid |
| 8 | Boete verrekenbaar i.p.v. cumulatief; "matiging onverlet" | Art. 6:92 lid 2 / 6:94 BW (dwingend) | Volledige matiging van een als "stapeling" ervaren boete |
| 9 | "geheel uitgesloten" → **cap € 10.000/opdracht + € 10.000/jaar**; "het bestuur/leidinggevenden die de opdracht uitvoerden" i.p.v. "de leiding"; verval 12/24 mnd | Volledige uitsluiting sneuvelt eerder dan een cap (art. 6:233a/6:248); "de leiding" ongedefinieerd | All-or-nothing-risico; uitleg-onzekerheid |
| 11 (nieuw) | Consumentenclausule | Afd. 6.5.3 BW (zwarte/grijze lijst) bij privé-verkoper/opvolger | Vernietigbaarheid kernbedingen |
| 12 | Consument-forumkeuze-uitzondering | Art. 6:236 sub n BW / art. 108 Rv | Nietige forumkeuze jegens consument |

**Aandachtspunt (business, geen tekst):** een cap van € 10.000 ligt onder de minimum-succesfee (€ 25.000). Dat is jouw keuze en juridisch beter dan "geheel uitgesloten", maar richting een professionele/PE-opdrachtgever kan een cap ónder de fee als ongebruikelijk overkomen bij de onderhandeling over de opdracht. Zonder beroepsaansprakelijkheidsverzekering draag je het meerdere zelf.

---

## B. Bemiddelingsovereenkomst-sjablonen (`BF_TEMPLATES` in `worker/02-config-constanten.js`)

### B1. Verwijder de ingebedde AV uit `bem_verk`, `bem_opvolging`, `bem_koper` (ISSUE-06)
**Probleem.** `/mna/template/bem_*` levert de template **inclusief** een ingebedde "ALGEMENE VOORWAARDEN"-blok; `/mna/bem/email` plakt daarna via `buildAvTekst()` **nogmaals** een AV eronder. Elke gegenereerde bemiddelingsovereenkomst bevat de AV dus **twee keer**, en die twee kopieën verschillen (o.a. art. 7 bestuurdersvrijwaring; `bem_koper` art. 7 anders geformuleerd).
**Wijziging.** Knip in elk van de drie templates het blok vanaf `ALGEMENE VOORWAARDEN` t/m het einde van de string weg. De template eindigt dan bij het ondertekeningsblok ("…Handtekening: ____________________"). `buildAvTekst()` blijft de enige bron en wordt door `/mna/bem/email` één keer toegevoegd.
**Nacontrole (data).** `SELECT doc_type, begeleider_email, length(tekst) FROM mna_templates WHERE doc_type IN ('bem_verk','bem_opvolging','bem_koper')` — bevat een in marilyn opgeslagen eigen template óók een ingebedde AV, dan die eveneens strippen (of de rij verwijderen zodat de code-standaard weer geldt).
**Risico ↓.** Twee (afwijkende) AV's in één ondertekend contract → onduidelijk welke geldt.

### B2. Bewijsvermoeden introductie: "onweerlegbaar" → "weerlegbaar" (ISSUE-04)
Geldt in `bem_verk` art. 4, `bem_opvolging` art. 4, `bem_koper` art. 2.
**Huidig:** *"Bij gebreke van een tijdige en volledige melding wordt de [Potentiële Koper/opvolger/Target] onweerlegbaar geacht door {{BEGELEIDER_KORT}} te zijn geïntroduceerd."*
**Nieuw:** *"Doet Opdrachtgever die melding niet binnen tien (10) werkdagen na de Introductie, onder overlegging van verifieerbare stukken met datum, dan wordt de [Potentiële Koper/opvolger/Target] vermoed door {{BEGELEIDER_KORT}} te zijn geïntroduceerd. Opdrachtgever kan dit vermoeden weerleggen met verifieerbaar bewijs van eerder eigen contact. Een niet aan Opdrachtgever toe te rekenen overschrijding van de meldtermijn wordt hersteld indien de melding alsnog onverwijld na het wegvallen van de verhindering wordt gedaan."*
(Meldtermijn 5 → 10 werkdagen.)
**Waarom.** Art. 153 Rv; art. 6:236 sub k BW (nietig bij consument); art. 6:248 lid 2. Een onweerlegbaar vermoeden is het meest kwetsbare deel van je omzeilbescherming. **Risico ↓:** afdwingbaarheid van juist dit beschermingsbeding.

### B3. Potestatieve trigger voorfasevergoeding (ISSUE-14)
`bem_opvolging` art. 5, `bem_koper` art. 3.
**Huidig:** *"…naar het oordeel van {{BEGELEIDER_KORT}} sprake is van wederzijdse intentie… De vaststelling… wordt door {{BEGELEIDER_KORT}} na schriftelijk akkoord van Opdrachtgever… bevestigd."*
**Nieuw:** *"De voorfasevergoeding en de volledige bescherming van succesfee, nawerking en anti-omzeiling ontstaan op het moment waarop Opdrachtgever schriftelijk (waaronder per e-mail) bevestigt dat van wederzijdse intentie sprake is. {{BEGELEIDER_KORT}} legt dat moment schriftelijk vast en bevestigt het aan Opdrachtgever. Zonder die bevestiging ontstaat geen voorfasevergoeding."*
**Waarom.** Neemt het eenzijdige ("naar het oordeel van") element weg → voorzienbaar en afdwingbaar (art. 6:23/6:248; 6:237 sub c bij consument).

### B4. `bem_verk` art. 8 / `bem_koper` art. 9 — verwijzing "de hieronder opgenomen Algemene Voorwaarden" → "de bij deze overeenkomst gevoegde Algemene Voorwaarden van {{BEGELEIDER_NAAM}}"
Volgt uit B1 (de AV staat niet meer "hieronder" in de template, maar wordt als bijlage toegevoegd).

---

## C. NDA (`BF_TEMPLATES.nda` art. 8) — boete (ISSUE-09)

**Huidig:**
> Bij overtreding van de geheimhoudingsplicht verbeurt de Ontvangende Partij een direct opeisbare boete van € 25.000 per overtreding, vermeerderd met € 2.500 voor iedere dag dat de overtreding voortduurt.
> Deze boete laat onverlet het recht van de Verstrekkende Partij om daarnaast vergoeding van de daadwerkelijk geleden schade te vorderen, voor zover deze de boete overstijgt.

**Nieuw:**
> Bij overtreding van de geheimhoudingsplicht verbeurt de Ontvangende Partij een direct opeisbare boete van € 25.000 per overtreding, vermeerderd met € 2.500 voor iedere dag dat een voortdurende overtreding na schriftelijke aanmaning voortduurt, tot ten hoogste € 50.000 aan dagboetes per overtreding. De boete strekt tot vergoeding van schade en wordt in mindering gebracht op een eventueel hogere, door de Verstrekkende Partij te bewijzen werkelijke schade; het recht die meerdere schade te vorderen blijft bestaan. Dit beding laat de bevoegdheid van de rechter tot matiging onverlet.

**Waarom.** Art. 6:92 lid 2 BW (boete i.p.v. schade, tenzij anders — nu verrekenbaar i.p.v. stapelend); art. 6:94 BW (matiging is dwingend). Een begrensde, verrekenbare boete wordt minder snel (en minder ver) gematigd. **Risico ↓:** dat een als "stapeling" ervaren boete tot bijna nul wordt teruggebracht.

---

## D. LOI (`BF_TEMPLATES.loi` art. 7) — instructie uit de documenttekst (ISSUE-08)

**Huidig (art. 7, 2e alinea):**
> (Let op: Indien je voor de Verkoper werkt met "Kosten Koper", moet hier staan dat Koper de bemiddelingskosten van {{BEGELEIDER_KORT}} draagt bij closing).

**Nieuw:** de parenthetische instructie **vervalt**. Art. 7 luidt:
> **Artikel 7 – Kosten**
> Tenzij hieronder of schriftelijk anders overeengekomen draagt iedere partij haar eigen kosten in verband met deze LOI, het due diligence-onderzoek en de onderhandelingen. {{KOSTEN_REGELING}}
> Indien de Transactie niet tot stand komt als rechtstreeks gevolg van het zonder gegronde reden afbreken van de onderhandelingen door één van de partijen (waaronder niet begrepen het niet vervullen van de in Artikel 3 genoemde voorwaarden), vergoedt de afbrekende partij aan de andere partij diens aantoonbare, redelijke advieskosten in verband met deze Transactie, tot een maximum van € [Bedrag].

`{{KOSTEN_REGELING}}` vult de begeleider zelf in (bijv. *"De bemiddelingskosten van {{BEGELEIDER_KORT}} komen bij closing voor rekening van Koper."*) of laat het leeg. De uitleg verhuist naar de handleiding (`mna/08-handleiding.js` + `HANDLEIDING-ADVISEUR.md`).
**Waarom.** Documentintegriteit; voorkomt een geschil over de contractinhoud en het onbedoeld tonen van de fee-structuur aan de tegenpartij.

---

## E. Verwerkersovereenkomst (ISSUE-01)

### E1. Direct — `worker/20-signhost-vok.js` `vokTekst` verbatim gelijktrekken
Vervang de volledige `vokTekst`-string (nu 11 artikelen, kop "Versie ${vokVersie} | Juli 2026") door de **exacte tekst van `VOK_TEKST` uit `mna/04-begeleider-dashboard.js` (v1.5, 12 artikelen, "Augustus 2026")**. De `${WORKER_BRAND.*}`-interpolatie blijft; alleen de artikeltekst + "Juli 2026" → "Augustus 2026" wijzigen.
**Waarom.** De "bewijs van acceptatie"-e-mail bevat nu een oudere, andere VOK dan wat de adviseur accepteerde (mist 72u-datalekmelding en het Auditrecht). AVG art. 28 lid 9 + bewijspositie.

### E2. Structureel (aparte wijziging, met eigen test/deploy)
1. Eén canonieke VOK-bron in de backend; de frontend haalt tekst + versie op (zoals nu al voor de adviseur-GV via `/gebruiker/voorwaarden`); de bevestigingsmail gebruikt exact diezelfde string.
2. Sla bij acceptatie de **volledige VOK-tekst** (of een SHA-256-hash + de tekst in een `vok_versies`-tabel) op in `mna_vok`, zodat per acceptatie herleidbaar is wat is overeengekomen.

---

## F. `voorwaarden.html`

### F1. Art. 2 — verwijzing naar "Algemene Voorwaarden Bisschops Financing B.V." (ISSUE-02)
**Huidig:** *"…tenzij Bisschops Financing B.V. zelf als uw adviseur optreedt; in dat geval gelden daarnaast de Algemene Voorwaarden van Bisschops Financing B.V. voor die dienstverlening."*
**Nieuw:** *"…tenzij Bisschops Financing B.V. zelf als uw adviseur optreedt; in dat geval gelden voor die dienstverlening de Algemene Voorwaarden van Bisschops Financing B.V. voor M&A-advies en bemiddeling, die als bijlage bij de opdracht- of bemiddelingsovereenkomst worden verstrekt en aanvaard."*
**Waarom.** Niet langer suggereren dat er een apart raadpleegbaar document is; de AV wordt kenbaar op het moment dat zij van toepassing wordt (bij de opdracht) — art. 6:233 sub b / 6:234 BW. Geen aparte publicatie (keuze Marcel).

### F2. Art. 1 — belofte "aparte, kortere voorwaarden op het instrument" (ISSUE-18)
**Huidig:** *"Voor de bedrijfsscan … gelden aparte, kortere voorwaarden die op dat instrument zelf staan vermeld."*
**Nieuw:** *"Voor de bedrijfsscan … gelden geen afzonderlijke gebruiksvoorwaarden; op het instrument zelf staan een disclaimer over de aard van het rapport en een verwijzing naar deze Gebruiksvoorwaarden en de Privacyverklaring, die daarop van overeenkomstige toepassing zijn."*
**Waarom.** De belofte suggereert meer dan er feitelijk staat.

### F3. Art. 6 — 24-uursmeldplicht (ISSUE-15) — zelfde herformulering als in de adviseur-GV (zie H), aangepast aan "u"/verkoper.

---

## G. `privacy.html` (ISSUE-11) — Google Fonts

**Huidig (§4):** *"Geen gebruik van cookies of tracking pixels."*
**Nieuw (§4):** *"Wij plaatsen geen cookies en gebruiken geen trackers voor analyse, advertenties of profilering. Voor de weergave van lettertypen maakt uw browser verbinding met Google (Google Fonts); daarbij wordt uw IP-adres aan Google doorgegeven. Zie de tabel met sub-verwerkers en doorgifte hieronder."*
**Toevoegen aan de sub-verwerker-/doorgiftetabel (§4/§5):** *"Google LLC — laden van weblettertypen (Google Fonts); ontvangt het IP-adres van de bezoeker; Verenigde Staten; grondslag: gerechtvaardigd belang (consistente weergave), Standard Contractual Clauses."*
**Aanbevolen vervolg (technisch, aparte taak):** de Google Fonts self-hosten (SIL Open Font License staat dit toe). Dan vervalt de doorgifte en kan §4 terug naar de kortere formulering. **Versie → 1.9.**

---

## H. Adviseur-GV (`GEBRUIKSVOORWAARDEN_TEKST` in `cloudflare-worker.js`)

### H1. Art. 6 — samenloop + bodem aansprakelijkheid (ISSUE-10) — **OPEN: jouw keuze**
Huidig: cap = 10× de per traject in rekening gebrachte platformvergoeding. Bij een gratis proefaccount = € 0.
**Voorstel A (aanbevolen):** *"…beperkt tot tienmaal de voor dat traject in rekening gebrachte platformvergoeding, met een minimum van € 10.000 en een maximum van € [X] per traject. Is {{kort}} ter zake van dezelfde gebeurtenis met betrekking tot één traject aansprakelijk jegens meerdere partijen, dan geldt dit maximum als één gezamenlijk maximum voor al die aanspraken tezamen."*
**Voorstel B:** alleen de samenloopzin toevoegen, het € 0-minimum bij gratis proef laten staan.
→ **Voorstel A** verhoogt jouw ondergrens-risico van € 0 naar € 10.000, maar maakt het beding beter houdbaar (een € 0-cap is feitelijk een absolute uitsluiting, zie ISSUE-05). **Voorstel B** houdt je exposure laag maar laat het zwakke punt staan. Laat weten: A of B, en bij A het bedrag € [X]. **Versie → GV 2.0.**

### H2. Art. 6 — 24-uursmeldplicht (ISSUE-15)
**Huidig (kern):** *"…meldt hij dit onverwijld en in ieder geval binnen vierentwintig (24) uur na ontdekking … en stelt hij {{kort}} daarbij eerst in de gelegenheid passende maatregelen te nemen … voordat hij zelf herstelmaatregelen treft of het incident extern meldt of openbaar maakt … Voor zover schade is ontstaan of vergroot doordat deze meldings- of medewerkingsverplichting niet is nagekomen, is die schade voor rekening van de adviseur…"*
**Nieuw:** *"De adviseur meldt een ontdekte kwetsbaarheid, een (dreigend) beveiligingsincident of een datalek onverwijld aan {{kort}} en werkt redelijkerwijs mee aan het beperken en verhelpen daarvan. Deze bepaling laat de eigen wettelijke meldplichten van de adviseur (waaronder jegens de Autoriteit Persoonsgegevens en betrokkenen) onverlet; de adviseur stemt de timing en inhoud van een externe melding waar mogelijk vooraf met {{kort}} af. Voor zover schade is ontstaan of vergroot doordat de adviseur deze meld- of medewerkingsplicht niet is nagekomen, wordt daarmee bij de vaststelling van de schadevergoeding rekening gehouden overeenkomstig artikel 6:101 BW."*
**Waarom.** Verwijdert de suggestie dat wettelijke meldingen worden opgeschort ("eerst {{kort}}, dan pas extern") en de verkapte vrijtekening ("voor eigen rekening"); art. 6:101 BW regelt eigen schuld al genuanceerder.

---

## I. `lead-aandragen.html` (ISSUE-20) — voorwaarden voor het aandragen

**Toevoegen** onder het formulier (boven of naast de bestaande privacyzin):
> **Voorwaarden voor het aandragen.** Het aandragen van een onderneming geeft geen recht op een vergoeding en geen recht op een opdracht of traject. Een eventuele aanbrengvergoeding wordt vooraf en uitsluitend schriftelijk apart overeengekomen. Wordt dezelfde onderneming door meer partijen aangedragen, dan geldt de eerst door Bisschops Financing B.V. gedocumenteerde aandracht. U staat ervoor in dat u gerechtigd bent de naam van de aangedragen onderneming met Bisschops Financing B.V. te delen. Bisschops Financing B.V. behandelt de aangedragen naam vertrouwelijk.

---

## J. `platform/beveiliging-en-gegevens.html` + `worker/24` pillar-tekst (ISSUE-19)

**Waar nu staat** dat opslag plaatsvindt "in de EU (Frankfurt, ISO 27001 / SOC 2)" — herformuleren zodat de certificering aan de hostingpartij wordt toegeschreven:
> *"De gegevens staan in de EU (Frankfurt), bij onze hostingpartij Cloudflare, die ISO 27001 en SOC 2 Type II gecertificeerd is."*
**Waarom.** ISO 27001 / SOC 2 zijn Cloudflare's certificeringen, niet die van Bisschops Financing; art. 6:194 BW (misleidende mededeling). "Technisch afgedwongen scheiding tussen adviseurs" blijft staan (aantoonbaar via de cross-path-audits).

---

## K. Niet in deze ronde (met reden)

| Bevinding | Waarom uitgesteld |
|---|---|
| ISSUE-21 (matching-koper aanvaarding) | Vereist eerst lezen van `worker/19-info-fases.js` (koperregistratieflow) — FASE 2 vervolg |
| ISSUE-22 (meekijker inzage vóór inlog) | Vereist lezen `viewer.html`-JS + `worker/21-meekijker.js` — FASE 2 vervolg |
| ISSUE-25 (`bgDoc()` placeholder-check) | Technische wijziging aan de generator; eigen test |
| ISSUE-11 self-host fonts | Technische wijziging (assets); los in te plannen |
| ISSUE-01 E2 (VOK single source + tekst opslaan) | Backend-refactor + DB-kolom; eigen test/deploy |
| ISSUE-06 (`bgDoc()` dynamische AV-bijlage) | Deels opgelost via B1; volledige consolidatie is een aparte refactor |
| Wwft-kwalificatie (JUR-1) | **JURIDISCHE ONZEKERHEID** — eenmalige specialistische toetsing; de AV-bepaling (art. 4) + beslisboom staan er los van klaar |

---

## Toepassingsvolgorde na akkoord

1. Backend (`worker/02-config-constanten.js`, `cloudflare-worker.js`, `worker/20-signhost-vok.js`): A + B + C + D + E1 + H. `AV_VERSIE`→1.2, `GV_VERSIE`→2.0.
2. Frontend (`voorwaarden.html`, `privacy.html`, `lead-aandragen.html`, `platform/beveiliging-en-gegevens.html`): F + G + I + J. `privacy.html`→1.9; `voorwaarden.html`→2.3.
3. `mna_templates` datacheck (B1-nacontrole).
4. `node --check` op alle gewijzigde JS + `<script>`-extractie voor de HTML; `node tests/audit-consistentie.mjs` + (backend) `node tests/audit-backend.mjs`; `scripts/check-contract-output.mjs` op een vers gegenereerde NDA/BEM.
5. Staging-deploy backend → genereer een NDA + een BEM op een testtraject, controleer dat de AV **één keer** meekomt en de nieuwe art. 9-cap erin staat → productie-deploy.
6. `LEGAL_ISSUES.md` / `LEGAL_REVIEW.md` statussen bijwerken; git-tag.
