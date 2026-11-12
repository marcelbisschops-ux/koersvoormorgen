// #56 (12-11-2026): Postvak in marilyn: doorsturen, beantwoorden, één bericht verwijderen en het postvak legen,
// met de echte knoppen (prompt/confirm) en verificatie in staging-D1. Staging leidt alle e-mail om naar het
// Resend-testadres (KVM_MAIL_TESTMODUS). STAGING, fictieve berichten.
import { test, expect } from '@playwright/test';
import { leesAdminKey, WORKER, d1, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const MERK = 'E2E56-' + Date.now();
const telMerk = () => { const r = d1("SELECT COUNT(*) AS n FROM platform_postvak WHERE onderwerp LIKE '" + MERK + "%'"); const rij = Array.isArray(r) ? r[0] : (r && r.results ? r.results[0] : null); return Number(rij && rij.n); };

test('postvak: doorsturen, beantwoorden, verwijderen, legen', async ({ page }) => {
  test.setTimeout(120000);
  const nu = Date.now();
  d1("INSERT INTO platform_postvak (ts, categorie, onderwerp, ontvanger, body_html, gelezen) VALUES (" + nu + ", 'test', '" + MERK + " A', 'synth@bisschopsfinancing.test', '<p>Synthetisch bericht A</p>', 0), (" + (nu + 1) + ", 'test', '" + MERK + " B', 'synth@bisschopsfinancing.test', '<p>Synthetisch bericht B</p>', 0)");
  expect(telMerk()).toBe(2);
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await expect(page.locator('#t-postvak')).toBeVisible({ timeout: 20000 });
  await page.locator('#t-postvak').click();
  const rijA = page.locator('tr.pv-row', { hasText: MERK + ' A' });
  await expect(rijA).toBeVisible({ timeout: 20000 });

  // Doorsturen
  page.once('dialog', (d) => d.accept('synth-doorsturen@bisschopsfinancing.test'));
  let w = page.waitForResponse((r) => r.url().includes('/mna/admin/postvak/doorsturen'));
  await rijA.locator('.pv-doorsturen').click();
  expect((await w).status()).toBe(200);

  // Beantwoorden (twee vragen: adres en bericht)
  const antwoorden = ['synth-antwoord@bisschopsfinancing.test', 'Synthetisch antwoord'];
  const opDialoog = (d) => { d.accept(antwoorden.shift()); if (!antwoorden.length) page.off('dialog', opDialoog); };
  page.on('dialog', opDialoog);
  w = page.waitForResponse((r) => r.url().includes('/mna/admin/postvak/beantwoorden'));
  await page.locator('tr.pv-row', { hasText: MERK + ' A' }).locator('.pv-beantwoorden').click();
  expect((await w).status()).toBe(200);

  // Eén bericht verwijderen (bevestigen)
  page.once('dialog', (d) => d.accept());
  w = page.waitForResponse((r) => r.url().includes('/mna/admin/postvak/verwijderen'));
  await page.locator('tr.pv-row', { hasText: MERK + ' A' }).locator('.pv-verwijderen').click();
  expect((await w).status()).toBe(200);
  await expect.poll(telMerk, { timeout: 10000 }).toBe(1);

  // Postvak legen: eerst annuleren (er gebeurt niets), daarna bevestigen.
  await expect(page.locator('tr.pv-row', { hasText: MERK + ' B' })).toBeVisible({ timeout: 15000 });
  page.once('dialog', (d) => d.dismiss());
  await page.locator('#pv-legen').click();
  await page.waitForTimeout(1000);
  expect(telMerk()).toBe(1);
  page.once('dialog', (d) => d.accept());
  w = page.waitForResponse((r) => r.url().includes('/mna/admin/postvak/verwijderen'));
  await page.locator('#pv-legen').click();
  expect((await w).status()).toBe(200);
  await expect.poll(telMerk, { timeout: 10000 }).toBe(0);
});
