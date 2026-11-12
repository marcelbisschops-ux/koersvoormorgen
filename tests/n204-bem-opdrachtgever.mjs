// N-204 (12/13-11-2026, gevonden bij #72, runtime gereproduceerd op staging; uitgebreid na Codex-FAIL 23:09): de BEM
// hoort bij de opdrachtgever. Per opdrachtgever (verkoper / koper / beide) en per rol:
//  A. gegenereerde BEM: lijst /mna/versies, tekst /mna/versie en de bem_*-velden in GET /mna/traject;
//  B. geüpload BEM-bestand (fase 'bem', zoals de eigen BEM-PDF): documentlijst, download, versiehistorie,
//     classificatie wijzigen en verwijderen; plus onbekend document-id en een code van een ander traject.
// Het BEM-bestand wordt rechtstreeks in staging-D1/R2 gezet (geen upload, dus geen AI-analyse). STAGING, fictief, ruimt op.
import { execFileSync } from 'child_process';
import { api, WORKER, leesAdminKey, d1, ruimTrajectOp, accepteerPlatformvoorwaarden, check, kop, samenvatting } from './lib.mjs';

const A = leesAdminKey();
const nu = Date.now();
const BE = new URL('../../g1g2-be-20261105/backend/', import.meta.url).pathname;
const gemaakt = [];
const r2Keys = [];
const r2Put = (key) => {
  const f = '/tmp/n204-' + nu + '.pdf';
  execFileSync('/bin/sh', ['-c', "printf '%%PDF-1.4 SYNTH-BEM-N204-PDF fee' > " + f]);
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', 'kantoorinzicht-docs-staging/' + key, '--file', f, '--content-type', 'application/pdf', '--remote'], { cwd: BE, stdio: 'ignore' });
  r2Keys.push(key);
};
async function traject(opdr) {
  const c = (await api('POST', '/mna/create', { adminKey: A, body: { kantoor_naam: 'Synth N204 ' + opdr + ' ' + nu, traject_type: opdr === 'verkoper' ? 'Verkoop' : 'Overname', opdrachtgever_rol: opdr, koper_naam: 'Synth Koper N204', koper_email: 'delivered@resend.dev' } })).json;
  gemaakt.push(c.code);
  await accepteerPlatformvoorwaarden([c.code, c.tussen_code, c.koper_code]);
  const versieId = 'N204-' + opdr + '-' + nu;
  d1(`INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES ('${versieId}','${c.code}','bem',1,'SYNTH-BEM-N204 fee','x','tussenpersoon',${nu})`);
  d1(`UPDATE mna_trajecten SET bem_tekst='SYNTH-BEM-N204 veld' WHERE id='${c.code}'`);
  const docId = 'N204DOC-' + opdr + '-' + nu, r2 = c.code + '/bem/n204-' + nu + '.pdf';
  r2Put(r2);
  d1(`INSERT INTO mna_documenten (id,traject_id,fase_id,bestand_naam,bestand_type,bestand_grootte,r2_key,bewaard,analyse,veld_extractie,methode,uploaded_at) VALUES ('${docId}','${c.code}','bem','Opdrachtbevestiging.pdf','application/pdf',30,'${r2}',1,'','[]','eigen_upload',${nu})`);
  return { ...c, versieId, docId };
}
async function ziet(code, T) {
  const lijst = await api('GET', '/mna/versies/' + code);
  const tekst = await api('GET', '/mna/versie/' + T.versieId + '?code=' + code);
  const tr = await api('GET', '/mna/traject/' + code);
  const t = (tr.json && (tr.json.traject || tr.json)) || {};
  const dlijst = await api('GET', '/mna/document/lijst/' + code + '/bem');
  const dl = await fetch(WORKER + '/mna/document/download/' + T.docId + '?code=' + code);
  const dlTekst = dl.status === 200 ? await dl.text() : '';
  const vers = await api('GET', '/mna/document/versies/' + code + '/' + T.docId);
  return {
    lijst: Array.isArray(lijst.json) && lijst.json.some((r) => r.id === T.versieId),
    tekst: tekst.status === 200 && tekst.json && tekst.json.tekst === 'SYNTH-BEM-N204 fee',
    veld: t.bem_tekst === 'SYNTH-BEM-N204 veld', trajectOk: tr.status === 200,
    docLijst: Array.isArray(dlijst.json) && dlijst.json.some((d) => d.bestand_naam === 'Opdrachtbevestiging.pdf'),
    download: dl.status === 200 && dlTekst.includes('SYNTH-BEM-N204-PDF'),
    versies: vers.status === 200,
  };
}
try {
  const verwacht = { verkoper: { verkoper: true, koper: false }, koper: { verkoper: false, koper: true }, beide: { verkoper: true, koper: true } };
  const T = {};
  for (const opdr of ['verkoper', 'koper', 'beide']) {
    kop('Opdrachtgever: ' + opdr);
    T[opdr] = await traject(opdr);
    for (const [rol, code] of [['verkoper', T[opdr].code], ['koper', T[opdr].koper_code], ['begeleider', T[opdr].tussen_code]]) {
      const z = await ziet(code, T[opdr]);
      const moet = rol === 'begeleider' ? true : verwacht[opdr][rol];
      const d = JSON.stringify(z);
      check(opdr + ' / ' + rol + ': versielijst ' + (moet ? 'wel' : 'niet'), z.lijst === moet, d);
      check(opdr + ' / ' + rol + ': versietekst ' + (moet ? 'wel' : 'niet'), z.tekst === moet, d);
      if (rol !== 'begeleider') check(opdr + ' / ' + rol + ': BEM-veld in traject ' + (moet ? 'wel' : 'niet'), z.trajectOk && z.veld === moet, d);
      check(opdr + ' / ' + rol + ': BEM-bestand in documentlijst ' + (moet ? 'wel' : 'niet'), z.docLijst === moet, d);
      check(opdr + ' / ' + rol + ': BEM-bestand downloaden ' + (moet ? 'wel' : 'niet'), z.download === moet, d);
      // Versiehistorie is voor de koper altijd verboden (bestaande regel); voor de verkoper volgt hij de BEM-regel.
      if (rol !== 'koper') check(opdr + ' / ' + rol + ': versiehistorie BEM-bestand ' + (moet ? 'wel' : 'niet'), z.versies === moet, d);
    }
  }
  kop('Schrijfacties en randgevallen (kooptraject)');
  const K = T.koper;
  const cl = await api('POST', '/mna/document/classificatie/' + encodeURIComponent(K.docId), { body: { code: K.code, classificatie: 'overig' } });
  check('target kan classificatie van BEM-bestand koper niet wijzigen', cl.status === 403, cl.status + ' ' + JSON.stringify(cl.json).slice(0, 120));
  const del = await api('POST', '/mna/document/delete/' + K.docId + '?code=' + K.code, { body: {} });
  check('target kan BEM-bestand koper niet verwijderen', del.status === 403, del.status + ' ' + JSON.stringify(del.json).slice(0, 120));
  check('BEM-bestand bestaat nog na geweigerde verwijdering', Number((d1(`SELECT COUNT(*) AS n FROM mna_documenten WHERE id='${K.docId}' AND (verwijderd IS NULL OR verwijderd=0)`)[0] || {}).n) === 1);
  const ander = await fetch(WORKER + '/mna/document/download/' + K.docId + '?code=' + T.verkoper.koper_code);
  check('koper van een ander traject kan het BEM-bestand niet downloaden', ander.status === 403, String(ander.status));
  const onbekend = await fetch(WORKER + '/mna/document/download/ONBEKEND-N204?code=' + K.koper_code);
  check('onbekend document-id geeft geen inhoud', onbekend.status !== 200, String(onbekend.status));
} finally {
  kop('Opruimen');
  for (const c of gemaakt) check('opgeruimd ' + c.slice(0, 3) + '…', !!(await ruimTrajectOp(c, A)).ok);
  for (const k of r2Keys) { try { execFileSync('npx', ['wrangler', 'r2', 'object', 'delete', 'kantoorinzicht-docs-staging/' + k, '--remote'], { cwd: BE, stdio: 'ignore' }); } catch (e) { /* al weg via trajectopruiming */ } }
}
samenvatting();
