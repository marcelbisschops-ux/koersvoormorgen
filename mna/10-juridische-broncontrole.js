// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Productpunt 4 — juridische broncontrole (UI, 10 okt 2026). Leest de bestaande, gecommitte backendroute
// GET /mna/juridisch/broncontrole/{code} en, alleen voor de eigen begeleider, de geauditeerde
// POST /mna/juridisch/broncontrole/beoordeling (zie backend docs/legal-structure-control.md, worker/11
// en worker/41-juridische-broncontrole.js). Geen nieuwe API, geen AI, geen formulieropslag, geen
// entiteitmutatie, geen documentlink.
//
// Regels (bewust strikt):
// - Alleen verkoper en begeleider zien het paneel; koper (en elke andere rol) krijgt geen paneel en doet
//   geen verzoek. De server bepaalt de bovengrens; dit paneel krijgt geen eigen rechten.
// - Laden gebeurt alleen na een expliciete klik (Broncontrole starten/Verversen), nooit automatisch.
// - Elk verzoek is gebonden aan exact deze scope (code, rol, scherm, fase). Wisselt die scope, dan wordt
//   alles gewist (ook een begonnen motivatie) en wordt een laat antwoord genegeerd.
// - Alle servertekst gaat door jbcEsc (ook attributen). Bronvoorstellen zijn AI-interpretaties
//   (ONBEVESTIGD_VOORSTEL) en worden nooit als juridisch bewezen getoond; ontbrekende info blijft "onbekend".
// - Beoordelen: alleen begeleider, alleen bij rol "begeleider" + beoordeling_toegestaan===true van de
//   server, open traject, minstens één bruikbare bron en een geldige snapshotdigest. Nooit een
//   beheerderssleutel; geen automatische retry; bij 409 wordt alleen opnieuw gelezen.

var JBC_MAX = { platform: 50, bronEntiteiten: 30, relaties: 30, kring: 10, verschillen: 30, onbekenden: 30, documenten: 50, beoordelingen: 20, refs: 5 };
var JBC_STATUS = ['ONVOLDOENDE_BRONINFORMATIE', 'VERSCHILLEN_GESIGNALEERD', 'GEEN_VERSCHILLEN_GESIGNALEERD'];
var JBC_DIGEST_RE = /^[a-f0-9]{64}$/;
var JBC_VERSCHIL_ID_RE = /^[A-Za-z0-9_:>\-]{1,300}$/;
var JBC = { scope: null, reqId: 0, status: 'idle', data: null, fout: null, melding: null, besluit: null };

function jbcEsc(v){
  if(v===null||v===undefined)return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function jbcOnbekend(tekst){ return '<em style="color:var(--muted)">'+jbcEsc(tekst||'onbekend')+'</em>'; }
function jbcIsObj(v){ return v!==null&&typeof v==='object'&&!Array.isArray(v); }
function jbcArr(v){ return Array.isArray(v)?v:[]; }

// ── Scope en rechten ────────────────────────────────────────────────────────────────────────────
function jbcScopeKey(){
  var f=(typeof FASES!=='undefined'&&FASES[S.fase])||null;
  return JSON.stringify([S.code||'',S.rol||'',S.screen||'',f?f.id:'']);
}
function jbcSyncScope(){
  var k=jbcScopeKey();
  if(JBC.scope!==k){ JBC.reqId++; JBC.scope=k; JBC.status='idle'; JBC.data=null; JBC.fout=null; JBC.melding=null; JBC.besluit=null; }
  return k;
}
function jbcVerwachteRol(){ return isVerkoper()?'verkoper':(isTussen()?'begeleider':null); }
function jbcMagLezen(){ return !!S.code&&jbcVerwachteRol()!==null; }
function jbcVergrendeld(){ return !!(S.traject&&(S.traject.status==='vergrendeld'||S.traject.status==='afgesloten')); }
function jbcDigest(){ var c=JBC.data&&JBC.data.controle_snapshot; return jbcIsObj(c)&&typeof c.digest==='string'&&JBC_DIGEST_RE.test(c.digest)?c.digest:null; }
function jbcAantalBruikbaar(){ var c=JBC.data&&JBC.data.controle_snapshot; return jbcIsObj(c)&&typeof c.aantal_bruikbare_bronnen==='number'?c.aantal_bruikbare_bronnen:0; }
function jbcMagBeoordelen(){
  return isTussen()&&JBC.status==='ok'&&!!JBC.data&&JBC.data.rol==='begeleider'&&JBC.data.beoordeling_toegestaan===true
    &&!jbcVergrendeld()&&jbcAantalBruikbaar()>0&&jbcDigest()!==null;
}
function jbcNietBeoordelenReden(){
  if(!JBC.data)return '';
  if(jbcVergrendeld()||JBC.data.beoordeling_toegestaan!==true)return 'Beoordelen is nu niet mogelijk (traject vergrendeld/afgesloten of niet toegestaan door de server).';
  if(jbcAantalBruikbaar()<=0)return 'Beoordelen is nu niet mogelijk: er is geen bruikbaar juridisch bronvoorstel.';
  if(jbcDigest()===null)return 'Beoordelen is nu niet mogelijk: de controlesnapshot is onbekend.';
  return '';
}

// renderApp tekent het hele scherm opnieuw uit S.data; getypte maar nog niet opgeslagen invoer zou dan
// stil verdwijnen. Daarom de DOM-waarden van de velden van deze fase vasthouden en na het tekenen
// terugzetten — zonder S.data te wijzigen of op te slaan (zelfde aanpak als mna/09).
function jbcHerteken(){
  var f=(typeof FASES!=='undefined'&&FASES[S.fase])||null;
  var bewaard=[];
  if(f&&f.dataFields)f.dataFields.forEach(function(df){var el=ge('df_'+df.id);if(el&&typeof el.value==='string')bewaard.push([df.id,el.value]);});
  renderApp();
  bewaard.forEach(function(b){var el=ge('df_'+b[0]);if(el&&el.value!==b[1])el.value=b[1];});
}

// ── Laden ───────────────────────────────────────────────────────────────────────────────────────
function jbcLeesAntwoord(r){
  return r.json().then(function(d){return {status:r.status,ok:r.ok,d:d,leesbaar:true};},function(){return {status:r.status,ok:r.ok,d:null,leesbaar:false};});
}
function jbcValideerDto(d){
  if(!jbcIsObj(d)||d.ok!==true||d.rol!==jbcVerwachteRol()||typeof d.beoordeling_toegestaan!=='boolean')return false;
  if(JBC_STATUS.indexOf(d.status)<0||d.juridisch_bewezen!==false||typeof d.volledig!=='boolean')return false;
  if(!jbcIsObj(d.controle_snapshot)||!jbcIsObj(d.platform_structuur)||!Array.isArray(d.platform_structuur.entiteiten))return false;
  if(!jbcIsObj(d.bron_structuur)||!Array.isArray(d.bron_structuur.entiteiten))return false;
  if(!Array.isArray(d.verschillen)||!Array.isArray(d.onbekenden)||!Array.isArray(d.documenten))return false;
  return jbcIsObj(d.beoordelingen)&&Array.isArray(d.beoordelingen.lijst);
}
function jbcLeesFout(x){
  var d=jbcIsObj(x.d)?x.d:{};
  if(x.netwerk)return 'Geen verbinding met de server (of time-out). De juridische broncontrole is niet geladen.';
  if(x.status===404)return 'De juridische broncontrole is niet beschikbaar (404): de serverfunctie is mogelijk nog niet vrijgegeven, of het traject is niet gevonden. Er is niets gecontroleerd.';
  if(x.status===403)return d.error==='voorwaarden_niet_geaccepteerd'
    ?'Geen toegang: accepteer eerst de actuele platformvoorwaarden. Er is geen broncontrole geladen.'
    :'Geen toegang tot de juridische broncontrole voor deze rol of dit traject.';
  if(x.status===400)return 'Ongeldig verzoek voor de juridische broncontrole (400). Er is geen broncontrole geladen.';
  if(x.ok&&!x.leesbaar)return 'Het antwoord van de server was onleesbaar. Er is geen broncontrole getoond.';
  if(x.ok)return 'Het antwoord van de server had een onverwachte vorm of hoort niet bij deze rol. Er is geen broncontrole getoond.';
  return 'De juridische broncontrole is tijdelijk niet beschikbaar (HTTP '+(Number(x.status)||'?')+'). Probeer het later opnieuw.';
}
// Een begonnen motivatie blijft na herladen staan (zelfde scope), maar de bevestiging vervalt altijd en
// de beslissing vervalt als de controlesnapshot is gewijzigd: dan moet de begeleider opnieuw beoordelen.
function jbcHerijkBesluit(){
  var b=JBC.besluit;if(!b)return;
  b.bevestigd=false;
  var nu=jbcDigest();
  if(b.digest!==nu){ b.beslissing=''; b.digest=nu; b.gewijzigd=true; }
}
function jbcLaadIntern(){
  var scope=jbcSyncScope();
  if(!jbcMagLezen()||JBC.status==='laden')return Promise.resolve();
  var id=++JBC.reqId;
  JBC.status='laden';JBC.fout=null;JBC.data=null;
  jbcHerteken();
  var url=WORKER+'/mna/juridisch/broncontrole/'+encodeURIComponent(S.code);
  return fetchMetTimeout(url,{method:'GET'},30000)
    .then(jbcLeesAntwoord,function(){return {netwerk:true};})
    .then(function(x){
      if(JBC.reqId!==id||jbcScopeKey()!==scope)return; // verouderd: andere scope of nieuwer verzoek
      if(x.status===200&&x.leesbaar&&jbcValideerDto(x.d)){JBC.status='ok';JBC.data=x.d;JBC.fout=null;jbcHerijkBesluit();}
      else{JBC.status='fout';JBC.data=null;JBC.fout=jbcLeesFout(x);if(JBC.besluit)JBC.besluit.bevestigd=false;}
      jbcHerteken();
    });
}
window.jbcLaad=function(){
  jbcSyncScope();
  if(JBC.status==='laden'||(JBC.besluit&&JBC.besluit.bezig))return Promise.resolve();
  JBC.melding=null;
  return jbcLaadIntern();
};

// ── Beoordeling (alleen eigen begeleider) ───────────────────────────────────────────────────────
function jbcVerschilOpIndex(i){ var v=JBC.data?jbcArr(JBC.data.verschillen)[i]:null; return jbcIsObj(v)&&typeof v.id==='string'&&JBC_VERSCHIL_ID_RE.test(v.id)?v:null; }
function jbcVindVerschil(id){ return JBC.data?jbcArr(JBC.data.verschillen).find(function(v){return jbcIsObj(v)&&v.id===id;})||null:null; }
// index -1 = de hele controlesnapshot; anders een verschil uit verschillen[].
window.jbcOpenBesluit=function(index){
  jbcSyncScope();
  if(!jbcMagBeoordelen()||(JBC.besluit&&JBC.besluit.bezig))return;
  var vid=null;
  if(index!==-1){ var v=jbcVerschilOpIndex(index); if(!v)return; vid=v.id; }
  var oud=JBC.besluit;
  JBC.melding=null;
  // Een begonnen motivatie blijft alleen staan als het om hetzelfde onderwerp gaat.
  JBC.besluit={scope:JBC.scope,code:S.code,digest:jbcDigest(),verschil_id:vid,beslissing:'',reden:oud&&oud.verschil_id===vid?oud.reden:'',bevestigd:false,bezig:false,fout:null,gewijzigd:false};
  jbcHerteken();
};
window.jbcAnnuleerBesluit=function(){ if(JBC.besluit&&!JBC.besluit.bezig){JBC.besluit=null;jbcHerteken();} };
window.jbcInvoer=function(naam,waarde){
  var b=JBC.besluit;
  if(!b||b.bezig||['beslissing','reden','bevestigd'].indexOf(naam)<0)return;
  if(naam==='bevestigd')b.bevestigd=waarde===true;
  else if(naam==='beslissing')b.beslissing=waarde==='BEVESTIGD'||waarde==='AFGEWEZEN'?waarde:'';
  else b.reden=String(waarde==null?'':waarde);
};
function jbcBesluitFout(b,tekst){ b.fout=tekst; jbcHerteken(); return Promise.resolve(); }
window.jbcVerstuurBesluit=function(){
  var b=JBC.besluit;
  if(!b||b.bezig)return Promise.resolve();
  jbcSyncScope();
  if(JBC.besluit!==b||b.scope!==JBC.scope)return Promise.resolve();
  if(!jbcMagBeoordelen())return jbcBesluitFout(b,'Beoordelen is niet toegestaan (alleen de eigen begeleider, bij een open traject met een bruikbaar bronvoorstel en een geladen controlesnapshot).');
  var digest=jbcDigest();
  if(b.digest!==digest)return jbcBesluitFout(b,'De controlesnapshot is gewijzigd sinds u dit formulier opende. Beoordeel de actuele controle opnieuw.');
  if(b.beslissing!=='BEVESTIGD'&&b.beslissing!=='AFGEWEZEN')return jbcBesluitFout(b,'Kies een beslissing: BEVESTIGD of AFGEWEZEN.');
  var reden=String(b.reden||'').trim();
  if(reden.length<10||reden.length>1000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(reden))return jbcBesluitFout(b,'Geef een motivatie van 10 tot 1000 tekens (wat heeft u in welk brondocument gecontroleerd?).');
  if(b.verschil_id!==null&&!jbcVindVerschil(b.verschil_id))return jbcBesluitFout(b,'Dit verschil komt niet (meer) voor in de actuele controle. Sluit dit formulier en kies opnieuw.');
  if(!b.bevestigd)return jbcBesluitFout(b,'Bevestig eerst uw beoordeling.');
  var body={code:S.code,snapshot_digest:digest,beslissing:b.beslissing,reden:reden};
  if(b.verschil_id!==null)body.verschil_id=b.verschil_id;
  b.bezig=true;b.fout=null;
  jbcHerteken();
  return fetchMetTimeout(WORKER+'/mna/juridisch/broncontrole/beoordeling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},30000)
    .then(jbcLeesAntwoord,function(){return {netwerk:true};})
    .then(function(x){ return jbcVerwerkBesluit(b,body,x); });
};
function jbcVerwerkBesluit(b,body,x){
  var actueel=JBC.besluit===b&&jbcScopeKey()===b.scope;
  var d=jbcIsObj(x.d)?x.d:{};
  var geslaagd=x.status===200&&x.leesbaar&&d.ok===true&&d.beslissing===body.beslissing&&d.snapshot_digest===body.snapshot_digest
    &&(d.verschil_id||null)===(body.verschil_id||null)&&typeof d.audit_id==='string'&&/^WZ[A-Z0-9]{1,60}$/.test(d.audit_id)
    &&d.juridisch_bewezen===false&&d.entiteiten_gewijzigd===false;
  if(!actueel){ b.bezig=false; return Promise.resolve(); } // andere scope of formulier: niets tonen, niets laden
  if(geslaagd){
    JBC.besluit=null;
    JBC.melding={soort:'ok',html:'&#10003; Beoordeling vastgelegd: <strong>'+jbcEsc(d.beslissing)+'</strong>'
      +(body.verschil_id?' voor verschil <code>'+jbcEsc(body.verschil_id)+'</code>':' voor de hele controlesnapshot')
      +'. Audit-id: '+jbcEsc(d.audit_id)+' · snapshot <code>'+jbcEsc(d.snapshot_digest.slice(0,12))+'…</code>.'
      +' Dit is een menselijke beoordeling van een onbevestigd bronvoorstel, <strong>geen juridische totaalgoedkeuring</strong>; entiteiten en documenten zijn niet gewijzigd.'};
    return jbcLaadIntern();
  }
  b.bezig=false;
  if(x.status===409){
    b.beslissing='';b.bevestigd=false;
    JBC.melding={soort:'warn',html:'&#9888; Beoordeling niet vastgelegd (409): '+jbcEsc(d.error||'de broncontrole is intussen gewijzigd.')
      +' De controle is opnieuw geladen; beoordeel de actuele controle en leg zo nodig opnieuw vast. Er wordt niet automatisch opnieuw verstuurd.'};
    return jbcLaadIntern();
  }
  var tekst;
  if(x.netwerk)tekst='Geen verbinding of time-out: het is onbekend of de beoordeling is aangekomen. Er wordt niet automatisch opnieuw verstuurd. Ververs de controle en bekijk de beoordelingen voordat u opnieuw vastlegt.';
  else if(x.status===200)tekst='Onverwacht antwoord van de server: het is niet bevestigd dat de beoordeling is vastgelegd. Er is niets opnieuw verstuurd; ververs de controle en bekijk de beoordelingen.';
  else if(x.status===403)tekst=d.error==='vergrendeld'?'Dit traject is vergrendeld; de beoordeling is niet vastgelegd.'
    :d.error==='voorwaarden_niet_geaccepteerd'?'Accepteer eerst de actuele platformvoorwaarden; de beoordeling is niet vastgelegd.'
    :'Geen toegang: alleen de eigen begeleider kan een juridische bronbeoordeling vastleggen. Er is niets vastgelegd.';
  else if(x.status===404&&!d.fout&&!d.error)tekst='Beoordelen is niet beschikbaar (404): de serverfunctie is mogelijk nog niet vrijgegeven, of het traject is niet gevonden. Er is niets vastgelegd.';
  else if(x.status===400||x.status===404)tekst='Beoordeling niet vastgelegd: '+(d.error?String(d.error):'ongeldig verzoek ('+x.status+').');
  else if(x.status===503)tekst='De juridische broncontrole is tijdelijk niet beschikbaar (503)'+(d.error?': '+String(d.error):'; er is niets vastgelegd.')+' Er wordt niet automatisch opnieuw verstuurd.';
  else tekst='Beoordeling niet bevestigd (HTTP '+(Number(x.status)||'?')+')'+(d.error?': '+String(d.error):'.')+' Er wordt niet automatisch opnieuw verstuurd; ververs de controle.';
  return jbcBesluitFout(b,tekst);
}

// ── Opmaak ──────────────────────────────────────────────────────────────────────────────────────
function jbcBadge(kleur,tekst,titel){
  return '<span style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;color:#fff;background:'+kleur+';border-radius:8px;padding:1px 7px"'+(titel?' title="'+jbcEsc(titel)+'"':'')+'>'+jbcEsc(tekst)+'</span>';
}
function jbcVoorstelBadge(){ return jbcBadge('var(--gold-dark)','ONBEVESTIGD VOORSTEL · AI-INTERPRETATIE','Door AI uit de documentextractie gelezen; niet geverifieerd en nooit juridisch bewezen.'); }
var JBC_STATUS_TEKST = {
  ONVOLDOENDE_BRONINFORMATIE:['var(--muted)','Onvoldoende broninformatie'],
  VERSCHILLEN_GESIGNALEERD:['var(--red)','Verschillen gesignaleerd'],
  GEEN_VERSCHILLEN_GESIGNALEERD:['var(--teal)','Geen verschillen gesignaleerd (geen juridische goedkeuring)'],
};
var JBC_NIET_VASTGELEGD = {
  moeder_dochterrelaties_niet_vastgelegd:'moeder-dochterrelaties', eigendomspercentages_niet_vastgelegd:'eigendomspercentages',
  handelsnamen_niet_vastgelegd:'handelsnamen', consolidatiekring_niet_vastgelegd:'consolidatiekring', verkoopperimeter_niet_vastgelegd:'verkoopperimeter',
};
var JBC_TYPE = {
  ENTITEIT_ONTBREEKT_OP_PLATFORM:'Entiteit ontbreekt op platform', MOGELIJK_ONTBREKENDE_MOEDER:'Mogelijk ontbrekende moeder',
  NAAM_CONFLICT:'Naamconflict', KVK_CONFLICT:'KvK-conflict', KVK_ONTBREEKT_OP_PLATFORM:'KvK ontbreekt op platform', ROL_AFWIJKING:'Rolafwijking',
  BRON_NAAM_TEGENSTRIJDIG:'Bronnen tegenstrijdig over naam', BRON_KVK_TEGENSTRIJDIG:'Bronnen tegenstrijdig over KvK',
  PERCENTAGE_TEGENSTRIJDIG:'Percentages tegenstrijdig', PERCENTAGES_BOVEN_100:'Percentages boven 100%',
  CONSOLIDATIEKRING_TEGENSTRIJDIG:'Consolidatiekring tegenstrijdig', VERKOOPPERIMETER_TEGENSTRIJDIG:'Verkoopperimeter tegenstrijdig',
  PLATFORMENTITEIT_BUITEN_CONSOLIDATIEKRING:'Platformentiteit buiten consolidatiekring', PLATFORMENTITEIT_BUITEN_VERKOOPPERIMETER:'Platformentiteit buiten verkoopperimeter',
  GEEN_BRUIKBARE_BRON:'Geen bruikbare bron', GEEN_BRONVERMELDING:'Geen bronvermelding', MOEDER_ONBEKEND:'Moeder onbekend',
  PERCENTAGE_ONBEKEND:'Percentage onbekend', PERCENTAGE_ONGELDIG:'Percentage ongeldig',
  CONSOLIDATIEKRING_ONBEKEND:'Consolidatiekring onbekend', CONSOLIDATIEKRING_ONDUIDELIJK:'Consolidatiekring onduidelijk',
  VERKOOPPERIMETER_ONBEKEND:'Verkoopperimeter onbekend', VERKOOPPERIMETER_ONDUIDELIJK:'Verkoopperimeter onduidelijk',
  BRONNEN_NIET_MEEGENOMEN:'Bronnen niet meegenomen', DOCUMENTEN_ZONDER_BRUIKBARE_EXTRACTIE:'Documenten zonder bruikbare extractie', AFGEKAPT:'Controle afgekapt',
};
function jbcTypeRuw(t){ return JBC_TYPE[t]||('onbekend type: '+(t||'?')); }
function jbcType(t){ return jbcEsc(jbcTypeRuw(t)); }
function jbcAfgekapt(getoond,totaal,wat){
  return totaal>getoond?'<div style="font-size:11px;color:var(--gold-dark);margin-top:4px">&#9888; '+getoond+' van '+totaal+' '+jbcEsc(wat)+' getoond — deze weergave is niet volledig.</div>':'';
}
function jbcDatum(v){
  if(typeof v==='number'&&isFinite(v)){ try{ return jbcEsc(new Date(v).toISOString().slice(0,16).replace('T',' ')+' UTC'); }catch(e){ return jbcOnbekend(); } }
  return jbcOnbekend();
}
function jbcHash(h){ return typeof h==='string'&&h?'<code title="'+jbcEsc(h)+'">'+jbcEsc(h.slice(0,12))+'…</code>':jbcOnbekend('hash onbekend'); }
function jbcLijstTekst(arr,leeg){ var a=jbcArr(arr).filter(function(x){return typeof x==='string'&&x;}); return a.length?a.map(jbcEsc).join(', '):jbcOnbekend(leeg||'onbekend'); }
function jbcDocNaam(id){
  if(typeof id!=='string'||!id)return null;
  var d=jbcArr(JBC.data&&JBC.data.documenten).find(function(x){return jbcIsObj(x)&&x.bron_document_id===id;});
  return d&&typeof d.bestandsnaam==='string'&&d.bestandsnaam?d.bestandsnaam:null;
}
// Bronverwijzing: document-id, versie, hash, pagina en fragment uitsluitend uit de serverrij; wat
// ontbreekt staat expliciet als ontbrekend bewijs, nooit aangevuld.
function jbcBronRef(r){
  if(!jbcIsObj(r))return '';
  var naam=jbcDocNaam(r.bron_document_id), ontbreekt=[];
  if(!r.bron_document_id)ontbreekt.push('documentreferentie');
  if(r.versie==null)ontbreekt.push('versie');
  if(!r.inhoud_hash)ontbreekt.push('inhoudshash');
  if(r.pagina==null)ontbreekt.push('pagina');
  if(!r.bronfragment)ontbreekt.push('bronfragment');
  return '<li>'+(naam?'<strong>'+jbcEsc(naam)+'</strong> ':'')
    +(r.bron_document_id?'<code>'+jbcEsc(r.bron_document_id)+'</code>':jbcOnbekend('document afgeschermd/onbekend'))
    +' · versie '+(r.versie!=null?jbcEsc(r.versie):jbcOnbekend())+' · hash '+jbcHash(r.inhoud_hash)
    +' · pagina '+(r.pagina!=null?jbcEsc(r.pagina):jbcOnbekend())
    +(r.context?' · '+jbcEsc(r.context):'')
    +(r.bronfragment?'<div>Bronfragment (AI, niet geverifieerd): “'+jbcEsc(r.bronfragment)+'”</div>':'')
    +(ontbreekt.length?'<div style="color:var(--gold-dark)">Ontbrekend bewijs: '+jbcEsc(ontbreekt.join(', '))+'</div>':'')
    +'</li>';
}
function jbcBronRefs(refs){
  var a=jbcArr(refs).filter(jbcIsObj);
  if(!a.length)return '<div style="font-size:11px;color:var(--gold-dark)">Ontbrekend bewijs: geen bronverwijzing.</div>';
  var t=a.slice(0,JBC_MAX.refs);
  return '<ul style="margin:2px 0;padding-left:1.1rem;font-size:11px;color:var(--sub);line-height:1.5">'+t.map(jbcBronRef).join('')+'</ul>'+jbcAfgekapt(t.length,a.length,'bronverwijzingen');
}
function jbcPlatformEnt(p){
  if(!jbcIsObj(p))return jbcOnbekend('geen platformentiteit');
  return '<strong>'+(p.naam?jbcEsc(p.naam):jbcOnbekend('naam onbekend'))+'</strong>'
    +' · KvK '+(p.kvk?jbcEsc(p.kvk):jbcOnbekend(p.kvk_status==='ONGELDIG_FORMAAT'?'ongeldig formaat':'niet vastgelegd'))
    +' · rol '+(p.rol?jbcEsc(p.rol):jbcOnbekend('niet vastgelegd'));
}
function jbcBronSamenvatting(b){
  if(!jbcIsObj(b))return '';
  var d=[];
  if(Array.isArray(b.namen))d.push('namen volgens bron: '+jbcLijstTekst(b.namen));
  else if(typeof b.naam==='string')d.push('naam volgens bron: '+jbcEsc(b.naam));
  if(Array.isArray(b.kvk))d.push('KvK volgens bron: '+jbcLijstTekst(b.kvk,'geen'));
  if(Array.isArray(b.percentages))d.push('percentages volgens bron: '+b.percentages.filter(function(p){return typeof p==='number';}).map(function(p){return jbcEsc(p)+'%';}).join(', '));
  if(typeof b.totaal==='number')d.push('totaal volgens bron: '+jbcEsc(b.totaal)+'%');
  if(jbcIsObj(b.houder))d.push('houder: '+jbcLijstTekst(b.houder.namen));
  if(jbcIsObj(b.deelneming))d.push('deelneming: '+jbcLijstTekst(b.deelneming.namen));
  return d.length?'<div>Bron (onbevestigd): '+d.join(' · ')+'</div>':'';
}

// ── Weergave ────────────────────────────────────────────────────────────────────────────────────
var JBC_KOP = 'font-size:11px;font-weight:600;color:var(--muted);margin-top:10px;text-transform:uppercase;letter-spacing:.06em';
var JBC_RIJ = 'border-top:1px solid var(--border);padding:5px 0;font-size:11px;color:var(--sub);line-height:1.6';
function jbcRenderPlatform(ps){
  var ents=ps.entiteiten.filter(jbcIsObj), t=ents.slice(0,JBC_MAX.platform);
  return '<div style="'+JBC_KOP+'">Platformstructuur (handmatig register)</div>'
    +(ents.length?'<ul style="margin:2px 0;padding-left:1.1rem;font-size:12px;color:var(--sub);line-height:1.6">'+t.map(function(p){return '<li>'+jbcPlatformEnt(p)+'</li>';}).join('')+'</ul>'+jbcAfgekapt(t.length,ents.length,'platformentiteiten')
      :'<div style="font-size:12px;color:var(--muted)">Geen entiteiten in het platformregister.</div>')
    +'<div style="font-size:11px;color:var(--muted)">Het platform legt niet vast: '+jbcEsc(jbcArr(ps.niet_vastgelegd).map(function(k){return JBC_NIET_VASTGELEGD[k]||k;}).join(', ')||'onbekend')+'. Deze worden niet afgeleid.</div>';
}
function jbcRenderBronStructuur(bs){
  var ents=bs.entiteiten.filter(jbcIsObj), t=ents.slice(0,JBC_MAX.bronEntiteiten);
  var rel=jbcArr(bs.relaties).filter(jbcIsObj), tr=rel.slice(0,JBC_MAX.relaties);
  var html='<div style="'+JBC_KOP+'">Bronvoorstel uit documenten '+jbcVoorstelBadge()+'</div>';
  html+=ents.length?t.map(function(e){
    var m=jbcIsObj(e.platform_match)?e.platform_match:null;
    return '<div style="'+JBC_RIJ+'"><strong>'+jbcLijstTekst(e.namen,'naam onbekend')+'</strong> · KvK '+jbcLijstTekst(e.kvk,'onbekend')
      +(jbcArr(e.handelsnamen).length?' · handelsnamen '+jbcLijstTekst(e.handelsnamen):'')
      +' · rol volgens bron '+jbcLijstTekst(e.rollen_volgens_bron,'onbekend')
      +'<div>Koppeling platform: '+(m?(m.naam?jbcEsc(m.naam):jbcOnbekend('naam onbekend'))+' (op '+jbcEsc(m.op||'onbekend')+')':jbcOnbekend('geen koppeling'))+'</div>'
      +jbcBronRefs(e.vermeldingen)+'</div>';
  }).join('')+jbcAfgekapt(t.length,ents.length,'bronentiteiten'):'<div style="font-size:12px;color:var(--muted)">Geen entiteiten in bruikbare bronvoorstellen.</div>';
  if(rel.length){
    html+='<div style="'+JBC_KOP+'">Eigendomsrelaties volgens bron '+jbcVoorstelBadge()+'</div>'+tr.map(function(r){
      var h=jbcIsObj(r.houder)?r.houder:{}, dl=jbcIsObj(r.deelneming)?r.deelneming:{};
      var houder=h.type==='NATUURLIJK_PERSOON'?jbcOnbekend('natuurlijk persoon (naam afgeschermd)'):((h.naam?jbcEsc(h.naam):jbcOnbekend('houder onbekend'))+(h.kvk?' (KvK '+jbcEsc(h.kvk)+')':''));
      var pct=typeof r.percentage==='number'&&r.percentage_status==='VOLGENS_BRON'?jbcEsc(r.percentage)+'% volgens bron':jbcOnbekend(r.percentage_status==='ONGELDIG'?'percentage ongeldig':'percentage onbekend');
      return '<div style="'+JBC_RIJ+'">'+houder+' &#8594; '+(dl.naam?jbcEsc(dl.naam):jbcOnbekend('deelneming onbekend'))+(dl.kvk?' (KvK '+jbcEsc(dl.kvk)+')':'')+' · '+pct+jbcBronRefs([r.bron])+'</div>';
    }).join('')+jbcAfgekapt(tr.length,rel.length,'relaties');
  }
  [['consolidatiekring','Consolidatiekring volgens bron'],['verkoopperimeter','Verkoopperimeter volgens bron']].forEach(function(k){
    var lijst=jbcArr(bs[k[0]]).filter(jbcIsObj), tk=lijst.slice(0,JBC_MAX.kring);
    if(!lijst.length)return;
    html+='<div style="'+JBC_KOP+'">'+jbcEsc(k[1])+' '+jbcVoorstelBadge()+'</div>'+tk.map(function(x){
      var ents2=jbcArr(x.entiteiten).filter(jbcIsObj).map(function(e){return (e.naam?jbcEsc(e.naam):jbcOnbekend('naam onbekend'))+(e.kvk?' (KvK '+jbcEsc(e.kvk)+')':'');});
      return '<div style="'+JBC_RIJ+'">'+(ents2.length?ents2.join(', '):jbcOnbekend('geen herkenbare entiteiten'))+jbcBronRefs([x.bron])+'</div>';
    }).join('')+jbcAfgekapt(tk.length,lijst.length,k[0]+'-vermeldingen');
  });
  return html;
}
function jbcRenderVerschillen(d,mag){
  var alle=d.verschillen, t=alle.slice(0,JBC_MAX.verschillen);
  var html='<div style="'+JBC_KOP+'">Verschillen ('+alle.length+') — signalen, geen juridische feiten</div>';
  if(!alle.length)return html+'<div style="font-size:12px;color:var(--muted)">Geen verschillen gesignaleerd. Dat is geen juridische goedkeuring; zie de onbekenden.</div>';
  return html+t.map(function(v,i){
    if(!jbcIsObj(v))return '';
    return '<div style="'+JBC_RIJ+'">'+jbcBadge('var(--red)',jbcTypeRuw(v.type))+' '+jbcEsc(v.omschrijving||'')
      +' '+jbcVoorstelBadge()
      +(v.platform!==undefined?'<div>Platform: '+jbcPlatformEnt(v.platform)+'</div>':'')
      +jbcBronSamenvatting(v.bron)+jbcBronRefs(v.bronnen)
      +(mag&&!(JBC.besluit&&JBC.besluit.bezig)&&typeof v.id==='string'&&JBC_VERSCHIL_ID_RE.test(v.id)
        ?'<button class="btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="jbcOpenBesluit('+i+')">Dit verschil beoordelen</button>':'')
      +'</div>';
  }).join('')+jbcAfgekapt(t.length,alle.length,'verschillen');
}
function jbcRenderOnbekenden(d){
  var alle=d.onbekenden.filter(jbcIsObj), t=alle.slice(0,JBC_MAX.onbekenden);
  var html='<div style="'+JBC_KOP+'">Onbekenden en onzekerheden ('+alle.length+')</div>';
  if(!alle.length)return html+'<div style="font-size:12px;color:var(--muted)">Geen onbekenden gemeld.</div>';
  return html+t.map(function(o){
    return '<div style="'+JBC_RIJ+'">'+jbcBadge('var(--gold-dark)',jbcTypeRuw(o.type))+' '+jbcEsc(o.omschrijving||'')
      +(typeof o.aantal==='number'?' ('+jbcEsc(o.aantal)+')':'')
      +(o.platform?'<div>Platform: '+jbcPlatformEnt(o.platform)+'</div>':'')
      +(o.bronnen?jbcBronRefs(o.bronnen):'')+'</div>';
  }).join('')+jbcAfgekapt(t.length,alle.length,'onbekenden');
}
function jbcRenderDocumenten(d){
  var docs=d.documenten.filter(jbcIsObj), t=docs.slice(0,JBC_MAX.documenten);
  var html='<div style="'+JBC_KOP+'">Documenten en bruikbaarheid ('+docs.length+')</div>';
  if(!docs.length)return html+'<div style="font-size:12px;color:var(--muted)">Geen documenten in dit traject.</div>';
  return html+'<ul style="margin:2px 0;padding-left:1.1rem;font-size:11px;color:var(--sub);line-height:1.6">'+t.map(function(doc){
    return '<li><strong>'+(doc.bestandsnaam?jbcEsc(doc.bestandsnaam):jbcOnbekend('bestandsnaam onbekend'))+'</strong>'
      +' · referentie '+(doc.bron_document_id?'<code>'+jbcEsc(doc.bron_document_id)+'</code>':jbcOnbekend('afgeschermd'))
      +' · versie '+(doc.versie!=null?jbcEsc(doc.versie):jbcOnbekend())+' · hash '+jbcHash(doc.inhoud_hash)
      +' · status '+jbcEsc(doc.document_status||'onbekend')+' · methode '+jbcEsc(doc.methode||'onbekend')
      +' · juridisch voorstel: '+jbcEsc(doc.juridisch_voorstel||'onbekend')
      +(doc.reden_niet_gebruikt?' · niet gebruikt: '+jbcEsc(doc.reden_niet_gebruikt):'')
      +(doc.voorstel_afgekapt?' · <span style="color:var(--gold-dark)">voorstel afgekapt</span>':'')
      +(doc.ai_zelfgerapporteerde_betrouwbaarheid?' · AI noemt zichzelf "'+jbcEsc(doc.ai_zelfgerapporteerde_betrouwbaarheid)+'" (niet geverifieerd)':'')
      +'</li>';
  }).join('')+'</ul>'+jbcAfgekapt(t.length,docs.length,'documenten')
    +'<div style="font-size:10px;color:var(--muted);margin-top:2px">Open een document via de documentenlijst van de betreffende fase; de referentie hierboven is geen link.</div>';
}
function jbcRenderBeoordelingen(d){
  var b=d.beoordelingen, lijst=b.lijst.filter(jbcIsObj), t=lijst.slice(0,JBC_MAX.beoordelingen), digest=jbcDigest();
  var html='<div style="'+JBC_KOP+'">Menselijke beoordelingen ('+lijst.length+')</div>';
  if(b.status!=='BESCHIKBAAR')html+='<div style="font-size:12px;color:var(--gold-dark)">De bestaande beoordelingen konden niet worden gelezen; deze lijst is mogelijk onvolledig.</div>';
  if(!lijst.length)return html+'<div style="font-size:12px;color:var(--muted)">Nog geen beoordeling vastgelegd.</div>';
  return html+t.map(function(x){
    // Alleen ACTUEEL als de server het zegt én de digest exact gelijk is aan de getoonde snapshot.
    var actueel=x.status==='ACTUEEL'&&x.geldig_voor_actuele_snapshot===true&&digest!==null&&x.snapshot_digest===digest;
    var badge=actueel?jbcBadge('var(--teal)','ACTUEEL'):jbcBadge('var(--muted)',x.status==='ACTUEEL'?'STATUS ONZEKER':'HISTORISCH_VEROUDERD','Hoort bij een oudere controlesnapshot; geldt niet als actuele beoordeling.');
    return '<div style="'+JBC_RIJ+'">'+badge+' <strong>'+jbcEsc(x.beslissing||'onbekend')+'</strong>'
      +(x.verschil_id?' · verschil <code>'+jbcEsc(x.verschil_id)+'</code>':' · hele controlesnapshot')
      +' · '+jbcDatum(x.tijdstip)+' · '+jbcEsc(x.actor_rol||'onbekend')
      +' · audit-id '+(x.audit_id?jbcEsc(x.audit_id):jbcOnbekend())
      +' · snapshot '+jbcHash(x.snapshot_digest)
      +'<div>Motivatie: '+(x.reden?'“'+jbcEsc(x.reden)+'”':jbcOnbekend('niet beschikbaar'))+'</div></div>';
  }).join('')+jbcAfgekapt(t.length,lijst.length,'beoordelingen')
    +'<div style="font-size:10px;color:var(--muted);margin-top:2px">Een beoordeling is een menselijke beoordeling van een onbevestigd bronvoorstel en geen juridische totaalgoedkeuring.</div>';
}
function jbcRenderBesluitForm(b){
  var dis=b.bezig?' disabled':'';
  var v=b.verschil_id!==null?jbcVindVerschil(b.verschil_id):null;
  var stijl='width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:7px 9px;font-size:12px;color:var(--sub)';
  var keuze=function(w){return '<label style="margin-right:12px;font-size:12px"><input type="radio" name="jbc-beslissing" value="'+w+'"'+(b.beslissing===w?' checked':'')+' onchange="jbcInvoer(\'beslissing\',this.value)"'+dis+'> '+w+'</label>';};
  return '<div id="jbc-besluit" style="margin:8px 0;padding:.75rem;border:1px solid var(--gold);background:var(--gold-bg);border-radius:var(--r);font-size:12px;color:var(--sub)">'
    +'<div style="font-weight:600;color:var(--gold-dark);margin-bottom:4px">Beoordeling vastleggen — '
    +(b.verschil_id===null?'hele controlesnapshot':(v?jbcType(v.type)+' (<code>'+jbcEsc(b.verschil_id)+'</code>)':'verschil <code>'+jbcEsc(b.verschil_id)+'</code> (niet meer in de actuele controle)'))+'</div>'
    +(b.gewijzigd?'<div style="color:var(--gold-dark);margin-bottom:4px">De controlesnapshot is gewijzigd; uw motivatie is bewaard, maar kies de beslissing opnieuw op basis van de actuele controle.</div>':'')
    +'<div style="margin-bottom:6px">'+keuze('BEVESTIGD')+keuze('AFGEWEZEN')+'</div>'
    +'<label for="jbc-reden" style="font-size:11px;font-weight:600">Motivatie (10–1000 tekens)</label>'
    +'<textarea id="jbc-reden" maxlength="1000" style="'+stijl+';min-height:56px;resize:vertical" placeholder="Bijv. Gecontroleerd in het KvK-uittreksel, pagina 2." oninput="jbcInvoer(\'reden\',this.value)"'+dis+'>'+jbcEsc(b.reden)+'</textarea>'
    +'<label style="display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:11px"><input type="checkbox" id="jbc-bevestig"'+(b.bevestigd?' checked':'')+' onchange="jbcInvoer(\'bevestigd\',this.checked)"'+dis+'>'
    +'<span>Ik leg deze menselijke beoordeling vast voor de actuele controlesnapshot. Dit is <strong>geen juridische totaalgoedkeuring</strong>; entiteiten, documenten en bronvoorstellen blijven ongewijzigd en de beoordeling komt in het auditspoor.</span></label>'
    +(b.fout?'<div style="color:var(--red);font-size:12px;margin-top:6px">'+jbcEsc(b.fout)+'</div>':'')
    +'<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-sm" id="jbc-verstuur" style="background:var(--gold);font-size:11px" onclick="jbcVerstuurBesluit()"'+dis+'>'+(b.bezig?'Bezig met vastleggen…':'Beoordeling vastleggen')+'</button>'
    +'<button class="btn-ghost btn-sm" style="font-size:11px" onclick="jbcAnnuleerBesluit()"'+dis+'>Annuleren</button></div>'
    +'</div>';
}
function renderJuridischeBroncontrole(faseId){
  jbcSyncScope(); // eerst: een andere scope (ook koper/andere fase) wist altijd de geladen data
  if(faseId!=='juridisch'||!jbcMagLezen())return '';
  var d=JBC.data, laden=JBC.status==='laden', bezig=!!(JBC.besluit&&JBC.besluit.bezig);
  var mag=jbcMagBeoordelen();
  var html='<div class="panel" id="jbc-panel" style="margin-bottom:1rem">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
    +'<div class="sec-hdr" style="margin:0">&#9878; Juridische broncontrole</div>'
    +'<button class="btn-ghost btn-sm" id="jbc-laad-btn" onclick="jbcLaad()"'+(laden||bezig?' disabled':'')+'>'+(laden?'Laden…':(JBC.status==='idle'?'Broncontrole starten':'Verversen'))+'</button></div>'
    +'<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Vergelijkt het handmatige entiteitenregister met juridische bronvoorstellen uit de bestaande documentextractie. Bronvoorstellen zijn <strong>AI-interpretaties (onbevestigd)</strong> en nooit juridisch bewezen. Correcties aan entiteiten lopen via het bestaande entiteitenregister.</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:.5rem">'
    +(isVerkoper()?'Alleen lezen: alleen de eigen begeleider kan een bronbeoordeling vastleggen.'
      :(mag?'U kunt de controle of een verschil gemotiveerd beoordelen (BEVESTIGD/AFGEWEZEN). Dit is geen juridische totaalgoedkeuring.':jbcEsc(jbcNietBeoordelenReden())))+'</div>';
  if(JBC.melding)html+='<div style="font-size:12px;line-height:1.6;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid '+(JBC.melding.soort==='ok'?'var(--teal);background:var(--teal-bg)':'var(--gold);background:var(--gold-bg)')+'">'+JBC.melding.html+'</div>';
  if(JBC.status==='idle')html+='<div style="font-size:12px;color:var(--muted)">Nog niet geladen. Klik op "Broncontrole starten" om platformstructuur, bronvoorstellen, verschillen en onbekenden op te halen. Er wordt geen AI gestart.</div>';
  else if(laden)html+='<div style="font-size:12px;color:var(--muted);font-style:italic">Juridische broncontrole laden…</div>';
  else if(JBC.status==='fout')html+='<div style="font-size:12px;color:var(--red);background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.5rem .75rem">&#9888; '+jbcEsc(JBC.fout)+'</div>';
  else if(d){
    var st=JBC_STATUS_TEKST[d.status];
    var af=jbcIsObj(d.afgekapt)?d.afgekapt:{};
    var afDelen=[af.entiteiten?'entiteiten':null,af.documenten?'documenten':null,af.voorstellen?'voorstellen':null].filter(Boolean);
    html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px">'+jbcBadge(st[0],st[1])
      +'<span style="color:var(--muted)">bruikbare bronnen: '+jbcEsc(jbcAantalBruikbaar())+' · snapshot '+jbcHash(jbcDigest())+'</span></div>'
      +(d.volledig?'':'<div style="font-size:12px;color:var(--gold-dark);background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.5rem .75rem;margin-top:.5rem">&#9888; De controle is niet volledig (limiet bereikt'+(afDelen.length?': '+jbcEsc(afDelen.join(', ')):'')+'). Niet alle bronnen of entiteiten zijn meegenomen.</div>')
      +(typeof d.uitleg==='string'&&d.uitleg?'<div style="font-size:11px;color:var(--muted);margin-top:.4rem">'+jbcEsc(d.uitleg)+'</div>':'')
      +jbcRenderVerschillen(d,mag)
      +jbcRenderOnbekenden(d)
      +jbcRenderPlatform(d.platform_structuur)
      +jbcRenderBronStructuur(d.bron_structuur)
      +jbcRenderDocumenten(d)
      +jbcRenderBeoordelingen(d);
    if(mag&&!JBC.besluit)html+='<div style="margin-top:8px"><button class="btn-ghost btn-sm" id="jbc-besluit-snapshot" style="font-size:11px" onclick="jbcOpenBesluit(-1)">Hele controlesnapshot beoordelen</button></div>';
  }
  if(JBC.besluit&&isTussen())html+=jbcRenderBesluitForm(JBC.besluit);
  return html+'</div>';
}
