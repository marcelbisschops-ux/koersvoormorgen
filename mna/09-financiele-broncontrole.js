// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Productpunt 3 — financiële broncontrole (UI, 9 okt 2026). Leest de bestaande, gecommitte backendroute
// GET /mna/financieel/broncontrole/{code}[?entiteit_id=…] en, alleen voor de verkoper, de geauditeerde
// POST /mna/financieel/broncontrole/correctie (zie backend docs/financial-source-control.md en
// worker/40-financiele-broncontrole.js). Geen nieuwe API, geen AI, geen formulieropslag, geen consolidatie.
//
// Regels (bewust strikt):
// - Alleen verkoper en begeleider zien het paneel; de koper krijgt geen paneel en doet geen verzoek.
// - Laden gebeurt alleen na een expliciete klik (Broncontrole starten/Verversen), nooit automatisch.
// - Elk verzoek is gebonden aan exact deze scope (code, rol, entiteit, scherm, fase). Wisselt die scope,
//   dan wordt alles gewist en wordt een laat antwoord genegeerd — nooit data uit een andere scope.
// - Alle servertekst gaat door fbcEsc (ook attributen); ontbrekende broninfo wordt "onbekend", nooit geraden.
// - Correctie: alleen verkoper, alleen bij correctie_toegestaan===true van de server en een niet
//   vergrendeld/afgesloten traject. Geen automatische retry; bij 409 wordt alleen opnieuw gelezen.

var FBC_VELDEN = ['omzet1','omzet2','omzet3','omzetYTD','ebitda','ebitdaNorm','wip','debiteuren','partnerBel'];
var FBC_MAX = { documenten: 50, bronnen: 10, vergelijkingen: 10 };
var FBC = { scope: null, reqId: 0, status: 'idle', data: null, fout: null, melding: null, correctie: null };

function fbcEsc(v){
  if(v===null||v===undefined)return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fbcOnbekend(tekst){ return '<em style="color:var(--muted)">'+fbcEsc(tekst||'onbekend')+'</em>'; }
function fbcIsObj(v){ return v!==null&&typeof v==='object'&&!Array.isArray(v); }

// ── Scope en rechten ────────────────────────────────────────────────────────────────────────────
function fbcScopeKey(){
  var f=(typeof FASES!=='undefined'&&FASES[S.fase])||null;
  return JSON.stringify([S.code||'',S.rol||'',S._actieveEntiteit||null,S.screen||'',f?f.id:'']);
}
function fbcSyncScope(){
  var k=fbcScopeKey();
  if(FBC.scope!==k){ FBC.reqId++; FBC.scope=k; FBC.status='idle'; FBC.data=null; FBC.fout=null; FBC.melding=null; FBC.correctie=null; }
  return k;
}
function fbcVerwachteRol(){ return isVerkoper()?'verkoper':(isTussen()?'begeleider':null); }
function fbcMagLezen(){ return !!S.code&&fbcVerwachteRol()!==null; }
function fbcVergrendeld(){ return !!(S.traject&&(S.traject.status==='vergrendeld'||S.traject.status==='afgesloten')); }
function fbcMagCorrigeren(){
  return isVerkoper()&&FBC.status==='ok'&&!!FBC.data&&FBC.data.rol==='verkoper'&&FBC.data.correctie_toegestaan===true&&!fbcVergrendeld();
}

// ── Opmaak ──────────────────────────────────────────────────────────────────────────────────────
function fbcBedrag(v,legacy){
  if(v===null||v===undefined||v==='')return fbcOnbekend('leeg');
  var s=String(v).trim();
  // Alleen huidige/oude mna-veldwaarden zijn Nederlandse notatie; bronnormalisaties en audit zijn canoniek.
  if(legacy){var b=fbcCanoniekBedrag(s);if(!b.ok)return fbcEsc(s);s=b.waarde;}
  if(/^-?\d+(\.\d+)?$/.test(s)){
    var neg=s.charAt(0)==='-';if(neg)s=s.slice(1);
    var d=s.split('.');d[0]=d[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return fbcEsc((neg?'-':'')+d.join(','));
  }
  return fbcEsc(s);
}
function fbcDatum(v){
  if(typeof v==='number'&&isFinite(v)){ try{ return fbcEsc(new Date(v).toISOString().slice(0,16).replace('T',' ')+' UTC'); }catch(e){ return fbcOnbekend(); } }
  if(typeof v==='string'&&v)return fbcEsc(v);
  return fbcOnbekend();
}
function fbcVeldDef(veldId){
  var f=(typeof FASES!=='undefined'&&FASES.find(function(x){return x.id==='financieel';}))||null;
  return f&&f.dataFields?f.dataFields.find(function(df){return df.id===veldId;})||null:null;
}
function fbcVeldLabel(veldId){ var df=fbcVeldDef(veldId); return fbcEsc(df&&df.label?df.label:veldId); }
function fbcEntiteitNaam(id){
  var e=(S._entiteiten||[]).find(function(x){return x&&x.id===id;});
  return e&&e.naam?e.naam:id;
}
var FBC_HERKOMST = {
  'BRONFEIT': ['var(--teal)','BRONFEIT','Deterministisch uit een brondocument met bewezen bedrag, document, periode en entiteit.'],
  'AI-INTERPRETATIE': ['var(--gold-dark)','AI-INTERPRETATIE','Door AI gelezen; niet geverifieerd en geen bronfeit.'],
  'ONZEKER': ['var(--red)','ONZEKER','Niet als bronfeit te bewijzen; controleer het brondocument en de basis.'],
};
var FBC_CROSSCHECK = {
  BEVESTIGD:['var(--teal)','Bevestigd'], AFWIJKING:['var(--red)','Afwijking'], ONZEKER:['var(--gold-dark)','Onzeker'],
  NIET_VERGELIJKBAAR:['var(--muted)','Niet vergelijkbaar'], ONVOLDOENDE_BRONNEN:['var(--muted)','Onvoldoende bronnen'],
};
var FBC_ONTBREKEND = {
  geen_financiele_brondocumenten_voor_deze_scope:'Geen financiële brondocumenten voor deze scope.',
  geen_financiele_gegevensrij:'Er is (nog) geen financiële gegevensrij voor deze scope.',
  financiele_gegevensrij_onleesbaar:'De financiële gegevensrij is onleesbaar.',
  origineel:'origineel', valuta:'valuta', eenheid:'eenheid', periode_begin:'periodebegin', periode_eind:'periode-einde',
  actual_forecast:'realisatie/prognose', scope:'scope (enkelvoudig/geconsolideerd)', locatie:'locatie in het document',
  inhoud_hash:'inhoudshash', bron_document_id:'documentreferentie',
};
function fbcBadge(kleur,tekst,titel){
  return '<span style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;color:#fff;background:'+kleur+';border-radius:8px;padding:1px 7px"'+(titel?' title="'+fbcEsc(titel)+'"':'')+'>'+fbcEsc(tekst)+'</span>';
}
function fbcHerkomstBadge(h){
  var x=FBC_HERKOMST[h];
  return x?fbcBadge(x[0],x[1],x[2]):fbcBadge('var(--muted)','ONBEKEND'+(h?': '+h:''),'Onbekende herkomst; niet als feit behandelen.');
}
function fbcCrosscheckBadge(s){
  var x=FBC_CROSSCHECK[s];
  return x?fbcBadge(x[0],x[1]):fbcBadge('var(--muted)','Onbekende status'+(s?': '+s:''));
}
function fbcLijst(arr){
  if(!Array.isArray(arr)||!arr.length)return '';
  return arr.map(function(k){return fbcEsc(FBC_ONTBREKEND[k]||k);}).join(', ');
}
function fbcPeriode(p){
  if(!fbcIsObj(p))return fbcOnbekend('periode onbekend')+' · '+fbcOnbekend('realisatie/prognose onbekend');
  var soort=p.soort==='ACTUAL'?'Realisatie (ACTUAL)':p.soort==='FORECAST'?'Prognose (FORECAST)':null;
  return (p.begin?fbcEsc(p.begin):fbcOnbekend('begin onbekend'))+' t/m '+(p.eind?fbcEsc(p.eind):fbcOnbekend('einde onbekend'))
    +' · '+(soort?'<strong>'+fbcEsc(soort)+'</strong>':fbcOnbekend('realisatie/prognose onbekend'));
}
function fbcBronScope(s){
  if(!fbcIsObj(s))return fbcOnbekend('scope onbekend (enkelvoudig/geconsolideerd niet vastgelegd)');
  if(s.type==='ENKELVOUDIG')return '<strong>Enkelvoudig</strong> — entiteit '+fbcEsc(fbcEntiteitNaam(s.entiteit_id));
  if(s.type==='GECONSOLIDEERD'){
    var kring=Array.isArray(s.consolidatiekring)?s.consolidatiekring.map(function(id){return fbcEsc(fbcEntiteitNaam(id));}).join(', '):'';
    return '<strong>Geconsolideerd</strong> — consolidatiekring: '+(kring||fbcOnbekend());
  }
  return fbcOnbekend('scope onbekend: '+s.type);
}
function fbcLocatie(l){
  if(!fbcIsObj(l))return fbcOnbekend('locatie onbekend');
  var d=[];
  if(l.pagina!=null)d.push('pagina '+fbcEsc(l.pagina));
  if(l.werkblad)d.push('werkblad '+fbcEsc(l.werkblad));
  if(l.cel)d.push('cel '+fbcEsc(l.cel));
  if(l.regel!=null)d.push('regel '+fbcEsc(l.regel));
  return d.length?d.join(', '):fbcOnbekend('locatie onbekend');
}
function fbcAfgekapt(getoond,totaal,wat){
  return totaal>getoond?'<div style="font-size:11px;color:var(--gold-dark);margin-top:4px">&#9888; '+getoond+' van '+totaal+' '+fbcEsc(wat)+' getoond — deze weergave is niet volledig.</div>':'';
}

// renderApp tekent het hele scherm opnieuw uit S.data; getypte maar nog niet opgeslagen invoer (schedSave
// wacht nog) zou dan stil verdwijnen. Daarom de DOM-waarden van de velden van deze fase vasthouden en na
// het tekenen terugzetten — zonder S.data te wijzigen of op te slaan. Alleen aangeroepen binnen de scope.
function fbcHerteken(){
  var f=(typeof FASES!=='undefined'&&FASES[S.fase])||null;
  var bewaard=[];
  if(f&&f.dataFields)f.dataFields.forEach(function(df){var el=ge('df_'+df.id);if(el&&typeof el.value==='string')bewaard.push([df.id,el.value]);});
  renderApp();
  bewaard.forEach(function(b){var el=ge('df_'+b[0]);if(el&&el.value!==b[1])el.value=b[1];});
}

// ── Laden ───────────────────────────────────────────────────────────────────────────────────────
function fbcLeesAntwoord(r){
  return r.json().then(function(d){return {status:r.status,ok:r.ok,d:d,leesbaar:true};},function(){return {status:r.status,ok:r.ok,d:null,leesbaar:false};});
}
function fbcValideerDto(d,ent){
  if(!fbcIsObj(d)||d.ok!==true||d.rol!==fbcVerwachteRol()||typeof d.correctie_toegestaan!=='boolean')return false;
  if(!Array.isArray(d.documenten)||!Array.isArray(d.grootheden)||!Array.isArray(d.ontbrekend)||!fbcIsObj(d.scope))return false;
  if((d.scope.entiteit_id||null)!==(ent||null))return false;
  return d.grootheden.every(function(g){return fbcIsObj(g)&&Array.isArray(g.huidige_waarden)&&Array.isArray(g.bronnen)&&fbcIsObj(g.crosscheck);});
}
function fbcLeesFout(x){
  var d=fbcIsObj(x.d)?x.d:{};
  if(x.netwerk)return 'Geen verbinding met de server (of time-out). De broncontrole is niet geladen.';
  if(x.status===404)return d.error==='Entiteit niet gevonden'
    ?'Deze entiteit hoort niet (meer) bij dit traject. Er is geen broncontrole geladen.'
    :'De broncontrole is niet beschikbaar (404): de serverfunctie is mogelijk nog niet vrijgegeven, of het traject is niet gevonden. Er is niets gecontroleerd.';
  if(x.status===403)return d.error==='voorwaarden_niet_geaccepteerd'
    ?'Geen toegang: accepteer eerst de actuele platformvoorwaarden. Er is geen broncontrole geladen.'
    :'Geen toegang tot de financiële broncontrole voor deze rol of dit traject.';
  if(x.status===400)return 'Ongeldig verzoek voor de broncontrole (400). Er is geen broncontrole geladen.';
  if(x.ok&&!x.leesbaar)return 'Het antwoord van de server was onleesbaar. Er is geen broncontrole getoond.';
  if(x.ok)return 'Het antwoord van de server had een onverwachte vorm of hoort niet bij deze rol/entiteit. Er is geen broncontrole getoond.';
  return 'De broncontrole is tijdelijk niet beschikbaar (HTTP '+(Number(x.status)||'?')+'). Probeer het later opnieuw.';
}
function fbcLaadIntern(){
  var scope=fbcSyncScope();
  if(!fbcMagLezen()||FBC.status==='laden')return Promise.resolve();
  var id=++FBC.reqId;
  var ent=S._actieveEntiteit||null;
  FBC.status='laden';FBC.fout=null;FBC.data=null;
  fbcHerteken();
  var url=WORKER+'/mna/financieel/broncontrole/'+encodeURIComponent(S.code)+(ent?'?entiteit_id='+encodeURIComponent(ent):'');
  return fetchMetTimeout(url,{method:'GET'},30000)
    .then(fbcLeesAntwoord,function(){return {netwerk:true};})
    .then(function(x){
      if(FBC.reqId!==id||fbcScopeKey()!==scope)return; // verouderd: andere scope of nieuwer verzoek
      if(x.status===200&&x.leesbaar&&fbcValideerDto(x.d,ent)){FBC.status='ok';FBC.data=x.d;FBC.fout=null;}
      else{FBC.status='fout';FBC.data=null;FBC.fout=fbcLeesFout(x);}
      fbcHerteken();
    });
}
// Handmatig verversen sluit een open (niet verzonden) correctie: die hoort bij de vorige serverwaarde.
window.fbcLaad=function(){
  fbcSyncScope();
  if(FBC.status==='laden'||(FBC.correctie&&FBC.correctie.bezig))return Promise.resolve();
  FBC.melding=null;FBC.correctie=null;
  return fbcLaadIntern();
};

// ── Correctie (alleen verkoper) ─────────────────────────────────────────────────────────────────
// Nederlandse notatie (punt = duizendtal, komma = decimaal), daarna parseGeld als tegencontrole. "1234.5"
// of "1,234" is dubbelzinnig en wordt geweigerd i.p.v. geraden; leeg wordt nooit 0.
function fbcCanoniekBedrag(invoer){
  var s=String(invoer==null?'':invoer).trim();
  var uitleg='Gebruik Nederlandse notatie: punt voor duizendtallen, komma voor maximaal twee decimalen (bijv. 1.234.600 of -12500,50).';
  if(!s)return {ok:false,fout:'Vul een nieuwe waarde in.'};
  if(!/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)&&!/^-?\d+(,\d{1,2})?$/.test(s))return {ok:false,fout:uitleg};
  var neg=s.charAt(0)==='-';
  var delen=s.replace(/^-/,'').replace(/\./g,'').split(',');
  var heel=delen[0].replace(/^0+(?=\d)/,''), dec=(delen[1]||'').replace(/0+$/,'');
  if(heel.length>15)return {ok:false,fout:'Het bedrag is te groot.'};
  var nul=/^0+$/.test(heel)&&!dec;
  var canoniek=(neg&&!nul?'-':'')+heel+(dec?'.'+dec:'');
  var n=parseGeld(s);
  if(typeof n!=='number'||!isFinite(n)||String(Number(canoniek))!==canoniek||Math.abs(n-Number(canoniek))>1e-9)return {ok:false,fout:uitleg};
  return {ok:true,waarde:canoniek};
}
function fbcHuidige(veldId){
  var gevonden=null;
  ((FBC.data&&FBC.data.grootheden)||[]).forEach(function(g){(g.huidige_waarden||[]).forEach(function(hw){if(hw&&hw.veld_id===veldId)gevonden=hw;});});
  return gevonden;
}
function fbcBruikbareDocumenten(){
  var niet=['VERVANGEN','MISLUKT','TE_BEOORDELEN','ONLEESBAAR','IN_VERWERKING','EXTRACTIE_ONLEESBAAR'];
  return ((FBC.data&&FBC.data.documenten)||[]).filter(function(d){return fbcIsObj(d)&&typeof d.bron_document_id==='string'&&d.bron_document_id&&niet.indexOf(d.document_status)<0;});
}
function fbcLokaleWaarde(veldId){
  var df=fbcVeldDef(veldId);var key='financieel_'+veldId;
  var doel=df&&df.groepsniveau?S._groepData:S.data;
  var el=ge('df_'+veldId);
  return {doel:doel,key:key,dom:el&&typeof el.value==='string'?el.value:null,lokaal:doel&&doel[key]!=null?String(doel[key]):''};
}
// Niet-opgeslagen invoer in het gewone formulier mag nooit stil verloren gaan of tegen een andere
// basis worden gecorrigeerd: dan eerst gewoon opslaan en de broncontrole verversen.
function fbcLokaleAfwijking(veldId,serverWaarde){
  var srv=serverWaarde==null?'':String(serverWaarde).trim();
  if(S._pendingSave)return 'Er staat nog een opslag van het formulier klaar. Wacht tot die is opgeslagen en ververs dan de broncontrole.';
  var l=fbcLokaleWaarde(veldId);
  if((l.dom!==null&&l.dom.trim()!==srv)||l.lokaal.trim()!==srv)
    return 'Dit veld heeft in het formulier een andere waarde dan op de server (mogelijk nog niet opgeslagen). Sla eerst op en ververs de broncontrole; er is niets gecorrigeerd.';
  return null;
}
window.fbcOpenCorrectie=function(veldId){
  fbcSyncScope();
  if(!fbcMagCorrigeren()||FBC_VELDEN.indexOf(veldId)<0)return;
  if(FBC.correctie&&FBC.correctie.bezig)return;
  var hw=fbcHuidige(veldId);
  if(!hw||hw.automatisch_afgeleid)return;
  FBC.melding=null;
  FBC.correctie={veld_id:veldId,scope:FBC.scope,code:S.code,entiteit_id:S._actieveEntiteit||null,
    verwachte_oude_waarde:hw.waarde==null?null:String(hw.waarde),nieuw:'',reden:'',doc:'',bevestigd:false,bezig:false,fout:null};
  fbcHerteken();
};
window.fbcAnnuleerCorrectie=function(){ if(FBC.correctie&&!FBC.correctie.bezig){FBC.correctie=null;fbcHerteken();} };
window.fbcInvoer=function(naam,waarde){
  var c=FBC.correctie;
  if(!c||c.bezig||['nieuw','reden','doc','bevestigd'].indexOf(naam)<0)return;
  c[naam]=naam==='bevestigd'?waarde===true:String(waarde==null?'':waarde);
  if(naam==='nieuw'){var el=ge('fbc-preview');if(el)el.innerHTML=fbcPreviewHtml(c.nieuw);}
};
function fbcPreviewHtml(invoer){
  if(!String(invoer||'').trim())return '';
  var b=fbcCanoniekBedrag(invoer);
  return b.ok?'Wordt vastgelegd als: <strong>'+fbcBedrag(b.waarde)+'</strong> ('+fbcEsc(b.waarde)+')':'<span style="color:var(--red)">'+fbcEsc(b.fout)+'</span>';
}
function fbcCorrectieFout(c,tekst){ c.fout=tekst; fbcHerteken(); return Promise.resolve(); }
window.fbcVerstuurCorrectie=function(){
  var c=FBC.correctie;
  if(!c||c.bezig)return Promise.resolve();
  fbcSyncScope();
  if(FBC.correctie!==c||c.scope!==FBC.scope)return Promise.resolve();
  if(!fbcMagCorrigeren())return fbcCorrectieFout(c,'Correctie is niet toegestaan (alleen de verkoper, en niet bij een vergrendeld of afgesloten traject).');
  var bedrag=fbcCanoniekBedrag(c.nieuw);
  if(!bedrag.ok)return fbcCorrectieFout(c,bedrag.fout);
  if(c.verwachte_oude_waarde!==null&&bedrag.waarde===c.verwachte_oude_waarde)return fbcCorrectieFout(c,'De nieuwe waarde is gelijk aan de huidige waarde.');
  var reden=String(c.reden||'').trim();
  if(reden.length<10||reden.length>1000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(reden))return fbcCorrectieFout(c,'Geef een reden van 10 tot 1000 tekens (bewijs: waar in welk document staat de juiste waarde?).');
  var doc=fbcBruikbareDocumenten().find(function(d){return d.bron_document_id===c.doc;});
  if(!doc)return fbcCorrectieFout(c,'Kies het brondocument waarop de correctie berust.');
  if(!c.bevestigd)return fbcCorrectieFout(c,'Bevestig eerst de correctie.');
  var afw=fbcLokaleAfwijking(c.veld_id,c.verwachte_oude_waarde);
  if(afw)return fbcCorrectieFout(c,afw);
  var lok=fbcLokaleWaarde(c.veld_id);
  var body={code:S.code,entiteit_id:c.entiteit_id,veld_id:c.veld_id,nieuwe_waarde:bedrag.waarde,verwachte_oude_waarde:c.verwachte_oude_waarde,reden:reden,bron_document_id:doc.bron_document_id};
  c.bezig=true;c.fout=null;c.binding={doel:lok.doel,key:lok.key,oud:lok.lokaal};c.docNaam=doc.bestandsnaam||null;
  fbcHerteken();
  return fetchMetTimeout(WORKER+'/mna/financieel/broncontrole/correctie',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},30000)
    .then(fbcLeesAntwoord,function(){return {netwerk:true};})
    .then(function(x){ return fbcVerwerkCorrectie(c,body,x); });
};
// Lokale toestand pas bijwerken na een werkelijk geslaagd serverresultaat, en alleen in het object van
// de oorspronkelijke scope. Heeft de gebruiker tijdens het vastleggen in het veld getypt, dan blijft die
// invoer staan (niet overschreven, niet opgeslagen) en wordt dat gemeld.
function fbcWerkLokaalBij(c,actueel){
  var b=c.binding;if(!b||!b.doel)return 'onbekend';
  var el=actueel?ge('df_'+c.veld_id):null;
  if(el&&typeof el.value==='string'&&el.value.trim()!==b.oud.trim()){b.doel[b.key]=el.value;return 'invoer_behouden';}
  var nu=b.doel[b.key]==null?'':String(b.doel[b.key]);
  if(nu.trim()!==b.oud.trim())return 'invoer_behouden';
  b.doel[b.key]=c.opgeslagenWaarde;
  if(el)el.value=c.opgeslagenWaarde;
  return 'bijgewerkt';
}
function fbcVerwerkCorrectie(c,body,x){
  var actueel=FBC.correctie===c&&fbcScopeKey()===c.scope;
  var d=fbcIsObj(x.d)?x.d:{};
  var geslaagd=x.status===200&&x.leesbaar&&d.ok===true&&d.veld_id===body.veld_id&&(d.entiteit_id||null)===(body.entiteit_id||null)
    &&String(d.nieuwe_waarde)===body.nieuwe_waarde&&d.bron_document_id===body.bron_document_id
    &&typeof d.opgeslagen_waarde==='string'&&d.opgeslagen_waarde===body.nieuwe_waarde.replace('.',',');
  if(geslaagd){
    c.opgeslagenWaarde=d.opgeslagen_waarde;
    var lokaal=(S.code===c.code&&isVerkoper())?fbcWerkLokaalBij(c,actueel):'onbekend';
    if(FBC.correctie===c)FBC.correctie=null;
    if(!actueel)return Promise.resolve();
    FBC.melding={soort:'ok',html:'&#10003; Correctie vastgelegd: '+fbcVeldLabel(body.veld_id)+' van '+fbcBedrag(d.oude_waarde,true)+' naar '+fbcBedrag(body.nieuwe_waarde)
      +'. Brondocument: '+fbcEsc(c.docNaam||body.bron_document_id)+'. Audit-id: '+fbcEsc(d.audit_id)+'. Basisstatus: '+fbcEsc(d.basis_status||'ONBEKEND')+'.'
      +' Dit is een gebruikerscorrectie met reden, <strong>geen bronfeit</strong>; de oorspronkelijke bronwaarden en documenten blijven ongewijzigd.'
      +(lokaal==='invoer_behouden'?' <strong>Let op:</strong> uw eigen invoer in het formulierveld is behouden en niet overschreven; als u die opslaat, vervangt die de gecorrigeerde waarde.':'')};
    return fbcLaadIntern();
  }
  c.bezig=false;
  if(!actueel)return Promise.resolve();
  if(x.status===409){
    FBC.correctie=null;
    FBC.melding={soort:'warn',html:'&#9888; Correctie niet vastgelegd (409): '+fbcEsc(d.error||'de gegevens zijn intussen gewijzigd.')
      +' De broncontrole is opnieuw geladen; beoordeel de actuele waarde en dien zo nodig opnieuw in. Er wordt niet automatisch opnieuw verstuurd.'};
    return fbcLaadIntern();
  }
  var tekst;
  if(x.netwerk)tekst='Geen verbinding of time-out: het is onbekend of de correctie is aangekomen. Er wordt niet automatisch opnieuw verstuurd. Ververs de broncontrole om de actuele waarde te zien voordat u opnieuw indient.';
  else if(x.status===200)tekst='Onverwacht antwoord van de server: het is niet bevestigd dat de correctie is vastgelegd. Er is lokaal niets aangepast en niets opnieuw verstuurd; ververs de broncontrole.';
  else if(x.status===403)tekst=d.error==='vergrendeld'?'Dit traject is vergrendeld; de correctie is niet vastgelegd.'
    :d.error==='voorwaarden_niet_geaccepteerd'?'Accepteer eerst de actuele platformvoorwaarden; de correctie is niet vastgelegd.'
    :'Geen toegang: alleen de verkoper mag financiële waarden corrigeren. De correctie is niet vastgelegd.';
  else if(x.status===404&&!d.fout)tekst='Correctie niet beschikbaar (404): de serverfunctie is mogelijk nog niet vrijgegeven, of het traject/de entiteit is niet gevonden. Er is niets vastgelegd.';
  else if(x.status===400||x.status===404||x.status===413)tekst='Correctie niet vastgelegd: '+(d.error?String(d.error):'ongeldig verzoek ('+x.status+').');
  else tekst='Correctie niet bevestigd (HTTP '+(Number(x.status)||'?')+')'+(d.error?': '+String(d.error):'.')+' Er wordt niet automatisch opnieuw verstuurd; ververs de broncontrole om de actuele waarde te controleren.';
  return fbcCorrectieFout(c,tekst);
}

// ── Weergave ────────────────────────────────────────────────────────────────────────────────────
function fbcRenderDocumenten(d){
  var docs=d.documenten.filter(fbcIsObj);
  if(!docs.length)return '<div style="font-size:12px;color:var(--muted)">Geen financiële brondocumenten voor deze scope.</div>';
  var getoond=docs.slice(0,FBC_MAX.documenten);
  return '<ul style="margin:0;padding-left:1.1rem;font-size:12px;color:var(--sub);line-height:1.6">'+getoond.map(function(doc){
    return '<li><strong>'+(doc.bestandsnaam?fbcEsc(doc.bestandsnaam):fbcOnbekend('bestandsnaam onbekend'))+'</strong>'
      +' · status '+fbcEsc(doc.document_status||'onbekend')+' · methode '+fbcEsc(doc.methode||'onbekend')+(doc.methode_type?' ('+fbcEsc(doc.methode_type)+')':'')
      +' · '+(doc.levert_bronwaarden?'levert bronwaarden':'levert geen bronwaarden')
      +' · referentie: '+(doc.bron_document_id?'<code>'+fbcEsc(doc.bron_document_id)+'</code>':fbcOnbekend('afgeschermd'))
      +'</li>';
  }).join('')+'</ul>'+fbcAfgekapt(getoond.length,docs.length,'documenten')
    +'<div style="font-size:10px;color:var(--muted);margin-top:2px">Open een document via de documentenlijst van deze fase; de referentie hierboven is geen link.</div>';
}
function fbcRenderBron(b){
  var origineel=fbcIsObj(b.waarde_origineel)&&b.waarde_origineel.status==='BEKEND'&&b.waarde_origineel.tekst!=null
    ?'<code>'+fbcEsc(b.waarde_origineel.tekst)+'</code>':fbcOnbekend('origineel onbekend (niet gereconstrueerd)');
  var interp=fbcIsObj(b.interpretatie)?b.interpretatie:{};
  var ai=fbcIsObj(b.ai_interpretatie)?b.ai_interpretatie:null;
  var aiHtml='';
  if(ai){
    var v=fbcIsObj(ai.voorstel)?ai.voorstel:null;
    aiHtml='<div style="margin-top:3px;padding:4px 6px;background:var(--gold-bg);border-radius:4px">AI-voorstel (onbevestigd, geen bronfeit): ruwe AI-waarde '+(ai.waarde_ruw!=null?'<code>'+fbcEsc(ai.waarde_ruw)+'</code>':fbcOnbekend())
      +(v&&v.bronfragment?' · fragment: “'+fbcEsc(v.bronfragment)+'”':'')+(v&&v.locatie?' · locatie: '+fbcLocatie(v.locatie):'')+(v&&v.periode?' · periode: '+fbcPeriode(v.periode):'')+'</div>';
  }
  if(fbcIsObj(b.ai_bronfragment)&&b.ai_bronfragment.tekst)aiHtml+='<div style="margin-top:3px">AI-bronfragment (niet geverifieerd): “'+fbcEsc(b.ai_bronfragment.tekst)+'”</div>';
  return '<div style="border-top:1px solid var(--border);padding:6px 0;font-size:11px;color:var(--sub);line-height:1.6">'
    +fbcHerkomstBadge(b.herkomst)+' <strong>'+(b.bestandsnaam?fbcEsc(b.bestandsnaam):fbcOnbekend('document onbekend'))+'</strong>'
    +(b.bron_sleutel?' <span style="color:var(--muted)">('+fbcEsc(b.bron_sleutel)+')</span>':'')
    +'<div>Origineel in bron: '+origineel+' · genormaliseerd: '+(b.waarde_genormaliseerd!=null?fbcBedrag(b.waarde_genormaliseerd):fbcOnbekend())
    +' · valuta '+(b.valuta?fbcEsc(b.valuta):fbcOnbekend())+' · eenheid '+(b.eenheid?fbcEsc(b.eenheid):fbcOnbekend())+(b.teken?' · '+fbcEsc(b.teken):'')+'</div>'
    +'<div>Periode: '+fbcPeriode(b.periode)+'</div>'
    +'<div>Entiteitscope: '+fbcBronScope(b.scope)+'</div>'
    +'<div>Bronlocatie: '+fbcLocatie(b.locatie)+' · methode '+fbcEsc(b.methode||'onbekend')+' · extractie '+fbcDatum(b.extractiedatum)+'</div>'
    +'<div>Interpretatie: '+fbcEsc(interp.status||'onbekend')+(Array.isArray(interp.redenen)&&interp.redenen.length?' ('+fbcEsc(interp.redenen.join(', '))+')':'')
    +(Array.isArray(b.redenen)&&b.redenen.length?' · let op: '+fbcEsc(b.redenen.join(', ')):'')+'</div>'
    +(Array.isArray(b.ontbrekend)&&b.ontbrekend.length?'<div style="color:var(--gold-dark)">Ontbrekend: '+fbcLijst(b.ontbrekend)+'</div>':'')
    +aiHtml+'</div>';
}
function fbcRenderVergelijking(v){
  if(!fbcIsObj(v))return '';
  var a=fbcIsObj(v.a)?v.a:{}, b=fbcIsObj(v.b)?v.b:{};
  return '<div style="border-top:1px dashed var(--border);padding:4px 0;font-size:11px;color:var(--sub);line-height:1.6">'
    +fbcCrosscheckBadge(v.status)+' '+fbcEsc(a.bestandsnaam||'onbekend')+' ↔ '+fbcEsc(b.bestandsnaam||'onbekend')
    +' · verschil '+(v.absoluut_verschil!=null?fbcBedrag(v.absoluut_verschil):fbcOnbekend())
    +' · relatief '+(typeof v.relatief_verschil==='number'?fbcEsc(Math.round(v.relatief_verschil*10000)/100)+'%':fbcOnbekend('n.v.t.'))
    +' · tolerantie: '+fbcEsc(v.tolerantie_bron||'onbekend')
    +(Array.isArray(v.redenen)&&v.redenen.length?'<div>Redenen: '+fbcEsc(v.redenen.join(', '))+'</div>':'')
    +(Array.isArray(v.hypothesen)&&v.hypothesen.length?'<div>Hypothesen (niet bewezen): '+v.hypothesen.map(function(h){return fbcEsc(fbcIsObj(h)?(h.tekst||'onbekende hypothese'):h);}).join('; ')+'</div>':'')
    +'</div>';
}
function fbcRenderCorrectieForm(c){
  var docs=fbcBruikbareDocumenten();
  var dis=c.bezig?' disabled':'';
  var invoerStijl='width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:7px 9px;font-size:12px;color:var(--sub)';
  return '<div id="fbc-correctie" style="margin:6px 0 8px;padding:.75rem;border:1px solid var(--gold);background:var(--gold-bg);border-radius:var(--r);font-size:12px;color:var(--sub)">'
    +'<div style="font-weight:600;color:var(--gold-dark);margin-bottom:4px">Gemotiveerde correctie: '+fbcVeldLabel(c.veld_id)+'</div>'
    +'<div style="margin-bottom:6px">Huidige waarde op de server: <strong>'+fbcBedrag(c.verwachte_oude_waarde,true)+'</strong>. Alleen als deze waarde nog ongewijzigd is, wordt de correctie vastgelegd.</div>'
    +'<label for="fbc-nieuw" style="font-size:11px;font-weight:600">Nieuwe waarde</label>'
    +'<input type="text" id="fbc-nieuw" value="'+fbcEsc(c.nieuw)+'" placeholder="bijv. 1.234.600 of -12500,50" style="'+invoerStijl+'" oninput="fbcInvoer(\'nieuw\',this.value)"'+dis+'>'
    +'<div id="fbc-preview" style="font-size:11px;margin:2px 0 6px">'+fbcPreviewHtml(c.nieuw)+'</div>'
    +'<label for="fbc-doc" style="font-size:11px;font-weight:600">Brondocument (bewijs)</label>'
    +'<select id="fbc-doc" style="'+invoerStijl+'" onchange="fbcInvoer(\'doc\',this.value)"'+dis+'><option value="">— kies het brondocument —</option>'
    +docs.map(function(d){return '<option value="'+fbcEsc(d.bron_document_id)+'"'+(c.doc===d.bron_document_id?' selected':'')+'>'+fbcEsc(d.bestandsnaam||d.bron_document_id)+' ('+fbcEsc(d.document_status||'status onbekend')+')</option>';}).join('')
    +'</select>'+(docs.length?'':'<div style="color:var(--red);font-size:11px">Geen bruikbaar brondocument voor deze scope; een correctie kan nu niet worden vastgelegd.</div>')
    +'<label for="fbc-reden" style="font-size:11px;font-weight:600;display:block;margin-top:6px">Reden en bewijs (10–1000 tekens)</label>'
    +'<textarea id="fbc-reden" maxlength="1000" style="'+invoerStijl+';min-height:56px;resize:vertical" placeholder="Bijv. Volgens jaarrekening 2024, pagina 12, regel EBITDA." oninput="fbcInvoer(\'reden\',this.value)"'+dis+'>'+fbcEsc(c.reden)+'</textarea>'
    +'<label style="display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:11px"><input type="checkbox" id="fbc-bevestig"'+(c.bevestigd?' checked':'')+' onchange="fbcInvoer(\'bevestigd\',this.checked)"'+dis+'>'
    +'<span>Ik bevestig deze correctie op basis van het gekozen brondocument. De oorspronkelijke bronwaarden en documenten blijven ongewijzigd; de correctie wordt met reden in het auditspoor vastgelegd en is <strong>geen automatisch bronfeit</strong>.</span></label>'
    +(c.fout?'<div style="color:var(--red);font-size:12px;margin-top:6px">'+fbcEsc(c.fout)+'</div>':'')
    +'<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-sm" id="fbc-verstuur" style="background:var(--gold);font-size:11px" onclick="fbcVerstuurCorrectie()"'+dis+'>'+(c.bezig?'Bezig met vastleggen…':'Correctie vastleggen')+'</button>'
    +'<button class="btn-ghost btn-sm" style="font-size:11px" onclick="fbcAnnuleerCorrectie()"'+dis+'>Annuleren</button></div>'
    +'</div>';
}
function fbcRenderHuidige(hw,magCorrigeren){
  if(!fbcIsObj(hw))return '';
  var c=hw.laatste_broncorrectie;
  var html='<div style="font-size:12px;color:var(--sub);padding:3px 0">'+fbcVeldLabel(hw.veld_id)+': <strong>'+fbcBedrag(hw.waarde,true)+'</strong>'
    +' <span style="font-size:10px;color:var(--muted)">ingevoerde waarde ('+fbcEsc(hw.herkomst||'onbekend')+') · zekerheid '+fbcEsc(hw.zekerheid||'onbekend')+' — geen bewezen bronbinding</span>'
    +(hw.automatisch_afgeleid?'<div style="font-size:10px;color:var(--muted)">Automatisch afgeleide groepswaarde uit entiteitrijen (geen bewezen geconsolideerde bron); corrigeer de onderliggende entiteiten.</div>':'');
  if(fbcIsObj(c)){
    html+='<div style="font-size:10px;color:var(--muted)">Laatste broncorrectie: '+fbcBedrag(c.waarde)+' op '+fbcDatum(c.tijdstip)+' · reden: “'+fbcEsc(c.reden||'')+'” · document: '+fbcEsc(c.bestandsnaam||c.bron_document_id||'onbekend')
      +(c.nog_actueel?' · nog actueel (gebruikerscorrectie, geen bronfeit)':' · de waarde is sindsdien gewijzigd')+'</div>';
  }
  var veldOk=FBC_VELDEN.indexOf(hw.veld_id)>=0;
  if(magCorrigeren&&veldOk&&!hw.automatisch_afgeleid&&!FBC.correctie){
    html+=' <button class="btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="fbcOpenCorrectie(\''+hw.veld_id+'\')">Corrigeren met reden</button>';
  }
  html+='</div>';
  if(FBC.correctie&&veldOk&&FBC.correctie.veld_id===hw.veld_id)html+=fbcRenderCorrectieForm(FBC.correctie);
  return html;
}
function fbcRenderGrootheid(g,magCorrigeren){
  var cc=g.crosscheck;
  var bronnen=g.bronnen.filter(fbcIsObj);
  var verg=Array.isArray(cc.vergelijkingen)?cc.vergelijkingen:[];
  var bTonen=bronnen.slice(0,FBC_MAX.bronnen), vTonen=verg.slice(0,FBC_MAX.vergelijkingen);
  return '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.6rem .75rem;margin-bottom:.6rem">'
    +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong style="font-size:13px;color:var(--head)">'+fbcEsc(g.label||g.grootheid||'onbekend')+'</strong>'
    +fbcCrosscheckBadge(cc.status)+'<span style="font-size:10px;color:var(--muted)">'+fbcEsc(g.soort==='moment'?'momentopname':'periodegrootheid')+'</span></div>'
    +(cc.gebruikersactie?'<div style="font-size:11px;color:var(--muted);margin:2px 0 4px">'+fbcEsc(cc.gebruikersactie)+'</div>':'')
    +g.huidige_waarden.map(function(hw){return fbcRenderHuidige(hw,magCorrigeren);}).join('')
    +(bronnen.length?'<div style="font-size:11px;font-weight:600;color:var(--muted);margin-top:6px">Bronnen ('+bronnen.length+')</div>'+bTonen.map(fbcRenderBron).join('')+fbcAfgekapt(bTonen.length,bronnen.length,'bronnen')
      :'<div style="font-size:11px;color:var(--muted);margin-top:4px">Geen bronwaarde in de documenten van deze scope.</div>')
    +(verg.length?'<div style="font-size:11px;font-weight:600;color:var(--muted);margin-top:6px">Crosscheck</div>'+vTonen.map(fbcRenderVergelijking).join('')+fbcAfgekapt(vTonen.length,verg.length,'vergelijkingen'):'')
    +'</div>';
}
function fbcScopeTekst(){
  var d=FBC.data;
  if(d&&fbcIsObj(d.scope)&&d.scope.type==='ENTITEIT_RIJ')return 'Gegevensrij van entiteit <strong>'+fbcEsc(d.scope.entiteit_naam||fbcEntiteitNaam(d.scope.entiteit_id))+'</strong>. Of de bronnen enkelvoudig of geconsolideerd zijn, blijkt alleen uit de bronbasis per bron.';
  if(d&&fbcIsObj(d.scope)&&d.scope.type==='TRAJECT_RIJ')return 'Trajectniveau-rij (geen entiteit). Dit is <strong>niet automatisch geconsolideerd</strong>; of een bron enkelvoudig of geconsolideerd is, blijkt alleen uit de bronbasis per bron.';
  return S._actieveEntiteit?'Entiteit <strong>'+fbcEsc(fbcEntiteitNaam(S._actieveEntiteit))+'</strong>.':'Trajectniveau-rij (geen entiteit; niet automatisch geconsolideerd).';
}
function renderFinancieleBroncontrole(faseId){
  fbcSyncScope(); // eerst: een andere scope (ook koper/andere fase) wist altijd de geladen data
  if(faseId!=='financieel'||!fbcMagLezen())return '';
  var d=FBC.data, laden=FBC.status==='laden';
  var magCorrigeren=fbcMagCorrigeren();
  var html='<div class="panel" id="fbc-panel" style="margin-bottom:1rem">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
    +'<div class="sec-hdr" style="margin:0">&#128269; Financiële broncontrole</div>'
    +'<button class="btn-ghost btn-sm" id="fbc-laad-btn" onclick="fbcLaad()"'+(laden?' disabled':'')+'>'+(laden?'Laden…':(FBC.status==='idle'?'Broncontrole starten':'Verversen'))+'</button></div>'
    +'<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Scope: '+fbcScopeTekst()+'</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:.5rem">'
    +(isTussen()?'Alleen lezen: alleen de verkoper kan financiële waarden corrigeren.'
      :(magCorrigeren?'U kunt een waarde gemotiveerd corrigeren met reden en brondocument; de bronwaarden zelf blijven ongewijzigd.'
        :(d?'Correctie is nu niet mogelijk'+(fbcVergrendeld()?' (traject vergrendeld/afgesloten)':'')+'.':'')))+'</div>';
  if(FBC.melding)html+='<div style="font-size:12px;line-height:1.6;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid '+(FBC.melding.soort==='ok'?'var(--teal);background:var(--teal-bg)':'var(--gold);background:var(--gold-bg)')+'">'+FBC.melding.html+'</div>';
  if(FBC.status==='idle')html+='<div style="font-size:12px;color:var(--muted)">Nog niet geladen. Klik op "Broncontrole starten" om bronnen, onzekerheden en verschillen voor deze scope op te halen.</div>';
  else if(laden)html+='<div style="font-size:12px;color:var(--muted);font-style:italic">Broncontrole laden…</div>';
  else if(FBC.status==='fout')html+='<div style="font-size:12px;color:var(--red);background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.5rem .75rem">&#9888; '+fbcEsc(FBC.fout)+'</div>';
  else if(d){
    if(d.ontbrekend.length)html+='<div style="font-size:12px;color:var(--gold-dark);background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.5rem .75rem;margin-bottom:.5rem">Ontbrekende gegevens: '+fbcLijst(d.ontbrekend)+'</div>';
    html+='<div style="font-size:11px;font-weight:600;color:var(--muted);margin:.25rem 0">Documenten</div>'+fbcRenderDocumenten(d)
      +'<div style="font-size:11px;font-weight:600;color:var(--muted);margin:.75rem 0 .25rem">Grootheden</div>'
      +d.grootheden.map(function(g){return fbcRenderGrootheid(g,magCorrigeren);}).join('');
  }
  return html+'</div>';
}
