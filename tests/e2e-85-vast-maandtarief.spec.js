// #85 (13-11-2026): Marilyn → Facturatie, volledige reis van het vaste maandbedrag in de browser tegen STAGING.
// Instellen → module inbegrepen → concept → bedrag verwijderen geeft blokkade (niet definitief) → opnieuw instellen →
// definitief → PDF → creditnota. Synthetisch testkantoor in testmodus, ruimt alles op. Geen AI, geen e-mail.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { api, leesAdminKey, WORKER, d1, IS_STAGING_WORKER, verwijderTestGebruiker } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const PERIODE = '2026-10';
let gid, kid;

test.beforeAll(async () => {
  const email = 'e2e-85-vast-' + Date.now() + '@bisschopsfinancing.test';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Synth 85', bedrijf: 'Synth Kantoor 85 BV', email } });
  gid = uit.json && uit.json.id;
  kid = 'K' + gid;
});

test.afterAll(async () => {
  if (!kid || !/^K[0-9A-Za-z_-]+$/.test(kid)) return;
  const q = "'" + kid + "'";
  d1('DELETE FROM kantoor_factuur_regels WHERE factuur_id IN (SELECT id FROM kantoor_facturen WHERE kantoor_id=' + q + ')');
  for (const t of ['kantoor_facturen', 'kantoor_factuur_audit', 'kantoor_facturatie', 'kantoor_module_audit', 'kantoor_modules']) d1('DELETE FROM ' + t + ' WHERE kantoor_id=' + q);
  if (gid) await verwijderTestGebruiker(gid, ADMIN);
  d1('DELETE FROM kantoren WHERE id=' + q + " AND naam='Synth Kantoor 85 BV'");
});

// Antwoorden op prompt()/confirm() in volgorde; elk dialoog dat niet in de wachtrij staat laat de test falen.
function dialogen(page) {
  const rij = [];
  page.on('dialog', async (d) => {
    const a = rij.shift();
    if (a === undefined) { await d.dismiss(); throw new Error('Onverwacht dialoog: ' + d.message()); }
    if (a === false) await d.dismiss(); else await d.accept(a === true ? undefined : a);
  });
  return (...antw) => rij.push(...antw);
}
const facturen = async () => (await api('GET', '/mna/admin/facturatie/facturen?periode=' + PERIODE, { adminKey: ADMIN })).json.facturen.filter((f) => f.kantoor_id === kid);

test('#85 vast maandbedrag: instellen, inbegrepen, blokkade, definitief, PDF, creditnota', async ({ page }) => {
  test.setTimeout(180000);
  expect(gid, 'testkantoor aangemaakt').toBeTruthy();
  const antwoord = dialogen(page);
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#nood summary').click();
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await page.locator('#t-facturatie').click();
  const naarSub = async (s) => { await page.locator('.fact-sub[data-sub="' + s + '"]').click(); await expect(page.locator('#fact-inhoud')).not.toContainText('Laden...'); };
  const vast = page.locator('.fact-vast[data-id="' + kid + '"]');

  // 1. Vast maandbedrag instellen.
  await naarSub('kantoren');
  antwoord('500', PERIODE + '-01', '', 'Abonnement Synth');
  await vast.click();
  const kaart = page.locator('#fact-inhoud > div').filter({ has: vast });
  await expect(kaart).toContainText('500,00', { timeout: 15000 });
  await expect(kaart).toContainText('Abonnement Synth');

  // 2. Module contracten (eerst aan bij het kantoor, bestaande route) als inbegrepen vastleggen via de UI.
  const aan = await api('POST', '/mna/admin/kantoren/' + kid + '/module', { adminKey: ADMIN, body: { module_id: 'contracten', enabled: true } });
  expect(aan.status, 'module aan ' + aan.tekst).toBe(200);
  await naarSub('facturen'); await naarSub('kantoren');
  antwoord(PERIODE + '-01', '', true);
  await page.locator('#fact-inhoud > div').filter({ has: vast }).locator('.fact-modper[data-module="contracten"]').click();
  await expect(page.locator('#fact-inhoud > div').filter({ has: vast })).toContainText('inbegrepen in vast bedrag', { timeout: 15000 });

  // 3. Concept (route voor één kantoor) en in de UI openen.
  const c = await api('POST', '/mna/admin/facturatie/concept', { adminKey: ADMIN, body: { kantoor_id: kid, periode: PERIODE } });
  expect(c.status, 'concept HTTP ' + c.tekst).toBe(200);
  const fid = c.json.factuur.id;
  const regels = c.json.factuur.regels;
  expect(regels.find((r) => r.soort === 'vast') && regels.find((r) => r.soort === 'vast').bedrag, 'vaste regel € 500').toBe(500);
  expect(regels.some((r) => r.module_id === 'contracten' && r.bedrag === 0 && /inbegrepen in vast maandbedrag/.test(r.omschrijving || '')), 'contracten als regel van € 0 ' + JSON.stringify(regels.map((r) => [r.soort, r.module_id, r.bedrag]))).toBe(true);
  await naarSub('facturen');
  await page.locator('#fact-periode').fill(PERIODE);
  await page.locator('#fact-periode').dispatchEvent('change');
  await page.locator('.fact-open[data-id="' + fid + '"]').click();
  await expect(page.locator('#fact-inhoud')).toContainText('Abonnement Synth');
  await expect(page.locator('#fact-inhoud')).toContainText('inbegrepen in vast maandbedrag');

  // 4. Vast bedrag verwijderen terwijl contracten inbegrepen is → herberekend concept is geblokkeerd.
  await naarSub('kantoren');
  antwoord('');
  await vast.click();
  await expect(page.locator('#fact-inhoud > div').filter({ has: vast })).toContainText('Vast maandbedrag (excl. btw): geen', { timeout: 15000 });
  await naarSub('facturen');
  await page.locator('.fact-open[data-id="' + fid + '"]').click();
  await page.locator('#fact-herbereken').click();
  await expect(page.locator('#fact-inhoud')).toContainText('Kan nog niet definitief', { timeout: 15000 });
  const fid2 = (await facturen()).find((f) => f.status === 'concept').id;
  const def1 = await api('POST', '/mna/admin/facturatie/factuur/' + fid2 + '/definitief', { adminKey: ADMIN, body: {} });
  expect(def1.status, 'geblokkeerd concept niet definitief').toBe(409);

  // 5. Opnieuw instellen, herberekenen, definitief maken in de UI.
  await page.locator('#fact-terug').click();
  await naarSub('kantoren');
  antwoord('500', PERIODE + '-01', '', 'Abonnement Synth');
  await vast.click();
  await expect(page.locator('#fact-inhoud > div').filter({ has: vast })).toContainText('500,00', { timeout: 15000 });
  await naarSub('facturen');
  const conceptNu = (await facturen()).find((f) => f.status === 'concept');
  await page.locator('.fact-open[data-id="' + conceptNu.id + '"]').click();
  await page.locator('#fact-herbereken').click();
  await expect(page.locator('#fact-inhoud')).not.toContainText('Kan nog niet definitief', { timeout: 15000 });
  const conceptDef = (await facturen()).find((f) => f.status === 'concept');
  if (conceptDef.id !== conceptNu.id) { await page.locator('#fact-terug').click(); await page.locator('.fact-open[data-id="' + conceptDef.id + '"]').click(); }
  antwoord(true);
  await page.locator('#fact-definitief').click();
  await expect(page.locator('#fact-pdf')).toBeVisible({ timeout: 20000 });
  const defin = (await facturen()).find((f) => f.id === conceptDef.id);
  expect(defin.status, 'definitief').toBe('definitief');
  expect(defin.nummer, 'nummer toegekend').toBeTruthy();

  // 6. PDF downloaden.
  const dl = page.waitForEvent('download');
  await page.locator('#fact-pdf').click();
  const pad = await (await dl).path();
  const pdf = fs.readFileSync(pad);
  expect(pdf.subarray(0, 4).toString(), 'PDF-bestand').toBe('%PDF');

  // 7. Crediteren: creditnota spiegelt de vaste regel exact.
  antwoord('Synth correctie', false, true);
  await page.locator('#fact-crediteer').click();
  await expect.poll(async () => (await facturen()).filter((f) => f.soort === 'creditnota').length, { timeout: 20000 }).toBe(1);
  const credit = (await facturen()).find((f) => f.soort === 'creditnota');
  const cd = await api('GET', '/mna/admin/facturatie/factuur/' + credit.id, { adminKey: ADMIN });
  const cv = cd.json.factuur.regels.find((r) => r.soort === 'vast');
  expect(cv && cv.bedrag, 'creditregel vast = -500').toBe(-500);
});
