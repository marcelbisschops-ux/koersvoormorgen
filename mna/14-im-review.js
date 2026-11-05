// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase F5 (28 okt 2026): verkopersreview van het concept-informatiememorandum (backend worker/44).
// Verkoper: ziet de gedeelde versie in het eigen dossier, geeft per onderdeel opmerkingen, reageert op
// informatieverzoeken en geeft akkoord op exact de gedeelde versie. Begeleider: deelt het concept, beoordeelt
// opmerkingen (met motivering) en biedt de bijgewerkte versie ter goedkeuring aan; dit staat in het
// verkoopmemorandum-venster (mna/04, element #imr-bg). Elke actie stuurt `rev` mee; bij 409 wordt herladen.

var IMR_STATUS_LABEL = { CONCEPT: 'Concept (nog niet gedeeld)', TER_BEOORDELING_VERKOPER: 'Ter beoordeling bij de verkoper', OPMERKINGEN_ONTVANGEN: 'Opmerkingen ontvangen',
  IN_BEWERKING: 'In bewerking bij de adviseur', TER_GOEDKEURING_VERKOPER: 'Ter goedkeuring bij de verkoper', DEFINITIEF: 'Definitief' };
var IMR_SOORT = [['tekst', 'Tekst'], ['cijfer', 'Cijfers'], ['normalisatie', 'Normalisatie'], ['grafiek', 'Grafiek'], ['foto', "Foto's"], ['transactievorm', 'Transactievorm'], ['anders', 'Anders']];
var IMR_OPM_LABEL = { open: 'Open', geaccepteerd: 'Geaccepteerd', deels: 'Deels overgenomen', afgewezen: 'Niet overgenomen', info_gevraagd: 'Adviseur vraagt om informatie', verwerkt: 'Verwerkt' };
var IMR = { scope: null, status: 'idle', data: null, bezig: false, melding: null, form: null };

function imrEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function imrScopeKey() { return JSON.stringify([S.code || '', S.rol || '']); }
function imrSync() { var k = imrScopeKey(); if (IMR.scope !== k) { IMR.scope = k; IMR.status = 'idle'; IMR.data = null; IMR.bezig = false; IMR.melding = null; IMR.form = null; } }
function imrHeaders() { var h = { 'Content-Type': 'application/json' }; if (isTussen()) h['x-tussen-key'] = S._bgKey || ''; return h; }
function imrOnderdelen(tekst) {
  var delen = [], huidig = { kop: 'Algemeen', regels: [] };
  String(tekst || '').split('\n').forEach(function (r) {
    var m = /^##\s+(.+)$/.exec(r.trim());
    if (m) { if (huidig.regels.join('').trim() || delen.length) delen.push(huidig); huidig = { kop: m[1].trim(), regels: [] }; }
    else huidig.regels.push(r);
  });
  delen.push(huidig);
  return delen.filter(function (d) { return d.kop !== 'Algemeen' || d.regels.join('').trim(); });
}
function imrHerteken() {
  if (isTussen()) { imrBgTeken(); return; }
  var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null, bewaard = [];
  if (f && f.dataFields) f.dataFields.forEach(function (df) { var el = ge('df_' + df.id); if (el && typeof el.value === 'string') bewaard.push([df.id, el.value]); });
  renderApp();
  bewaard.forEach(function (b) { var el = ge('df_' + b[0]); if (el && el.value !== b[1]) el.value = b[1]; });
}
function imrLaad() {
  imrSync();
  if (!S.code || !(isVerkoper() || isTussen()) || IMR.status === 'laden') return Promise.resolve();
  var scope = IMR.scope;
  IMR.status = 'laden';
  return fetchMetTimeout(WORKER + '/mna/im-review?code=' + encodeURIComponent(S.code), { method: 'GET', headers: imrHeaders() }, 30000)
    .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }, function () { return { s: r.status, d: null }; }); }, function () { return { s: 0, d: null }; })
    .then(function (x) {
      if (IMR.scope !== scope) return;
      if (x.s === 200 && x.d && x.d.ok === true && typeof x.d.rev === 'number') { IMR.status = 'ok'; IMR.data = x.d; }
      else if (x.s === 404) { IMR.status = 'geen'; IMR.data = null; }
      else { IMR.status = 'fout'; IMR.data = null; }
      imrHerteken();
    });
}
function imrPost(pad, body, okMelding) {
  if (IMR.bezig || !IMR.data) return;
  IMR.bezig = true; IMR.melding = null; imrHerteken();
  body.code = S.code; body.rev = IMR.data.rev;
  fetchMetTimeout(WORKER + '/mna/im-review/' + pad, { method: 'POST', headers: imrHeaders(), body: JSON.stringify(body) }, 30000)
    .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }, function () { return { s: r.status, d: null }; }); }, function () { return { s: 0, d: null }; })
    .then(function (x) {
      IMR.bezig = false;
      if (x.s === 200 && x.d && x.d.ok === true) {
        IMR.data = x.d; IMR.form = null;
        IMR.melding = { soort: 'ok', tekst: okMelding + (x.d.mail_verstuurd === false && (pad === 'deel' || pad === 'ter-goedkeuring') ? ' De e-mailmelding aan de verkoper is niet verstuurd; laat het de verkoper zo nodig zelf weten.' : '') };
      } else if (x.s === 409 && x.d && x.d.actueel) {
        IMR.data = Object.assign({ ok: true, rol: IMR.data.rol }, x.d.actueel);
        IMR.melding = { soort: 'fout', tekst: 'De review is intussen gewijzigd. De actuele stand staat hieronder; uw invoer is bewaard. Controleer en probeer opnieuw.' };
      } else {
        IMR.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets opgeslagen.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      }
      imrHerteken();
    });
}
function imrMeldingHtml() {
  if (!IMR.melding) return '';
  return '<div style="font-size:12px;line-height:1.6;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid '
    + (IMR.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + imrEsc(IMR.melding.tekst) + '</div>';
}
function imrOpmerkingenVan(onderdeel) {
  var d = IMR.data; if (!d || !Array.isArray(d.opmerkingen)) return [];
  return d.opmerkingen.filter(function (o) { return o.versie_no === d.versie_no && (onderdeel === null || o.onderdeel === onderdeel); });
}
function imrOpmHtml(o, rol) {
  var dis = IMR.bezig ? ' disabled' : '';
  var h = '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;margin:.35rem 0;font-size:12px;color:var(--sub)">'
    + '<div><strong>' + imrEsc(o.onderdeel) + '</strong> &middot; ' + imrEsc((IMR_SOORT.filter(function (s) { return s[0] === o.soort; })[0] || ['', o.soort])[1]) + ' &middot; <em>' + imrEsc(IMR_OPM_LABEL[o.status] || o.status) + '</em></div>'
    + '<div style="margin-top:.25rem;white-space:pre-wrap">' + imrEsc(o.tekst) + '</div>'
    + (o.motivering ? '<div style="margin-top:.25rem;color:var(--muted)">Adviseur: ' + imrEsc(o.motivering) + '</div>' : '')
    + (o.reactie_verkoper ? '<div style="margin-top:.25rem;color:var(--muted)">Reactie verkoper: ' + imrEsc(o.reactie_verkoper) + '</div>' : '');
  if (rol === 'verkoper' && o.status === 'info_gevraagd') {
    h += '<textarea id="imr-reactie-' + imrEsc(o.id) + '" maxlength="3000" style="width:100%;min-height:48px;margin-top:.35rem;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);font-size:12px;color:var(--sub);padding:6px"' + dis + '></textarea>'
      + '<button class="btn btn-sm" style="font-size:11px;margin-top:.3rem" onclick="imrReageer(\'' + imrEsc(o.id) + '\')"' + dis + '>Reactie versturen</button>';
  }
  if (rol === 'begeleider' && ['OPMERKINGEN_ONTVANGEN', 'IN_BEWERKING'].indexOf(IMR.data.status) >= 0) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.4rem"><select id="imr-beoordeel-' + imrEsc(o.id) + '" style="font-size:12px"' + dis + '>'
      + ['geaccepteerd', 'deels', 'afgewezen', 'info_gevraagd', 'verwerkt'].map(function (s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + imrEsc(IMR_OPM_LABEL[s]) + '</option>'; }).join('')
      + '</select><input type="text" id="imr-motivering-' + imrEsc(o.id) + '" maxlength="2000" value="' + imrEsc(o.motivering || '') + '" style="flex:1;min-width:180px;font-size:12px" aria-label="Motivering (verplicht bij deels, niet overgenomen en informatie vragen)"' + dis + '>'
      + '<button class="btn btn-sm" style="font-size:11px" onclick="imrBeoordeel(\'' + imrEsc(o.id) + '\')"' + dis + '>Vastleggen</button></div>';
  }
  return h + '</div>';
}

// ── Verkoper ────────────────────────────────────────────────────────────────────────────
window.imrOpenForm = function (i) { IMR.form = { onderdeel: i, soort: 'tekst', tekst: '' }; imrHerteken(); };
window.imrFormZet = function (veld, w) { if (IMR.form) IMR.form[veld] = w; };
window.imrVerstuurOpmerking = function () {
  if (!IMR.form || !IMR.data) return;
  var delen = imrOnderdelen(IMR.data.gedeelde_tekst);
  var onderdeel = delen[IMR.form.onderdeel] ? delen[IMR.form.onderdeel].kop : 'algemeen';
  if (!String(IMR.form.tekst || '').trim()) { IMR.melding = { soort: 'fout', tekst: 'Vul uw opmerking in.' }; imrHerteken(); return; }
  imrPost('opmerking', { onderdeel: onderdeel, soort: IMR.form.soort, tekst: IMR.form.tekst }, 'Uw opmerking is verstuurd naar uw adviseur.');
};
window.imrReageer = function (id) { var el = ge('imr-reactie-' + id); imrPost('opmerking/reageer', { id: id, reactie: el ? el.value : '' }, 'Uw reactie is verstuurd.'); };
window.imrAkkoord = function () { if (IMR.data) imrPost('akkoord', { tekst_sha256: IMR.data.gedeelde_sha256 }, 'U heeft akkoord gegeven op deze versie.'); };

function renderImReviewVerkoper() {
  imrSync();
  if (!isVerkoper()) return '';
  if (IMR.status === 'idle') { setTimeout(imrLaad, 0); return ''; }
  if (IMR.status !== 'ok' || !IMR.data || IMR.data.status === 'CONCEPT') return '';
  var d = IMR.data, dis = IMR.bezig ? ' disabled' : '';
  var magOpmerken = ['TER_BEOORDELING_VERKOPER', 'OPMERKINGEN_ONTVANGEN', 'TER_GOEDKEURING_VERKOPER'].indexOf(d.status) >= 0;
  var html = '<div class="panel" id="imr-panel" style="margin-bottom:1rem">'
    + '<div class="sec-hdr" style="margin:0">&#128220; Informatiememorandum: ' + imrEsc(IMR_STATUS_LABEL[d.status] || d.status) + '</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">'
    + (d.status === 'TER_GOEDKEURING_VERKOPER' ? 'Uw adviseur heeft de bijgewerkte versie ter goedkeuring met u gedeeld. Lees hem na en geef akkoord, of plaats een opmerking als er nog iets moet worden aangepast.'
      : d.status === 'DEFINITIEF' ? 'Dit is de definitieve versie. Het document wordt alleen met geïnteresseerde partijen gedeeld nadat zij een geheimhoudingsverklaring hebben getekend.'
        : 'Lees het concept na. Bij elk onderdeel kunt u een opmerking plaatsen over tekst, cijfers, normalisaties, grafieken, foto\'s of de transactievorm. Aanvullende stukken uploadt u in de betreffende fase van uw dossier.')
    + '</div>' + imrMeldingHtml();
  imrOnderdelen(d.gedeelde_tekst).forEach(function (o, i) {
    html += '<div style="border-top:1px solid var(--border);padding:.6rem 0">'
      + '<div style="font-weight:600;color:var(--head);font-size:13px">' + imrEsc(o.kop) + '</div>'
      + '<div style="font-size:12px;color:var(--sub);white-space:pre-wrap;line-height:1.6;margin:.3rem 0">' + imrEsc(o.regels.join('\n').trim()) + '</div>'
      + imrOpmerkingenVan(o.kop).map(function (x) { return imrOpmHtml(x, 'verkoper'); }).join('');
    if (magOpmerken) {
      if (IMR.form && IMR.form.onderdeel === i) {
        html += '<div style="margin-top:.4rem"><select style="font-size:12px" onchange="imrFormZet(\'soort\',this.value)"' + dis + '>' + IMR_SOORT.map(function (s) { return '<option value="' + s[0] + '"' + (IMR.form.soort === s[0] ? ' selected' : '') + '>' + imrEsc(s[1]) + '</option>'; }).join('') + '</select>'
          + '<textarea maxlength="3000" aria-label="Uw opmerking bij dit onderdeel" style="width:100%;min-height:60px;margin-top:.3rem;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);font-size:12px;color:var(--sub);padding:6px" oninput="imrFormZet(\'tekst\',this.value)"' + dis + '>' + imrEsc(IMR.form.tekst) + '</textarea>'
          + '<button class="btn btn-sm" style="font-size:11px;margin-top:.3rem" onclick="imrVerstuurOpmerking()"' + dis + '>' + (IMR.bezig ? 'Bezig…' : 'Opmerking versturen') + '</button></div>';
      } else html += '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="imrOpenForm(' + i + ')"' + dis + '>Opmerking bij dit onderdeel</button>';
    }
    html += '</div>';
  });
  if (d.status === 'TER_GOEDKEURING_VERKOPER' && !d.verkoper_akkoord_op) html += '<div style="margin-top:.6rem"><button class="btn" onclick="imrAkkoord()"' + dis + '>Ik ga akkoord met deze versie</button></div>';
  if (d.verkoper_akkoord_op) html += '<div style="font-size:12px;color:var(--teal);margin-top:.5rem">U heeft akkoord gegeven op ' + imrEsc(new Date(d.verkoper_akkoord_op).toLocaleDateString('nl-NL')) + '.</div>';
  return html + '</div>';
}

// ── Begeleider (in het verkoopmemorandum-venster van mna/04) ─────────────────────────────
window.imrBgLaad = function () { imrSync(); if (!isTussen()) return; IMR.status = 'idle'; imrLaad(); imrBgTeken(); };
window.imrDeel = function () { imrPost('deel', {}, 'Het concept is met de verkoper gedeeld.'); };
window.imrTerGoedkeuring = function () { imrPost('ter-goedkeuring', {}, 'De bijgewerkte versie is ter goedkeuring aan de verkoper aangeboden.'); };
window.imrBeoordeel = function (id) {
  var s = ge('imr-beoordeel-' + id), m = ge('imr-motivering-' + id);
  imrPost('opmerking/beoordeel', { id: id, status: s ? s.value : '', motivering: m ? m.value : '' }, 'Beoordeling vastgelegd.');
};
function imrBgTeken() {
  var el = ge('imr-bg'); if (!el) return;
  if (IMR.status === 'laden' || IMR.status === 'idle') { el.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-top:1rem">Verkopersreview laden…</div>'; return; }
  if (IMR.status !== 'ok' || !IMR.data) { el.innerHTML = '<div style="font-size:12px;color:var(--red);margin-top:1rem">De verkopersreview kon niet worden geladen.</div>'; return; }
  var d = IMR.data, dis = IMR.bezig ? ' disabled' : '';
  var opm = imrOpmerkingenVan(null);
  var open = opm.filter(function (o) { return o.status === 'open' || o.status === 'info_gevraagd'; }).length;
  var h = '<div style="border-top:1px solid var(--border);margin-top:1rem;padding-top:.8rem">'
    + '<div style="font-size:11px;font-weight:600;color:#8a5a00;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">Verkopersreview &middot; ' + imrEsc(IMR_STATUS_LABEL[d.status] || d.status) + (d.versie_no ? ' &middot; versie ' + imrEsc(d.versie_no) : '') + '</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin-bottom:.5rem">Deel het opgeslagen concept met de verkoper. De verkoper reageert per onderdeel; u beoordeelt elke opmerking. Definitief vaststellen kan pas nadat de verkoper akkoord heeft gegeven op de versie die ter goedkeuring is aangeboden. Definitief betekent nog niet dat het document aan kopers is vrijgegeven.</div>'
    + imrMeldingHtml();
  if (['CONCEPT', 'IN_BEWERKING', 'OPMERKINGEN_ONTVANGEN'].indexOf(d.status) >= 0) h += '<button class="btn-ghost btn-sm" style="margin-right:6px" onclick="imrDeel()"' + dis + '>' + (d.status === 'CONCEPT' ? 'Concept delen met de verkoper' : 'Opnieuw delen ter beoordeling') + '</button>';
  if (['IN_BEWERKING', 'OPMERKINGEN_ONTVANGEN', 'TER_BEOORDELING_VERKOPER'].indexOf(d.status) >= 0) h += '<button class="btn-ghost btn-sm" onclick="imrTerGoedkeuring()"' + (dis || (open ? ' disabled' : '')) + '>Ter goedkeuring aanbieden</button>' + (open ? ' <span style="font-size:11px;color:var(--muted)">(' + open + ' opmerking(en) nog open)</span>' : '');
  if (d.status === 'TER_GOEDKEURING_VERKOPER') h += '<div style="font-size:12px;color:' + (d.verkoper_akkoord_op ? 'var(--teal)' : 'var(--muted)') + '">' + (d.verkoper_akkoord_op ? 'De verkoper heeft akkoord gegeven. U kunt het memorandum nu definitief vaststellen.' : 'Wacht op akkoord van de verkoper.') + '</div>';
  h += opm.length ? opm.map(function (o) { return imrOpmHtml(o, 'begeleider'); }).join('') : '';
  el.innerHTML = h + '</div>';
}
