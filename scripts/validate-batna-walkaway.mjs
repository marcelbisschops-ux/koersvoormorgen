// Losstaande validatie van BATNA & walk-away (onderhandel-playbook onderdeel 2, werkregel 13).
// Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenBatna() tegen handmatig
// doorgerekende testcases. Kern: nooit een gegokte ondergrens (walk-away leeg → status
// 'nietIngevuld'), en het BOVEN/KRAP/ONDER-oordeel exact op de juiste drempels.
//
// Gebruik: node scripts/validate-batna-walkaway.mjs
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
globalThis.fmtGeld = (n) => '€' + Math.round(n || 0);
globalThis.S = {};

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenBatna=dvBerekenBatna;globalThis.dvTabelBatna=dvTabelBatna;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;');

let pass = 0, fail = 0;
function is(naam, actual, expected) {
  const okk = actual === expected;
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + JSON.stringify(actual) + (okk ? '' : '  (verwacht ' + JSON.stringify(expected) + ')'));
  okk ? pass++ : fail++;
}
function eq(naam, actual, expected, tol = 0.5) {
  const okk = Math.abs(actual - expected) <= tol;
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + Math.round(actual) + (okk ? '' : '  (verwacht ' + Math.round(expected) + ')'));
  okk ? pass++ : fail++;
}
function ok(naam, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + naam); cond ? pass++ : fail++; }

// Basis: evBasis 2.000.000 ; belang 51% ; equity100 1.510.000 ; verkocht 770.100
// escrow 12% × 770.100 = 92.412 ; earn-out 20% × 770.100 = 154.020
// cash bij closing (met earn-out) = 770.100 − 92.412 − 154.020 = 523.668
const basis = {
  ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
  nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
  escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20
};
function run(extra) {
  const p = { ...basis, ...extra };
  const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
  return dvBerekenBatna(p, dvBerekenClosing(p), b);
}

// ── TC1 — walk-away leeg → nooit een gegokte ondergrens ─────────────
{
  console.log('\nTC1 — walk-awayprijs niet ingevuld (GOUDEN STANDAARD)');
  const r = run({ walkAwayPrijs: 0, batnaKeuze: 'zelfstandig' });
  is('status', r.status, 'nietIngevuld');
  is('geen oordeel/marge gezet', r.margeCash, undefined);
  is('batnaKeuze bewaard', r.batnaKeuze, 'zelfstandig');
  ok('tabel toont "niet ingevuld"-melding', dvTabelBatna(r).includes('Walk-awayprijs niet ingevuld'));
}

// ── TC2 — walk-away ONDER de zekere cash → ruimBoven ────────────────
// cash bij closing = 523.668 ; walk-away 400.000 → margeCash +123.668
{
  console.log('\nTC2 — walk-away onder de zekere cash → BOVEN');
  const r = run({ walkAwayPrijs: 400000, batnaKeuze: 'later', batnaTijdsdruk: 'laag' });
  is('status', r.status, 'ruimBoven');
  eq('margeCash', r.margeCash, 123668);
  eq('margeTotaal', r.margeTotaal, 370100);   // 770.100 − 400.000
  ok('badge BOVEN DE WALK-AWAY', dvTabelBatna(r).includes('BOVEN DE WALK-AWAY'));
}

// ── TC3 — walk-away tussen zekere cash en totale tegenprestatie → krap ──
// walk-away 600.000: > cash 523.668, < totaal 770.100
{
  console.log('\nTC3 — walk-away tussen cash en totale tegenprestatie → KRAP');
  const r = run({ walkAwayPrijs: 600000 });
  is('status', r.status, 'krap');
  ok('margeCash negatief', r.margeCash < 0);
  ok('margeTotaal positief', r.margeTotaal > 0);
  ok('badge KRAP', dvTabelBatna(r).includes('KRAP'));
}

// ── TC4 — walk-away boven de totale tegenprestatie → onder ──────────
{
  console.log('\nTC4 — walk-away boven de totale tegenprestatie → ONDER');
  const r = run({ walkAwayPrijs: 850000, batnaKeuze: 'andere_koper', batnaTijdsdruk: 'hoog' });
  is('status', r.status, 'onder');
  ok('margeTotaal negatief', r.margeTotaal < 0);
  ok('badge ONDER DE WALK-AWAY', dvTabelBatna(r).includes('ONDER DE WALK-AWAY'));
  ok('advies: niet accepteren', dvTabelBatna(r).includes('niet accepteren zoals het nu ligt'));
}

// ── TC5 — grensgeval: walk-away exact gelijk aan de zekere cash → ruimBoven ──
{
  console.log('\nTC5 — walk-away exact gelijk aan de zekere cash (grens) → BOVEN');
  const r = run({ walkAwayPrijs: 523668 });
  is('status (margeCash == 0 telt als boven)', r.status, 'ruimBoven');
  eq('margeCash ~0', r.margeCash, 0);
}

// ── TC6 — BATNA-waarde vergelijking ────────────────────────────────
{
  console.log('\nTC6 — geschatte BATNA-waarde naast de dealopbrengst');
  const r = run({ walkAwayPrijs: 400000, batnaWaarde: 500000 });
  ok('batnaVergelijk aanwezig', r.batnaVergelijk !== null);
  eq('verschil cash vs BATNA-waarde', r.batnaVergelijk.verschilCash, 23668);  // 523.668 − 500.000
  ok('tabel toont de vergelijking', dvTabelBatna(r).includes('t.o.v. alternatief'));
}

// ── TC7 — verkopersvertrouwelijkheid staat in het blok ─────────────
{
  console.log('\nTC7 — disclaimer: niet delen met de koper');
  const html = dvTabelBatna(run({ walkAwayPrijs: 400000 }));
  ok('blok waarschuwt tegen delen met de koper', html.includes('deel het niet met de koper'));
  ok('blok noemt "geen platformberekening"', html.includes('geen platformberekening'));
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
