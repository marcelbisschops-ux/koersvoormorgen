// KVM-FUNC-WF-001 runtimeproef kandidaten op STAGING (fictief traject, ruimt op): begeleider, opdrachtgever (verkoper)
// en koper; overgangen met bewijs, bulk met controle en idempotentie, voorleggen, formeel besluit.
// Draaien: ~/Documents/Codex/KVM-dev/tools/staging-run.sh node tests/e2e-wf001-kandidaten.mjs
const { WORKER, api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) { console.log('WEIGERT: alleen staging'); process.exit(2); }
const A = leesAdminKey(), ts = Date.now(), DOM = '@e2e-test.koersvoormorgen.invalid', uit = [];
const ck = (n, ok, d) => uit.push([n, !!ok, d]);
const c = await api('POST', '/mna/create', { adminKey: A, body: { kantoor_naam: 'Synth WF001K ' + ts, contact_naam: 'Synth Opdrachtgever', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v' + ts + DOM } });
const V = c.json.code, T = c.json.tussen_code, K = c.json.koper_code, BH = { 'x-tussen-key': T };
const B = (pad, body) => api('POST', pad, { headers: BH, body: { code: T, ...body } });
try {
  await accepteerPlatformvoorwaarden([V, T, K]);
  const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'], { type: 'application/pdf' }), 'nda-synth-getekend.pdf');
  const up = await fetch(WORKER + '/mna/document/upload?code=' + V + '&fase_id=juridisch&alleen_bewijsstuk=true', { method: 'POST', body: fd }).then((r) => r.json());
  ck('setup: traject en NDA-bewijsdocument in dossier', !!V && up && up.ok && up.doc_id, JSON.stringify(up).slice(0, 120));
  const nw = async (naam, crit, idem) => (await B('/mna/kandidaten/toevoegen', { naam, email: 'k' + idem + ts + DOM, criteria: crit, idem: idem + ts })).json.kandidaat;
  const k1 = await nw('Synth Kandidaat Een', { werkgebied: 90, dienstverlening: 85, omvang: 80, software: 95, cultuur: 70, financiering: 75 }, 'a');
  const k2 = await nw('Synth Kandidaat Twee', { werkgebied: 60 }, 'b');
  ck('kandidaten toegevoegd met verklaarbare score en dekking', k1 && k1.score === 84 && k1.dekking === 100 && k2.dekking === 25 && k2.zekerheid === 'indicatief', JSON.stringify([k1 && [k1.score, k1.dekking], k2 && [k2.score, k2.dekking]]));
  ck('koper heeft geen toegang (403)', (await api('GET', '/mna/kandidaten?code=' + K)).status === 403);
  const rev = async (id) => ((await api('GET', '/mna/kandidaten?code=' + T, { headers: BH })).json.kandidaten.find((x) => x.id === id) || {}).rev;
  const reg = async (id, g, extra) => B('/mna/kandidaten/registreer', { kandidaat_id: id, gebeurtenis: g, rev: await rev(id), ...(extra || {}) });
  ck('IM zonder NDA geweigerd', (await reg(k1.id, 'im_gedeeld')).status === 409);
  await reg(k1.id, 'teaser_verstuurd'); await reg(k1.id, 'interesse');
  ck('NDA zonder bewijs geweigerd; met bewijs uit dossier vastgelegd; IM daarna gedeeld', (await reg(k1.id, 'nda_getekend')).status === 400 && (await reg(k1.id, 'nda_getekend', { doc_id: up.doc_id })).status === 200 && (await reg(k1.id, 'im_gedeeld')).status === 200);
  const ctl = await B('/mna/kandidaten/bulk/controle', { actie: 'shortlist', ids: [k1.id, k2.id] });
  ck('bulkcontrole: Een uitvoeren, Twee geblokkeerd met reden', ctl.json.plan.find((p) => p.id === k1.id).uitkomst === 'uitvoeren' && /NDA/.test(ctl.json.plan.find((p) => p.id === k2.id).reden));
  const idem = 'bulk' + ts;
  const [u1, u2] = await Promise.all([B('/mna/kandidaten/bulk/uitvoeren', { actie: 'shortlist', ids: [k1.id, k2.id], idem }), B('/mna/kandidaten/bulk/uitvoeren', { actie: 'shortlist', ids: [k1.id, k2.id], idem })]);
  const stEen = [u1, u2].map((u) => (u.json.resultaat || []).find((r) => r.id === k1.id).status).sort().join();
  ck('gelijktijdig dubbel verzoek (dubbelklik): precies één verwerking', stEen === 'al_verwerkt,verwerkt' || stEen === 'overslaan,verwerkt', stEen);
  ck('externe verzending zonder expliciete bevestiging geweigerd; zonder teaser per kandidaat geblokkeerd met reden', (await B('/mna/kandidaten/bulk/uitvoeren', { actie: 'teaser', ids: [k2.id], idem: 'x' + ts })).json.code === 'BEVESTIGING_VEREIST' && /nog geen teaser|e-mail/.test((await B('/mna/kandidaten/bulk/controle', { actie: 'teaser', ids: [k2.id] })).json.plan[0].reden));
  ck('opdrachtgever ziet niets vóór voorleggen', (await api('GET', '/mna/kandidaten?code=' + V)).json.kandidaten.length === 0);
  ck('voorleggen', (await B('/mna/kandidaten/voorleggen', { rev: 0 })).status === 200);
  const og = await api('GET', '/mna/kandidaten?code=' + V);
  ck('opdrachtgever ziet alleen shortlist, zonder contactgegevens', og.json.kandidaten.length === 1 && !('email' in og.json.kandidaten[0]));
  ck('begeleider kan het besluit niet nemen (403)', (await B('/mna/kandidaten/besluit', { kandidaat_id: k1.id, uitkomst: 'akkoord' })).status === 403);
  const bs = await api('POST', '/mna/kandidaten/besluit', { body: { code: V, kandidaat_id: k1.id, uitkomst: 'akkoord', reden: 'Synth' } });
  const bs2 = await api('POST', '/mna/kandidaten/besluit', { body: { code: V, kandidaat_id: k1.id, uitkomst: 'niet_doorgaan' } });
  ck('formeel besluit vastgelegd met datum; tweede besluit geweigerd', bs.status === 200 && bs.json.kandidaat.besluit.uitkomst === 'akkoord' && bs.json.kandidaat.besluit.op && bs2.json.code === 'AL_BESLOTEN');
  const h = await api('GET', '/mna/kandidaten/historie?code=' + T + '&kandidaat=' + k1.id, { headers: BH });
  ck('historie compleet incl. bewijsbestand en besluit', h.json.historie.some((x) => /nda-synth-getekend\.pdf/.test(x.tekst)) && h.json.historie.some((x) => /Besluit opdrachtgever/.test(x.tekst)));
  const ws = await api('POST', '/mna/werkruimte/overleg/instellingen', { adminKey: A, body: { frequentie: 'wekelijks', dag: 4, tijd: '10:00', herinnering_uren: 24, stale_dagen: 7 } });
  ck('overleginstellingen opslaan (beheerder)', ws.status === 200, ws.status + ' ' + JSON.stringify(ws.json).slice(0, 100));
} catch (e) { ck('script', false, String(e && e.stack).slice(0, 300)); }
finally { const r = await ruimTrajectOp(V, A); ck('opgeruimd', r && r.ok); }
let f = 0; for (const [n, ok, d] of uit) { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || d === undefined ? '' : ' (' + d + ')')); if (!ok) f++; }
console.log((f ? '❌ ' : '✅ ') + (uit.length - f) + '/' + uit.length);
process.exit(f ? 1 : 0);
