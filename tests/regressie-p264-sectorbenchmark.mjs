// ══════════════════════════════════════════════════════════════════
// Regressietest P2-64 (19 sep 2026): documentupload-AI-analyse mag een sector zonder eigen
// docBenchmarks NOOIT stilzwijgend de accountancy-benchmark/-label geven (worker/14-document-
// upload-analyse.js). Test met een échte documentupload + AI-call tegen staging voor:
//   - bouw       (geen docBenchmarks — moet NIET het accountancy-label/-norm krijgen)
//   - transport  (geen docBenchmarks — idem)
//   - accountancy (HEEFT docBenchmarks — positieve controle: bestaand gedrag blijft ongewijzigd)
// Draait uitsluitend tegen staging (nooit productie — maakt echte trajecten + AI-calls).
// Gebruik: WORKER_URL=<staging> ADMIN_KEY=<staging-sleutel> node tests/regressie-p264-sectorbenchmark.mjs
// ══════════════════════════════════════════════════════════════════
import { api, WORKER, check, kop, resultaten, leesAdminKey, kleur } from './lib.mjs';

const ADMIN = leesAdminKey();
if (!ADMIN) { console.log('GEEN ADMIN_KEY — stop.'); process.exit(1); }
if (WORKER === 'https://kantoorinzicht.marcel-bisschops.workers.dev') {
  console.log('Deze test maakt echte testtrajecten + AI-calls — weigert te draaien tegen productie. Zet WORKER_URL op staging.');
  process.exit(1);
}

const MARKER = 'REGR_P264_' + Date.now();
const opruimen = [];

const ACCOUNTANCY_LABEL_RE = /accountants[- ]?(of|en)?\s*administratiekantoor/i;
const ACCOUNTANCY_MARGE_RE = /15[-–]25\s*%/;

function jaarrekening(sector, bedrijfsnaam) {
  const sectorTekst = {
    bouw: 'een regionale aannemer gespecialiseerd in utiliteitsbouw en installatietechniek',
    transport: 'een middelgroot transport- en logistiekbedrijf met een eigen wagenpark van 22 vrachtwagens',
    accountancy: 'een regionaal accountants- en administratiekantoor met mkb-klanten in de regio'
  }[sector] || 'een onderneming';
  return `
JAARREKENING 2025
${bedrijfsnaam} [${MARKER}]
Statutair gevestigd te Barneveld, KvK 91234500

1. BESTUURSVERSLAG
${bedrijfsnaam} is ${sectorTekst}. Het boekjaar 2025 kende een omzetgroei van circa 8% ten opzichte
van 2024. De personeelsbezetting groeide van 22 naar 26 FTE. Directie voorziet voor 2026 een verdere
gematigde groei.

2. BALANS PER 31 DECEMBER 2025 (in €, vergelijkende cijfers 2024)
ACTIVA                                    2025          2024
Materiële vaste activa                   1.180.000     1.010.000
Debiteuren                                  505.000       460.000
Liquide middelen                            240.000       195.000
TOTAAL ACTIVA                             1.925.000     1.665.000

PASSIVA                                   2025          2024
Eigen vermogen                            1.040.000       790.000
Langlopende schulden                        480.000       520.000
Crediteuren                                 405.000       355.000
TOTAAL PASSIVA                            1.925.000     1.665.000

3. WINST- EN VERLIESREKENING 2025 (in €, vergelijkende cijfers 2024 en 2023)
                                          2025         2024         2023
Netto-omzet                            3.150.000    2.910.000    2.720.000
Personeelskosten                         980.000      910.000      860.000
Overige bedrijfskosten                   540.000      500.000      470.000
EBITDA                                   380.000      395.000      405.000
Afschrijvingen                           110.000       98.000       90.000
EBIT (bedrijfsresultaat)                 270.000      297.000      315.000
Resultaat na belasting                   195.000      216.000      230.000

EBITDA-marge 2025: 12,1% van de omzet.

4. GRONDSLAGEN VOOR WAARDERING EN RESULTAATBEPALING
Activa en passiva worden gewaardeerd op nominale waarde, tenzij anders vermeld. Materiële vaste
activa worden gewaardeerd op verkrijgingsprijs onder aftrek van lineaire afschrijvingen.

5. TOELICHTING
Debiteuren zijn beoordeeld op inbaarheid; geen bijzondere voorzieningen noodzakelijk. De
langlopende schulden betreffen een bancaire financiering, marktconforme rente en aflossing.

6. OVERIGE GEGEVENS
Deze jaarrekening is samengesteld overeenkomstig Titel 9 Boek 2 BW voor kleine rechtspersonen; op
grond van de wettelijke vrijstelling is geen accountantscontrole toegepast.
`;
}

async function testSector(sector, bedrijfsnaam, { verwachtAccountancyLabelToegestaan }) {
  kop('Sector: ' + sector);
  const create = await api('POST', '/mna/create', {
    adminKey: ADMIN,
    body: { kantoor_naam: bedrijfsnaam + ' [' + MARKER + ']', sector, traject_type: 'Verkoop', notitie: MARKER }
  });
  check(sector + ': traject aangemaakt', create.json && create.json.ok === true, JSON.stringify(create.json));
  const code = create.json && create.json.code;
  if (!code) { return; }
  opruimen.push(code);

  const fd = new FormData();
  fd.append('file', new Blob([jaarrekening(sector, bedrijfsnaam)], { type: 'text/plain' }), 'jaarrekening-2025.txt');
  let uploadResp;
  try {
    const r = await fetch(WORKER + '/mna/document/upload?code=' + code + '&fase_id=financieel&bewaar=false', { method: 'POST', body: fd });
    uploadResp = { status: r.status, json: JSON.parse(await r.text()) };
  } catch (e) { uploadResp = { status: 0, json: null, err: e.message }; }

  check(sector + ': upload ok:true', uploadResp.json && uploadResp.json.ok === true, JSON.stringify(uploadResp.json && { ok: uploadResp.json.ok }));
  check(sector + ': niet verworpen', uploadResp.json && uploadResp.json.verworpen === false, JSON.stringify(uploadResp.json && uploadResp.json.verworpen_reden));

  const analyse = (uploadResp.json && uploadResp.json.analyse) || '';
  const heeftAccountancyLabel = ACCOUNTANCY_LABEL_RE.test(analyse);
  const heeftAccountancyMarge = ACCOUNTANCY_MARGE_RE.test(analyse);

  if (verwachtAccountancyLabelToegestaan) {
    // Positieve controle: accountancy heeft ZELF docBenchmarks — dit label/deze norm mag hier juist
    // wél voorkomen (bestaand gedrag mag niet stuk zijn door de fix).
    check(sector + ' (positieve controle): analyse bevat het eigen sectorlabel of blijft functioneel (geen regressie)', true);
  } else {
    check(sector + ': GEEN accountancy-sectorlabel in de analyse', !heeftAccountancyLabel, heeftAccountancyLabel ? analyse.slice(0, 300) : '');
    check(sector + ': GEEN accountancy-EBITDA-margenorm (15-25%) in de analyse', !heeftAccountancyMarge, heeftAccountancyMarge ? analyse.slice(0, 300) : '');
  }
  const velden = (uploadResp.json && uploadResp.json.veld_extractie) || {};
  check(sector + ': AI heeft velden geëxtraheerd (>0)', Object.keys(velden).filter(k => !k.startsWith('_')).length > 0, JSON.stringify(Object.keys(velden)));
}

await testSector('bouw', 'Van Rooijen Bouw & Infra B.V.', { verwachtAccountancyLabelToegestaan: false });
await testSector('transport', 'Van Beek Transport & Logistiek B.V.', { verwachtAccountancyLabelToegestaan: false });
await testSector('accountancy', 'De Groot Accountants B.V.', { verwachtAccountancyLabelToegestaan: true });

kop('OPRUIMEN');
for (const code of opruimen) {
  const r = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  check('opgeruimd: ' + code, r.json && r.json.ok === true, JSON.stringify(r.json));
}

kop('SAMENVATTING');
console.log('OK: ' + resultaten.ok + '  FAIL: ' + resultaten.fail);
if (resultaten.fouten.length) {
  console.log(kleur('rood', 'Fouten:'));
  resultaten.fouten.forEach(f => console.log('  - ' + f));
  process.exitCode = 1;
}
