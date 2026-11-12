// N-197 (12-11-2026): de interne voorgesprekrij (met adv_notitie, de interne notitie van de adviseur) gaat nooit naar
// verkoper, koper of meekijker; de begeleider en de eigen adviseur (detailroute) krijgen hem wel. STAGING, fictief, ruimt op.
import { api, d1, leesAdminKey, check, kop, samenvatting, zetMfaUitVoorTest, accepteerPlatformvoorwaarden, ruimTestTrajectOp, verwijderTestGebruiker, IS_STAGING_WORKER } from './lib.mjs';
if (!IS_STAGING_WORKER) { console.log('alleen staging'); process.exit(1); }
const ADMIN = leesAdminKey(), WW = 'TestWachtwoord123!', MERK = 'N197-GEHEIM-' + Date.now();
const email = 'e2e-n197-' + Date.now() + '@bisschopsfinancing.test';
let gid, T;
try {
  kop('Opzet');
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E N197', bedrijf: 'E2E N197 BV', email } });
  gid = uit.json && uit.json.id;
  await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { traject: true, meekijker: true } } });
  T = (await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Synth N197 B.V.', contact_naam: 'Synth V', contact_email: 'v@bisschopsfinancing.test', traject_type: 'Verkoop', sector: 'accountancy' } } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  await api('POST', '/mna/save', { body: { code: T.tussen_code, fase_id: 'voorgesprek', data_json: { adv_notitie: { label: 'Adviseur notitie', value: MERK } } } });
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'financieel', data_json: { omzet3: { label: 'Omzet', value: '1000000' } }, basis: {} } });
  check('opzet: traject en voorgesprekrij', !!(T && T.code));

  kop('Rollen');
  const verk = await api('GET', '/mna/traject/' + T.code);
  check('verkoper: geen voorgesprekrij en geen adv_notitie', verk.status === 200 && !JSON.stringify(verk.json).includes(MERK) && !(verk.json.data || []).some((r) => r.fase_id === 'voorgesprek'));
  check('verkoper: eigen fasegegevens wel aanwezig (geen regressie)', (verk.json.data || []).some((r) => r.fase_id === 'financieel'));
  // Koper: zelfde filter (elke rol behalve tussenpersoon), ook met geldige NDA en vrijgave van 'voorgesprek'.

  // Geldige koper-NDA (ndaGeldig: nda_getekend eindigt op '(koper)'), synthetisch op staging; dan vrijgave van financieel + voorgesprek.
  d1("UPDATE mna_trajecten SET nda_getekend='Synth Koper (koper)' WHERE id='" + T.code + "'");
  await api('POST', '/mna/koper-categorieen/' + T.code, { headers: { 'x-tussen-key': T.tussen_code }, body: { categorieen: ['financieel', 'voorgesprek'] } });
  const kop2 = await api('GET', '/mna/traject/' + T.koper_code);
  check('koper met geldige NDA en vrijgave: financieel wel zichtbaar (positief)', kop2.status === 200 && (kop2.json.data || []).some((r) => r.fase_id === 'financieel'), JSON.stringify((kop2.json.data || []).map((r) => r.fase_id)));
  check('koper met geldige NDA en vrijgave van voorgesprek: geen voorgesprekrij en geen adv_notitie', !(kop2.json.data || []).some((r) => r.fase_id === 'voorgesprek') && !JSON.stringify(kop2.json || {}).includes(MERK));
  const verkPost = await api('POST', '/mna/traject/' + T.code, { body: {} });
  check('verkoper POST-variant /mna/traject: geen adv_notitie', !JSON.stringify(verkPost.json || {}).includes(MERK));
  const verkSave = await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'voorgesprek', data_json: { adv_notitie: { label: 'x', value: 'overschreven' } }, basis: {} } });
  check('verkoper /mna/save op voorgesprek → 403 zonder inhoud', verkSave.status === 403 && !JSON.stringify(verkSave.json || {}).includes(MERK), verkSave.status);
  const verkSave2 = await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'voorgesprek', data_json: { adv_notitie: { label: 'x', value: 'overschreven' } } } });
  check('verkoper /mna/save zonder basis op voorgesprek → 403', verkSave2.status === 403, verkSave2.status);
  const kopSave = await api('POST', '/mna/save', { body: { code: T.koper_code, fase_id: 'voorgesprek', data_json: {}, basis: {} } });
  check('koper /mna/save op voorgesprek → 403', kopSave.status === 403, kopSave.status);
  const begSave = await api('POST', '/mna/save', { body: { code: T.tussen_code, fase_id: 'voorgesprek', data_json: { adv_notitie: { label: 'Adviseur notitie', value: MERK + '-2' } }, basis: { adv_notitie: MERK } } });
  check('begeleider /mna/save op voorgesprek → 200 (geen regressie)', begSave.status === 200, begSave.status);
  const beg = await api('GET', '/mna/traject/' + T.tussen_code);
  check('begeleider: voorgesprekrij met adv_notitie aanwezig', JSON.stringify(beg.json || {}).includes(MERK));
  const advLogin = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  const tok = advLogin.json && advLogin.json.sessie_token;
  const det = await api('GET', '/gebruikers/mna/detail/' + T.code, { headers: { 'x-gebruiker-token': tok } });
  check('eigen adviseur (detailroute): adv_notitie aanwezig', JSON.stringify(det.json || {}).includes(MERK));
  const mk = await api('POST', '/mna/admin/viewer/aanmaken', { headers: { 'x-tussen-key': T.tussen_code }, body: { traject_id: T.code, viewer_naam: 'N197 Meekijker', viewer_type: 'bank', scope_fase: 'alle', toestemming_bevestigd: true } });
  const mkCode = mk.json && (mk.json.viewer_code || mk.json.code);
  if (mkCode) {
    await api('POST', '/mna/viewer/voorwaarden/accepteren', { body: { code: mkCode } });
    const mkData = await api('GET', '/mna/viewer/data?code=' + encodeURIComponent(mkCode));
    check('meekijker (alle fasen): geen voorgesprekrij en geen adv_notitie', mkData.status === 200 && !JSON.stringify(mkData.json).includes(MERK) && !(mkData.json.data || []).some((r) => r.fase_id === 'voorgesprek'));
    check('meekijker: DD-gegevens wel aanwezig (geen regressie)', (mkData.json.data || []).some((r) => r.fase_id === 'financieel'));
  } else check('meekijker aangemaakt', false, JSON.stringify(mk.json));
  const mk2 = await api('POST', '/mna/admin/viewer/aanmaken', { headers: { 'x-tussen-key': T.tussen_code }, body: { traject_id: T.code, viewer_naam: 'N197 Meekijker 2', viewer_type: 'bank', scope_fase: 'voorgesprek', toestemming_bevestigd: true } });
  const mk2Code = mk2.json && (mk2.json.viewer_code || mk2.json.code);
  if (mk2Code) {
    await api('POST', '/mna/viewer/voorwaarden/accepteren', { body: { code: mk2Code } });
    const d2 = await api('GET', '/mna/viewer/data?code=' + encodeURIComponent(mk2Code));
    check('meekijker met scope voorgesprek: geen inhoud', !JSON.stringify(d2.json || {}).includes(MERK));
  } else check('meekijker met scope voorgesprek kan niet worden aangemaakt (ook goed)', mk2.status >= 400, JSON.stringify(mk2.json).slice(0, 120));
} finally {
  if (T && T.code) await ruimTestTrajectOp(T.code, T.tussen_code);
  if (gid) await verwijderTestGebruiker(gid, ADMIN);
}
process.exit(samenvatting() ? 1 : 0);
