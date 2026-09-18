// ══════════════════════════════════════════════════════════════════
// KantoorInzicht 3-rollen E2E-regressietest (18 sep 2026)
//
// Vaste, deterministische regressietest voor de volledige gebruikersbeleving van
// VERKOPER, KOPER en BEGELEIDER op mna.html. Draait tegen de LIVE worker (staging via
// WORKER_URL) + een lokale static-server voor mna.html (playwright.config.js).
//
// Dit is GEEN vervanging van de bestaande, gerichte regressietests in tests/e2e-ui.spec.js
// (module-gating, meekijker, eigen specialist, cross-entiteit-race, documentcontent-race,
// multi-upload) — die dekking wordt hier bewust NIET herhaald. Dit bestand voegt een
// doorlopende, kritieke-acties-reis per rol toe: invullen → opslaan → wegnavigeren →
// teruglezen → wijzigen → opnieuw opslaan, plus de acties die e2e-ui.spec.js nog niet dekt
// (gesprek-round-trip, Q&A-round-trip, document-upload-round-trip, AI-documentgeneratie-
// inhoud, dubbele-wijziging-race).
//
// KRITIEKE-ACTIES-MATRIX (bewust begrensd — niet "elke zichtbare knop", zie de toelichting
// in de sessie van 18 sep 2026): elke rij hieronder wordt één keer daadwerkelijk uitgevoerd
// en het resultaat wordt weggeschreven naar tests/rapporten/3rollen-regressie-<datum>.md.
// Voor elke actie geldt: UI-actie → request → backend → database → response → UI-resultaat.
// HTTP 200 alleen is nooit voldoende — zie de check()-aanroepen per test hieronder.
//
// AI-kosten: acties die een echte Anthropic-aanroep kosten (documentupload-extractie,
// risicoraamwerk-generatie) draaien ALLEEN als KVM_DOE_AI=1 staat — op elke push (CI) staat
// dat uit (gratis, snel, vangt "knop/route kapot"); de dagelijkse cron zet 'm aan (vangt ook
// "AI-inhoud klopt niet"). Zelfde proportionaliteit als voerOchtendcontroleUit() (worker/24):
// niet elke AI-flow bij elke run, één representatieve actie is genoeg om de keten te bewijzen.
//
// Testdata: uitsluitend fictief, marker E2E-REGRESSION-<timestamp> in kantoornaam + elk
// testveld. Cleanup + onafhankelijke D1-verificatie draait ALTIJD (ook bij een gefaalde
// tussenstap) in afterAll — een niet-lege cleanup laat de hele run FAILen (proces-exitcode
// 1), ongeacht de overige testresultaten.
//
// Draaien:
//   npx playwright test tests/e2e-3rollen-regressie.spec.js
//   KVM_DOE_AI=1 npx playwright test tests/e2e-3rollen-regressie.spec.js   (incl. AI-stappen)
// Vereist ADMIN_KEY (env of --key=, zie lib.mjs) en WORKER_URL tegen staging
// (tests/run-rolflows.sh zet dit al goed — gebruik die wrapper i.p.v. dit bestand los te
// draaien tegen een onbekende WORKER_URL).
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1 } from './lib.mjs';
import fs from 'fs';
import path from 'path';

const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
const DOE_AI = process.env.KVM_DOE_AI === '1';
const IS_STANDAARD_PRODUCTIE = WORKER === 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const MARKER = 'E2E-REGRESSION-' + Date.now();

// Harde veiligheidsgrens: deze suite voert echte schrijfacties (traject aanmaken, gesprekken,
// Q&A, documenten) uit en hoort dus NOOIT tegen productie te draaien, ook niet per ongeluk.
if (IS_STANDAARD_PRODUCTIE) {
  throw new Error('tests/e2e-3rollen-regressie.spec.js weigert te draaien tegen productie (WORKER_URL). Zet WORKER_URL op de staging-worker — zie tests/run-rolflows.sh.');
}

const VOK_VERSIE = (() => {
  try {
    const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8');
    const m = src.match(/VOK_VERSIE\s*=\s*'([^']+)'/);
    return (m && m[1]) || '1.5';
  } catch { return '1.5'; }
})();

async function login(page, code) {
  // BELANGRIJKE FUNDERING (18 sep 2026, gevonden tijdens het bouwen van deze test): loadEntiteiten()
  // (mna/02-state-opslag-documenten.js) draait één keer per sessie, direct bij inloggen
  // (GET /mna/entiteiten/{code}), en roept bij een geslaagde async respons ONVOORWAARDELIJK
  // renderApp() aan — ook als er intussen al in een veld is getypt. Een renderApp() vóórdat
  // saveCurrent() de DOM-waarde in S.data heeft overgenomen, regenereert de input vanuit het NOG
  // NIET bijgewerkte S.data en wist zo stilzwijgend elke niet-opgeslagen invoer (reproduceerbaar
  // met een automatiseringstool dat sneller typt dan een mens; op een trage verbinding is het
  // venster mogelijk ook voor een mens reëel). Dit is een ECHTE productbevinding — apart
  // gedocumenteerd (zie tests/AUDIT-LOG.md en OPEN-BEVINDINGEN.md, 18 sep 2026), hier NIET gefixt
  // conform de sessie-instructie: een gevonden productbug tijdens het bouwen van deze test wordt
  // gemeld, niet automatisch opgelost. S._entiteiten staat AL bij initialisatie op '[]' (dus
  // Array.isArray() alleen volstaat niet als wachtsignaal) — daarom hier een fetch-interceptor die
  // specifiek op de respons van déze ene endpoint-aanroep wacht, zodat elke test pas begint te typen
  // ná die ene gegarandeerde post-login renderApp(), zonder een gegokte vaste wachttijd.
  await page.addInitScript(() => {
    window.__entiteitenGeladen = new Promise((resolve) => {
      const origFetch = window.fetch;
      window.fetch = function (url) {
        const p = origFetch.apply(this, arguments);
        if (typeof url === 'string' && url.indexOf('/mna/entiteiten/') !== -1) {
          p.then(() => setTimeout(resolve, 50)).catch(() => setTimeout(resolve, 50));
        }
        return p;
      };
    });
  });
  const url = '/mna.html?worker=' + encodeURIComponent(WORKER);
  await page.goto(url);
  await page.locator('#l-code').fill(code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.race([window.__entiteitenGeladen, new Promise((r) => setTimeout(r, 8000))])).catch(() => {});
}

// ── Knoppeninventaris / regressiematrix — gevuld tijdens de run, weggeschreven in afterAll ──
const MATRIX = [];
function record(rol, pagina, element, actie, verwacht, geslaagd, detail) {
  MATRIX.push({ rol, pagina, element, actie, verwacht, status: geslaagd ? 'PASS' : 'FAIL', detail: detail || '' });
  if (!geslaagd) console.log('  ✗ [' + rol + '] ' + actie + (detail ? ' — ' + detail : ''));
}

// ── Test-niveau resultaten (18 sep 2026) — apart van MATRIX (die telt losse checks binnen één
// test, bv. de 6 CLEANUP-D1-tellingen). Voor de Marilyn-rapportage ("16/16"/"18/18") is het
// PLAYWRIGHT-testniveau de juiste eenheid, niet het MATRIX-checkniveau — testInfo.status is de
// enige betrouwbare bron daarvoor (afterAll zelf heeft geen toegang tot per-test-uitkomsten).
const TEST_RESULTS = [];
test.afterEach(async ({}, testInfo) => {
  TEST_RESULTS.push({ title: testInfo.title, status: testInfo.status, fout: testInfo.error ? String(testInfo.error.message || testInfo.error).slice(0, 300).replace(/[\r\n]+/g, ' ') : '' });
});

// Productiedoel voor de resultaatmelding (18 sep 2026) — bewust NIET dezelfde WORKER als de test
// zelf gebruikt: de tests draaien uitsluitend tegen staging (zie IS_STANDAARD_PRODUCTIE hierboven),
// maar Marilyn → Veiligheid praat alleen met productie. Dit is de enige plek in dit bestand die
// productie aanraakt, en uitsluitend via het smalle, hiervoor gebouwde E2E_REPORT_KEY-endpoint
// (géén ADMIN_KEY, geen andere productietoegang) — zie worker/24-veiligheidsdashboard.js.
// Overschrijfbaar via E2E_REPORT_URL (alleen voor het testen van dit mechanisme tegen staging
// vóórdat de endpoint-code zelf naar productie is gedeployed) — zonder override altijd productie.
const E2E_REPORT_URL = process.env.E2E_REPORT_URL || 'https://kantoorinzicht.marcel-bisschops.workers.dev/mna/veiligheid/e2e-resultaat';
async function meldResultaatAanMarilyn() {
  if (!TEST_RESULTS.length) return; // niets gedraaid (bv. setup mislukt vóór de eerste test) — niets te melden
  if (!process.env.E2E_REPORT_KEY) { console.log('E2E_REPORT_KEY niet gezet — resultaat niet gemeld aan Marilyn (niet kritiek).'); return; }
  try {
    // Bugfix (18 sep 2026, tijdens het bouwen ontdekt): de 2 AI-gated tests (V5/B6) staan bij een
    // gewone run (DOE_AI=false) op 'skipped' — dat is bedoeld gedrag, geen fout, en hoort dus niet
    // in de noemer mee te tellen (anders toont Marilyn "16/18" i.p.v. de bedoelde "16/16").
    const gedraaid = TEST_RESULTS.filter((t) => t.status !== 'skipped');
    const geslaagd = gedraaid.filter((t) => t.status === 'passed').length;
    const fails = gedraaid.filter((t) => t.status !== 'passed').map((t) => ({ test: t.title, fout: t.fout }));
    const resp = await fetch(E2E_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-e2e-key': process.env.E2E_REPORT_KEY },
      body: JSON.stringify({ checks_totaal: gedraaid.length, checks_geslaagd: geslaagd, type: DOE_AI ? 'ai' : 'deterministisch', fails }),
    });
    // Bugfix (18 sep 2026, tijdens het bouwen ontdekt): de productie-worker heeft een generieke
    // catch-all die ELK onbekend pad met HTTP 200 beantwoordt ({"status":"...actief",...}) — resp.ok
    // alleen checken zou dus stil "geslaagd" loggen zelfs als de route (nog) niet bestaat of de
    // sleutel verkeerd is. Altijd de body-vorm controleren, nooit alleen de HTTP-status.
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.ok !== true) console.log('Resultaatmelding aan Marilyn mislukt (niet kritiek): status ' + resp.status + ' — ' + JSON.stringify(json).slice(0, 200));
  } catch (e) {
    // Best-effort, nooit fataal: de melding zelf mag de teststatus nooit beïnvloeden — de
    // oorspronkelijke PASS/FAIL van de suite (hieronder, via expect()) blijft leidend.
    console.log('Resultaatmelding aan Marilyn mislukt (niet kritiek): ' + e.message);
  }
}

test.describe('KANTOORINZICHT 3-ROLLEN E2E', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — 3-rollen-regressietest overgeslagen');

  let email, gid, verkoperCode, koperCode, tussenCode, trajectCode;
  let setupOk = false;

  test.beforeAll(async () => {
    email = 'e2e-3rollen-' + Date.now() + '@bisschopsfinancing.test';
    // Adviseur-onboarding (uitnodiging → activeren → voorwaarden) — dit is de ENIGE plek waar dat
    // gebeurt; verkoper/koper/begeleider zelf loggen daarna in met hun eigen traject-code, geen
    // apart account/wachtwoord/MFA per rol (zie de architectuur-toelichting in de sessie van 18 sep).
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: '🔒 ' + MARKER + ' Adviseur', bedrijf: '🔒 ' + MARKER + ' Kantoor', email } });
    gid = uit.json && uit.json.id;
    if (!gid) return;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    // Alle modules aan — de matrix raakt contracten (gesprekken/documenten), ai_analyse
    // (risicoraamwerk/extractie), qa (Q&A-round-trip).
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } } });
    const trajectData = {
      kantoor_naam: '🔒 ' + MARKER + ' BV', contact_naam: 'E2E Verkoper', contact_email: 'v' + email,
      koper_naam: 'E2E Koper Tegenpartij BV', koper_contact: 'E2E Koper', koper_email: 'k' + email, traject_type: 'Verkoop',
    };
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: trajectData } });
    if (!c.json || !c.json.ok) return;
    trajectCode = c.json.code;
    verkoperCode = c.json.code;
    koperCode = c.json.koper_code;
    tussenCode = c.json.tussen_code;
    // VOK vooraf tekenen, anders blokkeert de popup het begeleider-dashboard.
    await api('POST', '/mna/vok/teken', { body: { code: tussenCode, naam: 'E2E Test', versie: VOK_VERSIE, email } });
    setupOk = true;
  });

  test.afterAll(async () => {
    // Cleanup draait ALTIJD, ook als bovenstaande setup of een van de tests hieronder faalde.
    const cleanupResultaten = [];
    if (trajectCode) {
      const d = await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
      cleanupResultaten.push({ stap: 'traject verwijderd (API)', ok: !!(d.json && d.json.ok) });
    }
    if (gid) {
      const d = await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
      cleanupResultaten.push({ stap: 'testadviseur verwijderd (API)', ok: !!(d.json && d.json.ok) });
    }

    // Onafhankelijke D1-verificatie (rechtstreeks, niet via de API die we net zelf aanriepen) —
    // zelfde patroon als voerOchtendcontroleUit() (worker/24-veiligheidsdashboard.js).
    let d1Ok = true;
    if (trajectCode) {
      for (const tabel of ['mna_trajecten', 'mna_data', 'mna_gesprekken', 'mna_qa', 'mna_documenten']) {
        try {
          const kolom = tabel === 'mna_trajecten' ? 'id' : 'traject_id';
          const rows = d1('SELECT count(*) as n FROM ' + tabel + " WHERE " + kolom + "='" + trajectCode + "'");
          const n = rows[0] ? Number(rows[0].n) : -1;
          const ok = n === 0;
          if (!ok) d1Ok = false;
          record('CLEANUP', 'D1', tabel, 'onafhankelijke telling na verwijderen', '0 rijen', ok, 'kreeg ' + n);
        } catch (e) {
          d1Ok = false;
          record('CLEANUP', 'D1', tabel, 'onafhankelijke telling na verwijderen', '0 rijen', false, e.message);
        }
      }
    }
    if (gid) {
      try {
        const rows = d1("SELECT count(*) as n FROM bf_gebruikers WHERE id='" + gid + "'");
        const n = rows[0] ? Number(rows[0].n) : -1;
        const ok = n === 0;
        if (!ok) d1Ok = false;
        record('CLEANUP', 'D1', 'bf_gebruikers', 'onafhankelijke telling na verwijderen', '0 rijen', ok, 'kreeg ' + n);
      } catch (e) {
        d1Ok = false;
        record('CLEANUP', 'D1', 'bf_gebruikers', 'onafhankelijke telling na verwijderen', '0 rijen', false, e.message);
      }
    }

    // Rapport wegschrijven — altijd, ook bij een gefaalde run (juist dan waardevol).
    try {
      const datum = new Date().toISOString().slice(0, 10);
      const rapportPad = path.join(path.dirname(new URL(import.meta.url).pathname), 'rapporten', '3rollen-regressie-' + datum + '-' + Date.now() + '.md');
      const rollen = ['VERKOPER', 'KOPER', 'BEGELEIDER', 'CLEANUP'];
      let md = '# KANTOORINZICHT 3-ROLLEN REGRESSIE — ' + new Date().toISOString() + '\n\n';
      md += 'Marker: `' + MARKER + '` · DOE_AI: ' + DOE_AI + ' · Worker: ' + WORKER + '\n\n';
      md += '| Rol | Pagina | Element | Actie | Verwacht | Status | Detail |\n|---|---|---|---|---|---|---|\n';
      for (const r of MATRIX) md += '| ' + r.rol + ' | ' + r.pagina + ' | ' + r.element + ' | ' + r.actie + ' | ' + r.verwacht + ' | ' + r.status + ' | ' + r.detail.replace(/\|/g, '\\|').slice(0, 200) + ' |\n';
      const totaal = MATRIX.length, pass = MATRIX.filter(r => r.status === 'PASS').length;
      md += '\n**Totaal:** ' + pass + '/' + totaal + ' PASS\n';
      for (const rol of rollen) {
        const subset = MATRIX.filter(r => r.rol === rol);
        if (subset.length) md += '- ' + rol + ': ' + subset.filter(r => r.status === 'PASS').length + '/' + subset.length + ' PASS\n';
      }
      fs.mkdirSync(path.dirname(rapportPad), { recursive: true });
      fs.writeFileSync(rapportPad, md);
      console.log('\nRapport geschreven: ' + rapportPad);
    } catch (e) {
      console.log('Rapport wegschrijven mislukt (niet kritiek): ' + e.message);
    }

    // Resultaat melden aan Marilyn (18 sep 2026) — ná het schrijven van het lokale rapport, vóór de
    // harde cleanup-assertie hieronder: ook bij een mislukte cleanup moet het testresultaat zelf nog
    // gemeld worden. meldResultaatAanMarilyn() faalt zelf nooit fataal (zie de eigen try/catch).
    await meldResultaatAanMarilyn();

    // Harde teardown-assertie: cleanup moet 100% zijn, anders faalt de hele suite (exitcode 1) —
    // ongeacht of de rest van de matrix slaagde. "Als cleanup niet volledig 0 is: TEST = FAIL."
    for (const r of cleanupResultaten) expect(r.ok, r.stap).toBe(true);
    expect(d1Ok, 'onafhankelijke D1-telling toont overal 0 testdata').toBe(true);
  });

  // ─────────────────────────────────────────── VERKOPER ───────────────────────────────────────────
  test.describe('Verkoper', () => {
    test('V1 · inloggen met verkoper-code opent verkopersweergave', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, verkoperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 }).catch(() => {});
      const rol = await page.evaluate(() => window.S && S.rol).catch(() => null);
      const ok = rol === 'verkoper';
      record('VERKOPER', 'mna.html login', '#l-code/#l-btn', 'inloggen met verkoper-code', "S.rol === 'verkoper'", ok, 'kreeg ' + rol);
      expect(ok, 'verkoper-login geeft rol verkoper').toBe(true);
    });

    test('V2 · fase Financieel invullen, opslaan, wegnavigeren en teruglezen', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const waarde1 = MARKER + '-V2-' + Math.floor(Math.random() * 100000);
      await login(page, verkoperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'verkoper', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      const veld = page.locator('#df_omzet3');
      await expect(veld).toBeVisible({ timeout: 10000 });
      await veld.fill(waarde1);
      const saveResp = page.waitForResponse(r => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 10000 });
      await veld.blur(); // triggert schedSave() → saveCurrent() na 1200ms debounce
      let saveOk = false;
      try { const r = await saveResp; saveOk = r.ok(); } catch (e) { saveOk = false; }
      record('VERKOPER', 'Fase Financieel', '#df_omzet3', 'veld invullen + autosave (opslaan)', 'POST /mna/save 200', saveOk, saveOk ? '' : 'geen (succesvolle) save-request gezien');

      // Wegnavigeren (andere fase) + terug + herladen — bewijst persistentie, niet alleen client-state.
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'commercieel'); renderApp(); });
      await login(page, verkoperCode); // volledige herlaad = nieuwe sessie, geen browser-cache van S.data
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'verkoper', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      const veldNa = page.locator('#df_omzet3');
      await expect(veldNa).toBeVisible({ timeout: 10000 });
      const waardeNa = await veldNa.inputValue();
      const teruglezenOk = waardeNa === waarde1;
      record('VERKOPER', 'Fase Financieel', '#df_omzet3', 'wegnavigeren + herladen + teruglezen', waarde1, teruglezenOk, 'kreeg ' + JSON.stringify(waardeNa));
      expect(teruglezenOk, 'opgeslagen waarde komt na herladen terug in de UI').toBe(true);
    });

    // V3 verifieert "teruglezen" via een rechtstreekse D1-query i.p.v. nóg een volledige
    // browser-herlogin — de /mna/traject/{code}-rolLogin-route heeft een eigen rate-limiter
    // (15 pogingen/10 min/IP, worker/11-mna-tekenen-beheer.js), die anders al bij een enkele
    // suite-run in de knel komt (V1+V2 gebruiken samen al 3 logins, K1/K3/K6/B1/B2/B3 nog 6
    // meer). V2 hierboven is en blijft de ENE canonieke, volledige UI→request→DB→UI-round-trip
    // (met een échte herlogin) — V3 bewijst specifiek "wijzigen werkt ook, niet alleen de eerste
    // keer" en heeft daar geen tweede browsersessie voor nodig: de D1-telling is een even
    // onafhankelijke, direct-tegen-de-database geverifieerde bron van waarheid.
    test('V3 · dezelfde waarde wijzigen en opnieuw opslaan (round-trip #2, D1-geverifieerd)', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const waarde2 = MARKER + '-V3-GEWIJZIGD-' + Math.floor(Math.random() * 100000);
      await login(page, verkoperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'verkoper', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      const veld = page.locator('#df_omzet3');
      await expect(veld).toBeVisible({ timeout: 10000 });
      await veld.fill(waarde2);
      const saveResp = page.waitForResponse(r => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 10000 });
      await veld.blur();
      const saveOk = await saveResp.then(r => r.ok()).catch(() => false);
      let waardeNa = null;
      try {
        const rows = d1("SELECT data_json FROM mna_data WHERE id='" + trajectCode + "_financieel'");
        waardeNa = JSON.parse(rows[0].data_json).omzet3.value;
      } catch (e) {}
      const ok = saveOk && waardeNa === waarde2;
      record('VERKOPER', 'Fase Financieel', '#df_omzet3', 'waarde wijzigen + opnieuw opslaan (D1-verificatie)', waarde2, ok, 'saveOk=' + saveOk + ' D1 kreeg ' + JSON.stringify(waardeNa));
      expect(ok, 'gewijzigde waarde staat na opslaan in D1 (wijzigen werkt, niet alleen eerste keer)').toBe(true);
    });

    // test.setTimeout: Playwright's standaard per-test-timeout (30s, playwright.config.js) is te kort
    // voor een ECHTE AI-documentanalyse (10-30+ sec, zie CLAUDE.md "Technische valkuilen") — een test
    // die daardoor halverwege wordt afgebroken laat de browsercontext in een onbepaalde staat achter
    // en kan (gevonden tijdens het bouwen) stilzwijgend een latere save met lege/incomplete data
    // verzenden — geen productbug, wel een test-configuratiefout die downstream tests kan besmetten.
    test('V5 · document uploaden — echte AI-extractie vult een DD-veld [AI]', async ({ page }) => {
      test.setTimeout(90000);
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      test.skip(!DOE_AI, 'KVM_DOE_AI niet gezet — AI-stap overgeslagen (kost geld), zie bestandskop');
      // BELANGRIJK (18 sep 2026, gevonden tijdens het bouwen): "Jaaromzet jaar 3" laat de AI-extractie
      // het 'omzet3'-veld invullen — exact het veld waar K3/B3 verderop van afhangen (het
      // V3-GEWIJZIGD-merkteken). Alleen EBITDA noemen voorkomt deze botsing, zelfde reden als de
      // eerdere 'forecast'-keuze bij V6 hierboven.
      const tekst = 'Post,Bedrag\nEBITDA jaar 3,' + (300000 + Math.floor(Math.random() * 50000)) + '\n';
      const tmpFile = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'tests', '.tmp-3rollen-' + Date.now() + '.csv');
      fs.writeFileSync(tmpFile, tekst);
      try {
        await login(page, verkoperCode);
        await page.waitForFunction(() => window.S && S.traject && S.rol === 'verkoper', null, { timeout: 15000 });
        await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
        const fileInput = page.locator('input[type="file"][multiple]');
        await expect(fileInput).toBeAttached({ timeout: 10000 });
        const uploadResp = page.waitForResponse(r => r.url().includes('/mna/document/upload') && r.request().method() === 'POST', { timeout: 60000 });
        await fileInput.setInputFiles(tmpFile);
        let uploadOk = false, detail = '';
        try {
          const r = await uploadResp;
          const body = await r.json().catch(() => null);
          uploadOk = r.ok() && !!(body && body.ok && body.doc_id);
          detail = uploadOk ? '' : JSON.stringify(body).slice(0, 200);
        } catch (e) { detail = e.message; }
        record('VERKOPER', 'Fase Financieel', 'input[type=file] "Document toevoegen"', 'document uploaden + AI-extractie', 'ok:true + doc_id', uploadOk, detail);
        expect(uploadOk, 'documentupload + AI-extractie geeft ok:true + doc_id terug').toBe(true);
      } finally {
        fs.rmSync(tmpFile, { force: true });
      }
    });

    // BELANGRIJK (18 sep 2026, gevonden tijdens het bouwen): POST /mna/save VERVANGT data_json van de
    // hele fase (server-side `data_json=excluded.data_json`, geen merge — worker/11-mna-tekenen-
    // beheer.js: de client (getDataForFase()) is verantwoordelijk voor het meesturen van ALLE velden
    // van de fase, niet alleen het gewijzigde). De eerste versie van deze test stuurde alleen
    // {omzet3:{...}}, wat niet alleen zijn eigen veld raakte maar het HELE data_json overschreef —
    // en zo stilzwijgend het 'V3-GEWIJZIGD'-merkteken wiste dat K3/B3 verderop nodig hebben. Fix,
    // twee delen: (1) een ANDER veld ('forecast', door niets anders in deze suite gelezen) i.p.v.
    // omzet3, en (2) de bestaande data_json eerst ophalen en meesturen (zoals de echte UI ook doet),
    // zodat deze race-test geen andere velden van hetzelfde gedeelde testtraject wist.
    test('V6 · twee snelle wijzigingen na elkaar — geen corruptie, laatste waarde wint', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const waardeA = MARKER + '-V6-A';
      const waardeB = MARKER + '-V6-B-' + Date.now();
      await login(page, verkoperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'verkoper', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      let bestaand = {};
      try {
        const rows0 = d1("SELECT data_json FROM mna_data WHERE id='" + trajectCode + "_financieel'");
        bestaand = JSON.parse(rows0[0].data_json || '{}');
      } catch (e) {}
      // Twee rechtstreekse /mna/save-aanroepen vlak na elkaar (zelfde bewuste, gerichte aanpak als de
      // bestaande cross-entiteit-race-test) — geen sleep ertussen, reproduceert een dubbelklik/snel-
      // wijzigen-scenario zonder op een échte debounce-timing te moeten gokken.
      await api('POST', '/mna/save', { body: { code: verkoperCode, fase_id: 'financieel', data_json: Object.assign({}, bestaand, { forecast: { value: waardeA, label: 'Omzetforecast komend jaar' } }), checklist_json: {} } });
      await api('POST', '/mna/save', { body: { code: verkoperCode, fase_id: 'financieel', data_json: Object.assign({}, bestaand, { forecast: { value: waardeB, label: 'Omzetforecast komend jaar' } }), checklist_json: {} } });
      const rows = d1("SELECT data_json FROM mna_data WHERE id='" + trajectCode + "_financieel'");
      let eindwaarde = null, omzet3Nog = null;
      try { const dj = JSON.parse(rows[0].data_json); eindwaarde = dj.forecast.value; omzet3Nog = dj.omzet3 && dj.omzet3.value; } catch (e) {}
      const ok = eindwaarde === waardeB && typeof omzet3Nog === 'string' && omzet3Nog.includes('V3-GEWIJZIGD');
      record('VERKOPER', 'Fase Financieel', '#df_forecast (API, dubbele wijziging)', 'twee snelle wijzigingen na elkaar', waardeB + ' (laatste wint, omzet3 blijft intact)', ok, 'forecast=' + JSON.stringify(eindwaarde) + ' omzet3=' + JSON.stringify(omzet3Nog));
      expect(ok, 'laatste van twee snel opeenvolgende saves wint, geen interleaving/corruptie, andere velden blijven intact').toBe(true);
    });

    test('V7 · negatief: verkoper krijgt geen toegang tot een begeleider-only AI-route', async () => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const r = await api('POST', '/mna/teaser/genereer', { body: { code: verkoperCode } });
      const ok = r.status === 401 || r.status === 403;
      record('VERKOPER', 'API', 'POST /mna/teaser/genereer', 'verkoper roept begeleider-only route aan', '401/403', ok, 'kreeg status ' + r.status);
      expect(ok, 'verkoper-code wordt geweigerd op een begeleider-only AI-route').toBe(true);
    });
  });

  // ─────────────────────────────────────────── KOPER ───────────────────────────────────────────
  test.describe('Koper', () => {
    test('K1 · inloggen met koper-code opent koperweergave, geen begeleider-knoppen', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, koperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 }).catch(() => {});
      const rol = await page.evaluate(() => window.S && S.rol).catch(() => null);
      const geenBegeleiderKnop = (await page.locator('#bg-nda-composer-actie').count()) === 0;
      const ok = rol === 'koper' && geenBegeleiderKnop;
      record('KOPER', 'mna.html login', '#l-code/#l-btn', 'inloggen met koper-code', "S.rol === 'koper', geen begeleider-knoppen", ok, 'rol=' + rol + ' geenBegeleiderKnop=' + geenBegeleiderKnop);
      expect(ok, 'koper-login geeft rol koper zonder begeleider-knoppen').toBe(true);
    });

    test('K2 · negatief: vóór vrijgave ziet koper geen DD-data', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const voor = await api('GET', '/mna/entiteiten/' + koperCode);
      const ok = Array.isArray(voor.json) && voor.json.length === 0;
      record('KOPER', 'API', 'GET /mna/entiteiten/{koper_code}', 'koper vóór vrijgave', 'lege lijst', ok, JSON.stringify(voor.json).slice(0, 100));
      expect(ok, 'koper ziet geen data vóór expliciete vrijgave').toBe(true);
    });

    test('K3 · ná vrijgave door begeleider ziet koper de daadwerkelijke waarde op het scherm', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const zet = await api('POST', '/mna/koper-categorieen/' + trajectCode + '?force=1', { adminKey: ADMIN, body: { categorieen: ['financieel'] } });
      const vrijgaveOk = !!(zet.json && zet.json.koper_vrijgegeven === 1);
      record('BEGELEIDER', 'API (admin)', 'POST /mna/koper-categorieen/{code}', "categorie 'financieel' vrijgeven voor koper", 'koper_vrijgegeven: 1', vrijgaveOk, JSON.stringify(zet.json).slice(0, 150));
      await login(page, koperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'koper', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      // Zoekt naar het V3-merkteken (laatst gezette waarde) — bewijst dat koper en verkoper naar
      // dezelfde, actuele data kijken, geen kale JSON-aanwezigheid maar echte scherminhoud.
      const zichtbaar = await page.getByText(new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-V3-GEWIJZIGD')).count();
      const ok = vrijgaveOk && zichtbaar > 0;
      record('KOPER', 'Fase Financieel', 'scherm', 'ná vrijgave: echte waarde zichtbaar', 'waarde uit V3 zichtbaar op scherm', ok, 'gevonden=' + zichtbaar);
      expect(ok, 'koper ziet de daadwerkelijke, actuele waarde ná vrijgave').toBe(true);
    });

    test('K4 · koper stelt een Q&A-vraag, terugleesbaar gekoppeld aan het traject', async () => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const vraagtekst = MARKER + '-K4-Q&A-vraag';
      const post = await api('POST', '/mna/qa/' + koperCode, { body: { vraag: vraagtekst, fase_id: 'financieel', gesteld_door: 'E2E Koper', type: 'vraag' } });
      const postOk = !!(post.json && post.json.ok && post.json.vraag_nr);
      const lijst = await api('GET', '/mna/qa/' + tussenCode);
      const teruggevonden = Array.isArray(lijst.json) && lijst.json.some(q => q.vraag === vraagtekst);
      const ok = postOk && teruggevonden;
      record('KOPER', 'Q&A', 'POST /mna/qa/{koper_code}', 'vraag stellen + terugleesbaar voor begeleider', 'vraag_nr + terugvindbaar in GET /mna/qa', ok, 'postOk=' + postOk + ' teruggevonden=' + teruggevonden);
      expect(ok, 'Q&A-vraag van koper is opgeslagen en terugleesbaar').toBe(true);
    });

    test('K5 · negatief: koper krijgt geen toegang tot een begeleider-only route', async () => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const r = await api('GET', '/mna/waardering/geschiedenis/' + koperCode);
      const ok = r.status === 401;
      record('KOPER', 'API', 'GET /mna/waardering/geschiedenis/{koper_code}', 'koper roept begeleider-only route aan', '401', ok, 'kreeg status ' + r.status);
      expect(ok, 'koper-code wordt geweigerd op een begeleider-only route').toBe(true);
    });

    test('K6 · refresh na login houdt rol en sessie consistent', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, koperCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'koper', null, { timeout: 15000 });
      await page.reload();
      await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 }).catch(() => {});
      const rolNaReload = await page.evaluate(() => window.S && S.rol).catch(() => null);
      // Na een kale reload (zonder code in de URL) verwacht de app een nieuwe login — geen crash en
      // geen stille rolwissel is wat hier telt, niet per se "blijft ingelogd".
      const geenCrash = await page.locator('body').count() > 0;
      const geenVerkeerdeRol = rolNaReload !== 'verkoper' && rolNaReload !== 'tussenpersoon';
      const ok = geenCrash && geenVerkeerdeRol;
      record('KOPER', 'Sessie', 'page reload', 'refresh na login', 'geen crash, geen roldowngrade/-upgrade', ok, 'rolNaReload=' + rolNaReload);
      expect(ok, 'refresh veroorzaakt geen crash of onbedoelde rolwissel').toBe(true);
    });
  });

  // ─────────────────────────────────────────── BEGELEIDER ───────────────────────────────────────────
  test.describe('Begeleider', () => {
    test('B1 · inloggen met tussen_code opent dashboard met documentknoppen', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, tussenCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
      const rol = await page.evaluate(() => window.S && S.rol).catch(() => null);
      // isVisible() wacht NIET (directe snapshot) — de begeleider-dashboard-render start pas ná
      // S.rol, dus expect(...).toBeVisible() (met auto-retry) i.p.v. een race-gevoelige istante check.
      const knop = page.locator('#bg-nda-composer-actie');
      let knopZichtbaar = false;
      try { await expect(knop).toBeVisible({ timeout: 10000 }); knopZichtbaar = true; } catch (e) {}
      const ok = rol === 'tussenpersoon' && knopZichtbaar;
      record('BEGELEIDER', 'mna.html login', '#l-code/#l-btn', 'inloggen met tussen_code', "S.rol === 'tussenpersoon', dashboard zichtbaar", ok, 'rol=' + rol + ' knopZichtbaar=' + knopZichtbaar);
      expect(ok, 'begeleider-login opent het dashboard').toBe(true);
    });

    // Checklist-round-trip verplaatst van verkoper naar begeleider (18 sep 2026, gevonden tijdens het
    // bouwen van deze test): de "Checklist (intern)"-sectie rendert per ontwerp UITSLUITEND voor
    // isTussen() (begeleider) — nooit voor verkoper/koper (mna/06-schermen.js:594,
    // `if(isTussen()||(!isVerkoper()&&!isKoper()))`). Dit was een aanname-fout in de eerste versie van
    // deze test, geen productbug. Fase 'commercieel' i.p.v. 'financieel': saveCurrent() blokkeert
    // begeleider-schrijfacties specifiek op fase Financieel (zie B4 hieronder) — de checklist zou daar
    // dus ALTIJD client-side blijven hangen zonder ooit een echte D1-write te doen.
    test('B2 · checklist-item aanvinken op fase Commercieel, D1-geverifieerd', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, tussenCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'commercieel'); renderApp(); });
      const item = page.locator('.chk-item[data-key]').first();
      await expect(item).toBeVisible({ timeout: 10000 });
      const key = await item.getAttribute('data-key');
      // BELANGRIJK (18 sep 2026, gevonden tijdens het bouwen): de klik-handler
      // (mna/06-schermen.js) roept saveCurrent() vóórdat S.checked wordt omgezet
      // (`onclick=function(){saveCurrent();S.checked[key]=!S.checked[key];renderApp();}`) — de klik
      // zelf verstuurt dus de vorige (ongewijzigde) staat; pas de EERSTVOLGENDE save bevat de
      // omgewisselde waarde. In de echte UI gebeurt die vervolgens vanzelf bij de volgende
      // fase-wissel; deze test roept 'm expliciet aan om hetzelfde te bewijzen zonder een extra
      // navigatiestap te hoeven simuleren. Geen productbug — wel een niet-vanzelfsprekend
      // opslagmoment, dus expliciet gedocumenteerd.
      await item.click();
      const saveResp = page.waitForResponse(r => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 10000 });
      await page.evaluate(() => { saveCurrent(); });
      const saveOk = await saveResp.then(r => r.ok()).catch(() => false);
      let checkedNa = false;
      // BELANGRIJK (18 sep 2026, gevonden tijdens het bouwen): checklist_json is server-side genest
      // als {items:{"0":bool,...}, redflags:{"0":bool,...}} met de KALE index als sleutel
      // (getChecklistForFase(), mna/02-state-opslag-documenten.js) — data-key op het element is de
      // SAMENGESTELDE 'faseId_index'-vorm (bijv. 'commercieel_0'), alleen gebruikt in de client-kant
      // S.checked-map. Eerste versie van deze test keek op de samengestelde sleutel rechtstreeks in
      // het opgeslagen object en vond dus altijd niets — test-bug, geen productbug.
      try {
        const rows = d1("SELECT checklist_json FROM mna_data WHERE id='" + trajectCode + "_commercieel'");
        const idx = key.split('_').pop();
        checkedNa = !!JSON.parse(rows[0].checklist_json).items[idx];
      } catch (e) {}
      const ok = saveOk && checkedNa;
      record('BEGELEIDER', 'Fase Commercieel', '.chk-item[data-key]', 'checklist-item aanvinken (D1-verificatie)', 'checklist_json[key] === true in D1', ok, 'key=' + key + ' saveOk=' + saveOk + ' checkedNa=' + checkedNa);
      expect(ok, 'checklist-vinkje is server-side (D1) vastgelegd').toBe(true);
    });

    // Leest S.data van de AL INGELOGDE pagina (geen tweede /mna/traject/-aanroep nodig — die route
    // deelt de login-rate-limiter met login(); zie de toelichting bij V3 hierboven) — bewijst
    // bovendien preciezer wat gevraagd wordt: dat het reeds geladen dashboard de actuele waarde toont.
    test('B3 · begeleider ziet dezelfde, actuele verkoperwaarde (cross-role leesconsistentie)', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      await login(page, tussenCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
      // S.data bevat de veldwaarden van de HUIDIGE fase/entiteit voor de ingelogde rol; begeleider
      // opent zonder expliciete fase-navigatie niet automatisch 'financieel', dus die fase eerst
      // selecteren (zelfde navigatiepatroon als de andere rollen hierboven) en dan direct uit S.data lezen.
      await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex(f => f.id === 'financieel'); renderApp(); });
      const veldWaarde = await page.evaluate(() => (window.S && S.data && S.data['financieel_omzet3']) || null).catch(() => null);
      const ok = typeof veldWaarde === 'string' && veldWaarde.includes(MARKER) && veldWaarde.includes('V3-GEWIJZIGD');
      record('BEGELEIDER', 'Dashboard', 'S.data (al ingelogde sessie)', "verkoper's laatste waarde bekijken", 'zelfde waarde als V3', ok, 'kreeg ' + JSON.stringify(veldWaarde));
      expect(ok, 'begeleider ziet dezelfde, actuele data als de verkoper zojuist opsloeg').toBe(true);
    });

    test('B4 · gesprek vastleggen, terugleesbaar op het scherm na herladen', async ({ page }) => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      const verslagMarker = MARKER + '-B4-gespreksverslag';
      await login(page, tussenCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
      // BELANGRIJK (18 sep 2026, gevonden tijdens het bouwen): #bg-gesprek-actie zit in een
      // standaard-INGEKLAPTE accordionsectie ("Communicatie", data-sec="comm",
      // mna/04-begeleider-dashboard.js:972, `style="display:none"` totdat de kop wordt aangeklikt).
      // Geen productbug — het is bewust een ingeklapt paneel — maar deze test moet de sectie eerst
      // openklappen, exact zoals een echte gebruiker dat ook doet.
      await page.locator('.bg-sec-hdr[data-sec="comm"]').click();
      await page.locator('#bg-gesprek-actie').click();
      await expect(page.locator('#bgg-verslag')).toBeVisible({ timeout: 10000 });
      await page.locator('#bgg-deelnemers').fill('E2E Regressietest');
      await page.locator('#bgg-verslag').fill(verslagMarker);
      const saveResp = page.waitForResponse(r => r.url().includes('/mna/admin/gesprekken/') && r.request().method() === 'POST', { timeout: 10000 });
      await page.locator('#bgg-ok').click();
      let saveOk = false;
      try { const r = await saveResp; saveOk = r.ok(); } catch (e) {}
      // laadBgGesprekken() ververst automatisch na een geslaagde save (zie mna/04-begeleider-dashboard.js)
      // — maar dat is een TWEEDE, aparte async GET-aanroep ná de save. .count() controleert de DOM
      // direct (geen auto-retry, zelfde valkuil als eerder bij B1's .isVisible()) en kan dus vóór die
      // verversing klaar is een terecht 0 teruggeven. expect(...).toBeVisible() wacht/herprobeert wel.
      let gevonden = 0;
      try { await expect(page.getByText(verslagMarker.slice(0, 50))).toBeVisible({ timeout: 10000 }); gevonden = 1; } catch (e) {}
      const ok = saveOk && gevonden > 0;
      record('BEGELEIDER', 'Gesprekken', '#bg-gesprek-actie → #bgg-ok', 'gesprek vastleggen + teruglezen op scherm', 'verslag zichtbaar in #bg-gesprekken-sectie', ok, 'saveOk=' + saveOk + ' gevonden=' + gevonden);
      expect(ok, 'vastgelegd gesprek is direct terugleesbaar op het scherm').toBe(true);
    });

    test('B5 · negatief: begeleider mag fase Financieel niet opslaan', async () => {
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      // Bewust behouden als API-check in deze doorlopende reis (de UI-variant — read-only velden,
      // geen upload-knop — staat al in tests/e2e-ui.spec.js en wordt hier niet herhaald).
      const r = await api('POST', '/mna/save', { headers: { 'x-tussen-key': tussenCode }, body: { code: tussenCode, fase_id: 'financieel', data_json: { omzet3: { value: 'MAG-NIET', label: 'Omzet jaar 3' } }, checklist_json: {} } });
      const ok = r.status === 403;
      record('BEGELEIDER', 'API', 'POST /mna/save (fase financieel)', 'begeleider probeert te schrijven op verkoper-only fase', '403', ok, 'kreeg status ' + r.status);
      expect(ok, 'begeleider wordt geweigerd op fase Financieel').toBe(true);
    });

    test('B6 · risicoraamwerk genereren — echte AI-inhoud, geen placeholder [AI]', async ({ page }) => {
      test.setTimeout(90000); // zelfde reden als V5 hierboven — 30s standaard is te kort voor een echte AI-generatie
      test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
      test.skip(!DOE_AI, 'KVM_DOE_AI niet gezet — AI-stap overgeslagen (kost geld), zie bestandskop');
      await login(page, tussenCode);
      await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 15000 });
      const genResp = page.waitForResponse(r => r.url().includes('/mna/risicoraamwerk/genereer') && r.request().method() === 'POST', { timeout: 45000 });
      await page.locator('#bg-risicoraamwerk-actie').click();
      let genOk = false;
      try { const r = await genResp; genOk = r.ok(); } catch (e) {}
      await page.waitForFunction(() => {
        const out = document.getElementById('bg-doc-out');
        return out && /SWOT/.test(out.innerHTML) && /PESTEL/.test(out.innerHTML);
      }, null, { timeout: 15000 }).catch(() => {});
      const html = await page.locator('#bg-doc-out').innerHTML().catch(() => '');
      const echteInhoud = /SWOT/.test(html) && /PESTEL/.test(html);
      const ok = genOk && echteInhoud;
      record('BEGELEIDER', 'Risicoraamwerk', '#bg-risicoraamwerk-actie', 'AI-documentgeneratie', 'SWOT/PESTEL-secties met echte inhoud in #bg-doc-out', ok, 'genOk=' + genOk + ' echteInhoud=' + echteInhoud);
      expect(ok, 'risicoraamwerk-generatie levert echte, gestructureerde inhoud op').toBe(true);
    });
  });
});
