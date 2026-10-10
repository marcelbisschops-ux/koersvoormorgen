#!/usr/bin/env node
// Juridische broncontrole UI (productpunt 4, 10 okt 2026).
//
// Draait de ECHTE module mna/10-juridische-broncontrole.js plus de echte fetchMetTimeout (mna/01) en
// isVerkoper/isKoper/isTussen (mna/02) in node:vm. fetch is een stub met synthetische antwoorden in de
// vorm van de gecommitte backend (worker/11 regels 810-867 en worker/41 leesJuridischeBroncontrole/
// voerJuridischeBeoordelingUit). renderApp tekent het paneel via de echte renderJuridischeBroncontrole.
// Geen netwerk, geen browser, geen live API, geen AI — dit is technisch bewijs; staging-, echte-document-
// en productiebewijs staan apart OPEN (docs/legal-structure-ui.md).
//
// Gebruik: node tests/legal-structure-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 28).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const LEES_PAD = WORKER + '/mna/juridisch/broncontrole/';
const POST_URL = WORKER + '/mna/juridisch/broncontrole/beoordeling';
const DIGEST = 'e'.repeat(64);
const DIGEST2 = 'f'.repeat(64);
const OUD_DIGEST = 'd'.repeat(64);

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function regel(src, re, naam) { const m = src.match(re); if (!m) throw new Error('niet gevonden in bron: ' + naam); return m[0]; }
const wacht = (ms = 0) => new Promise((r) => setTimeout(r, ms));
function uitgesteld() { let los; const p = new Promise((r) => { los = r; }); return { p, los }; }
const alleUrls = [];

// ── Synthetische DTO's (vorm worker/41) ────────────────────────────────────────────────────────
const LABEL = { status: 'ONBEVESTIGD_VOORSTEL', herkomst: 'AI-INTERPRETATIE', juridisch_bewezen: false };
const ref = (extra) => ({ bron_document_id: 'DOC_1', inhoud_hash: 'c'.repeat(64), versie: 2, bronfragment: 'Enig aandeelhouder: Alfa Holding B.V.', pagina: 3, ...extra });
const VERSCHIL = {
  id: 'ENTITEIT_ONTBREEKT_OP_PLATFORM:kvk:87654321', type: 'ENTITEIT_ONTBREEKT_OP_PLATFORM',
  omschrijving: 'Een bron noemt een entiteit die niet in de platformstructuur staat.', platform: null,
  bron: { groep_id: 'kvk:87654321', namen: ['Gamma <script>alert(1)</script> BV'], kvk: ['87654321'], handelsnamen: [], rollen_volgens_bron: [], contexten: ['DEELNEMING'] },
  bronnen: [ref({ pagina: null, bronfragment: null })], ...LABEL,
};
function dto({ rol = 'verkoper', toegestaan = rol === 'begeleider', digest = DIGEST, aantal = 1, status = 'VERSCHILLEN_GESIGNALEERD', volledig = true,
  verschillen, onbekenden, documenten, beoordelingen, extra } = {}) {
  return {
    ok: true, rol, beoordeling_toegestaan: toegestaan,
    versie: 1, status, volledig, afgekapt: { entiteiten: false, documenten: !volledig, voorstellen: false }, juridisch_bewezen: false,
    uitleg: 'Bronvoorstellen zijn AI-interpretaties uit de bestaande documentextractie (ONBEVESTIGD_VOORSTEL) en nooit juridisch bewezen.',
    controle_snapshot: { digest, aantal_bruikbare_bronnen: aantal },
    platform_structuur: { herkomst: 'PLATFORMREGISTER_HANDMATIG',
      entiteiten: [{ entiteit_id: 'ENT_A', naam: 'Alfa Holding <b>BV</b>', kvk: '12345678', kvk_status: 'BEKEND', rol: 'holding' },
        { entiteit_id: 'ENT_B', naam: 'Beta BV', kvk: null, kvk_status: 'NIET_VASTGELEGD', rol: null }],
      niet_vastgelegd: ['moeder_dochterrelaties_niet_vastgelegd', 'eigendomspercentages_niet_vastgelegd', 'handelsnamen_niet_vastgelegd', 'consolidatiekring_niet_vastgelegd', 'verkoopperimeter_niet_vastgelegd'] },
    bron_structuur: {
      entiteiten: [
        { groep_id: 'kvk:12345678', namen: ['Alfa Holding B.V.'], kvk: ['12345678'], handelsnamen: [], rollen_volgens_bron: ['HOLDING'], contexten: ['ENTITEIT', 'HOUDER'],
          platform_match: { entiteit_id: 'ENT_A', naam: 'Alfa Holding <b>BV</b>', op: 'KVK' }, vermeldingen: [ref({ context: 'ENTITEIT' })], ...LABEL },
        { groep_id: 'kvk:87654321', namen: ['Gamma <script>alert(1)</script> BV'], kvk: ['87654321'], handelsnamen: [], rollen_volgens_bron: [], contexten: ['DEELNEMING'],
          platform_match: null, vermeldingen: [ref({ pagina: null, bronfragment: null, context: 'DEELNEMING' })], ...LABEL },
      ],
      relaties: [
        { houder: { type: 'RECHTSPERSOON', naam: 'Alfa Holding B.V.', kvk: '12345678', groep_id: 'kvk:12345678' }, deelneming: { naam: 'Gamma BV', kvk: '87654321', groep_id: 'kvk:87654321' },
          percentage: 60, percentage_status: 'VOLGENS_BRON', bron: ref(), ...LABEL },
        { houder: { type: 'NATUURLIJK_PERSOON', naam: null, kvk: null, groep_id: null }, deelneming: { naam: 'Gamma BV', kvk: '87654321', groep_id: 'kvk:87654321' },
          percentage: null, percentage_status: 'ONBEKEND', bron: ref({ bronfragment: '"><img src=x onerror=alert(5)>' }), ...LABEL },
      ],
      consolidatiekring: [], verkoopperimeter: [],
    },
    verschillen: verschillen || [VERSCHIL],
    onbekenden: onbekenden || [
      { id: 'MOEDER_ONBEKEND:ENT_B', type: 'MOEDER_ONBEKEND', omschrijving: 'Geen bruikbare bron noemt een rechtspersoon als moeder/aandeelhouder van deze entiteit.', platform: { entiteit_id: 'ENT_B', naam: 'Beta BV', kvk: null, kvk_status: 'NIET_VASTGELEGD', rol: null } },
      { id: 'CONSOLIDATIEKRING_ONBEKEND:traject', type: 'CONSOLIDATIEKRING_ONBEKEND', omschrijving: 'Geen bruikbare bron vermeldt de consolidatiekring; het platform legt deze niet vast.' },
      { id: 'BRONNEN_NIET_MEEGENOMEN:traject', type: 'BRONNEN_NIET_MEEGENOMEN', omschrijving: 'Documenten met een juridisch voorstel zijn niet meegenomen.', aantal: 1 },
    ],
    documenten: documenten || [
      { bron_document_id: 'DOC_1', bron_document_id_afgeschermd: false, bestandsnaam: 'kvk-uittreksel.pdf', fase_id: 'juridisch', inhoud_hash: 'c'.repeat(64), versie: 2, uploaded_at: 1760000000000,
        methode: 'pdf_direct', verwerking_status: 'PROCESSED', document_status: 'BRUIKBAAR', juridisch_voorstel: 'GEBRUIKT', reden_niet_gebruikt: null, voorstel_afgekapt: false,
        ai_zelfgerapporteerde_betrouwbaarheid: 'hoog', betrouwbaarheid_status: 'NIET_GEVERIFIEERD' },
      { bron_document_id: 'DOC_V', bron_document_id_afgeschermd: false, bestandsnaam: 'oud" onmouseover="alert(3).pdf', fase_id: 'juridisch', inhoud_hash: 'b'.repeat(64), versie: 1, uploaded_at: 1750000000000,
        methode: 'pdf_direct', verwerking_status: 'PROCESSED', document_status: 'VERVANGEN', juridisch_voorstel: 'GENEGEERD', reden_niet_gebruikt: 'VERVANGEN', voorstel_afgekapt: null,
        ai_zelfgerapporteerde_betrouwbaarheid: null, betrouwbaarheid_status: 'NIET_GEVERIFIEERD' },
    ],
    beoordelingen: beoordelingen || { status: 'BESCHIKBAAR', lijst: [
      { audit_id: 'WZ1760000000000AAA', beslissing: 'BEVESTIGD', reden: 'Actueel gecontroleerd in uittreksel', tijdstip: 1760000000000, actor_rol: 'begeleider', snapshot_digest: digest, verschil_id: null,
        geldig_voor_actuele_snapshot: true, status: 'ACTUEEL', betekenis: 'MENSELIJKE_BEOORDELING_VAN_ONBEVESTIGD_BRONVOORSTEL', juridisch_bewezen: false },
      { audit_id: 'WZ1750000000000BBB', beslissing: 'AFGEWEZEN', reden: 'Oude <i>reden</i> bij vorige versie', tijdstip: 1750000000000, actor_rol: 'begeleider', snapshot_digest: OUD_DIGEST, verschil_id: VERSCHIL.id,
        geldig_voor_actuele_snapshot: false, status: 'HISTORISCH_VEROUDERD', betekenis: 'MENSELIJKE_BEOORDELING_VAN_ONBEVESTIGD_BRONVOORSTEL', juridisch_bewezen: false },
    ] },
    ...extra,
  };
}
const succes = (extra = {}) => ({ status: 200, body: { ok: true, audit_id: 'WZ1760000000001ABCDEF', beslissing: 'BEVESTIGD', verschil_id: null, snapshot_digest: DIGEST, tijdstip: 1760000000001,
  voor: null, betekenis: 'MENSELIJKE_BEOORDELING_VAN_ONBEVESTIGD_BRONVOORSTEL', juridisch_bewezen: false, entiteiten_gewijzigd: false, ...extra } });

// ── Omgeving ────────────────────────────────────────────────────────────────────────────────────
function laad(root, { rol = 'verkoper', code = 'VSYN0001', status = 'actief', fase = 0, screen = 'main' } = {}) {
  const src01 = lees(root, 'mna/01-config-sectorprofielen.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const src10 = lees(root, 'mna/10-juridische-broncontrole.js');
  const delen = [
    regel(src01, /^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m, 'fetchMetTimeout'),
    regel(src02, /^function isVerkoper\(\)\{.*\}$/m, 'isVerkoper'),
    regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'),
    regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
  ];
  const els = {};
  const log = { requests: [], html: '', renders: 0, saveCurrent: 0 };
  const opzet = { lees: [], beoordeling: [] };
  const data = { juridisch_rechtsvorm: 'BV', juridisch_structuur: 'Holding met werkmaatschappij' };
  const S = { screen, code, rol, traject: { status }, fase, data, _groepData: data, dataPerEntiteit: {}, _actieveEntiteit: null,
    _entiteiten: [{ id: 'ENT_A', naam: 'Alfa Holding BV', kvk: '12345678', rol: 'holding' }, { id: 'ENT_B', naam: 'Beta BV', kvk: '', rol: '' }] };
  const FASES = [{ id: 'juridisch', dataFields: [{ id: 'rechtsvorm', label: 'Rechtsvorm' }, { id: 'structuur', label: 'Structuur' }] }, { id: 'financieel', dataFields: [] }];

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
    alleUrls.push(u);
    if (u === POST_URL && opts.method === 'POST') { const a = opzet.beoordeling.shift(); return a ? beantwoord(a) : Promise.reject(new Error('test: onverwachte POST')); }
    if (u.indexOf(LEES_PAD) === 0 && u !== POST_URL && (opts.method || 'GET') === 'GET') { const a = opzet.lees.shift(); return a ? beantwoord(a) : Promise.reject(new Error('test: onverwachte GET')); }
    return Promise.reject(new Error('test: onverwachte URL ' + u));
  };
  const ctx = {
    console, setTimeout, clearTimeout, AbortController, fetch, WORKER, S, FASES,
    ge: (id) => els[id] || null,
    // Zoals renderMain: het hele scherm (ook de invoervelden df_*) wordt opnieuw uit S.data getekend.
    renderApp: () => {
      log.renders++;
      for (const k of Object.keys(els)) if (k.startsWith('df_')) { const v = S.data['juridisch_' + k.slice(3)]; els[k].value = v == null ? '' : String(v); }
      log.html = ctx.renderJuridischeBroncontrole(FASES[S.fase] ? FASES[S.fase].id : '');
    },
    saveCurrent: () => { log.saveCurrent++; }, toast: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(delen.join('\n') + '\n' + src10, ctx, { filename: 'mna/10-juridische-broncontrole.js' });
  const render = () => { log.html = ctx.renderJuridischeBroncontrole(FASES[S.fase] ? FASES[S.fase].id : ''); return log.html; };
  const gets = () => log.requests.filter((r) => r.method === 'GET');
  const posts = () => log.requests.filter((r) => r.method === 'POST');
  return { ctx, S, els, log, opzet, render, gets, posts };
}
async function geladen(root, opts = {}, dtoOpts = {}) {
  const t = laad(root, opts);
  t.opzet.lees.push({ status: 200, body: dto({ rol: (opts.rol || 'verkoper') === 'tussenpersoon' ? 'begeleider' : 'verkoper', ...dtoOpts }) });
  await t.ctx.jbcLaad();
  return t;
}
const BEG = { rol: 'tussenpersoon', code: 'TSYN0001' };
function vulBesluit(t, w = {}) {
  t.ctx.jbcOpenBesluit(w.index !== undefined ? w.index : -1);
  if (w.beslissing !== null) t.ctx.jbcInvoer('beslissing', w.beslissing !== undefined ? w.beslissing : 'BEVESTIGD');
  t.ctx.jbcInvoer('reden', w.reden !== undefined ? w.reden : 'Gecontroleerd in het KvK-uittreksel, pagina 3.');
  t.ctx.jbcInvoer('bevestigd', w.bevestigd !== undefined ? w.bevestigd : true);
}
const geenAdminSleutel = (r) => !/key=/i.test(r.url) && !(r.headers && Object.keys(r.headers).some((k) => /admin/i.test(k)));

export async function draaiLegalStructureUiChecks(root = process.cwd()) {
  const res = [];
  const check = (ok, msg) => res.push({ ok: !!ok, msg });
  // Ruwe markup of een uitbrekend attribuut; geëscapete tekst (&lt;img …) is juist het bewijs van escaping.
  const geenXss = (html) => !/<img|<script|<b>|<i>|onmouseover="|onerror=alert\(\d\)>/i.test(html);
  alleUrls.length = 0;

  // 1. Bronbestanden: laadvolgorde, aanroep in fase Juridisch, mna/09 behouden; geen opslag/AI/andere API.
  {
    const html = lees(root, 'mna.html'); const s06 = lees(root, 'mna/06-schermen.js'); const s10 = lees(root, 'mna/10-juridische-broncontrole.js');
    const i09 = html.indexOf('<script src="mna/09-financiele-broncontrole.js"></script>'), i10 = html.indexOf('<script src="mna/10-juridische-broncontrole.js"></script>'), i06 = html.indexOf('<script src="mna/06-schermen.js"></script>');
    check(i09 > 0 && i10 > i09 && i06 > i10, 'mna.html laadt mna/10 als gewone script na mna/09 en vóór mna/06');
    check(s06.includes('+renderJuridischeBroncontrole(f.id)') && s06.includes('+renderFinancieleBroncontrole(f.id)'), 'mna/06 renderMain toont het juridische paneel en behoudt het financiële paneel');
    const code = s10.replace(/^\s*\/\/.*$/gm, '');
    check(!/saveCurrent\(|\/mna\/save|\/mna\/entiteiten|anthropic|ai-proxy|\/genereer|localStorage|sessionStorage|x-admin-key|ADMIN_KEY|[?&]key=/i.test(code), 'mna/10 roept geen saveCurrent, /mna/save, entiteitenroute, AI, opslag of beheerderssleutel aan');
    const urls = code.match(/WORKER\+'[^']*'/g) || [];
    check(urls.length === 2 && urls.includes("WORKER+'/mna/juridisch/broncontrole/'") && urls.includes("WORKER+'/mna/juridisch/broncontrole/beoordeling'"), 'mna/10 gebruikt alleen de bestaande GET/POST juridische broncontrole-routes');
    check(!/<a\s|href=/i.test(code), 'mna/10 maakt geen (fictieve) documentlink');
  }

  // 2. Koper, meekijker en onbekende rol: geen paneel, geen verzoek, geen beoordeling.
  for (const rol of ['koper', 'meekijker', '']) {
    const t = laad(root, { rol });
    const html = t.render();
    await t.ctx.jbcLaad(); t.ctx.jbcOpenBesluit(-1); await t.ctx.jbcVerstuurBesluit();
    check(html === '' && t.log.html === '' && t.log.requests.length === 0 && t.ctx.JBC.besluit === null, 'rol "' + (rol || 'leeg') + '": geen paneel, geen request, geen brondata');
  }

  // 3. Geen automatisch laden en alleen in fase Juridisch.
  {
    const t = laad(root);
    const html = t.render();
    check(html.includes('Broncontrole starten') && html.includes('geen AI gestart') && t.log.requests.length === 0, 'paneel laadt pas na expliciete klik (geen automatisch verzoek, geen AI)');
    check(t.ctx.renderJuridischeBroncontrole('financieel') === '' && t.log.requests.length === 0, 'paneel alleen in fase Juridisch');
    const t2 = laad(root, BEG); t2.render();
    check(t2.log.requests.length === 0, 'begeleider: ook geen automatisch verzoek');
  }

  // 4. Verkoper: positief laden en weergave, alleen lezen.
  {
    const t = await geladen(root);
    const g = t.gets();
    const h = t.log.html;
    check(g.length === 1 && g[0].url === LEES_PAD + 'VSYN0001' && g[0].body === undefined && geenAdminSleutel(g[0]), 'GET exact /mna/juridisch/broncontrole/{code}, zonder body of beheerderssleutel');
    check(t.ctx.JBC.status === 'ok' && h.includes('Verschillen gesignaleerd') && h.includes('Verversen'), 'verkoper: controle geladen met serverstatus');
    check(h.includes('Platformstructuur (handmatig register)') && h.includes('Alfa Holding &lt;b&gt;BV&lt;/b&gt;') && h.includes('KvK 12345678') && h.includes('niet vastgelegd') && h.includes('moeder-dochterrelaties, eigendomspercentages, handelsnamen, consolidatiekring, verkoopperimeter'), 'platformstructuur met wat het platform niet vastlegt');
    check(h.includes('Bronvoorstel uit documenten') && h.includes('ONBEVESTIGD VOORSTEL · AI-INTERPRETATIE') && h.includes('Koppeling platform:') && h.includes('(op KVK)') && h.includes('geen koppeling'), 'bronvoorstel versus platform met koppeling op KvK/geen koppeling');
    check(h.includes('Entiteit ontbreekt op platform') && h.includes('Platform: <em') && h.includes('namen volgens bron: Gamma &lt;script&gt;'), 'verschil platform versus bron zichtbaar');
    check(h.includes('Moeder onbekend') && h.includes('Consolidatiekring onbekend') && h.includes('Bronnen niet meegenomen') && h.includes('(1)'), 'onbekenden zichtbaar (moeder/kring/niet meegenomen)');
    check(h.includes('60% volgens bron') && h.includes('percentage onbekend') && h.includes('natuurlijk persoon (naam afgeschermd)'), 'eigendom: percentage alleen volgens bron, onbekend blijft onbekend, natuurlijk persoon afgeschermd');
    check(h.includes('<code>DOC_1</code>') && h.includes('versie 2') && h.includes('cccccccccccc…') && h.includes('pagina 3') && h.includes('Bronfragment (AI, niet geverifieerd): “Enig aandeelhouder: Alfa Holding B.V.”'), 'bronverwijzing met document-id, versie, hash, pagina en fragment');
    check(h.includes('Ontbrekend bewijs: pagina, bronfragment'), 'ontbrekend bewijs expliciet gemeld');
    check(h.includes('kvk-uittreksel.pdf') && h.includes('niet gebruikt: VERVANGEN') && h.includes('AI noemt zichzelf "hoog" (niet geverifieerd)') && h.includes('geen link'), 'documentbruikbaarheid en AI-zelfoordeel als niet geverifieerd');
    check(h.includes('>ACTUEEL<') && h.includes('HISTORISCH_VEROUDERD') && h.includes('Actueel gecontroleerd in uittreksel') && h.includes('WZ1750000000000BBB'), 'menselijke beoordelingen ACTUEEL versus HISTORISCH_VEROUDERD met audit-id');
    const bewezen = (h.match(/bewezen/g) || []).length, nooit = (h.match(/nooit juridisch bewezen/g) || []).length;
    check(bewezen > 0 && bewezen === nooit && !h.includes('BRONFEIT') && h.includes('geen juridische totaalgoedkeuring'), 'AI-voorstel nergens als juridisch bewezen/bronfeit; beoordeling geen totaalgoedkeuring');
    check(h.includes('Alleen lezen') && !h.includes('Dit verschil beoordelen') && !h.includes('Hele controlesnapshot beoordelen'), 'verkoper: alleen lezen, geen beoordelingsknoppen');
    t.ctx.jbcOpenBesluit(-1); t.ctx.jbcOpenBesluit(0); await t.ctx.jbcVerstuurBesluit();
    check(t.ctx.JBC.besluit === null && t.posts().length === 0, 'verkoper: kan geen beoordelingsformulier openen en doet geen POST');
    check(geenXss(h), 'XSS: alle servertekst en attributen geëscapet (namen, fragmenten, bestandsnamen, redenen)');
  }

  // 5. Status en volledigheid eerlijk.
  {
    const t = await geladen(root, {}, { status: 'ONVOLDOENDE_BRONINFORMATIE', volledig: false, aantal: 0, verschillen: [] });
    check(t.log.html.includes('Onvoldoende broninformatie') && t.log.html.includes('niet volledig') && t.log.html.includes('documenten') && t.log.html.includes('Dat is geen juridische goedkeuring'), 'onvoldoende/afgekapt: geen "alles klopt", afkapping zichtbaar');
    const t2 = await geladen(root, {}, { status: 'GEEN_VERSCHILLEN_GESIGNALEERD', verschillen: [] });
    check(t2.log.html.includes('Geen verschillen gesignaleerd (geen juridische goedkeuring)'), 'geen verschillen wordt niet als goedkeuring gepresenteerd');
    const t3 = await geladen(root, {}, { beoordelingen: { status: 'BESCHIKBAAR', lijst: [{ audit_id: 'WZ1X', beslissing: 'BEVESTIGD', reden: 'tekst van tien', tijdstip: 1, actor_rol: 'begeleider', snapshot_digest: OUD_DIGEST, verschil_id: null, geldig_voor_actuele_snapshot: true, status: 'ACTUEEL', juridisch_bewezen: false }] } });
    check(!t3.log.html.includes('>ACTUEEL<') && t3.log.html.includes('STATUS ONZEKER'), 'beoordeling alleen ACTUEEL bij exact gelijke snapshotdigest');
    const t4 = await geladen(root, {}, { beoordelingen: { status: 'NIET_BESCHIKBAAR', lijst: [] } });
    check(t4.log.html.includes('konden niet worden gelezen'), 'niet-leesbare beoordelingen eerlijk gemeld');
  }

  // 6. Begeleider: beoordeling hele snapshot, exacte payload, succes met auditbewijs.
  {
    const t = await geladen(root, BEG);
    check(t.log.html.includes('Hele controlesnapshot beoordelen') && t.log.html.includes('Dit verschil beoordelen'), 'begeleider met beoordeling_toegestaan: beoordelingsknoppen zichtbaar');
    vulBesluit(t);
    const voorEnt = JSON.stringify(t.S._entiteiten), voorData = JSON.stringify(t.S.data);
    t.opzet.beoordeling.push(succes());
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcVerstuurBesluit();
    const p = t.posts();
    const body = p.length ? JSON.parse(p[0].body) : {};
    check(p.length === 1 && p[0].url === POST_URL && JSON.stringify(Object.keys(body).sort()) === JSON.stringify(['beslissing', 'code', 'reden', 'snapshot_digest'])
      && body.code === 'TSYN0001' && body.snapshot_digest === DIGEST && body.beslissing === 'BEVESTIGD' && body.reden === 'Gecontroleerd in het KvK-uittreksel, pagina 3.', 'POST body exact code/snapshot_digest/beslissing/reden');
    check(JSON.stringify(p[0].headers) === JSON.stringify({ 'Content-Type': 'application/json' }) && geenAdminSleutel(p[0]), 'POST alleen met Content-Type, geen beheerderssleutel');
    check(t.log.html.includes('Beoordeling vastgelegd') && t.log.html.includes('WZ1760000000001ABCDEF') && t.log.html.includes('geen juridische totaalgoedkeuring') && t.ctx.JBC.besluit === null && t.gets().length === 2, 'succes met audit-id, daarna controle herladen');
    check(JSON.stringify(t.S._entiteiten) === voorEnt && JSON.stringify(t.S.data) === voorData && t.log.saveCurrent === 0 && t.log.requests.every((r) => r.url.indexOf(WORKER + '/mna/juridisch/broncontrole/') === 0), 'geen entiteit- of formuliermutatie, geen opslag, geen andere route');
  }
  {
    const t = await geladen(root, BEG);
    vulBesluit(t, { index: 0, beslissing: 'AFGEWEZEN' });
    t.opzet.beoordeling.push(succes({ beslissing: 'AFGEWEZEN', verschil_id: VERSCHIL.id }));
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcVerstuurBesluit();
    const body = JSON.parse(t.posts()[0].body);
    check(body.verschil_id === VERSCHIL.id && body.beslissing === 'AFGEWEZEN' && Object.keys(body).length === 5 && t.log.html.includes('voor verschil'), 'beoordeling per verschil met exact verschil_id');
  }

  // 7. Admin/geen recht: geen knop, geen POST; de server bepaalt de bovengrens.
  for (const [naam, opts, dtoOpts] of [
    ['serverrol admin', BEG, { rol: 'admin', toegestaan: false }],
    ['begeleider zonder beoordeling_toegestaan', BEG, { rol: 'begeleider', toegestaan: false }],
    ['vergrendeld traject', { ...BEG, status: 'vergrendeld' }, { rol: 'begeleider', toegestaan: true }],
    ['afgesloten traject', { ...BEG, status: 'afgesloten' }, { rol: 'begeleider', toegestaan: true }],
    ['geen bruikbare bron', BEG, { rol: 'begeleider', toegestaan: true, aantal: 0 }],
    ['ongeldige digest', BEG, { rol: 'begeleider', toegestaan: true, digest: 'xyz' }],
    ['verkoper met toegestaan=true van server', {}, { rol: 'verkoper', toegestaan: true }],
  ]) {
    const t = laad(root, opts);
    t.opzet.lees.push({ status: 200, body: dto(dtoOpts) });
    await t.ctx.jbcLaad();
    vulBesluit(t); await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 0 && !t.log.html.includes('Hele controlesnapshot beoordelen') && !t.log.html.includes('Dit verschil beoordelen') && t.ctx.JBC.besluit === null, naam + ': geen beoordelingsknop en geen POST');
  }
  {
    const t = laad(root, BEG);
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'admin', toegestaan: false }) });
    await t.ctx.jbcLaad();
    check(t.ctx.JBC.status === 'fout' && t.ctx.JBC.data === null && t.log.html.includes('hoort niet bij deze rol'), 'serverrol admin past niet bij de frontendrol: geen brondata getoond');
  }

  // 8. Validatie van beslissing, motivatie en bevestiging (geen POST, motivatie blijft staan).
  for (const [naam, w, tekst] of [
    ['geen beslissing', { beslissing: null }, 'Kies een beslissing'],
    ['motivatie te kort', { reden: 'te kort' }, '10 tot 1000 tekens'],
    ['motivatie alleen spaties', { reden: '            ' }, '10 tot 1000 tekens'],
    ['motivatie te lang', { reden: 'x'.repeat(1001) }, '10 tot 1000 tekens'],
    ['stuurteken', { reden: 'Gecontroleerd\u0001 in uittreksel' }, '10 tot 1000 tekens'],
    ['niet bevestigd', { bevestigd: false }, 'Bevestig eerst'],
  ]) {
    const t = await geladen(root, BEG);
    vulBesluit(t, w);
    await t.ctx.jbcVerstuurBesluit();
    const b = t.ctx.JBC.besluit;
    check(t.posts().length === 0 && b && b.fout.includes(tekst) && b.reden === (w.reden !== undefined ? w.reden : 'Gecontroleerd in het KvK-uittreksel, pagina 3.'), 'validatie ' + naam + ': geen POST, duidelijke melding, motivatie behouden');
  }
  {
    const t = await geladen(root, BEG);
    vulBesluit(t, { reden: '  ' + 'a'.repeat(1000) + '  ' });
    t.opzet.beoordeling.push(succes()); t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 1 && JSON.parse(t.posts()[0].body).reden.length === 1000, 'motivatie van precies 1000 tekens (getrimd) toegestaan');
    const t2 = await geladen(root, BEG);
    t2.ctx.jbcInvoer('beslissing', 'GOEDGEKEURD');
    t2.ctx.jbcOpenBesluit(-1); t2.ctx.jbcInvoer('beslissing', 'GOEDGEKEURD');
    check(t2.ctx.JBC.besluit.beslissing === '', 'alleen BEVESTIGD/AFGEWEZEN als beslissing');
  }

  // 9. Dubbelklik: één POST; verversen tijdens vastleggen geblokkeerd.
  {
    const t = await geladen(root, BEG);
    vulBesluit(t);
    const u = uitgesteld(); t.opzet.beoordeling.push({ uitgesteld: u });
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    const p1 = t.ctx.jbcVerstuurBesluit(); const p2 = t.ctx.jbcVerstuurBesluit();
    await t.ctx.jbcLaad();
    check(t.posts().length === 1 && t.gets().length === 1 && t.log.html.includes('Bezig met vastleggen') && /jbc-verstuur"[^>]*disabled/.test(t.log.html) && /jbc-laad-btn"[^>]*disabled/.test(t.log.html), 'dubbelklik: één POST, knoppen uitgeschakeld, geen verversen tijdens vastleggen');
    t.ctx.jbcInvoer('reden', 'gewijzigd tijdens bezig');
    u.los(succes()); await p1; await p2;
    check(t.posts().length === 1 && t.log.html.includes('Beoordeling vastgelegd'), 'na dubbelklik precies één vastlegging');
  }

  // 10. 409: geen retry, alleen herladen; gebruiker beoordeelt opnieuw.
  {
    const t = await geladen(root, BEG);
    vulBesluit(t);
    t.opzet.beoordeling.push({ status: 409, body: { ok: false, fout: 'VEROUDERD', error: 'De broncontrole is intussen gewijzigd (documenten, versies of entiteiten); laad de controle opnieuw. Er is niets vastgelegd.' } });
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider', digest: DIGEST2 }) });
    await t.ctx.jbcVerstuurBesluit(); await wacht(5);
    const b = t.ctx.JBC.besluit;
    check(t.posts().length === 1 && t.gets().length === 2 && t.log.html.includes('(409)') && t.log.html.includes('niet automatisch opnieuw'), '409: precies één POST, daarna alleen herladen');
    check(b && b.reden === 'Gecontroleerd in het KvK-uittreksel, pagina 3.' && b.beslissing === '' && b.bevestigd === false && b.digest === DIGEST2 && b.gewijzigd === true && t.log.html.includes('kies de beslissing opnieuw'), '409: motivatie behouden, beslissing en bevestiging opnieuw vereist');
    await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 1 && /Kies een beslissing/.test(t.ctx.JBC.besluit.fout), '409: geen automatische herschrijving of herhaling');
    t.ctx.jbcInvoer('beslissing', 'BEVESTIGD'); t.ctx.jbcInvoer('bevestigd', true);
    t.opzet.beoordeling.push(succes({ snapshot_digest: DIGEST2 })); t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider', digest: DIGEST2 }) });
    await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 2 && JSON.parse(t.posts()[1].body).snapshot_digest === DIGEST2 && t.log.html.includes('Beoordeling vastgelegd'), 'na expliciete herbeoordeling wordt de nieuwe snapshot gebruikt');
  }
  {
    // 409 VERSCHIL_NIET_IN_SNAPSHOT: na herladen bestaat het verschil niet meer → geen POST.
    const t = await geladen(root, BEG);
    vulBesluit(t, { index: 0 });
    t.opzet.beoordeling.push({ status: 409, body: { ok: false, fout: 'VERSCHIL_NIET_IN_SNAPSHOT', error: 'Dit verschil hoort niet bij de actuele controlesnapshot. Er is niets vastgelegd.' } });
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider', verschillen: [] }) });
    await t.ctx.jbcVerstuurBesluit();
    t.ctx.jbcInvoer('beslissing', 'BEVESTIGD'); t.ctx.jbcInvoer('bevestigd', true);
    await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 1 && /niet \(meer\) voor/.test(t.ctx.JBC.besluit.fout) && t.log.html.includes('niet meer in de actuele controle'), 'verdwenen verschil: niet stil omgezet naar hele snapshot, geen POST');
  }

  // 11. POST-fouten: geen retry, geen vals succes, motivatie behouden.
  for (const [naam, antw, tekst] of [
    ['netwerk', { netwerk: true }, 'onbekend of de beoordeling is aangekomen'],
    ['403 beheerder/rol', { status: 403, body: { ok: false, error: 'Juridische bronbeoordelingen zijn uitsluitend voorbehouden aan de begeleider.' } }, 'alleen de eigen begeleider'],
    ['403 vergrendeld', { status: 403, body: { ok: false, error: 'vergrendeld', message: 'x' } }, 'vergrendeld'],
    ['403 voorwaarden', { status: 403, body: { ok: false, error: 'voorwaarden_niet_geaccepteerd', versie: 3 } }, 'platformvoorwaarden'],
    ['404 route', { status: 404, ongeldigeJson: true }, 'niet beschikbaar (404)'],
    ['404 traject', { status: 404, body: { ok: false, error: 'Traject niet gevonden' } }, 'Traject niet gevonden'],
    ['400', { status: 400, body: { ok: false, fout: 'REDEN_VERPLICHT', error: 'Geef een reden <b>x</b>' } }, 'Geef een reden'],
    ['503', { status: 503, body: { ok: false, error: 'Juridische broncontrole tijdelijk niet beschikbaar; er is niets vastgelegd.' } }, '(503)'],
    ['500', { status: 500, body: { ok: false, fout: 'BEOORDELING_NIET_VASTGELEGD', error: 'De beoordeling kon niet worden vastgelegd; er is niets vastgelegd.' } }, 'HTTP 500'],
    ['200 onleesbaar', { status: 200, ongeldigeJson: true }, 'niet bevestigd'],
    ['200 ok:false', { status: 200, body: { ok: false } }, 'niet bevestigd'],
    ['200 andere beslissing', succes({ beslissing: 'AFGEWEZEN' }), 'niet bevestigd'],
    ['200 andere snapshot', succes({ snapshot_digest: DIGEST2 }), 'niet bevestigd'],
    ['200 ander verschil', succes({ verschil_id: VERSCHIL.id }), 'niet bevestigd'],
    ['200 zonder audit-id', succes({ audit_id: null }), 'niet bevestigd'],
    ['200 juridisch_bewezen', succes({ juridisch_bewezen: true }), 'niet bevestigd'],
    ['200 entiteiten gewijzigd', succes({ entiteiten_gewijzigd: true }), 'niet bevestigd'],
  ]) {
    const t = await geladen(root, BEG);
    vulBesluit(t);
    t.opzet.beoordeling.push(antw);
    await t.ctx.jbcVerstuurBesluit(); await wacht(5);
    const b = t.ctx.JBC.besluit;
    check(t.posts().length === 1 && t.gets().length === 1 && b && !b.bezig && b.fout.includes(tekst) && b.reden === 'Gecontroleerd in het KvK-uittreksel, pagina 3.'
      && !t.log.html.includes('Beoordeling vastgelegd') && !t.log.html.includes('<b>x'), 'beoordelingsfout ' + naam + ': geen retry, geen vals succes, motivatie behouden');
  }

  // 12. GET-fouten: eerlijke melding, geen schijnsucces of oude data.
  for (const [naam, antw, tekst] of [
    ['404 niet vrijgegeven', { status: 404, ongeldigeJson: true }, 'nog niet vrijgegeven'],
    ['403', { status: 403, body: { error: 'Geen toegang' } }, 'Geen toegang tot de juridische broncontrole'],
    ['403 voorwaarden', { status: 403, body: { error: 'voorwaarden_niet_geaccepteerd', versie: 3 } }, 'platformvoorwaarden'],
    ['503', { status: 503, body: { error: 'Juridische broncontrole tijdelijk niet beschikbaar' } }, 'HTTP 503'],
    ['netwerk', { netwerk: true }, 'Geen verbinding'],
    ['200 onleesbaar', { status: 200, ongeldigeJson: true }, 'onleesbaar'],
    ['200 malformed', { status: 200, body: { ok: true, rol: 'verkoper', beoordeling_toegestaan: false, status: 'VERSCHILLEN_GESIGNALEERD' } }, 'onverwachte vorm'],
    ['200 juridisch_bewezen true', { status: 200, body: dto({ extra: { juridisch_bewezen: true } }) }, 'onverwachte vorm'],
    ['200 onbekende status', { status: 200, body: dto({ status: 'ALLES_KLOPT' }) }, 'onverwachte vorm'],
    ['200 rol begeleider bij verkoper', { status: 200, body: dto({ rol: 'begeleider' }) }, 'hoort niet bij deze rol'],
  ]) {
    const t = laad(root);
    t.opzet.lees.push(antw);
    await t.ctx.jbcLaad();
    check(t.ctx.JBC.status === 'fout' && t.ctx.JBC.data === null && t.log.html.includes(tekst) && !t.log.html.includes('Verschillen gesignaleerd') && !t.log.html.includes('Alfa Holding') && t.gets().length === 1, 'GET-fout ' + naam + ': eerlijke melding, geen data, geen retry');
  }

  // 13. Late GET-antwoorden na wissel van klant, rol, scherm of fase worden genegeerd.
  for (const [naam, wissel] of [
    ['andere klant', (S) => { S.code = 'VSYN0002'; }],
    ['rolwissel', (S) => { S.rol = 'tussenpersoon'; }],
    ['schermwissel', (S) => { S.screen = 'summary'; }],
    ['fasewissel', (S) => { S.fase = 1; }],
  ]) {
    const t = laad(root);
    const u = uitgesteld(); t.opzet.lees.push({ uitgesteld: u });
    const p = t.ctx.jbcLaad();
    wissel(t.S); t.render();
    u.los({ status: 200, body: dto() }); await p; await wacht(5);
    const html = t.render();
    check(t.ctx.JBC.data === null && t.ctx.JBC.status === 'idle' && !html.includes('Alfa Holding') && !html.includes('Verschillen gesignaleerd'), 'laat GET-antwoord na ' + naam + ' genegeerd');
  }
  {
    // Geen cache tussen klanten: na klantwissel nieuw verzoek voor de nieuwe code, oude data nooit zichtbaar.
    const t = await geladen(root);
    t.S.code = 'VSYN0002';
    const leeg = t.render();
    const u = uitgesteld(); t.opzet.lees.push({ uitgesteld: u });
    const p = t.ctx.jbcLaad();
    const tijdens = t.log.html;
    u.los({ status: 200, body: dto({ verschillen: [], onbekenden: [], documenten: [], beoordelingen: { status: 'BESCHIKBAAR', lijst: [] }, extra: {
      platform_structuur: { herkomst: 'PLATFORMREGISTER_HANDMATIG', entiteiten: [{ entiteit_id: 'X', naam: 'Klant Twee BV', kvk: null, kvk_status: 'NIET_VASTGELEGD', rol: null }], niet_vastgelegd: [] },
      bron_structuur: { entiteiten: [], relaties: [], consolidatiekring: [], verkoopperimeter: [] } } }) });
    await p;
    check(!leeg.includes('Alfa Holding') && !tijdens.includes('Alfa Holding') && t.gets()[1].url === LEES_PAD + 'VSYN0002' && t.log.html.includes('Klant Twee BV') && !t.log.html.includes('Alfa Holding'), 'geen cachehergebruik tussen klanten');
  }
  {
    // Rolwissel na laden (begin of later): oude brondata en motivatie verdwijnen direct.
    const t = await geladen(root, BEG);
    vulBesluit(t);
    t.S.rol = 'koper';
    const k = t.render();
    t.S.rol = 'tussenpersoon';
    const terug = t.render();
    check(k === '' && t.ctx.JBC.besluit === null && !terug.includes('Alfa Holding') && terug.includes('Broncontrole starten') && t.log.requests.length === 1, 'rolwissel wist brondata en motivatie; terugwisselen toont geen oude data en laadt niet vanzelf');
  }

  // 14. Late POST-antwoord na scopewissel: niets tonen, niets laden, niets herhalen.
  for (const [naam, wissel] of [
    ['andere klant', (S) => { S.code = 'TSYN0002'; }],
    ['schermwissel', (S) => { S.screen = 'summary'; }],
  ]) {
    const t = await geladen(root, BEG);
    vulBesluit(t);
    const u = uitgesteld(); t.opzet.beoordeling.push({ uitgesteld: u });
    const p = t.ctx.jbcVerstuurBesluit();
    wissel(t.S); t.render();
    u.los(succes()); await p; await wacht(5);
    const html = t.render();
    check(t.ctx.JBC.melding === null && t.ctx.JBC.besluit === null && t.ctx.JBC.data === null && !html.includes('Beoordeling vastgelegd') && t.gets().length === 1 && t.posts().length === 1, 'laat POST-antwoord na ' + naam + ' verschijnt niet en laadt niets');
  }

  // 15. Niet-opgeslagen formulierinvoer blijft intact bij laden, verversen en vastleggen.
  {
    const t = laad(root, BEG);
    t.els.df_rechtsvorm = { value: 'NV (getypt, niet opgeslagen)' };
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcLaad();
    vulBesluit(t);
    t.opzet.beoordeling.push(succes()); t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcVerstuurBesluit();
    check(t.log.renders >= 4 && t.els.df_rechtsvorm.value === 'NV (getypt, niet opgeslagen)' && t.S.data.juridisch_rechtsvorm === 'BV' && t.log.saveCurrent === 0, 'niet-opgeslagen formulierinvoer overleeft hertekenen, zonder stille opslag');
  }
  {
    // Verversen behoudt de motivatie (zelfde scope), maar de bevestiging moet opnieuw.
    const t = await geladen(root, BEG);
    vulBesluit(t);
    t.opzet.lees.push({ status: 200, body: dto({ rol: 'begeleider' }) });
    await t.ctx.jbcLaad();
    const b = t.ctx.JBC.besluit;
    check(b && b.reden === 'Gecontroleerd in het KvK-uittreksel, pagina 3.' && b.beslissing === 'BEVESTIGD' && b.bevestigd === false && t.posts().length === 0 && t.log.html.includes('Gecontroleerd in het KvK-uittreksel'), 'verversen: motivatie behouden, bevestiging opnieuw vereist, niets verstuurd');
    t.opzet.lees.push({ status: 503, body: { error: 'x' } });
    await t.ctx.jbcLaad();
    await t.ctx.jbcVerstuurBesluit();
    check(t.posts().length === 0 && t.ctx.JBC.besluit.reden === 'Gecontroleerd in het KvK-uittreksel, pagina 3.', 'na mislukt verversen geen POST zonder geladen controle; motivatie behouden');
  }

  // 16. Rendergrootte begrensd met zichtbare melding.
  {
    const verschillen = Array.from({ length: 40 }, (_, i) => ({ ...VERSCHIL, id: 'ENTITEIT_ONTBREEKT_OP_PLATFORM:naam:v' + i, omschrijving: 'Verschil nummer ' + i + '.' }));
    const documenten = Array.from({ length: 60 }, (_, i) => ({ bron_document_id: 'D' + i, bestandsnaam: 'doc' + i + '.pdf', inhoud_hash: 'c'.repeat(64), versie: 1, document_status: 'BRUIKBAAR', methode: 'pdf_direct', juridisch_voorstel: 'NIET_AANWEZIG' }));
    const t = await geladen(root, {}, { verschillen, documenten });
    check(t.log.html.includes('30 van 40 verschillen getoond') && t.log.html.includes('50 van 60 documenten getoond') && t.log.html.includes('niet volledig') && !t.log.html.includes('Verschil nummer 35') && !t.log.html.includes('doc55.pdf'), 'begrensde weergave meldt expliciet dat niet alles getoond is');
  }

  // 17. Geen betaalde AI of andere externe aanroep in de hele suite.
  check(alleUrls.length > 0 && alleUrls.every((u) => u.indexOf(LEES_PAD) === 0), 'alle verzoeken in deze suite gaan uitsluitend naar de juridische broncontrole-routes (geen AI, geen andere API)');

  return res;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiLegalStructureUiChecks(root);
  res.forEach((r) => console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg));
  const fout = res.filter((r) => !r.ok).length;
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' checks gefaald.' : '\nAlle ' + res.length + ' checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
