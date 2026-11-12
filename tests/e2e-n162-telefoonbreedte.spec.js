// N-162: het begeleiderdashboard (en de andere kopbalken in mna.html) past op telefoonbreedte (390 px) zonder
// horizontaal scrollen van de pagina; alle knoppen in de kop blijven bereikbaar (de knoppenrij scrollt binnen de eigen
// balk, zoals Design 2.0 dat op smalle schermen voorschrijft). STAGING, fictief, geen AI, ruimt op.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
let T;
test.beforeAll(async () => {
  T = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N162 Smal B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@synth.invalid' } });
});
test.afterAll(async () => { if (T) { const r = await ruimTrajectOp(T.code, ADMIN); expect(r && r.ok).toBeTruthy(); } });

test('begeleiderskop op 390 px: geen horizontaal scrollen, knoppen zichtbaar', async ({ browser }) => {
  test.setTimeout(90000);
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const fouten = []; page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T.tussen_code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await expect(page.locator('#bg-ca-chk')).toBeAttached({ timeout: 20000 });
  const breedte = await page.evaluate(() => document.documentElement.scrollWidth);
  if (breedte > 390) console.log('TE BREED', await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 392 && getComputedStyle(e).position !== 'fixed').slice(0, 12).map((e) => e.tagName + '.' + (e.className || '').toString().slice(0, 30) + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right) + ' ' + (e.textContent || '').trim().slice(0, 40)).join('\n')));
  expect(breedte).toBeLessThanOrEqual(390);
  for (const tekst of ['Adviseursportaal', 'Ververs', 'Handleiding', 'Uitloggen']) {
    const knop = page.locator('.hdr').getByText(tekst).first();
    await knop.scrollIntoViewIfNeeded(); // knoppenrij scrollt binnen de eigen balk (Design 2.0-patroon)
    await expect(knop).toBeVisible();
    const box = await knop.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: 'test-results/n162-390.png', fullPage: false });
  expect(fouten).toEqual([]);
});
