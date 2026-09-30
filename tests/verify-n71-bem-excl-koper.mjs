// Eenmalig verificatiescript voor N-71/P1-93 (Marcel-besluit 26 sep 2026): een koper mag BEM/
// exclusiviteitsdocumenten (opdrachtgever↔adviseur-relatie) nooit zien of downloaden, ook niet via
// een geüpload bestand met zo'n naam. Draait tegen STAGING, ruimt zichzelf op.
// Gebruik: ADMIN_KEY=... node tests/verify-n71-bem-excl-koper.mjs  (of --key=...)
import { WORKER, leesAdminKey, api, check, kop, samenvatting, accepteerPlatformvoorwaarden } from './lib.mjs';

const ADMIN = leesAdminKey();
if (!ADMIN) { console.log('Geen admin-key.'); process.exit(1); }
console.log('Worker:', WORKER);

async function uploadDoc(code, faseId, bestandsnaam, tekst) {
  const fd = new FormData();
  fd.append('file', new Blob([tekst], { type: 'application/pdf' }), bestandsnaam);
  const r = await fetch(WORKER + '/mna/document/upload?code=' + code + '&fase_id=' + faseId + '&bewaar=true', { method: 'POST', body: fd });
  return { status: r.status, json: await r.json().catch(() => null) };
}

async function main() {
  kop('SETUP · testtraject');
  const create = await api('POST', '/mna/create', {
    body: { kantoor_naam: 'DAILY_QA_N71 Testkantoor', traject_type: 'Verkoop', contact_naam: 'Test Contact', contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl' },
    adminKey: ADMIN,
  });
  const code = create.json.code, koperCode = create.json.koper_code, tussenCode = create.json.tussen_code;
  check('traject aangemaakt', !!code && !!koperCode, JSON.stringify(create.json));
  await accepteerPlatformvoorwaarden({ verkoper: code, koper: koperCode, tussenpersoon: tussenCode });

  kop('UPLOAD · BEM-bestand (juridisch-fase, expres bem-in-de-naam) + NDA-bestand + normaal DD-bestand (compliance-fase)');
  const upBem = await uploadDoc(code, 'juridisch', 'Bemiddelingsovereenkomst_Testkantoor.pdf', 'Bemiddelingsovereenkomst tussen Bisschops Financing en Testkantoor BV. Fictieve testinhoud, geen echte partij.');
  check('BEM-upload gelukt', upBem.status === 200 && upBem.json && upBem.json.ok !== false, JSON.stringify(upBem.json));
  const upNda = await uploadDoc(code, 'juridisch', 'NDA_Testkantoor.pdf', 'Geheimhoudingsovereenkomst — fictieve testinhoud.');
  check('NDA-upload gelukt', upNda.status === 200 && upNda.json && upNda.json.ok !== false, JSON.stringify(upNda.json));
  const upCompliance = await uploadDoc(code, 'compliance', 'NBA_inschrijving_Testkantoor.pdf', 'NBA-inschrijvingsbewijs — fictieve testinhoud.');
  check('compliance-doc-upload gelukt', upCompliance.status === 200 && upCompliance.json && upCompliance.json.ok !== false, JSON.stringify(upCompliance.json));

  // Documentlijst (via verkoper-code, om de echte id's + fase_id's te bepalen)
  const lijstVerkoper = await api('GET', '/mna/document/lijst/' + code + '/juridisch');
  const bemDoc = (lijstVerkoper.json || []).find(d => d.bestand_naam === 'Bemiddelingsovereenkomst_Testkantoor.pdf');
  const ndaDoc = (lijstVerkoper.json || []).find(d => d.bestand_naam === 'NDA_Testkantoor.pdf');
  check('BEM-document terugvindbaar (verkoperlijst)', !!bemDoc, JSON.stringify(lijstVerkoper.json));
  check('NDA-document terugvindbaar (verkoperlijst)', !!ndaDoc, JSON.stringify(lijstVerkoper.json));

  kop('NEGATIEF 1 · koper ziet BEM-document niet in de lijst (geen vrijgave van compliance/juridisch)');
  const lijstKoper = await api('GET', '/mna/document/lijst/' + koperCode + '/juridisch');
  const bemInKoperLijst = (lijstKoper.json || []).some(d => d.bestand_naam === 'Bemiddelingsovereenkomst_Testkantoor.pdf');
  check('BEM-document NIET in koper-lijst', !bemInKoperLijst, JSON.stringify(lijstKoper.json));

  kop('NEGATIEF 2 · koper kan BEM-document niet rechtstreeks downloaden');
  if (bemDoc) {
    const dl = await api('GET', '/mna/document/download/' + bemDoc.id + '?code=' + koperCode);
    check('BEM-download voor koper geeft 403', dl.status === 403, 'status=' + dl.status + ' ' + JSON.stringify(dl.json));
  }

  kop('POSITIEF · koper kan NDA-document wél downloaden (bestaande, ongewijzigde regel)');
  if (ndaDoc) {
    const dlNda = await api('GET', '/mna/document/download/' + ndaDoc.id + '?code=' + koperCode);
    check('NDA-download voor koper is toegestaan', dlNda.status === 200, 'status=' + dlNda.status);
  }

  kop('NEGATIEF 3 · gemanipuleerd document-ID (bestaat niet) faalt');
  const dlOngeldig = await api('GET', '/mna/document/download/nonexistent-id-12345?code=' + koperCode);
  check('niet-bestaand document-ID geeft 403 (geen 404-existence-oracle)', dlOngeldig.status === 403, 'status=' + dlOngeldig.status);

  kop('NEGATIEF 4 · ander traject faalt (cross-traject IDOR)');
  const create2 = await api('POST', '/mna/create', {
    body: { kantoor_naam: 'DAILY_QA_N71 Ander Testkantoor', traject_type: 'Verkoop', contact_naam: 'Test Contact 2', contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl' },
    adminKey: ADMIN,
  });
  const koperCode2 = create2.json.koper_code;
  await accepteerPlatformvoorwaarden({ verkoper: create2.json.code, koper: koperCode2, tussenpersoon: create2.json.tussen_code });
  if (bemDoc) {
    const dlCross = await api('GET', '/mna/document/download/' + bemDoc.id + '?code=' + koperCode2);
    check('koper van ANDER traject kan BEM-doc van traject 1 niet downloaden', dlCross.status === 403, 'status=' + dlCross.status);
  }

  kop('POSITIEF · gerechtigde rol (verkoper/begeleider) blijft BEM-document gewoon zien');
  const bemAlsVerkoper = await api('GET', '/mna/document/download/' + (bemDoc ? bemDoc.id : '') + '?code=' + code);
  check('verkoper kan eigen BEM-document nog gewoon downloaden', bemDoc && bemAlsVerkoper.status === 200, 'status=' + bemAlsVerkoper.status);
  const bemAlsBegeleider = await api('GET', '/mna/document/download/' + (bemDoc ? bemDoc.id : '') + '?code=' + tussenCode);
  check('begeleider kan BEM-document nog gewoon downloaden', bemDoc && bemAlsBegeleider.status === 200, 'status=' + bemAlsBegeleider.status);

  kop('POSITIEF · normale DD-categorie blijft correct gated (compliance nog niet vrijgegeven)');
  const lijstKoperCompliance = await api('GET', '/mna/document/lijst/' + koperCode + '/compliance');
  check('koper ziet compliance-document niet zonder vrijgave', (lijstKoperCompliance.json || []).length === 0, JSON.stringify(lijstKoperCompliance.json));
  await api('POST', '/mna/koper-categorieen/' + code + '?force=1', { adminKey: ADMIN, body: { vrijgegeven: true, categorieen: ['compliance'] } });
  const lijstKoperComplianceNa = await api('GET', '/mna/document/lijst/' + koperCode + '/compliance');
  check('koper ziet compliance-document WEL na vrijgave', (lijstKoperComplianceNa.json || []).some(d => d.bestand_naam === 'NBA_inschrijving_Testkantoor.pdf'), JSON.stringify(lijstKoperComplianceNa.json));
  const bemNogSteedsNietZichtbaar = await api('GET', '/mna/document/lijst/' + koperCode + '/juridisch');
  check('BEM blijft onzichtbaar ook al is compliance nu vrijgegeven (geen brede vrijgave-lek)', !(bemNogSteedsNietZichtbaar.json || []).some(d => d.bestand_naam === 'Bemiddelingsovereenkomst_Testkantoor.pdf'), JSON.stringify(bemNogSteedsNietZichtbaar.json));

  kop('OPRUIMEN');
  const del1 = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  check('testtraject 1 verwijderd', del1.json && del1.json.ok === true, JSON.stringify(del1.json));
  const del2 = await api('POST', '/admin/delete/mna/' + create2.json.code, { adminKey: ADMIN });
  check('testtraject 2 verwijderd', del2.json && del2.json.ok === true, JSON.stringify(del2.json));

  samenvatting();
}

main().catch(e => { console.error(e); process.exit(1); });
