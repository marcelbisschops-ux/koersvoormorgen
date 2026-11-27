// #67 (besluit Marcel 19-11-2026, optie B): 'Dossier downloaden' in het begeleidersdashboard (mna.html) tegen STAGING.
// Synthetisch traject met één DD-veld; begeleider downloadt het dossier via de knop; inhoud = dit traject; verkoper en
// koper krijgen geen dossier; export vastgelegd in mna_audit. Geen mail (testadres .invalid), ruimt op.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, d1, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const VOK = (() => { try { return (fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5'; } catch { return '1.5'; } })();
// N-120 batch F: VID = traject-ID (opruimen/D1/bestandsnaam), V = verkoper-inlogcode (legacy = traject-ID).
let VID, VID2, V, T, K, V2, T2;
test.beforeAll(async () => {
  const c = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Dossier 67 B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'e2e-67@kvm-test.invalid' } })).json;
  VID = c.code; V = c.verkoper_inlogcode || c.code; T = c.tussen_code; K = c.koper_code;
  const c2 = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Dossier 67 ANDER B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'e2e-67@kvm-test.invalid' } })).json;
  VID2 = c2.code; V2 = c2.verkoper_inlogcode || c2.code; T2 = c2.tussen_code;
  await accepteerPlatformvoorwaarden([V, T, K, V2, T2]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK, email: 'e2e-67@kvm-test.invalid' } });
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet3: { value: '1.416.000', label: 'Jaaromzet jaar 3' } }, checklist_json: {} } });
});
test.afterAll(async () => { for (const c of [VID, VID2]) if (c) await ruimTrajectOp(c, ADMIN); });

test('API: alleen de begeleider van dit traject krijgt het dossier', async () => {
  const g = (code, key) => fetch(WORKER + '/mna/begeleider/export?code=' + encodeURIComponent(code), { headers: key ? { 'x-tussen-key': key } : {} });
  expect((await g(T, null)).status).toBe(403);
  expect((await g(V, V)).status).toBe(403);
  expect((await g(K, K)).status).toBe(403);
  expect((await g(T, T2)).status).toBe(403);
  const r = await g(T2, T2); const tekst = await r.text();
  expect(r.status).toBe(200);
  expect(tekst).toContain('Synth Dossier 67 ANDER');
  expect(tekst).not.toContain('1.416.000');
});

test('UI: knop Dossier downloaden in het begeleidersdashboard', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  const ent = page.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 });
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await ent; await page.waitForTimeout(800);
  const knop = page.locator('#bg-dossier-download');
  await expect(knop).toBeVisible({ timeout: 15000 });
  const dl = page.waitForEvent('download');
  await knop.click();
  const d = await dl;
  expect(d.suggestedFilename()).toMatch(new RegExp('^dossier-' + VID + '-\\d{4}-\\d{2}-\\d{2}\\.txt$'));
  const inhoud = fs.readFileSync(await d.path(), 'utf8');
  expect(inhoud).toContain('Synth Dossier 67 B.V.');
  expect(inhoud).toContain('Jaaromzet jaar 3: 1.416.000');
  expect(inhoud).not.toContain('ANDER');
  await expect(knop).toBeEnabled();
  const a = d1("SELECT rol, actie FROM mna_audit WHERE code IN ('" + VID + "','" + V + "','" + T + "') AND actie='dossier_export'");
  expect(a.length).toBeGreaterThanOrEqual(1);
  expect(a[0].rol).toBe('begeleider');
});
