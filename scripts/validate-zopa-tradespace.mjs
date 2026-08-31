// Losstaande validatie van de ZOPA trade-space (onderhandel-playbook onderdeel 1, werkregel 13).
// Draait mna/01 + mna/03 in een minimale stub en toetst dvBerekenZopaTradeSpace() tegen handmatig
// doorgerekende testcases.
//
// Sinds de ChatGPT-review van 31 augustus 2026 neemt de trade-space de VOORWAARDELIJKE EARN-UP mee
// (dvBerekenClosing.earnUp, herrekend naar equity/cash-basis via dvVerkoperBedragen). Kerninvariant:
//   Σ buckets == waarde verkocht belang + earn-up (verkoper-basis) + waarde behouden belang
// De trade-space voegt dus geen bedrag toe of af t.o.v. opbrengst-brug + closing.
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenZopaTradeSpace=dvBerekenZopaTradeSpace;globalThis.dvTabelZopaTradeSpace=dvTabelZopaTradeSpace;globalThis.dvSvgStackedBar=dvSvgStackedBar;globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;globalThis.dvVerkoperBedragen=dvVerkoperBedragen;');

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
// closing.earnUp (EV-toerekening) = (520.000×6×51%) − (400.000×5×51%) = 1.591.200 − 1.020.000 = 571.200
// EV→equity-factor = 1.510.000 / 2.000.000 = 0,755  →  earn-up verkoper-basis = 571.200 × 0,755 = 431.256
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
  ok(naam + ' — Σ buckets == verkocht belang + earn-up(verkoper) + behouden belang',
    Math.abs(z.totaal - (b.verkochtBelangWaarde + z.earnUp + z.behoudenBelangWaarde)) < 1);
  ok(naam + ' — Σ buckets == zeker + escrow + voorwaardelijk + behouden',
    Math.abs(z.totaal - (z.zekerNu + z.escrow + z.voorwaardelijk + z.behoudenBelangWaarde)) < 1);
  ok(naam + ' — voorwaardelijk == earn-out + verkoperslening + earn-up',
    Math.abs(z.voorwaardelijk - (z.earnOut + z.vendorLoan + z.earnUp)) < 1);
  const pctSom = z.pctZekerBijClosing + z.pctEscrow + z.pctVoorwaardelijk + z.pctBehoudenBelang;
  ok(naam + ' — percentages tellen op tot ~100', Math.abs(pctSom - 100) < 0.01);
}

// ── TC1 — kale deal, geen earn-out, geen vendor loan (earn-up wél aanwezig) ──
{
  console.log('\nTC1 — kale deal (geen earn-out, geen verkoperslening; earn-up wél)');
  const { b, z } = run(basis);
  eq('waardepositie verkoper (totaal)', z.totaal, 1941256);
  eq('zeker bij closing', z.zekerNu, 677688);
  eq('escrow', z.escrow, 92412);
  eq('voorwaardelijk (= earn-up, verkoper-basis)', z.voorwaardelijk, 431256);
  eq('earn-up bucketwaarde', z.earnUp, 431256);
  eq('earn-up EV-toerekening (bron)', z.earnUpEVAllocation, 571200);
  eq('EV→equity-factor ×1000', z.evNaarEquityFactor * 1000, 755, 1);
  eq('behouden belang (49%)', z.behoudenBelangWaarde, 739900);
  eq('% voorwaardelijk', z.pctVoorwaardelijk, 22.2, 0.2);
  ok('voorwaardelijk is NIET 0 zolang er een earn-up is', z.pctVoorwaardelijk > 0);
  invariant('TC1', z, b);
}

// ── TC2 — met uitgestelde earn-out 20% ─────────────────────────
// earn-out 20% × 770.100 = 154.020 ; cash = 770.100 − 92.412 − 154.020 = 523.668
// voorwaardelijk = earn-out 154.020 + earn-up 431.256 = 585.276 ; totaal onveranderd
{
  console.log('\nTC2 — met uitgestelde earn-out (20%)');
  const { b, z } = run({ ...basis, earnOutAan: true, earnOutPct: 20 });
  eq('zeker bij closing', z.zekerNu, 523668);
  eq('earnOut-bucketwaarde', z.earnOut, 154020);
  eq('earn-up ongewijzigd', z.earnUp, 431256);
  eq('voorwaardelijk (= earn-out + earn-up)', z.voorwaardelijk, 585276);
  eq('totaal onveranderd t.o.v. TC1', z.totaal, 1941256);
  invariant('TC2', z, b);
}

// ── TC3 — met vendor loan (herindeling zeker → voorwaardelijk, geen bedragmutatie) ───
// cashNu = 677.688 ; vendor loan 200.000 → zeker = 477.688 ; voorwaardelijk = 200.000 + 431.256
{
  console.log('\nTC3 — met verkoperslening (200k van de cash bij closing)');
  const { b, z } = run({ ...basis, vendorLoanAan: true, vendorLoanBedrag: 200000 });
  eq('vendor loan bucketwaarde', z.vendorLoan, 200000);
  eq('zeker bij closing (na aftrek verkoperslening)', z.zekerNu, 477688);
  eq('voorwaardelijk (= verkoperslening + earn-up)', z.voorwaardelijk, 631256);
  eq('totaal onveranderd', z.totaal, 1941256);
  invariant('TC3', z, b);
}

// ── TC4 — vendor loan groter dan de cash bij closing → klemmen op de cash ───────
{
  console.log('\nTC4 — verkoperslening groter dan de cash bij closing (klemt)');
  const { b, z } = run({ ...basis, vendorLoanAan: true, vendorLoanBedrag: 900000 });
  eq('vendor loan geklemd op de cash', z.vendorLoan, 677688);
  eq('zeker bij closing = 0', z.zekerNu, 0);
  eq('voorwaardelijk (= volledige cash + earn-up)', z.voorwaardelijk, 1108944);
  eq('totaal onveranderd', z.totaal, 1941256);
  invariant('TC4', z, b);
}

// ── TC5 — belang 100% (geen behouden belang) ────────────────────────
// verkocht 100% = 1.510.000 ; escrow 12% = 181.200 ; cash = 1.328.800 ; behouden = 0
// closing.earnUp = (520.000×6) − (400.000×5) = 3.120.000 − 2.000.000 = 1.120.000
// earn-up verkoper-basis = 1.120.000 × 0,755 = 845.600
{
  console.log('\nTC5 — belang 100% (volledige verkoop, geen rollover)');
  const { b, z } = run({ ...basis, belangPct: 100 });
  eq('zeker bij closing', z.zekerNu, 1328800);
  eq('escrow', z.escrow, 181200);
  eq('earn-up verkoper-basis', z.earnUp, 845600);
  eq('voorwaardelijk (= earn-up)', z.voorwaardelijk, 845600);
  eq('behouden belang = 0', z.behoudenBelangWaarde, 0);
  eq('% behouden belang = 0', z.pctBehoudenBelang, 0, 0.01);
  eq('totaal', z.totaal, 2355600);
  invariant('TC5', z, b);
}

// ── TC6 — earn-up nihil zodra netto schuld ≥ ondernemingswaarde (geen gefabriceerde meeropbrengst) ──
{
  console.log('\nTC6 — netto schuld ≥ EV → earn-up voor de verkoper is nihil');
  const { b, z } = run({ ...basis, nettoSchuld: 2500000, debtLikeItems: 0, werkkapitaalCorrectie: 0 });
  ok('equity value 100% ≤ 0', b.equityValue100 <= 0);
  eq('EV→equity-factor = 0', z.evNaarEquityFactor, 0, 0.0001);
  eq('earn-up verkoper-basis = 0', z.earnUp, 0);
  eq('voorwaardelijk = 0', z.voorwaardelijk, 0);
}

// ── TC7 — render-smoke: tabel + gestapelde balk ─────────────────────
{
  console.log('\nTC7 — render-smoke');
  globalThis.fmtGeld = (n) => '€' + Math.round(n || 0);
  const { z } = run({ ...basis, earnOutAan: true, earnOutPct: 20 });
  const html = dvTabelZopaTradeSpace(z);
  ok('tabel-HTML bevat een <table>', /<table/.test(html));
  ok('tabel-HTML noemt "Zeker, bij closing"', html.includes('Zeker, bij closing'));
  ok('tabel-HTML bevat de gestapelde balk (<svg)', /<svg/.test(html));
  ok('tabel-HTML noemt "waardepositie verkoper"', html.toLowerCase().includes('waardepositie van de verkoper'));
  ok('tabel-HTML legt de earn-up-omrekening uit', html.includes('herrekend naar dezelfde equity/cash-basis'));
  ok('tabel-HTML bevat de disclaimer', html.includes('niet dat het bedrag gegarandeerd is'));
  ok('lege balk → nette melding', dvSvgStackedBar([{ bedrag: 0, pct: 0, kleur: '#000', label: 'x' }], 't').includes('Geen verdeling'));
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
