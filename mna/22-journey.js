// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// #97 / KVM-UAT-019 (GO Marcel 30-10-2026): M&A Journey. Eén weergavecomponent voor alle rollen en omgevingen
// (begeleider, verkoper, koper, koopmandaat en de demo). De fasen, taken en statussen komen uitsluitend uit de backend
// (GET /mna/journey/{code}, worker/54-journey.js); hier wordt niets zelf berekend. De demo geeft dezelfde vorm door met
// fictieve gegevens. Knoppen openen bestaande schermen en bestaande documentkaarten; er is geen tweede document-,
// waarderings- of proceslogica. Lukt het laden niet, dan blijft de bestaande documentenflow gewoon staan.
var JR_STATUS = { gereed: ['Gereed', 'jr-gereed'], bezig: ['Bezig', 'jr-bezig'], open: ['Open', 'jr-open'], nvt: ['Niet van toepassing', 'jr-nvt'],
  niet_beschikbaar: ['Nog niet beschikbaar', 'jr-nvt'], voorbereiding: ['In voorbereiding', 'jr-open'], afgevallen: ['Afgevallen', 'jr-nvt'] };
// WF-001: veertien fasen; deze fasen bereidt de verkoperskant voor (de koper ziet ze als 'in voorbereiding').
var JR_VERKOPERSKANT = ['intake', 'opdracht', 'voorbereiding', 'matching', 'longlist', 'teaser', 'shortlist'];
var JR_EIGENAAR = { begeleider: 'Adviseur', verkoper: 'Verkoper', koper: 'Koper' };
var JR_VORM = { verkoop: 'Verkoop van de onderneming', koop: 'Aankoop (buy-side)', fusie: 'Fusie / aandelenruil' };
function jrEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function jrChip(s) { var x = JR_STATUS[s] || [s, 'jr-open']; return '<span class="jr-chip ' + x[1] + '">' + jrEsc(x[0]) + '</span>'; }

// Design 2.0 (N-174 R1): alleen voor de begeleider en alleen met <html data-ui="2">. Zelfde 14 fasen, zelfde knoppen en
// data-attributen; alleen gegroepeerd in etappes. Fasen en statussen komen ongewijzigd uit de backend.
var JR2_ETAPPES = [['Voorbereiding', 0, 3], ['Marktbenadering', 3, 6], ['NDA en selectie', 6, 8], ['Biedingen en onderzoek', 8, 11], ['Contractering', 11, 12], ['Afronding', 12, 14]];
function jrUi2(d, opts) {
  // Alle rollen (R3): zelfde etappe-indeling; de zijkolom (wie aan zet, documenten) alleen bij de begeleider (opts.docs).
  return !!(opts && d && d.niveau !== 'koopmandaat' && d.fasen && d.fasen.length === 14
    && typeof document !== 'undefined' && document.documentElement.getAttribute('data-ui') === '2');
}
function jrStapLi(f, gekozen, d) {
  var actief = f.nr === gekozen, huidig = f.nr === d.huidige_fase;
  return '<li><button type="button" role="tab" class="jr-stap ' + (JR_STATUS[f.status] || ['', 'jr-open'])[1] + (actief ? ' jr-actief' : '') + (huidig ? ' jr-huidig' : '') + '" data-jr-fase="' + f.nr + '" aria-selected="' + actief + '">'
    + '<span class="jr-nr">' + (f.status === 'gereed' ? '&#10003;' : f.nr) + '</span><span class="jr-naam">' + jrEsc(f.titel) + '</span>'
    + (huidig ? '<span class="jr-nu">nu</span>' : '') + '</button></li>';
}
function jrEtappesHtml(d, gekozen) {
  var h = '<div class="jr2-etappes" role="tablist" aria-label="Fasen van het traject">';
  JR2_ETAPPES.forEach(function (e) {
    var fasen = d.fasen.slice(e[1], e[2]);
    var telt = fasen.filter(function (f) { return f.status !== 'nvt'; });
    var gereed = telt.filter(function (f) { return f.status === 'gereed'; }).length;
    var nu = fasen.some(function (f) { return f.nr === d.huidige_fase; });
    var klaar = telt.length > 0 && gereed === telt.length;
    h += '<section class="jr2-etappe' + (nu ? ' jr2-nu' : '') + (klaar ? ' jr2-klaar' : '') + '"><div class="jr2-etappe-kop"><span class="jr2-etappe-naam">' + jrEsc(e[0]) + '</span>'
      + '<span class="jr2-etappe-telling">' + (telt.length ? gereed + ' van ' + telt.length + ' gereed' : 'niet van toepassing') + '</span></div>'
      + '<div class="jr2-segmenten" aria-hidden="true">' + fasen.map(function (f) { return '<i class="jr2-seg jr2-' + jrEsc(f.status) + '"></i>'; }).join('') + '</div>'
      + '<ol class="jr-lijn jr2-lijn">' + fasen.map(function (f) { return jrStapLi(f, gekozen, d); }).join('') + '</ol></section>';
  });
  return h + '</div>';
}
// Per fase: hoeveel open of lopende taken elke uitvoerder heeft (alleen uit de taken die de backend levert).
function jrAanZetHtml(f) {
  var tel = {};
  f.items.forEach(function (x) { if ((x.status === 'open' || x.status === 'bezig') && x.eigenaar) tel[x.eigenaar] = (tel[x.eigenaar] || 0) + 1; });
  var rollen = ['begeleider', 'verkoper', 'koper'].filter(function (r) { return tel[r]; });
  if (!rollen.length) return '';
  return '<div class="jr2-aanzet"><div class="jr2-zijkop">Wie is aan zet</div><div class="jr2-aanzet-rij">' + rollen.map(function (r) {
    return '<div class="jr2-aanzet-vak"><span>' + jrEsc(JR_EIGENAAR[r] || r) + '</span><b>' + tel[r] + '</b><span>' + (tel[r] === 1 ? 'taak' : 'taken') + '</span></div>';
  }).join('') + '</div></div>';
}
// Pure weergave. opts: { gekozen: fasenr, docs: true (begeleider: plek voor documentkaarten), titel }
function jrHtml(d, opts) {
  opts = opts || {};
  if (!d || !d.fasen) return '';
  var gekozen = opts.gekozen || d.huidige_fase || (d.volgende_stap && d.volgende_stap.fase) || 1;
  var rol = d.rol;
  var ui2 = jrUi2(d, opts);
  var h = '<div class="jr' + (ui2 ? ' jr2' : '') + '" data-rol="' + jrEsc(rol) + '">';
  h += '<div class="jr-kop"><div>' + (opts.titel === '' ? '' : '<div class="jr-titel">' + jrEsc(opts.titel || 'M&A Journey') + '</div>')
    + '<div class="jr-sub">' + jrEsc(JR_VORM[d.transactievorm] || '') + (d.niveau === 'koopmandaat' ? ' &middot; koopmandaat met meerdere doelwitten' : '') + '</div></div>';
  if (d.volgende_stap) h += '<div class="jr-volgende"><span>Volgende stap' + (rol === 'begeleider' ? '' : ' voor u') + '</span><b>' + jrEsc(d.volgende_stap.label) + '</b></div>';
  else if (rol === 'koper' && d.nda_geldig === false) h += '';
  h += '</div>';
  if (ui2) h += jrEtappesHtml(d, gekozen);
  else h += '<ol class="jr-lijn" role="tablist" aria-label="Fasen van het traject">';
  if (!ui2) d.fasen.forEach(function (f) {
    var actief = f.nr === gekozen, huidig = f.nr === d.huidige_fase;
    h += '<li><button type="button" role="tab" class="jr-stap ' + (JR_STATUS[f.status] || ['', 'jr-open'])[1] + (actief ? ' jr-actief' : '') + (huidig ? ' jr-huidig' : '') + '" data-jr-fase="' + f.nr + '" aria-selected="' + actief + '">'
      + '<span class="jr-nr">' + (f.status === 'gereed' ? '&#10003;' : f.nr) + '</span><span class="jr-naam">' + jrEsc(f.titel) + '</span>'
      + (huidig ? '<span class="jr-nu">nu</span>' : '') + '</button></li>';
  });
  if (!ui2) h += '</ol>';
  d.fasen.forEach(function (f) {
    h += '<div class="jr-paneel" data-jr-paneel="' + f.nr + '"' + (f.nr === gekozen ? '' : ' hidden') + '>';
    // WF-001 (WF-C): de begeleider kan een fase met reden op niet van toepassing zetten of weer opnemen.
    var nvtKnop = '';
    if (opts.docs && rol === 'begeleider' && d.niveau !== 'koopmandaat') {
      if (f.status === 'nvt' && f.nvt_handmatig) nvtKnop = '<button type="button" class="btn-ghost btn-sm" data-jr-nvt="' + jrEsc(f.key) + '" data-jr-nvt-aan="0">Fase weer opnemen</button>';
      else if (f.status !== 'nvt') nvtKnop = '<button type="button" class="btn-ghost btn-sm" data-jr-nvt-open="' + jrEsc(f.key) + '">Niet van toepassing</button>';
    }
    h += '<div class="jr-paneel-kop"><div class="jr-paneel-titel">Fase ' + f.nr + ' &middot; ' + jrEsc(f.titel) + '</div><div class="jr-paneel-rechts">' + jrChip(f.status) + nvtKnop + '</div></div>';
    if (nvtKnop && f.status !== 'nvt') h += '<form class="jr-nvt-form" data-jr-nvt-form="' + jrEsc(f.key) + '" hidden><label>Waarom is deze fase niet van toepassing? <input name="reden" required minlength="5" maxlength="300"></label><button type="submit" class="btn btn-sm">Vastleggen</button><span class="jr-nvt-fout" role="status"></span></form>';
    if (f.status === 'nvt' && f.nvt_reden) h += '<div class="jr-leeg">Niet van toepassing: ' + jrEsc(f.nvt_reden) + '</div>';
    if (!f.items.length && !(f.status === 'nvt' && f.nvt_reden)) {
      h += '<div class="jr-leeg">' + (f.status === 'nvt' ? '' : rol === 'koper' ? (JR_VERKOPERSKANT.indexOf(f.key) >= 0 ? 'Deze fase wordt aan de kant van de verkoper voorbereid.' : 'Voor u zijn in deze fase nog geen stappen beschikbaar.') : 'Geen taken in deze fase.') + '</div>';
    }
    h += '<ul class="jr-taken">';
    f.items.forEach(function (x) {
      var eigen = rol === 'begeleider' ? false : !!x.eigen_taak;
      h += '<li class="jr-taak' + (eigen ? ' jr-eigen' : '') + '" data-jr-key="' + jrEsc(x.key) + '">'
        + '<div class="jr-taak-hoofd"><span class="jr-taak-naam">' + jrEsc(x.label) + '</span>' + jrChip(x.status) + '</div>'
        + '<div class="jr-taak-meta">'
        + (rol === 'begeleider' && x.eigenaar ? '<span>Uitvoerder: ' + jrEsc(JR_EIGENAAR[x.eigenaar] || x.eigenaar) + '</span>' : '')
        + (eigen ? '<span class="jr-eigen-label">Uw taak</span>' : '')
        + (x.teller ? '<span>' + jrEsc(x.teller) + '</span>' : '')
        + (x.wacht_op && x.wacht_op.length ? '<span>Wacht op: ' + jrEsc(x.wacht_op.join(', ')) + '</span>' : '')
        + (x.toelichting ? '<span>' + jrEsc(x.toelichting) + '</span>' : '')
        + (rol === 'begeleider' && x.bron ? '<span class="jr-bron" title="Bron van deze status">Bron: ' + jrEsc(x.bron) + '</span>' : '')
        + '</div>'
        + (x.actie && !opts.alleenLezen && !(opts.docs && /^bg-.*-actie$/.test(x.actie)) ? '<button type="button" class="btn-outline btn-sm jr-knop" data-jr-actie="' + jrEsc(x.actie) + '">' + (eigen ? 'Uitvoeren' : 'Openen') + '</button>' : '')
        + '</li>';
    });
    h += '</ul>';
    if (d.doelwitten && (f.key === 'longlist' || f.key === 'markt') && d.doelwitten.length) {
      h += '<div class="jr-doelwitten"><div class="jr-sub">Doelwitten</div><ul>' + d.doelwitten.map(function (w) {
        return '<li><span>' + jrEsc(w.naam) + '</span>' + jrChip(w.uitkomst) + (w.traject_fase ? '<span class="jr-sub">transactie in fase ' + w.traject_fase + '</span>' : '') + '</li>';
      }).join('') + '</ul></div>';
    }
    var zij = ui2 && opts.docs;
    if (zij) h += '<div class="jr2-zij">' + jrAanZetHtml(f) + '<div class="jr2-zijkop">Documenten in deze fase</div>';
    if (opts.docs) h += '<div class="jr-docs" data-jr-docs="' + f.nr + '"></div>';
    if (zij) h += '</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

// Koppelt fasekeuze en knoppen. onActie(actie) wordt door de omgeving geleverd (mna of demo).
function jrWire(el, d, opts) {
  opts = opts || {};
  el.querySelectorAll('[data-jr-fase]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = Number(b.getAttribute('data-jr-fase'));
      if (typeof opts.onKies === 'function') opts.onKies(n);
      el.querySelectorAll('[data-jr-fase]').forEach(function (x) { var a = Number(x.getAttribute('data-jr-fase')) === n; x.classList.toggle('jr-actief', a); x.setAttribute('aria-selected', String(a)); });
      el.querySelectorAll('[data-jr-paneel]').forEach(function (p) { p.hidden = Number(p.getAttribute('data-jr-paneel')) !== n; });
    });
  });
  el.querySelectorAll('[data-jr-actie]').forEach(function (b) {
    b.addEventListener('click', function () { if (typeof opts.onActie === 'function') opts.onActie(b.getAttribute('data-jr-actie')); });
  });
  el.querySelectorAll('[data-jr-nvt-open]').forEach(function (b) {
    b.addEventListener('click', function () { var f = el.querySelector('[data-jr-nvt-form="' + b.getAttribute('data-jr-nvt-open') + '"]'); if (f) { f.hidden = !f.hidden; if (!f.hidden) f.reden.focus(); } });
  });
  el.querySelectorAll('[data-jr-nvt-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); if (typeof opts.onNvt === 'function') opts.onNvt(f.getAttribute('data-jr-nvt-form'), true, f.reden.value, f.querySelector('.jr-nvt-fout'), f.querySelector('button')); });
  });
  el.querySelectorAll('[data-jr-nvt]').forEach(function (b) {
    b.addEventListener('click', function () { if (typeof opts.onNvt === 'function') opts.onNvt(b.getAttribute('data-jr-nvt'), false, '', null, b); });
  });
}

// ── mna-koppeling ──────────────────────────────────────────────────────────────────────────────────────────────
var JR = { cache: {}, bezig: {} };
function jrSleutel(soort) { return soort + ':' + (typeof S !== 'undefined' && S ? S.code : ''); }
function jrLaad(soort, klaar) {
  if (typeof S === 'undefined' || !S || !S.code || typeof WORKER === 'undefined') return;
  var k = jrSleutel(soort), c = JR.cache[k];
  if (c && Date.now() - c.t < 15000) { klaar(c.d); return; }
  if (c) klaar(c.d); // verouderde cache direct tonen, daarna verversen met verse gegevens
  // Een tweede plaatshouder (het scherm tekent zich bijvoorbeeld opnieuw na de VOK-controle) wacht op het lopende verzoek.
  JR.wacht = JR.wacht || {};
  (JR.wacht[k] = JR.wacht[k] || []).push(klaar);
  if (JR.bezig[k]) return;
  JR.bezig[k] = true;
  var url = WORKER + (soort === 'koopmandaat' ? '/mna/journey/koopmandaat/' : '/mna/journey/') + encodeURIComponent(S.code);
  var headers = {};
  if (soort === 'koopmandaat' || (typeof isTussen === 'function' && isTussen())) headers['x-tussen-key'] = S._bgKey || S.code;
  var code = S.code;
  fetchMetTimeout(url, { method: 'GET', headers: headers, cache: 'no-store' }, 20000)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { JR.bezig[k] = false; var w = JR.wacht[k] || []; JR.wacht[k] = []; if (!d || !d.ok || !S || S.code !== code) return; JR.cache[k] = { d: d, t: Date.now() }; w.forEach(function (f) { f(d); }); })
    .catch(function () { JR.bezig[k] = false; JR.wacht[k] = []; });
}
function jrVernieuw() { JR.cache = {}; }
function jrScroll(id) {
  var e = document.getElementById(id);
  if (!e) return false;
  if (typeof mtToonElement === 'function') mtToonElement(e); // begeleider: eerst het scherm openen waar het onderdeel staat
  e.scrollIntoView({ behavior: 'smooth', block: 'center' });
  e.classList.add('jr-markeer'); setTimeout(function () { e.classList.remove('jr-markeer'); }, 1800);
  return true;
}
function jrNaarFase(faseId, paneelId) {
  if (typeof isTussen === 'function' && isTussen() && typeof openBegeleiderFase === 'function') openBegeleiderFase(faseId);
  else {
    var i = FASES.findIndex(function (f) { return f.id === faseId; }); S.screen = 'main'; S.fase = i >= 0 ? i : 0;
    // Zelfde laadstappen als openBegeleiderFase (mna/04): anders bleven documenten en bankmutaties van de fase
    // voor de verkoper op "laden" staan als die via de journey binnenkwam.
    var fid = FASES[S.fase] && FASES[S.fase].id;
    if (fid && typeof DOCS !== 'undefined' && !DOCS[fid] && typeof loadDocsForFase === 'function') loadDocsForFase(fid);
    if (fid === 'financieel' && typeof BANKMUTATIES !== 'undefined' && BANKMUTATIES === null && typeof laadBankmutaties === 'function') laadBankmutaties();
    if (fid === 'financieel' && typeof BANKMUTATIES_ANALYSE !== 'undefined' && BANKMUTATIES_ANALYSE === null && typeof laadRedFlagAnalyse === 'function') laadRedFlagAnalyse();
    renderApp();
  }
  if (paneelId) setTimeout(function () { jrScroll(paneelId); }, 400);
}
// Alle acties openen een bestaand scherm of een bestaande knop. Onomkeerbare acties (afsluiten, opslaan) worden alleen
// in beeld gebracht, nooit automatisch uitgevoerd.
function jrActie(a) {
  if (a === 'verkoper-invullen') { S.screen = 'main'; renderApp(); return; }
  if (a === 'verkoper-transactievorm') return jrNaarFase('strategisch', 'tm-panel');
  if (a === 'verkoper-im-review') { if (!jrScroll('imr-panel')) { S.screen = 'main'; renderApp(); setTimeout(function () { jrScroll('imr-panel'); }, 400); } return; }
  if (a === 'verkoper-qa' || a === 'koper-qa') { S.screen = 'main'; renderApp(); return; }
  if (a === 'bg-sectie-financieel') return jrNaarFase('financieel', 'kb-panel');
  if (a === 'bg-sectie-waardering') { S.screen = 'waardering'; renderApp(); return; }
  if (a === 'bg-ca-opslaan') { jrScroll('bg-ca-chk'); return; }
  if (/^bg-tab-(longlist|kandidaten|shortlist)$/.test(a) || a === 'verkoper-shortlist') { if (typeof kdOpen === 'function') kdOpen(a); return; }
  if (a === 'bg-afsluiten') { jrScroll('bg-afsluiten'); return; }
  if (a === 'koper-nda' || a === 'koper-loi') { var slot = a === 'koper-nda' ? 'composer-nda-slot' : 'composer-loi-slot'; if (!jrScroll(slot)) { S.screen = 'cover'; renderApp(); setTimeout(function () { jrScroll(slot); }, 400); } return; }
  if (a === 'koper-bod') { if (!jrScroll('koper-bod-sectie')) { S.screen = 'cover'; renderApp(); setTimeout(function () { jrScroll('koper-bod-sectie'); }, 400); } return; }
  var knop = document.getElementById(a);
  if (knop && !knop.disabled) { if (typeof mtToonElement === 'function') mtToonElement(knop); knop.scrollIntoView({ behavior: 'smooth', block: 'center' }); knop.click(); }
}
// Begeleider: de bestaande documentkaarten (zelfde id's en koppelingen) verhuizen naar de fase waar ze horen.
function jrPlaatsKaarten(el, d) {
  var bak = document.getElementById('jr-kaartenbak');
  if (!bak) return;
  d.fasen.forEach(function (f) {
    var vak = el.querySelector('[data-jr-docs="' + f.nr + '"]');
    if (!vak) return;
    f.items.forEach(function (x) {
      var k = x.actie && document.getElementById(x.actie);
      if (k && k.classList.contains('stap-kaart')) { if (!vak.classList.contains('stap-grid')) vak.classList.add('stap-grid'); vak.appendChild(k); }
    });
  });
  var rest = bak.querySelectorAll('.stap-kaart');
  var restKop = document.getElementById('jr-overig');
  if (restKop) restKop.hidden = !rest.length;
}
function jrMount() {
  if (typeof S === 'undefined' || !S) return;
  var plekken = [['jr-begeleider', 'traject'], ['jr-portaal', 'traject'], ['jr-koopmandaat', 'koopmandaat']];
  plekken.forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (!el || el.getAttribute('data-jr-klaar') === '1') return;
    el.setAttribute('data-jr-klaar', '1');
    jrLaad(p[1], function (d) {
      el = document.getElementById(p[0]);
      if (!el) return;
      var kies = (S._jrKeuze && S._jrKeuze.code === S.code && S._jrKeuze.soort === p[1]) ? S._jrKeuze.fase : null;
      var docs = p[0] === 'jr-begeleider';
      // Verplaatste documentkaarten eerst terug naar de kaartenbak, anders gaan ze bij hertekenen verloren.
      var bak = document.getElementById('jr-kaartenbak');
      if (docs && bak) el.querySelectorAll('.stap-kaart').forEach(function (k) { bak.appendChild(k); });
      el.innerHTML = jrHtml(d, { gekozen: kies, docs: docs, titel: p[1] === 'koopmandaat' ? 'Journey van dit koopmandaat' : (docs ? '' : 'M&A Journey') });
      if (el.classList.contains('jr-plek')) el.classList.add('panel');
      jrWire(el, d, { onActie: jrActie, onNvt: docs && typeof jrNvt === 'function' ? jrNvt : null, onKies: function (n) { S._jrKeuze = { code: S.code, soort: p[1], fase: n }; } });
      if (docs) { jrPlaatsKaarten(el, d); var oud = document.getElementById('jr-fallback-kop'); if (oud) oud.hidden = true; }
    });
  });
}
// Schermen die asynchroon tekenen (begeleiderdashboard na de VOK-controle, koopmandaat) krijgen hun journey zodra de
// plaatshouder in de DOM staat; jrMount zelf slaat al gevulde plaatshouders over.
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var app = document.getElementById('app'); if (!app) return;
  var gepland = false;
  new MutationObserver(function () { if (gepland) return; gepland = true; setTimeout(function () { gepland = false; jrMount(); }, 50); }).observe(app, { childList: true, subtree: true });
})();
