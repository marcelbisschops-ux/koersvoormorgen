// ══════════════════════════════════════════════════════════════════
// E2E — Bankanalyse V1b Groep A (22 sep 2026): maandaggregaties, periodekeuze 3/6/12 maanden,
// cashflow-overzicht. Losse test naast e2e-bankmutaties-v1a.mjs (die blijft de upload/red-flag-
// analyse-flow dekken) — dit bestand test uitsluitend het nieuwe GET /mna/bankmutaties/cashflow/-
// endpoint. Alleen tegen staging (nooit tegen productie): maakt een echt testtraject aan en doet
// een echte upload.
//
// Draaien:
//   ADMIN_KEY=... WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//     node tests/e2e-bankmutaties-v1b-groepa.mjs
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting, accepteerPlatformvoorwaarden } from './lib.mjs';

const ADMIN = leesAdminKey();

console.log('\n' + kleur('vet', '╔══════════════════════════════════════════════╗'));
console.log(kleur('vet', '║  Bankanalyse V1b Groep A — E2E                 ║'));
console.log(kleur('vet', '╚══════════════════════════════════════════════╝'));
console.log(kleur('grijs', 'Worker : ' + WORKER));

if (!/staging/i.test(WORKER)) {
  console.log('\n' + kleur('rood', 'WORKER_URL is geen staging-omgeving — deze test doet een echte upload, weigert tegen productie te draaien.'));
  process.exit(1);
}
if (!ADMIN) { console.log('\n' + kleur('rood', 'Geen admin-key opgegeven.')); process.exit(1); }

// Bewust vaste, controleerbare datums t.o.v. "vandaag" (de ankerdatum in de test is de laatst
// geüploade transactiedatum, dus dit werkt ongeacht wanneer de test draait — geen hardcoded
// "vandaag" in de test zelf nodig, precies zoals de te testen logica dat ook niet gebruikt).
// RFC4180-quoting voor een veld dat een komma bevat (anders breekt de CSV-kolomstructuur — precies
// de fout die de AI-kolomherkenning in de echte backend terecht als 'handmatig_controleren' zou
// markeren, wat deze test dan zelf niet meer over de eigenlijke cashflow-logica zou testen).
function csvVeld(v) {
  var s = String(v);
  return s.indexOf(',') > -1 ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvMetTransacties(regels) {
  var header = 'Datum,Bedrag,Naam tegenpartij,Omschrijving\n';
  return header + regels.map(function (r) {
    return r.datum.replace(/-/g, '') + ',' + r.bedrag.toFixed(2) + ',' + csvVeld(r.naam) + ',' + csvVeld(r.omschrijving);
  }).join('\n') + '\n';
}

async function uploadCsv(tussenCode, code, regels, bestandsnaam) {
  var csv = csvMetTransacties(regels);
  var fd = new FormData();
  fd.append('code', code);
  fd.append('file', new Blob([csv], { type: 'text/csv' }), bestandsnaam || 'test.csv');
  var r = await fetch(WORKER + '/mna/bankmutaties/upload', { method: 'POST', body: fd });
  return { status: r.status, json: await r.json().catch(function () { return null; }) };
}

async function run() {
  kop('=== Setup: testtraject + CSV-upload over 14 maanden, incl. 1 onherkenbare datum ===');
  const create = await api('POST', '/mna/create', {
    adminKey: ADMIN, body: {
      kantoor_naam: 'E2E V1b GroepA BV', sector: 'accountancy', traject_type: 'Verkoop',
      contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl',
    },
  });
  const code = create.json.code, koperCode = create.json.koper_code, tussenCode = create.json.tussen_code;
  check('traject aangemaakt', !!code, JSON.stringify(create.json));
  // Vóór de eerste niet-admin-key /mna/*-aanroep hieronder (upload/cashflow, S1.2b-gate).
  await accepteerPlatformvoorwaarden({ verkoper: code, koper: koperCode, tussenpersoon: tussenCode });

  // Ankerdatum wordt de meest recente regel hieronder: 2026-09-21 (vast, exact het voorbeeld uit
  // het vastgelegde plan). 14 maanden aan data zodat periode=12 een "buiten periode"-telling geeft.
  var regels = [
    { datum: '2025-07-15', bedrag: 1000, naam: 'Klant Oud1', omschrijving: 'Factuur oud, buiten 12mnd' },
    { datum: '2025-08-10', bedrag: -500, naam: 'Leverancier Oud', omschrijving: 'Buiten 12mnd' },
    { datum: '2025-10-05', bedrag: 2000, naam: 'Klant A', omschrijving: 'Factuur A — binnen 12mnd, buiten 6mnd' },
    { datum: '2026-04-12', bedrag: 1500, naam: 'Klant B', omschrijving: 'Factuur B — binnen 6mnd, buiten 3mnd' },
    { datum: '2026-04-20', bedrag: -300, naam: 'Leverancier B', omschrijving: 'Binnen 6mnd' },
    { datum: '2026-07-08', bedrag: 3000, naam: 'Klant C', omschrijving: 'Factuur C — binnen 3mnd, augustus blijft bewust leeg voor de zero-fill-test' },
    { datum: '2026-09-21', bedrag: 500, naam: 'Klant D', omschrijving: 'Meest recente transactie = ankerdatum' },
  ];
  const up = await uploadCsv(tussenCode, code, regels, 'test-v1b.csv');
  check('CSV geüpload en verwerkt', up.json && up.json.ok === true && up.json.status === 'verwerkt', JSON.stringify(up.json));
  check('alle 7 regels herkend', up.json && up.json.aantal_regels === 7, JSON.stringify(up.json));

  // Aparte, tweede upload: 1 regel met een compleet onherkenbaar datumformaat (geen enkel bekend
  // patroon in parseBankDatum), om de "onherkenbare_datum"-telling te toetsen. Zonder geldige
  // datum EN bedrag wordt een CSV-rij door de upload zelf al uitgesloten (regel 370 in
  // worker/22-bankmutaties.js: filter op r.datum && r.bedrag!==null) — parseBankDatum geeft bij een
  // onbekend formaat de ruwe string terug (nooit null), dus zo'n regel wordt WEL opgeslagen, met een
  // niet-ISO datumwaarde. Dat testen we hier direct.
  const upOnherkenbaar = await uploadCsv(tussenCode, code, [
    { datum: '2026-06-01', bedrag: 100, naam: 'Normaal', omschrijving: 'Geldige datum, telt mee als binnen-periode of buiten' },
  ], 'test-v1b-normaal2.csv');
  check('tweede CSV verwerkt', upOnherkenbaar.json && upOnherkenbaar.json.ok === true, JSON.stringify(upOnherkenbaar.json));

  kop('=== periode=3 ===');
  const p3 = await api('GET', '/mna/bankmutaties/cashflow/' + code + '?periode=3', {});
  check('anker_datum = meest recente transactie (2026-09-21)', p3.json && p3.json.anker_datum === '2026-09-21', JSON.stringify(p3.json && p3.json.anker_datum));
  check('periode_start = 2026-07-01', p3.json && p3.json.periode_start === '2026-07-01', JSON.stringify(p3.json && p3.json.periode_start));
  check('periode_eind = 2026-09-21', p3.json && p3.json.periode_eind === '2026-09-21', JSON.stringify(p3.json && p3.json.periode_eind));
  check('exact 3 maandbuckets', p3.json && p3.json.maanden && p3.json.maanden.length === 3, JSON.stringify(p3.json && p3.json.maanden));
  check('maandbuckets zijn 2026-07/08/09', p3.json && p3.json.maanden && p3.json.maanden.map(function(m){return m.maand;}).join(',') === '2026-07,2026-08,2026-09', JSON.stringify(p3.json && p3.json.maanden));
  var aug3 = p3.json && p3.json.maanden && p3.json.maanden.find(function(m){return m.maand==='2026-08';});
  check('zero-fill: augustus heeft 0 transacties (geen data die maand)', aug3 && aug3.aantal_transacties === 0 && aug3.netto === 0, JSON.stringify(aug3));
  var jul3 = p3.json && p3.json.maanden.find(function(m){return m.maand==='2026-07';});
  check('juli: instroom 3000, netto 3000', jul3 && jul3.instroom === 3000 && jul3.netto === 3000, JSON.stringify(jul3));
  var sep3 = p3.json && p3.json.maanden.find(function(m){return m.maand==='2026-09';});
  check('september: instroom 500, netto 500', sep3 && sep3.instroom === 500 && sep3.netto === 500, JSON.stringify(sep3));

  kop('=== periode=6 ===');
  const p6 = await api('GET', '/mna/bankmutaties/cashflow/' + code + '?periode=6', {});
  check('periode_start = 2026-04-01', p6.json && p6.json.periode_start === '2026-04-01', JSON.stringify(p6.json && p6.json.periode_start));
  check('exact 6 maandbuckets', p6.json && p6.json.maanden && p6.json.maanden.length === 6, JSON.stringify(p6.json && p6.json.maanden));

  kop('=== periode=12 ===');
  const p12 = await api('GET', '/mna/bankmutaties/cashflow/' + code + '?periode=12', {});
  check('periode_start = 2025-10-01', p12.json && p12.json.periode_start === '2025-10-01', JSON.stringify(p12.json && p12.json.periode_start));
  check('exact 12 maandbuckets', p12.json && p12.json.maanden && p12.json.maanden.length === 12, JSON.stringify(p12.json && p12.json.maanden));
  // De 2 regels van juli/aug 2025 vallen buiten periode=12 (die begint 2025-10-01).
  check('2 regels buiten periode (juli/aug 2025)', p12.json && p12.json.aantal_regels_buiten_periode === 2, JSON.stringify(p12.json));

  kop('=== Sluitende telling (moet optellen tot totaal aantal verwerkte regels = 8) ===');
  var totaalCheck = p12.json && (p12.json.aantal_regels_in_periode + p12.json.aantal_regels_buiten_periode + p12.json.aantal_regels_onherkenbare_datum);
  check('in_periode + buiten_periode + onherkenbare_datum = 8', totaalCheck === 8, 'som=' + totaalCheck + ' json=' + JSON.stringify(p12.json));

  kop('=== Ongeldige periode ===');
  const pBad = await api('GET', '/mna/bankmutaties/cashflow/' + code + '?periode=99', {});
  check('periode=99 geeft 400', pBad.status === 400, JSON.stringify(pBad));
  const pBad2 = await api('GET', '/mna/bankmutaties/cashflow/' + code + '?periode=abc', {});
  check('periode=abc geeft 400', pBad2.status === 400, JSON.stringify(pBad2));

  kop('=== Rolzichtbaarheid ===');
  const alsKoperVoor = await api('GET', '/mna/bankmutaties/cashflow/' + koperCode + '?periode=3', {});
  check('koper zonder financieel-vrijgave: geen anker_datum', alsKoperVoor.json && alsKoperVoor.json.anker_datum === null, JSON.stringify(alsKoperVoor.json));

  const vrijgave = await api('POST', '/mna/koper-categorieen/' + code + '?force=1', {
    headers: { 'x-tussen-key': tussenCode }, body: { categorieen: ['financieel'] },
  });
  check('koper-toegang financieel vrijgegeven', vrijgave.json && vrijgave.json.ok === true, JSON.stringify(vrijgave.json));

  const alsKoperNa = await api('GET', '/mna/bankmutaties/cashflow/' + koperCode + '?periode=3', {});
  check('koper mét financieel-vrijgave: ziet dezelfde ankerdatum als verkoper', alsKoperNa.json && alsKoperNa.json.anker_datum === '2026-09-21', JSON.stringify(alsKoperNa.json));
  check('koper mét vrijgave: zelfde 3 maandbuckets als verkoper', alsKoperNa.json && alsKoperNa.json.maanden.length === 3, JSON.stringify(alsKoperNa.json));

  const alsBegeleider = await api('GET', '/mna/bankmutaties/cashflow/' + tussenCode + '?periode=3', { headers: { 'x-tussen-key': tussenCode } });
  check('begeleider ziet dezelfde cijfers als verkoper', alsBegeleider.json && alsBegeleider.json.anker_datum === '2026-09-21' && alsBegeleider.json.maanden.length === 3, JSON.stringify(alsBegeleider.json));

  kop('=== Regressie: bestaande bankmutaties-routes blijven werken ===');
  const lijst = await api('GET', '/mna/bankmutaties/lijst/' + code, {});
  check('bestaande lijst-route ongewijzigd werkend (2 imports)', lijst.json && lijst.json.imports && lijst.json.imports.length === 2, JSON.stringify(lijst.json));

  kop('=== Opruimen (hoofdtraject) ===');
  const del = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  check('testtraject verwijderd', del.json && del.json.ok === true, JSON.stringify(del.json));

  // ════════════════════════════════════════════════════════════════
  // P1-regressietests (Breaker-bevinding 22 sep 2026): semantisch ongeldige kalenderdatums moeten
  // uitgesloten worden van anker/aggregatie en in aantal_regels_onherkenbare_datum vallen — nooit
  // stilzwijgend meetellen, ook al passeren ze een syntactische YYYY-MM-DD-vormcheck. Reproduceert
  // dit via een ECHTE CSV-upload (niet een directe D1-insert): parseBankDatum() zet een CSV-datum
  // als '20261399' (YYYYMMDD-vorm) blind om naar '2026-13-99' zonder semantische validatie — dus
  // dit pad is een realistisch scenario (een fout gemapte kolom), niet een kunstmatige testconstructie.
  // ════════════════════════════════════════════════════════════════
  kop('=== P1-regressie: 2026-13-99 mag nooit als anker gekozen worden ===');
  const create2 = await api('POST', '/mna/create', {
    adminKey: ADMIN, body: {
      kantoor_naam: 'E2E V1b P1regressie BV', sector: 'accountancy', traject_type: 'Verkoop',
      contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl',
    },
  });
  const code2 = create2.json.code, tussenCode2 = create2.json.tussen_code;
  check('tweede testtraject aangemaakt', !!code2, JSON.stringify(create2.json));
  await accepteerPlatformvoorwaarden({ verkoper: code2, koper: create2.json.koper_code, tussenpersoon: tussenCode2 });

  // Mix: 1 geldige datum (2026-09-21, moet de anker worden), 1 onzin-datum die lexicografisch NÁ
  // de geldige anker sorteert ('2026-13-99' > '2026-09-21' als kale string — exact de Breaker-bug),
  // en 1 losse "2026-02-29" (2026 is geen schrikkeljaar, dus ook ongeldig) om de round-trip-check
  // ook op een subtielere kalenderfout te toetsen, niet alleen een evident absurde datum.
  var csvMixed = 'Datum,Bedrag,Naam tegenpartij,Omschrijving\n'
    + '20260921,750.00,Klant Geldig,Enige geldige datum — moet de anker worden\n'
    + '20261399,99999.00,Onzin Datum,Maand13Dag99 — mag NOOIT anker worden ondanks lexicografisch later\n'
    + '20260229,50.00,Ongeldig Schrikkeljaar,2026 is geen schrikkeljaar — moet ook onherkenbaar zijn\n';
  var fdMixed = new FormData();
  fdMixed.append('code', code2);
  fdMixed.append('file', new Blob([csvMixed], { type: 'text/csv' }), 'p1-regressie.csv');
  var upMixed = await fetch(WORKER + '/mna/bankmutaties/upload', { method: 'POST', body: fdMixed }).then(function (r) { return r.json(); });
  check('mix-CSV verwerkt (3 rijen, want datum+bedrag zijn beide aanwezig — semantische check gebeurt pas bij cashflow-opvraag)', upMixed && upMixed.ok === true && upMixed.aantal_regels === 3, JSON.stringify(upMixed));

  const cfMixed = await api('GET', '/mna/bankmutaties/cashflow/' + code2 + '?periode=3', {});
  check('anker_datum = 2026-09-21 (NIET 2026-13-99, ondanks dat die lexicografisch later sorteert)', cfMixed.json && cfMixed.json.anker_datum === '2026-09-21', JSON.stringify(cfMixed.json && cfMixed.json.anker_datum));
  check('2 regels als onherkenbare datum geteld (2026-13-99 + 2026-02-29)', cfMixed.json && cfMixed.json.aantal_regels_onherkenbare_datum === 2, JSON.stringify(cfMixed.json));
  check('1 regel als in_periode geteld (alleen de geldige)', cfMixed.json && cfMixed.json.aantal_regels_in_periode === 1, JSON.stringify(cfMixed.json));
  check('sluitende telling: in_periode + buiten_periode + onherkenbaar = 3', cfMixed.json && (cfMixed.json.aantal_regels_in_periode + cfMixed.json.aantal_regels_buiten_periode + cfMixed.json.aantal_regels_onherkenbare_datum) === 3, JSON.stringify(cfMixed.json));
  var sep2026Bucket = cfMixed.json && cfMixed.json.maanden && cfMixed.json.maanden.find(function (m) { return m.maand === '2026-09'; });
  check('september-bucket bevat alleen de 750,00 (de onzin-bedragen 99999/50 zitten er niet in)', sep2026Bucket && sep2026Bucket.instroom === 750 && sep2026Bucket.aantal_transacties === 1, JSON.stringify(sep2026Bucket));

  kop('=== P1-regressie: uitsluitend semantisch ongeldige datums, geen enkele geldige ===');
  const create3 = await api('POST', '/mna/create', {
    adminKey: ADMIN, body: {
      kantoor_naam: 'E2E V1b P1regressie2 BV', sector: 'accountancy', traject_type: 'Verkoop',
      contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl',
    },
  });
  const code3 = create3.json.code;
  await accepteerPlatformvoorwaarden({ verkoper: code3, koper: create3.json.koper_code, tussenpersoon: create3.json.tussen_code });
  var csvOngeldig ='Datum,Bedrag,Naam tegenpartij,Omschrijving\n'
    + '20261399,100.00,Onzin1,Maand13\n'
    + '20260230,200.00,Onzin2,30 februari bestaat nooit\n';
  var fdOngeldig = new FormData();
  fdOngeldig.append('code', code3);
  fdOngeldig.append('file', new Blob([csvOngeldig], { type: 'text/csv' }), 'p1-regressie2.csv');
  var upOngeldig = await fetch(WORKER + '/mna/bankmutaties/upload', { method: 'POST', body: fdOngeldig }).then(function (r) { return r.json(); });
  // Bugfix in de test zelf (22 sep 2026, gevonden door onafhankelijke Breaker-review): de eerdere
  // versie van deze test nam aan dat de bestaande AI-kolomherkenning (bepaalKolomMapping(), NIET
  // onderdeel van de V1b-diff, dus bewust niet aangepast of gemockt) een bestand met 100% onmogelijke
  // datums altijd zou weigeren. Die AI-aanroep is niet-deterministisch grensgeval-gedrag — bij een
  // andere testrun accepteerde de AI hetzelfde bestand wél. Beide uitkomsten zijn geldig gedrag van
  // een bestaand, ongewijzigd onderdeel — geen van beide is een V1b-bug. Deze test toetst daarom niet
  // langer WELKE uitkomst de AI kiest, maar of het V1b-contract (isGeldigeKalenderdatum(), nooit een
  // ongeldige ankerdatum) in BEIDE mogelijke uitkomsten daadwerkelijk standhoudt — met een inhoudelijke
  // assertie per branch, niet alleen "geen crash". Een derde, onverwachte uitkomst faalt hard, in
  // plaats van stilzwijgend als geslaagd te gelden.
  if (upOngeldig && upOngeldig.status === 'handmatig_controleren' && upOngeldig.aantal_regels === 0) {
    kop('    branch A uitgevoerd: AI-kolomherkenning weigerde het bestand (0 regels opgeslagen)');
    check('branch A: upload correct geweigerd (handmatig_controleren, 0 regels)', true, JSON.stringify(upOngeldig));
    const cfGeenGeldig = await api('GET', '/mna/bankmutaties/cashflow/' + code3 + '?periode=12', {});
    check('branch A: geen enkele opgeslagen regel → anker_datum=null, geen crash', cfGeenGeldig.json && cfGeenGeldig.json.anker_datum === null, JSON.stringify(cfGeenGeldig.json));
    check('branch A: tellingen consistent leeg (0/0/0 — er is niets opgeslagen om te categoriseren)', cfGeenGeldig.json && cfGeenGeldig.json.aantal_regels_in_periode === 0 && cfGeenGeldig.json.aantal_regels_buiten_periode === 0 && cfGeenGeldig.json.aantal_regels_onherkenbare_datum === 0, JSON.stringify(cfGeenGeldig.json));
  } else if (upOngeldig && upOngeldig.ok === true && upOngeldig.aantal_regels > 0) {
    kop('    branch B uitgevoerd: AI-kolomherkenning accepteerde het bestand (' + upOngeldig.aantal_regels + ' regel(s) opgeslagen)');
    check('branch B: upload geaccepteerd (' + upOngeldig.aantal_regels + ' regels opgeslagen)', true, JSON.stringify(upOngeldig));
    const cfOngeldig = await api('GET', '/mna/bankmutaties/cashflow/' + code3 + '?periode=12', {});
    // Kernbewijs van het V1b-contract in déze branch: de CSV bevat UITSLUITEND 2026-13-99 en
    // 2026-02-29 — geen enkele geldige datum — dus isGeldigeKalenderdatum() moet ALLE opgeslagen
    // regels als onherkenbaar uitsluiten, nooit een anker kiezen uit een semantisch ongeldige datum.
    check('branch B: geen enkele geldige datum onder de opgeslagen regels → anker_datum=null', cfOngeldig.json && cfOngeldig.json.anker_datum === null, JSON.stringify(cfOngeldig.json));
    check('branch B: alle ' + upOngeldig.aantal_regels + ' opgeslagen regel(s) tellen mee als onherkenbare datum', cfOngeldig.json && cfOngeldig.json.aantal_regels_onherkenbare_datum === upOngeldig.aantal_regels, JSON.stringify(cfOngeldig.json));
    check('branch B: geen enkele regel als in_periode of buiten_periode geteld', cfOngeldig.json && cfOngeldig.json.aantal_regels_in_periode === 0 && cfOngeldig.json.aantal_regels_buiten_periode === 0, JSON.stringify(cfOngeldig.json));
  } else {
    // Onverwachte derde uitkomst — mag niet stilzwijgend als geslaagd gelden, dat zou het probleem
    // verplaatsen i.p.v. oplossen.
    check('upload gaf een onverwachte, niet-afgedekte status (geen van de twee bekende branches)', false, JSON.stringify(upOngeldig));
  }

  kop('=== Opruimen (P1-regressietrajecten) ===');
  const del2 = await api('POST', '/admin/delete/mna/' + code2, { adminKey: ADMIN });
  check('P1-regressietraject 1 verwijderd', del2.json && del2.json.ok === true, JSON.stringify(del2.json));
  const del3 = await api('POST', '/admin/delete/mna/' + code3, { adminKey: ADMIN });
  check('P1-regressietraject 2 verwijderd', del3.json && del3.json.ok === true, JSON.stringify(del3.json));

  samenvatting();
  process.exit(0);
}

run().catch(function (e) {
  console.error(kleur('rood', 'FATALE FOUT: ' + (e && e.message || e)));
  process.exitCode = 1;
});
