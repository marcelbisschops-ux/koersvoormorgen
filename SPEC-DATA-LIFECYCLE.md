# SPEC — Data lifecycle Transaction OS

**Datum:** 2026-09-10 · **Status:** ter verificatie · **Context:** `MASTER-SPEC-TRANSACTION-OS.md` (S-01, O-01, RV-1, RV-2, RV-3)

Doel: voorkomen dat versionering en audit logging de bestaande **14/365-dagenretentie** onbedoeld
omzeilen, en de vier architectuur-reviewvragen beantwoorden.

---

## 1. Per object: retention, purge, afhankelijkheid, deletion-gedrag

| Object | Bewaarklasse | Purge | Deletion-gedrag | Wettelijke bewaarplicht? |
|---|---|---|---|---|
| **Transaction / Case** | CONTENT | 14 dg na afsluiting, of ≤365 dg met grondslag (VOK Art. 5) | cascade: alles hieronder mee | nee (archiefregel blijft) |
| **Facts** (alle provenance-typen) | CONTENT | met de case | hard delete | nee |
| **Evidence / Source** | CONTENT | met de case | hard delete (ook R2-objecten) | nee |
| **Component-definitie** (welke werkvelden/dataslots, menu-metadata — géén professionele tekst) | PLATFORM | nooit met een case; alleen `RETIRED` | **nooit hard delete** (`O-01`) — zie §2 | n.v.t. (platformdata, geen persoonsgegevens) |
| **BlockVersion** (structuurversie) | PLATFORM | nooit | append-only, onveranderlijk | n.v.t. |
| **Block-instance in een case** (gekozen component + ingevulde dataslots + de vrije tekst, AI-concept of specialist-input) | CONTENT | met de case | hard delete | nee |
| **Document / DocumentVersion** (samengesteld) | CONTENT | met de case | hard delete | nee |
| **Gegenereerd bestand** (PDF/tekst, verstuurd) | CONTENT | met de case | hard delete (R2) | nee |
| **BlockReview** — inhoud (opmerkingen, redlines) | CONTENT | met de case | hard delete | nee |
| **BlockReview** — metadata (review-ID, `block_id@version`, status, hoedanigheid, timestamps) | MANIFEST | mogelijk langdurig (`REQUIRES LEGAL VALIDATION`, `ADR-AVG-AUDIT-MANIFEST.md`) | blijft; naam → hoedanigheid geanonimiseerd bij purge indien jurist dat eist | mogelijk (bewijs van goedkeuring) |
| **Audit events** | MANIFEST | append-only; langdurig | actor-naam → actor-rol bij purge indien vereist | mogelijk |
| **Case snapshot / manifest** | MANIFEST | langdurig (`REQUIRES LEGAL VALIDATION`) | onveranderlijk; bevat geen persoonsgegevens (zie ADR) | mogelijk |
| **Content-/document-/disclaimer-hashes** | MANIFEST | langdurig | onveranderlijk | n.v.t. |
| **Bestaande minimale archiefregel** (VOK Art. 5: trajectnaam, sector, type, data, partijen) | ARCHIEF | ongewijzigd t.o.v. nu | ongewijzigd | administratie/geschil |
| **Reliance/disclaimer-versies** | PLATFORM | nooit | versiebeheer, geen persoonsgegevens | n.v.t. |
| **FeeEvent** (bestaand) | zoals nu (`mna_audit`-achtige uitzondering, bewust bewaard) | ongewijzigd | ongewijzigd | administratie |

**Kernregel:** alles in de klasse **CONTENT** verdwijnt met de case volgens de bestaande
bewaartermijn. Alleen de klasse **MANIFEST** kan langer blijven, en alleen als de jurist bevestigt
dat die klasse geen herleidbare persoonsgegevens bevat (`L-01`/`L-02`).

De bestaande verwijder-cascades (`verwijderTrajectData()` + `/avg/verwijder`) worden uitgebreid met
elke nieuwe CONTENT-tabel met `traject_id`, volgens de CLAUDE.md-checklist voor een nieuwe DB-tabel.
`tests/audit-consistentie.mjs` check 6 en `tests/audit-backend.mjs` check 4 dekken dit automatisch.

---

## 2. Antwoord op de architectuur-reviewvragen

### RV-1 — Kan een block worden verwijderd terwijl een document/review ernaar verwijst?

**Nee.** Blocks en blockversies zijn append-only platformdata. Een block dat niet meer gebruikt mag
worden krijgt `status=RETIRED`: niet meer selecteerbaar in nieuwe documenten, maar bestaande
documentversies en reviews die ernaar verwijzen blijven geldig en reproduceerbaar. Er is geen
hard-delete-pad voor blocks. (`O-01`, voorstel — te bevestigen in de architectuurreview.)

### RV-2 — Wat gebeurt er met een review wanneer de inhoud wordt gewijzigd (door specialist óf adviseur)?

Twee soorten wijziging:

- **Structuurwijziging aan een component-definitie** (veld erbij, andere dataslots) → nieuwe
  `block_version`. Bestaande dossier-instances blijven op hun oude versie tot iemand ze migreert.
- **Inhoudelijke wijziging aan een dossier-instance** (de vrije tekst of een dataslot van dit
  component in dit dossier), door de specialist óf door de adviseur → de `BlockReview` op die
  instance-versie gaat naar `SUPERSEDED`/`REVOKED`, de nieuwe instance-versie staat op `REQUIRED`.

In beide gevallen: een document dat de nieuwe versie gebruikt kan niet exporteren tot die versie
`APPROVED` is. Een oude
approval "schuift" nooit door naar een nieuwe versie. (`D-10`.)

### RV-3 — Wat blijft na de AVG-purge in de auditlaag?

Zie `ADR-AVG-AUDIT-MANIFEST.md` §"Antwoord op reviewvraag RV-3". Kort: het manifest (documentversie,
block-ID's + versies, review-metadata + hoedanigheid, disclaimer-versie, policy-versie, hashes,
timestamps), de audit events (geanonimiseerd waar vereist), de bestaande archiefregel, en `mna_audit`
zoals nu. Alle inhoud verdwijnt.

### RV-4 — Kan iemand via een andere route alsnog een hard gate omzeilen?

Ontwerpeis **één egress-policy** (`D-14` / `S-04`). Elk pad dat documentinhoud of dossierdata naar
buiten brengt roept dezelfde policy aan:

| Route | Policy-aanroep vóór afgifte |
|---|---|
| Preview / bekijken in de UI | `canAccess` |
| Download (PDF/tekst/ZIP) | `canExport` + reliance-check |
| Verzendmail (`/mna/*/email`) | `canExport` + `canPublish` + reliance-check |
| API-endpoint dat documenttekst teruggeeft | `canExport` |
| Background job (cron, scheduled export) | `canExport` als de job namens een gebruiker exporteert |
| Oude generator (tijdens migratie) | blijft zijn eigen bestaande checks houden; **krijgt geen nieuwe MoU/composer-uitgang** |
| Dossier-ZIP-export | `canExport` per opgenomen document |

De teststrategie bevat een expliciete gate-integriteitssuite die per route probeert een geblokkeerde
export toch te forceren (`TESTSTRATEGIE-TRANSACTION-OS.md` §Gate-integriteit).

---

## 3. Performance (`S-01` — technische spike)

De bestaande realiteit: `initDB` draaide ~180 D1-statements per koude start (trage login,
opgelost 2 sep door `SCHEMA_VERSION`-fast-path). De nieuwe architectuur mag dat niet opnieuw
introduceren.

Te verkennen in de spike:

- **Schema:** blocks/versies/reviews/manifest/audit als aparte tabellen met de juiste indexes
  (`block_id`, `case_id`, `document_version_id`, `review_status`). `SCHEMA_VERSION` blijft de gate;
  nieuwe `CREATE`/`ALTER` alleen in `initDB()`, nooit los in routemodules.
- **Reads:** een case openen mag geen N+1 over blocks/reviews doen. Eén join-query per view, of
  lazy-load per block-detail.
- **Writes:** audit events en manifest-writes gebatcht waar mogelijk; snapshot-write alleen bij
  officiële export, niet bij elke bewerking.
- **Opslag:** `O-02` — leven snapshots/manifest in D1 (queryable, telt mee voor D1-limieten) of in
  R2 (goedkoper, minder queryable)? Waarschijnlijk manifest in D1 (klein, queryable),
  document-hashes + eventuele grote payloads in R2.
- **Groei:** append-only tabellen groeien monotoon. MANIFEST-klasse heeft een eigen, lange maar
  eindige bewaartermijn (`L-01` vraag 4); CONTENT-klasse wordt door de bestaande purge kort
  gehouden.

---

## 4. Migratie zonder de retentie te omzeilen

- Bij het extraheren van blocks uit de bestaande generatoren (`S-03`) worden **geen** bestaande
  trajectdata gekopieerd naar nieuwe tabellen zonder dat die tabellen in de purge-cascade zitten.
- Elke nieuwe CONTENT-tabel met `traject_id` gaat direct in beide verwijder-cascades + de
  audit-checks, vóór de eerste echte data erin komt.
- De MANIFEST-klasse wordt pas geactiveerd als `ADR-AVG-AUDIT-MANIFEST.md` `DECIDED` is.
