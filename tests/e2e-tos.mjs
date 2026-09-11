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
  check('30 component-definities (23 gedeeld + 3 LoI + 4 NDA)', comp.json && comp.json.aantal === 30, 'aantal ' + (comp.json && comp.json.aantal));
  const bids = (comp.json && comp.json.componenten || []).map((c) => c.block_id);
  check('LoI-only componenten aanwezig (reps_warranties_kader/mac_clausule/break_fee)', ['reps_warranties_kader', 'mac_clausule', 'break_fee'].every((b) => bids.includes(b)));
  check('NDA-only componenten aanwezig (nda_scope/nda_toegestane_ontvangers/nda_duur/nda_boetebeding)', ['nda_scope', 'nda_toegestane_ontvangers', 'nda_duur', 'nda_boetebeding'].every((b) => bids.includes(b)));
  check('gedeeld component "parties" nu eligibility MOU+LOI+NDA', (() => { const p = (comp.json.componenten || []).find((c) => c.block_id === 'parties'); return p && (p.eligibility || []).includes('NDA') && (p.eligibility || []).includes('MOU'); })());
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
  // Bevinding 11 sep 2026 ("manifest error"): finaliseren blokkeert nu op ontbrekende KERN-onderdelen.
  // Dat mag een default-aangemaakt document (MoU/LoI/NDA, ongewijzigd) nooit blokkeren — anders zou
  // deze fix zelf een nieuwe regressie zijn (ChatGPT-tegenspraak op de diff wees hier expliciet op:
  // de eerdere test bewees alleen dat tosCanExport() een AANGELEVERDE lijst blokkeert, niet dat het
  // systeem die lijst in productie correct als leeg berekent voor een standaarddocument).
  const menuMouNieuw = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU&document=' + docId, { headers: H });
  check('nieuw default-MoU: geen ontbrekend KERN-onderdeel', menuMouNieuw.json && Array.isArray(menuMouNieuw.json.ontbrekend_kern) && menuMouNieuw.json.ontbrekend_kern.length === 0, JSON.stringify(menuMouNieuw.json && menuMouNieuw.json.ontbrekend_kern));

  const lijst = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: H });
  check('documentenlijst bevat de nieuwe MoU', lijst.json && lijst.json.ok === true && (lijst.json.documenten || []).some((d) => d.id === docId && d.doc_type === 'mou' && d.status === 'draft'), JSON.stringify(lijst.json).slice(0, 200));
  // Sinds 11 sep 2026 (Marcel: "composer wordt de enige [weg voor NDA/LoI]") krijgt de koper hier wél
  // toegang, maar tosCanAccess() filtert 'm hard: alleen documenten met status='verstuurd' waarbij
  // zijn rol in adressaten staat. Op dit punt in de test is nog niets verstuurd, dus 200 + lege lijst
  // — geen 403 meer (dat zou nu juist een regressie zijn: zie STAP 12c hieronder voor het positieve
  // geval ná verstuur).
  const lijstKoper = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' } });
  check('documentenlijst voor koper: 200 maar leeg (nog niets verstuurd)', lijstKoper.status === 200 && lijstKoper.json && lijstKoper.json.ok === true && Array.isArray(lijstKoper.json.documenten) && lijstKoper.json.documenten.length === 0, 'status ' + lijstKoper.status + ' ' + JSON.stringify(lijstKoper.json).slice(0, 160));

  kop('STAP 12b · FASE D — LoI- en NDA-DocumentProfiel');
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
  const menuLoiNieuw = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=LOI&document=' + loiId, { headers: H });
  check('nieuw default-LoI: geen ontbrekend KERN-onderdeel', menuLoiNieuw.json && Array.isArray(menuLoiNieuw.json.ontbrekend_kern) && menuLoiNieuw.json.ontbrekend_kern.length === 0, JSON.stringify(menuLoiNieuw.json && menuLoiNieuw.json.ontbrekend_kern));
  const lijst2 = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: H });
  check('documentenlijst bevat nu MoU én LoI', (lijst2.json.documenten || []).some((d) => d.doc_type === 'mou') && (lijst2.json.documenten || []).some((d) => d.doc_type === 'loi'));
  // break_fee toevoegen aan de LoI kan (staat in allowed)
  const addBf = await api('POST', '/mna/tos/document/' + loiId + '/component', { headers: H, body: { block_id: 'break_fee' } });
  check('break_fee toevoegen aan LoI → ok', addBf.json && addBf.json.ok === true, JSON.stringify(addBf.json).slice(0, 120));
  // reps_warranties_kader toevoegen aan een MoU kan NIET (niet in het MoU-profiel)
  const addRwMou = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'reps_warranties_kader' } });
  check('reps_warranties_kader toevoegen aan MoU → 400 (niet in profiel)', addRwMou.status === 400, 'status ' + addRwMou.status);

  // NDA-profiel
  const menuNda = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=NDA', { headers: H });
  check('NDA-menu (ok), profiel NDA@1', menuNda.json && menuNda.json.ok === true && menuNda.json.profiel && menuNda.json.profiel.id === 'NDA');
  check('NDA-menu bevat nda_scope/nda_duur + het gedeelde "parties" (eligibility-uitbreiding werkt)', (() => { const b = (menuNda.json.menu || []).map((m) => m.block_id); return b.includes('nda_scope') && b.includes('nda_duur') && b.includes('parties'); })());
  check('NDA-menu bevat GEEN exclusivity/reps_warranties_kader (niet in NDA-profiel)', !(menuNda.json.menu || []).some((m) => m.block_id === 'exclusivity' || m.block_id === 'reps_warranties_kader'));
  check('NDA required_reviews: alleen LEGAL', menuNda.json.required_reviews && menuNda.json.required_reviews.LEGAL === true && menuNda.json.required_reviews.TAX === false && menuNda.json.required_reviews.VALUATION === false);

  // Structurele invariant (ChatGPT-tegenspraak op de manifest-fix, 11 sep 2026): niet alleen "NDA
  // mist 'target' niet meer" losstaand testen, maar de onderliggende regel afdwingen voor ALLE
  // profielen — anders vangt de test alleen de ÉÉN concrete fout die we al kenden, niet de volgende
  // keer dat iemand een nieuw KERN-component toevoegt en vergeet het aan het default-rijtje toe te
  // voegen. Voor elk profiel: elk KERN-onderdeel in het menu moet in_default zijn.
  [['MOU', menuMou], ['LOI', menuLoi], ['NDA', menuNda]].forEach(([naam, m]) => {
    const missend = (m.json.menu || []).filter((x) => x.completeness_role === 'kern' && x.in_default !== true);
    check(naam + ': elk KERN-onderdeel staat in het default-rijtje', missend.length === 0, 'ontbreken: ' + missend.map((x) => x.block_id).join(', '));
  });

  const mkNda = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'NDA' } });
  check('NDA aangemaakt (ok), doc_type nda', mkNda.json && mkNda.json.ok === true && !!mkNda.json.document_id, JSON.stringify(mkNda.json).slice(0, 160));
  const ndaId = mkNda.json && mkNda.json.document_id;
  const gNda = await api('GET', '/mna/tos/document/' + ndaId, { headers: H });
  check('NDA-document: doc_type=nda, nda_scope + nda_duur + nda_boetebeding + parties geïnstantieerd', gNda.json && gNda.json.document.doc_type === 'nda' && ['nda_scope', 'nda_duur', 'nda_boetebeding', 'parties'].every((b) => (gNda.json.componenten || []).some((c) => c.block_id === b && c.instance_status === 'ACTIVE')));
  // 'target' (Doelonderneming) is de component die in het NDA-default-rijtje ontbrak (de zaai-fout
  // achter de "manifest error") — expliciet meechecken dat een NIEUWE NDA 'm nu wél standaard heeft.
  check('nieuwe NDA: "target" (Doelonderneming) nu standaard geïnstantieerd', (gNda.json.componenten || []).some((c) => c.block_id === 'target' && c.instance_status === 'ACTIVE'), JSON.stringify((gNda.json.componenten || []).map((c) => c.block_id)));
  const menuNdaNieuw = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=NDA&document=' + ndaId, { headers: H });
  check('nieuwe default-NDA: geen ontbrekend KERN-onderdeel', menuNdaNieuw.json && Array.isArray(menuNdaNieuw.json.ontbrekend_kern) && menuNdaNieuw.json.ontbrekend_kern.length === 0, JSON.stringify(menuNdaNieuw.json && menuNdaNieuw.json.ontbrekend_kern));
  const lijst3 = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: H });
  check('documentenlijst bevat MoU, LoI én NDA', ['mou', 'loi', 'nda'].every((t) => (lijst3.json.documenten || []).some((d) => d.doc_type === t)));

  kop('STAP 12c · verkoper/koper-leestoegang + digitaal accorderen (composer wordt enige weg NDA/LoI)');
  const KH = { 'x-tussen-key': (c1.json && c1.json.koper_code) || 'GEEN' };
  const VH = { 'x-tussen-key': trajectCode }; // verkoper logt in met de traject-id zelf als code
  const ndaRevAll = await api('POST', '/mna/tos/document/' + ndaId + '/review-alles', { headers: H, body: { naam: 'Mr. NDA Jurist', hoedanigheid: 'advocaat' } });
  check('NDA review-alles ok', ndaRevAll.json && ndaRevAll.json.ok === true, JSON.stringify(ndaRevAll.json).slice(0, 160));
  const ndaFin = await api('POST', '/mna/tos/document/' + ndaId + '/finaliseer', { headers: H });
  check('NDA finaliseren ok', ndaFin.json && ndaFin.json.ok === true, JSON.stringify(ndaFin.json).slice(0, 160));
  // Vóór versturen: verkoper/koper zien 'm nog niet (status nog niet 'verstuurd').
  const lijstVoorVerkoper = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: VH });
  check('vóór verstuur: verkoper ziet de NDA nog niet', lijstVoorVerkoper.json && lijstVoorVerkoper.json.ok === true && !(lijstVoorVerkoper.json.documenten || []).some((d) => d.id === ndaId));
  const ndaVerstuur = await api('POST', '/mna/tos/document/' + ndaId + '/verstuur', { headers: H, body: { adressaten: ['verkoper', 'koper'] } });
  check('NDA versturen ok, naar verkoper+koper', ndaVerstuur.json && ndaVerstuur.json.ok === true && ndaVerstuur.json.status === 'verstuurd', JSON.stringify(ndaVerstuur.json).slice(0, 160));

  // Na verstuur: zowel verkoper als koper zien 'm nu in hun eigen lijst.
  const lijstNaVerkoper = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: VH });
  check('ná verstuur: verkoper ziet de NDA (minimale DTO: id/doc_type/profiel/verstuurd_op)', (() => {
    const d = (lijstNaVerkoper.json.documenten || []).find((x) => x.id === ndaId);
    return d && d.doc_type === 'nda' && d.profiel === 'NDA@1' && !!d.verstuurd_op && !('status' in d) && !('current_version' in d);
  })(), JSON.stringify(lijstNaVerkoper.json).slice(0, 200));
  const lijstNaKoper = await api('GET', '/mna/tos/documenten/' + trajectCode, { headers: KH });
  check('ná verstuur: koper ziet de NDA ook', (lijstNaKoper.json.documenten || []).some((d) => d.id === ndaId));

  // Cross-traject-hardening: effTid() moet voor koper/verkoper het EIGEN auth.traject_id gebruiken,
  // nooit een pad-argument — anders zou een geldige eigen code met een ANDER traject-id in het pad
  // gecombineerd kunnen worden (11 sep 2026-fix, zie worker/31-tos.js effTid()).
  const lijstGarbagePad = await api('GET', '/mna/tos/documenten/EEN-ANDER-TRAJECT', { headers: KH });
  check('pad-argument genegeerd voor koper: traject_id blijft het eigen traject', lijstGarbagePad.json && lijstGarbagePad.json.traject_id === trajectCode, JSON.stringify(lijstGarbagePad.json).slice(0, 160));

  // Leesinhoud: verkoper/koper krijgen de tekst, maar geen interne reviewer-naam/provenance (extern-strip).
  const ndaGetVerkoper = await api('GET', '/mna/tos/document/' + ndaId, { headers: VH });
  check('verkoper kan NDA-document lezen (ok)', ndaGetVerkoper.json && ndaGetVerkoper.json.ok === true, JSON.stringify(ndaGetVerkoper.json).slice(0, 160));
  check('extern: component aanwezig maar geen reviewer_naam/text_provenance gelekt', (() => {
    // Geen tekst-inhoud geëist: nda_scope is hier nooit ingevuld (geen AI-concept/handmatige tekst
    // gedraaid in deze teststap) — de component staat er met text=null, dat is verwacht ("leeg
    // werkveld") en geen falen. Waar het om gaat: de externe rol krijgt nooit text_provenance of een
    // reviewer_naam, ongeacht of er al tekst is (bevinding 11 sep 2026, eigen testfout: eiste eerder
    // ten onrechte een gevulde tekst).
    const c = (ndaGetVerkoper.json.componenten || []).find((x) => x.block_id === 'nda_scope');
    return !!c && c.text_provenance === undefined && (!c.review || c.review.reviewer_naam === undefined);
  })(), JSON.stringify((ndaGetVerkoper.json.componenten || []).find((x) => x.block_id === 'nda_scope')));
  check('extern: divergenties leeg (geen interne kruisverwijzingen naar buiten)', ndaGetVerkoper.json && Array.isArray(ndaGetVerkoper.json.divergenties) && ndaGetVerkoper.json.divergenties.length === 0);
  const mouGetKoper = await api('GET', '/mna/tos/document/' + docId, { headers: KH });
  check('koper kan NIET bij de (nog niet verstuurde) MoU → 403', mouGetKoper.status === 403, 'status ' + mouGetKoper.status);

  // Digitaal accorderen: hergebruikt het bestaande /mna/teken-endpoint — zet dezelfde
  // nda_getekend/loi_getekend-vlag als de vroegere sjabloonflow (fase-2-unlock, koper-identiteit).
  const teken = await api('POST', '/mna/teken', { body: { code: trajectCode, document: 'nda', naam: 'Test Verkoper Tekenaar' } });
  check('verkoper kan de composer-NDA tekenen via /mna/teken', teken.json && teken.json.ok === true, JSON.stringify(teken.json).slice(0, 160));
  const trajNaTeken = await api('GET', '/mna/traject/' + trajectCode);
  check('nda_getekend staat nu op het traject', trajNaTeken.json && trajNaTeken.json.traject && (trajNaTeken.json.traject.nda_getekend || '').includes('Test Verkoper Tekenaar'), JSON.stringify(trajNaTeken.json && trajNaTeken.json.traject && trajNaTeken.json.traject.nda_getekend));

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
  check('review-alles: meerdere onderdelen in één actie afgetekend (≥8)', revAll.json && revAll.json.ok === true && revAll.json.afgetekend >= 8, JSON.stringify(revAll.json).slice(0, 200));
  const gAll = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  check('na review-alles: kern-onderdelen tonen APPROVED', ['parties', 'exclusivity', 'confidentiality', 'governing_law'].every((b) => { const c = (gAll.json.componenten || []).find((x) => x.block_id === b); return c && c.review && c.review.status === 'APPROVED'; }));
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

  kop('STAP 20b · KERN-component toevoegen, weer verwijderen, dan finaliseren → geblokkeerd');
  // ChatGPT-tegenspraak op de manifest-fix (11 sep 2026): de bestaande tests bewijzen alleen "nooit
  // toegevoegd" ontbreekt terecht. Dit dekt het andere geval — WEL toegevoegd geweest, daarna weer
  // verwijderd — waar berekenOntbrekendKern() via instance_status='ACTIVE' hetzelfde resultaat hoort
  // te geven (het gaat om wat er NU in het document zit, niet om de geschiedenis).
  const g20b = await api('GET', '/mna/tos/document/' + docId, { headers: H });
  const costsIid = (g20b.json.componenten || []).find((c) => c.block_id === 'costs');
  check('costs-instance gevonden op docId', !!costsIid);
  const verwCosts = await api('POST', '/mna/tos/document/' + docId + '/component/' + costsIid.instance_id + '/verwijder', { headers: H });
  check('costs verwijderen → ok', verwCosts.json && verwCosts.json.ok === true, JSON.stringify(verwCosts.json).slice(0, 120));
  const menuNaVerw = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU&document=' + docId, { headers: H });
  check('ná verwijderen: costs staat in ontbrekend_kern', (menuNaVerw.json.ontbrekend_kern || []).some((m) => m.block_id === 'costs'), JSON.stringify(menuNaVerw.json.ontbrekend_kern));
  await api('POST', '/mna/tos/document/' + docId + '/setting', { headers: H, body: { juridisch: 'uit', fiscaal: 'uit', cijfers: 'uit' } });
  const finZonderCosts = await api('POST', '/mna/tos/document/' + docId + '/finaliseer', { headers: H });
  check('finaliseren zonder costs → ok:false + KERN_ONTBREEKT (status 200)', finZonderCosts.status === 200 && finZonderCosts.json && finZonderCosts.json.ok === false && (finZonderCosts.json.blockers || []).some((b) => b.code === 'KERN_ONTBREEKT' && b.block_id === 'costs'), JSON.stringify(finZonderCosts.json).slice(0, 250));
  // costs terugzetten, zodat de echte finalisatie in STAP 19 hierna gewoon slaagt
  const heraddCosts = await api('POST', '/mna/tos/document/' + docId + '/component', { headers: H, body: { block_id: 'costs' } });
  check('costs teruggezet → ok', heraddCosts.json && heraddCosts.json.ok === true, JSON.stringify(heraddCosts.json).slice(0, 120));
  const menuNaHerstel = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU&document=' + docId, { headers: H });
  check('ná terugzetten: geen ontbrekend KERN-onderdeel meer', Array.isArray(menuNaHerstel.json.ontbrekend_kern) && menuNaHerstel.json.ontbrekend_kern.length === 0, JSON.stringify(menuNaHerstel.json.ontbrekend_kern));
  // teruggezette costs heeft nog geen review — die moet zo meteen weer via review-alles in STAP 19.

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

  // 2b. Bevinding 11 sep 2026 (Marcel: "manifest error" — een gefinaliseerd/vergrendeld document
  // toonde "1 KERN-onderdeel nog niet opgenomen"): GET /menu/…&document={id} laadde altijd de
  // NIEUWSTE catalogusversie van het profiel i.p.v. de versie waartegen dít document is opgebouwd
  // (doc.profile_version) — bij een latere profielwijziging zou een al compleet, bevroren document
  // stilzwijgend als onvolledig getoond worden. Nu gefixt (laadProfiel(profileId, doc.profile_version)
  // wanneer ?document= is meegegeven); dit is de directe regressietest.
  const menuNaFin = await api('GET', '/mna/tos/menu/' + trajectCode + '?profile=MOU&document=' + docId, { headers: H });
  check('menu ná finaliseren: profielversie gepind op het document (matcht profile_ref uit finaliseer), geen fantoom-KERN-melding', menuNaFin.json && menuNaFin.json.ok === true && (menuNaFin.json.profiel.id + '@' + menuNaFin.json.profiel.version) === fin.json.profile_ref && Array.isArray(menuNaFin.json.ontbrekend_kern) && menuNaFin.json.ontbrekend_kern.length === 0, JSON.stringify(menuNaFin.json).slice(0, 200) + ' vs profile_ref=' + fin.json.profile_ref);

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

  kop('STAP 22 · FASE E — specialistenpool (scoped review → tos-gate + fee-event)');
  // admin richt een poolspecialist in + zet de platformmarge voor een juridische poolreview
  const spNew = await api('POST', '/mna/admin/pool/specialisten', { adminKey: ADMIN, body: {
    naam: 'Mr. E2E Pooljurist', kantoor: 'E2E Poolrecht', hoedanigheid: 'advocaat', inschrijvingsnummer: 'NOvA-E2E-001',
    // Bewust een ANDER testdomein dan DOM (@e2e-test.invalid, gebruikt voor alle traject-contacten) —
    // anders triggert de conflict-check C1 (e-maildomein specialist == contactdomein traject) altijd
    // vals-positief, puur omdat de e2e-fixture overal hetzelfde nepdomein hergebruikt.
    email: 'pool@e2e-specialist.invalid', sectoren: ['accountancy'], tarief_model: 'per_review', tarief_bedrag: 400, doorlooptijd_dagen: 7,
    profieltekst: 'Transactiedocumentatie MKB.',
  } });
  check('admin: poolspecialist toegevoegd', spNew.json && spNew.json.ok === true && !!spNew.json.id, JSON.stringify(spNew.json));
  spId = spNew.json && spNew.json.id;
  await api('POST', '/mna/admin/tarieven', { adminKey: ADMIN, body: { fee_type: 'pool_review_juridisch', bedrag: 75, door: 'e2e' } });
  const spBrowse = await api('GET', '/mna/pool/specialisten?hoedanigheid=advocaat', { headers: H });
  check('begeleider ziet de poolspecialist in de bladerlijst (alleen profiel)', spBrowse.json && spBrowse.json.ok === true && (spBrowse.json.specialisten || []).some((s) => s.id === spId) && JSON.stringify(spBrowse.json).indexOf(trajectCode) === -1);
  const spBrowseAnon = await api('GET', '/mna/pool/specialisten', {});
  check('poolbladerlijst zonder auth → 403', spBrowseAnon.status === 403, 'status ' + spBrowseAnon.status);

  // verse MoU voor een schone pooltest
  const mkPool = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'MOU' } });
  const poolDoc = mkPool.json && mkPool.json.document_id;
  check('verse MoU voor de pooltest', !!poolDoc);
  // begeleider geeft de scoped opdracht
  const opdr = await api('POST', '/mna/pool/opdracht', { headers: H, body: { specialist_id: spId, domein: 'LEGAL', documenten: [poolDoc], instructie: 'Beoordeel de juridische onderdelen.', deadline_dagen: 14 } });
  check('opdracht aangemaakt met kosteninschatting (honorarium 400 + marge 75)', opdr.json && opdr.json.ok === true && opdr.json.kosten && opdr.json.kosten.honorarium === 400 && opdr.json.kosten.marge === 75 && opdr.json.kosten.totaal === 475, JSON.stringify(opdr.json.kosten));
  const opId = opdr.json && opdr.json.opdracht_id;
  const poolToken = opdr.json && opdr.json.specialist_link && opdr.json.specialist_link.replace('x-pool-key: ', '');
  check('opdracht levert een specialisttoken', !!poolToken && poolToken.length > 20);

  // negatief: verzonnen token → 403
  const badTok = await api('GET', '/mna/pool/opdracht?poolkey=nonexistent-token-1234567890', {});
  check('verzonnen pooltoken → 403', badTok.status === 403, 'status ' + badTok.status);
  // specialist bekijkt de opdracht (geen tussen_code, geen andere trajecten)
  const opView = await api('GET', '/mna/pool/opdracht?poolkey=' + encodeURIComponent(poolToken), {});
  check('specialist ziet opdracht + onderneming, GEEN tussen_code/andere trajecten', opView.json && opView.json.ok === true && opView.json.traject && opView.json.traject.onderneming && JSON.stringify(opView.json).indexOf(trajectCode) === -1 && JSON.stringify(opView.json).indexOf(tussenCode) === -1);
  // dossier vóór accepteren → 403
  const dosPre = await api('GET', '/mna/pool/dossier?poolkey=' + encodeURIComponent(poolToken), {});
  check('dossier vóór accepteren → 403', dosPre.status === 403, 'status ' + dosPre.status);
  // accepteren
  const acc = await api('POST', '/mna/pool/opdracht/reactie?poolkey=' + encodeURIComponent(poolToken), { body: { actie: 'accepteren' } });
  check('specialist accepteert → status geaccepteerd', acc.json && acc.json.ok === true && acc.json.status === 'geaccepteerd');
  // dossier ná accepteren: alleen de gescopte MoU, alleen waarden, geen reviewer-namen, geen VALUATION
  const dos = await api('GET', '/mna/pool/dossier?poolkey=' + encodeURIComponent(poolToken), {});
  check('dossier: exact 1 document (de gescopte MoU)', dos.json && dos.json.ok === true && Array.isArray(dos.json.documenten) && dos.json.documenten.length === 1 && dos.json.documenten[0].id === poolDoc);
  check('dossier: LEGAL-onderdelen zichtbaar, indicative_price (VALUATION) niet, geen reviewer-naam/provenance', (() => {
    const cs = ((dos.json.documenten || [])[0] || {}).componenten || [];
    const s = JSON.stringify(dos.json);
    return cs.some((c) => c.block_id === 'parties') && !cs.some((c) => c.block_id === 'indicative_price') &&
      s.indexOf('provenance_type') === -1 && s.indexOf('reviewer_naam') === -1 && s.indexOf(tussenCode) === -1;
  })());
  // aftekenen
  const tek = await api('POST', '/mna/pool/opdracht/aftekenen?poolkey=' + encodeURIComponent(poolToken), { body: { opmerking: 'Akkoord met de juridische onderdelen.' } });
  check('specialist tekent af → onderdelen_afgetekend ≥ 1, sign_off met pool-hoedanigheid', tek.json && tek.json.ok === true && tek.json.onderdelen_afgetekend >= 1 && /Koers voor Morgen-pool/.test((tek.json.sign_off || {}).hoedanigheid || ''), JSON.stringify(tek.json).slice(0, 220));
  check('fee geboekt: honorarium 400 + marge 75', tek.json && tek.json.fee_geboekt && tek.json.fee_geboekt.honorarium === 400 && tek.json.fee_geboekt.marge === 75);
  // begeleider ziet de aftekening op het tos-document met de pool-hoedanigheid
  const gPool = await api('GET', '/mna/tos/document/' + poolDoc, { headers: H });
  check('tos-document toont LEGAL-onderdelen APPROVED via de poolspecialist', (() => {
    const cs = (gPool.json.componenten || []);
    const p = cs.find((c) => c.block_id === 'parties');
    return p && p.review && p.review.status === 'APPROVED' && /Koers voor Morgen-pool/.test(p.review.reviewer_hoedanigheid || '');
  })(), JSON.stringify((gPool.json.componenten || []).find((c) => c.block_id === 'parties') || {}).slice(0, 240));
  // opdrachtoverzicht voor de begeleider
  const opList = await api('GET', '/mna/pool/opdrachten/' + trajectCode, { headers: H });
  check('begeleider ziet de opdracht als "gereviewd" met sign-off', opList.json && (opList.json.opdrachten || []).some((o) => o.id === opId && o.status === 'gereviewd' && o.sign_off && o.sign_off.naam));
  // negatief: nogmaals reageren/aftekenen/intrekken kan niet meer
  const acc2 = await api('POST', '/mna/pool/opdracht/reactie?poolkey=' + encodeURIComponent(poolToken), { body: { actie: 'accepteren' } });
  check('nogmaals reageren op een afgeronde opdracht → 409', acc2.status === 409, 'status ' + acc2.status);
  const tek2 = await api('POST', '/mna/pool/opdracht/aftekenen?poolkey=' + encodeURIComponent(poolToken), { body: {} });
  check('nogmaals aftekenen → 409', tek2.status === 409, 'status ' + tek2.status);
  const intr = await api('POST', '/mna/pool/opdracht/' + opId + '/intrekken', { headers: H });
  check('een gereviewde opdracht intrekken → 409', intr.status === 409, 'status ' + intr.status);
  // negatief: admin-only poolbeheer niet voor de begeleider
  const admBeg = await api('GET', '/mna/admin/pool/specialisten', { headers: H });
  check('poolbeheer niet toegankelijk voor begeleider → 403', admBeg.status === 403, 'status ' + admBeg.status);

  // FASE E conflict-check (S-02): kantoornaam specialist == doelonderneming → hard signaal, vereist bevestiging
  const spConflictNew = await api('POST', '/mna/admin/pool/specialisten', { adminKey: ADMIN, body: {
    naam: 'Mr. E2E Conflictjurist', kantoor: 'E2E TOS Doelkantoor BV', hoedanigheid: 'advocaat', tarief_bedrag: 300,
  } });
  const spConflictId = spConflictNew.json && spConflictNew.json.id;
  check('admin: tweede (conflict-)specialist toegevoegd', !!spConflictId);
  const opdrConflict = await api('POST', '/mna/pool/opdracht', { headers: H, body: { specialist_id: spConflictId, domein: 'LEGAL', documenten: [poolDoc], deadline_dagen: 10 } });
  check('opdracht met kantoornaam-conflict → 409, bevestiging vereist', opdrConflict.status === 409 && opdrConflict.json && opdrConflict.json.bevestiging_vereist === true && (opdrConflict.json.conflict_signalen || []).some((s) => s.code === 'C2_KANTOORNAAM' && s.hard === true), JSON.stringify(opdrConflict.json).slice(0, 240));
  const opdrConflictOk = await api('POST', '/mna/pool/opdracht', { headers: H, body: { specialist_id: spConflictId, domein: 'LEGAL', documenten: [poolDoc], deadline_dagen: 10, conflict_bevestigd: true } });
  check('zelfde opdracht mét conflict_bevestigd:true → ok, signaal blijft zichtbaar', opdrConflictOk.json && opdrConflictOk.json.ok === true && (opdrConflictOk.json.conflict_signalen || []).some((s) => s.code === 'C2_KANTOORNAAM'), JSON.stringify(opdrConflictOk.json).slice(0, 240));

  // Concurrency (werkregel 16): twee gelijktijdige aftekenverzoeken op dezelfde opdracht mogen niet
  // allebei slagen (dat zou dubbele reviews + dubbele fee-events boeken).
  const raceToken = (opdrConflictOk.json.specialist_link || '').replace('x-pool-key: ', '');
  const raceAcc = await api('POST', '/mna/pool/opdracht/reactie?poolkey=' + encodeURIComponent(raceToken), { body: { actie: 'accepteren' } });
  check('race-opdracht geaccepteerd (setup voor de concurrency-test)', raceAcc.json && raceAcc.json.ok === true);
  const [raceA, raceB] = await Promise.all([
    api('POST', '/mna/pool/opdracht/aftekenen?poolkey=' + encodeURIComponent(raceToken), { body: {} }),
    api('POST', '/mna/pool/opdracht/aftekenen?poolkey=' + encodeURIComponent(raceToken), { body: {} }),
  ]);
  const raceOks = [raceA, raceB].filter((r) => r.json && r.json.ok === true).length;
  const race409s = [raceA, raceB].filter((r) => r.status === 409).length;
  check('gelijktijdig aftekenen: precies 1 slaagt, de ander krijgt 409 (geen dubbele fee-events)', raceOks === 1 && race409s === 1, JSON.stringify([raceA.status, raceB.status]));

  await api('POST', '/mna/admin/pool/specialisten', { adminKey: ADMIN, body: { id: spConflictId, status: 'geroyeerd', beschikbaar: false } });

  kop('STAP 23 · FASE E-bis — eigen (niet-pool) specialist (Marcel mag de identiteit NOOIT zien)');
  await api('POST', '/mna/admin/tarieven', { adminKey: ADMIN, body: { fee_type: 'eigen_specialist_toevoegen', bedrag: 50, door: 'e2e' } });
  // Negatief: het toevoegen zelf is ook geen adminhandeling.
  const esAddAdmin = await api('POST', '/mna/eigen-specialist', { adminKey: ADMIN, body: { naam: 'X', hoedanigheid: 'advocaat' } });
  check('eigen specialist toevoegen met x-admin-key → 403 (nooit een admin-actie)', esAddAdmin.status === 403, 'status ' + esAddAdmin.status);
  // Toevoegen door de begeleider zelf — de enige toegestane weg.
  const esAdd = await api('POST', '/mna/eigen-specialist', { headers: H, body: {
    naam: 'Mr. E2E Eigen Jurist', kantoor: 'E2E Eigen Kantoor', hoedanigheid: 'advocaat',
    inschrijvingsnummer: 'NOvA-EIGEN-001', email: 'eigen@e2e-specialist.invalid',
  } });
  check('begeleider voegt eigen specialist toe, fee 50 geboekt', esAdd.json && esAdd.json.ok === true && !!esAdd.json.id && esAdd.json.fee_geboekt === 50, JSON.stringify(esAdd.json));
  const eigenSpecId = esAdd.json && esAdd.json.id;
  // Lijst: de begeleider zelf ziet 'm gewoon (het is zijn eigen invoer).
  const esLijst = await api('GET', '/mna/eigen-specialisten/' + trajectCode, { headers: H });
  check('begeleider ziet de eigen specialist in de lijst', esLijst.json && esLijst.json.ok === true && (esLijst.json.specialisten || []).some((s) => s.id === eigenSpecId && s.naam === 'Mr. E2E Eigen Jurist'), JSON.stringify(esLijst.json));
  // KERN-privacyinvariant: de lijst is met GEEN enkele sleutel door Marcel te zien — noch via
  // x-admin-key, noch (de exploit die deze code-review-ronde ontdekte en fixte) via het ADMIN_KEY
  // ALS x-tussen-key/?code=, wat begeleiderAuth normaliter als geldig 'admin'-bewijs accepteert.
  const esLijstAdmin1 = await api('GET', '/mna/eigen-specialisten/' + trajectCode, { adminKey: ADMIN });
  check('lijst met x-admin-key → 403 (Marcel mag dit nooit zien)', esLijstAdmin1.status === 403, 'status ' + esLijstAdmin1.status);
  const esLijstAdmin2 = await api('GET', '/mna/eigen-specialisten/' + trajectCode, { headers: { 'x-tussen-key': ADMIN } });
  check('lijst met ADMIN_KEY als x-tussen-key → 403 (de exploit die deze review vond)', esLijstAdmin2.status === 403, 'status ' + esLijstAdmin2.status);
  const esLijstAnon = await api('GET', '/mna/eigen-specialisten/' + trajectCode, {});
  check('lijst zonder auth → 403', esLijstAnon.status === 403, 'status ' + esLijstAnon.status);

  // Cross-traject-scoping: een eigen-specialist-id van traject A mag niet bruikbaar zijn op traject B.
  const c2 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: {
    kantoor_naam: 'E2E TOS Tweede Traject BV', contact_naam: 'Test Verkoper 2', contact_email: 'v2' + DOM,
    koper_naam: 'E2E TOS Koper 2 BV', koper_contact: 'Test Koper 2', koper_email: 'k2' + DOM, traject_type: 'Verkoop',
  } } });
  const trajectCode2 = c2.json && c2.json.code;
  const H2 = { 'x-tussen-key': c2.json && c2.json.tussen_code };
  check('tweede traject aangemaakt (voor de cross-traject-test)', !!trajectCode2);
  // Geen TOS-activatie/documenten nodig op traject 2: de eigen-specialist-lookup (traject-gescoped)
  // faalt al vóór de documentvalidatie wordt bereikt — zie worker/32-pool.js.
  const opdrCross = await api('POST', '/mna/pool/opdracht', { headers: H2, body: { specialist_id: eigenSpecId, specialist_bron: 'eigen', domein: 'LEGAL', documenten: ['dummy'], deadline_dagen: 10 } });
  check('eigen-specialist-id van traject 1 gebruiken op traject 2 → 404 (traject-scoping)', opdrCross.status === 404, 'status ' + opdrCross.status);
  await api('POST', '/admin/delete/mna/' + trajectCode2, { adminKey: ADMIN });

  // De echte flow: begeleider zet zijn eigen specialist in op een scoped opdracht.
  const mkEigenDoc = await api('POST', '/mna/tos/document', { headers: H, body: { profile: 'MOU' } });
  const eigenDocId = mkEigenDoc.json && mkEigenDoc.json.document_id;
  check('verse MoU voor de eigen-specialist-test', !!eigenDocId);
  // Negatief: admin mag deze tak nooit gebruiken, ook niet met een geldige traject-code in de body
  // (de respons zou anders sp.naam/inschrijvingsnummer teruggeven — exact het lek dat gefixt is).
  const opdrEigenAdmin = await api('POST', '/mna/pool/opdracht', { adminKey: ADMIN, body: { code: trajectCode, specialist_id: eigenSpecId, specialist_bron: 'eigen', domein: 'LEGAL', documenten: [eigenDocId] } });
  check('opdracht met specialist_bron eigen via x-admin-key → 403', opdrEigenAdmin.status === 403, 'status ' + opdrEigenAdmin.status);
  const opdrEigen = await api('POST', '/mna/pool/opdracht', { headers: H, body: { specialist_id: eigenSpecId, specialist_bron: 'eigen', domein: 'LEGAL', documenten: [eigenDocId], instructie: 'Beoordeel de juridische onderdelen.', deadline_dagen: 10 } });
  check('opdracht met eigen specialist: honorarium+marge beide 0 (geen platformbemiddeling)', opdrEigen.json && opdrEigen.json.ok === true && opdrEigen.json.kosten && opdrEigen.json.kosten.honorarium === 0 && opdrEigen.json.kosten.marge === 0, JSON.stringify(opdrEigen.json));
  const eigenOpId = opdrEigen.json && opdrEigen.json.opdracht_id;
  const eigenPoolToken = opdrEigen.json && opdrEigen.json.specialist_link && opdrEigen.json.specialist_link.replace('x-pool-key: ', '');
  const eigenAcc = await api('POST', '/mna/pool/opdracht/reactie?poolkey=' + encodeURIComponent(eigenPoolToken), { body: { actie: 'accepteren' } });
  check('eigen specialist accepteert', eigenAcc.json && eigenAcc.json.ok === true && eigenAcc.json.status === 'geaccepteerd');
  const eigenDos = await api('GET', '/mna/pool/dossier?poolkey=' + encodeURIComponent(eigenPoolToken), {});
  check('dossier voor eigen specialist: exact 1 document', eigenDos.json && eigenDos.json.ok === true && (eigenDos.json.documenten || []).length === 1);
  const eigenTek = await api('POST', '/mna/pool/opdracht/aftekenen?poolkey=' + encodeURIComponent(eigenPoolToken), { body: { opmerking: 'Akkoord.' } });
  check('eigen specialist tekent af, fee 0/0 (al betaald bij toevoegen)', eigenTek.json && eigenTek.json.ok === true && eigenTek.json.onderdelen_afgetekend >= 1 && eigenTek.json.fee_geboekt && eigenTek.json.fee_geboekt.honorarium === 0 && eigenTek.json.fee_geboekt.marge === 0, JSON.stringify(eigenTek.json).slice(0, 220));

  // Begeleider ziet de eigen-opdracht gewoon in zijn eigen overzicht (met naam — is zijn eigen traject).
  const eigenOpList = await api('GET', '/mna/pool/opdrachten/' + trajectCode, { headers: H });
  check('begeleider ziet de eigen-opdracht met specialist_bron + naam', (eigenOpList.json.opdrachten || []).some((o) => o.id === eigenOpId && o.specialist_bron === 'eigen' && o.specialist_naam === 'Mr. E2E Eigen Jurist'));

  // KERN-privacyinvariant #2: Marcels eigen admin-overzicht van ALLE pool-opdrachten bevat deze
  // eigen-opdracht NIET — niet als rij, en de identiteit staat nergens in de ruwe respons.
  const adminOpList = await api('GET', '/mna/admin/pool/opdrachten', { adminKey: ADMIN });
  check('admin-overzicht bevat de eigen-opdracht NIET', adminOpList.json && adminOpList.json.ok === true && !(adminOpList.json.opdrachten || []).some((o) => o.id === eigenOpId));
  check('admin-overzicht bevat nergens de naam/kantoor/e-mail van de eigen specialist', JSON.stringify(adminOpList.json).indexOf('E2E Eigen') === -1 && JSON.stringify(adminOpList.json).indexOf('eigen@e2e-specialist.invalid') === -1);

  // Intrekken — alleen door de begeleider, nooit admin.
  const esIntrekAdmin = await api('POST', '/mna/eigen-specialist/' + eigenSpecId + '/intrekken', { adminKey: ADMIN });
  check('intrekken met x-admin-key → 403', esIntrekAdmin.status === 403, 'status ' + esIntrekAdmin.status);
  const esIntrek = await api('POST', '/mna/eigen-specialist/' + eigenSpecId + '/intrekken', { headers: H });
  check('begeleider trekt de eigen specialist in', esIntrek.json && esIntrek.json.ok === true, JSON.stringify(esIntrek.json));
  const esLijstNa = await api('GET', '/mna/eigen-specialisten/' + trajectCode, { headers: H });
  check('ingetrokken specialist staat niet meer in de actieve lijst', !(esLijstNa.json.specialisten || []).some((s) => s.id === eigenSpecId));

  kop('STAP 24 · koper-bod (koper dient zelf een indicatief bod in, alleen bij sell-side mandaat)');
  // Deze fixture (trajectCode) is een sell-side traject (opdrachtgever_rol default 'verkoper') —
  // dekt het positieve pad. Het negatieve pad (buy-side/dual-mandate → geweigerd) staat los
  // hieronder met een tweede, apart aangemaakt traject.
  const vrijgeven = await api('POST', '/mna/admin/vrijgeven/' + trajectCode + '?force=1', { adminKey: ADMIN });
  check('koper krijgt dossiertoegang (setup voor deze stap)', vrijgeven.json && vrijgeven.json.ok === true, JSON.stringify(vrijgeven.json));
  const bodOnbekend = await api('POST', '/mna/koper/bod', { body: { code: 'NIETBESTAAND-XYZ', bedrag: 1000000 } });
  check('bod indienen met onbekende code → 404', bodOnbekend.status === 404, 'status ' + bodOnbekend.status);
  const bodVerkoperRol = await api('POST', '/mna/koper/bod', { body: { code: trajectCode, bedrag: 1000000 } });
  check('trajectcode zelf is de verkoper-rol, geen koper → 403', bodVerkoperRol.status === 403, 'status ' + bodVerkoperRol.status);
  const bodBegeleiderRol = await api('POST', '/mna/koper/bod', { body: { code: tussenCode, bedrag: 1000000 } });
  check('tussen_code is de begeleider-rol, geen koper → 403', bodBegeleiderRol.status === 403, 'status ' + bodBegeleiderRol.status);
  const bodGeen = await api('POST', '/mna/koper/bod', { headers: KH, body: { bedrag: 0 } });
  check('bod van €0 geweigerd', bodGeen.status === 400, 'status ' + bodGeen.status);
  const bodOk = await api('POST', '/mna/koper/bod', { headers: KH, body: { bedrag: 1850000, toelichting: 'Onder voorbehoud van financiering.' } });
  check('koper dient een geldig bod in', bodOk.json && bodOk.json.ok === true && !!bodOk.json.id, JSON.stringify(bodOk.json));
  const biedList = await api('GET', '/mna/begeleider/biedingen/' + trajectCode, { headers: H });
  check('begeleider ziet het ingediende bod', biedList.json && biedList.json.ok === true && (biedList.json.biedingen || []).some((b) => b.bedrag === 1850000 && b.toelichting === 'Onder voorbehoud van financiering.'), JSON.stringify(biedList.json).slice(0, 200));
  const biedListAnon = await api('GET', '/mna/begeleider/biedingen/' + trajectCode, {});
  check('biedingenoverzicht zonder auth → 403', biedListAnon.status === 403, 'status ' + biedListAnon.status);
  const biedListKoper = await api('GET', '/mna/begeleider/biedingen/' + trajectCode, { headers: KH });
  check('koper zelf kan het begeleider-overzicht niet opvragen → 403', biedListKoper.status === 403, 'status ' + biedListKoper.status);

  // Negatief pad: een tweede, buy-side traject (opdrachtgever_rol='koper') — Marcel expliciet:
  // "alleen als de adviseur aan de kant van de verkoper staat". De koper-rol is daar al de eigen
  // cliënt van de adviseur en dient dus geen bod in bij zichzelf.
  const c3 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: {
    kantoor_naam: 'E2E TOS Buy-side Traject BV', contact_naam: 'Test Verkoper 3', contact_email: 'v3' + DOM,
    koper_naam: 'E2E TOS Koper 3 BV', koper_contact: 'Test Koper 3', koper_email: 'k3' + DOM,
    traject_type: 'Overname', opdrachtgever_rol: 'koper',
  } } });
  const trajectCode3 = c3.json && c3.json.code;
  const KH3 = { 'x-tussen-key': (c3.json && c3.json.koper_code) || 'GEEN' };
  check('buy-side traject aangemaakt (voor het negatieve pad)', !!trajectCode3);
  await api('POST', '/mna/admin/vrijgeven/' + trajectCode3 + '?force=1', { adminKey: ADMIN });
  const bodBuySide = await api('POST', '/mna/koper/bod', { headers: KH3, body: { bedrag: 500000 } });
  check('koper-bod op een buy-side traject → 403 (opdrachtgever_rol != verkoper)', bodBuySide.status === 403, 'status ' + bodBuySide.status);
  await api('POST', '/admin/delete/mna/' + trajectCode3, { adminKey: ADMIN });

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
  const naPurgeOpdr = await api('GET', '/mna/pool/opdracht?poolkey=' + encodeURIComponent(poolToken), {});
  check('pool-opdracht weg na purge → 403 (cascade)', naPurgeOpdr.status === 403, 'status ' + naPurgeOpdr.status);
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
  if (typeof spId !== 'undefined' && spId) {
    await api('POST', '/mna/admin/pool/specialisten', { adminKey: ADMIN, body: { id: spId, status: 'geroyeerd', beschikbaar: false } });
    check('testpoolspecialist geroyeerd', true);
  }
}
let spId;

try { await run(); } catch (e) { console.error(kleur('rood', 'Onverwachte fout: ' + (e && e.stack || e))); }
await opruimen();
samenvatting();
