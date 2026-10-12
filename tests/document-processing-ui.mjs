#!/usr/bin/env node
// Documentupload: blijvende status, concrete fouten en veilige batchstop (7 okt 2026).
//
// Sluit de frontend aan op het backendprotocol voor externe documenten (verwerking_status RECEIVED/
// STORED/PROCESSING/PROCESSED/NEEDS_REVIEW/FAILED, één doc_id, non-200 met doc_id/status, 503 in de
// lijst = fout). Oorzaak vóór deze wijziging: uploadDocument deed fetch→json→mapping→render in één
// try en noemde elke fout "Verbindingsfout" (ook een JSON-, mapping- of renderfout) en verwijderde de
// tijdelijke rij ook als de server al een doc_id had; loadDocsForFase gooide de status weg en maakte
// van een 503 stil niets; centraalUploadFiles telde NEEDS_REVIEW als verwerkt.
//
// Deze test draait de ECHTE functies uit mna/02 (uploadDocumentenSequentieel, annuleerResterendeUploads,
// uploadDocument, loadDocsForFase, renderDocumentSectie, vervangDocument, centraalUploadFiles,
// loadDataroom/renderDataroom) en fetchMetTimeout uit mna/01 in node:vm. renderApp tekent via de echte
// renderDocumentSectie; fetch is een stub met synthetische serverantwoorden (vorm zoals backend
// worker/14 + worker/15). Geen netwerk, geen browser, geen live API — browserbewijs volgt op staging.
//
// Productpunt 19 (12 okt 2026, onderaan): de echte autosave (markDirty/saveAll/30s-interval/beacon) en
// invoerbehoud vóór de debounce (userEdit/schedSave/saveCurrent), zie laadAutosave en docs/document-output.md.
//
// Gebruik: node tests/document-processing-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 25).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const FASE = 'financieel';
const CODE = 'VSYN0001';

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function knip(src, begin, eind) {
  const a = src.indexOf(begin);
  const b = a < 0 ? -1 : src.indexOf(eind, a);
  if (a < 0 || b < 0) throw new Error('niet gevonden in bron: ' + begin);
  return src.slice(a, b + eind.length);
}
function regel(src, re, naam) {
  const m = src.match(re);
  if (!m) throw new Error('niet gevonden in bron: ' + naam);
  return m[0];
}
function maakEl(id, checked) {
  return { id, checked: !!checked, value: '', textContent: '', innerHTML: '', style: {}, files: null, onchange: null, remove() {}, click() {} };
}
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

// Synthetische serverantwoorden in de vorm van backend worker/14 (upload).
const ANTW = {
  processed: (docId, extra = {}) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: 'Synthetische analyse.', veld_extractie: { omzet: '1000000' }, veld_extractie_2: null, r2_opgeslagen: true, verworpen: false, verworpen_reden: null, crosschecks: [], sanity_waarschuwingen: [], extractie_betrouwbaarheid: null, entiteit_naam: null, versie: 1, verwerking_status: 'PROCESSED', fout: null, geanalyseerd: true, inhoud_hash: 'a'.repeat(64), ...extra } }),
  stored: (docId) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: '', r2_opgeslagen: true, verworpen: false, alleen_bewijsstuk: true, versie: 1, verwerking_status: 'STORED', geanalyseerd: false, inhoud_hash: 'b'.repeat(64) } }),
  review: (docId, extra = {}) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: 'Geheime tekst uit een verkeerd document.', veld_extractie: {}, veld_extractie_2: null, r2_opgeslagen: true, verworpen: true, verworpen_reden: 'Het bestand is opgeslagen, maar lijkt niet bij dit traject of de gekozen entiteit te horen. Er zijn geen gegevens overgenomen; beoordeel het document handmatig.', crosschecks: [], sanity_waarschuwingen: [], entiteit_naam: null, versie: 1, verwerking_status: 'NEEDS_REVIEW', fout: 'ENTITY_MISMATCH', geanalyseerd: false, inhoud_hash: 'c'.repeat(64), ...extra } }),
  aiFailed: (docId) => ({ status: 502, body: { ok: false, error: 'Het bestand is opgeslagen, maar de automatische analyse is mislukt. Probeer het later opnieuw of vul de gegevens handmatig in.', fout: 'AI_FAILED', doc_id: docId, inhoud_hash: 'd'.repeat(64), verwerking_status: 'FAILED', status_vastgelegd: true, bestand_opgeslagen: true, r2_opgeslagen: true, verworpen: false, veld_extractie: {} } }),
  storageFailed: (docId) => ({ status: 503, body: { ok: false, error: 'Het bestand kon niet worden opgeslagen. De upload is als mislukt geregistreerd; upload het bestand opnieuw.', fout: 'STORAGE_FAILED', doc_id: docId, inhoud_hash: 'e'.repeat(64), verwerking_status: 'FAILED', status_vastgelegd: true, bestand_opgeslagen: false, r2_opgeslagen: false } }),
  registratieMislukt: () => ({ status: 503, body: { ok: false, error: 'Het document kon niet worden geregistreerd; er is niets opgeslagen. Probeer het opnieuw.', fout: 'REGISTRATIE_MISLUKT', bestand_opgeslagen: false } }),
};

function laad(root) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const delen = [
    regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    knip(src02, 'function getDocsForFase(faseId) {', '\n}\n'),
    knip(src02, 'function loadDocsForFase(faseId) {', '\n}\n'),
    knip(src02, 'function entiteitNaam(id){', '\n}\n'),
    knip(src02, 'function gokEntiteitId(entiteitNaamAI, alleenZeker){', '\n}\n'),
    knip(src02, 'function leesUploadKeuzes(faseId) {', '\n}\n'),
    knip(src02, 'window.uploadDocumentenSequentieel = async function(faseId, files) {', '\n};\n'),
    knip(src02, 'window.annuleerResterendeUploads = function(faseId) {', '\n};\n'),
    knip(src02, 'async function uploadDocument(faseId, file, existingId, vervangtDocId', '\n}\n'),
    knip(src02, 'window.centraalUploadFiles = async function(files) {', '\n};\n'),
    knip(src02, 'function renderDocumentSectie(faseId) {', '\n}\n'),
    knip(src02, 'window.vervangDocument = function(faseId, docId) {', '\n};\n'),
    knip(src02, 'async function loadDataroom(){', '\n}\n'),
    knip(src02, 'function renderDataroom(){', '\n}\n'),
  ];

  const els = {};
  const log = { requests: [], lijst: [], overig: [], autoFill: [], toasts: [], html: '', saveAll: 0 };
  const opzet = { upload: [], lijst: [], autoFillGooit: false, snelleTimeout: false };

  function renderApp() {
    const html = ctx.renderDocumentSectie(FASE);
    log.html = html;
    for (const m of html.matchAll(/<input type="checkbox" id="([^"]+)"([^>]*)>/g)) els[m[1]] = maakEl(m[1], /\schecked[\s>=]/.test(m[2] + '>'));
    for (const m of html.matchAll(/<div id="(upload-status-[^"]+)"/g)) els[m[1]] = maakEl(m[1]);
    for (const m of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) { const sel = m[2].match(/<option value="([^"]*)"[^>]*\sselected/); const el = maakEl(m[1]); el.value = sel ? sel[1] : ''; els[m[1]] = el; }
  }

  const maakResp = (a) => ({
    ok: a.status >= 200 && a.status < 300, status: a.status,
    json: () => a.ongeldigeJson ? Promise.reject(new SyntaxError('Unexpected token < in JSON')) : Promise.resolve(JSON.parse(JSON.stringify(a.body))),
  });
  // Antwoordspecificatie: {status, body} | {ongeldigeJson, status} | {netwerk:true} | {hangt:true}
  // (pas klaar bij abort via de echte fetchMetTimeout) | {uitgesteld: u} (test geeft het antwoord later).
  function beantwoord(a, opts) {
    if (a.netwerk) return Promise.reject(new TypeError('Failed to fetch'));
    if (a.hangt) return new Promise((_, rej) => { opts.signal.addEventListener('abort', () => rej(opts.signal.reason)); });
    if (a.uitgesteld) { a.uitgesteld._binnen(opts); return a.uitgesteld._antwoord.then((x) => beantwoord(x, opts)); }
    return Promise.resolve(maakResp(a));
  }
  const fetch = (url, opts = {}) => {
    const u = String(url);
    if (u.indexOf(WORKER + '/mna/document/upload?') === 0) {
      log.requests.push({ url: u, opts });
      const a = opzet.upload.shift();
      if (!a) return Promise.reject(new Error('test: onverwacht upload-verzoek'));
      return beantwoord(a, opts);
    }
    if (u.indexOf(WORKER + '/mna/document/lijst/') === 0) {
      log.lijst.push(u);
      const a = opzet.lijst.shift() || { status: 200, body: [] };
      return beantwoord(a, opts);
    }
    log.overig.push(u);
    return Promise.resolve(maakResp({ status: 200, body: { ok: true } }));
  };

  const ctx = vm.createContext({
    WORKER, DOCS: {}, S: { code: CODE, rol: 'verkoper', traject: { status: 'actief', bewaar_docs: true }, _entiteiten: [], data: {} },
    FASES: [{ id: 'financieel', title: 'Financieel' }, { id: 'partner', title: 'Partners & personeel' }, { id: 'juridisch', title: 'Juridisch & fiscaal' }],
    BRAND: { platform: 'Synth' },
    document: {
      getElementById: (id) => els[id] || null,
      createElement: (tag) => { const el = maakEl('nieuw-' + tag); el.click = () => { ctx._laatsteKiezer = el; }; return el; },
      body: { appendChild() {} },
    },
    renderApp, fetch, FormData, AbortController, clearTimeout, console,
    setTimeout: (fn, ms, ...a) => setTimeout(fn, (opzet.snelleTimeout && ms === 60000) ? 5 : ms, ...a),
    toast: (msg, type) => log.toasts.push({ msg: String(msg), type }),
    autoFillFromExtraction: (fid, velden) => { if (opzet.autoFillGooit) throw new TypeError('synthetische lokale fout'); log.autoFill.push({ fid, velden }); },
    vergelijkDubbelePassOverigeVelden: () => [], toonConflictDialog() {},
    markDirty() {}, schedSave() {}, saveEntiteitData() {}, saveAll() { log.saveAll++; },
    brandMerkHtml: () => '', versieLabel: () => '', secAuditLog() {},
  });
  ctx.window = ctx;
  vm.runInContext(delen.join('\n\n'), ctx, { filename: 'mna/01+02#document-processing-ui' });

  const bestand = (naam) => new File(['Synthetisch document (geen echte gegevens).'], naam, { type: 'text/plain' });
  const begin = (docs) => {
    ctx.DOCS[FASE] = docs || [];
    log.requests = []; log.lijst = []; log.overig = []; log.autoFill = []; log.toasts = [];
    opzet.upload = []; opzet.lijst = []; opzet.autoFillGooit = false; opzet.snelleTimeout = false;
    renderApp();
  };
  const uitgesteld = () => {
    const u = {};
    u.binnen = new Promise((r) => { u._binnen = r; });
    u._antwoord = new Promise((r) => { u.geef = r; });
    return u;
  };
  const docs = () => ctx.DOCS[FASE] || [];
  const doc = (id) => docs().find((d) => d.id === id);
  const verbindingsToast = () => log.toasts.some((t) => /Verbindingsfout|Geen verbinding/.test(t.msg));
  // uploadDocument roept autoFillFromExtraction per fase aan (7x per document); de financieel-aanroep
  // telt dus precies één keer per document waarvan de velden zijn verwerkt.
  const ingevuld = () => log.autoFill.filter((x) => x.fid === FASE).length;
  return { ctx, els, log, opzet, begin, bestand, uitgesteld, docs, doc, verbindingsToast, ingevuld, renderApp };
}

// Productpunt 19 (12 okt 2026): autosave en invoer. Draait de ECHTE markDirty/_dataHash/saveAll, het
// 30s-interval en de visibilitychange/pagehide/beforeunload-handlers, plus userEdit/schedSave/saveCurrent/
// _verstuurGeplandeSave/saveGroepsniveauVelden/getDataForFase/loadDataFromDB/showSaveIndicator uit mna/02 —
// géén saveAll-stub. fetch geeft elk /mna/save-verzoek uitgesteld terug; de test bepaalt het synthetische
// antwoord (HTTP-status + body). Timers en interval zijn handmatig; renderApp is een synthetische hertekening
// die de invoervelden, net als renderMain in mna/06, opnieuw uit S.data/S._groepData opbouwt.
const AUTOSAVE_FASES = () => [
  { id: 'financieel', title: 'Financieel', items: [], redflags: [], dataFields: [{ id: 'omzet', label: 'Omzet', req: true }, { id: 'ebitda', label: 'EBITDA' }, { id: 'aantalPartners', label: 'Aantal partners', groepsniveau: true }] },
  { id: 'juridisch', title: 'Juridisch', items: [], redflags: [], dataFields: [{ id: 'kvk', label: 'KvK-nummer' }] },
];
const OK_ACK = { ok: true, fase_id: 'financieel', velden: 1 };
function maakAutosaveS(extra = {}) {
  const s = { screen: 'main', code: CODE, rol: 'verkoper', traject: { status: 'actief' }, fase: 0, checked: {}, data: {}, notities: {}, _userEdited: {}, _docSource: {}, _docFragment: {}, dataPerEntiteit: {}, _actieveEntiteit: null, _entiteiten: [], saveTimer: null, ...extra };
  if (!s._groepData) s._groepData = s.data;
  return s;
}
function laadAutosave(root) {
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const delen = [
    regel(src02, /^function ge\(id\)\{.*\}$/m, 'ge'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    regel(src02, /^function veldBron\(key\)\{[\s\S]*?\n\}/m, 'veldBron'),
    regel(src02, /^function getDataForFase\(id\)\{[\s\S]*?\n\}/m, 'getDataForFase'),
    regel(src02, /^function getChecklistForFase\(id\)\{.*\}$/m, 'getChecklistForFase'),
    regel(src02, /^function saveGroepsniveauVelden\(faseId\)\{[\s\S]*?\n\}/m, 'saveGroepsniveauVelden'),
    regel(src02, /^function saveCurrent\(cb\)\{[\s\S]*?\n\}/m, 'saveCurrent'),
    regel(src02, /^function gbOpslagStart\(code,faseId,entiteitId\)\{[\s\S]*?\n\}/m, 'gbOpslagStart'),
    regel(src02, /^function gbOpslagKlaar\(tk,d\)\{[\s\S]*?\n\}/m, 'gbOpslagKlaar'),
    regel(src02, /^function _verstuurGeplandeSave\(pending\)\{[\s\S]*?\n\}/m, '_verstuurGeplandeSave'),
    knip(src02, 'function loadDataFromDB(dbData){', 'koperReacties[id]=row.koper_reactie;}});}'),
    regel(src02, /^function showSaveIndicator\(tekst\)\{.*\}$/m, 'showSaveIndicator'),
    regel(src02, /^function schedSave\(\)\{.*\}$/m, 'schedSave'),
    knip(src02, 'function userEdit(el){', '\n}\n'),
    knip(src02, '// Dirty tracking — weet of er onopgeslagen wijzigingen zijn', '// -- BANKMUTATIES STATE'),
  ];
  const log = { req: [], beacon: [], toasts: [], groen: [], renders: 0 };
  const opzet = { beacon: () => true };
  const timers = [];
  const intervals = [];
  const handlers = {};
  const dom = {};
  const saveInd = { textContent: '', classList: { add() { log.groen.push(saveInd.textContent); }, remove() {} } };
  const fetch = (url, opts) => new Promise((resolve, reject) => {
    const r = { url: String(url), body: JSON.parse(opts.body) };
    const antwoord = (status, json) => resolve({ ok: status >= 200 && status < 300, status, json });
    r.geef = (status, body) => antwoord(status, () => Promise.resolve(JSON.parse(JSON.stringify(body))));
    r.ongeldig = (status = 200) => antwoord(status, () => Promise.reject(new SyntaxError('Unexpected token < in JSON')));
    r.leeg = (status = 200) => antwoord(status, () => Promise.reject(new SyntaxError('Unexpected end of JSON input')));
    r.netwerk = () => reject(new TypeError('Failed to fetch'));
    log.req.push(r);
  });
  function renderApp() {
    log.renders++;
    const S = ctx.S; const f = ctx.FASES[S.fase];
    Object.keys(dom).forEach((k) => { delete dom[k]; });
    f.dataFields.forEach((df) => { if (!df.header) dom['df_' + df.id] = { id: 'df_' + df.id, value: (df.groepsniveau ? S._groepData : S.data)[f.id + '_' + df.id] || '' }; });
  }
  const ctx = vm.createContext({
    console, WORKER, FASES: AUTOSAVE_FASES(),
    Blob: function (delen, o) { this.delen = delen; this.type = o && o.type; },
    navigator: { sendBeacon: (url, blob) => { log.beacon.push({ url, body: JSON.parse(blob.delen[0]) }); return opzet.beacon(); } },
    document: { getElementById: (id) => (id === 'save-ind' ? saveInd : dom[id] || null), addEventListener: (type, fn) => { handlers[type] = fn; }, hidden: false },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    fetch, renderApp, checkOmzetSom() {},
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: (id) => { if (id && timers[id - 1]) timers[id - 1].fn = null; },
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    showAlert: (msg) => log.toasts.push(String(msg)),
    S: maakAutosaveS(),
  });
  ctx.window = ctx;
  vm.runInContext(delen.join('\n\n'), ctx, { filename: 'mna/02#autosave' });
  // Eerstvolgende nog lopende timer met deze vertraging afgaan (1200 = schedSave, 800 = saveCurrent).
  const timer = (ms) => { const t = timers.find((x) => x.fn && x.ms === ms); if (!t) return false; const fn = t.fn; t.fn = null; fn(); return true; };
  const autosave = () => intervals.find((i) => i.ms === 30000).fn();
  const typ = (id, waarde) => { const el = dom['df_' + id]; el.value = waarde; ctx.userEdit(el); return el; };
  const flush = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
  return { ctx, log, opzet, dom, handlers, intervals, timer, autosave, typ, flush, renderApp };
}

export async function draaiDocumentProcessingUiChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const probeer = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.stack) || e)); } };

  await probeer('succes', async () => {
    const t = laad(root);
    t.begin();
    t.opzet.upload.push(ANTW.processed('doc_syn_ok'));
    const u = await t.ctx.uploadDocument(FASE, t.bestand('syn-jaarrekening.txt'));
    const d = t.doc('doc_syn_ok');
    check(u && u.soort === 'verwerkt', 'succes: PROCESSED geeft uitkomst "verwerkt" (' + (u && u.soort) + ')');
    check(d && d.verwerking_status === 'PROCESSED' && !d.uploading && t.docs().length === 1, 'succes: één rij met de server-doc_id en status PROCESSED, geen tijdelijke rij');
    check(t.ingevuld() === 1, 'succes: velden uit een geslaagde analyse worden (één keer) ingevuld');
    check(/>Geanalyseerd</.test(t.log.html) && /\/mna\/document\/download\/doc_syn_ok\?code=/.test(t.log.html), 'succes: status "Geanalyseerd" en downloadlink zichtbaar');
  });

  await probeer('bewijsstuk', async () => {
    const t = laad(root);
    t.begin();
    t.els['bewijsstuk-alleen-' + FASE].checked = true;
    t.opzet.upload.push(ANTW.stored('doc_syn_bewijs'));
    const u = await t.ctx.uploadDocument(FASE, t.bestand('syn-bewijs.txt'));
    const d = t.doc('doc_syn_bewijs');
    check(/[?&]alleen_bewijsstuk=true(&|$)/.test(t.log.requests[0].url), 'bewijsstuk: keuze vóór het hertekenen vastgelegd (&alleen_bewijsstuk=true)');
    check(u.soort === 'opgeslagen' && d && d.verwerking_status === 'STORED' && d.alleen_bewijsstuk, 'bewijsstuk: STORED = opgeslagen zonder analyse, rij als bewijsstuk');
    check(t.log.autoFill.length === 0 && !/>Geanalyseerd</.test(t.log.html) && /Bewijsstuk/.test(t.log.html), 'bewijsstuk: geen veldinvulling en geen "Geanalyseerd"-label, wel het bewijsstuklabel');
  });

  await probeer('non-200 met doc_id', async () => {
    const t = laad(root);
    t.begin();
    t.opzet.upload.push(ANTW.aiFailed('doc_syn_fail'));
    const u = await t.ctx.uploadDocument(FASE, t.bestand('syn-scan.txt'));
    const d = t.doc('doc_syn_fail');
    check(u.soort === 'mislukt' && d && !d.uploading && d.verwerking_status === 'FAILED', 'non-200 met doc_id: dezelfde server-doc_id blijft zichtbaar met status FAILED (geen verwijderde rij)');
    check(t.docs().length === 1, 'non-200 met doc_id: geen tijdelijke rij achtergebleven');
    check(/>Mislukt</.test(t.log.html) && /automatische analyse is mislukt/.test(t.log.html), 'non-200 met doc_id: status "Mislukt" + concrete serverreden in de lijst');
    check(/\/mna\/document\/download\/doc_syn_fail\?/.test(t.log.html), 'non-200 met doc_id: download alleen omdat bestand_opgeslagen=true');
    check(t.log.autoFill.length === 0 && !t.verbindingsToast() && t.log.toasts.some((x) => /automatische analyse is mislukt/.test(x.msg)), 'non-200 met doc_id: geen veldinvulling, geen "Verbindingsfout", wel de concrete fouttekst');
    // Herladen: de lijst (worker/15) levert dezelfde rij met status/reden — weer zichtbaar.
    t.ctx.DOCS[FASE] = [];
    t.opzet.lijst.push({ status: 200, body: [{ id: 'doc_syn_fail', bestand_naam: 'syn-scan.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', methode: 'ai_text', uploaded_at: 1, fase_id: FASE, entiteit_id: '', versie: 1, heeft_eerdere_versies: false, verwerking_status: 'FAILED', verwerking_stap: 'afgerond', verwerking_fout: 'AI_FAILED', verwerking_reden: 'Het bestand is opgeslagen, maar de automatische analyse is mislukt. Probeer het later opnieuw of vul de gegevens handmatig in.', inhoud_hash: 'd'.repeat(64), bestand_opgeslagen: true }] });
    t.ctx.loadDocsForFase(FASE);
    await wacht(10);
    const r = t.doc('doc_syn_fail');
    check(r && r.verwerking_status === 'FAILED' && /Mislukt/.test(t.log.html) && /automatische analyse is mislukt/.test(t.log.html), 'herladen: status en reden opnieuw zichtbaar na het laden van de lijst');
  });

  await probeer('opslag mislukt / geen doc_id', async () => {
    const t = laad(root);
    t.begin();
    t.opzet.upload.push(ANTW.storageFailed('doc_syn_r2'));
    t.opzet.upload.push(ANTW.registratieMislukt());
    const a = await t.ctx.uploadDocument(FASE, t.bestand('syn-r2.txt'));
    const b = await t.ctx.uploadDocument(FASE, t.bestand('syn-db.txt'));
    check(a.soort === 'mislukt' && t.doc('doc_syn_r2') && !/download\/doc_syn_r2/.test(t.log.html), 'STORAGE_FAILED: rij met doc_id en status, maar geen downloadlink (bestand niet opgeslagen)');
    check(b.soort === 'mislukt' && t.docs().length === 1 && t.log.toasts.some((x) => /niet worden geregistreerd/.test(x.msg)), 'REGISTRATIE_MISLUKT zonder doc_id: geen fictieve rij, wel de concrete fouttekst');
  });

  await probeer('NEEDS_REVIEW', async () => {
    const t = laad(root);
    t.begin();
    t.ctx.S._entiteiten = [{ id: 'ent_syn_1', naam: 'Synth Werk BV' }, { id: 'ent_syn_2', naam: 'Synth Holding BV' }];
    t.renderApp();
    t.opzet.upload.push(ANTW.review('doc_syn_review', { entiteit_naam: 'Synth Werk BV' }));
    const u = await t.ctx.uploadDocument(FASE, t.bestand('syn-ander.txt'));
    const d = t.doc('doc_syn_review');
    check(u.soort === 'controle' && d && d.verwerking_status === 'NEEDS_REVIEW', 'NEEDS_REVIEW: uitkomst "controle nodig", status bewaard');
    check(t.log.autoFill.length === 0 && t.log.overig.every((x) => x.indexOf('koppel-entiteit') < 0), 'NEEDS_REVIEW: geen veldinvulling en geen automatische entiteitkoppeling (ook niet bij een exacte naam)');
    check(d && Object.keys(d.velden).length === 0 && d.analyse === '', 'NEEDS_REVIEW: geen velden/analyse van het foutdocument in de cache');
    check(/Controle nodig/.test(t.log.html) && /lijkt niet bij dit traject/.test(t.log.html) && !/>Geanalyseerd</.test(t.log.html) && !/Handmatig koppelen/.test(t.log.html) && !/fd-ent-doc_syn_review/.test(t.log.html), 'NEEDS_REVIEW: label + reden, geen succes- of koppel-UI');
  });

  await probeer('timeout/netwerk/JSON/lokaal', async () => {
    const t = laad(root);
    t.begin();
    t.opzet.snelleTimeout = true;
    t.opzet.upload.push({ hangt: true });
    const a = await t.ctx.uploadDocument(FASE, t.bestand('syn-traag.txt'));
    check(a.soort === 'onbekend' && /60 seconden/.test(a.tekst) && /onbekend/.test(a.tekst), 'timeout (echte fetchMetTimeout-abort): uitkomst onbekend, geen verbindingsfout');
    check(t.log.requests.length === 1 && t.docs().length === 0 && t.log.lijst.length === 1, 'timeout: geen fictief document, geen automatische tweede upload, lijst wordt herladen');
    await wacht(10);

    t.begin();
    t.opzet.upload.push({ netwerk: true });
    const b = await t.ctx.uploadDocument(FASE, t.bestand('syn-net.txt'));
    check(b.soort === 'onbekend' && /Geen verbinding met de server/.test(b.tekst) && t.log.lijst.length === 1, 'netwerkfout: "Geen verbinding" + uitkomst onbekend + lijst herladen');
    await wacht(10);

    t.begin();
    t.opzet.upload.push({ status: 200, ongeldigeJson: true });
    const c = await t.ctx.uploadDocument(FASE, t.bestand('syn-json.txt'));
    check(c.soort === 'onbekend' && /onleesbaar/.test(c.tekst) && !t.verbindingsToast(), 'ongeldige JSON: "antwoord onleesbaar", geen verbindingsfout');
    await wacht(10);

    t.begin();
    t.opzet.autoFillGooit = true;
    t.opzet.upload.push(ANTW.processed('doc_syn_lokaal'));
    // Het herladen na de lokale fout levert het op de server vastgelegde document (vorm worker/15).
    t.opzet.lijst.push({ status: 200, body: [{ id: 'doc_syn_lokaal', bestand_naam: 'syn-lokaal.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: 'Synthetische analyse.', veld_extractie: '{"omzet":"1000000"}', methode: 'ai_text', uploaded_at: 1, fase_id: FASE, versie: 1, verwerking_status: 'PROCESSED', verwerking_stap: 'afgerond', verwerking_fout: null, verwerking_reden: null, inhoud_hash: 'a'.repeat(64), bestand_opgeslagen: true }] });
    const d = await t.ctx.uploadDocument(FASE, t.bestand('syn-lokaal.txt'));
    check(d.soort === 'lokale_fout' && /in dit scherm is mislukt/.test(d.tekst) && !t.verbindingsToast(), 'lokale verwerkingsfout: eigen melding, geen verbindingsfout');
    await wacht(10);
    check(t.doc('doc_syn_lokaal') && t.log.requests.length === 1 && t.log.lijst.length === 1, 'lokale verwerkingsfout: het op de server vastgelegde document staat (na herladen) in de lijst, geen herhaalde upload');
  });

  await probeer('batch', async () => {
    const t = laad(root);
    t.begin();
    const u4 = t.uitgesteld();
    t.opzet.upload.push(ANTW.processed('doc_b1'), ANTW.aiFailed('doc_b2'), ANTW.review('doc_b3'), { uitgesteld: u4 });
    const namen = ['syn-b1.txt', 'syn-b2.txt', 'syn-b3.txt', 'syn-b4.txt', 'syn-b5.txt'];
    const fl = { length: 5 };
    namen.forEach((n, i) => { fl[i] = t.bestand(n); });
    const p = t.ctx.uploadDocumentenSequentieel(FASE, fl);
    // Zoals de aanroeper (input.value='') de FileList leegmaakt: de kopie moet blijven.
    fl.length = 0; for (let i = 0; i < 5; i++) delete fl[i];
    const opts4 = await u4.binnen;
    t.renderApp();
    check(/Annuleer resterende bestanden \(1\)/.test(t.log.html), 'batch: tijdens het lopende bestand staat "Annuleer resterende bestanden (1)" in beeld');
    t.ctx.annuleerResterendeUploads(FASE);
    const lopend = t.docs().find((d) => d.naam === 'syn-b4.txt');
    check(lopend && lopend.uploading && !lopend.geannuleerd && !t.docs().some((d) => d.naam === 'syn-b5.txt'), 'batch: annuleren raakt het lopende bestand niet, alleen het nog niet gestarte');
    check(!opts4.signal.aborted, 'batch: het lopende verzoek wordt niet afgebroken');
    u4.geef(ANTW.processed('doc_b4'));
    const uit = await p;
    const soorten = uit.items.map((x) => x.soort).join(',');
    check(t.log.requests.length === 4, 'batch: 4 verzoeken (fout bij bestand 2 hield 3 en 4 niet tegen; 5 nooit verstuurd)');
    check(soorten === 'verwerkt,mislukt,controle,verwerkt,niet_aangeboden', 'batch: uitkomst per bestand behouden · ' + soorten);
    check(/5 bestand\(en\) gekozen, 4 aangeboden: 2 geanalyseerd en verwerkt, 1 controle nodig, 1 mislukt · 1 niet aangeboden\./.test(uit.samenvatting), 'batch: samenvatting aangeboden/verwerkt/controle/mislukt/niet aangeboden · ' + uit.samenvatting);
    check(t.doc('doc_b4') && t.doc('doc_b2') && t.doc('doc_b3') && t.doc('doc_b1') && !t.docs().some((d) => d.uploading), 'batch: alle aangeboden bestanden met eigen rij (incl. het tijdens annuleren lopende), geen wachtrij-plek achtergebleven');
    check(t.ingevuld() === 2, 'batch: alleen de twee PROCESSED-bestanden vullen velden in (' + t.ingevuld() + ')');
    check(/syn-b5\.txt: Geannuleerd vóór verzending/.test(t.log.html) && /syn-b4\.txt: Geanalyseerd en verwerkt/.test(t.log.html), 'batch: overzicht per bestand zichtbaar in de documentensectie');
  });

  await probeer('uitloggen tijdens batch', async () => {
    const t = laad(root);
    t.begin();
    const u1 = t.uitgesteld();
    t.opzet.upload.push({ uitgesteld: u1 }, ANTW.processed('doc_x2'));
    const p = t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-x1.txt'), t.bestand('syn-x2.txt')]);
    await u1.binnen;
    Object.keys(t.ctx.DOCS).forEach((k) => { delete t.ctx.DOCS[k]; });
    t.ctx.S = { code: '', rol: '', traject: null, data: {} };
    u1.geef(ANTW.processed('doc_x1'));
    await p;
    check(t.log.requests.length === 1 && Object.keys(t.ctx.DOCS).length === 0 && t.log.autoFill.length === 0, 'uitloggen: geen volgende upload, niets in de nieuwe sessie geschreven of ingevuld');
  });

  // Uitloggen en direct opnieuw inloggen met DEZELFDE code terwijl een upload loopt: uitloggen() en de
  // login maken elk een nieuw S-object; het oude antwoord (succes of fout) mag de nieuwe sessie niet raken.
  const zelfdeCodeOpnieuw = async (naam, oudAntwoord) => {
    const t = laad(root);
    t.begin();
    const u1 = t.uitgesteld();
    t.opzet.upload.push({ uitgesteld: u1 }, ANTW.processed('doc_z2'));
    const p = t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-z1.txt'), t.bestand('syn-z2.txt')]);
    await u1.binnen;
    Object.keys(t.ctx.DOCS).forEach((k) => { delete t.ctx.DOCS[k]; });
    t.ctx.S = { code: '', rol: '', traject: null, data: {} };
    const nieuweS = { code: CODE, rol: 'verkoper', traject: { status: 'actief', bewaar_docs: true }, _entiteiten: [], data: { financieel_omzet: '777' } };
    t.ctx.S = nieuweS;
    const nieuwDoc = { id: 'doc_nieuw_1', naam: 'syn-nieuw.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1, verwerking_status: 'PROCESSED' };
    t.ctx.DOCS[FASE] = [nieuwDoc];
    t.log.toasts = []; t.log.html = '';
    const saveVoor = t.log.saveAll;
    u1.geef(oudAntwoord);
    const uit = await p;
    await wacht(10);
    check(t.log.requests.length === 1, naam + ': de volgende oude batchupload start niet');
    check(t.ctx.DOCS[FASE].length === 1 && t.ctx.DOCS[FASE][0] === nieuwDoc && Object.keys(t.ctx.DOCS).length === 1, naam + ': nieuwe DOCS ongewijzigd (geen oude rij of wachtrij-plek)');
    check(t.log.autoFill.length === 0 && t.ctx.S === nieuweS && JSON.stringify(nieuweS.data) === '{"financieel_omzet":"777"}' && !nieuweS._uploadUitkomst, naam + ': geen financiële autofill, nieuwe invoer en status onaangeroerd');
    check(t.log.toasts.length === 0 && t.log.html === '' && t.log.lijst.length === 0 && t.log.saveAll === saveVoor, naam + ': geen toast, render, lijstherlaad of opslag in de nieuwe sessie');
    check(uit.items.length === 1 && uit.items[0].soort === 'onbekend' && /opnieuw ingelogd/.test(uit.items[0].tekst) && /op de server zijn opgeslagen/.test(uit.items[0].tekst) && !/geannuleerd/i.test(uit.items[0].tekst), naam + ': eerlijke uitkomst voor het oude bestand (mogelijk opgeslagen, niet geannuleerd)');
  };
  await probeer('opnieuw inloggen zelfde code, oud succes', () => zelfdeCodeOpnieuw('zelfde code + oud succes', ANTW.processed('doc_z1')));
  await probeer('opnieuw inloggen zelfde code, oude fout', () => zelfdeCodeOpnieuw('zelfde code + oude fout', ANTW.aiFailed('doc_z1')));

  await probeer('centrale upload, opnieuw inloggen zelfde code', async () => {
    const t = laad(root);
    t.begin();
    const u1 = t.uitgesteld();
    t.opzet.upload.push({ uitgesteld: u1 }, ANTW.processed('doc_c2'));
    const p = t.ctx.centraalUploadFiles([t.bestand('syn-jaarcijfers.txt'), t.bestand('syn-loonlijst.txt')]);
    await u1.binnen;
    Object.keys(t.ctx.DOCS).forEach((k) => { delete t.ctx.DOCS[k]; });
    t.ctx.S = { code: CODE, rol: 'verkoper', traject: { status: 'actief', bewaar_docs: true }, _entiteiten: [], data: { financieel_omzet: '777' } };
    const saveVoor = t.log.saveAll;
    u1.geef(ANTW.processed('doc_c1'));
    await p;
    await wacht(10);
    check(t.log.requests.length === 1 && t.log.saveAll === saveVoor && t.log.autoFill.length === 0 && Object.keys(t.ctx.DOCS).length === 0, 'centrale upload + zelfde code: geen volgende fasebatch, geen opslag/autofill in de nieuwe sessie');
  });

  await probeer('vervangen', async () => {
    const t = laad(root);
    const oud = { id: 'doc_oud_9', naam: 'syn-oud.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1, verwerking_status: 'PROCESSED' };
    t.begin([oud]);
    const vervang = async (antw) => {
      t.opzet.upload.push(antw);
      t.ctx.vervangDocument(FASE, 'doc_oud_9');
      t.ctx._laatsteKiezer.files = [t.bestand('syn-nieuw.txt')];
      t.ctx._laatsteKiezer.onchange();
      await wacht(15);
    };
    await vervang(ANTW.aiFailed('doc_v_fail'));
    check(t.doc('doc_oud_9') && t.doc('doc_v_fail') && /[?&]vervangt=doc_oud_9(&|$)/.test(t.log.requests[0].url), 'vervangen mislukt (502): oude versie blijft lokaal staan naast het mislukte record');
    await vervang(ANTW.review('doc_v_review'));
    check(t.doc('doc_oud_9') && t.doc('doc_v_review'), 'vervangen NEEDS_REVIEW: oude versie blijft lokaal staan');
    check(t.log.autoFill.length === 0, 'vervangen mislukt/NEEDS_REVIEW: geen veldinvulling');
    await vervang(ANTW.processed('doc_v_ok', { versie: 2 }));
    check(!t.doc('doc_oud_9') && t.doc('doc_v_ok') && t.doc('doc_v_ok').heeft_eerdere_versies, 'vervangen PROCESSED: pas dan verdwijnt de oude versie uit de weergave');
  });

  await probeer('lijst', async () => {
    const t = laad(root);
    const cache = { id: 'doc_cache_1', naam: 'syn-cache.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1 };
    t.begin([cache]);
    t.opzet.lijst.push({ status: 503, body: { error: 'Documentenlijst tijdelijk niet beschikbaar' } });
    t.ctx.loadDocsForFase(FASE);
    await wacht(10);
    check(t.docs().length === 1 && t.doc('doc_cache_1'), 'lijst 503: bestaande cache blijft staan (geen lege lijst)');
    check(/Documentenlijst tijdelijk niet beschikbaar/.test(t.log.html) && /Opnieuw laden/.test(t.log.html), 'lijst 503: fout zichtbaar met "Opnieuw laden"');
    delete t.ctx.DOCS[FASE];
    t.opzet.lijst.push({ status: 503, body: { error: 'Documentenlijst tijdelijk niet beschikbaar' } });
    t.ctx.loadDocsForFase(FASE);
    await wacht(10);
    check(t.ctx.DOCS[FASE] === undefined, 'lijst 503 zonder cache: geen fictieve lege lijst gezet (volgende fasebezoek laadt opnieuw)');
    t.opzet.lijst.push({ status: 200, body: [
      { id: 'doc_legacy', bestand_naam: 'syn-legacy.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: 'Oude analyse.', veld_extractie: '{"omzet":"5"}', methode: 'ai_text', uploaded_at: 1, fase_id: FASE, versie: 1 },
      { id: 'doc_rev', bestand_naam: 'syn-rev.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: 'Tekst van een verkeerd document.', veld_extractie: '{}', methode: 'verworpen', uploaded_at: 2, fase_id: FASE, versie: 1, verwerking_status: 'NEEDS_REVIEW', verwerking_fout: 'ENTITY_MISMATCH', verwerking_reden: 'Synthetische reden.', bestand_opgeslagen: true },
    ] });
    t.ctx.loadDocsForFase(FASE);
    await wacht(10);
    const leg = t.doc('doc_legacy'), rev = t.doc('doc_rev');
    check(leg && !leg.verwerking_status && leg.analyse === 'Oude analyse.' && leg.bestand_opgeslagen === undefined, 'lijst: legacy-rij zonder status blijft onbekend (geen statuslabel, bestaande gegevens)');
    check(rev && rev.analyse === '' && Object.keys(rev.velden).length === 0, 'lijst: NEEDS_REVIEW-rij levert geen analyse/velden aan de app');
    check(!/Documentenlijst tijdelijk niet beschikbaar/.test(t.log.html), 'lijst: foutmelding verdwijnt na een geslaagde lading');
  });

  // Lijstlading loopt nog terwijl de gebruiker uitlogt en direct opnieuw inlogt (nieuw S-object, DOCS
  // geleegd). Het oude antwoord (succes, HTTP-fout, ongeldige JSON, netwerkfout) mag de nieuwe sessie
  // niet raken — ook niet bij dezelfde code — en bij een andere code evenmin.
  const lijstNaOpnieuwInloggen = async (naam, oudAntwoord, nieuweCode) => {
    const t = laad(root);
    t.begin([{ id: 'doc_oud_cache', naam: 'syn-oud-cache.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1 }]);
    const u = t.uitgesteld();
    t.opzet.lijst.push({ uitgesteld: u });
    t.ctx.loadDocsForFase(FASE);
    await u.binnen;
    Object.keys(t.ctx.DOCS).forEach((k) => { delete t.ctx.DOCS[k]; });
    t.ctx.S = { code: '', rol: '', traject: null, data: {} };
    const nieuweS = { code: nieuweCode, rol: 'verkoper', traject: { status: 'actief', bewaar_docs: true }, _entiteiten: [], data: { financieel_omzet: '777' }, _docsLaadFout: { [FASE]: 'Synthetische fout van de nieuwe sessie.' } };
    t.ctx.S = nieuweS;
    const nieuwDoc = { id: 'doc_nieuw_lijst', naam: 'syn-nieuw.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1, verwerking_status: 'PROCESSED' };
    t.ctx.DOCS[FASE] = [nieuwDoc];
    t.log.toasts = []; t.log.html = ''; t.log.autoFill = [];
    const saveVoor = t.log.saveAll;
    u.geef(oudAntwoord);
    await wacht(10);
    check(t.ctx.DOCS[FASE].length === 1 && t.ctx.DOCS[FASE][0] === nieuwDoc && Object.keys(t.ctx.DOCS).length === 1, naam + ': nieuwe DOCS ongewijzigd (oude lijst vervangt niets)');
    check(t.ctx.S === nieuweS && JSON.stringify(nieuweS._docsLaadFout) === JSON.stringify({ [FASE]: 'Synthetische fout van de nieuwe sessie.' }), naam + ': foutstatus van de nieuwe sessie niet gezet, overschreven of gewist');
    check(JSON.stringify(nieuweS.data) === '{"financieel_omzet":"777"}' && t.log.autoFill.length === 0 && t.log.saveAll === saveVoor, naam + ': handmatige financiële invoer onaangeroerd, geen autofill of opslag');
    check(t.log.html === '' && t.log.toasts.length === 0 && t.log.lijst.length === 1, naam + ': geen render, toast of extra lijstlading in de nieuwe sessie');
  };
  const oudeLijst = { status: 200, body: [{ id: 'doc_oud_lijst', bestand_naam: 'syn-oud-lijst.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: 'Oude analyse.', veld_extractie: '{"omzet":"1"}', methode: 'ai_text', uploaded_at: 1, fase_id: FASE, versie: 1, verwerking_status: 'PROCESSED', bestand_opgeslagen: true }] };
  await probeer('lijst, zelfde code, oud succes', () => lijstNaOpnieuwInloggen('lijst zelfde code + oud succes', oudeLijst, CODE));
  await probeer('lijst, zelfde code, oude HTTP-fout', () => lijstNaOpnieuwInloggen('lijst zelfde code + oude HTTP-fout', { status: 503, body: { error: 'Oude synthetische lijstfout' } }, CODE));
  await probeer('lijst, zelfde code, oude JSON-fout', () => lijstNaOpnieuwInloggen('lijst zelfde code + oude JSON-fout', { status: 200, ongeldigeJson: true }, CODE));
  await probeer('lijst, zelfde code, oude netwerkfout', () => lijstNaOpnieuwInloggen('lijst zelfde code + oude netwerkfout', { netwerk: true }, CODE));
  await probeer('lijst, andere code, oud succes', () => lijstNaOpnieuwInloggen('lijst andere code + oud succes', oudeLijst, 'SYN-ANDERE-CODE'));

  await probeer('lijst, zelfde sessie, uitgesteld', async () => {
    // Positieve controle: binnen dezelfde sessie wordt een vertraagd antwoord gewoon verwerkt en blijft
    // een lokale, nog lopende upload van dit traject in de lijst staan.
    const t = laad(root);
    const lokaal = { id: 'tmp_syn_1', naam: 'syn-lopend.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, uploading: true, traject_code: CODE };
    t.begin([lokaal]);
    const u = t.uitgesteld();
    t.opzet.lijst.push({ uitgesteld: u });
    t.ctx.loadDocsForFase(FASE);
    await u.binnen;
    u.geef(oudeLijst);
    await wacht(10);
    check(t.docs().length === 2 && t.docs()[0] === lokaal && t.doc('doc_oud_lijst'), 'lijst zelfde sessie: vertraagd antwoord verwerkt, lokale uploadwachtrij behouden');
  });

  await probeer('XSS', async () => {
    const t = laad(root);
    t.begin();
    const kwaad = '<img src=x onerror=alert(1)>.txt';
    const fail = ANTW.aiFailed('doc_xss');
    fail.body.error = '<script>alert(2)</script>';
    t.opzet.upload.push(fail);
    await t.ctx.uploadDocument(FASE, t.bestand(kwaad));
    check(!/<img src=x/.test(t.log.html) && !/<script>/.test(t.log.html) && /&lt;img src=x/.test(t.log.html) && /&lt;script&gt;/.test(t.log.html), 'XSS: bestandsnaam en servertekst worden ge-escaped weergegeven');
  });

  await probeer('centrale upload', async () => {
    const t = laad(root);
    t.begin();
    t.opzet.upload.push(ANTW.processed('doc_c1'), ANTW.review('doc_c2'));
    await t.ctx.centraalUploadFiles([t.bestand('syn-jaarcijfers.txt'), t.bestand('syn-loonlijst.txt')]);
    const urls = t.log.requests.map((r) => r.url);
    check(urls.length === 2 && /fase_id=financieel/.test(urls[0]) && /fase_id=partner/.test(urls[1]), 'centraal: bestaande bestandsnaamindeling ongewijzigd, via dezelfde uploadroute');
    check(t.ctx.S._uploadUitkomst.partner && /1 controle nodig/.test(t.ctx.S._uploadUitkomst.partner.samenvatting) && !/verwerkt/.test(t.ctx.S._uploadUitkomst.partner.samenvatting), 'centraal: NEEDS_REVIEW telt als "controle nodig", niet als verwerkt');
    check(t.ingevuld() === 1, 'centraal: alleen het PROCESSED-bestand vult velden in (' + t.ingevuld() + ')');
  });

  await probeer('dataroom', async () => {
    const t = laad(root);
    t.begin();
    t.ctx.S.dataroom = null;
    t.opzet.lijst.push({ status: 503, body: { error: 'Documentenlijst tijdelijk niet beschikbaar' } });
    await t.ctx.loadDataroom();
    const html = t.ctx.renderDataroom();
    check(/Documentenlijst tijdelijk niet beschikbaar/.test(html) && !/Geen documenten opgeslagen/.test(html), 'dataroom 503: foutmelding in plaats van "Geen documenten opgeslagen"');
    t.opzet.lijst.push({ status: 200, body: [
      { id: 'dr_ok', bestand_naam: 'syn-ok.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, fase_id: FASE, verwerking_status: 'PROCESSED', bestand_opgeslagen: true },
      { id: 'dr_fail', bestand_naam: 'syn-fail.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, fase_id: FASE, verwerking_status: 'FAILED', bestand_opgeslagen: false },
    ] });
    await t.ctx.loadDataroom();
    const html2 = t.ctx.renderDataroom();
    check(/syn-ok\.txt/.test(html2) && !/syn-fail\.txt/.test(html2) && /1 document\(en\) met een verwerkingsprobleem/.test(html2), 'dataroom: mislukt document niet als opgeslagen document getoond, wel benoemd');
  });

  // ── Productpunt 19: autosave bevestigt alleen wat de server werkelijk heeft opgeslagen ──────────
  await probeer('autosave: echte functies', async () => {
    const t = laadAutosave(root);
    check(typeof t.ctx.saveAll === 'function' && typeof t.ctx.markDirty === 'function' && t.intervals.length === 1 && t.intervals[0].ms === 30000 && ['visibilitychange', 'pagehide', 'beforeunload'].every((k) => typeof t.handlers[k] === 'function'), 'autosave: echte saveAll/markDirty, 30s-interval en visibilitychange/pagehide/beforeunload uit mna/02 geladen (geen stub)');
  });

  await probeer('autosave: pending → succes', async () => {
    const t = laadAutosave(root); const S = t.ctx.S;
    t.renderApp(); t.typ('omzet', '234567');
    t.autosave();
    const r = t.log.req[0];
    check(t.log.req.length === 1 && r.url === WORKER + '/mna/save' && r.body.data_json.omzet.value === '234567', 'autosave: 30s-interval verstuurt de actuele invoer via de bestaande /mna/save');
    check(S._dirty === true && t.ctx._lastSavedHash === '' && t.log.groen.length === 0 && t.log.toasts.length === 0, 'pending: vóór het HTTP-antwoord blijft S dirty, _lastSavedHash ongewijzigd en geen "Auto-opgeslagen ✓"');
    t.autosave();
    check(t.log.req.length === 1, 'pending: een volgende intervaltik start geen tweede ronde zolang de vorige loopt');
    r.geef(200, OK_ACK); await t.flush();
    check(S._dirty === false && t.ctx._lastSavedHash === 'financieel_omzet=234567' && t.log.groen.join('|') === 'Auto-opgeslagen ✓' && t.log.toasts.length === 0, 'succes (HTTP 200 + JSON ok:true): pas dan schoon, hash = verstuurde stand en één "Auto-opgeslagen ✓"');
    t.autosave();
    check(t.log.req.length === 1, 'succes: schoon → geen nieuwe autosave');
  });

  for (const [naam, af] of [
    ['netwerkfout', (r) => r.netwerk()],
    ['ongeldige JSON', (r) => r.ongeldig(200)],
    ['lege body', (r) => r.leeg(200)],
    ['HTTP 500 met ok:true', (r) => r.geef(500, { ok: true })],
    ['HTTP 403 met fout', (r) => r.geef(403, { error: 'Geen toegang (synthetisch)' })],
    ['HTTP 200 ok:false', (r) => r.geef(200, { ok: false })],
    ['HTTP 200 onbekend antwoord {}', (r) => r.geef(200, {})],
    ['HTTP 200 null', (r) => r.geef(200, null)],
    ['HTTP 200 ok:true met error', (r) => r.geef(200, { ok: true, error: 'Synthetische fout' })],
    ['HTTP 200 vergrendeld', (r) => r.geef(200, { error: 'vergrendeld' })],
  ]) {
    await probeer('autosave: ' + naam, async () => {
      const t = laadAutosave(root); const S = t.ctx.S;
      t.renderApp(); t.typ('omzet', '234567');
      t.autosave();
      af(t.log.req[0]); await t.flush();
      check(S._dirty === true && t.ctx._lastSavedHash === '' && t.log.groen.length === 0, naam + ': blijft dirty, hash niet bijgewerkt, geen groen');
      check(t.log.toasts.length === 1 && /niet opgeslagen/.test(t.log.toasts[0]) && S.data.financieel_omzet === '234567', naam + ': één eerlijke melding "niet opgeslagen", invoer blijft staan · ' + t.log.toasts[0]);
      t.autosave();
      check(t.log.req.length === 2, naam + ': volgende intervaltik probeert het opnieuw (één verzoek per ronde)');
      t.log.req[1].geef(200, OK_ACK); await t.flush();
      check(S._dirty === false && t.log.groen.join('|') === 'Auto-opgeslagen ✓', naam + ': na een latere bevestiging wél schoon en groen');
    });
  }

  await probeer('autosave: meerdere fasen', async () => {
    const zet = () => { const t = laadAutosave(root); t.ctx.S.data.financieel_omzet = '234567'; t.ctx.S.data.juridisch_kvk = '12345678'; t.ctx.markDirty(); t.autosave(); return t; };
    const a = zet();
    check(a.log.req.length === 2 && a.log.req.map((r) => r.body.fase_id).join(',') === 'financieel,juridisch', 'meerdere fasen: één verzoek per fase met data');
    a.log.req[0].geef(200, OK_ACK); await a.flush();
    check(a.ctx.S._dirty === true && a.log.groen.length === 0 && a.ctx._lastSavedHash === '', 'meerdere fasen: eerste bevestiging alleen → nog dirty, geen groen');
    a.log.req[1].geef(503, { error: 'Tijdelijk niet beschikbaar (synthetisch)' }); await a.flush();
    check(a.ctx.S._dirty === true && a.log.groen.length === 0 && a.ctx._lastSavedHash === '' && a.log.toasts.length === 1 && /Tijdelijk niet beschikbaar/.test(a.log.toasts[0]), 'meerdere fasen, gedeeltelijke fout: dirty, geen groen, één concrete melding');
    const b = zet();
    b.log.req[0].netwerk(); await b.flush();
    b.log.req[1].geef(200, { ok: true, fase_id: 'juridisch', velden: 1 }); await b.flush();
    check(b.ctx.S._dirty === true && b.log.groen.length === 0 && b.log.toasts.length === 1, 'meerdere fasen, eerste faalt en tweede slaagt later: dirty, geen groen, één melding');
    const c = zet();
    c.log.req[1].geef(200, { ok: true, fase_id: 'juridisch', velden: 1 }); await c.flush();
    check(c.log.groen.length === 0 && c.ctx.S._dirty === true, 'meerdere fasen, omgekeerde volgorde: na de eerste bevestiging nog geen groen');
    c.log.req[0].geef(200, OK_ACK); await c.flush();
    check(c.ctx.S._dirty === false && c.log.groen.join('|') === 'Auto-opgeslagen ✓' && c.ctx._lastSavedHash === 'financieel_omzet=234567|juridisch_kvk=12345678', 'meerdere fasen: pas na ALLE bevestigingen schoon en één keer groen');
  });

  await probeer('autosave: nieuwere invoer tijdens pending', async () => {
    // (a) Notitie-invoer: schedSave → markDirty zonder dat de hash (S.data) verandert.
    const a = laadAutosave(root);
    a.renderApp(); a.typ('omzet', '234567'); a.autosave();
    const hashVoor = a.ctx._dataHash();
    a.ctx.schedSave();
    a.log.req[0].geef(200, OK_ACK); await a.flush();
    check(a.ctx._dataHash() === hashVoor && a.ctx.S._dirty === true && a.ctx._lastSavedHash === '' && a.log.groen.length === 0, 'nieuwere edit met dezelfde hash (markDirty vóór de DOM in S.data staat): oude bevestiging maakt niet schoon, geen groen');
    // (b) Dezelfde waarde opnieuw getypt: hash gelijk, toch een nieuwe edit.
    const b = laadAutosave(root);
    b.renderApp(); b.typ('omzet', '234567'); b.autosave();
    b.typ('omzet', '234567');
    b.log.req[0].geef(200, OK_ACK); await b.flush();
    check(b.ctx.S._dirty === true && b.log.groen.length === 0, 'zelfde waarde opnieuw ingevoerd tijdens pending: blijft dirty');
    // (c) Andere waarde tijdens pending: blijft dirty; de volgende ronde verstuurt en bevestigt de nieuwe waarde.
    const c = laadAutosave(root);
    c.renderApp(); c.typ('omzet', '234567'); c.autosave();
    c.typ('omzet', '2345678');
    c.log.req[0].geef(200, OK_ACK); await c.flush();
    check(c.ctx.S._dirty === true && c.log.groen.length === 0 && c.ctx.S.data.financieel_omzet === '2345678', 'andere waarde tijdens pending: blijft dirty, nieuwe invoer intact');
    c.autosave();
    c.log.req[1].geef(200, OK_ACK); await c.flush();
    check(c.log.req[1].body.data_json.omzet.value === '2345678' && c.ctx.S._dirty === false && c.ctx._lastSavedHash === 'financieel_omzet=2345678' && c.log.groen.length === 1, 'volgende ronde verstuurt en bevestigt de nieuwe waarde');
  });

  for (const [naam, wissel] of [
    ['nieuwe sessie zelfde code', (t) => { t.ctx.S = maakAutosaveS({ data: { financieel_omzet: '777' } }); t.ctx.S._dirty = true; t.ctx.S._dirtyRev = 0; }],
    ['nieuwe sessie andere rol', (t) => { t.ctx.S = maakAutosaveS({ rol: 'tussenpersoon', data: { financieel_omzet: '777' } }); t.ctx.S._dirty = true; t.ctx.S._dirtyRev = 0; }],
    ['rolwissel in dezelfde staat', (t) => { t.ctx.S.rol = 'tussenpersoon'; }],
  ]) {
    for (const [uitkomst, af] of [['succes', (r) => r.geef(200, OK_ACK)], ['fout', (r) => r.geef(500, { error: 'Oude synthetische fout' })]]) {
      await probeer('autosave: ' + naam + ', oud ' + uitkomst, async () => {
        const t = laadAutosave(root);
        t.renderApp(); t.typ('omzet', '234567'); t.autosave();
        wissel(t);
        const nieuw = t.ctx.S; const dataVoor = JSON.stringify(nieuw.data);
        af(t.log.req[0]); await t.flush();
        check(nieuw._dirty === true && t.ctx._lastSavedHash === '' && t.log.groen.length === 0 && t.log.toasts.length === 0 && JSON.stringify(nieuw.data) === dataVoor, naam + ' + oud ' + uitkomst + ': nieuwe S blijft dirty en ongewijzigd, geen groen of melding, hash niet bijgewerkt');
      });
    }
  }

  await probeer('autosave: late debouncetimer na sessiewissel', async () => {
    const t = laadAutosave(root);
    t.renderApp(); t.typ('omzet', '234567');
    t.ctx.S = maakAutosaveS({ data: { financieel_omzet: '777' } }); t.renderApp();
    const nieuw = t.ctx.S;
    t.timer(1200);
    check(!t.timer(800) && t.log.req.length === 0 && !nieuw._pendingSave && nieuw._dirty === undefined && nieuw.data.financieel_omzet === '777', 'late schedSave-timer van de oude sessie start geen saveCurrent in de nieuwe sessie (zelfde code)');
  });

  await probeer('autosave: beacon', async () => {
    const t = laadAutosave(root); const S = t.ctx.S;
    t.renderApp(); t.typ('omzet', '234567');
    t.handlers.pagehide();
    check(t.log.beacon.length === 1 && t.log.beacon[0].body.data_json.omzet.value === '234567' && t.log.req.length === 0, 'beacon: pagehide zet de actuele invoer in de beaconwachtrij');
    check(S._dirty === true && t.ctx._lastSavedHash === '' && t.log.groen.length === 0 && t.log.toasts.length === 0, 'beacon in de wachtrij is geen serverbevestiging: dirty blijft, hash ongewijzigd, geen groen');
    t.handlers.beforeunload(); t.handlers.pagehide();
    check(t.log.beacon.length === 1, 'beacon: geen herhaalde beaconronde voor dezelfde stand (beforeunload + pagehide)');
    t.typ('omzet', '2345678'); t.handlers.pagehide();
    check(t.log.beacon.length === 2 && t.log.beacon[1].body.data_json.omzet.value === '2345678', 'beacon: na een nieuwe wijziging hooguit één nieuwe ronde');
    t.opzet.beacon = () => false;
    t.typ('omzet', '3456789'); t.handlers.pagehide(); t.handlers.beforeunload();
    check(t.log.beacon.length === 3 && S._dirty === true && t.log.groen.length === 0 && t.ctx._lastSavedHash === '', 'beacon false: geen valse opslag, geen extra pogingen');
    t.opzet.beacon = () => { throw new Error('synthetische beaconfout'); };
    t.typ('omzet', '4567890');
    let fout = null; try { t.handlers.pagehide(); } catch (e) { fout = e; }
    check(!fout && t.log.beacon.length === 4 && S._dirty === true && t.log.groen.length === 0, 'beacon gooit: geen exceptie naar buiten, blijft dirty, geen groen');
    t.autosave();
    t.log.req[0].geef(200, OK_ACK); await t.flush();
    check(S._dirty === false && t.log.groen.length === 1, 'na beacon blijft de gewone autosave werken en bevestigt pas op het serverantwoord');
  });

  // Invoerbehoud vóór debounce: getypte waarde → hertekening vóór de 1200ms-timer → opslag → bevestiging.
  await probeer('invoer: hertekening vóór debounce', async () => {
    const t = laadAutosave(root); const S = t.ctx.S;
    t.renderApp(); t.typ('omzet', '234567');
    check(S.data.financieel_omzet === '234567' && S._userEdited.financieel_omzet === true, 'invoer: waarde direct in S.data van deze sessie/fase, gemarkeerd als handmatig');
    t.renderApp();
    check(t.dom.df_omzet.value === '234567', 'invoer: hertekening (39ms) vóór de 1200ms-timer tekent het veld mét de waarde');
    check(t.timer(1200) && t.timer(800) && t.log.req.length === 1, 'invoer: debounce → saveCurrent → één /mna/save');
    const body = t.log.req[0].body;
    check(body.fase_id === 'financieel' && body.data_json.omzet && body.data_json.omzet.value === '234567' && body.data_json.omzet.bron === 'handmatig', 'invoer: verzoek bevat exact 234567 met bron handmatig (geen lege financiële opslag)');
    check(t.log.groen.length === 0, 'invoer: geen "Opgeslagen ✓" vóór het antwoord');
    t.log.req[0].geef(200, OK_ACK); await t.flush();
    check(t.log.groen.join('|') === 'Opgeslagen ✓' && t.log.toasts.length === 0, 'invoer: "Opgeslagen ✓" pas na HTTP 200 + ok:true');
    for (const rol of ['verkoper', 'tussenpersoon']) {
      t.ctx.S = maakAutosaveS({ rol });
      t.ctx.loadDataFromDB(JSON.parse(JSON.stringify([{ fase_id: 'financieel', data_json: body.data_json, checklist_json: body.checklist_json, notitie: body.notitie }])));
      t.renderApp();
      check(t.ctx.S._groepData.financieel_omzet === '234567' && t.ctx.S._userEdited.financieel_omzet === true && t.dom.df_omzet.value === '234567', 'heropenen als ' + rol + ' (echte loadDataFromDB van de verstuurde rij): exact 234567, bron handmatig');
    }
  });

  for (const [naam, af] of [['HTTP 500', (r) => r.geef(500, { ok: true })], ['netwerkfout', (r) => r.netwerk()], ['ongeldige JSON', (r) => r.ongeldig(200)], ['lege body', (r) => r.leeg(200)], ['ok ontbreekt', (r) => r.geef(200, { velden: 1 })]]) {
    await probeer('invoer: opslagfout ' + naam, async () => {
      const t = laadAutosave(root); const S = t.ctx.S;
      t.renderApp(); t.typ('omzet', '234567'); t.renderApp();
      t.timer(1200); t.timer(800);
      af(t.log.req[0]); await t.flush();
      check(t.log.groen.length === 0 && t.log.toasts.length === 1 && /niet opgeslagen/.test(t.log.toasts[0]) && S.data.financieel_omzet === '234567' && S._dirty === true && t.dom.df_omzet.value === '234567', 'saveCurrent + ' + naam + ': geen "Opgeslagen ✓", eerlijke melding, invoer en dirty blijven');
    });
  }

  await probeer('invoer: annuleren/uitloggen vóór debounce', async () => {
    // uitloggen() annuleert de debouncetimer en roept saveAll() aan: de waarde staat al in S.data.
    const t = laadAutosave(root);
    t.renderApp(); t.typ('omzet', '234567');
    t.ctx.clearTimeout(t.ctx.S.saveTimer);
    t.ctx.saveAll();
    check(!t.timer(1200) && t.log.req.length === 1 && t.log.req[0].body.data_json.omzet.value === '234567', 'geannuleerde debounce: saveAll verstuurt toch exact 234567');
  });

  await probeer('invoer: entiteitwissel en groepsniveau', async () => {
    const dataA = {}, dataB = { financieel_omzet: '111' }, groep = { financieel_aantalPartners: '2' };
    const t = laadAutosave(root);
    t.ctx.S = maakAutosaveS({ data: dataA, _groepData: groep, dataPerEntiteit: { ENT_A: dataA, ENT_B: dataB }, _actieveEntiteit: 'ENT_A', _entiteiten: [{ id: 'ENT_A', naam: 'Alfa BV' }, { id: 'ENT_B', naam: 'Beta BV' }] });
    const S = t.ctx.S;
    t.renderApp(); t.typ('omzet', '234567');
    // Zoals switchEntiteit (mna/06): eerst saveCurrent() in de oude context, dan wisselen en hertekenen.
    t.ctx.saveCurrent(); S.data = dataB; S._actieveEntiteit = 'ENT_B'; t.renderApp();
    // (saveCurrent stuurt in entiteitcontext ook de groepsrij mee zodra een groepsniveau-veld een waarde heeft.)
    check(!t.timer(1200) && t.timer(800) && t.log.req[0].body.entiteit_id === 'ENT_A' && t.log.req[0].body.data_json.omzet.value === '234567' && t.log.req.slice(1).every((r) => r.body.entiteit_id === undefined && !r.body.data_json.omzet), 'entiteitwissel: de save gaat met exact 234567 naar de oude entiteit, niet naar de groepsrij');
    check(dataA.financieel_omzet === '234567' && dataB.financieel_omzet === '111' && t.dom.df_omzet.value === '111' && groep.financieel_omzet === undefined, 'entiteitwissel: geen overdracht naar de nieuwe entiteit of de groep');
    // Groepsniveau-veld in entiteitcontext: groen pas als entiteit- én groepsrij-save zijn bevestigd.
    const g = (groepAntwoord) => { const u = laadAutosave(root); u.ctx.S = maakAutosaveS({ data: { financieel_omzet: '5' }, _groepData: { financieel_aantalPartners: '2' }, _actieveEntiteit: 'ENT_A' }); u.renderApp(); u.typ('aantalPartners', '3'); u.timer(1200); u.timer(800); return u; };
    const ok = g();
    check(ok.ctx.S._groepData.financieel_aantalPartners === '3' && ok.ctx.S.data.financieel_aantalPartners === undefined && ok.log.req.length === 2 && ok.log.req[1].body.entiteit_id === undefined && ok.log.req[1].body.data_json.aantalPartners.value === '3', 'groepsniveau: invoer direct in S._groepData, entiteit- en groepsrij-save verstuurd');
    ok.log.req[0].geef(200, OK_ACK); await ok.flush();
    check(ok.log.groen.length === 0, 'groepsniveau: entiteitbevestiging alleen → nog geen groen');
    ok.log.req[1].geef(200, OK_ACK); await ok.flush();
    check(ok.log.groen.join('|') === 'Opgeslagen ✓' && ok.log.toasts.length === 0, 'groepsniveau: groen pas na beide bevestigingen');
    const fout = g();
    fout.log.req[0].geef(200, OK_ACK); fout.log.req[1].geef(500, { error: 'Synthetische groepsfout' }); await fout.flush();
    check(fout.log.groen.length === 0 && fout.log.toasts.length === 1 && /niet opgeslagen/.test(fout.log.toasts[0]), 'groepsniveau: groepsrij-save faalt → geen groen, eerlijke melding');
  });

  await probeer('invoer: rol- en vergrendelpoorten', async () => {
    for (const [naam, extra] of [['koper', { rol: 'koper' }], ['begeleider in Financieel', { rol: 'tussenpersoon' }], ['vergrendeld', { traject: { status: 'vergrendeld' } }]]) {
      const t = laadAutosave(root); t.ctx.S = maakAutosaveS(extra);
      t.renderApp(); t.typ('omzet', '234567');
      check(t.ctx.S.data.financieel_omzet === undefined, naam + ': invoer wordt niet in het datamodel gezet (zelfde poort als saveCurrent)');
    }
  });

  await probeer('invoer: late saveCurrent-bevestiging na sessiewissel', async () => {
    const t = laadAutosave(root);
    t.renderApp(); t.typ('omzet', '234567'); t.timer(1200); t.timer(800);
    t.ctx.S = maakAutosaveS({ data: { financieel_omzet: '777' } });
    const nieuw = t.ctx.S;
    t.log.req[0].geef(200, { ...OK_ACK, groepswaarden: { omzet: { value: '999' } } }); await t.flush();
    check(t.log.groen.length === 0 && t.log.toasts.length === 0 && nieuw._groepData.financieel_omzet === '777', 'oude bevestiging na sessiewissel (zelfde code): geen groen, geen melding, geen groepswaarden in de nieuwe sessie');
  });

  return res;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiDocumentProcessingUiChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n  ' + fout + ' van ' + res.length + ' checks gefaald.' : '\n  Alle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
