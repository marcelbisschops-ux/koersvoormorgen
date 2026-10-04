#!/usr/bin/env node
// Bewijsstuk-upload (4 okt 2026) — live stagingproef: gebruiker vinkt #bewijsstuk-alleen-financieel
// aan, upload geeft 200/ok/doc_id maar alleen_bewijsstuk=false. Oorzaak: uploadDocumentenSequentieel
// riep renderApp (die de uploadzone met een lege checkbox opnieuw tekent) vóórdat uploadDocument de
// checkbox las; bij een directe enkelvoudige upload deed uploadDocument zelf hetzelfde. De keuze wordt
// nu vóór het hertekenen vastgelegd en ongewijzigd aan uploadDocument doorgegeven.
//
// Deze test draait de ECHTE uploadDocumentenSequentieel, uploadDocument, vervangDocument en
// renderDocumentSectie (mna/02) en de ECHTE fetchMetTimeout (mna/01) in node:vm. renderApp tekent via
// de echte renderDocumentSectie en maakt de checkboxes opnieuw aan zoals de browser dat doet; fetch is
// een stub die de echte request-URL vastlegt. Geen netwerk, geen browser, synthetische gegevens.
//
// Foutpropagatie (zelfde dag): entiteitkeuze en "Extra controle" hadden hetzelfde verlies; leesUploadKeuzes
// legt nu alle drie de keuzes in één keer vast. Ook die paden worden hieronder gecontroleerd.
//
// Gebruik: node tests/document-bewijsstuk-upload.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 24).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const FASE = 'financieel';
const CB = 'bewijsstuk-alleen-' + FASE;

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
  return { id, checked: !!checked, value: '', textContent: '', style: {}, files: null, onchange: null, remove() {}, click() {} };
}

function laad(root) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const delen = [
    regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    knip(src02, 'function getDocsForFase(faseId) {', '\n}\n'),
    knip(src02, 'function entiteitNaam(id){', '\n}\n'),
    knip(src02, 'function gokEntiteitId(entiteitNaamAI, alleenZeker){', '\n}\n'),
    knip(src02, 'function leesUploadKeuzes(faseId) {', '\n}\n'),
    knip(src02, 'window.uploadDocumentenSequentieel = async function(faseId, files) {', '\n};\n'),
    knip(src02, 'async function uploadDocument(faseId, file, existingId, vervangtDocId', '\n}\n'),
    knip(src02, 'function renderDocumentSectie(faseId) {', '\n}\n'),
    knip(src02, 'window.vervangDocument = function(faseId, docId) {', '\n};\n'),
  ];

  const els = {};
  const log = { renders: 0, requests: [], overig: [], autoFill: 0, toasts: [], html: '' };
  let docNr = 0;

  // renderApp: echte renderDocumentSectie; elke <input type="checkbox" id="..."> ontstaat opnieuw
  // met de checked-stand uit de HTML — precies wat de browser bij innerHTML-hertekenen doet.
  function renderApp() {
    log.renders++;
    const html = ctx.renderDocumentSectie(FASE);
    log.html = html;
    for (const m of html.matchAll(/<input type="checkbox" id="([^"]+)"([^>]*)>/g)) els[m[1]] = maakEl(m[1], /\schecked[\s>=]/.test(m[2] + '>'));
    for (const m of html.matchAll(/<div id="(upload-status-[^"]+)"/g)) els[m[1]] = maakEl(m[1]);
    for (const m of html.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) { const sel = m[2].match(/<option value="([^"]*)"[^>]*\sselected/); const el = maakEl(m[1]); el.value = sel ? sel[1] : ''; els[m[1]] = el; }
  }

  const fetch = (url, opts = {}) => {
    const u = String(url);
    if (u.indexOf(WORKER + '/mna/document/upload?') !== 0) {
      log.overig.push(u);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    }
    log.requests.push({ url: u, checkboxBijRequest: els[CB] ? els[CB].checked : null, rendersVoorRequest: log.renders, body: opts.body });
    const alleen = /[?&]alleen_bewijsstuk=true(&|$)/.test(u);
    docNr++;
    // Zoals de backend: bewijsstuk-modus geeft geen veld_extractie/crosschecks terug.
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, doc_id: 'doc_syn_' + docNr, alleen_bewijsstuk: alleen, r2_opgeslagen: true, analyse: '', versie: 1 }) });
  };

  const ctx = vm.createContext({
    WORKER, DOCS: {}, S: { code: 'VSYN0001', rol: 'verkoper', traject: { status: 'actief', bewaar_docs: true }, _entiteiten: [] },
    document: {
      getElementById: (id) => els[id] || null,
      createElement: (tag) => { const el = maakEl('nieuw-' + tag); el.click = () => { ctx._laatsteKiezer = el; }; return el; },
      body: { appendChild() {} },
    },
    renderApp, fetch, FormData, AbortController, setTimeout, clearTimeout, console,
    toast: (msg, type) => log.toasts.push({ msg: String(msg), type }),
    autoFillFromExtraction: () => { log.autoFill++; },
    markDirty() {}, schedSave() {}, saveEntiteitData() {},
  });
  ctx.window = ctx;
  vm.runInContext(delen.join('\n\n'), ctx, { filename: 'mna/01+02#bewijsstuk-upload' });

  const nieuwBestand = (naam) => new File(['Synthetisch bewijsstuk (geen echte gegevens).'], naam, { type: 'text/plain' });
  // Gebruiker opent de fase: uploadzone getekend, vinkt eventueel "Alleen als bewijsstuk" aan.
  const begin = (aanvinken, entiteiten) => {
    ctx.DOCS[FASE] = [];
    ctx.S._entiteiten = entiteiten || [];
    log.renders = 0; log.requests = []; log.overig = []; log.autoFill = 0; log.toasts = [];
    renderApp();
    if (aanvinken) els[CB].checked = true;
  };
  return { ctx, els, log, begin, nieuwBestand };
}

export async function draaiDocumentBewijsstukUploadChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const probeer = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.message) || e)); } };
  const metVlag = (r) => /[?&]alleen_bewijsstuk=true(&|$)/.test(r.url);
  const geenAi = (log) => log.autoFill === 0 && log.overig.length === 0 && log.requests.every((r) => r.url.indexOf('dubbele_check') < 0);

  await probeer('render', async () => {
    const t = laad(root);
    t.begin(true);
    check(t.els[CB] && t.els[CB].checked === true, 'render: echte uploadzone bevat #' + CB + ' en de gebruiker kan hem aanvinken');
    t.ctx.renderApp();
    check(t.els[CB] && t.els[CB].checked === false, 'render: hertekenen via de echte renderDocumentSectie zet #' + CB + ' terug op uit (oorzaak van het verlies)');
  });

  await probeer('batch aangevinkt', async () => {
    const t = laad(root);
    t.begin(true);
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.nieuwBestand('syn-a.txt'), t.nieuwBestand('syn-b.txt')]);
    const r = t.log.requests;
    check(r.length === 2, 'batch aangevinkt: twee bestanden geven twee upload-requests (' + r.length + ')');
    check(r.length === 2 && r.every((x) => x.rendersVoorRequest >= 2 && x.checkboxBijRequest === false), 'batch aangevinkt: renderApp heeft de checkbox vóór het request werkelijk gewist (scenario reproduceert de stagingfout)');
    check(r.length === 2 && r.every(metVlag), 'batch aangevinkt: beide echte request-URL\'s bevatten &alleen_bewijsstuk=true · ' + r.map((x) => x.url).join(' | '));
    check(r.length === 2 && r.every((x) => x.body && typeof x.body.get === 'function' && x.body.get('file')), 'batch aangevinkt: bestand blijft in de FormData-body');
    check(geenAi(t.log), 'batch aangevinkt: geen AI-route (geen autoFill, geen dubbele_check, geen andere requests)');
    const docs = t.ctx.DOCS[FASE] || [];
    check(docs.length === 2 && docs.every((d) => d.alleen_bewijsstuk === true && !d.uploading), 'batch aangevinkt: beide documenten als bewijsstuk in de lijst, geen wachtrij-plek achtergebleven');
    check(t.log.toasts.filter((x) => /als bewijsstuk/.test(x.msg)).length === 2, 'batch aangevinkt: bewijsstuk-melding per bestand');
  });

  await probeer('batch niet aangevinkt', async () => {
    const t = laad(root);
    t.begin(false);
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.nieuwBestand('syn-c.txt'), t.nieuwBestand('syn-d.txt')]);
    const r = t.log.requests;
    check(r.length === 2 && r.every((x) => x.url.indexOf('alleen_bewijsstuk') < 0), 'batch niet aangevinkt: geen alleen_bewijsstuk in de request-URL\'s');
  });

  await probeer('direct aangevinkt', async () => {
    const t = laad(root);
    t.begin(true);
    await t.ctx.uploadDocument(FASE, t.nieuwBestand('syn-e.txt'));
    const r = t.log.requests;
    check(r.length === 1 && r[0].checkboxBijRequest === false && r[0].rendersVoorRequest >= 2, 'direct aangevinkt: renderApp van de directe upload wist de checkbox vóór het request');
    check(r.length === 1 && metVlag(r[0]), 'direct aangevinkt: echte request-URL bevat &alleen_bewijsstuk=true · ' + (r[0] && r[0].url));
    check(geenAi(t.log), 'direct aangevinkt: geen AI-route');
  });

  await probeer('direct niet aangevinkt', async () => {
    const t = laad(root);
    t.begin(false);
    await t.ctx.uploadDocument(FASE, t.nieuwBestand('syn-f.txt'));
    const r = t.log.requests;
    check(r.length === 1 && r[0].url.indexOf('alleen_bewijsstuk') < 0, 'direct niet aangevinkt: geen alleen_bewijsstuk in de request-URL');
  });

  await probeer('vervangen', async () => {
    const t = laad(root);
    t.begin(true);
    t.ctx.vervangDocument(FASE, 'doc_oud_1');
    const kiezer = t.ctx._laatsteKiezer;
    kiezer.files = [t.nieuwBestand('syn-g.txt')];
    kiezer.onchange();
    await new Promise((r) => setTimeout(r, 20));
    const r = t.log.requests;
    check(r.length === 1 && metVlag(r[0]) && /[?&]vervangt=doc_oud_1(&|$)/.test(r[0].url), 'vervangen (directe caller): request-URL behoudt &vervangt= en bevat &alleen_bewijsstuk=true · ' + (r[0] && r[0].url));
  });

  // Foutpropagatie (4 okt 2026, zelfde mechanisme): ook de entiteitkeuze en "Extra controle" werden
  // pas ná renderApp gelezen; de hertekende <select> staat dan weer op "Groep/hoofdentiteit".
  const ENT = [{ id: 'ent_syn_1', naam: 'Synth Werk BV' }, { id: 'ent_syn_2', naam: 'Synth Holding BV' }];
  await probeer('batch entiteit', async () => {
    const t = laad(root);
    t.begin(false, ENT);
    check(t.els['entiteit-select-' + FASE] && t.els['entiteit-select-' + FASE].value === '', 'entiteit: echte uploadzone tekent de entiteitkiezer, standaard Groep/hoofdentiteit');
    t.els['entiteit-select-' + FASE].value = 'ent_syn_1';
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.nieuwBestand('syn-h.txt'), t.nieuwBestand('syn-i.txt')]);
    const r = t.log.requests;
    check(r.length === 2 && r.every((x) => /[?&]entiteit_id=ent_syn_1(&|$)/.test(x.url)), 'batch entiteit: gekozen entiteit blijft in beide request-URL\'s · ' + r.map((x) => x.url).join(' | '));
  });
  await probeer('direct entiteit', async () => {
    const t = laad(root);
    t.begin(false, ENT);
    t.els['entiteit-select-' + FASE].value = 'ent_syn_2';
    await t.ctx.uploadDocument(FASE, t.nieuwBestand('syn-j.txt'));
    const r = t.log.requests;
    check(r.length === 1 && /[?&]entiteit_id=ent_syn_2(&|$)/.test(r[0].url), 'direct entiteit: gekozen entiteit blijft in de request-URL · ' + (r[0] && r[0].url));
  });
  await probeer('batch geen entiteit', async () => {
    const t = laad(root);
    t.begin(false, ENT);
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.nieuwBestand('syn-k.txt')]);
    const r = t.log.requests;
    check(r.length === 1 && r[0].url.indexOf('entiteit_id') < 0, 'batch zonder entiteitkeuze: geen entiteit_id (groep/hoofdentiteit, ongewijzigd)');
  });
  await probeer('batch extra controle', async () => {
    const t = laad(root);
    t.begin(false);
    t.els['dubbele-check-' + FASE].checked = true;
    await t.ctx.uploadDocumentenSequentieel(FASE, [t.nieuwBestand('syn-l.txt'), t.nieuwBestand('syn-m.txt')]);
    const r = t.log.requests;
    check(r.length === 2 && r.every((x) => /[?&]dubbele_check=true(&|$)/.test(x.url) && x.url.indexOf('alleen_bewijsstuk') < 0), 'batch extra controle: &dubbele_check=true in beide request-URL\'s, geen bewijsstukmodus · ' + r.map((x) => x.url).join(' | '));
  });
  await probeer('direct extra controle', async () => {
    const t = laad(root);
    t.begin(false);
    t.els['dubbele-check-' + FASE].checked = true;
    await t.ctx.uploadDocument(FASE, t.nieuwBestand('syn-n.txt'));
    const r = t.log.requests;
    check(r.length === 1 && /[?&]dubbele_check=true(&|$)/.test(r[0].url), 'direct extra controle: &dubbele_check=true in de request-URL · ' + (r[0] && r[0].url));
  });

  return res;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiDocumentBewijsstukUploadChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n  ' + fout + ' van ' + res.length + ' checks gefaald.' : '\n  Alle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
