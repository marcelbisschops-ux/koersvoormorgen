// KVM-005 (26-11-2026): bedragvelden tonen na verlaten de NL-notatie, terwijl de opgeslagen waarde de getypte tekst blijft.
// Vergelijkingen op bedragvelden gaan op getalwaarde ("1250000" = "€ 1.250.000"), andere velden blijven letterlijk.
// Draait de ECHTE functies uit mna/01 (sectorprofielen), mna/02 (bedragveldblok, autoFillFromExtraction/applyOrConflict,
// getDataForFase) en mna/09 (fbcLokaleAfwijking) in node:vm. Synthetisch, geen netwerk, geen browser.
// Gebruik: node tests/kvm005-geldvelden.mjs (vanuit de repo-root).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { kvm005Blok } from './lib-kvm005-geldvelden.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lees = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const knip = (src, begin, eind) => { const a = src.indexOf(begin), b = a < 0 ? -1 : src.indexOf(eind, a); if (a < 0 || b < 0) throw new Error('niet gevonden: ' + begin); return src.slice(a, b + eind.length); };
const regel = (src, re, naam) => { const m = src.match(re); if (!m) throw new Error('niet gevonden: ' + naam); return m[0]; };
const src02 = lees('mna/02-state-opslag-documenten.js'), src06 = lees('mna/06-schermen.js'), src09 = lees('mna/09-financiele-broncontrole.js');

// --- 1. Bedragveld-herkenning uit de bestaande velddefinities (alle sectorprofielen) ---
const c01 = { document: { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } }, console, navigator: {}, location: { href: '', search: '' },
  URLSearchParams, setTimeout() {}, fetch() {}, localStorage: { getItem() { return null; }, setItem() {} } };
c01.window = c01; vm.createContext(c01); vm.runInContext(lees('mna/01-config-sectorprofielen.js'), c01);
vm.runInContext(knip(src02, 'var GROEPSDOC_BEDRAGVELDEN = {', '\n};\n') + '\n' + kvm005Blok() + '\n' + knip(lees('mna/03-rekenkern-waardering.js'), 'function parseGeld(s){', '\n}\n'), c01);
const geld = [], nietGeld = [];
for (const [sector, p] of Object.entries(c01.SECTOR_PROFIELEN)) for (const f of p.fases || []) for (const df of f.dataFields || []) {
  if (df.header) continue; (c01.isGeldVeld(f.id, df) ? geld : nietGeld).push(sector + ':' + f.id + '_' + df.id + ' | ' + df.label);
}
ok(geld.length >= 40, 'bedragvelden afgeleid uit de velddefinities (' + geld.length + ' over alle sectoren)', geld.length);
ok(!geld.some((g) => /%/.test(g.split(' | ')[1])), 'geen veld met een %-label als bedragveld herkend', geld.filter((g) => /%/.test(g)));
for (const k of ['financieel_omzet1', 'financieel_omzet3', 'financieel_ebitda', 'financieel_ebitdaNorm', 'financieel_wip', 'financieel_debiteuren', 'financieel_partnerBel', 'financieel_normalisatie', 'financieel_eigenVermogen'])
  ok(geld.some((g) => g.split(' | ')[0].endsWith(':' + k)), k + ' is een bedragveld');
for (const k of ['financieel_ebitdaMarge', 'financieel_recurring', 'financieel_debiteurenOud', 'commercieel_aantalKlanten', 'commercieel_top1pct'])
  ok(!geld.some((g) => g.split(' | ')[0].endsWith(':' + k)), k + ' is geen bedragveld (blijft letterlijk)');

// --- 2. Getalwaarde-vergelijking en eenduidigheid ---
const G = c01;
ok(G.geldGelijk('1250000', '€ 1.250.000') && G.geldGelijk('1.250.000', '1250000') && G.geldGelijk('€ -200.000', '-200000') && G.geldGelijk('12500,50', '€ 12.500,50'), 'geldGelijk: zelfde bedrag in verschillende notatie is gelijk');
ok(!G.geldGelijk('1250000', '1300000') && !G.geldGelijk('-200000', '200000'), 'geldGelijk: ander bedrag of ander teken is ongelijk');
ok(!G.geldGelijk('1250.5', '12505') && !G.geldGelijk('12.50', '1250') && !G.geldGelijk('ca. 1,2 mln', '1,2'), 'geldGelijk: dubbelzinnige of niet-zuivere bedragtekst nooit gelijkgesteld (nooit gokken)');
ok(G.veldWaardeGelijk('financieel_omzet3', '1250000', '€ 1.250.000') && !G.veldWaardeGelijk('commercieel_aantalKlanten', '1250', '1.250'), 'veldWaardeGelijk: bedragveld op getalwaarde, ander veld letterlijk');

// --- 3. Weergave bij verlaten/focus: opgeslagen waarde blijft de getypte tekst ---
const veld = (v) => ({ value: v, dataset: {} });
const blur = (ruw) => { const el = veld(ruw); G.geldVeldBlur(el); return el; };
const gevallen = [['1250000', '€ 1.250.000'], ['1.250.000', '€ 1.250.000'], ['12500,5', '€ 12.500,50'], ['-50000', '€ -50.000'], ['(5.000)', '€ -5.000'], ['€ 1.250.000', '€ 1.250.000']];
for (const [ruw, w] of gevallen) {
  const el = blur(ruw);
  ok(el.value.replace(/ /g, ' ') === w && G.veldInvoer(el) === ruw && Math.abs(G.parseGeld(el.value) - G.parseGeld(ruw)) < 1e-9,
    'verlaten "' + ruw + '" toont ' + w + ', opgeslagen blijft "' + ruw + '" (terugleesproef klopt)', [el.value, G.veldInvoer(el)]);
}
for (const ruw of ['1250.5', 'ca. 1,2 mln', '0', '', 'n.v.t.', '12.50.000'])
  ok(blur(ruw).value === ruw, 'niet eenduidig of geen bedrag ("' + ruw + '"): veld blijft ongewijzigd');
{ const el = blur('1250000'); G.geldVeldFocus(el); ok(el.value === '1250000' && G.veldInvoer(el) === '1250000' && el.dataset.geldWeergave === undefined, 'focus zet de getypte tekst terug voor bewerken'); }
{ const el = blur('1250000'); el.value = '999'; ok(G.veldInvoer(el) === '999', 'een andere waarde in het veld (getypt of door code gezet) wint van de bewaarde tekst'); }

// --- 4. Conflictdetectie in de echte autoFillFromExtraction/applyOrConflict ---
const delen = [
  regel(src02, /^function isKoper\(\)\{.*\}$/m, 'isKoper'), regel(src02, /^function isTussen\(\)\{.*\}$/m, 'isTussen'),
  knip(src02, 'function isGroepsniveauVeld(key){', '\n}\n'), regel(src02, /^function doelData\(key\)\{.*\}$/m, 'doelData'),
  knip(src02, 'function cleanGetal(v) {', '\n}\n'), knip(src02, 'var AI_VELD_MAP = {', '\n}\n'),
  knip(src02, 'function autoFillFromExtraction(faseId, velden, forceOverwrite, docNaam, entiteitId, opties) {', '\n}\n'),
  knip(src02, 'var GROEPSDOC_BEDRAGVELDEN = {', '\n};\n'),
  knip(src02, 'function _autoFillFromExtractionBody(faseId, velden, forceOverwrite, docNaam, opties) {', '\n}\n'),
  regel(src02, /^var DOC_SOORT_LABEL = [\s\S]*?(?=^function _autoFillFromExtractionBody\()/m, '#73-hulpblok'),
  regel(src02, /^function veldBron\(key\)\{[\s\S]*?\n\}/m, 'veldBron'),
  regel(src02, /^function getDataForFase\(id\)\{[\s\S]*?\n\}/m, 'getDataForFase'),
];
const FASES = [{ id: 'financieel', title: 'Financieel', items: [], redflags: [], dataFields: [{ id: 'omzet3', label: 'Jaaromzet jaar 3' }, { id: 'debiteuren', label: 'Debiteuren totaal' }, { id: 'wip', label: 'Onderhanden werk / OHW' }, { id: 'ebitda', label: 'EBITDA (€)' }] },
  { id: 'commercieel', title: 'Commercieel', items: [], redflags: [], dataFields: [{ id: 'aantalKlanten', label: 'Aantal actieve klanten' }] }];
const ctx = vm.createContext({ console, FASES, renderApp() {}, markDirty() {}, schedSave() {}, toast() {}, S: null });
ctx.window = ctx;
vm.runInContext(delen.concat(kvm005Blok()).join('\n\n'), ctx);
const nieuweS = (data) => ({ code: 'VSYN0001', rol: 'verkoper', traject: { status: 'actief' }, data, _groepData: data, dataPerEntiteit: {}, _actieveEntiteit: null, _entiteiten: [],
  _opy: {}, _epy: {}, _opySlotJaar: {}, _conflicts: [], _userEdited: {}, _docSource: {}, _docFragment: {}, _docJaar: {}, _docSoort: {}, notities: {}, checked: {} });
const upload = (bestaand, nieuw) => { ctx.S = nieuweS({ financieel_debiteuren: bestaand }); ctx.autoFillFromExtraction('financieel', { debiteuren: nieuw }, false, 'syn-jaarrekening.pdf', ''); return ctx.S; };
{ const s = upload('€ 1.250.000', '1250000'); ok(s._conflicts.length === 0 && s.data.financieel_debiteuren === '€ 1.250.000', 'conflict: "€ 1.250.000" bestaand vs "1250000" uit document = gelijk, geen keuzevenster, opgeslagen tekst ongewijzigd', s._conflicts); }
{ const s = upload('1.250.000', '1.250.000'); ok(s._conflicts.length === 0, 'conflict: letterlijk gelijk blijft gelijk (ongewijzigd gedrag)'); }
{ const s = upload('€ 1.250.000', '1300000'); ok(s._conflicts.length === 1 && s._conflicts[0].huidig === '€ 1.250.000' && s._conflicts[0].nieuw === '1300000' && s.data.financieel_debiteuren === '€ 1.250.000', 'conflict: ander bedrag geeft nog steeds een keuze en overschrijft niets', s._conflicts.map((c) => [c.huidig, c.nieuw])); }
{ const s = upload('12505', '1250.5'); ok(s._conflicts.length === 1, 'conflict: dubbelzinnige lezing ("1250.5" vs "12505") geeft een keuze, nooit stil gelijk'); }

// --- 5. Groepssom-vlag (auto:true) blijft bewaard ---
const auto = (opgeslagen, autoWaarde, bewerkt) => { const d = { financieel_omzet3: opgeslagen }; ctx.S = nieuweS(d); ctx.S._groepAuto = { financieel_omzet3: autoWaarde }; if (bewerkt) ctx.S._userEdited.financieel_omzet3 = true;
  return ctx.getDataForFase('financieel').omzet3; };
ok(auto('1250000', '1250000').auto === true, 'groepssom: ongewijzigde bruto som houdt auto:true (ongewijzigd gedrag)');
ok(auto('1250000', 1250000).auto === true && auto('1.250.000', '1250000').auto === true, 'groepssom: zelfde som in andere notatie of als getal houdt auto:true');
ok(auto('1300000', '1250000').auto !== true && auto('1250000', '1250000', true).auto !== true, 'groepssom: ander bedrag of handmatig bewerkt is geen automatische som meer');
ok(auto('1250000', '1250000').value === '1250000', 'groepssom: de opgeslagen waarde gaat onveranderd mee');

// --- 6. Geen valse lokale afwijking in de financiële broncontrole ---
const c09 = vm.createContext({ console, FASES, S: null, FBC: {}, ge: (id) => c09.dom[id] || null, dom: {} });
vm.runInContext([knip(src09, 'function fbcVeldDef(veldId){', '\n}\n'), knip(src09, 'function fbcLokaleWaarde(veldId){', '\n}\n'), knip(src09, 'function fbcLokaleAfwijking(veldId,serverWaarde){', '\n}\n'), knip(src02, 'var GROEPSDOC_BEDRAGVELDEN = {', '\n};\n'), kvm005Blok()].join('\n'), c09);
const afw = (opgeslagen, domTekst, server, blurIt) => { c09.S = nieuweS({ financieel_debiteuren: opgeslagen }); c09.S._pendingSave = null; const el = veld(domTekst); if (blurIt) c09.geldVeldBlur(el); c09.dom = { df_debiteuren: el };
  return c09.fbcLokaleAfwijking('debiteuren', server); };
ok(afw('1250000', '1250000', '1250000', true) === null, 'broncontrole: veld toont "€ 1.250.000" na verlaten, opgeslagen en server 1250000 → geen afwijking');
ok(afw('1.250.000', '1.250.000', '1250000', false) === null, 'broncontrole: zelfde bedrag in andere notatie → geen valse afwijking');
ok(typeof afw('1250000', '1300000', '1250000', false) === 'string', 'broncontrole: echt andere invoer in het veld wordt nog steeds gemeld');
ok(typeof afw('1250000', '1250000', '1300000', true) === 'string', 'broncontrole: server wijkt echt af → gemeld');

// --- 7. Statisch: alle invoerlezers gebruiken veldInvoer, rendering koppelt blur/focus alleen aan bedragvelden ---
ok(/var invoer=veldInvoer\(el\);/.test(src02) && /veldInvoer\(el\)===sv/.test(src02) && /nu=el\?veldInvoer\(el\)/.test(src02), 'mna/02: saveCurrent en de opslag-basisvergelijking lezen de getypte waarde (veldInvoer)');
ok(/veldInvoer\(domEl\)/.test(src06) && /isGeldVeld\(f\.id,df\)\)\?' data-geldveld="1" onfocus="geldVeldFocus\(this\)" onblur="geldVeldBlur\(this\)"/.test(src06), 'mna/06: opslaan leest veldInvoer; blur/focus alleen op bedragvelden');
const lezers = ['mna/09-financiele-broncontrole.js', 'mna/10-juridische-broncontrole.js', 'mna/13-transactiemodel.js', 'mna/14-im-review.js', 'mna/15-kolommenbalans.js', 'mna/16-financieel.js']
  .filter((f) => /bewaard\.push\(\[df\.id, ?el\.value\]\)/.test(lees(f)));
ok(lezers.length === 0, 'mna/09-16: bewaarde formulierinvoer gebruikt veldInvoer (getypte tekst, niet de weergave)', lezers);
const letterlijk = (src02.match(/_groepAuto\[[^\]]+\]===|existing===newVal|huidig===String\(c\.nieuw\)/g) || []);
ok(letterlijk.length === 0, 'mna/02: geen letterlijke tekstvergelijking meer op groepssom/conflict', letterlijk);

console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
