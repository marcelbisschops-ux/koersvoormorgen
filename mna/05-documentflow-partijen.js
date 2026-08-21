// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
function printDoc(tekst, titel, docType) {
  var kleuren = {nda:'#7c5cbf',loi:'#c9a84c',bem:'#2a5ea0',bem_verk:'#2a5ea0',bem_koper:'#2a5ea0',excl:'#1a7a5e',exclusief:'#1a7a5e',bieding:'#a0522d',spa:'#5a5470'};
  var kleur = kleuren[docType] || '#1a7a5e';
  function fmt(t) {
    if(!t) return '';
    t = t.replace(/^(Artikel \d+[^\n]*)/gm, '<h3>$1</h3>');
    t = t.replace(/^(##+ .+)/gm, function(m){ return '<h3>'+m.replace(/^#+\s*/,'')+'</h3>'; });
    t = t.replace(/^([A-Z][A-Z\s&]{4,})$/gm, '<h3>$1</h3>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(Naam|Handtekening|Plaats|Datum):\s*_{3,}/g,
      '<span style="display:inline-flex;align-items:baseline;gap:.5rem;min-width:260px;margin:.3rem 0">$1:&nbsp;<span style="display:inline-block;border-bottom:1px solid #2a2825;flex:1;min-width:140px">&nbsp;</span></span>');
    return t.split(/\n\n+/).map(function(p){
      p = p.trim(); if(!p) return '';
      if(p.startsWith('<h3>')) return p;
      if(/^[-•]\s/m.test(p)){
        var items = p.split(/\n/).map(function(l){ return l.replace(/^[-•]\s/,''); }).filter(Boolean);
        return '<ul>'+items.map(function(i){ return '<li>'+i+'</li>'; }).join('')+'</ul>';
      }
      return '<p>'+p.replace(/\n/g,'<br>')+'</p>';
    }).join('\n');
  }
  var datum = new Date().toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'});
  var code = (typeof S !== 'undefined' && S && S.code) ? S.code : '';
  // White-label: toon het logo/bedrijf van de daadwerkelijke begeleider (adviseur) i.p.v. altijd
  // de platformeigenaar — anders lekt "Bisschops Financing" in documenten van andere adviseurs.
  var docBedrijf = (typeof S !== 'undefined' && S && S.traject && S.traject.begeleider_bedrijf) || BRAND.bedrijfKort;
  var docAdres = (typeof S !== 'undefined' && S && S.traject && S.traject.begeleider_adres) || BRAND.adres;
  var docLogoImg = BRAND._logoUrl
    ? '<img src="'+String(BRAND._logoUrl).replace(/"/g,'&quot;')+'" alt="'+docBedrijf+'">'
    : '';
  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>'+titel+'<\/title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{font-family:IBM Plex Sans,Helvetica,Arial,sans-serif;font-size:11pt;line-height:1.75;color:#1a1815;background:#fff;position:relative}'
    // Watermerk: dit printvenster toont altijd een concept-tekst (gegenereerd of nog niet definitief
    // ondertekend) — nooit het daadwerkelijk ondertekende document (dat loopt via Signhost). Een
    // duidelijk "CONCEPT"-watermerk voorkomt dat een printout per ongeluk als definitief circuleert.
    +'body::before{content:"CONCEPT";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:110pt;font-weight:700;color:rgba(0,0,0,.06);z-index:0;pointer-events:none;white-space:nowrap;font-family:IBM Plex Sans,sans-serif}'
    +'.page{max-width:720px;margin:0 auto;padding:2cm;position:relative;z-index:1}'
    +'.doc-header{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:1.25rem;border-bottom:3px solid '+kleur+';margin-bottom:2rem}'
    +'.doc-header-left .doc-title{font-family:Playfair Display,serif;font-size:22pt;font-weight:600;color:'+kleur+';line-height:1.2}'
    +'.doc-header-right{text-align:right;font-size:9pt;color:#6b6862;line-height:1.7;flex-shrink:0;max-width:200px}'
    +'.doc-header-right img{height:auto;max-height:52px;max-width:180px;width:auto;display:block;margin-left:auto;margin-bottom:.6rem}'
    +'h3{font-size:10pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:'+kleur+';margin:1.75rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid #e8e5df}'
    +'p{margin-bottom:.75rem;color:#2a2825;font-size:10.5pt}'
    +'ul{margin:.5rem 0 .75rem 1.75rem}'
    +'li{margin-bottom:.35rem;color:#2a2825;font-size:10.5pt}'
    +'strong{font-weight:600}'
    +'.doc-footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e8e5df;font-size:8pt;color:#aaa8a2;display:flex;justify-content:space-between}'
    +'@media print{'
    +'  body{padding:0}'
    +'  .page{max-width:100%;padding:0}'
    +'  @page{margin:2cm 2cm 2.5cm 2cm;size:A4}'
    +'  .doc-footer{position:static;margin-top:2rem;border-top:1px solid #e8e5df;padding-top:.4rem}'
    +'}'
    +'<\/style><\/head><body>'
    +'<div class="page">'
    +'<div class="doc-header">'
    +'<div class="doc-header-left"><div class="doc-title">'+titel+'<\/div><\/div>'
    +'<div class="doc-header-right">'
    +docLogoImg
    +datum+'<br>Vertrouwelijk'+(code?'<br><span style="font-family:monospace;font-size:8pt;color:#c8c5bc">'+code+'<\/span>':'')
    +'<\/div><\/div>'
    +'<div class="doc-body">'+fmt(tekst)+'<\/div>'
    +'<div class="doc-footer">'
    +'<span>' + docBedrijf + ' &middot; ' + docAdres + '<\/span>'
    +'<span>Vertrouwelijk &mdash; uitsluitend bestemd voor geadresseerde(n)<\/span>'
    +'<\/div><\/div>'
    +'<script>window.onload=function(){window.print();}<\/script>'
    +'<\/body><\/html>');
  win.document.close();
}



function docProcesCheck(docType) {
  // Bepaal opdrachtgever_rol — default 'verkoper' voor legacy trajecten
  var rol = (S.traject && S.traject.opdrachtgever_rol) ? S.traject.opdrachtgever_rol : 'verkoper';
  var t = S.traject || {};
  var waarschuwingen = [];
  var geblokkeerd = false;

  // Proceslogica: Informatiebrief → BEM → Excl → NDA → LoI
  if (docType === 'bem') {
    // BEM: altijd als eerste mogelijk, geen vereiste
    // Maar check wel of er al een is
    if (t.bem_tekst || t.bem_datum) {
      waarschuwingen.push('Er is al een Bemiddelingsovereenkomst aangemaakt' +
        (t.bem_getekend ? ' (getekend door ' + t.bem_getekend + ')' : ' (nog niet getekend)') + '.');
    }
  }

  if (docType === 'excl') {
    if (!t.bem_tekst && !t.bem_datum) {
      waarschuwingen.push('⚠ De Bemiddelingsovereenkomst is nog niet aangemaakt. Verstuur eerst de BEM.');
      geblokkeerd = true;
    } else if (!t.bem_getekend) {
      waarschuwingen.push('⚠ De Bemiddelingsovereenkomst is nog niet getekend door de opdrachtgever. Overweeg of u toch wilt doorgaan.');
    }
    if (t.excl_tekst || t.excl_datum) {
      waarschuwingen.push('Er is al een Exclusiviteitsbrief aangemaakt' +
        (t.excl_getekend ? ' (getekend door ' + t.excl_getekend + ')' : ' (nog niet getekend)') + '.');
    }
  }

  if (docType === 'nda') {
    if (!t.bem_tekst && !t.bem_datum) {
      waarschuwingen.push('⚠ De Bemiddelingsovereenkomst is nog niet aangemaakt. Verstuur eerst de BEM.');
      geblokkeerd = true;
    } else if (!t.bem_getekend) {
      waarschuwingen.push('⚠ De Bemiddelingsovereenkomst is nog niet getekend. Overweeg of u toch wilt doorgaan.');
    }
    if (t.nda_tekst || t.nda_datum) {
      waarschuwingen.push('Er is al een NDA aangemaakt' +
        (t.nda_getekend ? ' (getekend door ' + t.nda_getekend + ')' : ' (nog niet getekend)') + '.');
    }
  }

  if (docType === 'loi') {
    var ndaOk = t.nda_getekend || (t.nda_tekst && t.nda_datum);
    var exclOk = t.excl_getekend || (t.excl_tekst && t.excl_datum);
    if (!ndaOk) {
      waarschuwingen.push('⚠ De NDA is nog niet ' + (t.nda_datum ? 'getekend' : 'aangemaakt') + '. Verstuur eerst de NDA.');
      geblokkeerd = true;
    }
    if (!exclOk) {
      waarschuwingen.push('⚠ De Exclusiviteitsbrief is nog niet ' + (t.excl_datum ? 'getekend' : 'aangemaakt') + '. Verstuur eerst de Excl.');
      geblokkeerd = true;
    }
    if (t.loi_tekst || t.loi_datum) {
      waarschuwingen.push('Er is al een LoI aangemaakt' +
        (t.loi_getekend ? ' (getekend door ' + t.loi_getekend + ')' : ' (nog niet getekend)') + '.');
    }
  }

  return { waarschuwingen: waarschuwingen, geblokkeerd: geblokkeerd };
}

async function toonDocWaarschuwing(docType, onDoorgaan) {
  // Haal versies op voor realtime blokkadecheck
  var versies = [];
  try {
    var vr = await fetch(WORKER+'/mna/versies/'+S.code);
    versies = await vr.json();
  } catch(e) {}

  var t = S.traject || {};
  // Een document telt als "aanwezig" wanneer er ofwel een gegenereerde/geüploade versie in de
  // documenthistorie staat (mna_doc_versies), ofwel het traject zelf aangeeft dat het document is
  // opgesteld of getekend (tekst/datum/getekend-kolommen). Die tweede bron is essentieel: een
  // begeleider kan een NDA/Excl/BEM buiten het platform (of buiten Signhost) om (laten) tekenen en
  // dat hier als "getekend" markeren — dan bestaat er geen doc_versies-rij, maar is het document er
  // wel degelijk. Zonder deze OR blokkeerde de LoI-knop ten onrechte met "De NDA is nog niet
  // aangemaakt", terwijl de NDA al getekend was (gevonden 25 juli 2026, een lopend traject). Dit maakt
  // de check gelijk aan de al bestaande docProcesCheck().
  var heeftBem = versies.some(function(v){return v.doc_type==='bem'||v.doc_type==='bem_verk'||v.doc_type==='bem_koper'||v.doc_type==='bem_upload';}) || !!(t.bem_tekst||t.bem_datum||t.bem_getekend);
  var heeftNda = versies.some(function(v){return v.doc_type==='nda'||v.doc_type==='nda_upload';}) || !!(t.nda_tekst||t.nda_datum||t.nda_getekend);
  var heeftExcl = versies.some(function(v){return v.doc_type==='exclusief'||v.doc_type==='excl'||v.doc_type==='excl_upload';}) || !!(t.excl_tekst||t.excl_datum||t.excl_getekend);
  var heeftLoi = versies.some(function(v){return v.doc_type==='loi'||v.doc_type==='loi_upload';}) || !!(t.loi_tekst||t.loi_datum||t.loi_getekend);

  var waarschuwingen = [];
  var geblokkeerd = false;

  if (!t.koper_naam || !t.koper_naam.trim()) {
    waarschuwingen.push('⚠ Kopernaam is nog niet ingevuld. Het document gebruikt dan de generieke aanduiding "[koper]" in plaats van een naam.');
  }
  // Dezelfde placeholder-check voor de andere partij — kantoornaam ontbreekt minder vaak (dit is
  // het eigen traject), maar bij een buy-side traject (opdrachtgever is de koper) is dít juist de
  // naam van de wederpartij/target, die net zo goed kan ontbreken.
  if (!t.kantoor_naam || !t.kantoor_naam.trim()) {
    waarschuwingen.push('⚠ Kantoornaam is nog niet ingevuld. Het document gebruikt dan de generieke aanduiding "[verkoper]" in plaats van een naam.');
  }

  if (docType === 'bem') {
    if (heeftBem) waarschuwingen.push('Er is al een Bemiddelingsovereenkomst aangemaakt.');
  }
  if (docType === 'excl') {
    if (!heeftBem) { waarschuwingen.push('⚠ De BEM is nog niet aangemaakt. Verstuur eerst de BEM.'); geblokkeerd = true; }
    if (heeftExcl) waarschuwingen.push('Er is al een Exclusiviteitsbrief aangemaakt.');
  }
  if (docType === 'nda') {
    if (!heeftBem) { waarschuwingen.push('⚠ De BEM is nog niet aangemaakt. Verstuur eerst de BEM.'); geblokkeerd = true; }
    if (heeftNda) waarschuwingen.push('Er is al een NDA aangemaakt.');
  }
  if (docType === 'loi') {
    // Geen heeftExcl-eis hier: in de daadwerkelijke dealstroom (zie stapRij-volgorde in
    // mna/04-begeleider-dashboard.js) komt de Exclusiviteitsovereenkomst ná de LoI, niet ervoor —
    // die eis blokkeerde de LoI dus altijd (bug, ongedocumenteerde commit, gevonden 21 aug 2026).
    if (!heeftNda) { waarschuwingen.push('⚠ De NDA is nog niet aangemaakt.'); geblokkeerd = true; }
    if (heeftLoi) waarschuwingen.push('Er is al een LoI aangemaakt.');
  }
  // Alleen een waarschuwing, geen blokkade (Marcel, 19 aug 2026, expliciete keuze): een dealvoorstel
  // vóór de koper exclusief onderhandelt kan legitiem zijn (bijv. bij één serieuze partij), dus geen
  // harde stop — wel een duidelijke melding als de Exclusiviteitsovereenkomst nog niet getékend is
  // (specifiek getekend, niet alleen aangemaakt — een niet-ondertekend concept biedt geen exclusiviteit).
  if (docType === 'dealvoorstel') {
    if (!t.excl_getekend) waarschuwingen.push('⚠ De Exclusiviteitsovereenkomst is nog niet getekend — koper onderhandelt (nog) niet exclusief.');
  }

  var check = { waarschuwingen: waarschuwingen, geblokkeerd: geblokkeerd };
  if (!check.waarschuwingen.length) { onDoorgaan(); return; }

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo = document.createElement('div');
  mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-labelledby','docwaarschuwing-modal-titel');
  mo.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:440px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.25)';

  var labels = {nda:'NDA',loi:'Letter of Intent',bem:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief',dealvoorstel:'Dealvoorstel',bieding:'Indicatieve bieding',spa:'Concept-koopovereenkomst'};
  var kleuren = {nda:'#7c5cbf',loi:'var(--gold)',bem:'#2a5ea0',excl:'var(--teal)',dealvoorstel:'#8a5a00',bieding:'#a0522d',spa:'#5a5470'};
  var kleur = kleuren[docType] || 'var(--teal)';

  mo.innerHTML = '<div id="docwaarschuwing-modal-titel" style="font-family:Playfair Display,serif;font-size:1.1rem;font-weight:600;color:var(--head);margin-bottom:1rem">'
    + (check.geblokkeerd ? '⛔ ' : '⚠️ ') + labels[docType] + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1.25rem">'
    + check.waarschuwingen.map(function(w) {
        var isBlocker = w.startsWith('⚠');
        return '<div style="padding:.6rem .875rem;background:' + (isBlocker ? 'var(--red-bg)' : 'var(--gold-bg)')
          + ';border-left:3px solid ' + (isBlocker ? 'var(--red)' : 'var(--gold)')
          + ';border-radius:0 var(--r) var(--r) 0;font-size:12px;color:var(--sub);line-height:1.6">'
          + esc(w) + '</div>';
      }).join('')
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button class="btn-ghost" id="dw-ann">Annuleren</button>'
    + (!check.geblokkeerd ? '<button class="btn" id="dw-door" style="background:' + kleur + '">Toch doorgaan</button>' : '')
    + '</div>';

  ov.appendChild(mo); document.body.appendChild(ov);
  ov.addEventListener('click', function(e) { if(e.target===ov) document.body.removeChild(ov); });
  document.getElementById('dw-ann').onclick = function() { document.body.removeChild(ov); };
  if (!check.geblokkeerd) {
    document.getElementById('dw-door').onclick = function() {
      document.body.removeChild(ov);
      onDoorgaan();
    };
  }
}

async function laadPartijDocs() {
  var el = document.getElementById('partij-docs-sectie');
  if (!el) return;
  // Bepaal welke doc types zichtbaar zijn per rol
  // Documentzichtbaarheid op basis van opdrachtgever_rol
  var opdRol = (S.traject && S.traject.opdrachtgever_rol) ? S.traject.opdrachtgever_rol : 'verkoper';
  var rolFilter;
  if (isVerkoper()) {
    // Verkoper ziet: NDA + LoI + Excl (als verkoper opdrachtgever is = Excl naar koper)
    // Verkoper ziet NOOIT de BEM — dat is een contract tussen Bisschops Financing en opdrachtgever
    // Verkoper ziet altijd Excl — die is immers gericht aan de verkoper
    rolFilter = ['nda','loi','nda_upload','loi_upload','excl','exclusief','excl_upload'];
  } else {
    // Koper ziet: NDA + LoI + Excl (als koper opdrachtgever is = Excl naar verkoper)
    // Koper ziet NOOIT de BEM tenzij koper zelf opdrachtgever is
    rolFilter = ['nda','loi','nda_upload','loi_upload'];
    if (opdRol === 'koper' || opdRol === 'beide') rolFilter.push('bem','bem_koper','bem_upload');
    if (opdRol === 'verkoper' || opdRol === 'beide') rolFilter.push('excl','exclusief','excl_upload');
  }
  var labels = {nda:'NDA',loi:'Letter of Intent',bem:'Bemiddelingsovereenkomst',bem_verk:'Bemiddelingsovereenkomst',bem_koper:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief',exclusief:'Exclusiviteitsbrief',bem_upload:'Bemiddelingsovereenkomst',excl_upload:'Exclusiviteitsbrief',nda_upload:'NDA',loi_upload:'Letter of Intent'};
  var kleuren = {nda:'#7c5cbf',loi:'#c9a84c',bem:'#2a5ea0',bem_verk:'#2a5ea0',bem_koper:'#2a5ea0',excl:'#1a7a5e',exclusief:'#1a7a5e'};
  try {
    // Haal contractversies EN geüploade dataroom-bestanden parallel op
    var [versiesResp, docsResp] = await Promise.all([
      fetch(WORKER+'/mna/versies/'+S.code),
      fetch(WORKER+'/mna/document/lijst/'+S.code)
    ]);
    var versies = await versiesResp.json();
    var alleDocs = await docsResp.json();

    // Filter contractversies op rol
    versies = versies.filter(function(v){ return rolFilter.indexOf(v.doc_type) !== -1; });
    // Filter dataroom-bestanden: alleen bewaard=1
    var dataroomDocs = alleDocs.filter(function(d){ return d.bewaard; });

    if (!versies.length && !dataroomDocs.length) {
      el.innerHTML='<div style="margin-top:1.5rem;font-size:12px;color:var(--muted);font-style:italic">Nog geen documenten beschikbaar.</div>';
      return;
    }
    var html = '<div style="display:flex;flex-direction:column;gap:6px">';

    // Haal Signhost transacties op
    var shTransacties = [];
    try {
      var shR = await fetch(WORKER+'/mna/signhost/status/'+S.code);
      var shD = await shR.json();
      shTransacties = shD.transactions || [];
    } catch(e) {}

    // Contractversies (NDA, BEM, LoI, Excl)
    versies.forEach(function(v) {
      var dt = new Date(v.created_at).toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'});
      var kleur = kleuren[v.doc_type]||'var(--teal)';
      // Zoek Signhost transactie voor dit doc type
      var shTx = shTransacties.find(function(tx){ return tx.doc_type === v.doc_type || (tx.reference && tx.reference.includes(v.doc_type)); });
      var shStatus = shTx ? shTx.status : null;
      // Check ook trajectvelden voor tekenstatus
      var t = S.traject || {};
      var trajectGetekend = false;
      if(v.doc_type === 'bem' || v.doc_type === 'bem_verk' || v.doc_type === 'bem_koper' || v.doc_type === 'bem_upload') trajectGetekend = !!t.bem_getekend;
      else if(v.doc_type === 'nda' || v.doc_type === 'nda_upload') trajectGetekend = !!t.nda_getekend;
      else if(v.doc_type === 'loi' || v.doc_type === 'loi_upload') trajectGetekend = !!t.loi_getekend;
      else if(v.doc_type === 'excl' || v.doc_type === 'exclusief' || v.doc_type === 'excl_upload') trajectGetekend = !!t.excl_getekend;
      var isGetekend = shStatus === 'ondertekend' || trajectGetekend;
      var shBadge = '';
      if(isGetekend) shBadge = '<span style="font-size:10px;background:#edf7f3;color:var(--teal);border:1px solid var(--teal);border-radius:10px;padding:1px 8px;font-weight:600">✓ Getekend</span>';
      else if(shStatus && shStatus !== 'ondertekend') shBadge = '<span style="font-size:10px;background:#f5f5f3;color:var(--muted);border:1px solid var(--border);border-radius:10px;padding:1px 8px">' + esc(shStatus) + '</span>';
      else if(!v.is_upload) shBadge = '<span style="font-size:10px;background:#fdf8ee;color:var(--gold);border:1px solid var(--gold);border-radius:10px;padding:1px 8px">Niet getekend</span>';
      html += '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:.6rem .875rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        + '<span style="font-size:12px;font-weight:600;color:'+kleur+';flex:1">'+(labels[v.doc_type]||v.doc_type)+'</span>'
        + '<span style="font-size:11px;color:var(--muted)">'+dt+'</span>'
        + shBadge
        + (v.is_upload
          ? '<a href="'+WORKER+'/mna/document/download/'+v.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:11px;padding:4px 12px;text-decoration:none">&#8681; Download</a>'
          : '<button class="btn-ghost partij-doc-open" data-id="'+v.id+'" style="font-size:11px;padding:4px 12px">&#128065; Lezen</button>')
        + '</div>';
    });

    // Geüploade dataroom-bestanden — filter contracten eruit + BEM nooit tonen aan verkoper
    var contractBestandsnamen = versies.filter(function(v){return v.is_upload;}).map(function(v){return v.bestand_naam||v.id;});
    dataroomDocs = dataroomDocs.filter(function(d){
      // Verwijder als het al als contract-upload getoond wordt
      if(contractBestandsnamen.some(function(n){return n===d.bestand_naam;}))return false;
      var naam=(d.bestand_naam||'').toLowerCase();
      // BEM nooit tonen aan verkoper
      if(isVerkoper()&&(naam.includes('bem')||naam.includes('bemiddelingsovereenkomst')))return false;
      // Excl niet tonen aan koper als koper de opdrachtgever is (Excl is dan voor de verkoper)
      if(!isVerkoper()&&(naam.includes('excl')||naam.includes('exclusiviteit'))&&(opdRol==='koper'||opdRol==='beide'))return false;
      return true;
    });
    if (dataroomDocs.length) {
      if (versies.length) html += '<div style="margin:.5rem 0;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Dataroom</div>';
      dataroomDocs.forEach(function(d) {
        var dt = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'}) : '';
        var icon = d.bestand_naam&&d.bestand_naam.endsWith('.pdf') ? '📄' : d.bestand_naam&&(d.bestand_naam.endsWith('.xlsx')||d.bestand_naam.endsWith('.xls')||d.bestand_naam.endsWith('.csv')) ? '📊' : '📃';
        var gr = d.bestand_grootte ? (d.bestand_grootte/1024/1024).toFixed(1)+'MB' : '';
        html += '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:.6rem .875rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          + '<span style="font-size:14px">'+icon+'</span>'
          + '<span style="font-size:12px;color:var(--sub);flex:1">'+(function(naam){
              var n=naam.toLowerCase();
              if(n.includes('bem')||n.includes('bemiddelingsovereenkomst'))return 'Bemiddelingsovereenkomst';
              if(n.includes('excl')||n.includes('exclusiviteit'))return 'Exclusiviteitsbrief';
              if(n.includes('nda')||n.includes('geheimhouding'))return 'NDA';
              if(n.includes('loi')||n.includes('intentieverklaring'))return 'Letter of Intent';
              return esc(naam);
            })(d.bestand_naam||'document')+'</span>'
          + (gr ? '<span style="font-size:10px;color:var(--muted)">'+gr+'</span>' : '')
          + '<span style="font-size:11px;color:var(--muted)">'+dt+'</span>'
          + '<a href="'+WORKER+'/mna/document/download/'+d.id+'?code='+encodeURIComponent(S.code)+'" target="_blank" class="btn-ghost" style="font-size:11px;padding:4px 12px;text-decoration:none">&#8681; Download</a>'
          + '</div>';
      });
    }

    html += '</div>';
    var aantalItems = versies.length + dataroomDocs.length;
    el.innerHTML = '<div style="margin-top:1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      + '<div id="docs-toggle-hdr" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">'
      + '<span style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">&#128196; Uw documenten &amp; dataroom ('+aantalItems+')</span>'
      + '<span id="docs-toggle-ic" style="font-size:11px;color:var(--muted);transition:transform .15s">&#9656;</span>'
      + '</div>'
      + '<div id="docs-toggle-body" style="display:none;margin-top:.75rem">' + html + '</div>'
      + '</div>';
    var toggleHdr = document.getElementById('docs-toggle-hdr');
    if (toggleHdr) {
      toggleHdr.addEventListener('click', function() {
        var body = document.getElementById('docs-toggle-body');
        var ic = document.getElementById('docs-toggle-ic');
        var open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        if (ic) ic.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
      });
    }
    el.querySelectorAll('.partij-doc-open').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var vr = await fetch(WORKER+'/mna/versie/'+btn.dataset.id+'?code='+encodeURIComponent(S.code));
        var vd = await vr.json();
        var ov2 = document.createElement('div');
        ov2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
        var mo2 = document.createElement('div');
        mo2.setAttribute('role','dialog');mo2.setAttribute('aria-modal','true');mo2.setAttribute('aria-labelledby','partijdoc-modal-titel');
        mo2.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)';
        mo2.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">'
          + '<div id="partijdoc-modal-titel" style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--head)">'+(labels[vd.doc_type]||vd.doc_type)+'</div>'
          + '<button id="pd-sluit" class="btn-ghost" style="font-size:12px;padding:4px 12px">&#10005;</button></div>'
          + '<textarea readonly style="width:100%;height:420px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:1rem;font-family:Georgia,serif;font-size:12px;line-height:1.8;color:var(--sub);outline:none;resize:vertical">'+esc(vd.tekst||'')+'</textarea>'
          + '<div style="display:flex;gap:8px;margin-top:.75rem;justify-content:flex-end">'
          + '<button class="btn-ghost pd-print" style="font-size:12px;padding:6px 14px">&#128196; Print / PDF</button>'
          + '<button class="btn-ghost" id="pd-sluit2" style="font-size:12px;padding:6px 14px">Sluiten</button>'
          + '</div>';
        ov2.appendChild(mo2); document.body.appendChild(ov2);
        ov2.addEventListener('click',function(e){if(e.target===ov2)document.body.removeChild(ov2);});
        mo2.querySelector('#pd-sluit').onclick = function(){document.body.removeChild(ov2);};
        mo2.querySelector('#pd-sluit2').onclick = function(){document.body.removeChild(ov2);};
        mo2.querySelector('.pd-print').onclick = function(){
          var lbl={nda:'NDA',loi:'Letter of Intent',bem:'Bemiddelingsovereenkomst',bem_verk:'Bemiddelingsovereenkomst',bem_koper:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief',exclusief:'Exclusiviteitsbrief'};
          printDoc(vd.tekst||'', lbl[vd.doc_type]||vd.doc_type, vd.doc_type);
        };
      });
    });
  } catch(e) { el.innerHTML=''; }
}

async function laadPartijGesprekken() {
  var el = document.getElementById('partij-gesprekken-sectie');
  if (!el) return;
  var rol = S.rol || 'verkoper'; // verkoper of koper
  try {
    var r = await fetch(WORKER+'/mna/gesprekken/'+S.code+'?rol='+encodeURIComponent(rol));
    var data = await r.json();
    var gesprekken = data.gesprekken || data || [];
    if (!gesprekken.length) return;
    var html = '<div style="margin-top:1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">&#128172; Gesprekken & verslagen</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px">';
    gesprekken.forEach(function(g) {
      var dt = g.datum ? new Date(g.datum).toLocaleDateString('nl-NL',{day:'2-digit',month:'long',year:'numeric'}) : '—';
      var typeLabels = {gesprek:'Gesprek',kennismaking:'Kennismaking',onderhandeling:'Onderhandeling',vergadering:'Vergadering',telefonisch:'Telefonisch overleg',email:'E-mailwisseling',andere:'Overig'};
      html += '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:.75rem .875rem">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.4rem">'
        + '<span style="font-size:11px;font-weight:600;color:var(--teal)">'+(typeLabels[g.type]||g.type||'Gesprek')+'</span>'
        + '<span style="font-size:11px;color:var(--muted)">'+dt+'</span>'
        + (g.deelnemers?'<span style="font-size:10px;color:var(--muted);margin-left:auto">'+esc(g.deelnemers)+'</span>':'')
        + '</div>'
        + (g.verslag?'<div style="font-size:12px;color:var(--sub);line-height:1.6;white-space:pre-wrap">'+esc(g.verslag.substring(0,300))+(g.verslag.length>300?'…':'')+'</div>':'')
        + '</div>';
    });
    html += '</div></div>';
    el.innerHTML = html;
  } catch(e) {}
}

// Transparantie: welke bank/accountant kijkt er (deels) mee met dit traject. Alleen naam/type/
// scope — nooit de toegangscode zelf, die kent alleen de begeleider (marilyn.html).
async function laadMeekijkers() {
  var el = document.getElementById('meekijkers-sectie');
  if (!el) return;
  try {
    var r = await fetch(WORKER+'/mna/meekijkers/'+S.code);
    var d = await r.json();
    var lijst = d.meekijkers || [];
    if (!lijst.length) { el.innerHTML=''; return; }
    var typeLabels = {bank:'bank',accountant:'accountant',overig:'derde partij',onbekend:'derde partij'};
    var faseLabel = function(id){
      if (id==='alle') return 'alle onderdelen';
      var f = (FASES||[]).filter(function(x){return x.id===id;})[0];
      return f ? (f.num?f.num+'. ':'')+f.title : id;
    };
    var html = '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1rem 1.25rem">'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">&#128064; Wie kijkt er mee</div>'
      + '<div style="font-size:12px;color:var(--mid);margin-bottom:.6rem">Uw begeleider heeft de volgende partij(en) beperkte, alleen-lezen inzage gegeven in dit traject:</div>'
      + lijst.map(function(v){
          return '<div style="font-size:12.5px;color:var(--sub);padding:2px 0">&#8226; <strong>'+esc(v.viewer_naam||'—')+'</strong> ('+esc(typeLabels[v.viewer_type]||v.viewer_type||'onbekend')+') — ziet: '+esc(faseLabel(v.scope_fase))+'</div>';
        }).join('')
      + '</div>';
    el.innerHTML = html;
  } catch(e) { el.innerHTML=''; }
}

