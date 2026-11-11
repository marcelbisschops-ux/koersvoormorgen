// N-183: analyse toekomstbestendigheid en beoordeling door de begeleider. STAGING, fictief, geen AI, ruimt op.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-n183-toekomst.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const maak = async (n) => (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N183 ' + n + ' B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
const A = await maak('A'), B = await maak('B');
const uit = [];
const veld = (x) => ({ value: x, label: 'x' });
const get = (key, code) => api('GET', '/mna/toekomst/' + code, { headers: key ? { 'x-tussen-key': key } : {} });
const post = (key, body) => api('POST', '/mna/toekomst/beoordeling', { headers: key ? { 'x-tussen-key': key } : {}, body });
try {
  await accepteerPlatformvoorwaarden([A.code, A.tussen_code, A.koper_code, B.code, B.tussen_code, B.koper_code]);
  await api('POST', '/mna/save', { body: { code: A.code, fase_id: 'commercieel', data_json: { pctCompliance: veld('60'), pctAdviesTerugkerend: veld('25'), pctAdviesIncidenteel: veld('10'), dienstmixBron: veld('feit') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: A.code, fase_id: 'it', data_json: { pctHandmatig: veld('30'), stdWerkprogramma: veld('Ja'), stdSjablonen: veld('Ja'), stdBankkoppeling: veld('Deels') }, basis: {} } });
  let r = await get(A.tussen_code, A.code);
  const adv = r.json && r.json.analyse && r.json.analyse.dimensies.find((d) => d.id === 'advies');
  uit.push(['begeleider ziet analyse uit opgeslagen velden (advies 35%, processen 83)', r.status === 200 && adv && adv.waarden.some((w) => w.waarde === '35%') && r.json.analyse.dimensies.find((d) => d.id === 'processen').indicator === 83, r.json]);
  uit.push(['verkopercode krijgt de analyse niet (negatief)', (await get(A.code, A.code)).status === 403]);
  uit.push(['kopercode krijgt de analyse niet (negatief)', (await get(A.koper_code, A.code)).status === 403]);
  uit.push(['begeleider B krijgt analyse van traject A niet (negatief)', (await get(B.tussen_code, A.code)).status === 403]);
  uit.push(['zonder sleutel geen toegang', (await get(null, A.code)).status === 403]);
  let stand = (await get(A.tussen_code, A.code)).json.stand;
  uit.push(['GET geeft een stand-kenmerk (64 hex)', /^[0-9a-f]{64}$/.test(stand || '')]);
  r = await post(A.tussen_code, { code: A.code, rev: 0, stand, beoordeeld: false, in_im: true, toelichting: '' });
  uit.push(['opnemen in IM zonder beoordeling → 400', r.status === 400]);
  r = await post(A.tussen_code, { code: A.code, rev: 0, stand: 'f'.repeat(64), beoordeeld: true, in_im: true, toelichting: 'Synth toelichting' });
  uit.push(['beoordeling met een andere stand dan de actuele → 409 STAND_GEWIJZIGD, niets opgeslagen', r.status === 409 && r.json.code === 'STAND_GEWIJZIGD' && (await get(A.tussen_code, A.code)).json.rev === 0]);
  r = await post(A.tussen_code, { code: A.code, rev: 0, stand, beoordeeld: true, in_im: true, toelichting: 'Synth toelichting' });
  uit.push(['beoordeling vastgelegd (rev 1)', r.status === 200 && r.json.rev === 1 && r.json.beoordeling.in_im === true]);
  r = await post(A.tussen_code, { code: A.code, rev: 0, stand, beoordeeld: true, in_im: false, toelichting: '' });
  uit.push(['verouderde rev → 409 REV_CONFLICT, niets overschreven', r.status === 409 && r.json.code === 'REV_CONFLICT' && (await get(A.tussen_code, A.code)).json.beoordeling.in_im === true]);
  r = await get(A.tussen_code, A.code);
  uit.push(['na beoordeling: actueel en geldige IM-vrijgave, momentopname niet zichtbaar', r.json.beoordeling.actueel === true && r.json.beoordeling.in_im_geldig === true && !('momentopname' in r.json.beoordeling), r.json.beoordeling]);
  const itNu = await api('GET', '/mna/traject/' + A.code);
  const itRij = ((itNu.json && itNu.json.data) || []).find((x) => x.fase_id === 'it');
  const itData = JSON.parse(itRij.data_json);
  const bas = Object.fromEntries(Object.entries(itData).filter(([, x]) => x && x.value).map(([k, x]) => [k, String(x.value)]));
  await api('POST', '/mna/save', { body: { code: A.code, fase_id: 'it', data_json: { ...itData, pctHandmatig: veld('10') }, basis: bas } });
  r = await get(A.tussen_code, A.code);
  uit.push(['verkoper wijzigt toekomstveld na beoordeling: vrijgave vervalt (actueel false)', r.json.beoordeling.actueel === false && r.json.beoordeling.in_im_geldig === false && r.json.beoordeling.in_im === true, r.json.beoordeling]);
  r = await post(B.tussen_code, { code: A.code, rev: 1, stand, beoordeeld: false, in_im: false, toelichting: '' });
  uit.push(['begeleider B kan beoordeling van A niet wijzigen (negatief)', r.status === 403]);
  r = await post(A.code, { code: A.code, rev: 1, stand, beoordeeld: false, in_im: false, toelichting: '' });
  uit.push(['verkoper kan beoordeling niet wijzigen (negatief)', r.status === 403]);
  stand = (await get(A.tussen_code, A.code)).json.stand;
  r = await post(A.tussen_code, { code: A.code, rev: 1, stand, beoordeeld: true, in_im: false, toelichting: 'x'.repeat(1501) });
  uit.push(['te lange toelichting → 400', r.status === 400]);
} finally {
  for (const t of [A, B]) { const o = await ruimTrajectOp(t.code, ADMIN); uit.push(['opgeruimd', !!(o && o.ok)]); }
}
for (const [n, ok, info] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || !info ? '' : ' → ' + JSON.stringify(info).slice(0, 300)));
process.exit(uit.every((x) => x[1]) ? 0 : 1);
