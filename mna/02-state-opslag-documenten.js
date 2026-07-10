var S={screen:'login',code:'',rol:'',traject:null,fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,_opy:{},_epy:{},_conflicts:[],_userEdited:{},_docSource:{},faseStatus:{},dossierVrijgegeven:false,_entiteiten:[],dataPerEntiteit:{},_actieveEntiteit:null};
// Groepsdata (S._groepData) en S.data wijzen initieel naar hetzelfde object — bij het wisselen van
// entiteit (switchEntiteit) wordt S.data omgezet naar de data van die entiteit, en weer terug. Alle
// bestaande code die S.data[...] leest/schrijft (fillPct, saveCurrent, getDataForFase, enz.) werkt
// hierdoor ongewijzigd door, ongeacht welke entiteit actief is — geen aparte parameter nodig.
S._groepData=S.data;
function switchEntiteit(entiteitId){
  if(entiteitId){
    if(!S.dataPerEntiteit[entiteitId])S.dataPerEntiteit[entiteitId]={};
    S._actieveEntiteit=entiteitId;
    S.data=S.dataPerEntiteit[entiteitId];
  }else{
    S._actieveEntiteit=null;
    S.data=S._groepData;
  }
}

// Gedeelde markdown-achtige-tekst → HTML-omzetting, gebruikt door elk AI-gegenereerd rapport
// (per-fase AI-advies, dashboard AI-analyse, waarderingsrapport) zodat opmaak overal consistent en
// leesbaar is — koppen, vetgedrukte tekst, bullet- en genummerde lijsten, alinea's. Géén tabellen
// (die worden elders al vóór aanroep verwijderd/omgezet, zie generateAI).
function mdToHtml(text){
  if(!text)return '';
  var h=String(text);
  // Pipe-tabellen (| Veld | Status |) omzetten naar leesbare tekst zonder pipes
  h=h.replace(/^\|[-| ]+\|$/gm,'');
  h=h.replace(/^\|.+\|$/gm,function(line){
    return line.replace(/^\||\|$/g,'').split('|').map(function(s){return s.trim();}).filter(Boolean).join(' — ');
  });
  h=h.replace(/  +/g,' ').replace(/\n{3,}/g,'\n\n');
  // Horizontale-lijn-markeringen (---) weglaten — de kaartranden in de app doen al dienst als scheiding
  h=h.replace(/^-{3,}$/gm,'');
  // Koppen (#, ## en ###)
  h=h.replace(/^#{1,3} (.+)$/gm,function(_,t){return '<h3>'+t.trim()+'</h3>';});
  // Vetgedrukt
  h=h.replace(/\*\*([^*]+)\*\*/g,function(_,t){return '<strong>'+t+'</strong>';});
  // Alinea's/lijsten per blok (gescheiden door lege regel)
  h=h.split('\n\n').map(function(p){
    p=p.trim();
    if(!p)return '';
    if(p.charAt(0)==='<')return p;
    var lines=p.split('\n').filter(function(l){return l.trim();});
    if(lines.length&&lines.every(function(l){return /^[-•]\s/.test(l.trim());})){
      return '<ul>'+lines.map(function(l){return '<li>'+l.replace(/^[-•]\s*/,'')+'</li>';}).join('')+'</ul>';
    }
    if(lines.length&&lines.every(function(l){return /^\d+[.)]\s/.test(l.trim());})){
      return '<ol>'+lines.map(function(l){return '<li>'+l.replace(/^\d+[.)]\s*/,'')+'</li>';}).join('')+'</ol>';
    }
    return '<p>'+lines.join('<br>')+'</p>';
  }).join('');
  return h;
}

// Groepsstructuur: geregistreerde entiteiten (holding + werkmaatschappijen) voor dit traject ophalen.
function loadEntiteiten(){
  if(!S.code||isKoper())return;
  fetch(WORKER+'/mna/entiteiten/'+S.code).then(function(r){return r.json();}).then(function(rows){
    S._entiteiten=Array.isArray(rows)?rows:[];
    renderApp();
  }).catch(function(){});
}
function entiteitNaam(id){
  if(!id)return '';
  var e=(S._entiteiten||[]).find(function(x){return x.id===id;});
  return e?e.naam:'';
}

// ── BEVEILIGING ─────────────────────────────────────────────────────────────
var SEC = {
  SESSION_MS: 8 * 60 * 60 * 1000,   // 8 uur sessieduur
  WARN_MS:    15 * 60 * 1000,        // waarschuwing 15 min voor expiry
  LOGIN_COOLDOWN_MS: 2000,           // 2 sec tussen loginpogingen
  MAX_ATTEMPTS: 10,                  // max pogingen per sessie
  loginAt: 0,
  lastActivity: 0,
  attempts: 0,
  lastAttemptAt: 0,
  _expTimer: null,
  _warnTimer: null,
  _actTimer: null
};

function secReset() {
  SEC.loginAt = 0; SEC.lastActivity = 0; SEC.attempts = 0;
  clearTimeout(SEC._expTimer); clearTimeout(SEC._warnTimer); clearTimeout(SEC._actTimer);
}

function secStartSession() {
  var now = Date.now();
  SEC.loginAt = now; SEC.lastActivity = now;
  clearTimeout(SEC._expTimer); clearTimeout(SEC._warnTimer);
  SEC._warnTimer = setTimeout(function() {
    if (S.screen !== 'login') {
      toast('Uw sessie verloopt over 15 minuten. Sla uw werk op of log opnieuw in om door te gaan.', 'warn', 8000);
    }
  }, SEC.SESSION_MS - SEC.WARN_MS);
  SEC._expTimer = setTimeout(function() {
    if (S.screen !== 'login') {
      toast('Sessie verlopen — u wordt automatisch uitgelogd.', 'warn', 4000);
      setTimeout(function() { uitloggen(); }, 2000);
    }
  }, SEC.SESSION_MS);
}

function secActivity() {
  SEC.lastActivity = Date.now();
}

function secCanLogin() {
  var now = Date.now();
  if (SEC.attempts >= SEC.MAX_ATTEMPTS) {
    toast('Te veel pogingen. Herlaad de pagina om opnieuw te proberen.', 'err', 6000);
    return false;
  }
  if (now - SEC.lastAttemptAt < SEC.LOGIN_COOLDOWN_MS) {
    toast('Even wachten...', 'warn', 1500);
    return false;
  }
  SEC.lastAttemptAt = now;
  SEC.attempts++;
  return true;
}

function secAuditLog(actie, extra) {
  if (!S.code) return;
  var payload = { code: S.code, rol: S.rol, actie: actie, ts: Date.now() };
  if (extra) Object.assign(payload, extra);
  fetch(WORKER + '/mna/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function() {});
}

// Activiteit bijhouden — reset op user interactie
document.addEventListener('click', secActivity, { passive: true });
document.addEventListener('keydown', secActivity, { passive: true });
// ────────────────────────────────────────────────────────────────────────────

function pct(id){var f=FASES.find(function(x){return x.id===id;});if(!f)return 0;var d=f.items.filter(function(_,i){return S.checked[id+'_'+i];}).length;return f.items.length?Math.round(d/f.items.length*100):0;}
function checkOmzetSom(){
  var ids=['omzetJaarwerk','omzetAdvies','omzetLoon','omzetFiscaal','omzetOverig'];
  var som=0;
  var heeftWaarden=false;
  ids.forEach(function(id){
    var v=parseFloat((S.data['financieel_'+id]||'').replace(',','.'));
    if(!isNaN(v)){som+=v;heeftWaarden=true;}
  });
  var el=document.getElementById('omzet-som-check');
  if(!el)return;
  if(!heeftWaarden){el.style.display='none';return;}
  el.style.display='block';
  var afwijking=Math.abs(som-100);
  if(afwijking<0.5){
    el.innerHTML='<span style="color:var(--teal)">✓ Omzetverdeling klopt: '+som.toFixed(0)+'%</span>';
  }else{
    el.innerHTML='<span style="color:var(--red)">⚠ Omzetverdeling: '+som.toFixed(0)+'% (moet 100% zijn, verschil: '+(som>100?'+':'')+(som-100).toFixed(0)+'%)</span>';
  }
}

// Fase-2-velden (post-LoI) tellen alleen mee zolang de verkoper ze ook daadwerkelijk kan zien —
// vóór ondertekening van de LoI zijn ze in het formulier verborgen achter een slotje (zie
// mna/06-schermen.js), dus meetellen als "verplicht maar leeg" gaf een onterecht laag/verwarrend
// percentage (regressie juli 2026: verkoper zag 34% terwijl alle bereikbare velden al klaar waren).
function loiIsGetekend(){return !!(S.loiGetekend||(S.traject&&S.traject.loi_getekend));}
function fillPct(id,dataBron){var f=FASES.find(function(x){return x.id===id;});if(!f)return 0;var bron=dataBron||S.data;var getekend=loiIsGetekend();var req=f.dataFields.filter(function(df){return df.req&&!df.header&&(getekend||df.fase!=='2');});var done=req.filter(function(df){return !!(bron[id+'_'+df.id]||'').trim();}).length;return req.length?Math.round(done/req.length*100):100;}
function totalFillPct(dataBron){var bron=dataBron||S.data;var getekend=loiIsGetekend();var t=0,d=0;FASES.forEach(function(f){var req=f.dataFields.filter(function(df){return df.req&&!df.header&&(getekend||df.fase!=='2');});t+=req.length;d+=req.filter(function(df){return !!(bron[f.id+'_'+df.id]||'').trim();}).length;});return t?Math.round(d/t*100):0;}
// Uitsluitend fase-1-velden checken (los van of de LoI al getekend is) — nodig om bij het inloggen
// te bepalen of "deel 1" af is, ook nadat fase 2 al is ontgrendeld en dus meetelt in fillPct/totalFillPct.
function fase1Compleet(){
  var t=0,d=0;
  FASES.forEach(function(f){
    var req=f.dataFields.filter(function(df){return df.req&&!df.header&&df.fase!=='2';});
    t+=req.length;
    d+=req.filter(function(df){return !!(S.data[f.id+'_'+df.id]||'').trim();}).length;
  });
  return t>0&&d===t;
}
// Per-entiteitoverzicht (Marcel, juli 2026: "hoe kan ik per onderdeel zien hoe ver het staat" —
// het samenvattingsscherm toonde alleen het groepspercentage, geen overzicht per entiteit).
function entiteitFillOverzicht(){
  if(!S._entiteiten||!S._entiteiten.length)return [];
  var groep=S._groepData||S.data;
  var lijst=[{naam:'Groep (geconsolideerd)',id:null,pct:totalFillPct(groep)}];
  S._entiteiten.forEach(function(e){
    var bron=S.dataPerEntiteit[e.id]||{};
    lijst.push({naam:e.naam,id:e.id,pct:totalFillPct(bron)});
  });
  return lijst;
}
function dc(v){return v>=70?'var(--teal)':v>=50?'var(--gold)':'var(--red)';}
function ge(id){return document.getElementById(id);}
function esc(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function isVerkoper(){return S.rol==='verkoper';}
function isKoper(){return S.rol==='koper';}
function isTussen(){return S.rol==='tussenpersoon';}
function isAdmin(){return isTussen();}

function getMissing(){
  var missing=[];
  FASES.forEach(function(f){
    var missingFields=f.dataFields.filter(function(df){return df.req&&!df.header&&!(S.data[f.id+'_'+df.id]||'').trim();});
    if(missingFields.length)missing.push({fase:f.num+'. '+f.title,fields:missingFields.map(function(df){return df.label;})});
  });
  return missing;
}

function saveCurrent(cb){
  var f=FASES[S.fase];
  if(!f||S.screen!=='main'||isKoper())return;
  markDirty();
  if(S.traject&&S.traject.status==='vergrendeld'){if(cb)cb();return;}
  f.dataFields.forEach(function(df){
    if(df.header){return;}
    var el=ge('df_'+df.id);
    var key=f.id+'_'+df.id;
    if(el){
      // _userEdited wordt alleen gezet via oninput, NIET hier
      if(el.value.trim()||S._userEdited[key])S.data[key]=el.value;
    }
    // Als element niet in DOM is, behoud altijd bestaande S.data waarde
  });
  var nel=ge('notitie_'+f.id);if(nel)S.notities[f.id]=nel.value;
  clearTimeout(S.saveTimer);
  S.saveTimer=setTimeout(function(){
    fetch(WORKER+'/mna/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code:S.code,fase_id:f.id,data_json:getDataForFase(f.id),checklist_json:getChecklistForFase(f.id),notitie:S.notities[f.id]||'',entiteit_id:S._actieveEntiteit||undefined})
    }).then(function(r){return r.json();}).then(function(d){
      if(d.error==='vergrendeld'){showAlert('Dit traject is vergrendeld. Uw wijzigingen zijn niet opgeslagen.');}
      else{
        showSaveIndicator();
        // Groepsstructuur: bij een entiteit-save stuurt de server de bijgewerkte groepswaarden mee terug —
        // direct verwerken in S._groepData zodat "Groep"-weergave meteen klopt, ook zonder herfetch.
        if(d.groepswaarden)Object.keys(d.groepswaarden).forEach(function(k){var v=d.groepswaarden[k];if(v&&v.value!==undefined)S._groepData[f.id+'_'+k]=v.value;});
      }
    }).catch(function(){});
    if(cb)cb();
  },800);
}

// AI-verificatiestatus: waar komt een veldwaarde vandaan? 'ai_document' (uit documentextractie,
// S._docSource houdt de bestandsnaam bij), 'handmatig' (getypt door gebruiker, S._userEdited),
// 'auto_consolidatie' (Fase 2 — automatisch opgeteld/gemiddeld uit entiteiten, server-side gezet),
// of onbekend (bijv. data van vóór deze functionaliteit).
function veldBron(key){
  if(S._docSource&&S._docSource[key])return {bron:'ai_document',bron_doc:S._docSource[key]};
  if(S._userEdited&&S._userEdited[key])return {bron:'handmatig'};
  return null;
}
function getDataForFase(id){var f=FASES.find(function(x){return x.id===id;});if(!f)return {};var out={};f.dataFields.forEach(function(df){if(df.header)return;var v=S.data[id+'_'+df.id];if(v){var obj={value:v,label:df.label,req:df.req||false};var b=veldBron(id+'_'+df.id);if(b)Object.assign(obj,b);out[df.id]=obj;}});return out;}
function getChecklistForFase(id){var out={items:{},redflags:{}};var f=FASES.find(function(x){return x.id===id;});if(!f)return out;f.items.forEach(function(_,i){out.items[i]=!!S.checked[id+'_'+i];});f.redflags.forEach(function(_,i){out.redflags[i]=!!S.checked[id+'_rf_'+i];});return out;}
function loadDataFromDB(dbData){dbData.forEach(function(row){var id=row.fase_id;var dj=typeof row.data_json==='string'?JSON.parse(row.data_json||'{}'):row.data_json||{};var cj=typeof row.checklist_json==='string'?JSON.parse(row.checklist_json||'{}'):row.checklist_json||{};var f=FASES.find(function(x){return x.id===id;});if(!f)return;
  // Groepsstructuur (Fase 2): rijen met entiteit_id gaan naar de per-entiteit-opslag, niet naar S._groepData
  var doel=row.entiteit_id?(S.dataPerEntiteit[row.entiteit_id]=S.dataPerEntiteit[row.entiteit_id]||{}):S._groepData;
  Object.keys(dj).forEach(function(k){var v=dj[k];if(v&&v.value){doel[id+'_'+k]=v.value;
    // Herkomst herstellen zodat de AI-verificatiestatus ook na herladen nog klopt
    if(v.bron==='ai_document'&&v.bron_doc){if(!S._docSource)S._docSource={};S._docSource[id+'_'+k]=v.bron_doc;}
    else if(v.bron==='handmatig'){if(!S._userEdited)S._userEdited={};S._userEdited[id+'_'+k]=true;}
  }});
  if(row.entiteit_id)return; // checklist/notitie/koper_reactie blijven groepsniveau — niet per entiteit
  if(cj.items)Object.keys(cj.items).forEach(function(i){S.checked[id+'_'+i]=cj.items[i];});if(cj.redflags)Object.keys(cj.redflags).forEach(function(i){S.checked[id+'_rf_'+i]=cj.redflags[i];});if(row.notitie)S.notities[id]=row.notitie;if(row.koper_reactie){if(!S.koperReacties)S.koperReacties={};S.koperReacties[id]=row.koper_reactie;}});}
// Overzicht "wat heeft AI gedaan" per traject — telt velden per herkomst en documentstatus,
// zodat de adviseur in één oogopslag ziet wat AI wel heeft geverifieerd/ingevuld en wat niet.
function berekenAiVerificatiestatus(){
  var telling={ai_document:0,handmatig:0,auto_consolidatie:0,onbekend:0,totaal:0};
  var perFase={};
  (S._mnaData||[]).forEach(function(row){
    if(row.entiteit_id)return; // rapport gaat over het groepsniveau — de weergave die adviseur/koper/AI gebruiken
    var dj;try{dj=typeof row.data_json==='string'?JSON.parse(row.data_json||'{}'):row.data_json||{};}catch(e){dj={};}
    var f={ai_document:0,handmatig:0,auto_consolidatie:0,onbekend:0};
    Object.keys(dj).forEach(function(k){
      var v=dj[k];if(!v||!v.value)return;
      telling.totaal++;
      var cat=v.auto?'auto_consolidatie':(v.bron==='ai_document'?'ai_document':(v.bron==='handmatig'?'handmatig':'onbekend'));
      telling[cat]++;f[cat]++;
    });
    perFase[row.fase_id]=f;
  });
  var docs=[];Object.keys(DOCS||{}).forEach(function(fid){(DOCS[fid]||[]).forEach(function(d){docs.push(Object.assign({fase_id:fid},d));});});
  var docsGeanalyseerd=docs.filter(function(d){return !d.verworpen&&!d.uploading;});
  var docsVerworpen=docs.filter(function(d){return d.verworpen;});
  return {telling:telling,perFase:perFase,docsGeanalyseerd:docsGeanalyseerd,docsVerworpen:docsVerworpen,entiteitenActief:!!(S._entiteiten&&S._entiteiten.length)};
}
function showSaveIndicator(tekst){var el=ge('save-ind');if(!el)return;el.textContent=tekst||'Opgeslagen ✓';el.classList.add('show');setTimeout(function(){el.classList.remove('show');},2500);}
function showAlert(msg){toast(msg,"warn");}
function toast(msg,type,dur){type=type||'ok';dur=dur||3500;var c=document.getElementById('toast-container');if(!c){c=document.createElement('div');c.id='toast-container';c.className='toast-container';document.body.appendChild(c);}var t=document.createElement('div');t.className='toast toast-'+type;var ico=type==='ok'?'✓':type==='err'?'✕':type==='warn'?'⚠':'ℹ';t.innerHTML='<span style="font-size:15px;flex-shrink:0;color:'+(type==='ok'?'var(--teal)':type==='err'?'var(--red)':type==='warn'?'var(--gold)':'#2a5ea0')+'">'+ico+'</span><span style="flex:1;line-height:1.5">'+String(msg).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px;padding:0;line-height:1;flex-shrink:0">&times;</button>';c.appendChild(t);setTimeout(function(){t.classList.add('hide');setTimeout(function(){if(t.parentElement)t.parentElement.removeChild(t);},220);},dur);return t;}

function schedSave(){if(S.traject&&S.traject.status==='vergrendeld')return;markDirty();clearTimeout(S.saveTimer);S.saveTimer=setTimeout(function(){saveCurrent();},1200);}
function userEdit(el){
  // Markeer veld als handmatig bewerkt door gebruiker
  var faseId=FASES[S.fase]&&FASES[S.fase].id;
  if(el&&el.id&&faseId){
    var dfId=el.id.replace('df_','');
    S._userEdited[faseId+'_'+dfId]=true;
    // Wis docSource want gebruiker overschrijft nu zelf
    if(S._docSource)delete S._docSource[faseId+'_'+dfId];
  }
  schedSave();checkOmzetSom();
}

// Dirty tracking — weet of er onopgeslagen wijzigingen zijn
var _lastSavedHash = '';
function _dataHash(){
  // Snelle hash van alle gevulde velden om dirty state te detecteren
  if(!S.code)return'';
  var parts=[];
  FASES.forEach(function(f){
    f.dataFields.forEach(function(df){
      if(!df.header){var v=S.data[f.id+'_'+df.id];if(v)parts.push(f.id+'_'+df.id+'='+v);}
    });
  });
  return parts.join('|');
}
function markDirty(){S._dirty=true;}
function isDirty(){return !!S._dirty;}

function saveAll(opts){
  if(!S.code||S.traject&&S.traject.status==='vergrendeld')return;
  var useBeacon=opts&&opts.beacon; // voor pagehide/beforeunload
  var fasesMetData=FASES.filter(function(f){
    return f.dataFields.some(function(df){return !df.header&&(S.data[f.id+'_'+df.id]||'').trim();});
  });
  if(!fasesMetData.length)return;
  fasesMetData.forEach(function(f){
    var payload={code:S.code,fase_id:f.id,data_json:getDataForFase(f.id),checklist_json:getChecklistForFase(f.id),notitie:S.notities[f.id]||'',entiteit_id:S._actieveEntiteit||undefined};
    var body=JSON.stringify(payload);
    if(useBeacon&&navigator.sendBeacon){
      // sendBeacon: gegarandeerd verstuurd ook als tabblad sluit
      var blob=new Blob([body],{type:'application/json'});
      navigator.sendBeacon(WORKER+'/mna/save',blob);
    } else {
      fetch(WORKER+'/mna/save',{method:'POST',headers:{'Content-Type':'application/json'},body:body
      }).then(function(r){return r.json();}).then(function(d){
        if(d.error==='vergrendeld')showAlert('Dit traject is vergrendeld.');
        else if(!d.error){showSaveIndicator();}
      }).catch(function(){});
    }
  });
  S._dirty=false;
  _lastSavedHash=_dataHash();
}

// Auto-save elke 30 seconden als er dirty wijzigingen zijn
setInterval(function(){
  if(S.screen==='main'&&S.code&&isDirty()){
    saveAll();
    showSaveIndicator('Auto-opgeslagen ✓');
  }
},30000);

// Bij tab wisselen (visibilitychange): direct opslaan
document.addEventListener('visibilitychange',function(){
  if(document.hidden&&S.screen==='main'&&S.code&&isDirty()){
    saveAll();
  }
});

// Bij tabblad sluiten of pagina verlaten: sendBeacon (gegarandeerd)
window.addEventListener('pagehide',function(){
  if(S.screen==='main'&&S.code&&isDirty()){
    saveAll({beacon:true});
  }
});

// Fallback voor browsers zonder pagehide
window.addEventListener('beforeunload',function(){
  if(S.screen==='main'&&S.code&&isDirty()){
    saveAll({beacon:true});
  }
});

// -- DOCUMENT STATE ----------------------------------------------
var DOCS = {};  // { faseId: [{id, naam, type, grootte, analyse, velden, uploading}] }

function getDocsForFase(faseId) {
  return DOCS[faseId] || [];
}

function loadDocsForFase(faseId) {
  if (!S.code || isKoper()) return;
  fetch(WORKER + '/mna/document/lijst/' + S.code + '/' + faseId)
    .then(function(r){ return r.json(); })
    .then(function(docs){
      // Dedupliceer op id — server kan dubbele records hebben
      var seen={};
      DOCS[faseId] = docs.filter(function(d){ if(seen[d.id])return false; seen[d.id]=true; return true; })
        .map(function(d){
          return {
            id: d.id, naam: d.bestand_naam, type: d.bestand_type,
            grootte: d.bestand_grootte, analyse: d.analyse,
            velden: (function(s){try{var r=JSON.parse(s||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{};}catch(e){return {};}})(d.veld_extractie),
            uploaded_at: d.uploaded_at||null,
            bewaard: !!d.bewaard, methode: d.methode, uploading: false
          };
        });
      renderApp();
    }).catch(function(){});
}

// Groepsstructuur (Fase 2): slaat de data van één entiteit op voor de opgegeven fases (gebruikt na
// document-extractie die aan een entiteit is gekoppeld) en verwerkt de teruggekomen groepswaarden.
function saveEntiteitData(entiteitId, faseIds){
  if(!entiteitId)return;
  var origData=S.data;
  S.data=S.dataPerEntiteit[entiteitId]=S.dataPerEntiteit[entiteitId]||{};
  faseIds.forEach(function(faseId){
    var payload=getDataForFase(faseId);
    if(!Object.keys(payload).length)return;
    fetch(WORKER+'/mna/save',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code:S.code,fase_id:faseId,data_json:payload,entiteit_id:entiteitId})
    }).then(function(r){return r.json();}).then(function(d){
      if(d.groepswaarden)Object.keys(d.groepswaarden).forEach(function(k){var v=d.groepswaarden[k];if(v&&v.value!==undefined)S._groepData[faseId+'_'+k]=v.value;});
      renderApp();
    }).catch(function(){});
  });
  S.data=origData;
}

async function uploadDocument(faseId, file) {
  if (!S.code || isKoper()) return;
  if (S.traject && S.traject.status === 'vergrendeld') { toast('Traject is vergrendeld.','warn'); return; }
  var maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) { toast('Bestand te groot (max 20MB). Huidig: ' + Math.round(file.size/1024/1024) + 'MB','warn'); return; }

  // Show uploading state
  if (!DOCS[faseId]) DOCS[faseId] = [];
  var tempId = 'uploading_' + Date.now();
  DOCS[faseId].unshift({ id: tempId, naam: file.name, type: file.type, grootte: file.size, analyse: '', velden: {}, uploading: true });
  renderApp();

  var formData = new FormData();
  formData.append('file', file);
  var bewaar = S.traject && S.traject.bewaar_docs !== false;
  var entiteitSel = document.getElementById('entiteit-select-'+faseId);
  var entiteitId = entiteitSel ? entiteitSel.value : '';
  var url = WORKER + '/mna/document/upload?code=' + S.code + '&fase_id=' + faseId + '&bewaar=' + bewaar + (entiteitId?'&entiteit_id='+encodeURIComponent(entiteitId):'');

  try {
    var resp = await fetch(url, { method: 'POST', body: formData });
    var d = await resp.json();
    if (d.ok) {
      // Replace temp with real
      DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== tempId; });
      DOCS[faseId].unshift({
        id: d.doc_id, naam: file.name, type: file.type, grootte: file.size,
        analyse: d.analyse, velden: d.veld_extractie || {}, bewaard: !!d.r2_opgeslagen,
        uploaded_at: Date.now(), uploading: false, verworpen: !!d.verworpen, verworpen_reden: d.verworpen_reden||null
      });
      if (d.veld_extractie) {
        S._conflicts=[];
        var alleFases=['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];
        alleFases.forEach(function(fid){ autoFillFromExtraction(fid, d.veld_extractie, false, file.name, entiteitId); });
        if(S._conflicts&&S._conflicts.length){
          renderApp();setTimeout(toonConflictDialog,300);
        }else if(entiteitId){
          renderApp();saveEntiteitData(entiteitId,alleFases);
        }else{markDirty();renderApp();schedSave();}
      }
      // Toon crosscheck waarschuwingen
      if((d.crosschecks&&d.crosschecks.length)||(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam)){
        var msgs=[];
        // Entiteit check
        if(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam){
          var n1=(d.entiteit_naam||'').toLowerCase(),n2=(S.traject.kantoor_naam||'').toLowerCase();
          if(!n1.includes(n2.split(' ')[0])&&!n2.includes(n1.split(' ')[0]))
            msgs.push('⚠ Entiteit in document ("'+d.entiteit_naam+'") wijkt af van kantoornaam ("'+S.traject.kantoor_naam+'")');
        }
        if(d.crosschecks)msgs=msgs.concat(d.crosschecks);
        if(msgs.length){
          var md='<div style="background:#fff8f0;border:1px solid #e8a84c;border-radius:6px;padding:.75rem;margin:.5rem 0">'
            +'<div style="font-size:11px;font-weight:600;color:#8a5a00;margin-bottom:.4rem">⚠ Aandachtspunten bij '+esc(file.name)+'</div>'
            +msgs.map(function(m){return '<div style="font-size:12px;color:#5a4010;padding:2px 0">• '+esc(m)+'</div>';}).join('')
            +'</div>';
          // Toon onder de upload zone
          var uz=document.getElementById('upload-zone-'+faseId);
          if(uz){var w=document.createElement('div');w.innerHTML=md;uz.parentNode.insertBefore(w,uz.nextSibling);}
        }
      }
    } else {
      DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== tempId; });
      toast('Upload fout: ' + (d.error || 'onbekend'),'err');
    }
  } catch(e) {
    DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== tempId; });
    toast('Verbindingsfout bij uploaden.','err');
  }
  renderApp();
}

// Centrale upload: verwerk bestanden en laat AI alle fases invullen
window.centraalUploadFiles = async function(files) {
  if(!files||!files.length)return;
  var totaal=files.length;
  var verwerkt=0;
  var fouten=0;

  // Status in een aparte vaste div buiten de render-cyclus
  var statusDiv=document.getElementById('centraal-upload-status');
  function toonStatus(html){
    // Zoek element opnieuw na elke renderApp
    var el=document.getElementById('centraal-upload-status');
    if(el)el.innerHTML=html;
  }
  function toonVoortgang(huidig,totaalN,naam){
    var pct=Math.round(huidig/totaalN*100);
    var breedte=Math.max(4,pct);
    toonStatus('<div style="margin-bottom:4px;font-size:12px;color:var(--teal)">&#9881; Bezig: <strong>'+naam+'</strong> ('+huidig+'/'+totaalN+')</div>'
      +'<div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden"><div style="background:var(--teal);height:100%;width:'+breedte+'%;transition:width .3s"></div></div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+pct+'% — dit kan 15-30 seconden per bestand duren</div>');
  }

  for(var i=0;i<files.length;i++){
    var file=files[i];
    toonVoortgang(i+1,totaal,file.name);

    var naam=file.name.toLowerCase();
    var faseId='financieel';
    if(naam.includes('loon')||naam.includes('salaris')||naam.includes('personeel'))faseId='partner';
    else if(naam.includes('klant')||naam.includes('debiteur')||naam.includes('crm')||naam.includes('omzet'))faseId='commercieel';
    else if(naam.includes('contract')||naam.includes('juridisch')||naam.includes('kvk')||naam.includes('akte'))faseId='juridisch';
    else if(naam.includes('it')||naam.includes('software')||naam.includes('ict')||naam.includes('systeem'))faseId='it';
    else if(naam.includes('kwaliteit')||naam.includes('audit')||naam.includes('compliance')||naam.includes('avg'))faseId='compliance';
    else if(naam.includes('strateg')||naam.includes('markt')||naam.includes('plan'))faseId='strategisch';

    var formData=new FormData();
    formData.append('file',file);
    var bewaar=S.traject&&S.traject.bewaar_docs!==false;
    var url=WORKER+'/mna/document/upload?code='+S.code+'&fase_id='+faseId+'&bewaar='+bewaar;

    try{
      // 60 seconden timeout per bestand
      var controller=new AbortController();
      var timeoutId=setTimeout(function(){controller.abort();},45000);
      var resp=await fetch(url,{method:'POST',body:formData,signal:controller.signal});
      clearTimeout(timeoutId);
      var d=await resp.json();
      if(d.ok){
        if(!DOCS[faseId])DOCS[faseId]=[];
        DOCS[faseId].unshift({id:d.doc_id,naam:file.name,type:file.type,grootte:file.size,analyse:d.analyse||'',velden:d.veld_extractie||{},bewaard:!!d.r2_opgeslagen,uploaded_at:Date.now(),uploading:false});
        if(d.veld_extractie&&Object.keys(d.veld_extractie).length&&!d.verworpen){
          S._conflicts=[];
          var alleFases2=['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];
          alleFases2.forEach(function(fid){ autoFillFromExtraction(fid,d.veld_extractie,false,file.name); });
        }
        verwerkt++;
        // Toon verworpen melding direct en ga door
        if(d.verworpen&&d.verworpen_reden){
          var statusEl3=document.getElementById('centraal-upload-status');
          if(statusEl3)statusEl3.innerHTML=(statusEl3.innerHTML||'')+'<div style="background:#fff0f0;border:1px solid var(--red);border-radius:6px;padding:.5rem .75rem;margin-top:.4rem;font-size:12px;color:var(--red)">🚫 <strong>'+esc(file.name)+'</strong> genegeerd: '+esc(d.verworpen_reden)+'</div>';
          // Direct doorgaan naar volgend bestand
          renderApp();
          continue;
        }
        // Toon crosscheck waarschuwingen als die er zijn
        if(d.crosschecks&&d.crosschecks.length){
          var warnHtml='<div style="background:#fff8f0;border:1px solid #e8a84c;border-radius:6px;padding:.75rem;margin-top:.5rem">'
            +'<div style="font-size:11px;font-weight:600;color:#8a5a00;margin-bottom:.4rem">⚠ '+file.name+' — '+d.crosschecks.length+' aandachtspunt(en)</div>';
          d.crosschecks.forEach(function(w){warnHtml+='<div style="font-size:12px;color:#5a4010;padding:2px 0">• '+esc(w)+'</div>';});
          // Entiteit check
          if(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam){
            var naam1=(d.entiteit_naam||'').toLowerCase();
            var naam2=(S.traject.kantoor_naam||'').toLowerCase();
            if(!naam1.includes(naam2.split(' ')[0])&&!naam2.includes(naam1.split(' ')[0])){
              warnHtml+='<div style="font-size:12px;color:#c0392b;padding:2px 0;font-weight:500">⚠ Entiteit in document ("'+esc(d.entiteit_naam)+'") wijkt af van kantoornaam ("'+esc(S.traject.kantoor_naam)+'") — controleer of dit het juiste bestand is.</div>';
            }
          }
          warnHtml+='</div>';
          var statusEl2=document.getElementById('centraal-upload-status');
          if(statusEl2)statusEl2.innerHTML=(statusEl2.innerHTML||'')+warnHtml;
        }
      } else {
        fouten++;
        toonStatus('<span style="color:var(--red)">Fout bij '+file.name+': '+(d.error||'onbekend')+'</span>');
      }
    }catch(e){
      fouten++;
      var msg=e.name==='AbortError'?'Timeout (90s) — probeer een kleiner bestand of upload PDF in plaats van CSV':e.message;
      toonStatus('<span style="color:var(--red)">Fout bij '+file.name+': '+msg+'</span>');
    }
  }

  // Sla eerst alle data op naar server VOORDAT renderApp de DOM overschrijft
  if(Object.keys(S.data).length) saveAll();

  // Render zodat gebruiker velden ziet
  renderApp();
  setTimeout(function(){
    toonStatus('<span style="color:var(--teal)">&#10003; '+verwerkt+' van '+totaal+' bestanden verwerkt'+(fouten?' ('+fouten+' fout)':'')+'. Controleer de velden hieronder.</span>');
  },500);
};

function cleanGetal(v) {
  if (!v || v === 'null') return v;
  var s = String(v).trim();
  // Nederlandse notatie: 2.847.000 → 2847000, of 24.8 → 24.8
  // Patroon: als er meerdere punten zijn, zijn het duizendtalscheiders
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return s.replace(/\./g, '');
  // Komma als decimaalscheider: 24,8 → 24.8
  if (/^\d+,\d+$/.test(s)) return s.replace(',', '.');
  return s;
}

function autoFillFromExtraction(faseId, velden, forceOverwrite, docNaam, entiteitId) {
  // Groepsstructuur (Fase 2): als deze upload aan een entiteit is gekoppeld, alle S.data-lezingen/
  // -schrijvingen hieronder tijdelijk omleiden naar die entiteit se eigen dataopslag — zonder de
  // huidige formulier-context (S._actieveEntiteit) te wijzigen. Aan het eind altijd terugzetten.
  // S._opy/S._epy (jaaromzet/EBITDA-marge per boekjaar) moeten ook per entiteit — anders lopen de
  // boekjaren van verschillende bedrijfsonderdelen door elkaar (dit veroorzaakte de omzet3-bug bij
  // Marilyn en Co: een klein onderdeel schoof de groepscijfers uit het venster).
  var _origData = S.data, _origOpy = S._opy, _origEpy = S._epy;
  if (entiteitId) {
    S.dataPerEntiteit[entiteitId] = S.dataPerEntiteit[entiteitId] || {};
    S.data = S.dataPerEntiteit[entiteitId];
    if (!S._opyPerEntiteit) S._opyPerEntiteit = {};
    if (!S._epyPerEntiteit) S._epyPerEntiteit = {};
    S._opyPerEntiteit[entiteitId] = S._opyPerEntiteit[entiteitId] || {};
    S._epyPerEntiteit[entiteitId] = S._epyPerEntiteit[entiteitId] || {};
    S._opy = S._opyPerEntiteit[entiteitId];
    S._epy = S._epyPerEntiteit[entiteitId];
  }
  try {
    _autoFillFromExtractionBody(faseId, velden, forceOverwrite, docNaam);
  } finally {
    S.data = _origData; S._opy = _origOpy; S._epy = _origEpy;
  }
}
function _autoFillFromExtractionBody(faseId, velden, forceOverwrite, docNaam) {
  var currentDocNaam = docNaam || 'onbekend document';
  var knownFases = ['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];

  // Pre-pass: omzet_per_jaar_YYYY losse velden samenvoegen tot _opy object
  if (!S._opy) S._opy = {};
  Object.keys(velden).forEach(function(k) {
    var m = k.match(/^omzet_per_jaar_(\d{4})$/);
    if (m) {
      var jaar = m[1];
      var val = cleanGetal(velden[k]);
      if (val && val !== 'null') S._opy[jaar] = val;
    }
  });

  // Directe keys (fase_id_veld_id formaat van CSV upload) direct in S.data zetten
  Object.keys(velden).forEach(function(k){
    if(k.includes('_')&&!['omzet_per_jaar','ebitda_pct','omzet_jaarwerk_pct','omzet_advies_pct','omzet_loon_pct','omzet_fiscaal_pct','omzet_overig_pct','kosten_personeel_pct','kosten_huisvesting_pct','kosten_it_pct','kosten_marketing_pct'].includes(k)){
      var parts=k.split('_');
      // Check of het een fase_veld key is (bijv. financieel_omzet1)
      if(knownFases.includes(parts[0])){
        var val=cleanGetal(velden[k]);
        if(val&&val!=='null'&&String(val).trim()!==''){
          if(forceOverwrite||!(S.data[k]||'').trim())S.data[k]=String(val);
        }
      }
    }
  });

  function setIfEmpty(key, val) {
    if(val&&val!=='null'&&val!==null&&String(val).trim()!==''&&!(S.data[key]||'').trim())
      S.data[key]=String(val);
  }
  function applyOrConflict(key, val, label) {
    if(!val||val==='null'||val===null||String(val).trim()==='')return;
    var newVal=String(val);
    var existing=(S.data[key]||'').trim();
    if(!existing){S.data[key]=newVal;if(!S._docSource)S._docSource={};S._docSource[key]=currentDocNaam;return;}
    if(existing===newVal)return;
    if(forceOverwrite){S.data[key]=newVal;if(!S._docSource)S._docSource={};S._docSource[key]=currentDocNaam;return;}
    // Zelfde document dat dit veld eerder al zette (bijv. herverwerking) — gewoon bijwerken, geen conflict.
    if(S._docSource&&S._docSource[key]===currentDocNaam){S.data[key]=newVal;return;}
    // Andere waarde dan wat er al stond — altijd laten kiezen, ook als het huidige veld zelf
    // automatisch is ingevuld door een ander document. Stilzwijgend overschrijven leidde ertoe dat
    // een later document (bijv. van een ander bedrijfsonderdeel) correcte cijfers ongemerkt verving.
    if(!S._conflicts)S._conflicts=[];
    S._conflicts.push({key:key,label:label,huidig:existing,nieuw:newVal,bron:currentDocNaam});
    if(!S._pendingConflicts)S._pendingConflicts={};
    S._pendingConflicts[key]=newVal;
  }
  if(faseId==='financieel'){
    if(!S._opy)S._opy={};
    var opy=velden.omzet_per_jaar;
    if(opy&&typeof opy==='object'){
      Object.keys(opy).forEach(function(jaar){
        var v=opy[jaar],j=Number(jaar);
        if(v&&v!=='null'&&v!==null&&!isNaN(j)&&j>1990&&j<2100)S._opy[String(j)]=v;
      });
    }
    if(velden.omzet&&velden.omzet!=='null'&&velden.boekjaar&&!isNaN(Number(velden.boekjaar))){velden.omzet=cleanGetal(velden.omzet);
      var bj=String(Number(velden.boekjaar));
      if(!S._opy[bj])S._opy[bj]=velden.omzet;
    }
    var yrs=Object.keys(S._opy).map(Number).filter(function(j){return!isNaN(j)&&j>1990&&j<2100;}).sort(function(a,b){return a-b;});
    if(yrs.length){
      // Meest recente 3 jaar op omzet1/2/3, maar via applyOrConflict — nooit stilzwijgend
      // een al ingevuld jaar met een andere waarde overschrijven (zie toelichting hierboven).
      var toFill=yrs.slice(-3);
      var allFlds=['omzet1','omzet2','omzet3'];
      var usedFlds=allFlds.slice(3-toFill.length);
      var fldLabel=['Jaaromzet jaar 1 (oudste)','Jaaromzet jaar 2','Jaaromzet jaar 3 (meest recent)'];
      var labelOffset=3-toFill.length;
      toFill.forEach(function(yr,i){var w=S._opy[String(yr)];if(w)applyOrConflict('financieel_'+usedFlds[i],String(w),fldLabel[labelOffset+i]+' ('+yr+')');});
    }
    if(!S._epy)S._epy={};
    var ev=velden.ebitda_pct;
    if(ev&&ev!=='null'&&ev!==null){
      var ej=velden.boekjaar?String(Number(velden.boekjaar)):'0';
      if(!S._epy[ej])S._epy[ej]=ev;
      var eys=Object.keys(S._epy).map(Number).filter(function(j){return!isNaN(j);}).sort(function(a,b){return b-a;});
      if(eys.length)applyOrConflict('financieel_ebitdaMarge',S._epy[String(eys[0])],'EBITDA-marge (%)');
    }
    if(velden.ohw&&velden.ohw!=='null')applyOrConflict('financieel_wip',cleanGetal(velden.ohw),'Onderhanden werk');
    if(velden.debiteuren&&velden.debiteuren!=='null')applyOrConflict('financieel_debiteuren',cleanGetal(velden.debiteuren),'Debiteuren');
    setIfEmpty('financieel_ebitdaNorm',cleanGetal(velden.resultaat));
    setIfEmpty('financieel_ebitda',cleanGetal(velden.ebitda_abs));
    setIfEmpty('financieel_omzetJaarwerk',velden.omzet_jaarwerk_pct);
    setIfEmpty('financieel_omzetAdvies',velden.omzet_advies_pct);
    setIfEmpty('financieel_omzetLoon',velden.omzet_loon_pct);
    setIfEmpty('financieel_omzetFiscaal',velden.omzet_fiscaal_pct);
    setIfEmpty('financieel_omzetOverig',velden.omzet_overig_pct);
    setIfEmpty('financieel_omzetYTD',cleanGetal(velden.omzet_ytd||velden.ytd_omzet||velden.omzet_huidig_jaar));
    setIfEmpty('financieel_debiteurenOud',velden.debiteuren_oud||velden.debiteuren_90_dagen||velden.old_debiteuren_pct);
    setIfEmpty('financieel_declarab',velden.declarabiliteit||velden.declarab_pct);
    setIfEmpty('financieel_partnerBel',velden.partnerbeloning||velden.partner_beloning||velden.beloning_partners);
    setIfEmpty('financieel_kostenPersoneel',velden.kosten_personeel_pct);
    setIfEmpty('financieel_kostenHuisvesting',velden.kosten_huisvesting_pct);
    setIfEmpty('financieel_kostenIT',velden.kosten_it_pct);
    setIfEmpty('financieel_kostenMarketing',velden.kosten_marketing_pct);
    setIfEmpty('financieel_kostenOverig',velden.kosten_overig_pct);
  }
  if(true){
    setIfEmpty('partner_fte',velden.fte||velden.personeel_fte);
    setIfEmpty('partner_aantalP',velden.aantal_partners||velden.partners);
    setIfEmpty('partner_gemLeeftijd',velden.gem_leeftijd_partners||velden.leeftijd_partners);
    setIfEmpty('partner_omzetPerP',velden.omzet_per_partner);
    setIfEmpty('partner_pensioenP',velden.pensioen_partners||velden.partners_pensioen);
    setIfEmpty('partner_verloop',velden.personeelsverloop||velden.verloop_pct);
    setIfEmpty('partner_vacatures',velden.vacatures||velden.openstaande_vacatures);
    setIfEmpty('partner_raAa',velden.ra_aa_opleiding||velden.accountants_opleiding);
    setIfEmpty('partner_opvolging',velden.opvolgingskandidaat||velden.opvolging);
    setIfEmpty('partner_verandering',velden.veranderbereidheid||velden.bereidheid_verandering);
    setIfEmpty('partner_pContract',velden.partnerovereenkomsten||velden.partner_contract);
    setIfEmpty('partner_eigendomsStructuur',velden.eigendomsstructuur||velden.aandeelhoudersstructuur);
  }
  if(true){
    setIfEmpty('commercieel_aantalKlanten',velden.aantal_klanten||velden.actieve_klanten);
    setIfEmpty('commercieel_churn',velden.churn||velden.klantverloop||velden.churn_pct);
    setIfEmpty('commercieel_klantduur',velden.klantduur||velden.gem_klantduur||velden.gemiddelde_klantduur);
    setIfEmpty('commercieel_top1pct',velden.grootste_klant_pct||velden.top1_pct||velden.top_klant_pct);
    setIfEmpty('commercieel_top10pct',velden.top10_pct||velden.top10_klanten_pct);
    setIfEmpty('commercieel_recurring',velden.recurring||velden.recurring_pct||velden.abonnements_omzet);
    setIfEmpty('commercieel_crossSell',velden.cross_sell||velden.crosssell_pct);
    setIfEmpty('commercieel_nieuw',velden.nieuwe_klanten||velden.klanten_nieuw);
    setIfEmpty('commercieel_verlies',velden.verloren_klanten||velden.klanten_verlies);
  }
  if(true){
    setIfEmpty('compliance_nba',velden.nba_status||velden.nba||velden.nba_inschrijving);
    setIfEmpty('compliance_afm',velden.afm_vergunning||velden.afm||velden.vergunning);
    setIfEmpty('compliance_toetsDatum',velden.kwaliteitstoetsing_jaar||velden.toetsing_datum||velden.laatste_toetsing);
    setIfEmpty('compliance_toetsOordeel',velden.kwaliteitstoetsing_oordeel||velden.toetsing_oordeel||velden.oordeel_toetsing);
    setIfEmpty('compliance_tuchtzaken',velden.tuchtzaken||velden.lopende_tuchtzaken);
    setIfEmpty('compliance_claims',velden.claims||velden.civiele_claims);
    setIfEmpty('compliance_wwft',velden.wwft||velden.wwft_procedures||velden.wwft_status);
    setIfEmpty('compliance_incidenten',velden.integriteitsincidenten||velden.incidenten);
  }
  if(true){
    setIfEmpty('it_software',velden.software_primair||velden.primaire_software||velden.software);
    setIfEmpty('it_softwareOverig',velden.overige_systemen||velden.software_overig||velden.systemen);
    setIfEmpty('it_autoGraad',velden.automatiseringsgraad||velden.automgraad||velden.automatisering_pct);
    setIfEmpty('it_ai',velden.ai_tooling||velden.ai_gebruik||velden.ai_tools);
    setIfEmpty('it_itKosten',velden.it_kosten||velden.it_kosten_pct||velden.kosten_it_pct);
    setIfEmpty('it_security',velden.cybersecurity||velden.security_status||velden.beveiliging);
    setIfEmpty('it_itRisico',velden.it_risicos||velden.bekende_risicos||velden.it_risico);
  }
  if(true){
    setIfEmpty('juridisch_rechtsvorm',velden.rechtsvorm||velden.rechtsvorm_en);
    setIfEmpty('juridisch_structuur',velden.aandeelhoudersstructuur||velden.structuur||velden.eigendomsstructuur);
    setIfEmpty('juridisch_huur',velden.huurcontract||velden.huur_looptijd||velden.huurcontract_looptijd);
    setIfEmpty('juridisch_vpb',velden.vpb_discussies||velden.vpb||velden.belastingdienst_discussies);
    setIfEmpty('juridisch_fiscaalRisico',velden.fiscale_risicos||velden.fiscaal_risico);
    setIfEmpty('juridisch_stak',velden.stak||velden.bijzondere_structuur);
    setIfEmpty('juridisch_overigeClaims',velden.claims||velden.garanties||velden.overige_claims);
    setIfEmpty('juridisch_lopendeClaims',velden.claims||velden.lopende_claims||velden.geschillen);
    setIfEmpty('juridisch_lease',velden.leaseverplichtingen||velden.lease||velden.lease_per_jaar);
  }
  if(true){
    setIfEmpty('strategisch_marktpos',velden.marktpositie||velden.marktpos||velden.regio);
    setIfEmpty('strategisch_niche',velden.niche||velden.specialisme||velden.niche_specialisme);
    setIfEmpty('strategisch_concurrenten',velden.concurrenten||velden.belangrijkste_concurrenten);
    setIfEmpty('strategisch_aiImpact',velden.ai_impact||velden.impact_ai||velden.ai_dienstenmix);
    setIfEmpty('strategisch_cultuurFit',velden.cultuur||velden.cultuuromschrijving||velden.cultuurfit);
    var vervolgstapVal = velden.vervolgstap||velden.gewenste_stap||velden.synergie;
    if(vervolgstapVal && typeof vervolgstapVal === 'string') {
      var blocked = ['aanleveren','csv','platte tekst','instructie','invullen','upload','bestand'];
      var isBlocked = blocked.some(function(b){ return vervolgstapVal.toLowerCase().indexOf(b) !== -1; });
      if(!isBlocked) setIfEmpty('strategisch_synergie', vervolgstapVal);
    }
    setIfEmpty('strategisch_tijdlijn',velden.tijdlijn||velden.gewenste_tijdlijn||velden.closing_datum);
  }
  // Sectorspecifieke extractievelden (MKB/Zorg/IT — zie SECTOR_EXTRACTIE_EXTRA in de worker).
  // Altijd proberen te mappen: bij een andere sector bestaat het doelveld simpelweg niet in het
  // profiel en heeft setIfEmpty geen effect; onschadelijk om dit sectoronafhankelijk te draaien.
  if(true){
    // MKB
    setIfEmpty('financieel_brutomarge',velden.brutomarge_pct);
    setIfEmpty('financieel_dgaSalaris',cleanGetal(velden.dga_salaris));
    setIfEmpty('financieel_voorraad',cleanGetal(velden.voorraadwaarde));
    setIfEmpty('commercieel_top10Leveranciers',velden.top10_leveranciers_pct);
    setIfEmpty('commercieel_locaties',velden.aantal_locaties);
    setIfEmpty('it_ecommerce',velden.ecommerce_platform);
    // Zorg
    setIfEmpty('financieel_zorgverzekeraars',velden.omzet_per_financieringsstroom);
    setIfEmpty('financieel_bezettingsgraad',velden.bezettingsgraad_pct);
    setIfEmpty('commercieel_aantalPatient',velden.aantal_patienten);
    setIfEmpty('commercieel_wachttijd',velden.wachttijd_nieuwe_patienten);
    setIfEmpty('commercieel_specialisaties',velden.specialisaties);
    setIfEmpty('partner_bigRegistraties',velden.big_registraties_status||(velden.big_registraties_aantal?velden.big_registraties_aantal+' geregistreerd':null));
    setIfEmpty('partner_zzpAandeel',velden.zzp_aandeel_pct);
    setIfEmpty('partner_ziekteverzuim',velden.ziekteverzuim_pct);
    setIfEmpty('compliance_igj',velden.igj_inspectie);
    setIfEmpty('compliance_nza',velden.nza_registratie);
    setIfEmpty('it_epd',velden.epd_systeem);
    setIfEmpty('it_gegevensmigratie',velden.epd_overdraagbaarheid);
    setIfEmpty('juridisch_goodwill',velden.goodwill_afspraken);
    setIfEmpty('juridisch_zorgcontracten',velden.zorgverzekeraar_contracten);
    // IT & Software
    setIfEmpty('financieel_arr',cleanGetal(velden.arr));
    setIfEmpty('financieel_churnMrr',velden.mrr_churn_pct);
    setIfEmpty('commercieel_productMaturity',velden.product_status);
    setIfEmpty('commercieel_techDebt',velden.technische_schuld);
    setIfEmpty('partner_devFte',velden.dev_fte);
    setIfEmpty('partner_ipOwnership',velden.ip_eigendom);
    setIfEmpty('compliance_avg',velden.avg_compliance);
    setIfEmpty('compliance_pentest',velden.laatste_pentest_jaar);
    setIfEmpty('compliance_incidenten',velden.security_incidenten);
    setIfEmpty('compliance_licenties',velden.open_source_licenties);
    setIfEmpty('it_techStack',velden.tech_stack);
    setIfEmpty('it_hosting',velden.hosting_provider);
    setIfEmpty('it_schaalbaarheid',velden.schaalbaarheid_architectuur);
    setIfEmpty('juridisch_ipRegistraties',velden.ip_registraties);
    setIfEmpty('juridisch_klantcontracten',velden.klantcontracten_looptijd);
    setIfEmpty('strategisch_groei',velden.groeimotor);
  }
}

async function consolideerAnalyse(faseId){
  var docs=getDocsForFase(faseId);if(!docs.length)return;
  var f=FASES.find(function(x){return x.id===faseId;});if(!f)return;
  var gc={};
  docs.forEach(function(d){
    if(!d.velden)return;
    Object.keys(d.velden).forEach(function(k){var v=d.velden[k];if(v&&v!=='null'&&v!==null&&!gc[k])gc[k]=v;});
    if(d.velden.omzet_per_jaar&&typeof d.velden.omzet_per_jaar==='object'){
      if(!gc.omzet_per_jaar)gc.omzet_per_jaar={};
      Object.keys(d.velden.omzet_per_jaar).forEach(function(jr){var v=d.velden.omzet_per_jaar[jr];if(v&&v!=='null'&&!gc.omzet_per_jaar[jr])gc.omzet_per_jaar[jr]=v;});
    }
  });
  autoFillFromExtraction(faseId,gc);
  S.aiLoading[faseId]=true;renderApp();
  var lines=[];f.dataFields.forEach(function(df){var v=S.data[f.id+'_'+df.id];if(v&&!df.header)lines.push(df.label+': '+v);});
  var analyses=docs.map(function(d,i){return 'Doc '+(i+1)+': '+d.naam+'\n'+(d.analyse||'');}).join('\n---\n');
  var prompt='Geconsolideerde M&A analyse voor fase '+f.title+' van '+esc(S.traject&&S.traject.kantoor_naam||S.code)+'.\n\nVelden:\n'+(lines.join('\n')||'leeg')+'\n\nAnalyses:\n'+analyses+'\n\nTrends, rode vlaggen, aanbevelingen. Concreet. ## koppen.';
  try{
    var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    var reader=resp.body.getReader(),dec=new TextDecoder(),col='';
    while(true){var res=await reader.read();if(res.done)break;
      dec.decode(res.value,{stream:true}).split('\n').forEach(function(line){
        if(line.startsWith('data:')){var d=line.slice(5).trim();if(d==='[DONE]')return;
          try{var j=JSON.parse(d);if(j.type==='content_block_delta'&&j.delta&&j.delta.text)col+=j.delta.text;}catch(e){}
        }
      });
    }
    S.aiTexts[faseId]=col;
  }catch(e){S.aiTexts[faseId]='__ERROR__';}
  S.aiLoading[faseId]=false;renderApp();
}

async function deleteDocument(docId, faseId) {
  Object.keys(DOCS).forEach(function(fid){
    DOCS[fid]=DOCS[fid].filter(function(d){return d.id!==docId;});
  });
  renderApp();
  fetch(WORKER+'/mna/document/delete/'+docId,{method:'POST'}).catch(function(){});
}

function renderDocumentSectie(faseId) {
  if(isKoper()) return '';
  var docs = getDocsForFase(faseId);
  var isReadOnly = (S.traject && S.traject.status === 'vergrendeld');

  // Compacte upload knop
  var uploadHtml = '';
  if (!isReadOnly) {
    var entiteitKiezer = '';
    if (S._entiteiten && S._entiteiten.length) {
      entiteitKiezer = '<select id="entiteit-select-'+faseId+'" style="font-size:11px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px">'
        + '<option value="">Groep/hoofdentiteit</option>'
        + S._entiteiten.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.naam)+'</option>';}).join('')
        + '</select>';
    }
    uploadHtml = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;flex-wrap:wrap">'
      + '<label style="display:flex;align-items:center;gap:6px;background:var(--teal);color:#fff;font-family:IBM Plex Sans,sans-serif;font-size:12px;font-weight:600;padding:6px 14px;border-radius:var(--r);cursor:pointer">'
      + '&#128196; Document toevoegen'
      + '<input type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.eml" style="display:none" onchange="for(var i=0;i<this.files.length;i++)uploadDocument(\''+faseId+'\',this.files[i]);this.value=\'\';">'
      + '</label>'
      + entiteitKiezer
      + '<div id="upload-status-'+faseId+'" style="font-size:11px;color:var(--muted)"></div>'
      + '</div>';
  }

  // Documenten lijst — compact
  var docsHtml = '';
  if (docs.length) {
    docsHtml = '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:.75rem">';
    docsHtml += docs.map(function(doc) {
      var icon = doc.type && doc.type.includes('pdf') ? '📄' : (doc.naam && (doc.naam.endsWith('.xlsx')||doc.naam.endsWith('.xls')||doc.naam.endsWith('.csv'))) ? '📊' : '📃';
      if (doc.uploading) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--card);border-radius:var(--r);border:1px solid var(--border)">'
          + '<div class="spin" style="border-color:var(--border2);border-top-color:var(--teal);width:11px;height:11px;flex-shrink:0"></div>'
          + '<span style="font-size:11px;color:var(--muted)">'+esc(doc.naam)+'</span>'
          + '</div>';
      }
      if (doc.verworpen) {
        return '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--red-bg);border-radius:var(--r);border:1px solid var(--red)">'
          + '<span style="font-size:11px">🚫</span>'
          + '<span style="font-size:11px;color:var(--red);flex:1">'+esc(doc.naam)+'</span>'
          + '<span style="font-size:10px;color:var(--red);font-style:italic">'+esc(doc.verworpen_reden||'verworpen')+'</span>'
          + '</div>';
      }
      return '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--card);border-radius:var(--r);border:1px solid var(--border)">'
        + '<span style="font-size:13px">'+icon+'</span>'
        + '<span style="font-size:11px;color:var(--teal);flex:1">'+(doc.bewaard?'<a href="'+WORKER+'/mna/document/download/'+doc.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" style="color:var(--teal);text-decoration:none">'+esc(doc.naam)+'</a>':esc(doc.naam))+'</span>'
        + '<span style="font-size:10px;color:var(--muted)">'+(doc.grootte/1024/1024).toFixed(1)+'MB</span>'
        + (!isReadOnly?'<button onclick="deleteDocument(\''+doc.id+'\',\''+faseId+'\')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:10px;padding:0 2px">✕</button>':'')
        + '</div>';
    }).join('');
    docsHtml += '</div>';
  }

  return '<div style="margin-bottom:1rem">'+uploadHtml+docsHtml+'</div>';
}

function handleFileUpload(event, faseId) {
  var files = event.target.files;
  for (var i = 0; i < files.length; i++) {
    uploadDocument(faseId, files[i]);
  }
  event.target.value = '';
}

function handleDropUpload(event, faseId) {
  var files = event.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    uploadDocument(faseId, files[i]);
  }
}


// Zet de doc-tekst/handtekenstatus-velden (NDA/LoI/BEM) over van het traject-object naar de losse
// S.xxxTekst/S.xxxGetekend state die renderCover() leest. Gedeeld door de loginflow en refreshData()
// — stond eerder alleen in de loginflow, waardoor de ververs-knop deze velden liet verdwijnen/verouderen.
function syncDocVeldenVanTraject(d){
  if(!d||!d.traject)return;
  var t=d.traject;
  if(t.loi_tekst)S.loiTekst=t.loi_tekst;
  if(t.loi_datum)S.loiDatum=t.loi_datum;
  if(t.loi_doc_id)S.loiDocId=t.loi_doc_id;
  if(t.nda_tekst)S.ndaTekst=t.nda_tekst;
  if(t.nda_datum)S.ndaDatum=t.nda_datum;
  if(t.nda_doc_id)S.ndaDocId=t.nda_doc_id;
  if(t.nda_getekend)S.ndaGetekend=t.nda_getekend;
  if(t.loi_getekend)S.loiGetekend=t.loi_getekend;
  if(t.bem_doc_id)S.bemDocId=t.bem_doc_id;
  if(t.bem_tekst&&!t.bem_doc_id)S.bemTekst=t.bem_tekst;
  if(t.verkoper_klaar)S.dossierVrijgegeven=true;
}

async function refreshData(){
  var oldScreen = S.screen;
  try {
    var r = await fetch(WORKER+'/mna/traject/'+S.code, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ts:Date.now()})});
    var d = await r.json();
    if(r.ok && !d.error) {
      S.traject = d.traject;
      S.data = {};
      S.checked = {};
      if(d.data && d.data.length) loadDataFromDB(d.data);
      S.rol = d.rol;
      S.modules = d.modules || S.modules || null;
      syncDocVeldenVanTraject(d);
      S.screen = oldScreen;
      renderApp();
      toast('Verversen gelukt','ok',2000);
    } else {
      toast(d.error||'Verversen mislukt','err',2000);
    }
  } catch(e) { toast('Verbindingsfout','err',2000); }
}

function uitloggen(){
  clearTimeout(S.saveTimer);
  if(S.code&&S.screen==='main')saveAll();
  secAuditLog('logout');
  secReset();
  Object.keys(DOCS).forEach(function(k){delete DOCS[k];});
  S={screen:'login',code:'',rol:'',traject:null,modules:null,fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,_opy:{},_epy:{},_conflicts:[],_pendingConflicts:{}};
  renderApp();
}

function toonConflictDialog() {
  if(!S._conflicts||!S._conflicts.length)return;
  var conflicts=S._conflicts.slice();S._conflicts=[];
  if(!S._choiceLog)S._choiceLog=[];
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var box=document.createElement('div');
  box.style.cssText='background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:560px;width:100%;max-height:85vh;overflow-y:auto';
  var title=document.createElement('div');title.style.cssText='font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.35rem';title.textContent='Afwijkende waarden gevonden';box.appendChild(title);
  // Toon brondocumenten
  var bronnen=[...new Set(conflicts.map(function(c){return c.bron||'onbekend';}))];
  var sub=document.createElement('div');sub.style.cssText='font-size:12px;color:var(--mid);margin-bottom:1.25rem;padding:.6rem .75rem;background:var(--card);border-radius:var(--r);border-left:3px solid var(--gold)';
  sub.innerHTML='<strong>Bron:</strong> '+bronnen.map(function(b){return '<span style="font-family:IBM Plex Mono,monospace;font-size:11px">'+esc(b)+'</span>';}).join(', ')+'<br><span style="color:var(--muted)">Kies per veld welke waarde u wilt gebruiken. Uw keuze wordt vastgelegd.</span>';
  box.appendChild(sub);
  var list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:8px;margin-bottom:1.25rem';
  var radios=[];
  conflicts.forEach(function(c,i){
    var row=document.createElement('div');row.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px';
    var lbl=document.createElement('div');lbl.style.cssText='font-size:11px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:4px';lbl.textContent=c.label;row.appendChild(lbl);
    // Toon brondocument per veld
    if(c.bron){var bronLbl=document.createElement('div');bronLbl.style.cssText='font-size:10px;color:var(--gold);margin-bottom:6px';bronLbl.innerHTML='&#128196; Uit: <em>'+esc(c.bron)+'</em>';row.appendChild(bronLbl);}
    var opts=document.createElement('div');opts.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    var lblH=document.createElement('label');lblH.style.cssText='flex:1;min-width:140px;display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;padding:7px 10px;border:1px solid var(--border2);border-radius:var(--r);background:var(--panel)';
    var rH=document.createElement('input');rH.type='radio';rH.name='cf_'+i;rH.value='huidig';rH.checked=true;rH.style.accentColor='var(--teal)';lblH.appendChild(rH);
    var tH=document.createElement('span');tH.style.color='var(--mid)';
    var bronHuidig=S._docSource&&S._docSource[c.key]?'uit '+S._docSource[c.key]:'handmatig ingevoerd';
    tH.innerHTML='Huidig: <strong style="color:var(--sub)">'+c.huidig+'</strong><div style="font-size:10px;color:var(--muted);margin-top:2px">'+esc(bronHuidig)+'</div>';lblH.appendChild(tH);opts.appendChild(lblH);
    var lblN=document.createElement('label');lblN.style.cssText='flex:1;min-width:140px;display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;padding:7px 10px;border:1px solid var(--teal-dark);border-radius:var(--r);background:var(--teal-bg)';
    var rN=document.createElement('input');rN.type='radio';rN.name='cf_'+i;rN.value='nieuw';rN.style.accentColor='var(--teal)';lblN.appendChild(rN);
    var tN=document.createElement('span');tN.style.color='var(--mid)';tN.innerHTML='Document: <strong style="color:var(--teal-dim)">'+c.nieuw+'</strong><div style="font-size:10px;color:var(--muted);margin-top:2px">uit '+esc(c.bron||'document')+'</div>';lblN.appendChild(tN);opts.appendChild(lblN);
    row.appendChild(opts);list.appendChild(row);radios.push({key:c.key,rH:rH,rN:rN,conflict:c});
  });
  box.appendChild(list);
  var btns=document.createElement('div');btns.style.cssText='display:flex;gap:10px;justify-content:flex-end';
  var btnB=document.createElement('button');btnB.className='btn-ghost';btnB.style.fontSize='12px';btnB.textContent='Alles behouden';
  btnB.addEventListener('click',function(){
    conflicts.forEach(function(c){
      if(S._pendingConflicts)delete S._pendingConflicts[c.key];
      S._choiceLog.push({key:c.key,label:c.label,gekozen:'huidig',waarde:c.huidig,bron:'handmatig ingevoerd',ts:new Date().toLocaleString('nl-NL')});
    });
    document.body.removeChild(ov);renderApp();
  });btns.appendChild(btnB);
  var btnA=document.createElement('button');btnA.className='btn';btnA.style.fontSize='12px';btnA.textContent='Toepassen';
  btnA.addEventListener('click',function(){
    radios.forEach(function(r){
      var c=r.conflict;
      var gekozenHuidig=r.rH.checked;
      if(!gekozenHuidig)S.data[r.key]=c.nieuw;
      if(S._pendingConflicts)delete S._pendingConflicts[r.key];
      // Leg keuze vast in log
      S._choiceLog.push({
        key:c.key,label:c.label,
        gekozen:gekozenHuidig?'huidig':'document',
        waarde:gekozenHuidig?c.huidig:c.nieuw,
        verworpen:gekozenHuidig?c.nieuw:c.huidig,
        bron:c.bron||'onbekend',
        ts:new Date().toLocaleString('nl-NL')
      });
    });
    document.body.removeChild(ov);renderApp();schedSave();
  });btns.appendChild(btnA);box.appendChild(btns);ov.appendChild(box);document.body.appendChild(ov);
}


async function loadDataroom(){
  if(!S.code||isKoper())return;
  S.dataroomLoading=true;renderApp();
  try{
    var resp=await fetch(WORKER+'/mna/document/lijst/'+S.code);
    var docs=await resp.json();
    S.dataroom=docs.map(function(d){return{id:d.id,naam:d.bestand_naam,type:d.bestand_type,grootte:d.bestand_grootte,fase_id:d.fase_id,bewaard:!!d.bewaard,uploaded_at:d.uploaded_at,entiteit_id:d.entiteit_id||''};});
  }catch(e){S.dataroom=[];}
  S.dataroomLoading=false;renderApp();
}

function renderDataroom(){
  var fL={financieel:'I. Financieel',commercieel:'II. Klanten & commercieel',partner:'III. Partners & personeel',compliance:'IV. Compliance & kwaliteit',it:'V. IT & automatisering',juridisch:'VI. Juridisch & fiscaal',strategisch:'VII. Strategisch & markt'};
  if(S.dataroomLoading)return '<div class="wrap anim"><div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; Dataroom</div></div><div style="color:var(--muted);font-size:13px;padding:2rem 0">Laden...</div></div>';
  var docs=S.dataroom||[];
  var byFase={};docs.forEach(function(d){if(!byFase[d.fase_id])byFase[d.fase_id]=[];byFase[d.fase_id].push(d);});
  var totaal=docs.filter(function(d){return d.bewaard;}).length;
  var html='<div class="wrap anim"><div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; Dataroom'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="window.print()">PDF</button>'
    +'<button class="btn-ghost btn-sm" onclick="S.screen=(isTussen()?\'begeleider\':\'main\');renderApp()">&#8592; Terug</button></div></div>'
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">Dataroom</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem">'+esc(S.traject&&S.traject.kantoor_naam||S.code)+' &middot; '+totaal+' document'+(totaal!==1?'en':'')+' opgeslagen</div>';
  if(!docs.length){html+='<div class="panel" style="text-align:center;padding:2rem;color:var(--muted);font-size:13px;font-style:italic">Geen documenten opgeslagen.</div>';}
  else{
    Object.keys(fL).forEach(function(faseId){
      var fd=(byFase[faseId]||[]).filter(function(d){return d.bewaard;});
      if(!fd.length)return;
      html+='<div class="panel" style="margin-bottom:1rem"><div class="sec-hdr">'+fL[faseId]+'</div>';
      fd.forEach(function(doc){
        var icon=doc.type&&doc.type.includes('pdf')?'&#128209;':doc.naam&&(doc.naam.endsWith('.xlsx')||doc.naam.endsWith('.xls'))?'&#128202;':'&#128196;';
        var st=doc.uploaded_at?new Date(doc.uploaded_at).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
        var gr=(doc.grootte/1024/1024).toFixed(1)+'MB';
        var entNaam=entiteitNaam(doc.entiteit_id);
        html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
          +'<span style="font-size:18px">'+icon+'</span>'
          +'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--head)">'+esc(doc.naam)+(entNaam?' <span style="font-size:10px;font-weight:600;color:var(--teal);background:var(--teal-bg);border-radius:8px;padding:2px 8px;margin-left:4px">'+esc(entNaam)+'</span>':'')+'</div>'
          +'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+gr+(st?' &middot; Geupload: '+st:'')+'</div></div>'
          +'<a href="'+WORKER+'/mna/document/download/'+doc.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost btn-sm" style="font-size:11px;text-decoration:none" onclick="secAuditLog(\'document_bekeken\',{doc_naam:\''+doc.naam.replace(/'/g,'')+'\'})">&#8681; '+(isKoper()?'Bekijken':'Download')+'</a>'
          +'</div>';
      });
      html+='</div>';
    });
  }
  html+='</div>';return html;
}
