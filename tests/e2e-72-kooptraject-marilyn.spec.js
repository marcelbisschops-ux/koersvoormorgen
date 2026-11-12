// #72 (12-11-2026): rechtstreeks een kooptraject starten vanuit Marilyn → M&A-trajecten → Nieuw traject, met koper
// (opdrachtgever), target en begeleider, zonder CRM-lead of koopmandaat; direct door naar de begeleidersworkspace van
// deze deal (buy-side), en zichtbaar in het overzicht als kooptraject. STAGING, fictief, ruimt op.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const NAAM = 'Synth Target 72 ' + Date.now() + ' B.V.';
let code = null;
const rij = (sql) => { const r = d1(sql); return Array.isArray(r) ? r[0] : (r && r.results ? r.results[0] : null); };
test.afterAll(async () => { if (code) { const r = await ruimTrajectOp(code, ADMIN); expect(r && r.ok).toBeTruthy(); } });

test('kooptraject aanmaken vanuit Marilyn en direct als begeleider openen', async ({ page, context }) => {
  test.setTimeout(150000);
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await page.locator('#t-mna').click();
  await page.locator('#btn-nieuw').click();
  await page.locator('#m-opdr').selectOption('koper');
  await expect(page.locator('#m-t')).toHaveValue('Overname');
  await expect(page.locator('#m-sectie2-hdr')).toContainText('opdrachtgever');
  // Alleen de naam van de target; adres/KvK/contact van de target zijn bij een kooptraject vaak nog onbekend.
  await page.locator('#m-k').fill(NAAM);
  await page.locator('#m-koper-naam').fill('Synth Koper Holding B.V.');
  await page.locator('#m-koper-contact').fill('Synth Koper');
  // Zonder e-mail van de koper: duidelijke melding, niets aangemaakt.
  await page.locator('#m-ok').click();
  await expect(page.locator('#m-err')).toContainText('E-mail van de koper is verplicht');
  await page.locator('#m-koper-email').fill('koper@bisschopsfinancing.test');
  const w = page.waitForResponse((r) => r.url().includes('/mna/create'));
  await page.locator('#m-ok').click();
  const resp = await w; const d = await resp.json();
  expect(resp.status()).toBe(200);
  code = d.code;
  // Database: echt kooptraject, koper als opdrachtgever, begeleider ingevuld.
  const t = rij("SELECT opdrachtgever_rol, traject_type, koper_naam, koper_email, begeleider_naam, kantoor_naam FROM mna_trajecten WHERE id='" + code + "'");
  expect(t).toMatchObject({ opdrachtgever_rol: 'koper', traject_type: 'Overname', koper_naam: 'Synth Koper Holding B.V.', koper_email: 'koper@bisschopsfinancing.test', kantoor_naam: NAAM });
  expect(t.begeleider_naam).toBeTruthy();
  // Venster blijft open met de codes en een directe ingang; overzicht toont 'Kooptraject'.
  await expect(page.locator('#res-open-begeleider')).toBeVisible();
  await expect(page.locator('tr', { hasText: NAAM }).first()).toContainText('Kooptraject');

  // Begeleider opent de workspace van deze deal (voorwaarden/VOK via de bestaande stappen vooraf geaccepteerd).
  await accepteerPlatformvoorwaarden([d.code, d.tussen_code, d.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: d.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@bisschopsfinancing.test' } });
  await page.evaluate((w) => { const a = document.getElementById('res-open-begeleider'); a.href = a.href + '&worker=' + encodeURIComponent(w); }, WORKER);
  const [mna] = await Promise.all([context.waitForEvent('page'), page.locator('#res-open-begeleider').click()]);
  await mna.waitForFunction(() => window.S && S.rol === 'tussenpersoon' && S.traject, null, { timeout: 30000 });
  expect(await mna.evaluate(() => S.traject.opdrachtgever_rol)).toBe('koper');
  // Buy-side workspace: introductie met de target beschikbaar, geen sell-side 'biedingen vergelijken'.
  await expect(mna.locator('#bg-introductie-actie')).toBeAttached({ timeout: 20000 });
  await expect(mna.locator('#bg-biedingvergelijk-actie')).toHaveCount(0);
  await expect(mna.locator('body')).toContainText(NAAM);
});
