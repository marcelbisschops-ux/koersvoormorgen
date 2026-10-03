// P1C (N-95, 3 okt 2026) — gerichte browsertest voor de minimale promotie-UI en de eigen
// trajectdoorgang: de echte pagina's (mna.html koopmandaatscherm en adv.html) in Chromium, met lokale
// route-interceptie op uitsluitend de bekende staging-host. Er gaat geen enkel verzoek naar productie,
// staging of een andere externe host: alles buiten localhost wordt onderschept (synthetische fixture)
// of afgebroken en geteld. Geen echte inloggegevens, prijzen of klantdata — alles is synthetisch.
//
// Draaien: npx playwright test tests/p1c-promotie.spec.js

import { test, expect } from '@playwright/test';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const W = encodeURIComponent(STAGING);
const MANDAAT = 'TTST0001';
const KOPER = 'KTST0001';
const TARGET = 'km_t1';
const SESSIE = 'sessie-synth-' + 'z'.repeat(24);
const PROMO_PAD = '/mna/koopmandaat/' + MANDAAT + '/target/' + TARGET + '/promoveer';
const SECTOREN = { ok: true, profielen: { mkb: { label: 'MKB' }, zorg: { label: 'Zorg' } } };
const quote = (extra) => Object.assign({
  ok: true, pakket_verplicht: true, fee_vrijgesteld: false, test_boeking: false, sector: 'mkb',
  pakketten: [{ pakket: 'workflow', label: 'Workflow', bedrag: 101 }, { pakket: 'slim', label: 'Slim', bedrag: 1234.5 }, { pakket: 'compleet', label: 'Compleet', bedrag: 303 }],
}, extra || {});
const SUCCES = { ok: true, traject_id: 'MASECRET1', koper_code: 'KSECRET1', tussen_code: 'TNEW0001', traject_ref: 'TRSYNTH00001', pakket: 'slim', fee: { bedrag: 1234.5, test_boeking: 0 }, vervolg: { rol: 'tussenpersoon', login_code: 'TNEW0001' } };

// Onderschept alles buiten localhost op contextniveau (dus ook in een nieuw tabblad). `api(req, u)`
// beantwoordt staging-verzoeken; al het andere (ook productie) wordt afgebroken en in `extern` gezet.
async function onderschep(context, baseURL, api) {
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
      const regel = { method: req.method(), pad: u.pathname, headers: req.headers(), body: req.postData() };
      staging.push(regel);
      const r = await api(regel, u);
      return route.fulfill({ status: (r && r.status) || (r ? 200 : 404), headers: cors, contentType: 'application/json', body: JSON.stringify(r ? r.json : { error: 'fixture: onbekend' }) });
    }
    extern.push(u.origin + u.pathname + u.search);
    return route.abort();
  });
  return { extern, staging };
}

// Bestaande adviseurslogin: wachtwoord → (optioneel) verificatiecode → (optioneel) voorwaarden.
function adviseurLogin({ mfa = false, gv = true, trajecten = [] } = {}) {
  let geaccepteerd = gv;
  return (r) => {
    if (r.pad === '/adviseur/trajecten' && r.method === 'POST') {
      const metToken = r.headers['x-gebruiker-token'] === SESSIE;
      if (!metToken && mfa) return { json: { ok: true, mfa_required: true, mfa_token: 'mfa-synth-1', email: 'adviseur@voorbeeld.test' } };
      if (!metToken && !/wachtwoord/.test(decodeURIComponent(r.body || ''))) return { status: 401, json: { error: 'Inloggegevens onjuist.' } };
      return { json: { ok: true, sessie_token: SESSIE, naam: 'Synth Adviseur', bedrijf: 'Synth Kantoor', trajecten, traject_limiet: 5, modules: { traject: true }, voorwaarden: { gv_akkoord: geaccepteerd } } };
    }
    if (r.pad === '/adviseur/mfa/verify') return JSON.parse(r.body).code === '123456' ? { json: { ok: true, sessie_token: SESSIE } } : { status: 401, json: { error: 'Code onjuist.' } };
    if (r.pad === '/gebruiker/voorwaarden') return { json: { gv: { tekst: 'Synthetische gebruiksvoorwaarden.' } } };
    if (r.pad === '/gebruiker/voorwaarden/accepteren') { geaccepteerd = r.headers['x-gebruiker-token'] === SESSIE; return { json: { ok: geaccepteerd } }; }
    if (r.pad === '/mna/sectorprofielen') return { json: SECTOREN };
    return null;
  };
}

async function logIn(page, { mfa = false, gv = true } = {}) {
  await page.fill('#l-e', 'adviseur@voorbeeld.test');
  await page.fill('#l-w', 'synthetisch-wachtwoord');
  await page.click('#l-btn');
  if (mfa) { await page.fill('#m-c', '123456'); await page.click('#m-btn'); }
  if (!gv) { await page.check('#vw-gv'); await page.click('#vw-ok'); }
}

const geenOpslag = async (page) => expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

test.describe('P1C · promotie via de bestaande adviseurslogin (adv.html)', () => {
  test('eigenaar: wachtwoord + verificatiecode + voorwaarden eerst, dan serverprijzen, pas POST na bevestiging, vervolg als begeleider', async ({ page, context, baseURL }) => {
    const login = adviseurLogin({ mfa: true, gv: false });
    const net = await onderschep(context, baseURL, async (r) => {
      if (r.pad === PROMO_PAD) return r.method === 'GET' ? { json: quote() } : { json: SUCCES };
      return login(r);
    });
    await page.goto('/adv.html?promotie=' + MANDAAT + '&target=' + TARGET + '&worker=' + W);
    expect(page.url()).toBe(new URL(baseURL).origin + '/adv.html?worker=' + W);
    await expect(page.locator('#p1c-login-hint')).toBeVisible();
    expect(net.staging).toEqual([]);

    await logIn(page, { mfa: true, gv: false });
    await expect(page.locator('#p1c-bevestig')).toBeVisible();
    const pad = net.staging.map((r) => r.method + ' ' + r.pad);
    const eersteQuote = pad.indexOf('GET ' + PROMO_PAD);
    expect(eersteQuote).toBeGreaterThan(pad.indexOf('POST /adviseur/mfa/verify'));
    expect(eersteQuote).toBeGreaterThan(pad.indexOf('POST /gebruiker/voorwaarden/accepteren'));
    const get = net.staging[eersteQuote];
    expect(get.headers['x-tussen-key']).toBe(MANDAAT);
    expect(get.headers['x-gebruiker-token']).toBe(SESSIE);

    // Actuele serverprijzen, geen voorkeuze van een pakket, bekende sector zichtbaar voorgeselecteerd.
    await expect(page.locator('.p1c-bedrag')).toHaveText(['€ 101,00', '€ 1.234,50', '€ 303,00']);
    expect(await page.locator('input[name="p1c-pakket"]:checked').count()).toBe(0);
    expect(await page.locator('input[name="p1c-pakket"][value=""]').count()).toBe(0); // betaler: geen "zonder pakket"
    await expect(page.locator('#p1c-sector')).toHaveValue('mkb');
    await expect(page.locator('#p1c-bevestig')).toBeDisabled();
    await page.check('input[name="p1c-pakket"][value="slim"]');
    await expect(page.locator('#p1c-bevestig')).toBeDisabled(); // nog geen expliciete bevestiging
    await page.check('#p1c-akkoord');
    await expect(page.locator('#p1c-bevestig')).toBeEnabled();
    expect(net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST')).toEqual([]);

    await page.click('#p1c-bevestig');
    await expect(page.locator('#p1c-succes')).toBeVisible();
    const posts = net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0].body)).toEqual({ pakket: 'slim', sector: 'mkb' });
    expect(posts[0].headers['x-tussen-key']).toBe(MANDAAT);
    expect(posts[0].headers['x-gebruiker-token']).toBe(SESSIE);
    await expect(page.locator('#p1c-ref')).toHaveText('TRSYNTH00001');
    await expect(page.locator('#p1c-verder')).toHaveAttribute('href', 'mna.html?code=TNEW0001&worker=' + W);
    for (const geheim of ['MASECRET1', 'KSECRET1', 'TNEW0001', SESSIE]) await expect(page.locator('body')).not.toContainText(geheim);

    expect(page.url()).not.toContain(SESSIE);
    await geenOpslag(page);
    expect(net.extern.filter((x) => !x.includes('/assets/'))).toEqual([]);
  });

  test('onbekende sector vraagt een echte keuze; backendweigering is eerlijk, dubbelklik geeft één POST, opnieuw proberen werkt', async ({ page, context, baseURL }) => {
    const login = adviseurLogin();
    let n = 0, vrijgeven;
    const eersteGehouden = new Promise((r) => { vrijgeven = r; });
    const net = await onderschep(context, baseURL, async (r) => {
      if (r.pad === PROMO_PAD && r.method === 'GET') return { json: quote({ sector: null, test_boeking: true }) };
      if (r.pad === PROMO_PAD && r.method === 'POST') {
        n++;
        if (n === 1) { await eersteGehouden; return { status: 403, json: { error: 'Trajectlimiet bereikt (1). Neem contact op via koersvoormorgen.nl voor uitbreiding.' } }; }
        return { json: Object.assign({}, SUCCES, { pakket: 'workflow', fee: { test_boeking: 1 } }) };
      }
      return login(r);
    });
    await page.goto('/adv.html?promotie=' + MANDAAT + '&target=' + TARGET + '&worker=' + W);
    await logIn(page);
    await expect(page.locator('#p1c-test')).toBeVisible();
    await expect(page.locator('#p1c-sector-onbekend')).toBeVisible();
    await expect(page.locator('#p1c-sector')).toHaveValue('');
    await page.check('input[name="p1c-pakket"][value="workflow"]');
    await page.check('#p1c-akkoord');
    await expect(page.locator('#p1c-bevestig')).toBeDisabled(); // geen sector aangenomen
    await page.selectOption('#p1c-sector', 'zorg');
    await expect(page.locator('#p1c-bevestig')).toBeEnabled();

    await page.evaluate(() => { const b = document.getElementById('p1c-bevestig'); b.click(); b.click(); });
    await expect.poll(() => net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST').length).toBe(1);
    await expect(page.locator('#p1c-bevestig')).toBeDisabled();
    vrijgeven();
    await expect(page.locator('#p1c-fout')).toContainText('Trajectlimiet bereikt');
    await expect(page.locator('#p1c-succes')).toHaveCount(0);
    await expect(page.locator('#p1c-bevestig')).toBeEnabled();
    expect(net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST')).toHaveLength(1);

    await page.click('#p1c-bevestig');
    await expect(page.locator('#p1c-succes')).toBeVisible();
    const posts = net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST');
    expect(posts.map((r) => JSON.parse(r.body))).toEqual([{ pakket: 'workflow', sector: 'zorg' }, { pakket: 'workflow', sector: 'zorg' }]);
    await geenOpslag(page);
  });

  test('identiteit niet de eigenaar → eerlijke weigering bij de prijs, geen bevestigknop en geen POST', async ({ page, context, baseURL }) => {
    const login = adviseurLogin();
    const net = await onderschep(context, baseURL, async (r) => {
      if (r.pad === PROMO_PAD && r.method === 'GET') return { status: 403, json: { error: 'Dit mandaat is van een andere adviseur. Promotie door een andere adviseur is (nog) niet mogelijk.', reden: 'fee_recht_niet_besloten' } };
      if (r.pad === PROMO_PAD) return { json: SUCCES };
      return login(r);
    });
    await page.goto('/adv.html?promotie=' + MANDAAT + '&target=' + TARGET + '&worker=' + W);
    await logIn(page);
    await expect(page.locator('#p1c-fout')).toContainText('Dit mandaat is van een andere adviseur');
    await expect(page.locator('#p1c-bevestig')).toHaveCount(0);
    await expect(page.locator('#p1c-succes')).toHaveCount(0);
    expect(net.staging.filter((r) => r.pad === PROMO_PAD && r.method === 'POST')).toEqual([]);
  });

  test('bestaand traject: alleen via de eigen trajectenlijst met de eigen begeleiderscode; anders geweigerd', async ({ page, context, baseURL }) => {
    let lijst = [{ id: 'MAANDER1', tussen_code: 'TANDER01', kantoor_naam: 'Ander Synth BV' }, { id: 'MATST001', tussen_code: 'TOWN0001', kantoor_naam: 'Synth Traject BV' }];
    const net = await onderschep(context, baseURL, async (r) => adviseurLogin({ trajecten: lijst })(r));
    await page.goto('/adv.html?traject=MATST001&worker=' + W);
    expect(page.url()).toBe(new URL(baseURL).origin + '/adv.html?worker=' + W);
    await logIn(page);
    await expect(page.locator('#p1c-open-begeleider')).toHaveAttribute('href', 'mna.html?code=TOWN0001&worker=' + W);
    await expect(page.locator('body')).toContainText('Synth Traject BV');

    lijst = [{ id: 'MAANDER1', tussen_code: 'TANDER01' }, { id: 'MATST001' }];
    await page.goto('/adv.html?traject=MATST001&worker=' + W);
    await logIn(page);
    await expect(page.locator('#p1c-geweigerd')).toBeVisible();
    expect(await page.locator('a[href*="mna.html?code="]').count()).toBe(0);
    expect(net.staging.some((r) => r.pad.includes('MATST001'))).toBe(false);
    await geenOpslag(page);
  });

  test('zonder context: gewone login naar het dashboard, geen promotieverzoek', async ({ page, context, baseURL }) => {
    const net = await onderschep(context, baseURL, async (r) => adviseurLogin()(r));
    await page.goto('/adv.html?worker=' + W);
    await expect(page.locator('#p1c-login-hint')).toHaveCount(0);
    await logIn(page);
    await expect(page.locator('body')).toContainText('M&A Trajecten');
    expect(net.staging.some((r) => r.pad.includes('/promoveer'))).toBe(false);
  });
});

test.describe('P1C · koopmandaatscherm (mna.html)', () => {
  test('begeleider: Promoveer en Open het traject openen adv.html-context; mna.html post zelf niets', async ({ page, context, baseURL }) => {
    const net = await onderschep(context, baseURL, async (r) => {
      if (r.pad === '/mna/traject/' + MANDAAT) return { status: 404, json: { error: 'niet gevonden' } };
      if (r.pad === '/mna/koopmandaat/' + MANDAAT) return { json: { ok: true, rol: 'begeleider',
        mandaat: { id: 'm1', koper_naam: 'Synth Koper BV', begeleider_naam: 'Synth Begeleider', status: 'actief' },
        targets: [
          { id: TARGET, naam: 'Synth Kandidaat BV', sector: 'mkb', status: 'kandidaat', notities: '', contactlog: [], bron: '', vrijgave_status: 'afgeschermd', teaser: null },
          { id: 'km_t2', naam: 'Synth Gepromoveerd BV', sector: 'zorg', status: 'gepromoveerd', gepromoveerd_naar_traject_id: 'MATST001', gepromoveerd_naar_traject_ref: 'TRSYNTH00002', notities: '', contactlog: [], bron: '', vrijgave_status: 'vrijgegeven', teaser: null },
        ] } };
      return null;
    });
    await page.goto('/mna.html?worker=' + W);
    await page.fill('#l-code', MANDAAT);
    await page.click('#l-btn');
    await expect(page.locator('.km-promoveer-btn')).toHaveAttribute('href', 'adv.html?promotie=' + MANDAAT + '&target=' + TARGET + '&worker=' + W);
    await expect(page.locator('.km-open-traject')).toHaveAttribute('href', 'adv.html?traject=MATST001&worker=' + W);
    expect(await page.locator('a[href^="mna.html?code=MATST001"]').count()).toBe(0);

    const [tab] = await Promise.all([context.waitForEvent('page'), page.click('.km-promoveer-btn')]);
    await tab.waitForLoadState();
    await expect(tab.locator('#p1c-login-hint')).toBeVisible();
    expect(tab.url()).toBe(new URL(baseURL).origin + '/adv.html?worker=' + W);
    expect(net.staging.some((r) => r.pad.endsWith('/promoveer'))).toBe(false);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });

  test('koper: Open eigen traject alleen bij vrijgegeven + gepromoveerd; stale en verkeerde rol eerlijk, eigen kopercode opent', async ({ page, context, baseURL }) => {
    let stap = 0;
    const net = await onderschep(context, baseURL, async (r) => {
      if (r.pad === '/mna/traject/' + KOPER || r.pad === '/mna/traject/KNEW0001') return { status: 404, json: { error: 'niet gevonden' } };
      if (r.pad === '/mna/koopmandaat/' + KOPER) return { json: { ok: true, rol: 'koper',
        mandaat: { id: 'm1', koper_naam: 'Synth Koper BV', status: 'actief' },
        targets: [
          { id: TARGET, status: 'gepromoveerd', vrijgave_status: 'vrijgegeven', teaser: null, naam: 'Synth Vrijgegeven BV', sector: 'mkb', traject_ref: 'TRSYNTH00001' },
          { id: 'km_t2', status: 'in_gesprek', vrijgave_status: 'vrijgegeven', teaser: null, naam: 'Synth Gesprek BV', sector: 'zorg', traject_ref: null },
          { id: 'km_t3', status: 'gepromoveerd', vrijgave_status: 'afgeschermd', teaser: { regio: 'zuid' } },
        ] } };
      if (r.pad === '/mna/koopmandaat/' + KOPER + '/target/' + TARGET + '/traject') {
        stap++;
        if (stap === 1) return { status: 404, json: { error: 'Er is (nog) geen vrijgegeven traject beschikbaar voor deze target.' } };
        if (stap === 2) return { json: { ok: true, traject_ref: 'TRSYNTH00001', vervolg: { rol: 'tussenpersoon', login_code: 'TFOUT001' } } };
        return { json: { ok: true, traject_ref: 'TRSYNTH00001', vervolg: { rol: 'koper', login_code: 'KNEW0001' } } };
      }
      return null;
    });
    await page.goto('/mna.html?worker=' + W);
    await page.fill('#l-code', KOPER);
    await page.click('#l-btn');
    await expect(page.locator('.km-koper-kaart')).toHaveCount(3);
    await expect(page.locator('.km-koper-traject-btn')).toHaveCount(1);
    await expect(page.locator('.km-koper-kaart').nth(0).locator('.km-koper-traject-btn')).toHaveCount(1);

    const startUrl = page.url();
    await page.click('.km-koper-traject-btn');
    await expect(page.locator('.km-koper-traject-melding')).toContainText('nog) geen vrijgegeven traject');
    expect(page.url()).toBe(startUrl);

    await page.click('.km-koper-traject-btn');
    await expect(page.locator('.km-koper-traject-melding')).toContainText('onvolledig antwoord');
    expect(page.url()).toBe(startUrl);
    expect(net.staging.some((r) => r.pad.includes('TFOUT001'))).toBe(false);

    await Promise.all([page.waitForURL(/\/mna\.html\?code=KNEW0001&worker=/), page.click('.km-koper-traject-btn')]);
    expect(page.url()).toBe(new URL(baseURL).origin + '/mna.html?code=KNEW0001&worker=' + W);
    const handoffs = net.staging.filter((r) => r.pad.endsWith('/traject') && r.pad.startsWith('/mna/koopmandaat/'));
    expect(handoffs.map((r) => r.method)).toEqual(['GET', 'GET', 'GET']);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
    await geenOpslag(page);
  });
});
