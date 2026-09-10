// ══════════════════════════════════════════════════════════════════
// E2E — Transaction OS, FASE B slice (MoU-composer).
// Maakt een eigen wegwerp-adviseur + traject, activeert Transaction OS, maakt een
// MoU aan, controleert de instantiatie, en ruimt alles weer op.
//
// Draaien (staging of prod):
//   ADMIN_KEY=... WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//     node tests/e2e-tos.mjs
//   of:  node tests/e2e-tos.mjs --key=...
//
// Zonder admin-key: alleen de publieke check (componenten-endpoint eist auth → 403).
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, sla_over, kop, kleur, samenvatting } from './lib.mjs';

const ADMIN = leesAdminKey();
const WW = 'E2E-tos-' + Date.now() + '!';
const DOM = '@e2e-test.invalid';

let gebruikerId = null;
let trajectCode = null;
let tussenCode = null;

async function run() {
  console.log(kleur('vet', 'E2E — Transaction OS (MoU-slice)'));
  console.log(kleur('grijs', 'Worker: ' + WORKER));

  kop('PUBLIEK · endpoint eist auth');
  const anon = await api('GET', '/mna/tos/componenten');
  check('GET /mna/tos/componenten zonder auth → 403', anon.status === 403, 'status ' + anon.status);

  if (!ADMIN) { console.log('\n' + kleur('geel', 'Geen admin-key — de rest wordt overgeslagen.')); return; }

  kop('SETUP · wegwerp-adviseur + traject');
  const email = 'e2e-tos-' + Date.now() + DOM;
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E TOS Adviseur', bedrijf: 'E2E TOS BV', email } });
  check('uitnodigen ok', uit.json && uit.json.ok === true, JSON.stringify(uit.json));
  gebruikerId = uit.json && uit.json.id;
  const token = uit.json && uit.json.token;
  if (token) {
    const act = await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord: WW } });
    check('activeren ok', act.json && act.json.ok === true, JSON.stringify(act.json));
    const vw = await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    check('voorwaarden geaccepteerd', vw.json && vw.json.ok === true, JSON.stringify(vw.json));
  }
  await api('POST', '/gebruikers/verkoop/' + gebruikerId, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { traject: true, contracten: true } } });

  const c1 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: {
    kantoor_naam: 'E2E TOS Doelkantoor BV', contact_naam: 'Test Verkoper', contact_email: 'v' + DOM,
    koper_naam: 'E2E TOS Koper BV', koper_contact: 'Test Koper', koper_email: 'k' + DOM,
    koper_kvk: '99887766', koper_adres: 'Koperstraat 1, Oploo', verkoper_kvk: '11223344',
    verkoper_adres: 'Verkoperlaan 2, Oploo', traject_type: 'Verkoop'
  } } });
  check('traject aangemaakt', c1.json && c1.json.ok === true, JSON.stringify(c1.json));
  trajectCode = c1.json && c1.json.code;
  tussenCode = c1.json && c1.json.tussen_code;
  check('traject + tussen-code ontvangen', !!(trajectCode && tussenCode));
  if (!tussenCode) return;

  const H = { 'x-tussen-key': tussenCode };

  kop('STAP 10 · componenten-seed');
  const comp = await api('GET', '/mna/tos/componenten', { headers: H });
  check('componenten opgehaald (ok)', comp.json && comp.json.ok === true, JSON.stringify(comp.json));
  check('exact 23 component-definities', comp.json && comp.json.aantal === 23, 'aantal ' + (comp.json && comp.json.aantal));
  const bids = (comp.json && comp.json.componenten || []).map((c) => c.block_id);
  check('exclusivity aanwezig, review_domain LEGAL, binding BINDING', (() => {
    const e = (comp.json.componenten || []).find((c) => c.block_id === 'exclusivity');
    return e && e.review_domain === 'LEGAL' && e.binding_default === 'BINDING' && e.review_trigger === 'bij_bewerking';
  })());
  check('reliance aanwezig met auto-veld', (() => {
    const r = (comp.json.componenten || []).find((c) => c.block_id === 'reliance');
    return r && (r.data_fields || []).some((f) => f.type === 'x');
  })());

  kop('STAP 11 · activeren + menu');
  const activ = await api('POST', '/mna/tos/activeer/' + trajectCode, { headers: H });
  check('activeren ok, tos_actief:1', activ.json && activ.json.ok === true && activ.json.tos_actief === 1, JSON.stringify(activ.json));
  const menu = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU', { headers: H });
  check('menu opgehaald (ok)', menu.json && menu.json.ok === true, JSON.stringify(menu.json));
  check('MoU-profiel v1', menu.json && menu.json.profiel && menu.json.profiel.id === 'MOU', JSON.stringify(menu.json && menu.json.profiel));
  check('required_reviews.LEGAL === true', menu.json && menu.json.required_reviews && menu.json.required_reviews.LEGAL === true);
  check('exclusivity staat in_default', (() => {
    const e = (menu.json.menu || []).find((m) => m.block_id === 'exclusivity');
    return e && e.in_default === true;
  })());
  check('announcements NIET in_default (optioneel)', (() => {
    const a = (menu.json.menu || []).find((m) => m.block_id === 'announcements');
    return a && a.in_default === false;
  })());

  kop('STAP 12 · MoU aanmaken + ophalen');
  const mk = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'MOU' } });
  check('MoU aangemaakt (ok)', mk.json && mk.json.ok === true, JSON.stringify(mk.json));
  const docId = mk.json && mk.json.document_id;
  check('document_id ontvangen', !!docId);
  check('standaardcomponenten geïnstantieerd (15–21)', mk.json && mk.json.componenten >= 15 && mk.json.componenten <= 21, 'aantal ' + (mk.json && mk.json.componenten));
  if (!docId) return;

  const get = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('document ophalen (ok)', get.json && get.json.ok === true, JSON.stringify(get.json).slice(0, 200));
  const cs = (get.json && get.json.componenten) || [];
  check('parties + exclusivity + reliance aanwezig', ['parties', 'exclusivity', 'reliance'].every((b) => cs.some((c) => c.block_id === b)));
  check('exclusivity binding_status = BINDING', (() => {
    const e = cs.find((c) => c.block_id === 'exclusivity');
    return e && e.binding_status === 'BINDING';
  })());
  check('seller.naam voorgevuld uit traject (kantoor_naam)', (() => {
    const s = cs.find((c) => c.block_id === 'seller');
    return s && s.data_values && s.data_values.naam && s.data_values.naam.value === 'E2E TOS Doelkantoor BV' && s.data_values.naam.provenance_type === 'USER_FACT';
  })());
  check('buyer.kvk voorgevuld uit traject', (() => {
    const b = cs.find((c) => c.block_id === 'buyer');
    return b && b.data_values && b.data_values.kvk && b.data_values.kvk.value === '99887766';
  })());
  check('governing_law rechtsstelsel = "Nederlands recht" (ASSUMPTION)', (() => {
    const g = cs.find((c) => c.block_id === 'governing_law');
    return g && g.data_values && g.data_values.rechtsstelsel && g.data_values.rechtsstelsel.value === 'Nederlands recht' && g.data_values.rechtsstelsel.provenance_type === 'ASSUMPTION';
  })());
  check('elke component staat review REQUIRED', cs.every((c) => c.review && c.review.status === 'REQUIRED'));
  check('geen open divergenties bij een verse MoU', get.json && Array.isArray(get.json.divergenties) && get.json.divergenties.length === 0);

  kop('NEGATIEF · cross-traject');
  const vreemd = await api('GET', '/mna/tos/document/' + docId + '?code=ZZZZZZZZ', {});
  check('document ophalen met onbekende code → 403', vreemd.status === 403, 'status ' + vreemd.status);
}

async function opruimen() {
  kop('OPRUIMEN');
  if (!ADMIN) return sla_over('opruimen', 'geen admin-key');
  if (trajectCode) {
    const d = await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
    check('traject + tos-data verwijderd', d.json && d.json.ok === true, JSON.stringify(d.json));
  }
  if (gebruikerId) {
    const d = await api('POST', '/gebruikers/verwijder/' + gebruikerId, { adminKey: ADMIN, body: {} });
    check('testadviseur verwijderd', d.json && d.json.ok === true, JSON.stringify(d.json));
  }
}

try { await run(); } catch (e) { console.error(kleur('rood', 'Onverwachte fout: ' + (e && e.stack || e))); }
await opruimen();
samenvatting();
