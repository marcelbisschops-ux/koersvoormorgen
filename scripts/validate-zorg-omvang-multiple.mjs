// Losstaande validatie van de omvangsafhankelijke zorg-multiple-schakelaar (BACKLOG 1.2, 11 sep
// 2026, werkregel 13/19). Draait mna/01 + mna/03 in een minimale stub en toetst
// dvSectorMultipleRange() + dvBerekenWaardering() tegen handmatig doorgerekende testcases.
//
// Kern: een KLEINE zorgpraktijk (groeps-FTE <= 5) hanteert de omzet-multiple (1-3x, praktijkwaarde);
// een GROTERE praktijk/keten (FTE > 5) hanteert de EBITDA-multiple (6,0-7,3x, Brookz "zorg &
// farmacie"). De "grotere praktijk"-testcase is bewust identiek aan het rekenvoorbeeld dat al in
// SECTORPROFIEL-BRONNEN.md staat (fysioketen, €5 mln omzet, 18% EBITDA) — geeft een onafhankelijke
// kruiscontrole tegen de brondocumentatie zelf, niet alleen tegen de eigen code.
//
// Gebruik: node scripts/validate-zorg-omvang-multiple.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvSectorMultipleRange=dvSectorMultipleRange;globalThis.dvBerekenWaardering=dvBerekenWaardering;');

let pass = 0, fail = 0;
function eq(naam, actual, expected, tol = 0.5) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log((ok ? '  ✓ ' : '  ✗ ') + naam + '  → ' + Math.round(actual * 100) / 100 + (ok ? '' : '  (verwacht ' + expected + ')'));
  ok ? pass++ : fail++;
}
function ok_(naam, cond, detail) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + naam + (detail ? '  → ' + detail : ''));
  cond ? pass++ : fail++;
}

function setup(fteGroep, omzet3, ebitda) {
  globalThis.S.traject = { sector: 'zorg' };
  globalThis.S.data = {};
  globalThis.S._groepData = {
    partner_fte: String(fteGroep),
    financieel_omzet1: String(omzet3), financieel_omzet2: String(omzet3), financieel_omzet3: String(omzet3),
    financieel_ebitda: String(ebitda), financieel_ebitdaNorm: String(ebitda),
  };
}

console.log('\n\x1b[1mCASUS 1 · kleine solopraktijk (FTE=3) — omzet-multiple blijft gelden\x1b[0m');
setup(3, 600000, 90000);
let r1 = dvSectorMultipleRange();
ok_('basis = omzet', r1.basis === 'omzet', r1.basis);
eq('mLaag = 1', r1.mLaag, 1);
eq('mHoog = 3', r1.mHoog, 3);
ok_('omvang = klein', r1.omvang === 'klein', r1.omvang);

console.log('\n\x1b[1mCASUS 2 · FTE onbekend (0/leeg) — valt terug op omzet-multiple, GEEN gok naar groot\x1b[0m');
setup(0, 600000, 90000);
let r2 = dvSectorMultipleRange();
ok_('basis = omzet (nooit stilzwijgend groot bij onbekende FTE)', r2.basis === 'omzet', r2.basis);

console.log('\n\x1b[1mCASUS 3 · grotere praktijk/keten (FTE=8) — EBITDA-multiple, kruiscontrole tegen SECTORPROFIEL-BRONNEN.md\x1b[0m');
// Rekenvoorbeeld uit de bron: fysioketen €5 mln omzet, 18% EBITDA → €5,4-6,6 mln ≈ 6-7x EBITDA.
setup(8, 5000000, 900000); // 900.000 = 18% van 5.000.000
let r3 = dvSectorMultipleRange();
ok_('basis = ebitda', r3.basis === 'ebitda', r3.basis);
eq('mLaag = 6,0', r3.mLaag, 6.0);
eq('mHoog = 7,3', r3.mHoog, 7.3);
ok_('omvang = groot', r3.omvang === 'groot', r3.omvang);
eq('waardering laag = 900.000 × 6,0 = 5.400.000 (bron: €5,4 mln)', 900000 * r3.mLaag, 5400000, 1);
eq('waardering hoog = 900.000 × 7,3 = 6.570.000 (bron: ≈€6,6 mln)', 900000 * r3.mHoog, 6570000, 1);

console.log('\n\x1b[1mCASUS 4 · grensgeval FTE=5 (niet > 5) — blijft klein/omzet\x1b[0m');
setup(5, 600000, 90000);
let r4 = dvSectorMultipleRange();
ok_('FTE=5 telt nog als klein (grens is ">5", niet ">=5")', r4.basis === 'omzet', r4.basis);

console.log('\n\x1b[1mCASUS 5 · hoofdwaarderingsscherm (dvBerekenWaardering) past de EBITDA-variant correct toe, geen omzet meer\x1b[0m');
// dvBerekenWaardering() rekent altijd op S._groepData (tijdelijke S.data-swap, zie de functie zelf)
// -- dus de testfixture hoort daar te staan, niet in S.data (dat wordt toch overschreven).
setup(8, 5000000, 900000);
globalThis.S._groepData.financieel_omzet1 = '4600000';
globalThis.S._groepData.financieel_omzet2 = '4800000';
globalThis.S._groepData.financieel_ebitdaMarge = '18';
let w = dvBerekenWaardering();
ok_('multipleType = ebitda (niet meer omzet)', w.multipleType === 'ebitda', w.multipleType);
eq('wLaag ≈ 5.400.000', w.wLaag, 5400000, 1000);
eq('wHoog ≈ 6.570.000', w.wHoog, 6570000, 1000);

console.log('\n\x1b[1m───────── SAMENVATTING ─────────\x1b[0m');
console.log((fail ? '\x1b[31m' : '\x1b[32m') + pass + ' geslaagd, ' + fail + ' gefaald\x1b[0m');
process.exit(fail ? 1 : 0);
