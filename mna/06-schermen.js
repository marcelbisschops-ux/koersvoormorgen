function renderCover(){
  var t=S.traject;
  var vergrendeld=t&&t.status==='vergrendeld';
  var datum=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
  var docFields=[];
  FASES.forEach(function(f){
    var needed=f.dataFields.filter(function(df){return df.doc;});
    if(needed.length)docFields.push({fase:f.num+'. '+f.title,items:needed.map(function(df){return df.label;})});
  });
  var docHtml=docFields.map(function(d){
    return '<div style="margin-bottom:.6rem"><div style="font-weight:600;color:var(--sub);font-size:13px;margin-bottom:.2rem">'+esc(d.fase)+'</div>'
      +d.items.map(function(i){return '<div style="font-size:12px;color:var(--mid);padding:1px 0 1px 1rem">&#8212; '+esc(i)+'</div>';}).join('')+'</div>';
  }).join('');

  var intro='';
  if(isVerkoper()){
    intro='<p>Geachte '+esc(t.contact_naam||'relatie')+',</p>'
      +'<p>In het kader van het '+esc(t.traject_type||'M&A')+'-traject voor <strong>'+esc(t.kantoor_naam)+'</strong> verzoek ik u onderstaande gegevens in te voeren via dit beveiligde platform. U kunt per fase de informatie invullen en tussentijds opslaan.</p>'
      +'<p>Documenten uploadt u direct via het uploadvenster naast de velden &mdash; de AI analyseert ze automatisch.</p>'
          +'<p>Wanneer een veld niet automatisch wordt ingevuld na het uploaden, kunt u dit handmatig doen — het geüploade document dient als ondersteuning.</p>'
      +'<p>Uw gegevens worden strikt vertrouwelijk behandeld.</p>'
      +'<div style="margin:1rem 0;padding:.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r);font-size:11px;color:var(--muted);line-height:1.7">&#128274; <strong>Beveiliging &amp; AVG:</strong> Alle gegevens worden versleuteld via HTTPS verstuurd en opgeslagen op Cloudflare-servers in Europa (Frankfurt, EU) en uitsluitend gebruikt voor dit M&amp;A-traject. <strong>'+esc(t.begeleider_naam||'Uw adviseur')+'</strong> is de verwerkingsverantwoordelijke voor uw gegevens conform de AVG — voor vragen over inzage, correctie of verwijdering van úw gegevens kunt u het beste rechtstreeks contact opnemen'+(t.begeleider_email?' via <a href=\"mailto:'+esc(t.begeleider_email)+'\" style=\"color:var(--teal)\">'+esc(t.begeleider_email)+'</a>':'')+'.'
      +'<div style="margin-top:.5rem;font-size:10px;color:#b8b6ac">Verwerkt via het '+BRAND.platformEcht+'-platform, techniek verzorgd door '+BRAND.kort+' — zie de <a href=\"privacy.html\" style=\"color:#b8b6ac\">verwerkersinformatie</a>.</div></div>'
    +'<p>Met vriendelijke groet,<br><strong>'+esc(t.begeleider_naam||BRAND.contactpersoon)+'</strong><br><span style="font-size:12px;color:var(--muted)">Senior M&amp;A-adviseur &middot; '+esc(t.begeleider_bedrijf||BRAND.bedrijfKort)+'<br><a href="mailto:'+esc(t.begeleider_email||BRAND.email)+'" style="color:var(--muted)">'+esc(t.begeleider_email||BRAND.email)+'</a></span></p>'
      +'<div style="margin-top:.75rem;font-size:10px;color:#c8c5bc">Mogelijk gemaakt door '+BRAND.platformEcht+'</div>';
  }else if(isTussen()){
    intro='<p>Geachte tussenpersoon,</p>'
      +'<p>U heeft toegang tot de voortgang van het due diligence traject (trajecttype: <strong>'+esc(t.traject_type||'M&A')+'</strong>). De kantooridentiteit is geanonimiseerd conform de afspraken. U kunt per fase de ingevoerde informatie inzien en een AI-advies genereren op basis van de beschikbare data.</p>'
      +'<p>Vragen? Neem contact op via <a href="mailto:' + esc(t.begeleider_email||BRAND.email) + '" style="color:var(--teal)">' + esc(t.begeleider_email||BRAND.email) + '</a>.</p>'
      +'<p>Met vriendelijke groet,<br><strong>'+esc(t.begeleider_naam||BRAND.contactpersoon)+'</strong><br><span style="font-size:12px;color:var(--muted)">Senior M&amp;A-adviseur &middot; '+esc(t.begeleider_bedrijf||BRAND.bedrijfKort)+'</span></p>';
  }else if(!t.koper_vrijgegeven){
    // Koper zonder vrijgave — toon BEM als die beschikbaar is
    var bemBlokKoper='';
    if(S.bemDocId||S.bemTekst){
      bemBlokKoper='<div style="margin:1.5rem;background:#eef3fa;border:1px solid #2a5ea0;border-radius:var(--r2);padding:1.25rem">'
        +'<div style="font-size:11px;font-weight:600;color:#2a5ea0;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem">&#128203; Bemiddelingsovereenkomst beschikbaar</div>'
        +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">De Bemiddelingsovereenkomst is opgesteld door uw adviseur.'+(S.bemDocId||S.bemGetekend?' &mdash; <strong style="color:#2a5ea0">Reeds ondertekend.</strong>':' Lees en onderteken het document.')+' </div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +(S.bemDocId?'<a href="'+WORKER+'/mna/document/download/'+S.bemDocId+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:12px;border-color:#2a5ea0;color:#2a5ea0;text-decoration:none">&#8681; Download BEM</a>':'')
        +(S.bemTekst&&!S.bemDocId?'<button id="bem-lees-btn2" class="btn-ghost" style="font-size:12px;border-color:#2a5ea0;color:#2a5ea0">&#128065; Lees BEM</button>':'')
        +(S.bemDocId||S.bemGetekend?'<div style="font-size:11px;padding:4px 10px;border-radius:12px;background:#eef3fa;border:1px solid #2a5ea0;color:#2a5ea0">&#10003; '+(S.bemGetekend?'Getekend door '+esc(S.bemGetekend):'Reeds ondertekend')+'</div>':'<button id="bem-teken-btn" class="btn" style="font-size:12px;padding:6px 14px;background:#2a5ea0">&#9998; Akkoord &amp; onderteken</button>')
        +'</div></div>';
    }
    return '<div class="wrap anim">'
      +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
      +'<div style="display:flex;gap:8px;margin-left:auto">'
    +'<button class="btn-ghost btn-sm" onclick="refreshData()">&#8635;</button>'
    +'<button class="btn-ghost btn-sm" onclick="uitloggen()">&#8592; Uitloggen</button>'
    +'</div></div>'
      +'<div class="cover-letter" style="text-align:center;padding:3rem 2rem">'
      +'<div style="font-size:2rem;margin-bottom:1rem">&#128274;</div>'
      +'<div style="font-family:Playfair Display,serif;font-size:1.3rem;color:var(--head);font-weight:600;margin-bottom:.75rem">Informatie nog niet beschikbaar</div>'
      +'<div style="font-size:13px;color:var(--mid);line-height:1.7;max-width:420px;margin:0 auto">De due diligence informatie is nog niet vrijgegeven door de adviseur. U ontvangt bericht zodra u toegang heeft.</div>'
      +'</div>'
      +bemBlokKoper
      +'</div>';
}else{
    intro='<p>Geachte relatie,</p>'
      +'<p>Hieronder vindt u de door het kantoor ingevulde informatie in het kader van het '+esc(t.traject_type||'M&A')+'-traject. U kunt de gegevens inzien. Vragen of opmerkingen kunt u richten aan ' + esc(t.begeleider_naam||BRAND.contactpersoon) + '.</p>'
      +'<div style="margin:1rem 0;padding:.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r);font-size:11px;color:var(--muted);line-height:1.7">&#128274; <strong>Beveiliging &amp; AVG:</strong> <strong>'+esc(t.begeleider_naam||'Uw adviseur')+'</strong> is de verwerkingsverantwoordelijke voor de gegevens in dit traject conform de AVG'+(t.begeleider_email?' — voor vragen kunt u contact opnemen via <a href=\"mailto:'+esc(t.begeleider_email)+'\" style=\"color:var(--teal)\">'+esc(t.begeleider_email)+'</a>':'')+'.'
      +'<div style="margin-top:.5rem;font-size:10px;color:#b8b6ac">Verwerkt via het '+BRAND.platformEcht+'-platform, techniek verzorgd door '+BRAND.kort+' — zie de <a href=\"privacy.html\" style=\"color:#b8b6ac\">verwerkersinformatie</a>.</div></div>'
      +'<p>Met vriendelijke groet,<br><strong>'+esc(t.begeleider_naam||BRAND.contactpersoon)+'</strong><br><span style="font-size:12px;color:var(--muted)">Senior M&amp;A-adviseur &middot; '+esc(t.begeleider_bedrijf||BRAND.bedrijfKort)+'</span></p>'
      +'<div style="margin-top:.75rem;font-size:10px;color:#c8c5bc">Mogelijk gemaakt door '+BRAND.platformEcht+'</div>';
  }

  return '<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="window.print()">PDF afdrukken</button>'
    +'<button class="btn-ghost btn-sm" onclick="uitloggen()">&#8592; Uitloggen</button>'
    +(S.rol==='tussen'?'<button class="btn-ghost btn-sm" id="logboek-btn">&#128221; Logboek</button>':'')
    +'</div><div style="display:flex;align-items:center;gap:10px;padding:.5rem 0"><span style="font-size:12px;color:var(--muted)">Huidige fase:</span><span id="cover-fase-badge" style="font-size:11px;font-weight:600;padding:3px 12px;border-radius:12px;background:var(--teal-bg);color:var(--teal);border:1px solid var(--teal-dark)">Laden...</span></div><div style="display:none">'
    +(isVerkoper()?'<button class="btn btn-sm" id="to-main-btn">Start invullen &#8594;</button>'
    :isTussen()?(t.koper_vrijgegeven
        ?'<button class="btn-ghost btn-sm" id="intrekken-btn">&#128275; Vrijgave intrekken</button>'
        :'<button class="btn btn-sm" id="vrijgeven-btn">&#128275; Koper toegang geven</button>')
      +' <button class="btn btn-sm" id="to-main-btn">Bekijk data &#8594;</button>'
      +' <button class="btn btn-sm" id="to-waardering-btn" style="background:var(--gold)">&#9654; Waardering</button>'
      +' <button class="btn btn-sm" id="doc-knoppen-btn" style="background:#2a5ea0">&#128196; Documenten</button>'
      +' <button class="btn btn-sm" id="gesprek-btn-cover" style="background:var(--teal-dim)">&#128172; Gesprek vastleggen</button>'
      +' <button class="btn btn-sm" id="ai-analyse-btn-cover" style="background:#6b7c93">&#9881; AI-analyse</button>'
    :'<button class="btn btn-sm" id="to-main-btn">Bekijk data &#8594;</button>'
    +(t.koper_vrijgegeven?'<button class="btn btn-sm" id="to-waardering-btn" style="background:var(--gold)">&#9654; Waardering</button>':''))
    +'</div></div>'
    +(vergrendeld?'<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--red)">&#128274; <strong>Dit traject is vergrendeld op '+(t.vergrendeld_op?new Date(t.vergrendeld_op).toLocaleString('nl-NL'):'onbekend')+'.</strong> Verdere wijzigingen zijn niet meer mogelijk.</div>':'')
    +'<div class="cover-letter">'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:.5rem">' + esc(t.begeleider_bedrijf||BRAND.bedrijfKort) + ' &middot; M&amp;A Begeleiding &middot; '+datum+'</div>'
    +'<h2>'+( isVerkoper()?'Informatieverzoek due diligence':'Due diligence overzicht')+'</h2>'
    +'<div style="font-size:12px;color:var(--muted);margin-bottom:1.25rem">Trajectcode: <span style="font-family:IBM Plex Mono,monospace;color:var(--teal)">'+esc(S.code)+'</span></div>'
    +intro+'</div>'
    +(S.ndaTekst?'<div style="margin-top:1.5rem;background:#f3f0ff;border:1px solid #7c5cbf;border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:11px;font-weight:600;color:#7c5cbf;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem">&#128274; Non-Disclosure Agreement beschikbaar</div>'
      +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">De NDA is aangemaakt op '+(S.ndaDatum?new Date(S.ndaDatum).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'}):'-')+'. Lees de NDA door en retourneer de ondertekende versie aan de adviseur.</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:.5rem">'
      +(S.ndaDocId?'<a href="'+WORKER+'/mna/document/download/'+S.ndaDocId+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:12px;border-color:#7c5cbf;color:#7c5cbf;text-decoration:none">&#8681; Download NDA</a>':'<button id="nda-lees-btn" class="btn-ghost" style="font-size:12px;border-color:#7c5cbf;color:#7c5cbf">&#128065; Lees NDA</button>')
      +(S.ndaGetekend?'<div style="font-size:11px;padding:4px 10px;border-radius:12px;background:#f3f0ff;border:1px solid #7c5cbf;color:#7c5cbf;display:flex;align-items:center;gap:4px">&#10003; Getekend door '+esc(S.ndaGetekend)+'</div>':(!isAdmin()?'<button id="nda-teken-btn" class="btn" style="font-size:12px;padding:6px 14px;background:#7c5cbf">&#9998; Akkoord &amp; onderteken</button>':''))
      +'</div>'
      +'</div>':'')
    +(isVerkoper()&&S.loiTekst?'<div style="margin-top:1.5rem;background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:11px;font-weight:600;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem">&#128196; Letter of Intent beschikbaar</div>'
      +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">De LoI is aangemaakt op '+(S.loiDatum?new Date(S.loiDatum).toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"}):"—")+'. Lees de LoI door en upload de ondertekende versie via fase Juridisch &amp; Fiscaal.</div>'
      +'<div style="display:flex;gap:8px">'
      +(S.loiDocId?'<a href="'+WORKER+'/mna/document/download/'+S.loiDocId+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:12px;text-decoration:none">&#8681; Download LoI</a>':('<button id="loi-lees-btn" class="btn-ghost" style="font-size:12px">&#128065; Lees LoI</button>'+'<button id="loi-print2-btn" class="btn" style="font-size:12px;background:var(--gold)">&#128196; Download / Print</button>'))
      +(S.loiGetekend?'<div style="font-size:11px;padding:4px 10px;border-radius:12px;background:var(--gold-bg);border:1px solid var(--gold);color:var(--gold);display:flex;align-items:center;gap:4px">&#10003; Getekend door '+esc(S.loiGetekend)+'</div>':(!isAdmin()?'<button id="loi-teken-btn" class="btn-ghost" style="font-size:12px;border-color:var(--gold);color:var(--gold)">&#9998; Akkoord &amp; onderteken</button>':''))
      +'</div></div>':'')
    +'<div id="partij-docs-sectie" style="margin-top:1.5rem"></div>'
    +'<div id="partij-gesprekken-sectie" style="margin-top:1rem"></div>'
    +(isVerkoper()?'<button class="btn" id="to-main-btn2" style="width:100%;margin-top:1rem">'+(totalFillPct()>0?'Verder met invullen':'Start met invullen')+' &#8594;</button>':'')
    +(isKoper()?'<button class="btn" id="to-main-btn2" style="width:100%;margin-top:1rem">Bekijk due diligence-informatie &#8594;</button>':'')
    +(isKoper()&&t.koper_vrijgegeven?'<button class="btn-outline" id="to-waardering-btn2" style="width:100%;margin-top:.5rem">&#9654; Waardering</button>':'')
    +'</div>';
}

function renderMain(){
  var f=FASES[S.fase];
  var tp=isVerkoper()?totalFillPct():Math.round(FASES.reduce(function(a,fase){return a+pct(fase.id);},0)/FASES.length);
  var vergrendeld=S.traject&&S.traject.status==='vergrendeld';
  var isRO=isKoper()||vergrendeld;

  var ov='<div class="fase-grid">';
  FASES.forEach(function(fase,i){
    var p=isVerkoper()?fillPct(fase.id):pct(fase.id);
    ov+='<div class="fase-card'+(S.fase===i?' active':'')+'" data-fi="'+i+'">'
      +'<div class="fase-num">'+fase.num+'</div>'
      +'<div class="fase-name">'+fase.title+'</div>'
      +'<div class="fase-bar"><div class="fase-fill" style="width:'+p+'%;background:'+(p===100?'var(--teal)':p>50?'var(--gold)':'var(--red)')+'"></div></div>'
      +'<div class="fase-pct">'+p+'%</div>'
      +'</div>';
  });
  ov+='</div>';

  // Bepaal DD-fase: fase 1 (pre-LOI) of fase 2 (post-LOI). LET OP: loi_datum betekent alleen dat
  // de LoI is aangemaakt/verstuurd door de begeleider, niet dat de verkoper 'm heeft ondertekend —
  // alleen S.loiGetekend/t.loi_getekend (echte handtekening via /mna/teken) mag fase 2 ontgrendelen.
  // Regressie juli 2026: loi_datum werd hier ten onrechte ook als "getekend" behandeld, waardoor
  // fase-2-velden al vrijkwamen zodra de begeleider een LoI verstuurde.
  var loiGetekend = !!(S.loiGetekend || (S.traject && S.traject.loi_getekend));
  var huidigeDDFase = loiGetekend ? '2' : '1';

  // Data fields
  var dataHtml='<div class="panel">';
  // DD fase banner
  if(isVerkoper()){
    if(!loiGetekend){
      dataHtml+='<div style="background:var(--teal-bg);border:1px solid var(--teal);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px">'        +'<span style="font-size:16px">📋</span>'        +'<div><div style="font-size:12px;font-weight:600;color:var(--teal)">Fase 1 — Oriëntatie (pre-LoI)</div>'        +'<div style="font-size:11px;color:var(--teal-dim)">Na ondertekening van de LoI ontvangt u aanvullende vragen voor de volledige due diligence.</div></div>'        +'</div>';
    } else {
      dataHtml+='<div style="background:#eef3fa;border:1px solid #2a5ea0;border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px">'        +'<span style="font-size:16px">🔍</span>'        +'<div><div style="font-size:12px;font-weight:600;color:#2a5ea0">Fase 2 — Volledige due diligence (post-LoI)</div>'        +'<div style="font-size:11px;color:#4a6ea0">De LoI is ondertekend. Vul de aanvullende velden in voor de volledige due diligence.</div></div>'        +'</div>';
    }
  }
  dataHtml+='<div class="sec-hdr">Informatie invullen</div>';
  // Groepsstructuur (Fase 2): kiezer om cijfers per entiteit in te vullen i.p.v. alleen op groepsniveau
  if(!isKoper()&&S._entiteiten&&S._entiteiten.length){
    dataHtml+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;padding:.6rem .85rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">'
      +'<span style="font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap">Invullen voor:</span>'
      +'<select id="entiteit-kiezer-form" style="flex:1;font-size:12px;background:#fff;border:1px solid var(--border2);border-radius:6px;padding:5px 8px">'
      +'<option value=""'+(S._actieveEntiteit?'':' selected')+'>Groep (geconsolideerd)</option>'
      +S._entiteiten.map(function(e){return '<option value="'+esc(e.id)+'"'+(S._actieveEntiteit===e.id?' selected':'')+'>'+esc(e.naam)+'</option>';}).join('')
      +'</select></div>';
  }
  var instrTxt=isVerkoper()?'<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:1rem;padding-bottom:.75rem;border-bottom:1px solid var(--border)">Vul de velden in. Upload rechts de relevante documenten &mdash; velden worden automatisch ingelezen zolang het boekjaar in het document staat. Controleer alle automatisch ingevulde waarden. De ge&uuml;ploade documenten dienen als grondslag voor de due diligence. Ontbrekende velden vult u zelf in.</div>':'';
  dataHtml+=instrTxt+'<div class="data-grid">';
  var fase2GetoondHeader=false;
  f.dataFields.forEach(function(df){
    // Fase 2 velden: toon als vergrendeld als LoI nog niet getekend
    var isFase2 = df.fase === '2';
    var blokkeer = isFase2 && !loiGetekend && isVerkoper();

    if(df.header){
      // Voeg IV-badge toe als categorie in informatieverzoek staat
      if(isVerkoper() && S._ivSelectie && df.fase==='1'){
        var catId = f.id;
        var gevraagd = S._ivSelectie[catId] && S._ivSelectie[catId].length > 0;
        if(df.label && !df.label.startsWith('—') && gevraagd){
          // skip — badge staat al op sectie header
        }
      }
      // Header altijd tonen maar met fade als fase 2 geblokkeerd
      if(isFase2 && !loiGetekend && isVerkoper()){
        if(!fase2GetoondHeader){
          dataHtml+='</div><div style="margin:1.5rem 0 .75rem;padding:.6rem 1rem;background:#f5f5f3;border:1px solid var(--border);border-radius:var(--r);grid-column:1/-1;display:flex;align-items:center;gap:8px">'            +'<span style="font-size:13px">🔒</span>'            +'<span style="font-size:11px;font-weight:600;color:var(--muted)">Aanvullende vragen beschikbaar na ondertekening LoI</span>'            +'</div><div class="data-grid">';
          fase2GetoondHeader=true;
        }
        return;
      }
      dataHtml+='</div><div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);margin:1.25rem 0 .6rem;padding-top:1rem;border-top:1px solid var(--border);grid-column:1/-1">'+df.label+'</div><div class="data-grid">';
      return;
    }
    // Blokkeer fase 2 velden als LoI niet getekend
    if(blokkeer){
      if(!fase2GetoondHeader){
        dataHtml+='</div><div style="margin:1.5rem 0 .75rem;padding:.6rem 1rem;background:#f5f5f3;border:1px solid var(--border);border-radius:var(--r);grid-column:1/-1;display:flex;align-items:center;gap:8px">'          +'<span style="font-size:13px">🔒</span>'          +'<span style="font-size:11px;font-weight:600;color:var(--muted)">Aanvullende vragen beschikbaar na ondertekening LoI</span>'          +'</div><div class="data-grid">';
        fase2GetoondHeader=true;
      }
      return; // Sla geblokkeerde velden over
    }
    var val=S.data[f.id+'_'+df.id]||'';
    var ref=S.docRefs&&S.docRefs[f.id+'_'+df.id]||null;
    var missing=S.showValidation&&df.req&&!val.trim();
    // Check of dit veld een openstaand conflict heeft
    var hasConflict=S._pendingConflicts&&S._pendingConflicts[f.id+'_'+df.id];
    // Groepsstructuur (Fase 2): op groepsniveau (geen actieve entiteit) zijn geaggregeerde velden
    // read-only — automatisch berekend uit de entiteiten, niet handmatig te overschrijven.
    var isGeaggregeerdInGroep=!S._actieveEntiteit&&S._entiteiten&&S._entiteiten.length&&isGeaggregeerdVeld(f.id,df.id);
    dataHtml+='<div>';
    if(isRO){
      dataHtml+='<div class="f"><label>'+df.label+(df.req?' <span class="req">*</span>':'')+(df.doc?' &#128196;':'')+'</label>'
        +'<div class="readonly-val'+(val?'':' empty')+'">'+(val?esc(val):'Niet ingevuld')+(ref?'<span style="color:var(--gold);font-size:11px;margin-left:8px">&#128196; '+esc(ref)+'</span>':'')+'</div></div>';
    }else if(isGeaggregeerdInGroep){
      dataHtml+='<div class="f"><label>'+df.label+(df.req?' <span class="req">*</span>':'')+' <span style="color:var(--teal);font-size:9px;font-weight:600">&#128279; som van entiteiten</span></label>'
        +'<div class="readonly-val" style="background:var(--teal-bg);border-color:var(--teal-dark)" title="Automatisch berekend uit de geregistreerde entiteiten — vóór eliminatie van onderlinge transacties. Wijzig per entiteit via de kiezer hierboven.">'+(val?esc(val):'Nog geen entiteitsdata')+'</div></div>';
    }else{
      var conflictStyle=hasConflict?'border-color:var(--gold);background:#fffbf0':'';
      var conflictTitle=hasConflict?(' title="Document zegt: '+esc(hasConflict)+'"'):'';
      dataHtml+='<div class="f"><label>'+df.label+(df.req?' <span class="req">*</span>':'')+(df.doc?' <span style="color:var(--gold);font-size:9px">&#128196; ref</span>':'')
        +(hasConflict?' <span style="color:var(--gold);font-size:9px;font-weight:600" title="Document geeft andere waarde: '+esc(hasConflict)+'">&#9888; afwijking</span>':'')+'</label>'
        +'<input type="text" id="df_'+df.id+'" value="'+esc(val)+'" placeholder="'+esc(df.ph)+'" class="'+(missing?'missing':'')+'" style="'+conflictStyle+'"'+conflictTitle+' oninput="userEdit(this)"></div>';
    }
    dataHtml+='</div>';
  });
  dataHtml+='</div>'+(S.showValidation&&getMissing().find(function(m){return m.fase.startsWith(f.num);})
    ?'<div style="font-size:12px;color:var(--red);margin-top:.5rem">&#9888; Vul alle verplichte velden (*) in voor een volledig beeld.</div>':'')+'</div>';

  // Marcel-only: checklist + rode vlaggen + notities + AI
  var extraHtml='';
  // Toon koper reactie voor tussenpersoon en Marcel
  if(isTussen()||(!isVerkoper()&&!isKoper())){
    var kReactie=S.koperReacties&&S.koperReacties[f.id];
    if(kReactie){
      extraHtml='<div class="panel" style="border-color:var(--gold);margin-bottom:1rem">'
        +'<div class="sec-hdr" style="color:var(--gold)">&#128172; Koper opmerking</div>'
        +'<div style="font-size:13px;color:var(--mid);line-height:1.7;font-style:italic;padding:.75rem;background:var(--gold-bg);border-radius:var(--r)">'+esc(kReactie)+'</div>'
        +'</div>';
    }
  }
  if(!isVerkoper()){
    var chkHtml='<div class="panel"><div class="sec-hdr">Checklist (intern)</div>';
    f.items.forEach(function(item,i){var key=f.id+'_'+i;var on=!!S.checked[key];chkHtml+='<div class="chk-item'+(on?' on':'')+'" data-key="'+key+'"'+(isKoper()?' style="cursor:default"':'')+'><div class="chk-box">'+(on?'&#10003;':'')+'</div><div class="chk-lbl">'+item+'</div></div>';});
    chkHtml+='<div class="sec-hdr" style="margin-top:1rem;color:var(--red)">Rode vlaggen &mdash; gesignaleerd?</div>';
    f.redflags.forEach(function(rf,i){var key=f.id+'_rf_'+i;var on=!!S.checked[key];chkHtml+='<div class="chk-item rf'+(on?' on':'')+'" data-key="'+key+'"'+(isKoper()?' style="cursor:default"':'')+'><div class="chk-box">'+(on?'&#10003;':'')+'</div><div class="chk-lbl">'+rf+'</div></div>';});
    chkHtml+='</div>';
    // Keuzelog: toon gemaakte keuzes bij conflicten voor deze fase
    var faseChoices=(S._choiceLog||[]).filter(function(c){return c.key.startsWith(f.id+'_');});
    var choiceLogHtml='';
    if(faseChoices.length){
      choiceLogHtml='<div style="margin-top:.75rem;padding:.6rem .75rem;background:#fffbf0;border:1px solid var(--gold);border-radius:var(--r);font-size:11px">'
        +'<div style="font-weight:600;color:var(--gold);margin-bottom:.4rem">&#128221; Gemaakte keuzes bij conflicten</div>'
        +faseChoices.map(function(c){
          return '<div style="padding:3px 0;border-bottom:1px solid var(--border);color:var(--mid)">'
            +'<strong>'+esc(c.label)+'</strong>: gekozen <strong style="color:'+(c.gekozen==='document'?'var(--teal)':'var(--sub)')+'">'+esc(c.waarde)+'</strong>'
            +' <span style="color:var(--muted)">('+esc(c.gekozen==='document'?'uit '+c.bron:'handmatig ingevoerd')+')</span>'
            +(c.verworpen?' &mdash; verworpen: <span style="text-decoration:line-through;color:var(--muted)">'+esc(c.verworpen)+'</span>':'')
            +' <span style="color:var(--muted);font-size:10px">'+esc(c.ts)+'</span>'
            +'</div>';
        }).join('')
        +'</div>';
    }
    var notHtml='<div class="panel"><div class="sec-hdr">Notities (intern)</div>'
      +((isKoper())?'<div style="font-size:13px;color:var(--mid);font-style:italic">'+(S.notities[f.id]||'Geen notities.')+'</div>'
        :'<textarea id="notitie_'+f.id+'" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;color:var(--sub);resize:vertical;min-height:70px;outline:none" placeholder="Interne bevindingen en aandachtspunten..." oninput="schedSave()">'+(S.notities[f.id]||'')+'</textarea>')
      +'<div style="display:flex;align-items:center;gap:.75rem;margin-top:.3rem"><div style="font-size:11px;color:var(--muted)">'+(isKoper()?'':'Wijzigingen worden automatisch opgeslagen.')+'</div><div id="save-ind" class="save-indicator">&#10003; Opgeslagen</div></div>'
      +choiceLogHtml
      +'</div>';
    var aiText=S.aiTexts[f.id];var aiLoad=S.aiLoading[f.id];
    var aiBodyHtml;
    if(aiLoad)aiBodyHtml='<div style="display:flex;align-items:center;gap:8px;color:var(--mid);font-size:13px"><div class="spin" style="border-color:var(--border2);border-top-color:var(--teal);width:14px;height:14px;border-width:2px"></div>Genereren...</div>';
    else if(!aiText)aiBodyHtml='<div style="color:var(--muted);font-size:13px">Klik op Genereer advies voor een analyse op basis van de ingevulde data, checklist en notities.</div>';
    else if(aiText==='__ERROR__')aiBodyHtml='<div style="color:var(--red);font-size:13px">Verbindingsfout. Probeer opnieuw.</div>';
    else{
      var h=aiText;
      // Verwijder pipe-tabellen (| Veld | Status | ... |)
      h=h.replace(/^\|[-| ]+\|$/gm,'');
      h=h.replace(/^\|.+\|$/gm,function(line){
        // Zet pipe-rijen om naar gewone tekst zonder pipes
        return line.replace(/^\||\|$/g,'').split('|').map(function(s){return s.trim();}).filter(Boolean).join(' — ');
      });
      // Verwijder technische statuswoorden
      h=h.replace(/\b(NIET GEVERIFIEERD|ONVOLLEDIG GEDOCUMENTEERD|ONVOLLEDIG|NIET GEVERIFIEERD|HOOG|MIDDELMATIG|LAAG|KRITIEK)\b/g,'');
      // Verwijder dubbele spaties en lege regels
      h=h.replace(/  +/g,' ').replace(/\n{3,}/g,'\n\n');
      // Markdown naar HTML
      h=h.replace(/## ([^\n]+)/g,function(_,t){return '<h3>'+t+'</h3>';});
      h=h.replace(/\*\*([^*]+)\*\*/g,function(_,t){return '<strong>'+t+'</strong>';});
      h=h.split('\n\n').map(function(p){
        p=p.trim();
        if(!p)return '';
        if(p.charAt(0)==='<')return p;
        // Bullets omzetten naar leesbare zinnen
        if(/^[-•]\s/m.test(p)){
          return '<ul>'+p.split('\n').filter(function(l){return l.trim();}).map(function(l){
            return '<li>'+l.replace(/^[-•]\s*/,'')+'</li>';
          }).join('')+'</ul>';
        }
        return '<p>'+p+'</p>';
      }).join('');
      aiBodyHtml=h;
    }
    var aiHtml='<div class="ai-panel"><div class="ai-hdr"><div><div class="ai-title">AI-advies: '+f.title+'</div><div class="ai-sub">Intern analyse-instrument</div></div>'
      +(!isKoper()&&!isVerkoper()?'<button class="btn-gen" id="gen-btn" '+(aiLoad?'disabled':'')+'>'+(aiLoad?'<div class="spin"></div> Genereren...':aiText&&aiText!=='__ERROR__'?'Opnieuw':'Genereer advies')+'</button>':'')
      +'</div><div class="ai-body">'+aiBodyHtml+'</div></div>';
    extraHtml=chkHtml+notHtml+aiHtml;
  }

  // Q&A module (koper stelt vragen, iedereen ziet antwoorden)
  if(isKoper()||isTussen()){
    extraHtml+='<div class="panel" style="border-color:var(--gold)" id="qa-panel-'+f.id+'">'
      +'<div class="sec-hdr" style="color:var(--gold)">&#10067; Q&A — vragen &amp; antwoorden</div>'
      +'<div id="qa-lijst-'+f.id+'" style="margin-bottom:1rem"><div style="font-size:12px;color:var(--muted);font-style:italic">Laden...</div></div>'
      +(isKoper()?'<div style="border-top:1px solid var(--border);padding-top:.75rem;margin-top:.5rem">'
        +'<div style="font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Stel een vraag</div>'
        +'<textarea id="qa-input-'+f.id+'" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;color:var(--sub);resize:vertical;min-height:70px;outline:none" placeholder="Typ uw vraag over deze fase..."></textarea>'
        +'<div style="display:flex;justify-content:flex-end;margin-top:.5rem">'
        +'<button id="qa-btn-'+f.id+'" class="btn btn-sm" style="background:var(--gold);font-size:12px">Vraag stellen</button>'
        +'</div></div>':'')
      +'</div>';
  }
  var nav='<div class="fase-nav">'
    +(isVerkoper()?'<button class="btn-ghost btn-sm" id="cover-btn">&#128196; Cover letter</button>':'')
    +(S.fase>0?'<button class="btn-ghost btn-sm" id="prev-btn">&#8592; Vorige</button>':'')
    +'<div style="flex:1"></div>'
    +(!isKoper()&&!vergrendeld?'<button class="btn-ghost btn-sm" id="opslaan-btn" style="color:var(--teal);border-color:var(--teal)">&#128190; Opslaan</button>':'')
    +(isVerkoper()&&!vergrendeld?(function(){
        var fid=FASES[S.fase].id;
        var isAfgerond=S.faseStatus&&S.faseStatus[fid]&&S.faseStatus[fid].afgerond;
        var fp=fillPct(fid);
        if(isAfgerond){
          return '<button class="btn btn-sm" id="fase-heropen-btn" style="background:var(--muted);font-size:11px">&#10003; Afgerond — Heropenen</button>';
        } else if(fp>=50){
          return '<button class="btn btn-sm" id="fase-afronden-btn" style="background:var(--gold);font-size:11px">&#10003; Fase afronden</button>';
        }
        return '';
      })():'')
    +'<button class="btn-ghost btn-sm" id="sum-btn">Overzicht</button>'
    +(S.fase<FASES.length-1?'<button class="btn btn-sm" id="next-btn">Volgende &#8594;</button>':'<button class="btn btn-sm" id="sum-btn2">Afronden &#10003;</button>')
    +'</div>';

  var lockedBanner=vergrendeld?'<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--red)">&#128274; <strong>Dit traject is vergrendeld.</strong> U kunt geen wijzigingen meer doorvoeren.</div>':'';

  return '<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
    +'<div style="display:flex;align-items:center;gap:8px">'
    +'<span style="font-size:11px;color:var(--muted)">'+esc(S.traject&&S.traject.kantoor_naam||S.code)+'</span>'
    +'<button class="btn-ghost btn-sm" onclick="window.print()">PDF</button>'
    +'</div></div>'
    +lockedBanner
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">'+esc(S.traject&&S.traject.kantoor_naam||'')+'</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1rem">Verplichte velden ingevuld: <span style="font-family:IBM Plex Mono,monospace;font-weight:600;color:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'">'+tp+'%</span><span style="font-size:11px;color:var(--muted);margin-left:6px">(alle 7 fases)</span></div>'
    +'<div class="prog-bar"><div class="prog-fill" style="width:'+tp+'%;background:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'"></div></div>'
    +ov
    +'<div style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.2rem">'+f.num+'. '+f.title+'</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.25rem">'+f.desc+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 280px;gap:1.25rem;align-items:start">'+dataHtml+renderDocumentSectie(f.id)+'</div>'
    +extraHtml+nav+'</div>';
}

function renderSummary(){
  var missing=getMissing();
  var vergrendeld=S.traject&&S.traject.status==='vergrendeld';
  var completeFases=FASES.filter(function(f){return fillPct(f.id)===100;});
  var incompleteFases=FASES.filter(function(f){return fillPct(f.id)<100;});

  // ── KRITIEKE DISCREPANTIE-CHECK (geen API, puur rekenen) ────────────────
  var kritiekeDiscrepanties=[];

  function parseGeldCheck(v){
    if(!v)return null;
    var n=String(v).replace(/[^0-9,.]/g,'').replace(',','.');
    var parsed=parseFloat(n);
    return isNaN(parsed)?null:parsed;
  }

  var o1=parseGeldCheck(S.data['financieel_omzet1']);
  var o2=parseGeldCheck(S.data['financieel_omzet2']);
  var o3=parseGeldCheck(S.data['financieel_omzet3']);
  var ebitdaAbs=parseGeldCheck(S.data['financieel_ebitda']);
  var ebitdaMarge=parseGeldCheck(S.data['financieel_ebitdaMarge']);
  var partnerBel=parseGeldCheck(S.data['financieel_partnerBel']);

  // 1. Ontbrekende kritieke financiële velden
  if(!o1||!o2||!o3) kritiekeDiscrepanties.push('Jaaromzet voor alle drie jaren is verplicht voor een indicatieve waardering. Vul omzet jaar 1, 2 en 3 in.');
  if(!ebitdaAbs&&!ebitdaMarge) kritiekeDiscrepanties.push('EBITDA ontbreekt volledig (zowel absoluut als marge). Dit is de basis voor de waarderingsberekening.');
  if(!partnerBel) kritiekeDiscrepanties.push('Partnerbeloning ontbreekt. Zonder dit gegeven kan de EBITDA niet genormaliseerd worden.');

  // 2. EBITDA-marge buiten realistisch bereik
  if(ebitdaMarge!==null){
    if(ebitdaMarge<0) kritiekeDiscrepanties.push('EBITDA-marge is negatief ('+ebitdaMarge+'%). Een verlieslatend kantoor kan niet gewaardeerd worden zonder toelichting. Controleer de invoer.');
    if(ebitdaMarge>50) kritiekeDiscrepanties.push('EBITDA-marge is '+ebitdaMarge+'% — onrealistisch hoog voor de sector (norm 15-25%). Controleer of het percentage correct is ingevoerd (niet als decimaal 0.168 in plaats van 16.8%).');
  }

  // 3. Consistentiecheck EBITDA-absoluut vs marge × omzet
  if(o3&&ebitdaAbs&&ebitdaMarge){
    var berekendEbitda=o3*(ebitdaMarge/100);
    var afwijking=Math.abs(berekendEbitda-ebitdaAbs)/ebitdaAbs;
    if(afwijking>0.15){
      kritiekeDiscrepanties.push(
        'EBITDA-inconsistentie: EBITDA absoluut ('+ebitdaAbs.toLocaleString('nl-NL')+') wijkt meer dan 15% af van '
        +'marge × omzet ('+ebitdaMarge+'% × '+o3.toLocaleString('nl-NL')+' = '+Math.round(berekendEbitda).toLocaleString('nl-NL')+'). '
        +'Controleer of absoluut bedrag en percentage bij hetzelfde boekjaar horen.'
      );
    }
  }

  // 4. Onverklaarbare omzetsprong (>50% jaar op jaar)
  if(o1&&o2){
    var groei12=((o2-o1)/o1)*100;
    if(Math.abs(groei12)>50) kritiekeDiscrepanties.push(
      'Omzetgroei jaar 1→2 is '+Math.round(groei12)+'% — ongebruikelijk groot. '
      +'Controleer of de juiste jaren zijn ingevoerd of voeg een toelichting toe.'
    );
  }
  if(o2&&o3){
    var groei23=((o3-o2)/o2)*100;
    if(Math.abs(groei23)>50) kritiekeDiscrepanties.push(
      'Omzetgroei jaar 2→3 is '+Math.round(groei23)+'% — ongebruikelijk groot. '
      +'Controleer of de juiste jaren zijn ingevoerd of voeg een toelichting toe.'
    );
  }

  // 5. Dalende omzettrend (jaar 3 < jaar 1) zonder toelichting
  if(o1&&o3&&o3<o1){
    kritiekeDiscrepanties.push(
      'Omzet jaar 3 ('+o3.toLocaleString('nl-NL')+') is lager dan omzet jaar 1 ('+o1.toLocaleString('nl-NL')+'). '
      +'Een dalende trend vereist een toelichting in de notitie van fase Strategisch voordat het dossier kan worden vrijgegeven.'
    );
  }

  // 6. Partnerbeloning hoger dan EBITDA (normalisatie-probleem)
  if(partnerBel&&ebitdaAbs&&partnerBel>ebitdaAbs){
    kritiekeDiscrepanties.push(
      'Partnerbeloning ('+partnerBel.toLocaleString('nl-NL')+') is hoger dan EBITDA absoluut ('+ebitdaAbs.toLocaleString('nl-NL')+'). '
      +'Dit leidt tot een negatieve genormaliseerde EBITDA en maakt waardering onmogelijk. Controleer de invoer.'
    );
  }

  var heeftKritiek=kritiekeDiscrepanties.length>0;
  // ── EINDE CHECK ─────────────────────────────────────────────────────────

  // Summary cards
  var cards='';
  FASES.forEach(function(f){
    var p=isVerkoper()?fillPct(f.id):pct(f.id);
    var dataRows='';
    f.dataFields.forEach(function(df){var v=S.data[f.id+'_'+df.id];var r=S.docRefs[f.id+'_'+df.id];if(v)dataRows+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">'+df.label+(df.req?' *':'')+'</span><span style="font-family:IBM Plex Mono,monospace;font-size:11px">'+esc(v)+(r?' <span style="color:var(--gold)">&#128196;'+esc(r)+'</span>':'')+'</span></div>';else if(df.req)dataRows+='<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);color:var(--red)">&#9888; '+df.label+': niet ingevuld</div>';});
    var rfHits=f.redflags.filter(function(_,i){return S.checked[f.id+'_rf_'+i];});
    cards+='<div class="panel" style="border-color:'+(p===100?'var(--teal)':'var(--border)')+'"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;display:flex;justify-content:space-between"><span>'+(isVerkoper()?'':f.num+'. ')+f.title+'</span><span style="color:'+(p===100?'var(--teal)':p>50?'var(--gold)':'var(--red)')+'">'+p+'%</span></div>'
      +dataRows+(rfHits.length&&!isVerkoper()?'<div style="margin-top:.4rem">'+rfHits.map(function(rf){return '<div style="font-size:11px;color:var(--red)">&#9888; '+rf+'</div>';}).join('')+'</div>':'')
      +(S.notities[f.id]&&!isVerkoper()?'<div style="font-size:11px;color:var(--mid);margin-top:.35rem;font-style:italic">'+esc(S.notities[f.id].substring(0,120))+'</div>':'')
      +'</div>';
  });

  // Missing fields block
  var missingHtml='';
  if(missing.length&&isVerkoper()){
    missingHtml='<div class="panel" id="dd-missing-velden" style="border-color:var(--red)">'
      +'<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:.75rem">&#9888; Nog '+missing.reduce(function(a,m){return a+m.fields.length;},0)+' verplichte velden niet ingevuld</div>';
    missing.forEach(function(m){
      missingHtml+='<div style="margin-bottom:.6rem"><div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:.2rem">'+esc(m.fase)+'</div>';
      m.fields.forEach(function(field){missingHtml+='<div style="font-size:12px;color:var(--red);padding:2px 0 2px .75rem">&#8212; '+esc(field)+'</div>';});
      missingHtml+='</div>';
    });
    missingHtml+='</div>';
  }

  var tp=isVerkoper()?totalFillPct():Math.round(FASES.reduce(function(a,f){return a+pct(f.id);},0)/FASES.length);
  return '<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="window.print()">PDF</button><button class="btn-ghost btn-sm" id="back-main">&#8592; Terug</button></div></div>'
    +(vergrendeld?'<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--red)">&#128274; Vergrendeld op '+(S.traject.vergrendeld_op?new Date(S.traject.vergrendeld_op).toLocaleString('nl-NL'):'')+'</div>':'')
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">DD Samenvatting</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem">'+esc(S.traject&&S.traject.kantoor_naam||S.code)+' &middot; '+new Date().toLocaleDateString('nl-NL',{day:'2-digit',month:'long',year:'numeric'})+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1.5rem">'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'">'+tp+'%</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">'+(isVerkoper()?'Ingevuld':'Checklist')+'</div></div>'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:var(--teal)">'+completeFases.length+'</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">Fasen compleet</div></div>'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:var(--red)">'+missing.reduce(function(a,m){return a+m.fields.length;},0)+'</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">Velden ontbreken</div></div>'
    +'</div>'
    +missingHtml
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+cards+'</div>'
    +(heeftKritiek&&isVerkoper()?
      '<div style="background:var(--red-bg);border:2px solid var(--red);border-radius:var(--r2);padding:1.25rem;margin-top:1.5rem">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:.75rem">'
      +'<span style="font-size:1.5rem">&#9940;</span>'
      +'<div style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--red)">Dossier kan niet worden vrijgegeven</div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--red);margin-bottom:.75rem;line-height:1.6">'
      +'Er zijn <strong>'+kritiekeDiscrepanties.length+' kritieke discrepantie(s)</strong> gevonden die een betrouwbare indicatieve waardering onmogelijk maken. '
      +'Los deze op voordat u het dossier kunt vrijgeven. Er is geen uitzondering mogelijk.'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:8px">'
      +kritiekeDiscrepanties.map(function(d,i){
        return '<div style="background:#fff;border:1px solid var(--red);border-radius:var(--r);padding:.75rem 1rem;display:flex;gap:10px">'
          +'<span style="color:var(--red);font-weight:700;flex-shrink:0">'+(i+1)+'.</span>'
          +'<span style="font-size:12px;color:var(--sub);line-height:1.6">'+esc(d)+'</span>'
          +'</div>';
      }).join('')
      +'</div>'
      +'<button class="btn" id="naar-financieel-btn" style="margin-top:.875rem;font-size:12px;padding:8px 16px;background:var(--red)">&#128270; Naar fase Financieel &#8594;</button>'
      +'</div>'
    :'')
    +'<div style="margin-top:1.5rem;background:var(--panel);border:2px solid '+(S.dossierVrijgegeven?'var(--teal)':heeftKritiek?'var(--border)':'var(--gold)')+';border-radius:var(--r2);padding:1.5rem">'
    +(S.dossierVrijgegeven
      ?'<div style="display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:2rem">&#10003;</div>'
        +'<div><div style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--teal)">Dossier vrijgegeven</div>'
        +'<div style="font-size:12px;color:var(--muted);margin-top:.25rem">U heeft het dossier formeel aangeboden aan de begeleider. De begeleider is per e-mail geïnformeerd.</div></div></div>'
      :(isVerkoper()
        ?'<div style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--head);margin-bottom:.25rem">&#128274; Dossier vrijgeven</div>'
          +'<div style="font-size:12px;color:var(--muted);margin-bottom:1rem">Controleer alle fases. Wanneer u klaar bent, geeft u het dossier formeel vrij. De begeleider ontvangt dan automatisch een melding en kan aan de slag.</div>'
          +(function(){
            var aantalAfgerond=FASES.filter(function(f){return S.faseStatus&&S.faseStatus[f.id]&&S.faseStatus[f.id].afgerond;}).length;
            var pct=totalFillPct();
            var html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:.75rem">';
            FASES.forEach(function(f){
              var afg=S.faseStatus&&S.faseStatus[f.id]&&S.faseStatus[f.id].afgerond;
              html+='<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+(afg?'var(--teal-bg)':'var(--card)')+';border:1px solid '+(afg?'var(--teal)':'var(--border2)')+';color:'+(afg?'var(--teal)':'var(--muted)')+'">'+(afg?'&#10003; ':'')+f.num+'. '+f.title+'</span>';
            });
            html+='</div>';
            html+='<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">'+aantalAfgerond+' van '+FASES.length+' fases afgerond &middot; '+pct+'% ingevuld</div>';
            if(heeftKritiek){
              html+='<div style="font-size:13px;color:var(--red);font-weight:600;padding:.75rem 1rem;background:var(--red-bg);border-radius:var(--r);text-align:center">&#9940; Vrijgave geblokkeerd — los de discrepanties hierboven op</div>';
            } else if(pct<50){
              html+='<div style="font-size:12px;color:var(--red);padding:.5rem .75rem;background:var(--red-bg);border-radius:var(--r);margin-bottom:.75rem">'
                +'&#9888; Vul minimaal 50% van de velden in voordat u het dossier kunt vrijgeven. '
                +'Niet alle velden zijn automatisch uit documenten af te leiden — vul de ontbrekende velden hieronder handmatig aan.'
                +'<div style="margin-top:.5rem"><a href="#dd-missing-velden" style="color:var(--red);font-weight:600;text-decoration:underline">&#8593; Bekijk welke velden nog ontbreken</a></div>'
                +'</div>';
            } else {
              html+='<button class="btn" id="dossier-vrijgeven-btn" style="width:100%">&#128228; Dossier vrijgeven aan begeleider</button>';
            }
            return html;
          })()
        :''))
    +'</div>'
    +'</div>';
}

async function finaleCheck(){
  var btn=ge('finale-check-btn');
  var out=ge('finale-check-out');
  if(!btn||!out)return;
  btn.disabled=true;btn.textContent='Bezig...';
  out.innerHTML='<div style="color:var(--muted);font-size:13px;padding:1rem;background:var(--card);border-radius:var(--r)">Analyse loopt... (20-40 sec)</div>';

  // Alleen fase-1 velden — relevant voor indicatieve waardering, niet de volledige fase-2 DD
  var veldenSamenvatting='';
  FASES.forEach(function(f){
    var gevuld=f.dataFields.filter(function(df){
      return !df.header && df.fase==='1' && (S.data[f.id+'_'+df.id]||'').trim();
    });
    if(gevuld.length){
      veldenSamenvatting+='\n'+f.num+'. '+f.title+'\n';
      gevuld.forEach(function(df){veldenSamenvatting+='  '+df.label+': '+S.data[f.id+'_'+df.id]+'\n';});
    }
  });

  var docNamen=[];
  Object.keys(DOCS).forEach(function(faseId){
    (DOCS[faseId]||[]).filter(function(d){return !d.uploading&&!d.verworpen;}).forEach(function(d){
      docNamen.push(d.naam);
    });
  });

  if(!docNamen.length){
    out.innerHTML='<div style="color:var(--gold);font-size:13px;padding:.75rem;background:var(--gold-bg);border-radius:var(--r);border:1px solid var(--gold)">⚠ Geen documenten geüpload.</div>';
    btn.disabled=false;btn.innerHTML='&#9881; Voer finale check uit';
    return;
  }

  var prompt='Je bent een M&A-adviseur die beoordeelt of de basisinformatie klopt voor een indicatieve waardering.\n\n'
    +'Kantoor: '+esc(S.traject&&S.traject.kantoor_naam||S.code)+'\n'
    +'Geüploade documenten: '+docNamen.join(', ')+'\n\n'
    +'INGEVULDE BASISVELDEN (fase 1 — pre-LoI):\n'+veldenSamenvatting+'\n\n'
    +'Beoordeel uitsluitend of de ingevulde basisvelden intern consistent zijn en voldoende zijn voor een indicatieve waardering. '
    +'NIET beoordelen: ontbrekende fase-2 DD-documenten, arbeidscontracten, debiteurenadministratie, huurcontracten — die zijn pas relevant na de LoI.\n\n'
    +'Schrijf maximaal 3 korte alineas in gewoon Nederlands:\n'
    +'1. Wat klopt en consistent is (noem de cijfers)\n'
    +'2. Wat afwijkt of intern inconsistent is (maximaal 2 punten)\n'
    +'3. Eén zin eindoordeel: zijn de basisvelden voldoende voor een indicatieve waardering?\n\n'
    +'Geen tabellen, geen lijsten, geen pipe-tekens. Maximaal 200 woorden.';

  try{
    var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:1000})});
    var rd=await resp.json();
    var tekst=(rd.text||'Fout bij genereren.')
      .replace(/## ([^\n]+)/g,'<h3 style="font-family:Playfair Display,serif;font-size:.95rem;color:var(--head);margin:1rem 0 .35rem">$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      // Verwijder eventuele pipe-tabellen
      .replace(/^\|[-| ]+\|$/gm,'')
      .replace(/^\|.+\|$/gm,function(line){
        return line.replace(/^\||\|$/g,'').split('|').map(function(s){return s.trim();}).filter(Boolean).join(' — ');
      })
      .split('\n\n').map(function(p){
        p=p.trim();
        if(!p)return '';
        if(p.charAt(0)==='<')return p;
        return '<p style="font-size:13px;color:var(--mid);line-height:1.7;margin-bottom:.75rem">'+p.replace(/\n/g,'<br>')+'</p>';
      }).join('');
    out.innerHTML='<div style="padding:.5rem 0">'+tekst+'</div>';
  }catch(e){
    out.innerHTML='<div style="color:var(--red);font-size:13px">Fout: '+e.message+'</div>';
  }
  btn.disabled=false;btn.innerHTML='&#9881; Opnieuw';
}

async function generateAI(faseId){
  var f=FASES.find(function(x){return x.id===faseId;});if(!f)return;
  saveCurrent();S.aiLoading[faseId]=true;renderApp();
  var dataLines=[];f.dataFields.forEach(function(df){var v=S.data[f.id+'_'+df.id];var r=S.docRefs[f.id+'_'+df.id];if(v)dataLines.push(df.label+': '+v+(r?' (doc: '+r+')':''));});
  var chk=f.items.filter(function(_,i){return S.checked[faseId+'_'+i];});
  var open=f.items.filter(function(_,i){return !S.checked[faseId+'_'+i];});
  var rfs=f.redflags.filter(function(_,i){return S.checked[faseId+'_rf_'+i];});
  var sectorProfiel=getSectorProfiel();
  var sectorLabel=sectorProfiel.label||'MKB';
  var sectorNormen=sectorProfiel.aiNormen||'';
  var prompt='Je bent ' + esc(S.traject&&S.traject.begeleider_naam||BRAND.contactpersoon) + ', senior M&A-adviseur. Sector: '+sectorLabel+'. Traject: '+esc(S.traject&&S.traject.traject_type||'M&A')+' voor "'+esc(S.traject&&S.traject.kantoor_naam||S.code)+'".\n\nSECTOR NORMEN:\n'+sectorNormen+'\n\nFASE: '+f.title+'\n\nINGEVOERDE DATA:\n'+(dataLines.join('\n')||'Geen data')+'\n\nCHECKLIST:\nGereed: '+(chk.join(', ')||'niets')+'\nOpen: '+(open.join(', ')||'alles gereed')+'\n\nRODE VLAGGEN: '+(rfs.join(', ')||'geen')+'\n\nNOTITIES: '+(S.notities[faseId]||'geen')+'\n\nGeef beknopt strategisch advies voor deze sector. Analyseer de cijfers expliciet en vergelijk met de sectorgemiddelden hierboven. Bespreek: voortgang en prioriteiten, urgente openstaande punten, impact rode vlaggen, concrete vervolgstappen. Schrijf in ik-vorm. Gebruik ## koppen. Geen tabellen of bullets.';
  try{
    var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    var reader=resp.body.getReader();var dec=new TextDecoder();var collected='';
    while(true){var res=await reader.read();if(res.done)break;dec.decode(res.value,{stream:true}).split('\n').forEach(function(line){if(line.startsWith('data:')){var d=line.slice(5).trim();if(d==='[DONE]')return;try{var j=JSON.parse(d);if(j.type==='content_block_delta'&&j.delta&&j.delta.text)collected+=j.delta.text;}catch(e){}}});}
    S.aiTexts[faseId]=collected;
  }catch(e){S.aiTexts[faseId]='__ERROR__';}
  S.aiLoading[faseId]=false;renderApp();
}

function bindAll(){
  var lb=ge('l-btn');
  if(lb){
    lb.onclick=async function(){
      if (!secCanLogin()) return;
      var code=((ge('l-code')||{}).value||'').trim().toUpperCase();
      if(!code)return;
      var err=ge('l-err');var load=ge('l-load');
      if(err)err.style.display='none';if(load)load.style.display='block';lb.disabled=true;
      try{
        var resp=await fetch(WORKER+'/mna/traject/'+code, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ts: Date.now() })
        });
        var d=await resp.json();
        if(!resp.ok){
          if(d&&d.error&&d.error.includes('verzoeken'))throw new Error('Te veel verzoeken. Wacht even en probeer opnieuw.');
          throw new Error('not found');
        }
        // Volledige reset - geen datalek tussen trajecten
        Object.keys(DOCS).forEach(function(k){delete DOCS[k];});
        S={screen:'cover',code:code,rol:d.rol||'verkoper',traject:d.traject,modules:d.modules||null,_ivSelectie:null,
          fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},
          saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,
          _opy:{},_epy:{},_conflicts:[],_userEdited:{},_docSource:{},koperReacties:{},loiTekst:'',loiDatum:0,
          dataPerEntiteit:{},_actieveEntiteit:null,_entiteiten:[]};
        // Groepsstructuur (Fase 2): S is hierboven volledig herbouwd — de groepsdata-alias opnieuw
        // vastzetten vóórdat loadDataFromDB hieronder de opgehaalde rijen erin gaat wegschrijven.
        S._groepData=S.data;
        // Sessie starten + audit log
        SEC.attempts = 0;
        secStartSession();
        secAuditLog('login', { kantoor: d.traject && d.traject.kantoor_naam });
        // Laad infoverzoek selectie voor veldfiltering
        if(d.rol==='verkoper'){
          fetch(WORKER+'/mna/infoverzoek/'+code+'/1').then(function(r){return r.json();}).then(function(sel){
            S._ivSelectie = sel;
          }).catch(function(){});
        }
        // FASES dynamisch laden op basis van sector
        if(d.traject&&d.traject.sector&&SECTOR_PROFIELEN[d.traject.sector]){
          FASES=SECTOR_PROFIELEN[d.traject.sector].fases;
        } else {
          FASES=SECTOR_PROFIELEN.accountancy.fases; // fallback
        }
        // Eigen huisstijl van de adviseur (indien ingesteld) toepassen op dit traject.
        if(d.branding){
          if(d.branding.naam){ BRAND.platform=d.branding.naam; }
          if(d.branding.kleur){
            document.documentElement.style.setProperty('--teal',d.branding.kleur);
            document.documentElement.style.setProperty('--teal-bg',d.branding.kleur+'1a');
          }
          if(d.branding.logo_url){ BRAND._logoUrl=d.branding.logo_url; }
          document.title='M&A Begeleiding - '+BRAND.platform;
        }
        if(d.data&&d.data.length){
          loadDataFromDB(d.data);S._mnaData=d.data;S._dirty=false;
        }
        // Laad fase-status (welke fases afgerond door verkoper)
        fetch(WORKER+'/mna/verkoper/fase-status?code='+encodeURIComponent(code))
          .then(function(r){return r.json();})
          .then(function(fs){
            if(fs.status)S.faseStatus=fs.status;
          }).catch(function(){});
        // Groepsstructuur: geregistreerde entiteiten laden (voor upload-toewijzing en dataroom-labels)
        loadEntiteiten();
        // Sla tussen_code op als begeleider-auth
        if(isTussen()){
          S._bgKey=code;S.screen='begeleider';
          checkVOK(code).then(function(vokStatus){
            // Ook opnieuw tonen als er een nieuwere versie is dan wat eerder getekend is —
            // anders wordt een tekstwijziging (bv. bewaartermijn) nooit meer voorgelegd.
            if(!vokStatus.getekend||vokStatus.versie!==VOK_VERSIE){ toonVOKPopup(code, function(){ renderApp(); }); }
            else { renderApp(); }
          }).catch(function(){ renderApp(); });
          return; // renderApp wordt via checkVOK afgehandeld
        }
        syncDocVeldenVanTraject(d);
        renderApp();
      }catch(e){if(err)err.style.display='block';if(load)load.style.display='none';lb.disabled=false;}
    };
    var cf=ge('l-code');
    if(cf){cf.oninput=function(){this.value=this.value.toUpperCase();};cf.onkeydown=function(e){if(e.key==='Enter')lb.click();};}
  }
  var toMain=ge('to-main-btn');if(toMain)toMain.onclick=function(){S.screen='main';var fId=FASES[S.fase]&&FASES[S.fase].id;if(fId&&!DOCS[fId])loadDocsForFase(fId);renderApp();};
  var toMain2=ge('to-main-btn2');if(toMain2)toMain2.onclick=function(){S.screen='main';renderApp();};
  var toWrd=ge('to-waardering-btn');if(toWrd)toWrd.onclick=function(){S.screen='waardering';renderApp();};
  var toWrd2=ge('to-waardering-btn2');if(toWrd2)toWrd2.onclick=function(){S.screen='waardering';renderApp();};
  var toLb=ge('logboek-btn');if(toLb)toLb.onclick=function(){S.screen='logboek';renderApp();};
  // Laad en toon huidige fase op cover
  (async function(){
    var faseNamen={voorgesprek:'Voorgesprek',kennismaking:'Kennismaking',pre_dd:'Pre-DD (LoI)',due_diligence:'Due Diligence',verkoop:'Verkoop / Closing'};
    try{var lr=await fetch(WORKER+'/mna/logboek/'+S.code);var ld=await lr.json();
      var badge=ge('cover-fase-badge');
      if(badge)badge.textContent=faseNamen[ld.traject_fase]||ld.traject_fase||'Voorgesprek';
    }catch(e){}
  })();

  // LoI knoppen op cover
  var loiLees=ge('loi-lees-btn');
  if(loiLees)loiLees.onclick=function(){
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var box=document.createElement('div');box.style.cssText='background:#fff;border-radius:10px;padding:2rem;max-width:700px;width:100%;max-height:90vh;overflow-y:auto';
    box.innerHTML='<div style="font-family:Playfair Display,serif;font-size:1.2rem;font-weight:600;color:#1a1815;margin-bottom:1rem">Letter of Intent</div>'
      +'<div style="font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#2a2825;white-space:pre-wrap">'+esc(S.loiTekst)+'</div>'
      +'<div style="display:flex;justify-content:flex-end;margin-top:1.25rem"><button style="background:transparent;border:1px solid #c8c5bc;border-radius:6px;padding:8px 18px;cursor:pointer;font-size:13px" id="loi-sluit">Sluiten</button></div>';
    ov.appendChild(box);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('loi-sluit').addEventListener('click',function(){document.body.removeChild(ov);});
  };

  // NDA tekenen
  var ndaTeken=ge('nda-teken-btn');
  if(ndaTeken)ndaTeken.onclick=async function(){
    var naam=prompt('Voer uw volledige naam in ter bevestiging van akkoord:');
    if(!naam||!naam.trim())return;
    if(!confirm('U gaat akkoord met de Non-Disclosure Agreement namens '+naam.trim()+'. Bevestigen?'))return;
    try{
      var r=await fetch(WORKER+'/mna/teken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,document:'nda',naam:naam.trim()})});
      var d=await r.json();
      if(d.ok){S.ndaGetekend=naam.trim();renderApp();toast('NDA getekend. De adviseur is op de hoogte gesteld.','ok');}
      else toast('Fout: '+(d.error||'onbekend'),'err');
    }catch(e){toast('Verbindingsfout.','err');}
  };

  // LoI tekenen
  var loiTeken=ge('loi-teken-btn');
  if(loiTeken)loiTeken.onclick=async function(){
    var naam=prompt('Voer uw volledige naam in ter bevestiging van akkoord:');
    if(!naam||!naam.trim())return;
    if(!confirm('U gaat akkoord met de Letter of Intent namens '+naam.trim()+'. Bevestigen?'))return;
    try{
      var r=await fetch(WORKER+'/mna/teken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,document:'loi',naam:naam.trim()})});
      var d=await r.json();
      if(d.ok){S.loiGetekend=naam.trim();renderApp();toast('LoI getekend. De adviseur is op de hoogte gesteld.','ok');}
      else toast('Fout: '+(d.error||'onbekend'),'err');
    }catch(e){toast('Verbindingsfout.','err');}
  };

  var ndaLees=ge('nda-lees-btn');
  if(ndaLees)ndaLees.onclick=function(){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var box=document.createElement('div');
    box.style.cssText='background:#fff;border-radius:10px;padding:2rem;max-width:700px;width:100%;max-height:90vh;overflow-y:auto';
    var ndaHtml=(S.ndaTekst||'').replace(/^# (.+)$/gm,'<h2 style="font-family:Georgia,serif;font-size:1.1rem;margin:1rem 0 .4rem;font-weight:700">$1</h2>').replace(/^## (.+)$/gm,'<h3 style="font-family:Georgia,serif;font-size:.95rem;margin:.9rem 0 .3rem;font-weight:700">$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^---$/gm,'<hr style="border:none;border-top:1px solid #ddd;margin:.75rem 0">').replace(/\n\n/g,'</p><p style="font-size:13px;line-height:1.9;color:#2a2825;margin:.4rem 0">').replace(/\n/g,'<br>');
    var hdr=document.createElement('div');hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem';
    hdr.innerHTML='<div style="font-size:11px;font-weight:600;color:#7c5cbf;letter-spacing:.1em;text-transform:uppercase">Non-Disclosure Agreement</div>';
    var sluit=document.createElement('button');sluit.textContent='Sluiten';sluit.style.cssText='background:transparent;border:1px solid #ddd;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px';
    sluit.onclick=function(){document.body.removeChild(ov);};
    hdr.appendChild(sluit);
    var tekDiv=document.createElement('div');tekDiv.style.cssText='font-family:Georgia,serif;font-size:13px;line-height:1.9;color:#2a2825';
    tekDiv.innerHTML='<p style="font-size:13px;line-height:1.9;color:#2a2825;margin:.4rem 0">'+ndaHtml+'</p>';
    var btns=document.createElement('div');btns.style.cssText='margin-top:1rem;display:flex;gap:8px';
    var printBtn=document.createElement('button');printBtn.textContent='📄 Print / PDF';printBtn.style.cssText='font-size:12px;padding:6px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:transparent';
    printBtn.onclick=function(){ printDoc(S.ndaTekst||'', 'Non-Disclosure Agreement', 'nda'); };
    btns.appendChild(printBtn);
    box.appendChild(hdr);box.appendChild(tekDiv);box.appendChild(btns);
    ov.appendChild(box);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  };


  var loiPrint=ge('loi-print2-btn');
  if(loiPrint)loiPrint.onclick=function(){ printDoc(S.loiTekst||'','Letter of Intent','loi'); };
  // AI knop in waardering (tussenpersoon)
  var wAiBtn=ge('w-ai-btn');
  if(wAiBtn)wAiBtn.addEventListener('click',async function(){
    var out=ge('w-ai-out');if(!out)return;
    wAiBtn.disabled=true;wAiBtn.textContent='Genereren...';
    out.style.display='block';
    out.innerHTML='<div style="color:var(--muted);font-size:13px">AI genereert rapport...</div>';
    function parseGeld(s){if(!s)return 0;var n=String(s).replace(/[^0-9,.]/g,'').replace(',','.');return parseFloat(n)||0;}
    function fmtGeld(n){if(!n||isNaN(n))return '—';if(n>=1000000)return '€'+(n/1000000).toFixed(2)+' mln';if(n>=1000)return '€'+(n/1000).toFixed(0)+'.000';return '€'+Math.round(n);}
    var o3=parseGeld(S.data['financieel_omzet3']);
    var eP=parseFloat(S.data['financieel_ebitda'])||0;
    var eA=o3*(eP/100);
    var prompt='Schrijf een professioneel M&A waarderingsrapport voor '+esc(S.traject&&S.traject.kantoor_naam||S.code)+'.\n\nOmzet jaar 3: '+fmtGeld(o3)+'\nEBITDA: '+fmtGeld(eA)+' ('+eP+'%)\nWaardering midden: '+fmtGeld(eA*5.05)+' (5.05x)\nBandreedte: '+fmtGeld(eA*4.6)+' - '+fmtGeld(eA*5.5)+'\n\n## Executive summary\n## Waarderingsmethodiek\n## As-is waardering\n## Groei- en waardepotentieel\n## Transactiestructuur\n## Conclusie';
    try{
      var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:2000})});
      var rd=await resp.json();
      var tekst=rd.text||(rd.error?('AI fout: '+rd.error):'Fout bij genereren.');
      tekst=tekst.replace(/^## (.+)$/gm,'<h3 style="font-family:Playfair Display,serif;font-size:.95rem;color:var(--head);margin:1rem 0 .4rem">$1</h3>');
      tekst=tekst.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
      tekst=tekst.replace(/\n\n/g,'</p><p style="font-size:13px;color:var(--mid);line-height:1.7;margin-bottom:.6rem">');
      out.innerHTML='<p style="font-size:13px;color:var(--mid);line-height:1.7">'+tekst+'</p>';
      // Bewaar lokaal zodat het rapport na herladen terugkomt en de knop de juiste staat toont
      try{ localStorage.setItem('ki_waardering_rapport_'+S.code, JSON.stringify({tekst:tekst, ts:Date.now()})); }catch(e){}
      wAiBtn.textContent='↻ Opnieuw genereren';wAiBtn.disabled=false;
    }catch(e){out.innerHTML='<div style="color:var(--red);font-size:13px">Fout: '+e.message+'</div>';wAiBtn.disabled=false;wAiBtn.textContent='Genereer AI rapport';}
  });
  // Eerder gegenereerd waarderingsrapport terughalen: toon 'm en zet de knop op "Opnieuw"
  if(wAiBtn){
    try{
      var wOpgeslagen=JSON.parse(localStorage.getItem('ki_waardering_rapport_'+S.code)||'null');
      if(wOpgeslagen&&wOpgeslagen.tekst){
        var wOut=ge('w-ai-out');
        if(wOut){
          wOut.style.display='block';
          wOut.innerHTML='<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem">Waarderingsrapport &middot; gegenereerd '+new Date(wOpgeslagen.ts||Date.now()).toLocaleString('nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</div>'
            +'<p style="font-size:13px;color:var(--mid);line-height:1.7">'+wOpgeslagen.tekst+'</p>';
        }
        wAiBtn.textContent='↻ Opnieuw genereren';
      }
    }catch(e){}
  }
  var opslaanBtn=ge('opslaan-btn');if(opslaanBtn)opslaanBtn.onclick=function(){
    saveCurrent(function(){
      var btn=ge('opslaan-btn');
      if(btn){btn.textContent='✓ Opgeslagen';btn.style.background='var(--teal)';btn.style.color='#fff';
        setTimeout(function(){if(ge('opslaan-btn')){btn.textContent='💾 Opslaan';btn.style.background='';btn.style.color='var(--teal)';}},2000);}
    });
    saveAll();
  };
  var coverBtn=ge('cover-btn');if(coverBtn)coverBtn.onclick=function(){saveCurrent();S.screen='cover';renderApp();};
  var backMain=ge('back-main');if(backMain)backMain.onclick=function(){S.screen='main';renderApp();};
  // Alle huidige kritieke-discrepantiechecks gaan uitsluitend over Financieel-velden — als daar
  // ooit checks voor andere fases bijkomen, moet deze knop per discrepantie de juiste fase kiezen.
  var naarFinancieelBtn=ge('naar-financieel-btn');if(naarFinancieelBtn)naarFinancieelBtn.onclick=function(){S.screen='main';var fi=FASES.findIndex(function(f){return f.id==='financieel';});S.fase=fi>=0?fi:0;renderApp();};
  var finaleCheckBtn=ge('finale-check-btn');if(finaleCheckBtn)finaleCheckBtn.onclick=finaleCheck;

  // ── FASE AFRONDEN / HEROPENEN ────────────────────────────────
  var faseAfrondBtn=ge('fase-afronden-btn');
  if(faseAfrondBtn)faseAfrondBtn.onclick=async function(){
    var fid=FASES[S.fase].id;
    var fnaam=FASES[S.fase].num+'. '+FASES[S.fase].title;
    if(!confirm('Fase "'+fnaam+'" afronden? U kunt dit later ongedaan maken.'))return;
    saveCurrent();
    faseAfrondBtn.disabled=true;faseAfrondBtn.textContent='Opslaan...';
    try{
      await fetch(WORKER+'/mna/verkoper/fase-afronden',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,fase_id:fid})});
      if(!S.faseStatus)S.faseStatus={};
      S.faseStatus[fid]={afgerond:true,afgerond_at:Date.now()};
      toast('Fase "'+fnaam+'" afgerond ✓','ok');
      renderApp();
    }catch(e){toast('Fout bij afronden','err');faseAfrondBtn.disabled=false;}
  };

  var faseHeropenBtn=ge('fase-heropen-btn');
  if(faseHeropenBtn)faseHeropenBtn.onclick=async function(){
    var fid=FASES[S.fase].id;
    var fnaam=FASES[S.fase].num+'. '+FASES[S.fase].title;
    try{
      await fetch(WORKER+'/mna/verkoper/fase-afronden',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,fase_id:fid,afgerond:0})});
      if(S.faseStatus)S.faseStatus[fid]={afgerond:false};
      S.dossierVrijgegeven=false;
      toast('Fase "'+fnaam+'" heropend','ok');
      renderApp();
    }catch(e){toast('Fout bij heropenen','err');}
  };

  // ── DOSSIER VRIJGEVEN ─────────────────────────────────────────
  var dossierVrijgevenBtn=ge('dossier-vrijgeven-btn');
  if(dossierVrijgevenBtn)dossierVrijgevenBtn.onclick=async function(){
    var naam=S.traject&&S.traject.contact_naam||'';
    if(!confirm('Weet u zeker dat u het dossier formeel wilt vrijgeven aan de begeleider? De begeleider ontvangt hiervan een melding.\n\nU kunt daarna nog steeds wijzigingen aanbrengen als de begeleider dat toestaat.'))return;
    dossierVrijgevenBtn.disabled=true;dossierVrijgevenBtn.textContent='Vrijgeven...';
    try{
      var r=await fetch(WORKER+'/mna/verkoper/dossier-vrijgeven',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,naam:naam})});
      var d=await r.json();
      if(d.ok){
        S.dossierVrijgegeven=true;
        toast('Dossier vrijgegeven. De begeleider is geïnformeerd.','ok',5000);
        renderApp();
      } else {
        toast('Fout: '+(d.error||'onbekend'),'err');
        dossierVrijgevenBtn.disabled=false;dossierVrijgevenBtn.innerHTML='&#128228; Dossier vrijgeven aan begeleider';
      }
    }catch(e){toast('Verbindingsfout','err');dossierVrijgevenBtn.disabled=false;}
  };
  var sumBtn=ge('sum-btn');if(sumBtn)sumBtn.onclick=function(){S.showValidation=true;saveCurrent();S.screen='summary';renderApp();};
  var sumBtn2=ge('sum-btn2');if(sumBtn2)sumBtn2.onclick=function(){S.showValidation=true;saveCurrent();S.screen='summary';renderApp();};
  var prevBtn=ge('prev-btn');if(prevBtn)prevBtn.onclick=function(){saveCurrent();S.fase--;renderApp();};
  var nextBtn=ge('next-btn');if(nextBtn)nextBtn.onclick=function(){saveCurrent();S.fase++;renderApp();};
  var genBtn=ge('gen-btn');if(genBtn)genBtn.onclick=function(){generateAI(FASES[S.fase].id);};
  var entKiezer=ge('entiteit-kiezer-form');
  if(entKiezer)entKiezer.onchange=function(){
    saveCurrent(); // huidige (nu nog actieve) context eerst opslaan vóór het wisselen
    switchEntiteit(this.value||null);
    renderApp();
  };
  document.querySelectorAll('.fase-card[data-fi]').forEach(function(el){el.onclick=function(){
    // Sla huidige fase DIRECT op naar server (geen timer) voor navigatie
    var f=FASES[S.fase];
    if(f&&S.screen==='main'&&!isKoper()&&!(S.traject&&S.traject.status==='vergrendeld')){
      f.dataFields.forEach(function(df){
        if(df.header)return;
        var domEl=ge('df_'+df.id);
        var key=f.id+'_'+df.id;
        if(domEl){
          if(domEl.value.trim()||S._userEdited[key])S.data[key]=domEl.value;
        }
      });
      var nel=ge('notitie_'+f.id);if(nel)S.notities[f.id]=nel.value;
      clearTimeout(S.saveTimer);
      fetch(WORKER+'/mna/save',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code:S.code,fase_id:f.id,data_json:getDataForFase(f.id),checklist_json:getChecklistForFase(f.id),notitie:S.notities[f.id]||'',entiteit_id:S._actieveEntiteit||undefined})
      }).then(function(r){return r.json();}).then(function(d){
        if(d&&d.groepswaarden)Object.keys(d.groepswaarden).forEach(function(k){var v=d.groepswaarden[k];if(v&&v.value!==undefined)S._groepData[f.id+'_'+k]=v.value;});
      }).catch(function(){});
    }
    var newFase=parseInt(el.dataset.fi);
    S.fase=newFase;
    var faseId=FASES[newFase]&&FASES[newFase].id;
    if(faseId&&!DOCS[faseId])loadDocsForFase(faseId);
    renderApp();
  };});
  if(!isKoper()){
    document.querySelectorAll('.chk-item[data-key]').forEach(function(el){el.onclick=function(){saveCurrent();S.checked[el.dataset.key]=!S.checked[el.dataset.key];renderApp();};});
  }
  // Centrale upload file input listener
  var cfi=document.getElementById('centraal-file-input');
  if(cfi)cfi.addEventListener('change',function(){if(this.files&&this.files.length)window.centraalUploadFiles(this.files);this.value='';});
  checkOmzetSom();

  document.querySelectorAll('.upload-zone[data-fase]').forEach(function(el){
    el.onclick=function(){triggerFileUpload(el.dataset.fase);};
  });
  var vb=ge('vrijgeven-btn');
  if(vb)vb.onclick=async function(){
    var auth=S._bgKey||'';
    var r=await fetch(WORKER+'/mna/admin/vrijgeven/'+S.traject.id,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':auth}}).then(function(x){return x.json();}).catch(function(){return{};});
    if(r.ok){S.traject.koper_vrijgegeven=1;renderApp();}
    else if(r.nda_niet_getekend){
      var doorgaan=confirm("\u26a0 De NDA is nog NIET getekend.\n\nKoper krijgt toegang zonder geheimhoudingsovereenkomst. Toch vrijgeven?");
      if(doorgaan){
        var r2=await fetch(WORKER+'/mna/admin/vrijgeven/'+S.traject.id+'?force=1',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':auth}}).then(function(x){return x.json();}).catch(function(){return{};});
        if(r2.ok){S.traject.koper_vrijgegeven=1;renderApp();}
        else toast('Fout: '+(r2.error||'onbekend'),'err');
      }
    }
    else toast('Fout: '+(r.error||'onbekend'),'err');
  };
  // Koper reactie knoppen
  // Q&A laden en versturen
  var qaCurFase=FASES[S.fase];
  if(qaCurFase&&(isKoper()||isTussen())){
    (function(faseId){
      // Laad bestaande Q&A
      fetch(WORKER+'/mna/qa/'+S.code).then(function(r){return r.json();}).then(function(lijst){
        var div=ge('qa-lijst-'+faseId);
        if(!div)return;
        var faseLijst=(lijst||[]).filter(function(q){return !q.fase_id||q.fase_id===faseId;});
        if(!faseLijst.length){div.innerHTML='<div style="font-size:12px;color:var(--muted);font-style:italic">Nog geen vragen voor deze fase.</div>';return;}
        div.innerHTML=faseLijst.map(function(q){
          return '<div style="margin-bottom:.75rem;padding:.75rem;background:var(--card);border-radius:var(--r);border-left:3px solid '+(q.antwoord?'var(--teal)':'var(--gold)')+'">'
            +'<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:.3rem">'
            +'<span style="font-family:IBM Plex Mono,monospace;font-size:10px;background:var(--gold-bg);color:var(--gold);padding:1px 6px;border-radius:3px;flex-shrink:0">#'+q.vraag_nr+'</span>'
            +'<span style="font-size:13px;color:var(--sub)">'+esc(q.vraag)+'</span></div>'
            +(q.antwoord
              ?'<div style="margin-top:.5rem;padding:.5rem .75rem;background:var(--teal-bg);border-radius:var(--r);font-size:12px;color:var(--teal-dim)">&#10003; <strong>'+esc(q.beantwoord_door||'Adviseur')+':</strong> '+esc(q.antwoord)+'</div>'
              :'<div style="font-size:11px;color:var(--muted);margin-top:.25rem;font-style:italic">&#8987; Wacht op antwoord...</div>')
            +'</div>';
        }).join('');
      }).catch(function(){});
      // Verstuur knop
      var qaBtn=ge('qa-btn-'+faseId);
      if(qaBtn)qaBtn.onclick=async function(){
        var inp=ge('qa-input-'+faseId);
        if(!inp||!inp.value.trim())return;
        qaBtn.disabled=true;qaBtn.textContent='Versturen...';
        try{
          var r=await fetch(WORKER+'/mna/qa/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({vraag:inp.value.trim(),fase_id:faseId,gesteld_door:S.traject&&S.traject.koper_naam||'Koper'})});
          var d=await r.json();
          if(d.ok){inp.value='';toast('Vraag #'+d.vraag_nr+' verstuurd. De adviseur ontvangt een melding.','ok');renderApp();}
          else{toast('Fout: '+(d.error||'onbekend'),'err');}
        }catch(e){toast('Verbindingsfout.','err');}
        qaBtn.disabled=false;qaBtn.textContent='Vraag stellen';
      };
    })(qaCurFase.id);
  }

  if(isKoper()){
    var f=FASES[S.fase];
    if(f){
      var rBtn=null; // koper-reactie verwijderd, Q&A module gebruikt
    }
  }
  var ib=ge('intrekken-btn');
  if(ib)ib.onclick=async function(){
    var auth=S._bgKey||'';
    var r=await fetch(WORKER+'/mna/admin/intrekken/'+S.traject.id,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':auth}}).then(function(x){return x.json();}).catch(function(){return{};});
    if(r.ok){S.traject.koper_vrijgegeven=0;renderApp();}else toast('Fout: '+(r.error||'onbekend'),'err');
  };

  // ── BEGELEIDER DOCUMENT KNOPPEN ──────────────────────────────
  var docKnopBtn=ge('doc-knoppen-btn');
  if(docKnopBtn&&isTussen()){
    docKnopBtn.onclick=function(){
      // Toon document modal met NDA/LoI/BEM knoppen
      var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.5rem';
      var mo=document.createElement('div');mo.style.cssText='background:#fff;border-radius:10px;padding:2rem;max-width:560px;width:100%;max-height:90vh;overflow-y:auto';
      var t2=S.traject;
      mo.innerHTML='<div style="font-family:Playfair Display,serif;font-size:1.1rem;color:#1a1815;font-weight:600;margin-bottom:1.25rem">&#128196; Documenten genereren</div>'
        +'<p style="font-size:13px;color:#5a5854;margin-bottom:1.25rem">Genereer en verstuur documenten voor traject <strong>'+esc(t2.kantoor_naam||S.code)+'</strong>.</p>'
        +'<div style="display:flex;flex-direction:column;gap:10px">'
        +'<button id="bg-nda-btn" style="background:#7c5cbf;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128274; Genereer NDA</button>'
        +'<button id="bg-loi-btn" style="background:#c9a84c;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128196; Genereer LoI</button>'
        +'<button id="bg-bem-btn" style="background:#2a5ea0;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128203; Bemiddelingsovereenkomst</button>'
        +'<button id="bg-excl-btn" style="background:#1a7a5e;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128221; Exclusiviteitsbrief</button>'
        +'</div>'
        +'<div id="bg-doc-output" style="margin-top:1rem"></div>'
        +'<div style="margin-top:1.25rem;text-align:right"><button id="bg-doc-sluit" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Sluiten</button></div>';
      ov.appendChild(mo);document.body.appendChild(ov);
      ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
      document.getElementById('bg-doc-sluit').addEventListener('click',function(){document.body.removeChild(ov);});

      async function bgGenereerDoc(type){
        var out=document.getElementById('bg-doc-output');
        out.innerHTML='<div style="color:#8a8880;font-size:13px">Genereren... (15-30 sec)</div>';
        var datum=new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
        var t3=S.traject;
        var isSell=(t3.opdrachtgever_rol==='koper')?false:(!t3.traject_type||t3.traject_type==='Verkoop'||t3.traject_type==='Opvolging');
        var tplType=type==='bem'?(isSell?'bem_verk':'bem_koper'):type;
        var tplR=await fetch(WORKER+'/mna/template/'+tplType+'?email='+encodeURIComponent(t3.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).catch(function(){return{json:function(){return{ok:false};}};});
        var tplD=await tplR.json().catch(function(){return{ok:false};});
        var prompt='';
        if(type==='nda'){
          prompt='Vul de NDA template in voor trajecttype: '+(t3.traject_type||'Verkoop')+'. Partij 1: '+esc(t3.kantoor_naam||'[verkoper]')+', '+(t3.verkoper_adres||'[adres]')+'. Partij 2: '+esc(t3.koper_naam||'[koper]')+' ('+(t3.koper_rechtsvorm||'')+'). Datum: '+datum+'. Adviseur: ' + BRAND.bedrijf + ', '+esc(t3.begeleider_naam||'Begeleider')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard NDA template]');
        }else if(type==='loi'){
          prompt='Vul de LoI template in voor trajecttype: '+(t3.traject_type||'Verkoop')+'. Partij 1: '+esc(t3.kantoor_naam||'[verkoper]')+'. Partij 2: '+esc(t3.koper_naam||'[koper]')+' ('+(t3.koper_rechtsvorm||'')+'), '+(t3.koper_adres||'')+'. Datum: '+datum+'. Adviseur: '+(t3.begeleider_naam||'' + BRAND.bedrijf + '')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard LoI template]');
        }else{
          prompt='Vul de Bemiddelingsovereenkomst template in. Type: '+(isSell?'Verkoop':'Aankoop')+'. Opdrachtgever: '+esc(isSell?t3.kantoor_naam:t3.koper_naam||'[koper]')+'. Datum: '+datum+'. Begeleider/Adviseur: '+(t3.begeleider_naam||'' + BRAND.bedrijf + '')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard BEM template]');
        }
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:8000})});
        var rd=await resp.json();
        var tekst=rd.text||(rd.error||'Fout');
        var labels={nda:'NDA',loi:'LoI',bem:'Bemiddelingsovereenkomst'};
        out.innerHTML='<div style="font-size:11px;font-weight:600;color:#2a5ea0;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">'+labels[type]+' gegenereerd</div>'
          +'<textarea style="width:100%;height:280px;background:#f0eeea;border:1px solid #c8c5bc;border-radius:6px;color:#2a2825;font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical" id="bg-doc-tekst">'+esc(tekst)+'</textarea>'
          +'<div style="display:flex;gap:8px;margin-top:.75rem">'
          +'<button id="bg-print-btn" style="background:transparent;border:1px solid #c8c5bc;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:12px">&#128196; Print / PDF</button>'
          +'<button id="bg-email-btn" style="background:#2a5ea0;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:12px;font-weight:600">&#9993; Verstuur naar partijen</button>'
          +'</div>';
        document.getElementById('bg-print-btn').onclick=function(){
          var win=window.open('','_blank');
          var pt=document.getElementById('bg-doc-tekst').value;
          win.document.write('<html><head><style>body{font-family:Georgia,serif;font-size:13px;line-height:1.9;max-width:700px;margin:2cm auto;color:#2a2825}</style></head><body><p>'+pt.replace(/\n/g,'<br>')+'</p></body></html>');
          win.document.close();win.print();
        };
        document.getElementById('bg-email-btn').onclick=async function(){
          var ebtn=this;ebtn.disabled=true;ebtn.textContent='Versturen...';
          var verzendTekst=document.getElementById('bg-doc-tekst').value;
          // BEM naar opdrachtgever
          var toList;
          if(type==='bem'){
            if(isSell){
              toList=[t3.contact_email,t3.begeleider_email].filter(Boolean);
            } else {
              toList=[t3.koper_email,t3.begeleider_email].filter(Boolean);
            }
          } else {
            toList=[t3.contact_email||t3.begeleider_email];
            if(t3.begeleider_email&&!toList.includes(t3.begeleider_email))toList.push(t3.begeleider_email);
            if(t3.koper_email&&!toList.includes(t3.koper_email))toList.push(t3.koper_email);
          }
          var endpoint=type==='nda'?'/mna/nda/email':type==='loi'?'/mna/loi/email':'/mna/bem/email';
          var payload={code:S.code,to:toList};
          if(type==='nda')payload.nda_tekst=verzendTekst;
          else if(type==='loi')payload.loi_tekst=verzendTekst;
          else{payload.bem_tekst=verzendTekst;payload.type=isSell?'verkoop':'aankoop';}
          var er=await fetch(WORKER+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          var ed=await er.json();
          if(ed.ok){ebtn.textContent='✓ Verstuurd';setTimeout(function(){ebtn.textContent='✉ Verstuur';ebtn.disabled=false;},2000);}
          else{toast('Fout: '+(ed.error||'onbekend'),'err');ebtn.disabled=false;ebtn.textContent='✉ Verstuur';}
        };
      }
      document.getElementById('bg-nda-btn').onclick=function(){bgGenereerDoc('nda');};
      document.getElementById('bg-excl-btn').onclick=function(){bgGenereerDoc('excl');};
      document.getElementById('bg-loi-btn').onclick=function(){bgGenereerDoc('loi');};
      document.getElementById('bg-bem-btn').onclick=function(){bgGenereerDoc('bem');};
    };
  }

  // ── BEGELEIDER GESPREK VASTLEGGEN ────────────────────────────
  var gesprekCoverBtn=ge('gesprek-btn-cover');
  if(gesprekCoverBtn&&isTussen()){
    gesprekCoverBtn.onclick=function(){ openBgGesprekForm(null); };
  }

      // Laad concept bij openen
      fetch(WORKER+'/mna/gesprek/concept/'+S.code)
        .then(function(r){return r.json();})
        .then(function(concept){
          if(!concept)return;
          if(concept.datum){var el=document.getElementById('bg-gs-datum');if(el)el.value=concept.datum;}
          if(concept.deelnemers){var el=document.getElementById('bg-gs-deelnemers');if(el)el.value=concept.deelnemers;}
          if(concept.type){var el=document.getElementById('bg-gs-type');if(el)el.value=concept.type;}
          if(concept.ruwe_notities){var el=document.getElementById('bg-gs-notities');if(el)el.value=concept.ruwe_notities;}
          if(concept.verslag){var el=document.getElementById('bg-gs-verslag');if(el)el.value=concept.verslag;}
          var ind=document.getElementById('bg-gs-concept-ind');
          if(ind){var dt=new Date(concept.updated_at).toLocaleString('nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});ind.textContent='Concept geladen van '+dt;}
        }).catch(function(){});

      // Auto-opslaan debounced
      var bgConceptTimer=null;
      function bgSlaConceptOp(){
        try{
          var datum=document.getElementById('bg-gs-datum')?.value||'';
          var notities=document.getElementById('bg-gs-notities')?.value||'';
          var verslag=document.getElementById('bg-gs-verslag')?.value||'';
          if(!datum&&!notities&&!verslag)return;
          fetch(WORKER+'/mna/gesprek/concept',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({code:S.code,datum:datum,deelnemers:document.getElementById('bg-gs-deelnemers')?.value||'',type:document.getElementById('bg-gs-type')?.value||'',ruwe_notities:notities,verslag:verslag,auteur:S.traject&&S.traject.begeleider_naam||'Begeleider'})
          });
          var ind=document.getElementById('bg-gs-concept-ind');
          if(ind)ind.textContent='Concept opgeslagen '+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
        }catch(e){}
      }
      ['bg-gs-datum','bg-gs-deelnemers','bg-gs-type','bg-gs-notities','bg-gs-verslag'].forEach(function(elId){
        var el=document.getElementById(elId);
        if(el)el.addEventListener('input',function(){clearTimeout(bgConceptTimer);bgConceptTimer=setTimeout(bgSlaConceptOp,2000);});
      });

      var bgGsOkBtn=document.getElementById('bg-gs-ok');
      if(bgGsOkBtn)bgGsOkBtn.onclick=async function(){
        var datum=document.getElementById('bg-gs-datum').value;
        var err=document.getElementById('bg-gs-err');
        if(!datum){err.style.display='block';err.textContent='Datum is verplicht.';return;}
        var btn=this;btn.disabled=true;btn.textContent='Opslaan...';
        var payload={datum:datum,deelnemers:document.getElementById('bg-gs-deelnemers').value.trim(),type:document.getElementById('bg-gs-type').value,ruwe_notities:document.getElementById('bg-gs-notities').value.trim(),verslag:document.getElementById('bg-gs-verslag').value.trim(),zichtbaar_voor:(document.getElementById('bg-gs-zichtbaar')?.value||'begeleider')};
        var auth=S._bgKey||'';
        var r=await fetch(WORKER+'/mna/admin/gesprekken/'+S.traject.id,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':auth},body:JSON.stringify(payload)});
        var d=await r.json();
        if(d.ok){
          // Verwijder concept na definitief opslaan
          fetch(WORKER+'/mna/gesprek/concept/delete/'+S.code,{method:'POST'}).catch(function(){});
          document.body.removeChild(ov);toast('Gesprek definitief opgeslagen.','ok');
        }
        else{err.style.display='block';err.textContent='Fout: '+(d.error||'onbekend');btn.disabled=false;btn.textContent='Opslaan';}
      };
    };

  // ── BEGELEIDER AI-ANALYSE ────────────────────────────────────
  var aiAnalyseCoverBtn=ge('ai-analyse-btn-cover');
  if(aiAnalyseCoverBtn&&isTussen()){
    aiAnalyseCoverBtn.onclick=async function(){
      var btn=this;btn.disabled=true;btn.textContent='Analyseren...';
      var t3=S.traject;
      var bms={};
      try{var br=await fetch(WORKER+'/benchmarks');var bd=await br.json();bd.forEach(function(b){bms[b.sleutel]=b;});}catch(e){}
      var dataSamenvatting='';
      (S._mnaData||[]).forEach(function(row){
        try{
          var dj=typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json;
          var gevuld=Object.values(dj||{}).filter(function(v){return v&&v.value;});
          if(gevuld.length){dataSamenvatting+='\n## '+row.fase_id+'\n';gevuld.forEach(function(v){dataSamenvatting+='- '+v.label+': '+v.value+'\n';});}
        }catch(e){}
      });
      var bmTekst='BENCHMARKS: EBITDA '+(bms['ebitda_marge_admin']?bms['ebitda_marge_admin'].waarde:18.7)+'% | Multiples '+(bms['multiple_adm_laag']?bms['multiple_adm_laag'].waarde:4.6)+'x-'+(bms['multiple_adm_hoog']?bms['multiple_adm_hoog'].waarde:5.5)+'x\n';
      var prompt='M&A-adviseur accountancy. Analyseer traject: '+esc(t3.kantoor_naam||S.code)+' ('+esc(t3.traject_type||'Verkoop')+')\n'+bmTekst+'\nDUE DILIGENCE:'+dataSamenvatting+'\n\n## Samenvatting\n## Financieel profiel & waardering\n## Sterktes\n## Risicos\n## Aanbevelingen\n\nMax 500 woorden.';
      try{
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:3000})});
        var rd=await resp.json();
        var tekst=(rd.text||'Fout bij genereren.').replace(/## ([^\n]+)/g,'<strong style="display:block;margin:.75rem 0 .25rem;font-size:14px">$1</strong>').replace(/\n/g,'<br>');
        var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.5rem';
        var mo=document.createElement('div');mo.style.cssText='background:#fff;border-radius:10px;padding:2rem;max-width:680px;width:100%;max-height:90vh;overflow-y:auto';
        mo.innerHTML='<div style="font-family:Playfair Display,serif;font-size:1.1rem;color:#1a1815;font-weight:600;margin-bottom:1.25rem">&#9881; AI-analyse · '+esc(t3.kantoor_naam||S.code)+'</div>'
          +'<div style="font-size:13px;color:#5a5854;line-height:1.8">'+tekst+'</div>'
          +'<div style="margin-top:1.25rem;text-align:right"><button id="ai-sluit" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Sluiten</button></div>';
        ov.appendChild(mo);document.body.appendChild(ov);
        ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
        document.getElementById('ai-sluit').onclick=function(){document.body.removeChild(ov);};
      }catch(e){toast('Fout bij AI-analyse: '+e.message,'err');}
      btn.disabled=false;btn.innerHTML='&#9881; AI-analyse';
    };
  }

