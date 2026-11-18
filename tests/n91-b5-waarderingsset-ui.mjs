#!/usr/bin/env node
// #91 B5 frontend (18-11-2026): waarderingsset-paneel en expliciete overname in het dealvoorstel.
// Draait de ECHTE mna/16-financieel.js in node:vm met een fetch-stub in de vorm van worker/46 (wsDto/berekenWaarderingsset).
// Geen netwerk, geen browser, geen AI. Gebruik: node tests/n91-b5-waarderingsset-ui.mjs (vanuit de repo-root).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src16 = fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8');
let ok = 0, fout = 0;
const t = (naam, c) => { if (c) { ok++; console.log('  ✓ ' + naam); } else { fout++; console.log('  ✗ ' + naam); } };

const posts = [];
const els = {};
const el = (id, v) => (els[id] = { value: v, attrs: {}, setAttribute(k, x) { this.attrs[k] = String(x); }, getAttribute(k) { return this.attrs[k]; } });
const ctx = vm.createContext({ S: { code: 'SYNV', rol: 'koper', fase: 0, _bgKey: 'x' }, FASES: [{ id: 'financieel', dataFields: [] }], WORKER: 'https://w.test',
  isVerkoper: () => ctx.S.rol === 'verkoper', isTussen: () => ctx.S.rol === 'tussenpersoon', setTimeout: () => {},
  fetchMetTimeout: (url, opts) => { posts.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null }); return new Promise(() => {}); },
  renderApp: () => {}, ge: (id) => els[id] || null, window: {}, document: { querySelectorAll: () => [], getElementById: (id) => els[id] || null } });
vm.runInContext(src16, ctx);
Object.assign(ctx, ctx.window);

const k = '<img src=x onerror=alert(1)>';
const jaren = [{ jaar: 2024, gerapporteerd: { ebitda: 124000 }, genormaliseerd: { omzet: 500000, ebitda: 120000 }, normalisatie_totaal: -4000, kpi: { brutomarge_pct: 100, ebitda_marge_pct: 24, omzetgroei_pct: null, omzet_per_fte: 125000, ebitda_per_fte: 30000 } }];
const ws = (extra) => ({ id: 'WS1', versie: 2, status: 'goedgekeurd', grondslag: 'genormaliseerde_ebitda', grondslag_jaar: 2024, grondslag_bedrag: null, grondslag_reden: '', multiple_laag: 4, multiple_hoog: 6,
  multiple_onderbouwing: k, transactiekosten_pct: 2, scenario: k, peildatum: '2026-11-18', motivering: 'ok', goedgekeurd_door: 'Begeleider', goedgekeurd_op: 1, bron_controle: 'x', waardering_id: 'W1', rev: 3, ...extra });
const ber = (extra) => ({ grondslag_bedrag: 120000, multiple_midden: 5, ondernemingswaarde: { laag: 480000, midden: 600000, hoog: 720000 }, aandelenwaarde: { laag: 400000, midden: 508000, hoog: 615600 }, bridge_aftrek: 70000, ontbreekt: [], verouderd: false, ...extra });
ctx.FIN.status = 'ok';
ctx.FIN.data = { ok: true, jaren, normalisaties: [], equity_posten: [], equity_bridge: null, prognose: { status: 'geen', basis_gewijzigd: false, aannames: [], fte: {}, rev: 0, jaren: [] }, waarderingsset: ws(), waardering_berekend: ber() };

console.log('Rolgrens');
for (const rol of ['koper', 'verkoper']) {
  ctx.S.rol = rol; ctx.FIN.scope = ctx.finScope ? ctx.finScope() : ctx.FIN.scope;
  t(rol + ' ziet geen waarderingsset', !/Waarderingsset/.test(ctx.finWsHtml(ctx.FIN.data)) && !/Waarderingsset \(centraal/.test(ctx.renderFinancieleAnalyse('financieel') || ''));
}
ctx.S.rol = 'tussenpersoon'; ctx.FIN.scope = ctx.finScope ? ctx.finScope() : ctx.FIN.scope;

console.log('Paneel begeleider');
let h = ctx.renderFinancieleAnalyse('financieel');
t('paneel zichtbaar in de financiële analyse', /Waarderingsset \(centraal/.test(h));
t('servertekst geëscapet', !/<img src=x/.test(h));
t('EV en aandelenwaarde laag/midden/hoog', /€ 480\.000 \/ € 600\.000 \/ € 720\.000/.test(h) && /€ 400\.000 \/ € 508\.000 \/ € 615\.600/.test(h));
t('goedgekeurde set: geen goedkeurknop, wel nieuwe versie', !/finWsKeurGoed/.test(h) && /Nieuwe versie maken/.test(h));
ctx.FIN.data.waardering_berekend = ber({ verouderd: true });
t('verouderd zichtbaar gemarkeerd', /VEROUDERD/.test(ctx.finWsHtml(ctx.FIN.data)));
ctx.FIN.data.waarderingsset = ws({ status: 'concept' }); ctx.FIN.data.waardering_berekend = ber({ aandelenwaarde: null });
h = ctx.finWsHtml(ctx.FIN.data);
t('concept: goedkeuren met motivering', /finWsKeurGoed\(\)/.test(h) && /id="fin-ws-mo"/.test(h) && /Concept bewerken/.test(h));
t('onvolledige bridge: geen aandelenwaarde verzonnen', /equity bridge nog niet volledig goedgekeurd/.test(h));

console.log('Opslaan en goedkeuren (payload)');
ctx.finWsOpen();
ctx.finWsZet('grondslag', 'handmatig'); ctx.finWsZet('grondslag_bedrag', '1.250.000'); ctx.finWsZet('grondslag_reden', 'reden');
ctx.finWsZet('multiple_laag', '4,5'); ctx.finWsZet('multiple_hoog', '6'); ctx.finWsZet('transactiekosten_pct', '2,5');
t('formulier toont handmatige velden', /Reden voor een handmatige grondslag/.test(ctx.finWsHtml(ctx.FIN.data)));
ctx.finWsBewaar();
let p = posts[posts.length - 1];
t('POST naar /waardering', /\/mna\/financieel\/waardering$/.test(p.url));
t('getallen correct geparsed (1.250.000 / 4,5 / 2,5) en rev van concept', p.body.grondslag_bedrag === 1250000 && p.body.multiple_laag === 4.5 && p.body.multiple_hoog === 6 && p.body.transactiekosten_pct === 2.5 && p.body.rev === 3);
ctx.FIN.bezig = false;
els['fin-ws-mo'] = { value: 'Akkoord na bespreking' };
ctx.finWsKeurGoed();
p = posts[posts.length - 1];
t('goedkeuren stuurt rev + motivering', /\/waardering\/goedkeuren$/.test(p.url) && p.body.rev === 3 && p.body.motivering === 'Akkoord na bespreking');
ctx.FIN.bezig = false;

console.log('Dealvoorstel: expliciete overname');
t('concept wordt niet aangeboden', /nog niet goedgekeurd/.test(ctx.finWsHintHtml({ waarderingsset: ws({ status: 'concept' }), waardering_berekend: ber() })) && !/finWsNeemOver/.test(ctx.finWsHintHtml({ waarderingsset: ws({ status: 'concept' }), waardering_berekend: ber() })));
t('verouderd wordt niet aangeboden', !/finWsNeemOver/.test(ctx.finWsHintHtml({ waarderingsset: ws(), waardering_berekend: ber({ verouderd: true }) })));
t('zonder grondslag niet aangeboden', !/finWsNeemOver/.test(ctx.finWsHintHtml({ waarderingsset: ws(), waardering_berekend: ber({ grondslag_bedrag: null }) })));
t('zonder set: niets', ctx.finWsHintHtml({}) === '');
h = ctx.finWsHintHtml({ waarderingsset: ws(), waardering_berekend: ber() });
t('goedgekeurd: knop met grondslag, midden-multiple en tk', /data-g="120000"/.test(h) && /data-m="5"/.test(h) && /data-tk="2"/.test(h) && !/<img src=x/.test(h));
for (const [id, v] of [['dv-ebitda-bewezen', '0'], ['dv-mult-basis', '0'], ['dv-mult-boven', '7'], ['dv-txkosten', '0']]) el(id, v);
const knop = { getAttribute: (a) => ({ 'data-g': '120000', 'data-m': '5', 'data-tk': '2', 'data-v': '2' })[a] };
ctx.finWsNeemOver(knop);
t('velden overgenomen', els['dv-ebitda-bewezen'].value === '120000' && els['dv-mult-basis'].value === '5' && els['dv-txkosten'].value === '2');
t('bron gemarkeerd', els['dv-ebitda-bewezen'].attrs['data-bron'] === 'waarderingsset-v2' && els['dv-mult-basis'].attrs['data-bron-waarde'] === '5');
t('bovengrens-multiple ongewijzigd', els['dv-mult-boven'].value === '7' && !els['dv-mult-boven'].attrs['data-bron']);

console.log('\n' + ok + '/' + (ok + fout) + ' geslaagd');
process.exit(fout ? 1 : 0);
