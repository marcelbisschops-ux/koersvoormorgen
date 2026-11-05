// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM Design 2.0 — render-hulpfuncties voor de k2-componenten (N-174, R0). Pure weergave: ontvangen gegevens
// worden alleen ge-escaped en opgemaakt; er wordt niets berekend, opgehaald of verzonnen. In R0 nog door geen
// enkel bestaand scherm gebruikt (alleen door de componentpagina en de tests); R1 gaat ze inzetten.
(function (root) {
  function esc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  // Statussen zoals de journey-backend ze levert (mna/22-journey.js JR_STATUS) → label + chipvariant.
  var STATUS = { gereed: ['Gereed', 'ok'], bezig: ['Bezig', 'info'], open: ['Open', ''], nvt: ['Niet van toepassing', ''],
    niet_beschikbaar: ['Nog niet beschikbaar', ''], voorbereiding: ['In voorbereiding', ''], afgevallen: ['Afgevallen', ''] };
  var EIGENAAR = { begeleider: 'Adviseur', verkoper: 'Verkoper', koper: 'Koper' };
  function k2Chip(tekst, variant) { return '<span class="k2-chip' + (variant ? ' k2-chip--' + esc(variant) : '') + '">' + esc(tekst) + '</span>'; }
  function k2StatusChip(status) { var s = STATUS[status] || [status || 'Open', '']; return k2Chip(s[0], s[1]); }
  // Besluit 2 (05-11-2026): een termijn alleen tonen als de backend er één levert, als geldige datum. Nooit een
  // afgeleide, geschatte of standaarddatum. Zonder termijn bestaat de cel niet (geen lege kolom).
  function k2Termijn(t) {
    if (!t || typeof t.termijn !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(t.termijn)) return null;
    var d = new Date(t.termijn.slice(0, 10) + 'T12:00:00Z');
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' });
  }
  // t: { label, status, eigenaar, actie_label?, termijn? } — velden zoals de journey-items (label/status/eigenaar).
  // actieHtml: optioneel, door de aanroeper gebouwde knop voor een BESTAANDE actie (geen nieuwe acties hier).
  function k2TaakRij(t, actieHtml) {
    t = t || {};
    var termijn = k2Termijn(t);
    return '<div class="k2-taak' + (termijn ? ' k2-taak--met-termijn' : '') + '" role="row">'
      + '<span class="k2-taak__label">' + esc(t.label) + '</span>'
      + '<span class="k2-taak__eigenaar">' + esc(EIGENAAR[t.eigenaar] || t.eigenaar || '') + '</span>'
      + (termijn ? '<span class="k2-taak__termijn">' + esc(termijn) + '</span>' : '')
      + k2StatusChip(t.status)
      + '<span class="k2-taak__actie">' + (actieHtml || '') + '</span>'
      + '</div>';
  }
  function k2Voortgang(deel, geheel) {
    var g = Number(geheel), d = Number(deel);
    if (!(g > 0) || !(d >= 0)) return '';
    var pct = Math.max(0, Math.min(100, Math.round((d / g) * 100)));
    return '<div class="k2-voortgang" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>';
  }
  function k2Kpi(label, waarde, toelichting) {
    return '<div class="k2-kpi"><span class="k2-kpi__label">' + esc(label) + '</span><span class="k2-kpi__waarde">' + esc(waarde) + '</span>'
      + (toelichting ? '<span class="k2-kpi__toelichting">' + esc(toelichting) + '</span>' : '') + '</div>';
  }
  var api = { k2Esc: esc, k2Chip: k2Chip, k2StatusChip: k2StatusChip, k2Termijn: k2Termijn, k2TaakRij: k2TaakRij, k2Voortgang: k2Voortgang, k2Kpi: k2Kpi };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else for (var k in api) root[k] = api[k];
})(typeof window !== 'undefined' ? window : this);
