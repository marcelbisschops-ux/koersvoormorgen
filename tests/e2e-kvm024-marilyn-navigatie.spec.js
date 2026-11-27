// KVM-024 (besluit Marcel 26-11-2026): Marilyn-navigatie in een echte browser tegen staging. Inloggen, managementdashboard
// met vier tegels, elk onderdeel via zijn groep bereikbaar (alleen lezen: er wordt niets opgeslagen of verstuurd), alleen
// één groep tegelijk open, en het menu past zonder verticale scroll op een desktopscherm. Met KVM024_SCREENSHOTS=<map>
// worden schermafdrukken (desktop en tablet) gemaakt. STAGING, fictieve gegevens.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { leesAdminKey, WORKER, IS_STAGING_WORKER, marilynTab } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const SHOTS = process.env.KVM024_SCREENSHOTS || '';
const ONDERDELEN = [
  ['commercie', ['t-leads', 't-cb', 't-proef', 't-scans', 't-rapp']],
  ['operatie', ['t-mna', 't-matching', 't-sourcing', 't-pool', 't-docs', 't-agenda', 't-postvak']],
  ['financien', ['t-tarieven', 't-facturatie']],
  ['beheer', ['t-kantoren', 't-geb', 't-waarderingsmodel', 't-waardering', 't-bench', 't-sectoren', 't-templates', 't-veiligheid']],
];
const foto = async (page, naam) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, naam + '.png'), fullPage: false }); };

async function login(page) {
  // Niets mag de pagina verlaten richting een verzendroute: elke niet-GET buiten de inlogmelding wordt geblokkeerd en geteld.
  const geblokkeerd = [];
  await page.route('**/*', (route) => {
    const r = route.request(), u = new URL(r.url());
    if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && u.pathname !== '/admin/login-notify' && u.hostname !== 'localhost') { geblokkeerd.push(r.method() + ' ' + u.pathname); return route.abort(); }
    return route.continue();
  });
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await expect(page.locator('#mar-nav')).toBeVisible({ timeout: 20000 });
  return geblokkeerd;
}

test('KVM-024: dashboard, groepen en elk onderdeel bereikbaar zonder schrijfacties', async ({ page }) => {
  test.setTimeout(180000);
  const fouten = []; page.on('pageerror', (e) => fouten.push(String(e) + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ') + ' na ' + laatste)); let laatste = '';
  const geblokkeerd = await login(page);
  await expect(page.locator('.dash-tegel')).toHaveCount(4);
  await expect(page.locator('#dt-commercie')).toContainText('Commercie');
  await page.waitForTimeout(1500); // aanvullende kerncijfers
  await foto(page, '01-dashboard-desktop');
  for (const [groep, ids] of ONDERDELEN) {
    await page.locator('#t-dashboard').click();
    await page.locator('#g-' + groep).click();
    await expect(page.locator('#g-' + groep)).toHaveAttribute('aria-expanded', 'true');
    const open = await page.locator('.mar-kop[aria-expanded="true"]').count();
    expect(open, 'precies één groep open').toBe(1);
    const nav = await page.locator('#mar-nav').boundingBox(), vp = page.viewportSize();
    expect(nav.y + nav.height, 'menu past zonder verticale scroll (' + groep + ' open)').toBeLessThanOrEqual(vp.height);
    for (const id of ids) {
      laatste = id; await marilynTab(page, id);
      await expect(page.locator('#' + id)).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('#tc')).not.toBeEmpty();
      // Elk onderdeel laadt asynchroon; wachten tot het klaar is (snel wisselen tijdens het laden is een bestaand, apart
      // geregistreerd punt en geen onderdeel van de navigatie).
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(800);
    await foto(page, '02-' + groep + '-desktop');
  }
  await marilynTab(page, 't-pool');
  await expect(page.locator('#t-pool')).toHaveText(/Specialistenpool/);
  expect(geblokkeerd, 'geen schrijf- of verzendverzoek').toEqual([]);
  expect(fouten, 'geen scriptfouten').toEqual([]);
});

test('KVM-024: tablet-weergave', async ({ page }) => {
  test.skip(!SHOTS, 'alleen voor schermafdrukken');
  await page.setViewportSize({ width: 820, height: 1180 });
  await login(page);
  await page.waitForTimeout(1500);
  await foto(page, '03-dashboard-tablet');
  await page.locator('#g-operatie').click();
  await foto(page, '04-operatie-tablet');
});
