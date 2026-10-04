#!/usr/bin/env node
// N-122/N-124 (4 okt 2026) — in Marilyn door de beheerder gekozen records in één actie verwijderen.
// Leads, proefaanvragen en koopmandaten kregen selectievakjes + "Verwijder geselecteerde (n)"; de
// bestaande groepsacties (scans, terugbelverzoeken, trajecten, documenten, scan-rapporten) slikken
// mislukte verwijderingen niet langer. Alles loopt via de gedeelde helper verwijderGekozen() en per
// record via de bestaande individuele delete-route.
//
// Deze test laadt het ECHTE script uit marilyn.html in node:vm met een minimale DOM-fixture en een
// gecontroleerde nep-worker — geen netwerk, geen browser, geen node_modules. Hij logt echt in via
// doLogin(), klikt tabs, vinkt vakjes aan en klikt knoppen; de nep-worker houdt bij welke POST's er
// binnenkomen en geeft per record ok/403/404/500/netwerkfout terug. Alle gegevens zijn synthetisch;
// er wordt nooit een echte omgeving aangeroepen.
//
// Gebruik: node tests/n122-marilyn-verwijderen.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 21).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const KEY = 'SYNTH-ADMIN-KEY-N122';

// ── Minimale DOM-fixture ─────────────────────────────────────────────────────
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', euro: '€', times: '×' };
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
  // Zoals een browser: een uitgeschakelde knop/vakje reageert niet; een vakje wisselt en vuurt change.
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

// ── Gecontroleerde nep-worker ────────────────────────────────────────────────
function basisData() {
  return {
    scans: [{ id: 'sc1', office_name: 'Synth Scan Een', created_at: 1 }, { id: 'sc2', office_name: 'Synth Scan Twee', created_at: 2 }, { id: 'sc3', office_name: 'Synth Scan Drie', created_at: 3 }],
    callbacks: [{ id: 'cb1', naam: 'Synth Bel Een' }, { id: 'cb2', naam: 'Synth Bel Twee' }],
    mna: [
      { id: 'MSYN01', kantoor_naam: 'Synth Traject Vrij', status: 'actief' },
      { id: 'MSYN02', kantoor_naam: 'Synth Traject Vergrendeld', status: 'vergrendeld' },
      { kantoor_naam: 'Extern kantoor', status: 'actief', inhoud_afgeschermd: true },
      { id: 'MSYN03', kantoor_naam: 'Synth Traject Twee', status: 'actief' },
    ],
    rapporten: [{ id: 'rp1', kantoor_naam: 'Synth Rapport Een' }, { id: 'rp2', kantoor_naam: 'Synth Rapport Twee' }],
    leads: [
      { id: 'ld/7 x', kantoor_naam: 'Synth Lead Een', status: 'nieuw' },
      { id: 'ld2', kantoor_naam: 'Synth Lead Twee', status: 'nieuw' },
      { id: 'ld3', kantoor_naam: 'Synth Lead Drie', status: 'omgezet', traject_id: 'MSYN01' },
    ],
    proef: [
      { id: 'pf1', organisatie: 'Synth Proef Een', email: 'een@voorbeeld.invalid', status: 'open' },
      { id: 'pf2', organisatie: 'Synth Proef Twee', email: 'twee@voorbeeld.invalid', status: 'goedgekeurd', gebruiker_id: 'GEBSYNTH42' },
      { id: 'pf3', organisatie: 'Synth Proef Drie', status: 'afgewezen' },
    ],
    km: [
      { id: 'km_a', koper_naam: 'Synth Koper A', tussen_code: 'TKMA01', koper_code: 'KKMA01', target_count: 3, status: 'actief' },
      { id: 'km_b', koper_naam: 'Synth Koper B', tussen_code: 'TKMB/02', koper_code: 'KKMB02', target_count: 0, status: 'actief' },
      { id: 'km_x', extern: true, gebruiker_id: 'GEBEXT9', status: 'actief', target_count: 1 },
    ],
    docs: [
      { id: 'd1', traject_id: 'MSYN01', bestand_naam: 'synth-alpha.pdf' },
      { id: 'd2', traject_id: 'MSYN01', bestand_naam: 'synth-beta.pdf' },
      { id: 'd3', traject_id: 'MSYN03', bestand_naam: 'synth-gamma.pdf', vergrendeld: 1 },
    ],
  };
}
// Bestaande individuele delete-routes (exact zoals in de backend) → lijst + sleutelveld.
const DELETE_ROUTES = [
  ['scans', /^\/admin\/delete\/scan\/([^/]+)$/, 'id'],
  ['callbacks', /^\/admin\/delete\/callback\/([^/]+)$/, 'id'],
  ['mna', /^\/admin\/delete\/mna\/([^/]+)$/, 'id'],
  ['rapporten', /^\/admin\/delete\/rapport\/([^/]+)$/, 'id'],
  ['leads', /^\/admin\/delete\/lead\/([^/]+)$/, 'id'],
  ['proef', /^\/adviseur\/proef\/aanvraag\/([^/]+)\/verwijderen$/, 'id'],
  ['km', /^\/mna\/admin\/koopmandaat\/verwijderen\/([^/]+)$/, 'tussen_code'],
  ['docs', /^\/mna\/document\/delete\/([^/]+)$/, 'id'],
];
const LIJSTEN = {
  '/admin/scans': (d) => d.scans, '/admin/callbacks': (d) => d.callbacks, '/mna/admin/lijst': (d) => d.mna,
  '/admin/rapporten': (d) => d.rapporten, '/admin/leads': (d) => d.leads, '/adviseur/proef/aanvragen': (d) => d.proef,
  '/mna/admin/koopmandaten': (d) => ({ ok: true, mandaten: d.km }), '/mna/admin/documenten': (d) => d.docs,
};
const antwoord = (status, body) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) });

function maakWorker() {
  const srv = { data: basisData(), uitkomst: {}, lijstenNetwerkfout: false, calls: [], onbekend: [] };
  srv.fetch = (url, opts = {}) => {
    const u = new URL(String(url));
    const methode = (opts.method || 'GET').toUpperCase();
    const headers = opts.headers || {};
    const call = { pad: u.pathname, methode, key: headers['x-admin-key'] };
    srv.calls.push(call);
    if (methode === 'GET' && LIJSTEN[u.pathname]) {
      if (srv.lijstenNetwerkfout) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(antwoord(200, LIJSTEN[u.pathname](srv.data)));
    }
    if (u.pathname === '/admin/login-notify') return Promise.resolve(antwoord(200, { ok: true }));
    for (const [lijst, re, veld] of DELETE_ROUTES) {
      const m = re.exec(u.pathname);
      if (!m || methode !== 'POST') continue;
      call.lijst = lijst; call.id = decodeURIComponent(m[1]);
      if (call.key !== KEY) return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
      const uit = srv.uitkomst[call.id] || 'ok';
      if (uit === 'net') return Promise.reject(new TypeError('Failed to fetch'));
      if (uit === 403) return Promise.resolve(antwoord(403, { error: 'Unauthorized' }));
      if (uit === 500) return Promise.resolve(antwoord(500, { error: 'D1_ERROR: synthetische serverfout' }));
      const i = srv.data[lijst].findIndex((r) => String(r[veld]) === call.id);
      if (i < 0 || uit === 404) return Promise.resolve(antwoord(404, { error: 'Niet gevonden' }));
      srv.data[lijst].splice(i, 1);
      return Promise.resolve(antwoord(200, { ok: true }));
    }
    srv.onbekend.push(call);
    return Promise.resolve(antwoord(404, { error: 'Not found' }));
  };
  // Alleen verwijder-POST's (de login-melding telt niet mee).
  srv.posts = (lijst) => srv.calls.filter((c) => c.methode === 'POST' && c.lijst && (!lijst || c.lijst === lijst));
  srv.gets = (pad) => srv.calls.filter((c) => c.methode === 'GET' && c.pad === pad).length;
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
  // Echte login met de (synthetische) beheerderssleutel.
  doc.getElementById('ak').value = KEY;
  doc.getElementById('login-btn').click();
  await settle();
  const $ = (id) => doc.getElementById(id);
  const tab = async (id) => { $(id).click(); await settle(); };
  const vakjes = (cls) => doc.querySelectorAll('.' + cls);
  const vakje = (cls, attr, waarde) => vakjes(cls).find((cb) => cb.attrs[attr] === waarde);
  return { ctx, doc, srv, st, $, tab, vakjes, vakje, run: (code) => vm.runInContext(code, ctx) };
}

// Geen technische details in wat de beheerder te zien krijgt.
const TECHNISCH = /\b[45]\d\d\b|Unauthorized|D1_ERROR|TypeError|Failed to fetch|undefined|null|GEBSYNTH42|GEBEXT9/;

export async function draaiN122VerwijderChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const omgevingen = [];
  const maak = async () => { const o = await maakOmgeving(root); omgevingen.push(o); return o; };
  const probeer = async (naam, fn) => {
    try { await fn(); }
    catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); }
  };
  const onverwacht = (e) => check(false, 'onverwachte asynchrone fout: ' + String((e && e.message) || e));
  process.on('unhandledRejection', onverwacht);
  try {

  // ── A. Leads: selectie, annuleren, 2 gekozen vs. niet-gekozen behouden, dubbelklik, verversen ──
  await probeer('leads', async () => {
    const o = await maak();
    check(o.run('isSuperAdmin') === true && o.$('t-leads') && o.$('t-proef'), 'login: superadmin-sessie via de echte doLogin(), Leads- en Proefaanvragen-tab zichtbaar');
    await o.tab('t-leads');
    const knop = o.$('btn-del-sel-ld');
    check(o.vakjes('ld-cb').length === 3 && knop && knop.style.display === 'none', 'leads: een vakje per lead, groepsknop verborgen zolang niets is aangevinkt');
    check(/Verwijder geselecteerde/.test(o.$('tc').textContent) && /traject dat al vanuit een lead is gestart blijft bestaan/.test(o.$('tc').textContent), 'leads: korte zichtbare instructie over selecteren en wat blijft bestaan');
    o.vakje('ld-cb', 'data-id', 'ld/7 x').click();
    o.vakje('ld-cb', 'data-id', 'ld3').click();
    check(knop.style.display === 'inline-block' && o.$('sel-cnt-ld').textContent === '2', 'leads: na 2 vinkjes toont de knop "Verwijder geselecteerde (2)"');
    // Annuleren: niets verstuurd, niets uitgeschakeld, selectie blijft staan.
    o.st.confirmAntwoord = false;
    knop.click();
    await settle();
    const vraag = o.st.confirms[0] || '';
    check(o.srv.posts().length === 0 && !knop.disabled && o.vakje('ld-cb', 'data-id', 'ld3').checked, 'leads: annuleren verstuurt niets en laat knop en selectie intact');
    check(/2 aangevinkte leads/.test(vraag) && /Synth Lead Een/.test(vraag) && /Synth Lead Drie/.test(vraag) && !/Synth Lead Twee/.test(vraag)
      && /traject dat al vanuit een lead is gestart, blijft bestaan/.test(vraag) && /Alleen wat u heeft aangevinkt/.test(vraag), 'leads: bevestiging noemt aantal, de gekozen namen en wat blijft bestaan — niet de niet-gekozen lead');
    // Bevestigen + dubbelklik.
    o.st.confirmAntwoord = true;
    const getsVoor = o.srv.gets('/admin/leads');
    knop.click();
    const uitgeschakeld = knop.disabled && /Verwijderen\.\.\./.test(knop.textContent);
    knop.click();
    await settle();
    const posts = o.srv.posts('leads');
    check(uitgeschakeld, 'leads: tijdens verwijderen is de knop uitgeschakeld ("Verwijderen...")');
    check(o.st.confirms.length === 2 && posts.length === 2, 'leads: dubbelklik geeft één bevestiging en precies één POST per gekozen lead (' + posts.length + ')');
    check(posts.map((p) => p.pad).sort().join(',') === '/admin/delete/lead/ld%2F7%20x,/admin/delete/lead/ld3' && posts.every((p) => p.key === KEY),
      'leads: bestaande individuele route, padsegment gecodeerd, met beheerderssleutel');
    check(o.srv.gets('/admin/leads') > getsVoor && o.vakjes('ld-cb').map((c) => c.attrs['data-id']).join(',') === 'ld2', 'leads: na afloop ververst; alleen de niet-gekozen lead staat er nog');
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'ok' && /Alle 2 aangevinkte leads zijn verwijderd/.test(t.msg) && !TECHNISCH.test(t.msg), 'leads: gewone succesmelding zonder technische details');
    check(o.$('btn-del-sel-ld').style.display === 'none', 'leads: na verversen is er geen restselectie');
    // Losse prullenbak gebruikt dezelfde helper en dezelfde route.
    o.st.confirms.length = 0;
    o.doc.querySelector('.btn-del-lead').click();
    await settle();
    check(/^Deze lead definitief verwijderen\?/.test(o.st.confirms[0] || '') && o.srv.posts('leads').at(-1).pad === '/admin/delete/lead/ld2' && o.vakjes('ld-cb').length === 0,
      'leads: losse prullenbak vraagt in dezelfde taal en gebruikt dezelfde route');
    check(!o.srv.onbekend.length, 'leads: geen enkel verzoek buiten de bestaande routes');
  });

  // ── B. Proefaanvragen: deels 403, gekoppeld account blijft (zonder technisch ID) ──
  await probeer('proefaanvragen', async () => {
    const o = await maak();
    await o.tab('t-proef');
    check(o.vakjes('pf-cb').length === 3, 'proef: een vakje per aanvraag');
    check(/Een proefaccount dat al is aangemaakt blijft bestaan/.test(o.$('tc').textContent), 'proef: zichtbare instructie dat een al aangemaakt proefaccount blijft bestaan');
    o.vakje('pf-cb', 'data-id', 'pf1').click();
    o.vakje('pf-cb', 'data-id', 'pf2').click();
    o.srv.uitkomst.pf2 = 403;
    o.$('btn-del-sel-pf').click();
    await settle();
    const vraag = o.st.confirms[0] || '';
    check(/Voor 1 van deze aanvragen is al een proefaccount aangemaakt/.test(vraag) && /het proefaccount blijft bestaan/.test(vraag) && !TECHNISCH.test(vraag),
      'proef: bevestiging legt uit dat het proefaccount blijft bestaan, zonder gebruikers-ID');
    const posts = o.srv.posts('proef');
    check(posts.map((p) => p.pad).sort().join(',') === '/adviseur/proef/aanvraag/pf1/verwijderen,/adviseur/proef/aanvraag/pf2/verwijderen', 'proef: precies de 2 gekozen aanvragen via de bestaande route');
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'warn' && /1 van 2 proefaanvragen verwijderd, 1 niet/.test(t.msg) && /geen toegang/.test(t.msg) && !TECHNISCH.test(t.msg), 'proef: HTTP 403 wordt gemeld als "geen toegang" (gedeeltelijk gelukt), zonder statuscode');
    check(o.vakjes('pf-cb').map((c) => c.attrs['data-id']).sort().join(',') === 'pf2,pf3', 'proef: na verversen staat de mislukte en de niet-gekozen aanvraag er nog');
    o.st.confirms.length = 0;
    o.st.confirmAntwoord = false;
    o.doc.querySelectorAll('.pf-verwijderen').find((b) => b.attrs['data-id'] === 'pf2').click();
    await settle();
    check(/^Deze proefaanvraag definitief verwijderen\?/.test(o.st.confirms[0] || '') && /Voor deze aanvraag is al een proefaccount aangemaakt/.test(o.st.confirms[0] || '') && !TECHNISCH.test(o.st.confirms[0] || '') && o.srv.posts('proef').length === 2,
      'proef: losse knop gebruikt dezelfde uitleg zonder gebruikers-ID; annuleren verstuurt niets');
  });

  // ── C. HTTP 500 én mislukt verversen: geen herhaling, knop hersteld ──
  await probeer('500 + herstel', async () => {
    const o = await maak();
    await o.tab('t-leads');
    o.vakje('ld-cb', 'data-id', 'ld2').click();
    o.srv.uitkomst.ld2 = 500;
    o.srv.lijstenNetwerkfout = true;
    const knop = o.$('btn-del-sel-ld');
    knop.click();
    await settle();
    const fout = o.st.toasts.find((t) => /niet verwijderd/.test(t.msg)) || { msg: '' };
    check(fout.type === 'err' && /De lead is niet verwijderd: tijdelijke storing aan de serverkant/.test(fout.msg) && !TECHNISCH.test(fout.msg), 'HTTP 500: gewone foutmelding, geen serverfouttekst');
    check(o.srv.posts('leads').length === 1, 'HTTP 500: geen automatische herhaling van de verwijdering');
    check(o.st.toasts.some((t) => /Kon niet verversen/.test(t.msg)), 'mislukt verversen wordt apart gemeld');
    check(o.$('btn-del-sel-ld') === knop && !knop.disabled && /Verwijder geselecteerde \(1\)/.test(knop.textContent), 'na de fout is de knop weer bruikbaar met de oorspronkelijke tekst');
  });

  // ── D. Bestaande groepsacties slikken fouten niet meer: netwerkfout (terugbel) en 500 (scans) ──
  await probeer('bestaande groepsacties', async () => {
    const o = await maak();
    await o.tab('t-cb');
    o.vakjes('cb-cb').forEach((cb) => cb.click());
    o.srv.uitkomst.cb1 = 'net';
    o.$('btn-del-sel-cb').click();
    await settle();
    let t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'warn' && /1 van 2 terugbelverzoeken verwijderd, 1 niet/.test(t.msg) && /geen verbinding/.test(t.msg) && !TECHNISCH.test(t.msg), 'terugbelverzoeken: netwerkfout wordt gemeld in plaats van stil verdwenen');
    check(o.srv.posts('callbacks').length === 2 && o.vakjes('cb-cb').map((c) => c.attrs['data-id']).join(',') === 'cb1', 'terugbelverzoeken: één poging per record, na verversen staat de mislukte er nog');
    await o.tab('t-scans');
    o.vakje('scan-cb', 'data-id', 'sc1').click();
    o.vakje('scan-cb', 'data-id', 'sc2').click();
    o.srv.uitkomst.sc2 = 500;
    o.$('btn-del-sel-scans').click();
    await settle();
    t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'warn' && /1 van 2 scans verwijderd, 1 niet/.test(t.msg) && /storing/.test(t.msg), 'scans: HTTP 500 wordt gemeld in plaats van geslikt');
    check(o.vakjes('scan-cb').map((c) => c.attrs['data-id']).sort().join(',') === 'sc2,sc3', 'scans: mislukte en niet-gekozen scan blijven staan');
    await o.tab('t-rapp');
    o.vakjes('rapp-cb').forEach((cb) => cb.click());
    const zoek = o.$('rapp-search');
    zoek.value = 'twee';
    zoek.dispatch('input');
    check(!o.vakje('rapp-cb', 'data-id', 'rp1').checked && o.$('sel-cnt-rapp').textContent === '1', 'scan-rapporten: wat door de zoekterm verborgen wordt, gaat uit de selectie');
    o.$('btn-del-sel-rapp').click();
    await settle();
    check(o.srv.posts('rapporten').map((p) => p.pad).join(',') === '/admin/delete/rapport/rp2', 'scan-rapporten: alleen het zichtbare, aangevinkte rapport wordt verwijderd');
    check(!o.srv.onbekend.length, 'bestaande groepsacties: geen enkel verzoek buiten de bestaande routes');
  });

  // ── E. Trajecten en koopmandaten: vergrendeld/afgeschermd uitgesloten, cascade-uitleg ──
  await probeer('trajecten/koopmandaten', async () => {
    const o = await maak();
    await o.tab('t-mna');
    const alle = o.$('cb-all-mna');
    alle.click();
    const gekozen = o.vakjes('mna-cb').filter((c) => c.checked).map((c) => c.attrs['data-id']).sort().join(',');
    check(gekozen === 'MSYN01,MSYN03' && o.vakje('mna-cb', 'data-id', 'MSYN02').disabled && o.vakjes('mna-cb').length === 3, 'trajecten: "alles" vinkt vergrendelde en afgeschermde externe trajecten niet aan');
    o.srv.uitkomst.MSYN03 = 403;
    o.$('btn-del-sel-mna').click();
    await settle();
    check(o.srv.posts('mna').map((p) => p.pad).sort().join(',') === '/admin/delete/mna/MSYN01,/admin/delete/mna/MSYN03', 'trajecten: alleen de gekozen, niet-vergrendelde trajecten via de bestaande route');
    let t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'warn' && /1 van 2 trajecten verwijderd, 1 niet/.test(t.msg) && /geen toegang/.test(t.msg), 'trajecten: geweigerd traject wordt gemeld in plaats van geslikt');
    check(o.vakjes('mna-cb').map((c) => c.attrs['data-id']).sort().join(',') === 'MSYN02,MSYN03', 'trajecten: na verversen staan vergrendeld en geweigerd traject er nog');

    // Koopmandaten (sectie onder de trajecten).
    check(o.vakjes('km-cb').length === 2 && o.doc.querySelectorAll('.btn-del-km').length === 2, 'koopmandaten: afgeschermd extern koopmandaat heeft geen vakje en geen verwijderknop');
    check(/Per koopmandaat worden ook alle bijbehorende targets verwijderd/.test(o.$('tc').textContent), 'koopmandaten: zichtbare instructie over targets en behouden trajecten');
    o.st.confirms.length = 0;
    o.$('cb-all-km').click();
    check(o.$('sel-cnt-km').textContent === '2', 'koopmandaten: "alles" vinkt alleen de 2 eigen koopmandaten aan');
    const getsVoor = o.srv.gets('/mna/admin/koopmandaten');
    o.$('btn-del-sel-km').click();
    await settle();
    const vraag = o.st.confirms[0] || '';
    check(/2 aangevinkte koopmandaten/.test(vraag) && /alle bijbehorende targets verwijderd/.test(vraag) && /traject dat al vanuit een koopmandaat is gestart blijft bestaan/.test(vraag) && !TECHNISCH.test(vraag),
      'koopmandaten: bevestiging noemt de targets-cascade en dat gestarte trajecten blijven bestaan');
    check(o.srv.posts('km').map((p) => p.pad).sort().join(',') === '/mna/admin/koopmandaat/verwijderen/TKMA01,/mna/admin/koopmandaat/verwijderen/TKMB%2F02', 'koopmandaten: bestaande route per gekozen koopmandaat, padsegment gecodeerd');
    t = o.st.toasts.at(-1) || { msg: '' };
    check(t.type === 'ok' && /Alle 2 aangevinkte koopmandaten zijn verwijderd/.test(t.msg) && o.srv.gets('/mna/admin/koopmandaten') > getsVoor && o.vakjes('km-cb').length === 0 && o.srv.data.km.length === 1,
      'koopmandaten: succes gemeld, lijst ververst, alleen het afgeschermde koopmandaat blijft');
  });

  // ── F. Documenten: vergrendeld uitgesloten, 404 gemeld ──
  await probeer('documenten', async () => {
    const o = await maak();
    await o.tab('t-docs');
    o.$('btn-load-docs').click();
    await settle();
    o.$('cb-all').click();
    check(o.vakjes('doc-cb').filter((c) => c.checked).map((c) => c.attrs['data-id']).join(',') === 'd1,d2', 'documenten: "alles" vinkt het vergrendelde document niet aan');
    o.srv.uitkomst.d2 = 404;
    o.$('btn-del-selected').click();
    await settle();
    const t = o.st.toasts.at(-1) || { msg: '' };
    check(o.srv.posts('docs').length === 2 && t.type === 'warn' && /1 van 2 documenten verwijderd, 1 niet/.test(t.msg) && /niet meer gevonden/.test(t.msg), 'documenten: deels mislukt gemeld als waarschuwing, niet langer altijd als fout');
  });

  // ── G. Rol: zonder superadmin geen tabbladen en de helper verstuurt niets ──
  await probeer('rol', async () => {
    const o = await maak();
    o.run('isSuperAdmin=false; renderDashboard();');
    check(!o.$('t-leads') && !o.$('t-proef'), 'rol: zonder superadmin geen Leads- en Proefaanvragen-tab');
    await o.run("verwijderGekozen({ids:['ld2'],pad:function(id){return '/admin/delete/lead/'+encodeURIComponent(id);},een:'lead',meer:'leads',ververs:function(){}})");
    check(o.srv.posts().length === 0 && o.st.confirms.length === 0, 'rol: zonder superadmin vraagt en verstuurt de helper niets');
    o.run("isSuperAdmin=true; adminKey='';");
    await o.run("verwijderGekozen({ids:['ld2'],pad:function(id){return '/admin/delete/lead/'+encodeURIComponent(id);},een:'lead',meer:'leads',ververs:function(){}})");
    check(o.srv.posts().length === 0, 'rol: zonder beheerderssleutel verstuurt de helper niets');
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
  const res = await draaiN122VerwijderChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' N-122-checks gefaald.' : '\nAlle ' + res.length + ' N-122-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
