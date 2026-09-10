# Ontwerp — juridisch, fiscaal en specialisten in het platform

**Datum:** 2026-09-10
**Aanleiding:** feedback van tester Hans (M&A-adviseur). Kernpunten: (1) wanneer/hoe brengen we
juristen en fiscalisten zelf aan boord; (2) een MoU/term sheet als opstap ontbreekt; (3) de LoI
zou uit een menu van standaardclausules samengesteld moeten worden (earn-out,
vermogensinstandhoudingsverklaring, garanties, change of control); (4) volledigheid is voor een
M&A-adviseur net zo belangrijk als juistheid; (5) ondersteun de verkoper bij de waardering met een
opbouwsheet voor de adviseur; (6) een ervaren adviseur stapt alleen over als het platform zijn
werkwijze compléét maakt, niet half.

Dit is het **optimale doelbeeld**, ongeacht omvang. De bouwvolgorde staat onderaan.

**Status:** grondprincipe (sectie 0) vastgesteld door Marcel op 2026-09-10. Stappen 1 en 8 zijn
volledig uitgewerkt ter verificatie in aparte specs: `SPEC-STAP-1-MOU-EN-VOETTEKST.md` en
`SPEC-STAP-8-SPECIALISTENPOOL.md`.

---

## 0. Grondprincipe — regie, geen autoriteit

Het platform doet geen uitspraak over recht, fiscaliteit of de juistheid van een waardering. Het
verzamelt feiten, laat de grondslag zien, en legt het oordeel bij een gekwalificeerd mens. Dit
principe ligt dwars over alle blokken hieronder; waar B t/m F het raken, staat een verwijzing naar
deze sectie.

### 0.1 Grondslag altijd expliciet

Elke juridische, fiscale of cijfermatige uitspraak die het platform toont of oproept, draagt zijn
herkomst:

- **Juridisch:** welke clausule, uit welke standaardpassage (met toetsdatum en wie die heeft
  getoetst), of uit welke DD-bevinding hij volgt. Nooit "het platform concludeert", altijd "clausule
  X uit sjabloon Y, getoetst op datum Z" of "gemarkeerd omdat contract A een change-of-control-
  bepaling bevat (document, pagina)".
- **Fiscaal:** welk feit uit de DD de vraag oproept, en naar welke regeling het verwijst — benoemd,
  niet uitgelegd. Het platform wijst de vraag aan, het beantwoordt hem niet.
- **Cijfers:** welk bronbedrag, welke normalisatie-add-back met toelichting en bron, welke benchmark
  met de 🟢/🟡/🔴-status. Dit is de bestaande "nooit gokken"-regel (werkregel 8/13), doorgetrokken.

### 0.2 Inhoudelijke goedkeuring door een gekwalificeerd mens, per domein

Raakt een traject een van de drie domeinen, dan is de betreffende output **"concept — wacht op
goedkeuring"** tot een bevoegd persoon aftekent:

| Domein | Tekent af |
|---|---|
| Juridische documenten / DD-bevindingen | jurist |
| Fiscale DD / structureringsvragen | fiscalist |
| Waardering / cijfermatige onderbouwing | waarderingsspecialist (of Register Valuator) |

Tot die aftekening: niet verzendbaar naar een tegenpartij, niet "definitief" in het dealvoorstel,
watermerk "concept, niet gereviewd". De aftekening = naam + hoedanigheid + datum, in de audit-log.
De clausulebibliotheek (blok B) is de vooraf-goedkeuring: onbewerkte bibliotheekclausules zijn het
lichte pad; een bewerkte of vrij-getypte clausule valt terug op jurist-aftekening of de opt-out
hieronder.

### 0.3 De adviseur mag de eis vooraf uitschakelen, per domein

De begeleider zet bij de start van het traject de aftekeneis per domein (juridisch / fiscaal /
cijfers, apart) aan of uit. Zet hij er een uit, dan:

- draagt elk downstream-document en de dossier-export een **prominente, niet-verwijderbare
  disclaimer**: "De [juridische / fiscale / cijfermatige] inhoud in dit traject is niet beoordeeld
  door een gekwalificeerd [jurist / fiscalist / waarderingsspecialist]. De begeleidende adviseur
  heeft die beoordeling bewust uitgeschakeld en draagt daarvoor de volledige verantwoordelijkheid.";
- wordt de opt-out gelogd (wie, wanneer, welk domein) — de bescherming van het platform;
- ziet ook de verkoper/koper die disclaimer in het stuk dat zij ontvangen;
- stapelt de algemene reliance-disclaimer (FASE6 onderdeel 2) daar bovenop.

### 0.4 Wat het platform zelf nooit doet

Geen juridische conclusie ("deze clausule is afdwingbaar", "dit is naar Nederlands recht een
dealbreaker"). Geen fiscaal oordeel ("dit kwalificeert voor de deelnemingsvrijstelling"). Geen
waardering als formele taxatie. De AI vult placeholders, zet gekozen clausules achter elkaar,
extraheert feiten en schrijft concepttekst — onder de bestaande strikte regel — en levert nooit het
juridische of fiscale oordeel. De structureringsmodule (blok D) is "vraag + grondslag → naar
fiscalist", geen "asset deal vs. share deal-advies".

---

## A. Rollen en toegang (fundament)

> Beheerst door sectie 0.

Twee nieuwe deelnemersrollen, per traject uitgenodigd door de begeleider (zoals de meekijker, maar
met bijdragerecht):

| Rol | Scope | Rechten |
|---|---|---|
| **Jurist** | Contracten-flow (MoU/LoI/SPA/NDA/BEM/excl), juridische DD-fase (VI), de dealparameters die documenten voeden (prijsmechanisme, earn-out, escrow, garantiekader) | Lezen, per clausule/document commentaar en redline, clausuletekst voorstellen, "gereviewd" aftekenen |
| **Fiscalist** | Fiscale DD-fase, structureringsvragen, de normalisatie-/waarderingsonderbouwing (add-backs met fiscale impact), BTW-/overdrachtsbelasting-positie | Lezen, fiscale checklist invullen, structureringspunten markeren, "akkoord op structuur" aftekenen |

- **Sign-off-poorten** (begeleider zet per traject aan/uit): "LoI niet verzendbaar tot jurist =
  gereviewd", "dealvoorstel niet definitief tot fiscalist = akkoord".
- Elke rol: **expliciete velden-allowlist**, cross-traject-isolatie, negatieve rol-tests
  (`SECURITY-INVARIANTS.md`, `tests/e2e-crosspath-fixes.mjs`). Dit is het zwaarste deel: het platform
  had eerder cross-rol-datalekken.
- Volledige audit-log per specialist-actie (wie, wanneer, welk document/veld).
- Uitnodiging = e-mail + eigen inlogcode, rol + scope + einddatum instelbaar, op elk moment
  intrekbaar.

---

## B. Documentwerkstroom: MoU → LoI → SPA, modulair

> Beheerst door sectie 0.

### B1. Clausulebibliotheek (het kernbegrip)

Modulaire clausules in plaats van één monolithische template per documenttype. Per clausule:

```
{ id, categorie, titel,
  standaardtekst (met placeholders),
  varianten (bijv. earn-out: omzet-gebaseerd / EBITDA-gebaseerd / milestone),
  toelichting (waarom, en wat het kost om het laat te regelen),
  afhankelijkheden (bijv. "change of control" vereist "partijen" + "aandelen"),
  per-documenttype: verplicht / aanbevolen / optioneel,
  juridisch-getoetst-op (datum) + bron,
  versiehistorie }
```

**Categorieën:** partijen & object · koopprijs & mechanisme (locked box / completion accounts) ·
betaalstructuur (cash / escrow / earn-out / vendor loan / aandelenruil) · earn-out (meetgrondslag,
periode, cap, bescherming van de earn-out) · garanties & vrijwaringen (reps & warranties-kader: cap
/ basket / de minimis / survival) · W&I-verzekering · disclosure letter · MAC-clausule ·
opschortende voorwaarden · exclusiviteit · geheimhouding · non-concurrentie / relatiebeding /
anti-ronselbeding · change of control · vermogensinstandhoudingsverklaring / net-worth undertaking ·
bestuurdersaansprakelijkheid & decharge · retentie sleutelpersonen · overtollige liquiditeiten /
dividend-lock tot closing · kostenverdeling · geschillenregeling & forum · rechtskeuze · boilerplate
(volledige overeenkomst, wijziging schriftelijk, partiële nietigheid, kopjes).

### B2. Documentbouwer

Per traject, per documenttype (MoU / LoI / SPA): begeleider of jurist stelt samen:

1. kies clausules uit de bibliotheek → 2. bepaal de volgorde → 3. per clausule de variant + de
placeholders (grotendeels voorgevuld uit de trajectdata en de rekenkern) → 4. preview → 5. genereer.

De bestaande strikte regel blijft: de generator vult placeholders en zet gekozen clausules achter
elkaar, hij verzint geen eigen bepalingen.

### B3. Volledigheidscheck (levend)

Per documenttype een verwachte set. De bouwer toont wat ontbreekt, met per ontbrekend punt één zin
waarom het uitmaakt (leverage-argument). Dit vervangt de losse LoI-checklist die nu in het
dealvoorstel staat door een levende check ín de bouwer.

### B4. MoU / term sheet (nieuw documenttype)

Lichte clausuleset: partijen, object, indicatieve prijs & structuur, exclusiviteit, geheimhouding,
beoogd tijdpad, expliciet niet-bindend behoudens de genoemde clausules. Wordt de "basis": de LoI
**erft** de gekozen clausules en varianten van de MoU en breidt uit; de SPA erft van de LoI.

### B5. Doorwerkketen (één bron voor de kern-economics)

MoU, LoI en SPA delen dezelfde onderliggende dealparameters (prijs, mechanisme, earn-outstructuur,
garantiekader). Wijzig je de earn-out in de rekenkern, dan verandert de clausuletekst mee, met
markering "cijfers gewijzigd sinds laatste generatie".

### B6. Redlining en commentaar

Jurist stelt per clausule een alternatief voor + toelichting; begeleider accepteert of verwerpt;
historie zichtbaar. Sluit aan op het bestaande versiebeheer per document.

### B7. Voettekst

Elke gegenereerde document- en dossieroutput krijgt de reliance-disclaimer (het openstaande
FASE6-puntje): "hulpmiddel voor de begeleidende adviseur en diens opdrachtgever, geen professioneel
advies of taxatierapport, niet bestemd voor gebruik door derden."

---

## C. Juridische due diligence — verdiept

> Beheerst door sectie 0.

Fase VI wordt een gestructureerde checklist in plaats van een handvol vrije velden:

Entiteitsstructuur & organogram · aandeelhoudersovereenkomst · statuten & blokkeringsregeling ·
bestuur & volmachten & procuratie · materiële contracten met **change-of-control-scan** · huur &
onroerend goed & overdraagbaarheid · IE-eigendom & licenties · werknemers, pensioen, CAO,
non-concurrentiebedingen · vergunningen & overdraagbaarheid bij eigendomsoverdracht · lopende en
dreigende procedures & claims · garanties/vrijwaringen uit eerdere transacties · verzekeringen ·
compliance (Wwft, AVG, sectorspecifiek).

Per item: status (ok / aandacht / dealbreaker / n.v.t.), documentkoppeling, jurist-notitie,
red-flag-regel. **Output:** een juridische bevindingenlijst die doorwerkt in het dealvoorstel en in
de SPA-garantie-onderhandeling (bijv. een openstaande claim → specifieke vrijwaring in de SPA,
automatisch als voorstel in de documentbouwer).

---

## D. Fiscale due diligence en structurering — nieuw blok

> Beheerst door sectie 0.

### D1. Fiscale DD-checklist

Fiscale eenheid (VPB & BTW) en ontvoegingsrisico · deelnemingsvrijstelling · verrekenbare verliezen
& houdsterverliesregeling · herinvesteringsreserve · fiscale claims & open aanslagjaren · transfer
pricing & intercompany-verhoudingen · loonheffing, 30%-regeling, DGA-beloning (gebruikelijk loon) ·
BTW-positie & pro rata · overdrachtsbelasting & vastgoed · dividendbelasting · innovatiebox / WBSO
(tech) · overige fiscale faciliteiten waar relevant.

### D2. Structureringsmodule

Vergelijk **asset deal vs. share deal** met de fiscale gevolgen voor koper én verkoper · fiscale
behandeling van earn-out en vendor loan · renteaftrekbeperkingen bij overnamefinanciering ·
bedrijfsopvolgingsregeling (BOR) bij familie-/opvolgingstrajecten · holdingstructuur & fiscale
eenheid ná overname. Indicatief, met de "nooit gokken"-markering waar data ontbreekt; de fiscalist
bevestigt.

### D3. Doorwerking

De fiscale uitkomsten werken door in het dealvoorstel: **netto-opbrengst verkoper ná fiscaal** en de
opbrengst-brug tonen de fiscale afdracht als aparte regel.

---

## E. Waardering — opbouw en adviseursheet

> Beheerst door sectie 0.

Een bewerkbaar, presentabel document dat toont hóe de waarde is opgebouwd, samen op te bouwen met de
verkoper:

- **Genormaliseerde EBITDA-brug:** reported EBITDA → add-backs regel voor regel (marktconform
  ondernemersloon, incidentele posten, privé-onttrekkingen, eenmalige kosten, vastgoed in privé) →
  genormaliseerde EBITDA. Per add-back een toelichting + onderbouwing + bron.
- **Multiple-onderbouwing:** sectorbenchmark + kwaliteitsopslag/-afslag per as (afhankelijkheid
  eigenaar, tweede managementlaag, klantconcentratie, terugkerende omzet, groei) → toegepaste
  multiple, met de redenering erbij.
- **Ondernemingswaarde → equity value-brug:** netto schuld, debt-like items, werkkapitaalcorrectie
  t.o.v. norm, transactiekosten.
- **Kruischecks naast elkaar:** DCF, intrinsiek, liquidatiewaarde, goodwill via overwinst, met alle
  aannames zichtbaar.
- **Structuur:** earn-out / vendor loan / escrow en de verdeling van de opbrengst naar zekerheid.

Export naar PDF en Excel. Dit is de onderbouwing áchter het dealvoorstel, geen los getal. De
add-backs en de multiple-onderbouwing uit deze sheet zijn de **input** voor de rekenkern (nu deels
omgekeerd), zodat er één bron is.

---

## F. Specialisten aan boord — het bredere plaatje

> Beheerst door sectie 0.

- **Specialist-dashboard:** takenlijst ("review LoI", "fiscale DD fase 2", "bevestig structuur"), de
  documenten en fases binnen scope, een commentaar-/redline-werkruimte, een "gereviewd"-knop met
  naam + datum (audit).
- **Sign-off-poorten** zoals in A: begeleider bepaalt per traject welke stappen op een
  specialist-akkoord wachten.
- **Pool / marktplaats (later, commercieel):** een adviseur zonder eigen jurist/fiscalist schakelt
  er één in uit een aangesloten pool. Fee-model eromheen; matching op sector en beschikbaarheid.

---

## G. Juridisch-contractueel raamwerk eromheen

- **Verwerkersovereenkomst uitbreiden:** de jurist/fiscalist als extra (sub-)verwerker óf als
  zelfstandig verwerkingsverantwoordelijke voor de eigen beroepsuitoefening; geheimhouding; wie is
  waarvoor verantwoordelijk. De huidige VOK gaat uit van adviseur = verwerkingsverantwoordelijke,
  Bisschops Financing = verwerker.
- **Gebruiksvoorwaarden / tarieven:** specialisttoegang als module (betaald of inbegrepen);
  fee-model als de pool wordt gebruikt.
- **Clausulebibliotheek:** elke standaardclausule met bron + datum juridische toetsing +
  versiebeheer; een clausule wijzigen betekent her-toetsing. Vaste kwartaalcheck erop, zoals bij de
  sectorbenchmarks.
- **Beroepsregels:** een jurist/fiscalist die via het platform werkt, blijft zelf
  tuchtrechtelijk/beroepsaansprakelijk. Het platform levert gereedschap, geen advies — de
  reliance-disclaimer geldt ook op de bouwer-output.

---

## H. Optimale bouwvolgorde

Elke stap bouwt op de vorige.

| # | Stap | Levert |
|---|---|---|
| 1 | **MoU-generator** + reliance-voettekst op alle gegenereerde documenten | De ontbrekende opstap; sluit het laatste FASE6-puntje |
| 2 | **Clausulebibliotheek + documentbouwer** voor MoU en LoI, met levende volledigheidscheck; migreer de bestaande LoI-checklist hierin | Hans' hoofdpunt: volledigheid, standaardpassages, samenstellen uit een menu |
| 3 | **Specialistrollen niveau 1** (jurist & fiscalist als commentaar-/redline-deelnemer) + de rechten-/isolatie-tests + de VOK-aanpassing | De specialisten in het systeem |
| 4 | **Juridische DD verdiept** (fase VI → gestructureerde checklist) + doorwerking naar SPA-garanties | Diepgang aan de juridische kant |
| 5 | **Fiscale DD + structureringsmodule** + doorwerking naar de netto-opbrengst in het dealvoorstel | Diepgang aan de fiscale kant |
| 6 | **Waarderings-opbouwsheet** als één bron met de rekenkern | Verkoper-ondersteuning bij de waardering |
| 7 | **Specialistrollen niveau 2/3** (inhoud aanleveren, sign-off-poorten) + clausulebibliotheek uitbreiden naar de SPA | Volwaardige multi-party-omgeving |
| 8 | **Pool / marktplaats** voor specialisten | Commercieel; adviseurs zonder eigen netwerk |

Stap 1 en 2 leveren samen het grootste deel van Hans' documentvolledigheidspunt. Stap 3 haalt de
specialisten binnen. Stap 4 tot 6 verdiepen de inhoud. Stap 7 en 8 zijn het volledige doelbeeld.
