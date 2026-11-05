// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM Design 2.0 — R1 (N-174, GO Marcel 05-11-2026, alleen staging/preview): dashboard-cockpit en iconen voor de
// begeleider. Wordt alleen gebruikt met <html data-ui="2"> (mtUi2() in mna/24-mandaattabs.js).
// Pure weergave van gegevens die de app al heeft: S._groepData (ingevulde DD-velden), de journey uit de backend
// (JR-cache van mna/22-journey.js), de kandidaten (KD), en de stand die bestaande blokken al tonen (aantal ingevulde
// velden, wijzigingenbadge, open afwijkingen). Geen extra verzoeken, geen berekende waardering, geen termijnen,
// geen geschatte cijfers: ontbreekt een gegeven, dan staat er dat het nog niet is ingevuld.
var MT_ICONEN = {
  dashboard: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  journey: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
  dd: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  documenten: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  kandidaten: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  communicatie: '<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  analyse: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  toegang: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/>',
  handleiding: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>'
};
function mtIcoon(id) {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (MT_ICONEN[id] || '') + '</svg>';
}

// Bedrag zoals ingevuld (tekst of getal) netjes tonen; alleen als het echt een bedrag is.
function k2Bedrag(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  var n = typeof parseGeld === 'function' ? parseGeld(String(v)) : Number(String(v).replace(/[^\d,-]/g, '').replace(',', '.'));
  if (!isFinite(n) || n === 0) return null;
  var abs = Math.abs(n);
  if (abs >= 1e6) return '€ ' + (n / 1e6).toLocaleString('nl-NL', { maximumFractionDigits: 2 }) + ' mln';
  return '€ ' + n.toLocaleString('nl-NL', { maximumFractionDigits: 0 });
}
function k2Procent(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  var n = Number(String(v).replace('%', '').replace(',', '.').trim());
  return isFinite(n) ? n.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + '%' : null;
}
function k2Kpi2(label, waarde, toel, naar) {
  var leeg = waarde === null || waarde === undefined || waarde === '';
  return '<div class="k2-kpi"><span class="k2-kpi__label">' + mtEsc(label) + '</span>'
    + '<span class="k2-kpi__waarde' + (leeg ? ' k2-kpi__waarde--leeg' : '') + '">' + mtEsc(leeg ? 'Nog niet ingevuld' : waarde) + '</span>'
    + (toel ? '<span class="k2-kpi__toelichting">' + mtEsc(toel) + '</span>' : '')
    + (naar ? '<button type="button" class="k2-kpi__link" data-mt-naar="' + mtEsc(naar) + '">Openen</button>' : '') + '</div>';
}
var MT_STATUS2 = { gereed: ['Gereed', 'ok'], bezig: ['Bezig', 'info'], open: ['Open', ''], nvt: ['N.v.t.', ''], niet_beschikbaar: ['Nog niet beschikbaar', ''], voorbereiding: ['In voorbereiding', ''], afgevallen: ['Afgevallen', ''] };
function mtChip2(st) { var x = MT_STATUS2[st] || [st || '', '']; return '<span class="k2-chip' + (x[1] ? ' k2-chip--' + x[1] : '') + '">' + mtEsc(x[0]) + '</span>'; }

function mtCockpitHtml(stand) {
  var t = S.traject || {}, g = S._groepData || {};
  var jd = (typeof JR !== 'undefined' && JR.cache && typeof jrSleutel === 'function' && JR.cache[jrSleutel('traject')]) ? JR.cache[jrSleutel('traject')].d : null;
  var wrap = mtWrap();
  // DD: hetzelfde getal als de bestaande tegel (som van "N velden ingevuld" per categorie).
  var ddVelden = 0, ddCat = 0;
  if (wrap) wrap.querySelectorAll('[data-mt-scherm="dd"]').forEach(function (el) { var m = el.textContent.match(/(\d+)\s+velden? ingevuld/); if (m) { ddVelden += Number(m[1]); ddCat++; } });
  var omzet3 = k2Bedrag(g.financieel_omzet3), omzet2 = k2Bedrag(g.financieel_omzet2);
  var ebNorm = k2Bedrag(g.financieel_ebitdaNorm), eb = k2Bedrag(g.financieel_ebitda);
  var recurring = k2Procent(g.financieel_recurring);
  var nKand = typeof KD !== 'undefined' && KD.data && KD.data.kandidaten ? KD.data.kandidaten.length : null;
  var nShort = nKand !== null ? KD.data.kandidaten.filter(function (k) { return k.stap === 'shortlist'; }).length : null;

  var h = '<div class="k2-cockpit">';
  // Kop
  h += '<div class="k2-cockpit-kop"><div><div class="k2-cockpit-eyebrow">' + mtEsc([t.traject_type, t.sector].filter(Boolean).join(' · ')) + '</div>'
    + '<h2 class="k2-cockpit-titel">' + mtEsc(t.kantoor_naam || 'Traject') + '</h2></div>';
  if (jd && jd.volgende_stap) h += '<button type="button" class="k2-knop k2-knop--primair" data-mt-naar="journey">Volgende stap: ' + mtEsc(jd.volgende_stap.label) + '</button>';
  h += '</div>';

  // KPI-rij: alleen wat er is ingevuld of door de backend geleverd.
  var huidig = jd && jd.fasen ? jd.fasen.filter(function (f) { return f.nr === jd.huidige_fase; })[0] : null;
  var telt = jd && jd.fasen ? jd.fasen.filter(function (f) { return f.status !== 'nvt'; }) : [];
  var gereed = telt.filter(function (f) { return f.status === 'gereed'; }).length;
  h += '<div class="k2-kpi-rij">'
    + k2Kpi2('Omzet laatste jaar', omzet3, omzet2 ? 'Jaar ervoor ' + omzet2 : 'Uit due diligence, financieel', 'dd')
    + k2Kpi2(ebNorm ? 'Genormaliseerde EBITDA' : 'EBITDA laatste jaar', ebNorm || eb, recurring ? 'Recurring omzet ' + recurring : 'Uit due diligence, financieel', 'dd')
    + k2Kpi2('Due diligence', ddCat ? ddVelden + ' velden' : null, ddCat ? 'ingevuld in ' + ddCat + ' categorieën' : 'Nog geen velden ingevuld', 'dd')
    + k2Kpi2('Transactie', huidig ? 'Fase ' + huidig.nr + ' van ' + jd.fasen.length : (jd ? null : 'Laden…'), huidig ? huidig.titel + ' · ' + gereed + ' van ' + telt.length + ' fasen gereed' : '', 'journey')
    + (mtBeschikbaar().some(function (s) { return s[0] === 'kandidaten'; }) ? k2Kpi2('Kandidaten', nKand === null ? 'Laden…' : nKand ? String(nKand) : '0', nKand ? nShort + ' op de shortlist' : 'Nog geen kandidaten', 'kandidaten') : '')
    + '</div>';

  // Journey compact + volgende acties
  h += '<div class="k2-rij-2">';
  h += '<section class="k2-kaart"><div class="k2-kaart__kop"><h3 class="k2-kaart__titel">Transactiejourney</h3>'
    + (jd ? '<span class="k2-chip k2-chip--ok">' + gereed + ' van ' + telt.length + ' fasen gereed</span>' : '')
    + '<button type="button" class="k2-kaart__actie" data-mt-naar="journey">Volledige journey</button></div>';
  if (jd && jd.fasen && jd.fasen.length === 14 && typeof JR2_ETAPPES !== 'undefined') {
    h += '<ol class="k2-mijlpalen">';
    JR2_ETAPPES.forEach(function (e) {
      var fs = jd.fasen.slice(e[1], e[2]), tl = fs.filter(function (f) { return f.status !== 'nvt'; });
      var gr = tl.filter(function (f) { return f.status === 'gereed'; }).length;
      var nu = fs.some(function (f) { return f.nr === jd.huidige_fase; }), klaar = tl.length > 0 && gr === tl.length;
      h += '<li class="k2-mijlpaal' + (klaar ? ' is-klaar' : '') + (nu ? ' is-nu' : '') + '"><span class="k2-mijlpaal__punt">' + (klaar ? '&#10003;' : '') + '</span>'
        + '<span class="k2-mijlpaal__naam">' + mtEsc(e[0]) + '</span><span class="k2-mijlpaal__sub">' + (tl.length ? gr + '/' + tl.length : 'n.v.t.') + '</span></li>';
    });
    h += '</ol>';
  }
  if (huidig) {
    var open = huidig.items.filter(function (x) { return x.status !== 'nvt'; });
    var klaarTaken = open.filter(function (x) { return x.status === 'gereed'; }).length;
    h += '<div class="k2-huidig"><span class="k2-chip k2-chip--info">Huidige fase</span><b>' + mtEsc(huidig.titel) + '</b>'
      + '<span class="k2-huidig__sub">' + (open.length ? klaarTaken + ' van ' + open.length + ' taken gereed' : 'Geen taken in deze fase') + '</span>'
      + (open.length ? '<div class="k2-voortgang k2-huidig__balk"><i style="width:' + Math.round(klaarTaken / open.length * 100) + '%"></i></div>' : '') + '</div>';
  } else if (!jd) h += '<div class="k2-leeg">Journey wordt geladen…</div>';
  h += '</section>';

  // Volgende acties: open en lopende taken uit de huidige en eerdere fasen, in fasevolgorde.
  var acties = [];
  if (jd && jd.fasen) jd.fasen.forEach(function (f) {
    if (f.nr > (jd.huidige_fase || 0)) return;
    f.items.forEach(function (x) { if (x.status === 'open' || x.status === 'bezig') acties.push({ f: f, x: x }); });
  });
  h += '<section class="k2-kaart"><div class="k2-kaart__kop"><h3 class="k2-kaart__titel">Volgende acties</h3>' + (acties.length ? '<span class="k2-chip">' + acties.length + '</span>' : '') + '</div>';
  if (!jd) h += '<div class="k2-leeg">Laden…</div>';
  else if (!acties.length) h += '<div class="k2-leeg">Geen openstaande taken tot en met de huidige fase.</div>';
  else {
    h += '<ul class="k2-acties">';
    acties.slice(0, 6).forEach(function (a) {
      var knop = a.x.actie && !/^bg-.*-actie$/.test(a.x.actie)
        ? '<button type="button" class="k2-knop k2-knop--klein" data-jr-actie="' + mtEsc(a.x.actie) + '">Openen</button>'
        : '<button type="button" class="k2-knop k2-knop--klein" data-mt-naar="journey" data-k2-fase="' + a.f.nr + '">Naar fase</button>';
      h += '<li class="k2-actie"><div class="k2-actie__tekst"><b>' + mtEsc(a.x.label) + '</b><span>' + mtEsc((JR_EIGENAAR[a.x.eigenaar] || a.x.eigenaar || '') + ' · fase ' + a.f.nr) + '</span></div>' + mtChip2(a.x.status) + knop + '</li>';
    });
    if (acties.length > 6) h += '<li class="k2-actie k2-actie--meer"><button type="button" class="k2-kaart__actie" data-mt-naar="journey">Nog ' + (acties.length - 6) + ' taken in de journey</button></li>';
    h += '</ul>';
  }
  h += '</section></div>';

  // Aandachtspunten: uitsluitend signalen die het dashboard al heeft.
  var punten = [];
  var badge = document.getElementById('wz-badge');
  var nWz = badge && badge.style.display !== 'none' ? (badge.textContent.match(/\d+/) || [])[0] : null;
  if (nWz && Number(nWz) > 0) punten.push(['Wijziging', 'let', nWz === '1' ? 'De verkoper heeft 1 nieuwe wijziging gedaan' : 'De verkoper heeft ' + nWz + ' nieuwe wijzigingen gedaan', 'toegang']);
  var cons = document.getElementById('bg-consistentie'), m = cons && cons.textContent.match(/(\d+)\s+open/);
  if (m && Number(m[1]) > 0) punten.push(['Documenten', 'fout', m[1] + ' open afwijking(en) tussen documenten', 'documenten']);
  if (jd && jd.fasen) jd.fasen.forEach(function (f) {
    if (f.nr > (jd.huidige_fase || 0)) return;
    f.items.forEach(function (x) { if ((x.status === 'open' || x.status === 'bezig') && (x.eigenaar === 'verkoper' || x.eigenaar === 'koper')) punten.push(['Wacht op ' + (JR_EIGENAAR[x.eigenaar] || x.eigenaar).toLowerCase(), 'info', x.label, 'journey']); });
  });
  h += '<div class="k2-rij-3"><section class="k2-kaart"><div class="k2-kaart__kop"><h3 class="k2-kaart__titel">Aandachtspunten</h3>' + (punten.length ? '<span class="k2-chip k2-chip--let">' + punten.length + '</span>' : '') + '</div>';
  h += punten.length ? '<ul class="k2-punten">' + punten.slice(0, 6).map(function (p) { return '<li><span class="k2-chip k2-chip--' + p[1] + '">' + mtEsc(p[0]) + '</span><span class="k2-punt__tekst">' + mtEsc(p[2]) + '</span><button type="button" class="k2-kaart__actie" data-mt-naar="' + p[3] + '">Bekijken</button></li>'; }).join('') + '</ul>'
    : '<div class="k2-leeg">Geen aandachtspunten.</div>';
  h += '</section>';

  // Onderdelen: dezelfde snelkoppelingen als de oude tegels, met dezelfde stand.
  h += '<section class="k2-kaart"><div class="k2-kaart__kop"><h3 class="k2-kaart__titel">Onderdelen</h3></div><ul class="k2-onderdelen">';
  mtBeschikbaar().forEach(function (s) {
    if (s[0] === 'dashboard' || s[0] === 'journey') return;
    h += '<li><button type="button" class="k2-onderdeel" data-mt-naar="' + s[0] + '"><span class="k2-onderdeel__ico">' + mtIcoon(s[0]) + '</span><span class="k2-onderdeel__naam">' + mtEsc(s[1]) + '</span><span class="k2-onderdeel__stand">' + mtEsc(stand[s[0]] || '') + '</span></button></li>';
  });
  h += '</ul></section></div></div>';
  return h;
}

// "Naar fase" op het dashboard: open de journey op die fase via de bestaande faseknop.
(function () {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-k2-fase]'); if (!b) return;
    var n = b.getAttribute('data-k2-fase');
    setTimeout(function () { var knop = document.querySelector('#jr-begeleider [data-jr-fase="' + n + '"]'); if (knop) knop.click(); }, 60);
  });
})();
