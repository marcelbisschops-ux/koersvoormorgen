var S={screen:'login',code:'',rol:'',traject:null,fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,_opy:{},_epy:{},_opySlotJaar:{},_conflicts:[],_userEdited:{},_docSource:{},_docFragment:{},faseStatus:{},dossierVrijgegeven:false,_entiteiten:[],dataPerEntiteit:{},_actieveEntiteit:null};
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
  if(!S.code)return;
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

// AI vult per document al een entiteit_naam-veld (herkende bedrijfsnaam), maar dat werd alleen
// gebruikt voor een afwijkingswaarschuwing tegen de kantoornaam — nooit om de koppel-dropdown voor
// te selecteren. Eerst een exacte match op genormaliseerde naam (dekt "BV"/"B.V."/"bv"), pas als
// dat niets oplevert een bevat-check. Bewust GEEN losse-voorvoegsel-matching (zoals de worker voor
// de afwijs-validatie gebruikt) — bij namen die een lang gedeeld voorvoegsel delen (hier: "[dossier]
// ...") maakte dat elke zustervennootschap onterecht gelijk.
// alleenZeker=true: alleen de exacte-naam-match (nooit de "bevat"-heuristiek) — gebruikt op de plek
// waar het resultaat AUTOMATISCH wordt toegepast (geen mens die nog akkoord geeft). GOUDEN STANDAARD
// (Marcel, 24 juli 2026): het systeem mag nooit gokken — een niet-exacte match is een suggestie voor
// de mens (koppel-dropdown), nooit een automatische classificatie.
function gokEntiteitId(entiteitNaamAI, alleenZeker){
  if(!entiteitNaamAI||!S._entiteiten||!S._entiteiten.length)return '';
  function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  var doel=norm(entiteitNaamAI);
  if(!doel)return '';
  var exact=S._entiteiten.filter(function(e){return norm(e.naam)===doel;});
  if(exact.length===1)return exact[0].id;
  if(alleenZeker)return '';
  var bevat=S._entiteiten.filter(function(e){var n=norm(e.naam);return n&&(doel.indexOf(n)!==-1||n.indexOf(doel)!==-1);});
  return bevat.length===1?bevat[0].id:'';
}

// Groepsstructuur: sommige velden zijn een eigenschap van de mensen/groep, niet van één
// werkmaatschappij (bv. aantal partners, gemiddelde leeftijd — vaak dezelfde partners via
// persoonlijke holdings in meerdere BV's). Zulke velden (df.groepsniveau in het sectorschema)
// horen altijd bij S._groepData, ook als er een entiteit actief is — nooit dubbel/anders per BV.
function isGroepsniveauVeld(key){
  var faseIds=['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];
  for(var i=0;i<faseIds.length;i++){
    var prefix=faseIds[i]+'_';
    if(key.indexOf(prefix)===0){
      var f=(typeof FASES!=='undefined'?FASES:[]).find(function(x){return x.id===faseIds[i];});
      if(!f)return false;
      var veldId=key.slice(prefix.length);
      var df=f.dataFields.find(function(d){return d.id===veldId;});
      return !!(df&&df.groepsniveau);
    }
  }
  return false;
}
// Retourneert het juiste opslagobject voor een veld-key — S._groepData voor groepsniveau-velden,
// anders de actief geswapte S.data (kan groep of een specifieke entiteit zijn).
function doelData(key){ return isGroepsniveauVeld(key)?S._groepData:S.data; }

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

// Toegankelijkheid (audit-fix P2, 25 juli 2026): modals waren alleen met de muis te sluiten, geen
// Escape-ondersteuning. Alle ~15 modal-overlays in dit product delen hetzelfde patroon
// (position:fixed;inset:0 als eerste twee style-declaraties van de overlay-<div>) — geen gedeelde
// modal-helper, dus hier generiek afgevangen i.p.v. alle aanroepplekken los aan te passen. Sluit
// alleen de bovenste (laatst geopende) overlay; doet niets als er geen modal open is. Bewust
// uitgezonderd: de conflictdialoog (toonConflictDialog, z-index:1000) — die vereist een expliciete
// keuze (huidig/document/geen van beide) en heeft eigen wachtrij-state (S._conflictDialoogOpen) die
// een kale DOM-removal niet zou terugzetten; ongevraagd wegklikken zou bovendien een stilzwijgende
// keuze zijn, wat tegen de gouden standaard ingaat.
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var overlays = Array.prototype.filter.call(document.querySelectorAll('div[style]'), function(el) {
    var s = el.getAttribute('style') || '';
    return s.indexOf('position:fixed;inset:0') === 0 && s.indexOf('z-index:1000;') === -1;
  });
  if (!overlays.length) return;
  overlays[overlays.length - 1].remove();
});

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
// Groepsniveau-velden (df.groepsniveau) tellen mee voor ELKE entiteit op basis van S._groepData —
// die zitten nooit in een entiteit-eigen dataBron (zie getDataForFase), dus zonder deze uitzondering
// zou geen enkele entiteit ooit 100% kunnen halen zolang zo'n veld verplicht is.
function fillPct(id,dataBron){var f=FASES.find(function(x){return x.id===id;});if(!f)return 0;var bron=dataBron||S.data;var getekend=loiIsGetekend();var req=f.dataFields.filter(function(df){return df.req&&!df.header&&(getekend||df.fase!=='2');});var done=req.filter(function(df){var b=df.groepsniveau?S._groepData:bron;return !!(b[id+'_'+df.id]||'').trim();}).length;return req.length?Math.round(done/req.length*100):100;}
function totalFillPct(dataBron){var bron=dataBron||S.data;var getekend=loiIsGetekend();var t=0,d=0;FASES.forEach(function(f){var req=f.dataFields.filter(function(df){return df.req&&!df.header&&(getekend||df.fase!=='2');});t+=req.length;d+=req.filter(function(df){var b=df.groepsniveau?S._groepData:bron;return !!(b[f.id+'_'+df.id]||'').trim();}).length;});return t?Math.round(d/t*100):0;}
// Uitsluitend fase-1-velden checken (los van of de LoI al getekend is) — nodig om bij het inloggen
// te bepalen of "deel 1" af is, ook nadat fase 2 al is ontgrendeld en dus meetelt in fillPct/totalFillPct.
function fase1Compleet(){
  var t=0,d=0;
  FASES.forEach(function(f){
    var req=f.dataFields.filter(function(df){return df.req&&!df.header&&df.fase!=='2';});
    t+=req.length;
    d+=req.filter(function(df){var b=df.groepsniveau?S._groepData:S.data;return !!(b[f.id+'_'+df.id]||'').trim();}).length;
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
  FASES.forEach(function(f,idx){
    var missingFields=f.dataFields.filter(function(df){return df.req&&!df.header&&!((df.groepsniveau?S._groepData:S.data)[f.id+'_'+df.id]||'').trim();});
    if(missingFields.length)missing.push({fase:f.num+'. '+f.title,faseId:f.id,faseIdx:idx,fields:missingFields.map(function(df){return {id:df.id,label:df.label};})});
  });
  return missing;
}

function saveCurrent(cb){
  var f=FASES[S.fase];
  if(!f||S.screen!=='main'||isKoper())return;
  markDirty();
  if(S.traject&&S.traject.status==='vergrendeld'){if(cb)cb();return;}
  var inEntiteitContext=(S.data!==S._groepData);
  var groepsniveauGewijzigd=false;
  f.dataFields.forEach(function(df){
    if(df.header){return;}
    var el=ge('df_'+df.id);
    var key=f.id+'_'+df.id;
    if(el){
      // _userEdited wordt alleen gezet via oninput, NIET hier
      if(el.value.trim()||S._userEdited[key]){
        if(df.groepsniveau){S._groepData[key]=el.value;if(inEntiteitContext)groepsniveauGewijzigd=true;}
        else S.data[key]=el.value;
      }
    }
    // Als element niet in DOM is, behoud altijd bestaande waarde
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
    // Groepsniveau-veld gewijzigd terwijl een entiteit actief was: die hoort niet in de
    // entiteit-eigen save hierboven (getDataForFase sluit 'm al uit) — apart naar de groepsrij.
    if(groepsniveauGewijzigd)saveGroepsniveauVelden(f.id);
    if(cb)cb();
  },800);
}

// AI-verificatiestatus: waar komt een veldwaarde vandaan? 'ai_document' (uit documentextractie,
// S._docSource houdt de bestandsnaam bij), 'handmatig' (getypt door gebruiker, S._userEdited),
// 'auto_consolidatie' (Fase 2 — automatisch opgeteld/gemiddeld uit entiteiten, server-side gezet),
// of onbekend (bijv. data van vóór deze functionaliteit).
function veldBron(key){
  if(S._docSource&&S._docSource[key]){
    var out={bron:'ai_document',bron_doc:S._docSource[key]};
    if(S._docFragment&&S._docFragment[key])out.bron_fragment=S._docFragment[key];
    return out;
  }
  if(S._userEdited&&S._userEdited[key])return {bron:'handmatig'};
  return null;
}
function getDataForFase(id){
  var f=FASES.find(function(x){return x.id===id;});if(!f)return {};
  var out={};
  var inEntiteitContext=(S.data!==S._groepData);
  f.dataFields.forEach(function(df){
    if(df.header)return;
    // Groepsniveau-velden horen nooit in de entiteit-eigen payload — die worden apart naar de
    // groepsrij opgeslagen (zie saveGroepsniveauVelden), anders staat dezelfde "aantal partners"
    // straks dubbel/anders in elke BV.
    if(df.groepsniveau&&inEntiteitContext)return;
    var key=id+'_'+df.id;
    var v=(df.groepsniveau?S._groepData:S.data)[key];
    if(v){var obj={value:v,label:df.label,req:df.req||false};var b=veldBron(key);if(b)Object.assign(obj,b);out[df.id]=obj;}
  });
  return out;
}
// Bouwt en verstuurt (los van de huidige entiteit-save) de volledige, actuele groepsrij voor een
// fase — nodig omdat /mna/save de hele data_json vervangt, dus een groepsniveau-veld wijzigen
// terwijl je een entiteit bekijkt mag nooit de rest van de groepsrij overschrijven.
function saveGroepsniveauVelden(faseId){
  var origData=S.data;
  S.data=S._groepData;
  var payload=getDataForFase(faseId);
  S.data=origData;
  fetch(WORKER+'/mna/save',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:S.code,fase_id:faseId,data_json:payload,checklist_json:getChecklistForFase(faseId),notitie:S.notities[faseId]||''})
  }).catch(function(){});
}
function getChecklistForFase(id){var out={items:{},redflags:{}};var f=FASES.find(function(x){return x.id===id;});if(!f)return out;f.items.forEach(function(_,i){out.items[i]=!!S.checked[id+'_'+i];});f.redflags.forEach(function(_,i){out.redflags[i]=!!S.checked[id+'_rf_'+i];});return out;}

// Consolidatiekeuze: bij een groepscijfer dat materieel afwijkt van de som van de entiteiten kiest de
// begeleider zelf welke waarde geldt (Marcel, 25 juli 2026: een stray/aangeleverd cijfer mag niet
// stilzwijgend winnen — gouden standaard: bij twijfel een keuze, geen gok).
// - 'som'        : neemt de som van de entiteiten over als groepswaarde (en slaat die op).
// - 'aangeleverd': behoudt het aangeleverde/handmatige cijfer (geen wijziging).
// In beide gevallen verdwijnt de afwijkingsmelding voor dít veld uit het overzicht. Bij 'aangeleverd'
// kan de melding na een latere entiteit-wijziging opnieuw verschijnen (het verschil bestaat dan nog
// steeds) — dat is bewust: een reëel verschil hoort opnieuw te worden bevestigd, niet verborgen.
window.consolKies = function(faseId, veld, keuze, somWaarde){
  var key = faseId+'_'+veld;
  if(keuze==='som'){
    S._groepData[key]=String(somWaarde);
    saveGroepsniveauVelden(faseId);
  }
  // Afwijking voor dit veld uit het lokale consolidatiecheck-overzicht halen zodat de melding meteen bijwerkt.
  var ccKey = faseId+'_consolidatieCheck';
  try{
    var arr = JSON.parse(S._groepData[ccKey]||'[]');
    S._groepData[ccKey]=JSON.stringify(arr.filter(function(a){return a.veld!==veld;}));
  }catch(e){}
  renderApp();
  toast(keuze==='som'?'Som van de entiteiten overgenomen als groepscijfer.':'Aangeleverd cijfer behouden.','ok');
};
function loadDataFromDB(dbData){dbData.forEach(function(row){var id=row.fase_id;var dj=typeof row.data_json==='string'?JSON.parse(row.data_json||'{}'):row.data_json||{};var cj=typeof row.checklist_json==='string'?JSON.parse(row.checklist_json||'{}'):row.checklist_json||{};var f=FASES.find(function(x){return x.id===id;});if(!f)return;
  // Groepsstructuur (Fase 2): rijen met entiteit_id gaan naar de per-entiteit-opslag, niet naar S._groepData
  var doel=row.entiteit_id?(S.dataPerEntiteit[row.entiteit_id]=S.dataPerEntiteit[row.entiteit_id]||{}):S._groepData;
  Object.keys(dj).forEach(function(k){var v=dj[k];if(v&&v.value){doel[id+'_'+k]=v.value;
    // Herkomst herstellen zodat de AI-verificatiestatus ook na herladen nog klopt
    if(v.bron==='ai_document'&&v.bron_doc){if(!S._docSource)S._docSource={};S._docSource[id+'_'+k]=v.bron_doc;
      if(v.bron_fragment){if(!S._docFragment)S._docFragment={};S._docFragment[id+'_'+k]=v.bron_fragment;}}
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
            uploaded_at: d.uploaded_at||null, entiteit_id: d.entiteit_id||'',
            bewaard: !!d.bewaard, methode: d.methode, uploading: false,
            versie: d.versie||1, heeft_eerdere_versies: !!d.heeft_eerdere_versies
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

// Meerdere bestanden tegelijk geselecteerd (multi-select in "Document toevoegen") ÉÉN voor ÉÉN
// verwerken i.p.v. gelijktijdig — bij gelijktijdige uploads liep S._conflicts (gedeelde state)
// door elkaar tussen bestanden, waardoor de afwijkende-waarden-dialoog het verkeerde brondocument
// toonde of conflicten kwijtraakte, en meerdere dialogen tegelijk konden opstapelen (scherm werd
// zwart door de gestapelde halftransparante overlays). Gevonden 22 juli 2026.
// Elk bestand gaat door een echte AI-analyse (10-30+ sec per bestand) — bij een reeks van meerdere
// documenten kan dat in totaal enkele minuten duren. Zonder directe feedback lijkt het dan alsof
// alleen het eerste bestand is opgepakt: er verscheen pas een "bezig"-regel voor bestand 2 zodra
// bestand 1 helemaal klaar was. Nu meteen bij de start een wachtrij-plek voor ALLE geselecteerde
// bestanden + een voortgangstekst, zodat direct zichtbaar is dat de rest ook nog komt. Gevonden
// (opnieuw gemeld door Marcel als "pakt maar 1 document") 24 juli 2026.
window.uploadDocumentenSequentieel = async function(faseId, files) {
  if (!DOCS[faseId]) DOCS[faseId] = [];
  var wachtrijIds = [];
  for (var q = files.length - 1; q >= 0; q--) {
    var qid = 'wachtrij_' + Date.now() + '_' + q;
    wachtrijIds[q] = qid;
    DOCS[faseId].unshift({ id: qid, naam: files[q].name, type: files[q].type, grootte: files[q].size, analyse: '', velden: {}, uploading: true });
  }
  renderApp();
  var statusEl = document.getElementById('upload-status-' + faseId);
  for (var i = 0; i < files.length; i++) {
    if (statusEl) statusEl.textContent = files.length > 1 ? ('Bestand ' + (i + 1) + ' van ' + files.length + ' verwerken...') : 'Bestand verwerken...';
    await uploadDocument(faseId, files[i], wachtrijIds[i]);
  }
  if (statusEl) statusEl.textContent = '';
};

async function uploadDocument(faseId, file, existingId, vervangtDocId) {
  if (!S.code || isKoper()) return;
  if (S.traject && S.traject.status === 'vergrendeld') { toast('Traject is vergrendeld.','warn'); if (existingId) DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== existingId; }); return; }
  var maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) { toast('Bestand te groot (max 20MB). Huidig: ' + Math.round(file.size/1024/1024) + 'MB','warn'); if (existingId) DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== existingId; }); return; }

  // Show uploading state — hergebruik de wachtrij-plek als die er al is (batch-upload), anders nieuw.
  if (!DOCS[faseId]) DOCS[faseId] = [];
  var tempId = existingId || ('uploading_' + Date.now());
  if (!existingId) { DOCS[faseId].unshift({ id: tempId, naam: file.name, type: file.type, grootte: file.size, analyse: '', velden: {}, uploading: true }); renderApp(); }

  var formData = new FormData();
  formData.append('file', file);
  var bewaar = S.traject && S.traject.bewaar_docs !== false;
  var entiteitSel = document.getElementById('entiteit-select-'+faseId);
  var entiteitId = entiteitSel ? entiteitSel.value : '';
  var dubbeleCheckEl = document.getElementById('dubbele-check-'+faseId);
  var dubbeleCheck = dubbeleCheckEl && dubbeleCheckEl.checked;
  var url = WORKER + '/mna/document/upload?code=' + S.code + '&fase_id=' + faseId + '&bewaar=' + bewaar + (entiteitId?'&entiteit_id='+encodeURIComponent(entiteitId):'') + (dubbeleCheck?'&dubbele_check=true':'') + (vervangtDocId?'&vervangt='+encodeURIComponent(vervangtDocId):'');

  try {
    var resp = await fetch(url, { method: 'POST', body: formData });
    var d = await resp.json();
    if (d.ok) {
      // Replace temp with real — en bij een vervangende versie ook de oude versie uit de weergave
      // halen (de server sluit "vervangen" documenten al uit van /mna/document/lijst, maar de
      // lokale DOCS-cache is los daarvan en wordt pas bij een volgende loadDocsForFase ververst).
      DOCS[faseId] = DOCS[faseId].filter(function(x){ return x.id !== tempId && x.id !== vervangtDocId; });
      // d.entiteit_naam is een los top-level responsveld (de server verwijdert het uit veld_extractie
      // vóórdat die als losse velden teruggaat) — voor de "handmatig koppelen"-badge (die op elk
      // render-moment, ook ná een pagina-herlaad, opnieuw uit doc.velden.entiteit_naam herberekent)
      // moet het hier alsnog in velden terechtkomen, anders klopt de badge alleen bij deze ene render.
      var veldenMetEntNaam = Object.assign({}, d.veld_extractie || {});
      if (d.entiteit_naam) veldenMetEntNaam.entiteit_naam = d.entiteit_naam;
      DOCS[faseId].unshift({
        id: d.doc_id, naam: file.name, type: file.type, grootte: file.size,
        analyse: d.analyse, velden: veldenMetEntNaam, bewaard: !!d.r2_opgeslagen,
        uploaded_at: Date.now(), uploading: false, verworpen: !!d.verworpen, verworpen_reden: d.verworpen_reden||null,
        entiteit_id: entiteitId || '',
        versie: d.versie||1, heeft_eerdere_versies: !!vervangtDocId
      });
      if (d.veld_extractie) {
        // Geen entiteit gekozen bij upload. Als de AI zeker (exacte naam-match) één geregistreerde
        // entiteit herkent, routeren we automatisch daarnaartoe. GOUDEN STANDAARD (Marcel, 24 juli
        // 2026): bij twijfel NOOIT gokken — dus als er meerdere entiteiten zijn en de AI wél een
        // bedrijfsnaam herkende maar die niet zeker (exact) overeenkomt met precies één geregistreerde
        // entiteit, dan NIET automatisch verwerken (ook niet stilzwijgend op groepsniveau, dat mengt
        // onzekere cijfers alsnog in de groepstotalen) — het document wordt gemarkeerd "handmatig
        // koppelen nodig" en de begeleider kiest zelf de juiste entiteit (koppel-dropdown verwerkt de
        // extractie dan alsnog, zie koppelDocumentAanEntiteit). Vóór deze regel werd een niet-zekere
        // match ofwel geraden (bevat-heuristiek) ofwel stilzwijgend in de groep gemengd — beide zijn
        // precies het soort onzichtbare aanname die tot de groepscijfer-discrepanties leidde.
        var effectiefEntiteitId = entiteitId;
        var behoeftHandmatigeKoppeling = false;
        if (!effectiefEntiteitId && S._entiteiten && S._entiteiten.length) {
          var gokIdUpload = gokEntiteitId(d.entiteit_naam, true);
          if (gokIdUpload) {
            effectiefEntiteitId = gokIdUpload;
            fetch(WORKER+'/mna/document/koppel-entiteit/'+d.doc_id,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S.code},body:JSON.stringify({entiteit_id:gokIdUpload})}).catch(function(){});
            var docRefUpload=DOCS[faseId].find(function(x){return x.id===d.doc_id;});
            if(docRefUpload)docRefUpload.entiteit_id=gokIdUpload;
          } else if (S._entiteiten.length > 1 && d.entiteit_naam) {
            behoeftHandmatigeKoppeling = true;
            var docRefOnzeker=DOCS[faseId].find(function(x){return x.id===d.doc_id;});
            if(docRefOnzeker)docRefOnzeker.behoeftHandmatigeKoppeling=true;
          }
        }
        if (behoeftHandmatigeKoppeling) {
          toast('⚠ "'+file.name+'": entiteit niet zeker herkend ("'+d.entiteit_naam+'") — cijfers zijn NIET verwerkt. Koppel het document handmatig aan de juiste entiteit via de dataroom.','warn',8000);
          renderApp();
        } else {
          S._conflicts=[];
          var alleFases=['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];
          alleFases.forEach(function(fid){ autoFillFromExtraction(fid, d.veld_extractie, false, file.name, effectiefEntiteitId); });
          // Extra controle (dubbele AI-analyse) aangevraagd: de tweede, onafhankelijke lezing vergelijken
          // met wat pass 1 net heeft ingevuld. BELANGRIJK: de meeste velden gebruiken intern setIfEmpty
          // (vult alleen een leeg veld, negeert stil een latere afwijkende waarde) — hergebruik van
          // autoFillFromExtraction voor pass 2 zou dus voor ~55 van de ~60 velden GEEN conflict tonen
          // bij een afwijking (getest en bevestigd: alleen jaaromzet loopt via applyOrConflict). Daarom
          // hier gesplitst: jaaromzet hergebruikt de bestaande, al beproefde boekjaar-windowing
          // (autoFillFromExtraction met een minimale set — alleen omzet/boekjaar/omzet_per_jaar, zodat
          // geen van de setIfEmpty-velden per ongeluk meegetriggerd wordt); alle overige velden gaan
          // via een losse, directe vergelijking die zelf de juiste doel-bucket en form-veldkey bepaalt
          // (zie AI_VELD_MAP/vergelijkDubbelePassOverigeVelden hieronder) en dus NOOIT stilzwijgend een
          // afwijking laat liggen.
          if(d.veld_extractie_2){
            var veld2Omzet={omzet:d.veld_extractie_2.omzet,boekjaar:d.veld_extractie_2.boekjaar,omzet_per_jaar:d.veld_extractie_2.omzet_per_jaar};
            autoFillFromExtraction('financieel',veld2Omzet,false,file.name+' (2e AI-lezing, extra controle)',effectiefEntiteitId);
            var overigeDiffs=vergelijkDubbelePassOverigeVelden(d.veld_extractie,d.veld_extractie_2,effectiefEntiteitId);
            if(overigeDiffs.length){ if(!S._conflicts)S._conflicts=[]; S._conflicts=S._conflicts.concat(overigeDiffs); }
          }
          if(S._conflicts&&S._conflicts.length){
            var ctxLbl=effectiefEntiteitId?('Voor: '+entiteitNaam(effectiefEntiteitId)):'Voor: Groep (geconsolideerd)';
            var conflictenBatch=S._conflicts.slice();S._conflicts=[];
            renderApp();setTimeout(function(){toonConflictDialog(conflictenBatch,ctxLbl);},300);
          }else if(effectiefEntiteitId){
            renderApp();saveEntiteitData(effectiefEntiteitId,alleFases);
          }else{markDirty();renderApp();schedSave();}
        }
      }
      // Toon crosscheck waarschuwingen (AI-zelfrapportage + deterministische sanity-check)
      if((d.crosschecks&&d.crosschecks.length)||(d.sanity_waarschuwingen&&d.sanity_waarschuwingen.length)||(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam)){
        var msgs=[];
        // Entiteit check
        if(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam){
          var n1=(d.entiteit_naam||'').toLowerCase(),n2=(S.traject.kantoor_naam||'').toLowerCase();
          if(!n1.includes(n2.split(' ')[0])&&!n2.includes(n1.split(' ')[0]))
            msgs.push('⚠ Entiteit in document ("'+d.entiteit_naam+'") wijkt af van kantoornaam ("'+S.traject.kantoor_naam+'")');
        }
        if(d.crosschecks)msgs=msgs.concat(d.crosschecks);
        if(d.sanity_waarschuwingen)msgs=msgs.concat(d.sanity_waarschuwingen);
        if(msgs.length){
          var md='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:6px;padding:.75rem;margin:.5rem 0">'
            +'<div style="font-size:11px;font-weight:600;color:var(--gold-dark);margin-bottom:.4rem">⚠ Aandachtspunten bij '+esc(file.name)+'</div>'
            +msgs.map(function(m){return '<div style="font-size:12px;color:var(--gold-dark);padding:2px 0">• '+esc(m)+'</div>';}).join('')
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
          if(statusEl3)statusEl3.innerHTML=(statusEl3.innerHTML||'')+'<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:6px;padding:.5rem .75rem;margin-top:.4rem;font-size:12px;color:var(--red)">🚫 <strong>'+esc(file.name)+'</strong> genegeerd: '+esc(d.verworpen_reden)+'</div>';
          // Direct doorgaan naar volgend bestand
          renderApp();
          continue;
        }
        // Toon crosscheck waarschuwingen als die er zijn (AI-zelfrapportage + deterministische sanity-check)
        var alleWarn=(d.crosschecks||[]).concat(d.sanity_waarschuwingen||[]);
        if(alleWarn.length){
          var warnHtml='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:6px;padding:.75rem;margin-top:.5rem">'
            +'<div style="font-size:11px;font-weight:600;color:var(--gold-dark);margin-bottom:.4rem">⚠ '+file.name+' — '+alleWarn.length+' aandachtspunt(en)</div>';
          alleWarn.forEach(function(w){warnHtml+='<div style="font-size:12px;color:var(--gold-dark);padding:2px 0">• '+esc(w)+'</div>';});
          // Entiteit check
          if(d.entiteit_naam&&S.traject&&S.traject.kantoor_naam){
            var naam1=(d.entiteit_naam||'').toLowerCase();
            var naam2=(S.traject.kantoor_naam||'').toLowerCase();
            if(!naam1.includes(naam2.split(' ')[0])&&!naam2.includes(naam1.split(' ')[0])){
              warnHtml+='<div style="font-size:12px;color:var(--red);padding:2px 0;font-weight:500">⚠ Entiteit in document ("'+esc(d.entiteit_naam)+'") wijkt af van kantoornaam ("'+esc(S.traject.kantoor_naam)+'") — controleer of dit het juiste bestand is.</div>';
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

// Zelfconsistentie ("Extra controle", dubbele AI-analyse): koppelt elk AI-schemaveld (zie
// DOC_EXTRACTIE_JSON_SCHEMA_BASIS in de worker) aan het bijbehorende interne formulierveld + label.
// Handgemaakt en 1-op-1 nagelopen tegen de setIfEmpty/applyOrConflict-aanroepen in
// _autoFillFromExtractionBody hieronder — GEEN gok, elke regel hier komt overeen met een bestaande
// mapping daar. Bewust NIET opgenomen: omzet/boekjaar/omzet_per_jaar (die lopen via de aparte,
// al bestaande boekjaar-windowing — zie de aanroep in uploadDocument), 'claims' (in de bestaande
// code dubbelzinnig — mapt daar naar twee verschillende velden, dus hier niet automatisch te kiezen),
// 'vervolgstap' (heeft een eigen filter op geblokkeerde woorden, niet zomaar te dupliceren) en de
// sectorspecifieke MKB/Zorg/IT-extra-velden (aparte, kleinere uitbreiding, nog niet gedekt).
var AI_VELD_MAP = {
  ebitda_pct:{key:'financieel_ebitdaMarge',label:'EBITDA-marge (%)'},
  resultaat:{key:'financieel_ebitdaNorm',label:'EBITDA genormaliseerd'},
  ebitda_abs:{key:'financieel_ebitda',label:'EBITDA (€, absoluut)'},
  ohw:{key:'financieel_wip',label:'Onderhanden werk'},
  debiteuren:{key:'financieel_debiteuren',label:'Debiteuren'},
  omzet_jaarwerk_pct:{key:'financieel_omzetJaarwerk',label:'Omzet jaarwerk (%)'},
  omzet_advies_pct:{key:'financieel_omzetAdvies',label:'Omzet advies (%)'},
  omzet_loon_pct:{key:'financieel_omzetLoon',label:'Omzet loonadministratie (%)'},
  omzet_fiscaal_pct:{key:'financieel_omzetFiscaal',label:'Omzet fiscaal (%)'},
  omzet_overig_pct:{key:'financieel_omzetOverig',label:'Omzet overig (%)'},
  omzet_ytd:{key:'financieel_omzetYTD',label:'Omzet YTD'},
  debiteuren_oud:{key:'financieel_debiteurenOud',label:'Debiteuren >90 dagen (%)'},
  declarabiliteit:{key:'financieel_declarab',label:'Declarabiliteit (%)'},
  partnerbeloning:{key:'financieel_partnerBel',label:'Partnerbeloning'},
  kosten_personeel_pct:{key:'financieel_kostenPersoneel',label:'Personeelskosten (%)'},
  kosten_huisvesting_pct:{key:'financieel_kostenHuisvesting',label:'Huisvestingskosten (%)'},
  kosten_it_pct:{key:'financieel_kostenIT',label:'IT-kosten (%)'},
  kosten_marketing_pct:{key:'financieel_kostenMarketing',label:'Marketingkosten (%)'},
  kosten_overig_pct:{key:'financieel_kostenOverig',label:'Overige kosten (%)'},
  fte:{key:'partner_fte',label:'FTE'},
  aantal_partners:{key:'partner_aantalP',label:'Aantal partners'},
  gem_leeftijd_partners:{key:'partner_gemLeeftijd',label:'Gem. leeftijd partners'},
  omzet_per_partner:{key:'partner_omzetPerP',label:'Omzet per partner'},
  pensioen_partners:{key:'partner_pensioenP',label:'Pensioen partners'},
  personeelsverloop:{key:'partner_verloop',label:'Personeelsverloop (%)'},
  openstaande_vacatures:{key:'partner_vacatures',label:'Openstaande vacatures'},
  ra_aa_opleiding:{key:'partner_raAa',label:'RA/AA-opleiding'},
  opvolgingskandidaat:{key:'partner_opvolging',label:'Opvolgingskandidaat'},
  veranderbereidheid:{key:'partner_verandering',label:'Veranderbereidheid'},
  partnerovereenkomsten:{key:'partner_pContract',label:'Partnerovereenkomsten'},
  aandeelhoudersstructuur:{key:'partner_eigendomsStructuur',label:'Eigendomsstructuur'},
  aantal_klanten:{key:'commercieel_aantalKlanten',label:'Aantal klanten'},
  churn:{key:'commercieel_churn',label:'Churn (%)'},
  gem_klantduur:{key:'commercieel_klantduur',label:'Gem. klantduur'},
  grootste_klant_pct:{key:'commercieel_top1pct',label:'Grootste klant (% van omzet)'},
  top10_pct:{key:'commercieel_top10pct',label:'Top-10 klanten (% van omzet)'},
  recurring:{key:'commercieel_recurring',label:'Recurring omzet (%)'},
  cross_sell:{key:'commercieel_crossSell',label:'Cross-sell (%)'},
  nieuwe_klanten:{key:'commercieel_nieuw',label:'Nieuwe klanten'},
  verloren_klanten:{key:'commercieel_verlies',label:'Verloren klanten'},
  nba_status:{key:'compliance_nba',label:'NBA-status'},
  afm_vergunning:{key:'compliance_afm',label:'AFM-vergunning'},
  kwaliteitstoetsing_jaar:{key:'compliance_toetsDatum',label:'Kwaliteitstoetsing (jaar)'},
  kwaliteitstoetsing_oordeel:{key:'compliance_toetsOordeel',label:'Kwaliteitstoetsing (oordeel)'},
  tuchtzaken:{key:'compliance_tuchtzaken',label:'Tuchtzaken'},
  wwft:{key:'compliance_wwft',label:'WWFT'},
  integriteitsincidenten:{key:'compliance_incidenten',label:'Integriteitsincidenten'},
  software_primair:{key:'it_software',label:'Primaire software'},
  overige_systemen:{key:'it_softwareOverig',label:'Overige systemen'},
  automatiseringsgraad:{key:'it_autoGraad',label:'Automatiseringsgraad'},
  ai_tooling:{key:'it_ai',label:'AI-tooling'},
  it_kosten:{key:'it_itKosten',label:'IT-kosten'},
  cybersecurity:{key:'it_security',label:'Cybersecurity'},
  it_risicos:{key:'it_itRisico',label:'IT-risico’s'},
  rechtsvorm:{key:'juridisch_rechtsvorm',label:'Rechtsvorm'},
  huurcontract_looptijd:{key:'juridisch_huur',label:'Huurcontract looptijd'},
  vpb_discussies:{key:'juridisch_vpb',label:'VPB-discussies'},
  fiscale_risicos:{key:'juridisch_fiscaalRisico',label:'Fiscale risico’s'},
  stak:{key:'juridisch_stak',label:'STAK / bijzondere structuur'},
  leaseverplichtingen:{key:'juridisch_lease',label:'Leaseverplichtingen'},
  marktpositie:{key:'strategisch_marktpos',label:'Marktpositie'},
  niche:{key:'strategisch_niche',label:'Niche/specialisme'},
  concurrenten:{key:'strategisch_concurrenten',label:'Concurrenten'},
  ai_impact:{key:'strategisch_aiImpact',label:'AI-impact'},
  cultuur:{key:'strategisch_cultuurFit',label:'Cultuur/fit'},
  tijdlijn:{key:'strategisch_tijdlijn',label:'Gewenste tijdlijn'}
};
function vergelijkDubbelePassOverigeVelden(veld1, veld2, entiteitId) {
  veld1 = veld1 || {}; veld2 = veld2 || {};
  var bucket = entiteitId ? (S.dataPerEntiteit[entiteitId] = S.dataPerEntiteit[entiteitId] || {}) : S.data;
  var diffs = [];
  Object.keys(AI_VELD_MAP).forEach(function(aiKey) {
    var m = AI_VELD_MAP[aiKey];
    var a = cleanGetal(veld1[aiKey]);
    var b = cleanGetal(veld2[aiKey]);
    var aLeeg = (a === null || a === undefined || a === 'null' || String(a).trim() === '');
    var bLeeg = (b === null || b === undefined || b === 'null' || String(b).trim() === '');
    if (aLeeg || bLeeg) return; // alleen vergelijken als BEIDE AI-lezingen een waarde gaven
    if (String(a) === String(b)) return; // de twee lezingen zijn het eens
    var existing = (bucket[m.key] || '').trim();
    if (!existing || existing === String(b)) return; // niets ingevuld, of huidige waarde is toch al gelijk aan lezing 2
    diffs.push({ key: m.key, label: m.label, huidig: existing, nieuw: String(b), bron: '2e AI-lezing (extra controle)', doel: bucket });
  });
  return diffs;
}

function autoFillFromExtraction(faseId, velden, forceOverwrite, docNaam, entiteitId) {
  // Groepsstructuur (Fase 2): als deze upload aan een entiteit is gekoppeld, alle S.data-lezingen/
  // -schrijvingen hieronder tijdelijk omleiden naar die entiteit se eigen dataopslag — zonder de
  // huidige formulier-context (S._actieveEntiteit) te wijzigen. Aan het eind altijd terugzetten.
  // S._opy/S._epy (jaaromzet/EBITDA-marge per boekjaar) moeten ook per entiteit — anders lopen de
  // boekjaren van verschillende bedrijfsonderdelen door elkaar (dit veroorzaakte de omzet3-bug bij
  // Marilyn en Co: een klein onderdeel schoof de groepscijfers uit het venster).
  // S._opySlotJaar (welk boekjaar er nu in omzet1/2/3 zit) hoort om dezelfde reden ook per entiteit.
  var _origData = S.data, _origOpy = S._opy, _origEpy = S._epy, _origOpySlotJaar = S._opySlotJaar;
  if (entiteitId) {
    S.dataPerEntiteit[entiteitId] = S.dataPerEntiteit[entiteitId] || {};
    S.data = S.dataPerEntiteit[entiteitId];
    if (!S._opyPerEntiteit) S._opyPerEntiteit = {};
    if (!S._epyPerEntiteit) S._epyPerEntiteit = {};
    if (!S._opySlotJaarPerEntiteit) S._opySlotJaarPerEntiteit = {};
    S._opyPerEntiteit[entiteitId] = S._opyPerEntiteit[entiteitId] || {};
    S._epyPerEntiteit[entiteitId] = S._epyPerEntiteit[entiteitId] || {};
    S._opySlotJaarPerEntiteit[entiteitId] = S._opySlotJaarPerEntiteit[entiteitId] || {};
    S._opy = S._opyPerEntiteit[entiteitId];
    S._epy = S._epyPerEntiteit[entiteitId];
    S._opySlotJaar = S._opySlotJaarPerEntiteit[entiteitId];
  }
  try {
    _autoFillFromExtractionBody(faseId, velden, forceOverwrite, docNaam);
  } finally {
    S.data = _origData; S._opy = _origOpy; S._epy = _origEpy; S._opySlotJaar = _origOpySlotJaar;
  }
}
function _autoFillFromExtractionBody(faseId, velden, forceOverwrite, docNaam) {
  var currentDocNaam = docNaam || 'onbekend document';
  // Boekjaar van dit document (uit de extractie) — per veld onthouden zodat de conflict-dialoog kan
  // tonen bij welk boekjaar elke waarde hoort. Was een gemeld pijnpunt (Marcel, 25 juli 2026): bij
  // afwijkende waarden (bv. EBITDA-marge 46,9 vs 48,9) was onduidelijk dat het twee verschillende
  // boekjaren betrof. In-memory (S._docJaar); ontbreekt het jaar, dan valt de dialoog netjes terug op
  // alleen de bestandsnaam, zoals voorheen.
  var docJaar = velden.boekjaar ? String(velden.boekjaar).trim() : null;
  if(!S._docJaar) S._docJaar = {};
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
          var doelDirect=doelData(k);
          if(forceOverwrite||!(doelDirect[k]||'').trim())doelDirect[k]=String(val);
        }
      }
    }
  });

  // rawVeldNaam (optioneel): de oorspronkelijke AI-veldnaam (bijv. 'ebitda_abs'), gebruikt om
  // herkomst (welk document) en het letterlijke brontekst-fragment te koppelen. Alleen meegegeven
  // bij de belangrijkste financiële cijfervelden — niet bij elke aanroep (zie toelichting bij de
  // aanroepen zelf): dat zou 70+ call sites raken voor velden die niet expliciet gevraagd zijn.
  function setIfEmpty(key, val, rawVeldNaam) {
    var d=doelData(key);
    if(val&&val!=='null'&&val!==null&&String(val).trim()!==''&&!(d[key]||'').trim()){
      d[key]=String(val);
      if(rawVeldNaam){
        if(!S._docSource)S._docSource={};S._docSource[key]=currentDocNaam;S._docJaar[key]=docJaar;
        var frag=(velden._bron_fragmenten||{})[rawVeldNaam];
        if(frag){if(!S._docFragment)S._docFragment={};S._docFragment[key]=frag;}
      }
    }
  }
  function applyOrConflict(key, val, label, rawVeldNaam) {
    if(!val||val==='null'||val===null||String(val).trim()==='')return;
    var d=doelData(key);
    var newVal=String(val);
    var existing=(d[key]||'').trim();
    function zetFragment(){
      if(!rawVeldNaam)return;
      var frag=(velden._bron_fragmenten||{})[rawVeldNaam];
      if(frag){if(!S._docFragment)S._docFragment={};S._docFragment[key]=frag;}
    }
    if(!existing){d[key]=newVal;if(!S._docSource)S._docSource={};S._docSource[key]=currentDocNaam;S._docJaar[key]=docJaar;zetFragment();return;}
    if(existing===newVal)return;
    if(forceOverwrite){d[key]=newVal;if(!S._docSource)S._docSource={};S._docSource[key]=currentDocNaam;S._docJaar[key]=docJaar;zetFragment();return;}
    // Zelfde document dat dit veld eerder al zette (bijv. herverwerking) — gewoon bijwerken, geen conflict.
    if(S._docSource&&S._docSource[key]===currentDocNaam){d[key]=newVal;S._docJaar[key]=docJaar;return;}
    // Andere waarde dan wat er al stond — altijd laten kiezen, ook als het huidige veld zelf
    // automatisch is ingevuld door een ander document. Stilzwijgend overschrijven leidde ertoe dat
    // een later document (bijv. van een ander bedrijfsonderdeel) correcte cijfers ongemerkt verving.
    if(!S._conflicts)S._conflicts=[];
    // 'doel' legt de daadwerkelijke opslag-bucket vast (S.data, S._groepData of een specifieke
    // S.dataPerEntiteit[x], al naar gelang welke actief was tijdens deze extractie) — niet later
    // opnieuw via S.data aanroepen bij het toepassen van de keuze: autoFillFromExtraction zet S.data
    // ondertussen alweer terug naar de oorspronkelijke formuliercontext, dus "S.data[key]=..." bij het
    // toepassen schreef de keuze soms in de verkeerde (groeps- i.p.v. entiteit-)bucket.
    // huidigJaar = boekjaar van het document dat de bestaande waarde zette; nieuwJaar = boekjaar van
    // dit document. De dialoog toont ze zodat duidelijk is waar elke waarde betrekking op heeft.
    S._conflicts.push({key:key,label:label,huidig:existing,nieuw:newVal,bron:currentDocNaam,doel:d,huidigJaar:(S._docJaar&&S._docJaar[key])||null,nieuwJaar:docJaar});
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
      // Altijd bijwerken (niet alleen als nog leeg) — anders werd een tweede document dat een
      // ANDERE waarde voor hetzelfde boekjaar aanlevert stilzwijgend genegeerd, vóórdat het
      // hieronder ooit als conflict aan de gebruiker kon worden voorgelegd. Gevonden 24 juli 2026.
      S._opy[bj]=velden.omzet;
    }
    var yrs=Object.keys(S._opy).map(Number).filter(function(j){return!isNaN(j)&&j>1990&&j<2100;}).sort(function(a,b){return a-b;});
    if(yrs.length){
      // Meest recente 3 jaar op omzet1/2/3. LET OP: welk boekjaar in welk vak (jaar1/2/3) hoort,
      // schuift op zodra een nieuwer jaar binnenkomt (bijv. 2025 duwt 2023 uit het venster van
      // jaar3 naar jaar2). Dat opschuiven is GEEN inhoudelijk conflict — het is dezelfde,
      // eerder al geaccepteerde waarde die nu correct onder een ander vaknaam hoort. Alleen
      // wanneer hetzelfde boekjaar een ANDERE waarde krijgt (twee documenten die het niet eens
      // zijn over bijv. 2024) is het een echt conflict en moet de gebruiker kiezen. S._opySlotJaar
      // onthoudt welk boekjaar er momenteel in elk vak zit om dit onderscheid te maken. Vóór deze
      // fix werd bij elke venster-verschuiving stilzwijgend een vals conflict opgeworpen tussen
      // twee verschillende boekjaren, met een misleidend jaartal in het label. Gevonden 24 juli 2026.
      if(!S._opySlotJaar)S._opySlotJaar={};
      var toFill=yrs.slice(-3);
      var allFlds=['omzet1','omzet2','omzet3'];
      var usedFlds=allFlds.slice(3-toFill.length);
      var fldLabel=['Jaaromzet jaar 1 (oudste)','Jaaromzet jaar 2','Jaaromzet jaar 3 (meest recent)'];
      var labelOffset=3-toFill.length;
      toFill.forEach(function(yr,i){
        var w=S._opy[String(yr)];if(!w)return;
        var slot=usedFlds[i],slotKey='financieel_'+slot,prevJaar=S._opySlotJaar[slot];
        if(prevJaar!==undefined&&String(prevJaar)!==String(yr)){
          // Venster is opgeschoven: dit vak stelt nu een ander boekjaar voor dan voorheen —
          // geen gebruikersconflict, gewoon bijwerken.
          var d=doelData(slotKey);d[slotKey]=String(w);
          if(!S._docSource)S._docSource={};S._docSource[slotKey]=currentDocNaam;
          S._opySlotJaar[slot]=yr;
        }else{
          applyOrConflict(slotKey,String(w),fldLabel[labelOffset+i]+' ('+yr+')');
          S._opySlotJaar[slot]=yr;
        }
      });
    }
    if(!S._epy)S._epy={};
    var ev=velden.ebitda_pct;
    if(ev&&ev!=='null'&&ev!==null){
      var ej=velden.boekjaar?String(Number(velden.boekjaar)):'0';
      if(!S._epy[ej])S._epy[ej]=ev;
      var eys=Object.keys(S._epy).map(Number).filter(function(j){return!isNaN(j);}).sort(function(a,b){return b-a;});
      if(eys.length)applyOrConflict('financieel_ebitdaMarge',S._epy[String(eys[0])],'EBITDA-marge (%)');
    }
    if(velden.ohw&&velden.ohw!=='null')applyOrConflict('financieel_wip',cleanGetal(velden.ohw),'Onderhanden werk','ohw');
    if(velden.debiteuren&&velden.debiteuren!=='null')applyOrConflict('financieel_debiteuren',cleanGetal(velden.debiteuren),'Debiteuren','debiteuren');
    // Herkomst+brontekstfragment gekoppeld voor de belangrijkste financiële cijfervelden (zie
    // toelichting bij setIfEmpty) — bij een OR-keten (bijv. resultaat||afgeleid) alleen de eerste
    // (meest voorkomende) AI-veldnaam als rawVeldNaam, dus geen fragment bij de fallback-synoniemen.
    setIfEmpty('financieel_ebitdaNorm',cleanGetal(velden.resultaat),'resultaat');
    setIfEmpty('financieel_ebitda',cleanGetal(velden.ebitda_abs),'ebitda_abs');
    setIfEmpty('financieel_omzetJaarwerk',velden.omzet_jaarwerk_pct);
    setIfEmpty('financieel_omzetAdvies',velden.omzet_advies_pct);
    setIfEmpty('financieel_omzetLoon',velden.omzet_loon_pct);
    setIfEmpty('financieel_omzetFiscaal',velden.omzet_fiscaal_pct);
    setIfEmpty('financieel_omzetOverig',velden.omzet_overig_pct);
    setIfEmpty('financieel_omzetYTD',cleanGetal(velden.omzet_ytd||velden.ytd_omzet||velden.omzet_huidig_jaar),'omzet_ytd');
    setIfEmpty('financieel_debiteurenOud',velden.debiteuren_oud||velden.debiteuren_90_dagen||velden.old_debiteuren_pct,'debiteuren_oud');
    setIfEmpty('financieel_declarab',velden.declarabiliteit||velden.declarab_pct);
    setIfEmpty('financieel_partnerBel',velden.partnerbeloning||velden.partner_beloning||velden.beloning_partners,'partnerbeloning');
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
  fetch(WORKER+'/mna/document/delete/'+docId+'?code='+encodeURIComponent(S.code||''),{method:'POST'}).catch(function(){});
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
      + '<input type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.eml,.xml,.xbrl" style="display:none" onchange="var _inp=this;uploadDocumentenSequentieel(\''+faseId+'\',this.files).then(function(){_inp.value=\'\';});">'
      + '</label>'
      + entiteitKiezer
      + '<label style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);cursor:pointer" title="Leest het document twee keer onafhankelijk met AI en vergelijkt de uitkomst. Komen de twee lezingen niet overeen, dan wordt u gevraagd de juiste waarde te kiezen. Kost meer en duurt langer — daarom standaard uit.">'
      + '<input type="checkbox" id="dubbele-check-'+faseId+'" style="margin:0"> Extra controle (dubbele AI-analyse)'
      + '</label>'
      + '<div id="upload-status-'+faseId+'" style="font-size:11px;color:var(--muted)"></div>'
      + (faseId==='financieel'?'<div style="font-size:10px;color:var(--muted);flex-basis:100%">Ook een SBR/XBRL-jaarrekeningbestand kan hier geüpload worden — de officiële cijfers worden dan automatisch uitgelezen. Let op: bij kleine/middelgrote rechtspersonen bevat dit wettelijk geen apart omzetcijfer (pas vanaf brutomarge).</div>':'')
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
      var entNaamDoc = entiteitNaam(doc.entiteit_id);
      var toonKoppelenDoc = !isReadOnly && S._entiteiten && S._entiteiten.length;
      var gokIdDoc = (toonKoppelenDoc && !doc.entiteit_id) ? gokEntiteitId((doc.velden||{}).entiteit_naam) : '';
      var geselecteerdDoc = doc.entiteit_id || gokIdDoc;
      // GOUDEN STANDAARD: bij onzekere entiteitsherkenning (AI noemde wél een bedrijfsnaam, maar die
      // matcht niet zeker/exact met precies één geregistreerde entiteit) is niets automatisch
      // verwerkt — herberekend uit de opgeslagen extractie (dus ook kloppend ná een pagina-herlaad,
      // niet afhankelijk van in-memory state van het moment van uploaden).
      var behoeftKoppelingDoc = toonKoppelenDoc && !doc.entiteit_id && (doc.velden||{}).entiteit_naam && !gokEntiteitId((doc.velden||{}).entiteit_naam, true);
      var groepsniveauBadgeDoc = (toonKoppelenDoc && !doc.entiteit_id)
        ? (behoeftKoppelingDoc
          ? ' <span style="font-size:9px;font-weight:700;color:#fff;background:var(--red);border-radius:8px;padding:1px 6px;margin-left:2px">&#9888; Handmatig koppelen</span>'
          : ' <span style="font-size:9px;font-weight:600;color:var(--muted);background:var(--panel);border-radius:8px;padding:1px 6px;margin-left:2px">Groepsniveau</span>')
        : '';
      return '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:'+(behoeftKoppelingDoc?'var(--red-bg)':'var(--card)')+';border-radius:var(--r);border:1px solid '+(behoeftKoppelingDoc?'var(--red)':'var(--border)')+';flex-wrap:wrap">'
        + '<span style="font-size:13px">'+icon+'</span>'
        + '<span style="font-size:11px;color:'+(behoeftKoppelingDoc?'var(--head)':'var(--teal)')+';flex:1">'+(doc.bewaard?'<a href="'+WORKER+'/mna/document/download/'+doc.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" style="color:'+(behoeftKoppelingDoc?'var(--head)':'var(--teal)')+';text-decoration:'+(behoeftKoppelingDoc?'underline':'none')+'">'+esc(doc.naam)+'</a>':esc(doc.naam))+(entNaamDoc?' <span style="font-size:9px;font-weight:600;color:var(--teal);background:var(--teal-bg);border-radius:8px;padding:1px 6px;margin-left:2px">'+esc(entNaamDoc)+'</span>':groepsniveauBadgeDoc)+((doc.versie||1)>1?' <span style="font-size:9px;font-weight:600;color:var(--muted);background:var(--panel);border-radius:8px;padding:1px 6px;margin-left:2px" title="Dit is versie '+(doc.versie||1)+' — vervangt een eerder geüpload document">v'+(doc.versie||1)+'</span>':'')+'</span>'
        + '<span style="font-size:10px;color:var(--muted)">'+(doc.grootte/1024/1024).toFixed(1)+'MB</span>'
        + (toonKoppelenDoc?'<select id="fd-ent-'+doc.id+'" style="font-size:10px;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:2px 4px"><option value="">'+(doc.entiteit_id?'— Groepsniveau (ontkoppelen) —':'— Koppel aan entiteit —')+'</option>'+S._entiteiten.map(function(e){return '<option value="'+esc(e.id)+'"'+(e.id===geselecteerdDoc?' selected':'')+'>'+esc(e.naam)+(e.id===gokIdDoc&&!doc.entiteit_id?' (AI-suggestie)':'')+'</option>';}).join('')+'</select><button onclick="koppelDocumentAanEntiteit(\''+doc.id+'\',\'fd-ent-\')" style="background:none;border:1px solid var(--teal);color:var(--teal);border-radius:var(--r);cursor:pointer;font-size:10px;padding:1px 6px">&#128279;</button>':'')
        + ((doc.heeft_eerdere_versies||(doc.versie||1)>1)?'<button onclick="toonVersieGeschiedenis(\''+doc.id+'\')" title="Eerdere versies bekijken" style="background:none;border:1px solid var(--border2);color:var(--muted);border-radius:var(--r);cursor:pointer;font-size:10px;padding:1px 6px">&#128337; Versies</button>':'')
        + (!isReadOnly?'<button onclick="vervangDocument(\''+faseId+'\',\''+doc.id+'\')" title="Nieuwe versie uploaden (vervangt dit document)" style="background:none;border:1px solid var(--border2);color:var(--muted);border-radius:var(--r);cursor:pointer;font-size:10px;padding:1px 6px">&#8635; Vervangen</button>':'')
        + (!isReadOnly?'<button onclick="deleteDocument(\''+doc.id+'\',\''+faseId+'\')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:10px;padding:0 2px">✕</button>':'')
        + '</div>';
    }).join('');
    docsHtml += '</div>';
  }

  return '<div style="margin-bottom:1rem">'+uploadHtml+docsHtml+'</div>';
}

// Nieuwe versie van een bestaand document uploaden (Documentversiebeheer, 25 juli 2026): opent een
// verborgen bestandskiezer en koppelt de nieuwe upload via ?vervangt= aan het oude document — de
// server houdt dan de volledige keten bij i.p.v. twee losse, ongerelateerde documenten.
window.vervangDocument = function(faseId, docId) {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.eml,.xml,.xbrl';
  inp.style.display = 'none';
  inp.onchange = function() {
    if (inp.files && inp.files[0]) uploadDocument(faseId, inp.files[0], null, docId);
    inp.remove();
  };
  document.body.appendChild(inp);
  inp.click();
};

// Toont de volledige versieketen van een document (oud → nieuw) in een overlay, met downloadlinks
// per versie. Overlay volgt hetzelfde position:fixed;inset:0-patroon als de andere modals in dit
// bestand, zodat de generieke Escape-afhandeling (zie boven) 'm ook sluit.
window.toonVersieGeschiedenis = async function(docId) {
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.5rem;max-width:480px;width:100%;max-height:80vh;overflow-y:auto';
  box.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.75rem">Versiegeschiedenis</div><div style="font-size:12px;color:var(--muted)">Laden...</div>';
  ov.appendChild(box);
  document.body.appendChild(ov);
  try {
    var resp = await fetch(WORKER + '/mna/document/versies/' + S.code + '/' + docId);
    var d = await resp.json();
    if (!d.ok || !d.versies || !d.versies.length) { box.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.75rem">Versiegeschiedenis</div><div style="font-size:12px;color:var(--muted)">Geen geschiedenis gevonden.</div>'; return; }
    var lijst = d.versies.slice().reverse().map(function(v) {
      var datum = v.uploaded_at ? new Date(v.uploaded_at).toLocaleString('nl-NL') : '';
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">'
        + '<span style="font-size:9px;font-weight:700;color:#fff;background:var(--teal);border-radius:8px;padding:1px 6px;flex-shrink:0">v'+(v.versie||1)+'</span>'
        + '<span style="font-size:12px;flex:1">'+(v.bewaard?'<a href="'+WORKER+'/mna/document/download/'+v.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" style="color:var(--teal)">'+esc(v.bestand_naam)+'</a>':esc(v.bestand_naam))+'</span>'
        + '<span style="font-size:10px;color:var(--muted)">'+esc(datum)+'</span>'
        + '</div>';
    }).join('');
    box.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.75rem">Versiegeschiedenis</div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:1rem">'+lijst+'</div><button id="versies-sluiten-btn" style="background:var(--teal);color:#fff;border:none;border-radius:var(--r);padding:6px 16px;cursor:pointer;font-size:12px">Sluiten</button>';
    var sluitBtn = box.querySelector('#versies-sluiten-btn');
    if (sluitBtn) sluitBtn.onclick = function() { ov.remove(); };
  } catch (e) {
    box.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.75rem">Versiegeschiedenis</div><div style="font-size:12px;color:var(--red)">Verbindingsfout bij laden.</div>';
  }
};

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
  if(t.bem_getekend)S.bemGetekend=t.bem_getekend;
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
  S={screen:'login',code:'',rol:'',traject:null,modules:null,fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,_opy:{},_epy:{},_opySlotJaar:{},_conflicts:[],_pendingConflicts:{}};
  renderApp();
}

// Groot getal leesbaar maken (3725150 -> 3.725.150); niet-numerieke waarden (bv. "besloten
// vennootschap") ongewijzigd laten.
function fmtConflictWaarde(v){
  var s=String(v==null?'':v).trim();
  if(/^-?\d+(\.\d+)?$/.test(s)){
    var neg=s[0]==='-';if(neg)s=s.slice(1);
    var delen=s.split('.');
    delen[0]=delen[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return (neg?'-':'')+delen.join(',');
  }
  return s;
}
// Neemt de conflicten-array expliciet als argument (niet opnieuw uit S._conflicts lezen) — bij
// meerdere gelijktijdige/snel opeenvolgende documenten liep die gedeelde state anders door elkaar
// tussen documenten. Is er al een dialoog open, dan wordt deze batch in de wachtrij gezet i.p.v.
// er nog een overlay overheen te stapelen (dat maakte het scherm zwart — meerdere halftransparante
// overlays op elkaar). Gevonden 22 juli 2026 na een test met veel documenten tegelijk.
function toonConflictDialog(conflicts, contextLabel) {
  if(!conflicts||!conflicts.length)return;
  if(S._conflictDialoogOpen){
    if(!S._conflictWachtrij)S._conflictWachtrij=[];
    S._conflictWachtrij.push({conflicts:conflicts,contextLabel:contextLabel});
    return;
  }
  S._conflictDialoogOpen=true;
  if(!S._choiceLog)S._choiceLog=[];
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var box=document.createElement('div');
  box.style.cssText='background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:560px;width:100%;max-height:85vh;overflow-y:auto';
  var title=document.createElement('div');title.style.cssText='font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.35rem';title.textContent='Afwijkende waarden gevonden';box.appendChild(title);
  // Onduidelijk welke entiteit/periode het betreft was zelf al een gemeld pijnpunt — de veld-labels
  // tonen al het jaartal (zie de dynamische omzetPerJaar-labels), maar de entiteit ontbrak volledig.
  if(contextLabel){
    var ctxEl=document.createElement('div');ctxEl.style.cssText='font-size:12px;font-weight:600;color:var(--teal);margin-bottom:.6rem';ctxEl.textContent=contextLabel;box.appendChild(ctxEl);
  }
  // Toon brondocumenten — als alle conflicten uit hetzelfde ene document komen (het gangbare
  // geval), dat maar één keer bovenaan noemen i.p.v. per veld en per optie te herhalen: dat maakte
  // de lijst vooral lang en moeilijk te scannen zonder extra informatie toe te voegen.
  var bronnen=[...new Set(conflicts.map(function(c){return c.bron||'onbekend';}))];
  var eenBron=bronnen.length===1;
  var sub=document.createElement('div');sub.style.cssText='font-size:12px;color:var(--mid);margin-bottom:1.25rem;padding:.6rem .75rem;background:var(--card);border-radius:var(--r);border-left:3px solid var(--gold)';
  sub.innerHTML='<strong>Bron:</strong> '+bronnen.map(function(b){return '<span style="font-family:IBM Plex Mono,monospace;font-size:11px">'+esc(b)+'</span>';}).join(', ')+'<br><span style="color:var(--muted)">Kies per veld welke waarde u wilt gebruiken. Uw keuze wordt vastgelegd.</span>';
  box.appendChild(sub);
  var list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:8px;margin-bottom:1.25rem';
  var radios=[];
  conflicts.forEach(function(c,i){
    var row=document.createElement('div');row.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px';
    var lbl=document.createElement('div');lbl.style.cssText='font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:var(--head);margin-bottom:4px';lbl.textContent=c.label;row.appendChild(lbl);
    // Als de twee waarden bij verschillende boekjaren horen: dat expliciet melden — dan is duidelijk
    // dat het geen tegenstrijdige lezing van hetzelfde cijfer is, maar twee jaren. Kies doorgaans het
    // meest recente jaar (Marcel, 25 juli 2026).
    if(c.huidigJaar&&c.nieuwJaar&&c.huidigJaar!==c.nieuwJaar){
      var jaarHint=document.createElement('div');jaarHint.style.cssText='font-size:10px;color:var(--gold-dark);margin-bottom:6px;line-height:1.5';
      jaarHint.innerHTML='&#8505; Deze waarden horen bij verschillende boekjaren ('+esc(c.huidigJaar)+' en '+esc(c.nieuwJaar)+'). Kies doorgaans het meest recente jaar.';
      row.appendChild(jaarHint);
    }
    // Brondocument per veld alleen tonen als het afwijkt van de ene bron die al bovenaan staat.
    if(c.bron&&!eenBron){var bronLbl=document.createElement('div');bronLbl.style.cssText='font-size:10px;color:var(--gold);margin-bottom:6px';bronLbl.innerHTML='&#128196; Uit: <em>'+esc(c.bron)+'</em>';row.appendChild(bronLbl);}
    var opts=document.createElement('div');opts.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    var lblH=document.createElement('label');
    var rH=document.createElement('input');rH.type='radio';rH.name='cf_'+i;rH.value='huidig';rH.checked=true;rH.style.accentColor='var(--teal)';lblH.appendChild(rH);
    var tH=document.createElement('span');tH.style.color='var(--mid)';
    var bronHuidig=S._docSource&&S._docSource[c.key]?'uit '+S._docSource[c.key]:'handmatig ingevoerd';
    var jaarHuidig=c.huidigJaar?'<div style="font-size:10px;font-weight:700;color:var(--gold-dark);margin-top:2px">Boekjaar '+esc(c.huidigJaar)+'</div>':'';
    tH.innerHTML='<div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:2px">Huidig</div><strong style="font-size:15px;color:var(--sub)">'+esc(fmtConflictWaarde(c.huidig))+'</strong>'+jaarHuidig+'<div style="font-size:10px;color:var(--muted);margin-top:2px">'+esc(bronHuidig)+'</div>';lblH.appendChild(tH);opts.appendChild(lblH);
    var lblN=document.createElement('label');
    var rN=document.createElement('input');rN.type='radio';rN.name='cf_'+i;rN.value='nieuw';rN.style.accentColor='var(--teal)';lblN.appendChild(rN);
    var jaarNieuw=c.nieuwJaar?'<div style="font-size:10px;font-weight:700;color:var(--gold-dark);margin-top:2px">Boekjaar '+esc(c.nieuwJaar)+'</div>':'';
    var tN=document.createElement('span');tN.style.color='var(--mid)';tN.innerHTML='<div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:2px">Uit document</div><strong style="font-size:15px;color:var(--sub)">'+esc(fmtConflictWaarde(c.nieuw))+'</strong>'+jaarNieuw+'<div style="font-size:10px;color:var(--muted);margin-top:2px">uit '+esc(c.bron||'document')+'</div>';lblN.appendChild(tN);opts.appendChild(lblN);
    // Visueel duidelijk maken welke optie daadwerkelijk gekozen is (voorheen kreeg "Document"
    // altijd een teal-accent, ook als "Huidig" geselecteerd was — dat oogde tegenstrijdig).
    var stijlBasis='flex:1;min-width:140px;display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;padding:7px 10px;border-radius:var(--r);border:1px solid ';
    // Derde optie: soms kloppen huidig én document allebei niet voor dit specifieke veld (bv. een
    // periodebalans met een ander boekjaar dan verwacht). Dan niets overschrijven, maar wel het
    // "⚠ afwijking"-label op het veld laten staan — dat is dan bewust nog onopgelost, geen
    // stilzwijgend "huidig was toch goed".
    var lblG=document.createElement('label');lblG.style.cssText='display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);cursor:pointer;margin-top:6px';
    var rG=document.createElement('input');rG.type='radio';rG.name='cf_'+i;rG.value='geen';rG.style.accentColor='var(--red)';lblG.appendChild(rG);
    lblG.appendChild(document.createTextNode('Geen van beide juist — veld blijft openstaan'));
    function updateOptieStijl(){
      lblH.style.cssText=stijlBasis+(rH.checked?'var(--teal-dark);background:var(--teal-bg)':'var(--border2);background:var(--panel)');
      lblN.style.cssText=stijlBasis+(rN.checked?'var(--teal-dark);background:var(--teal-bg)':'var(--border2);background:var(--panel)');
      lblG.style.color=rG.checked?'var(--red)':'var(--muted)';lblG.style.fontWeight=rG.checked?'600':'400';
    }
    rH.addEventListener('change',updateOptieStijl);rN.addEventListener('change',updateOptieStijl);rG.addEventListener('change',updateOptieStijl);updateOptieStijl();
    row.appendChild(opts);row.appendChild(lblG);list.appendChild(row);radios.push({key:c.key,rH:rH,rN:rN,rG:rG,conflict:c});
  });
  box.appendChild(list);
  var btns=document.createElement('div');btns.style.cssText='display:flex;gap:10px;justify-content:flex-end';
  var btnB=document.createElement('button');btnB.className='btn-ghost';btnB.style.fontSize='12px';btnB.textContent='Alles behouden';
  btnB.addEventListener('click',function(){
    conflicts.forEach(function(c){
      if(S._pendingConflicts)delete S._pendingConflicts[c.key];
      S._choiceLog.push({key:c.key,label:c.label,gekozen:'huidig',waarde:c.huidig,bron:'handmatig ingevoerd',ts:new Date().toLocaleString('nl-NL')});
    });
    document.body.removeChild(ov);renderApp();sluitConflictDialoogEnGaVerder();
  });btns.appendChild(btnB);
  var btnA=document.createElement('button');btnA.className='btn';btnA.style.fontSize='12px';btnA.textContent='Toepassen';
  btnA.addEventListener('click',function(){
    radios.forEach(function(r){
      var c=r.conflict;
      if(r.rG.checked){
        // Geen van beide juist: niets overschrijven, en het "⚠ afwijking"-label bewust laten
        // staan (pendingConflicts niet wissen) — dit veld is nog steeds onopgelost.
        S._choiceLog.push({key:c.key,label:c.label,gekozen:'geen',waarde:'',verworpen:c.huidig+' / '+c.nieuw,bron:c.bron||'onbekend',ts:new Date().toLocaleString('nl-NL')});
        return;
      }
      var gekozenHuidig=r.rH.checked;
      if(!gekozenHuidig)(c.doel||S.data)[r.key]=c.nieuw;
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
    document.body.removeChild(ov);renderApp();schedSave();sluitConflictDialoogEnGaVerder();
  });btns.appendChild(btnA);box.appendChild(btns);ov.appendChild(box);document.body.appendChild(ov);
}
// Na het sluiten van een conflict-dialoog: vlag vrijgeven en, als er ondertussen meer batches in de
// wachtrij zijn beland (van andere documenten), de eerstvolgende meteen tonen — nooit tegelijk.
function sluitConflictDialoogEnGaVerder(){
  S._conflictDialoogOpen=false;
  if(S._conflictWachtrij&&S._conflictWachtrij.length){
    var volgende=S._conflictWachtrij.shift();
    toonConflictDialog(volgende.conflicts,volgende.contextLabel);
  }
}


async function loadDataroom(){
  // Koper mocht hier niet in — dat was een te brede restrictie: het endpoint /mna/document/lijst
  // filtert al server-side op vrijgegeven categorieën (koperMagCategorie) en renderDataroom() heeft
  // al koper-veilige labels ("Bekijken" i.p.v. "Download", geen koppel-UI). Zonder toegang kon de
  // koper geen overzicht van (getekende) documenten zien (Marcel, 25 juli 2026).
  if(!S.code)return;
  S.dataroomLoading=true;renderApp();
  try{
    var resp=await fetch(WORKER+'/mna/document/lijst/'+S.code);
    var docs=await resp.json();
    S.dataroom=docs.map(function(d){var velden={};try{velden=d.veld_extractie?JSON.parse(d.veld_extractie):{};}catch(e){}return{id:d.id,naam:d.bestand_naam,type:d.bestand_type,grootte:d.bestand_grootte,fase_id:d.fase_id,bewaard:!!d.bewaard,uploaded_at:d.uploaded_at,entiteit_id:d.entiteit_id||'',velden:velden};});
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
        var toonKoppelen=!isKoper()&&S._entiteiten&&S._entiteiten.length;
        var gokId=(toonKoppelen&&!doc.entiteit_id)?gokEntiteitId((doc.velden||{}).entiteit_naam):'';
        var geselecteerd=doc.entiteit_id||gokId;
        var behoeftKoppeling=toonKoppelen&&!doc.entiteit_id&&(doc.velden||{}).entiteit_naam&&!gokEntiteitId((doc.velden||{}).entiteit_naam,true);
        var groepsniveauBadge=(toonKoppelen&&!doc.entiteit_id)
          ?(behoeftKoppeling
            ?' <span style="font-size:10px;font-weight:700;color:#fff;background:var(--red);border-radius:8px;padding:2px 8px;margin-left:4px">&#9888; Handmatig koppelen</span>'
            :' <span style="font-size:10px;font-weight:600;color:var(--muted);background:var(--panel);border-radius:8px;padding:2px 8px;margin-left:4px">Groepsniveau</span>')
          :'';
        html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
          +'<span style="font-size:18px">'+icon+'</span>'
          +'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--head)">'+esc(doc.naam)+(entNaam?' <span style="font-size:10px;font-weight:600;color:var(--teal);background:var(--teal-bg);border-radius:8px;padding:2px 8px;margin-left:4px">'+esc(entNaam)+'</span>':groepsniveauBadge)+'</div>'
          +'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+gr+(st?' &middot; Geupload: '+st:'')+'</div>'
          +(toonKoppelen?'<div style="margin-top:6px;display:flex;gap:6px;align-items:center">'
            +'<select id="dr-ent-'+doc.id+'" style="font-size:11px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:4px 6px"><option value="">'+(doc.entiteit_id?'— Groepsniveau (ontkoppelen) —':'— Koppel aan entiteit —')+'</option>'
            +S._entiteiten.map(function(e){return '<option value="'+esc(e.id)+'"'+(e.id===geselecteerd?' selected':'')+'>'+esc(e.naam)+(e.id===gokId&&!doc.entiteit_id?' (AI-suggestie)':'')+'</option>';}).join('')
            +'</select>'
            +'<button class="btn-ghost btn-sm" style="font-size:11px" onclick="koppelDocumentAanEntiteit(\''+doc.id+'\')">&#128279; '+(doc.entiteit_id?'Wijzigen':'Koppelen')+'</button>'
            +'</div>':'')
          +'</div>'
          +'<a href="'+WORKER+'/mna/document/download/'+doc.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost btn-sm" style="font-size:11px;text-decoration:none" onclick="secAuditLog(\'document_bekeken\',{doc_naam:\''+doc.naam.replace(/'/g,'')+'\'})">&#8681; '+(isKoper()?'Bekijken':'Download')+'</a>'
          +'</div>';
      });
      html+='</div>';
    });
  }
  html+='</div>';return html;
}

// Koppelt een op groepsniveau geüpload document alsnog aan een entiteit — en herverwerkt de al
// opgeslagen veld_extractie naar de entiteit-eigen dataopslag (geen nieuwe AI-call). De worker
// consolideert daarna automatisch de groepstotalen o.b.v. alle entiteiten (consolideerFase()).
// Ook bruikbaar om een bestaande koppeling te wijzigen of terug te zetten op groepsniveau (leeg
// gekozen) — de dropdown blijft daarom altijd zichtbaar, ook als er al een entiteit gekozen is.
window.koppelDocumentAanEntiteit = async function(docId, selectPrefix){
  var sel=document.getElementById((selectPrefix||'dr-ent-')+docId);
  var entiteitId=sel?sel.value:'';
  var doc=(S.dataroom||[]).find(function(d){return d.id===docId;});
  if(!doc){
    Object.keys(DOCS||{}).some(function(fid){
      var found=(DOCS[fid]||[]).find(function(d){return d.id===docId;});
      if(found){doc=found;return true;}
      return false;
    });
  }
  if(!doc)return;
  var vorigeEntiteitId=doc.entiteit_id||'';
  if(!entiteitId&&!vorigeEntiteitId){toast('Kies eerst een entiteit.','warn');return;}
  if(vorigeEntiteitId&&entiteitId!==vorigeEntiteitId){
    var boodschap=entiteitId
      ? 'Dit document was al gekoppeld aan '+entiteitNaam(vorigeEntiteitId)+'. De cijfers die het daar eerder invulde worden NIET automatisch teruggehaald — controleer dat handmatig bij '+entiteitNaam(vorigeEntiteitId)+' als die koppeling onterecht was.\n\nDoorgaan met koppelen aan '+entiteitNaam(entiteitId)+'?'
      : 'Dit document was gekoppeld aan '+entiteitNaam(vorigeEntiteitId)+'. Ontkoppelen zet het terug op groepsniveau, maar de cijfers die het daar eerder invulde worden NIET automatisch gewist — controleer dat handmatig.\n\nDoorgaan met ontkoppelen?';
    if(!confirm(boodschap))return;
  }
  var r=await fetch(WORKER+'/mna/document/koppel-entiteit/'+docId,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S.code},body:JSON.stringify({entiteit_id:entiteitId})}).then(function(x){return x.json();}).catch(function(){return{};});
  if(!r.ok){toast('Koppelen mislukt: '+(r.error||'onbekend'),'err');return;}
  doc.entiteit_id=entiteitId;
  if(!entiteitId){
    renderApp();
    toast('Ontkoppeld — document staat weer op groepsniveau.','ok');
    return;
  }
  if(doc.velden&&Object.keys(doc.velden).length){
    S._conflicts=[];
    var alleFases=['financieel','commercieel','partner','compliance','it','juridisch','strategisch'];
    alleFases.forEach(function(fid){ autoFillFromExtraction(fid, doc.velden, false, doc.naam, entiteitId); });
    if(S._conflicts&&S._conflicts.length){
      var ctxLbl=entiteitId?('Voor: '+entiteitNaam(entiteitId)):'Voor: Groep (geconsolideerd)';
      var conflictenBatch=S._conflicts.slice();S._conflicts=[];
      renderApp();setTimeout(function(){toonConflictDialog(conflictenBatch,ctxLbl);},300);
    }else{
      renderApp();saveEntiteitData(entiteitId,alleFases);
      toast('Gekoppeld aan '+entiteitNaam(entiteitId)+' — cijfers herverwerkt.','ok');
    }
  }else{
    renderApp();
    toast('Gekoppeld aan '+entiteitNaam(entiteitId)+' (geen cijfers om te herverwerken).','ok');
  }
};
