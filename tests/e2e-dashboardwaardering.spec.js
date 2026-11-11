// Dashboardwaardering (GO Marcel 06-11-2026, optie A): KPI toont alleen een goedgekeurde waardering, indicatief, met
// bandbreedte/methode/peildatum en een verouderd-melding na een latere financiële wijziging. STAGING, fictief, geen AI.
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, d1, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
let T;
test.beforeAll(async () => {
  T = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Dash KPI B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T.tussen_code, naam: 'Synth Begeleider', versie, email: 'b@synth.invalid' } });
});
test.afterAll(async () => { if (T) { const r = await ruimTrajectOp(T.code, ADMIN); expect(r && r.ok).toBeTruthy(); } });

async function dashboard(browser) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T.tussen_code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await expect(page.locator('#bg-ca-chk')).toBeAttached({ timeout: 20000 });
  return page;
}
// Verversen binnen dezelfde pagina (geen nieuwe login): elke login telt mee voor de limiet van 15 per 10 min per IP.
const ververs = (page) => page.evaluate(() => { S._dashW = null; const w = mtWrap(); if (w) mtTegels(w); });
const kpi = (page) => page.locator('.k2-kpi', { hasText: 'Indicatieve waardering' });

test('alleen goedgekeurde waardering, indicatief, verouderd na financiële wijziging', async ({ browser }) => {
  test.setTimeout(120000);
  const oud = Date.now() - 86400000, id = 'WSYNTHKPI' + Date.now();
  d1("INSERT INTO mna_waarderingen (id,traject_id,methode,range_laag,range_midden,range_hoog,onderbouwing,ai_voorstel,adviseur_akkoord,created_at,updated_at) VALUES ('" + id + "','" + T.code + "','EBITDA-multiple',900000,1100000,1300000,'synth','{}',0," + oud + "," + oud + ")");
  let p = await dashboard(browser);
  await expect(kpi(p)).toContainText('Nog geen goedgekeurde waardering', { timeout: 15000 });

  const ak = await api('POST', '/mna/waardering/akkoord', { headers: { 'x-tussen-key': T.tussen_code }, body: { code: T.code, waardering_id: id } });
  expect(ak.status).toBe(200);
  await ververs(p);
  await expect(kpi(p)).toContainText('€ 1,1 mln', { timeout: 15000 });
  await expect(kpi(p)).toContainText('Indicatief');
  await expect(kpi(p)).toContainText('EBITDA-multiple');
  await expect(kpi(p)).toContainText('peildatum');
  await expect(kpi(p)).not.toContainText('verouderd');

  await api('POST', '/mna/save', { body: { code: T.code, fase_id: 'financieel', data_json: { omzet3: { value: '2000000', label: 'x' } }, basis: {} } });
  await new Promise((r) => setTimeout(r, 1500));
  await ververs(p);
  await expect(kpi(p)).toContainText('verouderd sinds', { timeout: 15000 });
  await p.context().close();

  // Verkoper ziet de KPI niet (bron is begeleider-only).
  const v = await (await browser.newContext()).newPage();
  await v.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await v.locator('#l-code').fill(T.code);
  await v.locator('#l-btn').click();
  await v.waitForFunction(() => window.S && S.rol, null, { timeout: 20000 });
  await v.waitForTimeout(3000);
  expect(await kpi(v).count()).toBe(0);
});

// Review 3, punt 8: "laatst goedgekeurd" volgt het goedkeuringsmoment, niet de aanmaakdatum.
test('laatst goedgekeurde waardering wint, ook als die ouder is', async ({ browser }) => {
  test.setTimeout(90000);
  const t0 = Date.now() - 3 * 86400000, w1 = 'WSYNTHOUD' + Date.now(), w2 = 'WSYNTHNIEUW' + Date.now();
  d1("INSERT INTO mna_waarderingen (id,traject_id,methode,range_laag,range_midden,range_hoog,onderbouwing,ai_voorstel,adviseur_akkoord,created_at,updated_at) VALUES ('" + w1 + "','" + T.code + "','Omzetmethode',500000,700000,900000,'synth','{}',0," + t0 + "," + t0 + ")");
  d1("INSERT INTO mna_waarderingen (id,traject_id,methode,range_laag,range_midden,range_hoog,onderbouwing,ai_voorstel,adviseur_akkoord,created_at,updated_at) VALUES ('" + w2 + "','" + T.code + "','EBITDA-multiple',2000000,2500000,3000000,'synth','{}',0," + (t0 + 3600000) + "," + (t0 + 3600000) + ")");
  const ak = (id) => api('POST', '/mna/waardering/akkoord', { headers: { 'x-tussen-key': T.tussen_code }, body: { code: T.code, waardering_id: id } });
  expect((await ak(w2)).status).toBe(200);
  await new Promise((r) => setTimeout(r, 1100));
  expect((await ak(w1)).status).toBe(200);
  const p = await dashboard(browser);
  await expect(kpi(p)).toContainText('Omzetmethode', { timeout: 15000 });
});
