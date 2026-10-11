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
// tekst, oudere/mislukte opslag, documentwissel, ander traject en bevroren document. Sectie H vergrendelt
// statisch de aanhaakpunten van die fix in mna/04 (zelfde drie bronchecks als check 14 van de audit).
//
// Gebruik: node tests/document-output-security.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 26).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

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
    const m = s.trim().match(/^([a-zA-Z]+)?((?:\.[\w-]+)*)((?:\[[\w-]+="[^"]*"\])*)$/);
    if (!m) throw new Error('selector niet ondersteund in synthetische DOM: ' + s);
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    if (!(m[2].match(/\.[\w-]+/g) || []).every((c) => el.classList.contains(c.slice(1)))) return false;
    return [...m[3].matchAll(/\[([\w-]+)="([^"]*)"\]/g)].every((a) => el.getAttribute(a[1]) === a[2]);
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
    focus() { doc.activeElement = this; }
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }
  }
  function parse(h) {
    const els = []; const re = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g; let m;
    while ((m = re.exec(h))) {
      const attrs = {};
      m[2].replace(/\s([a-zA-Z-]+)(?:="([^"]*)")?/g, (_, k, v) => { attrs[k.toLowerCase()] = v == null ? '' : ontEsc(v); return ''; });
      const el = new El(m[1], attrs);
      if (el.tagName === 'TEXTAREA') {
        const eind = h.indexOf('</textarea>', re.lastIndex);
        el.value = ontEsc(h.slice(re.lastIndex, eind)); el.selectionStart = el.selectionEnd = el.value.length; re.lastIndex = eind;
      }
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
    wachtrij: [], verzoeken: [], houdVast: () => false,
  };
  const eff = { toasts: [], confirms: [], opslag: 0 };
  const antw = (status, json) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });
  function route(method, pad) {
    let m;
    if (method === 'GET' && (m = pad.match(/^\/mna\/tos\/document\/([^/]+)\/exportcheck$/))) return [200, { ok: true, blockers: [], eis_per_domein: { LEGAL: true, TAX: true, VALUATION: true } }];
    if (method === 'GET' && (m = pad.match(/^\/mna\/tos\/document\/([^/]+)$/))) {
      const d = srv.docs[decodeURIComponent(m[1])];
      return d ? [200, JSON.parse(JSON.stringify({ ok: true, document: d.document, componenten: d.componenten, divergenties: [], reacties: [] }))] : [404, { error: 'Niet gevonden' }];
    }
    if (method === 'GET' && /^\/mna\/tos\/menu\//.test(pad)) return [200, { ok: true, menu: [], ontbrekend_kern: [], required_reviews: {} }];
    return [500, { error: 'onverwacht synthetisch verzoek ' + method + ' ' + pad }];
  }
  const fetch = (url, o = {}) => {
    const method = String(o.method || 'GET').toUpperCase(); const pad = String(url).replace(WORKER_T, '');
    const body = o.body ? JSON.parse(o.body) : undefined;
    srv.verzoeken.push({ method, pad, body });
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
  vm.runInContext([regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'), fn].join('\n'), ctx, { filename: 'mna/04#composer' });
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
  return { ctx, S, srv, eff, out, doc, blurBijVerwijderen, los, veld, tekst, typ, naar, concepten, patches };
}
const rust = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const isPatch = (q) => q.method === 'PATCH';

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
    const memo = print(root, 'Tekst', 'Verkoopmemorandum', 'memo', {});
    check(!memo.html.includes('content:"CONCEPT"') && memo.html.includes('Conceptversie &mdash;'), 'memo: geen watermerk, wel bestaande statusregel');
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
