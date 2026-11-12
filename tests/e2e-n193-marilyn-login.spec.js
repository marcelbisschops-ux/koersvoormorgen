// N-193 (12-11-2026): gebruikersworkflow persoonlijke beheerderslogin in marilyn.html tegen staging.
// Activeren met noodtoegang → authenticator-geheim (eenmalig) → uitloggen → inloggen met e-mail, wachtwoord en TOTP →
// dashboard → uitloggen trekt de sessie in. Plus: foute code, geen accountbeheer met een persoonlijke sessie.
// Volledig synthetisch account; wordt na afloop uit staging-D1 verwijderd. Geheimen worden nooit gelogd.
import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { leesAdminKey, WORKER, d1, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const EMAIL = 'n193-ui-' + Date.now() + '@example.invalid';
const WW = crypto.randomBytes(18).toString('base64url');

const deB32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const c of s.replace(/\s/g, '')) bits += A.indexOf(c).toString(2).padStart(5, '0'); const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };
const totp = (sec, off = 0) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + off)); const h = crypto.createHmac('sha1', deB32(sec)).update(c).digest(); const o = h[h.length - 1] & 15; return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0'); };

test.afterAll(() => {
  d1("DELETE FROM beheer_sessie WHERE account_id IN (SELECT id FROM beheer_account WHERE email='" + EMAIL + "')");
  d1("DELETE FROM beheer_account WHERE email='" + EMAIL + "'");
});

test('activeren, inloggen met authenticator, uitloggen', async ({ page }) => {
  test.setTimeout(240000);
  const url = '/marilyn.html?worker=' + encodeURIComponent(WORKER);
  // 1. Noodtoegang en activeren onder Veiligheid. Klok installeren om de 60-secondenverversing te kunnen naspelen.
  await page.clock.install();
  await page.goto(url);
  await expect(page.locator('#pl-email')).toBeVisible();
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await expect(page.locator('#hdr-wie')).toHaveText(/Noodtoegang/);
  await page.locator('#t-veiligheid').click();
  await expect(page.locator('#bt-maak')).toBeVisible({ timeout: 20000 });
  await page.locator('#bt-naam').fill('N193 synthetisch');
  await page.locator('#bt-email').fill(EMAIL);
  await page.locator('#bt-ww').fill(WW);
  await page.locator('#bt-ww2').fill(WW + 'x');
  await page.locator('#bt-maak').click();
  await expect(page.locator('#bt-uit')).toContainText('niet gelijk');
  await page.locator('#bt-ww2').fill(WW);
  // In de volledige suite kan de algemene limiet per IP (120/min) tijdelijk 429 geven; dan opnieuw proberen.
  for (let poging = 0; poging < 4; poging++) {
    await page.locator('#bt-maak').click();
    await expect(page.locator('#bt-uit')).not.toContainText('niet gelijk', { timeout: 5000 });
    await expect(page.locator('#bt-uit')).not.toBeEmpty({ timeout: 20000 });
    if (await page.locator('#bt-geheim').count()) break;
    const melding = await page.locator('#bt-uit').textContent();
    console.log('aanmaken poging ' + (poging + 1) + ': ' + melding);
    await page.waitForTimeout(20000);
    await page.locator('#bt-ww').fill(WW); await page.locator('#bt-ww2').fill(WW);
  }
  const geheim = (await page.locator('#bt-geheim').textContent()).replace(/\s/g, '');
  expect(geheim).toMatch(/^[A-Z2-7]{32}$/);
  // Review M1: de automatische verversing (60 s) wist het eenmalige geheim niet.
  await page.clock.fastForward(125000);
  await expect(page.locator('#bt-geheim')).toBeVisible();
  await page.locator('#bt-klaar').click();
  await expect(page.locator('#bt-geheim')).toHaveCount(0);
  await page.locator('#btn-logout').click();

  // 2. Foute code: melding en terug naar stap 1 (tussenstap is eenmalig).
  await page.locator('#pl-email').fill(EMAIL);
  await page.locator('#pl-ww').fill(WW);
  await page.locator('#pl-btn1').click();
  await expect(page.locator('#pl-code')).toBeVisible();
  const goed = totp(geheim);
  await page.locator('#pl-code').fill(goed === '000000' ? '111111' : '000000');
  await page.locator('#pl-btn2').click();
  await expect(page.locator('#login-err')).toContainText('Log opnieuw in');
  await expect(page.locator('#pl-email')).toBeVisible();

  // 3. Juiste login.
  await page.locator('#pl-ww').fill(WW);
  await page.locator('#pl-btn1').click();
  await expect(page.locator('#pl-code')).toBeVisible();
  await page.locator('#pl-code').fill(totp(geheim, 1)); // volgende tijdstap: de vorige code is mogelijk al geweigerd geteld
  // Review L1: dubbel indienen (Enter + klik) geeft één nette login.
  await page.locator('#pl-code').press('Enter');
  await page.locator('#pl-btn2').click({ force: true }).catch(() => {});
  await expect(page.locator('#hdr-wie')).toHaveText('Ingelogd als N193 synthetisch', { timeout: 20000 });
  await expect(page.locator('#t-veiligheid')).toBeVisible();
  await expect.poll(() => page.evaluate(() => adminKey.indexOf('bs_') === 0), { timeout: 20000 }).toBe(true);
  const sessie = await page.evaluate(() => adminKey);
  expect(sessie.startsWith('bs_')).toBe(true);

  // 4. Met een persoonlijke sessie geen accountbeheer.
  await page.locator('#t-veiligheid').click();
  await expect(page.locator('text=kan alleen met noodtoegang')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#bt-maak')).toHaveCount(0);
  const r1 = await page.request.get(WORKER + '/mna/admin/veiligheid/r2-reconciliatie', { headers: { 'x-admin-key': sessie } });
  expect(r1.status()).toBe(200);

  // Review M3: het matchingplatform krijgt de sessie via window.opener, niet via URL of opslag.
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.evaluate(() => { window.open('matching-platform.html', '_blank'); })]);
  await popup.waitForLoadState();
  expect(await popup.evaluate(() => typeof ADMIN_BYPASS === 'string' && ADMIN_BYPASS.indexOf('bs_') === 0)).toBe(true);
  expect(popup.url()).not.toContain('bs_');
  expect(await popup.evaluate(() => JSON.stringify(sessionStorage) + JSON.stringify(localStorage))).not.toContain('bs_');
  await popup.close();

  // 5. Uitloggen trekt de sessie op de server in.
  await page.locator('#btn-logout').click();
  await expect(page.locator('#pl-email')).toBeVisible();
  await expect.poll(async () => (await page.request.get(WORKER + '/mna/admin/veiligheid/r2-reconciliatie', { headers: { 'x-admin-key': sessie } })).status(), { timeout: 10000 }).not.toBe(200);

  // 6. Review M4: een sessie die elders wordt ingetrokken leidt bij de volgende actie netjes terug naar het inlogscherm.
  await page.locator('#pl-email').fill(EMAIL);
  await page.locator('#pl-ww').fill(WW);
  await page.locator('#pl-btn1').click();
  await expect(page.locator('#pl-code')).toBeVisible();
  // Een code wordt maar één keer geaccepteerd: wacht één tijdstap (30 s) zodat er een nieuwe, geldige code is.
  await page.waitForTimeout(31000);
  await page.locator('#pl-code').fill(totp(geheim, 1));
  await page.locator('#pl-btn2').click();
  await expect.poll(() => page.evaluate(() => adminKey.indexOf('bs_') === 0), { timeout: 20000 }).toBe(true);
  await expect(page.locator('#hdr-wie')).toHaveText(/Ingelogd als/);
  const sessie2 = await page.evaluate(() => adminKey);
  await page.request.post(WORKER + '/beheer/uitloggen', { data: { sessie: sessie2 } });
  // Elke volgende beheeraanroep (hier rechtstreeks, net als een klik in het dashboard) ziet de ingetrokken sessie.
  await page.evaluate(() => fetch(WORKER + '/admin/scans', { headers: { 'x-admin-key': adminKey } }));
  await expect.poll(() => page.evaluate(() => adminKey), { timeout: 20000 }).toBe('');
  await expect(page.locator('#login-err')).toContainText('sessie is verlopen', { timeout: 20000 });
  await expect(page.locator('#pl-email')).toBeVisible();
});
