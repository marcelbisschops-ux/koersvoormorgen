// Losstaande validatie van de multiple-GRONDSLAG in het dealvoorstel (ChatGPT-review 31 aug 2026,
// bevinding #2 — kritiek). Sommige sectoren (zorg) hanteren een OMZET-multiple i.p.v. een
// EBITDA-multiple; dvGetDefaults() droeg die grondslag voorheen niet door, waardoor de
// omzet-range (1–3×) stilzwijgend op de EBITDA werd toegepast.
//
// Toetst: (a) dvGetDefaults() zet grondslag/grondslagBewezen/grondslagPrognose correct per sector;
// (b) dvBerekenClosing / dvBerekenPrijsmechanisme / dvBerekenGevoeligheid rekenen EV = grondslag ×
// multiple; (c) de EBITDA-standaard verandert niet (backwards compatible).
//
// Gebruik: node scripts/validate-grondslag.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src01 = fs.readFileSync(path.join(dir, '..', 'mna', '01-config-sectorprofielen.js'), 'utf8');
const src03 = fs.readFileSync(path.join(dir, '..', 'mna', '03-rekenkern-waardering.js'), 'utf8');

globalThis.location = { search: '' };
globalThis.URLSearchParams = class { get() { return null; } };
globalThis.document = { createElement: () => ({ style: {}, addEventListener() {} }), body: {}, getElementById: () => null };
globalThis.window = {};
globalThis.esc = (s) => String(s == null ? '' : s);
globalThis.S = {};

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvGetDefaults=dvGetDefaults;globalThis.dvBerekenClosing=dvBerekenClosing;globalThis.dvBerekenPrijsmechanisme=dvBerekenPrijsmechanisme;globalThis.dvBerekenGevoeligheid=dvBerekenGevoeligheid;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvGrondslagBewezen=dvGrondslagBewezen;globalThis.dvGrondslagPrognose=dvGrondslagPrognose;');

let pass = 0, fail = 0;
function eq(naam, actual, expected, tol = 0.5) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log((ok ? '  ✓ ' : '  ✗ ') + naam + '  → ' + Math.round(actual) + (ok ? '' : '  (verwacht ' + Math.round(expected) + ')'));
  ok ? pass++ : fail++;
}
function ok(naam, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + naam);
  cond ? pass++ : fail++;
}

// ── TC1 — dvGetDefaults() voor een ZORG-traject: omzet-grondslag ──────────────
// zorgprofiel: multipleBasis:'omzet', multipleLaag:1, multipleHoog:3
{
  console.log('\nTC1 — dvGetDefaults(), sector=zorg (omzet-multiple 1–3×)');
  globalThis.S = {
    traject: { sector: 'zorg', structuur_type: 'bv' },
    _groepData: { financieel_omzet3: '1.200.000', financieel_ebitdaNorm: '400.000' },
    data: {}
  };
  const p = dvGetDefaults();
  ok('grondslag = "omzet"', p.grondslag === 'omzet');
  eq('grondslagBewezen = omzet jaar 3', p.grondslagBewezen, 1200000);
  eq('grondslagPrognose = round(omzet3 × 1,3)', p.grondslagPrognose, 1560000);
  eq('multipleBasis (laag) = 1', p.multipleBasis, 1, 0.001);
  eq('multipleBovengrens (hoog) = 3', p.multipleBovengrens, 3, 0.001);
  eq('ebitdaBewezen blijft de EBITDA (voor schuldafbouw/DCF)', p.ebitdaBewezen, 400000);

  const c = dvBerekenClosing(p);
  eq('evBasis = omzet 1,2M × 1 = 1,2M (NIET 0,4M × 1)', c.evBasis, 1200000);
  eq('deelKoperBasis 51%', c.deelKoperBasis, 612000);
  eq('evPrognose = 1,56M × 3', c.evPrognose, 4680000);
  eq('earn-up = 2.386.800 − 612.000', c.earnUp, 1774800);
  ok('closing.grondslag doorgegeven', c.grondslag === 'omzet');

  const pm = dvBerekenPrijsmechanisme(p);
  // cliff = 1.560.000 × 0,70 = 1.092.000
  eq('scenario "Cliff": grondslagwaarde = cliff × 0,9', pm[0].ebitda, 982800);
  eq('scenario "Cliff": multiple = basis (1×)', pm[0].multiple, 1, 0.001);
  eq('scenario "Cliff": EV = 982.800 × 1', pm[0].ev, 982800);
  eq('scenario "Deels": grondslagwaarde = 1.326.000', pm[1].ebitda, 1326000);
  eq('scenario "Deels": multiple = 2,0× (halverwege 1→3)', pm[1].multiple, 2, 0.001);
  eq('scenario "Deels": EV = 2.652.000', pm[1].ev, 2652000);
  eq('scenario "Prognose gehaald": EV = 1.560.000 × 3', pm[2].ev, 4680000);
  ok('prijsmechanisme grondslag = omzet', pm[0].grondslag === 'omzet');

  const gv = dvBerekenGevoeligheid(p);
  ok('gevoeligheid grondslag = omzet', gv.grondslag === 'omzet');
  eq('gevoeligheid: Bewezen-scenario = omzet 1,2M', gv.ebitdaScenarios[1].ebitda, 1200000);
  eq('gevoeligheid: Prognose-scenario = 1,56M', gv.ebitdaScenarios[2].ebitda, 1560000);
  eq('gevoeligheid: Bewezen × Midden (2×) = 2,4M', gv.ebitdaScenarios[1].ebitda * gv.multiples[1].m, 2400000);

  const b = dvBerekenOpbrengstBrug({ ...p, nettoSchuld: 200000, debtLikeItems: 0, werkkapitaalCorrectie: 0, transactiekostenPct: 2, escrowPct: 12 }, c);
  eq('opbrengst-brug gebruikt de omzet-EV (1,2M)', b.ev, 1200000);
  eq('equity value = 1,2M − 200k − 24k', b.equityValue100, 976000);
}

// ── TC2 — accountancy blijft EBITDA-grondslag ─────────────────────────────────
{
  console.log('\nTC2 — dvGetDefaults(), sector=accountancy (EBITDA-multiple, ongewijzigd)');
  globalThis.S = {
    traject: { sector: 'accountancy', structuur_type: 'bv' },
    _groepData: { financieel_omzet3: '3.000.000', financieel_ebitdaNorm: '600.000' },
    data: {}
  };
  const p = dvGetDefaults();
  ok('grondslag = "ebitda"', p.grondslag === 'ebitda');
  eq('grondslagBewezen = EBITDA (= ebitdaBewezen)', p.grondslagBewezen, 600000);
  eq('grondslagBewezen == ebitdaBewezen', p.grondslagBewezen, p.ebitdaBewezen, 0.001);
  eq('grondslagPrognose == ebitdaPrognose', p.grondslagPrognose, p.ebitdaPrognose, 0.001);
  const c = dvBerekenClosing(p);
  eq('evBasis = EBITDA 600k × multipleBasis', c.evBasis, 600000 * p.multipleBasis);
}

// ── TC3 — oude aanroep zonder grondslagvelden valt terug op EBITDA ────────────
{
  console.log('\nTC3 — p zonder grondslagvelden (oude tests / aanroepen) → EBITDA-fallback');
  const p = { ebitdaBewezen: 288000, ebitdaPrognose: 374400, multipleBasis: 2.5, multipleBovengrens: 4.5, belangPct: 51, cliffPct: 70 };
  ok('dvGrondslagBewezen valt terug op ebitdaBewezen', dvGrondslagBewezen(p) === 288000);
  ok('dvGrondslagPrognose valt terug op ebitdaPrognose', dvGrondslagPrognose(p) === 374400);
  const c = dvBerekenClosing(p);
  eq('evBasis = 288.000 × 2,5 (identiek aan vóór #2)', c.evBasis, 720000);
  eq('earn-up = 492.048 (identiek aan de bestaande oracle)', c.earnUp, 492048);
}

// ── TC4 — zorg + maatschap: grondslag valt terug op EBITDA (maatschap wint) ───
{
  console.log('\nTC4 — sector=zorg + structuur=maatschap → grondslag = ebitda (maatschap-logica wint)');
  globalThis.S = {
    traject: { sector: 'zorg', structuur_type: 'maatschap' },
    _groepData: { financieel_omzet3: '1.200.000', financieel_ebitdaNorm: '400.000', financieel_partnerBel: '150.000' },
    data: {}
  };
  const p = dvGetDefaults();
  ok('grondslag = "ebitda" (niet omzet)', p.grondslag === 'ebitda');
  eq('ebitdaBewezen = 400k − 150k ondernemersloon', p.ebitdaBewezen, 250000);
  eq('grondslagBewezen == gecorrigeerde EBITDA', p.grondslagBewezen, 250000);
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
