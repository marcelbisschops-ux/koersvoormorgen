// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// N-183 (GO Marcel 06-11/11-11-2026): toekomstbestendigheid van accountants- en administratiekantoren, voor de begeleider
// in Analyse en waardering. De berekening staat in de backend (worker/61); dit scherm toont per dimensie de waarden met
// hun soort (feit, schatting, berekend, scenario), de dekking en een mogelijke richting voor de waardering. Die richting
// wordt nergens automatisch toegepast. De begeleider legt vast dat de analyse is beoordeeld en of die in het
// informatiememorandum mag.
var TK = { data: null, bezig: false };
var TK_SOORT = { feit: ['Feit', 'var(--teal)'], schatting: ['Schatting', 'var(--gold-dark)'], afgeleid: ['Berekend', 'var(--mid)'], scenario: ['Scenario', 'var(--muted)'] };
var TK_RICHTING = { positief: 'mogelijk positief', negatief: 'mogelijk negatief', neutraal: 'neutraal', onbekend: 'onbekend' };

function tkLaad() {
  if (typeof isTussen !== 'function' || !isTussen() || !S.traject || S.traject.sector !== 'accountancy') return;
  var anker = ge('w-ai2-sectie'); if (!anker) return;
  var doos = ge('w-toekomst');
  if (!doos) { doos = document.createElement('div'); doos.id = 'w-toekomst'; anker.parentNode.insertBefore(doos, anker.nextSibling); }
  doos.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:.5rem 0">Toekomstbestendigheid laden...</div>';
  var sessie = S, code = S.code;
  fetchMetTimeout(WORKER + '/mna/toekomst/' + code, { headers: { 'x-tussen-key': S._bgKey || '' } }, 10000)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (S !== sessie || S.code !== code || ge('w-toekomst') !== doos) return;
      if (!d || d.ok !== true) { doos.innerHTML = '<div style="color:var(--muted);font-size:13px">De analyse toekomstbestendigheid kon niet worden geladen.</div>'; return; }
      TK.data = d; doos.innerHTML = tkHtml(d); tkKoppel(doos);
    }, function () { if (S === sessie && ge('w-toekomst') === doos) doos.innerHTML = '<div style="color:var(--muted);font-size:13px">De analyse toekomstbestendigheid kon niet worden geladen.</div>'; });
}

function tkWaardeHtml(w) {
  var s = TK_SOORT[w.soort] || [w.soort, 'var(--muted)'];
  return '<div style="display:flex;gap:8px;align-items:baseline;font-size:12px;padding:2px 0"><span style="color:var(--sub)">' + esc(w.label) + ':</span> <strong>' + esc(String(w.waarde)) + '</strong>'
    + ' <span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:' + s[1] + '">' + esc(s[0]) + '</span></div>';
}

function tkHtml(d) {
  var a = d.analyse || { dimensies: [] }, b = d.beoordeling || {};
  var h = '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem">'
    + '<div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">Toekomstbestendigheid en schaalbaarheid</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:.85rem;line-height:1.6">' + esc(a.regel || '') + ' De gegevens komen uit de vragen in de fasen Klanten &amp; commercieel en IT &amp; automatisering, aangevuld met bestaande velden.</div>';
  (a.dimensies || []).forEach(function (dim) {
    h += '<div style="border-top:1px solid var(--border);padding:.7rem 0">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong style="font-size:13px">' + esc(dim.titel) + '</strong>'
      + '<span style="font-size:11px;color:var(--muted)">Richting voor de waardering: ' + esc(TK_RICHTING[dim.richting] || dim.richting) + ' (niet toegepast)</span></div>';
    if (dim.status !== 'ok') h += '<div style="font-size:12px;color:var(--muted);margin-top:.3rem">Onvoldoende gegevens. ' + esc(dim.toelichting || '') + '</div>';
    else {
      if (dim.indicator !== undefined && dim.indicator !== null) h += '<div style="font-size:12px;margin-top:.3rem">Indicator <strong>' + esc(String(dim.indicator)) + ' van 100</strong>, dekking ' + esc(String(dim.dekking)) + '%. ' + esc(dim.weging || '') + '</div>';
      (dim.waarden || []).forEach(function (w) { h += tkWaardeHtml(w); });
      (dim.scenario || []).forEach(function (w) { h += tkWaardeHtml(w); });
      h += '<div style="font-size:11px;color:var(--muted);margin-top:.25rem">' + esc(dim.toelichting || '') + '</div>';
    }
    (dim.meldingen || []).forEach(function (m) { h += '<div style="font-size:12px;color:var(--gold-dark);margin-top:.3rem">&#9888; ' + esc(m) + '</div>'; });
    h += '</div>';
  });
  h += '<div style="border-top:1px solid var(--border);padding-top:.85rem;margin-top:.25rem">'
    + '<div style="font-size:12px;font-weight:600;margin-bottom:.4rem">Beoordeling door de begeleider</div>'
    // De vrijgave vervalt als de gegevens na de beoordeling zijn gewijzigd (backend vergelijkt een momentopname).
    + (b.beoordeeld && b.actueel === false ? '<div id="tk-verouderd" style="font-size:12px;color:var(--gold-dark);margin-bottom:.45rem">&#9888; De gegevens zijn na je beoordeling gewijzigd. Beoordeel de analyse opnieuw; tot die tijd komt ze niet in het memorandum.</div>' : '')
    + '<label style="display:flex;gap:8px;font-size:12px;margin-bottom:.35rem"><input type="checkbox" id="tk-beoordeeld"' + (b.beoordeeld ? ' checked' : '') + '> Ik heb deze analyse beoordeeld</label>'
    + '<label style="display:flex;gap:8px;font-size:12px;margin-bottom:.5rem"><input type="checkbox" id="tk-in-im"' + (b.in_im ? ' checked' : '') + (b.beoordeeld ? '' : ' disabled') + '> Opnemen in het informatiememorandum (feiten en schattingen, geen waardeoordeel)</label>'
    + '<textarea id="tk-toelichting" maxlength="1500" rows="3" style="width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:8px 10px;font-size:12px" aria-label="Toelichting van de begeleider">' + esc(b.toelichting || '') + '</textarea>'
    + '<div style="display:flex;align-items:center;gap:10px;margin-top:.5rem;flex-wrap:wrap"><button class="btn-outline" id="tk-opslaan" style="font-size:12px;padding:6px 14px">Beoordeling opslaan</button>'
    + (b.op ? '<span style="font-size:11px;color:var(--muted)">Laatst vastgelegd ' + esc(new Date(Number(b.op)).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })) + '</span>' : '')
    + '</div></div></div>';
  return h;
}

function tkKoppel(doos) {
  var cb = doos.querySelector('#tk-beoordeeld'), im = doos.querySelector('#tk-in-im'), knop = doos.querySelector('#tk-opslaan');
  if (cb && im) cb.addEventListener('change', function () { im.disabled = !cb.checked; if (!cb.checked) im.checked = false; });
  if (knop) knop.addEventListener('click', function () {
    if (TK.bezig || !TK.data) return;
    TK.bezig = true; knop.disabled = true; knop.textContent = 'Opslaan...';
    var body = { code: S.code, rev: TK.data.rev, stand: TK.data.stand, beoordeeld: !!(cb && cb.checked), in_im: !!(cb && cb.checked && im && im.checked), toelichting: (doos.querySelector('#tk-toelichting') || {}).value || '' };
    fetchMetTimeout(WORKER + '/mna/toekomst/beoordeling', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tussen-key': S._bgKey || '' }, body: JSON.stringify(body) }, 15000)
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }, function () { return { status: r.status, j: null }; }); })
      .then(function (x) {
        TK.bezig = false;
        if (x.status === 200 && x.j && x.j.ok === true) { toast('Beoordeling vastgelegd', 'ok'); TK.data = x.j; doos.innerHTML = tkHtml(x.j); tkKoppel(doos); return; }
        if (x.j && (x.j.code === 'REV_CONFLICT' || x.j.code === 'STAND_GEWIJZIGD')) { toast(x.j.code === 'STAND_GEWIJZIGD' ? 'De gegevens zijn gewijzigd sinds je de analyse opende. De actuele analyse is geladen; beoordeel opnieuw.' : 'Intussen elders gewijzigd. De actuele stand is geladen; controleer en sla opnieuw op.', 'warn'); tkLaad(); return; }
        knop.disabled = false; knop.textContent = 'Beoordeling opslaan';
        toast('Opslaan is niet gelukt' + (x.j && x.j.error ? ': ' + x.j.error : '') + '. Er is niets gewijzigd.', 'err');
      }, function () { TK.bezig = false; knop.disabled = false; knop.textContent = 'Beoordeling opslaan'; toast('Opslaan is niet gelukt. Er is niets gewijzigd.', 'err'); });
  });
}
