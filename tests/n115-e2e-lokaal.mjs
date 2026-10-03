// N-115 (P1B, 3 okt 2026) — lokale backend voor de gezamenlijke browsertest in
// tests/n115-introductie.spec.js. Laadt de ECHTE handleKoopmandaat uit de gekoppelde backend-checkout
// (../../backend/backend/worker/37-koopmandaat.js) en draait die op één node:sqlite-:memory:-database
// achter dezelfde dunne D1-adapter als backend tests/n115-introductie.mjs (prepare/bind/first/all/run,
// batch als één transactie). Geen kopie of nabootsing van handlerlogica, geen netwerk, geen bestanden:
// de database leeft alleen in dit proces en de aanroeper sluit hem in finally.
// Fail-closed: ontbreekt de backend of node:sqlite, dan gooit maakLokaleBackend() — nooit een skip.
// Alle gegevens zijn synthetisch.

import { randomBytes } from 'node:crypto';

const BACKEND_37 = new URL('../../backend/backend/worker/37-koopmandaat.js', import.meta.url);
// Alleen de bestaande koopmandaatroutes gaan naar de handler; al het andere is voor de aanroeper "onbekend".
const KM_ROUTE = /^\/mna\/koopmandaat\//;
// De browser mag uitsluitend deze headers doorgeven (nooit een beheerderssleutel).
const BROWSER_HEADERS = ['content-type', 'x-tussen-key'];

export async function maakLokaleBackend({ origin }) {
  let DatabaseSync, handleKoopmandaat;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
    ({ handleKoopmandaat } = await import(BACKEND_37.href));
  } catch (e) {
    throw new Error('N-115 E2E: gekoppelde backend of node:sqlite niet laadbaar (' + BACKEND_37.pathname + '): ' + ((e && e.message) || e));
  }
  if (typeof handleKoopmandaat !== 'function') throw new Error('N-115 E2E: handleKoopmandaat ontbreekt in ' + BACKEND_37.pathname);

  const db = new DatabaseSync(':memory:');
  let open = true;
  const env = { ADMIN_KEY: 'SYNTH-ADMIN-' + randomBytes(12).toString('hex') };
  const stmt = (sql) => {
    let args = [];
    const st = {
      bind(...a) { args = a; return st; },
      _run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : { ...r }; },
      async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
      async run() { return st._run(); },
    };
    return st;
  };
  env.DB = {
    prepare(sql) { return stmt(sql); },
    async batch(stmts) {
      db.exec('BEGIN');
      try { const out = stmts.map((s) => s._run()); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
  // Bestaande tabellen zoals initDB ze kent (alleen de kolommen die de routes gebruiken; zelfde fixture als backend).
  db.exec('CREATE TABLE bf_gebruikers (id TEXT PRIMARY KEY, is_eigen INTEGER)');
  db.exec(`CREATE TABLE mna_trajecten (id TEXT PRIMARY KEY, kantoor_naam TEXT, contact_naam TEXT, contact_email TEXT, traject_type TEXT, sector TEXT,
    notitie TEXT, status TEXT, created_at INTEGER, updated_at INTEGER, koper_code TEXT, tussen_code TEXT, begeleider_naam TEXT, begeleider_email TEXT,
    koper_naam TEXT, koper_contact TEXT, koper_email TEXT, opdrachtgever_rol TEXT, gebruiker_id TEXT, trajectfee_type TEXT, trajectfee_bedrag REAL, trajectfee_gepind_op INTEGER)`);

  const cors = { 'Access-Control-Allow-Origin': origin };
  async function roep(method, href, headers, body) {
    const u = new URL(href);
    const init = { method, headers };
    if (body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD') init.body = body;
    const request = new Request(u.href, init);
    const resp = await handleKoopmandaat({
      request, env, ctx: {}, path: u.pathname, url: u, checkRateLimit: () => false, clientIP: '127.0.0.1',
      gebruikerViaToken: async () => null, GV_VERSIE: 'gv-synth', standaardSectoren: ['mkb', 'accountancy'],
    }, () => ({ ...cors }));
    if (!resp) return null;
    return { status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text() };
  }

  return {
    // Verzoek uit de browser (onderschept staging-verzoek) → echte handler. null = geen bekende route.
    async verwerk({ method, url, headers, body }) {
      if (!open) throw new Error('N-115 E2E: lokale database is al gesloten');
      const u = new URL(url);
      if (!KM_ROUTE.test(u.pathname)) return null;
      if (method === 'OPTIONS') {
        return { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': BROWSER_HEADERS.join(', ') }, body: '' };
      }
      const h = {};
      for (const k of BROWSER_HEADERS) if (headers && headers[k]) h[k] = headers[k];
      return roep(method, u.href, h, body);
    },
    // Opzet via de bestaande create- en target-routes (synthetische beheerderssleutel blijft in dit proces).
    async richtIn({ mandaat, target }) {
      const m = await roep('POST', 'https://lokaal.invalid/mna/koopmandaat/create', { 'content-type': 'application/json', 'x-admin-key': env.ADMIN_KEY }, JSON.stringify(mandaat));
      const mj = m && JSON.parse(m.body);
      if (!m || m.status !== 200 || !mj.ok) throw new Error('N-115 E2E: mandaat aanmaken mislukt: ' + (m && m.body));
      const t = await roep('POST', 'https://lokaal.invalid/mna/koopmandaat/' + mj.tussen_code + '/target', { 'content-type': 'application/json', 'x-tussen-key': mj.tussen_code }, JSON.stringify(target));
      const tj = t && JSON.parse(t.body);
      if (!t || t.status !== 200 || !tj.ok) throw new Error('N-115 E2E: target aanmaken mislukt: ' + (t && t.body));
      return { mandaatId: mj.id, begeleiderCode: mj.tussen_code, koperCode: mj.koper_code, targetId: tj.id };
    },
    alle: (sql, ...a) => db.prepare(sql).all(...a).map((r) => ({ ...r })),
    een: (sql, ...a) => { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; },
    // Tabellen waarin `needle` voorkomt (bijv. om te bewijzen dat het ruwe token nergens is opgeslagen).
    dbBevat(needle) {
      const tabellen = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
      return tabellen.filter((t) => JSON.stringify(db.prepare('SELECT * FROM "' + t + '"').all()).includes(needle));
    },
    sluit() { if (open) { open = false; db.close(); } },
  };
}
