// Losstaande validatie van de maatschap-waarderingslogica (backlogpunt 9-B4, werkregel 13).
// Draait mna/01 + mna/03 in een minimale stub-omgeving en toetst de rekenkern tegen handmatig
// doorgerekende testcases — inclusief het negatieve geval (BV-tak mag NIET veranderen).
//
// Gebruik: node scripts/validate-maatschap-waardering.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src01 = fs.readFileSync(path.join(dir, '..', 'mna', '01-config-sectorprofielen.js'), 'utf8');
const src03 = fs.readFileSync(path.join(dir, '..', 'mna', '03-rekenkern-waardering.js'), 'utf8');

// ---- minimale browser-/app-stubs die mna/01 + mna/03 nodig hebben ----
globalThis.location = { search: '' };
globalThis.URLSearchParams = class { get() { return null; } };
globalThis.document = { createElement: () => ({ style: {}, addEventListener() {} }), body: {}, getElementById: () => null };
globalThis.window = {};
globalThis.esc = (s) => String(s == null ? '' : s);
globalThis.S = {};

// mna/01 + mna/03 zijn browser-scripts (geen module) — evalueren in global scope.
(0, eval)(src01 + '\n' + src03 + '\n;globalThis.dvBerekenWaardering=dvBerekenWaardering;globalThis.dvGetDefaults=dvGetDefaults;globalThis.dvBerekenSchuldafbouw=dvBerekenSchuldafbouw;globalThis.dvBerekenClosing=dvBerekenClosing;globalThis.getPartnerTerm=getPartnerTerm;globalThis.isMaatschap=isMaatschap;');

let pass = 0, fail = 0;
function check(naam, actual, expected, tol = 0.5) {
  const ok = (expected === null) ? (actual === null)
    : (typeof expected === 'boolean' || typeof expected === 'string') ? (actual === expected)
    : (actual !== null && actual !== undefined && Math.abs(actual - expected) <= tol);
  console.log((ok ? '  ✓ ' : '  ✗ ') + naam + '  → ' + JSON.stringify(actual) + (ok ? '' : '  (verwacht ' + JSON.stringify(expected) + ')'));
  ok ? pass++ : fail++;
}
function scenario(naam, sector, structuur, data) {
  console.log('\n' + naam);
  S.traject = { sector, structuur_type: structuur, koper_naam: '' };
  S._groepData = Object.assign({}, data);
  S.data = Object.assign({}, data);
}

// ── TC1 — maatschap, grondslag bekend ──────────────────────────────────────────
// accountancy multiplerange 4.5–5.5 (mid 5.0). ebitdaNorm 600k, partnerbeloning 300k (3 maten).
// basis = 600k − 300k = 300k.  wLaag=1.35m  wMid=1.50m  wHoog=1.65m
scenario('TC1 — maatschap accountancy, ondernemersloon ingevuld', 'accountancy', 'maatschap',
  { financieel_ebitdaNorm: '600000', financieel_partnerBel: '300000', financieel_omzet3: '2000000', financieel_ebitdaMarge: '30' });
{
  const v = dvBerekenWaardering();
  check('multipleType = maatschap', v.multipleType, 'maatschap');
  check('grondslag (winst ná ondernemersloon) = 300.000', v.multipleTypeBedrag, 300000);
  check('wLaag = 1.350.000', v.wLaag, 1350000);
  check('wMid = 1.500.000', v.wMid, 1500000);
  check('wHoog = 1.650.000', v.wHoog, 1650000);
  check('grondslagOnbekend = false', v.maatschapGrondslagOnbekend, false);
  const d = dvGetDefaults();
  check('defaults: vpbPct = 0', d.vpbPct, 0);
  check('defaults: ebitdaBewezen = 300.000', d.ebitdaBewezen, 300000);
  check('defaults: ebitdaPrognose = 390.000 (300k×1,3)', d.ebitdaPrognose, 390000);
  const rows = dvBerekenSchuldafbouw(d, dvBerekenClosing(d));
  check('schuldafbouw jaar 1: VpB = 0 (maatschap, vpbPct=0)', rows[1].vpb, 0);
  check('schuldafbouw jaar 2: VpB = 0', rows[2].vpb, 0);
}

// ── TC2 — maatschap, grondslag onbekend (geen gok!) ────────────────────────────
scenario('TC2 — maatschap accountancy, ondernemersloon LEEG', 'accountancy', 'maatschap',
  { financieel_ebitdaNorm: '600000', financieel_omzet3: '2000000', financieel_ebitdaMarge: '30' });
{
  const v = dvBerekenWaardering();
  check('wLaag = null (geen ongecorrigeerd cijfer)', v.wLaag, null);
  check('wMid = null', v.wMid, null);
  check('wHoog = null', v.wHoog, null);
  check('grondslagOnbekend = true', v.maatschapGrondslagOnbekend, true);
  const d = dvGetDefaults();
  check('defaults: maatschapGrondslagOnbekend = true', d.maatschapGrondslagOnbekend, true);
  check('defaults: ebitdaBewezen = 0', d.ebitdaBewezen, 0);
  check('defaults: vpbPct = 0', d.vpbPct, 0);
}

// ── TC3 — BV-regressie: exact het oude gedrag, partnerbeloning NIET afgetrokken ─
scenario('TC3 — BV accountancy (regressie: ongewijzigd)', 'accountancy', 'bv',
  { financieel_ebitdaNorm: '600000', financieel_partnerBel: '300000', financieel_omzet3: '2000000', financieel_ebitdaMarge: '30' });
{
  const v = dvBerekenWaardering();
  check('multipleType = ebitda', v.multipleType, 'ebitda');
  check('grondslag = volledige EBITDA 600.000 (partnerbeloning NIET afgetrokken)', v.multipleTypeBedrag, 600000);
  check('wMid = 3.000.000 (600k × 5,0)', v.wMid, 3000000);
  check('maatschapModus = false', v.maatschapModus, false);
  const d = dvGetDefaults();
  check('defaults: vpbPct = 25,8 (ongewijzigd)', d.vpbPct, 25.8);
  check('defaults: ebitdaBewezen = 600.000 (ongewijzigd)', d.ebitdaBewezen, 600000);
}

// ── TC4 — maatschap, ondernemersloon > winst → basis geклemd op 0 ──────────────
scenario('TC4 — maatschap, ondernemersloon hoger dan winst', 'accountancy', 'maatschap',
  { financieel_ebitdaNorm: '200000', financieel_partnerBel: '300000', financieel_omzet3: '1000000', financieel_ebitdaMarge: '20' });
{
  const v = dvBerekenWaardering();
  check('grondslag geklemd op 0 (niet negatief)', v.multipleTypeBedrag, 0);
  check('wMid = 0', v.wMid, 0);
  check('grondslagOnbekend = false (loon is wél ingevuld)', v.maatschapGrondslagOnbekend, false);
}

// ── TC5 — zorg maatschap, eigen multiplerange (omzet 1–3x) + eigenaarssalaris ──
// zorg multipleBasis = 'omzet' (1–3x omzet). Bij een maatschap wint de maatschap-tak: grondslag =
// winst ná ondernemersloon, en de multiplerange (1–3, mid 2) wordt daarop toegepast.
scenario('TC5 — zorg maatschap', 'zorg', 'maatschap',
  { financieel_ebitdaNorm: '400000', financieel_partnerBel: '250000', financieel_omzet3: '1200000', financieel_ebitdaMarge: '33' });
{
  const v = dvBerekenWaardering();
  check('multipleType = maatschap (niet omzet)', v.multipleType, 'maatschap');
  check('grondslag = 150.000 (400k − 250k)', v.multipleTypeBedrag, 150000);
  check('wMid = 300.000 (150k × 2,0)', v.wMid, 300000);
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
