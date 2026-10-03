#!/usr/bin/env node
// N-115 (P1B, 3 okt 2026) — lokale UI-test voor de introductieovereenkomst. Geen netwerk, geen
// browser, geen node_modules: draait de echte code uit introductie.html en de zuivere N-115-functies
// uit mna/04-begeleider-dashboard.js in een node:vm-context met een minimale DOM-fixture en een
// nep-fetch. Alle gegevens hieronder zijn synthetisch.
//
// Gebruik: node tests/n115-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 16).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const TOKEN = 'Tst-n115-' + 'x'.repeat(34);          // 43 tekens, zelfde vorm als het echte token
const HASH = 'a'.repeat(64);
const TEKST = '<img src=x onerror="globalThis.__xss=1">\nArtikel 1 — synthetische testtekst <script>globalThis.__xss=2</script>';

// ── Minimale DOM-fixture ──────────────────────────────────────────────────────
class FakeNode {
  constructor(tag) {
    this.tagName = tag; this.childNodes = []; this.parentNode = null; this._text = '';
    this._listeners = {}; this.attributes = {}; this.style = {}; this.className = ''; this.id = '';
    this.value = ''; this.checked = false; this.disabled = false; this.type = ''; this.rows = 0;
    this.htmlGebruikt = false;
  }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); return n; }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i < 0) throw new Error('geen kind'); this.childNodes.splice(i, 1); n.parentNode = null; return n; }
  get textContent() { return this.tagName === '#text' ? this._text : this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v) {
    if (this.tagName === '#text') { this._text = String(v); return; }
    this.childNodes.forEach((c) => { c.parentNode = null; });
    this.childNodes = [];
    if (v !== '' && v != null) { const t = new FakeNode('#text'); t._text = String(v); this.appendChild(t); }
  }
  set innerHTML(v) { this.htmlGebruikt = true; throw new Error('innerHTML gebruikt'); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  fire(t) { (this._listeners[t] || []).forEach((f) => f({ type: t, target: this, preventDefault() {} })); }
  *alle() { yield this; for (const c of this.childNodes) yield* c.alle(); }
}

function maakDocument(verboden) {
  const body = new FakeNode('body');
  const root = new FakeNode('div'); root.id = 'root';
  body.appendChild(root);
  const doc = {
    body,
    createElement: (tag) => new FakeNode(String(tag).toLowerCase()),
    createTextNode: (t) => { const n = new FakeNode('#text'); n._text = String(t); return n; },
    getElementById: (id) => { for (const n of body.alle()) if (n.id === id) return n; return null; },
  };
  Object.defineProperty(doc, 'cookie', { get() { verboden.push('document.cookie'); return ''; }, set() { verboden.push('document.cookie'); } });
  return doc;
}

const flush = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
const antwoord = (status, json) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => json });
const overeenkomstGet = (status = 'open', extra = {}) => antwoord(200, Object.assign({
  ok: true,
  overeenkomst: { versie: 2, tekst: TEKST, inhoud_hash: HASH, verloopt_op: Date.UTC(2026, 9, 17, 10, 0), partijen: { target_naam: 'Testonderneming Synthetisch BV', geselecteerde_koper: 'Testkoper BV', begeleider_naam: 'Test Begeleider' } },
  status, akkoord_op: status === 'akkoord' ? Date.UTC(2026, 9, 4, 9, 0) : null,
}, extra));

async function draaiPagina(root, search, fetchImpl) {
  const html = fs.readFileSync(path.join(root, 'introductie.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('inline script in introductie.html niet gevonden');
  const verboden = [];
  const doc = maakDocument(verboden);
  const calls = [];
  const vervangen = [];
  const ctx = {
    URLSearchParams,
    location: { search, pathname: '/introductie.html', hash: '', origin: 'http://localhost:8799' },
    history: { replaceState: (s, t, u) => { vervangen.push(String(u)); } },
    document: doc,
    fetch: (u, o) => { calls.push({ url: String(u), opt: o || {} }); return fetchImpl(String(u), o || {}, calls.length); },
  };
  for (const naam of ['localStorage', 'sessionStorage', 'console', 'navigator', 'XMLHttpRequest', 'Image', 'WebSocket', 'indexedDB']) {
    Object.defineProperty(ctx, naam, { get() { verboden.push(naam); return undefined; } });
  }
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx, { filename: 'introductie.html#script' });
  await flush();
  const root_ = doc.getElementById('root');
  return {
    ctx, doc, calls, vervangen, verboden, root: root_,
    tekst: () => root_.textContent,
    byId: (id) => doc.getElementById(id),
    klik: async (id) => { const n = doc.getElementById(id); if (!n) throw new Error('#' + id + ' ontbreekt'); if (!n.disabled) n.fire('click'); await flush(); },
  };
}

// ── Zuivere functies uit mna/04 laden ─────────────────────────────────────────
function laadPure(root) {
  const src04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const a = src04.indexOf('// N115-PURE-BEGIN'), b = src04.indexOf('// N115-PURE-END');
  if (a < 0 || b < a) throw new Error('N115-PURE-markers ontbreken in mna/04-begeleider-dashboard.js');
  const status = [src04.match(/^var KM_STATUS_LABEL=.*$/m), src04.match(/^var KM_STATUS_KLEUR=.*$/m)];
  const esc = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8').match(/^function esc\(s\)\{.*\}$/m);
  if (!status[0] || !status[1] || !esc) throw new Error('KM_STATUS_* of esc() niet gevonden');
  const ctx = vm.createContext({});
  vm.runInContext([esc[0], status[0][0], status[1][0], src04.slice(a, b)].join('\n'), ctx, { filename: 'mna/04#N115-PURE' });
  return { ctx, src04 };
}

export async function draaiN115UiChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const html = fs.readFileSync(path.join(root, 'introductie.html'), 'utf8');
  const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || '';
  const code = script.replace(/^\s*\/\/.*$/gm, '');

  // ── A. Statisch: introductie.html ──
  const regel = (src, re) => { const m = src.match(re); return m ? m[0].trim() : null; };
  const marilyn = fs.readFileSync(path.join(root, 'marilyn.html'), 'utf8');
  ['^\\s*const _WORKER_WHITELIST=.*$', '^\\s*const _WORKER_PARAM=.*$', '^\\s*const WORKER=.*$'].forEach((p) => {
    const re = new RegExp(p, 'm');
    const a = regel(marilyn, re), b = regel(code, re);
    check(a && b && a === b, 'introductie.html gebruikt exact dezelfde workerregel als marilyn.html: ' + (a || p));
  });
  check(!/<script[^>]*\bsrc=/i.test(html), 'introductie.html laadt geen externe scripts');
  check(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code), 'introductie.html bouwt de DOM uitsluitend met textContent/createElement (geen HTML-injectie)');
  check(!/localStorage|sessionStorage|document\.cookie|console\.|sendBeacon|gtag|googletagmanager|analytics|plausible|hotjar/i.test(code), 'introductie.html bevat geen opslag, logging of analytics');
  check(/<meta name="referrer" content="no-referrer">/.test(html), 'introductie.html lekt het token niet via de Referer-header');
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  check(/connect-src https:\/\/kantoorinzicht\.marcel-bisschops\.workers\.dev https:\/\/kantoorinzicht-staging\.marcel-bisschops\.workers\.dev;/.test(csp) && /default-src 'none'/.test(csp),
    'introductie.html CSP: verbindingen alleen naar de twee bekende workers, verder niets');
  check(/history\.replaceState/.test(code), 'introductie.html haalt het token na inlezen uit de adresbalk');

  // ── B. Gedrag: introductie.html in vm ──
  try {
    let p = await draaiPagina(root, '?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING), () => overeenkomstGet());
    check(p.calls.length === 1 && p.calls[0].url === STAGING + '/mna/koopmandaat/introductie/' + TOKEN, 'bekende staging-worker → token gaat uitsluitend naar de staging-route');
    check(p.calls[0].opt.credentials === 'omit' && p.calls[0].opt.referrerPolicy === 'no-referrer' && p.calls[0].opt.cache === 'no-store', 'GET zonder credentials/referrer/cache');
    check(p.vervangen.length === 1 && !p.vervangen[0].includes(TOKEN) && !p.vervangen[0].includes('token=') && p.vervangen[0].includes('worker='), 'token uit de adresbalk verwijderd, worker-parameter behouden');
    const t = p.byId('intro-tekst');
    check(t && t.textContent === TEKST && t.childNodes.length === 1 && t.childNodes[0].tagName === '#text', 'overeenkomsttekst wordt letterlijk en inert als tekst getoond');
    check(![...p.doc.body.alle()].some((n) => n.tagName === 'img' || n.tagName === 'script'), 'geen elementen ontstaan uit servertekst');
    check(p.tekst().includes('Testonderneming Synthetisch BV') && p.tekst().includes('Versie: 2'), 'partijen en versienummer zichtbaar');
    check(p.byId('intro-akkoord') && p.byId('intro-akkoord').disabled === true, 'akkoordknop start uitgeschakeld');
    p.byId('intro-naam').value = 'Test Persoon'; p.byId('intro-naam').fire('input');
    check(p.byId('intro-akkoord').disabled === true, 'akkoord vereist naast naam ook de bevoegdheidsbevestiging');
    await p.klik('intro-akkoord');
    check(p.calls.length === 1, 'zonder bevoegdheidsbevestiging wordt niets verstuurd');
    p.byId('intro-bevoegd').checked = true; p.byId('intro-bevoegd').fire('change');
    check(p.byId('intro-akkoord').disabled === false, 'akkoordknop actief na naam + bevoegdheidsbevestiging');
    check(p.verboden.length === 0 && ![...p.doc.body.alle()].some((n) => n.htmlGebruikt) && p.ctx.__xss === undefined, 'geen opslag/console/navigator/cookie-toegang en geen scriptuitvoering');

    // akkoord → server bevestigt → herladen
    p = await draaiPagina(root, '?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING), (u, o, n) => {
      if (n === 1) return overeenkomstGet();
      if (n === 2) return antwoord(200, { ok: true, status: 'akkoord', versie: 2, inhoud_hash: HASH });
      return overeenkomstGet('akkoord');
    });
    p.byId('intro-naam').value = 'Test Persoon'; p.byId('intro-naam').fire('input');
    p.byId('intro-bevoegd').checked = true; p.byId('intro-bevoegd').fire('change');
    await p.klik('intro-akkoord');
    const post = p.calls[1];
    let body = null; try { body = JSON.parse(post.opt.body); } catch (e) {}
    check(post && post.opt.method === 'POST' && post.url === STAGING + '/mna/koopmandaat/introductie/' + TOKEN
      && JSON.stringify(body) === JSON.stringify({ actie: 'akkoord', naam: 'Test Persoon', inhoud_hash: HASH }), 'akkoord-POST: exact {actie, naam, inhoud_hash} naar dezelfde doelgebonden route');
    check(p.calls.length === 3 && p.tekst().includes('Uw akkoord op versie 2 is vastgelegd.') && p.byId('intro-status-akkoord') && !p.byId('intro-akkoord'), 'succes alleen na serverbevestiging; daarna actuele status zonder formulier');

    // 409 (verouderde versie) → geen vals succes
    p = await draaiPagina(root, '?token=' + TOKEN, (u, o, n) => n === 1 ? overeenkomstGet() : antwoord(409, { error: 'De overeenkomst is gewijzigd. Laad de actuele versie opnieuw.' }));
    check(p.calls[0].url.startsWith(PROD + '/'), 'zonder worker-parameter → productie-worker');
    p.byId('intro-naam').value = 'Test Persoon'; p.byId('intro-naam').fire('input');
    p.byId('intro-bevoegd').checked = true; p.byId('intro-bevoegd').fire('change');
    await p.klik('intro-akkoord');
    const meld = p.byId('intro-melding');
    check(meld && meld.style.display === 'block' && meld.textContent.includes('De overeenkomst is gewijzigd') && !p.tekst().includes('is vastgelegd.') && p.byId('intro-herlaad') && p.calls.length === 2,
      '409 → expliciete foutmelding met herlaadknop, geen succesmelding, geen automatische herhaling');

    // netwerkfout en onverwacht antwoord → geen vals succes
    p = await draaiPagina(root, '?token=' + TOKEN, (u, o, n) => n === 1 ? overeenkomstGet() : Promise.reject(new Error('offline')));
    p.byId('intro-toelichting').value = 'Graag artikel 2 aanpassen'; p.byId('intro-toelichting').fire('input');
    await p.klik('intro-wijziging');
    try { body = JSON.parse(p.calls[1].opt.body); } catch (e) { body = null; }
    check(JSON.stringify(body) === JSON.stringify({ actie: 'wijziging', toelichting: 'Graag artikel 2 aanpassen', inhoud_hash: HASH }), 'wijzigingsverzoek-POST: exact {actie, toelichting, inhoud_hash}');
    check(p.byId('intro-melding').textContent.includes('Geen verbinding') && !p.tekst().includes('is vastgelegd'), 'netwerkfout → "niets bevestigd", geen succes');
    p = await draaiPagina(root, '?token=' + TOKEN, (u, o, n) => n === 1 ? overeenkomstGet() : antwoord(200, { ok: true }));
    p.byId('intro-toelichting').value = 'x'; p.byId('intro-toelichting').fire('input');
    await p.klik('intro-wijziging');
    check(!p.tekst().includes('is vastgelegd') && p.byId('intro-melding').style.display === 'block', 'ok zonder bevestigde status → geen succes');

    // ongeldige/verlopen link en onbekende worker
    p = await draaiPagina(root, '?token=kort&worker=' + encodeURIComponent(STAGING), () => overeenkomstGet());
    check(p.calls.length === 0 && p.tekst().includes('onvolledig of ongeldig') && p.vervangen.length === 1, 'ongeldig token → geen request, wel uit adresbalk');
    p = await draaiPagina(root, '?token=' + TOKEN + '&worker=' + encodeURIComponent('https://evil.example'), () => antwoord(404, { error: 'Deze link is ongeldig, ingetrokken of verlopen.' }));
    check(p.calls.length === 1 && p.calls[0].url.startsWith(PROD + '/') && !p.calls.some((c) => c.url.includes('evil.example')), 'onbekende worker-parameter → token nooit naar die host');
    check(p.tekst().includes('ingetrokken of verlopen') && !p.byId('intro-akkoord') && !p.byId('intro-herlaad'), 'verlopen/ingetrokken link → expliciete fout, geen formulier');
    p = await draaiPagina(root, '?token=' + TOKEN, () => overeenkomstGet('wijziging_gevraagd'));
    check(p.byId('intro-status-wijziging') && p.byId('intro-akkoord'), 'wijziging gevraagd → status zichtbaar, akkoord blijft mogelijk');
  } catch (e) {
    check(false, 'introductie.html vm-scenario faalde: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }

  // ── C. Zuivere functies mna/04 ──
  try {
    const { ctx: k, src04 } = laadPure(root);
    const lek = ['GeheimeNaamBV', 'GeheimeSector', 'NOTITIE-C', 'LOG-C', 'BRON-C', 'MAGEHEIM', 'TRREF-B'];
    let h = k.kmKoperTargetHtml({ id: 't1', status: 'kandidaat', vrijgave_status: 'afgeschermd', teaser: null, naam: 'GeheimeNaamBV', sector: 'GeheimeSector', notities: 'NOTITIE-C', contactlog: [{ tekst: 'LOG-C' }], bron: 'BRON-C', gepromoveerd_naar_traject_id: 'MAGEHEIM', traject_ref: 'TRREF-B' }, {});
    check(lek.every((s) => !h.includes(s)) && h.includes('Anonieme kandidaat'), 'koper vóór vrijgave: geen B/C, ook niet als ze onverwacht in de respons staan');
    h = k.kmKoperTargetHtml({ id: 't2', status: 'in_gesprek', vrijgave_status: 'vrijgegeven', teaser: null }, {});
    check(!/undefined|null/.test(h) && h.includes('Anonieme kandidaat'), 'koper na vrijgave zonder naam → geen aanname, geen "undefined"');
    h = k.kmKoperTargetHtml({ id: 't3', status: 'kandidaat', vrijgave_status: 'vrijgegeven', naam: '<img src=x onerror=alert(1)>', sector: 'zorg-test', traject_ref: 'TRREF-B', notities: 'NOTITIE-C', bron: 'BRON-C', teaser: { regio: 'zuid', sector: 'zorg', omzetklasse: '1m_2_5m', medewerkersklasse: '11_25', omschrijving: '<b>anoniem</b>' } }, { zorg: 'Zorg' });
    check(!h.includes('<img') && h.includes('&lt;img') && h.includes('zorg-test') && h.includes('TRREF-B') && !h.includes('NOTITIE-C') && !h.includes('BRON-C'), 'koper na vrijgave: B ge-escaped zichtbaar, C nooit');
    check(h.includes('Zuid-Nederland') && h.includes('Zorg') && h.includes('omzet € 1 – 2,5 mln') && h.includes('11 – 25 medewerkers') && h.includes('&lt;b&gt;anoniem'), 'teaser (A) met labels en ge-escapete omschrijving');
    check(k.kmKoperTargetHtml({ status: 'iets_intern' }, {}).includes('Onbekend'), 'onbekende status → "Onbekend"');

    check(k.kmIntroLink('https://koersvoormorgen.nl', STAGING, 'a+b/c') === 'https://koersvoormorgen.nl/introductie.html?token=a%2Bb%2Fc&worker=' + encodeURIComponent(STAGING), 'link: staging-worker expliciet mee, token ge-encodeerd');
    check(!k.kmIntroLink('https://koersvoormorgen.nl', PROD, TOKEN).includes('worker=') && !k.kmIntroLink('https://koersvoormorgen.nl', 'https://evil.example', TOKEN).includes('worker='), 'link: productie of onbekende worker → geen worker-parameter');

    const nu = Date.UTC(2026, 9, 3);
    const basis = (extra) => Object.assign({ huidige_versie: { versie: 2, inhoud_hash: 'h2', link: { actief: true, verloopt_op: nu + 1000 } }, reacties: [{ versie: 1, inhoud_hash: 'h1', soort: 'akkoord', naam: 'Oud' }], vrijgave: { status: 'afgeschermd' }, bewaring: {}, alleen_lezen: false }, extra || {});
    let ov = basis(), st = k.kmIntroStatus(ov, nu);
    check(st.akkoord === null && st.link === 'actief', 'akkoord op een oudere versie telt niet voor de actuele versie');
    check(!k.kmMagVrijgeven('begeleider', ov, st), 'geen vrijgave zonder akkoord op de actuele versie');
    ov = basis({ reacties: [{ versie: 2, inhoud_hash: 'h2', soort: 'akkoord', naam: 'Test Persoon', created_at: nu }] }); st = k.kmIntroStatus(ov, nu);
    check(st.akkoord && st.akkoord.naam === 'Test Persoon' && k.kmMagVrijgeven('begeleider', ov, st), 'begeleider mag vrijgeven na akkoord op actuele versie');
    check(!k.kmMagVrijgeven('admin', ov, st) && !k.kmMagVrijgeven('koper', ov, st), 'beheerder en koper krijgen nooit een vrijgaveknop');
    check(!k.kmMagVrijgeven('begeleider', basis({ alleen_lezen: true, reacties: ov.reacties }), k.kmIntroStatus(basis({ alleen_lezen: true, reacties: ov.reacties }), nu))
      && !k.kmMagVrijgeven('begeleider', basis({ vrijgave: { status: 'vrijgegeven' }, reacties: ov.reacties }), k.kmIntroStatus(basis({ vrijgave: { status: 'vrijgegeven' }, reacties: ov.reacties }), nu))
      && !k.kmMagVrijgeven('begeleider', basis({ bewaring: { relatie_einde_op: nu }, reacties: ov.reacties }), k.kmIntroStatus(basis({ bewaring: { relatie_einde_op: nu }, reacties: ov.reacties }), nu)),
      'geen vrijgave bij alleen-lezen, al vrijgegeven of beëindigde relatie');
    check(k.kmIntroStatus(basis({ huidige_versie: { versie: 2, inhoud_hash: 'h2', link: { actief: true, verloopt_op: nu - 1 } } }), nu).link === 'verlopen'
      && k.kmIntroStatus(basis({ huidige_versie: { versie: 2, inhoud_hash: 'h2', link: { actief: false, ingetrokken_op: nu } } }), nu).link === 'ingetrokken', 'linkstatus: verlopen en ingetrokken worden onderscheiden');
    const mail = k.kmIntroMailto('', '', 'https://koersvoormorgen.nl/introductie.html?token=' + TOKEN, null, 'Test Begeleider');
    check(mail.startsWith('mailto:?subject=') && mail.includes(encodeURIComponent('token=' + TOKEN)) && k.kmIntroMailto('t@voorbeeld.test', 'T', 'L', null, '').startsWith('mailto:t@voorbeeld.test?'), 'mailto: lege contactgegevens toegestaan, link in de tekst');

    // Statische bewaking in mna/04
    const pure = src04.slice(src04.indexOf('// N115-PURE-BEGIN'), src04.indexOf('// N115-PURE-END'));
    check(!/notities|contactlog|\bbron\b|gepromoveerd_naar_traject_id/.test(pure), 'kopercode leest geen C-velden');
    check(/else if\(!magBewerken\)\{[\s\S]{0,900}kmKoperTargetHtml\(/.test(src04), 'koperweergave in renderKoopmandaatScherm loopt via kmKoperTargetHtml');
    const n115 = src04.slice(src04.indexOf('// ── N-115 · begeleiderbeheer'), src04.indexOf('function toonKmNieuwTargetModal('));
    check(n115.length > 1000 && !/localStorage|sessionStorage|console\./.test(n115), 'begeleider-N-115-code slaat het token niet op en logt niets');
    check(/actie:'vrijgeven'/.test(n115) && /if\(!kmMagVrijgeven\(S\.kmRol,d,st\)\)return;/.test(n115), 'vrijgave-POST staat achter kmMagVrijgeven(S.kmRol, …)');
    check(/async function toonTrajectIntroductie\(\)\{\s*if\(!isTussen\(\)\)return;/.test(src04), 'alleen-lezen trajectweergave alleen voor de begeleider');
    check(/'Nieuwe versie vaststellen\?[\s\S]{0,300}akkoord[\s\S]{0,200}vrijgave/.test(n115), 'nieuwe versie vraagt expliciete bevestiging dat akkoord/vrijgave vervallen');
  } catch (e) {
    check(false, 'mna/04 N-115-functies konden niet worden getest: ' + String((e && e.message) || e));
  }

  // ── D. Load-bearing ──
  const lb = fs.readFileSync(path.join(root, 'LOAD-BEARING-PAGES.md'), 'utf8');
  check(/^introductie\.html \| nee \|/m.test(lb), 'introductie.html staat in LOAD-BEARING-PAGES.md');
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiN115UiChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' N-115-UI-checks gefaald.' : '\nAlle ' + res.length + ' N-115-UI-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
