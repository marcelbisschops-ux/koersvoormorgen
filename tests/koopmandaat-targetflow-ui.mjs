#!/usr/bin/env node
// Generieke koopmandaat-targetflow (GO 4 okt 2026) — lokale DOM-handlertest voor de frontend.
// Laadt de ECHTE code uit mna/04-begeleider-dashboard.js (koopmandaatscherm, targetkaarten,
// targetformulier, targetflow-acties, historie, introductievenster en koperkaart), de zuivere P1C-
// functies uit adv.html en het script van introductie.html in node:vm met een minimale DOM-fixture en
// een gecontroleerde nep-worker. Er wordt echt geklikt, ingevuld en bevestigd; de nep-worker legt elk
// verzoek vast en antwoordt volgens het backendcontract (docs/koopmandaat-targetflow.md, privé
// backendrepo). Geen netwerk, geen browser, geen node_modules; alle gegevens zijn synthetisch.
//
// Dit bewijst de UI-handlers (welke verzoeken, met welke body, op welke target, en wat de gebruiker
// daarna ziet). Het bewijst NIET dat de backend of de volledige gebruikersflow werkt: daarvoor zijn er
// tests/koopmandaat-targetflow.spec.js (lokaal met de echte backendhandler, en een aparte live-modus
// tegen staging).
//
// Gebruik: node tests/koopmandaat-targetflow-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 23).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const T = 'TSYNTH01';
const K = 'KSYNTH01';
const T0 = Date.UTC(2026, 9, 4, 8, 0);
const TOKEN = 'Tsyn-tf-' + 'y'.repeat(35);

// ── Minimale DOM-fixture (zelfde opzet als tests/n122-marilyn-verwijderen.mjs) ──
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', mdash: '—', middot: '·' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const TOK = /([a-zA-Z][a-zA-Z0-9]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/y;
function parseSel(sel) {
  sel = sel.trim();
  const delen = [];
  let pos = 0;
  while (pos < sel.length) {
    TOK.lastIndex = pos;
    const m = TOK.exec(sel);
    if (!m) throw new Error('selector niet ondersteund door de fixture: ' + sel);
    pos = TOK.lastIndex;
    if (m[1]) delen.push((e) => e.tag === m[1].toLowerCase());
    else if (m[2]) delen.push((e) => e.attrs.id === m[2]);
    else if (m[3]) delen.push((e) => (e.attrs.class || '').split(/\s+/).includes(m[3]));
    else if (m[4]) delen.push((e) => (m[5] === undefined ? m[4] in e.attrs : e.attrs[m[4]] === m[5]));
  }
  return (e) => delen.every((f) => f(e));
}
class El {
  constructor(doc, tag, attrs = {}) {
    this.ownerDocument = doc; this.tag = tag.toLowerCase(); this.attrs = { ...attrs }; this.children = []; this.parentNode = null;
    this.listeners = {}; this.style = {}; this.disabled = 'disabled' in attrs; this.checked = 'checked' in attrs;
    this.value = attrs.value !== undefined ? attrs.value : '';
    this.htmlGebruikt = false;
    const self = this;
    this.dataset = new Proxy({}, { get: (_, k) => self.attrs['data-' + kebab(String(k))] });
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  get firstChild() { return this.children[0] || null; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(c) { if (c.parentNode && c.parentNode.removeChild) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i < 0) throw new Error('removeChild: geen kind'); this.children.splice(i, 1); c.parentNode = null; return c; }
  get elementen() { return this.children.filter((c) => c instanceof El); }
  nakomelingen() { return this.elementen.flatMap((c) => [c, ...c.nakomelingen()]); }
  querySelectorAll(sel) { const f = parseSel(sel); return this.nakomelingen().filter(f); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  get textContent() { return this.children.map((c) => (c instanceof El ? c.textContent : c.text)).join(''); }
  set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = v === '' || v == null ? [] : [{ text: String(v), parentNode: this }]; }
  set innerHTML(h) { this.htmlGebruikt = true; this.children.forEach((c) => { c.parentNode = null; }); this.children = []; parseInto(this, String(h)); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type) {
    const ev = { type, target: this, currentTarget: this, preventDefault() {}, stopPropagation() {} };
    const fns = (this.listeners[type] || []).slice();
    if (typeof this['on' + type] === 'function') fns.push(this['on' + type]);
    fns.forEach((fn) => {
      const r = fn.call(this, ev);
      if (r && typeof r.then === 'function') r.then(null, (e) => { this.ownerDocument.fouten.push(e); });
    });
  }
  click() { if (this.disabled) return; if (this.tag === 'input' && this.attrs.type === 'checkbox') { this.checked = !this.checked; this.dispatch('change'); } this.dispatch('click'); }
  select() {} focus() {}
}
function parseInto(root, html) {
  let cur = root;
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      let n = cur;
      while (n && n !== root && n.tag !== tag) n = n.parentNode;
      if (n && n !== root) cur = n.parentNode;
    } else if (m[2]) {
      const attrs = {};
      const ar = /([^\s=]+)(?:="([^"]*)"|='([^']*)')?/g;
      let am;
      while ((am = ar.exec(m[3] || ''))) attrs[am[1].toLowerCase()] = decode(am[2] ?? am[3] ?? '');
      const el = new El(root.ownerDocument, m[2], attrs);
      cur.appendChild(el);
      if (el.tag === 'textarea') { el.value = ''; }
      if (!VOID.has(el.tag)) cur = el;
    } else if (m[4]) {
      if (cur.tag === 'textarea') cur.value += decode(m[4]);
      cur.children.push({ text: decode(m[4]), parentNode: cur });
    }
  }
}
function maakDocument(bodyHtml) {
  const doc = { title: '', fouten: [] };
  const body = new El(doc, 'body');
  body.innerHTML = bodyHtml;
  body.htmlGebruikt = false;
  doc.body = body;
  doc.getElementById = (id) => body.nakomelingen().find((e) => e.attrs.id === id) || null;
  doc.querySelectorAll = (s) => body.querySelectorAll(s);
  doc.querySelector = (s) => body.querySelector(s);
  doc.createElement = (t) => new El(doc, t);
  doc.createTextNode = (t) => ({ text: String(t), parentNode: null });
  return doc;
}
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setImmediate(r)); };

function knip(src, van, tot, naam) {
  const a = src.indexOf(van), b = src.indexOf(tot, a + 1);
  if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
  return src.slice(a, b);
}

// ── Synthetische begeleider-DTO (vorm van targetDto in de backend) ──
function target(o) {
  const gen = o.targetflow !== 'legacy';
  return Object.assign({
    id: 't', naam: 'Synth BV', sector: 'mkb', status: gen ? 'nieuw' : 'kandidaat', toegevoegd_op: T0, notities: '', contactlog: [], bron: '', bijgewerkt_op: T0,
    gepromoveerd_naar_traject_id: null, gepromoveerd_naar_traject_ref: null, vrijgave_status: 'afgeschermd', teaser: null,
    targetflow: gen ? 'generiek' : 'legacy', anonieme_naam: '', kvk_nummer: '', rechtsvorm: '', bedrijfsadres: '',
    contact: { naam: '', email: '', telefoon: '', noodzaak_einde_op: null }, eerste_benadering: { op: null, kanaal: '' },
    voorgesteld_op: null, koper_interesse: null, match: null, archief: null,
    introductie_stand: { versie: null, link_uitgegeven_op: null, akkoord_op: null, relatie_einde_op: null, teaser_beschikbaar: false, vrijgegeven: false },
    promotie_voorwaarden: { targetflow: gen ? 'generiek' : 'legacy', match_vereist: gen, match: false, vrijgave_vereist: gen, vrijgave: false, gearchiveerd: false, gepromoveerd: false, gereed: !gen },
  }, o);
}
const MANDAAT = { id: 'mandaat_synth', koper_naam: 'Synth Koper BV', begeleider_naam: 'Synth Begeleider', status: 'actief' };
const ALFA = () => target({
  id: 'tf_a', naam: 'Synth Alfa BV', status: 'benaderd', anonieme_naam: 'Project Synth-Noord', kvk_nummer: '12345678', rechtsvorm: 'B.V.', bedrijfsadres: 'Synthstraat 1, Synthdorp',
  contact: { naam: 'Synth Contact Alfa', email: 'alfa@voorbeeld.test', telefoon: '+31 6 0000 0001', noodzaak_einde_op: null }, eerste_benadering: { op: '2026-10-01', kanaal: 'telefoon' },
  teaser: { regio: 'zuid', goedgekeurd_op: T0 },
  introductie_stand: { versie: 1, link_uitgegeven_op: T0 + 1000, akkoord_op: null, relatie_einde_op: null, teaser_beschikbaar: true, vrijgegeven: false },
});
const BETA = () => target({
  id: 'tf_b', naam: 'Synth Beta BV', status: 'interesse', voorgesteld_op: T0, koper_interesse: { waarde: 'interesse', op: T0 + 5, bron: 'koper' },
  teaser: { regio: 'noord', goedgekeurd_op: T0 }, introductie_stand: { versie: 1, link_uitgegeven_op: T0, akkoord_op: T0 + 9, relatie_einde_op: null, teaser_beschikbaar: true, vrijgegeven: false },
});
const GAMMA = () => target({ id: 'tf_c', naam: 'Synth Gamma BV', targetflow: 'legacy', status: 'kandidaat' });
const DELTA = () => target({ id: 'tf_d', naam: 'Synth Delta BV', status: 'geen_interesse', archief: { gearchiveerd_op: T0 + 50, reden: 'Synth archiefreden' },
  promotie_voorwaarden: { targetflow: 'generiek', match_vereist: true, match: false, vrijgave_vereist: true, vrijgave: false, gearchiveerd: true, gepromoveerd: false, gereed: false } });
const EPSILON = () => target({ id: 'tf_e', naam: 'Synth Epsilon BV', status: 'match', match: { op: T0 + 70, mandaat_id: 'mandaat_synth' }, vrijgave_status: 'vrijgegeven',
  introductie_stand: { versie: 2, link_uitgegeven_op: T0, akkoord_op: T0 + 60, relatie_einde_op: null, teaser_beschikbaar: true, vrijgegeven: true },
  promotie_voorwaarden: { targetflow: 'generiek', match_vereist: true, match: true, vrijgave_vereist: true, vrijgave: true, gearchiveerd: false, gepromoveerd: false, gereed: true } });

// ── Omgeving: echte mna/04-code + nep-worker ──
function maakOmgeving(root, { rol = 'begeleider', targets = [] } = {}) {
  const src04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const src02 = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8');
  const esc = src02.match(/^function esc\(s\)\{.*\}$/m), ge = src02.match(/^function ge\(id\)\{.*\}$/m);
  const status = [src04.match(/^var KM_STATUS_LABEL=.*$/m), src04.match(/^var KM_STATUS_KLEUR=.*$/m)];
  if (!esc || !ge || !status[0] || !status[1]) throw new Error('esc/ge/KM_STATUS_* niet gevonden');
  const code = [esc[0], ge[0], status[0][0], status[1][0],
    knip(src04, '// N115-PURE-BEGIN', '// N115-PURE-END', 'N115-PURE'),
    knip(src04, 'function kmSectorLabels(){', '// ── N-115 · alleen-lezen introductiebewijs', 'koopmandaatscherm'),
    knip(src04, 'function toonKmNieuwTargetModal(){', 'function renderLogin(){', 'targetformulier'),
    "function renderApp(){renderKoopmandaatScherm(document.getElementById('app'));}",
  ].join('\n');
  const omg = {
    state: { targets: targets.map((t) => JSON.parse(JSON.stringify(t))) },
    calls: [], toasts: [], dialogen: [], confirms: [], prompts: [], verboden: [],
    api: null,
  };
  const doc = maakDocument('<div id="app"></div>');
  const standaard = (m, pad) => {
    if (m === 'GET' && pad === '/mna/koopmandaat/' + (rol === 'koper' ? K : T)) {
      return { status: 200, json: { ok: true, rol, mandaat: MANDAAT, targets: omg.state.targets } };
    }
    return { status: 404, json: { error: 'fixture: onbekend ' + m + ' ' + pad } };
  };
  const nepFetch = (url, o = {}) => {
    const u = new URL(String(url));
    const m = (o.method || 'GET').toUpperCase();
    let body = null;
    try { body = o.body ? JSON.parse(o.body) : null; } catch (e) { body = '<<ongeldig>>'; }
    const regel = { m, url: u.href, pad: u.pathname, headers: o.headers || {}, body, cache: o.cache };
    omg.calls.push(regel);
    const r = (omg.api && omg.api(m, u.pathname, body, regel)) || standaard(m, u.pathname);
    if (r === 'netwerk') return Promise.reject(new Error('offline (fixture)'));
    return Promise.resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json });
  };
  const sandbox = {
    document: doc, window: { location: { href: '' } }, location: { origin: 'https://koersvoormorgen.test' }, navigator: {},
    S: {}, WORKER: STAGING, BRAND: { platform: 'KVM' }, SECTOR_PROFIELEN: { mkb: { label: 'MKB' } }, brandMerkHtml: () => '',
    toast: (m, t) => omg.toasts.push({ m: String(m), t }),
    confirm: (m) => { omg.dialogen.push({ soort: 'confirm', m: String(m) }); return omg.confirms.length ? omg.confirms.shift() : false; },
    prompt: (m) => { omg.dialogen.push({ soort: 'prompt', m: String(m) }); return omg.prompts.length ? omg.prompts.shift() : null; },
    fetch: nepFetch, fetchMetTimeout: (u, o) => nepFetch(u, o), URL, setTimeout, clearTimeout,
  };
  for (const naam of ['localStorage', 'sessionStorage', 'console', 'indexedDB']) {
    Object.defineProperty(sandbox, naam, { get() { omg.verboden.push(naam); return undefined; } });
  }
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: 'mna/04#targetflow' });
  ctx.S = { screen: 'koopmandaat', code: rol === 'koper' ? K : T, kmRol: rol, kmMandaat: MANDAAT, kmTargets: omg.state.targets.map((t) => JSON.parse(JSON.stringify(t))) };
  ctx.renderApp();
  return Object.assign(omg, {
    ctx, doc,
    byId: (id) => doc.getElementById(id),
    alle: (sel) => doc.querySelectorAll(sel),
    een: (sel) => doc.querySelector(sel),
    tekst: () => doc.body.textContent,
    knop: (id, actie, waarde) => doc.querySelectorAll('.km-tf-actie').find((b) => b.attrs['data-id'] === id && b.attrs['data-actie'] === actie && (!waarde || b.attrs['data-waarde'] === waarde)) || null,
    kaart: (id) => doc.querySelectorAll('.km-target-kaart').find((k) => k.attrs['data-id'] === id) || null,
    klik: async (el) => { if (!el) throw new Error('element ontbreekt'); el.click(); await flush(); },
    posts: (pad) => omg.calls.filter((c) => c.m === 'POST' && (!pad || c.pad === pad)),
    gets: (pad) => omg.calls.filter((c) => c.m === 'GET' && (!pad || c.pad === pad)),
  });
}
const tfPad = (id) => '/mna/koopmandaat/' + T + '/target/' + id + '/targetflow';
const stap = (o, id, sleutel) => { const k = o.kaart(id); const li = k && k.querySelectorAll('.km-tf-stap').find((x) => x.attrs['data-stap'] === sleutel); return li ? li.attrs['data-klaar'] : null; };

export async function draaiKoopmandaatTargetflowUiChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const veilig = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ' faalde: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

  // ── A. Begeleider: meerdere parallelle targets, voortgang, archief, promotiepoort ──
  await veilig('A. weergave', async () => {
    const alfa = ALFA();
    alfa.contactlog = [{ datum: T0 + 500, tekst: 'Introductiebevestiging verzonden (versie 1) — vóór de link', door: 'x' }];
    const o = maakOmgeving(root, { targets: [alfa, BETA(), GAMMA(), DELTA(), EPSILON()] });
    const kop = o.tekst();
    check(kop.includes('Potentiële targets (4)') && o.byId('km-archief') && o.byId('km-archief').textContent.includes('Gearchiveerde targets (1)'),
      'sectie "Potentiële targets" telt de 4 actieve targets; de gearchiveerde staat apart onder "Gearchiveerde targets (1)"');
    check(o.byId('km-archief').querySelectorAll('.km-target-kaart').length === 1 && o.kaart('tf_d').textContent.includes('Synth archiefreden') && o.kaart('tf_d').textContent.includes('Er is niets verwijderd'),
      'gearchiveerde kaart toont datum/reden en dat er niets is verwijderd (bewijs blijft bewaard)');
    const opts = (id) => o.byId('km-status-' + id).querySelectorAll('option').map((x) => x.attrs.value + ('disabled' in x.attrs ? '!' : '')).join(',');
    check(opts('tf_a') === 'nieuw,benaderd,in_gesprek,geparkeerd,afgewezen' && opts('tf_c') === 'kandidaat,in_gesprek,geparkeerd,afgewezen',
      'statuskeuze: generiek alleen de handmatige statussen, legacy exact de bestaande vier');
    check(opts('tf_b') === 'nieuw,benaderd,in_gesprek,geparkeerd,afgewezen,interesse!' && !o.byId('km-status-tf_b').disabled,
      'flowstatus (interesse) staat als niet-kiesbare huidige waarde in de lijst, niet als handmatige keuze');
    check(o.byId('km-status-tf_e').disabled && o.byId('km-status-tf_d').disabled, 'bij een vastgelegde match en bij een gearchiveerde target is de statuskeuze uitgeschakeld');
    const a = o.kaart('tf_a').textContent;
    check(a.includes('Interne anonieme naam: Project Synth-Noord') && a.includes('alleen intern') && a.includes('12345678') && a.includes('B.V.') && a.includes('Synthstraat 1') && a.includes('Synth Contact Alfa') && a.includes('+31 6 0000 0001') && a.includes('telefoon'),
      'begeleiderkaart toont alle metadata: interne anonieme naam (gemarkeerd), KvK, rechtsvorm, adres, contact, telefoon, eerste benadering');
    check(stap(o, 'tf_a', 'link') === '1' && stap(o, 'tf_a', 'verzonden') === '0' && o.kaart('tf_a').querySelector('.km-tf-volgende').textContent.includes('leg de verzending vast'),
      'voortgang: "Link aangemaakt" klaar, "verzonden" NIET (contactmoment van vóór de link telt niet); volgende stap vraagt de verzending vast te leggen');
    check(!o.kaart('tf_a').querySelector('.km-promoveer-btn') && o.kaart('tf_a').querySelector('.km-tf-promotie-blokkade').textContent === 'Promoveren kan pas na een vastgelegde match met de koper en de afzonderlijke identiteitsvrijgave.',
      'generiek zonder match/vrijgave: geen promoveerknop, wel wat er ontbreekt');
    check(!!o.kaart('tf_e').querySelector('.km-promoveer-btn') && o.kaart('tf_e').querySelector('.km-promoveer-btn').attrs.href === 'adv.html?promotie=' + T + '&target=tf_e&worker=' + encodeURIComponent(STAGING),
      'generiek met match + vrijgave (promotie_voorwaarden.gereed): bestaande P1C-promoveerknop naar adv.html');
    check(!!o.kaart('tf_c').querySelector('.km-promoveer-btn') && !o.kaart('tf_d').querySelector('.km-promoveer-btn') && o.kaart('tf_d').textContent.includes('herstel de target eerst'),
      'legacy: promotie ongewijzigd beschikbaar (geen nieuwe voorwaarden); gearchiveerd: geen promotie');
    check(o.kaart('tf_e').querySelector('.km-tf-match').textContent.includes('Synth Koper BV') && o.kaart('tf_e').textContent.includes('Een match geeft de identiteit niet vrij'),
      'match zichtbaar met datum en koper van dit mandaat, met de uitleg dat een match niets vrijgeeft');
    check(!!o.knop('tf_b', 'match') && !o.knop('tf_a', 'match') && !!o.knop('tf_e', 'match_intrekken') && !!o.knop('tf_c', 'targetflow_generiek') && !o.knop('tf_a', 'targetflow_generiek')
      && !!o.knop('tf_d', 'herstellen') && !o.knop('tf_d', 'archiveren') && !!o.knop('tf_a', 'voorstellen') && !o.knop('tf_a', 'voorstellen').disabled,
      'acties per target volgen de eigen status (match alleen na interesse; overzetten alleen legacy; herstellen alleen gearchiveerd)');
    check(o.kaart('tf_d').querySelectorAll('.km-notitie-opslaan').length === 0 && o.kaart('tf_d').querySelectorAll('.km-contact-input').length === 0,
      'gearchiveerd: geen notitie- of contactmomentinvoer (backend weigert die met 409)');
    check(o.kaart('tf_a').querySelector('.km-intro-btn').textContent.startsWith('Bemiddelings-/introductiebevestiging') && o.kaart('tf_c').querySelector('.km-intro-btn').textContent === 'Introductieovereenkomst & vrijgave',
      'nieuwe flow heet "Bemiddelings-/introductiebevestiging"; de bestaande flow houdt "Introductieovereenkomst"');
    check(o.verboden.length === 0 && o.doc.fouten.length === 0, 'geen opslag/console-toegang en geen handlerfouten bij renderen');

    // Verzending wél vastgelegd (zelfde versie, ná de link) → stap klaar
    const alfa2 = ALFA();
    alfa2.contactlog = [{ datum: T0 + 2000, tekst: 'Introductiebevestiging verzonden (versie 1) — door de begeleider zelf verstuurd', door: 'x' }];
    const o2 = maakOmgeving(root, { targets: [alfa2] });
    check(stap(o2, 'tf_a', 'verzonden') === '1', 'voortgang: "verzonden" alleen na een eigen contactmoment voor de actuele versie ná het aanmaken van de link');
    const alfa3 = ALFA();
    alfa3.introductie_stand.versie = 2;
    alfa3.contactlog = alfa2.contactlog;
    check(stap(maakOmgeving(root, { targets: [alfa3] }), 'tf_a', 'verzonden') === '0', 'voortgang: verzending van een oudere versie telt niet voor de actuele versie');
  });

  // ── B. Koper: alleen de allow-list, eigen interessekeuze ──
  await veilig('B. koper', async () => {
    const lek = ['Project Synth-Noord', '12345678', 'Synthstraat', 'Synth Contact Alfa', 'alfa@voorbeeld.test', '0000 0001', 'Synth archiefreden', 'Synth Alfa BV'];
    const koperT = { id: 'tf_a', status: 'voorgesteld', vrijgave_status: 'afgeschermd', teaser: { regio: 'zuid' }, koper_interesse: null, interesse_mogelijk: true,
      // onverwachte velden die nooit getoond mogen worden
      naam: 'Synth Alfa BV', anonieme_naam: 'Project Synth-Noord', kvk_nummer: '12345678', bedrijfsadres: 'Synthstraat 1', contact: { naam: 'Synth Contact Alfa', email: 'alfa@voorbeeld.test', telefoon: '+31 6 0000 0001' }, archief: { reden: 'Synth archiefreden' }, match: { op: 1 } };
    const o = maakOmgeving(root, { rol: 'koper', targets: [koperT, { id: 'tf_x', status: 'nieuw', vrijgave_status: 'afgeschermd', teaser: null }] });
    const tekst = o.tekst();
    check(lek.every((s) => !tekst.includes(s)) && tekst.includes('Anonieme kandidaat'), 'koper ziet geen naam, anonieme naam, KvK, adres, contact of archiefdetails, ook niet als die onverwacht in de respons staan');
    check(o.alle('.km-koper-interesse-btn').length === 2 && o.alle('.km-koper-interesse-btn').every((b) => b.attrs['data-id'] === 'tf_a') && o.alle('.km-status-select').length === 0 && o.alle('.km-tf-actie').length === 0,
      'interesseknoppen alleen bij interesse_mogelijk; geen begeleideracties in de koperweergave');
    let n = 0, los;
    o.api = (m, pad, body, regel) => {
      if (m === 'POST' && pad === '/mna/koopmandaat/' + K + '/target/tf_a/interesse') {
        n++;
        if (n === 1) return { status: 404, json: { error: 'Voor deze kandidaat kunt u (nu) geen interesse aangeven.' } };
        o.state.targets[0] = Object.assign({}, koperT, { status: 'interesse', koper_interesse: 'interesse' });
        return { status: 200, json: { ok: true, koper_interesse: 'interesse', status: 'interesse' } };
      }
      return null;
    };
    const ja = () => o.alle('.km-koper-interesse-btn').find((b) => b.attrs['data-waarde'] === 'interesse');
    await o.klik(ja());
    const melding = o.een('.km-koper-interesse-melding');
    check(n === 1 && melding.style.display === 'block' && melding.textContent.includes('geen interesse aangeven') && !o.toasts.some((t) => t.t === 'ok'), '404 → eerlijke melding, geen succes');
    ja().click(); ja().click();
    await flush();
    const p = o.posts('/mna/koopmandaat/' + K + '/target/tf_a/interesse');
    check(p.length === 2 && JSON.stringify(p[1].body) === JSON.stringify({ interesse: 'interesse' }) && !('x-tussen-key' in p[1].headers) && p[1].cache === 'no-store',
      'koper-POST exact {interesse} naar de eigen target, zonder begeleidersleutel; dubbelklik geeft één POST');
    check(o.toasts.some((t) => t.t === 'ok' && t.m.includes('vastgelegd')) && o.gets('/mna/koopmandaat/' + K).length >= 1 && o.een('.km-koper-interesse-keuze').textContent === 'Uw keuze: Interesse',
      'succes pas na serverbevestiging; daarna actuele lijst met de eigen keuze');
  });

  // ── C. Targetformulier: nieuw (altijd generiek) en bewerken (alleen gewijzigde velden) ──
  await veilig('C. formulier', async () => {
    const o = maakOmgeving(root, { targets: [ALFA(), GAMMA()] });
    await o.klik(o.byId('km-nieuw-target-btn'));
    check(!!o.byId('km-target-modal') && o.byId('kmt-anonieme_naam') && o.byId('km-target-modal').textContent.includes('Nooit zichtbaar voor de koper'), 'formulier met alle velden; interne anonieme naam duidelijk als intern gemarkeerd');
    const vul = (k, v) => { o.byId('kmt-' + k).value = v; };
    vul('naam', 'Synth Nieuw BV'); vul('kvk_nummer', '1234');
    await o.klik(o.byId('kmt-ok'));
    check(o.byId('kmt-err').textContent === 'KvK-nummer moet uit 8 cijfers bestaan.' && o.posts().length === 0, 'ongeldig KvK-nummer → melding, niets verstuurd');
    vul('kvk_nummer', '87654321'); vul('contact_telefoon', '+31 6 1111 2222');
    await o.klik(o.byId('kmt-ok'));
    check(o.byId('kmt-err').textContent.includes('alleen vastgelegd bij een contactnaam') && o.posts().length === 0, 'telefoon zonder contactnaam/e-mail → melding (zelfde regel als de backend), niets verstuurd');
    vul('contact_naam', 'Synth Persoon'); vul('contact_email', 'nieuw@voorbeeld.test'); vul('anonieme_naam', 'Project Synth-Zuid'); vul('rechtsvorm', 'B.V.');
    vul('bedrijfsadres', 'Synthlaan 2'); vul('eerste_benadering_op', '2026-10-03'); vul('eerste_benadering_kanaal', 'e-mail'); vul('sector', 'mkb');
    o.byId('kmt-status').value = 'benaderd'; o.byId('kmt-notities').value = 'Synth eerste notitie';
    let antwoord = { status: 400, json: { error: 'Ongeldige startstatus.' } };
    o.api = (m, pad, body) => {
      if (m === 'POST' && pad === '/mna/koopmandaat/' + T + '/target') {
        if (antwoord.status === 200) o.state.targets.unshift(target({ id: 'tf_n', naam: body.naam, status: body.status }));
        return antwoord;
      }
      return null;
    };
    await o.klik(o.byId('kmt-ok'));
    check(o.byId('km-target-modal') && o.byId('kmt-err').textContent === 'Ongeldige startstatus.' && o.byId('kmt-naam').value === 'Synth Nieuw BV' && !o.toasts.some((t) => t.t === 'ok'),
      'serverweigering → foutmelding in het formulier, invoer blijft staan, geen succes');
    antwoord = { status: 200, json: { ok: true, id: 'tf_n', targetflow: 'generiek', status: 'benaderd' } };
    await o.klik(o.byId('kmt-ok'));
    const p = o.posts('/mna/koopmandaat/' + T + '/target');
    check(JSON.stringify(p[p.length - 1].body) === JSON.stringify({ targetflow: 'generiek', naam: 'Synth Nieuw BV', status: 'benaderd', anonieme_naam: 'Project Synth-Zuid', sector: 'mkb', kvk_nummer: '87654321', rechtsvorm: 'B.V.', bedrijfsadres: 'Synthlaan 2', contact_naam: 'Synth Persoon', contact_email: 'nieuw@voorbeeld.test', contact_telefoon: '+31 6 1111 2222', eerste_benadering_op: '2026-10-03', eerste_benadering_kanaal: 'e-mail', notities: 'Synth eerste notitie' })
      && p[p.length - 1].headers['x-tussen-key'] === T,
      'nieuwe target: POST met targetflow "generiek" en uitsluitend ingevulde velden (contact via de contact_*-velden = één bron)');
    check(!o.byId('km-target-modal') && o.toasts.some((t) => t.m.includes('generieke targetflow')) && !!o.kaart('tf_n'), 'na serverbevestiging: venster dicht, lijst ververst, nieuwe kaart zichtbaar');

    // Bewerken: alleen gewijzigde velden, alleen deze target
    await o.klik(o.knop('tf_a', 'bewerk_formulier'));
    check(o.byId('kmt-contact_email').value === 'alfa@voorbeeld.test' && o.byId('kmt-kvk_nummer').value === '12345678' && !o.byId('kmt-status'), 'bewerken start met de huidige gegevens (geen startstatus)');
    await o.klik(o.byId('kmt-ok'));
    check(o.byId('kmt-err').textContent === 'Er is niets gewijzigd.' && !o.posts(tfPad('tf_a')).length, 'niets gewijzigd → niets verstuurd');
    o.byId('kmt-contact_telefoon').value = '+31 6 9999 0000'; o.byId('kmt-rechtsvorm').value = '';
    o.api = (m, pad) => (m === 'POST' && pad === tfPad('tf_a') ? { status: 200, json: { ok: true, target: ALFA() } } : null);
    await o.klik(o.byId('kmt-ok'));
    const b = o.posts(tfPad('tf_a'));
    check(b.length === 1 && JSON.stringify(b[0].body) === JSON.stringify({ actie: 'bewerken', rechtsvorm: '', contact_telefoon: '+31 6 9999 0000' }) && !o.posts(tfPad('tf_c')).length,
      'bewerken: actie "bewerken" met alleen de gewijzigde velden (leeg = wissen), uitsluitend op de eigen target');
  });

  // ── D. Targetflow-acties: bevestiging, isolatie per target, 409/netwerk zonder vals succes ──
  await veilig('D. acties', async () => {
    const o = maakOmgeving(root, { targets: [ALFA(), BETA(), GAMMA(), DELTA(), EPSILON()] });
    let volgende = null;
    o.api = (m, pad, body) => (m === 'POST' && pad.endsWith('/targetflow') ? volgende : null);

    volgende = { status: 200, json: { ok: true, target: {} } };
    o.confirms.push(false);
    await o.klik(o.knop('tf_a', 'voorstellen'));
    check(!o.posts(tfPad('tf_a')).length && o.dialogen.pop().m.includes('uitsluitend de goedgekeurde anonieme teaser'), 'voorstellen: annuleren verstuurt niets; de bevestiging zegt dat de koper alleen de teaser ziet');
    o.confirms.push(true);
    await o.klik(o.knop('tf_a', 'voorstellen'));
    check(JSON.stringify(o.posts(tfPad('tf_a')).map((c) => c.body)) === JSON.stringify([{ actie: 'voorstellen' }]) && o.posts().every((c) => c.pad === tfPad('tf_a')),
      'voorstellen: POST {actie:"voorstellen"} uitsluitend op target A');

    o.confirms.push(true);
    await o.klik(o.knop('tf_b', 'match'));
    const mc = o.dialogen.filter((d) => d.soort === 'confirm').pop().m;
    check(mc.includes('Synth Koper BV') && mc.includes('NIET vrij') && JSON.stringify(o.posts(tfPad('tf_b')).pop().body) === JSON.stringify({ actie: 'match', bevestigd: true }),
      'match: expliciete bevestiging (koper genoemd, geeft identiteit niet vrij) en body {actie:"match", bevestigd:true}');

    o.confirms.push(true);
    await o.klik(o.knop('tf_b', 'interesse_registreren', 'geen_interesse'));
    check(JSON.stringify(o.posts(tfPad('tf_b')).pop().body) === JSON.stringify({ actie: 'interesse_registreren', waarde: 'geen_interesse' }), 'begeleider legt interessekeuze vast met de gekozen waarde');

    o.confirms.push(true);
    await o.klik(o.knop('tf_c', 'targetflow_generiek'));
    check(JSON.stringify(o.posts(tfPad('tf_c')).pop().body) === JSON.stringify({ actie: 'targetflow_generiek', bevestigd: true }) && o.dialogen.filter((d) => d.soort === 'confirm').pop().m.includes('match met de koper én de afzonderlijke identiteitsvrijgave'),
      'legacy → generiek alleen na expliciete, herkenbare bevestiging met de nieuwe promotievoorwaarden');

    const voor = o.posts().length;
    o.prompts.push(null);
    await o.klik(o.knop('tf_a', 'archiveren'));
    o.prompts.push('   ');
    await o.klik(o.knop('tf_a', 'archiveren'));
    check(o.posts().length === voor && o.toasts.pop().m.includes('Vul een reden in'), 'archiveren: annuleren of lege reden → niets verstuurd');
    volgende = { status: 200, json: { ok: true, target: {}, link_ingetrokken: true } };
    o.prompts.push('Synth reden archief');
    await o.klik(o.knop('tf_a', 'archiveren'));
    check(JSON.stringify(o.posts(tfPad('tf_a')).pop().body) === JSON.stringify({ actie: 'archiveren', reden: 'Synth reden archief' })
      && o.toasts.some((t) => t.t === 'ok' && t.m.includes('link is ingetrokken') && t.m.includes('niets verwijderd')) && o.dialogen.filter((d) => d.soort === 'prompt').pop().m.includes('verwijdert niets'),
      'archiveren met reden; melding noemt ingetrokken link en dat er niets is verwijderd');
    o.prompts.push('Synth reden herstel');
    await o.klik(o.knop('tf_d', 'herstellen'));
    check(JSON.stringify(o.posts(tfPad('tf_d')).pop().body) === JSON.stringify({ actie: 'herstellen', reden: 'Synth reden herstel' }), 'herstellen met reden op de gearchiveerde target');
    o.prompts.push('Synth reden intrekken');
    await o.klik(o.knop('tf_e', 'match_intrekken'));
    check(JSON.stringify(o.posts(tfPad('tf_e')).pop().body) === JSON.stringify({ actie: 'match_intrekken', reden: 'Synth reden intrekken' }), 'match intrekken vraagt een reden');

    // 409: servermelding, actuele stand laden, geen succes
    const getsVoor = o.gets('/mna/koopmandaat/' + T).length;
    const okVoor = o.toasts.filter((t) => t.t === 'ok').length;
    volgende = { status: 409, json: { error: 'Een match kan pas na vastgelegde interesse van de koper.', reden: 'interesse_ontbreekt' } };
    o.confirms.push(true);
    await o.klik(o.knop('tf_b', 'match'));
    check(o.toasts.filter((t) => t.t === 'ok').length === okVoor && o.toasts.pop().m === 'Een match kan pas na vastgelegde interesse van de koper.' && o.gets('/mna/koopmandaat/' + T).length === getsVoor + 1,
      '409 → servermelding, geen succes, en direct de actuele stand geladen');
    volgende = 'netwerk';
    o.confirms.push(true);
    const knop = o.knop('tf_a', 'voorstellen');
    await o.klik(knop);
    check(o.toasts.pop().m.includes('niet bevestigd') && knop.disabled === false, 'netwerkfout → "niet bevestigd", knop weer bruikbaar');
    check(o.verboden.length === 0 && o.doc.fouten.length === 0, 'geen opslag/console-toegang en geen handlerfouten');
  });

  // ── E. Historie ──
  await veilig('E. historie', async () => {
    const o = maakOmgeving(root, { targets: [BETA()] });
    o.api = (m, pad) => (m === 'GET' && pad === tfPad('tf_b') ? { status: 200, json: { ok: true, rol: 'begeleider', target: BETA(), historie: [
      { soort: 'aangemaakt', categorie: 'audit', details: { targetflow: 'generiek', status: 'nieuw', velden: ['naam', 'contact_email'] }, actor: 'begeleider:Synth Begeleider', op: T0 },
      { soort: 'voorgesteld', categorie: 'bewijs', details: { van: 'benaderd', naar: 'voorgesteld' }, actor: 'admin', op: T0 + 1 },
      { soort: 'interesse', categorie: 'bewijs', details: { waarde: 'interesse', bron: 'koper', van: 'voorgesteld' }, actor: 'koper', op: T0 + 2 },
      { soort: 'gearchiveerd', categorie: 'audit', details: { reden: 'Synth reden', status: 'interesse' }, actor: 'begeleider:Synth Begeleider', op: T0 + 3 },
    ] } } : null);
    await o.klik(o.knop('tf_b', 'historie'));
    const regels = o.alle('.km-tf-historie-regel').map((r) => r.textContent);
    check(regels.length === 4 && regels[0].includes('Gearchiveerd') && regels[0].includes('reden: Synth reden') && regels[1].includes('interesse (door de koper zelf)') && regels[1].includes('door de koper')
      && regels[2].includes('Benaderd → Voorgesteld aan de koper') && regels[2].includes('door de beheerder') && regels[3].includes('velden: bedrijfsnaam, e-mailadres contactpersoon') && regels[3].includes('door de begeleider'),
      'historie: nieuwste eerst, begrijpelijke labels, statussen, interessebron, redenen, veldnamen en actor (geen contactwaarden)');
    o.byId('km-tf-historie-sluit').click();
    o.api = (m, pad) => (m === 'GET' && pad === tfPad('tf_b') ? { status: 503, json: { error: 'Tijdelijk niet beschikbaar' } } : null);
    await o.klik(o.knop('tf_b', 'historie'));
    check(o.byId('km-tf-historie-fout') && o.byId('km-tf-historie-fout').textContent.includes('geen verouderde historie') && !o.alle('.km-tf-historie-regel').length, 'historie niet geladen → foutmelding, geen verouderde weergave');
  });

  // ── F. Bevestigingsvenster: concept, vaststellen, link, eigen mailprogramma, verzending vastleggen ──
  await veilig('F. bevestiging', async () => {
    const start = target({ id: 'tf_a', naam: 'Synth Alfa BV', status: 'benaderd', contact: { naam: 'Synth Contact Alfa', email: 'alfa@voorbeeld.test', telefoon: '', noodzaak_einde_op: null } });
    const o = maakOmgeving(root, { targets: [start, GAMMA()] });
    const introPad = '/mna/koopmandaat/' + T + '/target/tf_a/introductie';
    const CONCEPT = 'BEMIDDELINGS-/INTRODUCTIEBEVESTIGING — CONCEPT\n1.2 De begeleider: [in te vullen: naam begeleider]\n6.1 [in te vullen: introductiebescherming]';
    let hv = null;
    const ovz = () => ({ ok: true, target: { id: 'tf_a', naam: 'Synth Alfa BV', status: 'benaderd' }, alleen_lezen: false, juridische_validatie: 'afzonderlijk_vereist', huidige_versie: hv, versies: hv ? [hv] : [], reacties: [],
      vrijgave: { status: 'afgeschermd' }, teaser: null, contact: { naam: 'Synth Contact Alfa', email: 'alfa@voorbeeld.test', noodzaak_einde_op: null }, bewaring: { relatie_einde_op: null, legal_hold: null } });
    o.api = (m, pad, body) => {
      if (pad === introPad + '/concept' && m === 'GET') return { status: 200, json: { ok: true, concept: { titel: 'BEMIDDELINGS-/INTRODUCTIEBEVESTIGING', tekst: CONCEPT, open_punten: ['naam begeleider', 'introductiebescherming: <b>verwijzing</b>'] }, ai: false, opgeslagen: false, juridische_validatie: 'afzonderlijk_vereist' } };
      if (pad === introPad && m === 'GET') return { status: 200, json: ovz() };
      if (pad === introPad && m === 'POST' && body.actie === 'versie') { hv = { id: 'v1', versie: 1, tekst: body.tekst, inhoud_hash: 'h'.repeat(64), partijen: {}, status: 'actief', aangemaakt_op: T0, link: { actief: false } }; return { status: 200, json: { ok: true, versie: 1 } }; }
      // Vervaldatum relatief aan nu: de UI toont een link alleen zolang hij niet verlopen is.
      if (pad === introPad && m === 'POST' && body.actie === 'link_uitgeven') { hv.link = { actief: true, uitgegeven_op: T0 + 100, verloopt_op: Date.now() + 14 * 864e5 }; return { status: 200, json: { ok: true, token: TOKEN, versie: 1, verloopt_op: Date.now() + 14 * 864e5 } }; }
      if (pad === '/mna/koopmandaat/' + T + '/target/tf_a' && m === 'POST') {
        const t = o.state.targets[0];
        t.contactlog.push({ datum: T0 + 200, tekst: body.contact_toevoegen, door: 'Synth Begeleider' });
        t.introductie_stand = Object.assign({}, t.introductie_stand, { versie: 1, link_uitgegeven_op: T0 + 100 });
        return { status: 200, json: { ok: true } };
      }
      return null;
    };
    await o.klik(o.kaart('tf_a').querySelector('.km-intro-btn'));
    check(o.byId('km-intro-titel').textContent.startsWith('Bemiddelings-/introductiebevestiging') && o.byId('km-intro-modal').textContent.includes('geen bemiddelingsovereenkomst (BEM)'),
      'venster heet "Bemiddelings-/introductiebevestiging" en zegt expliciet dat het geen BEM is');
    o.byId('km-intro-tekst').value = '';
    await o.klik(o.byId('km-intro-concept'));
    check(o.gets(introPad + '/concept').length === 1 && o.byId('km-intro-tekst').value === CONCEPT && o.posts().length === 0, 'concept: GET …/introductie/concept vult het tekstvak; er wordt niets opgeslagen of verstuurd');
    const info = o.byId('km-intro-concept-info');
    check(info.style.display === 'block' && info.textContent.includes('Niet door AI') && info.textContent.includes('naam begeleider') && o.byId('km-intro-open-punten').querySelectorAll('li').length === 2 && !o.byId('km-intro-open-punten').querySelector('b'),
      'open punten uit het concept zichtbaar (servertekst ge-escaped) met "niet opgeslagen / niet door AI"');
    o.byId('km-intro-tekst').value = CONCEPT.replace('[in te vullen: naam begeleider]', 'Synth Begeleider');
    o.confirms.push(false);
    await o.klik(o.byId('km-intro-versie'));
    check(!o.posts(introPad).length && o.dialogen.pop().m.includes('1 open punt(en)'), 'vaststellen met open punten vraagt eerst een extra bevestiging; annuleren verstuurt niets');
    o.confirms.push(true, true);
    await o.klik(o.byId('km-intro-versie'));
    const v = o.posts(introPad).find((c) => c.body.actie === 'versie');
    check(v && v.body.tekst === CONCEPT.replace('[in te vullen: naam begeleider]', 'Synth Begeleider').trim() && o.dialogen.filter((d) => d.soort === 'confirm').pop().m.startsWith('Versie 1 van de bemiddelings-/introductiebevestiging vaststellen?'),
      'vaststellen via de bestaande actie "versie" met de aangepaste tekst (geen nieuwe vervang-API)');
    await o.klik(o.byId('km-intro-link-uit'));
    check(o.byId('km-intro-link').value === 'https://koersvoormorgen.test/introductie.html?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING), 'doelgebonden link aangemaakt (alleen in dit venster)');
    const verz = o.byId('km-intro-verzending').textContent;
    check(verz.includes('Link aangemaakt op') && verz.includes('Nog niet vastgelegd') && !!o.byId('km-intro-verzonden'), '"Link aangemaakt" is geen verzendbewijs: status zegt dat de verzending nog niet is vastgelegd');
    await o.klik(o.byId('km-intro-mail'));
    const mail = o.ctx.window.location.href;
    const q = new URLSearchParams(mail.slice(mail.indexOf('?') + 1));
    check(mail.startsWith('mailto:alfa@voorbeeld.test?') && q.get('subject') === 'Bemiddelings-/introductiebevestiging — uw beoordeling' && q.get('body').includes('bemiddelings-/introductiebevestiging')
      && q.get('body').includes(o.byId('km-intro-link').value) && q.get('body').startsWith('Geachte Synth Contact Alfa,') && o.posts().every((c) => !String(JSON.stringify(c.body)).includes(TOKEN)),
      'bestaande mailprogrammaknop: mailto met contact-e-mail, nieuwe documentnaam en de link; het token gaat nooit naar de server');
    o.confirms.push(true);
    await o.klik(o.byId('km-intro-verzonden'));
    const vz = o.posts('/mna/koopmandaat/' + T + '/target/tf_a');
    check(vz.length === 1 && vz[0].body.contact_toevoegen.startsWith('Introductiebevestiging verzonden (versie 1) — door de begeleider zelf verstuurd') && vz[0].body.contact_toevoegen.includes('geen bezorgbevestiging')
      && o.dialogen.filter((d) => d.soort === 'confirm').pop().m.includes('kan niet controleren of de e-mail is aangekomen'),
      'verzending vastleggen = eigen contactmoment via de bestaande route, met de expliciete melding dat het platform geen bezorging kan bevestigen');
    check(o.byId('km-intro-verzending').textContent.includes('Verzending vastgelegd op') && !o.byId('km-intro-verzonden') && o.byId('km-intro-link'),
      'na serverbevestiging: verzending vastgelegd zichtbaar; de link blijft in dit venster beschikbaar');
    await o.klik(o.byId('km-intro-sluit'));
    check(stap(o, 'tf_a', 'verzonden') === '1' && stap(o, 'tf_a', 'link') === '1', 'na sluiten: kaart toont "Link aangemaakt" én "verzonden (door u vastgelegd)" als aparte stappen');

    // Bestaande flow: oude naam, geen conceptknop, oude mailtekst
    o.api = (m, pad) => (m === 'GET' && pad === '/mna/koopmandaat/' + T + '/target/tf_c/introductie' ? { status: 200, json: Object.assign(ovz(), { huidige_versie: null, target: { id: 'tf_c', naam: 'Synth Gamma BV' } }) } : null);
    await o.klik(o.kaart('tf_c').querySelector('.km-intro-btn'));
    check(o.byId('km-intro-titel').textContent.startsWith('Introductieovereenkomst') && !o.byId('km-intro-concept') && !!o.byId('km-intro-versie'), 'bestaande (legacy) target: venster en invoer ongewijzigd, geen concept');
    check(o.ctx.kmIntroMailto('x@voorbeeld.test', 'X', 'L', null, '').includes(encodeURIComponent('Introductieovereenkomst — uw beoordeling')), 'mailtekst van de bestaande flow ongewijzigd');
    o.byId('km-intro-sluit').click();

    // Gearchiveerd: geen versie, link of vrijgave
    const o2 = maakOmgeving(root, { targets: [DELTA()] });
    o2.api = (m, pad) => (m === 'GET' && pad.endsWith('/tf_d/introductie') ? { status: 200, json: Object.assign(ovz(), { huidige_versie: { id: 'v1', versie: 1, tekst: 'x', inhoud_hash: 'h', partijen: {}, status: 'actief', aangemaakt_op: T0, link: { actief: false } }, reacties: [{ versie: 1, inhoud_hash: 'h', soort: 'akkoord', naam: 'Synth Akkoord', created_at: T0 }] }) } : null);
    await o2.klik(o2.kaart('tf_d').querySelector('.km-intro-btn'));
    check(o2.byId('km-intro-gearchiveerd') && !o2.byId('km-intro-versie') && !o2.byId('km-intro-link-uit') && !o2.byId('km-intro-vrijgeven') && o2.byId('km-intro-modal').textContent.includes('Gearchiveerd: herstel de target eerst.'),
      'gearchiveerde target: geen nieuwe versie, link of vrijgave (ook niet na akkoord), wel uitleg');
    check(o.verboden.length === 0 && o.doc.fouten.length === 0 && o2.doc.fouten.length === 0, 'geen opslag/console-toegang en geen handlerfouten in het venster');
  });

  // ── G. adv.html: begrijpelijke promotieweigering ──
  await veilig('G. adv.html', async () => {
    const html = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
    const ctx = vm.createContext({ URLSearchParams });
    vm.runInContext(knip(html, '// P1C-ADV-PURE-BEGIN', '// P1C-ADV-PURE-END', 'adv.html'), ctx);
    const f = ctx.p1cFoutMelding;
    check(f(409, { error: 'x', reden: 'match_ontbreekt' }).includes('match met de koper heeft vastgelegd') && f(409, { error: 'x', reden: 'vrijgave_ontbreekt' }).includes('identiteitsvrijgave')
      && f(409, { error: 'x', reden: 'gearchiveerd' }).includes('Herstel de target eerst') && [f(409, { reden: 'match_ontbreekt' }), f(409, { reden: 'gearchiveerd' })].every((m) => m.includes('Er is niets gestart')),
      'promotie: match_ontbreekt, vrijgave_ontbreekt en gearchiveerd krijgen een begrijpelijke uitleg (niets gestart)');
    check(f(409, {}) === 'Deze target is al gepromoveerd.' && f(403, { error: 'Log in als de adviseur', reden: 'identiteit_onbekend' }) === 'Log in als de adviseur', 'bestaande P1C-meldingen ongewijzigd');
  });

  // ── H. introductie.html: documentnaam volgt de vastgestelde tekst ──
  await veilig('H. introductie.html', async () => {
    const html = fs.readFileSync(path.join(root, 'introductie.html'), 'utf8');
    const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
    const draai = async (tekst) => {
      const doc = maakDocument('<span id="intro-kop">Introductieovereenkomst</span><div id="root"></div>');
      const ctx = vm.createContext({ URLSearchParams, location: { search: '?token=' + 'a'.repeat(43), pathname: '/introductie.html' }, history: { replaceState() {} }, document: doc,
        fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, overeenkomst: { versie: 1, tekst, inhoud_hash: 'h', verloopt_op: T0, partijen: { target_naam: 'Synth Alfa BV' } }, status: 'open' }) }) });
      vm.runInContext(script, ctx);
      await flush();
      return { doc, h1: doc.querySelector('h1').textContent, h2: doc.querySelectorAll('h2').map((x) => x.textContent), titel: doc.title, tekst: doc.getElementById('intro-tekst').textContent };
    };
    const nieuw = await draai('BEMIDDELINGS-/INTRODUCTIEBEVESTIGING — CONCEPT\nSynth tekst');
    check(nieuw.h1 === 'Bemiddelings-/introductiebevestiging' && nieuw.doc.getElementById('intro-kop').textContent === nieuw.h1 && nieuw.h2[0] === 'Tekst van de bevestiging' && nieuw.titel.startsWith('Bemiddelings-/introductiebevestiging'),
      'target-pagina: een vastgestelde BEMIDDELINGS-/INTRODUCTIEBEVESTIGING heet ook zo');
    const oud = await draai('Artikel 1 — bestaande synthetische overeenkomst');
    check(oud.h1 === 'Introductieovereenkomst' && oud.h2[0] === 'Tekst van de overeenkomst' && oud.tekst === 'Artikel 1 — bestaande synthetische overeenkomst', 'target-pagina: eerder vastgestelde introductieovereenkomst houdt naam en tekst');
  });

  // ── I. Statische bewaking ──
  try {
    const src04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const tf = knip(src04, '// TARGETFLOW-PURE-BEGIN', '// TARGETFLOW-PURE-END', 'TARGETFLOW-PURE');
    const handlers = knip(src04, '// ── Generieke targetflow · acties per target', '// ── N-115 · begeleiderbeheer', 'targetflow-handlers') + knip(src04, 'function toonKmNieuwTargetModal(){', 'function renderLogin(){', 'targetformulier');
    check(!/localStorage|sessionStorage|console\.|document\.cookie|sendBeacon/.test(tf + handlers), 'targetflow-code slaat niets op en logt niets');
    check(!/fetch\(|fetchMetTimeout\(|document\./.test(tf), 'TARGETFLOW-PURE bevat geen netwerk- of DOM-code');
    const pure = knip(src04, '// N115-PURE-BEGIN', '// N115-PURE-END', 'N115-PURE');
    check(!/\bt\.(?!koper_interesse\b|interesse_mogelijk\b|id\b)\w+/.test(knip(pure, 'function kmKoperInteresseHtml(', 'function kmIntroLink(', 'koperinteresse')),
      'koperinteresse leest alleen koper_interesse/interesse_mogelijk (geen interne velden)');
    check(/'\/introductie'\+\(pad\|\|''\)/.test(src04) && /kmIntroApi\(targetId,null,'\/concept'\)/.test(src04) && /actie\(vBtn,\{actie:'versie',tekst:tekst\},'Versie vastgesteld\.'\)/.test(src04),
      'concept via de nieuwe scoped GET-route; vaststellen blijft de bestaande actie "versie"');
    const hl = fs.readFileSync(path.join(root, 'mna/08-handleiding.js'), 'utf8');
    const adv = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
    check(/Potentiële targets/.test(hl) && /Link aangemaakt/.test(hl) && /geen bezorgbevestiging/.test(hl) && /stap\('1d'/.test(adv), 'handleidingen (mna/08 en adv.html) beschrijven de targetflow, inclusief "link aangemaakt ≠ verzonden"');
  } catch (e) {
    check(false, 'statische bewaking faalde: ' + String((e && e.message) || e));
  }
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiKoopmandaatTargetflowUiChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' targetflow-UI-checks gefaald.' : '\nAlle ' + res.length + ' targetflow-UI-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
