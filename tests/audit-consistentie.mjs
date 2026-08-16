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
import { execSync } from 'child_process';

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
//
// Sinds de opsplitsing van cloudflare-worker.js in worker/*.js-modules (juli 2026) draaien
// checks 2/3/5 over ALLE backend-bestanden (entry + elke module), niet alleen het entry-bestand —
// anders verdwijnt precies de dekking die deze checks moeten bieden zodra route-code verhuist.
//
// Sinds 23 juli 2026 leeft backend/ NIET meer in deze (publieke) repo — verplaatst naar de
// aparte privé-repo koersvoormorgen-backend (zie memory reference-worker-buiten-git). Deze
// checks proberen backend/ eerst hier, dan in de gebruikelijke sibling-map te vinden; ontbreekt
// het overal, dan is dat de verwachte, permanente staat hier — geen waarschuwing, gewoon overslaan.
log('2. Functies die zowel als "function X" én als "const X = (...) =>" bestaan (shadowing-risico)');
const BACKEND_CANDIDATES = [
  path.join(ROOT, 'backend'),
  path.join(ROOT, '..', 'koersvoormorgen-backend', 'backend'),
];
const backendDir = BACKEND_CANDIDATES.find(p => fs.existsSync(path.join(p, 'cloudflare-worker.js')));
const workerPath = backendDir ? path.join(backendDir, 'cloudflare-worker.js') : null;
const workerModulesDir = backendDir ? path.join(backendDir, 'worker') : null;
const backendFiles = [];
if (workerPath) backendFiles.push({ name: 'backend/cloudflare-worker.js', src: fs.readFileSync(workerPath, 'utf8') });
if (workerModulesDir && fs.existsSync(workerModulesDir)) {
  fs.readdirSync(workerModulesDir).filter(f => f.endsWith('.js')).forEach(f => {
    backendFiles.push({ name: 'backend/worker/' + f, src: fs.readFileSync(path.join(workerModulesDir, f), 'utf8') });
  });
}
if (!backendFiles.length) {
  ok('backend/ niet gevonden (leeft sinds 23 juli 2026 in de privé-repo koersvoormorgen-backend) — checks 2/3/5 overgeslagen. Draai dit script vanuit die repo voor volledige dekking.');
} else {
  const funcRe = /^\s*(?:async )?function ([A-Za-z_][A-Za-z0-9_]*)/gm;
  const constFnRe = /^\s*const ([A-Za-z_][A-Za-z0-9_]*) = (?:async )?\(/gm;
  const overlapFindings = [];
  backendFiles.forEach(({ name, src }) => {
    const functionNames = new Set();
    const constArrowNames = new Set();
    let fm2;
    const fRe = new RegExp(funcRe.source, 'gm');
    const cRe = new RegExp(constFnRe.source, 'gm');
    while ((fm2 = fRe.exec(src))) functionNames.add(fm2[1]);
    while ((fm2 = cRe.exec(src))) constArrowNames.add(fm2[1]);
    const overlap = [...functionNames].filter(n => constArrowNames.has(n));
    overlap.forEach(n => overlapFindings.push({ name, n }));
  });
  if (!overlapFindings.length) ok('Geen overlap tussen function- en const-arrow-namen gevonden.');
  else overlapFindings.forEach(f => warn(f.name + ': "' + f.n + '" bestaat zowel als "function ' + f.n + '" als "const ' + f.n + ' = (...) =>" — controleer welke versie waar wordt gebruikt (grep "' + f.n + '(" ), dit is exact het patroon dat begeleiderAuth brak.'));

  // ── 4. begeleiderAuth-aanroepen met een verdacht trajectCode-argument ──────
  log('3. begeleiderAuth(...)-aanroepen met een leeg/verdacht trajectCode-argument');
  const callRe = /begeleiderAuth\(request,\s*([^)]*)\)/g;
  const verdachteCalls = [];
  backendFiles.forEach(({ name, src }) => {
    let cm;
    const re = new RegExp(callRe.source, 'g');
    while ((cm = re.exec(src))) {
      const arg = cm[1].trim();
      const lineNr = src.slice(0, cm.index).split('\n').length;
      // Verdacht: een lege string-literal, of een tweede argument (env) waar er maar 2 params horen.
      if (arg === "''" || arg === '""' || arg.startsWith('env')) {
        verdachteCalls.push({ name, lineNr, arg });
      }
    }
  });
  if (!verdachteCalls.length) ok('Alle begeleiderAuth-aanroepen geven een niet-triviaal trajectCode-argument mee.');
  else verdachteCalls.forEach(c => warn(c.name + ':' + c.lineNr + ': begeleiderAuth(request, ' + c.arg + ') — leeg of verdacht argument. Zorg dat dit het traject_id/code van de daadwerkelijke resource is (zie hoe /mna/admin/qa/antwoord/{id} en /mna/document/herclassificeer/{id} dit doen: eerst de resource opzoeken, dán pas begeleiderAuth aanroepen met het GEVONDEN traject_id).'));
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
  '/gebruikers/mna/lijst',   // idem strip (13-07-2026) — had ook een losse bug (ongedefinieerde 'email'-variabele), meteen gefixt
  '/mna/document/eigen/versturen', // retourneert alleen {ok:true}; SELECT * wordt enkel gebruikt voor e-mailtekst
  '/mna/teken',                    // retourneert alleen {ok:true}; SELECT * wordt enkel gebruikt voor e-mailtekst/logboek
  '/mna/beoordeling/ai',           // ADMIN_KEY-gated, retourneert alleen {ok,analyse}
  '/mna/waardering/genereer',      // ADMIN_KEY-gated, retourneert alleen het AI-waarderingsvoorstel
  '/mna/infoverzoek/stuur',        // retourneert alleen {ok:true}; SELECT * wordt enkel gebruikt voor e-mailtekst
  '/mna/signhost/stuur',           // ADMIN_KEY- of geldige tussen_code-gated, retourneert alleen transactiestatus
  '/mna/signhost/webhook',         // inkomend vanaf Signhost zelf, retourneert altijd platte tekst 'ok', nooit JSON
]);
if (backendFiles.length) {
  const selectRe = /SELECT \* FROM mna_(trajecten|gesprekken)\b/;
  const selectStarIssues = [];
  backendFiles.forEach(({ src }) => {
    const wLines = src.split('\n');
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
  });
  const uniekeIssues = [...new Set(selectStarIssues)].filter(p => !GEVERIFIEERD_VEILIG_CHECK5.has(p));
  const genegeerd = [...new Set(selectStarIssues)].filter(p => GEVERIFIEERD_VEILIG_CHECK5.has(p));
  if (genegeerd.length) ok(genegeerd.length + ' eerder handmatig geverifieerd en veilig bevonden: ' + genegeerd.join(', '));
  if (!uniekeIssues.length) ok('Geen nieuwe, nog niet gecontroleerde SELECT * op mna_trajecten/mna_gesprekken buiten /admin/-routes gevonden.');
  else uniekeIssues.forEach(p => warn(p + ' — NIEUW — doet SELECT * op mna_trajecten/mna_gesprekken én stuurt binnen dezelfde route JSON terug, buiten een /admin/-pad. Controleer of alle teruggegeven velden voor élke rol die dit endpoint mag aanroepen (incl. koper) bedoeld zijn.'));
} else {
  ok('backend/ niet gevonden (leeft sinds 23 juli 2026 in de privé-repo koersvoormorgen-backend) — check 5 overgeslagen.');
}

// ── 6. Tabellen met traject_id die ontbreken in een traject-verwijder-cascade ──
// (het patroon van 25 juli én 16 aug 2026: elke keer een nieuwe traject-gebonden tabel toegevoegd
// zonder 'm ook in een DELETE-batch op te nemen, waardoor wees-rijen achterblijven. 16 aug 2026,
// tweede keer op één dag: er bleken TWEE los onderhouden cascades te zijn — /admin/delete/mna/ én
// /avg/verwijder (het AVG-recht-op-vergetelheid-endpoint, worker/06-scantool.js) — de eerste werd
// gefixt, de tweede pas later die dag ontdekt, nog steeds stuk. Vandaar (tot 17 aug 2026): elke
// bekende cascade-locatie werd APART gevalideerd, geen gedeelde/gecombineerde dekking.
// 17 aug 2026: de twee cascades zelf geconsolideerd tot één gedeelde functie —
// verwijderTrajectData(env, trajectId, tussenCode) in backend/worker/02-config-constanten.js. Deze
// check valideert nu die ene functie op tabeldekking, én controleert apart dat beide routes 'm ook
// daadwerkelijk AANROEPEN (i.p.v. zelf weer een eigen inline DELETE-lijst te krijgen — dat zou
// exact deze bug opnieuw introduceren, alleen dan onzichtbaar voor de tabeldekkingscheck zelf).
// mna_trajecten zelf (sleutelt op id), mna_vok (sleutelt op tussen_code) en mna_audit (bewust
// bewaard, P4-besluit 25 juli 2026) hebben geen traject_id-kolom en verschijnen dus terecht nooit
// in de lijst.
log('6. Tabellen met traject_id die ontbreken in de gedeelde traject-verwijder-cascade');
if (backendFiles.length) {
  const workerEntry = backendFiles.find(f => f.name === 'backend/cloudflare-worker.js');
  const sharedFile = backendFiles.find(f => f.name === 'backend/worker/02-config-constanten.js');
  if (!workerEntry || !sharedFile) {
    ok('backend/cloudflare-worker.js of backend/worker/02-config-constanten.js niet gevonden — check 6 overgeslagen.');
  } else {
    const createRe = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)`,/g;
    const tablesWithTrajectId = new Set();
    let cm;
    while ((cm = createRe.exec(workerEntry.src))) {
      if (/\btraject_id\b/.test(cm[2])) tablesWithTrajectId.add(cm[1]);
    }
    const fnMarker = 'export async function verwijderTrajectData(';
    const fnStart = sharedFile.src.indexOf(fnMarker);
    if (fnStart === -1) {
      warn('backend/worker/02-config-constanten.js: verwijderTrajectData() niet gevonden — is de gedeelde cascade verplaatst/hernoemd? Kan niet gevalideerd worden.');
    } else {
      const fnScope = sharedFile.src.slice(fnStart, fnStart + 6000);
      const delRe = /DELETE FROM (\w+) WHERE traject_id=/g;
      const covered = new Set();
      let dm;
      while ((dm = delRe.exec(fnScope))) covered.add(dm[1]);
      const missing = [...tablesWithTrajectId].filter(t => !covered.has(t));
      if (!missing.length) ok('verwijderTrajectData(): ' + tablesWithTrajectId.size + ' tabellen met traject_id gecontroleerd, allemaal gedekt.');
      else missing.forEach(t => warn('verwijderTrajectData(): tabel "' + t + '" heeft een traject_id-kolom maar staat er NIET in — voeg toe: DELETE FROM ' + t + ' WHERE traject_id=?'));
    }
    // Bekende call-sites — nieuwe cascade-aanroep ergens anders toegevoegd? Hier registreren.
    const CASCADE_CALLSITES = [
      { bestandNaam: 'backend/worker/13-mna-afsluiten-delete.js', marker: "path.startsWith('/admin/delete/mna/')", label: '/admin/delete/mna/' },
      { bestandNaam: 'backend/worker/06-scantool.js', marker: "path === '/avg/verwijder'", label: '/avg/verwijder (AVG-recht-op-vergetelheid)' },
    ];
    CASCADE_CALLSITES.forEach(({ bestandNaam, marker, label }) => {
      const bestand = backendFiles.find(f => f.name === bestandNaam);
      if (!bestand) { warn(bestandNaam + ' niet gevonden — call-site "' + label + '" kan niet gevalideerd worden.'); return; }
      const startIdx = bestand.src.indexOf(marker);
      if (startIdx === -1) { warn(bestandNaam + ': route ' + label + ' niet gevonden — is deze verplaatst/hernoemd? Call-site kan niet gevalideerd worden.'); return; }
      const scope = bestand.src.slice(startIdx, startIdx + 12000);
      if (scope.includes('verwijderTrajectData(')) ok(label + ' (' + bestandNaam + '): roept de gedeelde verwijderTrajectData() aan.');
      else warn(bestandNaam + ' (route ' + label + '): roept verwijderTrajectData() NIET aan — heeft deze weer een eigen inline DELETE-lijst? Dat herintroduceert de duplicatie die op 17 aug 2026 juist is opgelost.');
    });
  }
} else {
  ok('backend/ niet gevonden (leeft sinds 23 juli 2026 in de privé-repo koersvoormorgen-backend) — check 6 overgeslagen.');
}

// ── 7. Echte cliëntnamen/traject-codes in code, docs of commit-berichten ──
// (16 aug 2026: twee eerder gebruikte, echte cliëntnamen bleken over weken tijd, in tientallen
// commits, in dit publieke repo terechtgekomen — via code-comments én commit-berichten — zonder
// dat iets dat opmerkte, tot er expliciet naar gevraagd werd. Deze check leest een lokale, NOOIT
// gecommitte termenlijst (.gevoelige-termen.local.txt, zie .gitignore) en scant daar zowel de
// huidige bestandsboom als de recente commit-berichten tegen. Bestaat het lijst-bestand niet
// (bijv. een verse clone), dan is dat geen fout — gewoon nog niets bijgehouden, geen valse
// zekerheid. LET OP — zelfde valkuil als hierboven: deze check-tekst mag de namen zelf ook nooit
// noemen (gebeurde hier per ongeluk, ontdekt via /code-review ultra, meteen gecorrigeerd).
log('7. Echte cliëntnamen/traject-codes uit .gevoelige-termen.local.txt (bestandsboom + recente commits)');
const termenPad = path.join(ROOT, '.gevoelige-termen.local.txt');
if (!fs.existsSync(termenPad)) {
  ok('.gevoelige-termen.local.txt bestaat niet (nog niets bijgehouden) — check 7 kan niets controleren.');
} else {
  const termen = fs.readFileSync(termenPad, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  if (!termen.length) {
    ok('.gevoelige-termen.local.txt is leeg — niets om te controleren.');
  } else {
    const gevonden = [];
    // Bestandsboom: dezelfde bestandstypen als de rest van dit script bestrijkt, PLUS .gitignore
    // en .mjs — die vielen er eerder buiten (gevonden via /code-review ultra, 16 aug 2026: precies
    // de twee bestanden waar de teruggekeerde namen in stonden, inclusief deze eigen auditscript).
    const scanDirs = ['mna', 'tests'];
    const scanFiles = fs.readdirSync(ROOT).filter(f => /\.(md|html)$/i.test(f) || f === '.gitignore').map(f => path.join(ROOT, f));
    scanDirs.forEach(d => {
      const dirPath = path.join(ROOT, d);
      if (!fs.existsSync(dirPath)) return;
      fs.readdirSync(dirPath).filter(f => /\.(js|mjs|md|html)$/i.test(f)).forEach(f => scanFiles.push(path.join(dirPath, f)));
    });
    if (backendFiles.length) {
      // backendFiles bevat al {name, src} — geen los bestandssysteem-pad nodig, direct op src testen.
      backendFiles.forEach(({ name, src }) => {
        termen.forEach(term => {
          if (src.includes(term)) gevonden.push('backend-bestand ' + name + ': bevat "' + term + '"');
        });
      });
    }
    scanFiles.forEach(fp => {
      const src = fs.readFileSync(fp, 'utf8');
      termen.forEach(term => {
        if (src.includes(term)) gevonden.push('bestand ' + path.relative(ROOT, fp) + ': bevat "' + term + '"');
      });
    });
    // Recente commit-berichten (laatste 50, over alle branches — hoeft niet de volledige
    // geschiedenis te zijn: dit is een vooruitkijkende bewaker, geen archief-herverificatie).
    try {
      const log = execSync('git log --all -n 50 --format=%H%n%s%n%b%n---COMMIT-END---', { cwd: ROOT, encoding: 'utf8' });
      termen.forEach(term => {
        if (log.includes(term)) gevonden.push('commit-bericht (laatste 50, alle branches): bevat "' + term + '" — zoek op met: git log --all -i --grep="' + term + '"');
      });
    } catch (e) { /* geen git-repo of git niet beschikbaar — sla deze subcheck stil over */ }
    if (!gevonden.length) ok(termen.length + ' term(en) uit .gevoelige-termen.local.txt gecontroleerd tegen bestandsboom + recente commit-berichten — niets gevonden.');
    else gevonden.forEach(g => warn(g));
  }
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
