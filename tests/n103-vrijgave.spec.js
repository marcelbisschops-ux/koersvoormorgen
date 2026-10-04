// N-103 (P1C, 4 okt 2026) — gericht browserbewijs voor de bestaande per-categorie koper-vrijgave: de
// echte mna.html (begeleiderslogin, mna/04 toonKoperToegangModal en mna/06 #vrijgeven-btn) in Chromium,
// met contextbrede route-interceptie op uitsluitend de bekende staging-host. Er gaat geen enkel verzoek
// naar productie, staging of een andere externe host: alles buiten localhost wordt onderschept
// (synthetische fixture) of afgebroken en geteld. Geen echte inloggegevens of klantdata.
// Bewijst alleen de UI-claim (klikpad, verzonden verzoek, zichtbare status) — geen backendacceptatie.
//
// Draaien: npx playwright test tests/n103-vrijgave.spec.js

import { test, expect } from '@playwright/test';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const W = encodeURIComponent(STAGING);
const CODE = 'TTST0103';
const TRAJECT_ID = 'MATST103';
const CAT_PAD = '/mna/koper-categorieen/' + TRAJECT_ID;
const traject = (extra) => Object.assign({
  id: TRAJECT_ID, kantoor_naam: 'Synth Kantoor BV', sector: 'accountancy', traject_type: 'Verkoop', status: 'actief',
  begeleider_naam: 'Synth Begeleider', koper_categorieen: null, koper_vrijgegeven: 0,
}, extra || {});

// Onderschept alles buiten localhost op contextniveau. `api(regel)` beantwoordt de N-103-route; de
// begeleiderslogin en VOK-status zijn vaste fixtures; overige staging-verzoeken krijgen een 404-fixture;
// al het andere (ook productie) wordt afgebroken en in `extern` gezet.
async function onderschep(context, baseURL, trajectFixture, api) {
  const extern = [];
  const staging = [];
  const origin = new URL(baseURL).origin;
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, x-tussen-key, x-gebruiker-token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' };
  await context.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
    if (u.origin === STAGING) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const regel = { method: req.method(), pad: u.pathname, zoek: u.search, headers: req.headers(), body: req.postData() };
      staging.push(regel);
      let r = null;
      if (regel.pad === '/mna/traject/' + CODE && regel.method === 'POST') r = { json: { ok: true, rol: 'tussenpersoon', traject: trajectFixture, platform_voorwaarden_akkoord: true, data: [] } };
      else if (regel.pad === '/mna/vok/status') r = { json: { getekend: true, geen_herteken_bij_versiebump: true } };
      else if (regel.pad === CAT_PAD) r = await api(regel);
      return route.fulfill({ status: (r && r.status) || (r ? 200 : 404), headers: cors, contentType: 'application/json', body: JSON.stringify(r ? r.json : { error: 'fixture: onbekend' }) });
    }
    extern.push(u.origin + u.pathname + u.search);
    return route.abort();
  });
  return { extern, staging, posts: () => staging.filter((r) => r.pad === CAT_PAD && r.method === 'POST') };
}

// Bestaande begeleiderslogin met de trajectcode; eindigt op het echte begeleiderdashboard.
async function logIn(page) {
  await page.goto('/mna.html?worker=' + W);
  await page.fill('#l-code', CODE);
  await page.click('#l-btn');
  await expect(page.locator('#bg-toegang')).toBeVisible();
  return page.evaluate(() => FASES.map((f) => f.id));
}

const kaart = (page) => page.locator('div:has(> #bg-toegang)');
const modal = (page) => page.locator('[role="dialog"]:has(#kopertoegang-modal-titel)');
const aangevinkt = (page) => page.locator('.kt-cat:checked').evaluateAll((els) => els.map((e) => e.value));

test.describe('N-103 · per-categorie koper-vrijgave (mna.html, begeleider)', () => {
  test('NULL = niets vrij; "Koper toegang geven" opent de categoriekeuze zonder POST; één categorie → exacte body, x-tussen-key en eigen traject', async ({ page, context, baseURL }) => {
    const net = await onderschep(context, baseURL, traject(), async () => ({ json: { ok: true } }));
    const fases = await logIn(page);
    expect(fases.length).toBeGreaterThan(2);
    await expect(kaart(page)).toContainText('Nog geen toegang gegeven');

    // De bestaande knop staat op het cover-scherm; lokale schermkeuze, daarna de echte render + bindAll.
    // De knop staat daar in een display:none-container, dus de echte onclick wordt via een DOM-klik aangeroepen.
    await page.evaluate(() => { S.screen = 'cover'; renderApp(); });
    const knop = page.locator('#vrijgeven-btn');
    await expect(knop).toContainText('Koper toegang geven');
    await knop.dispatchEvent('click');
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('.kt-cat')).toHaveCount(fases.length);
    expect(await aangevinkt(page)).toEqual([]);
    expect(net.posts()).toEqual([]);

    await page.check('.kt-cat[value="' + fases[1] + '"]');
    expect(net.posts()).toEqual([]);
    await page.click('#kt-ok');
    await expect(modal(page)).toHaveCount(0);
    const posts = net.posts();
    expect(posts).toHaveLength(1);
    expect(posts[0].zoek).toBe('');
    expect(JSON.parse(posts[0].body)).toEqual({ categorieen: [fases[1]] });
    expect(posts[0].headers['x-tussen-key']).toBe(CODE);
    await expect(page.locator('.toast-ok', { hasText: 'Koper-toegang bijgewerkt (1 categorie)' })).toBeVisible();
    await expect(page.locator('#intrekken-btn')).toHaveCount(1);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });

  test('bestaande selectie opnieuw openen klopt; wijzigen en Niets + Opslaan trekt alles in', async ({ page, context, baseURL }) => {
    const net = await onderschep(context, baseURL, traject({ koper_vrijgegeven: 1, koper_categorieen: null }), async () => ({ json: { ok: true } }));
    const fases = await logIn(page);
    await expect(kaart(page)).toContainText('Nog geen DD-categorieën vrijgegeven: de koper ziet nog geen dossierinhoud');

    await page.click('#bg-toegang');
    expect(await aangevinkt(page)).toEqual([]);
    await page.check('.kt-cat[value="' + fases[0] + '"]');
    await page.check('.kt-cat[value="' + fases[2] + '"]');
    await page.click('#kt-ok');
    await expect(modal(page)).toHaveCount(0);
    await expect(kaart(page)).toContainText('2 van de ' + fases.length + ' DD-categorieën vrijgegeven aan koper');

    await page.click('#bg-toegang');
    expect(await aangevinkt(page)).toEqual([fases[0], fases[2]]);
    await page.click('#kt-niets');
    expect(await aangevinkt(page)).toEqual([]);
    expect(net.posts()).toHaveLength(1);
    await page.click('#kt-ok');
    await expect(modal(page)).toHaveCount(0);
    await expect(page.locator('.toast-ok', { hasText: 'Koper-toegang volledig ingetrokken' })).toBeVisible();
    await expect(kaart(page)).toContainText('Nog geen toegang gegeven');

    expect(net.posts().map((r) => [r.zoek, JSON.parse(r.body), r.headers['x-tussen-key']])).toEqual([
      ['', { categorieen: [fases[0], fases[2]] }, CODE],
      ['', { categorieen: [] }, CODE],
    ]);
    await page.click('#bg-toegang');
    expect(await aangevinkt(page)).toEqual([]);
  });

  test('API-fout: modal blijft open met de fout, geen lokaal vals succes', async ({ page, context, baseURL }) => {
    const net = await onderschep(context, baseURL, traject(), async () => ({ status: 500, json: { error: 'Synthetische fout: opslaan mislukt.' } }));
    const fases = await logIn(page);
    await page.click('#bg-toegang');
    await page.check('.kt-cat[value="' + fases[0] + '"]');
    await page.click('#kt-ok');
    await expect(page.locator('#kt-err')).toHaveText('Synthetische fout: opslaan mislukt.');
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('#kt-ok')).toBeEnabled();
    await expect(page.locator('#kt-ok')).toHaveText('Opslaan');
    expect(await aangevinkt(page)).toEqual([fases[0]]);
    expect(await page.evaluate(() => [S.traject.koper_categorieen, S.traject.koper_vrijgegeven])).toEqual([null, 0]);
    await expect(page.locator('.toast-ok')).toHaveCount(0);
    await expect(kaart(page)).toContainText('Nog geen toegang gegeven');
    expect(net.posts()).toHaveLength(1);
  });

  test('NDA niet getekend: weigeren geeft geen force-POST, toestemming geeft exact force=1', async ({ page, context, baseURL }) => {
    const dialogen = [];
    let antwoord = false;
    page.on('dialog', async (d) => { dialogen.push(d.message()); if (antwoord) await d.accept(); else await d.dismiss(); });
    const net = await onderschep(context, baseURL, traject(), async (r) => (r.zoek === '?force=1'
      ? { json: { ok: true } }
      : { json: { nda_niet_getekend: true } }));
    const fases = await logIn(page);
    await page.click('#bg-toegang');
    await page.check('.kt-cat[value="' + fases[1] + '"]');

    await page.click('#kt-ok');
    await expect.poll(() => dialogen.length).toBe(1);
    expect(dialogen[0]).toContain('De NDA is nog NIET getekend');
    await expect(page.locator('#kt-ok')).toBeEnabled();
    await expect(page.locator('#kt-ok')).toHaveText('Opslaan');
    await expect(modal(page)).toBeVisible();
    expect(net.posts().map((r) => r.zoek)).toEqual(['']);
    expect(await page.evaluate(() => S.traject.koper_categorieen)).toBeNull();
    await expect(page.locator('.toast-ok')).toHaveCount(0);

    antwoord = true;
    await page.click('#kt-ok');
    await expect(modal(page)).toHaveCount(0);
    expect(dialogen).toHaveLength(2);
    const posts = net.posts();
    expect(posts.map((r) => r.zoek)).toEqual(['', '', '?force=1']);
    for (const p of posts) {
      expect(JSON.parse(p.body)).toEqual({ categorieen: [fases[1]] });
      expect(p.headers['x-tussen-key']).toBe(CODE);
    }
    await expect(page.locator('.toast-ok', { hasText: 'Koper-toegang bijgewerkt (1 categorie)' })).toBeVisible();
    await expect(kaart(page)).toContainText('1 van de ' + fases.length + ' DD-categorieën vrijgegeven aan koper');
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });
});
