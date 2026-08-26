// ══════════════════════════════════════════════════════════════════
// Koers voor Morgen — End-to-end UI-tests (Deel B, Playwright)
//
// Draait tegen lokale mna.html (static-server op :8799) + de LIVE worker.
// Drie groepen:
//   1. Rekenkern      — pure dealvoorstel-functies, exacte waarden (geen kosten)
//   2. Login & rollen  — eigen tijdelijk testtraject (verkoper + begeleider), foutpad
//   3. Dashboard-gating — module "contracten" uit → documentknoppen vergrendeld
//
// Groep 2 en 3 maken hun eigen testdata via de worker-API en ruimen die aan het
// eind volledig op. Beide vereisen een admin-key (ADMIN_KEY env of --key=);
// anders worden ze overgeslagen. Er wordt GEEN vast demodossier meer gebruikt —
// eerder draaide dit op het De Vries-dossier (UZ24377), maar dat traject is
// niet meer beschikbaar en hoeft niet opnieuw aangemaakt te worden.
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { api, leesAdminKey } from './lib.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';

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
// Het foutpad heeft geen testtraject nodig en draait altijd.
test.describe('Login — foutpad', () => {
  test('ongeldige code toont foutmelding', async ({ page }) => {
    await login(page, 'ZZZZ9999');
    await expect(page.locator('#l-err')).toBeVisible({ timeout: 10000 });
  });
});

// De rollen-tests (verkoper/begeleider-weergave) hebben een echt traject nodig.
// Maakt een eigen adviseur + traject (module "contracten" AAN, zodat alle zes
// documentknoppen actief horen te zijn) en ruimt alles aan het eind weer op —
// zelfde patroon als de module-gating-groep hieronder. Overgeslagen zonder
// admin-key.
test.describe('Login en rollen (eigen testtraject)', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — rollen-test overgeslagen');

  let email, gid, verkoperCode, tussenCode;

  test.beforeAll(async () => {
    email = 'e2e-ui-rollen-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E Rollen', bedrijf: 'E2E Rollen BV', email } });
    gid = uit.json.id;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    // Limiet 1, alle modules aan (dit is de rollen-test, geen gating-test)
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true } } });
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E Rollen Kantoor BV', traject_type: 'Verkoop' } } });
    verkoperCode = c.json.code;
    tussenCode = c.json.tussen_code;
    // Verwerkersovereenkomst vooraf tekenen, anders blokkeert de VOK-popup het dashboard.
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: '1.2', email } });
  });

  test.afterAll(async () => {
    if (verkoperCode) await api('POST', '/admin/delete/mna/' + verkoperCode, { adminKey: ADMIN });
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
  });

  test('verkoper-code opent verkopersweergave', async ({ page }) => {
    await login(page, verkoperCode);
    await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 });
    const rol = await page.evaluate(() => S.rol);
    expect(rol).toBe('verkoper');
    // Verkoper ziet géén begeleider-documentknoppen
    await expect(page.locator('#bg-nda-actie')).toHaveCount(0);
  });

  test('begeleider-code opent dashboard met alle documentknoppen', async ({ page }) => {
    await login(page, tussenCode);
    await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
    // Alle zeven documentknoppen aanwezig en (module contracten AAN) actief
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
    // Verwerkersovereenkomst vooraf tekenen, anders blokkeert de VOK-popup het dashboard.
    // LET OP: versie moet gelijk zijn aan VOK_VERSIE in mna/04-begeleider-dashboard.js — anders
    // wordt de popup (terecht) opnieuw getoond en faalt deze test.
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: '1.2', email } });
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

// ───────────────────── 4. CROSS-ENTITEIT DATABEVEILIGING ─────────────────────
// Regressietest voor de save-race-bug (18 augustus 2026): saveCurrent() las de
// data pas uit op het moment dat de 800ms-debounce-timer afging, niet op het
// moment van aanroepen. Wisselde je binnen die 800ms van entiteit (via de
// "Invullen voor"-kiezer), dan verstuurde de vertraagde save de cijfers van de
// inmiddels actieve entiteit, gelabeld met het entiteit_id van de vorige — de
// twee entiteiten kregen zo elkaars cijfers. Fix: saveCurrent() legt de data nu
// synchroon vast (snapshot) bij aanroepen, niet pas bij het afgaan van de timer.
//
// Mutation-waarden (111111/222222, geen realistische bedragen als 950.000/
// 620.000) zodat besmetting tussen de twee entiteiten onmogelijk te missen is.
test.describe('Cross-entiteit databeveiliging (regressie 18 aug 2026)', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — cross-entiteit-test overgeslagen');

  let email, gid, verkoperCode, tussenCode, noordId, zuidId;

  test.beforeAll(async () => {
    email = 'e2e-ui-crossentiteit-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E CrossEntiteit', bedrijf: 'E2E CrossEntiteit BV', email } });
    gid = uit.json.id;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true } } });
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E CrossEntiteit Kantoor BV', traject_type: 'Verkoop' } } });
    verkoperCode = c.json.code;
    tussenCode = c.json.tussen_code;
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: '1.2', email } });

    // begeleiderOfVerkoperAuth vereist bij een begeleidercode expliciet de x-tussen-key-header
    // (verkoper-/traject-id zelf is impliciet toegestaan, tussen_code niet — zie begeleiderAuth()
    // in cloudflare-worker.js). Zonder deze header faalt dit stil met 401, blijven noordId/zuidId
    // undefined, en loopt de test pas later vast op de wachttijd voor S._entiteiten.
    const eNoord = await api('POST', '/mna/entiteiten/' + tussenCode, { headers: { 'x-tussen-key': tussenCode }, body: { naam: 'E2E Regressie Noord B.V.', kvk: '95000001' } });
    noordId = eNoord.json && eNoord.json.id;
    const eZuid = await api('POST', '/mna/entiteiten/' + tussenCode, { headers: { 'x-tussen-key': tussenCode }, body: { naam: 'E2E Regressie Zuid B.V.', kvk: '95000002' } });
    zuidId = eZuid.json && eZuid.json.id;
    if (!noordId || !zuidId) {
      throw new Error('Entiteiten niet aangemaakt in beforeAll — Noord: ' + JSON.stringify(eNoord.json) + ' · Zuid: ' + JSON.stringify(eZuid.json));
    }
  });

  test.afterAll(async () => {
    if (verkoperCode) await api('POST', '/admin/delete/mna/' + verkoperCode, { adminKey: ADMIN });
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
  });

  test('snel wisselen van entiteit tijdens invullen mag data niet bij de verkeerde entiteit opslaan', async ({ page }) => {
    await login(page, tussenCode);
    await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
    // loadEntiteiten() (aangeroepen tijdens login) is een aparte, niet-afgewachte fetch — expliciet
    // wachten tot beide testentiteiten geladen zijn vóórdat we naar de fase navigeren, anders is de
    // "Invullen voor"-kiezer (die alleen rendert als S._entiteiten al gevuld is) een race conditie.
    await page.waitForFunction(() => window.S && Array.isArray(S._entiteiten) && S._entiteiten.length >= 2, null, { timeout: 15000 });

    await page.evaluate(() => openBegeleiderFase('financieel'));
    await page.waitForFunction(() => window.S && S.screen === 'main', null, { timeout: 15000 });
    await page.waitForSelector('#df_omzet3', { timeout: 15000 });

    // Default moet al op de eerste werkmaatschappij staan (fix "entiteiten vóór groep", 18 aug 2026).
    const actiefBijStart = await page.evaluate(() => S._actieveEntiteit);
    expect(actiefBijStart).toBe(noordId);

    // Noord invullen, meteen wisselen — NIET wachten op de 800ms-debounce.
    await page.locator('#df_omzet3').fill('111111');
    await page.locator('#entiteit-kiezer-form').selectOption(zuidId);

    // Zuid invullen, meteen terugwisselen — weer geen wachttijd.
    await page.locator('#df_omzet3').fill('222222');
    await page.locator('#entiteit-kiezer-form').selectOption(noordId);

    // Nu pas wachten tot alle gedebouncede saves (elk 800ms) daadwerkelijk zijn voltooid.
    await page.waitForTimeout(2000);

    // Verifiëren via een verse API-fetch, niet via in-memory state (die kan toevallig kloppen
    // terwijl de database alsnog het verkeerde cijfer kreeg).
    const terug = await api('POST', '/mna/traject/' + verkoperCode, { body: {} });
    const rijen = (terug.json && terug.json.data) || [];
    const rijNoord = rijen.find(r => r.fase_id === 'financieel' && r.entiteit_id === noordId);
    const rijZuid = rijen.find(r => r.fase_id === 'financieel' && r.entiteit_id === zuidId);
    expect(rijNoord, 'Noord-rij niet gevonden').toBeTruthy();
    expect(rijZuid, 'Zuid-rij niet gevonden').toBeTruthy();
    const djNoord = typeof rijNoord.data_json === 'string' ? JSON.parse(rijNoord.data_json) : rijNoord.data_json;
    const djZuid = typeof rijZuid.data_json === 'string' ? JSON.parse(rijZuid.data_json) : rijZuid.data_json;

    expect(djNoord.omzet3 && djNoord.omzet3.value).toBe('111111');
    expect(djZuid.omzet3 && djZuid.omzet3.value).toBe('222222');
  });
});

// ───────────────────── 5. GELIJKTIJDIGE MULTI-UPLOAD ─────────────────────
// Regressietest voor de batchupload-bug (juli 2026): bij meerdere bestanden
// tegelijk selecteren liep gedeelde state (S._conflicts) door elkaar en konden
// meerdere conflict-dialogen tegelijk opstapelen (zwart scherm). Inmiddels
// gefixt door bestanden sequentieel te verwerken (uploadDocumentenSequentieel)
// + een wachtrij voor conflict-dialogen (S._conflictWachtrij). Deze test
// simuleert exact het oorspronkelijke scenario: één multi-file-select met
// bestanden die elkaar tegenspreken.
//
// Bewust GEEN echte AI-documenten (kost geld, niet-deterministisch) — de drie
// testbestanden zijn CSV's in het "veld,waarde"-formaat, dat de worker 100%
// deterministisch parst zonder AI-aanroep (zie backend/worker/14-document-
// upload-analyse.js). Ze geven bewust een oplopend afwijkend cijfer voor
// dezelfde jaaromzet (boekjaar 2025), zodat bestand 2 conflicteert met
// bestand 1 én bestand 3 conflicteert met bestand 2 — twee conflict-dialogen
// die vlak na elkaar zouden willen openen.
test.describe('Gelijktijdige multi-upload', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — multi-upload-test overgeslagen');

  let email, gid, verkoperCode, tussenCode, tmpDir;

  test.beforeAll(async () => {
    email = 'e2e-ui-multiupload-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E MultiUpload', bedrijf: 'E2E MultiUpload BV', email } });
    gid = uit.json.id;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true } } });
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E MultiUpload Kantoor BV', traject_type: 'Verkoop' } } });
    verkoperCode = c.json.code;
    tussenCode = c.json.tussen_code;
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: '1.2', email } });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-multiupload-'));
    const inhoud = (omzet) => `veld,waarde\nomzet,${omzet}\nboekjaar,2025\n`;
    fs.writeFileSync(path.join(tmpDir, 'doc1.csv'), inhoud(1000000));
    fs.writeFileSync(path.join(tmpDir, 'doc2.csv'), inhoud(1200000));
    fs.writeFileSync(path.join(tmpDir, 'doc3.csv'), inhoud(1500000));
  });

  test.afterAll(async () => {
    if (verkoperCode) await api('POST', '/admin/delete/mna/' + verkoperCode, { adminKey: ADMIN });
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('drie bestanden tegelijk: geen dropped bestand, dialogen stapelen niet op', async ({ page }) => {
    await login(page, verkoperCode);
    await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 });
    await page.evaluate(() => {
      S.screen = 'main';
      var fi = FASES.findIndex(function (f) { return f.id === 'financieel'; });
      S.fase = fi >= 0 ? fi : 0;
      renderApp();
    });

    const input = page.locator('input[type="file"][multiple]');
    await input.setInputFiles([
      path.join(tmpDir, 'doc1.csv'),
      path.join(tmpDir, 'doc2.csv'),
      path.join(tmpDir, 'doc3.csv'),
    ]);

    // Alle drie bestanden verwerkt (sequentieel) — status-tekst is dan weer leeg.
    await page.waitForFunction(() => {
      var el = document.getElementById('upload-status-financieel');
      return el && el.textContent === '';
    }, null, { timeout: 30000 });

    // Geen enkel bestand kwijtgeraakt (het oorspronkelijke batchupload-bug-symptoom).
    const aantalDocs = await page.evaluate(() => (DOCS['financieel'] || []).length);
    expect(aantalDocs).toBe(3);

    // Twee echte conflicten verwacht (doc2 vs doc1, doc3 vs doc2) — maar nooit meer dan
    // één dialoog gelijktijdig op het scherm; de tweede moet in de wachtrij staan (of iets later
    // alsnog verschijnen als de eigen 300ms-timer nog niet was afgevuurd toen de eerste al openging).
    // Race-conditie-fix (26 juli 2026, herzien na een tweede, live-productie-flake): eerder wachtte
    // deze test EERST op _conflictWachtrij.length>=1 vóórdat de dialoog gecheckt werd. Dat neemt aan
    // dat doc2's dialoog-timer altíjd eerder vuurt dan doc3's — in theorie zo (doc2 wordt eerder
    // gescheduled, sequentieel vóór doc3), maar bij variabele productie-latency (echte fetch-
    // round-trips naar de live worker, i.p.v. lokale timing) bleek dat niet hard genoeg gegarandeerd.
    // Nu: direct wachten op de zichtbare dialoogtekst zelf (ongeacht via welk pad — meteen getoond
    // of via de wachtrij), en pas ná het wegklikken van de eerste controleren dat de wachtrij leeg is.
    // Dat test dezelfde garantie (geen dropped/gestapelde dialogen) zonder aanname over vuurvolgorde.
    await expect(page.getByText('Afwijkende waarden gevonden')).toHaveCount(1, { timeout: 10000 });

    // Eerste dialoog wegklikken → de tweede (al in de wachtrij, of alsnog net op tijd) moet nu verschijnen.
    await page.getByRole('button', { name: 'Alles behouden' }).click();
    await expect(page.getByText('Afwijkende waarden gevonden')).toHaveCount(1, { timeout: 10000 });
    let wachtrijLengte = await page.evaluate(() => (S._conflictWachtrij || []).length);
    expect(wachtrijLengte).toBe(0);

    // Tweede dialoog ook wegklikken → alles opgelost, geen dialoog meer over.
    await page.getByRole('button', { name: 'Alles behouden' }).click();
    await expect(page.getByText('Afwijkende waarden gevonden')).toHaveCount(0);
    const dialoogOpen = await page.evaluate(() => !!S._conflictDialoogOpen);
    expect(dialoogOpen).toBe(false);
  });
});
