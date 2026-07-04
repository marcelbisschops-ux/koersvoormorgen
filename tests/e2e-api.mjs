// ══════════════════════════════════════════════════════════════════
// KantoorInzicht — End-to-end API-testsuite (Deel A)
//
// Draait tegen de LIVE Cloudflare Worker. Maakt eigen testdata aan
// (adviseur + trajecten) en ruimt die aan het einde volledig op.
// Raakt NOOIT het gevalideerde De Vries-demodossier (UZ24377).
//
// Gebruik:
//   node tests/e2e-api.mjs --key=ADMIN_KEY          (snel, gratis, stil)
//   ADMIN_KEY=... node tests/e2e-api.mjs            (key via omgeving)
//   node tests/e2e-api.mjs --key=... --ai           (+ AI-stappen, kost enkele dubbeltjes)
//   node tests/e2e-api.mjs --key=... --email         (+ echte e-mails via Resend)
//   node tests/e2e-api.mjs --key=... --full          (= --ai --email)
//
// Zonder admin-key draaien alleen de publieke checks (health, login).
// ══════════════════════════════════════════════════════════════════

import { WORKER, leesAdminKey, heeftVlag, api, check, sla_over, kop, kleur, samenvatting } from './lib.mjs';

const ADMIN = leesAdminKey();
const DOE_AI = heeftVlag('ai') || heeftVlag('full');
const DOE_EMAIL = heeftVlag('email') || heeftVlag('full');
const TEST_EMAIL_DOMEIN = '@bisschopsfinancing.test'; // bounced bewust; nooit een echte inbox

// Codes/ids die we aanmaken en aan het eind opruimen
const opruimTrajecten = [];
let opruimGebruikerId = null;
const WW = 'TestWachtwoord123!';

async function main() {
  console.log(kleur('vet', '\n╔══════════════════════════════════════════════╗'));
  console.log(kleur('vet', '║  KantoorInzicht — E2E API-tests                ║'));
  console.log(kleur('vet', '╚══════════════════════════════════════════════╝'));
  console.log(kleur('grijs', 'Worker : ' + WORKER));
  console.log(kleur('grijs', 'Modus  : ' + (DOE_AI ? 'AI aan' : 'AI uit') + ' · ' + (DOE_EMAIL ? 'e-mail aan' : 'e-mail uit')));

  // ─────────────── STAP 1: HEALTH ───────────────
  kop('STAP 1 · Health-check');
  {
    const r = await api('GET', '/health');
    check('/health geeft status 200', r.status === 200, 'status ' + r.status);
    check('/health geeft ok:true', r.json && r.json.ok === true, JSON.stringify(r.json));
  }

  // ─────────────── STAP 3a: ONGELDIGE LOGIN (publiek) ───────────────
  // (rol-login met geldige codes gebeurt in stap 3, na trajectcreatie)
  kop('STAP 2 · Ongeldige toegangscode wordt geweigerd');
  {
    const r = await api('POST', '/mna/traject/ZZZZ9999', { body: {} });
    check('onbekende code geeft 404', r.status === 404, 'status ' + r.status);
    check('foutmelding aanwezig', r.json && !!r.json.error, JSON.stringify(r.json));
  }

  if (!ADMIN) {
    console.log('\n' + kleur('geel', 'Geen admin-key opgegeven — de admin-afhankelijke stappen (3–9) worden overgeslagen.'));
    console.log(kleur('grijs', 'Geef de key mee met --key=... of via de ADMIN_KEY omgevingsvariabele.'));
    return;
  }

  // ─────────────── STAP 3: ADVISEUR-LIFECYCLE + MODULE-GATING ───────────────
  kop('STAP 3 · Adviseur uitnodigen, activeren, verkoop-instellingen');
  const email = 'e2e-adviseur-' + Date.now() + TEST_EMAIL_DOMEIN;
  {
    const uit = await api('POST', '/gebruikers/uitnodigen', {
      adminKey: ADMIN,
      body: { naam: 'E2E Testadviseur', bedrijf: 'E2E Testkantoor BV', email }
    });
    check('uitnodigen ok:true', uit.json && uit.json.ok === true, JSON.stringify(uit.json));
    const token = uit.json && uit.json.token;
    opruimGebruikerId = uit.json && uit.json.id;
    check('invite-token ontvangen', !!token, 'geen token');
    check('gebruiker-id ontvangen', !!opruimGebruikerId, 'geen id');

    if (token) {
      const act = await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord: WW } });
      check('account activeren ok', act.json && act.json.ok === true, JSON.stringify(act.json));
    }

    // Verkoop: limiet 3, alle modules aan (nodig voor contracten/ai_analyse-tests verderop)
    const verk = await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, {
      adminKey: ADMIN,
      body: { traject_limiet: 3, modules: { traject: true, contracten: true, ai_analyse: true, qa: true, export: true } }
    });
    check('verkoop-instelling ok (limiet 3, alle modules)', verk.json && verk.json.ok === true, JSON.stringify(verk.json));
    check('modules.contracten actief', verk.json && verk.json.modules && verk.json.modules.contracten === true);
  }

  // ─────────────── STAP 4: TRAJECT AANMAKEN + LIMIET AFDWINGEN ───────────────
  kop('STAP 4 · Traject aanmaken en trajectlimiet afdwingen');
  let hoofdTraject = null; // {code, koper_code, tussen_code}
  {
    const trajectData = {
      kantoor_naam: 'E2E Overname Testkantoor BV',
      contact_naam: 'Test Verkoper',
      contact_email: 'verkoper' + TEST_EMAIL_DOMEIN,
      koper_naam: 'E2E Koper Holding BV',
      koper_contact: 'Test Koper',
      koper_email: 'koper' + TEST_EMAIL_DOMEIN,
      traject_type: 'Verkoop'
    };
    const c1 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: trajectData } });
    check('eerste traject aangemaakt (ok:true)', c1.json && c1.json.ok === true, JSON.stringify(c1.json));
    if (c1.json && c1.json.code) {
      hoofdTraject = { code: c1.json.code, koper_code: c1.json.koper_code, tussen_code: c1.json.tussen_code };
      opruimTrajecten.push(c1.json.code);
      check('traject heeft verkoper/koper/tussen-code', !!(c1.json.code && c1.json.koper_code && c1.json.tussen_code));
    }

    // Limiet tijdelijk op 1 → tweede create moet falen (er staat al 1 traject)
    await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, { adminKey: ADMIN, body: { traject_limiet: 1 } });
    const c2 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E Tweede Kantoor BV' } } });
    check('tweede traject wordt geblokkeerd door limiet', c2.status === 403 && /limiet/i.test(c2.json && c2.json.error || ''), JSON.stringify(c2.json));

    // Limiet terug naar 3 → tweede create lukt nu
    await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, { adminKey: ADMIN, body: { traject_limiet: 3 } });
    const c3 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E Tweede Kantoor BV' } } });
    check('na limietverhoging lukt tweede traject', c3.json && c3.json.ok === true, JSON.stringify(c3.json));
    if (c3.json && c3.json.code) opruimTrajecten.push(c3.json.code);

    // Module traject uit → create moet falen met upsell-melding
    await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, { adminKey: ADMIN, body: { modules: { traject: false } } });
    const c4 = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'E2E Geblokkeerd Kantoor BV' } } });
    check('module "traject" uit → aanmaken geblokkeerd', c4.status === 403 && /Module Traject/i.test(c4.json && c4.json.error || ''), JSON.stringify(c4.json));
    // Module weer aan voor de rest van de tests
    await api('POST', '/gebruikers/verkoop/' + opruimGebruikerId, { adminKey: ADMIN, body: { modules: { traject: true } } });
  }

  if (!hoofdTraject) {
    console.log('\n' + kleur('rood', 'Geen hoofdtraject aangemaakt — resterende stappen worden overgeslagen.'));
    return;
  }

  // ─────────────── STAP 5: ROLLEN-LOGIN ───────────────
  kop('STAP 5 · Rollen-login (verkoper / koper / tussenpersoon)');
  {
    const v = await api('POST', '/mna/traject/' + hoofdTraject.code, { body: {} });
    check('verkoper-code geeft rol "verkoper"', v.json && v.json.rol === 'verkoper', JSON.stringify(v.json && v.json.rol));

    const k = await api('POST', '/mna/traject/' + hoofdTraject.koper_code, { body: {} });
    check('koper-code geeft rol "koper"', k.json && k.json.rol === 'koper', JSON.stringify(k.json && k.json.rol));

    const t = await api('POST', '/mna/traject/' + hoofdTraject.tussen_code, { body: {} });
    check('tussen-code geeft rol "tussenpersoon"', t.json && t.json.rol === 'tussenpersoon', JSON.stringify(t.json && t.json.rol));
    check('tussenpersoon krijgt modules mee', t.json && t.json.modules && typeof t.json.modules === 'object', JSON.stringify(t.json && t.json.modules));
    check('modules.contracten is actief (uit verkoop)', t.json && t.json.modules && t.json.modules.contracten === true);
  }

  // ─────────────── STAP 6: DD-DATA OPSLAAN EN TERUGLEZEN ───────────────
  kop('STAP 6 · DD-data opslaan (/mna/save) en teruglezen');
  {
    const dataJson = {
      financieel_omzet3: { label: 'Omzet laatste jaar', value: '1.850.000' },
      financieel_ebitda: { label: 'EBITDA', value: '295.000' }
    };
    const save = await api('POST', '/mna/save', { body: { code: hoofdTraject.code, fase_id: 'financieel', data_json: dataJson } });
    check('opslaan ok:true', save.json && save.json.ok === true, JSON.stringify(save.json));
    check('opslaan telt 2 velden', save.json && save.json.velden === 2, JSON.stringify(save.json && save.json.velden));

    const terug = await api('POST', '/mna/traject/' + hoofdTraject.code, { body: {} });
    const faseRij = terug.json && Array.isArray(terug.json.data) && terug.json.data.find(d => d.fase_id === 'financieel');
    check('opgeslagen fase-data is terug te lezen', !!faseRij, 'financieel-rij niet gevonden');
    if (faseRij) {
      const dj = typeof faseRij.data_json === 'string' ? JSON.parse(faseRij.data_json) : faseRij.data_json;
      check('teruggelezen EBITDA-waarde klopt', dj && dj.financieel_ebitda && dj.financieel_ebitda.value === '295.000', JSON.stringify(dj && dj.financieel_ebitda));
    }
  }

  // ─────────────── STAP 7: FASE-WIJZIGING VIA LOGBOEK ───────────────
  kop('STAP 7 · Fasewijziging via logboek-endpoint');
  {
    const fase = await api('POST', '/mna/logboek/' + hoofdTraject.tussen_code, {
      body: { nieuwe_fase: 'due_diligence', auteur_naam: 'E2E Test' }
    });
    check('fasewijziging ok:true', fase.json && fase.json.ok === true, JSON.stringify(fase.json));
    check('endpoint bevestigt fase_gewijzigd', fase.json && fase.json.fase_gewijzigd === 1, JSON.stringify(fase.json));

    const na = await api('POST', '/mna/traject/' + hoofdTraject.code, { body: {} });
    check('traject_fase staat nu op due_diligence', na.json && na.json.traject && na.json.traject.traject_fase === 'due_diligence', JSON.stringify(na.json && na.json.traject && na.json.traject.traject_fase));

    // Terugzetten naar voorgesprek (nette staat)
    await api('POST', '/mna/logboek/' + hoofdTraject.tussen_code, { body: { nieuwe_fase: 'voorgesprek', auteur_naam: 'E2E Test' } });
  }

  // ─────────────── STAP 7b: GEFASEERDE KOPER-TOEGANG (per categorie) ───────────────
  kop('STAP 7b · Gefaseerde koper-toegang per DD-categorie');
  {
    // Tweede categorie met data zodat we filtering kunnen aantonen (financieel bestaat al uit stap 6)
    await api('POST', '/mna/save', { body: { code: hoofdTraject.code, fase_id: 'commercieel', data_json: { commercieel_klanten: { label: 'Aantal klanten', value: '120' } } } });

    // Alleen 'financieel' vrijgeven (force=1 omslaat de NDA-check voor de test)
    const zet = await api('POST', '/mna/koper-categorieen/' + hoofdTraject.code + '?force=1', { adminKey: ADMIN, body: { categorieen: ['financieel'] } });
    check('categorie-vrijgave ok:true', zet.json && zet.json.ok === true, JSON.stringify(zet.json));
    check('endpoint zet koper_vrijgegeven=1', zet.json && zet.json.koper_vrijgegeven === 1, JSON.stringify(zet.json));

    // Koper logt in: moet ALLEEN financieel zien, niet commercieel
    const kLogin = await api('POST', '/mna/traject/' + hoofdTraject.koper_code, { body: {} });
    const faseIds = (kLogin.json && Array.isArray(kLogin.json.data)) ? kLogin.json.data.map(d => d.fase_id) : [];
    check('koper ontvangt financieel-data', faseIds.includes('financieel'), JSON.stringify(faseIds));
    check('koper ontvangt GEEN niet-vrijgegeven commercieel-data', !faseIds.includes('commercieel'), JSON.stringify(faseIds));
    check('login geeft koper_categorieen mee', kLogin.json && Array.isArray(kLogin.json.koper_categorieen) && kLogin.json.koper_categorieen[0] === 'financieel', JSON.stringify(kLogin.json && kLogin.json.koper_categorieen));

    // Volledig intrekken → koper ziet niets meer
    const leeg = await api('POST', '/mna/koper-categorieen/' + hoofdTraject.code, { adminKey: ADMIN, body: { categorieen: [] } });
    check('intrekken zet koper_vrijgegeven=0', leeg.json && leeg.json.koper_vrijgegeven === 0, JSON.stringify(leeg.json));
    const kLeeg = await api('POST', '/mna/traject/' + hoofdTraject.koper_code, { body: {} });
    check('koper ziet geen enkele DD-data na intrekken', kLeeg.json && Array.isArray(kLeeg.json.data) && kLeeg.json.data.length === 0, JSON.stringify(kLeeg.json && kLeeg.json.data && kLeeg.json.data.length));
  }

  // ─────────────── STAP 8: DOCUMENTUPLOAD + AI-EXTRACTIE (--ai) ───────────────
  kop('STAP 8 · Documentupload + AI-extractie');
  if (DOE_AI) {
    const csv = 'Post,Bedrag\nOmzet,1850000\nBrutomarge,1200000\nEBITDA,295000\nPersoneelskosten,760000\n';
    const fd = new FormData();
    fd.append('file', new Blob([csv], { type: 'text/csv' }), 'e2e-cijfers.csv');
    let up;
    try {
      const resp = await fetch(WORKER + '/mna/document/upload?code=' + hoofdTraject.code + '&fase_id=financieel&bewaar=false', { method: 'POST', body: fd });
      const tekst = await resp.text();
      let json = null; try { json = JSON.parse(tekst); } catch {}
      up = { status: resp.status, json, tekst };
    } catch (e) { up = { status: 0, json: null, tekst: e.message }; }
    check('upload ok:true', up.json && up.json.ok === true, (up.tekst || '').slice(0, 160));
    check('response bevat veld_extractie-object', up.json && typeof up.json.veld_extractie === 'object' && up.json.veld_extractie !== null, JSON.stringify(up.json && up.json.veld_extractie).slice(0, 160));
    check('document heeft een doc_id', up.json && !!up.json.doc_id);
  } else {
    sla_over('AI-documentextractie', 'draai met --ai (kost enkele centen)');
  }

  // ─────────────── STAP 9: WAARDERING GENEREREN (--ai) ───────────────
  kop('STAP 9 · Waardering genereren');
  if (DOE_AI) {
    const w = await api('POST', '/mna/waardering/genereer', { adminKey: ADMIN, body: { code: hoofdTraject.code } });
    check('waardering ok:true', w.json && w.json.ok === true, (w.tekst || '').slice(0, 160));
    const wd = w.json && w.json.waardering;
    check('waardering-JSON heeft een methode', wd && typeof wd.methode === 'string');
    check('waardering-JSON heeft numerieke range', wd && [wd.range_laag, wd.range_midden, wd.range_hoog].every(n => typeof n === 'number'), JSON.stringify(wd && { l: wd.range_laag, m: wd.range_midden, h: wd.range_hoog }));
    check('waardering opgeslagen (id teruggegeven)', w.json && !!w.json.id);
  } else {
    sla_over('AI-waardering', 'draai met --ai (kost enkele centen)');
  }

  // ─────────────── STAP 10: DOCUMENT-E-MAIL + VERSIEHISTORIE (--email) ───────────────
  kop('STAP 10 · Document-e-mail + versiehistorie (NDA)');
  if (DOE_EMAIL) {
    const ndaTekst = 'GEHEIMHOUDINGSOVEREENKOMST (E2E-TEST)\n\nDit is een automatisch gegenereerd testdocument. Niet ondertekenen.';
    const em = await api('POST', '/mna/nda/email', { body: { code: hoofdTraject.code, nda_tekst: ndaTekst, to: ['verkoper' + TEST_EMAIL_DOMEIN] } });
    check('NDA-e-mail ok:true', em.json && em.json.ok === true, (em.tekst || '').slice(0, 200));

    const versies = await api('GET', '/mna/versies/' + hoofdTraject.code);
    const ndaVersie = Array.isArray(versies.json) && versies.json.find(v => v.doc_type === 'nda');
    check('NDA-versie staat in mna_doc_versies', !!ndaVersie, 'geen nda-versie gevonden');
  } else {
    sla_over('Document-e-mail + versiehistorie', 'draai met --email (verstuurt echte e-mails)');
  }
}

// ─────────────── OPRUIMEN (altijd, ook bij fout) ───────────────
async function opruimen() {
  kop('OPRUIMEN · Testdata verwijderen');
  if (!ADMIN) { sla_over('opruimen', 'geen admin-key'); return; }
  for (const code of opruimTrajecten) {
    if (code === 'UZ24377') { console.log('  ' + kleur('rood', '‼ WEIGERT De Vries-demodossier te verwijderen — overgeslagen')); continue; }
    const d = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
    check('traject ' + code + ' verwijderd', d.json && d.json.ok === true, JSON.stringify(d.json));
  }
  if (opruimGebruikerId) {
    const d = await api('POST', '/gebruikers/verwijder/' + opruimGebruikerId, { adminKey: ADMIN, body: {} });
    check('testadviseur verwijderd', d.json && d.json.ok === true, JSON.stringify(d.json));
  }
}

try {
  await main();
} catch (e) {
  console.log('\n' + kleur('rood', 'ONVERWACHTE FOUT: ' + e.stack));
  check('suite liep zonder onverwachte fout', false, e.message);
} finally {
  await opruimen();
  const geslaagd = samenvatting();
  process.exit(geslaagd ? 0 : 1);
}
