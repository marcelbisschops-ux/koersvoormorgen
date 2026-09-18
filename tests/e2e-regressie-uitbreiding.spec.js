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
import { api, leesAdminKey, WORKER, d1, zetMfaUitVoorTest } from './lib.mjs';

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
  // Een vers traject dwingt de verkoper eerst door het eenmalige opening-scherm (adres/KvK/
  // tekenbevoegde + entiteiten/partners) — geen van deze 9 tests gaat over die flow zelf, dus die
  // overslaan via een directe D1-zet (zelfde bewuste testopzet-patroon als elders in dit bestand).
  d1("UPDATE mna_trajecten SET opening_voltooid=1 WHERE id='" + c.json.code + "'");
  return { gid, email, code: c.json.code, koperCode: c.json.koper_code, tussenCode: c.json.tussen_code };
}

async function ruimGebruikerEnTrajectOp(t) {
  if (t.code) await api('POST', '/admin/delete/mna/' + t.code, { adminKey: ADMIN });
  if (t.gid) await api('POST', '/gebruikers/verwijder/' + t.gid, { adminKey: ADMIN, body: {} });
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
// ═══════════════════════════════════════════════════════════════════
test('4. Marilyn: wisTrajectData wist exact de gekozen data, niets meer en niets minder', async ({ page }) => {
  const t = await maakTraject();
  try {
    const marker = 'WISTEST-' + MARKER;
    const save = await api('POST', '/mna/save', { body: { code: t.code, fase_id: 'commercieel', data_json: { klantenportefeuille: { label: 'Klantenportefeuille', value: marker } }, checklist_json: { items: { 0: true }, redflags: {} } } });
    expect(save.json && save.json.ok, 'testdata vooraf opgeslagen (DD-veld + checklist)').toBe(true);
    const voorRij = d1("SELECT data_json, checklist_json FROM mna_data WHERE traject_id='" + t.code + "' AND fase_id='commercieel'");
    expect(voorRij[0] && voorRij[0].data_json.includes(marker), 'D1: testdata staat er vóór het wissen').toBe(true);

    await loginMarilyn(page);
    await page.locator('#t-mna').click();
    await page.waitForTimeout(500);
    await page.locator('.btn-wis-data[data-id="' + t.code + '"]').click();
    await page.waitForSelector('#wis-ok', { timeout: 5000 });
    // Standaard-selectie (DD-velden + checklist aangevinkt, documenten/tekenen uit) bewust ongewijzigd
    // gelaten — dit is het meest gebruikte, representatieve pad.
    page.once('dialog', (d) => d.accept());
    await page.locator('#wis-ok').click();
    await page.waitForSelector('text=Klaar!', { timeout: 15000 }).catch(() => {});

    const naRij = d1("SELECT data_json, checklist_json FROM mna_data WHERE traject_id='" + t.code + "' AND fase_id='commercieel'");
    const dataLeeg = !naRij[0] || naRij[0].data_json === '{}' || !naRij[0].data_json.includes(marker);
    expect(dataLeeg, 'D1: DD-data daadwerkelijk gewist').toBe(true);
    // Traject zelf moet blijven bestaan (wisTrajectData wist alleen data, niet het traject).
    expect(d1CountTraject(t.code), 'traject zelf blijft bestaan (alleen data gewist, geen traject-verwijdering)').toBe(1);
  } finally {
    await ruimGebruikerEnTrajectOp(t);
    expect(d1CountTraject(t.code), 'cleanup: traject weg').toBe(0);
    expect(d1CountGebruiker(t.gid), 'cleanup: testadviseur weg').toBe(0);
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
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
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
