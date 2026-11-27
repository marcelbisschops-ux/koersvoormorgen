#!/usr/bin/env node
// KVM-024 (besluit Marcel 26-11-2026): Marilyn-navigatie met Dashboard plus vier inklapbare hoofdmenu's. Statische
// mapping (elk oud onderdeel precies één keer bereikbaar, zelfde zichtbaarheidsregel, geen dubbelingen) en het gedrag van
// het echte script in node:vm met een minimale DOM-fixture (overgenomen uit tests/n123-kantoor-ui.mjs) en een nep-worker.
// Synthetisch, geen netwerk, verstuurt niets. Gebruik: node tests/kvm024-marilyn-navigatie.mjs

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

// ── Minimale DOM-fixture ─────────────────────────────────────────────────────
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', euro: '€', times: '×', rarr: '→' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const escTekst = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escTekst(s).replace(/"/g, '&quot;');
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
function parseStyle(s) {
  const st = {};
  String(s || '').split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) st[camel(d.slice(0, i).trim())] = d.slice(i + 1).trim(); });
  return st;
}

const TOK = /([a-zA-Z][a-zA-Z0-9]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]|(:not\(:disabled\))|(:checked)|(:disabled)/y;
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
    else if (m[4]) delen.push((e) => m[5] === undefined ? m[4] in e.attrs : e.attrs[m[4]] === m[5]);
    else if (m[6]) delen.push((e) => !e.disabled);
    else if (m[7]) delen.push((e) => !!e.checked);
    else if (m[8]) delen.push((e) => !!e.disabled);
  }
  return (e) => delen.every((f) => f(e));
}

class El {
  constructor(doc, tag, attrs = {}) {
    this.ownerDocument = doc; this.tag = tag.toLowerCase(); this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs }; this.children = []; this.parentNode = null; this.listeners = {};
    this.style = parseStyle(attrs.style); this.checked = 'checked' in attrs; this.disabled = 'disabled' in attrs;
    this.value = attrs.value !== undefined ? attrs.value : '';
    const self = this;
    this.dataset = new Proxy({}, { get: (_, k) => self.attrs['data-' + kebab(String(k))], set: (_, k, v) => { self.attrs['data-' + kebab(String(k))] = String(v); return true; } });
    this.classList = {
      add: (c) => { const l = (self.attrs.class || '').split(/\s+/).filter(Boolean); if (!l.includes(c)) l.push(c); self.attrs.class = l.join(' '); },
      remove: (c) => { self.attrs.class = (self.attrs.class || '').split(/\s+/).filter((x) => x && x !== c).join(' '); },
      contains: (c) => (self.attrs.class || '').split(/\s+/).includes(c),
    };
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  get parentElement() { return this.parentNode instanceof El ? this.parentNode : null; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'style') this.style = parseStyle(v); }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i < 0) throw new Error('removeChild: geen kind'); this.children.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  get elementen() { return this.children.filter((c) => c instanceof El); }
  nakomelingen() { return this.elementen.flatMap((c) => [c, ...c.nakomelingen()]); }
  matches(sel) { return parseSel(sel)(this); }
  querySelectorAll(sel) { const f = parseSel(sel); return this.nakomelingen().filter(f); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { const f = parseSel(sel); let n = this; while (n instanceof El) { if (f(n)) return n; n = n.parentNode; } return null; }
  get textContent() { return this.children.map((c) => c instanceof El ? c.textContent : c.text).join(''); }
  set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = [{ text: String(v), parentNode: this }]; }
  get innerHTML() { return this.children.map(serialiseer).join(''); }
  set innerHTML(h) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; parseInto(this, String(h)); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, extra = {}) {
    const ev = { type, target: this, currentTarget: this, stopPropagation() {}, preventDefault() {}, ...extra };
    (this.listeners[type] || []).slice().forEach((fn) => {
      const r = fn.call(this, ev);
      // Een asynchrone handler die faalt, moet als testfout zichtbaar worden — niet als stille rejection.
      if (r && typeof r.then === 'function') r.then(null, (e) => { (this.ownerDocument.fouten = this.ownerDocument.fouten || []).push(e); });
    });
  }
  // Zoals een browser: een uitgeschakelde knop reageert niet.
  click() {
    if (this.disabled) return;
    if (this.tag === 'input' && this.attrs.type === 'checkbox') { this.checked = !this.checked; this.dispatch('click'); this.dispatch('change'); return; }
    this.dispatch('click');
  }
  focus() {} blur() {} scrollIntoView() {}
}
function serialiseer(n) {
  if (!(n instanceof El)) return escTekst(n.text);
  const a = Object.entries(n.attrs).map(([k, v]) => ' ' + k + '="' + escAttr(v) + '"').join('');
  return '<' + n.tag + a + '>' + (VOID.has(n.tag) ? '' : n.children.map(serialiseer).join('') + '</' + n.tag + '>');
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
      if (!VOID.has(el.tag)) cur = el;
    } else if (m[4]) {
      cur.children.push({ text: decode(m[4]), parentNode: cur });
    }
  }
}
function maakDocument(bodyHtml) {
  const doc = { title: '' };
  const html = new El(doc, 'html'), body = new El(doc, 'body');
  html.appendChild(body);
  body.innerHTML = bodyHtml;
  doc.documentElement = html; doc.body = body;
  doc.getElementById = (id) => body.nakomelingen().find((e) => e.attrs.id === id) || null;
  doc.querySelectorAll = (s) => body.querySelectorAll(s);
  doc.querySelector = (s) => body.querySelector(s);
  doc.createElement = (t) => new El(doc, t);
  doc.addEventListener = () => {};
  return doc;
}


// ── 1. Statisch: elk onderdeel van de oude tabbalk (origin/main vóór KVM-024) is in de nieuwe navigatie bereikbaar ──
// De oude lijst staat hier vast (inventaris 27-11-2026 uit renderDashboard/renderTab): knop-id, activeTab, alleen superadmin.
const OUD = [
  ['t-scans', 'scans', true], ['t-cb', 'callbacks', true], ['t-leads', 'leads', true], ['t-proef', 'proef', true],
  ['t-mna', 'mna', false], ['t-docs', 'docs', false], ['t-rapp', 'rapporten', false], ['t-bench', 'benchmarks', false],
  ['t-waardering', 'waardering', false], ['t-waarderingsmodel', 'waarderingsmodel', false], ['t-templates', 'templates', false],
  ['t-sectoren', 'sectoren', true], ['t-geb', 'gebruikers', true], ['t-kantoren', 'kantoren', true], ['t-tarieven', 'tarieven', true],
  ['t-facturatie', 'facturatie', true], ['t-veiligheid', 'veiligheid', true], ['t-matching', 'matching', true], ['t-sourcing', 'sourcing', true],
  ['t-pool', 'pool', true], ['t-agenda', 'agenda', true], ['t-postvak', 'postvak', true],
];
// Besluit Marcel 26-11-2026 (MASTER KVM-024): groep → onderdelen (labels uit het besluit; samengestelde onderdelen als kopje).
const BESLUIT = {
  commercie: ['leads', 'callbacks', 'proef', 'scans', 'rapporten'],
  operatie: ['mna', 'matching', 'sourcing', 'pool', 'docs', 'agenda', 'postvak'],
  financien: ['tarieven', 'facturatie'],
  beheer: ['kantoren', 'gebruikers', 'waarderingsmodel', 'waardering', 'benchmarks', 'sectoren', 'templates', 'veiligheid'],
};

export async function draaiKvm024Checks(root) {
  let n = 0; const fouten = [];
  const check = (ok, naam, d) => { n++; if (ok) console.log('  \x1b[32m✓\x1b[0m ' + naam); else { fouten.push(naam); console.log('  \x1b[31m✗\x1b[0m ' + naam + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); } };
  const html = fs.readFileSync(path.join(root, 'marilyn.html'), 'utf8');
  const bodyStart = html.indexOf('<body>'), scriptStart = html.indexOf('<script>', bodyStart), scriptEind = html.lastIndexOf('</script>');
  const srcScript = html.slice(scriptStart + 8, scriptEind);

  // Echte MENU_GROEPEN uit de pagina (geïsoleerd geëvalueerd).
  const ctx0 = vm.createContext({});
  const menuSrc = srcScript.slice(srcScript.indexOf('var MENU_GROEPEN='), srcScript.indexOf('// Platte lijst van alle zichtbare onderdelen'));
  vm.runInContext(menuSrc + ';this.M=MENU_GROEPEN;', ctx0);
  const M = ctx0.M;
  const plat = [];
  M.forEach((g) => g.items.forEach((it) => (it.kop ? it.items : [it]).forEach((x) => plat.push({ groep: g.id, ...x }))));
  check(M.map((g) => g.id).join() === 'commercie,operatie,financien,beheer' && M.map((g) => g.label).join() === 'Commercie,Operatie,Financiën,Beheer', 'vier hoofdmenu\'s in de volgorde van het besluit');
  for (const [id, tab, sa] of OUD) {
    const m = plat.filter((x) => x.btn === id);
    check(m.length === 1 && m[0].tab === tab && !!m[0].sa === sa, 'oud onderdeel ' + id + ' (' + tab + ') precies één keer bereikbaar, zelfde zichtbaarheidsregel' + (sa ? ' (superadmin)' : ''), JSON.stringify(m));
    check(new RegExp("activeTab==='" + tab + "'\\)render").test(srcScript) || tab === 'rapporten', 'renderTab toont ' + tab + ' nog (route behouden)');
  }
  check(plat.length === OUD.length && new Set(plat.map((x) => x.tab)).size === plat.length, 'geen onderdeel dubbel en niets bijgekomen (' + plat.length + ' = ' + OUD.length + ')');
  for (const [g, tabs] of Object.entries(BESLUIT)) check(plat.filter((x) => x.groep === g).map((x) => x.tab).join() === tabs.join(), 'groep ' + g + ' bevat precies de onderdelen uit het besluit', plat.filter((x) => x.groep === g).map((x) => x.tab).join());
  const koppen = M.flatMap((g) => g.items.filter((it) => it.kop).map((it) => it.kop));
  check(koppen.join('|') === 'Scans & rapporten|Kantoren & gebruikers|Waarderingsmodellen|Benchmarks & sectoren', 'samengestelde onderdelen uit het besluit als kopje', koppen.join('|'));
  check(plat.find((x) => x.tab === 'pool').label === 'Specialistenpool' && !/>Pool</.test(html) && /Specialistenpool laden/.test(html), 'Pool heet Specialistenpool (menu en scherm)');

  // ── 2. Gedrag in de echte pagina (node:vm, minimale DOM, nep-worker) ──
  const calls = [];
  const KEY = 'SYNTH-ADMIN-KEY-KVM024';
  const LIJST = { '/admin/scans': [{ overall: 60, created_at: Date.now() }, { overall: 80, created_at: Date.now() - 30 * 864e5 }], '/admin/callbacks': [{ id: 1 }], '/mna/admin/lijst': [{ id: 'SYN1' }, { id: 'SYN2' }, { id: 'SYN3' }],
    '/admin/rapporten': [], '/admin/leads': [{ status: 'nieuw' }, { status: 'nieuw' }, { status: 'behandeld' }], '/adviseur/proef/aanvragen': [{ status: 'open' }] };
  let dashUit = 'ok';
  const DASH = { '/mna/admin/postvak': { ok: true, ongelezen: 4, berichten: [] }, '/mna/admin/agenda': { ok: true, komend: [{}, {}], voorstellen: [{}], blokkades: [], historie: [] },
    '/mna/admin/facturatie/facturen': { ok: true, facturen: [{ status: 'concept' }, { status: 'definitief' }, { status: 'definitief' }, { status: 'betaald' }] },
    '/mna/admin/veiligheid/bevindingen': { ok: true, bevindingen: [{ status: 'open' }, { status: 'gefixt' }, { status: 'open' }] } };
  const antwoord = (status, body) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) });
  const fetchNep = (url, opts = {}) => {
    const u = new URL(String(url)), methode = (opts.method || 'GET').toUpperCase();
    calls.push({ pad: u.pathname, methode });
    if ((opts.headers || {})['x-admin-key'] !== KEY && u.pathname !== '/admin/login-notify') return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
    if (methode === 'GET' && LIJST[u.pathname]) return Promise.resolve(antwoord(200, LIJST[u.pathname]));
    if (u.pathname === '/admin/login-notify') return Promise.resolve(antwoord(200, { ok: true }));
    if (methode === 'GET' && DASH[u.pathname]) {
      if (dashUit === 'net') return Promise.reject(new TypeError('Failed to fetch'));
      if (dashUit === 500) return Promise.resolve(antwoord(500, { error: 'synthetisch' }));
      if (dashUit === 'okfalse') return Promise.resolve(antwoord(200, { ok: false }));
      return Promise.resolve(antwoord(200, DASH[u.pathname]));
    }
    return Promise.resolve(antwoord(404, { error: 'Not found' }));
  };
  const settle = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setImmediate(r)); };
  const maak = async () => {
    const doc = maakDocument(html.slice(bodyStart + 6, scriptStart));
    const ctx = vm.createContext({ document: doc, fetch: fetchNep, location: { search: '' }, URLSearchParams, URL, confirm: () => false, alert: () => {}, prompt: () => null,
      window: { open() {} }, navigator: { clipboard: { writeText: () => Promise.resolve() } }, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, console });
    vm.runInContext(srcScript, ctx, { filename: 'marilyn.html' });
    ctx.toast = () => {};
    doc.getElementById('ak').value = KEY; doc.getElementById('login-btn').click(); await settle();
    const $ = (id) => doc.getElementById(id);
    const zichtbaar = (id) => { let e = $(id); while (e && e.attrs) { if (e.style && e.style.display === 'none') return false; e = e.parentNode; } return !!$(id); };
    return { doc, ctx, $, zichtbaar, tekst: () => doc.body.textContent, klik: async (id) => { $(id).click(); await settle(); } };
  };

  let o = await maak();
  check(o.ctx.activeTab === 'dashboard' || vm.runInContext('activeTab', o.ctx) === 'dashboard', 'na inloggen: managementdashboard is de startpagina (niet meer het scanoverzicht)');
  check(['g-commercie', 'g-operatie', 'g-financien', 'g-beheer'].every((g) => o.$(g) && o.$(g).getAttribute('aria-expanded') === 'false') && OUD.every(([id]) => o.$(id) && !o.zichtbaar(id)), 'op het dashboard staan alle vier groepen dicht; elk oud onderdeel is aanwezig');
  const tegels = o.doc.querySelectorAll('.dash-tegel');
  check(tegels.length === 4, 'vier tegels: Commercie, Operatie, Financiën, Beheer', tegels.length);
  const t = o.tekst();
  // Handmatig: 2 nieuwe leads, 1 terugbelverzoek, 1 open proefaanvraag, 1 scan in 7 dagen, 2 scans gem. (60+80)/2=70, 3 trajecten,
  // postvak 4 ongelezen, agenda 1 voorstel en 2 komend, facturen 1 concept / 2 definitief / 1 betaald, 2 open bevindingen.
  const regel = (label, w) => o.doc.querySelectorAll('.dash-regel').some((b) => b.textContent === label + w);
  check(regel('Nieuwe leads', 2) && regel('Terugbelverzoeken', 1) && regel('Open proefaanvragen', 1) && regel('Scans laatste 7 dagen', 1) && regel('Scans totaal (gem. score 70)', 2) && regel('Scanrapporten', 0), 'Commercie: kerncijfers uit de geladen lijsten kloppen met de hand', t.slice(0, 400));
  check(regel('M&A-trajecten', 3) && regel('Ongelezen in postvak', 4) && regel('Afspraakvoorstellen te behandelen', 1) && regel('Komende afspraken', 2), 'Operatie: trajecten, postvak, agenda');
  const per = vm.runInContext('factVorigeMaand()', o.ctx);
  check(regel('Facturen ' + per + ': concept', 1) && regel('Facturen ' + per + ': definitief, niet betaald', 2) && regel('Facturen ' + per + ': betaald', 1), 'Financiën: facturen van de vorige maand per status');
  check(regel('Open veiligheidsbevindingen (alle ernstniveaus)', 2), 'Beheer: open veiligheidsbevindingen');
  check(o.$('t-postvak').textContent.includes('4') && o.$('g-commercie').textContent.includes('4') && o.$('g-operatie').textContent.includes('4'), 'tellers behouden; dichte groep toont het aantal openstaande acties (Commercie 2+1+1, Operatie postvak 4)', [o.$('g-commercie').textContent, o.$('g-operatie').textContent]);
  check(!calls.some((c) => c.methode === 'POST' && c.pad !== '/admin/login-notify') && calls.filter((c) => c.methode === 'GET' && DASH[c.pad]).length === 4, 'dashboard leest alleen (vier bestaande GET-routes), verstuurt niets');

  await o.klik('g-operatie');
  check(o.$('g-operatie').getAttribute('aria-expanded') === 'true' && o.zichtbaar('t-mna') && !o.zichtbaar('t-leads') && !o.zichtbaar('t-veiligheid'), 'groepkop opent alleen die groep');
  await o.klik('g-beheer');
  check(o.zichtbaar('t-veiligheid') && !o.zichtbaar('t-mna'), 'andere groepkop: vorige groep dicht, nieuwe open (alleen één groep open)');
  await o.klik('g-beheer');
  check(!o.zichtbaar('t-veiligheid') && o.$('g-beheer').getAttribute('aria-expanded') === 'false', 'zelfde groepkop nogmaals: groep dicht');
  await o.klik('g-commercie'); await o.klik('t-scans');
  check(vm.runInContext('activeTab', o.ctx) === 'scans' && o.$('t-scans').getAttribute('aria-current') === 'page' && o.zichtbaar('t-scans') && !o.zichtbaar('t-mna'), 'onderdeel kiezen: actief en alleen zijn groep open');
  for (const [id, tab] of OUD) {
    await o.klik('t-dashboard');
    const g = plat.find((x) => x.btn === id).groep;
    await o.klik('g-' + g); await o.klik(id);
    check(vm.runInContext('activeTab', o.ctx) === tab && o.zichtbaar(id), 'klikpad Dashboard → ' + g + ' → ' + id + ' opent ' + tab);
  }
  await o.klik('t-dashboard');
  const tegelKop = o.$('dt-financien'); tegelKop.click(); await settle();
  check(vm.runInContext('activeTab', o.ctx) === 'tarieven' && o.zichtbaar('t-facturatie'), 'tegel Financiën opent het eerste onderdeel van die groep en klapt de groep open');
  await o.klik('t-dashboard');
  const r = o.doc.querySelectorAll('.dash-regel').find((b) => b.getAttribute('data-tab') === 'veiligheid'); r.click(); await settle();
  check(vm.runInContext('activeTab', o.ctx) === 'veiligheid', 'regel in een tegel opent het bijbehorende onderdeel');

  // Foutpad: aanvullende cijfers niet beschikbaar → weggelaten, nooit 0 of geschat.
  for (const uit of [500, 'net', 'okfalse']) {
    dashUit = uit; calls.length = 0;
    o = await maak();
    const tx = o.tekst();
    check(!/Ongelezen in postvak|Afspraakvoorstellen|Facturen \d{4}-\d{2}|Open veiligheidsbevindingen/.test(tx) && /Nieuwe leads/.test(tx) && /Geen kerncijfers beschikbaar/.test(tx), 'aanvullende bron ' + uit + ': cijfers weggelaten, rest blijft, nette melding');
  }
  dashUit = 'ok';
  // Zonder geldige sleutel: geen menu en geen dashboardverzoeken.
  calls.length = 0;
  const doc2 = maakDocument(html.slice(bodyStart + 6, scriptStart));
  const ctx2 = vm.createContext({ document: doc2, fetch: fetchNep, location: { search: '' }, URLSearchParams, URL, confirm: () => false, alert: () => {}, prompt: () => null, window: { open() {} }, navigator: {}, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, console });
  vm.runInContext(srcScript, ctx2); ctx2.toast = () => {};
  doc2.getElementById('ak').value = 'verkeerd'; doc2.getElementById('login-btn').click(); await settle();
  check(!doc2.getElementById('mar-nav') && !doc2.getElementById('t-veiligheid') && !calls.some((c) => DASH[c.pad]), 'verkeerde sleutel: geen menu, geen dashboardverzoeken');

  return { n, fouten };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { n, fouten } = await draaiKvm024Checks(root);
  console.log(fouten.length ? fouten.length + ' van ' + n + ' KVM-024-checks gefaald.' : 'Alle ' + n + ' KVM-024-checks geslaagd.');
  process.exit(fouten.length ? 1 : 0);
}
