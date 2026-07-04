document.title = 'M&A Begeleiding - ' + BRAND.platform;

// Sectorprofielen uit de database laden — overschrijft de hardgecodeerde defaults hierboven.
// Faalt de fetch (offline/error), dan blijven de hardgecodeerde profielen gelden (fallback).
(function laadSectorProfielen(){
  fetch(WORKER + '/mna/sectorprofielen').then(function(r){ return r.json(); }).then(function(d){
    if (!d || !d.ok || !d.profielen || !Object.keys(d.profielen).length) return;
    Object.keys(d.profielen).forEach(function(k){ SECTOR_PROFIELEN[k] = d.profielen[k]; });
    FASES = getSectorFases();
    // Al voorbij het loginscherm? Herteken zodat de nieuwste velden/labels meteen kloppen.
    if (S && S.screen && S.screen !== 'login') { try { renderApp(); } catch(e){} }
  }).catch(function(){ /* offline-fallback: hardgecodeerde profielen blijven gelden */ });
})();

renderApp();

// ============================================================
// CHAT SYSTEEM
// ============================================================
var CHAT = {
  open: false,
  berichten: [],
  serverBerichten: [],
  laden: false,
  sturen: false,
  unread: 0
};

function chatContextBeschrijving() {
  var ctx = 'Traject: ' + (S.traject && S.traject.kantoor_naam || S.code);
  ctx += ' | Rol: ' + (isVerkoper() ? 'verkoper' : isTussen() ? 'begeleider' : 'koper');
  if (S.screen === 'main') {
    var f = FASES[S.fase];
    if (f) {
      ctx += ' | Fase: ' + f.num + '. ' + f.title;
      var leeg = f.dataFields.filter(function(df) { return df.req && !df.header && !(S.data[f.id+'_'+df.id]||'').trim(); });
      if (leeg.length) ctx += ' | Nog leeg: ' + leeg.map(function(df){return df.label;}).join(', ');
      var gevuld = f.dataFields.filter(function(df) { return !df.header && (S.data[f.id+'_'+df.id]||'').trim(); });
      if (gevuld.length) ctx += ' | Ingevuld: ' + gevuld.map(function(df){return df.label+'='+S.data[f.id+'_'+df.id];}).join(', ');
    }
  }
  ctx += ' | Totaal: ' + totalFillPct() + '%';
  return ctx;
}

async function chatLaadBerichten() {
  if (!S.code) return;
  try {
    var resp = await fetch(WORKER + '/mna/chat/' + S.code);
    if (!resp.ok) return;
    var d = await resp.json();
    if (d.berichten) {
      CHAT.serverBerichten = d.berichten;
      var nieuweUnread = 0;
      d.berichten.forEach(function(b) {
        if (isVerkoper() && b.auteur === 'begeleider' && !b.gelezen) nieuweUnread++;
        if (isTussen() && b.auteur === 'verkoper' && !b.gelezen) nieuweUnread++;
      });
      if (!CHAT.open && nieuweUnread > CHAT.unread) {
        CHAT.unread = nieuweUnread;
        chatUpdateBadge();
      }
    }
  } catch(e) {}
}

async function chatVerstuur(tekst) {
  if (!tekst.trim() || CHAT.sturen) return;
  CHAT.sturen = true;
  var auteur = isVerkoper() ? 'verkoper' : isTussen() ? 'begeleider' : 'koper';
  var naamLabel = isVerkoper() ? (S.traject && S.traject.contact_naam || 'Verkoper') : isTussen() ? (S.traject && S.traject.begeleider_naam || 'Begeleider') : 'Koper';
  var userMsg = { auteur: auteur, naam: naamLabel, tekst: tekst, ts: Date.now(), lokaal: true };
  CHAT.berichten.push(userMsg);
  chatRenderBerichten();
  try {
    await fetch(WORKER + '/mna/chat/' + S.code, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auteur: auteur, naam: naamLabel, tekst: tekst })
    });
  } catch(e) {}
  if (isVerkoper()) {
    CHAT.berichten.push({ auteur: 'ai', naam: BRAND.platform + ' AI', tekst: '...', ts: Date.now(), typing: true });
    chatRenderBerichten();
    var sp2=getSectorProfiel();var systeemPrompt = 'Je bent een vriendelijke assistent voor een M&A due diligence platform. Sector: '+(sp2.label||'MKB')+'. Je helpt de eigenaar/verkoper bij het invullen van het due diligence formulier. Sectorgemiddelden: '+(sp2.aiNormen||'')+'. Geef korte, praktische antwoorden in het Nederlands. CONTEXT: ' + chatContextBeschrijving();
    var msgs = [];
    var allB = CHAT.serverBerichten.concat(CHAT.berichten.filter(function(b){return b.lokaal&&!b.typing;}));
    allB.slice(-8).forEach(function(b) {
      if (b.auteur === 'verkoper') msgs.push({ role: 'user', content: b.tekst });
      else if (b.auteur === 'ai') msgs.push({ role: 'assistant', content: b.tekst });
    });
    try {
      var resp = await fetch(WORKER + '/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systeemPrompt, messages: msgs, max_tokens: 400 })
      });
      var rd = await resp.json();
      var antwoord = rd.text || 'Sorry, er ging iets mis.';
      CHAT.berichten = CHAT.berichten.filter(function(b){ return !b.typing; });
      var aiMsg = { auteur: 'ai', naam: BRAND.platform + ' AI', tekst: antwoord, ts: Date.now(), lokaal: true };
      CHAT.berichten.push(aiMsg);
      fetch(WORKER + '/mna/chat/' + S.code, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auteur: 'ai', naam: BRAND.platform + ' AI', tekst: antwoord })
      }).catch(function(){});
    } catch(e) {
      CHAT.berichten = CHAT.berichten.filter(function(b){ return !b.typing; });
      CHAT.berichten.push({ auteur: 'ai', naam: BRAND.platform + ' AI', tekst: 'Verbindingsfout. Probeer opnieuw.', ts: Date.now() });
    }
    chatRenderBerichten();
  }
  CHAT.sturen = false;
}

function chatRenderBerichten() {
  var lijst = document.getElementById('chat-berichten');
  if (!lijst) return;
  var alleBerichten = CHAT.serverBerichten.concat(CHAT.berichten.filter(function(b){return b.lokaal;}));
  var gezien = {};
  alleBerichten = alleBerichten.filter(function(b){
    var k = b.auteur + '|' + b.tekst + '|' + (b.ts||'');
    if (gezien[k]) return false; gezien[k] = true; return true;
  });
  alleBerichten.sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
  if (!alleBerichten.length) {
    lijst.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:2rem 1rem">' + (isVerkoper() ? '\uD83D\uDC4B Hallo! Ik help u graag bij het invullen. Stel gerust een vraag.' : 'Nog geen berichten.') + '</div>';
    return;
  }
  lijst.innerHTML = alleBerichten.map(function(b) {
    var isEigen = (isVerkoper() && b.auteur === 'verkoper') || (isTussen() && b.auteur === 'begeleider');
    var isAI = b.auteur === 'ai';
    var isBeg = b.auteur === 'begeleider';
    var dt = b.ts ? new Date(b.ts).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}) : '';
    var bg = isEigen ? 'var(--teal)' : isAI ? 'var(--card)' : isBeg ? '#f3f0ff' : 'var(--card)';
    var kleur = isEigen ? '#fff' : 'var(--sub)';
    var align = isEigen ? 'flex-end' : 'flex-start';
    var border = isAI ? '1px solid var(--border)' : isBeg ? '1px solid #c8b8f0' : 'none';
    var naamKleur = isAI ? 'var(--teal)' : isBeg ? '#7c5cbf' : 'var(--muted)';
    var naamHtml = isEigen ? '' : '<div style="font-size:10px;font-weight:600;color:'+naamKleur+';margin-bottom:3px">' + (b.naam||b.auteur) + '</div>';
    var radius = isEigen ? '12px 12px 2px 12px' : '12px 12px 12px 2px';
    if (b.typing) return '<div style="display:flex;justify-content:flex-start;margin-bottom:8px"><div style="background:var(--card);border:1px solid var(--border);border-radius:'+radius+';padding:8px 14px;max-width:80%">'+naamHtml+'<div style="display:flex;gap:4px;align-items:center;height:18px"><div style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:chatdot .8s infinite 0s"></div><div style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:chatdot .8s infinite .2s"></div><div style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:chatdot .8s infinite .4s"></div></div></div></div>';
    var tekstHtml = String(b.tekst||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    return '<div style="display:flex;justify-content:'+align+';margin-bottom:8px"><div style="background:'+bg+';border:'+border+';border-radius:'+radius+';padding:8px 12px;max-width:82%;word-break:break-word">'+naamHtml+'<div style="font-size:13px;color:'+kleur+';line-height:1.55">'+tekstHtml+'</div>'+(dt?'<div style="font-size:10px;color:'+(isEigen?'rgba(255,255,255,.6)':'var(--muted)')+';margin-top:3px;text-align:right">'+dt+'</div>':'')+'</div></div>';
  }).join('');
  lijst.scrollTop = lijst.scrollHeight;
}

function chatUpdateBadge() {
  var badge = document.getElementById('chat-badge');
  if (!badge) return;
  if (CHAT.unread > 0) { badge.style.display = 'flex'; badge.textContent = CHAT.unread > 9 ? '9+' : String(CHAT.unread); }
  else badge.style.display = 'none';
}

function chatOpen() {
  CHAT.open = true; CHAT.unread = 0; chatUpdateBadge();
  var v = document.getElementById('chat-venster'); if (v) v.style.display = 'flex';
  var f = document.getElementById('chat-fab'); if (f) f.style.display = 'none';
  chatLaadBerichten().then(function(){ chatRenderBerichten(); });
  setTimeout(function(){ var inp = document.getElementById('chat-input'); if (inp) inp.focus(); }, 100);
}

function chatSluit() {
  CHAT.open = false;
  var v = document.getElementById('chat-venster'); if (v) v.style.display = 'none';
  var f = document.getElementById('chat-fab'); if (f) f.style.display = 'flex';
}

window.chatStuurVanInput = function() {
  var inp = document.getElementById('chat-input'); if (!inp) return;
  var tekst = inp.value.trim(); if (!tekst) return;
  inp.value = ''; inp.style.height = 'auto';
  chatVerstuur(tekst);
};

function chatInit() {
  var oud = document.getElementById('chat-container'); if (oud) oud.remove();
  if (!S.code || S.screen === 'login') return;
  if (!document.getElementById('chat-style')) {
    var st = document.createElement('style'); st.id = 'chat-style';
    st.textContent = '@keyframes chatdot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}';
    document.head.appendChild(st);
  }
  var headerTitel = isVerkoper() ? '&#128172; Assistent & Begeleider' : isTussen() ? '&#128172; Chat met verkoper' : '&#128172; Chat';
  var placeholder = isVerkoper() ? 'Stel een vraag...' : 'Stuur een bericht...';
  var container = document.createElement('div'); container.id = 'chat-container';
  container.innerHTML =
    '<div id="chat-fab" style="position:fixed;bottom:24px;right:24px;z-index:500;display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:var(--teal);box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer" onclick="chatOpen()">'
    +'<span style="font-size:22px">&#128172;</span>'
    +'<div id="chat-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:var(--red);color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;align-items:center;justify-content:center;border:2px solid #fff"></div>'
    +'</div>'
    +'<div id="chat-venster" style="display:none;position:fixed;bottom:24px;right:24px;z-index:500;width:360px;height:500px;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);box-shadow:0 8px 32px rgba(0,0,0,.18);flex-direction:column;overflow:hidden">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--teal);color:#fff">'
    +'<div style="font-size:13px;font-weight:600">'+headerTitel+'</div>'
    +'<button onclick="chatSluit()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;line-height:1">&times;</button>'
    +'</div>'
    +'<div id="chat-berichten" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column"></div>'
    +'<div style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:flex-end">'
    +'<textarea id="chat-input" placeholder="'+placeholder+'" rows="1" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px;color:var(--sub);outline:none;resize:none;max-height:80px;line-height:1.5"></textarea>'
    +'<button onclick="chatStuurVanInput()" style="background:var(--teal);border:none;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:16px;flex-shrink:0">&#8593;</button>'
    +'</div></div>';
  document.body.appendChild(container);
  var inp = document.getElementById('chat-input');
  if (inp) {
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();chatStuurVanInput();} });
    inp.addEventListener('input', function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,80)+'px'; });
  }
  chatLaadBerichten().then(function(){ if (CHAT.open) chatRenderBerichten(); else chatUpdateBadge(); });
  if (isVerkoper()) {
    clearInterval(window._chatPollInterval);
    window._chatPollInterval = setInterval(function(){
      if (S.code && S.screen !== 'login') chatLaadBerichten().then(function(){
        if (CHAT.open) chatRenderBerichten(); else chatUpdateBadge();
      });
    }, 15000);
  }
}

// Wrap renderApp zodat chat altijd herinitialiseerd wordt
var _origRenderApp = renderApp;
renderApp = function() { _origRenderApp(); chatInit(); };

