// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM Design 2.0 — schakelaar (N-174, R0, besluit Marcel 05-11-2026).
// Zet <html data-ui="2"> zodat assets/kvm-design2.css de nieuwe vormgeving toepast. Alleen weergave: geen
// gegevens, rechten of aanroepen veranderen. Aan: ?ui=2 (blijft bewaard in dit tabblad-profiel). Uit: ?ui=1.
// R0: op het productiedomein (koersvoormorgen.nl) kan de schakelaar NIET aan; productie blijft ongewijzigd
// tot een aparte productie-GO (R3). Deze regel wordt pas bij die GO bewust aangepast.
(function () {
  var host = String(location.hostname || '').toLowerCase();
  var PROD = 'koersvoormorgen.nl';
  if (host === PROD || (host.length > PROD.length && host.slice(-(PROD.length + 1)) === '.' + PROD)) return;
  var keuze = null;
  try {
    var q = new URLSearchParams(location.search).get('ui');
    if (q === '1' || q === '2') localStorage.setItem('kvm-ui', q);
    keuze = localStorage.getItem('kvm-ui');
  } catch (e) {
    try { keuze = new URLSearchParams(location.search).get('ui'); } catch (e2) { keuze = null; }
  }
  if (keuze === '2') document.documentElement.setAttribute('data-ui', '2');
})();
