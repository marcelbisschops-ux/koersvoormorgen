#!/usr/bin/env node
// N-77b (4 okt 2026) — lokale UI-test voor het expliciete testerakkoord binnen de bestaande
// adviseur-onboarding (adv.html). Geen netwerk, geen browser, geen node_modules: draait de zuivere
// N77B-functies én de echte login-/voorwaardenschermen uit adv.html in node:vm, met een minimale
// nep-DOM en een nep-fetch die elk verzoek registreert. Alle gegevens hieronder zijn synthetisch.
//
// Gebruik: node tests/n77b-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 17b).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const DOC = 'https://koersvoormorgen.nl/testvoorwaarden.html';
const SESSIE = 'sessie-synth-' + 'n'.repeat(24);
const TV_OPEN = { versie: '1.3', url: DOC, vereist: true, akkoord: false, geaccepteerd_op: null };
const TV_OK = { versie: '1.3', url: DOC, vereist: true, akkoord: true, geaccepteerd_op: 1 };
const TRAJECT = { id: 'MASYN001', kantoor_naam: 'Synth Traject BV', status: 'actief', tussen_code: 'TSYN0001' };

// Exacte vormen uit backend worker/16-adviseur.js (N-77b, READ-ONLY bron).
const onboardingPayload = (gv, token) => ({ ok: true, naam: 'Synth Tester', id: 'u_synth', sessie_token: token === undefined ? SESSIE : token, is_tester: 1, testvoorwaarden_vereist: true,
  voorwaarden: { gv_akkoord: gv, gv_versie: '2.0', testvoorwaarden: TV_OPEN } });
const volledigPayload = (tester, extra) => Object.assign({ ok: true, naam: 'Synth Adviseur', bedrijf: 'Synth Kantoor', id: 'u_synth', sessie_token: null, trajecten: [TRAJECT], traject_limiet: 3,
  modules: { traject: true }, is_tester: tester ? 1 : 0, proef: 0, proef_tot: null, trajecten_gebruikt: 1,
  voorwaarden: Object.assign({ gv_akkoord: true, gv_versie: '2.0' }, tester ? { testvoorwaarden: TV_OK } : {}), branding: {} }, extra || {});
const getVoorwaarden = (tv) => Object.assign({ ok: true, av: { versie: '1', tekst: 'AV' }, gv: { versie: '2.0', tekst: 'Synthetische <gebruiksvoorwaarden>.' } }, tv ? { testvoorwaarden: tv } : {});

function knip(src, van, tot, naam) {
  const a = src.indexOf(van), b = src.indexOf(tot, a + 1);
  if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
  return src.slice(a, b);
}

function leesAdv(root) {
  const html = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
  return { html, pure: knip(html, '// N77B-ADV-PURE-BEGIN', '// N77B-ADV-PURE-END', 'adv.html N77B') };
}

// ── Minimale nep-DOM: elk element met id of class in gerenderde HTML wordt een object ──
function maakDom() {
  const reg = new Map();
  const klassen = [];
  class El {
    constructor(tag, attrs) {
      const attr = (n) => { const m = attrs.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : ''; };
      this.tag = tag; this.id = attr('id'); this.className = attr('class'); this.href = attr('href');
      this.disabled = /\sdisabled(\s|\/|$)/.test(attrs); this.checked = /\schecked(\s|\/|$)/.test(attrs); this.type = attr('type');
      this.style = {}; this.textContent = ''; this.value = ''; this.onclick = null; this.onchange = null; this.onkeydown = null; this._html = '';
      this.classList = { add() {}, remove() {} };
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); registreer(this._html); }
  }
  function registreer(h) {
    for (const m of h.matchAll(/<([a-z]+)\b([^>]*)>/gi)) {
      const el = new El(m[1].toLowerCase(), ' ' + m[2]);
      if (el.id) reg.set(el.id, el);
      if (el.className) klassen.push(el);
    }
  }
  const app = new El('div', ' id="app"');
  const toast = new El('div', ' id="toast"');
  const vast = () => { reg.clear(); klassen.length = 0; reg.set('app', app); reg.set('toast', toast); };
  vast();
  Object.defineProperty(app, 'innerHTML', { get() { return this._html; }, set(v) { vast(); this._html = String(v); registreer(this._html); } });
  const document = {
    title: '',
    getElementById: (id) => reg.get(id) || null,
    querySelectorAll: (sel) => (sel[0] === '.' ? klassen.filter((e) => e.className.split(/\s+/).includes(sel.slice(1))) : []),
  };
  return { document, app };
}

// ── Nep-fetch: registreert elk verzoek; `api(regel)` geeft {status, json} of gooit (netwerkfout) ──
function maakNet(api) {
  const log = [];
  const fetch = (url, opts) => {
    opts = opts || {};
    const u = new URL(url);
    const headers = Object.assign({}, opts.headers || {});
    let body = opts.body;
    if (body && typeof body.get === 'function') body = { form: body.get('data') };
    const regel = { method: opts.method || 'GET', pad: u.pathname, origin: u.origin, headers, body, cache: opts.cache };
    log.push(regel);
    return Promise.resolve().then(() => api(regel)).then((r) => {
      if (!r) r = { status: 404, json: { error: 'fixture: onbekend' } };
      const status = r.status || 200;
      return { status, ok: status >= 200 && status < 300, json: async () => { if (r.raw !== undefined) throw new Error('geen json'); return r.json; } };
    });
  };
  return { fetch, log };
}

const flush = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };

// Laadt de échte login-/voorwaarden-/ververs-code uit adv.html; dashboard, P1C-schermen en logout
// zijn stubs die alleen vastleggen dát ze bereikt zijn.
function laadScherm(root, api, opties = {}) {
  const { html, pure } = leesAdv(root);
  const helpers = knip(html, 'function esc(s){', '// ===== LOGIN =====', 'helpers');
  const flow = knip(html, '// Zet een geslaagde login-respons', '// ===== DASHBOARD =====', 'loginflow');
  const ververs = knip(html, 'async function ververs(){', '// ===== P1C · PROMOTIE', 'ververs');
  const { document, app } = maakDom();
  const net = maakNet(api);
  const bereikt = [];
  const ctx = vm.createContext({ document, fetch: net.fetch, URLSearchParams, AbortController, setTimeout, clearTimeout, setImmediate, console });
  const prelude = [
    "var WORKER='" + STAGING + "';",
    "var BRAND={platform:'Koers voor Morgen',suffix:'M&A',bedrijf:'Synth',kort:'KvM'};",
    "var G={email:'',token:'',naam:'',bedrijf:'',trajecten:[]};",
    'var P1C_CTX=' + JSON.stringify(opties.p1c || null) + ';',
    'var __bereikt=[];',
    "function renderDashboard(){__bereikt.push('dashboard');}",
    "function renderP1cPromotie(){__bereikt.push('p1c-promotie');}",
    "function renderP1cTraject(){__bereikt.push('p1c-traject');}",
    "function renderP1cMelding(){__bereikt.push('p1c-melding');}",
    "function renderLogin(){__bereikt.push('login');}",
    "function doLogout(){__bereikt.push('logout');G.token='';}",
  ].join('\n');
  vm.runInContext([prelude, pure, helpers, flow, ververs].join('\n'), ctx, { filename: 'adv.html#N77B-flow' });
  return {
    ctx, net, app,
    bereikt: () => ctx.__bereikt.slice(),
    el: (id) => document.getElementById(id),
    klasse: (k) => document.querySelectorAll('.' + k),
    vink: async (id, aan = true) => { const e = document.getElementById(id); if (!e) throw new Error('#' + id + ' ontbreekt'); e.checked = aan; if (e.onchange) e.onchange(); await flush(); },
    // Zoals een echte klik: een uitgeschakelde knop doet niets.
    klik: async (id) => { const e = document.getElementById(id); if (!e) throw new Error('#' + id + ' ontbreekt'); if (!e.disabled && e.onclick) await e.onclick.call(e); await flush(); },
  };
}

const posts = (net, pad) => net.log.filter((r) => r.method === 'POST' && r.pad === pad);
const gets = (net, pad) => net.log.filter((r) => r.method === 'GET' && r.pad === pad);

// Standaard-backend: GET voorwaarden met testerstatus bij token, accept + refetch per scenario te sturen.
function backend({ accept, trajecten, voorwaarden } = {}) {
  let accepten = 0, refetches = 0;
  const api = (r) => {
    if (r.pad === '/gebruiker/voorwaarden' && r.method === 'GET') {
      if (voorwaarden) return voorwaarden(r);
      return { json: getVoorwaarden(r.headers['x-gebruiker-token'] === SESSIE ? TV_OPEN : null) };
    }
    if (r.pad === '/gebruiker/voorwaarden/accepteren') { accepten++; return accept ? accept(r, accepten) : { json: { ok: true, gv_versie: '2.0', testvoorwaarden: TV_OK } }; }
    if (r.pad === '/adviseur/trajecten') { refetches++; return trajecten ? trajecten(r, refetches) : { json: volledigPayload(true) }; }
    if (r.pad === '/adviseur/mfa/verify') return JSON.parse(r.body).code === '123456' ? { json: { ok: true, sessie_token: SESSIE } } : { status: 401, json: { error: 'Code onjuist.' } };
    return null;
  };
  return { api, aantal: () => ({ accepten, refetches }) };
}

export async function draaiN77bUiChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const probeer = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ': ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ')); } };

  // ── A. Zuivere functies ──
  await probeer('N77B-zuiver', async () => {
    const { pure } = leesAdv(root);
    const a = vm.createContext({});
    vm.runInContext(pure, a, { filename: 'adv.html#N77B-ADV-PURE' });
    const ob = (d) => JSON.stringify(a.n77bOnboarding(d));
    check(ob(volledigPayload(false)) === '{"gv":false,"tester":false}' && ob({ ok: true }) === '{"gv":false,"tester":false}'
      && ob({ ok: true, voorwaarden: { gv_akkoord: false } }) === '{"gv":true,"tester":false}', 'gewone gebruiker: geen testerplicht; GV-plicht exact als voorheen');
    check(ob(onboardingPayload(true)) === '{"gv":false,"tester":true}' && ob(onboardingPayload(false)) === '{"gv":true,"tester":true}',
      'tester-onboardingpayload (ook na MFA-refetch): testerplicht; GV alleen als die ook ontbreekt');
    check(ob({ ok: true, voorwaarden: { gv_akkoord: true, testvoorwaarden: { versie: '1.3', vereist: true, akkoord: false } } }) === '{"gv":false,"tester":true}'
      && ob(volledigPayload(true)) === '{"gv":false,"tester":false}', 'stale/ontbrekend akkoord via voorwaarden.testvoorwaarden herkend; geldig akkoord → door');
    check(JSON.stringify(a.n77bTvInfo(getVoorwaarden(TV_OPEN))) === JSON.stringify({ versie: '1.3', url: DOC }), 'versie + documentlink uitsluitend uit de serverstatus van GET /gebruiker/voorwaarden');
    check(a.n77bTvInfo(getVoorwaarden(null)) === null && a.n77bTvInfo(getVoorwaarden(Object.assign({}, TV_OPEN, { url: 'https://evil.example/tv.html' }))) === null
      && a.n77bTvInfo(getVoorwaarden(Object.assign({}, TV_OPEN, { versie: 1.3 }))) === null && a.n77bTvInfo(getVoorwaarden(Object.assign({}, TV_OPEN, { versie: '1.3"><x' }))) === null,
      'onbekend document, numerieke of vreemde versie of geen testerstatus → geen akkoordmogelijkheid');
    const info = { versie: '1.3', url: DOC };
    const T = { gv: false, tester: true }, B = { gv: true, tester: true }, N = { gv: true, tester: false };
    check(!a.n77bKlaar(T, false, false, info) && a.n77bKlaar(T, false, true, info) && !a.n77bKlaar(T, false, true, null)
      && !a.n77bKlaar(B, true, false, info) && !a.n77bKlaar(B, false, true, info) && a.n77bKlaar(B, true, true, info)
      && a.n77bKlaar(N, true, false, null) && !a.n77bKlaar(N, false, false, null), 'knop pas bij alle noodzakelijke vakjes; gewone gebruiker alleen GV');
    check(JSON.stringify(a.n77bAcceptBody(T, info)) === '{"testvoorwaarden_akkoord":true,"testvoorwaarden_versie":"1.3"}' && JSON.stringify(a.n77bAcceptBody(N, null)) === '{}',
      'POST-body tester exact {testvoorwaarden_akkoord:true, testvoorwaarden_versie}; gewone gebruiker ongewijzigd {}');
    const u = (s, j, v = '1.3') => a.n77bAcceptUitkomst(s, j, v).soort;
    check(u(200, { ok: true, testvoorwaarden: TV_OK }) === 'ok', 'succes: HTTP 2xx + ok:true + serverbevestigd akkoord op exact deze versie');
    check(['fout', 'fout', 'fout', 'fout', 'fout', 'fout'].join() === [u(200, { ok: false }), u(200, { ok: true, gv_versie: '2.0' }), u(200, { ok: true, testvoorwaarden: TV_OPEN }),
      u(500, { error: 'testvoorwaarden_akkoord_niet_vastgelegd' }), u(0, null), u(403, { error: 'ip_niet_toegestaan' })].join(),
      'ok:false, ok zonder testerbevestiging, akkoord:false, DB-fout, netwerkfout of IP-weigering → geen succes');
    check(u(409, { error: 'testvoorwaarden_versie_onjuist', testvoorwaarden: { versie: '1.4' } }) === 'verouderd' && u(200, { ok: true, testvoorwaarden: Object.assign({}, TV_OK, { versie: '1.4' }) }) === 'verouderd',
      'verouderde versie (409 of bevestiging op een andere versie) → "verouderd", opnieuw lezen');
    check(a.n77bAcceptUitkomst(500, {}, '1.3').melding.includes('status 500') && a.n77bAcceptUitkomst(0, null, '1.3').melding.includes('niets bevestigd'), 'foutmeldingen begrijpelijk');
    check(a.n77bVervolgGeldig(200, volledigPayload(true)) && !a.n77bVervolgGeldig(200, onboardingPayload(true)) && !a.n77bVervolgGeldig(500, volledigPayload(true))
      && !a.n77bVervolgGeldig(200, Object.assign(volledigPayload(true), { trajecten: undefined })) && !a.n77bVervolgGeldig(200, { ok: true, mfa_required: true, trajecten: [] }),
      'vervolg alleen met volledige trajectenpayload zonder openstaande testerplicht');

    let accepten = 0, refetch = 0, los;
    const st = { bezig: false, bevestigd: false };
    const io = (acc, tr) => ({ accepteer: async (b) => { accepten++; return acc(b); }, trajecten: async () => { refetch++; return tr(); } });
    const p1 = a.n77bVerwerk(st, T, info, io(() => new Promise((r) => { los = r; }), async () => ({ status: 200, json: volledigPayload(true) })));
    const p2 = await a.n77bVerwerk(st, T, info, io(async () => ({ status: 200, json: { ok: true, testvoorwaarden: TV_OK } }), async () => ({ status: 200, json: volledigPayload(true) })));
    check(p2.soort === 'genegeerd' && accepten === 1, 'dubbelklik: tweede verwerking tijdens een lopende POST genegeerd');
    los({ status: 200, json: { ok: false } });
    const r1 = await p1;
    check(r1.soort === 'fout' && refetch === 0 && !st.bevestigd && !st.bezig, 'mislukte acceptatie → geen dataherlaad, opnieuw proberen mogelijk');
    const r2 = await a.n77bVerwerk(st, T, info, io(async () => ({ status: 200, json: { ok: true, testvoorwaarden: TV_OK } }), async () => ({ status: 500, json: { error: 'x' } })));
    check(r2.soort === 'fout' && st.bevestigd && refetch === 1 && /vastgelegd/.test(r2.melding), 'akkoord bevestigd maar herladen mislukt → fout, geen dashboard');
    const r3 = await a.n77bVerwerk(st, T, info, io(async () => { throw new Error('mag niet opnieuw accepteren'); }, async () => ({ status: 200, json: volledigPayload(true) })));
    check(r3.soort === 'ok' && accepten === 2 && refetch === 2 && r3.payload.trajecten.length === 1, 'retry na bevestigd akkoord herlaadt alleen, accepteert niet opnieuw');
    const r4 = await a.n77bVerwerk({ bezig: false, bevestigd: false }, T, info, io(async () => { throw new Error('net'); }, async () => ({ status: 200, json: volledigPayload(true) })));
    check(r4.soort === 'fout' && refetch === 2, 'netwerkfout bij accepteren → fout zonder herladen');
    check((await a.n77bVerwerk({ bezig: false }, T, null, io(async () => { throw new Error('x'); }, async () => { throw new Error('x'); }))).soort === 'genegeerd', 'zonder serverversie wordt niets gepost');
  });

  // ── B. Echte schermflow uit adv.html (nep-DOM + nep-fetch) ──
  await probeer('gewone gebruiker', async () => {
    const b = backend();
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(volledigPayload(false, { sessie_token: SESSIE }), 'adviseur@voorbeeld.test');
    await flush();
    check(s.bereikt().join() === 'dashboard' && s.net.log.length === 0, 'gewone gebruiker met GV: direct dashboard, geen extra verzoek');

    const g = laadScherm(root, b.api);
    g.ctx.toepassenLoginPayload(volledigPayload(false, { sessie_token: SESSIE, voorwaarden: { gv_akkoord: false } }), 'adviseur@voorbeeld.test');
    await flush();
    const get = gets(g.net, '/gebruiker/voorwaarden');
    check(get.length === 1 && Object.keys(get[0].headers).length === 0 && !g.el('vw-tv') && g.el('vw-gv') && g.el('vw-ok').disabled && g.el('vw-doc-gv'),
      'gewone gebruiker zonder GV: bestaand GV-scherm (zelfde GET zonder token, geen testervakje)');
    await g.vink('vw-gv');
    await g.klik('vw-ok');
    const p = posts(g.net, '/gebruiker/voorwaarden/accepteren');
    check(p.length === 1 && p[0].body === '{}' && p[0].headers['x-gebruiker-token'] === SESSIE && g.bereikt().join() === 'dashboard' && posts(g.net, '/adviseur/trajecten').length === 0,
      'gewone gebruiker: POST {} met sessie en daarna het bestaande vervolg (ongewijzigd gedrag)');
  });

  await probeer('tester met GV, zonder testerakkoord', async () => {
    const b = backend();
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    const get = gets(s.net, '/gebruiker/voorwaarden');
    check(s.bereikt().length === 0 && /Testvoorwaarden accepteren/.test(s.app.innerHTML) && !s.el('vw-gv') && !s.el('vw-doc-gv'), 'tester met GV: alleen het testerdeel, geen dashboard en geen GV-vakje');
    check(get.length === 1 && get[0].headers['x-gebruiker-token'] === SESSIE && get[0].cache === 'no-store' && get[0].origin === STAGING, 'GET voorwaarden met de bestaande sessie, zonder cache, naar de whitelist-worker');
    check(s.el('vw-tv-link').href === DOC && s.klasse('vw-tv-v').length === 2 && s.klasse('vw-tv-v').every((e) => e.textContent === '1.3') && /target="_blank" rel="noopener"/.test(s.app.innerHTML),
      'duidelijke link naar de bestaande testvoorwaarden met de actuele serverversie');
    check(s.el('vw-tv') && s.el('vw-tv').checked === false && s.el('vw-ok').disabled, 'eigen testervakje niet vooraf aangevinkt; knop uitgeschakeld');
    await s.klik('vw-ok');
    check(posts(s.net, '/gebruiker/voorwaarden/accepteren').length === 0, 'geen automatische acceptatie: zonder vinkje geen POST');
    await s.vink('vw-tv');
    check(!s.el('vw-ok').disabled, 'knop beschikbaar na het testervakje');
    await s.klik('vw-ok');
    const p = posts(s.net, '/gebruiker/voorwaarden/accepteren');
    const t = posts(s.net, '/adviseur/trajecten');
    check(p.length === 1 && JSON.parse(p[0].body).testvoorwaarden_akkoord === true && JSON.parse(p[0].body).testvoorwaarden_versie === '1.3' && Object.keys(JSON.parse(p[0].body)).length === 2
      && p[0].headers['x-gebruiker-token'] === SESSIE, 'POST accepteren: expliciet akkoord + serverversie, met de bestaande sessie');
    check(t.length === 1 && t[0].headers['x-gebruiker-token'] === SESSIE && t[0].body.form === '{}' && s.net.log.indexOf(t[0]) > s.net.log.indexOf(p[0]),
      'na serverbevestiging: volledige /adviseur/trajecten opnieuw met sessie (zonder wachtwoord)');
    check(s.bereikt().join() === 'dashboard' && s.ctx.G.trajecten.length === 1 && s.ctx.G.trajecten[0].id === 'MASYN001' && s.ctx.G.bedrijf === 'Synth Kantoor' && s.ctx.G.token === SESSIE,
      'dashboard pas met de herladen dossierdata; sessie blijft behouden');
  });

  await probeer('beide ontbreken', async () => {
    const s = laadScherm(root, backend().api);
    s.ctx.toepassenLoginPayload(onboardingPayload(false), 'tester@voorbeeld.test');
    await flush();
    check(s.el('vw-gv') && s.el('vw-tv') && s.el('vw-doc-gv') && /Gebruiksvoorwaarden van het platform en de Testvoorwaarden/.test(s.app.innerHTML), 'beide ontbreken: GV-tekst + GV-vakje + testervakje');
    await s.vink('vw-tv');
    const alleenTv = s.el('vw-ok').disabled;
    await s.vink('vw-tv', false); await s.vink('vw-gv');
    const alleenGv = s.el('vw-ok').disabled;
    await s.vink('vw-tv');
    check(alleenTv && alleenGv && !s.el('vw-ok').disabled, 'knop pas bij beide vakjes');
    await s.klik('vw-ok');
    check(posts(s.net, '/gebruiker/voorwaarden/accepteren').length === 1 && s.bereikt().join() === 'dashboard', 'beide geaccepteerd → herladen → dashboard');
  });

  await probeer('false/failed accept', async () => {
    const b = backend({ accept: (r, n) => (n === 1 ? { json: { ok: false, error: 'x' } } : n === 2 ? { status: 500, json: { error: 'testvoorwaarden_akkoord_niet_vastgelegd' } } : n === 3 ? { json: { ok: true, gv_versie: '2.0' } } : { json: { ok: true, testvoorwaarden: TV_OK } }) });
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    await s.vink('vw-tv');
    const uitkomsten = [];
    for (let i = 0; i < 3; i++) {
      await s.klik('vw-ok');
      uitkomsten.push(s.el('vw-err').style.display === 'block' && !s.el('vw-ok').disabled && s.bereikt().length === 0 && b.aantal().refetches === 0);
    }
    check(uitkomsten.every(Boolean) && /status 500/.test(s.el('vw-err').textContent) === false && /niet door de server bevestigd/.test(s.el('vw-err').textContent),
      'ok:false, DB-fout (500) en ok zonder testerbevestiging: begrijpelijke fout, geen dashboard, geen herlaad, retry mogelijk');
    await s.klik('vw-ok');
    check(b.aantal().accepten === 4 && b.aantal().refetches === 1 && s.bereikt().join() === 'dashboard', 'retry met serverbevestiging → herladen → dashboard');
  });

  await probeer('stale accept', async () => {
    let versie = '1.3';
    const b = backend({
      voorwaarden: () => ({ json: getVoorwaarden(Object.assign({}, TV_OPEN, { versie })) }),
      accept: (r) => (JSON.parse(r.body).testvoorwaarden_versie === '1.4' ? { json: { ok: true, testvoorwaarden: Object.assign({}, TV_OK, { versie: '1.4' }) } } : { status: 409, json: { error: 'testvoorwaarden_versie_onjuist', testvoorwaarden: { versie: '1.4' } } }),
    });
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    await s.vink('vw-tv');
    versie = '1.4';
    await s.klik('vw-ok');
    check(s.el('vw-melding') && /bijgewerkt/.test(s.el('vw-melding').textContent || s.app.innerHTML) && s.el('vw-tv').checked === false && s.el('vw-ok').disabled
      && gets(s.net, '/gebruiker/voorwaarden').length === 2 && s.klasse('vw-tv-v').every((e) => e.textContent === '1.4') && s.bereikt().length === 0,
      'stale versie: melding, opnieuw de actuele serverversie ophalen, vakje opnieuw leeg, geen dashboard');
    await s.vink('vw-tv');
    await s.klik('vw-ok');
    const p = posts(s.net, '/gebruiker/voorwaarden/accepteren');
    check(p.length === 2 && JSON.parse(p[1].body).testvoorwaarden_versie === '1.4' && s.bereikt().join() === 'dashboard', 'na opnieuw lezen: akkoord op de nieuwe serverversie → dashboard');
  });

  await probeer('herladen mislukt', async () => {
    const b = backend({ trajecten: (r, n) => (n === 1 ? { json: onboardingPayload(true, null) } : n === 2 ? { status: 503, json: { error: 'x' } } : { json: volledigPayload(true) }) });
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    await s.vink('vw-tv');
    await s.klik('vw-ok');
    const na1 = s.bereikt().length === 0 && /vastgelegd/.test(s.el('vw-err').textContent) && s.el('vw-ok').textContent === 'Opnieuw laden';
    await s.klik('vw-ok');
    const na2 = s.bereikt().length === 0 && b.aantal().accepten === 1;
    await s.klik('vw-ok');
    check(na1 && na2 && b.aantal().accepten === 1 && b.aantal().refetches === 3 && s.bereikt().join() === 'dashboard',
      'herlaad levert nog onboarding of 503 → geen vals dashboard; retry herlaadt alleen (één accept) en gaat dan door');
  });

  await probeer('GET mislukt', async () => {
    let n = 0;
    const b = backend({ voorwaarden: () => (++n === 1 ? { status: 500, json: { error: 'x' } } : { json: getVoorwaarden(TV_OPEN) }) });
    const s = laadScherm(root, b.api);
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    check(s.el('vw-laadfout') && s.el('vw-opnieuw') && s.el('vw-vakjes').style.display !== 'block', 'GET voorwaarden mislukt: begrijpelijke fout, geen vakjes');
    await s.klik('vw-opnieuw');
    check(s.el('vw-tv') && s.el('vw-vakjes').style.display === 'block' && posts(s.net, '/gebruiker/voorwaarden/accepteren').length === 0, 'opnieuw laden binnen het scherm werkt; niets gepost');
    await s.klik('vw-uit');
    check(s.bereikt().join() === 'logout', 'uitloggen blijft bereikbaar vanaf het testerscherm');
  });

  await probeer('MFA', async () => {
    const b = backend({ trajecten: (r, n) => (n === 1 ? { json: onboardingPayload(true, null) } : { json: volledigPayload(true) }) });
    const s = laadScherm(root, b.api);
    s.ctx.renderMfa('mfa-synth-1', 'tester@voorbeeld.test');
    s.el('m-c').value = '123456';
    await s.klik('m-btn');
    check(/Testvoorwaarden accepteren/.test(s.app.innerHTML) && s.bereikt().length === 0 && s.ctx.G.token === SESSIE, 'na MFA: ontbrekend testerakkoord herkend, sessietoken behouden, geen dashboard');
    await s.vink('vw-tv');
    await s.klik('vw-ok');
    const t = posts(s.net, '/adviseur/trajecten');
    check(t.length === 2 && t.every((r) => r.headers['x-gebruiker-token'] === SESSIE) && s.bereikt().join() === 'dashboard', 'na MFA + akkoord: herladen met sessie → dashboard');
  });

  await probeer('P1C-context en ververs', async () => {
    const s = laadScherm(root, backend().api, { p1c: { soort: 'traject', traject: 'MASYN001' } });
    s.ctx.toepassenLoginPayload(onboardingPayload(true), 'tester@voorbeeld.test');
    await flush();
    await s.vink('vw-tv');
    await s.klik('vw-ok');
    check(s.bereikt().join() === 'p1c-traject', 'P1C-context blijft behouden: na akkoord + herladen de doelgerichte stap');

    const v = laadScherm(root, backend({ trajecten: () => ({ json: onboardingPayload(true, null) }) }).api);
    v.ctx.G.token = SESSIE;
    await v.ctx.ververs();
    await flush();
    check(v.bereikt().length === 0 && v.el('vw-tv'), 'ververs() met intussen verlopen testerakkoord → onboarding, geen leeg dashboard');
  });

  // ── C. Statische bewaking ──
  await probeer('statisch', async () => {
    const { html } = leesAdv(root);
    const code = html.replace(/^\s*\/\/.*$/gm, '');
    check((code.match(/testvoorwaarden_akkoord:true/g) || []).length === 1 && !/id="vw-tv"[^>]*checked/.test(code), 'akkoord-body op één plek; testervakje nooit vooraf aangevinkt');
    check(/var ob=n77bOnboarding\(d\);\s*if\(ob\.tester\)\{ renderVoorwaardenAcceptatie\(vw,ob\); return; \}\s*if\(!vw\.gv_akkoord\)/.test(code), 'testerplicht vóór GV en vóór het vervolg gecontroleerd (wachtwoord- en MFA-pad delen toepassenLoginPayload)');
    check(!/localStorage|sessionStorage|document\.cookie|sendBeacon|gtag|analytics/.test(html), 'geen opslag of tracking');
    const tv = fs.readFileSync(path.join(root, 'testvoorwaarden.html'), 'utf8');
    check(tv.includes('Koers voor Morgen · Bisschops Financing B.V. · Versie 1.3 · September 2026'), 'bestaande testvoorwaarden.html (versie 1.3) aanwezig met de kenmerkregel');
  });
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiN77bUiChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' N-77b-UI-checks gefaald.' : '\nAlle ' + res.length + ' N-77b-UI-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
