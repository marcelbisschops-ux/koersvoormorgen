// #62 (12-09, bevinding 15): disclaimer als pop-up met vastlegging vóór printen. Runtimeproef op STAGING in de echte
// begeleidersweergave: teaser (opgeslagen, geen AI) → Print/PDF → kennisname-popup → zonder naam geweigerd → met naam
// bevestigd → vastlegging in mna_audit (reliance_bevestiging, bevestigd_door); tweede print logt opnieuw (herhaling).
// Fictief, geen verzending, testadres .invalid. mna_audit blijft bewust bewaard (besluit P4), het traject wordt opgeruimd.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, d1, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const VOK = (() => { try { return (fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5'; } catch { return '1.5'; } })();
let V, T;
test.beforeAll(async () => {
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Disclaimer 62 B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'e2e-62@kvm-test.invalid' } });
  V = c.json.code; T = c.json.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK, email: 'e2e-62@kvm-test.invalid' } });
  await api('POST', '/mna/teaser/opslaan', { headers: { 'x-tussen-key': T }, body: { code: T, tekst: 'Een synthetische teasertekst voor de disclaimerproef.' } });
});
test.afterAll(async () => { if (V) await ruimTrajectOp(V, ADMIN); });

test('#62: kennisname-popup vóór printen, naam verplicht, vastlegging per actie', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => { window.print = () => {}; window.open = () => ({ document: { write() {}, close() {} }, focus() {}, print() {}, close() {} }); });
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  const ent = page.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 });
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await ent; await page.waitForTimeout(800);
  if (await page.evaluate(() => document.documentElement.getAttribute('data-ui') === '2')) {
    await page.click('#mt-zij [data-mt-naar="journey"]'); await page.waitForTimeout(800);
    await page.evaluate(() => { const k = document.getElementById('bg-teaser-actie'); const p = k && k.closest('[data-jr-paneel]'); if (p && p.hidden) { const b = document.querySelector('#jr-begeleider [data-jr-fase="' + p.getAttribute('data-jr-paneel') + '"]'); if (b) b.click(); } });
  }
  await page.locator('#bg-teaser-actie').click();
  await page.locator('#teaser-print-btn').click();
  await expect(page.locator('#reliance-ok')).toBeVisible({ timeout: 10000 });
  await page.locator('#reliance-ok').click();
  await expect(page.locator('#reliance-err')).toBeVisible();
  await page.locator('#reliance-naam').fill('Synth Begeleider');
  const audit1 = page.waitForResponse((r) => r.url().includes('/mna/audit') && r.request().method() === 'POST');
  await page.locator('#reliance-ok').click();
  await audit1;
  await expect(page.locator('#reliance-ok')).toHaveCount(0);
  const audit2 = page.waitForResponse((r) => r.url().includes('/mna/audit') && r.request().method() === 'POST');
  await page.locator('#teaser-print-btn').click();
  await audit2;
  await expect(page.locator('#reliance-ok')).toHaveCount(0); // eenmalig per sessie, maar wel opnieuw gelogd
  await page.waitForTimeout(800);
  const rijen = d1("SELECT actie, extra FROM mna_audit WHERE code IN ('" + V + "','" + T + "') AND actie='reliance_bevestiging' ORDER BY id");
  expect(rijen.length, 'twee vastleggingen (eerste kennisname + herhaling)').toBe(2);
  expect(JSON.parse(rijen[0].extra).bevestigd_door).toBe('Synth Begeleider');
  expect(JSON.parse(rijen[1].extra).herhaling).toBe(true);
});
