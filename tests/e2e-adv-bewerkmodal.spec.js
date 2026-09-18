// ══════════════════════════════════════════════════════════════════
// adv.html — Bewerk-modal stale-cache-regressietest (18 sep 2026)
//
// Minimale, reproduceerbare test voor commit cd7abf8 ("Fix: Bewerk-modal in adv.html las stale
// cache, kon data overschrijven") + de vervolgfix op het Annuleren-pad. Reproduceert het exacte
// scenario uit de commit-boodschap: een adviseur maakt een nieuw traject aan, opent DIRECT
// daarna (zonder page-reload) "Bewerk gegevens", en verwacht de zojuist ingevulde koper-/
// adresgegevens terug te zien — niet leeg (wat vóór de fix tot een blinde overschrijving met lege
// waarden zou hebben geleid bij op Opslaan klikken, zie worker/16-adviseur.js `/adviseur/traject/
// update/{id}`: een kale UPDATE zonder merge-logica).
//
// Test ook expliciet het Annuleren-pad: await ververs() in toonAdvBewerkModal() roept intern
// renderDashboard() aan (VIEW='dashboard'), wat vóór de vervolgfix betekende dat Annuleren de
// gebruiker op de trajectenlijst liet staan i.p.v. terug op de detailpagina.
//
// Draaien: ADMIN_KEY=... WORKER_URL=https://kantoorinzicht-staging... npx playwright test tests/e2e-adv-bewerkmodal.spec.js
// (via tests/run-rolflows.sh voor de staging-veiligheidsgrens, of los met de env-vars hierboven.)
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, zetMfaUitVoorTest } from './lib.mjs';

const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
const IS_STANDAARD_PRODUCTIE = WORKER === 'https://kantoorinzicht.marcel-bisschops.workers.dev';

if (IS_STANDAARD_PRODUCTIE) {
  throw new Error('tests/e2e-adv-bewerkmodal.spec.js weigert te draaien tegen productie (WORKER_URL). Zet WORKER_URL op de staging-worker.');
}

test.describe('adv.html — Bewerk-modal: stale cache na aanmaken + Annuleren-navigatie', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — deze test overgeslagen');

  let email, gid;
  let trajectCode = null;
  let setupOk = false;

  test.beforeAll(async () => {
    email = 'e2e-adv-bewerk-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'E2E AdvBewerk', bedrijf: 'E2E AdvBewerk BV', email } });
    gid = uit.json && uit.json.id;
    const token = uit.json && uit.json.token;
    if (!gid || !token) return;
    await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    // MFA uit voor dit testaccount (zie tests/lib.mjs) — anders blijft /adviseur/trajecten
    // (het login-endpoint) op mfa_required staan en kan deze UI-test niet inloggen.
    zetMfaUitVoorTest(email);
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 3, modules: { traject: true } } });
    setupOk = true;
  });

  test.afterAll(async () => {
    if (trajectCode) await api('POST', '/admin/delete/mna/' + trajectCode, { adminKey: ADMIN });
    if (gid) await api('POST', '/gebruikers/verwijder/' + gid, { adminKey: ADMIN, body: {} });
  });

  test('nieuw traject aanmaken + direct Bewerk gegevens toont echte data, Annuleren keert terug naar detail', async ({ page }) => {
    test.skip(!setupOk, 'Setup mislukt — zie beforeAll');
    const koperMarker = 'E2E-STALE-KOPER-' + Date.now();
    const adresMarker = 'E2E-STALE-ADRES-' + Date.now();
    const kantoorNaam = 'E2E AdvBewerk Traject ' + Date.now() + ' BV';

    await page.goto('/adv.html?worker=' + encodeURIComponent(WORKER));
    await page.locator('#l-e').fill(email);
    await page.locator('#l-w').fill(WW);
    await page.locator('#l-btn').click();
    await expect(page.getByRole('button', { name: '+ Nieuw traject' })).toBeVisible({ timeout: 15000 });

    // ── Nieuw traject aanmaken, met koper_naam + verkoper_adres als stale-cache-merktekens ──
    // (dit zijn precies de twee velden die WEL naar /adviseur/create gaan maar NIET in de
    // client-side G.trajecten.unshift(...)-cache belanden — zie adv.html:998.)
    await page.getByRole('button', { name: '+ Nieuw traject' }).click();
    await page.locator('#n-naam').fill(kantoorNaam);
    await page.locator('#n-contact').fill('E2E Test Contact');
    await page.locator('#n-email').fill('contact-' + Date.now() + '@bisschopsfinancing.test');
    await page.locator('#n-adres').fill(adresMarker);
    await page.locator('#n-koper-naam').fill(koperMarker);
    const createResp = page.waitForResponse(r => r.url().includes('/adviseur/create') && r.request().method() === 'POST', { timeout: 15000 });
    await page.locator('#n-maak').click();
    const cr = await createResp;
    const crBody = await cr.json().catch(() => null);
    expect(crBody && crBody.ok, 'traject succesvol aangemaakt').toBe(true);
    trajectCode = crBody && crBody.code;
    expect(trajectCode, 'trajectcode ontvangen (nodig voor cleanup)').toBeTruthy();

    // "Annuleren" heet ná een geslaagde aanmaak "Sluiten" (zie adv.html ge('n-ann').textContent='Sluiten')
    // — dit verwijdert alleen de modal-overlay, ZONDER de onderliggende dashboardtabel opnieuw te
    // renderen (renderDashboard() wordt hier niet nogmaals aangeroepen). De net aangemaakte rij staat
    // dus nog niet zichtbaar in de tabel op dat moment — exact de reden waarom deze test openTraject()
    // direct aanroept i.p.v. op een (nog niet gerenderde) tabelrij te klikken; functioneel identiek aan
    // een klik op de rij zodra die wél zichtbaar zou zijn, en gebruikt dezelfde (stale) G.trajecten-cache.
    await page.locator('#n-ann').click();

    // ── Direct doorklikken naar de detailpagina van het NET aangemaakte traject ──
    await page.evaluate((id) => { openTraject(id); }, trajectCode);
    await expect(page.getByText('← Terug naar overzicht')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bewerk gegevens')).toBeVisible({ timeout: 10000 });

    // ── Bewerk gegevens openen: DIT is het exacte moment uit de bugmelding ──
    await page.getByText('Bewerk gegevens').click();
    await expect(page.locator('#bw-koper-naam')).toBeVisible({ timeout: 10000 });
    const koperVal = await page.locator('#bw-koper-naam').inputValue();
    const adresVal = await page.locator('#bw-adres').inputValue();
    expect(koperVal, 'koper_naam mag niet leeg zijn direct na aanmaken (stale-cache-bug, commit cd7abf8)').toBe(koperMarker);
    expect(adresVal, 'verkoper_adres mag niet leeg zijn direct na aanmaken').toBe(adresMarker);

    // ── Annuleren moet terugkeren naar de detailpagina, niet naar de trajectenlijst ──
    await page.locator('#bw-ann').click();
    await expect(page.getByText('← Terug naar overzicht'), 'na Annuleren staan we weer op de detailpagina, niet op de trajectenlijst').toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '+ Nieuw traject' }), 'de trajectenlijst-knop hoort NIET zichtbaar te zijn op de detailpagina').toHaveCount(0);

    // ── Onafhankelijke server-side verificatie: de waarden staan ook echt in de database ──
    const na = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
    const rij = na.json && Array.isArray(na.json.trajecten) && na.json.trajecten.find(t => t.id === trajectCode);
    expect(rij && rij.koper_naam, 'server bevestigt koper_naam (onafhankelijk van de UI-cache)').toBe(koperMarker);
    expect(rij && rij.verkoper_adres, 'server bevestigt verkoper_adres').toBe(adresMarker);
  });
});
