// N-183 (review 3, laag): de kopercriteria-beoordeling blijft werken met het toekomstfilter (alleen harde criteria,
// geen AI). STAGING, fictief, ruimt op. Draaien: staging-run.sh node tests/e2e-n183-kopercriteria.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N183 Criteria B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
const B = { 'x-tussen-key': c.tussen_code }, uit = [];
try {
  await accepteerPlatformvoorwaarden([c.code, c.tussen_code, c.koper_code]);
  await api('POST', '/mna/save', { body: { code: c.code, fase_id: 'financieel', data_json: { omzet3: { value: '2000000', label: 'Omzet' } }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: c.code, fase_id: 'it', data_json: { pctHandmatig: { value: '30', label: 'x' } }, basis: {} } });
  const o = await api('POST', '/mna/koper-criteria/opslaan', { headers: B, body: { code: c.code, criteria: [{ categorie: 'A', type: 'omzet_min', label: 'Minimale jaaromzet', waarde: '1500000' }] } });
  uit.push(['criteria opgeslagen', o.status === 200]);
  const r = await api('POST', '/mna/koper-criteria/beoordeel', { headers: B, body: { code: c.code } });
  const res = r.json && (r.json.resultaten || r.json.criteria || []);
  uit.push(['beoordeling werkt (200) en omzetcriterium wordt beoordeeld', r.status === 200 && Array.isArray(res) && res.length >= 1, JSON.stringify(r.json).slice(0, 300)]);
} finally {
  const o = await ruimTrajectOp(c.code, ADMIN); uit.push(['opgeruimd', !!(o && o.ok)]);
}
for (const [n, ok, info] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || !info ? '' : ' → ' + info));
process.exit(uit.every((x) => x[1]) ? 0 : 1);
