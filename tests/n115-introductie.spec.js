// N-115 (P1B, 3 okt 2026) — gerichte browsertest voor de introductieovereenkomst: de echte pagina's
// (introductie.html en het koopmandaatscherm in mna.html) in Chromium, met lokale route-interceptie
// op uitsluitend de bekende staging-host. Er gaat geen enkel verzoek naar productie, staging of een
// andere externe host: alles buiten localhost wordt onderschept (fixture) of afgebroken en geteld.
// Geen echte contactgegevens, akkoorden of klantdata — alle gegevens zijn synthetisch.
//
// Draaien: npx playwright test tests/n115-introductie.spec.js

import { test, expect } from '@playwright/test';
import { maakLokaleBackend } from './n115-e2e-lokaal.mjs';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const TOKEN = 'Tst-n115-' + 'x'.repeat(34);
const HASH = 'a'.repeat(64);
const TEKST = '<img src=x onerror="window.__xss=1">\nArtikel 1 — synthetische testtekst';

const overeenkomst = (status = 'open') => ({
  ok: true,
  overeenkomst: { versie: 2, tekst: TEKST, inhoud_hash: HASH, verloopt_op: Date.now() + 864e5, partijen: { target_naam: 'Testonderneming Synthetisch BV', geselecteerde_koper: 'Testkoper BV', begeleider_naam: 'Test Begeleider' } },
  status, akkoord_op: status === 'akkoord' ? Date.now() : null,
});

// Onderschept alles buiten localhost. `api(route, url)` beantwoordt staging-verzoeken; al het andere
// (ook productie) wordt afgebroken en in `extern` vastgelegd.
async function onderschep(page, api) {
  const extern = [];
  const staging = [];
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
    if (u.origin === STAGING) {
      staging.push({ method: route.request().method(), pad: u.pathname, body: route.request().postData() });
      const r = await api(route, u);
      if (r) return route.fulfill({ status: r.status || 200, contentType: 'application/json', body: JSON.stringify(r.json) });
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'fixture: onbekend' }) });
    }
    extern.push(u.origin + u.pathname);
    return route.abort();
  });
  return { extern, staging };
}

test.describe('N-115 · introductie.html (target)', () => {
  test('toont de overeenkomst inert, haalt het token uit de adresbalk en legt akkoord pas vast na serverbevestiging', async ({ page }) => {
    let geaccordeerd = false;
    const net = await onderschep(page, async (route, u) => {
      if (u.pathname !== '/mna/koopmandaat/introductie/' + TOKEN) return null;
      if (route.request().method() === 'POST') { geaccordeerd = true; return { json: { ok: true, status: 'akkoord', versie: 2, inhoud_hash: HASH } }; }
      return { json: overeenkomst(geaccordeerd ? 'akkoord' : 'open') };
    });
    await page.goto('/introductie.html?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING));
    await expect(page.locator('#intro-tekst')).toHaveText(TEKST);
    expect(await page.locator('#intro-tekst img').count()).toBe(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(page.url()).not.toContain(TOKEN);
    expect(page.url()).toContain('worker=');

    await expect(page.locator('#intro-akkoord')).toBeDisabled();
    await page.fill('#intro-naam', 'Test Persoon');
    await expect(page.locator('#intro-akkoord')).toBeDisabled();
    await page.check('#intro-bevoegd');
    await page.click('#intro-akkoord');
    await expect(page.locator('#intro-status-akkoord')).toBeVisible();
    await expect(page.locator('body')).toContainText('Uw akkoord op versie 2 is vastgelegd.');

    const post = net.staging.find((r) => r.method === 'POST');
    expect(JSON.parse(post.body)).toEqual({ actie: 'akkoord', naam: 'Test Persoon', inhoud_hash: HASH });
    expect(net.extern.filter((x) => !x.includes('/assets/'))).toEqual([]);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });

  test('verouderde versie (409) geeft een expliciete fout en geen succesmelding', async ({ page }) => {
    await onderschep(page, async (route) => (route.request().method() === 'POST'
      ? { status: 409, json: { error: 'De overeenkomst is gewijzigd. Laad de actuele versie opnieuw.' } }
      : { json: overeenkomst('open') }));
    await page.goto('/introductie.html?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING));
    await page.fill('#intro-toelichting', 'Graag artikel 2 aanpassen');
    await page.click('#intro-wijziging');
    await expect(page.locator('#intro-melding')).toContainText('De overeenkomst is gewijzigd');
    await expect(page.locator('#intro-herlaad')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('is vastgelegd.');
  });

  test('een onbekende worker-parameter krijgt het token nooit', async ({ page }) => {
    const net = await onderschep(page, async () => null);
    await page.goto('/introductie.html?token=' + TOKEN + '&worker=' + encodeURIComponent('https://evil.example'));
    await expect(page.locator('.err')).toBeVisible();
    expect(net.extern.some((x) => x.includes('evil.example'))).toBe(false);
    expect(net.extern.some((x) => x.startsWith(PROD + '/mna/koopmandaat/introductie/'))).toBe(true); // onderschept en afgebroken
    expect(net.staging).toEqual([]);
  });
});

test.describe('N-115 · koopmandaatscherm (mna.html)', () => {
  const KOPER = 'KTST0001';
  const BEGELEIDER = 'TTST0001';

  test('koper ziet vóór vrijgave alleen de anonieme teaser en na vrijgave alleen naam/sector', async ({ page }) => {
    const net = await onderschep(page, async (route, u) => {
      if (u.pathname === '/mna/traject/' + KOPER) return { status: 404, json: { error: 'niet gevonden' } };
      if (u.pathname === '/mna/koopmandaat/' + KOPER) return { json: { ok: true, rol: 'koper',
        mandaat: { id: 'm1', koper_naam: 'Testkoper BV', zoekt_sectoren: 'zorg', status: 'actief' },
        targets: [
          { id: 't1', status: 'kandidaat', vrijgave_status: 'afgeschermd', teaser: { regio: 'zuid', omzetklasse: '1m_2_5m', omschrijving: 'Synthetische anonieme omschrijving' } },
          { id: 't2', status: 'in_gesprek', vrijgave_status: 'vrijgegeven', teaser: null, naam: 'Vrijgegeven Testbedrijf BV', sector: 'zorg', traject_ref: null },
        ] } };
      return null;
    });
    await page.goto('/mna.html?worker=' + encodeURIComponent(STAGING));
    await page.fill('#l-code', KOPER);
    await page.click('#l-btn');
    await expect(page.locator('.km-koper-kaart')).toHaveCount(2);
    await expect(page.locator('.km-koper-kaart').nth(0)).toContainText('Anonieme kandidaat');
    await expect(page.locator('.km-koper-kaart').nth(0)).toContainText('Zuid-Nederland');
    await expect(page.locator('.km-koper-kaart').nth(1)).toContainText('Vrijgegeven Testbedrijf BV');
    await expect(page.locator('.km-intro-btn')).toHaveCount(0);
    expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
  });

  test('begeleider: link met staging-worker, geen vrijgaveknop zonder akkoord op de actuele versie', async ({ page }) => {
    const ovz = {
      ok: true, target: { id: 't1', naam: 'Testonderneming Synthetisch BV', status: 'kandidaat' }, alleen_lezen: false, juridische_validatie: 'afzonderlijk_vereist',
      huidige_versie: { id: 'v2', versie: 2, tekst: 'Synthetische overeenkomsttekst', partijen: { target_naam: 'Testonderneming Synthetisch BV', geselecteerde_koper: 'Testkoper BV', begeleider_naam: 'Test Begeleider' }, inhoud_hash: HASH, status: 'actief', aangemaakt_op: Date.now(), link: { actief: false } },
      versies: [], reacties: [{ versie: 1, inhoud_hash: 'b'.repeat(64), soort: 'akkoord', naam: 'Oud Akkoord', created_at: Date.now() - 864e5 }],
      vrijgave: { status: 'afgeschermd' }, teaser: null, contact: { naam: null, email: null }, bewaring: { relatie_einde_op: null, legal_hold: null },
    };
    const net = await onderschep(page, async (route, u) => {
      if (u.pathname === '/mna/traject/' + BEGELEIDER) return { status: 404, json: { error: 'niet gevonden' } };
      if (u.pathname === '/mna/koopmandaat/' + BEGELEIDER) return { json: { ok: true, rol: 'begeleider',
        mandaat: { id: 'm1', koper_naam: 'Testkoper BV', begeleider_naam: 'Test Begeleider', status: 'actief' },
        targets: [{ id: 't1', naam: 'Testonderneming Synthetisch BV', sector: '', status: 'kandidaat', notities: '', contactlog: [], bron: '', vrijgave_status: 'afgeschermd', teaser: null }] } };
      if (u.pathname === '/mna/koopmandaat/' + BEGELEIDER + '/target/t1/introductie') {
        if (route.request().method() === 'POST') {
          ovz.huidige_versie.link = { actief: true, verloopt_op: Date.now() + 14 * 864e5, uitgegeven_op: Date.now() };
          return { json: { ok: true, token: TOKEN, pad: '/mna/koopmandaat/introductie/' + TOKEN, verloopt_op: Date.now() + 14 * 864e5, versie: 2, inhoud_hash: HASH } };
        }
        return { json: ovz };
      }
      return null;
    });
    await page.goto('/mna.html?worker=' + encodeURIComponent(STAGING));
    await page.fill('#l-code', BEGELEIDER);
    await page.click('#l-btn');
    await page.click('.km-intro-btn');
    await expect(page.locator('#km-intro-modal')).toContainText('Versie 2');
    await expect(page.locator('#km-intro-vrijgeven')).toHaveCount(0);
    await page.click('#km-intro-link-uit');
    await expect(page.locator('#km-intro-link')).toHaveValue(new URL(page.url()).origin + '/introductie.html?token=' + TOKEN + '&worker=' + encodeURIComponent(STAGING));
    const post = net.staging.find((r) => r.method === 'POST' && r.pad === '/mna/koopmandaat/' + BEGELEIDER + '/target/t1/introductie');
    expect(JSON.parse(post.body)).toEqual({ actie: 'link_uitgeven', geldig_dagen: 14 });
    expect(await page.evaluate((t) => JSON.stringify(localStorage).includes(t) || JSON.stringify(sessionStorage).includes(t), TOKEN)).toBe(false);
  });
});

// Gezamenlijke flow: drie browsercontexten (begeleider, target, koper) tegen één lokale database met de
// ECHTE handleKoopmandaat uit de gekoppelde backend (tests/n115-e2e-lokaal.mjs). Staging-verzoeken naar
// /mna/koopmandaat/… gaan naar die handler; overige staging-verzoeken krijgen een 404-fixture; al het
// andere buiten localhost wordt afgebroken en geteld. Geen N-115-antwoord is hier een fixture.
test.describe('N-115 · volledige lokale flow (echte backendhandler + node:sqlite)', () => {
  const MANDAAT = { koper_naam: 'Synth Koper E2E BV', begeleider_naam: 'Synth Begeleider E2E' };
  const TARGET = { naam: 'Synth Doelwit E2E BV', sector: 'synthsector-e2e', notities: 'SYNTH-C-NOTITIE-E2E', bron: 'SYNTH-C-BRON-E2E' };
  const C_LEK = [TARGET.notities, TARGET.bron];
  const TEKST_E2E = 'Synthetische introductieovereenkomst E2E <img src=x onerror="window.__xss=1">\nArtikel 1 — synthetische testtekst, juridische eindvalidatie afzonderlijk.';
  const AKKOORD_NAAM = 'Synth Akkoordgever E2E';

  test('N-115 volledig lokaal: begeleider → target → vrijgave → koper', async ({ browser, baseURL }) => {
    test.setTimeout(120000);
    const backend = await maakLokaleBackend({ origin: new URL(baseURL).origin });
    const contexten = [];
    const net = { staging: [], extern: [] };
    const dialogen = [];

    async function nieuwePagina(rol) {
      const context = await browser.newContext({ baseURL });
      contexten.push(context);
      await context.route('**/*', async (route) => {
        const req = route.request();
        const u = new URL(req.url());
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
        if (u.origin === STAGING) {
          const regel = { rol, method: req.method(), pad: u.pathname, body: req.postData(), status: null, antwoord: null };
          net.staging.push(regel);
          const r = await backend.verwerk({ method: req.method(), url: u.href, headers: req.headers(), body: req.postData() });
          if (r) { regel.status = r.status; regel.antwoord = r.body; return route.fulfill({ status: r.status, headers: r.headers, body: r.body }); }
          regel.status = 404;
          return route.fulfill({ status: 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': new URL(baseURL).origin }, body: JSON.stringify({ error: 'fixture: onbekend' }) });
        }
        net.extern.push(u.origin + u.pathname);
        return route.abort();
      });
      const page = await context.newPage();
      page.on('dialog', async (d) => { dialogen.push({ rol, tekst: d.message() }); await d.accept(); });
      return page;
    }
    async function loginMandaat(page, code) {
      await page.goto('/mna.html?worker=' + encodeURIComponent(STAGING));
      await page.fill('#l-code', code);
      await page.click('#l-btn');
    }
    const posts = (pad, actie) => net.staging.filter((r) => r.method === 'POST' && r.pad === pad && (!actie || JSON.parse(r.body || '{}').actie === actie));
    const laatsteKoperDto = (K) => JSON.parse(net.staging.filter((r) => r.rol.startsWith('koper') && r.method === 'GET' && r.pad === '/mna/koopmandaat/' + K).pop().antwoord);

    try {
      const { begeleiderCode: T, koperCode: K, targetId } = await backend.richtIn({ mandaat: MANDAAT, target: TARGET });
      const introPad = '/mna/koopmandaat/' + T + '/target/' + targetId + '/introductie';

      // ── 1. Begeleider: overeenkomst versie 1, anonieme teaser, link ──
      const bPage = await nieuwePagina('begeleider');
      await loginMandaat(bPage, T);
      await expect(bPage.locator('.km-intro-btn')).toHaveCount(1);
      await bPage.click('.km-intro-btn');
      const modal = bPage.locator('#km-intro-modal');
      await expect(modal).toContainText('Er is nog geen overeenkomst vastgesteld');
      await bPage.fill('#km-intro-tekst', TEKST_E2E);
      await bPage.click('#km-intro-versie');
      await expect(bPage.locator('#km-intro-melding')).toContainText('Versie vastgesteld.');
      await expect(modal).toContainText('Versie 1');
      await expect(modal).toContainText('Nog geen akkoord op deze versie');

      await bPage.selectOption('#km-teaser-regio', 'zuid');
      await bPage.selectOption('#km-teaser-omzet', '1m_2_5m');
      await bPage.selectOption('#km-teaser-mw', '11_25');
      await bPage.fill('#km-teaser-omschrijving', 'Synthetisch anoniem dienstverlenend kantoor');
      await bPage.check('#km-teaser-akkoord');
      await bPage.click('#km-teaser-opslaan');
      await expect(bPage.locator('#km-intro-melding')).toContainText('Teaser goedgekeurd en opgeslagen.');

      await expect(bPage.locator('#km-intro-vrijgeven')).toHaveCount(0);
      await bPage.click('#km-intro-link-uit');
      await expect(bPage.locator('#km-intro-link')).toHaveValue(/\/introductie\.html\?token=/);
      const link = await bPage.locator('#km-intro-link').inputValue();
      const token = new URL(link).searchParams.get('token');
      expect(link).toBe(new URL(baseURL).origin + '/introductie.html?token=' + token + '&worker=' + encodeURIComponent(STAGING));
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const versie = backend.een('SELECT id, versie, tekst, inhoud_hash, status, token_hash FROM mna_koopmandaat_introductie_versie WHERE target_id=?', targetId);
      expect(versie).toMatchObject({ versie: 1, tekst: TEKST_E2E, status: 'actief' });
      expect(versie.inhoud_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(versie.token_hash).toBeTruthy();
      expect(backend.dbBevat(token)).toEqual([]);
      expect(posts(introPad, 'versie').map((r) => [JSON.parse(r.body), r.status])).toEqual([[{ actie: 'versie', tekst: TEKST_E2E }, 200]]);
      expect(posts(introPad, 'teaser').map((r) => [JSON.parse(r.body), r.status])).toEqual([[{ actie: 'teaser', goedgekeurd: true, regio: 'zuid', omzetklasse: '1m_2_5m', medewerkersklasse: '11_25', omschrijving: 'Synthetisch anoniem dienstverlenend kantoor' }, 200]]);
      expect(posts(introPad, 'link_uitgeven').map((r) => [JSON.parse(r.body), r.status])).toEqual([[{ actie: 'link_uitgeven', geldig_dagen: 14 }, 200]]);

      // ── 2. Koper vóór akkoord/vrijgave: alleen de goedgekeurde anonieme teaser ──
      const kPage1 = await nieuwePagina('koper-voor');
      await loginMandaat(kPage1, K);
      await expect(kPage1.locator('.km-koper-kaart')).toHaveCount(1);
      await expect(kPage1.locator('.km-koper-kaart')).toContainText('Anonieme kandidaat');
      await expect(kPage1.locator('.km-koper-kaart')).toContainText('Zuid-Nederland');
      await expect(kPage1.locator('.km-koper-kaart')).toContainText('Synthetisch anoniem dienstverlenend kantoor');
      await expect(kPage1.locator('.km-intro-btn')).toHaveCount(0);
      for (const s of [TARGET.naam, TARGET.sector, ...C_LEK]) await expect(kPage1.locator('body')).not.toContainText(s);
      {
        const dto = laatsteKoperDto(K).targets;
        expect(dto).toHaveLength(1);
        expect(Object.keys(dto[0]).sort()).toEqual(['id', 'status', 'teaser', 'vrijgave_status']);
        expect(dto[0].vrijgave_status).toBe('afgeschermd');
      }

      // ── 3. Target: veilige staging-link, inerte tekst, echte akkoord-POST ──
      const tPage = await nieuwePagina('target');
      await tPage.goto(link);
      await expect(tPage.locator('#intro-tekst')).toHaveText(TEKST_E2E);
      expect(await tPage.locator('#intro-tekst img').count()).toBe(0);
      expect(await tPage.evaluate(() => window.__xss)).toBeUndefined();
      expect(tPage.url()).not.toContain(token);
      await expect(tPage.locator('#intro-akkoord')).toBeDisabled();
      await tPage.fill('#intro-naam', AKKOORD_NAAM);
      await expect(tPage.locator('#intro-akkoord')).toBeDisabled();
      await tPage.check('#intro-bevoegd');
      await tPage.click('#intro-akkoord');
      await expect(tPage.locator('#intro-status-akkoord')).toBeVisible();
      await expect(tPage.locator('body')).toContainText('Uw akkoord op versie 1 is vastgelegd.');
      expect(await tPage.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
      const pubPad = '/mna/koopmandaat/introductie/' + token;
      expect(posts(pubPad).map((r) => [JSON.parse(r.body), r.status])).toEqual([[{ actie: 'akkoord', naam: AKKOORD_NAAM, inhoud_hash: versie.inhoud_hash }, 200]]);

      const akkoord = backend.een("SELECT * FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='akkoord'", targetId);
      expect(akkoord).toMatchObject({ versie_id: versie.id, versie: 1, inhoud_hash: versie.inhoud_hash, naam: AKKOORD_NAAM, categorie: 'bewijs', actor: 'target' });
      expect(backend.een('SELECT intro_vrijgave_id FROM mna_koopmandaat_target WHERE id=?', targetId).intro_vrijgave_id).toBeNull();

      // ── 4. Koper na akkoord, vóór vrijgave: nog steeds anoniem ──
      const kPage2 = await nieuwePagina('koper-na-akkoord');
      await loginMandaat(kPage2, K);
      await expect(kPage2.locator('.km-koper-kaart')).toContainText('Anonieme kandidaat');
      for (const s of [TARGET.naam, TARGET.sector, AKKOORD_NAAM, ...C_LEK]) await expect(kPage2.locator('body')).not.toContainText(s);
      expect(laatsteKoperDto(K).targets[0].vrijgave_status).toBe('afgeschermd');

      // ── 5. Begeleider: venster opnieuw laden, akkoord zichtbaar, expliciete vrijgave met bevestiging ──
      await Promise.all([
        bPage.waitForResponse((r) => r.url() === STAGING + '/mna/koopmandaat/' + T && r.request().method() === 'GET'),
        bPage.click('#km-intro-sluit'),
      ]);
      await expect(modal).toHaveCount(0);
      await expect(bPage.locator('body')).toContainText('Teaser: goedgekeurd'); // kaart na kmRefresh opnieuw gerenderd
      await bPage.click('.km-intro-btn');
      await expect(modal).toContainText('Akkoord door ' + AKKOORD_NAAM);
      await expect(bPage.locator('#km-intro-vrijgeven')).toBeVisible();
      await bPage.click('#km-intro-vrijgeven');
      await expect(bPage.locator('#km-intro-melding')).toContainText('Identiteit vrijgegeven aan de koper.');
      await expect(bPage.locator('#km-intro-vrijgeven')).toHaveCount(0);
      const bevestiging = dialogen.filter((d) => d.rol === 'begeleider' && d.tekst.startsWith('Identiteit vrijgeven aan de koper?'));
      expect(bevestiging).toHaveLength(1);
      expect(bevestiging[0].tekst).toContain(AKKOORD_NAAM);
      expect(bevestiging[0].tekst).toContain('versie 1');
      expect(posts(introPad, 'vrijgeven').map((r) => [JSON.parse(r.body), r.status])).toEqual([[{ actie: 'vrijgeven', inhoud_hash: versie.inhoud_hash }, 200]]);

      const vrijgaven = backend.alle("SELECT * FROM mna_koopmandaat_introductie_bewijs WHERE target_id=? AND soort='vrijgave'", targetId);
      expect(vrijgaven).toHaveLength(1);
      expect(vrijgaven[0]).toMatchObject({ versie_id: versie.id, versie: 1, inhoud_hash: versie.inhoud_hash, akkoord_id: akkoord.id, categorie: 'bewijs', actor: 'begeleider:' + MANDAAT.begeleider_naam });
      expect(vrijgaven[0].id).not.toBe(akkoord.id);
      expect(backend.een('SELECT intro_vrijgave_id FROM mna_koopmandaat_target WHERE id=?', targetId).intro_vrijgave_id).toBe(vrijgaven[0].id);

      // ── 6. Nieuwe koperpagina na vrijgave: naam + sector, nooit C ──
      const kPage3 = await nieuwePagina('koper-na-vrijgave');
      await loginMandaat(kPage3, K);
      await expect(kPage3.locator('.km-koper-kaart')).toHaveCount(1);
      await expect(kPage3.locator('.km-koper-kaart')).toContainText(TARGET.naam);
      await expect(kPage3.locator('.km-koper-kaart')).toContainText(TARGET.sector);
      await expect(kPage3.locator('.km-koper-kaart')).toContainText('Identiteit vrijgegeven door uw begeleider');
      for (const s of [AKKOORD_NAAM, ...C_LEK]) await expect(kPage3.locator('body')).not.toContainText(s);
      {
        const dto = laatsteKoperDto(K).targets[0];
        expect(dto).toMatchObject({ vrijgave_status: 'vrijgegeven', naam: TARGET.naam, sector: TARGET.sector });
        expect(Object.keys(dto).every((k) => ['id', 'status', 'vrijgave_status', 'teaser', 'naam', 'sector', 'traject_ref'].includes(k))).toBe(true);
        const tekst = JSON.stringify(laatsteKoperDto(K));
        for (const s of [...C_LEK, AKKOORD_NAAM, token, versie.inhoud_hash, T]) expect(tekst).not.toContain(s);
      }

      // ── Netwerk en opslag ──
      expect(net.extern.filter((x) => x.startsWith(PROD))).toEqual([]);
      expect(net.extern.some((x) => x.includes(token))).toBe(false);
      expect(net.staging.filter((r) => r.pad.startsWith('/mna/koopmandaat/') && r.method !== 'OPTIONS' && r.status >= 400)).toEqual([]);
      expect(backend.dbBevat(token)).toEqual([]);
      expect(await bPage.evaluate((t) => JSON.stringify(localStorage).includes(t) || JSON.stringify(sessionStorage).includes(t), token)).toBe(false);
    } finally {
      for (const c of contexten) await c.close().catch(() => {});
      backend.sluit();
    }
  });
});
