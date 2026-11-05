// KVM Design 2.0 R0 (N-174) — knoppeninventaris (WP0) en vergelijking schakelaar uit/aan.
// Per rol (begeleider, verkoper, koper) en per scherm: alle zichtbare knoppen, links, velden en selectlijsten met
// hun id, tekst (textContent, dus onafhankelijk van CSS-hoofdletters), onclick, href en menudoel. Design 2.0 mag
// in R0 alleen de weergave veranderen: de inventaris met ?ui=2 moet exact gelijk zijn aan die zonder.
// Schrijft inventaris (JSON) en screenshots (ui=2, 1440/820/390) naar KVM_R0_UIT. Alleen staging, fictieve data.
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } from './lib.mjs';
import fs from 'fs';
import path from 'path';

if (!IS_STAGING_WORKER) throw new Error('design2-inventaris draait alleen tegen staging');
const ADMIN = leesAdminKey();
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const UIT = process.env.KVM_R0_UIT || path.join(ROOT, 'tests', 'rapporten', 'design2-r0');
fs.mkdirSync(UIT, { recursive: true });
const VOK = (fs.readFileSync(path.join(ROOT, 'mna', '04-begeleider-dashboard.js'), 'utf8').match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1];
const DOM = '@e2e-test.koersvoormorgen.invalid', TS = Date.now();
let V, K, T;

async function inventaris(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#app button, #app a, #app input, #app select, #app textarea, #mt-zij [data-mt-naar]'))
    .filter((e) => !e.closest('[data-mt-verborgen]') && !e.closest('[hidden]') && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => [e.tagName, e.id || '', (e.textContent || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60), (e.getAttribute('onclick') || '').slice(0, 60), e.getAttribute('href') || '', e.getAttribute('data-mt-naar') || '', e.type || ''].join('|'))
    .sort());
}
async function login(page, code, ui) {
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e.message).slice(0, 160)));
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER) + (ui ? '&ui=2' : ''));
  await page.locator('#l-code').fill(code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 25000 });
  await page.waitForTimeout(2500);
  return fouten;
}
// Rolgebonden schermen: begeleider via het menu; verkoper via de DD-fases; koper het startscherm.
async function schermen(page, rol, foto, ui) {
  const uit = {};
  if (rol === 'begeleider') {
    await page.waitForSelector('#mt-zij', { timeout: 30000 });
    const menu = await page.$$eval('#mt-zij [data-mt-naar]', (b) => [...new Set(b.map((x) => x.getAttribute('data-mt-naar')))]);
    for (const s of menu) {
      await page.evaluate((s) => mtNaar(s), s); await page.waitForTimeout(700);
      uit[s] = await inventaris(page);
      if (foto) await foto(rol + '-' + s);
    }
  } else if (rol === 'verkoper') {
    uit.start = await inventaris(page); if (foto) await foto(rol + '-start');
    const fases = await page.evaluate(() => FASES.map((f) => f.id));
    for (const f of fases) {
      await page.evaluate((f) => { S.screen = 'main'; S.fase = FASES.findIndex((x) => x.id === f); renderApp(); }, f);
      // Deelpanelen per fase laden asynchroon; pas meten als het netwerk stil is (anders meet je timing, geen weergave).
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
      uit['fase-' + f] = await inventaris(page);
      if (foto && f === 'financieel') await foto(rol + '-fase-financieel');
    }
  } else {
    uit.start = await inventaris(page); if (foto) await foto(rol + '-start');
  }
  return uit;
}

test.describe('Design 2.0 R0 — inventaris uit/aan', () => {
  test.skip(!ADMIN, 'geen staging-admin-key');
  test.beforeAll(async () => {
    const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'DESIGN2-R0-' + TS + ' Synth BV', contact_naam: 'Synth Verkoper', contact_email: 'v' + TS + DOM, sector: 'accountancy', traject_type: 'Verkoop' } });
    if (!c.json || !c.json.code) throw new Error('traject aanmaken mislukt HTTP ' + c.status);
    V = c.json.code; K = c.json.koper_code; T = c.json.tussen_code;
    await accepteerPlatformvoorwaarden({ verkoper: V, koper: K, begeleider: T });
    const vok = await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie: VOK, email: 'b' + TS + DOM } });
    if (vok.status !== 200) throw new Error('VOK mislukt');
    const veld = (v, l) => ({ value: v, label: l });
    await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet1: veld('2.410.000', 'Jaaromzet jaar 1 (oudste)'), omzet2: veld('2.585.000', 'Jaaromzet jaar 2'), omzet3: veld('2.760.000', 'Jaaromzet jaar 3 (meest recent)'), ebitda: veld('612.000', 'EBITDA jaar 3 — absoluut bedrag (€)') }, checklist_json: {} } });
    for (const [i, n] of ['Synth Rivieroever Accountancy', 'Synth Polder Administratie'].entries()) await api('POST', '/mna/kandidaten/toevoegen', { headers: { 'x-tussen-key': T }, body: { code: T, naam: n, plaats: ['Arnhem', 'Lelystad'][i], omvang: ['18 fte', '11 fte'][i], contact_naam: 'Synth Contact', email: 'k' + i + TS + DOM, criteria: { werkgebied: 80 - i * 10 }, idem: 'd2r0' + i + TS } });
  });
  test.afterAll(async () => {
    if (V) { const r = await ruimTrajectOp(V, ADMIN); expect(r && r.ok, 'testtraject opgeruimd').toBe(true); }
  });

  for (const rol of ['begeleider', 'verkoper', 'koper']) {
    test('inventaris ' + rol + ': ui=2 gelijk aan ui=1, geen scriptfouten', async ({ browser }) => {
      test.setTimeout(240000);
      const code = { begeleider: T, verkoper: V, koper: K }[rol];
      const c1 = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const p1 = await c1.newPage();
      const f1 = await login(p1, code, false);
      expect(await p1.evaluate(() => document.documentElement.getAttribute('data-ui')), 'ui=1 zonder attribuut').toBe(null);
      const a = await schermen(p1, rol, null, false);
      await c1.close();
      const c2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const p2 = await c2.newPage();
      const f2 = await login(p2, code, true);
      expect(await p2.evaluate(() => document.documentElement.getAttribute('data-ui')), 'ui=2 actief').toBe('2');
      const foto = async (naam) => { await p2.evaluate(() => window.scrollTo(0, 0)); await p2.screenshot({ path: path.join(UIT, 'desktop-' + naam + '.png'), fullPage: true }); };
      const b = await schermen(p2, rol, foto, true);
      // tablet en mobiel van de hoofdschermen
      for (const [w, h, nm] of [[820, 1180, 'tablet'], [390, 844, 'mobiel']]) {
        await p2.setViewportSize({ width: w, height: h }); await p2.waitForTimeout(500);
        const doelen = rol === 'begeleider' ? ['dashboard', 'dd', 'kandidaten'] : ['start'];
        for (const s of doelen) {
          if (rol === 'begeleider') { await p2.evaluate((s) => mtNaar(s), s); await p2.waitForTimeout(600); }
          await p2.evaluate(() => window.scrollTo(0, 0));
          await p2.screenshot({ path: path.join(UIT, nm + '-' + rol + '-' + s + '.png'), fullPage: false });
          const hor = await p2.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
          fs.appendFileSync(path.join(UIT, 'horizontaal.txt'), nm + ' ' + rol + ' ' + s + ' geenHorizontaalScrollen=' + hor + '\n');
        }
      }
      await c2.close();
      fs.writeFileSync(path.join(UIT, 'inventaris-' + rol + '.json'), JSON.stringify({ ui1: a, ui2: b }, null, 1));
      const verschil = [];
      for (const s of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const x = a[s] || [], y = b[s] || [];
        const alleen1 = x.filter((e) => !y.includes(e)), alleen2 = y.filter((e) => !x.includes(e));
        if (alleen1.length || alleen2.length || x.length !== y.length) verschil.push(s + ': -' + alleen1.slice(0, 3).join(' ; ') + ' +' + alleen2.slice(0, 3).join(' ; '));
      }
      const totaal = Object.values(a).reduce((n, l) => n + l.length, 0);
      console.log(rol + ': ' + Object.keys(a).length + ' schermen, ' + totaal + ' elementen, verschillen: ' + verschil.length);
      expect(totaal, 'inventaris niet leeg').toBeGreaterThan(5);
      expect(verschil, 'verschillen in knoppen/velden tussen ui=1 en ui=2').toEqual([]);
      expect(f1.concat(f2), 'scriptfouten').toEqual([]);
    });
  }
});
