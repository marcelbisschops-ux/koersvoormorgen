// Losstaande validatie van de ZOPA trade-space (onderhandel-playbook onderdeel 1, werkregel 13).
// Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenZopaTradeSpace() tegen handmatig
// doorgerekende testcases. Kerninvariant: de som van de buckets is exact
// "waarde verkocht belang + waarde behouden belang" — de trade-space voegt geen bedrag toe of af.
//
// Gebruik: node scripts/validate-zopa-tradespace.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenZopaTradeSpace=dvBerekenZopaTradeSpace;globalThis.dvTabelZopaTradeSpace=dvTabelZopaTradeSpace;globalThis.dvSvgStackedBar=dvSvgStackedBar;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;');

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

// Basis-parameterset: evBasis = 400.000 × 5,0 = 2.000.000 ; belang 51%
// equity100 = 2.000.000 − 300k − 100k − 50k − (2% × 2.000.000 = 40k) = 1.510.000
// verkocht 51% = 770.100 ; behouden 49% = 739.900 ; escrow 12% × 770.100 = 92.412
const basis = {
  ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
  nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
  escrowPct: 12, escrowMaanden: 18, earnOutAan: false, earnOutPct: 20,
  vendorLoanAan: false, vendorLoanBedrag: 0
};
function run(p) {
  const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
  return { b, z: dvBerekenZopaTradeSpace(p, dvBerekenClosing(p), b) };
}
function invariant(naam, z, b) {
  ok(naam + ' — Σ buckets == verkocht belang + behouden belang',
    Math.abs(z.totaal - (b.verkochtBelangWaarde + z.behoudenBelangWaarde)) < 1);
  ok(naam + ' — Σ buckets == zeker + escrow + voorwaardelijk + behouden',
    Math.abs(z.totaal - (z.zekerNu + z.escrow + z.voorwaardelijk + z.behoudenBelangWaarde)) < 1);
  const pctSom = z.pctZekerBijClosing + z.pctEscrow + z.pctVoorwaardelijk + z.pctBehoudenBelang;
  ok(naam + ' — percentages tellen op tot ~100', Math.abs(pctSom - 100) < 0.01);
}

// ── TC1 — kale deal, geen earn-out, geen vendor loan ───────────────────
{
  console.log('\nTC1 — kale deal (geen earn-out, geen verkoperslening)');
  const { b, z } = run(basis);
  eq('totale tegenprestatie', z.totaal, 1510000);
  eq('zeker bij closing', z.zekerNu, 677688);
  eq('escrow', z.escrow, 92412);
  eq('voorwaardelijk', z.voorwaardelijk, 0);
  eq('behouden belang (49%)', z.behoudenBelangWaarde, 739900);
  eq('% zeker bij closing', z.pctZekerBijClosing, 44.88, 0.1);
  eq('% behouden belang', z.pctBehoudenBelang, 49.0, 0.1);
  invariant('TC1', z, b);
}

// ── TC2 — met uitgestelde earn-out 20% ─────────────────────────
// earn-out 20% × 770.100 = 154.020 ; cash = 770.100 − 92.412 − 154.020 = 523.668
{
  console.log('\nTC2 — met uitgestelde earn-out (20%)');
  const { b, z } = run({ ...basis, earnOutAan: true, earnOutPct: 20 });
  eq('zeker bij closing', z.zekerNu, 523668);
  eq('voorwaardelijk (= earn-out)', z.voorwaardelijk, 154020);
  eq('earnOut-bucketwaarde', z.earnOut, 154020);
  eq('% voorwaardelijk', z.pctVoorwaardelijk, 10.2, 0.1);
  invariant('TC2', z, b);
}

// ── TC3 — met vendor loan (herindeling zeker → voorwaardelijk, geen bedragmutatie) ───
// cashNu = 677.688 ; vendor loan 200.000 → zeker = 477.688 ; voorwaardelijk = 200.000
{
  console.log('\nTC3 — met verkoperslening (200k van de cash bij closing)');
  const { b, z } = run({ ...basis, vendorLoanAan: true, vendorLoanBedrag: 200000 });
  eq('vendor loan bucketwaarde', z.vendorLoan, 200000);
  eq('zeker bij closing (na aftrek verkoperslening)', z.zekerNu, 477688);
  eq('voorwaardelijk (= verkoperslening)', z.voorwaardelijk, 200000);
  eq('totaal onveranderd', z.totaal, 1510000);
  invariant('TC3', z, b);
}

// ── TC4 — vendor loan groter dan de cash bij closing → klemmen op de cash ───────
{
  console.log('\nTC4 — verkoperslening groter dan de cash bij closing (klemt)');
  const { b, z } = run({ ...basis, vendorLoanAan: true, vendorLoanBedrag: 900000 });
  eq('vendor loan geklemd op de cash', z.vendorLoan, 677688);
  eq('zeker bij closing = 0', z.zekerNu, 0);
  eq('voorwaardelijk = volledige cash', z.voorwaardelijk, 677688);
  invariant('TC4', z, b);
}

// ── TC5 — belang 100% (geen behouden belang) ────────────────────────
// verkocht 100% = 1.510.000 ; escrow 12% = 181.200 ; cash = 1.328.800 ; behouden = 0
{
  console.log('\nTC5 — belang 100% (volledige verkoop, geen rollover)');
  const { b, z } = run({ ...basis, belangPct: 100 });
  eq('zeker bij closing', z.zekerNu, 1328800);
  eq('escrow', z.escrow, 181200);
  eq('behouden belang = 0', z.behoudenBelangWaarde, 0);
  eq('% behouden belang = 0', z.pctBehoudenBelang, 0, 0.01);
  eq('% zeker bij closing', z.pctZekerBijClosing, 88.0, 0.1);
  invariant('TC5', z, b);
}

// ── TC6 — render-smoke: tabel + gestapelde balk ─────────────────────
{
  console.log('\nTC6 — render-smoke');
  globalThis.fmtGeld = (n) => '€' + Math.round(n || 0);
  const { z } = run({ ...basis, earnOutAan: true, earnOutPct: 20 });
  const html = dvTabelZopaTradeSpace(z);
  ok('tabel-HTML bevat een <table>', /<table/.test(html));
  ok('tabel-HTML noemt "Zeker, bij closing"', html.includes('Zeker, bij closing'));
  ok('tabel-HTML bevat de gestapelde balk (<svg)', /<svg/.test(html));
  ok('tabel-HTML bevat de disclaimer', html.includes('niet dat het bedrag gegarandeerd is'));
  ok('lege balk → nette melding', dvSvgStackedBar([{ bedrag: 0, pct: 0, kleur: '#000', label: 'x' }], 't').includes('Geen verdeling'));
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
