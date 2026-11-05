// MASTER #91 F2 (28 okt 2026): onafhankelijk rekenscript voor de transactiescenario's (zone A,
// werkregel 11/26). Rekent met eigen, losse formules (geen frontendcode) en vergelijkt daarna met
// dvBerekenTransactieScenario uit mna/03. Draaien: node tests/transactiescenario-rekencheck.mjs
import fs from 'fs';
import vm from 'vm';

// Eigen referentie in hele centen, zodat afronding geen rol speelt.
function referentie(equity, s) {
  const eq = Math.max(0, equity);
  const verkocht = Math.round(eq * s.belang_pct) / 100;
  const deel = (pct) => Math.round(verkocht * pct) / 100;
  return {
    verkochtBelang: verkocht, direct: deel(s.direct_pct), earnOut: deel(s.earn_out_pct),
    vendorLoan: deel(s.vendor_loan_pct), gespreid: deel(s.gespreid_pct), behoudenBelangWaarde: Math.round(eq * s.behouden_belang_pct) / 100,
  };
}

const gevallen = [
  { naam: 'handmatig: 2 mln, 80% verkocht, 60/20/10/10, 20% behouden', eq: 2000000, s: { belang_pct: 80, direct_pct: 60, earn_out_pct: 20, vendor_loan_pct: 10, gespreid_pct: 10, behouden_belang_pct: 20 },
    verwacht: { verkochtBelang: 1600000, direct: 960000, earnOut: 320000, vendorLoan: 160000, gespreid: 160000, behoudenBelangWaarde: 400000 } },
  { naam: 'volledig contant: 3.250.000, 100%', eq: 3250000, s: { belang_pct: 100, direct_pct: 100, earn_out_pct: 0, vendor_loan_pct: 0, gespreid_pct: 0, behouden_belang_pct: 0 },
    verwacht: { verkochtBelang: 3250000, direct: 3250000, earnOut: 0, vendorLoan: 0, gespreid: 0, behoudenBelangWaarde: 0 } },
  { naam: 'gefaseerd 51%, 49% behouden, derden', eq: 1500000, s: { belang_pct: 51, direct_pct: 33.33, earn_out_pct: 33.33, vendor_loan_pct: 33.34, gespreid_pct: 0, behouden_belang_pct: 49 },
    verwacht: { verkochtBelang: 765000, direct: 254974.5, earnOut: 254974.5, vendorLoan: 255051, gespreid: 0, behoudenBelangWaarde: 735000 } },
];

const src = fs.readFileSync(new URL('../mna/03-rekenkern-waardering.js', import.meta.url), 'utf8');
const i = src.indexOf('function dvBerekenTransactieScenario(');
let d = 0, j = src.indexOf('{', i);
for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } }
const ctx = vm.createContext({});
vm.runInContext(src.slice(i, j + 1), ctx);

let fout = 0, geslaagd = 0;
const gelijk = (a, b) => Math.abs(a - b) < 0.01;
for (const g of gevallen) {
  const ref = referentie(g.eq, g.s), uit = ctx.dvBerekenTransactieScenario(g.eq, g.s);
  for (const k of Object.keys(g.verwacht)) {
    if (!gelijk(ref[k], g.verwacht[k])) { fout++; console.log('REFERENTIE WIJKT AF', g.naam, k, ref[k], g.verwacht[k]); }
    else if (!gelijk(uit[k], g.verwacht[k])) { fout++; console.log('REKENKERN WIJKT AF', g.naam, k, uit[k], g.verwacht[k]); }
    else geslaagd++;
  }
  const som = uit.direct + uit.earnOut + uit.vendorLoan + uit.gespreid;
  if (!gelijk(som, uit.verkochtBelang)) { fout++; console.log('SOM ONDERDELEN ≠ VERKOCHT BELANG', g.naam); } else geslaagd++;
}
console.log(geslaagd + ' geslaagd · ' + fout + ' gefaald');
process.exit(fout ? 1 : 0);
