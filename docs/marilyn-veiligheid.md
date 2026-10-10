# Marilyn — Veiligheid-tab: overkoepelende status (productpunt 22)

## Wat is veranderd (10 okt 2026)

De banner bovenaan de Veiligheid-tab ("Veiligheid actueel — alle verplichte controles op schema")
telde de nachtelijke selfcheck en de ochtendcontrole niet mee, en sectie 0 noemde een ochtendcontrole
groen zodra `checks_geslaagd === checks_totaal` — dus ook bij `0/0` (wat de backend teruggeeft als
`ADMIN_KEY`/`DB` ontbreekt, `voerOchtendcontroleUit()` in `backend/worker/24-veiligheidsdashboard.js`).

Nu (`dagelijkseRunOordeel()` in `marilyn.html`) is een nachtelijke selfcheck of ochtendcontrole alleen
"actueel" als:

- er een run is (`laatste_selfcheck` / `laatste_ochtendcontrole` niet leeg);
- `checks_totaal` een geheel getal > 0 is en `0 <= checks_geslaagd <= checks_totaal`;
- `details` een lijst is met precies `checks_totaal` per-check-objecten met een booleaanse `geslaagd`,
  en het aantal `geslaagd: true` gelijk is aan `checks_geslaagd`;
- alle checks geslaagd zijn (anders: `FAIL (x/y geslaagd)`);
- `ran_at` een geldig tijdstip is en niet ouder dan de **bestaande** 2-dagengrens van knoppentest/E2E.

Anders staat de banner op "Veiligheid NIET actueel" met de reden, sectie 0 (ochtend) wordt rood en
sectie 1 toont onder de gauge "Niet actueel: <reden>". De overige criteria (open kritiek/hoog, diepe
audit, pentest, knoppentest, E2E) zijn ongewijzigd. Geen backend-, API-, rol- of schemawijziging;
geen nieuwe gate, cron of netwerkverzoek.

De statische push-audit (git-hook) wordt getoond als **historisch** gegeven: "laatst gemeld" met
volledige datum. Er is geen vaste pushcadans en hij telt niet mee in de actuele status; `0/0` is nooit
groen.

Actieknoppen (selfcheck, ochtendcontrole, diepe audit, red-team pentest, rapportlink, nieuwe link,
markeer opgelost) melden alleen succes bij een HTTP-succes mét `ok: true` (en voor de rapportlink een
URL). Een "Draai nu"-resultaat dat 0/0, FAIL of inconsistent is, geeft een waarschuwing, geen succes.

## Bewijs — twee gescheiden soorten

### 1. UI-functioneel getest (deze wijziging)

`tests/marilyn-veiligheid.mjs` (ook check 31 in `node tests/audit-consistentie.mjs`) laadt de echte
`marilyn.html` in `node:vm` met een minimale DOM-fixture en een nep-worker, logt echt in, rendert elke
veiligheidssectie en klikt elke actieknop tegen **synthetische** serverantwoorden: ontbrekend, 0/0,
FAIL, malformed, verouderd, ongeldige tijd, annuleren, succes, 401/403/500, netwerkfout, onjuiste JSON,
`ok:false`, en zonder superadmin/geldige sleutel. Er wordt geen echte omgeving, betaalde AI, audit,
mail of deploy aangeroepen.

Dit is **geen bewijs** dat de echte nachtelijke selfcheck of ochtendcontrole draait of slaagt — het
bewijst alleen dat de UI hun resultaten eerlijk weergeeft.

**Diagnose eerste native testrun (10 FAILs):** de vijf detail-varianten (details ontbreken, minder
details dan teller, detail FAIL bij groene teller, detail `null`, `geslaagd` als tekst) × nacht/ochtend
faalden niet op de productcode maar op de testverwachting: de regex verwachtte `<label> details per
check` direct na elkaar, terwijl de banner correct `<label> ongeldig resultaat (details per check
kloppen niet met de teller)` toont. `null`-details worden in de productcode al door de objectguard
afgevangen. Alleen de redenverwachting is aangepast naar deze volledige specifieke reden; `!groen`,
rood en alle negatieve checks zijn ongewijzigd, statusvoorwaarden zijn niet versoepeld.

### 2. Echte controlerun (niet door deze wijziging geleverd of vervangen)

Het bestaande live-bewijs van de echte controleruns (volgens de opdracht: nachtelijke selfcheck 13
checks, ochtendcontrole 10 checks) blijft het bewijs voor een echte controlerun. Het is hier niet
opnieuw uitgevoerd en niet door synthetische tests vervangen; de synthetische tests gebruiken bewust
andere aantallen (4 en 3).

## Status

De nieuwe UI is **nog niet live**: niet gedeployed tot de releasegates (onafhankelijke review,
commitgate, staging/productie-goedkeuring) PASS zijn.
