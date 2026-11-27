// KVM-009 B1 (20-11-2026): "Mijn overeenkomsten" in het koperportaal (mna.html) tegen de staging-Worker.
// Positief: de koper ziet zijn eigen verstuurde overeenkomsten met status. Negatief: een overeenkomst die
// alleen aan de verkoper is gericht, of die nog niet verstuurd is, verschijnt niet; de verkoper krijgt het blok niet.
// Fictieve gegevens, .invalid-adressen, geen e-mail (documenten via D1 klaargezet); ruimt op.
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, ruimTrajectOp, accepteerPlatformvoorwaarden, IS_STAGING_WORKER } from './lib.mjs';

const ADMIN = leesAdminKey();
const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
let T = null;

const zetDoc = (id, profiel, status, adressaten) => {
  const nu = Date.now();
  d1('INSERT INTO tos_document (id,traject_id,profile_id,profile_version,doc_type,status,current_version,created_by,created_at,updated_at,adressaten_json,verstuurd_op) VALUES ('
    + [q(id), q(T.V), q(profiel), 1, q(profiel.toLowerCase()), q(status), 1, q('begeleider'), nu, nu, q(JSON.stringify(adressaten)), status === 'draft' ? 'NULL' : nu].join(',') + ')');
};

test.describe('KVM-009 Mijn overeenkomsten', () => {
  test.skip(!IS_STAGING_WORKER || !ADMIN, 'alleen tegen staging met beheersleutel');
  test.beforeAll(async () => {
    const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth MO ' + Date.now() + ' B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'mo@kvm-test.invalid', koper_naam: 'Synth Koper MO' } });
    T = { V: c.json.code, VL: c.json.verkoper_inlogcode || c.json.code, K: c.json.koper_code, B: c.json.tussen_code }; // N-120 batch F: V = traject-ID, VL = verkoper-inlogcode
    await accepteerPlatformvoorwaarden([T.VL, T.K, T.B]);
    d1('UPDATE mna_trajecten SET koper_vrijgegeven=1 WHERE id=' + q(T.V)); // staging-testopzet
  });
  test.afterAll(async () => {
    if (!T) return;
    d1('DELETE FROM tos_document WHERE traject_id=' + q(T.V));
    await ruimTrajectOp(T.V, ADMIN);
  });

  const login = async (page, code, rol) => {
    await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
    await page.locator('#l-code').fill(code);
    await page.locator('#l-btn').click();
    await page.waitForFunction((r) => window.S && S.rol === r, rol, { timeout: 15000 });
    await expect(page.locator('#jr-portaal')).toBeAttached({ timeout: 20000 });
  };

  test('zonder verstuurde overeenkomsten: nette lege melding', async ({ page }) => {
    await login(page, T.K, 'koper');
    const blok = page.locator('#koper-overeenkomsten');
    await expect(blok).toContainText('Mijn overeenkomsten', { timeout: 15000 });
    await expect(blok).toContainText('nog geen overeenkomst');
    await expect(blok.locator('.mo-rij')).toHaveCount(0);
  });

  test('alleen eigen, verstuurde overeenkomsten met status; Bekijk springt naar het document', async ({ page }) => {
    const p = 'mo' + Date.now();
    zetDoc(p + 'a', 'NDA', 'verstuurd', ['verkoper', 'koper']);
    zetDoc(p + 'b', 'LOI', 'goedgekeurd', ['koper']);
    zetDoc(p + 'c', 'BEM', 'verstuurd', ['verkoper']); // negatief: niet aan de koper gericht
    zetDoc(p + 'd', 'MOU', 'draft', ['koper']); // negatief: nog niet verstuurd
    await login(page, T.K, 'koper');
    const blok = page.locator('#koper-overeenkomsten');
    await expect(blok.locator('.mo-rij')).toHaveCount(2, { timeout: 15000 });
    await expect(blok).toContainText('Geheimhoudingsovereenkomst (NDA)');
    await expect(blok).toContainText('Wacht op uw reactie');
    await expect(blok).toContainText('Letter of Intent');
    await expect(blok).toContainText('Akkoord');
    await expect(blok).not.toContainText('Bemiddelingsovereenkomst');
    await expect(blok).not.toContainText('Memorandum');
    const knop = blok.locator('.mo-rij', { hasText: 'Letter of Intent' }).locator('.mo-bekijk');
    await expect(knop).toHaveAttribute('data-mo-doel', 'composer-loi-slot');
    await expect(page.locator('#composer-loi-slot')).toBeAttached();
    await knop.click();
  });

  test('verkoper krijgt het blok niet', async ({ page }) => {
    d1('UPDATE mna_trajecten SET opening_voltooid=1 WHERE id=' + q(T.V)); // staging-testopzet: openingsscherm al doorlopen
    await login(page, T.VL, 'verkoper');
    await expect(page.locator('#koper-overeenkomsten')).toHaveCount(0);
  });
});
