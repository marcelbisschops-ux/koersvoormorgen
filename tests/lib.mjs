// ══════════════════════════════════════════════════════════════════
// Gedeelde helpers voor de KantoorInzicht end-to-end API-tests.
// Geen externe dependencies — draait op kale Node (18+, native fetch).
// ══════════════════════════════════════════════════════════════════

export const WORKER = process.env.WORKER_URL || 'https://kantoorinzicht.marcel-bisschops.workers.dev';

// De admin-key komt UITSLUITEND uit de omgeving of een --key=... argument.
// NOOIT hardcoden (secret-regel). Zonder key draaien alleen de publieke tests.
export function leesAdminKey() {
  const argKey = process.argv.find(a => a.startsWith('--key='));
  if (argKey) return argKey.slice('--key='.length);
  return process.env.ADMIN_KEY || '';
}

export function heeftVlag(naam) {
  return process.argv.includes('--' + naam);
}

// ── Kleuren voor leesbare terminal-output ──
const C = { groen: '\x1b[32m', rood: '\x1b[31m', geel: '\x1b[33m', grijs: '\x1b[90m', vet: '\x1b[1m', reset: '\x1b[0m' };
export function kleur(k, tekst) { return (C[k] || '') + tekst + C.reset; }

// ── Mini test-runner: telt geslaagd/gefaald, print compact ──
export const resultaten = { ok: 0, fail: 0, overgeslagen: 0, fouten: [] };

export function check(omschrijving, voorwaarde, detail) {
  if (voorwaarde) {
    resultaten.ok++;
    console.log('  ' + kleur('groen', '✓') + ' ' + omschrijving);
  } else {
    resultaten.fail++;
    resultaten.fouten.push(omschrijving + (detail ? ' — ' + detail : ''));
    console.log('  ' + kleur('rood', '✗') + ' ' + omschrijving + (detail ? kleur('grijs', '  (' + detail + ')') : ''));
  }
  return voorwaarde;
}

export function sla_over(omschrijving, reden) {
  resultaten.overgeslagen++;
  console.log('  ' + kleur('geel', '⊘') + ' ' + omschrijving + kleur('grijs', ' — overgeslagen: ' + reden));
}

export function kop(tekst) { console.log('\n' + kleur('vet', tekst)); }

// ── HTTP-helper: geeft {status, json, tekst} terug, nooit een throw ──
export async function api(method, pad, { body, headers, adminKey } = {}) {
  const opts = { method, headers: { ...(headers || {}) } };
  if (adminKey) opts.headers['x-admin-key'] = adminKey;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  try {
    const resp = await fetch(WORKER + pad, opts);
    const tekst = await resp.text();
    let json = null;
    try { json = JSON.parse(tekst); } catch { /* geen JSON */ }
    return { status: resp.status, json, tekst };
  } catch (e) {
    return { status: 0, json: null, tekst: 'NETWERKFOUT: ' + e.message };
  }
}

// ── Test-only MFA-bypass (12 sep 2026) ──
// Adviseur-login vereist sinds 9 sep 2026 een e-mailcode (MFA). Staging heeft geen RESEND-sleutel,
// dus een geautomatiseerde test kan die code nooit ophalen — zonder deze bypass slaan de CONF-checks
// achter /adviseur/trajecten permanent over. Er is bewust GEEN nieuw productie-/ADMIN_KEY-endpoint
// voor toegevoegd (dat zou een nieuwe, blijvende auth-aanval-oppervlakte zijn voor iets dat alleen
// een testscript nodig heeft) — in plaats daarvan een directe D1-write, met een harde guard die
// alleen tegen kantoorinzicht-staging draait. Vereist een ingelogde `wrangler`-sessie (dezelfde
// vereiste als tests/run-rolflows.sh al had voor ADMIN_KEY); ontbreekt die, dan faalt dit netjes en
// blijft de aanroepende test net als voorheen overslaan (geen harde crash van de hele testrun).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const BACKEND_DIR = process.env.KVM_BACKEND_DIR
  || path.join(os.homedir(), 'Documents', 'GitHub', 'koersvoormorgen-backend', 'backend');
const STAGING_D1_NAAM = 'kantoorinzicht-staging';

export function zetMfaUitVoorTest(email) {
  if (!/staging/i.test(WORKER)) {
    return { ok: false, reden: 'WORKER_URL is geen staging-omgeving — MFA-bypass geweigerd (veiligheidsgrens, nooit tegen productie)' };
  }
  const sql = "UPDATE bf_gebruikers SET mfa=0 WHERE email='" + String(email).replace(/'/g, "''") + "'";
  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', STAGING_D1_NAAM, '--remote', '--command', sql],
      { cwd: BACKEND_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (e) {
    return { ok: false, reden: 'wrangler d1 execute mislukt (staging niet bereikbaar via wrangler, of niet ingelogd): ' + String(e.message || e).slice(0, 200) };
  }
}

// ── Rechtstreekse D1-verificatie via de wrangler-CLI (18 sep 2026) ──
// Verplaatst uit tests/prod-smoke.mjs naar hier zodat elke test (o.a.
// tests/e2e-3rollen-regressie.spec.js) dezelfde, al bewezen manier van onafhankelijk
// controleren kan hergebruiken i.p.v. een eigen kopie te bouwen. Welke D1-database
// geraakt wordt volgt WORKER_URL — nooit een losse vlag, zodat een staging-WORKER_URL
// nooit per ongeluk tegen de productie-database query't of andersom.
const D1_BACKEND_DIR = process.env.KVM_BACKEND_DIR
  || path.join(os.homedir(), 'Documents', 'GitHub', 'koersvoormorgen-backend', 'backend');
export const D1_NAAM = /staging/i.test(WORKER) ? 'kantoorinzicht-staging' : 'kantoorinzicht';

export function d1(sql) {
  let out;
  try {
    out = execFileSync('npx', ['wrangler', 'd1', 'execute', D1_NAAM, '--remote', '--json', '--command', sql],
      { cwd: D1_BACKEND_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    throw new Error('wrangler d1 execute mislukt (D1 "' + D1_NAAM + '" niet bereikbaar via wrangler, of niet ingelogd): ' + String(e.message || e).slice(0, 300));
  }
  const parsed = JSON.parse(out);
  return (parsed[0] && parsed[0].results) || [];
}

export function samenvatting() {
  const totaal = resultaten.ok + resultaten.fail;
  console.log('\n' + kleur('vet', '─────────── SAMENVATTING ───────────'));
  console.log(kleur('groen', resultaten.ok + ' geslaagd') + '  ·  '
    + (resultaten.fail ? kleur('rood', resultaten.fail + ' gefaald') : '0 gefaald') + '  ·  '
    + kleur('geel', resultaten.overgeslagen + ' overgeslagen') + kleur('grijs', '  (' + totaal + ' checks)'));
  if (resultaten.fouten.length) {
    console.log('\n' + kleur('rood', 'Gefaalde checks:'));
    resultaten.fouten.forEach(f => console.log('  • ' + f));
  }
  return resultaten.fail === 0;
}
