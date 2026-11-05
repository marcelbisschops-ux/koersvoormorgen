// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase B (28 okt 2026): normalisaties, prognose en financiële kerncijfers (backend worker/46, één
// rekenbron). Paneel in fase Financieel onder de kolommenbalans. Alleen goedgekeurde normalisaties tellen mee;
// goedkeuren en de prognose zijn voorbehouden aan de begeleider. In het dealvoorstel-venster (mna/04) biedt
// finDealvoorstelHint() de genormaliseerde EBITDA en een goedgekeurde prognose aan als expliciete keuze.

var FIN = { scope: null, status: 'idle', data: null, bezig: false, melding: null, form: null };
var FIN_POST = [['omzet', 'Netto-omzet'], ['kostprijs', 'Kostprijs'], ['personeel', 'Personeelskosten'], ['huisvesting', 'Huisvestingskosten'], ['vervoer', 'Vervoerskosten'], ['verkoop', 'Verkoopkosten'], ['algemeen', 'Kantoor- en algemene kosten']];
var FIN_SOORT = [['incidenteel', 'Incidentele bate of last'], ['partnerbeloning', 'Afwijkende partnerbeloning'], ['vervangingskosten', 'Marktconforme vervangingskosten'], ['personeelsuitval', 'Tijdelijke personeelsuitval'],
  ['vacature', 'Vacature'], ['advieskosten', 'Eenmalige advieskosten'], ['reorganisatie', 'Reorganisatiekosten'], ['niet_operationeel', 'Niet-operationele kosten of opbrengsten'], ['overig', 'Andere aantoonbare correctie']];
var FIN_STATUS = { voorstel: 'Voorstel', goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen' };

function finEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function finGeld(n) { if (typeof n !== 'number' || !isFinite(n)) return ''; var r = Math.round(n); return (r < 0 ? '-€ ' : '€ ') + Math.abs(r).toLocaleString('nl-NL'); }
function finPct(n) { return typeof n === 'number' && isFinite(n) ? String(n).replace('.', ',') + '%' : ''; }
function finLabel(lijst, w) { for (var i = 0; i < lijst.length; i++) if (lijst[i][0] === w) return lijst[i][1]; return w; }
function finScope() { var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null; return JSON.stringify([S.code || '', S.rol || '', f ? f.id : '']); }
function finSync() { var k = finScope(); if (FIN.scope !== k) { FIN.scope = k; FIN.status = 'idle'; FIN.data = null; FIN.bezig = false; FIN.melding = null; FIN.form = null; } }
function finHeaders() { var h = { 'Content-Type': 'application/json' }; if (isTussen()) h['x-tussen-key'] = S._bgKey || ''; return h; }
function finHerteken() {
  var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null, bewaard = [];
  if (f && f.dataFields) f.dataFields.forEach(function (df) { var el = ge('df_' + df.id); if (el && typeof el.value === 'string') bewaard.push([df.id, el.value]); });
  renderApp();
  bewaard.forEach(function (b) { var el = ge('df_' + b[0]); if (el && el.value !== b[1]) el.value = b[1]; });
}
function finAntw(p) { return p.then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }, function () { return { s: r.status, d: null }; }); }, function () { return { s: 0, d: null }; }); }
function finHaal() { return finAntw(fetchMetTimeout(WORKER + '/mna/financieel?code=' + encodeURIComponent(S.code), { method: 'GET', headers: finHeaders() }, 30000)); }
function finLaad() {
  finSync();
  if (!S.code || !(isVerkoper() || isTussen()) || FIN.status === 'laden') return;
  var scope = FIN.scope; FIN.status = 'laden';
  finHaal().then(function (x) {
    if (FIN.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { FIN.status = 'ok'; FIN.data = x.d; } else { FIN.status = 'fout'; FIN.data = null; }
    finHerteken();
  });
}
function finPost(pad, body, ok) {
  if (FIN.bezig) return;
  FIN.bezig = true; FIN.melding = null; finHerteken();
  body.code = S.code;
  finAntw(fetchMetTimeout(WORKER + '/mna/financieel/' + pad, { method: 'POST', headers: finHeaders(), body: JSON.stringify(body) }, 30000)).then(function (x) {
    FIN.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { FIN.data = x.d; FIN.form = null; FIN.melding = { soort: 'ok', tekst: ok + (typeof x.d.nieuw === 'number' ? ' (' + x.d.nieuw + ' nieuw)' : '') }; }
    else {
      FIN.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      if (x.s === 409) { FIN.status = 'idle'; setTimeout(finLaad, 0); }
    }
    finHerteken();
  });
}
function finNm(id) { return ((FIN.data && FIN.data.normalisaties) || []).filter(function (x) { return x.id === id; })[0]; }

// ── Acties ──────────────────────────────────────────────────────────────────────────────
window.finVoorstellen = function () { finPost('voorstellen', {}, 'KVM-voorstellen opgehaald'); };
window.finOpenForm = function () { var j = FIN.data && FIN.data.jaren.length ? FIN.data.jaren[FIN.data.jaren.length - 1].jaar : new Date().getFullYear() - 1; FIN.form = { jaar: j, post: 'algemeen', soort: 'incidenteel', karakter: 'incidenteel', zekerheid: 'midden' }; finHerteken(); };
window.finZet = function (k, v) { if (FIN.form) FIN.form[k] = v; };
window.finBewaarNieuw = function () {
  var f = FIN.form; if (!f) return;
  var bedrag = Number(String(f.bedrag || '').replace(/\./g, '').replace(',', '.'));
  finPost('normalisatie', { jaar: Number(f.jaar), post: f.post, soort: f.soort, bedrag: bedrag, omschrijving: f.omschrijving || '', bron: f.bron || '', karakter: f.karakter, zekerheid: f.zekerheid, motivering: f.motivering || '', risico: f.risico || '' }, 'Normalisatie als voorstel vastgelegd.');
};
window.finBeoordeel = function (el) {
  var id = el.getAttribute('data-id'), n = finNm(id); if (!n) return;
  var st = ge('fin-st-' + id), mo = ge('fin-mo-' + id), be = ge('fin-be-' + id);
  finPost('normalisatie/beoordeel', { id: id, rev: n.rev, status: st ? st.value : '', motivering: mo ? mo.value : undefined, beoordeling: be ? be.value : '' }, 'Beoordeling vastgelegd.');
};
window.finVerwijder = function (el) { var id = el.getAttribute('data-id'), n = finNm(id); if (n && confirm('Deze normalisatie verwijderen?')) finPost('normalisatie/verwijder', { id: id, rev: n.rev }, 'Normalisatie verwijderd.'); };
window.finBewaarPrognose = function () {
  var a = [], fte = {};
  for (var i = 0; i < 2; i++) {
    var aan = ge('fin-p' + i + '-aan');
    if (!aan || !aan.checked) continue;
    var g = function (k) { var el = ge('fin-p' + i + '-' + k); return el ? Number(String(el.value).replace(',', '.')) : NaN; };
    a.push({ omzet_groei_pct: g('omzet'), personeel_groei_pct: g('personeel'), overige_kosten_groei_pct: g('overig'), toelichting: (ge('fin-p' + i + '-toel') || {}).value || '' });
  }
  document.querySelectorAll('[data-fte-jaar]').forEach(function (el) { var v = Number(String(el.value).replace(',', '.')); if (String(el.value).trim() !== '' && isFinite(v)) fte[el.getAttribute('data-fte-jaar')] = v; });
  finPost('prognose', { aannames: a, fte: fte, rev: FIN.data.prognose.rev }, 'Prognose-aannames opgeslagen (concept).');
};
window.finKeurPrognoseGoed = function () { finPost('prognose/goedkeuren', { rev: FIN.data.prognose.rev }, 'Prognose goedgekeurd.'); };

// ── Weergave ────────────────────────────────────────────────────────────────────────────
function finAansluitingHtml(d) {
  if (!d.jaren.length) return '<div style="font-size:12px;color:var(--muted)">Nog geen gereed boekjaar uit de kolommenbalans; de aansluiting verschijnt zodra een jaar gereed is.</div>';
  var kop = '<tr><th style="text-align:left;padding:3px 6px"></th>' + d.jaren.map(function (j) { return '<th style="text-align:right;padding:3px 6px">' + finEsc(j.jaar) + '</th>'; }).join('')
    + (d.prognose.jaren || []).map(function (p) { return '<th style="text-align:right;padding:3px 6px;color:var(--muted)">' + finEsc(p.jaar) + ' (prognose' + (d.prognose.status === 'goedgekeurd' ? '' : ', concept') + ')</th>'; }).join('') + '</tr>';
  var rij = function (label, f, vet) {
    return '<tr' + (vet ? ' style="font-weight:600;border-top:1px solid var(--border)"' : '') + '><td style="padding:3px 6px">' + label + '</td>' + d.jaren.map(function (j) { return '<td style="text-align:right;padding:3px 6px">' + f(j, false) + '</td>'; }).join('')
      + (d.prognose.jaren || []).map(function (p) { return '<td style="text-align:right;padding:3px 6px;color:var(--muted)">' + f(p, true) + '</td>'; }).join('') + '</tr>';
  };
  return '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;width:100%">' + kop
    + rij('Netto-omzet', function (j, p) { return finGeld(p ? j.exploitatie.omzet : j.genormaliseerd.omzet); })
    + rij('Gerapporteerde EBITDA', function (j, p) { return p ? '' : finGeld(j.gerapporteerd.ebitda); })
    + rij('Goedgekeurde normalisaties', function (j, p) { return p ? '' : finGeld(j.normalisatie_totaal); })
    + rij('Genormaliseerde EBITDA', function (j, p) { return finGeld(p ? j.exploitatie.ebitda : j.genormaliseerd.ebitda); }, true)
    + rij('Brutomarge', function (j) { return finPct(j.kpi.brutomarge_pct); })
    + rij('EBITDA-marge', function (j) { return finPct(j.kpi.ebitda_marge_pct); })
    + rij('Omzetgroei', function (j, p) { return p ? '' : finPct(j.kpi.omzetgroei_pct); })
    + rij('Omzet per fte', function (j) { return finGeld(j.kpi.omzet_per_fte); })
    + rij('EBITDA per fte', function (j) { return finGeld(j.kpi.ebitda_per_fte); })
    + '</table></div>';
}
function finNmHtml(n) {
  var bg = isTussen(), dis = FIN.bezig ? ' disabled' : '';
  var h = '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;margin:.35rem 0;font-size:12px;color:var(--sub)">'
    + '<div><strong>' + finEsc(n.jaar) + ' · ' + finEsc(n.omschrijving) + '</strong> · ' + finGeld(n.bedrag) + ' · ' + finEsc(finLabel(FIN_POST, n.post)) + ' · <em>' + finEsc(FIN_STATUS[n.status] || n.status) + '</em></div>'
    + '<div style="color:var(--muted)">' + finEsc(finLabel(FIN_SOORT, n.soort)) + ' · ' + finEsc(n.karakter) + ' · zekerheid ' + finEsc(n.zekerheid) + ' · herkomst ' + finEsc(n.herkomst === 'kvm' ? 'KVM-voorstel' : n.herkomst) + '</div>'
    + '<div>Bron: ' + finEsc(n.bron) + '</div>'
    + (n.motivering ? '<div>Motivering: ' + finEsc(n.motivering) + '</div>' : '') + (n.risico ? '<div>Risico: ' + finEsc(n.risico) + '</div>' : '')
    + (n.kvm_advies ? '<div style="color:var(--muted)">Advies KVM: ' + finEsc(n.kvm_advies) + '</div>' : '') + (n.beoordeling ? '<div>Beoordeling: ' + finEsc(n.beoordeling) + '</div>' : '');
  if (bg) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.4rem"><select id="fin-st-' + finEsc(n.id) + '"' + dis + '>' + ['voorstel', 'goedgekeurd', 'afgewezen'].map(function (s) { return '<option value="' + s + '"' + (n.status === s ? ' selected' : '') + '>' + FIN_STATUS[s] + '</option>'; }).join('') + '</select>'
      + '<input id="fin-mo-' + finEsc(n.id) + '" maxlength="2000" placeholder="" aria-label="Motivering (verplicht bij goedkeuren)" value="' + finEsc(n.motivering) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<input id="fin-be-' + finEsc(n.id) + '" maxlength="1000" aria-label="Beoordeling (verplicht bij afwijzen)" value="' + finEsc(n.beoordeling) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<button class="btn btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finBeoordeel(this)"' + dis + '>Vastleggen</button>'
      + '<button class="btn-ghost btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finVerwijder(this)"' + dis + '>Verwijderen</button></div>';
  }
  return h + '</div>';
}
function finFormHtml() {
  var f = FIN.form, dis = FIN.bezig ? ' disabled' : '', st = 'font-size:12px;width:100%';
  var sel = function (k, lijst) { return '<select style="' + st + '" onchange="finZet(\'' + k + '\',this.value)"' + dis + '>' + lijst.map(function (o) { return '<option value="' + o[0] + '"' + (f[k] === o[0] ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join('') + '</select>'; };
  var inp = function (k, label, max) { return '<label style="font-size:11px;display:block;margin-top:.3rem">' + label + '<input maxlength="' + max + '" style="' + st + '" value="' + finEsc(f[k] || '') + '" oninput="finZet(\'' + k + '\',this.value)"' + dis + '></label>'; };
  var jaren = (FIN.data.jaren || []).map(function (j) { return [String(j.jaar), String(j.jaar)]; });
  if (!jaren.length) jaren = [[String(f.jaar), String(f.jaar)]];
  return '<div style="border:1px dashed var(--border2);border-radius:var(--r);padding:.6rem;margin-top:.5rem">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px">'
    + '<label style="font-size:11px">Boekjaar' + sel('jaar', jaren) + '</label><label style="font-size:11px">EBITDA-post' + sel('post', FIN_POST) + '</label><label style="font-size:11px">Soort' + sel('soort', FIN_SOORT) + '</label>'
    + '<label style="font-size:11px">Karakter' + sel('karakter', [['incidenteel', 'Incidenteel'], ['structureel', 'Structureel']]) + '</label><label style="font-size:11px">Zekerheid' + sel('zekerheid', [['hoog', 'Hoog'], ['midden', 'Midden'], ['laag', 'Laag']]) + '</label></div>'
    + inp('bedrag', 'Effect op de EBITDA in euro (positief verhoogt, negatief verlaagt)', 20) + inp('omschrijving', 'Omschrijving', 160) + inp('bron', 'Financiële bron (rekening, document of toelichting)', 300)
    + inp('motivering', 'Motivering', 2000) + inp('risico', 'Risico en onzekerheid', 1000)
    + '<div style="margin-top:.4rem"><button class="btn btn-sm" style="font-size:11px" onclick="finBewaarNieuw()"' + dis + '>Als voorstel vastleggen</button></div></div>';
}
function finPrognoseHtml(d) {
  if (!isTussen()) return d.prognose.status === 'goedgekeurd' ? '<div style="font-size:12px;color:var(--muted);margin-top:.4rem">De adviseur heeft een prognose als scenario goedgekeurd.</div>' : '';
  if (!d.jaren.length) return '';
  var dis = FIN.bezig ? ' disabled' : '', basis = d.jaren[d.jaren.length - 1].jaar;
  var a = d.prognose.aannames || [], fte = d.prognose.fte || {};
  var h = '<div style="font-size:12px;font-weight:600;margin-top:.8rem">Prognose (maximaal twee jaren, scenario vanaf ' + finEsc(basis) + ')</div>'
    + '<div style="font-size:11px;color:var(--muted)">Status: ' + finEsc(d.prognose.status === 'goedgekeurd' ? 'goedgekeurd' + (d.prognose.goedgekeurd_door ? ' door ' + d.prognose.goedgekeurd_door : '') : (d.prognose.status === 'concept' ? 'concept (nog niet in het memorandum)' : 'geen')) + '. Elke wijziging zet de prognose terug naar concept.</div>';
  for (var i = 0; i < 2; i++) {
    var x = a[i] || {}, v = function (k) { return x[k] != null ? String(x[k]).replace('.', ',') : ''; };
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;margin-top:.3rem"><label><input type="checkbox" id="fin-p' + i + '-aan"' + (a[i] ? ' checked' : '') + dis + '> ' + (basis + i + 1) + '</label>'
      + '<label>omzetgroei % <input id="fin-p' + i + '-omzet" value="' + finEsc(v('omzet_groei_pct')) + '" style="width:60px"' + dis + '></label>'
      + '<label>personeel % <input id="fin-p' + i + '-personeel" value="' + finEsc(v('personeel_groei_pct')) + '" style="width:60px"' + dis + '></label>'
      + '<label>overige kosten % <input id="fin-p' + i + '-overig" value="' + finEsc(v('overige_kosten_groei_pct')) + '" style="width:60px"' + dis + '></label>'
      + '<input id="fin-p' + i + '-toel" maxlength="1000" aria-label="Toelichting op de aannames" value="' + finEsc(x.toelichting || '') + '" style="flex:1;min-width:160px"' + dis + '></div>';
  }
  var fteJaren = d.jaren.map(function (j) { return j.jaar; }).concat([basis + 1, basis + 2]);
  h += '<div style="font-size:12px;margin-top:.4rem">Fte per jaar (voor omzet en EBITDA per fte; leeg laten als onbekend): ' + fteJaren.map(function (y) { return '<label style="margin-right:6px">' + y + ' <input data-fte-jaar="' + y + '" value="' + finEsc(fte[y] != null ? String(fte[y]).replace('.', ',') : '') + '" style="width:50px"' + dis + '></label>'; }).join('') + '</div>'
    + '<div style="margin-top:.4rem;display:flex;gap:6px"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="finBewaarPrognose()"' + dis + '>Aannames opslaan</button>'
    + (d.prognose.status === 'concept' ? '<button class="btn btn-sm" style="font-size:11px" onclick="finKeurPrognoseGoed()"' + dis + '>Prognose goedkeuren</button>' : '') + '</div>';
  return h;
}
function renderFinancieleAnalyse(faseId) {
  finSync();
  if (faseId !== 'financieel' || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (FIN.status === 'idle') setTimeout(finLaad, 0);
  var h = '<div class="panel" id="fin-panel" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">&#128202; Normalisaties, prognose en kerncijfers</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">De genormaliseerde EBITDA is de gerapporteerde EBITDA plus of min de goedgekeurde normalisaties. Voorstellen tellen pas mee nadat de adviseur ze heeft goedgekeurd. Een prognose is een scenario en verschijnt alleen na goedkeuring in het memorandum.</div>';
  if (FIN.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid ' + (FIN.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + finEsc(FIN.melding.tekst) + '</div>';
  if (FIN.status !== 'ok' || !FIN.data) return h + '<div style="font-size:12px;color:var(--muted)">' + (FIN.status === 'fout' ? 'De financiële analyse kon niet worden geladen.' : 'Laden…') + '</div></div>';
  var d = FIN.data, dis = FIN.bezig ? ' disabled' : '';
  h += finAansluitingHtml(d)
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.6rem">' + (isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finVoorstellen()"' + dis + '>Voorstellen van KVM ophalen</button>' : '')
    + '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finOpenForm()"' + dis + '>Normalisatie voorstellen</button></div>'
    + (FIN.form ? finFormHtml() : '') + d.normalisaties.map(finNmHtml).join('') + finPrognoseHtml(d);
  return h + '</div>';
}
// Dealvoorstel (mna/04): genormaliseerde EBITDA en goedgekeurde prognose als expliciete keuze, nooit automatisch.
window.finDealvoorstelHint = function (doelEl) {
  if (!doelEl || !isTussen()) return;
  finHaal().then(function (x) {
    if (!(x.s === 200 && x.d && x.d.ok === true && x.d.jaren && x.d.jaren.length)) return;
    var j = x.d.jaren[x.d.jaren.length - 1], p = x.d.prognose.status === 'goedgekeurd' && x.d.prognose.jaren.length ? x.d.prognose.jaren[0] : null;
    doelEl.innerHTML = '<div style="font-size:12px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;margin-bottom:.8rem">'
      + 'Uit de financiële analyse: genormaliseerde EBITDA ' + finEsc(j.jaar) + ' <strong>' + finGeld(j.genormaliseerd.ebitda) + '</strong>'
      + ' <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-waarde="' + Math.round(j.genormaliseerd.ebitda) + '" onclick="var e=document.getElementById(\'dv-ebitda-bewezen\');if(e){e.value=this.getAttribute(\'data-waarde\');}">Overnemen als bewezen EBITDA</button>'
      + (p ? '<br>Goedgekeurde prognose ' + finEsc(p.jaar) + ': EBITDA <strong>' + finGeld(p.exploitatie.ebitda) + '</strong> <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-waarde="' + Math.round(p.exploitatie.ebitda) + '" onclick="var e=document.getElementById(\'dv-ebitda-prognose\');if(e){e.value=this.getAttribute(\'data-waarde\');}">Overnemen als prognose-EBITDA</button>' : '')
      + '</div>';
  });
};
