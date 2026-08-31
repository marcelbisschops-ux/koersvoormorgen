// Losstaande validatie van de bod-vergelijker / Deal Value Matrix (onderhandel-playbook onderdeel 4,
// werkregel 13). Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenBiedingVergelijking()
// tegen handmatig doorgerekende testcases. Kern: de euro-bedragen zijn een zuivere herrekening van de
// ingevoerde percentages; de totaalscore is de gedocumenteerde gewogen som; <2 geldige biedingen →
// status 'onvoldoende' (geen misleidende matrix).
//
// Gebruik: node scripts/validate-bod-vergelijker.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenBiedingVergelijking=dvBerekenBiedingVergelijking;globalThis.dvTabelBiedingVergelijking=dvTabelBiedingVergelijking;');

let pass = 0, fail = 0;
function eq(naam, actual, expected, tol = 0.5) {
  const okk = Math.abs(actual - expected) <= tol;
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + actual + (okk ? '' : '  (verwacht ' + expected + ')'));
  okk ? pass++ : fail++;
}
function is(naam, actual, expected) {
  const okk = actual === expected;
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + JSON.stringify(actual) + (okk ? '' : '  (verwacht ' + JSON.stringify(expected) + ')'));
  okk ? pass++ : fail++;
}
function ok(naam, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + naam); cond ? pass++ : fail++; }

// Bod A: koopsom 3.000.000 ; 60% cash / 15% escrow / 10% earn-out / 15% behouden ; geen vendor loan
//   eigen middelen, 2 voorwaarden, 12 weken, fit hoog
// cashNu   = 3.000.000 × 0,60           = 1.800.000
// escrow   = 3.000.000 × 0,15           =   450.000
// earn-out = 3.000.000 × 0,10           =   300.000
// behouden = 3.000.000 × 0,15           =   450.000
// sPrijs = 3.000.000 / max(3.000.000) × 100 = 100
// sZekerheidCash = 1.800.000 / 3.000.000 × 100 = 60
// sTiming = 100 − (12/26 × 100) = 53,846 → 54
// sDealZekerheid = 100(eigen)×0,6 + max(0,100−2×15)×0,4 = 60 + 70×0,4 = 60 + 28 = 88
// sFit = 100
// totaal = 100×0,30 + 60×0,25 + 88×0,20 + 54×0,10 + 100×0,15
//        = 30 + 15 + 17,6 + 5,4 + 15 = 83  (afronding op sTiming 54: 30+15+17.6+5.4+15 = 83)
const bodA = { naam: 'Koper Alfa', ev: 3000000, cashPct: 60, escrowPct: 15, earnOutPct: 10, behoudenPct: 15,
  vendorLoan: 0, aantalVoorwaarden: 2, financiering: 'eigen', wekenTotClosing: 12, strategischeFit: 'hoog' };
// Bod B: koopsom 2.600.000 ; 80% cash / 10% escrow / 0 earn-out / 10% behouden ; vendor loan 200.000
//   commitment brief, 4 voorwaarden, 20 weken, fit midden
// cashNu = 2.600.000 × 0,80 − 200.000 = 2.080.000 − 200.000 = 1.880.000
// sPrijs = 2.600.000 / 3.000.000 × 100 = 86,667 → 87
// sZekerheidCash = 1.880.000 / 2.600.000 × 100 = 72,308 → 72
// sTiming = 100 − (20/26 × 100) = 23,077 → 23
// sDealZekerheid = 65(commitment)×0,6 + max(0,100−4×15)×0,4 = 39 + 40×0,4 = 39 + 16 = 55
// sFit = 66
// totaal = 87×0,30 + 72×0,25 + 55×0,20 + 23×0,10 + 66×0,15
//        = 26,1 + 18 + 11 + 2,3 + 9,9 = 67,3 → 67
const bodB = { naam: 'Koper Beta', ev: 2600000, cashPct: 80, escrowPct: 10, earnOutPct: 0, behoudenPct: 10,
  vendorLoan: 200000, aantalVoorwaarden: 4, financiering: 'commitment', wekenTotClosing: 20, strategischeFit: 'midden' };

// ── TC1 — twee biedingen: euro-herrekening + scores + ranglijst ─────
{
  console.log('\nTC1 — twee biedingen (A vs B)');
  const v = dvBerekenBiedingVergelijking([bodA, bodB]);
  is('status', v.status, 'ok');
  const A = v.biedingen[0], Bx = v.biedingen[1];
  eq('A cash bij closing', A.cashNu, 1800000);
  eq('A escrow', A.escrowBedrag, 450000);
  eq('A earn-out', A.earnOutBedrag, 300000);
  eq('A behouden belang', A.behoudenBedrag, 450000);
  eq('A sPrijs', A.sPrijs, 100);
  eq('A sZekerheidCash', A.sZekerheidCash, 60);
  eq('A sTiming', A.sTiming, 54, 1);
  eq('A sDealZekerheid', A.sDealZekerheid, 88);
  eq('A sFit', A.sFit, 100);
  eq('A totaalscore', A.totaal, 83, 1);
  eq('B cash bij closing (na vendor loan)', Bx.cashNu, 1880000);
  eq('B sPrijs', Bx.sPrijs, 87, 1);
  eq('B sZekerheidCash', Bx.sZekerheidCash, 72, 1);
  eq('B sDealZekerheid', Bx.sDealZekerheid, 55);
  eq('B totaalscore', Bx.totaal, 67, 1);
  is('ranglijst: A boven B', v.ranglijst[0].naam, 'Koper Alfa');
}

// ── TC2 — minder dan 2 geldige biedingen → geen matrix ─────────────
{
  console.log('\nTC2 — onvoldoende input (GOUDEN STANDAARD: geen misleidende matrix)');
  is('leeg', dvBerekenBiedingVergelijking([]).status, 'onvoldoende');
  is('één bod', dvBerekenBiedingVergelijking([bodA]).status, 'onvoldoende');
  is('bod zonder naam telt niet', dvBerekenBiedingVergelijking([bodA, { ev: 1000000 }]).status, 'onvoldoende');
  is('bod met ev 0 telt niet', dvBerekenBiedingVergelijking([bodA, { naam: 'X', ev: 0 }]).status, 'onvoldoende');
  ok('tabel toont nette melding', dvTabelBiedingVergelijking({ status: 'onvoldoende', aantal: 1 }).includes('Minimaal twee biedingen'));
}

// ── TC3 — betaalpercentages die niet optellen tot 100 → waarschuwing ──
{
  console.log('\nTC3 — betaalstructuur telt niet op tot ~100%');
  const v = dvBerekenBiedingVergelijking([
    { ...bodA, cashPct: 50, escrowPct: 10, earnOutPct: 0, behoudenPct: 10 },   // som 70
    bodB
  ]);
  ok('somWaarschuwing gezet op het foute bod', v.biedingen[0].somWaarschuwing === true);
  ok('B geen waarschuwing (som 100)', v.biedingen[1].somWaarschuwing === false);
  ok('tabel toont de rode controleregel', dvTabelBiedingVergelijking(v).includes('tellen niet op tot ~100%'));
}

// ── TC4 — derde bod, hoogste prijs, verschuift sPrijs-schaal ───────
{
  console.log('\nTC4 — drie biedingen, hoogste koopsom herijkt de prijs-as');
  const bodC = { naam: 'Koper Gamma', ev: 4000000, cashPct: 70, escrowPct: 20, earnOutPct: 0, behoudenPct: 10,
    vendorLoan: 0, aantalVoorwaarden: 1, financiering: 'eigen', wekenTotClosing: 8, strategischeFit: 'hoog' };
  const v = dvBerekenBiedingVergelijking([bodA, bodB, bodC]);
  eq('C sPrijs = 100 (nu de hoogste)', v.biedingen[2].sPrijs, 100);
  eq('A sPrijs = 3M/4M × 100 = 75', v.biedingen[0].sPrijs, 75, 1);
  is('ranglijst kop = Gamma', v.ranglijst[0].naam, 'Koper Gamma');
  ok('tabel-HTML bevat 3 datakolommen + de disclaimer', (() => {
    const h = dvTabelBiedingVergelijking(v);
    return h.includes('Koper Alfa') && h.includes('Koper Beta') && h.includes('Koper Gamma') && h.includes('geen platformoordeel');
  })());
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
