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
  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>'+titel+'<\/title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0}'
    +'body{font-family:IBM Plex Sans,Helvetica,Arial,sans-serif;font-size:11pt;line-height:1.75;color:#1a1815;background:#fff}'
    +'.page{max-width:720px;margin:0 auto;padding:2cm}'
    +'.doc-header{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:1.25rem;border-bottom:3px solid '+kleur+';margin-bottom:2rem}'
    +'.doc-header-left .doc-title{font-family:Playfair Display,serif;font-size:22pt;font-weight:600;color:'+kleur+';line-height:1.2}'
    +'.doc-header-right{text-align:right;font-size:9pt;color:#8a8880;line-height:1.7;flex-shrink:0}'
    +'.doc-header-right img{height:52px;width:auto;display:block;margin-left:auto;margin-bottom:.5rem}'
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
    +'  .doc-footer{position:fixed;bottom:1cm;left:2cm;right:2cm;border-top:1px solid #e8e5df;padding-top:.4rem}'
    +'}'
    +'<\/style><\/head><body>'
    +'<div class="page">'
    +'<div class="doc-header">'
    +'<div class="doc-header-left"><div class="doc-title">'+titel+'<\/div><\/div>'
    +'<div class="doc-header-right">'
    +'<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAFSAsMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKo3ur6ha3LQQeF765VcYmhktwrcdt8qn25A6VeooAg0+7uL2Ey3Olz2jB8CO4aMsRgc/u2YY/HPHSp6KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooqvLrGk2+pRaPPqlsl3OpaC1edRJIoySVXOSBg9PQ0AWKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiig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JzhYlU4OCzda+pa+bxmdTqXjQVl36nr4fLYx1q6+R5N+yT+w1+yx+w34DT4ffsy/CDTPDls0ai+1CNDLfagwAy9xcyZklJIzgttBJ2hRxXrNFFeHKUpyvJ3Z6iioqyCiiipGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFZfjTwT4P+I/hW+8DeP/AAvYa1o2pwGHUdK1S0Se3uYz/C6OCrDIB5HUA1qUUbAfjZ/wUr/4Nd9F8Sz3vxc/4Jx6jbaVeyFpbv4Z67fbLOZiScWNy/8Ax7nn/VykpwcOvAr4D+CX/BCH/gp78Z/ihD8Nr39l7WfBsJm23/iTxoFtdNs484aTzELtPgchYlYt7da/qPor1KOb4ulT5L383ujhqZfh6k+bb0PgP/gnd/wb0fsc/sUT2HxF+JdonxR8f2yh11nxHYJ/Z9hKRybWyO5FIJOJJC7jggqa+/KKK4KtarXnzVHdnXTpwpR5YqyCiiisiwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoqK8t5bq2aCC9lt2bGJoQpZee29WHtyD1p8EbxQpFJO0rKoDSOBuc46nAAyfYAe1ADqKiubeWfy/KvZYdkodvKCnzAP4DuU8H2wfQipaACiory3lurZoIL2W2ZsYmhCFl57b1Ye3IPWqP9gar/ANDtqn/fq1/+MUAadFZn9g6r/wBDrqf/AH6tf/jNaMEbxQpFJO0rKoDSOBuc46nAAyfYAe1ADqKp6hpl7ezCW28RXlooXBjt0hKk5PP7yNjn8ccdKns7eW1tlgnvZbllzmaYIGbnvsVR7cAdKAJaKoXukahdXLTweKb+2VsYhhjtyq8dt8TH35J61ENA1Uf8zvqn/fq1/wDjFAzUoqKzt5bW2WCe9luGXOZpgoZue+xVHtwB0qWgQUVT1HTL29mEtt4ivLNQuDHbpCVJyef3kbHP4446VX/sDVv+h31T/vza/wDxigDUorM/sDVf+h21P/v1a/8Axir1nby2tssE97LcMuczTBQzc99iqPbgDpQBLRRRQAUUUUAFFFFABRVG80m/urlp4PFF9bq2MQwxwFV47b4mPvyT1q5BG8UKRSTtKyqA0jgbnOOpwAMn2AHtQA6iiigAorLOgaqf+Z31T/v1a/8Axij/AIR/Vv8AoeNU/wC/Nr/8YpDNSiswaDqo/wCZ11P/AL9Wv/xmtGCN4oUiknaVlUBpHA3OcdTgAZPsAPamIdRRRQAUUUUAFFZ1xompzTPLH4w1GJWYlY44rYqgz0G6EnA9yT70waBqw/5njVP+/Nr/APGKQGpRWZ/YOq/9Drqf/fq1/wDjNWtOsLqx3/adaurzdjb9pSIbMZ6eWi9ffPSmBZooqjeaTf3Vy08Hii+t1bGIYY4Cq8dt8TH35J60AXqKpyaZevYJZr4hvEkRstdKkPmOOeCDHtxyOig8DnrmKDRdSimSWTxdqMqqwLRvFbbXGehxCDg+xB96ANGimwRvFCkUk7SsqgNI4G5zjqcADJ9gB7VTs9Jv7W5WefxRfXCrnMM0cAVuO+yJT78EdKAL1FFU9Q0y9vZhLbeIby0ULgx26QlScnn542Ofxxx0oAuUVmf2Bqv/AEO2qf8Afq1/+MVPp+mXtlMZbnxFeXalcCO4SEKDkc/u41Ofxxz0oAuUUVl/2Bqv/Q7ap/36tf8A4xQBqUVmf2Bqv/Q7ap/36tf/AIxVnTbC6sd/2rW7q83Y2/aUiGzGenlovX3z0oGWqKKKBBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf//Z" alt="' + BRAND.kort + '">'
    +datum+'<br>Vertrouwelijk'+(code?'<br><span style="font-family:monospace;font-size:8pt;color:#c8c5bc">'+code+'<\/span>':'')
    +'<\/div><\/div>'
    +'<div class="doc-body">'+fmt(tekst)+'<\/div>'
    +'<div class="doc-footer">'
    +'<span>' + BRAND.bedrijf + ' &middot; ' + BRAND.adres + '<\/span>'
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
  var heeftBem = versies.some(function(v){return v.doc_type==='bem'||v.doc_type==='bem_verk'||v.doc_type==='bem_koper'||v.doc_type==='bem_upload';});
  var heeftNda = versies.some(function(v){return v.doc_type==='nda'||v.doc_type==='nda_upload';});
  var heeftExcl = versies.some(function(v){return v.doc_type==='exclusief'||v.doc_type==='excl'||v.doc_type==='excl_upload';});
  var heeftLoi = versies.some(function(v){return v.doc_type==='loi'||v.doc_type==='loi_upload';});

  var waarschuwingen = [];
  var geblokkeerd = false;

  if (!t.koper_naam || !t.koper_naam.trim()) {
    waarschuwingen.push('⚠ Kopernaam is nog niet ingevuld. Het document gebruikt dan de generieke aanduiding "[koper]" in plaats van een naam.');
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
    if (!heeftNda) { waarschuwingen.push('⚠ De NDA is nog niet aangemaakt.'); geblokkeerd = true; }
    if (!heeftExcl) { waarschuwingen.push('⚠ De Exclusiviteitsbrief is nog niet aangemaakt.'); geblokkeerd = true; }
    if (heeftLoi) waarschuwingen.push('Er is al een LoI aangemaakt.');
  }

  var check = { waarschuwingen: waarschuwingen, geblokkeerd: geblokkeerd };
  if (!check.waarschuwingen.length) { onDoorgaan(); return; }
  if (!check.waarschuwingen.length) { onDoorgaan(); return; }

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
  var mo = document.createElement('div');
  mo.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:440px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.25)';

  var labels = {nda:'NDA',loi:'Letter of Intent',bem:'Bemiddelingsovereenkomst',excl:'Exclusiviteitsbrief',dealvoorstel:'Dealvoorstel',bieding:'Indicatieve bieding',spa:'Concept-koopovereenkomst'};
  var kleuren = {nda:'#7c5cbf',loi:'var(--gold)',bem:'#2a5ea0',excl:'var(--teal)',dealvoorstel:'#8a5a00',bieding:'#a0522d',spa:'#5a5470'};
  var kleur = kleuren[docType] || 'var(--teal)';

  mo.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:1.1rem;font-weight:600;color:var(--head);margin-bottom:1rem">'
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
    var html = '<div style="margin-top:1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem">'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">&#128196; Uw documenten</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px">';

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

    html += '</div></div>';
    el.innerHTML = html;
    el.querySelectorAll('.partij-doc-open').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var vr = await fetch(WORKER+'/mna/versie/'+btn.dataset.id);
        var vd = await vr.json();
        var ov2 = document.createElement('div');
        ov2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1.5rem';
        var mo2 = document.createElement('div');
        mo2.style.cssText = 'background:var(--panel);border:1px solid var(--border2);border-radius:var(--r2);padding:1.75rem;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.25)';
        mo2.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">'
          + '<div style="font-family:Playfair Display,serif;font-size:1rem;font-weight:600;color:var(--head)">'+(labels[vd.doc_type]||vd.doc_type)+'</div>'
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


