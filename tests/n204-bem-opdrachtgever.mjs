// N-204 (12-11-2026, gevonden bij #72, runtime gereproduceerd op staging): de BEM hoort bij de opdrachtgever.
// Vóór de fix las bij een kooptraject de target (verkopercode) de BEM van de koper (incl. fee) en kreeg de koper
// zijn eigen BEM niet. Per opdrachtgever (verkoper / koper / beide) en per rol: lijst /mna/versies, tekst /mna/versie
// en de BEM-velden in GET /mna/traject. STAGING, fictief, ruimt op.
import { api, leesAdminKey, d1, ruimTrajectOp, accepteerPlatformvoorwaarden, check, kop, samenvatting } from './lib.mjs';

const A = leesAdminKey();
const nu = Date.now();
const gemaakt = [];
async function traject(opdr) {
  const c = (await api('POST', '/mna/create', { adminKey: A, body: { kantoor_naam: 'Synth N204 ' + opdr + ' ' + nu, traject_type: opdr === 'verkoper' ? 'Verkoop' : 'Overname', opdrachtgever_rol: opdr, koper_naam: 'Synth Koper N204', koper_email: 'delivered@resend.dev' } })).json;
  gemaakt.push(c.code);
  await accepteerPlatformvoorwaarden([c.code, c.tussen_code, c.koper_code]);
  const id = 'N204-' + opdr + '-' + nu;
  d1(`INSERT INTO mna_doc_versies (id,traject_id,doc_type,versie,tekst,verstuurd_naar,verstuurd_door,created_at) VALUES ('${id}','${c.code}','bem',1,'SYNTH-BEM-N204 fee','x','tussenpersoon',${nu})`);
  d1(`UPDATE mna_trajecten SET bem_tekst='SYNTH-BEM-N204 veld' WHERE id='${c.code}'`);
  return { ...c, versieId: id };
}
async function ziet(code, versieId) {
  const lijst = await api('GET', '/mna/versies/' + code);
  const tekst = await api('GET', '/mna/versie/' + versieId + '?code=' + code);
  const tr = await api('GET', '/mna/traject/' + code);
  const t = (tr.json && (tr.json.traject || tr.json)) || {};
  return {
    lijst: Array.isArray(lijst.json) && lijst.json.some((r) => r.id === versieId),
    tekst: tekst.status === 200 && tekst.json && tekst.json.tekst === 'SYNTH-BEM-N204 fee',
    veld: t.bem_tekst === 'SYNTH-BEM-N204 veld',
    trajectOk: tr.status === 200,
  };
}
try {
  const verwacht = { verkoper: { verkoper: true, koper: false }, koper: { verkoper: false, koper: true }, beide: { verkoper: true, koper: true } };
  for (const opdr of ['verkoper', 'koper', 'beide']) {
    kop('Opdrachtgever: ' + opdr);
    const T = await traject(opdr);
    for (const [rol, code] of [['verkoper', T.code], ['koper', T.koper_code], ['begeleider', T.tussen_code]]) {
      const z = await ziet(code, T.versieId);
      const moet = rol === 'begeleider' ? true : verwacht[opdr][rol];
      check(opdr + ' / ' + rol + ': lijst ' + (moet ? 'wel' : 'niet'), z.lijst === moet, JSON.stringify(z));
      check(opdr + ' / ' + rol + ': tekst ' + (moet ? 'wel' : 'niet'), z.tekst === moet, JSON.stringify(z));
      if (rol !== 'begeleider') check(opdr + ' / ' + rol + ': BEM-veld in traject ' + (moet ? 'wel' : 'niet'), z.trajectOk && z.veld === moet, JSON.stringify(z));
    }
  }
} finally {
  kop('Opruimen');
  for (const c of gemaakt) check('opgeruimd ' + c.slice(0, 3) + '…', !!(await ruimTrajectOp(c, A)).ok);
}
samenvatting();
