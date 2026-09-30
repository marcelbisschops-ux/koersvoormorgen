// ══════════════════════════════════════════════════════════════════
// P1-IP-4 (27 sep 2026) — smoke- en autorisatietest voor de server-side migratie van alle
// client-side AI-generatie die voorheen naar de publieke, ongeauthenticeerde /ai ging.
// Doel: bewijzen dat elke gemigreerde route (1) daadwerkelijk werkt (echte AI-tekst terug), en
// (2) dezelfde autorisatiegrens afdwingt als de UI (anoniem/verkeerde rol -> geweigerd).
// Geen brede regressiesuite nodig (werkregel 40, test-economy) -- dit is een architectuurmigratie,
// geen nieuwe businesslogica; de promptteksten zijn 1-op-1 overgenomen uit al bewezen client-code.
//
// Draaien: WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//          node tests/verify-p1ip4-ai-migratie.mjs
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting, zetMfaUitVoorTest, accepteerPlatformvoorwaarden } from './lib.mjs';

const ADMIN = leesAdminKey();
console.log('\n' + kleur('vet', 'P1-IP-4 — AI-migratie smoke- en autorisatietest'));
console.log(kleur('grijs', 'Worker : ' + WORKER));
if (!ADMIN) { console.log(kleur('rood', 'Geen admin-key.')); process.exit(1); }

async function main() {
  kop('SETUP · testtraject (sell-side, sector accountancy)');
  const create = await api('POST', '/mna/create', { adminKey: ADMIN, body: {
    kantoor_naam: 'E2E P1IP4 BV', sector: 'accountancy', traject_type: 'Verkoop',
    contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl',
  } });
  check('traject aangemaakt', create.json && create.json.ok === true, JSON.stringify(create.json));
  const code = create.json && create.json.code;
  const koperCode = create.json && create.json.koper_code;
  const tussenCode = create.json && create.json.tussen_code;
  check('code + koper_code + tussen_code aanwezig', !!code && !!koperCode && !!tussenCode, JSON.stringify(create.json));
  await accepteerPlatformvoorwaarden({ verkoper: code, koper: koperCode, tussenpersoon: tussenCode });

  try {
    kop('1. /mna/document/bem/genereer · ADMIN_KEY (module-gate omzeild via rol=admin, bestaand patroon)');
    const bem = await api('POST', '/mna/document/bem/genereer', { adminKey: ADMIN, body: { code } });
    check('200 + tekst', bem.status === 200 && bem.json && bem.json.ok && typeof bem.json.tekst === 'string' && bem.json.tekst.length > 100, JSON.stringify(bem.json).slice(0, 200));

    kop('2. /mna/document/nda/genereer · nieuw toegevoegd type, zelfde route als bem/excl');
    const nda = await api('POST', '/mna/document/nda/genereer', { adminKey: ADMIN, body: { code } });
    check('200 + tekst', nda.status === 200 && nda.json && nda.json.ok && nda.json.tekst.length > 100, JSON.stringify(nda.json).slice(0, 200));

    kop('3. /mna/document/loi/genereer · nieuw toegevoegd type');
    const loi = await api('POST', '/mna/document/loi/genereer', { adminKey: ADMIN, body: { code } });
    check('200 + tekst', loi.status === 200 && loi.json && loi.json.ok && loi.json.tekst.length > 100, JSON.stringify(loi.json).slice(0, 200));

    kop('4. /mna/document/excl/genereer · nu via de canonieke template-keten i.p.v. marilyn eigen hardcoded sjabloon');
    const excl = await api('POST', '/mna/document/excl/genereer', { adminKey: ADMIN, body: { code } });
    check('200 + tekst', excl.status === 200 && excl.json && excl.json.ok && excl.json.tekst.length > 50, JSON.stringify(excl.json).slice(0, 200));

    kop('5. /mna/document/bieding/genereer · numerieke parameters als data');
    const bieding = await api('POST', '/mna/document/bieding/genereer', { adminKey: ADMIN, body: { code, ebitda: 250000, multLaag: 4.5, multHoog: 5.2, betaling: '100% contant bij closing', exclWeken: 6, geldigTot: '31 december 2026' } });
    check('200 + tekst', bieding.status === 200 && bieding.json && bieding.json.ok && bieding.json.tekst.length > 100, JSON.stringify(bieding.json).slice(0, 200));
    check('negatief: ebitda ontbreekt -> 400', (await api('POST', '/mna/document/bieding/genereer', { adminKey: ADMIN, body: { code, multLaag: 4.5 } })).status === 400);

    kop('6. /mna/dealvoorstel/hoofdstukken/genereer · vlaggenobject stuurt hoofdstukselectie');
    const dvh = await api('POST', '/mna/dealvoorstel/hoofdstukken/genereer', { adminKey: ADMIN, body: {
      code, contextBlok: 'Sector: Accountancy. Verkopende partij: E2E P1IP4 BV. Bewezen EBITDA: €250.000. Multiple 4,5x-5,2x.',
      vlaggen: { altWaardering: false, synergie: false, scenarios: false, earnOut: false, dcfGevoeligheid: false, buyAndBuild: false, vendorLoanRows: false, ruilverhouding: false, grondslagOmzet: false },
    } });
    check('200 + tekst', dvh.status === 200 && dvh.json && dvh.json.ok && dvh.json.tekst.length > 200, JSON.stringify(dvh.json).slice(0, 200));

    kop('7. /mna/dealvoorstel/bijlage/genereer · interne BATNA-bijlage');
    const dvb = await api('POST', '/mna/dealvoorstel/bijlage/genereer', { adminKey: ADMIN, body: { code, interneContext: 'Verkopende partij: E2E P1IP4 BV. Cash bij closing: €500.000.' } });
    check('200 + tekst', dvb.status === 200 && dvb.json && dvb.json.ok && dvb.json.tekst.length > 50, JSON.stringify(dvb.json).slice(0, 200));

    kop('8. /mna/gesprek/verslag/genereer · begeleider (x-tussen-key)');
    const gv = await api('POST', '/mna/gesprek/verslag/genereer', { body: { code: tussenCode, gesprekType: 'gesprek', datum: '2026-09-27', deelnemers: 'Test', notities: 'Klant wil in Q1 2027 verkopen. Prijs nog niet besproken.' }, headers: { 'x-tussen-key': tussenCode } });
    check('200 + tekst', gv.status === 200 && gv.json && gv.json.ok && gv.json.tekst.length > 50, JSON.stringify(gv.json).slice(0, 200));
    kop('8b. negatief: anoniem (geen key) -> geweigerd');
    const gvAnon = await api('POST', '/mna/gesprek/verslag/genereer', { body: { code: tussenCode, notities: 'test' } });
    check('401', gvAnon.status === 401, JSON.stringify(gvAnon.json));

    kop('9. /mna/gesprek/verslag/genereer · marilyn-variant (ADMIN_KEY, ander formaat)');
    const gvM = await api('POST', '/mna/gesprek/verslag/genereer', { adminKey: ADMIN, body: { code, variant: 'marilyn', gesprekType: 'gesprek', datum: '2026-09-27', deelnemers: 'Test', notities: 'Marilyn-variant testnotitie.' } });
    check('200 + tekst', gvM.status === 200 && gvM.json && gvM.json.ok && gvM.json.tekst.length > 50, JSON.stringify(gvM.json).slice(0, 200));

    kop('10. /mna/logboek-meeting/genereer · begeleider (tussen_code in body, geen header nodig)');
    const lm = await api('POST', '/mna/logboek-meeting/genereer', { body: { code: tussenCode, titel: 'Kennismaking', deelnemers: 'Test', tekst: 'Gesproken over tijdlijn en verwachtingen.' } });
    check('200 + tekst', lm.status === 200 && lm.json && lm.json.ok && lm.json.tekst.length > 50, JSON.stringify(lm.json).slice(0, 200));
    kop('10b. negatief: verkopercode i.p.v. tussen_code -> geweigerd');
    const lmVerkoper = await api('POST', '/mna/logboek-meeting/genereer', { body: { code, titel: 'x', tekst: 'test' } });
    check('403', lmVerkoper.status === 403, JSON.stringify(lmVerkoper.json));

    kop('11. /mna/analyse/fase/genereer · verkoper (positief) + koper (negatief, UI-pariteit)');
    const faVerkoper = await api('POST', '/mna/analyse/fase/genereer', { body: { code, faseId: 'commercieel', faseTitel: 'Klanten & commercieel', dataLines: ['Aantal klanten: 50'], checklistGereed: [], checklistOpen: ['iets'], redVlaggen: [], notities: '', sectorLabel: 'Accountancy', kantoorNaam: 'E2E P1IP4 BV', trajectType: 'Verkoop' } });
    check('200 + tekst (verkoper)', faVerkoper.status === 200 && faVerkoper.json && faVerkoper.json.ok && faVerkoper.json.tekst.length > 50, JSON.stringify(faVerkoper.json).slice(0, 200));
    const faKoper = await api('POST', '/mna/analyse/fase/genereer', { body: { code: koperCode, faseId: 'commercieel', faseTitel: 'Klanten & commercieel', dataLines: ['test'] } });
    check('403 (koper geweigerd, matcht UI !isKoper())', faKoper.status === 403, JSON.stringify(faKoper.json));
    const faTussenFin = await api('POST', '/mna/analyse/fase/genereer', { body: { code: tussenCode, faseId: 'financieel', faseTitel: 'Financieel', dataLines: ['test'] } });
    check('403 (tussenpersoon op fase financieel geweigerd, matcht UI-uitzondering)', faTussenFin.status === 403, JSON.stringify(faTussenFin.json));

    kop('12. /mna/analyse/consolideer/genereer · verkoper (positief) + koper (negatief)');
    const coVerkoper = await api('POST', '/mna/analyse/consolideer/genereer', { body: { code, faseTitel: 'Klanten & commercieel', dataLines: ['Aantal klanten: 50'], analyses: 'Doc 1: klantenlijst.pdf\nGeen bijzonderheden.', kantoorNaam: 'E2E P1IP4 BV' } });
    check('200 + tekst', coVerkoper.status === 200 && coVerkoper.json && coVerkoper.json.ok && coVerkoper.json.tekst.length > 50, JSON.stringify(coVerkoper.json).slice(0, 200));
    const coKoper = await api('POST', '/mna/analyse/consolideer/genereer', { body: { code: koperCode, faseTitel: 'x', dataLines: [], analyses: 'x' } });
    check('403 (koper geweigerd)', coKoper.status === 403, JSON.stringify(coKoper.json));

    kop('13. /mna/analyse/traject/genereer · tussenpersoon (mna.html-variant, x-tussen-key)');
    const trTussen = await api('POST', '/mna/analyse/traject/genereer', { body: { code, dataSamenvatting: '\n## Financieel\n- Omzet: €800.000', benchmarkTekst: 'BENCHMARKS: test', sectorLabel: 'Accountancy', kantoorNaam: 'E2E P1IP4 BV', trajectType: 'Verkoop' }, headers: { 'x-tussen-key': tussenCode } });
    check('200 + tekst', trTussen.status === 200 && trTussen.json && trTussen.json.ok && trTussen.json.tekst.length > 50, JSON.stringify(trTussen.json).slice(0, 200));

    kop('14. /mna/analyse/traject/genereer · marilyn-variant (ADMIN_KEY)');
    const trMarilyn = await api('POST', '/mna/analyse/traject/genereer', { adminKey: ADMIN, body: { code, variant: 'marilyn', dataSamenvatting: '\n## Financieel\n- Omzet: €800.000', benchmarkTekst: 'SECTOR: Accountancy\nNORMEN: test', sectorLabel: 'Accountancy', kantoorNaam: 'E2E P1IP4 BV', trajectType: 'Verkoop' } });
    check('200 + tekst', trMarilyn.status === 200 && trMarilyn.json && trMarilyn.json.ok && trMarilyn.json.tekst.length > 50, JSON.stringify(trMarilyn.json).slice(0, 200));

    kop('15. /mna/marilyn/waardering-ai/genereer · ADMIN_KEY-only, los van een traject');
    const mw = await api('POST', '/mna/marilyn/waardering-ai/genereer', { adminKey: ADMIN, body: {
      sector: 'accountancy', trajectNaam: '(geen traject geselecteerd)', trajectType: 'Verkoop',
      financials: { omzet1: 700000, omzet2: 750000, omzet3: 800000, ebitdaPct: 15, ebitdaAmt: 120000, fte: 8, recurring: 60, churn: 5 },
      waardering: { waardeMultiLaag: 540000, multiLaag: 4.5, waardeMultiMid: 594000, multiMid: 4.95, waardeMultiHoog: 624000, multiHoog: 5.2, waardeOmzet: 640000, risico: 10 },
      forecast: { gemGroei: 7.1, reeks: [{ omzet: 800000, ebitda: 120000, waarde: 594000 }], koopsom: 594000 },
      earnOut: { pct: 20, jaren: 3, target: 5 },
    } });
    check('200 + tekst', mw.status === 200 && mw.json && mw.json.ok && mw.json.tekst.length > 100, JSON.stringify(mw.json).slice(0, 200));
    kop('15b. negatief: geen admin-key -> geweigerd');
    const mwAnon = await api('POST', '/mna/marilyn/waardering-ai/genereer', { body: { sector: 'accountancy' } });
    check('401', mwAnon.status === 401, JSON.stringify(mwAnon.json));

    kop('16. Publieke /ai blijft onveranderd publiek (bedrijfsscan-flow, geen regressie)');
    const publiekAi = await api('POST', '/ai', { body: { messages: [{ role: 'user', content: 'Zeg alleen het woord: test' }], max_tokens: 20 } });
    check('200 (nog steeds publiek bereikbaar voor de anonieme scan-flow)', publiekAi.status === 200, JSON.stringify(publiekAi.json).slice(0, 150));

  } finally {
    kop('OPRUIMEN');
    const del = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
    check('opgeruimd: ' + code, del.status === 200, JSON.stringify(del.json));
  }

  samenvatting();
}

main().catch(e => { console.error(e); process.exit(1); });
