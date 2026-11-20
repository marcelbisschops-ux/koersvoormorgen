// KVM-009 A1 (20-11-2026): kopersbanner in het echte koperportaal (mna.html) tegen de staging-Worker.
// Drie situaties: vóór NDA (eigen NDA-stap), na NDA met eigen taak (bod), na het bod met een open vraag bij de verkoper (ander aan zet).
// Fictieve gegevens, .invalid-adressen, geen e-mail; ruimt op.
import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, ruimTrajectOp, accepteerPlatformvoorwaarden, IS_STAGING_WORKER } from './lib.mjs';

const ADMIN = leesAdminKey();
const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
let T = null;

test.describe('KVM-009 kopersbanner', () => {
  test.skip(!IS_STAGING_WORKER || !ADMIN, 'alleen tegen staging met beheersleutel');
  test.beforeAll(async () => {
    const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth KB ' + Date.now() + ' B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'kb@kvm-test.invalid', koper_naam: 'Synth Koper KB' } });
    T = { V: c.json.code, K: c.json.koper_code, B: c.json.tussen_code };
    await accepteerPlatformvoorwaarden([T.V, T.K, T.B]);
  });
  test.afterAll(async () => { if (T) await ruimTrajectOp(T.V, ADMIN); });

  const koperLogin = async (page) => {
    await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
    await page.locator('#l-code').fill(T.K);
    await page.locator('#l-btn').click();
    await page.waitForFunction(() => window.S && S.rol === 'koper', null, { timeout: 15000 });
    const banner = page.locator('#jr-portaal .jr-kopersbanner');
    await expect(banner).toBeVisible({ timeout: 20000 });
    return banner;
  };

  test('vóór NDA: eigen NDA-stap met knop', async ({ page }) => {
    const b = await koperLogin(page);
    await expect(b).toContainText('Uw volgende stap');
    await expect(b).toContainText(/NDA|geheimhouding/i);
    await expect(b.locator('[data-jr-actie="koper-nda"]')).toBeVisible();
    await expect(b).not.toContainText('Synth KB');
  });

  test('na NDA met eigen taak: volgende stap voor de koper', async ({ page }) => {
    d1('UPDATE mna_trajecten SET nda_getekend=' + q('Synth Koper KB (koper)') + ', koper_vrijgegeven=1 WHERE id=' + q(T.V)); // staging-testopzet
    const b = await koperLogin(page);
    await expect(b).toContainText('Uw volgende stap');
    await expect(b.locator('[data-jr-actie]')).toHaveCount(1);
  });

  test('na het bod met open vraag: ander aan zet, koper hoeft niets te doen', async ({ page }) => {
    const bod = await api('POST', '/mna/koper/bod', { body: { code: T.K, bedrag: 1500000, toelichting: 'Synth bod KB' } });
    expect(bod.status).toBe(200);
    // Open vraag van de koper ligt bij de verkoper (staging-testopzet via D1, zodat er geen mail ontstaat; KVM-012).
    d1("INSERT INTO mna_qa (id,traject_id,vraag_nr,vraag,status,gesteld_door,type,created_at) VALUES (" + q('kb-' + Date.now()) + ',' + q(T.V) + ",1,'Synth vraag KB','open','Koper','vraag'," + Date.now() + ')');
    const j = await api('GET', '/mna/journey/' + T.K);
    expect(j.json.volgende_stap, 'koper heeft geen eigen open stap meer').toBeNull();
    expect(j.json.wacht_op && ['begeleider', 'verkoper'].includes(j.json.wacht_op.door)).toBeTruthy();
    const b = await koperLogin(page);
    await expect(b).toContainText(/Aan zet: de (begeleider|verkoper)/);
    await expect(b).toContainText('U hoeft nu niets te doen');
    await expect(b.locator('[data-jr-actie]')).toHaveCount(0);
  });
});
