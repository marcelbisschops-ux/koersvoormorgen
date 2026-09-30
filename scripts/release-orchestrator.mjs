#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// N-69 — Deterministic release-orchestrator (Marcel, 26 sep 2026, GO — dit ontwerp is al
// besloten, zie MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md).
//
// Doel: werkregel 44 (release-levenscyclus) technisch afdwingen i.p.v. alleen administratief.
// Voert een AL BEWEZEN, geïsoleerde kandidaat (nooit de vervuilde werkboom) door de vaste keten:
//   manifest-verificatie (checksums, geen manipulatie) → lokale checks → STAGING → staging-smoke
//   → RELEASE-READY → (backend: automatische productiepromotie + productiesmoke; frontend:
//   stopt hier, want een productie-`wrangler pages deploy` wordt in deze omgeving geweigerd door
//   Claude Code's eigen auto-mode classifier — zie README-sectie hieronder, dit is GEEN
//   ontwerpbeperking van dit script maar een harnas-permissiegrens die alleen Marcel zelf kan
//   opheffen) → log.
//
// BELANGRIJK — wat dit script WEL en NIET automatiseert:
// - Dit script automatiseert de MECHANISCHE promotie van een reeds als kandidaat vastgelegde
//   wijziging. Het bepaalt NIET zelf welke bestanden/hunks bij een kandidaat horen (dat blijft
//   mensen/AI-oordeel bij het samenstellen van de isolated worktree, exact zoals al die sessie
//   meermaals handmatig gedaan) en het beoordeelt NIET zelf of een wijziging binnen een
//   BLOCKED-MARCEL-uitzondering valt (werkregel 44 §3) — dat wordt voorafgaand aan het draaien van
//   dit script vastgesteld en expliciet bevestigd via `blocked_exceptions_checked` in het manifest.
// - `production-hard-locks` (o.a. bridge_runner_v2.py's PRODUCTION-quarantaine) worden door dit
//   script op geen enkele manier aangeraakt — dit is een volledig apart stuk gereedschap, geen
//   wijziging aan een bestaande blokkade.
//
// Gebruik:
//   node scripts/release-orchestrator.mjs <manifest.json>
//
// Manifest-schema (JSON):
// {
//   "master_id": "N-72",
//   "target": "backend" | "frontend",
//   "candidate_dir": "/pad/naar/geïsoleerde/git-worktree",
//   "baseline_commit": "<git sha waar de worktree vandaan komt>",
//   "files": ["worker/22-bankmutaties.js", ...],           // relatief aan candidate_dir
//   "checksums": { "worker/22-bankmutaties.js": "<sha256>", ... },  // vooraf berekend
//   "blocked_exceptions_checked": true,                     // MOET expliciet true zijn
//   "attested_by": "claude-session-<datum>"
// }
// ══════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const LOG_PAD = path.join(process.cwd(), 'reports', 'release-orchestrator-log.jsonl');
const WORKER_URL_PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const WORKER_URL_STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const PAGES_PROJECT = 'kantoorinzicht-frontend';
const BACKEND_BRON = path.join(process.env.HOME, 'Documents/GitHub/koersvoormorgen-backend/backend');
const FRONTEND_BRON = path.join(process.env.HOME, 'Documents/GitHub/koersvoormorgen');

// Gevonden tijdens de eerste echte testrun (26 sep 2026): een `git worktree add` checkt alleen
// GETRACKTE bestanden uit — geen node_modules. Zonder deze symlink faalt `wrangler deploy` op elke
// kandidaat die een dependency importeert (concreet gereproduceerd: `@cloudflare/puppeteer` in
// worker/36-pdf-renderer.js). Symlinkt (niet kopieert — node_modules is groot en de kandidaat wijzigt
// nooit de package-inhoud zelf) vanaf de altijd-actuele hoofd-checkout, zodat dit nooit meer per
// kandidaat handmatig ontdekt hoeft te worden.
function zorgVoorNodeModules(candidateDir, target) {
  const doel = path.join(candidateDir, 'node_modules');
  if (existsSync(doel) || (() => { try { lstatSync(doel); return true; } catch { return false; } })()) return;
  const bron = target === 'backend' ? BACKEND_BRON : FRONTEND_BRON;
  const bronNodeModules = path.join(bron, 'node_modules');
  if (!existsSync(bronNodeModules)) throw new Error('node_modules niet gevonden op bron: ' + bronNodeModules);
  symlinkSync(bronNodeModules, doel);
}

function log(niveau, tekst) {
  const prefix = { info: 'ℹ', ok: '✓', fout: '✗', stop: '■' }[niveau] || '·';
  console.log(prefix + ' ' + tekst);
}

function schrijfLogRegel(entry) {
  mkdirSync(path.dirname(LOG_PAD), { recursive: true });
  writeFileSync(LOG_PAD, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n', { flag: 'a' });
}

function sha256Bestand(pad) {
  return createHash('sha256').update(readFileSync(pad)).digest('hex');
}

function faal(masterId, reden, extra) {
  log('fout', 'GEWEIGERD: ' + reden);
  schrijfLogRegel({ master_id: masterId || 'onbekend', status: 'GEWEIGERD', reden, ...extra });
  process.exit(1);
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function main() {
  const manifestPad = process.argv[2];
  if (!manifestPad) {
    console.error('Gebruik: node scripts/release-orchestrator.mjs <manifest.json>');
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(manifestPad, 'utf8'));
  const { master_id, target, candidate_dir, files, checksums, blocked_exceptions_checked, attested_by } = manifest;

  console.log('');
  console.log('══════════ RELEASE-ORCHESTRATOR — ' + master_id + ' (' + target + ') ══════════');

  // ── Stap 0: BLOCKED-MARCEL-attestatie verplicht, geen impliciete aanname ──
  if (blocked_exceptions_checked !== true) {
    faal(master_id, 'blocked_exceptions_checked ontbreekt of is niet expliciet true — een kandidaat zonder deze attestatie mag nooit autonoom gepromoveerd worden (werkregel 44 §3).');
  }
  if (!['backend', 'frontend'].includes(target)) {
    faal(master_id, 'target moet "backend" of "frontend" zijn, kreeg: ' + target);
  }
  if (!candidate_dir || !existsSync(candidate_dir)) {
    faal(master_id, 'candidate_dir ontbreekt of bestaat niet: ' + candidate_dir);
  }
  log('ok', 'Manifest geldig — MASTER-ID ' + master_id + ', target=' + target + ', geattesteerd door: ' + attested_by);

  try { zorgVoorNodeModules(candidate_dir, target); } catch (e) { faal(master_id, 'node_modules-symlink mislukt: ' + e.message); }
  log('ok', 'node_modules beschikbaar in kandidaat (symlink naar hoofd-checkout).');

  // ── Stap 1: kandidaatgelijkheid — checksums van het manifest vs. de daadwerkelijke bestanden
  //    in candidate_dir. Een mismatch betekent: iemand/iets heeft de kandidaat gewijzigd NA het
  //    opstellen van het manifest — GEWEIGERD, geen enkele uitzondering. Dit is de mechanische
  //    invulling van "kandidaatgelijkheid staging→productie bewezen".
  log('info', 'Checksums verifiëren (' + files.length + ' bestand(en))...');
  for (const f of files) {
    const volledigPad = path.join(candidate_dir, f);
    if (!existsSync(volledigPad)) faal(master_id, 'Bestand ontbreekt in kandidaat: ' + f);
    const echt = sha256Bestand(volledigPad);
    const verwacht = checksums[f];
    if (!verwacht) faal(master_id, 'Geen verwachte checksum voor ' + f + ' in manifest — onvolledig manifest.');
    if (echt !== verwacht) faal(master_id, 'CHECKSUM-MISMATCH op ' + f + ' — kandidaat is gewijzigd na manifest-opstelling (verwacht ' + verwacht.slice(0, 12) + '…, gevonden ' + echt.slice(0, 12) + '…).', { bestand: f });
  }
  log('ok', 'Alle checksums kloppen — kandidaat is ongewijzigd sinds manifest-opstelling.');

  // ── Stap 2: lokale checks ──
  log('info', 'node --check op elk bestand...');
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    try { run('node', ['--check', f], candidate_dir); }
    catch (e) { faal(master_id, 'node --check faalt op ' + f + ': ' + (e.stderr || e.message).toString().slice(0, 300)); }
  }
  log('ok', 'Syntax OK voor alle .js-bestanden.');

  if (target === 'backend') {
    log('info', 'policy-equivalentie.mjs + audit-backend.mjs...');
    try {
      const repoRoot = path.resolve(candidate_dir, '..'); // candidate_dir is <repo>/backend
      run('node', ['tests/policy-equivalentie.mjs'], repoRoot);
      run('node', ['tests/audit-backend.mjs'], repoRoot);
    } catch (e) {
      faal(master_id, 'Regressie/audit faalt op de kandidaat: ' + (e.stdout || e.stderr || e.message).toString().slice(0, 500));
    }
    log('ok', 'policy-equivalentie + audit-backend groen op de kandidaat.');
  }

  // ── Stap 3: STAGING ──
  log('info', 'Deployen naar staging...');
  let stagingVersionId = null;
  try {
    let out;
    if (target === 'backend') {
      out = run('npx', ['wrangler', 'deploy', 'cloudflare-worker.js', '--env=staging'], candidate_dir);
    } else {
      out = run('npx', ['wrangler', 'pages', 'deploy', '.', '--project-name=' + PAGES_PROJECT, '--branch=preview'], candidate_dir);
    }
    const m = out.match(/Current Version ID:\s*(\S+)/) || out.match(/https:\/\/[a-z0-9-]+\.kantoorinzicht-frontend\.pages\.dev/);
    stagingVersionId = m ? m[1] || m[0] : 'onbekend';
  } catch (e) {
    faal(master_id, 'Staging-deploy mislukt: ' + (e.stdout || e.stderr || e.message).toString().slice(0, 500));
  }
  log('ok', 'Staging live (' + stagingVersionId + ').');

  // ── Stap 4: staging-smoke (minimale, deterministische health-check — geen herhaalde AI-tests
  //    hier, werkregel 40: de INHOUDELIJKE functionele test van een specifieke kandidaat gebeurt
  //    vóór het manifest wordt opgesteld, niet opnieuw hier) ──
  if (target === 'backend') {
    try {
      const r = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', WORKER_URL_STAGING + '/health']).toString();
      if (r.trim() !== '200') faal(master_id, 'Staging-health geeft ' + r.trim() + ', geen 200.');
    } catch (e) { faal(master_id, 'Staging-health-check faalt: ' + e.message); }
    log('ok', 'Staging-health 200.');
  }

  log('ok', 'RELEASE-READY (' + master_id + ', ' + target + ').');
  schrijfLogRegel({ master_id, target, status: 'RELEASE-READY', staging: stagingVersionId, attested_by });

  // ── Stap 5: productiepromotie — ALLEEN backend gaat hier autonoom door. ──
  if (target === 'frontend') {
    // N-79 (26 sep 2026, Marcels eigen runtimebewijs): `env -u CLOUDFLARE_API_TOKEN` hoort voortaan
    // standaard bij dit commando — een lokale CLOUDFLARE_API_TOKEN-omgevingsvariabele (bewust smal
    // gescoped voor D1-tests, tests/lib.mjs) overschaduwt anders wrangler's eigen, wél-toereikende
    // OAuth-login en geeft een Cloudflare-authenticatiefout (code 10000) vóór er iets wordt geüpload.
    const handoff = 'env -u CLOUDFLARE_API_TOKEN bash -c \'cd ' + candidate_dir + ' && npx wrangler pages deploy . --project-name=' + PAGES_PROJECT + ' --branch=main\'';
    console.log('');
    log('stop', 'FRONTEND STOPT BIJ RELEASE-READY (geen ontwerpbeperking van dit script).');
    console.log('  Reden: een productie-`wrangler pages deploy` wordt in deze Claude Code-sessie');
    console.log('  geweigerd door de eigen auto-mode classifier van de harness (categorische');
    console.log('  "[Production Deploy]"-weigering) — een harnas-permissiegrens die specifiek geldt');
    console.log('  voor autonome sessies (Auto Mode), niet voor Marcels eigen terminal. Een');
    console.log('  Bash-permissieregel lost dit NIET op (onderzocht 26 sep 2026: een reeds zeer brede');
    console.log('  `Bash(npx wrangler *)`-regel bestond al en werd alsnog geweigerd).');
    console.log('');
    console.log('  Voer zelf uit om te promoveren (bewezen werkend, 26 sep 2026 — zie N-79):');
    console.log('  ' + handoff);
    console.log('');
    schrijfLogRegel({ master_id, target, status: 'RELEASE-READY_BLOCKED_MARCEL', reden: 'auto-mode-classifier-productie-pages-deploy', handoff_command: handoff });
    process.exit(3); // aparte exitcode: RELEASE-READY maar niet PROD VERIFIED — géén fout in de kandidaat zelf
  }

  log('info', 'Backend: automatische productiepromotie (werkregel 44, reeds goedgekeurde scope)...');
  let prodVersionId = null;
  try {
    const out = run('npx', ['wrangler', 'deploy', 'cloudflare-worker.js'], candidate_dir);
    const m = out.match(/Current Version ID:\s*(\S+)/);
    prodVersionId = m ? m[1] : 'onbekend';
  } catch (e) {
    faal(master_id, 'Productie-deploy mislukt: ' + (e.stdout || e.stderr || e.message).toString().slice(0, 500));
  }
  log('ok', 'Productie live (' + prodVersionId + ').');

  try {
    const r = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', WORKER_URL_PROD + '/health']).toString();
    if (r.trim() !== '200') faal(master_id, 'Productie-health geeft ' + r.trim() + ' ná deploy — mogelijk incident, controleer direct.', { prod_version: prodVersionId });
    log('ok', 'Productie-health 200 — PROD VERIFIED.');
  } catch (e) { faal(master_id, 'Productie-health-check faalt: ' + e.message); }

  schrijfLogRegel({ master_id, target, status: 'PROD_VERIFIED_DONE', staging: stagingVersionId, productie: prodVersionId, attested_by });
  console.log('');
  log('ok', master_id + ' → PROD VERIFIED / DONE.');
}

main();
