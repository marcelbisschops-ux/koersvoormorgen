#!/usr/bin/env node
// Documentuitvoer: veilige tekstopmaak en publieke trajectreferentie (P0, 7 okt 2026).
//
// Twee bewezen fouten: (1) mdToHtml (mna/02) gaf brontekst ongeëscapet door, zodat bijv. een
// <img onerror> als actieve HTML in het rapport belandde; (2) printDocNaAkkoord (mna/05) verwerkte de
// documenttekst, titel, bedrijf/adres en logo-alt ongeëscapet en drukte S.code (= toegangscode) in de
// documentkop af. Deze test draait de ECHTE mdToHtml/esc uit mna/02 en de ECHTE printDocNaAkkoord uit
// mna/05 in node:vm met een synthetisch window/document, nep-fetch en een vastgelegde
// printHtmlDocument — geen netwerk, geen browser, geen live API. Alle gegevens zijn synthetisch.
// Browserbewijs (staging/E2E) volgt apart; dit is geen productieclaim.
//
// Sectie G (productpunt 19, 11 okt 2026) draait de ECHTE MoU/LoI/NDA-composer (bgMouRender/bgMouWire
// uit mna/04) op een minimale synthetische DOM met vertraagde PATCH-antwoorden: twee velden + vrije
// tekst, oudere/mislukte opslag, documentwissel, ander traject en bevroren document; sinds 12 okt ook
// sluiten (mou-close) met late opslagreactie en heropenen via de echte bgMouComposer. Sectie H vergrendelt
// statisch de aanhaakpunten van die fix in mna/04 (zelfde drie bronchecks als check 14 van de audit).
// Sectie I (productpunt 16, 13 okt 2026) draait de ECHTE versiegeschiedenisconsumenten uit mna/04/05/06
// tegen geldig/leeg/500/401/403/netwerk/ongeldige JSON/geen-array en late antwoorden na een contextwissel.
// Sectie K (B2, 14 okt 2026) draait de ECHTE toonVerkoopmemoModal (mna/04) met de echte fetchMetTimeout
// (mna/01) en esc (mna/02) tegen een synthetische backend die het B1-contract van worker/19b volgt
// (opslaan/definitief/nieuw_concept, 409 VEROUDERD/DEFINITIEF, snapshot via /mna/wijzigingen), en
// koppelt de printaanroep aan de echte printDocNaAkkoord (watermerk concept vs. definitief).
// Sectie M (productpunt 13 §31 fase 1b, 17 okt 2026) draait de ECHTE toonDealvoorstelModal-handler,
// dvBouwCijfers en dvGenereerFout (mna/04) met esc (mna/02) en synthetische rekenkernresultaten: de
// cijferlijst volgt het contract van worker/19b (dvValideerCijfers), bevat exact de getallen uit
// contextBlok/interneContext, gaat mee in beide requests, en 502/400-meldingen worden veilig getoond.
//
// Gebruik: node tests/document-output-security.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 26).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash, webcrypto } from 'crypto';

const CODES = { verkoper: 'VSYN0001', koper: 'KSYN0002', tussen: 'TSYN0003' };
const REF = 'TR-ABCD-EFGH-JKLM-NPQR';
const LOGO_HTTPS = 'https://worker.test/adviseur/logo/synthetisch?v=1';
const LOGO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function regel(src, re, naam) {
  const m = src.match(re);
  if (!m) throw new Error('niet gevonden in bron: ' + naam);
  return m[0];
}
function knip(src, begin, eind) {
  const a = src.indexOf(begin);
  const b = a < 0 ? -1 : src.indexOf(eind, a);
  if (a < 0 || b < 0) throw new Error('niet gevonden in bron: ' + begin);
  return src.slice(a, b + eind.length);
}

// Alle tags in de uitvoer: naam + attributen. Elke attribuutwaarde moet tussen dubbele quotes staan;
// restanten (onbequote attributen, losse handlers) tellen als fout.
function tags(html) {
  const out = [];
  const re = /<([A-Za-z][A-Za-z0-9-]*)([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = {};
    const rest = m[2].replace(/\s([A-Za-z-]+)="([^"]*)"/g, (_, k, v) => { attrs[k.toLowerCase()] = v; return ''; });
    out.push({ naam: m[1].toLowerCase(), attrs, rest: rest.replace(/\s*\/?\s*$/, '') });
  }
  return out;
}
function inert(html, toegestaan) {
  const fouten = [];
  tags(html).forEach((t) => {
    if (!toegestaan[t.naam]) fouten.push('tag <' + t.naam + '>');
    if (t.rest.trim()) fouten.push('niet-gequote attribuutrest in <' + t.naam + '>: ' + t.rest);
    Object.keys(t.attrs).forEach((k) => { if (!(toegestaan[t.naam] || []).includes(k)) fouten.push('attribuut ' + k + ' op <' + t.naam + '>'); });
    if (/^\s*(javascript|vbscript|data:text)/i.test(t.attrs.src || t.attrs.href || '')) fouten.push('onveilige URL in <' + t.naam + '>');
  });
  return fouten;
}
const PRINT_TAGS = { html: ['lang'], head: [], meta: ['charset'], title: [], link: ['href', 'rel'], style: [], body: [], div: ['class', 'style'], span: ['style'], h3: [], p: [], ul: [], li: [], strong: [], br: [], img: ['src', 'alt'] };
const MD_TAGS = { h3: [], p: [], ul: [], ol: [], li: [], strong: [], br: [] };

function laadMd(root) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const ctx = vm.createContext({});
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), regel(src02, /^function mdToHtml\(text\)\{[\s\S]*?\n\}/m, 'mdToHtml')].join('\n'), ctx, { filename: 'mna/02#mdToHtml' });
  return ctx;
}

function laadPrint(root, { traject, logo }) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src05 = lees(root, 'mna/05-documentflow-partijen.js');
  const fn = knip(src05, 'function printDocNaAkkoord(tekst, titel, docType) {', '\n}\n');
  const eff = { fetch: 0, audit: 0, open: 0, opslag: 0, createElement: 0, html: [] };
  const location = { href: 'https://app.test/mna.html' };
  const S = { code: CODES.verkoper, rol: 'verkoper', _bgKey: CODES.tussen, traject };
  const sessionStorage = { getItem: () => null, setItem: () => { eff.opslag++; }, removeItem: () => { eff.opslag++; } };
  const window = { location, open: () => { eff.open++; return null; }, sessionStorage, localStorage: sessionStorage };
  const document = { body: {}, createElement: () => { eff.createElement++; return {}; }, getElementById: () => null };
  const ctx = vm.createContext({
    S, window, document, location, sessionStorage, localStorage: sessionStorage,
    BRAND: { bedrijfKort: 'Synthetisch Kantoor BV', adres: 'Voorbeeldstraat 1, 1234AB Plaats', _logoUrl: logo || null },
    fetch: () => { eff.fetch++; return Promise.reject(new Error('geen netwerk')); },
    secAuditLog: () => { eff.audit++; },
    printHtmlDocument: (h) => { eff.html.push(String(h)); },
  });
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), fn].join('\n'), ctx, { filename: 'mna/05#printDocNaAkkoord' });
  return { ctx, S, eff, location };
}
function print(root, tekst, titel, docType, opts = {}) {
  const traject = opts.traject || {};
  const snap = JSON.stringify(traject);
  const r = laadPrint(root, { traject, logo: opts.logo });
  r.ctx.printDocNaAkkoord(tekst, titel, docType);
  return { ...r, html: r.eff.html[0] || '', snap };
}
const kop = (html) => { const a = html.indexOf('<div class="doc-header">'); return html.slice(a, html.indexOf('<div class="doc-body">', a)); };

// ── Composer (mna/04, productpunt 19): minimale synthetische DOM voor de ECHTE bgMouRender/bgMouWire ──
// Parseert alleen de door bgMouRender zelf opgebouwde HTML (elke tag wordt een element met attributen;
// <textarea>-inhoud en input-value worden de waarde). Ondersteunde selectors: tag, .klasse en
// [attr="waarde"], komma-gescheiden — een andere selector faalt luid i.p.v. stil niets te vinden.
const WORKER_T = 'https://worker.test';
const ontEsc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function selectorPast(el, sel) {
  return sel.split(',').some((s) => {
    const m = s.trim().match(/^([a-zA-Z]+)?((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/);
    if (!m) throw new Error('selector niet ondersteund in synthetische DOM: ' + s);
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    if (!(m[2].match(/\.[\w-]+/g) || []).every((c) => el.classList.contains(c.slice(1)))) return false;
    return [...m[3].matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].every((a) => (a[2] === undefined ? el.getAttribute(a[1]) !== null : el.getAttribute(a[1]) === a[2]));
  });
}
function maakDom(opts) {
  const doc = { body: { tagName: 'BODY' }, activeElement: null };
  doc.activeElement = doc.body;
  const blurBijVerwijderen = [];
  class El {
    constructor(tag, attrs) {
      this.tagName = tag.toUpperCase(); this._a = attrs; this.style = {}; this.title = '';
      this.value = attrs.value != null ? attrs.value : ''; this.disabled = 'disabled' in attrs; this.checked = 'checked' in attrs;
      this.selectionStart = this.selectionEnd = this.value.length; this.textContent = '';
    }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; }
    setAttribute(k, v) { this._a[k] = String(v); }
    removeAttribute(k) { delete this._a[k]; }
    get id() { return this._a.id || ''; }
    get classList() { const c = (this._a.class || '').split(/\s+/).filter(Boolean); return { contains: (x) => c.includes(x) }; }
    matches(sel) { return selectorPast(this, sel); }
    // Echte nakomelingen (in documentvolgorde) zoals parse() ze via de tag-nesting vastlegt.
    querySelectorAll(sel) { return this._desc.filter((e) => e.matches(sel)); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    focus() { doc.activeElement = this; }
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }
  }
  const LEEG = new Set(['INPUT', 'BR', 'HR', 'IMG', 'META', 'LINK', 'AREA', 'BASE', 'COL', 'EMBED', 'SOURCE', 'TRACK', 'WBR']);
  function parse(h) {
    const els = []; const stapel = []; const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g; let m;
    while ((m = re.exec(h))) {
      const tag = m[2].toUpperCase();
      if (m[1]) {
        // Sluittag: sluit tot en met de dichtstbijzijnde open tag met dezelfde naam (losse sluittag negeren).
        const i = stapel.map((e) => e.tagName).lastIndexOf(tag);
        if (i >= 0) stapel.length = i;
        continue;
      }
      const attrs = {};
      m[3].replace(/\s([a-zA-Z-]+)(?:="([^"]*)")?/g, (_, k, v) => { attrs[k.toLowerCase()] = v == null ? '' : ontEsc(v); return ''; });
      const el = new El(m[2], attrs); el._desc = [];
      stapel.forEach((voorouder) => voorouder._desc.push(el));
      if (el.tagName === 'TEXTAREA') {
        const eind = h.indexOf('</textarea>', re.lastIndex);
        if (eind < 0) throw new Error('synthetische DOM: <textarea> zonder sluittag');
        el.value = ontEsc(h.slice(re.lastIndex, eind)); el.selectionStart = el.selectionEnd = el.value.length; re.lastIndex = eind + '</textarea>'.length;
      } else if (!LEEG.has(tag) && !/\/\s*$/.test(m[3])) stapel.push(el);
      els.push(el);
    }
    return els;
  }
  const out = {
    id: 'bg-doc-out', style: {}, _els: [], _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(h) {
      const oud = this._els; const actief = doc.activeElement;
      this._html = String(h); this._els = parse(this._html);
      if (oud.includes(actief)) {
        doc.activeElement = doc.body;
        // Chromium kan blur vuren op een gefocust veld dat uit de DOM verdwijnt (synchroon, tijdens het vervangen).
        if (opts.chromiumBlur && typeof actief.onblur === 'function') blurBijVerwijderen.push(actief.onblur.call(actief));
      }
    },
    querySelectorAll(sel) { return this._els.filter((e) => e.matches(sel)); },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    contains(e) { return this._els.includes(e); },
  };
  doc.getElementById = (id) => (id === 'bg-doc-out' ? out : out._els.find((e) => e.id === id) || null);
  doc.createElement = () => ({ style: {}, setAttribute() {}, appendChild() {} });
  return { doc, out, blurBijVerwijderen };
}
function compSyn(iid, dv, text) {
  const data_values = {}; Object.keys(dv).forEach((k) => { data_values[k] = { value: dv[k], provenance_type: 'USER_FACT' }; });
  return { instance_id: iid, block_id: 'parties', title: 'Partijen', instance_status: 'ACTIVE', is_auto: false, binding_status: '', review: { status: 'REQUIRED' },
    review_domain: 'LEGAL', review_trigger: 'altijd', data_values, text, text_provenance: 'USER_FACT' };
}
function laadComposer(root, opts = {}) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
  const fn = knip(src04, 'var MOU_PROV={', '\n  // Risicoraamwerk (SWOT');
  const { doc, out, blurBijVerwijderen } = maakDom(opts);
  const srv = {
    docs: {
      'doc-A': { document: { id: 'doc-A', status: 'draft', current_version: 3, bevroren: false }, componenten: [compSyn('i-a1', { koper: 'Koper Synthetisch BV', verkoper: 'Verkoper Synthetisch BV' }, 'Bestaande tekst A')] },
      'doc-B': { document: { id: 'doc-B', status: 'draft', current_version: 1, bevroren: false }, componenten: [compSyn('i-b1', { koper: 'Koper B BV', verkoper: 'Verkoper B BV' }, 'Tekst B')] },
    },
    // Documentlijst voor de echte bgMouComposer (expliciet openen/heropenen).
    lijst: [{ id: 'doc-A', doc_type: 'mou', current_version: 3, status: 'draft', created_at: 0 }, { id: 'doc-B', doc_type: 'mou', current_version: 1, status: 'draft', created_at: 0 }],
    wachtrij: [], verzoeken: [], houdVast: () => false,
  };
  const eff = { toasts: [], confirms: [], opslag: 0, html: [], audit: [], modals: 0 };
  const antw = (status, json) => ({ ok: status >= 200 && status < 300, status, json: () => (json === ONGELDIGE_JSON ? Promise.reject(new SyntaxError('ongeldige JSON')) : Promise.resolve(json)) });
  function route(method, pad) {
    let m;
    if (method === 'GET' && (m = pad.match(/^\/mna\/tos\/document\/([^/]+)\/exportcheck$/))) return [200, { ok: true, blockers: [], eis_per_domein: { LEGAL: true, TAX: true, VALUATION: true } }];
    if (method === 'GET' && (m = pad.match(/^\/mna\/tos\/document\/([^/]+)$/))) {
      const d = srv.docs[decodeURIComponent(m[1])];
      return d ? [200, JSON.parse(JSON.stringify({ ok: true, document: d.document, componenten: d.componenten, divergenties: [], reacties: [] }))] : [404, { error: 'Niet gevonden' }];
    }
    if (method === 'GET' && /^\/mna\/tos\/menu\//.test(pad)) return [200, { ok: true, menu: [], ontbrekend_kern: [], required_reviews: {} }];
    if (method === 'POST' && /^\/mna\/tos\/activeer\//.test(pad)) return [200, { ok: true }];
    if (method === 'GET' && /^\/mna\/tos\/documenten\//.test(pad)) return [200, { ok: true, documenten: JSON.parse(JSON.stringify(srv.lijst)) }];
    // Productpunt 14: printversie volgens het contract van worker/31 (srv.printversie per test aanpasbaar).
    if (method === 'GET' && (m = pad.match(/^\/mna\/tos\/document\/([^/]+)\/printversie$/)) && srv.printversie) return srv.printversie(decodeURIComponent(m[1]));
    return [500, { error: 'onverwacht synthetisch verzoek ' + method + ' ' + pad }];
  }
  const fetch = (url, o = {}) => {
    const method = String(o.method || 'GET').toUpperCase(); const pad = String(url).replace(WORKER_T, '');
    const body = o.body ? JSON.parse(o.body) : undefined;
    srv.verzoeken.push({ method, pad, body });
    if (srv.netwerkFout && srv.netwerkFout(method, pad)) return Promise.reject(new Error('synthetische netwerkfout'));
    if (method === 'PATCH' || srv.houdVast(method, pad)) return new Promise((res) => srv.wachtrij.push({ method, pad, body, los: (s, j) => res(antw(s, j)) }));
    return Promise.resolve(antw(...route(method, pad)));
  };
  const opslag = { getItem: () => null, setItem: () => { eff.opslag++; }, removeItem: () => { eff.opslag++; } };
  const S = { code: 'TSYN-TRAJECT-1', _bgKey: 'TSYN0003', rol: 'tussenpersoon', traject: {} };
  const ctx = vm.createContext({
    S, WORKER: WORKER_T, document: doc, fetch, localStorage: opslag, sessionStorage: opslag,
    window: { localStorage: opslag, sessionStorage: opslag },
    toast: (msg, type) => { eff.toasts.push({ msg: String(msg), type }); },
    confirm: (msg) => { eff.confirms.push(String(msg)); return false; },
    prompt: () => null, printDoc: () => {}, bgToonUitvoer: () => {}, refreshData: async () => {},
    eigenPdfHtml: () => '', eigenPdfBewijsHtml: () => '', wireEigenPdf: () => {}, hgBewijsToastSuffix: () => '', resterendePlaceholders: () => [],
  });
  const delen = [regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), fn];
  // Productpunt 14 (opts.echtePrint): de ECHTE reliance-/printketen uit mna/05 (toonRelianceAkkoord,
  // printDoc, printTosDefinitief, printDocNaAkkoord) i.p.v. de printDoc-stub; printvenster vastgelegd.
  const rel = { 'reliance-ann': {}, 'reliance-ok': {}, 'reliance-naam': { value: '' }, 'reliance-err': { style: {} } };
  if (opts.echtePrint) {
    const src05 = lees(root, 'mna/05-documentflow-partijen.js');
    delete ctx.printDoc;
    Object.assign(ctx, {
      BRAND: { bedrijfKort: 'Synthetisch Kantoor BV', adres: 'Voorbeeldstraat 1, 1234AB Plaats', _logoUrl: null },
      secAuditLog: (type, d) => { eff.audit.push({ type, d }); },
      printHtmlDocument: (h) => { eff.html.push(String(h)); },
      crypto: 'crypto' in opts ? opts.crypto : webcrypto, TextEncoder,
    });
    doc.body.appendChild = () => { eff.modals++; }; doc.body.removeChild = () => {};
    const basis = doc.getElementById;
    doc.getElementById = (id) => rel[id] || basis(id);
    delen.push(knip(src05, 'function toonRelianceAkkoord(titel, docType, onAkkoord) {', '\n}\n'), knip(src05, 'function printDoc(tekst, titel, docType) {', '\n}\n'),
      knip(src05, 'var printTosDefinitief = (function () {', '\n})();\n'), knip(src05, 'function printDocNaAkkoord(tekst, titel, docType) {', '\n}\n'));
  }
  vm.runInContext(delen.join('\n'), ctx, { filename: 'mna/04#composer' });
  // Een PATCH uit de wachtrij beantwoorden: bij ok wordt de synthetische server bijgewerkt (zoals worker/31).
  const los = (filter, ok, fout) => {
    const i = srv.wachtrij.findIndex(filter); if (i < 0) throw new Error('geen wachtend verzoek gevonden');
    const q = srv.wachtrij.splice(i, 1)[0];
    if (q.method === 'PATCH' && ok) {
      const iid = decodeURIComponent(q.pad.split('/').pop());
      Object.values(srv.docs).forEach((d) => d.componenten.forEach((c) => {
        if (c.instance_id !== iid) return;
        Object.keys((q.body && q.body.data_values) || {}).forEach((k) => { c.data_values[k] = { value: String(q.body.data_values[k]), provenance_type: 'USER_FACT' }; });
        if (q.body && typeof q.body.text === 'string') c.text = q.body.text;
      }));
      q.los(200, { ok: true, review_vervallen: false, divergentie: false });
    } else if (ok) q.los(...route(q.method, q.pad));
    else q.los((fout && fout.status) || 500, { error: (fout && fout.error) || 'Synthetische opslagfout' });
  };
  const veld = (k) => out.querySelector('.mou-dv[data-k="' + k + '"]');
  const tekst = () => out.querySelector('textarea.mou-text');
  const typ = (el, w) => { el.focus(); el.value = w; el.setSelectionRange(w.length, w.length); el.oninput(); };
  const naar = (van, doel) => { if (doel) doel.focus(); else doc.activeElement = doc.body; return typeof van.onblur === 'function' ? van.onblur() : undefined; };
  const concepten = (docId) => { const d = ctx.bgMouConceptDoc(S.code, docId, false); return d ? Object.keys(d).length : 0; };
  const patches = () => srv.verzoeken.filter((v) => v.method === 'PATCH');
  return { ctx, S, srv, eff, out, doc, blurBijVerwijderen, los, veld, tekst, typ, naar, concepten, patches, rel };
}
const ONGELDIGE_JSON = Symbol('ongeldige JSON');
const rust = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const isPatch = (q) => q.method === 'PATCH';

// ── Versiegeschiedenis (productpunt 16): synthetische DOM + nep-fetch voor de ECHTE historieconsumenten ──
// Elk element heeft innerHTML (geparst tot platte kindelementen met attributen, zoals maakDom) én via
// appendChild toegevoegde kinderen; document.getElementById/querySelector(All) zoeken over beide.
function maakHistDom() {
  class HEl {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase(); this._a = attrs; this.style = {}; this._html = ''; this._els = []; this.kids = []; this.parent = null;
      this._lst = {}; this.onclick = null; this.textContent = ''; this.value = attrs.value != null ? attrs.value : ''; this.disabled = 'disabled' in attrs;
    }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; }
    setAttribute(k, v) { this._a[k] = String(v); }
    get id() { return this._a.id || ''; }
    set id(v) { this._a.id = String(v); }
    get className() { return this._a.class || ''; }
    set className(v) { this._a.class = String(v); }
    get classList() { const c = (this._a.class || '').split(/\s+/).filter(Boolean); return { contains: (x) => c.includes(x) }; }
    matches(sel) { return selectorPast(this, sel); }
    get innerHTML() { return this._html; }
    set innerHTML(h) { this._html = String(h); this._els = parse(this._html); this._els.forEach((e) => { e.parent = this; }); }
    alle() { return [...this._els, ...this.kids.flatMap((k) => [k, ...k.alle()])]; }
    querySelectorAll(sel) { return this.alle().filter((e) => e.matches(sel)); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    appendChild(k) { k.parent = this; this.kids.push(k); return k; }
    removeChild(k) { this.kids = this.kids.filter((x) => x !== k); k.parent = null; return k; }
    remove() { if (this.parent) this.parent.removeChild(this); }
    addEventListener(t, f) { (this._lst[t] = this._lst[t] || []).push(f); }
    klik() { const ev = { target: this }; const r = []; if (typeof this.onclick === 'function') r.push(this.onclick(ev)); (this._lst.click || []).forEach((f) => r.push(f(ev))); return Promise.all(r); }
  }
  function parse(h) {
    const els = []; const re = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g; let m;
    while ((m = re.exec(h))) {
      const attrs = {};
      m[2].replace(/\s([a-zA-Z-]+)(?:="([^"]*)")?/g, (_, k, v) => { attrs[k.toLowerCase()] = v == null ? '' : ontEsc(v); return ''; });
      const el = new HEl(m[1], attrs);
      if (el.tagName === 'TEXTAREA') { const eind = h.indexOf('</textarea>', re.lastIndex); el.value = ontEsc(h.slice(re.lastIndex, eind)); re.lastIndex = eind; }
      els.push(el);
    }
    return els;
  }
  const body = new HEl('body');
  const doc = {
    body, createElement: (t) => new HEl(t),
    getElementById: (id) => body.alle().find((e) => e.id === id) || null,
    querySelectorAll: (sel) => body.alle().filter((e) => e.matches(sel)),
  };
  const sectie = (id, html) => { const el = body.appendChild(new HEl('div', { id })); if (html != null) el.innerHTML = html; return el; };
  // Getypte, nog niet opgeslagen documenttekst elders op het scherm: mag door geen historieconsument veranderen.
  const getypt = body.appendChild(new HEl('textarea', { id: 'getypte-tekst' }));
  getypt.value = 'Handmatig getypte documenttekst, nog niet opgeslagen';
  return { doc, body, sectie, getypt };
}
const hAntw = (status, json) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });
// Alle leesuitkomsten die géén historie zijn (backend 16: veilige 5xx bij DB-leesfout; bestaande 401/403).
const H_FOUT = {
  'HTTP 500': () => hAntw(500, { error: 'Documentgeschiedenis kon niet worden gelezen' }),
  'HTTP 401': () => hAntw(401, { error: 'Niet geautoriseerd' }),
  'HTTP 403': () => hAntw(403, { error: 'Geen toegang' }),
  netwerkfout: () => Promise.reject(new TypeError('Failed to fetch')),
  'ongeldige JSON': () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }),
  'geen array (200 {…})': () => hAntw(200, { versies: [{ id: 'x', doc_type: 'bem' }] }),
  'geen array (200 null)': () => hAntw(200, null),
};
const uitgesteld = () => { let los; const p = new Promise((r) => { los = r; }); return { p, los }; };
// Context met de ECHTE esc (mna/02) en leesVersieLijst (mna/05) plus de opgegeven bronfragmenten.
function laadHist(root, fragmenten, extra) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src05 = lees(root, 'mna/05-documentflow-partijen.js');
  const dom = maakHistDom();
  const st = { verzoeken: [], hist: () => hAntw(200, []), anders: {}, consoleFout: [], toasts: [] };
  const fetch = (url, o = {}) => {
    const pad = String(url).replace(WORKER_T, '');
    st.verzoeken.push({ pad, opts: o });
    if (/^\/mna\/versies\//.test(pad)) return st.hist(pad, o);
    for (const k of Object.keys(st.anders)) if (pad.startsWith(k)) return st.anders[k](pad, o);
    return Promise.reject(new Error('onverwacht synthetisch verzoek ' + pad));
  };
  const ctx = vm.createContext({
    WORKER: WORKER_T, document: dom.doc, window: {}, fetch,
    console: { error: (...a) => st.consoleFout.push(a.map(String).join(' ')), log() {}, warn() {} },
    toast: (msg, type) => st.toasts.push({ msg: String(msg), type }),
    confirm: () => false, printDoc: () => {},
    ...extra(dom, st),
  });
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), knip(src05, 'async function leesVersieLijst(url, opts) {', '\n}\n'), ...fragmenten(root)].join('\n'), ctx, { filename: 'versiegeschiedenis' });
  const hist = () => st.verzoeken.filter((v) => /^\/mna\/versies\//.test(v.pad));
  return { ctx, dom, st, hist };
}
const tot = (src, begin, eind) => { const s = knip(src, begin, eind); return s.slice(0, s.length - eind.length); };

// ── J. demo.html (verborgen presentatie): minimale synthetische DOM voor het ECHTE inline script ──
// Alleen de id's die gate/initDeck/render gebruiken; .slide/.dot worden uit de gezette innerHTML
// afgeleid. Geen browser, geen netwerk: fetch is een nep die het opgegeven antwoord teruggeeft.
const DEMO_PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const DEMO_STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
// Bestaande slides (productie 628b0e8) in volgorde: eyebrow, titel en een kenmerkend fragment uit html.
const DEMO_BESTAAND = [
  ['Koers voor Morgen', 'Eén platform voor het hele overnametraject', 'class="hero-row"'],
  ['De rollen', 'Iedereen ziet alleen wat voor hem bedoeld is', 'class="rollen-grid" style="grid-template-columns:repeat(4,1fr)"'],
  ['Voor wie', 'Gebouwd voor meerdere sectoren', 'class="sector-grid"'],
  ['Startpunt', 'Een traject is in enkele minuten opgezet', 'persoonlijke toegangscode voor de verkoper'],
  ['Het dossier', 'Eén due diligence-dossier, in zeven fases', 'class="fasen-rij"'],
  ['Werkwijze', 'Een tool die u door het traject heen leidt', 'niet als een archiefkast'],
  ['Documenten', 'Elk document bouwt voort op wat er al is ingevuld', 'class="flow-rij"'],
  ['Eigen specialisten', 'Een specialist toevoegen, wanneer u dat wilt', 'pool van Bisschops Financing'],
  ['Waardering', 'Een onderbouwde waardering, geen gok', 'De opbrengst-brug &middot; fictief rekenvoorbeeld'],
  ['Meerdere kopers', 'Biedingen naast elkaar, op basis van dezelfde cijfers', 'class="compare-table"'],
  ['Vertrouwelijkheid', 'Toegang die meegroeit met het traject', 'class="unlock-rij"'],
  ['Beveiliging', 'Onder de motorkap net zo zorgvuldig', 'Europese datacenters (Frankfurt)'],
  ['Wat dit platform onderscheidt', 'Herleidbaar, van cijfer tot handtekening', 'vingerafdruk van de inhoud'],
  ['Tot slot', 'Klaar om te beginnen?', 'Neem contact op met Bisschops Financing'],
];
const DEMO_JOURNEY_TITEL = 'Zeven fasen, één route voor iedere rol';
const DEMO_TITEL = 'KVM – De volgende generatie M&A-platforms';
const DEMO_KERN = 'Andere platforms organiseren en beheren de deal. KVM stuurt en begeleidt de deal.';
const DEMO_NUANCE = 'Indicatieve positionering, geen ranglijst. Ook andere platforms bieden AI en workflow; bereik overlapt.';
const DEMO_BRONNEN = ['https://dealroom.net/product', 'https://www.datasite.com/en', 'https://www.intralinks.com/products/dealcentre-ai', 'https://www.ansarada.com/deals'];

function demoScript(src) {
  const m = src.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('niet gevonden in bron: demo.html <script>');
  return m[1];
}
function laadDemo(root, { search = '', antwoord = () => Promise.resolve({ ok: false, status: 401 }) } = {}) {
  const fetches = [];
  const doc = {};
  let fullscreen = 0;
  const el = (id) => { const h = {}; return { id, h, style: {}, textContent: '', value: '', disabled: false, onclick: null, addEventListener(t, f) { (h[t] = h[t] || []).push(f); } }; };
  const els = Object.fromEntries(['gate', 'gate-btn', 'gate-key', 'gate-err', 'deck', 'stage', 'dots', 'slide-teller', 'prev-btn', 'next-btn', 'fullscreen-btn'].map((i) => [i, el(i)]));
  const kinderen = { slide: [], dot: [] };
  const ontleed = (html, cls) => [...html.matchAll(new RegExp('class="' + cls + '" data-i="(\\d+)"', 'g'))].map((m) => {
    const k = el(cls); k.dataset = { i: m[1] }; k.actief = false;
    k.classList = { toggle: (c, aan) => { if (c === 'actief') k.actief = !!aan; } };
    return k;
  });
  [['stage', 'slide'], ['dots', 'dot']].forEach(([id, cls]) => {
    let v = '';
    Object.defineProperty(els[id], 'innerHTML', { get: () => v, set: (x) => { v = String(x); kinderen[cls] = ontleed(v, cls); } });
  });
  const document = {
    getElementById: (i) => els[i] || null,
    querySelectorAll: (s) => (s === '.slide' ? kinderen.slide : s === '.dot' ? kinderen.dot : []),
    addEventListener(t, f) { (doc[t] = doc[t] || []).push(f); },
    fullscreenElement: null,
    documentElement: { requestFullscreen: () => { fullscreen++; return Promise.resolve(); } },
    exitFullscreen: () => Promise.resolve(),
  };
  const ctx = vm.createContext({ document, location: { search }, URLSearchParams, fetch: (url, opts) => { fetches.push({ url, opts }); return antwoord(); } });
  vm.runInContext(demoScript(lees(root, 'demo.html')), ctx, { filename: 'demo.html#script' });
  const slides = vm.runInContext('SLIDES', ctx);
  return { ctx, els, kinderen, fetches, doc, slides, fullscreen: () => fullscreen, huidige: () => vm.runInContext('huidige', ctx) };
}

// ── K. Verkoopmemorandum-lifecycle (B2): synthetische backend volgens het B1-contract van worker/19b ──
// Alleen de velden en uitkomsten uit docs/verkoopmemorandum-lifecycle.md (backend): opslaan (concept,
// of nieuw_concept + definitief_sha256 op een definitief memorandum), definitief (tekst_sha256 +
// vastgesteld_door + tekst), 409 DEFINITIEF/VEROUDERD, snapshots als mna_wijzigingen-rijen. De hash
// rekent de server hier met node:crypto, los van de browserimplementatie in mna/04.
const VM_BG = CODES.tussen;
const vmHash = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
function maakVmServer(start = {}) {
  const s = { tekst: start.tekst == null ? null : start.tekst, status: start.status || null, snaps: [], log: [], hold: new Set(), wacht: [], eenmalig: {}, auditZichtbaar: true, genereer: null };
  const a = (status, json) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });
  const geenToegang = () => a(401, { error: 'Unauthorized' });
  s.verwerk = (pad, o) => {
    const body = o.body ? JSON.parse(o.body) : {};
    const key = (o.headers || {})['x-tussen-key'];
    if (pad === '/mna/verkoopmemorandum/opslaan') {
      if (key !== VM_BG) return geenToegang();
      if (!body.code || !body.tekst) return a(400, { error: 'Code en tekst verplicht' });
      if (s.status === 'definitief') {
        const dh = vmHash(s.tekst);
        if (body.nieuw_concept !== true) return a(409, { error: 'Het verkoopmemorandum is definitief vastgesteld en wordt niet overschreven. Open expliciet een nieuw concept (nieuw_concept + definitief_sha256).', code: 'DEFINITIEF', status: 'definitief', tekst_sha256: dh });
        if (body.definitief_sha256 !== dh) return a(409, { error: 'De definitieve tekst is gewijzigd sinds u deze laadde. Herlaad en probeer opnieuw.', code: 'VEROUDERD', status: 'definitief', tekst_sha256: dh });
        s.tekst = body.tekst.trim(); s.status = 'bewerkt';
        return a(200, { ok: true, status: 'bewerkt', nieuw_concept: true, tekst_sha256: vmHash(s.tekst), basis_definitief_sha256: dh, audit_id: 'WZNC' + s.snaps.length });
      }
      s.tekst = body.tekst.trim(); s.status = 'bewerkt';
      return a(200, { ok: true, status: 'bewerkt', tekst_sha256: vmHash(s.tekst) });
    }
    if (pad === '/mna/verkoopmemorandum/definitief') {
      if (!/^[0-9a-f]{64}$/.test(body.tekst_sha256 || '') || !String(body.vastgesteld_door || '').trim()) return a(400, { error: 'Ongeldige invoer.', code: 'ONGELDIGE_INVOER' });
      if (key !== VM_BG) return geenToegang();
      if (!s.tekst) return a(409, { error: 'Er is nog geen opgeslagen verkoopmemorandum om vast te stellen.', code: 'GEEN_MEMORANDUM' });
      const h = vmHash(s.tekst);
      if (body.tekst_sha256 !== h || (body.tekst !== undefined && body.tekst.trim() !== s.tekst)) return a(409, { error: 'De opgeslagen memorandumtekst wijkt af van de tekst die u wilt vaststellen. Herlaad en controleer opnieuw.', code: 'VEROUDERD', status: s.status || 'concept', tekst_sha256: h });
      const l = s.snaps[s.snaps.length - 1];
      if (s.status === 'definitief') return a(200, { ok: true, status: 'definitief', definitief_versie: l.versie, tekst_sha256: l.hash, audit_id: l.id, vastgesteld_door: l.door, vastgesteld_op: l.op, al_definitief: true });
      const v = (l ? l.versie : 0) + 1;
      const sn = { id: 'WZDEF' + v, versie: v, hash: h, tekst: s.tekst, door: String(body.vastgesteld_door).trim(), op: Date.UTC(2026, 9, 14, 10, v) };
      s.snaps.push(sn); s.status = 'definitief';
      return a(200, { ok: true, status: 'definitief', definitief_versie: v, tekst_sha256: h, audit_id: sn.id, vastgesteld_door: sn.door, vastgesteld_op: sn.op, al_definitief: false });
    }
    if (pad === '/mna/verkoopmemorandum/email') { if (key !== VM_BG) return geenToegang(); return a(200, { ok: true }); }
    if (pad === '/mna/verkoopmemorandum/genereer') {
      if (key !== VM_BG) return geenToegang();
      if (s.status === 'definitief') return a(409, { error: 'Het verkoopmemorandum is definitief vastgesteld.', code: 'DEFINITIEF', status: 'definitief' });
      const g = s.genereer || { ok: true, tekst: 'Synthetisch gegenereerd memorandum', readiness: { warnings: [] } };
      if (!g.ok) return a(400, { error: g.error, code: 'ONVOLDOENDE_DATA', readiness: g.readiness });
      s.tekst = g.tekst; s.status = 'gegenereerd';
      return a(200, { ok: true, verkoopmemorandum_tekst: g.tekst, readiness: g.readiness, ...(g.intern_ontbrekend ? { intern_ontbrekend: g.intern_ontbrekend } : {}) });
    }
    if (pad === '/mna/traject/' + VM_BG) return a(200, { traject: { verkoopmemorandum_tekst: s.tekst, verkoopmemorandum_status: s.status }, rol: 'begeleider' });
    if (pad === '/mna/wijzigingen/' + VM_BG) {
      if (key !== VM_BG) return geenToegang();
      return a(200, { wijzigingen: (s.auditZichtbaar ? s.snaps : []).map((sn) => ({ id: sn.id, type: 'verkoopmemorandum_definitief', rol: 'begeleider', auteur_naam: sn.door, created_at: sn.op, document_id: sn.hash,
        nieuwe_waarde: JSON.stringify({ schema: 'verkoopmemorandum-lifecycle/1', actie: 'definitief', definitief_versie: sn.versie, tekst_sha256: sn.hash, tekst: sn.tekst, verzonden: false, juridisch_goedgekeurd: false }) })).reverse() });
    }
    return null;
  };
  return s;
}
function laadVerkoopmemo(root, { traject, server, bgKey = VM_BG } = {}) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
  const srv = server || maakVmServer();
  const timers = new Map(); let tid = 1;
  const klok = { setTimeout: (fn) => { const id = tid++; timers.set(id, fn); return id; }, clearTimeout: (id) => { timers.delete(id); },
    vuur: () => { const f = [...timers.values()]; timers.clear(); f.forEach((x) => x()); }, get open() { return timers.size; } };
  const fetch = (url, o = {}) => {
    const pad = String(url).replace(WORKER_T, '');
    srv.log.push({ pad, body: o.body ? JSON.parse(o.body) : null, headers: o.headers || {} });
    if (srv.eenmalig[pad]) { const k = srv.eenmalig[pad]; delete srv.eenmalig[pad]; return k(); }
    const run = () => { const r = srv.verwerk(pad, o); return r || Promise.reject(new Error('onverwacht synthetisch verzoek ' + pad)); };
    if (srv.hold.has(pad)) {
      return new Promise((res, rej) => {
        srv.wacht.push({ pad, los: () => res(run()) });
        if (o.signal) o.signal.addEventListener('abort', () => rej(new Error('AbortError')));
      });
    }
    return Promise.resolve().then(run);
  };
  const els = {};
  const out = { id: 'bg-verkoopmemo-out', style: {}, classList: { add() {}, remove() {} }, scrollIntoView() {}, offsetWidth: 0 };
  let html = '';
  Object.defineProperty(out, 'innerHTML', {
    get() { return html; },
    set(h) {
      html = String(h);
      Object.keys(els).forEach((k) => delete els[k]);
      for (const m of html.matchAll(/<(\w+)([^>]*)\bid="([^"]+)"([^>]*)>/g)) {
        const at = m[2] + m[4];
        const v = /\bvalue="([^"]*)"/.exec(at);
        const el = { id: m[3], tag: m[1], style: {}, value: v ? ontEsc(v[1]) : '', checked: false, disabled: /\sdisabled\b/.test(at), readOnly: /\sreadonly\b/.test(at), textContent: '', onclick: null };
        if (m[1] === 'textarea') el.value = ontEsc(html.slice(m.index + m[0].length, html.indexOf('</textarea>', m.index)));
        els[m[3]] = el;
      }
    },
  });
  const st = { toasts: [], prints: [] };
  const S = { code: VM_BG, _bgKey: bgKey, traject: { kantoor_naam: 'Synthetisch Kantoor BV', nda_getekend: true, ...(traject || {}) } };
  const ctx = vm.createContext({
    AbortController, setTimeout: klok.setTimeout, clearTimeout: klok.clearTimeout, fetch, WORKER: WORKER_T, S,
    document: { getElementById: (id) => (id === out.id ? out : els[id] || null) },
    toast: (msg, type) => st.toasts.push({ msg: String(msg), type }),
    printDoc: (tekst, titel, docType) => st.prints.push({ tekst, titel, docType }),
    crypto: webcrypto, TextEncoder,
  });
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src04, /^function bgToonUitvoer\(el\)\{[\s\S]*?\n\}/m, 'bgToonUitvoer'), tot(src04, 'async function toonVerkoopmemoModal(){', 'async function toonClosingModal(){')].join('\n'), ctx, { filename: 'mna/04#verkoopmemorandum-lifecycle' });
  const calls = (p) => srv.log.filter((c) => c.pad === p);
  const klik = (id) => { const e = els[id]; if (!e || typeof e.onclick !== 'function') throw new Error('knop ontbreekt: ' + id); return e.onclick.call(e); };
  return { ctx, S, srv, out, els, st, klok, calls, klik, open: () => ctx.toonVerkoopmemoModal() };
}
const VM_OPS = '/mna/verkoopmemorandum/opslaan', VM_DEFP = '/mna/verkoopmemorandum/definitief', VM_GEN = '/mna/verkoopmemorandum/genereer', VM_MAIL = '/mna/verkoopmemorandum/email';
const VM_TRAJ = '/mna/traject/' + VM_BG, VM_WZ = '/mna/wijzigingen/' + VM_BG;
const wachtOp = async (f, n = 300) => { for (let i = 0; i < n && !f(); i++) await new Promise((r) => setTimeout(r, 2)); return !!f(); };
const even = () => new Promise((r) => setTimeout(r, 25));

// ── Dealvoorstel-cijferlijst (mna/04, productpunt 13 §31 fase 1b) ──
// Contract van worker/19b dvValideerCijfers / worker/04 cijferOpmaak, hier nagebouwd voor de toets.
const DV_SLEUTEL_RE = /^[a-z][a-z0-9_]{0,59}$/;
const DV_EENHEDEN = ['eur', 'pct', 'multiple', 'aantal', 'jaar', 'tekst'];
const DV_HOOFD = WORKER_T + '/mna/dealvoorstel/hoofdstukken/genereer';
const DV_BIJL = WORKER_T + '/mna/dealvoorstel/bijlage/genereer';
const DV_BRON_MELDING = 'De AI-tekst bevatte een cijfer dat niet uit de berekening komt; er is niets overgenomen. Probeer opnieuw.';
function dvContractFouten(lijst) {
  const f = [];
  if (!Array.isArray(lijst) || !lijst.length || lijst.length > 300) return ['geen niet-lege lijst van max. 300'];
  const gezien = new Set();
  lijst.forEach((c, i) => {
    const plek = i + ' (' + (c && c.sleutel) + ')';
    if (!c || typeof c !== 'object' || Object.keys(c).sort().join() !== 'eenheid,label,sleutel,waarde') f.push(plek + ': velden');
    if (!DV_SLEUTEL_RE.test(c.sleutel)) f.push(plek + ': sleutelpatroon');
    if (gezien.has(c.sleutel)) f.push(plek + ': dubbel');
    gezien.add(c.sleutel);
    if (typeof c.label !== 'string' || !c.label || c.label.length > 120) f.push(plek + ': label');
    if (!DV_EENHEDEN.includes(c.eenheid)) f.push(plek + ': eenheid');
    if (c.eenheid === 'tekst') { if (typeof c.waarde !== 'string' || !c.waarde.trim() || c.waarde.length > 120) f.push(plek + ': tekstwaarde'); }
    else if (typeof c.waarde !== 'number' || !Number.isFinite(c.waarde) || !/^-?\d+(\.\d+)?$/.test(String(c.waarde))) f.push(plek + ': geen eenduidig getal');
    else if (c.eenheid === 'eur' && !Number.isInteger(c.waarde)) f.push(plek + ': bedrag niet zoals in de context (Math.round)');
    else if (c.eenheid === 'jaar' && !/^\d{4}$/.test(String(c.waarde))) f.push(plek + ': jaar');
  });
  return f;
}
// Synthetische rekenkernresultaten met decimalen, zodat elke (ontbrekende of extra) afronding zichtbaar wordt.
const DV_REKEN = {
  closing: { evBasis: 4567890.4, deelKoperBasis: 2740734.2 },
  opbrengstBrug: { ev: 4567890.4, nettoSchuld: 350000.6, debtLike: 25000.2, wcCorrectie: -12000.7, transactiekosten: 91357.81, transactiekostenPct: 2, equityValue100: 4113532.3, belangPct: 60, verkochtBelangWaarde: 2468119.4, escrowBedrag: 296174.3, earnOutAan: true, earnOutUitgesteld: 493623.9, cashBijClosing: 1678321.2, verwachteGerealiseerd: 2468119.4 },
  verkBedr: { toegerekendeEVVerkochtBelang: 2740734.2, verkopersopbrengstCashClosing: 1678321.2, verkopersopbrengstVerwacht: 2468119.4, retainedEquity: 1645412.9, earnUpEVAllocation: 300000.5, earnUpSellerConsideration: 270000.4 },
  zopa: { totaal: 4383532.7, zekerNu: 1678321.2, pctZekerBijClosing: 38.287, escrow: 296174.3, pctEscrow: 6.756, voorwaardelijk: 763624.3, pctVoorwaardelijk: 17.42, earnOut: 493623.9, earnUp: 270000.4, vendorLoan: 0, behoudenBelangWaarde: 1645412.9, pctBehoudenBelang: 37.537, earnUpEVAllocation: 300000.5, evNaarEquityFactor: 0.9005 },
  dcf: { geldig: true, evDcf: 5012345.5 },
  earnOut: { earnBase: 2468119.4, vastBedrag: 1974495.5, earnOutTotaal: 493623.9, jaarlijks: 164541.3 },
  ruilverhouding: { waardeVerkoperDeel: 2468119.4, koperswaardeExtern: 4936238.8, pctVerkoper: 33.33333, pctKoper: 66.66667, nieuweAandelen: 500, aandelenKoperAantal: 1000 },
  altWaardering: { intrinsiek: 1500000.4, liquidatiewaarde: null, goodwill: 400000.6, nettowinstNorm: 600000.2, normaleWinst: 120000.4, overwinst: 479999.8 },
  synergie: { npv: 812345.5 },
  scenarios: [
    { label: 'Downside', groeiPct: -1.04, ebitdaEind: 900000.6, waardeLaag: 4000000.4, waardeHoog: 5000000.6 },
    { label: 'Base', groeiPct: 2.5, ebitdaEind: 950000.2, waardeLaag: 4500000.5, waardeHoog: 5500000.5 },
    { label: 'Upside', groeiPct: 6.04, ebitdaEind: 1100000.7, waardeLaag: 5000000.4, waardeHoog: 6000000.6 },
  ],
  mr: { onvoldoendeData: false, band: 'midden', totaal: 7, maxTotaal: 16 },
  batna: { status: 'krap', walkAway: 2300000.4, cashNu: 1678321.2, margeCash: -621678.8, totaalVerkocht: 2468119.4, margeTotaal: 168119.6, batnaKeuze: 'later', batnaWaarde: 1900000.5, tijdsdruk: 'midden' },
};
const DV_INVOER = {
  'dv-koper': 'Koper 2026 Holding BV', 'dv-belang': '60', 'dv-ebitda-bewezen': '812345.6', 'dv-ebitda-prognose': '900000.4', 'dv-cliff': '70',
  'dv-mult-basis': '5.5', 'dv-mult-boven': '6.25', 'dv-eo-pct': '20', 'dv-eo-target': '5.5', 'dv-eo-jaren': '3', 'dv-escrow-pct': '12', 'dv-escrow-mnd': '18',
  'dv-txkosten': '2', 'dv-leverage': '2.5', 'dv-vpb': '25.8', 'dv-groei': '2.5', 'dv-horizon': '5', 'dv-discontovoet': '11.5',
  'dv-syn-kosten': '100000.5', 'dv-syn-omzet': '50000.4', 'dv-syn-realisatie': '2', 'dv-syn-implementatie': '75000.6', 'dv-scen-delta': '3.5',
  'dv-dcfgv-wacc': '2', 'dv-dcfgv-groei': '1', 'dv-goodwill-normrendement': '8', 'dv-goodwill-kapitalisatie': '25',
};
const DV_AAN = ['dv-eo-aan', 'dv-alt-aan', 'dv-syn-aan', 'dv-scen-aan', 'dv-dcfgv-aan'];
function laadDealvoorstel(root, antwoorden) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
  const helpers = tot(src04, '  function dvBouwCijfers(p,r){', '  // ===== DEALVOORSTEL: parameterformulier + generatie =====');
  const modal = tot(src04, '  function toonDealvoorstelModal(){', '  // ===== INDICATIEVE BIEDING');
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, value: '', checked: false, disabled: false, textContent: '', innerHTML: '', style: {}, onclick: null, onchange: null });
  Object.entries(DV_INVOER).forEach(([k, v]) => { el(k).value = v; });
  DV_AAN.forEach((k) => { el(k).checked = true; });
  // Uitvoerblok bestaat al op de pagina; op het foutpad vraagt mna/04 het (terecht) niet op.
  el('bg-doc-out');
  const calls = [], toasts = [];
  const R = DV_REKEN;
  const ctx = {
    S: { code: CODES.tussen, _bgKey: CODES.tussen, traject: { kantoor_naam: 'Synthetisch Kantoor 7 BV', traject_type: 'Verkoop' }, data: {}, _groepData: {} },
    WORKER: WORKER_T,
    document: {
      body: { appendChild() {}, removeChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
      getElementById: el,
    },
    toast: (m, t) => toasts.push({ msg: String(m), type: t }),
    fmtGeld: (n) => String(n),
    dvGetDefaults: () => ({ grondslag: 'ebitda', koperNaam: '' }),
    getSectorProfiel: () => ({ label: 'Accountancy' }),
    dvBerekenPrijsmechanisme: () => ({}), dvBerekenClosing: () => R.closing, dvBerekenSchuldafbouw: () => [{}], dvBerekenBuyAndBuild: () => null,
    dvBerekenVendorLoan: () => null, dvBerekenRuilverhouding: () => R.ruilverhouding, dvBerekenEarnOut: () => R.earnOut,
    dvBerekenAlternatieveWaarderingen: () => R.altWaardering, dvBerekenSynergie: () => R.synergie, dvBerekenScenarios: () => R.scenarios,
    dvBerekenDCFGevoeligheid: () => ({}), dvBerekenGevoeligheid: () => ({}), dvBerekenDCF: () => R.dcf, dvBerekenOpbrengstBrug: () => R.opbrengstBrug,
    dvVerkoperBedragen: () => R.verkBedr, dvBerekenZopaTradeSpace: () => R.zopa, dvBerekenBatna: () => R.batna, dvManagementRisico: () => R.mr,
    dvBouwRapportHtml: (t) => '<p>' + t + '</p>',
    akkoordHtmlDv: () => '', eigenPdfHtml: () => '', bgToonUitvoer: () => {}, wireAkkoord: () => ({ setOverride() {} }), wireEigenPdf: () => {},
    printDealvoorstel: () => {}, toonRelianceAkkoord: () => {}, dvHtmlNaarTekst: (h) => h,
    fetchMetTimeout: (url, opts, ms) => {
      calls.push({ url, opts, ms, body: JSON.parse(opts.body) });
      const [status, json] = antwoorden[url] || [500, {}];
      return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });
    },
  };
  [...new Set([...modal.matchAll(/\b(dv(?:Tabel|Blok)\w+)\(/g)].map((m) => m[1]))].forEach((n) => { ctx[n] = () => ''; });
  vm.createContext(ctx);
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), helpers, modal].join('\n'), ctx, { filename: 'mna/04#dealvoorstel' });
  return {
    ctx, els, calls, toasts,
    async genereer() { ctx.toonDealvoorstelModal(); await els['dv-ok'].onclick.call(els['dv-ok']); },
  };
}

export async function draaiDocumentOutputSecurityChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const tryCheck = (naam, f) => { try { f(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.message) || e)); } };

  // ── A. mdToHtml (mna/02) ──
  tryCheck('mdToHtml', () => {
    const { mdToHtml } = laadMd(root);
    const kwaad = '## Samenvatting\n\nSynthetische tekst <img src=x onerror=alert(1)><script>alert(2)</script> <a href="javascript:alert(3)" onclick="x()">klik</a> <svg onload=alert(4)></svg>\n\nZeg "hoi" & \'doei\' <!-- c -->';
    const h = mdToHtml(kwaad);
    const f = inert(h, MD_TAGS);
    check(!f.length, 'mdToHtml: alleen eigen statische opmaaktags, geen bron-HTML/attributen als markup' + (f.length ? ' — ' + f.join('; ') : ''));
    check(!/onerror|onclick|onload|alert\(2\)|javascript:|<script|<img|<svg/i.test(h), 'mdToHtml: script/img/onerror/javascript:-URL niet in de uitvoer');
    check(/<h3>Samenvatting<\/h3>/.test(h) && /Synthetische tekst/.test(h) && /klik/.test(h), 'mdToHtml: leesbare inhoud rond weggelaten tags blijft');
    check(h.includes('Zeg &quot;hoi&quot; &amp; \'doei\''), 'mdToHtml: quotes en & als tekst geëscapet');

    const b = mdToHtml('Gegevens\n<b>Rechtsvorm</b>: B.V.<br>KvK: 12345678\n\nZetel: <strong>Plaats</strong> <em>let op</em> <i>synthetisch</i><br/>einde');
    check(b === '<p>Gegevens<br><strong>Rechtsvorm</strong>: B.V.<br>KvK: 12345678</p><p>Zetel: <strong>Plaats</strong> let op synthetisch<br>einde</p>'
      && !/&lt;|\*\*|<\/?b>|<\/?em>|<\/?i>/.test(b), 'mdToHtml: <b>Rechtsvorm</b>/<strong>/<em>/<i>/<br> leesbaar, zonder literale markers');
    const attr = mdToHtml('<b class="x" onclick="y()">Rechtsvorm</b> tekst');
    check(!/onclick|class=/.test(attr) && /Rechtsvorm tekst/.test(attr), 'mdToHtml: <b> mét attributen wordt niet als opmaak overgenomen (onvertrouwd → weggelaten)');

    const md = mdToHtml('# Kop\n\nAlinea met **vet** & tekst.\nTweede regel\n\n- een\n- twee\n\n1. eerste\n2) tweede\n\n| Veld | Status |\n|---|---|\n| Omzet | ok |\n\n---');
    check(md === '<h3>Kop</h3><p>Alinea met <strong>vet</strong> &amp; tekst.<br>Tweede regel</p><ul><li>een</li><li>twee</li></ul><ol><li>eerste</li><li>tweede</li></ol><p>Veld — Status</p><p>Omzet — ok</p>',
      'mdToHtml: bestaande Markdown-semantiek (kop, vet, alinea/regel, ul, ol, pipe-tabel, ---) ongewijzigd' + (md.startsWith('<h3>') ? '' : ' — ' + md));
    check(mdToHtml('') === '' && mdToHtml(null) === '', 'mdToHtml: lege invoer blijft leeg');
  });

  // ── B. printDocNaAkkoord (mna/05): body, titel, header, footer, logo ──
  tryCheck('print kwaadaardig', () => {
    const traject = { id: CODES.verkoper, koper_code: CODES.koper, tussen_code: CODES.tussen, publieke_referentie: REF,
      begeleider_bedrijf: 'Kantoor "><img src=x onerror=alert(3)>', begeleider_adres: '<script>alert(4)</script> Straat 1' };
    const r = print(root, '<img src=x onerror=alert(1)>\n\n<script>alert("x")</script>\n\n"quote" \' & <a href="javascript:alert(5)">klik</a>',
      'Titel <img src=x onerror=alert(2)>" onmouseover="x', 'nda', { traject, logo: LOGO_HTTPS });
    const f = inert(r.html, PRINT_TAGS);
    check(r.eff.html.length === 1 && !f.length, 'print: alleen eigen statische tags en gequote attributen (body/titel/bedrijf/adres inert)' + (f.length ? ' — ' + f.join('; ') : ''));
    const imgs = tags(r.html).filter((t) => t.naam === 'img');
    check(imgs.length === 1 && imgs[0].attrs.src === LOGO_HTTPS && imgs[0].attrs.alt === 'Kantoor &quot;&gt;&lt;img src=x onerror=alert(3)&gt;',
      'print: enige <img> is het logo; alt-tekst geëscapet (geen attribuutinjectie)');
    check(!/<(script|a|iframe|svg)\b/i.test(r.html) && tags(r.html).every((t) => !Object.keys(t.attrs).some((k) => /^on/.test(k)) && !/\bon[a-z]+\s*=/i.test(t.rest)),
      'print: geen script/a/handlers als markup');
    check(r.html.includes('<title>Titel &lt;img src=x onerror=alert(2)&gt;&quot; onmouseover=&quot;x</title>')
      && r.html.includes('<div class="doc-title">Titel &lt;img src=x onerror=alert(2)&gt;&quot; onmouseover=&quot;x</div>'), 'print: <title> en kop-titel geëscapet');
    check(r.html.includes('&quot;quote&quot; \' &amp; &lt;a href=&quot;javascript:alert(5)&quot;&gt;klik&lt;/a&gt;')
      && r.html.includes('<span>Kantoor &quot;&gt;&lt;img src=x onerror=alert(3)&gt; &middot; &lt;script&gt;alert(4)&lt;/script&gt; Straat 1</span>'),
      'print: overige bron-HTML en footer bedrijf/adres als inerte tekst');
  });

  tryCheck('print opmaak', () => {
    const tekst = 'Partij A\n<b>Rechtsvorm</b>: B.V.<br>KvK: 12345678\n\n<strong>Zetel</strong> Plaats <em>let op</em> <i>synthetisch</i>\n\n<b class="x">Attr</b>\n\n'
      + 'Artikel 1 Definities\nTekst bij artikel\n## Kop twee\nFUSIE & OVERNAME\n\n- een\n- twee\n\n**vet** blijft\n\nNaam: ____';
    const r = print(root, tekst, 'MoU &mdash; Synthetisch BV', 'nda', { traject: { publieke_referentie: REF } });
    const h = r.html;
    check(h.includes('<p>Partij A<br><strong>Rechtsvorm</strong>: B.V.<br>KvK: 12345678</p>') && h.includes('<p><strong>Zetel</strong> Plaats let op synthetisch</p>')
      && !/&lt;\/?(b|strong|em|i|br)&gt;|\*\*/.test(h.replace('<p>&lt;b class=&quot;x&quot;&gt;Attr&lt;/b&gt;</p>', '')), 'print: <b>Rechtsvorm</b>/<strong>/<em>/<i>/<br> leesbaar, zonder literale markers');
    check(h.includes('<p>&lt;b class=&quot;x&quot;&gt;Attr&lt;/b&gt;</p>'), 'print: <b> mét attribuut niet als opmaak, inert zichtbaar (zoals backend worker/36)');
    check(h.includes('<h3>Artikel 1 Definities</h3>') && h.includes('<h3>Kop twee</h3>') && /<h3>FUSIE &amp; OVERNAME\n?<\/h3>/.test(h)
      && h.includes('<ul><li>een</li><li>twee</li></ul>') && h.includes('<p><strong>vet</strong> blijft</p>') && /<p><span style="[^"]*">Naam:&nbsp;<span style="[^"]*">&nbsp;<\/span><\/span><\/p>/.test(h),
      'print: bestaande opmaak (Artikel/##/HOOFDLETTER-kop incl. &, lijst, **vet**, tekenregel) behouden');
    check(h.includes('<title>MoU &mdash; Synthetisch BV</title>') && h.includes('content:"CONCEPT"'), 'print: bewust meegegeven entiteit in titel (&mdash;) blijft werken; CONCEPT-watermerk voor nda');
    check(h.includes('<span>Synthetisch Kantoor BV &middot; Voorbeeldstraat 1, 1234AB Plaats</span>'), 'print: standaard-branding in footer ongewijzigd');
  });

  // ── C. Publieke referentie: juiste label, nooit een toegangscode/id ──
  tryCheck('print referentie', () => {
    const traject = { id: CODES.verkoper, koper_code: CODES.koper, tussen_code: CODES.tussen, publieke_referentie: REF };
    const r = print(root, 'Tekst', 'NDA', 'nda', { traject });
    check((kop(r.html).match(/Trajectreferentie: TR-ABCD-EFGH-JKLM-NPQR/g) || []).length === 1, 'referentie aanwezig: "Trajectreferentie: TR-…" precies één keer in de kop');
    check(!Object.values(CODES).some((c) => r.html.includes(c)), 'referentie aanwezig: geen verkoper-/koper-/tussencode of id in de uitvoer');
    [['ontbreekt', {}], ['leeg', { publieke_referentie: '' }], ['codevormig', { publieke_referentie: CODES.verkoper }],
      ['injectie', { publieke_referentie: 'TR-ABCD-EFGH-JKLM-NPQR<script>' }], ['geen string', { publieke_referentie: 123 }]].forEach(([naam, extra]) => {
      const t = { id: CODES.verkoper, koper_code: CODES.koper, tussen_code: CODES.tussen, ...extra };
      const x = print(root, 'Tekst', 'NDA', 'nda', { traject: t });
      check(x.html && !/Trajectreferentie/.test(x.html) && !Object.values(CODES).some((c) => x.html.includes(c)) && !/<script/i.test(x.html),
        'referentie ' + naam + ': geen label en geen terugval op S.code/id/koper/tussen');
    });
  });

  // ── D. Geen neveneffecten: geen API-write, geen opslag/credential, geen navigatie, S ongewijzigd ──
  tryCheck('print neveneffecten', () => {
    const traject = { id: CODES.verkoper, koper_code: CODES.koper, tussen_code: CODES.tussen, publieke_referentie: REF };
    const r = print(root, 'Tekst', 'NDA', 'nda', { traject });
    check(r.eff.fetch === 0 && r.eff.audit === 0 && r.eff.opslag === 0 && r.eff.open === 0 && r.eff.createElement === 0 && r.location.href === 'https://app.test/mna.html',
      'print: geen fetch/API-write, geen audit-/opslagschrijfactie, geen window.open/DOM/navigatie (alleen printHtmlDocument)');
    check(r.S.code === CODES.verkoper && r.S._bgKey === CODES.tussen && JSON.stringify(r.S.traject) === r.snap, 'print: S.code, sleutel en S.traject ongewijzigd');
  });

  // ── E. Logo-URL: werkende branding blijft, onveilige vormen vallen weg ──
  tryCheck('print logo', () => {
    [['https (R2-logoroute)', LOGO_HTTPS, true], ['base64-png', LOGO_B64, true],
      ['javascript:', 'javascript:alert(1)', false], ['data:text/html', 'data:text/html;base64,PHNjcmlwdD4=', false],
      ['quote-injectie', 'https://x.test/a.png" onerror="alert(1)', false], ['http', 'http://x.test/a.png', false]].forEach(([naam, url, verwacht]) => {
      const r = print(root, 'Tekst', 'Teaser', 'teaser', { traject: { begeleider_bedrijf: 'Eigen Kantoor' }, logo: url });
      const imgs = tags(r.html).filter((t) => t.naam === 'img');
      const goed = verwacht ? imgs.length === 1 && imgs[0].attrs.src === url && imgs[0].attrs.alt === 'Eigen Kantoor' : imgs.length === 0;
      check(goed && !inert(r.html, PRINT_TAGS).length, 'logo ' + naam + ': ' + (verwacht ? 'getoond met juiste src/alt' : 'niet getoond'));
    });
    // B2 (14 okt 2026): memorandumconcept mét CONCEPT-watermerk; alleen 'memo_definitief' zonder.
    const memo = print(root, 'Tekst', 'Verkoopmemorandum', 'memo', {});
    check(memo.html.includes('content:"CONCEPT"') && memo.html.includes('Conceptversie &mdash;'), 'memo (concept): CONCEPT-watermerk plus bestaande statusregel');
    const memoDef = print(root, 'Tekst', 'Verkoopmemorandum (definitieve versie 1)', 'memo_definitief', {});
    check(!memoDef.html.includes('content:"CONCEPT"') && !memoDef.html.includes('Conceptversie') && memoDef.html.includes('<div class="doc-title">Verkoopmemorandum (definitieve versie 1)</div>') && !inert(memoDef.html, PRINT_TAGS).length,
      'memo_definitief: geen watermerk en geen conceptregel, wel titel met versie; uitvoer inert');
    const teaserW = print(root, 'Tekst', 'Teaser', 'teaser', {});
    check(!teaserW.html.includes('content:"CONCEPT"'), 'teaser: ongewijzigd zonder watermerk');
  });

  // ── F. Statisch: printDocNaAkkoord leest geen toegangscodes meer ──
  tryCheck('statisch', () => {
    const fn = knip(lees(root, 'mna/05-documentflow-partijen.js'), 'function printDocNaAkkoord(tekst, titel, docType) {', '\n}\n');
    check(!/S\.code|koper_code|tussen_code|_bgKey|S\.traject\.id\b/.test(fn), 'mna/05 printDocNaAkkoord: geen S.code/koper_code/tussen_code/_bgKey/traject.id in de functie');
  });

  // ── G. Composer (mna/04, productpunt 19): onopgeslagen invoer bij blur, opslaan en hertekenen ──
  // Draait de ECHTE bgMouRender/bgMouWire/bgMouApi (plus esc uit mna/02) in node:vm met de synthetische
  // DOM hierboven, nep-fetch met vertraagde PATCH en synthetische documenten — geen netwerk, geen
  // browser, geen live API of AI. Dit is geen Chromium-bewijs; zie docs/document-output.md.
  const tryAsync = async (naam, f) => { try { await f(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.message) || e)); } };

  await tryAsync('composer twee velden', async () => {
    const t = laadComposer(root, { chromiumBlur: true });
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    check(t.veld('koper') && t.veld('verkoper') && t.tekst() && t.veld('koper').value === 'Koper Synthetisch BV' && t.tekst().value === 'Bestaande tekst A',
      'composer: echte bgMouRender toont twee velden en de vrije tekst van doc-A');
    t.typ(t.tekst(), 'Nieuwe vrije tekst, nog niet opgeslagen');
    t.typ(t.veld('koper'), 'Koper Nieuw BV');
    const s1 = t.naar(t.veld('koper'), t.veld('verkoper')); // blur A → vertraagde PATCH
    t.typ(t.veld('verkoper'), 'Verkoper Nieuw'); // B gefocust, nog niet geblurd
    check(t.srv.wachtrij.length === 1 && JSON.stringify(t.srv.wachtrij[0].body) === '{"data_values":{"koper":"Koper Nieuw BV"}}',
      'composer: blur van veld A stuurt alleen veld A (geen tekst, geen veld B)');
    t.los(isPatch, true); await s1; await rust();
    const A = t.veld('koper'), B = t.veld('verkoper'), T = t.tekst();
    check(A.value === 'Koper Nieuw BV' && A.getAttribute('aria-invalid') === null && A.title === '',
      'composer: na geslaagde opslag + hertekenen toont veld A de opgeslagen waarde, niet meer als onopgeslagen gemarkeerd');
    check(B.value === 'Verkoper Nieuw' && B.title === 'Nog niet opgeslagen', 'composer: ander dirty veld B overleeft het volledige hertekenen na de opslag van A');
    check(T.value === 'Nieuwe vrije tekst, nog niet opgeslagen' && T.title === 'Nog niet opgeslagen', 'composer: onopgeslagen vrije tekst (textarea) overleeft het hertekenen');
    check(t.doc.activeElement === B && B.selectionStart === 'Verkoper Nieuw'.length, 'composer: focus en cursor terug in het veld waarin werd getypt');
    check(t.blurBijVerwijderen.length === 1 && t.blurBijVerwijderen[0] === undefined && t.srv.wachtrij.length === 0 && t.patches().length === 1,
      'composer: Chromium-achtige blur van het verdwijnende veld tijdens hertekenen start geen ongevraagde opslag');
    const s2 = t.naar(B, null); t.los(isPatch, true); await s2; await rust();
    check(t.veld('verkoper').value === 'Verkoper Nieuw' && t.veld('verkoper').title === '' && t.tekst().value === 'Nieuwe vrije tekst, nog niet opgeslagen',
      'composer: daarna opgeslagen veld B is schoon; de vrije tekst staat nog als concept');
    const s3 = t.out.querySelector('.mou-text-save').onclick();
    check(t.srv.wachtrij.length === 1 && JSON.stringify(t.srv.wachtrij[0].body) === '{"text":"Nieuwe vrije tekst, nog niet opgeslagen"}', 'composer: "Tekst opslaan" stuurt uitsluitend de tekst');
    t.los(isPatch, true); await s3; await rust();
    const c = t.srv.docs['doc-A'].componenten[0];
    check(t.concepten('doc-A') === 0 && c.data_values.koper.value === 'Koper Nieuw BV' && c.data_values.verkoper.value === 'Verkoper Nieuw'
      && c.text === 'Nieuwe vrije tekst, nog niet opgeslagen' && t.tekst().title === '', 'composer: alle drie de invoeren via de bestaande PATCH opgeslagen; geen concepten meer over');
    check(t.patches().length === 3 && t.eff.opslag === 0 && !t.srv.verzoeken.some((v) => /\/concept$|finaliseer|verstuur/.test(v.pad)),
      'composer: precies drie PATCHes, geen localStorage/sessionStorage, geen AI-/finaliseer-/verstuurverzoek');
  });

  await tryAsync('composer oude opslag', async () => {
    const t = laadComposer(root, {});
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    t.typ(t.veld('koper'), 'Waarde 1');
    const s1 = t.naar(t.veld('koper'), t.veld('verkoper'));
    t.typ(t.veld('koper'), 'Waarde 2'); // terug in A en verder getypt terwijl opslag 1 nog loopt
    t.los(isPatch, true); await s1; await rust();
    const A = t.veld('koper');
    check(t.srv.docs['doc-A'].componenten[0].data_values.koper.value === 'Waarde 1' && A.value === 'Waarde 2' && A.title === 'Nog niet opgeslagen' && t.doc.activeElement === A,
      'composer: geslaagde OUDERE opslag (Waarde 1) overschrijft de nieuwere invoer (Waarde 2) niet; die blijft zichtbaar als onopgeslagen, met focus');
    const s2 = t.naar(A, null);
    check(t.srv.wachtrij.length === 1 && t.srv.wachtrij[0].body.data_values.koper === 'Waarde 2', 'composer: de volgende blur verstuurt de nieuwere waarde');
    t.los(isPatch, true); await s2; await rust();
    check(t.veld('koper').value === 'Waarde 2' && t.veld('koper').title === '' && t.concepten('doc-A') === 0, 'composer: na opslag van de nieuwere waarde schoon, geen concept meer');
    t.typ(t.tekst(), 'Tekst 1');
    const s3 = t.out.querySelector('.mou-text-save').onclick();
    t.typ(t.tekst(), 'Tekst 2');
    t.los(isPatch, true); await s3; await rust();
    check(t.srv.docs['doc-A'].componenten[0].text === 'Tekst 1' && t.tekst().value === 'Tekst 2' && t.tekst().title === 'Nog niet opgeslagen',
      'composer: vertraagde tekstopslag (Tekst 1) overschrijft de daarna getypte tekst (Tekst 2) niet');
  });

  await tryAsync('composer mislukte opslag', async () => {
    const t = laadComposer(root, {});
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    t.typ(t.veld('koper'), 'Fout waarde');
    const s1 = t.naar(t.veld('koper'), null);
    t.los(isPatch, false, { status: 500, error: 'Synthetische opslagfout <b>x</b>' }); await s1; await rust();
    const A = t.veld('koper'); const laatste = t.eff.toasts[t.eff.toasts.length - 1];
    check(A.value === 'Fout waarde' && A.getAttribute('aria-invalid') === 'true' && A.title.includes('Synthetische opslagfout'),
      'composer: mislukte opslag laat de invoer staan (niet stil teruggezet) en markeert het veld met de fout');
    check(laatste && laatste.type === 'err' && laatste.msg.includes('Synthetische opslagfout &lt;b&gt;x&lt;/b&gt;') && laatste.msg.includes('niet opgeslagen'),
      'composer: eerlijke foutmelding (geëscapet) die zegt dat de invoer niet is opgeslagen');
    check(t.srv.docs['doc-A'].componenten[0].data_values.koper.value === 'Koper Synthetisch BV', 'composer: server ongewijzigd na mislukte opslag');
    await t.ctx.bgMouRender();
    check(t.veld('koper').value === 'Fout waarde' && t.veld('koper').getAttribute('aria-invalid') === 'true', 'composer: na een volgende hertekening blijven invoer en foutmarkering staan');
    t.typ(t.tekst(), 'Tekst die niet lukt');
    const s2 = t.out.querySelector('.mou-text-save').onclick();
    t.los(isPatch, false, { status: 0, error: 'Verbindingsfout' }); await s2; await rust();
    check(t.tekst().value === 'Tekst die niet lukt' && t.tekst().getAttribute('aria-invalid') === 'true' && t.eff.toasts.some((x) => x.type === 'err' && x.msg.startsWith('Verbindingsfout')),
      'composer: mislukte tekstopslag houdt de tekst met zichtbare fout');
  });

  await tryAsync('composer documentwissel', async () => {
    const t = laadComposer(root, {});
    const lijst = [{ id: 'doc-A', current_version: 3, status: 'draft', created_at: 0 }, { id: 'doc-B', current_version: 1, status: 'draft', created_at: 0 }];
    await t.ctx.bgMouRender(lijst, undefined, 'MOU', 'doc-A');
    t.typ(t.veld('koper'), 'Concept alleen voor A');
    t.srv.houdVast = (m, p) => m === 'GET' && p === '/mna/tos/document/doc-B';
    const kies = t.doc.getElementById('mou-kies'); kies.value = 'doc-B';
    const wissel = kies.onchange.call(kies); await rust();
    t.typ(t.veld('koper'), 'Getypt tijdens wissel'); // het A-veld is nog zichtbaar terwijl doc-B laadt
    check(t.ctx._mouDocId === 'doc-A' && t.concepten('doc-B') === 0 && t.concepten('doc-A') === 1,
      'composer: invoer tijdens het laden van een ander document blijft bij het zichtbare doc-A (niet onder doc-B)');
    t.srv.houdVast = () => false;
    t.los((q) => q.pad === '/mna/tos/document/doc-B', true); await wissel; await rust();
    const B = t.veld('koper');
    check(t.ctx._mouDocId === 'doc-B' && B.getAttribute('data-iid') === 'i-b1' && B.value === 'Koper B BV' && B.title === '' && t.tekst().value === 'Tekst B'
      && !t.out.querySelectorAll('.mou-dv,.mou-text').some((e) => /Getypt|Concept alleen/.test(e.value)) && t.concepten('doc-B') === 0 && t.patches().length === 0,
      'composer: na documentwissel toont doc-B uitsluitend eigen waarden; een concept van doc-A wordt nooit overgedragen of opgeslagen');
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    check(t.veld('koper').value === 'Getypt tijdens wissel' && t.veld('koper').getAttribute('data-iid') === 'i-a1' && t.veld('koper').title === 'Nog niet opgeslagen',
      'composer: terug naar doc-A zet het concept terug in hetzelfde veld van hetzelfde document');
    t.typ(t.veld('verkoper'), 'Verkoper tijdens wissel');
    const s1 = t.naar(t.veld('verkoper'), null);
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-B');
    const getsVoor = t.srv.verzoeken.filter((v) => v.method === 'GET').length;
    t.los(isPatch, true); await s1; await rust();
    check(t.ctx._mouDocId === 'doc-B' && t.veld('koper').getAttribute('data-iid') === 'i-b1' && t.srv.verzoeken.filter((v) => v.method === 'GET').length === getsVoor
      && t.srv.docs['doc-A'].componenten[0].data_values.verkoper.value === 'Verkoper tijdens wissel' && t.srv.docs['doc-B'].componenten[0].data_values.verkoper.value === 'Verkoper B BV',
      'composer: late geslaagde opslag van doc-A na wissel naar doc-B schrijft alleen doc-A en hertekent doc-B niet');
    t.S.code = 'TSYN-TRAJECT-2';
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    check(t.veld('koper').value === 'Koper Synthetisch BV' && t.veld('koper').title === '', 'composer: concepten zijn per traject — onder een ander traject nooit toegepast');
  });

  await tryAsync('composer bevroren', async () => {
    const t = laadComposer(root, {});
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    t.typ(t.veld('koper'), 'Concept vóór finaliseren');
    t.typ(t.tekst(), 'Tekst vóór finaliseren');
    t.typ(t.veld('verkoper'), 'Verkoper vóór finaliseren');
    const s1 = t.naar(t.veld('verkoper'), null); // PATCH loopt nog
    Object.assign(t.srv.docs['doc-A'].document, { bevroren: true, status: 'exported' });
    await t.ctx.bgMouRender();
    const A = t.veld('koper');
    check(A.disabled && A.value === 'Koper Synthetisch BV' && A.title === '' && t.tekst().disabled && t.tekst().value === 'Bestaande tekst A' && t.veld('verkoper').value === 'Verkoper Synthetisch BV',
      'composer: bevroren document krijgt geen onopgeslagen concepten terug; velden disabled met de opgeslagen waarden');
    check(t.concepten('doc-A') === 0 && t.eff.toasts.some((x) => x.type === 'err' && x.msg.includes('3 niet-opgeslagen wijzigingen niet toegepast: dit document is vergrendeld')),
      'composer: eerlijke melding dat 3 onopgeslagen wijzigingen niet zijn toegepast; concepten van het bevroren document vervallen');
    t.los(isPatch, false, { status: 409, error: 'Document is gefinaliseerd en kan niet meer worden gewijzigd.' }); await s1; await rust();
    check(t.concepten('doc-A') === 0 && t.veld('verkoper').value === 'Verkoper Synthetisch BV' && t.patches().length === 1
      && t.eff.toasts.some((x) => x.type === 'err' && x.msg.startsWith('Document is gefinaliseerd')),
      'composer: late 409 na bevriezen toont de fout, maakt geen concept opnieuw aan en verstuurt niets opnieuw');
  });

  await tryAsync('composer AI/finaliseren', async () => {
    const t = laadComposer(root, {});
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    t.typ(t.tekst(), 'Eigen onopgeslagen tekst');
    await t.out.querySelector('.mou-concept').onclick();
    check(!t.srv.verzoeken.some((v) => /\/concept$/.test(v.pad)) && t.tekst().value === 'Eigen onopgeslagen tekst' && t.eff.toasts.some((x) => x.type === 'err' && x.msg.includes('niet-opgeslagen tekst')),
      'composer: geen AI-conceptverzoek zolang er onopgeslagen tekst in het onderdeel staat; de tekst blijft');
    await t.doc.getElementById('mou-finaliseer').onclick();
    check(t.eff.confirms.length === 1 && t.eff.confirms[0].includes('niet-opgeslagen wijzigingen (1)') && !t.srv.verzoeken.some((v) => /finaliseer/.test(v.pad)),
      'composer: finaliseren waarschuwt eerst voor onopgeslagen invoer; na annuleren geen finaliseerverzoek');
  });

  // Productpunt 19 vervolg (12 okt 2026): sluiten (mou-close) terwijl een opslag nog loopt, late
  // reactie, en expliciet heropenen via de echte bgMouComposer.
  await tryAsync('composer sluiten', async () => {
    const t = laadComposer(root, {});
    const gets = () => t.srv.verzoeken.filter((v) => v.method === 'GET').length;
    await t.ctx.bgMouComposer('MOU'); await rust();
    check(t.ctx._mouDocId === 'doc-A' && t.out.style.display === 'block' && t.veld('koper') && t.veld('koper').value === 'Koper Synthetisch BV',
      'composer sluiten: echte bgMouComposer opent doc-A');
    t.typ(t.tekst(), 'Tekst vóór sluiten');
    t.typ(t.veld('koper'), 'Koper vóór sluiten');
    const s1 = t.naar(t.veld('koper'), t.veld('verkoper'));
    t.typ(t.veld('verkoper'), 'Verkoper vóór sluiten');
    const s2 = t.naar(t.veld('verkoper'), null); // een klik op Sluiten blurt eerst het gefocuste veld
    t.doc.getElementById('mou-close').onclick();
    const g0 = gets(), gen0 = t.ctx._mouGen;
    check(t.out.style.display === 'none' && t.out.innerHTML === '' && t.srv.wachtrij.length === 2,
      'composer sluiten: Sluiten verbergt en leegt de composer terwijl twee veldopslagen nog lopen');
    t.los((q) => isPatch(q) && 'koper' in q.body.data_values, true); await s1; await rust();
    check(t.out.style.display === 'none' && t.out.innerHTML === '' && gets() === g0 && t.ctx._mouGen === gen0,
      'composer sluiten: late geslaagde opslag hertekent de gesloten composer niet (geen GET, geen nieuwe generatie, DOM blijft leeg)');
    t.los(isPatch, false, { status: 500, error: 'Synthetische late fout' }); await s2; await rust();
    check(t.out.style.display === 'none' && t.out.innerHTML === '' && t.eff.toasts.some((x) => x.type === 'err' && x.msg.startsWith('Synthetische late fout')),
      'composer sluiten: late mislukte opslag meldt de fout eerlijk maar heropent de gesloten composer niet');
    const c = t.srv.docs['doc-A'].componenten[0];
    check(c.data_values.koper.value === 'Koper vóór sluiten' && c.data_values.verkoper.value === 'Verkoper Synthetisch BV' && c.text === 'Bestaande tekst A' && t.concepten('doc-A') === 2,
      'composer sluiten: alleen de geslaagde opslag staat op de server; mislukt veld en vrije tekst blijven als lokaal concept bewaard');
    await t.ctx.bgMouComposer('MOU'); await rust();
    const A = t.veld('koper'), B = t.veld('verkoper'), T = t.tekst();
    check(t.out.style.display === 'block' && t.ctx._mouDocId === 'doc-A' && A.value === 'Koper vóór sluiten' && A.title === ''
      && B.value === 'Verkoper vóór sluiten' && B.getAttribute('aria-invalid') === 'true' && T.value === 'Tekst vóór sluiten' && T.title === 'Nog niet opgeslagen',
      'composer sluiten: expliciet heropenen van hetzelfde document toont de opgeslagen waarde en zet het mislukte veld (met fout) en de vrije tekst terug');
    check(t.patches().length === 2 && t.eff.opslag === 0 && !t.srv.verzoeken.some((v) => /\/concept$|finaliseer|verstuur/.test(v.pad)),
      'composer sluiten: sluiten en heropenen verzenden niets automatisch (geen extra PATCH, geen browseropslag, geen AI/finaliseren/versturen)');
    const s3 = t.out.querySelector('.mou-text-save').onclick(); t.los(isPatch, true); await s3; await rust();
    check(t.tekst().value === 'Tekst vóór sluiten' && t.tekst().title === '' && c.text === 'Tekst vóór sluiten',
      'composer sluiten: na heropenen hertekent een gewone opslag weer normaal');
  });

  await tryAsync('composer sluiten andere weergave', async () => {
    const t = laadComposer(root, {});
    t.srv.docs['doc-L'] = { document: { id: 'doc-L', status: 'draft', current_version: 1, bevroren: false }, componenten: [compSyn('i-l1', { koper: 'Koper L BV', verkoper: 'Verkoper L BV' }, 'Tekst L')] };
    t.srv.lijst.push({ id: 'doc-L', doc_type: 'loi', current_version: 1, status: 'draft', created_at: 0 });
    await t.ctx.bgMouComposer('MOU'); await rust();
    t.typ(t.veld('koper'), 'Koper MoU');
    const s1 = t.naar(t.veld('koper'), null);
    t.doc.getElementById('mou-close').onclick();
    t.srv.houdVast = (m, p) => m === 'GET' && /^\/mna\/tos\/documenten\//.test(p);
    const loi = t.ctx.bgMouComposer('LOI'); await rust();
    t.los(isPatch, true); await s1; await rust(); // late MoU-reactie terwijl de LoI nog laadt
    t.srv.houdVast = () => false;
    t.los((q) => /\/documenten\//.test(q.pad), true); await loi; await rust();
    check(t.ctx._mouProfile === 'LOI' && t.ctx._mouDocId === 'doc-L' && t.veld('koper').getAttribute('data-iid') === 'i-l1' && t.veld('koper').value === 'Koper L BV' && t.out.style.display === 'block',
      'composer sluiten: late opslag van de gesloten MoU breekt de daarna geopende LoI niet af en toont geen MoU in plaats van de LoI');
    check(t.srv.docs['doc-A'].componenten[0].data_values.koper.value === 'Koper MoU' && t.srv.docs['doc-L'].componenten[0].data_values.koper.value === 'Koper L BV' && t.concepten('doc-L') === 0,
      'composer sluiten: de late opslag schrijft alleen het MoU-document; de LoI krijgt geen waarde of concept');
    // Lopende documentwissel: een late opslag van het vorige document mag die wissel niet afbreken.
    await t.ctx.bgMouRender(t.srv.lijst.filter((d) => d.doc_type === 'mou'), undefined, 'MOU', 'doc-A');
    t.typ(t.veld('verkoper'), 'Verkoper A tijdens wissel');
    const s2 = t.naar(t.veld('verkoper'), null);
    t.srv.houdVast = (m, p) => m === 'GET' && p === '/mna/tos/document/doc-B';
    const kies = t.doc.getElementById('mou-kies'); kies.value = 'doc-B';
    const wissel = kies.onchange.call(kies); await rust();
    t.los(isPatch, true); await s2; await rust();
    t.srv.houdVast = () => false;
    t.los((q) => q.pad === '/mna/tos/document/doc-B', true); await wissel; await rust();
    check(t.ctx._mouDocId === 'doc-B' && t.veld('koper').getAttribute('data-iid') === 'i-b1' && t.veld('verkoper').value === 'Verkoper B BV'
      && t.srv.docs['doc-A'].componenten[0].data_values.verkoper.value === 'Verkoper A tijdens wissel' && t.concepten('doc-A') === 0,
      'composer: late geslaagde opslag van doc-A tijdens een lopende wissel naar doc-B breekt die wissel niet af; doc-A is wel opgeslagen');
  });

  await tryAsync('composer sluiten traject/bevroren', async () => {
    const t = laadComposer(root, {});
    const gets = () => t.srv.verzoeken.filter((v) => v.method === 'GET').length;
    await t.ctx.bgMouComposer('MOU'); await rust();
    t.typ(t.tekst(), 'Tekst traject 1');
    t.typ(t.veld('koper'), 'Koper traject 1');
    const s1 = t.naar(t.veld('koper'), null);
    t.doc.getElementById('mou-close').onclick();
    t.S.code = 'TSYN-TRAJECT-2';
    const g0 = gets();
    t.los(isPatch, false, { status: 403, error: 'Geen toegang' }); await s1; await rust();
    check(t.out.innerHTML === '' && gets() === g0 && t.concepten('doc-A') === 0,
      'composer sluiten: late fout na sluiten en trajectwissel hertekent niets en maakt onder het nieuwe traject geen concept aan');
    await t.ctx.bgMouComposer('MOU'); await rust();
    check(t.veld('koper').value === 'Koper Synthetisch BV' && t.veld('koper').title === '' && t.tekst().value === 'Bestaande tekst A' && t.tekst().title === '',
      'composer sluiten: heropenen onder een ander traject toont geen concepten of fout van het vorige traject');
    t.doc.getElementById('mou-close').onclick();
    t.S.code = 'TSYN-TRAJECT-1';
    Object.assign(t.srv.docs['doc-A'].document, { bevroren: true, status: 'exported' });
    await t.ctx.bgMouComposer('MOU'); await rust();
    check(t.veld('koper').disabled && t.veld('koper').value === 'Koper Synthetisch BV' && t.tekst().value === 'Bestaande tekst A' && t.concepten('doc-A') === 0
      && t.eff.toasts.some((x) => x.type === 'err' && x.msg.includes('2 niet-opgeslagen wijzigingen niet toegepast')),
      'composer sluiten: heropenen van een intussen bevroren document zet geen concepten terug en meldt dat eerlijk');
    check(t.patches().length === 1 && t.eff.opslag === 0, 'composer sluiten: geen herhaalde of automatische verzending na sluiten, trajectwissel of bevriezen');
  });

  // ── H. Statisch (mna/04, productpunt 19): aanhaakpunten van de composerfix in de bron ──
  // Inhoudelijk gelijk aan de drie #19-bronchecks in check 14 van tests/audit-consistentie.mjs, hier
  // ondergebracht zodat ze via de bestaande import van deze suite (check 26) meedraaien.
  tryCheck('composer statisch', () => {
    const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
    check(/out\.innerHTML=h;\s*_mouHertekent=false;\s*bgMouWire\(bevroren\);\s*bgMouConceptenToepassen\(out,bevroren,focus\);/.test(src04),
      'mna/04 bgMouRender: onopgeslagen composerconcepten worden ná out.innerHTML en bgMouWire teruggezet (geen formulierverlies bij hertekenen)');
    check(!/inp\.value=inp\.getAttribute\('data-orig'\)/.test(src04), 'mna/04: een mislukte veldopslag zet de invoer niet stil terug naar de oude waarde (data-orig)');
    check(!/_mouDocId=this\.value/.test(src04), 'mna/04 documentkeuze (mou-kies): _mouDocId wordt niet vóór het laden gezet');
  });

  // ── I. Versiegeschiedenis (productpunt 16, 13 okt 2026): eerlijke leesfout in de bestaande consumenten ──
  // Draait de ECHTE toonDocWaarschuwing/laadPartijDocs (mna/05), bgToonOfGenereerDoc/bgLeesDealvoorstelCijfers/
  // laadBgDocs (mna/04) en wLaadGeschiedenis/wLaadLaatsteRapport (mna/06) met de echte leesVersieLijst (mna/05)
  // en esc (mna/02) in node:vm. Synthetische antwoorden: geldig, legitiem 200 [], 500/401/403, netwerkfout,
  // ongeldige JSON en geen array; plus vertraagde antwoorden na een sessie-/traject-/rol-/scherm- of
  // weergavewissel. Geen browser-, staging- of productiebewijs.
  const FOUTEN = Object.keys(H_FOUT);
  const TRAJ = { koper_naam: 'Koper Synthetisch BV', kantoor_naam: 'Kantoor Synthetisch BV' };
  const GETYPT = 'Handmatig getypte documenttekst, nog niet opgeslagen';
  const src05f = (naam) => (r) => [knip(lees(r, 'mna/05-documentflow-partijen.js'), naam, '\n}\n')];

  // I1. mna/05 toonDocWaarschuwing (documentwaarschuwing vóór genereren)
  const laadDw = () => {
    const t = laadHist(root, src05f('async function toonDocWaarschuwing(docType, onDoorgaan) {'),
      () => ({ S: { code: CODES.verkoper, rol: 'verkoper', screen: 'main', traject: { ...TRAJ } } }));
    t.door = [];
    t.roep = (type) => t.ctx.toonDocWaarschuwing(type, () => { t.door.push(type); });
    t.modal = () => t.dom.doc.querySelectorAll('.docwaarschuwing-ov')[0] || null;
    t.tekst = () => { const m = t.modal(); return m ? m.alle().map((e) => e.innerHTML).join('') : ''; };
    t.knop = (id) => t.dom.doc.getElementById(id);
    return t;
  };
  await tryAsync('versies docwaarschuwing geldig/leeg', async () => {
    let t = laadDw(); t.st.hist = () => hAntw(200, [{ id: 'v1', doc_type: 'bem' }]);
    await t.roep('nda');
    check(t.door.length === 1 && !t.modal() && t.ctx.window.__docWaarschuwingBezig === false && t.hist().length === 1 && t.hist()[0].pad === '/mna/versies/' + CODES.verkoper,
      'mna/05 toonDocWaarschuwing geldig: bestaande BEM wordt gelezen, geen waarschuwing → doorgaan zoals voorheen');
    t = laadDw(); t.st.hist = () => hAntw(200, []);
    await t.roep('nda');
    check(t.door.length === 0 && t.modal() && /BEM is nog niet aangemaakt/.test(t.tekst()) && !t.knop('dw-opnieuw') && !t.knop('dw-door'),
      'mna/05 toonDocWaarschuwing legitiem 200 []: bestaande blokkade "BEM nog niet aangemaakt" ongewijzigd, geen leesfoutknop');
    t = laadDw(); t.st.hist = () => hAntw(200, []);
    await t.roep('bem');
    check(t.door.length === 1 && !t.modal(), 'mna/05 toonDocWaarschuwing legitiem 200 [] bij BEM: geen waarschuwing → bestaande doorgaan-workflow');
  });
  for (const naam of FOUTEN) {
    await tryAsync('versies docwaarschuwing ' + naam, async () => {
      const t = laadDw(); t.st.hist = H_FOUT[naam];
      await t.roep('bem');
      const tx = t.tekst();
      check(t.door.length === 0 && t.modal() && /documentgeschiedenis kon niet worden geladen/.test(tx) && !/Er is al een|nog niet aangemaakt|Kopernaam/.test(tx)
        && !t.knop('dw-door') && t.knop('dw-opnieuw') && t.dom.getypt.value === GETYPT && !t.st.consoleFout.length,
        'mna/05 toonDocWaarschuwing ' + naam + ': eerlijke leesfout, geen aanwezigheids-/blokkadeoordeel, geen doorgaan (generatie), getypte tekst intact');
      t.st.hist = () => hAntw(200, []);
      await t.knop('dw-opnieuw').klik(); await rust();
      check(t.door.length === 1 && !t.modal() && t.hist().length === 2, 'mna/05 toonDocWaarschuwing ' + naam + ': "Opnieuw proberen" leest opnieuw en volgt daarna de bestaande workflow');
    });
  }
  await tryAsync('versies docwaarschuwing annuleren', async () => {
    const t = laadDw(); t.st.hist = H_FOUT['HTTP 500'];
    await t.roep('loi'); await t.knop('dw-ann').klik();
    check(!t.modal() && t.door.length === 0 && t.ctx.window.__docWaarschuwingBezig === false && t.hist().length === 1,
      'mna/05 toonDocWaarschuwing leesfout → Annuleren: modal weg, vlag vrij, geen doorgaan en geen nieuwe leesactie');
  });
  await tryAsync('versies docwaarschuwing stale', async () => {
    const wissels = [['nieuwe sessie (zelfde code)', (c) => { c.S = { ...c.S, traject: { ...TRAJ } }; }], ['ander traject', (c) => { c.S.code = CODES.koper; }],
      ['rolwissel', (c) => { c.S.rol = 'koper'; }], ['schermwissel', (c) => { c.S.screen = 'cover'; }]];
    for (const [wissel, f] of wissels) {
      for (const uitkomst of ['200 []', 'HTTP 500']) {
        const t = laadDw(); const d = uitgesteld(); t.st.hist = () => d.p;
        const p = t.roep('bem'); await rust(); f(t.ctx);
        d.los(uitkomst === '200 []' ? hAntw(200, []) : H_FOUT['HTTP 500']()); await p;
        check(t.door.length === 0 && !t.modal() && t.ctx.window.__docWaarschuwingBezig === false,
          'mna/05 toonDocWaarschuwing ' + wissel + ' + laat ' + uitkomst + ': geen doorgaan, geen modal, vlag vrij');
      }
    }
  });

  // I2. mna/05 laadPartijDocs (documentenoverzicht verkoper/koper, gecombineerd met de dataroomlijst)
  const V_NDA = [{ id: 'v-nda-1', doc_type: 'nda', created_at: 0, versie: 1 }];
  const laadPd = () => {
    const t = laadHist(root, src05f('async function laadPartijDocs() {'),
      () => ({ S: { code: CODES.verkoper, rol: 'verkoper', traject: {} }, isVerkoper: () => true }));
    t.el = t.dom.sectie('partij-docs-sectie', 'Laden...');
    t.st.anders['/mna/document/lijst/'] = () => hAntw(200, []);
    t.st.anders['/mna/signhost/status/'] = () => hAntw(200, { transactions: [] });
    t.sh = () => t.st.verzoeken.filter((v) => v.pad.startsWith('/mna/signhost/')).length;
    return t;
  };
  await tryAsync('versies partijdocs geldig/leeg', async () => {
    let t = laadPd(); t.st.hist = () => hAntw(200, V_NDA);
    await t.ctx.laadPartijDocs();
    check(t.el.innerHTML.includes('Uw documenten &amp; dataroom (1)') && t.el.innerHTML.includes('data-id="v-nda-1"') && !/kon nu niet/.test(t.el.innerHTML),
      'mna/05 laadPartijDocs geldig: NDA-versie getoond zoals voorheen');
    t = laadPd(); t.st.hist = () => hAntw(200, []);
    await t.ctx.laadPartijDocs();
    check(/Nog geen documenten beschikbaar/.test(t.el.innerHTML), 'mna/05 laadPartijDocs legitiem 200 []: bestaande "Nog geen documenten beschikbaar."');
  });
  for (const naam of FOUTEN) {
    await tryAsync('versies partijdocs ' + naam, async () => {
      const t = laadPd(); t.st.hist = H_FOUT[naam];
      await t.ctx.laadPartijDocs();
      const b = t.el.querySelector('.partij-docs-opnieuw');
      check(/kon nu niet worden geladen/.test(t.el.innerHTML) && !/Nog geen documenten/.test(t.el.innerHTML) && b && t.sh() === 0 && t.dom.getypt.value === GETYPT,
        'mna/05 laadPartijDocs ' + naam + ': eerlijke leesfout met opnieuw proberen, nooit "Nog geen documenten"; getypte tekst intact');
      t.st.hist = () => hAntw(200, V_NDA);
      await b.klik(); await rust();
      check(t.el.innerHTML.includes('data-id="v-nda-1"'), 'mna/05 laadPartijDocs ' + naam + ': opnieuw proberen toont daarna de historie');
    });
  }
  await tryAsync('versies partijdocs stale', async () => {
    const wissels = [['nieuwe sessie', (t) => { t.ctx.S = { ...t.ctx.S }; }], ['ander traject', (t) => { t.ctx.S.code = CODES.koper; }], ['rolwissel', (t) => { t.ctx.S.rol = 'koper'; }],
      ['andere weergave', (t) => { t.el.remove(); t.nieuw = t.dom.sectie('partij-docs-sectie', 'Ander scherm'); }]];
    for (const [wissel, f] of wissels) {
      for (const uitkomst of ['geldig', 'HTTP 500']) {
        const t = laadPd(); const d = uitgesteld(); t.st.hist = () => d.p;
        const p = t.ctx.laadPartijDocs(); await rust(); f(t);
        d.los(uitkomst === 'geldig' ? hAntw(200, V_NDA) : H_FOUT['HTTP 500']()); await p;
        check(t.el.innerHTML === 'Laden...' && (!t.nieuw || t.nieuw.innerHTML === 'Ander scherm') && t.sh() === 0,
          'mna/05 laadPartijDocs ' + wissel + ' + laat ' + uitkomst + ': oude en nieuwe sectie ongewijzigd, geen vervolgverzoek');
      }
    }
  });

  // I3. mna/04 bgToonOfGenereerDoc (bestaande versie tonen óf genereren)
  const laadBgt = () => {
    const t = laadHist(root, (r) => [tot(lees(r, 'mna/04-begeleider-dashboard.js'), '  var bgVersieLaadNr=0;', '\n  async function bgToonBestaandeVersie(type,v){')], (dom, st) => {
      st.bestaand = []; st.waarschuwing = []; st.gegenereerd = [];
      return { S: { code: CODES.tussen, _bgKey: CODES.tussen, rol: 'tussenpersoon', traject: {} }, bgToonUitvoer: () => {},
        bgToonBestaandeVersie: async (type, v) => { st.bestaand.push(type + ':' + v.id); },
        toonDocWaarschuwing: (type) => { st.waarschuwing.push(type); }, bgDoc: (type) => { st.gegenereerd.push(type); } };
    });
    t.out = t.dom.sectie('bg-doc-out');
    t.niets = () => !t.st.bestaand.length && !t.st.waarschuwing.length && !t.st.gegenereerd.length;
    return t;
  };
  const V_BG = [{ id: 'v-nda-oud', doc_type: 'nda', created_at: 1 }, { id: 'v-nda-up', doc_type: 'nda_upload', created_at: 2 }, { id: 'v-loi', doc_type: 'loi', created_at: 3 }];
  await tryAsync('versies bgToonOfGenereerDoc geldig/leeg', async () => {
    let t = laadBgt(); t.st.hist = () => hAntw(200, V_BG);
    await t.ctx.bgToonOfGenereerDoc('nda');
    check(t.st.bestaand.join() === 'nda:v-nda-up' && !t.st.waarschuwing.length && !t.st.gegenereerd.length && t.hist()[0].opts.headers['x-tussen-key'] === CODES.tussen,
      'mna/04 bgToonOfGenereerDoc geldig: nieuwste nda/nda_upload getoond, bestaande x-tussen-key, geen generatie');
    t = laadBgt(); t.st.hist = () => hAntw(200, []);
    await t.ctx.bgToonOfGenereerDoc('nda');
    check(t.st.waarschuwing.join() === 'nda' && !t.st.bestaand.length && !t.st.gegenereerd.length, 'mna/04 bgToonOfGenereerDoc legitiem 200 []: bestaande documentwaarschuwing/genereerpad');
  });
  for (const naam of FOUTEN) {
    await tryAsync('versies bgToonOfGenereerDoc ' + naam, async () => {
      const t = laadBgt(); t.st.hist = H_FOUT[naam];
      await t.ctx.bgToonOfGenereerDoc('nda');
      const b = t.dom.doc.getElementById('bg-doc-versie-opnieuw');
      check(t.niets() && /documentgeschiedenis kon niet worden geladen/.test(t.out.innerHTML) && /niets gegenereerd/.test(t.out.innerHTML) && b && t.dom.getypt.value === GETYPT,
        'mna/04 bgToonOfGenereerDoc ' + naam + ': eerlijke leesfout, geen waarschuwing/generatie, getypte tekst intact');
      t.st.hist = () => hAntw(200, V_BG);
      await b.onclick(); await rust();
      check(t.st.bestaand.join() === 'nda:v-nda-up' && !t.st.waarschuwing.length, 'mna/04 bgToonOfGenereerDoc ' + naam + ': opnieuw proberen toont daarna de bestaande versie');
    });
  }
  await tryAsync('versies bgToonOfGenereerDoc stale', async () => {
    for (const uitkomst of ['200 []', 'HTTP 500']) {
      const laat = () => (uitkomst === '200 []' ? hAntw(200, []) : H_FOUT['HTTP 500']());
      let t = laadBgt(); let d = uitgesteld(); t.st.hist = () => d.p;
      let p = t.ctx.bgToonOfGenereerDoc('nda'); await rust();
      t.st.hist = () => hAntw(200, []); await t.ctx.bgToonOfGenereerDoc('loi');
      const naLoi = t.out.innerHTML;
      d.los(laat()); await p;
      check(t.st.waarschuwing.join() === 'loi' && t.out.innerHTML === naLoi, 'mna/04 bgToonOfGenereerDoc dubbelklik/ander type + laat ' + uitkomst + ': alleen de laatste aanroep telt');
      t = laadBgt(); d = uitgesteld(); t.st.hist = () => d.p;
      p = t.ctx.bgToonOfGenereerDoc('nda'); await rust(); t.out.innerHTML = '<div id="mou-close">Composer</div>';
      d.los(laat()); await p;
      check(t.niets() && t.out.innerHTML === '<div id="mou-close">Composer</div>', 'mna/04 bgToonOfGenereerDoc andere weergave in bg-doc-out + laat ' + uitkomst + ': niets overschreven of gestart');
      t = laadBgt(); d = uitgesteld(); t.st.hist = () => d.p;
      p = t.ctx.bgToonOfGenereerDoc('nda'); await rust(); const voor = t.out.innerHTML; t.ctx.S = { ...t.ctx.S };
      d.los(laat()); await p;
      check(t.niets() && t.out.innerHTML === voor, 'mna/04 bgToonOfGenereerDoc nieuwe sessie + laat ' + uitkomst + ': niets gestart of getoond');
    }
  });

  // I4. mna/04 bgLeesDealvoorstelCijfers (LoI-melding in bgDoc)
  const laadDv = () => laadHist(root, (r) => [knip(lees(r, 'mna/04-begeleider-dashboard.js'), '  async function bgLeesDealvoorstelCijfers(){', '\n  }\n')],
    () => ({ S: { code: CODES.tussen } }));
  await tryAsync('versies dealvoorstel', async () => {
    let t = laadDv(); t.st.hist = () => hAntw(200, [{ id: 'dv2', cijfers_json: JSON.stringify({ p: 900000, closing: 700000 }) }]);
    let r = await t.ctx.bgLeesDealvoorstelCijfers();
    check(r.leesfout === false && r.cijfers && r.cijfers.p === 900000 && t.hist()[0].pad === '/mna/versies/' + CODES.tussen + '/dealvoorstel', 'mna/04 bgLeesDealvoorstelCijfers geldig: cijfers van het laatste dealvoorstel');
    t = laadDv(); t.st.hist = () => hAntw(200, []);
    r = await t.ctx.bgLeesDealvoorstelCijfers();
    check(r.leesfout === false && r.cijfers === null, 'mna/04 bgLeesDealvoorstelCijfers legitiem 200 []: bestaande "geen eerder dealvoorstel"');
    for (const naam of FOUTEN) {
      t = laadDv(); t.st.hist = H_FOUT[naam];
      r = await t.ctx.bgLeesDealvoorstelCijfers();
      check(r.leesfout === true && r.cijfers === null, 'mna/04 bgLeesDealvoorstelCijfers ' + naam + ': leesfout, geen "geen dealvoorstel gevonden"');
    }
    const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
    const bgDocSrc = knip(src04, '  async function bgDoc(type){', "\n    var tplTekst=");
    check(/var dvR=await bgLeesDealvoorstelCijfers\(\);\s*if\(S!==bgDocSessie\|\|S\.code!==bgDocCode\)return;/.test(bgDocSrc) && /dvLeesfout\?'&#9888; Het laatste dealvoorstel kon niet worden gelezen/.test(src04),
      'mna/04 bgDoc: gebruikt bgLeesDealvoorstelCijfers, stopt na een sessie-/trajectwissel en meldt een leesfout eerlijk in de LoI');
  });

  // I5. mna/04 laadBgDocs (documentensectie begeleider)
  const laadBd = () => {
    const t = laadHist(root, (r) => [tot(lees(r, 'mna/04-begeleider-dashboard.js'), '    var bgDocsLaadNr=0;', '\n    laadBgDocs();\n')],
      (dom) => ({ S: { code: CODES.tussen, _bgKey: CODES.tussen }, bgDocsEl: dom.sectie('bg-docs-sectie', 'Laden...') }));
    t.el = t.ctx.bgDocsEl;
    return t;
  };
  await tryAsync('versies bgdocs geldig/leeg', async () => {
    let t = laadBd(); t.st.hist = () => hAntw(200, V_NDA);
    await t.ctx.laadBgDocs();
    check(t.el.innerHTML.includes('NDA v1') && t.el.querySelector('.bg-versie-open'), 'mna/04 laadBgDocs geldig: versie getoond zoals voorheen');
    t = laadBd(); t.st.hist = () => hAntw(200, []);
    await t.ctx.laadBgDocs();
    check(/Nog geen documenten\./.test(t.el.innerHTML), 'mna/04 laadBgDocs legitiem 200 []: bestaande "Nog geen documenten."');
  });
  for (const naam of FOUTEN) {
    await tryAsync('versies bgdocs ' + naam, async () => {
      const t = laadBd(); t.st.hist = H_FOUT[naam];
      await t.ctx.laadBgDocs();
      const b = t.el.querySelector('.bg-docs-opnieuw');
      check(/documentgeschiedenis kon niet worden geladen/.test(t.el.innerHTML) && !/Nog geen documenten|Fout: /.test(t.el.innerHTML) && b && t.dom.getypt.value === GETYPT,
        'mna/04 laadBgDocs ' + naam + ': eerlijke leesfout met opnieuw proberen, nooit "Nog geen documenten" of ruwe fout');
      t.st.hist = () => hAntw(200, V_NDA);
      await b.klik(); await rust();
      check(t.el.innerHTML.includes('NDA v1'), 'mna/04 laadBgDocs ' + naam + ': opnieuw proberen toont daarna de historie');
    });
  }
  await tryAsync('versies bgdocs stale', async () => {
    let t = laadBd(); let d = uitgesteld(); t.st.hist = () => d.p;
    let p = t.ctx.laadBgDocs(); await rust();
    t.st.hist = () => hAntw(200, []); await t.ctx.laadBgDocs();
    d.los(hAntw(200, V_NDA)); await p;
    check(/Nog geen documenten\./.test(t.el.innerHTML) && !t.el.innerHTML.includes('NDA v1'), 'mna/04 laadBgDocs herlaad (bijv. na verwijderen) + laat ouder antwoord: alleen het laatste telt');
    for (const [wissel, f] of [['nieuwe sessie', (x) => { x.ctx.S = { ...x.ctx.S }; }], ['ander traject', (x) => { x.ctx.S.code = CODES.koper; }], ['andere weergave', (x) => { x.el.remove(); x.dom.sectie('bg-docs-sectie', 'Ander scherm'); }]]) {
      for (const uitkomst of ['geldig', 'HTTP 500']) {
        t = laadBd(); d = uitgesteld(); t.st.hist = () => d.p;
        p = t.ctx.laadBgDocs(); await rust(); f(t);
        d.los(uitkomst === 'geldig' ? hAntw(200, V_NDA) : H_FOUT['HTTP 500']()); await p;
        const nieuw = t.dom.doc.getElementById('bg-docs-sectie');
        check(t.el.innerHTML.includes('Laden...') && (nieuw === t.el || nieuw.innerHTML === 'Ander scherm'), 'mna/04 laadBgDocs ' + wissel + ' + laat ' + uitkomst + ': niets overschreven');
      }
    }
  });

  // I6. mna/06 wLaadGeschiedenis / wLaadLaatsteRapport (waarderingsrapport)
  const laadW = () => {
    const src06 = (r) => { const s = lees(r, 'mna/06-schermen.js'); return [tot(s, '  function wHistLeesfout(', "\n  if(wAiBtn)wAiBtn.addEventListener('click'"), tot(s, '  async function wLaadLaatsteRapport(){', '\n  if(wAiBtn)wLaadLaatsteRapport();')]; };
    const t = laadHist(root, src06, (dom, st) => {
      const knop = dom.sectie('w-ai-btn'); knop.textContent = 'Genereer AI-analyse & waardering';
      dom.sectie('w-ai-out').style.display = 'none';
      dom.sectie('w-ai-hist', '<div>Bestaande lijst</div>');
      st.rapporten = [];
      return { S: { code: CODES.tussen, _bgKey: CODES.tussen }, wAiBtn: knop, ge: (id) => dom.doc.getElementById(id), dvBerekenWaardering: () => ({ wMid: 1000 }),
        wToonRapport: (tekst, ts, versie) => { st.rapporten.push(versie); const o = dom.doc.getElementById('w-ai-out'); o.style.display = 'block'; o.innerHTML = '<div class="ai-body">' + tekst + '</div>'; } };
    });
    t.knop = t.ctx.wAiBtn; t.out = t.dom.doc.getElementById('w-ai-out'); t.histEl = t.dom.doc.getElementById('w-ai-hist');
    t.versie = () => t.st.verzoeken.filter((v) => v.pad.startsWith('/mna/versie/')).length;
    t.st.anders['/mna/versie/'] = () => hAntw(200, { tekst: '<p>Rapport R2</p>', created_at: 0, versie: 2 });
    return t;
  };
  const W3 = [3, 2, 1].map((n) => ({ id: 'r' + n, versie: n, created_at: 0, cijfers_json: JSON.stringify({ wMid: 1000 }) }));
  const RAPPORT = '<div class="ai-body">Getoond rapport</div>';
  await tryAsync('versies waardering geschiedenis', async () => {
    let t = laadW(); t.st.hist = () => hAntw(200, W3);
    await t.ctx.wLaadGeschiedenis();
    check(t.histEl.innerHTML.includes('Eerdere versies (2)') && t.histEl.innerHTML.includes('data-vid="r2"') && t.hist()[0].pad === '/mna/versies/' + CODES.tussen + '/waarderingsrapport',
      'mna/06 wLaadGeschiedenis geldig: eerdere versies getoond zoals voorheen');
    t = laadW(); t.st.hist = () => hAntw(200, []);
    await t.ctx.wLaadGeschiedenis();
    check(t.histEl.innerHTML === '', 'mna/06 wLaadGeschiedenis legitiem 200 []: bestaande lege geschiedenis');
    for (const naam of FOUTEN) {
      t = laadW(); t.out.style.display = 'block'; t.out.innerHTML = RAPPORT; t.st.hist = H_FOUT[naam];
      await t.ctx.wLaadGeschiedenis();
      const b = t.histEl.querySelector('.w-hist-opnieuw');
      check(/konden niet worden geladen/.test(t.histEl.innerHTML) && b && t.out.innerHTML === RAPPORT && t.dom.getypt.value === GETYPT,
        'mna/06 wLaadGeschiedenis ' + naam + ': eerlijke leesfout met opnieuw proberen; getoond rapport en getypte tekst intact');
      t.st.hist = () => hAntw(200, W3);
      await b.klik(); await rust();
      check(t.histEl.innerHTML.includes('Eerdere versies (2)'), 'mna/06 wLaadGeschiedenis ' + naam + ': opnieuw proberen toont daarna de geschiedenis');
    }
    for (const [wissel, f] of [['nieuwe sessie', (x) => { x.ctx.S = { ...x.ctx.S }; }], ['ander traject', (x) => { x.ctx.S.code = CODES.koper; }]]) {
      t = laadW(); const d = uitgesteld(); t.st.hist = () => d.p;
      const p = t.ctx.wLaadGeschiedenis(); await rust(); f(t);
      d.los(H_FOUT['HTTP 500']()); await p;
      check(t.histEl.innerHTML === '<div>Bestaande lijst</div>', 'mna/06 wLaadGeschiedenis ' + wissel + ' + late fout: geschiedenis ongewijzigd');
    }
  });
  await tryAsync('versies waardering laatste rapport', async () => {
    let t = laadW(); t.st.hist = () => hAntw(200, W3.slice(1));
    await t.ctx.wLaadLaatsteRapport(); await rust();
    check(t.st.rapporten.join() === '2' && t.knop.textContent === '↻ Opnieuw genereren' && t.hist().length === 2 && t.histEl.innerHTML.includes('Eerdere versies (1)'),
      'mna/06 wLaadLaatsteRapport geldig: laatste rapport getoond, geschiedenis herladen (zoals voorheen)');
    t = laadW(); t.st.hist = () => hAntw(200, []);
    await t.ctx.wLaadLaatsteRapport();
    check(!t.st.rapporten.length && t.knop.textContent === 'Genereer AI-analyse & waardering' && t.versie() === 0 && t.histEl.innerHTML === '',
      'mna/06 wLaadLaatsteRapport legitiem 200 []: bestaande "nog geen rapport"-weergave');
    for (const naam of FOUTEN) {
      t = laadW(); t.st.hist = H_FOUT[naam];
      await t.ctx.wLaadLaatsteRapport();
      const b = t.histEl.querySelector('.w-hist-opnieuw');
      check(!t.st.rapporten.length && t.knop.textContent === 'Genereer AI-analyse & waardering' && t.versie() === 0 && /konden niet worden geladen/.test(t.histEl.innerHTML) && b
        && t.out.style.display === 'none' && t.dom.getypt.value === GETYPT,
        'mna/06 wLaadLaatsteRapport ' + naam + ': eerlijke leesfout, niet als "nog geen rapport", niets gegenereerd of gewist');
      t.st.hist = () => hAntw(200, W3.slice(1));
      await b.klik(); await rust();
      check(t.st.rapporten.join() === '2' && !/konden niet/.test(t.histEl.innerHTML), 'mna/06 wLaadLaatsteRapport ' + naam + ': opnieuw proberen toont daarna het rapport');
    }
    t = laadW(); t.st.hist = () => hAntw(200, W3.slice(1)); t.st.anders['/mna/versie/'] = H_FOUT['HTTP 500'];
    await t.ctx.wLaadLaatsteRapport();
    check(!t.st.rapporten.length && /konden niet worden geladen/.test(t.histEl.innerHTML), 'mna/06 wLaadLaatsteRapport: mislukte versielezing ook eerlijk gemeld');
    for (const uitkomst of ['geldig', 'HTTP 500']) {
      t = laadW(); let d = uitgesteld(); t.st.hist = () => d.p;
      let p = t.ctx.wLaadLaatsteRapport(); await rust();
      t.knop.disabled = true; t.out.style.display = 'block'; t.out.innerHTML = RAPPORT;
      d.los(uitkomst === 'geldig' ? hAntw(200, W3.slice(1)) : H_FOUT['HTTP 500']()); await p;
      check(!t.st.rapporten.length && t.out.innerHTML === RAPPORT && t.versie() === 0 && t.histEl.innerHTML === '<div>Bestaande lijst</div>',
        'mna/06 wLaadLaatsteRapport intussen gegenereerd + laat ' + uitkomst + ': nieuw rapport niet overschreven');
      t = laadW(); d = uitgesteld(); t.st.hist = () => d.p;
      p = t.ctx.wLaadLaatsteRapport(); await rust(); t.ctx.S = { ...t.ctx.S };
      d.los(uitkomst === 'geldig' ? hAntw(200, W3.slice(1)) : H_FOUT['HTTP 500']()); await p;
      check(!t.st.rapporten.length && t.histEl.innerHTML === '<div>Bestaande lijst</div>', 'mna/06 wLaadLaatsteRapport nieuwe sessie + laat ' + uitkomst + ': niets getoond of gewijzigd');
    }
  });

  // I7. Statisch: elke /mna/versies-lezing in mna/04/05/06 vereist HTTP-succes (geen stille [] of ongecontroleerde JSON)
  tryCheck('versies statisch', () => {
    ['mna/04-begeleider-dashboard.js', 'mna/05-documentflow-partijen.js', 'mna/06-schermen.js'].forEach((f) => {
      const fout = lees(root, f).split('\n').filter((l) => l.includes("'/mna/versies/'") && !/leesVersieLijst\(|if\(!r\.ok\)/.test(l));
      check(!fout.length, f + ': elke /mna/versies-lezing via leesVersieLijst of met HTTP-controle' + (fout.length ? ' — ' + fout.map((l) => l.trim().slice(0, 80)).join(' | ') : ''));
    });
  });

  // ── J. demo.html: positioneringsslide (werkpunt 26) binnen de bestaande verborgen presentatie ──
  // J1. SLIDES runtime: precies één toevoeging op index 1, alle bestaande objecten ongewijzigd in volgorde
  tryCheck('demo SLIDES', () => {
    const { slides } = laadDemo(root);
    // #97 (30-10-2026): naast de positioneringsslide (#26) één M&A Journey-slide direct na de werkwijzeslide.
    check(Array.isArray(slides) && slides.length === DEMO_BESTAAND.length + 2, 'demo.html SLIDES: precies twee slides toegevoegd t.o.v. de basis (positionering #26 en M&A Journey #97) (' + DEMO_BESTAAND.length + ' → ' + (DEMO_BESTAAND.length + 2) + ', gevonden ' + (slides && slides.length) + ')');
    check(slides[1] && slides[1].titel === DEMO_TITEL && slides[1].eyebrow === 'Positionering', 'demo.html SLIDES[1]: positioneringsslide direct na de introductie, titel exact "' + DEMO_TITEL + '"');
    check(slides.filter((s) => s.titel === DEMO_TITEL).length === 1, 'demo.html SLIDES: positioneringsslide komt precies één keer voor');
    const jIdx = slides.findIndex((s) => s.titel === DEMO_JOURNEY_TITEL);
    check(jIdx > 1 && slides[jIdx - 1].eyebrow === 'Werkwijze' && slides.filter((s) => s.titel === DEMO_JOURNEY_TITEL).length === 1, 'demo.html SLIDES: M&A Journey-slide precies één keer, direct na de werkwijzeslide');
    const overig = slides.filter((s, i) => i !== 1 && s.titel !== DEMO_JOURNEY_TITEL);
    const afwijkend = DEMO_BESTAAND.filter(([eb, ti, frag], i) => {
      const s = overig[i];
      return !s || Object.keys(s).join() !== 'eyebrow,titel,html' || s.eyebrow !== eb || s.titel !== ti || !s.html.includes(frag) || /pos-/.test(s.html);
    });
    check(!afwijkend.length, 'demo.html SLIDES: alle ' + DEMO_BESTAAND.length + ' bestaande slides behouden in volgorde (eyebrow/titel/kenmerk, geen .pos-*)' + (afwijkend.length ? ' — ' + afwijkend.map((a) => a[1]).join(' | ') : ''));
  });

  // J2. Inhoud nieuwe slide: matrix, assen, kernboodschap, nuance, bronnen, alleen inerte opmaak
  tryCheck('demo positionering', () => {
    const h = laadDemo(root).slides[1].html;
    const tekst = (x) => ontEsc(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    const t = tekst(h);
    const ontbreekt = ['DealRoom', 'Datasite', 'Intralinks', 'Ansarada', 'KVM / KantoorInzicht', 'Klant- en dealomvang', 'MKB / lower mid-market', 'Grote ondernemingen / enterprise',
      'Functionele diepgang en procesintelligentie', 'Documentbeheer en dataroom', 'Integrale M&A-procesbegeleiding met AI', 'Onze propositie voor het MKB'].filter((w) => !t.includes(w));
    check(!ontbreekt.length, 'demo positionering: vijf platforms, beide assen met uitersten en propositielabel zichtbaar' + (ontbreekt.length ? ' — ontbreekt: ' + ontbreekt.join(', ') : ''));
    check(/<div class="pos-kern"><div class="pos-kern-label">Onze propositie voor het MKB<\/div><p>([^<]*)<\/p><\/div>/.exec(h)?.[1] === DEMO_KERN,
      'demo positionering: kernboodschap exact en gelabeld als eigen MKB-propositie');
    check(t.includes(DEMO_NUANCE), 'demo positionering: zichtbare nuance "indicatief, geen ranglijst, AI/workflow ook bij anderen, bereik overlapt"');
    const boven = knip(h, 'pos-half pos-boven', 'pos-half pos-onder');
    const onder = knip(h, 'pos-half pos-onder', '</figure>');
    check(/<div class="pos-groep pos-l"><span class="pos-chip pos-kvm">KVM \/ KantoorInzicht<\/span><span class="pos-sub">MKB-focus<\/span><\/div>/.test(boven),
      'demo positionering: KVM / KantoorInzicht linksboven met MKB-focus');
    check(['DealRoom', 'Datasite', 'Intralinks', 'Ansarada'].every((n) => boven.includes('>' + n + '<') && !onder.includes(n)) && /Alle genoemde platforms bieden ook documentbeheer en dataroom/.test(onder),
      'demo positionering: concurrenten in de bovenste helft (niet als alleen-VDR onderaan); onderste helft benoemt dat iedereen ook dataroom biedt');
    check(!/<ol|<table|score|\d\s*%|(^|[^&])#\d|\bnr\b/i.test(h), 'demo positionering: geen scores, percentages of genummerde ranglijst');
    const hrefs = [...h.matchAll(/<a href="([^"]*)" target="_blank" rel="noopener noreferrer">/g)].map((m) => m[1]);
    check(hrefs.join() === DEMO_BRONNEN.join() && (h.match(/<a /g) || []).length === DEMO_BRONNEN.length && /<details class="pos-bronnen"><summary>Bronnen \(geraadpleegd 13 okt 2026\)<\/summary>/.test(h),
      'demo positionering: ingeklapte bronnen met exact de vier primaire links (noopener) en datum 13 okt 2026');
    const f = inert(h, { div: ['class'], figure: ['class', 'aria-label'], span: ['class'], p: [], ul: ['class'], li: [], details: ['class'], summary: [], a: ['href', 'target', 'rel'] });
    check(!f.length && !/<script|<img|<svg|<iframe|<link|\bsrc=|style=|url\(|@import|animation|on[a-z]+=/i.test(h), 'demo positionering: alleen inerte opmaak, geen scripts/afbeeldingen/inline stijl/externe assets' + (f.length ? ' — ' + f.join('; ') : ''));
  });

  // J3. Bestand: noindex, één inline script, geen externe assets, CSS uitsluitend gescoped, geen publieke link
  tryCheck('demo bestand', () => {
    const src = lees(root, 'demo.html');
    check(src.includes('<meta name="robots" content="noindex, nofollow">'), 'demo.html: noindex, nofollow behouden');
    check((src.match(/<script/g) || []).length === 2 && (src.match(/<script src=/g) || []).length === 1 && src.includes('<script src="mna/22-journey.js"></script>') && src.includes('<script>\n') && (src.match(/<link /g) || []).join() === '<link ' && src.includes('<link rel="stylesheet" href="/assets/fonts.css">'),
      'demo.html: één inline script plus uitsluitend de gedeelde journeycomponent (mna/22-journey.js), alleen de bestaande lokale fonts.css');
    const jrDemo = src.slice(src.indexOf('const DEMO_JOURNEY='), src.indexOf('let huidige=0;'));
    check(jrDemo.length > 1000 && !/fetch\(|WORKER|"bron"/.test(jrDemo) && /\(fictief\)/.test(jrDemo), 'demo.html #97: journey uitsluitend uit ingebedde fictieve gegevens, geen backendaanroep, geen bronvermelding');
    check(src.includes("const _WORKER_WHITELIST=['" + DEMO_PROD + "','" + DEMO_STAGING + "'];") && src.includes("const WORKER=_WORKER_WHITELIST.includes(_WORKER_PARAM)?_WORKER_PARAM:'" + DEMO_PROD + "';"),
      'demo.html: WORKER-whitelist en productiestandaard ongewijzigd');
    const urls = [...new Set(src.match(/https?:\/\/[^\s'"`<)]+/g) || [])];
    const vreemd = urls.filter((u) => ![DEMO_PROD, DEMO_STAGING, ...DEMO_BRONNEN].includes(u));
    check(!vreemd.length, 'demo.html: geen andere externe URL\'s dan de workers en de vier bronlinks' + (vreemd.length ? ' — ' + vreemd.join(', ') : ''));
    const css = knip(src, '<style>', '</style>');
    const posRegels = css.split('\n').filter((l) => l.includes('pos-'));
    const selectoren = (l) => (/^@media/.test(l) ? l.slice(l.indexOf('{') + 1, -1) : l).replace(/\{[^{}]*\}/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);
    const fout = posRegels.filter((l) => !l.startsWith('/* ── Positioneringsmatrix') && (!/^(\.pos-|@media\(max-width:\d+px\)\{\.pos-)/.test(l) || /animation|transition|@keyframes|url\(|@import/.test(l) || !selectoren(l).every((s) => s.startsWith('.pos-'))));
    check(posRegels.length > 10 && !fout.length && (css.match(/@keyframes/g) || []).length === 1, 'demo.html: nieuwe CSS uitsluitend .pos-* (geen animaties/externe bronnen), bestaande fadeIn enige keyframes' + (fout.length ? ' — ' + fout.map((l) => l.slice(0, 60)).join(' | ') : ''));
    const publiek = fs.readdirSync(root).filter((f) => /\.(html|xml|txt)$/i.test(f) && !f.startsWith('.') && f !== 'demo.html' && lees(root, f).includes('demo.html'));
    check(!publiek.length, 'demo.html: geen publieke navigatie-/sitemaplink naar de verborgen presentatie' + (publiek.length ? ' — ' + publiek.join(', ') : ''));
  });

  // J4. Poort: geweigerde/mislukte sleutel opent niets; WORKER-param buiten whitelist wordt genegeerd
  await tryAsync('demo poort', async () => {
    const geweigerd = [['HTTP 401', () => Promise.resolve({ ok: false, status: 401 })], ['HTTP 403', () => Promise.resolve({ ok: false, status: 403 })], ['netwerkfout', () => Promise.reject(new Error('netwerk'))]];
    for (const [naam, antwoord] of geweigerd) {
      const d = laadDemo(root, { antwoord });
      d.els['gate-key'].value = ' onjuist ';
      await d.ctx.gateOpen();
      check(d.fetches.length === 1 && d.fetches[0].url === DEMO_PROD + '/mna/admin/lijst' && d.fetches[0].opts.headers['x-admin-key'] === 'onjuist',
        'demo poort ' + naam + ': sleutel alleen als x-admin-key naar de bestaande admin-check op de productieworker');
      check(d.els.deck.style.display !== 'flex' && d.els.gate.style.display !== 'none' && d.els.stage.innerHTML === '' && !d.kinderen.slide.length
        && d.els['gate-err'].style.display === 'block' && d.els['gate-btn'].disabled === false && d.els['gate-btn'].textContent === 'Openen',
        'demo poort ' + naam + ': presentatie blijft dicht, geen slides gerenderd, foutmelding en knop opnieuw bruikbaar');
    }
    const leeg = laadDemo(root, { antwoord: () => Promise.resolve({ ok: true, status: 200 }) });
    await leeg.ctx.gateOpen();
    check(!leeg.fetches.length && leeg.els.stage.innerHTML === '', 'demo poort: lege sleutel doet geen aanroep en opent niets');
    check(leeg.els['gate-btn'].h.click?.[0] === leeg.ctx.gateOpen && leeg.els['gate-key'].h.keydown?.length === 1, 'demo poort: knop en Enter blijven aan gateOpen gekoppeld');
    for (const [search, verwacht] of [['?worker=https://kwaad.test', DEMO_PROD], ['?worker=' + encodeURIComponent(DEMO_STAGING), DEMO_STAGING]]) {
      const d = laadDemo(root, { search });
      d.els['gate-key'].value = 'x';
      await d.ctx.gateOpen();
      check(d.fetches[0]?.url === verwacht + '/mna/admin/lijst', 'demo poort ' + search + ': aanroep naar ' + verwacht);
    }
  });

  // J5. Geldige sleutel: deck met alle slides, positioneringsslide als tweede, navigatie werkt over de nieuwe lengte
  await tryAsync('demo navigatie', async () => {
    const n = DEMO_BESTAAND.length + 2;
    const d = laadDemo(root, { antwoord: () => Promise.resolve({ ok: true, status: 200 }) });
    d.els['gate-key'].value = 'geldig';
    await d.ctx.gateOpen();
    const teller = () => d.els['slide-teller'].textContent;
    const alleenActief = (i) => d.kinderen.slide.every((s, j) => s.actief === (j === i)) && d.kinderen.dot.every((s, j) => s.actief === (j === i));
    check(d.els.deck.style.display === 'flex' && d.els.gate.style.display === 'none' && d.kinderen.slide.length === n && d.kinderen.dot.length === n && d.fullscreen() === 1,
      'demo navigatie: geldige sleutel opent deck (volledig scherm aangevraagd) met ' + n + ' slides en ' + n + ' stippen');
    check(d.els.stage.innerHTML.includes('<div class="slide" data-i="1"><div class="slide-eyebrow">Positionering</div><h1>' + DEMO_TITEL + '</h1>'), 'demo navigatie: positioneringsslide gerenderd als tweede slide');
    check(teller() === '1 / ' + n && alleenActief(0) && d.els['prev-btn'].disabled === true, 'demo navigatie: start op introductie, "Vorige" uit');
    d.els['next-btn'].onclick();
    check(teller() === '2 / ' + n && alleenActief(1) && d.els['prev-btn'].disabled === false, 'demo navigatie: "Volgende" vanaf introductie toont de positioneringsslide');
    d.doc.keydown.forEach((f) => f({ key: 'ArrowRight' }));
    check(teller() === '3 / ' + n && alleenActief(2), 'demo navigatie: pijl rechts naar de bestaande rollenslide');
    d.doc.keydown.forEach((f) => f({ key: 'ArrowLeft' }));
    d.els['prev-btn'].h.click.forEach((f) => f());
    check(teller() === '1 / ' + n && alleenActief(0), 'demo navigatie: pijl links en "Vorige" terug naar de introductie');
    d.kinderen.dot[1].h.click.forEach((f) => f());
    check(teller() === '2 / ' + n && alleenActief(1), 'demo navigatie: stip 2 opent de positioneringsslide');
    d.kinderen.dot[n - 1].h.click.forEach((f) => f());
    d.doc.keydown.forEach((f) => f({ key: 'ArrowRight' }));
    check(teller() === n + ' / ' + n && alleenActief(n - 1) && /Terug naar begin/.test(d.els['next-btn'].innerHTML), 'demo navigatie: laatste slide blijft laatste, knop "Terug naar begin"');
    d.els['next-btn'].onclick();
    check(teller() === '1 / ' + n && alleenActief(0), 'demo navigatie: "Terug naar begin" naar de introductie');
    d.els['fullscreen-btn'].h.click.forEach((f) => f());
    check(d.fullscreen() === 2, 'demo navigatie: knop "Volledig scherm" blijft werken');
  });

  // ── K. Verkoopmemorandum-lifecycle (B2, 14 okt 2026): echte UI-reis tegen het B1-contract ──
  // open → bewerk → opslaan → heropen → definitief → PDF → nieuwe conceptversie, plus rollen,
  // backendreadiness, stale 409, dubbelklik, fouten, time-out/late antwoorden, HTML-escaping en NDA.
  const TEKST_A = 'Concept A <img src=x onerror=alert(1)> & "quote"';
  const TEKST_B = '## Bedrijfsprofiel\n\nConcept B, bewerkt door de begeleider.';
  const TEKST_C = '## Bedrijfsprofiel\n\nConcept C, nieuwe conceptversie.';
  const KOP_CONCEPT = /Verkoopmemorandum &mdash; CONCEPT/;
  const vulVaststelling = (d) => { d.els['verkoopmemo-def-naam'].value = 'Synthetische Begeleider'; d.els['verkoopmemo-def-chk'].checked = true; };

  await tryAsync('verkoopmemo reis', async () => {
    const srv = maakVmServer({ tekst: TEKST_A, status: 'gegenereerd' });
    const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_A, verkoopmemorandum_status: 'gegenereerd', verkoopmemorandum_nda_door: '<b>Naam</b>', nda_getekend: false } });
    await d.open(); await even();
    const h0 = d.out.innerHTML;
    check(/Verkoopmemorandum &mdash; CONCEPT &middot; gegenereerd/.test(h0) && d.els['verkoopmemo-txt'].value === TEKST_A && !d.els['verkoopmemo-txt'].readOnly && d.els['verkoopmemo-def-btn'] && d.els['verkoopmemo-opslaan-btn'],
      'memo reis open: concept met status uit de server, opgeslagen tekst in de editor, Opslaan en Definitief vaststellen zichtbaar');
    check(!h0.includes('<img') && !h0.includes('<b>Naam') && h0.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quote&quot;') && h0.includes('NDA-ondertekening bevestigd door &lt;b&gt;Naam&lt;/b&gt;'),
      'memo reis open: memorandumtekst en NDA-naam geëscapet, geen actieve HTML');
    check(srv.log.length === 0, 'memo reis open: openen van een concept verstuurt niets (geen autosave, geen vaststelling)');
    d.klik('verkoopmemo-print-btn');
    const p1 = d.st.prints.pop();
    const pr1 = print(root, p1.tekst, p1.titel, p1.docType, {});
    check(p1.docType === 'memo' && p1.tekst === TEKST_A && p1.titel === 'Verkoopmemorandum — Synthetisch Kantoor BV' && pr1.html.includes('content:"CONCEPT"') && pr1.html.includes('Conceptversie &mdash;') && !inert(pr1.html, PRINT_TAGS).length,
      'memo reis PDF concept: echte printuitvoer met CONCEPT-watermerk en conceptregel, titel zonder code, inert');

    d.els['verkoopmemo-txt'].value = TEKST_B;
    vulVaststelling(d);
    await d.klik('verkoopmemo-def-btn');
    check(!d.calls(VM_DEFP).length && d.st.toasts.some((t) => t.type === 'err' && /niet-opgeslagen wijzigingen/.test(t.msg)) && d.els['verkoopmemo-txt'].value === TEKST_B,
      'memo reis: vaststellen met niet-opgeslagen wijzigingen verstuurt niets en houdt de tekst');
    const ops = d.klik('verkoopmemo-opslaan-btn'); d.klik('verkoopmemo-opslaan-btn'); await ops;
    const oc = d.calls(VM_OPS);
    check(oc.length === 1 && oc[0].body.tekst === TEKST_B && oc[0].body.nieuw_concept === undefined && oc[0].headers['x-tussen-key'] === VM_BG && srv.tekst === TEKST_B,
      'memo reis opslaan: dubbelklik geeft precies één opslag met de getypte tekst, zonder nieuw_concept');
    check(d.S.traject.verkoopmemorandum_tekst === TEKST_B && d.S.traject.verkoopmemorandum_status === 'bewerkt' && /CONCEPT &middot; bewerkt/.test(d.out.innerHTML) && d.st.toasts.some((t) => t.type === 'ok' && t.msg === 'Verkoopmemorandum opgeslagen.'),
      'memo reis opslaan: succes pas na ack, status "bewerkt" uit de server');

    await d.open(); await even();
    check(d.els['verkoopmemo-txt'].value === TEKST_B && KOP_CONCEPT.test(d.out.innerHTML) && !d.calls(VM_WZ).length, 'memo reis heropen: opgeslagen concept terug');
    d.els['verkoopmemo-def-naam'].value = '  '; d.els['verkoopmemo-def-chk'].checked = true;
    await d.klik('verkoopmemo-def-btn');
    d.els['verkoopmemo-def-naam'].value = 'Synthetische Begeleider'; d.els['verkoopmemo-def-chk'].checked = false;
    await d.klik('verkoopmemo-def-btn');
    check(!d.calls(VM_DEFP).length, 'memo reis definitief: zonder naam of zonder expliciete bevestiging geen verzoek');
    d.els['verkoopmemo-def-chk'].checked = true;
    const df = d.klik('verkoopmemo-def-btn'); d.klik('verkoopmemo-def-btn'); await df;
    const dc = d.calls(VM_DEFP);
    check(dc.length === 1 && dc[0].body.tekst_sha256 === vmHash(TEKST_B) && dc[0].body.vastgesteld_door === 'Synthetische Begeleider' && dc[0].body.tekst === TEKST_B && dc[0].body.code === VM_BG && dc[0].headers['x-tussen-key'] === VM_BG,
      'memo reis definitief: dubbelklik geeft één verzoek met SHA-256 (gelijk aan node:crypto) van exact de opgeslagen tekst, naam en tekst');
    check(srv.status === 'definitief' && srv.snaps.length === 1 && d.S.traject.verkoopmemorandum_status === 'definitief' && /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML) && /Vastgesteld door Synthetische Begeleider/.test(d.out.innerHTML)
      && d.els['verkoopmemo-txt'].readOnly && !d.els['verkoopmemo-opslaan-btn'] && !d.els['verkoopmemo-nieuw-btn'] && !d.els['verkoopmemo-def-btn'] && d.els['verkoopmemo-nieuwconcept-btn'],
      'memo reis definitief: na ack status/versie/vaststeller zichtbaar, tekst vergrendeld, geen Opslaan/genereren, wel Nieuwe conceptversie');
    d.klik('verkoopmemo-print-btn');
    const p2 = d.st.prints.pop();
    const pr2 = print(root, p2.tekst, p2.titel, p2.docType, {});
    check(p2.docType === 'memo_definitief' && p2.tekst === TEKST_B && /definitieve versie 1\)$/.test(p2.titel) && !pr2.html.includes('content:"CONCEPT"') && !pr2.html.includes('Conceptversie') && !inert(pr2.html, PRINT_TAGS).length,
      'memo reis PDF definitief: exact de vastgestelde tekst, zonder watermerk en conceptregel, titel met versie');

    await d.open(); await wachtOp(() => /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML));
    check(d.calls(VM_WZ).length === 1 && d.calls(VM_WZ)[0].headers['x-tussen-key'] === VM_BG && /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML) && !d.els['verkoopmemo-melding'],
      'memo reis heropen definitief: versie en vaststeller uit het bestaande auditspoor, controlegetal klopt');
    d.klik('verkoopmemo-print-btn');
    check(d.st.prints.pop().docType === 'memo_definitief', 'memo reis heropen definitief: PDF zonder watermerk');

    const voorNc = srv.log.length;
    d.klik('verkoopmemo-nieuwconcept-btn');
    check(srv.log.length === voorNc && !d.els['verkoopmemo-txt'].readOnly && /nieuwe conceptversie, nog niet opgeslagen/.test(d.out.innerHTML) && srv.status === 'definitief' && !d.els['verkoopmemo-def-btn'] && !d.els['verkoopmemo-email-btn'],
      'memo reis nieuwe conceptversie: alleen lokaal geopend (geen verzoek), definitief blijft op de server, geen vaststellen of verzenden van niet-opgeslagen tekst');
    d.klik('verkoopmemo-print-btn');
    check(d.st.prints.pop().docType === 'memo', 'memo reis nieuwe conceptversie: PDF weer met CONCEPT-watermerk');
    d.els['verkoopmemo-txt'].value = TEKST_C;
    await d.klik('verkoopmemo-opslaan-btn');
    const nc = d.calls(VM_OPS).at(-1);
    check(nc.body.nieuw_concept === true && nc.body.definitief_sha256 === vmHash(TEKST_B) && srv.status === 'bewerkt' && srv.tekst === TEKST_C && srv.snaps.length === 1 && srv.snaps[0].tekst === TEKST_B && srv.snaps[0].hash === vmHash(TEKST_B),
      'memo reis nieuwe conceptversie: expliciet nieuw_concept + hash van de definitieve tekst; snapshot versie 1 onaangeroerd');
    check(/CONCEPT &middot; bewerkt/.test(d.out.innerHTML) && /Laatste definitieve versie: 1/.test(d.out.innerHTML) && d.S.traject.verkoopmemorandum_status === 'bewerkt' && d.els['verkoopmemo-txt'].value === TEKST_C,
      'memo reis nieuwe conceptversie: concept zichtbaar met de laatste definitieve versie');
    vulVaststelling(d);
    await d.klik('verkoopmemo-def-btn');
    check(srv.snaps.length === 2 && srv.snaps[1].versie === 2 && srv.snaps[0].tekst === TEKST_B && /DEFINITIEF &middot; versie 2/.test(d.out.innerHTML) && d.calls(VM_DEFP).length === 2,
      'memo reis: tweede vaststelling wordt versie 2, versie 1 blijft; precies twee vaststellingsverzoeken, beide na een klik');
  });

  await tryAsync('verkoopmemo stale 409', async () => {
    const srv = maakVmServer({ tekst: 'Serverversie van een collega', status: 'bewerkt' });
    const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
    await d.open();
    vulVaststelling(d);
    await d.klik('verkoopmemo-def-btn');
    check(srv.status === 'bewerkt' && !srv.snaps.length && d.S.traject.verkoopmemorandum_status === 'bewerkt' && d.els['verkoopmemo-txt'].value === TEKST_B && KOP_CONCEPT.test(d.out.innerHTML)
      && /wijkt af van de tekst die u wilt vaststellen/.test(d.out.innerHTML) && d.els['verkoopmemo-herlees-btn'] && !d.st.toasts.some((t) => t.type === 'ok'),
      'memo stale definitief: 409 VEROUDERD → niets vastgesteld, tekst blijft, melding met "Opnieuw lezen"');
    const n = srv.log.length;
    await d.klik('verkoopmemo-def-btn'); await d.klik('verkoopmemo-opslaan-btn');
    check(srv.log.length === n && d.els['verkoopmemo-txt'].value === TEKST_B, 'memo stale: opnieuw vaststellen of opslaan geblokkeerd tot opnieuw lezen (geen force)');
    await d.klik('verkoopmemo-herlees-btn');
    check(d.calls(VM_TRAJ).length === 1 && d.els['verkoopmemo-txt'].value === 'Serverversie van een collega' && d.els['verkoopmemo-eigen-txt'] && d.els['verkoopmemo-eigen-txt'].value === TEKST_B && d.S.traject.verkoopmemorandum_tekst === 'Serverversie van een collega' && !d.els['verkoopmemo-melding'],
      'memo stale: opnieuw lezen toont de servertekst en houdt de eigen tekst zichtbaar');
    d.klik('verkoopmemo-eigen-terug-btn');
    check(d.els['verkoopmemo-txt'].value === TEKST_B && !srv.log.slice(n).some((c) => c.pad === VM_OPS || c.pad === VM_DEFP), 'memo stale: eigen tekst terug in de editor, niets automatisch opgeslagen of vastgesteld');
    await d.klik('verkoopmemo-opslaan-btn');
    vulVaststelling(d);
    await d.klik('verkoopmemo-def-btn');
    check(srv.status === 'definitief' && srv.snaps.length === 1 && srv.snaps[0].tekst === TEKST_B && srv.log.every((c) => !c.body || !('force' in c.body)),
      'memo stale: na opnieuw lezen en bewust opslaan wordt exact de eigen tekst vastgesteld; nergens een force-veld');
  });

  await tryAsync('verkoopmemo opslaan op definitief', async () => {
    const srv = maakVmServer({ tekst: TEKST_B, status: 'definitief' });
    const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
    await d.open();
    d.els['verkoopmemo-txt'].value = TEKST_C;
    await d.klik('verkoopmemo-opslaan-btn');
    check(srv.tekst === TEKST_B && srv.status === 'definitief' && d.calls(VM_OPS).length === 1 && d.calls(VM_OPS)[0].body.nieuw_concept === undefined && d.els['verkoopmemo-txt'].value === TEKST_C
      && /definitief vastgesteld en wordt niet overschreven/.test(d.out.innerHTML) && d.S.traject.verkoopmemorandum_status === 'bewerkt' && !d.st.toasts.some((t) => t.type === 'ok') && d.els['verkoopmemo-herlees-btn'],
      'memo opslaan terwijl elders definitief: 409 DEFINITIEF, final niet overschreven, geen automatisch nieuw concept, tekst blijft, opnieuw lezen vereist');
  });

  await tryAsync('verkoopmemo rollen en fouten', async () => {
    for (const [naam, key] of [['koper', CODES.koper], ['verkoper', CODES.verkoper]]) {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, bgKey: key, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      vulVaststelling(d);
      await d.klik('verkoopmemo-def-btn');
      d.els['verkoopmemo-txt'].value = TEKST_C;
      await d.klik('verkoopmemo-opslaan-btn');
      check(srv.status === 'bewerkt' && !srv.snaps.length && srv.tekst === TEKST_B && d.S.traject.verkoopmemorandum_status === 'bewerkt' && d.S.traject.verkoopmemorandum_tekst === TEKST_B
        && /Unauthorized/.test(d.out.innerHTML) && KOP_CONCEPT.test(d.out.innerHTML) && d.els['verkoopmemo-txt'].value === TEKST_C && !d.st.toasts.some((t) => t.type === 'ok'),
        'memo rol ' + naam + 'code: backend weigert (401), UI toont de fout, blijft concept en houdt de tekst');
    }
    const varianten = [
      ['HTTP 500 met HTML', () => hAntw(500, { error: 'Vaststelling niet vastgelegd <img src=x onerror=alert(1)>', code: 'NIET_VASTGELEGD' }), /Vaststelling niet vastgelegd &lt;img src=x onerror=alert\(1\)&gt;/, false],
      ['netwerkfout', () => Promise.reject(new TypeError('Failed to fetch')), /Geen bevestiging van de server/, true],
      ['ongeldige JSON', () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }), /Vaststellen mislukt/, true],
      ['200 met afwijkende hash', () => hAntw(200, { ok: true, status: 'definitief', definitief_versie: 1, tekst_sha256: '0'.repeat(64) }), /Vaststellen mislukt/, true],
    ];
    for (const [naam, antw, re, herlezen] of varianten) {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      vulVaststelling(d);
      srv.eenmalig[VM_DEFP] = antw;
      await d.klik('verkoopmemo-def-btn');
      check(re.test(d.out.innerHTML) && !d.out.innerHTML.includes('<img') && d.S.traject.verkoopmemorandum_status === 'bewerkt' && KOP_CONCEPT.test(d.out.innerHTML) && d.els['verkoopmemo-txt'].value === TEKST_B && !d.st.toasts.some((t) => t.type === 'ok'),
        'memo definitief ' + naam + ': geen succes, fout geëscapet getoond, tekst en conceptstatus blijven');
      const n = srv.log.length;
      vulVaststelling(d);
      await d.klik('verkoopmemo-def-btn');
      check(herlezen ? srv.log.length === n : srv.log.length === n + 1, 'memo definitief ' + naam + ': ' + (herlezen ? 'onbekende uitkomst vereist eerst opnieuw lezen' : 'bekende serverfout mag opnieuw geprobeerd worden'));
    }
  });

  await tryAsync('verkoopmemo time-out en late antwoorden', async () => {
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      vulVaststelling(d);
      srv.hold.add(VM_DEFP);
      const p = d.klik('verkoopmemo-def-btn');
      await wachtOp(() => srv.wacht.length === 1);
      d.klok.vuur(); await p;
      check(/Geen bevestiging van de server/.test(d.out.innerHTML) && d.S.traject.verkoopmemorandum_status === 'bewerkt' && KOP_CONCEPT.test(d.out.innerHTML) && d.els['verkoopmemo-herlees-btn'] && d.klok.open === 0,
        'memo time-out vaststellen: onbekende uitkomst, niet als definitief getoond, opnieuw lezen vereist, timer weg');
      srv.hold.delete(VM_DEFP); srv.wacht[0].los();
      await d.klik('verkoopmemo-herlees-btn'); await wachtOp(() => /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML));
      check(/DEFINITIEF &middot; versie 1/.test(d.out.innerHTML) && d.S.traject.verkoopmemorandum_status === 'definitief' && d.calls(VM_DEFP).length === 1,
        'memo time-out: opnieuw lezen toont de werkelijke serverstatus met versie uit het auditspoor, zonder nieuwe vaststelling');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      d.els['verkoopmemo-txt'].value = TEKST_C;
      srv.hold.add(VM_OPS);
      const p = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => srv.wacht.length === 1);
      const oudT = d.S.traject;
      const nieuwS = { code: VM_BG, _bgKey: VM_BG, traject: { verkoopmemorandum_tekst: 'Nieuwe sessie', verkoopmemorandum_status: 'bewerkt' } };
      d.ctx.S = nieuwS;
      const voor = d.out.innerHTML, toasts = d.st.toasts.length;
      srv.wacht[0].los(); await p; await even();
      check(nieuwS.traject.verkoopmemorandum_tekst === 'Nieuwe sessie' && oudT.verkoopmemorandum_tekst === TEKST_B && d.out.innerHTML === voor && d.st.toasts.length === toasts,
        'memo laat opslagantwoord na sessiewissel (zelfde code): geen succes, geen toast, geen render, geen mutatie van oude of nieuwe context');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      d.els['verkoopmemo-txt'].value = TEKST_C;
      srv.hold.add(VM_OPS);
      const p = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => srv.wacht.length === 1);
      d.klik('verkoopmemo-sluit-btn');
      const voor = d.out.innerHTML, toasts = d.st.toasts.length;
      srv.wacht[0].los(); await p; await even();
      check(d.out.style.display === 'none' && d.out.innerHTML === voor && d.st.toasts.length === toasts && d.S.traject.verkoopmemorandum_tekst === TEKST_C && srv.tekst === TEKST_C,
        'memo laat opslagantwoord na sluiten: geen render of toast; traject volgt alleen de bevestigde servertekst');
      await d.open();
      check(d.els['verkoopmemo-txt'].value === TEKST_C, 'memo heropenen na late bevestigde opslag: bevestigde tekst zichtbaar');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      d.els['verkoopmemo-txt'].value = TEKST_C;
      srv.hold.add(VM_OPS);
      const p = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => srv.wacht.length === 1);
      await d.open();
      d.els['verkoopmemo-txt'].value = 'Nieuwe invoer in de nieuwe weergave';
      srv.wacht[0].los(); await p; await even();
      check(d.els['verkoopmemo-txt'].value === 'Nieuwe invoer in de nieuwe weergave' && !d.st.toasts.some((t) => t.type === 'ok'),
        'memo laat opslagantwoord na heropenen: nieuwe weergave en invoer blijven onaangeroerd');
    }
  });

  await tryAsync('verkoopmemo readiness', async () => {
    const srv = maakVmServer();
    srv.genereer = { ok: false, error: 'Onvoldoende data voor een verkoopmemorandum — nog in te vullen: omzet (fase Financieel).',
      readiness: { generation_allowed: false, blocking_validations: [{ veld: 'omzet3', fase: 'financieel', reden: 'Nog in te vullen: omzet (fase Financieel) <script>x</script>' }], warnings: [] } };
    const d = laadVerkoopmemo(root, { server: srv, traject: { nda_getekend: true } });
    await d.open();
    check(d.calls(VM_GEN).length === 1 && d.out.innerHTML.includes('nog in te vullen: omzet (fase Financieel).') && d.out.innerHTML.includes('<li>Nog in te vullen: omzet (fase Financieel) &lt;script&gt;x&lt;/script&gt;</li>')
      && !d.els['verkoopmemo-txt'] && !d.calls(VM_OPS).length && d.els['verkoopmemo-err-opnieuw'],
      'memo readiness: ontbrekende minimale basis uit de backend concreet en geëscapet getoond; geen concept, geen opslag');
    srv.genereer = { ok: true, tekst: 'Synthetisch memorandum', readiness: { generation_allowed: true, blocking_validations: [], warnings: [{ fase: 'it', reden: 'Nog geen gegevens in fase IT & automatisering — in het concept vermeld als nog niet aangeleverd, niet ingevuld.' }] } };
    d.klik('verkoopmemo-err-opnieuw'); await wachtOp(() => !!d.els['verkoopmemo-txt']);
    check(/Alleen voor u zichtbaar, niet in het document/.test(d.out.innerHTML) && d.out.innerHTML.includes('IT &amp; automatisering') && d.els['verkoopmemo-txt'].value === 'Synthetisch memorandum' && d.els['verkoopmemo-def-btn'] && /CONCEPT &middot; nieuw gegenereerd/.test(d.out.innerHTML),
      'memo readiness: waarschuwingen uit de backend zichtbaar; vaststellen niet geblokkeerd (geen alle-velden-gate)');
    srv.genereer = { ok: true, tekst: 'Tweede generatie', readiness: { warnings: [] } };
    d.klik('verkoopmemo-nieuw-btn'); await wachtOp(() => d.els['verkoopmemo-txt'] && d.els['verkoopmemo-txt'].value === 'Tweede generatie');
    check(!/Nog niet aangeleverd/.test(d.out.innerHTML) && d.els['verkoopmemo-txt'].value === 'Tweede generatie' && d.S.traject.verkoopmemorandum_status === 'gegenereerd',
      'memo readiness: zonder backendwaarschuwing geen eigen frontendreadiness');
    srv.status = 'definitief';
    d.klik('verkoopmemo-nieuw-btn'); await wachtOp(() => !!d.els['verkoopmemo-err-herlees']);
    check(d.els['verkoopmemo-err-herlees'] && !d.els['verkoopmemo-err-opnieuw'] && /definitief vastgesteld/.test(d.out.innerHTML), 'memo genereren op een intussen definitief memorandum: 409 met "Opnieuw lezen" in plaats van opnieuw proberen');
  });

  await tryAsync('verkoopmemo NDA', async () => {
    // #91 F4 (28 okt 2026, besluit Marcel): een concept-IM mag vóór de NDA worden gegenereerd; geen bevestigingsvenster meer.
    const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
    const d = laadVerkoopmemo(root, { server: srv, traject: { nda_getekend: false, verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
    await d.open();
    srv.genereer = { ok: true, tekst: 'Concept zonder NDA', readiness: { warnings: [] }, intern_ontbrekend: [{ onderdeel: 'Klanten <b>x</b>', reden: 'geen brongegevens' }] };
    d.klik('verkoopmemo-nieuw-btn'); await wachtOp(() => d.els['verkoopmemo-txt'] && d.els['verkoopmemo-txt'].value === 'Concept zonder NDA');
    check(!d.els['verkoopmemo-nda-door'] && d.calls(VM_GEN).length === 1, 'memo zonder platform-NDA: direct genereren, geen NDA-bevestigingsvenster');
    // Versturen zonder via het platform ondertekende NDA (besluit 28-10): knop uit, geen verzoek, geen handmatige bevestiging.
    d.els['verkoopmemo-email-naar'].value = 'synth@example.invalid';
    d.klik('verkoopmemo-email-btn');
    check(d.calls(VM_MAIL).length === 0 && !d.els['verkoopmemo-nda-chk'] && !d.els['verkoopmemo-nda-naam'] && /via het platform heeft ondertekend/.test(d.out.innerHTML), 'memo versturen zonder ondertekende NDA: geen verzoek, geen handmatige bevestiging, duidelijke uitleg');
    const body = d.calls(VM_GEN)[0].body || {};
    check(body.nda_bevestigd === false && !body.nda_bevestigd_door, 'memo zonder NDA: geen bevestiging of naam meegestuurd');
    check(/Alleen voor u zichtbaar, niet in het document/.test(d.out.innerHTML) && d.out.innerHTML.includes('Klanten &lt;b&gt;x&lt;/b&gt;') && !d.out.innerHTML.includes('<b>x</b>'),
      'memo: interne lijst weggelaten onderdelen zichtbaar voor de begeleider en geëscapet');
  });

  await tryAsync('verkoopmemo definitief niet controleerbaar', async () => {
    const gevallen = [
      ['snapshot ontbreekt', (s) => { s.auditZichtbaar = false; }, /geen bijpassende vastgelegde definitieve versie/],
      ['snapshot van andere tekst', (s) => { s.snaps.push({ id: 'WZX', versie: 1, hash: vmHash('Andere tekst'), tekst: 'Andere tekst', door: 'X', op: 1 }); }, /geen bijpassende vastgelegde definitieve versie/],
      ['auditspoor 500', (s) => { s.eenmalig[VM_WZ] = () => hAntw(500, { error: 'DB' }); }, /kon niet worden gelezen/],
      ['auditspoor netwerkfout', (s) => { s.eenmalig[VM_WZ] = () => Promise.reject(new TypeError('Failed to fetch')); }, /kon niet worden gelezen/],
      ['auditspoor afgeschermd', (s) => { s.eenmalig[VM_WZ] = () => hAntw(200, { wijzigingen: [], inhoud_afgeschermd: true }); }, /kon niet worden gelezen/],
    ];
    for (const [naam, prep, re] of gevallen) {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'definitief' }); prep(srv);
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'definitief' } });
      await d.open();
      d.klik('verkoopmemo-print-btn');
      const p = d.st.prints.pop();
      check(re.test(d.out.innerHTML) && d.out.innerHTML.includes('Verkoopmemorandum &mdash; DEFINITIEF</div>') && p && p.docType === 'memo' && d.st.toasts.some((t) => /CONCEPT-watermerk/.test(t.msg)) && d.els['verkoopmemo-txt'].readOnly,
        'memo definitief ' + naam + ': niet als bevestigd behandeld, PDF met CONCEPT-watermerk, eerlijke melding');
    }
  });

  // #19 conceptbehoud: niet-opgeslagen invoer blijft binnen dezelfde sessie en hetzelfde traject bewaard
  // bij sluiten/heropenen en hertekening — alleen in geheugen, synchroon bij invoer, zonder verzoek.
  const typ = (d, t) => { d.els['verkoopmemo-txt'].value = t; d.els['verkoopmemo-txt'].oninput(); };
  const geenOpslag = (d) => !d.calls(VM_OPS).length && !d.calls(VM_DEFP).length && !d.calls(VM_GEN).length;
  await tryAsync('verkoopmemo conceptbehoud', async () => {
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      typ(d, TEKST_C);
      d.klik('verkoopmemo-sluit-btn');
      check(d.out.style.display === 'none', 'memo conceptbehoud: sluitknop sluit nog steeds');
      await d.open();
      check(d.els['verkoopmemo-txt'].value === TEKST_C && KOP_CONCEPT.test(d.out.innerHTML) && !d.els['verkoopmemo-melding'] && !srv.log.length && srv.tekst === TEKST_B && d.S.traject.verkoopmemorandum_tekst === TEKST_B,
        'memo conceptbehoud: getypt → sluiten → heropenen toont de eigen niet-opgeslagen tekst; geen verzoek, opgeslagen tekst ongewijzigd');
      // Flowhertekening: dashboard ververst (nieuw trajectobject, zelfde servertekst) zonder sluitklik.
      typ(d, TEKST_C + ' extra');
      d.S.traject = { ...d.S.traject }; d.out.innerHTML = '';
      await d.open();
      check(d.els['verkoopmemo-txt'].value === TEKST_C + ' extra' && !srv.log.length, 'memo conceptbehoud: na hertekening van de flow staat de laatst getypte tekst terug');
      // Hertekening met intussen gewijzigde servertekst: eigen tekst apart, nooit over de opgeslagen tekst.
      d.S.traject = { ...d.S.traject, verkoopmemorandum_tekst: 'Serverversie van een collega' }; d.out.innerHTML = '';
      await d.open();
      check(d.els['verkoopmemo-txt'].value === 'Serverversie van een collega' && d.els['verkoopmemo-eigen-txt'] && d.els['verkoopmemo-eigen-txt'].value === TEKST_C + ' extra' && !srv.log.length,
        'memo conceptbehoud: gewijzigde opgeslagen tekst blijft gezaghebbend; eigen tekst apart als "Uw eigen tekst"');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      typ(d, TEKST_C);
      await d.klik('verkoopmemo-opslaan-btn');
      d.klik('verkoopmemo-sluit-btn'); await d.open();
      check(d.els['verkoopmemo-txt'].value === TEKST_C && !d.S._vmConcept && d.calls(VM_OPS).length === 1, 'memo conceptbehoud: bevestigde opslag ruimt het concept op');
      typ(d, 'Eerste'); srv.hold.add(VM_OPS);
      const p = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => srv.wacht.length === 1);
      typ(d, 'Nieuwere invoer');
      srv.wacht[0].los(); await p; await even();
      d.klik('verkoopmemo-sluit-btn'); await d.open();
      check(srv.tekst === 'Eerste' && d.S.traject.verkoopmemorandum_tekst === 'Eerste' && d.els['verkoopmemo-txt'].value === 'Nieuwere invoer' && d.calls(VM_OPS).length === 2,
        'memo conceptbehoud: ack van een oudere opslag ruimt nieuwere invoer niet op');
      typ(d, 'Tweede'); srv.wacht.length = 0;
      const p2 = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => srv.wacht.length === 1);
      typ(d, 'Na klik getypt'); d.klik('verkoopmemo-sluit-btn');
      srv.wacht[0].los(); await p2; await even();
      await d.open();
      check(srv.tekst === 'Tweede' && d.els['verkoopmemo-txt'].value === 'Na klik getypt' && d.calls(VM_OPS).length === 3,
        'memo conceptbehoud: late ack na sluiten ruimt alleen de bevestigde versie op; nieuwere invoer blijft na heropenen');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      typ(d, TEKST_C);
      srv.eenmalig[VM_OPS] = () => hAntw(500, { error: 'DB' });
      await d.klik('verkoopmemo-opslaan-btn');
      d.klik('verkoopmemo-sluit-btn'); await d.open();
      check(srv.tekst === TEKST_B && d.S.traject.verkoopmemorandum_tekst === TEKST_B && d.els['verkoopmemo-txt'].value === TEKST_C && !d.st.toasts.some((t) => t.type === 'ok'),
        'memo conceptbehoud: na serverfout blijft de eigen tekst na sluiten/heropenen staan; niets als opgeslagen getoond');
      let los;
      srv.eenmalig[VM_OPS] = () => new Promise((r) => { los = () => r(hAntw(409, { error: 'De opgeslagen memorandumtekst is gewijzigd.', code: 'VEROUDERD' })); });
      typ(d, TEKST_C + ' laat');
      const p = d.klik('verkoopmemo-opslaan-btn');
      await wachtOp(() => typeof los === 'function');
      d.klik('verkoopmemo-sluit-btn');
      const voor = d.out.innerHTML, toasts = d.st.toasts.length;
      los(); await p; await even();
      check(d.out.innerHTML === voor && d.st.toasts.length === toasts, 'memo conceptbehoud: late 409 na sluiten tekent of toast niet');
      await d.open();
      const n = srv.log.length;
      await d.klik('verkoopmemo-opslaan-btn');
      check(d.els['verkoopmemo-txt'].value === TEKST_C + ' laat' && d.els['verkoopmemo-melding'] && d.els['verkoopmemo-herlees-btn'] && srv.log.length === n && srv.tekst === TEKST_B,
        'memo conceptbehoud: na late 409 toont heropenen de eigen tekst met "Opnieuw lezen"; opslaan blijft geblokkeerd tot opnieuw lezen');
      await d.klik('verkoopmemo-herlees-btn');
      check(d.els['verkoopmemo-txt'].value === TEKST_B && d.els['verkoopmemo-eigen-txt'] && d.els['verkoopmemo-eigen-txt'].value === TEKST_C + ' laat' && !d.els['verkoopmemo-melding'],
        'memo conceptbehoud: opnieuw lezen werkt ongewijzigd; eigen tekst apart behouden');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      typ(d, TEKST_C); d.klik('verkoopmemo-sluit-btn');
      const nieuwS = { code: VM_BG, _bgKey: VM_BG, traject: { kantoor_naam: 'Synthetisch Kantoor BV', nda_getekend: true, verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } };
      d.ctx.S = nieuwS;
      await d.open();
      check(d.els['verkoopmemo-txt'].value === TEKST_B && !d.out.innerHTML.includes('Concept C') && !nieuwS._vmConcept, 'memo conceptbehoud: nieuwe sessie (na uitloggen) toont nooit tekst uit de vorige sessie');
      typ(d, TEKST_C); d.klik('verkoopmemo-sluit-btn');
      nieuwS.code = 'T-ANDER-TRAJECT';
      nieuwS.traject = { kantoor_naam: 'Ander BV', nda_getekend: true, verkoopmemorandum_tekst: 'Ander traject', verkoopmemorandum_status: 'bewerkt' };
      await d.open();
      check(d.els['verkoopmemo-txt'].value === 'Ander traject' && !d.out.innerHTML.includes('Concept C') && !nieuwS._vmConcept, 'memo conceptbehoud: ander traject toont nooit het concept van een vorig traject');
      check(geenOpslag(d), 'memo conceptbehoud sessie/traject: geen automatisch opslag-, vaststellings- of generatieverzoek');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'definitief' });
      srv.snaps.push({ id: 'WZDEF1', versie: 1, hash: vmHash(TEKST_B), tekst: TEKST_B, door: 'Synthetische Begeleider', op: Date.UTC(2026, 9, 14, 10, 1) });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'definitief' } });
      await d.open(); await wachtOp(() => /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML));
      d.klik('verkoopmemo-nieuwconcept-btn');
      typ(d, TEKST_C); d.klik('verkoopmemo-sluit-btn');
      await d.open(); await even();
      check(d.els['verkoopmemo-txt'].value === TEKST_C && !d.els['verkoopmemo-txt'].readOnly && /nieuwe conceptversie, nog niet opgeslagen/.test(d.out.innerHTML) && srv.status === 'definitief' && srv.tekst === TEKST_B,
        'memo conceptbehoud definitief: heropenen herstelt de expliciet geopende nieuwe conceptversie; definitief blijft op de server');
      d.klik('verkoopmemo-nieuwconcept-ann');
      d.klik('verkoopmemo-sluit-btn');
      await d.open(); await wachtOp(() => /DEFINITIEF &middot; versie 1/.test(d.out.innerHTML));
      check(d.els['verkoopmemo-txt'].value === TEKST_B && d.els['verkoopmemo-txt'].readOnly && d.els['verkoopmemo-eigen-txt'] && d.els['verkoopmemo-eigen-txt'].value === TEKST_C && d.els['verkoopmemo-nieuwconcept-btn'],
        'memo conceptbehoud definitief: na annuleren blijft de definitieve tekst read-only en gezaghebbend; eigen tekst apart');
      check(geenOpslag(d) && srv.log.every((c) => c.pad === VM_WZ), 'memo conceptbehoud definitief: alleen het bestaande auditspoor gelezen, geen automatisch verzoek');
    }
    {
      const srv = maakVmServer({ tekst: TEKST_B, status: 'bewerkt' });
      const d = laadVerkoopmemo(root, { server: srv, traject: { verkoopmemorandum_tekst: TEKST_B, verkoopmemorandum_status: 'bewerkt' } });
      await d.open();
      typ(d, TEKST_C); d.klik('verkoopmemo-sluit-btn');
      d.S.traject = { ...d.S.traject, verkoopmemorandum_status: 'definitief' }; d.out.innerHTML = '';
      await d.open(); await even();
      check(d.els['verkoopmemo-txt'].value === TEKST_B && d.els['verkoopmemo-txt'].readOnly && d.els['verkoopmemo-eigen-txt'] && d.els['verkoopmemo-eigen-txt'].value === TEKST_C && geenOpslag(d),
        'memo conceptbehoud: intussen definitief → concept overschrijft de definitieve tekst nooit, blijft apart beschikbaar');
    }
  });

  tryCheck('verkoopmemo statisch', () => {
    const fn = tot(lees(root, 'mna/04-begeleider-dashboard.js'), 'async function toonVerkoopmemoModal(){', 'async function toonClosingModal(){');
    check(!/setInterval|localStorage|sessionStorage|\bforce\b/.test(fn) && (fn.match(/\/mna\/verkoopmemorandum\/definitief'/g) || []).length === 1 && (fn.match(/\/mna\/verkoopmemorandum\/opslaan'/g) || []).length === 1,
      'mna/04 memorandum: geen interval/autosave/browseropslag/force; precies één vaststellings- en één opslagaanroep, alleen via knoppen');
  });

  // ── L. Definitieve MOU/LoI/NDA-print (productpunt 14, 17 okt 2026) ──
  // Draait de ECHTE composer (bgMouRender/bgMouWire/bgMouPrintDefinitief, mna/04) met de ECHTE
  // reliance-/printketen (toonRelianceAkkoord/printDoc/printTosDefinitief/printDocNaAkkoord, mna/05) tegen
  // een synthetische printversie volgens het contract van worker/31 (backend check 31), met echte
  // WebCrypto (node:crypto) of bewust zonder. Geen netwerk, geen AI, geen mail, geen klantdata.
  const PV_TEKST = {
    mou: '## Partijen\n\nKoper: Koper Definitief BV\n\nDefinitieve servertekst MOU met <b>vaste</b> afspraak & voorwaarde.',
    loi: 'Artikel 1 Intentie\n\nDefinitieve servertekst LOI.\n\nNaam: ____\nHandtekening: ____',
    nda: '## Geheimhouding\n\nDefinitieve servertekst NDA <img src=x onerror=alert(1)>.',
  };
  const PV_DOCS = {
    mou: ['MOU', 'doc-F', 'exported', 'gefinaliseerd', 'Memorandum of Understanding'],
    loi: ['LOI', 'doc-L', 'verstuurd', 'verstuurd', 'Letter of Intent'],
    nda: ['NDA', 'doc-N', 'goedgekeurd', 'goedgekeurd door beide partijen', 'Geheimhoudingsovereenkomst (NDA)'],
  };
  const pvAntw = (id, type, status, version, tekst = PV_TEKST[type]) => ({ ok: true, document: { id, doc_type: type, status, version }, titel: 'Profieltitel', printtekst: tekst,
    print_hash: vmHash(tekst), content_hash: vmHash('canoniek ' + tekst), manifest_hash: vmHash('manifest ' + tekst) });
  const laadPv = (opts = {}) => {
    const t = laadComposer(root, { echtePrint: true, ...opts });
    Object.entries(PV_DOCS).forEach(([type, [, id, status]]) => {
      t.srv.docs[id] = { document: { id, status, current_version: 2, bevroren: true }, componenten: [compSyn('i-' + id, { koper: 'Koper Scherm BV' }, 'DOM-schermtekst ' + type)] };
    });
    t.srv.printversie = (id) => {
      const d = t.srv.docs[id]; const type = Object.keys(PV_DOCS).find((k) => PV_DOCS[k][1] === id);
      if (!d || !type || !['exported', 'verstuurd', 'goedgekeurd'].includes(d.document.status)) return [409, { error: 'Dit document heeft geen definitieve versie.' }];
      return [200, pvAntw(id, type, d.document.status, d.document.current_version)];
    };
    t.S._relianceBevestigdDoor = 'Synthetische Begeleider';
    return t;
  };
  const klikPrint = (t) => { const b = t.doc.getElementById('mou-print'); if (!b || typeof b.onclick !== 'function') throw new Error('printknop ontbreekt'); b.onclick(); };
  const naPrint = async (t) => { await wachtOp(() => t.eff.html.length || t.eff.toasts.length || t.eff.modals); await rust(); };
  const pvVerzoeken = (t) => t.srv.verzoeken.filter((v) => /\/printversie$/.test(v.pad));
  const pvLos = (t) => t.los((q) => /\/printversie$/.test(q.pad), true);
  const pvBody = (h) => { const a = h.indexOf('<div class="doc-body">'); return a < 0 ? '' : h.slice(a, h.indexOf('<div class="doc-footer">', a)); };
  const watermerk = (h) => String(h).includes('content:"CONCEPT"');
  const geenLek = (s) => !/doc-[A-Z]\b|[0-9a-f]{64}|TSYN|Serverdetail/.test(s);

  await tryAsync('printversie definitief', async () => {
    for (const [type, [prof, id, status, label, titel]] of Object.entries(PV_DOCS)) {
      const t = laadPv();
      await t.ctx.bgMouRender(undefined, undefined, prof, id);
      const voor = t.srv.verzoeken.length;
      klikPrint(t); await naPrint(t);
      const h = t.eff.html[0] || ''; const j = pvAntw(id, type, status, 2);
      check(t.eff.html.length === 1 && !watermerk(h) && pvBody(h) === pvBody(print(root, PV_TEKST[type], 'x', type).html) && !h.includes('DOM-schermtekst') && !h.includes('Conceptversie'),
        'printversie ' + type + ' (' + status + '): exacte geverifieerde servertekst via de bestaande printflow, zonder CONCEPT-watermerk en zonder schermtekst');
      check(h.includes('<div class="doc-title">' + titel + ' (definitief &mdash; versie 2, ' + label + ')</div>'), 'printversie ' + type + ': alleen definitief/versie/status zichtbaar in de titel');
      check(![id, j.print_hash, j.content_hash, j.manifest_hash, 'TSYN-TRAJECT-1', 'TSYN0003', 'Profieltitel'].some((x) => h.includes(x)) && !/[0-9a-f]{64}/.test(h) && !inert(h, PRINT_TAGS).length,
        'printversie ' + type + ': geen document-id, hashes, trajectcode of sleutel in het printvenster; uitvoer inert');
      check(t.srv.verzoeken.slice(voor).map((v) => v.method + ' ' + v.pad).join('|') === 'GET /mna/tos/document/' + id + '/printversie' && !t.eff.toasts.length && t.eff.audit.length === 1 && t.eff.audit[0].type === 'reliance_bevestiging',
        'printversie ' + type + ': precies één read-only printversie-GET, geen schrijfverzoek of melding; reliance-audit zoals voorheen');
    }
    const t = laadPv(); t.S.traject = { kantoor_naam: 'Kantoor <Synth> BV' };
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
    check((t.eff.html[0] || '').includes('<div class="doc-title">Memorandum of Understanding &mdash; Kantoor &lt;Synth&gt; BV (definitief &mdash; versie 2, gefinaliseerd)</div>'),
      'printversie: kantoornaam geëscapet in de definitieve titel');
  });

  await tryAsync('printversie concept', async () => {
    for (const [prof, lbl] of [['MOU', 'Memorandum of Understanding'], ['LOI', 'Letter of Intent'], ['NDA', 'Geheimhoudingsovereenkomst (NDA)']]) {
      const t = laadPv();
      await t.ctx.bgMouRender(undefined, undefined, prof, 'doc-A');
      t.typ(t.tekst(), 'Onopgeslagen concepttekst ' + prof);
      const c = t.concepten('doc-A');
      klikPrint(t); await naPrint(t);
      const h = t.eff.html[0] || '';
      check(t.eff.html.length === 1 && watermerk(h) && pvBody(h).includes('Onopgeslagen concepttekst ' + prof) && pvBody(h).includes('Koper Synthetisch BV') && h.includes('<div class="doc-title">' + lbl + ' &mdash; TSYN-TRAJECT-1</div>'),
        'printversie concept ' + prof + ': bestaande schermtekst (incl. onopgeslagen invoer) mét CONCEPT-watermerk en bestaande titel');
      check(pvVerzoeken(t).length === 0 && t.tekst().value === 'Onopgeslagen concepttekst ' + prof && t.concepten('doc-A') === c && c > 0 && !t.patches().length,
        'printversie concept ' + prof + ': geen printversie-aanvraag, invoer en concept (productpunt 19) intact, geen opslag');
    }
  });

  const pvGevallen = [
    ['verkeerde print_hash', (j) => { j.print_hash = vmHash('andere tekst'); }, /kon niet worden geverifieerd/],
    ['print_hash in hoofdletters', (j) => { j.print_hash = j.print_hash.toUpperCase(); }, /kon niet worden geverifieerd/],
    ['content_hash ontbreekt', (j) => { delete j.content_hash; }, /kon niet worden geverifieerd/],
    ['manifest_hash ontbreekt', (j) => { delete j.manifest_hash; }, /kon niet worden geverifieerd/],
    ['manifest_hash 63 tekens', (j) => { j.manifest_hash = j.manifest_hash.slice(1); }, /kon niet worden geverifieerd/],
    ['ander document-id', (j) => { j.document.id = 'doc-B'; }, /kon niet worden geverifieerd/],
    ['ander documenttype', (j) => { j.document.doc_type = 'loi'; }, /kon niet worden geverifieerd/],
    ['speciaal documenttype', (j) => { j.document.doc_type = 'memo_definitief'; }, /kon niet worden geverifieerd/],
    ['nieuwere versie', (j) => { j.document.version = 3; }, /intussen gewijzigd/],
    ['andere definitieve status', (j) => { j.document.status = 'verstuurd'; }, /intussen gewijzigd/],
    ['conceptstatus', (j) => { j.document.status = 'draft'; }, /kon niet worden geverifieerd/],
    ['versie als tekst', (j) => { j.document.version = '2'; }, /kon niet worden geverifieerd/],
    ['ok ontbreekt', (j) => { delete j.ok; }, /kon niet worden geverifieerd/],
    ['document ontbreekt', (j) => { delete j.document; }, /kon niet worden geverifieerd/],
    ['lege printtekst', (j) => { j.printtekst = ''; j.print_hash = vmHash(''); }, /kon niet worden geverifieerd/],
    ['printtekst geen tekst', (j) => { j.printtekst = ['x']; }, /kon niet worden geverifieerd/],
    ['titel ontbreekt', (j) => { delete j.titel; }, /kon niet worden geverifieerd/],
  ];
  const pvGeenPrint = (t, re, naam) => {
    const m = t.eff.toasts[0];
    check(t.eff.html.length === 0 && t.eff.toasts.length === 1 && m.type === 'err' && re.test(m.msg) && geenLek(m.msg) && !t.eff.modals,
      'printversie ' + naam + ': geen PDF (ook niet als concept), gerichte veilige melding zonder id/hash/serverdetail');
  };
  await tryAsync('printversie contract', async () => {
    for (const [naam, mut, re] of pvGevallen) {
      const t = laadPv();
      t.srv.printversie = () => { const j = pvAntw('doc-F', 'mou', 'exported', 2); mut(j); return [200, j]; };
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      pvGeenPrint(t, re, naam);
    }
    for (const [st, re] of [[401, /geen toegang/], [403, /geen toegang/], [404, /kon niet worden geverifieerd/], [409, /kon niet worden bevestigd/], [503, /Probeer het later opnieuw/], [500, /Probeer het later opnieuw/]]) {
      const t = laadPv();
      t.srv.printversie = () => [st, { error: 'Serverdetail doc-F ' + vmHash('x') }];
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      pvGeenPrint(t, re, 'HTTP ' + st);
    }
    {
      const t = laadPv(); t.srv.netwerkFout = (m, p) => /\/printversie$/.test(p);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      pvGeenPrint(t, /Probeer het later opnieuw/, 'fetchfout');
    }
    {
      const t = laadPv(); t.srv.printversie = () => [200, ONGELDIGE_JSON];
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      pvGeenPrint(t, /kon niet worden geverifieerd/, 'ongeldige JSON');
    }
    for (const [naam, c] of [['geen WebCrypto', null], ['geen crypto.subtle', {}], ['digest faalt', { subtle: { digest: () => Promise.reject(new Error('synthetisch')) } }]]) {
      const t = laadPv({ crypto: c });
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      pvGeenPrint(t, /in deze browser niet worden gecontroleerd/, naam);
    }
  });

  await tryAsync('printversie races', async () => {
    const houd = (t) => { t.srv.houdVast = (m, p) => /\/printversie$/.test(p); };
    {
      const t = laadPv(); houd(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await rust();
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-B');
      t.typ(t.veld('koper'), 'Koper B getypt');
      const gets = t.srv.verzoeken.length;
      pvLos(t); await even(); await rust();
      check(t.eff.html.length === 0 && t.eff.toasts.length === 1 && /intussen gewijzigd of gesloten/.test(t.eff.toasts[0].msg) && t.veld('koper').value === 'Koper B getypt' && t.concepten('doc-B') === 1 && t.srv.verzoeken.length === gets,
        'printversie laat antwoord na documentwissel: geen PDF van het oude document, invoer in het nieuwe document intact, geen hertekening');
    }
    {
      const t = laadPv(); houd(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await rust();
      t.ctx.S = { screen: 'login', code: '', rol: '', traject: null };
      pvLos(t); await even(); await rust();
      check(t.eff.html.length === 0 && t.eff.toasts.length === 0 && t.eff.audit.length === 0, 'printversie laat antwoord na uitloggen: geen PDF, geen melding, geen audit');
    }
    {
      const t = laadPv(); houd(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await rust();
      t.srv.docs['doc-F'].document.current_version = 3; await t.ctx.bgMouRender();
      pvLos(t); await even(); await rust();
      check(t.eff.html.length === 0 && t.eff.toasts.length === 1 && /intussen gewijzigd/.test(t.eff.toasts[0].msg), 'printversie laat antwoord na nieuwere versie: geen PDF van de oude versie');
    }
    {
      const t = laadPv(); houd(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await rust();
      t.doc.getElementById('mou-close').onclick();
      pvLos(t); await even(); await rust();
      check(t.eff.html.length === 0 && t.eff.toasts.length === 1, 'printversie laat antwoord na sluiten van de composer: geen PDF');
    }
    {
      const t = laadPv(); houd(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); klikPrint(t); await rust();
      pvLos(t); await even(); await rust();
      const naEerste = t.eff.html.length + t.eff.toasts.length;
      pvLos(t); await naPrint(t);
      check(naEerste === 0 && t.eff.html.length === 1 && !watermerk(t.eff.html[0]) && !t.eff.toasts.length, 'printversie dubbele klik: alleen de nieuwste aanvraag print, één keer');
    }
    {
      const t = laadPv(); delete t.S._relianceBevestigdDoor;
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      const modaal = t.eff.modals === 1 && t.eff.html.length === 0;
      t.rel['reliance-ann'].onclick();
      check(modaal && t.eff.html.length === 0 && t.eff.audit.length === 0 && !t.eff.toasts.length, 'printversie reliance annuleren: pas na verificatie gevraagd, annuleren print niets');
    }
    {
      const t = laadPv(); delete t.S._relianceBevestigdDoor;
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
      await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-B');
      t.rel['reliance-naam'].value = 'Synthetische Begeleider'; t.rel['reliance-ok'].onclick();
      check(t.eff.html.length === 0 && t.eff.toasts.length === 1 && /intussen gewijzigd/.test(t.eff.toasts[0].msg), 'printversie reliance bevestigd na documentwissel: geen PDF van het oude document');
    }
    {
      const t = laadPv(); delete t.S._relianceBevestigdDoor;
      await t.ctx.bgMouRender(undefined, undefined, 'NDA', 'doc-N'); klikPrint(t); await naPrint(t);
      t.rel['reliance-naam'].value = 'Synthetische Begeleider'; t.rel['reliance-ok'].onclick();
      check(t.eff.html.length === 1 && !watermerk(t.eff.html[0]) && t.S._relianceBevestigdDoor === 'Synthetische Begeleider' && t.eff.audit.length === 1,
        'printversie reliance bevestigd: definitieve print na de bestaande reliance-bevestiging');
    }
  });

  await tryAsync('printversie geen omzeiling', async () => {
    const t = laadPv();
    const types = ['mou', 'loi', 'nda', 'mou_definitief', 'tos_definitief', 'bem', 'spa', 'bieding', 'memo'];
    types.forEach((ty) => t.ctx.printDoc(PV_TEKST.mou, 'Memorandum of Understanding (definitief &mdash; versie 2, gefinaliseerd)', ty));
    check(t.eff.html.length === types.length && t.eff.html.every(watermerk), 'printversie: docType/definitieve titel via printDoc schakelt het watermerk nooit uit (mou/loi/nda/speciale typen/overige contracten/memo)');
    t.eff.html.length = 0;
    t.ctx.printDoc('Teaser', 'Teaser', 'teaser'); t.ctx.printDoc('Memo', 'Verkoopmemorandum (definitieve versie 1)', 'memo_definitief');
    check(t.eff.html.length === 2 && !watermerk(t.eff.html[0]) && !watermerk(t.eff.html[1]), 'printversie: teaser en memo_definitief ongewijzigd zonder watermerk');
    t.eff.html.length = 0;
    const vals = { ok: true, tekst: PV_TEKST.mou, docType: 'mou', status: 'exported', version: 2, statusLabel: 'gefinaliseerd' };
    check(t.ctx.printTosDefinitief.print(vals, 'X') === false && t.eff.html.length === 0, 'printversie: zelfgemaakt resultaatobject wordt niet geprint');
    t.ctx.printTosDefinitief.vrijgegeven(PV_TEKST.mou, 'mou'); t.ctx.printDocNaAkkoord(PV_TEKST.mou, 'X', 'mou');
    check(watermerk(t.eff.html[0]), 'printversie: printDocNaAkkoord zonder geldige vrijgave houdt het watermerk');
    t.eff.html.length = 0;
    await t.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-F'); klikPrint(t); await naPrint(t);
    t.ctx.printDocNaAkkoord(PV_TEKST.mou, 'X', 'mou');
    check(t.eff.html.length === 2 && !watermerk(t.eff.html[0]) && watermerk(t.eff.html[1]), 'printversie: vrijgave is eenmalig; een latere print van dezelfde tekst krijgt weer CONCEPT');
    const t2 = laadPv();
    await t2.ctx.bgMouRender(undefined, undefined, 'MOU', 'doc-A');
    t2.ctx._mouPrintMeta = Object.assign({}, t2.ctx._mouPrintMeta, { status: 'exported', version: 2 });
    klikPrint(t2); await naPrint(t2);
    check(t2.eff.html.length === 0 && pvVerzoeken(t2).length === 1 && /kon niet worden bevestigd/.test((t2.eff.toasts[0] || {}).msg || ''),
      'printversie: alleen een (vervalste) clientstatus geeft geen definitieve print; server 409 ⇒ niets afgedrukt');
  });

  tryCheck('printversie statisch', () => {
    const src05 = lees(root, 'mna/05-documentflow-partijen.js');
    const fn = knip(src05, 'function printDocNaAkkoord(tekst, titel, docType) {', '\n}\n');
    check(!/(mou|loi|nda|tos)_definitief/.test(src05) && /printTosDefinitief\.vrijgegeven\(tekst, docType\)/.test(fn) && !/fetch\(/.test(knip(src05, 'var printTosDefinitief = (function () {', '\n})();\n')),
      'mna/05: geen speciaal definitief-docType voor MOU/LoI/NDA; watermerk alleen weg via de eenmalige vrijgave; de controle doet zelf geen netwerkverzoek');
  });

  // ── M. Dealvoorstel-cijferlijst (productpunt 13 §31 fase 1b) ──
  const dvOk = { [DV_HOOFD]: [200, { ok: true, tekst: '## Samenvatting\nEBITDA [CIJFER:ebitda_bewezen].' }], [DV_BIJL]: [200, { ok: true, tekst: '## Intern\nWalk-away [CIJFER:batna_walk_away].' }] };
  await tryAsync('dealvoorstel cijferlijst', async () => {
    const t = laadDealvoorstel(root, dvOk);
    await t.genereer();
    const h = t.calls.find((c) => c.url === DV_HOOFD), b = t.calls.find((c) => c.url === DV_BIJL);
    check(t.calls.length === 2 && h && b && t.els['dv-err'].style.display !== 'block', 'dealvoorstel: precies twee requests (hoofdstukken + interne bijlage), geen foutmelding');
    const zelfde = (c) => c.ms === 180000 && c.opts.method === 'POST' && JSON.stringify(c.opts.headers) === JSON.stringify({ 'Content-Type': 'application/json', 'x-tussen-key': CODES.tussen }) && c.body.code === CODES.tussen;
    check(h && b && zelfde(h) && zelfde(b) && typeof h.body.contextBlok === 'string' && h.body.vlaggen && typeof b.body.interneContext === 'string',
      'dealvoorstel: headers, code, timeout 180000 ms, contextBlok/vlaggen en interneContext ongewijzigd meegestuurd');
    const pub = h && h.body.cijfers, int = b && b.body.cijfers;
    const fp = dvContractFouten(pub), fi = dvContractFouten(int);
    check(!fp.length && !fi.length, 'dealvoorstel: beide cijferlijsten voldoen aan het contract (niet leeg, ≤ 300, sleutel [a-z][a-z0-9_]{0,59} uniek, label ≤ 120, eenheid uit DV_EENHEDEN, eenduidige waarde): ' + fp.concat(fi).slice(0, 5).join('; '));
    // Elk getal staat letterlijk in de context van hetzelfde request (zelfde Math.round/toFixed, geen eigen afronding).
    const nietInContext = (lijst, tekst) => (lijst || []).filter((c) => !String(tekst).includes(String(c.waarde))).map((c) => c.sleutel);
    const np = nietInContext(pub, h && h.body.contextBlok), ni = nietInContext(int, b && b.body.interneContext);
    check(pub && int && !np.length && !ni.length, 'dealvoorstel: elke waarde staat exact zo in contextBlok resp. interneContext van hetzelfde request: ' + np.concat(ni).join(', '));
    const w = (lijst, k) => { const c = (lijst || []).find((x) => x.sleutel === k); return c ? c.eenheid + ':' + JSON.stringify(c.waarde) : 'ontbreekt'; };
    const R = DV_REKEN;
    const verwacht = {
      ebitda_bewezen: 'eur:' + Math.round(812345.6), ebitda_prognose: 'eur:' + Math.round(900000.4), multiple_bovengrens: 'multiple:6.25', multiple_basis: 'multiple:5.5',
      belang_koper_pct: 'pct:60', escrow_maanden: 'aantal:18', bank_leverage: 'multiple:2.5', acquisitiefinanciering: 'eur:' + Math.round(812345.6 * 2.5),
      netto_schuld_doelwit: 'eur:' + Math.round(R.opbrengstBrug.nettoSchuld), brug_wc_correctie: 'eur:' + Math.round(R.opbrengstBrug.wcCorrectie),
      brug_cash_closing: 'eur:' + Math.round(R.opbrengstBrug.cashBijClosing), cash_closing_verkoper: 'eur:' + Math.round(R.verkBedr.verkopersopbrengstCashClosing),
      ev_dcf: 'eur:' + Math.round(R.dcf.evDcf), ev_multiple_bewezen: 'eur:' + Math.round(R.closing.evBasis), discontovoet_pct: 'pct:11.5',
      zopa_zeker_pct: 'pct:' + Number(R.zopa.pctZekerBijClosing.toFixed(0)), zopa_ev_equity_factor_pct: 'pct:' + Number((R.zopa.evNaarEquityFactor * 100).toFixed(0)),
      ruil_pct_verkoper: 'pct:' + Number(R.ruilverhouding.pctVerkoper.toFixed(1)), ruil_nieuwe_aandelen: 'aantal:500',
      scenario_1_groei_pct: 'pct:' + Number(R.scenarios[0].groeiPct.toFixed(1)), scenario_3_waarde_hoog: 'eur:' + Math.round(R.scenarios[2].waardeHoog),
      earnout_tranche: 'eur:' + Math.round(R.earnOut.jaarlijks), earnout_jaren: 'aantal:3', mgmt_risicopunten: 'aantal:7', syn_npv: 'eur:' + Math.round(R.synergie.npv),
      koper_naam: 'tekst:"Koper 2026 Holding BV"', verkoper_naam: 'tekst:"Synthetisch Kantoor 7 BV"',
    };
    const afwijk = Object.keys(verwacht).filter((k) => w(pub, k) !== verwacht[k]).map((k) => k + '=' + w(pub, k));
    check(!afwijk.length, 'dealvoorstel: bedragen = Math.round van de rekenkernwaarde, afgeleide % = toFixed zoals in de context, invoerwaarden (multiple 6,25×, %) ongewijzigd: ' + afwijk.join(', '));
    check(!(pub || []).some((c) => /^batna|walk|tegenprestatie/.test(c.sleutel) || c.waarde === Math.round(R.batna.walkAway))
      && w(int, 'batna_walk_away') === 'eur:' + Math.round(R.batna.walkAway) && w(int, 'batna_marge_cash') === 'eur:' + Math.round(R.batna.margeCash)
      && w(int, 'totale_tegenprestatie') === 'eur:' + Math.round(R.batna.totaalVerkocht) && w(int, 'cash_closing_verkoper') === w(pub, 'cash_closing_verkoper'),
      'dealvoorstel: BATNA/walk-away alleen in de interne lijst (bijlage), nooit in de publieke lijst; gedeelde sleutels hebben dezelfde waarde');
    check(t.els['bg-doc-out'].style.display === 'block' && /CIJFER:ebitda_bewezen/.test(t.els['bg-doc-out'].innerHTML) && t.toasts.some((x) => x.type === 'ok'),
      'dealvoorstel: geslaagde generatie toont het document zoals voorheen (tokenvervanging gebeurt server-side)');
  });

  await tryAsync('dealvoorstel cijferlijst niet-verkoop', async () => {
    const t = laadDealvoorstel(root, dvOk);
    t.ctx.S.traject.traject_type = 'Aankoop';
    t.ctx.S.traject.opdrachtgever_rol = 'koper';
    await t.genereer();
    const h = t.calls.find((c) => c.url === DV_HOOFD);
    check(t.calls.length === 1 && h && !dvContractFouten(h.body.cijfers).length && !h.body.cijfers.some((c) => /^batna/.test(c.sleutel)),
      'dealvoorstel koperzijde: alleen het hoofdstukken-request, met geldige publieke cijferlijst zonder BATNA');
  });

  const dvFout = async (antw) => { const t = laadDealvoorstel(root, antw); await t.genereer(); return t; };
  const XSS = '<img src=x onerror=alert(1)>';
  await tryAsync('dealvoorstel 502 BRONFEITEN_AFWIJKING', async () => {
    const t = await dvFout({ [DV_HOOFD]: [502, { error: 'serverdetail ' + XSS, code: 'BRONFEITEN_AFWIJKING' }], [DV_BIJL]: dvOk[DV_BIJL] });
    const e = t.els['dv-err'];
    check(e.style.display === 'block' && e.textContent === 'Fout bij genereren: ' + DV_BRON_MELDING && e.innerHTML === '' && t.calls.length === 1 && t.els['bg-doc-out'].style.display !== 'block',
      'dealvoorstel 502 BRONFEITEN_AFWIJKING: vaste Nederlandse melding als tekst (geen servertekst/HTML), geen bijlage-request, niets getoond');
    check(t.els['dv-ok'].disabled === false, 'dealvoorstel 502: knop weer bruikbaar om opnieuw te proberen');
  });
  for (const code of ['CIJFERS_ONTBREKEN', 'CIJFERS_ONGELDIG']) {
    await tryAsync('dealvoorstel 400 ' + code, async () => {
      const melding = (code === 'CIJFERS_ONTBREKEN' ? 'Vernieuw de pagina (Cmd+Shift+R) — het dealvoorstel vereist de nieuwe cijferaanlevering.' : 'Ongeldige cijferlijst: cijfers[3] (x): eenheid moet een van eur/pct/multiple/aantal/jaar/tekst zijn.') + ' ' + XSS;
      const t = await dvFout({ [DV_HOOFD]: [400, { error: melding, code }] });
      const e = t.els['dv-err'];
      check(e.style.display === 'block' && e.textContent === 'Fout bij genereren: ' + melding && e.innerHTML === '' && t.calls.length === 1 && t.els['bg-doc-out'].style.display !== 'block',
        'dealvoorstel 400 ' + code + ': servermelding letterlijk als tekst (textContent, geen HTML), niets getoond');
    });
  }
  await tryAsync('dealvoorstel bijlage 502/400', async () => {
    const t = await dvFout({ [DV_HOOFD]: dvOk[DV_HOOFD], [DV_BIJL]: [502, { error: 'serverdetail', code: 'BRONFEITEN_AFWIJKING' }] });
    const html = t.els['bg-doc-out'].innerHTML;
    check(html.includes('Interne bijlage kon niet worden gegenereerd: ' + DV_BRON_MELDING) && !html.includes('serverdetail') && /CIJFER:ebitda_bewezen/.test(html),
      'dealvoorstel bijlage 502: vaste melding in de bijlage, hoofddocument blijft staan');
    const t2 = await dvFout({ [DV_HOOFD]: dvOk[DV_HOOFD], [DV_BIJL]: [400, { error: 'Ongeldige cijferlijst: ' + XSS, code: 'CIJFERS_ONGELDIG' }] });
    const html2 = t2.els['bg-doc-out'].innerHTML;
    check(html2.includes('Interne bijlage kon niet worden gegenereerd: Ongeldige cijferlijst: &lt;img src=x onerror=alert(1)&gt;') && !html2.includes(XSS),
      'dealvoorstel bijlage 400 CIJFERS_ONGELDIG: servermelding ge-escaped (esc) in de bijlage, geen actieve HTML');
  });
  tryCheck('dealvoorstel dvGenereerFout', () => {
    const { ctx } = laadDealvoorstel(root, {});
    const f = ctx.dvGenereerFout;
    check(f({ status: 502 }, { code: 'BRONFEITEN_AFWIJKING', error: 'x' }, 'std') === DV_BRON_MELDING
      && f({ status: 502 }, { code: 'ANDERS', error: 'x' }, 'std') === 'x' && f({ status: 500 }, {}, 'std') === 'std'
      && f({ status: 400 }, { code: 'CIJFERS_ONGELDIG', error: 'Ongeldige cijferlijst: y.' }, 'std') === 'Ongeldige cijferlijst: y.'
      && f({ status: 400 }, { code: 'CIJFERS_ONTBREKEN' }, 'std') === 'std' && f(null, null, 'std') === 'std',
      'dvGenereerFout: alleen 502+BRONFEITEN_AFWIJKING geeft de vaste melding; 400 CIJFERS_* de servermelding; anders bestaande terugval');
    const leeg = ctx.dvBouwCijfers({ koperNaam: 'x'.repeat(121), ebitdaBewezen: NaN, ebitdaPrognose: 1e21, bankLeverage: 2 },
      { verkoperNaam: '', opbrengstBrug: {}, verkBedr: {}, closing: {}, zopa: { pctZekerBijClosing: 1, pctEscrow: 1, pctVoorwaardelijk: 1, pctBehoudenBelang: 1, evNaarEquityFactor: 1 } });
    check(!leeg.publiek.some((c) => ['koper_naam', 'verkoper_naam', 'ebitda_bewezen', 'ebitda_prognose', 'acquisitiefinanciering'].includes(c.sleutel)) && !dvContractFouten(leeg.publiek).length && Array.isArray(leeg.intern) && !leeg.intern.length,
      'dvBouwCijfers: niet-eindige/exponentwaarden en te lange of lege teksten worden weggelaten (nooit afgerond of ingekort); geen interne lijst buiten verkoopzijde');
  });
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiDocumentOutputSecurityChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' documentuitvoer-checks gefaald.' : '\nAlle ' + res.length + ' documentuitvoer-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
