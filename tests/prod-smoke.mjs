// ══════════════════════════════════════════════════════════════════
// Herbruikbare productie-smoke-test per fix-batch (opgezet 16 sep 2026, n.a.v. Batch 3B-3E van
// vandaag — die smoke-tests werden telkens als eenmalig, wegwerp-script geschreven; dit vervangt
// dat door één vast commando per batch, zodat een volgende productiedeploy niet opnieuw met de hand
// hoeft te worden dichtgetimmerd).
//
// Draaien (tegen productie, of tegen staging door WORKER_URL te overschrijven):
//   ADMIN_KEY=... node tests/prod-smoke.mjs <batch>
//   bv.: ADMIN_KEY=... node tests/prod-smoke.mjs 3E
//   of:  node tests/prod-smoke.mjs 3E --key=...
//
// Elke batchfunctie doet zelfstandig: testtraject/-account aanmaken → de relevante productieflow
// uitvoeren → HTTP-resultaat controleren → D1-opslag rechtstreeks controleren (via `wrangler d1
// execute --remote`, dezelfde sleutelloze Cloudflare-CLI-toegang als de rest van de sessie vandaag,
// nooit het ADMIN_KEY van de app) → cleanup → cleanup verifiëren. Geen enkele sleutel wordt ooit
// hardcoded of gelogd — uitsluitend via ADMIN_KEY/--key (zie leesAdminKey() in lib.mjs) en de eigen
// wrangler-CLI-sessie voor D1.
//
// Exit-code: 0 bij PASS, 1 bij FAIL of een onbekende/ontbrekende batchnaam — bruikbaar in een
// eventuele toekomstige CI-stap.
// ══════════════════════════════════════════════════════════════════
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting, d1, D1_NAAM } from './lib.mjs';

const ADMIN = leesAdminKey();
const DOM = '@e2e-test.invalid';
const BACKEND_DIR = process.env.KVM_BACKEND_DIR
  || path.join(os.homedir(), 'Documents', 'GitHub', 'koersvoormorgen-backend', 'backend');
// d1()/D1_NAAM komen sinds 18 sep 2026 uit lib.mjs (gedeeld met tests/e2e-3rollen-regressie.spec.js
// en tests/AUDIT-LOG.md-cleanup-verificaties) i.p.v. hier een eigen kopie te onderhouden.

function faal(stap, detail) {
  throw new Error(stap + (detail ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''));
}

// ── Gedeelde setup-helpers ──────────────────────────────────────────
async function maakFictieveAdviseur(tag) {
  const email = 'prodsmoke-' + tag.toLowerCase() + '-' + Date.now() + DOM;
  const ww = 'Prodsmoke-' + tag + '-' + Date.now() + '!';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'PROD-SMOKE ' + tag, bedrijf: 'PROD-SMOKE ' + tag + ' BV', email } });
  if (!uit.json || !uit.json.ok) faal('uitnodigen mislukt voor ' + tag, uit.json);
  const act = await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: ww } });
  if (!act.json || !act.json.ok) faal('activeren mislukt voor ' + tag, act.json);
  const vw = await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: ww } });
  if (!vw.json || !vw.json.ok) faal('voorwaarden accepteren mislukt voor ' + tag, vw.json);
  return { email, wachtwoord: ww, gebruikerId: uit.json.id };
}

async function ruimGebruikerOp(gebruikerId) {
  return api('POST', '/gebruikers/verwijder/' + gebruikerId, { adminKey: ADMIN });
}

async function ruimTrajectOp(code) {
  return api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
}

async function maakAdminTraject(kantoorNaam, extra) {
  const r = await api('POST', '/mna/create', Object.assign({ adminKey: ADMIN }, {
    body: Object.assign({ kantoor_naam: kantoorNaam, sector: 'accountancy', traject_type: 'Verkoop' }, extra || {})
  }));
  if (!r.json || !r.json.ok) faal('traject aanmaken mislukt (' + kantoorNaam + ')', r.json);
  return r.json;
}

// Elke batch garandeert cleanup via try/finally: welke resource-variabele hieronder ook al is
// toegewezen op het moment dat een stap faalt (throw via faal(), of een onverwachte exception),
// de finally-tak ruimt exact die toegewezen resources op en verifieert dat ook — nooit alleen ná
// een succesvolle afronding. Vastgelegd n.a.v. Breaker-review 16 sep 2026 (CONDITIONAL PASS): een
// eerdere versie deed cleanup als laatste regel van de happy path, waardoor een faal() halverwege
// (bijv. een mislukte /mna/save-aanroep in 3D, of een onverwachte HTTP-status in 3C) het testtraject
// blijvend liet achterstaan.

// ── Batch 3B — opdrachtgever_rol daadwerkelijk opgeslagen bij /adviseur/create ──────────────────
async function batch3B() {
  kop('3B · opdrachtgever_rol (koper-bod-autorisatiegrens)');
  let buy, sell, buyCode, sellCode;
  try {
    buy = await maakFictieveAdviseur('3B-buy');
    sell = await maakFictieveAdviseur('3B-sell');

    const buyCreate = await api('POST', '/adviseur/create', { body: { email: buy.email, wachtwoord: buy.wachtwoord, traject: {
      kantoor_naam: 'PROD-SMOKE 3B Buyside BV', contact_naam: 'Verkoper', contact_email: 'v-3b-buy' + DOM,
      koper_naam: 'Koper BV', koper_email: 'k-3b-buy' + DOM, traject_type: 'Overname', opdrachtgever_rol: 'koper',
    } } });
    if (!buyCreate.json || !buyCreate.json.ok) faal('buy-side traject aanmaken mislukt', buyCreate.json);
    buyCode = buyCreate.json.code;
    const buyKoperCode = buyCreate.json.koper_code;

    const sellCreate = await api('POST', '/adviseur/create', { body: { email: sell.email, wachtwoord: sell.wachtwoord, traject: {
      kantoor_naam: 'PROD-SMOKE 3B Sellside BV', contact_naam: 'Verkoper', contact_email: 'v-3b-sell' + DOM,
      koper_naam: 'Koper BV', koper_email: 'k-3b-sell' + DOM, traject_type: 'Overname',
    } } });
    if (!sellCreate.json || !sellCreate.json.ok) faal('sell-side traject aanmaken mislukt', sellCreate.json);
    sellCode = sellCreate.json.code;
    const sellKoperCode = sellCreate.json.koper_code;

    const rollen = d1("SELECT id, opdrachtgever_rol FROM mna_trajecten WHERE id='" + buyCode + "' OR id='" + sellCode + "'");
    const buyRol = (rollen.find(r => r.id === buyCode) || {}).opdrachtgever_rol;
    const sellRol = (rollen.find(r => r.id === sellCode) || {}).opdrachtgever_rol;
    check('D1: buy-side traject heeft opdrachtgever_rol=koper', buyRol === 'koper', 'was: ' + buyRol);
    check('D1: sell-side traject heeft opdrachtgever_rol=verkoper (default)', sellRol === 'verkoper', 'was: ' + sellRol);

    await api('POST', '/mna/admin/vrijgeven/' + buyCode + '?force=1', { adminKey: ADMIN });
    await api('POST', '/mna/admin/vrijgeven/' + sellCode + '?force=1', { adminKey: ADMIN });

    const bodBuy = await api('POST', '/mna/koper/bod', { body: { code: buyKoperCode, bedrag: 750000 } });
    check('koper-bod op buy-side traject → 403', bodBuy.status === 403, 'status ' + bodBuy.status);
    const bodSell = await api('POST', '/mna/koper/bod', { body: { code: sellKoperCode, bedrag: 1234567, toelichting: 'prod-smoke' } });
    check('koper-bod op sell-side traject → 200 ok:true', bodSell.json && bodSell.json.ok === true, JSON.stringify(bodSell.json));

    const biedingen = d1("SELECT traject_id FROM mna_koper_biedingen WHERE traject_id='" + buyCode + "' OR traject_id='" + sellCode + "'");
    check('D1: precies 1 bod-rij, alleen voor sell-side', biedingen.length === 1 && biedingen[0].traject_id === sellCode, JSON.stringify(biedingen));
  } finally {
    if (buyCode) await ruimTrajectOp(buyCode);
    if (sellCode) await ruimTrajectOp(sellCode);
    if (buy && buy.gebruikerId) await ruimGebruikerOp(buy.gebruikerId);
    if (sell && sell.gebruikerId) await ruimGebruikerOp(sell.gebruikerId);
    if (buyCode || sellCode) {
      const idsIn = ["'" + (buyCode || '-') + "'", "'" + (sellCode || '-') + "'"].join(',');
      const restTrajecten = d1('SELECT id FROM mna_trajecten WHERE id IN (' + idsIn + ')');
      check('cleanup: geen trajecten meer over', restTrajecten.length === 0, JSON.stringify(restTrajecten));
    }
    if ((buy && buy.gebruikerId) || (sell && sell.gebruikerId)) {
      const idsIn = ["'" + ((buy && buy.gebruikerId) || '-') + "'", "'" + ((sell && sell.gebruikerId) || '-') + "'"].join(',');
      const restGebruikers = d1('SELECT id FROM bf_gebruikers WHERE id IN (' + idsIn + ')');
      check('cleanup: geen testaccounts meer over', restGebruikers.length === 0, JSON.stringify(restGebruikers));
    }
  }
}

// ── Batch 3C — generieke mailfoutafhandeling op 5 routes ────────────────────────────────────────
async function batch3C() {
  kop('3C · mailfoutafhandeling (5 routes)');
  let code;
  try {
    const t = await maakAdminTraject('PROD-SMOKE 3C BV', { begeleider_naam: 'Begeleider', begeleider_email: 'bg-3c' + DOM });
    code = t.code;

    const OUDE_GENERIEKE_TEKST = 'E-mail versturen mislukt: ';
    function toetsMailRespons(naam, resp) {
      if (resp.status === 200) {
        check(naam + ' → succesvolle verzending (ok:true)', resp.json && resp.json.ok === true, JSON.stringify(resp.json));
      } else if (resp.status === 502) {
        const msg = (resp.json && resp.json.error) || '';
        check(naam + ' → 502 met de nieuwe leesbare foutmelding (niet de oude generieke tekst)',
          msg.length > 0 && !msg.startsWith(OUDE_GENERIEKE_TEKST), msg);
      } else {
        faal(naam + ': onverwachte status', { status: resp.status, json: resp.json });
      }
    }

    const r1 = await api('POST', '/mna/mail-begeleider', { adminKey: ADMIN, body: { to: 'bg-3c' + DOM, naam: 'Begeleider', trajectNaam: 'PROD-SMOKE 3C BV', tussenCode: t.tussen_code } });
    toetsMailRespons('mail-begeleider', r1);

    const r2 = await api('POST', '/mna/nda/email', { adminKey: ADMIN, body: { code, nda_tekst: 'Prod-smoke NDA-tekst.', to: ['nda-3c' + DOM] } });
    toetsMailRespons('nda/email', r2);

    const r3 = await api('POST', '/mna/dealvoorstel/email', { adminKey: ADMIN, body: { code, dealvoorstel_tekst: 'Prod-smoke dealvoorstel-tekst.', to: ['dv-3c' + DOM] } });
    toetsMailRespons('dealvoorstel/email', r3);

    const r4 = await api('POST', '/mna/bieding/email', { adminKey: ADMIN, body: { code, bieding_tekst: 'Prod-smoke bieding-tekst.', to: ['bd-3c' + DOM], goedgekeurd_door: 'Prod-smoke Goedkeurder' } });
    toetsMailRespons('bieding/email', r4);

    const r5 = await api('POST', '/mna/document/eigen/versturen', { body: { code, bestand_base64: Buffer.from('Prod-smoke testbestand.').toString('base64'), bestand_naam: 'test.pdf', to: ['ed-3c' + DOM] } });
    toetsMailRespons('document/eigen/versturen', r5);

    // Bij een mislukte verzending mag er geen enkele documentversie zijn weggeschreven.
    const alles502 = [r2, r3, r4, r5].every(r => r.status === 502);
    if (alles502) {
      const versies = d1("SELECT doc_type FROM mna_doc_versies WHERE traject_id='" + code + "'");
      const kolommen = d1("SELECT dealvoorstel_tekst, bieding_tekst FROM mna_trajecten WHERE id='" + code + "'");
      check('D1: geen documentversies na volledig mislukte verzendingen', versies.length === 0, JSON.stringify(versies));
      check('D1: dealvoorstel/bieding-kolommen leeg na mislukte verzendingen', kolommen[0] && !kolommen[0].dealvoorstel_tekst && !kolommen[0].bieding_tekst, JSON.stringify(kolommen));
    } else {
      console.log(kleur('geel', '  ⊘ D1-write-check overgeslagen — niet alle verzendingen faalden vandaag (Resend-quota kennelijk niet uitgeput), dus succesvolle writes zijn hier verwacht.'));
    }
  } finally {
    if (code) {
      await ruimTrajectOp(code);
      const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
      check('cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
    }
  }
}

// ── Batch 3D — teaser + verkoopmemorandum max_tokens ────────────────────────────────────────────
async function batch3D() {
  kop('3D · teaser + verkoopmemorandum (afkap-check)');
  let code;
  try {
    const t = await maakAdminTraject('PROD-SMOKE 3D BV');
    code = t.code;

    const fases = {
      financieel: { omzet3: { label: 'Omzet', value: '3850000' }, ebitdaMarge: { label: 'EBITDA-marge', value: '15.9' }, recurring: { label: 'Terugkerende omzet', value: '71' } },
      commercieel: { aantalKlanten: { label: 'Aantal klanten', value: '640' } },
      partner: { fte: { label: 'FTE', value: '18.4' } },
      strategisch: { niche: { label: 'Niche', value: 'Fiscale structurering en bedrijfsopvolging' }, marktpos: { label: 'Regio', value: 'Zuid-Nederland' }, redenVerkoop: { label: 'Reden verkoop', value: 'Pensionering van de vennoten.' } },
    };
    for (const [fase, data_json] of Object.entries(fases)) {
      const r = await api('POST', '/mna/save', { adminKey: ADMIN, body: { code, fase_id: fase, data_json } });
      if (!r.json || !r.json.ok) faal('save fase ' + fase + ' mislukt', r.json);
    }

    const teaser = await api('POST', '/mna/teaser/genereer', { adminKey: ADMIN, body: { code } });
    check('teaser: 200, geen afkap-fout', teaser.status === 200 && !!(teaser.json && teaser.json.teaser_tekst), JSON.stringify(teaser.json).slice(0, 200));
    const teaserTekst = teaser.json && teaser.json.teaser_tekst;

    const vm = await api('POST', '/mna/verkoopmemorandum/genereer', { adminKey: ADMIN, body: { code, nda_bevestigd: true, nda_bevestigd_door: 'Prod-smoke' } });
    check('verkoopmemorandum: 200, geen afkap-fout', vm.status === 200 && !!(vm.json && vm.json.verkoopmemorandum_tekst), JSON.stringify(vm.json).slice(0, 200));
    const vmTekst = vm.json && vm.json.verkoopmemorandum_tekst;

    const opslag = d1("SELECT length(teaser_tekst) AS teaser_len, teaser_status, length(verkoopmemorandum_tekst) AS vm_len, verkoopmemorandum_status FROM mna_trajecten WHERE id='" + code + "'");
    const rij = opslag[0] || {};
    check('D1: teaser correct opgeslagen', rij.teaser_status === 'gegenereerd' && Number(rij.teaser_len) === (teaserTekst || '').length, JSON.stringify(rij));
    check('D1: verkoopmemorandum correct opgeslagen', rij.verkoopmemorandum_status === 'gegenereerd' && Number(rij.vm_len) === (vmTekst || '').length, JSON.stringify(rij));
  } finally {
    if (code) {
      await ruimTrajectOp(code);
      const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
      check('cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
    }
  }
}

// ── Batch 3E — DD-beoordeling max_tokens ────────────────────────────────────────────────────────
async function batch3E() {
  kop('3E · DD-beoordeling (afkap-check)');
  let code;
  try {
    const t = await maakAdminTraject('PROD-SMOKE 3E BV');
    code = t.code;

    const ai = await api('POST', '/mna/beoordeling/ai', { adminKey: ADMIN, body: {
      code, fase: 'A', categorie: 'Financieel',
      context_docs: 'Jaarrekening 2024 toont een omzet van 3.850.000 euro en een genormaliseerd resultaat van 612.000 euro. EBITDA-marge 15,9%. Solvabiliteit 62%.',
    } });
    check('beoordeling/ai: 200', ai.status === 200 && ai.json && ai.json.ok === true, JSON.stringify(ai.json).slice(0, 200));

    const rijen = d1("SELECT categorie, score FROM mna_beoordelingen WHERE traject_id='" + code + "'");
    check('D1: beoordelingsrij aangemaakt', rijen.length === 1 && rijen[0].categorie === 'Financieel', JSON.stringify(rijen));
  } finally {
    if (code) {
      await ruimTrajectOp(code);
      const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
      const restBeoordeling = d1("SELECT id FROM mna_beoordelingen WHERE traject_id='" + code + "'");
      check('cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
      check('cleanup: beoordelingsrij weg (cascade)', restBeoordeling.length === 0, JSON.stringify(restBeoordeling));
    }
  }
}

// ── Batch 3F-a — base64-fix bijlage-extractie (>8192 bytes) ─────────────────────────────────────
// Handmatig opgebouwde, deterministische PDF (geen npm-afhankelijkheid, blijft dit ene bestand
// zelfstandig). Bewust minimale ZICHTBARE paginatekst — de vereiste omvang (>8192 bytes, de
// chunkgrens van de 3F-a-bug) komt uit een groot, niet-gerenderd /Keywords-metadataveld, niet uit
// extra paginatekst. Dit voorkomt dat de aparte, nog niet gecommitte max_tokens-kwestie (Batch 3F)
// deze test kan beinvloeden — het testcriterium hier is uitsluitend de bestandsgrootte t.o.v. de
// 8192-byte-chunkgrens, niet de hoeveelheid te transcriberen tekst.
function maak3FaTestPdf() {
  const padding = 'A'.repeat(9000);
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n');
  const content = 'BT /F1 12 Tf 72 720 Td (PROD-SMOKE 3F-a testdocument) Tj ET';
  objects.push('4 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('6 0 obj\n<< /Keywords (' + padding + ') >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += xref;
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  return Buffer.from(pdf, 'latin1');
}

async function batch3Fa() {
  kop('3F-a · base64-fix bijlage-extractie (>8192 bytes)');
  let code;
  try {
    const t = await maakAdminTraject('PROD-SMOKE 3F-a BV');
    code = t.code;

    const gesprek = await api('POST', '/mna/gesprek/opslaan', { body: {
      code, datum: new Date().toISOString().slice(0, 10), deelnemers: 'Test', type: 'overig', ruwe_notities: 'Prod-smoke 3F-a',
    } });
    if (!gesprek.json || !gesprek.json.ok) faal('gesprek aanmaken mislukt', gesprek.json);
    const gesprekId = gesprek.json.id;

    const pdfBytes = maak3FaTestPdf();
    if (pdfBytes.length <= 8192) faal('testfixture is niet groot genoeg (moet >8192 bytes zijn)', { lengte: pdfBytes.length });

    const form = new FormData();
    form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'prod-smoke-3fa.pdf');
    const uploadResp = await fetch(WORKER + '/mna/admin/gesprek/bijlage/' + gesprekId, { method: 'POST', headers: { 'x-admin-key': ADMIN }, body: form });
    const uploadJson = await uploadResp.json().catch(() => null);
    check('upload: 200 ok:true', uploadResp.status === 200 && uploadJson && uploadJson.ok === true, JSON.stringify(uploadJson));
    check('extractie: tekst_beschikbaar=true (base64-fix werkt bij >8192 bytes)', !!(uploadJson && uploadJson.tekst_beschikbaar === true), JSON.stringify(uploadJson));

    const rijen = d1("SELECT bestand_grootte, length(tekst) AS tekst_len, r2_key FROM mna_gesprek_bijlagen WHERE gesprek_id='" + gesprekId + "'");
    const rij = rijen[0] || {};
    check('D1: bestandsgrootte >8192 bytes (de echte testconditie)', Number(rij.bestand_grootte) > 8192, JSON.stringify(rij));
    check('D1: geëxtraheerde tekst aanwezig en niet leeg', Number(rij.tekst_len) > 0, JSON.stringify(rij));
    check('D1: R2-sleutel aanwezig', !!rij.r2_key, JSON.stringify(rij));
  } finally {
    if (code) {
      await ruimTrajectOp(code);
      const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
      check('cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
    }
  }
}

// ── Batch 3H — markdown-fence-robuustheid bij DD-beoordeling AI-parsing ─────────────────────────
// Twee lagen (Marcel, 16 sep 2026): laag A test de daadwerkelijke productiefunctie zelf (geen
// gekopieerde regex — een live AI-call kan het fence-scenario niet betrouwbaar op afroep
// reproduceren, dus dit is de enige manier om de bugklasse zelf blijvend af te dekken); laag B is
// één representatieve live regressie tegen de echte route, met dezelfde DD-data als de staging-/
// productieregressie van vandaag.
async function laagA_parseFunctie() {
  const modulePad = path.join(BACKEND_DIR, 'worker', '03-parsers.js');
  const { extraheerJsonUitAiTekst } = await import(pathToFileURL(modulePad).href);

  const cases = [
    { naam: 'normaal (ongefenced) JSON', input: '{"analyse":"Solide kantoor, gezonde marge.","score":7}', verwachtScore: 7 },
    { naam: 'markdown-fenced JSON (```json ... ```)', input: '```json\n{"analyse":"Goed gedocumenteerd.","score":8}\n```', verwachtScore: 8 },
    { naam: 'JSON met omringende prosa', input: 'Hier is de analyse:\n{"analyse":"Redelijk compleet.","score":6}\nLaat het weten als je meer wilt.', verwachtScore: 6 },
  ];
  for (const c of cases) {
    let resultaat;
    try { resultaat = extraheerJsonUitAiTekst(c.input); } catch (e) { resultaat = null; }
    check('laag A · extraheerJsonUitAiTekst — ' + c.naam, !!resultaat && resultaat.score === c.verwachtScore, JSON.stringify(resultaat));
  }
}

async function batch3H() {
  kop('3H · markdown-fence-robuustheid DD-beoordeling (laag A: parsefunctie · laag B: live regressie)');
  await laagA_parseFunctie();

  let code;
  try {
    const t = await maakAdminTraject('PROD-SMOKE 3H BV');
    code = t.code;

    const save = await api('POST', '/mna/save', { adminKey: ADMIN, body: { code, fase_id: 'financieel', data_json: {
      omzet_2024: { label: 'Omzet 2024', value: '3.850.000' },
      marge_toelichting: { label: 'Toelichting marge', value: 'De EBITDA-marge is gestegen van 14,2 procent in 2022 naar 15,9 procent in 2024, gedreven door een verschuiving naar hogere-marge advieswerk en een gedisciplineerd uurtarievenbeleid, met een stabiele klantenportefeuille van circa 640 relaties zonder concentratierisico.' },
    } } });
    if (!save.json || !save.json.ok) faal('save fase financieel mislukt', save.json);

    const ai = await api('POST', '/mna/beoordeling/ai', { adminKey: ADMIN, body: { code, fase: 'financieel', categorie: 'C' } });
    check('laag B · beoordeling/ai: 200 ok:true', ai.status === 200 && ai.json && ai.json.ok === true, JSON.stringify(ai.json).slice(0, 200));
    const analyse = ai.json && ai.json.analyse;
    check('laag B · analyse correct geparsed (score niet null)', !!analyse && analyse.score !== null && analyse.score !== undefined, JSON.stringify(analyse).slice(0, 200));
    check('laag B · analysetekst is schoon (geen markdown-fence lekt door)', !!analyse && typeof analyse.analyse === 'string' && !analyse.analyse.includes('```'), JSON.stringify(analyse).slice(0, 200));

    const rijen = d1("SELECT categorie, score FROM mna_beoordelingen WHERE traject_id='" + code + "'");
    check('D1: beoordelingsrij aangemaakt', rijen.length === 1 && rijen[0].categorie === 'C', JSON.stringify(rijen));
  } finally {
    if (code) {
      await ruimTrajectOp(code);
      const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
      const restBeoordeling = d1("SELECT id FROM mna_beoordelingen WHERE traject_id='" + code + "'");
      check('cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
      check('cleanup: beoordelingsrij weg (cascade)', restBeoordeling.length === 0, JSON.stringify(restBeoordeling));
    }
  }
}

// ── Batch P264 — sector-benchmarkfallback in documentanalyse (19 sep 2026) ─────────────────────
// Zelfde reproductiemethode als de staging-regressietest (tests/regressie-p264-sectorbenchmark.mjs):
// een échte documentupload + AI-analyse voor een sector zonder eigen docBenchmarks (bouw, transport)
// mag NOOIT het accountancy-sectorlabel of de accountancy-EBITDA-margenorm (15-25%) krijgen; de
// positieve controle (accountancy, die wél eigen docBenchmarks heeft) moet ongewijzigd blijven werken.
const P264_ACCOUNTANCY_LABEL_RE = /accountants[- ]?(of|en)?\s*administratiekantoor/i;
const P264_ACCOUNTANCY_MARGE_RE = /15[-–]25\s*%/;

function p264Jaarrekening(sector, bedrijfsnaam) {
  const sectorTekst = {
    bouw: 'een regionale aannemer gespecialiseerd in utiliteitsbouw en installatietechniek',
    transport: 'een middelgroot transport- en logistiekbedrijf met een eigen wagenpark',
    accountancy: 'een regionaal accountants- en administratiekantoor met mkb-klanten in de regio',
  }[sector] || 'een onderneming';
  return 'JAARREKENING 2025\n' + bedrijfsnaam + '\nStatutair gevestigd te Barneveld, KvK 91234500\n\n'
    + '1. BESTUURSVERSLAG\n' + bedrijfsnaam + ' is ' + sectorTekst + '. Het boekjaar 2025 kende een omzetgroei\n'
    + 'van circa 8% ten opzichte van 2024. De personeelsbezetting groeide van 22 naar 26 FTE.\n\n'
    + '2. BALANS PER 31 DECEMBER 2025 (in €, vergelijkende cijfers 2024)\n'
    + 'ACTIVA                                    2025          2024\n'
    + 'Materiële vaste activa                   1.180.000     1.010.000\n'
    + 'Debiteuren                                  505.000       460.000\n'
    + 'TOTAAL ACTIVA                             1.925.000     1.665.000\n\n'
    + '3. WINST- EN VERLIESREKENING 2025 (in €, vergelijkende cijfers 2024 en 2023)\n'
    + '                                          2025         2024         2023\n'
    + 'Netto-omzet                            3.150.000    2.910.000    2.720.000\n'
    + 'EBITDA                                    380.000      395.000      405.000\n'
    + 'Resultaat na belasting                    195.000      216.000      230.000\n\n'
    + 'EBITDA-marge 2025: 12,1% van de omzet.\n\n'
    + '4. GRONDSLAGEN\nActiva en passiva worden gewaardeerd op nominale waarde, tenzij anders vermeld.\n\n'
    + '5. OVERIGE GEGEVENS\nDeze jaarrekening is samengesteld overeenkomstig Titel 9 Boek 2 BW voor kleine\n'
    + 'rechtspersonen; op grond van de wettelijke vrijstelling is geen accountantscontrole toegepast.';
}

async function p264TestSector(sector, bedrijfsnaam, verwachtAccountancyToegestaan) {
  const t = await maakAdminTraject('PROD-SMOKE P264 ' + sector + ' BV', { sector });
  const code = t.code;
  try {
    const bedrijfsnaamVol = bedrijfsnaam;
    const form = new FormData();
    form.append('file', new Blob([p264Jaarrekening(sector, bedrijfsnaamVol)], { type: 'text/plain' }), 'jaarrekening-2025.txt');
    const uploadResp = await fetch(WORKER + '/mna/document/upload?code=' + code + '&fase_id=financieel&bewaar=false', { method: 'POST', body: form });
    const uploadJson = await uploadResp.json().catch(() => null);
    check(sector + ': upload ok:true, niet verworpen', uploadResp.status === 200 && uploadJson && uploadJson.ok === true && uploadJson.verworpen === false, JSON.stringify(uploadJson && { ok: uploadJson.ok, verworpen: uploadJson.verworpen }));

    const analyse = (uploadJson && uploadJson.analyse) || '';
    if (verwachtAccountancyToegestaan) {
      check(sector + ' (positieve controle): analyse gegenereerd zonder fout', analyse.length > 0);
    } else {
      check(sector + ': GEEN accountancy-sectorlabel in de analyse', !P264_ACCOUNTANCY_LABEL_RE.test(analyse), analyse.slice(0, 300));
      check(sector + ': GEEN accountancy-EBITDA-margenorm (15-25%) in de analyse', !P264_ACCOUNTANCY_MARGE_RE.test(analyse), analyse.slice(0, 300));
    }
  } finally {
    await ruimTrajectOp(code);
    const rest = d1("SELECT id FROM mna_trajecten WHERE id='" + code + "'");
    check(sector + ' cleanup: traject weg', rest.length === 0, JSON.stringify(rest));
  }
}

async function batchP264() {
  kop('P264 · sector-benchmarkfallback in documentanalyse (bouw/transport/accountancy)');
  await p264TestSector('bouw', 'PROD-SMOKE P264 Bouw BV', false);
  await p264TestSector('transport', 'PROD-SMOKE P264 Transport BV', false);
  await p264TestSector('accountancy', 'PROD-SMOKE P264 Accountancy BV', true);
}

const BATCHEN = { '3B': batch3B, '3C': batch3C, '3D': batch3D, '3E': batch3E, '3F-A': batch3Fa, '3H': batch3H, 'P264': batchP264 };

async function main() {
  const naam = (process.argv[2] || '').toUpperCase();
  if (!BATCHEN[naam]) {
    console.log(kleur('rood', 'Onbekende of ontbrekende batch: "' + (process.argv[2] || '') + '"'));
    console.log('Beschikbaar: ' + Object.keys(BATCHEN).join(', '));
    console.log('Gebruik: node tests/prod-smoke.mjs <batch>   (bv. node tests/prod-smoke.mjs 3E)');
    process.exit(1);
  }
  if (!ADMIN) {
    console.log(kleur('rood', 'Geen ADMIN_KEY — zet ADMIN_KEY in de omgeving of geef --key=... mee. Nooit hardcoden.'));
    process.exit(1);
  }
  console.log(kleur('vet', 'Productie-smoke-test — batch ' + naam));
  console.log(kleur('grijs', 'Worker: ' + WORKER + '  ·  D1: ' + D1_NAAM));
  try {
    await BATCHEN[naam]();
  } catch (e) {
    console.log(kleur('rood', '\nFATALE FOUT tijdens ' + naam + ': ' + (e && e.message || e)));
    process.exitCode = 1;
    return;
  }
  const ok = samenvatting();
  console.log('\n' + (ok ? kleur('groen', 'PASS') : kleur('rood', 'FAIL')) + ' — batch ' + naam);
  process.exitCode = ok ? 0 : 1;
}

main();
