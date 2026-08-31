# Security-invarianten — Koers voor Morgen

Dit bestand is het **security-contract** van het platform. Elke AI-sessie en elke
wijziging aan endpoints, datamodellen, exports, downloads of auth krijgt dit mee.
Een wijziging die één van deze invarianten breekt, gaat niet live — ook niet als
"tijdelijk" of "klein".

Vastgelegd 1 september 2026, n.a.v. een cross-rol-lek waarbij een `SELECT *` +
deny-list ervoor zorgde dat nieuwe kolommen (`bem_tekst`, `verkoopmemorandum_tekst`,
`tussen_code`) automatisch mee-lekten naar de koper. De kern van de fix is niet
"nog een deny-regel", maar: **vergeten moet standaard veilig uitpakken.**

---

## De invarianten

1. **Externe rollen krijgen nooit een rauw database-/ORM-object.**
   Geen `return traject`, geen `SELECT *` die ongefilterd naar `JSON.stringify` gaat.
   Elke externe respons is een expliciete selectie van velden.

2. **Elke externe rol heeft een eigen, expliciete velden-selectie.**
   `koper`, `verkoper`, `meekijker`, `begeleider` en `anoniem` krijgen elk alleen
   wat voor die rol is toegestaan — een allow-list, geen deny-list.

3. **Een nieuwe databasekolom verandert geen bestaande externe respons.**
   `ALTER TABLE mna_trajecten ADD COLUMN x` mag niet resulteren in `API → koper → x`.
   De kolom verschijnt pas in een respons als iemand hem bewust aan de rol-selectie
   toevoegt.

4. **Autorisatie wordt server-side afgedwongen. Frontend-zichtbaarheid is nooit
   autorisatie.** Als de UI een knop verbergt maar het endpoint de actie toestaat,
   is het endpoint fout.

5. **Traject-isolatie: een code van traject A geeft nooit toegang tot traject B.**
   Het traject wordt geresolved uit de URL/route, nooit (mede) uit de meegegeven
   sleutel. (`begeleiderAuth` in `cloudflare-worker.js` doet dit correct — houden zo.)

6. **Rol-isolatie binnen één traject volgt `ROLGEBONDEN_DOCTYPES`
   (`backend/worker/10-mna-communicatie.js`).** Elk `doc_type` dat naar
   `mna_doc_versies` wordt geschreven MOET daar een regel hebben. Een ontbrekend
   type is zichtbaar voor élke rol (`magDocTypeZien` geeft dan `true`).

7. **`tussen_code` is een auth-sleutel, geen gegeven.** Het mag nooit in een
   respons naar verkoper of koper — daarmee passeert die rol `begeleiderAuth`
   (privilege-escalatie over de hele traject-groep).

8. **Exports, downloads, print-flows en e-mailroutes volgen dezelfde rol-/traject-
   regels als de reguliere API.** Een dossier-export mag niet losser zijn dan
   `/mna/traject/{code}`.

9. **De platformbeheerder-muur (`isEigenTraject` / `stripAfgeschermdeVelden`) geldt
   op élke route die trajectdata teruggeeft aan marilyn.html** — inclusief
   e-mail-, audit- en exportroutes. (Zie F4/F8/F13 in `tests/e2e-crosspath-fixes.mjs`.)

10. **Foutmeldingen en logs lekken geen vertrouwelijke velden.** Geen deal-cijfers,
    documenttekst of partij-identiteit in een 4xx/5xx-body of in `console.log`.

11. **Elke gevonden security-regressie wordt een permanente automatische test**
    in `tests/e2e-crosspath-fixes.mjs` (of een e2e-broertje) vóór de fix als
    "klaar" geldt.

---

## Dataclassificatie (voor de rol-selecties)

| Klasse | Voorbeelden | koper | verkoper | begeleider |
|---|---|:--:|:--:|:--:|
| PUBLIEK | `kantoor_naam`, `sector`, `status`, `traject_fase`, `begeleider_naam` | ✅ | ✅ | ✅ |
| BILATERAAL (koper↔verkoper) | `nda_tekst`, `loi_tekst`, `excl_tekst`, `bieding_tekst` | ✅ | ✅ | ✅ |
| VERKOPER↔BEGELEIDER | `bem_tekst`, `waarderingsrapport`, `teaser_tekst` | ❌ | ✅ | ✅ |
| BEGELEIDER-ONLY | `dealvoorstel_tekst`, `verkoopmemorandum_tekst`, `tussen_code`, `koper_code`, `trajectfee_*`, `gebruiker_id`, `aangedragen_door_*` | ❌ | ❌ | ✅ |
| PLATFORMBEHEERDER-ONLY | `notitie` (marilyn), tekenbevoegdheid-notities | ❌ | ❌ | ❌ (alleen marilyn met admin-key) |
| SYSTEM_SECRET | `ADMIN_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, Signhost-checksum | ❌ overal — staat alleen in Cloudflare-secrets |

Bij twijfel: strengere klasse.

---

## Werkwijze bij een security-gevoelige wijziging (solo + AI)

Gebruik **gescheiden AI-contexten** — niet dezelfde sessie die bouwt én goedkeurt:

- **Builder** — kent requirements + architectuur + dit bestand. Bouwt.
- **Breaker** — kent alleen requirements + dit bestand + de implementatie, met de
  opdracht *"bewijs dat het lekt"* (buyer A → seller B, serialisatie-lek, IDOR,
  export losser dan de API, invite/reset-flow-lek, "bedenk 5 nieuwe kolommen die
  een deny-list zouden breken"). Repareert niet.
- **Fixer** — krijgt alleen de bevinding + reproductie + relevante code. Repareert
  uitsluitend dat. Daarna terug naar de Breaker.

Marcel is de **release gate**, niet de menselijke compiler. Akkoord alleen als:

- [ ] Threat model / dit bestand bijgewerkt indien nodig
- [ ] `tests/e2e-crosspath-fixes.mjs` groen (incl. de CONF-vertrouwelijkheidsmatrix)
- [ ] `tests/audit-consistentie.mjs` + `tests/audit-backend.mjs` groen
- [ ] Een verse Breaker-context heeft geen onverklaarde bevinding
- [ ] Exports/downloads/e-mailroutes meegecontroleerd, niet alleen de hoofd-API

---

## Openstaand (grotere architectuurschuld — zie BACKLOG)

- **Allow-list DTO's per rol** i.p.v. de huidige `SELECT *` + gecategoriseerde strip
  in `/mna/traject/{code}` en de andere deal-data-endpoints. De strip (`GEVOELIG` in
  `backend/worker/11-mna-tekenen-beheer.js`) is een tussenstap: expliciet en getest,
  maar nog steeds "verwijder deze" i.p.v. "serialiseer alleen deze".
- **Eén centrale policy-laag** (`rol × resource × actie × veld`) i.p.v. per-endpoint
  logica.
- **CI-gate**: nieuwe kolom in het interne model → waarschuwing; nieuw veld in een
  externe schema → faalt tenzij expliciet goedgekeurd.
- **Externe pentest** van precies deze trust boundaries, zodra er meer dan een
  handvol gebruikers is.
