// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-009 C1 (goedgekeurd): communicatiehistorie per traject in het begeleider-dashboard. Toont per verstuurde e-mail
// datum, ontvanger (rol en gemaskeerd adres), onderwerp en status. De status komt uitsluitend van de server
// (GET /mna/communicatielog/{code}, worker/70): 'Verzonden' alleen als de mailprovider de verzending heeft bevestigd.
// Alle velden worden ge-escaped weergegeven.
var CL_ROL = { verkoper: 'Verkoper', koper: 'Koper', begeleider: 'Begeleider', kandidaat: 'Kandidaat', specialist: 'Specialist', meekijker: 'Meekijker', meerdere: 'Meerdere ontvangers', onbekend: 'Onbekend' };
var CL_STATUS = {
  verzonden: ['Verzonden', 'var(--teal)'],
  mislukt: ['Mislukt', 'var(--red)'],
  onbevestigd: ['Niet bevestigd', 'var(--gold-dark)'],
  overgeslagen: ['Overgeslagen (testadres)', 'var(--muted)']
};

function clDatum(ts) {
  var d = new Date(Number(ts) || 0);
  if (!ts || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function clHtml(d) {
  var lijst = (d && d.berichten) || [];
  if (!lijst.length) return '<div style="font-size:12px;color:var(--muted);font-style:italic">Nog geen e-mails verstuurd vanuit dit traject.</div>';
  var h = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    + '<thead><tr style="text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em">'
    + '<th style="padding:4px 6px;border-bottom:1px solid var(--border)">Datum</th><th style="padding:4px 6px;border-bottom:1px solid var(--border)">Ontvanger</th>'
    + '<th style="padding:4px 6px;border-bottom:1px solid var(--border)">Onderwerp</th><th style="padding:4px 6px;border-bottom:1px solid var(--border)">Status</th></tr></thead><tbody>';
  lijst.forEach(function (b) {
    var st = CL_STATUS[b.status] || CL_STATUS.onbevestigd;
    var fout = (b.status === 'mislukt' || b.status === 'onbevestigd') && b.foutcode ? ' <span style="color:var(--muted)">(' + esc(b.foutcode) + ')</span>' : '';
    h += '<tr>'
      + '<td style="padding:5px 6px;border-bottom:1px solid var(--border);white-space:nowrap;color:var(--sub)">' + esc(clDatum(b.ts)) + '</td>'
      + '<td style="padding:5px 6px;border-bottom:1px solid var(--border)">' + esc(CL_ROL[b.rol] || 'Onbekend') + '<div style="font-size:11px;color:var(--muted)">' + esc(b.ontvanger || '') + '</div></td>'
      + '<td style="padding:5px 6px;border-bottom:1px solid var(--border);color:var(--sub)">' + esc(b.onderwerp || '') + (b.testomgeving ? ' <span style="font-size:10px;color:var(--muted)">testomgeving</span>' : '') + '</td>'
      + '<td style="padding:5px 6px;border-bottom:1px solid var(--border);white-space:nowrap;color:' + st[1] + ';font-weight:600">' + esc(st[0]) + fout + '</td>'
      + '</tr>';
  });
  h += '</tbody></table></div>';
  if (lijst.length >= (d.max || 200)) h += '<div style="font-size:11px;color:var(--muted);margin-top:4px">Alleen de laatste ' + esc(String(d.max || 200)) + ' berichten worden getoond.</div>';
  return h;
}

function bgLaadCommunicatie() {
  var el = ge('bg-communicatie-sectie'); if (!el) return;
  if (typeof isTussen !== 'function' || !isTussen()) { el.innerHTML = ''; return; }
  var sessie = S, code = S.code;
  fetchMetTimeout(WORKER + '/mna/communicatielog/' + encodeURIComponent(code), { headers: { 'x-tussen-key': S._bgKey || '' }, cache: 'no-store' }, 15000)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (S !== sessie || S.code !== code || ge('bg-communicatie-sectie') !== el) return;
      if (!d || d.ok !== true) { el.innerHTML = '<div style="font-size:12px;color:var(--muted)">De communicatiehistorie kon niet worden geladen.</div>'; return; }
      el.style.fontStyle = 'normal';
      el.innerHTML = clHtml(d);
    }, function () { if (S === sessie && ge('bg-communicatie-sectie') === el) el.innerHTML = '<div style="font-size:12px;color:var(--muted)">De communicatiehistorie kon niet worden geladen.</div>'; });
}
