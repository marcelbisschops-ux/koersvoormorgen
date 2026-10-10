# Expliciete groepsdocumenten: UI (productpunt 6)

Status 10 okt 2026: **frontend gebouwd en synthetisch getest, niet live.** De backend (productpunt 6,
commit `fd2bf7d`, backend `docs/group-documents.md`) is READY maar niet uitgerold. Deze UI is niet op
staging of productie gezet. Backend-live, UI-staging, productie en acceptatie met echte documenten staan
**OPEN** tot er een bewezen release is (zie onderaan).

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
de bestaande queryparameter uit de bestaande entiteitkeuze. De backendscope `GENERAL` (productpunt 7) wordt
hier niet gebouwd: de UI biedt hem niet aan en toont een `GENERAL`-classificatie uit de server als
"niet geclassificeerd (classificatie onbekend)".

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
consolidatie claimt, een andere herkomst, `GENERAL` of een afwijkende entiteit telt als onbekend. Of het een
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

- Alleen de **verkoper** krijgt het keuzeblok, alleen in fase Financieel en alleen in een niet-vergrendeld
  traject. Zelfs een los ingevuld keuzeblok in de DOM levert voor een andere rol geen classificatie op.
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

## Beperkingen en OPEN

- **Backend productpunt 6 niet live**: de UI hoort pas uitgerold te worden samen met of na de backend.
  Tot die tijd negeert een oude backend de parameters. De UI toont dan "niet geclassificeerd" en neemt bij
  niet-jaarrealisatie geen velden over.
- **UI-staging en productie**: niet uitgerold, niet live geaccepteerd.
- **Echte documenten**: alleen synthetische proeven, geen acceptatie met echte (groeps)jaarstukken,
  begrotingen of prognoses.
- Geen GENERAL (productpunt 7), geen gebruik van de classificatie in broncontrole, groepsbeeld of
  AI-analyse en geen achteraf wijzigen van een classificatie (er is daarvoor geen API).
