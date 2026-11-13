// #73 (13-11-2026, GO Marcel): betrouwbare bronvolgorde bij financiële cijfers. Acceptatiecriteria Marcel:
// 1 historische cijfers uit jaarrekeningen blijven historisch; 2 prognoses apart verwerkt en getoond; 3 een prognose
// overschrijft nooit ongemerkt historische cijfers; 4 tegenstrijdige broncijfers zichtbaar; 5 herkomst per cijfer
// controleerbaar; 6 werkt bij meerdere documenten en boekjaren.
// Zonder AI en zonder backend: de echte vullogica en conflictdialoog van mna.html met synthetische extractieresultaten
// (zelfde vorm als de extractie levert). Het lopende jaar wordt dynamisch bepaald.
import { test, expect } from '@playwright/test';

const J = new Date().getFullYear(); // eerste nog niet afgesloten jaar
const H1 = J - 3, H2 = J - 2, H3 = J - 1; // drie afgesloten jaren

async function opzet(page) {
  await page.goto('/mna.html');
  await page.waitForFunction(() => typeof _autoFillFromExtractionBody === 'function' && typeof toonConflictDialog === 'function');
  await page.evaluate(() => {
    S.data = {}; S._groepData = S.data; S.dataPerEntiteit = {}; S._opy = {}; S._opyBron = {}; S._opySlotJaar = {}; S._epy = {};
    S._docSource = {}; S._docJaar = {}; S._docSoort = {}; S._docFragment = {}; S._userEdited = {}; S._conflicts = []; S._pendingConflicts = {};
    window.vul = (velden, naam) => { S._conflicts = []; _autoFillFromExtractionBody('financieel', velden, false, naam, {}); return S._conflicts.slice(); };
    window.stand = () => ({ o1: S.data.financieel_omzet1, o2: S.data.financieel_omzet2, o3: S.data.financieel_omzet3, slots: Object.assign({}, S._opySlotJaar),
      h1: herkomstTekst('financieel_omzet1', S.data.financieel_omzet1, 'financieel'), h2: herkomstTekst('financieel_omzet2', S.data.financieel_omzet2, 'financieel'),
      h3: herkomstTekst('financieel_omzet3', S.data.financieel_omzet3, 'financieel'), prog: leesPrognoses(S.data) });
  });
}
const jr = (a, b, c) => ({ [H1]: a, [H2]: b, [H3]: c });

test('A + B: prognose en niet-afgesloten jaren blijven buiten de historische cijfers (criteria 1, 2, 3)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ jr, J, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: jr }, 'Jaarrekening ' + H3 + '.pdf');
    const naJr = stand();
    const cA = vul({ documentsoort: 'prognose', omzet_per_jaar: { [J]: '1350000', [J + 1]: '1500000' }, prognose_per_jaar: { [J + 1]: { omzet: 1500000, ebitda: 210000 } } }, 'Prognose.xlsx');
    const naProg = stand();
    // B: de AI noemt het soort niet (onbekend) maar levert wel het lopende jaar en een toekomstig jaar als 'gerealiseerd'.
    const cB = vul({ documentsoort: 'onbekend', omzet_per_jaar: { [J]: '1400000', [J + 2]: '1700000' } }, 'Managementrapportage.pdf');
    return { naJr, naProg, naB: stand(), cA: cA.length, cB: cB.length };
  }, { jr: jr('1000000', '1100000', '1200000'), J, H3 });
  expect(r.naJr).toMatchObject({ o1: '1000000', o2: '1100000', o3: '1200000' });
  expect(r.naProg).toMatchObject({ o1: '1000000', o2: '1100000', o3: '1200000' });
  expect(r.naB).toMatchObject({ o1: '1000000', o2: '1100000', o3: '1200000' });
  expect(r.cA + r.cB, 'geen valse conflicten').toBe(0);
  expect(r.naB.h3).toBe('Jaarrekening ' + H3 + '.pdf · Jaarrekening · boekjaar ' + H3);
  const p = r.naB.prog.map((x) => x.jaar + ':' + x.grootheid + ':' + x.waarde + ':' + x.reden + ':' + x.bron);
  expect(p).toEqual(expect.arrayContaining([
    J + ':omzet:1350000:prognose:Prognose.xlsx', (J + 1) + ':omzet:1500000:prognose:Prognose.xlsx', (J + 1) + ':ebitda:210000:prognose:Prognose.xlsx',
    J + ':omzet:1400000:lopend_jaar:Managementrapportage.pdf', (J + 2) + ':omzet:1700000:lopend_jaar:Managementrapportage.pdf']));
});

test('C + D: tegenstrijdige bronnen worden getoond, jaarrekening aanbevolen, herkomst volgt de keuze (criteria 4, 5)', async ({ page }) => {
  await opzet(page);
  // C: jaarrekening eerst, dan een afwijkend tussentijds cijfer voor hetzelfde jaar.
  const c = await page.evaluate(({ jr, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: jr }, 'Jaarrekening.pdf');
    return vul({ documentsoort: 'tussentijds', omzet_per_jaar: { [H3]: '1150000' } }, 'Kwartaalcijfers.pdf').map((x) => ({ key: x.key, huidig: x.huidig, nieuw: x.nieuw, hs: x.huidigSoort, ns: x.nieuwSoort }));
  }, { jr: jr('1000000', '1100000', '1200000'), H3 });
  expect(c).toEqual([{ key: 'financieel_omzet3', huidig: '1200000', nieuw: '1150000', hs: 'jaarrekening', ns: 'tussentijds' }]);
  // D: omgekeerd; dialoog tonen, aanbeveling = jaarrekening (voorgeselecteerd), pas na Toepassen gewijzigd.
  await opzet(page);
  await page.evaluate(({ H3 }) => {
    vul({ documentsoort: 'tussentijds', boekjaar: String(H3), omzet_per_jaar: { [H3]: '1150000' } }, 'Kwartaalcijfers.pdf');
    const cf = vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H3]: '1200000' } }, 'Jaarrekening.pdf');
    window._cf = cf; toonConflictDialog(cf, 'Test');
  }, { H3 });
  const dlg = page.locator('[role=dialog]');
  await expect(dlg).toContainText('Jaarrekening');
  await expect(dlg).toContainText('Tussentijdse cijfers');
  await expect(dlg).toContainText('Aanbevolen (hogere bron)');
  expect(await page.evaluate(() => S.data.financieel_omzet3), 'nog niets gewijzigd vóór Toepassen').toBe('1150000');
  expect(await dlg.locator('input[value=nieuw]').isChecked()).toBe(true);
  await dlg.getByRole('button', { name: 'Toepassen' }).click();
  const na = await page.evaluate(() => stand());
  expect(na.o3).toBe('1200000');
  expect(na.h3).toBe('Jaarrekening.pdf · Jaarrekening · boekjaar ' + H3);
});

test('E + F: meerdere documenten en boekjaren, herkomst per jaar; gelijke waarde uit hogere bron (criteria 5, 6)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ H1, H2, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H2), omzet_per_jaar: { [H1 - 1]: '900000', [H1]: '1000000', [H2]: '1100000' } }, 'Jaarrekening ' + H2 + '.pdf');
    vul({ documentsoort: 'tussentijds', boekjaar: String(H3), omzet_per_jaar: { [H3]: '1200000' } }, 'Kwartaal ' + H3 + '.pdf');
    const tussen = stand();
    const cf = vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H2]: '1100000', [H3]: '1200000' } }, 'Jaarrekening ' + H3 + '.pdf');
    return { tussen, eind: stand(), conflicten: cf.length };
  }, { H1, H2, H3 });
  expect(r.tussen).toMatchObject({ o1: '1000000', o2: '1100000', o3: '1200000' });
  expect(r.tussen.h1).toBe('Jaarrekening ' + H2 + '.pdf · Jaarrekening · boekjaar ' + H1);
  expect(r.tussen.h3).toBe('Kwartaal ' + H3 + '.pdf · Tussentijdse cijfers · boekjaar ' + H3);
  expect(r.conflicten).toBe(0);
  expect(r.eind.h3, 'gelijke waarde uit jaarrekening werkt herkomst bij').toBe('Jaarrekening ' + H3 + '.pdf · Jaarrekening · boekjaar ' + H3);
  expect(r.eind.h1).toBe('Jaarrekening ' + H2 + '.pdf · Jaarrekening · boekjaar ' + H1);
});

test('opslaan en herladen behouden herkomst en prognoses; scherm toont herkomst en prognoseblok', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ J, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H3]: '1200000' } }, 'Jaarrekening.pdf');
    vul({ documentsoort: 'prognose', prognose_per_jaar: { [J + 1]: { omzet: 1500000 } } }, 'Prognose.xlsx');
    const payload = getDataForFase('financieel');
    // Herladen: lege staat, dan dezelfde rij terug zoals de server hem levert.
    S.data = {}; S._groepData = S.data; S._docSource = {}; S._docJaar = {}; S._docSoort = {};
    loadDataFromDB([{ fase_id: 'financieel', entiteit_id: null, data_json: JSON.stringify(payload), checklist_json: '{}', notitie: '' }]);
    S.data = S._groepData;
    return { o3: payload.omzet3, prog: payload.prognoseUitDocumenten && payload.prognoseUitDocumenten.label, h3: herkomstTekst('financieel_omzet3', S.data.financieel_omzet3, 'financieel'), progNa: leesPrognoses(S.data).length };
  }, { J, H3 });
  expect(r.o3).toMatchObject({ value: '1200000', bron: 'ai_document', bron_doc: 'Jaarrekening.pdf', bron_soort: 'jaarrekening', bron_jaar: String(H3) });
  expect(r.prog).toBe('Prognoses uit documenten (geen gerealiseerde cijfers)');
  expect(r.h3).toBe('Jaarrekening.pdf · Jaarrekening · boekjaar ' + H3);
  expect(r.progNa).toBe(1);
  // Scherm Financieel (begeleiderweergave, alleen-lezen): herkomst bij het cijfer en het aparte prognoseblok.
  await page.evaluate(() => {
    S.rol = 'tussenpersoon'; S.code = 'SYNTH73'; S.traject = Object.assign({ kantoor_naam: 'Synth 73 B.V.', opdrachtgever_rol: 'verkoper', sector: 'accountancy' }, S.traject || {});
    S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'financieel'); renderApp();
  });
  await expect(page.locator('#prognose-uit-documenten')).toContainText('Prognose.xlsx');
  await expect(page.locator('#prognose-uit-documenten')).toContainText('worden daar niet in opgenomen');
  await expect(page.locator('.herkomst[data-veld="financieel_omzet3"]')).toContainText('Jaarrekening · boekjaar ' + H3);
});

test('G: handmatige correctie blijft behouden bij een nieuw boekjaar; afwijkend document wordt een keuze (punt 8)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ H1, H2, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H2), omzet_per_jaar: { [H1 - 1]: '900000', [H1]: '1000000', [H2]: '1100000' } }, 'Jaarrekening ' + H2 + '.pdf');
    // De begeleider corrigeert het meest recente jaar handmatig.
    S.data.financieel_omzet3 = '1150000'; S._userEdited.financieel_omzet3 = true; delete S._docSource.financieel_omzet3;
    // Nieuwe jaarrekening met een nieuw jaar én de vergelijkende cijfers van het gecorrigeerde jaar.
    const cf = vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H2]: '1100000', [H3]: '1200000' } }, 'Jaarrekening ' + H3 + '.pdf');
    return { s: stand(), cf: cf.map((c) => c.key + ':' + c.huidig + '->' + c.nieuw + ':' + c.huidigSoort) };
  }, { H1, H2, H3 });
  expect(r.s.o1).toBe('1000000');
  expect(r.s.o2, 'correctie verhuist mee met haar jaar').toBe('1150000');
  expect(r.s.h2).toBe('handmatig ingevuld');
  expect(r.s.o3).toBe('1200000');
  expect(r.s.h3).toBe('Jaarrekening ' + H3 + '.pdf · Jaarrekening · boekjaar ' + H3);
  expect(r.cf, 'afwijkend documentcijfer voor het gecorrigeerde jaar is een keuze, geen stille overschrijving').toEqual(['financieel_omzet2:1150000->1100000:handmatig']);
});

test('H: waardering en equity bridge veranderen niet door een prognosedocument (financiële keten)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ J, H1, H2, H3 }) => {
    S.traject = Object.assign({ sector: 'accountancy', opdrachtgever_rol: 'verkoper', structuur_type: 'bv' }, S.traject || {});
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H1]: '1000000', [H2]: '1100000', [H3]: '1200000' }, ebitda_abs: '240000', resultaat: '250000' }, 'Jaarrekening.pdf');
    S.data.financieel_nettoSchuld = S.data.financieel_nettoSchuld || '';
    const meet = () => {
      const d = dvGetDefaults();
      const w = typeof dvBerekenWaardering === 'function' ? dvBerekenWaardering() : null;
      const brug = dvBerekenOpbrengstBrug(d, dvBerekenClosing(d));
      return JSON.stringify({ omzet: d.omzet, ebitda: d.ebitda, w: w && (w.ev || w.midden || w.waarde || w), brug: { ev: brug.ev, equity: brug.equityValue100 } });
    };
    const voor = meet();
    vul({ documentsoort: 'prognose', omzet_per_jaar: { [J]: '1350000', [J + 1]: '1500000' }, ebitda_abs: '400000', resultaat: '420000', prognose_per_jaar: { [J + 1]: { omzet: 1500000, ebitda: 400000 } } }, 'Prognose.xlsx');
    vul({ documentsoort: 'onbekend', omzet_per_jaar: { [J]: '1400000' } }, 'Managementrapportage.pdf');
    return { voor, na: meet(), ebitda: S.data.financieel_ebitda, norm: S.data.financieel_ebitdaNorm };
  }, { J, H1, H2, H3 });
  expect(r.ebitda, 'EBITDA uit de jaarrekening, niet uit de prognose').toBe('240000');
  expect(r.norm).toBe('250000');
  console.log('H-meting', r.voor);
  expect(JSON.parse(r.voor).w.o3, 'meting bevat echte waarden (meest recente historische omzet)').toBe(1200000);
  expect(r.na, 'waardering en equity bridge identiek vóór en na prognose/lopend jaar').toBe(r.voor);
});

test('I + J: directe CSV-sleutels en EBITDA van een lopend jaar komen niet in historische velden, ook per entiteit (Codex-review 13-11)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ J, H3 }) => {
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), omzet_per_jaar: { [H3]: '1200000' }, ebitda_abs: '240000', resultaat: '250000', ebitda_pct: '20' }, 'Jaarrekening.pdf');
    // I: prognose met directe fase_veld-sleutels (CSV-route).
    const cI = vul({ documentsoort: 'prognose', financieel_omzet3: '1500000', financieel_ebitdaNorm: '210000', financieel_ebitda: '200000' }, 'Prognose.csv');
    // J: tussentijdse cijfers over het lopende jaar met EBITDA-bedrag en -marge.
    const cJ = vul({ documentsoort: 'tussentijds', boekjaar: String(J), ebitda_abs: '210000', ebitda_pct: '14', omzet_ytd: '900000' }, 'Kwartaal.pdf');
    const groep = { o3: S.data.financieel_omzet3, e: S.data.financieel_ebitda, n: S.data.financieel_ebitdaNorm, m: S.data.financieel_ebitdaMarge, ytd: S.data.financieel_omzetYTD };
    // Zelfde prognose via de entiteitroute (eigen bucket).
    S.dataPerEntiteit = { ENT1: { financieel_omzet3: '700000' } };
    autoFillFromExtraction('financieel', { documentsoort: 'prognose', financieel_omzet3: '999999', omzet_per_jaar: { [J + 1]: '999999' } }, false, 'Prognose BV.csv', 'ENT1', {});
    return { groep, ent: S.dataPerEntiteit.ENT1.financieel_omzet3, conflicten: cI.length + cJ.length, prog: leesPrognoses(S.data).map((x) => x.jaar + ':' + x.grootheid + ':' + x.waarde + ':' + x.reden) };
  }, { J, H3 });
  expect(r.groep).toMatchObject({ o3: '1200000', e: '240000', n: '250000', m: '20' });
  expect(r.groep.ytd, 'omzet YTD van een deelperiode blijft wel toegestaan').toBe('900000');
  expect(r.conflicten, 'geen conflict nodig: de cijfers komen er niet in').toBe(0);
  expect(r.ent, 'entiteitbucket ongemoeid door prognose').toBe('700000');
  expect(r.prog).toEqual(expect.arrayContaining([J + ':ebitda:210000:lopend_jaar']));
});

test('I2 + J2: in een leeg dossier vullen prognose-CSV en EBITDA van een lopend jaar geen historische velden (Codex-review 13-11)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ J }) => {
    vul({ documentsoort: 'prognose', financieel_omzet3: '1500000', financieel_ebitdaNorm: '210000' }, 'Prognose.csv');
    const naI = { o3: S.data.financieel_omzet3 || '', n: S.data.financieel_ebitdaNorm || '' };
    vul({ documentsoort: 'tussentijds', boekjaar: String(J), ebitda_abs: '210000', ebitda_pct: '14' }, 'Kwartaal.pdf');
    return { naI, e: S.data.financieel_ebitda || '', m: S.data.financieel_ebitdaMarge || '' };
  }, { J });
  expect(r.naI).toEqual({ o3: '', n: '' });
  expect(r.e).toBe('');
  expect(r.m).toBe('');
});

test('K: centrale grens in elk schrijfpad; geblokkeerde cijfers apart bewaard (Codex-herreview 13-11 P2)', async ({ page }) => {
  await opzet(page);
  const r = await page.evaluate(({ J, H3 }) => {
    // K1: directe CSV-prognose met bekend toekomstig boekjaar.
    vul({ documentsoort: 'prognose', boekjaar: String(J + 1), financieel_omzet3: '1500000', financieel_ebitdaNorm: '210000' }, 'Prognose.csv');
    // K2: synoniem partner_beloning en K6 omzetforecast uit een prognose.
    vul({ documentsoort: 'prognose', partner_beloning: '100000', beloning_partners: '110000', omzetforecast: '1600000' }, 'Begroting.pdf');
    // K4: lopend jaar met partnerbeloning.
    vul({ documentsoort: 'tussentijds', boekjaar: String(J), partner_beloning: '90000' }, 'Kwartaal.pdf');
    const naProg = { o3: S.data.financieel_omzet3 || '', n: S.data.financieel_ebitdaNorm || '', p: S.data.financieel_partnerBel || '', f: S.data.financieel_forecast || '' };
    // K5: een gewone jaarrekening vult partnerbeloning wel.
    vul({ documentsoort: 'jaarrekening', boekjaar: String(H3), partner_beloning: '120000' }, 'Jaarrekening.pdf');
    return { naProg, naJr: S.data.financieel_partnerBel, prog: leesPrognoses(S.data).map((x) => (x.jaar === null ? 'onbekend' : x.jaar) + ':' + x.grootheid + ':' + x.waarde + ':' + x.reden + ':' + x.bron) };
  }, { J, H3 });
  expect(r.naProg, 'geen historisch veld gevuld door prognose of lopend jaar; forecastveld wel').toEqual({ o3: '', n: '', p: '', f: '1600000' });
  expect(r.naJr, 'jaarrekening vult partnerbeloning wel (geen regressie)').toBe('120000');
  expect(r.prog).toEqual(expect.arrayContaining([
    (J + 1) + ':omzet:1500000:prognose:Prognose.csv', (J + 1) + ':ebitda:210000:prognose:Prognose.csv',
    'onbekend:partnerBel:100000:prognose:Begroting.pdf', J + ':partnerBel:90000:lopend_jaar:Kwartaal.pdf']));
});
