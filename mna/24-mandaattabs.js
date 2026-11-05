// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-FUNC-WF-001 (WF-B/WF-M): contexttabs per mandaat in het begeleiderdashboard. Een vaste balk bovenaan het
// mandaat die direct naar de onderdelen springt (overzicht, journey, kandidaten, documenten, due diligence,
// communicatie). Alleen navigatie: de onderdelen zelf, hun gegevens en rechten blijven ongewijzigd.
var MT_SECTIES = [
  ['overzicht', 'Overzicht', function () { return document.getElementById('mt-balk'); }],
  ['journey', 'Journey', function () { var e = document.getElementById('jr-begeleider'); return e && (e.closest('.panel') || e); }],
  ['kandidaten', 'Kandidaten', function () { var e = document.getElementById('kd-plek'); return e && !e.hidden ? e : null; }],
  ['documenten', 'Documenten', function () { return document.getElementById('jr-kaartenbak') && document.getElementById('jr-begeleider'); }],
  ['dd', 'Due diligence', function () { return document.getElementById('mt-dd-anker'); }],
  ['communicatie', 'Communicatie', function () { var e = document.getElementById('bg-gesprek-actie'); return e && e.closest('.panel'); }]
];
function mtEsc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function mtTeken() {
  var balk = document.getElementById('mt-balk'); if (!balk) return;
  var h = MT_SECTIES.filter(function (s) { return !!s[2](); }).map(function (s) { return '<button type="button" class="mt-tab" data-mt="' + s[0] + '">' + mtEsc(s[1]) + '</button>'; }).join('');
  if (balk.getAttribute('data-mt-html') !== h) { balk.innerHTML = h; balk.setAttribute('data-mt-html', h); }
}
function mtGa(id) {
  var s = MT_SECTIES.filter(function (x) { return x[0] === id; })[0]; var e = s && s[2](); if (!e) return;
  if (id === 'kandidaten' && typeof kdOpen === 'function') { kdOpen('bg-tab-longlist'); return; }
  var balk = document.getElementById('mt-balk'), y = id === 'overzicht' ? 0 : e.getBoundingClientRect().top + window.scrollY - (balk ? balk.offsetHeight + 8 : 0);
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  document.querySelectorAll('#mt-balk .mt-tab').forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-mt') === id)); });
}
function mtMount() {
  if (typeof S === 'undefined' || !S || typeof isTussen !== 'function' || !isTussen()) return;
  var jr = document.getElementById('jr-begeleider'); if (!jr) return;
  // Anker voor de due-diligenceblokken (kopregel zonder id in het dashboard).
  if (!document.getElementById('mt-dd-anker')) {
    var kop = Array.prototype.filter.call(document.querySelectorAll('#app div'), function (d) { return d.children.length === 0 && d.textContent.trim() === 'Due diligence voortgang'; })[0];
    if (kop) kop.id = 'mt-dd-anker';
  }
  if (!document.getElementById('mt-balk')) {
    var ca = document.getElementById('bg-ca-chk'), eerste = (ca && (ca.closest('.panel') || ca.parentNode && ca.parentNode.parentNode)) || jr.closest('.panel');
    if (!eerste || !eerste.parentNode) return;
    var nav = document.createElement('nav');
    nav.id = 'mt-balk'; nav.className = 'mt-balk'; nav.setAttribute('aria-label', 'Onderdelen van dit mandaat');
    eerste.parentNode.insertBefore(nav, eerste);
    nav.addEventListener('click', function (e) { var b = e.target.closest('[data-mt]'); if (b) mtGa(b.getAttribute('data-mt')); });
  }
  mtTeken();
}
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var app = document.getElementById('app'); if (!app) return;
  var gepland = false;
  new MutationObserver(function () { if (gepland) return; gepland = true; setTimeout(function () { gepland = false; mtMount(); }, 80); }).observe(app, { childList: true, subtree: true });
})();
