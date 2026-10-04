// Generieke koopmandaat-targetflow (GO 4 okt 2026) — volledige gebruikersflow in de echte pagina's
// (mna.html koopmandaatscherm, introductie.html, adv.html P1C en, live, het reguliere traject) in
// Chromium, met een koopmandaat dat eerst LEEG wordt opgeslagen/gesloten/heropend en daarna DRIE
// targets A, B en C krijgt:
//   A — volledig: metadata, concept → vaststellen → link → eigen mailprogramma → verzending vastleggen →
//       akkoord van de onderneming → teaser → voorstellen → koperkeuze → match → afzonderlijke vrijgave →
//       P1C-promotie met kostenbevestiging → (live) gewone verkoper in het bestaande reguliere traject;
//   B — andere status: wijzigingsverzoek van de onderneming, daarna archiveren → herstellen → archiveren;
//   C — eigen status/contactlog, blijft na de promotie van A los bruikbaar.
// Daarnaast rolproeven (koper/begeleider/ander mandaat) en de onafhankelijkheid van B en C.
//
// Twee strikt gescheiden modi. De ene telt NOOIT als bewijs voor de andere:
//
// 1. LOKAAL (standaard) — "lokaal geïntercepteerd". Verzoeken naar de staging-host worden onderschept:
//    /mna/koopmandaat/… gaat naar de ECHTE handleKoopmandaat uit de gekoppelde backend op één
//    node:sqlite-database (tests/n115-e2e-lokaal.mjs); de adviseurslogin van adv.html en de sectorlijst
//    zijn synthetische fixtures; al het andere buiten localhost wordt afgebroken en geteld. Bewijst de UI
//    plus het koopmandaatdeel van het backendcontract, niet dat staging werkt. Het reguliere traject na
//    de promotie (verkoper → adviseur → selectieve vrijgave → koper) zit niet in de lokale handler en
//    wordt lokaal bewust overgeslagen, niet als geslaagd geteld.
//
// 2. LIVE (KVM_TARGETFLOW_LIVE=1 en WORKER_URL=<staging-worker>) — echte verzoeken naar de bestaande
//    staging-host, nooit productie (elke andere host wordt afgebroken). Sleutels uitsluitend tijdens het
//    draaien via de bestaande helpers in tests/lib.mjs (leesAdminKey, TEST_CLEANUP_KEY, d1 via wrangler,
//    zetMfaUitVoorTest); niets wordt weggeschreven, trace/screenshot/video staan uit en codes, tokens en
//    sessies worden in eigen meldingen gemaskeerd. Alle data is synthetisch (.test-adressen) met een
//    eigen run-id en wordt in finally opgeruimd via de bestaande staging-opruimroutes, met een
//    onafhankelijke D1-telling. Pas een geslaagde live-run (door de coördinator) is bewijs dat de
//    gebruikersflow op staging werkt; ook dan geldt het niet als productie- of juridische acceptatie.
//    De rate-limiter op /mna/traject/{code} telt per IP (~8 inlogpogingen per run): niet direct na
//    andere rolflow-suites draaien.
//
// Nooit uitgevoerd, in geen van beide modi: echte e-mailbezorging. De bestaande knop "E-mail openen in
// uw mailprogramma" wordt echt geklikt; alleen de laatste stap (het besturingssysteem opent het
// mailprogramma) wordt opgevangen om de mailto-inhoud te controleren. Bezorging staat als annotatie
// "niet uitgevoerd" in het rapport, nooit als geslaagd.
//
// Draaien:
//   npx playwright test tests/koopmandaat-targetflow.spec.js                       (lokaal)
//   KVM_TARGETFLOW_LIVE=1 WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//     npx playwright test tests/koopmandaat-targetflow.spec.js                     (live staging)

import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { maakLokaleBackend } from './n115-e2e-lokaal.mjs';
import { api, leesAdminKey, IS_STAGING_WORKER, d1, zetMfaUitVoorTest, ruimTrajectOp, ruimTestKoopmandaatOp, verwijderTestGebruiker } from './lib.mjs';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const W = encodeURIComponent(STAGING);
const LIVE = process.env.KVM_TARGETFLOW_LIVE === '1';
const RUN = randomBytes(3).toString('hex');
const kvk = () => '9' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0');

// ── Synthetische gegevens (eigen run-id; geen echte klant-, contact- of bedrijfsgegevens) ──
const MANDAAT = { koper_naam: 'Synth Koper TF ' + RUN + ' BV', koper_contact_naam: 'Synth Koperscontact ' + RUN, koper_contact_email: 'koper-' + RUN + '@voorbeeld.test', zoekt_sectoren: 'accountancy' };
const A = {
  naam: 'Synth Alfa TF ' + RUN + ' BV', anonieme_naam: 'Project Synth-Noord ' + RUN, sector: 'accountancy', kvk_nummer: kvk(), rechtsvorm: 'B.V.',
  bedrijfsadres: 'Synthstraat 1, 9999 ZZ Synthdorp', contact_naam: 'Synth Contact Alfa ' + RUN, contact_email: 'alfa-' + RUN + '@voorbeeld.test',
  contact_telefoon: '+31 6 0000 0001', eerste_benadering_op: '2026-10-01', eerste_benadering_kanaal: 'telefoon', status: 'benaderd', notities: 'SYNTH-C-NOTITIE-A-' + RUN,
};
const B = { naam: 'Synth Beta TF ' + RUN + ' BV', sector: 'accountancy', contact_naam: 'Synth Contact Beta ' + RUN, contact_email: 'beta-' + RUN + '@voorbeeld.test', status: 'nieuw' };
const C = { naam: 'Synth Gamma TF ' + RUN + ' BV', sector: 'accountancy', status: 'in_gesprek', notities: 'SYNTH-C-NOTITIE-C-' + RUN };
const TEASER_A = 'Synthetisch anoniem administratiekantoor ' + RUN;
const AKKOORD_A = 'Synth Akkoordgever ' + RUN;
const WIJZIGING_B = 'Synthetisch wijzigingsverzoek B ' + RUN;
const CONTACT_C = 'Synth contactmoment C ' + RUN;
const OPEN_PUNT = 'Synthetisch ingevuld voor de test: er is geen bestaande afspraak over introductiebescherming.';
const KOPER_VELDEN = ['id', 'status', 'vrijgave_status', 'teaser', 'naam', 'sector', 'traject_ref', 'koper_interesse', 'interesse_mogelijk'];

// ── Maskering: codes, tokens, sessies en sleutels nooit in eigen meldingen ──
const geheimen = new Map();
const registreer = (waarde, label) => { if (waarde && String(waarde).length >= 4) geheimen.set(String(waarde), label); return waarde; };
const maskeer = (s) => {
  let t = String(s);
  for (const [w, l] of geheimen) t = t.split(w).join('<' + l + '>');
  return t.replace(/(introductie\/|token=)[A-Za-z0-9_-]{20,}/g, '$1<token>');
};
const waar = (voorwaarde, melding) => expect(!!voorwaarde, maskeer(melding)).toBe(true);
const annoteer = (type, tekst) => test.info().annotations.push({ type, description: maskeer(tekst) });

// ── Lokale omgeving: echte koopmandaathandler + node:sqlite, adviseurslogin als fixture ──
async function lokaleOmgeving(baseURL) {
  const origin = new URL(baseURL).origin;
  const backend = await maakLokaleBackend({ origin });
  const sessie = backend.registreerSessie({ is_eigen: 1 });
  const net = { staging: [], extern: [] };
  const adviseur = { email: 'adviseur-' + RUN + '@voorbeeld.test', wachtwoord: 'synthetisch-wachtwoord-' + RUN };
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, x-tussen-key, x-gebruiker-token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' };
  // Fixture voor wat de lokale handler niet kent: de bestaande adviseurslogin en de sectorlijst van
  // adv.html (alleen daar; mna.html houdt zijn eigen sectorprofielen, net als in n115-introductie.spec.js).
  const fixture = (method, pad, headers, body, vanAdv) => {
    if (!vanAdv) return null;
    if (pad === '/adviseur/trajecten' && method === 'POST') {
      if (headers['x-gebruiker-token'] !== sessie && !/wachtwoord/.test(body || '')) return { status: 401, json: { error: 'Inloggegevens onjuist.' } };
      return { json: { ok: true, sessie_token: sessie, naam: 'Synth Adviseur', bedrijf: 'Synth Kantoor', trajecten: [], traject_limiet: 5, modules: { traject: true }, voorwaarden: { gv_akkoord: true } } };
    }
    if (pad === '/mna/sectorprofielen') return { json: { ok: true, profielen: { accountancy: { label: 'Accountancy & administratie' }, mkb: { label: 'MKB' } } } };
    return null;
  };
  const vanAdv = (req) => { try { return new URL(req.frame().url()).pathname === '/adv.html'; } catch (e) { return false; } };
  return {
    modus: 'lokaal', net, adviseur, staat: { targetIds: [] },
    async opzet() {
      const m = await backend.maakMandaat(Object.assign({ begeleider_naam: 'Synth Begeleider TF ' + RUN }, MANDAAT));
      return { mandaatId: m.mandaatId, T: m.begeleiderCode, K: m.koperCode };
    },
    async routeer(route, rol) {
      const req = route.request();
      const u = new URL(req.url());
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
      if (u.origin !== STAGING) { net.extern.push(u.origin + u.pathname); return route.abort(); }
      const regel = { rol, method: req.method(), pad: u.pathname, body: req.postData(), status: null };
      net.staging.push(regel);
      const r = await backend.verwerk({ method: req.method(), url: u.href, headers: req.headers(), body: req.postData() });
      if (r) { regel.status = r.status; return route.fulfill({ status: r.status, headers: r.headers, body: r.body }); }
      if (req.method() === 'OPTIONS') { regel.status = 204; return route.fulfill({ status: 204, headers: cors }); }
      const f = fixture(req.method(), u.pathname, req.headers(), req.postData(), vanAdv(req));
      regel.status = f ? (f.status || 200) : 404;
      return route.fulfill({ status: regel.status, headers: cors, contentType: 'application/json', body: JSON.stringify(f ? f.json : { error: 'fixture: onbekend' }) });
    },
    async direct(method, pad, headers, body) {
      const r = await backend.roepDirect(method, pad, headers, body);
      if (!r) return { status: 0, json: null };
      let json = null;
      try { json = JSON.parse(r.body); } catch (e) { json = null; }
      return { status: r.status, json };
    },
    rijen: (sql, params = []) => backend.alle(sql, ...params),
    async anderMandaat() { const m = await backend.maakMandaat({ koper_naam: 'Synth Ander Mandaat ' + RUN }); return m.begeleiderCode; },
    async opruimen() { backend.sluit(); return { problemen: [], rest: [] }; },
  };
}

// ── Live omgeving: bestaande staging-host, synthetische adviseur, bestaande helpers en opruimroutes ──
function vul(sql, params) {
  let i = 0;
  return sql.replace(/\?/g, () => "'" + String(params[i++]).replace(/'/g, "''") + "'");
}
function liveOmgeving() {
  const net = { staging: [], extern: [] };
  const staat = { gid: null, mandaatId: null, T: null, trajectId: null, targetIds: [] };
  const regels = new WeakMap(); // Playwright-request → netwerkregel, voor de status uit het response-event
  const adviseur = { email: 'koopmandaat-tf-' + RUN + '-' + Date.now() + '@voorbeeld.test', wachtwoord: 'Synth-' + randomBytes(12).toString('base64url') + '!9' };
  registreer(adviseur.wachtwoord, 'wachtwoord');
  let ADMIN = '';
  return {
    modus: 'live', net, adviseur, staat,
    async opzet() {
      if (!IS_STAGING_WORKER) throw new Error('Live-modus weigert: WORKER_URL is niet exact de staging-worker. Er is niets aangemaakt; nooit productie.');
      ADMIN = leesAdminKey();
      if (!ADMIN) throw new Error('Live-modus: geen staging-beheerderssleutel via leesAdminKey() (tests/lib.mjs). Er is niets aangemaakt.');
      registreer(ADMIN, 'beheerderssleutel');
      if (!process.env.TEST_CLEANUP_KEY) throw new Error('Live-modus: TEST_CLEANUP_KEY ontbreekt (tests/.env.staging.local). Zonder veilige opruiming wordt niets aangemaakt.');
      registreer(process.env.TEST_CLEANUP_KEY, 'opruimsleutel');
      // Synthetische adviseur (eigen kantoor via de bestaande uitnodiging), zoals de bestaande suites.
      const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Synth TF Adviseur ' + RUN, bedrijf: 'Synth TF Kantoor ' + RUN, email: adviseur.email } });
      staat.gid = uit.json && uit.json.id;
      if (!staat.gid || !uit.json.token) throw new Error('Live-opzet: synthetische adviseur uitnodigen mislukt (status ' + uit.status + ').');
      registreer(uit.json.token, 'uitnodigingstoken');
      const act = await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: adviseur.wachtwoord } });
      const sessie = act.json && act.json.sessie_token;
      if (!sessie) throw new Error('Live-opzet: activeren mislukt (status ' + act.status + ').');
      registreer(sessie, 'sessie');
      const gv = await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email: adviseur.email, wachtwoord: adviseur.wachtwoord } });
      if (gv.status !== 200) throw new Error('Live-opzet: gebruiksvoorwaarden accepteren mislukt (status ' + gv.status + ').');
      const mfa = zetMfaUitVoorTest(adviseur.email);
      if (!mfa.ok) throw new Error('INFRA: verificatiecode voor de synthetische adviseur niet uit te zetten (' + String(mfa.reden).slice(0, 160) + '). Geen productbevinding.');
      const vk = await api('POST', '/gebruikers/verkoop/' + staat.gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } } });
      if (vk.status !== 200) throw new Error('Live-opzet: trajectlimiet/modules instellen mislukt (status ' + vk.status + ').');
      // Koopmandaat van deze adviseur via de bestaande adviseursroute (er is geen aanmaakscherm in mna.html).
      const m = await api('POST', '/adviseur/koopmandaat/create', { headers: { 'x-gebruiker-token': sessie }, body: MANDAAT });
      if (!m.json || !m.json.ok) throw new Error('Live-opzet: koopmandaat aanmaken mislukt (status ' + m.status + ').');
      staat.mandaatId = m.json.id; staat.T = m.json.tussen_code;
      registreer(m.json.tussen_code, 'mandaatcode-begeleider'); registreer(m.json.koper_code, 'mandaatcode-koper');
      return { mandaatId: m.json.id, T: m.json.tussen_code, K: m.json.koper_code };
    },
    async routeer(route, rol) {
      const req = route.request();
      const u = new URL(req.url());
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
      if (u.origin !== STAGING) { net.extern.push(u.origin + u.pathname); return route.abort(); }
      const regel = { rol, method: req.method(), pad: u.pathname, body: req.postData(), status: null };
      net.staging.push(regel);
      // Live verzoeken gaan ongewijzigd door; de werkelijke status komt uit het response-event (koppel).
      regels.set(req, regel);
      return route.continue();
    },
    koppel(context) {
      context.on('response', (resp) => { const regel = regels.get(resp.request()); if (regel) regel.status = resp.status(); });
    },
    async direct(method, pad, headers, body) { const r = await api(method, pad, { headers, body }); return { status: r.status, json: r.json }; },
    rijen: (sql, params = []) => d1(vul(sql, params)),
    async anderMandaat() { return null; },
    async opruimen() {
      const problemen = [], rest = [];
      if (!ADMIN) return { problemen, rest };
      if (staat.trajectId) { const r = await ruimTrajectOp(staat.trajectId, ADMIN); if (!r.ok) problemen.push('promotietraject niet opgeruimd (status ' + r.status + ')'); }
      if (staat.mandaatId) { const r = await ruimTestKoopmandaatOp(staat.mandaatId, staat.T); if (!r.ok) problemen.push('koopmandaat niet opgeruimd (status ' + r.status + ')'); }
      if (staat.gid) { const r = await verwijderTestGebruiker(staat.gid, ADMIN); if (!r.ok) problemen.push('synthetische adviseur niet verwijderd (status ' + r.status + ')'); }
      // Onafhankelijke telling rechtstreeks in de staging-D1 (niet via de API die net is aangeroepen).
      try {
        const tel = (sql, p) => Number((d1(vul(sql, p))[0] || {}).n);
        if (staat.mandaatId) {
          if (tel('SELECT COUNT(*) AS n FROM mna_koopmandaat WHERE id=?', [staat.mandaatId])) problemen.push('koopmandaat staat nog in D1');
          if (tel('SELECT COUNT(*) AS n FROM mna_koopmandaat_target WHERE mandaat_id=?', [staat.mandaatId])) problemen.push('targets staan nog in D1');
          const b = tel('SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE mandaat_id=?', [staat.mandaatId]);
          if (b) rest.push(b + ' synthetische bewijs-/historieregel(s) (buiten de cascade van de bestaande opruimroute)');
        }
        for (const id of staat.targetIds) {
          const v = tel('SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_versie WHERE target_id=?', [id]);
          if (v) rest.push(v + ' synthetische introductieversie(s) van een opgeruimde target');
        }
        if (staat.trajectId && tel('SELECT COUNT(*) AS n FROM mna_trajecten WHERE id=?', [staat.trajectId])) problemen.push('promotietraject staat nog in D1');
        if (staat.gid && tel('SELECT COUNT(*) AS n FROM bf_gebruikers WHERE id=?', [staat.gid])) problemen.push('synthetische adviseur staat nog in D1');
      } catch (e) {
        problemen.push('onafhankelijke D1-telling mislukt: ' + String((e && e.message) || e).slice(0, 200));
      }
      return { problemen, rest };
    },
  };
}

// ── Gedeelde UI-helpers ──
const kaart = (page, id) => page.locator('.km-target-kaart[data-id="' + id + '"]');
const tag = (page, id) => kaart(page, id).locator('.tag').first();
const tfKnop = (page, id, actie, waarde) => page.locator('.km-tf-actie[data-id="' + id + '"][data-actie="' + actie + '"]' + (waarde ? '[data-waarde="' + waarde + '"]' : ''));
const stap = (page, id, s) => kaart(page, id).locator('.km-tf-stap[data-stap="' + s + '"]');
const ververs = (page) => page.evaluate(() => kmRefresh());

async function loginMandaat(page, code) {
  await page.goto('/mna.html?worker=' + W);
  await page.fill('#l-code', code);
  await page.click('#l-btn');
  await expect(page.locator('#km-uitloggen')).toBeVisible({ timeout: 30000 });
}

async function openArchief(page) {
  const det = page.locator('#km-archief');
  await expect(det).toBeVisible();
  if (!(await det.evaluate((e) => e.open))) await det.locator('summary').click();
}

async function voegTargetToe(page, T, t) {
  await page.click('#km-nieuw-target-btn');
  await expect(page.locator('#km-target-modal')).toBeVisible();
  for (const k of ['naam', 'anonieme_naam', 'sector', 'kvk_nummer', 'rechtsvorm', 'bedrijfsadres', 'contact_naam', 'contact_email', 'contact_telefoon', 'eerste_benadering_op', 'eerste_benadering_kanaal']) {
    if (t[k]) await page.fill('#kmt-' + k, t[k]);
  }
  await page.selectOption('#kmt-status', t.status);
  if (t.notities) await page.fill('#kmt-notities', t.notities);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/mna/koopmandaat/' + T + '/target'),
    page.click('#kmt-ok'),
  ]);
  const j = await resp.json();
  waar(resp.status() === 200 && j.ok === true && j.targetflow === 'generiek' && j.status === t.status && !!j.id, 'target "' + t.naam + '" aangemaakt in de generieke targetflow met startstatus ' + t.status + ' (status ' + resp.status() + ')');
  await expect(page.locator('#km-target-modal')).toHaveCount(0);
  await expect(kaart(page, j.id)).toBeVisible();
  return j.id;
}

// Concept laden → open punten invullen → vaststellen → (optioneel teaser) → link. Geeft tekst en link.
async function bevestigingTotLink(page, id, { teaser } = {}) {
  await kaart(page, id).locator('.km-intro-btn').click();
  const modal = page.locator('#km-intro-modal');
  await expect(page.locator('#km-intro-titel')).toContainText('Bemiddelings-/introductiebevestiging');
  await expect(modal).toContainText('geen bemiddelingsovereenkomst (BEM)');
  await page.click('#km-intro-concept');
  await expect(page.locator('#km-intro-concept-info')).toContainText('Niet door AI');
  const concept = await page.locator('#km-intro-tekst').inputValue();
  waar(concept.startsWith('BEMIDDELINGS-/INTRODUCTIEBEVESTIGING') && concept.includes('[in te vullen:'), 'concept uit het vaste sjabloon in het tekstvak, met open punten');
  const tekst = concept.replace(/\[in te vullen:[^\]]*\]/g, OPEN_PUNT);
  await page.fill('#km-intro-tekst', tekst);
  await page.click('#km-intro-versie');
  await expect(page.locator('#km-intro-melding')).toContainText('Versie vastgesteld.');
  await expect(modal).toContainText('Versie 1');
  await expect(modal).toContainText('Nog geen akkoord op deze versie');
  if (teaser) {
    await page.selectOption('#km-teaser-regio', 'zuid');
    await page.selectOption('#km-teaser-omzet', '1m_2_5m');
    await page.fill('#km-teaser-omschrijving', teaser);
    await page.check('#km-teaser-akkoord');
    await page.click('#km-teaser-opslaan');
    await expect(page.locator('#km-intro-melding')).toContainText('Teaser goedgekeurd en opgeslagen.');
  }
  await page.click('#km-intro-link-uit');
  await expect.poll(async () => /\/introductie\.html\?token=/.test(await page.locator('#km-intro-link').inputValue().catch(() => '')), { timeout: 15000 }).toBe(true);
  const link = await page.locator('#km-intro-link').inputValue();
  const token = registreer(new URL(link).searchParams.get('token'), 'link-token-' + id);
  waar(link === new URL(page.url()).origin + '/introductie.html?token=' + token + '&worker=' + W && /^[A-Za-z0-9_-]{43}$/.test(token), 'doelgebonden link naar introductie.html met de bekende staging-worker');
  await expect(page.locator('#km-intro-verzending')).toContainText('Link aangemaakt op');
  await expect(page.locator('#km-intro-verzending')).toContainText('Nog niet vastgelegd');
  return { tekst, link, token };
}

// Platformvoorwaarden (bestaande popup) accepteren als die verschijnt; daarna wachten op de rol.
// pvw-ok roept na akkoord opnieuw de login aan (lb.click()); secCanLogin weigert die binnen de bestaande
// SEC.LOGIN_COOLDOWN_MS na de vorige poging. Daarom vóór de klik wachten tot die cooldown voorbij is —
// SEC zelf blijft ongemoeid. Bij falen alleen gemaskeerde diagnostiek (rol/scherm/zichtbare meldingen).
async function naTrajectLogin(page, rol) {
  try {
    await page.waitForFunction(() => !!document.getElementById('pvw-ok') || !!(window.S && S.traject && S.rol), null, { timeout: 30000 });
    if (await page.locator('#pvw-ok').count()) {
      await page.waitForFunction(() => typeof SEC !== 'undefined' && Date.now() - SEC.lastAttemptAt >= SEC.LOGIN_COOLDOWN_MS, null, { timeout: 10000 });
      await page.click('#pvw-ok');
    }
    await page.waitForFunction((r) => !!(window.S && S.traject && S.rol === r), rol, { timeout: 30000 });
  } catch (e) {
    const diag = await page.evaluate(() => {
      const tekst = (el) => (el && el.offsetParent !== null ? el.innerText.trim().slice(0, 200) : null);
      return {
        rol: (window.S && S.rol) || null,
        screen: (window.S && S.screen) || null,
        l_err: tekst(document.getElementById('l-err')),
        pvw_err: tekst(document.getElementById('pvw-err')),
        toast: [...document.querySelectorAll('#toast-container > *')].map((t) => t.innerText.trim().slice(0, 200)),
      };
    }).catch(() => ({ diagnostiek: 'niet beschikbaar' }));
    throw new Error(maskeer('naTrajectLogin(' + rol + ') faalde: ' + String((e && e.message) || e).split('\n')[0].slice(0, 200) + ' · diagnostiek ' + JSON.stringify(diag)));
  }
}
const zichtbaar = (page, waarde) => page.evaluate((w) => document.body.innerText.includes(w) || [...document.querySelectorAll('input,textarea')].some((e) => e.value === w), waarde);
const naarFase = (page, fase) => page.evaluate((f) => { S.screen = 'main'; S.fase = FASES.findIndex((x) => x.id === f); renderApp(); }, fase);

// ── De gedeelde flow (beide modi) ──
async function doorloopFlow({ browser, baseURL, omg }) {
  const contexten = [];
  let primaireFout = null;
  const dialogen = [];
  const promptAntwoorden = [];
  const net = omg.net;
  const koppelDialogen = (page, rol) => page.on('dialog', async (d) => {
    dialogen.push({ rol, soort: d.type(), tekst: d.message() });
    if (d.type() === 'prompt') await d.accept(promptAntwoorden.length ? promptAntwoorden.shift() : '');
    else await d.accept();
  });
  async function nieuwePagina(rol) {
    const context = await browser.newContext({ baseURL });
    contexten.push(context);
    if (omg.koppel) omg.koppel(context);
    await context.route('**/*', (route) => omg.routeer(route, rol));
    const page = await context.newPage();
    koppelDialogen(page, rol);
    return page;
  }
  const posts = (pad, actie) => net.staging.filter((r) => r.method === 'POST' && r.pad === pad && (!actie || JSON.parse(r.body || '{}').actie === actie));
  const body = (r) => JSON.parse(r.body || '{}');
  const telRij = async (sql, params) => Number(((await omg.rijen(sql, params))[0] || {}).n);

  try {
    const { T, K } = await omg.opzet();
    registreer(T, 'mandaatcode-begeleider'); registreer(K, 'mandaatcode-koper');
    const tPad = (id) => '/mna/koopmandaat/' + T + '/target/' + id;

    // ── 0. Koopmandaat met 0 targets: opgeslagen, gesloten en heropend ──
    const bPage = await nieuwePagina('begeleider');
    await test.step('0 · leeg koopmandaat opslaan, sluiten en heropenen', async () => {
      await loginMandaat(bPage, T);
      await expect(bPage.locator('body')).toContainText('Potentiële targets (0)');
      await expect(bPage.locator('body')).toContainText('Nog geen targets toegevoegd.');
      await expect(bPage.locator('body')).toContainText(MANDAAT.koper_naam);
      await bPage.click('#km-uitloggen');
      await expect(bPage.locator('#l-code')).toBeVisible();
      await loginMandaat(bPage, T);
      await expect(bPage.locator('body')).toContainText('Potentiële targets (0)');
      await expect(bPage.locator('body')).toContainText(MANDAAT.koper_naam);
      await expect(bPage.locator('body')).toContainText('Zoekprofiel:');
    });
    const kPage = await nieuwePagina('koper');
    await test.step('0 · koper van het lege mandaat', async () => {
      await loginMandaat(kPage, K);
      await expect(kPage.locator('body')).toContainText('Nog geen targets toegevoegd.');
      await expect(kPage.locator('#km-nieuw-target-btn')).toHaveCount(0);
    });

    // ── 1. Drie targets A, B, C via het echte formulier; bewerken, status en contactlog ──
    let idA, idB, idC;
    await test.step('1 · drie targets toevoegen (altijd generiek) en elk apart bewerken', async () => {
      idA = await voegTargetToe(bPage, T, A);
      idB = await voegTargetToe(bPage, T, B);
      idC = await voegTargetToe(bPage, T, C);
      omg.staat.targetIds.push(idA, idB, idC);
      await expect(bPage.locator('body')).toContainText('Potentiële targets (3)');
      await expect(bPage.locator('.km-target-kaart[data-targetflow="generiek"]')).toHaveCount(3);
      waar(posts('/mna/koopmandaat/' + T + '/target').every((r) => body(r).targetflow === 'generiek') && posts('/mna/koopmandaat/' + T + '/target').length === 3, 'alle drie nieuwe targets met targetflow "generiek"');
      const a = kaart(bPage, idA);
      for (const s of ['Interne anonieme naam: ' + A.anonieme_naam, 'alleen intern', A.kvk_nummer, A.rechtsvorm, A.bedrijfsadres, A.contact_naam, A.contact_email, A.contact_telefoon, 'telefoon']) await expect(a).toContainText(s);

      // B bewerken: alleen gewijzigde velden, alleen op B
      await tfKnop(bPage, idB, 'bewerk_formulier').click();
      await expect(bPage.locator('#kmt-contact_email')).toHaveValue(B.contact_email);
      await bPage.fill('#kmt-contact_telefoon', '+31 6 0000 0002');
      await bPage.fill('#kmt-rechtsvorm', 'V.O.F.');
      await bPage.click('#kmt-ok');
      await expect(bPage.locator('#km-target-modal')).toHaveCount(0);
      await expect(kaart(bPage, idB)).toContainText('V.O.F.');
      const bew = posts(tPad(idB) + '/targetflow');
      waar(bew.length === 1 && JSON.stringify(body(bew[0])) === JSON.stringify({ actie: 'bewerken', rechtsvorm: 'V.O.F.', contact_telefoon: '+31 6 0000 0002' }) && posts(tPad(idA) + '/targetflow').length === 0,
        'bewerken van B: actie "bewerken" met uitsluitend de gewijzigde velden, niets op A');

      // C: eigen status en contactmoment
      await bPage.selectOption('#km-status-' + idC, 'geparkeerd');
      await expect(tag(bPage, idC)).toHaveText('Geparkeerd');
      await bPage.fill('.km-contact-input[data-id="' + idC + '"]', CONTACT_C);
      await bPage.click('.km-contact-toevoegen[data-id="' + idC + '"]');
      await expect(kaart(bPage, idC)).toContainText(CONTACT_C);
      waar(posts(tPad(idC)).map(body).some((x) => x.status === 'geparkeerd') && posts(tPad(idC)).map(body).some((x) => x.contact_toevoegen === CONTACT_C), 'status en contactmoment van C via de bestaande target-route op C');
      await expect(tag(bPage, idA)).toHaveText('Benaderd');
      await expect(tag(bPage, idB)).toHaveText('Nieuw');
    });

    // ── 2. A: concept → vaststellen → teaser → link → eigen mailprogramma → verzending vastleggen ──
    let bevA;
    await test.step('2 · A: bevestiging vaststellen, link, mailprogramma, verzending vastleggen', async () => {
      bevA = await bevestigingTotLink(bPage, idA, { teaser: TEASER_A });
      await expect(bPage.locator('#km-intro-cnaam')).toHaveValue(A.contact_naam);
      await expect(bPage.locator('#km-intro-cemail')).toHaveValue(A.contact_email);
      waar(net.staging.some((r) => r.method === 'GET' && r.pad === tPad(idA) + '/introductie/concept') && posts(tPad(idA) + '/introductie', 'versie').length === 1,
        'concept via de nieuwe scoped GET-route; vaststellen via de bestaande actie "versie" (één keer)');
      waar(dialogen.some((d) => d.tekst.startsWith('Versie 1 van de bemiddelings-/introductiebevestiging vaststellen?')), 'vaststellen vraagt een bevestiging met de nieuwe documentnaam');

      // Bestaande mailprogrammaknop echt klikken; alleen de overdracht aan het besturingssysteem opvangen.
      await bPage.evaluate(() => { window.__mailto = []; window.kmOpenMailprogramma = (u) => { window.__mailto.push(u); }; });
      await bPage.click('#km-intro-mail');
      const mailto = await bPage.evaluate(() => window.__mailto[0] || '');
      const q = new URLSearchParams(mailto.slice(mailto.indexOf('?') + 1));
      waar(mailto.startsWith('mailto:' + A.contact_email + '?') && q.get('subject') === 'Bemiddelings-/introductiebevestiging — uw beoordeling'
        && (q.get('body') || '').startsWith('Geachte ' + A.contact_naam + ',') && (q.get('body') || '').includes(bevA.link) && (q.get('body') || '').includes('bemiddelings-/introductiebevestiging'),
        'mailprogrammaknop: mailto naar de contactpersoon (één bron) met de nieuwe documentnaam en de doelgebonden link');
      waar(net.staging.every((r) => !String(r.body || '').includes(bevA.token)), 'het linktoken gaat nooit in een verzoek naar de server');
      annoteer('niet uitgevoerd', 'Externe e-mailbezorging: de begeleider verstuurt zelf vanuit het eigen mailprogramma; het platform verstuurt niets en bevestigt geen bezorging. Gecontroleerd is alleen de inhoud van de mailto-overdracht.');

      // "Link aangemaakt" is nog geen "verzonden"
      await bPage.click('#km-intro-sluit');
      await expect(stap(bPage, idA, 'link')).toHaveAttribute('data-klaar', '1');
      await expect(stap(bPage, idA, 'verzonden')).toHaveAttribute('data-klaar', '0');
      await expect(kaart(bPage, idA).locator('.km-tf-volgende')).toContainText('leg de verzending vast');

      await kaart(bPage, idA).locator('.km-intro-btn').click();
      await bPage.click('#km-intro-verzonden');
      await expect(bPage.locator('#km-intro-verzending')).toContainText('Verzending vastgelegd op');
      waar(dialogen.some((d) => d.tekst.includes('kan niet controleren of de e-mail is aangekomen')), 'vastleggen van de verzending zegt expliciet dat het platform geen bezorging kan bevestigen');
      const vz = posts(tPad(idA)).map(body).filter((x) => typeof x.contact_toevoegen === 'string');
      waar(vz.length === 1 && vz[0].contact_toevoegen.startsWith('Introductiebevestiging verzonden (versie 1)') && vz[0].contact_toevoegen.includes('geen bezorgbevestiging'), 'verzending vastgelegd als eigen contactmoment via de bestaande route');
      await bPage.click('#km-intro-sluit');
      await expect(stap(bPage, idA, 'verzonden')).toHaveAttribute('data-klaar', '1');
    });

    await test.step('2 · document opnieuw openen na verversen', async () => {
      await loginMandaat(bPage, T);
      await kaart(bPage, idA).locator('.km-intro-btn').click();
      await expect(bPage.locator('#km-intro-modal')).toContainText('Versie 1');
      await expect(bPage.locator('#km-intro-huidig')).toHaveText(bevA.tekst);
      await expect(bPage.locator('#km-intro-verzending')).toContainText('Verzending vastgelegd op');
      await expect(bPage.locator('#km-intro-modal')).toContainText('teaser goedgekeurd op');
      await bPage.click('#km-intro-sluit');
    });

    // ── 3. B: eigen bevestiging, link (niet verzonden) en wijzigingsverzoek van de onderneming ──
    let bevB;
    await test.step('3 · B: wijzigingsverzoek; begeleider ziet versie, status en tijd', async () => {
      bevB = await bevestigingTotLink(bPage, idB);
      await bPage.click('#km-intro-sluit');
      const tB = await nieuwePagina('target-b');
      await tB.goto(bevB.link);
      await expect(tB.locator('#intro-kop')).toHaveText('Bemiddelings-/introductiebevestiging');
      waar(!tB.url().includes(bevB.token), 'token na laden uit de adresbalk (B)');
      await tB.fill('#intro-toelichting', WIJZIGING_B);
      await tB.click('#intro-wijziging');
      await expect(tB.locator('body')).toContainText('Uw wijzigingsverzoek is vastgelegd');
      await kaart(bPage, idB).locator('.km-intro-btn').click();
      const modal = bPage.locator('#km-intro-modal');
      await expect(modal).toContainText('Versie 1');
      await expect(modal).toContainText('Nog geen akkoord op deze versie');
      await expect(modal).toContainText('Gevraagde wijzigingen op deze versie');
      await expect(modal).toContainText(WIJZIGING_B);
      await expect(modal).toContainText('Wijziging gevraagd door de onderneming (versie 1)');
      await bPage.click('#km-intro-sluit');
    });

    // ── 4. A: akkoord van de onderneming; begeleider ziet het met versie en tijd ──
    await test.step('4 · A: akkoord van de onderneming', async () => {
      const tA = await nieuwePagina('target-a');
      await tA.goto(bevA.link);
      await expect(tA.locator('#intro-kop')).toHaveText('Bemiddelings-/introductiebevestiging');
      await expect(tA.locator('#intro-tekst')).toHaveText(bevA.tekst);
      waar(!tA.url().includes(bevA.token), 'token na laden uit de adresbalk (A)');
      await tA.fill('#intro-naam', AKKOORD_A);
      await tA.check('#intro-bevoegd');
      await tA.click('#intro-akkoord');
      await expect(tA.locator('#intro-status-akkoord')).toBeVisible();
      await expect(tA.locator('body')).toContainText('Uw akkoord op versie 1 is vastgelegd.');
      await kaart(bPage, idA).locator('.km-intro-btn').click();
      await expect(bPage.locator('#km-intro-modal')).toContainText('Akkoord door ' + AKKOORD_A + ' op');
      await expect(bPage.locator('#km-intro-modal')).toContainText('Akkoord door de onderneming (versie 1)');
      await expect(bPage.locator('#km-intro-vrijgeven')).toBeVisible(); // beschikbaar, nog niet gebruikt
      await bPage.click('#km-intro-sluit');
      await ververs(bPage);
      await expect(stap(bPage, idA, 'akkoord')).toHaveAttribute('data-klaar', '1');
      await expect(stap(bPage, idB, 'akkoord')).toHaveAttribute('data-klaar', '0');
    });

    // ── 5. Voorstellen (alleen anonieme teaser) en eigen keuze van de koper ──
    const LEK_VOOR = [A.naam, A.anonieme_naam, A.kvk_nummer, A.bedrijfsadres, A.contact_naam, A.contact_email, A.contact_telefoon, A.notities, B.naam, B.contact_email, C.naam, C.notities, AKKOORD_A, WIJZIGING_B, CONTACT_C];
    const koperKaartA = kPage.locator('.km-koper-kaart:has(.km-koper-interesse[data-id="' + idA + '"])');
    await test.step('5 · A voorstellen; koper ziet alleen de teaser en kiest zelf', async () => {
      await expect(tfKnop(bPage, idB, 'voorstellen')).toBeDisabled(); // B heeft geen teaser
      await tfKnop(bPage, idA, 'voorstellen').click();
      await expect(tag(bPage, idA)).toHaveText('Voorgesteld aan de koper');
      waar(dialogen.some((d) => d.tekst.includes('uitsluitend de goedgekeurde anonieme teaser')), 'voorstellen: bevestiging dat de koper alleen de anonieme teaser ziet');
      waar(JSON.stringify(posts(tPad(idA) + '/targetflow', 'voorstellen').map(body)) === JSON.stringify([{ actie: 'voorstellen' }]), 'voorstellen uitsluitend op A');

      await ververs(kPage);
      await expect(kPage.locator('.km-koper-kaart')).toHaveCount(3);
      await expect(koperKaartA).toContainText('Anonieme kandidaat');
      await expect(koperKaartA).toContainText('Zuid-Nederland');
      await expect(koperKaartA).toContainText(TEASER_A);
      await expect(kPage.locator('.km-koper-interesse-btn')).toHaveCount(2);
      for (const s of LEK_VOOR) await expect(kPage.locator('body')).not.toContainText(s);

      await kPage.click('.km-koper-interesse-btn[data-id="' + idA + '"][data-waarde="geen_interesse"]');
      await expect(kPage.locator('.km-koper-interesse-keuze[data-id="' + idA + '"]')).toHaveText('Uw keuze: Geen interesse');
      await kPage.click('.km-koper-interesse-btn[data-id="' + idA + '"][data-waarde="interesse"]');
      await expect(kPage.locator('.km-koper-interesse-keuze[data-id="' + idA + '"]')).toHaveText('Uw keuze: Interesse');
      const kp = posts('/mna/koopmandaat/' + K + '/target/' + idA + '/interesse').map(body);
      waar(JSON.stringify(kp) === JSON.stringify([{ interesse: 'geen_interesse' }, { interesse: 'interesse' }]), 'koper legt de eigen keuze vast (eerst geen interesse, daarna interesse), alleen op A');

      await ververs(bPage);
      await expect(tag(bPage, idA)).toHaveText('Interesse van de koper');
      await expect(stap(bPage, idA, 'interesse')).toContainText('door de koper zelf');
    });

    // ── 6. Expliciete match; geen identiteit door akkoord, interesse of match ──
    await test.step('6 · A: match vastleggen; koper blijft anoniem; promotie nog geblokkeerd', async () => {
      await tfKnop(bPage, idA, 'match').click();
      await expect(kaart(bPage, idA).locator('.km-tf-match')).toContainText('Een match geeft de identiteit niet vrij');
      await expect(tag(bPage, idA)).toHaveText('Match');
      waar(dialogen.some((d) => d.tekst.startsWith('Match vastleggen') && d.tekst.includes(MANDAAT.koper_naam) && d.tekst.includes('NIET vrij')), 'match alleen na expliciete bevestiging die zegt dat de identiteit niet vrijkomt');
      waar(JSON.stringify(posts(tPad(idA) + '/targetflow', 'match').map(body)) === JSON.stringify([{ actie: 'match', bevestigd: true }]), 'match-POST exact {actie:"match", bevestigd:true} op A');
      await expect(kaart(bPage, idA).locator('.km-promoveer-btn')).toHaveCount(0);
      await expect(kaart(bPage, idA).locator('.km-tf-promotie-blokkade')).toContainText('identiteitsvrijgave');
      await ververs(kPage);
      await expect(koperKaartA).toContainText('Anonieme kandidaat');
      for (const s of LEK_VOOR) await expect(kPage.locator('body')).not.toContainText(s);
      const pa = await omg.direct('GET', tPad(idA) + '/promoveer', { 'x-tussen-key': T });
      const pc = await omg.direct('GET', tPad(idC) + '/promoveer', { 'x-tussen-key': T });
      waar(pa.status === 409 && pa.json && pa.json.reden === 'vrijgave_ontbreekt' && pc.status === 409 && pc.json && pc.json.reden === 'match_ontbreekt',
        'promotiepoort: A zonder vrijgave en C zonder match worden geweigerd (409 vrijgave_ontbreekt / match_ontbreekt)');
    });

    // ── 7. Afzonderlijke identiteitsvrijgave; koper ziet alleen naam en sector ──
    await test.step('7 · A: afzonderlijke vrijgave', async () => {
      await kaart(bPage, idA).locator('.km-intro-btn').click();
      await bPage.click('#km-intro-vrijgeven');
      await expect(bPage.locator('#km-intro-melding')).toContainText('Identiteit vrijgegeven aan de koper.');
      waar(dialogen.some((d) => d.tekst.startsWith('Identiteit vrijgeven aan de koper?') && d.tekst.includes(AKKOORD_A) && d.tekst.includes('versie 1')), 'vrijgave met eigen bevestiging (akkoordgever en versie genoemd)');
      await bPage.click('#km-intro-sluit');
      await expect(kaart(bPage, idA).locator('.km-promoveer-btn')).toHaveCount(1);
      await ververs(kPage);
      const vrij = kPage.locator('.km-koper-kaart', { hasText: A.naam });
      await expect(vrij).toContainText('Identiteit vrijgegeven door uw begeleider');
      await expect(vrij).toContainText(A.sector);
      for (const s of LEK_VOOR.filter((x) => x !== A.naam)) await expect(kPage.locator('body')).not.toContainText(s);
    });

    // ── 8. Promotie via de bestaande P1C-route met kostenbevestiging ──
    let traject;
    let advPage;
    await test.step('8 · A: promotie via adv.html (adviseurslogin, kostenbevestiging)', async () => {
      [advPage] = await Promise.all([bPage.context().waitForEvent('page'), kaart(bPage, idA).locator('.km-promoveer-btn').click()]);
      koppelDialogen(advPage, 'adviseur');
      await advPage.waitForLoadState();
      await expect(advPage.locator('#p1c-login-hint')).toBeVisible();
      await advPage.fill('#l-e', omg.adviseur.email);
      await advPage.fill('#l-w', omg.adviseur.wachtwoord);
      await advPage.click('#l-btn');
      await expect(advPage.locator('#p1c-bevestig')).toBeVisible({ timeout: 30000 });
      await expect(advPage.locator('.p1c-bedrag').first()).toBeVisible();
      await expect(advPage.locator('#p1c-bevestig')).toBeDisabled();
      await advPage.check('input[name="p1c-pakket"][value="workflow"]');
      if ((await advPage.locator('#p1c-sector').inputValue()) !== A.sector) await advPage.selectOption('#p1c-sector', A.sector);
      await expect(advPage.locator('#p1c-bevestig')).toBeDisabled(); // kosten nog niet bevestigd
      await advPage.check('#p1c-akkoord');
      await advPage.click('#p1c-bevestig');
      await expect(advPage.locator('#p1c-succes')).toBeVisible({ timeout: 30000 });
      waar(((await advPage.locator('#p1c-ref').textContent()) || '').trim().length > 0, 'trajectreferentie zichtbaar na promotie');
      waar(posts(tPad(idA) + '/promoveer').length === 1 && JSON.stringify(body(posts(tPad(idA) + '/promoveer')[0])) === JSON.stringify({ pakket: 'workflow', sector: A.sector }), 'precies één promotie-POST met {pakket, sector}');
      if (omg.modus === 'lokaal') annoteer('lokale fixture', 'De adviseurslogin in adv.html is lokaal een synthetische fixture; de promotieroute zelf is de echte backendhandler.');

      const rows = await omg.rijen('SELECT id, kantoor_naam, contact_naam, contact_email, kantoor_rechtsvorm, verkoper_adres, verkoper_kvk, sector, koper_naam, koper_code, tussen_code FROM mna_trajecten WHERE koopmandaat_target_id=?', [idA]);
      traject = rows[0];
      waar(rows.length === 1, 'precies één traject gestart voor A');
      registreer(traject.id, 'trajectcode-verkoper'); registreer(traject.koper_code, 'trajectcode-koper'); registreer(traject.tussen_code, 'trajectcode-begeleider');
      omg.staat.trajectId = traject.id;
      waar(traject.kantoor_naam === A.naam && traject.contact_naam === A.contact_naam && traject.contact_email === A.contact_email && traject.kantoor_rechtsvorm === A.rechtsvorm
        && traject.verkoper_adres === A.bedrijfsadres && traject.verkoper_kvk === A.kvk_nummer && traject.sector === A.sector && traject.koper_naam === MANDAAT.koper_naam,
        'promotie neemt naam, contactpersoon, rechtsvorm, adres, KvK, sector en koper over zonder herinvoer');
      const verder = await advPage.locator('#p1c-verder').getAttribute('href');
      waar(verder === 'mna.html?code=' + traject.tussen_code + '&worker=' + W, '"Verder als begeleider" opent het nieuwe traject met de eigen begeleiderscode');

      // Bewijs blijft bewaard: target, versie, akkoord, vrijgave en historie
      waar(await telRij('SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_versie WHERE target_id=?', [idA]) >= 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='akkoord'", [idA]) === 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='vrijgave'", [idA]) === 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='target_gepromoveerd'", [idA]) === 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_target WHERE id=? AND status='gepromoveerd'", [idA]) === 1,
        'na promotie: target, versie, akkoord, vrijgave en historieregel "gepromoveerd" bewaard');

      await ververs(bPage);
      await expect(tag(bPage, idA)).toHaveText('Gepromoveerd naar traject');
      await expect(kaart(bPage, idA).locator('.km-open-traject')).toHaveCount(1);
      await expect(kaart(bPage, idA)).toContainText('Teaser: goedgekeurd');
      await tfKnop(bPage, idA, 'historie').click();
      await expect(bPage.locator('.km-tf-historie-regel').first()).toContainText('Gepromoveerd naar traject');
      await expect(bPage.locator('#km-tf-historie')).toContainText('Match vastgelegd');
      await expect(bPage.locator('#km-tf-historie')).toContainText('Voorgesteld aan de koper');
      for (const s of [A.contact_email, A.contact_telefoon, A.bedrijfsadres]) await expect(bPage.locator('#km-tf-historie')).not.toContainText(s);
      await bPage.click('#km-tf-historie-sluit');
      await kaart(bPage, idA).locator('.km-intro-btn').click();
      await expect(bPage.locator('#km-intro-modal')).toContainText('gepromoveerd naar een traject');
      await expect(bPage.locator('#km-intro-modal')).toContainText('Akkoord door ' + AKKOORD_A);
      await bPage.click('#km-intro-sluit');
    });

    // ── 9. B en C blijven los na de promotie van A; B archiveren → herstellen → archiveren ──
    await test.step('9 · B en C onafhankelijk na promotie; archief zonder verwijdering', async () => {
      await expect(tag(bPage, idB)).toHaveText('Nieuw');
      await expect(stap(bPage, idB, 'link')).toHaveAttribute('data-klaar', '1');
      await expect(stap(bPage, idB, 'verzonden')).toHaveAttribute('data-klaar', '0');
      await expect(stap(bPage, idB, 'akkoord')).toHaveAttribute('data-klaar', '0');
      await expect(tag(bPage, idC)).toHaveText('Geparkeerd');
      await expect(kaart(bPage, idC).locator('.km-tf-promotie-blokkade')).toContainText('vastgelegde match');
      await expect(bPage.locator('#km-status-' + idC)).toBeEnabled();
      await bPage.selectOption('#km-status-' + idC, 'benaderd');
      await expect(tag(bPage, idC)).toHaveText('Benaderd');

      promptAntwoorden.push('Synth archiefreden B ' + RUN);
      await tfKnop(bPage, idB, 'archiveren').click();
      await expect(bPage.locator('#km-archief')).toContainText('Gearchiveerde targets (1)');
      await expect(bPage.locator('body')).toContainText('Potentiële targets (2)');
      await openArchief(bPage);
      await expect(kaart(bPage, idB)).toContainText('Er is niets verwijderd');
      await expect(kaart(bPage, idB)).toContainText('Synth archiefreden B ' + RUN);
      waar(dialogen.some((d) => d.soort === 'prompt' && d.tekst.includes('verwijdert niets')), 'archiveren vraagt een reden en zegt dat er niets wordt verwijderd');

      // De actieve link van B is ingetrokken; de onderneming krijgt een foutmelding, geen formulier.
      const tB2 = await nieuwePagina('target-b-na-archief');
      await tB2.goto(bevB.link);
      await expect(tB2.locator('.err')).toBeVisible();
      await expect(tB2.locator('#intro-akkoord')).toHaveCount(0);

      await ververs(kPage);
      await expect(kPage.locator('.km-koper-kaart')).toHaveCount(2); // A (vrijgegeven) en C; B gearchiveerd
      const kl = await omg.direct('GET', '/mna/koopmandaat/' + K, { 'x-tussen-key': K });
      waar(kl.status === 200 && kl.json.targets.every((t) => t.id !== idB), 'gearchiveerde B staat niet in de koperlijst');

      promptAntwoorden.push('Synth herstelreden B ' + RUN);
      await tfKnop(bPage, idB, 'herstellen').click();
      await expect(bPage.locator('body')).toContainText('Potentiële targets (3)');
      await expect(tag(bPage, idB)).toHaveText('Nieuw');
      await ververs(kPage);
      await expect(kPage.locator('.km-koper-kaart')).toHaveCount(3);

      promptAntwoorden.push('Synth definitieve archiefreden B ' + RUN);
      await tfKnop(bPage, idB, 'archiveren').click();
      await expect(bPage.locator('#km-archief')).toContainText('Gearchiveerde targets (1)');
      await openArchief(bPage);
      await tfKnop(bPage, idB, 'historie').click();
      const hist = bPage.locator('#km-tf-historie');
      await expect(hist).toContainText('Gearchiveerd');
      await expect(hist).toContainText('Hersteld uit het archief');
      await expect(hist).toContainText('reden: Synth definitieve archiefreden B ' + RUN);
      await bPage.click('#km-tf-historie-sluit');

      waar(await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_target WHERE id=? AND gearchiveerd_op IS NOT NULL AND status='nieuw'", [idB]) === 1
        && await telRij('SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_versie WHERE target_id=?', [idB]) >= 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='wijzigingsverzoek'", [idB]) === 1
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='target_gearchiveerd'", [idB]) === 2
        && await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='target_hersteld'", [idB]) === 1,
        'archief is zacht: B bestaat nog met status, versie, wijzigingsverzoek en historie (2× gearchiveerd, 1× hersteld)');
      waar(await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_target WHERE id=? AND status='benaderd' AND gearchiveerd_op IS NULL AND match_op IS NULL", [idC]) === 1,
        'C ongemoeid door alle acties op A en B');
      waar(net.staging.filter((r) => r.method === 'POST' && /\/targetflow$/.test(r.pad)).every((r) => [idA, idB].some((id) => r.pad === tPad(id) + '/targetflow')),
        'geen enkele targetflow-actie raakte C');
    });

    // ── 10. Rollen ──
    await test.step('10 · rollen: koper, begeleider en ander mandaat', async () => {
      const k1 = await omg.direct('POST', tPad(idC).replace(T, K) + '/targetflow', {}, { actie: 'archiveren', reden: 'x' });
      const k2 = await omg.direct('POST', '/mna/koopmandaat/' + K + '/target/' + idC + '/interesse', {}, { interesse: 'interesse' });
      const k3 = await omg.direct('GET', '/mna/koopmandaat/' + K + '/target/' + idC + '/promoveer', {});
      const k4 = await omg.direct('GET', '/mna/koopmandaat/' + K + '/target/' + idC + '/introductie/concept', {});
      const b1 = await omg.direct('POST', tPad(idC) + '/interesse', { 'x-tussen-key': T }, { interesse: 'interesse' });
      waar(k1.status === 401 && k3.status === 401 && k4.status === 401, 'koper krijgt 401 op begeleideracties, promotie en concept (' + [k1.status, k3.status, k4.status].join('/') + ')');
      waar(k2.status === 404, 'koper kan geen interesse geven op een niet-voorgestelde target (404, kreeg ' + k2.status + ')');
      waar(b1.status === 401, 'begeleider kan de koperkeuze niet namens de koper via de koperroute zetten (401, kreeg ' + b1.status + ')');
      const T2 = await omg.anderMandaat();
      if (T2) {
        registreer(T2, 'ander-mandaat');
        const x = await omg.direct('POST', '/mna/koopmandaat/' + T2 + '/target/' + idC + '/targetflow', { 'x-tussen-key': T2 }, { actie: 'archiveren', reden: 'x' });
        waar(x.status === 404, 'target van een ander mandaat geeft 404 (kreeg ' + x.status + ')');
      } else {
        annoteer('niet uitgevoerd (live)', 'Ander-mandaat-isolatie is alleen lokaal getest; live wordt geen tweede mandaat aangemaakt.');
      }
      const kl = await omg.direct('GET', '/mna/koopmandaat/' + K, { 'x-tussen-key': K });
      const tekst = JSON.stringify(kl.json);
      waar(kl.status === 200 && kl.json.targets.every((t) => Object.keys(t).every((k) => KOPER_VELDEN.includes(k))), 'koperlijst bevat uitsluitend allow-listvelden');
      waar([A.anonieme_naam, A.kvk_nummer, A.bedrijfsadres, A.contact_naam, A.contact_email, A.contact_telefoon, A.notities, C.naam, C.notities, CONTACT_C, AKKOORD_A, T].every((s) => !tekst.includes(s)),
        'koperlijst lekt geen anonieme naam, KvK, adres, contact, notities, contactlog, akkoordnaam, niet-vrijgegeven naam of begeleidercode');
      waar(await telRij("SELECT COUNT(*) AS n FROM mna_koopmandaat_target WHERE id=? AND status='benaderd' AND gearchiveerd_op IS NULL", [idC]) === 1, 'geweigerde rolverzoeken lieten C ongewijzigd');
    });

    // ── 11. Koperdoorgang naar het eigen traject ──
    await test.step('11 · koper: "Open eigen traject" opent de eigen trajectkopercode', async () => {
      await ververs(kPage);
      const knop = kPage.locator('.km-koper-traject-btn[data-id="' + idA + '"]');
      await expect(knop).toHaveCount(1);
      await expect(kPage.locator('.km-koper-traject-btn')).toHaveCount(1);
      await Promise.all([kPage.waitForURL(/\/mna\.html\?code=/, { timeout: 30000 }), knop.click()]);
      waar(new URL(kPage.url()).searchParams.get('code') === traject.koper_code, 'koperdoorgang gebruikt uitsluitend de eigen kopercode van het nieuwe traject');
    });

    // ── 12. Reguliere trajectflow: alleen live ──
    if (omg.modus === 'live') {
      await doorloopReguliereTraject({ omg, nieuwePagina, kPage, advPage, traject });
    } else {
      annoteer('niet bewezen in lokale modus', 'Verkoper-aanlevering → adviseurinspectie → selectieve vrijgave → koper ziet vrijgegeven informatie: die routes zitten niet in de lokale koopmandaathandler. Alleen de live-modus bewijst dit deel.');
    }

    // ── Netwerk, opslag en lekcontrole ──
    const verwachtFout = (r) => r.rol === 'target-b-na-archief' || (traject && r.pad === '/mna/koopmandaat/' + traject.koper_code);
    const fouten = net.staging.filter((r) => r.pad.startsWith('/mna/koopmandaat/') && r.method !== 'OPTIONS' && r.status >= 400 && !verwachtFout(r)).map((r) => r.rol + ' ' + r.method + ' ' + r.pad + ' → ' + r.status);
    waar(fouten.length === 0, 'geen onverwachte koopmandaatfout in de browserflow: ' + fouten.join('; '));
    waar(net.extern.every((x) => !x.startsWith(PROD)), 'geen enkel verzoek naar productie');
    waar(net.extern.every((x) => !x.includes(bevA.token) && !x.includes(bevB.token)), 'linktokens nooit naar een externe host');
    waar(await bPage.evaluate((t) => localStorage.length === 0 && sessionStorage.length === 0 && !document.cookie.includes(t), bevA.token), 'begeleiderpagina bewaart niets in localStorage/sessionStorage/cookie');
  } catch (e) {
    // Primaire fout vóór het sluiten van de contexten gemaskeerd bewaren en tonen, zodat een latere
    // afsluitfout (bv. een routecallback op een gesloten context) haar niet verdringt.
    primaireFout = e;
    if (e && typeof e === 'object') {
      try { if (typeof e.message === 'string') e.message = maskeer(e.message); } catch (x) { /* niet schrijfbaar */ }
      try { if (typeof e.stack === 'string') e.stack = maskeer(e.stack); } catch (x) { /* niet schrijfbaar */ }
    }
    const kort = maskeer(String((e && e.message) || e).split('\n').slice(0, 6).join(' ⏎ ').slice(0, 800));
    annoteer('primaire fout', kort);
    console.error('[koopmandaat-targetflow] primaire fout: ' + kort);
  } finally {
    // Eerst lopende routecallbacks laten afronden (geen ignoreErrors), dan pas de context sluiten.
    const afsluitFouten = [];
    for (const c of contexten) {
      try { await c.unrouteAll({ behavior: 'wait' }); } catch (e) { afsluitFouten.push(maskeer(String((e && e.message) || e).split('\n')[0].slice(0, 200))); }
      await c.close().catch(() => {});
    }
    if (afsluitFouten.length) annoteer('afsluitfout (secundair)', afsluitFouten.join('; '));
    if (primaireFout) throw primaireFout;
    if (afsluitFouten.length) throw new Error('Afsluiten van de browsercontexten faalde: ' + afsluitFouten.join('; '));
  }
}

// ── Live: A als gewone verkoper in het bestaande reguliere traject ──
async function doorloopReguliereTraject({ omg, nieuwePagina, kPage, advPage, traject }) {
  const VRIJ = 'SYNTH-VRIJ-' + RUN + '-' + Date.now();
  const NIET_VRIJ = 'SYNTH-NIETVRIJ-' + RUN + '-' + Date.now();
  const DOCNAAM = 'synth-bewijsstuk-' + RUN + '.txt';
  const vokVersie = (() => { const m = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/); return (m && m[1]) || '1.5'; })();

  await test.step('12a · verkoper (target A) levert aan in het bestaande verkopersportaal', async () => {
    const vPage = await nieuwePagina('verkoper');
    const geladen = vPage.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 }).catch(() => null);
    await vPage.goto('/mna.html?worker=' + W);
    await vPage.fill('#l-code', traject.id);
    await vPage.click('#l-btn');
    await naTrajectLogin(vPage, 'verkoper');
    await geladen;
    await naarFase(vPage, 'financieel');
    const veld = vPage.locator('#df_omzet3');
    await expect(veld).toBeVisible({ timeout: 15000 });
    await veld.fill(VRIJ);
    const save1 = vPage.waitForResponse((r) => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 20000 });
    await veld.blur();
    waar((await save1).ok(), 'verkoper: waarde in Financieel opgeslagen');
    await vPage.check('#bewijsstuk-alleen-financieel');
    const up = vPage.waitForResponse((r) => r.url().includes('/mna/document/upload') && r.request().method() === 'POST', { timeout: 60000 });
    await vPage.locator('input[type="file"][multiple]').setInputFiles({ name: DOCNAAM, mimeType: 'text/plain', buffer: Buffer.from('Synthetisch bewijsstuk ' + RUN + ' (geen echte gegevens).') });
    const upr = await up;
    const upj = await upr.json().catch(() => null);
    // Diagnostiek: alleen status, booleans en (indien aanwezig) de fouttekst; nooit de ruwe responsebody.
    const upDiag = { status: upr.status(), ok: !!(upj && upj.ok === true), doc_id: !!(upj && upj.doc_id), alleen_bewijsstuk: !!(upj && upj.alleen_bewijsstuk) };
    if (upj && typeof upj.error === 'string' && upj.error) upDiag.error = upj.error.slice(0, 200);
    waar(upr.ok() && upj && upj.ok === true && !!upj.doc_id && upj.alleen_bewijsstuk, 'verkoper: document aangeleverd als bewijsstuk (zonder AI-analyse) · diagnostiek ' + JSON.stringify(upDiag));
    await naarFase(vPage, 'commercieel');
    const veldC = vPage.locator('input[id^="df_"]:not([type]):visible, input[id^="df_"][type="text"]:visible, textarea[id^="df_"]:visible').first();
    await expect(veldC).toBeVisible({ timeout: 15000 });
    await veldC.fill(NIET_VRIJ);
    const save2 = vPage.waitForResponse((r) => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 20000 });
    await veldC.blur();
    waar((await save2).ok(), 'verkoper: waarde in Commercieel (wordt niet vrijgegeven) opgeslagen');
  });

  let btPage;
  await test.step('12b · adviseur inspecteert de aanlevering in het traject', async () => {
    // VOK via de bestaande route (zoals tests/e2e-3rollen-regressie.spec.js); geen onderwerp van deze flow.
    const vok = await api('POST', '/mna/vok/teken', { body: { code: traject.tussen_code, naam: 'Synth TF Adviseur ' + RUN, versie: vokVersie, email: omg.adviseur.email } });
    waar(vok.status === 200, 'VOK voor de begeleider van het nieuwe traject getekend (status ' + vok.status + ')');
    annoteer('voorwaarde via bestaande route', 'De VOK van de begeleider is via de bestaande route /mna/vok/teken getekend, niet via de popup.');
    btPage = await nieuwePagina('begeleider-traject');
    const href = await advPage.locator('#p1c-verder').getAttribute('href');
    await btPage.goto('/' + href);
    await naTrajectLogin(btPage, 'tussenpersoon');
    await expect(btPage.locator('#bg-toegang')).toBeVisible({ timeout: 30000 });
    await btPage.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((x) => x.id === 'financieel'); delete DOCS.financieel; loadDocsForFase('financieel'); renderApp(); });
    // De begeleider ziet Financieel alleen-lezen (schrijven is verkoper-only, zie e2e-3rollen B5):
    // er is dan geen invulveld #df_omzet3 maar een .readonly-val. De waarde moet daar zichtbaar staan.
    await expect(btPage.locator('#df_omzet3')).toHaveCount(0);
    await expect(btPage.locator('.readonly-val', { hasText: VRIJ })).toBeVisible({ timeout: 15000 });
    await expect(btPage.locator('body')).toContainText(DOCNAAM, { timeout: 20000 });
  });

  await test.step('12c · koper ziet vóór de vrijgave niets van de aanlevering', async () => {
    await naTrajectLogin(kPage, 'koper');
    await naarFase(kPage, 'financieel');
    waar(!(await zichtbaar(kPage, VRIJ)) && !(await kPage.evaluate((m) => JSON.stringify(window.S).includes(m), VRIJ)), 'koper ziet de financiële waarde niet vóór de vrijgave');
  });

  await test.step('12d · adviseur geeft selectief alleen Financieel vrij', async () => {
    await btPage.evaluate(() => { S.screen = 'begeleider'; renderApp(); });
    await btPage.click('#bg-toegang');
    await btPage.check('.kt-cat[value="financieel"]');
    const gekozen = await btPage.locator('.kt-cat:checked').evaluateAll((els) => els.map((e) => e.value));
    waar(JSON.stringify(gekozen) === JSON.stringify(['financieel']), 'alleen de categorie Financieel gekozen');
    await btPage.click('#kt-ok');
    await expect(btPage.locator('.toast-ok', { hasText: 'Koper-toegang bijgewerkt (1 categorie)' })).toBeVisible({ timeout: 20000 });
  });

  await test.step('12e · koper ziet alleen de vrijgegeven informatie', async () => {
    await kPage.goto('/mna.html?code=' + traject.koper_code + '&worker=' + W);
    await naTrajectLogin(kPage, 'koper');
    await naarFase(kPage, 'financieel');
    await expect.poll(() => zichtbaar(kPage, VRIJ), { timeout: 15000 }).toBe(true);
    await naarFase(kPage, 'commercieel');
    waar(!(await zichtbaar(kPage, NIET_VRIJ)) && !(await kPage.evaluate((m) => JSON.stringify(window.S).includes(m), NIET_VRIJ)), 'niet-vrijgegeven categorie blijft onzichtbaar voor de koper');
    for (const s of [A.anonieme_naam, A.notities]) waar(!(await zichtbaar(kPage, s)), 'interne koopmandaatgegevens niet in het kopertraject');
  });
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('Koopmandaat-targetflow · LOKAAL geïntercepteerd (echte koopmandaathandler, geen staging)', () => {
  test.skip(LIVE, 'Live-modus actief; de lokale modus draait apart en telt niet als livebewijs.');

  test('drie targets A/B/C: leeg mandaat, volledige flow A tot promotie, B archief, C onafhankelijk, rollen', async ({ browser, baseURL }) => {
    test.setTimeout(300000);
    annoteer('bewijs', 'LOKAAL GEÏNTERCEPTEERD: echte handleKoopmandaat uit de gekoppelde backend op node:sqlite; adviseurslogin en sectorlijst zijn fixtures. Geen staging-acceptatie en geen livefunctionele PASS.');
    const omg = await lokaleOmgeving(baseURL);
    try {
      await doorloopFlow({ browser, baseURL, omg });
    } finally {
      await omg.opruimen();
    }
  });

  test('reguliere trajectdoorgang na promotie (verkoper → adviseur → selectieve vrijgave → koper)', async () => {
    test.skip(true, 'Alleen in de live-modus: de reguliere trajectroutes zitten niet in de lokale koopmandaathandler. Bewust niet als geslaagd geteld.');
  });
});

test.describe('Koopmandaat-targetflow · LIVE staging (echte staging-API, synthetische data)', () => {
  test.skip(!LIVE, 'Live-modus uit: zet KVM_TARGETFLOW_LIVE=1 en WORKER_URL op de staging-worker.');

  test('drie targets A/B/C tot en met A als verkoper in het reguliere traject', async ({ browser, baseURL }) => {
    test.setTimeout(900000);
    annoteer('bewijs', 'LIVE STAGING: echte verzoeken naar ' + STAGING + ' met synthetische data; geen productie- of juridische acceptatie.');
    const omg = liveOmgeving();
    let fout = null;
    try {
      await doorloopFlow({ browser, baseURL, omg });
    } catch (e) {
      fout = e;
    }
    const { problemen, rest } = await omg.opruimen();
    if (rest.length) annoteer('rest na opruiming', rest.join('; '));
    if (problemen.length) annoteer('opruimprobleem', problemen.join('; '));
    if (fout) throw fout;
    waar(problemen.length === 0, 'opruiming volledig en onafhankelijk geteld: ' + problemen.join('; '));
  });
});
