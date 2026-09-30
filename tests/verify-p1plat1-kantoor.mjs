// Verificatiescript P1-PLAT-1 (kantoor/multi-user + Marilyn control-plane), 26 sep 2026.
// Draait tegen STAGING, volledig fictieve testdata, ruimt zichzelf op.
// Gebruik: ADMIN_KEY=... node tests/verify-p1plat1-kantoor.mjs
import { WORKER, leesAdminKey, api, check, kop, samenvatting, zetMfaUitVoorTest } from './lib.mjs';

const ADMIN = leesAdminKey();
if (!ADMIN) { console.log('Geen admin-key.'); process.exit(1); }
console.log('Worker:', WORKER);

async function activeerEnKrijgToken(token, wachtwoord, email) {
  const r = await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord } });
  const mfaUit = zetMfaUitVoorTest(email);
  if (!mfaUit.ok) console.log('  MFA-bypass niet gelukt voor ' + email + ': ' + mfaUit.reden);
  return r.json;
}

async function main() {
  const WW = 'FictiefTest!P1PLAT1_' + Date.now();
  const stamp = Date.now();

  kop('SETUP · eerste kantoorlid (nieuw kantoor, eigenaar)');
  const email1 = 'kantoor-a-eigenaar-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uit1 = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Kantoor A Eigenaar', bedrijf: 'DAILY_QA Kantoor A BV', email: email1 } });
  check('uitnodiging 1 gelukt', uit1.json && uit1.json.ok === true, JSON.stringify(uit1.json));
  const act1 = await activeerEnKrijgToken(uit1.json.token, WW, email1);
  check('activatie 1 gelukt + sessie_token', act1 && act1.ok === true && !!act1.sessie_token, JSON.stringify(act1));
  const gId1 = uit1.json.id;

  // Kantoor_id + rol rechtstreeks opvragen via de admin-kantorenlijst (nog geen bekend kantoor_id)
  const kantorenNa1 = await api('GET', '/mna/admin/kantoren', { adminKey: ADMIN });
  check('kantorenlijst toegankelijk voor admin', kantorenNa1.status === 200 && Array.isArray(kantorenNa1.json), JSON.stringify(kantorenNa1.json).slice(0, 200));
  const kantoorA = 'K' + gId1;
  const kantoorADetail = await api('GET', '/mna/admin/kantoren/' + kantoorA, { adminKey: ADMIN });
  check('nieuw kantoor A automatisch aangemaakt bij uitnodiging', kantoorADetail.status === 200 && kantoorADetail.json.kantoor && kantoorADetail.json.kantoor.id === kantoorA, JSON.stringify(kantoorADetail.json).slice(0, 300));
  check('kantoor A heeft 1 lid (eigenaar)', kantoorADetail.json.leden.length === 1 && kantoorADetail.json.leden[0].kantoor_rol === 'eigenaar', JSON.stringify(kantoorADetail.json.leden));

  kop('SETUP · tweede kantoorlid, TOEGEVOEGD aan kantoor A (collega, geen eigen nieuw kantoor)');
  const email2 = 'kantoor-a-collega-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uit2 = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Kantoor A Collega', bedrijf: 'irrelevant, kantoor_id wint', email: email2, kantoor_id: kantoorA } });
  check('uitnodiging 2 (met kantoor_id) gelukt', uit2.json && uit2.json.ok === true, JSON.stringify(uit2.json));
  const act2 = await activeerEnKrijgToken(uit2.json.token, WW, email2);
  check('activatie 2 gelukt', act2 && act2.ok === true, JSON.stringify(act2));
  const kantoorADetail2 = await api('GET', '/mna/admin/kantoren/' + kantoorA, { adminKey: ADMIN });
  check('kantoor A heeft nu 2 leden (geen tweede kantoor aangemaakt)', kantoorADetail2.json.leden.length === 2, JSON.stringify(kantoorADetail2.json.leden));
  check('collega kreeg kantoor_rol=lid', kantoorADetail2.json.leden.some(l => l.email === email2 && l.kantoor_rol === 'lid'), JSON.stringify(kantoorADetail2.json.leden));

  kop('SETUP · apart, onafhankelijk kantoor B (voor isolatie-test)');
  const email3 = 'kantoor-b-eigenaar-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uit3 = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Kantoor B Eigenaar', bedrijf: 'DAILY_QA Kantoor B BV', email: email3 } });
  const act3 = await activeerEnKrijgToken(uit3.json.token, WW, email3);
  check('kantoor B account actief', act3 && act3.ok === true, JSON.stringify(act3));
  const kantoorB = 'K' + uit3.json.id;

  kop('FUNCTIONEEL · gebruiker 1 (kantoor A, eigenaar) maakt een traject aan');
  const create1 = await api('POST', '/adviseur/create', { body: { email: email1, wachtwoord: WW, traject: { kantoor_naam: 'DAILY_QA Traject van Eigenaar A', contact_naam: 'T', contact_email: 'v@e2e-test.koersvoormorgen.invalid', koper_naam: 'K', koper_contact: 'K', koper_email: 'k@e2e-test.koersvoormorgen.invalid', traject_type: 'Verkoop' } } });
  check('traject door kantoor-A-eigenaar aangemaakt', create1.json && create1.json.ok === true, JSON.stringify(create1.json));
  const trajectCodeA = create1.json.code;
  await api('POST', '/mna/platformvoorwaarden/accepteren', { body: { code: trajectCodeA } });

  kop('NEGATIEF (Breaker-fix 26 sep) · een LID ziet het traject van zijn eigenaar-kantoorgenoot NIET');
  const trajLijst2 = await api('POST', '/adviseur/trajecten', { body: { email: email2, wachtwoord: WW } });
  check('collega (lid) login gelukt', trajLijst2.json && trajLijst2.json.ok === true, JSON.stringify(trajLijst2.json).slice(0, 200));
  check('lid ziet het traject van de eigenaar NIET (kantoorrol moet betekenis hebben)', !(trajLijst2.json.trajecten || []).some(t => t.id === trajectCodeA), JSON.stringify((trajLijst2.json.trajecten || []).map(t => t.id)));

  kop('POSITIEF (Breaker-fix 26 sep) · de EIGENAAR ziet wél een traject dat een LID heeft aangemaakt');
  const createDoorLid = await api('POST', '/adviseur/create', { body: { email: email2, wachtwoord: WW, traject: { kantoor_naam: 'DAILY_QA Traject van Lid A', contact_naam: 'T2', contact_email: 'v2@e2e-test.koersvoormorgen.invalid', koper_naam: 'K2', koper_contact: 'K2', koper_email: 'k2@e2e-test.koersvoormorgen.invalid', traject_type: 'Verkoop' } } });
  check('traject door kantoor-A-lid aangemaakt', createDoorLid.json && createDoorLid.json.ok === true, JSON.stringify(createDoorLid.json));
  const trajectCodeVanLid = createDoorLid.json.code;
  const trajLijst1Opnieuw = await api('POST', '/adviseur/trajecten', { body: { email: email1, wachtwoord: WW } });
  check('eigenaar ziet het traject van zijn lid-kantoorgenoot in /adviseur/trajecten', (trajLijst1Opnieuw.json.trajecten || []).some(t => t.id === trajectCodeVanLid), JSON.stringify((trajLijst1Opnieuw.json.trajecten || []).map(t => t.id)));

  kop('NEGATIEF · kantoor B ziet dit traject NIET');
  const trajLijst3 = await api('POST', '/adviseur/trajecten', { body: { email: email3, wachtwoord: WW } });
  check('kantoor B ziet het traject van kantoor A NIET', !(trajLijst3.json.trajecten || []).some(t => t.id === trajectCodeA), JSON.stringify((trajLijst3.json.trajecten || []).map(t => t.id)));

  kop('ADMIN · kantoor B ziet kantoor A niet, en omgekeerd (aparte records, geen menging)');
  const kantoorBDetail = await api('GET', '/mna/admin/kantoren/' + kantoorB, { adminKey: ADMIN });
  check('kantoor B heeft exact 1 lid (eigen, niet vermengd met kantoor A)', kantoorBDetail.json.leden.length === 1 && kantoorBDetail.json.leden[0].email === email3, JSON.stringify(kantoorBDetail.json.leden));

  kop('MODULE-TOGGLE · admin zet "qa" uit voor kantoor A → geldt voor BEIDE leden');
  const moduleUit = await api('POST', '/mna/admin/kantoren/' + kantoorA + '/module', { adminKey: ADMIN, body: { module_id: 'qa', enabled: false } });
  check('module qa uitgezet voor kantoor A', moduleUit.json && moduleUit.json.ok === true && moduleUit.json.enabled === false, JSON.stringify(moduleUit.json));
  const kantoorADetail3 = await api('GET', '/mna/admin/kantoren/' + kantoorA, { adminKey: ADMIN });
  const auditQa = (kantoorADetail3.json.audit || []).find(a => a.module_id === 'qa' && a.veld === 'enabled');
  check('audit-rij vastgelegd voor de qa-wijziging', !!auditQa, JSON.stringify(kantoorADetail3.json.audit));

  // Functionele bevestiging: heeftModule() leest de traject's begeleider_email → gebruiker → kantoor_id.
  // /adviseur/create hoort begeleider_email al automatisch op de aanmakende adviseur te zetten; check
  // dat rechtstreeks (via de kantoor-admin-detailview is dit niet zichtbaar, dus via een gerichte qa-poging).
  const qaPoging = await api('POST', '/mna/qa/' + trajectCodeA, { body: { vraag: 'E2E test-vraag', fase_id: 'financieel' } });
  check('qa-vraag geweigerd nu module qa uitstaat voor kantoor A (heeftModule() nu kantoor-aware)', qaPoging.status === 403 && qaPoging.json && /Q&A/i.test(qaPoging.json.error || ''), 'qaPoging=' + JSON.stringify(qaPoging.json) + ' status=' + qaPoging.status);

  // Module weer aanzetten (opruimen van effect, niet alleen data)
  await api('POST', '/mna/admin/kantoren/' + kantoorA + '/module', { adminKey: ADMIN, body: { module_id: 'qa', enabled: true } });

  kop('MARILYN-ONLY · een gewone gebruikerssessie mag de kantoor-admin-routes niet gebruiken');
  const nietAdminPoging = await api('GET', '/mna/admin/kantoren', {});
  check('kantorenlijst zonder admin-key geeft 401', nietAdminPoging.status === 401, 'status=' + nietAdminPoging.status);

  kop('REGRESSIE · bestaand individueel /gebruikers/verkoop/{id} blijft werken');
  const verkoopRegressie = await api('POST', '/gebruikers/verkoop/' + gId1, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { export: true } } });
  check('/gebruikers/verkoop/{id} werkt nog steeds (bestaande individuele weg)', verkoopRegressie.json && verkoopRegressie.json.ok === true, JSON.stringify(verkoopRegressie.json));

  kop('OPRUIMEN');
  for (const code of [trajectCodeA, trajectCodeVanLid]) {
    const del = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
    check('traject ' + code + ' verwijderd', del.json && del.json.ok === true, JSON.stringify(del.json));
  }
  for (const gid of [gId1, uit2.json.id, uit3.json.id]) {
    const dea = await api('POST', '/gebruikers/deactiveer/' + gid, { adminKey: ADMIN });
    check('gebruiker ' + gid + ' gedeactiveerd', dea.json && dea.json.ok === true, JSON.stringify(dea.json));
  }

  samenvatting();
}

main().catch(e => { console.error(e); process.exit(1); });
