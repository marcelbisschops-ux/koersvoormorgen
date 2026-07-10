#!/usr/bin/env node
// Mechanische consistentie- en veiligheidsaudit — geen live traffic, geen kosten, draait lokaal
// tegen de bestandsboom. Bedoeld om bugklasses te vangen die de functionele e2e-tests niet raken:
// verkeerde/vergeten veld-referenties, functies die per ongeluk een top-level naamgenoot shadowen,
// en begeleiderAuth-aanroepen met een verdacht (leeg/niet-URL-afgeleid) trajectCode-argument.
//
// Ontstaan (10 juli 2026): een mechanische pass van vijftien minuten vond een kritiek
// cross-traject-autorisatielek (zie memory project_begeleiderauth_crosstraject_lek) dat de
// bestaande e2e-suite niet had gevangen. Dit script legt die aanpak vast zodat hij herhaalbaar is.
//
// Gebruik: node tests/audit-consistentie.mjs   (vanuit de repo-root)
// Exit code 0 = niets verdachts, exit code 1 = bevindingen (zie output).

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let bevindingen = 0;

function log(sectie) { console.log('\n\x1b[1m' + sectie + '\x1b[0m'); }
function ok(msg) { console.log('  \x1b[32m✓\x1b[0m ' + msg); }
function warn(msg) { console.log('  \x1b[33m⚠\x1b[0m ' + msg); bevindingen++; }

// ── 1. Sectorprofiel-velden inlezen ──────────────────────────────────────────
const cfgPath = path.join(ROOT, 'mna/01-config-sectorprofielen.js');
const cfgSrc = fs.readFileSync(cfgPath, 'utf8');
const sectorBlockRe = /^  (\w+): \{/gm;
const sectorStarts = [];
let m;
while ((m = sectorBlockRe.exec(cfgSrc))) sectorStarts.push({ name: m[1], idx: m.index });
const validKeys = new Set();
sectorStarts.forEach((s, i) => {
  const end = i + 1 < sectorStarts.length ? sectorStarts[i + 1].idx : cfgSrc.length;
  const block = cfgSrc.slice(s.idx, end);
  const faseRe = /\{id:'(\w+)',num:'[^']*',title:'[^']*',desc:'[^']*',\s*dataFields:\[([\s\S]*?)\]\s*,\s*items:/g;
  let fm;
  while ((fm = faseRe.exec(block))) {
    const faseId = fm[1];
    const idRe = /\{id:'(\w+)'/g;
    let im;
    while ((im = idRe.exec(fm[2]))) {
      if (im[1].startsWith('_hdr')) continue;
      validKeys.add(faseId + '_' + im[1]);
    }
  }
});

// ── 2. Veldreferenties (lees- en schrijfkant) in mna/*.js controleren ────────
log('1. Veldreferentie-consistentie (mna/*.js tegen sectorprofielen)');
const mnaFiles = fs.readdirSync(path.join(ROOT, 'mna')).filter(f => f.endsWith('.js')).map(f => 'mna/' + f);
const refPatterns = [
  { re: /S\.data\[(?:'([a-z0-9_]+)'|"([a-z0-9_]+)")\]/g, label: 'S.data[...] (lezen)' },
  { re: /(?:setIfEmpty|applyOrConflict)\('([a-z0-9_]+)'/g, label: "setIfEmpty/applyOrConflict('...') (schrijven)" },
];
let refIssues = [];
mnaFiles.forEach(file => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  src.split('\n').forEach((line, idx) => {
    // Regel eindigend op een string-concatenatie (bv. 'financieel_'+var) heeft geen vaste key —
    // die negeren we, want die zijn per ontwerp dynamisch en niet tegen deze lijst te toetsen.
    if (/'[a-z0-9_]+_?'\s*\+/.test(line)) return;
    refPatterns.forEach(p => {
      let rm;
      const re = new RegExp(p.re.source, 'g');
      while ((rm = re.exec(line))) {
        const key = rm[1] || rm[2];
        if (!key || !key.includes('_')) return;
        if (!validKeys.has(key)) refIssues.push({ file, line: idx + 1, key, label: p.label, text: line.trim().slice(0, 120) });
      }
    });
  });
});
if (!refIssues.length) ok('Geen verdachte veld-referenties (' + validKeys.size + ' geldige velden gecontroleerd).');
else refIssues.forEach(i => warn(i.file + ':' + i.line + ' — "' + i.key + '" bestaat in geen enkel sectorprofiel (' + i.label + ')\n      ' + i.text));

// ── 3. Functienaam die zowel als top-level function ALS als const-arrow bestaat ──
// (het exacte patroon van de begeleiderAuth-bug: een lokale const shadowt een gelijknamige
// module-level function, en alle aanroepen binnen dat bereik gebruiken zonder het te weten de
// verkeerde/andere versie.)
log('2. Functies die zowel als "function X" én als "const X = (...) =>" bestaan (shadowing-risico)');
const workerPath = fs.existsSync(path.join(ROOT, 'backend/cloudflare-worker.js'))
  ? path.join(ROOT, 'backend/cloudflare-worker.js')
  : null;
if (!workerPath) {
  warn('backend/cloudflare-worker.js niet gevonden — sync eerst vanuit ~/Downloads/cloudflare-worker.js voordat je deze check draait.');
} else {
  const workerSrc = fs.readFileSync(workerPath, 'utf8');
  const functionNames = new Set();
  const constArrowNames = new Set();
  const funcRe = /^\s*(?:async )?function ([A-Za-z_][A-Za-z0-9_]*)/gm;
  const constFnRe = /^\s*const ([A-Za-z_][A-Za-z0-9_]*) = (?:async )?\(/gm;
  let fm2;
  while ((fm2 = funcRe.exec(workerSrc))) functionNames.add(fm2[1]);
  while ((fm2 = constFnRe.exec(workerSrc))) constArrowNames.add(fm2[1]);
  const overlap = [...functionNames].filter(n => constArrowNames.has(n));
  if (!overlap.length) ok('Geen overlap tussen function- en const-arrow-namen gevonden.');
  else overlap.forEach(name => warn('"' + name + '" bestaat zowel als "function ' + name + '" als "const ' + name + ' = (...) =>" — controleer welke versie waar wordt gebruikt (grep "' + name + '(" ), dit is exact het patroon dat begeleiderAuth brak.'));

  // ── 4. begeleiderAuth-aanroepen met een verdacht trajectCode-argument ──────
  log('3. begeleiderAuth(...)-aanroepen met een leeg/verdacht trajectCode-argument');
  const callRe = /begeleiderAuth\(request,\s*([^)]*)\)/g;
  let cm;
  const verdachteCalls = [];
  while ((cm = callRe.exec(workerSrc))) {
    const arg = cm[1].trim();
    const lineNr = workerSrc.slice(0, cm.index).split('\n').length;
    // Verdacht: een lege string-literal, of een tweede argument (env) waar er maar 2 params horen.
    if (arg === "''" || arg === '""' || arg.startsWith('env')) {
      verdachteCalls.push({ lineNr, arg });
    }
  }
  if (!verdachteCalls.length) ok('Alle begeleiderAuth-aanroepen geven een niet-triviaal trajectCode-argument mee.');
  else verdachteCalls.forEach(c => warn('regel ' + c.lineNr + ': begeleiderAuth(request, ' + c.arg + ') — leeg of verdacht argument. Zorg dat dit het traject_id/code van de daadwerkelijke resource is (zie hoe /mna/admin/qa/antwoord/{id} en /mna/document/herclassificeer/{id} dit doen: eerst de resource opzoeken, dán pas begeleiderAuth aanroepen met het GEVONDEN traject_id).'));
}

// ── Samenvatting ──────────────────────────────────────────────────────────
log('Samenvatting');
if (!bevindingen) {
  console.log('  \x1b[32mGeen bevindingen.\x1b[0m');
  process.exit(0);
} else {
  console.log('  \x1b[33m' + bevindingen + ' bevinding(en) — zie hierboven.\x1b[0m');
  process.exit(1);
}
