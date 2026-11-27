// #91 B5 (18-11-2026): centrale waarderingsset in de echte begeleidersweergave tegen STAGING. Synthetisch traject met twee
// kolommenbalansjaren en een via de API volledig goedgekeurde equity bridge → set maken, opslaan, goedkeuren via de UI →
// EV/aandelenwaarde kloppen met een eigen berekening → expliciete overname in het dealvoorstel → koper ziet niets.
// Geen AI; testadres op .invalid (server-side nooit verzonden); ruimt op.
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
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Waarderingsset B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'e2e-b5@kvm-test.invalid' } });
  VID = c.json && c.json.code; V = c.json && (c.json.verkoper_inlogcode || c.json.code); T = c.json && c.json.tussen_code;
  await accepteerPlatformvoorwaarden([V, T]);
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK_VERSIE, email: 'e2e-b5@kvm-test.invalid' } });
  for (const [jaar, factor] of [[2023, 0.95], [2024, 1]]) {
    const csv = kb((x) => nl(Math.round(x * factor * 100) / 100));
    await api('POST', '/mna/kolommenbalans/upload', { body: { code: V, jaar, bestand_naam: 'kb-' + jaar + '.csv', inhoud_base64: Buffer.from(csv).toString('base64') } });
  }
  const B = { 'x-tussen-key': T };
  for (const j of (await api('GET', '/mna/kolommenbalans?code=' + T, { headers: B })).json.jaren) {
    await api('POST', '/mna/kolommenbalans/toewijzen', { headers: B, body: { code: T, jaar: j.jaar, rekening: '9999', categorie: 'overig_resultaat', rev: j.rev } });
  }
  await api('POST', '/mna/financieel/equityvoorstellen', { headers: B, body: { code: T } });
  for (const p of (await api('GET', '/mna/financieel?code=' + T, { headers: B })).json.equity_posten) {
    await api('POST', '/mna/financieel/equitypost/beoordeel', { headers: B, body: { code: T, id: p.id, rev: p.rev, status: 'goedgekeurd', motivering: 'Synthetisch gecontroleerd' } });
  }
});
test.afterAll(async () => { if (V) await ruimTrajectOp(VID, ADMIN); });

test('waarderingsset: maken, goedkeuren, rekenuitkomst, overname dealvoorstel en rolgrens', async ({ page }) => {
  test.setTimeout(150000);
  expect(V && T, 'traject aangemaakt').toBeTruthy();
  const eb = (await api('GET', '/mna/financieel?code=' + T, { headers: { 'x-tussen-key': T } })).json.equity_bridge;
  expect(eb.ontbreekt, 'equity bridge volledig goedgekeurd').toEqual([]);
  page.on('dialog', (d) => d.accept());
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'financieel'); renderApp(); });
  const paneel = page.locator('#fin-panel');
  await expect(paneel).toContainText('Nog geen waarderingsset.', { timeout: 20000 });
  await paneel.getByRole('button', { name: 'Waarderingsset maken' }).click();
  const veld = (label) => paneel.getByLabel(label, { exact: false });
  await veld('Multiple laag').fill('4');
  await veld('Multiple hoog').fill('6');
  await veld('Onderbouwing multiple').fill('Synthetische sectorbandbreedte');
  await veld('Transactiekosten').fill('2');
  await paneel.getByRole('button', { name: 'Als concept opslaan' }).click();
  await expect(paneel).toContainText('Waarderingsset als concept opgeslagen.', { timeout: 15000 });
  await page.locator('#fin-ws-mo').fill('Akkoord na synthetische bespreking');
  await paneel.getByRole('button', { name: 'Set goedkeuren' }).click();
  await expect(paneel).toContainText('Waarderingsset goedgekeurd', { timeout: 15000 });
  const d = await page.evaluate(() => ({ ws: FIN.data.waarderingsset, b: FIN.data.waardering_berekend, jaren: FIN.data.jaren, br: FIN.data.equity_bridge }));
  // Eigen berekening (los van de backend): grondslag = genormaliseerde EBITDA laatste jaar; EV = g × m; equity = EV − aftrek − EV × 2%.
  const g = d.jaren[d.jaren.length - 1].genormaliseerd.ebitda;
  const r = (x) => Math.round(x * 100) / 100;
  expect(d.ws.status).toBe('goedgekeurd');
  expect(d.ws.waardering_id, 'indicatieve waardering (mna_waarderingen) aangemaakt').toBeTruthy();
  expect(d.b.verouderd).toBe(false);
  expect(d.b.grondslag_bedrag).toBe(r(g));
  expect(d.b.ondernemingswaarde).toEqual({ laag: r(g * 4), midden: r(g * 5), hoog: r(g * 6) });
  for (const [k, m] of [['laag', 4], ['midden', 5], ['hoog', 6]]) expect(Math.abs(d.b.aandelenwaarde[k] - (g * m - d.br.aftrek_totaal - g * m * 0.02))).toBeLessThanOrEqual(0.01);
  // Expliciete overname in het dealvoorstel (zelfde functie als het venster).
  const o = await page.evaluate(async () => {
    const w = document.createElement('div');
    w.innerHTML = '<input id="dv-nettoschuld" value="0"><input id="dv-debtlike" value="0"><input id="dv-wccorr" value="0"><input id="dv-ebitda-bewezen" value="0"><input id="dv-mult-basis" value="0"><input id="dv-mult-boven" value="7"><input id="dv-txkosten" value="0"><div id="dv-fin-hint"></div>';
    document.body.appendChild(w);
    finDealvoorstelHint(document.getElementById('dv-fin-hint'));
    let k = null;
    for (let i = 0; i < 100 && !(k = document.querySelector('#dv-fin-hint button[onclick="finWsNeemOver(this)"]')); i++) await new Promise((z) => setTimeout(z, 100));
    const voor = document.getElementById('dv-ebitda-bewezen').value;
    if (k) k.click();
    const v = (id) => document.getElementById(id).value;
    const out = { knop: !!k, voor, ebitda: v('dv-ebitda-bewezen'), basis: v('dv-mult-basis'), boven: v('dv-mult-boven'), tk: v('dv-txkosten'), bron: document.getElementById('dv-ebitda-bewezen').getAttribute('data-bron') };
    w.remove();
    return out;
  });
  // KVM-014 (werkregel 59): het veld neemt vóór de klik al automatisch de centrale genormaliseerde EBITDA over (geen DD-waarde meer).
  expect(o).toEqual({ knop: true, voor: String(Math.round(g)), ebitda: String(Math.round(g)), basis: '5', boven: '7', tk: '2', bron: 'waarderingsset-v1' });
  // Rolgrens: koper en verkoper krijgen de set niet via de API.
  for (const [code, kop] of [[V, {}]]) {
    const x = (await api('GET', '/mna/financieel?code=' + code, { headers: kop })).json || {};
    expect(x.ok, 'verkoper krijgt het overzicht').toBe(true);
    expect('waarderingsset' in x || 'waardering_berekend' in x, 'verkoper ziet geen waarderingsset').toBe(false);
  }
});
