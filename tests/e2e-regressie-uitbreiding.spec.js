// ══════════════════════════════════════════════════════════════════
// KantoorInzicht — gerichte regressie-uitbreiding (18 sep 2026)
//
// Vult 9, door Marcel expliciet gekozen gaten uit de functionele testinventarisatie van
// dezelfde sessie: dataverlies-, blokkade-, rechten- en dagelijkse-M&A-risico's die tot nu toe
// geen enkele automatische test hadden. Test Economy: één representatief pad per patroon, geen
// dubbels van wat e2e-3rollen-regressie/e2e-ui/e2e-tos al bewijzen.
//
// Elke test is bewust ZELFSTANDIG (eigen traject/gebruiker/sector, eigen cleanup) — dit is geen
// doorlopende reis zoals e2e-3rollen-regressie, maar 9 losstaande regressie-ankers voor 9
// verschillende subsystemen (mna.html-partijzijde, Marilyn, sectorprofielen, adv.html-MFA).
//
// Draaien: npx playwright test tests/e2e-regressie-uitbreiding.spec.js
// Vereist ADMIN_KEY (env of --key=, zie lib.mjs) en WORKER_URL tegen staging.
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, leesAdminKey, WORKER, d1, zetMfaUitVoorTest, accepteerPlatformvoorwaarden, ruimTestTrajectOp, verwijderTestGebruiker, IS_STAGING_WORKER } from './lib.mjs';

const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
const IS_STANDAARD_PRODUCTIE = WORKER === 'https://kantoorinzicht.marcel-bisschops.workers.dev';
if (IS_STANDAARD_PRODUCTIE) {
  throw new Error('tests/e2e-regressie-uitbreiding.spec.js weigert te draaien tegen productie (WORKER_URL). Zet WORKER_URL op de staging-worker.');
}
const MARKER = 'E2E-UITBR-' + Date.now();

// Zelfde precedent als tests/e2e-3rollen-regressie.spec.js: een begeleider met een echte klik in
// het dashboard loopt anders tegen de verplichte VOK-onderteken-popup aan (mna/04, toonVOKPopup),
// die de hele pagina blokkeert voor pointer-events totdat getekend is.
const VOK_VERSIE = (() => {
  try {
    const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mna', '04-begeleider-dashboard.js'), 'utf8');
    const m = src.match(/VOK_VERSIE\s*=\s*'([^']+)'/);
    return (m && m[1]) || '1.5';
  } catch { return '1.5'; }
})();

test.describe.configure({ mode: 'serial' });
test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — regressie-uitbreiding overgeslagen');

// ── Gedeelde helpers ──────────────────────────────────────────────
async function loginMna(page, code) {
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(code);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => Promise.race([window.__entiteitenGeladen, new Promise((r) => setTimeout(r, 8000))])).catch(() => {});
}

async function loginMarilyn(page) {
  await page.goto('/marilyn.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#ak').fill(ADMIN);
  await page.locator('#login-btn').click();
  await page.waitForSelector('#t-mna', { timeout: 15000 });
}

async function maakTraject(extra) {
  const email = 'e2e-uitbr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@bisschopsfinancing.test';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: '🔒 ' + MARKER + ' Adviseur', bedrijf: '🔒 ' + MARKER + ' Kantoor', email } });
  const gid = uit.json && uit.json.id;
  if (!gid) throw new Error('uitnodigen mislukt: ' + JSON.stringify(uit.json));
  await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } } });
  const trajectData = Object.assign({
    kantoor_naam: '🔒 ' + MARKER + ' BV', contact_naam: 'E2E Verkoper', contact_email: 'v' + email,
    koper_naam: 'E2E Koper BV', koper_contact: 'E2E Koper', koper_email: 'k' + email, traject_type: 'Verkoop',
  }, extra || {});
  const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: trajectData } });
  if (!c.json || !c.json.ok) throw new Error('traject aanmaken mislukt: ' + JSON.stringify(c.json));
  // Platformvoorwaarden vóór elke andere gated /mna/*-aanroep (S1.2b-gate) — maakTraject() is de
  // centrale helper voor alle 9 tests hieronder, dus dit dekt ze allemaal in één keer.
  await accepteerPlatformvoorwaarden({ verkoper: c.json.code, koper: c.json.koper_code, tussenpersoon: c.json.tussen_code });
  // Een vers traject dwingt de verkoper eerst door het eenmalige opening-scherm (adres/KvK/
  // tekenbevoegde + entiteiten/partners) — geen van deze 9 tests gaat over die flow zelf, dus die
  // overslaan via een directe D1-zet (zelfde bewuste testopzet-patroon als elders in dit bestand).
  d1("UPDATE mna_trajecten SET opening_voltooid=1 WHERE id='" + c.json.code + "'");
  return { gid, email, code: c.json.code, koperCode: c.json.koper_code, tussenCode: c.json.tussen_code };
}

async function ruimGebruikerEnTrajectOp(t) {
  if (t.code) await ruimTestTrajectOp(t.code, t.tussenCode); // N-104: extern testtraject → staging-only opruimroute
  if (t.gid) await verwijderTestGebruiker(t.gid, ADMIN);
}

function d1CountTraject(code) {
  const rows = d1("SELECT count(*) as n FROM mna_trajecten WHERE id='" + code + "'");
  return rows[0] ? Number(rows[0].n) : -1;
}
function d1CountGebruiker(gid) {
  const rows = d1("SELECT count(*) as n FROM bf_gebruikers WHERE id='" + gid + "'");
  return rows[0] ? Number(rows[0].n) : -1;
}

// ═══════════════════════════════════════════════════════════════════
// 1. VERKOPER TEKENT NDA VIA COVER-SCHERM
// Representatief voor NDA/LoI/BEM/Excl — delen exact hetzelfde /mna/teken-patroon en dezelfde
// prompt()+confirm()-UI. Risico: gebruiker kan niet verder (C2) als deze knop breekt.
// ═══════════════════════════════════════════════════════════════════
test('1. Verkoper tekent NDA via cover-scherm — status + D1 geverifieerd', async ({ page }) => {
  const t = await maakTraject();
  try {
    // NDA-tekst moet aanwezig zijn wil de teken-knop verschijnen (S.ndaTekst, gevuld bij login uit
    // de traject-DTO). De reguliere weg (/mna/nda/email) verstuurt altijd ook een echte e-mail via
    // Resend — tijdens het bouwen bleek staging se dagelijkse verzendlimiet bereikt (502, vóór de
    // D1-write), een reëel maar dagelijks-variabel omgevingsprobleem, geen productbug. Deze test gaat
    // over het TEKEN-pad, niet het mail-verzendpad (dat dekt prod-smoke.mjs batch 3C al apart) — dus
    // nda_tekst/nda_datum direct in D1 zetten als testopzet, zelfde bewuste patroon als
    // zetMfaUitVoorTest() in lib.mjs (test-only bypass van een niet-betrouwbaar te forceren zijstap).
    d1("UPDATE mna_trajecten SET nda_tekst='Test-NDA voor " + MARKER + ". Dit is fictieve testtekst.', nda_datum=" + Date.now() + " WHERE id='" + t.code + "'");
    const rijVoor = d1("SELECT nda_tekst FROM mna_trajecten WHERE id='" + t.code + "'");
    expect(rijVoor[0] && rijVoor[0].nda_tekst, 'testopzet: nda_tekst staat op de rij').toBeTruthy();

    await loginMna(page, t.code);
    await page.waitForSelector('#nda-teken-btn', { timeout: 10000 });

    // Eén persistente handler (i.p.v. .once) vóór de klik: prompt() en confirm() volgen elkaar
    // synchroon in dezelfde onclick-afhandeling — een tweede .once() pas ná de klik registreren is
    // te laat, Playwright wijst een dialog zonder actieve handler standaard automatisch af.
    let promptGezien = false, confirmGezien = false;
    page.on('dialog', async (d) => {
      if (d.type() === 'prompt') { promptGezien = true; await d.accept('E2E Test Verkoper'); }
      else if (d.type() === 'confirm') { confirmGezien = true; await d.accept(); }
      else { await d.dismiss(); }
    });
    await page.locator('#nda-teken-btn').click();
    await page.waitForTimeout(1000);

    expect(promptGezien, 'naam-prompt verscheen').toBe(true);
    expect(confirmGezien, 'akkoord-confirm verscheen').toBe(true);
    await expect(page.getByText('Getekend door E2E Test Verkoper')).toBeVisible({ timeout: 10000 });

    // /mna/teken voegt een rolsuffix toe (bv. "(verkoper)") aan de opgeslagen naam — bevestigd
    // correct productiegedrag, geen exacte gelijkheid maar wel de ingevoerde naam als prefix.
    const rijNa = d1("SELECT nda_getekend, nda_getekend_datum FROM mna_trajecten WHERE id='" + t.code + "'");
    expect(rijNa[0] && rijNa[0].nda_getekend, 'D1: nda_getekend bevat de ingevoerde naam').toContain('E2E Test Verkoper');
    expect(rijNa[0] && rijNa[0].nda_getekend_datum, 'D1: nda_getekend_datum gezet').toBeTruthy();
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. VERKOPER: FASE AFRONDEN → SUMMARY → DOSSIER VRIJGEVEN
// Onomkeerbare bedrijfskritieke gate (C2/C4) — nooit eerder getest.
// ═══════════════════════════════════════════════════════════════════
test('2. Verkoper: fase afronden en dossier vrijgeven aan begeleider (volledige keten)', async ({ page }) => {
  const t = await maakTraject({ traject_type: 'Verkoop' });
  try {
    // Alle verplichte velden vullen (nodig voor de "0 missende velden"-poort op het summary-scherm),
    // programmatisch uit het echte sectorprofiel gehaald — geen aanname over welke velden dat zijn.
    const profResp = await api('GET', '/mna/sectorprofielen');
    const profiel = profResp.json && profResp.json.profielen && profResp.json.profielen.accountancy;
    expect(profiel, 'sectorprofiel accountancy opgehaald').toBeTruthy();
    for (const fase of profiel.fases) {
      const payload = {};
      for (const f of fase.dataFields || []) {
        if (!f.req || f.header) continue;
        const numeriek = /omzet|ebitda|marge|fte|bedrag|aantal|percentage|saldo|schuld|vermogen|totaal|resultaat/i.test(f.id + f.label);
        payload[f.id] = { label: f.label, value: numeriek ? '15' : ('Fictieve testwaarde ' + MARKER) };
      }
      // Omzet/EBITDA-marge bewust op realistische, niet-blokkerende waarden (kritieke-discrepantiecheck).
      if (payload.omzet1) payload.omzet1.value = '3000000';
      if (payload.omzet2) payload.omzet2.value = '3200000';
      if (payload.omzet3) payload.omzet3.value = '3500000';
      if (payload.ebitda) payload.ebitda.value = '525000';
      if (Object.keys(payload).length) {
        const s = await api('POST', '/mna/save', { body: { code: t.code, fase_id: fase.id, data_json: payload } });
        expect(s.json && s.json.ok, 'save fase ' + fase.id + ' (verplichte velden)').toBe(true);
      }
    }

    await loginMna(page, t.code);
    await page.waitForFunction(() => window.S && S.traject, null, { timeout: 10000 });
    await page.evaluate(() => { S.screen = 'main'; S.fase = 0; renderApp(); });
    await page.waitForSelector('#fase-afronden-btn', { timeout: 10000 });
    page.once('dialog', (d) => d.accept());
    await page.locator('#fase-afronden-btn').click();
    await page.waitForTimeout(800);

    await page.evaluate(() => { S.screen = 'summary'; renderApp(); });
    const vrijgevenBtn = page.locator('#dossier-vrijgeven-btn');
    await expect(vrijgevenBtn, 'dossier-vrijgeven-knop zichtbaar (0 missende velden, geen kritieke discrepantie)').toBeVisible({ timeout: 10000 });
    page.once('dialog', (d) => d.accept());
    await vrijgevenBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Dossier vrijgegeven')).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Toast kan alweer verdwenen zijn — D1 is de doorslaggevende check hieronder.
    });

    const rij = d1("SELECT verkoper_klaar, verkoper_klaar_naam FROM mna_trajecten WHERE id='" + t.code + "'");
    expect(rij[0] && Number(rij[0].verkoper_klaar), 'D1: verkoper_klaar gezet ná dossier vrijgeven').toBe(1);
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. MARILYN: NIEUW TRAJECT → BEWERKEN → VERGRENDELEN → VERWIJDEREN
// Marcels eigen dagelijkse belangrijkste tool — nooit via de eigen UI getest (C1/C4).
// ═══════════════════════════════════════════════════════════════════
test('3. Marilyn: M&A-traject volledige CRUD-keten (nieuw → bewerk → vergrendel → verwijder)', async ({ page }) => {
  let trajectCode = null;
  try {
    await loginMarilyn(page);
    await page.locator('#t-mna').click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Nieuw traject/ }).click();
    const naamMarker = '🔒 ' + MARKER + ' Marilyn CRUD BV';
    // marilyn.html's eigen toonNieuwModal() gebruikt andere veld-id's dan adv.html's create-modal
    // (m-k/m-c/m-e/m-adres/m-kvk/m-rv, niet n-naam/n-contact/n-email) — bevestigd via broncode.
    await page.locator('#m-k').fill(naamMarker);
    await page.locator('#m-kvk').fill('12345678');
    await page.locator('#m-rv').selectOption('B.V.');
    await page.locator('#m-adres').fill('Teststraat 1, 1234AB Teststad');
    await page.locator('#m-c').fill('E2E Contact');
    await page.locator('#m-e').fill('crud-' + Date.now() + '@bisschopsfinancing.test');
    const createResp = page.waitForResponse((r) => r.url().includes('/mna/create') && r.request().method() === 'POST', { timeout: 15000 });
    await page.locator('#m-ok').click();
    const cr = await createResp;
    const crBody = await cr.json().catch(() => null);
    expect(crBody && crBody.ok, 'traject aangemaakt via Marilyn /mna/create').toBe(true);
    trajectCode = crBody.code;
    expect(trajectCode, 'trajectcode ontvangen').toBeTruthy();

    // Bewerken: rechtstreeks naar het bewerk-endpoint via de UI-modal (naam wijzigen is genoeg bewijs).
    const bewerkResp0 = await api('POST', '/mna/admin/update/' + trajectCode, { adminKey: ADMIN, body: { begeleider_naam: 'E2E Begeleider Bewerkt' } });
    expect(bewerkResp0.json && bewerkResp0.json.ok, 'bewerken (API-niveau, matcht de knop /mna/admin/update-aanroep)').toBe(true);
    const rijBewerkt = d1("SELECT begeleider_naam FROM mna_trajecten WHERE id='" + trajectCode + "'");
    expect(rijBewerkt[0] && rijBewerkt[0].begeleider_naam, 'D1: bewerking correct opgeslagen').toBe('E2E Begeleider Bewerkt');

    // Vergrendelen via de echte knop op de traject-rij (data-id-selector — de knop heeft geen
    // eigen id, wel een unieke class + data-id per rij, bevestigd via broncode). Marilyn's sessie
    // leeft alleen in JS-geheugen (geen localStorage) — page.reload() logt dus uit; het bestaande
    // "↻ Verversen"-knop-pad ververst data zonder de sessie te verliezen.
    await page.locator('#btn-refresh').click();
    await page.waitForTimeout(800);
    const vergrendelBtn = page.locator('.btn-verg[data-id="' + trajectCode + '"]');
    await expect(vergrendelBtn, 'nieuwe traject-rij + vergrendel-knop zichtbaar in de lijst').toBeVisible({ timeout: 10000 });
    page.once('dialog', (d) => d.accept());
    await vergrendelBtn.click();
    await page.waitForTimeout(1000);
    const rijVergrendeld = d1("SELECT status FROM mna_trajecten WHERE id='" + trajectCode + "'");
    expect(rijVergrendeld[0] && rijVergrendeld[0].status, 'D1: status = vergrendeld').toBe('vergrendeld');

    // Verwijderen via de echte knop.
    await page.locator('#btn-refresh').click();
    await page.waitForTimeout(800);
    const verwijderBtn = page.locator('.btn-del-mna[data-id="' + trajectCode + '"]');
    await expect(verwijderBtn, 'verwijder-knop zichtbaar').toBeVisible({ timeout: 10000 });
    page.once('dialog', (d) => d.accept());
    const deleteResp = page.waitForResponse((r) => r.url().includes('/admin/delete/mna/'), { timeout: 15000 });
    await verwijderBtn.click();
    const dr = await deleteResp;
    expect(dr.ok(), 'verwijder-aanroep via de knop slaagde').toBe(true);
    trajectCode = null; // al opgeruimd via de knop zelf
  } finally {
    if (trajectCode) await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
    const gone = d1("SELECT count(*) as n FROM mna_trajecten WHERE kantoor_naam='" + ('🔒 ' + MARKER + ' Marilyn CRUD BV') + "'");
    expect(gone[0] && Number(gone[0].n), 'cleanup: geen restant-traject met deze testnaam').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. MARILYN: wisTrajectData (destructieve data-wis-actie)
// Data-verlies-risico (C1) — nooit getest of verwijderen daadwerkelijk correct/compleet is.
//
// Productpunt 22 (12 okt 2026): sinds de muur (worker/13, isEigenTraject) weigert de backend
// wis-data op een traject van een externe adviseur, en toont Marilyn daar geen .btn-wis-data meer
// (alleen een slot). De positieve wisproef draait daarom op een EIGEN intern synthetisch traject
// (/mna/create met admin-key, zelfde route als test 3); een tweede eigen traject dient als controle
// dat niets anders geraakt wordt. Het externe traject uit maakTraject() blijft apart behouden als
// negatieve fixture: afgeschermde rij zonder wisknop, backend weigert, data byte-gelijk.
// Geen productrechten gewijzigd, geen eigendom via D1 omgezet, geen AI-stappen.
// ═══════════════════════════════════════════════════════════════════
async function maakEigenWisTraject(label) {
  const r = await api('POST', '/mna/create', { adminKey: ADMIN, body: {
    kantoor_naam: '🔒 ' + MARKER + ' Wis ' + label + ' BV', traject_type: 'Verkoop', contact_naam: 'E2E Contact',
    contact_email: 'wis-' + label.toLowerCase() + '-' + Date.now() + '@bisschopsfinancing.test', opdrachtgever_rol: 'verkoper',
  } });
  if (!r.json || !r.json.ok || !r.json.code) throw new Error('eigen wistraject (' + label + ') aanmaken mislukt: ' + JSON.stringify(r.json));
  return { code: r.json.code, koperCode: r.json.koper_code, tussenCode: r.json.tussen_code };
}

// Onafhankelijke D1-momentopname van alles wat wis-data (zonder documenten/ondertekeningen) NIET
// mag raken: de volledige trajectrij (incl. signhost_transactions, ondertekeningen, status),
// documenten/-versies en banktransacties — plus de DD-rijen zelf en het logboek.
function d1WisMomentopname(code) {
  const q = "'" + code + "'";
  const tellingen = d1('SELECT'
    + " (SELECT json_group_array(json_object('id', id, 'data_json', data_json, 'checklist_json', checklist_json, 'updated_at', updated_at))"
    + ' FROM (SELECT id, data_json, checklist_json, updated_at FROM mna_data WHERE traject_id=' + q + ' ORDER BY id)) AS mna_data,'
    + ' (SELECT COUNT(*) FROM mna_documenten WHERE traject_id=' + q + ') AS documenten,'
    + ' (SELECT COUNT(*) FROM mna_doc_versies WHERE traject_id=' + q + ') AS doc_versies,'
    + ' (SELECT COUNT(*) FROM mna_bankmutaties_import WHERE traject_id=' + q + ') AS bank_imports,'
    + ' (SELECT COUNT(*) FROM mna_bankmutaties_regel WHERE traject_id=' + q + ') AS bank_regels,'
    + ' (SELECT COUNT(*) FROM mna_logboek WHERE traject_id=' + q + ') AS logboek')[0] || {};
  const traject = d1('SELECT * FROM mna_trajecten WHERE id=' + q)[0] || null;
  return { ...tellingen, traject: traject ? JSON.stringify(traject) : null };
}

test('4. Marilyn: wisTrajectData wist exact de gekozen data, niets meer en niets minder', async ({ page }) => {
  test.setTimeout(180000); // drie fixtures + ~20 onafhankelijke D1-reads (elk ~2 s); 30s globaal timeout is te krap
  // Destructieve wisactie + D1-reads/-opruiming: uitsluitend tegen de staging-worker (fail-closed).
  if (!IS_STAGING_WORKER) throw new Error('test 4 draait uitsluitend tegen de staging-worker (WORKER_URL=' + WORKER + ')');
  let intern = null, controle = null, extern = null;
  const internMarker = 'WISTEST-' + MARKER;
  const controleMarker = 'WISCONTROLE-' + MARKER;
  const externMarker = 'WISEXTERN-' + MARKER;
  const leeg = (v) => v == null || v === '' || v === '{}';
  try {
    // ── Fixtures ────────────────────────────────────────────────────
    intern = await maakEigenWisTraject('Intern');
    controle = await maakEigenWisTraject('Controle');
    for (const t of [intern, controle]) {
      await accepteerPlatformvoorwaarden({ verkoper: t.code, koper: t.koperCode, tussenpersoon: t.tussenCode });
      d1("UPDATE mna_trajecten SET opening_voltooid=1 WHERE id='" + t.code + "'"); // zelfde testopzet als maakTraject()
    }
    extern = await maakTraject();

    const saveIntern = await api('POST', '/mna/save', { body: { code: intern.code, fase_id: 'commercieel', data_json: { klantenportefeuille: { label: 'Klantenportefeuille', value: internMarker } }, checklist_json: { items: { 0: true }, redflags: {} } } });
    expect(saveIntern.json && saveIntern.json.ok, 'intern: testdata vooraf opgeslagen (DD-veld + checklist)').toBe(true);
    const saveControle = await api('POST', '/mna/save', { body: { code: controle.code, fase_id: 'commercieel', data_json: { klantenportefeuille: { label: 'Klantenportefeuille', value: controleMarker } }, checklist_json: { items: { 0: true }, redflags: {} } } });
    expect(saveControle.json && saveControle.json.ok, 'controle: testdata vooraf opgeslagen (DD-veld + checklist)').toBe(true);
    const saveExtern = await api('POST', '/mna/save', { body: { code: extern.code, fase_id: 'commercieel', data_json: { klantenportefeuille: { label: 'Klantenportefeuille', value: externMarker } } } });
    expect(saveExtern.json && saveExtern.json.ok, 'extern: synthetische DD-waarde vooraf opgeslagen (verkoper)').toBe(true);
    // Eén synthetisch document op het interne traject, zodat "documenten ongewijzigd" iets bewijst.
    // Zelfde upload-base64-route als test 8 (geen AI-extractie).
    const uploadResp = await fetch(WORKER + '/mna/document/upload-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(JSON.stringify({ code: intern.code, fase_id: 'commercieel', bestand_naam: 'e2e-wis-behouden.csv', base64: Buffer.from('Kolom\nE2E ' + MARKER + '\n').toString('base64') })),
    });
    const upload = await uploadResp.json().catch(() => null);
    expect(upload && upload.ok, 'intern: synthetisch document geüpload (blijft na wissen bestaan)').toBe(true);

    // ── Onafhankelijke D1-read vóór het wissen ──────────────────────
    const internVoor = d1WisMomentopname(intern.code);
    const controleVoor = d1WisMomentopname(controle.code);
    const externVoor = d1WisMomentopname(extern.code);
    const internDataVoor = JSON.parse(internVoor.mna_data || '[]');
    const internRijVoor = internDataVoor.find((r) => String(r.data_json || '').includes(internMarker));
    expect(internRijVoor, 'D1: intern DD-veld staat er vóór het wissen').toBeTruthy();
    const chkVoor = JSON.parse(internRijVoor.checklist_json || '{}');
    expect(chkVoor && chkVoor.items && Object.keys(chkVoor.items).length > 0, 'D1: intern checklist staat er vóór het wissen').toBe(true);
    expect(Number(internVoor.documenten), 'D1: intern document staat er vóór het wissen').toBe(1);
    expect(controleVoor.mna_data.includes(controleMarker), 'D1: controle-DD-veld staat er vóór het wissen').toBe(true);
    expect(externVoor.mna_data.includes(externMarker), 'D1: externe DD-waarde staat er vóór de weigerproef').toBe(true);
    const externCreatedAt = Number(JSON.parse(externVoor.traject).created_at);

    // ── Marilyn: externe rij afgeschermd, geen wisknop ──────────────
    await loginMarilyn(page);
    await page.locator('#t-mna').click();
    await page.waitForTimeout(500);
    // De afgeschermde lijstrij draagt bewust geen id/naam (N-102, filterExternTraject) — de rij is
    // alleen terug te vinden via de zichtbare created_at uit de onafhankelijke D1-read.
    const externIdx = await page.evaluate((ca) => mnaList.map((t, i) => (t.inhoud_afgeschermd && Number(t.created_at) === ca ? i : -1)).filter((i) => i >= 0), externCreatedAt);
    expect(externIdx.length, 'Marilyn: precies één afgeschermde rij voor het externe testtraject').toBe(1);
    const externLijstRij = await page.evaluate((i) => mnaList[i], externIdx[0]);
    expect(externLijstRij.id, 'lijst-API: externe rij zonder traject-id').toBeUndefined();
    // begeleider_naam/-email zijn bewust zichtbaar (EXTERN_TRAJECT_ZICHTBAAR) en dragen de adviseursnaam
    // met MARKER — daarom alleen de EXTERN_TRAJECT_LEEG-velden, id/codes en de externe DD-waarde toetsen.
    const externLeeg = ['kantoor_rechtsvorm', 'contact_naam', 'contact_email', 'koper_naam', 'koper_rechtsvorm', 'koper_contact', 'koper_email', 'koper_adres', 'koper_kvk', 'verkoper_adres', 'verkoper_kvk', 'notitie'];
    for (const k of externLeeg) expect(externLijstRij[k], 'lijst-API: externe rij ' + k + ' leeg').toBe('');
    expect(externLijstRij.kantoor_naam, 'lijst-API: externe rij kantoor_naam is het slot-label').toBe('🔒 Extern traject (afgeschermd)');
    expect(Object.keys(externLijstRij).filter((k) => /(^|_)code$/.test(k)), 'lijst-API: externe rij zonder codevelden').toEqual([]);
    expect(JSON.stringify(externLijstRij).includes(extern.code), 'lijst-API: externe trajectcode niet in de rij').toBe(false);
    expect(JSON.stringify(externLijstRij).includes(externMarker), 'lijst-API: externe DD-waarde niet in de rij').toBe(false);
    const externTr = page.locator('table:has(#cb-all-mna) > tbody > tr').nth(externIdx[0]);
    await expect(externTr, 'externe rij toont het slot-label').toContainText('Extern traject (afgeschermd)');
    await expect(externTr.locator('.btn-wis-data'), 'externe rij: geen .btn-wis-data').toHaveCount(0);
    await expect(externTr.locator('span[title^="Afgeschermd"]', { hasText: 'Wis data' }), 'externe rij: wisactie alleen als slot').toHaveCount(1);
    await expect(page.locator('.btn-wis-data[data-id="' + extern.code + '"]'), 'nergens een wisknop voor de externe code').toHaveCount(0);
    expect((await page.content()).includes(extern.code), 'externe trajectcode komt nergens in de Marilyn-pagina voor').toBe(false);

    // ── Marilyn: echte wisknop + confirm op het interne traject ──────
    const wisBtn = page.locator('.btn-wis-data[data-id="' + intern.code + '"]');
    await expect(wisBtn, 'intern: wisknop zichtbaar').toBeVisible({ timeout: 10000 });
    await wisBtn.click();
    await page.waitForSelector('#wis-ok', { timeout: 5000 });
    // Standaard-selectie (DD-velden + checklist aangevinkt, documenten/tekenen uit) bewust ongewijzigd
    // gelaten — dit is het meest gebruikte, representatieve pad.
    await expect(page.locator('#wis-dd')).toBeChecked();
    await expect(page.locator('#wis-chk')).toBeChecked();
    await expect(page.locator('#wis-docs')).not.toBeChecked();
    await expect(page.locator('#wis-teken')).not.toBeChecked();
    let dialoog = null;
    page.once('dialog', async (d) => { dialoog = { type: d.type(), tekst: d.message() }; await d.accept(); });
    const wisResp = page.waitForResponse((r) => r.url().includes('/mna/admin/wis-data/' + intern.code) && r.request().method() === 'POST', { timeout: 15000 });
    await page.locator('#wis-ok').click();
    const wr = await wisResp;
    const wrBody = await wr.json().catch(() => null);
    // Expliciet de worker-route: anders zou de UI-fallback (fase-voor-fase /mna/save) een kapotte route maskeren.
    expect(wr.status() === 200 && !!(wrBody && wrBody.ok), 'wis-data via de echte knop: worker-route slaagde').toBe(true);
    await expect(page.locator('#wis-progress'), 'UI meldt Klaar!').toContainText('Klaar!', { timeout: 15000 });
    expect(dialoog && dialoog.type, 'bevestigings-confirm verscheen').toBe('confirm');
    expect(dialoog.tekst, 'confirm noemt DD-velden').toContain('DD-velden');
    expect(dialoog.tekst, 'confirm noemt checklist').toContain('Checklist-statussen');
    expect(dialoog.tekst, 'confirm noemt géén documenten').not.toContain('Geüploade documenten');
    expect(dialoog.tekst, 'confirm noemt géén ondertekeningen').not.toContain('Ondertekeningen');

    // ── Extern: backend-weigering volgens bestaand routecontract ─────
    const weiger = await api('POST', '/mna/admin/wis-data/' + extern.code, { adminKey: ADMIN, body: {} });
    expect(weiger.status, 'backend weigert wis-data op extern traject (403)').toBe(403);
    expect(weiger.json && weiger.json.error, 'weigering met bestaand foutcontract').toBe('Geen toegang tot dit traject');

    // ── Onafhankelijke D1-read ná het wissen ─────────────────────────
    const internNa = d1WisMomentopname(intern.code);
    const internDataNa = JSON.parse(internNa.mna_data || '[]');
    expect(internDataNa.some((r) => String(r.data_json || '').includes(internMarker)), 'D1: intern DD-veld gewist').toBe(false);
    expect(internDataNa.every((r) => leeg(r.data_json) && leeg(r.checklist_json)), 'D1: intern DD-velden + checklist leeg').toBe(true);
    expect(internNa.traject, 'traject zelf blijft bestaan (alleen data gewist, geen traject-verwijdering)').not.toBeNull();
    expect(internNa.traject, 'D1: trajectrij incl. signhost/ondertekeningen/status ongewijzigd').toBe(internVoor.traject);
    expect({ d: internNa.documenten, v: internNa.doc_versies, bi: internNa.bank_imports, br: internNa.bank_regels }, 'D1: documenten/versies/banktransacties ongewijzigd')
      .toEqual({ d: internVoor.documenten, v: internVoor.doc_versies, bi: internVoor.bank_imports, br: internVoor.bank_regels });
    expect(d1WisMomentopname(controle.code), 'D1: tweede eigen controletraject volledig ongewijzigd').toEqual(controleVoor);
    expect(d1WisMomentopname(extern.code), 'D1: extern traject (DD-waarde, logboek, trajectrij) volledig ongewijzigd').toEqual(externVoor);
  } finally {
    // Eerst álle opruimingen, pas daarna de controles — één mislukte expect mag geen fixture laten staan.
    const opruimStatus = {};
    for (const t of [intern, controle]) {
      if (!t || !t.code) continue;
      const r = await api('POST', '/admin/delete/mna/' + t.code, { adminKey: ADMIN });
      opruimStatus[t.code] = r.status;
    }
    if (extern) await ruimGebruikerEnTrajectOp(extern); // staging-testopruiming + testgebruiker
    const codes = [intern, controle, extern].filter((t) => t && t.code).map((t) => t.code);
    for (const code of Object.keys(opruimStatus)) expect(opruimStatus[code], 'cleanup: eigen traject ' + code + ' via /admin/delete/mna/').toBe(200);
    if (codes.length) {
      const lijst = codes.map((c) => "'" + c + "'").join(',');
      const rest = d1('SELECT'
        + ' (SELECT COUNT(*) FROM mna_trajecten WHERE id IN (' + lijst + ')) AS trajecten,'
        + " (SELECT COUNT(*) FROM mna_trajecten WHERE kantoor_naam LIKE '%" + MARKER + " Wis %') AS marker_trajecten,"
        + ' (SELECT COUNT(*) FROM mna_data WHERE traject_id IN (' + lijst + ')) AS data,'
        + ' (SELECT COUNT(*) FROM mna_documenten WHERE traject_id IN (' + lijst + ')) AS documenten,'
        + ' (SELECT COUNT(*) FROM mna_logboek WHERE traject_id IN (' + lijst + ')) AS logboek,'
        + ' (SELECT COUNT(*) FROM mna_platform_akkoord WHERE traject_id IN (' + lijst + ')) AS akkoord')[0] || {};
      expect(rest, 'cleanup: onafhankelijke D1-nultelling operationele fixtures').toEqual({ trajecten: 0, marker_trajecten: 0, data: 0, documenten: 0, logboek: 0, akkoord: 0 });
      // mna_audit blijft bewust bewaard (verwijderTrajectData wist het niet) — historische
      // verwijderregel per fixture expliciet aanwezig, en hier nooit opgeruimd.
      const audit = d1("SELECT code, COUNT(*) AS n FROM mna_audit WHERE code IN (" + lijst + ") AND actie LIKE 'traject_verwijderd%' GROUP BY code");
      expect(codes.filter((c) => !audit.some((a) => a.code === c && Number(a.n) > 0)), 'audit: verwijderregel per fixture bewaard').toEqual([]);
    }
    if (extern && extern.gid) expect(d1CountGebruiker(extern.gid), 'cleanup: externe testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. SECTORPROFIEL OPSLAAN IN MARILYN → MNA.HTML GEBRUIKT DE WIJZIGING
// Hoge blast radius (C3) — elke DD-sessie leunt op dit config-endpoint, nooit getest.
// Bewust een bestaand sectorprofiel met precies 1 extra testveld gewijzigd (niet een volledig
// nieuw sectorprofiel opgebouwd) — kleiner, veiliger, en het bestaande profiel wordt exact
// teruggezet na afloop (disposable, geen blijvende wijziging aan gedeelde config).
// ═══════════════════════════════════════════════════════════════════
test('5. Sectorprofiel opslaan (Marilyn) → mna.html toont het nieuwe veld direct', async ({ page }) => {
  const testVeldId = '_e2e_test_veld_' + Date.now();
  let origineelProfiel = null;
  const t = await maakTraject({ sector: 'itsoftware' });
  try {
    const profResp = await api('GET', '/mna/sectorprofielen');
    origineelProfiel = profResp.json && profResp.json.profielen && profResp.json.profielen.itsoftware;
    expect(origineelProfiel, 'huidig itsoftware-sectorprofiel opgehaald (voor exacte restore later)').toBeTruthy();

    const gewijzigdProfiel = JSON.parse(JSON.stringify(origineelProfiel));
    gewijzigdProfiel.fases[0].dataFields.push({ id: testVeldId, label: 'E2E-testveld ' + MARKER, ph: '', doc: false, req: false, fase: gewijzigdProfiel.fases[0].id });
    const save = await api('POST', '/mna/admin/sectorprofielen', { adminKey: ADMIN, body: { profielen: { itsoftware: gewijzigdProfiel } } });
    expect(save.json && save.json.ok, 'sectorprofiel opgeslagen via het admin-endpoint (Marilyn Sectoren-tab gebruikt dezelfde route)').toBe(true);

    await loginMna(page, t.code);
    await page.waitForFunction(() => window.S && S.traject, null, { timeout: 10000 });
    await page.evaluate((faseId) => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === faseId); renderApp(); }, gewijzigdProfiel.fases[0].id);
    await expect(page.getByText('E2E-testveld ' + MARKER), 'nieuw sectorprofielveld direct zichtbaar in mna.html, zonder herdeploy').toBeVisible({ timeout: 10000 });
  } finally {
    if (origineelProfiel) {
      const restore = await api('POST', '/mna/admin/sectorprofielen', { adminKey: ADMIN, body: { profielen: { itsoftware: origineelProfiel } } });
      expect(restore.json && restore.json.ok, 'cleanup: itsoftware-sectorprofiel exact teruggezet').toBe(true);
      const controle = await api('GET', '/mna/sectorprofielen');
      const terug = controle.json && controle.json.profielen && controle.json.profielen.itsoftware;
      const nogAanwezig = terug && terug.fases[0].dataFields.some((f) => f.id === testVeldId);
      expect(nogAanwezig, 'cleanup: testveld niet meer aanwezig in het herstelde profiel').toBe(false);
    }
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6. adv.html MFA-LOGIN
// BELANGRIJKE BEPERKING (zie eindrapport): de MFA-code wordt uitsluitend per e-mail bezorgd en
// als PBKDF2-hash (dezelfde trage, dure hashfunctie als wachtwoorden) in D1 opgeslagen — niet
// terug te lezen of praktisch te brute-forcen (900.000 mogelijke 6-cijferige codes × PBKDF2-
// iteraties). Zonder echte e-mailtoegang of een nieuwe test-backdoor (bewust niet gebouwd, zie
// eindrapport) is het POSITIEVE pad (juiste code → sessie) niet automatiseerbaar. Deze test dekt
// daarom het WEL betrouwbaar testbare deel: dat MFA daadwerkelijk wordt afgedwongen (geen
// sessie zonder correcte code) en dat een foutieve code correct wordt geweigerd.
// ═══════════════════════════════════════════════════════════════════
test('6. adv.html MFA: wordt afgedwongen, foutieve code correct geweigerd (positief pad niet automatiseerbaar — zie rapport)', async ({ page }) => {
  const email = 'e2e-mfa-' + Date.now() + '@bisschopsfinancing.test';
  let gid = null;
  try {
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: '🔒 ' + MARKER + ' MFA', bedrijf: '🔒 ' + MARKER + ' MFA BV', email } });
    gid = uit.json && uit.json.id;
    expect(gid, 'testgebruiker aangemaakt').toBeTruthy();
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    // MFA bewust AAN laten (geen zetMfaUitVoorTest) — dat is precies het pad dat deze test dekt.

    await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
    await page.locator('#l-e').fill(email);
    await page.locator('#l-w').fill(WW);
    const loginResp = page.waitForResponse((r) => r.url().includes('/adviseur/trajecten') && r.request().method() === 'POST', { timeout: 15000 });
    await page.locator('#l-btn').click();
    const lr = await loginResp;
    const lrBody = await lr.json().catch(() => null);
    expect(lrBody && lrBody.mfa_required, 'wachtwoord alleen geeft GEEN sessie — mfa_required:true').toBe(true);
    expect(lrBody.mfa_token, 'mfa_token ontvangen').toBeTruthy();

    // UI toont daadwerkelijk het MFA-codescherm.
    await expect(page.locator('#m-c')).toBeVisible({ timeout: 10000 });

    // Foutieve code moet geweigerd worden (negatief pad, wél volledig automatiseerbaar).
    const verifyResp = await api('POST', '/adviseur/mfa/verify', { body: { mfa_token: lrBody.mfa_token, code: '000000' } });
    expect(verifyResp.status, 'foutieve MFA-code → geweigerd (niet 200)').not.toBe(200);
    expect(verifyResp.json && verifyResp.json.ok, 'foutieve MFA-code → ok:true blijft uit').not.toBe(true);

    // Onbekend/verlopen mfa_token wordt ook geweigerd (defensieve check).
    const verifyOnbekend = await api('POST', '/adviseur/mfa/verify', { body: { mfa_token: 'niet-bestaand-token', code: '123456' } });
    expect(verifyOnbekend.status, 'onbekend mfa_token → geweigerd').not.toBe(200);
  } finally {
    if (gid) await verwijderTestGebruiker(gid, ADMIN);
    if (gid) expect(d1CountGebruiker(gid), 'cleanup: testgebruiker weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 7. BEGELEIDER: CONSOLIDATIEKEUZE GROEPSCIJFER
// Bekende historische bugklasse (S._groepData, CLAUDE.md) — nooit een live-UI-regressietest.
// ═══════════════════════════════════════════════════════════════════
test('7. Begeleider: consolidatiekeuze bij afwijkend groepscijfer — D1-geverifieerd', async ({ page }) => {
  test.setTimeout(45000); // meer sequentiële staging-round-trips dan de andere tests (2 entiteiten + 2 saves + login); 30s globaal timeout was te krap
  const t = await maakTraject();
  try {
    // Twee entiteiten aanmaken (holding + werkmaatschappij) als verkoper. Bevestigd via broncode
    // (worker/07-mna-groepen.js): het veld heet `rol` ('holding'/'werkmaatschappij', niet
    // is_holding), en GET /mna/entiteiten/:code geeft een kale array terug, geen {entiteiten:[...]}.
    const holding = await api('POST', '/mna/entiteiten/' + t.code, { body: { naam: 'Holding ' + MARKER, kvk: '11111111', rol: 'holding' } });
    expect(holding.json && holding.json.ok, 'holding-entiteit aangemaakt').toBe(true);
    const werkm = await api('POST', '/mna/entiteiten/' + t.code, { body: { naam: 'Werkmij ' + MARKER, kvk: '22222222', rol: 'werkmaatschappij' } });
    expect(werkm.json && werkm.json.ok, 'werkmaatschappij-entiteit aangemaakt').toBe(true);
    const lijst = await api('GET', '/mna/entiteiten/' + t.code);
    const werkmEntiteit = (Array.isArray(lijst.json) ? lijst.json : []).find((e) => e.rol !== 'holding');
    expect(werkmEntiteit, 'werkmaatschappij terugvindbaar').toBeTruthy();

    // Bewust fase 'commercieel', NIET 'financieel': fase Financieel is voor de begeleider volledig
    // read-only (12 sep 2026-besluit) — de consolidatiekeuze-knoppen zijn daar client-side verborgen,
    // ook al zou de discrepantie zelf wel gedetecteerd worden. aantalKlanten (numeriek veld) is
    // representatief. Entiteit-niveau = 100; groepsniveau (aangeleverd) = 150 — ruim boven de 5%-
    // drempel in consolideerFase() (cloudflare-worker.js). Volgorde is kritiek: consolideerFase()
    // herberekent uitsluitend bij een save MET entiteit_id (worker/11-mna-tekenen-beheer.js) — de
    // groepswaarde moet dus al staan vóórdat de entiteits-save gebeurt.
    const groepSave = await api('POST', '/mna/save', { body: { code: t.code, fase_id: 'commercieel', data_json: { aantalKlanten: { label: 'Aantal actieve klanten', value: '150' } } } });
    expect(groepSave.json && groepSave.json.ok, 'groepsniveau (aangeleverd) opgeslagen').toBe(true);
    const entiteitSave = await api('POST', '/mna/save', { body: { code: t.code, fase_id: 'commercieel', entiteit_id: werkmEntiteit.id, data_json: { aantalKlanten: { label: 'Aantal actieve klanten', value: '100' } } } });
    expect(entiteitSave.json && entiteitSave.json.ok, 'entiteitsniveau-waarde opgeslagen (triggert consolideerFase())').toBe(true);

    // VOK vooraf tekenen (zelfde precedent als e2e-3rollen-regressie.spec.js) — anders blokkeert de
    // verplichte VOK-popup (mna/04, toonVOKPopup) een echte klik overal op de pagina, ook al lijkt de
    // onderliggende knop zelf gewoon zichtbaar in de accessibility tree.
    await api('POST', '/mna/vok/teken', { body: { code: t.tussenCode, naam: 'E2E Test Begeleider', versie: VOK_VERSIE, email: t.email } });

    await loginMna(page, t.tussenCode);
    await page.waitForFunction(() => window.S && S.traject, null, { timeout: 10000 });
    await page.waitForTimeout(2000); // loadEntiteiten() (async, ná login) moet eerst zijn eigen auto-selectie hebben gedaan
    // Met precies 1 werkmaatschappij selecteert loadEntiteiten() die bij login automatisch als
    // actieve entiteit — de consolidatiekeuze-UI toont zich uitsluitend op de groepsweergave
    // (S._actieveEntiteit leeg), dus expliciet terugschakelen.
    await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'commercieel'); switchEntiteit(''); renderApp(); });
    await page.waitForTimeout(500);
    const consolTekst = page.getByText(/Gebruik som van entiteiten/);
    await expect(consolTekst.first(), 'consolidatie-discrepantie correct gedetecteerd en getoond').toBeVisible({ timeout: 10000 });
    await consolTekst.first().click();
    await page.waitForTimeout(1200);

    const rij = d1("SELECT data_json FROM mna_data WHERE traject_id='" + t.code + "' AND fase_id='commercieel' AND entiteit_id IS NULL");
    const dj = rij[0] && JSON.parse(rij[0].data_json || '{}');
    expect(dj && dj.aantalKlanten && dj.aantalKlanten.value, 'D1: groepscijfer overschreven met de som van entiteiten (100, niet meer 150)').toBe('100');
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8. VERKOPER: DOCUMENT VERWIJDEREN (destructief pad)
// ═══════════════════════════════════════════════════════════════════
test('8. Verkoper: geüpload document verwijderen — D1-geverifieerd, weg uit dataroom', async ({ page }) => {
  const t = await maakTraject();
  try {
    const csv = 'Datum,Omschrijving,Bedrag\n01-01-2026,E2E testregel ' + MARKER + ',1000\n';
    const base64 = Buffer.from(csv).toString('base64');
    // /mna/document/upload-base64 (worker/14-document-upload-analyse.js) is een eigen, non-multipart
    // route (Bot Fight Mode-omzeiling): body is URL-encoded met één veld `data` dat de JSON-payload
    // bevat, en het bestandsveld heet `base64` — niet een gewone JSON-body zoals andere endpoints.
    // Deze route doet zelf geen AI-extractie (die zit alleen in /mna/document/upload), dus geen aparte
    // "alleen bewijsstuk"-vlag nodig om AI-kosten te vermijden.
    const uploadResp = await fetch(WORKER + '/mna/document/upload-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(JSON.stringify({ code: t.code, fase_id: 'commercieel', bestand_naam: 'e2e-test-verwijderen.csv', base64 })),
    });
    const upload = { status: uploadResp.status, json: await uploadResp.json().catch(() => null) };
    expect(upload.json && upload.json.ok, 'document geüpload (upload-base64, geen AI-extractie in deze route)').toBe(true);
    const docId = upload.json.id;
    expect(docId, 'document-id ontvangen').toBeTruthy();
    const voorRij = d1("SELECT count(*) as n FROM mna_documenten WHERE id='" + docId + "'");
    expect(voorRij[0] && Number(voorRij[0].n), 'D1: document staat er vóór verwijderen').toBe(1);

    await loginMna(page, t.code);
    await page.waitForFunction(() => window.S && S.traject, null, { timeout: 10000 });
    // Bewust een échte klik op de fase-tab i.p.v. S.fase direct te zetten: alleen de klik-handler op
    // de tab (data-fi, mna/06-schermen.js) roept loadDocsForFase() aan — dat gebeurt niet vanuit een
    // kale renderApp(), dus het geüploade document zou anders nooit in DOCS[faseId] terechtkomen.
    await page.evaluate(() => { S.screen = 'main'; renderApp(); });
    const faseIndex = await page.evaluate(() => FASES.findIndex((f) => f.id === 'commercieel'));
    await page.locator('.fase-card[data-fi="' + faseIndex + '"]').click();
    await expect(page.getByText('e2e-test-verwijderen.csv').first()).toBeVisible({ timeout: 10000 });
    page.once('dialog', (d) => d.accept());
    await page.evaluate((id) => { deleteDocument(id, 'commercieel'); }, docId);
    await page.waitForTimeout(1200);

    const naRij = d1("SELECT count(*) as n FROM mna_documenten WHERE id='" + docId + "'");
    expect(naRij[0] && Number(naRij[0].n), 'D1: document daadwerkelijk verwijderd').toBe(0);
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 9. KOPER Q&A-TEGENVOORSTEL → BEGELEIDER ACCEPTEERT/WIJST AF
// Alleen het "vraag"-basispad was al gedekt (e2e-3rollen K4) — dit sluit het tegenvoorstel- en
// besluit-pad aan, dat een apart type + apart backend-veld (status) gebruikt.
// ═══════════════════════════════════════════════════════════════════
test('9. Koper Q&A-tegenvoorstel, begeleider accepteert; los tegenvoorstel wordt afgewezen', async ({ page }) => {
  test.setTimeout(45000); // vrijgeven + 2x Q&A-post + login + 2 echte klikken als begeleider; 30s globaal timeout was te krap (zie test 7)
  const t = await maakTraject();
  try {
    await api('POST', '/mna/admin/vrijgeven/' + t.code + '?force=1', { adminKey: ADMIN });

    const voorstelA = await api('POST', '/mna/qa/' + t.code, { body: { vraag: 'Tegenvoorstel A — ' + MARKER, fase_id: 'financieel', type: 'voorstel', bedrag: '2750000', gesteld_door: 'E2E Koper' } });
    expect(voorstelA.json && voorstelA.json.ok, 'tegenvoorstel A ingediend door koper').toBe(true);
    const voorstelB = await api('POST', '/mna/qa/' + t.code, { body: { vraag: 'Tegenvoorstel B — ' + MARKER, fase_id: 'financieel', type: 'voorstel', bedrag: '2500000', gesteld_door: 'E2E Koper' } });
    expect(voorstelB.json && voorstelB.json.ok, 'tegenvoorstel B ingediend door koper').toBe(true);

    // VOK vooraf tekenen (zelfde precedent als test 7) — anders blokkeert de verplichte VOK-popup
    // elke echte klik in het begeleider-dashboard.
    await api('POST', '/mna/vok/teken', { body: { code: t.tussenCode, naam: 'E2E Test Begeleider', versie: VOK_VERSIE, email: t.email } });

    await loginMna(page, t.tussenCode);
    await page.waitForFunction(() => window.S && S.traject, null, { timeout: 10000 });
    await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'financieel'); renderApp(); });
    await page.waitForFunction(() => document.querySelectorAll('.qa-ant-btn').length > 0, null, { timeout: 10000 });

    // Bewust op het exacte qId van elk voorstel targeten (bekend uit de API-respons hierboven), niet
    // op .first(): een klik triggert in de app zelf een async POST + qaLaad()-herrender
    // (mna/06-schermen.js) die de knoppenlijst herbouwt. Bij trage staging-respons (zoals gebeurde
    // toen deze test ná de andere 8 in serie draaide) kon een blinde .first()-selector voor de
    // tweede klik dezelfde, nog niet ververste rij raken als de eerste — twee gelijktijdige
    // status-writes op hetzelfde Q&A-id, waarbij de laatste wint en het andere voorstel nooit
    // beantwoord werd. Op het echte id klikken maakt dit deterministisch, ongeacht renderstiming.
    const acceptId = voorstelA.json.id;
    const afwijsId = voorstelB.json.id;
    const acceptResp = page.waitForResponse((r) => r.url().includes('/mna/admin/qa/antwoord/' + acceptId) && r.request().method() === 'POST');
    await page.locator('.qa-ant-btn[data-id="' + acceptId + '"][data-status="geaccepteerd"]').click();
    await acceptResp;
    await page.waitForTimeout(500); // qaLaad()-herrender na de respons laten voltooien

    const afwijsResp = page.waitForResponse((r) => r.url().includes('/mna/admin/qa/antwoord/' + afwijsId) && r.request().method() === 'POST');
    await page.locator('.qa-ant-btn[data-id="' + afwijsId + '"][data-status="afgewezen"]').click();
    await afwijsResp;
    await page.waitForTimeout(500);

    const rijen = d1("SELECT id, status FROM mna_qa WHERE traject_id='" + t.code + "' ORDER BY id ASC");
    expect(rijen.length, 'beide tegenvoorstellen aanwezig in D1').toBe(2);
    const statussen = rijen.map((r) => r.status).sort();
    expect(statussen, 'D1: exact één geaccepteerd + één afgewezen, geen kruisbesmetting').toEqual(['afgewezen', 'geaccepteerd']);
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
  }
});
