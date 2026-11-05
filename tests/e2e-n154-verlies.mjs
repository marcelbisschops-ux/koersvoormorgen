// N-154 (prioriteit 0, besluit Marcel 30-10-2026): reproduceert of een opslag met een eerder geladen financieel gegevensblok
// (tweede tabblad of verouderd scherm) een tussentijdse wijziging ongemerkt terugdraait. STAGING, fictief, ruimt op.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-n154-verlies.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N154 Proef B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } });
const V = c.json.code, T = c.json.tussen_code, K = c.json.koper_code;
const uit = [];
const veld = (v) => ({ value: v, label: 'x' });
const lees = async () => { const t = await api('GET', '/mna/traject/' + V); const r = ((t.json && t.json.data) || []).find((x) => x.fase_id === 'financieel'); return r ? JSON.parse(r.data_json || '{}') : {}; };
try {
  await accepteerPlatformvoorwaarden([V, T, K]);
  const basisVan = (d) => Object.fromEntries(Object.entries(d).filter(([, x]) => x && x.value).map(([k, x]) => [k, String(x.value)]));
  let s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet3: veld('1000000'), ebitda: veld('150000') }, basis: {} } });
  uit.push(['startwaarden opgeslagen (met basis, eerste opslag)', s.status === 200 && s.json.data_json_actueel && s.json.data_json_actueel.omzet3.value === '1000000']);
  const tab1 = await lees(), tab2 = await lees(); // twee schermen laden dezelfde stand
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { ...tab1, omzet3: veld('1100000') }, basis: basisVan(tab1) } });
  uit.push(['tabblad 1 wijzigt omzet naar 1.100.000', s.status === 200]);
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { ...tab2, ebitda: veld('160000') }, basis: basisVan(tab2) } });
  let eind = await lees();
  uit.push(['verouderd tabblad 2 wijzigt alleen EBITDA: opgeslagen, omzet blijft 1.100.000, EBITDA 160.000', s.status === 200 && eind.omzet3.value === '1100000' && eind.ebitda.value === '160000' && s.json.data_json_actueel.omzet3.value === '1100000']);
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { ...tab2, omzet3: veld('1200000') }, basis: basisVan(tab2) } });
  eind = await lees();
  uit.push(['verouderd tabblad 2 wijzigt dezelfde omzet: 409 VELD_CONFLICT met actuele waarde, niets overschreven', s.status === 409 && s.json.code === 'VELD_CONFLICT' && s.json.conflicten[0].veld === 'omzet3' && s.json.conflicten[0].actueel === '1100000' && eind.omzet3.value === '1100000']);
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { ...eind, omzet3: veld('1200000') }, basis: basisVan(eind) } });
  uit.push(['met actuele basis wordt de wijziging gewoon opgeslagen', s.status === 200 && (await lees()).omzet3.value === '1200000']);
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: {}, basis: ['x'] } });
  uit.push(['ongeldige basis → 400', s.status === 400]);
  const oud = await lees();
  s = await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { ...oud, wip: veld('5000') } } });
  uit.push(['zonder basis (oudere pagina): oud gedrag blijft werken', s.status === 200 && (await lees()).wip.value === '5000']);
} finally {
  const r = await ruimTrajectOp(V, ADMIN);
  uit.push(['testtraject opgeruimd', !!(r && r.ok)]);
}
for (const [n, ok] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n);
process.exit(uit.every((x) => x[1]) ? 0 : 1);
