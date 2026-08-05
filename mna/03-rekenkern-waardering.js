// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Fix 5 aug 2026: "3.000.000" (NL-duizendtallen) werd door parseFloat na de eerste extra punt
// afgekapt tot 3 — punten zijn in NL-notatie altijd duizendtal-scheiding, nooit decimaal (dat is de
// komma), dus die worden nu eerst verwijderd vóór het omzetten van de komma naar een decimale punt.
function parseGeld(s){if(!s)return 0;var n=String(s).replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');return parseFloat(n)||0;}
function fmtGeld(n){if(!n||isNaN(n))return '—';if(n>=1000000)return '€'+(n/1000000).toFixed(2)+' mln';if(n>=1000)return '€'+(n/1000).toFixed(0)+'.000';return '€'+Math.round(n);}
// Zelfde als parseGeld, maar geeft null terug als het veld niet is ingevuld (i.p.v. 0) — nodig voor
// de financiële ratio's hieronder, waar 0 een geldige uitkomst kan zijn (bijv. geen schuld) en dus
// onderscheiden moet worden van "nog niet ingevuld" (GOUDEN STANDAARD: nooit stilzwijgend gokken).
function dvGeldOfNull(key){var v=S.data[key];if(!v||!String(v).trim())return null;var n=parseGeld(v);return isNaN(n)?null:n;}

// Groepsstructuur (Fase 2): welke velden op groepsniveau automatisch berekend worden uit de
// entiteiten (en dus read-only zijn in de "Groep"-weergave) — spiegelbeeld van VELD_AGGREGATIE in de
// worker. Alleen gebruikt om read-only vs. invoerbaar te bepalen in de UI; de daadwerkelijke berekening
// gebeurt server-side bij het opslaan van entiteit-data.
var VELD_AGGREGATIE = {
  financieel: ['omzet1','omzet2','omzet3','omzetYTD','forecast','ebitda','partnerBel','normalisatie','ebitdaNorm','wip','debiteuren',
    'ebitdaMarge','recurring','debiteurenOud','declarab','kostenPersoneel','kostenHuisvesting','kostenIT','kostenMarketing','kostenOverig'],
  commercieel: ['aantalKlanten','nieuw','verlies','omzetPerKlant','churn','crossSell','klantduur'],
  // Alleen 'fte' — aantalP/gemLeeftijd zijn groepsniveau-velden (df.groepsniveau), geen som.
  partner: ['fte'],
};
function isGeaggregeerdVeld(faseId, veldId){ return !!(VELD_AGGREGATIE[faseId]&&VELD_AGGREGATIE[faseId].indexOf(veldId)>=0); }

// ===== DEALVOORSTEL: parameters, berekeningen, weergave =====
function dvMln(n){return (n/1000000).toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});}
function dvPct(n){return n.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';}
function dvMultiple(n){return n.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+'×';}

// Sectorbewuste multiple-range — gedeeld tussen dvGetDefaults() (dealvoorstel) en
// dvBerekenWaardering() (hoofdscherm). Sinds de vierde kwartaalaudit (25 juli 2026, P1 #1) leest dit
// de expliciete, gestructureerde velden multipleBasis/multipleLaag/multipleHoog op het sectorprofiel
// i.p.v. een regex uit de vrije aiNormen-tekst te parsen — die regex kon niet onderscheiden of de
// gevonden range een EBITDA- of omzet-multiple was (bijv. zorg: "1-3x omzet"), waardoor een omzet-
// multiple stilzwijgend op EBITDA werd toegepast (tot >70% waarderingsafwijking). Val terug op de
// oude regex-parse (basis altijd 'ebitda') alleen als een sectorprofiel deze velden nog niet heeft —
// bijv. een via marilyn handmatig met vrije JSON aangemaakt profiel.
function dvSectorMultipleRange(){
  var sectorProfiel=getSectorProfiel();
  if(sectorProfiel.multipleLaag&&sectorProfiel.multipleHoog){
    return {mLaag:sectorProfiel.multipleLaag,mHoog:sectorProfiel.multipleHoog,basis:sectorProfiel.multipleBasis||'ebitda'};
  }
  var normen=sectorProfiel.aiNormen||'';
  var mMatch=normen.match(/multiple\s*([\d.,]+)\s*[-–]\s*([\d.,]+)x/i);
  var mLaag=mMatch?parseFloat(mMatch[1].replace(',','.')):4.5;
  var mHoog=mMatch?parseFloat(mMatch[2].replace(',','.')):5.5;
  return {mLaag:mLaag,mHoog:mHoog,basis:'ebitda'};
}

function dvGetDefaults(){
  var t=S.traject||{};
  var mRange=dvSectorMultipleRange();
  var mLaag=mRange.mLaag, mHoog=mRange.mHoog;
  var ebBasis=parseGeld(S.data['financieel_ebitdaNorm']||S.data['financieel_ebitda']||'0');
  // Werkkapitaalbasis (debiteuren + onderhanden werk) — audit-fix P2, 25 juli 2026: nodig om een
  // werkkapitaalmutatie in de DCF-kasstroom mee te kunnen nemen (zie dvBerekenSchuldafbouw()). Het
  // aparte DD-veld "Netto werkkapitaalanalyse (NWC)" is bewust NIET gebruikt — dat is een
  // document-/vrijetekstveld (geen betrouwbaar te parsen getal), in tegenstelling tot debiteuren/wip
  // die al elders in dit bestand als bedrag worden ingevuld en gebruikt.
  var werkkapitaalBasis=parseGeld(S.data['financieel_debiteuren']||'0')+parseGeld(S.data['financieel_wip']||'0');
  return {
    koperNaam:t.koper_naam||'',
    belangPct:51,
    ebitdaBewezen:ebBasis||0,
    ebitdaPrognose:ebBasis?Math.round(ebBasis*1.3):0,
    werkkapitaalBasis:werkkapitaalBasis,
    multipleBasis:mLaag,
    multipleBovengrens:mHoog,
    cliffPct:70,
    earnOutAan:false,
    earnOutPct:20,
    earnOutTargetPct:5,
    earnOutJaren:3,
    escrowPct:12,
    escrowMaanden:18,
    bankLeverage:2,
    rentePct:5,
    vpbPct:25.8,
    capexPct:1.5,
    groeiPct:4,
    horizonJaren:5,
    discontovoetPct:12,
    buyAndBuild:false,
    baOvernamesPerJaar:2,
    baOmvangEbitda:1400000,
    baAcqMultiple:5.5,
    baPlatformMultipleMax:9.5,
    baAcqSchuldPct:55,
    baAflossingPct:15,
    vendorLoanAan:false,
    vendorLoanBedrag:0,
    vendorLoanRentePct:6,
    vendorLoanJaren:5,
    vendorLoanAflossingsvrij:false,
    altWaarderingAan:false,
    liqDebiteurenPct:80,
    liqWipPct:50,
    liqKostenPct:5,
    goodwillNormrendementPct:0,
    goodwillKapitalisatievoetPct:0,
    synergieAan:false,
    synergieKostenJaarlijks:0,
    synergieOmzetJaarlijks:0,
    synergieRealisatieJaren:2,
    synergieImplementatiekosten:0,
    scenarioAan:false,
    scenarioGroeiDeltaPct:5,
    dcfGevoeligheidAan:false,
    dcfWaccDeltaPct:2,
    dcfGroeiDeltaPct:1
  };
}

// Glijdende-schaal prijsmechanisme: multiple loopt lineair van multipleBasis (bij de cliff-drempel)
// naar multipleBovengrens (bij of boven de prognose); onder de cliff geldt de vaste basis-multiple als
// harde ondergrens, boven de prognose wordt de bovengrens niet verder verhoogd.
function dvBerekenPrijsmechanisme(p){
  var cliff=p.ebitdaPrognose*(p.cliffPct/100);
  function multipleVoor(ebitda){
    if(!p.ebitdaPrognose||ebitda<=cliff) return p.multipleBasis;
    if(ebitda>=p.ebitdaPrognose) return p.multipleBovengrens;
    var frac=(ebitda-cliff)/(p.ebitdaPrognose-cliff);
    return p.multipleBasis+frac*(p.multipleBovengrens-p.multipleBasis);
  }
  var scenarios=[
    {label:'Cliff — serieuze misser',ebitda:cliff*0.9},
    {label:'Deels gerealiseerd',ebitda:cliff+(p.ebitdaPrognose-cliff)*0.5},
    {label:'Prognose gehaald',ebitda:p.ebitdaPrognose},
    {label:'Ruim boven prognose',ebitda:p.ebitdaPrognose*1.12}
  ];
  return scenarios.map(function(s){
    var mult=multipleVoor(s.ebitda);
    var ev=s.ebitda*mult;
    var deelKoper=ev*(p.belangPct/100);
    var deelVerkoper=ev*(1-p.belangPct/100);
    return {label:s.label,ebitda:s.ebitda,multiple:mult,ev:ev,deelKoper:deelKoper,deelVerkoper:deelVerkoper};
  });
}

// Bedrag bij closing (op bewezen EBITDA × basis-multiple) en de earn-up (verschil met het prognose-scenario)
function dvBerekenClosing(p){
  var evBasis=p.ebitdaBewezen*p.multipleBasis;
  var deelKoperBasis=evBasis*(p.belangPct/100);
  var deelVerkoperBasis=evBasis*(1-p.belangPct/100);
  var evPrognose=p.ebitdaPrognose*p.multipleBovengrens;
  var deelKoperPrognose=evPrognose*(p.belangPct/100);
  var earnUp=Math.max(0,deelKoperPrognose-deelKoperBasis);
  return {evBasis:evBasis,deelKoperBasis:deelKoperBasis,deelVerkoperBasis:deelVerkoperBasis,evPrognose:evPrognose,deelKoperPrognose:deelKoperPrognose,earnUp:earnUp};
}

// Earn-out: prestatieafhankelijke naverrekening (26 juli 2026). ANDER mechanisme dan de earn-up
// hierboven — earn-up is een eenmalige bonus in jaar 1 als de prognose meteen wordt gehaald; een
// earn-out houdt zelf een deel van de koopsom (op bewezen basis) vast en keert dat gefaseerd uit
// over meerdere jaren, gekoppeld aan een doelgroei per jaar. GOUDEN STANDAARD: het percentage van de
// koopsom, de doelgroei en de looptijd zijn AANNAMES die de begeleider zelf instelt (net als bij
// vendor loan/escrow) — geen berekende of verzonnen uitkomst. Retourneert null zolang de checkbox
// uit staat, dan wordt er niets van meegenomen in het document.
function dvBerekenEarnOut(p,closing){
  if(!p.earnOutAan||!p.earnOutJaren)return null;
  var earnBase=closing.deelKoperBasis;
  var earnOutTotaal=earnBase*(p.earnOutPct/100);
  var vastBedrag=earnBase-earnOutTotaal;
  var jaarlijks=earnOutTotaal/p.earnOutJaren;
  var rows=[],cumulatief=0;
  for(var j=1;j<=p.earnOutJaren;j++){
    cumulatief+=jaarlijks;
    rows.push({jaar:j,tranche:jaarlijks,cumulatief:cumulatief});
  }
  return {earnBase:earnBase,vastBedrag:vastBedrag,earnOutTotaal:earnOutTotaal,jaarlijks:jaarlijks,rows:rows};
}

// Meerjarig kasstroom-/schuldafbouwmodel (realisatie-scenario: prognose wordt gehaald, earn-up in jaar 1 uitgekeerd).
// Capex is vereenvoudigd als percentage van EBITDA (geen aparte omzetprognose beschikbaar in dit model).
// Werkkapitaalmutatie (audit-fix P2, 25 juli 2026): de FCF miste voorheen elke werkkapitaalcomponent
// — bij een groeiend kantoor kan dat de kasstroom structureel overschatten. Aanname (net als de
// groei-/rente-/capex-percentages hierboven, geen berekening): werkkapitaal groeit evenredig met de
// EBITDA-groei van dat jaar; de jaarlijkse toename is een kasuitstroom. Bij ebitdaBasis=0 is er geen
// werkkapitaalbasis om te schalen en blijft de mutatie 0 (geen breuk door delen door nul).
function dvBerekenSchuldafbouw(p,closing){
  var rows=[];
  var huidigJaar=new Date().getFullYear();
  // Audit-fix P3 (25 juli 2026, vijfde ronde — gevonden via een onafhankelijke stress-test): bij
  // een (zeldzame) NEGATIEVE bewezen EBITDA gaf dit een onlogische negatieve "netto schuld" bij
  // closing. Een bankfinanciering op basis van een EBITDA-multiple is sowieso niet zinvol voor een
  // verlieslatend target, maar de weergave moet in dat geval geen fictieve negatieve schuld tonen —
  // vandaar geclampt op 0, net als de rest van deze functie al doet voor latere jaren.
  var nettoSchuld=Math.max(0,p.ebitdaBewezen*p.bankLeverage);
  var ebitda=p.ebitdaBewezen;
  var werkkapitaal=p.werkkapitaalBasis||0;
  rows.push({jaar:'Closing ('+huidigJaar+')',ebitda:ebitda,rente:0,vpb:0,capex:0,nwcMutatie:0,fcf:0,earnUp:0,nettoSchuld:nettoSchuld,leverage:ebitda?nettoSchuld/ebitda:0});
  for(var j=1;j<=p.horizonJaren;j++){
    var groeiDitJaar = (j===1 && p.ebitdaBewezen) ? (p.ebitdaPrognose-p.ebitdaBewezen)/p.ebitdaBewezen : p.groeiPct/100;
    ebitda = j===1 ? (p.ebitdaPrognose||ebitda) : ebitda*(1+p.groeiPct/100);
    var rente=nettoSchuld*(p.rentePct/100);
    var vpb=Math.max(0,ebitda-rente)*(p.vpbPct/100);
    var capex=ebitda*(p.capexPct/100);
    var nwcMutatie=werkkapitaal*groeiDitJaar;
    werkkapitaal+=nwcMutatie;
    var earnUp=j===1?closing.earnUp:0;
    var fcf=ebitda-rente-vpb-capex-nwcMutatie;
    nettoSchuld=Math.max(0,nettoSchuld-fcf+earnUp);
    rows.push({jaar:String(huidigJaar+j),ebitda:ebitda,rente:rente,vpb:vpb,capex:capex,nwcMutatie:nwcMutatie,fcf:fcf,earnUp:earnUp,nettoSchuld:nettoSchuld,leverage:ebitda?nettoSchuld/ebitda:0});
  }
  return rows;
}

// Vereenvoudigd buy-and-build platformscenario: N overnames/jaar van gemiddelde omvang, platformmultiple
// loopt lineair op naar het opgegeven maximum. Acquisitieschuld is een vast percentage van de acquisitiewaarde;
// bestaande schuld wordt jaarlijks met een indicatief percentage afgelost.
// initieleInzetKoper (optioneel): het eigen vermogen dat de koper bij closing heeft ingelegd
// (closing.deelKoperBasis) — nodig om IRR/MoM te berekenen. Zonder dit param blijven IRR/MoM leeg
// i.p.v. een fout te geven (bijv. bij hergebruik van deze functie zonder closing-context).
// LET OP — vereenvoudigde IRR: dit model houdt geen jaarlijkse eigen-vermogen-kasstroom bij (alleen
// schuld en EBITDA/EV-opbouw); er is dus geen record van extra eigen-vermogen-inleg per add-on.
// De IRR hieronder is daarom een CAGR-achtige jaarlijkse-rendementsindicatie (begin- vs eindwaarde
// van het koperbelang), GEEN volledige kasstroom-IRR met tussentijdse in-/uitleg. Duidelijk zo
// gelabeld in de UI (dvTabelBuyAndBuild) — nooit een precisie suggereren die de data niet heeft.
function dvBerekenBuyAndBuild(p,laatsteSchuldRow,initieleInzetKoper){
  var rows=[];
  var groepsEbitda=laatsteSchuldRow.ebitda;
  var nettoSchuld=laatsteSchuldRow.nettoSchuld;
  var multipleStart=p.multipleBovengrens;
  var jarenTotClosing=p.horizonJaren;
  var huidigJaar=new Date().getFullYear()+jarenTotClosing;
  for(var j=1;j<=5;j++){
    var acqEbitda=p.baOvernamesPerJaar*p.baOmvangEbitda;
    var acqSchuld=acqEbitda*p.baAcqMultiple*(p.baAcqSchuldPct/100);
    groepsEbitda+=acqEbitda;
    nettoSchuld=Math.max(0,nettoSchuld*(1-p.baAflossingPct/100)+acqSchuld);
    var multiple=Math.min(p.baPlatformMultipleMax, multipleStart+(p.baPlatformMultipleMax-multipleStart)*(j/5));
    var ev=groepsEbitda*multiple;
    var koperWaarde=ev*(p.belangPct/100);
    var jarenSindsClosing=jarenTotClosing+j;
    var mom=(initieleInzetKoper&&initieleInzetKoper>0)?(koperWaarde/initieleInzetKoper):null;
    var irr=(mom&&mom>0)?(Math.pow(mom,1/jarenSindsClosing)-1):null;
    rows.push({jaar:String(huidigJaar+j),deals:p.baOvernamesPerJaar,acqEbitda:acqEbitda,groepsEbitda:groepsEbitda,nettoSchuld:nettoSchuld,leverage:nettoSchuld/groepsEbitda,multiple:multiple,ev:ev,koperWaarde:koperWaarde,mom:mom,irr:irr});
  }
  return rows;
}

// Vendor loan (verkoperslening, 25 juli 2026): tot nu toe alleen een vrije-tekstregel in bod-/LOI-
// documenten ("betalingsstructuur"), zonder aflossingsschema — deze functie berekent dat schema
// daadwerkelijk. Twee vormen: lineaire aflossing (elk jaar gelijk deel + rente over de restschuld),
// of aflossingsvrij met een bullet-aflossing (volledige hoofdsom) in het laatste jaar. Losstaand van
// dvBerekenSchuldafbouw() (de bankfinanciering) — een vendor loan is een aparte, aan de verkoper
// verschuldigde verplichting van de koper, geen onderdeel van de netto-bankschuld-kasstroom hierboven.
// Bewust geen aannames bij ontbrekende invoer: retourneert null als er geen bedrag is ingevuld, i.p.v.
// een leeg/misleidend schema te tonen.
function dvBerekenVendorLoan(p){
  if(!p.vendorLoanAan||!p.vendorLoanBedrag||!p.vendorLoanJaren)return null;
  var rows=[];
  var restschuld=p.vendorLoanBedrag;
  var jaarlijkseAflossing=p.vendorLoanAflossingsvrij?0:p.vendorLoanBedrag/p.vendorLoanJaren;
  for(var j=1;j<=p.vendorLoanJaren;j++){
    var rente=restschuld*(p.vendorLoanRentePct/100);
    var aflossing=p.vendorLoanAflossingsvrij?(j===p.vendorLoanJaren?restschuld:0):Math.min(jaarlijkseAflossing,restschuld);
    restschuld=Math.max(0,restschuld-aflossing);
    rows.push({jaar:j,rente:rente,aflossing:aflossing,totaal:rente+aflossing,restschuld:restschuld});
  }
  return rows;
}

// Asset-based / liquidatiewaarde / goodwill (25 juli 2026) — alternatieve waarderingsmethodes naast
// de EBITDA-multiple hierboven. GOUDEN STANDAARD: de liquidatie-percentages en het goodwill-
// percentage zijn AANNAMES die de gebruiker zelf instelt in het dealvoorstel-formulier — dit zijn
// geen vastgestelde branchenormen (er is geen betrouwbaar gesourcete LHV/NMa-goodwillnorm in dit
// platform vastgelegd), dus wordt hier nooit een default-percentage ingevuld dat als "de norm"
// gepresenteerd zou kunnen worden. Elke uitkomst is null zolang de onderliggende balansvelden of het
// percentage niet zijn ingevuld — nooit een gegokt bedrag.
function dvBerekenAlternatieveWaarderingen(p){
  var eigenVermogen=dvGeldOfNull('financieel_eigenVermogen');
  if(eigenVermogen===null)eigenVermogen=dvGeldOfNull('financieel_eigVermoeden');
  var debiteuren=dvGeldOfNull('financieel_debiteuren');
  var wip=dvGeldOfNull('financieel_wip');
  var liquideMiddelen=dvGeldOfNull('financieel_liquideMiddelen');
  var kortlopendeSchulden=dvGeldOfNull('financieel_kortlopendeSchulden');
  var langlopendeSchulden=dvGeldOfNull('financieel_langlopendeSchulden');
  var omzetLaatste=parseGeld(S.data['financieel_omzet3']||'0');

  var intrinsiek=eigenVermogen;

  var liquidatiewaarde=null, liquidatieDetail=null;
  if(liquideMiddelen!==null&&(kortlopendeSchulden!==null||langlopendeSchulden!==null)){
    var debiteurenInbaar=(debiteuren||0)*(p.liqDebiteurenPct/100);
    var wipInbaar=(wip||0)*(p.liqWipPct/100);
    var activaLiquidatie=liquideMiddelen+debiteurenInbaar+wipInbaar;
    var liquidatiekosten=activaLiquidatie*(p.liqKostenPct/100);
    liquidatiewaarde=activaLiquidatie-liquidatiekosten-(kortlopendeSchulden||0)-(langlopendeSchulden||0);
    liquidatieDetail={liquideMiddelen:liquideMiddelen,debiteurenInbaar:debiteurenInbaar,wipInbaar:wipInbaar,liquidatiekosten:liquidatiekosten,schulden:(kortlopendeSchulden||0)+(langlopendeSchulden||0)};
  }

  // Overwinstmethode (25 juli 2026, herbouwd na de vierde kwartaalaudit P1 #5 — de vorige versie was
  // een arbitrair percentage van de omzet, geen overwinstmethode). Erkende methode: overwinst =
  // genormaliseerde nettowinst - (normrendement% x eigen vermogen); goodwill = overwinst /
  // kapitalisatievoet (perpetuity-kapitalisatie, geen aantal-jaren-factor — dat zou zelf weer een
  // ongefundeerde aanname zijn). "Nettoresultaat na belasting" komt uit de al bestaande DD-balansvelden
  // (financieel_resultaat); normrendement% en kapitalisatievoet% zijn — net als de liquidatie-
  // percentages hierboven — bewust GEEN vooringevulde branchenorm, de begeleider vult ze zelf in.
  // Een negatieve overwinst (nettowinst lager dan het normrendement rechtvaardigt) levert een
  // negatieve/nihil-goodwill op — dat is een geldige uitkomst van de methode, geen fout, en wordt
  // als zodanig getoond, niet weggemoffeld.
  var nettowinstNorm=dvGeldOfNull('financieel_resultaat');
  var normaleWinst=null, overwinst=null, goodwill=null;
  if(nettowinstNorm!==null&&eigenVermogen!==null&&p.goodwillNormrendementPct){
    normaleWinst=eigenVermogen*(p.goodwillNormrendementPct/100);
    overwinst=nettowinstNorm-normaleWinst;
    if(p.goodwillKapitalisatievoetPct){
      goodwill=overwinst/(p.goodwillKapitalisatievoetPct/100);
    }
  }

  return {intrinsiek:intrinsiek,liquidatiewaarde:liquidatiewaarde,liquidatieDetail:liquidatieDetail,nettowinstNorm:nettowinstNorm,normaleWinst:normaleWinst,overwinst:overwinst,goodwill:goodwill,omzetLaatste:omzetLaatste};
}

// Synergie-analyse (25 juli 2026): het bestaande DD-veld "Cross-sell — klanten met meerdere diensten
// (%)" (commercieel_crossSell) werd tot nu toe nergens verwerkt tot een waardebijdrage — puur getoond
// als kengetal. Deze functie berekent een echte synergiewaarde: kosten- en omzetsynergieën bouwen
// lineair op van 0 naar het volledige jaarlijkse bedrag over synergieRealisatieJaren (realistischer
// dan meteen jaar 1 op volle kracht — integratie kost tijd), daarna vlak voor de rest van de horizon.
// NPV verdisconteert de jaarlijkse synergiekasstroom tegen dezelfde discontovoet als de DCF-
// kruiscontrole hierboven, min de eenmalige implementatiekosten (jaar 0, niet contant gemaakt).
// Bedragen zijn volledig door de gebruiker ingevoerd (geen DD-veld dat een synergiebedrag ople-
// vert) — het cross-sell-percentage is bewust alleen ter referentie in de UI, niet automatisch
// vertaald naar een euro-bedrag, want dat zou een aanname over de gemiddelde waarde per cross-sell
// zijn die dit platform niet kan onderbouwen (GOUDEN STANDAARD: geen gegokte omrekening).
function dvBerekenSynergie(p){
  if(!p.synergieAan)return null;
  var rows=[];
  var r=p.discontovoetPct/100;
  // Audit-fix P3 (25 juli 2026, vierde ronde, Marcels keuze): synergiebedragen worden nu na
  // belasting verdisconteerd, consistent met de EBITDA-kasstromen elders in het Dealvoorstel (DCF/
  // schuldafbouw rekenen ook na VpB). Implementatiekosten blijven onbelast aftrekbaar in jaar 0 (geen
  // aanname over fiscale aftrekbaarheid daarvan — puur de synergie-kasstroom zelf wordt belast).
  var naBelastingFactor=1-(p.vpbPct/100);
  var npv=-(p.synergieImplementatiekosten||0);
  for(var j=1;j<=p.horizonJaren;j++){
    var factor=p.synergieRealisatieJaren>0?Math.min(1,j/p.synergieRealisatieJaren):1;
    var kostensynergie=p.synergieKostenJaarlijks*factor;
    var omzetsynergie=p.synergieOmzetJaarlijks*factor;
    var totaal=kostensynergie+omzetsynergie;
    var totaalNaBelasting=totaal*naBelastingFactor;
    var contant=totaalNaBelasting/Math.pow(1+r,j);
    npv+=contant;
    rows.push({jaar:j,kostensynergie:kostensynergie,omzetsynergie:omzetsynergie,totaal:totaal,totaalNaBelasting:totaalNaBelasting,contant:contant});
  }
  return {rows:rows,npv:npv,implementatiekosten:p.synergieImplementatiekosten||0,vpbPct:p.vpbPct};
}

// Scenarioanalyse (25 juli 2026): drie operationele scenario's (downside/base/upside) op de
// groeivoet, breder dan de bestaande EBITDA×multiple-gevoeligheidstabel (dvBerekenGevoeligheid) die
// alleen één jaar EBITDA varieert tegen de multiple-range. Hier groeit de bewezen EBITDA over de
// volledige horizon (dezelfde horizonJaren als de schuldafbouw) met een af- of opwaartse afwijking
// t.o.v. de basis-groeivoet. scenarioGroeiDeltaPct is een door de gebruiker aan te passen swing (geen
// vastgestelde norm) — vergelijkbaar met de al bestaande ±10%-scenario's in dvBerekenPrijsmechanisme.
function dvBerekenScenarios(p){
  if(!p.scenarioAan)return null;
  var delta=p.scenarioGroeiDeltaPct||0;
  var varianten=[
    {label:'Downside',groeiDelta:-delta},
    {label:'Base case',groeiDelta:0},
    {label:'Upside',groeiDelta:delta}
  ];
  return varianten.map(function(v){
    var groei=(p.groeiPct+v.groeiDelta)/100;
    var ebitda=p.ebitdaBewezen;
    for(var j=1;j<=p.horizonJaren;j++){ebitda*=(1+groei);}
    return {label:v.label,groeiPct:p.groeiPct+v.groeiDelta,ebitdaEind:ebitda,waardeLaag:ebitda*p.multipleBasis,waardeHoog:ebitda*p.multipleBovengrens};
  });
}

function dvRenderTabelHtml(kolommen,rows){
  var head='<tr>'+kolommen.map(function(k,i){return '<th style="padding:6px 10px;text-align:'+(i===0?'left':'right')+';font-size:9pt;text-transform:uppercase;letter-spacing:.05em;color:#8a8880;border-bottom:2px solid #ccc;white-space:nowrap">'+k+'</th>';}).join('')+'</tr>';
  var body=rows.map(function(r){
    return '<tr>'+r.map(function(c,i){return '<td style="padding:5px 10px;text-align:'+(i===0?'left':'right')+';border-bottom:1px solid #eee;font-size:10pt;white-space:nowrap">'+esc(String(c))+'</td>';}).join('')+'</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;margin:.5rem 0 1.25rem">'+head+body+'</table>';
}

function dvTabelCijfers(){
  var jaren=[
    parseGeld(S.data['financieel_omzet1']),
    parseGeld(S.data['financieel_omzet2']),
    parseGeld(S.data['financieel_omzet3'])
  ];
  var ebitda=parseGeld(S.data['financieel_ebitdaNorm']||S.data['financieel_ebitda']||'0');
  var marge=jaren[2]?(ebitda/jaren[2]*100):0;
  return dvRenderTabelHtml(['','Jaar 1','Jaar 2','Jaar 3 (bewezen)'],[
    ['Omzet (€ mln)',dvMln(jaren[0]),dvMln(jaren[1]),dvMln(jaren[2])],
    ['EBITDA jaar 3 (€ mln)','','',dvMln(ebitda)],
    ['EBITDA-marge jaar 3','','',dvPct(marge)]
  ]);
}

function dvTabelPrijsmechanisme(scenarios){
  return dvRenderTabelHtml(['Scenario','EBITDA (€ mln)','Multiple','EV (€ mln)','Deel koper (€ mln)','Deel verkoper (€ mln)'],
    scenarios.map(function(s){return [s.label,dvMln(s.ebitda),dvMultiple(s.multiple),dvMln(s.ev),dvMln(s.deelKoper),dvMln(s.deelVerkoper)];}));
}

function dvTabelClosing(closing){
  return dvRenderTabelHtml(['','€ mln'],[
    ['Ondernemingswaarde (bewezen basis)',dvMln(closing.evBasis)],
    ['Deel koper bij closing',dvMln(closing.deelKoperBasis)],
    ['Behouden belang verkoper',dvMln(closing.deelVerkoperBasis)],
    ['Ondernemingswaarde bij volledige realisatie',dvMln(closing.evPrognose)],
    ['Earn-up (extra bij realisatie)',dvMln(closing.earnUp)]
  ]);
}

function dvTabelEarnOut(eo){
  if(!eo)return '';
  return dvRenderTabelHtml(['Jaar','Tranche bij behaalde doelgroei','Cumulatief uitgekeerd'],
    eo.rows.map(function(r){return [r.jaar,dvMln(r.tranche),dvMln(r.cumulatief)];}));
}

function dvTabelSchuldafbouw(rows){
  return dvRenderTabelHtml(['Jaar','EBITDA','Rente','VpB','Capex','&#916; Werkkapitaal','FCF','Earn-up','Netto schuld','ND/EBITDA'],
    rows.map(function(r){return [r.jaar,dvMln(r.ebitda),dvMln(r.rente),dvMln(r.vpb),dvMln(r.capex),dvMln(r.nwcMutatie||0),dvMln(r.fcf),dvMln(r.earnUp),dvMln(r.nettoSchuld),dvMultiple(r.leverage)];}));
}

function dvTabelVendorLoan(rows){
  if(!rows)return '';
  return dvRenderTabelHtml(['Jaar','Rente','Aflossing','Totale betaling','Restschuld'],
    rows.map(function(r){return [r.jaar,dvMln(r.rente),dvMln(r.aflossing),dvMln(r.totaal),dvMln(r.restschuld)];}));
}

function dvTabelAlternatieveWaarderingen(alt,p){
  var rows=[];
  rows.push(['Intrinsieke waarde (netto vermogenswaarde)',alt.intrinsiek!==null?dvMln(alt.intrinsiek):'onbekend — eigen vermogen niet ingevuld']);
  if(alt.liquidatiewaarde!==null){
    rows.push(['Liquidatiewaarde',dvMln(alt.liquidatiewaarde)]);
    rows.push(['— waarvan liquide middelen (100%)',dvMln(alt.liquidatieDetail.liquideMiddelen)]);
    rows.push(['— waarvan debiteuren ('+p.liqDebiteurenPct+'% inbaar, aanname)',dvMln(alt.liquidatieDetail.debiteurenInbaar)]);
    rows.push(['— waarvan onderhanden werk ('+p.liqWipPct+'% inbaar, aanname)',dvMln(alt.liquidatieDetail.wipInbaar)]);
    rows.push(['— af: liquidatiekosten ('+p.liqKostenPct+'%, aanname)','-'+dvMln(alt.liquidatieDetail.liquidatiekosten)]);
    rows.push(['— af: totale schulden','-'+dvMln(alt.liquidatieDetail.schulden)]);
  } else {
    rows.push(['Liquidatiewaarde','onbekend — balansvelden (liquide middelen, schulden) niet volledig ingevuld']);
  }
  if(alt.goodwill!==null){
    rows.push(['Genormaliseerde nettowinst',dvMln(alt.nettowinstNorm)]);
    rows.push(['— af: normale winst ('+p.goodwillNormrendementPct+'% normrendement op eigen vermogen, aanname)','-'+dvMln(alt.normaleWinst)]);
    rows.push(['= Overwinst',dvMln(alt.overwinst)]);
    rows.push(['Goodwill (overwinst / '+p.goodwillKapitalisatievoetPct+'% kapitalisatievoet, aanname)',dvMln(alt.goodwill)]);
  } else {
    rows.push(['Goodwill-methode (overwinstmethode)','niet berekend — nettoresultaat, eigen vermogen of normrendement/kapitalisatievoet ontbreken']);
  }
  return dvRenderTabelHtml(['','€ mln'],rows);
}

function dvTabelSynergie(syn){
  if(!syn)return '';
  var rows=syn.rows.map(function(r){return [r.jaar,dvMln(r.kostensynergie),dvMln(r.omzetsynergie),dvMln(r.totaal),dvMln(r.totaalNaBelasting),dvMln(r.contant)];});
  var html=dvRenderTabelHtml(['Jaar','Kostensynergie','Omzetsynergie','Totaal (vóór belasting)','Na belasting ('+syn.vpbPct+'%)','Contant gemaakt'],rows);
  html+='<div style="font-size:12px;color:var(--muted);padding:.6rem .75rem;background:var(--card);border-radius:6px;margin-top:-.75rem">'
    +'Eenmalige implementatiekosten: <strong>'+dvMln(syn.implementatiekosten)+' mln</strong> &nbsp;|&nbsp; NPV synergieën (na belasting en aftrek implementatiekosten): <strong>'+dvMln(syn.npv)+' mln</strong>'
    +'</div>';
  return html;
}

function dvTabelScenarios(scenarios,p){
  if(!scenarios)return '';
  var rows=scenarios.map(function(s){return [s.label,s.groeiPct.toFixed(1)+'%/jaar',dvMln(s.ebitdaEind),dvMln(s.waardeLaag)+' – '+dvMln(s.waardeHoog)];});
  var html=dvRenderTabelHtml(['Scenario','Groeivoet','EBITDA na '+p.horizonJaren+' jaar','Ondernemingswaarde (€ mln)'],rows);
  html+='<div style="font-size:12px;color:var(--muted);padding:.6rem .75rem;background:var(--card);border-radius:6px;margin-top:-.75rem">'
    +'Downside/upside wijken '+p.scenarioGroeiDeltaPct+' procentpunt af van de basis-groeivoet ('+p.groeiPct+'%/jaar) — zelf ingestelde bandbreedte, geen vastgestelde norm.'
    +'</div>';
  return html;
}

function dvTabelBuyAndBuild(rows){
  var momCol='MoM';
  var irrCol='IRR* <span title="Vereenvoudigd: jaarlijkse-rendementsindicatie op basis van begin- en eindwaarde van het koperbelang (CAGR-achtig) — geen volledige kasstroom-IRR, want dit model houdt geen tussentijdse eigen-vermogen-inleg per add-on bij." style="cursor:help;color:#8a8880">&#9432;</span>';
  return dvRenderTabelHtml(['Jaar','Deals','Acq. EBITDA','Groeps-EBITDA','Netto schuld','ND/EBITDA','Multiple','EV','Koperswaarde',momCol,irrCol],
    rows.map(function(r){return [r.jaar,r.deals,dvMln(r.acqEbitda),dvMln(r.groepsEbitda),dvMln(r.nettoSchuld),dvMultiple(r.leverage),dvMultiple(r.multiple),dvMln(r.ev),dvMln(r.koperWaarde),(r.mom!=null?dvMultiple(r.mom):'—'),(r.irr!=null?dvPct(r.irr*100):'—')];}))
    +'<div style="font-size:9px;color:#8a8880;margin:-.75rem 0 1rem">* IRR is vereenvoudigd (zie ⓘ) — geen volledige kasstroom-IRR met tussentijdse eigen-vermogen-inleg per add-on.</div>';
}

// Label-waarde tabel met wrappende waardekolom (voor vrije tekstvelden uit de due diligence, i.t.t.
// dvRenderTabelHtml dat nowrap gebruikt en lange teksten dus zou afkappen in de print-weergave).
function dvRenderKenmerkTabel(rows){
  var body=rows.map(function(r){
    return '<tr><td style="padding:5px 10px;text-align:left;border-bottom:1px solid #eee;font-size:10pt;white-space:nowrap;color:#8a8880">'+esc(r[0])+'</td>'
      +'<td style="padding:5px 10px;text-align:left;border-bottom:1px solid #eee;font-size:10pt">'+esc(String(r[1]))+'</td></tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;margin:.5rem 0 1.25rem">'+body+'</table>';
}
function dvVeld(key){var v=S.data[key];return (v&&String(v).trim())?String(v).trim():'niet ingevuld';}
function dvVeldGeld(key){var v=S.data[key];return (v&&String(v).trim())?fmtGeld(parseGeld(v)):'niet ingevuld';}
function dvVeldPct(key){var v=S.data[key];return (v&&String(v).trim())?(String(v).trim()+'%'):'niet ingevuld';}

// Cijferoverzicht & interpretatie: toont de daadwerkelijk door de verkoper aangeleverde DD-cijfers
// (financieel + commercieel + partners), zodat de AI-duiding erna aantoonbaar op echte invoer is gebaseerd.
function dvTabelCijferoverzicht(){
  var rows=[
    ['Jaaromzet jaar 1',dvVeldGeld('financieel_omzet1')],
    ['Jaaromzet jaar 2',dvVeldGeld('financieel_omzet2')],
    ['Jaaromzet jaar 3 (bewezen)',dvVeldGeld('financieel_omzet3')],
    ['Omzet YTD huidig jaar',dvVeldGeld('financieel_omzetYTD')],
    ['Omzetforecast komend jaar',dvVeldGeld('financieel_forecast')],
    ['EBITDA jaar 3 (absoluut)',dvVeldGeld('financieel_ebitda')],
    ['EBITDA-marge jaar 3',dvVeldPct('financieel_ebitdaMarge')],
    ['Genormaliseerde EBITDA',dvVeldGeld('financieel_ebitdaNorm')],
    ['Normalisatie eenmalige posten',dvVeldGeld('financieel_normalisatie')],
    ['Recurring omzet',dvVeldPct('financieel_recurring')],
    ['Partnerbeloning per jaar',dvVeldGeld('financieel_partnerBel')],
    ['Onderhanden werk (OHW)',dvVeldGeld('financieel_wip')],
    ['Debiteuren totaal',dvVeldGeld('financieel_debiteuren')],
    ['Nettoresultaat na belasting',dvVeldGeld('financieel_resultaat')],
    ['Eigen vermogen',dvVeldGeld('financieel_eigenVermogen')],
    ['Balanstotaal',dvVeldGeld('financieel_balansTotaal')],
    ['Liquide middelen',dvVeldGeld('financieel_liquideMiddelen')],
    ['Kortlopende schulden',dvVeldGeld('financieel_kortlopendeSchulden')],
    ['Langlopende schulden / leningen',dvVeldGeld('financieel_langlopendeSchulden')],
    ['Personeelskosten (% omzet)',dvVeldPct('financieel_kostenPersoneel')],
    ['Aantal actieve klanten',dvVeld('commercieel_aantalKlanten')],
    ['Grootste klant — aandeel omzet',dvVeldPct('commercieel_top1pct')],
    ['Top 10 klanten — aandeel omzet',dvVeldPct('commercieel_top10pct')],
    ['Klantverloop per jaar',dvVeldPct('commercieel_churn')],
    ['Cross-sell (klanten met meerdere diensten)',dvVeldPct('commercieel_crossSell')],
    ['Aantal partners/eigenaren',dvVeld('partner_aantalP')],
    ['Omzet per partner',dvVeldGeld('partner_omzetPerP')],
    ['Opvolgingskandidaat aanwezig',dvVeld('partner_opvolging')],
    ['Concurrentiebeding sleutelfiguren',dvVeld('partner_concurrentieBeding')]
  ];
  return dvRenderKenmerkTabel(rows);
}

// Gevoeligheidstabel: EBITDA-scenario's (bewezen/prognose ±10%) tegen de gekozen multiple-range,
// zodat de impact van de aannames op de waardering direct zichtbaar is.
function dvBerekenGevoeligheid(p){
  var ebitdaScenarios=[
    {label:'Bewezen −10%',ebitda:p.ebitdaBewezen*0.9},
    {label:'Bewezen',ebitda:p.ebitdaBewezen},
    {label:'Prognose',ebitda:p.ebitdaPrognose},
    {label:'Prognose +10%',ebitda:p.ebitdaPrognose*1.1}
  ];
  var multiples=[
    {label:'Laag ('+dvMultiple(p.multipleBasis)+')',m:p.multipleBasis},
    {label:'Midden ('+dvMultiple((p.multipleBasis+p.multipleBovengrens)/2)+')',m:(p.multipleBasis+p.multipleBovengrens)/2},
    {label:'Hoog ('+dvMultiple(p.multipleBovengrens)+')',m:p.multipleBovengrens}
  ];
  return {ebitdaScenarios:ebitdaScenarios,multiples:multiples};
}
function dvTabelGevoeligheid(g){
  var kolommen=['EBITDA-scenario (€ mln)'].concat(g.multiples.map(function(m){return m.label;}));
  var rows=g.ebitdaScenarios.map(function(s){
    var row=[s.label+' — '+dvMln(s.ebitda)];
    g.multiples.forEach(function(m){row.push(dvMln(s.ebitda*m.m));});
    return row;
  });
  return dvRenderTabelHtml(kolommen,rows);
}

// Meerjarige trendanalyse op basis van de aangeleverde omzetcijfers (3 jaar + YTD + forecast).
// EBITDA-marge is maar over 1 jaar uitgevraagd — expliciet zo gelabeld, geen verzonnen historie.
function dvTabelTrend(){
  var o1=parseGeld(S.data['financieel_omzet1']);
  var o2=parseGeld(S.data['financieel_omzet2']);
  var o3=parseGeld(S.data['financieel_omzet3']);
  var oYTD=parseGeld(S.data['financieel_omzetYTD']);
  var forecast=parseGeld(S.data['financieel_forecast']);
  function groei(van,naar){return van?dvPct((naar-van)/van*100):'—';}
  var rows=[
    ['Jaar 1',dvMln(o1),'—'],
    ['Jaar 2',dvMln(o2),groei(o1,o2)],
    ['Jaar 3 (bewezen)',dvMln(o3),groei(o2,o3)],
    ['YTD huidig jaar',oYTD?dvMln(oYTD):'—','—'],
    ['Forecast komend jaar',forecast?dvMln(forecast):'—',groei(o3,forecast)]
  ];
  var margeRaw=S.data['financieel_ebitdaMarge'];
  var margeNoot='<div style="font-size:10px;color:#8a8880;margin-top:.35rem">EBITDA-marge: '
    +(margeRaw?esc(String(margeRaw).trim())+'% (jaar 3 — enige beschikbare meetpunt; geen meerjarige margereeks ingevuld)':'niet ingevuld')+'</div>';
  return dvRenderTabelHtml(['Periode','Omzet (€ mln)','Groei t.o.v. vorig'],rows)+margeNoot;
}

// Vergelijkbare transacties: toont de door de adviseur zelf onderhouden sectorbenchmarks (met bron)
// letterlijk — de AI schrijft hier geen eigen tekst over, om verzonnen "comparables" te voorkomen.
function dvBlokVergelijkbareTransacties(){
  var sp=getSectorProfiel();
  var tekst=(sp&&sp.docBenchmarks)?sp.docBenchmarks:'Geen sectorreferenties beschikbaar voor deze sector.';
  return '<div style="background:#f7f5f0;border:1px solid #e0ddd4;border-radius:6px;padding:12px 16px;margin:.5rem 0 1.25rem;font-size:10pt;color:#2a2825;white-space:pre-line">'+esc(tekst)+'</div>';
}

// FCFF (kasstroom vóór financieringseffecten) afleiden uit de schuldaflossingsprojectie
// (dvBerekenSchuldafbouw). Die projectie rekent zelf bewust met een na-rente kasstroom (r.fcf) —
// terecht voor dát doel, want de bankschuld wordt afgelost met de kasstroom die na rentebetaling
// overblijft. Maar diezelfde na-rente kasstroom (FCFE-achtig) verdisconteren tegen WACC en het
// resultaat "Ondernemingswaarde (DCF)" noemen was een methodefout: WACC/ondernemingswaarde
// veronderstelt een kasstroom vóór financieringseffecten, anders wordt het rente-effect dubbel
// verdisconteerd (eerst als lagere kasstroom, dan nogmaals via de discontovoet). Gevonden bij de
// vierde kwartaalaudit (25 juli 2026, P1 #6). Gedeeld door dvBerekenDCF() en
// dvBerekenDCFGevoeligheid() zodat ze nooit uiteen kunnen lopen.
function dvFcffRijen(schuldafbouwRows,p){
  return schuldafbouwRows.slice(1).map(function(r){
    var vpbOpEbitda=Math.max(0,r.ebitda)*(p.vpbPct/100);
    return {jaar:r.jaar,fcf:r.ebitda-vpbOpEbitda-r.capex-(r.nwcMutatie||0)};
  });
}

// DCF als kruiscontrole op de EBITDA-multiple-waardering: contante waarde van de FCFF-projectie
// (dvFcffRijen) + terminal value o.b.v. de bestaande groei-aanname. Bij WACC ≤ groeivoet is de
// Gordon Growth-formule wiskundig ongeldig — dan null teruggeven i.p.v. een gefabriceerde 0
// (zelfde gouden-standaard-behandeling als dvBerekenDCFGevoeligheid hieronder, die dit al goed deed).
function dvBerekenDCF(p,schuldafbouwRows){
  var d=p.discontovoetPct/100;
  var g=p.groeiPct/100;
  var projRows=dvFcffRijen(schuldafbouwRows,p);
  var pvSom=0,detail=[];
  projRows.forEach(function(r,i){
    var jaarIdx=i+1;
    var factor=Math.pow(1+d,jaarIdx);
    var pv=r.fcf/factor;
    pvSom+=pv;
    detail.push({jaar:r.jaar,fcf:r.fcf,factor:factor,pv:pv});
  });
  var laatsteFcf=projRows.length?projRows[projRows.length-1].fcf:0;
  var geldig=d>g;
  var terminalValueEind=geldig?(laatsteFcf*(1+g))/(d-g):null;
  var terminalValuePv=geldig?(terminalValueEind/Math.pow(1+d,projRows.length)):null;
  var evDcf=geldig?(pvSom+terminalValuePv):null;
  var deelKoperDcf=geldig?(evDcf*(p.belangPct/100)):null;
  return {detail:detail,pvSom:pvSom,terminalValueEind:terminalValueEind,terminalValuePv:terminalValuePv,evDcf:evDcf,deelKoperDcf:deelKoperDcf,geldig:geldig};
}
function dvTabelDCF(dcf){
  var tabel=dvRenderTabelHtml(['Jaar','FCFF (€ mln)','Discontofactor','Contante waarde (€ mln)'],
    dcf.detail.map(function(r){return [r.jaar,dvMln(r.fcf),dvMultiple(r.factor),dvMln(r.pv)];}));
  var na='n.v.t. (WACC ≤ groeivoet — Gordon Growth-formule ongeldig)';
  var samenvatting=dvRenderTabelHtml(['DCF-uitkomst','€ mln'],[
    ['Som contante waarde FCFF-periode',dvMln(dcf.pvSom)],
    ['Terminal value (eindejaar)',dcf.geldig?dvMln(dcf.terminalValueEind):na],
    ['Terminal value (contant gemaakt)',dcf.geldig?dvMln(dcf.terminalValuePv):na],
    ['Ondernemingswaarde (DCF)',dcf.geldig?dvMln(dcf.evDcf):na],
    ['Deel koper (DCF-methode)',dcf.geldig?dvMln(dcf.deelKoperDcf):na]
  ]);
  return tabel+samenvatting;
}

// Bredere DCF-gevoeligheidsanalyse: WACC × groeivoet-matrix (25 juli 2026) — tot nu toe was alleen
// EBITDA×multiple-gevoeligheid beschikbaar (dvBerekenGevoeligheid), niets voor de DCF-methode zelf.
// Houdt de expliciete FCF-projectieperiode vast (die hangt af van de operationele groeivoet in de
// schuldafbouw, niet van de discontovoet) en varieert alleen de discontovoet en de terminale
// groeivoet bij het contant maken — dat zijn precies de twee aannames waar een DCF het gevoeligst
// voor is. dcfWaccDeltaPct/dcfGroeiDeltaPct zijn zelf in te stellen bandbreedtes, geen norm.
function dvBerekenDCFGevoeligheid(p,schuldafbouwRows){
  var projRows=dvFcffRijen(schuldafbouwRows,p);
  var laatsteFcf=projRows.length?projRows[projRows.length-1].fcf:0;
  var waccDelta=p.dcfWaccDeltaPct||0, groeiDelta=p.dcfGroeiDeltaPct||0;
  var waccWaarden=[p.discontovoetPct-waccDelta,p.discontovoetPct,p.discontovoetPct+waccDelta];
  var groeiWaarden=[p.groeiPct-groeiDelta,p.groeiPct,p.groeiPct+groeiDelta];
  var matrix=waccWaarden.map(function(waccPct){
    var d=waccPct/100;
    var pvSom=0;
    projRows.forEach(function(r,i){pvSom+=r.fcf/Math.pow(1+d,i+1);});
    return groeiWaarden.map(function(groeiPct){
      var g=groeiPct/100;
      if(d<=g)return null; // DCF-formule ongeldig bij deze combinatie — nooit een gegokte waarde tonen
      var tv=(laatsteFcf*(1+g))/(d-g);
      var tvPv=tv/Math.pow(1+d,projRows.length);
      return pvSom+tvPv;
    });
  });
  return {waccWaarden:waccWaarden,groeiWaarden:groeiWaarden,matrix:matrix};
}
function dvTabelDCFGevoeligheid(gv){
  var kolommen=['WACC \\ Groeivoet'].concat(gv.groeiWaarden.map(function(g){return g.toFixed(1)+'%';}));
  var rows=gv.matrix.map(function(rij,i){
    return [gv.waccWaarden[i].toFixed(1)+'%'].concat(rij.map(function(v){return v!==null?dvMln(v):'n.v.t. (WACC ≤ groei)';}));
  });
  return dvRenderTabelHtml(kolommen,rows);
}

// Grafieken (25 juli 2026) — tot nu toe stond alles als tabellen. Geen library (zelfde overweging als
// bij de CSV-export): dependency-vrije inline SVG, dus werkt ook in de geprinte PDF-weergave.
// Audit-fix P2 (25 juli 2026, vierde ronde): titel-param + role="img"/aria-label/<title> zodat een
// screenreader de grafiek niet gewoon overslaat — SVG heeft standaard geen tekst-equivalent.
function dvSvgBarChart(items,titel){
  var w=560,h=200,padLeft=10,padBottom=36,padTop=28,padRight=10;
  var chartW=w-padLeft-padRight,chartH=h-padTop-padBottom;
  var maxVal=Math.max.apply(null,items.map(function(i){return i.waarde;}).concat([0]));
  var gap=chartW/items.length,barW=gap*0.55;
  function y(val){return padTop+chartH-(maxVal?(val/maxVal)*chartH:0);}
  var bars=items.map(function(item,i){
    var x=padLeft+i*gap+(gap-barW)/2;
    var barY=y(item.waarde);
    var barH=Math.max(chartH-(barY-padTop),1);
    return '<rect x="'+x.toFixed(1)+'" y="'+barY.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" fill="'+(item.kleur||'var(--teal)')+'" rx="3"/>'
      +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+(barY-8).toFixed(1)+'" text-anchor="middle" font-size="12" font-family="IBM Plex Mono, monospace" fill="var(--sub)">'+esc(fmtGeld(item.waarde))+'</text>'
      +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+(h-padBottom+18).toFixed(1)+'" text-anchor="middle" font-size="11" font-family="IBM Plex Sans, sans-serif" fill="var(--muted)">'+esc(item.label)+'</text>';
  }).join('');
  var basislijn='<line x1="'+padLeft+'" y1="'+y(0).toFixed(1)+'" x2="'+(w-padRight)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--border2)" stroke-width="1"/>';
  var titelSafe=esc(titel||'Staafdiagram: '+items.map(function(i){return i.label+' '+fmtGeld(i.waarde);}).join(', '));
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+titelSafe+'" style="max-width:'+w+'px;height:auto;display:block;margin:0 auto"><title>'+titelSafe+'</title>'+basislijn+bars+'</svg>';
}
// Waterfall: elke stap is een increment (delta) t.o.v. de vorige, behalve stappen met isTotal:true —
// die tonen de volledige cumulatieve hoogte vanaf 0 (voor de begin- en eindstaaf van de brug).
function dvSvgWaterfallChart(steps,titel){
  var w=560,h=220,padLeft=10,padBottom=36,padTop=28,padRight=10;
  var chartW=w-padLeft-padRight,chartH=h-padTop-padBottom;
  var running=0;
  var cumuls=steps.map(function(s){
    if(s.isTotal){var c={start:0,end:s.delta,label:s.label,delta:s.delta,isTotal:true};return c;}
    var start=running;running+=s.delta;
    return {start:start,end:running,label:s.label,delta:s.delta,isTotal:false};
  });
  var maxVal=Math.max.apply(null,cumuls.map(function(c){return Math.max(c.start,c.end);}).concat([0]));
  var gap=chartW/steps.length,barW=gap*0.55;
  function y(val){return padTop+chartH-(maxVal?(val/maxVal)*chartH:0);}
  var bars=cumuls.map(function(c,i){
    var x=padLeft+i*gap+(gap-barW)/2;
    var top=Math.min(y(c.start),y(c.end));
    var barH=Math.max(Math.abs(y(c.start)-y(c.end)),1);
    var kleur=c.isTotal?'var(--teal)':(c.delta>=0?'var(--info)':'var(--gold-dark)');
    var label=c.isTotal?fmtGeld(c.end):(c.delta>=0?'+':'')+fmtGeld(c.delta);
    return '<rect x="'+x.toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" fill="'+kleur+'" rx="3"/>'
      +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+(top-8).toFixed(1)+'" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="var(--sub)">'+esc(label)+'</text>'
      +'<text x="'+(x+barW/2).toFixed(1)+'" y="'+(h-padBottom+18).toFixed(1)+'" text-anchor="middle" font-size="11" font-family="IBM Plex Sans, sans-serif" fill="var(--muted)">'+esc(c.label)+'</text>';
  }).join('');
  var basislijn='<line x1="'+padLeft+'" y1="'+y(0).toFixed(1)+'" x2="'+(w-padRight)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--border2)" stroke-width="1"/>';
  var titelSafe=esc(titel||'Waterfall-diagram: '+cumuls.map(function(c){return c.label+' '+(c.isTotal?fmtGeld(c.end):(c.delta>=0?'+':'')+fmtGeld(c.delta));}).join(', '));
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+titelSafe+'" style="max-width:'+w+'px;height:auto;display:block;margin:0 auto"><title>'+titelSafe+'</title>'+basislijn+bars+'</svg>';
}

// CSV-export van het waarderingsscherm (25 juli 2026, op verzoek Marcel — CSV i.p.v. een echt .xlsx,
// want dit platform heeft geen build-systeem/library om een OOXML-spreadsheet te schrijven; CSV opent
// direct in Excel). Puntkomma als scheidingsteken (NL-Excel-standaard, want komma is het decimaalteken
// in de Nederlandse locale) en een UTF-8 BOM zodat € en accenten goed weergegeven worden in Excel.
function dvCsvVeld(x){
  var s=String(x===null||x===undefined?'':x);
  if(/[",;\n]/.test(s))return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function dvExporteerWaarderingCsv(v){
  var rows=[];
  function regel(cols){rows.push(cols.map(dvCsvVeld).join(';'));}
  function leeg(){rows.push('');}

  regel(['Financiële basis']);
  regel(['Omzet jaar 1',Math.round(v.o1)]);
  regel(['Omzet jaar 2',Math.round(v.o2)]);
  regel(['Omzet jaar 3',Math.round(v.o3)]);
  regel(['EBITDA',Math.round(v.ebitdaAmt)]);
  regel(['EBITDA-marge (%)',v.ebitdaPct.toFixed(1)]);
  leeg();

  regel(['Kengetallen & ratio\'s','Waarde']);
  [
    ['Recurring omzet (%)',v.recurring],['Klantverloop/churn (%)',v.churn],['Grootste klant (%)',v.top1pct],
    ['Top 10 klanten (%)',v.top10pct],['Aantal klanten',v.aantalKlanten],['Totaal FTE',v.fte],
    ['Aantal partners',v.aantalP],['Omzet per partner',v.omzetPerP?Math.round(v.omzetPerP):null],['Partnerbeloning',v.partnerBel?Math.round(v.partnerBel):null],
    ['Debiteuren',v.debiteuren?Math.round(v.debiteuren):null],['Onderhanden werk',v.wip?Math.round(v.wip):null],['Declarabiliteit (%)',v.declarab],
    ['Solvabiliteit EV/BT (%)',v.solvabiliteit!==null?v.solvabiliteit.toFixed(1):null],['ROE (%)',v.roe!==null?v.roe.toFixed(1):null],['ROA (%)',v.roa!==null?v.roa.toFixed(1):null],
    ['Current ratio',v.currentRatio!==null?v.currentRatio.toFixed(2):null],['Quick ratio',v.quickRatio!==null?v.quickRatio.toFixed(2):null],['DSCR (vereenvoudigd: EBITDA/schuldenlast)',v.dscr!==null?v.dscr.toFixed(2):null],
    ['Netto schuld/EBITDA',v.netDebtEbitda!==null?v.netDebtEbitda.toFixed(2):null]
  ].forEach(function(r){if(r[1]!==null&&r[1]!==undefined&&r[1]!==0)regel(r);});
  leeg();

  regel(['Waardebepaling as-is ('+(v.multipleType==='omzet'?'omzet':'EBITDA')+'-methode)']);
  regel(['Scenario','Multiple','Waarde (€)']);
  regel(['Laag',v.mLaag,Math.round(v.wLaag)]);
  regel(['Midden',v.mMid,Math.round(v.wMid)]);
  regel(['Hoog',v.mHoog,Math.round(v.wHoog)]);
  regel(['Omzetmethode ('+v.omzetFactor+'×)','',Math.round(v.wOmzet)]);
  leeg();

  regel(['Rolling forecast (3 jaar)']);
  regel(['Jaar','Omzet (€)','EBITDA (€)','Waardebandbreedte laag (€)','Waardebandbreedte hoog (€)']);
  var jLabels=['Huidig','Jaar +1','Jaar +2','Jaar +3'];
  for(var j=0;j<4;j++){
    regel([jLabels[j],Math.round(v.fc[j]),Math.round(v.fcE[j]),Math.round(v.fcW[j]*(v.mLaag/v.mMid)),Math.round(v.fcW[j]*(v.mHoog/v.mMid))]);
  }
  leeg();

  regel(['Earn-out structuur (indicatief)']);
  regel(['Moment','Omzet target (€)','Uitkering (€)','Cumulatief (€)']);
  var cumul=v.fixedKoop;
  regel(['Closing','',Math.round(v.fixedKoop),Math.round(cumul)]);
  for(var k=1;k<=v.earnJaren;k++){
    var tgt=v.o3*Math.pow(1+v.earnTarget/100,k);
    cumul+=v.earnJaarlijks;
    regel(['Jaar '+k,Math.round(tgt),Math.round(v.earnJaarlijks),Math.round(cumul)]);
  }

  return '﻿'+rows.join('\r\n');
}
window.exporteerWaarderingCsv=function(){
  var v=dvBerekenWaardering();
  var csv=dvExporteerWaarderingCsv(v);
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='Waardering_'+(S.code||'export')+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function dvFmtTekst(t){
  if(!t) return '';
  t=t.replace(/^(##+ .+)/gm,function(m){return '<h3>'+m.replace(/^#+\s*/,'')+'</h3>';});
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  return t.split(/\n\n+/).map(function(p){
    p=p.trim();if(!p)return '';
    if(p.indexOf('<h3>')===0)return p;
    if(/^[-•]\s/m.test(p)){
      var items=p.split(/\n/).map(function(l){return l.replace(/^[-•]\s/,'');}).filter(Boolean);
      return '<ul>'+items.map(function(i){return '<li>'+i+'</li>';}).join('')+'</ul>';
    }
    return '<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join('\n');
}

// Vervangt [TABEL:xxx]-markeringen in de AI-tekst door de echte, JS-berekende tabellen.
function dvBouwRapportHtml(aiTekst,tabelMap){
  var parts=(aiTekst||'').split(/\[TABEL:(\w+)\]/);
  var html='';
  for(var i=0;i<parts.length;i++){
    html += (i%2===0) ? dvFmtTekst(parts[i]) : (tabelMap[parts[i]]||'');
  }
  return html;
}

function dvHtmlNaarTekst(html){
  return html
    .replace(/<h3>(.*?)<\/h3>/g,'\n\n## $1\n')
    .replace(/<\/tr>/g,'\n')
    .replace(/<\/t[hd]>/g,'  |  ')
    .replace(/<li>(.*?)<\/li>/g,'- $1\n')
    .replace(/<\/p>/g,'\n')
    .replace(/<br>/g,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function printDealvoorstel(bodyHtml,titel){
  var datum=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
  var kleur='#8a5a00';
  var win=window.open('','_blank');
  win.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>'+titel+'<\/title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    // Print is bewust altijd licht (papier), ongeacht het thema van de app — maar dvTabelSynergie()/
    // dvTabelScenarios() (en andere gedeelde tabelfuncties) gebruiken var(--muted)/var(--card) zodat
    // dezelfde HTML ook correct is in de donkere modus van #dv-preview hierboven. Zonder deze :root-
    // definitie zouden die var()'s hier onopgelost blijven (transparante/wegvallende highlight-vakken).
    +':root{--muted:#8a8880;--card:#f0eeea}'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{font-family:IBM Plex Sans,Helvetica,Arial,sans-serif;font-size:11pt;line-height:1.75;color:#1a1815;background:#fff}'
    +'.page{max-width:780px;margin:0 auto;padding:2cm}'
    +'.doc-header{padding-bottom:1.25rem;border-bottom:3px solid '+kleur+';margin-bottom:2rem}'
    +'.doc-title{font-family:Playfair Display,serif;font-size:20pt;font-weight:600;color:'+kleur+'}'
    +'.doc-sub{font-size:9pt;color:#8a8880;margin-top:.4rem}'
    +'h3{font-size:10pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:'+kleur+';margin:1.75rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid #e8e5df}'
    +'p{margin-bottom:.75rem;color:#2a2825;font-size:10.5pt}'
    +'ul{margin:.5rem 0 .75rem 1.75rem}'
    +'li{margin-bottom:.35rem;color:#2a2825;font-size:10.5pt}'
    +'strong{font-weight:600}'
    +'table{width:100%}'
    +'.doc-footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e8e5df;font-size:8pt;color:#aaa8a2;display:flex;justify-content:space-between}'
    +'@media print{ body{padding:0} .page{max-width:100%;padding:0} @page{margin:2cm;size:A4} }'
    +'</style></head><body><div class="page">'
    +'<div class="doc-header"><div class="doc-title">'+esc(titel)+'</div><div class="doc-sub">' + BRAND.bedrijf + ' &middot; '+datum+' &middot; Vertrouwelijk &mdash; denkrichting, geen waardering, geen bod</div></div>'
    +bodyHtml
    +'<div class="doc-footer"><span>' + BRAND.bedrijf + '</span><span>'+datum+'</span></div>'
    +'</div></body></html>');
  win.document.close();
  win.focus();
}

// Eén centrale berekening voor de waardering — gebruikt door zowel renderWaardering() (het scherm)
// als de AI-waarderingsrapport-generator (06-schermen.js). Voorheen berekende het AI-rapport deze
// cijfers zelf opnieuw, met een fout (EBITDA-marge-veld werd verward met het EBITDA-bedrag-veld) en
// zonder de extra indicatoren — met als gevolg een rapport dat andere/verkeerde cijfers noemde dan
// het waarderingsscherm zelf. Nu is er precies één bron van waarheid.
function dvBerekenWaardering(){
  var o1=parseGeld(S.data['financieel_omzet1']);
  var o2=parseGeld(S.data['financieel_omzet2']);
  var o3=parseGeld(S.data['financieel_omzet3']);
  var omzetYTD=parseGeld(S.data['financieel_omzetYTD']);
  // Genormaliseerde EBITDA i.p.v. ruw bedrag, consistent met dvGetDefaults() (audit-fix P1,
  // 25 juli 2026: hoofdscherm en dealvoorstel toonden voorheen een ander cijfer omdat alleen de
  // dealvoorstel-module al de genormaliseerde waarde gebruikte).
  var ebitdaAbs=parseGeld(S.data['financieel_ebitdaNorm']||S.data['financieel_ebitda']);
  var ebitdaPct=parseFloat(S.data['financieel_ebitdaMarge'])||(o3?ebitdaAbs/o3*100:0);
  var partnerBel=parseGeld(S.data['financieel_partnerBel']);
  var recurring=parseFloat(S.data['financieel_recurring'])||0;
  var declarab=parseFloat(S.data['financieel_declarab'])||0;
  var wip=parseGeld(S.data['financieel_wip']);
  var debiteuren=parseGeld(S.data['financieel_debiteuren']);
  var fte=parseFloat(S.data['partner_fte'])||0;
  var aantalP=parseFloat(S.data['partner_aantalP'])||0;
  var omzetPerP=parseGeld(S.data['partner_omzetPerP']);
  var aantalKlanten=parseFloat(S.data['commercieel_aantalKlanten'])||0;
  var top1pct=parseFloat(S.data['commercieel_top1pct'])||0;
  var top10pct=parseFloat(S.data['commercieel_top10pct'])||0;
  var churn=parseFloat(S.data['commercieel_churn'])||0;

  // Klassieke financiële ratio's (audit-fix, 25 juli 2026) — elke ratio is null (niet 0) zolang de
  // benodigde balans-/schuldvelden niet zijn ingevuld, zodat dvIndicatorenRij() 'm dan overslaat i.p.v.
  // een misleidend "0,0%" of "0,00×" te tonen. eigenVermogen valt terug op de oudere mkb-veldnaam
  // 'eigVermoeden' (zelfde concept, andere id om bestaande trajectdata niet te breken).
  var resultaat=dvGeldOfNull('financieel_resultaat');
  var eigenVermogen=dvGeldOfNull('financieel_eigenVermogen');
  if(eigenVermogen===null)eigenVermogen=dvGeldOfNull('financieel_eigVermoeden');
  var balansTotaal=dvGeldOfNull('financieel_balansTotaal');
  var liquideMiddelen=dvGeldOfNull('financieel_liquideMiddelen');
  var kortlopendeSchulden=dvGeldOfNull('financieel_kortlopendeSchulden');
  var langlopendeSchulden=dvGeldOfNull('financieel_langlopendeSchulden');
  var rentelasten=dvGeldOfNull('financieel_rentelasten');
  var aflossingVerplicht=dvGeldOfNull('financieel_aflossingVerplicht');
  var voorraadR=dvGeldOfNull('financieel_voorraad');

  var solvabiliteit=(eigenVermogen!==null&&balansTotaal)?eigenVermogen/balansTotaal*100:null;
  var roe=(resultaat!==null&&eigenVermogen)?resultaat/eigenVermogen*100:null;
  var roa=(resultaat!==null&&balansTotaal)?resultaat/balansTotaal*100:null;
  // Vlottende activa is een samengestelde grootheid (geen los DD-veld) — alleen berekend als
  // liquideMiddelen daadwerkelijk is ingevuld; debiteuren/wip tellen mee met hun bestaande 0-fallback
  // (zelfde conventie als de rest van deze functie hierboven).
  var currentRatio=(liquideMiddelen!==null&&kortlopendeSchulden)?((debiteuren+wip+liquideMiddelen+(voorraadR||0))/kortlopendeSchulden):null;
  var quickRatio=(liquideMiddelen!==null&&kortlopendeSchulden)?((debiteuren+wip+liquideMiddelen)/kortlopendeSchulden):null;
  var schuldenlast=(rentelasten||0)+(aflossingVerplicht||0);
  var dscr=(schuldenlast>0&&ebitdaAbs)?ebitdaAbs/schuldenlast:null;
  // Audit-fix P2 (25 juli 2026, vierde ronde): vereiste voorheen alleen dat één van de twee
  // schuldvelden was ingevuld, maar gebruikte liquideMiddelen daarna sowieso met een ||0-fallback —
  // bij een niet-ingevulde (dus onbekende) kaspositie werd die stilzwijgend als "0 liquide middelen"
  // behandeld, wat de netto schuld overschat. liquideMiddelen moet nu ook expliciet ingevuld zijn.
  var nettoSchuld=(liquideMiddelen!==null&&(kortlopendeSchulden!==null||langlopendeSchulden!==null))?((kortlopendeSchulden||0)+(langlopendeSchulden||0)-liquideMiddelen):null;
  var netDebtEbitda=(nettoSchuld!==null&&ebitdaAbs)?nettoSchuld/ebitdaAbs:null;

  // Multiples (sectornorm) — zelfde bron als dvGetDefaults(), zie dvSectorMultipleRange() hierboven.
  // multipleType bepaalt of de range op EBITDA of op omzet wordt toegepast (P1 #1, vierde
  // kwartaalaudit 25 juli 2026) — bijv. zorg heeft een omzet-multiple (praktijkwaarde), geen
  // EBITDA-multiple, en die twee mogen nooit door elkaar gebruikt worden.
  var mRangeW=dvSectorMultipleRange();
  var mLaag=mRangeW.mLaag,mHoog=mRangeW.mHoog,mMid=(mLaag+mHoog)/2,omzetFactor=0.8;
  var multipleType=mRangeW.basis||'ebitda';

  // Bereken
  var ebitdaAmt=ebitdaAbs||(o3*(ebitdaPct/100));
  var multipleTypeBedrag=multipleType==='omzet'?o3:ebitdaAmt;
  var wLaag=multipleTypeBedrag*mLaag;
  var wMid=multipleTypeBedrag*mMid;
  var wHoog=multipleTypeBedrag*mHoog;
  var wOmzet=o3*omzetFactor;

  // Groei
  var groei=0,steps=0;
  if(o1>0&&o2>0){groei+=(o2-o1)/o1*100;steps++;}
  if(o2>0&&o3>0){groei+=(o3-o2)/o2*100;steps++;}
  var gemGroei=steps>0?groei/steps:3;
  var fc=[o3];
  for(var i=1;i<=3;i++)fc.push(fc[fc.length-1]*(1+gemGroei/100));
  var fcE=fc.map(function(o){return o*(ebitdaPct/100);});
  // Zelfde basis-onderscheid als wLaag/wMid/wHoog hierboven — bij een omzet-multiple moet de rolling
  // forecast de omzetprognose (fc) vermenigvuldigen, niet de EBITDA-prognose (fcE).
  var fcW=multipleType==='omzet'?fc.map(function(o){return o*mMid;}):fcE.map(function(e){return e*mMid;});

  // Earn-out default
  var earnBase=wMid;
  var earnPct=20,earnTarget=5,earnJaren=3;
  var fixedKoop=earnBase*(1-earnPct/100);
  var earnJaarlijks=earnBase*(earnPct/100)/earnJaren;

  return {
    o1:o1,o2:o2,o3:o3,omzetYTD:omzetYTD,ebitdaAbs:ebitdaAbs,ebitdaPct:ebitdaPct,ebitdaAmt:ebitdaAmt,
    partnerBel:partnerBel,recurring:recurring,declarab:declarab,wip:wip,debiteuren:debiteuren,
    fte:fte,aantalP:aantalP,omzetPerP:omzetPerP,aantalKlanten:aantalKlanten,top1pct:top1pct,top10pct:top10pct,churn:churn,
    mLaag:mLaag,mMid:mMid,mHoog:mHoog,omzetFactor:omzetFactor,multipleType:multipleType,multipleTypeBedrag:multipleTypeBedrag,
    wLaag:wLaag,wMid:wMid,wHoog:wHoog,wOmzet:wOmzet,
    gemGroei:gemGroei,fc:fc,fcE:fcE,fcW:fcW,
    earnBase:earnBase,earnPct:earnPct,earnTarget:earnTarget,earnJaren:earnJaren,fixedKoop:fixedKoop,earnJaarlijks:earnJaarlijks,
    solvabiliteit:solvabiliteit,roe:roe,roa:roa,currentRatio:currentRatio,quickRatio:quickRatio,dscr:dscr,netDebtEbitda:netDebtEbitda
  };
}

// Extra kengetallen naast omzet/EBITDA — toont alleen wat daadwerkelijk is ingevuld, zodat het
// waarderingsscherm niet vervuild raakt met een rij nullen bij een net gestart traject.
function dvIndicatorenRij(v){
  var items=[
    {label:'Recurring omzet',val:v.recurring,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'Klantverloop (churn)',val:v.churn,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'Grootste klant',val:v.top1pct,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'Top 10 klanten',val:v.top10pct,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'Aantal klanten',val:v.aantalKlanten,fmt:function(x){return Math.round(x).toLocaleString('nl-NL');}},
    {label:'Totaal FTE',val:v.fte,fmt:function(x){return x.toLocaleString('nl-NL');}},
    {label:'Aantal partners',val:v.aantalP,fmt:function(x){return Math.round(x).toLocaleString('nl-NL');}},
    {label:'Omzet per partner',val:v.omzetPerP,fmt:fmtGeld},
    {label:'Partnerbeloning',val:v.partnerBel,fmt:fmtGeld},
    {label:'Debiteuren',val:v.debiteuren,fmt:fmtGeld},
    {label:'Onderhanden werk',val:v.wip,fmt:fmtGeld},
    {label:'Declarabiliteit',val:v.declarab,fmt:function(x){return x.toFixed(1)+'%';}}
  ].filter(function(it){return it.val&&it.val>0;});
  // Klassieke financiële ratio's (25 juli 2026): apart gefilterd op "!== null" i.p.v. "> 0" — in
  // tegenstelling tot de kengetallen hierboven kan een ratio hier legitiem 0 of negatief zijn (bijv.
  // een negatieve ROE), en dat moet gewoon getoond worden. null betekent hier altijd "onvoldoende
  // balans-/schuldvelden ingevuld om te berekenen", nooit "berekend en toevallig nul".
  var ratioItems=[
    {label:'Solvabiliteit (EV/BT)',val:v.solvabiliteit,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'ROE',val:v.roe,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'ROA',val:v.roa,fmt:function(x){return x.toFixed(1)+'%';}},
    {label:'Current ratio',val:v.currentRatio,fmt:function(x){return x.toFixed(2);}},
    {label:'Quick ratio',val:v.quickRatio,fmt:function(x){return x.toFixed(2);},titel:'Bevat onderhanden werk (OHW) in de teller — bewuste modelkeuze voor een dienstverlener zonder fysieke voorraad, wijkt af van de klassieke quick ratio die voorraadachtige posten juist uitsluit.'},
    {label:'DSCR',val:v.dscr,fmt:function(x){return x.toFixed(2);},titel:'Vereenvoudigd: EBITDA / (rentelasten + aflossingsverplichting) — geen volledige kasstroom na belasting en CAPEX.'},
    {label:'Netto schuld / EBITDA',val:v.netDebtEbitda,fmt:function(x){return x.toFixed(2)+'×';}}
  ].filter(function(it){return it.val!==null&&it.val!==undefined&&isFinite(it.val);});
  var alleItems=items.concat(ratioItems);
  if(!alleItems.length)return '';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:.85rem;padding-top:.85rem;border-top:1px solid var(--border)">'
    +alleItems.map(function(it){
      // Audit-fix P3 (25 juli 2026, vierde ronde): DSCR is een vereenvoudiging (ruwe EBITDA, geen
      // volledige kasstroom na belasting/CAPEX) — nu expliciet gelabeld via een tooltip i.p.v. als
      // een precieze DSCR gepresenteerd te worden.
      return '<div style="text-align:center"'+(it.titel?' title="'+esc(it.titel)+'"':'')+'><div style="font-size:9px;color:var(--muted);margin-bottom:.15rem;text-transform:uppercase;letter-spacing:.04em">'+it.label+(it.titel?' &#9432;':'')+'</div><div style="font-family:IBM Plex Mono,monospace;font-size:12px;font-weight:600;color:var(--sub)">'+it.fmt(it.val)+'</div></div>';
    }).join('')
    +'</div>';
}

function renderWaardering(){
  var t=S.traject||{};
  var isRO=isKoper();
  var v=dvBerekenWaardering();
  var o1=v.o1,o2=v.o2,o3=v.o3,ebitdaAbs=v.ebitdaAbs,ebitdaPct=v.ebitdaPct,ebitdaAmt=v.ebitdaAmt,
    fte=v.fte,recurring=v.recurring,churn=v.churn,
    mLaag=v.mLaag,mMid=v.mMid,mHoog=v.mHoog,omzetFactor=v.omzetFactor,
    wLaag=v.wLaag,wMid=v.wMid,wHoog=v.wHoog,wOmzet=v.wOmzet,
    gemGroei=v.gemGroei,fc=v.fc,fcE=v.fcE,fcW=v.fcW,
    earnBase=v.earnBase,earnPct=v.earnPct,earnTarget=v.earnTarget,earnJaren=v.earnJaren,fixedKoop=v.fixedKoop,earnJaarlijks=v.earnJaarlijks;

  var multipleType=v.multipleType||'ebitda';
  var basisLabel=multipleType==='omzet'?'omzet':'EBITDA';
  var html='<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; Waardering'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button class="btn-ghost btn-sm" onclick="window.print()">PDF</button>'
    +'<button class="btn-ghost btn-sm" onclick="exporteerWaarderingCsv()" title="Downloadbaar als CSV — opent direct in Excel">CSV</button>'
    +'<button class="btn-ghost btn-sm" onclick="S.screen=(isTussen()?\'begeleider\':\'cover\');renderApp()">&#8592; Terug</button>'
    +'</div></div>'
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">Waardebepaling</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem">'+esc(t.kantoor_naam||S.code)+' &middot; '+esc(t.traject_type||'M&A')+'</div>';

  // Disclaimer
  html+='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:10px 14px;margin-bottom:1.5rem;font-size:12px;color:var(--mid);line-height:1.6">'
    +'<strong style="color:var(--gold)">&#9888; Indicatieve waardering</strong> &mdash; Deze berekening is gebaseerd op de ingevoerde due diligence data en sectorale benchmarks. Het betreft een indicatie, geen formeel taxatierapport. ' + esc(t.begeleider_bedrijf||BRAND.bedrijfKort) + ' aanvaardt geen aansprakelijkheid voor beslissingen op basis van dit overzicht.'
    +'</div>';

  // Financieel overzicht
  html+='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">Financiële basis</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'
    +'<div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">Omzet jaar 1</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;color:var(--sub)">'+fmtGeld(o1)+'</div></div>'
    +'<div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">Omzet jaar 2</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;color:var(--sub)">'+fmtGeld(o2)+'</div></div>'
    +'<div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">Omzet jaar 3</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;color:var(--teal)">'+fmtGeld(o3)+'</div></div>'
    +'<div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">EBITDA</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;color:var(--teal)">'+fmtGeld(ebitdaAmt)+' ('+ebitdaPct.toFixed(1)+'%)</div></div>'
    +'</div>'
    +dvIndicatorenRij(v)
    +'</div>';

  // Waardebepaling as-is
  html+='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">Waardebepaling as-is ('+basisLabel+'-methode)</div>'
    +(multipleType==='omzet'?'<div style="font-size:12px;color:var(--gold);background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:8px 12px;margin-bottom:.75rem">Deze sector gebruikt een omzet-multiple (praktijkwaarde), geen EBITDA-multiple. Het Dealvoorstel-scherm (prijsmechanisme, bankfinanciering, schuldaflossing, DCF) blijft EBITDA-based — gebruik daar de cijfers hieronder met dat voorbehoud.</div>':'')
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:.75rem">'
    +'<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1rem;text-align:center">'
      +'<div style="font-size:10px;color:var(--muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.06em">Laag ('+mLaag+'&times; '+basisLabel+')</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;font-weight:600;color:var(--mid)">'+fmtGeld(wLaag)+'</div></div>'
    +'<div style="background:var(--teal-bg);border:2px solid var(--teal-dark);border-radius:var(--r2);padding:1rem;text-align:center">'
      +'<div style="font-size:10px;color:var(--teal-dim);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Midden ('+mMid+'&times; '+basisLabel+')</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:var(--teal)">'+fmtGeld(wMid)+'</div></div>'
    +'<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1rem;text-align:center">'
      +'<div style="font-size:10px;color:var(--muted);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.06em">Hoog ('+mHoog+'&times; '+basisLabel+')</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;font-weight:600;color:var(--mid)">'+fmtGeld(wHoog)+'</div></div>'
    +'</div>'
    +'<div style="font-size:12px;color:var(--mid);padding:.6rem .75rem;background:var(--card);border-radius:var(--r)">'
      +'Omzetmethode ('+omzetFactor+'\xd7): <strong>'+fmtGeld(wOmzet)+'</strong>'
      +(recurring>0?' &nbsp;|&nbsp; Recurring: <strong>'+recurring+'%</strong>':'')
      +(churn>0?' &nbsp;|&nbsp; Churn: <strong>'+churn+'%</strong>':'')
    +'</div>'
    +'<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">'+dvSvgBarChart([
      {label:'Laag ('+mLaag+'\xd7 '+basisLabel+')',waarde:wLaag,kleur:'var(--border2)'},
      {label:'Midden ('+mMid+'\xd7 '+basisLabel+')',waarde:wMid,kleur:'var(--teal)'},
      {label:'Hoog ('+mHoog+'\xd7 '+basisLabel+')',waarde:wHoog,kleur:'var(--border2)'}
    ],'Waardebandbreedte: laag '+fmtGeld(wLaag)+', midden '+fmtGeld(wMid)+', hoog '+fmtGeld(wHoog))+'</div></div>';

  // Rolling forecast
  html+='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">Rolling forecast (3 jaar)</div>'
    +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">Gem. historische groei: <strong style="color:var(--sub)">'+gemGroei.toFixed(1)+'%</strong>/jaar</div>'
    +'<table style="width:100%;border-collapse:collapse"><thead><tr>'
    +'<th style="text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--border)">Jaar</th>'
    +'<th style="text-align:right;padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--border)">Omzet</th>'
    +'<th style="text-align:right;padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--border)">EBITDA</th>'
    +'<th style="text-align:right;padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--border)">Waardebandreedte</th>'
    +'</tr></thead><tbody>';
  var jLabels=['Huidig','Jaar +1','Jaar +2','Jaar +3'];
  for(var j=0;j<4;j++){
    html+='<tr style="'+(j===0?'background:var(--teal-bg)':'')+'">'
      +'<td style="padding:8px 10px;font-size:12px;font-weight:'+(j===0?'600':'400')+';color:var(--sub);border-bottom:1px solid var(--border)">'+jLabels[j]+'</td>'
      +'<td style="padding:8px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;border-bottom:1px solid var(--border)">'+fmtGeld(fc[j])+'</td>'
      +'<td style="padding:8px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--teal);border-bottom:1px solid var(--border)">'+fmtGeld(fcE[j])+'</td>'
      +'<td style="padding:8px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--mid);border-bottom:1px solid var(--border)">'+fmtGeld(fcW[j]*(mLaag/mMid))+' \u2013 '+fmtGeld(fcW[j]*(mHoog/mMid))+'</td>'
      +'</tr>';
  }
  html+='</tbody></table></div>';

  // Earn-out
  html+='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">Earn-out structuur (indicatief)</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:.75rem">'
    +'<div style="background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);padding:.75rem 1rem">'
      +'<div style="font-size:10px;color:var(--teal-dim);font-weight:600;text-transform:uppercase;margin-bottom:.3rem">Koopsom bij closing</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;font-weight:600;color:var(--teal)">'+fmtGeld(fixedKoop)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:.2rem)">'+(100-earnPct)+'% van totale waarde</div>'
    +'</div>'
    +'<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.75rem 1rem">'
      +'<div style="font-size:10px;color:var(--gold);font-weight:600;text-transform:uppercase;margin-bottom:.3rem">Earn-out ('+earnJaren+' jaar)</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;font-weight:600;color:var(--gold)">'+fmtGeld(earnBase*(earnPct/100))+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:.2rem">'+earnPct+'% bij '+earnTarget+'% omzetgroei/jaar</div>'
    +'</div></div>'
    +'<table style="width:100%;border-collapse:collapse"><thead><tr>'
    +'<th style="text-align:left;padding:6px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">Moment</th>'
    +'<th style="text-align:right;padding:6px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">Omzet target</th>'
    +'<th style="text-align:right;padding:6px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">Uitkering</th>'
    +'<th style="text-align:right;padding:6px 10px;font-size:10px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">Cumulatief</th>'
    +'</tr></thead><tbody>';
  var cumul=fixedKoop;
  html+='<tr style="background:var(--teal-bg)"><td style="padding:6px 10px;font-size:12px;color:var(--sub);border-bottom:1px solid var(--border)">Closing</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border)">—</td><td style="padding:6px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--teal);border-bottom:1px solid var(--border)">'+fmtGeld(fixedKoop)+'</td><td style="padding:6px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--teal);border-bottom:1px solid var(--border)">'+fmtGeld(cumul)+'</td></tr>';
  for(var k=1;k<=earnJaren;k++){
    var tgt=o3*Math.pow(1+earnTarget/100,k);
    cumul+=earnJaarlijks;
    html+='<tr><td style="padding:6px 10px;font-size:12px;color:var(--sub);border-bottom:1px solid var(--border)">Jaar '+k+'</td>'
      +'<td style="padding:6px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;border-bottom:1px solid var(--border)">'+fmtGeld(tgt)+'</td>'
      +'<td style="padding:6px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--gold);border-bottom:1px solid var(--border)">'+fmtGeld(earnJaarlijks)+'</td>'
      +'<td style="padding:6px 10px;font-size:12px;font-family:IBM Plex Mono,monospace;text-align:right;border-bottom:1px solid var(--border)">'+fmtGeld(cumul)+'</td></tr>';
  }
  html+='<tr style="background:var(--card)"><td style="padding:6px 10px;font-size:12px;font-weight:600;color:var(--sub)">Totaal</td><td></td><td style="padding:6px 10px;font-size:12px;font-weight:600;font-family:IBM Plex Mono,monospace;text-align:right;color:var(--sub)">'+fmtGeld(earnBase)+'</td><td></td></tr>';
  html+='</tbody></table>';
  var wfSteps=[{label:'Closing',delta:fixedKoop}];
  for(var wk=1;wk<=earnJaren;wk++)wfSteps.push({label:'Jaar '+wk,delta:earnJaarlijks});
  wfSteps.push({label:'Totaal',delta:earnBase,isTotal:true});
  html+='<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">'+dvSvgWaterfallChart(wfSteps,'Earn-out-opbouw: closing '+fmtGeld(fixedKoop)+' plus '+earnJaren+' jaarlijkse termijnen tot een totaal van '+fmtGeld(earnBase))+'</div>'
    +'</div>';

  // AI rapport knop (alleen tussenpersoon)
  if(isTussen()){
    html+='<div id="w-ai-sectie" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
      +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">AI-analyse &amp; waardering</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:.85rem;line-height:1.6">Eén rapport: de due-diligence-bevindingen en de daarop gebaseerde waardering samen, zodat de waardering direct herleidbaar is naar wat er in de dossiers staat. Elk rapport wordt bewaard en gekoppeld aan de cijfers waarmee het is opgesteld. Draait u het opnieuw, dan blijft de vorige versie zichtbaar in de geschiedenis — zo ziet u altijd of een nieuw rapport dezelfde cijfers vanuit een andere invalshoek belicht, of dat de onderliggende cijfers zelf zijn gewijzigd.</div>'
      +'<div id="w-ai-out" style="display:none;margin-bottom:1rem"></div>'
      +'<button class="btn" id="w-ai-btn" style="width:100%">&#9881; Genereer AI-analyse &amp; waardering</button>'
      +'<div id="w-ai-hist" style="margin-top:1rem"></div>'
      +'</div>';

    // Onafhankelijke "second opinion" (gekoppeld aan het gelaagde waarderingsmodel, 5 aug 2026):
    // gebruikt een ANDERE, eveneens deterministische bron dan de rekenkern hierboven — de generieke
    // MKB-omvangcurve (Brookz Overname Barometer) + actuele marktcorrectie, i.p.v. de sectorprofiel-
    // multiples van de rekenkern. De AI kiest zelf geen multiple meer (dat leidde eerder tot
    // fabricatie, ontdekt 5 aug 2026); ze schrijft alleen de onderbouwing/risico's/LoI-tekst bij de
    // server-berekende cijfers. Een verschil tussen de twee bronnen is nuttig signaal — vandaar apart
    // en duidelijk gelabeld.
    html+='<div id="w-ai2-sectie" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
      +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">AI-waardering &middot; second opinion</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:.85rem;line-height:1.6">Onafhankelijk van de rekenkern hierboven: dezelfde soort berekening (omvangcurve + marktcorrectie), maar op basis van de generieke MKB-benchmark i.p.v. het sectorprofiel — de AI kiest geen eigen multiple meer, alleen de onderbouwing. Bedoeld als tweede blik, niet als vervanging &mdash; wijkt dit af van de rekenkern hierboven, dan is dát zelf al een signaal om nader te bekijken.</div>'
      +'<div id="w-ai2-out" style="display:none;margin-bottom:1rem"></div>'
      +'<button class="btn-ghost" id="w-ai2-btn" style="width:100%">&#129302; Genereer AI-waardering (second opinion)</button>'
      +'</div>';
  }

  html+='</div>';
  return html;
}


var logboekCache=null;

async function renderLogboekScreen(app){
  var faseNamen={voorgesprek:'Voorgesprek',kennismaking:'Kennismaking',pre_dd:'Pre-DD (LoI)',due_diligence:'Due Diligence',verkoop:'Verkoop / Closing'};
  var fases=['voorgesprek','kennismaking','pre_dd','due_diligence','verkoop'];
  var isBegOrAdmin=isTussen()||false;
  app.innerHTML='<div style="max-width:700px;margin:0 auto;padding:2rem 1rem">'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem">'
    +'<button class="btn-ghost btn-sm" onclick="S.screen=\'cover\';renderApp()">&#8592; Terug</button>'
    +'<h2 style="font-family:Playfair Display,serif;font-size:1.2rem;color:var(--head);font-weight:600;margin:0">Traject logboek</h2>'
    +'</div>'
    +'<div id="lb-fases" style="display:flex;gap:6px;margin-bottom:1.25rem;flex-wrap:wrap"></div>'
    +'<div id="lb-entries" style="margin-bottom:1.25rem"><div style="color:var(--muted);font-size:13px">Laden...</div></div>'
    +(isBegOrAdmin?'<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="display:flex;gap:8px;margin-bottom:.75rem">'
      +'<button id="lb-tab-notitie" class="btn" style="font-size:12px;padding:6px 14px">&#128221; Notitie</button>'
      +'<button id="lb-tab-meeting" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#127909; Meeting vastleggen</button>'
      +'</div>'
      +'<div id="lb-panel-notitie">'
      +'<textarea id="lb-bericht" rows="3" placeholder="Schrijf een logboeknotitie..." style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:13px;padding:10px 12px;outline:none;resize:vertical;margin-bottom:.75rem"></textarea>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +'<select id="lb-fase" style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:12px;padding:7px 10px;flex:1">'
      +'<option value="">— Fase niet wijzigen —</option>'
      +'<option value="voorgesprek">Voorgesprek</option>'
      +'<option value="kennismaking">Kennismaking</option>'
      +'<option value="pre_dd">Pre-DD (LoI)</option>'
      +'<option value="due_diligence">Due Diligence</option>'
      +'<option value="verkoop">Verkoop / Closing</option>'
      +'</select>'
      +'<button class="btn btn-sm" id="lb-submit">&#43; Opslaan</button>'
      +'</div></div>'
      +'<div id="lb-panel-meeting" style="display:none">'
      +'<div style="font-size:12px;color:var(--muted);margin-bottom:.5rem">Voer vergadernotities in of plak een transcript. De AI structureert automatisch naar samenvatting, beslissingen en actiepunten.</div>'
      +'<div style="display:flex;gap:8px;margin-bottom:.5rem">'
      +'<input type="text" id="lb-meeting-titel" placeholder="Titel" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:13px;padding:9px 12px;outline:none">'
      +'<input type="text" id="lb-meeting-deelnemers" placeholder="Deelnemers" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:13px;padding:9px 12px;outline:none">'
      +'</div>'
      +'<textarea id="lb-meeting-tekst" rows="5" placeholder="Plak hier ruwe vergadernotities, opnametranscript of steekwoorden. AI structureert alles..." style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:13px;padding:10px 12px;outline:none;resize:vertical;margin-bottom:.75rem"></textarea>'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +'<select id="lb-meeting-fase" style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:IBM Plex Sans,sans-serif;font-size:12px;padding:7px 10px;flex:1">'
      +'<option value="">— Fase niet wijzigen —</option>'
      +'<option value="voorgesprek">Voorgesprek</option>'
      +'<option value="kennismaking">Kennismaking</option>'
      +'<option value="pre_dd">Pre-DD (LoI)</option>'
      +'<option value="due_diligence">Due Diligence</option>'
      +'<option value="verkoop">Verkoop / Closing</option>'
      +'</select>'
      +'<button class="btn btn-sm" id="lb-meeting-submit" style="white-space:nowrap">&#9881; AI structureren &amp; opslaan</button>'
      +'</div></div>'
      +'</div>'
    :'<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;font-size:12px;color:var(--muted)">U kunt het logboek inzien. Alleen de begeleider en adviseur kunnen notities toevoegen.</div>')
    +'</div>';

  // Laad logboek
  try{
    var code=S.code;
    var lr=await fetch(WORKER+'/mna/logboek/'+code);
    var ld=await lr.json();
    logboekCache=ld;
    var huidigeFase=ld.traject_fase||'voorgesprek';
    // Fases
    var fDiv=document.getElementById('lb-fases');
    if(fDiv){fDiv.innerHTML=fases.map(function(f,i){
      var actief=f===huidigeFase;var geweest=fases.indexOf(huidigeFase)>i;
      var kleur=actief?'var(--teal)':geweest?'var(--teal-dim)':'var(--border2)';
      var bg=actief?'var(--teal-bg)':geweest?'rgba(26,122,94,.06)':'transparent';
      return '<div style="display:flex;align-items:center;gap:4px">'
        +(i>0?'<div style="width:16px;height:2px;background:'+kleur+';flex-shrink:0"></div>':'')
        +'<div style="font-size:10px;font-weight:600;padding:4px 10px;border-radius:12px;border:1.5px solid '+kleur+';color:'+(actief?'var(--teal)':geweest?'var(--teal-dim)':'var(--muted)')+';background:'+bg+';white-space:nowrap">'+(faseNamen[f]||f)+'</div></div>';
    }).join('');}
    // Entries
    var eDiv=document.getElementById('lb-entries');
    if(eDiv){
      var entries=ld.logboek||[];
      if(!entries.length){eDiv.innerHTML='<div style="color:var(--muted);font-size:13px;font-style:italic;padding:1rem 0">Nog geen logboeknotities.</div>';}
      else{eDiv.innerHTML=entries.map(function(e){
        var dt=new Date(e.created_at).toLocaleString('nl-NL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
        var isAdm=e.auteur_type==='admin';
        return '<div style="padding:.75rem 1rem;margin-bottom:.5rem;border-radius:var(--r);background:'+(isAdm?'var(--teal-bg)':'var(--panel)')+';border:1px solid '+(isAdm?'var(--teal-dark)':'var(--border)')+';border-left:3px solid '+(isAdm?'var(--teal)':'var(--gold)')+'">'
          +(e.fase_gewijzigd?'<div style="font-size:10px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">&#8594; Fase: '+(faseNamen[e.fase]||e.fase)+'</div>':'')
          +'<div style="font-size:13px;color:var(--sub);line-height:1.7;white-space:pre-wrap">'+esc(e.bericht)+'</div>'
          +'<div style="font-size:11px;color:var(--muted);margin-top:5px">'+esc(e.auteur)+' &middot; '+dt+'</div>'
          +'</div>';
      }).join('');eDiv.scrollTop=eDiv.scrollHeight;}
    }
  }catch(e){var ed=document.getElementById('lb-entries');if(ed)ed.innerHTML='<div style="color:var(--red);font-size:13px">Fout bij laden: '+e.message+'</div>';}

  // Submit
  if(isBegOrAdmin){
    var lbBtn=document.getElementById('lb-submit');
    if(lbBtn)lbBtn.addEventListener('click',async function(){
      var bericht=document.getElementById('lb-bericht').value.trim();
      var fase=document.getElementById('lb-fase').value;
      if(!bericht&&!fase){toast('Voer een notitie in of selecteer een fase.','warn');return;}
      lbBtn.disabled=true;lbBtn.textContent='Opslaan...';
      try{
        var lr=await fetch(WORKER+'/mna/logboek/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bericht:bericht,nieuwe_fase:fase||undefined,auteur_naam:S.traject.begeleider_naam||'Begeleider'})});
        var ld=await lr.json();
        if(ld.ok){document.getElementById('lb-bericht').value='';document.getElementById('lb-fase').value='';renderLogboekScreen(app);}
        else toast('Fout: '+(ld.error||'onbekend'),'err');
      }catch(e){toast('Verbindingsfout.','err');}
      lbBtn.disabled=false;lbBtn.textContent='+ Opslaan';
    });

    // Tab switching
    var tabNotitie=document.getElementById('lb-tab-notitie');
    var tabMeeting=document.getElementById('lb-tab-meeting');
    var panelNotitie=document.getElementById('lb-panel-notitie');
    var panelMeeting=document.getElementById('lb-panel-meeting');
    if(tabNotitie&&tabMeeting){
      tabNotitie.onclick=function(){
        panelNotitie.style.display='';panelMeeting.style.display='none';
        tabNotitie.className='btn';tabMeeting.className='btn-ghost';
        tabNotitie.style.fontSize='12px';tabNotitie.style.padding='6px 14px';
        tabMeeting.style.fontSize='12px';tabMeeting.style.padding='6px 14px';
      };
      tabMeeting.onclick=function(){
        panelNotitie.style.display='none';panelMeeting.style.display='';
        tabMeeting.className='btn';tabNotitie.className='btn-ghost';
        tabNotitie.style.fontSize='12px';tabNotitie.style.padding='6px 14px';
        tabMeeting.style.fontSize='12px';tabMeeting.style.padding='6px 14px';
      };
    }

    // Meeting AI structureren
    var meetBtn=document.getElementById('lb-meeting-submit');
    if(meetBtn)meetBtn.addEventListener('click',async function(){
      var titel=document.getElementById('lb-meeting-titel').value.trim();
      var deelnemers=document.getElementById('lb-meeting-deelnemers').value.trim();
      var tekst=document.getElementById('lb-meeting-tekst').value.trim();
      var fase=document.getElementById('lb-meeting-fase').value;
      if(!tekst){toast('Voer vergadernotities in.','warn');return;}
      meetBtn.disabled=true;meetBtn.textContent='AI verwerkt...';
      try{
        var prompt='Structureer de volgende ruwe vergadernotities van een M&A traject in de accountancy-sector naar een professioneel vergaderverslag. '+TAAL_REGELS+'\n\nVERGADERING: '+(titel||'Vergadering')+' | Deelnemers: '+(deelnemers||'onbekend')+'\n\nRUWE NOTITIES:\n'+tekst+'\n\nGeef terug in dit formaat:\n\n## Vergadering: [titel]\nDatum: [datum indien bekend]\nDeelnemers: [deelnemers]\n\n### Samenvatting\n[2-4 zinnen kerninhoud]\n\n### Besproken punten\n- [punt 1]\n- [punt 2]\n\n### Beslissingen\n- [beslissing 1]\n\n### Actiepunten\n- [ ] [actie] — [wie] — [wanneer]\n\n### Volgende stap\n[wat staat er gepland]\n\nCompact en professioneel. Alleen wat relevant is voor het M&A traject.';
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:1500})});
        var rawText=await resp.text();
        var rd;try{rd=JSON.parse(rawText);}catch(e){throw new Error('Geen JSON: '+rawText.substring(0,150));}
        if(!resp.ok)throw new Error('Fout: '+(rd.error||''));
        var gestructureerd=rd.text||'Fout bij verwerken.';
        // Sla op als logboeknotitie
        var lr=await fetch(WORKER+'/mna/logboek/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bericht:gestructureerd,nieuwe_fase:fase||undefined,auteur_naam:S.traject.begeleider_naam||'Begeleider'})});
        var ld=await lr.json();
        if(ld.ok){
          document.getElementById('lb-meeting-titel').value='';
          document.getElementById('lb-meeting-deelnemers').value='';
          document.getElementById('lb-meeting-tekst').value='';
          document.getElementById('lb-meeting-fase').value='';
          // Ga terug naar notitie tab en herlaad
          if(tabNotitie)tabNotitie.click();
          renderLogboekScreen(app);
        } else toast('Fout: '+(ld.error||'onbekend'),'err');
      }catch(e){toast('Fout: '+e.message,'err');}
      meetBtn.disabled=false;meetBtn.textContent='⚙ AI structureren & opslaan';
    });
  }
}


// VERWERKERSOVEREENKOMST
