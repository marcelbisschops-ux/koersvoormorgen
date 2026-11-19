// N-159 (besluit Marcel 19-11-2026): de printknoppen van schermrapporten tonen de bestaande kennisname-pop-up vóór het
// printen. STAGING, synthetisch traject, geen mail. Per scherm: annuleren = geen print/geen vastlegging; bevestigen = één
// print zonder pop-up in beeld + vastlegging; opnieuw printen = geen tweede pop-up, wel gelogd (herhaling).
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, d1, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const VOK = (() => { try { return (fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5'; } catch { return '1.5'; } })();
let V, T;
test.beforeAll(async () => {
  const c = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Print 159 B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'e2e-159@kvm-test.invalid' } })).json;
  V = c.code; T = c.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK, email: 'e2e-159@kvm-test.invalid' } });
});
test.afterAll(async () => { if (V) await ruimTrajectOp(V, ADMIN); });

const SCHERMEN = [['begeleider', 'scherm_dashboard'], ['waardering', 'scherm_waardering'], ['dataroom', 'scherm_dataroom'], ['cover', 'scherm_overzicht'], ['main', 'scherm_due_diligence'], ['summary', 'scherm_samenvatting']];

test('N-159: printknoppen schermrapporten via de kennisname-pop-up', async ({ page }) => {
  test.setTimeout(150000);
  await page.addInitScript(() => { window.__prints = []; window.print = () => { window.__prints.push(!!document.querySelector('[role="dialog"]')); }; });
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  const ent = page.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 });
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await ent; await page.waitForTimeout(800);
  let eerste = true;
  for (const [scherm, type] of SCHERMEN) {
    await page.evaluate((s) => { S.screen = s; renderApp(); }, scherm);
    await page.waitForTimeout(600);
    const knop = page.locator('button[onclick*="printSchermMetAkkoord"][onclick*="' + type + '"]');
    await expect(knop, 'printknop op scherm ' + scherm).toHaveCount(1);
    const voor = await page.evaluate(() => window.__prints.length);
    if (eerste) {
      await knop.click();
      await expect(page.locator('#reliance-ok')).toBeVisible();
      await page.locator('#reliance-ann').click();
      await expect(page.locator('#reliance-ok')).toHaveCount(0);
      expect(await page.evaluate(() => window.__prints.length), 'annuleren = niet geprint').toBe(voor);
      await knop.click();
      await page.locator('#reliance-naam').fill('Synth Begeleider');
      const a = page.waitForResponse((r) => r.url().includes('/mna/audit') && r.request().method() === 'POST');
      await page.locator('#reliance-ok').click(); await a;
      eerste = false;
    } else {
      const a = page.waitForResponse((r) => r.url().includes('/mna/audit') && r.request().method() === 'POST');
      await knop.click(); await a;
      await expect(page.locator('#reliance-ok'), 'geen tweede pop-up in dezelfde sessie').toHaveCount(0);
    }
    const na = await page.evaluate(() => window.__prints);
    expect(na.length, 'precies één print op ' + scherm).toBe(voor + 1);
    expect(na[na.length - 1], 'pop-up niet in beeld tijdens printen').toBe(false);
  }
  await page.waitForTimeout(800);
  const rijen = d1("SELECT extra FROM mna_audit WHERE code IN ('" + V + "','" + T + "') AND actie='reliance_bevestiging' ORDER BY id").map((r) => JSON.parse(r.extra));
  expect(rijen.map((r) => r.document_type)).toEqual(SCHERMEN.map((s) => s[1]));
  expect(rijen[0].herhaling).toBeUndefined();
  expect(rijen.slice(1).every((r) => r.herhaling === true && r.bevestigd_door === 'Synth Begeleider')).toBe(true);
});
