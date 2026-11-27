// #70 (bug 27-09, Marcel: «KvK en adres zijn al automatisch ingevuld maar worden vervolgens kennelijk niet als geldige
// waarden herkend; daardoor blokkeert het hele traject»). Reproductie op STAGING van de volledige keten: Marilyn → Nieuw
// traject met KvK en adres → verkoper logt in → openingsscherm met de vooraf ingevulde KvK/adres → afronden → due
// diligence. Fictief, testadressen op .invalid, ruimt op.
import { test, expect } from '@playwright/test';
import { leesAdminKey, WORKER, d1, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, marilynTab } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const NAAM = 'Synth Opening 70 ' + Date.now() + ' B.V.';
let code = null;
const rij = (sql) => { const r = d1(sql); return Array.isArray(r) ? r[0] : (r && r.results ? r.results[0] : null); };
test.afterAll(async () => { if (code) await ruimTrajectOp(code, ADMIN); });

test('nieuw traject: vooraf ingevulde KvK en adres worden geaccepteerd in het openingsscherm', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await marilynTab(page, 't-mna');
  await page.locator('#btn-nieuw').click();
  await page.locator('#m-k').fill(NAAM);
  await page.locator('#m-kvk').fill('12345678');
  await page.locator('#m-rv').selectOption('B.V.');
  await page.locator('#m-adres').fill('Synthetischestraat 1, 1234 AB Testdorp');
  await page.locator('#m-c').fill('Synth Verkoper');
  await page.locator('#m-e').fill('e2e-70@kvm-test.invalid');
  const w = page.waitForResponse((r) => r.url().includes('/mna/create'));
  await page.locator('#m-ok').click();
  const resp = await w; const d = await resp.json();
  expect(resp.status(), JSON.stringify(d)).toBe(200);
  code = d.code;
  const t = rij("SELECT verkoper_kvk, verkoper_adres, opening_voltooid FROM mna_trajecten WHERE id='" + code + "'");
  expect(t).toMatchObject({ verkoper_kvk: '12345678', verkoper_adres: 'Synthetischestraat 1, 1234 AB Testdorp' });
  await accepteerPlatformvoorwaarden([code]);

  // Verkoper logt in: openingsscherm met vooraf ingevulde KvK en adres.
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(code);
  // Na inloggen tekent loadEntiteiten() het scherm één keer opnieuw (zelfde patroon als e2e-52/e2e-3rollen): eerst daarop
  // wachten, anders kan een al ingevuld veld leeg worden en verstuurt de knop niets (suite-flake 19-11).
  const ent = page.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 });
  await page.locator('#l-btn').click();
  await ent; await page.waitForTimeout(800);
  await expect(page.locator('#op-voltooien-btn')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#op-kvk')).toHaveValue('12345678');
  await expect(page.locator('#op-adres')).toHaveValue('Synthetischestraat 1, 1234 AB Testdorp');
  await page.locator('#op-tekenbevoegde').fill('Synth Verkoper');
  const v = page.waitForResponse((r) => r.url().includes('/mna/opening/voltooien'), { timeout: 30000 });
  await page.locator('#op-voltooien-btn').click();
  const vr = await v.catch(async (e) => { throw new Error('geen /mna/opening/voltooien-verzoek; melding op het scherm: ' + (await page.locator('#op-voltooien-err').textContent().catch(() => '?'))); });
  expect(vr.status(), await vr.text()).toBe(200);
  await expect(page.locator('#op-voltooien-btn')).toHaveCount(0, { timeout: 15000 });
  expect(await page.evaluate(() => S.screen)).not.toBe('opening');
  expect(rij("SELECT opening_voltooid FROM mna_trajecten WHERE id='" + code + "'").opening_voltooid).toBe(1);
});
