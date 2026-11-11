// N-146 (GO Marcel 06-11-2026, optie B): checklist en notitie van een fase mogen niet ongemerkt verdwijnen door een
// opslag vanuit een verouderd scherm (scenario 25-10: partij A vinkt aan en schrijft een notitie, partij B slaat met een
// eerder geladen scherm een veld op). STAGING, fictief, ruimt op.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-n146-checklist-notitie.mjs
const { api, d1, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N146 Proef B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } });
const V = c.json.code, T = c.json.tussen_code, K = c.json.koper_code;
const uit = [];
const veld = (v) => ({ value: v, label: 'x' });
const rij = async () => { const t = await api('GET', '/mna/traject/' + V); return ((t.json && t.json.data) || []).find((x) => x.fase_id === 'financieel') || {}; };
const leeg = { items: { 0: false, 1: false }, redflags: { 0: false } };
const save = (extra) => api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', ...extra } });
try {
  await accepteerPlatformvoorwaarden([V, T, K]);
  let s = await save({ data_json: { omzet3: veld('1000000') }, checklist_json: leeg, notitie: '', basis: {} });
  uit.push(['startstand opgeslagen', s.status === 200]);
  const scherm = await rij(); // A en B laden dezelfde stand
  const basis = { basis: { omzet3: '1000000' }, basis_checklist: scherm.checklist_json, basis_notitie: scherm.notitie || '' };
  s = await save({ data_json: { omzet3: veld('1000000') }, checklist_json: { items: { 0: true, 1: false }, redflags: { 0: false } }, notitie: 'Notitie partij A', ...basis });
  uit.push(['A vinkt punt 1 aan en schrijft een notitie', s.status === 200]);
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: leeg, notitie: '', ...basis });
  let r = await rij();
  uit.push(['B (verouderd scherm) wijzigt alleen omzet: opgeslagen, vinkje en notitie van A blijven staan', s.status === 200 && JSON.parse(r.data_json).omzet3.value === '1100000' && JSON.parse(r.checklist_json).items['0'] === true && r.notitie === 'Notitie partij A']);
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: leeg, notitie: 'Notitie partij B', basis: { omzet3: '1100000' }, basis_checklist: scherm.checklist_json, basis_notitie: '' });
  r = await rij();
  uit.push(['B wijzigt ook de notitie: 409 met de notitie van A als actuele waarde, niets overschreven', s.status === 409 && s.json.code === 'VELD_CONFLICT' && s.json.conflicten.some((x) => x.veld === '__notitie__' && x.actueel === 'Notitie partij A') && r.notitie === 'Notitie partij A']);
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: { items: { 0: false, 1: true }, redflags: { 0: false } }, notitie: '', basis: { omzet3: '1100000' }, basis_checklist: scherm.checklist_json, basis_notitie: '' });
  r = await rij();
  uit.push(['B vinkt een ander punt aan: 409 op de checklist, vinkje van A blijft', s.status === 409 && s.json.conflicten.some((x) => x.veld === '__checklist__') && JSON.parse(r.checklist_json).items['0'] === true]);
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: { items: { 0: true, 1: true }, redflags: { 0: false } }, notitie: 'Notitie partij A, aangevuld door B', basis: { omzet3: '1100000' }, basis_checklist: r.checklist_json, basis_notitie: r.notitie });
  r = await rij();
  uit.push(['met actuele basis slaat B gewoon op', s.status === 200 && JSON.parse(r.checklist_json).items['1'] === true && r.notitie === 'Notitie partij A, aangevuld door B']);
  s = await save({ data_json: {}, checklist_json: leeg, notitie: '', basis: { omzet3: '1100000' }, basis_checklist: '{kapot' });
  uit.push(['ongeldige checklist-basis → 400', s.status === 400]);
  d1("UPDATE mna_data SET checklist_json='{kapot' WHERE id='" + V + "_financieel'");
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: { items: { 0: true } }, notitie: r.notitie, basis: { omzet3: '1100000' }, basis_checklist: '{}', basis_notitie: r.notitie });
  r = await rij();
  uit.push(['onleesbare opgeslagen checklist blokkeert niet: geldige checklist herstelt hem', s.status === 200 && JSON.parse(r.checklist_json).items['0'] === true]);
  s = await save({ data_json: { omzet3: veld('1100000') }, checklist_json: leeg, notitie: 'zonder basis' });
  r = await rij();
  uit.push(['zonder basis (oudere pagina): oud gedrag blijft werken', s.status === 200 && r.notitie === 'zonder basis']);
} finally {
  const r = await ruimTrajectOp(V, ADMIN);
  uit.push(['testtraject opgeruimd', !!(r && r.ok)]);
}
for (const [n, ok] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n);
process.exit(uit.every((x) => x[1]) ? 0 : 1);
