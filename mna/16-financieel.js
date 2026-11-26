// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase B (28 okt 2026): normalisaties, prognose en financiële kerncijfers (backend worker/46, één
// rekenbron). Paneel in fase Financieel onder de kolommenbalans. Alleen goedgekeurde normalisaties tellen mee;
// goedkeuren en de prognose zijn voorbehouden aan de begeleider. In het dealvoorstel-venster (mna/04) biedt
// finDealvoorstelHint() de genormaliseerde EBITDA en een goedgekeurde prognose aan als expliciete keuze.

var FIN = { scope: null, status: 'idle', data: null, bezig: false, melding: null, form: null };
var FIN_POST = [['omzet', 'Netto-omzet'], ['kostprijs', 'Kostprijs'], ['personeel', 'Personeelskosten'], ['huisvesting', 'Huisvestingskosten'], ['vervoer', 'Vervoerskosten'], ['verkoop', 'Verkoopkosten'], ['algemeen', 'Kantoor- en algemene kosten']];
var FIN_SOORT = [['incidenteel', 'Incidentele bate of last'], ['partnerbeloning', 'Afwijkende partnerbeloning'], ['vervangingskosten', 'Marktconforme vervangingskosten'], ['personeelsuitval', 'Tijdelijke personeelsuitval'],
  ['vacature', 'Vacature'], ['advieskosten', 'Eenmalige advieskosten'], ['reorganisatie', 'Reorganisatiekosten'], ['niet_operationeel', 'Niet-operationele kosten of opbrengsten'], ['overig', 'Andere aantoonbare correctie'],
  // KVM-014 (26-11-2026)
  ['managementfee', 'Managementfee'], ['familieleden', 'Beloning meewerkende familieleden'], ['huisvesting_marktconform', 'Marktconforme huisvestingskosten'], ['prive_kosten', 'Privé- of niet-zakelijke kosten'],
  ['transactiekosten', 'Transactiekosten'], ['it_implementatie', 'Eenmalige IT- of implementatiekosten'], ['subsidie', 'Niet-structurele subsidie'], ['verbonden_partijen', 'Niet-marktconforme transactie met verbonden partij'],
  ['niet_overdraagbaar', 'Niet-overdraagbare activiteit'], ['ontbrekende_kosten', 'Structureel ontbrekende kosten'], ['eigen', 'Eigen categorie']];
var FIN_STATUS = { voorstel: 'Voorstel', goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen', geparkeerd: 'Geparkeerd (wacht op informatie)' };
// #91 B1 (13-11-2026): equity bridge-posten (backend worker/46). Teken volgt uit de soort; alleen goedgekeurde posten tellen.
// Balansherkomst van een debt-/cash-like post (besluit Marcel 13-11): voorkomt dubbeltelling met werkkapitaal en netto schuld.
var FIN_EQ_BP = [['', 'Kies waar deze post op de balans staat'], ['buiten_balans', 'Niet in de jaarbalans (bijv. claim, achterstallig onderhoud)'], ['crediteuren', 'Crediteuren (werkkapitaal)'], ['belasting_premies', 'Belastingen en premies (werkkapitaal)'], ['schulden_kort_overig', 'Overige kortlopende schulden (werkkapitaal)'], ['voorzieningen', 'Voorzieningen'], ['vorderingen_overig', 'Overige vorderingen (werkkapitaal)'], ['debiteuren', 'Debiteuren (werkkapitaal)'], ['voorraad', 'Voorraad (werkkapitaal)'], ['onderhanden_werk', 'Onderhanden werk (werkkapitaal)'], ['financieel_va', 'Financiële vaste activa'], ['overig', 'Overig']];
var FIN_EQ = [['rentedragende_schuld', 'Rentedragende schuld (verlaagt)'], ['liquide_middelen', 'Liquide middelen (verhoogt)'], ['cash_like', 'Cash-like post (verhoogt)'], ['debt_like', 'Debt-like post (verlaagt)'], ['werkkapitaal_normaal', 'Normaal werkkapitaal'], ['werkkapitaal_actueel', 'Actueel werkkapitaal']];

function finEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function finGeld(n) { if (typeof n !== 'number' || !isFinite(n)) return ''; var r = Math.round(n); return (r < 0 ? '-€ ' : '€ ') + Math.abs(r).toLocaleString('nl-NL'); }
function finPct(n) { return typeof n === 'number' && isFinite(n) ? String(n).replace('.', ',') + '%' : ''; }
function finLabel(lijst, w) { for (var i = 0; i < lijst.length; i++) if (lijst[i][0] === w) return lijst[i][1]; return w; }
function finScope() { var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null; return JSON.stringify([S.code || '', S.rol || '', f ? f.id : '']); }
function finSync() { var k = finScope(); if (FIN.scope !== k) { FIN.scope = k; FIN.status = 'idle'; FIN.data = null; FIN.bezig = false; FIN.melding = null; FIN.form = null; FIN.eqForm = null; FIN.wsForm = null; } }
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
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { FIN.data = x.d; FIN.form = null; FIN.eqForm = null; FIN.wsForm = null; FIN.melding = { soort: 'ok', tekst: ok + (typeof x.d.nieuw === 'number' ? ' (' + x.d.nieuw + ' nieuw)' : '') }; }
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
  var ob = String(f.oorspronkelijk_bedrag == null ? '' : f.oorspronkelijk_bedrag).trim();
  var body = { jaar: Number(f.jaar), post: f.post, soort: f.soort, bedrag: bedrag, omschrijving: f.omschrijving || '', bron: f.bron || '', karakter: f.karakter, zekerheid: f.zekerheid, motivering: f.motivering || '', risico: f.risico || '',
    grootboekrekening: f.grootboekrekening || '', oorspronkelijk_bedrag: ob === '' ? null : Number(ob.replace(/\./g, '').replace(',', '.')), berekeningswijze: f.berekeningswijze || '', soort_label: f.soort === 'eigen' ? (f.soort_label || '') : '' };
  // KVM-014: hetzelfde formulier wijzigt een bestaande normalisatie; die wordt daarna weer een voorstel (opnieuw goedkeuren).
  if (f.id) { body.id = f.id; body.rev = f.rev; finPost('normalisatie/wijzig', body, 'Normalisatie gewijzigd; opnieuw goedkeuren is nodig.'); }
  else finPost('normalisatie', body, 'Normalisatie als voorstel vastgelegd.');
};
window.finBeoordeel = function (el) {
  var id = el.getAttribute('data-id'), n = finNm(id); if (!n) return;
  var st = ge('fin-st-' + id), mo = ge('fin-mo-' + id), be = ge('fin-be-' + id);
  var oi = ge('fin-oi-' + id), ao = ge('fin-ao-' + id);
  finPost('normalisatie/beoordeel', { id: id, rev: n.rev, status: st ? st.value : '', motivering: mo ? mo.value : undefined, beoordeling: be ? be.value : '',
    ontbrekende_info: oi ? oi.value : undefined, aanvullende_onderbouwing: ao ? ao.value : '' }, 'Beoordeling vastgelegd.');
};
window.finWijzig = function (el) {
  var n = finNm(el.getAttribute('data-id')); if (!n) return;
  FIN.form = { id: n.id, rev: n.rev, jaar: n.jaar, post: n.post, soort: n.soort, karakter: n.karakter, zekerheid: n.zekerheid, bedrag: String(n.bedrag).replace('.', ','), omschrijving: n.omschrijving, bron: n.bron,
    motivering: n.motivering, risico: n.risico, grootboekrekening: n.grootboekrekening, oorspronkelijk_bedrag: n.oorspronkelijk_bedrag == null ? '' : String(n.oorspronkelijk_bedrag).replace('.', ','), berekeningswijze: n.berekeningswijze, soort_label: n.soort_label };
  finHerteken();
};
window.finVerwijder = function (el) { var id = el.getAttribute('data-id'), n = finNm(id); if (n && confirm('Deze normalisatie verwijderen?')) finPost('normalisatie/verwijder', { id: id, rev: n.rev }, 'Normalisatie verwijderd.'); };
window.finEqVoorstellen = function () { finPost('equityvoorstellen', {}, 'Voorstellen uit de kolommenbalans opgehaald'); };
window.finEqOpenForm = function () { FIN.eqForm = { soort: 'debt_like' }; finHerteken(); };
window.finEqZet = function (k, v) { if (FIN.eqForm) FIN.eqForm[k] = v; };
function finEqPost(id) { return ((FIN.data && FIN.data.equity_posten) || []).filter(function (x) { return x.id === id; })[0]; }
window.finEqBewaar = function () {
  var f = FIN.eqForm; if (!f) return;
  var bedrag = Number(String(f.bedrag || '').replace(/\./g, '').replace(',', '.'));
  finPost('equitypost', { soort: f.soort, bedrag: bedrag, omschrijving: f.omschrijving || '', bron: f.bron || '', peildatum: f.peildatum || null, motivering: f.motivering || '', balanspost: f.balanspost || '' }, 'Post als voorstel vastgelegd.');
};
window.finEqBeoordeel = function (el) {
  var id = el.getAttribute('data-id'), n = finEqPost(id); if (!n) return;
  var st = ge('fin-eq-st-' + id), mo = ge('fin-eq-mo-' + id), be = ge('fin-eq-be-' + id);
  finPost('equitypost/beoordeel', { id: id, rev: n.rev, status: st ? st.value : '', motivering: mo ? mo.value : undefined, beoordeling: be ? be.value : '' }, 'Beoordeling vastgelegd.');
};
window.finEqVerwijder = function (el) { var id = el.getAttribute('data-id'), n = finEqPost(id); if (n && confirm('Deze post verwijderen?')) finPost('equitypost/verwijder', { id: id, rev: n.rev }, 'Post verwijderd.'); };
// ── #91 B5 (13-11/18-11-2026): centrale goedgekeurde waarderingsset (alleen begeleider; backend worker/46) ──
window.finWsOpen = function () {
  var w = FIN.data && FIN.data.waarderingsset, j = FIN.data && FIN.data.jaren.length ? FIN.data.jaren[FIN.data.jaren.length - 1].jaar : null;
  FIN.wsForm = w ? { grondslag: w.grondslag, grondslag_jaar: w.grondslag_jaar || j, grondslag_bedrag: w.grondslag_bedrag || '', grondslag_reden: w.grondslag_reden, multiple_laag: w.multiple_laag, multiple_hoog: w.multiple_hoog, multiple_onderbouwing: w.multiple_onderbouwing, transactiekosten_pct: w.transactiekosten_pct, scenario: w.scenario, peildatum: w.peildatum }
    : { grondslag: j ? 'genormaliseerde_ebitda' : 'handmatig', grondslag_jaar: j, transactiekosten_pct: 2, scenario: 'Basisscenario', peildatum: new Date().toISOString().slice(0, 10) };
  finHerteken();
};
window.finWsZet = function (k, v) { if (FIN.wsForm) FIN.wsForm[k] = v; };
window.finWsBewaar = function () {
  var f = FIN.wsForm; if (!f) return;
  var getal = function (v) { return Number(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); };
  var dec = function (v) { return Number(String(v == null ? '' : v).replace(',', '.')); };
  var w = FIN.data.waarderingsset, rev = w && w.status === 'concept' ? w.rev : 0;
  finPost('waardering', { rev: rev, grondslag: f.grondslag, grondslag_jaar: Number(f.grondslag_jaar), grondslag_bedrag: f.grondslag === 'handmatig' ? getal(f.grondslag_bedrag) : undefined, grondslag_reden: f.grondslag_reden || '',
    multiple_laag: dec(f.multiple_laag), multiple_hoog: dec(f.multiple_hoog), multiple_onderbouwing: f.multiple_onderbouwing || '', transactiekosten_pct: dec(f.transactiekosten_pct), scenario: f.scenario || '', peildatum: f.peildatum || '' }, 'Waarderingsset als concept opgeslagen.');
};
window.finWsKeurGoed = function () {
  var w = FIN.data.waarderingsset, mo = ge('fin-ws-mo'); if (!w) return;
  finPost('waardering/goedkeuren', { rev: w.rev, motivering: mo ? mo.value : '' }, 'Waarderingsset goedgekeurd; de indicatieve waardering op het dashboard volgt deze set.');
};
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
    + '<div style="color:var(--muted)">' + finEsc(n.soort === 'eigen' && n.soort_label ? n.soort_label : finLabel(FIN_SOORT, n.soort)) + ' · ' + finEsc(n.karakter) + ' · zekerheid ' + finEsc(n.zekerheid) + ' · herkomst ' + finEsc(n.herkomst === 'kvm' ? 'KVM-voorstel' : n.herkomst) + '</div>'
    + '<div>Bron: ' + finEsc(n.bron) + (n.grootboekrekening ? ' · grootboekrekening ' + finEsc(n.grootboekrekening) : '') + (n.oorspronkelijk_bedrag != null ? ' · oorspronkelijk bedrag ' + finGeld(n.oorspronkelijk_bedrag) : '') + ' · versie ' + finEsc(n.versie || 1) + '</div>'
    + (n.berekeningswijze ? '<div>Berekeningswijze: ' + finEsc(n.berekeningswijze) + '</div>' : '')
    + (n.ontbrekende_info ? '<div style="color:var(--gold-dark)"><strong>Informatieverzoek:</strong> ' + finEsc(n.ontbrekende_info) + '</div>' : '')
    + ((n.signalen || []).length ? '<div style="color:var(--red)">' + n.signalen.map(function (x) { return '&#9888; ' + finEsc(x.tekst); }).join('<br>') + '</div>' : '')
    + (n.herhaling_onderbouwing ? '<div>Aanvullende onderbouwing: ' + finEsc(n.herhaling_onderbouwing) + '</div>' : '')
    + (n.motivering ? '<div>Motivering: ' + finEsc(n.motivering) + '</div>' : '') + (n.risico ? '<div>Risico: ' + finEsc(n.risico) + '</div>' : '')
    + (n.kvm_advies ? '<div style="color:var(--muted)">Advies KVM: ' + finEsc(n.kvm_advies) + '</div>' : '') + (n.beoordeling ? '<div>Beoordeling: ' + finEsc(n.beoordeling) + '</div>' : '');
  if (bg) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.4rem"><select id="fin-st-' + finEsc(n.id) + '"' + dis + '>' + ['voorstel', 'goedgekeurd', 'afgewezen', 'geparkeerd'].map(function (s) { return '<option value="' + s + '"' + (n.status === s ? ' selected' : '') + '>' + FIN_STATUS[s] + '</option>'; }).join('') + '</select>'
      + '<input id="fin-mo-' + finEsc(n.id) + '" maxlength="2000" placeholder="" aria-label="Motivering (verplicht bij goedkeuren)" value="' + finEsc(n.motivering) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<input id="fin-be-' + finEsc(n.id) + '" maxlength="1000" aria-label="Beoordeling (verplicht bij afwijzen)" value="' + finEsc(n.beoordeling) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<input id="fin-oi-' + finEsc(n.id) + '" maxlength="1000" aria-label="Ontbrekende informatie (verplicht bij parkeren)" value="' + finEsc(n.ontbrekende_info) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + ((n.signalen || []).length ? '<input id="fin-ao-' + finEsc(n.id) + '" maxlength="1000" aria-label="Aanvullende onderbouwing (verplicht bij goedkeuren met signaal)" value="" style="flex:1;min-width:160px;font-size:12px"' + dis + '>' : '')
      + '<button class="btn btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finBeoordeel(this)"' + dis + '>Vastleggen</button>'
      + '<button class="btn-ghost btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finWijzig(this)"' + dis + '>Wijzigen</button>'
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
    + inp('soort_label', 'Naam eigen categorie (alleen bij soort Eigen categorie)', 60) + inp('grootboekrekening', 'Grootboekrekening', 40) + inp('oorspronkelijk_bedrag', 'Oorspronkelijk bedrag in euro', 20)
    + inp('berekeningswijze', 'Berekeningswijze', 1000) + inp('motivering', 'Motivering', 2000) + inp('risico', 'Risico en onzekerheid', 1000)
    + '<div style="margin-top:.4rem"><button class="btn btn-sm" style="font-size:11px" onclick="finBewaarNieuw()"' + dis + '>' + (f.id ? 'Wijziging vastleggen (daarna opnieuw goedkeuren)' : 'Als voorstel vastleggen') + '</button></div></div>';
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
// #91 B4 (13-11-2026): aansluiting tussen de historische omzet uit de jaarrekening (#73, velden omzet1/2/3 met boekjaar uit
// de herkomst) en de gerapporteerde omzet uit de kolommenbalans van hetzelfde boekjaar. Alleen vergelijken bij een bekend
// boekjaar; een verschil groter dan € 1.000 of 0,5% wordt gemeld, nooit stil gekozen (werkregel 6).
function finHistorieAansluiting(d) {
  var bron = S._groepData || S.data || {}, uit = [];
  ['omzet1', 'omzet2', 'omzet3'].forEach(function (slot) {
    var key = 'financieel_' + slot, ruw = bron[key];
    if (!ruw || !String(ruw).trim()) return;
    var waarde = parseGeld(ruw);
    if (!isFinite(waarde)) return;
    var jaar = (S._docJaar && S._docJaar[key]) || (S._opySlotJaar && S._opySlotJaar[slot]) || null;
    var kb = jaar ? (d.jaren || []).filter(function (j) { return String(j.jaar) === String(jaar); })[0] : null;
    if (!jaar) { uit.push({ slot: slot, jaar: null, jaarrekening: waarde, kolommenbalans: null, status: 'jaar_onbekend' }); return; }
    if (!kb) { uit.push({ slot: slot, jaar: String(jaar), jaarrekening: waarde, kolommenbalans: null, status: 'geen_kolommenbalans' }); return; }
    var kbRuw = kb.gerapporteerd ? kb.gerapporteerd.omzet : null;
    // Codex-review 13-11 (P2): een ontbrekende of niet-getalsmatige kolommenbalansomzet is geen aansluiting en geen nul.
    if (kbRuw === null || kbRuw === undefined || kbRuw === '' || !isFinite(Number(kbRuw))) { uit.push({ slot: slot, jaar: String(jaar), jaarrekening: waarde, kolommenbalans: null, status: 'kolommenbalans_onvolledig' }); return; }
    var kbOmzet = Number(kbRuw), verschil = waarde - kbOmzet;
    var drempel = Math.max(1000, Math.abs(kbOmzet) * 0.005);
    uit.push({ slot: slot, jaar: String(jaar), jaarrekening: waarde, kolommenbalans: kbOmzet, verschil: verschil, status: Math.abs(verschil) > drempel ? 'verschil' : 'sluit_aan' });
  });
  return uit;
}
function finHistorieAansluitingHtml(d) {
  var r = finHistorieAansluiting(d);
  if (!r.length) return '';
  var st = { sluit_aan: 'sluit aan', verschil: 'verschil: controleer welke bron juist is', jaar_onbekend: 'boekjaar onbekend, niet te vergelijken', geen_kolommenbalans: 'geen kolommenbalans voor dit jaar', kolommenbalans_onvolledig: 'omzet ontbreekt in de kolommenbalans, niet te vergelijken' };
  return '<div style="font-size:12px;font-weight:600;margin-top:.8rem">Aansluiting omzet jaarrekening en kolommenbalans</div>'
    + '<table style="border-collapse:collapse;font-size:12px;margin-top:.3rem"><tr><th style="text-align:left;padding:3px 6px">Boekjaar</th><th style="text-align:right;padding:3px 6px">Jaarrekening</th><th style="text-align:right;padding:3px 6px">Kolommenbalans</th><th style="text-align:left;padding:3px 6px"></th></tr>'
    + r.map(function (x) { return '<tr><td style="padding:3px 6px">' + finEsc(x.jaar || '?') + '</td><td style="text-align:right;padding:3px 6px">' + finGeld(x.jaarrekening) + '</td><td style="text-align:right;padding:3px 6px">' + (x.kolommenbalans === null ? '–' : finGeld(x.kolommenbalans)) + '</td><td style="padding:3px 6px' + (x.status === 'verschil' || x.status === 'kolommenbalans_onvolledig' ? ';color:var(--red)' : '') + '" data-aansluiting="' + x.status + '">' + st[x.status] + (x.status === 'verschil' ? ' (' + finGeld(x.verschil) + ')' : '') + '</td></tr>'; }).join('') + '</table>';
}
function finEqPostHtml(n) {
  var bg = isTussen(), dis = FIN.bezig ? ' disabled' : '';
  var h = '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;margin:.35rem 0;font-size:12px;color:var(--sub)">'
    + '<div><strong>' + finEsc(n.omschrijving) + '</strong> · ' + finGeld(n.bedrag) + ' · ' + finEsc(finLabel(FIN_EQ, n.soort)) + ' · <em>' + finEsc(FIN_STATUS[n.status] || n.status) + '</em></div>'
    + '<div>Bron: ' + finEsc(n.bron) + (n.peildatum ? ' · peildatum ' + finEsc(n.peildatum) : '') + ' · herkomst ' + finEsc(n.herkomst === 'kvm' ? 'KVM-voorstel' : n.herkomst) + (n.balanspost ? ' · balans: ' + finEsc(finLabel(FIN_EQ_BP, n.balanspost)) : '') + (n.status === 'goedgekeurd' && n.goedgekeurd_door ? ' · goedgekeurd door ' + finEsc(n.goedgekeurd_door) : '') + '</div>'
    + (n.motivering ? '<div>Motivering: ' + finEsc(n.motivering) + '</div>' : '') + (n.kvm_advies ? '<div style="color:var(--muted)">Advies KVM: ' + finEsc(n.kvm_advies) + '</div>' : '') + (n.beoordeling ? '<div>Beoordeling: ' + finEsc(n.beoordeling) + '</div>' : '');
  if (bg) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.4rem"><select id="fin-eq-st-' + finEsc(n.id) + '"' + dis + '>' + ['voorstel', 'goedgekeurd', 'afgewezen'].map(function (s) { return '<option value="' + s + '"' + (n.status === s ? ' selected' : '') + '>' + FIN_STATUS[s] + '</option>'; }).join('') + '</select>'
      + '<input id="fin-eq-mo-' + finEsc(n.id) + '" maxlength="2000" aria-label="Motivering (verplicht bij goedkeuren)" value="' + finEsc(n.motivering) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<input id="fin-eq-be-' + finEsc(n.id) + '" maxlength="1000" aria-label="Beoordeling (verplicht bij afwijzen)" value="' + finEsc(n.beoordeling) + '" style="flex:1;min-width:160px;font-size:12px"' + dis + '>'
      + '<button class="btn btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finEqBeoordeel(this)"' + dis + '>Vastleggen</button>'
      + '<button class="btn-ghost btn-sm" style="font-size:11px" data-id="' + finEsc(n.id) + '" onclick="finEqVerwijder(this)"' + dis + '>Verwijderen</button></div>';
  }
  return h + '</div>';
}
function finEqFormHtml() {
  var f = FIN.eqForm, dis = FIN.bezig ? ' disabled' : '', st = 'font-size:12px;width:100%';
  var inp = function (k, label, max) { return '<label style="font-size:11px;display:block;margin-top:.3rem">' + label + '<input maxlength="' + max + '" style="' + st + '" value="' + finEsc(f[k] || '') + '" oninput="finEqZet(\'' + k + '\',this.value)"' + dis + '></label>'; };
  return '<div style="border:1px dashed var(--border2);border-radius:var(--r);padding:.6rem;margin-top:.5rem">'
    + '<label style="font-size:11px">Soort<select style="' + st + '" onchange="finEqZet(\'soort\',this.value);finHerteken()"' + dis + '>' + FIN_EQ.map(function (o) { return '<option value="' + o[0] + '"' + (f.soort === o[0] ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join('') + '</select></label>'
    + ((f.soort === 'debt_like' || f.soort === 'cash_like') ? '<label style="font-size:11px;display:block;margin-top:.3rem">Balansherkomst (tegen dubbeltelling met werkkapitaal en netto schuld)<select style="' + st + '" onchange="finEqZet(\'balanspost\',this.value)"' + dis + '>' + FIN_EQ_BP.map(function (o) { return '<option value="' + o[0] + '"' + ((f.balanspost || '') === o[0] ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join('') + '</select></label>' : '')
    + inp('bedrag', 'Bedrag in euro (positief; alleen werkkapitaal kan negatief zijn)', 20) + inp('omschrijving', 'Omschrijving', 160) + inp('bron', 'Bron (balanspost, document of toelichting)', 300)
    + inp('peildatum', 'Peildatum (JJJJ-MM-DD, optioneel)', 10) + inp('motivering', 'Motivering', 2000)
    + '<div style="margin-top:.4rem"><button class="btn btn-sm" style="font-size:11px" onclick="finEqBewaar()"' + dis + '>Als voorstel vastleggen</button></div></div>';
}
function finEqHtml(d) {
  var b = d.equity_bridge, posten = d.equity_posten || [], dis = FIN.bezig ? ' disabled' : '';
  if (!b) return '';
  var rij = function (label, v, vet) { return '<tr' + (vet ? ' style="font-weight:600;border-top:1px solid var(--border)"' : '') + '><td style="padding:3px 6px">' + label + '</td><td style="text-align:right;padding:3px 6px">' + (v === null || v === undefined ? '–' : finGeld(v)) + '</td></tr>'; };
  var ontb = { rentedragende_schuld: 'rentedragende schuld', liquide_middelen: 'liquide middelen', werkkapitaal: 'normaal én actueel werkkapitaal' };
  return '<div style="font-size:12px;font-weight:600;margin-top:.9rem">Equity bridge (ondernemingswaarde → aandelenwaarde)</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.5">Alleen goedgekeurde posten tellen. Rentedragende schuld en debt-like posten verlagen de aandelenwaarde; liquide middelen en cash-like posten verhogen haar; de werkkapitaalcorrectie is actueel min normaal werkkapitaal.</div>'
    + '<table style="border-collapse:collapse;font-size:12px;margin-top:.3rem">'
    + rij('Rentedragende schuld', b.rentedragende_schuld) + rij('Liquide middelen', b.liquide_middelen) + rij('Cash-like posten', b.cash_like) + rij('Netto schuld', b.netto_schuld, true)
    + rij('Debt-like posten', b.debt_like)
    + (b.dubbeltelling_correctie ? rij('Actueel werkkapitaal, gecorrigeerd voor posten die al debt-/cash-like zijn (' + (b.dubbeltelling_correctie > 0 ? '+' : '') + finGeld(b.dubbeltelling_correctie) + ')', b.werkkapitaal_actueel_gecorrigeerd) : '')
    + rij('Werkkapitaalcorrectie (actueel − normaal)', b.werkkapitaal_correctie) + rij('Af te trekken van de ondernemingswaarde', b.aftrek_totaal, true) + '</table>'
    + (b.ontbreekt && b.ontbreekt.length ? '<div style="font-size:11px;color:var(--red);margin-top:.3rem">Nog niet goedgekeurd: ' + b.ontbreekt.map(function (k) { return finEsc(ontb[k] || k); }).join(', ') + '.</div>' : '')
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.5rem">' + (isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finEqVoorstellen()"' + dis + '>Voorstellen uit de kolommenbalans</button>' : '')
    + '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finEqOpenForm()"' + dis + '>Post voorstellen</button></div>'
    + (FIN.eqForm ? finEqFormHtml() : '') + posten.map(finEqPostHtml).join('');
}
function finWsHtml(d) {
  if (!isTussen()) return '';
  var w = d.waarderingsset, b = d.waardering_berekend, dis = FIN.bezig ? ' disabled' : '';
  var h = '<div style="font-size:12px;font-weight:600;margin-top:.9rem">Waarderingsset (centraal, voor dealvoorstel en dashboard)</div>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.5">Eén goedgekeurde set met grondslag, multiple-bandbreedte, scenario en peildatum. Alleen voor de adviseur; niet zichtbaar voor verkoper of koper en niet in het informatiememorandum. Goedkeuren zet de indicatieve waardering op het dashboard.</div>';
  if (w && b) {
    var st = w.status === 'goedgekeurd' ? (b.verouderd ? 'goedgekeurd, maar VEROUDERD: een bron is sindsdien gewijzigd' : 'goedgekeurd' + (w.goedgekeurd_door ? ' door ' + w.goedgekeurd_door : '')) : w.status;
    h += '<div style="font-size:12px;margin-top:.3rem' + (b.verouderd ? ';color:var(--red)' : '') + '">Versie ' + finEsc(w.versie) + ' · ' + finEsc(st) + ' · ' + finEsc(w.scenario) + ' · peildatum ' + finEsc(w.peildatum) + '</div>'
      + '<table style="border-collapse:collapse;font-size:12px;margin-top:.3rem">'
      + '<tr><td style="padding:3px 6px">Grondslag</td><td style="text-align:right;padding:3px 6px">' + finGeld(b.grondslag_bedrag) + '</td><td style="padding:3px 6px;color:var(--muted)">' + finEsc(w.grondslag === 'genormaliseerde_ebitda' ? 'genormaliseerde EBITDA ' + w.grondslag_jaar : 'handmatig: ' + w.grondslag_reden) + '</td></tr>'
      + '<tr><td style="padding:3px 6px">Multiple</td><td style="text-align:right;padding:3px 6px">' + finEsc(String(w.multiple_laag).replace('.', ',') + ' – ' + String(w.multiple_hoog).replace('.', ',')) + '</td><td style="padding:3px 6px;color:var(--muted)">' + finEsc(w.multiple_onderbouwing) + '</td></tr>'
      + (b.ondernemingswaarde ? '<tr><td style="padding:3px 6px">Ondernemingswaarde (laag / midden / hoog)</td><td style="text-align:right;padding:3px 6px" colspan="2">' + finGeld(b.ondernemingswaarde.laag) + ' / ' + finGeld(b.ondernemingswaarde.midden) + ' / ' + finGeld(b.ondernemingswaarde.hoog) + '</td></tr>' : '')
      + '<tr><td style="padding:3px 6px">Aandelenwaarde (laag / midden / hoog)</td><td style="text-align:right;padding:3px 6px" colspan="2">' + (b.aandelenwaarde ? finGeld(b.aandelenwaarde.laag) + ' / ' + finGeld(b.aandelenwaarde.midden) + ' / ' + finGeld(b.aandelenwaarde.hoog) : '<span style="color:var(--muted)">equity bridge nog niet volledig goedgekeurd</span>') + '</td></tr></table>';
    if (w.status === 'concept') h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.4rem"><input id="fin-ws-mo" maxlength="2000" aria-label="Motivering (verplicht bij goedkeuren)" style="flex:1;min-width:200px;font-size:12px"' + dis + '><button class="btn btn-sm" style="font-size:11px" onclick="finWsKeurGoed()"' + dis + '>Set goedkeuren</button></div>';
  } else h += '<div style="font-size:12px;color:var(--muted);margin-top:.3rem">Nog geen waarderingsset.</div>';
  h += '<div style="margin-top:.4rem"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="finWsOpen()"' + dis + '>' + (w && w.status === 'concept' ? 'Concept bewerken' : (w ? 'Nieuwe versie maken' : 'Waarderingsset maken')) + '</button></div>';
  if (FIN.wsForm) {
    var f = FIN.wsForm, stl = 'font-size:12px;width:100%';
    var inp = function (k, label, max) { return '<label style="font-size:11px;display:block;margin-top:.3rem">' + label + '<input maxlength="' + max + '" style="' + stl + '" value="' + finEsc(f[k] == null ? '' : f[k]) + '" oninput="finWsZet(\'' + k + '\',this.value)"' + dis + '></label>'; };
    var jaren = (d.jaren || []).map(function (j) { return '<option value="' + j.jaar + '"' + (Number(f.grondslag_jaar) === j.jaar ? ' selected' : '') + '>' + j.jaar + ' (genormaliseerde EBITDA ' + finEsc(finGeld(j.genormaliseerd.ebitda)) + ')</option>'; }).join('');
    h += '<div style="border:1px dashed var(--border2);border-radius:var(--r);padding:.6rem;margin-top:.5rem">'
      + '<label style="font-size:11px">Grondslag<select style="' + stl + '" onchange="finWsZet(\'grondslag\',this.value);finHerteken()"' + dis + '><option value="genormaliseerde_ebitda"' + (f.grondslag === 'genormaliseerde_ebitda' ? ' selected' : '') + '>Genormaliseerde EBITDA (financiële analyse)</option><option value="handmatig"' + (f.grondslag === 'handmatig' ? ' selected' : '') + '>Handmatig (met reden)</option></select></label>'
      + (f.grondslag === 'genormaliseerde_ebitda' ? '<label style="font-size:11px;display:block;margin-top:.3rem">Boekjaar<select style="' + stl + '" onchange="finWsZet(\'grondslag_jaar\',this.value)"' + dis + '>' + jaren + '</select></label>' : inp('grondslag_bedrag', 'Grondslag in euro', 20) + inp('grondslag_reden', 'Reden voor een handmatige grondslag', 1000))
      + inp('multiple_laag', 'Multiple laag', 6) + inp('multiple_hoog', 'Multiple hoog', 6) + inp('multiple_onderbouwing', 'Onderbouwing multiple (bijv. sectorbandbreedte, vergelijkbare transacties)', 2000)
      + inp('transactiekosten_pct', 'Transactiekosten (% van de ondernemingswaarde)', 5) + inp('scenario', 'Scenario', 120) + inp('peildatum', 'Peildatum (JJJJ-MM-DD)', 10)
      + '<div style="margin-top:.4rem"><button class="btn btn-sm" style="font-size:11px" onclick="finWsBewaar()"' + dis + '>Als concept opslaan</button></div></div>';
  }
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
  h += finAansluitingHtml(d) + finHistorieAansluitingHtml(d)
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:.6rem">' + (isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finVoorstellen()"' + dis + '>Voorstellen van KVM ophalen</button>' : '')
    + '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="finOpenForm()"' + dis + '>Normalisatie voorstellen</button></div>'
    + (FIN.form ? finFormHtml() : '') + d.normalisaties.map(finNmHtml).join('') + finPrognoseHtml(d) + finEqHtml(d) + finWsHtml(d);
  return h + '</div>';
}
// Dealvoorstel (mna/04): genormaliseerde EBITDA en goedgekeurde prognose als expliciete keuze, nooit automatisch.
// KVM-014 stap 1 + gouden werkregel 59 (26-11-2026): de genormaliseerde EBITDA uit de financiële analyse (alleen goedgekeurde
// normalisaties) is de gezaghebbende bron voor de bewezen EBITDA in het dealvoorstel, dus ook voor de multiple en de DCF die op
// dat veld rekenen. Het DD-veld is uitsluitend een zichtbare, gemotiveerde terugval; een handmatige afwijking vraagt een motivering
// die in de interne cijferbijlage van het dealvoorstel wordt vastgelegd (finEbitdaBronStatus, mna/04).
window.FIN_EBITDA_BRON = null;
function finZetEbitdaBron(bron, waarde, toelichting) {
  window.FIN_EBITDA_BRON = { bron: bron, waarde: waarde, toelichting: toelichting };
  var el = document.getElementById('dv-ebitda-bewezen'), info = document.getElementById('dv-ebitda-bron');
  if (el && bron === 'financieel') { el.value = Math.round(waarde); el.setAttribute('data-bron', 'financieel'); el.setAttribute('data-bron-waarde', String(Math.round(waarde))); }
  var mi = document.getElementById('dv-maatschap-info'); if (mi && bron === 'financieel') mi.style.display = 'none';
  if (el && !el.getAttribute('data-bron-luister')) {
    el.setAttribute('data-bron-luister', '1');
    el.addEventListener('input', finEbitdaBronTeken);
  }
  finEbitdaBronTeken();
}
function finEbitdaBronTeken() {
  var el = document.getElementById('dv-ebitda-bewezen'), info = document.getElementById('dv-ebitda-bron'), b = window.FIN_EBITDA_BRON;
  if (!el || !info || !b) return;
  var afwijking = b.bron !== 'financieel' || String(Math.round(parseFloat(el.value) || 0)) !== el.getAttribute('data-bron-waarde');
  var motVeld = '<label for="dv-ebitda-motivatie" style="display:block;font-size:11px;font-weight:600;margin-top:.35rem">Motivering handmatige bewezen EBITDA (verplicht)</label>'
    + '<input type="text" id="dv-ebitda-motivatie" maxlength="120" style="width:100%;font-size:12px" value="' + finEsc((document.getElementById('dv-ebitda-motivatie') || {}).value || '') + '">';
  info.innerHTML = !afwijking
    ? '<span style="color:var(--teal)">Bron: financiële analyse, genormaliseerde EBITDA ' + finEsc(b.toelichting) + ' (alleen goedgekeurde normalisaties).</span>'
    : '<span style="color:var(--red)">Handmatige waarde: ' + finEsc(b.bron === 'financieel' ? 'afwijkend van de genormaliseerde EBITDA uit de financiële analyse (' + finGeld(b.waarde) + ').' : b.toelichting) + '</span>' + motVeld;
}
// Voor mna/04 bij genereren: bron, waarde en motivering; geeft een foutmelding als een handmatige waarde geen motivering heeft.
window.finEbitdaBronStatus = function () {
  var el = document.getElementById('dv-ebitda-bewezen'), b = window.FIN_EBITDA_BRON;
  var huidig = el ? Math.round(parseFloat(el.value) || 0) : 0;
  var centraal = !!(b && b.bron === 'financieel' && el && String(huidig) === el.getAttribute('data-bron-waarde'));
  var mot = ((document.getElementById('dv-ebitda-motivatie') || {}).value || '').trim();
  return { bron: centraal ? 'financiële analyse (' + (b ? b.toelichting : '') + ')' : 'handmatig', motivering: centraal ? '' : mot, fout: !centraal && !mot ? 'Geef een motivering voor de handmatige bewezen EBITDA (afwijking van of ontbrekende genormaliseerde EBITDA uit de financiële analyse).' : '' };
};
window.finDealvoorstelHint = function (doelEl) {
  if (!doelEl || !isTussen()) return;
  window.FIN_EBITDA_BRON = null;
  var terugval = function (reden) { finZetEbitdaBron('handmatig', null, reden); };
  finHaal().then(function (x) {
    if (!(x.s === 200 && x.d && x.d.ok === true && x.d.jaren && x.d.jaren.length)) { terugval('geen gereed boekjaar in de financiële analyse; de waarde komt uit het DD-veld (terugval).'); return; }
    var jl = x.d.jaren[x.d.jaren.length - 1];
    var maatschap = (typeof isMaatschap === 'function') && isMaatschap();
    var ondernemersloon = (x.d.normalisaties || []).some(function (n) { return n.status === 'goedgekeurd' && n.soort === 'partnerbeloning' && Number(n.jaar) === Number(jl.jaar); });
    if (maatschap && !ondernemersloon) terugval('maatschap: in de financiële analyse is voor ' + jl.jaar + ' nog geen marktconform ondernemersloon (normalisatie partnerbeloning) goedgekeurd; de waarde komt uit het DD-veld (terugval).');
    else finZetEbitdaBron('financieel', jl.genormaliseerd.ebitda, String(jl.jaar));
    var j = x.d.jaren[x.d.jaren.length - 1], p = x.d.prognose.status === 'goedgekeurd' && x.d.prognose.jaren.length ? x.d.prognose.jaren[0] : null;
    doelEl.innerHTML = '<div style="font-size:12px;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;margin-bottom:.8rem">'
      + 'Uit de financiële analyse: genormaliseerde EBITDA ' + finEsc(j.jaar) + ' <strong>' + finGeld(j.genormaliseerd.ebitda) + '</strong>'
      + ' <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-waarde="' + Math.round(j.genormaliseerd.ebitda) + '" onclick="var e=document.getElementById(\'dv-ebitda-bewezen\');if(e){e.value=this.getAttribute(\'data-waarde\');}">Overnemen als bewezen EBITDA</button>'
      + (p ? '<br>Goedgekeurde prognose ' + finEsc(p.jaar) + ': EBITDA <strong>' + finGeld(p.exploitatie.ebitda) + '</strong> <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-waarde="' + Math.round(p.exploitatie.ebitda) + '" onclick="var e=document.getElementById(\'dv-ebitda-prognose\');if(e){e.value=this.getAttribute(\'data-waarde\');}">Overnemen als prognose-EBITDA</button>' : '')
      + finEqHintHtml(x.d)
      + finWsHintHtml(x.d)
      + '</div>';
    // Besluit Marcel 13-11 (#91): een volledig goedgekeurde equity bridge is de bron. Staan de drie velden nog op hun
    // beginwaarde (0), dan direct overnemen; heeft de adviseur al iets ingevuld, dan niets overschrijven (knop blijft).
    var b = x.d.equity_bridge, knop = doelEl.querySelector('button[onclick="finEqNeemOver(this)"]');
    var v = function (id) { var e = document.getElementById(id); return e ? String(e.value).trim() : null; };
    if (b && b.aantal_goedgekeurd && !(b.ontbreekt || []).length && knop && v('dv-nettoschuld') === '0' && v('dv-debtlike') === '0' && v('dv-wccorr') === '0') {
      finEqNeemOver(knop);
      knop.insertAdjacentHTML('afterend', ' <span style="color:var(--teal)" data-eq-auto="1">Automatisch overgenomen.</span>');
    }
  });
};
// #91 B1: de goedgekeurde equity bridge als expliciete keuze in het dealvoorstel (nooit automatisch). Overnemen vult de
// velden netto schuld, debt-like en werkkapitaalcorrectie en markeert de netto schuld als afkomstig uit de bridge; wijzigt de
// adviseur het veld daarna, dan vervalt die markering (mna/04).
function finEqHintHtml(d) {
  var b = d && d.equity_bridge;
  if (!b || !b.aantal_goedgekeurd) return '<br><span style="color:var(--red)">Geen goedgekeurde equity bridge: netto schuld, debt-like posten en werkkapitaalcorrectie hieronder zijn handmatige aannames. Keur de equity bridge goed in de fase Financieel.</span>';
  var wc = b.werkkapitaal_correctie === null ? 0 : -b.werkkapitaal_correctie; // dealvoorstelveld: + verlaagt de opbrengst
  return '<br>Goedgekeurde equity bridge: netto schuld <strong>' + finGeld(b.netto_schuld) + '</strong>, debt-like ' + finGeld(b.debt_like) + ', werkkapitaalcorrectie ' + (b.werkkapitaal_correctie === null ? 'niet compleet' : finGeld(b.werkkapitaal_correctie))
    + (b.ontbreekt && b.ontbreekt.length ? ' <span style="color:var(--red)">(onvolledig)</span>' : '')
    + ' <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-ns="' + Math.round(b.netto_schuld) + '" data-dl="' + Math.round(b.debt_like) + '" data-wc="' + Math.round(wc) + '" onclick="finEqNeemOver(this)">Overnemen in het dealvoorstel</button>';
}
window.finEqNeemOver = function (el) {
  var zet = function (id, v) { var e = document.getElementById(id); if (e) { e.value = v; e.setAttribute('data-bron', 'equitybridge'); e.setAttribute('data-bron-waarde', v); } };
  zet('dv-nettoschuld', el.getAttribute('data-ns')); zet('dv-debtlike', el.getAttribute('data-dl')); zet('dv-wccorr', el.getAttribute('data-wc'));
};


// #91 B5: goedgekeurde waarderingsset als expliciete keuze in het dealvoorstel. Neemt de grondslag (bewezen EBITDA) en het
// midden van de goedgekeurde multiple-bandbreedte (als basis-multiple) en de transactiekosten over; de bovengrens-multiple
// van het prijsmechanisme heeft een andere betekenis en wordt NIET gewijzigd. Verouderde of concept-sets worden niet
// aangeboden; nooit automatisch.
function finWsHintHtml(d) {
  var w = d && d.waarderingsset, b = d && d.waardering_berekend;
  if (!w || !b) return '';
  if (w.status !== 'goedgekeurd') return '<br><span style="color:var(--muted)">Waarderingsset v' + finEsc(w.versie) + ' is nog niet goedgekeurd.</span>';
  if (b.grondslag_bedrag == null || !(b.multiple_midden > 0)) return '<br><span style="color:var(--muted)">Waarderingsset v' + finEsc(w.versie) + ' heeft geen bruikbare grondslag (boekjaar niet meer gereed?).</span>';
  if (b.verouderd) return '<br><span style="color:var(--red)">Waarderingsset v' + finEsc(w.versie) + ' is verouderd (een bron is gewijzigd); keur eerst een nieuwe versie goed.</span>';
  return '<br>Goedgekeurde waarderingsset v' + finEsc(w.versie) + ' (' + finEsc(w.scenario) + ', peildatum ' + finEsc(w.peildatum) + '): grondslag <strong>' + finGeld(b.grondslag_bedrag) + '</strong>, multiple ' + finEsc(String(w.multiple_laag).replace('.', ',') + '–' + String(w.multiple_hoog).replace('.', ',')) + ' (midden ' + finEsc(String(b.multiple_midden).replace('.', ',')) + ')'
    + ' <button type="button" class="btn-ghost btn-sm" style="font-size:11px" data-g="' + Math.round(b.grondslag_bedrag) + '" data-m="' + b.multiple_midden + '" data-tk="' + w.transactiekosten_pct + '" data-v="' + finEsc(w.versie) + '" onclick="finWsNeemOver(this)">Overnemen als grondslag en basis-multiple</button>';
}
window.finWsNeemOver = function (el) {
  var zet = function (id, v) { var e = document.getElementById(id); if (e) { e.value = v; e.setAttribute('data-bron', 'waarderingsset-v' + el.getAttribute('data-v')); e.setAttribute('data-bron-waarde', v); } };
  zet('dv-ebitda-bewezen', el.getAttribute('data-g')); zet('dv-mult-basis', el.getAttribute('data-m')); zet('dv-txkosten', el.getAttribute('data-tk'));
};
