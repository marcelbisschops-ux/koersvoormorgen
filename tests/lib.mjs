// ══════════════════════════════════════════════════════════════════
// Gedeelde helpers voor de KantoorInzicht end-to-end API-tests.
// Geen externe dependencies — draait op kale Node (18+, native fetch).
// ══════════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process';

export const WORKER = process.env.WORKER_URL || 'https://kantoorinzicht.marcel-bisschops.workers.dev';

// N-68 (26 sep 2026, structurele credential-fix): canonieke bron is de macOS Sleutelhanger —
// versleuteld, geen ~/.zshrc-afhankelijkheid, geen risico op een verouderde/desynchrone waarde in
// een shell-profiel (precies het probleem dat deze fix veroorzaakte: een verlopen ADMIN_KEY-
// omgevingsvariabele gaf stilzwijgend 401 tegen productie). Hetzelfde patroon dat de bridge-.command-
// scripts al gebruikten voor staging (`security find-generic-password ... -s
// kantoorinzicht-staging-admin-key`), nu hier gecentraliseerd zodat ALLE testscripts/tools die via
// deze ene functie lopen hem automatisch krijgen, en uitgebreid met een analoog productie-item.
// Eenmalig instellen/roteren (Marcel typt de waarde zelf in ZIJN eigen terminal, nooit via Claude):
//   security add-generic-password -U -a "$USER" -s kantoorinzicht-staging-admin-key -w
//   security add-generic-password -U -a "$USER" -s kantoorinzicht-production-admin-key -w
// (-U = overschrijf een bestaand item, dus dit is ook het rotatiecommando.)
const _KEYCHAIN_SERVICE = /staging/i.test(WORKER) ? 'kantoorinzicht-staging-admin-key' : 'kantoorinzicht-production-admin-key';

function leesUitSleutelhanger(service) {
  try {
    const account = process.env.USER || process.env.LOGNAME || '';
    if (!account) return '';
    return execFileSync('/usr/bin/security', ['find-generic-password', '-a', account, '-s', service, '-w'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return ''; // geen item gevonden, geen Sleutelhanger beschikbaar (bijv. CI/Linux), of geweigerd — fail-closed, nooit gokken
  }
}

// De admin-key komt uit: (1) een expliciete --key=...-vlag (eenmalig, overrulet alles), (2) de
// macOS Sleutelhanger (canoniek, zie hierboven), (3) als laatste, zichtbaar-gelogde terugval de
// ADMIN_KEY-omgevingsvariabele (bijv. voor CI/GitHub Actions, waar geen Sleutelhanger bestaat en de
// waarde al expliciet en veilig via GitHub Secrets wordt aangeleverd). NOOIT hardcoden (secret-regel).
// Zonder geldige key draaien alleen de publieke tests.
export function leesAdminKey() {
  const argKey = process.argv.find(a => a.startsWith('--key='));
  if (argKey) return argKey.slice('--key='.length);
  const uitSleutelhanger = leesUitSleutelhanger(_KEYCHAIN_SERVICE);
  if (uitSleutelhanger) return uitSleutelhanger;
  if (process.env.ADMIN_KEY) {
    console.error('[leesAdminKey] Sleutelhanger-item "' + _KEYCHAIN_SERVICE + '" niet gevonden — teruggevallen op ADMIN_KEY-omgevingsvariabele (kan verouderd zijn, zie N-68). Overweeg: security add-generic-password -U -a "$USER" -s ' + _KEYCHAIN_SERVICE + ' -w');
    return process.env.ADMIN_KEY;
  }
  return '';
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
// alleen tegen kantoorinzicht-staging draait. Vereist een ingelogde `wrangler`-sessie (interactief
// lokaal, of CLOUDFLARE_API_TOKEN in de omgeving); ontbreekt die, dan faalt dit netjes en blijft de
// aanroepende test net als voorheen overslaan (geen harde crash van de hele testrun).
// (execFileSync is al bovenaan dit bestand geïmporteerd, voor leesAdminKey()'s Sleutelhanger-lookup.)

const STAGING_D1_NAAM = 'kantoorinzicht-staging';

export function zetMfaUitVoorTest(email) {
  if (!/staging/i.test(WORKER)) {
    return { ok: false, reden: 'WORKER_URL is geen staging-omgeving — MFA-bypass geweigerd (veiligheidsgrens, nooit tegen productie)' };
  }
  const sql = "UPDATE bf_gebruikers SET mfa=0 WHERE email='" + String(email).replace(/'/g, "''") + "'";
  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', STAGING_D1_NAAM, '--remote', '--command', sql],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (e) {
    // Diagnostisch (18 sep 2026): wrangler schrijft zijn eigen foutmelding naar stdout, niet
    // stderr/message — e.message alleen geeft altijd kale "Command failed: ..." zonder inhoud.
    const detail = (e.stdout && String(e.stdout).trim()) || (e.stderr && String(e.stderr).trim()) || String(e.message || e);
    return { ok: false, reden: 'wrangler d1 execute mislukt (staging niet bereikbaar via wrangler, of niet ingelogd): ' + detail.slice(0, 300) };
  }
}

// ── Rechtstreekse D1-verificatie via de wrangler-CLI (18 sep 2026) ──
// Verplaatst uit tests/prod-smoke.mjs naar hier zodat elke test (o.a.
// tests/e2e-3rollen-regressie.spec.js) dezelfde, al bewezen manier van onafhankelijk
// controleren kan hergebruiken i.p.v. een eigen kopie te bouwen. Welke D1-database
// geraakt wordt volgt WORKER_URL — nooit een losse vlag, zodat een staging-WORKER_URL
// nooit per ongeluk tegen de productie-database query't of andersom.
//
// Geen `cwd` naar de backend-repo meer (18 sep 2026, CI-onderzoek): `wrangler d1 execute <naam>
// --remote` resolvet de database rechtstreeks bij naam tegen het geauthenticeerde Cloudflare-
// account — bewezen lokaal vanuit een lege map zonder wrangler.toml. Een cwd naar de private
// backend-repo was dus nooit nodig voor dit commando, en bestond alleen op de Mac — op een verse
// GitHub Actions-runner (geen toegang tot die private repo) gaf dat altijd ENOENT.
export const D1_NAAM = /staging/i.test(WORKER) ? 'kantoorinzicht-staging' : 'kantoorinzicht';

export function d1(sql) {
  let out;
  try {
    out = execFileSync('npx', ['wrangler', 'd1', 'execute', D1_NAAM, '--remote', '--json', '--command', sql],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // Diagnostisch (18 sep 2026): wrangler schrijft zijn eigen foutmelding naar stdout, niet
    // stderr/message — e.message alleen geeft altijd kale "Command failed: ..." zonder inhoud.
    const detail = (e.stdout && String(e.stdout).trim()) || (e.stderr && String(e.stderr).trim()) || String(e.message || e);
    throw new Error('wrangler d1 execute mislukt (D1 "' + D1_NAAM + '" niet bereikbaar via wrangler, of niet ingelogd): ' + detail.slice(0, 300));
  }
  const parsed = JSON.parse(out);
  return (parsed[0] && parsed[0].results) || [];
}

// ── Platformvoorwaarden-acceptatie voor rolcodes (S1.2b-gate) ──
// worker/00d-platformvoorwaarden-gate.js blokkeert elke beschermde /mna/-route (verkoper/koper/
// tussenpersoon) totdat de rol de platformvoorwaarden server-side heeft geaccepteerd
// (POST /mna/platformvoorwaarden/accepteren). Roep dit zo vroeg mogelijk aan, direct na het
// aanmaken/ophalen van de rolcodes en vóór de eerste andere gated /mna/*-aanroep — anders faalt
// die aanroep met 403 voorwaarden_niet_geaccepteerd. Idempotent: de backend vervangt een eerdere
// acceptatie (DELETE + INSERT), dus herhaald aanroepen voor dezelfde code is veilig. Accepteert elke
// niet-lege code uit `codes` (array of {rol: code}-object) en verifieert daarna onafhankelijk via
// GET /mna/platformvoorwaarden/status dat de acceptatie ook als actueel geldt (akkoord:true, zelfde
// versie). Gooit een Error zodra een code niet geaccepteerd blijkt — zonder acceptatie heeft verder
// draaien geen zin, elke volgende gated aanroep zou toch stuklopen.
export async function accepteerPlatformvoorwaarden(codes) {
  const lijst = [...new Set(
    (Array.isArray(codes) ? codes : Object.values(codes || {}))
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean)
  )];
  const resultaten = [];
  for (const code of lijst) {
    const accept = await api('POST', '/mna/platformvoorwaarden/accepteren', { body: { code } });
    const acceptOk = accept.status === 200 && !!(accept.json && accept.json.ok);
    const status = await api('GET', '/mna/platformvoorwaarden/status?code=' + encodeURIComponent(code));
    const actueelOk = status.status === 200 && !!(status.json && status.json.akkoord === true && status.json.versie === (accept.json && accept.json.versie));
    const ok = acceptOk && actueelOk;
    resultaten.push({ code, ok, acceptStatus: accept.status, statusStatus: status.status });
    if (!ok) {
      throw new Error('platformvoorwaarden-acceptatie mislukt voor code ' + code + ' (acceptStatus=' + accept.status + ' statusStatus=' + status.status + ')');
    }
  }
  return resultaten;
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
