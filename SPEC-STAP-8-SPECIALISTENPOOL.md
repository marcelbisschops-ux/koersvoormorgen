# SPEC — Stap 8: pool / marktplaats voor specialisten

> **Herzien ingekaderd (2026-09-10).** De specialistenpool is nu FASE E in
> `MASTER-SPEC-TRANSACTION-OS.md` (D-11): een *provider van reviewers* binnen de algemene
> review-engine, niet een eigen reviewarchitectuur. Bouw eerst de algemene Reviewer-interface,
> review-engine, scoped permissions en assignment-abstractie; daarna pas `pool_specialisten` /
> `pool_opdrachten` / `pool_reviews` / fee-flow / conflict-check / matching / marilyn-tab. De
> conflict-check krijgt een eigen mini-ADR (`S-02`). Dit document blijft het detailontwerp voor die
> fase.

**Hoort bij:** `ONTWERP-JURIDISCH-FISCAAL-EN-SPECIALISTEN.md`, bouwvolgorde stap 8.
**Datum:** 2026-09-10 · **Status:** ter verificatie door Marcel, nog niet gebouwd.
**Doel:** een adviseur zonder eigen jurist / fiscalist / waarderingsspecialist kan er één inschakelen
uit een door Bisschops Financing samengestelde pool, binnen het platform, om aan de aftekeneis uit
sectie 0.2 te voldoen.

---

## Randvoorwaarde

Stap 8 kan pas ná stap 3 en stap 7: de specialistrollen met scoped toegang en de aftekenpoorten
moeten bestaan. Stap 8 voegt daar **ontdekking + toewijzing + facturatie** aan toe. De rest van dit
document gaat ervan uit dat 3 en 7 er zijn.

---

## Actoren

| Actor | Rol in stap 8 |
|---|---|
| **Begeleider** (adviseur) | Heeft een aftekening nodig, heeft geen eigen specialist, vraagt er één aan uit de pool |
| **Poolspecialist** | Externe, geverifieerde jurist / fiscalist / waarderingsspecialist, ingeschreven bij Bisschops Financing, met profiel (naam, kantoor, hoedanigheid + inschrijving — bijv. advocaat NOvA, RB/RA/AA, Register Valuator NIRV), sectoren, tarief, beschikbaarheid |
| **Bisschops Financing** (Marcel) | Beheert de pool (toelaten/royeren, credential-verificatie), stelt het fee-model in, bemiddelt bij geschillen |

---

## Flow

1. In een traject met `specialist_review.<domein> = 'vereist'` en géén eigen specialist uitgenodigd,
   ziet de begeleider: "Geen eigen [jurist]? Vraag er één aan uit de pool."
2. De begeleider opent de pool: lijst met beschikbare specialisten voor de benodigde hoedanigheid,
   gefilterd op sector, met tarief + indicatieve doorlooptijd + korte profieltekst. **Geen** namen of
   gegevens van andere trajecten.
3. De begeleider kiest er één en stuurt een **scoped review-opdracht**: welke documenten/fases,
   deadline, korte instructietekst. Het platform toont de **kosteninschatting vóór bevestigen**
   (zelfde patroon als de KvK-doelwitten-flow).
4. De specialist krijgt een melding + een **tijdgebonden, scoped uitnodiging** voor dat ene traject
   (zelfde mechanisme als een in stap 3 uitgenodigde specialist, maar vanuit de pool geïnitieerd).
   Scope = precies de documenten/fases uit de opdracht; alleen lezen + commentaar + aftekenen;
   verloopt automatisch op de deadline + korte coulancetermijn; intrekbaar door begeleider of Marcel.
5. De specialist doet de review in het specialist-dashboard (stap 7): commentaar, redlines, dan
   "gereviewd / akkoord" met naam + hoedanigheid + datum → de aftekenpoort gaat open.
6. Bij afronding wordt een **fee-event** geboekt: het honorarium van de specialist (tarief × scope of
   een vast bedrag per review) + een **platform-bemiddelingsmarge**. Gefactureerd aan de adviseur;
   de specialist wordt uitbetaald door Bisschops Financing. Snapshot van de bedragen, net als de
   bestaande fee-events (`platform_fee_events`).
7. De begeleider beoordeelt de review (kwaliteit, tijdigheid). Voedt de poolcuratie. Niet openbaar,
   niet zichtbaar voor andere adviseurs.

---

## Datamodel

Nieuwe tabellen (patroon zoals `srcng_*`):

- `pool_specialisten` (id, naam, kantoor, hoedanigheid, inschrijvingsnummer, sectoren_json,
  tarief_model, tarief_bedrag_cent, beschikbaar, status, toegelaten_op, toegelaten_door, notitie).
- `pool_opdrachten` (id, **traject_id**, specialist_id, hoedanigheid, scope_json {documenten, fases},
  instructie, deadline, status [aangevraagd/geaccepteerd/afgewezen/gereviewd/verlopen/geannuleerd],
  geoffreerd_bedrag_cent, aangevraagd_op, afgerond_op, sign_off_naam, sign_off_hoedanigheid,
  sign_off_datum).
- `pool_reviews` (opdracht_id, beoordeling_json, opmerking, gemaakt_op).

Aanpassingen:

- `platform_fees`: nieuwe fee-types `pool_review_juridisch`, `pool_review_fiscaal`,
  `pool_review_cijfers` — dit is de **platformmarge**, admin-instelbaar in marilyn → Tarieven. Het
  honorarium van de specialist zelf staat op `pool_specialisten.tarief_bedrag_cent`.
- `SCHEMA_VERSION` ophogen (meerdere nieuwe tabellen).
- **`pool_opdrachten` heeft `traject_id`** → verplicht in **beide** verwijder-cascades
  (`verwijderTrajectData` + `/avg/verwijder`) en langs de CLAUDE.md-checklist voor een nieuwe tabel.
  Bevat persoonsgegevens (specialist naam/e-mail, instructietekst die naar de deal kan verwijzen) →
  AVG-bewaartermijn + `/avg/verwijder`-dekking.

---

## Rechten en isolatie (kritiek — werkregel 11d, `SECURITY-INVARIANTS.md`)

- Een poolspecialist ziet **uitsluitend** de trajecten waarvoor hij een actieve, niet-verlopen
  opdracht heeft, en daarbinnen alleen de gescopte documenten/fases. Expliciete allow-list, geen
  deny-list.
- Nul cross-traject: de pool-bladerweergave voor de adviseur toont alléén specialistprofielen, nooit
  andere trajecten of adviseurs.
- Het dashboard van de specialist: een lijst van zíjn opdrachten, elk opent alleen zijn gescopte
  deel.
- `tussen_code` en andere auth-sleutels komen nooit bij een poolspecialist.
- **Negatieve tests:** poolspecialist A met een opdracht op traject X kan traject Y niet lezen;
  verlopen opdracht → toegang weg; scope = alleen fase 2 → fase 3 onzichtbaar; poolspecialist ziet de
  dealprijs-/fee-velden niet tenzij "cijfers" expliciet in scope zit; poolspecialist kan de
  aftekenpoort van een traject zonder opdracht niet openen.

---

## Verhouding tot sectie 0

- Stap 8 is het **mechanisme om aan sectie 0.2 te voldoen** wanneer de adviseur geen eigen
  specialist heeft. Het verandert het grondprincipe niet.
- De aftekening door een poolspecialist draagt zijn geverifieerde hoedanigheid uit
  `pool_specialisten`: de audit-logregel luidt "gereviewd door [naam], [hoedanigheid],
  [inschrijvingsnummer], via de Koers voor Morgen-pool, [datum]".
- Wil de adviseur alsnog opt-outen (niet betalen / de pool niet gebruiken), dan geldt de
  sectie-0.3-disclaimer gewoon. De pool is een optie, nooit een verplichting.

---

## Contractueel raamwerk (werkregel 17, 25, 26)

- **Poolspecialist-overeenkomst** tussen Bisschops Financing en elke specialist: hoedanigheid en
  inschrijving gegarandeerd, geheimhouding, eigen beroepsaansprakelijkheid en -verzekering,
  scope-gebonden toegang, geen benadering van de cliënt buiten de opdracht om, uitbetaling/facturatie,
  royement.
- **VOK/GV:** de poolspecialist als partij in de keten — sub-verwerker van Bisschops Financing óf
  zelfstandig verwerkingsverantwoordelijke voor de eigen beroepsuitoefening; de adviseur (Gebruiker)
  stemt in met het inschakelen van een poolspecialist op verzoek. Nieuwe GV-bepaling + tarievenregel.
- **Disclaimer op de gereviewde output:** "gereviewd door een [hoedanigheid] uit de Koers voor
  Morgen-pool; deze beoordeling is de professionele verantwoordelijkheid van die specialist, niet van
  Koers voor Morgen of Bisschops Financing."
- **Geen kwaliteitsbelofte in publieke tekst** (werkregel 25/26): het platform beschrijft wat het
  doet (matcht, faciliteert de opdracht, verwerkt de betaling), niet dat het de kwaliteit garandeert.

---

## Marilyn (beheer)

- Nieuw tabblad **"Pool"**: specialisten toelaten/royeren, credentials verifiëren, tarieven, lopende
  opdrachten, uitbetalingsoverzicht.
- Fee-events uit poolreviews zichtbaar in het bestaande kosten-/fee-overzicht.

---

## Handleiding

- Adviseur: hoe vraag je een poolreview aan, wat kost het, wat krijg je.
- Aparte onboardingtekst voor poolspecialisten.

---

## Tests

- e2e: adviseur vraagt een juridische review aan → specialist accepteert → gescopte toegang
  geverifieerd → aftekening → poort open → fee-event geboekt met de juiste bedragen (honorarium +
  marge).
- Volledige negatieve rol-/isolatiebatterij (zie hierboven).
- Concurrency: twee adviseurs vragen tegelijk dezelfde specialist; verlopen-opdracht-race; dubbele
  aftekening.
- Verwijder-cascade: verwijder een traject met een openstaande poolopdracht → opdracht- + reviewrijen
  weg, specialistrecord ongemoeid, `platform_fees` ongemoeid.
- `/avg/verwijder` op het e-mailadres van een specialist → profielafhandeling (waarschijnlijk:
  anonimiseren, fee-historie geaggregeerd bewaren).

---

## Buiten scope stap 8

- Automatische incasso bij de adviseur (dat is de aparte BACKLOG 3.2 betaalintegratie; tot dan gaan
  pool-fees via de bestaande fee-event → factuur-flow).
- Een publieke marktplaats / SEO-pagina's. Alles zit binnen het platform.
- Samenwerking tussen specialisten onderling.
- Beoordelingen zichtbaar voor andere adviseurs (blijft intern voor de curatie).

---

## Deploy

Staging eerst (auth, rechten, betalingen, dataverwijdering — alle gevoelige categorieën).
Meerdere nieuwe tabellen → `SCHEMA_VERSION` ophogen. Volledige negatieve rol-testronde vereist
vóór productie.
