// KVM-014 stap 1 (gouden werkregel 59): de genormaliseerde EBITDA uit de financiële analyse is de bron voor de bewezen EBITDA
// in het dealvoorstel; het DD-veld is alleen een zichtbare, gemotiveerde terugval. Echte mna/16-functies in een vm-context
// met een minimale nagebootste pagina. Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
function el(id, value) {
  const a = {}, l = {};
  const o = { id, _v: value == null ? '' : String(value), get value() { return this._v; }, set value(v) { this._v = String(v); }, innerHTML: '', style: {}, getAttribute: (k) => (k in a ? a[k] : null), setAttribute: (k, v) => { a[k] = String(v); },
    addEventListener: (t, f) => { (l[t] = l[t] || []).push(f); }, fire: (t) => (l[t] || []).forEach((f) => f()), querySelector: () => null, insertAdjacentHTML() {} };
  return o;
}
async function opzet({ antwoord, maatschap = false, ddWaarde = 410000 }) {
  const dom = { 'dv-ebitda-bewezen': el('dv-ebitda-bewezen', ddWaarde), 'dv-ebitda-bron': el('dv-ebitda-bron'), 'dv-fin-hint': el('dv-fin-hint'), 'dv-maatschap-info': el('dv-maatschap-info') };
  const ctx = { console, Math, String, Number, JSON, Promise, isFinite, parseFloat,
    document: { getElementById: (id) => dom[id] || null, createElement: () => el('x') },
    S: { code: 'T1', rol: 'tussen' }, FASES: {}, isTussen: () => true, isMaatschap: () => maatschap };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8'), ctx);
  ctx.finHaal = () => Promise.resolve(antwoord);
  ctx.finDealvoorstelHint(dom['dv-fin-hint']);
  await new Promise((r) => setTimeout(r, 5));
  return { ctx, dom };
}
const jaar = (j, g) => ({ jaar: j, genormaliseerd: { ebitda: g }, gerapporteerd: { ebitda: g - 20000 } });
const basis = (extra) => ({ s: 200, d: { ok: true, jaren: [jaar(2024, 350000), jaar(2025, 432123.4)], normalisaties: [], prognose: { status: 'concept', jaren: [] }, ...extra } });

// 1. Centrale bron beschikbaar → veld = genormaliseerde EBITDA laatste jaar, herkomst zichtbaar, geen motivering nodig.
let { ctx, dom } = await opzet({ antwoord: basis() });
ok(dom['dv-ebitda-bewezen'].value === '432123', 'bewezen EBITDA = genormaliseerde EBITDA laatste gereed jaar (centrale bron, niet het DD-veld)', dom['dv-ebitda-bewezen'].value);
ok(/Bron: financiële analyse, genormaliseerde EBITDA 2025/.test(dom['dv-ebitda-bron'].innerHTML), 'herkomst zichtbaar onder het veld');
let st = ctx.finEbitdaBronStatus();
ok(st.fout === '' && /financiële analyse \(2025\)/.test(st.bron) && st.motivering === '', 'status: centrale bron, geen motivering nodig', st);
// 2. Adviseur wijkt af → handmatig, genereren geblokkeerd tot er een motivering is.
dom['dv-ebitda-bewezen'].value = '400000'; dom['dv-ebitda-bewezen'].fire('input');
st = ctx.finEbitdaBronStatus();
ok(st.bron === 'handmatig' && st.fout !== '', 'afwijkende waarde zonder motivering → handmatig en blokkerende melding', st);
ok(/Handmatige waarde/.test(dom['dv-ebitda-bron'].innerHTML) && /dv-ebitda-motivatie/.test(dom['dv-ebitda-bron'].innerHTML), 'afwijking zichtbaar met verplicht motiveringsveld');
dom['dv-ebitda-motivatie'] = el('dv-ebitda-motivatie', 'Koper rekent met lagere huurlast na verhuizing');
st = ctx.finEbitdaBronStatus();
ok(st.fout === '' && st.motivering === 'Koper rekent met lagere huurlast na verhuizing', 'met motivering → toegestaan, motivering wordt vastgelegd', st);
// 3. Geen gereed jaar → DD-veld blijft, zichtbaar als terugval, motivering verplicht.
({ ctx, dom } = await opzet({ antwoord: { s: 200, d: { ok: true, jaren: [] } } }));
st = ctx.finEbitdaBronStatus();
ok(dom['dv-ebitda-bewezen'].value === '410000' && st.bron === 'handmatig' && st.fout !== '' && /terugval/.test(dom['dv-ebitda-bron'].innerHTML), 'geen financiële analyse → DD-waarde blijft, zichtbaar als terugval, motivering verplicht', st);
// 4. Laden mislukt → zelfde veilige terugval (nooit stil het DD-veld als bron).
({ ctx, dom } = await opzet({ antwoord: { s: 503, d: { error: 'x' } } }));
ok(ctx.finEbitdaBronStatus().fout !== '', 'financiële analyse niet te laden → handmatig met verplichte motivering');
// 5. Maatschap zonder goedgekeurd ondernemersloon → geen centrale overname (anders ontbreekt de ondernemersloon-correctie).
({ ctx, dom } = await opzet({ antwoord: basis(), maatschap: true }));
ok(dom['dv-ebitda-bewezen'].value === '410000' && /ondernemersloon/.test(dom['dv-ebitda-bron'].innerHTML) && ctx.finEbitdaBronStatus().fout !== '', 'maatschap zonder goedgekeurde partnerbeloning-normalisatie → terugval met melding');
// 6. Maatschap mét goedgekeurde partnerbeloning in het laatste jaar → centrale bron, geen dubbele aftrek, maatschap-uitleg verborgen.
({ ctx, dom } = await opzet({ antwoord: basis({ normalisaties: [{ jaar: 2025, soort: 'partnerbeloning', status: 'goedgekeurd', bedrag: -180000 }] }), maatschap: true }));
ok(dom['dv-ebitda-bewezen'].value === '432123' && dom['dv-maatschap-info'].style.display === 'none' && ctx.finEbitdaBronStatus().fout === '', 'maatschap met goedgekeurde partnerbeloning → centrale bron, geen tweede aftrek, uitleg verborgen');
// 7. Een voorstel (niet goedgekeurd) telt niet als ondernemersloon.
({ ctx, dom } = await opzet({ antwoord: basis({ normalisaties: [{ jaar: 2025, soort: 'partnerbeloning', status: 'voorstel', bedrag: -180000 }] }), maatschap: true }));
ok(ctx.finEbitdaBronStatus().bron === 'handmatig', 'partnerbeloning als voorstel (niet goedgekeurd) → geen centrale overname');
// 8. Statisch: het dealvoorstel blokkeert genereren bij een handmatige waarde zonder motivering en legt de herkomst intern vast.
const m04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
ok(/finEbitdaBronStatus\(\)/.test(m04) && /if\(_ebBron\.fout\)/.test(m04) && /ic\.voeg\('ebitda_bron'/.test(m04) && !/(^|[^i])c\.voeg\('ebitda_bron'/m.test(m04), 'dealvoorstel: blokkade bij ontbrekende motivering, herkomst alleen in de interne cijferlijst');
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
