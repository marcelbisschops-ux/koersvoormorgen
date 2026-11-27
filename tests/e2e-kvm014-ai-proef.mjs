// KVM-014 stap 7: ÉÉN echte AI-aanroep op STAGING tegen een rijk gevuld synthetisch traject (werkregel 30/40).
// Doel: aantonen dat de echte AI brongebonden voorstellen geeft en dat de serverpoort (passage letterlijk in het document,
// bedrag in de passage, nooit een marktconform bedrag, informatieverzoek bij onvoldoende gegevens) in de echte keten werkt.
// Steekproef: 1 aanroep. Stopcriterium: na die ene aanroep stoppen, ongeacht de uitkomst. Kosten: één analyse.
// Alleen met KVM014_AI_PROEF=1 en uitsluitend tegen staging. Geen externe communicatie: traject zonder e-mailadressen,
// documenten als bewijsstuk (geen extractie-AI). Opruimen na afloop.
// Gebruik: KVM014_AI_PROEF=1 node tests/e2e-kvm014-ai-proef.mjs <map met SYNTH_-documenten>
import fs from 'fs';
import path from 'path';
import { api, check, kop, samenvatting, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER, d1 } from './lib.mjs';
if (!IS_STAGING_WORKER || process.env.KVM014_AI_PROEF !== '1') { console.log('Alleen tegen staging en met KVM014_AI_PROEF=1.'); process.exit(2); }
const MAP = process.argv[2];
const DOCS = ['SYNTH_Toelichting_jaarrekening_2024.docx', 'SYNTH_Loonjournaal_2024.csv'];
if (!MAP || !DOCS.every((d) => fs.existsSync(path.join(MAP, d)))) { console.log('Documentenmap ontbreekt.'); process.exit(2); }
const ADMIN = leesAdminKey();
const nl = (n) => n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kb = ['Rekening;Omschrijving;Debet;Credit', '0100;Inventaris;' + nl(20000) + ';', '0200;Aandelenkapitaal;;' + nl(18000), '0250;Privé-onttrekkingen;' + nl(99900) + ';',
  '0600;Lening bank;;' + nl(50000), '1000;Kas;' + nl(1500) + ';', '1100;Bank;' + nl(40000) + ';', '1300;Debiteuren;' + nl(60000) + ';', '1600;Crediteuren;;' + nl(15000),
  '1700;Omzetbelasting af te dragen;;' + nl(12000), '4000;Salarissen;' + nl(300000) + ';', '4100;Huur kantoorpand;' + nl(36000) + ';', '4200;Autokosten;' + nl(12000) + ';',
  '4300;Kantoorkosten;' + nl(18000) + ';', '4800;Afschrijving inventaris;' + nl(5000) + ';', '4900;Rentelasten;' + nl(2500) + ';', '8000;Omzet advieswerk;;' + nl(500000), '9999;Diversen;' + nl(100) + ';'].join('\n');

kop('KVM-014 AI-normalisatievoorstellen · één echte aanroep op staging');
const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'SYNTH_Voorbeeld Administratie B.V.', sector: 'accountancy', traject_type: 'Verkoop' } });
const V = c.json && c.json.code, T = c.json && c.json.tussen_code;
check('synthetisch traject aangemaakt (geen e-mailadressen)', !!(V && T), 'status ' + c.status);
const B = { 'x-tussen-key': T };
try {
  // N-120 (streng op staging): platformvoorwaarden en upload met de eigen verkopercode; worker/45-46 zoeken (nog) op traject-ID.
  const VK = (d1("SELECT verkoper_code FROM mna_traject_toegang WHERE traject_id='" + String(V).replace(/'/g, "''") + "'")[0] || {}).verkoper_code;
  check('verkopercode aanwezig', !!VK);
  await accepteerPlatformvoorwaarden([VK, T]);
  const up = await api('POST', '/mna/kolommenbalans/upload', { body: { code: V, jaar: 2024, bestand_naam: 'kolommenbalans-2024.csv', inhoud_base64: Buffer.from(kb).toString('base64') } });
  check('kolommenbalans 2024 ingelezen', up.status === 200, up.status);
  const j = (await api('GET', '/mna/kolommenbalans?code=' + T, { headers: B })).json.jaren.find((x) => x.jaar === 2024);
  const tw = await api('POST', '/mna/kolommenbalans/toewijzen', { headers: B, body: { code: T, jaar: 2024, rekening: '9999', categorie: 'overig_resultaat', rev: j.rev } });
  check('kolommenbalans 2024 gereed', tw.status === 200 && tw.json.jaren.find((x) => x.jaar === 2024).status === 'gereed', tw.status);
  for (const naam of DOCS) {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(path.join(MAP, naam))], { type: naam.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), naam);
    const r = await fetch(WORKER + '/mna/document/upload?code=' + encodeURIComponent(VK) + '&fase_id=financieel&alleen_bewijsstuk=true', { method: 'POST', body: fd });
    const jj = await r.json().catch(() => null);
    check('document ' + naam + ' opgeslagen als bewijsstuk (geen extractie-AI)', r.status === 200 && jj && jj.ok && jj.geanalyseerd === false, r.status + ' ' + JSON.stringify(jj).slice(0, 160));
  }
  const ov = await api('GET', '/mna/financieel?code=' + T, { headers: B });
  const ids = (ov.json.ai_documenten || []).map((d) => d.id);
  check('beide documenten beschikbaar voor de AI-analyse', ids.length === 2 && ov.json.ai_beschikbaar === true, JSON.stringify(ov.json.ai_documenten));
  const vk = await api('POST', '/mna/financieel/normalisatie/ai-voorstellen', { body: { code: V, document_ids: ids } });
  check('verkoper kan de analyse niet starten (403, geen kosten)', vk.status === 403, vk.status);
  const t0 = Date.now();
  const r = await api('POST', '/mna/financieel/normalisatie/ai-voorstellen', { headers: B, body: { code: T, document_ids: ids } });
  const duur = Math.round((Date.now() - t0) / 100) / 10;
  console.log('\nDuur: ' + duur + ' s · status ' + r.status);
  console.log('AI-telling: ' + JSON.stringify(r.json && r.json.ai, null, 1));
  const ai = (r.json && r.json.normalisaties || []).filter((x) => x.herkomst === 'ai');
  ai.forEach((x) => console.log('\n- [' + x.status + '] ' + x.jaar + ' · ' + x.post + ' · ' + x.soort + ' · bedrag ' + x.bedrag + (x.oorspronkelijk_bedrag != null ? ' (oorspronkelijk ' + x.oorspronkelijk_bedrag + ')' : '') + '\n  ' + x.omschrijving + '\n  bron: ' + x.bron + (x.berekeningswijze ? '\n  berekening: ' + x.berekeningswijze : '') + (x.ontbrekende_info ? '\n  informatieverzoek: ' + x.ontbrekende_info : '')));
  check('AI-analyse geslaagd', r.status === 200 && r.json.ok === true, r.status + ' ' + (r.tekst || '').slice(0, 200));
  if (r.status === 200) {
    check('minstens één voorstel of informatieverzoek', ai.length > 0);
    check('niets automatisch goedgekeurd', ai.every((x) => x.status === 'voorstel' || x.status === 'geparkeerd'));
    check('elk voorstel met document en passage', ai.every((x) => /^Document "SYNTH_/.test(x.bron) && /": "/.test(x.bron)));
    const markt = ['partnerbeloning', 'vervangingskosten', 'familieleden', 'huisvesting_marktconform', 'managementfee', 'verbonden_partijen', 'ontbrekende_kosten', 'vacature', 'personeelsuitval'];
    check('nooit een AI-bedrag bij marktconforme correcties', ai.filter((x) => markt.includes(x.soort)).every((x) => x.bedrag === 0 && x.status === 'geparkeerd'));
    check('geen bedrag voor de subsidie (bedrag staat niet in het document)', !ai.some((x) => x.soort === 'subsidie' && x.bedrag !== 0));
    check('genormaliseerde EBITDA ongewijzigd (alleen goedgekeurde tellen)', r.json.jaren[0].genormaliseerd.ebitda === r.json.jaren[0].gerapporteerd.ebitda);
    check('tokengebruik vastgelegd en zichtbaar', r.json.ai.tokens.input > 0 && r.json.meting.ai.analyses === 1, JSON.stringify(r.json.ai.tokens));
  }
} finally {
  const o = await ruimTrajectOp(V, ADMIN);
  check('synthetisch traject opgeruimd', o.ok, o.status);
  const rest = await api('GET', '/mna/financieel?code=' + T, { headers: B });
  check('na opruimen niet meer te vinden', rest.status === 404 || rest.status === 403, rest.status);
}
process.exit(samenvatting() ? 0 : 1);
