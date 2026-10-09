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
