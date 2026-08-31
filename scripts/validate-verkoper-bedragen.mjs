// Losstaande validatie van dvVerkoperBedragen() — de éne centrale bron van waarheid voor de
// bedragen die in het dealvoorstel allemaal op "bedrag bij closing" lijken maar economisch
// verschillend zijn (ChatGPT-review 31 augustus 2026, werkregel 8/13).
//
// Doel: aantonen dat de vijf grootheden strikt gescheiden blijven en dat NOOIT de toegerekende
// ondernemingswaarde per ongeluk als "cash voor de verkoper" kan terugkomen.
//
// Gebruik: node scripts/validate-verkoper-bedragen.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvVerkoperBedragen=dvVerkoperBedragen;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;');

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

// ── TC1 — de testcase uit de ChatGPT-review, exacte cijfers ────────────────
// ebitdaBewezen 288.000 ; prognose 374.400 (=round(288.000×1,3)) ; multiples 2,5 / 4,5 ; belang 51%
// netto schuld 528.000 (288k kortlopend + 360k langlopend − 120k liquide) ; transactiekosten 2%
// evBasis            = 288.000 × 2,5              = 720.000
// deelKoperBasis     = 720.000 × 51%             = 367.200   ← toegerekende EV, GEEN cash
// transactiekosten   = 720.000 × 2%              = 14.400
// equityValue100     = 720.000 − 528.000 − 14.400 = 177.600
// verkocht 51%       = 177.600 × 51%             = 90.576
// escrow 12%         = 90.576 × 12%              = 10.869
// cash bij closing   = 90.576 − 10.869           = 79.707    ← DIT is de verkopersopbrengst
// retained 49%       = 177.600 × 49%             = 87.024
// evPrognose         = 374.400 × 4,5             = 1.684.800
// earnUp EV-alloc    = (1.684.800×51%) − 367.200 = 859.248 − 367.200 = 492.048
// EV→equity-factor   = 177.600 / 720.000         = 0,246667
// earnUp verkoper    = 492.048 × 0,246667        = 121.372
{
  console.log('\nTC1 — ChatGPT-review-testcase (288k / 374,4k / 2,5× / 4,5× / 51% / netto schuld 528k)');
  const p = {
    ebitdaBewezen: 288000, multipleBasis: 2.5, ebitdaPrognose: 374400, multipleBovengrens: 4.5, belangPct: 51,
    nettoSchuld: 528000, debtLikeItems: 0, werkkapitaalCorrectie: 0, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: false
  };
  const closing = dvBerekenClosing(p);
  const brug = dvBerekenOpbrengstBrug(p, closing);
  const vb = dvVerkoperBedragen(p, closing, brug);

  eq('toegerekendeEVVerkochtBelang (EV × 51%)', vb.toegerekendeEVVerkochtBelang, 367200);
  eq('verkopersopbrengstCashClosing (equity-bridge)', vb.verkopersopbrengstCashClosing, 79707, 2);
  eq('verkopersopbrengstVerwacht (cash + escrow)', vb.verkopersopbrengstVerwacht, 90576, 2);
  eq('retainedEquity (49%-belang)', vb.retainedEquity, 87024, 2);
  eq('earnUpEVAllocation', vb.earnUpEVAllocation, 492048, 2);
  eq('EV→equity-factor ×1e6', vb.evNaarEquityFactor * 1e6, 246667, 5);
  eq('earnUpSellerConsideration', vb.earnUpSellerConsideration, 121372, 5);

  ok('cash bij closing ≪ toegerekende EV (de verwarring uit de review)',
    vb.verkopersopbrengstCashClosing < vb.toegerekendeEVVerkochtBelang * 0.25);
  ok('geen enkele grootheid is stilzwijgend gelijk aan een andere',
    vb.verkopersopbrengstCashClosing !== vb.toegerekendeEVVerkochtBelang &&
    vb.earnUpSellerConsideration !== vb.earnUpEVAllocation);
}

// ── TC2 — earn-out aan: verwachte opbrengst neemt escrow + earn-out mee terug ──
{
  console.log('\nTC2 — met uitgestelde earn-out 20%');
  const p = {
    ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
    nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20
  };
  const closing = dvBerekenClosing(p);
  const brug = dvBerekenOpbrengstBrug(p, closing);
  const vb = dvVerkoperBedragen(p, closing, brug);
  eq('cash bij closing', vb.verkopersopbrengstCashClosing, 523668, 2);
  eq('verwachte opbrengst (cash + escrow + earn-out)', vb.verkopersopbrengstVerwacht, 770100, 2);
  ok('verwacht > cash zolang er uitgestelde delen zijn', vb.verkopersopbrengstVerwacht > vb.verkopersopbrengstCashClosing);
}

// ── TC3 — schuld ≥ EV: earn-up voor de verkoper is exact 0, geen negatief bedrag ──
{
  console.log('\nTC3 — netto schuld ≥ EV');
  const p = {
    ebitdaBewezen: 300000, multipleBasis: 4.0, ebitdaPrognose: 390000, multipleBovengrens: 5.0, belangPct: 51,
    nettoSchuld: 1500000, debtLikeItems: 0, werkkapitaalCorrectie: 0, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: false
  };
  const closing = dvBerekenClosing(p);
  const brug = dvBerekenOpbrengstBrug(p, closing);
  const vb = dvVerkoperBedragen(p, closing, brug);
  eq('EV→equity-factor = 0', vb.evNaarEquityFactor, 0, 0.0001);
  eq('earnUpSellerConsideration = 0', vb.earnUpSellerConsideration, 0);
  eq('cash bij closing = 0 (niet negatief)', vb.verkopersopbrengstCashClosing, 0);
  ok('earnUpEVAllocation blijft wél zichtbaar als bruto EV-effect', vb.earnUpEVAllocation > 0);
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
