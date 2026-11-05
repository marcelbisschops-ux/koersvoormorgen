// MASTER #91 (28 okt 2026): end-to-end-proef van de verkoopstraat op STAGING met een volledig fictief
// accountantskantoor ("Synth Voorbeeld Administratie B.V."). Keten: traject → intake → transactievorm →
// kolommenbalansen (3 jaar) → adaptief concept-IM (één echte AI-aanroep) → verkopersreview → akkoord →
// definitief → NDA-waarborg bij versturen. Ruimt het traject altijd op. Weigert te draaien tegen productie.
// Draaien: set -a; source tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-91-verkoopstraat.mjs
import { api, check, kop, samenvatting, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } from './lib.mjs';

if (!IS_STAGING_WORKER) { console.log('Deze proef draait uitsluitend tegen staging.'); process.exit(2); }
const ADMIN = leesAdminKey();
const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((x) => x.toString(16).padStart(2, '0')).join('');
const kb = (f) => ['Rekening;Omschrijving;Debet;Credit', '0100;Inventaris;' + f(20000) + ';', '0200;Aandelenkapitaal;;' + f(18000), '0250;Privé-onttrekkingen;' + f(99900) + ';',
  '0600;Lening bank;;' + f(50000), '1000;Kas;' + f(1500) + ';', '1100;Bank;' + f(40000) + ';', '1300;Debiteuren;' + f(60000) + ';', '1600;Crediteuren;;' + f(15000),
  '1700;Omzetbelasting af te dragen;;' + f(12000), '4000;Salarissen;' + f(300000) + ';', '4100;Huur kantoorpand;' + f(36000) + ';', '4200;Autokosten;' + f(12000) + ';',
  '4300;Kantoorkosten;' + f(18000) + ';', '4800;Afschrijving inventaris;' + f(5000) + ';', '4900;Rentelasten;' + f(2500) + ';', '8000;Omzet advieswerk;;' + f(500000), '9999;Diversen;' + f(100) + ';'].join('\n');
const nl = (n) => n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

kop('#91 verkoopstraat · end-to-end op staging (fictief accountantskantoor)');
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth Voorbeeld Administratie B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'delivered@resend.dev' } });
const V = c.json && c.json.code, T = c.json && c.json.tussen_code;
check('traject aangemaakt', !!(V && T), 'status ' + c.status);
const B = { 'x-tussen-key': T };
try {
  await accepteerPlatformvoorwaarden([V, T]);
  // Intake (fictief; alleen enkele velden, de rest blijft bewust leeg: het IM moet adaptief zijn)
  const sv = (fase, velden) => api('POST', '/mna/save', { body: { code: V, fase_id: fase, data_json: Object.fromEntries(Object.entries(velden).map(([k, [v, l]]) => [k, { value: v, label: l }])), checklist_json: {} } });
  const s1 = await sv('strategisch', { niche: ['Jaarwerk en payroll voor detailhandel', 'Niche of specialisme'], marktpos: ['Midden-Nederland', 'Marktpositie / regio'], redenVerkoop: ['Opvolging: vennoot gaat met pensioen', 'Reden van verkoop'] });
  const s2 = await sv('partner', { fte: ['14', 'FTE'] });
  const s3 = await sv('commercieel', { aantalKlanten: ['420', 'Aantal klanten'], dienstenmix: ['Jaarwerk, payroll en fiscale advisering', 'Dienstenmix'] });
  check('intake opgeslagen (strategisch, partner, commercieel; financieel bewust leeg)', [s1, s2, s3].every((r) => r.status === 200), [s1, s2, s3].map((r) => r.status).join(','));
  // Transactievorm
  const tv = await api('POST', '/mna/transactiemodel/verkoper', { body: { code: V, verkoper: { structuur: 'share', omvang: 'volledig', betaling: ['direct', 'earn_out'], advies: 'gewenst' }, basis_versie: 0 } });
  check('transactievorm verkoper vastgelegd', tv.status === 200 && tv.json.versie === 1, tv.status);
  // Kolommenbalansen 2022-2024 (2022 en 2023 geschaald), Diversen handmatig toe te wijzen
  for (const [jaar, factor] of [[2022, 0.9], [2023, 0.95], [2024, 1]]) {
    const csv = kb((x) => nl(Math.round(x * factor * 100) / 100));
    const up = await api('POST', '/mna/kolommenbalans/upload', { body: { code: V, jaar, bestand_naam: 'kolommenbalans-' + jaar + '.csv', inhoud_base64: Buffer.from(csv).toString('base64') } });
    check('kolommenbalans ' + jaar + ' ingelezen door de verkoper (status controle)', up.status === 200 && up.json.jaren.some((j) => j.jaar === jaar && j.status === 'controle'), up.status + ' ' + JSON.stringify(up.json).slice(0, 160));
  }
  let lijst = (await api('GET', '/mna/kolommenbalans?code=' + T, { headers: B })).json.jaren;
  for (const j of lijst) {
    const tw = await api('POST', '/mna/kolommenbalans/toewijzen', { headers: B, body: { code: T, jaar: j.jaar, rekening: '9999', categorie: 'overig_resultaat', rev: j.rev } });
    check('begeleider wijst Diversen ' + j.jaar + ' toe → gereed', tw.status === 200 && tw.json.jaren.find((x) => x.jaar === j.jaar).status === 'gereed', tw.status);
  }
  lijst = (await api('GET', '/mna/kolommenbalans?code=' + T, { headers: B })).json.jaren;
  const j24 = lijst.find((j) => j.jaar === 2024);
  check('exploitatie 2024 = rekenvoorbeeld (EBITDA 134.000, werkkapitaal 33.000, netto schuld 8.500)', j24 && j24.exploitatie.ebitda === 134000 && j24.werkkapitaal === 33000 && j24.netto_schuld === 8500, JSON.stringify(j24 && j24.exploitatie));
  // Fase B: normalisatie (voorstel → goedkeuring), prognose met basiscontrole, KPI, rolgrens
  const nmBody = { jaar: 2024, post: 'algemeen', soort: 'incidenteel', bedrag: 10000, omschrijving: 'Eenmalige verhuiskosten', bron: 'Kolommenbalans 2024, rekening 4300', karakter: 'incidenteel', zekerheid: 'hoog' };
  const nmV = await api('POST', '/mna/financieel/normalisatie', { body: { code: V, ...nmBody } });
  check('verkoper stelt normalisatie voor (status voorstel, telt nog niet mee)', nmV.status === 200 && nmV.json.normalisaties.some((n) => n.status === 'voorstel') && nmV.json.jaren.at(-1).genormaliseerd.ebitda === 134000, nmV.status);
  const nm = nmV.json.normalisaties[0];
  const bkV = await api('POST', '/mna/financieel/normalisatie/beoordeel', { body: { code: V, id: nm.id, rev: nm.rev, status: 'goedgekeurd', motivering: 'x' } });
  check('verkoper kan eigen normalisatie niet goedkeuren (403)', bkV.status === 403, bkV.status);
  const bk = await api('POST', '/mna/financieel/normalisatie/beoordeel', { headers: B, body: { code: T, id: nm.id, rev: nm.rev, status: 'goedgekeurd', motivering: 'Verhuizing 2024 aantoonbaar eenmalig.' } });
  const g24 = bk.json && bk.json.jaren.at(-1);
  check('goedgekeurd → genormaliseerd EBITDA 2024 = 144.000, marge 28,8%', bk.status === 200 && g24.genormaliseerd.ebitda === 144000 && g24.kpi.ebitda_marge_pct === 28.8, JSON.stringify(g24 && g24.kpi));
  let fin = (await api('GET', '/mna/financieel?code=' + T, { headers: B })).json;
  const pg = await api('POST', '/mna/financieel/prognose', { headers: B, body: { code: T, rev: fin.prognose.rev, aannames: [{ omzet_groei_pct: 5, personeel_groei_pct: 3, overige_kosten_groei_pct: 2 }], fte: { 2024: 14 } } });
  const pgOk = await api('POST', '/mna/financieel/prognose/goedkeuren', { headers: B, body: { code: T, rev: pg.json && pg.json.prognose.rev } });
  check('prognose 2025 goedgekeurd (omzet 525.000), EBITDA/fte 2024 = 10.286', pgOk.status === 200 && pgOk.json.prognose.status === 'goedgekeurd' && pgOk.json.prognose.jaren[0].exploitatie.omzet === 525000 && pgOk.json.jaren.at(-1).kpi.ebitda_per_fte === 10285.71, pg.status + '/' + pgOk.status + ' ' + JSON.stringify(pgOk.json && pgOk.json.jaren.at(-1).kpi));
  const nm2 = await api('POST', '/mna/financieel/normalisatie', { headers: B, body: { code: T, ...nmBody, bedrag: 2000, omschrijving: 'Eenmalige advieskosten', soort: 'advieskosten' } });
  const nm2r = nm2.json.normalisaties.find((n) => n.omschrijving === 'Eenmalige advieskosten');
  const bk2 = await api('POST', '/mna/financieel/normalisatie/beoordeel', { headers: B, body: { code: T, id: nm2r.id, rev: nm2r.rev, status: 'goedgekeurd', motivering: 'Eenmalig advies.' } });
  check('gewijzigde basis → prognose-goedkeuring vervalt (concept, basis_gewijzigd)', bk2.status === 200 && bk2.json.prognose.status === 'concept' && bk2.json.prognose.basis_gewijzigd === true, JSON.stringify(bk2.json && bk2.json.prognose && bk2.json.prognose.status));
  const vk = await api('GET', '/mna/financieel?code=' + V);
  check('verkoper ziet financiële analyse (200), onbekende code 404', vk.status === 200 && (await api('GET', '/mna/financieel?code=XX00000')).status === 404, vk.status);
  // Fase C: verdienmodel, factuuroverzicht 2024 (fictief, totaal 500.000 = omzet kolommenbalans), klantenanalyse
  const fk = ['Factuurnummer;Factuurdatum;Klant;Bedrag;Werksoort;Branche;Uren;Standaardtarief',
    ...[['Een', 150000, 'Jaarwerk', 'Detailhandel'], ['Twee', 100000, 'Payroll', 'Horeca'], ['Drie', 80000, 'Jaarwerk', 'Bouw'], ['Vier', 70000, 'Advies', 'Bouw'],
      ['Vijf', 50000, 'Jaarwerk', 'Zorg'], ['Zes', 30000, 'Payroll', 'Horeca'], ['Zeven', 20000, 'Advies', 'Detailhandel']]
      .map(([n, b, w, br], i) => 'F24-' + (i + 1) + ';' + String(i + 1).padStart(2, '0') + '-03-2024;Synth Klant ' + n + ';' + nl(b) + ';' + w + ';' + br + ';' + Math.round(b / 125) + ';125')].join('\n');
  let ka = (await api('GET', '/mna/klantanalyse?code=' + V)).json;
  const kaUp = await api('POST', '/mna/klantanalyse/upload', { body: { code: V, rev: ka.rev, bestand_naam: 'facturen-2024.csv', inhoud_base64: Buffer.from(fk).toString('base64') } });
  const k24 = kaUp.json && kaUp.json.jaren && kaUp.json.jaren.find((j) => j.jaar === 2024);
  check('verkoper leest factuuroverzicht in: 7 relaties, top1 30%, sluit aan op kolommenbalans 500.000', kaUp.status === 200 && k24 && k24.relaties === 7 && k24.concentratie.top1_pct === 30 && k24.aansluiting.status === 'sluit', kaUp.status + ' ' + JSON.stringify(k24 && k24.aansluiting));
  const kaVm = await api('POST', '/mna/klantanalyse/verdienmodel', { headers: B, body: { code: T, rev: kaUp.json.rev, model: 'abonnement', facturatie: 'maandelijks' } });
  check('begeleider legt verdienmodel vast', kaVm.status === 200 && kaVm.json.verdienmodel.model === 'abonnement', kaVm.status);
  check('koper heeft geen toegang tot de klantenanalyse (403)', (await api('GET', '/mna/klantanalyse?code=' + c.json.koper_code)).status === 403);
  // Fase D: personeel (alleen aggregaten), huisvesting en IT
  const ps = ['Naam;Functie;FTE;Geboortejaar;In dienst sinds;Contract;Loonkosten;Partner', 'Synth Medewerker A;Partner;1;1966;01-01-2001;vast;120000;ja',
    'Synth Medewerker B;Assistent accountant;1;1990;01-06-2018;vast;60000;nee', 'Synth Medewerker C;Assistent accountant;0,8;1992;01-01-2020;vast;48000;nee',
    'Synth Medewerker D;Assistent accountant;1;1995;01-01-2023;bepaalde tijd;50000;nee'].join('\n');
  let org = (await api('GET', '/mna/organisatie?code=' + V)).json;
  const psUp = await api('POST', '/mna/organisatie/personeel', { body: { code: V, rev: org.rev, peiljaar: 2024, bestand_naam: 'personeel.csv', inhoud_base64: Buffer.from(ps).toString('base64') } });
  check('verkoper leest personeelsoverzicht in: 4 medewerkers, 3,8 fte, geen namen in de response', psUp.status === 200 && psUp.json.personeel.aantal === 4 && psUp.json.personeel.fte === 3.8 && !/Synth Medewerker/.test(JSON.stringify(psUp.json)), psUp.status + ' ' + (psUp.json && psUp.json.error));
  const lc = await api('POST', '/mna/organisatie/locaties', { headers: B, body: { code: T, rev: psUp.json.rev, locaties: [{ plaats: 'Utrecht', eigendom: 'huur', m2: 400, huur_per_jaar: 36000, einddatum: '2027-12-31', werkplekken: 18 }] } });
  const itS = await api('POST', '/mna/organisatie/it', { headers: B, body: { code: T, rev: lc.json && lc.json.rev, systemen: [{ naam: 'Synth Boekhoudpakket', categorie: 'boekhouding', hosting: 'cloud', overdraagbaar: 'ja', kosten_per_jaar: 9000 }] } });
  check('begeleider legt huisvesting en IT vast (IT 1,8% van de omzet)', lc.status === 200 && itS.status === 200 && itS.json.it_analyse.kosten_pct_omzet === 1.8 && itS.json.huisvesting.m2 === 400, lc.status + '/' + itS.status + ' ' + JSON.stringify(itS.json && itS.json.it_analyse));
  check('koper heeft geen toegang tot personeel/huisvesting/IT (403)', (await api('GET', '/mna/organisatie?code=' + c.json.koper_code)).status === 403);
  // Adaptief concept-IM (één echte AI-aanroep, zonder NDA)
  const g = await api('POST', '/mna/verkoopmemorandum/genereer', { headers: B, body: { code: T } });
  const im = String((g.json && g.json.verkoopmemorandum_tekst) || '');
  check('concept-IM gegenereerd zonder NDA (200)', g.status === 200 && im.length > 500, g.status + ' ' + (g.json && g.json.error));
  check('IM: geen plaatshouders of ontbrekende-informatie-zinnen, geen ruwe tokens', !/niet aangeleverd|nog in te vullen|\[CIJFER|\bTBD\b|lorem/i.test(im));
  check('IM: hoofdstuk Financiële ontwikkeling met kolommenbalanscijfers', /## Financiële ontwikkeling/.test(im) && /500\.000/.test(im));
  check('IM: drie gereed boekjaren als bron (2022-2024 in de tekst)', /2022/.test(im) && /2023/.test(im) && /2024/.test(im));
  check('IM: klantenportefeuille geanonimiseerd (Klant 1, geen klantnamen) en verdienmodel', /## Klantenportefeuille/.test(im) && /\| Klant 1 \|/.test(im) && !/Synth Klant/.test(im) && /Verdienmodel: abonnement/.test(im));
  check('IM: kerngegevens organisatie/huisvesting/IT zonder namen, kleine groep onderdrukt', /## Kerngegevens organisatie, huisvesting en IT/.test(im) && /\| Partner \| minder dan 3 \|/.test(im) && /Utrecht: gehuurd tot 2027/.test(im) && !/Synth Medewerker/.test(im));
  check('IM: intern_ontbrekend alleen in de response', Array.isArray(g.json.intern_ontbrekend) && !im.includes('intern_ontbrekend'));
  // Fase E / #96: feiten alleen bij de bron; versturen alleen definitief
  const imOud = im;
  const kernWijz = imOud.replace(/(## Financiële kerncijfers[\s\S]*?)€ 500\.000/, '$1€ 600.000');
  const opsF = await api('POST', '/mna/verkoopmemorandum/opslaan', { headers: B, body: { code: T, tekst: kernWijz } });
  check('IM-opslaan met gewijzigd cijfer in de kerncijfers → 409 FEITENBLOK_GEWIJZIGD', kernWijz !== imOud && opsF.status === 409 && opsF.json.code === 'FEITENBLOK_GEWIJZIGD', opsF.status + ' ' + (opsF.json && opsF.json.code));
  const mailC = await api('POST', '/mna/verkoopmemorandum/email', { headers: B, body: { code: T, verkoopmemorandum_tekst: imOud, to: ['synth@example.invalid'] } });
  check('concept-IM versturen → 409 DEFINITIEF_VEREIST', mailC.status === 409 && mailC.json.code === 'DEFINITIEF_VEREIST', mailC.status);
  const kv = await api('POST', '/mna/verkoopmemorandum/kerngegevens', { headers: B, body: { code: T } });
  check('kerngegevens vernieuwen direct na generatie → al actueel (geen wijziging)', kv.status === 200 && kv.json.gewijzigd === false, kv.status + ' ' + JSON.stringify(kv.json).slice(0, 120));
  const pdfK = await api('GET', '/mna/verkoopmemorandum/pdf?code=' + V);
  check('voorbeeld-PDF als verkoper → 403 (alleen begeleider)', pdfK.status === 403, pdfK.status);
  // Verkopersreview
  let rv = (await api('GET', '/mna/im-review?code=' + T, { headers: B })).json;
  const deel = await api('POST', '/mna/im-review/deel', { headers: B, body: { code: T, rev: rv.rev } });
  check('concept gedeeld met de verkoper', deel.status === 200 && deel.json.status === 'TER_BEOORDELING_VERKOPER', deel.status);
  rv = (await api('GET', '/mna/im-review?code=' + V)).json;
  const opm = await api('POST', '/mna/im-review/opmerking', { body: { code: V, rev: rv.rev, onderdeel: 'Financiële ontwikkeling', soort: 'cijfer', tekst: 'Graag ook de groei per jaar noemen.' } });
  check('verkoper plaatst opmerking', opm.status === 200 && opm.json.status === 'OPMERKINGEN_ONTVANGEN', opm.status);
  const bo = await api('POST', '/mna/im-review/opmerking/beoordeel', { headers: B, body: { code: T, rev: opm.json.rev, id: opm.json.id, status: 'verwerkt' } });
  check('begeleider beoordeelt opmerking als verwerkt', bo.status === 200 && bo.json.status === 'IN_BEWERKING', bo.status);
  const tg = await api('POST', '/mna/im-review/ter-goedkeuring', { headers: B, body: { code: T, rev: bo.json.rev } });
  check('ter goedkeuring aangeboden', tg.status === 200 && tg.json.status === 'TER_GOEDKEURING_VERKOPER', tg.status);
  const defZonder = await api('POST', '/mna/verkoopmemorandum/definitief', { headers: B, body: { code: T, tekst_sha256: await sha(im), vastgesteld_door: 'Synth Begeleider' } });
  check('definitief vóór akkoord → 409 VERKOPER_AKKOORD_ONTBREEKT', defZonder.status === 409 && defZonder.json.code === 'VERKOPER_AKKOORD_ONTBREEKT', defZonder.status);
  rv = (await api('GET', '/mna/im-review?code=' + V)).json;
  const ak = await api('POST', '/mna/im-review/akkoord', { body: { code: V, rev: rv.rev, tekst_sha256: rv.gedeelde_sha256 } });
  check('verkoper geeft akkoord op de gedeelde versie', ak.status === 200, ak.status);
  const def = await api('POST', '/mna/verkoopmemorandum/definitief', { headers: B, body: { code: T, tekst_sha256: rv.gedeelde_sha256, vastgesteld_door: 'Synth Begeleider' } });
  check('definitief na akkoord → 200, review DEFINITIEF', def.status === 200 && (await api('GET', '/mna/im-review?code=' + T, { headers: B })).json.status === 'DEFINITIEF', def.status + ' ' + (def.json && def.json.error));
  // NDA-waarborg bij versturen (geen NDA getekend)
  const mail = await api('POST', '/mna/verkoopmemorandum/email', { headers: B, body: { code: T, verkoopmemorandum_tekst: rv.gedeelde_tekst, to: ['synth@example.invalid'] } });
  check('versturen zonder NDA en zonder bevestiging → 400 NDA_VEREIST', mail.status === 400 && mail.json.code === 'NDA_VEREIST', mail.status);
  console.log('  AI-verbruik: 1 IM-generatie (max_tokens 16000).');
} finally {
  const r = await ruimTrajectOp(V, ADMIN);
  check('testtraject opgeruimd', !!(r && r.ok), 'status ' + (r && r.status));
}
samenvatting();
