#!/usr/bin/env node
// N-123/N-124 (4 okt 2026) — in Marilyn één geopend kantoor verwijderen (Kantoren-tab).
// De frontend roept uitsluitend de bestaande, gereviewde backendroute aan:
// POST /mna/admin/kantoren/{encodeURIComponent(id)}/verwijderen met x-admin-key (superadmin). De backend
// verwijdert logisch (status 'verwijderd', historie blijft) en weigert een gekoppeld kantoor met 409.
//
// Deze test laadt het ECHTE script uit marilyn.html in node:vm met een minimale DOM-fixture (zelfde opzet
// als tests/n122-marilyn-verwijderen.mjs) en een gecontroleerde nep-worker — geen netwerk, geen browser,
// geen node_modules. Hij logt echt in via doLogin(), opent de Kantoren-tab, klikt Bekijken en
// Kantoor verwijderen. Alle gegevens zijn synthetisch; er wordt nooit een echte omgeving aangeroepen.
//
// Gebruik: node tests/n123-kantoor-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 22).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const KEY = 'SYNTH-ADMIN-KEY-N123';

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

// ── Gecontroleerde nep-worker (gedrag volgens het backendcontract van N-123) ──
function basisKantoren() {
  return [
    { id: 'KTSYN1', naam: 'Synth Kantoor Een', status: 'actief', aantal_leden: 0, aantal_actieve_modules: 6 },
    { id: 'kt/2 b', naam: 'Synth Kantoor Twee', status: 'actief', aantal_leden: 0, aantal_actieve_modules: 6 },
    { id: 'KTSYN3', naam: 'Synth Kantoor Drie', status: 'actief', aantal_leden: 2, aantal_actieve_modules: 6 },
  ];
}
const LOGIN_LIJSTEN = new Set(['/admin/scans', '/admin/callbacks', '/mna/admin/lijst', '/admin/rapporten', '/admin/leads', '/adviseur/proef/aanvragen']);
const antwoord = (status, body) => ({
  ok: status >= 200 && status < 300, status,
  json: () => typeof body === 'string' ? Promise.reject(new SyntaxError('Unexpected token < in JSON')) : Promise.resolve(JSON.parse(JSON.stringify(body))),
});
const VERWIJDER_RE = /^\/mna\/admin\/kantoren\/([^/]+)\/verwijderen$/;
const DETAIL_RE = /^\/mna\/admin\/kantoren\/([^/]+)$/;

function maakWorker() {
  const srv = { kantoren: basisKantoren(), uitkomst: {}, lijstUitkomst: null, calls: [], onbekend: [] };
  srv.fetch = (url, opts = {}) => {
    const u = new URL(String(url));
    const methode = (opts.method || 'GET').toUpperCase();
    const headers = opts.headers || {};
    const call = { pad: u.pathname, methode, key: headers['x-admin-key'], body: opts.body };
    srv.calls.push(call);
    if (methode === 'GET' && LOGIN_LIJSTEN.has(u.pathname)) return Promise.resolve(antwoord(200, []));
    if (u.pathname === '/admin/login-notify') return Promise.resolve(antwoord(200, { ok: true }));
    if (methode === 'GET' && u.pathname === '/mna/admin/kantoren') {
      const lu = srv.lijstUitkomst;
      if (lu === 'net') return Promise.reject(new TypeError('Failed to fetch'));
      if (lu === 'html') return Promise.resolve(antwoord(200, '<html>'));
      if (lu) return Promise.resolve(antwoord(lu, { error: lu === 401 ? 'Unauthorized' : 'D1_ERROR: SERVERTEKST lijst' }));
      // Bewust zonder sleutelcontrole: zo is te zien dat de knop zónder sleutel in de frontend al ontbreekt.
      return Promise.resolve(antwoord(200, srv.kantoren.filter((k) => k.status !== 'verwijderd')));
    }
    let m = VERWIJDER_RE.exec(u.pathname);
    if (m && methode === 'POST') {
      call.verwijder = true; call.id = decodeURIComponent(m[1]);
      if (call.key !== KEY) return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
      const uit = srv.uitkomst[call.id] || 'ok';
      if (uit === 'net') return Promise.reject(new TypeError('Failed to fetch'));
      if (uit === 'html') return Promise.resolve(antwoord(200, '<html>'));
      if (uit === 'okfalse') return Promise.resolve(antwoord(200, { ok: false, error: 'SERVERTEKST ok-false' }));
      if (uit === 401 || uit === 403) return Promise.resolve(antwoord(uit, { error: 'Unauthorized' }));
      if (uit === 500) return Promise.resolve(antwoord(500, { error: 'D1_ERROR: SERVERTEKST 500' }));
      if (uit === 409) return Promise.resolve(antwoord(409, { error: 'SERVERTEKST 409', code: 'kantoor_heeft_koppelingen', koppelingen: { leden: 2, crm_organisaties: 1, crm_opportunities: 0, crm_activiteiten: 0, koopmandaten: 0 } }));
      const k = srv.kantoren.find((x) => x.id === call.id);
      if (!k || uit === 404) return Promise.resolve(antwoord(404, { error: 'Kantoor niet gevonden' }));
      const al = k.status === 'verwijderd' || uit === 'al';
      k.status = 'verwijderd';
      return Promise.resolve(antwoord(200, { ok: true, id: k.id, status: 'verwijderd', al_verwijderd: al }));
    }
    m = DETAIL_RE.exec(u.pathname);
    if (m && methode === 'GET') {
      const k = srv.kantoren.find((x) => x.id === decodeURIComponent(m[1]));
      if (!k) return Promise.resolve(antwoord(404, { error: 'Kantoor niet gevonden' }));
      return Promise.resolve(antwoord(200, { kantoor: { id: k.id, naam: k.naam, status: k.status }, leden: [], modules: [], audit: [] }));
    }
    srv.onbekend.push(call);
    return Promise.resolve(antwoord(404, { error: 'Not found' }));
  };
  srv.posts = () => srv.calls.filter((c) => c.verwijder);
  srv.lijstGets = () => srv.calls.filter((c) => c.methode === 'GET' && c.pad === '/mna/admin/kantoren').length;
  return srv;
}

const settle = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setImmediate(r)); };

async function maakOmgeving(root) {
  const html = fs.readFileSync(path.join(root, 'marilyn.html'), 'utf8');
  const bodyStart = html.indexOf('<body>'), scriptStart = html.indexOf('<script>', bodyStart), scriptEind = html.lastIndexOf('</script>');
  if (bodyStart < 0 || scriptStart < 0 || scriptEind < scriptStart) throw new Error('marilyn.html: body/script niet gevonden');
  const doc = maakDocument(html.slice(bodyStart + 6, scriptStart));
  const srv = maakWorker();
  const st = { toasts: [], confirms: [], confirmAntwoord: true };
  const ctx = vm.createContext({
    document: doc, fetch: srv.fetch, location: { search: '' }, URLSearchParams, URL,
    confirm: (m) => { st.confirms.push(String(m)); return st.confirmAntwoord; },
    alert: () => {}, prompt: () => null, window: { open() {} }, navigator: { clipboard: { writeText: () => Promise.resolve() } },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, console,
  });
  vm.runInContext(html.slice(scriptStart + 8, scriptEind), ctx, { filename: 'marilyn.html' });
  ctx.toast = (msg, type) => { st.toasts.push({ msg: String(msg), type: type || 'ok' }); };
  doc.getElementById('ak').value = KEY;
  doc.getElementById('login-btn').click();
  await settle();
  const $ = (id) => doc.getElementById(id);
  const tab = async (id) => { $(id).click(); await settle(); };
  const open = async (id) => { doc.querySelectorAll('.btn-kantoor-open').find((b) => b.attrs['data-id'] === id).click(); await settle(); };
  const knoppen = () => doc.querySelectorAll('.btn-kantoor-verwijderen');
  const rijIds = () => doc.querySelectorAll('.btn-kantoor-open').map((b) => b.attrs['data-id']);
  const melding = () => { const m = doc.querySelector('.kantoor-verwijder-melding'); return m && m.style.display !== 'none' ? m.textContent : ''; };
  return { ctx, doc, srv, st, $, tab, open, knoppen, rijIds, melding, run: (code) => vm.runInContext(code, ctx) };
}

// Geen technische details in wat de beheerder te zien krijgt (statuscodes, servertekst, ID's).
const TECHNISCH = /\b[45]\d\d\b|Unauthorized|D1_ERROR|SERVERTEKST|SyntaxError|TypeError|Failed to fetch|Unexpected token|undefined|null|KTSYN|kt\/2/;

export async function draaiN123KantoorChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const omgevingen = [];
  const maak = async () => { const o = await maakOmgeving(root); omgevingen.push(o); await o.tab('t-kantoren'); return o; };
  const probeer = async (naam, fn) => {
    try { await fn(); }
    catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); }
  };
  const onverwacht = (e) => check(false, 'onverwachte asynchrone fout: ' + String((e && e.message) || e));
  process.on('unhandledRejection', onverwacht);
  try {

  // ── A. Succes: alleen het geopende kantoor, annuleren, dubbelklik, codering, verversen ──
  await probeer('succes', async () => {
    const o = await maak();
    const uitleg = (o.doc.querySelector('.kantoor-verwijder-uitleg') || { textContent: '' }).textContent;
    check(/Alleen een leeg kantoor kan worden verwijderd/.test(uitleg) && /niets verwijderd en ziet u hoeveel er nog aan hangt/.test(uitleg) && /Er wordt niets gewist/.test(uitleg) && /wijzigingshistorie blijven bewaard/.test(uitleg),
      'uitleg: zichtbare beheeruitleg over leeg kantoor, weigering bij koppelingen en behouden historie');
    check(o.rijIds().join(',') === 'KTSYN1,kt/2 b,KTSYN3' && o.knoppen().length === 0, 'lijst: drie kantoren, geen verwijderknop zolang geen kantoor is geopend');
    await o.open('kt/2 b');
    const knop = o.knoppen()[0];
    check(o.knoppen().length === 1 && knop && knop.attrs['data-id'] === 'kt/2 b' && /Kantoor verwijderen/.test(knop.textContent), 'geopend kantoor: precies één herkenbare knop "Kantoor verwijderen", voor het geopende kantoor');
    // Annuleren
    o.st.confirmAntwoord = false;
    knop.click();
    await settle();
    const vraag = o.st.confirms[0] || '';
    check(o.srv.posts().length === 0 && !knop.disabled && o.run('kantorenOpenId') === 'kt/2 b', 'annuleren: geen POST, knop bruikbaar, kantoor blijft geopend');
    check(/Kantoor "Synth Kantoor Twee" verwijderen\?/.test(vraag) && /Alleen een leeg kantoor/.test(vraag) && /Koppelingen en historie worden niet verwijderd/.test(vraag) && !TECHNISCH.test(vraag) && !/Synth Kantoor (Een|Drie)/.test(vraag),
      'bevestiging: noemt de kantoornaam, leeg-voorwaarde, behoud van historie en koppelingen; geen technisch ID of ander kantoor');
    // Bevestigen + dubbelklik
    o.st.confirmAntwoord = true;
    const getsVoor = o.srv.lijstGets();
    knop.click();
    const bezig = knop.disabled && /Verwijderen\.\.\./.test(knop.textContent);
    knop.click();
    await settle();
    const posts = o.srv.posts();
    check(bezig, 'tijdens verwijderen is de knop uitgeschakeld ("Verwijderen...")');
    check(o.st.confirms.length === 2 && posts.length === 1, 'dubbelklik: één bevestiging en precies één POST (' + posts.length + ')');
    check(posts[0] && posts[0].pad === '/mna/admin/kantoren/kt%2F2%20b/verwijderen' && posts[0].key === KEY && posts[0].body === undefined,
      'exact de bestaande route, padsegment met encodeURIComponent, x-admin-key, geen body');
    check(o.srv.kantoren.filter((k) => k.status === 'verwijderd').map((k) => k.id).join(',') === 'kt/2 b', 'alleen het geopende kantoor is verwijderd');
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'ok' && /Kantoor "Synth Kantoor Twee" is verwijderd\. De historie blijft bewaard\./.test(t.msg) && !TECHNISCH.test(t.msg), 'succes: gewone melding met kantoornaam, zonder technische details');
    check(o.srv.lijstGets() > getsVoor && o.run('kantorenOpenId') === null && o.rijIds().join(',') === 'KTSYN1,KTSYN3' && o.knoppen().length === 0,
      'na serverbevestigd succes: lijst herladen, detail gesloten, andere kantoren blijven staan');
    check(!o.srv.onbekend.length, 'geen enkel verzoek buiten de bestaande routes');
  });

  // ── B. 409 gekoppeld kantoor: niets gewijzigd, open detail en knop blijven, opsomming zonder servertekst ──
  await probeer('409', async () => {
    const o = await maak();
    await o.open('KTSYN3');
    o.srv.uitkomst.KTSYN3 = 409;
    const getsVoor = o.srv.lijstGets();
    const knop = o.knoppen()[0];
    knop.click();
    await settle();
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'err' && /Kantoor "Synth Kantoor Drie" is niet verwijderd: er hangt nog aan: 2 leden en 1 CRM-organisatie\./.test(t.msg) && /alleen een leeg kantoor kan worden verwijderd/.test(t.msg) && /Er is niets gewijzigd/.test(t.msg) && !TECHNISCH.test(t.msg),
      '409: gekoppeld kantoor gemeld met aantallen per soort, zonder servertekst of statuscode');
    check(o.melding() === t.msg, '409: dezelfde melding blijft zichtbaar bij het kantoor');
    check(o.srv.posts().length === 1 && o.srv.lijstGets() === getsVoor && o.run('kantorenOpenId') === 'KTSYN3' && !knop.disabled && knop.textContent === 'Kantoor verwijderen' && o.srv.kantoren.every((k) => k.status === 'actief'),
      '409: geen herhaling, geen herladen, detail blijft open, knop hersteld, niets verwijderd');
  });

  // ── C. Overige fouten: nooit vals succes, geen herhaling, geen herladen, knop hersteld ──
  const FOUTEN = [
    [500, /tijdelijke storing aan de serverkant\. Er is niets gewijzigd/, 'HTTP 500'],
    ['net', /geen verbinding met de server\. Het verwijderen is niet bevestigd/, 'netwerkfout'],
    ['html', /de server heeft het verwijderen niet bevestigd/, 'onjuiste JSON (HTTP 200)'],
    ['okfalse', /de server heeft het verwijderen niet bevestigd/, 'ok:false (HTTP 200)'],
    [401, /geen toegang\. Log opnieuw in met de beheerderssleutel/, 'HTTP 401'],
    [403, /geen toegang\. Log opnieuw in met de beheerderssleutel/, 'HTTP 403'],
    [404, /het kantoor is niet meer gevonden/, 'HTTP 404'],
  ];
  for (const [uit, re, label] of FOUTEN) {
    await probeer(label, async () => {
      const o = await maak();
      await o.open('KTSYN1');
      o.srv.uitkomst.KTSYN1 = uit;
      const getsVoor = o.srv.lijstGets();
      const knop = o.knoppen()[0];
      knop.click();
      await settle();
      const t = o.st.toasts.at(-1) || { msg: '', type: '' };
      check(t.type === 'err' && /^Kantoor "Synth Kantoor Een" is niet verwijderd: /.test(t.msg) && re.test(t.msg) && !TECHNISCH.test(t.msg) && !o.st.toasts.some((x) => x.type === 'ok'),
        label + ': gewone foutmelding, geen vals succes, geen technische details');
      check(o.srv.posts().length === 1 && o.srv.lijstGets() === getsVoor && o.run('kantorenOpenId') === 'KTSYN1' && !knop.disabled && knop.textContent === 'Kantoor verwijderen' && o.rijIds().includes('KTSYN1'),
        label + ': één poging zonder automatische herhaling, geen herladen, detail open, knop weer bruikbaar');
    });
  }

  // ── D. Herhaling op een al verwijderd kantoor (idempotent 200) ──
  await probeer('al verwijderd', async () => {
    const o = await maak();
    await o.open('KTSYN1');
    o.srv.uitkomst.KTSYN1 = 'al';
    o.knoppen()[0].click();
    await settle();
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'ok' && /Kantoor "Synth Kantoor Een" was al verwijderd\./.test(t.msg) && o.run('kantorenOpenId') === null && !o.rijIds().includes('KTSYN1'), 'al verwijderd: gewone melding, lijst herladen en detail gesloten');
  });

  // ── E. Laadfouten van de kantorenlijst: begrijpelijk, geen technische details, geen lege lijst ──
  const LIJSTFOUTEN = [
    [401, /geen toegang\. Log opnieuw in/, 'lijst HTTP 401'],
    [500, /tijdelijke storing aan de serverkant/, 'lijst HTTP 500'],
    ['html', /tijdelijke storing aan de serverkant/, 'lijst onjuiste JSON'],
    ['net', /geen verbinding met de server/, 'lijst netwerkfout'],
  ];
  for (const [uit, re, label] of LIJSTFOUTEN) {
    await probeer(label, async () => {
      const o = await maak();
      o.srv.lijstUitkomst = uit;
      await o.tab('t-kantoren');
      const tekst = o.$('tc').textContent;
      check(/^De kantoren konden niet worden geladen/.test(tekst) && re.test(tekst) && !TECHNISCH.test(tekst) && !/Kantoren \(|Nog geen kantoren|Fout bij laden/.test(tekst) && o.knoppen().length === 0,
        label + ': begrijpelijke melding, geen lege lijst of technische details');
    });
  }

  // ── F. Rol: zonder superadmin of beheerderssleutel geen tab, geen knop en geen actie ──
  await probeer('rol', async () => {
    const o = await maak();
    o.run('isSuperAdmin=false; renderDashboard();');
    check(!o.$('t-kantoren'), 'rol: zonder superadmin geen Kantoren-tab');
    await o.run("verwijderKantoor({id:'KTSYN1',naam:'Synth Kantoor Een'},{disabled:false,textContent:''},document.getElementById('tc'))");
    check(o.srv.posts().length === 0 && o.st.confirms.length === 0, 'rol: zonder superadmin vraagt en verstuurt de actie niets');
    o.run("isSuperAdmin=true; adminKey=''; kantorenOpenId='KTSYN1';");
    await o.run("renderKantorenTab(document.getElementById('tc'))");
    await settle();
    check(o.knoppen().length === 0, 'rol: zonder beheerderssleutel geen verwijderknop');
    await o.run("verwijderKantoor({id:'KTSYN1',naam:'Synth Kantoor Een'},{disabled:false,textContent:''},document.getElementById('tc'))");
    check(o.srv.posts().length === 0 && o.st.confirms.length === 0, 'rol: zonder beheerderssleutel vraagt en verstuurt de actie niets');
  });

  // ── G. Documentatie beschrijft het feitelijke gedrag ──
  await probeer('docs', async () => {
    const readme = fs.readFileSync(path.join(root, 'tests/README.md'), 'utf8');
    const s = readme.indexOf('## Deel E'), e = readme.indexOf('\n## ', s + 1);
    const sectie = s >= 0 ? readme.slice(s, e > s ? e : undefined) : '';
    check(/n123-kantoor-ui\.mjs/.test(sectie) && /POST \/mna\/admin\/kantoren\/\{id\}\/verwijderen/.test(sectie) && /status `verwijderd`/.test(sectie) && /historie/i.test(sectie) && /409/.test(sectie) && /niets verwijderd/.test(sectie),
      'tests/README.md: sectie N-123 beschrijft route, logisch verwijderen met behouden historie en weigering van een gekoppeld kantoor');
    check(sectie && !/\b(gepland|binnenkort|later toe|komt nog|roadmap)\b/i.test(sectie), 'tests/README.md: N-123-sectie noemt geen geplande mogelijkheden');
    check(!/kantoren hebben in\s+Marilyn geen verwijderactie/.test(readme.replace(/\s+/g, ' ')), 'tests/README.md: oude bewering "kantoren hebben geen verwijderactie" is bijgewerkt');
  });

  await settle();
  const handlerFouten = omgevingen.flatMap((o) => o.doc.fouten || []);
  check(!handlerFouten.length, 'geen enkele klik-handler faalde asynchroon' + (handlerFouten.length ? ': ' + handlerFouten.map((e) => String((e && e.message) || e)).join(' | ') : ''));
  } finally {
    process.off('unhandledRejection', onverwacht);
  }
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiN123KantoorChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' N-123-checks gefaald.' : '\nAlle ' + res.length + ' N-123-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
