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

// ── 5. "Intern" gelabelde UI-blokken die mogelijk niet zijn afgeschermd voor koper ──
// (het patroon van 10 juli 2026: Checklist/Notities/AI-advies-panelen droegen het label
// "(intern)" maar werden toch aan de koper-rol getoond omdat de if-conditie alleen op
// !isVerkoper() checkte in plaats van ook koper uit te sluiten.)
log('4. "Intern" gelabelde UI-blokken vs. koper-afscherming (mna/*.js)');
const internIssues = [];
mnaFiles.forEach(file => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, idx) => {
    if (/<option value=/.test(line)) return; // dropdown-configuratie, geen getoond contentblok
    if (!/\(intern\)|Intern[e]?\s+(notitie|analyse|advies|instrument)/i.test(line)) return;
    // Bepaal de omvattende functie (terugzoeken naar 'function naam(' als grens) en check of
    // ÉRGENS daarbinnen, vóór dit label, een '!isKoper()'-conditie voorkomt. Niet de dichtstbijzijnde
    // if(...) nemen — nabijgelegen, ongerelateerde if's (bv. een forEach met een eigen if) geven dan
    // valse meldingen terwijl de échte bewakende conditie verderop terug wél klopt.
    let functieStart = 0;
    for (let back = idx; back >= Math.max(0, idx - 300); back--) {
      if (/^function\s+\w+\s*\(/.test(lines[back])) { functieStart = back; break; }
    }
    const venster = lines.slice(functieStart, idx + 1).join('\n');
    const gevonden = /!isKoper\(\)/.test(venster);
    if (!gevonden) internIssues.push({ file, line: idx + 1, text: line.trim().slice(0, 100) });
  });
});
if (!internIssues.length) ok('Alle "(intern)"-gelabelde blokken staan achter een conditie die koper expliciet uitsluit.');
else internIssues.forEach(i => warn(i.file + ':' + i.line + ' — label "intern" gevonden, geen nabije "!isKoper()"-conditie herkend — controleer handmatig\n      ' + i.text));

// ── 5. SELECT * op gevoelige tabellen buiten /admin/-routes (backend) ──────
// (het patroon achter de twee lekken van 10 juli 2026: /mna/gesprekken/ en /mna/traject/
// deden SELECT * en stuurden het resultaat ongefilterd terug naar élke rol die een geldige
// eigen code had, inclusief koper — óók velden die uitsluitend voor de begeleider bedoeld zijn.
// Regel-venster i.p.v. blok-splitsen, zodat een SELECT * niet per ongeluk gekoppeld wordt aan een
// JSON.stringify() die eigenlijk bij een heel andere, latere route hoort.)
log('5. SELECT * op mna_trajecten/mna_gesprekken buiten /admin/-routes (backend)');
// Handmatig nagelopen op 13-07-2026 (na het /adviseur/trajecten-notitielek) — elk van deze routes
// filtert/beschermt de gevoelige velden al, alleen niet op een manier die deze regel-heuristiek kan
// zien (bijv. maar 1 veld uit het object gehaald, of een inline admin-key-check i.p.v. een /admin/-pad).
// Nieuwe routes horen hier NIET automatisch bij te komen — eerst zelf naar de handler kijken en
// bevestigen dat elk teruggegeven veld voor elke aanroepende rol bedoeld is, dán pas toevoegen.
const GEVERIFIEERD_VEILIG_CHECK5 = new Set([
  '/mna/traject/',           // /mna/save-achtige login-respons: strip alle 8 interne/tekenbevoegdheid-velden vóór JSON.stringify
  '/mna/logboek/',           // geeft alleen traject_fase + logboek terug, nooit het volledige traject-object
  '/mna/traject/afsluiten/', // begeleiderAuth-only (vertrouwde rol), bundelt DD-eindrapport voor de eigen begeleider
  '/mna/groep/detail/',      // harde ADMIN_KEY-check vóór elke query (13-07-2026 toegevoegd)
  '/gebruikers/deactiveer/', // ADMIN_KEY + isSuperAdmin, response is alleen {ok:true}
  '/gebruikers/mna/detail/', // eigenaarscheck (gebruiker_id) + strip dezelfde 8 velden als /mna/traject/ (13-07-2026)
  '/adviseur/trajecten',     // idem strip (13-07-2026) — dit was het echte, live lek dat deze regel miste (zie hieronder)
]);
if (workerPath) {
  const workerSrc2 = fs.readFileSync(workerPath, 'utf8');
  const wLines = workerSrc2.split('\n');
  const selectRe = /SELECT \* FROM mna_(trajecten|gesprekken)\b/;
  const selectStarIssues = [];
  wLines.forEach((line, idx) => {
    if (!selectRe.test(line)) return;
    // Route-pad: zoek terug naar de dichtstbijzijnde 'if (path...' regel.
    let routePath = null;
    // Herkent zowel 'path.startsWith(\'...\')' als het exacte 'path === \'...\''-patroon — de eerste
    // versie van deze regel zag alleen de eerste vorm en miste zo elke exact-match route (93 stuks in
    // de worker, incl. /adviseur/trajecten — precies de route achter het notitielek van 13-07-2026).
    const routeRe = /if\s*\(\s*path\s*(?:\.startsWith\(|===\s*)['"]([^'"]+)['"]/;
    for (let back = idx; back >= Math.max(0, idx - 80); back--) {
      const m = routeRe.exec(wLines[back]);
      if (m) { routePath = m[1]; break; }
    }
    if (!routePath || routePath.includes('/admin/')) return;
    // Stuurt dit dezelfde route-handler het resultaat ook echt terug? Loop vooruit tot óf een
    // JSON.stringify (= mogelijk lek), óf de volgende route ('if (path...') begint (= dit SELECT-
    // resultaat wordt binnen zijn eigen handler nooit gestringified, dus geen lek).
    for (let fwd = idx; fwd <= Math.min(wLines.length - 1, idx + 60); fwd++) {
      if (fwd > idx && /if\s*\(\s*path\s*(?:\.startsWith\(|===)/.test(wLines[fwd])) break;
      if (/JSON\.stringify\(/.test(wLines[fwd])) { selectStarIssues.push(routePath); break; }
    }
  });
  const uniekeIssues = [...new Set(selectStarIssues)].filter(p => !GEVERIFIEERD_VEILIG_CHECK5.has(p));
  const genegeerd = [...new Set(selectStarIssues)].filter(p => GEVERIFIEERD_VEILIG_CHECK5.has(p));
  if (genegeerd.length) ok(genegeerd.length + ' eerder handmatig geverifieerd en veilig bevonden: ' + genegeerd.join(', '));
  if (!uniekeIssues.length) ok('Geen nieuwe, nog niet gecontroleerde SELECT * op mna_trajecten/mna_gesprekken buiten /admin/-routes gevonden.');
  else uniekeIssues.forEach(p => warn(p + ' — NIEUW — doet SELECT * op mna_trajecten/mna_gesprekken én stuurt binnen dezelfde route JSON terug, buiten een /admin/-pad. Controleer of alle teruggegeven velden voor élke rol die dit endpoint mag aanroepen (incl. koper) bedoeld zijn.'));
} else {
  warn('backend/cloudflare-worker.js niet gevonden — check 5 overgeslagen.');
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
