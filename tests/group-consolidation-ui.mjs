#!/usr/bin/env node
// Groepsbeeld UI (productpunt 5, 10 okt 2026).
//
// Draait de ECHTE module mna/11-groepsbeeld.js plus de echte rolhelpers (mna/02) en de bestaande
// bedragopmaak/labelhelpers (mna/09) in node:vm. Invoer is synthetische S._mnaData in de vorm van de
// gecommitte backendmetadata (worker/42 bouwGroepsbeeld → consolidatieCheck.groepsbeeld in data_json van
// de groepsrij). Geen netwerk, geen browser, geen live API, geen AI — dit is technisch bewijs; backend-
// live-, staging-, echte-document- en productiebewijs staan apart OPEN (docs/group-consolidation-ui.md).
// Sectie 12 (12 okt 2026) draait daarnaast de echte financiële opslagpaden uit mna/02 met uitgestelde
// synthetische /mna/save-antwoorden: succes, fout, malformed, uit volgorde, sessie-/rolwissel, dirty invoer.
// Sectie 13 (13 okt 2026) draait Bewerken in beide partneroverzichten (mna/04 en mna/06) met een minimale
// DOM en een synthetische /mna/partners.
//
// Gebruik: node tests/group-consolidation-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 29).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function regel(src, re, naam) { const m = src.match(re); if (!m) throw new Error('niet gevonden in bron: ' + naam); return m[0]; }

// ── Synthetische metadata (vorm worker/42) ─────────────────────────────────────────────────────
const ONB = () => ({ status: 'ONBEKEND', bedrag: null });
const periode = (soort = null) => ({ soort, boekjaar: null, status: 'ONBEKEND' });
function veld(extra = {}) {
  return {
    regel: 'som', bruto_berekend: null, bruto_status: null, invoer: { status: null, met_waarde: 0, ontbrekend: 0, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 },
    aangeleverd: null, gebruikte_waarde: null, bekende_correcties: ONB(), eliminaties: ONB(),
    gereconcilieerd_bedrag: null, reconciliatie_status: 'NIET_MOGELIJK',
    verschil: null, onverklaard_verschil: null, verschil_pct: null, boven_drempel: null,
    periode: periode(), ontbrekend: ['eliminaties_onbekend', 'periode_onbekend', 'consolidatiekring_onbewezen'], ...extra,
  };
}
function overzicht(velden, { maatschap = false, geselecteerd = 2, onleesbaar = 0, extra = {} } = {}) {
  return {
    versie: 1, betekenis: 'Berekend groepsbeeld – niet aangemerkt als officiële consolidatie', officiele_consolidatie: 'NIET_VASTGESTELD',
    selectie: { structuur: maatschap ? 'maatschap' : 'bv', regel: maatschap ? 'MAATSCHAP_ALLE_ENTITEITEN' : 'BV_ZONDER_HOLDING',
      entiteiten_geselecteerd: geselecteerd, entiteiten_onleesbaar: onleesbaar, juridische_consolidatiekring: 'NIET_BEWEZEN' },
    eliminaties: { status: 'ONBEKEND', bedrag: null, toelichting: "De bestaande 'normalisatie' is EBITDA-normalisatie, geen intercompany-eliminatie." },
    drempel_pct: 5, velden, ...extra,
  };
}
const STANDAARD_VELDEN = () => ({
  // Aangeleverd echte 0 tegenover bruto 1.200.000: verschil boven drempel.
  omzet3: veld({ bruto_berekend: 1200000, bruto_status: 'COMPLEET_VOOR_SELECTIE', invoer: { status: 'COMPLEET_VOOR_SELECTIE', met_waarde: 2, ontbrekend: 0, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 },
    aangeleverd: { status: 'AANGELEVERD_NIET_GEVERIFIEERD', waarde: 0, officiele_consolidatie: 'NIET_VASTGESTELD' }, gebruikte_waarde: 'AANGELEVERD',
    verschil: -1200000, onverklaard_verschil: -1200000, verschil_pct: 100, boven_drempel: true }),
  // Onvolledig: één entiteit ontbreekt; bruto is wel berekend.
  ebitda: veld({ bruto_berekend: 300000, bruto_status: 'ONVOLLEDIG', invoer: { status: 'ONVOLLEDIG', met_waarde: 1, ontbrekend: 1, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 },
    gebruikte_waarde: 'BRUTO_BEREKEND', ontbrekend: ['entiteitwaarden_ontbreken', 'eliminaties_onbekend', 'periode_onbekend', 'consolidatiekring_onbewezen'] }),
  // Onbruikbaar door ambigu/onbruikbaar: geen som.
  debiteuren: veld({ bruto_status: 'ONBRUIKBAAR', invoer: { status: 'ONBRUIKBAAR', met_waarde: 0, ontbrekend: 0, onbruikbaar: 1, ambigu: 1, onleesbaar: 0 },
    ontbrekend: ['entiteitwaarden_onbruikbaar_of_ambigu', 'eliminaties_onbekend', 'periode_onbekend', 'consolidatiekring_onbewezen'] }),
  // Prognose, aangeleverd binnen drempel.
  forecast: veld({ bruto_berekend: 1000000, bruto_status: 'COMPLEET_VOOR_SELECTIE', invoer: { status: 'COMPLEET_VOOR_SELECTIE', met_waarde: 2, ontbrekend: 0, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 },
    aangeleverd: { status: 'AANGELEVERD_NIET_GEVERIFIEERD', waarde: 1020000, officiele_consolidatie: 'NIET_VASTGESTELD' }, gebruikte_waarde: 'AANGELEVERD',
    verschil: 20000, onverklaard_verschil: 20000, verschil_pct: 2, boven_drempel: false, periode: periode('PROGNOSE') }),
  // Echte bruto 0.
  wip: veld({ bruto_berekend: 0, bruto_status: 'COMPLEET_VOOR_SELECTIE', invoer: { status: 'COMPLEET_VOOR_SELECTIE', met_waarde: 2, ontbrekend: 0, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 }, gebruikte_waarde: 'BRUTO_BEREKEND' }),
  // Afgeleid veld zonder invoertelling; aangeleverd ambigu.
  ebitdaMarge: veld({ regel: 'afgeleid_ebitdaMarge', bruto_berekend: 25, bruto_status: 'ONVOLLEDIG', invoer: null,
    aangeleverd: { status: 'AMBIGU', waarde: null, officiele_consolidatie: 'NIET_VASTGESTELD' }, gebruikte_waarde: 'AANGELEVERD',
    ontbrekend: ['entiteitwaarden_ontbreken', 'aangeleverde_waarde_onbruikbaar_of_ambigu', 'eliminaties_onbekend', 'periode_onbekend', 'consolidatiekring_onbewezen'] }),
});
function groepsDj(velden = STANDAARD_VELDEN(), opts) {
  return {
    omzet3: { value: '0', label: 'Omzet', bron: 'handmatig' },
    ebitda: { value: '300000', label: '', auto: true, groepsbeeld: { versie: 1, type: 'BRUTO_BEREKEND' } },
    forecast: { value: '1.020.000', label: 'Forecast' },
    ebitdaMarge: { value: '1,234', label: 'Marge' },
    consolidatieCheck: { value: '[]', label: '', auto: true, groepsbeeld: overzicht(velden, opts) },
  };
}
const rij = (fase_id, entiteit_id, dj, asString = true) => ({ fase_id, entiteit_id, data_json: asString ? JSON.stringify(dj) : dj, checklist_json: '{}' });

// ── Omgeving ────────────────────────────────────────────────────────────────────────────────────
function laad(root, { rol = 'verkoper', code = 'VSYN0001', fase = 0, mnaData } = {}) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src09 = lees(root, 'mna/09-financiele-broncontrole.js');
  const src11 = lees(root, 'mna/11-groepsbeeld.js');
  const delen = [
    regel(src02, /^function isVerkoper\(\)\{.*\}$/m, 'isVerkoper'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    regel(src09, /^function fbcEsc\(v\)\{[\s\S]*?\n\}/m, 'fbcEsc'),
    regel(src09, /^function fbcOnbekend\(tekst\)\{.*\}$/m, 'fbcOnbekend'),
    regel(src09, /^function fbcBedrag\(v,legacy\)\{[\s\S]*?\n\}/m, 'fbcBedrag'),
    regel(src09, /^function fbcCanoniekBedrag\(invoer\)\{[\s\S]*?\n\}/m, 'fbcCanoniekBedrag'),
    regel(src09, /^function fbcVeldDef\(veldId\)\{[\s\S]*?\n\}/m, 'fbcVeldDef'),
    regel(src09, /^function fbcVeldLabel\(veldId\)\{.*\}$/m, 'fbcVeldLabel'),
  ];
  const log = { fetch: 0, saveCurrent: 0, reads: 0 };
  const data = { financieel_omzet3: '0', financieel_ebitda: '300000', financieel_forecast: '1.020.000' };
  const S = { screen: 'main', code, rol, traject: { status: 'actief' }, fase, data, _groepData: data,
    dataPerEntiteit: { ENT_A: { financieel_omzet3: '700000' } }, _actieveEntiteit: null, _entiteiten: [{ id: 'ENT_A', naam: 'Alfa BV' }] };
  // Teller op het lezen van S._mnaData: bewijst dat een niet-toegestane rol/fase niets verwerkt.
  let opslag = mnaData;
  Object.defineProperty(S, '_mnaData', { enumerable: true, configurable: true, get() { log.reads++; return opslag; }, set(v) { opslag = v; } });
  const FASES = [{ id: 'financieel', dataFields: [{ id: 'omzet3', label: 'Omzet jaar 3' }, { id: 'ebitda', label: 'EBITDA' }, { id: 'forecast', label: 'Omzetforecast' }] }, { id: 'juridisch', dataFields: [] }];
  const ctx = {
    console, S, FASES,
    fetch: () => { log.fetch++; return Promise.reject(new Error('test: geen netwerk verwacht')); },
    XMLHttpRequest: function () { log.fetch++; throw new Error('test: geen XHR verwacht'); },
    saveCurrent: () => { log.saveCurrent++; },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(delen.join('\n') + '\n' + src11, ctx, { filename: 'mna/11-groepsbeeld.js' });
  const render = (faseId) => ctx.renderGroepsbeeld(faseId === undefined ? (FASES[ctx.S.fase] ? FASES[ctx.S.fase].id : '') : faseId);
  return { ctx, S, log, render };
}
const standaard = (asString = true) => [rij('financieel', null, groepsDj(), asString)];

// ── Opslagpad (12 okt 2026): echte mna/02-opslagfuncties met uitgestelde synthetische /mna/save ──────
// fetch geeft een promise terug die de test zelf afrondt (succes, serverfout, netwerkfout, kapotte JSON),
// zodat volgorde, sessiewissel en dirty invoer exact te sturen zijn. Geen echte API, geen browser.
const OPSLAG_FASES = () => [
  { id: 'financieel', items: [], redflags: [], dataFields: [{ id: 'omzet3', label: 'Omzet jaar 3' }, { id: 'ebitda', label: 'EBITDA' }, { id: 'forecast', label: 'Omzetforecast' }, { id: 'aantalPartners', label: 'Partners', groepsniveau: true }] },
  { id: 'juridisch', items: [], redflags: [], dataFields: [{ id: 'kvk', label: 'KvK' }] },
];
const nieuwDj = (w) => groepsDj({ omzet3: veld({ bruto_berekend: w, bruto_status: 'COMPLEET_VOOR_SELECTIE', invoer: { status: 'COMPLEET_VOOR_SELECTIE', met_waarde: 2, ontbrekend: 0, onbruikbaar: 0, ambigu: 0, onleesbaar: 0 } }) });
const okAntwoord = (gw, extra = {}) => ({ ok: true, fase_id: 'financieel', velden: 3, groepswaarden: gw, ...extra });
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
function maakS(code, rol, mnaData, entiteit = 'ENT_A') {
  const groep = { financieel_omzet3: '0', financieel_ebitda: '300000', financieel_aantalPartners: '2' };
  const ent = { financieel_omzet3: '700000' };
  return { screen: 'main', code, rol, traject: { status: 'actief' }, fase: 0, data: entiteit ? ent : groep, _groepData: groep,
    dataPerEntiteit: { ENT_A: ent }, _actieveEntiteit: entiteit, _entiteiten: [{ id: 'ENT_A', naam: 'Alfa BV' }],
    notities: {}, checked: {}, _userEdited: {}, _docSource: {}, _docFragment: {}, _mnaData: mnaData };
}
function laadOpslag(root, { rol = 'verkoper', code = 'VSYN0001', entiteit = 'ENT_A', mnaData = standaard() } = {}) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src09 = lees(root, 'mna/09-financiele-broncontrole.js');
  const src11 = lees(root, 'mna/11-groepsbeeld.js');
  const delen = [
    regel(src02, /^function ge\(id\)\{.*\}$/m, 'ge'),
    regel(src02, /^function isVerkoper\(\)\{.*\}$/m, 'isVerkoper'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    // #73: hulpblok (documentsoort, prognoseveld) dat getDataForFase/veldBron/de vullogica gebruiken.
    regel(src02, /^var DOC_SOORT_LABEL = [\s\S]*?(?=^function _autoFillFromExtractionBody\()/m, '#73-hulpblok'),
    regel(src02, /^function veldBron\(key\)\{[\s\S]*?\n\}/m, 'veldBron'),
    regel(src02, /^function getDataForFase\(id\)\{[\s\S]*?\n\}/m, 'getDataForFase'), regel(src02, /^function opslagRij\([\s\S]*?(?=^function getDataForFase\(id\))/m, 'N-154-basis'),
    regel(src02, /^function getChecklistForFase\(id\)\{.*\}$/m, 'getChecklistForFase'),
    regel(src02, /^function saveGroepsniveauVelden\(faseId\)\{[\s\S]*?\n\}/m, 'saveGroepsniveauVelden'),
    regel(src02, /^function saveCurrent\(cb\)\{[\s\S]*?\n\}/m, 'saveCurrent'),
    regel(src02, /^function gbOpslagStart\(code,faseId,entiteitId\)\{[\s\S]*?\n\}/m, 'gbOpslagStart'),
    regel(src02, /^function gbOpslagKlaar\(tk,d\)\{[\s\S]*?\n\}/m, 'gbOpslagKlaar'),
    regel(src02, /^function _verstuurGeplandeSave\(pending\)\{[\s\S]*?\n\}/m, '_verstuurGeplandeSave'),
    regel(src02, /^function saveAll\(opts\)\{[\s\S]*?\n\}/m, 'saveAll'),
    regel(src02, /^function saveEntiteitData\(entiteitId, faseIds\)\{[\s\S]*?\n\}/m, 'saveEntiteitData'),
    regel(src09, /^function fbcEsc\(v\)\{[\s\S]*?\n\}/m, 'fbcEsc'),
    regel(src09, /^function fbcOnbekend\(tekst\)\{.*\}$/m, 'fbcOnbekend'),
    regel(src09, /^function fbcBedrag\(v,legacy\)\{[\s\S]*?\n\}/m, 'fbcBedrag'),
    regel(src09, /^function fbcCanoniekBedrag\(invoer\)\{[\s\S]*?\n\}/m, 'fbcCanoniekBedrag'),
    regel(src09, /^function fbcVeldDef\(veldId\)\{[\s\S]*?\n\}/m, 'fbcVeldDef'),
    regel(src09, /^function fbcVeldLabel\(veldId\)\{.*\}$/m, 'fbcVeldLabel'),
  ];
  const log = { req: [], renderApp: 0, paneel: 0, beacon: 0 };
  const dom = {};
  const invoer = (id, value) => (dom[id] = { id, value, selectionStart: value.length, selectionEnd: value.length });
  // Het paneel als los DOM-element: outerHTML vervangen is de enige toegestane UI-mutatie na een antwoord.
  function paneel(html) {
    const el = { id: 'gb-panel' };
    Object.defineProperty(el, 'outerHTML', { get: () => html, set: (v) => { log.paneel++; if (v.includes('id="gb-panel"')) dom['gb-panel'] = paneel(v); else delete dom['gb-panel']; } });
    return el;
  }
  const timers = [];
  const ctx = {
    console, FASES: OPSLAG_FASES(), WORKER: 'https://synthetisch.invalid', Blob: function () {},
    navigator: { sendBeacon: () => { log.beacon++; return true; } },
    document: { getElementById: (id) => dom[id] || null, activeElement: null },
    fetch: (url, opt) => new Promise((resolve, reject) => {
      log.req.push({ url, body: JSON.parse(opt.body),
        antwoord: (d) => resolve({ json: () => Promise.resolve(d) }),
        kapotteJson: () => resolve({ json: () => Promise.reject(new SyntaxError('synthetisch: geen JSON')) }),
        netwerkfout: () => reject(new Error('synthetisch: netwerkfout')) });
    }),
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: (id) => { if (id) timers[id - 1] = null; },
    markDirty() {}, showAlert() {}, showSaveIndicator() {}, renderApp() { log.renderApp++; }, _dataHash: () => '', _lastSavedHash: '',
  };
  ctx.window = ctx;
  ctx.S = maakS(code, rol, mnaData, entiteit);
  vm.createContext(ctx);
  vm.runInContext(delen.join('\n') + '\n' + src11, ctx, { filename: 'mna/02+11#opslag' });
  const toon = () => { dom['gb-panel'] = paneel(ctx.renderGroepsbeeld('financieel')); };
  const html = () => (dom['gb-panel'] ? dom['gb-panel'].outerHTML : '');
  const timersAf = () => { for (let i = 0; i < timers.length; i++) { const f = timers[i]; if (f) { timers[i] = null; f(); } } };
  return { ctx, log, dom, invoer, toon, html, timersAf };
}
const tel = (html, re) => (html.match(re) || []).length;
const tekst = (html) => html.replace(/<[^>]*>/g, '');

// ── Partnerbediening (productpunt 18, 13 okt 2026): echte toonPartnersModal (mna/04) en
// renderOpening/bindOpeningScreen (mna/06) in node:vm met een minimale DOM en een synthetische
// /mna/partners volgens het backendcontract (bewerken = POST met id; ok:true+id, 404 bij onbekend id).
const kopie = (x) => JSON.parse(JSON.stringify(x));
const PT_ENT = () => [{ id: 'E1', naam: 'Alfa BV' }, { id: 'E2', naam: 'Beta BV' }];
const PT_RIJEN = () => [
  { id: 'P1', naam: 'Anna', leeftijd: '58', veranderbereidheid: 'hoog', opvolgingskandidaat: 'Bram', omzet_incl_team: '450000', winstaandeel_pct: '40', entiteit_ids: ['E1', 'E_WEG'], created_at: 1 },
  { id: 'P2', naam: 'Bas', leeftijd: '61', veranderbereidheid: '', opvolgingskandidaat: '', omzet_incl_team: '', winstaandeel_pct: '60', entiteit_ids: ['E2'], created_at: 2 },
];
const htmlDec = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
// Platte DOM: innerHTML maakt elk geopend element een kind van de eigenaar; genoeg voor id-/klasse-
// opzoeking, isConnected, dataset (gedecodeerd zoals de browser) en het ruwe HTML voor escapingbewijs.
function maakDom() {
  let body = null;
  class El {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase(); this.kids = []; this.parent = null; this._html = ''; this._text = ''; this.listeners = {};
      this.id = attrs.id || ''; this.className = attrs.class || ''; this.type = attrs.type || '';
      this.value = attrs.value !== undefined ? attrs.value : ''; this.checked = false; this.disabled = false; this.onclick = null;
      this.style = { display: /display:none/.test(attrs.style || '') ? 'none' : '' }; this.dataset = {};
      for (const k of Object.keys(attrs)) if (k.startsWith('data-')) this.dataset[k.slice(5)] = attrs[k];
    }
    get isConnected() { for (let e = this; e; e = e.parent) if (e === body) return true; return false; }
    leeg() { this.kids.forEach((k) => { k.parent = null; }); this.kids = []; }
    set innerHTML(h) {
      this.leeg(); this._html = String(h); this._text = htmlDec(this._html.replace(/<[^>]*>/g, ''));
      for (const m of this._html.matchAll(/<([a-zA-Z][\w-]*)([^>]*)>/g)) {
        const attrs = {};
        for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = htmlDec(a[2]);
        const el = new El(m[1], attrs); el.parent = this; this.kids.push(el);
      }
    }
    get innerHTML() { return this._html; }
    set textContent(t) { this.leeg(); this._text = String(t); this._html = this._text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    get textContent() { return this._text; }
    appendChild(c) { c.parent = this; this.kids.push(c); return c; }
    removeChild(c) { this.kids = this.kids.filter((k) => k !== c); c.parent = null; return c; }
    setAttribute() {}
    addEventListener(type, f) { this.listeners[type] = f; }
    alle() { return this.kids.flatMap((k) => [k, ...k.alle()]); }
    querySelectorAll(sel) {
      const m = sel.match(/^\.([\w-]+)(:checked)?$/); if (!m) throw new Error('test-DOM: selector niet ondersteund: ' + sel);
      return this.alle().filter((e) => e.className.split(/\s+/).includes(m[1]) && (!m[2] || e.checked));
    }
  }
  body = new El('body');
  const document = { body, createElement: (tag) => new El(tag), getElementById: (id) => body.alle().find((e) => e.id === id) || null, querySelectorAll: (sel) => body.querySelectorAll(sel) };
  return { document, body };
}
function laadPartnerUi(root, soort, { rol, maatschap = true, entiteiten = PT_ENT(), rijen = PT_RIJEN() } = {}) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const delen = [regel(src02, /^function ge\(id\)\{.*\}$/m, 'ge'), regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc')];
  if (soort === 'modal') delen.push(regel(lees(root, 'mna/04-begeleider-dashboard.js'), /^function toonPartnersModal\(app\)\{[\s\S]*?\n\}/m, 'toonPartnersModal'));
  else {
    const s06 = lees(root, 'mna/06-schermen.js');
    delen.push(regel(s06, /^function renderOpening\(\)\{[\s\S]*?\n\}/m, 'renderOpening'), regel(s06, /^function bindOpeningScreen\(\)\{[\s\S]*?\n\}/m, 'bindOpeningScreen'));
  }
  const store = { rijen: kopie(rijen), entiteiten: kopie(entiteiten), nr: 0 };
  const log = { req: [] };
  const dom = maakDom();
  const fetch = (url, opt = {}) => new Promise((resolve, reject) => {
    const r = { url, method: opt.method || 'GET', headers: opt.headers || {}, body: opt.body ? JSON.parse(opt.body) : null, open: true };
    const af = (f) => (...a) => { if (!r.open) throw new Error('test: dubbel antwoord'); r.open = false; f(...a); };
    const http = (status) => ({ ok: status >= 200 && status < 300, status });
    r.antwoord = af((d, status = 200) => resolve({ ...http(status), json: () => Promise.resolve(d) }));
    r.kapotteJson = af((status = 200) => resolve({ ...http(status), json: () => Promise.reject(new SyntaxError('synthetisch: geen JSON')) }));
    r.netwerkfout = af(() => reject(new Error('synthetisch: netwerkfout')));
    log.req.push(r);
  });
  // Synthetische server: zelfde contract als backend/worker/07-mna-groepen.js (alleen in het geheugen).
  function serveer(r) {
    const b = r.body || {};
    if (r.url.includes('/mna/entiteiten/')) {
      if (r.method === 'GET') return r.antwoord(kopie(store.entiteiten));
      store.entiteiten = store.entiteiten.filter((e) => e.id !== b.id);
      store.rijen.forEach((p) => { p.entiteit_ids = p.entiteit_ids.filter((id) => id !== b.id); });
      return r.antwoord({ ok: true });
    }
    if (r.method === 'GET') return r.antwoord(kopie(store.rijen));
    if (b.actie === 'verwijderen') { store.rijen = store.rijen.filter((p) => p.id !== b.id); return r.antwoord({ ok: true }); }
    const velden = { naam: b.naam, leeftijd: b.leeftijd, veranderbereidheid: b.veranderbereidheid, opvolgingskandidaat: b.opvolgingskandidaat, omzet_incl_team: b.omzet_incl_team, winstaandeel_pct: b.winstaandeel_pct, entiteit_ids: b.entiteit_ids };
    if (b.id) {
      const p = store.rijen.find((x) => x.id === b.id);
      if (!p) return r.antwoord({ error: 'Partner niet gevonden' }, 404);
      Object.assign(p, velden); return r.antwoord({ ok: true, id: b.id, naam: b.naam });
    }
    const id = 'PN' + (++store.nr); store.rijen.push({ id, ...velden, created_at: 100 + store.nr });
    return r.antwoord({ ok: true, id, naam: b.naam });
  }
  const server = async () => { for (let i = 0; i < 6; i++) { const open = log.req.filter((r) => r.open); if (!open.length) break; open.forEach(serveer); await flush(); } };
  const S = soort === 'modal'
    ? { code: 'TSYN0001', rol: rol || 'tussenpersoon', _bgKey: 'synthetisch-sleutel', _entiteiten: kopie(entiteiten), data: {} }
    : { code: 'VSYN0001', rol: rol || 'verkoper', traject: { kantoor_naam: 'Synthetisch kantoor' } };
  const ctx = { console, S, WORKER: 'https://synthetisch.invalid', document: dom.document, fetch, BRAND: { platform: 'KVM' },
    brandMerkHtml: () => '', versieLabel: () => '', getPartnerTerm: () => ({ enkel: 'partner', meer: 'partners', titel: 'Partners' }), isMaatschap: () => maatschap };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(delen.join('\n'), ctx, { filename: soort === 'modal' ? 'mna/04#partners' : 'mna/06#partners' });
  const p = soort === 'modal' ? 'pt-' : 'op-pt-';
  let app = null;
  const open = () => {
    if (soort === 'modal') return ctx.toonPartnersModal({});
    if (!app) { app = dom.document.createElement('div'); dom.body.appendChild(app); }
    app.innerHTML = ctx.renderOpening(); ctx.bindOpeningScreen();
  };
  // Scherm weg: modal sluiten via de bestaande Sluiten-knop, of het openingsscherm opnieuw tekenen.
  const sluit = () => { if (soort === 'modal') dom.document.getElementById('pt-sluiten').onclick(); else open(); };
  const el = (id) => dom.document.getElementById(p + id);
  const klik = (e) => { e.onclick.call(e); return flush(); };
  const bewerkKnoppen = () => dom.document.querySelectorAll('.' + p + 'bewerk');
  const bewerkKnop = (id) => bewerkKnoppen().find((b) => b.dataset.id === id);
  const chk = (id) => dom.document.querySelectorAll('.' + p + 'ent-chk').find((c) => c.value === id);
  const posts = () => log.req.filter((r) => r.method === 'POST');
  const gets = () => log.req.filter((r) => r.method === 'GET' && r.url.includes('/mna/partners/'));
  const formulier = () => ['naam', 'leeftijd', 'verandering', 'opvolging', 'omzet', 'winstaandeel'].map((k) => (el(k) ? el(k).value : null));
  return { ctx, dom, store, log, server, open, sluit, el, klik, bewerkKnoppen, bewerkKnop, chk, posts, gets, formulier, p };
}

export async function draaiGroupConsolidationUiChecks(root = process.cwd()) {
  const res = [];
  const check = (ok, msg) => res.push({ ok: !!ok, msg });
  // Ruwe markup of een uitbrekend attribuut; geëscapete tekst (&lt;img …) is juist het bewijs van escaping.
  const geenXss = (html) => !/<img|<script|<b>|<i>|onerror=alert\(\d\)>|"><img/i.test(html);
  // Nooit een officiële/bewezen claim over een getal.
  const geenOfficieel = (html) => !/officiële consolidatie: (ja|vastgesteld)|officieel geconsolideerd|bewezen geconsolideerd|juridische consolidatiekring: <strong>bewezen/i.test(html);

  // 1. Bronbestanden: laadvolgorde, aanroep in fase Financieel, bestaande panelen behouden; geen netwerk/opslag/AI/mutatie.
  {
    const html = lees(root, 'mna.html'); const s06 = lees(root, 'mna/06-schermen.js'); const s11 = lees(root, 'mna/11-groepsbeeld.js');
    const i10 = html.indexOf('<script src="mna/10-juridische-broncontrole.js"></script>'), i11 = html.indexOf('<script src="mna/11-groepsbeeld.js"></script>'), i06 = html.indexOf('<script src="mna/06-schermen.js"></script>');
    check(i10 > 0 && i11 > i10 && i06 > i11, 'mna.html laadt mna/11 als gewone script na mna/10 en vóór mna/06');
    check(s06.includes('+renderGroepsbeeld(f.id)') && s06.includes('+renderFinancieleBroncontrole(f.id)') && s06.includes('+renderJuridischeBroncontrole(f.id)'), 'mna/06 renderMain toont het groepsbeeldpaneel en behoudt financiële en juridische panelen');
    check(s06.includes("var consolCheckRaw=S._groepData[f.id+'_consolidatieCheck'];"), 'bestaande consolidatieCheck-melding in mna/06 ongewijzigd aanwezig');
    const code = s11.replace(/^\s*\/\/.*$/gm, '');
    check(!/fetch|XMLHttpRequest|WORKER|saveCurrent|\/mna\/|consolideer|anthropic|ai-proxy|genereer|localStorage|sessionStorage|loadDataFromDB|sendBeacon/i.test(code), 'mna/11 doet geen netwerk-, opslag-, consolidatie-, AI- of laadaanroep');
    check(!/\bS\.[A-Za-z_$][\w$]*(\[[^\]]*\])?\s*(=(?!=)|\+\+|--|\+=|-=)|\.(push|splice|pop|shift|unshift|sort|reverse)\(|delete\s/.test(code.replace(/\.slice\(/g, '')), 'mna/11 wijst niets toe aan S en muteert geen arrays (alleen-lezen)');
    check(!/\bS\.data\b|S\._groepData|S\.dataPerEntiteit/.test(code), 'mna/11 leest S.data/_groepData/dataPerEntiteit niet (alleen S._mnaData en S._gbBevestigd)');
    check(!/<a\s|href=|<button|<input|<select|<textarea|onclick=/i.test(code), 'mna/11 bevat geen knop, invoer, actie of (fictieve) documentlink');
  }

  // 2. Koper, meekijker, onbekende en lege rol: geen paneel en S._mnaData wordt niet eens gelezen.
  for (const rol of ['koper', 'meekijker', 'admin', '']) {
    const t = laad(root, { rol, mnaData: standaard() });
    const html = t.render('financieel');
    check(html === '' && t.log.reads === 0 && t.log.fetch === 0, 'rol "' + (rol || 'leeg') + '": geen paneel, geen verwerking, geen request');
  }
  {
    const t = laad(root, { code: '', mnaData: standaard() });
    check(t.render('financieel') === '' && t.log.reads === 0, 'zonder trajectcode: geen paneel en geen verwerking');
  }

  // 3. Alleen fase Financieel.
  for (const faseId of ['juridisch', 'operationeel', '', undefined]) {
    const t = laad(root, { mnaData: standaard() });
    const html = t.ctx.renderGroepsbeeld(faseId);
    check(html === '' && t.log.reads === 0, 'fase "' + String(faseId) + '": geen paneel en geen verwerking');
  }

  // 4. Verkoper en begeleider zien het paneel; bruto versus aangeleverde echte 0.
  for (const [rol, code] of [['verkoper', 'VSYN0001'], ['tussenpersoon', 'TSYN0001']]) {
    const t = laad(root, { rol, code, mnaData: standaard() });
    const html = t.render();
    check(html.includes('id="gb-panel"') && tel(html, /class="gb-veld"/g) === 6, rol + ': paneel met 6 velden in fase Financieel');
    check(t.log.fetch === 0 && t.log.saveCurrent === 0, rol + ': geen netwerk en geen saveCurrent');
  }
  const t0 = laad(root, { mnaData: standaard() });
  const h0 = t0.render();
  const blok = (veldLabel) => { const i = h0.indexOf('<strong style="color:var(--head)">' + veldLabel + '</strong>'); return i < 0 ? '' : h0.slice(i, h0.indexOf('class="gb-veld"', i) > 0 ? h0.indexOf('class="gb-veld"', i) : undefined); };
  {
    const b = blok('Omzet jaar 3');
    check(/Bruto berekend \(geen officiële consolidatie\): 1\.200\.000/.test(b), 'omzet: bruto berekend 1.200.000 expliciet als geen officiële consolidatie');
    check(b.includes('Aangeleverd: aangeleverd, niet geverifieerd · gelezen: 0 · oorspronkelijke invoer: <code>0</code> · officiële consolidatie: niet vastgesteld'), 'omzet: aangeleverde echte 0 getoond als 0, niet geverifieerd, oorspronkelijke invoer behouden');
    check(b.includes('Gebruikte waarde in de groepsrij: aangeleverde groepswaarde'), 'omzet: gebruikte waarde = aangeleverd');
    check(b.includes('met waarde 2 · ontbrekend 0 · onbruikbaar 0 · ambigu 0 · onleesbare entiteitrijen 0'), 'omzet: invoeraantallen inclusief echte nullen');
    check(/aangeleverd − bruto: -1\.200\.000 · onverklaard: -1\.200\.000 · 100%/.test(b) && b.includes('boven signaleringsdrempel') && b.includes('geen bewijs van een fout'), 'omzet: verschil/onverklaard/% boven drempel als signaal, geen foutbewijs');
  }
  {
    const b = blok('Omzetforecast');
    check(b.includes('<strong>prognose</strong> (niet bij realisatie optellen)') && b.includes('boekjaar onbekend') && b.includes('periodestatus onbekend'), 'forecast: PROGNOSE, boekjaar onbekend en periodestatus onbekend apart getoond');
    check(b.includes('binnen signaleringsdrempel — geen bewijs van juistheid') && b.includes('oorspronkelijke invoer: <code>1.020.000</code>'), 'forecast: binnen drempel is geen bewijs van juistheid; oorspronkelijke tekst behouden');
  }
  {
    const b = blok('EBITDA');
    check(b.includes('onvolledig: niet alle geselecteerde entiteiten') && b.includes('met waarde 1 · ontbrekend 1') && b.includes('Ontbreekt: entiteitwaarden ontbreken, eliminaties onbekend, periode onbekend, consolidatiekring niet bewezen'), 'ebitda: ONVOLLEDIG met aantallen en ontbrekend-lijst gescheiden van periode');
    check(b.includes('geen aangeleverde groepswaarde') && b.includes('bruto berekend groepsbeeld'), 'ebitda: geen aangeleverde waarde; gebruikt = bruto berekend groepsbeeld');
  }
  {
    const b = blok('debiteuren');
    check(b.includes('Bruto berekend (geen officiële consolidatie): <em style="color:var(--muted)">niet berekend</em>') && b.includes('onbruikbaar: minstens één entiteitwaarde') && b.includes('onbruikbaar 1 · ambigu 1'), 'debiteuren: ONBRUIKBAAR/ambigu zonder verzonnen som');
    check(b.includes('Gebruikte waarde in de groepsrij: <em style="color:var(--muted)">geen</em>'), 'debiteuren: gebruikte waarde null → geen');
  }
  {
    const b = blok('wip');
    check(/Bruto berekend \(geen officiële consolidatie\): 0 · /.test(b), 'wip: echte bruto 0 getoond als 0, niet als leeg');
  }
  {
    const b = blok('ebitdaMarge');
    check(b.includes('geen invoertelling (afgeleid veld)') && b.includes('aangeleverd maar ambigu') && b.includes('gelezen: <em style="color:var(--muted)">geen getal</em>') && b.includes('<code>1,234</code>'), 'ebitdaMarge: afgeleid zonder telling, aangeleverd ambigu niet als getal, originele tekst behouden');
  }
  check(tel(h0, /Eliminaties: <em style="color:var\(--muted\)">onbekend — niet 0<\/em>/g) === 6 && tel(h0, /Bekende correcties: <em style="color:var\(--muted\)">onbekend — niet 0<\/em>/g) === 6 && !/Eliminaties: 0/.test(h0), 'eliminaties en correcties per veld: onbekend — nooit 0');
  check(tel(h0, /Gereconcilieerd bedrag: <em style="color:var\(--muted\)">geen<\/em> · reconciliatie: niet mogelijk/g) === 6, 'gereconcilieerd bedrag null en reconciliatie niet mogelijk — niets verzonnen');
  check(h0.includes('BV: alle entiteiten behalve de holding') && h0.includes('geselecteerde entiteiten 2 · onleesbaar 0') && h0.includes('Juridische consolidatiekring: <strong>niet bewezen</strong> — de rekenselectie is geen juridische selectie'), 'rekenselectie BV_ZONDER_HOLDING met aantallen; juridische kring niet bewezen');
  check(h0.includes('geen officiële consolidatie') && h0.includes('niet geverifieerd') && geenOfficieel(h0), 'paneel noemt bruto nooit officieel en aangeleverd nooit geverifieerd');
  check(h0.includes('Eliminaties (groep): <em style="color:var(--muted)">onbekend — niet 0</em>') && h0.includes('Signaleringsdrempel verschil: 5%'), 'groepseliminaties onbekend (niet 0) en drempel 5% getoond');
  {
    const t = laad(root, { mnaData: [rij('financieel', undefined, groepsDj(STANDAARD_VELDEN(), { maatschap: true, geselecteerd: 3, onleesbaar: 1 }), false)] });
    const h = t.render();
    check(h.includes('Maatschap: alle entiteiten') && h.includes('geselecteerde entiteiten 3 · onleesbaar 1') && tel(h, /class="gb-veld"/g) === 6, 'MAATSCHAP_ALLE_ENTITEITEN met aantallen; data_json als object en entiteit_id ontbrekend werkt');
  }

  // 5. Geen/ontbrekende/malformed/legacy metadata: expliciet geen informatie, geen crash, geen claim.
  const geenInfo = [
    ['S._mnaData ontbreekt', undefined, 'geen groepsrij'],
    ['S._mnaData geen array', { fase_id: 'financieel' }, 'geen groepsrij'],
    ['alleen entiteitrij', [rij('financieel', 'ENT_A', groepsDj())], 'geen groepsrij'],
    ['meerdere groepsrijen', [rij('financieel', null, groepsDj()), rij('financieel', undefined, groepsDj())], 'meerdere groepsrijen'],
    ['malformed JSON', [{ fase_id: 'financieel', entiteit_id: null, data_json: '{"omzet3":<script>' }], 'onleesbaar'],
    ['data_json array', [{ fase_id: 'financieel', entiteit_id: null, data_json: '[1,2]' }], 'onleesbaar'],
    ['data_json getal', [{ fase_id: 'financieel', entiteit_id: null, data_json: 42 }], 'onleesbaar'],
    ['legacy zonder metadata', [rij('financieel', null, { omzet3: { value: '1500000', label: 'Omzet' }, consolidatieCheck: { value: '[{"veld":"omzet3","documentWaarde":1500000,"somEntiteiten":1000000,"verschilPct":33}]', label: '' } })], 'geen groepsbeeld-metadata'],
    ['lege data_json', [{ fase_id: 'financieel', entiteit_id: null, data_json: '' }], 'geen groepsbeeld-metadata'],
    ['groepsbeeld geen object', [rij('financieel', null, { consolidatieCheck: { value: '[]', groepsbeeld: 'x' } })], 'geen groepsbeeld-metadata'],
    ['onbekende versie', [rij('financieel', null, { consolidatieCheck: { value: '[]', groepsbeeld: { ...overzicht(STANDAARD_VELDEN()), versie: 2 } } })], 'onbekende of onvolledige vorm'],
    ['velden ontbreken', [rij('financieel', null, { consolidatieCheck: { value: '[]', groepsbeeld: { ...overzicht({}), velden: [] } } })], 'onbekende of onvolledige vorm'],
    ['selectie ontbreekt', [rij('financieel', null, { consolidatieCheck: { value: '[]', groepsbeeld: { ...overzicht(STANDAARD_VELDEN()), selectie: null } } })], 'onbekende of onvolledige vorm'],
  ];
  for (const [naam, mnaData, reden] of geenInfo) {
    const t = laad(root, { mnaData });
    let h = null, fout = null;
    try { h = t.render(); } catch (e) { fout = e; }
    check(!fout && h.includes('id="gb-geen-info"') && h.includes('Nog geen brongebonden groepsbeeldinformatie beschikbaar') && h.includes(reden) && !h.includes('class="gb-veld"')
      && h.includes('niet als officiële consolidatie of als bruto berekend groepsbeeld aangemerkt') && !/1\.500\.000|1500000/.test(h) && geenOfficieel(h) && geenXss(h),
      naam + ': expliciet geen brongebonden informatie, geen crash, bestaand getal niet herbenoemd');
  }

  // 6. Alleen de juiste groepsrij en fase.
  {
    const ander = (w) => groepsDj({ omzet3: veld({ bruto_berekend: w, bruto_status: 'COMPLEET_VOOR_SELECTIE' }) });
    const t = laad(root, { mnaData: [rij('financieel', 'ENT_A', ander(111111)), rij('operationeel', null, ander(222222)), null, 'x', rij('financieel', null, ander(333333)), rij('financieel', '', ander(444444))] });
    const h = t.render();
    check(h.includes('333.333') && !h.includes('111.111') && !h.includes('222.222') && !h.includes('444.444') && tel(h, /class="gb-veld"/g) === 1, 'alleen fase_id financieel met entiteit_id null/ontbrekend; entiteit-, andere-fase- en ongeldige rijen genegeerd');
  }

  // 7. HTML-injectie in servertekst, veldnamen, statussen en oorspronkelijke waarde.
  {
    const vi = STANDAARD_VELDEN();
    vi['<img src=x onerror=alert(1)>'] = veld({ regel: '<script>alert(2)</script>', bruto_berekend: 5, bruto_status: '<b>x</b>',
      aangeleverd: { status: '"><img src=x onerror=alert(3)>', waarde: 'abc', officiele_consolidatie: true }, gebruikte_waarde: '<i>y</i>',
      bekende_correcties: { status: '<b>BEKEND</b>', bedrag: 7 }, reconciliatie_status: '<script>', periode: { soort: '<i>Q</i>', boekjaar: '<b>2025</b>', status: '<img>' }, ontbrekend: ['<i>code</i>', 7, null] });
    const dj = groepsDj(vi, { extra: { eliminaties: { status: 'ONBEKEND', bedrag: null, toelichting: '<img src=x onerror=alert(4)>' } } });
    dj['<img src=x onerror=alert(1)>'] = { value: '"><img src=x onerror=alert(5)>', label: '' };
    dj.consolidatieCheck.groepsbeeld.selectie.regel = '<script>alert(6)</script>';
    const t = laad(root, { mnaData: [rij('financieel', null, dj)] });
    let h = null, fout = null;
    try { h = t.render(); } catch (e) { fout = e; }
    check(!fout && geenXss(h) && h.includes('&lt;img src=x onerror=alert(1)&gt;') && h.includes('&quot;&gt;&lt;img src=x onerror=alert(5)&gt;'), 'alle servertekst geëscaped (veldnaam, statussen, toelichting, oorspronkelijke invoer, selectie)');
    check(h.includes('onbekende status: &lt;b&gt;x&lt;/b&gt;') && h.includes('onbekende status: &lt;i&gt;y&lt;/i&gt;') && h.includes('reconciliatie: <em style="color:var(--muted)">status onbekend</em>'), 'onverklaarde statussen als "onbekende status" getoond, niet geïnterpreteerd');
    const b = h.slice(h.indexOf('&lt;img src=x onerror=alert(1)&gt;'));
    check(b.includes('officiële consolidatie: niet vastgesteld') && b.includes('gelezen: <em style="color:var(--muted)">geen getal</em>') && geenOfficieel(h), 'officiele_consolidatie=true of tekstwaarde van server wordt nooit als officieel of als getal getoond');
    check(b.includes('&lt;b&gt;BEKEND&lt;/b&gt; · 7 <em style="color:var(--muted)">niet geverifieerd</em>'), 'een niet-ONBEKEND correctiebedrag wordt alleen als niet geverifieerd getoond');
  }

  // 8. Onverklaarde/inconsistente metadata: ONBEKEND met bedrag 0 blijft onbekend; ongeldige aantallen onbekend.
  {
    const t = laad(root, { mnaData: [rij('financieel', null, groepsDj({ omzet3: veld({ bruto_berekend: 'veel', bruto_status: 'NIEUWE_STATUS',
      invoer: { met_waarde: -1, ontbrekend: 1.5, onbruikbaar: '2', ambigu: null, onleesbaar: NaN },
      eliminaties: { status: 'ONBEKEND', bedrag: 0 }, bekende_correcties: null, verschil: 'x', verschil_pct: 3, boven_drempel: 'ja', gereconcilieerd_bedrag: '0', periode: null, ontbrekend: 'x' }) }, { geselecteerd: -2 }))] });
    const h = t.render();
    check(h.includes('Eliminaties: <em style="color:var(--muted)">onbekend — niet 0</em>') && h.includes('Bekende correcties: <em style="color:var(--muted)">onbekend — niet 0</em>'), 'ONBEKEND met bedrag 0 en ontbrekende correcties blijven onbekend — nooit 0');
    check(h.includes('niet berekend') && h.includes('onbekende status: NIEUWE_STATUS') && tel(tekst(h), /met waarde onbekend · ontbrekend onbekend · onbruikbaar onbekend · ambigu onbekend · onleesbare entiteitrijen onbekend/g) === 1, 'ongeldige bruto/status/aantallen worden onbekend, nooit geraden');
    check(h.includes('geen verschil berekenbaar') && !h.includes('signaleringsdrempel —') && h.includes('Gereconcilieerd bedrag: <em style="color:var(--muted)">geen</em>') && h.includes('periode onbekend') && h.includes('niets gemeld') && h.includes('geselecteerde entiteiten <em style="color:var(--muted)">onbekend</em>'), 'ongeldig verschil/reconciliatie/periode/ontbrekend/selectieaantal worden niet verzonnen');
  }

  // 9. Begrenzing: max 40 velden met melding; onleesbare veldmetadata zichtbaar geteld.
  {
    const vv = {};
    for (let i = 0; i < 55; i++) vv['veld' + i] = veld({ bruto_berekend: i, bruto_status: 'COMPLEET_VOOR_SELECTIE' });
    vv.kapot1 = 'x'; vv.kapot2 = null; vv.kapot3 = [1];
    const dj = groepsDj(vv);
    dj.consolidatieCheck.groepsbeeld.velden.veld0.ontbrekend = Array.from({ length: 15 }, (_, i) => 'code' + i);
    const t = laad(root, { mnaData: [rij('financieel', null, dj)] });
    const h = t.render();
    check(tel(h, /class="gb-veld"/g) === 40 && h.includes('id="gb-afgekapt"') && h.includes('40 van 55 velden getoond'), 'maximaal 40 velden met eerlijke afkapmelding');
    check(h.includes('id="gb-onbruikbaar"') && h.includes('3 veld(en) met onleesbare metadata niet getoond'), 'onleesbare veldmetadata zichtbaar geteld, niet stil weggelaten');
    check(h.includes('(+5 niet getoond)') && h.length < 100000, 'ontbrekend-lijst begrensd met melding; geen megadump');
  }

  // 10. Rol-, fase- en trajectwissel: geen cache, geen kruisdata.
  {
    const t = laad(root, { mnaData: standaard() });
    const a = t.render();
    t.ctx.S.rol = 'koper';
    const leesVoor = t.log.reads;
    const k = t.render();
    t.ctx.S.rol = 'meekijker';
    const m = t.render();
    t.ctx.S.rol = 'verkoper'; t.ctx.S.fase = 1;
    const j = t.render();
    check(a.includes('1.200.000') && k === '' && m === '' && j === '' && t.log.reads === leesVoor, 'wissel naar koper/meekijker/andere fase: direct geen paneel en geen verwerking');
    // Nieuw traject: S wordt bij inloggen volledig herbouwd (mna/06); de module houdt zelf niets vast.
    t.ctx.S = { screen: 'main', code: 'VSYN0002', rol: 'verkoper', fase: 0, data: {}, _groepData: {}, _mnaData: [rij('financieel', null, { omzet3: { value: '1200000' } })] };
    const b = t.render();
    check(b.includes('id="gb-geen-info"') && !b.includes('1.200.000') && !b.includes('gb-veld'), 'trajectwissel: geen groepsbeeld uit het vorige traject (geen cache)');
    t.ctx.S._mnaData = standaard(); t.ctx.S.rol = 'tussenpersoon';
    check(t.render().includes('1.200.000'), 'na wissel naar begeleider met eigen data: actuele rij van dit traject getoond');
    const globaal = Object.keys(t.ctx).filter((k2) => /^(GB|gb)/.test(k2) && !/^(GB_|gb[A-Z])/.test(k2));
    check(t.ctx.GB === undefined && t.ctx.GB_CACHE === undefined && globaal.length === 0, 'mna/11 heeft geen moduletoestand of cache');
  }

  // 11. Formulier- en rekenwaarden en serverdata byte-gelijk; geen netwerk/save/AI.
  {
    const mnaData = standaard();
    const t = laad(root, { mnaData });
    const voor = JSON.stringify({ S: t.S, mna: mnaData });
    for (let i = 0; i < 5; i++) { t.render(); t.render('juridisch'); }
    t.ctx.S.rol = 'tussenpersoon'; t.render(); t.ctx.S.rol = 'verkoper';
    const na = JSON.stringify({ S: t.S, mna: mnaData });
    check(voor === na && t.S.data === t.S._groepData && t.S.data.financieel_omzet3 === '0' && t.S.dataPerEntiteit.ENT_A.financieel_omzet3 === '700000', 'S.data/_groepData/dataPerEntiteit/S._mnaData byte-gelijk na herhaald renderen');
    check(t.log.fetch === 0 && t.log.saveCurrent === 0, 'geen netwerk, geen XHR en geen saveCurrent tijdens alle renders');
    const mo = [rij('financieel', null, groepsDj(), false)];
    const t2 = laad(root, { mnaData: mo });
    const voor2 = JSON.stringify(mo);
    t2.render();
    check(JSON.stringify(mo) === voor2 && mo[0].data_json.omzet3.value === '0' && typeof mo[0].data_json === 'object', 'data_json-object (niet-string) wordt niet gemuteerd; originele waarde "0" behouden');
  }

  // 12. Na financiële opslag (12 okt 2026): echte saveCurrent/_verstuurGeplandeSave, saveAll,
  // saveEntiteitData en saveGroepsniveauVelden met uitgestelde synthetische /mna/save-antwoorden.
  const stand = (h) => { const m = h.match(/data-stand="([A-Z]+)"/); return m ? m[1] : null; };
  {
    const s02 = lees(root, 'mna/02-state-opslag-documenten.js'); const s11 = lees(root, 'mna/11-groepsbeeld.js').replace(/^\s*\/\/.*$/gm, '');
    const helpers = regel(s02, /^function gbOpslagStart\(code,faseId,entiteitId\)\{[\s\S]*?\n\}/m, 'gbOpslagStart') + regel(s02, /^function gbOpslagKlaar\(tk,d\)\{[\s\S]*?\n\}/m, 'gbOpslagKlaar');
    check(!/fetch|renderApp|_mnaData|_groepData|S\.data\b|\/mna\/|setTimeout|localStorage|sessionStorage|innerHTML/.test(helpers), 'mna/02-groepsbeeldhelpers: geen request, geen renderApp, geen opslag en geen wijziging van formulier- of laaddata');
    const paden = ['_verstuurGeplandeSave\\(pending\\)', 'saveAll\\(opts\\)', 'saveEntiteitData\\(entiteitId, faseIds\\)', 'saveGroepsniveauVelden\\(faseId\\)'];
    check(paden.every((p) => { const f = regel(s02, new RegExp('^function ' + p + '\\{[\\s\\S]*?\\n\\}', 'm'), p); return f.includes('var gbTk=gbOpslagStart(') && f.includes('gbOpslagKlaar(gbTk,d)') && f.includes('.catch(function(){gbOpslagKlaar(gbTk,null);})'); }), 'alle vier financiële opslagpaden in mna/02 geven succes én fout door aan gbOpslagKlaar');
    check(!/renderApp|outerHTML|innerHTML/.test(s11), 'mna/11 blijft een renderer: geen renderApp en geen DOM-vervanging');
  }
  {
    // Succes via saveCurrent (entiteit) → alleen het paneel vervangen; dirty invoer, focus en caret intact.
    const t = laadOpslag(root); const S = t.ctx.S;
    t.toon();
    t.invoer('df_omzet3', '700000'); const focus = t.invoer('df_ebitda', '4'); t.ctx.document.activeElement = focus;
    t.ctx.saveCurrent(); t.timersAf();
    check(t.log.req.length === 1 && t.log.req[0].url === 'https://synthetisch.invalid/mna/save' && t.log.req[0].body.entiteit_id === 'ENT_A' && t.log.req[0].body.fase_id === 'financieel', 'saveCurrent: één bestaande /mna/save voor de entiteit');
    focus.value = '45678'; focus.selectionStart = 3; focus.selectionEnd = 3; S._userEdited.financieel_ebitda = true;
    const mnaVoor = JSON.stringify(S._mnaData);
    check(t.html().includes('1.200.000') && stand(t.html()) === 'GELADEN' && t.log.paneel === 0, 'antwoord nog onderweg: laadstand ongewijzigd, niets vervangen');
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    const h = t.html();
    check(h.includes('1.500.000') && !h.includes('1.200.000') && stand(h) === 'BEVESTIGD' && h.includes('Bijgewerkt met de groepsrij die de server') && t.log.paneel === 1, 'succes: paneel toont de door de server teruggemelde groepsrij, zonder herladen');
    check(t.log.renderApp === 0 && focus.value === '45678' && focus.selectionStart === 3 && focus.selectionEnd === 3 && t.ctx.document.activeElement === focus && S._userEdited.financieel_ebitda === true && t.dom.df_omzet3.value === '700000', 'succes: geen renderApp; onopgeslagen invoer, focus en caret blijven staan');
    check(JSON.stringify(S._mnaData) === mnaVoor && S.dataPerEntiteit.ENT_A.financieel_ebitda === '4', 'succes: S._mnaData (laaddata) en entiteitinvoer ongewijzigd; geen eigen som');
    check(t.log.req.length === 1 && geenOfficieel(h) && h.includes('geen officiële consolidatie'), 'succes: geen extra leesverzoek en nog steeds geen officiële consolidatie');
    // Daarna een mislukte opslag: laatst bevestigde stand blijft zichtbaar met eerlijke status.
    t.ctx.saveEntiteitData('ENT_A', ['financieel']);
    t.log.req[1].antwoord({ error: 'Opslaan mislukt (synthetisch)' }); await flush();
    const h2 = t.html();
    check(h2.includes('1.500.000') && stand(h2) === 'ONBEVESTIGD' && h2.includes('mogelijk niet actueel') && !h2.includes('Bijgewerkt met'), 'fout na succes: laatst bevestigde stand blijft, met eerlijke status (niet actueel geclaimd)');
  }
  {
    // Fout/malformed zonder eerdere bevestiging: laadstand blijft, nooit vals actueel.
    const fouten = [
      ['serverfout', (r) => r.antwoord({ error: 'x' })],
      ['netwerkfout', (r) => r.netwerkfout()],
      ['geen JSON', (r) => r.kapotteJson()],
      ['leeg antwoord', (r) => r.antwoord(null)],
      ['groepswaarden null', (r) => r.antwoord(okAntwoord(null))],
      ['groepswaarden array', (r) => r.antwoord(okAntwoord([1, 2]))],
      ['groepswaarden tekst', (r) => r.antwoord(okAntwoord('{"x":1}'))],
      ['andere fase', (r) => r.antwoord(okAntwoord(nieuwDj(9000), { fase_id: 'juridisch' }))],
      ['ok ontbreekt', (r) => r.antwoord({ groepswaarden: nieuwDj(9000) })],
    ];
    for (const [naam, af] of fouten) {
      const t = laadOpslag(root); t.toon();
      t.invoer('df_omzet3', '700000'); t.ctx.saveCurrent(); t.timersAf();
      af(t.log.req[0]); await flush();
      const h = t.html();
      check(h.includes('1.200.000') && !h.includes('9.000') && stand(h) === 'ONBEVESTIGD' && t.ctx.S._gbBevestigd.data_json === null && t.log.renderApp === 0, naam + ': laadstand blijft, status niet bevestigd, geen renderApp');
    }
  }
  {
    // Uit volgorde: een ouder antwoord overschrijft nooit een nieuwere stand.
    const t = laadOpslag(root); t.toon();
    t.ctx.saveEntiteitData('ENT_A', ['financieel']); t.ctx.saveEntiteitData('ENT_A', ['financieel']);
    t.log.req[1].antwoord(okAntwoord(nieuwDj(2000000))); await flush();
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(t.html().includes('2.000.000') && !t.html().includes('1.500.000') && stand(t.html()) === 'BEVESTIGD', 'uit volgorde: ouder succesantwoord overschrijft de nieuwere stand niet');
    const t2 = laadOpslag(root); t2.toon();
    t2.ctx.saveEntiteitData('ENT_A', ['financieel']); t2.ctx.saveEntiteitData('ENT_A', ['financieel']);
    t2.log.req[1].antwoord(okAntwoord(nieuwDj(2000000))); await flush();
    t2.log.req[0].netwerkfout(); await flush();
    check(t2.html().includes('2.000.000') && stand(t2.html()) === 'BEVESTIGD', 'uit volgorde: late fout van een ouder verzoek maakt een nieuwere bevestiging niet onbevestigd');
    const t3 = laadOpslag(root); t3.toon();
    t3.ctx.saveEntiteitData('ENT_A', ['financieel']); t3.ctx.saveEntiteitData('ENT_A', ['financieel']);
    t3.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    t3.log.req[1].antwoord(okAntwoord(nieuwDj(2000000))); await flush();
    check(t3.html().includes('2.000.000') && t3.ctx.S._gbBevestigd.volgnr === 2, 'in volgorde: het laatste antwoord wint');
  }
  {
    // Sessiereset met dezelfde code, andere code, rolwissel en uitloggen: oud antwoord raakt niets.
    for (const [naam, wissel] of [
      ['nieuwe sessie zelfde code/rol', () => maakS('VSYN0001', 'verkoper', [rij('financieel', null, nieuwDj(333000))])],
      ['nieuwe sessie andere code', () => maakS('VSYN0002', 'verkoper', [rij('financieel', null, nieuwDj(333000))])],
      ['nieuwe sessie begeleider', () => maakS('TSYN0001', 'tussenpersoon', [rij('financieel', null, nieuwDj(333000))], null)],
    ]) {
      const t = laadOpslag(root); t.toon();
      const oudS = t.ctx.S;
      t.ctx.saveEntiteitData('ENT_A', ['financieel']);
      t.ctx.S = wissel(); t.toon();
      t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
      check(t.ctx.S._gbBevestigd === undefined && oudS._gbBevestigd === undefined && t.html().includes('333.000') && !t.html().includes('1.500.000') && stand(t.html()) === 'GELADEN' && t.log.paneel === 0, naam + ': laat antwoord raakt de nieuwe sessie en het paneel niet');
    }
    {
      const t = laadOpslag(root); t.toon();
      t.ctx.saveEntiteitData('ENT_A', ['financieel']);
      t.ctx.S.rol = 'tussenpersoon';
      t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
      check(t.ctx.S._gbBevestigd === undefined && t.log.paneel === 0, 'rolwissel binnen dezelfde staat: antwoord genegeerd');
      t.ctx.S = { screen: 'login', code: '', rol: '', fase: 0, data: {} };
      check(t.ctx.gbOpslagStart('', 'financieel', 'ENT_A') === null && t.ctx.gbOpslagStart('VSYN0001', 'financieel', 'ENT_A') === null && t.ctx.S._gbVolgnr === undefined, 'na uitloggen of bij een andere code geen groepsbeeldvolgnummer');
    }
    {
      const t = laadOpslag(root);
      t.ctx.S._gbBevestigd = { code: 'ANDERS01', volgnr: 1, status: 'BEVESTIGD', data_json: nieuwDj(777000) };
      t.toon();
      check(t.html().includes('1.200.000') && !t.html().includes('777.000') && stand(t.html()) === 'GELADEN', 'mna/11 negeert een bevestigde stand met een andere trajectcode');
    }
  }
  {
    // Groepsrij-save: server meldt geen groepsbeeld terug → eigen invoer nooit als servermetadata.
    const t = laadOpslag(root, { entiteit: null }); t.toon();
    t.invoer('df_omzet3', '999999'); t.ctx.saveCurrent(); t.timersAf();
    check(t.log.req.length === 1 && t.log.req[0].body.entiteit_id === undefined, 'groepsrij-save via saveCurrent');
    t.log.req[0].antwoord(okAntwoord(null)); await flush();
    const h = t.html();
    check(stand(h) === 'VEROUDERD' && h.includes('1.200.000') && !h.includes('999.999') && t.ctx.S._gbBevestigd.data_json === null && h.includes('mogelijk niet meer actueel'), 'groepsrij-save: oude stand met status verouderd; verstuurde invoer niet als metadata getoond');
    t.ctx.S._actieveEntiteit = 'ENT_A'; t.ctx.S.data = t.ctx.S.dataPerEntiteit.ENT_A;
    t.ctx.saveEntiteitData('ENT_A', ['financieel']);
    t.log.req[1].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(stand(t.html()) === 'BEVESTIGD' && t.html().includes('1.500.000'), 'volgende entiteit-save herstelt een bevestigde stand');
  }
  {
    // Productpunt 37 (22 okt 2026): de server geeft na een groepsrij-save de herberekende groepsrij terug.
    // A1: groepswaarden → BEVESTIGD met precies die rij; S._groepData (handmatige invoer) blijft ongemoeid.
    const t = laadOpslag(root, { entiteit: null }); t.toon();
    t.invoer('df_omzet3', '999999'); t.ctx.saveCurrent(); t.timersAf();
    const groepVoor = JSON.stringify(t.ctx.S._groepData);
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    const h = t.html();
    check(t.log.req[0].body.entiteit_id === undefined && stand(h) === 'BEVESTIGD' && h.includes('1.500.000') && !h.includes('1.200.000') && h.includes('Bijgewerkt met de groepsrij die de server') && t.log.renderApp === 0, 'A1 groepsrij-save met groepswaarden: paneel BEVESTIGD met de nieuwe bruto som, zonder renderApp');
    check(JSON.stringify(t.ctx.S._groepData) === groepVoor && t.ctx.S._groepAuto === undefined && t.dom.df_omzet3.value === '999999', 'A1 groepsrij-save: groepswaarden uit het antwoord overschrijven S._groepData en de invoer niet');
    // Ook via saveGroepsniveauVelden (groepsniveau-veld / groepsdocument).
    const g = laadOpslag(root); g.toon();
    const gVoor = JSON.stringify(g.ctx.S._groepData);
    g.ctx.saveGroepsniveauVelden('financieel');
    g.log.req[0].antwoord(okAntwoord(nieuwDj(1750000))); await flush();
    check(g.log.req[0].body.entiteit_id === undefined && stand(g.html()) === 'BEVESTIGD' && g.html().includes('1.750.000') && JSON.stringify(g.ctx.S._groepData) === gVoor, 'A1 saveGroepsniveauVelden met groepswaarden: paneel BEVESTIGD, S._groepData ongewijzigd');
  }
  {
    // A2: oudere backend zonder groepswaarden → exact het oude gedrag (VEROUDERD, oude stand).
    const t = laadOpslag(root); t.toon();
    t.ctx.saveGroepsniveauVelden('financieel');
    t.log.req[0].antwoord({ ok: true, fase_id: 'financieel', velden: 3 }); await flush();
    check(stand(t.html()) === 'VEROUDERD' && t.html().includes('1.200.000') && t.ctx.S._gbBevestigd.data_json === null, 'A2 groepsrij-save zonder groepswaarden: oude stand met status VEROUDERD');
  }
  {
    // A3: een ouder groepsrij-antwoord of een antwoord voor een andere sessie verandert niets.
    const t = laadOpslag(root); t.toon();
    t.ctx.saveGroepsniveauVelden('financieel'); t.ctx.saveGroepsniveauVelden('financieel');
    t.log.req[1].antwoord(okAntwoord(nieuwDj(2000000))); await flush();
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(stand(t.html()) === 'BEVESTIGD' && t.html().includes('2.000.000') && !t.html().includes('1.500.000') && t.ctx.S._gbBevestigd.volgnr === 2, 'A3 ouder groepsrij-antwoord overschrijft de nieuwere bevestigde stand niet');
    const s = laadOpslag(root); s.toon();
    s.ctx.saveGroepsniveauVelden('financieel');
    s.ctx.S = maakS('VSYN0001', 'verkoper', [rij('financieel', null, nieuwDj(333000))]); s.toon();
    const nieuwGroep = JSON.stringify(s.ctx.S._groepData);
    s.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(s.ctx.S._gbBevestigd === undefined && stand(s.html()) === 'GELADEN' && s.html().includes('333.000') && JSON.stringify(s.ctx.S._groepData) === nieuwGroep && s.log.paneel === 0, 'A3 groepsrij-antwoord na sessiewissel raakt de nieuwe sessie en het paneel niet');
  }
  {
    // A4: fase-wisselsave in mna/06 (.fase-card[data-fi]-onclick) — groepswaarden alleen naar S._groepData
    // als bij het versturen een entiteit vastlag; een groepsrij-antwoord laat S._groepData ongemoeid.
    const s06 = lees(root, 'mna/06-schermen.js');
    const kaart = s06.indexOf(".fase-card[data-fi]').forEach(");
    const begin = s06.indexOf('var entVerstuurd=S._actieveEntiteit||null;', kaart);
    const slot = '}).catch(function(){});';
    const eind = s06.indexOf(slot, begin);
    const frag = kaart > 0 && begin > kaart && eind > begin ? s06.slice(begin, eind + slot.length) : '';
    check(frag.indexOf("fetch(WORKER+'/mna/save'") > 0 && frag.includes('entiteit_id:S._actieveEntiteit||undefined') && frag.includes('if(entVerstuurd&&d&&d.groepswaarden)') && !/S\._groepData\[[^\]]*\]=/.test(frag.slice(0, frag.indexOf('if(entVerstuurd&&d&&d.groepswaarden)'))), 'A4 mna/06 fase-wisselsave: entiteit vastgelegd vóór de fetch; groepswaarden alleen verwerkt bij een vastgelegde entiteit');
    const draai = async (actief, wisselNaVersturen) => {
      const verzoeken = [];
      const ctx = vm.createContext({
        WORKER: 'https://syn.invalid',
        S: { code: 'VSYN0001', _actieveEntiteit: actief, notities: {}, _groepData: { financieel_omzet3: '999999' } },
        getDataForFase: () => ({}), getChecklistForFase: () => ({ items: {}, redflags: {} }),
        metBasis: (pl) => pl, naOpslag: () => {}, // N-154: basis en verwerking na opslag apart getest (audit-consistentie 49)
        fetch: (url, opts) => { verzoeken.push(JSON.parse(opts.body)); return Promise.resolve({ json: () => Promise.resolve({ ok: true, fase_id: 'financieel', groepswaarden: { omzet3: { value: '1500000', label: '', auto: true } } }) }); },
      });
      vm.runInContext('function faseWisselSave(f){' + frag + '}', ctx, { filename: 'mna/06#fase-wisselsave' });
      ctx.faseWisselSave({ id: 'financieel' });
      if (wisselNaVersturen !== undefined) ctx.S._actieveEntiteit = wisselNaVersturen;
      await flush();
      return { S: ctx.S, body: verzoeken[0] };
    };
    const groep = frag ? await draai(null) : null;
    check(groep && groep.body.entiteit_id === undefined && groep.S._groepData.financieel_omzet3 === '999999', 'A4 groepsrij-antwoord met afwijkende groepswaarde: S._groepData ongewijzigd');
    const groepDanEnt = frag ? await draai(null, 'ENT_A') : null;
    check(groepDanEnt && groepDanEnt.S._groepData.financieel_omzet3 === '999999', 'A4 entiteit pas na het versturen gekozen: groepsrij-antwoord werkt S._groepData nog steeds niet bij');
    const ent = frag ? await draai('ENT_A') : null;
    check(ent && ent.body.entiteit_id === 'ENT_A' && ent.S._groepData.financieel_omzet3 === '1500000', 'A4 entiteit-antwoord: S._groepData bijgewerkt (gedrag van vóór productpunt 37)');
  }
  {
    // Groepsniveau-veld in entiteitcontext: entiteit-save én groepsrij-save; de latere groepsrij-save wint.
    const t = laadOpslag(root); t.toon();
    t.invoer('df_aantalPartners', '3'); t.ctx.saveCurrent(); t.timersAf();
    check(t.log.req.length === 2 && t.log.req[0].body.entiteit_id === 'ENT_A' && t.log.req[1].body.entiteit_id === undefined, 'groepsniveau-veld: entiteit-save en saveGroepsniveauVelden verstuurd');
    t.log.req[1].antwoord(okAntwoord(null)); await flush();
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(stand(t.html()) === 'VEROUDERD' && !t.html().includes('1.500.000'), 'groepsrij-save ná de entiteit-save: oudere entiteitrij wordt niet als actueel getoond');
  }
  {
    // saveAll: zelfde regels; beacon zonder antwoord raakt de stand niet.
    const t = laadOpslag(root); t.toon();
    t.ctx.saveAll();
    check(t.log.req.length === 1 && t.log.req[0].body.fase_id === 'financieel', 'saveAll: alleen de financiële fase met data');
    t.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush();
    check(stand(t.html()) === 'BEVESTIGD' && t.html().includes('1.500.000') && t.log.renderApp === 0, 'saveAll: bevestigde stand in paneel, geen renderApp');
    const voor = JSON.stringify(t.ctx.S._gbBevestigd);
    t.ctx.saveAll({ beacon: true });
    check(t.log.beacon === 1 && t.log.req.length === 1 && JSON.stringify(t.ctx.S._gbBevestigd) === voor, 'saveAll met beacon: geen antwoord, stand ongewijzigd');
  }
  {
    // Andere fase, begeleider en paneel buiten beeld.
    const t = laadOpslag(root); t.toon();
    t.ctx.S.fase = 1; t.invoer('df_kvk', '12345678'); t.ctx.saveCurrent(); t.timersAf();
    t.log.req[0].antwoord({ ok: true, fase_id: 'juridisch', velden: 1, groepswaarden: nieuwDj(1500000) }); await flush();
    check(t.ctx.S._gbBevestigd === undefined && t.log.paneel === 0, 'opslag van een andere fase raakt het groepsbeeld niet');
    const b = laadOpslag(root, { rol: 'tussenpersoon', code: 'TSYN0001', entiteit: null }); b.toon();
    b.invoer('df_omzet3', '1'); b.ctx.saveCurrent(); b.timersAf();
    check(b.log.req.length === 0 && stand(b.html()) === 'GELADEN', 'begeleider: Financieel blijft read-only, geen opslag, laadstand');
    const u = laadOpslag(root);
    u.ctx.saveEntiteitData('ENT_A', ['financieel']);
    let fout = null;
    try { u.log.req[0].antwoord(okAntwoord(nieuwDj(1500000))); await flush(); } catch (e) { fout = e; }
    u.toon();
    check(!fout && u.log.paneel === 0 && stand(u.html()) === 'BEVESTIGD' && u.html().includes('1.500.000'), 'paneel niet in beeld: stand wordt bewaard en bij de volgende render getoond');
  }

  // 13. Partnerbediening (productpunt 18, 13 okt 2026): Bewerken in beide bestaande overzichten — de
  // begeleidermodal (toonPartnersModal, mna/04) en het openingsscherm (renderOpening/bindOpeningScreen,
  // mna/06) — met de echte functies, een minimale DOM en een synthetische /mna/partners. Geen netwerk.
  for (const soort of ['modal', 'opening']) {
    const nm = soort === 'modal' ? 'partners begeleidermodal' : 'partners openingsscherm';
    const ANNA = ['Anna', '58', 'hoog', 'Bram', '450000', '40'];
    // Start: overzicht open, lijst gelezen, P1 in bewerking met leeftijd 59 en E2 extra aangevinkt.
    const startBewerk = async (opts) => {
      const t = laadPartnerUi(root, soort, opts); t.open(); await t.server();
      await t.klik(t.bewerkKnop('P1'));
      t.el('leeftijd').value = '59'; t.chk('E2').checked = true;
      return t;
    };
    {
      // Bewerken → wijzigen → opslaan → herladen.
      const t = laadPartnerUi(root, soort); t.open(); await t.server();
      check(t.bewerkKnoppen().length === 2 && t.el('bewerk-status').style.display === 'none' && t.el('annuleren').style.display === 'none' && t.posts().length === 0, nm + ': elke rij heeft een Bewerkenknop; geen bewerkmodus bij openen');
      await t.klik(t.bewerkKnop('P1'));
      check(JSON.stringify(t.formulier()) === JSON.stringify(ANNA) && t.chk('E1').checked && !t.chk('E2').checked, nm + ': formulier voorgevuld met alle partnervelden, winstaandeel en entiteitkoppelingen');
      check(t.el('bewerk-status').textContent === 'Bewerken: Anna' && t.el('bewerk-status').style.display === 'block' && t.el('annuleren').style.display !== 'none' && t.el('toevoegen').textContent === 'Opslaan' && t.posts().length === 0, nm + ': bewerkmodus zichtbaar (status, Annuleren, Opslaan); nog geen request');
      t.el('leeftijd').value = '59'; t.chk('E2').checked = true;
      const getsVoor = t.gets().length;
      await t.klik(t.el('toevoegen'));
      const p = t.posts();
      check(p.length === 1 && p[0].url === 'https://synthetisch.invalid/mna/partners/' + t.ctx.S.code && p[0].body.id === 'P1' && p[0].body.actie === undefined && p[0].body.naam === 'Anna' && p[0].body.leeftijd === '59' && p[0].body.winstaandeel_pct === '40' && JSON.stringify(p[0].body.entiteit_ids) === '["E1","E2","E_WEG"]', nm + ': één POST naar de bestaande route met het bestaande id; koppeling zonder checkbox (E_WEG) en winstaandeel gaan mee');
      check(soort === 'modal' ? p[0].headers['x-tussen-key'] === 'synthetisch-sleutel' : p[0].headers['x-tussen-key'] === undefined, nm + ': dezelfde authheaders als het bestaande toevoegformulier');
      check(t.el('toevoegen').disabled && t.el('toevoegen').textContent === '...' && t.gets().length === getsVoor, nm + ': tijdens opslaan knop uit; geen succes vóór het antwoord');
      await t.server();
      const rij = t.store.rijen.find((r) => r.id === 'P1');
      check(t.store.rijen.length === 2 && rij.leeftijd === '59' && rij.naam === 'Anna' && JSON.stringify(rij.entiteit_ids) === '["E1","E2","E_WEG"]' && JSON.stringify(t.store.rijen[1]) === JSON.stringify(PT_RIJEN()[1]) && t.posts().length === 1, nm + ': serverrij P1 bijgewerkt met zelfde id en koppelingen; geen verwijderen of nieuwe rij; andere partner ongemoeid');
      check(t.gets().length === getsVoor + 1 && t.el('lijst').innerHTML.includes('59 jaar') && t.bewerkKnoppen().length === 2 && t.formulier().every((v) => v === '') && !t.chk('E1').checked && t.el('bewerk-status').style.display === 'none' && t.el('annuleren').style.display === 'none' && t.el('toevoegen').textContent === '+ Toevoegen' && !t.el('toevoegen').disabled && t.el('err').style.display === 'none', nm + ': na ack de lijst opnieuw van de server gelezen; formulier leeg en terug in toevoegmodus');
      await t.klik(t.bewerkKnop('P1'));
      check(t.el('leeftijd').value === '59' && t.chk('E1').checked && t.chk('E2').checked && t.el('bewerk-status').textContent === 'Bewerken: Anna', nm + ': na herladen opnieuw bewerken toont de herlezen serverrij (id gelijk, koppelingen behouden)');
    }
    {
      // Geen winstaandeelveld (geen maatschap): de bestaande waarde gaat ongewijzigd mee.
      const t = await startBewerk({ maatschap: false });
      await t.klik(t.el('toevoegen'));
      check(t.el('winstaandeel') === null && t.posts()[0].body.winstaandeel_pct === '40', nm + ': zonder winstaandeelveld blijft het bestaande winstaandeel behouden');
    }
    {
      // Annuleren: geen mutatie; invoer van vóór de eerste Bewerken-klik komt terug.
      const t = laadPartnerUi(root, soort); t.open(); await t.server();
      t.el('naam').value = 'Concept'; t.chk('E2').checked = true;
      await t.klik(t.bewerkKnop('P1')); await t.klik(t.bewerkKnop('P2'));
      check(t.el('naam').value === 'Bas' && t.el('bewerk-status').textContent === 'Bewerken: Bas', nm + ': tweede Bewerken-klik wisselt naar de andere partner');
      const reqVoor = t.log.req.length;
      await t.klik(t.el('annuleren'));
      check(t.el('naam').value === 'Concept' && t.chk('E2').checked && !t.chk('E1').checked && t.el('bewerk-status').style.display === 'none' && t.el('toevoegen').textContent === '+ Toevoegen' && t.log.req.length === reqVoor && t.posts().length === 0 && JSON.stringify(t.store.rijen) === JSON.stringify(PT_RIJEN()), nm + ': Annuleren zonder request of mutatie; eerdere onopgeslagen invoer terug');
      await t.klik(t.el('toevoegen')); await t.server();
      check(t.posts().length === 1 && t.posts()[0].body.id === undefined && t.store.rijen.length === 3 && t.store.rijen[2].naam === 'Concept' && t.el('naam').value === '', nm + ': na Annuleren voegt de knop weer een nieuwe partner toe (toevoegen intact)');
    }
    // Fout, 404 en rolweigering: geen succes, invoer en bewerkmodus blijven, geen herlezing.
    for (const [naam, af, verwacht] of [
      ['serverfout 500', (r) => r.antwoord({ error: 'Partner opslaan mislukt' }, 500), 'Partner opslaan mislukt'],
      ['rolweigering 403', (r) => r.antwoord({ error: 'Unauthorized' }, 403), 'Geen toestemming om deze partner te bewerken.'],
      ['rolweigering 401', (r) => r.antwoord({ error: 'Unauthorized' }, 401), 'Geen toestemming om deze partner te bewerken.'],
      ['netwerkfout', (r) => r.netwerkfout(), 'Fout bij opslaan'],
      ['geen JSON', (r) => r.kapotteJson(), 'Fout bij opslaan'],
      ['leeg antwoord', (r) => r.antwoord(null), 'Fout bij opslaan'],
      ['ok zonder id', (r) => r.antwoord({ ok: true }), 'Fout bij opslaan'],
      ['ok met ander id', (r) => r.antwoord({ ok: true, id: 'P2' }), 'Fout bij opslaan'],
      ['ok als tekst', (r) => r.antwoord({ ok: 'true', id: 'P1' }), 'Fout bij opslaan'],
      ['HTTP 500 met ok', (r) => r.antwoord({ ok: true, id: 'P1' }, 500), 'Fout bij opslaan'],
    ]) {
      const t = await startBewerk();
      const getsVoor = t.gets().length;
      await t.klik(t.el('toevoegen'));
      af(t.posts()[0]); await flush();
      check(t.el('err').style.display === 'block' && t.el('err').textContent === verwacht && t.el('leeftijd').value === '59' && t.el('naam').value === 'Anna' && t.chk('E2').checked
        && t.el('bewerk-status').textContent === 'Bewerken: Anna' && t.el('toevoegen').textContent === 'Opslaan' && !t.el('toevoegen').disabled && t.gets().length === getsVoor, nm + ', ' + naam + ': foutmelding, invoer en bewerkmodus behouden, geen herlezing');
    }
    {
      // Echte 404 van de synthetische server: partner intussen elders verwijderd.
      const t = await startBewerk();
      t.store.rijen = t.store.rijen.filter((r) => r.id !== 'P1');
      await t.klik(t.el('toevoegen')); await t.server();
      check(t.el('err').textContent === 'Partner niet gevonden' && t.el('leeftijd').value === '59' && t.store.rijen.length === 1 && t.posts().length === 1, nm + ': 404 onbekend id toont "Partner niet gevonden", maakt niets opnieuw aan en behoudt de invoer');
      await t.klik(t.el('annuleren'));
      check(t.el('naam').value === '' && t.el('err').style.display === 'none' && t.posts().length === 1, nm + ': na 404 annuleren zonder extra request');
    }
    {
      // Nieuwere bewerking tijdens opslaan: succes van de oude sluit de nieuwe niet.
      const t = await startBewerk();
      await t.klik(t.el('toevoegen'));
      await t.klik(t.bewerkKnop('P2'));
      const getsVoor = t.gets().length;
      t.posts()[0].antwoord({ ok: true, id: 'P1', naam: 'Anna' }); await flush();
      check(t.el('naam').value === 'Bas' && t.el('bewerk-status').textContent === 'Bewerken: Bas' && t.el('toevoegen').textContent === 'Opslaan' && !t.el('toevoegen').disabled && t.gets().length === getsVoor + 1, nm + ': laat succes van een oudere bewerking laat de nieuwere bewerking staan en herleest de lijst');
      const t2 = await startBewerk();
      await t2.klik(t2.el('toevoegen'));
      await t2.klik(t2.bewerkKnop('P2'));
      t2.posts()[0].antwoord({ error: 'Partner opslaan mislukt' }, 500); await flush();
      check(t2.el('naam').value === 'Bas' && t2.el('err').textContent === 'Opslaan van Anna mislukt: Partner opslaan mislukt' && t2.el('bewerk-status').textContent === 'Bewerken: Bas', nm + ': late fout van een oudere bewerking wordt gemeld zonder de nieuwere bewerking aan te raken');
    }
    // Contextwissel tijdens opslaan: nieuwe sessie (zelfde code), andere code, rolwissel, scherm weg.
    for (const [naam, wissel] of [
      ['nieuwe sessie zelfde code', (t) => { t.ctx.S = { ...t.ctx.S }; }],
      ['andere code', (t) => { t.ctx.S.code = t.ctx.S.code.replace('SYN0001', 'SYN0002'); }],
      ['rolwissel', (t) => { t.ctx.S.rol = 'koper'; }],
      [soort === 'modal' ? 'modal gesloten' : 'scherm opnieuw getekend', (t) => { t.sluit(); }],
    ]) {
      const t = await startBewerk();
      await t.klik(t.el('toevoegen'));
      wissel(t);
      const getsVoor = t.gets().length, nieuwForm = JSON.stringify(t.formulier());
      t.posts()[0].antwoord({ ok: true, id: 'P1', naam: 'Anna' }); await flush();
      check(t.gets().length === getsVoor && JSON.stringify(t.formulier()) === nieuwForm && (t.el('err') === null || t.el('err').style.display === 'none'), nm + ', ' + naam + ': laat antwoord wordt genegeerd (geen herlezing, geen formulier- of statuswijziging)');
    }
    {
      // Oud leesantwoord na sluiten/opnieuw openen komt niet in het nieuwe overzicht.
      const t = laadPartnerUi(root, soort);
      t.open();
      const oud = t.log.req.filter((r) => r.open && r.method === 'GET' && r.url.includes('/mna/partners/'));
      t.sluit(); if (soort === 'modal') t.open();
      const nieuw = t.log.req.filter((r) => r.open && !oud.includes(r));
      nieuw.forEach((r) => r.antwoord(r.url.includes('/mna/partners/') ? kopie(t.store.rijen) : kopie(t.store.entiteiten))); await flush();
      oud.forEach((r) => r.antwoord([{ id: 'PX', naam: 'Oude lijst', entiteit_ids: [] }])); await flush();
      check(oud.length === 1 && !t.el('lijst').innerHTML.includes('Oude lijst') && !t.bewerkKnop('PX') && t.bewerkKnoppen().length === 2, nm + ': laat leesantwoord van een gesloten/vervangen overzicht overschrijft het nieuwe overzicht niet');
      await t.klik(t.bewerkKnop('P2'));
      check(t.el('naam').value === 'Bas' && t.el('bewerk-status').textContent === 'Bewerken: Bas', nm + ': Bewerken in het nieuwe overzicht gebruikt de actuele rijen');
    }
    {
      // HTML-escaping: naam en id met markup.
      const boos = { id: 'P"<x>', naam: '<img src=x onerror=alert(1)>', leeftijd: '', veranderbereidheid: '<b>v</b>', opvolgingskandidaat: '', omzet_incl_team: '', winstaandeel_pct: '', entiteit_ids: ['E1'] };
      const t = laadPartnerUi(root, soort, { rijen: [boos] }); t.open(); await t.server();
      const lh = t.el('lijst').innerHTML;
      check(!/<img|<b>|"<x>/.test(lh) && lh.includes('&lt;img src=x onerror=alert(1)&gt;') && t.bewerkKnop('P"<x>'), nm + ': lijst escapet naam, velden en id; Bewerkenknop draagt het echte id');
      await t.klik(t.bewerkKnop('P"<x>'));
      check(t.el('naam').value === boos.naam && t.el('verandering').value === '<b>v</b>' && t.el('bewerk-status').textContent === 'Bewerken: ' + boos.naam && t.el('bewerk-status').kids.length === 0 && !t.el('bewerk-status').innerHTML.includes('<img'), nm + ': voorvullen als platte waarde; status via textContent zonder markup');
      await t.klik(t.el('toevoegen')); await t.server();
      check(t.posts()[0].body.id === 'P"<x>' && t.store.rijen.length === 1 && t.store.rijen[0].naam === boos.naam, nm + ': opslaan stuurt het ongewijzigde id terug');
    }
    if (soort === 'opening') {
      // Entiteit verwijderen tijdens bewerken: die koppeling vervalt, de koppeling zonder checkbox blijft.
      const t = await startBewerk();
      const verwijder = t.dom.document.querySelectorAll('.op-gs-verwijder').find((b) => b.dataset.id === 'E1');
      await t.klik(verwijder); await t.server();
      check(!t.chk('E1') && t.chk('E2').checked && t.el('bewerk-status').textContent === 'Bewerken: Anna' && t.el('leeftijd').value === '59', nm + ': na entiteit verwijderen blijft de bewerking met de gekozen koppelingen staan');
      await t.klik(t.el('toevoegen'));
      const b = t.posts().filter((r) => r.url.includes('/mna/partners/'))[0].body;
      check(b.id === 'P1' && JSON.stringify(b.entiteit_ids) === '["E2","E_WEG"]', nm + ': verwijderde entiteit valt uit de koppeling; koppeling zonder checkbox blijft behouden');
    }
  }

  return res;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiGroupConsolidationUiChecks(root);
  res.forEach((r) => console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg));
  const fout = res.filter((r) => !r.ok).length;
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' checks gefaald.' : '\nAlle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
