// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Productpunt 5 — groepsbeeld (UI, 10 okt 2026). Read-only weergave van de bestaande groepsbeeld-metadata
// die de backend (worker/42-groepsbeeld.js, docs/group-consolidation.md) additief in data_json van de
// groepsrij zet: consolidatieCheck.groepsbeeld. Bron is uitsluitend de al geladen serverdata S._mnaData
// (gezet bij het laden in mna/06). Geen netwerk, geen API, geen AI, geen opslag, geen berekening.
//
// Regels (bewust strikt):
// - Alleen verkoper en begeleider in fase Financieel; koper, meekijker en elke andere rol krijgen geen
//   paneel en er wordt niets gelezen of verwerkt.
// - Uitsluitend de groepsrij: fase_id 'financieel' en entiteit_id null/ontbrekend. Meerdere of geen
//   groepsrijen, ontbrekende/onleesbare/onbekende metadata → expliciet "nog geen brongebonden
//   groepsbeeldinformatie"; het bestaande formuliergetal wordt dan nergens als officieel of geconsolideerd
//   aangemerkt.
// - Bruto berekend is nooit een officiële consolidatie; aangeleverd blijft niet geverifieerd. Onbekende
//   eliminaties/correcties zijn nooit 0; een verschil is een signaal, geen foutbewijs.
// - Geen eigen state: elke render leest opnieuw uit S (geen cache tussen trajecten of rollen) en muteert
//   niets. Alle servertekst gaat door gbEsc (ook attributen).

var GB_MAX = { velden: 40, ontbrekend: 10 };
var GB_VERSIE = 1;

function gbEsc(v){
  if(v===null||v===undefined)return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function gbOnbekend(tekst){ return '<em style="color:var(--muted)">'+gbEsc(tekst||'onbekend')+'</em>'; }
function gbIsObj(v){ return v!==null&&typeof v==='object'&&!Array.isArray(v); }
function gbIsGetal(v){ return typeof v==='number'&&isFinite(v); }
function gbMagTonen(){ return !!S.code&&(isVerkoper()||isTussen()); }

// Bestaande veilige opmaak (fbcBedrag, mna/09) op een kopie als string; het origineel blijft ongemoeid.
// Een echte 0 blijft "0". Geen eenheid toegevoegd: de metadata legt die niet vast.
function gbGetal(v){
  if(!gbIsGetal(v))return gbOnbekend('geen getal');
  return typeof fbcBedrag==='function'?fbcBedrag(String(v)):gbEsc(String(v));
}
function gbTelling(v){ return gbIsGetal(v)&&v>=0&&Math.floor(v)===v?gbEsc(v):gbOnbekend('onbekend'); }
function gbLabel(veld){ return typeof fbcVeldLabel==='function'?fbcVeldLabel(veld):gbEsc(veld); }

// ── Groepsrij en metadata lezen (geen mutatie, parsefouten nooit fataal) ──────────────────────────
function gbLeesGroepsbeeld(){
  var rijen=(Array.isArray(S._mnaData)?S._mnaData:[]).filter(function(r){
    return gbIsObj(r)&&r.fase_id==='financieel'&&(r.entiteit_id===null||r.entiteit_id===undefined);
  });
  if(!rijen.length)return { status:'GEEN_GROEPSRIJ' };
  if(rijen.length>1)return { status:'MEERDERE_GROEPSRIJEN' };
  var dj=rijen[0].data_json;
  if(typeof dj==='string'){ try{ dj=JSON.parse(dj||'{}'); }catch(e){ return { status:'ONLEESBAAR' }; } }
  if(dj===undefined||dj===null)dj={};
  if(!gbIsObj(dj))return { status:'ONLEESBAAR' };
  var cc=dj.consolidatieCheck;
  var meta=gbIsObj(cc)&&gbIsObj(cc.groepsbeeld)?cc.groepsbeeld:null;
  if(!meta)return { status:'GEEN_METADATA' };
  if(meta.versie!==GB_VERSIE||!gbIsObj(meta.velden)||!gbIsObj(meta.selectie))return { status:'ONBEKENDE_METADATA' };
  return { status:'OK', meta:meta, dj:dj };
}

// ── Teksten ───────────────────────────────────────────────────────────────────────────────────────
var GB_BRUTO_STATUS = {
  COMPLEET_VOOR_SELECTIE: 'invoer compleet voor de rekenselectie',
  ONVOLLEDIG: 'onvolledig: niet alle geselecteerde entiteiten hebben een waarde',
  ONBRUIKBAAR: 'onbruikbaar: minstens één entiteitwaarde is onbruikbaar of ambigu, er is geen som gemaakt',
  GEEN_WAARDEN: 'geen entiteitwaarden'
};
var GB_AANGELEVERD_STATUS = {
  AANGELEVERD_NIET_GEVERIFIEERD: 'aangeleverd, niet geverifieerd',
  AMBIGU: 'aangeleverd maar ambigu (bijv. 1,234) — niet gelezen als getal',
  ONBRUIKBAAR: 'aangeleverd maar onbruikbaar — niet gelezen als getal'
};
var GB_GEBRUIKT = { AANGELEVERD: 'aangeleverde groepswaarde', BRUTO_BEREKEND: 'bruto berekend groepsbeeld' };
var GB_REGEL = { som: 'som van entiteiten', afgeleid_ebitdaMarge: 'afgeleid: EBITDA / omzet', gewogen_omzet3: 'gewogen gemiddelde (gewicht omzet)', gewogen_aantalKlanten: 'gewogen gemiddelde (gewicht aantal klanten)' };
var GB_SELECTIE = { BV_ZONDER_HOLDING: 'BV: alle entiteiten behalve de holding', MAATSCHAP_ALLE_ENTITEITEN: 'Maatschap: alle entiteiten' };
var GB_ONTBREKEND = {
  entiteitwaarden_ontbreken: 'entiteitwaarden ontbreken',
  entiteitwaarden_onbruikbaar_of_ambigu: 'entiteitwaarden onbruikbaar of ambigu',
  aangeleverde_waarde_onbruikbaar_of_ambigu: 'aangeleverde waarde onbruikbaar of ambigu',
  eliminaties_onbekend: 'eliminaties onbekend',
  periode_onbekend: 'periode onbekend',
  consolidatiekring_onbewezen: 'consolidatiekring niet bewezen'
};
var GB_GEEN_INFO = {
  GEEN_GROEPSRIJ: 'Er is geen groepsrij voor Financieel geladen.',
  MEERDERE_GROEPSRIJEN: 'Er zijn meerdere groepsrijen voor Financieel geladen; welke geldt is niet eenduidig.',
  ONLEESBAAR: 'De gegevens van de groepsrij zijn onleesbaar.',
  GEEN_METADATA: 'De groepsrij bevat (nog) geen groepsbeeld-metadata.',
  ONBEKENDE_METADATA: 'De groepsbeeld-metadata heeft een onbekende of onvolledige vorm.'
};
// Alleen eigen sleutels: een servercode als "constructor" mag nooit een prototype-eigenschap opleveren.
function gbUit(map,code){ return typeof code==='string'&&Object.prototype.hasOwnProperty.call(map,code)?map[code]:null; }
function gbTekst(map,code,leeg){
  if(code===null||code===undefined||code==='')return gbOnbekend(leeg||'onbekend');
  var t=gbUit(map,code);
  return t?gbEsc(t):gbOnbekend('onbekende status: '+String(code).slice(0,60));
}

var GB_KOP = 'font-size:11px;font-weight:600;color:var(--muted);margin-top:10px;text-transform:uppercase;letter-spacing:.06em';
var GB_RIJ = 'border-top:1px solid var(--border);padding:6px 0;font-size:11px;color:var(--sub);line-height:1.6';

function gbStatusBedrag(o){
  // Onbekend (of geen getal) is nooit 0.
  if(!gbIsObj(o)||o.status==='ONBEKEND'||!gbIsGetal(o.bedrag))return gbOnbekend('onbekend — niet 0');
  return gbEsc(o.status)+' · '+gbGetal(o.bedrag)+' '+gbOnbekend('niet geverifieerd');
}
function gbPeriode(p){
  if(!gbIsObj(p))return gbOnbekend('periode onbekend');
  return [
    p.soort==='PROGNOSE'?'<strong>prognose</strong> (niet bij realisatie optellen)':(p.soort?gbEsc(p.soort):''),
    p.boekjaar===null||p.boekjaar===undefined?gbOnbekend('boekjaar onbekend'):'boekjaar '+gbEsc(p.boekjaar),
    p.status==='ONBEKEND'||!p.status?gbOnbekend('periodestatus onbekend'):gbEsc(p.status)
  ].filter(Boolean).join(' · ');
}
function gbVerschil(o){
  if(!gbIsGetal(o.verschil))return gbOnbekend('geen verschil berekenbaar');
  var s='aangeleverd − bruto: '+gbGetal(o.verschil)
    +' · onverklaard: '+(gbIsGetal(o.onverklaard_verschil)?gbGetal(o.onverklaard_verschil):gbOnbekend())
    +' · '+(gbIsGetal(o.verschil_pct)?gbGetal(o.verschil_pct)+'%':gbOnbekend('% onbekend'));
  if(o.boven_drempel===true)s+=' · <strong style="color:var(--gold-dark)">boven signaleringsdrempel</strong> — te beoordelen, geen bewijs van een fout';
  else if(o.boven_drempel===false)s+=' · binnen signaleringsdrempel — geen bewijs van juistheid';
  return s;
}
function gbOntbrekend(lijst){
  var a=(Array.isArray(lijst)?lijst:[]).filter(function(x){return typeof x==='string'&&x;});
  if(!a.length)return gbOnbekend('niets gemeld');
  var t=a.slice(0,GB_MAX.ontbrekend).map(function(c){return gbEsc(gbUit(GB_ONTBREKEND,c)||c.slice(0,60));}).join(', ');
  return t+(a.length>GB_MAX.ontbrekend?' '+gbOnbekend('(+'+(a.length-GB_MAX.ontbrekend)+' niet getoond)'):'');
}

function gbRenderVeld(veld,o,dj){
  var inv=o.invoer;
  var invoerTxt=gbIsObj(inv)
    ?'met waarde '+gbTelling(inv.met_waarde)+' · ontbrekend '+gbTelling(inv.ontbrekend)+' · onbruikbaar '+gbTelling(inv.onbruikbaar)+' · ambigu '+gbTelling(inv.ambigu)+' · onleesbare entiteitrijen '+gbTelling(inv.onleesbaar)
    :gbOnbekend('geen invoertelling (afgeleid veld)');
  var a=o.aangeleverd, aangTxt;
  if(!gbIsObj(a))aangTxt=gbOnbekend('geen aangeleverde groepswaarde');
  else{
    var dv=Object.prototype.hasOwnProperty.call(dj,veld)?dj[veld]:null;
    var orig=gbIsObj(dv)&&dv.auto!==true?dv.value:undefined;
    aangTxt=gbTekst(GB_AANGELEVERD_STATUS,a.status)
      +' · gelezen: '+(gbIsGetal(a.waarde)?gbGetal(a.waarde):gbOnbekend('geen getal'))
      +(orig!==undefined&&orig!==null&&orig!==''?' · oorspronkelijke invoer: <code>'+gbEsc(String(orig).slice(0,100))+'</code>':'')
      +' · officiële consolidatie: niet vastgesteld';
  }
  return '<div class="gb-veld" style="'+GB_RIJ+'">'
    +'<div><strong style="color:var(--head)">'+gbLabel(veld)+'</strong> <span style="color:var(--muted)">('+gbTekst(GB_REGEL,o.regel,'regel onbekend')+')</span></div>'
    +'<div>Bruto berekend (geen officiële consolidatie): '+(gbIsGetal(o.bruto_berekend)?gbGetal(o.bruto_berekend):gbOnbekend('niet berekend'))+' · '+gbTekst(GB_BRUTO_STATUS,o.bruto_status,'status onbekend')+'</div>'
    +'<div>Invoer: '+invoerTxt+'</div>'
    +'<div>Aangeleverd: '+aangTxt+'</div>'
    +'<div>Gebruikte waarde in de groepsrij: '+gbTekst(GB_GEBRUIKT,o.gebruikte_waarde,'geen')+'</div>'
    +'<div>Bekende correcties: '+gbStatusBedrag(o.bekende_correcties)+' · Eliminaties: '+gbStatusBedrag(o.eliminaties)+'</div>'
    +'<div>Gereconcilieerd bedrag: '+(gbIsGetal(o.gereconcilieerd_bedrag)?gbGetal(o.gereconcilieerd_bedrag):gbOnbekend('geen'))+' · reconciliatie: '+(o.reconciliatie_status==='NIET_MOGELIJK'?'niet mogelijk':gbOnbekend('status onbekend'))+'</div>'
    +'<div>Verschil (signaal): '+gbVerschil(o)+'</div>'
    +'<div>Periode: '+gbPeriode(o.periode)+'</div>'
    +'<div>Ontbreekt: '+gbOntbrekend(o.ontbrekend)+'</div>'
    +'</div>';
}

function renderGroepsbeeld(faseId){
  if(faseId!=='financieel'||!gbMagTonen())return '';
  var html='<div class="panel" id="gb-panel" style="margin-bottom:1rem">'
    +'<div class="sec-hdr" style="margin:0">&#128202; Groepsbeeld: bruto berekend versus aangeleverd</div>'
    +'<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Alleen lezen. Het <strong>bruto berekende groepsbeeld</strong> is een optelling van entiteitcijfers volgens een rekenselectie en <strong>geen officiële consolidatie</strong>. Een aangeleverde groepswaarde blijft <strong>niet geverifieerd</strong>. Eliminaties en correcties zijn onbekend, nooit 0.</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:.5rem">Stand van de serverdata bij het laden van dit traject; na opslaan wordt dit pas na opnieuw laden bijgewerkt.</div>';
  var g=gbLeesGroepsbeeld();
  if(g.status!=='OK'){
    return html+'<div id="gb-geen-info" style="font-size:12px;color:var(--sub);background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .75rem">'
      +'Nog geen brongebonden groepsbeeldinformatie beschikbaar. '+gbEsc(GB_GEEN_INFO[g.status])
      +' De bestaande groepswaarden in het formulier zijn hiermee niet als officiële consolidatie of als bruto berekend groepsbeeld aangemerkt.</div></div>';
  }
  var m=g.meta, sel=m.selectie;
  html+='<div style="font-size:12px;line-height:1.6">'
    +'<div>Rekenselectie: '+gbTekst(GB_SELECTIE,sel.regel,'onbekend')+' · geselecteerde entiteiten '+gbTelling(sel.entiteiten_geselecteerd)+' · onleesbaar '+gbTelling(sel.entiteiten_onleesbaar)+'</div>'
    +'<div>Juridische consolidatiekring: <strong>niet bewezen</strong> — de rekenselectie is geen juridische selectie.</div>'
    +'<div>Eliminaties (groep): '+gbStatusBedrag(m.eliminaties)+(gbIsObj(m.eliminaties)&&typeof m.eliminaties.toelichting==='string'?' '+gbOnbekend(m.eliminaties.toelichting.slice(0,300)):'')+'</div>'
    +'<div>Signaleringsdrempel verschil: '+(gbIsGetal(m.drempel_pct)?gbGetal(m.drempel_pct)+'%':gbOnbekend())+'</div>'
    +'</div>';
  var sleutels=Object.keys(m.velden);
  var bruikbaar=sleutels.filter(function(k){return gbIsObj(m.velden[k]);});
  var onbruikbaar=sleutels.length-bruikbaar.length;
  var getoond=bruikbaar.slice(0,GB_MAX.velden);
  html+='<div style="'+GB_KOP+'">Vergelijking per veld</div>';
  if(!getoond.length)html+='<div style="font-size:12px;color:var(--muted)">Geen bruikbare veldgegevens in de metadata.</div>';
  html+=getoond.map(function(k){return gbRenderVeld(k,m.velden[k],g.dj);}).join('');
  if(bruikbaar.length>getoond.length)html+='<div id="gb-afgekapt" style="font-size:11px;color:var(--gold-dark);margin-top:6px">&#9888; '+gbEsc(getoond.length)+' van '+gbEsc(bruikbaar.length)+' velden getoond (limiet).</div>';
  if(onbruikbaar)html+='<div id="gb-onbruikbaar" style="font-size:11px;color:var(--gold-dark);margin-top:6px">&#9888; '+gbEsc(onbruikbaar)+' veld(en) met onleesbare metadata niet getoond.</div>';
  return html+'</div>';
}
