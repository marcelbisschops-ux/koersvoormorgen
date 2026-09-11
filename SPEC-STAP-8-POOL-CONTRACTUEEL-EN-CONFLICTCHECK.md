# Voorstel — poolspecialist: contract, GV/VOK-bepaling + disclaimer, volledige conflict-check

> **Status: VOORSTEL, niet gebouwd/vastgesteld.** Onderdelen 1 en 2 zijn juridische tekst —
> `REQUIRES LEGAL VALIDATION` (werkregel 11d: nooit automatisch, altijd Marcels/de jurist' akkoord
> eerst). Onderdeel 3 is technisch; de regels hieronder zijn een bouwbaar voorstel, geen vastgesteld
> ontwerp — na akkoord bouw ik 'm in `worker/32-pool.js`.
>
> **Datum:** 2026-09-11 · **Hoort bij:** `SPEC-STAP-8-SPECIALISTENPOOL.md`, `MASTER-SPEC-TRANSACTION-OS.md` FASE E.

---

## 1. Poolspecialist-overeenkomst — bouwstenen

Contract tussen Bisschops Financing B.V. en elke specialist die zich in de pool laat opnemen.
Onderstaand is een **bouwstenenlijst**, geen concepttekst — de jurist stelt de daadwerkelijke
artikelen op; dit is input daarvoor, gebaseerd op wat het platform technisch afdwingt en dus
contractueel moet dekken.

| # | Onderwerp | Wat het technisch al afdwingt (`worker/32-pool.js`) | Wat het contract moet regelen |
|---|---|---|---|
| 1 | **Hoedanigheid & inschrijving** | Marcel voert `hoedanigheid` + `inschrijvingsnummer` handmatig in bij toelating (marilyn → Pool); het platform verifieert dit niet automatisch. | De specialist **garandeert** dat de opgegeven hoedanigheid/inschrijving klopt en actueel blijft (NOvA/RB/RA/AA/NIRV e.d.), en meldt wijzigingen/schorsing/doorhaling **onverwijld**. Bisschops Financing mag bij twijfel de inschrijving zelf verifiëren (openbaar register) en schorst bij een treffer. |
| 2 | **Scope-gebonden toegang** | Toegang is per opdracht, per token, uitsluitend tot de gescopte tos-documenten; verloopt op deadline+coulance; nergens ziet de specialist `tussen_code` of andere trajecten. | De specialist **erkent** dat hij alleen toegang heeft/mag gebruiken binnen de scope van een geaccepteerde opdracht, en onderneemt geen pogingen die grens te omzeilen. |
| 3 | **Geheimhouding** | — (dit legt het systeem niet af; puur contractueel). | Geheimhoudingsbeding over alle dossierinformatie, ook na afloop van de opdracht/relatie; dezelfde orde van grootte als de bestaande NDA-boetebepaling (zie `nda_boetebeding`-component) is een redelijk ankerpunt. |
| 4 | **Eigen beroepsaansprakelijkheid** | Het platform registreert geen verzekeringsbewijs. | Specialist verklaart een lopende beroepsaansprakelijkheidsverzekering te hebben, passend bij de hoedanigheid; overlegt bewijs op verzoek. **Bisschops Financing aanvaardt geen aansprakelijkheid voor de inhoud van een specialistenreview** (zie disclaimer, onderdeel 2). |
| 5 | **Geen cliëntbenadering buiten de opdracht** | Niet technisch afgedwongen (de specialist ziet de ondernemingsnaam in het dossier). | Specialist mag de begeleider/opdrachtgever niet buiten het platform om benaderen voor eigen acquisitie, gedurende de opdracht en een redelijke periode daarna (bijv. 12 maanden) — vergelijkbaar met een non-circumvention-clausule. |
| 6 | **Honorarium & facturatie** | Bedrag ligt vast op `pool_specialisten.tarief_bedrag` per opdracht (`geoffreerd_bedrag`, vastgepind bij aanmaken — latere tariefwijziging raakt lopende opdrachten niet); Bisschops Financing int bij de adviseur, betaalt de specialist uit. | Betaaltermijn aan de specialist, wat er gebeurt bij een afgewezen/verlopen opdracht (geen honorarium), geschillen over kwaliteit vóór uitbetaling. |
| 7 | **Royement** | `pool-royeer` in marilyn zet `status='geroyeerd'`; lopende opdrachten blijven staan, nieuwe kunnen niet meer worden aangemaakt (specialist verdwijnt uit de bladerlijst). | Gronden voor eenzijdig royement door Bisschops Financing (verlies hoedanigheid, klacht, inactiviteit, contractbreuk) + opzegtermijn voor de specialist zelf. |
| 8 | **Rol Bisschops Financing** | Het platform faciliteert de match en de betaling; het geeft zelf geen inhoudelijk oordeel. | Expliciet vastleggen dat Bisschops Financing **bemiddelt**, niet **adviseert** — het inhoudelijke oordeel is en blijft van de specialist (dit is dezelfde lijn als "regie, geen autoriteit" uit de master-spec, nu contractueel bevestigd). |

**Voorstel proces:** dit bouwstenenlijstje naar de jurist samen met `SPEC-STAP-8-SPECIALISTENPOOL.md`
en de tabel in onderdeel 2 hieronder (het datamodel maakt concreet wát er precies wordt vastgelegd
en getoond). De jurist stelt het contract op; ik verwerk het niet in code (er is ook niets aan de
overeenkomst zelf dat het platform hoeft af te dwingen buiten wat hierboven al staat).

---

## 2. GV/VOK-bepaling + disclaimer op de gereviewde output — voorstel

### 2a. Nieuwe bepaling in de Gebruiksvoorwaarden (adviseur, `GEBRUIKSVOORWAARDEN_TEKST`)

**Voorstel-inhoud** (geen definitieve formulering — ter verificatie):

> Koers voor Morgen biedt de adviseur de mogelijkheid om voor een onderdeel van een gegenereerd
> document een beoordeling te laten uitvoeren door een externe, door Bisschops Financing
> geselecteerde specialist ("poolspecialist"). Schakelt de adviseur een poolspecialist in, dan komt
> de honorarium- en bemiddelingsvergoeding overeen met het op dat moment geldende
> tarievenoverzicht en wordt deze als afzonderlijke post op het traject in rekening gebracht. De
> inhoudelijke beoordeling van de poolspecialist is diens eigen professionele verantwoordelijkheid;
> Bisschops Financing beoordeelt deze niet inhoudelijk en is daarvoor niet aansprakelijk. De
> adviseur stemt in met het inschakelen van een poolspecialist op eigen verzoek en met het delen
> van de daarvoor benodigde, tot de scope van de opdracht beperkte trajectgegevens met die
> specialist.

**Openstaande vraag aan de jurist:** is een poolspecialist voor de AVG een **sub-verwerker** van
Bisschops Financing (net als Anthropic/Resend/Signhost, al in Artikel 6 VOK), of een **zelfstandig
verwerkingsverantwoordelijke** voor de eigen beroepsuitoefening (zoals een externe accountant dat
doorgaans is)? Dit bepaalt of er een verwerkersovereenkomst tussen Bisschops Financing en de
specialist nodig is, en of de bestaande VOK Artikel 6-lijst (sub-verwerkers) moet worden aangevuld
met "poolspecialisten (op aanvraag van de adviseur, scope-beperkt)".

### 2b. Disclaimer op de gereviewde output

Deze tekst hoort **specifiek bij de review van een poolspecialist**, los van/aanvullend op de
bestaande platformbrede `RELIANCE_VOETTEKST`. Voorstel — verschijnt in `specialist.html` bij het
aftekenen (al technisch aanwezig als toelichtende tekst, nog niet als vaste, aangehechte
voettekst op het document zelf):

> "Dit onderdeel is beoordeeld door een [hoedanigheid] uit de Koers voor Morgen-pool. Deze
> beoordeling is de professionele verantwoordelijkheid van die specialist, niet van Koers voor
> Morgen of Bisschops Financing."

**Voorstel implementatie (technisch, na tekst-akkoord):** deze regel als vast slotblok aanhechten
aan elk document waarvan één of meer onderdelen door een poolspecialist zijn afgetekend — zelfde
patroon als `RELIANCE_VOETTEKST` in `printDoc()`/`maakPDF()`: alleen tonen als
`review_kind='POOL_SPECIALIST'` voorkomt in de reviews van dat document. Kleine, geïsoleerde
wijziging zodra de tekst is vastgesteld.

---

## 3. Volledige conflict-check (mini-ADR S-02) — technisch voorstel

**Huidige staat:** `worker/32-pool.js` (`POST /mna/pool/opdracht`) doet één signaal: kantoornaam
specialist == kantoornaam doelonderneming. Bewust minimaal, om niet ongefundeerd te blokkeren.

**Probleem dat een volledige check moet dekken:** een specialist mag niet een partij, adviseur van
een partij, of anderszins belanghebbende bij dezelfde transactie zijn — dat tast de
onafhankelijkheid van de aftekening aan.

### Voorgestelde regels (allemaal **signalerend, nooit blokkerend** — de begeleider beslist)

| # | Regel | Bron | Sterkte |
|---|---|---|---|
| C1 | Specialist-e-maildomein == domein van `contact_email`/`koper_email`/`begeleider_email` van het traject | exacte match op domeindeel na `@` | hard signaal |
| C2 | Specialist-kantoornaam fuzzy gelijk aan `kantoor_naam` of `koper_naam` (al gebouwd, exact-match — voorstel: verruimen naar een eenvoudige genormaliseerde vergelijking: lowercase, leestekens/rechtsvormsuffixen als "B.V."/"N.V." weg) | tekstvergelijking | hard signaal |
| C3 | Specialist heeft al **een eerdere, afgeronde opdracht op hetzelfde traject** voor een ándere partij-rol (bijv. eerder voor de koper, nu gevraagd namens de verkoper) — nu geen rolonderscheid in het datamodel, dus dit signaleert op traject-niveau: "deze specialist heeft dit traject al eerder gereviewd" | `pool_opdrachten` op `traject_id` + `specialist_id` | informatief (kan legitiem zijn — dezelfde specialist mag prima twee keer voor dezelfde kant reviewen) |
| C4 | Specialist-inschrijvingsnummer komt voor in `mna_partners`/`mna_entiteiten`-vrije-tekstvelden van dit traject (bijv. genoemd als betrokken adviseur van een partij) | eenvoudige substring-check | hard signaal |

**Wat dit voorstel bewust niet doet:** geen automatische blokkade (dat zou zelf weer een
gok/aanname zijn over wie wel/niet onafhankelijk is — GOUDEN STANDAARD werkregel 8), geen
KvK-koppeling of extern register (buiten scope, geen bestaande integratie), geen
belangenverstrengeling via LinkedIn/netwerkdata (privacygevoelig, ongefundeerd).

**Voorstel UI:** bij `POST /mna/pool/opdracht` komen alle treffers terug in `conflict_signalen`
(al aanwezig in de respons — nu alleen C2 exact-match); de begeleider ziet ze in het
aanvraagpaneel vóór bevestigen (al gebouwd) en moet — bij een hard signaal (C1/C2/C4) — een extra
bevestiging geven ("Ik heb dit signaal beoordeeld en wil toch doorgaan") vóór de opdracht wordt
aangemaakt. C3 wordt getoond maar vereist geen extra bevestiging.

**Implementatie-omvang:** klein, binnen het bestaande `POST /mna/pool/opdracht`-endpoint — geen
nieuwe tabellen, geen schema-wijziging. Ik kan dit direct bouwen zodra je akkoord geeft op de
regels hierboven (met name of de "extra bevestiging bij hard signaal"-stap gewenst is, of dat
tonen zonder blokkade voldoende is).

---

## Openstaande vragen aan Marcel (en, voor 1/2a, de jurist)

1. **Onderdeel 1:** akkoord om de bouwstenenlijst zo naar de jurist te sturen?
2. **Onderdeel 2a:** akkoord met de voorgestelde GV-tekst als uitgangspunt voor de jurist? En:
   sub-verwerker of zelfstandig verwerkingsverantwoordelijke — heb je hier al een voorkeur, of
   moet dit puur bij de jurist liggen?
3. **Onderdeel 2b:** akkoord met de disclaimertekst? Zo ja, bouw ik 'm als vast slotblok in dezelfde
   route als de bestaande reliance-voettekst.
4. **Onderdeel 3:** akkoord met de vier regels (C1-C4)? En: extra bevestigingsstap bij een hard
   signaal (C1/C2/C4), of volstaat tonen zonder blokkade?
