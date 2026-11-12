// N-184 (12-11-2026): de interne notitie in adv.html wordt opgeslagen in adv_notitie van de voorgesprekrij met de
// N-146-driewegsamenvoeging. Bewijst: andere velden, checklist en notitie van die rij blijven intact; de notitie wordt
// teruggelezen; gelijktijdige wijziging geeft een conflict zonder tekstverlies; de beheerdersnotitie
// (mna_trajecten.notitie) wordt niet getoond. STAGING, fictief, ruimt op.
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, zetMfaUitVoorTest, ruimTestTrajectOp, verwijderTestGebruiker, accepteerPlatformvoorwaarden, IS_STAGING_WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
let email, gid, T;
const d1Rij = (sql) => { const r = d1(sql); return Array.isArray(r) ? r[0] : (r && r.results ? r.results[0] : null); };

test.beforeAll(async () => {
  email = 'e2e-n184-' + Date.now() + '@bisschopsfinancing.test';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E N184', bedrijf: 'E2E N184 BV', email } });
  gid = uit.json && uit.json.id;
  await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 2, modules: { traject: true } } });
  const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'Synth N184 Notitie B.V.', contact_naam: 'Synth Verkoper', contact_email: 'v@bisschopsfinancing.test', traject_type: 'Verkoop', sector: 'accountancy', notitie: 'BEHEERDERSNOTITIE-NIET-TONEN' } } });
  T = c.json;
  await accepteerPlatformvoorwaarden([T.code, T.tussen_code, T.koper_code]);
  // Bestaande voorgesprekrij met een ander veld, een checklist en een notitie (zoals de begeleider die vult in mna.html).
  await api('POST', '/mna/save', { body: { code: T.tussen_code, fase_id: 'voorgesprek', data_json: { motief: { label: 'Motief', value: 'Opvolging' } }, checklist_json: { item1: true }, notitie: 'Begeleidernotitie voorgesprek' } });
  // De beheerdersnotitie staat in mna_trajecten.notitie (platformbeheerder-only).
  d1("UPDATE mna_trajecten SET notitie='BEHEERDERSNOTITIE-NIET-TONEN' WHERE id='" + T.code + "'");
});
test.afterAll(async () => { if (T && T.code) await ruimTestTrajectOp(T.code, T.tussen_code); if (gid) await verwijderTestGebruiker(gid, ADMIN); });

test('notitie opslaan behoudt de voorgesprekrij, wordt teruggelezen, conflict zonder tekstverlies', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-e').fill(email);
  await page.locator('#l-w').fill(WW);
  await page.locator('#l-btn').click();
  await expect(page.getByRole('button', { name: '+ Nieuw traject' })).toBeVisible({ timeout: 15000 });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  const veld = page.locator('#notitie-txt');
  await expect(veld).toBeEnabled({ timeout: 15000 });
  expect(await veld.inputValue()).toBe('');
  expect(await page.content()).not.toContain('BEHEERDERSNOTITIE-NIET-TONEN');

  await veld.fill('Eerste adviseursnotitie');
  const w1 = page.waitForResponse((r) => r.url().includes('/mna/save'));
  await page.getByRole('button', { name: 'Opslaan' }).last().click();
  expect((await w1).status()).toBe(200);
  let rij = d1Rij("SELECT data_json, checklist_json, notitie FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL");
  let dj = JSON.parse(rij.data_json);
  expect(dj.adv_notitie.value).toBe('Eerste adviseursnotitie');
  expect(dj.motief.value).toBe('Opvolging');
  expect(JSON.parse(rij.checklist_json)).toEqual({ item1: true });
  expect(rij.notitie).toBe('Begeleidernotitie voorgesprek');
  expect(d1Rij("SELECT notitie FROM mna_trajecten WHERE id='" + T.code + "'").notitie).toBe('BEHEERDERSNOTITIE-NIET-TONEN');

  // Teruglezen na opnieuw openen.
  await page.evaluate(() => { renderDashboard(); });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  await expect(veld).toBeEnabled({ timeout: 15000 });
  expect(await veld.inputValue()).toBe('Eerste adviseursnotitie');

  // Gelijktijdige wijziging elders → conflict, actuele tekst + eigen tekst behouden, niets overschreven.
  await api('POST', '/mna/save', { body: { code: T.tussen_code, fase_id: 'voorgesprek', data_json: { adv_notitie: { label: 'Adviseur notitie', value: 'Elders gewijzigd' } }, basis: { adv_notitie: 'Eerste adviseursnotitie' }, checklist_json: {}, basis_checklist: '{}', notitie: '', basis_notitie: '' } });
  await veld.fill('Mijn tweede versie');
  const w2 = page.waitForResponse((r) => r.url().includes('/mna/save'));
  await page.getByRole('button', { name: 'Opslaan' }).last().click();
  expect((await w2).status()).toBe(409);
  await expect.poll(() => veld.inputValue(), { timeout: 15000 }).toContain('Elders gewijzigd');
  expect(await veld.inputValue()).toContain('Mijn tweede versie');
  rij = d1Rij("SELECT data_json, checklist_json, notitie FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL");
  dj = JSON.parse(rij.data_json);
  expect(dj.adv_notitie.value).toBe('Elders gewijzigd');
  expect(dj.motief.value).toBe('Opvolging');
  expect(JSON.parse(rij.checklist_json)).toEqual({ item1: true });
  expect(rij.notitie).toBe('Begeleidernotitie voorgesprek');

  // Rolgrens adv_notitie voor verkoper/koper: bestaande bevinding N-197 (verkoper krijgt de voorgesprekrij via
  // GET /mna/traject); los van N-184, die de opslagplek niet verandert. Getest in de N-197-test.

  // Onleesbare rij: 409 en niets gewijzigd.
  d1("UPDATE mna_data SET data_json='{kapot' WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL");
  await page.evaluate(() => { renderDashboard(); });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  await expect(veld).toBeEnabled({ timeout: 15000 });
  await veld.fill('Poging op onleesbare rij');
  const w3 = page.waitForResponse((r) => r.url().includes('/mna/save'));
  await page.getByRole('button', { name: 'Opslaan' }).last().click();
  expect((await w3).status()).toBe(409);
  expect(d1Rij("SELECT data_json FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL").data_json).toBe('{kapot');
});

test('laadfout: opslaan geblokkeerd, rij onveranderd', async ({ page }) => {
  test.setTimeout(90000);
  d1("UPDATE mna_data SET data_json='{\"motief\":{\"label\":\"Motief\",\"value\":\"Opvolging\"}}' WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL");
  await page.route('**/gebruikers/mna/detail/**', (route) => route.fulfill({ status: 500, body: '{}' }));
  let saves = 0; page.on('request', (r) => { if (r.url().includes('/mna/save')) saves++; });
  await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-e').fill(email);
  await page.locator('#l-w').fill(WW);
  await page.locator('#l-btn').click();
  await expect(page.getByRole('button', { name: '+ Nieuw traject' })).toBeVisible({ timeout: 15000 });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  const veld = page.locator('#notitie-txt');
  await expect(veld).toHaveAttribute('placeholder', /kon niet worden geladen/, { timeout: 15000 });
  await expect(veld).toBeDisabled();
  await page.getByRole('button', { name: 'Opslaan' }).last().click();
  await page.waitForTimeout(1500);
  expect(saves).toBe(0);
  expect(JSON.parse(d1Rij("SELECT data_json FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL").data_json).motief.value).toBe('Opvolging');
});

test('voorgesprekrij bestaat nog niet: notitie wordt aangemaakt', async ({ page }) => {
  test.setTimeout(90000);
  d1("DELETE FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek'");
  await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-e').fill(email);
  await page.locator('#l-w').fill(WW);
  await page.locator('#l-btn').click();
  await expect(page.getByRole('button', { name: '+ Nieuw traject' })).toBeVisible({ timeout: 15000 });
  await page.evaluate((id) => { openTraject(id); }, T.code);
  const veld = page.locator('#notitie-txt');
  await expect(veld).toBeEnabled({ timeout: 15000 });
  expect(await veld.inputValue()).toBe('');
  await veld.fill('Notitie op nieuwe rij');
  const w = page.waitForResponse((r) => r.url().includes('/mna/save'));
  await page.getByRole('button', { name: 'Opslaan' }).last().click();
  expect((await w).status()).toBe(200);
  const rij = d1Rij("SELECT data_json, checklist_json, notitie FROM mna_data WHERE traject_id='" + T.code + "' AND fase_id='voorgesprek' AND entiteit_id IS NULL");
  expect(JSON.parse(rij.data_json).adv_notitie.value).toBe('Notitie op nieuwe rij');
});
