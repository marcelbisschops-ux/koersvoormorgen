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
