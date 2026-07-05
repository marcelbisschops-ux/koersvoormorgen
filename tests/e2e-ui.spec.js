// ══════════════════════════════════════════════════════════════════
// KantoorInzicht — End-to-end UI-tests (Deel B, Playwright)
//
// Draait tegen lokale mna.html (static-server op :8799) + de LIVE worker.
// Drie groepen:
//   1. Rekenkern      — pure dealvoorstel-functies, exacte waarden (geen kosten)
//   2. Login & rollen  — De Vries-demodossier (verkoper + begeleider), foutpad
//   3. Dashboard-gating — module "contracten" uit → documentknoppen vergrendeld
//
// De gating-groep maakt eigen testdata via de worker-API en ruimt die op.
// Vereist een admin-key (ADMIN_KEY env of --key=); anders wordt die groep
// overgeslagen. Raakt NOOIT De Vries (UZ24377).
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { api, leesAdminKey } from './lib.mjs';

const DE_VRIES_VERKOPER = 'UZ24377';
const DE_VRIES_TUSSEN = 'T2E5YTHA';
const ADMIN = leesAdminKey();

async function login(page, code) {
  await page.goto('/mna.html');
  await page.locator('#l-code').fill(code);
  await page.locator('#l-btn').click();
}

// ───────────────────── 1. REKENKERN ─────────────────────
// De dealvoorstel-berekeningen zijn de commerciële kern: één foute wijziging
// hier zet verkeerde bedragen in een echt voorstel. Deze tests draaien de
// pure functies met bekende input en asserten de exacte uitkomst.
test.describe('Rekenkern dealvoorstel', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/mna.html'); });

  test('closing en earn-up exact', async ({ page }) => {
    const r = await page.evaluate(() => dvBerekenClosing({
      ebitdaBewezen: 310000, multipleBasis: 4.5, multipleBovengrens: 5.5,
      ebitdaPrognose: 403000, belangPct: 51
    }));
    expect(r.evBasis).toBe(1395000);            // 310.000 × 4,5
    expect(r.deelKoperBasis).toBe(711450);       // × 51%
    expect(r.evPrognose).toBe(2216500);          // 403.000 × 5,5
    expect(Math.round(r.earnUp)).toBe(418965);   // koperdeel prognose − koperdeel basis
  });

  test('prijsmechanisme: cliff, interpolatie en bovengrens', async ({ page }) => {
    const s = await page.evaluate(() => dvBerekenPrijsmechanisme({
      ebitdaBewezen: 310000, ebitdaPrognose: 403000, belangPct: 51,
      cliffPct: 70, multipleBasis: 4.5, multipleBovengrens: 5.5
    }));
    expect(s[0].multiple).toBe(4.5);                 // onder de cliff → basis-multiple
    expect(s[1].multiple).toBeCloseTo(5.0, 6);       // halverwege → lineair 5,0
    expect(s[2].multiple).toBe(5.5);                 // prognose gehaald → bovengrens
    expect(s[2].ev).toBe(2216500);                   // 403.000 × 5,5
  });

  test('buy-and-build: instelbare aannames werken door (regressie #13)', async ({ page }) => {
    const basis = {
      belangPct: 51, horizonJaren: 5, multipleBovengrens: 5.5, baPlatformMultipleMax: 9.5,
      baOvernamesPerJaar: 2, baOmvangEbitda: 1400000, baAcqMultiple: 5.5
    };
    const laatste = { ebitda: 400000, nettoSchuld: 600000 };
    const [standaard, aangepast] = await page.evaluate(([b, l]) => {
      const p1 = Object.assign({}, b, { baAcqSchuldPct: 55, baAflossingPct: 15 });
      const p2 = Object.assign({}, b, { baAcqSchuldPct: 70, baAflossingPct: 5 });
      return [dvBerekenBuyAndBuild(p1, l)[0], dvBerekenBuyAndBuild(p2, l)[0]];
    }, [basis, laatste]);
    expect(standaard.groepsEbitda).toBe(3200000);    // 400k + 2×1,4M
    expect(standaard.nettoSchuld).toBe(8980000);     // 55%-schuld, 15%-aflossing
    expect(aangepast.nettoSchuld).toBe(11350000);    // 70%-schuld, 5%-aflossing → hoger
  });
});

// ───────────────────── 2. LOGIN & ROLLEN ─────────────────────
test.describe('Login en rollen (De Vries-demodossier)', () => {
  test('ongeldige code toont foutmelding', async ({ page }) => {
    await login(page, 'ZZZZ9999');
    await expect(page.locator('#l-err')).toBeVisible({ timeout: 10000 });
  });

  test('verkoper-code opent verkopersweergave', async ({ page }) => {
    await login(page, DE_VRIES_VERKOPER);
    await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 });
    const rol = await page.evaluate(() => S.rol);
    expect(rol).toBe('verkoper');
    // Verkoper ziet géén begeleider-documentknoppen
    await expect(page.locator('#bg-nda-actie')).toHaveCount(0);
  });

  test('begeleider-code opent dashboard met alle documentknoppen', async ({ page }) => {
    await login(page, DE_VRIES_TUSSEN);
    await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
    // Alle zes documentknoppen aanwezig en (De Vries heeft geen adviseur → contractenAan) actief
    for (const id of ['bg-nda-actie', 'bg-loi-actie', 'bg-bem-actie', 'bg-excl-actie', 'bg-dealvoorstel-actie', 'bg-bieding-actie', 'bg-spa-actie']) {
      await expect(page.locator('#' + id)).toBeVisible();
      await expect(page.locator('#' + id)).toBeEnabled();
    }
  });
});

// ───────────────────── 3. DASHBOARD MODULE-GATING ─────────────────────
// Maakt een eigen testtraject via een adviseur met module "contracten" UIT,
// logt in met de tussen-code en verifieert dat de documentknoppen vergrendeld
// (disabled) zijn. Ruimt alle testdata op. Overgeslagen zonder admin-key.
test.describe('Documentknoppen module-gating', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — gating-test overgeslagen');

  let email, gid, tussenCode, trajectCode;
  const WW = 'TestWachtwoord123!';

  test.beforeAll(async () => {
    email = 'e2e-ui-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E UI', bedrijf: 'E2E UI BV', email } });
    gid = uit.json.id;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    // AV + Gebruiksvoorwaarden accepteren (verplicht sinds 5 juli 2026, anders blokkeert /adviseur/create)
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    // Limiet 1, module traject AAN maar contracten UIT
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: false } } });
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E UI Gating Kantoor BV', traject_type: 'Verkoop' } } });
    trajectCode = c.json.code;
    tussenCode = c.json.tussen_code;
    // Verwerkersovereenkomst vooraf tekenen, anders blokkeert de VOK-popup het dashboard
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: '1.1', email } });
  });

  test.afterAll(async () => {
    if (trajectCode) await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
  });

  test('module contracten uit → documentknoppen vergrendeld', async ({ page }) => {
    await login(page, tussenCode);
    await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
    // Knoppen bestaan maar zijn disabled (vergrendelde variant)
    for (const id of ['bg-nda-actie', 'bg-dealvoorstel-actie', 'bg-bieding-actie', 'bg-spa-actie']) {
      await expect(page.locator('#' + id)).toBeVisible();
      await expect(page.locator('#' + id)).toBeDisabled();
    }
  });
});
