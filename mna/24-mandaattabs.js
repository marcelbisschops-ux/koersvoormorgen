// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// UX-correctie (GO Marcel 05-11-2026): de begeleider werkt in één applicatie met een vaste navigatie links en een
// dashboard als startpagina. Elk hoofdonderdeel is een eigen scherm; er wordt niet meer naar secties verderop gescrold.
// Alleen presentatie en navigatie: de bestaande onderdelen (zelfde id's, koppelingen, rechten en gegevens) worden per
// scherm getoond of verborgen. Geen nieuwe backendroutes. Vervangt de scrollende onderdeelwijzer (mt-balk) van WF-001.
//
// Werking: na elke render (MutationObserver op #app) krijgt #app een zijbalk zolang de begeleider in een van zijn
// schermen is. Op het dashboardscherm ('begeleider') krijgt elk blok een schermlabel; alleen de blokken van het gekozen
// scherm zijn zichtbaar. Een onbekend (nieuw) blok valt onder het dashboard, zodat nooit iets onbereikbaar wordt.
var MT = { scherm: 'dashboard', code: null };
var MT_SCHERMEN = [
  ['dashboard', 'Dashboard', '&#9638;'],
  ['dd', 'Due diligence', '&#9745;'],
  ['documenten', 'Documenten', '&#128196;'],
  ['kandidaten', 'Kandidaten', '&#128101;'],
  ['communicatie', 'Communicatie', '&#128172;'],
  ['analyse', 'Analyse en waardering', '&#128202;'],
  ['toegang', 'Koper-toegang', '&#128275;']
];
// Design 2.0 (N-174 R1): alleen met <html data-ui="2">. Zonder schakelaar blijft alles exact zoals hierboven.
function mtUi2() { return typeof document !== 'undefined' && document.documentElement.getAttribute('data-ui') === '2'; }
function mtSchermen() {
  if (!mtUi2()) return MT_SCHERMEN;
  return [MT_SCHERMEN[0], ['journey', 'Journey', '']].concat(MT_SCHERMEN.slice(1));
}
// Andere begeleiderschermen horen bij een menu-item (zelfde app, ander bestaand scherm).
var MT_SCREEN_MENU = { begeleider: null, main: 'dd', dataroom: 'documenten', waardering: 'analyse', logboek: 'communicatie', handleiding: 'handleiding', summary: 'dd', koopmandaat: 'dashboard' };
function mtEsc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function mtActief() { return typeof S !== 'undefined' && S && typeof isTussen === 'function' && isTussen() && Object.prototype.hasOwnProperty.call(MT_SCREEN_MENU, S.screen); }
function mtWrap() { var app = document.getElementById('app'); return app && app.querySelector(':scope > .wrap, :scope > div > .wrap'); }

// Schermlabel van een blok op het dashboard, op basis van de bestaande id's erin (geen tekstherkenning).
function mtSchermVanBlok(el) {
  var id = el.id || '';
  var heeft = function (sel) { return !!(el.matches && el.matches(sel)) || !!el.querySelector(sel); };
  if (el.tagName === 'NAV' && id === 'mt-balk') return 'weg';
  // Losse kop boven de DD-categorieën (geen id in het dashboard): hoort bij het DD-scherm.
  if (!el.children.length && el.textContent.trim() === 'Due diligence voortgang') return 'dd';
  if (/^bg-[a-z-]+-out$/.test(id)) return 'uitvoer';
  if (id === 'kb-topbanner') return 'altijd';
  if (mtUi2() && heeft('#jr-begeleider')) return 'journey';
  if (id === 'kd-plek') return 'kandidaten';
  if (id === 'bg-consistentie') return 'documenten';
  if (id === 'mt-dd-anker' || heeft('[id^="bg-risico-badge-"]')) return 'dd';
  if (heeft('#bg-dataroom-actie, #bg-docs-sectie')) return 'documenten';
  if (heeft('#bg-gesprek-actie, #bg-gesprekken-sectie, #bg-uitnodigen-btn')) return 'communicatie';
  if (heeft('#bg-waardering-actie, #bg-ai-status-actie, #bg-koperfit-actie')) return 'analyse';
  if (heeft('#bg-toegang, #wz-panel')) return 'toegang';
  return 'dashboard';
}
function mtBlokken() {
  var wrap = mtWrap(); if (!wrap) return [];
  var kinderen = Array.prototype.slice.call(wrap.children);
  // Het eerste blok is de kopregel (titel, terug naar adviseursportaal, verversen): altijd zichtbaar.
  return kinderen.map(function (el, i) { if (!el.hasAttribute('data-mt-scherm')) { var s = i === 0 && !el.id ? 'altijd' : mtSchermVanBlok(el); el.setAttribute('data-mt-scherm', s); } return el; });
}
function mtBeschikbaar() {
  var aanwezig = {};
  mtBlokken().forEach(function (el) { var s = el.getAttribute('data-mt-scherm'); if (s === 'kandidaten' && el.hidden) return; aanwezig[s] = true; });
  return mtSchermen().filter(function (s) { return s[0] === 'dashboard' || aanwezig[s[0]]; });
}

// Toon op het dashboardscherm alleen de blokken van het gekozen onderdeel.
function mtToepassen() {
  var wrap = mtWrap(); if (!wrap || S.screen !== 'begeleider') return;
  var blokken = mtBlokken();
  if (!mtBeschikbaar().some(function (s) { return s[0] === MT.scherm; })) MT.scherm = 'dashboard';
  blokken.forEach(function (el) {
    var s = el.getAttribute('data-mt-scherm');
    if (s === 'weg') { el.remove(); return; }
    if (s === 'uitvoer') {
      // Een resultaat (composer, teaser, analyse) hoort bij het scherm waar het werd opgevraagd.
      var leeg = !el.innerHTML.trim() || el.style.display === 'none';
      if (leeg) el.removeAttribute('data-mt-eigen');
      else if (!el.hasAttribute('data-mt-eigen')) el.setAttribute('data-mt-eigen', MT.scherm);
      s = el.getAttribute('data-mt-eigen') || MT.scherm;
    }
    if (s === 'altijd' || s === MT.scherm) el.removeAttribute('data-mt-verborgen'); else el.setAttribute('data-mt-verborgen', '1');
    // Op een eigen scherm is ingeklapte inhoud (accordeon uit het oude lange dashboard) gewoon open.
    if (MT.scherm !== 'dashboard' && s === MT.scherm) el.querySelectorAll('.bg-sec-body').forEach(function (b) {
      if (b.style.display === 'none') { b.style.display = 'block'; var ch = el.querySelector('.bg-sec-chevron[data-sec="' + b.getAttribute('data-sec') + '"]'); if (ch) ch.innerHTML = '&#9650;'; }
    });
  });
  mtTegels(wrap);
}

// Dashboardtegels: per onderdeel de actuele stand uit de bestaande blokken, met één klik naar het scherm.
var MT_UITLEG = {
  journey: 'Alle 14 fasen van de transactie met taken, uitvoerder, status en de documenten per fase.',
  dd: 'Voortgang per categorie. Open een categorie om de ingevulde gegevens en documenten te bekijken of een risico vast te leggen.',
  documenten: 'Alle documenten van dit traject en de controle op tegenstrijdigheden tussen documenten.',
  kandidaten: 'Longlist, shortlist en het besluit van de opdrachtgever per kandidaat.',
  communicatie: 'Gesprekken vastleggen, partijen uitnodigen en informatieverzoeken.',
  analyse: 'Waardering, herkomst van ingevulde gegevens en koperfit.',
  toegang: 'Bepaal per categorie wat de koper mag inzien.'
};
function mtSchermkop(wrap) {
  var kop = document.getElementById('mt-schermkop');
  if (MT.scherm === 'dashboard') { if (kop) kop.setAttribute('data-mt-verborgen', '1'); return; }
  if (!kop) {
    kop = document.createElement('div'); kop.id = 'mt-schermkop'; kop.className = 'mt-tegels-kop mt-schermkop'; kop.setAttribute('data-mt-scherm', 'altijd');
    var na = wrap.querySelector('[data-mt-scherm="altijd"]'); wrap.insertBefore(kop, na ? na.nextSibling : wrap.firstChild);
  }
  kop.removeAttribute('data-mt-verborgen');
  var s = mtSchermen().filter(function (x) { return x[0] === MT.scherm; })[0];
  var h = '<h2>' + mtEsc(s ? s[1] : '') + '</h2><span class="mt-sub">' + mtEsc(MT_UITLEG[MT.scherm] || '') + '</span>';
  if (kop.getAttribute('data-mt-html') !== h) { kop.innerHTML = h; kop.setAttribute('data-mt-html', h); }
}
function mtTegels(wrap) {
  mtSchermkop(wrap);
  var bak = document.getElementById('mt-tegels');
  if (MT.scherm !== 'dashboard') { if (bak) bak.setAttribute('data-mt-verborgen', '1'); return; }
  if (!bak) {
    bak = document.createElement('section'); bak.id = 'mt-tegels'; bak.className = 'mt-tegels'; bak.setAttribute('aria-label', 'Overzicht van dit traject');
    bak.setAttribute('data-mt-scherm', 'dashboard');
    var kop = wrap.querySelector('[data-mt-scherm="altijd"]');
    wrap.insertBefore(bak, kop ? kop.nextSibling : wrap.firstChild);
    bak.addEventListener('click', function (e) {
      var a = e.target.closest('[data-jr-actie]'); if (a && typeof jrActie === 'function') { jrActie(a.getAttribute('data-jr-actie')); return; }
      var b = e.target.closest('[data-mt-naar]'); if (b) mtNaar(b.getAttribute('data-mt-naar'));
    });
  }
  bak.removeAttribute('data-mt-verborgen');
  var tekst = function (sel) { var el = wrap.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var ddVelden = 0, ddCat = 0;
  wrap.querySelectorAll('[data-mt-scherm="dd"]').forEach(function (el) { var m = el.textContent.match(/(\d+)\s+velden? ingevuld/); if (m) { ddVelden += Number(m[1]); ddCat++; } });
  var docs = document.getElementById('bg-docs-sectie'), docsTekst = tekst('#bg-docs-sectie');
  var nDocs = docs && !/Nog geen|Laden/.test(docsTekst) ? docs.children.length : 0;
  var gesp = document.getElementById('bg-gesprekken-sectie'), gespTekst = tekst('#bg-gesprekken-sectie');
  var nGesp = gesp && !/Nog geen|Laden/.test(gespTekst) ? gesp.children.length : 0;
  var nKand = typeof KD !== 'undefined' && KD.data && KD.data.kandidaten ? KD.data.kandidaten.length : null;
  var toegang = /Nog geen toegang/.test(tekst('[data-mt-scherm="toegang"]')) ? 'Nog geen toegang gegeven' : 'Toegang ingesteld; bekijk of wijzig per categorie';
  var stand = {
    dd: ddCat ? ddVelden + ' velden ingevuld in ' + ddCat + ' categorieën' : 'Voortgang per categorie',
    documenten: /Laden/.test(docsTekst) ? 'Laden…' : nDocs ? nDocs + (nDocs === 1 ? ' document' : ' documenten') + ' in de dataroom' : 'Nog geen documenten',
    kandidaten: nKand === null ? 'Longlist, shortlist en besluit' : nKand + (nKand === 1 ? ' kandidaat' : ' kandidaten'),
    communicatie: /Laden/.test(gespTekst) ? 'Laden…' : nGesp ? nGesp + (nGesp === 1 ? ' gesprek vastgelegd' : ' gesprekken vastgelegd') : 'Nog geen gesprekken vastgelegd',
    analyse: 'Waardering, herkomst van gegevens en koperfit',
    toegang: toegang
  };
  if (mtUi2() && typeof mtCockpitHtml === 'function') {
    var hc = mtCockpitHtml(stand);
    if (bak.getAttribute('data-mt-html') !== hc) { bak.innerHTML = hc; bak.setAttribute('data-mt-html', hc); }
    return;
  }
  var h = '<div class="mt-tegels-kop"><h2>Overzicht</h2><span class="mt-sub">Kies een onderdeel om ermee te werken. De journey en de volgende stap staan hieronder.</span></div><div class="mt-tegel-grid">';
  mtBeschikbaar().forEach(function (s) {
    if (s[0] === 'dashboard') return;
    h += '<button type="button" class="mt-tegel" data-mt-naar="' + s[0] + '"><span class="mt-tegel-ico" aria-hidden="true">' + s[2] + '</span><span class="mt-tegel-naam">' + mtEsc(s[1]) + '</span><span class="mt-tegel-stand">' + mtEsc(stand[s[0]] || '') + '</span></button>';
  });
  h += '</div>';
  if (bak.getAttribute('data-mt-html') !== h) { bak.innerHTML = h; bak.setAttribute('data-mt-html', h); }
}

// Zijbalk: vaste navigatie links (desktop) of een balk bovenaan (tablet en mobiel).
function mtZijbalk() {
  var app = document.getElementById('app'); if (!app) return;
  var zij = document.getElementById('mt-zij');
  if (!mtActief()) { if (zij) zij.remove(); app.classList.remove('mt-shell'); document.body.classList.remove('mt-shell-aan'); return; }
  app.classList.add('mt-shell'); document.body.classList.add('mt-shell-aan');
  if (!zij) {
    zij = document.createElement('nav'); zij.id = 'mt-zij'; zij.setAttribute('aria-label', 'Onderdelen van dit traject');
    app.insertBefore(zij, app.firstChild);
    zij.addEventListener('click', function (e) { var b = e.target.closest('[data-mt-naar]'); if (b) mtNaar(b.getAttribute('data-mt-naar')); });
  } else if (zij !== app.firstChild) app.insertBefore(zij, app.firstChild);
  var actief = S.screen === 'begeleider' ? MT.scherm : MT_SCREEN_MENU[S.screen];
  var items = S.screen === 'begeleider' ? mtBeschikbaar() : mtSchermen().filter(function (s) { return s[0] !== 'kandidaten' || (MT.kandidatenBekend !== false); });
  var t = S.traject || {};
  var h = '<div class="mt-zij-kop"><span class="mt-zij-merk">Koers voor <b>Morgen</b></span><span class="mt-zij-traject" title="' + mtEsc(t.kantoor_naam || '') + '">' + mtEsc(t.kantoor_naam || 'Traject') + '</span>'
    + (t.traject_type ? '<span class="mt-zij-type">' + mtEsc(t.traject_type) + '</span>' : '')
    + (mtUi2() && typeof WORKER !== 'undefined' && /staging/.test(WORKER) ? '<span class="mt-zij-omgeving">Testomgeving (staging)</span>' : '') + '</div><ul class="mt-zij-lijst">';
  items.forEach(function (s) {
    h += '<li><button type="button" class="mt-zij-knop" data-mt-naar="' + s[0] + '"' + (actief === s[0] ? ' aria-current="page"' : '') + '><span class="mt-zij-ico" aria-hidden="true">' + (mtUi2() ? mtIcoon(s[0]) : s[2]) + '</span><span>' + mtEsc(s[1]) + '</span></button></li>';
  });
  h += '</ul><div class="mt-zij-voet"><button type="button" class="mt-zij-knop" data-mt-naar="handleiding"' + (actief === 'handleiding' ? ' aria-current="page"' : '') + '><span class="mt-zij-ico" aria-hidden="true">' + (mtUi2() ? mtIcoon('handleiding') : '&#128214;') + '</span><span>Handleiding</span></button>'
    // N-189: vaste ingang naar het overzicht van beveiliging, leveranciers en continuïteit (openbare pagina).
    + '<a class="mt-zij-knop" href="/platform/beveiliging-en-gegevens" target="_blank" rel="noopener"><span class="mt-zij-ico" aria-hidden="true">&#128274;</span><span>Beveiliging &amp; continuïteit</span></a></div>';
  if (zij.getAttribute('data-mt-html') !== h) {
    zij.innerHTML = h; zij.setAttribute('data-mt-html', h);
    // Tablet/mobiel (menu als balk): het actieve onderdeel altijd in beeld schuiven.
    if (mtUi2()) { var act = zij.querySelector('[aria-current="page"]'); if (act && zij.scrollWidth > zij.clientWidth) { try { act.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} } }
  }
  if (S.screen === 'begeleider') MT.kandidatenBekend = items.some(function (s) { return s[0] === 'kandidaten'; });
}

// Naar een scherm: het dashboardscherm met het gekozen onderdeel, of een bestaand begeleiderscherm (handleiding).
function mtNaar(id) {
  if (id === 'handleiding') { S.screen = 'handleiding'; renderApp(); try { window.scrollTo(0, 0); } catch (e) {} return; }
  MT.scherm = id;
  if (S.screen !== 'begeleider') { S.screen = 'begeleider'; renderApp(); }
  else { mtToepassen(); mtZijbalk(); }
  try { window.scrollTo(0, 0); } catch (e) {}
}
// Compatibel met bestaande aanroepen (WF-001): mtGa(id) opent nu het scherm in plaats van te scrollen.
function mtGa(id) { mtNaar({ overzicht: 'dashboard', journey: mtUi2() ? 'journey' : 'dashboard', dd: 'dd', documenten: 'documenten', kandidaten: 'kandidaten', communicatie: 'communicatie' }[id] || id); }
// Maak een element zichtbaar door het scherm te openen waar het in staat (voor knoppen uit de journey en meldingen).
function mtToonElement(el) {
  if (!el || !mtActief() || S.screen !== 'begeleider') return;
  var wrap = mtWrap(); if (!wrap) return;
  var blok = el; while (blok && blok.parentNode !== wrap) blok = blok.parentNode;
  if (!blok) return;
  var s = blok.getAttribute('data-mt-scherm');
  if (s === 'uitvoer') s = blok.getAttribute('data-mt-eigen');
  if (s && s !== 'altijd' && s !== 'weg' && s !== MT.scherm) { MT.scherm = s; mtToepassen(); mtZijbalk(); }
}
function mtMount() {
  if (typeof S === 'undefined' || !S) return;
  if (S.code !== MT.code) { MT.code = S.code; MT.scherm = 'dashboard'; MT.kandidatenBekend = undefined; }
  mtZijbalk();
  if (mtActief() && S.screen === 'begeleider') mtToepassen();
}
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var app = document.getElementById('app'); if (!app) return;
  var gepland = false;
  new MutationObserver(function () { if (gepland) return; gepland = true; setTimeout(function () { gepland = false; mtMount(); }, 30); }).observe(app, { childList: true, subtree: true });
})();
