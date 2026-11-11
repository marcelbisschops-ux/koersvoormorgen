// N-183 browserbewijs: de nieuwe vragen staan in het accountancy-profiel, en de begeleider ziet in Analyse en waardering
// het paneel Toekomstbestendigheid met soorten, dekking en een niet-toegepaste richting, en legt de beoordeling vast.
// STAGING, fictief, geen AI, ruimt op.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
let T;
const veld = (x) => ({ value: x, label: 'x' });
test.beforeAll(async () => {
  T = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N183 Paneel B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@synth.invalid' } });
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'financieel', data_json: { omzet1: veld('1800000'), omzet2: veld('1900000'), omzet3: veld('2000000'), ebitda: veld('400000'), kostenPersoneel: veld('55') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'partner', data_json: { fte: veld('16') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'commercieel', data_json: { pctCompliance: veld('60'), pctAdviesTerugkerend: veld('25'), pctAdviesIncidenteel: veld('10'), dienstmixBron: veld('schatting') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'it', data_json: { pctHandmatig: veld('30'), stdWerkprogramma: veld('Ja'), stdSjablonen: veld('Ja'), stdBankkoppeling: veld('Deels'), aiToestemming: veld('onbekend') }, basis: {} } });
});
test.afterAll(async () => { if (T) { const r = await ruimTrajectOp(T.code, ADMIN); expect(r && r.ok).toBeTruthy(); } });

test('vragen in het profiel, paneel voor de begeleider, beoordeling vastleggen', async ({ browser }) => {
  test.setTimeout(120000);
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const fouten = []; page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T.tussen_code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await expect(page.locator('#bg-ca-chk')).toBeAttached({ timeout: 20000 });
  // De nieuwe vragen bestaan in het accountancy-profiel (fasen commercieel en it).
  const velden = await page.evaluate(() => { const f = (id) => (FASES.find((x) => x.id === id) || { dataFields: [] }).dataFields.map((d) => d.id); return f('commercieel').concat(f('it')); });
  for (const id of ['pctCompliance', 'pctAdviesTerugkerend', 'dienstmixBron', 'pctHandmatig', 'stdWerkinstructies', 'aiToestemming']) expect(velden).toContain(id);
  await page.evaluate(() => { S.screen = 'waardering'; renderApp(); });
  const paneel = page.locator('#w-toekomst');
  await expect(paneel).toContainText('Toekomstbestendigheid en schaalbaarheid', { timeout: 20000 });
  await expect(paneel).toContainText('Adviesomzet totaal');
  await expect(paneel).toContainText('35%');
  await expect(paneel).toContainText('Schatting');
  await expect(paneel).toContainText('Indicator 83 van 100');
  await expect(paneel).toContainText('(niet toegepast)');
  await expect(paneel).toContainText('Zonder aantoonbare toestemming');
  await expect(paneel).toContainText('Scenario');
  await expect(page.locator('#tk-in-im')).toBeDisabled();
  await page.locator('#tk-beoordeeld').check();
  await page.locator('#tk-in-im').check();
  await page.locator('#tk-toelichting').fill('Synth toelichting begeleider');
  const w = page.waitForResponse((r) => r.url().includes('/mna/toekomst/beoordeling'));
  await page.locator('#tk-opslaan').click();
  expect((await w).status()).toBe(200);
  await expect(paneel).toContainText('Laatst vastgelegd', { timeout: 10000 });
  const g = await api('GET', '/mna/toekomst/' + T.code, { headers: { 'x-tussen-key': T.tussen_code } });
  expect(g.json.beoordeling).toMatchObject({ beoordeeld: true, in_im: true, toelichting: 'Synth toelichting begeleider' });
  // Wijzigt de verkoper daarna een toekomstveld, dan toont het paneel dat de beoordeling verouderd is.
  const itNu = JSON.parse(((await api('GET', '/mna/traject/' + T.code)).json.data || []).find((x) => x.fase_id === 'it').data_json);
  const bas = Object.fromEntries(Object.entries(itNu).filter(([, x]) => x && x.value).map(([k, x]) => [k, String(x.value)]));
  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'it', data_json: { ...itNu, pctHandmatig: veld('12') }, basis: bas } });
  await page.evaluate(() => tkLaad());
  await expect(page.locator('#tk-verouderd')).toBeVisible({ timeout: 10000 });
  expect(fouten).toEqual([]);
  // De verkoper ziet het paneel niet.
  const v = await (await browser.newContext()).newPage();
  await v.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await v.locator('#l-code').fill(T.code);
  await v.locator('#l-btn').click();
  await v.waitForFunction(() => window.S && S.rol, null, { timeout: 20000 });
  await v.evaluate(() => { if (typeof tkLaad === 'function') tkLaad(); });
  expect(await v.locator('#w-toekomst').count()).toBe(0);
});
