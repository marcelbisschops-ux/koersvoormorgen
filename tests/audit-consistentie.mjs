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
      // WF-001: zelfde regel als backend tests/lib-cascade-scope.mjs — een bewust losgemaakte koppeling (bron buiten
      // KVM, bijv. de externe financiële administratie) telt als gedekt, uitsluitend met exact dit patroon.
      const losRe = /UPDATE (\w+) SET traject_id=NULL WHERE traject_id=/g;
      while ((dm = losRe.exec(fnScope))) covered.add(dm[1]);
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
  // Productpunt 19 (11 okt 2026): een geslaagde blur-PATCH hertekende de hele composer en wiste daarmee
  // andere onopgeslagen velden/vrije tekst; een mislukte opslag zette het veld stil terug; de
  // documentkeuze zette _mouDocId al vóór het laden. Gedrag wordt bewezen in check 26
  // (tests/document-output-security.mjs, sectie G); dit vergrendelt alleen de aanhaakpunten.
  if (!/out\.innerHTML=h;\s*_mouHertekent=false;\s*bgMouWire\(bevroren\);\s*bgMouConceptenToepassen\(out,bevroren,focus\);/.test(src04mou)) {
    warn('mna/04-begeleider-dashboard.js — bgMouRender() zet onopgeslagen composerconcepten niet meer terug na out.innerHTML/bgMouWire (productpunt 19: formulierverlies bij hertekenen).');
  } else if (/inp\.value=inp\.getAttribute\('data-orig'\)/.test(src04mou)) {
    warn('mna/04-begeleider-dashboard.js — een mislukte veldopslag zet de invoer weer stil terug naar de oude waarde (productpunt 19).');
  } else if (/_mouDocId=this\.value/.test(src04mou)) {
    warn('mna/04-begeleider-dashboard.js — de documentkeuze (mou-kies) zet _mouDocId weer vóór het laden; invoer in het oude document kan dan onder het nieuwe vallen (productpunt 19).');
  } else {
    ok('Composer behoudt onopgeslagen invoer bij hertekenen (concepten na bgMouWire terug), mislukte opslag zet niets stil terug, documentkeuze commit _mouDocId pas bij tonen.');
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
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' uploadstatuschecks geslaagd (PROCESSED/STORED/NEEDS_REVIEW/FAILED met eigen status en reden, non-200 met doc_id blijft zichtbaar en na herladen, geen fictieve rij zonder doc_id, timeout/netwerk/onleesbaar antwoord/lokale fout gescheiden zonder automatische herupload, batch met uitkomst per bestand en annuleren van alleen niet-gestarte bestanden, geen vreemde state na uitloggen, oude versie blijft bij mislukte vervanging, lijst-503 behoudt cache, geen veldinvulling uit foutdocumenten, escaping, geconsolideerd groepsdocument expliciet op groepsniveau met keuzevenster i.p.v. vervanging van de bruto som).');
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
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' documentuitvoer-checks geslaagd (geen bron-HTML/attributen/handlers als markup in rapport of print, <b>/<strong>/<em>/<i>/<br> leesbaar zonder markers, bestaande Markdown-/printopmaak en branding behouden, titel/bedrijf/adres/logo-alt geëscapet, logo alleen https/base64-afbeelding, alleen "Trajectreferentie: TR-…" en nooit een toegangscode/id, print zonder API-/opslag-/navigatie-effect en zonder wijziging van S; composer (productpunt 19): twee velden + vrije tekst overleven blur/opslaan/hertekenen, oudere vertraagde opslag overschrijft nieuwere invoer niet, mislukte opslag houdt invoer met fout, geen overdracht naar ander document/traject, bevroren document krijgt geen concepten terug, geen AI-/opslagbijwerking).');
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
log('34. Productpunt 31: doorzoekbare handleiding en "Leg mij dit uit" (ingebedde DOM-test)');
{
  // Zoekveld in beide handleidingen (rolfilter blijft, geen HTML uit invoer) en contextuele knop met vaste
  // onderwerpen die per rol altijd uitleg opleveren. Echt script in node:vm; geen netwerk.
  try {
    // Ingebed (geen los testbestand: de releasecompositie staat geen nieuwe bestanden toe).
    const vm = (await import('vm')).default;
    const { execFileSync } = await import('child_process');

    function knip(src, van, tot, naam) {
      const a = src.indexOf(van), b = src.indexOf(tot, a + 1);
      if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
      return src.slice(a, b);
    }

    // ── Minimale DOM-fixture ──
    const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
    const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', mdash: '—', ndash: '–', middot: '·', rsquo: '’', lsquo: '‘', euml: 'ë', eacute: 'é' };
    const ontsnap = (s) => s
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&([a-z]+);/gi, (m, n) => (n in NAMED ? NAMED[n] : m))
      .replace(/&#39;/g, "'");

    function attrSelector(sel) {
      const m = /^\[([a-z0-9-]+)\]$/.exec(sel);
      if (!m) throw new Error('fixture ondersteunt alleen [attr]-selectors, niet: ' + sel);
      return m[1];
    }

    function maakDom() {
      const log = { innerHTML: [], aangemaakt: 0 };
      class El {
        constructor(tag, attrs, parent) {
          this.tag = tag; this.attrs = attrs; this.parent = parent; this.children = [];
          this._hidden = 'hidden' in attrs; this.value = '';
          log.aangemaakt++;
        }
        get hidden() { return this._hidden; }
        set hidden(v) { this._hidden = !!v; }
        get textContent() { return this.children.map((c) => (c.tag === '#text' ? c.text : c.textContent)).join(''); }
        // Zoals in de browser: textContent zetten vervangt alle kinderen door één tekstknoop — nooit HTML-parsing.
        set textContent(v) { this.children = [{ tag: '#text', text: String(v), parent: this }]; }
        get innerHTML() { throw new Error('innerHTML lezen niet nodig in deze fixture'); }
        set innerHTML(v) { log.innerHTML.push(String(v)); throw new Error('innerHTML schrijven is niet toegestaan'); }
        matches(sel) { return attrSelector(sel) in this.attrs; }
        closest(sel) { for (let n = this; n && n.tag !== '#root'; n = n.parent) if (n.matches(sel)) return n; return null; }
        elementen() { return this.children.flatMap((c) => (c.tag === '#text' ? [] : [c, ...c.elementen()])); }
        querySelectorAll(sel) { attrSelector(sel); return this.elementen().filter((e) => e.matches(sel)); }
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
      }
      function parse(html) {
        const root = new El('#root', {}, null);
        let cur = root;
        const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>|([^<]+)/g;
        let m;
        while ((m = re.exec(html))) {
          if (m[1]) {
            const tag = m[1].toLowerCase();
            let n = cur;
            while (n && n.tag !== tag) n = n.parent;
            if (n && n.parent) cur = n.parent;
          } else if (m[2]) {
            const attrs = {};
            const ar = /([^\s=]+)(?:="([^"]*)"|='([^']*)')?/g;
            let am;
            while ((am = ar.exec(m[3] || ''))) attrs[am[1].toLowerCase()] = ontsnap(am[2] ?? am[3] ?? '');
            const el = new El(m[2].toLowerCase(), attrs, cur);
            cur.children.push(el);
            if (!VOID.has(el.tag)) cur = el;
          } else if (m[4]) {
            cur.children.push({ tag: '#text', text: ontsnap(m[4]), parent: cur });
          }
        }
        return root;
      }
      return { parse, log };
    }

    const zichtbaar = (el) => { for (let n = el; n && n.tag !== '#root'; n = n.parent) if (n.hidden) return false; return true; };
    const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const MELDING = 'Geen onderdelen gevonden voor deze zoekterm.';

    // ── Laden van de echte code ──
    function laadMna(root, rol) {
      const src = fs.readFileSync(path.join(root, 'mna/08-handleiding.js'), 'utf8');
      const esc = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8').match(/^function esc\(s\)\{.*\}$/m);
      if (!esc) throw new Error('esc() niet gevonden in mna/02');
      const ctx = vm.createContext({
        BRAND: { platform: 'KVM' }, brandMerkHtml: () => '',
        isKoper: () => rol === 'koper', isTussen: () => rol === 'begeleider',
      });
      vm.runInContext(esc[0] + '\n' + src, ctx, { filename: 'mna/08-handleiding.js' });
      return { html: ctx.renderHandleiding(), hbZoek: ctx.hbZoek, src, HB_UITLEG: ctx.HB_UITLEG, legUitKnop: ctx.legUitKnop };
    }

    function advScript(root) {
      const html = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
      const a = html.indexOf('<script>'), b = html.indexOf('</script>', a);
      if (a < 0 || b < a) throw new Error('adv.html: inline <script> niet gevonden');
      return html.slice(a + '<script>'.length, b);
    }

    function laadAdv(root) {
      const script = advScript(root);
      const esc = script.match(/^function esc\(s\)\{.*\}$/m);
      if (!esc) throw new Error('esc() niet gevonden in adv.html');
      const deel = knip(script, 'function renderAdvHandleiding(){', '// Security-fix 17 aug 2026 (fix 6)', 'adv.html renderAdvHandleiding');
      let uit = null;
      const ctx = vm.createContext({ BRAND: { platform: 'KVM', suffix: 'Portaal' }, VIEW: '', G: { proef: false, proefTot: null, isTester: false }, render: (h) => { uit = h; } });
      vm.runInContext(esc[0] + '\n' + deel, ctx, { filename: 'adv.html#handleiding' });
      ctx.renderAdvHandleiding();
      return { html: uit, hbZoek: ctx.hbZoek, src: deel };
    }

    // Generieke zoekchecks op één gerenderde handleiding.
    function zoekChecks(naam, geladen, check) {
      const { parse, log } = maakDom();
      const doc = parse(geladen.html);
      const alle = doc.elementen();
      const invoer = alle.find((e) => e.tag === 'input' && e.attrs.id === 'hb-zoek');
      const label = alle.find((e) => e.tag === 'label' && e.attrs.for === 'hb-zoek');
      check(invoer && invoer.attrs.type === 'search' && alle.filter((e) => e.attrs.id === 'hb-zoek').length === 1, naam + ': één zoekveld type="search" (id hb-zoek)');
      check(label && label.textContent.trim() === 'Zoek in de handleiding', naam + ': gekoppeld label "Zoek in de handleiding"');
      const rootEl = invoer && invoer.closest('[data-hb-root]');
      const secties = rootEl ? rootEl.querySelectorAll('[data-hb-sectie]') : [];
      const items = rootEl ? rootEl.querySelectorAll('[data-hb-item]') : [];
      const melding = rootEl && rootEl.querySelector('[data-hb-leeg]');
      check(rootEl && secties.length >= 3 && items.length > 20 && melding, naam + ': zoekveld staat in de data-hb-root met secties (' + secties.length + '), items (' + items.length + ') en een meldingselement');
      check(invoer && /^hbZoek\(this\)$/.test(invoer.attrs.oninput || ''), naam + ': oninput roept hbZoek(this) aan');
      check(typeof geladen.hbZoek === 'function' && !/innerHTML|insertAdjacentHTML|outerHTML|fetch\(|localStorage|sessionStorage/.test(geladen.hbZoek.toString()), naam + ': hbZoek bestaat en gebruikt geen innerHTML/netwerk/opslag');
      if (!invoer || !rootEl || !melding || typeof geladen.hbZoek !== 'function') return null;

      const zoek = (q) => { invoer.value = q; geladen.hbZoek(invoer); };
      const zichtbareItems = () => items.filter(zichtbaar);
      const consistent = (q) => {
        const nq = norm(q);
        const itemsOk = items.every((it) => zichtbaar(it) === (!nq || (it.closest('[data-hb-sectie]') && norm(it.textContent).includes(nq))));
        const sectiesOk = secties.every((s) => s.hidden === (!!nq && !s.querySelectorAll('[data-hb-item]').some((i) => !i.hidden)));
        return itemsOk && sectiesOk;
      };

      // Begintoestand: alles zichtbaar, melding verborgen.
      check(items.every(zichtbaar) && secties.every((s) => !s.hidden) && melding.hidden, naam + ': begintoestand — alles zichtbaar, melding verborgen');

      // Filter op term.
      zoek('escrow');
      const na = zichtbareItems();
      check(na.length > 0 && na.length < items.length && consistent('escrow'), naam + ': "escrow" toont alleen items met die term (' + na.length + '/' + items.length + ') en verbergt secties zonder treffer');
      check(na.some((i) => /^\s*Escrow/.test(i.textContent)), naam + ': begrip "Escrow" blijft zichtbaar');
      check(melding.hidden, naam + ': bij treffers geen geen-treffer-melding');

      // Hoofdletter- en accentongevoelig.
      zoek('ESCROW');
      const hoofd = zichtbareItems();
      check(hoofd.length === na.length && hoofd.every((x, i) => x === na[i]), naam + ': "ESCROW" geeft dezelfde treffers als "escrow"');
      zoek('voor rente');
      const zonderAccent = zichtbareItems();
      check(zonderAccent.length > 0 && zonderAccent.some((i) => i.textContent.normalize('NFC').includes('vóór rente')) && consistent('voor rente'), naam + ': "voor rente" vindt de tekst "vóór rente" (accent genormaliseerd)');
      zoek('VÓÓR   Rente');
      const metAccent = zichtbareItems();
      check(metAccent.length === zonderAccent.length && metAccent.every((x, i) => x === zonderAccent[i]), naam + ': "VÓÓR   Rente" geeft dezelfde treffers (accent, hoofdletters, witruimte)');

      // Lege term toont alles.
      zoek('escrow'); zoek('');
      check(items.every(zichtbaar) && secties.every((s) => !s.hidden) && melding.hidden, naam + ': lege zoekterm maakt alles weer zichtbaar');
      zoek('   ');
      check(items.every(zichtbaar) && secties.every((s) => !s.hidden) && melding.hidden, naam + ': zoekterm met alleen spaties telt als leeg');

      // Geen treffer.
      zoek('qzxwvjk-geen-treffer');
      check(zichtbareItems().length === 0 && secties.every((s) => s.hidden), naam + ': geen treffer — alle items en secties verborgen');
      check(!melding.hidden && melding.textContent === MELDING, naam + ': geen treffer — melding "' + MELDING + '"');
      zoek('');
      check(melding.hidden && melding.textContent === '', naam + ': melding verdwijnt weer bij lege term');

      // XSS-invoer wordt nooit als HTML ingevoegd.
      const voor = log.aangemaakt;
      const xss = '<img src=x onerror="globalThis.__hbXss=1">';
      zoek(xss);
      check(log.innerHTML.length === 0 && log.aangemaakt === voor, naam + ': XSS-invoer — geen innerHTML-schrijving en geen nieuw element aangemaakt');
      check(melding.children.every((c) => c.tag === '#text') && melding.textContent === MELDING && !melding.textContent.includes('<img'), naam + ': XSS-invoer — melding is uitsluitend de vaste tekst (geen invoer echo)');
      check(typeof globalThis.__hbXss === 'undefined', naam + ': XSS-invoer — onerror nooit uitgevoerd');
      zoek('');
      return { doc, invoer, zoek, items, secties };
    }

    async function draaiHandleidingZoekChecks(root = process.cwd()) {
      const res = [];
      const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });

      // ── A. Syntax ──
      try {
        execFileSync(process.execPath, ['--check', path.join(root, 'mna/08-handleiding.js')], { stdio: 'pipe' });
        check(true, 'node --check mna/08-handleiding.js');
      } catch (e) {
        check(false, 'node --check mna/08-handleiding.js faalt: ' + String((e && e.stderr) || e));
      }
      try {
        new vm.Script(advScript(root), { filename: 'adv.html#inline' });
        check(true, 'adv.html: inline script syntactisch geldig');
      } catch (e) {
        check(false, 'adv.html: inline script ongeldig: ' + String((e && e.message) || e));
      }

      // ── B. mna/08: per rol ──
      for (const rol of ['verkoper', 'koper', 'begeleider']) {
        try {
          const g = laadMna(root, rol);
          const r = zoekChecks('mna/' + rol, g, check);
          if (!r) continue;
          const ids = r.secties.map((s) => s.attrs.id);
          check(ids.join(',') === 'hl-' + rol + ',hl-begrippen,hl-berekeningen', 'mna/' + rol + ': alleen eigen rolsectie + begrippen + berekeningen gerenderd (' + ids.join(',') + ')');
          if (rol === 'koper') {
            // Termen die alleen in de verkoper-/begeleidersectie voorkomen: ook na zoeken nooit zichtbaar.
            for (const q of ['verkopercode', 'tussenpersoonscode', 'Begeleider (binnen een traject)', 'Verkoper']) {
              r.zoek(q);
              const zicht = r.secties.filter((s) => !s.hidden).map((s) => s.attrs.id);
              check(!r.doc.elementen().some((e) => e.attrs.id === 'hl-verkoper' || e.attrs.id === 'hl-begeleider')
                && zicht.every((id) => id === 'hl-koper' || id === 'hl-begrippen' || id === 'hl-berekeningen'),
              'mna/koper: zoeken op "' + q + '" toont geen begeleider-/verkopersectie (zichtbaar: ' + (zicht.join(',') || 'geen') + ')');
            }
            r.zoek('');
          }
          check(/Met het zoekveld bovenaan filtert u de onderdelen op deze pagina/.test(g.html), 'mna/' + rol + ': voetnoot noemt het zoekveld');
          // Productpunt 31: "Leg mij dit uit" — elk onderwerp dat deze rol kan tegenkomen levert in de eigen
          // rolsectie minstens één treffer op (nooit een lege uitleg), en de voetnoot noemt de knop.
          const schermen = rol === 'begeleider' ? ['fase', 'begeleider'] : ['fase'];
          for (const sch of schermen) {
            const term = g.HB_UITLEG && g.HB_UITLEG[sch];
            r.zoek(term || '');
            const eigen = r.secties.find((s) => s.attrs.id === 'hl-' + rol);
            const treffers = eigen ? eigen.querySelectorAll('[data-hb-item]').filter((i) => !i.hidden).length : 0;
            check(!!term && treffers > 0, 'mna/' + rol + ': "Leg mij dit uit" op scherm ' + sch + ' (zoekterm "' + term + '") toont ' + treffers + ' uitleg in de eigen rolsectie');
          }
          r.zoek('');
          check(/Leg mij dit uit/.test(g.html), 'mna/' + rol + ': voetnoot noemt de knop "Leg mij dit uit"');
        } catch (e) {
          check(false, 'mna/' + rol + ': kon niet worden getest: ' + String((e && e.message) || e));
        }
      }

      // ── Productpunt 31: knophelper ──
      try {
        const g = laadMna(root, 'verkoper');
        const knop = g.legUitKnop('fase');
        check(/Leg mij dit uit/.test(knop) && /legMijDitUit\('fase'\)/.test(knop) && g.legUitKnop('onbekend<img>') === '', 'knop: vaste onderwerpen, onbekend scherm geeft geen knop en nooit ingevoegde invoer');
        const s06 = fs.readFileSync(path.join(root, 'mna/06-schermen.js'), 'utf8'), s04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
        const adv = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
        check(/legUitKnop\('fase'\)/.test(s06) && /legUitKnop\('begeleider'\)/.test(s04) && /legMijDitUitAdv\('traject'\)/.test(adv), 'knop staat op het fasescherm, het begeleidersdashboard en het adviseursdashboard');
      } catch (e) { check(false, 'knophelper: kon niet worden getest: ' + String((e && e.message) || e)); }

      // ── C. adv.html ──
      try {
        const g = laadAdv(root);
        const r = zoekChecks('adv', g, check);
        if (r) {
          check(r.secties.length === 6, 'adv: alle zes secties (adviseur, begeleider, verkoper, koper, begrippen, berekeningen) ongewijzigd gerenderd');
          r.zoek('tweestapsverificatie');
          check(!r.secties[0].hidden && r.secties.slice(1).some((s) => s.hidden), 'adv: zoeken op "tweestapsverificatie" toont de adviseurssectie en verbergt secties zonder treffer');
          r.zoek('');
        }
        check(/Met het zoekveld bovenaan filtert u de onderdelen op deze pagina/.test(g.html), 'adv: voetnoot noemt het zoekveld');
        if (r) {
          r.zoek('traject');
          const adviseur = r.secties[0];
          check(adviseur && adviseur.querySelectorAll('[data-hb-item]').some((i) => !i.hidden), 'adv: "Leg mij dit uit" op het dashboard (zoekterm "traject") toont uitleg in de adviseurssectie');
          r.zoek('');
        }
        check(/Leg mij dit uit/.test(g.html), 'adv: voetnoot noemt de knop "Leg mij dit uit"');
      } catch (e) {
        check(false, 'adv.html: kon niet worden getest: ' + String((e && e.message) || e));
      }
      return res;
    }

    const resultaten = await draaiHandleidingZoekChecks(ROOT);
    const gefaald = resultaten.filter(r => !r.ok);
    gefaald.forEach(r => warn('#31: ' + r.msg));
    if (!resultaten.length) warn('#31: geen checks uitgevoerd.');
    else if (!gefaald.length) ok('Alle ' + resultaten.length + ' handleiding-zoekchecks geslaagd (zoekveld, rolfilter, XSS-veilig, "Leg mij dit uit" met uitleg per rol).');
  } catch (e) {
    warn('#31 handleiding-zoekchecks konden niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
}

log('35. #91 F2 transactievorm: scenario-rekenkern, paneel (mna/13), laadvolgorde en veiligheid');
{
  // MASTER #91 F2 (28 okt 2026). Echte functies uit mna/03 en mna/13 in node:vm; geen netwerk, geen echte data.
  const fouten = [];
  const c = (ok, msg) => { if (!ok) fouten.push(msg); };
  try {
    const vm = (await import('vm')).default;
    const src03 = fs.readFileSync(path.join(ROOT, 'mna/03-rekenkern-waardering.js'), 'utf8');
    const src13 = fs.readFileSync(path.join(ROOT, 'mna/13-transactiemodel.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const fn = (bron, naam) => {
      const i = bron.indexOf('function ' + naam + '(');
      if (i < 0) throw new Error('functie ' + naam + ' niet gevonden');
      let d = 0, j = bron.indexOf('{', i);
      for (; j < bron.length; j++) { if (bron[j] === '{') d++; else if (bron[j] === '}') { d--; if (d === 0) break; } }
      return bron.slice(i, j + 1);
    };
    // (a) handmatig doorgerekend geval
    const ctx = vm.createContext({});
    vm.runInContext(fn(src03, 'dvBerekenTransactieScenario'), ctx);
    const S1 = { belang_pct: 80, direct_pct: 60, earn_out_pct: 20, vendor_loan_pct: 10, gespreid_pct: 10, behouden_belang_pct: 20 };
    const r = ctx.dvBerekenTransactieScenario(2000000, S1);
    const gelijk = (a, b) => Math.abs(a - b) < 0.005;
    c(gelijk(r.verkochtBelang, 1600000) && gelijk(r.direct, 960000) && gelijk(r.earnOut, 320000) && gelijk(r.vendorLoan, 160000)
      && gelijk(r.gespreid, 160000) && gelijk(r.behoudenBelangWaarde, 400000) && r.aandelenwaarde100 === 2000000 && !r.geenEquity && !r.equityNegatief,
      'handmatig geval 2.000.000 / 80 / 60-20-10-10 / 20 klopt niet: ' + JSON.stringify(r));
    const neg = ctx.dvBerekenTransactieScenario(-500000, S1);
    c(neg.equityNegatief === true && neg.verkochtBelang === 0 && neg.direct === 0 && neg.behoudenBelangWaarde === 0, 'negatieve aandelenwaarde: bedragen 0 met vlag');
    const nan = ctx.dvBerekenTransactieScenario(NaN, S1);
    c(nan.geenEquity === true && nan.verkochtBelang === null && nan.direct === null && nan.aandelenwaarde100 === null, 'NaN: alle bedragen null + geenEquity');
    // (b) laadvolgorde: 13 na 11 en vóór 06
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    c(pos('13-transactiemodel.js') > pos('11-groepsbeeld.js') && pos('11-groepsbeeld.js') > 0 && pos('13-transactiemodel.js') < pos('06-schermen.js'), 'laadvolgorde mna.html: 13 na 11 en vóór 06');
    c(/\+renderTransactiemodel\(f\.id\)/.test(src06), 'renderMain roept renderTransactiemodel(f.id) aan');
    // (c) koper / andere fase → lege string, geen verzoek
    let fetches = 0;
    const ctx13 = vm.createContext({
      S: { code: 'SYNTH1', rol: 'koper', screen: 'main', fase: 0 }, FASES: [{ id: 'strategisch', dataFields: [] }],
      isVerkoper: () => ctx13.S.rol === 'verkoper', isTussen: () => ctx13.S.rol === 'tussenpersoon',
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, WORKER: 'https://worker.test', setTimeout: (f) => f(),
      renderApp: () => {}, ge: () => null, window: {},
    });
    vm.runInContext(src13, ctx13);
    c(ctx13.renderTransactiemodel('strategisch') === '' && fetches === 0, 'koper: lege string en geen verzoek');
    ctx13.S.rol = 'verkoper';
    c(ctx13.renderTransactiemodel('financieel') === '' && fetches === 0, 'verkoper in andere fase: lege string en geen verzoek');
    const h = ctx13.renderTransactiemodel('strategisch');
    c(/tm-panel/.test(h) && fetches === 1, 'verkoper in Strategisch: paneel + precies één laadverzoek');
    // (d) geen kale fetch( in mna/13
    c(!/(^|[^A-Za-z.])fetch\(/.test(src13.replace(/fetchMetTimeout\(/g, '')), 'mna/13 gebruikt alleen fetchMetTimeout');
    // (e) XSS: invoer van de server wordt geëscapet
    ctx13.TM.status = 'ok';
    ctx13.TM.data = { versie: 1, verkoper: { structuur: 'share', omvang: 'volledig', betaling: ['direct'], advies: 'bekend', toelichting: '<img src=x onerror=alert(1)>' }, adviseur: null, scenarios: [{ naam: '<script>x</script>', structuur: 'share' }] };
    ctx13.TM.v = ctx13.tmKopieDeel(ctx13.TM.data.verkoper); ctx13.TM.a = ctx13.tmKopieDeel(null); ctx13.TM.scen = ctx13.TM.data.scenarios;
    ctx13.TM.scope = ctx13.tmScopeKey();
    const hv = ctx13.renderTransactiemodel('strategisch');
    c(!/<img src=x/.test(hv) && /&lt;img src=x/.test(hv), 'verkoper: toelichting geëscapet');
    ctx13.S.rol = 'tussenpersoon'; ctx13.TM.scope = ctx13.tmScopeKey(); ctx13.TM.status = 'ok';
    const hb = ctx13.renderTransactiemodel('strategisch');
    c(!/<script>x<\/script>/.test(hb) && !/<img src=x/.test(hb) && /Oorspronkelijke voorkeur verkoper/.test(hb), 'begeleider: scenarionaam en verkopersvoorkeur geëscapet, voorkeur gelabeld');
    // validatie vóór opslaan
    c(ctx13.tmControleerScenarios([{ naam: 'A', structuur: 'share', belang_pct: 80, direct_pct: 50, earn_out_pct: 20, earn_out_jaren: 3, vendor_loan_pct: 10, vendor_loan_rente_pct: 5, vendor_loan_jaren: 5, gespreid_pct: 10, gespreid_jaren: 2, behouden_belang_pct: 20 }]) !== null, 'scenario met som 90 wordt geweigerd');
    c(ctx13.tmControleerScenarios([{ naam: 'A', structuur: 'share', belang_pct: 80, direct_pct: 60, earn_out_pct: 20, earn_out_jaren: 3, vendor_loan_pct: 10, vendor_loan_rente_pct: 5, vendor_loan_jaren: 5, gespreid_pct: 10, gespreid_jaren: 2, behouden_belang_pct: 30 }]) !== null, 'belang + behouden > 100 wordt geweigerd');
    c(ctx13.tmControleerScenarios([{ naam: 'A', structuur: 'share', belang_pct: 80, direct_pct: 60, earn_out_pct: 20, earn_out_jaren: 3, vendor_loan_pct: 10, vendor_loan_rente_pct: 5, vendor_loan_jaren: 5, gespreid_pct: 10, gespreid_jaren: 2, behouden_belang_pct: 20 }]) === null, 'geldig scenario geaccepteerd');
    // (f) bestaande opbrengst-brug onveranderd + tabel alleen met scenario's
    const ctxB = vm.createContext({});
    vm.runInContext(fn(src03, 'dvBerekenOpbrengstBrug'), ctxB);
    const b = ctxB.dvBerekenOpbrengstBrug({ nettoSchuld: 300000, debtLike: 0, debtLikeItems: 50000, werkkapitaalCorrectie: 0, transactiekostenPct: 2, belangPct: 100, escrowPct: 10, escrowMaanden: 12, earnOutAan: false }, { evBasis: 3000000 });
    c(gelijk(b.equityValue100, 2590000) && gelijk(b.verkochtBelangWaarde, 2590000) && gelijk(b.cashBijClosing, 2331000), 'dvBerekenOpbrengstBrug ongewijzigd (3.000.000 − 300.000 − 50.000 − 60.000 = 2.590.000; cash 2.331.000)');
    const ctxT = vm.createContext({ dvMln: (n) => (n / 1e6).toFixed(2), dvPct: (n) => n + '%', dvRenderTabelHtml: (k, rows) => JSON.stringify(rows), esc: (x) => x });
    vm.runInContext(fn(src03, 'dvBerekenTransactieScenario') + '\nvar DV_TM_STRUCTUUR={share:"aandelentransactie"};\n' + fn(src03, 'dvTabelTransactieScenarios'), ctxT);
    c(ctxT.dvTabelTransactieScenarios(null, b) === '' && ctxT.dvTabelTransactieScenarios({ scenarios: [] }, b) === '', 'zonder scenario\'s geen tabel');
    c(/"0\.96"/.test(ctxT.dvTabelTransactieScenarios({ scenarios: [Object.assign({ naam: 'A', structuur: 'share' }, S1)] }, { ev: 3000000, equityValue100: 2000000 })), 'tabel toont doorgerekende scenariobedragen');
    c(/dvTabelOpbrengstBrug\(opbrengstBrug\)\+dvTabelTransactieScenarios\(tmModel,opbrengstBrug\)/.test(src04), 'dealvoorstel voegt de scenariotabel toe onder de opbrengst-brug');
  } catch (e) {
    fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e));
  }
  if (fouten.length) fouten.forEach((f) => warn('#91 F2: ' + f));
  else ok('#91 F2: rekenkern (handmatig geval, negatief, NaN), laadvolgorde, rol/fase-afscherming, alleen fetchMetTimeout, escaping, validatie en ongewijzigde opbrengst-brug');
}

log('36. #91 F4 informatiememorandum: printopmaak (voorblad, inhoudsopgave, disclaimer) en geen NDA-venster vóór het concept');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src05 = fs.readFileSync(path.join(ROOT, 'mna/05-documentflow-partijen.js'), 'utf8');
    const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const i = src05.indexOf('function printDocNaAkkoord(');
    let d = 0, j = src05.indexOf('{', i);
    for (; j < src05.length; j++) { if (src05[j] === '{') d++; else if (src05[j] === '}') { d--; if (d === 0) break; } }
    let html = '';
    const ctx = vm.createContext({
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      S: { traject: { kantoor_naam: 'Synth <i>IM</i> BV' } }, BRAND: { bedrijfKort: 'X', adres: 'Y' }, printHtmlDocument: (h) => { html = h; },
    });
    vm.runInContext(src05.slice(i, j + 1), ctx);
    const tekst = '## Managementsamenvatting\nA\n\n## Klanten\nB';
    ctx.printDocNaAkkoord(tekst, 'Verkoopmemorandum', 'memo');
    const memo = html;
    ctx.printDocNaAkkoord(tekst, 'NDA', 'nda');
    const nda = html;
    if (!/class="im-voorblad"/.test(memo) || !/Informatiememorandum/.test(memo) || !memo.includes('Synth &lt;i&gt;IM&lt;/i&gt; BV')) fouten.push('voorblad met geëscapete naam ontbreekt');
    if (!/<li>Managementsamenvatting<\/li><li>Klanten<\/li><\/ul>/.test(memo)) fouten.push('inhoudsopgave uit ##-koppen ontbreekt');
    if (!(memo.indexOf('class="im-voorblad"') < memo.indexOf('class="im-disclaimer"') && memo.indexOf('class="im-disclaimer"') < memo.indexOf('class="im-toc"'))) fouten.push('disclaimer niet VOORIN (fase E: na voorblad, vóór inhoud)');
    if (!/class="im-disclaimer"/.test(memo) || !/geen rechten worden ontleend/.test(memo)) fouten.push('disclaimer ontbreekt');
    if (!/counter\(page\)/.test(memo)) fouten.push('paginanummering ontbreekt');
    if (/im-voorblad|im-disclaimer/.test(nda)) fouten.push('andere documenttypes krijgen ten onrechte IM-opmaak');
    const be36 = path.join(ROOT, '..', 'koersvoormorgen-backend', 'backend', 'worker', '36-pdf-renderer.js');
    if (fs.existsSync(be36)) {
      const m = fs.readFileSync(be36, 'utf8').match(/VM_DISCLAIMER_CONCEPT = ([\s\S]*?);\n/);
      const f = src05.match(/VM_DISCLAIMER_CONCEPT = ([\s\S]*?);\n/);
      if (!m || !f || m[1].replace(/\s+/g, ' ') !== f[1].replace(/\s+/g, ' ')) fouten.push('disclaimertekst frontend wijkt af van backend (worker/36)');
    }
    if (/toonNdaBevestiging|verkoopmemo-nda-door/.test(src04)) fouten.push('NDA-bevestigingsvenster vóór het concept staat nog in mna/04');
    if (/verkoopmemo-nda-chk|nda_bevestigd_door:t2/.test(src04) || !/verkoopmemo-email-btn" style="background:#8a5a00"'\+\(t2\.nda_getekend\?'':' disabled'\)/.test(src04)) fouten.push('versturen zonder ondertekende NDA moet uitgeschakeld zijn, zonder handmatige bevestiging (besluit 28-10)');
    if (!/internOntbrekend/.test(src04)) fouten.push('interne lijst weggelaten onderdelen ontbreekt in mna/04');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 F4: ' + f)); else ok('#91 F4: IM-print met voorblad, inhoudsopgave, paginanummering en disclaimer (gelijk aan backend), andere documenten ongewijzigd, concept zonder NDA-venster, interne ontbrekend-lijst');
}

log('37. #91 F5 verkopersreview: paneel verkoper (mna/14), begeleidersectie, laadvolgorde en veiligheid');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src14 = fs.readFileSync(path.join(ROOT, 'mna/14-im-review.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('14-im-review.js') > pos('13-transactiemodel.js') && pos('14-im-review.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde: 14 na 13 en vóór 06');
    if (!/\+renderImReviewVerkoper\(\)/.test(src06)) fouten.push('renderMain roept renderImReviewVerkoper() niet aan');
    if (!/id="imr-bg"/.test(src04) || !/imrBgLaad\(\)/.test(src04)) fouten.push('begeleidersectie ontbreekt in het verkoopmemorandum-venster');
    if (/(^|[^A-Za-z.])fetch\(/.test(src14.replace(/fetchMetTimeout\(/g, ''))) fouten.push('mna/14 gebruikt een kale fetch(');
    let fetches = 0;
    const els = {};
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0 }, FASES: [{ id: 'financieel', dataFields: [] }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(),
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: (id) => els[id] || null, window: {} });
    vm.runInContext(src14, ctx);
    if (ctx.renderImReviewVerkoper() !== '' || fetches !== 0) fouten.push('koper: paneel of verzoek');
    ctx.S.rol = 'verkoper';
    ctx.renderImReviewVerkoper();
    if (fetches !== 1) fouten.push('verkoper: precies één laadverzoek verwacht');
    ctx.IMR.status = 'ok';
    ctx.IMR.data = { ok: true, rol: 'verkoper', status: 'CONCEPT', versie_no: 0, rev: 0, opmerkingen: [] };
    if (ctx.renderImReviewVerkoper() !== '') fouten.push('verkoper ziet een concept dat nog niet gedeeld is');
    ctx.IMR.data = { ok: true, rol: 'verkoper', status: 'TER_GOEDKEURING_VERKOPER', versie_no: 2, rev: 5, gedeelde_sha256: 'a'.repeat(64),
      gedeelde_tekst: '## Klanten <img src=x onerror=alert(1)>\nTekst <script>x</script>', opmerkingen: [{ id: 'IMO1', versie_no: 2, onderdeel: 'Klanten <img src=x onerror=alert(1)>', soort: 'tekst', tekst: '<b>opm</b>', status: 'info_gevraagd', motivering: 'Welke? <i>x</i>' }] };
    const h = ctx.renderImReviewVerkoper();
    if (/<img src=x|<script>x|<b>opm<\/b>|<i>x<\/i>/.test(h)) fouten.push('verkoperpaneel escapet servertekst niet');
    if (!/Ik ga akkoord met deze versie/.test(h)) fouten.push('akkoordknop ontbreekt bij TER_GOEDKEURING');
    if (!/imr-reactie-IMO1/.test(h)) fouten.push('reactieveld bij info_gevraagd ontbreekt');
    const d = ctx.imrOnderdelen('Intro\n## A\nx\n## B\ny');
    if (JSON.stringify(d.map((o) => o.kop)) !== '["Algemeen","A","B"]') fouten.push('onderdelen uit ##-koppen onjuist: ' + JSON.stringify(d.map((o) => o.kop)));
    ctx.S.rol = 'tussenpersoon'; ctx.IMR.scope = ctx.imrScopeKey(); ctx.IMR.status = 'ok';
    ctx.IMR.data.status = 'OPMERKINGEN_ONTVANGEN';
    els['imr-bg'] = { innerHTML: '' };
    ctx.imrBgTeken();
    if (!/imr-beoordeel-IMO1/.test(els['imr-bg'].innerHTML) || /<b>opm<\/b>/.test(els['imr-bg'].innerHTML)) fouten.push('begeleidersectie: beoordeling ontbreekt of escaping faalt');
    if (!/disabled/.test(els['imr-bg'].innerHTML.split('Ter goedkeuring aanbieden')[0].slice(-120))) fouten.push('ter goedkeuring niet geblokkeerd bij open opmerking');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 F5: ' + f)); else ok('#91 F5: verkoperpaneel alleen na delen, escaping, akkoord/reactie, onderdelen uit koppen, begeleidersectie met beoordeling, ter goedkeuring geblokkeerd bij open opmerkingen, laadvolgorde, alleen fetchMetTimeout');
}

log('38. #91 F3 kolommenbalans: paneel (mna/15), laadvolgorde, escaping en geen invoer in event-handlers');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src15 = fs.readFileSync(path.join(ROOT, 'mna/15-kolommenbalans.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('15-kolommenbalans.js') > pos('14-im-review.js') && pos('15-kolommenbalans.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde: 15 na 14 en vóór 06');
    if (!/\+renderKolommenbalans\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderKolommenbalans(f.id) niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src15.replace(/fetchMetTimeout\(/g, ''))) fouten.push('mna/15 gebruikt een kale fetch(');
    let fetches = 0;
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0 }, FASES: [{ id: 'financieel', dataFields: [] }, { id: 'it' }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(),
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {}, Date });
    vm.runInContext(src15, ctx);
    if (ctx.renderKolommenbalans('financieel') !== '' || fetches) fouten.push('koper ziet paneel of doet verzoek');
    ctx.S.rol = 'tussenpersoon';
    if (ctx.renderKolommenbalans('it') !== '' ) fouten.push('paneel buiten fase Financieel');
    ctx.renderKolommenbalans('financieel');
    if (fetches !== 1) fouten.push('begeleider: precies één laadverzoek verwacht');
    ctx.KB.status = 'ok';
    const kwaad = "x'\"><img src=x onerror=alert(1)>";
    ctx.KB.data = { ok: true, categorieen: { omzet: 'Netto-omzet' }, jaren: [{ jaar: 2024, rev: 3, status: 'controle', bron_naam: '<b>k.csv</b>', redenen: ['1 rekening(en) nog handmatig toe te wijzen.'],
      exploitatie: { omzet: 500000, ebitda: 134000 }, werkkapitaal: 33000, netto_schuld: 8500, rekeningen: [{ rekening: kwaad, omschrijving: '<script>x</script>', saldo: 100, categorie: 'onbekend', bron: 'auto' }] }] };
    const h = ctx.renderKolommenbalans('financieel');
    if (/<img src=x|<script>x|<b>k\.csv/.test(h)) fouten.push('servertekst niet geëscapet');
    if (/onchange="[^"]*img/.test(h) || /onchange="[^"]*x'/.test(h)) fouten.push('rekeningnummer staat in een event-handler');
    if (!/data-rek="x&#39;&quot;&gt;&lt;img/.test(h)) fouten.push('rekeningnummer niet veilig als data-attribuut');
    if (!/€ 134\.000/.test(h) || !/Te controleren/.test(h)) fouten.push('exploitatie of status niet zichtbaar');
    ctx.S.rol = 'verkoper'; ctx.KB.scope = null; ctx.kbSync(); ctx.KB.status = 'ok'; ctx.KB.data = { ok: true, categorieen: {}, jaren: [] };
    if (/<select data-rek/.test(ctx.renderKolommenbalans('financieel'))) fouten.push('verkoper krijgt toewijskeuzes');
    // Fase A-correcties (28 okt 2026)
    if (ctx.kbGeld(-2500) !== '-€ 2.500' || ctx.kbGeld(2500) !== '€ 2.500' || ctx.kbGeld(-0.4) !== '€ 0') fouten.push('notatie bedragen: verwacht -€ 2.500 / € 2.500, kreeg ' + ctx.kbGeld(-2500));
    ctx.window.kbKiesJaar('2021');
    if (!/<option value="2021" selected>/.test(ctx.renderKolommenbalans('financieel'))) fouten.push('gekozen boekjaar blijft niet behouden na hertekenen');
    const src06b = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    if (!/if\(isTussen\(\)\) fetch\(WORKER\+'\/mna\/gesprek\/concept\/'\+S\.code\)/.test(src06b) || /\n\s*fetch\(WORKER\+'\/mna\/gesprek\/concept\/'\+S\.code\)/.test(src06b)) fouten.push('N-148: gespreksconcept wordt niet alleen voor de begeleider opgehaald');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 F3: ' + f)); else ok('#91 F3: paneel alleen in Financieel voor verkoper/begeleider, escaping, rekeningnummer niet in event-handler, toewijzen alleen begeleider, laadvolgorde, alleen fetchMetTimeout');
}

log('39. #91 fase B normalisaties/prognose: paneel (mna/16), dealvoorstel-keuze, escaping en rollen');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src16 = fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('16-financieel.js') > pos('15-kolommenbalans.js') && pos('16-financieel.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 16');
    if (!/\+renderFinancieleAnalyse\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderFinancieleAnalyse niet aan');
    if (!/id="dv-fin-hint"/.test(src04) || !/finDealvoorstelHint\(document\.getElementById\('dv-fin-hint'\)\)/.test(src04)) fouten.push('dealvoorstel-keuze ontbreekt');
    if (/(^|[^A-Za-z.])fetch\(/.test(src16.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/16');
    let fetches = 0;
    const els = {};
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'financieel', dataFields: [] }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(),
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: (id) => els[id] || null, window: {}, document: { querySelectorAll: () => [] } });
    vm.runInContext(src16, ctx);
    if (ctx.renderFinancieleAnalyse('financieel') !== '' || fetches) fouten.push('koper ziet paneel');
    ctx.S.rol = 'tussenpersoon'; ctx.renderFinancieleAnalyse('financieel');
    if (fetches !== 1) fouten.push('één laadverzoek verwacht');
    const k = '<img src=x onerror=alert(1)>';
    ctx.FIN.status = 'ok';
    ctx.FIN.data = { ok: true, jaren: [{ jaar: 2024, gerapporteerd: { ebitda: 124000 }, genormaliseerd: { omzet: 500000, ebitda: 104000 }, normalisatie_totaal: -20000, kpi: { brutomarge_pct: 100, ebitda_marge_pct: 20.8, omzetgroei_pct: null, omzet_per_fte: 125000, ebitda_per_fte: 26000 } }],
      normalisaties: [{ id: 'NM1', jaar: 2024, post: 'personeel', soort: 'partnerbeloning', bedrag: -30000, omschrijving: k, bron: k, motivering: k, karakter: 'structureel', zekerheid: 'midden', risico: '', kvm_advies: '', beoordeling: '', herkomst: 'verkoper', status: 'voorstel', rev: 1 }],
      prognose: { status: 'concept', aannames: [], fte: {}, rev: 1, jaren: [{ jaar: 2025, exploitatie: { omzet: 525000, ebitda: 117780 }, kpi: { brutomarge_pct: 100, ebitda_marge_pct: 22.43 } }] } };
    const h = ctx.renderFinancieleAnalyse('financieel');
    if (/<img src=x/.test(h)) fouten.push('servertekst niet geëscapet');
    if (!/€ 104\.000/.test(h) || !/-€ 30\.000/.test(h) || !/20,8%/.test(h) || !/2025 \(prognose, concept\)/.test(h)) fouten.push('aansluiting, notatie of prognoselabel ontbreekt');
    if (!/finBeoordeel\(this\)/.test(h) || !/Prognose goedkeuren/.test(h)) fouten.push('begeleider mist beoordelen of goedkeuren');
    ctx.S.rol = 'verkoper'; ctx.FIN.scope = ctx.finScope();
    const hv = ctx.renderFinancieleAnalyse('financieel');
    if (/finBeoordeel|Prognose goedkeuren|Voorstellen van KVM/.test(hv) || !/Normalisatie voorstellen/.test(hv)) fouten.push('verkoper: verkeerde rechten in de UI');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 fase B: ' + f)); else ok('#91 fase B: paneel met aansluiting, KPI en prognoselabel, escaping, rolrechten (verkoper alleen voorstellen), dealvoorstel-keuze, laadvolgorde, alleen fetchMetTimeout');
}

log('40. #91 fase C klantenanalyse: paneel (mna/17), escaping, rollen en laadvolgorde');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src16 = fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8');
    const src17 = fs.readFileSync(path.join(ROOT, 'mna/17-klantanalyse.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('17-klantanalyse.js') > pos('16-financieel.js') && pos('17-klantanalyse.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 17');
    if (!/\+renderKlantanalyse\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderKlantanalyse niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src17.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/17');
    for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Verdienmodel, klanten en tarieven/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
    let fetches = 0;
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'commercieel', dataFields: [] }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(),
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {}, document: { querySelectorAll: () => [] } });
    vm.runInContext(src16 + '\n' + src17, ctx);
    if (ctx.renderKlantanalyse('commercieel') !== '' || fetches) fouten.push('koper ziet paneel');
    if (ctx.renderKlantanalyse('financieel') !== '') fouten.push('paneel buiten fase Commercieel');
    ctx.S.rol = 'tussenpersoon'; ctx.renderKlantanalyse('commercieel');
    if (fetches !== 1) fouten.push('één laadverzoek verwacht');
    const k = '<img src=x onerror=alert(1)>';
    ctx.KA.status = 'ok';
    ctx.KA.data = { ok: true, rev: 1, bron: { naam: k, regels: 7, dubbel: 1 }, verdienmodel: { model: 'abonnement', facturatie: 'maandelijks', toelichting: k },
      jaren: [{ jaar: 2024, omzet: 61500, relaties: 5, facturen: 6, gemiddeld_per_relatie: 12300, concentratie: { top1_pct: 48.78, top5_pct: 100, top10_pct: 100 },
        top10: [{ rang: 1, naam: k, branche: k, omzet: 30000, aandeel_pct: 48.78, relatie_jaren: 15 }], omzetklassen: [{ label: '> € 25.000', aantal: 1, omzet: 30000, aandeel_pct: 48.78 }],
        relatieleeftijd: { klassen: [{ label: '≥ 10 jaar', aantal: 1, aandeel_pct: 48.78 }], gewogen_gemiddeld_jaren: 7.5 }, branches: [{ naam: k, omzet: 30000, aandeel_pct: 48.78 }],
        werksoorten: [{ naam: k, omzet: 26000, aandeel_pct: 42.28, uren: 210, gerealiseerd_uurtarief: 123.81, standaard_uurtarief: 125, realisatie_pct: 99.05 }],
        aansluiting: { status: 'afwijking', verschil: -438500, verschil_pct: -87.7 } }],
      werkkapitaal: [{ jaar: 2024, debiteuren: 60000, debiteurendagen: 44, onderhanden_werk: 15000, ohw_dagen: 11, werkkapitaal: 33000, werkkapitaal_pct_omzet: 6.6 }] };
    const h = ctx.renderKlantanalyse('commercieel');
    if (/<img src=x/.test(h)) fouten.push('servertekst niet geëscapet');
    if (!/€ 61\.500/.test(h) || !/48,78%/.test(h) || !/99,05%/.test(h) || !/wijkt af van de kolommenbalans: -€ 438\.500/.test(h) || !/>44</.test(h)) fouten.push('cijfers, notatie of aansluiting ontbreekt');
    if (!/kaVerwijder\(\)/.test(h)) fouten.push('begeleider mist verwijderen');
    ctx.S.rol = 'verkoper'; ctx.KA.scope = ctx.finScope();
    ctx.KA.status = 'ok'; ctx.KA.data = { ok: true, rev: 1, bron: { naam: 'f.csv', regels: 1, dubbel: 0 }, verdienmodel: {}, jaren: [], werkkapitaal: [] };
    const hv = ctx.renderKlantanalyse('commercieel');
    if (/kaVerwijder/.test(hv) || !/kaUpload\(\)/.test(hv)) fouten.push('verkoper: verkeerde rechten in de UI');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 fase C: ' + f)); else ok('#91 fase C: paneel met klantenanalyse, werksoort/tarieven en werkkapitaal, escaping, rolrechten (verkoper geen verwijderen), alleen fase Commercieel, handleiding, laadvolgorde, alleen fetchMetTimeout');
}

log('41. #91 fase D personeel/huisvesting/IT: paneel (mna/18), escaping, rollen, fasen en laadvolgorde');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src = ['mna/16-financieel.js', 'mna/17-klantanalyse.js', 'mna/18-organisatie.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const src18 = fs.readFileSync(path.join(ROOT, 'mna/18-organisatie.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
    const src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('18-organisatie.js') > pos('17-klantanalyse.js') && pos('18-organisatie.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 18');
    if (!/\+renderOrganisatie\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderOrganisatie niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src18.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/18');
    for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Personeel, huisvesting en IT/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
    let fetches = 0;
    const k = '<img src=x onerror=alert(1)>';
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'partner', dataFields: [] }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(), DOCS: { juridisch: [{ id: "D1'\"><x", naam: k }] },
      fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {}, document: { querySelectorAll: () => [] } });
    vm.runInContext(src, ctx);
    if (ctx.renderOrganisatie('partner') !== '' || fetches) fouten.push('koper ziet paneel');
    if (ctx.renderOrganisatie('financieel') !== '' || ctx.renderOrganisatie('commercieel') !== '') fouten.push('paneel in verkeerde fase');
    ctx.S.rol = 'tussenpersoon'; ctx.renderOrganisatie('partner');
    if (fetches !== 1) fouten.push('één laadverzoek verwacht');
    const data = { ok: true, rev: 1, personeel_bron: k, personeel: { peiljaar: 2024, aantal: 6, fte: 5.4, partners: { aantal: 2, fte: 2 }, gem_leeftijd: 45.33, gem_dienstjaren: 11, zestig_plus: 1, loonkosten: { totaal: 418000, per_fte: 77407 },
      functiegroepen: [{ functie: k, aantal: 3, fte: 2.8, gem_dienstjaren: 4.5, loonkosten_per_fte: 56429 }], leeftijdsklassen: [], dienstjarenklassen: [], contracten: [], kwalificaties: [] },
      locaties: [{ plaats: k, eigendom: 'huur', m2: 400, document_ids: [], documenten: [{ id: 'D1', bestand_naam: k, foto: true }] }], huisvesting: { locaties: 1, m2: 400, werkplekken: 20, huur_per_jaar: 60000, huur_aflopend_24mnd: 1, huur_zonder_einddatum: 0 },
      it: [{ naam: k, categorie: 'boekhouding', hosting: 'cloud', overdraagbaar: 'nee' }], it_analyse: { systemen: 1, kosten_per_jaar: 25000, kosten_pct_omzet: 5, cloud: 1, niet_overdraagbaar: 1, overdraagbaar_onbekend: 0, contract_aflopend_12mnd: 0 } };
    ctx.ORG.status = 'ok'; ctx.ORG.data = data; ctx.ORG.locs = JSON.parse(JSON.stringify(data.locaties)); ctx.ORG.it = JSON.parse(JSON.stringify(data.it));
    const hp = ctx.renderOrganisatie('partner'), hh = (ctx.FASES[0].id = 'juridisch', ctx.ORG.scope = ctx.finScope(), ctx.ORG.status = 'ok', ctx.ORG.data = data, ctx.ORG.locs = JSON.parse(JSON.stringify(data.locaties)), ctx.ORG.it = JSON.parse(JSON.stringify(data.it)), ctx.renderOrganisatie('juridisch')), hi = ctx.renderOrganisatie('it');
    if ([hp, hh, hi].some((h) => /<img src=x|"><x/.test(h))) fouten.push('servertekst of document-id niet geëscapet');
    if (!/€ 418\.000/.test(hp) || !/€ 56\.429/.test(hp) || !/orgVerwijderPersoneel\(\)/.test(hp)) fouten.push('personeel: cijfers of verwijderknop begeleider ontbreekt');
    if (!/1 huurcontract\(en\) lopen binnen 24 maanden af/.test(hh) || !/data-id="D1&#39;&quot;&gt;&lt;x"/.test(hh) || !/orgBewaar\('locs'\)/.test(hh)) fouten.push('huisvesting: markering, documentkoppeling of opslaan ontbreekt');
    if (!/5%/.test(hi) || !/1 licentie\(s\) niet overdraagbaar/.test(hi) || !/orgBewaar\('it'\)/.test(hi)) fouten.push('IT: kosten-% of markering ontbreekt');
    ctx.S.rol = 'verkoper'; ctx.FASES[0].id = 'partner'; ctx.ORG.scope = ctx.finScope(); ctx.ORG.status = 'ok'; ctx.ORG.data = data; ctx.ORG.locs = []; ctx.ORG.it = [];
    const hv = ctx.renderOrganisatie('partner');
    if (/orgVerwijderPersoneel/.test(hv) || !/orgUploadPersoneel\(\)/.test(hv)) fouten.push('verkoper: verkeerde rechten in de UI');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 fase D: ' + f)); else ok('#91 fase D: panelen personeel/huisvesting/IT in de juiste fasen, escaping (ook document-id), rolrechten, markeringen, handleiding, laadvolgorde, alleen fetchMetTimeout');
}

log('42. #91 fase E / #96: IM-venster (PDF zoals de koper hem ontvangt, kerngegevens vernieuwen, foutdetail), handleiding');
{
  const fouten = [];
  const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  if (!/id="verkoopmemo-pdf-btn"/.test(src04) || !/\/mna\/verkoopmemorandum\/pdf\?code='\+encodeURIComponent\(S\.code\)/.test(src04)) fouten.push('PDF-knop of route ontbreekt');
  if (!/id="verkoopmemo-kern-btn"/.test(src04) || !/\/mna\/verkoopmemorandum\/kerngegevens'/.test(src04) || !/\(def\?'':'<button class="btn-ghost btn-sm" id="verkoopmemo-kern-btn"/.test(src04)) fouten.push('kerngegevens vernieuwen ontbreekt of staat ook bij definitief');
  const m = /function vmFeitDetail\(j\)\{[\s\S]*?\n    \}/.exec(src04);
  if (!m) fouten.push('vmFeitDetail ontbreekt in de IM-closure');
  else {
    const f = new Function('esc', m[0] + '; return vmFeitDetail;')((x) => String(x).replace(/</g, '&lt;'));
    const d = f({ code: 'FEITCONTROLE_AFWIJKING', afwijkingen: [{ fragment: '<b>€ 1.000' }] });
    if (!/&lt;b>€ 1\.000/.test(d) || /<b>/.test(d)) fouten.push('afwijkingen niet geëscapet getoond');
    if (!/Betreft: Financiële kerncijfers/.test(f({ code: 'FEITEN_VEROUDERD', koppen: ['Financiële kerncijfers'] }))) fouten.push('verouderde koppen niet getoond');
  }
  for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Feiten uit de bron, opmaak naar keuze/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
  if (fouten.length) fouten.forEach((f) => warn('#91 fase E: ' + f)); else ok('#91 fase E / #96: PDF-voorbeeld, kerngegevens vernieuwen (niet bij definitief), geëscapete foutdetails, handleiding mna/adv');
}

log('43. #91 fase F: transactiedoel in het transactiemodel-paneel (mna/13) en handleiding');
{
  const fouten = [];
  const src13 = fs.readFileSync(path.join(ROOT, 'mna/13-transactiemodel.js'), 'utf8');
  if (!/var TM_DOEL = \[\['verkoop', [^\]]*\], \['fusie', [^\]]*\], \['gedeeltelijk', [^\]]*\], \['onbekend', [^\]]*\]\];/.test(src13)) fouten.push('keuzelijst doel ontbreekt of wijkt af van de backend');
  if (!/kop\('Doel van het traject'\) \+ radio\('doel', TM_DOEL\)/.test(src13) || !/if \(d\.doel\) b\.doel = d\.doel;/.test(src13) || !/doel: '', structuur: ''/.test(src13)) fouten.push('doel niet in formulier, opslag of lege staat');
  for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Leg eerst het doel van het traject vast/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
  if (fouten.length) fouten.forEach((f) => warn('#91 fase F: ' + f)); else ok('#91 fase F: transactiedoel in formulier, opslag en samenvatting; handleiding mna/adv');
}

log('44. N-151: vrijgave-melding en handleiding over geldige NDA (mna/04, mna/08, adv.html)');
{
  const fouten = [];
  const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  if (!/Er is nog geen geldig ondertekende NDA van de koper\./.test(src04) || /Koper krijgt toegang zonder geheimhoudingsovereenkomst/.test(src04)) fouten.push('vrijgave-melding beschrijft nog toegang zonder NDA');
  for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Een alleen ingevulde naam is niet genoeg|een alleen ingevulde naam is niet genoeg/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
  if (fouten.length) fouten.forEach((f) => warn('N-151: ' + f)); else ok('N-151: vrijgave-melding en handleidingen beschrijven de geldige-NDA-voorwaarde');
}

log('45. #91 fase E v4: redactionele waarschuwingen in het IM-venster (mna/04), geëscapet');
{
  const fouten = [];
  const src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  if (!/redactie=Array\.isArray\(r\.redactie_waarschuwingen\)\?r\.redactie_waarschuwingen:null/.test(src04)) fouten.push('waarschuwingen uit de generatie niet overgenomen');
  if (!/'Letterlijk overgenomen veldwaarde \('\+esc\(w\.woord\|\|''\)\+'\): '/.test(src04) || !/esc\(\(w&&w\.zin\)\|\|''\)/.test(src04)) fouten.push('waarschuwingen niet (geëscapet) getoond');
  if (fouten.length) fouten.forEach((f) => warn('#91 E v4: ' + f)); else ok('#91 E v4: redactionele waarschuwingen na generatie zichtbaar voor de begeleider, geëscapet, geen blokkade');
}

log('46. #91 fase E v4b: beeldpaneel (mna/19), rollen, escaping, privé bestanden, laadvolgorde, handleiding');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src = ['mna/16-financieel.js', 'mna/19-im-beeld.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const src19 = fs.readFileSync(path.join(ROOT, 'mna/19-im-beeld.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8'), src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('19-im-beeld.js') > pos('18-organisatie.js') && pos('19-im-beeld.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 19');
    if (!/\+renderImBeeld\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderImBeeld niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src19.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/19');
    if (!/\/mna\/im-beeld\/bestand\?code=/.test(src19) || /https?:\/\//.test(src19)) fouten.push('miniaturen niet via de geauthenticeerde route of externe URL');
    for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Beeldmateriaal in het informatiememorandum/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
    let fetches = 0;
    const k = '<img src=x onerror=alert(1)>';
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'strategisch', dataFields: [] }], WORKER: 'https://w.test', URL: { createObjectURL: () => 'blob:x' },
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(), fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {}, document: { querySelectorAll: () => [] } });
    vm.runInContext(src, ctx);
    if (ctx.renderImBeeld('strategisch') !== '' || fetches) fouten.push('koper ziet beeldpaneel');
    ctx.S.rol = 'tussenpersoon'; ctx.renderImBeeld('strategisch');
    const b = { id: "IB1\"><x", categorie: 'pand', herkomst: 'sfeer', bijschrift: k, bron: k, licentie: 'CC0', naamsvermelding: k, volgorde: 0, im_toegestaan: true, cover: false, focus_x: 40, focus_y: 50, rechten_bevestigd: false, rev: 1, mag_in_im: true, onderschrift: k };
    ctx.IMB.status = 'ok'; ctx.IMB.data = { ok: true, beelden: [b] };
    const hb = ctx.renderImBeeld('strategisch');
    if (/<img src=x|"><x/.test(hb)) fouten.push('servertekst of id niet geëscapet');
    if (!/data-veld="im_toegestaan"/.test(hb) || !/data-veld="cover"/.test(hb) || !/imbVerwijder\(this\)/.test(hb)) fouten.push('begeleider mist opname/cover/verwijderen');
    ctx.S.rol = 'verkoper'; ctx.IMB.scope = ctx.finScope(); ctx.IMB.status = 'ok'; ctx.IMB.data = { ok: true, beelden: [b] };
    const hv = ctx.renderImBeeld('strategisch');
    if (/data-veld="im_toegestaan"|data-veld="cover"|imbVerwijder/.test(hv) || !/imbUpload\(\)/.test(hv)) fouten.push('verkoper: verkeerde rechten in de UI');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 E v4b: ' + f)); else ok('#91 E v4b: beeldpaneel in Strategisch, escaping, rolrechten (alleen begeleider beslist), privé miniaturen, handleiding, laadvolgorde, alleen fetchMetTimeout');
}

log('47. #91 fase E v4: juridisch paneel (mna/20), rollen, escaping, vrijgave alleen begeleider, laadvolgorde, handleiding');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src = ['mna/16-financieel.js', 'mna/18-organisatie.js', 'mna/20-juridisch.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const src20 = fs.readFileSync(path.join(ROOT, 'mna/20-juridisch.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8'), src06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('20-juridisch.js') > pos('18-organisatie.js') && pos('20-juridisch.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 20');
    if (!/\+renderJuridisch\(f\.id\)/.test(src06)) fouten.push('renderMain roept renderJuridisch niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src20.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/20');
    for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Overeenkomsten en juridische aandachtspunten/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
    let fetches = 0;
    const k = '<img src=x onerror=alert(1)>';
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'juridisch', dataFields: [] }], WORKER: 'https://w.test',
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: (f) => f(), fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {}, document: { querySelectorAll: () => [] }, kaTabel: () => '' });
    vm.runInContext(src, ctx);
    if (ctx.renderJuridisch('juridisch') !== '' || fetches) fouten.push('koper ziet juridisch paneel');
    ctx.S.rol = 'tussenpersoon';
    if (ctx.renderJuridisch('financieel') !== '') fouten.push('paneel buiten fase Juridisch');
    ctx.renderJuridisch('juridisch');
    const d = { ok: true, rev: 2, contracten: [{ id: 'c_000000000001', soort: 'klant', omschrijving: k, einddatum: '2026-06-30', change_of_control: 'ja', exclusiviteit: 'nee', jaarwaarde: 1000, in_im: true }],
      aandachtspunten: [{ id: 'a_000000000001', soort: 'geschil', omschrijving: k, status: 'lopend', in_im: false }], analyse: { contracten: 1, change_of_control: 1, aflopend_24mnd: 1, jaarwaarde: 1000 }, im: { contracten: 1, aandachtspunten: 0 }, intern_aandachtspunten: 1 };
    ctx.JUR.status = 'ok'; ctx.jurZetData(d);
    const hb = ctx.renderJuridisch('juridisch');
    if (/<img src=x/.test(hb)) fouten.push('servertekst niet geëscapet');
    if ((hb.match(/Opnemen in IM/g) || []).length !== 2 || !/jurBewaar\('contr'\)/.test(hb) || !/jurBewaar\('punt'\)/.test(hb)) fouten.push('begeleider mist vrijgave of opslaan');
    ctx.S.rol = 'verkoper'; ctx.JUR.scope = ctx.finScope(); ctx.JUR.status = 'ok'; ctx.jurZetData(d);
    const hv = ctx.renderJuridisch('juridisch');
    if (/Opnemen in IM/.test(hv) || !/Opgenomen in IM/.test(hv) || !/Niet in IM/.test(hv) || !/jurBewaar\('contr'\)/.test(hv)) fouten.push('verkoper: verkeerde rechten in de UI');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 E v4 juridisch: ' + f)); else ok('#91 E v4 juridisch: paneel alleen in fase Juridisch voor verkoper/begeleider, escaping, vrijgave voor het IM alleen door de begeleider, handleiding, laadvolgorde, alleen fetchMetTimeout');
}

log('48. #91 fase E v4: bijlagekeuze kolommenbalans (mna/21), alleen begeleider, alleen gereed, dashboardkoppeling, handleiding');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    const src = ['mna/16-financieel.js', 'mna/21-im-bijlage.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const src21 = fs.readFileSync(path.join(ROOT, 'mna/21-im-bijlage.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8'), src04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
    const pos = (n) => html.indexOf('<script src="mna/' + n);
    if (!(pos('21-im-bijlage.js') > pos('16-financieel.js') && pos('21-im-bijlage.js') < pos('06-schermen.js'))) fouten.push('laadvolgorde 21');
    if (!/<div id="imbj-bg"><\/div>/.test(src04) || !/imbjLaad\(\)/.test(src04)) fouten.push('dashboard roept de bijlagekeuze niet aan');
    if (/(^|[^A-Za-z.])fetch\(/.test(src21.replace(/fetchMetTimeout\(/g, ''))) fouten.push('kale fetch in mna/21');
    for (const f of ['mna/08-handleiding.js', 'adv.html']) if (!/Kolommenbalans als bijlage bij het memorandum/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fouten.push('handleiding ' + f);
    const el = { innerHTML: '' };
    let fetches = 0;
    const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'verkoper', fase: 0, _bgKey: 'x' }, FASES: [], WORKER: 'https://w.test', toast: () => {},
      isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: () => {}, fetchMetTimeout: () => { fetches++; return new Promise(() => {}); }, renderApp: () => {}, ge: () => null, window: {},
      document: { getElementById: (id) => (id === 'imbj-bg' ? el : null), querySelectorAll: () => [] } });
    ctx.window = ctx; // in de browser is window het globale object
    vm.runInContext(src, ctx);
    ctx.imbjLaad();
    if (fetches) fouten.push('verkoper laadt bijlagekeuze');
    ctx.S.rol = 'tussenpersoon'; ctx.imbjLaad();
    if (fetches !== 1) fouten.push('begeleider laadt bijlagekeuze niet');
    ctx.IMBJ.data = { ok: true, rev: 1, gekozen: [2024], beschikbaar: [{ jaar: 2023, gereed: false }, { jaar: 2024, gereed: true }] }; ctx.IMBJ.fout = '<img src=x onerror=alert(1)>';
    ctx.imbjTeken();
    if (/<img src=x/.test(el.innerHTML)) fouten.push('foutmelding niet geëscapet');
    if (!/value="2023" disabled/.test(el.innerHTML) || !/value="2024" checked>/.test(el.innerHTML) || !/imbjBewaar\(\)/.test(el.innerHTML)) fouten.push('niet-gereed jaar kiesbaar of opslaan ontbreekt');
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('#91 E v4 bijlage: ' + f)); else ok('#91 E v4 bijlage: keuze alleen voor de begeleider, niet-gereed jaar niet kiesbaar, escaping, dashboardkoppeling, handleiding, laadvolgorde, alleen fetchMetTimeout');
}

log('49. N-154: elk opslagpad in mna.html stuurt de basis mee; verwerking na opslag en conflict');
{
  const fouten = [];
  try {
    const vm = (await import('vm')).default;
    for (const f of ['mna/02-state-opslag-documenten.js', 'mna/06-schermen.js']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const paden = [...src.matchAll(/fetch\(WORKER\+'\/mna\/save'[\s\S]{0,200}?body:\s*(?:JSON\.stringify\(([^)]*)\)|body)/g)];
      for (const m of paden) {
        const voor = src.slice(Math.max(0, m.index - 4000), m.index + m[0].length);
        if (!/metBasis\(/.test(voor)) fouten.push(f + ': opslagpad zonder basis (' + src.slice(0, m.index).split('\n').length + ')');
      }
      const beacon = src.indexOf("navigator.sendBeacon(WORKER+'/mna/save'");
      if (beacon > 0 && !/metBasis\(/.test(src.slice(beacon - 1500, beacon))) fouten.push(f + ': beacon zonder basis');
    }
    const src02 = fs.readFileSync(path.join(ROOT, 'mna/02-state-opslag-documenten.js'), 'utf8');
    const helpers = src02.slice(src02.indexOf('function opslagRij('), src02.indexOf('function getDataForFase(id){'));
    const ctx = vm.createContext({ S: { _groepData: { financieel_omzet3: '1000000', financieel_ebitda: '160000' }, dataPerEntiteit: {} }, FASES: [{ id: 'financieel', dataFields: [{ id: 'omzet3' }, { id: 'ebitda' }, { id: 'kop', header: true }] }], renderApp: () => { ctx.getekend = true; } });
    vm.runInContext(helpers, ctx);
    // Scherm: fase financieel open op groepsniveau, invoervelden in de DOM.
    const dom = { df_omzet3: { value: '1000000' }, df_ebitda: { value: '160000' } };
    Object.assign(ctx.S, { fase: 0, screen: 'main', data: ctx.S._groepData });
    ctx.ge = (id) => dom[id] || null;
    ctx.showAlert = (m) => { ctx.melding = m; };
    const v = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, { value: x }]));
    ctx.zetBasis('financieel', null, { omzet3: { value: '1000000' }, ebitda: { value: '150000' }, consolidatieCheck: [1] });
    const pl = ctx.metBasis({ fase_id: 'financieel', data_json: { omzet3: { value: '1000000' }, ebitda: { value: '160000' } } });
    if (JSON.stringify(pl.basis) !== '{"omzet3":"1000000","ebitda":"150000"}') fouten.push('basis bevat niet exact de velden van de fase: ' + JSON.stringify(pl.basis));
    if (JSON.parse(JSON.stringify(pl))._basisReg !== undefined) fouten.push('interne registratie lekt in het verzoek');
    ctx.naOpslag(pl, { ok: true, data_json_actueel: { omzet3: { value: '1100000' }, ebitda: { value: '160000' } } });
    if (ctx.S._groepData.financieel_omzet3 !== '1100000' || ctx.S._basis['|financieel'].omzet3 !== '1100000') fouten.push('na opslag niet de elders gewijzigde omzet overgenomen');
    if (dom.df_omzet3.value !== '1100000') fouten.push('na opslag toont het invoerveld nog de oude omzet (volgende opslag zou die terugzetten)');
    // Gebruiker typte intussen verder: niets overnemen.
    const plT = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1100000', ebitda: '160000' }) });
    dom.df_ebitda.value = '170000';
    ctx.naOpslag(plT, { ok: true, data_json_actueel: v({ omzet3: '1100000', ebitda: '165000' }) });
    if (dom.df_ebitda.value !== '170000' || ctx.S._groepData.financieel_ebitda !== '160000') fouten.push('invoer die de gebruiker nog typt is overschreven');
    dom.df_ebitda.value = '160000';
    ctx.zetBasis('financieel', null, v({ omzet3: '1100000', ebitda: '160000' }));
    const pl2 = ctx.metBasis({ fase_id: 'financieel', data_json: { omzet3: { value: '1200000' }, ebitda: { value: '160000' } } });
    ctx.S._groepData.financieel_omzet3 = '1200000'; dom.df_omzet3.value = '1200000';
    ctx.getekend = false;
    ctx.naOpslag(pl2, { error: 'x', code: 'VELD_CONFLICT', conflicten: [{ veld: 'omzet3', label: 'Omzet', actueel: '1150000' }] });
    if (ctx.S._groepData.financieel_omzet3 !== '1150000' || dom.df_omzet3.value !== '1150000' || ctx.S._basis['|financieel'].omzet3 !== '1150000' || !ctx.getekend) fouten.push('conflict toont niet de actuele waarde');
    if (!/^x/.test(ctx.melding || '') || !/actueel 1150000/.test(ctx.melding) || !/uw invoer 1200000/.test(ctx.melding)) fouten.push('conflict toont niet de foutmelding van de server met actuele waarde en eigen invoer: ' + ctx.melding);
    // Conflict terwijl de gebruiker na de geweigerde opslag al verder typte: nieuwere invoer blijft staan en wordt genoemd.
    ctx.zetBasis('financieel', null, v({ omzet3: '1100000', ebitda: '160000' }));
    const plV = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1200000', ebitda: '160000' }) });
    dom.df_omzet3.value = '1250000';
    ctx.naOpslag(plV, { error: 'x', code: 'VELD_CONFLICT', conflicten: [{ veld: 'omzet3', label: 'Omzet', actueel: '1150000' }] });
    if (dom.df_omzet3.value !== '1250000' || ctx.S._groepData.financieel_omzet3 !== '1250000' || ctx.S._basis['|financieel'].omzet3 !== '1150000') fouten.push('conflict overschrijft invoer die de gebruiker na de opslag al typte');
    if (!/nieuwere invoer 1250000/.test(ctx.melding || '')) fouten.push('conflictmelding noemt de nieuwere invoer niet: ' + ctx.melding);
    // Wijzigen en terugzetten terwijl de eerste opslag nog loopt: de tweede opslag geldt als wijziging.
    dom.df_omzet3.value = '1150000';
    const plA = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1300000', ebitda: '160000' }) });
    const plB = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1150000', ebitda: '160000' }) });
    if (plB.basis.omzet3 !== '1300000') fouten.push('terugzetten tijdens een lopende opslag lijkt ongewijzigd (basis ' + plB.basis.omzet3 + ')');
    ctx.S._groepData.financieel_omzet3 = '1150000';
    ctx.naOpslag(plA, { ok: true, data_json_actueel: v({ omzet3: '1300000', ebitda: '160000' }) });
    ctx.naOpslag(plB, { ok: true, data_json_actueel: v({ omzet3: '1150000', ebitda: '160000' }) });
    if (ctx.S._groepData.financieel_omzet3 !== '1150000' || dom.df_omzet3.value !== '1150000' || ctx.S._basis['|financieel'].omzet3 !== '1150000') fouten.push('teruggezette waarde niet behouden na twee lopende opslagen');
    // Eerste opslag mislukt, tweede (voortbouwend) slaagt: niets ongemerkt overnemen, basis = serverstand.
    ctx.S._groepData.financieel_omzet3 = '1400000'; dom.df_omzet3.value = '1400000';
    const plC = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1400000', ebitda: '160000' }) });
    const plD = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1400000', ebitda: '160000' }) });
    ctx.naOpslag(plC, null);
    ctx.naOpslag(plD, { ok: true, data_json_actueel: v({ omzet3: '1150000', ebitda: '160000' }) });
    if (ctx.S._groepData.financieel_omzet3 !== '1400000' || dom.df_omzet3.value !== '1400000' || ctx.S._basis['|financieel'].omzet3 !== '1150000') fouten.push('na een mislukte opslag is de invoer ongemerkt vervangen');
    ctx.naOpslag(plD, null);
    if (ctx.S._basis['|financieel'].omzet3 !== '1150000') fouten.push('dubbele verwerking van hetzelfde antwoord');
    // Geplande opslag: de basis hoort bij de momentopname (saveCurrent), niet bij het versturen 800ms later.
    ctx.zetBasis('financieel', null, v({ omzet3: '1000000', ebitda: '160000' }));
    Object.assign(ctx.S._groepData, { financieel_omzet3: '1000000', financieel_ebitda: '170000' }); dom.df_omzet3.value = '1000000'; dom.df_ebitda.value = '170000';
    const plE = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1000000', ebitda: '170000' }) });
    const snap = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1000000', ebitda: '170000' }) }, true);
    ctx.naOpslag(plE, { ok: true, data_json_actueel: v({ omzet3: '1100000', ebitda: '170000' }) });
    ctx.metBasis(snap);
    if (snap.basis.omzet3 !== '1000000') fouten.push('geplande opslag verstuurt de oude omzet met een nieuwere basis (zou 1.100.000 terugdraaien): basis ' + snap.basis.omzet3);
    if (ctx.S._groepData.financieel_omzet3 !== '1100000') fouten.push('elders gewijzigde omzet niet overgenomen voor de geplande opslag');
    ctx.naOpslag(snap, { ok: true, data_json_actueel: v({ omzet3: '1100000', ebitda: '170000' }) });
    if (ctx.S._groepData.financieel_omzet3 !== '1100000' || dom.df_omzet3.value !== '1100000') fouten.push('na de geplande opslag is de overgenomen omzet weer vervangen');
    // Bron van de momentopname mislukt voor het versturen: basis opnieuw bepalen uit de serverstand.
    Object.assign(ctx.S._groepData, { financieel_ebitda: '180000' }); dom.df_ebitda.value = '180000';
    const plF = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1100000', ebitda: '180000' }) });
    const snap2 = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1100000', ebitda: '180000' }) }, true);
    ctx.naOpslag(plF, null);
    ctx.metBasis(snap2);
    if (snap2.basis.ebitda !== '170000') fouten.push('na een mislukte eerdere opslag gaat de wijziging van de geplande opslag ongemerkt verloren: basis ' + snap2.basis.ebitda);
    if (JSON.parse(JSON.stringify(snap2))._basisBron !== undefined) fouten.push('interne basisbron lekt in het verzoek');
    ctx.naOpslag(snap2, null);
    // Review N-154 ronde 3: bron van de momentopname krijgt een conflict op omzet; de EBITDA-wijziging uit die opslag mag
    // niet als "ongewijzigd" meegaan (basis opnieuw uit de serverstand, niet uit de afgewezen opslag).
    ctx.zetBasis('financieel', null, v({ omzet3: '1100000', ebitda: '170000' }));
    Object.assign(ctx.S._groepData, { financieel_omzet3: '1200000', financieel_ebitda: '190000' }); dom.df_omzet3.value = '1200000'; dom.df_ebitda.value = '190000';
    const plG = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1200000', ebitda: '190000' }) });
    const snap3 = ctx.metBasis({ fase_id: 'financieel', data_json: v({ omzet3: '1200000', ebitda: '190000' }) }, true);
    ctx.naOpslag(plG, { error: 'x', code: 'VELD_CONFLICT', conflicten: [{ veld: 'omzet3', label: 'Omzet', actueel: '1150000' }] });
    ctx.metBasis(snap3);
    if (snap3.basis.ebitda !== '170000') fouten.push('momentopname na een conflict op omzet stuurt de niet-opgeslagen EBITDA als basis mee (wijziging zou verdwijnen): basis ' + snap3.basis.ebitda);
  } catch (e) { fouten.push('check kon niet worden uitgevoerd: ' + String((e && e.message) || e)); }
  if (fouten.length) fouten.forEach((f) => warn('N-154: ' + f)); else ok('N-154: alle opslagpaden (ook beacon) sturen de basis mee; na opslag wordt een elders gewijzigd veld overgenomen (ook in het invoerveld); bij een conflict toont het scherm de actuele waarde en de foutmelding; lopende en mislukte opslagen veroorzaken geen ongemerkt verlies');
}

log('50. #91 E v5 en N-154: handleiding (mna/08 en adv.html) beschrijft het vijfjarenoverzicht en gelijktijdig werken');
{
  const fouten = [];
  for (const f of ['mna/08-handleiding.js', 'adv.html']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!/stap\('11h','Financieel overzicht in één oogopslag'/.test(t) || !/2026P/.test(t) || !/niet definitief vaststellen of versturen/.test(t)) fouten.push(f + ': sectie vijfjarenoverzicht ontbreekt of is onvolledig');
    if (!/stap\('11i','Gelijktijdig werken aan hetzelfde dossier'/.test(t) || !/overschrijft een opslag nooit ongemerkt/.test(t)) fouten.push(f + ': sectie gelijktijdig werken ontbreekt of is onvolledig');
  }
  if (fouten.length) fouten.forEach((f) => warn('#91 E v5 / N-154: ' + f)); else ok('#91 E v5 / N-154: beide handleidingen beschrijven het vijfjarenoverzicht en gelijktijdig werken');
}

log('51. #97 M&A Journey: gedeelde component, laadvolgorde, plaatshouders per rol, alleen-lezen, handleiding mna en adv');
{
  const f = [];
  const html = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8');
  const j = fs.readFileSync(path.join(ROOT, 'mna/22-journey.js'), 'utf8');
  const s04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const s06 = fs.readFileSync(path.join(ROOT, 'mna/06-schermen.js'), 'utf8');
  const hl = fs.readFileSync(path.join(ROOT, 'mna/08-handleiding.js'), 'utf8');
  const adv = fs.readFileSync(path.join(ROOT, 'adv.html'), 'utf8');
  const pos = (x) => html.indexOf('<script src="mna/' + x);
  if (!(pos('22-journey.js') > pos('21-im-bijlage.js') && pos('22-journey.js') < pos('06-schermen.js'))) f.push('mna/22-journey.js niet tussen 21 en 06 geladen');
  if (/method:\s*'(POST|PUT|PATCH|DELETE)'/.test(j)) f.push('journeycomponent mag niets schrijven');
  if (!/\/mna\/journey\//.test(j)) f.push('journeycomponent leest niet uit /mna/journey');
  for (const id of ['jr-begeleider', 'jr-kaartenbak', 'jr-fallback-kop', 'jr-koopmandaat']) if (!s04.includes('id="' + id + '"')) f.push('plaatshouder ' + id + ' ontbreekt in mna/04');
  if ((s06.match(/id="jr-portaal"/g) || []).length !== 2) f.push('jr-portaal moet op het voorblad (verkoper/koper) en op het koperscherm vóór vrijgave staan');
  if (!/bindAll\(\);\n  if\(typeof jrMount==='function'\)jrMount\(\);/.test(s04)) f.push('jrMount niet aangeroepen na renderApp');
  if (s04.includes("Documenten &mdash; flow')")) f.push('oude vlakke documentenflow-kop staat er nog');
  if (/jrActie[\s\S]*?'bg-afsluiten'\) \{ jrScroll/.test(j) === false) f.push('afsluiten mag vanuit de journey alleen in beeld worden gebracht, nooit automatisch');
  for (const k of ["stap('1b','De M&amp;A Journey", "stap('2a','Uw route: de M&amp;A Journey'"]) { if (!hl.includes(k)) f.push('handleiding mna mist ' + k.slice(0, 40)); if (!adv.includes(k)) f.push('handleiding adv mist ' + k.slice(0, 40)); }
  if (!/t\.journey&&t\.journey\.fase/.test(adv)) f.push('adv-trajectenlijst toont de journeyfase niet');
  if (f.length) warn('#97 M&A Journey: ' + f.join('; ')); else ok('#97 M&A Journey: component na 21 en vóór 06, alleen-lezen, plaatshouders begeleider/verkoper/koper/koopmandaat, jrMount na renderApp, oude flowkop weg, afsluiten nooit automatisch, handleiding mna + adv, adv-lijst toont fase.');
}

// ── UAT-023.01: transactievorm nooit stil verloren (automatisch opslaan, bewaren bij verlaten) ──
log('UAT-023.01 transactievorm: automatisch opslaan, bewaren bij verlaten van fase/scherm/tabblad, melding bij onvolledige invoer');
{
  const t = fs.readFileSync(path.join(ROOT, 'mna/13-transactiemodel.js'), 'utf8');
  const fouten = [];
  if (!/window\.tmZet = function[^\n]*tmPlanAuto\(\)/.test(t)) fouten.push('tmZet plant geen automatische opslag');
  if (!/window\.tmBetaling = function[^\n]*tmPlanAuto\(\)/.test(t)) fouten.push('tmBetaling plant geen automatische opslag');
  if (!/window\.tmScenZet = function[^\n]*tmPlanAuto\(\)/.test(t)) fouten.push('tmScenZet plant geen automatische opslag');
  if (!/if \(TM\.scope !== k\) \{ tmBewaarBijVerlaten\(\);/.test(t)) fouten.push('scopewissel bewaart niet eerst');
  if (!/addEventListener\('pagehide', function \(\) \{ tmBewaarBijVerlaten\(\); \}\)/.test(t) || !/visibilitychange[^\n]*tmBewaarBijVerlaten/.test(t)) fouten.push('tabblad verlaten bewaart niet');
  if (!/function tmBewaarBijVerlaten\([^)]*\)[\s\S]{0,700}showAlert\('De transactievorm is niet opgeslagen omdat de invoer nog onvolledig is/.test(t)) fouten.push('geen melding bij onvolledige invoer');
  if (!/keepalive: !!keepalive/.test(t)) fouten.push('verzending bij verlaten zonder keepalive');
  if (!/if \(TM\.conflict && !handmatig\) return;/.test(t) || !/if \(TM\.conflict\) \{ if \(!stil && typeof showAlert === 'function'\) showAlert\(/.test(t)) fouten.push('echt conflict wordt automatisch of bij verlaten doorgeschreven');
  if (!/renderApp = function \(\) \{ tmSyncScope\(\); _tmOrigRenderApp\(\); \}/.test(t)) fouten.push('schermwissel buiten de fase bewaart of meldt niet');
  if (fouten.length) warn('UAT-023.01: ' + fouten.join('; '));
  else ok('UAT-023.01: elke invoerhandler plant automatische opslag, scope-/scherm-/tabbladwissel bewaart eerst (keepalive), onvolledige invoer geeft een melding, een echt conflict wordt nooit automatisch doorgeschreven.');
}

// ── UAT-024.01: kolommenbalans uit de centrale upload inlezen (kandidaten, jaar bevestigen, handleiding) ──
log('UAT-024.01 kolommenbalans: kandidaten uit het dossier, jaar door de gebruiker, verdwijnt na inlezen, handleiding mna/adv');
{
  const t = fs.readFileSync(path.join(ROOT, 'mna/15-kolommenbalans.js'), 'utf8');
  const h = fs.readFileSync(path.join(ROOT, 'mna/08-handleiding.js'), 'utf8'), adv = fs.readFileSync(path.join(ROOT, 'adv.html'), 'utf8');
  const fouten = [];
  if (!/kbPost\('uit-document', \{ jaar: jaar, doc_id: docId/.test(t)) fouten.push('inlezen uit document ontbreekt');
  if (!/Kies eerst het boekjaar van/.test(t)) fouten.push('geen weigering zonder boekjaar');
  if (!/bevestig_afwijkend_jaar: afwijkend \|\| undefined/.test(t) || !/confirm\('U kiest boekjaar/.test(t)) fouten.push('afwijkend jaar niet expliciet bevestigd');
  if (!/KB\.data\.kandidaten = \(KB\.data\.kandidaten \|\| \[\]\)\.filter/.test(t)) fouten.push('kandidaat blijft staan na inlezen');
  if (!/var\(--info\);background:var\(--info-bg\)/.test(t)) fouten.push('kandidatenblok zonder informatiekleur');
  if ((h.match(/In het dossier gevonden/g) || []).length < 2 || !/In het dossier gevonden/.test(adv)) fouten.push('handleiding mna/adv niet bijgewerkt');
  if (fouten.length) warn('UAT-024.01: ' + fouten.join('; '));
  else ok('UAT-024.01: kandidaten uit het dossier, jaar alleen door de gebruiker (afwijking bevestigen), kandidaat verdwijnt na inlezen, handleiding mna en adv.');
}

// ── UAT DOC-A24/A26: bankafschriften uit het dossier inlezen, dubbele herkend; journey laadt Financieel ──
log('UAT DOC-A24/A26 bankmutaties: kandidaten uit het dossier, keuze bij dubbele transacties, CAMT.053 in upload, journeynavigatie laadt de fase');
{
  const t = fs.readFileSync(path.join(ROOT, 'mna/02-state-opslag-documenten.js'), 'utf8'), j = fs.readFileSync(path.join(ROOT, 'mna/22-journey.js'), 'utf8');
  const h = fs.readFileSync(path.join(ROOT, 'mna/08-handleiding.js'), 'utf8'), adv = fs.readFileSync(path.join(ROOT, 'adv.html'), 'utf8');
  const fouten = [];
  if (!/fetchMetTimeout\(WORKER \+ '\/mna\/bankmutaties\/uit-document'/.test(t)) fouten.push('inlezen uit dossier ontbreekt of zonder timeout');
  if (!/function bankDubbelVraag\(d\)[\s\S]{0,400}Alleen de ' \+ d\.nieuw \+ ' nieuwe transactie/.test(t)) fouten.push('geen keuze bij dubbele transacties');
  if (!/if \(alleenNieuw\) fd\.append\('alleen_nieuw', 'true'\)/.test(t)) fouten.push('handmatige upload kent geen alleen-nieuw');
  if (!/accept="\.csv,\.940,\.sta,\.mt940,\.txt,\.xml"/.test(t)) fouten.push('CAMT.053 niet kiesbaar');
  if (!/fid === 'financieel' && typeof BANKMUTATIES !== 'undefined' && BANKMUTATIES === null && typeof laadBankmutaties === 'function'\) laadBankmutaties\(\);/.test(j) || !/loadDocsForFase\(fid\)/.test(j)) fouten.push('journeynavigatie verkoper laadt Financieel niet');
  if (!/stap\('4b2','Bankafschriften inlezen'/.test(h) || !/dubbele transacties uit hetzelfde afschrift/.test(adv)) fouten.push('handleiding mna/adv niet bijgewerkt');
  if (fouten.length) warn('UAT DOC-A24/A26: ' + fouten.join('; '));
  else ok('UAT DOC-A24/A26: bankafschriften uit het dossier inlezen (timeout), keuze alleen-nieuw bij dubbele, CAMT.053 kiesbaar, journey laadt documenten en bankmutaties, handleiding mna en adv.');
}

log('Samenvatting');
if (!bevindingen) {
  console.log('  \x1b[32mGeen bevindingen.\x1b[0m');
  process.exit(0);
} else {
  console.log('  \x1b[33m' + bevindingen + ' bevinding(en) — zie hierboven.\x1b[0m');
  process.exit(1);
}
