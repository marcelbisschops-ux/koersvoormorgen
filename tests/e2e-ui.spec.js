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

  // Aandelenruil (27 augustus 2026, backlog "De M van M&A" punt 4) — GOUDEN STANDAARD: de
  // koperswaarde komt nooit uit dit platform (koper doorloopt geen DD), dus dit beschermt vooral
  // dat (a) zonder koperswaarde het resultaat null blijft (nooit een misleidende tabel) en (b) het
  // percentage en het afgeleide aantal nieuwe aandelen onderling consistent blijven.
  test('ruilverhouding: waarde-evenredig en consistent met aandelenaantal', async ({ page }) => {
    const r = await page.evaluate(() => dvBerekenRuilverhouding(
      { aandelenruilAan: true, koperswaardeExtern: 8000000, aandelenKoperAantal: 1000000 },
      { deelKoperBasis: 2000000 }
    ));
    expect(r.pctVerkoper).toBe(20);                  // 2M / (2M+8M)
    expect(r.pctKoper).toBe(80);
    expect(r.nieuweAandelen).toBe(250000);           // 1M × (2M/8M)
    // Cross-check: het percentage afgeleid uit het aandelenaantal moet exact overeenkomen met pctVerkoper
    const pctViaAandelen = r.nieuweAandelen / (1000000 + r.nieuweAandelen) * 100;
    expect(pctViaAandelen).toBeCloseTo(r.pctVerkoper, 6);
  });

  test('ruilverhouding: zonder koperswaarde nooit een gegokt resultaat', async ({ page }) => {
    const r = await page.evaluate(() => dvBerekenRuilverhouding(
      { aandelenruilAan: true, koperswaardeExtern: 0 },
      { deelKoperBasis: 2000000 }
    ));
    expect(r).toBeNull();
  });

  // Maatschap-waardering (backlogpunt 9-B4, werkregel 13) — grondslag is winst ná een marktconform
  // ondernemersloon (proxy: veld eigenaar-/partnerbeloning), sector-multiple daarop, geen VpB.
  // Beschermt (a) de maatschap-rekenwijze en (b) dat de BV-tak exact ongewijzigd blijft.
  test('maatschap: grondslag = winst ná ondernemersloon, geen VpB; BV ongewijzigd', async ({ page }) => {
    const res = await page.evaluate(() => {
      const run = (structuur, data) => {
        window.S = { traject: { sector: 'accountancy', structuur_type: structuur, koper_naam: '' },
          _groepData: Object.assign({}, data), data: Object.assign({}, data) };
        const v = dvBerekenWaardering();
        const d = dvGetDefaults();
        return { multipleType: v.multipleType, grondslag: v.multipleTypeBedrag, wMid: v.wMid,
          onbekend: v.maatschapGrondslagOnbekend, defVpb: d.vpbPct, defBewezen: d.ebitdaBewezen };
      };
      const basis = { financieel_ebitdaNorm: '600000', financieel_partnerBel: '300000',
        financieel_omzet3: '2000000', financieel_ebitdaMarge: '30' };
      return {
        maatschap: run('maatschap', basis),
        maatschapLeeg: run('maatschap', { financieel_ebitdaNorm: '600000', financieel_omzet3: '2000000', financieel_ebitdaMarge: '30' }),
        bv: run('bv', basis),
      };
    });
    // maatschap: 600k − 300k = 300k grondslag; mid-multiple 5,0 → 1,5M; VpB-default 0
    expect(res.maatschap.multipleType).toBe('maatschap');
    expect(res.maatschap.grondslag).toBe(300000);
    expect(res.maatschap.wMid).toBe(1500000);
    expect(res.maatschap.defVpb).toBe(0);
    expect(res.maatschap.defBewezen).toBe(300000);
    // maatschap zonder ondernemersloon → geen gegokt cijfer
    expect(res.maatschapLeeg.wMid).toBeNull();
    expect(res.maatschapLeeg.onbekend).toBe(true);
    expect(res.maatschapLeeg.defBewezen).toBe(0);
    // BV-regressie: partnerbeloning NIET afgetrokken, VpB-default 25,8 — exact als voorheen
    expect(res.bv.multipleType).toBe('ebitda');
    expect(res.bv.grondslag).toBe(600000);
    expect(res.bv.wMid).toBe(3000000);
    expect(res.bv.defVpb).toBe(25.8);
    expect(res.bv.defBewezen).toBe(600000);
  });

  // Management- & retentiescan (backlogpunt 8 stap 3) — kwalitatieve laag/midden/hoog-indicatie,
  // NOOIT een correctie op de waardering. Beschermt de banding + het "onvoldoende ingevuld"-pad.
  test('managementrisico: banding en "onvoldoende ingevuld" bij te veel onbekend', async ({ page }) => {
    const res = await page.evaluate(() => {
      const run = (data) => { window.S = { data: Object.assign({}, data) }; return dvManagementRisico(); };
      return {
        hoog: run({ partner_keyPersonAfhank: '55', partner_tweedeEchelon: 'geen tweede laag, alles via de eigenaar',
          partner_verandering: 'laag, veel weerstand', partner_mgmtRetentie: 'geen', partner_opvolging: 'geen' }),
        laag: run({ partner_keyPersonAfhank: '8', partner_tweedeEchelon: 'sterk MT van 3 personen',
          partner_verandering: 'hoog, staan er open voor', partner_mgmtRetentie: 'retentiebonus + lock-up overeengekomen', partner_opvolging: 'ja, interne kandidaat' }),
        leeg: run({ partner_keyPersonAfhank: '', partner_tweedeEchelon: '', partner_verandering: '' }),
      };
    });
    expect(res.hoog.band).toBe('hoog');
    expect(res.hoog.onvoldoendeData).toBe(false);
    expect(res.laag.band).toBe('laag');
    // key-person leeg + tweede echelon leeg + veranderbereidheid leeg = 3 onbekend → geen oordeel
    expect(res.leeg.onvoldoendeData).toBe(true);
    expect(res.leeg.band).toBe('onvoldoende ingevuld');
  });

  // Opbrengst-brug (backlogpunt 7) — headline-EV minus aftrekposten → equity value → cash bij closing.
  // Beschermt de rekenkundige opbouw; alle aftrekposten zijn begeleider-aannames, geen platformgok.
  test('opbrengst-brug: EV → equity value → cash bij closing exact', async ({ page }) => {
    const b = await page.evaluate(() => {
      const p = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
        nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
        escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20 };
      return dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
    });
    expect(b.ev).toBe(2000000);                    // 400k × 5,0
    expect(b.transactiekosten).toBe(40000);        // 2% van EV
    expect(b.equityValue100).toBe(1510000);        // 2M − 300k − 100k − 50k − 40k
    expect(Math.round(b.verkochtBelangWaarde)).toBe(770100);   // × 51%
    expect(Math.round(b.escrowBedrag)).toBe(92412);            // 12%
    expect(Math.round(b.earnOutUitgesteld)).toBe(154020);      // 20%
    expect(Math.round(b.cashBijClosing)).toBe(523668);
    expect(Math.round(b.verwachteGerealiseerd)).toBe(770100);  // escrow + earn-out komen terug
  });

  test('ZOPA trade-space: buckets sommeren exact, geen bedrag toegevoegd/afgehaald', async ({ page }) => {
    const r = await page.evaluate(() => {
      const p = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
        nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
        escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20, vendorLoanAan: true, vendorLoanBedrag: 200000 };
      const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
      const z = dvBerekenZopaTradeSpace(p, dvBerekenClosing(p), b);
      return { b, z };
    });
    const { b, z } = r;
    // Kerninvariant: de trade-space herverdeelt alleen — totaal == verkocht belang + behouden belang
    expect(Math.round(z.totaal)).toBe(Math.round(b.verkochtBelangWaarde + z.behoudenBelangWaarde));
    expect(Math.round(z.zekerNu + z.escrow + z.voorwaardelijk + z.behoudenBelangWaarde)).toBe(Math.round(z.totaal));
    // Vendor loan wordt van "zeker" naar "voorwaardelijk" geschoven, niet opgeteld
    expect(Math.round(z.vendorLoan)).toBe(200000);
    expect(Math.round(z.zekerNu)).toBe(Math.round(b.cashBijClosing - 200000));  // 523.668 − 200.000
    expect(Math.round(z.voorwaardelijk)).toBe(Math.round(b.earnOutUitgesteld + 200000));  // 154.020 + 200.000
    expect(z.pctZekerBijClosing + z.pctEscrow + z.pctVoorwaardelijk + z.pctBehoudenBelang).toBeCloseTo(100, 4);
    // Behouden belang = equity value × (1 − belang)
    expect(Math.round(z.behoudenBelangWaarde)).toBe(Math.round(b.equityValue100 * 0.49));
  });

  test('BATNA & walk-away: BOVEN/KRAP/ONDER op de juiste drempels, nooit een gegokte ondergrens', async ({ page }) => {
    const r = await page.evaluate(() => {
      const base = { ebitdaBewezen: 400000, multipleBasis: 5.0, ebitdaPrognose: 520000, multipleBovengrens: 6.0, belangPct: 51,
        nettoSchuld: 300000, debtLikeItems: 100000, werkkapitaalCorrectie: 50000, transactiekostenPct: 2,
        escrowPct: 12, escrowMaanden: 18, earnOutAan: true, earnOutPct: 20 };
      const calc = (extra) => {
        const p = { ...base, ...extra };
        const b = dvBerekenOpbrengstBrug(p, dvBerekenClosing(p));
        return dvBerekenBatna(p, dvBerekenClosing(p), b);
      };
      return {
        leeg: calc({ walkAwayPrijs: 0 }).status,
        boven: calc({ walkAwayPrijs: 400000 }).status,      // < cash 523.668
        krap: calc({ walkAwayPrijs: 600000 }).status,       // tussen cash en totaal 770.100
        onder: calc({ walkAwayPrijs: 850000 }).status,      // > totaal
        grens: calc({ walkAwayPrijs: 523668 }).status,      // == cash
      };
    });
    expect(r.leeg).toBe('nietIngevuld');   // GOUDEN STANDAARD: geen gegokte ondergrens
    expect(r.boven).toBe('ruimBoven');
    expect(r.krap).toBe('krap');
    expect(r.onder).toBe('onder');
    expect(r.grens).toBe('ruimBoven');
  });

  test('LoI-checklist: 15 kern-economics, earn-out/retentie data-afhankelijk, disclaimer aanwezig', async ({ page }) => {
    const r = await page.evaluate(() => {
      window.S = { data: {} };
      const zonder = dvTabelLoiChecklist({ earnOutAan: false });
      window.S = { data: { partner_mgmtRetentie: 'jaarbonus 20% over 3 jaar', partner_keyPersonAfhank: '40' } };
      const met = dvTabelLoiChecklist({ earnOutAan: true });
      return { zonder, met };
    });
    // 15 items → 15 <tr> in de body (+1 header rij)
    expect((r.zonder.match(/<tr>/g) || []).length).toBe(16);
    // earn-out uit → "leg vast in LoI"; earn-out aan → "gedekt"
    expect(r.zonder).toContain('Sluit een earn-out expliciet uit');
    expect(r.met).toContain('Percentage, doelgroei en looptijd staan in dit voorstel');
    // retentieveld gevuld → "vertaal ze naar concrete LoI-punten"
    expect(r.met).toContain('vertaal ze naar concrete LoI-punten');
    expect(r.zonder).toContain('Nog geen retentie-afspraken vastgelegd');
    // altijd: geen juridisch advies + niet delen met de koper
    expect(r.zonder).toContain('geen juridisch advies');
    expect(r.zonder).toContain('niet delen met de koper');
  });

  test('bod-vergelijker: euro-herrekening exact, gewogen totaalscore, <2 biedingen → geen matrix', async ({ page }) => {
    const r = await page.evaluate(() => {
      const A = { naam: 'Alfa', ev: 3000000, cashPct: 60, escrowPct: 15, earnOutPct: 10, behoudenPct: 15,
        vendorLoan: 0, aantalVoorwaarden: 2, financiering: 'eigen', wekenTotClosing: 12, strategischeFit: 'hoog' };
      const B = { naam: 'Beta', ev: 2600000, cashPct: 80, escrowPct: 10, earnOutPct: 0, behoudenPct: 10,
        vendorLoan: 200000, aantalVoorwaarden: 4, financiering: 'commitment', wekenTotClosing: 20, strategischeFit: 'midden' };
      const v = dvBerekenBiedingVergelijking([A, B]);
      return { status: v.status, a: v.biedingen[0], b: v.biedingen[1], kop: v.ranglijst[0].naam,
        leeg: dvBerekenBiedingVergelijking([A]).status };
    });
    expect(r.status).toBe('ok');
    expect(Math.round(r.a.cashNu)).toBe(1800000);          // 3M × 60%
    expect(Math.round(r.b.cashNu)).toBe(1880000);          // 2,6M × 80% − 200k vendor loan
    expect(r.a.sPrijs).toBe(100);                          // hoogste ev
    expect(r.a.totaal).toBe(83);                           // gedocumenteerde gewogen som
    expect(r.b.totaal).toBe(67);
    expect(r.kop).toBe('Alfa');
    expect(r.leeg).toBe('onvoldoende');                    // GOUDEN STANDAARD: geen misleidende matrix
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
