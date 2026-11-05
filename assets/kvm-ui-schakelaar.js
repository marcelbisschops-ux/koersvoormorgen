// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM Design 2.0 — schakelaar (N-174). Zet <html data-ui="2"> zodat assets/kvm-design2.css de vormgeving van
// richting B toepast. Alleen weergave: geen gegevens, rechten of aanroepen veranderen.
// Productie-GO Marcel 05-11-2026: standaard AAN voor alle rollen en portalen. Terugvallen naar de vorige
// vormgeving kan per browser met ?ui=1 (blijft bewaard); ?ui=2 zet het weer aan.
(function () {
  var keuze = null;
  try {
    var q = new URLSearchParams(location.search).get('ui');
    if (q === '1' || q === '2') localStorage.setItem('kvm-ui', q);
    keuze = localStorage.getItem('kvm-ui');
  } catch (e) {
    try { keuze = new URLSearchParams(location.search).get('ui'); } catch (e2) { keuze = null; }
  }
  if (keuze !== '1') document.documentElement.setAttribute('data-ui', '2');
})();
