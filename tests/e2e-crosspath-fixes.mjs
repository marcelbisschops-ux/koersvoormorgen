// ══════════════════════════════════════════════════════════════════
// Permanente regressietests voor de cross-path-informatielek-audit-fixes
// van 19 augustus 2026 (F3, F6, F8, F10, F11, F13 — zie
// CROSS-PATH-SECURITY-STANDAARD.md-logboek). Elk van deze bugs gaf, vóór de
// fix, data terug aan een rol/partij die daar niet bij mocht — dit script
// bewijst dat elk lek nu dicht zit, niet alleen dat er "geen foutmelding" is.
//
// Draaien: node tests/e2e-crosspath-fixes.mjs --key=ADMIN_KEY
//          ADMIN_KEY=... node tests/e2e-crosspath-fixes.mjs
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting, sla_over } from './lib.mjs';

const ADMIN = leesAdminKey();
const TEST_EMAIL_DOMEIN = '@e2e-test.koersvoormorgen.invalid';
const WW = 'E2eTest!' + Date.now();

console.log('\n' + kleur('vet', '╔══════════════════════════════════════════════╗'));
console.log(kleur('vet', '║  Cross-path-audit-fixes — regressietests       ║'));
console.log(kleur('vet', '╚══════════════════════════════════════════════╝'));
console.log(kleur('grijs', 'Worker : ' + WORKER));

if (!ADMIN) {
  console.log('\n' + kleur('rood', 'Geen admin-key opgegeven — dit script kan niet zonder (elke stap heeft ADMIN_KEY nodig).'));
  console.log(kleur('grijs', 'Geef de key mee met --key=... of via de ADMIN_KEY omgevingsvariabele.'));
  process.exit(1);
}

let opruimGebruikerId = null;
let opruimTrajecten = [];

async function opruimen() {
  kop('OPRUIMEN · Testdata verwijderen');
  for (const code of opruimTrajecten) {
    const r = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
    check('traject ' + code + ' verwijderd', r.json && r.json.ok === true, JSON.stringify(r.json));
  }
  if (opruimGebruikerId) {
    const r = await api('POST', '/gebruikers/deactiveer/' + opruimGebruikerId, { adminKey: ADMIN });
    check('testadviseur verwijderd', r.json && r.json.ok === true, JSON.stringify(r.json));
  }
}

async function main() {
  // Een extern-adviseurstraject (is_eigen=0, de default bij /adviseur/create) — nodig om de
  // "muur tegen externe adviseurs" (F8/F13) te kunnen bewijzen: die moet júist voor DIT traject
  // blokkeren, niet voor Marcels eigen trajecten.
  kop('SETUP · Extern-adviseurstraject aanmaken');
  const email = 'e2e-crosspath-' + Date.now() + TEST_EMAIL_DOMEIN;
  let traject = null; // {code, koper_code, tussen_code}
  {
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E Crosspath Adviseur', bedrijf: 'E2E Crosspath Kantoor BV', email } });
    const token = uit.json && uit.json.token;
    opruimGebruikerId = uit.json && uit.json.id;
    check('adviseur uitgenodigd', uit.json && uit.json.ok === true && !!token, JSON.stringify(uit.json));
    if (token) {
      await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord: WW } });
      await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    }
    await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } } });
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E Crosspath Kantoor BV', contact_naam: 'Test Verkoper', contact_email: 'verkoper' + TEST_EMAIL_DOMEIN, koper_naam: 'E2E Crosspath Koper BV', koper_contact: 'Test Koper', koper_email: 'koper' + TEST_EMAIL_DOMEIN, traject_type: 'Verkoop' } } });
    check('extern traject aangemaakt', c.json && c.json.ok === true, JSON.stringify(c.json));
    if (c.json && c.json.code) {
      traject = { code: c.json.code, koper_code: c.json.koper_code, tussen_code: c.json.tussen_code };
      opruimTrajecten.push(c.json.code);
    }
  }
  if (!traject) { console.log('\n' + kleur('rood', 'Geen testtraject — resterende stappen overgeslagen.')); await opruimen(); return !samenvatting(); }

  // ─────────────── F3: koper-categorie-intrekking ───────────────
  kop('F3 · Koper-categorie-intrekking (entiteiten/partners/qa/bankmutaties)');
  {
    // Vóór vrijgave: koper mag helemaal niets zien op deze routes.
    const entVoor = await api('GET', '/mna/entiteiten/' + traject.koper_code);
    check('entiteiten leeg vóór koper-vrijgave', Array.isArray(entVoor.json) && entVoor.json.length === 0, JSON.stringify(entVoor.json));

    await api('POST', '/mna/entiteiten/' + traject.code, { body: { naam: 'E2E Entiteit BV', kvk: '90000099' } });
    const partAanm = await api('POST', '/mna/partners/' + traject.code, { body: { naam: 'E2E Partner', leeftijd: '50' } });
    check('partner aangemaakt', partAanm.json && partAanm.json.ok === true, JSON.stringify(partAanm.json));

    const entVoor2 = await api('GET', '/mna/entiteiten/' + traject.koper_code);
    check('entiteit alsnog verborgen voor koper zonder vrijgave', Array.isArray(entVoor2.json) && entVoor2.json.length === 0, JSON.stringify(entVoor2.json));
    const partVoor = await api('GET', '/mna/partners/' + traject.koper_code);
    check('partner verborgen voor koper zonder vrijgave', Array.isArray(partVoor.json) && partVoor.json.length === 0, JSON.stringify(partVoor.json));

    // Financieel vrijgeven (force=1 omzeilt de NDA-check voor deze test)
    await api('POST', '/mna/koper-categorieen/' + traject.code + '?force=1', { adminKey: ADMIN, body: { categorieen: ['financieel'] } });

    const entNa = await api('GET', '/mna/entiteiten/' + traject.koper_code);
    check('entiteiten zichtbaar zodra koper_vrijgegeven=1', Array.isArray(entNa.json) && entNa.json.length === 1, JSON.stringify(entNa.json));
    const partNa = await api('GET', '/mna/partners/' + traject.koper_code);
    check('partners zichtbaar zodra koper_vrijgegeven=1', Array.isArray(partNa.json) && partNa.json.length === 1, JSON.stringify(partNa.json));

    // Bankmutaties: alleen zichtbaar als 'financieel' expliciet is vrijgegeven (nu het geval)
    const bmLijstJa = await api('GET', '/mna/bankmutaties/lijst/' + traject.koper_code);
    check('bankmutaties-lijst-endpoint werkt met financieel vrijgegeven', bmLijstJa.json && bmLijstJa.json.ok === true, JSON.stringify(bmLijstJa.json));

    // Q&A: een vraag over 'commercieel' (NIET vrijgegeven) mag niet zichtbaar zijn voor de koper
    const qaFin = await api('POST', '/mna/qa/' + traject.koper_code, { body: { vraag: 'E2E vraag over financieel', fase_id: 'financieel' } });
    const qaCom = await api('POST', '/mna/qa/' + traject.koper_code, { body: { vraag: 'E2E vraag over commercieel', fase_id: 'commercieel' } });
    check('qa-vraag financieel aangemaakt', qaFin.json && qaFin.json.ok === true, JSON.stringify(qaFin.json));
    check('qa-vraag commercieel aangemaakt', qaCom.json && qaCom.json.ok === true, JSON.stringify(qaCom.json));
    const qaLijst = await api('GET', '/mna/qa/' + traject.koper_code);
    const qaFases = Array.isArray(qaLijst.json) ? qaLijst.json.map(q => q.fase_id) : [];
    check('koper ziet financieel-qa', qaFases.includes('financieel'), JSON.stringify(qaFases));
    check('koper ziet GEEN commercieel-qa (categorie niet vrijgegeven)', !qaFases.includes('commercieel'), JSON.stringify(qaFases));

    // Alles weer intrekken → koper mag niets meer zien, incl. bankmutaties
    await api('POST', '/mna/koper-categorieen/' + traject.code, { adminKey: ADMIN, body: { categorieen: [] } });
    const entWeg = await api('GET', '/mna/entiteiten/' + traject.koper_code);
    check('entiteiten weer leeg na volledig intrekken', Array.isArray(entWeg.json) && entWeg.json.length === 0, JSON.stringify(entWeg.json));
    const partWeg = await api('GET', '/mna/partners/' + traject.koper_code);
    check('partners weer leeg na volledig intrekken', Array.isArray(partWeg.json) && partWeg.json.length === 0, JSON.stringify(partWeg.json));
    const bmWeg = await api('GET', '/mna/bankmutaties/lijst/' + traject.koper_code);
    check('bankmutaties-lijst leeg na intrekken financieel', bmWeg.json && Array.isArray(bmWeg.json.imports) && bmWeg.json.imports.length === 0, JSON.stringify(bmWeg.json));
    const qaWeg = await api('GET', '/mna/qa/' + traject.koper_code);
    check('koper ziet helemaal geen qa meer na volledig intrekken', Array.isArray(qaWeg.json) && qaWeg.json.length === 0, JSON.stringify(qaWeg.json));

    // Verkoper/begeleider blijven ongewijzigd — geen regressie voor de eigen rollen
    const entVerkoper = await api('GET', '/mna/entiteiten/' + traject.code);
    check('verkoper ziet entiteiten altijd (geen koper-gate van toepassing)', Array.isArray(entVerkoper.json) && entVerkoper.json.length === 1, JSON.stringify(entVerkoper.json));
  }

  // ─────────────── F6: waarderingsgeschiedenis nu begeleider-only ───────────────
  kop('F6 · /mna/waardering/geschiedenis/{code} vereist begeleiderAuth');
  {
    const zonderKey = await api('GET', '/mna/waardering/geschiedenis/' + traject.code);
    check('verkoper-code zonder key krijgt Unauthorized', zonderKey.status === 401, 'status=' + zonderKey.status);
    const alsKoper = await api('GET', '/mna/waardering/geschiedenis/' + traject.koper_code);
    check('koper-code krijgt Unauthorized', alsKoper.status === 401, 'status=' + alsKoper.status);
    const metAdmin = await api('GET', '/mna/waardering/geschiedenis/' + traject.code, { adminKey: ADMIN });
    check('admin-key op eigen/extern traject krijgt gewoon toegang (geen overbreek)', metAdmin.status === 200 && metAdmin.json && metAdmin.json.ok === true, 'status=' + metAdmin.status + ' ' + JSON.stringify(metAdmin.json));
  }

  // ─────────────── F8 + F13: muur tegen externe adviseurs ───────────────
  kop('F8/F13 · Muur tegen externe adviseurs (gesprek-bijlagen + meekijkers)');
  {
    const gAanm = await api('POST', '/mna/admin/gesprekken/' + traject.code, { adminKey: ADMIN, body: { datum: '2026-08-19', deelnemers: 'E2E test', verslag: 'E2E testgesprek' } });
    check('gesprek aangemaakt (via tussen_code, geen admin-muur van toepassing op de eigenaar zelf)', gAanm.json && gAanm.json.ok === true, JSON.stringify(gAanm.json));
    const gesprekId = gAanm.json && gAanm.json.id;

    if (gesprekId) {
      // Bijlage-upload met ADMIN_KEY op een extern traject moet geblokkeerd worden (F8)
      const fd = new FormData();
      fd.append('file', new Blob(['E2E test bijlage-inhoud'], { type: 'text/plain' }), 'e2e-test.txt');
      const upResp = await fetch(WORKER + '/mna/admin/gesprek/bijlage/' + gesprekId, { method: 'POST', headers: { 'x-admin-key': ADMIN }, body: fd });
      const upJson = await upResp.json().catch(() => null);
      check('bijlage-upload met ADMIN_KEY op extern traject geblokkeerd (F8)', upResp.status === 401, 'status=' + upResp.status + ' ' + JSON.stringify(upJson));

      const lijstResp = await api('GET', '/mna/admin/gesprek/bijlagen/' + gesprekId, { adminKey: ADMIN });
      check('bijlagen-lijst met ADMIN_KEY op extern traject afgeschermd (F8)', lijstResp.json && lijstResp.json.inhoud_afgeschermd === true && Array.isArray(lijstResp.json.bijlagen) && lijstResp.json.bijlagen.length === 0, JSON.stringify(lijstResp.json));

      const delResp = await api('POST', '/mna/admin/gesprek/delete/' + gesprekId, { adminKey: ADMIN });
      check('gesprek-delete met ADMIN_KEY op extern traject geblokkeerd (F8)', delResp.status === 401, 'status=' + delResp.status + ' ' + JSON.stringify(delResp.json));

      // Zelfde gesprek moet via de eigen tussen_code (de externe adviseur zelf) wél nog te
      // verwijderen zijn — de muur is alleen tegen Marcels ADMIN_KEY, niet tegen de adviseur zelf.
      const delTussen = await api('POST', '/mna/admin/gesprek/delete/' + gesprekId, { body: {} });
      // (dit endpoint checkt alleen ADMIN_KEY, geen tussen_code-alternatief — dus dit hoort ook te falen; documenteert het huidige gedrag)
      check('gesprek-delete zonder key faalt (endpoint is uitsluitend ADMIN_KEY-based)', delTussen.status === 401, 'status=' + delTussen.status);
    }

    const mkResp = await api('GET', '/mna/meekijkers/' + traject.code, { adminKey: ADMIN });
    check('meekijkers met ADMIN_KEY op extern traject afgeschermd (F13)', mkResp.json && mkResp.json.inhoud_afgeschermd === true && Array.isArray(mkResp.json.meekijkers) && mkResp.json.meekijkers.length === 0, JSON.stringify(mkResp.json));

    const mkZonderKey = await api('GET', '/mna/meekijkers/' + traject.code);
    check('meekijkers zonder key (normale portal-aanroep) blijft gewoon werken', mkZonderKey.json && mkZonderKey.json.ok === true && mkZonderKey.json.inhoud_afgeschermd !== true, JSON.stringify(mkZonderKey.json));
  }

  // ─────────────── F11: gesprek-bijlage krijgt nu traject_id (nodig voor de F8-muur + cascade) ───────────────
  kop('F11 · Gesprek-bijlage traject_id wordt nu gevuld bij upload');
  {
    // Tijdelijk 'eigen' maken zodat de F8-muur de upload niet blokkeert — puur om deze ene
    // stap te kunnen testen; wordt hierna weer teruggezet.
    const eiAan = await api('POST', '/gebruikers/eigen/' + opruimGebruikerId, { adminKey: ADMIN, body: { is_eigen: true } });
    check('testadviseur tijdelijk op is_eigen=true gezet', eiAan.json && eiAan.json.is_eigen === true, JSON.stringify(eiAan.json));

    const g2 = await api('POST', '/mna/admin/gesprekken/' + traject.code, { adminKey: ADMIN, body: { datum: '2026-08-19', deelnemers: 'E2E F11', verslag: 'E2E F11-test' } });
    const gespId2 = g2.json && g2.json.id;
    let bijlageId2 = null;
    if (gespId2) {
      const fd2 = new FormData();
      fd2.append('file', new Blob(['E2E F11 bijlage-inhoud']), 'e2e-f11.txt');
      const upResp2 = await fetch(WORKER + '/mna/admin/gesprek/bijlage/' + gespId2, { method: 'POST', headers: { 'x-admin-key': ADMIN }, body: fd2 });
      const upJson2 = await upResp2.json().catch(() => null);
      check('bijlage-upload lukt zodra traject is_eigen=true is', upResp2.status === 200 && upJson2 && upJson2.ok === true, 'status=' + upResp2.status + ' ' + JSON.stringify(upJson2));
      bijlageId2 = upJson2 && upJson2.id;
    }

    // Terug naar extern (is_eigen=false) — de muur moet nu weer gelden. Dit kan ALLEEN correct
    // gebeuren als traject_id daadwerkelijk op de bijlage-rij staat (F11-fix); vóór die fix was
    // traject_id altijd NULL en sloeg de isEigenTraject-check in worker/12-mna-gesprekken-
    // logboek.js stilzwijgend over (fail-open), waardoor deze delete dan ten onrechte was gelukt.
    const eiUit = await api('POST', '/gebruikers/eigen/' + opruimGebruikerId, { adminKey: ADMIN, body: { is_eigen: false } });
    check('testadviseur weer op is_eigen=false gezet', eiUit.json && eiUit.json.is_eigen === false, JSON.stringify(eiUit.json));

    if (bijlageId2) {
      const delResp2 = await api('POST', '/mna/admin/gesprek/bijlage/delete/' + bijlageId2, { adminKey: ADMIN });
      check('bijlage-delete met ADMIN_KEY nu weer geblokkeerd (bewijst traject_id was gevuld — F11)', delResp2.status === 401, 'status=' + delResp2.status + ' ' + JSON.stringify(delResp2.json));
    }

    // Weer op eigen zetten zodat de cleanup hieronder (traject-verwijdering) niet zelf door de
    // F8-muur wordt geraakt.
    await api('POST', '/gebruikers/eigen/' + opruimGebruikerId, { adminKey: ADMIN, body: { is_eigen: true } });
  }

  // ─────────────── F10: existence-oracle bij Q&A-reactie ───────────────
  kop('F10 · Geen existence-oracle meer bij /mna/qa/reactie/{qaId}');
  {
    const qaLijst2 = await api('GET', '/mna/qa/' + traject.code);
    const echtQaId = Array.isArray(qaLijst2.json) && qaLijst2.json.length ? qaLijst2.json[0].id : null;
    check('er is een echte qa-id om tegen te testen', !!echtQaId, JSON.stringify(qaLijst2.json));

    if (echtQaId) {
      const metOngeldigeCode = await api('POST', '/mna/qa/reactie/' + echtQaId, { body: { code: 'DITBESTAATNIET999', tekst: 'e2e' } });
      check('ongeldige code op ECHTE qa-id geeft 401, geen 404 (geen existence-oracle)', metOngeldigeCode.status === 401, 'status=' + metOngeldigeCode.status + ' ' + JSON.stringify(metOngeldigeCode.json));

      const metOngeldigeCodeEnId = await api('POST', '/mna/qa/reactie/QADITBESTAATOOKNIET', { body: { code: 'DITBESTAATNIET999', tekst: 'e2e' } });
      check('ongeldige code op NIET-bestaande qa-id geeft ook 401 (zelfde respons, geen onderscheid)', metOngeldigeCodeEnId.status === 401, 'status=' + metOngeldigeCodeEnId.status);

      const metGeldigeCodeOngeldigId = await api('POST', '/mna/qa/reactie/QADITBESTAATOOKNIET', { body: { code: traject.code, tekst: 'e2e' } });
      check('geldige code op niet-bestaande qa-id geeft 404 (vraag niet gevonden)', metGeldigeCodeOngeldigId.status === 404, 'status=' + metGeldigeCodeOngeldigId.status);

      const reactieOk = await api('POST', '/mna/qa/reactie/' + echtQaId, { body: { code: traject.code, tekst: 'E2E reactie' } });
      check('geldige code op eigen qa-id lukt gewoon (geen regressie)', reactieOk.json && reactieOk.json.ok === true, JSON.stringify(reactieOk.json));
    }
  }

  // ─────────────── B6: /mna/biedingen/vergelijk alleen voor de begeleider ───────────────
  // De bod-vergelijker (onderhandel-playbook onderdeel 4) mag NOOIT iets teruggeven aan een koper of
  // aan een verkoper — alleen aan de begeleider van (een traject in) de groep. Zie backlog B6.
  kop('B6 · /mna/biedingen/vergelijk weigert koper/verkoper, laat begeleider door');
  {
    const alsKoper = await api('GET', '/mna/biedingen/vergelijk?code=' + traject.koper_code);
    check('koper-code → 401 (geen toegang tot de bod-vergelijker)', alsKoper.status === 401, 'status=' + alsKoper.status + ' ' + JSON.stringify(alsKoper.json));

    const alsVerkoper = await api('GET', '/mna/biedingen/vergelijk?code=' + traject.code);
    check('verkoper-/trajectcode → 401 (verkoper is geen begeleider)', alsVerkoper.status === 401, 'status=' + alsVerkoper.status + ' ' + JSON.stringify(alsVerkoper.json));

    const onzin = await api('GET', '/mna/biedingen/vergelijk?code=DITBESTAATNIET999');
    check('onbekende code → 401', onzin.status === 401, 'status=' + onzin.status);

    const alsBegeleider = await api('GET', '/mna/biedingen/vergelijk?code=' + traject.tussen_code, { headers: { 'x-tussen-key': traject.tussen_code } });
    check('begeleider-code → 200 met status "geen_groep" (dit traject is niet gekoppeld)',
      alsBegeleider.status === 200 && alsBegeleider.json && alsBegeleider.json.status === 'geen_groep',
      'status=' + alsBegeleider.status + ' ' + JSON.stringify(alsBegeleider.json));
  }

  // ─────────────── CONF: vertrouwelijkheidsmatrix van de login-respons ───────────────
  // Negatieve-exposure-test (1 sep 2026): /mna/traject/{code} draait op SELECT * van mna_trajecten.
  // Deze test bewijst per rol dat gevoelige kolommen NIET in het traject-object terugkomen — de
  // "koper krijgt nooit bem_tekst / tussen_code"-invariant, niet alleen "koper krijgt wat mag".
  // Bij een nieuwe gevoelige kolom hoort hier een regel; faalt de test, dan lekt de kolom.
  kop('CONF · Vertrouwelijkheidsmatrix login-respons (negatieve exposure per rol)');
  {
    // Allow-lists — spiegel van DTO_BASIS / DTO_VERKOPER_EXTRA / DTO_BEGELEIDER_EXTRA in
    // backend/worker/11-mna-tekenen-beheer.js. De sterkste check is: geen enkel veld BUITEN deze set
    // (dan hoeft er bij een nieuwe kolom niets aan een verboden-lijst te worden toegevoegd).
    // Verkoper-identiteit — de koper krijgt dit pas ná een getekende NDA (DTO_VERKOPER_IDENTITEIT).
    const IDENTITEIT = ['kantoor_naam', 'contact_naam', 'contact_email', 'verkoper_adres', 'verkoper_kvk', 'tekenbevoegde_naam'];
    // KOPER_ALLOW = DTO_BASIS (géén verkoper-identiteit — dit testtraject heeft geen getekende NDA).
    const KOPER_ALLOW = [
      'kantoor_rechtsvorm', 'structuur_type', 'sector', 'traject_type',
      'status', 'traject_fase', 'created_at', 'updated_at', 'opdrachtgever_rol',
      'koper_naam', 'koper_rechtsvorm', 'koper_contact', 'koper_email', 'koper_adres', 'koper_kvk',
      'opening_voltooid',
      'begeleider_naam', 'begeleider_email', 'begeleider_bedrijf', 'begeleider_adres',
      'vergrendeld_op', 'afgesloten_op', 'koper_vrijgegeven', 'koper_categorieen',
      'verkoper_groep_id', 'beschikbaar_voor_matching',
      'verkoper_klaar', 'verkoper_klaar_at', 'verkoper_klaar_naam',
      'nda_tekst', 'nda_datum', 'nda_getekend', 'nda_getekend_datum', 'nda_doc_id',
      'loi_tekst', 'loi_datum', 'loi_getekend', 'loi_getekend_datum', 'loi_doc_id',
      'excl_tekst', 'excl_datum', 'excl_getekend', 'excl_doc_id',
      'bieding_tekst', 'bieding_datum',
    ];
    const VERKOPER_ALLOW = [...KOPER_ALLOW, ...IDENTITEIT, 'id', 'bem_tekst', 'bem_datum', 'bem_getekend', 'bem_doc_id', 'teaser_tekst', 'teaser_status', 'teaser_datum'];
    // Kritiek: deze mogen NOOIT bij de betreffende rol — losse expliciete asserts naast de allow-list.
    // Voor de koper (geen getekende NDA): óók de hele verkoper-identiteit.
    const KOPER_NOOIT = ['id', 'tussen_code', 'koper_code', ...IDENTITEIT, 'bem_tekst', 'dealvoorstel_tekst', 'verkoopmemorandum_tekst', 'teaser_tekst', 'trajectfee_bedrag', 'gebruiker_id', 'notitie', 'signhost_transactions', 'verkoper_teken', 'koper_teken'];
    const VERKOPER_NOOIT = ['tussen_code', 'koper_code', 'dealvoorstel_tekst', 'verkoopmemorandum_tekst', 'trajectfee_bedrag', 'gebruiker_id', 'notitie', 'signhost_transactions'];

    const loginResp = async (code) => {
      const r = await api('POST', '/mna/traject/' + code, { body: { ts: Date.now() } });
      if (r.status === 429) return '429';
      return (r.json && r.json.traject) || null;
    };
    const nooitVan = (obj, verboden, rol) => {
      const lek = verboden.filter(k => obj && Object.prototype.hasOwnProperty.call(obj, k));
      check(rol + '-login: verboden veld-keys volledig afwezig', lek.length === 0, lek.length ? 'aanwezig: ' + lek.join(', ') : '');
    };
    const binnenAllowList = (obj, allow, rol) => {
      const buiten = obj ? Object.keys(obj).filter(k => !allow.includes(k)) : [];
      check(rol + '-login: geen enkel veld buiten de toegestane set', buiten.length === 0, buiten.length ? 'buiten allow-list: ' + buiten.join(', ') : '');
    };

    const koperObj = await loginResp(traject.koper_code);
    const verkoperObj = await loginResp(traject.code);
    const tussenObj = await loginResp(traject.tussen_code);

    if (koperObj === '429' || verkoperObj === '429' || tussenObj === '429') {
      sla_over('CONF · vertrouwelijkheidsmatrix', 'login-rate-limiter (429) geraakt — draai los, niet direct na een andere e2e-run');
    } else {
      check('koper-login geeft een traject-object terug', !!koperObj);
      check('verkoper-login geeft een traject-object terug', !!verkoperObj);
      check('begeleider-login geeft een traject-object terug', !!tussenObj);

      if (koperObj) {
        nooitVan(koperObj, KOPER_NOOIT, 'koper');
        binnenAllowList(koperObj, KOPER_ALLOW, 'koper');
        const mist = ['sector', 'status', 'traject_type', 'begeleider_naam'].filter(k => !koperObj[k]);
        check('koper-login bevat wél de toegestane basisvelden (niet over-gestript)', mist.length === 0, mist.length ? 'mist: ' + mist.join(', ') : '');
        check('koper-login bevat GEEN id (= verkoper-toegangscode — privilege-escalatie)', !Object.prototype.hasOwnProperty.call(koperObj, 'id'));
        check('koper-login vóór NDA bevat GEEN verkoper-identiteit (kantoor_naam/contact/adres/KvK)',
          !IDENTITEIT.some(k => Object.prototype.hasOwnProperty.call(koperObj, k)),
          'aanwezig: ' + IDENTITEIT.filter(k => Object.prototype.hasOwnProperty.call(koperObj, k)).join(', '));
      }
      if (verkoperObj) {
        nooitVan(verkoperObj, VERKOPER_NOOIT, 'verkoper');
        binnenAllowList(verkoperObj, VERKOPER_ALLOW, 'verkoper');
        const verkMist = ['id', 'kantoor_naam', 'sector', 'status', 'nda_getekend'].filter(k => !(k in verkoperObj));
        check('verkoper-login bevat wél de toegestane velden (incl. eigen id, bem_tekst)', verkMist.length === 0, verkMist.length ? 'mist: ' + verkMist.join(', ') : '');
      }
      if (tussenObj) {
        const tussenMist = ['id', 'kantoor_naam', 'koper_naam'].filter(k => !(k in tussenObj));
        check('begeleider-login bevat de basisvelden', tussenMist.length === 0, tussenMist.length ? 'mist: ' + tussenMist.join(', ') : '');
        check('begeleider-login bevat tussen_code én koper_code (nodig voor het dashboard)',
          Object.prototype.hasOwnProperty.call(tussenObj, 'tussen_code') && Object.prototype.hasOwnProperty.call(tussenObj, 'koper_code'), '');
      }

      // Restricted doc_type in mna_doc_versies zetten (waarderingsrapport — geen AI/e-mail nodig via
      // /mna/waardering/rapport) en dan bewijzen dat de koper 'm niet kan lezen. Zonder deze stap was
      // de versies-check leeg en dus tandeloos.
      const wr = await api('POST', '/mna/waardering/rapport', { body: { code: traject.tussen_code, rapport_tekst: 'E2E CONF interne waardering — GEHEIM', cijfers_json: { ebitda: 111111, multiple: 4.2 } }, headers: { 'x-tussen-key': traject.tussen_code } });
      check('waarderingsrapport-versie aangemaakt voor de test', wr.json && (wr.json.ok === true || wr.json.versie != null), JSON.stringify(wr.json));

      const versiesKoper = await api('GET', '/mna/versies/' + traject.koper_code);
      const koperDocs = Array.isArray(versiesKoper.json) ? versiesKoper.json : [];
      const verbodenDocTypes = ['bem', 'bem_verk', 'bem_koper', 'bem_opvolging', 'bem_upload', 'dealvoorstel', 'waarderingsrapport', 'eigen_document', 'loi_concept', 'spa', 'closing'];
      const docLek = koperDocs.map(v => v.doc_type).filter(t => verbodenDocTypes.includes(t));
      check('/mna/versies/{koper_code} lekt geen begeleider-/verkoper-only doc_type (waarderingsrapport getest)',
        docLek.length === 0, docLek.length ? 'gelekt: ' + docLek.join(', ') : 'koper ziet: ' + (koperDocs.map(v => v.doc_type).join(', ') || '(niets)'));

      // Ook via /mna/versies/{tussen_code} het versie-id ophalen en proberen te lezen als koper.
      const versiesTussen = await api('GET', '/mna/versies/' + traject.tussen_code + '/waarderingsrapport', { headers: { 'x-tussen-key': traject.tussen_code } });
      const wrId = Array.isArray(versiesTussen.json) && versiesTussen.json[0] && versiesTussen.json[0].id;
      if (wrId) {
        const alsKoper = await api('GET', '/mna/versie/' + wrId + '?code=' + traject.koper_code);
        check('/mna/versie/{id} met koper-code op een waarderingsrapport → 403', alsKoper.status === 403, 'status=' + alsKoper.status);
        const alsBegeleider = await api('GET', '/mna/versie/' + wrId + '?code=' + traject.tussen_code);
        check('/mna/versie/{id} met begeleider-code op hetzelfde rapport → 200 (geen overbreek)', alsBegeleider.status === 200, 'status=' + alsBegeleider.status);
      } else {
        sla_over('CONF · /mna/versie/{id} koper-403', 'geen waarderingsrapport-versie-id gevonden');
      }

      // /adviseur/trajecten geeft de eigen trajectenlijst aan de adviseur (owner-facing, geen
      // cross-rol). Sinds BACKLOG 0.2: allow-list-DTO i.p.v. SELECT * + deny-list. Deze check
      // bewaakt (a) dat geen enkel veld buiten de allow-list lekt en (b) expliciet dat de
      // platformbeheerder-notitie / ondertekening-internals / deal- en fee-teksten weg zijn.
      const ADV_DTO_ALLOW = [
        'id', 'kantoor_naam', 'traject_type', 'sector', 'status', 'created_at',
        'verkoper_klaar', 'verkoper_klaar_naam', 'verkoper_klaar_at',
        'koper_code', 'tussen_code',
        'contact_naam', 'contact_email', 'verkoper_kvk', 'verkoper_adres',
        'koper_naam', 'koper_contact', 'koper_email', 'koper_kvk', 'koper_adres', 'koper_rechtsvorm',
        'teaser_tekst', 'beschikbaar_voor_matching',
      ];
      const ADV_NOOIT = [
        'notitie', 'verkoper_teken', 'verkoper_teken_grond', 'verkoper_teken2', 'koper_teken',
        'koper_teken_grond', 'teken_status', 'volgend_overleg', 'extra_contact', 'signhost_transactions',
        'dealvoorstel_tekst', 'verkoopmemorandum_tekst', 'bem_tekst', 'loi_tekst', 'nda_tekst',
        'trajectfee_bedrag', 'trajectfee_type',
      ];
      const advBuitenAllow = (rijen, waar) => {
        const buiten = [...new Set(rijen.flatMap(t => Object.keys(t || {})).filter(k => !ADV_DTO_ALLOW.includes(k)))];
        check(waar + ': geen veld buiten de allow-list-DTO', buiten.length === 0, buiten.length ? 'buiten allow-list: ' + buiten.join(', ') : '');
        const lek = ADV_NOOIT.filter(k => rijen.some(t => t && Object.prototype.hasOwnProperty.call(t, k)));
        check(waar + ': notitie / ondertekening-internals / deal- en fee-teksten afwezig', lek.length === 0, lek.length ? 'aanwezig: ' + lek.join(', ') : '');
      };

      const advLijst = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
      const advToken = advLijst.json && advLijst.json.sessie_token;
      const advTr = (advLijst.json && Array.isArray(advLijst.json.trajecten)) ? advLijst.json.trajecten
        : (Array.isArray(advLijst.json) ? advLijst.json : (advLijst.json && advLijst.json.lijst) || []);
      if (Array.isArray(advTr) && advTr.length) {
        advBuitenAllow(advTr, '/adviseur/trajecten');
      } else {
        sla_over('CONF · /adviseur/trajecten', 'geen trajecten in de adviseur-respons (' + JSON.stringify(advLijst.json).slice(0, 120) + ')');
      }

      // /gebruikers/mna/lijst + /gebruikers/mna/detail/ (worker/09) — zelfde eigenaar-context,
      // dezelfde gedeelde allow-list-helper sinds BACKLOG 0.2. Token-auth (x-gebruiker-token).
      if (advToken) {
        const gLijst = await api('GET', '/gebruikers/mna/lijst', { headers: { 'x-gebruiker-token': advToken } });
        const gTr = Array.isArray(gLijst.json) ? gLijst.json : (gLijst.json && gLijst.json.results) || [];
        if (Array.isArray(gTr) && gTr.length) {
          advBuitenAllow(gTr, '/gebruikers/mna/lijst');
          const gDetail = await api('GET', '/gebruikers/mna/detail/' + traject.code, { headers: { 'x-gebruiker-token': advToken } });
          if (gDetail.json && gDetail.json.traject) {
            advBuitenAllow([gDetail.json.traject], '/gebruikers/mna/detail/');
          } else {
            sla_over('CONF · /gebruikers/mna/detail/', 'geen traject-object in respons (' + JSON.stringify(gDetail.json).slice(0, 120) + ')');
          }
        } else {
          sla_over('CONF · /gebruikers/mna/lijst', 'lege lijst (' + JSON.stringify(gLijst.json).slice(0, 120) + ')');
        }
      } else {
        sla_over('CONF · /gebruikers/mna/*', 'geen sessie_token uit /adviseur/trajecten');
      }
    }
  }

  await opruimen();
  process.exit(samenvatting() ? 0 : 1);
}

main().catch(async e => {
  console.log('\n' + kleur('rood', 'ONVERWACHTE FOUT: ' + e.message));
  console.log(e.stack);
  await opruimen().catch(() => {});
  process.exit(1);
});
