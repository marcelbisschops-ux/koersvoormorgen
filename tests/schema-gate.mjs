// ══════════════════════════════════════════════════════════════════
// SCHEMA-GATE — bevriest het VELD-oppervlak van elke deal-data-endpoint
// die een respons naar een EXTERNE rol (verkoper / koper / adviseur /
// meekijker) stuurt. BACKLOG 0.2 + SECURITY-INVARIANTS.md invariant 3:
// "een nieuwe DB-kolom verschijnt nooit automatisch in een bestaande
// respons". Dit script maakt dat toetsbaar in plaats van een belofte.
//
// Werking:
//   1. Zet een compleet testtraject op (adviseur + verkoper + koper +
//      meekijker + één DD-fase + één documentversie).
//   2. Roept elke externe endpoint aan per rol en berekent de
//      "veld-signatuur": de gesorteerde set sleutelpaden in de respons
//      (top-level + één niveau in bekende geneste arrays).
//   3. Vergelijkt met tests/schema-baseline.json.
//        · Een TOEGEVOEGD veld  → FAIL (mogelijk lek — expliciet goedkeuren).
//        · Een VERDWENEN veld   → alleen WAARSCHUWING (versmallen is veilig).
//
// Baseline bijwerken NA een bewuste, gereviewde wijziging:
//   ADMIN_KEY=... node tests/schema-gate.mjs --update
//
// Normaal draaien (bijv. in de pre-deploy / CI):
//   ADMIN_KEY=... node tests/schema-gate.mjs
//   node tests/schema-gate.mjs --key=<ADMIN_KEY>
//
// LET OP: draait tegen de LIVE worker (WORKER_URL of de standaard-URL uit
// lib.mjs). Leg de baseline dus vast tegen de staat die je wilt bevriezen —
// idealiter meteen ná een productie-deploy van een gereviewde batch.
// ══════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORKER, leesAdminKey, heeftVlag, api, kleur } from './lib.mjs';

const ADMIN = leesAdminKey();
const UPDATE = heeftVlag('update');
const BASELINE_PAD = join(dirname(fileURLToPath(import.meta.url)), 'schema-baseline.json');
const TEST_EMAIL_DOMEIN = '@e2e-test.koersvoormorgen.invalid';
const WW = 'SchemaGate!' + Date.now();

console.log('\n' + kleur('vet', '╔══════════════════════════════════════════════╗'));
console.log(kleur('vet', '║  SCHEMA-GATE — veld-oppervlak externe endpoints ║'));
console.log(kleur('vet', '╚══════════════════════════════════════════════╝'));
console.log(kleur('grijs', 'Worker : ' + WORKER));
console.log(kleur('grijs', 'Modus  : ' + (UPDATE ? 'BASELINE BIJWERKEN' : 'controleren')));

if (!ADMIN) {
  console.log('\n' + kleur('rood', 'Geen admin-key — dit script heeft ADMIN_KEY nodig (--key=... of env).'));
  process.exit(1);
}

// ── Veld-signatuur: sorteerbare set sleutelpaden, max 3 niveaus diep. ──
// Arrays → union van de sleutels van hun object-elementen, met prefix "[]".
function verzamelPaden(waarde, prefix, uit, diepte) {
  if (diepte > 3 || waarde === null || typeof waarde !== 'object') return;
  if (Array.isArray(waarde)) {
    for (const el of waarde) verzamelPaden(el, prefix + '[]', uit, diepte + 1);
    return;
  }
  for (const sleutel of Object.keys(waarde)) {
    const pad = prefix ? prefix + '.' + sleutel : sleutel;
    uit.add(pad);
    verzamelPaden(waarde[sleutel], pad, uit, diepte + 1);
  }
}
function signatuur(respons) {
  const uit = new Set();
  verzamelPaden(respons, '', uit, 0);
  return [...uit].sort();
}

const snapshots = {}; // { label: string[] }
const notities = [];   // niet-fatale opmerkingen (endpoint leverde te weinig op om te snapshotten)

function leg_vast(label, respons, minVelden) {
  const sig = signatuur(respons);
  if (minVelden && sig.length < minVelden) {
    notities.push(label + ' — respons te mager (' + sig.length + ' velden), niet vastgelegd: ' + JSON.stringify(respons).slice(0, 160));
    return;
  }
  snapshots[label] = sig;
}

let gebruikerId = null;
const trajecten = [];

async function opruimen() {
  for (const code of trajecten) await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  if (gebruikerId) await api('POST', '/gebruikers/deactiveer/' + gebruikerId, { adminKey: ADMIN });
}

async function main() {
  // ── SETUP ──────────────────────────────────────────────────────
  const email = 'schema-gate-' + Date.now() + TEST_EMAIL_DOMEIN;
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Schema Gate Adviseur', bedrijf: 'Schema Gate Kantoor BV', email } });
  gebruikerId = uit.json && uit.json.id;
  const inviteToken = uit.json && uit.json.token;
  if (!inviteToken) { console.log(kleur('rood', 'Adviseur uitnodigen mislukt: ' + JSON.stringify(uit.json))); return false; }
  await api('POST', '/gebruikers/activeer', { body: { token: inviteToken, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  await api('POST', '/gebruikers/verkoop/' + gebruikerId, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true, meekijker: true } } });

  const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Schema Gate Kantoor BV', contact_naam: 'Test Verkoper', contact_email: 'verkoper' + TEST_EMAIL_DOMEIN, koper_naam: 'Schema Gate Koper BV', koper_contact: 'Test Koper', koper_email: 'koper' + TEST_EMAIL_DOMEIN, traject_type: 'Verkoop' } } });
  if (!c.json || !c.json.code) { console.log(kleur('rood', 'Traject aanmaken mislukt: ' + JSON.stringify(c.json))); return false; }
  const T = { code: c.json.code, koper_code: c.json.koper_code, tussen_code: c.json.tussen_code };
  trajecten.push(T.code);
  const advToken = (await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } })).json?.sessie_token;

  // Eén DD-fase met inhoud, daarna vrijgeven aan de koper (force=1 = zonder NDA, alleen voor deze test).
  await api('POST', '/mna/save', { body: { code: T.tussen_code, fase_id: 'financieel', data_json: { omzet1: { label: 'Omzet', value: '1000000' } }, checklist_json: { x: true }, notitie: 'interne notitie' } });
  await api('POST', '/mna/koper-categorieen/' + T.code + '?force=1', { headers: { 'x-tussen-key': T.tussen_code }, body: { categorieen: ['financieel'] } });

  // Eén documentversie (waarderingsrapport — geen e-mail/Signhost nodig) + een NDA-concept.
  await api('POST', '/mna/waardering/rapport', { headers: { 'x-tussen-key': T.tussen_code }, body: { code: T.tussen_code, rapport_tekst: 'schema-gate rapport', cijfers_json: { ebitda: 1, multiple: 2 } } });
  await api('POST', '/mna/document/concept-opslaan', { body: { code: T.tussen_code, doc_type: 'nda', tekst: 'schema-gate NDA-concept' } });

  // Meekijker-code + vertrouwelijkheidsverklaring.
  const mk = await api('POST', '/mna/admin/viewer/aanmaken', { headers: { 'x-tussen-key': T.tussen_code }, body: { traject_id: T.code, viewer_naam: 'Schema Gate Meekijker', viewer_type: 'bank', scope_fase: 'alle', toestemming_bevestigd: true } });
  const mkCode = mk.json && (mk.json.viewer_code || mk.json.code);
  if (mkCode) await api('POST', '/mna/viewer/voorwaarden/accepteren', { body: { code: mkCode } });

  // ── SNAPSHOTS ─────────────────────────────────────────────────
  // 1. /mna/traject/{code} — login-DTO per rol (rate-limit → sla dat trio over).
  for (const [rol, code] of [['verkoper', T.code], ['koper', T.koper_code], ['begeleider', T.tussen_code]]) {
    const r = await api('POST', '/mna/traject/' + code, { body: {} });
    if (r.status === 429) { notities.push('/mna/traject/{' + rol + '} — 429 rate-limit, overgeslagen'); continue; }
    if (r.json && r.json.traject) {
      leg_vast('POST /mna/traject/{code} · ' + rol + ' · traject', r.json.traject, 5);
      if (Array.isArray(r.json.dataRows)) leg_vast('POST /mna/traject/{code} · ' + rol + ' · dataRows[]', r.json.dataRows, 1);
    } else {
      notities.push('/mna/traject/{' + rol + '} — geen traject-object: ' + JSON.stringify(r.json).slice(0, 140));
    }
  }

  // 2. /adviseur/trajecten
  const at = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  if (at.json && Array.isArray(at.json.trajecten)) leg_vast('POST /adviseur/trajecten · trajecten[]', at.json.trajecten, 5);

  // 3. /gebruikers/mna/lijst  +  4. /gebruikers/mna/detail/{code}
  if (advToken) {
    const gl = await api('GET', '/gebruikers/mna/lijst', { headers: { 'x-gebruiker-token': advToken } });
    const glRows = Array.isArray(gl.json) ? gl.json : (gl.json && gl.json.results) || [];
    if (glRows.length) leg_vast('GET /gebruikers/mna/lijst · []', glRows, 5);
    const gd = await api('GET', '/gebruikers/mna/detail/' + T.code, { headers: { 'x-gebruiker-token': advToken } });
    if (gd.json && gd.json.traject) {
      leg_vast('GET /gebruikers/mna/detail/{code} · traject', gd.json.traject, 5);
      if (Array.isArray(gd.json.data)) leg_vast('GET /gebruikers/mna/detail/{code} · data[]', gd.json.data, 1);
      if (Array.isArray(gd.json.documenten)) leg_vast('GET /gebruikers/mna/detail/{code} · documenten[]', gd.json.documenten, 1);
    }
  } else {
    notities.push('/gebruikers/mna/* — geen sessie_token, overgeslagen');
  }

  // 5. /mna/versies/{code}  +  6. /mna/versie/{id}
  const vl = await api('GET', '/mna/versies/' + T.tussen_code, { headers: { 'x-tussen-key': T.tussen_code } });
  if (Array.isArray(vl.json) && vl.json.length) {
    leg_vast('GET /mna/versies/{code} · []', vl.json, 3);
    const vId = vl.json[0].id;
    if (vId) {
      const vd = await api('GET', '/mna/versie/' + vId + '?code=' + T.tussen_code);
      if (vd.json && !vd.json.error) leg_vast('GET /mna/versie/{id}', vd.json, 3);
    }
  }

  // 7. meekijker-routes
  const vi = await api('GET', '/mna/viewer/info?code=' + encodeURIComponent(mkCode || ''));
  if (vi.json && vi.json.ok) leg_vast('GET /mna/viewer/info', vi.json, 5);
  const vdata = await api('GET', '/mna/viewer/data?code=' + encodeURIComponent(mkCode || ''));
  if (vdata.json && vdata.json.ok && Array.isArray(vdata.json.data) && vdata.json.data.length) {
    leg_vast('GET /mna/viewer/data · data[]', vdata.json.data, 1);
  }
  const vdoc = await api('GET', '/mna/viewer/documenten?code=' + encodeURIComponent(mkCode || ''));
  if (vdoc.json && vdoc.json.ok && Array.isArray(vdoc.json.documenten)) {
    if (vdoc.json.documenten.length) leg_vast('GET /mna/viewer/documenten · documenten[]', vdoc.json.documenten, 1);
    else notities.push('/mna/viewer/documenten — lege lijst, niet vastgelegd');
  }

  // ── VERGELIJKEN / BIJWERKEN ───────────────────────────────────
  if (notities.length) {
    console.log('\n' + kleur('geel', 'Opmerkingen (niet-fataal):'));
    notities.forEach(n => console.log('  ' + kleur('grijs', '· ' + n)));
  }

  if (UPDATE) {
    writeFileSync(BASELINE_PAD, JSON.stringify(snapshots, null, 2) + '\n');
    console.log('\n' + kleur('groen', '✓ Baseline bijgewerkt: ') + BASELINE_PAD);
    console.log(kleur('grijs', '  ' + Object.keys(snapshots).length + ' endpoints × rol vastgelegd.'));
    return true;
  }

  if (!existsSync(BASELINE_PAD)) {
    console.log('\n' + kleur('rood', 'Geen baseline gevonden (' + BASELINE_PAD + ').'));
    console.log(kleur('grijs', 'Leg er eerst één vast met --update, tegen een gereviewde/gedeployede staat.'));
    return false;
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PAD, 'utf8'));

  let faal = 0, waarschuw = 0, ok = 0;
  const alleLabels = [...new Set([...Object.keys(baseline), ...Object.keys(snapshots)])].sort();
  console.log('\n' + kleur('vet', 'Vergelijking met baseline:'));
  for (const label of alleLabels) {
    const oud = baseline[label];
    const nieuw = snapshots[label];
    if (!nieuw) { console.log('  ' + kleur('geel', '⊘') + ' ' + label + kleur('grijs', ' — niet in deze run (endpoint leverde niets bruikbaars)')); waarschuw++; continue; }
    if (!oud) { console.log('  ' + kleur('rood', '✗') + ' ' + label + kleur('grijs', ' — NIEUW endpoint, nog niet in baseline (draai --update na review)')); faal++; continue; }
    const toegevoegd = nieuw.filter(p => !oud.includes(p));
    const verdwenen = oud.filter(p => !nieuw.includes(p));
    if (toegevoegd.length) { console.log('  ' + kleur('rood', '✗') + ' ' + label + kleur('rood', ' — TOEGEVOEGDE velden: ' + toegevoegd.join(', '))); faal++; }
    else if (verdwenen.length) { console.log('  ' + kleur('geel', '⚠') + ' ' + label + kleur('grijs', ' — verdwenen velden (veilig): ' + verdwenen.join(', '))); waarschuw++; }
    else { console.log('  ' + kleur('groen', '✓') + ' ' + label); ok++; }
  }

  console.log('\n' + kleur('vet', '─────────── SAMENVATTING ───────────'));
  console.log(kleur('groen', ok + ' ongewijzigd') + '  ·  '
    + (faal ? kleur('rood', faal + ' met TOEGEVOEGD veld') : '0 met toegevoegd veld') + '  ·  '
    + kleur('geel', waarschuw + ' waarschuwing'));
  if (faal) {
    console.log('\n' + kleur('rood', 'FAIL: minstens één externe endpoint geeft een veld terug dat niet in de baseline staat.'));
    console.log(kleur('grijs', 'Is de uitbreiding bewust + gereviewd? Werk de baseline bij met --update. Zo niet: dicht het lek.'));
  }
  return faal === 0;
}

let succes = false;
try { succes = await main(); }
catch (e) { console.log('\n' + kleur('rood', 'Onverwachte fout: ' + (e && e.stack || e))); succes = false; }
finally { await opruimen(); }
process.exit(succes ? 0 : 1);
