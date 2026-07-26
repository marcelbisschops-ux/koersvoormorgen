var VOK_VERSIE = '1.3';
var VOK_TEKST = 'VERWERKERSOVEREENKOMST\n' + BRAND.bedrijf + ' — ' + BRAND.platform + ' Platform\nVersie 1.3 | Juli 2026\n\nPartijen\nVerwerkingsverantwoordelijke: De tussenpersoon/adviseur die gebruik maakt van het ' + BRAND.platform + '-platform.\nVerwerker: ' + BRAND.bedrijf + ', ' + BRAND.adres + '.\n\nArtikel 1 — Doel en grondslag\n' + BRAND.kort + ' verwerkt persoonsgegevens uitsluitend ten behoeve van de dienstverlening via het ' + BRAND.platform + '-platform. Gebruiker blijft te allen tijde verwerkingsverantwoordelijke voor de gegevens van zijn klanten.\n\nArtikel 2 — Aard van de verwerking\n' + BRAND.kort + ' verwerkt uitsluitend de persoonsgegevens die door of namens Gebruiker worden ingevoerd. Dit omvat: contactgegevens, financiële bedrijfsdata, documenten en communicatie in het kader van M&A-trajecten.\n\nArtikel 3 — Verwerking met behulp van AI\nHet platform maakt gebruik van AI-taalmodellen (Anthropic Claude) om geüploade documenten te analyseren, gegevens daaruit te extraheren naar het due diligence-dossier, en concept-rapportages en -documenten te genereren. Hiertoe worden de inhoud van geüploade documenten en ingevoerde gegevens voorgelegd aan de AI-dienst van Anthropic PBC. Deze verwerking vindt plaats ten behoeve van automatisering van het due diligence-proces en vindt uitsluitend plaats binnen de context van het specifieke traject waarvoor de gegevens zijn aangeleverd. Gegevens worden niet gebruikt om AI-modellen te trainen.\n\nArtikel 4 — Beveiliging\n' + BRAND.kort + ' treft passende technische en organisatorische maatregelen. Gegevens worden opgeslagen in Cloudflare-datacenters binnen de EU (Frankfurt). Verbindingen zijn versleuteld via HTTPS.\n\nArtikel 5 — Bewaartermijn\nGeüploade documenten worden gedurende het traject en gedurende veertien (14) dagen na afsluiting van het traject bewaard en beschikbaar gehouden voor download; daarna worden zij definitief van het platform verwijderd. Gebruiker (de adviseur) is na download zelf verantwoordelijk voor archivering van deze documenten conform de op hem rustende wettelijke bewaarplichten (waaronder de fiscale bewaarplicht van doorgaans 7 jaar). Beperkte trajectmetadata (zoals trajectnaam, datum en betrokken partijen) kan langer worden bewaard ten behoeve van administratie en geschillenbeslechting.\n\nArtikel 6 — Sub-verwerkers en doorgifte buiten de EU\nCloudflare Inc. (infrastructuur, EU), Anthropic PBC (AI-verwerking van documenten en gegevens, Verenigde Staten), Resend Inc. (e-mail), Signhost/Entrust (handtekeningen). Voor zover persoonsgegevens worden doorgegeven aan Anthropic PBC in de Verenigde Staten, gebeurt dit op basis van de EU Standard Contractual Clauses (modelcontractbepalingen) tussen ' + BRAND.bedrijf + ' en Anthropic PBC, ter waarborging van een passend beschermingsniveau conform de AVG.\n\nArtikel 7 — Rechten betrokkenen\nGebruiker is verantwoordelijk voor het faciliteren van de rechten van betrokkenen. ' + BRAND.kort + ' verleent hiertoe medewerking op verzoek.\n\nArtikel 8 — Datalekken\n' + BRAND.kort + ' informeert Gebruiker zonder onredelijke vertraging na ontdekking van een datalek.\n\nArtikel 9 — Toepasselijk recht\nNederlands recht. Geschillen: Rechtbank Oost-Brabant.\n\nArtikel 10 — Geaggregeerde verwerking\n' + BRAND.kort + ' mag geanonimiseerde en geaggregeerde gegevens — niet herleidbaar tot een individueel traject, Gebruiker of diens klant — verzamelen en verwerken ten behoeve van sectorbenchmarks en marktinzichten. Deze inzichten kunnen (mede) beschikbaar worden gesteld aan gebruikers van het platform.\n\nArtikel 11 — Toegangsbeperking beheerder\n' + BRAND.kort + ' heeft via het beheerscherm van het platform geen toegang tot prijsgevoelige gegevens van trajecten van Gebruikers die niet zelf klant zijn van ' + BRAND.kort + ' — waaronder in ieder geval: dealprijzen en -voorstellen, financiële due-diligence-cijfers, gegenereerde en geüploade documenten, gespreksverslagen, vragen en antwoorden, en identificerende gegevens van de betrokken partijen. Deze beperking is technisch afgedwongen in de software.\nToegang tot deze gegevens door ' + BRAND.kort + ' is uitsluitend mogelijk (a) op uitdrukkelijk verzoek van Gebruiker, bijvoorbeeld voor technische ondersteuning, of (b) in het kader van regulier technisch infrastructuurbeheer (waaronder back-ups), in welk geval de gegevens niet worden geraadpleegd, geanalyseerd of voor enig ander doel gebruikt.';

async function checkVOK(code) {
  try {
    var r = await fetch(WORKER + '/mna/vok/status?code=' + encodeURIComponent(code));
    var d = await r.json();
    return d;
  } catch(e) { return { getekend: false }; }
}

function toonVOKPopup(code, onAkkoord) {
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo = document.createElement('div');
  mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','vok-modal-titel');
  mo.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:2rem;max-width:600px;width:100%;max-height:90vh;overflow-y:auto';
  mo.innerHTML = '<div id="vok-modal-titel" style="font-family:Playfair Display,serif;font-size:1.2rem;color:var(--head);font-weight:600;margin-bottom:.4rem">Verwerkersovereenkomst</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:1rem">Versie ' + VOK_VERSIE + ' · ' + BRAND.bedrijf + ' · Vereist voor gebruik van ' + BRAND.platform + '</div>'
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1rem;max-height:260px;overflow-y:auto;font-size:12px;line-height:1.8;color:var(--sub);white-space:pre-wrap;margin-bottom:1rem">' + esc(VOK_TEKST) + '</div>'
    + '<div style="background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--teal-dim);line-height:1.6">'
    + 'Door uw naam in te vullen en op Akkoord te klikken bevestigt u dat u deze verwerkersovereenkomst heeft gelezen en accepteert.'
    + '</div>'
    + '<div style="margin-bottom:.75rem"><label style="font-size:11px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px">Uw volledige naam</label>'
    + '<input type="text" id="vok-naam" placeholder="Voor- en achternaam" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;font-family:IBM Plex Sans,sans-serif;color:var(--sub);outline:none"></div>'
    + '<div style="margin-bottom:.75rem"><label style="font-size:11px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px">Uw e-mailadres <span style="font-weight:400">(voor bevestiging)</span></label>'
    + '<input type="email" id="vok-email" placeholder="E-mailadres" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;font-family:IBM Plex Sans,sans-serif;color:var(--sub);outline:none"></div>'
    + '<div id="vok-err" style="display:none;color:var(--red);font-size:12px;margin-bottom:.5rem"></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button id="vok-dl" class="btn-ghost" style="font-size:12px;padding:7px 14px">&#128196; Download</button>'
    + '<button id="vok-ok" class="btn" style="font-size:12px;padding:7px 18px">&#10003; Akkoord &amp; doorgaan</button>'
    + '</div>';
  ov.appendChild(mo);
  document.body.appendChild(ov);
  document.getElementById('vok-dl').onclick = function() {
    var blob = new Blob([VOK_TEKST], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'VOK_' + BRAND.platform + '_v1.0.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  document.getElementById('vok-ok').onclick = async function() {
    var btn = this; btn.disabled = true; btn.textContent = 'Opslaan...';
    var naam = document.getElementById('vok-naam').value.trim();
    var errEl = document.getElementById('vok-err');
    if (!naam) { errEl.style.display='block'; errEl.textContent='Naam is verplicht.'; btn.disabled=false; btn.textContent='Akkoord & doorgaan'; return; }
    try {
      var r = await fetch(WORKER + '/mna/vok/teken', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code:code, naam:naam, versie:VOK_VERSIE, email:(document.getElementById('vok-email')?document.getElementById('vok-email').value.trim():'') }) });
      var d = await r.json();
      if (d.ok) { document.body.removeChild(ov); onAkkoord(); }
      else { errEl.style.display='block'; errEl.textContent=d.error||'Fout.'; btn.disabled=false; btn.textContent='Akkoord & doorgaan'; }
    } catch(e) { errEl.style.display='block'; errEl.textContent='Verbindingsfout.'; btn.disabled=false; btn.textContent='Akkoord & doorgaan'; }
  };
}

function toonNieuwTrajectModalTussen(){
  var adj=['Amber','Blauw','Groen','Zilver','Goud','Wit','Robijn','Kobalt','Mist','Storm','Saffier','Koraal'];
  var zn=['Eik','Beuk','Rots','Rivier','Berg','Dal','Ster','Maan','Bron','Haven','Veld','Kust'];
  function nieuweCode(){return adj[Math.floor(Math.random()*adj.length)]+'-'+zn[Math.floor(Math.random()*zn.length)];}
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','nieuwtraject-modal-titel');mo.style.cssText='background:var(--panel,#fff);border:1px solid #c8c5bc;border-radius:10px;padding:1.75rem;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto;max-width:500px';
  mo.innerHTML='<div id="nieuwtraject-modal-titel" class="modal-title">&#43; Nieuw traject — privacy-eerste</div>'
    +'<div style="background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1.25rem;font-size:12px;color:var(--teal-dim);line-height:1.7">'
    +'Gebruik een codenaam. Geen persoonsgegevens nodig — de verkoper vult zijn eigen gegevens in na inloggen.'
    +'</div>'
    +'<div style="margin-bottom:.75rem"><label style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Codenaam <span style="color:var(--red)">*</span></label>'
    +'<div style="display:flex;gap:6px"><input type="text" id="nt-naam" value="'+nieuweCode()+'" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;font-family:IBM Plex Mono,monospace;color:var(--sub);outline:none">'
    +'<button type="button" id="nt-shuffle" class="btn-ghost" style="font-size:12px;padding:6px 10px">&#8635;</button></div></div>'
    +'<div style="margin-bottom:.75rem"><label style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Trajecttype</label>'
    +'<select id="nt-type" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;font-family:IBM Plex Sans,sans-serif;color:var(--sub)">'
    +'<option value="Verkoop">Verkoop</option><option value="PE-traject">PE-traject</option>'
    +'<option value="Overname">Overname</option><option value="Fusie">Fusie</option><option value="Opvolging">Opvolging</option>'
    +'</select></div>'
    +'<div style="border-top:1px solid var(--border);margin:.75rem 0;padding-top:.75rem;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.6rem">Optioneel — codes direct versturen</div>'
    +'<div style="margin-bottom:.75rem"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">E-mail verkoper</label>'
    +'<input type="email" id="nt-email" placeholder="Wordt alleen gebruikt voor directe verzending" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:8px 12px;font-size:13px;font-family:IBM Plex Sans,sans-serif;color:var(--sub);outline:none"></div>'
    +'<div id="nt-err" style="display:none;color:var(--red);font-size:12px;margin-bottom:.5rem"></div>'
    +'<div id="nt-res" style="display:none;background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);padding:1.25rem;margin-bottom:.75rem"></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button class="btn-ghost" id="nt-ann">Annuleren</button>'
    +'<button class="btn" id="nt-ok">Codes aanmaken</button></div>';
  ov.appendChild(mo);document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  document.getElementById('nt-ann').onclick=function(){document.body.removeChild(ov);};
  document.getElementById('nt-shuffle').onclick=function(){document.getElementById('nt-naam').value=nieuweCode();};
  document.getElementById('nt-ok').onclick=async function(){
    var btn=this;btn.disabled=true;btn.textContent='Aanmaken...';
    var err=document.getElementById('nt-err');err.style.display='none';
    var codenaam=document.getElementById('nt-naam').value.trim();
    if(!codenaam){err.style.display='block';err.textContent='Codenaam is verplicht.';btn.disabled=false;btn.textContent='Codes aanmaken';return;}
    try{
      var r=await fetch(WORKER+'/mna/create',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kantoor_naam:codenaam,traject_type:document.getElementById('nt-type').value,
          contact_naam:'',contact_email:'',koper_naam:'',koper_email:'',
          begeleider_naam:S.traject&&S.traject.begeleider_naam||'',
          begeleider_email:S.traject&&S.traject.begeleider_email||'',
          tussen_code_vast:S.code})});
      var d=await r.json();
      if(d.ok){
        var res=document.getElementById('nt-res');res.style.display='block';
        res.innerHTML='<div style="font-size:11px;font-weight:600;color:var(--teal);margin-bottom:.6rem">&#10003; Aangemaakt — '+esc(codenaam)+'</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:.6rem">'
          +'<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:.6rem .875rem">'
          +'<div style="font-size:10px;color:var(--muted);margin-bottom:2px">Verkoperscode</div>'
          +'<div style="font-family:IBM Plex Mono,monospace;font-size:1.1rem;font-weight:600;color:var(--teal)">'+d.code+'</div></div>'
          +'<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:.6rem .875rem">'
          +'<div style="font-size:10px;color:var(--muted);margin-bottom:2px">Koperscode</div>'
          +'<div style="font-family:IBM Plex Mono,monospace;font-size:1.1rem;font-weight:600;color:var(--gold)">'+d.koper_code+'</div></div>'
          +'</div>'
          +'<div style="font-size:11px;color:var(--muted)">Inloggen op: koersvoormorgen.nl/mna.html &nbsp;|&nbsp; Beheer via je eigen code <strong>'+S.code+'</strong></div>';
        btn.textContent='Klaar';
        toast('Traject aangemaakt: '+codenaam,'ok');
      } else { err.style.display='block';err.textContent=d.error||'Fout';btn.disabled=false;btn.textContent='Codes aanmaken'; }
    }catch(e2){err.style.display='block';err.textContent='Verbindingsfout';btn.disabled=false;btn.textContent='Codes aanmaken';}
  };
}


function toonUitnodigingModalTussen() {
  var t = S.traject || {};
  var ov = document.createElement('div'); ov.className = 'overlay';
  var mo = document.createElement('div'); mo.className = 'modal'; mo.style.maxWidth = '500px';
  mo.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.2rem;color:var(--head);font-weight:600;margin-bottom:.4rem">&#9993; Uitnodigingsmail versturen</div>'
    + '<p style="font-size:13px;color:var(--mid);margin-bottom:1.25rem;line-height:1.6">Stuur een professionele mail met platforminfo, toegangscode en stappenplan.</p>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.25rem">'
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:.875rem">'
    + '<div style="font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Verkoper</div>'
    + '<div style="font-family:IBM Plex Mono,monospace;font-size:.9rem;font-weight:700;color:var(--teal);margin-bottom:.6rem">'+esc(t.id||'')+'</div>'
    + '<input type="email" id="inv-vt-email" value="'+esc(t.contact_email||'')+'" placeholder="E-mail verkoper" style="width:100%;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:7px 10px;font-size:12px;font-family:IBM Plex Sans,sans-serif;color:var(--sub);outline:none;margin-bottom:.5rem">'
    + '<button id="inv-vt-btn" class="btn" style="width:100%;font-size:12px;padding:6px;background:var(--teal)">&#9993; Verstuur</button>'
    + '<div id="inv-vt-st" style="font-size:11px;margin-top:.3rem;min-height:14px"></div>'
    + '</div>'
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:.875rem">'
    + '<div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Koper</div>'
    + '<div style="font-family:IBM Plex Mono,monospace;font-size:.9rem;font-weight:700;color:var(--gold);margin-bottom:.6rem">'+esc(t.koper_code||'—')+'</div>'
    + '<input type="email" id="inv-kt-email" value="'+esc(t.koper_email||'')+'" placeholder="E-mail koper" style="width:100%;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:7px 10px;font-size:12px;font-family:IBM Plex Sans,sans-serif;color:var(--sub);outline:none;margin-bottom:.5rem">'
    + '<button id="inv-kt-btn" class="btn" style="width:100%;font-size:12px;padding:6px;background:var(--gold)">&#9993; Verstuur</button>'
    + '<div id="inv-kt-st" style="font-size:11px;margin-top:.3rem;min-height:14px"></div>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;justify-content:flex-end"><button class="btn-ghost" id="inv-t-sluit">Sluiten</button></div>';
  ov.appendChild(mo); document.body.appendChild(ov);
  ov.addEventListener('click', function(e){if(e.target===ov)document.body.removeChild(ov);});
  document.getElementById('inv-t-sluit').onclick = function(){document.body.removeChild(ov);};

  async function stuurTussen(type) {
    var emailEl = document.getElementById('inv-'+type+'t-email');
    var stEl = document.getElementById('inv-'+type+'t-st');
    var btnEl = document.getElementById('inv-'+type+'t-btn');
    var email = emailEl.value.trim();
    if (!email) { stEl.innerHTML='<span style="color:var(--red)">E-mail verplicht</span>'; return; }
    btnEl.disabled=true; btnEl.textContent='Versturen...';
    var code = type==='v' ? t.id : t.koper_code;
    try {
      var res = await fetch(WORKER+'/mna/uitnodiging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tussen-key': S.code },
        body: JSON.stringify({
          code: code, type: type==='v' ? 'verkoper' : 'koper', to: email,
          trajectNaam: t.kantoor_naam||S.code,
          adviseur_naam: t.begeleider_naam||'', adviseur_email: t.begeleider_email||''
        })
      });
      var rd = await res.json();
      if (rd.ok) { stEl.innerHTML='<span style="color:var(--teal)">&#10003; Verstuurd</span>'; btnEl.innerHTML='&#10003; Ok'; }
      else { stEl.innerHTML='<span style="color:var(--red)">'+esc(rd.error||'Fout')+'</span>'; btnEl.disabled=false; btnEl.textContent='Opnieuw'; }
    } catch(e) { stEl.innerHTML='<span style="color:var(--red)">Verbindingsfout</span>'; btnEl.disabled=false; }
  }
  document.getElementById('inv-vt-btn').onclick = function(){ stuurTussen('v'); };
  document.getElementById('inv-kt-btn').onclick = function(){ stuurTussen('k'); };
}

function renderApp(){
  var app=ge('app');
  if(S.screen==='login')app.innerHTML=renderLogin();
  else if(S.screen==='opening')app.innerHTML=renderOpening();
  else if(S.screen==='cover'){app.innerHTML=renderCover();laadPartijDocs();laadPartijGesprekken();}
  else if(S.screen==='main')app.innerHTML=renderMain();
  else if(S.screen==='summary')app.innerHTML=renderSummary();
  else if(S.screen==='dataroom')app.innerHTML=renderDataroom();
  else if(S.screen==='waardering')app.innerHTML=renderWaardering();
  else if(S.screen==='logboek')renderLogboekScreen(app);
  else if(S.screen==='begeleider')renderBegeleiderDashboard(app);
  else if(S.screen==='handleiding')app.innerHTML=renderHandleiding();
  bindAll();
}

function renderLogin(){
  return '<div class="wrap narrow anim" style="padding-top:3rem">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+'</div>'
    +'<a href="index.html" style="font-size:11px;color:var(--muted);text-decoration:none">&#8592; Terug naar scan</a></div>'
    +'<div style="min-height:60vh;display:flex;align-items:center;justify-content:center">'
    +'<div class="panel" style="max-width:420px;width:100%">'
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.3rem">M&amp;A Begeleiding</div>'
    +'<div style="font-size:13px;color:var(--muted);line-height:1.65;margin-bottom:1.5rem">Voer uw toegangscode in. U ontvangt uw persoonlijke code van uw adviseur.</div>'
    +'<div class="f" style="margin-bottom:.75rem"><label>Toegangscode</label>'
    +'<input type="text" id="l-code" placeholder="" style="text-transform:uppercase;letter-spacing:.15em;font-size:1.2rem;text-align:center;font-family:IBM Plex Mono,monospace" maxlength="10" autocomplete="off"></div>'
    +'<div id="l-err" style="color:var(--red);font-size:12px;margin-bottom:.75rem;display:none">Code niet gevonden. Controleer uw code of neem contact op met uw adviseur.</div>'
    +'<div id="l-load" style="color:var(--muted);font-size:12px;margin-bottom:.75rem;display:none">Laden...</div>'
    +'<div style="display:flex;gap:10px"><button class="btn-ghost" onclick="window.location.href=\'index.html\'">Terug</button><button class="btn" id="l-btn">Inloggen</button></div>'
    +'<div style="margin-top:1rem;padding:.75rem 1rem;background:rgba(26,122,94,.07);border:1px solid rgba(26,122,94,.2);border-radius:6px;font-size:11px;color:var(--mid);line-height:1.7">&#128274; <strong style="color:var(--head)">Beveiliging & privacy</strong><br>Uw verbinding is versleuteld (HTTPS). Gegevens opgeslagen in Cloudflare EU-datacenters (Frankfurt, Duitsland). Toegang alleen met uw persoonlijke code. Geen gegevensverkoop aan derden. <a href="privacy.html" style="color:var(--teal)">Privacyverklaring</a> &middot; <a href="platformvoorwaarden.html" style="color:var(--teal)">Voorwaarden</a></div>'
    +'<div style="margin-top:1.25rem;font-size:11px;color:var(--muted);padding-top:1rem;border-top:1px solid var(--border)">Code ontvangen via uw adviseur.</div>'
    +'<div style="margin-top:.5rem;font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px">&#128274; Sessie verloopt automatisch na 8 uur inactiviteit. Max. 10 inlogpogingen per sessie.</div>'
    +'</div></div>'
    +'<div style="position:fixed;bottom:1.25rem;left:1.5rem;right:1.5rem;display:flex;justify-content:space-between;align-items:flex-end;pointer-events:none">'
    +'<div style="pointer-events:auto"><span style="font-size:11px;color:var(--muted)">'+BRAND.platform+' '+BRAND.suffix+'</span></div>'
    +'<div style="pointer-events:auto;text-align:right"><a href="privacy.html" style="font-size:11px;color:var(--muted);text-decoration:none">Privacyverklaring</a> &middot; <a href="platformvoorwaarden.html" style="font-size:11px;color:var(--muted);text-decoration:none">Voorwaarden</a></div>'
    +'</div>'
    +'</div>';
}

// Gefaseerde koper-toegang: vrijgegeven categorieën uit het traject lezen.
// null = "alles vrij" (oude trajecten, backward compat); array = alleen die fase_id's.
function koperCatsVan(t){
  if(!t || t.koper_categorieen==null) return null;
  try{ var c=JSON.parse(t.koper_categorieen); return Array.isArray(c)?c:[]; }catch(e){ return []; }
}

// Modal: begeleider vinkt per DD-categorie aan wat de koper mag inzien
function toonKoperToegangModal(app){
  var t=S.traject||{};
  var fases=(window.FASES&&FASES.length)?FASES:[];
  var huidige=koperCatsVan(t);
  // null (alles) → bij binaire oude vrijgave alles aangevinkt; anders de opgeslagen selectie
  var voorGeselecteerd = huidige===null ? (t.koper_vrijgegeven?fases.map(function(f){return f.id;}):[]) : huidige;
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','kopertoegang-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:1.75rem;max-width:520px;width:100%;max-height:90vh;overflow-y:auto';
  var rijen=fases.map(function(f){
    var aan=voorGeselecteerd.indexOf(f.id)>=0;
    return '<label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border);border-radius:7px;margin-bottom:7px;cursor:pointer;font-size:13px;color:var(--sub)">'
      +'<input type="checkbox" class="kt-cat" value="'+f.id+'"'+(aan?' checked':'')+' style="width:16px;height:16px;accent-color:var(--teal)">'
      +'<span style="font-weight:600;color:#8a8880;min-width:24px">'+esc(f.num||'')+'</span><span>'+esc(f.title||f.id)+'</span></label>';
  }).join('');
  mo.innerHTML='<div id="kopertoegang-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#128275; Koper-toegang per categorie</div>'
    +'<div style="font-size:12px;color:#8a8880;margin-bottom:1rem">Vink aan welke DD-categorieën de koper mag inzien (velden én documenten). De koper ziet uitsluitend wat hier is vrijgegeven.</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:.85rem"><button id="kt-alles" style="background:transparent;border:1px solid #c8c5bc;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px">Alles</button><button id="kt-niets" style="background:transparent;border:1px solid #c8c5bc;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px">Niets</button></div>'
    +rijen
    +'<div id="kt-err" style="display:none;color:#e05252;font-size:12px;margin:.5rem 0"></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">'
    +'<button id="kt-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">Annuleren</button>'
    +'<button id="kt-ok" style="background:#1a7a5e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">Opslaan</button>'
    +'</div>';
  ov.appendChild(mo);document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  document.getElementById('kt-ann').onclick=function(){document.body.removeChild(ov);};
  document.getElementById('kt-alles').onclick=function(){mo.querySelectorAll('.kt-cat').forEach(function(c){c.checked=true;});};
  document.getElementById('kt-niets').onclick=function(){mo.querySelectorAll('.kt-cat').forEach(function(c){c.checked=false;});};
  document.getElementById('kt-ok').onclick=async function(){
    var btn=this;btn.disabled=true;btn.textContent='Opslaan...';
    var errEl=document.getElementById('kt-err');errEl.style.display='none';
    var cats=Array.prototype.slice.call(mo.querySelectorAll('.kt-cat:checked')).map(function(c){return c.value;});
    async function verstuur(force){
      var url=WORKER+'/mna/koper-categorieen/'+S.traject.id+(force?'?force=1':'');
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},body:JSON.stringify({categorieen:cats})}).then(function(x){return x.json();}).catch(function(){return{};});
    }
    var r=await verstuur(false);
    if(r.nda_niet_getekend){
      if(confirm('⚠ De NDA is nog NIET getekend.\n\nKoper krijgt toegang zonder geheimhoudingsovereenkomst. Toch vrijgeven?')){ r=await verstuur(true); }
      else { btn.disabled=false;btn.textContent='Opslaan';return; }
    }
    if(r.ok){
      S.traject.koper_categorieen=JSON.stringify(cats);
      S.traject.koper_vrijgegeven=cats.length?1:0;
      secAuditLog('koper_categorieen_bijgewerkt',{aantal:cats.length});
      document.body.removeChild(ov);
      toast(cats.length?('Koper-toegang bijgewerkt ('+cats.length+' categorie'+(cats.length===1?'':'ën')+')'):'Koper-toegang volledig ingetrokken','ok');
      renderBegeleiderDashboard(app);
    } else { errEl.style.display='block';errEl.textContent=r.error||'Fout bij opslaan';btn.disabled=false;btn.textContent='Opslaan'; }
  };
}

function toonGroepsstructuurModal(app){
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','groepsstructuur-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:1.75rem;max-width:520px;width:100%;max-height:90vh;overflow-y:auto';
  mo.innerHTML='<div id="groepsstructuur-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#127970; Groepsstructuur</div>'
    +'<div style="font-size:12px;color:#8a8880;margin-bottom:1rem">Betreft dit traject een holding met meerdere werkmaatschappijen? Registreer hier de aparte entiteiten — documenten van deze bedrijven worden dan niet meer afgewezen als "ander bedrijf", en blijven traceerbaar in de dataroom.</div>'
    +'<div id="gs-lijst" style="margin-bottom:1rem;font-size:13px;color:#8a8880;font-style:italic">Laden...</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:.5rem">'
    +'<input type="text" id="gs-naam" placeholder="Naam entiteit" style="flex:2;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="gs-kvk" placeholder="KvK (optioneel)" style="flex:1;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<button id="gs-toevoegen" style="background:#1a7a5e;color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">+ Toevoegen</button>'
    +'</div>'
    +'<div id="gs-err" style="display:none;color:#e05252;font-size:12px;margin:.5rem 0"></div>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:1rem">'
    +'<button id="gs-sluiten" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">Sluiten</button>'
    +'</div>';
  ov.appendChild(mo);document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  document.getElementById('gs-sluiten').onclick=function(){document.body.removeChild(ov);};

  async function laadLijst(){
    var lijstEl=document.getElementById('gs-lijst');
    lijstEl.textContent='Laden...';
    var rows=await fetch(WORKER+'/mna/entiteiten/'+S.code).then(function(r){return r.json();}).catch(function(){return [];});
    if(!rows||!rows.length){lijstEl.innerHTML='<span style="font-style:italic">Nog geen entiteiten geregistreerd — dit traject wordt behandeld als één bedrijf.</span>';return;}
    lijstEl.style.fontStyle='normal';
    lijstEl.innerHTML=rows.map(function(r){
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;margin-bottom:6px">'
        +'<div style="flex:1"><div style="font-size:13px;color:var(--sub)">'+esc(r.naam)+'</div>'+(r.kvk?'<div style="font-size:11px;color:var(--muted)">KvK '+esc(r.kvk)+'</div>':'')+'</div>'
        +'<button class="gs-verwijder" data-id="'+esc(r.id)+'" style="background:transparent;border:1px solid #c8c5bc;color:#e05252;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">Verwijderen</button>'
        +'</div>';
    }).join('');
    lijstEl.querySelectorAll('.gs-verwijder').forEach(function(btn){
      btn.onclick=async function(){
        await fetch(WORKER+'/mna/entiteiten/'+S.code,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},body:JSON.stringify({actie:'verwijderen',id:btn.dataset.id})});
        laadLijst();
      };
    });
  }
  document.getElementById('gs-toevoegen').onclick=async function(){
    var btn=this;var naamEl=document.getElementById('gs-naam');var kvkEl=document.getElementById('gs-kvk');var errEl=document.getElementById('gs-err');
    errEl.style.display='none';
    var naam=naamEl.value.trim();
    if(!naam){errEl.textContent='Naam is verplicht.';errEl.style.display='block';return;}
    btn.disabled=true;btn.textContent='...';
    var r=await fetch(WORKER+'/mna/entiteiten/'+S.code,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},body:JSON.stringify({naam:naam,kvk:kvkEl.value.trim()})}).then(function(x){return x.json();}).catch(function(){return {};});
    btn.disabled=false;btn.textContent='+ Toevoegen';
    if(r.ok){naamEl.value='';kvkEl.value='';laadLijst();}
    else{errEl.textContent=r.error||'Fout bij opslaan';errEl.style.display='block';}
  };
  laadLijst();
}

// Partnerregister: partners eenmalig vastleggen (naam, leeftijd, veranderbereidheid,
// opvolgingskandidaat, gekoppelde entiteiten, omzet incl. onderliggend team) i.p.v. deze vragen
// per entiteit te herhalen — dezelfde partner kan bij meerdere werkmaatschappijen horen (Marcel,
// 25 juli 2026). Additief: de bestaande per-entiteit velden (leeftijd/veranderbereidheid/opvolging/
// omzet per partner) blijven ongewijzigd staan — geen dataverlies, geen gok naar wie welke oude
// waarde was. "Omzet die aan de partner hangt" is bewust incl. onderliggend team, niet alleen zijn
// eigen declarabele productie — bij vertrek van de partner is dát het omzetrisico voor de koper.
function toonPartnersModal(app){
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','partners-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:1.75rem;max-width:560px;width:100%;max-height:90vh;overflow-y:auto';
  mo.innerHTML='<div id="partners-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#129489;&#8205;&#128188; Partners</div>'
    +'<div style="font-size:12px;color:#8a8880;margin-bottom:1rem">Leg elke partner één keer vast, ook als deze bij meerdere entiteiten werkt. "Omzet die aan de partner hangt" is de omzet incl. het onderliggend team — het bedrag dat risico loopt als deze partner vertrekt, niet alleen zijn eigen declarabele productie.</div>'
    +'<div id="pt-reconciliatie"></div>'
    +'<div id="pt-lijst" style="margin-bottom:1rem;font-size:13px;color:#8a8880;font-style:italic">Laden...</div>'
    +'<div style="border-top:1px solid #e5e2d8;padding-top:.85rem;margin-top:.5rem">'
    +'<div style="display:flex;gap:8px;margin-bottom:6px">'
    +'<input type="text" id="pt-naam" placeholder="Naam partner" style="flex:2;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="pt-leeftijd" placeholder="Leeftijd" style="flex:1;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:6px">'
    +'<input type="text" id="pt-verandering" placeholder="Veranderbereidheid" style="flex:1;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="pt-opvolging" placeholder="Opvolgingskandidaat" style="flex:1;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="pt-omzet" placeholder="Omzet incl. team (€)" style="flex:1;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-size:13px">'
    +'</div>'
    +'<div id="pt-entiteiten" style="font-size:12px;color:#8a8880;margin-bottom:8px">Gekoppelde entiteiten: <span style="font-style:italic">laden...</span></div>'
    +'<button id="pt-toevoegen" style="background:#1a7a5e;color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Toevoegen</button>'
    +'</div>'
    +'<div id="pt-err" style="display:none;color:#e05252;font-size:12px;margin:.5rem 0"></div>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:1rem">'
    +'<button id="pt-sluiten" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">Sluiten</button>'
    +'</div>';
  ov.appendChild(mo);document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  document.getElementById('pt-sluiten').onclick=function(){document.body.removeChild(ov);};

  async function laadEntiteitenCheckboxen(){
    var rows=(S._entiteiten&&S._entiteiten.length)?S._entiteiten:await fetch(WORKER+'/mna/entiteiten/'+S.code).then(function(r){return r.json();}).catch(function(){return [];});
    var el=document.getElementById('pt-entiteiten');
    if(!rows||!rows.length){el.innerHTML='Gekoppelde entiteiten: <span style="font-style:italic">geen entiteiten geregistreerd — deze partner geldt dan voor het hele traject.</span>';return;}
    el.innerHTML='Gekoppelde entiteiten:<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px">'
      +rows.map(function(r){return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" class="pt-ent-chk" value="'+esc(r.id)+'"> '+esc(r.naam)+'</label>';}).join('')
      +'</div>';
  }

  // Audit-fix P1 (25 juli 2026, vijfde ronde): het partnerregister en de oudere, losse DD-velden
  // partner_aantalP/partner_omzetPerP zijn twee niet-gesynchroniseerde databronnen — de waardering
  // leest nog steeds de oude velden (bewust niet automatisch overschreven, zie hierboven "geen
  // gok naar wie welke oude waarde was"). Puur informatieve, niet-blokkerende vergelijking, zodat
  // een afwijking hier zichtbaar is i.p.v. stil te blijven bestaan.
  function toonReconciliatie(rows){
    var el=document.getElementById('pt-reconciliatie');
    if(!rows||!rows.length){el.innerHTML='';return;}
    var aantalRegister=rows.length;
    var omzetRegister=rows.reduce(function(sum,r){return sum+(parseFloat(r.omzet_incl_team)||0);},0);
    var aantalIngevuld=parseFloat(S.data['partner_aantalP'])||null;
    var omzetIngevuld=null;var omzetRaw=S.data['partner_omzetPerP'];
    if(omzetRaw){var n=parseFloat(String(omzetRaw).replace(/[^0-9.,]/g,'').replace(',','.'));if(!isNaN(n))omzetIngevuld=n;}
    var verschillen=[];
    if(aantalIngevuld!==null&&aantalIngevuld!==aantalRegister)verschillen.push('aantal partners: DD-veld zegt '+aantalIngevuld+', register zegt '+aantalRegister);
    if(omzetIngevuld!==null&&Math.abs(omzetIngevuld-omzetRegister)>1)verschillen.push('omzet: DD-veld zegt €'+omzetIngevuld.toLocaleString('nl-NL')+', register (som incl. team) zegt €'+omzetRegister.toLocaleString('nl-NL'));
    if(!verschillen.length){el.innerHTML='';return;}
    el.innerHTML='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:6px;padding:8px 12px;margin-bottom:.85rem;font-size:12px;color:var(--sub)">'
      +'&#9888; Het partnerregister wijkt af van de ingevulde DD-velden (fase Partners &amp; personeel) — de waardering gebruikt nog steeds de DD-velden, niet dit register. '+esc(verschillen.join('; '))+'. Werk beide bij als één van de twee verouderd is.'
      +'</div>';
  }
  async function laadLijst(){
    var lijstEl=document.getElementById('pt-lijst');
    lijstEl.textContent='Laden...';
    var rows=await fetch(WORKER+'/mna/partners/'+S.code).then(function(r){return r.json();}).catch(function(){return [];});
    toonReconciliatie(rows);
    if(!rows||!rows.length){lijstEl.innerHTML='<span style="font-style:italic">Nog geen partners geregistreerd.</span>';return;}
    lijstEl.style.fontStyle='normal';
    lijstEl.innerHTML=rows.map(function(r){
      var entNamen=(r.entiteit_ids||[]).map(function(id){var e=(S._entiteiten||[]).find(function(x){return x.id===id;});return e?e.naam:id;}).join(', ');
      return '<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;margin-bottom:6px">'
        +'<div style="flex:1">'
        +'<div style="font-size:13px;color:var(--sub);font-weight:600">'+esc(r.naam)+(r.leeftijd?' &middot; '+esc(r.leeftijd)+' jaar':'')+'</div>'
        +(r.veranderbereidheid?'<div style="font-size:11px;color:var(--muted)">Veranderbereidheid: '+esc(r.veranderbereidheid)+'</div>':'')
        +(r.opvolgingskandidaat?'<div style="font-size:11px;color:var(--muted)">Opvolging: '+esc(r.opvolgingskandidaat)+'</div>':'')
        +(r.omzet_incl_team?'<div style="font-size:11px;color:var(--muted)">Omzet incl. team: &euro;'+esc(Number(r.omzet_incl_team).toLocaleString('nl-NL'))+'</div>':'')
        +(entNamen?'<div style="font-size:11px;color:var(--teal)">'+esc(entNamen)+'</div>':'')
        +'</div>'
        +'<button class="pt-verwijder" data-id="'+esc(r.id)+'" style="background:transparent;border:1px solid #c8c5bc;color:#e05252;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">Verwijderen</button>'
        +'</div>';
    }).join('');
    lijstEl.querySelectorAll('.pt-verwijder').forEach(function(btn){
      btn.onclick=async function(){
        await fetch(WORKER+'/mna/partners/'+S.code,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},body:JSON.stringify({actie:'verwijderen',id:btn.dataset.id})});
        laadLijst();
      };
    });
  }
  document.getElementById('pt-toevoegen').onclick=async function(){
    var btn=this;
    var naamEl=document.getElementById('pt-naam'),leeftijdEl=document.getElementById('pt-leeftijd'),verEl=document.getElementById('pt-verandering'),opvEl=document.getElementById('pt-opvolging'),omzetEl=document.getElementById('pt-omzet');
    var errEl=document.getElementById('pt-err');errEl.style.display='none';
    var naam=naamEl.value.trim();
    if(!naam){errEl.textContent='Naam is verplicht.';errEl.style.display='block';return;}
    var entIds=Array.prototype.slice.call(document.querySelectorAll('.pt-ent-chk:checked')).map(function(c){return c.value;});
    btn.disabled=true;btn.textContent='...';
    var r=await fetch(WORKER+'/mna/partners/'+S.code,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},body:JSON.stringify({naam:naam,leeftijd:leeftijdEl.value.trim(),veranderbereidheid:verEl.value.trim(),opvolgingskandidaat:opvEl.value.trim(),omzet_incl_team:omzetEl.value.trim(),entiteit_ids:entIds})}).then(function(x){return x.json();}).catch(function(){return {};});
    btn.disabled=false;btn.textContent='+ Toevoegen';
    if(r.ok){naamEl.value='';leeftijdEl.value='';verEl.value='';opvEl.value='';omzetEl.value='';document.querySelectorAll('.pt-ent-chk').forEach(function(c){c.checked=false;});laadLijst();}
    else{errEl.textContent=r.error||'Fout bij opslaan';errEl.style.display='block';}
  };
  laadEntiteitenCheckboxen();
  laadLijst();
}

function renderBegeleiderDashboard(app){
  var t=S.traject||{};
  var contractenAan=!S.modules||S.modules.contracten!==false;
  var lb=partijLabels(t.traject_type||'Verkoop');
  var html='<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&A Begeleider'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button class="btn-ghost btn-sm" onclick="refreshData()">&#8635; Ververs</button>'
    +'<button class="btn-ghost btn-sm" onclick="S.screen=\'handleiding\';renderApp()">&#128214; Handleiding</button>'
    +'<button class="btn-ghost btn-sm" onclick="window.print()">&#128196; PDF</button>'
    +'<button class="btn-ghost btn-sm" onclick="uitloggen()">&#8592; Uitloggen</button>'
    +'</div></div>'
    // Traject info
    +'<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    +(t.verkoper_klaar?'<div style="background:var(--teal-bg);border:1px solid var(--teal);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px"><span style="font-size:1.5rem">&#128228;</span><div><div style="font-size:13px;font-weight:600;color:var(--teal)">Verkoper heeft dossier vrijgegeven</div><div style="font-size:11px;color:var(--muted);margin-top:2px">'+(t.verkoper_klaar_naam?'Door: '+esc(t.verkoper_klaar_naam)+' &middot; ':'')+( t.verkoper_klaar_at?new Date(t.verkoper_klaar_at).toLocaleString('nl-NL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'')+'</div></div></div>':'')
    +'<div class="panel" id="wz-panel" style="margin-bottom:1rem;padding:0">'
    +'<div id="wz-toggle-hdr" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem">'
    +'<div style="display:flex;align-items:center;gap:8px">'
    +'<span style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">&#128221; Wijzigingen (dataintegriteit)</span>'
    +'<span id="wz-badge" style="display:none;background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px"></span>'
    +'</div><span id="wz-chevron" style="font-size:12px;color:var(--muted)">&#9660;</span>'
    +'</div><div id="wz-body" style="display:none;padding:0 1rem 1rem"></div></div>'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">'
    +'<div>'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem">Traject</div>'
    +'<div style="font-family:Playfair Display,serif;font-size:1.3rem;font-weight:600;color:var(--head)">'+esc(t.kantoor_naam||'Traject')+'</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-top:.25rem">'+esc(t.traject_type||'M&A')+' &middot; Code: <span style="font-family:IBM Plex Mono,monospace;color:var(--teal)">'+esc(S.code)+'</span></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    +'<button class="btn btn-sm" id="bg-toegang" style="background:var(--teal)">&#128275; Koper-toegang</button>'
    +'<button class="btn-outline btn-sm" id="bg-groepsstructuur">&#127970; Groepsstructuur</button>'
    +'<button class="btn-outline btn-sm" id="bg-partners">&#129489;&#8205;&#128188; Partners</button>'
    +(t.status==='afgesloten'?'':'<button class="btn-ghost btn-sm" id="bg-afsluiten" style="color:var(--red);border-color:var(--red)">&#127937; Traject afsluiten</button>')
    +(function(){ var kc=koperCatsVan(t); var tot=(window.FASES&&FASES.length)||7; var lbl,kl; if(kc===null){ lbl=t.koper_vrijgegeven?'Alles vrijgegeven':'Geen toegang'; kl=t.koper_vrijgegeven?'var(--teal)':'var(--muted)'; } else if(kc.length){ lbl=kc.length+'/'+tot+' categorieën vrij'; kl='var(--teal)'; } else { lbl='Geen toegang'; kl='var(--muted)'; } return '<span style="font-size:11px;font-weight:600;color:'+kl+'">'+lbl+'</span>'; })()
    +'<span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;background:'+(t.status==='vergrendeld'?'var(--red-bg)':'var(--teal-bg)')+';color:'+(t.status==='vergrendeld'?'var(--red)':'var(--teal)')+';border:1px solid '+(t.status==='vergrendeld'?'var(--red)':'var(--teal-dark)')+'">'+esc(t.status||'actief')+'</span>'
    +'</div></div></div>'
    // Actie knoppen
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Documenten</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">'
    +(contractenAan
      ?'<button class="btn" id="bg-nda-actie" style="background:#7c5cbf;padding:10px;font-size:12px">&#128274; NDA</button>'
      :'<button class="btn" id="bg-nda-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#7c5cbf;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128274; NDA</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-bem-actie" style="background:#2a5ea0;padding:10px;font-size:12px">&#128203; BEM</button>'
      :'<button class="btn" id="bg-bem-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#2a5ea0;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128203; BEM</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-loi-actie" style="background:var(--gold);padding:10px;font-size:12px">&#128196; LoI</button>'
      :'<button class="btn" id="bg-loi-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:var(--gold);padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128196; LoI</button>')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:.75rem">'
    +(contractenAan
      ?'<button class="btn" id="bg-excl-actie" style="background:#1a7a5e;padding:10px;font-size:12px">&#128221; Excl</button>'
      :'<button class="btn" id="bg-excl-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#1a7a5e;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128221; Excl</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-dealvoorstel-actie" style="background:#8a5a00;padding:10px;font-size:12px">&#128202; Dealvoorstel</button>'
      :'<button class="btn" id="bg-dealvoorstel-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#8a5a00;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128202; Dealvoorstel</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-bieding-actie" style="background:#a0522d;padding:10px;font-size:12px">&#128233; Indicatieve bieding</button>'
      :'<button class="btn" id="bg-bieding-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#a0522d;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128233; Indicatieve bieding</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-spa-actie" style="background:#5a5470;padding:10px;font-size:12px">&#128220; Aandachtspunten SPA</button>'
      :'<button class="btn" id="bg-spa-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#5a5470;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#128220; Aandachtspunten SPA</button>')
    +(contractenAan
      ?'<button class="btn" id="bg-closing-actie" style="background:#2d6a4f;padding:10px;font-size:12px">&#127937; Closing-checklist</button>'
      :'<button class="btn" id="bg-closing-actie" disabled title="Module Contracten niet actief — neem contact op met ' + BRAND.kort + '" style="background:#2d6a4f;padding:10px;font-size:12px;opacity:.45;cursor:not-allowed">&#127937; Closing-checklist</button>')
    +'</div>'
    +(contractenAan?'':'<div style="font-size:11px;color:var(--muted);margin-top:-.5rem;margin-bottom:.75rem">&#128274; Module Contracten niet actief — neem contact op met ' + BRAND.kort + ' om deze module te activeren.</div>')
    +'<div style="margin-bottom:1.25rem"><button class="btn-outline btn-sm" id="bg-eigendoc-actie">&#128206; Eigen document versturen</button><div style="font-size:11px;color:var(--muted);margin-top:4px">Upload een PDF of Word-bestand en deel het rechtstreeks met verkoper en/of koper — werkt ook zonder de module Contracten.</div></div>'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Communicatie</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.25rem">'
    +'<button class="btn" id="bg-gesprek-actie" style="background:var(--teal);padding:10px;font-size:12px">&#128172; Gesprek</button>'
    +'<button class="btn" id="bg-uitnodigen-btn" style="background:var(--teal-dim);padding:10px;font-size:12px">&#9993; Uitnodigen</button>'
    +'<button class="btn" id="bg-infoverzoek-actie" style="background:var(--teal-dim);padding:10px;font-size:12px">&#128203; Informatieverzoek</button>'
    +'</div>'
    +'<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Analyse</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:1.25rem">'
    +'<button class="btn" id="bg-waardering-actie" style="background:#6b7c93">&#9881; AI-analyse &amp; waardering</button>'
    +'<button class="btn-outline btn-sm" id="bg-ai-status-actie">&#129302; AI-verificatiestatus</button>'
    +'<button class="btn-outline btn-sm" id="bg-koperfit-actie">&#127919; Koper-fit strategie</button>'
    +'<button class="btn-outline btn-sm" id="bg-feedback-actie" style="border-color:var(--gold);color:var(--gold)">&#128172; Feedback / bug melden</button>'
    +'</div>'
    +'<div id="bg-ai-status-out" style="display:none;margin-bottom:1.25rem"></div>'
    +'<div id="bg-koperfit-out" style="display:none;margin-bottom:1.25rem"></div>'
    // Doc output
    +'<div id="bg-doc-out" style="display:none;margin-bottom:1.25rem"></div>'
    // Gesprek output
    +'<div id="bg-gesp-out" style="display:none;margin-bottom:1.25rem"></div>'
    // DD data per fase
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Due diligence voortgang</div>';

  var faseLabels={financieel:'I. Financieel',commercieel:'II. Klanten & commercieel',partner:'III. Partners & personeel',compliance:'IV. Compliance & kwaliteit',it:'V. IT & automatisering',juridisch:'VI. Juridisch & fiscaal',strategisch:'VII. Strategisch & markt'};
  Object.keys(faseLabels).forEach(function(faseId){
    var row=(S._mnaData||[]).find(function(r){return r.fase_id===faseId;});
    var items=[];
    if(row){try{var dj=typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json;items=Object.values(dj||{}).filter(function(v){return v&&v.value;});}catch(e){}}
    var pct=row?Math.round(items.length/Math.max(1,Object.keys(row.data_json&&typeof row.data_json==='string'?JSON.parse(row.data_json||'{}'):row.data_json||{}).length)*100):0;
    var kleur=pct>=80?'var(--teal)':pct>=40?'var(--gold)':'var(--red)';
    html+='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);margin-bottom:.5rem;overflow:hidden">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;background:var(--card)" class="bg-fase-hdr" data-fase="'+faseId+'">'
      +'<span style="font-size:13px;font-weight:500;color:var(--head)">'+faseLabels[faseId]+'</span>'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:11px;font-weight:600;color:'+kleur+'">'+items.length+' velden ingevuld</span>'
      +'<span style="font-size:12px;color:var(--muted)">&#9660;</span>'
      +'</div></div>'
      +'<div class="bg-fase-body" data-fase="'+faseId+'" style="display:none;padding:12px 14px">';
    if(!items.length){html+='<div style="color:var(--muted);font-size:12px;font-style:italic">Nog niets ingevuld door verkoper.</div>';}
    else{
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
      items.forEach(function(v){html+='<div style="background:var(--card);border-radius:var(--r);padding:6px 10px"><div style="font-size:10px;color:var(--muted);margin-bottom:2px">'+esc(v.label||'')+'</div><div style="font-size:12px;font-family:IBM Plex Mono,monospace;color:var(--sub)">'+esc(v.value||'')+'</div></div>';});
      html+='</div>';
    }
    html+='</div></div>';
  });

  // Documenten
  html+='<div style="margin-bottom:1rem">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">&#128196; Documenten</div>'
    +'<button class="btn-outline btn-sm" id="bg-dataroom-actie" style="font-size:11px">&#128193; Alle documenten (dataroom)</button>'
    +'</div>'
    +'<div id="bg-docs-sectie" style="font-size:12px;color:var(--muted);font-style:italic">Laden...</div>'
    +'</div>'
    +'<div style="margin-top:1.25rem">'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">&#128172; Gesprekken &amp; verslagen</div>'
    +'<div id="bg-gesprekken-sectie" style="font-size:12px;color:var(--muted);font-style:italic">Laden...</div>'
    +'</div>'
    +'</div>';

  app.innerHTML=html;

  // Fase accordeon
  app.querySelectorAll('.bg-fase-hdr').forEach(function(hdr){
    hdr.addEventListener('click',function(){
      var body=app.querySelector('.bg-fase-body[data-fase="'+hdr.dataset.fase+'"]');
      if(body)body.style.display=body.style.display==='none'?'block':'none';
    });
  });

  // Koper-toegang beheren (gefaseerd, per DD-categorie)
  var tgBtn=document.getElementById('bg-toegang');
  if(tgBtn)tgBtn.onclick=function(){ toonKoperToegangModal(app); };
  var gsBtn=document.getElementById('bg-groepsstructuur');
  if(gsBtn)gsBtn.onclick=function(){ toonGroepsstructuurModal(app); };
  var ptBtn=document.getElementById('bg-partners');
  if(ptBtn)ptBtn.onclick=function(){ toonPartnersModal(app); };

  // Traject afsluiten: dossier-export (ZIP + DD-rapport), downloadmail, daarna 14 dagen tot verwijdering
  var afsBtn=document.getElementById('bg-afsluiten');
  if(afsBtn)afsBtn.onclick=async function(){
    var uitleg='Weet u zeker dat u dit traject wilt AFSLUITEN?\n\n'
      +'Wat er dan gebeurt:\n'
      +'1. Het volledige dossier (alle documenten + DD-eindrapport) wordt als ZIP klaargezet.\n'
      +'2. U ontvangt per e-mail een downloadlink die 14 dagen geldig is.\n'
      +'3. Na 14 dagen worden de documenten DEFINITIEF van het platform verwijderd.\n'
      +'4. Het traject kan daarna niet meer worden gewijzigd.\n\n'
      +'U bent na download zelf verantwoordelijk voor archivering.';
    if(!confirm(uitleg))return;
    if(!confirm('Laatste bevestiging: traject "'+(S.traject.kantoor_naam||S.code)+'" definitief afsluiten?'))return;
    afsBtn.disabled=true;afsBtn.textContent='Dossier wordt samengesteld...';
    var r=await fetch(WORKER+'/mna/traject/afsluiten/'+S.code,{method:'POST',headers:{'x-tussen-key':S.code}}).then(function(x){return x.json();}).catch(function(){return{};});
    if(r.ok){
      toast('Traject afgesloten. De downloadlink ('+r.documenten+' documenten + DD-rapport) is per e-mail verstuurd en 14 dagen geldig.','ok',9000);
      if(r.download_url){ try{ window.open(r.download_url,'_blank'); }catch(e){} }
      S.traject.status='afgesloten';
      renderApp();
    } else {
      toast('Afsluiten mislukt: '+(r.error||'onbekende fout'),'err',6000);
      afsBtn.disabled=false;afsBtn.textContent='🏁 Traject afsluiten';
    }
  };

  // Verplichte controlestap vóór versturen: checkbox-html + koppel disable/enable aan verstuurknoppen
  function akkoordHtml(id){
    return '<div style="margin-top:.85rem;padding:.6rem .85rem;background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);font-size:11px;color:var(--sub);line-height:1.6;display:flex;gap:8px;align-items:flex-start"><span style="font-size:14px;line-height:1">&#129302;</span><span><strong>AI-gegenereerd (bèta):</strong> deze tekst is automatisch opgesteld door kunstmatige intelligentie op basis van de template en de ingevoerde gegevens. Dit kan fouten, verkeerde bedragen of onvolledige/onjuiste clausules bevatten — dit is geen juridisch advies.</span></div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-top:.6rem;cursor:pointer"><input type="checkbox" id="'+id+'" style="width:15px;height:15px"> Ik heb dit document gecontroleerd en aangepast waar nodig (namen, bedragen, datum én de tekst passend bij deze specifieke situatie — dit is een uitgangspunt, geen kant-en-klaar juridisch advies)</label>';
  }
  // Retourneert een controller met setOverride(bool) — nodig omdat de checkbox-eis ("ik heb dit
  // document gecontroleerd") niet zinvol is bij een eigen geüpload bestand: er is dan niets
  // gegenereerds om te controleren, dus schakelt wireEigenPdf hieronder 'm dan uit.
  function wireAkkoord(checkboxId, buttonIds){
    var cb=document.getElementById(checkboxId);
    var btns=buttonIds.map(function(id){return document.getElementById(id);}).filter(Boolean);
    var override=false;
    function toepassen(){
      var ok=override||(cb&&cb.checked);
      btns.forEach(function(b){b.disabled=!ok;b.style.opacity=ok?'1':'.45';b.style.cursor=ok?'pointer':'not-allowed';});
    }
    if(cb)cb.onchange=toepassen;
    toepassen();
    return {setOverride:function(actief){override=actief;toepassen();}};
  }

  // Interne goedkeuring (approval workflow, 25 juli 2026 — op uitdrukkelijk verzoek van Marcel de
  // lichte variant: self-attestatie + logboek, geen apart multi-persoons-rollensysteem). Vóór het
  // versturen van een bod (indicatieve bieding) of LOI moet expliciet worden vastgelegd wie dit
  // intern heeft goedgekeurd — gelogd via het bestaande auditlog-endpoint (secAuditLog, mna_audit-
  // tabel), geen nieuwe backend-route nodig. Losstaand van de bestaande akkoord-checkbox hierboven
  // (die gaat over "ik heb de AI-tekst gecontroleerd"): dit is een aparte, altijd-verplichte stap.
  function interneGoedkeuringHtml(id){
    return '<div style="margin-top:.6rem"><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Intern goedgekeurd door (naam) — verplicht vóór verzending</label>'
      +'<input type="text" id="'+id+'" placeholder="Voor- en achternaam" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px"></div>';
  }
  function wireInterneGoedkeuring(naamId,akkoordId,buttonIds){
    var naamInput=document.getElementById(naamId);
    var akkoordCb=document.getElementById(akkoordId);
    var pdfOverride=false;
    function toepassen(){
      var naamOk=naamInput&&naamInput.value.trim().length>0;
      var akkOk=pdfOverride||(akkoordCb&&akkoordCb.checked);
      var ok=naamOk&&akkOk;
      buttonIds.forEach(function(id){
        var b=document.getElementById(id);
        if(b){b.disabled=!ok;b.style.opacity=ok?'1':'.45';b.style.cursor=ok?'pointer':'not-allowed';}
      });
    }
    if(naamInput)naamInput.oninput=toepassen;
    if(akkoordCb){var orig=akkoordCb.onchange;akkoordCb.onchange=function(e){if(orig)orig.call(this,e);toepassen();};}
    toepassen();
    return {setPdfOverride:function(actief){pdfOverride=actief;toepassen();},getNaam:function(){return naamInput?naamInput.value.trim():'';}};
  }

  // Eigen PDF-upload: alternatief voor het gegenereerde document. Herbruikbaar voor elk documenttype.
  var EIGEN_DOC_MIMES=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'];
  function eigenDocTypeOk(f){
    if(EIGEN_DOC_MIMES.indexOf(f.type)!==-1)return true;
    var naam=(f.name||'').toLowerCase();
    return naam.endsWith('.pdf')||naam.endsWith('.docx')||naam.endsWith('.doc');
  }
  function eigenPdfHtml(id){
    return '<div style="margin-top:.75rem;padding-top:.75rem;border-top:1px dashed var(--border2)">'
      +'<label style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px;cursor:pointer">'
      +'<input type="file" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" id="'+id+'-file" style="font-size:11px;max-width:220px">'
      +'<span>Of: eigen PDF/Word-bestand gebruiken i.p.v. dit document</span></label>'
      +'<div id="'+id+'-naam" style="font-size:11px;color:var(--teal);margin-top:4px;display:none"></div>'
      +'</div>';
  }
  // staat = {base64:null,naam:null,mime:null} — gedeeld object dat de verstuur-handler leest.
  // onWissel(actief) wordt aangeroepen zodra een bestand gekozen/verwijderd wordt (bv. om Print uit te schakelen).
  function wireEigenPdf(id, staat, onWissel){
    var fileInput=document.getElementById(id+'-file');
    if(!fileInput)return;
    fileInput.onchange=function(){
      var f=fileInput.files[0];
      var naamDiv=document.getElementById(id+'-naam');
      if(!f){ staat.base64=null; staat.naam=null; staat.mime=null; if(naamDiv)naamDiv.style.display='none'; if(onWissel)onWissel(false); return; }
      if(!eigenDocTypeOk(f)){ toast('Alleen PDF- of Word-bestanden (.pdf, .docx, .doc) zijn toegestaan.','err'); fileInput.value=''; return; }
      var reader=new FileReader();
      reader.onload=function(e){
        staat.base64=String(e.target.result).split(',')[1]||'';
        staat.naam=f.name;
        staat.mime=f.type||(f.name.toLowerCase().endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':f.name.toLowerCase().endsWith('.doc')?'application/msword':'application/pdf');
        if(naamDiv){naamDiv.style.display='block';naamDiv.textContent='✓ '+f.name+' geselecteerd — wordt verstuurd in plaats van het gegenereerde document.';}
        if(onWissel)onWissel(true);
      };
      reader.readAsDataURL(f);
    };
  }

  // Document genereren helper
  async function bgDoc(type){
    var out=document.getElementById('bg-doc-out');
    out.style.display='block';
    out.innerHTML='<div style="color:var(--muted);font-size:13px;padding:1rem;background:var(--card);border-radius:var(--r2)">Genereren... (15-30 sec)</div>';
    var t2=S.traject;
    var datum=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
    // isSell bepaald door opdrachtgever_rol: koper=buy-side, anders sell-side
    var isSell=(t2.opdrachtgever_rol==='koper')?false:(!t2.traject_type||t2.traject_type==='Verkoop'||t2.traject_type==='Opvolging');
    var tplType=type==='bem'?(isSell?'bem_verk':'bem_koper'):type;
    var tplD=await fetch(WORKER+'/mna/template/'+tplType+'?email='+encodeURIComponent(t2.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).then(function(r){return r.json();}).catch(function(){return{ok:false};});
    // Bepaal partijgegevens op basis van opdrachtgever_rol
    var opdrNaam   = isSell ? (t2.kantoor_naam||'[verkoper]') : (t2.koper_naam||'[koper]');
    var opdrAdres  = isSell ? (t2.verkoper_adres||'[adres]') : (t2.koper_adres||'[adres]');
    var opdrKvk    = isSell ? (t2.verkoper_kvk||'[KvK]') : (t2.koper_kvk||'[KvK]');
    var opdrRv     = isSell ? (t2.kantoor_rechtsvorm||'') : (t2.koper_rechtsvorm||'');
    var wpartNaam  = isSell ? (t2.koper_naam||'[koper]') : (t2.kantoor_naam||'[verkoper]');
    var wpartAdres = isSell ? (t2.koper_adres||'[adres]') : (t2.verkoper_adres||'[adres]');
    var wpartKvk   = isSell ? (t2.koper_kvk||'[KvK]') : (t2.verkoper_kvk||'[KvK]');
    var wpartRv    = isSell ? (t2.koper_rechtsvorm||'') : (t2.kantoor_rechtsvorm||'');
    var adviseur   = t2.begeleider_naam||'' + BRAND.bedrijf + '';

    var prompts={
      nda:'Vul de NDA template in. Vervang ALLE [tekst tussen haakjes].\n'
        +'Partij 1 ('+lb.sectie1+'): '+esc(t2.kantoor_naam||'[verkoper]')+', '+(t2.verkoper_adres||'[adres]')+', KvK: '+(t2.verkoper_kvk||'[KvK]')+'.\n'
        +'Partij 2 ('+lb.sectie2+'): '+esc(t2.koper_naam||'[koper]')+' ('+(t2.koper_rechtsvorm||'')+'), '+(t2.koper_adres||'')+', KvK: '+(t2.koper_kvk||'')+'.\n'
        +'Datum: '+datum+'. Adviseur: '+adviseur+'. Geef alleen het ingevulde document terug.',
      loi:'Vul de LoI template in. Vervang ALLE [tekst tussen haakjes].\n'
        +'Verkopende partij: '+esc(t2.kantoor_naam||'[verkoper]')+', '+(t2.verkoper_adres||'')+'.\n'
        +'Kopende partij: '+esc(t2.koper_naam||'[koper]')+' ('+(t2.koper_rechtsvorm||'')+'), '+(t2.koper_adres||'')+'.\n'
        +'Datum: '+datum+'. Adviseur: '+adviseur+'. Geef alleen het ingevulde document terug.',
      excl:'Vul de Exclusiviteitsbrief in. Vervang ALLE [tekst tussen haakjes].\n'
        +'INSTRUCTIE: De VERKOPENDE partij verleent exclusiviteit. De KOPENDE partij ontvangt exclusiviteit.\n'
        +'Verlenende partij (verkoper): '+esc(t2.kantoor_naam||'[verkoper]')+', '+(t2.verkoper_adres||'[adres]')+'.\n'
        +'Ontvangende partij (koper): '+esc(t2.koper_naam||'[koper]')+', '+(t2.koper_adres||'[adres]')+'.\n'
        +'Exclusiviteitsperiode: 6 weken. Datum: '+datum+'. Begeleider: '+adviseur+'. Geef alleen het ingevulde document terug.',
      bem:'Vul de Bemiddelingsovereenkomst in. Type: '+(isSell?'Verkoop (sell-side)':'Aankoop (buy-side)')+'. Vervang ALLE [tekst tussen haakjes].\n'
        +'INSTRUCTIE: De OPDRACHTGEVER heeft ' + (t2.begeleider_bedrijf||BRAND.kort) + ' ingeschakeld. De WEDERPARTIJ is de andere transactiepartij.\n'
        +'Opdrachtgever ('+(isSell?lb.sectie1:lb.sectie2)+'): '+esc(opdrNaam)+' ('+(opdrRv||'[rechtsvorm]')+'), '+esc(opdrAdres)+', KvK: '+esc(opdrKvk)+'.\n'
        +'Wederpartij ('+(isSell?lb.sectie2:lb.sectie1)+'): '+esc(wpartNaam)+' ('+(wpartRv||'[rechtsvorm]')+'), '+esc(wpartAdres)+', KvK: '+esc(wpartKvk)+'.\n'
        +'Datum: '+datum+'. Adviseur/Bemiddelaar: ' + (t2.begeleider_bedrijf||BRAND.bedrijf) + ', ' + adviseur + ', ' + (t2.begeleider_adres||BRAND.adres) + '. Geef alleen het ingevulde document terug.'
    };
    var tplTekst=tplD.ok&&tplD.tekst?tplD.tekst:'[standaard template]';
    // Afkappen om prompt te lang te voorkomen — limiet ruim boven de langste template (incl. AV-blok,
    // ca. 9700 tekens) zodat artikelen nooit halverwege worden afgesneden (regressie: AV stopte bij Artikel 2).
    if(tplTekst.length>14000)tplTekst=tplTekst.substring(0,14000)+'\n[...verdere standaardbepalingen van toepassing]';
    var prompt=prompts[type]+'\n\nTEMPLATE:\n'+tplTekst;
    var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:8000})});
    var rd=await resp.json();
    var tekst=rd.text||'Fout bij genereren';
    // (Concept-opslag verwijderd juli 2026: het endpoint bestond niet en de
    //  blokkadecheck leest uit mna_doc_versies, niet uit concepten.)
    var kleuren={nda:'#7c5cbf',loi:'var(--gold)',bem:'#2a5ea0',excl:'#1a7a5e'};
    var labels={nda:'NDA',loi:'LoI',bem:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief'};
    out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">'
      +'<div style="font-size:11px;font-weight:600;color:'+kleuren[type]+';text-transform:uppercase;letter-spacing:.1em">'+labels[type]+' gegenereerd</div>'
      +'<button id="bg-doc-toggle" class="btn-ghost" style="font-size:11px;padding:3px 10px;white-space:nowrap">&#9650; Inklappen</button>'
      +'</div>'
      +'<div id="bg-doc-body">'
      +'<textarea id="bg-doc-tekst" style="width:100%;height:280px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical">'+esc(tekst)+'</textarea>'
      +akkoordHtml('bg-doc-akkoord')
      +(type==='loi'?interneGoedkeuringHtml('bg-goedkeuring-naam'):'')
      +'<div style="display:flex;gap:8px;margin-top:.75rem">'
      +'<button id="bg-print" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128196; Print</button>'
      +'<button id="bg-email" class="btn" style="font-size:12px;padding:6px 14px;background:'+kleuren[type]+'">&#9993; Verstuur naar partijen</button>'
      +'<button id="bg-signhost" class="btn" style="font-size:12px;padding:6px 14px;background:var(--teal)">&#9998; Signhost</button>'
      +'<button id="bg-handmatig-getekend" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128221; Buiten Signhost om getekend</button>'
      +'</div>'
      +eigenPdfHtml('bg-pdf')
      +'</div>'
      +'</div>';
    var bgDocToggle=document.getElementById('bg-doc-toggle');
    var bgDocBody=document.getElementById('bg-doc-body');
    if(bgDocToggle)bgDocToggle.onclick=function(){
      var open=bgDocBody.style.display!=='none';
      bgDocBody.style.display=open?'none':'block';
      bgDocToggle.innerHTML=open?'&#9660; Uitklappen':'&#9650; Inklappen';
    };
    var bgAkkoordCtrl=wireAkkoord('bg-doc-akkoord', ['bg-email','bg-signhost']);
    var bgGoedkeuringCtrl=type==='loi'?wireInterneGoedkeuring('bg-goedkeuring-naam','bg-doc-akkoord',['bg-email','bg-signhost']):null;
    var bgPdfStaat={base64:null,naam:null};
    wireEigenPdf('bg-pdf', bgPdfStaat, function(actief){
      document.getElementById('bg-print').disabled=actief;
      document.getElementById('bg-print').style.opacity=actief?'.4':'1';
      bgAkkoordCtrl.setOverride(actief);
      if(bgGoedkeuringCtrl)bgGoedkeuringCtrl.setPdfOverride(actief);
    });
    document.getElementById('bg-print').onclick=function(){ printDoc(document.getElementById('bg-doc-tekst').value, {nda:'NDA',loi:'Letter of Intent',bem:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief'}[type]||type, type); };
    // Scroll naar doc output zodat knoppen zichtbaar zijn
    var docOutEl=document.getElementById('bg-doc-out');
    if(docOutEl)setTimeout(function(){docOutEl.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
    document.getElementById('bg-email').onclick=async function(){
      var ebtn=this;ebtn.disabled=true;ebtn.textContent='Versturen...';
      if(type==='loi')secAuditLog('interne_goedkeuring',{document_type:'loi',verzendkanaal:'email',goedgekeurd_door:(bgGoedkeuringCtrl?bgGoedkeuringCtrl.getNaam():'')});
      var vt=document.getElementById('bg-doc-tekst').value;
      // BEM naar opdrachtgever: koper als koper opdrachtgever is, anders verkoper
      var toList;
      if(type==='bem'){
        if(isSell){
          // Sell-side: BEM naar verkoper (contact)
          toList=[t2.contact_email,t2.begeleider_email].filter(Boolean);
        } else {
          // Buy-side: BEM naar koper
          toList=[t2.koper_email,t2.begeleider_email].filter(Boolean);
        }
      } else {
        toList=[t2.contact_email,t2.begeleider_email,t2.koper_email].filter(Boolean);
      }
      var epMap={nda:'/mna/nda/email',loi:'/mna/loi/email',bem:'/mna/bem/email',excl:'/mna/exclusief/email'};
      var ep=epMap[type]||'/mna/bem/email';
      var payload={code:S.traject.id,to:toList};
      if(type==='nda')payload.nda_tekst=vt;
      else if(type==='loi'){payload.loi_tekst=vt;payload.goedgekeurd_door=bgGoedkeuringCtrl?bgGoedkeuringCtrl.getNaam():'';}
      else if(type==='excl')payload.excl_tekst=vt;
      else{payload.bem_tekst=vt;payload.type=isSell?'verkoop':'aankoop';}
      if(bgPdfStaat.base64){payload.eigen_pdf_base64=bgPdfStaat.base64;payload.eigen_pdf_naam=bgPdfStaat.naam;payload.eigen_pdf_mime=bgPdfStaat.mime;}
      var er=await fetch(WORKER+ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      var ed=await er.json();
      if(ed.ok){ebtn.textContent='✓ Verstuurd';}else{toast('Fout: '+(ed.error||'onbekend'),'err');ebtn.disabled=false;ebtn.textContent='✉ Verstuur';}
    };
    // Handmatig markeren als getekend buiten Signhost om (bijv. per post of los ondertekend) —
    // hergebruikt het bestaande /mna/teken-endpoint dat de begeleider-rol al volledig tekenrecht geeft.
    // Let op: geen native prompt()/confirm() gebruiken — die worden in sommige browsercontexten
    // stilzwijgend geblokkeerd (knop lijkt dan "geen reactie" te geven); vaste in-pagina modal i.p.v.
    var handmatigBtn=document.getElementById('bg-handmatig-getekend');
    if(handmatigBtn)handmatigBtn.onclick=function(){
      var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
      var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','handmatig-getekend-modal-titel');mo.style.cssText='background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.25)';
      mo.innerHTML='<div id="handmatig-getekend-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:1rem">&#128221; Buiten Signhost om getekend &mdash; '+(labels[type]||type)+'</div>'
        +'<div class="field"><label>Naam van degene die getekend heeft</label><input type="text" id="bg-hg-naam"></div>'
        +'<div id="bg-hg-err" style="display:none;color:var(--red);font-size:12px;margin-bottom:.5rem"></div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end">'
        +'<button class="btn-ghost" id="bg-hg-ann">Annuleren</button>'
        +'<button class="btn" id="bg-hg-ok">Vastleggen</button>'
        +'</div>';
      ov.appendChild(mo);document.body.appendChild(ov);
      ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
      document.getElementById('bg-hg-ann').onclick=function(){document.body.removeChild(ov);};
      var naamInput=document.getElementById('bg-hg-naam');
      naamInput.focus();
      document.getElementById('bg-hg-ok').onclick=async function(){
        var naam=naamInput.value.trim();
        var errEl=document.getElementById('bg-hg-err');
        if(!naam){errEl.style.display='block';errEl.textContent='Naam verplicht';return;}
        var btn=this;btn.disabled=true;btn.textContent='Vastleggen...';
        var r=await fetch(WORKER+'/mna/teken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,document:type,naam:naam})}).then(function(x){return x.json();}).catch(function(){return{};});
        if(r.ok){
          document.body.removeChild(ov);
          toast('Vastgelegd: '+(labels[type]||type)+' getekend door '+naam,'ok');
          handmatigBtn.disabled=true;handmatigBtn.textContent='✓ Getekend vastgelegd';handmatigBtn.style.opacity='.5';
          if(bgDocToggle&&bgDocBody&&bgDocBody.style.display!=='none')bgDocToggle.click();
        }
        else{errEl.style.display='block';errEl.textContent=r.error||'Onbekende fout';btn.disabled=false;btn.textContent='Vastleggen';}
      };
    };
    // Signhost handler
    var shBtn=document.getElementById('bg-signhost');
    if(shBtn)shBtn.onclick=function(){
      var tekst=document.getElementById('bg-doc-tekst').value;
      var labels={nda:'NDA',loi:'LoI',bem:'Bemiddelingsovereenkomst',exclusief:'Exclusiviteitsbrief'};
      // BEM naar de daadwerkelijke opdrachtgever: bij sell-side is dat de verkoper (contact),
      // bij buy-side de koper — zelfde isSell-logica als bij het e-mail-versturen hierboven.
      var defEmail=type==='bem'?(isSell?(t2.contact_email||''):(t2.koper_email||'')):(t2.contact_email||'');
      var defNaam=type==='bem'?(isSell?(t2.contact_naam||''):(t2.koper_contact||t2.koper_naam||'')):(t2.contact_naam||'');
      var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
      var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','signhost-modal-titel');mo.style.cssText='background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.25)';
      mo.innerHTML='<div id="signhost-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:1rem">&#9998; Verstuur via Signhost &mdash; '+(labels[type]||type)+'</div>'
        +'<div class="field"><label>Naam ondertekenaar</label><input type="text" id="bg-sh-naam" value="'+esc(defNaam)+'" placeholder="Voor- en achternaam"></div>'
        +'<div class="field"><label>E-mail ondertekenaar</label><input type="email" id="bg-sh-email" value="'+esc(defEmail)+'" placeholder="E-mailadres"></div>'
        +'<div id="bg-sh-err" style="display:none;color:var(--red);font-size:12px;margin-bottom:.5rem"></div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end">'
        +'<button class="btn-ghost" id="bg-sh-ann">Annuleren</button>'
        +'<button class="btn" id="bg-sh-ok" style="background:var(--teal)">&#9998; Verstuur via Signhost</button>'
        +'</div>';
      ov.appendChild(mo);document.body.appendChild(ov);
      ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
      document.getElementById('bg-sh-ann').onclick=function(){document.body.removeChild(ov);};
      document.getElementById('bg-sh-ok').onclick=async function(){
        var btn=this;btn.disabled=true;btn.textContent='Versturen...';
        var naam=document.getElementById('bg-sh-naam').value.trim();
        var email=document.getElementById('bg-sh-email').value.trim();
        var errEl=document.getElementById('bg-sh-err');
        if(!email){errEl.style.display='block';errEl.textContent='E-mail verplicht';btn.disabled=false;btn.textContent='Verstuur';return;}
        if(type==='loi')secAuditLog('interne_goedkeuring',{document_type:'loi',verzendkanaal:'signhost',goedgekeurd_door:(bgGoedkeuringCtrl?bgGoedkeuringCtrl.getNaam():'')});
        var r=await fetch(WORKER+'/mna/signhost/stuur',{method:'POST',
          headers:{'Content-Type':'application/json','x-tussen-key':S.code},
          body:JSON.stringify({code:S.traject.id,doc_type:type,ondertekenaar_naam:naam,ondertekenaar_email:email,doc_tekst:tekst})});
        var rd=await r.json();
        if(rd.ok){
          document.body.removeChild(ov);
          toast('&#10003; '+(labels[type]||type)+' verstuurd via Signhost naar '+email,'ok',5000);
          // Disable Signhost knop om dubbel versturen te voorkomen
          var shBtnEl=document.getElementById('bg-signhost');
          if(shBtnEl){shBtnEl.disabled=true;shBtnEl.innerHTML='&#10003; Verstuurd';shBtnEl.style.opacity='.5';}
          if(bgDocToggle&&bgDocBody&&bgDocBody.style.display!=='none')bgDocToggle.click();
        }
        else{errEl.style.display='block';errEl.textContent=rd.error||'Fout';btn.disabled=false;btn.textContent='Verstuur';}
      };
    };
  }

  // ===== DEALVOORSTEL: parameterformulier + generatie =====
  function toonDealvoorstelModal(){
    var t2=S.traject||{};
    var d=dvGetDefaults();
    // Audit-fix P2 (25 juli 2026, vierde ronde): waren hardcoded hex-kleuren (toevallig exact gelijk
    // aan de light-theme CSS-variabelen) i.p.v. var(--muted)/var(--card)/var(--border2) — brak het
    // contrast in dark mode voor alle 16 nieuwe Dealvoorstel-velden van vandaag.
    var lbl='font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px';
    var inp='width:100%;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px';
    // Audit-fix P2 (25 juli 2026, vierde ronde): label-for-koppeling (screenreader weet welk veld bij
    // welk label hoort) op alle 16 nieuwe velden.
    function veld(id,label,val,step){
      return '<div style="flex:1"><label for="'+id+'" style="'+lbl+'">'+label+'</label><input type="number" id="'+id+'" value="'+val+'" '+(step?'step="'+step+'"':'')+' style="'+inp+'"></div>';
    }
    // Audit-fix P3 (25 juli 2026, vijfde ronde): 16 altijd-zichtbare velden liepen ongegroepeerd
    // onder elkaar door — cognitieve overload. Puur visuele sectiekopjes toegevoegd, geen enkel
    // veld-ID of de rekenlogica in dv-ok hieronder is aangeraakt.
    var sectieHdr='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--gold-dark);margin:1.15rem 0 .5rem;padding-top:.85rem;border-top:1px solid var(--border2)';
    function sectie(titel){ return '<div style="'+sectieHdr+'">'+titel+'</div>'; }
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','dv-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:640px;width:100%;max-height:92vh;overflow-y:auto';
    mo.innerHTML='<div id="dv-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#128202; Dealvoorstel — dealparameters</div>'
      +'<div style="font-size:12px;color:#8a8880;margin-bottom:1.25rem">Deze cijfers worden exact zo berekend en meegenomen — de AI verzint geen eigen bedragen of multiples.</div>'
      +'<div style="margin-bottom:1rem"><label style="'+lbl+'">Tegenpartij (koper)</label><input type="text" id="dv-koper" value="'+esc(d.koperNaam)+'" placeholder="Naam kopende partij" style="'+inp+'"></div>'
      +sectie('EBITDA & belang')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-belang','Belang koper bij closing (%)',d.belangPct)+veld('dv-ebitda-bewezen','Bewezen EBITDA laatste boekjaar (€)',d.ebitdaBewezen)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-ebitda-prognose','Prognose-EBITDA komend jaar (€)',d.ebitdaPrognose)+veld('dv-cliff','Cliff-drempel (% van prognose)',d.cliffPct)+'</div>'
      +sectie('Multiples & earn-out')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-mult-basis','Basis-multiple (bewezen)',d.multipleBasis,0.1)+veld('dv-mult-boven','Bovengrens-multiple (bij prognose)',d.multipleBovengrens,0.1)+'</div>'
      +sectie('Escrow')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-escrow-pct','Escrow (%)',d.escrowPct)+veld('dv-escrow-mnd','Escrow-duur (maanden)',d.escrowMaanden)+'</div>'
      +sectie('Financiering')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-leverage','Bankfinanciering (× bewezen EBITDA)',d.bankLeverage,0.1)+veld('dv-rente','Rente (%)',d.rentePct,0.1)+'</div>'
      +sectie('Fiscaal & operationeel')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-vpb','VpB-tarief (%)',d.vpbPct,0.1)+veld('dv-capex','Capex (% van EBITDA)',d.capexPct,0.1)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-groei','Organische groei (%/jaar)',d.groeiPct,0.1)+veld('dv-horizon','Horizon schuldafbouw (jaren)',d.horizonJaren)+'</div>'
      +sectie('Kruiscontrole')
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-discontovoet','Discontovoet (%) — handmatige aanname, geen berekende WACC — voor DCF-kruiscontrole',d.discontovoetPct,0.1)+'<div style="flex:1"></div></div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-bab-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Buy-and-build platformscenario meenemen</label>'
      +'<div id="dv-bab-velden" style="display:none">'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-bab-nper','Overnames per jaar',d.baOvernamesPerJaar)+veld('dv-bab-omvang','Gem. EBITDA per overname (€)',d.baOmvangEbitda)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-bab-mult','Acquisitiemultiple',d.baAcqMultiple,0.1)+veld('dv-bab-max','Doel-platformmultiple bij schaal',d.baPlatformMultipleMax,0.1)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-bab-acqschuld','Acquisitieschuld (% van acquisitiewaarde)',d.baAcqSchuldPct)+veld('dv-bab-aflossing','Jaarlijkse aflossing bestaande schuld (%)',d.baAflossingPct)+'</div>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-vl-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Vendor loan (verkoperslening) meenemen</label>'
      +'<div id="dv-vl-velden" style="display:none">'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-vl-bedrag','Bedrag vendor loan (€)',0)+veld('dv-vl-rente','Rente (%)',d.vendorLoanRentePct,0.1)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-vl-jaren','Looptijd (jaren)',d.vendorLoanJaren)+'<div style="flex:1"></div></div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-vl-aflvrij" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Aflossingsvrij (bullet-aflossing hoofdsom in laatste jaar) — anders lineaire aflossing</label>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-alt-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Alternatieve waarderingsmethodes tonen (asset-based / liquidatiewaarde / goodwill)</label>'
      +'<div id="dv-alt-velden" style="display:none">'
      +'<div style="font-size:11px;color:#8a8880;margin-bottom:.75rem">Intrinsieke waarde komt automatisch uit het ingevulde eigen vermogen (DD-fase Financieel). De percentages hieronder zijn geen vastgestelde branchenorm — vul ze zelf in op basis van uw eigen inschatting.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-liq-deb','Liquidatiewaarde: debiteuren inbaar (%)',d.liqDebiteurenPct)+veld('dv-liq-wip','Liquidatiewaarde: OHW inbaar (%)',d.liqWipPct)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-liq-kosten','Liquidatiekosten (% van activa)',d.liqKostenPct)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin:-.5rem 0 .4rem">Goodwill — overwinstmethode: overwinst = nettowinst - (normrendement &times; eigen vermogen); goodwill = overwinst / kapitalisatievoet. Beide percentages zelf te bepalen, geen ingebouwde norm.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-goodwill-normrendement','Normrendement op eigen vermogen (%)',d.goodwillNormrendementPct)+veld('dv-goodwill-kapitalisatie','Kapitalisatievoet (%)',d.goodwillKapitalisatievoetPct)+'</div>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-syn-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Synergie-analyse meenemen (kosten- en omzetsynergieën, NPV)</label>'
      +'<div id="dv-syn-velden" style="display:none">'
      +'<div style="font-size:11px;color:#8a8880;margin-bottom:.75rem">Bedragen zijn eigen inschattingen, geen automatische berekening.'+((S.data&&S.data.commercieel_crossSell)?' Ter referentie: ingevulde cross-sell-DD ('+esc(S.data.commercieel_crossSell)+'%) is niet automatisch vertaald naar een omzetsynergie-bedrag — bepaal dat zelf.':'')+' Synergieën bouwen lineair op tot het volledige jaarbedrag na de realisatietermijn, en worden verdisconteerd tegen de discontovoet hierboven.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-syn-kosten','Kostensynergie op jaarbasis (€, volledig gerealiseerd)',d.synergieKostenJaarlijks)+veld('dv-syn-omzet','Omzetsynergie op jaarbasis (€, volledig gerealiseerd)',d.synergieOmzetJaarlijks)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-syn-realisatie','Realisatietermijn (jaren tot volledig)',d.synergieRealisatieJaren)+veld('dv-syn-implementatie','Eenmalige implementatiekosten (€)',d.synergieImplementatiekosten)+'</div>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-scen-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> Scenarioanalyse tonen (downside/base/upside op de groeivoet)</label>'
      +'<div id="dv-scen-velden" style="display:none">'
      +'<div style="font-size:11px;color:#8a8880;margin-bottom:.75rem">Breder dan de gevoeligheidstabel hieronder (die alleen EBITDA×multiple varieert): hier groeit de bewezen EBITDA over de volledige horizon door met een af- of opwaartse afwijking op de groeivoet.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-scen-delta','Downside/upside-afwijking op groeivoet (procentpunt, zelf in te stellen)',d.scenarioGroeiDeltaPct,0.5)+'<div style="flex:1"></div></div>'
      +'</div>'
      +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);margin-bottom:1rem;cursor:pointer"><input type="checkbox" id="dv-dcfgv-aan" style="width:15px;height:15px;accent-color:var(--gold-dark)"> DCF-gevoeligheidsmatrix tonen (WACC × groeivoet)</label>'
      +'<div id="dv-dcfgv-velden" style="display:none">'
      +'<div style="font-size:11px;color:#8a8880;margin-bottom:.75rem">Houdt de FCF-projectie vast en varieert alleen de discontovoet en de terminale groeivoet bij het contant maken — de twee aannames waar de DCF-uitkomst het gevoeligst voor is. Bandbreedtes zelf in te stellen, geen norm.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('dv-dcfgv-wacc','WACC-bandbreedte (± procentpunt)',d.dcfWaccDeltaPct,0.5)+veld('dv-dcfgv-groei','Groeivoet-bandbreedte (± procentpunt)',d.dcfGroeiDeltaPct,0.5)+'</div>'
      +'</div>'
      +'<div id="dv-err" style="display:none;color:#e05252;font-size:12px;margin-bottom:.75rem"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button id="dv-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'
      +'<button id="dv-ok" style="background:#8a5a00;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">&#128202; Genereren</button>'
      +'</div>';
    ov.appendChild(mo);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('dv-ann').onclick=function(){document.body.removeChild(ov);};
    document.getElementById('dv-bab-aan').onchange=function(){document.getElementById('dv-bab-velden').style.display=this.checked?'block':'none';};
    document.getElementById('dv-vl-aan').onchange=function(){document.getElementById('dv-vl-velden').style.display=this.checked?'block':'none';};
    document.getElementById('dv-alt-aan').onchange=function(){document.getElementById('dv-alt-velden').style.display=this.checked?'block':'none';};
    document.getElementById('dv-syn-aan').onchange=function(){document.getElementById('dv-syn-velden').style.display=this.checked?'block':'none';};
    document.getElementById('dv-scen-aan').onchange=function(){document.getElementById('dv-scen-velden').style.display=this.checked?'block':'none';};
    document.getElementById('dv-dcfgv-aan').onchange=function(){document.getElementById('dv-dcfgv-velden').style.display=this.checked?'block':'none';};

    document.getElementById('dv-ok').onclick=async function(){
      var btn=this;btn.disabled=true;btn.textContent='Genereren... (20-40 sec)';
      var errEl=document.getElementById('dv-err');errEl.style.display='none';
      var p={
        koperNaam:document.getElementById('dv-koper').value.trim()||'de koper',
        belangPct:parseFloat(document.getElementById('dv-belang').value)||51,
        ebitdaBewezen:parseFloat(document.getElementById('dv-ebitda-bewezen').value)||0,
        ebitdaPrognose:parseFloat(document.getElementById('dv-ebitda-prognose').value)||0,
        cliffPct:parseFloat(document.getElementById('dv-cliff').value)||70,
        multipleBasis:parseFloat(document.getElementById('dv-mult-basis').value)||4.5,
        multipleBovengrens:parseFloat(document.getElementById('dv-mult-boven').value)||5.5,
        escrowPct:parseFloat(document.getElementById('dv-escrow-pct').value)||12,
        escrowMaanden:parseFloat(document.getElementById('dv-escrow-mnd').value)||18,
        bankLeverage:parseFloat(document.getElementById('dv-leverage').value)||2,
        rentePct:parseFloat(document.getElementById('dv-rente').value)||5,
        vpbPct:parseFloat(document.getElementById('dv-vpb').value)||25.8,
        capexPct:parseFloat(document.getElementById('dv-capex').value)||1.5,
        groeiPct:parseFloat(document.getElementById('dv-groei').value)||4,
        horizonJaren:parseInt(document.getElementById('dv-horizon').value)||5,
        discontovoetPct:parseFloat(document.getElementById('dv-discontovoet').value)||12,
        buyAndBuild:document.getElementById('dv-bab-aan').checked,
        baOvernamesPerJaar:parseFloat(document.getElementById('dv-bab-nper').value)||2,
        baOmvangEbitda:parseFloat(document.getElementById('dv-bab-omvang').value)||1400000,
        baAcqMultiple:parseFloat(document.getElementById('dv-bab-mult').value)||5.5,
        baPlatformMultipleMax:parseFloat(document.getElementById('dv-bab-max').value)||9.5,
        baAcqSchuldPct:parseFloat(document.getElementById('dv-bab-acqschuld').value)||55,
        baAflossingPct:parseFloat(document.getElementById('dv-bab-aflossing').value)||15,
        vendorLoanAan:document.getElementById('dv-vl-aan').checked,
        vendorLoanBedrag:parseFloat(document.getElementById('dv-vl-bedrag').value)||0,
        vendorLoanRentePct:parseFloat(document.getElementById('dv-vl-rente').value)||6,
        vendorLoanJaren:parseInt(document.getElementById('dv-vl-jaren').value)||5,
        vendorLoanAflossingsvrij:document.getElementById('dv-vl-aflvrij').checked,
        altWaarderingAan:document.getElementById('dv-alt-aan').checked,
        liqDebiteurenPct:parseFloat(document.getElementById('dv-liq-deb').value)||0,
        liqWipPct:parseFloat(document.getElementById('dv-liq-wip').value)||0,
        liqKostenPct:parseFloat(document.getElementById('dv-liq-kosten').value)||0,
        goodwillNormrendementPct:parseFloat(document.getElementById('dv-goodwill-normrendement').value)||0,
        goodwillKapitalisatievoetPct:parseFloat(document.getElementById('dv-goodwill-kapitalisatie').value)||0,
        synergieAan:document.getElementById('dv-syn-aan').checked,
        synergieKostenJaarlijks:parseFloat(document.getElementById('dv-syn-kosten').value)||0,
        synergieOmzetJaarlijks:parseFloat(document.getElementById('dv-syn-omzet').value)||0,
        synergieRealisatieJaren:parseInt(document.getElementById('dv-syn-realisatie').value)||2,
        synergieImplementatiekosten:parseFloat(document.getElementById('dv-syn-implementatie').value)||0,
        scenarioAan:document.getElementById('dv-scen-aan').checked,
        scenarioGroeiDeltaPct:parseFloat(document.getElementById('dv-scen-delta').value)||5,
        dcfGevoeligheidAan:document.getElementById('dv-dcfgv-aan').checked,
        dcfWaccDeltaPct:parseFloat(document.getElementById('dv-dcfgv-wacc').value)||2,
        dcfGroeiDeltaPct:parseFloat(document.getElementById('dv-dcfgv-groei').value)||1
      };
      if(!p.ebitdaBewezen||!p.ebitdaPrognose){
        errEl.textContent='Vul zowel de bewezen als de prognose-EBITDA in.';errEl.style.display='block';
        btn.disabled=false;btn.textContent='📊 Genereren';return;
      }
      if(p.vendorLoanAan&&!p.vendorLoanBedrag){
        errEl.textContent='Vendor loan staat aan, maar er is geen bedrag ingevuld.';errEl.style.display='block';
        btn.disabled=false;btn.textContent='📊 Genereren';return;
      }
      try{
        var prijsmechanisme=dvBerekenPrijsmechanisme(p);
        var closing=dvBerekenClosing(p);
        var schuldafbouw=dvBerekenSchuldafbouw(p,closing);
        var buyAndBuildRows=p.buyAndBuild?dvBerekenBuyAndBuild(p,schuldafbouw[schuldafbouw.length-1],closing.deelKoperBasis):null;
        var vendorLoanRows=dvBerekenVendorLoan(p);
        var altWaardering=p.altWaarderingAan?dvBerekenAlternatieveWaarderingen(p):null;
        var synergie=dvBerekenSynergie(p);
        var scenarios=dvBerekenScenarios(p);
        var dcfGevoeligheid=p.dcfGevoeligheidAan?dvBerekenDCFGevoeligheid(p,schuldafbouw):null;
        var gevoeligheid=dvBerekenGevoeligheid(p);
        var dcf=dvBerekenDCF(p,schuldafbouw);
        var tabelMap={
          CIJFERS:dvTabelCijfers(),
          CIJFEROVERZICHT:dvTabelCijferoverzicht(),
          GEVOELIGHEID:dvTabelGevoeligheid(gevoeligheid),
          TREND:dvTabelTrend(),
          VERGELIJKBAAR:dvBlokVergelijkbareTransacties(),
          PRIJSMECHANISME:dvTabelPrijsmechanisme(prijsmechanisme),
          CLOSING:dvTabelClosing(closing),
          DCF:dvTabelDCF(dcf),
          SCHULDAFBOUW:dvTabelSchuldafbouw(schuldafbouw),
          BUYANDBUILD:buyAndBuildRows?dvTabelBuyAndBuild(buyAndBuildRows):'',
          VENDORLOAN:vendorLoanRows?dvTabelVendorLoan(vendorLoanRows):'',
          ALTWAARDERING:altWaardering?dvTabelAlternatieveWaarderingen(altWaardering,p):'',
          SYNERGIE:synergie?dvTabelSynergie(synergie):'',
          SCENARIOS:scenarios?dvTabelScenarios(scenarios,p):'',
          DCFGEVOELIGHEID:dcfGevoeligheid?dvTabelDCFGevoeligheid(dcfGevoeligheid):''
        };
        var sectorProfiel=getSectorProfiel();
        var contextBlok='Sector: '+(sectorProfiel.label||'MKB')+'. Verkopende partij: '+(t2.kantoor_naam||S.code)+'. Kopende partij: '+p.koperNaam+'.\n'
          +'Bewezen EBITDA laatste boekjaar: €'+Math.round(p.ebitdaBewezen)+'. Prognose-EBITDA komend jaar: €'+Math.round(p.ebitdaPrognose)+'.\n'
          +'Gewenst belang koper bij closing: '+p.belangPct+'%. Basis-multiple: '+p.multipleBasis+'×. Bovengrens-multiple: '+p.multipleBovengrens+'×. Cliff-drempel: '+p.cliffPct+'% van de prognose.\n'
          +'Escrow: '+p.escrowPct+'% gedurende '+p.escrowMaanden+' maanden. Bankfinanciering bij closing: '+p.bankLeverage+'× de bewezen EBITDA.\n'
          +'Bedrag bij closing (koper, op bewezen basis): €'+Math.round(closing.deelKoperBasis)+'. Mogelijke earn-up bij volledige realisatie: €'+Math.round(closing.earnUp)+'.\n'
          +'DCF-kruiscontrole (discontovoet '+p.discontovoetPct+'%): ondernemingswaarde DCF '+(dcf.geldig?'€'+Math.round(dcf.evDcf):'n.v.t. (discontovoet ≤ groeivoet, Gordon Growth-formule ongeldig bij deze combinatie)')+' t.o.v. ondernemingswaarde EBITDA-multiple (bewezen) €'+Math.round(closing.evBasis)+'.\n'
          +'Transactiestructuur: koper verwerft '+p.belangPct+'% bij closing; de verkopende partij behoudt '+(100-p.belangPct)+'%.'
          +(vendorLoanRows?('\nVendor loan (verkoperslening): €'+Math.round(p.vendorLoanBedrag)+' tegen '+p.vendorLoanRentePct+'% rente, looptijd '+p.vendorLoanJaren+' jaar, '+(p.vendorLoanAflossingsvrij?'aflossingsvrij met bullet-aflossing van de hoofdsom in het laatste jaar':'lineaire jaarlijkse aflossing')+'. Dit is een door de verkopende partij aan de koper verstrekte, achtergestelde lening — een aparte verplichting naast de bankfinanciering.'):'')
          +(altWaardering?('\nAlternatieve waarderingsmethodes (ter controle naast de EBITDA-multiple hierboven): intrinsieke waarde (netto vermogenswaarde) '+(altWaardering.intrinsiek!==null?'€'+Math.round(altWaardering.intrinsiek):'onbekend, eigen vermogen niet ingevuld')+'; liquidatiewaarde '+(altWaardering.liquidatiewaarde!==null?'€'+Math.round(altWaardering.liquidatiewaarde)+' (op basis van zelf ingevoerde aannames: '+p.liqDebiteurenPct+'% debiteuren inbaar, '+p.liqWipPct+'% OHW inbaar, '+p.liqKostenPct+'% liquidatiekosten — geen vastgestelde branchenorm)':'onbekend, balansvelden niet volledig ingevuld')+'; goodwill via de overwinstmethode '+(altWaardering.goodwill!==null?'€'+Math.round(altWaardering.goodwill)+' (genormaliseerde nettowinst €'+Math.round(altWaardering.nettowinstNorm)+' minus normale winst €'+Math.round(altWaardering.normaleWinst)+' bij '+p.goodwillNormrendementPct+'% normrendement = overwinst €'+Math.round(altWaardering.overwinst)+', gekapitaliseerd tegen '+p.goodwillKapitalisatievoetPct+'% — beide percentages zelf gekozen aannames, geen branchenorm)':'niet berekend, nettoresultaat/eigen vermogen/percentages niet volledig ingevoerd')+'.'):'')
          +(synergie?('\nSynergie-analyse: kostensynergie €'+Math.round(p.synergieKostenJaarlijks)+'/jaar en omzetsynergie €'+Math.round(p.synergieOmzetJaarlijks)+'/jaar op volle kracht (vóór belasting), opgebouwd over '+p.synergieRealisatieJaren+' jaar, eenmalige implementatiekosten €'+Math.round(p.synergieImplementatiekosten)+'. NPV van de synergieën over de horizon van '+p.horizonJaren+' jaar (na '+p.vpbPct+'% belasting, tegen dezelfde discontovoet als de DCF): €'+Math.round(synergie.npv)+'. Deze bedragen zijn eigen inschattingen van de begeleider, geen automatische berekening uit de DD-data.'):'')
          +(scenarios?('\nScenarioanalyse (downside/base/upside, '+p.scenarioGroeiDeltaPct+' procentpunt afwijking op de groeivoet, zelf ingestelde bandbreedte): '+scenarios.map(function(s){return s.label+' — groeivoet '+s.groeiPct.toFixed(1)+'%/jaar, EBITDA na '+p.horizonJaren+' jaar €'+Math.round(s.ebitdaEind)+', ondernemingswaarde €'+Math.round(s.waardeLaag)+'–€'+Math.round(s.waardeHoog);}).join('; ')+'.'):'')
          +(dcfGevoeligheid?('\nDCF-gevoeligheidsmatrix: WACC-bandbreedte ±'+p.dcfWaccDeltaPct+' procentpunt rond '+p.discontovoetPct+'%, groeivoet-bandbreedte ±'+p.dcfGroeiDeltaPct+' procentpunt rond '+p.groeiPct+'% (zelf ingestelde bandbreedtes, geen norm) — de matrix zelf staat in de tabel, benoem alleen dat de uitkomst het gevoeligst is voor deze twee aannames.'):'');
        var koppen='## Managementsamenvatting\n(3-5 bullets over de kern van het voorstel, dan één alinea "In één zin")\n\n'
          +'## Uitgangspunten & de cijfers\n(korte toelichting op de omzet-/EBITDA-ontwikkeling)\n[TABEL:CIJFERS]\n\n'
          +'## Cijferoverzicht & interpretatie\n(bespreek feitelijk wat de aangeleverde cijfers hieronder betekenen voor risico en waardering — klantconcentratie, recurring omzet, partnerafhankelijkheid, personeelskosten; herhaal en duid alleen wat er staat, verzin niets)\n[TABEL:CIJFEROVERZICHT]\n\n'
          +'## Waardering: marktonderbouwing\n(leg uit waarom deze multiple-range past bij de sector en de EBITDA-marge; gebruik de sectornormen)\n\n'
          +(altWaardering?'## Alternatieve waarderingsmethodes\n(toon deze drie methodes als controle naast de EBITDA-multiple hierboven — benoem expliciet dat de liquidatie- en goodwill-percentages zelf gekozen aannames zijn en GEEN vastgestelde branchenorm; verzin geen ander percentage dan wat in de context staat)\n[TABEL:ALTWAARDERING]\n\n':'')
          +(synergie?'## Synergie-analyse\n(leg uit dat kosten- en omzetsynergieën stapsgewijs oplopen tot volledige realisatie, en interpreteer de NPV — benoem expliciet dat dit eigen inschattingen van de begeleider zijn, geen berekening uit de due-diligence-data)\n[TABEL:SYNERGIE]\n\n':'')
          +'## Gevoeligheidsanalyse\n(korte toelichting hoe de ondernemingswaarde varieert met EBITDA-realisatie en multiple)\n[TABEL:GEVOELIGHEID]\n\n'
          +(scenarios?'## Scenarioanalyse: downside/base/upside\n(leg uit dat dit een bredere scenarioanalyse is dan de gevoeligheidstabel hierboven — hier groeit de EBITDA over de volledige horizon door bij een af- of opwaartse groeivoet; benoem expliciet dat de bandbreedte een zelf ingestelde aanname is, geen vastgestelde norm)\n[TABEL:SCENARIOS]\n\n':'')
          +'## Meerjarige trend\n(korte toelichting op de omzetgroei over de jaren; vermeld expliciet dat de EBITDA-marge maar over één jaar bekend is)\n[TABEL:TREND]\n\n'
          +'## Vergelijkbare transacties\n(leg in 2-3 zinnen uit hoe de gekozen multiple-range zich verhoudt tot onderstaande sectorreferenties; verzin geen eigen transacties, gebruik uitsluitend de tekst hieronder)\n[TABEL:VERGELIJKBAAR]\n\n'
          +'## Prijsmechanisme\n(leg uit hoe de multiple meebeweegt met de gerealiseerde EBITDA, en waarom de cliff-drempel de koper beschermt)\n[TABEL:PRIJSMECHANISME]\n\n'
          +'## Bedrag bij closing en earn-up\n(toelichting op het bedrag bij closing en de gefaseerde afrekening bij realisatie)\n[TABEL:CLOSING]\n\n'
          +'## Kruiscontrole: DCF versus EBITDA-multiple\n(leg uit hoe de DCF-uitkomst zich verhoudt tot de multiple-waardering — noem beide bedragen uit de context en interpreteer het verschil, verzin geen eigen bedragen)\n[TABEL:DCF]\n\n'
          +(dcfGevoeligheid?'## DCF-gevoeligheid: WACC × groeivoet\n(leg uit dat de DCF-uitkomst het gevoeligst is voor de discontovoet en de terminale groeivoet — interpreteer de matrix, benoem "n.v.t."-cellen als een teken dat die combinatie wiskundig ongeldig is (WACC moet hoger zijn dan de groeivoet), verzin geen eigen getallen)\n[TABEL:DCFGEVOELIGHEID]\n\n':'')
          +'## Closing-mechanismen\n(kort: locked box, escrow, garanties — gebruik de escrow-cijfers hierboven)\n\n'
          +'## Financiering en kasstroom\n(toelichting op het schuldafbouwmodel)\n[TABEL:SCHULDAFBOUW]\n\n'
          +(p.buyAndBuild?'## Buy-and-build: platformscenario\n(korte toelichting op het groeiscenario via overnames)\n[TABEL:BUYANDBUILD]\n\n':'')
          +(vendorLoanRows?'## Vendor loan: aflossingsschema\n(leg uit dat dit een door de verkopende partij verstrekte, achtergestelde lening aan de koper is — los van de bankfinanciering — en toon het jaarlijkse rente-/aflossingsverloop uit de tabel)\n[TABEL:VENDORLOAN]\n\n':'')
          +'## Transactiestructuur\n(beschrijf beknopt de aandelenverhouding bij closing op basis van het belang-percentage in de context, en het gangbare gebruik van een acquisitievehikel/holding zodat de overnamefinanciering niet drukt op het belang van de achterblijvende verkoper; geen eigen bedragen verzinnen buiten de context)\n\n'
          +'## Retentie & alignment van de verkopende partij\n(leg uit — in algemene, standaard M&A-termen — waarom het gefaseerd uitkeren van de earn-up, een lock-up op het achtergebleven belang, en het koppelen van de einduitkering aan aanblijven/integratie de continuïteit van de onderneming beschermt; generiek, geen nieuwe cijfers)\n\n'
          +'## Governance & exit\n(kort: reguliere meerderheid voor de dagelijkse gang van zaken bij de koper, een versterkte meerderheid voor de verkopende partij op kernbesluiten, en een geordend exit-pad na een aantal jaren via vooraf afgesproken voorwaarden; generiek, geen nieuwe cijfers)\n\n'
          +'## Risicodekking samengevat\n(vat in bullets samen hoe de eerdere hoofdstukken het risico van de koper afdekken: de meebewegende prijs met ondergrens, betalen op bewezen basis, de escrow, en de EBITDA-definitie/controle — verwijs terug naar wat al genoemd is, verzin niets nieuws)\n\n'
          +'## Waarom dit werkt voor beide partijen\n(twee korte alinea\'s: perspectief verkopende partij, perspectief koper — gebruik de bedragen uit de context)\n\n'
          +'## Risico\'s & aandachtspunten\n(4-6 concrete, genummerde aandachtspunten)\n\n'
          +'## Aandachtspunten & vervolgstappen\n(genummerde praktische checklist voor de komende stappen: termsheet, due diligence, uitwerken retentiepakket, SPA en closing-mechanismen, financiering regelen — generiek maar concreet)';
        var prompt='Je bent ' + (t2.begeleider_naam||BRAND.contactpersoon) + ', senior M&A-adviseur bij ' + (t2.begeleider_bedrijf||BRAND.bedrijf) + '. Schrijf de verhalende hoofdstukken van een vertrouwelijk dealvoorstel.\n\n'
          +'BELANGRIJK: gebruik uitsluitend de cijfers hieronder. Verzin GEEN eigen bedragen, percentages, multiples of vergelijkbare transacties — die liggen al vast in de berekende tabellen die apart worden ingevoegd op de plek van [TABEL:xxx]-markeringen. Laat die markeringen exact zo staan (op een eigen regel), vervang ze niet door eigen tekst of tabellen.\n\n'
          +'CONTEXT:\n'+contextBlok+'\n\n'
          +'Schrijf onderstaande hoofdstukken met ## koppen, zakelijk Nederlands, geen overdreven bijvoeglijke naamwoorden, max 1500 woorden tekst in totaal (exclusief tabelmarkeringen):\n\n'+koppen;
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:8000})});
        var rd=await resp.json();
        var bodyHtml=dvBouwRapportHtml(rd.text||'',tabelMap);
        document.body.removeChild(ov);
        var out=document.getElementById('bg-doc-out');
        out.style.display='block';
        var titel='Dealvoorstel — '+(t2.kantoor_naam||S.code);
        out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
          +'<div style="font-size:11px;font-weight:600;color:var(--gold-dark);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">Dealvoorstel gegenereerd</div>'
          +'<div style="font-size:11px;color:var(--teal);margin-bottom:.5rem">&#9998; Klik in de tekst hieronder om aan te passen vóór verzending.</div>'
          +'<div id="dv-preview" contenteditable="true" style="max-height:400px;overflow-y:auto;overflow-x:auto;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:1.25rem;font-family:Georgia,serif;font-size:12px;line-height:1.7;color:var(--sub);outline:none" onfocus="this.style.borderColor=\'var(--teal)\'" onblur="this.style.borderColor=\'var(--border2)\'">'+bodyHtml+'</div>'
          +akkoordHtml('dv-doc-akkoord')
          +'<div style="display:flex;gap:8px;margin-top:.75rem">'
          +'<button id="dv-print" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128196; Print</button>'
          +'<button id="dv-email" class="btn" style="font-size:12px;padding:6px 14px;background:#8a5a00">&#9993; Verstuur naar partijen</button>'
          +'</div>'
          +eigenPdfHtml('dv-pdf')
          +'</div>';
        var docOutEl=document.getElementById('bg-doc-out');
        if(docOutEl)setTimeout(function(){docOutEl.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
        var dvAkkoordCtrl=wireAkkoord('dv-doc-akkoord', ['dv-email']);
        var dvPdfStaat={base64:null,naam:null};
        wireEigenPdf('dv-pdf', dvPdfStaat, function(actief){
          document.getElementById('dv-print').disabled=actief;
          document.getElementById('dv-print').style.opacity=actief?'.4':'1';
          dvAkkoordCtrl.setOverride(actief);
        });
        document.getElementById('dv-print').onclick=function(){printDealvoorstel(document.getElementById('dv-preview').innerHTML,titel);};
        document.getElementById('dv-email').onclick=async function(){
          var ebtn=this;ebtn.disabled=true;ebtn.textContent='Versturen...';
          var toList=[t2.contact_email,t2.begeleider_email].filter(Boolean);
          var levendeHtml=document.getElementById('dv-preview').innerHTML;
          var payload={code:S.traject.id,dealvoorstel_tekst:dvHtmlNaarTekst(levendeHtml),to:toList};
          if(dvPdfStaat.base64){payload.eigen_pdf_base64=dvPdfStaat.base64;payload.eigen_pdf_naam=dvPdfStaat.naam;payload.eigen_pdf_mime=dvPdfStaat.mime;}
          var er=await fetch(WORKER+'/mna/dealvoorstel/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          var ed=await er.json();
          if(ed.ok){ebtn.textContent='✓ Verstuurd';}else{toast('Fout: '+(ed.error||'onbekend'),'err');ebtn.disabled=false;ebtn.textContent='✉ Verstuur naar partijen';}
        };
      }catch(e){
        errEl.textContent='Fout bij genereren: '+e.message;errEl.style.display='block';
        btn.disabled=false;btn.textContent='📊 Genereren';
      }
    };
  }

  // ===== INDICATIEVE BIEDING: parametermodal + generatie =====
  function dvEuro(n){return '€ '+Math.round(n||0).toLocaleString('nl-NL');}
  function toonBiedingModal(){
    var t2=S.traject||{};
    var d=dvGetDefaults();
    var multMid=((d.multipleBasis+d.multipleBovengrens)/2);
    var lbl='font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px';
    var inp='width:100%;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px';
    function veld(id,label,val,step,type){
      return '<div style="flex:1"><label style="'+lbl+'">'+label+'</label><input type="'+(type||'number')+'" id="'+id+'" value="'+val+'" '+(step?'step="'+step+'"':'')+' style="'+inp+'"></div>';
    }
    var geldigTot=new Date(Date.now()+30*24*3600*1000).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','bieding-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:560px;width:100%;max-height:92vh;overflow-y:auto';
    mo.innerHTML='<div id="bieding-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#128233; Indicatieve bieding</div>'
      +'<div style="font-size:12px;color:#8a8880;margin-bottom:1.25rem">Niet-bindend bod. Het bod (bandbreedte) wordt berekend uit EBITDA × multiple en exact zo in de brief overgenomen.</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('bd-ebitda','Genormaliseerde EBITDA (€)',d.ebitdaBewezen)+'</div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('bd-mult-laag','Multiple laag',d.multipleBasis,0.1)+veld('bd-mult-hoog','Multiple hoog',d.multipleBovengrens,0.1)+'</div>'
      +'<div style="margin-bottom:1rem"><label style="'+lbl+'">Betalingsstructuur</label><input type="text" id="bd-betaling" value="100% contant bij closing (cash-and-debt-free)" style="'+inp+'"></div>'
      +'<div style="display:flex;gap:10px;margin-bottom:1rem">'+veld('bd-excl','Exclusiviteit (weken)',6)+veld('bd-geldig','Geldig tot',geldigTot,null,'text')+'</div>'
      +'<div id="bd-err" style="display:none;color:#e05252;font-size:12px;margin-bottom:.75rem"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button id="bd-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'
      +'<button id="bd-ok" style="background:#a0522d;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">&#128233; Genereren</button>'
      +'</div>';
    ov.appendChild(mo);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('bd-ann').onclick=function(){document.body.removeChild(ov);};

    document.getElementById('bd-ok').onclick=async function(){
      var btn=this;btn.disabled=true;btn.textContent='Genereren... (15-30 sec)';
      var errEl=document.getElementById('bd-err');errEl.style.display='none';
      var ebitda=parseFloat(document.getElementById('bd-ebitda').value)||0;
      var multLaag=parseFloat(document.getElementById('bd-mult-laag').value)||0;
      var multHoog=parseFloat(document.getElementById('bd-mult-hoog').value)||0;
      var betaling=document.getElementById('bd-betaling').value.trim()||'100% contant bij closing';
      var exclWeken=parseInt(document.getElementById('bd-excl').value)||6;
      var geldigTotV=document.getElementById('bd-geldig').value.trim()||geldigTot;
      if(!ebitda||!multLaag){errEl.textContent='Vul EBITDA en minimaal de lage multiple in.';errEl.style.display='block';btn.disabled=false;btn.textContent='📩 Genereren';return;}
      if(!multHoog||multHoog<multLaag)multHoog=multLaag;
      var bodLaag=ebitda*multLaag, bodHoog=ebitda*multHoog;
      var bodTekst = (multHoog>multLaag) ? ('een bandbreedte van '+dvEuro(bodLaag)+' tot '+dvEuro(bodHoog)) : (dvEuro(bodLaag));
      var multTekst = (multHoog>multLaag) ? (multLaag.toLocaleString('nl-NL')+'× tot '+multHoog.toLocaleString('nl-NL')+'×') : (multLaag.toLocaleString('nl-NL')+'×');
      try{
        var isSell=(t2.opdrachtgever_rol==='koper')?false:(!t2.traject_type||t2.traject_type==='Verkoop'||t2.traject_type==='Opvolging');
        var datum=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
        var tplD=await fetch(WORKER+'/mna/template/bieding?email='+encodeURIComponent(t2.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).then(function(r){return r.json();}).catch(function(){return{ok:false};});
        var tplTekst=tplD.ok&&tplD.tekst?tplD.tekst:'[standaard biedingsbrief]';
        if(tplTekst.length>14000)tplTekst=tplTekst.substring(0,14000);
        var prompt='Vul de onderstaande indicatieve-biedingsbrief in. Vervang ALLE [tekst tussen haakjes]. Gebruik UITSLUITEND de cijfers hieronder; verzin geen eigen bedragen, EBITDA of multiples.\n'
          +'Kopende partij (uitbrengende partij): '+esc(t2.koper_naam||'[koper]')+(t2.koper_contact?', t.a.v. '+esc(t2.koper_contact):'')+', '+(t2.koper_adres||'')+'.\n'
          +'Verkopende partij / target: '+esc(t2.kantoor_naam||'[verkoper]')+(t2.contact_naam?', t.a.v. '+esc(t2.contact_naam):'')+', '+(t2.verkoper_adres||'')+'.\n'
          +'' + BRAND.kort + ' begeleidt '+(isSell?'de verkopende':'de kopende')+' partij.\n'
          +'Indicatief bod: '+bodTekst+' op cash-and-debt-free basis.\n'
          +'Onderbouwing: genormaliseerde EBITDA van '+dvEuro(ebitda)+' en een multiple van '+multTekst+'.\n'
          +'Betalingsstructuur: '+betaling+'.\n'
          +'Exclusiviteitsperiode: '+exclWeken+' weken.\n'
          +'Geldig tot: '+geldigTotV+'.\n'
          +'Datum: '+datum+'. Plaats: Oploo.\n\n'
          +'Geef alleen het volledig ingevulde document terug, zonder toelichting.\n\nTEMPLATE:\n'+tplTekst;
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:8000})});
        var rd=await resp.json();
        var tekst=rd.text||'Fout bij genereren';
        document.body.removeChild(ov);
        var out=document.getElementById('bg-doc-out');out.style.display='block';
        var titel='Indicatieve bieding — '+(t2.kantoor_naam||S.code);
        out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
          +'<div style="font-size:11px;font-weight:600;color:#a0522d;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">Indicatieve bieding gegenereerd</div>'
          +'<textarea id="bd-doc-tekst" style="width:100%;height:320px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical">'+esc(tekst)+'</textarea>'
          +akkoordHtml('bd-doc-akkoord')
          +interneGoedkeuringHtml('bd-goedkeuring-naam')
          +'<div style="display:flex;gap:8px;margin-top:.75rem">'
          +'<button id="bd-print" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128196; Print</button>'
          +'<button id="bd-email" class="btn" style="font-size:12px;padding:6px 14px;background:#a0522d">&#9993; Verstuur naar partijen</button>'
          +'</div>'
          +'<div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border)">'
          +'<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem">Volgende stappen</div>'
          +'<div style="font-size:12px;color:var(--muted);margin-bottom:.6rem">Na het bod: start de due-diligence-fase en vraag de volledige DD-informatie op.</div>'
          +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
          +'<button id="bd-naar-dd" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128260; Zet traject op Due Diligence</button>'
          +'<button id="bd-infoverzoek" class="btn" style="font-size:12px;padding:6px 14px;background:var(--teal-dim)">&#128203; Informatieverzoek — volledige DD</button>'
          +'</div></div>'
          +eigenPdfHtml('bd-pdf')
          +'</div>';
        var docOutEl=document.getElementById('bg-doc-out');
        if(docOutEl)setTimeout(function(){docOutEl.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
        var bdAkkoordCtrl=wireAkkoord('bd-doc-akkoord', ['bd-email']);
        var bdGoedkeuringCtrl=wireInterneGoedkeuring('bd-goedkeuring-naam','bd-doc-akkoord',['bd-email']);
        var bdPdfStaat={base64:null,naam:null};
        wireEigenPdf('bd-pdf', bdPdfStaat, function(actief){
          document.getElementById('bd-print').disabled=actief;
          document.getElementById('bd-print').style.opacity=actief?'.4':'1';
          bdAkkoordCtrl.setOverride(actief);
          bdGoedkeuringCtrl.setPdfOverride(actief);
        });
        document.getElementById('bd-print').onclick=function(){printDoc(document.getElementById('bd-doc-tekst').value,titel,'bieding');};
        document.getElementById('bd-email').onclick=async function(){
          var ebtn=this;ebtn.disabled=true;ebtn.textContent='Versturen...';
          secAuditLog('interne_goedkeuring',{document_type:'bieding',verzendkanaal:'email',goedgekeurd_door:bdGoedkeuringCtrl.getNaam()});
          var toList=[t2.contact_email,t2.begeleider_email,t2.koper_email].filter(Boolean);
          var payload={code:S.traject.id,bieding_tekst:document.getElementById('bd-doc-tekst').value,to:toList,goedgekeurd_door:bdGoedkeuringCtrl.getNaam()};
          if(bdPdfStaat.base64){payload.eigen_pdf_base64=bdPdfStaat.base64;payload.eigen_pdf_naam=bdPdfStaat.naam;payload.eigen_pdf_mime=bdPdfStaat.mime;}
          var er=await fetch(WORKER+'/mna/bieding/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          var ed=await er.json();
          if(ed.ok){ebtn.textContent='✓ Verstuurd';}else{toast('Fout: '+(ed.error||'onbekend'),'err');ebtn.disabled=false;ebtn.textContent='✉ Verstuur naar partijen';}
        };
        document.getElementById('bd-naar-dd').onclick=async function(){
          var nbtn=this;nbtn.disabled=true;nbtn.textContent='Bezig...';
          var lr=await fetch(WORKER+'/mna/logboek/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nieuwe_fase:'due_diligence',auteur_naam:S.traject&&S.traject.begeleider_naam||'Begeleider'})}).then(function(r){return r.json();}).catch(function(){return{};});
          if(lr.ok){nbtn.textContent='✓ Fase: Due Diligence';if(S.traject)S.traject.traject_fase='due_diligence';toast('Traject staat nu op Due Diligence.','ok');}
          else{toast('Fout: '+(lr.error||'onbekend'),'err');nbtn.disabled=false;nbtn.textContent='🔄 Zet traject op Due Diligence';}
        };
        document.getElementById('bd-infoverzoek').onclick=function(){ openInformatieverzoek('2'); };
      }catch(e){
        errEl.textContent='Fout bij genereren: '+e.message;errEl.style.display='block';
        btn.disabled=false;btn.textContent='📩 Genereren';
      }
    };
  }

  // ===== EIGEN DOCUMENT VERSTUREN: los van de contracten-module, puur bestand delen =====
  function toonEigenDocumentModal(){
    var t2=S.traject||{};
    var ontvangers=[];
    if(t2.contact_email)ontvangers.push({label:'Verkoper ('+esc(t2.contact_email)+')',email:t2.contact_email,checked:true});
    if(t2.koper_email)ontvangers.push({label:'Koper ('+esc(t2.koper_email)+')',email:t2.koper_email,checked:false});
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','eigendoc-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:480px;width:100%;max-height:92vh;overflow-y:auto';
    mo.innerHTML='<div id="eigendoc-modal-titel" style="font-family:Playfair Display,serif;font-size:1.15rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#128206; Eigen document versturen</div>'
      +'<div style="font-size:12px;color:#8a8880;margin-bottom:1.25rem">Upload een bestaand PDF- of Word-bestand en verstuur het rechtstreeks — geen AI, geen sjabloon.</div>'
      +'<div style="margin-bottom:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px">Bestand</label>'
      +'<input type="file" id="ed-file" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" style="font-size:13px;width:100%"></div>'
      +'<div style="margin-bottom:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:6px">Versturen naar</label>'
      +ontvangers.map(function(o,i){return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;cursor:pointer"><input type="checkbox" class="ed-ontvanger" value="'+esc(o.email)+'" '+(o.checked?'checked':'')+'> '+o.label+'</label>';}).join('')
      +(ontvangers.length?'':'<div style="font-size:12px;color:#e05252">Geen e-mailadressen bekend voor dit traject.</div>')
      +'</div>'
      +'<div style="margin-bottom:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px">Bericht (optioneel)</label>'
      +'<textarea id="ed-bericht" rows="3" style="width:100%;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;resize:vertical" placeholder="Korte toelichting bij het document..."></textarea></div>'
      +'<div id="ed-err" style="display:none;color:#e05252;font-size:12px;margin-bottom:.75rem"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button id="ed-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'
      +'<button id="ed-ok" style="background:#1a7a5e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">&#9993; Versturen</button>'
      +'</div>';
    ov.appendChild(mo);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('ed-ann').onclick=function(){document.body.removeChild(ov);};

    document.getElementById('ed-ok').onclick=async function(){
      var btn=this;var errEl=document.getElementById('ed-err');errEl.style.display='none';
      var fileInput=document.getElementById('ed-file');
      var f=fileInput.files[0];
      if(!f){errEl.textContent='Kies eerst een bestand.';errEl.style.display='block';return;}
      if(!eigenDocTypeOk(f)){errEl.textContent='Alleen PDF- of Word-bestanden (.pdf, .docx, .doc) zijn toegestaan.';errEl.style.display='block';return;}
      if(f.size>8000000){errEl.textContent='Bestand te groot (max 8 MB).';errEl.style.display='block';return;}
      var toList=Array.prototype.slice.call(document.querySelectorAll('.ed-ontvanger:checked')).map(function(c){return c.value;});
      if(!toList.length){errEl.textContent='Kies minstens één ontvanger.';errEl.style.display='block';return;}
      btn.disabled=true;btn.textContent='Versturen...';
      try{
        var dataUrl=await new Promise(function(resolve,reject){
          var reader=new FileReader();
          reader.onload=function(e){resolve(String(e.target.result));};
          reader.onerror=reject;
          reader.readAsDataURL(f);
        });
        var base64=dataUrl.split(',')[1]||'';
        var mime=f.type||(f.name.toLowerCase().endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':f.name.toLowerCase().endsWith('.doc')?'application/msword':'application/pdf');
        var r=await fetch(WORKER+'/mna/document/eigen/versturen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          code:S.code, bestand_base64:base64, bestand_naam:f.name, bestand_mime:mime, to:toList, bericht:document.getElementById('ed-bericht').value.trim()
        })});
        var d=await r.json();
        if(!d.ok){errEl.textContent=d.error||'Versturen mislukt.';errEl.style.display='block';btn.disabled=false;btn.textContent='✉ Versturen';return;}
        document.body.removeChild(ov);
        toast('Document verstuurd.','ok');
      }catch(e){errEl.textContent='Verbindingsfout — probeer opnieuw.';errEl.style.display='block';btn.disabled=false;btn.textContent='✉ Versturen';}
    };
  }

  // ===== AANDACHTSPUNTEN SPA (koopovereenkomst): checklist ter voorbereiding op de jurist =====
  // Toont een aandachtspuntenlijst voor de SPA (géén ingevulde concept-overeenkomst — het opstellen
  // van de koopovereenkomst is voorbehouden aan de jurist/notaris, zie Artikel 3 AV). Haalt alleen
  // het (statische) sjabloon op en toont het, zonder deal-specifieke invoer of AI-invulling.
  async function toonSpaModal(){
    var t2=S.traject||{};
    var out=document.getElementById('bg-doc-out');out.style.display='block';
    out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">Aandachtspuntenlijst laden...</div>';
    var docOutEl=document.getElementById('bg-doc-out');
    if(docOutEl)setTimeout(function(){docOutEl.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
    var tplD=await fetch(WORKER+'/mna/template/spa?email='+encodeURIComponent(t2.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).then(function(r){return r.json();}).catch(function(){return{ok:false};});
    var tekst=tplD.ok&&tplD.tekst?tplD.tekst:'[aandachtspuntenlijst niet beschikbaar]';
    var titel='Aandachtspunten koopovereenkomst (SPA) — '+(t2.kantoor_naam||S.code);
    out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:11px;font-weight:600;color:#5a5470;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Aandachtspunten koopovereenkomst (SPA)</div>'
      +'<div style="font-size:12px;color:var(--gold-dark);background:var(--gold-bg);border:1px solid var(--gold);border-radius:6px;padding:.5rem .75rem;margin-bottom:.75rem;line-height:1.5">&#9888; Dit is <strong>geen concept-overeenkomst</strong>. Het opstellen van de koopovereenkomst is voorbehouden aan uw jurist/notaris. Onderstaande lijst helpt u het gesprek daarmee voor te bereiden.</div>'
      +'<textarea id="spa-doc-tekst" readonly style="width:100%;height:340px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical">'+esc(tekst)+'</textarea>'
      +'<div style="display:flex;gap:8px;margin-top:.75rem">'
      +'<button id="spa-print" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128196; Print / PDF</button>'
      +'</div></div>';
    document.getElementById('spa-print').onclick=function(){printDoc(document.getElementById('spa-doc-tekst').value,titel,'spa');};
  }

  // ===== CLOSING-CHECKLIST: bestond al als tekst-sjabloon in de backend (BF_TEMPLATES.closing),
  // maar was nergens in de UI ontsloten — dus feitelijk onbruikbaar. Zelfde patroon als de SPA-
  // aandachtspuntenlijst hierboven: alleen het statische sjabloon ophalen en tonen, geen deal-
  // specifieke invulling of AI-generatie (het is een procesmatige controlelijst, geen document).
  async function toonClosingModal(){
    var t2=S.traject||{};
    var out=document.getElementById('bg-doc-out');out.style.display='block';
    out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">Closing-checklist laden...</div>';
    var docOutEl=document.getElementById('bg-doc-out');
    if(docOutEl)setTimeout(function(){docOutEl.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
    var tplD=await fetch(WORKER+'/mna/template/closing?email='+encodeURIComponent(t2.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).then(function(r){return r.json();}).catch(function(){return{ok:false};});
    var tekst=tplD.ok&&tplD.tekst?tplD.tekst:'[closing-checklist niet beschikbaar]';
    var titel='Closing-checklist — '+(t2.kantoor_naam||S.code);
    out.innerHTML='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:11px;font-weight:600;color:#2d6a4f;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Closing-checklist</div>'
      +'<div style="font-size:12px;color:var(--gold-dark);background:var(--gold-bg);border:1px solid var(--gold);border-radius:6px;padding:.5rem .75rem;margin-bottom:.75rem;line-height:1.5">&#9888; Algemene controlelijst ter voorbereiding op closing — geen juridisch of fiscaal advies, en niet automatisch aangepast aan de specifieke transactiestructuur van dit traject.</div>'
      +'<textarea id="closing-doc-tekst" readonly style="width:100%;height:340px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);color:var(--sub);font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical">'+esc(tekst)+'</textarea>'
      +'<div style="display:flex;gap:8px;margin-top:.75rem">'
      +'<button id="closing-print" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128196; Print / PDF</button>'
      +'</div></div>';
    document.getElementById('closing-print').onclick=function(){printDoc(document.getElementById('closing-doc-tekst').value,titel,'closing');};
  }

  document.getElementById('bg-nda-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('nda', function(){ bgDoc('nda'); }); };
  document.getElementById('bg-loi-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('loi', function(){ bgDoc('loi'); }); };
  document.getElementById('bg-bem-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('bem', function(){ bgDoc('bem'); }); };
  document.getElementById('bg-excl-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('excl', function(){ bgDoc('excl'); }); };
  document.getElementById('bg-dealvoorstel-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('dealvoorstel', function(){ toonDealvoorstelModal(); }); };
  document.getElementById('bg-bieding-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('bieding', function(){ toonBiedingModal(); }); };
  document.getElementById('bg-spa-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonDocWaarschuwing('spa', function(){ toonSpaModal(); }); };
  // Geen toonDocWaarschuwing hier: de closing-checklist is een generieke controlelijst zonder
  // partij-naam-placeholders (in tegenstelling tot NDA/LoI/BEM/Excl/SPA), dus de kopernaam-/
  // kantoornaam-waarschuwing is hier niet relevant — en 'closing' staat niet in de labels-map van
  // die functie, wat een "undefined"-titel in de waarschuwingsdialoog zou opleveren.
  document.getElementById('bg-closing-actie').onclick=function(){ if(!contractenAan){toast('Module Contracten niet actief. Neem contact op met ' + BRAND.kort + '.','err');return;} toonClosingModal(); };
  document.getElementById('bg-eigendoc-actie').onclick=function(){ toonEigenDocumentModal(); };
  document.getElementById('bg-dataroom-actie').onclick=function(){ S.screen='dataroom'; loadDataroom(); };

  document.getElementById('bg-gesprek-actie').onclick=function(){ openBgGesprekForm(null); };


  // AI analyse
  // Informatieverzoek knop
  var bgUitnBtn=document.getElementById('bg-uitnodigen-btn');
  if(bgUitnBtn)bgUitnBtn.onclick=function(){toonUitnodigingModalTussen();};
  async function openInformatieverzoek(forcedFase, triggerBtn){
    var ibtn=triggerBtn||null;if(ibtn){ibtn.disabled=true;ibtn.textContent='Laden...';}
    var t2=S.traject;
    var mnaUrl='https://koersvoormorgen.nl/mna.html';
    var verkoperCode=t2.id||S.code;

    // Bouw categorielijst op basis van FASES fase:1 velden
    var sectoren = {
      accountancy: [{id:'financieel',titel:'Financieel',items:['P&L 3 jaar + YTD (jaarrekeningen)','EBITDA absoluut + marge','Partnerbeloning (normalisatie)','Omzetforecast komend jaar','Recurring omzet (%)']},
        {id:'commercieel',titel:'Klanten & omzet',items:['Aantal actieve klanten','Top-10 klanten (% omzet)','Gemiddelde omzet per klant','Pipeline / nieuwe opdrachten']},
        {id:'partners',titel:'Partners & personeel',items:['Organogram / FTE-overzicht','Eigendomsstructuur + aandelenverhouding','Opvolgingskandidaat aanwezig','Veranderbereidheid partners']},
        {id:'compliance',titel:'Compliance & kwaliteit',items:['NBA-status en inschrijving','Laatste kwaliteitstoetsing + oordeel','Lopende tuchtzaken of claims']},
        {id:'it',titel:'IT & systemen',items:['Primaire software (accountancy)','Automatiseringsgraad','AI-tooling in gebruik']},
        {id:'juridisch',titel:'Juridisch & fiscaal',items:['Rechtsvorm + aandeelhoudersstructuur','VPB openstaande discussies','Lopende claims of geschillen']},
        {id:'strategisch',titel:'Strategie & markt',items:['Marktpositie en regio','Niche of specialisme','Gewenste vervolgstap eigenaar','Tijdlijn transactie']}],
      mkb: [{id:'financieel',titel:'Financieel',items:['P&L 3 jaar + YTD','EBITDA + brutomarge','DGA-salaris / normalisaties','Voorraadwaarde (indicatief)','Orderportefeuille']},
        {id:'commercieel',titel:'Klanten & leveranciers',items:['Top-10 klanten + top-10 leveranciers','Grootste klant (% omzet)','Recurring omzet (%)','Seizoensgevoeligheid']},
        {id:'partners',titel:'Personeel & organisatie',items:['Organogram + FTE','Eigenaar-afhankelijkheid','Sleutelpersonen buiten eigenaar','Interne opvolger aanwezig']},
        {id:'compliance',titel:'Vergunningen',items:['Bedrijfsvergunningen (overdraagbaar?)','Lopende claims / geschillen','Huurcontract overdraagbaar (dealbreaker)']},
        {id:'it',titel:'Systemen',items:['Kassasysteem / ERP / e-commerce','Automatiseringsgraad']},
        {id:'juridisch',titel:'Juridisch & fiscaal',items:['Rechtsvorm + eigendomsstructuur','VPB / BTW openstaande discussies','Lopende claims']},
        {id:'strategisch',titel:'Strategie',items:['Marktpositie + onderscheidend vermogen','Groeimogelijkheden','Gewenste vervolgstap','Tijdlijn']}],
      zorg: [{id:'financieel',titel:'Financieel',items:['P&L 3 jaar + YTD','EBITDA + eigenaarssalaris','Omzet per financieringsstroom (Wlz/Wmo/Zvw)','Bezettingsgraad']},
        {id:'patienten',titel:'Patiënten & praktijkprofiel',items:['Aantal ingeschreven patiënten','Wachttijd nieuwe patiënten','Specialisaties / aanvullende diensten','Aantal behandellocaties']},
        {id:'personeel',titel:'Personeel & BIG',items:['FTE-overzicht','BIG-registraties actueel','ZZP-inhuur (%)','Ziekteverzuim','Opvolger praktijkhouder']},
        {id:'compliance',titel:'Kwaliteit & regelgeving',items:['Laatste IGJ-inspectie + oordeel','Lopende claims / tuchtrecht','NZa-registratie + zorgverzekeraarcontracten']},
        {id:'it',titel:'IT & systemen',items:['HIS/TIS systeem + overdraagbaarheid','Gegevensmigratie mogelijk']},
        {id:'juridisch',titel:'Juridisch & structuur',items:['Rechtsvorm + eigendomsstructuur','Goodwill-afspraken (LHV/NMa)','Zorgcontracten looptijd','Lopende claims']},
        {id:'strategisch',titel:'Strategie',items:['Werkgebied + specialisaties','Groeimogelijkheden','Gewenste overdrachtstijdlijn']}]
    };

    // Bepaal fase op basis van LoI-status — alleen een echte handtekening (loi_getekend) telt,
    // niet loi_datum (dat betekent slechts "aangemaakt/verstuurd"), zelfde correctie als in
    // mna/06-schermen.js (regressie juli 2026).
    var ivFase = forcedFase || ((S.loiGetekend || t2.loi_getekend) ? '2' : '1');
    var ivFaseLabel = ivFase === '2' ? 'Fase 2 — Volledige Due Diligence (post-LoI)' : 'Fase 1 — Oriëntatie (pre-LoI)';

    var sector = (t2.sector||'accountancy').toLowerCase();
    if(!sectoren[sector]) sector = 'accountancy';

    // Fase-2 categorieen zijn uitgebreider
    var sectoren2 = {
      accountancy: [{id:'financieel',titel:'Financial DD',items:['Genormaliseerde EBITDA (gevalideerd)','Onderhanden werk / OHW','Debiteurenanalyse (>90 dagen)','WKR-controle','Dividendhistorie 3 jaar','Kostenstructuur jaar 3 (volledig)']},
        {id:'commercieel',titel:'Commercial DD',items:['Klantverloop (churn) per jaar','Gemiddelde klantduur','Cross-sell percentage','Retentierisico sleutelklanten bij overname']},
        {id:'partners',titel:'HR DD',items:['Partners met pensioen <5 jaar','Personeelsverloop (%)','RA/AA in opleiding','Partnerovereenkomsten + concurrentiebedingen','Pensioenregeling (soort + kosten)']},
        {id:'compliance',titel:'Compliance DD',items:['Beroepsaansprakelijkheidsclaims (details)','Wwft-procedures up-to-date','Klachtenregister','Toetsingsrapporten NBA']},
        {id:'it',titel:'IT DD',items:['Licenties overdraagbaar bij overname','Datamigratierisico','IT-kosten (% omzet)','Cybersecurity / incidenten','AVG-documentatie']},
        {id:'juridisch',titel:'Legal & Tax DD',items:['Huurcontracten (looptijd + overdraagbaarheid)','Change-of-control clausules','Claims + garanties (details)','Leaseverplichtingen','Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar','Beroepsaansprakelijkheidsverzekering']},
        {id:'strategisch',titel:'Operational DD',items:['Concurrenten + marktaandeel','AI-impact op dienstenmix (kwantitatief)','Operationele schaalbaarheid','Cultuurfit + integratieplan','Voorkeur dealstructuur (lock-box vs completion accounts)']}],
      mkb: [{id:'financieel',titel:'Financial & Tax DD',items:['Genormaliseerde EBITDA (gevalideerd)','Werkkapitaalanalyse (NWC)','Capex-historie + investeringsbehoefte','Voorraadomzetsnelheid','Tax DD: BTW, loonheffing, VPB']},
        {id:'commercieel',titel:'Commercial DD',items:['Klant- en leverancierscontracten','Leveranciersafhankelijkheid','Change-of-control clausules','Marktaandeel validatie','Operationele schaalbaarheid']},
        {id:'partners',titel:'HR DD',items:['Arbeidscontracten volledig','Pensioenregeling','CAO-verplichtingen','Ziekteverzuim','IP / intellectueel eigendom']},
        {id:'compliance',titel:'Legal DD',items:['Huurcontract (looptijd + overdraagbaarheid)','Milieu-/omgevingsvergunning','Alle claims + garanties','Vastgoed taxatie']},
        {id:'it',titel:'IT DD',items:['Licenties overdraagbaar','Cybersecurity','AVG-compliance']},
        {id:'strategisch',titel:'Operational DD',items:['Concurrenten + marktaandeel','Schaalbaarheid supply chain','Cultuurfit + integratieplan','Dealstructuur voorkeur']}],
      zorg: [{id:'financieel',titel:'Financial DD',items:['Rechtmatigheidsonderzoek zorgverantwoording','BTW-vrijstellingen analyse','Subsidiecontroles','Werkkapitaalanalyse']},
        {id:'patienten',titel:'Cliënt DD',items:['Patiëntuitstroom per jaar','Wachtlijstanalyse','Overdraagbaarheid patiëntenbestand (BIG)']},
        {id:'personeel',titel:'HR DD',items:['Wet DBA / ZZP-risicos','CAO + verplichtingen','Pensioenregeling','Arbeidscontracten volledig']},
        {id:'compliance',titel:'Compliance DD',items:['IGJ-rapportages volledig','Wkkgz-audit','AVG/privacy patiëntgegevens (details)','WTZa-vergunning']},
        {id:'it',titel:'IT DD',items:['Cybersecurity + NEN 7510','AVG patiëntgegevens (details)','EPD contracten']},
        {id:'juridisch',titel:'Legal & Tax DD',items:['Huurcontract + overdraagbaarheid','BTW-vrijstellingen','Goodwill-onderbouwing','Claims + garanties details']}]
    };

    var categorieen = ivFase === '2' ? (sectoren2[sector]||sectoren2.accountancy) : sectoren[sector];

    // Modal met aanvinkbare categorieën
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','infoverzoek-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:720px;width:100%;max-height:92vh;overflow-y:auto';

    var catHtml = '';
    categorieen.forEach(function(cat, ci){
      catHtml += '<div style="margin-bottom:12px;border:1px solid #e4e0db;border-radius:8px;overflow:hidden">'
        + '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f7f5f2;cursor:pointer;font-weight:600;font-size:13px">'
        + '<input type="checkbox" class="iv-cat-check" data-ci="'+ci+'" checked style="width:15px;height:15px;accent-color:#1a7a5e"> '
        + cat.titel + '</label>'
        + '<div class="iv-items-'+ci+'" style="padding:8px 14px 10px 38px">';
      cat.items.forEach(function(item, ii){
        catHtml += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#5a5854;padding:2px 0;cursor:pointer">'
          + '<input type="checkbox" class="iv-item-check" data-ci="'+ci+'" data-ii="'+ii+'" checked style="accent-color:#1a7a5e"> '
          + esc(item) + '</label>';
      });
      catHtml += '<textarea class="iv-extra-'+ci+'" placeholder="Aanvullende toelichting of specifieke documenten voor deze categorie (optioneel)..." style="width:100%;margin-top:6px;font-size:11px;color:#8a8880;background:#fafaf8;border:1px solid #e4e0db;border-radius:4px;padding:6px 8px;font-family:IBM Plex Sans,sans-serif;resize:vertical;min-height:40px"></textarea>'
        + '</div></div>';
    });

    var deadline=new Date(Date.now()+14*24*3600*1000).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});

    mo.innerHTML='<div id="infoverzoek-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#128203; Informatieverzoek samenstellen</div>'
      +'<div style="display:inline-block;background:'+(ivFase==="2"?"var(--info-bg)":"var(--teal-bg)")+';border:1px solid '+(ivFase==="2"?"var(--info)":"var(--teal)")+';color:'+(ivFase==="2"?"var(--info)":"var(--teal)")+';font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;margin-bottom:1rem">'+(ivFase==="2"?"🔍 Fase 2 — Volledige DD (post-LoI)":"📋 Fase 1 — Oriëntatie (pre-LoI)")+'</div>'
      +'<div style="font-size:12px;color:#8a8880;margin-bottom:1.25rem">Vink aan welke categorieën en vragen u wilt meesturen. U kunt per categorie een toelichting toevoegen.</div>'
      +'<div style="margin-bottom:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px">Deadline (aanpasbaar)</label>'
      +'<input type="text" id="iv-deadline" value="'+deadline+'" style="background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;width:200px"></div>'
      +'<div style="margin-bottom:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px">Persoonlijk bericht (optioneel)</label>'
      +'<textarea id="iv-bericht" rows="2" placeholder="Voeg een persoonlijk bericht toe..." style="width:100%;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:7px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;resize:vertical"></textarea></div>'
      +catHtml
      +'<div style="margin-bottom:1rem;margin-top:1rem"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:#8a8880;display:block;margin-bottom:4px">Stuur naar</label>'
      +'<input type="email" id="bg-iv-email" value="'+esc(t2.contact_email||'')+'" style="width:100%;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:9px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px"></div>'
      +'<div id="bg-iv-err" style="display:none;color:#e05252;font-size:12px;margin-bottom:.5rem"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +'<button id="bg-iv-preview" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">&#128065; Preview</button>'
      +'<button id="bg-iv-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'
      +'<button id="bg-iv-ok" style="background:#1a7a5e;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">&#9993; Verstuur</button>'
      +'</div>';

    ov.appendChild(mo);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('bg-iv-ann').onclick=function(){document.body.removeChild(ov);};

    // Helper: bouw HTML mail op basis van selecties
    function bouwMailHtml(){
      var dl = document.getElementById('iv-deadline').value || deadline;
      var bericht = document.getElementById('iv-bericht').value.trim();
      var geselecteerd = [];
      categorieen.forEach(function(cat, ci){
        var catCheck = mo.querySelector('.iv-cat-check[data-ci="'+ci+'"]');
        if(!catCheck||!catCheck.checked) return;
        var items = [];
        cat.items.forEach(function(item, ii){
          var itemCheck = mo.querySelector('.iv-item-check[data-ci="'+ci+'"][data-ii="'+ii+'"]');
          if(itemCheck&&itemCheck.checked) items.push(item);
        });
        var extra = (mo.querySelector('.iv-extra-'+ci)||{}).value||'';
        if(items.length||extra) geselecteerd.push({titel:cat.titel, items:items, extra:extra.trim()});
      });
      var tabelRows = '';
      geselecteerd.forEach(function(g, gi){
        var bg = gi%2===0?'#f0eeea':'#fff';
        var itemsHtml = g.items.map(function(i){return '<li style="margin:2px 0">'+esc(i)+'</li>';}).join('');
        if(g.extra) itemsHtml += '<li style="margin:4px 0;color:#8a8880;font-style:italic">'+esc(g.extra)+'</li>';
        tabelRows += '<tr style="background:'+bg+'"><td style="padding:10px 14px;font-weight:600;border:1px solid #ddd;vertical-align:top;white-space:nowrap">'+esc(g.titel)+'</td>'
          +'<td style="padding:10px 14px;border:1px solid #ddd"><ul style="margin:0;padding-left:16px;font-size:13px;color:#5a5854">'+itemsHtml+'</ul></td></tr>';
      });
      var html='<div style="font-family:sans-serif;max-width:640px;margin:0 auto">'
        +'<div style="background:#1a7a5e;color:#fff;padding:1.5rem;border-radius:8px 8px 0 0"><h2 style="margin:0;font-size:1.1rem">Informatieverzoek M&A — '+esc(t2.kantoor_naam||'Uw kantoor')+'</h2></div>'
        +'<div style="background:#fff;border:1px solid #ddd;border-top:none;padding:1.5rem;border-radius:0 0 8px 8px">'
        +'<p style="font-size:14px;color:#2a2825">Beste '+esc(t2.contact_naam||'relatie')+',</p>'
        +(bericht?'<p style="font-size:13px;color:#5a5854;line-height:1.7">'+esc(bericht)+'</p>':'')
        +'<p style="font-size:13px;color:#5a5854;line-height:1.7">In het kader van het M&A-traject ontvangen wij graag onderstaande informatie vóór <strong>'+esc(dl)+'</strong>.</p>'
        +'<p style="font-size:13px;color:#5a5854;line-height:1.7">U kunt de documenten en gegevens direct uploaden via uw persoonlijke omgeving:</p>'
        +'<div style="background:#f0faf6;border:1px solid #0a3d2e;border-radius:8px;padding:1.25rem;margin:1.25rem 0">'
        +'<div style="font-size:11px;font-weight:600;color:#145f48;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Uw persoonlijke uploadomgeving</div>'
        +'<div style="font-family:monospace;background:#fff;border:1px solid #ddd;padding:.75rem;border-radius:6px;font-size:13px;margin-bottom:.5rem"><a href="'+mnaUrl+'" style="color:#1a7a5e">'+mnaUrl+'</a></div>'
        +'<div style="font-size:12px;color:#8a8880">Toegangscode: <strong style="font-family:monospace;color:#1a7a5e;font-size:14px">'+esc(verkoperCode)+'</strong></div>'
        +'</div>'
        +(tabelRows?'<p style="font-size:13px;font-weight:600;color:#2a2825;margin-bottom:.5rem">Benodigde informatie:</p>'
        +'<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:1.25rem">'+tabelRows+'</table>':'')
        +'<p style="font-size:12px;color:#8a8880">Heeft u vragen? Neem gerust contact op.<br>'
        +esc(t2.begeleider_naam||'Uw begeleider')+' — <a href="mailto:'+esc(begeleiderWeergaveEmail(t2.begeleider_email))+'" style="color:#1a7a5e">'+esc(begeleiderWeergaveEmail(t2.begeleider_email))+'</a></p>'
        +'<p style="font-size:12px;color:#8a8880;margin-top:.75rem">Met vriendelijke groet,<br><strong>'+esc(t2.begeleider_naam||'Uw begeleider')+'</strong><br>'
        +'<span style="color:#aaa">Senior M&A-adviseur · ' + esc(t2.begeleider_bedrijf||BRAND.bedrijfKort) + '</span></p>'
        +'</div></div>';
      return html;
    }

    // Preview knop
    document.getElementById('bg-iv-preview').onclick=function(){
      var html = bouwMailHtml();
      var pvOv=document.createElement('div');pvOv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:1.5rem';
      var pvMo=document.createElement('div');pvMo.setAttribute('role','dialog');pvMo.setAttribute('aria-modal','true');pvMo.setAttribute('aria-labelledby','pv-modal-titel');pvMo.style.cssText='background:var(--panel);border-radius:10px;padding:1.5rem;max-width:680px;width:100%;max-height:90vh;overflow-y:auto';
      pvMo.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">'
        +'<div id="pv-modal-titel" style="font-weight:600;font-size:13px">Preview e-mail</div>'
        +'<button id="pv-sluit" style="background:none;border:none;font-size:18px;cursor:pointer;color:#8a8880">&times;</button></div>'
        +'<div style="border:1px solid #ddd;border-radius:6px;padding:1rem">'+html+'</div>';
      pvOv.appendChild(pvMo);document.body.appendChild(pvOv);
      pvOv.addEventListener('click',function(e){if(e.target===pvOv)document.body.removeChild(pvOv);});
      pvMo.querySelector('#pv-sluit').onclick=function(){document.body.removeChild(pvOv);};
    };

    document.getElementById('bg-iv-ok').onclick=async function(){
      var email=document.getElementById('bg-iv-email').value.trim();
      var ivErr=document.getElementById('bg-iv-err');
      if(!email){ivErr.style.display='block';ivErr.textContent='E-mailadres verplicht.';return;}
      var html = bouwMailHtml();
      var sb=this;sb.disabled=true;sb.textContent='Versturen...';
      var er=await fetch(WORKER+'/mna/mail-begeleider',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey},
        body:JSON.stringify({to:email,naam:t2.contact_naam,trajectNaam:t2.kantoor_naam,tussenCode:verkoperCode,html:html})}).then(function(r){return r.json();}).catch(function(){return{};});
      if(er.ok){
        // Sla selectie op zodat formulier velden kan filteren
        var selectieData = {};
        categorieen.forEach(function(cat, ci){
          var catCheck = mo.querySelector('.iv-cat-check[data-ci="'+ci+'"]');
          if(!catCheck||!catCheck.checked) return;
          var items = [];
          cat.items.forEach(function(item, ii){
            var itemCheck = mo.querySelector('.iv-item-check[data-ci="'+ci+'"][data-ii="'+ii+'"]');
            if(itemCheck&&itemCheck.checked) items.push(item);
          });
          if(items.length) selectieData[cat.id] = items;
        });
        fetch(WORKER+'/mna/infoverzoek/opslaan',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({code:S.code,selectie:selectieData,fase:ivFase,auteur:S.traject&&S.traject.begeleider_naam||'Begeleider'})
        }).catch(function(){});
        document.body.removeChild(ov);toast('Informatieverzoek verstuurd.','ok');
      }
      else{ivErr.style.display='block';ivErr.textContent='Fout: '+(er.error||'onbekend');sb.disabled=false;sb.textContent='Verstuur';}
    };
    if(ibtn){ibtn.disabled=false;ibtn.innerHTML='&#128203; Informatieverzoek';}
  }
  document.getElementById('bg-infoverzoek-actie').onclick=function(){ openInformatieverzoek(null, this); };

  // ── Documenten sectie begeleider ──
  var bgDocsEl = document.getElementById('bg-docs-sectie');
  if (bgDocsEl) {
    async function laadBgDocs() {
      bgDocsEl.innerHTML = '<div style="font-size:12px;color:var(--muted)">Laden...</div>';
      try {
        var r = await fetch(WORKER+'/mna/versies/'+S.code);
        var versies = await r.json();
        if (!versies.length) { bgDocsEl.innerHTML='<div style="font-size:12px;color:var(--muted);font-style:italic">Nog geen documenten.</div>'; return; }
        var labels={nda:'NDA',loi:'LoI',bem:'Bemiddelingsovereenkomst',bem_verk:'Bemiddelingsovereenkomst',bem_koper:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief',exclusief:'Exclusiviteitsbrief',bem_upload:'BEM (geüpload)',excl_upload:'Excl (geüpload)',nda_upload:'NDA (geüpload)',loi_upload:'LoI (geüpload)'};
        var kleuren={nda:'#7c5cbf',loi:'var(--gold)',bem:'#2a5ea0',bem_verk:'#2a5ea0',bem_koper:'#2a5ea0',excl:'var(--teal)',exclusief:'var(--teal)',bem_upload:'#2a5ea0',excl_upload:'var(--teal)',nda_upload:'#7c5cbf',loi_upload:'var(--gold)'};
                // Toon alleen laatste versie per doc-type
        var getoond = {};
        var versiesGefilterd = versies.filter(function(v){
          var key = v.doc_type;
          if(getoond[key]) return false;
          getoond[key] = true;
          return true;
        });

        var html='<div style="display:flex;flex-direction:column;gap:6px">';
        versiesGefilterd.forEach(function(v){
          var dt=new Date(v.created_at).toLocaleString('nl-NL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
          var kleur=kleuren[v.doc_type]||'var(--teal)';
          var isUpload=!!v.is_upload;
          html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .875rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
            +'<span style="font-size:11px;font-weight:600;color:'+kleur+';min-width:160px">'+(labels[v.doc_type]||v.doc_type)+(isUpload?'':' v'+v.versie)+'</span>'
            +'<span style="font-size:11px;color:var(--muted)">'+dt+'</span>'
            +(isUpload
              ?'<a href="'+WORKER+'/mna/document/download/'+esc(v.id)+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:10px;padding:2px 10px;margin-left:auto;text-decoration:none">&#8681; Download</a>'
              :'<button class="btn-ghost bg-versie-open" data-id="'+esc(v.id)+'" style="font-size:10px;padding:2px 10px;margin-left:auto">&#128065; Lezen</button>'
              +'<button class="btn-ghost bg-versie-del" data-id="'+esc(v.id)+'" style="font-size:10px;padding:2px 6px;color:var(--red);border-color:var(--red);margin-left:4px">&#10005;</button>')
            +'</div>';
        });
                html+='</div>';
        bgDocsEl.innerHTML=html;
        // Delete handlers
        bgDocsEl.querySelectorAll('.bg-versie-del').forEach(function(btn){
          btn.addEventListener('click',async function(){
            if(!confirm('Documentversie verwijderen?'))return;
            var delResp=await fetch(WORKER+'/mna/versie/delete/'+btn.dataset.id+'?key='+encodeURIComponent(S._bgKey||''),{method:'POST'}).then(function(r){return r.json();}).catch(function(){return{error:'Verbindingsfout'};});
            if(delResp&&delResp.error){toast('Verwijderen mislukt: '+delResp.error,'err');return;}
            laadBgDocs();
          });
        });

        bgDocsEl.querySelectorAll('.bg-versie-open').forEach(function(btn){
          btn.addEventListener('click', async function(){
            var vr=await fetch(WORKER+'/mna/versie/'+btn.dataset.id+'?code='+encodeURIComponent(S.code));
            var vd=await vr.json();
            var ov2=document.createElement('div');ov2.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
            var mo2=document.createElement('div');mo2.setAttribute('role','dialog');mo2.setAttribute('aria-modal','true');mo2.setAttribute('aria-labelledby','versie-modal-titel');mo2.style.cssText='background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)';
            var docLabel=(labels[vd.doc_type]||vd.doc_type)+' — versie '+vd.versie;
            mo2.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">'
              +'<div id="versie-modal-titel" style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--head)">'+esc(docLabel)+'</div>'
              +'<button id="bg-vd-sluit" class="btn-ghost" style="font-size:12px;padding:4px 12px">&#10005;</button></div>'
              +'<textarea readonly style="width:100%;height:400px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:1rem;font-family:Georgia,serif;font-size:12px;line-height:1.8;color:var(--sub);outline:none;resize:vertical">'+esc(vd.tekst||'')+'</textarea>'
              +'<div style="display:flex;gap:8px;margin-top:.75rem;justify-content:flex-end">'
              +'<button class="btn-ghost bg-vd-print" style="font-size:12px;padding:6px 14px">&#128196; Print</button>'
              +'<button class="btn-ghost" id="bg-vd-sluit2" style="font-size:12px;padding:6px 14px">Sluiten</button>'
              +'</div>';
            ov2.appendChild(mo2);document.body.appendChild(ov2);
            ov2.addEventListener('click',function(e){if(e.target===ov2)document.body.removeChild(ov2);});
            mo2.querySelector('#bg-vd-sluit').onclick=function(){document.body.removeChild(ov2);};
            mo2.querySelector('#bg-vd-sluit2').onclick=function(){document.body.removeChild(ov2);};
            mo2.querySelector('.bg-vd-print').onclick=function(){ printDoc(vd.tekst||'', docLabel, vd.doc_type); };
          });
        });
      } catch(e) { bgDocsEl.innerHTML='<div style="font-size:12px;color:var(--red)">Fout: '+e.message+'</div>'; }
    }
    laadBgDocs();

    // Wijzigingen-overzicht (dataintegriteit): pull-down paneel + meldingsbadge voor wat de
    // verkoper heeft aangepast (veldwijzigingen, documentuploads, documentverwijderingen).
    (function initWijzigingenPanel(){
      var hdr=document.getElementById('wz-toggle-hdr');
      var body=document.getElementById('wz-body');
      var badge=document.getElementById('wz-badge');
      var chevron=document.getElementById('wz-chevron');
      if(!hdr)return;
      var wijzigingenData=[];
      var gezienKey='ki_wz_gezien_'+S.code;
      var faseLabels={financieel:'Financieel',commercieel:'Klanten',partner:'Partners',compliance:'Compliance',it:'IT',juridisch:'Juridisch',strategisch:'Strategisch'};
      var typeIcons={veld:'&#9998;',document_upload:'&#128196;',document_verwijderd:'&#128465;'};
      var rolLabels={verkoper:'Verkoper',koper:'Koper',tussenpersoon:'Begeleider',admin:'Beheer'};
      function laadWijzigingen(){
        fetch(WORKER+'/mna/wijzigingen/'+S.code,{headers:{'x-tussen-key':S._bgKey||''}})
          .then(function(r){return r.json();})
          .then(function(d){
            wijzigingenData=d.wijzigingen||[];
            var laatstGezien=parseInt(localStorage.getItem(gezienKey)||'0',10);
            var nieuw=wijzigingenData.filter(function(w){return w.created_at>laatstGezien;}).length;
            if(nieuw>0){badge.textContent=nieuw+' nieuw';badge.style.display='inline-block';}
            else{badge.style.display='none';}
          }).catch(function(){});
      }
      function renderLijst(){
        if(!wijzigingenData.length){body.innerHTML='<div style="font-size:12px;color:var(--muted);font-style:italic;padding-top:.5rem">Nog geen wijzigingen vastgelegd.</div>';return;}
        var html='<div style="display:flex;flex-direction:column;gap:6px;padding-top:.5rem;max-height:340px;overflow-y:auto">';
        wijzigingenData.forEach(function(w){
          var dt=new Date(w.created_at).toLocaleString('nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
          var inhoud='';
          if(w.type==='veld'){
            inhoud='<strong>'+esc(w.veld_label)+'</strong>'+(faseLabels[w.fase_id]?' ('+faseLabels[w.fase_id]+')':'')+'<br><span style="color:var(--muted)">'+(w.oude_waarde?esc(w.oude_waarde)+' &#8594; ':'')+'<strong style="color:var(--sub)">'+esc(w.nieuwe_waarde)+'</strong></span>';
          } else if(w.type==='document_upload'){
            inhoud='Document geüpload: <strong>'+esc(w.document_naam)+'</strong>'+(faseLabels[w.fase_id]?' ('+faseLabels[w.fase_id]+')':'');
          } else if(w.type==='document_verwijderd'){
            inhoud='Document verwijderd: <strong>'+esc(w.document_naam)+'</strong>'+(faseLabels[w.fase_id]?' ('+faseLabels[w.fase_id]+')':'');
          }
          html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.6rem .75rem;font-size:12px">'
            +'<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:.3rem">'
            +'<span style="font-weight:600;color:var(--teal)">'+(typeIcons[w.type]||'')+' '+(rolLabels[w.rol]||w.rol)+(w.auteur_naam?' ('+esc(w.auteur_naam)+')':'')+'</span>'
            +'<span style="color:var(--muted);font-size:11px">'+dt+'</span>'
            +'</div><div style="color:var(--sub);line-height:1.5">'+inhoud+'</div></div>';
        });
        html+='</div>';
        body.innerHTML=html;
      }
      hdr.onclick=function(){
        var open=body.style.display!=='none';
        if(open){body.style.display='none';chevron.innerHTML='&#9660;';}
        else{
          body.style.display='block';chevron.innerHTML='&#9650;';
          renderLijst();
          localStorage.setItem(gezienKey,String(Date.now()));
          badge.style.display='none';
        }
      };
      laadWijzigingen();
    })();

    // Laad gesprekken voor begeleider
    async function laadBgGesprekken() {
      var gsEl = document.getElementById('bg-gesprekken-sectie');
      if (!gsEl) return;
      try {
        var r = await fetch(WORKER+'/mna/admin/gesprekken/'+S.traject.id, {headers:{'x-tussen-key': S._bgKey||''}});
        var data = await r.json();
        var gesprekken = data.gesprekken || [];
        var typeLabels = {gesprek:'Gesprek',kennismaking:'Kennismaking',onderhandeling:'Onderhandeling',vergadering:'Vergadering',telefonisch:'Telefonisch',email:'E-mail',andere:'Overig'};
        var zichtLabels = {begeleider:'Intern',verkoper:'Verkoper',koper:'Koper',iedereen:'Alle partijen'};
        var zichtKleuren = {begeleider:'var(--muted)',verkoper:'var(--teal)',koper:'#2a5ea0',iedereen:'var(--gold)'};

        var html = '';
        if (!gesprekken.length) {
          html += '<div style="font-style:italic;font-size:12px;color:var(--muted)">Nog geen gesprekken vastgelegd.</div>';
        } else {
          html += '<div style="display:flex;flex-direction:column;gap:8px">';
          gesprekken.forEach(function(g) {
            var dt = g.datum ? new Date(g.datum).toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'}) : '—';
            var zicht = g.zichtbaar_voor || 'begeleider';
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem .875rem">'
              + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:.35rem">'
              + '<span style="font-size:11px;font-weight:600;color:var(--teal)">'+(typeLabels[g.type]||g.type)+'</span>'
              + '<span style="font-size:11px;color:var(--muted)">'+dt+'</span>'
              + '<span style="font-size:9px;padding:2px 8px;border-radius:10px;background:var(--panel);border:1px solid var(--border);color:'+(zichtKleuren[zicht]||'var(--muted)')+'">&#128065; '+(zichtLabels[zicht]||zicht)+'</span>'
              + (g.deelnemers?'<span style="font-size:10px;color:var(--muted)">'+esc(g.deelnemers)+'</span>':'')
              + '<div style="margin-left:auto;display:flex;gap:6px">'
              + '<select class="bg-gs-zicht-sel" data-id="'+esc(g.id)+'" style="font-size:10px;padding:2px 6px;border:1px solid var(--border);border-radius:4px;background:var(--card);color:var(--sub);cursor:pointer">'
              + '<option value="begeleider"'+(zicht==='begeleider'?' selected':'')+'>Intern</option>'
              + '<option value="verkoper"'+(zicht==='verkoper'?' selected':'')+'>Verkoper</option>'
              + '<option value="koper"'+(zicht==='koper'?' selected':'')+'>Koper</option>'
              + '<option value="iedereen"'+(zicht==='iedereen'?' selected':'')+'>Alle partijen</option>'
              + '</select>'
              + '<button class="bg-gs-open-btn" data-id="'+esc(g.id)+'" data-verslag="'+esc(g.verslag||'')+'" data-datum="'+esc(g.datum||'')+'" data-type="'+esc(g.type||'')+'" data-deelnemers="'+esc(g.deelnemers||'')+'" data-zicht="'+esc(zicht)+'" style="font-size:10px;padding:2px 10px;border:1px solid var(--border);border-radius:4px;background:var(--panel);cursor:pointer">&#9998; Bewerken</button>'
              + '</div></div>'
              + (g.verslag?'<div style="font-size:12px;color:var(--sub);line-height:1.6">'+esc(g.verslag.substring(0,200))+(g.verslag.length>200?'…':'')+'</div>':'')
              + '</div>';
          });
          html += '</div>';
        }

        gsEl.innerHTML = html;

        // Zichtbaarheid direct aanpassen
        gsEl.querySelectorAll('.bg-gs-zicht-sel').forEach(function(sel){
          sel.onchange = async function(){
            var gId = sel.dataset.id;
            var nieuweZicht = sel.value;
            await fetch(WORKER+'/mna/admin/gesprekken/'+S.traject.id, {
              method:'POST',
              headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},
              body:JSON.stringify({id:gId, zichtbaar_voor:nieuweZicht})
            }).catch(function(){});
            toast('Zichtbaarheid bijgewerkt.','ok');
            laadBgGesprekken();
          };
        });

        // Bewerken knop
        gsEl.querySelectorAll('.bg-gs-open-btn').forEach(function(btn){
          btn.onclick = function(){
            openBgGesprekForm({
              id: btn.dataset.id,
              verslag: btn.dataset.verslag,
              datum: btn.dataset.datum,
              type: btn.dataset.type,
              deelnemers: btn.dataset.deelnemers,
              zichtbaar_voor: btn.dataset.zicht
            });
          };
        });

      } catch(e) { gsEl.innerHTML = '<div style="color:var(--red);font-size:12px">Fout: '+e.message+'</div>'; }
    }

    // Gesprek formulier voor begeleider in mna.html
    function openBgGesprekForm(bestaand) {
      var vandaag = new Date().toISOString().split('T')[0];
      var g = bestaand || {};
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
      var mo = document.createElement('div');
      mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','gesprek-modal-titel');
      mo.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.75rem;max-width:600px;width:100%;max-height:90vh;overflow-y:auto';
      mo.innerHTML = '<div id="gesprek-modal-titel" style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--head);margin-bottom:1.25rem">'+(g.id?'Gesprek bewerken':'Gesprek vastleggen')+'</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
        + '<div><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Datum</label>'
        + '<input type="date" id="bgg-datum" value="'+(g.datum||vandaag)+'" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px"></div>'
        + '<div><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Type</label>'
        + '<select id="bgg-type" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px">'
        + ['gesprek','kennismaking','onderhandeling','vergadering','telefonisch','email','andere'].map(function(t){
            var labels={gesprek:'Gesprek',kennismaking:'Kennismaking',onderhandeling:'Onderhandeling',vergadering:'Vergadering',telefonisch:'Telefonisch',email:'E-mail',andere:'Overig'};
            return '<option value="'+t+'"'+(g.type===t?' selected':'')+'>'+labels[t]+'</option>';
          }).join('')
        + '</select></div></div>'
        + '<div style="margin-bottom:10px"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Deelnemers</label>'
        + '<input type="text" id="bgg-deelnemers" value="'+esc(g.deelnemers||'')+'" placeholder="Deelnemers" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px"></div>'
        + '<div style="margin-bottom:10px"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Zichtbaar voor</label>'
        + '<select id="bgg-zicht" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px">'
        + '<option value="begeleider"'+((!g.zichtbaar_voor||g.zichtbaar_voor==="begeleider")?' selected':'')+'>Alleen begeleider (intern)</option>'
        + '<option value="verkoper"'+(g.zichtbaar_voor==="verkoper"?' selected':'')+'>Verkoper</option>'
        + '<option value="koper"'+(g.zichtbaar_voor==="koper"?' selected':'')+'>Koper</option>'
        + '<option value="iedereen"'+(g.zichtbaar_voor==="iedereen"?' selected':'')+'>Alle partijen</option>'
        + '</select></div>'
        + '<div style="margin-bottom:10px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'        + '<label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted)">Notities / aantekeningen</label>'        + '<button id="bgg-rec-btn" style="font-size:11px;padding:2px 8px;border:1px solid var(--teal);border-radius:4px;background:transparent;color:var(--teal);cursor:pointer">&#127908; Opnemen</button>'        + '<span id="bgg-rec-st" style="font-size:11px;color:var(--muted);margin-left:6px"></span></div>'        + '<textarea id="bgg-notities" rows="4" placeholder="Ruwe notities — of klik Opnemen om te dicteren (Chrome). AI maakt er een gestructureerd verslag van." style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Sans,sans-serif;font-size:13px;line-height:1.7;resize:vertical">'+esc(g.ruwe_notities||'')+'</textarea></div>'        + '<div style="margin-bottom:10px"><label style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px">Verslag <span style="font-weight:400">(of genereer met AI)</span></label>'        + '<textarea id="bgg-verslag" rows="5" placeholder="Gespreksverslag..." style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;font-family:IBM Plex Mono,monospace;font-size:12px;line-height:1.7;resize:vertical">'+esc(g.verslag||'')+'</textarea></div>'        + '<div style="display:flex;gap:8px;margin-bottom:10px">'        + '<button id="bgg-ai-btn" style="font-size:12px;padding:6px 14px;border:1px solid var(--teal);border-radius:var(--r);background:transparent;color:var(--teal);cursor:pointer">&#9881; AI-verslag genereren</button>'        + '<span id="bgg-ai-st" style="font-size:12px;color:var(--muted);align-self:center"></span>'        + '</div>'        + '<div id="bgg-concept-ind" style="font-size:10px;color:var(--muted);margin-bottom:.25rem;font-style:italic"></div>'        + '<div id="bgg-err" style="display:none;color:var(--red);font-size:12px;margin-bottom:.5rem"></div>'        + '<div style="display:flex;gap:8px;justify-content:flex-end">'        + '<button id="bgg-ann" style="background:transparent;border:1px solid var(--border);padding:7px 14px;border-radius:var(--r);cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'        + '<button id="bgg-ok" style="background:#1a7a5e;color:#fff;border:none;padding:7px 14px;border-radius:var(--r);cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">&#128190; Definitief opslaan</button>'        + '</div>';
      ov.appendChild(mo);
      document.body.appendChild(ov);
      ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
      mo.querySelector('#bgg-ann').onclick = function(){document.body.removeChild(ov);};

      // Opname (Web Speech API)
      var bggRec=null, bggRecActief=false;
      var SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
      var recBtn=document.getElementById('bgg-rec-btn');
      var recSt=document.getElementById('bgg-rec-st');
      if(!SpeechRec){if(recBtn)recBtn.disabled=true;if(recSt)recSt.textContent='Chrome vereist';}
      else if(recBtn){
        recBtn.onclick=function(){
          if(!bggRecActief){
            bggRec=new SpeechRec();bggRec.lang='nl-NL';bggRec.continuous=true;bggRec.interimResults=true;
            var base=document.getElementById('bgg-notities').value,interim='';
            bggRec.onresult=function(ev){interim='';var fin='';for(var i=ev.resultIndex;i<ev.results.length;i++){if(ev.results[i].isFinal)fin+=ev.results[i][0].transcript+' ';else interim+=ev.results[i][0].transcript;}if(fin){base+=(base&&!base.endsWith(' ')?'\n':'')+fin;}document.getElementById('bgg-notities').value=base+interim;};
            bggRec.onerror=function(e){if(recSt)recSt.textContent='Fout: '+e.error;bggRecActief=false;if(recBtn)recBtn.innerHTML='&#127908; Opnemen';};
            bggRec.onend=function(){if(bggRecActief){bggRec.start();}};
            bggRec.start();bggRecActief=true;recBtn.textContent='⏹ Stop opname';if(recSt)recSt.textContent='Opname actief...';
          } else {
            bggRec.stop();bggRecActief=false;recBtn.innerHTML='&#127908; Opnemen';if(recSt)recSt.textContent='';
          }
        };
      }

      // AI-verslag genereren
      var aiBtn=document.getElementById('bgg-ai-btn');
      var aiSt=document.getElementById('bgg-ai-st');
      if(aiBtn){
        aiBtn.onclick=async function(){
          var notities=(document.getElementById('bgg-notities').value||'').trim();
          if(!notities){if(aiSt)aiSt.textContent='Voer eerst notities in.';return;}
          aiBtn.disabled=true;if(aiSt)aiSt.textContent='Genereren...';
          var prompt='Maak professioneel gespreksverslag M&A traject.\n\nGesprek: '+document.getElementById('bgg-type').value+' | Datum: '+document.getElementById('bgg-datum').value+' | Deelnemers: '+(document.getElementById('bgg-deelnemers').value||'onbekend')+'\n\nNOTITIES:\n'+notities+'\n\nFormaat: ## Samenvatting, ## Besproken punten, ## Beslissingen, ## Actiepunten, ## Volgende stap';
          var rd=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:1500})}).then(function(r){return r.json();}).catch(function(){return{};});
          document.getElementById('bgg-verslag').value=rd.text||'';
          aiBtn.disabled=false;if(aiSt)aiSt.textContent='✓ Verslag gegenereerd';
        };
      }

      // Concept auto-opslaan
      var bggTimer = null;
      ['bgg-datum','bgg-type','bgg-deelnemers','bgg-zicht','bgg-notities','bgg-verslag'].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.addEventListener('input',function(){
          clearTimeout(bggTimer);
          bggTimer = setTimeout(function(){
            var ind = document.getElementById('bgg-concept-ind');
            fetch(WORKER+'/mna/gesprek/concept',{method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({code:S.code,datum:document.getElementById('bgg-datum').value,
                deelnemers:document.getElementById('bgg-deelnemers').value,
                type:document.getElementById('bgg-type').value,
                verslag:document.getElementById('bgg-verslag').value,
                zichtbaar_voor:document.getElementById('bgg-zicht').value,
                auteur:S.traject&&S.traject.begeleider_naam||'Begeleider'})
            });
            if(ind) ind.textContent = 'Concept opgeslagen '+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
          }, 2000);
        });
      });

      // Definitief opslaan
      mo.querySelector('#bgg-ok').onclick = async function(){
        var datum = document.getElementById('bgg-datum').value;
        var err = document.getElementById('bgg-err');
        if(!datum){err.style.display='block';err.textContent='Datum is verplicht.';return;}
        var payload = {
          datum: datum,
          deelnemers: document.getElementById('bgg-deelnemers').value.trim(),
          type: document.getElementById('bgg-type').value,
          ruwe_notities: document.getElementById('bgg-notities').value.trim(),
          verslag: document.getElementById('bgg-verslag').value.trim(),
          zichtbaar_voor: document.getElementById('bgg-zicht').value
        };
        if(g.id) payload.id = g.id;
        var btn = this; btn.disabled=true; btn.textContent='Opslaan...';
        var r = await fetch(WORKER+'/mna/admin/gesprekken/'+S.traject.id,{
          method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},
          body:JSON.stringify(payload)
        }).then(function(x){return x.json();}).catch(function(){return{};});
        if(r.ok){
          fetch(WORKER+'/mna/gesprek/concept/delete/'+S.code,{method:'POST'}).catch(function(){});
          document.body.removeChild(ov);
          toast('Gesprek opgeslagen.','ok');
          laadBgGesprekken();
        } else {
          err.style.display='block';err.textContent='Fout: '+(r.error||'onbekend');
          btn.disabled=false;btn.innerHTML='&#128190; Definitief opslaan';
        }
      };
    }

    laadBgGesprekken();
  }

  var feedbackBtn=document.getElementById('bg-feedback-actie');
  if(feedbackBtn)feedbackBtn.onclick=function(){
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','feedback-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:480px;width:100%';
    mo.innerHTML='<div id="feedback-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.5rem">&#128172; Feedback of een bug melden</div>'
      +'<div style="font-size:12px;color:#8a8880;margin-bottom:1rem">Kort omschrijven wat je zag en wat je verwachtte. Komt direct binnen bij Marcel — reken op een reactie binnen 24 uur.</div>'
      +'<textarea id="fb-tekst" rows="6" style="width:100%;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;padding:9px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;resize:vertical" placeholder="Wat zag je en wat verwachtte je?"></textarea>'
      +'<div id="fb-err" style="display:none;color:#e05252;font-size:12px;margin-top:.5rem"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">'
      +'<button id="fb-ann" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Annuleren</button>'
      +'<button id="fb-ok" style="background:var(--gold);color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">Versturen</button>'
      +'</div>';
    ov.appendChild(mo);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('fb-ann').onclick=function(){document.body.removeChild(ov);};
    document.getElementById('fb-ok').onclick=async function(){
      var btn=this;var tekst=document.getElementById('fb-tekst').value.trim();var errEl=document.getElementById('fb-err');
      if(!tekst){errEl.textContent='Vul een omschrijving in.';errEl.style.display='block';return;}
      btn.disabled=true;btn.textContent='Versturen...';
      try{
        var r=await fetch(WORKER+'/mna/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,bericht:tekst,scherm:'begeleider-dashboard'})});
        var d=await r.json();
        if(d.ok){mo.innerHTML='<div style="text-align:center;padding:1rem 0"><div style="font-size:2rem;margin-bottom:.75rem">&#10003;</div><div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.5rem">Bedankt!</div><div style="font-size:13px;color:var(--mid)">Je melding is verstuurd. We pakken dit binnen 24 uur op.</div><button id="fb-sluit" style="margin-top:1.25rem;background:var(--gold);color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600">Sluiten</button></div>';document.getElementById('fb-sluit').onclick=function(){document.body.removeChild(ov);};}
        else{errEl.textContent='Fout: '+(d.error||'onbekend');errEl.style.display='block';btn.disabled=false;btn.textContent='Versturen';}
      }catch(e){errEl.textContent='Verbindingsfout.';errEl.style.display='block';btn.disabled=false;btn.textContent='Versturen';}
    };
  };

  var aiStatusBtn=document.getElementById('bg-ai-status-actie');
  if(aiStatusBtn)aiStatusBtn.onclick=function(){
    var out=document.getElementById('bg-ai-status-out');
    var zichtbaar=out.style.display==='block';
    if(zichtbaar){out.style.display='none';return;}
    var st=berekenAiVerificatiestatus();
    var t=st.telling;
    var faseL={financieel:'I. Financieel',commercieel:'II. Klanten & commercieel',partner:'III. Partners & personeel',compliance:'IV. Compliance & kwaliteit',it:'V. IT & automatisering',juridisch:'VI. Juridisch & fiscaal',strategisch:'VII. Strategisch & markt'};
    var html='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">';
    html+='<div style="font-size:13px;font-weight:600;color:var(--head);margin-bottom:.75rem">&#129302; AI-verificatiestatus — wat is er automatisch gedaan, wat niet</div>';
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:1rem">'
      +'<div style="background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);padding:8px 10px"><div style="font-size:18px;font-weight:700;color:var(--teal-dim)">'+t.ai_document+'</div><div style="font-size:10px;color:var(--muted)">velden via AI uit documenten</div></div>'
      +(st.entiteitenActief?'<div style="background:var(--info-bg);border:1px solid var(--info);border-radius:var(--r);padding:8px 10px"><div style="font-size:18px;font-weight:700;color:var(--info)">'+t.auto_consolidatie+'</div><div style="font-size:10px;color:var(--muted)">velden automatisch geconsolideerd</div></div>':'')
      +'<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px"><div style="font-size:18px;font-weight:700;color:var(--sub)">'+t.handmatig+'</div><div style="font-size:10px;color:var(--muted)">velden handmatig ingevoerd</div></div>'
      +'<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:8px 10px"><div style="font-size:18px;font-weight:700;color:var(--gold-dark)">'+t.onbekend+'</div><div style="font-size:10px;color:var(--muted)">herkomst onbekend (ouder dan deze functie)</div></div>'
      +'</div>';
    if(t.totaal){
      html+='<div style="font-size:11px;color:var(--muted);margin-bottom:1rem">Van de '+t.totaal+' ingevulde velden op groepsniveau is '+Math.round((t.ai_document+t.auto_consolidatie)/t.totaal*100)+'% automatisch tot stand gekomen (document-extractie of consolidatie) — controleer deze altijd, AI verzint geen bedragen maar leest ze over uit de brondocumenten, wat fouten in het brondocument zelf niet uitsluit.</div>';
    }
    html+='<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Documenten</div>';
    html+='<div style="font-size:12px;color:var(--sub);margin-bottom:.75rem">'+st.docsGeanalyseerd.length+' document(en) succesvol geanalyseerd. '+st.docsVerworpen.length+' document(en) afgewezen door de entiteitscheck.</div>';
    if(st.docsVerworpen.length){
      html+='<div style="margin-bottom:1rem">'+st.docsVerworpen.map(function(d){return '<div style="font-size:11px;color:var(--red);padding:3px 0">&#128683; '+esc(d.naam)+' — '+esc(d.verworpen_reden||'geen reden bekend')+'</div>';}).join('')+'</div>';
    }
    html+='<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.75rem 1rem">'
      +'<div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:.4rem">&#9888; Wat AI NIET heeft gedaan — controleer dit zelf</div>'
      +'<div style="font-size:11px;color:var(--sub);line-height:1.7">'
      +'&bull; Geen feitelijke controle van de inhoud van brondocumenten — AI leest over wat er staat, beoordeelt niet of het klopt.<br>'
      +(st.entiteitenActief?'&bull; Geen eliminatie van onderlinge transacties tussen entiteiten in de automatische som (bijv. intercompany-huur) — corrigeer dit zelf, bijv. via het veld Normalisatie.<br>':'')
      +'&bull; Klantconcentratie (top1/top10), pipeline en vergelijkbare groepsniveau-inschattingen zijn nooit automatisch ingevuld — altijd handmatige beoordeling.<br>'
      +'&bull; Rode vlaggen en checklist-items zijn niet automatisch afgevinkt — dat blijft een bewuste keuze van de begeleider.'
      +'</div></div>';
    html+='</div>';
    out.innerHTML=html;out.style.display='block';
  };

  var wrdBtn=document.getElementById('bg-waardering-actie');
  if(wrdBtn)wrdBtn.onclick=function(){S.screen='waardering';renderApp();};

  // ===== Koper-fit strategie: harde/tekstuele/vrije criteria tegen de DD-data van de verkoper =====
  // Begeleider-only (v1) — verkoper mag de koper-strategie nooit zien, vandaar hier en niet in een
  // voor verkoper zichtbaar scherm. GOUDEN STANDAARD: categorie A/B worden server-side deterministisch
  // beoordeeld (geen AI); alleen categorie C (vrije tekst) gaat naar de AI, die uitsluitend citeert en
  // nooit zelf oordeelt (zie backend-toelichting bij /mna/koper-criteria/beoordeel).
  var KOPERFIT_A_VELDEN=[
    {type:'omzet_min',label:'Minimale jaaromzet (€)'},
    {type:'ebitdamarge_min',label:'Minimale EBITDA-marge (%)'},
    {type:'ebitdamarge_max',label:'Maximale EBITDA-marge (%)'},
    {type:'fte_min',label:'Minimaal aantal FTE'},
    {type:'recurring_min',label:'Minimaal % recurring omzet'},
    {type:'klantconcentratie_max',label:'Maximale klantconcentratie grootste klant (%)'}
  ];
  var KOPERFIT_B_VELDEN=[
    {type:'sector_niche',label:'Gewenste sector/niche (trefwoord)'},
    {type:'regio',label:'Gewenste regio/marktpositie (trefwoord)'}
  ];
  var KOPERFIT_VERDICT_LABEL={
    past:{txt:'&#10003; Past',kleur:'var(--teal)',bg:'var(--teal-bg)'},
    past_niet:{txt:'&#10005; Past niet',kleur:'var(--red)',bg:'var(--red-bg)'},
    onvoldoende_data:{txt:'&#9888; Onvoldoende data',kleur:'var(--muted)',bg:'var(--card)'},
    niet_objectief_vast_te_stellen:{txt:'&#128172; Zie citaten — zelf beoordelen',kleur:'var(--info)',bg:'var(--info-bg)'}
  };
  function koperFitFormHtml(criteria){
    criteria=criteria||[];
    function waardeVoor(type){var c=criteria.find(function(x){return x.type===type;});return c?c.waarde:'';}
    function resultaatVoor(idOfType,isType){
      var c=isType?criteria.find(function(x){return x.type===idOfType;}):criteria.find(function(x){return x.id===idOfType;});
      if(!c||!c.result_verdict)return '';
      var lbl=KOPERFIT_VERDICT_LABEL[c.result_verdict]||{txt:c.result_verdict,kleur:'var(--muted)',bg:'var(--card)'};
      return '<div style="margin-top:4px;padding:6px 10px;background:'+lbl.bg+';border-radius:var(--r);font-size:11px">'
        +'<span style="font-weight:600;color:'+lbl.kleur+'">'+lbl.txt+'</span>'
        +(c.result_onderbouwing?'<div style="color:var(--mid);margin-top:2px">'+esc(c.result_onderbouwing)+'</div>':'')
        +'</div>';
    }
    var cCriteria=criteria.filter(function(x){return x.categorie==='C';});
    var cTekst=cCriteria.map(function(x){return x.waarde;}).join('\n');
    var cResultaten=cCriteria.map(function(x){return '<div style="margin-bottom:.5rem"><div style="font-size:11px;color:var(--sub)">&bull; '+esc(x.waarde)+'</div>'+resultaatVoor(x.id,false)+'</div>';}).join('');
    var html='<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:13px;font-weight:600;color:var(--head);margin-bottom:.4rem">&#127919; Koper-fit strategie</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:1rem;line-height:1.6">Leg vast waarom de koper deze overname zoekt en welke criteria de kandidaat moet halen. Harde criteria worden rekenkundig getoetst aan de ingevulde DD-cijfers (geen AI, geen gok). Alleen voor de vrije-tekst-overwegingen haalt de AI relevante passages aan — die velt zelf nooit een oordeel. Alleen zichtbaar voor u, niet voor de verkoper.</div>'
      +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Harde criteria — laat leeg als niet van toepassing</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem">'
      +KOPERFIT_A_VELDEN.map(function(v){return '<div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:2px">'+v.label+'</label><input type="text" id="kf-a-'+v.type+'" value="'+esc(waardeVoor(v.type))+'" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:6px 8px;font-size:12px">'+resultaatVoor(v.type,true)+'</div>';}).join('')
      +'</div>'
      +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Tekstuele criteria — trefwoord, laat leeg als niet van toepassing</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem">'
      +KOPERFIT_B_VELDEN.map(function(v){return '<div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:2px">'+v.label+'</label><input type="text" id="kf-b-'+v.type+'" value="'+esc(waardeVoor(v.type))+'" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:6px 8px;font-size:12px">'+resultaatVoor(v.type,true)+'</div>';}).join('')
      +'</div>'
      +'<div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Overige strategische overwegingen — één per regel</div>'
      +'<textarea id="kf-c-tekst" style="width:100%;height:80px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:8px;font-size:12px;margin-bottom:.75rem">'+esc(cTekst)+'</textarea>'
      +(cResultaten?'<div style="margin-bottom:1rem">'+cResultaten+'</div>':'')
      +'<div style="display:flex;gap:8px">'
      +'<button id="kf-opslaan" class="btn-ghost" style="font-size:12px;padding:6px 14px">&#128190; Opslaan</button>'
      +'<button id="kf-beoordeel" class="btn" style="font-size:12px;padding:6px 14px;background:#6b7c93">&#127919; Beoordeel fit</button>'
      +'</div>'
      +'</div>';
    return html;
  }
  async function koperFitLaadEnToon(){
    var out=document.getElementById('bg-koperfit-out');if(!out)return;
    out.style.display='block';out.innerHTML='<div style="color:var(--muted);font-size:13px;padding:1rem">Laden...</div>';
    var r=await fetch(WORKER+'/mna/koper-criteria/'+encodeURIComponent(S.code),{headers:{'x-tussen-key':S._bgKey||''}}).then(function(x){return x.json();}).catch(function(){return{ok:false};});
    out.innerHTML=koperFitFormHtml(r.ok?r.criteria:[]);
    koperFitWireForm();
  }
  function koperFitLeesFormulier(){
    var criteria=[];
    KOPERFIT_A_VELDEN.forEach(function(v){
      var el=document.getElementById('kf-a-'+v.type);
      if(el&&el.value.trim()!=='')criteria.push({categorie:'A',type:v.type,label:v.label,waarde:el.value.trim()});
    });
    KOPERFIT_B_VELDEN.forEach(function(v){
      var el=document.getElementById('kf-b-'+v.type);
      if(el&&el.value.trim()!=='')criteria.push({categorie:'B',type:v.type,label:v.label,waarde:el.value.trim()});
    });
    var cEl=document.getElementById('kf-c-tekst');
    if(cEl&&cEl.value.trim()!==''){
      cEl.value.split('\n').map(function(l){return l.trim();}).filter(Boolean).forEach(function(regel){
        criteria.push({categorie:'C',waarde:regel});
      });
    }
    return criteria;
  }
  function koperFitWireForm(){
    var opslaanBtn=document.getElementById('kf-opslaan');
    if(opslaanBtn)opslaanBtn.onclick=async function(){
      opslaanBtn.disabled=true;opslaanBtn.textContent='Opslaan...';
      var criteria=koperFitLeesFormulier();
      var r=await fetch(WORKER+'/mna/koper-criteria/opslaan',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code,criteria:criteria})}).then(function(x){return x.json();}).catch(function(){return{ok:false};});
      if(r.ok){toast('Criteria opgeslagen.','ok');koperFitLaadEnToon();}
      else{toast('Opslaan mislukt: '+(r.error||'onbekend'),'err');opslaanBtn.disabled=false;opslaanBtn.textContent='&#128190; Opslaan';}
    };
    var beoordeelBtn=document.getElementById('kf-beoordeel');
    if(beoordeelBtn)beoordeelBtn.onclick=async function(){
      beoordeelBtn.disabled=true;beoordeelBtn.textContent='Bezig... (kan 15-30 sec duren)';
      var criteria=koperFitLeesFormulier();
      var saveR=await fetch(WORKER+'/mna/koper-criteria/opslaan',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code,criteria:criteria})}).then(function(x){return x.json();}).catch(function(){return{ok:false};});
      if(!saveR.ok){toast('Opslaan mislukt: '+(saveR.error||'onbekend'),'err');beoordeelBtn.disabled=false;beoordeelBtn.textContent='&#127919; Beoordeel fit';return;}
      var r=await fetch(WORKER+'/mna/koper-criteria/beoordeel',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code})}).then(function(x){return x.json();}).catch(function(){return{ok:false};});
      if(!r.ok){toast('Beoordelen mislukt: '+(r.error||'onbekend'),'err');beoordeelBtn.disabled=false;beoordeelBtn.textContent='&#127919; Beoordeel fit';return;}
      toast('Beoordeling klaar.','ok');
      koperFitLaadEnToon();
    };
  }
  var koperfitBtn=document.getElementById('bg-koperfit-actie');
  if(koperfitBtn)koperfitBtn.onclick=function(){
    var out=document.getElementById('bg-koperfit-out');
    if(out&&out.style.display==='block'){out.style.display='none';return;}
    koperFitLaadEnToon();
  };

}





  // (slaConceptOp verwijderd juli 2026 — dood gewicht: het endpoint bestond niet
  //  en niets las de concepten terug.)

