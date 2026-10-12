#!/usr/bin/env node
// Productpunt 22 (10 okt 2026) — Marilyn Veiligheid-tab: de overkoepelende "Veiligheid actueel"-status
// telt de nachtelijke selfcheck en de ochtendcontrole echt mee. Vóór deze fix negeerde verlopenControles
// beide dagelijkse controles en gold een ochtendcontrole van 0/0 als groen (alleen tellervergelijking).
//
// Deze test laadt het ECHTE script uit marilyn.html in node:vm met een minimale DOM-fixture en een
// gecontroleerde nep-worker (zelfde werkwijze als tests/n122-marilyn-verwijderen.mjs) — geen netwerk,
// geen browser, geen node_modules. Hij logt echt in via doLogin(), opent de Veiligheid-tab, rendert elke
// sectie en klikt elke aanwezige actieknop (selfcheck, ochtendcontrole, diepe audit, red-team pentest,
// rapportlink + nieuwe link, markeer opgelost) tegen synthetische serverantwoorden: succes, 401, 403,
// 500, netwerkfout, onjuiste JSON, ok:false. Alle gegevens zijn synthetisch; er wordt nooit een echte
// omgeving, betaalde AI, audit, mail of deploy aangeroepen.
//
// Productpunt 23 (12 okt 2026): een mislukte bevindingenlijst (401/403/500, onjuiste JSON, ok/array
// ongeldig) bij een geldig overzicht is nooit groen of "geen bevindingen"; "Recent gefixt / afgehandeld"
// sorteert op een geldige opgelost_op vóór de 15-limiet, toont een ontbrekende datum als "onbekend" en
// een onbekende status nooit als bewust uitgesteld of groen (sectie H).
//
// Productpunt 20 (12 okt 2026): het kopendepartijlabel in "Nieuw traject" (statisch en per trajecttype)
// toont alleen "(optioneel)", zonder "vaak nog niet bekend bij aanmaken"; validatie ongewijzigd (sectie I).
//
// Dit is UI-functioneel bewijs, GEEN bewijs dat de echte nachtelijke selfcheck of ochtendcontrole
// draait — zie docs/marilyn-veiligheid.md.
//
// Gebruik: node tests/marilyn-veiligheid.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 31).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const KEY = 'SYNTH-ADMIN-KEY-PP22';

// ── Minimale DOM-fixture (zelfde als tests/n122-marilyn-verwijderen.mjs; plus zelfsluitende svg-tags) ──
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', euro: '€', times: '×' };
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
      if (r && typeof r.then === 'function') r.then(null, (e) => { (this.ownerDocument.fouten = this.ownerDocument.fouten || []).push(e); });
    });
  }
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
      delete attrs['/'];
      const el = new El(root.ownerDocument, m[2], attrs);
      cur.appendChild(el);
      if (!VOID.has(el.tag) && !m[0].endsWith('/>')) cur = el;
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

// ── Synthetische overzicht-antwoorden in de vorm van backend/worker/24-veiligheidsdashboard.js ──
const UUR = 60 * 60 * 1000, DAG = 24 * UUR;
// Eén run zoals naarLaag() hem teruggeeft: teller = details.length, geslaagd = aantal geslaagde details.
function synthRun(totaal, geslaagd = totaal, leeftijd = UUR) {
  const details = Array.from({ length: totaal }, (_, i) => ({ code: 'SYN' + (i + 1), omschrijving: 'Synthetische check ' + (i + 1), geslaagd: i < geslaagd }));
  return { ran_at: Date.now() - leeftijd, checks_totaal: totaal, checks_geslaagd: geslaagd, details };
}
function groenOverzicht() {
  return {
    ok: true, open_totaal: 0, open_kritiek_hoog: 0, open_per_ernst: {}, gefixt_totaal: 2, bewust_uitgesteld_totaal: 0,
    laatste_selfcheck: synthRun(4), selfcheck_trend: [], laatste_ochtendcontrole: synthRun(3),
    statische_audit: { frontend: synthRun(5, 5, 20 * DAG), backend: { ran_at: Date.now() - 9 * DAG, checks_totaal: 0, checks_geslaagd: 0, details: [] } },
    diepe_audit: { datum: Date.now() - 5 * DAG, score: 88, bron: 'Synthetische audit', samenvatting: 'Synthetisch', dagen_geleden: 5, verouderd: false },
    red_team_pentest: { datum: Date.now() - 6 * DAG, score: 90, bron: 'Synthetische pentest', samenvatting: 'Synthetisch', dagen_geleden: 6, verouderd: false },
    knoppentest: { datum: Date.now() - UUR, score: 95, bron: 'Synthetische knoppentest', samenvatting: 'Synthetisch', dagen_geleden: 0, verouderd: false },
    e2e_regressie: { ran_at: Date.now() - UUR, checks_totaal: 16, checks_geslaagd: 16, run_type: 'deterministisch', fails: [], dagen_geleden: 0, verouderd: false },
    gauges: { dagelijkse_check_score: 100, bevindingen_score: 100 },
    audit_verzoek: null, pentest_verzoek: null,
  };
}

// ── Gecontroleerde nep-worker ────────────────────────────────────────────────
const antwoord = (status, body) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) });
const kapot = (status) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')) });
const LIJSTEN = ['/admin/scans', '/admin/callbacks', '/mna/admin/lijst', '/admin/rapporten', '/admin/leads', '/adviseur/proef/aanvragen'];
const ACTIES = {
  selfcheck: ['POST', '/mna/admin/veiligheid/selfcheck-nu'],
  ochtend: ['POST', '/mna/admin/veiligheid/ochtendcontrole-nu'],
  audit: ['POST', '/mna/admin/veiligheid/diepe-audit/aanvragen'],
  rapport: ['GET', '/mna/admin/veiligheid/rapport-link'],
  opgelost: ['POST', '/mna/admin/veiligheid/bevinding'],
};

function maakWorker() {
  const srv = { overzicht: groenOverzicht(), overzichtUit: 'ok', bevindingen: [], bevindingenUit: 'ok', uit: {}, calls: [], onbekend: [] };
  // uitkomst: 'net' | 'malformed' | [status, body]
  const lever = (uit) => {
    if (uit === 'net') return Promise.reject(new TypeError('Failed to fetch'));
    if (uit === 'malformed') return Promise.resolve(kapot(200));
    return Promise.resolve(antwoord(uit[0], uit[1]));
  };
  srv.fetch = (url, opts = {}) => {
    const u = new URL(String(url));
    const methode = (opts.method || 'GET').toUpperCase();
    const headers = opts.headers || {};
    const call = { pad: u.pathname, zoek: u.search, methode, key: headers['x-admin-key'], body: opts.body };
    srv.calls.push(call);
    const geautoriseerd = call.key === KEY;
    if (methode === 'GET' && LIJSTEN.includes(u.pathname)) return Promise.resolve(geautoriseerd ? antwoord(200, []) : antwoord(401, { error: 'Unauthorized' }));
    if (u.pathname === '/admin/login-notify') return Promise.resolve(antwoord(200, { ok: true }));
    if (methode === 'GET' && u.pathname === '/mna/admin/veiligheid/overzicht') {
      if (!geautoriseerd) return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
      return lever(srv.overzichtUit === 'ok' ? [200, srv.overzicht] : srv.overzichtUit);
    }
    if (methode === 'GET' && u.pathname === '/mna/admin/veiligheid/bevindingen') {
      if (!geautoriseerd) return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
      return lever(srv.bevindingenUit === 'ok' ? [200, { ok: true, bevindingen: srv.bevindingen }] : srv.bevindingenUit);
    }
    for (const [naam, [m, p]] of Object.entries(ACTIES)) {
      if (methode !== m || u.pathname !== p) continue;
      call.actie = naam;
      if (!geautoriseerd) return Promise.resolve(antwoord(401, { error: 'Unauthorized' }));
      const uit = srv.uit[naam] || [200, { ok: true }];
      // Zoals backend 24-veiligheidsdashboard.js: open → niet-open zet opgelost_op = nu.
      if (naam === 'opgelost' && Array.isArray(uit) && uit[0] === 200 && uit[1] && uit[1].ok === true) {
        const b = JSON.parse(opts.body || '{}'), rij = srv.bevindingen.find((x) => x.id === b.id);
        if (rij && rij.status === 'open' && b.status !== 'open') { rij.status = b.status; rij.opgelost_op = Date.now(); }
      }
      return lever(uit);
    }
    srv.onbekend.push(call);
    return Promise.resolve(antwoord(404, { error: 'Not found' }));
  };
  srv.acties = (naam) => srv.calls.filter((c) => c.actie === naam);
  srv.overzichtGets = () => srv.calls.filter((c) => c.pad === '/mna/admin/veiligheid/overzicht').length;
  srv.reset = () => { srv.calls = []; srv.onbekend = []; };
  return srv;
}

const settle = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setImmediate(r)); };

async function maakOmgeving(root, sleutel = KEY) {
  const html = fs.readFileSync(path.join(root, 'marilyn.html'), 'utf8');
  const bodyStart = html.indexOf('<body>'), scriptStart = html.indexOf('<script>', bodyStart), scriptEind = html.lastIndexOf('</script>');
  if (bodyStart < 0 || scriptStart < 0 || scriptEind < scriptStart) throw new Error('marilyn.html: body/script niet gevonden');
  const doc = maakDocument(html.slice(bodyStart + 6, scriptStart));
  const srv = maakWorker();
  const st = { toasts: [], confirms: [], confirmAntwoord: true, geopend: [] };
  const ctx = vm.createContext({
    document: doc, fetch: srv.fetch, location: { search: '' }, URLSearchParams, URL,
    confirm: (m) => { st.confirms.push(String(m)); return st.confirmAntwoord; },
    alert: () => {}, prompt: () => null, window: { open(u) { st.geopend.push(u); } }, navigator: { clipboard: { writeText: () => Promise.resolve() } },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, console,
  });
  vm.runInContext(html.slice(scriptStart + 8, scriptEind), ctx, { filename: 'marilyn.html' });
  ctx.toast = (msg, type) => { st.toasts.push({ msg: String(msg), type: type || 'ok' }); };
  doc.getElementById('ak').value = sleutel;
  doc.getElementById('login-btn').click();
  await settle();
  const $ = (id) => doc.getElementById(id);
  const tab = async (id) => { $(id).click(); await settle(); };
  const tc = () => $('tc');
  // Veiligheid-tab (opnieuw) openen met het huidige synthetische overzicht.
  const veiligheid = async (overzicht) => { if (overzicht) srv.overzicht = overzicht; srv.overzichtUit = 'ok'; await tab('t-veiligheid'); };
  // De overkoepelende status is het eerste blok in de tab.
  const banner = () => { const b = tc() && tc().elementen[0]; const t = b ? b.textContent : ''; return { groen: /✓ Veiligheid actueel —/.test(t), rood: /⚠ Veiligheid NIET actueel:/.test(t), tekst: t }; };
  return { ctx, doc, srv, st, $, tab, tc, veiligheid, banner, run: (code) => vm.runInContext(code, ctx) };
}

const SECTIES = [
  '0. Ochtendcontrole', '1. Continue geautomatiseerde checks', '2. Bekende bevindingen opgelost', '3. Laatste periodieke diepe audit',
  '4. Laatste red-team pentest', '5. Laatste dagelijkse knoppentest', '6. Dagelijkse E2E-regressietest', 'Open bevindingen', 'Recent gefixt / afgehandeld',
];
const KNOPPEN = ['btn-ochtendcontrole-nu', 'btn-veiligheid-nu', 'btn-audit-aanvragen', 'btn-pentest-aanvragen', 'btn-rapport-link', 'btn-rapport-nieuw'];
const STATUS_FOUTEN = [
  ['401', [401, { error: 'Unauthorized' }]], ['403', [403, { error: 'Forbidden' }]], ['500', [500, { error: 'Interne fout' }]],
  ['netwerkfout', 'net'], ['onjuiste JSON', 'malformed'], ['ok:false', [200, { ok: false, error: 'Synthetische weigering' }]], ['500 met ok:true', [500, { ok: true }]],
];

export async function draaiMarilynVeiligheidChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const probeer = async (naam, fn) => {
    try { await fn(); }
    catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); }
  };
  const onverwacht = (e) => check(false, 'onverwachte asynchrone fout: ' + String((e && e.message) || e));
  process.on('unhandledRejection', onverwacht);
  try {

  // ── A. Volledig geldig: groen, elke sectie en elke knop aanwezig, push-audit historisch ──
  await probeer('geldig', async () => {
    const o = await maakOmgeving(root);
    check(o.run('isSuperAdmin') === true && o.$('t-veiligheid'), 'login: superadmin-sessie via de echte doLogin(), Veiligheid-tab zichtbaar');
    await o.veiligheid(groenOverzicht());
    const t = o.tc().textContent;
    check(o.banner().groen && !o.banner().rood, 'geldig: alle controles geldig en recent → "Veiligheid actueel"');
    const ontbrekend = SECTIES.filter((s) => !t.includes(s));
    check(!ontbrekend.length, 'secties: elke veiligheidssectie wordt gerenderd' + (ontbrekend.length ? ' (ontbreekt: ' + ontbrekend.join(', ') + ')' : ''));
    const knoppenWeg = KNOPPEN.filter((k) => !o.$(k));
    check(!knoppenWeg.length, 'knoppen: elke actieknop aanwezig' + (knoppenWeg.length ? ' (ontbreekt: ' + knoppenWeg.join(', ') + ')' : ''));
    check(/✓ Actueel en volledig geslaagd/.test(o.$('veiligheid-nacht-status').textContent) && o.$('veiligheid-nacht-status').style.color === 'var(--teal)', 'nacht: geldige recente selfcheck in sectie 1 als actueel getoond');
    check(o.$('veiligheid-ochtend-status').style.color === 'var(--teal)' && /3\/3 geslaagd/.test(o.$('veiligheid-ochtend-status').textContent), 'ochtend: geldige recente ochtendcontrole groen met teller');
    check(/historisch, telt niet mee in de actuele status/.test(t) && /Frontend-repo: 5\/5 — historisch, laatst gemeld \d{2}-\d{2}-\d{4}/.test(t), 'push-audit: getoond als historisch met volledige datum, geen claim van een actuele run');
    check(o.tc().innerHTML.includes('Backend-repo: <span style="color:var(--red);font-weight:600">0/0</span>'), 'push-audit: 0/0 is nooit groen');
    check(!/elke dag gepusht|dagelijkse push/i.test(t), 'push-audit: geen verzonnen dagelijkse pushcadans');
    check(o.srv.onbekend.filter((c) => c.pad.startsWith('/mna/admin/veiligheid')).length === 0, 'geldig: geen onbekende veiligheidsroute aangeroepen');
  });

  // ── B. Nacht en ochtend: ontbrekend / 0-0 / FAIL / malformed / verouderd / ongeldige tijd nooit groen ──
  await probeer('dagelijkse controles', async () => {
    const o = await maakOmgeving(root);
    // Volledige, specifieke afwijzingsreden uit dagelijkseRunOordeel() — direct na het label in de banner.
    const DETAILS_ONGELDIG = /ongeldig resultaat \(details per check kloppen niet met de teller\)/;
    const geval = (veld, waarde) => { const ov = groenOverzicht(); ov[veld] = typeof waarde === 'function' ? waarde(ov[veld]) : waarde; return ov; };
    const varianten = [
      ['ontbreekt', null, /nog nooit uitgevoerd/],
      ['0/0 zonder details', { ran_at: Date.now() - UUR, checks_totaal: 0, checks_geslaagd: 0, details: [] }, /ongeldig resultaat \(teller\)/],
      ['FAIL 2/3', synthRun(3, 2), /FAIL \(2\/3 geslaagd\)/],
      ['teller als tekst', (r) => ({ ...r, checks_totaal: String(r.checks_totaal) }), /ongeldig resultaat \(teller\)/],
      ['geslaagd > totaal', (r) => ({ ...r, checks_geslaagd: r.checks_totaal + 1 }), /ongeldig resultaat \(teller\)/],
      ['details ontbreken', (r) => ({ ...r, details: undefined }), DETAILS_ONGELDIG],
      ['minder details dan teller', (r) => ({ ...r, details: r.details.slice(1) }), DETAILS_ONGELDIG],
      ['teller groen, detail FAIL', (r) => ({ ...r, details: r.details.map((d, i) => i === 0 ? { ...d, geslaagd: false } : d) }), DETAILS_ONGELDIG],
      ['detail null', (r) => ({ ...r, details: r.details.map((d, i) => i === 0 ? null : d) }), DETAILS_ONGELDIG],
      ['detail geslaagd als tekst', (r) => ({ ...r, details: r.details.map((d) => ({ ...d, geslaagd: 'ja' })) }), DETAILS_ONGELDIG],
      ['tijdstip ontbreekt', (r) => ({ ...r, ran_at: undefined }), /ongeldig tijdstip/],
      ['tijdstip als tekst', (r) => ({ ...r, ran_at: 'gisteren' }), /ongeldig tijdstip/],
      ['tijdstip ver in de toekomst', (r) => ({ ...r, ran_at: Date.now() + 10 * DAG }), /ongeldig tijdstip/],
      ['verouderd (3 dagen)', (r) => ({ ...r, ran_at: Date.now() - 3 * DAG }), /verouderd \(meer dan 2 dagen geleden\)/],
    ];
    for (const [veld, label] of [['laatste_selfcheck', 'nachtelijke selfcheck'], ['laatste_ochtendcontrole', 'ochtendcontrole']]) {
      for (const [naam, waarde, reden] of varianten) {
        await o.veiligheid(geval(veld, waarde));
        const b = o.banner();
        check(!b.groen && b.rood && new RegExp(label + ' ' + reden.source).test(b.tekst),label + ' ' + naam + ': algemene status NIET actueel met reden');
        if (veld === 'laatste_ochtendcontrole' && waarde !== null) check(o.$('veiligheid-ochtend-status').style.color === 'var(--red)', 'ochtendcontrole ' + naam + ': sectie 0 rood, niet groen');
        if (veld === 'laatste_selfcheck') check(o.$('veiligheid-nacht-status').style.color === 'var(--red)' && !/Actueel en volledig/.test(o.$('veiligheid-nacht-status').textContent), 'nachtelijke selfcheck ' + naam + ': sectie 1 toont niet-actueel');
      }
      // Dezelfde 2-dagengrens als knoppentest/E2E: 47 uur oud is nog actueel.
      await o.veiligheid(geval(veld, (r) => ({ ...r, ran_at: Date.now() - 47 * UUR })));
      check(o.banner().groen, label + ': 47 uur oud valt binnen de bestaande 2-dagengrens en blijft actueel');
    }
    // Server-tekst in per-check details wordt ge-escaped (geen HTML-injectie via de ochtendrijen).
    const ov = groenOverzicht();
    ov.laatste_ochtendcontrole.details[0].omschrijving = '<b id="inj">x</b>';
    await o.veiligheid(ov);
    check(!o.$('inj') && o.tc().textContent.includes('<b id="inj">x</b>'), 'ochtendrijen: servertekst ge-escaped');
  });

  // ── C. Bestaande statuscriteria blijven ongewijzigd werken ──
  await probeer('bestaande criteria', async () => {
    const o = await maakOmgeving(root);
    const gevallen = [
      ['open kritiek/hoog', (ov) => { ov.open_kritiek_hoog = 1; ov.open_totaal = 1; }, /1 open kritieke\/hoge bevinding/],
      ['diepe audit ontbreekt', (ov) => { ov.diepe_audit = null; }, /diepe audit verouderd/],
      ['pentest verouderd', (ov) => { ov.red_team_pentest.verouderd = true; }, /red-team pentest verouderd/],
      ['knoppentest verouderd', (ov) => { ov.knoppentest.verouderd = true; }, /dagelijkse knoppentest verouderd/],
      ['E2E rood', (ov) => { ov.e2e_regressie.checks_geslaagd = 15; }, /E2E-regressietest verouderd of rood/],
    ];
    for (const [naam, pas, re] of gevallen) {
      const ov = groenOverzicht(); pas(ov);
      await o.veiligheid(ov);
      check(o.banner().rood && re.test(o.banner().tekst), 'bestaand criterium ' + naam + ': nog steeds NIET actueel');
    }
  });

  // ── D. Laden van het overzicht faalt: nooit groen ──
  await probeer('laadfouten', async () => {
    const o = await maakOmgeving(root);
    for (const [naam, uit] of STATUS_FOUTEN.concat([['ok:true zonder velden', [200, { ok: true }]]])) {
      o.srv.overzichtUit = uit;
      await o.tab('t-veiligheid');
      const t = o.tc().textContent;
      check(/Fout bij laden/.test(t) && !o.banner().groen && !o.$('btn-veiligheid-nu'), 'overzicht ' + naam + ': foutmelding, geen groene status en geen actieknoppen');
    }
  });

  // ── E. Actieknoppen met synthetische serverantwoorden ──
  const RES_GROEN = { ok: true, resultaat: synthRun(4) };
  const dagelijkseKnop = async (knop, actie, label) => {
    const o = await maakOmgeving(root);
    await o.veiligheid(groenOverzicht());
    const klik = async (uit) => {
      o.srv.uit[actie] = uit; o.srv.reset(); o.st.toasts = []; o.st.confirms = [];
      const k = o.$(knop); k.click(); k.click(); // dubbelklik
      await settle();
      return { posts: o.srv.acties(actie), toasts: o.st.toasts, herladen: o.srv.overzichtGets() };
    };
    let r = await klik([200, RES_GROEN]);
    check(r.posts.length === 1 && r.posts[0].key === KEY && r.toasts.length === 1 && r.toasts[0].type === 'ok' && /4\/4 geslaagd/.test(r.toasts[0].msg) && r.herladen === 1, label + ' succes: één POST met sleutel, succesmelding met teller, overzicht herladen (dubbelklik = één POST)');
    check(o.$(knop) && !o.$(knop).disabled, label + ' succes: knop na herladen weer bruikbaar');
    for (const [naam, res] of [['0/0', { ok: true, resultaat: { checks_totaal: 0, checks_geslaagd: 0, details: [] } }], ['FAIL 3/4', { ok: true, resultaat: synthRun(4, 3) }], ['zonder resultaat', { ok: true, resultaat: null }], ['teller groen, detail FAIL', { ok: true, resultaat: { ...synthRun(2), details: [{ code: 'A', geslaagd: true }, { code: 'B', geslaagd: false }] } }]]) {
      r = await klik([200, res]);
      check(r.posts.length === 1 && r.toasts.length === 1 && r.toasts[0].type === 'warn' && /niet volledig geslaagd/.test(r.toasts[0].msg), label + ' ' + naam + ': waarschuwing, geen succesmelding');
    }
    for (const [naam, uit] of STATUS_FOUTEN) {
      const vorigeKnop = o.$(knop);
      r = await klik(uit);
      check(r.posts.length === 1 && r.toasts.length === 1 && r.toasts[0].type === 'err' && r.herladen === 0, label + ' ' + naam + ': foutmelding, geen vals succes, niet herladen');
      check(!vorigeKnop.disabled, label + ' ' + naam + ': knop hersteld');
    }
    // Onbevoegd: sleutel ongeldig geworden → server weigert, UI meldt fout, geen succes.
    o.run("adminKey='ONGELDIG'");
    o.srv.uit[actie] = [200, RES_GROEN]; o.srv.reset(); o.st.toasts = [];
    o.$(knop).click(); await settle();
    check(o.srv.acties(actie).length === 1 && o.st.toasts.length === 1 && o.st.toasts[0].type === 'err', label + ' zonder geldige sleutel: server weigert, geen succesmelding');
  };
  await probeer('selfcheck-knop', () => dagelijkseKnop('btn-veiligheid-nu', 'selfcheck', 'selfcheck'));
  await probeer('ochtendcontrole-knop', () => dagelijkseKnop('btn-ochtendcontrole-nu', 'ochtend', 'ochtendcontrole'));

  const aanvraagKnop = async (knop, label, verwachtBody) => {
    const o = await maakOmgeving(root);
    await o.veiligheid(groenOverzicht());
    const klik = async (uit, akkoord = true) => {
      o.srv.uit.audit = uit; o.srv.reset(); o.st.toasts = []; o.st.confirms = []; o.st.confirmAntwoord = akkoord;
      const k = o.$(knop); k.click(); k.click();
      await settle();
      return { posts: o.srv.acties('audit'), toasts: o.st.toasts, confirms: o.st.confirms };
    };
    let r = await klik([200, { ok: true, al_in_behandeling: false }], false);
    check(r.confirms.length >= 1 && /AI-tokens/.test(r.confirms[0]) && r.posts.length === 0 && r.toasts.length === 0, label + ' annuleren: bevestiging noemt AI-kosten, er wordt niets verstuurd');
    r = await klik([200, { ok: true, al_in_behandeling: false }]);
    check(r.posts.length === 1 && r.posts[0].key === KEY && verwachtBody(r.posts[0].body) && r.toasts.length === 1 && r.toasts[0].type === 'ok', label + ' succes: één aanvraag met juiste soort, succesmelding (dubbelklik = één POST)');
    r = await klik([200, { ok: true, al_in_behandeling: true, status: 'open' }]);
    check(r.posts.length === 1 && r.toasts[0].type === 'warn', label + ' al in behandeling: waarschuwing, geen succes');
    for (const [naam, uit] of STATUS_FOUTEN.concat([['200 zonder ok', [200, {}]]])) {
      const vorigeKnop = o.$(knop);
      r = await klik(uit);
      check(r.posts.length === 1 && r.toasts.length === 1 && r.toasts[0].type === 'err', label + ' ' + naam + ': foutmelding, geen vals succes');
      check(!vorigeKnop.disabled, label + ' ' + naam + ': knop hersteld');
    }
  };
  await probeer('audit-knop', () => aanvraagKnop('btn-audit-aanvragen', 'diepe audit', (b) => b === undefined));
  await probeer('pentest-knop', () => aanvraagKnop('btn-pentest-aanvragen', 'red-team pentest', (b) => { try { return JSON.parse(b).type === 'red_team_pentest'; } catch { return false; } }));

  await probeer('rapport-knoppen', async () => {
    const o = await maakOmgeving(root);
    const URL_SYNTH = 'https://voorbeeld.invalid/beveiliging?code=SYNTH';
    const klik = async (knop, uit, akkoord = true) => {
      await o.veiligheid(groenOverzicht());
      o.srv.uit.rapport = uit; o.srv.reset(); o.st.toasts = []; o.st.confirms = []; o.st.confirmAntwoord = akkoord;
      o.$(knop).click(); await settle();
      return { gets: o.srv.acties('rapport'), toasts: o.st.toasts, confirms: o.st.confirms, out: o.$('rapport-link-out') };
    };
    let r = await klik('btn-rapport-link', [200, { ok: true, url: URL_SYNTH }]);
    check(r.gets.length === 1 && r.gets[0].zoek === '' && r.out.style.display === 'block' && r.out.textContent.includes(URL_SYNTH) && r.toasts.length === 0, 'rapportlink succes: bestaande link getoond, geen nieuwe code aangevraagd');
    o.$('btn-rapport-open').click(); o.$('btn-rapport-kopieer').click(); await settle();
    check(o.st.geopend[0] === URL_SYNTH && o.st.toasts.some((t) => t.type === 'ok' && /gekopieerd/.test(t.msg)), 'rapportlink: open/kopieer werken op de getoonde link');
    for (const [naam, uit] of STATUS_FOUTEN.concat([['ok:true zonder url', [200, { ok: true }]]])) {
      r = await klik('btn-rapport-link', uit);
      check(r.gets.length === 1 && r.out.style.display === 'none' && r.toasts.length === 1 && r.toasts[0].type === 'err' && !o.$('btn-rapport-link').disabled, 'rapportlink ' + naam + ': foutmelding, geen link getoond, knop hersteld');
    }
    r = await klik('btn-rapport-nieuw', [200, { ok: true, url: URL_SYNTH }], false);
    check(r.confirms.length === 1 && r.gets.length === 0, 'nieuwe rapportlink annuleren: er wordt niets aangevraagd');
    r = await klik('btn-rapport-nieuw', [200, { ok: true, url: URL_SYNTH }]);
    check(r.gets.length === 1 && r.gets[0].zoek === '?nieuw=1' && r.out.style.display === 'block', 'nieuwe rapportlink bevestigd: één verzoek met nieuw=1');
    r = await klik('btn-rapport-nieuw', [401, { error: 'Unauthorized' }]);
    check(r.gets.length === 1 && r.out.style.display === 'none' && r.toasts[0].type === 'err', 'nieuwe rapportlink 401: foutmelding, geen link');
  });

  await probeer('markeer-opgelost', async () => {
    const o = await maakOmgeving(root);
    o.srv.bevindingen = [{ id: 'SYN-B1', status: 'open', ernst: 'midden', code: 'SYN1', titel: 'Synthetische bevinding', omschrijving: 'Synthetisch', gevonden_op: Date.now() - DAG }];
    await o.veiligheid(groenOverzicht());
    const knop = () => o.tc().querySelector('.btn-veiligheid-opgelost');
    for (const [naam, uit] of STATUS_FOUTEN) {
      o.srv.uit.opgelost = uit; o.srv.reset(); o.st.toasts = [];
      const k = knop(); k.click(); await settle();
      check(o.srv.acties('opgelost').length === 1 && o.st.toasts.length === 1 && o.st.toasts[0].type === 'err' && !k.disabled, 'markeer opgelost ' + naam + ': foutmelding, knop weer bruikbaar');
    }
    o.srv.uit.opgelost = [200, { ok: true }]; o.srv.reset(); o.st.toasts = [];
    knop().click(); await settle();
    const p = o.srv.acties('opgelost');
    check(p.length === 1 && JSON.parse(p[0].body).id === 'SYN-B1' && JSON.parse(p[0].body).status === 'gefixt' && o.st.toasts[0].type === 'ok' && o.srv.overzichtGets() === 1, 'markeer opgelost succes: één POST voor deze bevinding, overzicht herladen');
  });

  // ── H. Productpunt 23: recent afgehandeld en bevindingenlijst waarheidsgetrouw ──
  const sectie = (o, titel) => { const t = o.tc().querySelectorAll('.table-title').find((e) => e.textContent.startsWith(titel)); return t ? t.closest('.table-wrap') : null; };
  const recentRijen = (o) => { const w = sectie(o, 'Recent gefixt / afgehandeld'); return w ? w.querySelectorAll('tr').filter((r) => r.querySelector('td')).map((r) => r.querySelectorAll('td').map((c) => c.textContent)) : []; };
  const datum = (ms) => new Date(ms).toLocaleDateString('nl-NL');
  // Backendvolgorde is gevonden_op DESC (24-veiligheidsdashboard.js), niet opgelost_op.
  const afgehandeld = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: 'SYN-G' + (i + 1), status: 'gefixt', ernst: 'laag', code: 'SYNG' + (i + 1), titel: 'Afgehandeld ' + (i + 1), gevonden_op: Date.now() - (i + 1) * UUR, opgelost_op: Date.now() - (30 + ((i * 7) % 16)) * DAG, ...extra }));

  await probeer('recent afgehandeld', async () => {
    const o = await maakOmgeving(root);
    // Echte flow: login → Veiligheid → markeer opgelost → herladen → bovenaan recent, ook bij 16 oudere items.
    o.srv.bevindingen = afgehandeld(16).concat([{ id: 'SYN-NU', status: 'open', ernst: 'midden', code: 'SYNNU', titel: 'Zojuist opgelost', gevonden_op: Date.now() - 90 * DAG }]);
    await o.veiligheid(groenOverzicht());
    o.srv.uit.opgelost = [200, { ok: true }]; o.srv.reset();
    o.tc().querySelector('.btn-veiligheid-opgelost').click(); await settle();
    let rijen = recentRijen(o);
    check(o.srv.overzichtGets() === 1 && rijen.length === 15 && rijen[0][2] === 'Zojuist opgelost' && rijen[0][3] === datum(Date.now()), 'recent: na oplossen en herladen staat de zojuist opgeloste bevinding bovenaan (16 oudere items, max 15 getoond)');

    // 16 items: gesorteerd op opgelost_op (nieuwste eerst) vóór de slice; de oudste valt af.
    const zestien = afgehandeld(16);
    o.srv.bevindingen = zestien;
    await o.veiligheid(groenOverzicht());
    rijen = recentRijen(o);
    const verwacht = zestien.slice().sort((a, b) => b.opgelost_op - a.opgelost_op).slice(0, 15).map((b) => b.titel);
    check(rijen.length === 15 && rijen.every((r, i) => r[2] === verwacht[i]), '16 items: 15 getoond, gesorteerd op opgelost_op en de oudst opgeloste valt af');

    // Missende/ongeldige oplosdatum: "onbekend", onder de bekende datums, nooit de vondstdatum.
    const gevonden = Date.now() - 2 * DAG;
    o.srv.bevindingen = [
      { id: 'SYN-M1', status: 'gefixt', ernst: 'laag', code: 'SYNM1', titel: 'Zonder datum', gevonden_op: gevonden, opgelost_op: null },
      { id: 'SYN-M2', status: 'gefixt', ernst: 'laag', code: 'SYNM2', titel: 'Datum als tekst', gevonden_op: gevonden, opgelost_op: 'gisteren' },
      { id: 'SYN-M3', status: 'gefixt', ernst: 'laag', code: 'SYNM3', titel: 'Met datum', gevonden_op: gevonden - DAG, opgelost_op: Date.now() - 40 * DAG },
    ];
    await o.veiligheid(groenOverzicht());
    rijen = recentRijen(o);
    check(rijen.length === 3 && rijen[0][2] === 'Met datum' && rijen.slice(1).every((r) => r[3] === 'onbekend') && !rijen.some((r) => r[3] === datum(gevonden)), 'missende datum: expliciet "onbekend", lager dan bekende datums, vondstdatum nooit als oplosdatum');
    o.srv.bevindingen = afgehandeld(15).concat([{ id: 'SYN-M4', status: 'gefixt', ernst: 'laag', code: 'SYNM4', titel: 'Zonder datum nieuw gevonden', gevonden_op: Date.now(), opgelost_op: undefined }]);
    await o.veiligheid(groenOverzicht());
    check(!recentRijen(o).some((r) => r[2] === 'Zonder datum nieuw gevonden'), 'missende datum: verdringt geen bekende oplosdatum uit de 15 recentste');

    // Labels: gefixt en bewust uitgesteld expliciet; onbekende status nooit "Bewust uitgesteld" of groen.
    o.srv.bevindingen = [
      { id: 'SYN-L1', status: 'gefixt', ernst: 'laag', code: 'SYNL1', titel: 'Fix', gevonden_op: Date.now() - 3 * DAG, opgelost_op: Date.now() - DAG },
      { id: 'SYN-L2', status: 'bewust_uitgesteld', ernst: 'laag', code: 'SYNL2', titel: 'Uitgesteld', gevonden_op: Date.now() - 3 * DAG, opgelost_op: Date.now() - 2 * DAG },
      { id: 'SYN-L3', status: 'in_onderzoek', ernst: 'kritiek', code: 'SYNL3', titel: 'Vreemde status', gevonden_op: Date.now() - 3 * DAG, opgelost_op: Date.now() },
    ];
    await o.veiligheid(groenOverzicht());
    rijen = recentRijen(o);
    const tags = sectie(o, 'Recent gefixt / afgehandeld').querySelectorAll('.tag');
    check(rijen.length === 2 && rijen[0][0] === 'Gefixt' && rijen[1][0] === 'Bewust uitgesteld' && tags[0].style.color === 'var(--teal)' && tags[1].style.color !== 'var(--teal)', 'labels: "Gefixt" groen, "Bewust uitgesteld" expliciet en niet groen');
    const recentTekst = sectie(o, 'Recent gefixt / afgehandeld').textContent;
    check(!rijen.some((r) => r[2] === 'Vreemde status') && /onbekende status/.test(recentTekst) && /in_onderzoek/.test(recentTekst) && o.banner().rood && /1 bevinding\(en\) met onbekende status/.test(o.banner().tekst), 'onbekende status: niet als afgehandeld/bewust uitgesteld getoond, expliciet gemeld en algemene status NIET actueel');

    // XSS: servertekst in titel/code/ernst/status wordt ge-escaped.
    o.srv.bevindingen = [
      { id: 'SYN-X1', status: 'open', ernst: '<b id="xss-ernst">x</b>', code: '<b id="xss-code">x</b>', titel: '<b id="xss-titel">x</b>', gevonden_op: Date.now() },
      { id: 'SYN-X2', status: 'gefixt', ernst: 'laag', code: 'SYNX2', titel: '<img id="xss-recent">', gevonden_op: Date.now(), opgelost_op: Date.now() },
      { id: 'SYN-X3', status: '<b id="xss-status">x</b>', ernst: 'laag', code: '<b id="xss-ocode">x</b>', titel: 'x', gevonden_op: Date.now() },
    ];
    await o.veiligheid(groenOverzicht());
    check(['xss-ernst', 'xss-code', 'xss-titel', 'xss-recent', 'xss-status', 'xss-ocode'].every((id) => !o.$(id)) && o.tc().textContent.includes('<img id="xss-recent">'), 'XSS: servertekst in open/recent/onbekende status ge-escaped');
  });

  await probeer('bevindingenlijst onbeschikbaar', async () => {
    const o = await maakOmgeving(root);
    o.srv.bevindingen = [{ id: 'SYN-B1', status: 'open', ernst: 'hoog', code: 'SYN1', titel: 'Synthetisch', gevonden_op: Date.now() }];
    const fouten = STATUS_FOUTEN.filter(([n]) => n !== 'netwerkfout').concat([
      ['ok:true zonder lijst', [200, { ok: true }]], ['bevindingen geen array', [200, { ok: true, bevindingen: { a: 1 } }]],
      ['array zonder ok', [200, { bevindingen: [] }]], ['kale array', [200, []]], ['element null', [200, { ok: true, bevindingen: [null] }]],
    ]);
    for (const [naam, uit] of fouten) {
      o.srv.bevindingenUit = uit;
      await o.veiligheid(groenOverzicht());
      const t = o.tc().textContent;
      const reden = naam === '401' || naam === '403' ? /bevindingenlijst onbeschikbaar: geen toegang \(HTTP 40[13]\)/ : /bevindingenlijst onbeschikbaar/;
      check(!o.banner().groen && o.banner().rood && reden.test(o.banner().tekst) && !/Geen openstaande bevindingen/.test(t) && !/Nog niets\./.test(t) && /Bevindingenlijst onbeschikbaar/.test(t) && /Open bevindingen \(onbekend\)/.test(t) && !o.tc().querySelector('.btn-veiligheid-opgelost'), 'bevindingen ' + naam + ' bij overzicht 200: onbeschikbaar getoond, geen groen, geen "geen bevindingen", geen actieknop');
    }
    o.srv.bevindingenUit = 'net';
    await o.veiligheid(groenOverzicht());
    check(/Fout bij laden/.test(o.tc().textContent) && !o.banner().groen && !/Geen openstaande bevindingen/.test(o.tc().textContent), 'bevindingen netwerkfout: foutmelding, geen groen');
    // Lege maar geldige lijst blijft gewoon "geen openstaande bevindingen".
    o.srv.bevindingenUit = 'ok'; o.srv.bevindingen = [];
    await o.veiligheid(groenOverzicht());
    check(o.banner().groen && /Geen openstaande bevindingen/.test(o.tc().textContent), 'bevindingen geldig en leeg: bestaand gedrag (actueel, geen openstaande bevindingen) behouden');
    // Rolweigering na login: sleutel ongeldig → beide routes weigeren, geen groen en geen acties.
    o.srv.bevindingen = [{ id: 'SYN-B1', status: 'open', ernst: 'hoog', code: 'SYN1', titel: 'Synthetisch', gevonden_op: Date.now() }];
    o.run("adminKey='ONGELDIG'");
    await o.veiligheid(groenOverzicht());
    check(/Fout bij laden/.test(o.tc().textContent) && !o.banner().groen && !o.tc().querySelector('.btn-veiligheid-opgelost') && !o.$('btn-veiligheid-nu'), 'rolweigering: ongeldige sleutel → geen groen, geen bevindingen en geen acties');
  });

  // ── I. Productpunt 20: kopendepartijlabel in "Nieuw traject" toont alleen "(optioneel)" ──
  await probeer('kopendepartijlabel', async () => {
    const FRASE = /vaak nog niet bekend bij aanmaken/;
    const bron = fs.readFileSync(path.join(root, 'marilyn.html'), 'utf8');
    const statisch = bron.split('\n').find((r) => r.includes('id="m-sectie2-hdr">')) || '';
    check(statisch.includes('id="m-sectie2-hdr">Kopende partij <span style="font-weight:400;text-transform:none;letter-spacing:normal">(optioneel)</span>') && !FRASE.test(statisch), 'kopende partij statisch label: "(optioneel)" behouden, ongewenste frase weg');
    const o = await maakOmgeving(root);
    o.srv.reset();
    o.run('toonNieuwModal()');
    const hdr = () => o.$('m-sectie2-hdr');
    check(hdr() && hdr().textContent === 'Kopende partij (optioneel)' && hdr().querySelector('span') && hdr().querySelector('span').textContent === '(optioneel)', 'kopende partij dynamisch label (Verkoop): "Kopende partij (optioneel)" zonder ongewenste frase');
    const typen = [['Fusie', 'Fusiepartij B'], ['Overname', 'Overnemende partij'], ['PE-traject', 'PE-partij'], ['Opvolging', 'Opvolgend eigenaar'], ['Verkoop', 'Kopende partij']];
    for (const [type, sectie2] of typen) {
      o.$('m-t').value = type; o.$('m-t').dispatch('change');
      check(hdr().textContent === sectie2 + ' (optioneel)' && !FRASE.test(hdr().textContent) && o.$('m-p2-naam-lbl').textContent === o.run('partijLabels(' + JSON.stringify(type) + ').partij2'), 'kopende partij dynamisch label ' + type + ': "' + sectie2 + ' (optioneel)", partijlabels wisselen mee');
    }
    o.$('m-sector').value = 'zorg'; o.$('m-sector').dispatch('change');
    check(o.$('m-sector').value === 'zorg' && hdr().textContent === 'Kopende partij (optioneel)', 'sectorwissel: sectorkeuze blijft staan en laat het partijlabel ongemoeid');
    check(!FRASE.test(o.doc.body.textContent) && /Aangedragen door \(optioneel — intern/.test(o.doc.body.textContent), 'nieuw traject: frase nergens meer in de modal, overige optioneel-hint ongewijzigd');
    o.$('m-ok').click(); await settle();
    check(o.$('m-err').textContent === 'Naam onderneming is verplicht.' && !o.srv.calls.some((c) => c.methode === 'POST'), 'nieuw traject: bestaande validatie ongewijzigd, niets opgeslagen zonder verplichte velden');
  });

  // ── F. Rollen: geen Veiligheid-tab of actie zonder superadmin / geldige sleutel ──
  await probeer('rollen', async () => {
    const o = await maakOmgeving(root);
    o.srv.reset();
    o.run('isSuperAdmin=false; renderDashboard();');
    await settle();
    check(!o.$('t-veiligheid') && !KNOPPEN.some((k) => o.$(k)) && !o.srv.calls.some((c) => c.pad.startsWith('/mna/admin/veiligheid')), 'rol: zonder superadmin geen Veiligheid-tab, geen knoppen en geen veiligheidsverzoek');
    const f = await maakOmgeving(root, 'FOUTE-SLEUTEL');
    check(!f.$('t-veiligheid') && !f.srv.calls.some((c) => c.pad.startsWith('/mna/admin/veiligheid')), 'rol: met onjuiste sleutel geen login, geen Veiligheid-tab, geen veiligheidsverzoek');
  });

  // ── G. Documentatie scheidt UI-test van echte controlerun ──
  await probeer('documentatie', async () => {
    const doc = fs.readFileSync(path.join(root, 'docs/marilyn-veiligheid.md'), 'utf8');
    check(/UI-functioneel getest/i.test(doc) && /geen bewijs/i.test(doc) && /echte controlerun/i.test(doc) && /nog niet live/i.test(doc), 'docs/marilyn-veiligheid.md: UI-test en echte controlerun gescheiden, status niet live');
  });

  } finally {
    process.off('unhandledRejection', onverwacht);
  }
  return res;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiMarilynVeiligheidChecks(root);
  const fout = res.filter((r) => !r.ok);
  res.forEach((r) => console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.msg));
  console.log('\n' + (res.length - fout.length) + '/' + res.length + ' geslaagd');
  process.exit(fout.length || !res.length ? 1 : 0);
}
