// #46 (13-11-2026): akkoordlink tegen STAGING. Synthetisch traject + synthetisch verstuurd TOS-document (D1-testhelper,
// alleen staging) → begeleider maakt link (beheerstrook in mna) → ontvanger opent akkoord.html, verkeerd adres geweigerd,
// juist adres + bevestiging → akkoord vastgelegd (partijreactie, documentstatus) → tweede gebruik geweigerd. Ruimt op.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp, d1 } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const VOK_VERSIE = (() => { try { const m = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/); return (m && m[1]) || '1.5'; } catch { return '1.5'; } })();
let V, T, DOC;

test.beforeAll(async () => {
  test.setTimeout(120000);
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Akkoordlink B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'delivered@resend.dev' } });
  V = c.json && c.json.code; T = c.json && c.json.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK_VERSIE, email: 'delivered@resend.dev' } });
  DOC = 'SYNTHAKL' + Date.now();
  const nu = Date.now();
  if (!/^[A-Z0-9]+$/.test(V) || !/^SYNTHAKL\d+$/.test(DOC)) throw new Error('onverwachte code');
  d1("INSERT INTO tos_document (id, traject_id, profile_id, profile_version, doc_type, status, current_version, created_by, created_at, updated_at, adressaten_json, verstuurd_op) VALUES ('" + DOC + "','" + V + "','synth',1,'nda','verstuurd',1,'begeleider'," + nu + ',' + nu + ",'[\"koper\"]'," + nu + ')');
});
test.afterAll(async () => {
  if (DOC && /^SYNTHAKL\d+$/.test(DOC)) { d1("DELETE FROM tos_party_response WHERE document_id='" + DOC + "'"); d1("DELETE FROM tos_document WHERE id='" + DOC + "'"); }
  if (V) await ruimTrajectOp(V, ADMIN);
});

test('akkoordlink: begeleider maakt link, ontvanger geeft akkoord zonder in te loggen, eenmalig', async ({ page, browser }) => {
  test.setTimeout(150000);
  expect(V && T && DOC, 'testdata').toBeTruthy();
  // 1. Begeleider: beheerstrook in mna (zelfde functie als bij een verstuurd document), link maken via de knop.
  const antw = ['koper', 'Ontvanger@Synth.test'];
  page.on('dialog', (d) => d.accept(antw.shift()));
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await page.evaluate((doc) => { const el = document.createElement('div'); el.id = 'akl-test'; el.setAttribute('data-doc', doc); document.body.appendChild(el); akkoordlinkBeheer(el); }, DOC);
  await expect(page.locator('#akl-test')).toContainText('Akkoordlink maken', { timeout: 15000 });
  await page.locator('#akl-maak').click();
  const linkVeld = page.locator('#akl-uit input');
  await expect(linkVeld).toBeVisible({ timeout: 15000 });
  const link = await linkVeld.inputValue();
  expect(link).toMatch(/^https:\/\/koersvoormorgen\.nl\/akkoord\.html\?worker=https%3A%2F%2Fkantoorinzicht-staging[^#]+#t=[A-Za-z0-9_-]{43}$/);
  await expect(page.locator('#akl-test')).toContainText('ontvanger@synth.test', { timeout: 15000 });
  // 2. Ontvanger: eigen, schone browsercontext (geen sessie), echte akkoord.html van deze build.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto('/akkoord.html' + link.slice(link.indexOf('?')));
  await expect(p2.locator('#ak')).toContainText('versie 1 van de geheimhoudingsovereenkomst', { timeout: 20000 });
  expect(await p2.evaluate(() => location.hash)).toBe('');          // token uit de adresbalk
  await p2.locator('#ak-knop').click();
  await expect(p2.locator('#ak-m')).toContainText('Vink aan');
  await p2.locator('#ak-mail').fill('iemand@anders.test');
  await p2.locator('#ak-ja').check();
  await p2.locator('#ak-knop').click();
  await expect(p2.locator('#ak-m')).toContainText('hoort niet bij deze link', { timeout: 15000 });
  await p2.locator('#ak-mail').fill('ontvanger@synth.test');
  await p2.locator('#ak-knop').click();
  await expect(p2.locator('#ak')).toContainText('Je akkoord is vastgelegd', { timeout: 15000 });
  // 3. Vastgelegd zoals een ingelogde reactie; status afgeleid; tweede gebruik geweigerd.
  const pr = d1("SELECT response, party_role, responded_by FROM tos_party_response WHERE document_id='" + DOC + "'");
  expect(pr.length).toBe(1);
  expect(pr[0].response).toBe('akkoord');
  expect(pr[0].party_role).toBe('koper');
  expect(pr[0].responded_by).toMatch(/^akkoordlink:AKL/);
  expect(d1("SELECT status FROM tos_document WHERE id='" + DOC + "'")[0].status).toBe('goedgekeurd');
  const tweede = await api('POST', '/mna/akkoordlink/bevestig', { body: { token: link.split('#t=')[1], email: 'ontvanger@synth.test', bevestiging: true } });
  expect(tweede.status).toBe(410);
  await ctx.close();
});
