// Losstaande validatie van de bod-vergelijker / Deal Value Matrix (onderhandel-playbook onderdeel 4,
// werkregel 13). Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenBiedingVergelijking()
// tegen handmatig doorgerekende testcases.
//
// MODEL (herzien 31 aug 2026 na een bug die Marcel bij de eerste vergelijking vond):
//   - `ev` = koopsom voor het VERKOCHTE belang (bijv. de waarde van 51%), zoals de modal 'm invult
//     uit closing.deelKoperBasis.
//   - cashPct + escrowPct + earnOutPct verdelen die koopsom en horen ~100% te zijn (de modal zet
//     cashPct = 100 − escrow − earn-out). Wijkt dat af → somWaarschuwing.
//   - behoudenPct is een % van de HELE onderneming (het niet-verkochte deel), GEEN betaling van de
//     koper. Waarde behouden deel = (ev / (100 − behoudenPct)) × behoudenPct. Telt NIET mee in de
//     betaalstructuur-check.
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
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + Math.round(actual) + (okk ? '' : '  (verwacht ' + Math.round(expected) + ')'));
  okk ? pass++ : fail++;
}
function is(naam, actual, expected) {
  const okk = actual === expected;
  console.log((okk ? '  ✓ ' : '  ✗ ') + naam + '  → ' + JSON.stringify(actual) + (okk ? '' : '  (verwacht ' + JSON.stringify(expected) + ')'));
  okk ? pass++ : fail++;
}
function ok(naam, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + naam); cond ? pass++ : fail++; }

// Bod A: koopsom (verkocht 85%) 3.000.000 ; 75% cash / 15% escrow / 10% earn-out (= 100) ;
//   15% behouden belang van de hele onderneming ; geen vendor loan ; eigen middelen, 2 voorwaarden,
//   12 weken, fit hoog.
// cashNu        = 3.000.000 × 0,75              = 2.250.000
// escrow        = 3.000.000 × 0,15              =   450.000
// earn-out      = 3.000.000 × 0,10              =   300.000
// behouden      = (3.000.000 / 85) × 15         =   529.412   (85% verkocht → 100% onderneming = 3.529.412)
// somPct        = 75 + 15 + 10 = 100            → geen waarschuwing
// sZekerheidCash= 2.250.000 / 3.000.000 × 100   = 75
// sTiming       = 100 − (12/26 × 100)           = 53,85
// sDealZekerheid= 100(eigen)×0,6 + (100−2×15)×0,4 = 60 + 28 = 88
// sFit          = 100
const bodA = { naam: 'Koper Alfa', ev: 3000000, cashPct: 75, escrowPct: 15, earnOutPct: 10, behoudenPct: 15,
  vendorLoan: 0, aantalVoorwaarden: 2, financiering: 'eigen', wekenTotClosing: 12, strategischeFit: 'hoog' };
// Bod B: koopsom (100% verkocht) 2.600.000 ; 90% cash / 10% escrow / 0 earn-out (= 100) ;
//   0% behouden ; vendor loan 200.000 ; commitment brief, 4 voorwaarden, 20 weken, fit midden.
// cashNu        = 2.600.000 × 0,90 − 200.000    = 2.140.000
// escrow        = 2.600.000 × 0,10              =   260.000
// behouden      = 0
// somPct        = 90 + 10 + 0 = 100             → geen waarschuwing
// sZekerheidCash= 2.140.000 / 2.600.000 × 100   = 82,31
// sTiming       = 100 − (20/26 × 100)           = 23,08
// sDealZekerheid= 65(commitment)×0,6 + (100−4×15)×0,4 = 39 + 16 = 55
// sFit          = 66
const bodB = { naam: 'Koper Beta', ev: 2600000, cashPct: 90, escrowPct: 10, earnOutPct: 0, behoudenPct: 0,
  vendorLoan: 200000, aantalVoorwaarden: 4, financiering: 'commitment', wekenTotClosing: 20, strategischeFit: 'midden' };

// ── TC1 — twee biedingen: euro-herrekening + scores + ranglijst ─────
{
  console.log('\nTC1 — twee biedingen (A vs B)');
  const v = dvBerekenBiedingVergelijking([bodA, bodB]);
  is('status', v.status, 'ok');
  const A = v.biedingen[0], Bx = v.biedingen[1];
  eq('A cash bij closing', A.cashNu, 2250000);
  eq('A escrow', A.escrowBedrag, 450000);
  eq('A earn-out', A.earnOutBedrag, 300000);
  eq('A behouden belang (op de HELE-onderneming-basis)', A.behoudenBedrag, 529412, 2);
  ok('A GEEN somWaarschuwing (cash+escrow+earn-out = 100, behouden telt niet mee)', A.somWaarschuwing === false);
  eq('A sPrijs', A.sPrijs, 100);
  eq('A sZekerheidCash', A.sZekerheidCash, 75);
  eq('A sTiming', A.sTiming, 54, 1);
  eq('A sDealZekerheid', A.sDealZekerheid, 88);
  eq('A sFit', A.sFit, 100);
  eq('A totaalscore', A.totaal, 87, 1);
  eq('B cash bij closing (na vendor loan)', Bx.cashNu, 2140000);
  eq('B behouden belang = 0 (100% verkocht)', Bx.behoudenBedrag, 0);
  ok('B GEEN somWaarschuwing', Bx.somWaarschuwing === false);
  eq('B sPrijs', Bx.sPrijs, 87, 1);
  eq('B sZekerheidCash', Bx.sZekerheidCash, 82, 1);
  eq('B sDealZekerheid', Bx.sDealZekerheid, 55);
  eq('B totaalscore', Bx.totaal, 70, 1);
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

// ── TC3 — betaalstructuur van de KOOPSOM telt niet op tot ~100% → waarschuwing ──
{
  console.log('\nTC3 — cash + escrow + earn-out telt niet op tot ~100%');
  const v = dvBerekenBiedingVergelijking([
    { ...bodA, cashPct: 50, escrowPct: 10, earnOutPct: 0, behoudenPct: 15 },   // 50+10+0 = 60
    bodB
  ]);
  ok('somWaarschuwing op het foute bod (som 60)', v.biedingen[0].somWaarschuwing === true);
  ok('B geen waarschuwing (som 100)', v.biedingen[1].somWaarschuwing === false);
  ok('tabel toont de rode controleregel', dvTabelBiedingVergelijking(v).includes('telt niet op tot ~100%'));
  ok('een deelverkoop met een net kloppende koopsomstructuur geeft GEEN waarschuwing',
    dvBerekenBiedingVergelijking([bodA, bodB]).biedingen[0].somWaarschuwing === false);
}

// ── TC4 — derde bod, hoogste prijs, verschuift sPrijs-schaal ───────
{
  console.log('\nTC4 — drie biedingen, hoogste koopsom herijkt de prijs-as');
  const bodC = { naam: 'Koper Gamma', ev: 4000000, cashPct: 80, escrowPct: 20, earnOutPct: 0, behoudenPct: 10,
    vendorLoan: 0, aantalVoorwaarden: 1, financiering: 'eigen', wekenTotClosing: 8, strategischeFit: 'hoog' };
  const v = dvBerekenBiedingVergelijking([bodA, bodB, bodC]);
  eq('C sPrijs = 100 (nu de hoogste)', v.biedingen[2].sPrijs, 100);
  eq('A sPrijs = 3M/4M × 100 = 75', v.biedingen[0].sPrijs, 75, 1);
  ok('C geen somWaarschuwing (80+20+0 = 100)', v.biedingen[2].somWaarschuwing === false);
  is('ranglijst kop = Gamma', v.ranglijst[0].naam, 'Koper Gamma');
  ok('tabel-HTML bevat 3 datakolommen + de disclaimer + de upside-euro-regel', (() => {
    const h = dvTabelBiedingVergelijking(v);
    return h.includes('Koper Alfa') && h.includes('Koper Beta') && h.includes('Koper Gamma')
      && h.includes('geen platformoordeel') && h.includes('Voorwaardelijke/behouden upside');
  })());
}

// ── TC5 — koopsommen liggen een factor >3 uiteen → aparte waarschuwing ──
{
  console.log('\nTC5 — sterk uiteenlopende koopsommen (ongelijke grootheden)');
  const groot = { ...bodA, ev: 3000000 };
  const klein = { ...bodB, ev: 300000 };                       // factor 10
  const v = dvBerekenBiedingVergelijking([groot, klein]);
  eq('evSpreidFactor = 10', v.evSpreidFactor, 10, 0.05);
  ok('evSpreidWaarschuwing = true bij factor 10', v.evSpreidWaarschuwing === true);
  ok('tabel toont de spreidings-controleregel', dvTabelBiedingVergelijking(v).includes('koopsommen liggen ver uiteen'));
  const v2 = dvBerekenBiedingVergelijking([bodA, bodB]);         // 3,0M vs 2,6M → factor 1,15
  ok('geen spreidingswaarschuwing bij vergelijkbare koopsommen', v2.evSpreidWaarschuwing === false);
  ok('geen spreidingsregel in de tabel bij vergelijkbare koopsommen',
    !dvTabelBiedingVergelijking(v2).includes('koopsommen liggen ver uiteen'));
  const v3 = dvBerekenBiedingVergelijking([{ ...bodA, ev: 3000000 }, { ...bodB, ev: 1000000 }]); // factor 3, net niet
  ok('factor precies 3 → geen waarschuwing (drempel is >3)', v3.evSpreidWaarschuwing === false);
}

// ── TC6 — het weggehaalde upsidePct-veld is echt weg ──────────────
{
  console.log('\nTC6 — geen los upsidePct-veld meer (was een misleidende maat)');
  const v = dvBerekenBiedingVergelijking([bodA, bodB]);
  ok('biedingen[0] heeft geen upsidePct', !('upsidePct' in v.biedingen[0]));
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
