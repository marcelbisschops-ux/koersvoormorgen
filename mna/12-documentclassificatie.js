// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Productpunt 6 — expliciete documentclassificatie (UI, 10 okt 2026). Optioneel klein keuzeblok bij de
// bestaande financiële documentupload (mna/02) en een leesweergave van de servergevalideerde classificatie
// uit lijst/upload/versies. Backendcontract: worker/43-documentclassificatie.js en docs/group-documents.md
// in de backendrepo (vier optionele parameters doc_scope/doc_statement/doc_periode/doc_datatype).
//
// Regels (bewust strikt):
// - Gewone module, geladen vóór mna/02. Bij het laden wordt niets uitgevoerd en S niet gelezen; elke helper
//   krijgt zijn invoer als argument. Geen netwerk, geen opslag, geen AI.
// - GROUP en ENTITY met overzicht, periode en cijfersoort (productpunt 6), alleen in fase Financieel.
//   Productpunt 7 (12 okt 2026): GENERAL = algemeen dataroomdocument, alleen doc_scope, zonder entiteit en
//   zonder overzicht/periode/cijfersoort; in elke uploadzone van de verkoper. Nooit een jaarrealisatie.
//   Elke andere of afwijkende scope uit de server wordt als "classificatie onbekend" behandeld.
// - Nooit raden en geen standaardkeuze: zonder expliciet aangezet keuzeblok gaat de upload ongewijzigd
//   (legacy). Niets wordt afgeleid uit bestandsnaam, ontbrekende entiteit of een eerdere versie.
// - GROUP is een eigen indeling van de gebruiker, nooit een officiële consolidatie. Alleen ACTUAL over een
//   volledig jaar is een jaarrealisatie; prognose, begroting, year-to-date en deelperiodes nooit.
// - Weergave alleen uit een gesaneerde kopie van het serverveld documentclassificatie; geen ruwe
//   _documentclassificatie, binding of id. Alle tekst gaat door dclEsc.

var DCL_SCOPE = ['GROUP', 'ENTITY'];
var DCL_ALGEMEEN = 'GENERAL';
var DCL_STATEMENT = ['P&L', 'BALANCE_SHEET', 'CASH_FLOW'];
var DCL_DATATYPE = ['ACTUAL', 'YTD_ACTUAL', 'BUDGET', 'FORECAST'];
var DCL_JAAR_MIN = 1990, DCL_JAAR_MAX = 2100;
var DCL_ID_RE = /^[A-Za-z0-9_\-]{1,100}$/;

var DCL_LABEL = {
  scope: { GROUP: 'Groepsdocument (de groep als geheel)', ENTITY: 'Document van één entiteit', GENERAL: 'Algemeen dataroomdocument (geen entiteit, geen financiële gegevens)' },
  statement: { 'P&L': 'Winst-en-verliesrekening', BALANCE_SHEET: 'Balans', CASH_FLOW: 'Kasstroomoverzicht' },
  datatype: { ACTUAL: 'Realisatie (werkelijke cijfers)', YTD_ACTUAL: 'Realisatie tot nu toe dit jaar (year-to-date)', BUDGET: 'Begroting (budget)', FORECAST: 'Prognose (forecast)' }
};
var DCL_TEKST = {
  jaarrealisatie: 'Volledige jaarrealisatie volgens uw eigen classificatie (niet geverifieerd).',
  geenJaarrealisatie: 'Geen jaarrealisatie: prognose, begroting, year-to-date of deelperiode. Cijfers worden niet als jaarcijfers overgenomen; het document kan op "Controle nodig" blijven staan.',
  geenConsolidatie: 'Eigen indeling van de gebruiker, geen officiële consolidatie.',
  nietGeclassificeerd: 'Niet geclassificeerd (classificatie onbekend).',
  algemeen: 'Algemeen document: geen entiteit, overzicht, periode of cijfersoort. Opgeslagen zonder analyse en niet als financiële bron gebruikt.',
  onbevestigd: 'De server heeft de opgegeven classificatie niet bevestigd. Het document staat als niet geclassificeerd; bij een prognose, begroting of deelperiode zijn geen gegevens overgenomen.'
};

function dclEsc(v){
  if(v===null||v===undefined)return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function dclIsObj(v){ return v!==null&&typeof v==='object'&&!Array.isArray(v); }
function dclEigen(o,k){ return Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined; }
function dclIn(lijst,v){ return typeof v==='string'&&lijst.indexOf(v)!==-1; }

// ── Periode (zelfde regels als worker/43 leesPeriode) ─────────────────────────────────────────────
function dclDatumUtc(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  var d=s.split('-').map(Number);
  var t=Date.UTC(d[0],d[1]-1,d[2]);
  var dt=new Date(t);
  if(dt.getUTCFullYear()!==d[0]||dt.getUTCMonth()!==d[1]-1||dt.getUTCDate()!==d[2])return null;
  return d[0]>=DCL_JAAR_MIN&&d[0]<=DCL_JAAR_MAX?t:null;
}
function dclJaarEinde(beginT){
  var b=new Date(beginT);
  return Date.UTC(b.getUTCFullYear()+1,b.getUTCMonth(),b.getUTCDate())-86400000;
}
// 'FY2026' → boekjaar zonder datums; 'JJJJ-MM-DD/JJJJ-MM-DD' → bereik van maximaal één jaar; anders null.
function dclLeesPeriode(v){
  if(typeof v!=='string'||v.length>21)return null;
  var fy=/^FY(\d{4})$/.exec(v);
  if(fy){
    var jaar=Number(fy[1]);
    return jaar>=DCL_JAAR_MIN&&jaar<=DCL_JAAR_MAX?{ soort:'BOEKJAAR', label:v, boekjaar:jaar, begin:null, eind:null }:null;
  }
  var br=/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/.exec(v);
  if(!br)return null;
  var b=dclDatumUtc(br[1]), e=dclDatumUtc(br[2]);
  if(b===null||e===null||b>e||e>dclJaarEinde(b))return null;
  return { soort:'DATUMBEREIK', label:v, boekjaar:null, begin:br[1], eind:br[2] };
}
// Alleen ACTUAL over een volledig jaar (boekjaar of exact één jaar) is een jaarrealisatie.
function dclIsJaarrealisatie(datatype,periode){
  if(datatype!=='ACTUAL'||!dclIsObj(periode))return false;
  if(periode.soort==='BOEKJAAR')return true;
  var b=dclDatumUtc(periode.begin), e=dclDatumUtc(periode.eind);
  return b!==null&&e!==null&&e===dclJaarEinde(b);
}

// ── Rol en invoer ──────────────────────────────────────────────────────────────────────────────────
// Alleen de verkoper, in een niet-vergrendeld traject. In elke fase alleen GENERAL; GROUP/ENTITY (met
// financiële gegevens) uitsluitend in fase Financieel (dclMagFinancieel).
function dclMagClassificeren(ctx){
  return !!ctx&&!!ctx.code&&ctx.rol==='verkoper'&&typeof ctx.faseId==='string'&&!!ctx.faseId&&!ctx.vergrendeld;
}
function dclMagFinancieel(ctx){
  return dclMagClassificeren(ctx)&&ctx.faseId==='financieel';
}

// Valideert de ruwe keuzes. Uit: { ok:true, params, jaarrealisatie[, algemeen] } of { ok:false, fout }.
// ruw: { scope, statement, periodeSoort, boekjaar, begin, eind, datatype } (strings, leeg = niet gekozen).
// entiteitId: de huidige waarde van de bestaande entiteitkeuze; entiteiten: [{id}] van dit traject.
// opties.alleenAlgemeen: buiten fase Financieel is alleen GENERAL toegestaan.
function dclValideer(ruw,entiteitId,entiteiten,opties){
  ruw=dclIsObj(ruw)?ruw:{};
  var t=function(k){ return typeof ruw[k]==='string'?ruw[k].trim():''; };
  var fouten=[];
  var scope=t('scope'), statement=t('statement'), soort=t('periodeSoort'), datatype=t('datatype');
  var boekjaar=t('boekjaar'), begin=t('begin'), eind=t('eind');
  var ent=typeof entiteitId==='string'?entiteitId:'';
  // GENERAL: niets van de financiële velden of de entiteitkeuze wordt stil weggegooid; ingevuld = weigeren.
  if(scope===DCL_ALGEMEEN){
    var gevuld=[];
    if(statement)gevuld.push('overzicht');
    if(soort||boekjaar||begin||eind)gevuld.push('periode');
    if(datatype)gevuld.push('cijfersoort');
    if(gevuld.length)fouten.push('een algemeen dataroomdocument heeft geen '+gevuld.join(', ')+': maak '+(gevuld.length>1?'die velden':'dat veld')+' leeg of kies een groeps- of entiteitsdocument');
    if(ent)fouten.push('een algemeen dataroomdocument hoort niet bij één entiteit: zet de entiteitkeuze op "Groep/hoofdentiteit"');
    if(fouten.length)return { ok:false, fout:'Documentclassificatie: '+fouten.join('; ')+'.' };
    return { ok:true, params:{ doc_scope:DCL_ALGEMEEN }, jaarrealisatie:false, algemeen:true };
  }
  if(dclIsObj(opties)&&opties.alleenAlgemeen){
    return { ok:false, fout:'Documentclassificatie: '+(scope?'in deze fase kan alleen "Algemeen dataroomdocument" worden gekozen; groeps- en entiteitsdocumenten met financiële gegevens horen in de fase Financieel':'kies "Algemeen dataroomdocument" of zet het vinkje uit')+'.' };
  }
  if(!scope)fouten.push('kies of dit een groepsdocument of een document van één entiteit is, of een algemeen dataroomdocument');
  else if(!dclIn(DCL_SCOPE,scope))fouten.push('onbekende documentsoort');
  if(!statement)fouten.push('kies het overzicht (winst-en-verliesrekening, balans of kasstroomoverzicht)');
  else if(!dclIn(DCL_STATEMENT,statement))fouten.push('onbekend overzicht');
  if(!datatype)fouten.push('kies de cijfersoort (er wordt geen standaard gekozen)');
  else if(!dclIn(DCL_DATATYPE,datatype))fouten.push('onbekende cijfersoort');
  var periodeLabel='';
  if(!soort)fouten.push('kies de periode: een boekjaar of een datumbereik');
  else if(soort==='BOEKJAAR'){
    if(begin||eind)fouten.push('vul óf een boekjaar óf een datumbereik in, niet beide');
    else if(!/^\d{4}$/.test(boekjaar))fouten.push('vul het boekjaar in als vier cijfers');
    else if(Number(boekjaar)<DCL_JAAR_MIN||Number(boekjaar)>DCL_JAAR_MAX)fouten.push('het boekjaar moet tussen '+DCL_JAAR_MIN+' en '+DCL_JAAR_MAX+' liggen');
    else periodeLabel='FY'+boekjaar;
  } else if(soort==='DATUMBEREIK'){
    if(boekjaar)fouten.push('vul óf een boekjaar óf een datumbereik in, niet beide');
    else if(!begin||!eind)fouten.push('vul zowel de begin- als de einddatum in');
    else if(dclDatumUtc(begin)===null||dclDatumUtc(eind)===null)fouten.push('gebruik bestaande datums tussen '+DCL_JAAR_MIN+' en '+DCL_JAAR_MAX);
    else if(dclDatumUtc(begin)>dclDatumUtc(eind))fouten.push('de begindatum ligt na de einddatum');
    else if(!dclLeesPeriode(begin+'/'+eind))fouten.push('een datumbereik is maximaal één jaar');
    else periodeLabel=begin+'/'+eind;
  } else fouten.push('onbekende periodesoort');
  if(scope==='GROUP'&&ent)fouten.push('een groepsdocument hoort niet bij één entiteit: zet de entiteitkeuze op "Groep/hoofdentiteit" of kies "Document van één entiteit"');
  if(scope==='ENTITY'){
    var lijst=Array.isArray(entiteiten)?entiteiten:[];
    if(!lijst.length)fouten.push('dit traject heeft geen geregistreerde entiteiten: kies "Groepsdocument" of zet de classificatie uit');
    else if(!ent)fouten.push('kies bij "Document van één entiteit" ook de entiteit in de entiteitkeuze');
    else if(!DCL_ID_RE.test(ent)||!lijst.some(function(e){ return dclIsObj(e)&&e.id===ent; }))fouten.push('de gekozen entiteit hoort niet (meer) bij dit traject; kies opnieuw');
  }
  if(fouten.length)return { ok:false, fout:'Documentclassificatie: '+fouten.join('; ')+'.' };
  var params={ doc_scope:scope, doc_statement:statement, doc_periode:periodeLabel, doc_datatype:datatype };
  return { ok:true, params:params, jaarrealisatie:dclIsJaarrealisatie(datatype,dclLeesPeriode(periodeLabel)) };
}

// Queryparameters in vaste volgorde, alleen query (nooit tegelijk als formulierveld).
// GENERAL: uitsluitend doc_scope; de overige doc_* gaan nooit mee (ook niet als leeg/undefined/null).
function dclQuery(params){
  if(!dclIsObj(params))return '';
  if(params.doc_scope===DCL_ALGEMEEN)return '&doc_scope='+DCL_ALGEMEEN;
  return ['doc_scope','doc_statement','doc_periode','doc_datatype'].map(function(k){ return '&'+k+'='+encodeURIComponent(String(params[k])); }).join('');
}

// Ruwe keuzes uit het keuzeblok (doc = document). Leeg/afwezig keuzeblok → null.
function dclLeesRuw(doc,faseId){
  if(!doc||typeof doc.getElementById!=='function')return null;
  var aan=doc.getElementById('doc-klas-aan-'+faseId);
  if(!aan||!aan.checked)return null;
  var w=function(n){ var el=doc.getElementById('doc-klas-'+n+'-'+faseId); return el&&typeof el.value==='string'?el.value:''; };
  return { scope:w('scope'), statement:w('statement'), periodeSoort:w('periodesoort'), boekjaar:w('boekjaar'), begin:w('begin'), eind:w('eind'), datatype:w('datatype') };
}

// Momentopname vóór renderApp: null (keuzeblok uit, of rol/fase/vergrendeling staat het niet toe) of een
// bevroren { ok, fout | params, jaarrealisatie }. ctx: { rol, code, faseId, vergrendeld, entiteitId, entiteiten }.
function dclSnapshot(doc,faseId,ctx){
  ctx=dclIsObj(ctx)?ctx:{};
  if(!dclMagClassificeren({ rol:ctx.rol, code:ctx.code, faseId:faseId, vergrendeld:ctx.vergrendeld }))return null;
  var ruw=dclLeesRuw(doc,faseId);
  if(!ruw)return null;
  var v=dclValideer(ruw,ctx.entiteitId,ctx.entiteiten,{ alleenAlgemeen:faseId!=='financieel' });
  if(v.ok)Object.freeze(v.params);
  return Object.freeze(v);
}

// ── Serverweergave saneren ─────────────────────────────────────────────────────────────────────────
// Kopie van het serverveld documentclassificatie met alleen bekende enums, een opnieuw gelezen periode en
// de entiteit van de rij. Alles wat niet exact klopt → null (wordt "classificatie onbekend").
function dclSaneer(dto,rijEntiteitId){
  if(!dclIsObj(dto))return null;
  var scope=dclEigen(dto,'scope'), statement=dclEigen(dto,'statement'), datatype=dclEigen(dto,'datatype');
  if(dclEigen(dto,'herkomst')!=='GEBRUIKER'||dclEigen(dto,'officiele_consolidatie')!==false)return null;
  var ent=dclEigen(dto,'entiteit_id');
  var rij=typeof rijEntiteitId==='string'&&rijEntiteitId?rijEntiteitId:null;
  // GENERAL: alleen geldig met exact null voor overzicht/periode/cijfersoort/entiteit, een rij zonder
  // entiteit en geen realisatieclaim. Alles daarbuiten is tegenstrijdig → onbekend.
  if(scope===DCL_ALGEMEEN){
    if(statement!==null||dclEigen(dto,'periode')!==null||datatype!==null||ent!==null||rij!==null)return null;
    var rt=dclEigen(dto,'realisatie_toepasbaar');
    if(rt!==undefined&&rt!==false)return null;
    return { scope:DCL_ALGEMEEN, statement:null, periode:null, datatype:null, entiteit_id:null,
      herkomst:'GEBRUIKER', officiele_consolidatie:false, realisatie_toepasbaar:false };
  }
  if(!dclIn(DCL_SCOPE,scope)||!dclIn(DCL_STATEMENT,statement)||!dclIn(DCL_DATATYPE,datatype))return null;
  var p=dclEigen(dto,'periode');
  var periode=dclIsObj(p)?dclLeesPeriode(dclEigen(p,'label')):null;
  if(!periode)return null;
  if(scope==='GROUP'&&(ent!==null&&ent!==undefined||rij!==null))return null;
  if(scope==='ENTITY'&&(typeof ent!=='string'||!DCL_ID_RE.test(ent)||ent!==rij))return null;
  return { scope:scope, statement:statement, periode:periode, datatype:datatype, entiteit_id:scope==='ENTITY'?ent:null,
    herkomst:'GEBRUIKER', officiele_consolidatie:false, realisatie_toepasbaar:dclIsJaarrealisatie(datatype,periode) };
}

// ── Teksten en weergave ────────────────────────────────────────────────────────────────────────────
function dclPeriodeTekst(periode){
  if(!dclIsObj(periode))return 'periode onbekend';
  if(periode.soort==='BOEKJAAR')return 'boekjaar '+periode.boekjaar;
  var vol=dclIsJaarrealisatie('ACTUAL',periode);
  return periode.begin+' t/m '+periode.eind+(vol?' (volledig jaar)':' (deelperiode)');
}
// Statuslabel: nooit "jaarrealisatie" bij prognose, begroting, year-to-date of deelperiode.
function dclStatusLabel(klas,verwerkingFout){
  if(!dclIsObj(klas))return DCL_TEKST.nietGeclassificeerd;
  if(klas.scope===DCL_ALGEMEEN)return DCL_TEKST.algemeen;
  var basis=dclIsJaarrealisatie(klas.datatype,klas.periode)?DCL_TEKST.jaarrealisatie:DCL_TEKST.geenJaarrealisatie;
  return verwerkingFout==='GEEN_JAARREALISATIE'?'Te beoordelen. '+DCL_TEKST.geenJaarrealisatie:basis;
}
// Eén regel per document. entNaam: al opgezochte naam van de eigen entiteit (of leeg).
function dclRenderWeergave(klas,opts){
  opts=dclIsObj(opts)?opts:{};
  var stijl='flex-basis:100%;font-size:10px;padding-left:19px;';
  if(!dclIsObj(klas))return opts.toonOnbekend?'<div class="dcl-weergave" style="'+stijl+'color:var(--muted)">'+dclEsc(DCL_TEKST.nietGeclassificeerd)+'</div>':'';
  if(klas.scope===DCL_ALGEMEEN){
    return '<div class="dcl-weergave" style="'+stijl+'color:var(--sub)">'
      +'<strong>Eigen classificatie</strong> (herkomst: gebruiker, niet geverifieerd): '+dclEsc(DCL_LABEL.scope.GENERAL)
      +'<br>'+dclEsc(dclStatusLabel(klas))+'</div>';
  }
  var wie=klas.scope==='GROUP'?DCL_LABEL.scope.GROUP:(DCL_LABEL.scope.ENTITY+': '+(opts.entNaam?opts.entNaam:'entiteit niet in de huidige lijst'));
  return '<div class="dcl-weergave" style="'+stijl+'color:var(--sub)">'
    +'<strong>Eigen classificatie</strong> (herkomst: gebruiker, niet geverifieerd): '
    +dclEsc(wie)+' · '+dclEsc(DCL_LABEL.statement[klas.statement])+' · '+dclEsc(dclPeriodeTekst(klas.periode))+' · '+dclEsc(DCL_LABEL.datatype[klas.datatype])
    +'<br>'+dclEsc(dclStatusLabel(klas,opts.verwerkingFout))+(klas.scope==='GROUP'?' '+dclEsc(DCL_TEKST.geenConsolidatie):'')
    +'</div>';
}

// Keuzeblok bij de bestaande uploadzone. Alles staat standaard leeg/uit; zonder vinkje gaat de upload als vroeger.
// Buiten Financieel alleen de keuze "Algemeen dataroomdocument" (geen financiële velden in de HTML).
function dclRenderPaneel(faseId,ctx){
  ctx=dclIsObj(ctx)?ctx:{};
  var mctx={ rol:ctx.rol, code:ctx.code, faseId:faseId, vergrendeld:ctx.vergrendeld };
  if(!dclMagClassificeren(mctx))return '';
  var f=dclEsc(faseId);
  var sel='font-size:11px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:4px 6px';
  var opties=function(lijst,labels,leeg){ return '<option value="">'+dclEsc(leeg)+'</option>'+lijst.map(function(v){ return '<option value="'+dclEsc(v)+'">'+dclEsc(labels[v])+'</option>'; }).join(''); };
  var toggle="var v=document.getElementById('doc-klas-velden-"+f+"');if(v)v.style.display=this.checked?'flex':'none';";
  var uitlegAlgemeen='Algemeen dataroomdocument: een stuk zonder eigen entiteit en zonder financiële cijfers (bijvoorbeeld een organigram of presentatie). '
    +'Er worden geen overzicht, periode of cijfersoort meegestuurd en geen entiteit gekoppeld; het origineel wordt opgeslagen zonder AI-analyse en niet als financiële bron gebruikt ("Extra controle" heeft dan geen effect). ';
  if(!dclMagFinancieel(mctx)){
    return '<div class="dcl-paneel" style="flex-basis:100%;font-size:11px;color:var(--muted)">'
      +'<label style="display:flex;align-items:center;gap:5px;cursor:pointer" title="Optioneel. Zonder vinkje wordt het document geüpload zoals altijd, zonder classificatie.">'
      +'<input type="checkbox" id="doc-klas-aan-'+f+'" style="margin:0" onchange="'+toggle+'"> Documentclassificatie opgeven (optioneel, geldt voor alle bestanden die u hierna selecteert of vervangt)'
      +'</label>'
      +'<div id="doc-klas-velden-'+f+'" style="display:none;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">'
      +'<select id="doc-klas-scope-'+f+'" style="'+sel+'">'+opties([DCL_ALGEMEEN],DCL_LABEL.scope,'Soort document?')+'</select>'
      +'<div style="flex-basis:100%;font-size:10px;line-height:1.45">'+uitlegAlgemeen
      +'Zet de entiteitkeuze op "Groep/hoofdentiteit". Groeps- en entiteitsdocumenten met financiële gegevens classificeert u in de fase Financieel. '
      +'Een tegenstrijdige keuze wordt vóór het verzenden geweigerd.'
      +'</div></div></div>';
  }
  return '<div class="dcl-paneel" style="flex-basis:100%;font-size:11px;color:var(--muted)">'
    +'<label style="display:flex;align-items:center;gap:5px;cursor:pointer" title="Optioneel. Zonder vinkje wordt het document geüpload zoals altijd, zonder classificatie.">'
    +'<input type="checkbox" id="doc-klas-aan-'+f+'" style="margin:0" onchange="'+toggle+'"> Documentclassificatie opgeven (optioneel, geldt voor alle bestanden die u hierna selecteert of vervangt)'
    +'</label>'
    +'<div id="doc-klas-velden-'+f+'" style="display:none;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">'
    +'<select id="doc-klas-scope-'+f+'" style="'+sel+'">'+opties(DCL_SCOPE.concat([DCL_ALGEMEEN]),DCL_LABEL.scope,'Groep, entiteit of algemeen?')+'</select>'
    +'<select id="doc-klas-statement-'+f+'" style="'+sel+'">'+opties(DCL_STATEMENT,DCL_LABEL.statement,'Overzicht?')+'</select>'
    +'<select id="doc-klas-periodesoort-'+f+'" style="'+sel+'"><option value="">Periode?</option><option value="BOEKJAAR">Boekjaar</option><option value="DATUMBEREIK">Datumbereik (max. één jaar)</option></select>'
    +'<input type="number" id="doc-klas-boekjaar-'+f+'" min="'+DCL_JAAR_MIN+'" max="'+DCL_JAAR_MAX+'" step="1" placeholder="Boekjaar" style="'+sel+';width:80px">'
    +'<input type="date" id="doc-klas-begin-'+f+'" title="Begindatum" style="'+sel+'">'
    +'<input type="date" id="doc-klas-eind-'+f+'" title="Einddatum" style="'+sel+'">'
    +'<select id="doc-klas-datatype-'+f+'" style="'+sel+'">'+opties(DCL_DATATYPE,DCL_LABEL.datatype,'Cijfersoort?')+'</select>'
    +'<div style="flex-basis:100%;font-size:10px;line-height:1.45">'
    +'Groepsdocument: een stuk over de groep als geheel; kies dan bij de entiteit "Groep/hoofdentiteit". Dit is uw eigen indeling en geen officiële consolidatie. '
    +'Document van één entiteit: kies de entiteit in de entiteitkeuze hiernaast. '
    +uitlegAlgemeen+'Laat bij die keuze overzicht, periode en cijfersoort leeg en zet de entiteitkeuze op "Groep/hoofdentiteit"; ingevulde velden worden niet weggegooid maar de upload wordt dan geweigerd. '
    +'Alleen realisatie over een volledig jaar geldt als jaarrealisatie. Een prognose, begroting, year-to-date of deelperiode wordt niet als jaarcijfers overgenomen en kan op "Controle nodig" blijven staan. '
    +'Bij Vervangen wordt de classificatie van de vorige versie niet overgenomen; alleen wat hier is ingevuld gaat mee. '
    +'Een onvolledige of tegenstrijdige keuze wordt vóór het verzenden geweigerd.'
    +'</div></div></div>';
}
