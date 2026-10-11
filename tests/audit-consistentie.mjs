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
//          node tests/audit-consistentie.mjs --bronhash <relpad>   (workflow: alleen bron-sha256 binden, geen audit)
// Exit code 0 = niets verdachts, exit code 1 = bevindingen (zie output).

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// ── Productpunt 22 (10 okt 2026): gebonden, read-only backendbroncontext voor de dagelijkse checks.yml-keten ──
// GitHub run 38045970745 liet zien dat de private backend in CI ontbrak: audit-checks 8/9 vielen terug op
// de oude frontend-structuur en faalden, waardoor de afhankelijke dagelijkse e2e-3rollen-job nooit draaide.
// checks.yml checkt de backend daarom op vertrouwde triggers (schedule, workflow_dispatch, push naar de
// default branch) gericht en read-only uit op een vast pad. Dit blok bevat:
//   1. bepaalBackendBron() — de enige plek waar deze audit de backendbron vandaan haalt: alleen het vaste
//      pad BACKEND_BRON_RELPAD (geen externe/ongevalideerde paden, geen symlinks), gebonden aan de
//      bron-sha256 die de workflow direct na de checkout vastlegt (via --bronhash hieronder);
//   2. draaiCiBackendBroncontextChecks() — synthetische proeven op die resolver en een statische analyse
//      van .github/workflows/checks.yml (check 32). Geen netwerk, geen echte secrets, geen git, geen AI.
// Geïntegreerd vanuit tests/ci-backend-broncontext.mjs (blijft als historisch bronbewijs bestaan, maar
// deze audit en checks.yml hebben het niet meer nodig).
const BACKEND_BRON_RELPAD = '.kvm-backend-bron/backend';
const BACKEND_BRON_REPOSITORY = 'marcelbisschops-ux/koersvoormorgen-backend';
const VERTROUWD_EXPRESSIE = "${{ (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch))) && '1' || '0' }}";
const VERTROUWD_IF = "if: ${{ env.BACKEND_BRON_VERTROUWD == '1' }}";

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const isBestand = p => { try { return fs.lstatSync(p).isFile(); } catch { return false; } };
const isMap = p => { try { return fs.lstatSync(p).isDirectory(); } catch { return false; } };

// Leest exact de bestanden die de audit gebruikt (entry + worker/*.js, gesorteerd) en hasht dezelfde
// buffers — zo is de gebonden hash bewijsbaar die van de bron waarop de audit draaide.
function leesBron(dir) {
  const rels = ['cloudflare-worker.js'];
  const workerDir = path.join(dir, 'worker');
  if (fs.existsSync(workerDir)) fs.readdirSync(workerDir).filter(f => f.endsWith('.js')).sort().forEach(f => rels.push('worker/' + f));
  const delen = rels.map(rel => {
    const buf = fs.readFileSync(path.join(dir, rel));
    return { name: 'backend/' + rel, src: buf.toString('utf8'), hashDeel: rel + '\0' + sha256(buf) + '\n' };
  });
  return { bestanden: delen.map(({ name, src }) => ({ name, src })), hash: sha256(delen.map(d => d.hashDeel).join('')) };
}

// Foutmeldingen bevatten bewust alleen paden/aantallen/hashes, nooit broninhoud.
function valideerExplicieteBron(root, rel) {
  if (rel !== BACKEND_BRON_RELPAD) return { fout: 'KVM_BACKEND_BRON moet exact "' + BACKEND_BRON_RELPAD + '" zijn (relatief aan de repo-root); andere of externe paden worden geweigerd.' };
  const verwacht = path.join(fs.realpathSync(root), rel);
  let echt;
  try { echt = fs.realpathSync(path.join(root, rel)); } catch { return { fout: 'backendbroncontext ontbreekt op ' + rel + '.' }; }
  if (echt !== verwacht) return { fout: rel + ' wijst via een symlink buiten het vaste pad — geweigerd.' };
  if (!isBestand(path.join(echt, 'cloudflare-worker.js'))) return { fout: rel + '/cloudflare-worker.js ontbreekt of is geen gewoon bestand.' };
  const workerDir = path.join(echt, 'worker');
  if (!isMap(workerDir)) return { fout: rel + '/worker ontbreekt of is geen gewone map.' };
  const modules = fs.readdirSync(workerDir).filter(f => f.endsWith('.js'));
  if (!modules.length) return { fout: rel + '/worker bevat geen .js-modules.' };
  const vreemd = modules.filter(f => !isBestand(path.join(workerDir, f)));
  if (vreemd.length) return { fout: vreemd.length + ' worker-module(s) in ' + rel + ' zijn geen gewoon bestand (symlink?) — geweigerd.' };
  return { dir: echt };
}

// KVM_BACKEND_BRON gezet → uitsluitend dat vaste pad, zonder terugval. KVM_BACKEND_BRON_VERPLICHT=1
// (vertrouwde CI-run) → ontbrekende bron of ontbrekende/afwijkende hashbinding is een fout, nooit "overgeslagen".
// Zonder beide: het bestaande lokale gedrag (kandidaatmappen, ontbreken = checks overslaan).
function bepaalBackendBron({ root, env = {}, kandidaten = [] }) {
  const verplicht = env.KVM_BACKEND_BRON_VERPLICHT === '1';
  const leeg = { bestanden: [], hash: null, gebonden: false, verplicht, fout: null };
  if (env.KVM_BACKEND_BRON) {
    const v = valideerExplicieteBron(root, env.KVM_BACKEND_BRON);
    if (v.fout) return { ...leeg, fout: v.fout };
    const verwacht = env.KVM_BACKEND_BRON_SHA256 || '';
    if (verwacht && !/^[0-9a-f]{64}$/.test(verwacht)) return { ...leeg, fout: 'KVM_BACKEND_BRON_SHA256 is geen geldige sha256.' };
    if (verplicht && !verwacht) return { ...leeg, fout: 'KVM_BACKEND_BRON_SHA256 ontbreekt — de backendbron is niet aan een gebonden versie gekoppeld.' };
    const { bestanden, hash } = leesBron(v.dir);
    if (verwacht && verwacht !== hash) return { ...leeg, fout: 'bron-sha256 wijkt af van de gebonden waarde (gebonden ' + verwacht + ', gelezen ' + hash + ').' };
    return { ...leeg, bestanden, hash, gebonden: Boolean(verwacht) };
  }
  if (verplicht) return { ...leeg, fout: 'KVM_BACKEND_BRON ontbreekt terwijl backendbroncontext verplicht is (KVM_BACKEND_BRON_VERPLICHT=1) — backenddekking kan niet als PASS gelden.' };
  const dir = kandidaten.find(p => fs.existsSync(path.join(p, 'cloudflare-worker.js')));
  return dir ? { ...leeg, ...leesBron(dir) } : leeg;
}

function bronhash(root, rel) {
  const r = bepaalBackendBron({ root, env: { KVM_BACKEND_BRON: rel } });
  if (r.fout) throw new Error(r.fout);
  return r.hash;
}

// CLI-modus voor checks.yml: uitsluitend de bron-sha256 berekenen en stoppen, vóór elke auditstap — geen
// auditoutput, geen bevindingen, geen andere bestanden gelezen. Synchroon schrijven zodat process.exit
// niets afkapt.
if (process.argv[2] === '--bronhash') {
  try { fs.writeSync(1, bronhash(process.cwd(), process.argv[3] || '') + '\n'); process.exit(0); }
  catch (e) { fs.writeSync(2, 'Backendbroncontext ongeldig: ' + e.message + '\n'); process.exit(1); }
}

// ── Minimale, op deze workflow afgestemde YAML-indeling (geen dependency) ────────────────────────
function jobsUit(yml) {
  const deel = yml.slice(yml.indexOf('\njobs:\n'));
  const posities = [];
  const re = /^  ([A-Za-z0-9_-]+):\s*$/gm;
  let m;
  while ((m = re.exec(deel))) posities.push({ naam: m[1], idx: m.index });
  const jobs = {};
  posities.forEach((p, i) => { jobs[p.naam] = deel.slice(p.idx, i + 1 < posities.length ? posities[i + 1].idx : deel.length); });
  return jobs;
}

function stappenUit(jobTekst) {
  const stappen = [];
  let huidig = null;
  jobTekst.split('\n').forEach(regel => {
    if (/^      - /.test(regel)) { huidig = [regel]; stappen.push(huidig); }
    else if (/^      #/.test(regel) || /^ {0,5}\S/.test(regel)) huidig = null;
    else if (huidig) huidig.push(regel);
  });
  return stappen.map(r => r.join('\n'));
}

const naamVan = stap => ((stap.match(/name:\s*(.+)/) || [])[1] || '').trim();
const ifVan = stap => ((stap.match(/^\s+if:\s*(.+)$/m) || [])[0] || '').trim();
const aantal = (tekst, sub) => tekst.split(sub).length - 1;

function blokRegels(stap, sleutel) {
  const regels = stap.split('\n');
  const start = regels.findIndex(r => r.trim() === sleutel + ': |');
  if (start < 0) return null;
  const inspring = regels[start].search(/\S/);
  const uit = [];
  for (let i = start + 1; i < regels.length; i++) {
    if (regels[i].trim() && regels[i].search(/\S/) <= inspring) break;
    if (regels[i].trim()) uit.push(regels[i].trim());
  }
  return uit;
}

// Vertaalt uitsluitend de bekende vertrouwensexpressie naar JS om echte triggercombinaties door te rekenen.
function evalueerVertrouwd(expr, ctx) {
  const js = expr.replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '')
    .replace(/format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/g, "('refs/heads/' + ctx.default_branch)")
    .replace(/github\.event_name/g, 'ctx.event_name')
    .replace(/github\.ref\b/g, 'ctx.ref')
    .replace(/==/g, '===');
  if (/github\.|secrets\.|vars\.|env\./.test(js)) throw new Error('onverwachte context in vertrouwensexpressie');
  return new Function('ctx', 'return (' + js + ');')(ctx);
}

// ── Synthetische bron ─────────────────────────────────────────────────────────────────────────────
const GEHEIM = 'SYNTHETISCHE-PRIVEBRON-' + crypto.randomBytes(8).toString('hex');

function maakBron(root, { entry = true, modules = { '02-config-constanten.js': 'const x = "' + GEHEIM + '";\n' } } = {}) {
  const dir = path.join(root, BACKEND_BRON_RELPAD);
  fs.mkdirSync(path.join(dir, 'worker'), { recursive: true });
  if (entry) fs.writeFileSync(path.join(dir, 'cloudflare-worker.js'), '// ' + GEHEIM + '\nexport default {};\n');
  Object.entries(modules).forEach(([f, inhoud]) => fs.writeFileSync(path.join(dir, 'worker', f), inhoud));
  return dir;
}

async function draaiCiBackendBroncontextChecks(ROOT) {
  const resultaten = [];
  const check = (ok, msg) => resultaten.push({ ok: Boolean(ok), msg });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kvm-ci-bron-'));
  const nieuweRoot = naam => { const r = path.join(tmp, naam); fs.mkdirSync(r, { recursive: true }); return r; };
  const vrijVanBron = r => !JSON.stringify({ fout: r.fout }).includes(GEHEIM);

  try {
    // A. Resolver: ontbrekend, ongeldig, extern, symlink, hashbinding.
    const leegRoot = nieuweRoot('leeg');
    let r = bepaalBackendBron({ root: leegRoot, env: { KVM_BACKEND_BRON_VERPLICHT: '1' } });
    check(r.fout && /ontbreekt/.test(r.fout) && !r.bestanden.length, 'verplicht zonder KVM_BACKEND_BRON moet FAIL geven');
    r = bepaalBackendBron({ root: leegRoot, env: {} });
    check(!r.fout && !r.bestanden.length && !r.gebonden, 'lokaal zonder bron en zonder verplichting: geen fout, geen bestanden (bestaand overslaan-gedrag)');
    r = bepaalBackendBron({ root: leegRoot, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD, KVM_BACKEND_BRON_VERPLICHT: '1', KVM_BACKEND_BRON_SHA256: 'a'.repeat(64) } });
    check(r.fout && /ontbreekt/.test(r.fout), 'verplicht met ontbrekende map moet FAIL geven');

    const geldig = nieuweRoot('geldig');
    const geldigDir = maakBron(geldig);
    ['../koersvoormorgen-backend/backend', '/etc', 'backend', '.kvm-backend-bron/backend/../../x', geldigDir].forEach(p => {
      const x = bepaalBackendBron({ root: geldig, env: { KVM_BACKEND_BRON: p } });
      check(x.fout && /exact/.test(x.fout) && !x.bestanden.length, 'ander/extern pad "' + p + '" moet geweigerd worden zonder terugval');
    });
    const kandidaatMetBron = path.join(nieuweRoot('kandidaat'), 'backend');
    maakBron(path.dirname(kandidaatMetBron));
    r = bepaalBackendBron({ root: leegRoot, env: { KVM_BACKEND_BRON: 'elders' }, kandidaten: [path.join(path.dirname(kandidaatMetBron), BACKEND_BRON_RELPAD)] });
    check(r.fout && !r.bestanden.length, 'ongeldige KVM_BACKEND_BRON mag niet stilzwijgend terugvallen op een kandidaatmap');

    const hash = bronhash(geldig, BACKEND_BRON_RELPAD);
    check(/^[0-9a-f]{64}$/.test(hash) && hash === bronhash(geldig, BACKEND_BRON_RELPAD), 'bronhash is een deterministische sha256');
    r = bepaalBackendBron({ root: geldig, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD, KVM_BACKEND_BRON_VERPLICHT: '1', KVM_BACKEND_BRON_SHA256: hash } });
    check(!r.fout && r.gebonden && r.hash === hash && r.bestanden.map(b => b.name).join(',') === 'backend/cloudflare-worker.js,backend/worker/02-config-constanten.js', 'geldige gebonden bron wordt geladen met exact de entry + worker-modules');
    r = bepaalBackendBron({ root: geldig, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD, KVM_BACKEND_BRON_VERPLICHT: '1' } });
    check(r.fout && /SHA256 ontbreekt/.test(r.fout) && !r.bestanden.length, 'verplicht zonder hashbinding moet FAIL geven');
    r = bepaalBackendBron({ root: geldig, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD, KVM_BACKEND_BRON_SHA256: 'NIET-HEX' } });
    check(r.fout && /geen geldige sha256/.test(r.fout), 'ongeldige hashwaarde moet FAIL geven');
    fs.appendFileSync(path.join(geldigDir, 'worker', '02-config-constanten.js'), '// gewijzigd na binding\n');
    r = bepaalBackendBron({ root: geldig, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD, KVM_BACKEND_BRON_VERPLICHT: '1', KVM_BACKEND_BRON_SHA256: hash } });
    check(r.fout && /wijkt af/.test(r.fout) && !r.bestanden.length, 'bron die na binding wijzigt moet FAIL geven (HEAD/hash-binding)');
    check(vrijVanBron(r), 'hash-foutmelding bevat geen broninhoud');

    const zonderEntry = nieuweRoot('zonder-entry');
    maakBron(zonderEntry, { entry: false });
    r = bepaalBackendBron({ root: zonderEntry, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD } });
    check(r.fout && /cloudflare-worker\.js/.test(r.fout), 'ontbrekende cloudflare-worker.js moet FAIL geven');
    const zonderModules = nieuweRoot('zonder-modules');
    maakBron(zonderModules, { modules: {} });
    r = bepaalBackendBron({ root: zonderModules, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD } });
    check(r.fout && /geen \.js-modules/.test(r.fout), 'lege worker-map moet FAIL geven');

    const extern = nieuweRoot('extern');
    maakBron(extern);
    const symMap = nieuweRoot('symlink-map');
    fs.symlinkSync(path.join(extern, '.kvm-backend-bron'), path.join(symMap, '.kvm-backend-bron'));
    r = bepaalBackendBron({ root: symMap, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD } });
    check(r.fout && /symlink/.test(r.fout) && !r.bestanden.length, 'symlink naar een externe bronmap moet geweigerd worden');
    const symBestand = nieuweRoot('symlink-bestand');
    const symDir = maakBron(symBestand, { entry: false });
    fs.symlinkSync(path.join(extern, BACKEND_BRON_RELPAD, 'cloudflare-worker.js'), path.join(symDir, 'cloudflare-worker.js'));
    r = bepaalBackendBron({ root: symBestand, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD } });
    check(r.fout && /geen gewoon bestand/.test(r.fout), 'gesymlinkte cloudflare-worker.js moet geweigerd worden');
    const symModule = nieuweRoot('symlink-module');
    const symModDir = maakBron(symModule);
    fs.symlinkSync(path.join(extern, BACKEND_BRON_RELPAD, 'worker', '02-config-constanten.js'), path.join(symModDir, 'worker', '99-extern.js'));
    r = bepaalBackendBron({ root: symModule, env: { KVM_BACKEND_BRON: BACKEND_BRON_RELPAD } });
    check(r.fout && /symlink/.test(r.fout), 'gesymlinkte worker-module moet geweigerd worden');
    let cliFout = '';
    try { bronhash(leegRoot, BACKEND_BRON_RELPAD); } catch (e) { cliFout = e.message; }
    check(/ontbreekt/.test(cliFout), '--bronhash faalt hard bij ontbrekende bron');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // B. Statische workflowanalyse.
  const ymlPad = path.join(ROOT, '.github/workflows/checks.yml');
  if (!fs.existsSync(ymlPad)) { check(false, '.github/workflows/checks.yml ontbreekt'); return resultaten; }
  const yml = fs.readFileSync(ymlPad, 'utf8');
  const triggers = yml.slice(0, yml.indexOf('\njobs:'));
  const jobs = jobsUit(yml);
  check(Object.keys(jobs).join(',') === 'checks,e2e-3rollen', 'exact de bestaande jobs checks en e2e-3rollen (geen nieuwe job/scheduler)');
  check(/^  push:\s*$/m.test(triggers) && /^  pull_request:\s*$/m.test(triggers) && /^  workflow_dispatch:\s*$/m.test(triggers) && !/pull_request_target/.test(yml), 'triggers push/pull_request/workflow_dispatch behouden, geen pull_request_target');
  check(aantal(yml, 'cron:') === 1 && /- cron: '30 4 \* \* \*'/.test(triggers), 'exact één cron, ongewijzigd 30 4 * * *');
  check(/concurrency:\n  group: kantoorinzicht-staging-e2e\n  cancel-in-progress: false\n/.test(yml), 'concurrency ongewijzigd (kantoorinzicht-staging-e2e, cancel-in-progress false)');
  ['continue-on-error', 'upload-artifact', 'upload-pages-artifact', 'deploy-pages', 'set -x', 'ACTIONS_STEP_DEBUG', 'pages: write'].forEach(v => check(!yml.includes(v), 'workflow bevat geen "' + v + '"'));
  check(!/(echo|printf)[^\n]*\$\{?BACKEND_SOURCE_READ_TOKEN/.test(yml), 'token-waarde wordt nergens geëchood');

  const checksJob = jobs.checks || '';
  const e2eJob = jobs['e2e-3rollen'] || '';
  const kop = checksJob.split('\n    steps:\n')[0];
  const vertrouwdRegel = (kop.match(/^      BACKEND_BRON_VERTROUWD:\s*(.+)$/m) || [])[1] || '';
  check(vertrouwdRegel === VERTROUWD_EXPRESSIE, 'job-env BACKEND_BRON_VERTROUWD gebruikt exact de vertrouwensexpressie');
  check(!/secrets\./.test(vertrouwdRegel) && !/BACKEND_SOURCE_READ_TOKEN/.test(kop), 'backendtoken staat niet op job-niveau');
  check(/^      BACKEND_BRON_REPOSITORY: marcelbisschops-ux\/koersvoormorgen-backend$/m.test(kop), 'job-env BACKEND_BRON_REPOSITORY is de vaste backendrepository');
  [
    [{ event_name: 'schedule', ref: 'refs/heads/main', default_branch: 'main' }, '1'],
    [{ event_name: 'workflow_dispatch', ref: 'refs/heads/main', default_branch: 'main' }, '1'],
    [{ event_name: 'push', ref: 'refs/heads/main', default_branch: 'main' }, '1'],
    [{ event_name: 'push', ref: 'refs/heads/feature-x', default_branch: 'main' }, '0'],
    [{ event_name: 'push', ref: 'refs/tags/v1', default_branch: 'main' }, '0'],
    [{ event_name: 'pull_request', ref: 'refs/pull/7/merge', default_branch: 'main' }, '0'],
    [{ event_name: 'pull_request', ref: 'refs/heads/main', default_branch: 'main' }, '0'],
    [{ event_name: 'pull_request_target', ref: 'refs/heads/main', default_branch: 'main' }, '0'],
  ].forEach(([ctx, verwacht]) => {
    let uit = 'fout';
    try { uit = evalueerVertrouwd(vertrouwdRegel || "${{ '?' }}", ctx); } catch {}
    check(uit === verwacht, 'vertrouwd(' + ctx.event_name + ' ' + ctx.ref + ') = ' + verwacht);
  });

  const stappen = stappenUit(checksJob);
  const idx = f => stappen.findIndex(f);
  const tokenStappen = stappen.filter(s => s.includes('secrets.BACKEND_SOURCE_READ_TOKEN'));
  check(aantal(yml, 'secrets.BACKEND_SOURCE_READ_TOKEN') === 2 && tokenStappen.length === 2, 'BACKEND_SOURCE_READ_TOKEN alleen in poortstap en backendcheckout');
  check(tokenStappen.every(s => ifVan(s) === VERTROUWD_IF), 'elke stap met het backendtoken draait uitsluitend als BACKEND_BRON_VERTROUWD == 1');
  check(!/BACKEND|kvm-backend-bron/.test(e2eJob), 'e2e-3rollen krijgt geen backendtoken of private bron');

  const iPoort = idx(s => s.includes('-z "${BACKEND_SOURCE_READ_TOKEN}"'));
  const iCheckout = idx(s => s.includes('repository: ' + BACKEND_BRON_REPOSITORY));
  // Binding moet via deze audit lopen (--bronhash), niet via het historische tests/ci-backend-broncontext.mjs.
  const iBind = idx(s => s.includes('node tests/audit-consistentie.mjs --bronhash'));
  const iAudit = idx(s => naamVan(s) === 'Veiligheids- en consistentie-audit');
  const iCleanup = idx(s => s.includes('rm -rf .kvm-backend-bron'));
  const iDeps = idx(s => naamVan(s) === 'Dependency-scan (npm audit)');
  const iFrontend = idx(s => /^      - uses: actions\/checkout@/.test(s));
  check(iFrontend === 0 && iPoort > iFrontend && iCheckout > iPoort && iBind > iCheckout && iAudit > iBind && iCleanup === iAudit + 1 && iDeps > iCleanup, 'volgorde: frontendcheckout → poort → backendcheckout → binding (audit-consistentie.mjs --bronhash) → audit → cleanup → dependency-scan');

  const poort = stappen[iPoort] || '';
  check(ifVan(poort) === VERTROUWD_IF && /BACKEND_BRON_REPOSITORY/.test(poort) && /BACKEND_BRON_REF/.test(poort) && aantal(poort, 'exit 1') >= 3, 'poortstap faalt hard bij ontbrekend secret, ongeldige repository of ongeldige ref');

  const co = stappen[iCheckout] || '';
  const versies = [...yml.matchAll(/uses: actions\/checkout@(\S+)/g)].map(m => m[1]);
  check(versies.length === 3 && versies.every(v => v === versies[0]), 'backendcheckout gebruikt dezelfde actions/checkout-versie als de bestaande checkouts');
  check(/persist-credentials: false/.test(co), 'backendcheckout: persist-credentials: false');
  check(/fetch-depth: 1\b/.test(co), 'backendcheckout: fetch-depth: 1');
  check(/path: \.kvm-backend-bron\s*$/m.test(co) && /token: \$\{\{ secrets\.BACKEND_SOURCE_READ_TOKEN \}\}/.test(co) && /ref: \$\{\{ env\.BACKEND_BRON_REF \}\}/.test(co), 'backendcheckout: vast pad, read-only token, gevalideerde ref');
  check(JSON.stringify(blokRegels(co, 'sparse-checkout')) === JSON.stringify(['/backend/cloudflare-worker.js', '/backend/worker/']) && /sparse-checkout-cone-mode: false/.test(co), 'backendcheckout: alleen backend/cloudflare-worker.js en backend/worker/');

  const bind = stappen[iBind] || '';
  check(ifVan(bind) === VERTROUWD_IF && /rev-parse --verify/.test(bind) && /\[0-9a-f\]\{40\}/.test(bind) && /remote\.origin\.url/.test(bind), 'binding: exacte 40-hex HEAD en repository-URL hard gecontroleerd');
  check(/extraheader/.test(bind) && /-type l/.test(bind) && /backend\/worker/.test(bind), 'binding: geen achtergebleven credential, geen symlinks, geen bestanden buiten de sparse-set');
  check(/KVM_BACKEND_BRON_SHA256=/.test(bind) && /GITHUB_ENV/.test(bind) && /HEAD=\$\{head\}/.test(bind), 'binding: repository, HEAD en bron-sha256 gelogd en aan de audit doorgegeven');

  const audit = stappen[iAudit] || '';
  check(aantal(audit, 'node tests/audit-consistentie.mjs') === 2 && !/^\s+if:/m.test(audit), 'auditstap draait altijd (vertrouwd én PR), bestaande aanroep behouden');
  check(audit.includes('KVM_BACKEND_BRON=' + BACKEND_BRON_RELPAD) && audit.includes('KVM_BACKEND_BRON_VERPLICHT=1'), 'vertrouwde audit gebruikt het vaste pad in verplichte modus');
  check(/RUNNER_TEMP/.test(audit) && /> "\$log" 2>&1/.test(audit) && /exit "\$code"/.test(audit) && /sha256sum/.test(audit), 'vertrouwde audituitvoer naar tijdelijke runnerlocatie, alleen hash/exit-samenvatting, echte exitcode behouden');
  check(!/\b(cat|tee|head|tail|less|more|sed)\b/.test(audit), 'auditlog met mogelijke broninhoud wordt niet naar de publieke log geschreven');

  const cleanup = stappen[iCleanup] || '';
  check(ifVan(cleanup) === 'if: ${{ always() }}' && /RUNNER_TEMP/.test(cleanup), 'cleanup van private checkout en auditlog draait altijd, ook na een fout');
  const melding = stappen.find(s => ifVan(s) === "if: ${{ env.BACKEND_BRON_VERTROUWD != '1' }}") || '';
  check(/::warning::/.test(melding) && /niet/i.test(melding), 'onvertrouwde trigger meldt ontbrekende backenddekking expliciet (geen stille PASS)');

  // C. Bestaande stappen/rollen/rapportage ongewijzigd.
  ['Syntax-check mna-modules', 'Veiligheids- en consistentie-audit', 'Dependency-scan (npm audit)', 'Basale secret-patroonscan', 'Publieke e2e-checks tegen staging (health-check, geen admin-key nodig)', 'Volledige e2e-testsuite tegen staging (admin-key vereist)']
    .forEach(n => check(stappen.some(s => naamVan(s) === n), 'bestaande checks-stap behouden: ' + n));
  check(/npm audit --audit-level=high/.test(checksJob) && /node tests\/e2e-api\.mjs --key="\$STAGING_ADMIN_KEY"/.test(checksJob) && /if: \$\{\{ env\.STAGING_ADMIN_KEY != '' \}\}/.test(checksJob), 'dependency-scan en staging-API-rollen ongewijzigd');
  check(/^    needs: checks$/m.test(e2eJob) && aantal(e2eJob, 'run: npx playwright test ') === 3 && aantal(yml, "KVM_DOE_AI: '1'") === 1 && aantal(e2eJob, 'E2E_REPORT_KEY: ${{ secrets.E2E_REPORT_KEY }}') === 2, 'e2e-3rollen: needs checks, drie bestaande playwright-runs, één AI-stap, rapportage behouden');
  check(e2eJob.includes("if: ${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}") && e2eJob.includes("if: ${{ github.event_name != 'schedule' && github.event_name != 'workflow_dispatch' }}"), 'e2e-3rollen: bestaande dagelijkse/push-condities ongewijzigd');

  const doc = path.join(ROOT, 'docs/marilyn-veiligheid.md');
  const docTekst = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
  check(/BACKEND_SOURCE_READ_TOKEN/.test(docTekst) && /ONBEWEZEN/.test(docTekst), 'docs/marilyn-veiligheid.md documenteert credential-instelling en ONBEWEZEN dagelijkse E2E');
  return resultaten;
}

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
// Productpunt 22 (10 okt 2026): in de vertrouwde dagelijkse CI-run zet checks.yml KVM_BACKEND_BRON (vast
// pad .kvm-backend-bron/backend), KVM_BACKEND_BRON_SHA256 (bron-hash direct na de checkout) en
// KVM_BACKEND_BRON_VERPLICHT=1. Dan geldt uitsluitend dat pad; ontbrekend/ongeldig/afwijkend = bevinding,
// nooit "overgeslagen". Zie bepaalBackendBron() bovenaan dit bestand en docs/marilyn-veiligheid.md.
const backendBron = bepaalBackendBron({ root: ROOT, env: process.env, kandidaten: BACKEND_CANDIDATES });
if (backendBron.fout) warn('Backendbroncontext: ' + backendBron.fout);
else if (backendBron.gebonden) ok('Backendbroncontext gebonden: ' + BACKEND_BRON_RELPAD + ', ' + backendBron.bestanden.length + ' bestanden, bron-sha256 ' + backendBron.hash + '.');
const backendFiles = backendBron.bestanden;
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
// Handmatig nagelopen — bewaakt niet via een lokale '!isKoper()'-conditie (wat deze heuristiek
// zoekt) maar op een andere, evengoed sluitende manier. Nieuwe regels horen hier NIET automatisch
// bij te komen — eerst zelf de bewakende conditie vinden en bevestigen, dán pas toevoegen.
// Content-based i.p.v. regelnummer (23 aug 2026 — regelnummer-variant schoof 5x op: :1911 ->
// :1957 -> :1998 -> :2026 -> :2029, telkens door ongerelateerde toevoegingen eerder in het bestand.
// Een unieke tekst-snippet uit de regel zelf verschuift niet mee met latere edits elders.)
const GEVERIFIEERD_VEILIG_CHECK4 = [
  // 19-08-2026: risicoraamwerk-knop staat alleen in renderBegeleiderDashboard(), dat zelf alleen
  // bereikt wordt via S.screen='begeleider' — en dát wordt uitsluitend gezet binnen if(isTussen())
  // in mna/06-schermen.js (zie de login-flow). Structurele scheiding op scherm-niveau, dus geen
  // lokale !isKoper()-check nodig. Backend dubbelt dit bovendien af: /mna/risicoraamwerk/genereer en
  // de GET-variant zijn begeleiderAuth-only (zie tests/audit-consistentie.mjs check 5).
  { file: 'mna/04-begeleider-dashboard.js', tekst: 'Geen contractenAan-gate hier: dit is interne analyse' },
  // 19-08-2026: handleiding-tekst (documentatiestring in mna/08-handleiding.js), geen
  // autorisatie-relevante UI-code — de heuristiek matcht hier puur op het woord "interne" in de
  // uitlegtekst zelf, niet op een daadwerkelijk conditioneel getoond blok.
  // 11-09-2026: van lineHint naar tekst-match (regelnummer verschoof door de nieuwe MoU-composer-stap
  // 2d in dezelfde handleidingsectie).
  { file: 'mna/08-handleiding.js', tekst: 'Puur interne analyse' },
  // 31-08-2026: dit is de AI-PROMPT-string van de interne onderhandelbijlage bij het dealvoorstel
  // (ChatGPT-review A2 — publieke/interne context-split), niet een aan de koper getoond UI-blok. De
  // bijlage wordt gegenereerd binnen toonDealvoorstelModal()/dv-ok, uitsluitend bereikbaar vanuit
  // renderBegeleiderDashboard() (S.screen='begeleider', alleen gezet in if(isTussen())), gegated op
  // isSellDv, en de output gaat naar #dv-bijlage — nooit in #dv-preview / dealvoorstel_tekst / de
  // e-mail. Structurele scheiding op scherm-niveau, zelfde patroon als de risicoraamwerk-entry.
  { file: 'mna/04-begeleider-dashboard.js', tekst: "'CONTEXT (intern):\\n'+interneContext" },
  // 31-08-2026: instructietekst BINNEN de systeemprompt van de verkoper-chatassistent (mna/07) die
  // de AI juist verbiedt "interne notities van de begeleider" prijs te geven. Geen UI-blok; het hele
  // blok draait in if(isVerkoper()). De heuristiek matcht puur op het woord "interne notities".
  { file: 'mna/07-start-chat.js', tekst: 'onderhandelingsposities of interne notities van de begeleider' },
];
const internIssues = [];
mnaFiles.forEach(file => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, idx) => {
    if (/<option value=/.test(line)) return; // dropdown-configuratie, geen getoond contentblok
    if (!/\(intern\)|Intern[e]?\s+(notitie|analyse|advies|instrument)/i.test(line)) return;
    const geverifieerd = GEVERIFIEERD_VEILIG_CHECK4.some(g => g.file === file && (g.tekst ? line.includes(g.tekst) : (idx + 1) === g.lineHint));
    if (geverifieerd) return;
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
if (GEVERIFIEERD_VEILIG_CHECK4.length) ok(GEVERIFIEERD_VEILIG_CHECK4.length + ' eerder handmatig geverifieerd en veilig bevonden: ' + GEVERIFIEERD_VEILIG_CHECK4.map(g => g.file).join(', '));
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
  '/mna/risicoraamwerk/genereer',  // begeleiderAuth-only (19-08-2026 geverifieerd), retourneert alleen swot/pestel/porter-AI-output
  '/mna/spa/genereer',             // begeleiderAuth-only (12-09-2026 geverifieerd, P3-45), retourneert alleen {ok,tekst,dealvoorstel_gevonden} — nooit de rauwe traject-rij
  '/adviseur/export/',             // gebruikerViaToken + expliciete eigenaarschapscheck (gebruiker_id-match, geen /admin/-pad
                                    // maar wel evenwaardig beschermd), plus heeftModule('export')-gate (26-08-2026 geverifieerd).
                                    // SELECT * wordt alleen gebruikt om 9 met naam genoemde, niet-gevoelige velden te plukken
                                    // (kantoornaam/type/status/datum/contactpersoon/adres/KvK/koper-naam-en-mail/begeleider) —
                                    // géén tussen_code/koper_code/notitie/tekenbevoegdheid/gebruiker_id, zelfde stripping-
                                    // patroon als /mna/traject/ en /gebruikers/mna/detail/ hierboven. Adviseur ziet hiermee
                                    // uitsluitend data van zijn eigen, al toegankelijke traject — geen nieuwe blootstelling.
  '/mna/document/bieding/genereer',          // begeleiderAuth+heeftModule('contracten') (P1-IP-4, 27-09-2026 geverifieerd) —
                                              // JSON.stringify is de uitgaande Anthropic-requestbody, niet de response;
                                              // retourneert uitsluitend {ok,tekst} of {error}.
  '/mna/logboek-meeting/genereer',           // isAdmin||isBegeleider, zelfde bar als /mna/logboek/{code} (P1-IP-4,
                                              // 27-09-2026 geverifieerd) — zelfde false-positive-reden als hierboven.
  '/mna/dealvoorstel/hoofdstukken/genereer', // begeleiderAuth+heeftModule('contracten') (P1-IP-4, 27-09-2026
                                              // geverifieerd) — SELECT * nodig omdat begeleider_bedrijf geen losse kolom
                                              // is; retourneert uitsluitend {ok,tekst} of {error}.
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
    // Audit-fix P2 (24 aug 2026, zevende heraudit): scande voorheen alleen cloudflare-worker.js —
    // de 20 worker/*.js-modules (waar sinds de modularisering de meeste NIEUWE tabellen ontstaan,
    // vaak lazy via env.DB.prepare('CREATE TABLE...').run() met enkele aanhalingstekens i.p.v. de
    // backtick-array-stijl in het hoofdbestand) werden nooit gecontroleerd — een gemiste tabel daar
    // zou hier stilzwijgend "OK" tonen. Nu over alle backendFiles, met een regex die beide stijlen
    // dekt (afsluitende backtick+komma óf enkel aanhalingsteken).
    const createRe = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)\s*[`']/g;
    const tablesWithTrajectId = new Set();
    backendFiles.forEach(({ src }) => {
      let cm;
      createRe.lastIndex = 0;
      while ((cm = createRe.exec(src))) {
        if (/\btraject_id\b/.test(cm[2])) tablesWithTrajectId.add(cm[1]);
      }
    });
    const fnMarker = 'export async function verwijderTrajectData(';
    const fnStart = sharedFile.src.indexOf(fnMarker);
    if (fnStart === -1) {
      warn('backend/worker/02-config-constanten.js: verwijderTrajectData() niet gevonden — is de gedeelde cascade verplaatst/hernoemd? Kan niet gevalideerd worden.');
    } else {
      // Bugfix 24 sep 2026 (dagelijkse knoppentest, live gereproduceerd — blokkeerde een legitieme
      // push met een vals-positieve "ontbrekende tabel"): een vaste 6000-tekens-vensterlengte was
      // hier een nieuwe magische-getal-cliff van precies hetzelfde type als deze check zelf bewaakt
      // (P4-22, groeiende bestanden) — de functie is inmiddels door accumulerende uitlegcomments
      // gegroeid tot >6250 tekens, waardoor de laatste 2 DELETE-regels (mna_eigen_specialisten,
      // mna_koper_biedingen) buiten het venster vielen en ten onrechte als "ontbrekend" werden
      // gemeld, terwijl ze wel degelijk in de functie staan (bevestigd: backend/tests/audit-backend.mjs
      // check 7 test dit al functioneel/runtime en was al die tijd groen). Vervangen door: scan tot de
      // eerstvolgende top-level `export` ná de functie (of einde bestand), zodat dit meegroeit met de
      // functie i.p.v. bij een volgende toevoeging opnieuw stil te breken.
      const nextExportRel = sharedFile.src.slice(fnStart + fnMarker.length).search(/\nexport (async function|function|const)\s/);
      const fnEnd = nextExportRel === -1 ? sharedFile.src.length : fnStart + fnMarker.length + nextExportRel;
      const fnScope = sharedFile.src.slice(fnStart, fnEnd);
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

// ── 8. Dealvoorstel: publieke/interne context-split blijft gescheiden ──────
// (ChatGPT-promptreview A2, 31 aug 2026: BATNA/walk-awayprijs + de LoI-onderhandelchecklist zaten
//  in dezelfde tekst die met "Verstuur naar partijen" gedeeld wordt. Ze horen nu UITSLUITEND in de
//  interne bijlage. Deze check vergrendelt dat zodat een latere edit ze niet stilzwijgend terugzet
//  in het deelbare dealvoorstel.
//  P1-IP-4 (27 sep 2026): de instructietekst zelf (koppen/interneKoppen) verhuisde server-side naar
//  worker/19b-waardering-communicatie.js (/mna/dealvoorstel/hoofdstukken+bijlage/genereer) — mna/04
//  stuurt nu alleen nog de DATA (contextBlok/interneContext) als twee aparte requests. De check kijkt
//  daarom eerst backend-side (waar de instructietekst nu staat); ontbreekt de backend-repo lokaal, dan
//  valt hij terug op de oude frontend-only structuur (bijv. als deze migratie ooit teruggedraaid is).)
log('8. Dealvoorstel: BATNA/walk-away/LoI-checklist uitsluitend in de interne bijlage');
{
  const knip = (src, van, tot) => {
    const a = src.indexOf(van); const b = src.indexOf(tot, a + 1);
    return (a >= 0 && b > a) ? src.slice(a, b) : null;
  };
  const verboden = [/\bbatna\b/i, /walk-?away/i, /LoI-checklist/i, /TABEL:BATNA/, /TABEL:LOICHECKLIST/, /walk-?awayprijs/i];
  const dvBackend = backendFiles.find(f => f.name === 'backend/worker/19b-waardering-communicatie.js');
  if (dvBackend) {
    const src = dvBackend.src;
    const publiekeKoppen = knip(src, 'const dvhKoppen =', 'const dvhAdviseurNaam');
    const interneKoppen = knip(src, 'const dvbInterneKoppen =', 'const dvbPrompt');
    let problemen = 0;
    if (!publiekeKoppen || !interneKoppen) {
      warn('backend/worker/19b-waardering-communicatie.js — kon de dvhKoppen/dvbInterneKoppen-knip niet vinden. Structuur gewijzigd? Controleer handmatig.');
      problemen++;
    } else {
      verboden.forEach(re => {
        if (re.test(publiekeKoppen)) { warn('backend/worker/19b-waardering-communicatie.js — de PUBLIEKE dealvoorstel-hoofdstukken (dvhKoppen) bevatten "' + re.source + '" — hoort in dvbInterneKoppen.'); problemen++; }
      });
      if (!/TABEL:BATNA/.test(interneKoppen)) { warn('backend/worker/19b-waardering-communicatie.js — dvbInterneKoppen bevat geen [TABEL:BATNA] meer — is het BATNA-hoofdstuk verplaatst/verdwenen?'); problemen++; }
    }
    // mna/04 mag zelf geen instructietekst meer bevatten voor dit documenttype — alleen data
    // (contextBlok/interneContext) versturen. Duikt "TABEL:BATNA" of "walk-away" daar weer op in de
    // dealvoorstel-generatiefunctie, dan is de instructietekst stilzwijgend teruggezet client-side.
    const feSrc = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const feDealvoorstelSectie = knip(feSrc, 'var contextBlok=', 'bgToonUitvoer(docOutEl)');
    if (feDealvoorstelSectie && /interneKoppen\s*=|var koppen\s*=.*Managementsamenvatting/i.test(feDealvoorstelSectie)) {
      warn('mna/04-begeleider-dashboard.js — bevat weer eigen koppen/interneKoppen-instructietekst voor het dealvoorstel; hoort sinds P1-IP-4 uitsluitend server-side te staan.');
      problemen++;
    }
    if (!problemen) ok('dvhKoppen bevat geen BATNA/walk-away/LoI-checklist; die zitten uitsluitend in dvbInterneKoppen (interne bijlage-route). mna/04 stuurt alleen nog data, geen instructietekst.');
  } else {
    // Terugval: oude, volledig client-side structuur (vóór P1-IP-4, of als die migratie ooit is
    // teruggedraaid).
    const f = 'mna/04-begeleider-dashboard.js';
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const publiekeContext = knip(src, 'var contextBlok=', 'var interneContext');
    const publiekeKoppen = knip(src, "var koppen='## Managementsamenvatting", 'var interneKoppen');
    const interneKoppen = knip(src, 'var interneKoppen=', 'var antiVerzin');
    let problemen = 0;
    if (!publiekeContext || !publiekeKoppen) {
      warn(f + ' — kon de publieke/interne knip in de dealvoorstel-generatie niet vinden (var contextBlok / var koppen / var interneContext / var interneKoppen), en backend/ (met de sinds P1-IP-4 verhuisde instructietekst) is hier niet gevonden. Structuur gewijzigd? Controleer handmatig.');
      problemen++;
    } else {
      verboden.forEach(re => {
        if (re.test(publiekeContext)) { warn(f + ' — de PUBLIEKE dealvoorstel-context (contextBlok) bevat "' + re.source + '" — onderhandelpositie hoort in interneContext, niet in de deelbare tekst.'); problemen++; }
        if (re.test(publiekeKoppen)) { warn(f + ' — de PUBLIEKE dealvoorstel-hoofdstukken (koppen) bevatten "' + re.source + '" — hoort in interneKoppen.'); problemen++; }
      });
    }
    if (interneKoppen && !/TABEL:BATNA/.test(interneKoppen)) { warn(f + ' — interneKoppen bevat geen [TABEL:BATNA] meer — is het BATNA-hoofdstuk verplaatst/verdwenen?'); problemen++; }
    if (!problemen) ok('contextBlok + koppen bevatten geen BATNA/walk-away/LoI-checklist; die zitten in interneContext/interneKoppen (interne bijlage, niet in dealvoorstel_tekst / de e-mail). [backend/ niet gevonden — alleen frontend-structuur gecontroleerd]');
  }
}

// ── 9. Documentgenerator: clausule-integriteitsregel + afkap-weigering blijven staan ──
// (ChatGPT-promptreview A1, 31 aug 2026: de AI mag alleen placeholders vervangen, geen bepaling
//  wijzigen/toevoegen/weglaten; een template boven de limiet wordt geweigerd i.p.v. afgekapt.
//  Deze check bewaakt dat een latere edit die twee regels niet stilzwijgend verwijdert.
//  P1-IP-4 (27 sep 2026): bem/excl/nda/loi genereren niet langer in bgDoc() zelf — de instructietekst
//  (incl. de clausule-integriteitsregel) en de template-lengtecontrole staan nu server-side in
//  worker/10-mna-communicatie.js (/mna/document/{type}/genereer). Check kijkt daarom eerst daar.)
log('9. Documentgenerator ({bem,excl,nda,loi}/genereer): clausule-integriteitsregel + afkap-weigering aanwezig');
{
  const docBackend = backendFiles.find(f => f.name === 'backend/worker/10-mna-communicatie.js');
  if (docBackend) {
    const src = docBackend.src;
    let problemen = 0;
    if (!/STRIKTE REGELS voor het invullen/.test(src) || !/geen bestaande bepaling/i.test(src)) {
      warn('backend/worker/10-mna-communicatie.js — de clausule-integriteitsregel ("STRIKTE REGELS ... geen bestaande bepaling wijzigen/toevoegen/weglaten") ontbreekt in de /mna/document/{type}/genereer-route. Zonder die regel kan de AI juridische tekst herschrijven.');
      problemen++;
    }
    if (!/bxTplTekst\.length\s*>\s*\d{4,}[\s\S]{0,120}(geweigerd|weiger|return)/i.test(src)) {
      warn('backend/worker/10-mna-communicatie.js — de afkap-weigering (te lange template → generatie stoppen i.p.v. substring) lijkt te ontbreken/gewijzigd in /mna/document/{type}/genereer. Controleer.');
      problemen++;
    }
    // De regel moet gelden voor ALLE VIER de typen (bem/excl/nda/loi delen dezelfde bxClausuleRegel-
    // constante) — verifieer dat elke type-tak hem ook daadwerkelijk in bxPrompt opneemt.
    ["if (bxType === 'excl')", "else if (bxType === 'nda')", "else if (bxType === 'loi')"].forEach(marker => {
      const idx = src.indexOf(marker);
      const venster = idx >= 0 ? src.slice(idx, idx + 600) : '';
      if (!venster || !/bxClausuleRegel/.test(venster)) {
        warn('backend/worker/10-mna-communicatie.js — tak "' + marker + '" lijkt bxClausuleRegel niet toe te passen op bxPrompt.');
        problemen++;
      }
    });
    // bgDoc() zelf mag geen eigen instructietekst meer bevatten voor deze vier documenttypen.
    const feSrc = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    if (/var clausuleRegel\s*=/.test(feSrc) || /var prompts\s*=\s*\{/.test(feSrc)) {
      warn('mna/04-begeleider-dashboard.js — bevat weer een eigen clausuleRegel/prompts-object in bgDoc(); hoort sinds P1-IP-4 uitsluitend server-side te staan.');
      problemen++;
    }
    if (!problemen) ok('/mna/document/{type}/genereer bevat de clausule-integriteitsregel (alle vier typen) én weigert een te lange template i.p.v. hem af te kappen. bgDoc() bevat geen eigen instructietekst meer.');
  } else {
    const f = 'mna/04-begeleider-dashboard.js';
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let problemen = 0;
    if (!/STRIKTE REGELS voor het invullen/.test(src) || !/geen bestaande bepaling/i.test(src)) {
      warn(f + ' — de clausule-integriteitsregel ("STRIKTE REGELS ... geen bestaande bepaling wijzigen/toevoegen/weglaten") ontbreekt in bgDoc(), en backend/ (met de sinds P1-IP-4 verhuisde instructietekst) is hier niet gevonden. Zonder die regel kan de AI juridische tekst herschrijven.');
      problemen++;
    }
    if (!/tplTekst\.length\s*>\s*\d{4,}[\s\S]{0,120}(geweigerd|weiger|return)/i.test(src)) {
      warn(f + ' — de afkap-weigering (te lange template → generatie stoppen i.p.v. substring) lijkt te ontbreken/gewijzigd in bgDoc(). Controleer.');
      problemen++;
    }
    if (!problemen) ok('bgDoc() bevat de clausule-integriteitsregel én weigert een te lange template i.p.v. hem af te kappen. [backend/ niet gevonden — alleen frontend-structuur gecontroleerd]');
  }
}

// ── 10. Kleurcontrast: --muted (en varianten) tegen elk oppervlak (WCAG AA) ──
// (5 sep 2026: de --muted-token is sinds 19 augustus al drie keer "gefixt" met een nieuwe hex-
//  waarde, maar telkens maar tegen één achtergrond gecontroleerd. scripts/check-contrast.mjs
//  rekent nu elke tekst/oppervlak-combinatie automatisch na, i.p.v. dat een volgende fix-poging
//  hetzelfde patroon herhaalt.)
log('10. Kleurcontrast (WCAG AA) — tekst-tokens tegen alle oppervlak-tokens');
{
  try {
    execSync('node ' + path.join(ROOT, 'scripts/check-contrast.mjs'), { cwd: ROOT, stdio: 'pipe' });
    ok('Alle tekst/oppervlak-combinaties halen WCAG AA (4.5:1) — zie scripts/check-contrast.mjs voor details.');
  } catch (e) {
    warn('Eén of meer kleurcombinaties onder de WCAG AA-grens (4.5:1). Draai `node scripts/check-contrast.mjs` voor de volledige lijst:\n' + (e.stdout || '').toString().trim().split('\n').map(l => '      ' + l).join('\n'));
  }
}

// ── 11. Load-bearing pagina's: elke frontend-URL die de backend mailt/redirect't ──
// (8 sep 2026: bij het herontwerp van 1 sep werd registreer.html — de enige activatie-/
//  wachtwoordpagina, waar de worker een eenmalige token-link naartoe mailt — vervangen door een
//  redirect-stub naar een marketingpagina. Zeven dagen lang kon niemand een account activeren of
//  z'n wachtwoord resetten; ontdekt door een echte prospect. De afhankelijkheid was onzichtbaar
//  vanuit deze repo: de link wordt in de private backend-repo gebouwd, geen pagina op de site
//  linkt ernaar, build.py kende 'm niet. Deze check maakt die afhankelijkheid expliciet en
//  faalt als een backend-gelinkte pagina ontbreekt of een redirect-stub is geworden.
//  Zie LOAD-BEARING-PAGES.md + CLAUDE.md werkregel 20.)
log('11. Load-bearing pagina\'s (backend-gemailde/geredirecte frontend-URL\'s bestaan én zijn geen stub)');
{
  const manifestPad = path.join(ROOT, 'LOAD-BEARING-PAGES.md');
  // Detecteert of een frontend-.html-bestand een redirect-stub is i.p.v. een echte pagina.
  const isRedirectStub = (html) => {
    const h = html.slice(0, 2000);
    const heeftRefresh = /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/i.test(h);
    const heeftJsReplace = /location\.replace\(/i.test(h);
    // Een echte functionele pagina heeft vrijwel altijd een form, een fetch, of event-handlers.
    const heeftFunctionaliteit = /<form\b|fetch\(|addEventListener\(|querySelector(All)?\(/i.test(html);
    return (heeftRefresh || (heeftJsReplace && html.length < 1500)) && !heeftFunctionaliteit;
  };
  // Clean-URL's die de worker gebruikt → hun daadwerkelijke bestand in deze repo.
  const CLEAN_URL_NAAR_BESTAND = {
    'contact': 'contact.html',
    'contact-verzonden': 'contact-verzonden.html',
    'privacy': 'privacy.html',
    'voorwaarden': 'voorwaarden.html',
    'bedrijfsscan': 'bedrijfsscan.html',
  };

  // (a) Manifest inlezen — de vastgelegde "mag niet stub zijn"-lijst.
  const manifestPaden = new Set();
  if (fs.existsSync(manifestPad)) {
    const mtxt = fs.readFileSync(manifestPad, 'utf8');
    // De markers moeten alléén op hun regel staan (een inline vermelding in proza telt niet mee).
    let inBlok = false;
    mtxt.split('\n').forEach(regel => {
      const l = regel.trim();
      if (l === '<!-- BEGIN-MANIFEST -->') { inBlok = true; return; }
      if (l === '<!-- END-MANIFEST -->') { inBlok = false; return; }
      if (!inBlok || !l || l.startsWith('```') || l.startsWith('#') || l.startsWith('<!--')) return;
      const eersteVeld = l.split('|')[0].trim();
      if (eersteVeld.endsWith('.html')) manifestPaden.add(eersteVeld);
    });
  } else {
    warn('LOAD-BEARING-PAGES.md ontbreekt — het register van pagina\'s waar een backend-flow van afhangt. Zie CLAUDE.md werkregel 20.');
  }

  // (b) Elke manifest-pagina moet bestaan én geen stub zijn (werkt ook zonder backend-repo).
  let manifestProblemen = 0;
  manifestPaden.forEach(rel => {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) {
      warn('LOAD-BEARING-PAGES.md noemt "' + rel + '" als load-bearing, maar dat bestand bestaat niet (meer) in deze repo.');
      manifestProblemen++;
    } else if (isRedirectStub(fs.readFileSync(fp, 'utf8'))) {
      warn('"' + rel + '" staat in LOAD-BEARING-PAGES.md als "mag geen stub zijn", maar het IS nu een redirect-stub. Een backend-flow (token-link/redirect) breekt hierop. Dit is exact de registreer.html-bug van 8 sep 2026.');
      manifestProblemen++;
    }
  });

  // (c) Backend-repo grepen op koersvoormorgen.nl/<pad>-verwijzingen en elk pad valideren.
  if (!backendFiles.length) {
    ok('backend/ niet gevonden — subcheck (c) overgeslagen; het manifest zelf is wél gecontroleerd (' + manifestPaden.size + ' pagina\'s' + (manifestProblemen ? ', ' + manifestProblemen + ' probleem/problemen' : ', allemaal aanwezig en functioneel') + ').');
  } else {
    const urlRe = /koersvoormorgen\.nl\/([A-Za-z0-9_\/-]+(?:\.html)?)/g;
    const backendRefs = new Set();
    backendFiles.forEach(({ src }) => {
      let um;
      const re = new RegExp(urlRe.source, 'g');
      while ((um = re.exec(src))) {
        let p = um[1];
        if (CLEAN_URL_NAAR_BESTAND[p]) p = CLEAN_URL_NAAR_BESTAND[p];
        if (p.endsWith('.html')) backendRefs.add(p);
      }
    });
    // App-/adminpagina's die bewust ook een pure redirect mógen zijn zolang de flow doorloopt —
    // hier bewust NIET vrijgesteld van de "bestaat"-check, wel van de stub-check, omdat een
    // redirect naar een werkend inlogscherm voor die pagina's een legitieme keuze is.
    const STUB_TOEGESTAAN_MITS_FLOW_DOORLOOPT = new Set(['mna.html', 'adv.html', 'marilyn.html']);
    let refProblemen = 0;
    [...backendRefs].sort().forEach(rel => {
      const fp = path.join(ROOT, rel);
      if (!fs.existsSync(fp)) {
        warn('De backend mailt/linkt naar koersvoormorgen.nl/' + rel + ', maar dat bestand bestaat niet in deze repo. Herstel de pagina of pas de backend-link aan. (werkregel 20)');
        refProblemen++;
        return;
      }
      if (isRedirectStub(fs.readFileSync(fp, 'utf8')) && !STUB_TOEGESTAAN_MITS_FLOW_DOORLOOPT.has(rel)) {
        warn('De backend mailt/linkt naar koersvoormorgen.nl/' + rel + ', maar dat is een redirect-stub geworden. Een eenmalige token-/flow-link overleeft een redirect niet. Zet de functionele pagina terug. Dit is exact de registreer.html-bug van 8 sep 2026. (werkregel 20 / LOAD-BEARING-PAGES.md)');
        refProblemen++;
      }
      if (!manifestPaden.has(rel)) {
        warn('koersvoormorgen.nl/' + rel + ' wordt door de backend gebruikt maar staat niet in LOAD-BEARING-PAGES.md. Voeg deze pagina toe (met wat er breekt + hoe te testen) zodat een latere refactor haar niet per ongeluk weggooit.');
        refProblemen++;
      }
    });
    if (!refProblemen && !manifestProblemen) ok('Alle ' + backendRefs.size + ' backend-gelinkte frontend-pagina\'s bestaan, zijn functioneel en staan in LOAD-BEARING-PAGES.md.');
  }
}

// ── 12. Consistentiecheck-prompt: de "nooit een oordeel / nooit een gok"-guardrails blijven staan ──
// (werkregel 26 — de AI-prompt in worker/30-consistentie.js genereert tekst die de begeleider
//  gebruikt bij het beoordelen van tegenpartij-documenten. Deze check bewaakt dat een latere edit
//  de kern-guardrails niet stilzwijgend verwijdert.)
log('12. Cross-document consistentiecheck (worker/30-consistentie.js): AI-guardrails aanwezig');
{
  // Productpunt 22: via dezelfde gebonden backendFiles als checks 2-9, zodat CI deze check ook echt draait.
  const rel = 'worker/30-consistentie.js';
  const bestand = backendFiles.find(f => f.name === 'backend/' + rel);
  if (!bestand) {
    ok('backend/' + rel + ' niet in deze repo — check overgeslagen (draait in de backend-repo-audit).');
  } else {
    const src = bestand.src;
    let problemen = 0;
    if (!/NOOIT een oordeel over welke waarde de juiste is/i.test(src)) {
      warn(rel + ' — de guardrail "NOOIT een oordeel over welke waarde de juiste is" ontbreekt in AI_SYSTEM. Zonder die regel kan de check zelf partij kiezen.');
      problemen++;
    }
    if (!/onvoldoende_data/.test(src) || !/nooit een gok/i.test(src)) {
      warn(rel + ' — de "bij twijfel: onvoldoende_data, nooit een gok"-regel lijkt te ontbreken/gewijzigd in AI_SYSTEM.');
      problemen++;
    }
    if (!/Verzin geen waarden, geen documentnamen en geen citaten/i.test(src)) {
      warn(rel + ' — de regel dat citaten/namen/waarden letterlijk uit de aangeleverde tekst moeten komen ontbreekt.');
      problemen++;
    }
    if (!problemen) ok('AI_SYSTEM bevat de drie guardrails (geen oordeel over juistheid, bij twijfel onvoldoende_data, geen verzonnen citaten/waarden).');
  }
}

// ── 13. Reliance-voettekst (FASE6 onderdeel 2): constante bestaat + wordt overal aangehecht ──
// (De jurist-goedgekeurde slotregel moet onder elk gegenereerd document staan — op scherm, in de
//  print/PDF en in de verzendmail — en byte-identiek zijn met de backend-kopie. Deze check bewaakt
//  dat een latere edit de constante niet hernoemt/wijzigt of een aanhechting stilzwijgend weghaalt.)
log('13. Reliance-voettekst: constante aanwezig + bevestiging vóór printen (mna/04 + mna/05)');
{
  // Bijgewerkt 12 sep 2026 (Marcel, harde eis): de voettekst hangt niet langer vast onder het
  // geprinte document (dat maakte het onbruikbaar voor de adviseur om een schone versie te geven) —
  // in plaats daarvan bevestigt de adviseur de tekst vooraf via een pop-up (toonRelianceAkkoord in
  // mna/05), vastgelegd via secAuditLog i.p.v. in het document zelf. De VERSTUURDE kopie (backend
  // maakPDF()/maakDocEmail()) is een ander vraagstuk (een formele kopie naar een echte tegenpartij)
  // en behoudt de voettekst ongewijzigd — die kant blijft hieronder ongewijzigd gecontroleerd.
  const VERWACHT = 'Dit document is via het Koers voor Morgen-platform opgesteld als hulpmiddel voor de begeleidende adviseur en diens opdrachtgever. Het is geen professioneel advies of taxatierapport en is niet bestemd voor gebruik door derden.';
  let problemen = 0;
  const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const src05 = fs.readFileSync(path.join(ROOT, 'mna/05-documentflow-partijen.js'), 'utf8');
  if (!src04.includes("var RELIANCE_VOETTEKST = '" + VERWACHT + "'")) {
    warn('mna/04 — RELIANCE_VOETTEKST ontbreekt of wijkt af van de jurist-goedgekeurde tekst (FASE6 onderdeel 2). Byte-identiek houden met worker/02-config-constanten.js.');
    problemen++;
  }
  if (!src05.includes('function toonRelianceAkkoord(')) {
    warn('mna/05 — toonRelianceAkkoord() (de reliance-bevestigingspop-up vóór printen) ontbreekt.');
    problemen++;
  }
  if (!/function printDoc\([^)]*\)\s*\{\s*toonRelianceAkkoord\(/.test(src05)) {
    warn('mna/05 — printDoc() roept toonRelianceAkkoord() niet meer aan vóór het openen van het printvenster.');
    problemen++;
  }
  if (/doc-body[\s\S]{0,600}RELIANCE_VOETTEKST[\s\S]{0,500}doc-footer/.test(src05)) {
    warn('mna/05 — de reliance-voettekst staat weer als vast slotblok in het printvenster zelf (dit moest juist een pop-up worden, 12 sep 2026).');
    problemen++;
  }
  // Backend-kopie (indien de backend-repo naast deze repo staat) — ongewijzigd: de daadwerkelijk
  // verstuurde/gemailde kopie behoudt de voettekst.
  const bws = ['../koersvoormorgen-backend/backend/worker/02-config-constanten.js', 'backend/worker/02-config-constanten.js']
    .map(p => path.join(ROOT, p)).find(p => fs.existsSync(p));
  if (bws) {
    const bsrc = fs.readFileSync(bws, 'utf8');
    if (!bsrc.includes("export const RELIANCE_VOETTEKST = '" + VERWACHT + "'")) {
      warn('backend worker/02 — RELIANCE_VOETTEKST ontbreekt of wijkt af; frontend- en backend-kopie moeten byte-identiek zijn.');
      problemen++;
    }
  }
  if (!problemen) ok('RELIANCE_VOETTEKST bestaat, is byte-identiek' + (bws ? ' (frontend + backend)' : '') + '; printDoc() vraagt vooraf bevestiging i.p.v. de tekst vast in het document te zetten.');
}

log('14. Documentcontent-race NDA/LoI/MOU (KVM-QUALITY-GATE.md, regressie 12 sep 2026)');
{
  // Bevinding 12 sep 2026: bgMouComposer()/bgMouRender() (mna/04) deelden _mouProfile/_mouDocId
  // zonder generatiebewaking — snel na elkaar NDA dan LoI openen kon de inhoud van de eerste,
  // tragere aanroep alsnog tonen/printen onder de titel van de tweede. Fix: een generatieteller
  // (_mouGen) die na elke await controleert of er intussen een nieuwere aanroep is gestart, en de
  // gedeelde _mouProfile/_mouDocId pas commit't op het moment dat de bijbehorende inhoud ook echt
  // getoond wordt. Deze check vergrendelt dat patroon — verdwijnt de bewaking (bijv. bij een
  // toekomstige "vereenvoudiging"), dan faalt de push vóórdat de race weer terugkomt.
  const src04mou = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const guardCount = (src04mou.match(/if\(myGen!==_mouGen\)return;/g) || []).length;
  if (guardCount < 4) {
    warn('mna/04-begeleider-dashboard.js — generatiebewaking (myGen!==_mouGen) in bgMouComposer/bgMouRender telt nog maar ' + guardCount + ' controle(s) (verwacht: minstens 4, één per await-punt). Mogelijk (deels) verwijderd — dit opent opnieuw de NDA/LoI/MOU-documentcontent-race van 12 sep 2026.');
  } else if (!/_mouProfile=prof;\s*_mouDocId=docId;/.test(src04mou)) {
    warn('mna/04-begeleider-dashboard.js — de gedeelde _mouProfile/_mouDocId worden niet meer atomisch gecommit vlak vóór out.innerHTML in bgMouRender(). Dit opent opnieuw de NDA/LoI/MOU-documentcontent-race van 12 sep 2026.');
  } else {
    ok('Generatiebewaking (_mouGen) en het atomische commit-moment zijn nog aanwezig in bgMouComposer/bgMouRender.');
  }
}

log('15. bgDocSpa() gebruikt de dedicated /mna/spa/genereer-route, niet de generieke /ai-proxy (P3-45)');
{
  // Bevinding 11/12 sep 2026 (architectuurafwijking): de SPA — het meest juridisch risicovolle
  // documenttype — riep de generieke /ai-proxy aan i.p.v. een eigen, code-geauthenticeerde route
  // (zoals /mna/risicoraamwerk/genereer en /mna/waardering/genereer). Gefixt 12 sep 2026 met een
  // nieuwe backend-route (worker/10-mna-communicatie.js). Deze check vergrendelt dat bgDocSpa() niet
  // stilzwijgend teruggezet wordt naar de generieke proxy.
  const src04spa = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  // Onafhankelijke review 12 sep 2026: de eerdere afbakening (niet-gulzig tot de eerste regel met
  // exact 2-spaces-inspringende '}') leunde stilzwijgend op de huidige inspringstijl — een toekomstige
  // edit die per ongeluk zo'n regel toevoegt vóórdat de echte functie eindigt, zou de match afkappen
  // en een teruggekeerde /ai-aanroep kunnen missen (vals-negatief). Nu structureel afgebakend: van de
  // start van bgDocSpa() tot de eerstvolgende functiedeclaratie op hetzelfde (top-level) niveau.
  const spaStartIdx = src04spa.indexOf('async function bgDocSpa()');
  let spaFnBody = null;
  if (spaStartIdx !== -1) {
    const restNaStart = src04spa.slice(spaStartIdx + 'async function bgDocSpa()'.length);
    const volgendeFnMatch = /\n {0,2}(?:async )?function \w/.exec(restNaStart);
    const spaEindIdx = volgendeFnMatch ? spaStartIdx + 'async function bgDocSpa()'.length + volgendeFnMatch.index : src04spa.length;
    spaFnBody = src04spa.slice(spaStartIdx, spaEindIdx);
  }
  if (!spaFnBody) {
    warn('mna/04-begeleider-dashboard.js — bgDocSpa() niet gevonden (functie hernoemd/verplaatst?) — check 15 kan niets controleren.');
  } else {
    if (/WORKER\+'\/ai'/.test(spaFnBody)) {
      warn('mna/04-begeleider-dashboard.js — bgDocSpa() roept weer de generieke /ai-proxy aan i.p.v. /mna/spa/genereer. Dit is de architectuurafwijking van 11 sep 2026 die op 12 sep 2026 bewust is gefixt (OPEN-BEVINDINGEN P3-45) — niet opnieuw introduceren.');
    } else if (!/WORKER\+'\/mna\/spa\/genereer'/.test(spaFnBody)) {
      warn('mna/04-begeleider-dashboard.js — bgDocSpa() roept /mna/spa/genereer niet meer aan (en ook niet de oude /ai-proxy) — controleer welk mechanisme nu gebruikt wordt.');
    } else {
      ok('bgDocSpa() gebruikt de dedicated /mna/spa/genereer-route, geen generieke /ai-proxy meer.');
    }
  }
}

log('16. N-115 introductie-UI (tests/n115-ui.mjs): koper A/B/C, inerte overeenkomst, worker-whitelist, geen vals succes');
{
  // N-115 (P1B, 3 okt 2026): de lokale UI-test draait de echte introductie.html-code en de zuivere
  // N-115-functies uit mna/04 in node:vm met een minimale DOM-fixture — geen netwerk, geen browser.
  try {
    const { draaiN115UiChecks } = await import('./n115-ui.mjs');
    const resultaten = await draaiN115UiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('N-115: ' + r.msg));
    if (!gefaald.length) ok('Alle ' + resultaten.length + ' N-115-UI-checks geslaagd (koper ziet vóór vrijgave alleen de teaser, overeenkomsttekst inert, token alleen naar de whitelist-worker, geen succes zonder serverbevestiging).');
  } catch (e) {
    warn('tests/n115-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('17. P1C promotie-UI en eigen trajectdoorgang (tests/p1c-ui.mjs): context, prijzen/keuze, dubbelklik, rolcorrecte doorgang, koper A/B/C');
{
  // P1C (N-95, 3 okt 2026): zuivere P1C-functies uit adv.html en mna/04 in node:vm plus statische
  // bewaking van de UI-glue — geen netwerk, geen browser. De browserflow staat in tests/p1c-promotie.spec.js.
  try {
    const { draaiP1cUiChecks } = await import('./p1c-ui.mjs');
    const resultaten = await draaiP1cUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('P1C: ' + r.msg));
    if (!gefaald.length) ok('Alle ' + resultaten.length + ' P1C-UI-checks geslaagd (context uit de adresbalk, geen opslag, serverprijzen en expliciete keuze, geen dubbele POST, alleen eigen rol bij doorgang).');
  } catch (e) {
    warn('tests/p1c-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('17b. N-77b expliciet testerakkoord (tests/n77b-ui.mjs): onboarding, serverbevestiging, dataherlaad, MFA en gewone gebruiker');
{
  // N-77b (4 okt 2026): zuivere N77B-functies plus de echte login-/voorwaardenschermen uit adv.html in
  // node:vm met nep-DOM en nep-fetch — geen netwerk, geen browser. De browserflow staat in
  // tests/n77b-tester-voorwaarden.spec.js.
  try {
    const { draaiN77bUiChecks } = await import('./n77b-ui.mjs');
    const resultaten = await draaiN77bUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('N-77b: ' + r.msg));
    if (!gefaald.length) ok('Alle ' + resultaten.length + ' N-77b-UI-checks geslaagd (eigen niet-aangevinkt testervakje, serverversie, geen vals succes, herladen vóór dashboard, gewone gebruiker ongewijzigd).');
  } catch (e) {
    warn('tests/n77b-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('18. Waarderingsrapport genereren (tests/waardering-genereren.mjs): mislukte generatie nooit als rapport opgeslagen');
{
  // Weekend kern-UI/UX (4 okt 2026): HTTP-fout/ok:false/rd.error werd als "AI fout"-tekst als nieuwe
  // rapportversie opgeslagen met succestoast. De test draait de echte handler uit mna/06 in node:vm
  // met fetch/DOM-fixtures — geen netwerk, geen browser.
  try {
    const { draaiWaarderingGenererenChecks } = await import('./waardering-genereren.mjs');
    const resultaten = await draaiWaarderingGenererenChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Waarderingsrapport: ' + r.msg));
    if (!gefaald.length) ok('Alle ' + resultaten.length + ' waarderingsrapport-checks geslaagd (HTTP-/JSON-fout, ok:false en lege tekst: geen opslag of succes en opnieuw proberen mogelijk; succes bewaart met begeleider-header en gesaneerde weergave; mislukte opslag geeft geen vals succes).');
  } catch (e) {
    warn('tests/waardering-genereren.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('19. N-121 lange AI-generaties (tests/n121-ai-timeouts.mjs): 13 AI-calls begrensd op 180s, defaults/uploads ongewijzigd');
{
  // N-121 (4 okt 2026): staging mat 57/62s voor rijke trajecten; de 60000 ms-timeout van de 13
  // AI-generatiecalls in mna/04 en mna/06 gaf een valse fout. De test draait de echte fetchMetTimeout
  // (mna/01) en de echte verkoopmemorandum-handler (mna/04) in node:vm met virtuele klok en
  // gecontroleerde fetch — geen netwerk, geen browser, geen echte wachttijd.
  try {
    const { draaiN121AiTimeoutChecks } = await import('./n121-ai-timeouts.mjs');
    const resultaten = await draaiN121AiTimeoutChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('N-121: ' + r.msg));
    if (!resultaten.length) warn('N-121: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' N-121-checks geslaagd (13 AI-calls op 180000 ms met ongewijzigde headers/body, antwoord na 62s slaagt, hangend verzoek afgebroken op 180s met timer weg, netwerkfout reject, default 15s en uploads 60s ongewijzigd, verkoopmemorandum: laat succes getoond, time-out zonder valse opslag en met werkende herstart).');
  } catch (e) {
    warn('tests/n121-ai-timeouts.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('20. P2-28 expliciete labels mna/04 (tests/p228-labels.mjs): Status per targetkaart en beide Fusie-bestuursnamen');
{
  // P2-28 (4 okt 2026): de echte render-/goedkeuringsfuncties uit mna/04 in node:vm met een minimale
  // DOM-fixture — unieke id/for-relaties, labelnaam en labelklik/focus. Geen netwerk, geen browser.
  try {
    const { draaiP228LabelChecks } = await import('./p228-labels.mjs');
    const resultaten = await draaiP228LabelChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('P2-28: ' + r.msg));
    if (!resultaten.length) warn('P2-28: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' P2-28-labelchecks geslaagd (uniek Status-label per targetkaart, eigen label per Fusiebestuur, labelklik focust het juiste veld, data-id en goedkeuringsvereisten ongewijzigd).');
  } catch (e) {
    warn('tests/p228-labels.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('21. N-122/N-124 Marilyn: gekozen records verwijderen (tests/n122-marilyn-verwijderen.mjs)');
{
  // N-122/N-124 (4 okt 2026): leads, proefaanvragen en koopmandaten kregen een groepsselectie; de
  // bestaande groepsacties (scans, terugbelverzoeken, trajecten, documenten, scan-rapporten) melden
  // mislukte verwijderingen. De test laadt het echte marilyn.html-script in node:vm met een minimale
  // DOM-fixture en een nep-worker — echte login, klikken en handlers; geen netwerk, geen browser.
  try {
    const { draaiN122VerwijderChecks } = await import('./n122-marilyn-verwijderen.mjs');
    const resultaten = await draaiN122VerwijderChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('N-122: ' + r.msg));
    if (!resultaten.length) warn('N-122: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' N-122-checks geslaagd (annuleren verstuurt niets, alleen aangevinkte records via de bestaande individuele routes met gecodeerd padsegment, niet-gekozen records blijven, 403/404/500/netwerkfout gemeld zonder technische details en zonder herhaling, dubbelklik geeft geen dubbele verwijdering, knop hersteld na fout, verversen, vergrendelde/afgeschermde records en niet-superadmin uitgesloten, uitleg over behouden proefaccount en koopmandaat-targets).');
  } catch (e) {
    warn('tests/n122-marilyn-verwijderen.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('22. N-123/N-124 Marilyn: kantoor verwijderen (tests/n123-kantoor-ui.mjs)');
{
  // N-123/N-124 (4 okt 2026): de Kantoren-tab kreeg een losse verwijderactie voor het geopende kantoor
  // via de bestaande backendroute POST /mna/admin/kantoren/{id}/verwijderen (logisch verwijderen,
  // gekoppeld kantoor → 409). De test laadt het echte marilyn.html-script in node:vm met een minimale
  // DOM-fixture en een nep-worker — echte login, klikken en handlers; geen netwerk, geen browser.
  try {
    const { draaiN123KantoorChecks } = await import('./n123-kantoor-ui.mjs');
    const resultaten = await draaiN123KantoorChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('N-123: ' + r.msg));
    if (!resultaten.length) warn('N-123: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' N-123-checks geslaagd (alleen het geopende kantoor via de bestaande route met gecodeerd padsegment, annuleren verstuurt niets, dubbelklik één POST, herladen en detail sluiten alleen na serverbevestigd succes, 409 met opsomming en niets gewijzigd, 401/403/404/500/netwerk/onjuiste JSON/ok:false zonder vals succes of herhaling en knop hersteld, begrijpelijke laadfouten, geen actie zonder superadmin of sleutel, documentatie feitelijk).');
  } catch (e) {
    warn('tests/n123-kantoor-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('23. Koopmandaat generieke targetflow (tests/koopmandaat-targetflow-ui.mjs): targets, formulier, acties, bevestiging, koperinteresse');
{
  // Generieke targetflow (GO 4 okt 2026): de echte koopmandaatcode uit mna/04 (kaarten, formulier,
  // targetflow-acties, historie, bevestigingsvenster, koperkaart) plus adv.html-P1C en introductie.html
  // in node:vm met een minimale DOM-fixture en een nep-worker — echte klikken en handlers, geen netwerk,
  // geen browser. De browserflow (lokaal met de echte backendhandler, apart live op staging) staat in
  // tests/koopmandaat-targetflow.spec.js; deze check is geen bewijs van de volledige gebruikersflow.
  try {
    const { draaiKoopmandaatTargetflowUiChecks } = await import('./koopmandaat-targetflow-ui.mjs');
    const resultaten = await draaiKoopmandaatTargetflowUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Targetflow: ' + r.msg));
    if (!resultaten.length) warn('Targetflow: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' targetflow-UI-checks geslaagd (meerdere targets los van elkaar, metadata en interne anonieme naam alleen voor de begeleider, nieuwe targets generiek, bewerken alleen gewijzigde velden, acties met bevestiging/reden en zonder vals succes bij 409/netwerk, archief zonder verwijdering, promotie pas na match + vrijgave, concept zonder opslag, vaststellen via de bestaande versieactie, "link aangemaakt" los van "verzonden", koper alleen eigen interessekeuze en allow-list).');
  } catch (e) {
    warn('tests/koopmandaat-targetflow-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('24. Bewijsstuk-upload (tests/document-bewijsstuk-upload.mjs): aangevinkte keuze overleeft het hertekenen');
{
  // Live stagingproef (4 okt 2026): aangevinkt "Alleen als bewijsstuk", upload 200/ok maar
  // alleen_bewijsstuk=false — renderApp wiste de checkbox vóór uploadDocument hem las. De test draait
  // de echte upload-/renderfuncties uit mna/02 en fetchMetTimeout uit mna/01 in node:vm met een
  // DOM-fixture en fetch-stub — geen netwerk, geen browser.
  try {
    const { draaiDocumentBewijsstukUploadChecks } = await import('./document-bewijsstuk-upload.mjs');
    const resultaten = await draaiDocumentBewijsstukUploadChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Bewijsstuk-upload: ' + r.msg));
    if (!resultaten.length) warn('Bewijsstuk-upload: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' bewijsstuk-uploadchecks geslaagd (hertekenen wist de checkbox, toch &alleen_bewijsstuk=true bij batch, directe upload en vervangen; niet aangevinkt geen vlag; geen AI-route in bewijsstukmodus; entiteitkeuze en extra controle blijven eveneens behouden).');
  } catch (e) {
    warn('tests/document-bewijsstuk-upload.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('25. Documentupload-status (tests/document-processing-ui.mjs): blijvende status, concrete fouten en veilige batchstop');
{
  // 7 okt 2026: uploadDocument noemde elke fout (ook JSON/mapping/render) "Verbindingsfout" en wiste de
  // rij ook als de server al een doc_id had; de lijst negeerde verwerking_status; de centrale upload telde
  // NEEDS_REVIEW als verwerkt. De test draait de echte upload-/lijst-/render-/batchfuncties uit mna/02 en
  // fetchMetTimeout uit mna/01 in node:vm tegen synthetische serverantwoorden (vorm backend worker/14+15)
  // — geen netwerk, geen browser, geen live API. Browserbewijs volgt op staging.
  try {
    const { draaiDocumentProcessingUiChecks } = await import('./document-processing-ui.mjs');
    const resultaten = await draaiDocumentProcessingUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Uploadstatus: ' + r.msg));
    if (!resultaten.length) warn('Uploadstatus: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' uploadstatuschecks geslaagd (PROCESSED/STORED/NEEDS_REVIEW/FAILED met eigen status en reden, non-200 met doc_id blijft zichtbaar en na herladen, geen fictieve rij zonder doc_id, timeout/netwerk/onleesbaar antwoord/lokale fout gescheiden zonder automatische herupload, batch met uitkomst per bestand en annuleren van alleen niet-gestarte bestanden, geen vreemde state na uitloggen, oude versie blijft bij mislukte vervanging, lijst-503 behoudt cache, geen veldinvulling uit foutdocumenten, escaping).');
  } catch (e) {
    warn('tests/document-processing-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('26. Documentuitvoer (tests/document-output-security.mjs): veilige tekstopmaak en publieke trajectreferentie');
{
  // P0 7 okt 2026: mdToHtml (mna/02) gaf bron-HTML als actieve HTML door; printDocNaAkkoord (mna/05)
  // escapete tekst/titel/branding niet en drukte de toegangscode in de kop af. De test draait de echte
  // mdToHtml/esc en printDocNaAkkoord in node:vm met synthetisch window/document — geen netwerk, geen
  // browser. Browserbewijs volgt op staging; zie docs/document-output.md.
  try {
    const { draaiDocumentOutputSecurityChecks } = await import('./document-output-security.mjs');
    const resultaten = await draaiDocumentOutputSecurityChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Documentuitvoer: ' + r.msg));
    if (!resultaten.length) warn('Documentuitvoer: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' documentuitvoer-checks geslaagd (geen bron-HTML/attributen/handlers als markup in rapport of print, <b>/<strong>/<em>/<i>/<br> leesbaar zonder markers, bestaande Markdown-/printopmaak en branding behouden, titel/bedrijf/adres/logo-alt geëscapet, logo alleen https/base64-afbeelding, alleen "Trajectreferentie: TR-…" en nooit een toegangscode/id, print zonder API-/opslag-/navigatie-effect en zonder wijziging van S).');
  } catch (e) {
    warn('tests/document-output-security.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('27. Financiële broncontrole UI (tests/financial-source-ui.mjs): rollen, scopebinding, bronweergave en gemotiveerde correctie');
{
  // Productpunt 3 (9 okt 2026): de test draait de echte mna/09 met fetchMetTimeout (mna/01), esc/rolhelpers
  // (mna/02) en parseGeld (mna/03) in node:vm tegen synthetische antwoorden in de vorm van de gecommitte
  // backendroutes GET/POST /mna/financieel/broncontrole — geen netwerk, geen browser, geen live API of AI.
  // Docs-, staging- en productiebewijs staan apart open; zie docs/financial-source-ui.md.
  try {
    const { draaiFinancialSourceUiChecks } = await import('./financial-source-ui.mjs');
    const resultaten = await draaiFinancialSourceUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Financiële broncontrole UI: ' + r.msg));
    if (!resultaten.length) warn('Financiële broncontrole UI: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' broncontrole-UI-checks geslaagd (koper/onbekende rol zonder paneel of verzoek, alleen laden na klik, exacte GET-scope, BRONFEIT/AI-INTERPRETATIE/ONZEKER, origineel vs. genormaliseerd, ACTUAL/FORECAST, enkelvoudig/geconsolideerd/onbekend, trajectniveau niet automatisch geconsolideerd, crosscheckverschillen, ontbrekende gegevens, XSS-escaping, 404/403/500/netwerk/onleesbaar/malformed zonder vals succes, stale antwoorden na entiteit-/traject-/rol-/schermwissel genegeerd, begeleider alleen lezen, correctie alleen verkoper met exacte payload, canonieke bedragen zonder NaN/null-als-nul, reden/brondocument/bevestiging verplicht, dubbelklik één POST, 409 alleen herladen zonder retry, lokale invoer nooit stil overschreven, begrensde weergave met melding).');
  } catch (e) {
    warn('tests/financial-source-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('28. Juridische broncontrole UI (tests/legal-structure-ui.mjs): rollen, scopebinding, bronweergave en begeleiderbeoordeling');
{
  // Productpunt 4 (10 okt 2026): de test draait de echte mna/10 met fetchMetTimeout (mna/01) en de
  // rolhelpers (mna/02) in node:vm tegen synthetische antwoorden in de vorm van de gecommitte backendroutes
  // GET /mna/juridisch/broncontrole/{code} en POST /mna/juridisch/broncontrole/beoordeling — geen netwerk,
  // geen browser, geen live API of AI. Staging, echte documenten en productie staan apart open; zie
  // docs/legal-structure-ui.md.
  try {
    const { draaiLegalStructureUiChecks } = await import('./legal-structure-ui.mjs');
    const resultaten = await draaiLegalStructureUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Juridische broncontrole UI: ' + r.msg));
    if (!resultaten.length) warn('Juridische broncontrole UI: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' juridische-broncontrole-UI-checks geslaagd (laadvolgorde mna/10 vóór mna/06 met behoud van mna/09, koper/meekijker/onbekende rol zonder paneel of verzoek, alleen laden na klik, exacte GET zonder beheerderssleutel, platform versus bronvoorstel, verschillen/onbekenden, AI-voorstel nooit als bewezen, document-id/versie/hash/pagina/fragment en ontbrekend bewijs, ACTUEEL versus HISTORISCH_VEROUDERD, XSS-escaping, verkoper alleen lezen, admin/geen recht/vergrendeld/geen bron/ongeldige digest zonder knop of POST, exacte POST-body, motivatie 10–1000 tekens en bevestiging verplicht, dubbelklik één POST, 409 alleen herladen zonder retry, 403/404/503/500/netwerk/malformed zonder vals succes met behoud van motivatie, late GET/POST na klant-/rol-/scherm-/fasewissel genegeerd, geen cache tussen klanten, niet-opgeslagen formulierinvoer intact, geen entiteitmutatie, begrensde weergave met melding, geen AI-aanroep).');
  } catch (e) {
    warn('tests/legal-structure-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('29. Groepsbeeld UI (tests/group-consolidation-ui.mjs): bruto berekend versus aangeleverd, read-only uit S._mnaData');
{
  // Productpunt 5 (10 okt 2026): de test draait de echte mna/11 met de rolhelpers (mna/02) en de bestaande
  // bedragopmaak (mna/09) in node:vm tegen synthetische S._mnaData in de vorm van de gecommitte backend-
  // metadata (worker/42, consolidatieCheck.groepsbeeld) — geen netwerk, geen browser, geen live API of AI.
  // Backend-live, staging, echte documenten en productie staan apart open; zie docs/group-consolidation-ui.md.
  try {
    const { draaiGroupConsolidationUiChecks } = await import('./group-consolidation-ui.mjs');
    const resultaten = await draaiGroupConsolidationUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Groepsbeeld UI: ' + r.msg));
    if (!resultaten.length) warn('Groepsbeeld UI: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' groepsbeeld-UI-checks geslaagd (laadvolgorde mna/11 na mna/10 en vóór mna/06, bestaande panelen en consolidatieCheck-melding behouden, koper/meekijker/onbekende rol en andere fase zonder paneel of verwerking, alleen groepsrij financieel met entiteit_id null/ontbrekend, bruto versus aangeleverde echte 0 met oorspronkelijke invoer, onvolledig/onbruikbaar/ambigu/PROGNOSE/periode onbekend, eliminaties en correcties onbekend nooit 0, gereconcilieerd null/niet mogelijk, verschil als signaal geen foutbewijs, rekenselectie met aantallen en kring niet bewezen, geen/malformed/legacy/onbekende metadata expliciet zonder crash, XSS-escaping, onverklaarde statussen, max 40 velden met melding, rol-/fase-/trajectwissel zonder cache, geen netwerk/save/AI, formulier- en serverdata byte-gelijk).');
  } catch (e) {
    warn('tests/group-consolidation-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('30. Expliciete groepsdocumenten UI (tests/group-documents-ui.mjs): optionele classificatie bij de financiële upload, gesaneerde weergave');
{
  // Productpunt 6 (10 okt 2026): de test draait de echte mna/12 en de echte uploadintegratie uit mna/02
  // (leesUploadKeuzes, reeks/directe/vervangupload, lijst, versies) in node:vm tegen synthetische antwoorden
  // in de vorm van het gecommitte backendcontract (worker/43, worker/14/15) — geen netwerk, geen browser,
  // geen live API of AI. Backend-live, staging, productie en echte documenten staan apart open; zie
  // docs/group-documents-ui.md.
  try {
    const { draaiGroupDocumentsUiChecks } = await import('./group-documents-ui.mjs');
    const resultaten = await draaiGroupDocumentsUiChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Groepsdocumenten UI: ' + r.msg));
    if (!resultaten.length) warn('Groepsdocumenten UI: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' groepsdocumenten-UI-checks geslaagd (laadvolgorde mna/12 vóór mna/02 zonder uitvoering bij laden, uit = legacy keuzes en parameters byte-gelijk, volledige GROUP/ENTITY met exact vier queryparameters en behouden entiteit_id, ontbrekende/tegenstrijdige/vreemde entiteit en ambigue periode vóór elk verzoek geweigerd, enums/datums/jaargrenzen, prognose/begroting/YTD/deelperiode nooit jaarrealisatie, momentopname vóór renderApp bij reeks/direct/vervangen, bewijsstuk en extra controle behouden, geen hergebruik van oude-versieclassificatie, rollen/vergrendeling/trajectwissel/centrale upload, gesaneerde DTO uit upload/lijst/versies, legacy expliciet niet geclassificeerd, escaping zonder ruwe record/binding/interne id\'s, geen netwerk of AI vanuit mna/12).');
  } catch (e) {
    warn('tests/group-documents-ui.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('31. Marilyn Veiligheid (tests/marilyn-veiligheid.mjs): nacht- en ochtendcontrole tellen echt mee, actieknoppen zonder vals succes');
{
  // Productpunt 22 (10 okt 2026): de echte marilyn.html in node:vm met een minimale DOM-fixture en een
  // nep-worker (werkwijze van check 21) — echte login, elke veiligheidssectie, elke actieknop tegen
  // synthetische antwoorden. Geen netwerk, AI, audit, mail of deploy. UI-functioneel bewijs, geen bewijs
  // van een echte controlerun; zie docs/marilyn-veiligheid.md.
  try {
    const { draaiMarilynVeiligheidChecks } = await import('./marilyn-veiligheid.mjs');
    const resultaten = await draaiMarilynVeiligheidChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('Marilyn Veiligheid: ' + r.msg));
    if (!resultaten.length) warn('Marilyn Veiligheid: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' Marilyn-Veiligheid-checks geslaagd (ontbrekende, 0/0, FAIL, malformed, verouderde of ongeldig getimede nachtelijke selfcheck/ochtendcontrole nooit "actueel", bestaande 2-dagengrens, bestaande statuscriteria behouden, push-audit historisch met datum, elke sectie gerenderd, selfcheck/ochtendcontrole/audit/pentest/rapport/opgelost met annuleren, succes, 401/403/500/netwerk/onjuiste JSON/ok:false zonder vals succes, geen tab of actie zonder superadmin/geldige sleutel).');
  } catch (e) {
    warn('tests/marilyn-veiligheid.mjs kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('32. CI-backendbroncontext (draaiCiBackendBroncontextChecks hierboven): gebonden read-only bron, alleen op vertrouwde triggers, geen bron in logs');
{
  // Productpunt 22 (10 okt 2026): synthetische proeven op de bronresolver (ontbrekend/extern/symlink/
  // hashbinding) en statische analyse van checks.yml (trust-conditie, token, checkout, cleanup, ongewijzigde
  // E2E/cron/concurrency). Geen netwerk, echte secrets, git of AI. Bewijst NIET dat de echte dagelijkse
  // GitHub-run slaagt; zie docs/marilyn-veiligheid.md.
  try {
    const resultaten = await draaiCiBackendBroncontextChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('CI-backendbroncontext: ' + r.msg));
    if (!resultaten.length) warn('CI-backendbroncontext: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' CI-backendbroncontext-checks geslaagd (ontbrekende/externe/gesymlinkte/ongebonden bron = FAIL, token alleen op schedule/workflow_dispatch/default-branch-push, persist-credentials false, fetch-depth 1, alleen cloudflare-worker.js + worker/, HEAD/hash-binding, auditlog alleen als hash/exit-samenvatting, cleanup altijd, E2E/cron/concurrency/rapportage ongewijzigd).');
  } catch (e) {
    warn('CI-backendbroncontext-checks konden niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('33. Marilyn verwijderbeheer: benchmarkverwijdering (.btn-del-bench) leest het antwoord, geen fictief succes');
{
  // Vervolg op backend ab49b69 (10 okt 2026): POST /admin/benchmarks/delete/{sleutel} geeft bij een
  // databasefout 500 met {ok:false,error}. De echte klikhandler uit marilyn.html wordt in node:vm gedraaid
  // tegen synthetische antwoorden. Geen netwerk, geen echte data.
  const bmFouten = [];
  try {
    const vm = await import('vm');
    const src = fs.readFileSync(path.join(ROOT, 'marilyn.html'), 'utf8');
    const start = src.indexOf("db.querySelectorAll('.btn-del-bench').forEach(");
    if (start < 0) throw new Error('.btn-del-bench-handler niet gevonden in marilyn.html');
    // Haakjes tellen vanaf forEach( tot de bijbehorende sluiting; stringliterals overslaan.
    let i = src.indexOf('(', start + "db.querySelectorAll('.btn-del-bench')".length), diepte = 0, q = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '(') diepte++;
      else if (c === ')' && --diepte === 0) break;
    }
    const code = src.slice(start, i + 1);
    if (/innerHTML/.test(code)) bmFouten.push('handler gebruikt innerHTML');
    if (/\.catch\(function\(\)\{\}\)/.test(code)) bmFouten.push('handler slikt fetch-fouten nog stil in (.catch(function(){}))');

    const SERVERTEKST = '<img src=x onerror=alert(1)> SQLITE_ERROR DELETE FROM benchmarks';
    const draai = async ({ bevestig = true, antwoord }) => {
      const st = { fetches: [], toasts: [], herladen: 0, handler: null };
      const btn = { dataset: { sleutel: 'synth-sleutel' }, addEventListener: (t, f) => { if (t === 'click') st.handler = f; } };
      const ctx = vm.createContext({
        WORKER: 'https://worker.test', adminKey: 'synthetische-beheersleutel',
        db: { querySelectorAll: () => [btn] },
        confirm: () => bevestig,
        toast: (msg, type) => st.toasts.push({ msg: String(msg), type }),
        laadBenchmarks: () => { st.herladen++; },
        fetch: async (url, opts) => { st.fetches.push({ url, opts }); return antwoord(); },
      });
      vm.runInContext(code, ctx);
      if (!st.handler) throw new Error('geen klikhandler geregistreerd');
      await st.handler();
      return st;
    };
    const resp = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'string' ? JSON.parse(body) : body) });

    // Annuleren: geen verzoek, geen herladen, geen melding.
    const ann = await draai({ bevestig: false, antwoord: resp(200, { ok: true }) });
    if (ann.fetches.length || ann.herladen || ann.toasts.length) bmFouten.push('annuleren doet toch een verzoek, herlaadt of meldt iets');

    // Succes: bestaande URL/header/methode, lijst herladen, geen foutmelding.
    const suc = await draai({ antwoord: resp(200, { ok: true }) });
    const f0 = suc.fetches[0];
    if (!f0 || f0.url !== 'https://worker.test/admin/benchmarks/delete/synth-sleutel' || f0.opts.method !== 'POST' || f0.opts.headers['x-admin-key'] !== 'synthetische-beheersleutel')
      bmFouten.push('succesverzoek gebruikt niet de bestaande URL/POST/x-admin-key-header');
    if (suc.herladen !== 1 || suc.toasts.some(t => t.type === 'err')) bmFouten.push('succes herlaadt de lijst niet precies één keer of toont een foutmelding');

    // Mislukkingen: altijd een neutrale foutmelding, nooit herladen-als-succes, nooit servertekst/technische details.
    const scenario = {
      '500 {ok:false,error}': resp(500, { ok: false, error: SERVERTEKST }),
      '401 Unauthorized': resp(401, { error: 'Unauthorized' }),
      '200 {ok:false}': resp(200, { ok: false, error: SERVERTEKST }),
      '200 zonder ok:true': resp(200, {}),
      '500 met ok:true': resp(500, { ok: true }),
      '200 onjuiste JSON': resp(200, 'geen-json{'),
      'netwerkfout': async () => { throw new TypeError('Failed to fetch'); },
    };
    for (const [naam, antwoord] of Object.entries(scenario)) {
      const s = await draai({ antwoord });
      const fout = s.toasts.filter(t => t.type === 'err');
      if (fout.length !== 1) bmFouten.push(naam + ': geen (of meer dan één) foutmelding getoond');
      if (s.toasts.some(t => t.type !== 'err')) bmFouten.push(naam + ': toont een niet-foutmelding (fictief succes)');
      if (s.herladen) bmFouten.push(naam + ': herlaadt de lijst alsof de verwijdering gelukt is');
      if (s.toasts.some(t => /SQLITE|DELETE FROM|<img|Unauthorized|Failed to fetch|JSON/i.test(t.msg))) bmFouten.push(naam + ': foutmelding bevat servertekst of technische details');
    }
  } catch (e) {
    bmFouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
  bmFouten.forEach(m => warn('Benchmarkverwijdering: ' + m));
  if (!bmFouten.length) ok('Benchmarkverwijdering: annuleren zonder verzoek, succes (2xx + ok:true) herlaadt via bestaande URL/POST/x-admin-key, 500/401/ok:false/zonder ok/onjuiste JSON/netwerkfout tonen één neutrale foutmelding zonder herladen of servertekst, geen innerHTML.');
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
