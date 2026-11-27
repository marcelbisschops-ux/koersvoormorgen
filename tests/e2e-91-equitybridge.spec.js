// #91 B1 (13-11-2026): equity bridge in de echte begeleidersweergave tegen STAGING. Synthetisch traject met twee
// kolommenbalansjaren → "Voorstellen uit de kolommenbalans" → goedkeuren met motivering → bridge-overzicht klopt →
// overname in de dealvoorstelvelden (zelfde functie als het venster) → opbrengst-brug telt de bridge. Geen AI; ruimt op.
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, IS_STAGING_WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
const kb = (f) => ['Rekening;Omschrijving;Debet;Credit', '0100;Inventaris;' + f(20000) + ';', '0200;Aandelenkapitaal;;' + f(18000), '0250;Privé-onttrekkingen;' + f(99900) + ';',
  '0600;Lening bank;;' + f(50000), '1000;Kas;' + f(1500) + ';', '1100;Bank;' + f(40000) + ';', '1300;Debiteuren;' + f(60000) + ';', '1600;Crediteuren;;' + f(15000),
  '1700;Omzetbelasting af te dragen;;' + f(12000), '4000;Salarissen;' + f(300000) + ';', '4100;Huur kantoorpand;' + f(36000) + ';', '4200;Autokosten;' + f(12000) + ';',
  '4300;Kantoorkosten;' + f(18000) + ';', '4800;Afschrijving inventaris;' + f(5000) + ';', '4900;Rentelasten;' + f(2500) + ';', '8000;Omzet advieswerk;;' + f(500000), '9999;Diversen;' + f(100) + ';'].join('\n');
const nl = (n) => n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// N-120 batch F: VID = traject-ID (opruimen/D1), V = verkoper-inlogcode (legacy = traject-ID).
let VID, V, T;
// VOK-versie uit de bron (zelfde aanpak als e2e-ui), zodat de begeleider niet achter het VOK-venster blijft hangen.
const VOK_VERSIE = (() => { try { const m = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/); return (m && m[1]) || '1.5'; } catch { return '1.5'; } })();

test.beforeAll(async () => {
  test.setTimeout(120000);
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Equity Bridge B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'delivered@resend.dev' } });
  VID = c.json && c.json.code; V = c.json && (c.json.verkoper_inlogcode || c.json.code); T = c.json && c.json.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK_VERSIE, email: 'delivered@resend.dev' } });
  for (const [jaar, factor] of [[2023, 0.95], [2024, 1]]) {
    const csv = kb((x) => nl(Math.round(x * factor * 100) / 100));
    await api('POST', '/mna/kolommenbalans/upload', { body: { code: V, jaar, bestand_naam: 'kb-' + jaar + '.csv', inhoud_base64: Buffer.from(csv).toString('base64') } });
  }
  const B = { 'x-tussen-key': T };
  for (const j of (await api('GET', '/mna/kolommenbalans?code=' + T, { headers: B })).json.jaren) {
    await api('POST', '/mna/kolommenbalans/toewijzen', { headers: B, body: { code: T, jaar: j.jaar, rekening: '9999', categorie: 'overig_resultaat', rev: j.rev } });
  }
});
test.afterAll(async () => { if (V) await ruimTrajectOp(VID, ADMIN); });

test('equity bridge: voorstellen, goedkeuren, overzicht en overname in het dealvoorstel', async ({ page }) => {
  test.setTimeout(150000);
  expect(V && T, 'traject aangemaakt').toBeTruthy();
  page.on('dialog', (d) => d.accept());
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'financieel'); renderApp(); });
  const paneel = page.locator('#fin-panel');
  await expect(paneel).toContainText('Equity bridge', { timeout: 20000 });
  await paneel.getByRole('button', { name: 'Voorstellen uit de kolommenbalans' }).click();
  await expect(paneel).toContainText('4 nieuw', { timeout: 20000 });
  for (const t of ['Langlopende schulden 2024', 'Liquide middelen 2024', 'Werkkapitaal 2024', 'Normaal werkkapitaal (gemiddelde 2023–2024)']) await expect(paneel).toContainText(t);
  // Alle vier goedkeuren via de UI (per post: status, motivering, Vastleggen).
  for (let i = 0; i < 4; i++) {
    const id = await page.evaluate(() => { const p = (FIN.data.equity_posten || []).find((x) => x.status === 'voorstel'); return p && p.id; });
    expect(id, 'nog een voorstel om goed te keuren').toBeTruthy();
    await page.locator('#fin-eq-st-' + id).selectOption('goedgekeurd');
    await page.locator('#fin-eq-mo-' + id).fill('Gecontroleerd tegen de jaarrekening 2024');
    await page.locator('button[onclick="finEqBeoordeel(this)"][data-id="' + id + '"]').click();
    await expect.poll(() => page.evaluate((x) => (FIN.data.equity_posten.find((p) => p.id === x) || {}).status, id), { timeout: 15000 }).toBe('goedgekeurd');
  }
  const b = await page.evaluate(() => FIN.data.equity_bridge);
  expect(b.netto_schuld).toBe(8500);                 // 50.000 − 41.500
  expect(b.werkkapitaal_normaal).toBe(32175);        // (31.350 + 33.000) / 2
  expect(b.werkkapitaal_correctie).toBe(825);        // 33.000 − 32.175
  expect(b.aftrek_totaal).toBe(7675);                // 8.500 − 825
  expect(b.ontbreekt).toEqual([]);
  await expect(paneel).toContainText('Af te trekken van de ondernemingswaarde');
  // Overname in de dealvoorstelvelden met dezelfde functie als het venster (mna/04 roept finDealvoorstelHint aan).
  const r = await page.evaluate(async () => {
    const w = document.createElement('div');
    w.innerHTML = '<input id="dv-nettoschuld" value="0"><input id="dv-debtlike" value="0"><input id="dv-wccorr" value="0"><input id="dv-ebitda-bewezen" value="0"><div id="dv-fin-hint"></div>';
    document.body.appendChild(w);
    finDealvoorstelHint(document.getElementById('dv-fin-hint'));
    for (let i = 0; i < 100 && !document.querySelector('#dv-fin-hint [data-eq-auto]'); i++) await new Promise((z) => setTimeout(z, 100));
    const auto = !!document.querySelector('#dv-fin-hint [data-eq-auto]'); // volledige bridge + lege velden → automatisch overgenomen
    const e = document.getElementById('dv-nettoschuld');
    const bron = e.getAttribute('data-bron') === 'equitybridge' && e.value === e.getAttribute('data-bron-waarde') ? 'equitybridge' : 'handmatig';
    const out = { auto, ns: e.value, dl: document.getElementById('dv-debtlike').value, wc: document.getElementById('dv-wccorr').value, bron };
    e.value = '9000';
    out.bronNaWijziging = e.getAttribute('data-bron') === 'equitybridge' && e.value === e.getAttribute('data-bron-waarde') ? 'equitybridge' : 'handmatig';
    w.remove();
    return out;
  });
  expect(r).toEqual({ auto: true, ns: '8500', dl: '0', wc: '-825', bron: 'equitybridge', bronNaWijziging: 'handmatig' });
});
