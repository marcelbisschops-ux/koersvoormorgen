# RETENTION-ENGINE.md — bewaartermijn-engine

Bepaalt **per informatieobject** in de productiedatabase: welke categorie, bij welke
opdracht/relatie het hoort, welke **voorwaardenversie op de contractdatum gold**
(nooit automatisch de huidige), welke contractuele én wettelijke bewaartermijn van
toepassing is, wanneer die termijn start en eindigt, en wat de status is — met een
reproduceerbare onderbouwing per beslissing.

Reviewregels: [`../../REVIEW.md`](../../REVIEW.md) · Juridische status: [`../LEGAL_REVIEW.md`](../LEGAL_REVIEW.md)

---

## 1. Kernprincipes (hard, niet onderhandelbaar)

1. **Nooit verwijderen bij onzekerheid** → `STATUS = REVIEW_REQUIRED`.
2. **Nooit automatisch de huidige voorwaarden op een oude overeenkomst toepassen** — altijd
   de versie die gold op de contractdatum (tenzij een 'latere versie geldt'-beding of een
   addendum in `contracts/registry.json` anders bepaalt).
3. **Contractuele context altijd reconstrueren** (opdracht → voorwaarden → informatieobject).
4. **Wettelijke verplichtingen expliciet meenemen**; nooit "gewoon de langste termijn".
5. **Per informatieobject beoordelen** waar nodig — een M&A-dossier is niet één termijn.
6. **Iedere beslissing reproduceerbaar** — de volledige keten staat in het JSON-rapport.
7. **Alles eerst in DRY RUN** (default). `--enforce` produceert alleen een plan; verwijderen
   zelf gebeurt via de bestaande, geteste worker-endpoints.
8. **Geen schijnzekerheid**; geen hardcoded termijn zonder bron in de policybestanden.
9. **Geen hardcoded bewaartermijn zonder onderbouwing** — elke termijn verwijst naar een
   clausule (`av-versions.json`) of een wettelijke grondslag (`legal-rules.json`).
10. **Het systeem is daadwerkelijk uitvoerbaar** — `node legal/retention/retention-engine.mjs`.

---

## 2. Bestanden

```
legal/retention/
├── retention-engine.mjs        de engine (pure functie: databron + simulatiedatum → rapport)
├── snapshot.mjs                dumpt de D1-tabellen naar .data/ (read-only SELECTs, vereist wrangler)
├── RETENTION-ENGINE.md         dit document
├── legal-holds.json            actieve legal holds (bv. P4-besluit mna_audit)
├── policies/
│   ├── av-versions.json        versiehistorie van álle voorwaarden + per versie de bewaarbepaling + hash + toepassingsgebied + overgangsbepaling
│   ├── legal-rules.json        wettelijke bewaarplichten en -grondslagen (AWR/Wwft/AVG/BW) + de decision-tree-volgorde
│   ├── categories.json         D1-tabel → categorie → welke datumkolom start, welke overeenkomst, wel/geen persoonsgegevens, welke regel
│   └── retention-rules.json    de genormaliseerde contractuele bewaarregel per categorie (termijn + startgebeurtenis + bron)
├── contracts/
│   └── registry.json           overeenkomstenregister: handmatige overrides (addenda, afwijkende afspraken, beëindigingen die niet uit de data blijken)
├── fixtures/                   kleine, volledig fictieve voorbeelddataset (13 objecten, alle statussen) — voor `--source=fixtures`
├── test/
│   └── retention.test.mjs      16 benoemde testscenario's met verwachte uitkomst
├── .data/                      (git-genegeerd) snapshot van de live D1 — bevat klantdata
└── reports/                    (git-genegeerd) gegenereerde rapporten retention-<datum>.json/.md + latest.json/.md
```

**Wat hoort in git:** de engine, `snapshot.mjs`, dit document, `policies/*`, `fixtures/*`,
`contracts/registry.json`, `legal-holds.json`, `test/*`.
**Wat niet:** `.data/` (klantdata) en `reports/` (roterende output) — zie `.gitignore`.

---

## 3. Draaien

### Run retention audit (DRY RUN, standaard)

```bash
# 1. verse snapshot van de productie-D1 (read-only; vanuit de frontend-repo, wrangler moet ingelogd zijn)
node legal/retention/snapshot.mjs                 # of --env=staging voor staging

# 2. de audit — leest .data/, schrijft reports/retention-<vandaag>.json + .md + latest.*
node legal/retention/retention-engine.mjs
```

Zonder snapshot (offline demo op de meegeleverde fixtures):

```bash
node legal/retention/retention-engine.mjs --source=fixtures
```

### Simulatie / historische reconstructie

```bash
node legal/retention/retention-engine.mjs --simulate-date=2026-06-01
```

"Wat zou de engine op 1 juni 2026 hebben besloten" — gebruikt dezelfde databron maar rekent
alle termijnen af tegen die datum. Zo reconstrueer je een eerdere bewaarbeslissing.

### ENFORCE (plan, geen uitvoering)

```bash
node legal/retention/retention-engine.mjs --enforce
```

Schrijft `reports/enforce-plan-<datum>.jsonl` met uitsluitend objecten met status
`DELETE_ELIGIBLE` die **niet** gemengd zijn (geen zakelijke kern). `--execute` is bewust
**niet** geïmplementeerd: echt verwijderen loopt via `/admin/delete/mna/`, `/avg/verwijder`
en `/avg/cleanup` in de worker, met hun eigen cascade- en auditgaranties. Het enforce-plan
is de invoer daarvoor.

### Overige opties

| Optie | Effect |
|---|---|
| `--source=snapshot\|fixtures` | databron (default `snapshot` → `.data/`) |
| `--data-dir=<pad>` | alternatieve brondir met `<tabel>.json`-bestanden |
| `--out=<pad>` | andere rapportmap |
| `--json-only` | geen Markdown genereren |
| `--limit=<n>` | verwerk maximaal n objecten (debug) |

---

## 4. Beslisboom (volgorde is bindend — `legal-rules.json § prioriteitsvolgorde_decision_tree`)

Per object, in deze volgorde; de eerste die matcht bepaalt de status:

1. **Legal hold actief?** → `LEGAL_HOLD`. Niet verwijderen, ongeacht de termijn.
2. **Onzekerheid én geen wettelijk minimum dat toch al dwingt tot bewaren?** → `REVIEW_REQUIRED`.
   Onzeker = geen overeenkomst gekoppeld · voorwaardenversie onbekend (zie §5) · geen
   begindatum · traject niet afgesloten · einddatum vóór contractdatum · `LEGAL_RETENTION_CONFLICT`.
3. **Wettelijke minimum-bewaarplicht loopt nog** (fiscaal 7 jr, Wwft-cliëntacceptatie 5 jr)
   → `RETENTION_REQUIRED`. Prevaleert boven een kortere contractuele/privacy-termijn.
4. **Contractuele bewaartermijn loopt nog** → `RETENTION_REQUIRED`.
5. **Alleen nog een 'bewaren toegestaan'-grondslag** (verjaring/claimverweer) en die loopt
   nog → `RETENTION_ALLOWED` — **behalve** bij een `maximum_verwijdertermijn`-regel
   (zie §6): een uitdrukkelijke verwijdertoezegging wordt niet opgerekt.
6. **Alle termijnen verlopen of afwezig:**
   - bevat persoonsgegevens + er was een vastgestelde einddatum → `DELETE_ELIGIBLE`
     (AVG-dataminimalisatie, art. 5 lid 1 sub e).
   - bevat persoonsgegevens maar geen begindatum/termijn → `REVIEW_REQUIRED`.
   - geen persoonsgegevens, wel een verlopen termijn → `RETENTION_ALLOWED` (bewaren mag,
     niet langer nodig).
   - geen persoonsgegevens, geen termijn → `REVIEW_REQUIRED`.

**Gemengde objecten** (persoonsgegevens + zakelijke kern, bv. een M&A-document): bij
`DELETE_ELIGIBLE` krijgt het record een notitie dat alleen de persoonsgegeven-onderdelen
verwijderd/geanonimiseerd hoeven te worden; het enforce-plan slaat gemengde objecten over.

---

## 5. Voorwaardenversie op de contractdatum (principe 2)

`av-versions.json` bevat per document (`GEBRUIKSVOORWAARDEN_VERKOPER_KOPER`,
`GEBRUIKSVOORWAARDEN_ADVISEUR`, `ALGEMENE_VOORWAARDEN_BF_MA`, `VERWERKERSOVEREENKOMST`,
`PRIVACYVERKLARING`, `TESTVOORWAARDEN`) een `versies[]`-lijst met `ingangsdatum`,
`einddatum`, `hash`, `bewaarbepalingen` en `overgangsbepalingen`. De engine kiest de versie
waarvan het interval de contractdatum omvat.

- **Geen match, wél een eerdere versie** → die eerdere versie (herkomst
  `afgeleid_laatst_voor_datum`); een versie loopt door zolang haar `einddatum` `null` is.
- **Contractdatum vóór de eerste vastgelegde versie** → herkomst `geen_versie_voor_datum`.
  Wat er dan gebeurt hangt af van `geen_versie_voor_datum_is_anomalie` op dat document:
  - `true` (het M&A-platform / de stagingomgeving bestónd toen nog niet) → **anomalie**:
    de contractuele context is niet betrouwbaar te reconstrueren → `REVIEW_REQUIRED`, óók
    als de bewaartermijn versie-invariant is. Een `av_versie_override` in `registry.json`
    heft dit op.
  - `false` (de dienst bestond al langer; alleen oudere versies zijn niet gecatalogiseerd,
    bv. de bedrijfsscan of de adviseurs-GV) → terugvallen op de (versie-invariante) termijn,
    met een notitie. Geen REVIEW.
- **`versie_invariante_termijn: true`** op een `retention-rules.json`-regel = de bewaartermijn
  is in álle tot nu toe geldende versies gelijk; een onbekende versie blokkeert de berekening
  dan niet (behalve bij een anomalie hierboven). **Zodra een nieuwe voorwaardenversie de
  termijn wijzigt:** zet die vlag op `false` en voeg de per-versie-termijn toe aan
  `av-versions.json`.

---

## 6. `type` op een retentieregel

| `type` | Betekenis | Effect in de beslisboom |
|---|---|---|
| _geen_ | genormaliseerde contractuele termijn | standaard |
| `minimum_bewaarplicht` | wettelijk minimum (fiscaal, Wwft) | stap 3 — prevaleert boven kortere termijnen |
| `maximum_verwijdertermijn` | uitdrukkelijke **toezegging om te verwijderen** (platform: 14 dgn na afsluiting) | stap 5 wordt overgeslagen — een claimverweer-grondslag mag de toezegging niet oprekken; alleen een wettelijk minimum gaat vóór |
| `maximum_noodzakelijkheid` | privacyverklaring belooft automatische verwijdering na X (scan 12 mnd) | idem `maximum_verwijdertermijn` |

---

## 7. LEGAL_RETENTION_CONFLICT (koppeling met de juridische review)

De engine vergelijkt de bewaarbepaling uit `av-versions.json` (de op de contractdatum
geldende versie) met de genormaliseerde regel in `retention-rules.json`. Wijken die af voor
`MNA_DOCUMENT`, dan zet de engine `legal_retention_conflict` op het record, telt het mee in
de rapport-samenvatting onder **LEGAL_RETENTION_CONFLICT**, en markeert het object
`REVIEW_REQUIRED`.

Een conflict betekent: óf `av-versions.json` is niet bijgewerkt na een voorwaardenwijziging,
óf `retention-rules.json` klopt niet meer. Los het op in de policybestanden — niet in de
engine — en draai de audit opnieuw.

---

## 8. Onderhoud

**Bij een nieuwe of gewijzigde voorwaardenversie** (juridische review, FASE "versiebeheer"):
1. Nieuw record in `av-versions.json` → `ingangsdatum` = commitdatum, `einddatum` van de
   vorige versie = dag ervóór, `bewaarbepalingen` expliciet overnemen, `hash` vullen met
   `node legal/retention/tools/hash-doc.mjs` (indien aanwezig).
2. Wijzigt de nieuwe versie een **bewaartermijn**? → zet `versie_invariante_termijn: false`
   op de betrokken regel in `retention-rules.json` en voeg de per-versie-termijn toe.
3. Draai `node legal/retention/test/retention.test.mjs` — moet 16/16 blijven.

**Bij een addendum / afwijkende afspraak / beëindiging die niet uit de data blijkt:**
voeg een override toe aan `contracts/registry.json` (formaat: zie `voorbeeld_override_formaat`
in dat bestand). De engine merget dat register bij elke run.

**Bij een nieuwe D1-tabel** (zie ook de checklist in `CLAUDE.md`): voeg de tabel toe aan
`snapshot.mjs § TABELLEN` en aan `categories.json` (of hij valt onder een bestaande
`inhoudTabellen`-regel). Bepaal: welke datumkolom start de termijn, welke overeenkomst,
persoonsgegevens ja/nee/gemengd, welke regel.

**Bij een nieuwe legal hold:** voeg een record toe aan `legal-holds.json` (`scope`:
`categorie` | `traject` | `object`; `target` = de regelsleutel / traject-id / object-id).

---

## 9. Testscenario's

`node legal/retention/test/retention.test.mjs` — 16 benoemde scenario's, elk met een
verwachte uitkomst. De test draait de échte engine tegen een tijdelijke databron per
scenario. Dekking:

| # | Scenario | Verwacht |
|---|---|---|
| 01 | Contract met expliciete bewaartermijn, termijn verlopen | `DELETE_ELIGIBLE` (verwijdertoezegging prevaleert boven claimverweer-grondslag) |
| 02 | Contract zonder expliciete termijn, traject net afgesloten | `RETENTION_REQUIRED` (14-dgn loopt nog) |
| 03 | Oude AV-versie (v2.0) — engine mag niet v2.3 pakken | `RETENTION_REQUIRED`, versie `2.0` |
| 04 | Nieuwe AV-versie (v2.3), traject nog niet afgesloten | `REVIEW_REQUIRED`, versie `2.3` |
| 05 | Gewijzigde overeenkomst — registry-override versie + einddatum | versie `2.3` (uit override) |
| 06 | Beëindigd, termijn ruim verlopen, persoonsgegevens | `DELETE_ELIGIBLE` (AVG) |
| 07 | Actieve overeenkomst, traject niet afgesloten | `REVIEW_REQUIRED` |
| 08 | Wettelijke bewaarplicht langer dan contractueel (fee-event, fiscaal 7 jr) | `RETENTION_REQUIRED` (fiscaal) |
| 09 | Contractueel langer dan wettelijk (recente scan, geen wettelijke plicht) | `RETENTION_REQUIRED` (contractueel) |
| 10 | Ontbrekende AV-versie — contractdatum vóór elke bekende versie (platform-anomalie) | `REVIEW_REQUIRED` ("voorwaardenversie onbekend") |
| 11 | Ontbrekende beëindigingsdatum — doc-versie op niet-afgesloten traject | `REVIEW_REQUIRED` |
| 12 | Tegenstrijdige bepalingen — einddatum vóór contractdatum | `REVIEW_REQUIRED` ("tegenstrijdig") |
| 13 | Legal hold — mna_audit-regel (P4-besluit) | `LEGAL_HOLD` |
| 14 | M&A-transactiedossier — subcategorieën NDA/financieel apart | `DELETE_ELIGIBLE` per stuk, juiste subcategorie |
| 15 | Document met persoonsgegevens, termijn verlopen | `DELETE_ELIGIBLE` (AVG) |
| 16 | Onvoldoende informatie — document met niet-bestaand traject_id | `REVIEW_REQUIRED` |

**Stand laatste run: 16 / 16 geslaagd.**

---

## 10. Bekende beperkingen / toekomstige verfijning

- **VOK-acceptatiebewijs** (`mna_vok`): de bewaartermijn start bij "einde relatie met de
  adviseur". Kan de engine de gekoppelde trajecten niet vinden of zijn die niet afgesloten,
  dan → `REVIEW_REQUIRED` ("geen begindatum"). Dat is het veilige, eerlijke antwoord; een
  latere versie kan terugvallen op de laatste activiteit van de adviseur.
- **Sub-categorisatie van M&A-documenten** gebeurt heuristisch op `doc_type` + bestandsnaam
  + fase. Bij twijfel valt de engine terug op `due_diligence_document` (14 dgn) — nooit op
  een langere termijn.
- **Kalendermaand-precisie**: termijnen in maanden/jaren gebruiken `setUTCMonth`/
  `setUTCFullYear` (kalenderconform); dagen zijn exact.
- `--execute` is niet geïmplementeerd (bewust — zie §3).
