# Architectuurreview — Transaction OS ontwerpdocumenten

**Datum:** 2026-09-10 · **Status:** review afgerond · **Basis:** GO van Marcel + jurist-akkoord op `ADR-AVG-AUDIT-MANIFEST.md`
**Scope:** onafhankelijke kritische pass over de zeven ontwerpdocumenten, gericht op de vijf
reviewvragen (`RV-1`..`RV-5`) en op onderlinge inconsistenties. Doel: problemen vinden, niet
goedkeuren.

**Uitkomst in één zin:** de architectuur is consistent genoeg om FASE B (MoU-slice) te ontwerpen,
maar er zijn **één harde tegenstrijdigheid**, **twee gaten in de fasering** en **drie
scherp-te-maken open ontwerpkeuzes**. Hieronder per punt, met wat er in de documenten is aangepast
(✅ toegepast) of belegd als aangescherpt open punt (◻︎).

---

## 1. Reviewvragen

### RV-1 — Kan een block-definitie verwijderd worden terwijl een dossier/review ernaar verwijst?

**Bevinding:** goed gedekt voor de *definitie* (append-only, alleen `RETIRED`). Niet gedekt: het
verwijderen van een component-*instance* uit een levend document (dus niet bij een case-purge).
Als de adviseur in documentversie 4 een component weghaalt die in v3 zat, moet dat een spoor
achterlaten — anders verdwijnt "component X is bewust verwijderd na jurist-commentaar" uit de
geschiedenis.

**✅ Toegepast** (`SPEC-DATA-LIFECYCLE.md`, `SPEC-BLOCK-FRAMEWORK-V1.md`): een component-instance uit
een document halen is **geen hard delete van de instance**, maar een overgang naar
`status = REMOVED_IN_v<n>`. De instance + zijn laatste reviewstatus blijven aan de vorige
documentversie gekoppeld en in het manifest. Hard delete gebeurt alleen bij de case-purge.

**◻︎ Open:** een `RETIRED` definitie waarvan een levend dossier nog een instance heeft met een
`SUPERSEDED` review — mag die instance nog opnieuw `APPROVED` worden? Voorstel: ja, want de instance
is gepind op een onveranderlijke `block_version`; alleen nieuwe *selecties* van een `RETIRED`
component zijn geblokkeerd. Te bevestigen in de bouw.

### RV-2 — Wat gebeurt er met een review bij een inhoudswijziging (specialist óf adviseur)?

**Bevinding — HARDE TEGENSTRIJDIGHEID.** `D-10` zegt: iedere inhoudelijke wijziging aan een
`APPROVED` instance → `SUPERSEDED`, ongeacht wie. Maar `TESTSTRATEGIE §4b` (divergentietest) zei:
"de adviseur past de dealdata aan naar 120 zodat alles gelijk is → de eerder `APPROVED`
MoU-component blijft `APPROVED`". Dat kan niet allebei waar zijn als de exclusiviteitsduur een
dataslot van de `exclusivity`-instance is.

**✅ Toegepast** (`TESTSTRATEGIE-TRANSACTION-OS.md §4b` herschreven): de strikte regel wint. Een
wijziging aan een **gekoppeld binding-dataslot** van een `APPROVED` component-instance zet de review
altijd op `SUPERSEDED` — of de wijziging nu in de documenttekst of in de dealdata begint. De
divergentiewaarschuwing en de review-invalidatie zijn twee kanten van dezelfde gebeurtenis. Alleen
een wijziging aan **niet-gekoppelde vrije prozatekst** (een toelichtende zin) triggert geen
invalidatie.

### RV-3 — Wat blijft na de AVG-purge?

**Bevinding:** consistent met de ADR. Eén residueel risico dat de ADR zelf al noemt (jurist-vraag 2):
in een kleine markt kan `hoedanigheid + timestamp + dossier-hash + document-hash` alsnog naar één
persoon herleiden. Jurist is akkoord met hoedanigheid-zonder-naam; het risico is klein maar niet nul.

**✅ Toegepast** (`ADR-AVG-AUDIT-MANIFEST.md`): expliciet als restrisico opgenomen met een
terugvaloptie — als het later te scherp blijkt, degradeert "hoedanigheid" naar een binaire vlag
("juridische review uitgevoerd: ja/nee, datum") zonder de architectuur te raken.

### RV-4 — Kan iemand een hard gate omzeilen via een andere route?

**Bevinding:** de eis "één egress-policy" staat, de uitwerking is `S-04` (spike). De opgesomde routes
zijn compleet op twee na:

1. **Error-/logpaden.** Een geblokkeerde export die de documenttekst in een foutrespons of in
   `wrangler tail` logt, is een lek. Moet in de spike: geen documentinhoud in errors of logs.
2. **De AI-context zelf.** Als component A's vrije tekst als context naar Anthropic gaat om component
   B te genereren, is dat een egress naar een sub-verwerker. Toegestaan onder de VOK AI-bijlage, maar
   de gate-logica mag geen tekst van een component dat onder een specialist-hold staat naar de AI
   sturen zonder dat de adviseur/specialist het weet.

**✅ Toegepast** (`TESTSTRATEGIE §6` + `MASTER-SPEC` D-14): beide routes toegevoegd aan de
gate-integriteitssuite en aan de S-04-scope.

### RV-5 — Kan het platform tóch tekst als "professioneel juist" presenteren of een goedkeuring simuleren?

**Bevinding:** sterk afgedekt in §1a en de teststrategie. Eén grensgeval: de **volledigheidscheck**.
"Je LoI mist een change-of-control-clausule, dat kost leverage" — is dat een juridisch oordeel? Het
zit dicht tegen de grens aan.

**✅ Toegepast** (`SPEC-BLOCK-FRAMEWORK-V1.md §3` + `MASTER-SPEC` §1a): de volledigheidscheck toont
**alleen generiek verwachte componenten** met een **generieke, vooraf één keer geschreven en
gereviewde** toelichting ("een MoU/LoI bevat gewoonlijk X"). Nooit een casus-specifiek oordeel ("in
jouw situatie heb je X nodig vanwege Y"). De toelichtingsteksten zijn platform-copy, geen
AI-generatie per dossier, en dragen zelf de reliance-disclaimer.

---

## 2. Gaten in de fasering

### FG-1 — Hans' verdiepte juridische DD, fiscale DD + structureringsmodule en de waarderings-opbouwsheet ontbreken in de FASE-lijst

**Bevinding — GAT.** De `MASTER-SPEC` FASE-lijst gaat van FASE D (documentprofielen: LoI/NDA/…) naar
FASE E (specialistenpool). De oorspronkelijke Hans-vragen — een gestructureerde juridische
DD-checklist (ONTWERP blok C), een fiscale DD + structureringsmodule (blok D), en de
waarderings-opbouwsheet (blok E) — staan nergens in de volgorde. Ze zijn uit het zicht geraakt bij
de consolidatie.

**✅ Toegepast** (`MASTER-SPEC §8`): nieuwe **FASE D-bis — verdieping inhoud**, tussen FASE D en E:
juridische DD-checklist → doorwerking naar SPA-garanties; fiscale DD + structureringsmodule →
doorwerking naar de netto-opbrengst in het dealvoorstel; waarderings-opbouwsheet als één bron met de
(onaangeroerde) rekenkern. Elk als component-set + reviewgate, onder sectie 0.

### FG-2 — De interim-`AdvisorReviewer` kan de opsteller zelf zijn (zelf-review)

**Bevinding.** In de MoU-slice is de enige reviewer de `AdvisorReviewer` — vaak dezelfde persoon die
het concept heeft opgesteld. De slice bewijst dan wél de *mechaniek* (reviewstatussen, invalidatie,
gates) maar niet de *governance-waarde* (iemand met een andere blik kijkt ernaar).

**✅ Toegepast** (`SPEC-MOU-FIRST-VERTICAL-SLICE.md`): de zelf-review wordt expliciet als zodanig
gelogd (`review_kind = SELF_REVIEW`), en waar een traject meer dan één adviseur heeft, moet de
interim-reviewer een ander zijn dan de opsteller. De volwaardige governance komt met de echte
specialistrollen; de slice claimt dat ook niet.

---

## 3. Scherp-te-maken open ontwerpkeuzes

### OK-1 — "Gekoppeld veld" bij divergentiedetectie (O-04) is nog te vaag

**Bevinding.** D-17 wil signaleren dat "exclusiviteitsduur 90" in de dealdata verschilt van "120" in
de vrije tekst. Maar hoe weet het systeem dat "120 dagen" ergens in vrije prozatekst dát veld is?
Vrije-tekst-parsing is fragiel.

**◻︎ Aanbeveling belegd in `MASTER-SPEC` O-04:** binding numerieke/datum-termen leven **uitsluitend in
gestructureerde dataslots** (de single source). De vrije tekst toont ze via een token
(`{{exclusivity.duur}}`). Overschrijft de specialist de zin met een letterlijk getal, dan wordt dat
een expliciete, gekoppelde override — een gemarkeerde, review-triggerende handeling — niet iets wat
het systeem uit proza moet raden. Vrije proza die géén binding-term is, wordt niet vergeleken.

### OK-2 — `DocumentProfile`-versionering is niet gespecificeerd

**Bevinding.** Als het MoU-profiel later een KERN-component toevoegt, worden bestaande MoU-documenten
dan gemarkeerd als "profiel gewijzigd"? Niet beschreven.

**◻︎ Belegd in `MASTER-SPEC` O-05 (nieuw):** `DocumentProfile` krijgt hetzelfde append-only
versiemodel als een component-definitie; een document is gepind op een profielversie; een nieuwer
profiel markeert bestaande documenten als "profiel v_n beschikbaar", zonder ze te forceren.

### OK-3 — Performance van de divergentiecheck (S-01)

**Bevinding.** Een divergentiecheck bij elke save of render die alle componenten + alle
zusterdocumenten scant, wordt duur op D1.

**◻︎ Belegd in `SPEC-DATA-LIFECYCLE.md §Performance`:** de check is **event-driven** — hij draait
alleen bij een wijziging aan een gekoppeld dataslot, vergelijkt alleen de instances die dat dataslot
delen, en schrijft een `divergence_flag` die de UI leest. Geen scan bij elke render.

---

## 4. Kleinere consistentiepunten (✅ toegepast)

- `SPEC-STAP-8-SPECIALISTENPOOL.md` conflict-check-sectie verwijst nu expliciet naar `S-02`
  (mini-ADR eerst) i.p.v. een eigen aanpak te suggereren.
- De acceptance-criteria in `SPEC-MOU-FIRST-VERTICAL-SLICE.md` (14 punten) en de FASE B-stappen in
  `MASTER-SPEC §8` (nu hernummerd) lopen weer gelijk.
- `MASTER-SPEC` verwijst consequent naar `SPEC-BLOCK-FRAMEWORK-V1.md` (de oude
  `SPEC-BLOCK-LIBRARY-V1`-link is overal weg — geverifieerd).
- "~120 blocks" is overal "toekomstig menu, niet gebouwd, niet getoetst"; het exacte getal is soft
  en niet load-bearing.

---

## 5. Wat blijft `REQUIRES TECHNICAL SPIKE` (ongewijzigd, geen blocker voor het ontwerp)

`S-01` D1-performance · `S-02` conflict-check mini-ADR · `S-03` migratiepad uit de bestaande
generatoren · `S-04` één egress-policy (nu inclusief error-/log- en AI-context-routes).

---

## 6. Conclusie

Na deze review en de doorgevoerde correcties zijn er **geen openstaande tegenstrijdigheden** meer
tussen de zeven documenten. De resterende `OPEN`-punten (`O-01` t/m `O-05`) en de vier spikes zijn
ontwerp- en implementatiedetails die in FASE B / de bouw worden beslecht; ze blokkeren de start van
het slice-ontwerp niet.

**Aanbevolen volgende stap:** FASE B-ontwerp (de MoU-slice concreet uittekenen: datamodel-DDL,
component-definitieschema, de policy-engine-interface, de composer-UX) — nog steeds als ontwerp, de
eerste code pas na dat FASE B-ontwerp + een korte `/code-review`-pass erop.
