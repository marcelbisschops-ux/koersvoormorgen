// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase F3 (28 okt 2026): kolommenbalans per boekjaar (backend worker/45). Verkoper en begeleider
// lezen een kolommenbalans in (CSV of XLSX); de server deelt de rekeningen in en leidt het exploitatieoverzicht
// en de balansposten af. Rekeningen die niet eenduidig in te delen zijn, wijst de begeleider handmatig toe;
// pas daarna (en als debet en credit sluiten) staat het jaar op "gereed" en gaat het mee in het memorandum.

var KB = { scope: null, status: 'idle', data: null, bezig: false, melding: null, open: {}, jaar: null, kj: {} };
var KB_EXPL = [['omzet', 'Netto-omzet'], ['kostprijs', 'Kostprijs van de omzet'], ['brutomarge', 'Brutomarge', 1], ['personeel', 'Personeelskosten'], ['huisvesting', 'Huisvestingskosten'],
  ['vervoer', 'Vervoerskosten'], ['verkoop', 'Verkoopkosten'], ['algemeen', 'Kantoor- en algemene kosten'], ['ebitda', 'EBITDA', 1], ['afschrijving', 'Afschrijvingen'], ['ebit', 'EBIT', 1],
  ['financieel', 'Financiële baten en lasten'], ['overig_resultaat', 'Overige baten en lasten'], ['resultaat_voor_belasting', 'Resultaat vóór belasting', 1], ['belasting', 'Belastingen'], ['netto_resultaat', 'Netto resultaat', 1]];

function kbEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
// Nederlandse notatie: een negatief bedrag als -€ 2.500 (niet € -2.500).
function kbGeld(n) { if (typeof n !== 'number' || !isFinite(n)) return ''; var r = Math.round(n); return (r < 0 ? '-€ ' : '€ ') + Math.abs(r).toLocaleString('nl-NL'); }
function kbScope() { var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null; return JSON.stringify([S.code || '', S.rol || '', f ? f.id : '']); }
function kbSync() { var k = kbScope(); if (KB.scope !== k) { KB.scope = k; KB.status = 'idle'; KB.data = null; KB.bezig = false; KB.melding = null; } }
function kbHeaders() { var h = { 'Content-Type': 'application/json' }; if (isTussen()) h['x-tussen-key'] = S._bgKey || ''; return h; }
function kbHerteken() {
  var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null, bewaard = [];
  if (f && f.dataFields) f.dataFields.forEach(function (df) { var el = ge('df_' + df.id); if (el && typeof el.value === 'string') bewaard.push([df.id, el.value]); });
  renderApp();
  bewaard.forEach(function (b) { var el = ge('df_' + b[0]); if (el && el.value !== b[1]) el.value = b[1]; });
}
function kbAntwoord(p) {
  return p.then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }, function () { return { s: r.status, d: null }; }); }, function () { return { s: 0, d: null }; });
}
function kbLaad() {
  kbSync();
  if (!S.code || !(isVerkoper() || isTussen()) || KB.status === 'laden') return;
  var scope = KB.scope; KB.status = 'laden';
  kbAntwoord(fetchMetTimeout(WORKER + '/mna/kolommenbalans?code=' + encodeURIComponent(S.code), { method: 'GET', headers: kbHeaders() }, 30000)).then(function (x) {
    if (KB.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { KB.status = 'ok'; KB.data = x.d; }
    else { KB.status = 'fout'; KB.data = null; }
    kbHerteken();
  });
}
function kbPost(pad, body, okTekst, naSucces) {
  if (KB.bezig) return;
  KB.bezig = true; KB.melding = null; kbHerteken();
  body.code = S.code;
  kbAntwoord(fetchMetTimeout(WORKER + '/mna/kolommenbalans/' + pad, { method: 'POST', headers: kbHeaders(), body: JSON.stringify(body) }, 60000)).then(function (x) {
    KB.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { KB.data.jaren = x.d.jaren; KB.melding = { soort: 'ok', tekst: okTekst }; if (naSucces) naSucces(); }
    else {
      if (x.d && Array.isArray(x.d.jaren)) KB.data.jaren = x.d.jaren;
      KB.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      if (x.s === 409) { KB.status = 'idle'; setTimeout(kbLaad, 0); }
    }
    kbHerteken();
  });
}
window.kbUpload = function () {
  var inp = ge('kb-bestand'), jr = ge('kb-jaar');
  var bestand = inp && inp.files && inp.files[0], jaar = jr ? parseInt(jr.value, 10) : NaN;
  if (isFinite(jaar)) KB.jaar = jaar;
  if (!bestand) { KB.melding = { soort: 'fout', tekst: 'Kies eerst een bestand (CSV of XLSX).' }; kbHerteken(); return; }
  if (!isFinite(jaar)) { KB.melding = { soort: 'fout', tekst: 'Kies het boekjaar.' }; kbHerteken(); return; }
  if (bestand.size > 5 * 1024 * 1024) { KB.melding = { soort: 'fout', tekst: 'Het bestand is groter dan 5 MB.' }; kbHerteken(); return; }
  var bestaand = (KB.data && KB.data.jaren || []).filter(function (j) { return j.jaar === jaar; })[0];
  if (bestaand && !confirm('Voor ' + jaar + ' staat al een kolommenbalans. Vervangen? Eerdere handmatige toewijzingen voor dat jaar vervallen.')) return;
  var lezer = new FileReader();
  lezer.onload = function () {
    var b64 = String(lezer.result || '').split(',')[1] || '';
    kbPost('upload', { jaar: jaar, bestand_naam: bestand.name, inhoud_base64: b64, rev: bestaand ? bestaand.rev : undefined }, 'Kolommenbalans ' + jaar + ' ingelezen.');
  };
  lezer.readAsDataURL(bestand);
};
window.kbToewijzen = function (jaar, el) { var rekening = el.getAttribute('data-rek'); var j = (KB.data.jaren || []).filter(function (x) { return x.jaar === jaar; })[0]; if (j) kbPost('toewijzen', { jaar: jaar, rekening: rekening, categorie: el.value, rev: j.rev }, 'Rekening ' + rekening + ' toegewezen.'); };
window.kbVerwijder = function (jaar) { var j = (KB.data.jaren || []).filter(function (x) { return x.jaar === jaar; })[0]; if (j && confirm('Kolommenbalans ' + jaar + ' verwijderen?')) kbPost('verwijder', { jaar: jaar, rev: j.rev }, 'Kolommenbalans ' + jaar + ' verwijderd.'); };
// UAT-024.01: een kolommenbalans die al via de centrale upload in het dossier staat, inlezen zonder opnieuw te uploaden.
// Het boekjaar is een voorstel uit de bestandsnaam; zonder eenduidig voorstel kiest de gebruiker het zelf.
window.kbKiesKandidaatJaar = function (docId, v) { var j = parseInt(v, 10); KB.kj[docId] = isFinite(j) ? j : null; };
window.kbUitDocument = function (docId) {
  var k = ((KB.data && KB.data.kandidaten) || []).filter(function (x) { return x.doc_id === docId; })[0];
  if (!k) return;
  var jaar = KB.kj[docId] !== undefined ? KB.kj[docId] : k.jaar_voorstel;
  if (!isFinite(jaar) || jaar === null) { KB.melding = { soort: 'fout', tekst: 'Kies eerst het boekjaar van ' + k.bestand_naam + '.' }; kbHerteken(); return; }
  var bestaand = (KB.data.jaren || []).filter(function (j) { return j.jaar === jaar; })[0];
  if (bestaand && !confirm('Voor ' + jaar + ' staat al een kolommenbalans. Vervangen? Eerdere handmatige toewijzingen voor dat jaar vervallen.')) return;
  var afwijkend = k.jaar_voorstel !== null && jaar !== k.jaar_voorstel;
  if (afwijkend && !confirm('U kiest boekjaar ' + jaar + ', maar de bestandsnaam noemt ' + k.jaar_voorstel + '. Weet u zeker dat dit de kolommenbalans van ' + jaar + ' is?')) return;
  kbPost('uit-document', { jaar: jaar, doc_id: docId, rev: bestaand ? bestaand.rev : undefined, bevestig_afwijkend_jaar: afwijkend || undefined }, 'Kolommenbalans ' + jaar + ' ingelezen uit ' + k.bestand_naam + '.', function () {
    // Ingelezen: het bestand is geen kandidaat meer (de server sluit het voortaan zelf uit via de bronnaam).
    KB.data.kandidaten = (KB.data.kandidaten || []).filter(function (x) { return x.doc_id !== docId; });
  });
};
function kbKandidatenHtml(jaren) {
  var lijst = (KB.data && KB.data.kandidaten) || [];
  if (!lijst.length) return '';
  return '<div style="border:1px solid var(--info);background:var(--info-bg);border-radius:var(--r);padding:.6rem .8rem;margin:.5rem 0">'
    + '<div style="font-size:12px;font-weight:600;color:var(--head)">&#8505;&#65039; In het dossier gevonden, nog niet ingelezen</div>'
    + '<div style="font-size:12px;color:var(--sub);margin:.2rem 0 .4rem">Deze bestanden lijken een kolommenbalans. Controleer het boekjaar en lees ze in; opnieuw uploaden is niet nodig.</div>'
    + lijst.map(function (k) {
      var gekozen = KB.kj[k.doc_id] !== undefined ? KB.kj[k.doc_id] : k.jaar_voorstel;
      return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:.25rem 0"><span style="font-size:12px;flex:1 1 220px">' + kbEsc(k.bestand_naam) + '</span>'
        + '<select aria-label="Boekjaar voor ' + kbEsc(k.bestand_naam) + '" style="font-size:12px" onchange="kbKiesKandidaatJaar(\'' + kbEsc(k.doc_id) + '\',this.value)"><option value="">Kies boekjaar</option>'
        + jaren.map(function (y) { return '<option value="' + y + '"' + (y === gekozen ? ' selected' : '') + '>' + y + (y === k.jaar_voorstel ? ' (uit bestandsnaam)' : '') + '</option>'; }).join('') + '</select>'
        + '<button class="btn btn-sm" style="font-size:11px" onclick="kbUitDocument(\'' + kbEsc(k.doc_id) + '\')"' + (KB.bezig ? ' disabled' : '') + '>Inlezen als kolommenbalans</button></div>';
    }).join('') + '</div>';
}
window.kbKiesJaar = function (v) { var j = parseInt(v, 10); if (isFinite(j)) KB.jaar = j; };
window.kbToggle = function (jaar) { KB.open[jaar] = !KB.open[jaar]; kbHerteken(); };

function kbJaarHtml(j) {
  var cats = (KB.data && KB.data.categorieen) || {};
  var badge = j.status === 'gereed' ? '<span style="color:var(--teal);font-weight:600">Gereed</span>' : '<span style="color:var(--gold-dark);font-weight:600">Te controleren</span>';
  var h = '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.6rem .8rem;margin:.5rem 0">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-weight:600;color:var(--head)">Boekjaar ' + kbEsc(j.jaar) + ' &middot; ' + badge + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">' + kbEsc(j.bron_naam || '') + '</div></div>';
  if (j.redenen && j.redenen.length) h += '<div style="font-size:12px;color:var(--gold-dark);margin:.3rem 0">' + j.redenen.map(kbEsc).join(' ') + '</div>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:.4rem">' + KB_EXPL.map(function (p) {
    return '<tr style="' + (p[2] ? 'font-weight:600;border-top:1px solid var(--border)' : '') + '"><td style="padding:2px 4px">' + kbEsc(p[1]) + '</td><td style="padding:2px 4px;text-align:right">' + kbGeld(j.exploitatie[p[0]]) + '</td></tr>';
  }).join('') + '<tr style="border-top:1px solid var(--border)"><td style="padding:2px 4px">Werkkapitaal</td><td style="padding:2px 4px;text-align:right">' + kbGeld(j.werkkapitaal) + '</td></tr>'
    + '<tr><td style="padding:2px 4px">Netto schuld (langlopende schulden min liquide middelen)</td><td style="padding:2px 4px;text-align:right">' + kbGeld(j.netto_schuld) + '</td></tr></table>';
  var onbekend = j.rekeningen.filter(function (r) { return r.categorie === 'onbekend'; });
  var toon = KB.open[j.jaar] ? j.rekeningen : onbekend;
  if (toon.length) {
    h += '<div style="font-size:12px;font-weight:600;margin-top:.5rem">' + (KB.open[j.jaar] ? 'Alle rekeningen' : 'Nog handmatig toe te wijzen') + '</div><table style="width:100%;border-collapse:collapse;font-size:12px">'
      + toon.map(function (r) {
        var sel = isTussen() ? '<select data-rek="' + kbEsc(r.rekening) + '" aria-label="Categorie voor rekening ' + kbEsc(r.rekening) + '" onchange="kbToewijzen(' + Number(j.jaar) + ',this)"' + (KB.bezig ? ' disabled' : '') + '><option value="onbekend"' + (r.categorie === 'onbekend' ? ' selected' : '') + '>Kies categorie</option>'
          + Object.keys(cats).map(function (c) { return '<option value="' + kbEsc(c) + '"' + (r.categorie === c ? ' selected' : '') + '>' + kbEsc(cats[c]) + '</option>'; }).join('') + '</select>'
          : kbEsc(cats[r.categorie] || 'nog toe te wijzen door de adviseur');
        return '<tr><td style="padding:2px 4px">' + kbEsc(r.rekening) + '</td><td style="padding:2px 4px">' + kbEsc(r.omschrijving) + '</td><td style="padding:2px 4px;text-align:right">' + kbGeld(r.saldo) + '</td><td style="padding:2px 4px">' + sel + (r.bron === 'handmatig' ? ' <span style="color:var(--muted)">(handmatig)</span>' : '') + '</td></tr>';
      }).join('') + '</table>';
  }
  h += '<div style="margin-top:.4rem;display:flex;gap:6px"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="kbToggle(' + j.jaar + ')">' + (KB.open[j.jaar] ? 'Alleen open rekeningen' : 'Alle rekeningen tonen') + '</button>'
    + (isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="kbVerwijder(' + j.jaar + ')"' + (KB.bezig ? ' disabled' : '') + '>Verwijderen</button>' : '') + '</div>';
  return h + '</div>';
}
function renderKolommenbalans(faseId) {
  kbSync();
  if (faseId !== 'financieel' || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (KB.status === 'idle') setTimeout(kbLaad, 0);
  var dit = new Date().getFullYear(), jaren = [];
  for (var y = dit; y >= dit - 6; y--) jaren.push(y);
  var h = '<div class="panel" id="kb-panel" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">&#128200; Kolommenbalans en exploitatieoverzicht</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Lees per afgesloten boekjaar de kolommenbalans (saldibalans per grootboekrekening) in als CSV of Excel-export uit het boekhoudpakket. Het platform deelt de rekeningen in en maakt er een exploitatieoverzicht van. Rekeningen die niet eenduidig zijn, wijst de adviseur zelf toe; pas dan gaat het jaar mee in het informatiememorandum.</div>';
  if (KB.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid ' + (KB.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + kbEsc(KB.melding.tekst) + '</div>';
  if (KB.status === 'ok') h += kbKandidatenHtml(jaren);
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><label for="kb-jaar" style="font-size:12px">Boekjaar</label><select id="kb-jaar" style="font-size:12px" onchange="kbKiesJaar(this.value)">' + jaren.map(function (y) { return '<option value="' + y + '"' + (y === (KB.jaar || dit - 1) ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>'
    + '<input type="file" id="kb-bestand" accept=".csv,.xlsx" style="font-size:12px"><button class="btn btn-sm" style="font-size:11px" onclick="kbUpload()"' + (KB.bezig ? ' disabled' : '') + '>' + (KB.bezig ? 'Bezig…' : 'Inlezen') + '</button></div>';
  if (KB.status === 'laden' || KB.status === 'idle') h += '<div style="font-size:12px;color:var(--muted);margin-top:.5rem">Laden…</div>';
  else if (KB.status === 'fout') h += '<div style="font-size:12px;color:var(--red);margin-top:.5rem">De kolommenbalans kon niet worden geladen.</div>';
  else h += (KB.data.jaren.length ? KB.data.jaren.slice().reverse().map(kbJaarHtml).join('') : '<div style="font-size:12px;color:var(--muted);margin-top:.5rem">Nog geen kolommenbalans ingelezen.</div>');
  return h + '</div>';
}
