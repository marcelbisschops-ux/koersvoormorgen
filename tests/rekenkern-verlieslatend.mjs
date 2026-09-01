// ══════════════════════════════════════════════════════════════════
// Los rekentestje voor de "verlieslatende grondslag"-fixes (1 sep 2026,
// auditbevinding + parseGeld-tekenfix) in mna/03-rekenkern-waardering.js.
//
//   node tests/rekenkern-verlieslatend.mjs
//
// Bevat byte-kopieën van dvGrondslagBewezen/Prognose en dvBerekenScenarios
// zoals ze NA de fix in mna/03 staan. Wijzigt daar iets? Werk deze kopie bij.
// ══════════════════════════════════════════════════════════════════

// ── kopie: dvGrondslag*-helpers (mna/03 ~regel 213-214) ──
function dvGrondslagBewezen(p){ return (p.grondslagBewezen!=null) ? p.grondslagBewezen : p.ebitdaBewezen; }

// ── kopie: dvBerekenScenarios (mna/03, NA de fix) ──
function dvBerekenScenarios(p){
  if(!p.scenarioAan)return null;
  var gBasis=dvGrondslagBewezen(p);
  if(!(gBasis>0))return null;
  var delta=p.scenarioGroeiDeltaPct||0;
  var varianten=[
    {label:'Downside',groeiDelta:-delta},
    {label:'Base case',groeiDelta:0},
    {label:'Upside',groeiDelta:delta}
  ];
  return varianten.map(function(v){
    var groei=(p.groeiPct+v.groeiDelta)/100;
    var g=gBasis;
    for(var j=1;j<=p.horizonJaren;j++){g*=(1+groei);}
    return {label:v.label,groeiPct:p.groeiPct+v.groeiDelta,ebitdaEind:g,waardeLaag:g*p.multipleBasis,waardeHoog:g*p.multipleBovengrens,grondslag:p.grondslag||'ebitda'};
  });
}

// ── kopie: de _geenMultiple-poort uit dvBerekenWaardering (mna/03, NA de fix) ──
function geenMultiple(p){
  var multipleTypeBedrag = p.multipleType==='omzet' ? p.o3 : (p.ebitdaAbs || (p.o3*(p.ebitdaPct/100)));
  var maatschapGrondslagOnbekend = !!p.maatschapGrondslagOnbekend;
  var grondslagNegatief = !(multipleTypeBedrag>0) && !maatschapGrondslagOnbekend;
  return { multipleTypeBedrag, grondslagNegatief,
    _geenMultiple: maatschapGrondslagOnbekend || !!p.multipleOnbekend || grondslagNegatief };
}

let ok=0, fail=0;
function check(naam, cond, detail){
  if(cond){ ok++; console.log('  \x1b[32m✓\x1b[0m '+naam); }
  else { fail++; console.log('  \x1b[31m✗\x1b[0m '+naam+(detail?'  \x1b[90m('+detail+')\x1b[0m':'')); }
}

// ── 1. dvBerekenScenarios: verlieslatende grondslag → null ──
console.log('\n\x1b[1m1. dvBerekenScenarios — verlieslatende/nul grondslag\x1b[0m');
const pBase={scenarioAan:true,scenarioGroeiDeltaPct:5,groeiPct:3,horizonJaren:5,multipleBasis:4.5,multipleBovengrens:5.5};
check('EBITDA -200000 → null (geen omgekeerde Downside/Upside)',
  dvBerekenScenarios({...pBase, ebitdaBewezen:-200000}) === null);
check('EBITDA 0 → null',
  dvBerekenScenarios({...pBase, ebitdaBewezen:0}) === null);
check('grondslagBewezen (omzet) 0 → null',
  dvBerekenScenarios({...pBase, grondslag:'omzet', grondslagBewezen:0, ebitdaBewezen:100000}) === null);
{
  const r=dvBerekenScenarios({...pBase, ebitdaBewezen:500000});
  check('EBITDA 500000 → 3 scenario-rijen', Array.isArray(r) && r.length===3, JSON.stringify(r&&r.map(x=>x.label)));
  check('Downside eindwaarde < Base < Upside (labels kloppen met cijfers)',
    r && r[0].ebitdaEind < r[1].ebitdaEind && r[1].ebitdaEind < r[2].ebitdaEind,
    r && r.map(x=>Math.round(x.ebitdaEind)).join(' / '));
}

// ── 2. dvBerekenScenarios: grondslag-bewust (omzet-multiple sector) ──
console.log('\n\x1b[1m2. dvBerekenScenarios — grondslag-bewust (auditbevinding #2)\x1b[0m');
{
  // zorg: omzet-multiple. grondslagBewezen = omzet (5 mln), ebitdaBewezen = 400k.
  const r=dvBerekenScenarios({...pBase, grondslag:'omzet', grondslagBewezen:5000000, ebitdaBewezen:400000, groeiPct:0, scenarioGroeiDeltaPct:0});
  // groei 0 → eindwaarde == grondslag == 5 mln, NIET 400k
  check('rekent op de OMZET-grondslag (5 mln), niet op EBITDA (400k)',
    r && Math.abs(r[1].ebitdaEind - 5000000) < 1, r && Math.round(r[1].ebitdaEind));
  check('waarde = omzet × multiple (5 mln × 4,5 = 22,5 mln)',
    r && Math.abs(r[1].waardeLaag - 22500000) < 1, r && Math.round(r[1].waardeLaag));
  check("scenario draagt grondslag:'omzet' mee (voor het tabel-label)",
    r && r[0].grondslag === 'omzet');
}

// ── 3. _geenMultiple-poort in dvBerekenWaardering ──
console.log('\n\x1b[1m3. dvBerekenWaardering — _geenMultiple bij verlieslatende grondslag\x1b[0m');
check('EBITDA -200000 → grondslagNegatief + _geenMultiple (rode banner, geen getal)',
  (()=>{ const g=geenMultiple({multipleType:'ebitda', ebitdaAbs:-200000, o3:1000000, ebitdaPct:0}); return g.grondslagNegatief===true && g._geenMultiple===true; })());
check('omzet-multiple sector, o3 = 0 → grondslagNegatief',
  (()=>{ const g=geenMultiple({multipleType:'omzet', o3:0, ebitdaAbs:100000}); return g.grondslagNegatief===true; })());
check('positieve EBITDA 300000 → GEEN grondslagNegatief',
  (()=>{ const g=geenMultiple({multipleType:'ebitda', ebitdaAbs:300000, o3:1000000, ebitdaPct:0}); return g.grondslagNegatief===false && g._geenMultiple===false; })());
check('maatschapGrondslagOnbekend heeft voorrang (geen dubbele banner)',
  (()=>{ const g=geenMultiple({multipleType:'maatschap', ebitdaAbs:0, maatschapGrondslagOnbekend:true}); return g.grondslagNegatief===false && g._geenMultiple===true; })());

console.log('\n\x1b[1m─────────── SAMENVATTING ───────────\x1b[0m');
console.log('\x1b[32m'+ok+' geslaagd\x1b[0m  ·  '+(fail?'\x1b[31m'+fail+' gefaald\x1b[0m':'0 gefaald'));
process.exit(fail===0?0:1);
