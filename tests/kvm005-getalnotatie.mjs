// KVM-005 (20-11-2026): Nederlandse getalnotatie voor bedragen. Haalt de ECHTE functies uit mna/03 (fmtGeld, fmtGeldKort,
// parseGeld) en marilyn.html (fmtGeld) en toetst ze tegen handmatig vastgestelde uitkomsten. Terugleesproef: een
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
const A = {}; vm.createContext(A); vm.runInContext(['fmtGeld', 'fmtGeldKort', 'parseGeld'].map((f) => functie(m03, f)).join('\n'), A);
const B = {}; vm.createContext(B); vm.runInContext(functie(mar, 'fmtGeld'), B);
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
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
