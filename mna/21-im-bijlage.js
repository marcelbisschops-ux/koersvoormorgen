// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase E v4 (29 okt 2026): optionele bijlage kolommenbalans achter het informatiememorandum (worker/49).
// Alleen de begeleider, onder het memorandum in het dashboard. Alleen een kolommenbalans met status gereed kan een
// bijlage zijn; de bijlage wordt bij elke PDF uit de bron opgebouwd en is geen bewerkbare tekst. Laadt na mna/16
// (hergebruikt finEsc/finAntw/finHeaders).
var IMBJ = { code: null, data: null, bezig: false, fout: null };
function imbjTeken() {
  var el = document.getElementById('imbj-bg'); if (!el) return;
  if (!isTussen()) { el.innerHTML = ''; return; }
  var h = '<div style="margin-top:.75rem;padding-top:.75rem;border-top:1px dashed var(--border2)"><div style="font-size:13px;font-weight:600;margin-bottom:4px">Bijlage kolommenbalans</div>';
  if (IMBJ.fout) h += '<div style="font-size:12px;color:var(--red);margin-bottom:4px">' + finEsc(IMBJ.fout) + '</div>';
  var d = IMBJ.data;
  if (!d) { el.innerHTML = h + '<div style="font-size:12px;color:var(--muted)">Laden…</div></div>'; return; }
  if (!d.beschikbaar.length) { el.innerHTML = h + '<div style="font-size:12px;color:var(--muted)">Er is nog geen kolommenbalans aangeleverd.</div></div>'; return; }
  h += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">Kies welke kolommenbalansen als bijlage achter het memorandum komen. Alleen een kolommenbalans die gereed is (debet en credit sluiten, alles ingedeeld) kan mee. De bijlage komt altijd ongewijzigd uit de bron.</div>';
  d.beschikbaar.forEach(function (b) {
    h += '<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;margin-right:12px;' + (b.gereed ? '' : 'color:var(--muted)') + '"><input type="checkbox" class="imbj-jaar" value="' + b.jaar + '"'
      + (d.gekozen.indexOf(b.jaar) >= 0 ? ' checked' : '') + (b.gereed && !IMBJ.bezig ? '' : ' disabled') + '> ' + b.jaar + (b.gereed ? '' : ' (nog niet gereed)') + '</label>';
  });
  h += '<button class="btn-ghost btn-sm" style="font-size:11px;margin-left:4px" onclick="imbjBewaar()"' + (IMBJ.bezig ? ' disabled' : '') + '>Bijlagen opslaan</button></div>';
  el.innerHTML = h;
}
function imbjVerwerk(x, ok) {
  IMBJ.bezig = false;
  if (x.s === 200 && x.d && x.d.ok === true) { IMBJ.data = x.d; IMBJ.fout = null; if (ok) toast(ok); }
  else { IMBJ.fout = x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')); if (x.s === 409 && x.d && x.d.code === 'REV_CONFLICT') setTimeout(imbjLaad, 0); }
  imbjTeken();
}
window.imbjLaad = function () {
  if (!isTussen() || !S.code) return;
  if (IMBJ.code !== S.code) { IMBJ.code = S.code; IMBJ.data = null; IMBJ.fout = null; }
  var code = S.code; imbjTeken();
  finAntw(fetchMetTimeout(WORKER + '/mna/verkoopmemorandum/bijlagen?code=' + encodeURIComponent(code), { method: 'GET', headers: finHeaders() }, 30000)).then(function (x) { if (IMBJ.code === code) imbjVerwerk(x, null); });
};
window.imbjBewaar = function () {
  if (IMBJ.bezig || !IMBJ.data) return;
  var jaren = []; document.querySelectorAll('#imbj-bg .imbj-jaar').forEach(function (c) { if (c.checked) jaren.push(parseInt(c.value, 10)); });
  IMBJ.bezig = true; imbjTeken();
  var code = IMBJ.code;
  finAntw(fetchMetTimeout(WORKER + '/mna/verkoopmemorandum/bijlagen', { method: 'POST', headers: finHeaders(), body: JSON.stringify({ code: code, rev: IMBJ.data.rev, jaren: jaren }) }, 30000)).then(function (x) { if (IMBJ.code === code) imbjVerwerk(x, 'Bijlagen opgeslagen. Ze staan in de volgende PDF.'); });
};
