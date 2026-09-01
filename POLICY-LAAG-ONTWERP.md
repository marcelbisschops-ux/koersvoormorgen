# Ontwerp — centrale policy-laag voor deal-data (BACKLOG 0.2, laatste stuk)

**Status: BESLIST (1 sep 2026) — Marcel kiest de VOLLEDIGE variant: óók de rol-resolutie
(begeleiderAuth / rolVanCode / isEigenTraject) samenvoegen tot één laag, niet alleen de
veld-filtering. Dit is de grootste en meest risicovolle wijziging aan het platform.**
Datum: 1 september 2026. Opgesteld nadat de per-endpoint allow-list-sweep klaar was.

**Aanpak nu Marcel voor "volledig" koos:**
- **Fase 0 — volledige auth-surface-inventarisatie** (alleen lezen, geen code): elk van de ~126
  aanroepen van `begeleiderAuth` / `rolVanCode` / `isEigenTraject` / `gebruikerViaToken` in kaart,
  gecategoriseerd op mechanisme, wat het beschermt, welke rol-uitkomsten het geeft. Dit is de
  plek waar een latent lek zit; niets omzetten vóór dit compleet is.
- **Fase 1 — ontwerp `resolveRol()` + `filterVoorRol()`** op basis van die inventaris, apart voorleggen.
- **Fase 2 — migratie, endpoint-voor-endpoint**: `node --check` + `audit-backend.mjs` +
  `schema-gate.mjs` (0 verschillen) + verse Breaker-blik + staging, per stap. Nooit big-bang.
- **`/code-review ultra`** (multi-agent cloud-review, door Marcel getriggerd) vóór productie van
  de eerste auth-mechanisme-samenvoeging — dit valt onder werkregel 12 (onafhankelijke blik).
- Voorwaarde: de 5 pending backend-wijzigingen (worker/02,09,10,16,21) eerst gedeployed +
  geverifieerd; niet er bovenop stapelen.

De rest van dit document is het oorspronkelijke voorstel; sectie 3 ("wat NIET in dit voorstel zit")
is door Marcels keuze deels achterhaald — de rol-resolutie zit er nu wél in, als apart, later
fase-2-onderdeel na de veld-verhuizing.

---

# FASE 0 — auth-surface-inventaris (1 sep 2026, alleen gelezen)

Alle aanroepen van de vier mechanismen in `backend/worker/*.js`, geteld en gecategoriseerd.
Dit is de basis voor het ontwerp van `resolveRol()`; nog niets omgezet.

## Mechanisme 1 — `begeleiderAuth(request, code)` · ~45 aanroepen
**Uniform.** Overal hetzelfde: `const a = await begeleiderAuth(request, <code>); if (!a.ok) 401;`
soms extra `if (a.rol !== 'admin' && …)`. Geeft `{ok, rol ∈ {admin, begeleider}, traject_id}`.
`<code>` is meestal de URL-param, soms herleid uit een doc-/versie-rij (`versieRow.traject_id` e.d.).
Modules: 07, 08, 10, 12, 13, 19 (veruit de meeste), 21, 22.
→ **Wordt: `resolveRol()` beperkt tot de uitkomsten admin|begeleider.** Laagste migratierisico —
puur mechanisch, gedrag identiek.

## Mechanisme 2 — `rolVanCode(traject, code)` · ~15 aanroepen
Geeft `verkoper | koper | tussenpersoon | onbekend` o.b.v. welke code matcht. Twee gebruiken:
- **Rol-discriminator** voor wat je teruggeeft (welke velden/rijen): 10:268, 10:340, 15:237,
  22:312, 22:489, 14:102, 08:63, 19:580, 19:682.
- **Guard** samen met `koper_vrijgegeven` / `koperMagCategorie`: 07:73, 07:134, 22:375, 22:396,
  19:1269.
Modules: 07, 08, 10, 14, 15, 19, 22.
→ **Wordt: dezelfde `resolveRol()`, volledige uitkomstenset** {admin, begeleider, verkoper, koper,
  meekijker, onbekend}. `begeleiderAuth` is straks gewoon `resolveRol` met een subset-check.

## Mechanisme 3 — `isEigenTraject(traject)` · ~24 aanroepen — TWEE VERSCHILLENDE DINGEN
- **CC-routing (~10):** `(await isEigenTraject(x)) ? ['marcel@bisschopsfinancing.nl'] : []` —
  bepaalt of Marcel een CC krijgt op een uitgaande mail. 08:35, 10:44, 11:153/223/578, 12:494,
  19:1046/1201, 20:210. **GEEN toegangscontrole — blijft ongemoeid, hoort niet in de policy-laag.**
- **De "muur" (~14):** `if (!(await isEigenTraject(x))) return Unauthorized / {inhoud_afgeschermd:true}
  / stripAfgeschermdeVelden(...)`. 08:53/163, 11:175/450, 12:74/208/228/288/306/382/406/451, 15:274.
  **DIT is toegangscontrole.** → Wordt een *predicaat dat de policy-laag consumeert*:
  `filterVoorRol('traject', rol, obj, { eigenTraject })` — niet zelf een rol.

## Mechanisme 4 — `gebruikerViaToken(request)` · 10 aanroepen
Andere as: haalt de INGELOGDE adviseur uit sessietoken (of e-mail+ww fallback), niet uit een
trajectcode. 09:214/232, 12:23, 16:12/88/125/150/204/504/532.
→ **Blijft een eigen functie**, maar voedt `resolveRol`: een geauthenticeerde adviseur die eigenaar
is van het traject → rol `begeleider`/`adviseur`. Niet samenvoegen, wél koppelen.

## Conclusie Fase 0
"Alles samenvoegen" = **één `resolveRol(request, code, env) → {ok, rol, traject_id, eigenTraject}`**
die intern `begeleiderAuth`- + `rolVanCode`-logica combineert, plus `gebruikerViaToken` als
identiteitsbron. `isEigenTraject` splitst: het muur-gebruik wordt een vlag in de policy-laag, het
CC-gebruik blijft los. Netto ~60 access-control-aanroepen migreren (niet 126 — de CC-routing en de
functiedefinities tellen niet mee).

## Volgorde van migreren (elk: node --check + audit-backend + schema-gate 0-diff + Breaker + staging)
1. `resolveRol()` schrijven + **naast** de bestaande functies zetten, nog niet aansluiten.
   Unit-bewijs: voor elke bestaande `begeleiderAuth`/`rolVanCode`-testcase geeft `resolveRol`
   dezelfde uitkomst.
2. `begeleiderAuth` intern laten delegeren naar `resolveRol` (1 plek, ~45 call-sites ongewijzigd).
3. `rolVanCode`-discriminator-sites → `resolveRol` (module voor module: 10, dan 22, dan 14/15, dan 19).
4. Veld-filtering (`RESOURCE_VELDEN` + `filterVoorRol`) — de `DTO_*`/`adviseurTrajectDTO`/viewer-
   lijsten verhuizen hierheen, endpoint voor endpoint.
5. De muur (`stripAfgeschermdeVelden`) → `filterVoorRol('traject', 'adviseur_extern', …)`.
6. `/code-review ultra` (Marcel triggert) vóór productie van stap 2 en nogmaals na stap 5.

**Randvoorwaarde: de 5 pending backend-wijzigingen eerst gedeployed + geverifieerd.**

---

# FASE 1 — kritieke ontwerpbeslissing die stap 1 blootlegde

`begeleiderAuth` en `rolVanCode` hebben een **verschillend dreigingsmodel** — ze mogen NIET naïef
samengevoegd worden:

| | `begeleiderAuth` | `rolVanCode` + zijn callers |
|---|---|---|
| **Wat is de credential?** | de **sleutel** in `x-admin-key` / `x-tussen-key` / `?key=` | de **trajectcode in het URL-pad zelf** (bearer-token in het pad) |
| De URL-trajectcode is... | alleen "welk traject", géén bewijs | het bewijs zelf |
| Geeft rollen | `admin`, `begeleider` | `verkoper`, `koper`, `tussenpersoon` |

Voorbeeld van de valkuil: bij een `begeleiderAuth`-endpoint is `tussen_code` in het URL-pad **geen**
geldige toegang zonder de bijbehorende sleutel-header (dat was juist de cross-traject-fix van
juli 2026). Bij een `rolVanCode`-endpoint (`/mna/versies/{tussen_code}` e.d.) IS `tussen_code` in
het pad wél de geldige toegang. Eén functie die "de hoogste rol die pad-code óf sleutel toekent"
teruggeeft, zou een `begeleiderAuth`-endpoint openzetten voor pad-code-zonder-sleutel. **Auth-lek.**

**Ontwerpkeuze:** `resolveRol(request, code, env, { modus })` met expliciete `modus`:
- `'sleutel'` → spiegelt `begeleiderAuth`: alleen een sleutel-header/param geeft toegang;
  uitkomsten `admin` | `begeleider` | `{ok:false}`.
- `'padcode'` → spiegelt `rolVanCode`: de code in het pad is de credential; uitkomsten
  `admin` (als óók de sleutel klopt) | `verkoper` | `koper` | `begeleider` | `onbekend`.
- (`'beide'` alleen als er endpoints blijken te zijn die vandaag écht allebei accepteren —
  te controleren tijdens migratie, niet vooraf aannemen.)

Elke migratiestap kiest expliciet de `modus` die bij dat endpoint hoort, en de
equivalentietest bewijst per modus dat de uitkomst gelijk is aan het oude mechanisme.

Genormaliseerde rolnaam: **`begeleider`** overal (de oude `rolVanCode` gaf `'tussenpersoon'`).
Callers die op de letterlijke string `'tussenpersoon'` vergelijken, worden bij hun migratiestap
meegenomen — `grep -rn "'tussenpersoon'" backend/worker` vóór stap 3.

⚠️ **STAP-3-HAZARD (bevestigd door de onafhankelijke review, 1 sep 2026):** `rolVanCodeViaPolicy`
geeft `'tussenpersoon'` terug (byte-getrouw), maar `resolveRol({modus:'padcode'})` geeft
`'begeleider'` voor dezelfde input. `magDocTypeZien` / `ROLGEBONDEN_DOCTYPES` (worker/10) én
~15 `=== 'tussenpersoon'`-vergelijkingen in worker/10,11,12,15,19 zijn op `'tussenpersoon'` gesleuteld.
Zodra stap 3 een `rolVanCode`-caller naar `resolveRol` overzet, matchen die stil niet meer —
faalmodus: een begeleider verliest toegang, of (erger) een doc-type-check evalueert verkeerd.
**Elke stap-3-commit MUST óf een rolnaam-normalisatie-shim meeleveren, óf de matrix + alle
`=== 'tussenpersoon'`-checks in dezelfde commit meeverhuizen naar `'begeleider'`.** Niet
endpoint-voor-endpoint half doen.

---

# STAP 1 — GEDAAN (1 sep 2026, geen productie-impact)

- **`backend/worker/00-policy.js`** — `resolveRol(request, code, env, { modus })` geschreven,
  door **niets** aangeroepen. Plus compat-shims `begeleiderAuthViaPolicy` en `rolVanCodeViaPolicy`
  die de exacte oude return-vormen teruggeven.
- **`backend/tests/policy-equivalentie.mjs`** — draait `resolveRol` (via de shims) tegen een
  gestubde DB voor een matrix van (code, sleutel, is_eigen)-combinaties en vergelijkt met een
  1-op-1 kopie van de HUIDIGE `begeleiderAuth`/`rolVanCode`-logica. Alle combinaties gelijk = groen.
- Bekend, benign verschil: `resolveRol` in `modus:'sleutel'` doet voor een admin-call één extra
  geïndexeerde query (traject ophalen voor `traject_id`/`eigenTraject`) die het oude
  `begeleiderAuth` niet deed. Geen gedragsverschil, wel iets meer werk per admin-request.
  Later te optimaliseren; nu bewust zo voor een volledige return-vorm.

**Nog niet aangesloten. Geen `wrangler deploy` nodig voor stap 1.**

---

# STAP 2 — GEDAAN in code, WACHT OP `/code-review ultra` + deploy (1 sep 2026)

- **`cloudflare-worker.js`**: `import { begeleiderAuthViaPolicy } from './worker/00-policy.js'` +
  de `begeleiderAuth`-closure is nu `(req, code) => begeleiderAuthViaPolicy(req, code, env)`.
  De ~45 call-sites blijven **letterlijk ongewijzigd** (zelfde aanroep, zelfde return-vorm).
- **`worker/00-policy.js`**: `begeleiderAuthViaPolicy` short-circuit't het admin-pad zelf
  (geen traject-query, exact als het oude `begeleiderAuth`), en delegeert de rest naar
  `resolveRol(..., {modus:'sleutel'})`.
- `node --check` (cloudflare-worker.js + alle modules) + `tests/policy-equivalentie.mjs` (**38/38**) +
  `tests/audit-backend.mjs` + volledige `backend/predeploy.sh` dry-run → groen.
- **Verse Breaker-blik: terug, "faithful no-op refactor, geen HIGH/MED".** Verwerkt:
  - LOW: `resolveRol` deed de extra `bf_gebruikers`-query óók voor `{ok:false}`-probes →
    nu alléén bij een geslaagde uitkomst (`geslaagd()`-helper). Geen query-amplificatie meer
    bij het aftasten van geldige trajectcodes.
  - LOW: `String(code)` i.p.v. kaal `code.toUpperCase()` — nu gedocumenteerd als bewuste
    fail-closed-verharding (oud gooide een ongevangen 500 bij een niet-string).
  - Testgat: **echte cross-traject-case toegevoegd** (tweede traject T2; T1's tussen_code tegen
    T2's code → weiger), plus lege/undefined trajectCode en `ADMIN_KEY` leeg/afwezig.
  - Testgat: `tests/policy-equivalentie.mjs` **in `backend/predeploy.sh` gezet** (draait nu bij
    elke deploy, náást de audit).
  - Testbestand verplaatst van `backend/tests/` (fout) naar repo-root `tests/` (conventie).

**→ VOLGORDE VOOR MARCEL:**
1. Verse Breaker terug + eventuele bevindingen verwerkt.
2. Staging-deploy + `tests/e2e-crosspath-fixes.mjs` (CONF-matrix) groen tegen staging.
3. **`/code-review ultra`** — dit is het moment (eerste keer dat `begeleiderAuth` via `resolveRol`
   loopt, 45 endpoints).
4. Pas daarna productie-deploy.

Bekend, benign verschil t.o.v. het oude gedrag (geen gedragswijziging, wel iets meer werk):
voor de non-admin `begeleider`-uitkomst doet `resolveRol` één extra geïndexeerde
`bf_gebruikers`-query (voor de `eigenTraject`-vlag) die het oude `begeleiderAuth` niet deed. De
shim gebruikt die vlag nu niet; hij komt van pas bij stap 5 (de muur).

**STAP 2 — LIVE op productie (1 sep 2026, ~15:00).** CONF-matrix tegen productie: **71/71 groen**.
Onafhankelijke brede review vooraf: "SOUND for production, geen HIGH/MED". Gecommit `f9a910c`.

---

# STAP 3 — GEDAAN in code, wacht op Breaker + staging + deploy (1 sep 2026)

Aanpak: **géén** per-endpoint-omzetting van de ~15 `rolVanCode`-callers (dat zou de
`'tussenpersoon'`-valkuil hierboven raken). In plaats daarvan:

- **`rolVanCode` in `cloudflare-worker.js` is nu `const rolVanCode = rolVanCodeViaPolicy`** —
  delegeert naar de byte-getrouwe kopie in `worker/00-policy.js`. Eén implementatie. Alle ~15
  call-sites én alle `=== 'tussenpersoon'`-checks blijven **letterlijk ongewijzigd**.
- `resolveRol({modus:'padcode'})` hergebruikt intern `rolVanCodeViaPolicy` (één string-mapping) en
  geeft **`'tussenpersoon'`** terug — byte-getrouw aan de oude `rolVanCode`, dus de valkuil is
  vermeden i.p.v. omzeild.
- `tests/policy-equivalentie.mjs`: sectie 3 bewijst nu `resolveRol(padcode) ⇔ OUD_rolVanCode`
  (incl. de naam `'tussenpersoon'`). **39/39 groen** + volledige predeploy dry-run groen.
- Diff: 3 bestanden, +34/−24 (waarvan 1 testbestand).

Risico laag: `rolVanCode` was een pure 7-regel-stringvergelijking; de kopie is karakter-identiek.
`function` → `const`: alle call-sites draaien request-time (ná module-init), geen TDZ.

**→ Voor Marcel:** Breaker terug → staging-deploy + CONF-matrix → productie-deploy. **Geen
`/code-review ultra` nodig** voor stap 3 (afspraak: ultra alleen bij stap 2 en na stap 5).

---

## 1. Wat is er nu

Elke endpoint die trajectdata teruggeeft doet **zelf** twee dingen:

1. **Rol bepalen** — via één van drie losse mechanismen:
   | Mechanisme | Wat het doet | Aantal modules |
   |---|---|---|
   | `begeleiderAuth(request, code)` | admin-key OF `tussen_code` van het traject | 12 |
   | `rolVanCode(traject, code)` | verkoper / koper / tussenpersoon / onbekend o.b.v. welke code matcht | 8 |
   | `isEigenTraject(traject)` / `gebruikerViaToken(request)` | is dit een traject van Bisschops zelf / welke ingelogde adviseur | 8 / 3 |

2. **Velden kiezen** — een lijst die per endpoint apart is opgeschreven. Sinds deze sessie deels
   gecentraliseerd (`DTO_BASIS` c.s. in `worker/11`, `ADVISEUR_TRAJECT_DTO_VELDEN` +
   `adviseurTrajectDTO()` in `worker/02`), maar nog niet overal.

**Het risico** dat overblijft: een nieuwe endpoint (of een nieuwe kolom) sluit niet automatisch aan
op de juiste lijst. De schema-gate (`tests/schema-gate.mjs`) vángt dat nu, maar dat is een net —
geen structuur.

---

## 2. Voorstel — in het kort

**Eén module die per (resource × rol) de toegestane velden kent. Elke endpoint filtert zijn
respons door die ene functie. De rol-bepaling blijft zoals hij is.**

```
worker/00-policy.js  (nieuw, of sectie in 02-config-constanten.js)

  RESOURCE_VELDEN = {
    traject:        { verkoper: [...], koper: [...], koper_na_nda: [...], begeleider: [...], adviseur: [...] },
    doc_versie:     { verkoper: [...], koper: [...], begeleider: [...] },
    mna_data_rij:   { verkoper: [...], koper: [...], begeleider: [...], meekijker: [...] },
    document_meta:  { ... },
  }

  filterVoorRol(resource, rol, obj)   → nieuw plat object met alléén toegestane, aanwezige velden
  filterLijstVoorRol(resource, rol, rijen)
```

De lijsten die er nu al zijn (`DTO_BASIS` + `DTO_VERKOPER_EXTRA` + …, `ADVISEUR_TRAJECT_DTO_VELDEN`,
de viewer-`SELECT`-kolommen) **verhuizen hier naartoe** — het is een verhuizing, geen herontwerp.
Gedrag blijft identiek; de schema-gate bewijst dat na elke stap.

**Migratie:** endpoint-voor-endpoint, elke stap via staging + verse Breaker-blik, precies zoals de
sweep die net af is. Elk al-omgezet endpoint gaat van zijn eigen literal naar `filterVoorRol(...)`.

---

## 3. Wat NIET in dit voorstel zit (bewust)

- **De drie rol-mechanismen samenvoegen.** Dat raakt 126 aanroepen en is de gevaarlijkste
  denkbare wijziging aan dit platform (auth). Buiten scope. Ze blijven alle drie bestaan; alleen
  de veld-filtering wordt centraal.
- **De marilyn-"muur" (`stripAfgeschermdeVelden`) nu al omzetten.** Die hoort bij deze policy-laag
  (hij wordt dan `filterVoorRol('traject', 'adviseur_extern', ...)`), maar pas nadat de laag staat
  en op de externe rollen bewezen is.
- **Nieuwe functionaliteit.** Puur structuur.

---

## 4. Beslissingen die ik van jou nodig heb

**A. Nu of parkeren?**
De per-endpoint sweep heeft de bekende lekken gedicht. Deze policy-laag is *drift-preventie voor de
toekomst*, geen open gat. Opties:
- **Nu doen** — zolang dit stuk code vers in het hoofd zit.
- **Parkeren tot na de eerste betalende externe adviseurs** — dan is er meer echt gebruik om tegen
  te testen, maar ook meer risico bij een wijziging.
*Mijn advies: nu de lijsten-verhuizing doen (laag risico, schema-gate dekt het), de muur-omzetting
parkeren.*

**B. Scope — alleen veld-filtering, of ook rol-resolutie?**
- **Alleen veld-filtering centraliseren** (voorstel hierboven) — laag risico.
- **Ook de rol-resolutie** — hoog risico, apart traject, niet nu.
*Mijn advies: alleen veld-filtering.*

**C. Waar komt het te staan?**
- Nieuwe module `worker/00-policy.js` (laadt vóór de rest; expliciet vindbaar).
- Of een sectie in het bestaande `worker/02-config-constanten.js` (waar `adviseurTrajectDTO` nu al staat).
*Mijn advies: nieuwe module — dit is beveiligingslogica, verdient een eigen bestand.*

**D. Tempo.**
Zelfde ritme als de sweep: één endpoint per keer, staging, Breaker, dan pas de volgende. Akkoord?

---

## 5. Als je A=nu, B=alleen-velden, C=nieuwe-module kiest — dan is de eerste stap:

1. `worker/00-policy.js` aanmaken met `RESOURCE_VELDEN.traject` gevuld uit de bestaande
   `DTO_*`-constanten in `worker/11` (letterlijk overnemen) + `filterVoorRol`.
2. `worker/11` `/mna/traject/{code}` laten filteren via `filterVoorRol` i.p.v. de inline `DTO_*`.
3. `node --check` + `tests/audit-backend.mjs` + `tests/schema-gate.mjs` (moet **0 verschillen** geven —
   bewijs dat de verhuizing niets veranderde) + Breaker-blik → staging → productie.
4. Herhalen voor `adviseurTrajectDTO`-endpoints, dan `doc_versie`, dan `mna_data_rij`, dan de muur.
