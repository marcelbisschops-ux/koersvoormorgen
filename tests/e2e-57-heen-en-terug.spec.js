// #57 (12-11-2026): van het adviseursportaal naar het traject (mna.html, nieuw tabblad) en via "← Adviseursportaal"
// terug naar hetzelfde, nog ingelogde adviseurstabblad; zonder openend tabblad het bestaande gedrag (adv-inlogpagina).
// STAGING, fictief, ruimt op.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, zetMfaUitVoorTest, ruimTestTrajectOp, verwijderTestGebruiker, accepteerPlatformvoorwaarden, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
let email, gid, T;

test.beforeAll(async () => {
  email = 'e2e-57-' + Date.now() + '@bisschopsfinancing.test';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E 57', bedrijf: 'E2E 57 BV', email } });
  gid = uit.json && uit.json.id;
  await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { traject: true } } });
  T = (await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Synth 57 B.V.', contact_naam: 'Synth V', contact_email: 'v@bisschopsfinancing.test', traject_type: 'Verkoop', sector: 'accountancy' } } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@bisschopsfinancing.test' } });
});
test.afterAll(async () => { if (T && T.code) await ruimTestTrajectOp(T.code, T.tussen_code); if (gid) await verwijderTestGebruiker(gid, ADMIN); });

test('heen naar het traject en terug naar hetzelfde ingelogde adviseurstabblad', async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-e').fill(email);
  await page.locator('#l-w').fill(WW);
  await page.locator('#l-btn').click();
  await expect(page.getByRole('button', { name: '+ Nieuw traject' })).toBeVisible({ timeout: 15000 });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  const link = page.getByRole('link', { name: /Open als begeleider/ });
  await expect(link).toBeVisible({ timeout: 15000 });
  // De link op staging moet de staging-worker meenemen; zelfde href, met worker-parameter voor de test.
  await page.evaluate((w) => { const a = [...document.querySelectorAll('a')].find((x) => /Open als begeleider/.test(x.textContent)); a.href = a.href + '&worker=' + encodeURIComponent(w); }, WORKER);
  const [mna] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await mna.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 30000 });
  await expect(mna.getByRole('link', { name: /Adviseursportaal/ })).toBeVisible({ timeout: 20000 });
  expect(await mna.evaluate(() => !!window.opener)).toBe(true);
  const dicht = mna.waitForEvent('close', { timeout: 10000 });
  await mna.getByRole('link', { name: /Adviseursportaal/ }).click();
  await dicht;
  // Het adviseurstabblad is nog ingelogd en toont nog hetzelfde traject.
  await expect(page.getByRole('link', { name: /Open als begeleider/ })).toBeVisible();
  expect(await page.evaluate(() => !!(G && G.token))).toBe(true);
});

test('zonder openend adviseurstabblad: bestaand gedrag (naar de adviseursinlog)', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T.tussen_code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 30000 });
  await page.getByRole('link', { name: /Adviseursportaal/ }).click();
  await page.waitForURL(/\/adv(\.html)?/, { timeout: 15000 });
  await expect(page.locator('#l-e')).toBeVisible({ timeout: 15000 });
});
