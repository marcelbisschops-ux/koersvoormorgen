// KVM-005 (20-11-2026): Nederlandse getalnotatie voor bedragen. Haalt de ECHTE functies uit mna/03 (fmtGeld, fmtGeldKort,
// parseGeld, fmtMultiple) en marilyn.html (fmtGeld, fmtMultiple) en toetst ze tegen handmatig vastgestelde uitkomsten. Terugleesproef: een
// weergegeven bedrag levert via parseGeld exact dezelfde waarde op (invoer en opslag blijven correct). Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const functie = (src, naam) => { const i = src.indexOf('function ' + naam + '('); if (i < 0) throw new Error(naam + ' niet gevonden');
  let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };
const m03 = fs.readFileSync(path.join(ROOT, 'mna/03-rekenkern-waardering.js'), 'utf8');
const mar = fs.readFileSync(path.join(ROOT, 'marilyn.html'), 'utf8');
const A = {}; vm.createContext(A); vm.runInContext(['fmtGeld', 'fmtGeldKort', 'parseGeld', 'fmtMultiple', 'dvMultiple'].map((f) => functie(m03, f)).join('\n'), A);
const B = {}; vm.createContext(B); vm.runInContext(['fmtGeld', 'fmtMultiple'].map((f) => functie(mar, f)).join('\n'), B);
const nbsp = (s) => String(s).replace(/ | /g, ' ');
const verwacht = [[1000000, '€ 1.000.000'], [12500.5, '€ 12.500,50'], [12500, '€ 12.500'], [1234567, '€ 1.234.567'], [999.99, '€ 999,99'],
  [12999.99, '€ 12.999,99'], [7, '€ 7'], [-200000, '€ -200.000'], [-12500.5, '€ -12.500,50'], [3500000000, '€ 3.500.000.000']];
for (const [x, s] of verwacht) {
  ok(nbsp(A.fmtGeld(x)) === s, 'mna fmtGeld(' + x + ') = ' + s, nbsp(A.fmtGeld(x)));
  ok(nbsp(B.fmtGeld(x)) === s, 'marilyn fmtGeld(' + x + ') = ' + s, nbsp(B.fmtGeld(x)));
}
for (const x of [0, null, undefined, '', NaN]) ok(A.fmtGeld(x) === '—' && B.fmtGeld(x) === '—', 'leeg/0/ongeldig (' + String(x) + ') → —');
ok(nbsp(A.fmtGeld(12500.5)) !== '€13.000' && !/mln/.test(A.fmtGeld(1234567)), 'geen afronding op duizenden of mln meer in de volledige notatie (oude fout)');
ok(nbsp(A.fmtGeldKort(1234567)) === '€ 1,23 mln' && nbsp(A.fmtGeldKort(-2500000)) === '€ -2,50 mln' && nbsp(A.fmtGeldKort(12500)) === '€ 12.500', 'compacte grafieklabels: € 1,23 mln (NL-komma), onder een miljoen volledig');
// Terugleesproef: weergave → parseGeld → zelfde waarde (ook negatief en met centen).
let terug = true; const fouten = [];
for (const x of [1, 7, 999.99, 1000, 12500, 12500.5, 99999.01, 1000000, 1234567.89, 3500000000, -1, -200000, -12500.5]) {
  const y = A.parseGeld(A.fmtGeld(x)); if (Math.abs(y - x) > 1e-9) { terug = false; fouten.push([x, A.fmtGeld(x), y]); }
}
ok(terug, 'terugleesproef: parseGeld(fmtGeld(x)) === x voor positieve, negatieve en centbedragen', fouten);
// Multiples (26-11-2026). Regel: NL-decimaalkomma + '×'. Zonder decimalen-argument 0 tot 2 decimalen zonder
// overbodige nullen (4 → 4×, 5,5 → 5,5×); met decimalen-argument een vast aantal (5,5 met 2 → 5,50×). Leeg/ongeldig → —.
const mult = [[[5.5, 2], '5,50×'], [[4, 2], '4,00×'], [[4], '4×'], [[5.5], '5,5×'], [[5.05], '5,05×'], [[4.825], '4,83×'],
  [[5.5, 1], '5,5×'], [[0.8, 2], '0,80×'], [[2.345, 1], '2,3×'], [[0], '0×'], [[-0.5], '-0,5×'], [[1250, 1], '1.250,0×'], [['5.5', 2], '5,50×']];
for (const [args, s] of mult) {
  ok(A.fmtMultiple(...args) === s, 'mna fmtMultiple(' + args.join(', ') + ') = ' + s, A.fmtMultiple(...args));
  ok(B.fmtMultiple(...args) === s, 'marilyn fmtMultiple(' + args.join(', ') + ') = ' + s, B.fmtMultiple(...args));
}
for (const x of [null, undefined, '', NaN, 'abc']) ok(A.fmtMultiple(x) === '—' && B.fmtMultiple(x, 2) === '—', 'multiple leeg/ongeldig (' + String(x) + ') → —');
ok(A.dvMultiple(5.5) === '5,5×' && A.dvMultiple(4) === '4,0×' && A.dvMultiple(3.25) === '3,3×', 'dvMultiple (dealvoorstel) ongewijzigd: 1 vaste decimaal via fmtMultiple');
ok(functie(m03, 'fmtMultiple').replace(/\s+/g, '') === functie(mar, 'fmtMultiple').replace(/\s+/g, ''), 'marilyn-kopie van fmtMultiple is gelijk aan die in mna/03 (één regel, geen afwijkende formule)');
// Terugleesproef invoer: wat een gebruiker typt → parseGeld → NL-weergave → parseGeld levert hetzelfde bedrag.
const invoer = ['1250000', '1.250.000', '€ 1.250.000', '12500,50', '€ 12.500,50', '-200000', '€ -200.000', '1.234-', '(5.000)', '999,99', '7'];
const invFout = invoer.filter((t) => { const v = A.parseGeld(t); return Math.abs(A.parseGeld(A.fmtGeld(v)) - v) > 1e-9; });
ok(invFout.length === 0, 'terugleesproef invoer: parseGeld(fmtGeld(parseGeld(getypt))) === parseGeld(getypt) voor ' + invoer.length + ' invoervormen', invFout);
// Statisch: geen bedragen meer in 'K'-notatie of met afronding op duizenden in de schermen.
const bronnen = ['marilyn.html', 'adv.html', 'adv-werkruimte.js', ...fs.readdirSync(path.join(ROOT, 'mna')).filter((f) => f.endsWith('.js')).map((f) => 'mna/' + f)];
const kNotatie = bronnen.filter((f) => /'€'\+\([^)]*\/1000\)\.toFixed\(0\)\+'(K|\.000)/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
ok(kNotatie.length === 0, "geen '€…K' of '€….000' (afronding op duizenden) meer in mna, adv en marilyn", kNotatie);
// Statisch: geen multiples meer met decimaalpunt via toFixed(n)+'x' of +'×' (of de oude '\xd7 '-labels) in de schermen.
const multPunt = [];
for (const f of bronnen) fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((r, i) => {
  if (/toFixed\(\d\)\s*\+\s*'\s*(x|×|\\xd7|\\u00d7|&times;)/.test(r) || /\+\s*'\\xd7 '/.test(r)) multPunt.push(f + ':' + (i + 1));
});
ok(multPunt.length === 0, "geen multiple-weergave meer als toFixed(n)+'x'/'×' in mna, adv en marilyn (gebruik fmtMultiple)", multPunt);
// KVM-005 (27-11-2026): percentages en decimalen in NL-notatie via fmtPct/fmtDec (mna/03), exports ongewijzigd.
{
  const vm2 = await import('vm');
  const bron = fs.readFileSync(path.join(ROOT, 'mna/03-rekenkern-waardering.js'), 'utf8');
  const c2 = { Number, isNaN }; vm2.createContext(c2);
  vm2.runInContext(bron.split('\n').filter((l) => /^function fmt(Dec|Pct)\(/.test(l)).join('\n'), c2);
  ok(c2.fmtPct(12.5, 1) === '12,5%' && c2.fmtPct(-3, 1) === '-3,0%' && c2.fmtPct(1234.5, 1) === '1.234,5%', 'fmtPct: komma als decimaalteken, punt als duizendtal', [c2.fmtPct(12.5, 1), c2.fmtPct(-3, 1), c2.fmtPct(1234.5, 1)]);
  ok(c2.fmtDec(1.25, 2) === '1,25' && c2.fmtPct(null, 1) === '—' && c2.fmtDec('', 1) === '—', 'fmtDec en lege waarden');
  vm2.runInContext(functie(mar, 'fmtPct'), B);
  ok(B.fmtPct(0) === '0,0%' && B.fmtPct(null) === '—' && B.fmtPct(1.25) === '1,3%', 'Marilyn: nul historische omzetgroei wordt als 0,0% getoond');
  const pctPunt = [];
  for (const f of ['mna/03-rekenkern-waardering.js', 'mna/06-schermen.js', 'marilyn.html']) {
    fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((r, i) => {
      if (/(x|y|x1|y1|x2|y2|width|height)="'/.test(r) || /regel\(\[|\.voeg\(|Number\(\(|lijnen\.push/.test(r)) return;
      if (/toFixed\([1-9]\)\s*\+\s*'%/.test(r)) pctPunt.push(f + ':' + (i + 1));
    });
  }
  ok(pctPunt.length === 0, "geen zichtbaar percentage meer als toFixed(n)+'%' in schermcode (gebruik fmtPct); CSV-export en interne cijferlijst uitgezonderd", pctPunt);
}
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
