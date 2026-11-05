// N-151 (besluit Marcel 29-10-2026): runtime-negatieftest op STAGING. Vrijgave met force zonder geldige NDA mag de koper
// geen identiteit, documenten, bankmutaties of bod opleveren. Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-n151-negatief.mjs
// Runtime-negatieftest N-151 op staging (fictief, ruimt op). Uitkomst alleen statuscodes.
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N151 Proef B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'delivered@resend.dev' } });
const V = c.json.code, T = c.json.tussen_code, K = c.json.koper_code, B = { 'x-tussen-key': T };
const uit = [];
try {
  await accepteerPlatformvoorwaarden([V, T, K]);
  const zonderForce = await api('POST', '/mna/koper-categorieen/' + T, { headers: B, body: { categorieen: ['financieel', 'juridisch'] } });
  uit.push(['vrijgeven zonder geldige NDA (zonder force) → melding nda_niet_getekend', zonderForce.status === 200 && zonderForce.json.nda_niet_getekend === true]);
  const metForce = await api('POST', '/mna/koper-categorieen/' + T + '?force=1', { headers: B, body: { categorieen: ['financieel', 'juridisch'] } });
  uit.push(['vrijgeven met force legt keuze vast (koper_vrijgegeven=1)', metForce.status === 200 && metForce.json.koper_vrijgegeven === 1]);
  const bm = await api('GET', '/mna/bankmutaties/lijst/' + K);
  uit.push(['koper bankmutaties (financieel vrijgegeven, geen geldige NDA) → lege lijst (bestaand ontwerp)', bm.status === 200 && Array.isArray(bm.json.imports) && bm.json.imports.length === 0]);
  const cf = await api('GET', '/mna/bankmutaties/cashflow/' + K);
  uit.push(['koper cashflow zonder geldige NDA → geen data (' + cf.status + ')', cf.status === 403 || (cf.status === 200 && JSON.stringify(cf.json).length < 200)]);
  const docs = await api('GET', '/mna/document/lijst/' + K);
  uit.push(['koper documentlijst → geen documenten of 403', docs.status === 403 || (docs.status === 200 && Array.isArray(docs.json.documenten || docs.json.docs || docs.json) && (docs.json.documenten || docs.json.docs || docs.json).length === 0)]);
  const tr = await api('GET', '/mna/traject/' + K);
  const tj = tr.json && (tr.json.traject || tr.json);
  uit.push(['koper traject-DTO zonder bedrijfsnaam', tr.status === 200 && tj && !('kantoor_naam' in tj) && !JSON.stringify(tr.json).includes('Synth N151 Proef')]);
  const bod = await api('POST', '/mna/koper/bod', { body: { code: K, bedrag: 100000 } });
  uit.push(['koper bod zonder geldige NDA → 403', bod.status === 403]);
} finally {
  const r = await ruimTrajectOp(V, ADMIN);
  uit.push(['testtraject opgeruimd', !!(r && r.ok)]);
}
uit.forEach(([n, ok]) => console.log((ok ? 'PASS ' : 'FAIL ') + n));
