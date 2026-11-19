// ══════════════════════════════════════════════════════════════════
// TEST-ONLY DIAGNOSE (23 sep 2026) — GEEN regressietest, GEEN onderdeel van het standaard
// releasepad. Doel: exact ÉÉN geïsoleerde meting voorbereiden voor Breaker-onderzoek naar de
// melding dat de loginroute soms HTTP 200 geeft zonder traject/sessie, omdat
// `platform_voorwaarden_akkoord` op dat moment niet als waar wordt gelezen. Dit bestand BEWIJST
// NIETS over de oorzaak — het meet uitsluitend de server-gerapporteerde acceptatiestatus
// (status/akkoord/versie) direct ná acceptatie en opnieuw na een korte, vaste wachttijd, voor
// verkoper/koper/begeleider, en legt dat vast in een lokaal testrapport.
//
// Geen productiecode, backendcode, beveiligingsgate, limiet of voorwaarde wordt hier gewijzigd.
// Geen herhaalreeks/retry-lus: elke rol wordt precies twee keer gelezen (direct + na wachttijd),
// niet vaker (werkregel 40, TEST ECONOMY). Geen live data — uitsluitend een nieuw, fictief
// testtrajectset via de bestaande veilige setup (zelfde patroon als
// tests/e2e-3rollen-regressie.spec.js), en altijd via de bestaande veilige cleanup opgeruimd.
//
// Selectief draaien (uitsluitend deze meting, niets anders):
//   npx playwright test tests/diag-platformacceptatie-timing.spec.js --grep "@platformacceptatie-timing-diagnose-eenmalig"
// Vereist ADMIN_KEY (env of --key=, zie lib.mjs) en WORKER_URL tegen staging — nooit productie
// (harde guard hieronder, zelfde mechanisme als tests/e2e-3rollen-regressie.spec.js).
// ══════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { api, leesAdminKey, WORKER, d1, ruimTrajectOp, verwijderTestGebruiker } from './lib.mjs';
import fs from 'fs';
import path from 'path';

const ADMIN = leesAdminKey();
const WW = 'TestWachtwoord123!';
const IS_STANDAARD_PRODUCTIE = WORKER === 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const MARKER = 'DIAG-PVW-TIMING-' + Date.now();
const WACHTTIJD_MS = 3000; // korte, vaste wachttijd — geen retry-lus, geen oplopende reeks.

// Harde veiligheidsgrens: deze diagnose maakt een echt (fictief) traject en account aan en hoort
// dus nooit tegen productie te draaien, ook niet per ongeluk (zelfde patroon als de 3-rollen-test).
if (IS_STANDAARD_PRODUCTIE) {
  throw new Error('tests/diag-platformacceptatie-timing.spec.js weigert te draaien tegen productie (WORKER_URL). Zet WORKER_URL op de staging-worker — zie tests/run-rolflows.sh.');
}

test.describe('DIAGNOSE · Platformacceptatie-timing (eenmalig, staging-only, test-only)', () => {
  test.skip(!ADMIN, 'Geen admin-key (ADMIN_KEY / --key=) — diagnose overgeslagen');

  let email, gid, verkoperCode, koperCode, tussenCode, trajectCode;
  let setupOk = false;

  // ── Bestaande veilige setup (zelfde stappen als tests/e2e-3rollen-regressie.spec.js:beforeAll) ──
  test.beforeAll(async () => {
    email = 'diag-pvw-timing-' + Date.now() + '@bisschopsfinancing.test';
    const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: '🔒 ' + MARKER + ' Adviseur', bedrijf: '🔒 ' + MARKER + ' Kantoor', email } });
    gid = uit.json && uit.json.id;
    if (!gid) return;
    await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
    await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
    await api('POST', '/gebruikers/verkoop/' + gid, { adminKey: ADMIN, body: { traject_limiet: 1, modules: { traject: true, contracten: false, ai_analyse: false, qa: false, export: false } } });
    const trajectData = {
      kantoor_naam: '🔒 ' + MARKER + ' BV', contact_naam: 'Diag Verkoper', contact_email: 'v' + email,
      koper_naam: 'Diag Koper Tegenpartij BV', koper_contact: 'Diag Koper', koper_email: 'k' + email, traject_type: 'Verkoop',
    };
    const c = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: trajectData } });
    if (!c.json || !c.json.ok) return;
    trajectCode = c.json.code;
    verkoperCode = c.json.code;
    koperCode = c.json.koper_code;
    tussenCode = c.json.tussen_code;
    setupOk = true;
  });

  // ── Bestaande veilige cleanup (zelfde stappen als tests/e2e-3rollen-regressie.spec.js:afterAll) ──
  test.afterAll(async () => {
    const cleanupResultaten = [];
    if (trajectCode) {
      // N-107 (besluit Marcel 19-11, optie A): opruimen via de standaardhelper (test-opruimroute op staging), niet via
      // de admin-delete die na D1 voor externe trajecten weigert en wezen achterliet.
      const d = await ruimTrajectOp(trajectCode, ADMIN);
      cleanupResultaten.push({ stap: 'traject verwijderd (ruimTrajectOp)', ok: !!d.ok });
    }
    if (gid) {
      // Standaardhelper: verwijdert de testadviseur alleen als er geen traject/mandaat meer aan hangt (geen wezen, N-207).
      const d = await verwijderTestGebruiker(gid, ADMIN);
      cleanupResultaten.push({ stap: 'testadviseur verwijderd (verwijderTestGebruiker)', ok: !!d.ok });
    }

    let d1Ok = true;
    if (trajectCode) {
      for (const tabel of ['mna_trajecten', 'mna_data', 'mna_gesprekken', 'mna_qa', 'mna_documenten']) {
        try {
          const kolom = tabel === 'mna_trajecten' ? 'id' : 'traject_id';
          const rows = d1('SELECT count(*) as n FROM ' + tabel + " WHERE " + kolom + "='" + trajectCode + "'");
          const n = rows[0] ? Number(rows[0].n) : -1;
          if (n !== 0) d1Ok = false;
        } catch (e) { d1Ok = false; }
      }
    }
    if (gid) {
      try {
        const rows = d1("SELECT count(*) as n FROM bf_gebruikers WHERE id='" + gid + "'");
        const n = rows[0] ? Number(rows[0].n) : -1;
        if (n !== 0) d1Ok = false;
      } catch (e) { d1Ok = false; }
    }

    for (const r of cleanupResultaten) expect(r.ok, r.stap).toBe(true);
    expect(d1Ok, 'onafhankelijke D1-telling toont overal 0 testdata na cleanup').toBe(true);
  });

  test('D1 · eenmalige meting: platformacceptatie-status direct vs. na korte wachttijd (verkoper/koper/begeleider)', { tag: '@platformacceptatie-timing-diagnose-eenmalig' }, async () => {
    test.setTimeout(60000);
    test.skip(!setupOk, 'Setup mislukt — zie beforeAll');

    const rollen = [
      { rol: 'VERKOPER', code: verkoperCode },
      { rol: 'KOPER', code: koperCode },
      { rol: 'BEGELEIDER', code: tussenCode },
    ];

    // Stap 1: actuele platformvoorwaarden accepteren voor alle drie rollen — één keer, geen retry.
    for (const { code } of rollen) {
      const accept = await api('POST', '/mna/platformvoorwaarden/accepteren', { body: { code } });
      expect(accept.status, 'platformvoorwaarden-acceptatie geeft HTTP 200').toBe(200);
    }

    // Stap 2: serverstatus direct daarna lezen (per rol, geen herhaling).
    const metingen = [];
    for (const { rol, code } of rollen) {
      const status = await api('GET', '/mna/platformvoorwaarden/status?code=' + encodeURIComponent(code));
      metingen.push({
        rol,
        moment: 'direct_na_acceptatie',
        status: status.status,
        akkoord: status.json ? status.json.akkoord : null,
        versie: status.json ? status.json.versie : null,
      });
    }

    // Stap 3: één korte, vaste wachttijd — geen oplopende reeks, geen retry-lus.
    await new Promise((resolve) => setTimeout(resolve, WACHTTIJD_MS));

    // Stap 4: serverstatus opnieuw lezen na de wachttijd (per rol, geen herhaling).
    for (const { rol, code } of rollen) {
      const status = await api('GET', '/mna/platformvoorwaarden/status?code=' + encodeURIComponent(code));
      metingen.push({
        rol,
        moment: 'na_' + WACHTTIJD_MS + 'ms_wachttijd',
        status: status.status,
        akkoord: status.json ? status.json.akkoord : null,
        versie: status.json ? status.json.versie : null,
      });
    }

    // Rapport wegschrijven — uitsluitend status/akkoord/versie per rol/moment, GEEN codes, namen,
    // sleutels of persoonsgegevens (werkregel 21/GOUDEN STANDAARD).
    try {
      const rapportPad = path.join(path.dirname(new URL(import.meta.url).pathname), 'rapporten', 'platformacceptatie-timing-diagnose-' + Date.now() + '.md');
      let md = '# DIAGNOSE — Platformacceptatie-timing (eenmalig) — ' + new Date().toISOString() + '\n\n';
      md += 'Doel: server-gerapporteerde acceptatiestatus direct na acceptatie vs. na ' + WACHTTIJD_MS + 'ms wachttijd. Geen conclusie over oorzaak — uitsluitend meetdata.\n\n';
      md += '| Rol | Moment | HTTP-status | akkoord | versie |\n|---|---|---|---|---|\n';
      for (const m of metingen) {
        md += '| ' + m.rol + ' | ' + m.moment + ' | ' + m.status + ' | ' + JSON.stringify(m.akkoord) + ' | ' + JSON.stringify(m.versie) + ' |\n';
      }
      fs.mkdirSync(path.dirname(rapportPad), { recursive: true });
      fs.writeFileSync(rapportPad, md);
      console.log('\nDiagnoserapport geschreven: ' + rapportPad);
    } catch (e) {
      console.log('Diagnoserapport wegschrijven mislukt (niet kritiek): ' + e.message);
    }

    // Deze meting faalt de test niet op een afwijkende timing-uitkomst zelf (dat IS het te
    // onderzoeken signaal) — wel op een harde infrastructuurfout (geen response/geen JSON).
    const alleResponsiesGeldig = metingen.every((m) => m.status === 200 && m.akkoord !== null);
    expect(alleResponsiesGeldig, 'elke statusaanroep geeft HTTP 200 met een leesbaar akkoord-veld (infrastructuur werkt) — zie het rapport voor de daadwerkelijke waarden').toBe(true);
  });
});
