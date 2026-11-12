// N-159 (12-11-2026): elke print van het dealvoorstel (en de interne bijlage) in mna/04 loopt via de bestaande
// disclaimer-bevestiging toonRelianceAkkoord (#62), net als printDoc. Statische borging; het disclaimerpad zelf is
// in de browserproef van #62 bewezen. Draaien: node tests/n159-dealvoorstel-disclaimer.mjs
import fs from 'fs';
const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
const regels = src.split('\n');
let fout = 0;
const aanroepen = regels.map((l, i) => [i + 1, l]).filter(([, l]) => /printDealvoorstel\(/.test(l) && !/^\s*\/\//.test(l));
for (const [nr, l] of aanroepen) {
  const ok = /toonRelianceAkkoord\([^;]*function\s*\(\)\s*\{\s*printDealvoorstel\(/.test(l);
  if (!ok) fout++;
  console.log((ok ? 'PASS' : 'FAIL') + ' r.' + nr + ' printDealvoorstel via toonRelianceAkkoord');
}
if (aanroepen.length < 2) { fout++; console.log('FAIL verwacht minstens 2 printaanroepen (dealvoorstel + interne bijlage), gevonden ' + aanroepen.length); }
const docTypes = ['dealvoorstel', 'dealvoorstel_bijlage'].filter((d) => new RegExp("toonRelianceAkkoord\\([^,]+,'" + d + "',").test(src));
console.log((docTypes.length === 2 ? 'PASS' : 'FAIL') + ' documenttypen in de vastlegging: ' + docTypes.join(', '));
if (docTypes.length !== 2) fout++;
process.exit(fout ? 1 : 0);
