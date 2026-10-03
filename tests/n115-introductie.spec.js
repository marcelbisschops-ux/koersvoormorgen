// N-115 (P1B, 3 okt 2026) — gerichte browsertest voor de introductieovereenkomst: de echte pagina's
// (introductie.html en het koopmandaatscherm in mna.html) in Chromium, met lokale route-interceptie
// op uitsluitend de bekende staging-host. Er gaat geen enkel verzoek naar productie, staging of een
// andere externe host: alles buiten localhost wordt onderschept (fixture) of afgebroken en geteld.
// Geen echte contactgegevens, akkoorden of klantdata — alle gegevens zijn synthetisch.
//
// Draaien: npx playwright test tests/n115-introductie.spec.js

import { test, expect } from '@playwright/test';

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
    const post = net.staging.find((r) => r.method === 'POST');
    expect(JSON.parse(post.body)).toEqual({ actie: 'link_uitgeven', geldig_dagen: 14 });
    expect(await page.evaluate((t) => JSON.stringify(localStorage).includes(t) || JSON.stringify(sessionStorage).includes(t), TOKEN)).toBe(false);
  });
});
