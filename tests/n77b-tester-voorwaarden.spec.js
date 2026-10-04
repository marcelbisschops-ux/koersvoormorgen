// N-77b (4 okt 2026) — gerichte browsertest voor het expliciete testerakkoord binnen de bestaande
// adviseur-onboarding (adv.html) in Chromium, met lokale route-interceptie op uitsluitend de bekende
// staging-host. Er gaat geen enkel verzoek naar productie, staging of een andere externe host: alles
// buiten localhost wordt onderschept (synthetische fixture) of afgebroken en geteld. Geen echte
// inloggegevens, e-mailadressen of klantdata — alles is synthetisch.
//
// Draaien: npx playwright test tests/n77b-tester-voorwaarden.spec.js

import { test, expect } from '@playwright/test';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const W = encodeURIComponent(STAGING);
const DOC = 'https://koersvoormorgen.nl/testvoorwaarden.html';
const SESSIE = 'sessie-synth-' + 't'.repeat(24);
const TRAJECT = { id: 'MASYN001', kantoor_naam: 'Synth Traject BV', status: 'actief', tussen_code: 'TSYN0001' };
const ACCEPT_PAD = '/gebruiker/voorwaarden/accepteren';

// Onderschept alles buiten localhost op contextniveau. `api(req)` beantwoordt staging-verzoeken; al
// het andere (ook productie) wordt afgebroken en in `extern` gezet.
async function onderschep(context, baseURL, api) {
  const extern = [];
  const staging = [];
  const origin = new URL(baseURL).origin;
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, x-gebruiker-token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' };
  await context.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
    if (u.origin === STAGING) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const regel = { method: req.method(), pad: u.pathname, headers: req.headers(), body: req.postData() };
      staging.push(regel);
      const r = await api(regel);
      return route.fulfill({ status: (r && r.status) || (r ? 200 : 404), headers: cors, contentType: 'application/json', body: JSON.stringify(r ? r.json : { error: 'fixture: onbekend' }) });
    }
    extern.push(u.origin + u.pathname + u.search);
    return route.abort();
  });
  return { extern, staging };
}

// Synthetische backend volgens het N-77b-contract (worker/16-adviseur.js): een tester zonder akkoord
// krijgt bij login/refetch alleen onboardinggegevens; pas na een bevestigd akkoord de trajecten.
function backend({ tester = true, gv = true, mfa = false, versie = () => '1.3', accept } = {}) {
  const st = { gv, akkoord: !tester, accepten: 0 };
  const tv = () => ({ versie: versie(), url: DOC, vereist: true, akkoord: st.akkoord, geaccepteerd_op: st.akkoord ? 1 : null });
  const api = (r) => {
    const metToken = r.headers['x-gebruiker-token'] === SESSIE;
    if (r.pad === '/adviseur/trajecten' && r.method === 'POST') {
      if (!metToken && mfa) return { json: { mfa_required: true, mfa_token: 'mfa-synth-1', email: 'tester@voorbeeld.test' } };
      if (!metToken && !/wachtwoord/.test(decodeURIComponent(r.body || ''))) return { status: 401, json: { error: 'Inloggegevens onjuist.' } };
      const tok = metToken ? null : SESSIE;
      if (tester && !st.akkoord) return { json: { ok: true, naam: 'Synth Tester', id: 'u_synth', sessie_token: tok, is_tester: 1, testvoorwaarden_vereist: true, voorwaarden: { gv_akkoord: st.gv, gv_versie: '2.0', testvoorwaarden: tv() } } };
      const voorwaarden = Object.assign({ gv_akkoord: st.gv, gv_versie: '2.0' }, tester ? { testvoorwaarden: tv() } : {});
      return { json: { ok: true, sessie_token: tok, naam: 'Synth Adviseur', bedrijf: 'Synth Kantoor', trajecten: [TRAJECT], traject_limiet: 3, modules: { traject: true }, is_tester: tester ? 1 : 0, voorwaarden } };
    }
    if (r.pad === '/adviseur/mfa/verify') return JSON.parse(r.body).code === '123456' ? { json: { ok: true, sessie_token: SESSIE } } : { status: 401, json: { error: 'Code onjuist.' } };
    if (r.pad === '/gebruiker/voorwaarden' && r.method === 'GET') return { json: Object.assign({ ok: true, gv: { versie: '2.0', tekst: 'Synthetische gebruiksvoorwaarden.' } }, tester && metToken ? { testvoorwaarden: tv() } : {}) };
    if (r.pad === ACCEPT_PAD && r.method === 'POST') {
      st.accepten++;
      if (!metToken) return { status: 401, json: { error: 'Auth verplicht' } };
      const body = JSON.parse(r.body || '{}');
      const eigen = accept ? accept(body, st.accepten) : null;
      if (eigen) return eigen;
      if (tester && body.testvoorwaarden_akkoord !== undefined) {
        if (body.testvoorwaarden_akkoord !== true) return { status: 400, json: { error: 'testvoorwaarden_akkoord_niet_expliciet' } };
        if (body.testvoorwaarden_versie !== versie()) return { status: 409, json: { error: 'testvoorwaarden_versie_onjuist', testvoorwaarden: { versie: versie() } } };
        st.akkoord = true;
        // Nieuw contract: tester-POST werkt GV alleen bij expliciet gv_akkoord === true bij.
        if (body.gv_akkoord === true) st.gv = true;
      } else st.gv = true;
      return { json: Object.assign({ ok: true, gv_versie: '2.0' }, tester ? { testvoorwaarden: tv() } : {}) };
    }
    return null;
  };
  return { api, st };
}

async function logIn(page, { mfa = false } = {}) {
  await page.fill('#l-e', 'tester@voorbeeld.test');
  await page.fill('#l-w', 'synthetisch-wachtwoord');
  await page.click('#l-btn');
  if (mfa) { await page.fill('#m-c', '123456'); await page.click('#m-btn'); }
}

const geenOpslag = async (page) => expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
const pad = (net) => net.staging.map((r) => r.method + ' ' + r.pad);
const accepts = (net) => net.staging.filter((r) => r.pad === ACCEPT_PAD);

test.describe('N-77b · expliciet testerakkoord in adv.html', () => {
  test('gewone gebruiker: bestaand gedrag, geen testerscherm en geen extra verzoeken', async ({ page, context, baseURL }) => {
    const b = backend({ tester: false });
    const net = await onderschep(context, baseURL, b.api);
    await page.goto('/adv.html?worker=' + W);
    await logIn(page);
    await expect(page.locator('body')).toContainText('M&A Trajecten');
    await expect(page.locator('body')).toContainText('Synth Traject BV');
    expect(pad(net)).toEqual(['POST /adviseur/trajecten']);
    await expect(page.locator('#vw-tv')).toHaveCount(0);
    await geenOpslag(page);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });

  test('tester met GV maar zonder testerakkoord: eigen vakje, serverakkoord, herladen vóór het dashboard', async ({ page, context, baseURL }) => {
    const b = backend({ gv: true });
    const net = await onderschep(context, baseURL, b.api);
    await page.goto('/adv.html?worker=' + W);
    await logIn(page);
    await expect(page.locator('.login-title')).toHaveText('Testvoorwaarden accepteren');
    await expect(page.locator('#vw-tv')).toBeVisible();
    await expect(page.locator('#vw-gv')).toHaveCount(0);
    await expect(page.locator('#vw-tv')).not.toBeChecked();
    await expect(page.locator('#vw-ok')).toBeDisabled();
    await expect(page.locator('#vw-tv-link')).toHaveAttribute('href', DOC);
    await expect(page.locator('#vw-tv-link')).toHaveAttribute('rel', 'noopener');
    await expect(page.locator('.vw-tv-v').first()).toHaveText('1.3');
    await expect(page.locator('body')).not.toContainText('M&A Trajecten');
    const get = net.staging.find((r) => r.method === 'GET' && r.pad === '/gebruiker/voorwaarden');
    expect(get.headers['x-gebruiker-token']).toBe(SESSIE);
    expect(accepts(net)).toEqual([]);

    await page.check('#vw-tv');
    await expect(page.locator('#vw-ok')).toBeEnabled();
    await page.click('#vw-ok');
    await expect(page.locator('body')).toContainText('Synth Traject BV');
    const p = accepts(net);
    expect(p).toHaveLength(1);
    expect(JSON.parse(p[0].body)).toEqual({ testvoorwaarden_akkoord: true, testvoorwaarden_versie: '1.3' });
    expect(p[0].headers['x-gebruiker-token']).toBe(SESSIE);
    const stappen = pad(net);
    const refetch = stappen.lastIndexOf('POST /adviseur/trajecten');
    expect(refetch).toBeGreaterThan(stappen.indexOf('POST ' + ACCEPT_PAD));
    const her = net.staging[refetch];
    expect(her.headers['x-gebruiker-token']).toBe(SESSIE);
    expect(decodeURIComponent(her.body || '')).not.toContain('wachtwoord');
    await geenOpslag(page);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });

  test('tester zonder GV én zonder testerakkoord: knop pas bij beide vakjes', async ({ page, context, baseURL }) => {
    const b = backend({ gv: false });
    const net = await onderschep(context, baseURL, b.api);
    await page.goto('/adv.html?worker=' + W);
    await logIn(page);
    await expect(page.locator('#vw-doc-gv')).toContainText('Synthetische gebruiksvoorwaarden');
    await expect(page.locator('#vw-gv')).not.toBeChecked();
    await expect(page.locator('#vw-tv')).not.toBeChecked();
    await page.check('#vw-tv');
    await expect(page.locator('#vw-ok')).toBeDisabled();
    await page.uncheck('#vw-tv');
    await page.check('#vw-gv');
    await expect(page.locator('#vw-ok')).toBeDisabled();
    await page.check('#vw-tv');
    await expect(page.locator('#vw-ok')).toBeEnabled();
    await page.click('#vw-ok');
    await expect(page.locator('body')).toContainText('Synth Traject BV');
    expect(accepts(net)).toHaveLength(1);
    expect(JSON.parse(accepts(net)[0].body)).toEqual({ testvoorwaarden_akkoord: true, testvoorwaarden_versie: '1.3', gv_akkoord: true });
    expect(b.st.gv && b.st.akkoord).toBe(true);
  });

  test('ok:false, DB-fout en verouderde versie: begrijpelijke retry zonder vals dashboard', async ({ page, context, baseURL }) => {
    let huidig = '1.3';
    const b = backend({
      versie: () => huidig,
      accept: (body, n) => (n === 1 ? { json: { ok: false, error: 'synthetisch' } } : n === 2 ? { status: 500, json: { error: 'testvoorwaarden_akkoord_niet_vastgelegd' } } : null),
    });
    const net = await onderschep(context, baseURL, b.api);
    await page.goto('/adv.html?worker=' + W);
    await logIn(page);
    await page.check('#vw-tv');

    await page.click('#vw-ok');
    await expect(page.locator('#vw-err')).toContainText('niet door de server bevestigd');
    await expect(page.locator('#vw-ok')).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('M&A Trajecten');

    await page.click('#vw-ok');
    await expect(page.locator('#vw-err')).toContainText('status 500');
    await expect(page.locator('body')).not.toContainText('M&A Trajecten');

    huidig = '1.4'; // server is intussen op een nieuwe versie
    await page.click('#vw-ok');
    await expect(page.locator('#vw-melding')).toContainText('bijgewerkt');
    await expect(page.locator('.vw-tv-v').first()).toHaveText('1.4');
    await expect(page.locator('#vw-tv')).not.toBeChecked();
    await expect(page.locator('#vw-ok')).toBeDisabled();
    expect(net.staging.filter((r) => r.pad === '/adviseur/trajecten')).toHaveLength(1); // alleen de login

    await page.check('#vw-tv');
    await page.click('#vw-ok');
    await expect(page.locator('body')).toContainText('Synth Traject BV');
    expect(accepts(net).map((r) => JSON.parse(r.body).testvoorwaarden_versie)).toEqual(['1.3', '1.3', '1.3', '1.4']);
    await geenOpslag(page);
  });

  test('wachtwoord + verificatiecode: ontbrekend testerakkoord ook na MFA, daarna herladen met sessie', async ({ page, context, baseURL }) => {
    const b = backend({ mfa: true });
    const net = await onderschep(context, baseURL, b.api);
    await page.goto('/adv.html?worker=' + W);
    await logIn(page, { mfa: true });
    await expect(page.locator('#vw-tv')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('M&A Trajecten');
    await page.check('#vw-tv');
    await page.click('#vw-ok');
    await expect(page.locator('body')).toContainText('Synth Traject BV');
    const stappen = pad(net);
    expect(stappen.indexOf('POST /adviseur/mfa/verify')).toBeGreaterThan(-1);
    expect(stappen.indexOf('POST ' + ACCEPT_PAD)).toBeGreaterThan(stappen.indexOf('POST /adviseur/mfa/verify'));
    expect(net.staging.filter((r) => r.pad === '/adviseur/trajecten' && r.headers['x-gebruiker-token'] === SESSIE)).toHaveLength(2);
    expect(page.url()).not.toContain(SESSIE);
    await geenOpslag(page);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });
});
