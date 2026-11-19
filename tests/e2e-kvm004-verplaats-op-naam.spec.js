// KVM-004 (18-11-2026): in Marilyn → Kantoren → Bekijken een gebruiker kiezen op naam en e-mail (keuzelijst) om naar het
// kantoor te verplaatsen, i.p.v. een technisch gebruiker-ID te typen. Stagingproef met twee synthetische gebruikers
// (elk een eigen kantoor van 1), testadressen .test (geen mail-side-effect zonder RESEND op staging-testmodus), ruimt op.
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, IS_STAGING_WORKER, verwijderTestGebruiker } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const T = Date.now();
let A, B;
const maak = async (x) => (await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Synth KVM004 ' + x + ' ' + T, bedrijf: 'Synth KVM004 ' + x + ' BV', email: 'e2e-kvm004-' + x.toLowerCase() + '-' + T + '@bisschopsfinancing.test' } })).json.id;
test.beforeAll(async () => { A = await maak('A'); B = await maak('B'); });
test.afterAll(async () => {
  for (const g of [B, A]) if (g) await verwijderTestGebruiker(g, ADMIN);
  for (const g of [A, B]) if (g && /^[0-9A-Za-z_-]+$/.test(g)) { const q = "'K" + g + "'"; for (const t of ['kantoor_module_audit', 'kantoor_modules']) d1('DELETE FROM ' + t + ' WHERE kantoor_id=' + q); d1('DELETE FROM kantoren WHERE id=' + q + " AND naam LIKE 'Synth KVM004 %'"); }
});

test('KVM-004: gebruiker kiezen op naam en verplaatsen naar een kantoor', async ({ page }) => {
  test.setTimeout(90000);
  page.on('dialog', (d) => d.accept());
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await page.locator('#t-kantoren').click();
  await page.locator('.btn-kantoor-open[data-id="K' + A + '"]').click();
  const sel = page.locator('#kantoor-verplaats-gid-K' + A);
  await expect(sel.locator('option', { hasText: 'Synth KVM004 B ' + T })).toHaveCount(1, { timeout: 20000 });
  await expect(sel.locator('option', { hasText: 'Synth KVM004 A ' + T })).toHaveCount(0); // huidig lid staat er niet in
  expect(await sel.locator('option').first().textContent()).toBe('Kies een gebruiker');
  // Zonder keuze gebeurt niets.
  await page.locator('.btn-kantoor-verplaats[data-id="K' + A + '"]').click();
  await page.waitForTimeout(500);
  expect(d1("SELECT kantoor_id FROM bf_gebruikers WHERE id='" + B + "'")[0].kantoor_id).toBe('K' + B);
  await sel.selectOption({ label: await sel.locator('option', { hasText: 'Synth KVM004 B ' + T }).textContent() });
  const resp = page.waitForResponse((r) => r.url().includes('/mna/admin/kantoren/') && r.url().endsWith('/leden'));
  await page.locator('.btn-kantoor-verplaats[data-id="K' + A + '"]').click();
  expect((await resp).status()).toBe(200);
  await expect.poll(() => d1("SELECT kantoor_id FROM bf_gebruikers WHERE id='" + B + "'")[0].kantoor_id, { timeout: 10000 }).toBe('K' + A);
  await expect(page.locator('#kantoor-detail-K' + A)).toContainText('Synth KVM004 B ' + T, { timeout: 10000 });
});
