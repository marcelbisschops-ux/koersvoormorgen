// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase E v4b (29 okt 2026): beeldmateriaal voor het informatiememorandum, in de fase Strategisch & markt.
// Verkoper en begeleider uploaden; alleen de begeleider beslist over opname in het IM, cover, volgorde, focuspunt en
// verwijderen (worker/51 dwingt dat af). Bestanden blijven privé: miniaturen komen via de geauthenticeerde route.
// Een foto wordt vóór upload in de browser verkleind (max. 1600 px, JPEG) zodat het IM compact blijft.
// Laadt na mna/16-18 (hergebruikt finEsc/finAntw/finHeaders/finHerteken/finScope).
var IMB = { scope: null, status: 'idle', data: null, bezig: false, melding: null, thumbs: {} };
var IMB_CAT = [['pand', 'Pand / vestiging'], ['interieur', 'Interieur / werkplekken'], ['team', 'Team / medewerkers'], ['directie', 'Directie / aandeelhouders'], ['regio', 'Regio / vestigingsplaats'], ['activiteiten', 'Bedrijfsactiviteiten'], ['logo', 'Logo'], ['overig', 'Overig']];
var IMB_HERK = [['eigen', 'Eigen foto van de onderneming'], ['sfeer', 'Sfeerbeeld (niet van de onderneming)'], ['illustratie', 'Illustratie']];

function imbSync() { var k = finScope(); if (IMB.scope !== k) { IMB.scope = k; IMB.status = 'idle'; IMB.data = null; IMB.bezig = false; IMB.melding = null; IMB.thumbs = {}; } }
function imbLabel(l, w) { for (var i = 0; i < l.length; i++) if (l[i][0] === w) return l[i][1]; return w; }
function imbLaad() {
  imbSync();
  if (!S.code || !(isVerkoper() || isTussen()) || IMB.status === 'laden') return;
  var scope = IMB.scope; IMB.status = 'laden';
  finAntw(fetchMetTimeout(WORKER + '/mna/im-beeld?code=' + encodeURIComponent(S.code), { method: 'GET', headers: finHeaders() }, 30000)).then(function (x) {
    if (IMB.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.beelden)) { IMB.status = 'ok'; IMB.data = x.d; imbThumbs(); } else { IMB.status = 'fout'; IMB.data = null; }
    finHerteken();
  });
}
function imbThumbs() {
  (IMB.data.beelden || []).forEach(function (b) {
    if (IMB.thumbs[b.id]) return;
    IMB.thumbs[b.id] = 'laden';
    fetchMetTimeout(WORKER + '/mna/im-beeld/bestand?code=' + encodeURIComponent(S.code) + '&id=' + encodeURIComponent(b.id), { method: 'GET', headers: finHeaders() }, 30000)
      .then(function (r) { return r.ok ? r.blob() : null; }).then(function (bl) { IMB.thumbs[b.id] = bl ? URL.createObjectURL(bl) : 'fout'; finHerteken(); }, function () { IMB.thumbs[b.id] = 'fout'; });
  });
}
function imbPost(pad, body, ok) {
  if (IMB.bezig) return;
  IMB.bezig = true; IMB.melding = null; finHerteken();
  body.code = S.code;
  finAntw(fetchMetTimeout(WORKER + '/mna/im-beeld/' + pad, { method: 'POST', headers: finHeaders(), body: JSON.stringify(body) }, 60000)).then(function (x) {
    IMB.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true) { IMB.data.beelden = x.d.beelden; IMB.melding = { soort: 'ok', tekst: ok }; imbThumbs(); }
    else { IMB.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) }; if (x.s === 409) { IMB.status = 'idle'; setTimeout(imbLaad, 0); } }
    finHerteken();
  });
}
// Verkleint een foto in de browser tot max. 1600 px (JPEG, kwaliteit 0,85); een logo (PNG) blijft PNG.
function imbVerklein(bestand, cat, klaar) {
  var lezer = new FileReader();
  lezer.onload = function () {
    var img = new Image();
    img.onload = function () {
      var max = 1600, sch = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sch); c.height = Math.round(img.height * sch);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var png = cat === 'logo' && bestand.type === 'image/png';
      var url = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
      klaar(url.split(',')[1] || '', png ? 'image/png' : 'image/jpeg');
    };
    img.onerror = function () { klaar(null); };
    img.src = String(lezer.result || '');
  };
  lezer.readAsDataURL(bestand);
}
window.imbUpload = function () {
  var inp = ge('imb-bestand'), bestand = inp && inp.files && inp.files[0];
  var cat = (ge('imb-cat') || {}).value, herk = (ge('imb-herk') || {}).value;
  if (!bestand) { IMB.melding = { soort: 'fout', tekst: 'Kies eerst een foto (JPEG, PNG of WebP).' }; finHerteken(); return; }
  if (!/^image\/(jpeg|png|webp)$/.test(bestand.type)) { IMB.melding = { soort: 'fout', tekst: 'Alleen JPEG, PNG of WebP.' }; finHerteken(); return; }
  var body = { categorie: cat, herkomst: herk, bijschrift: (ge('imb-bijschrift') || {}).value || '', bestand_naam: bestand.name,
    rechten_bevestigd: herk === 'eigen' && !!(ge('imb-rechten') || {}).checked, bron: (ge('imb-bron') || {}).value || '', licentie: (ge('imb-licentie') || {}).value || '', naamsvermelding: (ge('imb-naam') || {}).value || '' };
  imbVerklein(bestand, cat, function (b64, mime) {
    if (!b64) { IMB.melding = { soort: 'fout', tekst: 'De foto kon niet worden gelezen.' }; finHerteken(); return; }
    body.inhoud_base64 = b64; body.mime = mime;
    imbPost('upload', body, 'Foto opgeslagen.');
  });
};
window.imbZet = function (el) {
  var b = (IMB.data.beelden || []).filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (!b) return;
  var veld = el.getAttribute('data-veld'), w = el.type === 'checkbox' ? el.checked : el.type === 'range' || el.getAttribute('data-num') ? Number(el.value) : el.value;
  var body = { id: b.id, rev: b.rev }; body[veld] = w;
  imbPost('bewerk', body, 'Opgeslagen.');
};
window.imbVolgorde = function (el, richting) {
  var lijst = (IMB.data.beelden || []).slice(), i = lijst.findIndex(function (x) { return x.id === el.getAttribute('data-id'); }), j = i + richting;
  if (i < 0 || j < 0 || j >= lijst.length) return;
  imbPost('bewerk', { id: lijst[i].id, rev: lijst[i].rev, volgorde: Math.max(0, (lijst[j].volgorde || 0) + (richting > 0 ? 1 : -1)) }, 'Volgorde aangepast.');
};
window.imbVerwijder = function (el) {
  var b = (IMB.data.beelden || []).filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
  if (b && confirm('Deze foto uit het beeldoverzicht van het IM halen? Het bestand blijft in het dossier.')) imbPost('verwijder', { id: b.id, rev: b.rev }, 'Foto uit het IM-overzicht gehaald.');
};
window.imbHerkomst = function (el) { var s = ge('imb-licentievelden'), r = ge('imb-rechtenveld'); if (s) s.style.display = el.value === 'eigen' ? 'none' : 'block'; if (r) r.style.display = el.value === 'eigen' ? 'block' : 'none'; };

function imbKaart(b, i, n) {
  var dis = IMB.bezig ? ' disabled' : '', t = IMB.thumbs[b.id], bg = isTussen();
  var data = ' data-id="' + finEsc(b.id) + '"';
  var h = '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem;display:flex;gap:10px;align-items:flex-start;margin:.4rem 0">'
    + '<div style="width:120px;height:80px;flex:none;background:var(--card);border-radius:4px;overflow:hidden">' + (t && t !== 'laden' && t !== 'fout' ? '<img src="' + finEsc(t) + '" alt="" style="width:100%;height:100%;object-fit:cover;object-position:' + b.focus_x + '% ' + b.focus_y + '%">' : '') + '</div>'
    + '<div style="flex:1;font-size:12px;line-height:1.6">'
    + '<div><strong>' + finEsc(imbLabel(IMB_CAT, b.categorie)) + '</strong> · ' + finEsc(imbLabel(IMB_HERK, b.herkomst)) + (b.cover ? ' · <strong>cover</strong>' : '') + '</div>'
    + '<div style="color:' + (b.mag_in_im ? 'var(--teal)' : 'var(--muted)') + '">' + (b.mag_in_im ? 'Wordt in het IM opgenomen' : (b.herkomst === 'eigen' && !b.rechten_bevestigd ? 'Nog niet in het IM: rechten en toestemming nog niet bevestigd' : 'Nog niet in het IM: wacht op goedkeuring van de begeleider')) + '</div>'
    + '<label style="display:block">Bijschrift <input type="text" maxlength="200" value="' + finEsc(b.bijschrift) + '"' + data + ' data-veld="bijschrift" onchange="imbZet(this)"' + dis + ' style="width:100%;font-size:12px"></label>'
    + (b.herkomst === 'eigen' ? '<label><input type="checkbox"' + data + ' data-veld="rechten_bevestigd" onchange="imbZet(this)"' + (b.rechten_bevestigd ? ' checked' : '') + dis + '> Rechten en, bij herkenbare personen, hun toestemming zijn geregeld</label>'
      : '<div style="color:var(--muted)">Bron: ' + finEsc(b.bron) + ' · Licentie: ' + finEsc(b.licentie) + (b.naamsvermelding ? ' · ' + finEsc(b.naamsvermelding) : '') + '</div>')
    + (b.onderschrift ? '<div style="color:var(--muted)">In het IM: &ldquo;' + finEsc(b.onderschrift) + '&rdquo;</div>' : '');
  if (bg) h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:.3rem">'
    + '<label><input type="checkbox"' + data + ' data-veld="im_toegestaan" onchange="imbZet(this)"' + (b.im_toegestaan ? ' checked' : '') + dis + '> Opnemen in het IM</label>'
    + (b.categorie !== 'logo' ? '<label><input type="checkbox"' + data + ' data-veld="cover" onchange="imbZet(this)"' + (b.cover ? ' checked' : '') + dis + '> Cover</label>' : '')
    + '<label>Focus horizontaal <input type="range" min="0" max="100" value="' + b.focus_x + '"' + data + ' data-veld="focus_x" onchange="imbZet(this)"' + dis + '></label>'
    + '<label>verticaal <input type="range" min="0" max="100" value="' + b.focus_y + '"' + data + ' data-veld="focus_y" onchange="imbZet(this)"' + dis + '></label>'
    + '<button class="btn-ghost btn-sm" style="font-size:11px"' + data + ' onclick="imbVolgorde(this,-1)"' + (i === 0 ? ' disabled' : dis) + '>&uarr;</button>'
    + '<button class="btn-ghost btn-sm" style="font-size:11px"' + data + ' onclick="imbVolgorde(this,1)"' + (i === n - 1 ? ' disabled' : dis) + '>&darr;</button>'
    + '<button class="btn-ghost btn-sm" style="font-size:11px"' + data + ' onclick="imbVerwijder(this)"' + dis + '>Uit IM-overzicht</button></div>';
  return h + '</div></div>';
}
function renderImBeeld(faseId) {
  imbSync();
  if (faseId !== 'strategisch' || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (IMB.status === 'idle') setTimeout(imbLaad, 0);
  var opt = function (l, w) { return l.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === w ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join(''); };
  var h = '<div class="panel" id="imb-panel" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">&#128247; Beeldmateriaal voor het informatiememorandum</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Upload foto\'s van het pand, het team, de regio of de activiteiten. Een sfeerbeeld of illustratie wordt in het memorandum altijd als zodanig benoemd en nooit als foto van de onderneming gepresenteerd. ' + (isTussen() ? 'U bepaalt per foto of hij in het memorandum komt en welke de cover is.' : 'De begeleider bepaalt welke foto\'s in het memorandum komen.') + '</div>';
  if (IMB.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin:.4rem 0;border-radius:var(--r);border:1px solid ' + (IMB.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + finEsc(IMB.melding.tekst) + '</div>';
  if (IMB.status !== 'ok' || !IMB.data) return h + '<div style="font-size:12px;color:var(--muted)">' + (IMB.status === 'fout' ? 'Het beeldmateriaal kon niet worden geladen.' : 'Laden…') + '</div></div>';
  var dis = IMB.bezig ? ' disabled' : '';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;font-size:11px;color:var(--sub);margin:.4rem 0">'
    + '<label>Foto<input type="file" id="imb-bestand" accept="image/jpeg,image/png,image/webp" style="font-size:12px;width:100%"></label>'
    + '<label>Categorie<select id="imb-cat" style="width:100%">' + opt(IMB_CAT, 'pand') + '</select></label>'
    + '<label>Herkomst<select id="imb-herk" style="width:100%" onchange="imbHerkomst(this)">' + opt(IMB_HERK, 'eigen') + '</select></label>'
    + '<label>Bijschrift<input type="text" id="imb-bijschrift" maxlength="200" style="width:100%"></label></div>'
    + '<div id="imb-rechtenveld" style="font-size:12px"><label><input type="checkbox" id="imb-rechten"> Rechten en, bij herkenbare personen, hun toestemming zijn geregeld</label></div>'
    + '<div id="imb-licentievelden" style="display:none;font-size:11px;color:var(--sub)"><label>Bron (verplicht) <input type="text" id="imb-bron" maxlength="300" style="width:100%"></label><label>Licentie (verplicht) <input type="text" id="imb-licentie" maxlength="200" style="width:100%"></label><label>Naamsvermelding <input type="text" id="imb-naam" maxlength="200" style="width:100%"></label></div>'
    + '<button class="btn btn-sm" style="font-size:11px;margin:.4rem 0" onclick="imbUpload()"' + dis + '>Foto uploaden</button>';
  var lijst = IMB.data.beelden || [];
  h += lijst.length ? lijst.map(function (b, i) { return imbKaart(b, i, lijst.length); }).join('') : '<div style="font-size:12px;color:var(--muted)">Nog geen beeldmateriaal. Zonder foto\'s krijgt het memorandum een nette beeldloze opmaak.</div>';
  return h + '</div>';
}
