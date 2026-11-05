// #97 / KVM-UAT-019 (30-10-2026): M&A Journey via de echte API op STAGING, fictieve gegevens, ruimt alles op.
// Rollen (begeleider, verkoper, koper, beheerder, externe adviseur), transactievormen (verkoop, koop, fusie),
// koopmandaat met meerdere doelwitten, voortgang uit bestaande gegevens, negatieve rolgrenzen en tenant-muur.
// Draaien: ~/Documents/Codex/KVM-dev/tools/staging-run.sh node tests/e2e-97-journey.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, ruimTestTrajectOp, ruimTestKoopmandaatOp, verwijderTestGebruiker, d1, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) { console.log('Alleen staging.'); process.exit(2); }
const A = leesAdminKey(); const ts = Date.now(); const DOM = '@e2e-test.koersvoormorgen.invalid';
const uit = []; const check = (n, ok, d) => { uit.push([n, !!ok, d]); };
const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const opruim = { eigen: [], extern: [], mandaten: [], gebruikers: [] };
const jr = (code, headers) => api('GET', '/mna/journey/' + code, { headers: headers || {} });
async function traject(naam, extra) {
  const c = await api('POST', '/mna/create', { adminKey: A, body: Object.assign({ kantoor_naam: 'Synth J97 ' + naam + ' ' + ts, sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v' + ts + DOM, koper_naam: 'Synth Koper ' + naam }, extra || {}) });
  const t = { V: c.json.code, K: c.json.koper_code, T: c.json.tussen_code };
  opruim.eigen.push(t.V); await accepteerPlatformvoorwaarden([t.V, t.K, t.T]); return t;
}
const F = (j, key) => (j.fasen || []).find((f) => f.key === key) || { items: [] };
try {
  // ── A. Verkoop ──
  const a = await traject('Verkoop');
  let b = await jr(a.T, { 'x-tussen-key': a.T });
  check('A1 begeleider → 200, 14 fasen, verkoop, bron en volgende stap', b.status === 200 && b.json.rol === 'begeleider' && b.json.fasen.length === 14 && b.json.fasen.map((f) => f.key).join() === 'intake,opdracht,voorbereiding,matching,longlist,teaser,nda,shortlist,besprekingen,loi,dd,spa,closing,nazorg' && b.json.transactievorm === 'verkoop' && b.json.fasen[0].items.every((x) => 'bron' in x) && !!b.json.volgende_stap, b.status);
  check('A1b begeleider: bestaande documentknoppen als actie', JSON.stringify(b.json).includes('bg-nda-composer-actie') && JSON.stringify(b.json).includes('bg-spa-actie'));
  let v = await jr(a.V);
  check('A2 verkoper → 200, eigen taken, geen bron, geen dealvoorstel', v.status === 200 && v.json.rol === 'verkoper' && !/"bron"|dealvoorstel|vergelijk/.test(JSON.stringify(v.json)) && v.json.fasen[0].items.some((x) => x.eigen_taak), v.status);
  let k = await jr(a.K);
  const ks = JSON.stringify(k.json || {});
  check('A3 koper vóór NDA → alleen NDA-stap, geen namen of tellers', k.status === 200 && k.json.rol === 'koper' && k.json.nda_geldig === false && k.json.fasen.every((f) => f.items.every((x) => x.key === 'nda')) && !ks.includes('Synth J97') && !ks.includes('Synth Koper') && !/teller|bron/.test(ks), ks.slice(0, 160));
  const zonder = await jr(a.T);
  check('A4 tussen_code zonder sleutel → 401', zonder.status === 401, zonder.status);
  const nep = await jr('ZZZZ' + String(ts).slice(-4));
  check('A5 onbekende code → 401', nep.status === 401, nep.status);
  const ander = await jr(a.V, { 'x-tussen-key': a.K });
  check('A6 verkopercode met koper als sleutel → geen begeleiderrechten (rol verkoper)', ander.status === 200 && ander.json.rol === 'verkoper', ander.status + ' ' + (ander.json && ander.json.rol));
  const adm = await jr(a.V, { 'x-admin-key': A });
  check('A7 beheerder op eigen traject → 200 begeleiderweergave', adm.status === 200 && adm.json.rol === 'begeleider', adm.status);
  // Voortgang uit bestaande gegevens
  await api('POST', '/mna/save', { body: { code: a.V, fase_id: 'strategisch', data_json: { niche: { value: 'Synth jaarwerk', label: 'Niche' } }, checklist_json: {} } });
  v = await jr(a.V);
  check('A8 na invullen door verkoper: intake bezig', v.json.fasen[0].items.find((x) => x.key === 'intake').status === 'bezig', JSON.stringify(v.json.fasen[0].items.find((x) => x.key === 'intake')));
  d1('UPDATE mna_trajecten SET nda_getekend=' + q('Synth Koper (koper)') + ', koper_vrijgegeven=1, koper_categorieen=' + q('["commercieel"]') + ' WHERE id=' + q(a.V)); // staging-testopzet: geldige NDA
  k = await jr(a.K);
  check('A9 koper na geldige NDA: bod is eigen taak, geen interne items', k.status === 200 && k.json.nda_geldig === true && F(k.json, 'besprekingen').items.some((x) => x.key === 'bod' && x.eigen_taak) && !/dealvoorstel|risicoraamwerk|clientacceptatie|bron/.test(JSON.stringify(k.json.fasen.map((f) => f.items))), JSON.stringify(k.json && k.json.volgende_stap));
  const bod = await api('POST', '/mna/koper/bod', { body: { code: a.K, bedrag: 2500000, toelichting: 'Synth bod' } });
  b = await jr(a.T, { 'x-tussen-key': a.T });
  check('A10 bod via platform → fase besprekingen: bod gereed voor begeleider; indicatieve brief nvt', bod.status === 200 && F(b.json, 'besprekingen').items.find((x) => x.key === 'bod').status === 'gereed' && F(b.json, 'besprekingen').items.find((x) => x.key === 'indicatieve_bieding').status === 'nvt', bod.status + ' ' + JSON.stringify(F(b.json, 'besprekingen').items.map((x) => x.key + ':' + x.status)));
  check('A11 fase NDA gereed (zelfde drempel als routekaart)', F(b.json, 'nda').items.find((x) => x.key === 'nda').status === 'gereed');
  // ── B. Koop ──
  const kp = await traject('Koop', { traject_type: 'Overname', opdrachtgever_rol: 'koper' });
  const bk = await jr(kp.T, { 'x-tussen-key': kp.T });
  check('B1 koop: transactievorm koop, variantfase zoekprofiel', bk.status === 200 && bk.json.transactievorm === 'koop' && F(bk.json, 'matching').titel === 'Zoekprofiel en koopmandaat' && F(bk.json, 'longlist').titel === 'Doelwitten en selectie', bk.status);
  // ── C. Fusie ──
  const fu = await traject('Fusie', { traject_type: 'Fusie' });
  const bf = await jr(fu.T, { 'x-tussen-key': fu.T });
  check('C1 fusie: transactievorm fusie, fusieanalyse eerlijk niet beschikbaar', bf.status === 200 && bf.json.transactievorm === 'fusie' && F(bf.json, 'voorbereiding').items.some((x) => x.key === 'fusieanalyse' && x.status === 'niet_beschikbaar'), bf.status);
  const vf = await jr(fu.V);
  check('C2 fusie verkoperweergave: fasetitels fusie', vf.status === 200 && F(vf.json, 'besprekingen').titel === 'Gesprekken en ruilverhouding');
  // ── D. Externe adviseur: tenant-muur + adv-lijst ──
  const email = 'j97-' + ts + DOM, WW = 'FictiefTest!J97_' + ts;
  const uitn = await api('POST', '/gebruikers/uitnodigen', { adminKey: A, body: { naam: 'Synth J97 Adviseur', bedrijf: 'Synth J97 Kantoor', email } });
  opruim.gebruikers.push(uitn.json.id);
  await api('POST', '/gebruikers/activeer', { body: { token: uitn.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  d1('UPDATE bf_gebruikers SET mfa=0, traject_limiet=3 WHERE id=' + q(uitn.json.id)); // staging-testopzet
  const ec = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Synth J97 Extern ' + ts, contact_naam: 'Synth', contact_email: 'ev' + ts + DOM, traject_type: 'Verkoop', sector: 'mkb', opdrachtgever_rol: 'verkoper' } } });
  const ex = { V: ec.json.code, K: ec.json.koper_code, T: ec.json.tussen_code }; opruim.extern.push(ex);
  await accepteerPlatformvoorwaarden([ex.V, ex.K, ex.T]);
  const adx = await jr(ex.V, { 'x-admin-key': A });
  check('D1 beheerder op extern adviseurstraject → 403 (muur)', adx.status === 403 && !JSON.stringify(adx.json || {}).includes('fasen'), adx.status);
  const bex = await jr(ex.T, { 'x-tussen-key': ex.T });
  check('D2 eigen begeleider (adviseur) van extern traject → 200', bex.status === 200 && bex.json.rol === 'begeleider', bex.status);
  const kruis = await jr(a.T, { 'x-tussen-key': ex.T });
  check('D3 sleutel van traject X op traject Y → 401 (geen cross-traject)', kruis.status === 401, kruis.status);
  const lijst = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  const rij = ((lijst.json && lijst.json.trajecten) || []).find((x) => x.kantoor_naam && x.kantoor_naam.includes('J97 Extern'));
  check('D4 adv-lijst bevat journeyfase per traject (alleen fase, titel, vorm)', lijst.status === 200 && rij && rij.journey && rij.journey.fase >= 1 && rij.journey.titel && Object.keys(rij.journey).sort().join() === 'fase,titel,transactievorm', JSON.stringify(rij && rij.journey));
  // N-116 op dezelfde omgeving: beheerderssleutel op TOS van het externe traject
  const tosAdm = await api('GET', '/mna/tos/documenten/' + ex.V, { adminKey: A });
  check('D5 N-116: beheerderssleutel op TOS-lijst extern traject → 403', tosAdm.status === 403, tosAdm.status);
  const tosEigen = await api('GET', '/mna/tos/documenten/' + a.V, { adminKey: A });
  check('D6 N-116: beheerderssleutel op TOS-lijst eigen traject → 200', tosEigen.status === 200, tosEigen.status);
  // ── E. Koopmandaat met meerdere doelwitten ──
  const m = (await api('POST', '/mna/koopmandaat/create', { adminKey: A, body: { koper_naam: 'Synth J97 Koper ' + ts, koper_contact_email: 'km' + ts + DOM, begeleider_naam: 'Synth', zoekt_sectoren: 'accountancy' } })).json;
  opruim.mandaten.push({ id: m.id, tussen: m.tussen_code });
  for (const naam of ['Synth Doelwit Alfa', 'Synth Doelwit Beta', 'Synth Doelwit Gamma']) await api('POST', '/mna/koopmandaat/' + m.tussen_code + '/target', { headers: { 'x-tussen-key': m.tussen_code }, body: { naam, sector: 'accountancy' } });
  const mb = await api('GET', '/mna/journey/koopmandaat/' + m.tussen_code, { headers: { 'x-tussen-key': m.tussen_code } });
  check('E1 koopmandaat begeleider: niveau koopmandaat, 3 doelwitten met naam, 14 fasen', mb.status === 200 && mb.json.niveau === 'koopmandaat' && mb.json.doelwitten.length === 3 && mb.json.doelwitten.some((x) => x.naam === 'Synth Doelwit Beta') && mb.json.fasen.length === 14, mb.status + ' ' + JSON.stringify(mb.json).slice(0, 160));
  const mk = await api('GET', '/mna/journey/koopmandaat/' + m.koper_code);
  check('E2 koopmandaat koper: doelwitten zonder namen', mk.status === 200 && mk.json.doelwitten.length === 3 && !JSON.stringify(mk.json).includes('Synth Doelwit'), mk.status);
  const mx = await api('GET', '/mna/journey/koopmandaat/' + m.tussen_code);
  check('E3 koopmandaat tussen_code zonder sleutel → 401', mx.status === 401, mx.status + ' ' + (mx.json && mx.json.rol));
  const ma = await api('GET', '/mna/journey/koopmandaat/' + m.tussen_code, { headers: { 'x-tussen-key': a.T } });
  check('E4 koopmandaat met sleutel van een ander traject → geweigerd', ma.status === 401 || ma.status === 403, ma.status);
  // ── F. Alleen-lezen: de journey wijzigt niets ──
  const voor = JSON.stringify(d1('SELECT * FROM mna_trajecten WHERE id=' + q(a.V)));
  await jr(a.T, { 'x-tussen-key': a.T }); await jr(a.V); await jr(a.K);
  check('F1 journey-aanroepen wijzigen het traject niet', voor === JSON.stringify(d1('SELECT * FROM mna_trajecten WHERE id=' + q(a.V))));
} catch (e) { check('script zonder onverwachte fout', false, String(e.stack).slice(0, 300)); }
finally {
  for (const c of opruim.eigen) { const r = await ruimTrajectOp(c, A); check('opruimen eigen ' + c.slice(0, 2) + '…', r && r.ok); }
  for (const t of opruim.extern) { const r = await ruimTestTrajectOp(t.V, t.T); check('opruimen extern', r && r.ok, r && r.status); }
  for (const mm of opruim.mandaten) { const r = await ruimTestKoopmandaatOp(mm.id, mm.tussen); const r2 = r && r.ok ? r : await api('POST', '/mna/admin/koopmandaat/verwijderen/' + mm.id, { adminKey: A, body: {} }); check('opruimen koopmandaat', r2 && (r2.ok || r2.status === 200), r2 && r2.status); }
  for (const g of opruim.gebruikers) { const r = await verwijderTestGebruiker(g, A); check('opruimen testadviseur', r && (r.ok || r.status === 200), r && r.status); }
  const rest = d1("SELECT (SELECT COUNT(*) FROM mna_trajecten WHERE kantoor_naam LIKE 'Synth J97 %') t, (SELECT COUNT(*) FROM mna_koopmandaat WHERE koper_naam LIKE 'Synth J97 %') m, (SELECT COUNT(*) FROM bf_gebruikers WHERE naam='Synth J97 Adviseur') g")[0];
  check('opruimen: D1-telling 0', rest && Number(rest.t) === 0 && Number(rest.m) === 0 && Number(rest.g) === 0, JSON.stringify(rest));
}
let f = 0; for (const [n, ok, d] of uit) { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || d === undefined ? '' : ' (' + d + ')')); if (!ok) f++; }
console.log((f ? '❌ ' : '✅ ') + (uit.length - f) + '/' + uit.length);
process.exit(f ? 1 : 0);
