// Losstaande validatie van de randgeval-fixes uit de ChatGPT-rekenkern-review (31 aug 2026):
// #1 onbekende sector, #3 ontbrekende omzethistorie, #4 negatieve equity, #5 onparseerbare invoer,
// #6 DCF-cashflow (D&A), #9 negatieve EBITDA → capex, #12 earn-up-financiering.
//
// Gebruik: node scripts/validate-edge-cases.mjs
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

(0, eval)(src01 + '\n' + src03 + '\n;' +
  'globalThis.dvSectorMultipleRange=dvSectorMultipleRange;globalThis.dvGeldOfNull=dvGeldOfNull;' +
  'globalThis.dvBerekenOpbrengstBrug=dvBerekenOpbrengstBrug;globalThis.dvBerekenClosing=dvBerekenClosing;' +
  'globalThis.dvBerekenSchuldafbouw=dvBerekenSchuldafbouw;globalThis.dvFcffRijen=dvFcffRijen;' +
  'globalThis.dvBerekenWaardering=dvBerekenWaardering;globalThis.dvManagementRisico=dvManagementRisico;');

let pass = 0, fail = 0;
function eq(naam, actual, expected, tol = 0.5) {
  const ok = typeof actual === 'number' && typeof expected === 'number' ? Math.abs(actual - expected) <= tol : actual === expected;
  console.log((ok ? '  ✓ ' : '  ✗ ') + naam + '  → ' + JSON.stringify(actual) + (ok ? '' : '  (verwacht ' + JSON.stringify(expected) + ')'));
  ok ? pass++ : fail++;
}
function ok(naam, cond) { console.log((cond ? '  ✓ ' : '  ✗ ') + naam); cond ? pass++ : fail++; }

// ── #1 — onbekende sector geeft GEEN multiple ────────────────────────────────
{
  console.log('\n#1 — dvSectorMultipleRange: onbekende sector → geen gegokte range');
  globalThis.S = { traject: { sector: 'ditbestaatniet' }, data: {}, _groepData: {} };
  const r = dvSectorMultipleRange();
  ok('bekend === false', r.bekend === false);
  eq('mLaag = null', r.mLaag, null);
  eq('mHoog = null', r.mHoog, null);

  globalThis.S = { traject: { sector: 'accountancy' }, data: {}, _groepData: {} };
  const r2 = dvSectorMultipleRange();
  ok('accountancy → bekend === true', r2.bekend === true);
  ok('accountancy → mLaag/mHoog gevuld', r2.mLaag > 0 && r2.mHoog > 0);

  globalThis.S = { traject: {}, data: {}, _groepData: {} };  // geen sector gezet → accountancy-default (bestaand gedrag)
  const r3 = dvSectorMultipleRange();
  ok('geen sector gezet → bekend === true (legacy accountancy)', r3.bekend === true);
}

// ── #5 — dvGeldOfNull onderscheidt leeg / ongeldig / geldig ──────────────────
{
  console.log('\n#5 — dvGeldOfNull: leeg → null, cijferloze rommel → null, geldig → getal');
  globalThis.S = { data: {
    leeg: '', rommel: 'abc', tekst: 'zie bijlage', nvt: 'n.v.t.',
    geldig: '1.200.000', metteken: '± 500', nul: '0'
  }, _groepData: {} };
  eq('leeg → null', dvGeldOfNull('leeg'), null);
  eq('"abc" → null (geen 0!)', dvGeldOfNull('rommel'), null);
  eq('"zie bijlage" → null', dvGeldOfNull('tekst'), null);
  eq('"n.v.t." → null', dvGeldOfNull('nvt'), null);
  eq('"1.200.000" → 1200000', dvGeldOfNull('geldig'), 1200000);
  eq('"± 500" → 500 (bevat cijfer)', dvGeldOfNull('metteken'), 500);
  eq('"0" → 0 (geldige nul, geen null)', dvGeldOfNull('nul'), 0);
}

// ── #4 — negatieve equity → opbrengst voor verkoper op 0, vlag gezet ─────────
{
  console.log('\n#4 — dvBerekenOpbrengstBrug: schuld > EV → cash op 0, equityNegatief=true');
  const p = { ebitdaBewezen: 300000, multipleBasis: 4, ebitdaPrognose: 390000, multipleBovengrens: 5, belangPct: 51,
    nettoSchuld: 1500000, debtLikeItems: 0, werkkapitaalCorrectie: 0, transactiekostenPct: 2, escrowPct: 12, earnOutAan: false };
  const c = dvBerekenClosing(p);
  const b = dvBerekenOpbrengstBrug(p, c);
  ok('equityValue100 < 0 (informatief, blijft negatief)', b.equityValue100 < 0);
  ok('equityNegatief === true', b.equityNegatief === true);
  eq('verkochtBelangWaarde geclampt op 0', b.verkochtBelangWaarde, 0);
  eq('cashBijClosing geclampt op 0 (geen negatief bedrag)', b.cashBijClosing, 0);
  eq('verwachteGerealiseerd = 0', b.verwachteGerealiseerd, 0);

  // positieve equity: ongewijzigd t.o.v. de bestaande oracle
  const p2 = { ...p, nettoSchuld: 200000 };
  const b2 = dvBerekenOpbrengstBrug(p2, dvBerekenClosing(p2));
  ok('positieve equity → equityNegatief === false', b2.equityNegatief === false);
  eq('positieve equity → EV 1,2M', b2.ev, 1200000);
  eq('positieve equity → equity value = 1,2M − 200k − 24k', b2.equityValue100, 976000);
}

// ── #9 — negatieve EBITDA → capex/NWC niet negatief in het schuldafbouwmodel ─
{
  console.log('\n#9 — dvBerekenSchuldafbouw: negatieve EBITDA → geen negatieve capex/NWC');
  const p = { ebitdaBewezen: -130000, ebitdaPrognose: -169000, bankLeverage: 2, rentePct: 6, vpbPct: 25,
    capexPct: 1.5, groeiPct: 4, horizonJaren: 3, werkkapitaalBasis: 200000, earnUpSchuldPct: 100 };
  const rows = dvBerekenSchuldafbouw(p, { earnUp: 0 });
  const j1 = rows[1];
  ok('EBITDA jaar 1 is negatief', j1.ebitda < 0);
  ok('capex >= 0 (niet negatief)', j1.capex >= 0);
  eq('capex = 0 bij negatieve EBITDA', j1.capex, 0);
  eq('nwcMutatie = 0 bij negatieve EBITDA', j1.nwcMutatie, 0);
  ok('nettoSchuld blijft >= 0', rows.every(r => r.nettoSchuld >= 0));
}

// ── #12 — earn-up-financiering: aandeel schuld instelbaar, default 100 = oud gedrag ─
{
  console.log('\n#12 — dvBerekenSchuldafbouw: earnUpSchuldPct stuurt hoeveel earn-up op de schuld drukt');
  const base = { ebitdaBewezen: 300000, ebitdaPrognose: 390000, bankLeverage: 2, rentePct: 6, vpbPct: 25,
    capexPct: 10, groeiPct: 4, horizonJaren: 3, werkkapitaalBasis: 0 };
  const closing = { earnUp: 400000 };
  const r100 = dvBerekenSchuldafbouw({ ...base, earnUpSchuldPct: 100 }, closing);
  const r50 = dvBerekenSchuldafbouw({ ...base, earnUpSchuldPct: 50 }, closing);
  const rDefault = dvBerekenSchuldafbouw({ ...base }, closing);  // geen param → 100
  eq('100%: earnUpSchuld = volledige earn-up', r100[1].earnUpSchuld, 400000);
  eq('50%: earnUpSchuld = halve earn-up', r50[1].earnUpSchuld, 200000);
  eq('geen param → gedraagt zich als 100%', rDefault[1].nettoSchuld, r100[1].nettoSchuld);
  eq('50% financiert → €200k minder schuld in jaar 1 dan 100%', r100[1].nettoSchuld - r50[1].nettoSchuld, 200000);
}

// ── #6 — DCF-cashflow: afschrijvingenPct=0 identiek aan de oude formule, >0 belast de EBIT ──
{
  console.log('\n#6 — dvFcffRijen: D&A-parameter (0 = ongewijzigd, >0 = belasting over EBIT)');
  const rows = [
    { jaar: 'Closing', ebitda: 1000000, capex: 0, nwcMutatie: 0 },
    { jaar: '2027', ebitda: 1000000, capex: 100000, nwcMutatie: 0 }
  ];
  const f0 = dvFcffRijen(rows, { vpbPct: 25.8, afschrijvingenPct: 0 });
  eq('D&A 0 → 1.000.000 − 258.000 − 100.000 = 642.000 (= oude formule)', f0[0].fcf, 642000);
  const f20 = dvFcffRijen(rows, { vpbPct: 25.8, afschrijvingenPct: 20 });
  // D&A = 200.000 ; belasting over EBIT 800.000 = 206.400 ; fcf = 1.000.000 − 206.400 − 100.000 = 693.600
  eq('D&A 20% → belasting over EBIT → fcf = 693.600', f20[0].fcf, 693600);
}

// ── #3 — dvBerekenWaardering: alleen jaar-3-omzet → geen gegokte groeivoet ───
{
  console.log('\n#3 — dvBerekenWaardering: onvoldoende omzethistorie → forecastOnbekend, geen 3%');
  globalThis.S = {
    traject: { sector: 'accountancy', structuur_type: 'bv' },
    _groepData: { financieel_omzet3: '1.000.000', financieel_ebitdaNorm: '200.000', financieel_ebitdaMarge: '20' },
    data: { financieel_omzet3: '1.000.000', financieel_ebitdaNorm: '200.000', financieel_ebitdaMarge: '20' }
  };
  const v = dvBerekenWaardering();
  ok('forecastOnbekend === true', v.forecastOnbekend === true);
  eq('gemGroei = null (geen 3%-gok)', v.gemGroei, null);
  eq('forecast jaar +1 = null', v.fc[1], null);
  eq('forecast jaar +3 = null', v.fc[3], null);
  ok('de headline-waardering (wMid) blijft wél berekend', v.wMid > 0);

  // mét twee groeistappen → gewoon een groeivoet
  globalThis.S._groepData.financieel_omzet1 = '800.000';
  globalThis.S._groepData.financieel_omzet2 = '900.000';
  globalThis.S.data.financieel_omzet1 = '800.000';
  globalThis.S.data.financieel_omzet2 = '900.000';
  const v2 = dvBerekenWaardering();
  ok('mét historie → forecastOnbekend === false', v2.forecastOnbekend === false);
  ok('gemGroei is een getal', typeof v2.gemGroei === 'number');
}

// ── #10 — dvManagementRisico: leeg retentieveld → onbekend, geen risicopunt ──
{
  console.log('\n#10 — dvManagementRisico: leeg mgmtRetentie → punten:null (onbekend)');
  globalThis.S = { data: {}, _groepData: {} };
  const r = dvManagementRisico();
  const ret = r.aspecten.find(a => a.label.indexOf('Retentie') === 0);
  eq('leeg retentieveld → punten null', ret.punten, null);
  eq('oordeel = onbekend', ret.oordeel, 'onbekend');

  globalThis.S = { data: { partner_mgmtRetentie: 'geen afspraken gemaakt' }, _groepData: {} };
  const r2 = dvManagementRisico();
  const ret2 = r2.aspecten.find(a => a.label.indexOf('Retentie') === 0);
  eq('expliciet "geen afspraken" → 1 risicopunt', ret2.punten, 1);
}

console.log('\n' + (fail === 0 ? '✓ ALLE ' + pass + ' checks PASS' : '✗ ' + fail + ' van ' + (pass + fail) + ' checks GEFAALD'));
process.exit(fail === 0 ? 0 : 1);
