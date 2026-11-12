// ISO 27001-readiness (12-11-2026): Marilyn → Veiligheid toont het controleregister en legt een handmatige
// controle vast via het formulier (met validatie). STAGING, synthetisch bewijs, ruimt op.
import { test, expect } from '@playwright/test';
import { leesAdminKey, WORKER, d1, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const MERK = 'SYNTH-ISMS-UI-' + Date.now();
test.afterAll(() => { d1("DELETE FROM isms_uitvoering WHERE bewijs LIKE 'SYNTH-ISMS-UI-%'"); });

test('controleregister zichtbaar en handmatige controle vastleggen', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await page.locator('#t-veiligheid').click();
  const rijen = page.locator('#isms-sectie tr[data-isms-id]');
  await expect(rijen).toHaveCount(20, { timeout: 20000 });
  for (const s of await page.locator('#isms-sectie .isms-status').evaluateAll((els) => els.map((e) => e.dataset.status))) expect(['PASS', 'FAIL', 'SKIP', 'MISSING', 'GEPLAND']).toContain(s);

  await page.locator('#isms-controle').selectOption('KVM-C09');
  await page.locator('#isms-resultaat').selectOption('FAIL');
  await page.locator('#isms-bewijs').fill(MERK + ' review open bevindingen');
  await page.locator('#isms-opslaan').click();
  await expect(page.locator('#isms-melding')).toContainText('afwijking');

  await page.locator('#isms-resultaat').selectOption('PASS');
  const w = page.waitForResponse((r) => r.url().includes('/mna/admin/isms/uitvoering'));
  await page.locator('#isms-opslaan').click();
  expect((await w).status()).toBe(200);
  await expect(page.locator('#isms-melding')).toContainText('Vastgelegd', { timeout: 15000 });
  const rij = page.locator('#isms-sectie tr[data-isms-id="KVM-C09"]');
  await expect(rij.locator('.isms-status')).toHaveText('PASS');
  await expect(rij).toContainText(MERK);
});
