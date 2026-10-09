#!/usr/bin/env node
// Financiële broncontrole UI (productpunt 3, 9 okt 2026).
//
// Draait de ECHTE module mna/09-financiele-broncontrole.js plus de echte fetchMetTimeout (mna/01),
// esc/isVerkoper/isKoper/isTussen (mna/02) en parseGeld (mna/03) in node:vm. fetch is een stub met
// synthetische antwoorden in de vorm van de gecommitte backend (worker/11 regels 732-802 en
// worker/40 leesFinancieleBroncontrole/voerFinancieleBroncorrectieUit). renderApp tekent het paneel
// via de echte renderFinancieleBroncontrole. Geen netwerk, geen browser, geen live API, geen AI —
// dit is technisch bewijs; docs-, staging- en productiebewijs staan apart OPEN (docs/financial-source-ui.md).
//
// Gebruik: node tests/financial-source-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 27).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const LEES_PAD = WORKER + '/mna/financieel/broncontrole/';
const POST_URL = WORKER + '/mna/financieel/broncontrole/correctie';

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function regel(src, re, naam) { const m = src.match(re); if (!m) throw new Error('niet gevonden in bron: ' + naam); return m[0]; }
function knip(src, begin, eind) {
  const a = src.indexOf(begin); const b = a < 0 ? -1 : src.indexOf(eind, a);
  if (a < 0 || b < 0) throw new Error('niet gevonden in bron: ' + begin);
  return src.slice(a, b + eind.length);
}
const wacht = (ms = 0) => new Promise((r) => setTimeout(r, ms));
function uitgesteld() { let los; const p = new Promise((r) => { los = r; }); return { p, los }; }

// ── Synthetische DTO's (vorm worker/40) ────────────────────────────────────────────────────────
function bron(extra) {
  return {
    bron_document_id: 'DOC_1', bestandsnaam: 'jaarrekening-2024.csv', inhoud_hash: 'a'.repeat(64), document_status: 'BRUIKBAAR',
    entiteit_koppeling_document: null, bron_sleutel: 'ebitda_abs', herkomst: 'BRONFEIT',
    waarde_origineel: { status: 'BEKEND', tekst: 'EUR 1.234.600' }, waarde_genormaliseerd: '1234600', waarde: 1234600,
    interpretatie: { status: 'ZEKER', redenen: [] }, precisie: null, valuta: 'EUR', eenheid: 'EENHEID', teken: null,
    periode: { begin: '2024-01-01', eind: '2024-12-31', soort: 'ACTUAL' },
    scope: { type: 'ENKELVOUDIG', entiteit_id: 'ENT_A', consolidatiekring: null },
    locatie: { pagina: null, werkblad: null, cel: null, regel: 18 }, methode: 'text_extract', methode_type: 'DETERMINISTISCH',
    extractiedatum: 1760000000000, uploaded_at: 1760000000000, betrouwbaarheid: { status: 'SERVER_DETERMINISTISCH', ai_zelfgerapporteerd: null },
    ai_bronfragment: null, ai_interpretatie: null, redenen: [], ontbrekend: [], ...extra,
  };
}
function dto({ rol = 'verkoper', correctie_toegestaan = rol === 'verkoper', entiteit_id = null, ebitda = '300000', docs, ontbrekend = [], grootheden } = {}) {
  const b1 = bron();
  const b2 = bron({
    bron_document_id: 'DOC_2', bestandsnaam: '<img src=x onerror=alert(1)>.pdf', herkomst: 'AI-INTERPRETATIE', bron_sleutel: 'ebitda_abs',
    waarde_origineel: { status: 'ONBEKEND', tekst: null }, waarde_genormaliseerd: '1300000', waarde: 1300000,
    interpretatie: { status: 'ONZEKER', redenen: ['origineel_onbekend', 'eenheid_onbekend'] }, valuta: null, eenheid: null,
    periode: { begin: null, eind: '2025-12-31', soort: 'FORECAST' },
    scope: { type: 'GECONSOLIDEERD', entiteit_id: null, consolidatiekring: ['ENT_A', 'ENT_B'] },
    locatie: null, methode: 'pdf_direct', methode_type: 'AI', extractiedatum: null,
    ai_interpretatie: { status: 'AI-INTERPRETATIE', geverifieerd: false, onafhankelijke_bron: false, extractie_pass: 1, waarde_ruw: '"><script>alert(2)</script>',
      voorstel: { status: 'ONBEVESTIGD_VOORSTEL', bevestigd: false, bronfragment: 'EBITDA 1,3 mln <b>x</b>', locatie: { pagina: 4, werkblad: null, cel: null, regel: null }, periode: null, scope_type: null } },
    ontbrekend: ['origineel', 'valuta', 'eenheid', 'periode_begin', 'locatie'],
  });
  const b3 = bron({
    bron_document_id: null, bestandsnaam: 'oud.csv', herkomst: 'ONZEKER', waarde_origineel: { status: 'ONBEKEND', tekst: null },
    waarde_genormaliseerd: '1234600', interpretatie: { status: 'ONZEKER', redenen: ['origineel_onbekend'] },
    periode: { begin: null, eind: null, soort: null }, scope: null, locatie: null, redenen: ['legacy_verwerkingsstatus_onbekend'],
    ontbrekend: ['origineel', 'periode_begin', 'periode_eind', 'actual_forecast', 'scope', 'locatie', 'bron_document_id'],
  });
  const verg = (status, extra) => ({ status, a: { bestandsnaam: b1.bestandsnaam }, b: { bestandsnaam: b2.bestandsnaam }, absoluut_verschil: 65400, relatief_verschil: 0.052972,
    afrondingstolerantie: 0, tolerantie_bron: 'GEEN (exacte vergelijking)', materieel_verschil: true, redenen: [], hypothesen: [], gebruikersactie: 'x', ...extra });
  return {
    ok: true, rol, correctie_toegestaan, versie: 1, fase_id: 'financieel',
    scope: entiteit_id
      ? { entiteit_id, entiteit_naam: 'Entiteit ' + entiteit_id, type: 'ENTITEIT_RIJ', opmerking: 'x' }
      : { entiteit_id: null, entiteit_naam: null, type: 'TRAJECT_RIJ', opmerking: 'Trajectniveau-rij (geen entiteit). Dit betekent niet automatisch geconsolideerd.' },
    documenten: docs || [
      { bron_document_id: 'DOC_1', bron_document_id_afgeschermd: false, bestandsnaam: 'jaarrekening-2024.csv', inhoud_hash: 'a'.repeat(64), methode: 'text_extract', methode_type: 'DETERMINISTISCH', verwerking_status: 'PROCESSED', document_status: 'BRUIKBAAR', levert_bronwaarden: true, entiteit_koppeling: entiteit_id },
      { bron_document_id: null, bron_document_id_afgeschermd: true, bestandsnaam: 'oud" onmouseover="alert(3).pdf', methode: null, methode_type: 'ONBEKEND', verwerking_status: 'ONBEKEND_LEGACY', document_status: 'BRUIKBAAR_LEGACY', levert_bronwaarden: true, entiteit_koppeling: entiteit_id },
      { bron_document_id: 'DOC_V', bron_document_id_afgeschermd: false, bestandsnaam: 'vervangen.csv', methode: 'text_extract', methode_type: 'DETERMINISTISCH', verwerking_status: 'PROCESSED', document_status: 'VERVANGEN', levert_bronwaarden: false, entiteit_koppeling: entiteit_id },
    ],
    grootheden: grootheden || [
      { grootheid: 'ebitda', label: 'EBITDA (gerapporteerd)', soort: 'periode',
        huidige_waarden: [{ veld_id: 'ebitda', waarde: ebitda, herkomst: 'LEGACY_SCALAR', zekerheid: 'ONBEKEND', automatisch_afgeleid: false,
          laatste_broncorrectie: { tijdstip: 1760000000000, rol: 'verkoper', waarde: '290000', reden: 'Eerdere "reden" <i>met</i> tekens', bron_document_id: 'DOC_1', bestandsnaam: 'jaarrekening-2024.csv', inhoud_hash: 'a', nog_actueel: false } }],
        bronnen: [b1, b2, b3],
        crosscheck: { status: 'AFWIJKING', aantal_bronnen_met_waarde: 3, gebruikersactie: 'Controleer beide brondocumenten op dezelfde basis.',
          vergelijkingen: [verg('NIET_VERGELIJKBAAR', { redenen: ['andere_basis:actual_forecast'] }),
            verg('AFWIJKING', { hypothesen: [{ type: 'HYPOTHESE', bewezen: false, tekst: 'Mogelijk schaalverschil (factor 1.000, duizendtallen).' }] }),
            verg('ONZEKER', { relatief_verschil: null })] } },
      { grootheid: 'debiteuren', label: 'Debiteuren', soort: 'moment',
        huidige_waarden: [{ veld_id: 'debiteuren', waarde: '50000', herkomst: 'LEGACY_SCALAR', zekerheid: 'ONBEKEND', automatisch_afgeleid: true, laatste_broncorrectie: null }],
        bronnen: [], crosscheck: { status: 'ONVOLDOENDE_BRONNEN', aantal_bronnen_met_waarde: 0, vergelijkingen: [], gebruikersactie: 'Lever een tweede bron aan.' } },
    ],
    ontbrekend,
  };
}
const succes = (extra = {}) => ({ status: 200, body: { ok: true, veld_id: 'ebitda', entiteit_id: null, oude_waarde: '300000', nieuwe_waarde: '1234600.5', tijdstip: 1760000000000, audit_id: 'WZ1760000000000ABC', bron_document_id: 'DOC_1', inhoud_hash: 'a'.repeat(64), basis_status: 'ONBEKEND', opgeslagen_waarde: String(extra.nieuwe_waarde === undefined ? '1234600.5' : extra.nieuwe_waarde).replace('.', ','), ...extra } });

// ── Omgeving ────────────────────────────────────────────────────────────────────────────────────
function laad(root, { rol = 'verkoper', code = 'VSYN0001', entiteit = null, status = 'actief' } = {}) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src03 = lees(root, 'mna/03-rekenkern-waardering.js');
  const src09 = lees(root, 'mna/09-financiele-broncontrole.js');
  const delen = [
    regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src02, /^function esc\(s\)\{.*\}$/m, 'esc'),
    regel(src02, /^function isVerkoper\(\)\{.*\}$/m, 'isVerkoper'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
    knip(src03, 'function parseGeld(s){', '\n}\n'),
  ];
  const els = {};
  const log = { requests: [], html: '', renders: 0, saveCurrent: 0 };
  const opzet = { lees: [], correctie: [] };
  const groep = { financieel_ebitda: '300000', financieel_debiteuren: '50000' };
  const S = { screen: 'main', code, rol, traject: { status }, fase: 0, data: groep, _groepData: groep, dataPerEntiteit: {}, _actieveEntiteit: entiteit,
    _entiteiten: [{ id: 'ENT_A', naam: 'Alfa <b>BV</b>' }, { id: 'ENT_B', naam: 'Beta BV' }] };
  if (entiteit) { S.dataPerEntiteit[entiteit] = { financieel_ebitda: '300000' }; S.data = S.dataPerEntiteit[entiteit]; }
  const FASES = [{ id: 'financieel', dataFields: [
    { id: 'omzet1', label: 'Omzet jaar 1' }, { id: 'ebitda', label: 'EBITDA' }, { id: 'debiteuren', label: 'Debiteuren' } ] }];

  const maakResp = (a) => ({ ok: a.status >= 200 && a.status < 300, status: a.status,
    json: () => a.ongeldigeJson ? Promise.reject(new SyntaxError('Unexpected token <')) : Promise.resolve(JSON.parse(JSON.stringify(a.body === undefined ? null : a.body))) });
  function beantwoord(a) {
    if (a.netwerk) return Promise.reject(new TypeError('Failed to fetch'));
    if (a.uitgesteld) return a.uitgesteld.p.then(beantwoord);
    return Promise.resolve(maakResp(a));
  }
  const fetch = (url, opts = {}) => {
    const u = String(url);
    log.requests.push({ url: u, method: opts.method || 'GET', body: opts.body, headers: opts.headers });
    if (u === POST_URL && opts.method === 'POST') { const a = opzet.correctie.shift(); return a ? beantwoord(a) : Promise.reject(new Error('test: onverwachte POST')); }
    if (u.indexOf(LEES_PAD) === 0 && (opts.method || 'GET') === 'GET') { const a = opzet.lees.shift(); return a ? beantwoord(a) : Promise.reject(new Error('test: onverwachte GET')); }
    return Promise.reject(new Error('test: onverwachte URL ' + u));
  };
  const ctx = {
    console, setTimeout, clearTimeout, AbortController, fetch, WORKER, S, FASES,
    ge: (id) => els[id] || null,
    // Zoals renderMain: het hele scherm (ook de invoervelden df_*) wordt opnieuw uit S.data getekend.
    renderApp: () => {
      log.renders++;
      for (const k of Object.keys(els)) if (k.startsWith('df_')) { const v = S.data['financieel_' + k.slice(3)]; els[k].value = v == null ? '' : String(v); }
      log.html = ctx.renderFinancieleBroncontrole('financieel');
    },
    saveCurrent: () => { log.saveCurrent++; }, toast: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(delen.join('\n') + '\n' + src09, ctx, { filename: 'mna/09-financiele-broncontrole.js' });
  const render = () => { log.html = ctx.renderFinancieleBroncontrole('financieel'); return log.html; };
  const gets = () => log.requests.filter((r) => r.method === 'GET');
  const posts = () => log.requests.filter((r) => r.method === 'POST');
  return { ctx, S, els, log, opzet, render, gets, posts };
}
async function geladen(root, opts = {}, dtoOpts = {}) {
  const t = laad(root, opts);
  t.opzet.lees.push({ status: 200, body: dto({ rol: (opts.rol || 'verkoper') === 'tussenpersoon' ? 'begeleider' : 'verkoper', entiteit_id: opts.entiteit || null, ...dtoOpts }) });
  await t.ctx.fbcLaad();
  return t;
}
function vulCorrectie(t, w = {}) {
  t.ctx.fbcOpenCorrectie('ebitda');
  t.ctx.fbcInvoer('nieuw', w.nieuw !== undefined ? w.nieuw : '1.234.600,50');
  t.ctx.fbcInvoer('reden', w.reden !== undefined ? w.reden : 'Volgens jaarrekening 2024, regel 18.');
  t.ctx.fbcInvoer('doc', w.doc !== undefined ? w.doc : 'DOC_1');
  t.ctx.fbcInvoer('bevestigd', w.bevestigd !== undefined ? w.bevestigd : true);
}

export async function draaiFinancialSourceUiChecks(root = process.cwd()) {
  const res = [];
  const check = (ok, msg) => res.push({ ok: !!ok, msg });
  const geenXss = (html) => !/<img|<script|<b>|<i>|onmouseover="|onerror=alert\(1\)>/i.test(html.replace(/&lt;img src=x onerror=alert\(1\)&gt;/g, ''));

  // 1. Bronbestanden: laadvolgorde en aanroep in fase Financieel; geen stille save, geen andere API.
  {
    const html = lees(root, 'mna.html'); const s06 = lees(root, 'mna/06-schermen.js'); const s09 = lees(root, 'mna/09-financiele-broncontrole.js');
    const i09 = html.indexOf('<script src="mna/09-financiele-broncontrole.js"></script>'), i06 = html.indexOf('<script src="mna/06-schermen.js"></script>');
    check(i09 > 0 && i06 > i09, 'mna.html laadt mna/09 als gewone script vóór mna/06');
    check(s06.includes('+renderFinancieleBroncontrole(f.id)'), 'mna/06 renderMain toont het broncontrolepaneel');
    check(!/saveCurrent\(|\/mna\/save|\bconsolideer[A-Za-z0-9_$]*\s*\(|anthropic|localStorage/.test(s09.replace(/^\s*\/\/.*$/gm, '')), 'mna/09 roept geen saveCurrent, /mna/save, consolidatie, AI of opslag aan');
    const urls = s09.match(/WORKER\+'[^']*'/g) || [];
    check(urls.length === 2 && urls.every((u) => u.indexOf("'/mna/financieel/broncontrole/") > 0), 'mna/09 gebruikt alleen de bestaande GET/POST broncontrole-routes');
  }

  // 2. Koper en onbekende rol: geen paneel, geen verzoek, geen correctie.
  for (const rol of ['koper', '']) {
    const t = laad(root, { rol });
    const html = t.render();
    await t.ctx.fbcLaad(); t.ctx.fbcOpenCorrectie('ebitda'); await t.ctx.fbcVerstuurCorrectie();
    check(html === '' && t.log.html === '' && t.log.requests.length === 0, 'rol "' + (rol || 'leeg') + '": geen paneel, geen request, geen brondata');
  }

  // 3. Geen automatisch laden: verkoper ziet alleen een startknop.
  {
    const t = laad(root);
    const html = t.render();
    check(html.includes('Broncontrole starten') && t.log.requests.length === 0, 'paneel laadt pas na expliciete klik (geen automatisch verzoek)');
    check(t.ctx.renderFinancieleBroncontrole('commercieel') === '', 'paneel alleen in fase Financieel');
  }

  // 4. Positief laden + render (verkoper, trajectniveau).
  {
    const t = await geladen(root);
    const h = t.log.html;
    const g = t.gets();
    check(g.length === 1 && g[0].url === LEES_PAD + 'VSYN0001', 'GET exact op /mna/financieel/broncontrole/{code} zonder entiteit_id op trajectniveau');
    check(h.includes('Verversen') && h.includes('Grootheden'), 'na laden: verversknop en grootheden zichtbaar');
    check(h.includes('>BRONFEIT<') && h.includes('>AI-INTERPRETATIE<') && h.includes('>ONZEKER<'), 'BRONFEIT, AI-INTERPRETATIE en ONZEKER apart gelabeld');
    check(h.includes('<code>EUR 1.234.600</code>') && h.includes('genormaliseerd: 1.234.600'), 'bronorigineel en genormaliseerde waarde naast elkaar');
    check(h.includes('origineel onbekend (niet gereconstrueerd)'), 'onbekend origineel wordt niet geraden');
    check(h.includes('Realisatie (ACTUAL)') && h.includes('Prognose (FORECAST)') && h.includes('realisatie/prognose onbekend'), 'realisatie, prognose en onbekende periode-soort onderscheiden');
    check(h.includes('<strong>Enkelvoudig</strong>') && h.includes('<strong>Geconsolideerd</strong>') && h.includes('scope onbekend (enkelvoudig/geconsolideerd niet vastgelegd)'), 'enkelvoudig, geconsolideerd (met kring) en onbekende scope zichtbaar');
    check(h.includes('niet automatisch geconsolideerd') && !/Groep \(geconsolideerd\)/.test(h), 'trajectniveau-rij nooit als automatisch geconsolideerd getoond');
    check(h.includes('regel 18') && h.includes('locatie onbekend'), 'bronlocatie zichtbaar, ontbrekende locatie expliciet');
    check(h.includes('Afwijking') && h.includes('Niet vergelijkbaar') && h.includes('verschil 65.400') && h.includes('5.3%') && h.includes('Hypothesen (niet bewezen)'), 'crosscheckverschillen met absolute/relatieve afwijking en onbewezen hypothese');
    check(h.includes('relatief <em') && h.includes('n.v.t.'), 'relatief verschil null wordt n.v.t., geen 0');
    check(h.includes('Ontbrekend: origineel, valuta, eenheid, periodebegin, locatie in het document'), 'ontbrekende metadata per bron zichtbaar');
    check(h.includes('AI-voorstel (onbevestigd, geen bronfeit)'), 'AI-voorstel apart en onbevestigd');
    check(h.includes('referentie: <code>DOC_1</code>') && h.includes('afgeschermd') && !/<a\s/i.test(h), 'documentreferentie zonder fictieve link; afgeschermde id als "afgeschermd"');
    check(h.includes('zekerheid ONBEKEND') && h.includes('de waarde is sindsdien gewijzigd'), 'huidige waarde zonder bewezen bronbinding en laatste correctie zichtbaar');
    check(h.includes("fbcOpenCorrectie('ebitda')") && !h.includes("fbcOpenCorrectie('debiteuren')"), 'verkoper: correctieknop alleen bij niet-afgeleide waarde');
    check(geenXss(h) && h.includes('&lt;img src=x onerror=alert(1)&gt;.pdf') && h.includes('oud&quot; onmouseover=&quot;alert(3).pdf') && h.includes('&lt;script&gt;'), 'alle servertekst en attributen geëscapet (XSS)');
  }

  // 5. Entiteitscope: entiteit_id in de query; antwoord met andere scope wordt geweigerd.
  {
    const t = await geladen(root, { entiteit: 'ENT_A' });
    check(t.gets()[0].url === LEES_PAD + 'VSYN0001?entiteit_id=ENT_A' && t.log.html.includes('Entiteit ENT_A'), 'entiteit: GET met ?entiteit_id en scope van de entiteit getoond');
    const t2 = laad(root, { entiteit: 'ENT_A' });
    t2.opzet.lees.push({ status: 200, body: dto({ entiteit_id: 'ENT_B' }) });
    await t2.ctx.fbcLaad();
    check(t2.ctx.FBC.data === null && !t2.log.html.includes('Grootheden') && t2.log.html.includes('onverwachte vorm'), 'antwoord voor andere entiteit wordt niet getoond');
  }

  // 6. Stale: wissel van entiteit, traject of rol tijdens laden → antwoord genegeerd; scopewissel wist data.
  for (const [naam, wissel] of [
    ['entiteit', (S) => { S._actieveEntiteit = 'ENT_B'; }],
    ['traject', (S) => { S.code = 'VANDER002'; }],
    ['rol', (S) => { S.rol = 'koper'; }],
    ['scherm', (S) => { S.screen = 'summary'; }],
  ]) {
    const t = laad(root, { entiteit: 'ENT_A' });
    const u = uitgesteld();
    t.opzet.lees.push({ uitgesteld: u });
    const p = t.ctx.fbcLaad();
    wissel(t.S);
    u.los({ status: 200, body: dto({ entiteit_id: 'ENT_A' }) });
    await p; await wacht();
    const html = t.render();
    check(t.ctx.FBC.data === null && !html.includes('jaarrekening-2024'), 'stale antwoord na ' + naam + 'wissel genegeerd');
  }
  {
    const t = await geladen(root);
    check(t.log.html.includes('jaarrekening-2024'), 'scopewissel: data eerst zichtbaar');
    t.S._actieveEntiteit = 'ENT_B';
    const html = t.render();
    check(t.ctx.FBC.data === null && !html.includes('jaarrekening-2024') && html.includes('Broncontrole starten') && t.gets().length === 1, 'scopewissel wist data zonder nieuw verzoek of cache uit andere scope');
  }

  // 7. Ontbrekende gegevens zichtbaar.
  {
    const leeg = [{ grootheid: 'omzet', label: 'Netto-omzet', soort: 'periode', huidige_waarden: [{ veld_id: 'omzet1', waarde: null, herkomst: 'LEGACY_SCALAR', zekerheid: 'ONBEKEND', automatisch_afgeleid: false, laatste_broncorrectie: null }], bronnen: [], crosscheck: { status: 'ONVOLDOENDE_BRONNEN', vergelijkingen: [], gebruikersactie: 'Lever een tweede bron aan.' } }];
    const t = await geladen(root, {}, { docs: [], grootheden: leeg, ontbrekend: ['geen_financiele_brondocumenten_voor_deze_scope', 'geen_financiele_gegevensrij', 'nieuwe_code'] });
    const h = t.log.html;
    check(h.includes('Ontbrekende gegevens: Geen financiële brondocumenten voor deze scope., Er is (nog) geen financiële gegevensrij voor deze scope., nieuwe_code'), 'ontbrekende dossiergegevens (ook onbekende code) zichtbaar');
    check(h.includes('Geen bronwaarde in de documenten van deze scope') && h.includes('Onvoldoende bronnen') && h.includes('>leeg</em>'), 'lege waarde en ontbrekende bronnen niet als 0 of feit getoond');
  }

  // 8. Leesfouten: 404/403/400/500/netwerk/onleesbaar/verkeerde vorm/rol → duidelijke fout, geen data.
  for (const [naam, antw, tekst] of [
    ['404 (niet vrijgegeven)', { status: 404, ongeldigeJson: true }, 'niet beschikbaar (404)'],
    ['404 entiteit', { status: 404, body: { error: 'Entiteit niet gevonden' } }, 'hoort niet (meer) bij dit traject'],
    ['403 voorwaarden', { status: 403, body: { error: 'voorwaarden_niet_geaccepteerd', versie: 'v3' } }, 'platformvoorwaarden'],
    ['403', { status: 403, body: { error: 'Geen toegang' } }, 'Geen toegang tot de financiële broncontrole'],
    ['500', { status: 500, body: { error: '<b>boem</b>' } }, 'tijdelijk niet beschikbaar (HTTP 500)'],
    ['503', { status: 503, body: { error: 'Broncontrole tijdelijk niet beschikbaar' } }, 'tijdelijk niet beschikbaar (HTTP 503)'],
    ['netwerk', { netwerk: true }, 'Geen verbinding'],
    ['onleesbaar', { status: 200, ongeldigeJson: true }, 'onleesbaar'],
    ['malformed', { status: 200, body: { ok: true, rol: 'verkoper', correctie_toegestaan: true, scope: { entiteit_id: null } } }, 'onverwachte vorm'],
    ['rolmismatch', { status: 200, body: dto({ rol: 'begeleider' }) }, 'onverwachte vorm'],
    ['ok:false', { status: 200, body: { ...dto(), ok: false } }, 'onverwachte vorm'],
  ]) {
    const t = laad(root);
    t.opzet.lees.push(antw);
    await t.ctx.fbcLaad();
    const h = t.log.html;
    check(t.ctx.FBC.status === 'fout' && t.ctx.FBC.data === null && h.includes(tekst) && !h.includes('Grootheden') && !h.includes('vastgelegd') && !h.includes('<b>boem'), 'leesfout ' + naam + ': duidelijke melding, geen data, geen vals succes');
  }
  {
    const t = laad(root);
    const u = uitgesteld(); t.opzet.lees.push({ uitgesteld: u });
    const p1 = t.ctx.fbcLaad(); const p2 = t.ctx.fbcLaad();
    check(t.log.html.includes('Laden…') && t.log.html.includes('disabled'), 'tijdens laden is de knop geblokkeerd');
    u.los({ status: 200, body: dto() }); await p1; await p2;
    check(t.gets().length === 1, 'dubbelklik op laden geeft één verzoek');
  }

  // 9. Begeleider: lezen, nooit corrigeren (ook niet bij een server-flag of geforceerde state).
  {
    const t = await geladen(root, { rol: 'tussenpersoon' }, { correctie_toegestaan: true });
    const h = t.log.html;
    check(t.gets()[0].url === LEES_PAD + 'VSYN0001' && h.includes('Alleen lezen') && h.includes('>BRONFEIT<'), 'begeleider leest de broncontrole');
    t.ctx.fbcOpenCorrectie('ebitda');
    check(!h.includes('fbcOpenCorrectie') && t.ctx.FBC.correctie === null, 'begeleider: geen correctieknop en geen formulier');
    t.ctx.FBC.correctie = { veld_id: 'ebitda', scope: t.ctx.FBC.scope, code: 'VSYN0001', entiteit_id: null, verwachte_oude_waarde: '300000', nieuw: '1.000', reden: 'Volgens jaarrekening 2024.', doc: 'DOC_1', bevestigd: true, bezig: false, fout: null };
    await t.ctx.fbcVerstuurCorrectie();
    check(t.posts().length === 0, 'begeleider: geforceerde correctie verstuurt niets');
  }

  // 10. Correctiebeperking: server-flag false, of traject vergrendeld/afgesloten.
  for (const [naam, opts, dtoOpts] of [['correctie_toegestaan=false', {}, { correctie_toegestaan: false }], ['afgesloten', { status: 'afgesloten' }, {}], ['vergrendeld', { status: 'vergrendeld' }, {}]]) {
    const t = await geladen(root, opts, dtoOpts);
    t.ctx.fbcOpenCorrectie('ebitda');
    check(!t.log.html.includes('fbcOpenCorrectie') && t.ctx.FBC.correctie === null && t.log.html.includes('Correctie is nu niet mogelijk'), 'verkoper ' + naam + ': geen correctie mogelijk');
  }
  {
    const t = await geladen(root);
    t.ctx.fbcOpenCorrectie('debiteuren'); t.ctx.fbcOpenCorrectie('ebitda"><x');
    check(t.ctx.FBC.correctie === null, 'afgeleide groepswaarde of onbekend veld niet corrigeerbaar');
  }

  {
    const t = await geladen(root);
    check(t.ctx.fbcBedrag('300.000', true) === '300.000', 'legacy huidige waarde 300.000 blijft driehonderdduizend');
    check(t.ctx.fbcBedrag('1234600,5', true) === '1.234.600,5' && t.ctx.fbcBedrag('1234600.5') === '1.234.600,5', 'legacy en canonieke bronwaarde expliciet met gelijke bedragweergave');
    check(t.ctx.fbcBedrag('-0,05', true) === '-0,05' && t.ctx.fbcBedrag('-2500.25') === '-2.500,25', 'negatieve en kleine decimalen zichtbaar behouden');
  }

  // 11. Positieve correctie: exacte payload, succes pas na ok, lokaal en paneel consistent.
  {
    const t = await geladen(root);
    t.els.df_ebitda = { value: '300000' };
    vulCorrectie(t);
    check(t.log.html.includes('id="fbc-correctie"') && t.log.html.includes('geen automatisch bronfeit'), 'correctieformulier met expliciete bevestiging en bewijs/reden');
    t.opzet.correctie.push(succes());
    t.opzet.lees.push({ status: 200, body: dto({ ebitda: '1234600,5' }) });
    await t.ctx.fbcVerstuurCorrectie();
    const p = t.posts();
    const body = p.length ? JSON.parse(p[0].body) : {};
    check(p.length === 1 && JSON.stringify(Object.keys(body).sort()) === JSON.stringify(['bron_document_id', 'code', 'entiteit_id', 'nieuwe_waarde', 'reden', 'veld_id', 'verwachte_oude_waarde']), 'POST met exact de contractsleutels');
    check(body.code === 'VSYN0001' && body.entiteit_id === null && body.veld_id === 'ebitda' && body.nieuwe_waarde === '1234600.5' && body.verwachte_oude_waarde === '300000' && body.reden === 'Volgens jaarrekening 2024, regel 18.' && body.bron_document_id === 'DOC_1', 'payload: canonieke waarde, verwachte oude serverwaarde, reden en brondocument');
    check(p[0] && p[0].headers && p[0].headers['Content-Type'] === 'application/json', 'POST als JSON');
    check(t.S._groepData.financieel_ebitda === '1234600,5' && t.els.df_ebitda.value === '1234600,5', 'lokale waarde pas na ok bijgewerkt (formulier consistent)');
    check(t.gets().length === 2 && t.ctx.FBC.status === 'ok' && t.ctx.FBC.correctie === null, 'paneel na succes opnieuw geladen');
    check(t.log.html.includes('Correctie vastgelegd') && t.log.html.includes('WZ1760000000000ABC') && t.log.html.includes('geen bronfeit'), 'succesmelding met audit-id en "geen bronfeit"');
    check(t.ctx.parseGeld(t.S._groepData.financieel_ebitda) === 1234600.5 && t.ctx.parseGeld(t.els.df_ebitda.value) === 1234600.5, 'echte rekenkern behoudt decimalen in lokale toestand en formulier');
    check(t.ctx.FBC.data.grootheden.some(g => (g.huidige_waarden || []).some(h => h.waarde === '1234600,5')), 'herladen serverwaarde behoudt Nederlandse decimalen');
    check(t.log.saveCurrent === 0, 'geen stille saveCurrent');
    check(t.log.html.includes('<code>EUR 1.234.600</code>'), 'oorspronkelijke bronwaarden blijven zichtbaar na correctie');
  }
  {
    const t = await geladen(root, { entiteit: 'ENT_A' });
    vulCorrectie(t, { nieuw: '-12.500' });
    t.opzet.correctie.push(succes({ entiteit_id: 'ENT_A', nieuwe_waarde: '-12500' }));
    t.opzet.lees.push({ status: 200, body: dto({ entiteit_id: 'ENT_A', ebitda: '-12500' }) });
    await t.ctx.fbcVerstuurCorrectie();
    const body = JSON.parse(t.posts()[0].body);
    check(body.entiteit_id === 'ENT_A' && body.nieuwe_waarde === '-12500' && t.S.dataPerEntiteit.ENT_A.financieel_ebitda === '-12500' && t.S._groepData.financieel_ebitda === '300000', 'entiteitcorrectie: alleen de eigen entiteitrij lokaal bijgewerkt, groep ongemoeid');
  }

  // 12. Dubbelklik: één POST.
  {
    const t = await geladen(root);
    vulCorrectie(t);
    const u = uitgesteld(); t.opzet.correctie.push({ uitgesteld: u });
    const p1 = t.ctx.fbcVerstuurCorrectie(); const p2 = t.ctx.fbcVerstuurCorrectie();
    check(t.log.html.includes('Bezig met vastleggen') && /id="fbc-verstuur"[^>]*disabled/.test(t.log.html), 'knop geblokkeerd tijdens vastleggen');
    t.opzet.lees.push({ status: 200, body: dto({ ebitda: '1234600,5' }) });
    u.los(succes()); await p1; await p2;
    check(t.posts().length === 1, 'dubbelklik verstuurt één correctie');
  }

  // 13. 409: herladen, geen automatische retry, lokaal ongewijzigd.
  {
    const t = await geladen(root);
    vulCorrectie(t);
    t.opzet.correctie.push({ status: 409, body: { ok: false, fout: 'VEROUDERD', error: 'De waarde is intussen gewijzigd; laad de broncontrole opnieuw en controleer de huidige waarde.', huidige_waarde: '310000' } });
    t.opzet.lees.push({ status: 200, body: dto({ ebitda: '310000' }) });
    await t.ctx.fbcVerstuurCorrectie(); await wacht(5);
    check(t.posts().length === 1 && t.gets().length === 2, '409: één POST, daarna alleen herladen (geen retry)');
    check(t.S._groepData.financieel_ebitda === '300000' && t.ctx.FBC.correctie === null && t.log.html.includes('409') && t.log.html.includes('opnieuw geladen'), '409: lokaal niets aangepast, melding om opnieuw te beoordelen');
    check(t.log.html.includes('310.000') && !t.log.html.includes('Correctie vastgelegd'), '409: actuele serverwaarde getoond, geen vals succes');
  }

  // 14. Validatie: geen NaN/null-als-nul, reden, brondocument, bevestiging, gelijke waarde.
  for (const [naam, w] of [
    ['leeg bedrag', { nieuw: '' }], ['tekst', { nieuw: 'abc' }], ['NaN', { nieuw: 'NaN' }], ['dubbelzinnig 1234.5', { nieuw: '1234.5' }],
    ['dubbelzinnig 1,234', { nieuw: '1,234' }], ['1e5', { nieuw: '1e5' }], ['haakjes', { nieuw: '(500)' }], ['drie decimalen', { nieuw: '1.234,567' }],
    ['te groot', { nieuw: '1234567890123456' }], ['gelijk aan huidig', { nieuw: '300000' }],
    ['reden te kort', { reden: 'kort' }], ['reden stuurteken', { reden: 'Volgens jaarrekening\u0007 2024' }],
    ['geen brondocument', { doc: '' }], ['vervangen document', { doc: 'DOC_V' }], ['onbevestigd', { bevestigd: false }],
  ]) {
    const t = await geladen(root);
    vulCorrectie(t, w);
    await t.ctx.fbcVerstuurCorrectie();
    check(t.posts().length === 0 && t.ctx.FBC.correctie && t.ctx.FBC.correctie.fout && t.S._groepData.financieel_ebitda === '300000', 'validatie ' + naam + ': geen POST, foutmelding, niets lokaal');
  }
  {
    const t = laad(root);
    const c = (s) => t.ctx.fbcCanoniekBedrag(s);
    check(c('1.234.600,50').waarde === '1234600.5' && c('-12.500').waarde === '-12500' && c('0').waarde === '0' && c('-0').waarde === '0' && c('007').waarde === '7' && c('12,5').waarde === '12.5' && c(' 1000 ').waarde === '1000', 'canonieke vorm uit Nederlandse notatie (via parseGeld gecontroleerd)');
    check(c('').ok === false && c(null).ok === false && c('Infinity').ok === false && c('-').ok === false, 'leeg/null/Infinity nooit als 0');
  }

  // 15. Niet-opgeslagen formulierinvoer blokkeert de correctie (en gaat niet verloren).
  {
    const t = await geladen(root);
    t.els.df_ebitda = { value: '999.999' };
    vulCorrectie(t);
    await t.ctx.fbcVerstuurCorrectie();
    check(t.posts().length === 0 && t.els.df_ebitda.value === '999.999' && /andere waarde dan op de server/.test(t.ctx.FBC.correctie.fout), 'afwijkende niet-opgeslagen invoer: geen POST, invoer behouden');
    const t2 = await geladen(root);
    t2.S._pendingSave = { snapshot: {} };
    vulCorrectie(t2);
    await t2.ctx.fbcVerstuurCorrectie();
    check(t2.posts().length === 0 && /opslag van het formulier/.test(t2.ctx.FBC.correctie.fout), 'wachtende formulier-opslag: geen POST');
  }
  {
    // Gebruiker typt tijdens het vastleggen: invoer blijft staan en wordt gemeld.
    const t = await geladen(root);
    t.els.df_ebitda = { value: '300000' };
    vulCorrectie(t);
    const u = uitgesteld(); t.opzet.correctie.push({ uitgesteld: u });
    t.opzet.lees.push({ status: 200, body: dto({ ebitda: '1234600,5' }) });
    const p = t.ctx.fbcVerstuurCorrectie();
    t.els.df_ebitda.value = '400.000';
    u.los(succes()); await p;
    check(t.els.df_ebitda.value === '400.000' && t.S._groepData.financieel_ebitda === '400.000' && t.log.html.includes('uw eigen invoer'), 'invoer tijdens vastleggen niet stil overschreven');
  }

  // 16. POST-fouten: netwerk, 403, 404, 400, 500, onverwacht 200 → geen retry, geen lokaal effect.
  for (const [naam, antw, tekst] of [
    ['netwerk', { netwerk: true }, 'niet automatisch opnieuw'],
    ['403 vergrendeld', { status: 403, body: { error: 'vergrendeld', message: 'x' } }, 'vergrendeld'],
    ['403', { status: 403, body: { error: 'Geen toegang' } }, 'alleen de verkoper'],
    ['404 route', { status: 404, ongeldigeJson: true }, 'niet beschikbaar (404)'],
    ['404 brondocument', { status: 404, body: { ok: false, fout: 'BRONDOCUMENT_NIET_GEVONDEN', error: 'Het brondocument is niet gevonden in dit traject.' } }, 'brondocument is niet gevonden'],
    ['400', { status: 400, body: { ok: false, fout: 'REDEN_VERPLICHT', error: 'Geef een reden <b>x</b>' } }, 'Geef een reden'],
    ['500', { status: 500, body: { ok: false, fout: 'CORRECTIE_NIET_VASTGELEGD', error: 'De correctie en de audit konden niet samen worden vastgelegd; er is niets gewijzigd.' } }, 'HTTP 500'],
    ['onleesbaar', { status: 200, ongeldigeJson: true }, 'niet bevestigd'],
    ['200 andere waarde', succes({ nieuwe_waarde: '1' }), 'niet bevestigd'],
    ['200 verkeerde opslag', succes({ opgeslagen_waarde: '1234600.5' }), 'niet bevestigd'],
    ['200 ontbrekende opslag', succes({ opgeslagen_waarde: null }), 'niet bevestigd'],
    ['200 ok:false', { status: 200, body: { ok: false } }, 'niet bevestigd'],
  ]) {
    const t = await geladen(root);
    vulCorrectie(t);
    t.opzet.correctie.push(antw);
    await t.ctx.fbcVerstuurCorrectie(); await wacht(5);
    const c = t.ctx.FBC.correctie;
    check(t.posts().length === 1 && t.gets().length === 1 && c && !c.bezig && c.fout.includes(tekst) && t.S._groepData.financieel_ebitda === '300000' && !t.log.html.includes('Correctie vastgelegd') && !t.log.html.includes('<b>x'), 'correctiefout ' + naam + ': geen retry, geen lokaal effect, duidelijke melding');
  }

  // 17. Laat correctieantwoord na scopewissel: niet in de nieuwe scope, wel correct in de eigen entiteit.
  {
    const t = await geladen(root, { entiteit: 'ENT_A' });
    vulCorrectie(t);
    const u = uitgesteld(); t.opzet.correctie.push({ uitgesteld: u });
    const p = t.ctx.fbcVerstuurCorrectie();
    const entA = t.S.dataPerEntiteit.ENT_A;
    t.S.dataPerEntiteit.ENT_B = { financieel_ebitda: '777' };
    t.S._actieveEntiteit = 'ENT_B'; t.S.data = t.S.dataPerEntiteit.ENT_B; t.render();
    u.los(succes({ entiteit_id: 'ENT_A' })); await p; await wacht(5);
    const html = t.render();
    check(entA.financieel_ebitda === '1234600,5' && t.S.dataPerEntiteit.ENT_B.financieel_ebitda === '777' && t.S._groepData.financieel_ebitda === '300000', 'laat succes alleen in de oorspronkelijke entiteit verwerkt');
    check(t.ctx.FBC.melding === null && t.ctx.FBC.data === null && !html.includes('Correctie vastgelegd') && t.gets().length === 1, 'laat antwoord verschijnt niet in de nieuwe scope en laadt niets');
  }

  // 17b. Laden/verversen van het paneel hertekent het scherm, maar getypte niet-opgeslagen invoer blijft staan.
  {
    const t = laad(root);
    t.els.df_ebitda = { value: '555.555' };
    t.opzet.lees.push({ status: 200, body: dto() });
    await t.ctx.fbcLaad();
    check(t.log.renders >= 2 && t.els.df_ebitda.value === '555.555' && t.S._groepData.financieel_ebitda === '300000' && t.log.saveCurrent === 0, 'niet-opgeslagen formulierinvoer overleeft het hertekenen, zonder stille opslag');
  }
  {
    const t = await geladen(root);
    vulCorrectie(t);
    t.opzet.lees.push({ status: 200, body: dto() });
    await t.ctx.fbcLaad();
    check(t.ctx.FBC.correctie === null && t.posts().length === 0 && t.gets().length === 2, 'handmatig verversen sluit een niet-verzonden correctie zonder iets te versturen');
  }

  // 18. Rendergrootte begrensd met zichtbare melding.
  {
    const docs = Array.from({ length: 60 }, (_, i) => ({ bron_document_id: 'D' + i, bestandsnaam: 'doc' + i + '.csv', document_status: 'BRUIKBAAR', methode: 'text_extract', methode_type: 'DETERMINISTISCH', levert_bronwaarden: true }));
    const t = await geladen(root, {}, { docs });
    check(t.log.html.includes('50 van 60 documenten getoond') && t.log.html.includes('niet volledig') && !t.log.html.includes('doc55.csv'), 'begrensde weergave meldt expliciet dat niet alles getoond is');
  }

  return res;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiFinancialSourceUiChecks(root);
  res.forEach((r) => console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg));
  const fout = res.filter((r) => !r.ok).length;
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' checks gefaald.' : '\nAlle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
