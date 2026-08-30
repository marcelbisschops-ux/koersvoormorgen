// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Vaste spelregels-tekst over automatische AI-invoer/analyse/output — getoond op de landingspagina
// aan zowel verkoper als koper/derde, naast (niet i.p.v.) de per-document-waarschuwing in akkoordHtml().
function aiSpelregelsHtml(){
  return '<div style="margin:1rem 0;padding:.75rem 1rem;background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);font-size:11px;color:var(--muted);line-height:1.7">&#129302; <strong>AI &amp; verantwoordelijkheid:</strong> Veldwaarden die automatisch uit documenten worden ingelezen, en analyses/beoordelingen/waarderingen die dit platform genereert, komen tot stand met behulp van kunstmatige intelligentie (mogelijk bèta-functionaliteit) en kunnen fouten bevatten. Dit is ondersteunende informatie, geen advies. Controleer automatisch ingevulde waarden en gegenereerde teksten altijd zelf — de eindverantwoordelijkheid voor juistheid en gebruik ligt bij u en uw adviseur.</div>';
}
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
      +'<div style="margin:1rem 0;padding:.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r);font-size:11px;color:var(--muted);line-height:1.7">&#128274; <strong>Beveiliging &amp; AVG:</strong> Alle gegevens worden versleuteld via HTTPS verstuurd en opgeslagen op Cloudflare-servers in Europa (Frankfurt, EU) en uitsluitend gebruikt voor dit M&amp;A-traject. <strong>'+esc(t.begeleider_naam||'Uw adviseur')+'</strong> is de verwerkingsverantwoordelijke voor uw gegevens conform de AVG — voor vragen over inzage, correctie of verwijdering van úw gegevens kunt u het beste rechtstreeks contact opnemen via <a href=\"mailto:'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'\" style=\"color:var(--teal)\">'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'</a>.'
      +'<div style="margin-top:.5rem;font-size:10px;color:#b8b6ac">Verwerkt via het '+BRAND.platformEcht+'-platform, techniek verzorgd door '+BRAND.kort+' — zie de <a href=\"privacy.html\" style=\"color:#b8b6ac\">verwerkersinformatie</a>.</div></div>'
      +aiSpelregelsHtml()
    +'<p>Met vriendelijke groet,<br><strong>'+esc(t.begeleider_naam||BRAND.contactpersoon)+'</strong><br><span style="font-size:12px;color:var(--muted)">Senior M&amp;A-adviseur &middot; '+esc(t.begeleider_bedrijf||BRAND.bedrijfKort)+'<br><a href="mailto:'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'" style="color:var(--muted)">'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'</a></span></p>'
      +'<div style="margin-top:.75rem;font-size:10px;color:#c8c5bc">Mogelijk gemaakt door '+BRAND.platformEcht+'</div>';
  }else if(isTussen()){
    intro='<p>Geachte tussenpersoon,</p>'
      +'<p>U heeft toegang tot de voortgang van het due diligence traject (trajecttype: <strong>'+esc(t.traject_type||'M&A')+'</strong>). De kantooridentiteit is geanonimiseerd conform de afspraken. U kunt per fase de ingevoerde informatie inzien en een AI-advies genereren op basis van de beschikbare data.</p>'
      +'<p>Vragen? Neem contact op via <a href="mailto:' + esc(begeleiderWeergaveEmail(t.begeleider_email)) + '" style="color:var(--teal)">' + esc(begeleiderWeergaveEmail(t.begeleider_email)) + '</a>.</p>'
      +aiSpelregelsHtml()
      +'<p>Met vriendelijke groet,<br><strong>'+esc(t.begeleider_naam||BRAND.contactpersoon)+'</strong><br><span style="font-size:12px;color:var(--muted)">Senior M&amp;A-adviseur &middot; '+esc(t.begeleider_bedrijf||BRAND.bedrijfKort)+'</span></p>';
  }else if(!t.koper_vrijgegeven){
    // Koper zonder vrijgave — toon BEM als die beschikbaar is
    var bemBlokKoper='';
    if(S.bemDocId||S.bemTekst){
      bemBlokKoper='<div style="margin:1.5rem;background:var(--info-bg);border:1px solid var(--info);border-radius:var(--r2);padding:1.25rem">'
        +'<div style="font-size:11px;font-weight:600;color:var(--info);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem">&#128203; Bemiddelingsovereenkomst beschikbaar</div>'
        +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">De Bemiddelingsovereenkomst is opgesteld door uw adviseur.'+(S.bemDocId||S.bemGetekend?' &mdash; <strong style="color:var(--info)">Reeds ondertekend.</strong>':' Lees en onderteken het document.')+' </div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +(S.bemDocId?'<a href="'+WORKER+'/mna/document/download/'+S.bemDocId+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:12px;border-color:var(--info);color:var(--info);text-decoration:none">&#8681; Download BEM</a>':'')
        +(S.bemTekst&&!S.bemDocId?'<button id="bem-lees-btn2" class="btn-ghost" style="font-size:12px;border-color:var(--info);color:var(--info)">&#128065; Lees BEM</button>':'')
        +(S.bemDocId||S.bemGetekend?'<div style="font-size:11px;padding:4px 10px;border-radius:12px;background:var(--info-bg);border:1px solid var(--info);color:var(--info)">&#10003; '+(S.bemGetekend?'Getekend door '+esc(S.bemGetekend):'Reeds ondertekend')+'</div>':'<button id="bem-teken-btn" class="btn" style="font-size:12px;padding:6px 14px;background:var(--info)">&#9998; Akkoord &amp; onderteken</button>')
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
      +'<div style="margin:1rem 0;padding:.85rem 1rem;background:var(--teal-bg);border:1px solid var(--teal-dark);border-radius:var(--r);font-size:12px;color:var(--sub);line-height:1.8">'
      +'<div style="font-weight:600;color:var(--teal);margin-bottom:.4rem">&#128064; Zo werkt dit overzicht</div>'
      +'<div><strong>1.</strong> Klik hieronder op "Bekijk due diligence-informatie" — u komt in een overzicht met 7 onderwerpen (financieel, klanten, personeel, etc.).</div>'
      +'<div><strong>2.</strong> Klik op een tegel om de details van dat onderwerp te lezen; boven de gegevens staat steeds kort waarom dat onderdeel relevant is.</div>'
      +'<div><strong>3.</strong> Heeft u een vraag of wilt u een tegenvoorstel doen over een onderwerp? Gebruik het Q&amp;A-blok onderaan dat onderwerp.</div>'
      +'<div><strong>4.</strong> Zodra de adviseur de waardering deelt, vindt u die via de knop "Waardering".</div>'
      +'</div>'
      +'<div style="margin:1rem 0;padding:.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r);font-size:11px;color:var(--muted);line-height:1.7">&#128274; <strong>Beveiliging &amp; AVG:</strong> <strong>'+esc(t.begeleider_naam||'Uw adviseur')+'</strong> is de verwerkingsverantwoordelijke voor de gegevens in dit traject conform de AVG — voor vragen kunt u contact opnemen via <a href=\"mailto:'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'\" style=\"color:var(--teal)\">'+esc(begeleiderWeergaveEmail(t.begeleider_email))+'</a>.'
      +'<div style="margin-top:.5rem;font-size:10px;color:#b8b6ac">Verwerkt via het '+BRAND.platformEcht+'-platform, techniek verzorgd door '+BRAND.kort+' — zie de <a href=\"privacy.html\" style=\"color:#b8b6ac\">verwerkersinformatie</a>.</div></div>'
      +aiSpelregelsHtml()
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
    +(isVerkoper()&&(!S.modules||S.modules.marketing!==false)?'<div style="margin-top:1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      +'<div style="font-size:11px;font-weight:600;color:var(--teal);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem">&#128226; Teaser</div>'
      +'<div style="font-size:12px;color:var(--mid);margin-bottom:.75rem">Een kort, anoniem verkoopdocument (geen bedrijfsnaam) om vroeg in het proces interesse te peilen bij potentiële kopers — vóór er een specifieke koper is. Uw adviseur kan deze ook voor u aanmaken.</div>'
      +'<button class="btn" id="teaser-verk-btn" style="font-size:12px;background:var(--teal)">'+(t.teaser_tekst?'Teaser bekijken/bewerken':'Genereer teaser')+'</button>'
      +'<div id="teaser-verk-out" style="display:none;margin-top:.75rem"></div>'
      +'</div>':'')
    +'<div id="partij-docs-sectie" style="margin-top:1.5rem"></div>'
    +'<div id="partij-gesprekken-sectie" style="margin-top:1rem"></div>'
    +((isVerkoper()||isKoper())?'<div id="meekijkers-sectie" style="margin-top:1rem"></div>':'')
    +(isVerkoper()?'<button class="btn" id="to-main-btn2" style="width:100%;margin-top:1rem">'+(totalFillPct()>0?'Verder met invullen':'Start met invullen')+' &#8594;</button>':'')
    +(isKoper()?'<button class="btn" id="to-main-btn2" style="width:100%;margin-top:1rem">Bekijk due diligence-informatie &#8594;</button>':'')
    +(isKoper()?'<button class="btn-outline" id="to-dataroom-btn2" style="width:100%;margin-top:.5rem">&#128196; Alle documenten bekijken</button>':'')
    +(isKoper()&&t.koper_vrijgegeven?'<button class="btn-outline" id="to-waardering-btn2" style="width:100%;margin-top:.5rem">&#9654; Waardering</button>':'')
    +'</div>';
}

// Korte, sectoronafhankelijke uitleg per fase-onderdeel — waarom dit voor een koper relevant is.
// Losstaand van de (per sector wisselende) f.desc-labels, die zijn bedoeld als korte analist-titel,
// niet als uitleg voor een koper die deze omgeving voor het eerst ziet.
var KOPER_FASE_UITLEG={
  financieel:'Deze cijfers zijn de basis van de waardering en het dealvoorstel. Let op de opbouw van de omzet, de winstmarge en of die consistent is over de jaren.',
  commercieel:'Dit laat zien hoe afhankelijk de onderneming is van individuele klanten en hoe voorspelbaar de omzet blijft na overname.',
  partner:'Bij een mensenbedrijf hangt de continuïteit vaak af van sleutelpersonen. Hier ziet u wie dat zijn, of zij aanblijven en hoe groot die afhankelijkheid is.',
  compliance:'Regelgeving en dossierkwaliteit bepalen mede het risico dat u overneemt — hier staat of het kantoor aan de vereisten voldoet en of er lopende issues zijn.',
  it:'De systemen en automatiseringsgraad bepalen hoe efficiënt het kantoor werkt en hoe eenvoudig het te integreren is met uw eigen organisatie.',
  juridisch:'Dit onderdeel toont de juridische en fiscale structuur — belangrijk om te weten welke risico’s, verplichtingen of geschillen u mogelijk overneemt.',
  strategisch:'Hier vindt u de marktpositie en groeipotentie van de onderneming — relevant voor de vraag of de aankoop op langere termijn waarde toevoegt.'
};

// Sectoronafhankelijke intro-tekst per fase-onderdeel voor de VERKOPER (Marcel, 26 juli 2026):
// legt uit wat er in deze fase precies gevraagd wordt en waarom, vóór de velden zelf. Zelfde
// opzet als KOPER_FASE_UITLEG hierboven maar vanuit het perspectief van de invuller (verkoper),
// niet van de koper die het resultaat beoordeelt.
var VERKOPER_FASE_INTRO={
  financieel:'Deze cijfers vormen de basis voor de waardering en het dealvoorstel. Vul ze zo volledig mogelijk in en onderbouw met de gevraagde jaarrekeningen — hoe vollediger, hoe nauwkeuriger de waardering die hieruit volgt.',
  commercieel:'Hier laat u zien hoe uw klantenbestand is opgebouwd en hoe voorspelbaar de omzet is. Een koper wil weten hoe afhankelijk de onderneming is van een klein aantal grote klanten.',
  partner:'Bij een mensenbedrijf hangt de continuïteit vaak af van sleutelpersonen. Geef aan wie dat zijn, en wat er verandert als zij na de overname vertrekken.',
  compliance:'Vergunningen, certificeringen en dossierkwaliteit bepalen mede het risico dat een koper overneemt. Geef een eerlijk beeld, ook van eventuele lopende issues — dat voorkomt verrassingen verderop in het proces.',
  it:'Beschrijf de systemen die u gebruikt en hoe geautomatiseerd uw werkprocessen zijn. Dit helpt de koper inschatten hoe eenvoudig een integratie met de eigen organisatie zal verlopen.',
  juridisch:'Hier legt u de juridische en fiscale structuur vast — contracten, geschillen en verplichtingen. Volledigheid hier voorkomt vertraging of onaangename verrassingen bij de closing.',
  strategisch:'Beschrijf de marktpositie en groeikansen van de onderneming. Dit helpt een koper inschatten of de overname ook op langere termijn waarde toevoegt.'
};

// Verplicht openingsscherm voor de verkoper bij een NIEUW traject (punt #29, 26 juli 2026,
// Marcels expliciete keuze: verplicht bij eerste login, alleen voor nieuwe trajecten — bestaande
// trajecten hebben opening_voltooid al op 1 staan via de eenmalige backend-migratie, zie
// worker/07-mna-groepen.js). Legt adres/KvK/naam tekenbevoegde vast op traject-niveau plus
// partners/groepsstructuur (dezelfde /mna/entiteiten en /mna/partners-routes als de begeleider
// gebruikt, nu ook voor de verkoper opengesteld — geen aparte auth-header nodig, S.code in de URL
// is voor deze routes voldoende autorisatie voor de eigen verkoperrol).
function renderOpening(){
  var t=S.traject||{};
  var pt=getPartnerTerm();
  return '<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
    +'<button class="btn-ghost btn-sm" onclick="uitloggen()">&#8592; Uitloggen</button></div>'
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">Welkom &mdash; voordat u begint</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem;max-width:640px">Voor <strong>'+esc(t.kantoor_naam||'')+'</strong> vragen we eerst een paar basisgegevens en, indien van toepassing, de '+esc(pt.meer)+' en groepsstructuur. Dit is eenmalig en duurt een paar minuten — daarna gaat u direct door naar de due diligence-vragen.</div>'
    +'<div class="panel" style="max-width:640px;margin-bottom:1.25rem">'
    +'<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.75rem">&#128274; Bedrijfsgegevens</div>'
    +'<div class="f" style="margin-bottom:.75rem"><label>Adres (statutair)</label><input type="text" id="op-adres" value="'+esc(t.verkoper_adres||'')+'"></div>'
    +'<div class="f" style="margin-bottom:.75rem"><label>KvK-nummer</label><input type="text" id="op-kvk" value="'+esc(t.verkoper_kvk||'')+'"></div>'
    +'<div class="f"><label>Naam tekenbevoegde</label><input type="text" id="op-tekenbevoegde" value="'+esc(t.tekenbevoegde_naam||'')+'"></div>'
    +'</div>'
    +'<div class="panel" style="max-width:640px;margin-bottom:1.25rem">'
    +'<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#127970; Groepsstructuur</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-bottom:1rem">Alleen relevant als er sprake is van een holding met werkmaatschappijen. Geen groepsstructuur? Dan kunt u dit overslaan.</div>'
    +'<div id="op-gs-lijst" style="margin-bottom:1rem;font-size:13px;color:var(--muted);font-style:italic">Laden...</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:.5rem">'
    +'<input type="text" id="op-gs-naam" placeholder="Naam entiteit" style="flex:2;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="op-gs-kvk" placeholder="KvK (optioneel)" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<button id="op-gs-toevoegen" style="background:var(--teal);color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">+ Toevoegen</button>'
    +'</div>'
    +'<label style="display:flex;align-items:flex-start;gap:6px;font-size:11px;color:var(--muted);margin-bottom:.5rem;cursor:pointer">'
    +'<input type="checkbox" id="op-gs-holding" style="margin-top:2px">'
    +'<span>Dit is de overkoepelende <strong>holding</strong>, niet een werkmaatschappij.</span>'
    +'</label>'
    +'<div id="op-gs-err" style="display:none;color:var(--red);font-size:12px;margin-top:.5rem"></div>'
    +'</div>'
    +'<div class="panel" style="max-width:640px;margin-bottom:1.25rem">'
    +'<div style="font-family:Playfair Display,serif;font-size:1.05rem;color:var(--head);font-weight:600;margin-bottom:.25rem">&#129489;&#8205;&#128188; '+esc(pt.titel)+'</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-bottom:1rem">Leg elke '+esc(pt.enkel)+' één keer vast. Werkt een '+esc(pt.enkel)+' bij meerdere entiteiten hierboven? Koppel deze dan aan alle betreffende entiteiten.</div>'
    +'<div id="op-pt-lijst" style="margin-bottom:1rem;font-size:13px;color:var(--muted);font-style:italic">Laden...</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:6px">'
    +'<input type="text" id="op-pt-naam" placeholder="Naam '+esc(pt.enkel)+'" style="flex:2;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="op-pt-leeftijd" placeholder="Leeftijd" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:6px">'
    +'<input type="text" id="op-pt-verandering" placeholder="Veranderbereidheid" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="op-pt-opvolging" placeholder="Opvolgingskandidaat" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'<input type="text" id="op-pt-omzet" placeholder="Omzet incl. team (€)" style="flex:1;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:7px 11px;font-size:13px">'
    +'</div>'
    +'<div id="op-pt-entiteiten" style="font-size:12px;color:var(--muted);margin-bottom:8px">Gekoppelde entiteiten: <span style="font-style:italic">laden...</span></div>'
    +'<button id="op-pt-toevoegen" style="background:var(--teal);color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Toevoegen</button>'
    +'<div id="op-pt-err" style="display:none;color:var(--red);font-size:12px;margin-top:.5rem"></div>'
    +'</div>'
    +'<div id="op-voltooien-err" style="display:none;color:var(--red);font-size:13px;margin-bottom:.75rem;max-width:640px"></div>'
    +'<button id="op-voltooien-btn" class="btn" style="font-size:14px;padding:10px 24px">Doorgaan naar due diligence &#8594;</button>'
    +'</div>';
}

// Bind-logica voor renderOpening() — guarded op ge('op-voltooien-btn') zodat dit veilig vanuit
// de algemene bindAll() aangeroepen kan worden, ook als het openingsscherm niet actief is.
function bindOpeningScreen(){
  var voltooienBtn=ge('op-voltooien-btn');
  if(!voltooienBtn)return;

  async function laadOpeningEntiteiten(){
    var lijstEl=ge('op-gs-lijst');
    if(!lijstEl)return;
    var rows=await fetch(WORKER+'/mna/entiteiten/'+S.code).then(function(r){return r.json();}).catch(function(){return [];});
    S._entiteiten=rows||[];
    if(!rows||!rows.length){lijstEl.innerHTML='<span style="font-style:italic">Nog geen entiteiten toegevoegd.</span>';}
    else{
      lijstEl.style.fontStyle='normal';
      lijstEl.innerHTML=rows.map(function(r){
        var holdingBadge=r.rol==='holding'?' <span style="font-size:9px;font-weight:700;color:var(--gold-dark);background:var(--gold-bg);border-radius:8px;padding:1px 6px;margin-left:4px">HOLDING</span>':'';
        return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;margin-bottom:6px">'
          +'<div style="flex:1"><div style="font-size:13px;color:var(--sub)">'+esc(r.naam)+holdingBadge+'</div>'+(r.kvk?'<div style="font-size:11px;color:var(--muted)">KvK '+esc(r.kvk)+'</div>':'')+'</div>'
          +'<button class="op-gs-verwijder" data-id="'+esc(r.id)+'" style="background:transparent;border:1px solid var(--border2);color:var(--red);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">Verwijderen</button>'
          +'</div>';
      }).join('');
      lijstEl.querySelectorAll('.op-gs-verwijder').forEach(function(btn){
        btn.onclick=async function(){
          await fetch(WORKER+'/mna/entiteiten/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actie:'verwijderen',id:btn.dataset.id})});
          laadOpeningEntiteiten();laadOpeningPartners();
        };
      });
    }
    var entChkEl=ge('op-pt-entiteiten');
    if(entChkEl){
      if(!rows||!rows.length){entChkEl.innerHTML='Gekoppelde entiteiten: <span style="font-style:italic">geen entiteiten toegevoegd — deze partner geldt dan voor het hele traject.</span>';}
      else{
        entChkEl.innerHTML='Gekoppelde entiteiten:<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px">'
          +rows.map(function(r){return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" class="op-pt-ent-chk" value="'+esc(r.id)+'"> '+esc(r.naam)+'</label>';}).join('')
          +'</div>';
      }
    }
  }
  async function laadOpeningPartners(){
    var lijstEl=ge('op-pt-lijst');
    if(!lijstEl)return;
    var rows=await fetch(WORKER+'/mna/partners/'+S.code).then(function(r){return r.json();}).catch(function(){return [];});
    if(!rows||!rows.length){lijstEl.innerHTML='<span style="font-style:italic">Nog geen '+esc(getPartnerTerm().meer)+' toegevoegd.</span>';return;}
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
        +'<button class="op-pt-verwijder" data-id="'+esc(r.id)+'" style="background:transparent;border:1px solid var(--border2);color:var(--red);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">Verwijderen</button>'
        +'</div>';
    }).join('');
    lijstEl.querySelectorAll('.op-pt-verwijder').forEach(function(btn){
      btn.onclick=async function(){
        await fetch(WORKER+'/mna/partners/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actie:'verwijderen',id:btn.dataset.id})});
        laadOpeningPartners();
      };
    });
  }
  var gsToevoegenBtn=ge('op-gs-toevoegen');
  if(gsToevoegenBtn)gsToevoegenBtn.onclick=async function(){
    var btn=this;var naamEl=ge('op-gs-naam');var kvkEl=ge('op-gs-kvk');var errEl=ge('op-gs-err');var holdingEl=ge('op-gs-holding');
    errEl.style.display='none';
    var naam=naamEl.value.trim();
    if(!naam){errEl.textContent='Naam is verplicht.';errEl.style.display='block';return;}
    btn.disabled=true;btn.textContent='...';
    var r=await fetch(WORKER+'/mna/entiteiten/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({naam:naam,kvk:kvkEl.value.trim(),rol:holdingEl&&holdingEl.checked?'holding':'werkmaatschappij'})}).then(function(x){return x.json();}).catch(function(){return {};});
    btn.disabled=false;btn.textContent='+ Toevoegen';
    if(r.ok){naamEl.value='';kvkEl.value='';if(holdingEl)holdingEl.checked=false;laadOpeningEntiteiten();}
    else{errEl.textContent=r.error||'Fout bij opslaan';errEl.style.display='block';}
  };
  var ptToevoegenBtn=ge('op-pt-toevoegen');
  if(ptToevoegenBtn)ptToevoegenBtn.onclick=async function(){
    var btn=this;
    var naamEl=ge('op-pt-naam'),leeftijdEl=ge('op-pt-leeftijd'),verEl=ge('op-pt-verandering'),opvEl=ge('op-pt-opvolging'),omzetEl=ge('op-pt-omzet');
    var errEl=ge('op-pt-err');errEl.style.display='none';
    var naam=naamEl.value.trim();
    if(!naam){errEl.textContent='Naam is verplicht.';errEl.style.display='block';return;}
    var entIds=Array.prototype.slice.call(document.querySelectorAll('.op-pt-ent-chk:checked')).map(function(c){return c.value;});
    btn.disabled=true;btn.textContent='...';
    var r=await fetch(WORKER+'/mna/partners/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({naam:naam,leeftijd:leeftijdEl.value.trim(),veranderbereidheid:verEl.value.trim(),opvolgingskandidaat:opvEl.value.trim(),omzet_incl_team:omzetEl.value.trim(),entiteit_ids:entIds})}).then(function(x){return x.json();}).catch(function(){return {};});
    btn.disabled=false;btn.textContent='+ Toevoegen';
    if(r.ok){naamEl.value='';leeftijdEl.value='';verEl.value='';opvEl.value='';omzetEl.value='';document.querySelectorAll('.op-pt-ent-chk').forEach(function(c){c.checked=false;});laadOpeningPartners();}
    else{errEl.textContent=r.error||'Fout bij opslaan';errEl.style.display='block';}
  };
  voltooienBtn.onclick=async function(){
    var errEl=ge('op-voltooien-err');errEl.style.display='none';
    var adres=(ge('op-adres').value||'').trim();
    var kvk=(ge('op-kvk').value||'').trim();
    var tekenbevoegde=(ge('op-tekenbevoegde').value||'').trim();
    if(!adres||!kvk||!tekenbevoegde){
      errEl.textContent='Adres, KvK-nummer en naam tekenbevoegde zijn verplicht.';errEl.style.display='block';return;
    }
    voltooienBtn.disabled=true;voltooienBtn.textContent='Bezig...';
    var r=await fetch(WORKER+'/mna/opening/voltooien',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,verkoper_adres:adres,verkoper_kvk:kvk,tekenbevoegde_naam:tekenbevoegde})}).then(function(x){return x.json();}).catch(function(){return {};});
    if(r.ok){
      S.traject=Object.assign({},S.traject,{verkoper_adres:adres,verkoper_kvk:kvk,tekenbevoegde_naam:tekenbevoegde,opening_voltooid:1});
      S.screen='cover';
      renderApp();
    }else{
      voltooienBtn.disabled=false;voltooienBtn.textContent='Doorgaan naar due diligence →';
      errEl.textContent=r.error||'Opslaan mislukt, probeer opnieuw.';errEl.style.display='block';
    }
  };
  laadOpeningEntiteiten();
  laadOpeningPartners();
}

// Duidelijk zichtbare verplicht-markering bij een veldlabel. Vervangt het eerdere kale rode "*",
// dat zonder uitleg cryptisch was — een invuller herkent nu meteen dat het veld verplicht is
// (Marcel, 25 juli 2026). Eén helper zodat alle render-plekken identiek blijven.
function reqLabel(df){ return df.req ? ' <span class="req-tag">verplicht</span>' : ''; }

// Post-LoI (fase 2) helpers — losstaand van renderMain() zodat renderDocumentSectie()
// (mna/02-state-opslag-documenten.js) ze ook kan gebruiken voor de upload-knopkleur.
// Bepaal DD-fase: fase 1 (pre-LOI) of fase 2 (post-LOI). LET OP: loi_datum betekent alleen dat
// de LoI is aangemaakt/verstuurd door de begeleider, niet dat de verkoper 'm heeft ondertekend —
// alleen S.loiGetekend/t.loi_getekend (echte handtekening via /mna/teken) mag fase 2 ontgrendelen.
// Regressie juli 2026: loi_datum werd hier ten onrechte ook als "getekend" behandeld, waardoor
// fase-2-velden al vrijkwamen zodra de begeleider een LoI verstuurde.
function isLoiGetekend(){
  return !!(S.loiGetekend || (S.traject && S.traject.loi_getekend));
}
// Zichtbaarheid post-LoI-vragen (Marcel, 21 aug 2026: "ik zie niet waar ik fase 2 moet uploaden"):
// de aanvullende velden staan al gelabeld "(post-LOI)" tussen de gewone velden van diezelfde
// categorie (zie mna/01-config-sectorprofielen.js, _hdr_*2-entries), maar dat was pas zichtbaar ná
// het aanklikken van die categorie — nergens een signaal wélke categorie nieuwe vragen heeft.
function fase2VeldenVoorCategorie(faseId){
  var fase=FASES.find(function(fx){return fx.id===faseId;});
  if(!fase)return [];
  return fase.dataFields.filter(function(df){return !df.header&&df.fase==='2';}).map(function(df){
    var val=(df.groepsniveau?S._groepData:S.data)[faseId+'_'+df.id]||'';
    return {label:df.label,ingevuld:!!val.trim()};
  });
}
function faseHeeftOpenstaandeFase2Velden(faseId){
  return fase2VeldenVoorCategorie(faseId).some(function(v){return !v.ingevuld;});
}

function renderMain(){
  var f=FASES[S.fase];
  var tp=(isVerkoper()||isKoper())?totalFillPct():Math.round(FASES.reduce(function(a,fase){return a+pct(fase.id);},0)/FASES.length);
  var vergrendeld=S.traject&&S.traject.status==='vergrendeld';
  var isRO=isKoper()||vergrendeld;
  var loiGetekend = isLoiGetekend();
  var huidigeDDFase = loiGetekend ? '2' : '1';

  var ov='<div class="fase-grid">';
  FASES.forEach(function(fase,i){
    var p=(isVerkoper()||isKoper())?fillPct(fase.id):pct(fase.id);
    var toontFase2Badge=loiGetekend&&(isVerkoper()||isKoper()||isTussen())&&faseHeeftOpenstaandeFase2Velden(fase.id);
    ov+='<div class="fase-card'+(S.fase===i?' active':'')+'" data-fi="'+i+'">'
      +(toontFase2Badge?'<div style="position:absolute;top:6px;right:6px;font-size:9px;font-weight:700;background:var(--info);color:#fff;padding:2px 7px;border-radius:10px;letter-spacing:.03em" title="Nieuwe vragen beschikbaar na ondertekening LoI">POST-LOI</div>':'')
      +'<div class="fase-num">'+fase.num+'</div>'
      +'<div class="fase-name">'+fase.title+'</div>'
      +'<div class="fase-bar"><div class="fase-fill" style="width:'+p+'%;background:'+(p===100?'var(--teal)':p>50?'var(--gold)':'var(--red)')+'"></div></div>'
      +'<div class="fase-pct">'+p+'%</div>'
      +'</div>';
  });
  ov+='</div>';

  // Data fields
  var dataHtml='<div class="panel">';
  // DD fase banner
  if(isVerkoper()){
    if(!loiGetekend){
      dataHtml+='<div style="background:var(--teal-bg);border:1px solid var(--teal);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px">'        +'<span style="font-size:16px">📋</span>'        +'<div><div style="font-size:12px;font-weight:600;color:var(--teal)">Fase 1 — Oriëntatie (pre-LoI)</div>'        +'<div style="font-size:11px;color:var(--teal-dim)">Na ondertekening van de LoI ontvangt u aanvullende vragen voor de volledige due diligence.</div></div>'        +'</div>';
    } else {
      dataHtml+='<div style="background:var(--info-bg);border:1px solid var(--info);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:10px">'        +'<span style="font-size:16px">🔍</span>'        +'<div><div style="font-size:12px;font-weight:600;color:var(--info)">Fase 2 — Volledige due diligence (post-LoI)</div>'        +'<div style="font-size:11px;color:var(--info-dim)">De LoI is ondertekend. Vul de aanvullende velden in voor de volledige due diligence.</div></div>'        +'</div>';
    }
  }
  dataHtml+='<div class="sec-hdr">Informatie invullen</div>';
  // Specifiek opgevraagde items tonen (informatieverzoek van de begeleider) — voorheen berekend maar
  // nergens gerenderd (dode code, gevonden 21 aug 2026); nu ook expliciet per fase (was hardcoded op
  // fase 1, dus een post-LoI-verzoek was hier nooit zichtbaar voor de verkoper).
  if(isVerkoper()){
    var ivSelHuidig=huidigeDDFase==='2'?S._ivSelectie2:S._ivSelectie1;
    var ivGevraagdeItems=ivSelHuidig&&ivSelHuidig[f.id];
    if(ivGevraagdeItems&&ivGevraagdeItems.length){
      dataHtml+='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem">'
        +'<div style="font-size:11px;font-weight:600;color:var(--gold-dark);margin-bottom:4px">&#128203; Specifiek opgevraagd door uw adviseur'+(huidigeDDFase==='2'?' (post-LoI)':'')+':</div>'
        +'<ul style="margin:0;padding-left:1.1rem;font-size:12px;color:var(--sub);line-height:1.6">'
        +ivGevraagdeItems.map(function(item){return '<li>'+esc(item)+'</li>';}).join('')
        +'</ul></div>';
    }
  }
  // Structureel checklistje van de post-LoI-velden voor déze categorie (Marcel, 21 aug 2026: "ik mis
  // een lijstje per categorie") — onafhankelijk van of er een informatieverzoek is verstuurd, gewoon
  // op basis van welke velden het sectorprofiel als fase 2 markeert. Toont ✓ voor al ingevulde velden
  // (bijv. via een geüpload document) zodat direct zichtbaar is wat nog ontbreekt.
  if((isVerkoper()||isTussen())&&loiGetekend){
    var f2Lijst=fase2VeldenVoorCategorie(f.id);
    if(f2Lijst.length){
      dataHtml+='<div style="background:var(--info-bg);border:1px solid var(--info);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem">'
        +'<div style="font-size:11px;font-weight:600;color:var(--info);margin-bottom:6px">&#128203; Post-LoI-vragen voor '+esc(f.title)+':</div>'
        +'<ul style="margin:0;padding-left:0;list-style:none;font-size:12px;color:var(--sub);line-height:1.7">'
        +f2Lijst.map(function(v){return '<li>'+(v.ingevuld?'<span style="color:var(--teal)">&#10003;</span>':'<span style="color:var(--muted)">&#9675;</span>')+' '+esc(v.label)+'</li>';}).join('')
        +'</ul></div>';
    }
  }
  // Groepsstructuur (Fase 2): kiezer om cijfers per entiteit in te vullen i.p.v. alleen op groepsniveau
  if(!isKoper()&&S._entiteiten&&S._entiteiten.length){
    dataHtml+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;padding:.6rem .85rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">'
      +'<span style="font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap">Invullen voor:</span>'
      +'<select id="entiteit-kiezer-form" style="flex:1;font-size:12px;background:var(--card);border:1px solid var(--border2);border-radius:6px;padding:5px 8px">'
      +'<option value=""'+(S._actieveEntiteit?'':' selected')+'>Groep (geconsolideerd)</option>'
      +S._entiteiten.map(function(e){return '<option value="'+esc(e.id)+'"'+(S._actieveEntiteit===e.id?' selected':'')+'>'+esc(e.naam)+'</option>';}).join('')
      +'</select></div>';
    // Consolidatiecheck: als er een handmatig/document-aangeleverd groepscijfer bestaat dat >5%
    // afwijkt van de som van de losse entiteiten, wordt dat hier zichtbaar — anders verdween dat
    // verschil stilzwijgend (de document-waarde wint altijd, zie consolideerFase() in de worker).
    if(!S._actieveEntiteit){
      var consolCheckRaw=S._groepData[f.id+'_consolidatieCheck'];
      var consolAfwijkingen=[];
      if(consolCheckRaw){try{consolAfwijkingen=JSON.parse(consolCheckRaw)||[];}catch(e){}}
      if(consolAfwijkingen.length){
        // Interactief: per afwijkend veld kiest de begeleider zelf welke waarde geldt — het aangeleverde
        // cijfer wint niet meer stilzwijgend (Marcel, 25 juli 2026). Alleen voor de begeleider; de
        // verkoper ziet dit keuzeblok niet (die vult in, de begeleider consolideert).
        var magKiezen=isTussen();
        dataHtml+='<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1rem">'
          +'<div style="font-size:12px;font-weight:600;color:var(--gold-dark);margin-bottom:6px">&#9888; Aangeleverde groepscijfers wijken af van de som van de entiteiten</div>'
          +consolAfwijkingen.map(function(a){
            var regel='<div style="font-size:11px;color:var(--sub);line-height:1.6;padding:5px 0;border-top:1px solid var(--gold)">'
              +'<strong>'+esc(a.label)+'</strong>: aangeleverd '+Number(a.documentWaarde).toLocaleString('nl-NL')+' vs. som entiteiten '+Number(a.somEntiteiten).toLocaleString('nl-NL')+' ('+a.verschilPct+'% verschil)';
            if(magKiezen){
              regel+='<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">'
                +'<button onclick="consolKies(\''+f.id+'\',\''+esc(a.veld)+'\',\'som\','+Number(a.somEntiteiten)+')" style="font-size:10px;font-weight:600;background:var(--teal);color:#fff;border:none;border-radius:var(--r);padding:3px 8px;cursor:pointer">Gebruik som van entiteiten ('+Number(a.somEntiteiten).toLocaleString('nl-NL')+')</button>'
                +'<button onclick="consolKies(\''+f.id+'\',\''+esc(a.veld)+'\',\'aangeleverd\',0)" style="font-size:10px;font-weight:600;background:none;color:var(--gold-dark);border:1px solid var(--gold);border-radius:var(--r);padding:3px 8px;cursor:pointer">Gebruik aangeleverd cijfer ('+Number(a.documentWaarde).toLocaleString('nl-NL')+')</button>'
                +'</div>';
            }
            return regel+'</div>';
          }).join('')
          +'<div style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic">'+(magKiezen?'Kies per veld welke waarde geldt. Een verschil ontstaat vaak door ontbrekende entiteitsdata of onderlinge (intercompany-)posten.':'Het aangeleverde cijfer wordt gebruikt totdat de begeleider een keuze maakt.')+'</div>'
          +'</div>';
      }
    }
  }else if(isKoper()&&S._entiteiten&&S._entiteiten.length){
    dataHtml+='<div style="margin-bottom:1rem;padding:.6rem .85rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r);font-size:11px;color:var(--sub);line-height:1.6">'
      +'<strong style="color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-size:10px">Geconsolideerde cijfers</strong><br>'
      +'De onderstaande gegevens zijn de som van '+S._entiteiten.length+' entiteiten binnen de groep: '+S._entiteiten.map(function(e){return esc(e.naam);}).join(', ')+'.'
      +'</div>';
  }
  // Audit-fix (25 juli 2026, op Marcels verzoek): niet duidelijk genoeg dat handmatig invullen +
  // documenten als bewijsstuk de standaardaanpak is, en AI-analyse een bewuste, aparte keuze
  // (het vinkje bij uploaden). Tekst over "wat gebeurt er bij een afwijking" is bewust precies:
  // gecontroleerd in autoFillFromExtraction() (mna/02-state-opslag-documenten.js) dat een handmatig
  // ingevulde waarde NOOIT wordt overschreven — maar alleen bij de belangrijkste financiële velden
  // (omzet/EBITDA e.d., via applyOrConflict) verschijnt ook een keuzescherm bij een afwijking; bij de
  // meeste overige velden (setIfEmpty) blijft uw waarde gewoon staan, zonder melding van de afwijking.
  var instrTxt=isVerkoper()?'<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:1rem;padding-bottom:.75rem;border-bottom:1px solid var(--border)">'
    +'<strong style="color:var(--sub)">Vul de velden hieronder zelf in, of upload rechts uw documenten</strong> (jaarrekeningen, KvK-uittreksel, contracten) en laat ze automatisch invullen — beide kan, in elke volgorde. Documenten dienen ook als onderbouwing bij het dossier.<br>'
    +'Bij het uploaden kiest u zelf: <strong style="color:var(--sub)">"Alleen als bewijsstuk toevoegen"</strong> aangevinkt &rarr; het document wordt alleen bewaard, er verandert niets aan uw ingevulde velden. Niet aangevinkt (standaard) &rarr; de AI leest het document en vult ontbrekende velden automatisch aan.<br>'
    +'Een handmatig ingevulde waarde wordt nooit automatisch overschreven. Bij de belangrijkste financiële velden (zoals omzet en EBITDA) krijgt u bij een afwijkende waarde uit een document ook een keuzescherm om zelf de juiste waarde aan te wijzen.'
    +'</div>'
    :isKoper()&&KOPER_FASE_UITLEG[f.id]?'<div style="font-size:12px;color:var(--sub);line-height:1.7;margin-bottom:1rem;padding:.6rem .85rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r)">&#128161; '+esc(KOPER_FASE_UITLEG[f.id])+'</div>':'';
  dataHtml+=instrTxt+'<div class="data-grid">';
  var fase2GetoondHeader=false;
  f.dataFields.forEach(function(df){
    // Fase 2 velden: toon als vergrendeld als LoI nog niet getekend
    var isFase2 = df.fase === '2';
    var blokkeer = isFase2 && !loiGetekend && isVerkoper();

    if(df.header){
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
    // Groepsniveau-velden (bv. aantal partners) horen altijd bij de groep, ook als er een
    // entiteit actief is — anders lijkt hetzelfde partnerteam per BV een ander antwoord te geven.
    var val=(df.groepsniveau?S._groepData:S.data)[f.id+'_'+df.id]||'';
    // S.docRefs werd nooit ergens gevuld (dode infrastructuur) — herkomst komt uit veldBron(),
    // die al bestond voor de AI-verificatiestatus-samenvatting maar nooit per-veld werd getoond.
    var veldBronInfo=veldBron(f.id+'_'+df.id);
    var ref=(veldBronInfo&&veldBronInfo.bron==='ai_document'&&veldBronInfo.bron_doc)?veldBronInfo.bron_doc:null;
    var missing=S.showValidation&&df.req&&!val.trim();
    // Check of dit veld een openstaand conflict heeft
    var hasConflict=S._pendingConflicts&&S._pendingConflicts[f.id+'_'+df.id];
    // Groepsstructuur (Fase 2): op groepsniveau (geen actieve entiteit) zijn geaggregeerde velden
    // read-only — automatisch berekend uit de entiteiten, niet handmatig te overschrijven.
    var isGeaggregeerdInGroep=!S._actieveEntiteit&&S._entiteiten&&S._entiteiten.length&&isGeaggregeerdVeld(f.id,df.id);
    var toontGroepsniveauBadge=df.groepsniveau&&S._actieveEntiteit&&S._entiteiten&&S._entiteiten.length;
    dataHtml+='<div>';
    if(isRO){
      var roFragTitle=veldBronInfo&&veldBronInfo.bron_fragment?(' title="Uit het document: &quot;'+esc(veldBronInfo.bron_fragment)+'&quot;"'):'';
      dataHtml+='<div class="f"><label>'+df.label+reqLabel(df)+(df.doc?' &#128196;':'')+'</label>'
        +'<div class="readonly-val'+(val?'':' empty')+'">'+(val?esc(val):'Niet ingevuld')+(ref?'<span style="color:var(--gold);font-size:11px;margin-left:8px;cursor:help"'+roFragTitle+'>&#128196; '+esc(ref)+'</span>':'')+'</div></div>';
    }else if(isGeaggregeerdInGroep){
      dataHtml+='<div class="f"><label>'+df.label+reqLabel(df)+' <span style="color:var(--teal);font-size:9px;font-weight:600">&#128279; som van entiteiten</span></label>'
        +'<div class="readonly-val" style="background:var(--teal-bg);border-color:var(--teal-dark)" title="Automatisch berekend uit de geregistreerde entiteiten — vóór eliminatie van onderlinge transacties. Wijzig per entiteit via de kiezer hierboven.">'+(val?esc(val):'Nog geen entiteitsdata')+'</div></div>';
    }else{
      var conflictStyle=hasConflict?'border-color:var(--gold);background:var(--gold-bg)':'';
      var conflictTitle=hasConflict?(' title="Document zegt: '+esc(hasConflict)+'"'):'';
      // Herkomst tonen zodra AI het veld daadwerkelijk heeft ingevuld (niet alleen "kan uit een
      // document komen" — df.doc/"ref" hierboven is alleen die generieke capaciteits-indicator).
      // bron_fragment (letterlijk citaat uit het brondocument) is alleen gekoppeld voor de
      // belangrijkste financiële cijfervelden — zie setIfEmpty/applyOrConflict-aanroepen.
      var bronFragTitle=veldBronInfo&&veldBronInfo.bron_fragment?('Uit het document: &quot;'+esc(veldBronInfo.bron_fragment)+'&quot;'):'Automatisch ingevuld uit dit document — controleer de waarde.';
      var bronTag=(val&&ref)?' <span style="color:var(--gold-dark);font-size:9px;font-weight:600;cursor:help" title="'+bronFragTitle+'">&#128196; uit: '+esc(ref)+(veldBronInfo&&veldBronInfo.bron_fragment?' &#128172;':'')+'</span>':'';
      // Audit-fix P2 (25 juli 2026, vierde ronde, Marcels keuze: hint tonen, nooit automatisch
      // overschrijven — ebitdaNorm blijft een bewust door de begeleider gevalideerd veld): waarschuw
      // niet-blokkerend als het ingevulde bedrag afwijkt van ebitda + normalisatie, voor het geval dat
      // per ongeluk vergeten is de genormaliseerde EBITDA opnieuw te berekenen na een wijziging.
      var ebitdaNormHint='';
      if(f.id==='financieel'&&df.id==='ebitdaNorm'&&val){
        var ebnBasis=(df.groepsniveau?S._groepData:S.data);
        var ebnRuw=ebnBasis[f.id+'_ebitda'], ebnPost=ebnBasis[f.id+'_normalisatie'];
        if(ebnRuw&&ebnPost){
          var ebnVerwacht=parseGeld(ebnRuw)+parseGeld(ebnPost);
          if(Math.abs(parseGeld(val)-ebnVerwacht)>1){
            ebitdaNormHint='<div style="font-size:11px;color:var(--gold-dark);background:var(--gold-bg);border:1px solid var(--gold);border-radius:4px;padding:4px 8px;margin-top:4px">&#9888; Wijkt af van EBITDA + normalisatie ('+fmtGeld(ebnVerwacht)+') — controleer of dit bewust is.</div>';
          }
        }
      }
      dataHtml+='<div class="f"><label>'+df.label+reqLabel(df)+(df.doc?' <span style="color:var(--gold);font-size:9px">&#128196; ref</span>':'')+bronTag
        +(hasConflict?' <span style="color:var(--gold);font-size:9px;font-weight:600" title="Document geeft andere waarde: '+esc(hasConflict)+'">&#9888; afwijking</span>':'')
        +(toontGroepsniveauBadge?' <span style="color:var(--muted);font-size:9px;font-weight:600" title="Dit veld geldt voor de hele groep, niet alleen voor de geselecteerde entiteit — wijzigingen gelden overal.">&#128279; geldt voor hele groep</span>':'')+'</label>'
        +'<input type="text" id="df_'+df.id+'" value="'+esc(val)+'" placeholder="'+esc(df.ph)+'" class="'+(missing?'missing':'')+'" style="'+conflictStyle+'"'+conflictTitle+' oninput="userEdit(this)">'+ebitdaNormHint+'</div>';
    }
    dataHtml+='</div>';
  });
  dataHtml+='</div>'+(S.showValidation&&getMissing().find(function(m){return m.fase.startsWith(f.num);})
    ?'<div style="font-size:12px;color:var(--red);margin-top:.5rem">&#9888; Vul alle als <span class="req-tag">verplicht</span> gemarkeerde velden in voor een volledig beeld.</div>':'')+'</div>';

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
  if(isTussen()||(!isVerkoper()&&!isKoper())){
    var chkHtml='<div class="panel"><div class="sec-hdr">Checklist (intern)</div>';
    f.items.forEach(function(item,i){var key=f.id+'_'+i;var on=!!S.checked[key];chkHtml+='<div class="chk-item'+(on?' on':'')+'" data-key="'+key+'"'+(isKoper()?' style="cursor:default"':'')+'><div class="chk-box">'+(on?'&#10003;':'')+'</div><div class="chk-lbl">'+item+'</div></div>';});
    chkHtml+='<div class="sec-hdr" style="margin-top:1rem;color:var(--red)">Rode vlaggen &mdash; gesignaleerd?</div>';
    f.redflags.forEach(function(rf,i){var key=f.id+'_rf_'+i;var on=!!S.checked[key];chkHtml+='<div class="chk-item rf'+(on?' on':'')+'" data-key="'+key+'"'+(isKoper()?' style="cursor:default"':'')+'><div class="chk-box">'+(on?'&#10003;':'')+'</div><div class="chk-lbl">'+rf+'</div></div>';});
    chkHtml+='</div>';
    // Keuzelog: toon gemaakte keuzes bij conflicten voor deze fase
    var faseChoices=(S._choiceLog||[]).filter(function(c){return c.key.startsWith(f.id+'_');});
    var choiceLogHtml='';
    if(faseChoices.length){
      choiceLogHtml='<div style="margin-top:.75rem;padding:.6rem .75rem;background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);font-size:11px">'
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
    extraHtml+=chkHtml+notHtml+aiHtml;
  }

  // Q&A module (koper stelt vragen of tegenvoorstellen, begeleider beantwoordt — iedereen ziet antwoorden)
  // 23 aug 2026: module-vinkje 'qa' in marilyn had tot nu toe geen client- of server-gate — nu
  // beide toegevoegd (zelfde patroon als Contracten/AI-analyse).
  var qaModuleAan=!S.modules||S.modules.qa!==false;
  if(qaModuleAan&&(isKoper()||isTussen())){
    extraHtml+='<div class="panel" style="border-color:var(--gold)" id="qa-panel-'+f.id+'">'
      +'<div class="sec-hdr" style="color:var(--gold)">&#10067; Q&A — vragen, voorstellen &amp; antwoorden</div>'
      +'<div id="qa-lijst-'+f.id+'" style="margin-bottom:1rem"><div style="font-size:12px;color:var(--muted);font-style:italic">Laden...</div></div>'
      +(isKoper()?'<div style="border-top:1px solid var(--border);padding-top:.75rem;margin-top:.5rem">'
        +'<div style="font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem">Nieuw bericht</div>'
        +'<div style="display:flex;gap:14px;margin-bottom:.5rem">'
        +'<label style="font-size:12px;color:var(--sub);display:flex;align-items:center;gap:5px;cursor:pointer"><input type="radio" name="qa-type-'+f.id+'" value="vraag" checked> Vraag</label>'
        +'<label style="font-size:12px;color:var(--sub);display:flex;align-items:center;gap:5px;cursor:pointer"><input type="radio" name="qa-type-'+f.id+'" value="voorstel"> Tegenvoorstel</label>'
        +'</div>'
        +'<input type="text" id="qa-bedrag-'+f.id+'" style="display:none;width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px;font-family:IBM Plex Mono,monospace;font-size:13px;color:var(--sub);outline:none;margin-bottom:.5rem" placeholder="Bedrag van uw tegenvoorstel">'
        +'<textarea id="qa-input-'+f.id+'" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px;font-family:IBM Plex Sans,sans-serif;font-size:13px;color:var(--sub);resize:vertical;min-height:70px;outline:none" placeholder="Typ uw vraag over deze fase..."></textarea>'
        +'<div style="display:flex;justify-content:flex-end;margin-top:.5rem">'
        +'<button id="qa-btn-'+f.id+'" class="btn btn-sm" style="background:var(--gold);font-size:12px">Versturen</button>'
        +'</div></div>':'')
      +'</div>';
  }
  var nav='<div class="fase-nav">'
    +(isVerkoper()?'<button class="btn-ghost btn-sm" id="cover-btn">&#128196; Cover letter</button>':'')
    +(isKoper()?'<button class="btn-ghost btn-sm" id="cover-btn">&#8592; Terug naar overzicht</button>':'')
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
    +'<button class="btn-ghost btn-sm" onclick="S.screen=\'handleiding\';renderApp()">&#128214; Handleiding</button>'
    +'<button class="btn-ghost btn-sm" onclick="window.print()">PDF</button>'
    +'</div></div>'
    +lockedBanner
    // Juridische documenten (19 aug 2026, op verzoek Marcel: NDA/LoI/etc. waren voor verkoper/koper
    // alleen zichtbaar op het openingsscherm (renderCover, S.screen='cover'), dat na de eerste keer
    // inloggen niet meer bezocht wordt — dus feitelijk onvindbaar tijdens het reguliere invullen.
    // laadPartijDocs() bestond al (met rolfilter + Signhost-status + dataroom-koppeling) en wordt nu
    // ook hier aangeroepen, zelfde #partij-docs-sectie-element, geen nieuwe logica.
    +((isVerkoper()||isKoper())?('<div class="panel" id="pd-panel" style="margin-bottom:1rem;padding:0">'
      +'<div id="pd-toggle-hdr" tabindex="0" role="button" aria-expanded="true" aria-controls="pd-body" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem">'
      +'<span style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">&#128196; Juridische documenten</span>'
      +'<span id="pd-chevron" style="font-size:12px;color:var(--muted)">&#9650;</span>'
      +'</div><div id="pd-body" style="display:block;padding:0 1rem 1rem"><div id="partij-docs-sectie">Laden...</div></div></div>'):'')
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">'+esc(S.traject&&S.traject.kantoor_naam||'')+'</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1rem">Verplichte velden ingevuld: <span style="font-family:IBM Plex Mono,monospace;font-weight:600;color:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'">'+tp+'%</span><span style="font-size:11px;color:var(--muted);margin-left:6px">(alle 7 fases)</span></div>'
    +'<div class="prog-bar"><div class="prog-fill" style="width:'+tp+'%;background:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'"></div></div>'
    +ov
    +'<div style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:.2rem">'+f.num+'. '+f.title+'</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:'+(isVerkoper()&&VERKOPER_FASE_INTRO[f.id]?'.5rem':'1.25rem')+'">'+f.desc+'</div>'
    +(isVerkoper()&&VERKOPER_FASE_INTRO[f.id]?'<div style="font-size:12px;color:var(--sub);line-height:1.6;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;margin-bottom:1.25rem">'+esc(VERKOPER_FASE_INTRO[f.id])+'</div>':'')
    +'<div class="data-grid-sidebar">'+dataHtml+renderDocumentSectie(f.id)+renderBankmutatiesSectie(f.id)+'</div>'
    +extraHtml+nav+'</div>';
}

// Compact overzicht "hoe ver staat elk onderdeel" op het samenvattingsscherm — anders is alleen
// het groepspercentage zichtbaar en moet je per entiteit apart het invulscherm openen om te zien
// hoe ver dat onderdeel staat (Marcel, juli 2026).
function entiteitOverzichtHtml(){
  var lijst=entiteitFillOverzicht();
  if(!lijst.length)return '';
  var kleur=function(p){return p===100?'var(--teal)':p>50?'var(--gold)':'var(--red)';};
  var rijen=lijst.map(function(r){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--border)">'
      +'<span style="font-size:12px;color:'+(r.id?'var(--sub)':'var(--head)')+';font-weight:'+(r.id?'400':'600')+'">'+esc(r.naam)+'</span>'
      +'<span style="font-family:IBM Plex Mono,monospace;font-size:12px;font-weight:600;color:'+kleur(r.pct)+'">'+r.pct+'%</span>'
      +'</div>';
  }).join('');
  return '<div class="panel" style="margin-bottom:1.5rem;padding:0">'
    +'<div style="padding:.75rem 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);border-bottom:1px solid var(--border)">Invulling per onderdeel</div>'
    +rijen
    +'</div>';
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
    // Fix 5 aug 2026: punten zijn NL-duizendtal-scheiding, nooit decimaal — eerst verwijderen.
    var n=String(v).replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');
    var parsed=parseFloat(n);
    return isNaN(parsed)?null:parsed;
  }

  var o1=parseGeldCheck(S.data['financieel_omzet1']);
  var o2=parseGeldCheck(S.data['financieel_omzet2']);
  var o3=parseGeldCheck(S.data['financieel_omzet3']);
  var ebitdaAbs=parseGeldCheck(S.data['financieel_ebitda']);
  var ebitdaMarge=parseGeldCheck(S.data['financieel_ebitdaMarge']);
  // Sectorafhankelijk (21 aug 2026, live-testbug): accountancy/zorg noemen dit 'partnerBel', mkb
  // gebruikt 'dgaSalaris', itsoftware kent dit concept niet — zie getEigenaarBeloningsVeld() in
  // mna/01-config-sectorprofielen.js. Voorheen hardcoded op 'financieel_partnerBel' met de tekst
  // "Partnerbeloning", waardoor mkb/itsoftware-trajecten altijd bleven vastlopen op een veld dat
  // voor die sector nooit bestond, en zorg/mkb de verkeerde term ("partner" i.p.v. "eigenaar") zagen.
  var eigBelVeld=getEigenaarBeloningsVeld();
  var partnerBel=eigBelVeld?parseGeldCheck(S.data['financieel_'+eigBelVeld.veldId]):null;
  var eigBelLabel=eigBelVeld?eigBelVeld.label:'Eigenaar-/partnerbeloning';

  // 1. Ontbrekende kritieke financiële velden
  if(!o1||!o2||!o3) kritiekeDiscrepanties.push('Jaaromzet voor alle drie jaren is verplicht voor een indicatieve waardering. Vul omzet jaar 1, 2 en 3 in.');
  if(!ebitdaAbs&&!ebitdaMarge) kritiekeDiscrepanties.push('EBITDA ontbreekt volledig (zowel absoluut als marge). Dit is de basis voor de waarderingsberekening.');
  // Alleen verplicht stellen als deze sector het concept ook daadwerkelijk kent (itsoftware: nooit).
  if(eigBelVeld&&!partnerBel) kritiekeDiscrepanties.push(eigBelLabel+' ontbreekt. Zonder dit gegeven kan de EBITDA niet genormaliseerd worden.');

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
      eigBelLabel+' ('+partnerBel.toLocaleString('nl-NL')+') is hoger dan EBITDA absoluut ('+ebitdaAbs.toLocaleString('nl-NL')+'). '
      +'Dit leidt tot een negatieve genormaliseerde EBITDA en maakt waardering onmogelijk. Controleer de invoer.'
    );
  }

  var heeftKritiek=kritiekeDiscrepanties.length>0;
  // ── EINDE CHECK ─────────────────────────────────────────────────────────

  // Summary cards
  var cards='';
  FASES.forEach(function(f){
    var p=(isVerkoper()||isKoper())?fillPct(f.id):pct(f.id);
    var dataRows='';
    f.dataFields.forEach(function(df){var v=S.data[f.id+'_'+df.id];var r=S.docRefs[f.id+'_'+df.id];if(v)dataRows+='<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">'+df.label+(df.req?' *':'')+'</span><span style="font-family:IBM Plex Mono,monospace;font-size:11px">'+esc(v)+(r?' <span style="color:var(--gold)">&#128196;'+esc(r)+'</span>':'')+'</span></div>';else if(df.req)dataRows+='<div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border);color:var(--red)">&#9888; '+df.label+': niet ingevuld</div>';});
    var rfHits=f.redflags.filter(function(_,i){return S.checked[f.id+'_rf_'+i];});
    cards+='<div class="panel" style="border-color:'+(p===100?'var(--teal)':'var(--border)')+'"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;display:flex;justify-content:space-between"><span>'+(isVerkoper()?'':f.num+'. ')+f.title+'</span><span style="color:'+(p===100?'var(--teal)':p>50?'var(--gold)':'var(--red)')+'">'+p+'%</span></div>'
      +dataRows+(rfHits.length&&!isVerkoper()&&!isKoper()?'<div style="margin-top:.4rem">'+rfHits.map(function(rf){return '<div style="font-size:11px;color:var(--red)">&#9888; '+rf+'</div>';}).join('')+'</div>':'')
      +(S.notities[f.id]&&!isVerkoper()&&!isKoper()?'<div style="font-size:11px;color:var(--mid);margin-top:.35rem;font-style:italic">'+esc(S.notities[f.id].substring(0,120))+'</div>':'')
      +'</div>';
  });

  // Missing fields block
  var missingHtml='';
  if(missing.length&&isVerkoper()){
    missingHtml='<div class="panel" id="dd-missing-velden" style="border-color:var(--red)">'
      +'<div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:.75rem">&#9888; Nog '+missing.reduce(function(a,m){return a+m.fields.length;},0)+' verplichte velden niet ingevuld</div>';
    missing.forEach(function(m){
      missingHtml+='<div style="margin-bottom:.6rem"><div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:.2rem">'+esc(m.fase)+'</div>';
      m.fields.forEach(function(field){
        missingHtml+='<div style="font-size:12px;color:var(--red);padding:2px 0 2px .75rem;display:flex;align-items:center;justify-content:space-between;gap:8px">'
          +'<span>&#8212; '+esc(field.label)+'</span>'
          +'<button class="missing-veld-link" data-fase-idx="'+m.faseIdx+'" data-veld-id="'+field.id+'" style="font-size:11px;color:var(--teal);background:none;border:none;cursor:pointer;text-decoration:underline;flex-shrink:0;padding:0">Ga naar veld &#8594;</button>'
          +'</div>';
      });
      missingHtml+='</div>';
    });
    missingHtml+='</div>';
  }

  var tp=(isVerkoper()||isKoper())?totalFillPct():Math.round(FASES.reduce(function(a,f){return a+pct(f.id);},0)/FASES.length);
  return '<div class="wrap anim">'
    +'<div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; M&amp;A'+versieLabel()+'</div>'
    +'<div style="display:flex;gap:8px"><button class="btn-ghost btn-sm" onclick="window.print()">PDF</button><button class="btn-ghost btn-sm" id="back-main">&#8592; Terug</button></div></div>'
    +(vergrendeld?'<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--red)">&#128274; Vergrendeld op '+(S.traject.vergrendeld_op?new Date(S.traject.vergrendeld_op).toLocaleString('nl-NL'):'')+'</div>':'')
    +'<div style="font-family:Playfair Display,serif;font-size:1.4rem;color:var(--head);font-weight:600;margin-bottom:.25rem">DD Samenvatting</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem">'+esc(S.traject&&S.traject.kantoor_naam||S.code)+' &middot; '+new Date().toLocaleDateString('nl-NL',{day:'2-digit',month:'long',year:'numeric'})+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1.5rem">'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:'+(tp===100?'var(--teal)':tp>50?'var(--gold)':'var(--red)')+'">'+tp+'%</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">'+((isVerkoper()||isKoper())?'Ingevuld':'Checklist')+'</div></div>'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:var(--teal)">'+completeFases.length+'</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">Fasen compleet</div></div>'
    +'<div class="panel" style="text-align:center;padding:1rem"><div style="font-family:Playfair Display,serif;font-size:1.8rem;font-weight:600;color:var(--red)">'+missing.reduce(function(a,m){return a+m.fields.length;},0)+'</div><div style="font-size:10px;text-transform:uppercase;color:var(--muted)">Velden ontbreken</div></div>'
    +'</div>'
    +entiteitOverzichtHtml()
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
        return '<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.75rem 1rem;display:flex;gap:10px">'
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
            } else if(missing.length){
              var aantalOpen=missing.reduce(function(a,m){return a+m.fields.length;},0);
              html+='<div style="font-size:12px;color:var(--red);padding:.5rem .75rem;background:var(--red-bg);border-radius:var(--r);margin-bottom:.75rem">'
                +'&#9888; Nog '+aantalOpen+' verplichte veld(en) niet ingevuld — vul deze eerst aan voordat u het dossier kunt vrijgeven. '
                +'Niet alle velden zijn automatisch uit documenten af te leiden.'
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

  var prompt='Je bent een M&A-adviseur die beoordeelt of de basisinformatie klopt voor een indicatieve waardering. '+TAAL_REGELS+'\n\n'
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
  var prompt='Je bent ' + esc(S.traject&&S.traject.begeleider_naam||BRAND.contactpersoon) + ', senior M&A-adviseur. '+TAAL_REGELS+' Sector: '+sectorLabel+'. Traject: '+esc(S.traject&&S.traject.traject_type||'M&A')+' voor "'+esc(S.traject&&S.traject.kantoor_naam||S.code)+'".\n\nSECTOR NORMEN:\n'+sectorNormen+'\n\nFASE: '+f.title+'\n\nINGEVOERDE DATA:\n'+(dataLines.join('\n')||'Geen data')+'\n\nCHECKLIST:\nGereed: '+(chk.join(', ')||'niets')+'\nOpen: '+(open.join(', ')||'alles gereed')+'\n\nRODE VLAGGEN: '+(rfs.join(', ')||'geen')+'\n\nNOTITIES: '+(S.notities[faseId]||'geen')+'\n\nGeef beknopt strategisch advies voor deze sector. Analyseer de cijfers expliciet en vergelijk met de sectorgemiddelden hierboven. Bespreek: voortgang en prioriteiten, urgente openstaande punten, impact rode vlaggen, concrete vervolgstappen. Schrijf in ik-vorm. Gebruik ## koppen. Geen tabellen of bullets.';
  try{
    var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    var reader=resp.body.getReader();var dec=new TextDecoder();var collected='';
    while(true){var res=await reader.read();if(res.done)break;dec.decode(res.value,{stream:true}).split('\n').forEach(function(line){if(line.startsWith('data:')){var d=line.slice(5).trim();if(d==='[DONE]')return;try{var j=JSON.parse(d);if(j.type==='content_block_delta'&&j.delta&&j.delta.text)collected+=j.delta.text;}catch(e){}}});}
    S.aiTexts[faseId]=collected;
  }catch(e){S.aiTexts[faseId]='__ERROR__';}
  S.aiLoading[faseId]=false;renderApp();
}

// Herkent de interne opslagmarkering van een eigen-PDF-upload (bijv. '[EIGEN PDF GEÜPLOAD: bestand.pdf]').
// Als deze in een documenttekst voorkomt zonder bijbehorende docId, is het bestand zelf niet
// teruggevonden — dan mag deze marker nooit als was het de echte inhoud getoond worden.
function eigenUploadTekst(tekst){
  var m=/^\[EIGEN PDF GEÜPLOAD:\s*(.+)\]$/.exec((tekst||'').trim());
  return m?m[1]:null;
}
function docNietBeschikbaarHtml(bestandsnaam){
  return '<div style="padding:1rem;background:var(--red-bg);border:1px solid var(--red);border-radius:8px;color:var(--red);font-size:13px;line-height:1.6">Dit document ('+esc(bestandsnaam)+') is als eigen bestand geüpload, maar kan hier niet worden getoond — de koppeling naar het bestand ontbreekt. Neem contact op met uw adviseur voor een nieuwe versie.</div>';
}

// Huisstijlkleur van een adviseur vervangt site-breed --teal (zie het gebruik hieronder bij
// d.branding.kleur) — die kleur wordt zowel als KNOP-achtergrond (met wit erop) als los als TEKST/
// badge-kleur op de paginakleur gebruikt. Een kleur die prima is als knop kan als tekst op een
// donkere pagina volledig onleesbaar zijn (gevonden 24 juli 2026: eigen testkleur #371a7a). Deze
// helper meet het daadwerkelijke contrast (WCAG-relatieve-luminantie, zelfde methode als de browser
// zelf gebruikt) tegen de paginakleur van het ACTIEVE thema, en mengt de kleur zo nodig naar wit
// (donker thema) of zwart (licht thema) totdat er minimaal 4.5:1 contrast is — de door de adviseur
// gekozen kleur blijft ongewijzigd zolang die al leesbaar genoeg is.
function contrastveiligeHuisstijlkleur(hex){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
  function relLuminantie(h){
    var r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
    function lin(c){return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  }
  function mengNaar(h,doel,pct){
    var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
    var dr=parseInt(doel.slice(1,3),16),dg=parseInt(doel.slice(3,5),16),db=parseInt(doel.slice(5,7),16);
    var nr=Math.round(r+(dr-r)*pct),ng=Math.round(g+(dg-g)*pct),nb=Math.round(b+(db-b)*pct);
    return '#'+[nr,ng,nb].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
  }
  var donker=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var achtergrondLum=relLuminantie(donker?'#1b1a17':'#faf9f6');
  var doelKleur=donker?'#ffffff':'#000000';
  var resultaat=hex;
  for(var pct=0;pct<=1;pct+=0.1){
    var test=pct===0?hex:mengNaar(hex,doelKleur,pct);
    var l1=relLuminantie(test);
    var contrast=(Math.max(l1,achtergrondLum)+0.05)/(Math.min(l1,achtergrondLum)+0.05);
    if(contrast>=4.5){resultaat=test;break;}
    resultaat=test;
  }
  return resultaat;
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
        // Bugfix 19 aug 2026 (KRITIEK, cross-path-informatielek-audit F5): CHAT stond hier niet in de
        // reset, ondanks dat deze regel expliciet "geen datalek tussen trajecten" claimt — zie
        // dezelfde fix in uitloggen() (mna/02-state-opslag-documenten.js) voor de volledige toelichting.
        if(typeof CHAT!=='undefined'){CHAT.berichten=[];CHAT.serverBerichten=[];CHAT.open=false;CHAT.laden=false;CHAT.sturen=false;}
        S={screen:'cover',code:code,rol:d.rol||'verkoper',traject:d.traject,modules:d.modules||null,_ivSelectie1:null,_ivSelectie2:null,
          fase:0,checked:{},data:{},docRefs:{},notities:{},aiTexts:{},aiLoading:{},
          saveTimer:null,showValidation:false,dataroomLoading:false,dataroom:null,
          _opy:{},_epy:{},_opySlotJaar:{},_conflicts:[],_userEdited:{},_docSource:{},_docFragment:{},koperReacties:{},loiTekst:'',loiDatum:0,
          dataPerEntiteit:{},_actieveEntiteit:null,_entiteiten:[]};
        // Groepsstructuur (Fase 2): S is hierboven volledig herbouwd — de groepsdata-alias opnieuw
        // vastzetten vóórdat loadDataFromDB hieronder de opgehaalde rijen erin gaat wegschrijven.
        S._groepData=S.data;
        // Sessie starten + audit log
        SEC.attempts = 0;
        secStartSession();
        secAuditLog('login', { kantoor: d.traject && d.traject.kantoor_naam });
        // Laad infoverzoek selectie voor veldfiltering — beide fases apart (kv_store bewaart ze onder
        // een eigen sleutel per fase, zie /mna/infoverzoek/opslaan). Was hardcoded op fase '1', waardoor
        // een post-LoI-informatieverzoek (fase 2) hier nooit werd opgehaald (Marcel, 21 aug 2026).
        if(d.rol==='verkoper'){
          fetch(WORKER+'/mna/infoverzoek/'+code+'/1').then(function(r){return r.json();}).then(function(sel){
            S._ivSelectie1 = sel;
          }).catch(function(){});
          fetch(WORKER+'/mna/infoverzoek/'+code+'/2').then(function(r){return r.json();}).then(function(sel){
            S._ivSelectie2 = sel;
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
            var tealVeilig=contrastveiligeHuisstijlkleur(d.branding.kleur);
            document.documentElement.style.setProperty('--teal',tealVeilig);
            document.documentElement.style.setProperty('--teal-bg',tealVeilig+'1a');
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
        // Rechtstreeks naar de handleiding als de URL dat vraagt (bijv. vanuit de uitnodigingsmail:
        // mna.html?code=XXXX&screen=handleiding) — alleen bij een geldige, net ingelogde sessie.
        var schermOverride=new URLSearchParams(location.search).get('screen');
        if(isTussen()){
          S._bgKey=code;S.screen=(schermOverride==='handleiding')?'handleiding':'begeleider';
          checkVOK(code).then(function(vokStatus){
            // Ook opnieuw tonen als er een nieuwere versie is dan wat eerder getekend is —
            // anders wordt een tekstwijziging (bv. bewaartermijn) nooit meer voorgelegd.
            if(!vokStatus.getekend||vokStatus.versie!==VOK_VERSIE){ toonVOKPopup(code, function(){ renderApp(); }); }
            else { renderApp(); }
          }).catch(function(){ renderApp(); });
          return; // renderApp wordt via checkVOK afgehandeld
        }
        syncDocVeldenVanTraject(d);
        // Verkoper: fase 1 volledig afgerond én LoI getekend (fase 2 ontgrendeld) → direct naar het
        // invoerscherm i.p.v. opnieuw bij de cover-brief te beginnen. Terug naar fase 1/cover kan
        // altijd via de "Cover letter"-knop, die blijft gewoon staan.
        if(isVerkoper()&&loiIsGetekend()&&fase1Compleet()){
          S.screen='main';
          var eersteOpenFase=FASES.findIndex(function(f){
            return f.dataFields.some(function(df){return df.req&&!df.header&&df.fase==='2'&&!(S.data[f.id+'_'+df.id]||'').trim();});
          });
          S.fase=eersteOpenFase>=0?eersteOpenFase:0;
          var fId2=FASES[S.fase]&&FASES[S.fase].id;
          if(fId2&&!DOCS[fId2])loadDocsForFase(fId2);
          if(fId2==='financieel'&&BANKMUTATIES===null)laadBankmutaties();
          if(fId2==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();
        }
        if(schermOverride==='handleiding')S.screen='handleiding';
        // Verplicht openingsscherm (punt #29, 26 juli 2026): alleen voor nieuwe trajecten
        // (opening_voltooid komt uit de backend, bestaande trajecten staan al op 1 via de
        // eenmalige migratie) — overschrijft bewust elke andere schermkeuze hierboven, inclusief
        // de fase-2-doorstart en de handleiding-URL-override.
        if(isVerkoper()&&d.traject&&d.traject.opening_voltooid!==1){S.screen='opening';}
        renderApp();
      }catch(e){if(err)err.style.display='block';if(load)load.style.display='none';lb.disabled=false;}
    };
    var cf=ge('l-code');
    if(cf){cf.oninput=function(){this.value=this.value.toUpperCase();};cf.onkeydown=function(e){if(e.key==='Enter')lb.click();};}
  }
  bindOpeningScreen();
  var toMain=ge('to-main-btn');if(toMain)toMain.onclick=function(){S.screen='main';var fId=FASES[S.fase]&&FASES[S.fase].id;if(fId&&!DOCS[fId])loadDocsForFase(fId);if(fId==='financieel'&&BANKMUTATIES===null)laadBankmutaties();if(fId==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();renderApp();};
  var toMain2=ge('to-main-btn2');if(toMain2)toMain2.onclick=function(){S.screen='main';var fId=FASES[S.fase]&&FASES[S.fase].id;if(fId&&!DOCS[fId])loadDocsForFase(fId);if(fId==='financieel'&&BANKMUTATIES===null)laadBankmutaties();if(fId==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();renderApp();};
  var toWrd=ge('to-waardering-btn');if(toWrd)toWrd.onclick=function(){S.screen='waardering';renderApp();};
  var toWrd2=ge('to-waardering-btn2');if(toWrd2)toWrd2.onclick=function(){S.screen='waardering';renderApp();};
  var toDataroom2=ge('to-dataroom-btn2');if(toDataroom2)toDataroom2.onclick=function(){S.screen='dataroom';loadDataroom();};
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
    var box=document.createElement('div');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','loi-lees-titel');box.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:700px;width:100%;max-height:90vh;overflow-y:auto';
    var loiEigen=eigenUploadTekst(S.loiTekst);
    box.innerHTML='<div id="loi-lees-titel" style="font-family:Playfair Display,serif;font-size:1.2rem;font-weight:600;color:var(--head);margin-bottom:1rem">Letter of Intent</div>'
      +(loiEigen?docNietBeschikbaarHtml(loiEigen):'<div style="font-family:Georgia,serif;font-size:13px;line-height:1.9;color:var(--sub);white-space:pre-wrap">'+esc(S.loiTekst)+'</div>')
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

  var bemTeken=ge('bem-teken-btn');
  if(bemTeken)bemTeken.onclick=async function(){
    var naam=prompt('Voer uw volledige naam in ter bevestiging van akkoord:');
    if(!naam||!naam.trim())return;
    if(!confirm('U gaat akkoord met de Bemiddelingsovereenkomst namens '+naam.trim()+'. Bevestigen?'))return;
    try{
      var r=await fetch(WORKER+'/mna/teken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,document:'bem',naam:naam.trim()})});
      var d=await r.json();
      if(d.ok){S.bemGetekend=naam.trim();renderApp();toast('Bemiddelingsovereenkomst getekend. De adviseur is op de hoogte gesteld.','ok');}
      else toast('Fout: '+(d.error||'onbekend'),'err');
    }catch(e){toast('Verbindingsfout.','err');}
  };

  var bemLees=ge('bem-lees-btn2');
  if(bemLees)bemLees.onclick=function(){
    var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var box=document.createElement('div');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','bem-lees-titel');box.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:700px;width:100%;max-height:90vh;overflow-y:auto';
    var bemEigen=eigenUploadTekst(S.bemTekst);
    box.innerHTML='<div id="bem-lees-titel" style="font-family:Playfair Display,serif;font-size:1.2rem;font-weight:600;color:var(--head);margin-bottom:1rem">Bemiddelingsovereenkomst</div>'
      +(bemEigen?docNietBeschikbaarHtml(bemEigen):'<div style="font-family:Georgia,serif;font-size:13px;line-height:1.9;color:var(--sub);white-space:pre-wrap">'+esc(S.bemTekst)+'</div>')
      +'<div style="display:flex;justify-content:flex-end;margin-top:1.25rem"><button style="background:transparent;border:1px solid #c8c5bc;border-radius:6px;padding:8px 18px;cursor:pointer;font-size:13px" id="bem-sluit">Sluiten</button></div>';
    ov.appendChild(box);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('bem-sluit').addEventListener('click',function(){document.body.removeChild(ov);});
  };

  var teaserVerkBtn=ge('teaser-verk-btn');
  if(teaserVerkBtn)teaserVerkBtn.onclick=function(){
    var out=ge('teaser-verk-out');if(!out)return;
    out.style.display='block';
    function renderTeaserVerk(tekst){
      out.innerHTML='<textarea id="teaser-verk-txt" rows="8" style="width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--r);font-family:\'IBM Plex Sans\',sans-serif;font-size:13px;padding:9px 11px;color:var(--sub);resize:vertical;outline:none">'+esc(tekst||'')+'</textarea>'
        +'<div style="font-size:11px;color:var(--muted);margin-top:6px">Anoniem, max. ~150 woorden, geen bedrijfsnaam. Controleer altijd zelf op onbedoeld identificerende details vóór verspreiding.</div>'
        +'<div style="display:flex;gap:8px;margin-top:.75rem"><button class="btn" id="teaser-verk-opslaan" style="background:var(--teal)">Opslaan</button><button class="btn-outline btn-sm" id="teaser-verk-nieuw">&#8635; Opnieuw genereren</button></div>';
      ge('teaser-verk-opslaan').onclick=async function(){
        var btn=this;btn.disabled=true;btn.textContent='Bezig...';
        var tekstNu=ge('teaser-verk-txt').value;
        var r=await fetch(WORKER+'/mna/teaser/opslaan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,tekst:tekstNu})}).then(function(x){return x.json();}).catch(function(){return{};});
        if(r.ok)toast('Teaser opgeslagen.','ok');else toast(r.error||'Opslaan mislukt.','err');
        btn.disabled=false;btn.textContent='Opslaan';
      };
      ge('teaser-verk-nieuw').onclick=function(){genereerTeaserVerk();};
    }
    async function genereerTeaserVerk(){
      out.innerHTML='<div style="color:var(--muted);font-size:12px">Genereren...</div>';
      var r=await fetch(WORKER+'/mna/teaser/genereer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code})}).then(function(x){return x.json();}).catch(function(){return{};});
      if(r.ok)renderTeaserVerk(r.teaser_tekst);
      else out.innerHTML='<div style="color:var(--red);font-size:12px">'+esc(r.error||'Genereren mislukt.')+'</div>';
    }
    if(S.traject&&S.traject.teaser_tekst)renderTeaserVerk(S.traject.teaser_tekst);else genereerTeaserVerk();
  };

  var ndaLees=ge('nda-lees-btn');
  if(ndaLees)ndaLees.onclick=function(){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    var box=document.createElement('div');
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','nda-lees-titel');
    box.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:700px;width:100%;max-height:90vh;overflow-y:auto';
    var ndaEigen=eigenUploadTekst(S.ndaTekst);
    var ndaHtml=(S.ndaTekst||'').replace(/^# (.+)$/gm,'<h2 style="font-family:Georgia,serif;font-size:1.1rem;margin:1rem 0 .4rem;font-weight:700">$1</h2>').replace(/^## (.+)$/gm,'<h3 style="font-family:Georgia,serif;font-size:.95rem;margin:.9rem 0 .3rem;font-weight:700">$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:.75rem 0">').replace(/\n\n/g,'</p><p style="font-size:13px;line-height:1.9;color:var(--sub);margin:.4rem 0">').replace(/\n/g,'<br>');
    var hdr=document.createElement('div');hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem';
    hdr.innerHTML='<div id="nda-lees-titel" style="font-size:11px;font-weight:600;color:#7c5cbf;letter-spacing:.1em;text-transform:uppercase">Non-Disclosure Agreement</div>';
    var sluit=document.createElement('button');sluit.textContent='Sluiten';sluit.style.cssText='background:transparent;border:1px solid #ddd;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px';
    sluit.onclick=function(){document.body.removeChild(ov);};
    hdr.appendChild(sluit);
    var tekDiv=document.createElement('div');tekDiv.style.cssText='font-family:Georgia,serif;font-size:13px;line-height:1.9;color:var(--sub)';
    tekDiv.innerHTML=ndaEigen?docNietBeschikbaarHtml(ndaEigen):'<p style="font-size:13px;line-height:1.9;color:var(--sub);margin:.4rem 0">'+ndaHtml+'</p>';
    var btns=document.createElement('div');btns.style.cssText='margin-top:1rem;display:flex;gap:8px';
    if(!ndaEigen){
      var printBtn=document.createElement('button');printBtn.textContent='📄 Print / PDF';printBtn.style.cssText='font-size:12px;padding:6px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:transparent';
      printBtn.onclick=function(){ printDoc(S.ndaTekst||'', 'Non-Disclosure Agreement', 'nda'); };
      btns.appendChild(printBtn);
    }
    box.appendChild(hdr);box.appendChild(tekDiv);box.appendChild(btns);
    ov.appendChild(box);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
  };


  var loiPrint=ge('loi-print2-btn');
  if(loiPrint)loiPrint.onclick=function(){ printDoc(S.loiTekst||'','Letter of Intent','loi'); };
  // AI-waarderingsrapport (alleen tussenpersoon) — één bron van waarheid (dvBerekenWaardering),
  // rijker aan indicatoren, server-side bewaard mét cijfer-snapshot en versiegeschiedenis, zodat
  // duidelijk is of een nieuw rapport dezelfde cijfers herformuleert of dat de cijfers zijn gewijzigd.
  var wAiBtn=ge('w-ai-btn');
  function wToonRapport(tekstHtml, ts, versie){
    var out=ge('w-ai-out');if(!out)return;
    out.style.display='block';
    out.innerHTML='<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem">Waarderingsrapport'+(versie?' &middot; versie '+versie:'')+' &middot; gegenereerd '+new Date(ts).toLocaleString('nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</div>'
      +'<div class="ai-body" style="padding:0">'+tekstHtml+'</div>';
  }
  async function wLaadGeschiedenis(){
    var histEl=ge('w-ai-hist');if(!histEl)return;
    try{
      var lijst=await fetch(WORKER+'/mna/versies/'+S.code+'/waarderingsrapport').then(function(r){return r.json();});
      if(!Array.isArray(lijst)||lijst.length<2){histEl.innerHTML='';return;}
      var actueel=dvBerekenWaardering();
      var vorige=lijst.slice(1);
      histEl.innerHTML='<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:1rem 0 .5rem;padding-top:.75rem;border-top:1px solid var(--border)">Eerdere versies ('+vorige.length+')</div>'
        +vorige.map(function(rv){
          var cj={};try{cj=JSON.parse(rv.cijfers_json||'{}');}catch(e){}
          var gewijzigd=cj.wMid&&Math.round(cj.wMid)!==Math.round(actueel.wMid);
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:.5rem .75rem;background:var(--card);border-radius:var(--r);margin-bottom:6px;flex-wrap:wrap">'
            +'<span style="font-size:12px;color:var(--sub)">Versie '+rv.versie+' &middot; '+new Date(rv.created_at).toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'})+' &middot; '+(gewijzigd?'<span style="color:var(--gold-dark);font-weight:600">cijfers zijn sindsdien gewijzigd</span>':'<span style="color:var(--muted)">zelfde cijfers, andere formulering</span>')+'</span>'
            +'<button class="btn-ghost btn-sm" data-vid="'+rv.id+'" style="font-size:11px">Bekijk</button>'
            +'</div>';
        }).join('');
      histEl.querySelectorAll('button[data-vid]').forEach(function(btn){
        btn.addEventListener('click',async function(){
          var origineel=btn.textContent;btn.textContent='Laden...';btn.disabled=true;
          var vd=await fetch(WORKER+'/mna/versie/'+btn.dataset.vid+'?code='+encodeURIComponent(S.code)).then(function(r){return r.json();}).catch(function(){return null;});
          btn.textContent=origineel;btn.disabled=false;
          if(vd&&vd.tekst){
            wToonRapport(vd.tekst, vd.created_at, vd.versie);
            // Bug 5 aug 2026: rapport wordt boven de "Eerdere versies"-lijst getoond, dus zonder
            // scroll leek de klik niets te doen — content veranderde onzichtbaar buiten beeld.
            var outEl=ge('w-ai-out');if(outEl)outEl.scrollIntoView({behavior:'smooth',block:'start'});
          }else{
            toast('Kon deze versie niet laden.','err');
          }
        });
      });
    }catch(e){histEl.innerHTML='';}
  }
  if(wAiBtn)wAiBtn.addEventListener('click',async function(){
    var out=ge('w-ai-out');if(!out)return;
    wAiBtn.disabled=true;wAiBtn.textContent='Genereren...';
    out.style.display='block';
    toast('⚙️ Bezig met genereren: AI-analyse & waardering...','info',4000);
    out.innerHTML='<div style="color:var(--muted);font-size:13px">AI genereert rapport... (kan 20-40 sec duren)</div>';
    var v=dvBerekenWaardering();
    var lijnen=['Omzet jaar 1: '+fmtGeld(v.o1),'Omzet jaar 2: '+fmtGeld(v.o2),'Omzet jaar 3: '+fmtGeld(v.o3)];
    if(v.omzetYTD)lijnen.push('Omzet YTD lopend jaar: '+fmtGeld(v.omzetYTD));
    lijnen.push('EBITDA: '+fmtGeld(v.ebitdaAmt)+' ('+v.ebitdaPct.toFixed(1)+'% van omzet)');
    if(v.partnerBel)lijnen.push((v.partnerBelLabel||'Eigenaar-/partnerbeloning')+': '+fmtGeld(v.partnerBel));
    if(v.recurring)lijnen.push('Recurring omzet: '+v.recurring.toFixed(1)+'%');
    if(v.churn)lijnen.push('Klantverloop (churn): '+v.churn.toFixed(1)+'%');
    if(v.top1pct)lijnen.push('Aandeel grootste klant: '+v.top1pct.toFixed(1)+'%');
    if(v.top10pct)lijnen.push('Aandeel top 10 klanten: '+v.top10pct.toFixed(1)+'%');
    if(v.aantalKlanten)lijnen.push('Aantal klanten: '+Math.round(v.aantalKlanten));
    if(v.fte)lijnen.push('Totaal FTE: '+v.fte);
    if(v.aantalP)lijnen.push('Aantal partners: '+Math.round(v.aantalP));
    if(v.omzetPerP)lijnen.push('Omzet per partner: '+fmtGeld(v.omzetPerP));
    if(v.debiteuren)lijnen.push('Debiteuren: '+fmtGeld(v.debiteuren));
    if(v.wip)lijnen.push('Onderhanden werk: '+fmtGeld(v.wip));
    if(v.declarab)lijnen.push('Declarabiliteit: '+v.declarab.toFixed(1)+'%');
    lijnen.push('Groeitempo (gem. historisch): '+v.gemGroei.toFixed(1)+'%/jaar');
    lijnen.push('Waardering laag ('+v.mLaag+'x EBITDA): '+fmtGeld(v.wLaag));
    lijnen.push('Waardering midden ('+v.mMid+'x EBITDA): '+fmtGeld(v.wMid));
    lijnen.push('Waardering hoog ('+v.mHoog+'x EBITDA): '+fmtGeld(v.wHoog));
    lijnen.push('Omzetmethode ('+v.omzetFactor+'x): '+fmtGeld(v.wOmzet));
    lijnen.push('Koopsom bij closing (indicatief): '+fmtGeld(v.fixedKoop)+', earn-out '+v.earnPct+'% over '+v.earnJaren+' jaar bij '+v.earnTarget+'% omzetgroei/jaar');
    var sectorProfielW=getSectorProfiel();
    var dataSamW='';
    var faseLW={financieel:'Financieel',commercieel:'Klanten',partner:'Partners',compliance:'Compliance',it:'IT',juridisch:'Juridisch',strategisch:'Strategisch'};
    (S._mnaData||[]).forEach(function(row){try{var dj=typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json;var gevuld=Object.values(dj||{}).filter(function(v2){return v2&&v2.value;});if(gevuld.length){dataSamW+='\n## '+(faseLW[row.fase_id]||row.fase_id)+'\n';gevuld.forEach(function(v2){dataSamW+='- '+v2.label+': '+v2.value+'\n';});}}catch(e){}});
    var prompt='Schrijf één samenhangend, professioneel M&A-rapport voor '+esc(S.traject&&S.traject.kantoor_naam||S.code)+' (sector: '+(sectorProfielW.label||'')+') — zowel de due-diligence-analyse als de daarop gebaseerde waardering, als één geheel. '+TAAL_REGELS+'\n\nSECTOR NORMEN: '+(sectorProfielW.aiNormen||'')+'\n\nDUE DILIGENCE DATA:'+dataSamW+'\n\nCIJFERS VOOR DE WAARDERING (uitsluitend deze gebruiken, geen andere bedragen of percentages verzinnen):\n'+lijnen.join('\n')+'\n\nGa expliciet in op wat de cijfers zeggen over de kwaliteit en het risico van de omzet (concentratie, recurring, churn) waar die zijn aangeleverd. De waarderingssectie moet aantoonbaar voortbouwen op de bevindingen uit de due-diligence-sectie (bijv. risicos die de multiple drukken, sterktes die hem rechtvaardigen).\n\nBegin DIRECT met de eerste ## kop hieronder — geen eigen titel, geen bedrijfsnaam als kop, geen horizontale lijnen (---).\n\n## Samenvatting\n## Financieel\n## Sterktes\n## Risicos\n## Waarderingsmethodiek\n## As-is waardering\n## Kwaliteit van de cijfers\n## Groei- en waardepotentieel\n## Transactiestructuur\n## Conclusie en aanbevelingen\n\nGebruik bullets (met -) waar een opsomming duidelijker is dan lopende tekst. Max 800 woorden. In Conclusie en aanbevelingen: presenteer aanbevelingen als overwegingen voor de begeleider om mee te nemen, geen dwingende conclusies.';
    try{
      var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:3600})});
      var rd=await resp.json();
      var ruweTekst=rd.text||(rd.error?('AI fout: '+rd.error):'Fout bij genereren.');
      var tekstHtml=mdToHtml(ruweTekst);
      var snapshot={o1:v.o1,o2:v.o2,o3:v.o3,ebitdaAmt:v.ebitdaAmt,ebitdaPct:v.ebitdaPct,wLaag:v.wLaag,wMid:v.wMid,wHoog:v.wHoog};
      var nu=Date.now();
      var saveResp=await fetch(WORKER+'/mna/waardering/rapport',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,rapport_tekst:tekstHtml,cijfers_json:snapshot})}).then(function(r){return r.json();}).catch(function(){return null;});
      wToonRapport(tekstHtml, nu, saveResp&&saveResp.versie);
      wLaadGeschiedenis();
      wAiBtn.textContent='↻ Opnieuw genereren';wAiBtn.disabled=false;
      toast('✓ AI-analyse & waardering is gegenereerd','ok');
    }catch(e){out.innerHTML='<div style="color:var(--red);font-size:13px">Fout: '+e.message+'</div>';wAiBtn.disabled=false;wAiBtn.textContent='Genereer AI-analyse & waardering';toast('Genereren van AI-analyse & waardering is mislukt','err');}
  });
  // AI-waardering second opinion — onafhankelijke AI-multiple/range, los van de rekenkern hierboven.
  var wAi2Btn=ge('w-ai2-btn');
  if(wAi2Btn)wAi2Btn.addEventListener('click',async function(){
    var out2=ge('w-ai2-out');if(!out2)return;
    wAi2Btn.disabled=true;wAi2Btn.textContent='Genereren...';
    out2.style.display='block';
    toast('⚙️ Bezig met genereren: AI-waardering (second opinion)...','info',4000);
    out2.innerHTML='<div style="color:var(--muted);font-size:13px">AI bepaalt een onafhankelijke waardering... (kan 15-30 sec duren)</div>';
    try{
      var resp2=await fetch(WORKER+'/mna/waardering/genereer',{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code||''},body:JSON.stringify({code:S.code})});
      var rd2=await resp2.json();
      if(!rd2.ok){out2.innerHTML='<div style="color:var(--red);font-size:13px">Fout: '+esc(rd2.error||'onbekende fout')+'</div>';wAi2Btn.disabled=false;wAi2Btn.textContent='&#129302; Genereer AI-waardering (second opinion)';toast('Genereren van AI-waardering is mislukt','err');return;}
      var w2=rd2.waardering||{};
      var sc2=rd2.sanity_check||{waarschuwingen:[]};
      var bronnen2=rd2.benchmark_bronnen||[];
      var html2='';
      if(sc2.waarschuwingen&&sc2.waarschuwingen.length){
        html2+='<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.6rem .85rem;margin-bottom:.85rem;font-size:12px;color:var(--red)">'
          +'<strong>&#9888; Sanity-check geeft '+sc2.waarschuwingen.length+' aandachtspunt(en):</strong>'
          +sc2.waarschuwingen.map(function(w){return '<div style="padding:2px 0">&bull; '+esc(w)+'</div>';}).join('')
          +'</div>';
      }
      html2+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:.75rem">'
        +'<div style="background:var(--card);border-radius:var(--r);padding:.75rem;text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">Laag</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600">'+fmtGeld(w2.range_laag||0)+'</div></div>'
        +'<div style="background:var(--gold-bg);border:1px solid var(--gold);border-radius:var(--r);padding:.75rem;text-align:center"><div style="font-size:10px;color:var(--gold-dark);margin-bottom:.2rem">Midden</div><div style="font-family:IBM Plex Mono,monospace;font-size:14px;font-weight:600;color:var(--gold-dark)">'+fmtGeld(w2.range_midden||0)+'</div></div>'
        +'<div style="background:var(--card);border-radius:var(--r);padding:.75rem;text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:.2rem">Hoog</div><div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600">'+fmtGeld(w2.range_hoog||0)+'</div></div>'
        +'</div>'
        +'<div style="font-size:12px;color:var(--mid);margin-bottom:.5rem"><strong>Methode:</strong> '+esc(w2.methode||'onbekend')+(w2.gehanteerde_multiple?' ('+esc(String(w2.gehanteerde_multiple))+'x)':'')+'</div>'
        +(w2.onderbouwing?'<div style="font-size:12px;color:var(--mid);margin-bottom:.5rem;line-height:1.6"><strong>Onderbouwing:</strong> '+esc(w2.onderbouwing)+'</div>':'')
        +(w2.risicofactoren?'<div style="font-size:12px;color:var(--mid);margin-bottom:.5rem;line-height:1.6"><strong>Risicofactoren:</strong> '+esc(w2.risicofactoren)+'</div>':'');
      if(bronnen2.length){
        html2+='<div style="font-size:11px;color:var(--muted);margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border)"><strong>Benchmarkbronnen gebruikt:</strong>'
          +bronnen2.map(function(b){return '<div style="padding:1px 0">&bull; '+esc(b.sleutel)+': '+esc(String(b.waarde))+' ('+esc(b.bron||'onbekend')+(b.peildatum?', peildatum '+esc(b.peildatum):'')+')</div>';}).join('')
          +'</div>';
      }
      out2.innerHTML=html2;
      wAi2Btn.disabled=false;wAi2Btn.textContent='↻ Opnieuw genereren';
      toast('✓ AI-waardering (second opinion) is gegenereerd','ok');
    }catch(e){out2.innerHTML='<div style="color:var(--red);font-size:13px">Fout: '+esc(e.message)+'</div>';wAi2Btn.disabled=false;wAi2Btn.textContent='&#129302; Genereer AI-waardering (second opinion)';toast('Genereren van AI-waardering is mislukt','err');}
  });
  // Eerder gegenereerd waarderingsrapport ophalen (server, niet meer lokaal) en tonen
  if(wAiBtn){
    (async function(){
      try{
        var lijst=await fetch(WORKER+'/mna/versies/'+S.code+'/waarderingsrapport').then(function(r){return r.json();});
        if(!Array.isArray(lijst)||!lijst.length)return;
        var laatste=lijst[0];
        var vd=await fetch(WORKER+'/mna/versie/'+laatste.id+'?code='+encodeURIComponent(S.code)).then(function(r){return r.json();});
        if(vd&&vd.tekst){
          wToonRapport(vd.tekst, vd.created_at, vd.versie);
          wAiBtn.textContent='↻ Opnieuw genereren';
          wLaadGeschiedenis();
        }
      }catch(e){}
    })();
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
  var backMain=ge('back-main');if(backMain)backMain.onclick=function(){S.screen='main';var fIdBm=FASES[S.fase]&&FASES[S.fase].id;if(fIdBm==='financieel'&&BANKMUTATIES===null)laadBankmutaties();if(fIdBm==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();renderApp();};
  // Alle huidige kritieke-discrepantiechecks gaan uitsluitend over Financieel-velden — als daar
  // ooit checks voor andere fases bijkomen, moet deze knop per discrepantie de juiste fase kiezen.
  var naarFinancieelBtn=ge('naar-financieel-btn');if(naarFinancieelBtn)naarFinancieelBtn.onclick=function(){S.screen='main';var fi=FASES.findIndex(function(f){return f.id==='financieel';});S.fase=fi>=0?fi:0;if(BANKMUTATIES===null)laadBankmutaties();if(BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();renderApp();};
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
  // Missing-velden-lijst: direct naar het betreffende veld springen i.p.v. alleen de naam te tonen
  document.querySelectorAll('.missing-veld-link').forEach(function(btn){
    btn.addEventListener('click',function(){
      S.showValidation=true;
      S.fase=parseInt(btn.dataset.faseIdx,10);
      S.screen='main';
      var fIdMv=FASES[S.fase]&&FASES[S.fase].id;
      if(fIdMv==='financieel'&&BANKMUTATIES===null)laadBankmutaties();
      if(fIdMv==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();
      renderApp();
      setTimeout(function(){
        var el=ge('df_'+btn.dataset.veldId);
        if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}
      },50);
    });
  });
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
    if(faseId==='financieel'&&BANKMUTATIES===null)laadBankmutaties();
    if(faseId==='financieel'&&BANKMUTATIES_ANALYSE===null)laadRedFlagAnalyse();
    renderApp();
  };});
  if(!isKoper()){
    document.querySelectorAll('.chk-item[data-key]').forEach(function(el){el.onclick=function(){saveCurrent();S.checked[el.dataset.key]=!S.checked[el.dataset.key];renderApp();};});
  }
  // Centrale upload file input listener
  var cfi=document.getElementById('centraal-file-input');
  if(cfi)cfi.addEventListener('change',function(){
    var _inp=this;
    if(this.files&&this.files.length)window.centraalUploadFiles(this.files).then(function(){_inp.value='';});
    else this.value='';
  });
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
  // Q&A laden en versturen — vraag óf tegenvoorstel; begeleider kan direct vanuit dit scherm reageren
  var qaCurFase=FASES[S.fase];
  var qaModuleAan2=!S.modules||S.modules.qa!==false;
  if(qaModuleAan2&&qaCurFase&&(isKoper()||isTussen())){
    (function(faseId){
      var qaStatusBadge={
        beantwoord:{kleur:'var(--teal)',label:'Beantwoord'},
        geaccepteerd:{kleur:'var(--teal)',label:'&#10003; Geaccepteerd'},
        afgewezen:{kleur:'var(--red)',label:'&#10005; Afgewezen'}
      };
      function qaLaad(){
        fetch(WORKER+'/mna/qa/'+S.code).then(function(r){return r.json();}).then(function(lijst){
          var div=ge('qa-lijst-'+faseId);
          if(!div)return;
          var faseLijst=(lijst||[]).filter(function(q){return !q.fase_id||q.fase_id===faseId;});
          if(!faseLijst.length){div.innerHTML='<div style="font-size:12px;color:var(--muted);font-style:italic">Nog geen vragen voor deze fase.</div>';return;}
          div.innerHTML=faseLijst.map(function(q){
            var isVoorstel=q.type==='voorstel';
            var badge=qaStatusBadge[q.status];
            var deadlineVerstreken=q.deadline&&!q.antwoord&&new Date(q.deadline).getTime()<Date.now();
            var reacties=q.reacties||[];
            return '<div style="margin-bottom:.75rem;padding:.75rem;background:var(--card);border-radius:var(--r);border-left:3px solid '+(q.antwoord?'var(--teal)':'var(--gold)')+'">'
              +'<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:.3rem;flex-wrap:wrap">'
              +'<span style="font-family:IBM Plex Mono,monospace;font-size:10px;background:var(--gold-bg);color:var(--gold);padding:1px 6px;border-radius:3px;flex-shrink:0">#'+q.vraag_nr+'</span>'
              +(isVoorstel?'<span style="font-size:10px;font-weight:600;background:var(--gold);color:#fff;padding:1px 8px;border-radius:10px">VOORSTEL'+(q.bedrag?': '+esc(q.bedrag):'')+'</span>':'')
              +(badge?'<span style="font-size:10px;font-weight:600;color:'+badge.kleur+'">'+badge.label+'</span>':'')
              +(q.deadline?'<span style="font-size:10px;font-weight:600;color:'+(deadlineVerstreken?'var(--red)':'var(--info)')+'">'+(deadlineVerstreken?'&#9888; Deadline verstreken: ':'&#128197; Deadline: ')+esc(q.deadline)+'</span>':'')
              +(q.toegewezen_aan?'<span style="font-size:10px;font-weight:600;color:var(--muted)">&#128100; '+esc(q.toegewezen_aan)+'</span>':'')
              +'<span style="font-size:13px;color:var(--sub);flex:1 1 100%">'+esc(q.vraag)+'</span></div>'
              +(q.antwoord
                ?'<div style="margin-top:.5rem;padding:.5rem .75rem;background:var(--teal-bg);border-radius:var(--r);font-size:12px;color:var(--teal-dim)">&#10003; <strong>'+esc(q.beantwoord_door||'Adviseur')+':</strong> '+esc(q.antwoord)+'</div>'
                :(isTussen()
                  ?'<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px dashed var(--border2)">'
                    +'<textarea id="qa-ant-'+q.id+'" style="width:100%;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:7px 9px;font-family:IBM Plex Sans,sans-serif;font-size:12px;color:var(--sub);resize:vertical;min-height:50px;outline:none" placeholder="Uw antwoord..."></textarea>'
                    +'<div style="display:flex;gap:6px;margin-top:.4rem;flex-wrap:wrap">'
                    +'<button class="btn btn-sm qa-ant-btn" data-id="'+q.id+'" style="font-size:11px">Beantwoorden</button>'
                    +(isVoorstel?'<button class="btn-sm qa-ant-btn" data-id="'+q.id+'" data-status="geaccepteerd" style="font-size:11px;background:var(--teal);color:#fff;border:none;border-radius:var(--r);padding:5px 12px;cursor:pointer">Accepteren</button>'
                      +'<button class="btn-sm qa-ant-btn" data-id="'+q.id+'" data-status="afgewezen" style="font-size:11px;background:var(--red);color:#fff;border:none;border-radius:var(--r);padding:5px 12px;cursor:pointer">Afwijzen</button>':'')
                    +'</div></div>'
                  :'<div style="font-size:11px;color:var(--muted);margin-top:.25rem;font-style:italic">&#8987; Wacht op antwoord...</div>'))
              +(isTussen()?'<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px dashed var(--border2);display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
                +'<input type="date" id="qa-deadline-'+q.id+'" value="'+esc(q.deadline||'')+'" style="background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:3px 6px;font-size:11px;color:var(--sub)">'
                +'<input type="text" id="qa-toegewezen-'+q.id+'" value="'+esc(q.toegewezen_aan||'')+'" placeholder="Toegewezen aan (naam)" style="background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:3px 6px;font-size:11px;color:var(--sub);width:150px">'
                +'<button class="btn-ghost btn-sm qa-beheer-btn" data-id="'+q.id+'" style="font-size:10px;padding:3px 8px">Opslaan</button>'
                +'</div>':'')
              +(reacties.length?'<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px dashed var(--border2)">'
                +reacties.map(function(r){
                  return '<div style="font-size:12px;color:var(--sub);margin-bottom:.3rem;padding:.35rem .5rem;background:var(--panel);border-radius:var(--r)"><strong>'+esc(r.auteur_naam||(r.auteur_rol==='koper'?'Koper':'Begeleider'))+':</strong> '+esc(r.tekst)+'</div>';
                }).join('')
                +'</div>':'')
              +'<div style="margin-top:.4rem;display:flex;gap:6px;align-items:center">'
                +'<input type="text" id="qa-reply-'+q.id+'" placeholder="Reageren..." style="flex:1;background:var(--panel);border:1px solid var(--border2);border-radius:var(--r);padding:5px 9px;font-size:12px;color:var(--sub)">'
                +'<button class="btn-ghost btn-sm qa-reply-btn" data-id="'+q.id+'" style="font-size:11px;padding:5px 10px;white-space:nowrap">Reageer</button>'
                +'</div>'
              +'</div>';
          }).join('');
          if(isTussen()){
            div.querySelectorAll('.qa-ant-btn').forEach(function(btn){
              btn.addEventListener('click',async function(){
                var qId=btn.dataset.id;
                var statusOverride=btn.dataset.status||null;
                var ta=ge('qa-ant-'+qId);
                var tekst=(ta?ta.value.trim():'');
                if(!tekst&&statusOverride)tekst=statusOverride==='geaccepteerd'?'Voorstel geaccepteerd.':'Voorstel afgewezen.';
                if(!tekst){toast('Vul een antwoord in.','err');return;}
                btn.disabled=true;
                try{
                  var body={antwoord:tekst,beantwoord_door:S.traject&&S.traject.begeleider_naam||BRAND.contactpersoon};
                  if(statusOverride)body.status=statusOverride;
                  var r=await fetch(WORKER+'/mna/admin/qa/antwoord/'+qId,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify(body)});
                  var d=await r.json();
                  if(d.ok){toast('Antwoord verstuurd.','ok');qaLaad();}
                  else{toast('Fout: '+(d.error||'onbekend'),'err');btn.disabled=false;}
                }catch(e){toast('Verbindingsfout.','err');btn.disabled=false;}
              });
            });
            div.querySelectorAll('.qa-beheer-btn').forEach(function(btn){
              btn.addEventListener('click',async function(){
                var qId=btn.dataset.id;
                var deadlineInp=ge('qa-deadline-'+qId);
                var toegewezenInp=ge('qa-toegewezen-'+qId);
                btn.disabled=true;btn.textContent='Opslaan...';
                try{
                  var r=await fetch(WORKER+'/mna/admin/qa/beheer/'+qId,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({deadline:deadlineInp?deadlineInp.value:'',toegewezen_aan:toegewezenInp?toegewezenInp.value.trim():''})});
                  var d=await r.json();
                  if(d.ok){toast('Opgeslagen.','ok');qaLaad();}
                  else{toast('Fout: '+(d.error||'onbekend'),'err');btn.disabled=false;btn.textContent='Opslaan';}
                }catch(e){toast('Verbindingsfout.','err');btn.disabled=false;btn.textContent='Opslaan';}
              });
            });
          }
          // Thread-reactie: zowel koper als begeleider kunnen doorpraten over een vraag.
          div.querySelectorAll('.qa-reply-btn').forEach(function(btn){
            btn.addEventListener('click',async function(){
              var qId=btn.dataset.id;
              var replyInp=ge('qa-reply-'+qId);
              var tekst=replyInp?replyInp.value.trim():'';
              if(!tekst){toast('Vul een reactie in.','err');return;}
              btn.disabled=true;
              try{
                var auteurNaam=isTussen()?(S.traject&&S.traject.begeleider_naam||BRAND.contactpersoon):(S.traject&&S.traject.koper_naam||'Koper');
                var r=await fetch(WORKER+'/mna/qa/reactie/'+qId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,tekst:tekst,auteur_naam:auteurNaam})});
                var d=await r.json();
                if(d.ok){toast('Reactie geplaatst.','ok');qaLaad();}
                else{toast('Fout: '+(d.error||'onbekend'),'err');btn.disabled=false;}
              }catch(e){toast('Verbindingsfout.','err');btn.disabled=false;}
            });
          });
        }).catch(function(){});
      }
      qaLaad();
      // Type-toggle (Vraag / Tegenvoorstel) — toont/verbergt het bedragveld
      var qaTypeRadios=document.querySelectorAll('input[name="qa-type-'+faseId+'"]');
      qaTypeRadios.forEach(function(r){
        r.addEventListener('change',function(){
          var bedragInp=ge('qa-bedrag-'+faseId);
          var gekozen=document.querySelector('input[name="qa-type-'+faseId+'"]:checked');
          if(bedragInp)bedragInp.style.display=(gekozen&&gekozen.value==='voorstel')?'block':'none';
        });
      });
      // Verstuur knop
      var qaBtn=ge('qa-btn-'+faseId);
      if(qaBtn)qaBtn.onclick=async function(){
        var inp=ge('qa-input-'+faseId);
        if(!inp||!inp.value.trim())return;
        var typeRadio=document.querySelector('input[name="qa-type-'+faseId+'"]:checked');
        var qaType=typeRadio?typeRadio.value:'vraag';
        var bedragInp=ge('qa-bedrag-'+faseId);
        var bedrag=(qaType==='voorstel'&&bedragInp)?bedragInp.value.trim():'';
        qaBtn.disabled=true;qaBtn.textContent='Versturen...';
        try{
          var r=await fetch(WORKER+'/mna/qa/'+S.code,{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({vraag:inp.value.trim(),fase_id:faseId,type:qaType,bedrag:bedrag,gesteld_door:S.traject&&S.traject.koper_naam||'Koper'})});
          var d=await r.json();
          if(d.ok){inp.value='';if(bedragInp)bedragInp.value='';toast((qaType==='voorstel'?'Voorstel':'Vraag')+' #'+d.vraag_nr+' verstuurd. De adviseur ontvangt een melding.','ok');qaLaad();}
          else{toast('Fout: '+(d.error||'onbekend'),'err');}
        }catch(e){toast('Verbindingsfout.','err');}
        qaBtn.disabled=false;qaBtn.textContent='Versturen';
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
      var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','docgen-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:560px;width:100%;max-height:90vh;overflow-y:auto';
      var t2=S.traject;
      mo.innerHTML='<div id="docgen-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:1.25rem">&#128196; Documenten genereren</div>'
        +'<p style="font-size:13px;color:var(--mid);margin-bottom:1.25rem">Genereer en verstuur documenten voor traject <strong>'+esc(t2.kantoor_naam||S.code)+'</strong>.</p>'
        +'<div style="display:flex;flex-direction:column;gap:10px">'
        +'<button id="bg-nda-btn" style="background:#7c5cbf;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128274; Genereer NDA</button>'
        +'<button id="bg-bem-btn" style="background:#2a5ea0;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128203; Bemiddelingsovereenkomst</button>'
        +'<button id="bg-loi-btn" style="background:#c9a84c;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:600;text-align:left">&#128196; Genereer LoI</button>'
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
        var isOpvolging=t3.traject_type==='Opvolging';
        var tplType=type==='bem'?(isOpvolging?'bem_opvolging':(isSell?'bem_verk':'bem_koper')):type;
        var tplR=await fetch(WORKER+'/mna/template/'+tplType+'?email='+encodeURIComponent(t3.begeleider_email||'')+'&code='+encodeURIComponent(S.code)).catch(function(){return{json:function(){return{ok:false};}};});
        var tplD=await tplR.json().catch(function(){return{ok:false};});
        var prompt='';
        if(type==='nda'){
          prompt='Vul de NDA template in voor trajecttype: '+(t3.traject_type||'Verkoop')+'. Partij 1: '+esc(t3.kantoor_naam||'[verkoper]')+', '+(t3.verkoper_adres||'[adres]')+'. Partij 2: '+esc(t3.koper_naam||'[koper]')+' ('+(t3.koper_rechtsvorm||'')+'). Datum: '+datum+'. Adviseur: ' + BRAND.bedrijf + ', '+esc(t3.begeleider_naam||'Begeleider')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard NDA template]');
        }else if(type==='loi'){
          prompt='Vul de LoI template in voor trajecttype: '+(t3.traject_type||'Verkoop')+'. Partij 1: '+esc(t3.kantoor_naam||'[verkoper]')+'. Partij 2: '+esc(t3.koper_naam||'[koper]')+' ('+(t3.koper_rechtsvorm||'')+'), '+(t3.koper_adres||'')+'. Datum: '+datum+'. Adviseur: '+(t3.begeleider_naam||'' + BRAND.bedrijf + '')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard LoI template]');
        }else{
          prompt='Vul de Bemiddelingsovereenkomst template in. Type: '+(isOpvolging?'Bedrijfsopvolging':(isSell?'Verkoop':'Aankoop'))+'. Opdrachtgever: '+esc(isSell?t3.kantoor_naam:t3.koper_naam||'[koper]')+'. Datum: '+datum+'. Begeleider/Adviseur: '+(t3.begeleider_naam||'' + BRAND.bedrijf + '')+'.\n\nTEMPLATE:\n'+(tplD.ok&&tplD.tekst?tplD.tekst:'[standaard BEM template]');
        }
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:8000})});
        var rd=await resp.json();
        var tekst=rd.text||(rd.error||'Fout');
        var labels={nda:'NDA',loi:'LoI',bem:'Bemiddelingsovereenkomst'};
        out.innerHTML='<div style="font-size:11px;font-weight:600;color:var(--info);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">'+labels[type]+' gegenereerd</div>'
          +'<textarea style="width:100%;height:280px;background:var(--card);border:1px solid var(--border2);border-radius:6px;color:var(--sub);font-family:Georgia,serif;font-size:12px;line-height:1.8;padding:1rem;outline:none;resize:vertical" id="bg-doc-tekst">'+esc(tekst)+'</textarea>'
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
          var er=await fetch(WORKER+endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S.code},body:JSON.stringify(payload)});
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
      var dataSamenvatting='';
      (S._mnaData||[]).forEach(function(row){
        try{
          var dj=typeof row.data_json==='string'?JSON.parse(row.data_json):row.data_json;
          var gevuld=Object.values(dj||{}).filter(function(v){return v&&v.value;});
          if(gevuld.length){dataSamenvatting+='\n## '+row.fase_id+'\n';gevuld.forEach(function(v){dataSamenvatting+='- '+v.label+': '+v.value+'\n';});}
        }catch(e){}
      });
      // Waarderingsmodel (Fase 4, 5 aug 2026) — zelfde config-gedreven curve als index.html/marilyn.
      // Geen scan-kwaliteitsscore beschikbaar binnen een lopend mna-traject, dus alleen de
      // omvang-curve + marktcorrectie, geen kwaliteitsfactor (blijft neutraal, factor 1.0).
      var financieelRow=(S._mnaData||[]).find(function(row){return row.fase_id==='financieel';});
      var fdj={};
      try{var rawFdj=financieelRow?financieelRow.data_json:null;fdj=typeof rawFdj==='string'?JSON.parse(rawFdj):(rawFdj||{});}catch(e){}
      function parseGeldLocal(s){if(!s)return 0;var n=String(s).replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');return parseFloat(n)||0;}
      var omzet3=fdj.omzet3?parseGeldLocal(fdj.omzet3.value):0;
      var ebitdaPct=fdj.ebitda?parseFloat(String(fdj.ebitda.value).replace(',','.'))||0:0;
      var ebitdaBedrag=omzet3*(ebitdaPct/100);
      var waarderingConfig=null;
      try{var wr=await fetch(WORKER+'/waardering/config?sector=accountant');waarderingConfig=await wr.json();}catch(e){}
      var bmTekst;
      if(!waarderingConfig||!waarderingConfig.beschikbaar){
        bmTekst='BENCHMARKS: waarderingsmodel niet beschikbaar — noem geen indicatieve multiple in de analyse.\n';
      }else if(ebitdaBedrag<=0){
        bmTekst='BENCHMARKS: onvoldoende financiele data (omzet/EBITDA) ingevuld voor een indicatieve multiple — noem geen indicatieve multiple in de analyse.\n';
      }else{
        var wConf=waarderingConfig.basisconfig.regulier;
        function interpoleerCurveLocal(curve,x){
          if(x<=curve[0][0])return curve[0][1];
          if(x>=curve[curve.length-1][0])return curve[curve.length-1][1];
          for(var i=0;i<curve.length-1;i++){
            var p0=curve[i],p1=curve[i+1];
            if(x>=p0[0]&&x<=p1[0]){var frac=(x-p0[0])/(p1[0]-p0[0]);return p0[1]+frac*(p1[1]-p0[1]);}
          }
          return curve[curve.length-1][1];
        }
        var betrouwbaarheidsfactorLocal={hoog:1.0,midden:0.6,laag:0.3};
        var marktcorrectieW=0;
        (waarderingConfig.marktfactoren||[]).forEach(function(f){
          var gewicht=(waarderingConfig.marktconfig.gewicht_per_sleutel||{})[f.sleutel]||0;
          marktcorrectieW+=gewicht*(f.effect_op_multiple||0)*(betrouwbaarheidsfactorLocal[f.betrouwbaarheid]||0.3);
        });
        var mccLocal=waarderingConfig.marktconfig;
        marktcorrectieW=Math.max(-mccLocal.max_correctie,Math.min(mccLocal.max_correctie,marktcorrectieW));
        var basisMult=interpoleerCurveLocal(wConf.curve_punten,ebitdaBedrag);
        var eindMult=Math.max(mccLocal.ondergrens_eindmultiple,Math.min(mccLocal.bovengrens_eindmultiple,Math.round((basisMult+marktcorrectieW)*10)/10));
        bmTekst='BENCHMARKS: EBITDA-marge '+ebitdaPct+'% | Indicatieve EBITDA multiple '+eindMult.toFixed(1).replace('.',',')+'x (regulier/terugverdientijd-gedreven, o.b.v. Brookz Overname Barometer — dit is GEEN formele due-diligence-waardering, alleen een indicatie)\n';
      }
      var prompt='M&A-adviseur accountancy. Analyseer traject: '+esc(t3.kantoor_naam||S.code)+' ('+esc(t3.traject_type||'Verkoop')+'). '+TAAL_REGELS+'\n'+bmTekst+'\nDUE DILIGENCE:'+dataSamenvatting+'\n\n## Samenvatting\n## Financieel profiel & waardering\n## Sterktes\n## Risicos\n## Aanbevelingen\n\nMax 500 woorden.';
      try{
        var resp=await fetch(WORKER+'/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:3000})});
        var rd=await resp.json();
        var tekst=(rd.text||'Fout bij genereren.').replace(/## ([^\n]+)/g,'<strong style="display:block;margin:.75rem 0 .25rem;font-size:14px">$1</strong>').replace(/\n/g,'<br>');
        var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.5rem';
        var mo=document.createElement('div');mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','ai-analyse-modal-titel');mo.style.cssText='background:var(--panel);border-radius:10px;padding:2rem;max-width:680px;width:100%;max-height:90vh;overflow-y:auto';
        mo.innerHTML='<div id="ai-analyse-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;color:var(--head);font-weight:600;margin-bottom:1.25rem">&#9881; AI-analyse · '+esc(t3.kantoor_naam||S.code)+'</div>'
          +'<div style="font-size:13px;color:var(--mid);line-height:1.8">'+tekst+'</div>'
          +'<div style="margin-top:1.25rem;text-align:right"><button id="ai-sluit" style="background:transparent;border:1px solid #c8c5bc;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:IBM Plex Sans,sans-serif;font-size:13px">Sluiten</button></div>';
        ov.appendChild(mo);document.body.appendChild(ov);
        ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
        document.getElementById('ai-sluit').onclick=function(){document.body.removeChild(ov);};
      }catch(e){toast('Fout bij AI-analyse: '+e.message,'err');}
      btn.disabled=false;btn.innerHTML='&#9881; AI-analyse';
    };
  }

  // Juridische-documenten-paneel op het hoofdscherm (zie renderMain hierboven) — inklapbaar, zelfde
  // patroon als andere collapsible panelen in dit platform.
  var pdHdr=ge('pd-toggle-hdr');
  if(pdHdr){
    // Bugfix 19 aug 2026 (frontend-audit P1): alleen .onclick + cursor:pointer, geen tabindex/role/
    // keydown — toetsenbord- en screenreadergebruikers konden dit paneel (toegang tot NDA/LoI voor
    // verkoper/koper) niet openen. tabindex/role/aria-expanded staan al in de HTML hierboven; hier
    // de toggle-functie herbruikbaar maken en ook op Enter/Spatie laten reageren.
    var pdToggle=function(){
      var body=ge('pd-body'),chevron=ge('pd-chevron');
      if(!body)return;
      var open=body.style.display!=='none';
      body.style.display=open?'none':'block';
      if(chevron)chevron.innerHTML=open?'&#9660;':'&#9650;';
      pdHdr.setAttribute('aria-expanded',open?'false':'true');
    };
    pdHdr.onclick=pdToggle;
    pdHdr.onkeydown=function(e){
      if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){e.preventDefault();pdToggle();}
    };
  }

