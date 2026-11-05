// KVM-FUNC-WF-001 runtimeproef op STAGING (fictief, ruimt op): werkruimte (OHW), financiële koppeling (fictieve
// adapter) en kennisbank, met kantoor-eigenaar, kantoorlid en een ander kantoor. Uitkomst alleen statuscodes/vlaggen.
// Draaien: ~/Documents/Codex/KVM-dev/tools/staging-run.sh node tests/e2e-wf001-backend.mjs
const { api, leesAdminKey, zetMfaUitVoorTest, ruimTrajectOp, verwijderTestGebruiker, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) { console.log('WEIGERT: alleen staging'); process.exit(2); }
const ADMIN = leesAdminKey(), ts = Date.now(), WW = 'FictiefWF001!' + ts, DOM = '@e2e-test.koersvoormorgen.invalid', uit = [];
const ck = (n, ok, d) => uit.push([n, !!ok, d]);
const gebruikers = [], trajecten = [];
async function maakAdviseur(naam, kantoor_id) {
  const email = 'wf001-' + naam.toLowerCase().replace(/\W/g, '') + '-' + ts + DOM;
  const u = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Synth ' + naam, bedrijf: 'Synth WF001 Kantoor', email, ...(kantoor_id ? { kantoor_id } : {}) } });
  if (!u.json || !u.json.ok) throw new Error('uitnodigen mislukt ' + JSON.stringify(u.json));
  gebruikers.push(u.json.id);
  await api('POST', '/gebruikers/activeer', { body: { token: u.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  await api('POST', '/gebruikers/verkoop/' + u.json.id, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } } });
  const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Synth WF001 ' + naam + ' ' + ts, contact_naam: 'Synth Verkoper', contact_email: 'v-' + naam.toLowerCase() + ts + DOM, sector: 'accountancy', traject_type: 'Verkoop' } } });
  if (c.json && c.json.code) trajecten.push(c.json.code);
  const l = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  return { id: u.json.id, email, token: l.json && l.json.sessie_token, traject: c.json && c.json.code };
}
const H = (a) => ({ headers: { 'x-gebruiker-token': a.token } });
try {
  const A = await maakAdviseur('Eigenaar');
  const kantoor = 'K' + A.id;
  const B = await maakAdviseur('Lid', kantoor);
  const X = await maakAdviseur('Extern');
  ck('setup: drie adviseurs met sessie en traject', [A, B, X].every((x) => x.token && x.traject), JSON.stringify([A, B, X].map((x) => [!!x.token, x.traject])));
  // ── Werkruimte ──
  let r = await api('GET', '/mna/werkruimte/overleg', H(A));
  const ids = (r.json.mandaten || []).map((m) => m.id).sort();
  ck('overleg: eigenaar ziet beide kantoortrajecten, niet het externe', r.status === 200 && ids.length === 2 && ids.includes(A.traject) && ids.includes(B.traject) && !ids.includes(X.traject), JSON.stringify(ids));
  r = await api('GET', '/mna/werkruimte/overleg', H(B));
  ck('overleg: lid ziet alleen eigen traject', r.status === 200 && r.json.mandaten.length === 1 && r.json.mandaten[0].id === B.traject);
  ck('overleg zonder sessie: 401', (await api('GET', '/mna/werkruimte/overleg')).status === 401);
  const a1 = await api('POST', '/mna/werkruimte/actie', { ...H(A), body: { traject_id: B.traject, titel: 'Synth jaarcijfers opvragen', soort: 'info', eigenaar_id: B.id, deadline: '2026-11-20', idem: 'i' + ts } });
  const a1b = await api('POST', '/mna/werkruimte/actie', { ...H(A), body: { traject_id: B.traject, titel: 'Synth jaarcijfers opvragen', soort: 'info', eigenaar_id: B.id, deadline: '2026-11-20', idem: 'i' + ts } });
  ck('actie toewijzen aan collega; dubbel verzoek maakt geen tweede actie', a1.status === 200 && a1.json.nieuw === true && a1b.json.nieuw === false && a1b.json.actie.id === a1.json.actie.id);
  ck('actie op extern traject geweigerd (403)', (await api('POST', '/mna/werkruimte/actie', { ...H(A), body: { traject_id: X.traject, titel: 'x', eigenaar_id: A.id, idem: 'j' + ts } })).status === 403);
  ck('extern kantoor kan actie niet wijzigen (404)', (await api('POST', '/mna/werkruimte/actie/' + a1.json.actie.id, { ...H(X), body: { rev: 1, status: 'klaar' } })).status === 404);
  const mB = await api('GET', '/mna/werkruimte/mijn-acties', H(B));
  ck('persoonlijke actielijst collega bevat de toegewezen actie', mB.status === 200 && mB.json.acties.some((x) => x.id === a1.json.actie.id));
  r = await api('GET', '/mna/werkruimte/overleg', H(A));
  const mBt = r.json.mandaten.find((m) => m.id === B.traject);
  ck('verkeerslicht: ontbrekende informatie → geel met oorzaak', mBt.status === 'geel' && mBt.voorstel.redenen.some((x) => x.soort === 'info'), JSON.stringify(mBt.voorstel));
  const z0 = await api('POST', '/mna/werkruimte/rag', { ...H(A), body: { traject_id: B.traject, status: 'groen', rev: 0, reden: '' } });
  const z1 = await api('POST', '/mna/werkruimte/rag', { ...H(A), body: { traject_id: B.traject, status: 'groen', rev: 0, reden: 'Synth: cijfers zijn mondeling toegezegd' } });
  const z2 = await api('POST', '/mna/werkruimte/rag', { ...H(B), body: { traject_id: B.traject, status: 'rood', rev: 0, reden: 'verouderd scherm' } });
  ck('afwijken zonder reden geweigerd; met reden vastgelegd; verouderd scherm 409', z0.status === 400 && z1.status === 200 && z1.json.status === 'groen' && z2.status === 409);
  const u1 = await api('POST', '/mna/werkruimte/actie/' + a1.json.actie.id, { ...H(B), body: { rev: 1, status: 'klaar' } });
  const u2 = await api('POST', '/mna/werkruimte/actie/' + a1.json.actie.id, { ...H(A), body: { rev: 1, deadline: '2026-11-25' } });
  ck('gelijktijdige wijziging: tweede schrijver krijgt 409 met actuele waarde, afronding blijft', u1.status === 200 && u2.status === 409 && u2.json.actueel.status === 'klaar');
  const ov = await api('POST', '/mna/werkruimte/overleg/afronden', { ...H(A), body: {} });
  ck('overleg afronden', ov.status === 200 && Array.isArray(ov.json.per_eigenaar));
  // ── Financiële koppeling ──
  ck('kantoorlid: geen toegang tot kantoorfinanciën (403)', (await api('GET', '/mna/koppeling', H(B))).status === 403);
  const v = await api('POST', '/mna/koppeling/verbinden', { ...H(A), body: { systeem: 'fictief' } });
  const s1 = await api('POST', '/mna/koppeling/synchroniseren', { ...H(A), body: {} });
  const s2 = await api('POST', '/mna/koppeling/synchroniseren', { ...H(A), body: {} });
  ck('fictieve koppeling: verbinden, synchroniseren, tweede run zonder dubbele records', v.status === 200 && v.json.verbinding.simulatie && s1.status === 200 && s1.json.nieuw === 10 && s2.json.nieuw === 0 && s2.json.ongewijzigd === 10, JSON.stringify([s1.json.nieuw, s2.json.ongewijzigd]));
  await api('POST', '/mna/koppeling/mapping', { ...H(A), body: { extern_id: 'D-1001', traject_id: A.traject } });
  ck('mapping naar extern traject geweigerd (403)', (await api('POST', '/mna/koppeling/mapping', { ...H(A), body: { extern_id: 'D-1002', traject_id: X.traject } })).status === 403);
  const cp = await api('GET', '/mna/werkruimte/cockpit', H(A));
  const cA = (cp.json.mandaten || []).find((m) => m.id === A.traject);
  ck('cockpit: gefactureerd/ontvangen/openstaand met bron, OHW niet verzonnen', cp.status === 200 && cA && cA.gefactureerd.bedrag === 27000 && cA.ontvangen.bedrag === 12000 && cA.openstaand.bedrag === 15000 && cA.boekhoudkundig_ohw.bedrag === null, JSON.stringify(cA).slice(0, 200));
  ck('ander kantoor ziet geen koppeling', (await api('GET', '/mna/koppeling', H(X))).json.verbinding === null);
  ck('loskoppelen', (await api('POST', '/mna/koppeling/loskoppelen', { ...H(A), body: {} })).status === 200 && (await api('POST', '/mna/koppeling/synchroniseren', { ...H(A), body: {} })).status === 409);
  // ── Kennisbank ──
  const kd = await api('POST', '/mna/kennis/item', { ...H(A), body: { soort: 'notitie', titel: 'Synth wens', tekst: 'Synth WF001 Eigenaar ' + ts + ' wil alle medewerkers behouden.', zicht: 'dossier', traject_id: A.traject, idem: 'k' + ts } });
  const kk = await api('POST', '/mna/kennis/item', { ...H(B), body: { soort: 'werkinstructie', titel: 'Synth teaser in golven', tekst: 'Begin met tien kandidaten.', zicht: 'kantoor', idem: 'l' + ts } });
  const lB = await api('GET', '/mna/kennis', H(B)), lX = await api('GET', '/mna/kennis', H(X));
  ck('kennis: lid ziet kantoorkennis, niet de dossiernotitie van de eigenaar; ander kantoor niets', kd.status === 200 && kk.status === 200 && lB.json.items.length === 1 && lB.json.items[0].zicht === 'kantoor' && lX.json.items.length === 0);
  const nietAnon = await api('POST', '/mna/kennis/delen', { ...H(A), body: { item_id: kd.json.item.id, titel: 'Wens', tekst: 'Synth WF001 Eigenaar wil iedereen behouden', bevestigd: true, idem: 'm' + ts } });
  const anon = await api('POST', '/mna/kennis/delen', { ...H(A), body: { item_id: kd.json.item.id, titel: 'Personeel behouden als voorwaarde', tekst: 'Een verkoper wilde alle medewerkers behouden.', bevestigd: true, idem: 'n' + ts } });
  ck('delen: herkenbare naam geweigerd (422), herschreven tekst gedeeld', nietAnon.status === 422 && anon.status === 200 && anon.json.item.zicht === 'kantoor');
} catch (e) { ck('script', false, String(e && e.stack).slice(0, 300)); }
finally {
  for (const t of trajecten) { const r = await ruimTrajectOp(t, ADMIN); ck('traject opgeruimd ' + t.slice(0, 2), r && r.ok, JSON.stringify(r && r.json).slice(0, 120)); }
  for (const g of gebruikers) { const r = await verwijderTestGebruiker(g, ADMIN); ck('testadviseur verwijderd', r && r.ok, JSON.stringify(r && r.json).slice(0, 120)); }
}
let f = 0; for (const [n, ok, d] of uit) { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || d === undefined ? '' : ' (' + d + ')')); if (!ok) f++; }
console.log((f ? '❌ ' : '✅ ') + (uit.length - f) + '/' + uit.length);
process.exit(f ? 1 : 0);
