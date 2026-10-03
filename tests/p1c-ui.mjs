#!/usr/bin/env node
// P1C (N-95, 3 okt 2026) — lokale UI-test voor de minimale promotie-UI en de eigen trajectdoorgang.
// Geen netwerk, geen browser, geen node_modules: draait de zuivere P1C-functies uit adv.html en
// mna/04-begeleider-dashboard.js in node:vm, plus statische bewaking van de UI-glue. Alle gegevens
// hieronder zijn synthetisch.
//
// Gebruik: node tests/p1c-ui.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 17).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const WHITELIST = [PROD, STAGING];

const QUOTE = {
  ok: true, pakket_verplicht: true, fee_vrijgesteld: false, test_boeking: false, sector: 'mkb',
  pakketten: [{ pakket: 'workflow', label: 'Workflow', bedrag: 101 }, { pakket: 'slim', label: 'Slim', bedrag: 1234.5 }, { pakket: 'compleet', label: 'Compleet', bedrag: 303 }],
};
const SECTOREN = { mkb: 'MKB', zorg: 'Zorg' };

function knip(src, van, tot, naam) {
  const a = src.indexOf(van), b = src.indexOf(tot);
  if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
  return src.slice(a, b);
}

function laadAdv(root) {
  const html = fs.readFileSync(path.join(root, 'adv.html'), 'utf8');
  const pure = knip(html, '// P1C-ADV-PURE-BEGIN', '// P1C-ADV-PURE-END', 'adv.html');
  const ctx = vm.createContext({ URLSearchParams });
  vm.runInContext(pure, ctx, { filename: 'adv.html#P1C-ADV-PURE' });
  return { ctx, html, pure };
}

function laadMna(root) {
  const src04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const slice = knip(src04, '// N115-PURE-BEGIN', '// N115-PURE-END', 'mna/04');
  knip(slice, '// P1C-PURE-BEGIN', '// P1C-PURE-END', 'mna/04 P1C');
  const status = [src04.match(/^var KM_STATUS_LABEL=.*$/m), src04.match(/^var KM_STATUS_KLEUR=.*$/m)];
  const esc = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8').match(/^function esc\(s\)\{.*\}$/m);
  if (!status[0] || !status[1] || !esc) throw new Error('KM_STATUS_* of esc() niet gevonden');
  const ctx = vm.createContext({});
  vm.runInContext([esc[0], status[0][0], status[1][0], slice].join('\n'), ctx, { filename: 'mna/04#N115+P1C-PURE' });
  return { ctx, src04 };
}

const antwoord = (status, json) => ({ status, ok: status >= 200 && status < 300 && json && json.ok === true, json });

export async function draaiP1cUiChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });

  // ── A. adv.html: context lezen, adresbalk opschonen, bekende worker ──
  try {
    const { ctx: a, html, pure } = laadAdv(root);
    const lees = (s) => JSON.parse(JSON.stringify(a.p1cLeesContext(s)));
    check(a.p1cLeesContext('') === null && a.p1cLeesContext('?worker=' + encodeURIComponent(STAGING)) === null, 'zonder P1C-parameters geen context (gewone login ongewijzigd)');
    check(JSON.stringify(lees('?promotie=TTST0001&target=km_t1&worker=x')) === JSON.stringify({ soort: 'promotie', mandaat: 'TTST0001', target: 'km_t1' }), 'promotiecontext: mandaatcode + neutrale target-id');
    check(JSON.stringify(lees('?traject=MATST001')) === JSON.stringify({ soort: 'traject', traject: 'MATST001' }), 'trajectcontext: alleen het bestaande traject-id');
    check(['?promotie=TTST0001', '?target=t1', '?promotie=T%27%3E&target=t1', '?promotie=TTST0001&target=a/b', '?promotie=TTST0001&target=t1&traject=MATST001', '?traject=MA<x>', '?traject='].every((s) => lees(s).soort === 'ongeldig'),
      'onvolledige, gemengde of vreemd gevormde context → "ongeldig", nooit doorgezet');
    check(a.p1cSchoneUrl('/adv.html', '?promotie=TTST0001&target=t1&worker=' + encodeURIComponent(STAGING), WHITELIST) === '/adv.html?worker=' + encodeURIComponent(STAGING),
      'adresbalk: context weg, bekende staging-worker blijft');
    check(a.p1cSchoneUrl('/adv.html', '?traject=MATST001&worker=' + encodeURIComponent('https://evil.example'), WHITELIST) === '/adv.html'
      && a.p1cSchoneUrl('/adv.html', '?traject=MATST001', WHITELIST) === '/adv.html', 'adresbalk: onbekende worker of geen worker → alleen het pad');
    check(/var _WORKER_WHITELIST=\['https:\/\/kantoorinzicht\.marcel-bisschops\.workers\.dev','https:\/\/kantoorinzicht-staging\.marcel-bisschops\.workers\.dev'\];/.test(html)
      && /var WORKER=_WORKER_WHITELIST\.includes\(_WORKER_PARAM\)\?_WORKER_PARAM:/.test(html), 'adv.html houdt de bestaande worker-whitelist');
    check(/var P1C_CTX=p1cLeesContext\(location\.search\);\s*if\(P1C_CTX\)\{try\{history\.replaceState\(null,'',p1cSchoneUrl\(location\.pathname,location\.search,_WORKER_WHITELIST\)\);/.test(html),
      'context wordt bij laden gelezen en direct uit de adresbalk gehaald');
    check(!/localStorage|sessionStorage|document\.cookie|postMessage|indexedDB|sendBeacon/.test(html), 'adv.html: geen opslag, cookie, postMessage of beacon (token en context alleen in geheugen)');
    check(a.p1cMnaUrl('TNEW0001', STAGING, STAGING) === 'mna.html?code=TNEW0001&worker=' + encodeURIComponent(STAGING) && a.p1cMnaUrl('TNEW0001', PROD, STAGING) === 'mna.html?code=TNEW0001',
      'vervolglink naar mna.html: alleen de bekende staging-worker gaat mee');

    // ── B. Prijzen en keuze ──
    check(a.p1cQuoteGeldig(QUOTE) && !a.p1cQuoteGeldig(Object.assign({}, QUOTE, { pakketten: [] }))
      && !a.p1cQuoteGeldig(Object.assign({}, QUOTE, { pakketten: [{ pakket: 'slim', label: 'Slim', bedrag: '99' }] }))
      && !a.p1cQuoteGeldig(Object.assign({}, QUOTE, { pakketten: [{ pakket: 'slim', label: 'Slim' }] }))
      && !a.p1cQuoteGeldig(Object.assign({}, QUOTE, { test_boeking: undefined })) && !a.p1cQuoteGeldig({ ok: false }),
      'serverquote: alleen een volledig antwoord met numerieke serverbedragen telt (anders niets tonen of starten)');
    check(a.p1cBedragTekst(1234.5) === '€ 1.234,50' && a.p1cBedragTekst(0) === '€ 0,00', 'bedragen exact zoals de server ze opgeeft, Nederlands opgemaakt');
    check(!/bedrag\s*[:=]\s*\d|\b(?:99|149|249|499|999)\b/.test(pure.replace(/^\s*\/\/.*$/gm, '')), 'geen eigen prijzen of fees in de P1C-code');
    check(a.p1cBody(QUOTE, null, 'mkb', SECTOREN) === null, 'zonder expliciete pakketkeuze geen body (geen standaardpakket)');
    check(a.p1cBody(QUOTE, '', 'mkb', SECTOREN) === null, 'betaler (pakket_verplicht): "zonder pakket" wordt geweigerd');
    check(a.p1cBody(QUOTE, 'goud', 'mkb', SECTOREN) === null, 'onbekend pakket → geen body');
    check(JSON.stringify(a.p1cBody(QUOTE, 'slim', 'mkb', SECTOREN)) === JSON.stringify({ pakket: 'slim', sector: 'mkb' }), 'POST-body exact {pakket, sector}');
    const vrij = Object.assign({}, QUOTE, { pakket_verplicht: false, fee_vrijgesteld: true });
    check(JSON.stringify(a.p1cBody(vrij, '', 'zorg', SECTOREN)) === JSON.stringify({ pakket: null, sector: 'zorg' }) && a.p1cBody(vrij, null, 'zorg', SECTOREN) === null,
      'vrijstelling: "zonder pakket" alleen als uitdrukkelijke keuze');
    check(a.p1cBody(QUOTE, 'slim', '', SECTOREN) === null && a.p1cBody(QUOTE, 'slim', 'onbekend', SECTOREN) === null && a.p1cBody(QUOTE, 'slim', 'mkb', null) === null,
      'sector moet een bekende sector uit de sectorbron zijn; geen sectorlijst → niets');
    check(a.p1cStartSector(QUOTE, SECTOREN) === 'mkb' && a.p1cStartSector(Object.assign({}, QUOTE, { sector: null }), SECTOREN) === ''
      && a.p1cStartSector(Object.assign({}, QUOTE, { sector: 'onbekend' }), SECTOREN) === '', 'onbekende of ontbrekende sector → lege keuze, geen stille fallback');
    const s = a.p1cSectoren({ ok: true, profielen: { mkb: { label: 'MKB' }, zorg: {}, 'X Y': { label: 'fout' } } });
    check(s && s.mkb === 'MKB' && s.zorg === 'zorg' && !('X Y' in s) && a.p1cSectoren({ ok: true, profielen: {} }) === null && a.p1cSectoren(null) === null,
      'sectoren uitsluitend uit de bestaande sectorprofielenbron');

    // ── C. Identiteit/afwijzing, dubbelklik, rolcorrecte doorgang ──
    check(a.p1cFoutMelding(403, { error: 'Log in als de adviseur die eigenaar is van dit mandaat om deze target te promoveren.', reden: 'identiteit_onbekend' }).startsWith('Log in als de adviseur')
      && a.p1cFoutMelding(403, { error: 'proef_verlopen', message: 'Uw proefperiode is verlopen.' }) === 'Uw proefperiode is verlopen.'
      && a.p1cFoutMelding(0, {}).includes('niets bevestigd') && a.p1cFoutMelding(409, {}).includes('al gepromoveerd'), 'serverweigering (identiteit, andere eigenaar, proef, limiet) wordt letterlijk en eerlijk getoond');
    let posts = 0;
    let st = { bezig: false };
    let los;
    const traag = () => { posts++; return new Promise((r) => { los = r; }); };
    const p1 = a.p1cBevestig(st, { pakket: 'slim', sector: 'mkb' }, traag);
    const p2 = await a.p1cBevestig(st, { pakket: 'slim', sector: 'mkb' }, traag);
    check(posts === 1 && p2.soort === 'genegeerd' && st.bezig === true, 'dubbelklik: tweede bevestiging tijdens een lopende POST wordt genegeerd');
    los(antwoord(403, { error: 'Trajectlimiet bereikt (1). Neem contact op via koersvoormorgen.nl voor uitbreiding.' }));
    const u1 = await p1;
    check(u1.soort === 'fout' && u1.melding.startsWith('Trajectlimiet bereikt') && st.bezig === false, 'limiet → foutmelding, geen succes, opnieuw proberen mogelijk');
    const u2 = await a.p1cBevestig(st, { pakket: 'slim', sector: 'mkb' }, async () => { posts++; return antwoord(200, { ok: true, traject_id: 'MASECRET', tussen_code: 'TNEW0001', koper_code: 'KSECRET1', traject_ref: 'TRSYNTH00001', vervolg: { rol: 'tussenpersoon', login_code: 'TNEW0001' } }); });
    check(posts === 2 && u2.soort === 'succes' && u2.code === 'TNEW0001' && u2.traject_ref === 'TRSYNTH00001' && !JSON.stringify(u2).includes('MASECRET') && !JSON.stringify(u2).includes('KSECRET1'),
      'retry na fout slaagt; succes gebruikt uitsluitend vervolg.login_code (begeleider) en traject_ref');
    const zonder = await a.p1cBevestig({ bezig: false }, { pakket: 'slim', sector: 'mkb' }, async () => antwoord(200, { ok: true, traject_id: 'MASECRET', traject_ref: 'TRSYNTH00001', vervolg: { rol: 'koper', login_code: 'KSECRET1' } }));
    check(zonder.soort === 'zonder_vervolg' && zonder.code === '', 'verkeerde rol in vervolg → geen doorgang (nooit koper- of verkoperscode)');
    check(a.p1cVervolgCode({ ok: true, traject_id: 'MASECRET' }) === '' && a.p1cVervolgCode({ ok: true, vervolg: { rol: 'tussenpersoon', login_code: 'T"><x' } }) === ''
      && a.p1cVervolgCode({ ok: false, vervolg: { rol: 'tussenpersoon', login_code: 'TNEW0001' } }) === '', 'geen terugval op traject_id; ongeldige code of ok:false → geen doorgang');
    const netwerk = await a.p1cBevestig({ bezig: false }, { pakket: 'slim', sector: 'mkb' }, async () => ({ status: 0, ok: false, json: {} }));
    const okZonderOk = await a.p1cBevestig({ bezig: false }, { pakket: 'slim', sector: 'mkb' }, async () => ({ status: 200, ok: false, json: {} }));
    check(netwerk.soort === 'fout' && okZonderOk.soort === 'fout', 'netwerkfout of 200 zonder ok:true → geen succes');
    check((await a.p1cBevestig({ bezig: false }, null, async () => { throw new Error('mag niet'); })).soort === 'genegeerd', 'zonder geldige keuze wordt er niets gepost');

    // Bestaand traject: eigen lijst, eigen code
    const lijst = [{ id: 'MAANDER1', tussen_code: 'TANDER01' }, { id: 'MATST001', tussen_code: 'TOWN0001' }, { id: 'MAZONDER' }];
    check(a.p1cEigenTrajectCode(lijst, 'MATST001') === 'TOWN0001', 'bestaand traject: exact id uit de eigen trajectenlijst → eigen begeleiderscode');
    check(a.p1cEigenTrajectCode(lijst, 'MAVREEMD') === '' && a.p1cEigenTrajectCode(lijst, 'MAZONDER') === '' && a.p1cEigenTrajectCode(lijst, 'matst001') === '' && a.p1cEigenTrajectCode(null, 'MATST001') === '',
      'niet in eigen lijst of zonder eigen code → geweigerd, geen terugval op het (verkopers)id');

    // Statische glue
    const code = html.replace(/^\s*\/\/.*$/gm, '');
    check(/function p1cPromotieApi\(ctx,method,body\)\{\s*var opt=\{method:method,headers:\{'x-tussen-key':ctx\.mandaat,'x-gebruiker-token':G\.token\},cache:'no-store'\};/.test(code)
      && /fetchMetTimeout\(WORKER\+'\/mna\/koopmandaat\/'\+encodeURIComponent\(ctx\.mandaat\)\+'\/target\/'\+encodeURIComponent\(ctx\.target\)\+'\/promoveer',opt,20000\)/.test(code),
      'GET/POST promoveer: x-tussen-key + x-gebruiker-token uit geheugen, no-store, met time-out, naar de whitelist-worker');
    check(/var res=await Promise\.all\(\[p1cPromotieApi\(ctx,'GET'\),p1cLaadSectoren\(\)\]\);/.test(code) && (code.match(/p1cPromotieApi\(ctx,'POST'/g) || []).length === 1
      && /ge\('p1c-bevestig'\)\.onclick=async function\(\)\{[\s\S]{0,200}if\(st\.bezig\|\|!b\|\|!ge\('p1c-akkoord'\)\.checked\)return;/.test(code),
      'POST uitsluitend vanuit de bevestigknop, pas na expliciete keuze en vinkje (nooit automatisch)');
    const vwFn = code.slice(code.indexOf('function renderVoorwaardenAcceptatie('), code.indexOf('function modChips('));
    check(/if\(!vw\.gv_akkoord\)\{ renderVoorwaardenAcceptatie\(vw\); return; \}\s*naInlogVervolg\(\);/.test(code) && /rd\.ok\)\{[\s\S]{0,200}\}\s*naInlogVervolg\(\);/.test(vwFn)
      && (code.match(/naInlogVervolg\(\);/g) || []).length === 2
      && /function naInlogVervolg\(\)\{\s*if\(P1C_CTX&&P1C_CTX\.soort==='promotie'\)return renderP1cPromotie\(\);/.test(code)
      && /\nrenderLogin\(\);\s*<\/script>/.test(html),
      'promotiestap pas na de bestaande login, verificatiecode en gebruiksvoorwaarden (pagina start altijd op het inlogscherm)');
    check(/G\.token='';G\.email='';P1C_CTX=null;/.test(code), 'uitloggen wist ook de context');
  } catch (e) {
    check(false, 'adv.html P1C-functies konden niet worden getest: ' + String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }

  // ── D. mna/04: begeleiderlinks en koperdoorgang (A/B/C) ──
  try {
    const { ctx: k, src04 } = laadMna(root);
    check(k.kmAdvContextUrl(STAGING, { promotie: 'TTST0001', target: 'km_t1' }) === 'adv.html?promotie=TTST0001&target=km_t1&worker=' + encodeURIComponent(STAGING)
      && k.kmAdvContextUrl(PROD, { promotie: 'TTST0001', target: 'km_t1' }) === 'adv.html?promotie=TTST0001&target=km_t1'
      && k.kmAdvContextUrl('https://evil.example', { traject: 'MATST001' }) === 'adv.html?traject=MATST001' && k.kmAdvContextUrl(PROD, {}) === '',
      'begeleider: promotie/traject openen via adv.html-context; alleen de bekende staging-worker gaat mee');
    check(!/\/promoveer',\{method:'POST'/.test(src04) && !/mna\.html\?code='\+esc\(t\.gepromoveerd_naar_traject_id\)/.test(src04),
      'mna/04 post niet meer zonder identiteit/pakket/sector en opent het traject-id niet meer als code (verkopersrol)');
    check(/class="btn-ghost km-promoveer-btn" href="'\+esc\(kmAdvContextUrl\(WORKER,\{promotie:S\.code,target:t\.id\}\)\)\+'" target="_blank" rel="noopener"/.test(src04)
      && /class="km-open-traject" href="'\+esc\(kmAdvContextUrl\(WORKER,\{traject:t\.gepromoveerd_naar_traject_id\}\)\)\+'" target="_blank" rel="noopener"/.test(src04),
      'promoveer- en open-traject-actie gebruiken de adv.html-context (nieuw tabblad, noopener)');

    const lek = ['GeheimeNaamBV', 'NOTITIE-C', 'BRON-C', 'MAGEHEIM', 'TRREF-B'];
    const basis = { id: 't1', naam: 'GeheimeNaamBV', sector: 'zorg', notities: 'NOTITIE-C', bron: 'BRON-C', gepromoveerd_naar_traject_id: 'MAGEHEIM', traject_ref: 'TRREF-B' };
    let h = k.kmKoperTargetHtml(Object.assign({}, basis, { status: 'gepromoveerd', vrijgave_status: 'afgeschermd' }), {});
    check(!h.includes('km-koper-traject-btn') && lek.every((x) => !h.includes(x)), 'A: afgeschermd (ook gepromoveerd) → geen doorgangsknop en geen B/C');
    h = k.kmKoperTargetHtml(Object.assign({}, basis, { status: 'in_gesprek', vrijgave_status: 'vrijgegeven' }), {});
    check(!h.includes('km-koper-traject-btn') && h.includes('GeheimeNaamBV') && !h.includes('NOTITIE-C') && !h.includes('MAGEHEIM'), 'B: vrijgegeven maar niet gepromoveerd → naam zichtbaar, geen doorgang, nooit C');
    h = k.kmKoperTargetHtml(Object.assign({}, basis, { status: 'gepromoveerd', vrijgave_status: 'vrijgegeven', traject_ref: null }), {});
    check(!h.includes('km-koper-traject-btn'), 'vrijgegeven + gepromoveerd zonder traject_ref → geen doorgang');
    h = k.kmKoperTargetHtml(Object.assign({}, basis, { id: 't"1', status: 'gepromoveerd', vrijgave_status: 'vrijgegeven' }), {});
    check(h.includes('km-koper-traject-btn') && h.includes('data-id="t&quot;1"') && h.includes('TRREF-B') && !h.includes('NOTITIE-C') && !h.includes('BRON-C') && !h.includes('MAGEHEIM'),
      'C: vrijgegeven + gepromoveerd + traject_ref → "Open eigen traject" (alleen target-id, ge-escaped), nooit C-velden');
    check(k.kmKoperVervolgUrl({ ok: true, traject_ref: 'TR1', vervolg: { rol: 'koper', login_code: 'KNEW0001' } }, STAGING) === 'mna.html?code=KNEW0001&worker=' + encodeURIComponent(STAGING)
      && k.kmKoperVervolgUrl({ ok: true, vervolg: { rol: 'koper', login_code: 'KNEW0001' } }, PROD) === 'mna.html?code=KNEW0001', 'koperdoorgang: eigen kopercode uit de backend');
    check(['tussenpersoon', 'verkoper', 'begeleider', undefined].every((rol) => k.kmKoperVervolgUrl({ ok: true, vervolg: { rol, login_code: 'TXXX0001' } }, PROD) === '')
      && k.kmKoperVervolgUrl({ ok: true, traject_id: 'MAGEHEIM', vervolg: { rol: 'koper' } }, PROD) === '' && k.kmKoperVervolgUrl({ ok: false, vervolg: { rol: 'koper', login_code: 'KNEW0001' } }, PROD) === ''
      && k.kmKoperVervolgUrl({ error: 'Er is (nog) geen vrijgegeven traject beschikbaar voor deze target.' }, PROD) === '' && k.kmKoperVervolgUrl({ ok: true, vervolg: { rol: 'koper', login_code: 'K1"><' } }, PROD) === '',
      'koperdoorgang: andere rol, ontbrekende/ongeldige code, stale/404 → geen doorgang en geen terugval op een id');
    const koper = src04.slice(src04.indexOf("document.querySelectorAll('.km-koper-traject-btn')"), src04.indexOf("var nieuwBtn=ge('km-nieuw-target-btn')"));
    check(koper.length > 200 && /\/target\/'\+encodeURIComponent\(btn\.dataset\.id\)\+'\/traject',\{method:'GET',cache:'no-store'\},15000\)/.test(koper)
      && /var url=r\.ok\?kmKoperVervolgUrl\(d,WORKER\):'';\s*if\(url\)\{location\.assign\(url\);return;\}/.test(koper) && !/localStorage|sessionStorage|console\./.test(koper),
      'koperklik: GET …/traject met no-store; alleen een gevalideerde koper-URL navigeert; niets opgeslagen');
  } catch (e) {
    check(false, 'mna/04 P1C-functies konden niet worden getest: ' + String((e && e.message) || e));
  }

  // ── E. Handleiding ──
  const hl = fs.readFileSync(path.join(root, 'mna/08-handleiding.js'), 'utf8');
  check(/Verder als begeleider/.test(hl) && /Open eigen traject/.test(hl), 'handleiding (mna/08) beschrijft de promotiebevestiging en de koperdoorgang');
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiP1cUiChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' P1C-UI-checks gefaald.' : '\nAlle ' + res.length + ' P1C-UI-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
