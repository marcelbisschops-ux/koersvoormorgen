// Losstaande validatie van de opbrengst-brug (backlogpunt 7, werkregel 13).
// Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenOpbrengstBrug() +
// de netto-schuld-default in dvGetDefaults() tegen handmatig doorgerekende testcases.
//
// Gebruik: node scripts/validate-opbrengstbrug.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;globalThis.dvGetDefaults=dvGetDefaults;');

let pass = 0, fail = 0;
function eq(naam, actual, expected, tol = 0.5) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log((ok ? '  ✓ ' : '  ✗ ') + naam + '  → ' + Math.round(actual) + (ok ? '' : '  (verwacht ' + Math.round(expected) + ')'));
  ok ? pass++ : fail++;
}

// ── TC1 — kale brug, geen earn-out ────────────────────────────────────────────
// ev = 400.000 × 5,0 = 2.000.000 ; belang 51%
// equity100 = 2.000.000 − 300k − 100k − 50k − (2%×2.000.000=40k) = 1.510.000
// verkocht 51% = 770.100 ; escrow 12% = 92.412 ; cash = 677.688 ; gerealiseerd = 770.100
{
  console.log('\nTC1 — kale brug (geen earn-out)');
  const p = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
    nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: false, earnOutPct: 20 };
  const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
  eq('ev', b.ev, 2000000);
  eq('transactiekosten (2% van EV)', b.transactiekosten, 40000);
  eq('equity value 100%', b.equityValue100, 1510000);
  eq('verkocht belang 51%', b.verkochtBelangWaarde, 770100);
  eq('escrowbedrag (12%)', b.escrowBedrag, 92412);
  eq('uitgestelde earn-out (uit)', b.earnOutUitgesteld, 0);
  eq('cash bij closing', b.cashBijClosing, 677688);
  eq('verwachte gerealiseerde waarde', b.verwachteGerealiseerd, 770100);
}

// ── TC2 — met earn-out ───────────────────────────────────────────────────────
// earn-out 20% van 770.100 = 154.020 ; cash = 770.100 − 92.412 − 154.020 = 523.668
{
  console.log('\nTC2 — met uitgestelde earn-out (20%)');
  const p = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
    nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20 };
  const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
  eq('uitgestelde earn-out', b.earnOutUitgesteld, 154020);
  eq('cash bij closing', b.cashBijClosing, 523668);
  eq('verwachte gerealiseerde waarde (escrow + earn-out terug)', b.verwachteGerealiseerd, 770100);
}

// ── TC3 — negatieve werkkapitaalcorrectie verhoogt de opbrengst ───────────────
// wc = −80.000 → equity100 = 2.000.000 − 300k − 100k − (−80k) − 40k = 1.640.000
{
  console.log('\nTC3 — negatieve werkkapitaalcorrectie (WC-overschot bij closing)');
  const p = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
    nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: -80000, transactiekostenPct: 2,
    escrowPct: 12, escrowMaanden: 18, earnOutAan: false, earnOutPct: 20 };
  const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
  eq('equity value 100% (WC telt op)', b.equityValue100, 1640000);
}

// ── TC4 — dvGetDefaults(): netto schuld voorgevuld uit balansvelden, of 0 ─────
{
  console.log('\nTC4 — dvGetDefaults netto-schuld-default');
  S.traject = { sector: 'accountancy', structuur_type: 'bv' };
  S._groepData = { financieel_kortlopendeSchulden: '200000', financieel_langlopendeSchulden: '500000', financieel_liquideMiddelen: '150000' };
  S.data = S._groepData;
  eq('nettoSchuld = 200k + 500k - 150k = 550k', dvGetDefaults().nettoSchuld, 550000);
  S._groepData = {}; S.data = {};
  eq('lege balansvelden → 0 (geen gok)', dvGetDefaults().nettoSchuld, 0);
  const d = dvGetDefaults();
  eq('debtLikeItems default 0', d.debtLikeItems, 0);
  eq('werkkapitaalCorrectie default 0', d.werkkapitaalCorrectie, 0);
  eq('transactiekostenPct gedocumenteerde default 2', d.transactiekostenPct, 2);
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
