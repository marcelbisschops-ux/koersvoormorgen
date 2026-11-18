// #52 visuele teaser (18-11-2026) tegen STAGING: voorbeeld-pdf met geanonimiseerde grafieken, herleidbaarheidscontrole en
// akkoord vóór verzending, in de echte begeleidersweergave. Synthetisch traject; geen AI (teasertekst wordt opgeslagen,
// niet gegenereerd); verzending alleen als negatieve proef (afgewezen vóór enige mail), ontvanger op .invalid; ruimt op.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const VOK_VERSIE = (() => { try { const m = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/); return (m && m[1]) || '1.5'; } catch { return '1.5'; } })();
const veld = (value, label) => ({ value, label });
const SCHOON = 'Een gevestigd IT- en softwarebedrijf in Midden-Nederland met een omzet in de klasse €1 - €2 miljoen en een hecht team. De onderneming levert maatwerk en beheer aan een brede, trouwe klantenkring met veel terugkerende omzet. De eigenaar zoekt een opvolger die de groei voortzet.';
let V, T;

test.beforeAll(async () => {
  test.setTimeout(120000);
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Teaser Vos B.V.', sector: 'itsoftware', traject_type: 'Verkoop', contact_email: 'e2e-52@kvm-test.invalid' } });
  V = c.json && c.json.code; T = c.json && c.json.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK_VERSIE, email: 'e2e-52@kvm-test.invalid' } });
  const fasen = {
    financieel: { omzet1: veld('1.180.000', 'Jaaromzet jaar 1 (oudste)'), omzet2: veld('1.298.000', 'Jaaromzet jaar 2'), omzet3: veld('1.416.000', 'Jaaromzet jaar 3 (meest recent)'), ebitdaMarge: veld('18,6', 'EBITDA-marge'), recurring: veld('72', 'Terugkerende omzet') },
    partner: { fte: veld('16', 'FTE') },
    commercieel: { aantalKlanten: veld('140', 'Aantal klanten') },
    strategisch: { marktpos: veld('Sterke positie rond Amersfoort en in de regio.', 'Marktpositie / regio') },
  };
  for (const [fase_id, data_json] of Object.entries(fasen)) await api('POST', '/mna/save', { body: { code: V, fase_id, data_json, checklist_json: {} } });
  const o = await api('POST', '/mna/teaser/opslaan', { headers: { 'x-tussen-key': T }, body: { code: T, tekst: SCHOON } });
  expect(o.json && o.json.ok, 'teasertekst opgeslagen (geen AI)').toBeTruthy();
});
test.afterAll(async () => { if (V) await ruimTrajectOp(V, ADMIN); });

test('API: voorbeeld met grafieken, controle en verzendpoort', async () => {
  const B = { 'x-tussen-key': T };
  const vb = await api('POST', '/mna/teaser/voorbeeld', { headers: B, body: { code: T, teaser_tekst: SCHOON } });
  expect(vb.status).toBe(200);
  expect(vb.json.controle).toEqual({ ok: true, treffers: [] });
  expect(vb.json.visueel.sector).toBe('IT en software');
  expect(vb.json.visueel.tegels.map((t) => t.label + '=' + t.waarde)).toEqual(['Omzetklasse=€1 - €2 mln', 'EBITDA-marge=15-20%', 'Team (fte)=10-25', 'Aantal klanten=100-250', 'Terugkerende omzet=70-80%']);
  expect(vb.json.visueel.trend.map((t) => t.index)).toEqual([100, 110, 120]);
  const pdf = Buffer.from(vb.json.pdf_base64, 'base64');
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const uit = process.env.KVM_TEST_UITVOER; if (uit) fs.writeFileSync(path.join(uit, 'teaser-52-voorbeeld.pdf'), pdf);
  // Herleidbaar: plaatsnaam uit de regio en een exact dossierbedrag.
  const fout = await api('POST', '/mna/teaser/voorbeeld', { headers: B, body: { code: T, teaser_tekst: SCHOON + ' Gevestigd in Amersfoort, omzet 1.416.000.' } });
  expect(fout.json.controle.ok).toBe(false);
  expect(fout.json.controle.treffers.map((t) => t.soort + ':' + t.waarde)).toEqual(expect.arrayContaining(['mogelijke plaatsnaam:Amersfoort', 'exacte dossierwaarde:1416000']));
  // Verzendpoort: zonder akkoord en bij herleidbare tekst geweigerd vóór enige mail.
  const zonder = await api('POST', '/mna/teaser/email', { headers: B, body: { code: T, teaser_tekst: SCHOON, to: ['e2e-52@kvm-test.invalid'] } });
  expect([zonder.status, zonder.json.code]).toEqual([400, 'AKKOORD_VEREIST']);
  const herl = await api('POST', '/mna/teaser/email', { headers: B, body: { code: T, teaser_tekst: SCHOON + ' Kantoor in Amersfoort.', to: ['e2e-52@kvm-test.invalid'], akkoord_visueel: true } });
  expect([herl.status, herl.json.code]).toEqual([400, 'HERLEIDBAAR']);
  // Rolgrens: verkoper en koper krijgen geen voorbeeld.
  const verk = await api('POST', '/mna/teaser/voorbeeld', { headers: { 'x-tussen-key': V }, body: { code: V, teaser_tekst: SCHOON } });
  expect(verk.status).toBe(401);
  const zonderSleutel = await api('POST', '/mna/teaser/voorbeeld', { body: { code: T, teaser_tekst: SCHOON } });
  expect(zonderSleutel.status).toBe(401);
});

test('UI: voorbeeld, controle-uitkomst en akkoord per tekstversie', async ({ page }) => {
  test.setTimeout(120000);
  page.on('dialog', (d) => d.accept());
  const mails = []; page.on('request', (r) => { if (r.url().includes('/mna/teaser/email')) mails.push(r.url()); });
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  // Na inloggen tekent loadEntiteiten() het scherm één keer opnieuw (zie login() in e2e-3rollen-regressie); daarop wachten.
  const entiteiten = page.waitForResponse((r) => r.url().includes('/mna/entiteiten/'), { timeout: 30000 });
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await entiteiten; await page.waitForTimeout(800);
  // Zelfde aanpak als openBegeleiderKaart() (e2e-3rollen-regressie): Journey-scherm en de fase van de kaart openen.
  if (await page.evaluate(() => document.documentElement.getAttribute('data-ui') === '2')) {
    await page.click('#mt-zij [data-mt-naar="journey"]');
    await page.waitForTimeout(800);
    await page.evaluate(() => { const k = document.getElementById('bg-teaser-actie'); const p = k && k.closest('[data-jr-paneel]'); if (p && p.hidden) { const b = document.querySelector('#jr-begeleider [data-jr-fase="' + p.getAttribute('data-jr-paneel') + '"]'); if (b) b.click(); } });
  }
  await page.locator('#bg-teaser-actie').click();
  await expect(page.locator('#teaser-txt')).toHaveValue(SCHOON, { timeout: 15000 });
  const akk = page.locator('#teaser-akkoord');
  await expect(akk).toBeDisabled();
  // Verzenden zonder voorbeeld: geweigerd in de pagina, geen aanroep.
  await page.locator('#teaser-email-naar').fill('e2e-52@kvm-test.invalid');
  await page.locator('#teaser-email-btn').click();
  await page.waitForTimeout(500);
  expect(mails.length, 'geen verzendaanroep zonder voorbeeld en akkoord').toBe(0);
  await page.locator('#teaser-voorbeeld-btn').click();
  await expect(page.locator('#teaser-controle')).toContainText('geen exacte bedragen, namen of plaatsnamen gevonden', { timeout: 60000 });
  await expect(page.locator('#teaser-voorbeeld-link a')).toHaveText('Voorbeeld-pdf openen');
  await expect(akk).toBeEnabled();
  await akk.check();
  // Tekst wijzigen: akkoord vervalt; herleidbare tekst geeft treffers en geen akkoord.
  await page.locator('#teaser-txt').fill(SCHOON + ' Gevestigd in Amersfoort.');
  await expect(akk).toBeDisabled();
  await expect(akk).not.toBeChecked();
  await page.locator('#teaser-voorbeeld-btn').click();
  await expect(page.locator('#teaser-controle')).toContainText('Mogelijk herleidbaar', { timeout: 60000 });
  await expect(page.locator('#teaser-controle')).toContainText('mogelijke plaatsnaam: Amersfoort');
  await expect(akk).toBeDisabled();
  await page.locator('#teaser-email-btn').click();
  await page.waitForTimeout(500);
  expect(mails.length, 'geen verzendaanroep bij herleidbare tekst').toBe(0);
});
