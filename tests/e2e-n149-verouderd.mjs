// N-149 (GO Marcel 06-11-2026): tijdstip van de laatste wijziging van financiële brongegevens (basis voor de
// "verouderd sinds"-melding). STAGING, fictief, geen AI, ruimt op.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-n149-verouderd.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N149 Proef B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } });
const V = c.json.code, T = c.json.tussen_code, K = c.json.koper_code;
const uit = [];
const gesch = (key) => api('GET', '/mna/waardering/geschiedenis/' + V, { headers: key ? { 'x-tussen-key': key } : {} });
try {
  await accepteerPlatformvoorwaarden([V, T, K]);
  let g = await gesch(T);
  uit.push(['zonder financiële wijziging: financieel_gewijzigd_op = null', g.status === 200 && g.json.financieel_gewijzigd_op === null]);
  const voor = Date.now();
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'commercieel', data_json: { klanten: { value: '120', label: 'x' } }, basis: {} } });
  g = await gesch(T);
  uit.push(['wijziging in een andere fase telt niet', g.json.financieel_gewijzigd_op === null]);
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet3: { value: '1000000', label: 'x' } }, basis: {} } });
  await new Promise((r) => setTimeout(r, 1500)); // logregel wordt via waitUntil geschreven
  g = await gesch(T);
  const t = g.json.financieel_gewijzigd_op;
  uit.push(['na een financiële veldwijziging: tijdstip van die wijziging', typeof t === 'number' && t >= voor - 5000 && t <= Date.now() + 5000]);
  const i = await api('GET', '/mna/infofase/' + V, { headers: { 'x-tussen-key': T } });
  uit.push(['ook in /mna/infofase voor de begeleider', i.status === 200 && i.json.financieel_gewijzigd_op === t]);
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet3: { value: '1000000', label: 'x' } }, basis: { omzet3: '1000000' } } });
  await new Promise((r) => setTimeout(r, 1500));
  g = await gesch(T);
  uit.push(['opslag zonder echte wijziging verschuift het tijdstip niet', g.json.financieel_gewijzigd_op === t]);
  await new Promise((r) => setTimeout(r, 1100));
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: {}, basis: { omzet3: '1000000' } } });
  await new Promise((r) => setTimeout(r, 1500));
  g = await gesch(T);
  uit.push(['een gewist financieel veld telt ook als wijziging (tijdstip schuift op)', typeof g.json.financieel_gewijzigd_op === 'number' && g.json.financieel_gewijzigd_op > t]);
  g = await gesch(V);
  uit.push(['verkopercode krijgt de waarderingsgeschiedenis niet (negatief)', g.status === 401]);
  g = await gesch(K);
  uit.push(['kopercode krijgt de waarderingsgeschiedenis niet (negatief)', g.status === 401]);
} finally {
  const r = await ruimTrajectOp(V, ADMIN);
  uit.push(['testtraject opgeruimd', !!(r && r.ok)]);
}
for (const [n, ok] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n);
process.exit(uit.every((x) => x[1]) ? 0 : 1);
