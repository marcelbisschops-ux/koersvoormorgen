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
  check('26 component-definities (23 gedeeld + 3 LoI-only)', comp.json && comp.json.aantal === 26, 'aantal ' + (comp.json && comp.json.aantal));
  const bids = (comp.json && comp.json.componenten || []).map((c) => c.block_id);
  check('LoI-only componenten aanwezig (reps_warranties_kader/mac_clausule/break_fee)', ['reps_warranties_kader', 'mac_clausule', 'break_fee'].every((b) => bids.includes(b)));
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

  const lijst = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: H });
  check('documentenlijst bevat de nieuwe MoU', lijst.json && lijst.json.ok === true && (lijst.json.documenten || []).some((d) => d.id === docId && d.doc_type === 'mou' && d.status === 'draft'), JSON.stringify(lijst.json).slice(0, 200));
  const lijstKoper = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' } });
  check('documentenlijst niet toegankelijk voor koper → 403', lijstKoper.status === 403, 'status ' + lijstKoper.status);

  kop('STAP 12b · FASE D — LoI-DocumentProfiel');
  const menuMou = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU', { headers: H });
  check('MoU-menu bevat GEEN reps_warranties_kader (LoI-only)', menuMou.json && !(menuMou.json.menu || []).some((m) => m.block_id === 'reps_warranties_kader'));
  const menuLoi = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=LOI', { headers: H });
  check('LoI-menu (ok), profiel LOI@1', menuLoi.json && menuLoi.json.ok === true && menuLoi.json.profiel && menuLoi.json.profiel.id === 'LOI', JSON.stringify(menuLoi.json && menuLoi.json.profiel));
  check('LoI-menu bevat reps_warranties_kader + mac_clausule + break_fee', ['reps_warranties_kader', 'mac_clausule', 'break_fee'].every((b) => (menuLoi.json.menu || []).some((m) => m.block_id === b)));
  check('LoI-menu: break_fee optioneel (niet in default)', (() => { const b = (menuLoi.json.menu || []).find((m) => m.block_id === 'break_fee'); return b && b.in_default === false; })());
  check('LoI required_reviews: LEGAL + TAX', menuLoi.json.required_reviews && menuLoi.json.required_reviews.LEGAL === true && menuLoi.json.required_reviews.TAX === true);
  const mkLoi = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'LOI' } });
  check('LoI aangemaakt (ok), doc_type loi', mkLoi.json && mkLoi.json.ok === true && !!mkLoi.json.document_id, JSON.stringify(mkLoi.json).slice(0, 160));
  const loiId = mkLoi.json && mkLoi.json.document_id;
  const gLoi = await api('GET', '/mna/tos/document/' + loiId, { headers: H });
  check('LoI-document: doc_type=loi, reps_warranties_kader + mac_clausule geïnstantieerd', gLoi.json && gLoi.json.document.doc_type === 'loi' && ['reps_warranties_kader', 'mac_clausule'].every((b) => (gLoi.json.componenten || []).some((c) => c.block_id === b && c.instance_status === 'ACTIVE')));
  check('LoI-document: break_fee NIET standaard geïnstantieerd', gLoi.json && !(gLoi.json.componenten || []).some((c) => c.block_id === 'break_fee' && c.instance_status === 'ACTIVE'));
  const lijst2 = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: H });
  check('documentenlijst bevat nu MoU én LoI', (lijst2.json.documenten || []).some((d) => d.doc_type === 'mou') && (lijst2.json.documenten || []).some((d) => d.doc_type === 'loi'));
  // break_fee toevoegen aan de LoI kan (staat in allowed)
  const addBf = await api('POST', '/mna/tos/document/' + loiId + '/component', { headers: H, body: { block_id: 'break_fee' } });
  check('break_fee toevoegen aan LoI → ok', addBf.json && addBf.json.ok === true, JSON.stringify(addBf.json).slice(0, 120));
  // reps_warranties_kader toevoegen aan een MoU kan NIET (niet in het MoU-profiel)
  const addRwMou = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'reps_warranties_kader' } });
  check('reps_warranties_kader toevoegen aan MoU → 400 (niet in profiel)', addRwMou.status === 400, 'status ' + addRwMou.status);

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

  kop('STAP 17 · reliance-injectie + PLATFORM-beheerde componenten');
  check('POST /document geeft reliance {id,version,hash} terug', mk.json && mk.json.reliance && mk.json.reliance.id === 'reliance' && !!mk.json.reliance.hash, JSON.stringify(mk.json.reliance));
  const relComp = cs.find((c) => c.block_id === 'reliance');
  check('reliance-component heeft tekst, provenance PLATFORM', relComp && relComp.text && relComp.text.length > 30 && relComp.text_provenance === 'PLATFORM', JSON.stringify(relComp && { p: relComp.text_provenance, len: (relComp.text || '').length }));
  const relEp = await api('GET', '/mna/tos/reliance', { headers: H });
  check('GET /mna/tos/reliance ok, content + hash', relEp.json && relEp.json.ok === true && !!relEp.json.content && !!relEp.json.content_hash);
  check('reliance-componenttekst == de centrale disclaimer', relComp && relEp.json && relComp.text === relEp.json.content);
  const nbp = cs.find((c) => c.block_id === 'non_binding_provisions');
  check('non_binding_provisions auto-tekst, provenance PLATFORM', nbp && nbp.text && nbp.text.length > 30 && nbp.text_provenance === 'PLATFORM');
  const bp = cs.find((c) => c.block_id === 'binding_provisions');
  check('binding_provisions auto-tekst noemt "bindend"', bp && /bindend/i.test(bp.text || ''));
  // niet bewerkbaar / niet verwijderbaar / geen AI-concept
  const relPatch = await api('PATCH', '/mna/tos/component/' + relComp.instance_id, { headers: H, body: { text: 'gehackt' } });
  check('PATCH reliance → 409 (automatisch beheerd)', relPatch.status === 409, 'status ' + relPatch.status);
  const relConc = await api('POST', '/mna/tos/component/' + relComp.instance_id + '/concept', { headers: H, body: {} });
  check('AI-concept op reliance → 409', relConc.status === 409, 'status ' + relConc.status);
  const relDel = await api('POST', '/mna/tos/document/' + docId + '/component/' + relComp.instance_id + '/verwijder', { headers: H });
  check('verwijder reliance → 409', relDel.status === 409, 'status ' + relDel.status);
  // exportcheck: PLATFORM-componenten leveren geen review-blocker
  const ecR = await api('GET', '/mna/tos/document/' + docId + '/exportcheck', { headers: H });
  check('exportcheck: geen blocker op reliance of non_binding_provisions', !(ecR.json.blockers || []).some((b) => b.block_id === 'reliance' || b.block_id === 'non_binding_provisions'), JSON.stringify(ecR.json.blockers));

  kop('STAP 13 · componenten toevoegen/verwijderen/bewerken + AI-concept');
  const exclIid = (cs.find((c) => c.block_id === 'exclusivity') || {}).instance_id;
  check('exclusivity-instance gevonden', !!exclIid);

  // PATCH: dataslot wijzigen
  const p1 = await api('PATCH', '/mna/tos/component/' + exclIid, { headers: H, body: { data_values: { duur_dagen: 90 } } });
  check('PATCH dataslot ok, doc-versie omhoog', p1.json && p1.json.ok === true && p1.json.document_version >= 2, JSON.stringify(p1.json));
  check('PATCH review_vervallen === false (nog geen review)', p1.json && p1.json.review_vervallen === false);
  const g2 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('duur_dagen = 90, provenance USER_FACT', (() => {
    const e = (g2.json.componenten || []).find((c) => c.block_id === 'exclusivity');
    return e && e.data_values.duur_dagen && e.data_values.duur_dagen.value === '90' && e.data_values.duur_dagen.provenance_type === 'USER_FACT';
  })());

  // component toevoegen
  const add = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'announcements' } });
  check('announcements toegevoegd', add.json && add.json.ok === true && !!add.json.instance_id, JSON.stringify(add.json));
  const annIid = add.json && add.json.instance_id;
  const addDup = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'announcements' } });
  check('dubbel toevoegen → 409', addDup.status === 409, 'status ' + addDup.status);

  // component verwijderen (soft)
  const del = await api('POST', '/mna/tos/document/' + docId + '/component/' + annIid + '/verwijder', { headers: H });
  check('announcements soft-verwijderd (REMOVED_IN_v)', del.json && del.json.ok === true && /^REMOVED_IN_v\d+$/.test(del.json.instance_status || ''), JSON.stringify(del.json));
  const g3 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('verwijderde instance blijft zichtbaar met REMOVED-status', (() => {
    const a = (g3.json.componenten || []).find((c) => c.instance_id === annIid);
    return a && /^REMOVED_IN_v/.test(a.instance_status);
  })());

  // AI-concept (echte Claude-call)
  const conc = await api('POST', '/mna/tos/component/' + exclIid + '/concept', { headers: H, body: {} });
  check('AI-concept ok, tekst niet leeg, provenance AI_INFERENCE', conc.json && conc.json.ok === true && typeof conc.json.text === 'string' && conc.json.text.length > 20 && conc.json.text_provenance === 'AI_INFERENCE', JSON.stringify(conc.json).slice(0, 160));

  // mens bewerkt de tekst → provenance wisselt naar USER_FACT
  const p2 = await api('PATCH', '/mna/tos/component/' + exclIid, { headers: H, body: { text: 'Exclusiviteit geldt voor 90 dagen vanaf ondertekening van deze MoU.' } });
  check('PATCH tekst → provenance USER_FACT', p2.json && p2.json.ok === true && p2.json.text_provenance === 'USER_FACT', JSON.stringify(p2.json));

  // AI mag door mens bewerkte tekst niet overschrijven
  const conc2 = await api('POST', '/mna/tos/component/' + exclIid + '/concept', { headers: H, body: {} });
  check('AI-concept op door mens bewerkte tekst → 409', conc2.status === 409, 'status ' + conc2.status);

  // PATCH op onbekend component → 404
  const p404 = await api('PATCH', '/mna/tos/component/tosinst-onbestaand', { headers: H, body: { text: 'x' } });
  check('PATCH onbekend component → 404', p404.status === 404, 'status ' + p404.status);

  kop('STAP 14 · reviewlevenscyclus + aftekeninstelling + exportcheck');
  // exportcheck op een verse MoU: er staan reviews open → niet exporteerbaar
  const ec1 = await api('GET', '/mna/tos/document/' + docId + '/exportcheck', { headers: H });
  check('exportcheck ok:false met blockers', ec1.json && ec1.json.ok === false && Array.isArray(ec1.json.blockers) && ec1.json.blockers.length > 0, JSON.stringify(ec1.json).slice(0, 200));
  check('een REVIEW_MISSING op exclusivity', (ec1.json.blockers || []).some((b) => b.code === 'REVIEW_MISSING' && b.block_id === 'exclusivity'));

  // review op een "nooit"-component (timeline) → 400
  const tlIid = (g3.json.componenten || []).find((c) => c.block_id === 'timeline');
  if (tlIid) {
    const rNooit = await api('POST', '/mna/tos/component/' + tlIid.instance_id + '/review', { headers: H, body: { actie: 'aanvragen' } });
    check('review op timeline (trigger nooit) → 400', rNooit.status === 400, 'status ' + rNooit.status);
  } else { check('timeline-instance aanwezig', false, 'niet gevonden'); }

  // ongeldige overgang: goedkeuren vanuit REQUIRED → 409
  const rBad = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'goedkeuren' } });
  check('goedkeuren vanuit REQUIRED → 409', rBad.status === 409, 'status ' + rBad.status);

  // volledige cyclus op exclusivity
  const rA = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'aanvragen' } });
  check('review aanvragen → REQUESTED', rA.json && rA.json.review && rA.json.review.status === 'REQUESTED', JSON.stringify(rA.json));
  const rB = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'in_behandeling' } });
  check('in behandeling → IN_REVIEW', rB.json && rB.json.review && rB.json.review.status === 'IN_REVIEW');
  const rC = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'wijzigingen_gevraagd', opmerking: 'graag startdatum toevoegen' } });
  check('wijzigingen gevraagd → CHANGES_REQUESTED', rC.json && rC.json.review && rC.json.review.status === 'CHANGES_REQUESTED');
  const rD = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'goedkeuren', naam: 'Mr. Test Jurist', hoedanigheid: 'advocaat' } });
  check('goedkeuren → APPROVED, review_kind ADVISOR (naam opgegeven)', rD.json && rD.json.review && rD.json.review.status === 'APPROVED' && rD.json.review.review_kind === 'ADVISOR', JSON.stringify(rD.json));
  const g4 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('doc toont exclusivity review APPROVED', (() => { const e = (g4.json.componenten || []).find((c) => c.block_id === 'exclusivity'); return e && e.review && e.review.status === 'APPROVED'; })());

  // invalidatie: wijziging ná goedkeuring → SUPERSEDED
  const inval = await api('PATCH', '/mna/tos/component/' + exclIid, { headers: H, body: { data_values: { startdatum: '2026-10-01' } } });
  check('PATCH ná APPROVED → review_vervallen:true', inval.json && inval.json.review_vervallen === true, JSON.stringify(inval.json));
  const g5 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('doc toont exclusivity review SUPERSEDED', (() => { const e = (g5.json.componenten || []).find((c) => c.block_id === 'exclusivity'); return e && e.review && e.review.status === 'SUPERSEDED'; })());

  // opnieuw aftekenen kan vanuit SUPERSEDED
  await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'aanvragen' } });
  const rReAppr = await api('POST', '/mna/tos/component/' + exclIid + '/review', { headers: H, body: { actie: 'goedkeuren', naam: 'Mr. Test Jurist', hoedanigheid: 'advocaat' } });
  check('opnieuw goedkeuren na SUPERSEDED → APPROVED', rReAppr.json && rReAppr.json.review && rReAppr.json.review.status === 'APPROVED');

  // bulk-aftekening: hele MoU in één actie
  const revAll = await api('POST', '/mna/tos/document/' + docId + '/review-alles', { headers: H, body: { naam: 'Mr. Bulk Jurist', hoedanigheid: 'advocaat' } });
  check('review-alles: ≥1 onderdeel afgetekend', revAll.json && revAll.json.ok === true && revAll.json.afgetekend >= 1, JSON.stringify(revAll.json).slice(0, 200));
  const gAll = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  const _auto = ['binding_provisions', 'non_binding_provisions', 'reliance'];
  check('na review-alles: geen enkel te-beoordelen onderdeel meer open', !(gAll.json.componenten || []).some((c) => !_auto.includes(c.block_id) && ['LEGAL', 'TAX', 'VALUATION'].includes(c.review_domain) && c.review_trigger !== 'nooit' && !(c.review && c.review.status === 'APPROVED')));
  const ecAll = await api('GET', '/mna/tos/document/' + docId + '/exportcheck', { headers: H });
  check('na review-alles: exportcheck heeft geen REVIEW-blockers', !(ecAll.json.blockers || []).some((b) => b.code === 'REVIEW_MISSING' || b.code === 'REVIEW_OPEN'), JSON.stringify(ecAll.json.blockers));
  const revAllLeeg = await api('POST', '/mna/tos/document/' + docId + '/review-alles', { headers: H, body: { naam: 'Mr. Bulk Jurist', hoedanigheid: 'advocaat' } });
  check('review-alles nogmaals → 0 afgetekend (idempotent)', revAllLeeg.json && revAllLeeg.json.afgetekend === 0);
  const revAllKoper = await api('POST', '/mna/tos/document/' + docId + '/review-alles', { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' }, body: { naam: 'x' } });
  check('review-alles niet toegankelijk voor koper → 403', revAllKoper.status === 403, 'status ' + revAllKoper.status);

  // aftekeneis uitschakelen voor juridisch → opt-out + geen LEGAL-blockers meer
  const setUit = await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'uit' } });
  check('setting juridisch=uit, opt-out zichtbaar', setUit.json && setUit.json.setting && setUit.json.setting.juridisch === 'uit' && setUit.json.opt_out_zichtbaar_op_document === true, JSON.stringify(setUit.json));
  const ec2 = await api('GET', '/mna/tos/document/' + docId + '/exportcheck', { headers: H });
  check('exportcheck: geen REVIEW_MISSING/REVIEW_OPEN meer met juridisch=uit', !(ec2.json.blockers || []).some((b) => b.code === 'REVIEW_MISSING' || b.code === 'REVIEW_OPEN'), JSON.stringify(ec2.json.blockers));
  // terugzetten
  await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'vereist' } });

  kop('STAP 15 · divergentiedetectie');
  const sellerIid = (g5.json.componenten || []).find((c) => c.block_id === 'seller');
  check('seller-instance gevonden', !!sellerIid);
  // seller.naam wijkt af van de transactionele data (kantoor_naam) → flag
  const dv1 = await api('PATCH', '/mna/tos/component/' + sellerIid.instance_id, { headers: H, body: { data_values: { naam: 'Heel Andere Naam BV' } } });
  check('PATCH seller.naam → divergentie:true', dv1.json && dv1.json.divergentie === true, JSON.stringify(dv1.json));
  const gd1 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('doc toont open divergentie op seller.naam met 2 bronnen', (() => {
    const f = (gd1.json.divergenties || []).find((x) => x.dataslot_key === 'seller.naam');
    return f && Array.isArray(f.instances) && f.instances.length >= 2 &&
      f.instances.some((b) => b.bron === 'transactionele_data') && f.instances.some((b) => b.bron === 'component');
  })(), JSON.stringify(gd1.json.divergenties));
  // terugzetten naar de trajectwaarde → convergeert, flag verdwijnt
  const dv2 = await api('PATCH', '/mna/tos/component/' + sellerIid.instance_id, { headers: H, body: { data_values: { naam: 'E2E TOS Doelkantoor BV' } } });
  check('PATCH terug naar trajectwaarde → divergentie:false', dv2.json && dv2.json.divergentie === false, JSON.stringify(dv2.json));
  const gd2 = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('open divergentie op seller.naam is opgelost', !(gd2.json.divergenties || []).some((x) => x.dataslot_key === 'seller.naam'));

  // cross-document: tweede MoU in hetzelfde traject, exclusivity.duur_dagen anders → flag
  const mk2 = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'MOU' } });
  check('tweede MoU aangemaakt', mk2.json && mk2.json.ok === true, JSON.stringify(mk2.json));
  const doc2 = mk2.json && mk2.json.document_id;
  const g2doc = await api('GET', '/mna/tos/document/' + doc2, { headers: H });
  const excl2 = (g2doc.json.componenten || []).find((c) => c.block_id === 'exclusivity');
  const dx = await api('PATCH', '/mna/tos/component/' + excl2.instance_id, { headers: H, body: { data_values: { duur_dagen: 120 } } });
  check('doc1 heeft duur 90, doc2 → 120 → divergentie:true', dx.json && dx.json.divergentie === true, JSON.stringify(dx.json));
  const gd3 = await api('GET', '/mna/tos/document/' + doc2, { headers: H });
  check('cross-document flag op exclusivity.duur_dagen (2 componentbronnen)', (() => {
    const f = (gd3.json.divergenties || []).find((x) => x.dataslot_key === 'exclusivity.duur_dagen');
    return f && f.instances.filter((b) => b.bron === 'component').length === 2;
  })(), JSON.stringify(gd3.json.divergenties));

  kop('STAP 20 · gate-integriteit RV-4 (elke uitgang blokkeert bij een ontbrekende review)');
  await api('POST', '/mna/tos/document/' + doc2 + '/setting', { headers: H, body: { juridisch: 'vereist', fiscaal: 'vereist', cijfers: 'vereist' } });
  const ec20 = await api('GET', '/mna/tos/document/' + doc2 + '/exportcheck', { headers: H });
  check('exportcheck blokkeert (review mist)', ec20.json && ec20.json.ok === false && Array.isArray(ec20.json.blockers) && ec20.json.blockers.length > 0);
  const fin20 = await api('POST', '/mna/tos/document/' + doc2 + '/finaliseer', { headers: H });
  check('finaliseren geblokkeerd → ok:false + blockers, GEEN 403', fin20.status === 200 && fin20.json && fin20.json.ok === false && Array.isArray(fin20.json.blockers) && fin20.json.blockers.length > 0, 'status ' + fin20.status);
  const verstuur20 = await api('POST', '/mna/tos/document/' + doc2 + '/verstuur', { headers: H });
  check('versturen kan niet vóór finaliseren → 409', verstuur20.status === 409, 'status ' + verstuur20.status);
  const man20 = await api('GET', '/mna/tos/document/' + doc2 + '/manifest', { headers: H });
  check('manifest bestaat nog niet → 404', man20.status === 404, 'status ' + man20.status);
  check('geblokkeerde respons lekt geen componenttekst/dataslots', JSON.stringify(fin20.json).indexOf('data_values') === -1 && JSON.stringify(fin20.json).indexOf('text') === -1 && JSON.stringify(ec20.json).indexOf('data_values') === -1);

  kop('STAP 19 · finaliseren + versturen + manifest');
  // 1. finaliseren wordt geblokkeerd zolang er reviews openstaan (juridisch=vereist) — géén 403
  await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'vereist', fiscaal: 'vereist', cijfers: 'vereist' } });
  const finGeblokkeerd = await api('POST', '/mna/tos/document/' + docId + '/finaliseer', { headers: H });
  check('finaliseren met open reviews → ok:false + blockers (status 200)', finGeblokkeerd.status === 200 && finGeblokkeerd.json && finGeblokkeerd.json.ok === false && Array.isArray(finGeblokkeerd.json.blockers) && finGeblokkeerd.json.blockers.length > 0, JSON.stringify(finGeblokkeerd.json).slice(0, 200));

  // 2. begeleider zet de aftekeneis voor alle domeinen uit → finaliseren kan
  await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'uit', fiscaal: 'uit', cijfers: 'uit' } });
  const fin = await api('POST', '/mna/tos/document/' + docId + '/finaliseer', { headers: H });
  check('finaliseren → ok:true, status exported', fin.json && fin.json.ok === true && fin.json.status === 'exported', JSON.stringify(fin.json).slice(0, 200));
  check('manifest_id + content_hash + manifest_hash aanwezig', fin.json && !!fin.json.manifest_id && /^[0-9a-f]{64}$/.test(fin.json.content_hash || '') && /^[0-9a-f]{64}$/.test(fin.json.manifest_hash || ''), JSON.stringify(fin.json).slice(0, 200));
  check('component_refs bevat "reliance@1" en "exclusivity@1"', fin.json && Array.isArray(fin.json.component_refs) && fin.json.component_refs.includes('reliance@1') && fin.json.component_refs.some((r) => r.startsWith('exclusivity@')), JSON.stringify(fin.json.component_refs));
  check('disclaimer_ref = reliance@1, policy_version aanwezig', fin.json && fin.json.disclaimer_ref === 'reliance@1' && !!fin.json.policy_version);

  // 3. dubbel finaliseren → 409
  const finDup = await api('POST', '/mna/tos/document/' + docId + '/finaliseer', { headers: H });
  check('nogmaals finaliseren → 409', finDup.status === 409, 'status ' + finDup.status);

  // 4. bevroren: geen mutaties meer op een gefinaliseerd document
  const frozenPatch = await api('PATCH', '/mna/tos/component/' + exclIid, { headers: H, body: { data_values: { duur_dagen: 45 } } });
  check('PATCH op gefinaliseerd document → 409', frozenPatch.status === 409, 'status ' + frozenPatch.status);
  const frozenAdd = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'earn_out' } });
  check('component toevoegen aan gefinaliseerd document → 409', frozenAdd.status === 409, 'status ' + frozenAdd.status);
  const frozenSet = await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'vereist' } });
  check('setting wijzigen op gefinaliseerd document → 409', frozenSet.status === 409, 'status ' + frozenSet.status);

  // 5. versturen: eerst een verse MoU (nog draft) → 409, dan de gefinaliseerde → verstuurd
  const verstuurDraft = await api('POST', '/mna/tos/document/' + doc2 + '/verstuur', { headers: H });
  check('versturen van een nog niet gefinaliseerd document → 409', verstuurDraft.status === 409, 'status ' + verstuurDraft.status);
  const verstuur = await api('POST', '/mna/tos/document/' + docId + '/verstuur', { headers: H, body: { adressaten: ['verkoper'] } });
  check('versturen → ok:true, status verstuurd, adressaten [verkoper]', verstuur.json && verstuur.json.ok === true && verstuur.json.status === 'verstuurd' && JSON.stringify(verstuur.json.adressaten) === '["verkoper"]', JSON.stringify(verstuur.json));
  check('geen mail naar een .invalid-adres (mail_overgeslagen)', verstuur.json && verstuur.json.mail_overgeslagen === true, JSON.stringify(verstuur.json));
  const verstuurDup = await api('POST', '/mna/tos/document/' + docId + '/verstuur', { headers: H });
  check('nogmaals versturen → 409', verstuurDup.status === 409, 'status ' + verstuurDup.status);

  // 6. manifest ophalen (begeleider) — reproduceerbaarheid zonder inhoud
  const man = await api('GET', '/mna/tos/document/' + docId + '/manifest', { headers: H });
  check('manifest ophalen ok', man.json && man.json.ok === true && man.json.manifest, JSON.stringify(man.json).slice(0, 160));
  check('manifest.content_hash == finaliseer.content_hash', man.json && man.json.manifest && man.json.manifest.content_hash === fin.json.content_hash);
  check('manifest.review_refs bevat geen reviewer-naam', man.json && man.json.manifest && JSON.stringify(man.json.manifest.review_refs).indexOf('Test Jurist') === -1, JSON.stringify(man.json.manifest.review_refs));
  const manDraft = await api('GET', '/mna/tos/document/' + doc2 + '/manifest', { headers: H });
  check('manifest van een niet-gefinaliseerd document → 404', manDraft.status === 404, 'status ' + manDraft.status);

  // 7. leestoegang: verkoper (adressaat) mag het verstuurde document nu lezen — maar zonder
  //    interne composer-informatie (reviewer-naam, provenance-typering, divergentievlaggen)
  const verkLees = await api('GET', '/mna/tos/document/' + docId, { headers: { 'x-tussen-key': trajectCode } });
  check('verkoper leest het verstuurde document → 200, status verstuurd', verkLees.status === 200 && verkLees.json && verkLees.json.document && verkLees.json.document.status === 'verstuurd', 'status ' + verkLees.status);
  check('verkoper-weergave lekt geen reviewer-naam / provenance / divergenties', verkLees.json && JSON.stringify(verkLees.json).indexOf('Test Jurist') === -1 && JSON.stringify(verkLees.json).indexOf('text_provenance') === -1 && JSON.stringify(verkLees.json).indexOf('provenance_type') === -1 && Array.isArray(verkLees.json.divergenties) && verkLees.json.divergenties.length === 0);
  const koperLees = await api('GET', '/mna/tos/document/' + docId, { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' } });
  check('koper (geen adressaat) leest het verstuurde document niet → 403', koperLees.status === 403, 'status ' + koperLees.status);

  kop('STAP 18 · append-only audit-keten');
  const verifyBeg = await api('GET', '/mna/tos/manifest/verify', { headers: H });
  check('audit-keten verifiëren door begeleider → 403 (alleen admin)', verifyBeg.status === 403, 'status ' + verifyBeg.status);
  const verify = await api('GET', '/mna/tos/manifest/verify', { adminKey: ADMIN });
  check('audit-keten intact (ok:true)', verify.json && verify.json.ok === true, JSON.stringify(verify.json));
  check('keten bevat de events van deze test (rijen > 10)', verify.json && verify.json.rijen > 10, 'rijen ' + (verify.json && verify.json.rijen));
  check('laatste_seq == aantal rijen (gaploos)', verify.json && verify.json.laatste_seq === verify.json.rijen, JSON.stringify(verify.json));

  kop('NEGATIEF · cross-traject + rol-scoping (stap 16)');
  const vreemd = await api('GET', '/mna/tos/document/' + docId + '?code=ZZZZZZZZ', {});
  check('document ophalen met onbekende code → 403', vreemd.status === 403, 'status ' + vreemd.status);
  // koper-code: rol wordt herkend, maar tosCanAccess weigert (koper is geen adressaat van dit document)
  const koperGet = await api('GET', '/mna/tos/document/' + docId, { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' } });
  check('koper zonder adressaatrecht leest het document niet → 403', koperGet.status === 403, 'status ' + koperGet.status);
  const koperMenu = await api('GET', '/mna/tos/menu/' + trajectCode, { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' } });
  check('koper opent het menu niet → 403', koperMenu.status === 403, 'status ' + koperMenu.status);
  // verkoper-code (de id-code): idem
  const verkPatch = await api('PATCH', '/mna/tos/component/' + exclIid, { headers: { 'x-tussen-key': trajectCode }, body: { text: 'x' } });
  check('verkoper mag geen component bewerken → 403', verkPatch.status === 403, 'status ' + verkPatch.status);

  kop('STAP 21 · purge + reproduceerbaarheid (FASE C — CONTENT weg, MANIFEST blijft)');
  const preManTr = await api('GET', '/mna/tos/manifest/traject/' + trajectCode, { adminKey: ADMIN });
  check('reproduceerbaarheidsroute: ≥1 manifest vóór de purge', preManTr.json && preManTr.json.aantal >= 1, JSON.stringify(preManTr.json).slice(0, 160));
  const preHash = fin.json && fin.json.content_hash;
  const preVerify = await api('GET', '/mna/tos/manifest/verify', { adminKey: ADMIN });
  const preRijen = preVerify.json && preVerify.json.rijen;
  const purge = await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
  check('traject gepurged', purge.json && purge.json.ok === true, JSON.stringify(purge.json));
  const naPurgeDoc = await api('GET', '/mna/tos/document/' + docId, { adminKey: ADMIN });
  check('document-inhoud weg na purge → 404', naPurgeDoc.status === 404, 'status ' + naPurgeDoc.status);
  const postManTr = await api('GET', '/mna/tos/manifest/traject/' + trajectCode, { adminKey: ADMIN });
  check('manifest overleeft de purge (zelfde aantal)', postManTr.json && postManTr.json.aantal === preManTr.json.aantal, 'voor ' + (preManTr.json && preManTr.json.aantal) + ' na ' + (postManTr.json && postManTr.json.aantal));
  check('manifest.content_hash ongewijzigd na purge', postManTr.json && (postManTr.json.manifesten || []).some((m) => m.content_hash === preHash));
  check('manifest bevat geen rauwe trajectcode of klantnaam', postManTr.json && JSON.stringify(postManTr.json).indexOf(trajectCode) === -1 && JSON.stringify(postManTr.json).indexOf('E2E TOS Doelkantoor') === -1);
  const postVerify = await api('GET', '/mna/tos/manifest/verify', { adminKey: ADMIN });
  check('audit-keten nog intact ná de purge (rijen niet gekrompen)', postVerify.json && postVerify.json.ok === true && postVerify.json.rijen >= preRijen, JSON.stringify(postVerify.json));
  trajectCode = null; // opruimen() hoeft dit traject niet meer te verwijderen
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
