// N-160 (12-11-2026): in fase Financieel geen knop 'Genereer advies' voor de begeleider (server weigert dat), wel een
// eerlijke uitleg; in andere fasen blijft de knop. Er wordt niet geklikt (geen AI-aanroep).
// STAGING, fictief, geen AI, ruimt op.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
let T;
test.beforeAll(async () => {
  T = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N160 Advies B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@synth.invalid' } });
});
test.afterAll(async () => { if (T) { const r = await ruimTrajectOp(T.code, ADMIN); expect(r && r.ok).toBeTruthy(); } });

test('Genereer advies: verborgen in Financieel voor de begeleider, zichtbaar in Commercieel', async ({ browser }) => {
  test.setTimeout(90000);
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const fouten = []; page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T.tussen_code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'financieel'); renderApp(); });
  await expect(page.locator('.ai-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#gen-btn')).toHaveCount(0);
  await expect(page.locator('.ai-panel')).toContainText('niet beschikbaar voor de begeleider');
  await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'commercieel'); renderApp(); });
  await expect(page.locator('#gen-btn')).toBeVisible({ timeout: 15000 });
  // Review: tijdens het laden blijft de laadindicator staan (if/else-keten intact).
  await page.evaluate(() => { S.aiLoading['commercieel'] = true; renderApp(); });
  await expect(page.locator('.ai-body .spin')).toBeVisible();
  await expect(page.locator('.ai-body')).not.toContainText('Klik op Genereer advies');
  await page.evaluate(() => { S.aiLoading['commercieel'] = false; renderApp(); });
  expect(fouten).toEqual([]);
});
