#!/usr/bin/env node
// Waarderingsrapport genereren (weekend kern-UI/UX, 4 okt 2026) — lokale regressietest voor de
// bestaande "Genereer AI-analyse & waardering"-handler in mna/06-schermen.js. Bevinding: een
// HTTP-fout, ok:false of rd.error werd als "AI fout: ..."-tekst als nieuwe rapportversie opgeslagen
// en als succes getoond. Deze test draait de ECHTE handler (plus de echte mdToHtml/esc/
// fetchMetTimeout) in node:vm met een minimale DOM- en fetch-fixture — geen netwerk, geen browser,
// geen node_modules. Alle gegevens hieronder zijn synthetisch.
//
// Gebruik: node tests/waardering-genereren.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 18).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const BGKEY = 'TSYN0001';
const XHTML = 'http://www.w3.org/1999/xhtml';

function knip(src, van, tot, naam) {
  const a = src.indexOf(van), b = src.indexOf(tot, a + 1);
  if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
  return src.slice(a, b);
}

// ── Minimale DOM: genoeg voor wSaneerRapport/wToonRapport (template-parse, fragment, tekstnodes) ──
class Node {
  constructor(nodeType, tagName) { this.nodeType = nodeType; this.tagName = tagName; this.namespaceURI = XHTML; this.childNodes = []; this.parent = null; }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() { if (!this.parent) return null; const s = this.parent.childNodes; return s[s.indexOf(this) + 1] || null; }
  appendChild(n) {
    if (n.tagName === '#fragment') { n.childNodes.slice().forEach((c) => this.appendChild(c)); n.childNodes = []; return n; }
    if (n.parent) n.parent.childNodes.splice(n.parent.childNodes.indexOf(n), 1);
    n.parent = this; this.childNodes.push(n); return n;
  }
}
const tekstNode = (v) => { const n = new Node(3, '#text'); n.nodeValue = v; return n; };
const VOID = new Set(['BR', 'HR', 'IMG', 'INPUT', 'META', 'LINK', 'SOURCE', 'TRACK', 'EMBED', 'WBR', 'AREA', 'BASE', 'COL']);
const decodeer = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function parseHtml(html, root) {
  const stapel = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const top = stapel[stapel.length - 1];
    if (m[0].startsWith('<!--')) { top.appendChild(new Node(8, '#comment')); continue; }
    if (!m[2]) { top.appendChild(tekstNode(decodeer(m[0]))); continue; }
    const tag = m[2].toUpperCase();
    if (m[1]) { const i = stapel.map((n) => n.tagName).lastIndexOf(tag); if (i > 0) stapel.length = i; continue; }
    const el = new Node(1, tag); el.attrs = m[3]; top.appendChild(el);
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) stapel.push(el);
  }
}
const escT = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function serialiseer(n) {
  return n.childNodes.map((c) => c.nodeType === 3 ? escT(c.nodeValue) : c.nodeType === 1
    ? '<' + c.tagName.toLowerCase() + (c.attrs || '') + '>' + serialiseer(c) + (VOID.has(c.tagName) ? '' : '</' + c.tagName.toLowerCase() + '>') : '').join('');
}
function maakElement(tag) {
  const el = new Node(1, tag.toUpperCase());
  if (el.tagName === 'TEMPLATE') {
    el.content = new Node(11, '#fragment');
    Object.defineProperty(el, 'innerHTML', { set(h) { el.content = new Node(11, '#fragment'); parseHtml(h, el.content); } });
  }
  return el;
}
// Uitvoer-/historie-container: innerHTML wordt als string bewaard; .ai-body is een echte Node.
function maakContainer() {
  const c = { style: {}, _html: '', _body: null, scrolled: false };
  Object.defineProperty(c, 'innerHTML', { get() { return c._html + (c._body ? serialiseer(c._body) : ''); }, set(h) { c._html = String(h); c._body = /class="ai-body"/.test(c._html) ? new Node(1, 'DIV') : null; } });
  c.querySelector = (sel) => sel === '.ai-body' ? c._body : null;
  c.querySelectorAll = () => [];
  c.scrollIntoView = () => { c.scrolled = true; };
  return c;
}

// ── Fixture rond de echte handler ──
function laadHandler(root, fetchImpl) {
  const src06 = fs.readFileSync(path.join(root, 'mna/06-schermen.js'), 'utf8');
  const src02 = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8');
  const src01 = fs.readFileSync(path.join(root, 'mna/01-config-sectorprofielen.js'), 'utf8');
  const slice = knip(src06, "var wAiBtn=ge('w-ai-btn');", '// AI-waardering second opinion', 'mna/06 waarderingsrapport');
  const md = src02.match(/^function mdToHtml\(text\)\{[\s\S]*?\n\}/m);
  const esc = src02.match(/^function esc\(s\)\{.*\}$/m);
  const fmt = src01.match(/^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m);
  if (!md || !esc || !fmt) throw new Error('mdToHtml/esc/fetchMetTimeout niet gevonden');

  const st = { fetches: [], toasts: [], handler: null };
  const btn = { disabled: false, textContent: 'Genereer AI-analyse & waardering', addEventListener(t, f) { if (t === 'click') st.handler = f; } };
  const els = { 'w-ai-btn': btn, 'w-ai-out': maakContainer(), 'w-ai-hist': maakContainer() };
  const ctx = vm.createContext({
    AbortController, setTimeout, clearTimeout,
    WORKER, S: { code: BGKEY, _bgKey: BGKEY },
    document: { createElement: maakElement, createDocumentFragment: () => new Node(11, '#fragment'), createTextNode: tekstNode },
    ge: (id) => els[id] || null,
    toast: (msg, type) => st.toasts.push({ msg: String(msg), type }),
    fmtGeld: (n) => '€ ' + Math.round(n || 0),
    getPartnerTerm: () => ({ enkel: 'partner', meer: 'partners' }),
    dvBerekenWaardering: () => ({ o1: 1000000, o2: 1100000, o3: 1200000, omzetYTD: 0, ebitdaAmt: 240000, ebitdaPct: 20, partnerBel: 0, recurring: 0, churn: 0, top1pct: 0, top10pct: 0, aantalKlanten: 0, fte: 0, aantalP: 0, omzetPerP: 0, debiteuren: 0, wip: 0, declarab: 0, gemGroei: 9.5, mLaag: 4, mMid: 5, mHoog: 6, wLaag: 960000, wMid: 1200000, wHoog: 1440000, omzetFactor: 1, wOmzet: 1200000, fixedKoop: 900000, earnPct: 25, earnJaren: 2, earnTarget: 5 }),
    fetch: (url, opts) => { st.fetches.push({ url: String(url), opts: opts || {} }); return fetchImpl(String(url), opts || {}); },
  });
  vm.runInContext([esc[0], md[0], fmt[0], slice].join('\n'), ctx, { filename: 'mna/06#waarderingsrapport' });
  if (!st.handler) throw new Error('klikhandler van w-ai-btn niet geregistreerd');
  return { st, btn, out: els['w-ai-out'], ctx };
}

const resp = (status, json) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => json instanceof Error ? Promise.reject(json) : Promise.resolve(json) });
const GEN = WORKER + '/mna/waardering/rapport-genereren';
const SAVE = WORKER + '/mna/waardering/rapport';
const HIST = WORKER + '/mna/versies/';
const RUW = '## Samenvatting\n\nSynthetische tekst <img src=x onerror=alert(1)><script>alert(2)</script>\n\n- punt een\n- punt twee';

// Scenario: genereren-respons + save-respons → uitgevoerde handler + waarnemingen.
function bouwFetch(gen, save) {
  let genIdx = 0;
  const gens = Array.isArray(gen) ? gen : [gen];
  return (url) => {
    if (url === GEN) return gens[Math.min(genIdx++, gens.length - 1)]();
    if (url === SAVE) return save();
    if (url.startsWith(HIST)) return resp(200, []);
    return Promise.reject(new Error('onverwachte fetch ' + url));
  };
}
const telt = (st, url) => st.fetches.filter((f) => f.url === url).length;
const okToast = (st) => st.toasts.some((t) => t.type === 'ok');

export async function draaiWaarderingGenererenChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const saveOk = () => resp(200, { ok: true, versie: 3 });

  // ── A. Mislukte generatie: geen save, geen versie, geen succes; knop weer bruikbaar ──
  const mislukt = [
    ['HTTP-fout (500 met foutbody)', () => resp(500, { error: 'AI fout 500' }), 'AI fout 500'],
    ['HTTP-fout met ok:true-body (502)', () => resp(502, { ok: true, text: 'mag niet tellen' }), 'HTTP 502'],
    ['JSON-fout (geen geldige JSON)', () => resp(200, new SyntaxError('Unexpected token <')), 'HTTP 200'],
    ['ok:false met foutmelding', () => resp(200, { ok: false, error: '<b>Te veel verzoeken</b>' }), '&lt;b&gt;Te veel verzoeken&lt;/b&gt;'],
    ['alleen error zonder ok', () => resp(200, { error: 'Leeg antwoord van de AI.' }), 'Leeg antwoord van de AI.'],
    ['ok:true met lege tekst', () => resp(200, { ok: true, text: '   \n ' }), 'HTTP 200'],
    ['ok:true zonder tekst', () => resp(200, { ok: true }), 'HTTP 200'],
    ['netwerkfout/time-out', () => Promise.reject(new Error('Failed to fetch')), 'Failed to fetch'],
  ];
  for (const [naam, gen, verwacht] of mislukt) {
    try {
      const { st, btn, out } = laadHandler(root, bouwFetch([gen, () => resp(200, { ok: true, text: RUW })], saveOk));
      await st.handler();
      check(telt(st, GEN) === 1 && telt(st, SAVE) === 0 && !st.fetches.some((f) => f.url.startsWith(HIST)),
        naam + ': geen rapport-POST, geen nieuwe versie, geen geschiedenis-herlaad');
      check(!okToast(st) && st.toasts.some((t) => t.type === 'err' && /mislukt/.test(t.msg)) && /Fout: /.test(out.innerHTML) && out.innerHTML.includes(verwacht)
        && !/Waarderingsrapport|AI fout: /.test(out.innerHTML),
        naam + ': begrijpelijke (ge-escapete) foutmelding, geen succestoast en geen rapportweergave');
      check(btn.disabled === false && btn.textContent === 'Genereer AI-analyse & waardering', naam + ': knop weer actief (opnieuw proberen mogelijk)');
      // Retry met dezelfde handler slaagt normaal.
      await st.handler();
      check(telt(st, GEN) === 2 && telt(st, SAVE) === 1 && okToast(st) && /versie 3/.test(out.innerHTML), naam + ': retry daarna genereert en bewaart normaal');
    } catch (e) {
      check(false, naam + ': handler kon niet worden getest: ' + String((e && e.message) || e));
    }
  }

  // ── B. Succes: bestaande save (auth-header, body), versie, geschiedenis en sanering intact ──
  try {
    const { st, btn, out, ctx } = laadHandler(root, bouwFetch(() => resp(200, { ok: true, text: RUW }), saveOk));
    await st.handler();
    const g = st.fetches.find((f) => f.url === GEN);
    const s = st.fetches.find((f) => f.url === SAVE);
    const body = s && JSON.parse(s.opts.body);
    check(g && g.opts.method === 'POST' && g.opts.headers['x-tussen-key'] === BGKEY && JSON.parse(g.opts.body).code === BGKEY && Array.isArray(JSON.parse(g.opts.body).lijnen),
      'succes: generatie-POST met x-tussen-key en cijferregels (ongewijzigd)');
    check(s && s.opts.method === 'POST' && s.opts.headers['x-tussen-key'] === BGKEY && body.code === BGKEY && body.rapport_tekst === ctx.mdToHtml(RUW)
      && body.cijfers_json && body.cijfers_json.wMid === 1200000, 'succes: precies één rapport-POST met begeleider-header, mdToHtml-tekst en cijfer-snapshot');
    check(telt(st, SAVE) === 1 && st.fetches.some((f) => f.url === HIST + BGKEY + '/waarderingsrapport'), 'succes: geschiedenis wordt herladen');
    const html = out.innerHTML;
    check(/versie 3/.test(html) && !/niet opgeslagen/.test(html) && /<h3>Samenvatting<\/h3>/.test(html) && /<li>punt een<\/li>/.test(html),
      'succes: rapport met versienummer en opmaak getoond');
    check(!/<img|<script|onerror|alert\(2\)/i.test(html) && /Synthetische tekst/.test(html), 'succes: weergave blijft gesaneerd (geen img/script/handlers)');
    check(okToast(st) && !st.toasts.some((t) => t.type === 'err') && btn.disabled === false && btn.textContent === '↻ Opnieuw genereren', 'succes: succestoast en "Opnieuw genereren"');
  } catch (e) {
    check(false, 'succespad kon niet worden getest: ' + String((e && e.message) || e));
  }

  // ── C. Generatie ok, opslaan mislukt: nooit vals "opgeslagen"-succes ──
  const saveFouten = [
    ['save 401', () => resp(401, { error: 'Unauthorized' })],
    ['save 200 met ok:false', () => resp(200, { ok: false, error: 'x' })],
    ['save netwerkfout', () => Promise.reject(new Error('Failed to fetch'))],
  ];
  for (const [naam, save] of saveFouten) {
    try {
      const { st, btn, out } = laadHandler(root, bouwFetch(() => resp(200, { ok: true, text: RUW }), save));
      await st.handler();
      check(telt(st, SAVE) === 1 && !okToast(st) && st.toasts.some((t) => t.type === 'err' && /opslaan is mislukt/.test(t.msg))
        && /niet opgeslagen/.test(out.innerHTML) && !/versie \d/.test(out.innerHTML) && !st.fetches.some((f) => f.url.startsWith(HIST)) && btn.disabled === false,
        naam + ': rapport "niet opgeslagen" getoond, foutmelding, geen succes of geschiedenis-herlaad');
    } catch (e) {
      check(false, naam + ': kon niet worden getest: ' + String((e && e.message) || e));
    }
  }
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiWaarderingGenererenChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' waarderingsrapport-checks gefaald.' : '\nAlle ' + res.length + ' waarderingsrapport-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
