#!/usr/bin/env node
// Expliciete groepsdocumenten UI (productpunt 6, 10 okt 2026; GENERAL productpunt 7, 12 okt 2026, sectie 15).
//
// Draait de ECHTE module mna/12-documentclassificatie.js en de ECHTE uploadintegratie uit mna/02
// (leesUploadKeuzes, uploadDocumentenSequentieel, uploadDocument, vervangDocument, centraalUploadFiles,
// loadDocsForFase, renderDocumentSectie, toonVersieGeschiedenis) plus fetchMetTimeout (mna/01) in node:vm.
// renderApp tekent via de echte renderDocumentSectie en maakt elk invoerelement opnieuw (leeg) aan, zoals
// de browser bij innerHTML doet. fetch is een stub die de echte request-URL en body vastlegt. Antwoorden
// volgen de vorm van het gecommitte backendcontract (worker/43 publiekeClassificatie, worker/14/15).
// Geen netwerk, geen browser, geen live API, geen AI; alleen synthetische gegevens. Backend-live, staging,
// productie en echte documenten staan apart OPEN (docs/group-documents-ui.md).
//
// Gebruik: node tests/group-documents-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 30).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const FASE = 'financieel';
const ENT = () => [{ id: 'ENT_SYN_A', naam: 'Alfa <img src=x onerror=alert(1)> BV' }, { id: 'ENT_SYN_B', naam: 'Beta BV' }];
const BINDING = 'f'.repeat(64);

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function knip(src, begin, eind) {
  const a = src.indexOf(begin);
  const b = a < 0 ? -1 : src.indexOf(eind, a);
  if (a < 0 || b < 0) throw new Error('niet gevonden in bron: ' + begin);
  return src.slice(a, b + eind.length);
}
function regel(src, re, naam) { const m = src.match(re); if (!m) throw new Error('niet gevonden in bron: ' + naam); return m[0]; }
function maakEl(id) { return { id, checked: false, value: '', textContent: '', style: {}, files: null, onchange: null, remove() {}, click() {} }; }

// Serverweergave zoals worker/43 publiekeClassificatie.
function dto(scope, statement, label, datatype, entiteit_id = null, extra = {}) {
  const fy = /^FY(\d{4})$/.exec(label);
  const br = /^(.+)\/(.+)$/.exec(label);
  const periode = fy ? { soort: 'BOEKJAAR', label, boekjaar: Number(fy[1]), begin: null, eind: null } : { soort: 'DATUMBEREIK', label, boekjaar: null, begin: br[1], eind: br[2] };
  return { scope, statement, periode, datatype, entiteit_id, herkomst: 'GEBRUIKER', officiele_consolidatie: false, realisatie_toepasbaar: datatype === 'ACTUAL' && !!fy, ...extra };
}
const ANTW = {
  processed: (docId, extra = {}) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: 'Synthetische analyse.', veld_extractie: { omzet: '1000000' }, r2_opgeslagen: true, verworpen: false, crosschecks: [], entiteit_naam: null, versie: 1, verwerking_status: 'PROCESSED', fout: null, geanalyseerd: true, inhoud_hash: 'a'.repeat(64), ...extra } }),
  geenJaar: (docId, klas) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: '', veld_extractie: {}, r2_opgeslagen: true, verworpen: true, verworpen_reden: 'Het bestand is opgeslagen met de opgegeven classificatie, maar is geen volledige jaarrealisatie (ACTUAL over een volledig jaar). Er zijn geen gegevens automatisch overgenomen; beoordeel het document handmatig.', crosschecks: [], entiteit_naam: null, versie: 1, verwerking_status: 'NEEDS_REVIEW', fout: 'GEEN_JAARREALISATIE', geanalyseerd: false, inhoud_hash: 'b'.repeat(64), documentclassificatie: klas } }),
  stored: (docId, klas) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: '', r2_opgeslagen: true, verworpen: false, alleen_bewijsstuk: true, versie: 1, verwerking_status: 'STORED', geanalyseerd: false, inhoud_hash: 'c'.repeat(64), documentclassificatie: klas } }),
  geweigerd: (fout, tekst) => ({ status: 400, body: { ok: false, error: tekst, fout, geregistreerd: false, bestand_opgeslagen: false } }),
};

function laad(root, { rol = 'verkoper', code = 'VSYN0001', vergrendeld = false, entiteiten = ENT(), metModule = true } = {}) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src12 = lees(root, 'mna/12-documentclassificatie.js');
  const delen = [
    regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'),
    regel(src02, /^function isVerkoper\(\)\{.*\}$/m, 'isVerkoper'),
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
    knip(src02, 'window.toonVersieGeschiedenis = async function(docId) {', '\n};\n'),
  ];
  const els = {};
  const log = { renders: 0, requests: [], overig: [], autoFill: 0, toasts: [], html: '', fase: FASE, modals: [] };
  const opzet = { upload: [], lijst: [], versies: [] };

  // renderApp: echte renderDocumentSectie; elk invoerelement ontstaat opnieuw met de stand uit de HTML.
  function renderApp() {
    log.renders++;
    const html = ctx.renderDocumentSectie(log.fase);
    log.html = html;
    for (const k of Object.keys(els)) delete els[k];
    for (const m of html.matchAll(/<input type="checkbox" id="([^"]+)"([^>]*)>/g)) { const el = maakEl(m[1]); el.checked = /\schecked[\s>=]/.test(m[2] + '>'); els[m[1]] = el; }
    for (const m of html.matchAll(/<input type="(?:number|date)" id="([^"]+)"/g)) els[m[1]] = maakEl(m[1]);
    for (const m of html.matchAll(/<div id="((?:upload-status|doc-klas-velden)-[^"]+)"/g)) els[m[1]] = maakEl(m[1]);
    for (const m of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) { const sel = m[2].match(/<option value="([^"]*)"[^>]*\sselected/); const el = maakEl(m[1]); el.value = sel ? sel[1] : ''; els[m[1]] = el; }
  }
  const antwoord = (a) => {
    if (a && a.uitgesteld) return a.uitgesteld.belofte;
    const x = a || ANTW.processed('doc_syn_' + (log.requests.length + 1));
    return Promise.resolve({ ok: x.status >= 200 && x.status < 300, status: x.status, json: () => Promise.resolve(JSON.parse(JSON.stringify(x.body))) });
  };
  const fetch = (url, opts = {}) => {
    const u = String(url);
    if (u.indexOf(WORKER + '/mna/document/upload?') === 0) {
      log.requests.push({ url: u, body: opts.body, rendersVoorRequest: log.renders, paneelAanBijRequest: els['doc-klas-aan-' + FASE] ? els['doc-klas-aan-' + FASE].checked : null });
      return antwoord(opzet.upload.shift());
    }
    log.overig.push(u);
    if (u.indexOf(WORKER + '/mna/document/lijst/') === 0) return antwoord(opzet.lijst.shift() || { status: 200, body: [] });
    if (u.indexOf(WORKER + '/mna/document/versies/') === 0) return antwoord(opzet.versies.shift() || { status: 200, body: { ok: true, versies: [] } });
    return antwoord({ status: 200, body: { ok: true } });
  };
  const maakNode = () => ({ style: {}, innerHTML: '', setAttribute() {}, appendChild() {}, querySelector() { return null; }, remove() {}, onclick: null });
  const ctx = vm.createContext({
    WORKER, DOCS: {}, FASES: [{ id: 'financieel', title: 'Financieel' }, { id: 'juridisch', title: 'Juridisch' }],
    S: { code, rol, traject: { status: vergrendeld ? 'vergrendeld' : 'actief', bewaar_docs: true }, _entiteiten: entiteiten, data: {} },
    document: {
      getElementById: (id) => els[id] || null,
      createElement: (tag) => { if (tag === 'input') { const el = maakEl('nieuw-input'); el.click = () => { ctx._laatsteKiezer = el; }; return el; } const n = maakNode(); log.modals.push(n); return n; },
      body: { appendChild() {} },
    },
    renderApp, fetch, FormData, AbortController, setTimeout, clearTimeout, console,
    toast: (msg, type) => log.toasts.push({ msg: String(msg), type }),
    autoFillFromExtraction: () => { log.autoFill++; },
    vergelijkDubbelePassOverigeVelden: () => [], toonConflictDialog() {},
    markDirty() {}, schedSave() {}, saveEntiteitData() {}, saveAll() {},
  });
  ctx.window = ctx;
  if (metModule) vm.runInContext(src12, ctx, { filename: 'mna/12-documentclassificatie.js' });
  vm.runInContext(delen.join('\n\n'), ctx, { filename: 'mna/01+02#group-documents-ui' });

  const bestand = (naam) => new File(['Synthetisch document (geen echte gegevens).'], naam, { type: 'text/plain' });
  const begin = (fase = FASE) => { log.fase = fase; ctx.DOCS[fase] = ctx.DOCS[fase] || []; log.renders = 0; log.requests = []; log.overig = []; log.autoFill = 0; log.toasts = []; renderApp(); };
  // Gebruiker zet het keuzeblok aan en vult het in (alleen de genoemde velden).
  const kies = (k = {}, fase = FASE) => {
    const zet = (n, v) => { if (v !== undefined && els['doc-klas-' + n + '-' + fase]) els['doc-klas-' + n + '-' + fase].value = v; };
    if (els['doc-klas-aan-' + fase]) els['doc-klas-aan-' + fase].checked = k.aan !== false;
    zet('scope', k.scope); zet('statement', k.statement); zet('periodesoort', k.soort); zet('boekjaar', k.boekjaar); zet('begin', k.begin); zet('eind', k.eind); zet('datatype', k.datatype);
    if (k.entiteit !== undefined && els['entiteit-select-' + fase]) els['entiteit-select-' + fase].value = k.entiteit;
  };
  return { ctx, els, log, opzet, begin, kies, bestand, renderApp };
}
const vollGroep = { scope: 'GROUP', statement: 'P&L', soort: 'BOEKJAAR', boekjaar: '2026', datatype: 'FORECAST' };
const QUERY_GROEP = '&doc_scope=GROUP&doc_statement=P%26L&doc_periode=FY2026&doc_datatype=FORECAST';
const wacht = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const weergaven = (html) => (html.match(/<div class="dcl-weergave"[\s\S]*?<\/div>/g) || []).join('\n');

export async function draaiGroupDocumentsUiChecks(root = process.cwd()) {
  const res = [];
  const check = (ok, msg) => res.push({ ok: !!ok, msg });
  const probeer = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.stack) || e)); } };
  const geenDocParams = (u) => !/[?&]doc_(scope|statement|periode|datatype)=/.test(u);
  const alleenFile = (b) => b && typeof b.keys === 'function' && [...b.keys()].join(',') === 'file';

  // 1. Bronbestanden: laadvolgorde, geen uitvoering bij laden, geen netwerk/opslag/AI in mna/12.
  await probeer('bron', async () => {
    const html = lees(root, 'mna.html'); const s12 = lees(root, 'mna/12-documentclassificatie.js');
    const i01 = html.indexOf('<script src="mna/01-config-sectorprofielen.js"></script>'), i12 = html.indexOf('<script src="mna/12-documentclassificatie.js"></script>'), i02 = html.indexOf('<script src="mna/02-state-opslag-documenten.js"></script>');
    check(i01 > 0 && i12 > i01 && i02 > i12, 'mna.html laadt mna/12 als gewone script na mna/01 en vóór mna/02');
    const code = s12.replace(/^\s*\/\/.*$/gm, '');
    check(!/fetch|XMLHttpRequest|WORKER|\/mna\/|anthropic|ai-proxy|localStorage|sessionStorage|sendBeacon|saveCurrent|schedSave/i.test(code), 'mna/12 doet geen netwerk-, opslag-, AI- of saveaanroep');
    check(!/\bS\.|\bS\[|\bDOCS\b/.test(code), 'mna/12 leest of schrijft S/DOCS niet (alle invoer via argumenten)');
    check(!/_documentclassificatie|binding/.test(code.replace(/geen ruwe _documentclassificatie, binding/g, '')), 'mna/12 verwijst niet naar het ruwe record of de binding');
    const leeg = vm.createContext({});
    let fout = null; try { vm.runInContext(s12, leeg); } catch (e) { fout = e; }
    check(!fout && typeof leeg.dclSnapshot === 'function' && typeof leeg.dclRenderPaneel === 'function', 'mna/12 laadt zonder S/document/mna/02 en voert bij het laden niets uit');
  });

  // 2. Pure helpers: periode, jaargrenzen, jaarrealisatie.
  await probeer('periode', async () => {
    const { ctx } = laad(root);
    const P = (v) => ctx.dclLeesPeriode(v);
    check(P('FY1990') && P('FY2100') && P('FY2026').boekjaar === 2026 && P('FY2026').begin === null, 'periode: FY1990 en FY2100 geldig, FY2026 bindt alleen het boekjaar');
    check(!P('FY1989') && !P('FY2101') && !P('FY26') && !P('fy2026') && !P('FY2026 ') && !P(2026) && !P(''), 'periode: buiten 1990–2100, verkort, kleine letters, spatie, getal en leeg geweigerd');
    check(P('2026-01-01/2026-12-31') && P('2024-03-01/2025-02-28') && P('2026-01-01/2026-06-30') && P('2026-05-05/2026-05-05'), 'periode: datumbereik tot maximaal één jaar geldig (ook deelperiode en één dag)');
    check(!P('2026-01-01/2027-01-01') && !P('2026-07-01/2026-06-30') && !P('2023-02-29/2023-12-31') && !P('2026-13-01/2026-12-31') && !P('1989-01-01/1989-12-31') && !P('2026-1-01/2026-12-31'), 'periode: langer dan een jaar, begin na eind, onbestaande datum en verkeerde opmaak geweigerd');
    const J = (dt, l) => ctx.dclIsJaarrealisatie(dt, P(l));
    check(J('ACTUAL', 'FY2026') && J('ACTUAL', '2026-01-01/2026-12-31') && J('ACTUAL', '2025-07-01/2026-06-30'), 'jaarrealisatie: alleen ACTUAL over boekjaar of exact één jaar');
    check(!J('ACTUAL', '2026-01-01/2026-06-30') && !J('YTD_ACTUAL', 'FY2026') && !J('BUDGET', 'FY2026') && !J('FORECAST', 'FY2026') && !J('FORECAST', '2026-01-01/2026-12-31'), 'jaarrealisatie: deelperiode, YTD_ACTUAL, BUDGET en FORECAST nooit');
  });

  // 3. Validatie vóór verzenden (concrete fouten, geen standaardkeuze).
  await probeer('validatie', async () => {
    const { ctx } = laad(root);
    const V = (k, ent = '', lijst = ENT()) => ctx.dclValideer(Object.assign({ scope: 'GROUP', statement: 'P&L', periodeSoort: 'BOEKJAAR', boekjaar: '2026', begin: '', eind: '', datatype: 'FORECAST' }, k), ent, lijst);
    const g = V({});
    check(g.ok && JSON.stringify(g.params) === JSON.stringify({ doc_scope: 'GROUP', doc_statement: 'P&L', doc_periode: 'FY2026', doc_datatype: 'FORECAST' }) && g.jaarrealisatie === false, 'validatie: volledige GROUP-keuze geeft exact de vier backendparameters, geen jaarrealisatie');
    const e = V({ scope: 'ENTITY', datatype: 'ACTUAL' }, 'ENT_SYN_A');
    check(e.ok && e.params.doc_scope === 'ENTITY' && e.jaarrealisatie === true, 'validatie: ENTITY met geldige huidige entiteit en ACTUAL FY is jaarrealisatie');
    const r = V({ periodeSoort: 'DATUMBEREIK', boekjaar: '', begin: '2026-01-01', eind: '2026-06-30', datatype: 'ACTUAL' });
    check(r.ok && r.params.doc_periode === '2026-01-01/2026-06-30' && r.jaarrealisatie === false, 'validatie: ACTUAL over een deelperiode is geen jaarrealisatie');
    const fout = (x, re) => !x.ok && re.test(x.fout) && !x.params;
    check(fout(V({ datatype: '' }), /cijfersoort.*geen standaard/), 'validatie: zonder cijfersoort geweigerd (geen standaard ACTUAL)');
    check(fout(V({ scope: '' }), /groepsdocument of een document van één entiteit/) && fout(V({ statement: '' }), /overzicht/) && fout(V({ periodeSoort: '' }), /periode/), 'validatie: ontbrekende scope, overzicht of periode concreet geweigerd');
    check(fout(V({ begin: '2026-01-01', eind: '2026-12-31' }), /óf een boekjaar óf een datumbereik/) && fout(V({ periodeSoort: 'DATUMBEREIK', begin: '2026-01-01', eind: '2026-12-31' }), /óf een boekjaar óf een datumbereik/), 'validatie: ambigue periode (boekjaar én datums) geweigerd');
    check(fout(V({ boekjaar: '1989' }), /tussen 1990 en 2100/) && fout(V({ boekjaar: '2101' }), /tussen 1990 en 2100/) && fout(V({ boekjaar: '20x6' }), /vier cijfers/), 'validatie: boekjaargrenzen en opmaak');
    check(fout(V({ periodeSoort: 'DATUMBEREIK', boekjaar: '', begin: '2026-01-01', eind: '2027-01-01' }), /maximaal één jaar/) && fout(V({ periodeSoort: 'DATUMBEREIK', boekjaar: '', begin: '2026-02-30', eind: '2026-12-31' }), /bestaande datums/) && fout(V({ periodeSoort: 'DATUMBEREIK', boekjaar: '', begin: '2026-01-01', eind: '' }), /begin- als de einddatum/), 'validatie: datumbereik te lang, onbestaand of onvolledig');
    // Productpunt 7: GENERAL wordt wél gebouwd; met achtergebleven financiële velden geweigerd (sectie 15).
    check(fout(V({ datatype: 'ACTUALS' }), /onbekende cijfersoort/) && fout(V({ statement: 'p&l' }), /onbekend overzicht/) && fout(V({ scope: 'general' }), /onbekende documentsoort/) && fout(V({ scope: 'GENERAL' }), /algemeen dataroomdocument heeft geen overzicht, periode, cijfersoort/), 'validatie: enums hoofdlettergevoelig exact; GENERAL met financiële velden geweigerd');
    check(fout(V({}, 'ENT_SYN_A'), /groepsdocument hoort niet bij één entiteit/), 'validatie: GROUP met gekozen entiteit tegenstrijdig');
    check(fout(V({ scope: 'ENTITY' }, ''), /kies .*ook de entiteit/) && fout(V({ scope: 'ENTITY' }, 'ENT_ANDER_TRAJECT'), /hoort niet \(meer\) bij dit traject/) && fout(V({ scope: 'ENTITY' }, 'ENT_SYN_A', []), /geen geregistreerde entiteiten/), 'validatie: ENTITY zonder, met vreemde of zonder geregistreerde entiteit geweigerd');
    check(ctx.dclQuery(g.params) === QUERY_GROEP, 'query: vaste volgorde en encoding (P&L → P%26L) · ' + ctx.dclQuery(g.params));
  });

  // 4. Saneren, statuslabels en weergave.
  await probeer('saneren', async () => {
    const { ctx } = laad(root);
    const ruw = dto('GROUP', 'P&L', 'FY2026', 'FORECAST', null, { binding: BINDING, doc_id: 'doc_x', inhoud_hash: 'a'.repeat(64), versie: 1, financieel_bronfeit: false, realisatie_toepasbaar: true });
    const s = ctx.dclSaneer(ruw, null);
    check(s && Object.keys(s).join(',') === 'scope,statement,periode,datatype,entiteit_id,herkomst,officiele_consolidatie,realisatie_toepasbaar' && !JSON.stringify(s).includes(BINDING) && !JSON.stringify(s).includes('doc_x'), 'saneren: alleen bekende sleutels, geen binding/doc_id/hash');
    check(s && s.realisatie_toepasbaar === false, 'saneren: realisatie lokaal herberekend (FORECAST nooit realisatie, ook als de server iets anders zegt)');
    check(ctx.dclSaneer(dto('GROUP', 'P&L', 'FY2026', 'ACTUAL', null, { officiele_consolidatie: true }), null) === null && ctx.dclSaneer(dto('GROUP', 'P&L', 'FY2026', 'ACTUAL', null, { herkomst: 'AI' }), null) === null, 'saneren: officiële-consolidatieclaim of andere herkomst → onbekend');
    check(ctx.dclSaneer({ scope: 'GENERAL', statement: null, periode: null, datatype: null, entiteit_id: null, herkomst: 'GEBRUIKER', officiele_consolidatie: false }, null).scope === 'GENERAL', 'saneren: GENERAL (productpunt 7) wordt getoond (details in sectie 15)');
    check(ctx.dclSaneer(dto('ENTITY', 'BALANCE_SHEET', 'FY2025', 'ACTUAL', 'ENT_SYN_A'), 'ENT_SYN_B') === null && ctx.dclSaneer(dto('GROUP', 'P&L', 'FY2026', 'ACTUAL'), 'ENT_SYN_A') === null && ctx.dclSaneer(dto('ENTITY', 'P&L', 'FY2026', 'ACTUAL', 'ENT_SYN_A'), 'ENT_SYN_A').entiteit_id === 'ENT_SYN_A', 'saneren: entiteit moet exact bij de rij passen');
    check(ctx.dclSaneer(dto('GROUP', 'P&L', '2026-01-01/2027-06-30', 'ACTUAL'), null) === null && ctx.dclSaneer('{"scope":"GROUP"}', null) === null && ctx.dclSaneer(null, null) === null && ctx.dclSaneer([], null) === null, 'saneren: ongeldige periode, string, null en array → onbekend');
    const L = (dt, l) => ctx.dclStatusLabel(ctx.dclSaneer(dto('GROUP', 'P&L', l, dt), null));
    check(['FORECAST', 'BUDGET', 'YTD_ACTUAL'].every((dt) => /^Geen jaarrealisatie/.test(L(dt, 'FY2026')) && !/Volledige jaarrealisatie/.test(L(dt, 'FY2026'))) && /^Geen jaarrealisatie/.test(L('ACTUAL', '2026-01-01/2026-03-31')), 'statuslabel: FORECAST/BUDGET/YTD_ACTUAL/deelperiode nooit jaarrealisatie');
    check(/^Volledige jaarrealisatie volgens uw eigen classificatie \(niet geverifieerd\)/.test(L('ACTUAL', 'FY2026')), 'statuslabel: ACTUAL FY als eigen, niet-geverifieerde jaarrealisatie');
    check(/^Te beoordelen\. Geen jaarrealisatie/.test(ctx.dclStatusLabel(ctx.dclSaneer(dto('GROUP', 'P&L', 'FY2026', 'BUDGET'), null), 'GEEN_JAARREALISATIE')) && /Niet geclassificeerd/.test(ctx.dclStatusLabel(null)), 'statuslabel: GEEN_JAARREALISATIE → te beoordelen; ontbrekend → niet geclassificeerd');
    const w = ctx.dclRenderWeergave(ctx.dclSaneer(dto('ENTITY', 'CASH_FLOW', 'FY2026', 'ACTUAL', 'ENT_SYN_A'), 'ENT_SYN_A'), { entNaam: 'Alfa <img src=x onerror=alert(1)> "BV"' });
    check(!/<img|"BV"/.test(w) && /&lt;img/.test(w) && /herkomst: gebruiker, niet geverifieerd/.test(w) && /Kasstroomoverzicht/.test(w) && !/ENT_SYN_A/.test(w), 'weergave: entiteitnaam geëscaped, herkomst gebruiker/niet geverifieerd, geen intern id');
    const wg = ctx.dclRenderWeergave(ctx.dclSaneer(dto('GROUP', 'P&L', 'FY2026', 'ACTUAL'), null), {});
    check(/geen officiële consolidatie/.test(wg) && !/officieel geconsolideerd/i.test(wg), 'weergave: GROUP draagt "geen officiële consolidatie"');
    check(ctx.dclRenderWeergave(null, {}) === '' && /Niet geclassificeerd/.test(ctx.dclRenderWeergave(null, { toonOnbekend: true })), 'weergave: legacy zonder metadata expliciet "niet geclassificeerd" waar gevraagd');
  });

  // 5. Rollen, fase, vergrendeling: keuzeblok alleen voor de verkoper in Financieel.
  await probeer('rollen', async () => {
    const v = laad(root); v.begin();
    check(/id="doc-klas-aan-financieel"/.test(v.log.html) && !/doc-klas[^"]*"[^>]*\s(checked|selected)/.test(v.log.html) && !/<option value="[^"]+"[^>]*selected/.test(v.log.html.slice(v.log.html.indexOf('dcl-paneel'))), 'rol verkoper: keuzeblok in Financieel, standaard uit en zonder voorselectie');
    check(/voor alle bestanden die u hierna selecteert of vervangt/.test(v.log.html) && /geen officiële consolidatie/.test(v.log.html) && /niet als jaarcijfers overgenomen/.test(v.log.html) && /niet overgenomen/.test(v.log.html), 'keuzeblok: uitleg batch/vervangen, geen consolidatie, geen jaarcijfers bij prognose');
    const k = laad(root, { rol: 'koper' }); k.begin();
    check(k.log.html === '', 'rol koper: geen documentsectie en geen keuzeblok');
    for (const rol of ['tussenpersoon', 'meekijker', 'admin', '']) {
      const t = laad(root, { rol }); t.begin();
      check(!/doc-klas/.test(t.log.html), 'rol ' + (rol || '(leeg)') + ': geen keuzeblok in Financieel');
      t.els['doc-klas-aan-financieel'] = Object.assign(maakEl('doc-klas-aan-financieel'), { checked: true });
      ['scope', 'statement', 'periodesoort', 'boekjaar', 'datatype'].forEach((n, i) => { t.els['doc-klas-' + n + '-financieel'] = Object.assign(maakEl(''), { value: ['GROUP', 'P&L', 'BOEKJAAR', '2026', 'FORECAST'][i] }); });
      const kz = t.ctx.leesUploadKeuzes(FASE);
      check(!('classificatie' in kz), 'rol ' + (rol || '(leeg)') + ': ook een los ingevuld keuzeblok in de DOM levert geen classificatie op');
    }
    // Productpunt 7: in een andere fase alleen de algemene keuze, geen GROUP/ENTITY en geen financiële velden.
    const j = laad(root); j.begin('juridisch');
    const jp = j.log.html.slice(j.log.html.indexOf('dcl-paneel'));
    check(/Document toevoegen/.test(j.log.html) && /id="doc-klas-aan-juridisch"/.test(j.log.html) && /<option value="GENERAL">/.test(jp) && !/value="(GROUP|ENTITY)"/.test(jp) && !/doc-klas-(statement|periodesoort|boekjaar|begin|eind|datatype)-/.test(j.log.html), 'verkoper in andere fase: gewone upload plus alleen de keuze "Algemeen dataroomdocument"');
    const l = laad(root, { vergrendeld: true }); l.begin();
    check(!/doc-klas/.test(l.log.html) && !/Document toevoegen/.test(l.log.html), 'vergrendeld traject: geen upload en geen keuzeblok');
    const lu = await l.ctx.uploadDocument(FASE, l.bestand('syn-lock.txt'), null, undefined, { entiteitId: '', dubbeleCheck: false, alleenBewijsstuk: false, classificatie: Object.freeze({ ok: true, params: { doc_scope: 'GROUP', doc_statement: 'P&L', doc_periode: 'FY2026', doc_datatype: 'ACTUAL' }, jaarrealisatie: true }) });
    check(lu.soort === 'niet_aangeboden' && l.log.requests.length === 0, 'vergrendeld traject: geen classificatiemutatie of verzoek');
  });

  // 6. Optioneel uit: legacy keuzes en parameters byte-gelijk.
  await probeer('legacy', async () => {
    const t = laad(root); t.begin();
    const kz = t.ctx.leesUploadKeuzes(FASE);
    check(Object.keys(kz).join(',') === 'entiteitId,dubbeleCheck,alleenBewijsstuk', 'uit: leesUploadKeuzes geeft exact het oude object');
    t.kies({ ...vollGroep, aan: false });
    check(!('classificatie' in t.ctx.leesUploadKeuzes(FASE)), 'uit: ingevulde maar niet aangezette velden worden genegeerd');
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-a.txt'), t.bestand('syn-b.txt')]);
    const r = t.log.requests;
    check(r.length === 2 && r.every((x) => geenDocParams(x.url) && /^https:\/\/worker\.test\/mna\/document\/upload\?code=VSYN0001&fase_id=financieel&bewaar=true$/.test(x.url)), 'uit: request-URL exact zoals voorheen, zonder doc_*-parameters · ' + r.map((x) => x.url).join(' | '));
    check(r.every((x) => alleenFile(x.body)), 'uit: formulier bevat alleen het bestand');
    const m = laad(root, { metModule: false }); m.begin();
    check(!/doc-klas/.test(m.log.html) && Object.keys(m.ctx.leesUploadKeuzes(FASE)).length === 3, 'zonder mna/12: mna/02 werkt ongewijzigd (geen keuzeblok, oude keuzes)');
  });

  // 7. Volledige GROUP-batch: momentopname vóór renderApp, query-only, NEEDS_REVIEW zichtbaar.
  await probeer('groep batch', async () => {
    const t = laad(root); t.begin(); t.kies(vollGroep);
    const k = dto('GROUP', 'P&L', 'FY2026', 'FORECAST');
    t.opzet.upload.push(ANTW.geenJaar('doc_g1', k), ANTW.geenJaar('doc_g2', k));
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-prognose-1.txt'), t.bestand('syn-prognose-2.txt')]);
    const r = t.log.requests;
    check(r.length === 2 && r.every((x) => x.rendersVoorRequest >= 2 && x.paneelAanBijRequest === false), 'groep batch: renderApp heeft het keuzeblok vóór elk verzoek gewist (snapshot nodig)');
    check(r.length === 2 && r.every((x) => x.url.endsWith('&bewaar=true' + QUERY_GROEP) && !/entiteit_id=/.test(x.url)), 'groep batch: beide verzoeken met exact dezelfde vier parameters, zonder entiteit_id · ' + (r[0] && r[0].url));
    check(r.every((x) => alleenFile(x.body)), 'groep batch: classificatie niet tegelijk als formulierveld');
    const docs = t.ctx.DOCS[FASE];
    check(docs.length === 2 && docs.every((d) => d.verwerking_status === 'NEEDS_REVIEW' && d.documentclassificatie && d.documentclassificatie.scope === 'GROUP' && d.documentclassificatie.realisatie_toepasbaar === false && Object.keys(d.velden).length === 0), 'groep batch: rijen met gesaneerde classificatie, NEEDS_REVIEW, geen velden');
    check(t.log.autoFill === 0 && !t.log.overig.some((u) => /koppel-entiteit/.test(u)), 'groep batch: geen veldinvulling en geen automatische entiteitkoppeling');
    const w = weergaven(t.log.html);
    check(/Controle nodig/.test(t.log.html) && /Te beoordelen\. Geen jaarrealisatie/.test(w) && /Prognose \(forecast\)/.test(w) && /boekjaar 2026/.test(w) && !/>Geanalyseerd</.test(t.log.html), 'groep batch: "Controle nodig" + prognose nooit als realisatie');
    check(!/fd-ent-doc_g1/.test(t.log.html) && !/Groepsniveau</.test(t.log.html), 'groep batch: geen koppel-UI of groepsniveau-badge bij een geclassificeerd document');
  });

  // 8. ENTITY: geldige entiteit, jaarrealisatie, bestaande verwerking; extra controle behouden.
  await probeer('entiteit', async () => {
    const t = laad(root); t.begin();
    t.kies({ scope: 'ENTITY', statement: 'BALANCE_SHEET', soort: 'BOEKJAAR', boekjaar: '2025', datatype: 'ACTUAL', entiteit: 'ENT_SYN_A' });
    t.els['dubbele-check-' + FASE].checked = true;
    t.opzet.upload.push(ANTW.processed('doc_e1', { documentclassificatie: dto('ENTITY', 'BALANCE_SHEET', 'FY2025', 'ACTUAL', 'ENT_SYN_A') }));
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-balans.txt')]);
    const u = t.log.requests[0] && t.log.requests[0].url;
    check(u && /&entiteit_id=ENT_SYN_A&doc_scope=ENTITY&doc_statement=BALANCE_SHEET&doc_periode=FY2025&doc_datatype=ACTUAL&dubbele_check=true$/.test(u), 'entiteit: entiteit_id behouden, vier parameters en extra controle · ' + u);
    const d = t.ctx.DOCS[FASE][0];
    check(d && d.entiteit_id === 'ENT_SYN_A' && d.documentclassificatie && d.documentclassificatie.entiteit_id === 'ENT_SYN_A' && t.log.autoFill > 0, 'entiteit: PROCESSED ACTUAL FY doorloopt de bestaande verwerking');
    check(/Volledige jaarrealisatie volgens uw eigen classificatie/.test(weergaven(t.log.html)) && /Alfa &lt;img/.test(weergaven(t.log.html)) && !/ENT_SYN_A/.test(weergaven(t.log.html)), 'entiteit: weergave met geëscapete entiteitnaam, zonder intern id');
  });

  // 9. Bewijsstuk blijft behouden naast classificatie; GROUP ACTUAL zonder naamkoppeling.
  await probeer('bewijsstuk', async () => {
    const t = laad(root); t.begin(); t.kies({ ...vollGroep, datatype: 'BUDGET' });
    t.els['bewijsstuk-alleen-' + FASE].checked = true;
    t.opzet.upload.push(ANTW.stored('doc_b1', dto('GROUP', 'P&L', 'FY2026', 'BUDGET')));
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-begroting.txt')]);
    const u = t.log.requests[0] && t.log.requests[0].url;
    check(u && u.includes('&doc_datatype=BUDGET') && /&alleen_bewijsstuk=true$/.test(u) && !/dubbele_check/.test(u), 'bewijsstuk: alleen_bewijsstuk=true blijft naast de classificatie · ' + u);
    check(t.ctx.DOCS[FASE][0].alleen_bewijsstuk === true && t.ctx.DOCS[FASE][0].documentclassificatie.datatype === 'BUDGET', 'bewijsstuk: rij als bewijsstuk met classificatie');
    const g = laad(root); g.begin(); g.kies({ ...vollGroep, datatype: 'ACTUAL' });
    g.opzet.upload.push(ANTW.processed('doc_ga', { entiteit_naam: 'Beta BV', documentclassificatie: dto('GROUP', 'P&L', 'FY2026', 'ACTUAL') }));
    await g.ctx.uploadDocumentenSequentieel(FASE, [g.bestand('syn-groep-jaar.txt')]);
    check(!g.log.overig.some((x) => /koppel-entiteit/.test(x)) && g.ctx.DOCS[FASE][0].entiteit_id === '' && !g.ctx.DOCS[FASE][0].behoeftHandmatigeKoppeling, 'groep ACTUAL: geen automatische koppeling op herkende naam (niets afgeleid)');
  });

  // 10. Weigering vóór fetch: batch en direct, keuzeblok blijft staan.
  await probeer('weigering', async () => {
    const gevallen = [
      ['zonder cijfersoort', { ...vollGroep, datatype: '' }, /cijfersoort/],
      ['GROUP met entiteit', { ...vollGroep, entiteit: 'ENT_SYN_B' }, /groepsdocument hoort niet bij één entiteit/],
      ['ENTITY zonder entiteit', { ...vollGroep, scope: 'ENTITY' }, /ook de entiteit/],
      ['ambigue periode', { ...vollGroep, begin: '2026-01-01', eind: '2026-12-31' }, /óf een boekjaar óf een datumbereik/],
      ['jaar buiten grens', { ...vollGroep, boekjaar: '2101' }, /1990 en 2100/],
    ];
    for (const [naam, keuze, re] of gevallen) {
      const t = laad(root); t.begin(); t.kies(keuze);
      const uit = await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-1.txt'), t.bestand('syn-2.txt')]);
      check(t.log.requests.length === 0 && t.log.overig.length === 0 && uit && uit.geblokkeerd && uit.items.every((x) => x.soort === 'niet_aangeboden') && re.test(uit.samenvatting), 'weigering batch (' + naam + '): geen verzoek, concrete fout · ' + (uit && uit.samenvatting));
      check(t.log.renders === 1 && t.els['doc-klas-aan-' + FASE].checked === true && (t.ctx.DOCS[FASE] || []).length === 0 && t.log.toasts.some((x) => x.type === 'err' && re.test(x.msg)), 'weigering batch (' + naam + '): geen wachtrij, geen hertekening, keuzeblok blijft ingevuld');
      const d = await t.ctx.uploadDocument(FASE, t.bestand('syn-3.txt'));
      check(d && d.soort === 'niet_aangeboden' && re.test(d.tekst) && t.log.requests.length === 0 && (t.ctx.DOCS[FASE] || []).length === 0, 'weigering direct (' + naam + '): geen verzoek, geen tijdelijke rij');
    }
    const s = laad(root); s.begin();
    s.ctx.S._entiteiten = [{ id: 'ENT_SYN_B', naam: 'Beta BV' }];
    s.kies({ ...vollGroep, scope: 'ENTITY', entiteit: 'ENT_SYN_A' });
    await s.ctx.uploadDocumentenSequentieel(FASE, [s.bestand('syn-vreemd.txt')]);
    check(s.log.requests.length === 0 && s.log.toasts.some((x) => /hoort niet \(meer\) bij dit traject/.test(x.msg)), 'weigering: entiteit die niet (meer) bij het huidige traject hoort');
  });

  // 11. Server weigert (400 zonder doc_id) of bevestigt niet: geen fictief succes of verzonnen classificatie.
  await probeer('serverantwoord', async () => {
    const t = laad(root); t.begin(); t.kies({ ...vollGroep, scope: 'ENTITY', entiteit: 'ENT_SYN_A' });
    t.opzet.upload.push(ANTW.geweigerd('ENTITEIT_ONBEKEND', 'De opgegeven entiteit hoort niet bij dit traject.'));
    const uit = await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-x.txt')]);
    check(uit.items[0].soort === 'mislukt' && (t.ctx.DOCS[FASE] || []).length === 0 && t.log.toasts.some((x) => /hoort niet bij dit traject/.test(x.msg)), 'server 400 zonder doc_id: geen rij, concrete serverfout');
    const o = laad(root); o.begin(); o.kies(vollGroep);
    o.opzet.upload.push(ANTW.processed('doc_o1'));
    await o.ctx.uploadDocumentenSequentieel(FASE, [o.bestand('syn-oud-contract.txt')]);
    const d = o.ctx.DOCS[FASE][0];
    check(d && d.documentclassificatie === null && o.log.autoFill === 0 && Object.keys(d.velden).length === 0 && o.log.toasts.some((x) => /niet bevestigd/.test(x.msg)), 'niet bevestigd: geen verzonnen classificatie en prognose niet als realisatie overgenomen');
    check(/Niet geclassificeerd/.test(weergaven(o.log.html)), 'niet bevestigd: rij toont "niet geclassificeerd"');
  });

  // 12. Vervangen: alleen de huidige keuze, nooit de classificatie van de oude versie.
  await probeer('vervangen', async () => {
    const oud = () => ({ id: 'doc_oud', naam: 'syn-oud.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1, verwerking_status: 'NEEDS_REVIEW', documentclassificatie: { scope: 'GROUP', statement: 'P&L', periode: { soort: 'BOEKJAAR', label: 'FY2026', boekjaar: 2026, begin: null, eind: null }, datatype: 'FORECAST', entiteit_id: null, herkomst: 'GEBRUIKER', officiele_consolidatie: false, realisatie_toepasbaar: false } });
    const vervang = async (t) => { t.ctx.vervangDocument(FASE, 'doc_oud'); const kz = t.ctx._laatsteKiezer; kz.files = [t.bestand('syn-nieuw.txt')]; kz.onchange(); await wacht(); };
    const a = laad(root); a.ctx.DOCS[FASE] = [oud()]; a.begin();
    await vervang(a);
    check(a.log.requests.length === 1 && geenDocParams(a.log.requests[0].url) && /&vervangt=doc_oud$/.test(a.log.requests[0].url), 'vervangen zonder keuze: geen classificatie van de oude versie overgenomen · ' + (a.log.requests[0] && a.log.requests[0].url));
    const b = laad(root); b.ctx.DOCS[FASE] = [oud()]; b.begin(); b.kies({ ...vollGroep, datatype: 'YTD_ACTUAL' });
    b.opzet.upload.push(ANTW.geenJaar('doc_nieuw', dto('GROUP', 'P&L', 'FY2026', 'YTD_ACTUAL')));
    await vervang(b);
    const u = b.log.requests[0] && b.log.requests[0].url;
    check(u && u.includes('&doc_datatype=YTD_ACTUAL') && /&vervangt=doc_oud$/.test(u) && b.log.requests[0].rendersVoorRequest >= 2 && b.log.requests[0].paneelAanBijRequest === false, 'vervangen met keuze: momentopname vóór renderApp, vervangt behouden · ' + u);
    check(b.ctx.DOCS[FASE].some((d) => d.id === 'doc_oud') && b.ctx.DOCS[FASE].some((d) => d.id === 'doc_nieuw'), 'vervangen NEEDS_REVIEW: oude versie blijft staan (bestaand gedrag)');
    const c = laad(root); c.ctx.DOCS[FASE] = [oud()]; c.begin(); c.kies({ ...vollGroep, statement: '' });
    await vervang(c);
    check(c.log.requests.length === 0 && c.log.toasts.some((x) => /overzicht/.test(x.msg)), 'vervangen met onvolledige keuze: geweigerd vóór verzoek');
  });

  // 13. Trajectwissel en centrale upload.
  await probeer('trajectwissel', async () => {
    const t = laad(root); t.begin(); t.kies(vollGroep);
    let geef; const belofte = new Promise((r) => { geef = r; });
    t.opzet.upload.push({ uitgesteld: { belofte } });
    const loop = t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-1.txt'), t.bestand('syn-2.txt')]);
    await wacht();
    t.ctx.S.code = 'VSYN0002'; t.ctx.S._entiteiten = [];
    geef({ ok: true, status: 200, json: () => Promise.resolve(ANTW.geenJaar('doc_t1', dto('GROUP', 'P&L', 'FY2026', 'FORECAST')).body) });
    await loop;
    check(t.log.requests.length === 1 && !(t.ctx.DOCS[FASE] || []).some((d) => d.id === 'doc_t1'), 'trajectwissel: geen volgend verzoek en niets in het nieuwe traject geschreven');
    t.renderApp();
    check(t.els['doc-klas-aan-' + FASE] && t.els['doc-klas-aan-' + FASE].checked === false && !('classificatie' in t.ctx.leesUploadKeuzes(FASE)), 'trajectwissel: keuzeblok weer uit, geen keuze meegenomen');
    const c = laad(root); c.begin(); c.kies(vollGroep);
    await c.ctx.centraalUploadFiles([c.bestand('syn-jaarcijfers.txt')]);
    check(c.log.requests.length === 1 && geenDocParams(c.log.requests[0].url), 'centrale upload (fase uit bestandsnaam): nooit een classificatie meegestuurd');
  });

  // 14. Lijst en versies: gesaneerde DTO, legacy expliciet onbekend, escaping, geen ruwe/interne gegevens.
  await probeer('lijst en versies', async () => {
    const t = laad(root); t.begin();
    const rauw = JSON.stringify({ omzet: '5', _documentclassificatie: { versie: 1, herkomst: 'GEBRUIKER', scope: 'GROUP', binding: BINDING } });
    t.opzet.lijst.push({ status: 200, body: [
      { id: 'doc_legacy', bestand_naam: 'syn-legacy.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{"omzet":"5"}', uploaded_at: 1, versie: 1 },
      { id: 'doc_klas', bestand_naam: 'syn-<b>groep</b>.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: rauw, uploaded_at: 2, versie: 1, verwerking_status: 'PROCESSED', bestand_opgeslagen: true, inhoud_hash: 'a'.repeat(64), documentclassificatie: dto('GROUP', 'P&L', 'FY2026', 'ACTUAL', null, { binding: BINDING }) },
      { id: 'doc_ent', bestand_naam: 'syn-ent.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 3, versie: 1, verwerking_status: 'NEEDS_REVIEW', verwerking_fout: 'GEEN_JAARREALISATIE', verwerking_reden: 'Synthetische reden.', bestand_opgeslagen: true, entiteit_id: 'ENT_SYN_A', documentclassificatie: dto('ENTITY', 'P&L', '2026-01-01/2026-06-30', 'ACTUAL', 'ENT_SYN_A') },
      { id: 'doc_vals', bestand_naam: 'syn-vals.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 4, versie: 1, documentclassificatie: dto('GROUP', 'P&L', 'FY2026', 'ACTUAL', null, { officiele_consolidatie: true }) },
      { id: 'doc_gen', bestand_naam: 'syn-gen.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 5, versie: 1, documentclassificatie: { scope: 'GENERAL', statement: null, periode: null, datatype: null, entiteit_id: null, herkomst: 'GEBRUIKER', officiele_consolidatie: false, realisatie_toepasbaar: false } },
    ] });
    t.ctx.loadDocsForFase(FASE); await wacht();
    const doc = (id) => t.ctx.DOCS[FASE].find((d) => d.id === id);
    check(doc('doc_legacy').documentclassificatie === null && doc('doc_vals').documentclassificatie === null && doc('doc_gen').documentclassificatie && doc('doc_gen').documentclassificatie.scope === 'GENERAL', 'lijst: legacy en officiële-consolidatieclaim → geen classificatie; GENERAL (productpunt 7) bewaard');
    check(doc('doc_klas').documentclassificatie && !('binding' in doc('doc_klas').documentclassificatie) && !('_documentclassificatie' in doc('doc_klas').velden) && doc('doc_klas').velden.omzet === '5', 'lijst: gesaneerde DTO bewaard, ruw record uit velden verwijderd, overige velden behouden');
    const html = t.log.html, w = weergaven(html);
    check((w.match(/Niet geclassificeerd/g) || []).length === 2 && /Algemeen dataroomdocument/.test(w) && /Volledige jaarrealisatie/.test(w) && /2026-01-01 t\/m 2026-06-30 \(deelperiode\)/.test(w) && /Te beoordelen\. Geen jaarrealisatie/.test(w), 'lijst: legacy/ongeldig expliciet niet geclassificeerd; deelperiode nooit realisatie');
    check(!html.includes(BINDING) && !/_documentclassificatie|binding/.test(html) && !/ENT_SYN_A|doc_klas|VSYN0001/.test(w) && !/<b>groep/.test(html), 'lijst: geen binding, ruw record, interne id of toegangscode in de weergave; bestandsnaam geëscaped');
    check(/fd-ent-doc_legacy/.test(html) && !/fd-ent-doc_klas/.test(html), 'lijst: koppel-UI blijft voor legacy, niet voor een geclassificeerd document');
    const g = laad(root, { rol: 'tussenpersoon' }); g.begin();
    g.opzet.lijst.push({ status: 200, body: [{ id: 'doc_klas', bestand_naam: 'syn.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 2, versie: 1, documentclassificatie: dto('GROUP', 'P&L', 'FY2026', 'FORECAST') }] });
    g.ctx.loadDocsForFase(FASE); await wacht();
    check(/Prognose \(forecast\)/.test(weergaven(g.log.html)) && !/doc-klas|Document toevoegen/.test(g.log.html), 'begeleider: ziet de classificatie alleen-lezen, upload in Financieel blijft dicht');
    const k = laad(root, { rol: 'koper' }); k.begin();
    k.ctx.loadDocsForFase(FASE); await wacht();
    check(k.log.overig.length === 0 && k.log.html === '', 'koper: geen lijstverzoek en geen classificatie-UI');

    const v = laad(root); v.begin();
    v.opzet.versies.push({ status: 200, body: { ok: true, versies: [
      { id: 'doc_v1', bestand_naam: 'syn-v1.txt', versie: 1, bewaard: 1, uploaded_at: 1 },
      { id: 'doc_v2', bestand_naam: 'syn-<img src=x>.txt', versie: 2, bewaard: 1, uploaded_at: 2, entiteit_id: null, documentclassificatie: dto('GROUP', 'CASH_FLOW', 'FY2026', 'FORECAST', null, { binding: BINDING }) },
    ] } });
    await v.ctx.toonVersieGeschiedenis('doc_v2');
    const box = v.log.modals.map((n) => n.innerHTML).find((h) => /Versiegeschiedenis/.test(h) && /v2/.test(h)) || '';
    check(/Niet geclassificeerd/.test(box) && /Kasstroomoverzicht/.test(box) && /Geen jaarrealisatie/.test(box) && !box.includes(BINDING) && !/<img src=x>/.test(box), 'versies: per versie eigen classificatie of "niet geclassificeerd", geen binding, geëscaped');
  });

  // 15. Productpunt 7: GENERAL (algemeen dataroomdocument) — alleen doc_scope, geen entiteit/financiële metadata.
  await probeer('algemeen', async () => {
    const GEN = () => ({ scope: 'GENERAL', statement: null, periode: null, datatype: null, entiteit_id: null, herkomst: 'GEBRUIKER', officiele_consolidatie: false, realisatie_toepasbaar: false });
    const algemeenAntw = (docId, extra = {}) => ({ status: 200, body: { ok: true, doc_id: docId, analyse: '', veld_extractie: {}, r2_opgeslagen: true, verworpen: false, versie: 1, verwerking_status: 'STORED', geanalyseerd: false, inhoud_hash: 'd'.repeat(64), documentclassificatie: GEN(), ...extra } });
    const Q_GEN = '&bewaar=true&doc_scope=GENERAL';
    const zuiverAlgemeen = (u) => u.includes('&doc_scope=GENERAL') && !/doc_(statement|periode|datatype)=|entiteit_id=|undefined|null/.test(u);

    // Helpers: validatie, query, saneren, labels.
    const { ctx } = laad(root);
    const leeg = { scope: 'GENERAL', statement: '', periodeSoort: '', boekjaar: '', begin: '', eind: '', datatype: '' };
    const g = ctx.dclValideer(leeg, '', ENT());
    check(g.ok && g.algemeen === true && g.jaarrealisatie === false && JSON.stringify(g.params) === '{"doc_scope":"GENERAL"}', 'algemeen validatie: alleen doc_scope, geen boekjaar of andere velden vereist');
    check(ctx.dclQuery(g.params) === '&doc_scope=GENERAL' && ctx.dclQuery({ doc_scope: 'GENERAL', doc_statement: 'P&L' }) === '&doc_scope=GENERAL', 'algemeen query: uitsluitend doc_scope, nooit undefined/null of overige doc_*');
    const gf = (k, ent = '') => ctx.dclValideer(Object.assign({}, leeg, k), ent, ENT());
    check(!gf({}, 'ENT_SYN_A').ok && /hoort niet bij één entiteit: zet de entiteitkeuze op "Groep\/hoofdentiteit"/.test(gf({}, 'ENT_SYN_A').fout), 'algemeen validatie: gekozen entiteit geweigerd met aanwijzing');
    check(/geen overzicht: maak dat veld leeg/.test(gf({ statement: 'P&L' }).fout) && /geen periode/.test(gf({ boekjaar: '2026' }).fout) && /geen periode/.test(gf({ periodeSoort: 'DATUMBEREIK' }).fout) && /geen cijfersoort/.test(gf({ datatype: 'ACTUAL' }).fout), 'algemeen validatie: elk achtergebleven financieel veld concreet benoemd');
    check(!ctx.dclValideer(Object.assign({}, leeg, { scope: 'GROUP' }), '', ENT(), { alleenAlgemeen: true }).ok && /alleen "Algemeen dataroomdocument"/.test(ctx.dclValideer(Object.assign({}, leeg, { scope: 'ENTITY' }), 'ENT_SYN_A', ENT(), { alleenAlgemeen: true }).fout) && /kies "Algemeen dataroomdocument"/.test(ctx.dclValideer(Object.assign({}, leeg, { scope: '' }), '', ENT(), { alleenAlgemeen: true }).fout) && ctx.dclValideer(leeg, '', ENT(), { alleenAlgemeen: true }).ok, 'algemeen validatie: buiten Financieel geen GROUP/ENTITY');
    const s = ctx.dclSaneer(Object.assign(GEN(), { binding: BINDING, doc_id: 'doc_x' }), null);
    check(s && Object.keys(s).join(',') === 'scope,statement,periode,datatype,entiteit_id,herkomst,officiele_consolidatie,realisatie_toepasbaar' && s.statement === null && s.periode === null && s.datatype === null && s.entiteit_id === null && s.realisatie_toepasbaar === false && !JSON.stringify(s).includes(BINDING), 'algemeen saneren: alleen null financiële velden, geen entiteit/binding');
    const ongeldig = [
      Object.assign(GEN(), { statement: 'P&L' }), Object.assign(GEN(), { datatype: 'ACTUAL' }), Object.assign(GEN(), { periode: { soort: 'BOEKJAAR', label: 'FY2026', boekjaar: 2026, begin: null, eind: null } }),
      Object.assign(GEN(), { entiteit_id: 'ENT_SYN_A' }), Object.assign(GEN(), { officiele_consolidatie: true }), Object.assign(GEN(), { herkomst: 'AI' }), Object.assign(GEN(), { realisatie_toepasbaar: true }),
      (() => { const x = GEN(); delete x.statement; return x; })(), Object.assign(GEN(), { scope: 'general' }),
    ];
    check(ongeldig.every((x) => ctx.dclSaneer(x, null) === null) && ctx.dclSaneer(GEN(), 'ENT_SYN_A') === null, 'algemeen saneren: metadata, entiteit (DTO of rij), consolidatie, herkomst, realisatieclaim, ontbrekend veld of kleine letters → onbekend');
    const w = ctx.dclRenderWeergave(s, { verwerkingFout: 'GEEN_JAARREALISATIE' });
    check(/Algemeen dataroomdocument/.test(w) && /herkomst: gebruiker, niet geverifieerd/.test(w) && !/jaarrealisatie|Controle nodig|Te beoordelen|Groepsdocument|consolidatie/i.test(w) && /Algemeen document/.test(ctx.dclStatusLabel(s)), 'algemeen weergave: "Algemeen document", nooit jaarrealisatie/controle nodig/groep');

    // Keuzeblok Financieel: GENERAL naast GROUP/ENTITY; financiële velden blijven zichtbaar en ingevuld.
    const v = laad(root); v.begin();
    const vp = v.log.html.slice(v.log.html.indexOf('dcl-paneel'));
    check(/<option value="GROUP">/.test(vp) && /<option value="ENTITY">/.test(vp) && /<option value="GENERAL">Algemeen dataroomdocument/.test(vp) && /ingevulde velden worden niet weggegooid/.test(vp) && /zonder AI-analyse/.test(vp), 'algemeen keuzeblok Financieel: expliciete keuze naast groep/entiteit, uitleg weigering i.p.v. weggooien');

    // Batch in Financieel na rerender: alleen doc_scope, bestaande extra controle behouden, geen autoapply/koppeling.
    const b = laad(root); b.begin(); b.kies({ scope: 'GENERAL' });
    b.els['dubbele-check-' + FASE].checked = true;
    b.opzet.upload.push(algemeenAntw('doc_a1'), algemeenAntw('doc_a2'));
    await b.ctx.uploadDocumentenSequentieel(FASE, [b.bestand('syn-org-1.txt'), b.bestand('syn-org-2.txt')]);
    const r = b.log.requests;
    check(r.length === 2 && r.every((x) => x.url.endsWith(Q_GEN + '&dubbele_check=true') && zuiverAlgemeen(x.url) && x.rendersVoorRequest >= 2 && x.paneelAanBijRequest === false && alleenFile(x.body)), 'algemeen batch: momentopname vóór renderApp, exact doc_scope=GENERAL, extra controle ongewijzigd, alleen bestand in formulier · ' + (r[0] && r[0].url));
    const bd = b.ctx.DOCS[FASE];
    check(bd.length === 2 && bd.every((d) => d.documentclassificatie && d.documentclassificatie.scope === 'GENERAL' && d.entiteit_id === '' && Object.keys(d.velden).length === 0) && b.log.autoFill === 0 && !b.log.overig.some((u) => /koppel-entiteit/.test(u)), 'algemeen batch: rijen GENERAL zonder entiteit/velden, geen veldinvulling of koppelverzoek');
    const bw = weergaven(b.log.html);
    check(/Algemeen dataroomdocument/.test(bw) && !/jaarrealisatie/i.test(bw) && !/>Controle nodig<|Groepsniveau<|Handmatig koppelen|fd-ent-doc_a/.test(b.log.html), 'algemeen batch: lijst toont algemeen document, geen controle nodig/groepsniveau/koppel-UI');

    // Bewijsstuk-keuze blijft staan naast GENERAL.
    const bs = laad(root); bs.begin(); bs.kies({ scope: 'GENERAL' });
    bs.els['bewijsstuk-alleen-' + FASE].checked = true;
    bs.opzet.upload.push(algemeenAntw('doc_bs', { alleen_bewijsstuk: true }));
    await bs.ctx.uploadDocumentenSequentieel(FASE, [bs.bestand('syn-bewijs.txt')]);
    check(bs.log.requests[0] && bs.log.requests[0].url.endsWith(Q_GEN + '&alleen_bewijsstuk=true') && bs.ctx.DOCS[FASE][0].alleen_bewijsstuk === true, 'algemeen bewijsstuk: alleen_bewijsstuk=true ongewijzigd meegestuurd');

    // Server wijkt af (PROCESSED met velden en herkende naam): toch geen autoapply of entiteitgok.
    const p = laad(root); p.begin(); p.kies({ scope: 'GENERAL' });
    p.opzet.upload.push(ANTW.processed('doc_p1', { entiteit_naam: 'Beta BV', documentclassificatie: GEN() }), ANTW.processed('doc_p2', { entiteit_naam: 'Beta BV' }));
    await p.ctx.uploadDocumentenSequentieel(FASE, [p.bestand('syn-p1.txt'), p.bestand('syn-p2.txt')]);
    const pd = (id) => p.ctx.DOCS[FASE].find((d) => d.id === id);
    check(p.log.autoFill === 0 && !p.log.overig.some((u) => /koppel-entiteit/.test(u)) && pd('doc_p1').entiteit_id === '' && Object.keys(pd('doc_p1').velden).length === 0 && !pd('doc_p1').behoeftHandmatigeKoppeling && pd('doc_p2').documentclassificatie === null, 'algemeen: ook bij PROCESSED of onbevestigde classificatie geen veldinvulling, gok of koppeling');

    // Tegenstrijdige keuze: nul verzoeken, invoer blijft staan (geen stil weggooien).
    const tegen = [
      ['entiteit gekozen', { scope: 'GENERAL', entiteit: 'ENT_SYN_A' }, /Groep\/hoofdentiteit/, 'entiteit-select-' + FASE, 'ENT_SYN_A'],
      ['overzicht ingevuld', { scope: 'GENERAL', statement: 'BALANCE_SHEET' }, /geen overzicht/, 'doc-klas-statement-' + FASE, 'BALANCE_SHEET'],
      ['boekjaar ingevuld', { scope: 'GENERAL', soort: 'BOEKJAAR', boekjaar: '2026' }, /geen periode/, 'doc-klas-boekjaar-' + FASE, '2026'],
      ['cijfersoort ingevuld', { scope: 'GENERAL', datatype: 'FORECAST' }, /geen cijfersoort/, 'doc-klas-datatype-' + FASE, 'FORECAST'],
    ];
    for (const [naam, keuze, re, elId, waarde] of tegen) {
      const t = laad(root); t.begin(); t.kies(keuze);
      const uit = await t.ctx.uploadDocumentenSequentieel(FASE, [t.bestand('syn-1.txt'), t.bestand('syn-2.txt')]);
      const d = await t.ctx.uploadDocument(FASE, t.bestand('syn-3.txt'));
      check(t.log.requests.length === 0 && t.log.overig.length === 0 && uit.geblokkeerd && re.test(uit.samenvatting) && d.soort === 'niet_aangeboden' && t.log.renders === 1 && t.els[elId].value === waarde && t.els['doc-klas-aan-' + FASE].checked === true, 'algemeen weigering (' + naam + '): nul verzoeken, concrete aanwijzing, invoer blijft staan');
    }

    // Niet-financiële fase: GENERAL beschikbaar; GROUP via gemanipuleerde DOM geweigerd vóór fetch.
    const j = laad(root); j.begin('juridisch'); j.kies({ scope: 'GENERAL' }, 'juridisch');
    j.opzet.upload.push(algemeenAntw('doc_j1'));
    await j.ctx.uploadDocumentenSequentieel('juridisch', [j.bestand('syn-statuten.txt')]);
    check(j.log.requests.length === 1 && /fase_id=juridisch&bewaar=true&doc_scope=GENERAL$/.test(j.log.requests[0].url) && zuiverAlgemeen(j.log.requests[0].url) && j.log.autoFill === 0 && /Algemeen dataroomdocument/.test(weergaven(j.log.html)), 'algemeen juridisch: upload met alleen doc_scope, weergave algemeen document · ' + (j.log.requests[0] && j.log.requests[0].url));
    const jm = laad(root); jm.begin('juridisch'); jm.kies({ scope: 'GENERAL' }, 'juridisch');
    jm.els['doc-klas-scope-juridisch'].value = 'GROUP';
    const jmu = await jm.ctx.uploadDocumentenSequentieel('juridisch', [jm.bestand('syn-x.txt')]);
    check(jm.log.requests.length === 0 && /alleen "Algemeen dataroomdocument"/.test(jmu.samenvatting), 'algemeen juridisch: GROUP buiten Financieel geweigerd vóór fetch');

    // Rollen/vergrendeling: geen uploadclassificatie in een niet-financiële fase.
    for (const rol of ['koper', 'tussenpersoon', 'meekijker', '']) {
      const t = laad(root, { rol }); t.begin('juridisch');
      t.els['doc-klas-aan-juridisch'] = Object.assign(maakEl('doc-klas-aan-juridisch'), { checked: true });
      t.els['doc-klas-scope-juridisch'] = Object.assign(maakEl(''), { value: 'GENERAL' });
      check(!/doc-klas/.test(t.log.html) && !('classificatie' in t.ctx.leesUploadKeuzes('juridisch')), 'algemeen rol ' + (rol || '(leeg)') + ': geen keuzeblok en geen classificatie in juridisch');
    }
    const l = laad(root, { vergrendeld: true }); l.begin('juridisch');
    check(!/doc-klas/.test(l.log.html), 'algemeen vergrendeld: geen keuzeblok');

    // Vervangen na rerender: huidige GENERAL-keuze, vervangt behouden, oude versie vervangen.
    const oud = { id: 'doc_oud', naam: 'syn-oud.txt', type: 'text/plain', grootte: 40, analyse: '', velden: {}, bewaard: true, uploading: false, versie: 1, verwerking_status: 'STORED' };
    const c = laad(root); c.ctx.DOCS[FASE] = [oud]; c.begin(); c.kies({ scope: 'GENERAL' });
    c.opzet.upload.push(algemeenAntw('doc_nieuw', { versie: 2 }));
    c.ctx.vervangDocument(FASE, 'doc_oud'); c.ctx._laatsteKiezer.files = [c.bestand('syn-nieuw.txt')]; c.ctx._laatsteKiezer.onchange(); await wacht();
    const cu = c.log.requests[0] && c.log.requests[0].url;
    check(cu && cu.endsWith(Q_GEN + '&vervangt=doc_oud') && zuiverAlgemeen(cu) && c.log.requests[0].rendersVoorRequest >= 2 && c.log.requests[0].paneelAanBijRequest === false, 'algemeen vervangen: momentopname vóór renderApp, alleen doc_scope + vervangt · ' + cu);
    check(!c.ctx.DOCS[FASE].some((d) => d.id === 'doc_oud') && c.ctx.DOCS[FASE][0].id === 'doc_nieuw' && c.ctx.DOCS[FASE][0].heeft_eerdere_versies === true && c.ctx.DOCS[FASE][0].documentclassificatie.scope === 'GENERAL', 'algemeen vervangen: STORED vervangt de oude versie (bestaand gedrag)');

    // Reload en versiehistorie.
    const h = laad(root); h.begin();
    h.opzet.lijst.push({ status: 200, body: [
      { id: 'doc_gen', bestand_naam: 'syn-gen.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 1, versie: 2, heeft_eerdere_versies: true, verwerking_status: 'STORED', bestand_opgeslagen: true, entiteit_id: null, documentclassificatie: GEN() },
      { id: 'doc_gen_vals', bestand_naam: 'syn-gen-vals.txt', bestand_type: 'text/plain', bestand_grootte: 40, bewaard: 1, analyse: '', veld_extractie: '{}', uploaded_at: 2, versie: 1, verwerking_status: 'STORED', bestand_opgeslagen: true, entiteit_id: 'ENT_SYN_A', documentclassificatie: GEN() },
    ] });
    h.ctx.loadDocsForFase(FASE); await wacht();
    const hd = (id) => h.ctx.DOCS[FASE].find((d) => d.id === id);
    const hw = weergaven(h.log.html);
    check(hd('doc_gen').documentclassificatie.scope === 'GENERAL' && hd('doc_gen_vals').documentclassificatie === null && /Algemeen dataroomdocument/.test(hw) && /Niet geclassificeerd/.test(hw) && !/jaarrealisatie/i.test(hw) && !/>Controle nodig<|fd-ent-doc_gen"/.test(h.log.html), 'algemeen reload: GENERAL getoond; GENERAL op een rij met entiteit fail-closed onbekend');
    h.opzet.versies.push({ status: 200, body: { ok: true, versies: [
      { id: 'doc_g1', bestand_naam: 'syn-g1.txt', versie: 1, bewaard: 1, uploaded_at: 1, entiteit_id: null, documentclassificatie: dto('GROUP', 'P&L', 'FY2026', 'FORECAST') },
      { id: 'doc_g2', bestand_naam: 'syn-g2.txt', versie: 2, bewaard: 1, uploaded_at: 2, entiteit_id: null, documentclassificatie: Object.assign(GEN(), { binding: BINDING }) },
    ] } });
    await h.ctx.toonVersieGeschiedenis('doc_g2');
    const box = h.log.modals.map((n) => n.innerHTML).find((x) => /Versiegeschiedenis/.test(x) && /v2/.test(x)) || '';
    check(/Algemeen dataroomdocument/.test(box) && /Prognose \(forecast\)/.test(box) && (box.match(/jaarrealisatie/gi) || []).length === 1 && !box.includes(BINDING), 'algemeen versies: v2 algemeen document, v1 behoudt eigen groepsclassificatie, geen binding');
  });

  return res;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiGroupDocumentsUiChecks(root);
  res.forEach((r) => console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg));
  const fout = res.filter((r) => !r.ok).length;
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' checks gefaald.' : '\nAlle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
