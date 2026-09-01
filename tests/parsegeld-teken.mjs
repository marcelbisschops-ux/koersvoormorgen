// ══════════════════════════════════════════════════════════════════
// Los rekentestje voor de parseGeld()-tekenfix (mna/03-rekenkern-waardering.js).
// Auditbevinding 1 sep 2026: de oude regex slikte het minteken → negatieve
// EBITDA/eigen vermogen werd positief ingelezen (GOUDEN STANDAARD werkregel 13).
//
//   node tests/parsegeld-teken.mjs
//
// Bevat een byte-kopie van de OUDE en de NIEUWE parseGeld als ijkpunt.
// ══════════════════════════════════════════════════════════════════

function OUD_parseGeld(s){
  if(!s)return 0;
  var n=String(s).replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');
  return parseFloat(n)||0;
}
function NIEUW_parseGeld(s){
  if(!s)return 0;
  var str=String(s).trim();
  var negatief=/^[^\d]*[-−–—‑－]\s*\d/.test(str)
    || /\d\s*[-−–—‑－]\s*$/.test(str)
    || /^\(.*\d.*\)$/.test(str);
  var n=str.replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');
  var v=parseFloat(n)||0;
  return negatief ? -v : v;
}

let ok=0, fail=0;
function check(naam, waarde, verwacht){
  const g = Math.abs(waarde-verwacht) < 1e-9;
  if(g){ ok++; console.log('  \x1b[32m✓\x1b[0m '+naam+'  → '+waarde); }
  else { fail++; console.log('  \x1b[31m✗\x1b[0m '+naam+'  → kreeg '+waarde+', verwacht '+verwacht); }
}

console.log('\n\x1b[1mNIEUW_parseGeld — tekengedrag\x1b[0m');
// negatieve invoer moet negatief blijven
check("'-500000'",            NIEUW_parseGeld('-500000'),        -500000);
check("'-500.000'",           NIEUW_parseGeld('-500.000'),       -500000);
check("'€ -500.000'",         NIEUW_parseGeld('€ -500.000'),     -500000);
check("'- 1.234,56'",         NIEUW_parseGeld('- 1.234,56'),     -1234.56);
check("'−500000' (U+2212 minus)",   NIEUW_parseGeld('−500000'),   -500000);
check("'–500.000' (U+2013 en-dash)",NIEUW_parseGeld('–500.000'), -500000);
check("'—500.000' (U+2014 em-dash)",NIEUW_parseGeld('—500.000'), -500000);
check("'1.234,56-' (achterloop-min)",NIEUW_parseGeld('1.234,56-'),-1234.56);
check("'200.000 -' (achterloop + spatie)",NIEUW_parseGeld('200.000 -'),-200000);
check("'(1.234)' (haakjes)",  NIEUW_parseGeld('(1.234)'),        -1234);
check("'(€ 200.000)'",        NIEUW_parseGeld('(€ 200.000)'),    -200000);
// positieve/neutrale invoer moet ongewijzigd blijven t.o.v. OUD
console.log('\n\x1b[1mNIEUW == OUD voor niet-negatieve invoer\x1b[0m');
for(const s of ['500000','€ 500.000','1.234,56','3.000.000','0','','12,5','1.200.000,00','n.v.t.','zie bijlage']){
  const o=OUD_parseGeld(s), n=NIEUW_parseGeld(s);
  check(JSON.stringify(s), n, o);
}
// edge: jaartalreeks in een geldveld mag NIET als negatief worden gelezen
console.log('\n\x1b[1mEdge — geen valse negatief\x1b[0m');
check("'2020-2021' → niet negatief", NIEUW_parseGeld('2020-2021') >= 0 ? 1 : 0, 1);
check("null",  NIEUW_parseGeld(null), 0);
check("undefined", NIEUW_parseGeld(undefined), 0);

console.log('\n\x1b[1m─────────── SAMENVATTING ───────────\x1b[0m');
console.log('\x1b[32m'+ok+' geslaagd\x1b[0m  ·  '+(fail?'\x1b[31m'+fail+' gefaald\x1b[0m':'0 gefaald'));
process.exit(fail===0?0:1);
