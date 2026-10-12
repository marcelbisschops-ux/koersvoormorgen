# Expliciete groepsdocumenten: UI (productpunt 6)

Status 10 okt 2026: **backend en UI van productpunt 6 staan in productie.** Backendrelease
`bf53a54b003c6cdac3cbbe41048296563ea619a8` (Worker-versie `51d97c77-71ab-4904-bba5-05a64eb50084`) en
frontendrelease `615603a34030410277532aaabc1e09d74f4790e9` (Pages-deployment
`042e9351-60d7-44cb-a1f9-e1160c7f5215`) zijn uitgerold; zie "Release" onderaan. Live acceptatie met echte
klantdocumenten en de kwaliteit van live AI-extractie blijven **OPEN**.

**Productpunt 7 (12 okt 2026, OPEN):** de UI voor `GENERAL` (algemeen dataroomdocument) is gebouwd en
synthetisch getest tegen de ontwikkelbackend `c976e778` (backend `docs/group-documents.md`, sectie
"Algemene documenten (GENERAL)"). Die backend is **niet** uitgerold; productie draait alleen productpunt 6.
Deze UI hoort pas samen met of na die backend uitgerold te worden. Staging- en live-acceptatie van
productpunt 7 staan **OPEN**; zie "Algemeen dataroomdocument (productpunt 7)" en "Beperkingen en OPEN".

Historie: de UI is eerst gebouwd en synthetisch getest tegen backendcommit `fd2bf7d` (backend
`docs/group-documents.md`), toen de backend READY maar nog niet uitgerold was.

Code: `mna/12-documentclassificatie.js` (gewone scriptmodule, in `mna.html` geladen na
`mna/01-config-sectorprofielen.js` en vóór `mna/02-state-opslag-documenten.js`) en een kleine integratie in
`mna/02` (`leesUploadKeuzes`, `uploadDocumentenSequentieel`, `uploadDocument`, `centraalUploadFiles`,
`loadDocsForFase`, `renderDocumentSectie`, `toonVersieGeschiedenis`). Er is geen nieuwe API, geen nieuw
schema, geen dependency en geen AI-aanroep. mna/12 doet zelf geen netwerkaanroep, leest S niet en voert bij
het laden niets uit; mna/02 roept de helpers alleen aan als ze bestaan.

## Backendcontract (alleen gebruikt, niet gewijzigd)

Vier optionele parameters op `POST /mna/document/upload`, alle vier samen of geen:

| Parameter | Waarden in deze UI |
|---|---|
| `doc_scope` | `GROUP` \| `ENTITY` |
| `doc_statement` | `P&L` \| `BALANCE_SHEET` \| `CASH_FLOW` |
| `doc_periode` | `FY<jjjj>` (1990–2100) of `<jjjj-mm-dd>/<jjjj-mm-dd>` (bestaande datums, begin ≤ eind, maximaal één jaar) |
| `doc_datatype` | `ACTUAL` \| `YTD_ACTUAL` \| `BUDGET` \| `FORECAST` |

De UI stuurt ze uitsluitend als queryparameter (nooit ook als formulierveld, dus geen dubbelzinnige
query+formwaarden), in vaste volgorde en met `encodeURIComponent` (`P&L` → `P%26L`). `entiteit_id` blijft
de bestaande queryparameter uit de bestaande entiteitkeuze.

Productpunt 7: bij `doc_scope=GENERAL` stuurt de UI **alleen** `&doc_scope=GENERAL`. `doc_statement`,
`doc_periode`, `doc_datatype` en `entiteit_id` gaan dan niet mee (ook niet leeg, `undefined` of `null`).
De backend weigert anders met `GENERAL_MET_METADATA` of `GENERAL_MET_ENTITEIT`.

## Bediening

1. De **verkoper** opent fase **Financieel**. Bij "Document toevoegen" staat, standaard uit, het vinkje
   **Documentclassificatie opgeven (optioneel, geldt voor alle bestanden die u hierna selecteert of
   vervangt)**. Zonder vinkje gaat de upload exact zoals vroeger: dezelfde URL, geen `doc_*`-parameters.
2. Met het vinkje verschijnen de keuzes, allemaal leeg (geen standaardwaarde, ook geen `ACTUAL`):
   - **Groep of entiteit**: *Groepsdocument (de groep als geheel)*. Zet dan de bestaande entiteitkeuze op
     "Groep/hoofdentiteit". Of *Document van één entiteit*. Kies dan de entiteit in de entiteitkeuze.
   - **Overzicht**: winst-en-verliesrekening, balans of kasstroomoverzicht.
   - **Periode**: *Boekjaar* (vier cijfers, 1990–2100) of *Datumbereik* (begin- en einddatum, maximaal één jaar).
   - **Cijfersoort**: realisatie, realisatie tot nu toe dit jaar (year-to-date), begroting of prognose.
3. De uitleg in gewoon Nederlands staat erbij. Een groepsdocument is een eigen indeling van de gebruiker en
   geen officiële consolidatie. Alleen realisatie over een volledig jaar geldt als jaarrealisatie. Een
   prognose, begroting, year-to-date of deelperiode wordt niet als jaarcijfers overgenomen en kan op
   "Controle nodig" blijven staan.
4. De keuze geldt voor **alle** bestanden van die selectie. "Alleen als bewijsstuk" en "Extra controle"
   werken ongewijzigd en gaan gewoon mee.
5. **Vervangen** gebruikt alleen wat op dat moment in het keuzeblok staat. De classificatie van de vorige
   versie wordt nooit hergebruikt of gekopieerd. Staat het vinkje uit, dan krijgt de nieuwe versie geen
   classificatie.

## Algemeen dataroomdocument (productpunt 7)

1. **Financieel**: zet het vinkje aan en kies bij "Groep, entiteit of algemeen?" de optie **Algemeen
   dataroomdocument (geen entiteit, geen financiële gegevens)**. Laat overzicht, periode en cijfersoort
   leeg en zet de entiteitkeuze op "Groep/hoofdentiteit". Er hoeft geen boekjaar ingevuld te worden.
2. **Elke andere fase** (bijvoorbeeld Juridisch): de verkoper ziet hetzelfde vinkje. Het keuzeblok bevat
   daar alleen "Soort document?" met de enige optie **Algemeen dataroomdocument**. Overzicht, periode en
   cijfersoort staan daar niet in de HTML. Groeps- en entiteitsdocumenten blijven alleen in Financieel
   beschikbaar; een `GROUP`/`ENTITY`-waarde buiten Financieel (bijvoorbeeld via een gemanipuleerde DOM)
   wordt vóór verzenden geweigerd.
3. De financiële velden blijven in Financieel zichtbaar en worden **niet** stil leeggemaakt of weggegooid.
   Staat er bij "Algemeen" nog een overzicht, periode (soort, boekjaar of datum), cijfersoort of entiteit,
   dan wordt de hele selectie vóór elk verzoek geweigerd. De melding noemt het concrete veld, bijvoorbeeld
   "een algemeen dataroomdocument heeft geen overzicht: maak dat veld leeg …" of "… hoort niet bij één
   entiteit: zet de entiteitkeuze op "Groep/hoofdentiteit"". Het keuzeblok blijft ingevuld staan.
4. De keuze geldt voor de hele reeks en voor **Vervangen** (momentopname vóór de hertekening). "Alleen als
   bewijsstuk" en "Extra controle" worden niet aangepast en gaan mee zoals gekozen. De server slaat een
   algemeen document op zonder AI-analyse, dus "Extra controle" heeft dan geen effect.
5. Het origineel wordt opgeslagen (`STORED`, "Opgeslagen, niet geanalyseerd"). Er volgt geen veldinvulling,
   geen financiële autoapply, geen entiteitgok en geen koppelverzoek. Dat geldt ook als een server
   onverwacht `PROCESSED` of velden terugstuurt.
6. Lijst en "Versies" tonen **Eigen classificatie (herkomst: gebruiker, niet geverifieerd): Algemeen
   dataroomdocument** met "Algemeen document: geen entiteit, overzicht, periode of cijfersoort. Opgeslagen
   zonder analyse en niet als financiële bron gebruikt." Er staat nooit (groeps)jaarrealisatie, "Te
   beoordelen", koppel-dropdown of "Groepsniveau" bij. Het ontbreken van financiële metadata leidt ook
   niet tot "Controle nodig".
7. Saneren van `GENERAL`: alleen geldig met exact `statement`/`periode`/`datatype`/`entiteit_id` `null`, een rij
   zonder entiteit, `herkomst: 'GEBRUIKER'`, `officiele_consolidatie: false` en geen
   `realisatie_toepasbaar: true`. Anders wordt hij fail-closed getoond als "niet geclassificeerd
   (classificatie onbekend)". Een onbekende scope (ook `general` in kleine letters) blijft onbekend.

## Controles vóór verzenden

`leesUploadKeuzes` legt entiteit, extra controle, bewijsstuk én classificatie in één momentopname vast,
vóór de `renderApp` die de uploadzone leeg hertekent. Dat geldt voor de hele reeks en voor de directe
upload of vervangupload. Zonder aangezet keuzeblok is het resultaat exact het oude object (drie sleutels).

Een onvolledige of tegenstrijdige keuze wordt vóór elk verzoek geweigerd. Er volgt dan een concrete
foutmelding en geen wachtrij-plek, geen tijdelijke rij en geen hertekening, zodat het keuzeblok ingevuld
blijft om te corrigeren. Bij een reeks worden alle bestanden "niet aangeboden". Weigeringen:

- scope, overzicht, periode of cijfersoort ontbreekt (geen standaard cijfersoort);
- onbekende waarde (exact en hoofdlettergevoelig);
- boekjaar niet vier cijfers of buiten 1990–2100;
- datumbereik onvolledig, onbestaande datum, begin na eind of langer dan één jaar;
- ambigue periode: boekjaar én datums ingevuld;
- groepsdocument met een gekozen entiteit;
- entiteitsdocument zonder entiteit, met een entiteit die niet (meer) bij het huidige traject hoort, of in
  een traject zonder geregistreerde entiteiten.

De server controleert alles opnieuw. Een serverweigering (400, zonder `doc_id`) verschijnt als de concrete
serverfout, zonder rij en zonder succesmelding.

Niets wordt afgeleid: niet uit de bestandsnaam, niet uit een lege entiteit en niet uit een eerdere versie.
De centrale upload (fase op basis van de bestandsnaam) stuurt nooit een classificatie mee. Na een
geclassificeerde upload volgt geen automatische entiteitkoppeling op een door de AI herkende naam.

## Weergave

Per document in de lijst (en per versie in "Versies") staat één regel. Alleen het gesaneerde serverveld
`documentclassificatie` wordt bewaard en getoond (uit de uploadrespons, `GET /mna/document/lijst` en
`GET /mna/document/versies`):

- **Eigen classificatie** (herkomst: gebruiker, niet geverifieerd): groep of entiteitnaam, overzicht,
  periode (boekjaar, of datumbereik met "volledig jaar"/"deelperiode") en cijfersoort;
- de betekenis: "Volledige jaarrealisatie volgens uw eigen classificatie (niet geverifieerd)" alleen bij
  realisatie over een volledig jaar; anders "Geen jaarrealisatie …", en bij serverstatus
  `GEEN_JAARREALISATIE` "Te beoordelen. Geen jaarrealisatie …". Dit naast het bestaande statuslabel
  "Controle nodig";
- bij een groepsdocument: "geen officiële consolidatie";
- ontbreekt de classificatie (legacy) of is die ongeldig, dan staat er in Financieel en in Versies
  **"Niet geclassificeerd (classificatie onbekend)"**.

Saneren (`dclSaneer`): alleen bekende enums, een opnieuw gelezen periode, `herkomst: 'GEBRUIKER'`,
`officiele_consolidatie: false` en een entiteit die exact bij de rij past. Een record dat officiële
consolidatie claimt, een andere herkomst, een `GENERAL` met metadata of entiteit, of een afwijkende entiteit telt als onbekend. Of het een
jaarrealisatie is, wordt lokaal herberekend en niet van de server overgenomen. Het ruwe record
`_documentclassificatie`, de `binding`, document-id's, hashes en toegangscodes worden nooit getoond. Het ruwe
record wordt ook uit de lokale velden verwijderd. De entiteit verschijnt als naam en nooit als id. Elke
serverwaarde gaat door escaping.

Bij een geclassificeerd document vervallen de koppel-dropdown en de badge "Groepsniveau". De classificatie
is aan de entiteit van de rij gebonden: koppelen of ontkoppelen zou haar ongeldig maken.

Bevestigt de server een gevraagde classificatie niet (bijvoorbeeld een backend zonder dit contract), dan
toont de UI geen eigen classificatie maar "niet geclassificeerd", met een waarschuwing. Bij een prognose,
begroting, year-to-date of deelperiode worden dan ook geen velden overgenomen.

## Rollen en grenzen

- Alleen de **verkoper** krijgt het keuzeblok, alleen in een niet-vergrendeld traject. `GROUP`/`ENTITY`
  alleen in fase Financieel; in andere fases alleen `GENERAL` (productpunt 7). Zelfs een los ingevuld
  keuzeblok in de DOM levert voor een andere rol geen classificatie op.
- De **begeleider** ziet de classificatie alleen-lezen. De financiële upload blijft voor de begeleider dicht (ongewijzigd).
- **Koper** en **meekijker** krijgen geen classificatie-UI en er gaan geen nieuwe verzoeken uit (de koper
  ziet de documentsectie niet en laadt de lijst niet).
- Een vergrendeld traject geeft geen upload en geen classificatiemutatie.
- Bij een trajectwissel wordt niets uit de vorige sessie geschreven of meegenomen: het keuzeblok wordt
  leeg opnieuw getekend en de bestaande traject-binding van de reeks stopt verdere verzoeken.
- Bestaande uploadstatus, opruimen van tijdelijke rijen, batchstop/annuleren, "geen fictief succes",
  privacy en tenant-/broncontrole zijn ongewijzigd.

## Bewijs

`tests/group-documents-ui.mjs` (check 30 in `tests/audit-consistentie.mjs`) draait de echte mna/12 en de
echte mna/02-uploadintegratie in node:vm. Antwoorden zijn synthetisch, in de vorm van het gecommitte
backendcontract. Er is geen netwerk, geen browser en geen AI. De bestaande upload-, bewijsstuk-,
broncontrole-, juridische en groepsbeeldchecks (24, 25, 27, 28, 29) blijven ongewijzigd.

Productpunt 7 (sectie 15 van de test) dekt de volgende gevallen:
- `GENERAL`-verzoeken met alleen `doc_scope`, zonder overzicht, periode, cijfersoort of entiteit. Dat geldt
  ook voor een reeks en voor Vervangen na de hertekening, in Financieel en in Juridisch.
- Extra controle en bewijsstuk blijven behouden.
- Er is geen autoapply en geen koppelverzoek, ook niet bij een afwijkende `PROCESSED`-respons.
- Een tegenstrijdige keuze geeft nul verzoeken, en de invoer blijft staan.
- Er wordt geen boekjaar geforceerd.
- `GENERAL` wordt getoond na herladen en in de versiehistorie; een ongeldige DTO is fail-closed onbekend.
- Rollen, vergrendeling en `GROUP` buiten Financieel worden geweigerd.

Drie oude asserties zijn bewust vervangen door de `GENERAL`-verwachting:
- de validatie weigert `GENERAL` niet meer als onbekend;
- saneren en de lijst tonen `GENERAL`;
- de verkoper in een andere fase krijgt nu de algemene keuze.

## Release (10 okt 2026)

- **In productie**: backend `bf53a54b003c6cdac3cbbe41048296563ea619a8` / Worker
  `51d97c77-71ab-4904-bba5-05a64eb50084` en frontend `615603a34030410277532aaabc1e09d74f4790e9` / Pages
  `042e9351-60d7-44cb-a1f9-e1160c7f5215`. Beide native releasetaken DONE.
- **Vóór release**: backendtests (112) en UI-tests (101), native audit, onafhankelijke reviews en de
  review van de compositietest PASS.
- **Staging**: 13 specifieke API-, browser- en opruimchecks plus 18 kernrollen PASS. Twee optionele
  AI-checks zijn overgeslagen.
- **Productie**: 13 specifieke checks PASS, waaronder: een prognose overschrijft geen realisatie, de
  oorspronkelijke hash blijft behouden, herladen en DTO kloppen en ongeautoriseerde uploads worden
  geweigerd. Behoud van productpunten 3/4/5, smoke, autorisatie, live bytes, live versies,
  publicatiebeveiliging en opruimen PASS.
- Bewijs: `inbox/productpunt6-ui/afgerond.json`.

## Beperkingen en OPEN

- **Volgorde backend/UI** (historie, vervuld): de UI hoorde pas uitgerold te worden samen met of na de
  backend. Een oude backend negeert de parameters; de UI toont dan "niet geclassificeerd" en neemt bij
  niet-jaarrealisatie geen velden over. Dat terugvalgedrag blijft in de code staan.
- **Echte documenten**: staging en productie zijn bewezen met eigen synthetische prognosetekst/CSV. Er is
  geen acceptatie met echte klant(groeps)jaarstukken, begrotingen of prognoses, en de kwaliteit van live
  AI-extractie is niet bewezen.
- Een groepsdocument blijft een eigen indeling van de gebruiker, geen officiële consolidatie.
- **Productpunt 7 `GENERAL` — OPEN**: de UI is alleen synthetisch getest (node:vm, geen browser, geen
  live API). De backend `c976e778` staat niet in productie. Deze punten zijn nog niet gedaan:
  - een gezamenlijke release van backend en UI;
  - staging-acceptatie in een echte browser: upload in Financieel en in een niet-financiële fase, reeks,
    Vervangen, herladen, Versies, rollen en vergrendeling;
  - live-acceptatie.

  Hoe de huidige productiebackend op `doc_scope=GENERAL` reageert, is niet getest. De UI toont alleen
  een classificatie die de server bevestigt. In elk ander geval toont ze de serverfout of "niet
  geclassificeerd", en neemt ze geen velden over.
- Geen gebruik van de classificatie in broncontrole, groepsbeeld of AI-analyse en geen achteraf wijzigen
  van een classificatie (er is daarvoor geen API).
