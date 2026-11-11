// Dashboardwaardering (GO Marcel 06-11-2026, optie A): goedkeuren door de begeleider, los van LoI-generatie en AI.
// STAGING, fictief (waarderingsrij rechtstreeks in de staging-D1, geen AI-kosten), ruimt op.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-dashboardwaardering.mjs
const { api, d1, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const maak = async (n) => (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Dashwaardering ' + n + ' B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
const A = await maak('A'), B = await maak('B');
const uit = [];
const wA = 'WSYNTH' + Date.now(), wB = wA + 'B';
const akkoord = (key, code, id) => api('POST', '/mna/waardering/akkoord', { headers: key ? { 'x-tussen-key': key } : {}, body: { code, waardering_id: id } });
try {
  await accepteerPlatformvoorwaarden([A.code, A.tussen_code, A.koper_code, B.code, B.tussen_code, B.koper_code]);
  const nu = Date.now();
  d1("INSERT INTO mna_waarderingen (id,traject_id,methode,range_laag,range_midden,range_hoog,onderbouwing,ai_voorstel,adviseur_akkoord,created_at,updated_at) VALUES ('" + wA + "','" + A.code + "','EBITDA-multiple',900000,1100000,1300000,'synth','{\"loi_prijsclausule\":\"Synth prijsclausule\"}',0," + nu + "," + nu + ")");
  d1("INSERT INTO mna_waarderingen (id,traject_id,methode,range_laag,range_midden,range_hoog,onderbouwing,ai_voorstel,adviseur_akkoord,created_at,updated_at) VALUES ('" + wB + "','" + B.code + "','EBITDA-multiple',1,2,3,'synth','{}',0," + nu + "," + nu + ")");
  let r = await akkoord(A.code, A.code, wA);
  uit.push(['verkopercode mag niet goedkeuren (negatief)', r.status === 401]);
  r = await akkoord(A.tussen_code, A.code, wB);
  uit.push(['begeleider A kan waardering van traject B niet goedkeuren (negatief)', r.status === 403]);
  r = await akkoord(A.tussen_code, A.code, wA);
  uit.push(['begeleider A keurt eigen waardering goed', r.status === 200 && r.json.ok === true]);
  const g = await api('GET', '/mna/waardering/geschiedenis/' + A.code, { headers: { 'x-tussen-key': A.tussen_code } });
  const rij = (g.json.waarderingen || []).find((x) => x.id === wA);
  uit.push(['geschiedenis toont adviseur_akkoord=1', !!rij && Number(rij.adviseur_akkoord) === 1]);
  const loi = d1("SELECT COUNT(*) AS n FROM mna_doc_versies WHERE traject_id='" + A.code + "' AND doc_type IN ('loi','loi_concept')");
  const n = Array.isArray(loi) ? Number((loi[0] && (loi[0].n ?? (loi[0].results && loi[0].results[0] && loi[0].results[0].n))) || 0) : NaN;
  uit.push(['goedkeuren maakt geen LoI-concept aan (ontkoppeld)', n === 0]);
  const gB = d1("SELECT adviseur_akkoord AS a FROM mna_waarderingen WHERE id='" + wB + "'");
  const aB = Array.isArray(gB) ? Number((gB[0] && (gB[0].a ?? (gB[0].results && gB[0].results[0] && gB[0].results[0].a))) || 0) : NaN;
  uit.push(['waardering van traject B ongewijzigd', aB === 0]);
} finally {
  for (const t of [A, B]) { const o = await ruimTrajectOp(t.code, ADMIN); uit.push(['opgeruimd ' + (t === A ? 'A' : 'B'), !!(o && o.ok)]); }
}
for (const [n, ok] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n);
process.exit(uit.every((x) => x[1]) ? 0 : 1);
