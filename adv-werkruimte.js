// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-FUNC-WF-001 (GO Marcel 03-11-2026): kantoorwerkruimte in het adviseursportaal. Horizontale hoofdnavigatie
// (WF-B), dashboardblok in de volgorde aandacht → beoordelen → hierna (WF-M), kantoorbreed OHW-overleg (WF-G/H),
// KantoorCockpit met financiële koppeling (WF-J/T) en kennisbank (WF-I/S). Rechten, verkeerslichtregels, idempotentie
// en versiecontrole staan in de backend (worker/55, 56, 57); dit bestand toont en roept aan. Nieuwe schermen in je-vorm.
var WR = { overleg: null, mijn: null, cockpit: null, koppeling: null, kennis: null, open: {}, filter: { eigenaar: '', status: '', type: '' }, kfilter: { q: '', soort: '', type: '' }, melding: null, bezig: false, afronding: null, delen: null, nieuwKennis: false };
var WR_STATUS = { groen: ['Op koers', 'wr-groen'], geel: ['Aandacht', 'wr-oranje'], rood: ['Blokkade', 'wr-rood'] };
var WR_SOORT = { actie: 'Actie', blokkade: 'Blokkade', info: 'Ontbrekende informatie' };
var WR_KSOORT = { werkinstructie: 'Werkinstructie', template: 'Model of template', clausule: 'Clausule', vraag: 'Vraag aan collega’s', lessons: 'Lessons learned', dd_inzicht: 'DD-inzicht', onderhandeling: 'Onderhandeling', notitie: 'Notitie', besluit: 'Besluit' };
var WR_DAGEN = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];

function wrEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function wrIdem() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); }
function wrDatum(v) { if (!v) return ''; var d = typeof v === 'number' ? new Date(v) : new Date(String(v) + (String(v).length === 10 ? 'T00:00:00' : '')); return isNaN(d) ? '' : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }); }
function wrEuro(n) { return n === null || n === undefined ? null : '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function wrVandaagIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function wrApi(methode, pad, body) {
  var opts = { method: methode, headers: { 'x-gebruiker-token': G.token }, cache: 'no-store' };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetchMetTimeout(WORKER + pad, opts, 20000).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j || {} }; }); })
    .catch(function () { return { status: 0, json: { error: 'Geen verbinding. Er is niets gewijzigd; probeer het opnieuw.' } }; });
}
function wrStatusLabel(s) { var x = WR_STATUS[s] || [s, 'wr-grijs']; return '<span class="wr-label ' + x[1] + '">' + wrEsc(x[0]) + '</span>'; }

// ── Navigatie (WF-B): vast bovenaan, dashboard = de bestaande startpagina met mandaten ──
function wrNav(actief) {
  var items = [['dashboard', 'Dashboard en mandaten'], ['overleg', 'OHW-overleg'], ['cockpit', 'KantoorCockpit'], ['kennis', 'Kennisbank']];
  return '<nav class="wr-nav" aria-label="Hoofdnavigatie">' + items.map(function (i) {
    return '<button type="button" class="wr-nav-knop' + (i[0] === actief ? ' wr-nav-actief' : '') + '"' + (i[0] === actief ? ' aria-current="page"' : '') + ' onclick="wrToon(\'' + i[0] + '\')">' + i[1] + '</button>';
  }).join('') + '</nav>';
}
function wrHdr() {
  return '<div class="hdr"><div class="hdr-brand"><div class="hdr-dot"></div>' + BRAND.platform + ' ' + BRAND.suffix + '</div><div class="hdr-right">'
    + '<span class="hdr-user">Ingelogd als <span class="hdr-name">' + wrEsc(G.naam) + '</span>' + (G.bedrijf ? ' &middot; ' + wrEsc(G.bedrijf) : '') + '</span>'
    + '<button class="btn-outline" onclick="renderAdvHandleiding()">&#128214; Handleiding</button><button class="btn-outline" onclick="doLogout()">Uitloggen</button></div></div>';
}
function wrToon(v) {
  WR.melding = null;
  if (v === 'dashboard') { renderDashboard(); return; }
  VIEW = 'wr-' + v;
  if (v === 'overleg') { wrTekenOverleg(); wrLaadOverleg(); }
  else if (v === 'cockpit') { wrTekenCockpit(); wrLaadCockpit(); }
  else if (v === 'kennis') { wrTekenKennis(); wrLaadKennis(); wrLaadOverleg(true); }
}
function wrPagina(actief, inhoud) {
  render(wrHdr() + wrNav(actief) + '<div class="main wr-main"><div id="wr-melding-plek" role="status">' + (WR.melding ? '<div class="wr-melding ' + (WR.melding.soort === 'fout' ? 'wr-rood-bg' : 'wr-groen-bg') + '">' + wrEsc(WR.melding.tekst) + '</div>' : '') + '</div>' + inhoud + '</div>');
}
function wrMeld(soort, tekst) { WR.melding = { soort: soort, tekst: tekst }; }

// ── Dashboardblok bovenaan de startpagina (WF-M: aandacht → beoordelen → hierna) ──
function wrVandaag() {
  var el = ge('wr-vandaag'); if (!el) return;
  Promise.all([wrApi('GET', '/mna/werkruimte/overleg'), wrApi('GET', '/mna/werkruimte/mijn-acties')]).then(function (r) {
    var el2 = ge('wr-vandaag'); if (!el2) return;
    if (r[0].status !== 200) { el2.innerHTML = ''; return; }
    WR.overleg = r[0].json; WR.mijn = r[1].status === 200 ? r[1].json.acties : [];
    var m = WR.overleg.mandaten || [], vandaag = wrVandaagIso();
    var aandacht = m.filter(function (x) { return x.status !== 'groen'; }).sort(function (a, b) { return (a.status === 'rood' ? 0 : 1) - (b.status === 'rood' ? 0 : 1); });
    var mijnTe = WR.mijn.filter(function (a) { return a.deadline && a.deadline < vandaag; });
    var beoordelen = m.filter(function (x) { return (x.handmatig && x.handmatig.status !== x.voorstel.status) || !x.actueel; });
    var hierna = WR.mijn.filter(function (a) { return !(a.deadline && a.deadline < vandaag); }).slice(0, 6);
    var mandaatLink = function (x, tekst) { return '<button type="button" class="wr-link" onclick="wrOpenMandaat(\'' + wrEsc(x.id) + '\')">' + wrEsc(tekst || x.naam) + '</button>'; };
    var h = '';
    // WF-H: herinnering vóór het overleg (in-app), alleen met wat jij moet bijwerken.
    if (WR.overleg.herinnering) {
      var eigen = m.filter(function (x) { return (G.trajecten || []).some(function (t) { return String(t.id).toUpperCase() === x.id; }); });
      var oud = eigen.filter(function (x) { return !x.actueel; });
      h += '<div class="wr-melding wr-oranje-bg wr-herinnering" role="status"><b>Overleg ' + wrEsc(wrOverlegTekst(WR.overleg)) + '.</b> '
        + (oud.length ? 'Werk vooraf je mandaten bij: ' + oud.map(function (x) { return '<button type="button" class="wr-link" onclick="wrOpenMandaat(\'' + wrEsc(x.id) + '\')">' + wrEsc(x.naam) + '</button>'; }).join(', ') + '. ' : 'Je mandaten zijn actueel. ')
        + (WR.mijn.length ? 'Je hebt ' + WR.mijn.length + ' open actie' + (WR.mijn.length === 1 ? '' : 's') + '.' : '') + '</div>';
    }
    h += '<div class="wr-vandaag" aria-label="Vandaag">';
    h += '<section class="wr-kolom"><h2 class="wr-h">Vraagt aandacht</h2>';
    if (!aandacht.length && !mijnTe.length) h += '<div class="wr-leeg">Niets dat nu aandacht vraagt.</div>';
    h += aandacht.slice(0, 6).map(function (x) { var r0 = (x.voorstel.redenen || [])[0] || {}; return '<div class="wr-regel">' + wrStatusLabel(x.status) + ' ' + mandaatLink(x) + '<div class="wr-sub">' + wrEsc(x.handmatig ? 'Handmatig: ' + (x.handmatig.reden || '') : r0.tekst) + '</div></div>'; }).join('');
    var actieLink = function (a) { return '<button type="button" class="wr-link" onclick="wrNaarOverleg(\'' + wrEsc(a.traject_id) + '\')">' + wrEsc(a.titel) + '</button>'; };
    h += mijnTe.map(function (a) { return '<div class="wr-regel"><span class="wr-label wr-rood">Over de deadline</span> ' + actieLink(a) + '<div class="wr-sub">' + wrEsc(a.naam) + ' · deadline ' + wrEsc(wrDatum(a.deadline)) + '</div></div>'; }).join('');
    h += '</section><section class="wr-kolom"><h2 class="wr-h">Wat moet je beoordelen</h2>';
    if (!beoordelen.length) h += '<div class="wr-leeg">Geen statussen om te beoordelen.</div>';
    h += beoordelen.slice(0, 6).map(function (x) { return '<div class="wr-regel">' + mandaatLink(x) + '<div class="wr-sub">' + (!x.actueel ? 'Dossier niet actueel: werk het bij of bespreek het in het overleg.' : 'Je status (' + wrEsc((WR_STATUS[x.handmatig.status] || [x.handmatig.status])[0]) + ') wijkt af van het voorstel (' + wrEsc((WR_STATUS[x.voorstel.status] || [x.voorstel.status])[0]) + '). Klopt je reden nog?') + '</div><button type="button" class="btn-outline wr-klein" onclick="wrNaarOverleg(\'' + wrEsc(x.id) + '\')">Naar het overleg</button></div>'; }).join('');
    h += '</section><section class="wr-kolom"><h2 class="wr-h">Wat gebeurt hierna</h2>';
    h += '<div class="wr-regel"><span class="wr-sub">Volgend overleg: ' + wrEsc(wrOverlegTekst(WR.overleg)) + '</span></div>';
    if (!hierna.length) h += '<div class="wr-leeg">Geen open acties op jouw naam.</div>';
    h += hierna.map(function (a) { return '<div class="wr-regel">' + actieLink(a) + '<div class="wr-sub">' + wrEsc(a.naam) + (a.deadline ? ' · deadline ' + wrEsc(wrDatum(a.deadline)) : '') + '</div></div>'; }).join('');
    h += '</section></div>';
    el2.innerHTML = h;
  });
}
function wrOverlegTekst(o) {
  var c = (o && o.cfg) || {};
  if (o && o.volgend_overleg) return new Date(o.volgend_overleg).toLocaleString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (c.frequentie || 'wekelijks') + ' op ' + (WR_DAGEN[c.dag] || 'donderdag') + ' om ' + (c.tijd || '10:00');
}
function wrOpenMandaat(id) {
  var t = (G.trajecten || []).filter(function (x) { return String(x.id).toUpperCase() === String(id).toUpperCase(); })[0];
  if (t) { openTraject(t.id); return; }
  wrNaarOverleg(id); // mandaat van een collega: in het overleg staat alles wat je mag zien
}
function wrNaarOverleg(id) { WR.open = {}; WR.open[String(id).toUpperCase()] = true; wrToon('overleg'); }

// ── OHW-overleg (WF-G/H) ──
function wrLaadOverleg(stil) {
  wrApi('GET', '/mna/werkruimte/overleg').then(function (r) {
    if (r.status === 200) WR.overleg = r.json; else WR.overleg = { fout: r.json.error || ('Overleg kon niet worden geladen (HTTP ' + r.status + ').') };
    if (!stil && VIEW === 'wr-overleg') wrTekenOverleg();
    if (stil && VIEW === 'wr-kennis') wrTekenKennis();
  });
}
function wrTekenOverleg() {
  var o = WR.overleg, h = '<div class="wr-kop"><h1 class="wr-titel">OHW-overleg</h1>';
  if (!o) { wrPagina('overleg', h + '</div><div class="wr-leeg">Laden…</div>'); return; }
  if (o.fout) { wrPagina('overleg', h + '</div><div class="wr-melding wr-rood-bg">' + wrEsc(o.fout) + '</div>'); return; }
  var c = o.cfg || {};
  h += '<div class="wr-sub">Laatste overleg: ' + (c.laatste_overleg ? wrEsc(wrDatum(c.laatste_overleg)) : 'nog niet gehouden') + ' · volgend overleg: ' + wrEsc(wrOverlegTekst(o)) + ' (' + wrEsc(c.frequentie) + ')</div></div>';
  h += '<div class="wr-balk">'
    + '<label>Eigenaar <select onchange="WR.filter.eigenaar=this.value;wrTekenOverleg()"><option value="">Iedereen</option>' + (o.gebruikers || []).map(function (g) { return '<option value="' + wrEsc(g.id) + '"' + (WR.filter.eigenaar === g.id ? ' selected' : '') + '>' + wrEsc(g.naam) + '</option>'; }).join('') + '</select></label>'
    + '<label>Status <select onchange="WR.filter.status=this.value;wrTekenOverleg()"><option value="">Alle</option>' + ['rood', 'geel', 'groen'].map(function (s) { return '<option value="' + s + '"' + (WR.filter.status === s ? ' selected' : '') + '>' + WR_STATUS[s][0] + '</option>'; }).join('') + '</select></label>'
    + '<label>Type <select onchange="WR.filter.type=this.value;wrTekenOverleg()"><option value="">Alle</option>' + ['verkoop', 'aankoop', 'fusie', 'samenwerking'].map(function (s) { return '<option value="' + s + '"' + (WR.filter.type === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>'
    + '<span class="wr-spacer"></span><button type="button" class="btn-outline" onclick="wrInstellingen()">Overleg instellen</button><button type="button" class="btn" onclick="wrAfronden(this)">Overleg afronden</button></div>';
  if (WR.instellen) h += wrInstellingenHtml(c);
  if (WR.afronding) h += '<div class="wr-paneel"><h2 class="wr-h">Overleg afgerond op ' + wrEsc(wrDatum(WR.afronding.afgerond_op)) + '</h2>' + (WR.afronding.per_eigenaar.length ? WR.afronding.per_eigenaar.map(function (p) { return '<div class="wr-regel"><b>' + wrEsc(p.naam) + '</b><ul>' + p.acties.map(function (a) { return '<li>' + wrEsc(a.titel) + ' <span class="wr-sub">(' + wrEsc(a.mandaat) + (a.deadline ? ', ' + wrEsc(wrDatum(a.deadline)) : '') + ')</span></li>'; }).join('') + '</ul></div>'; }).join('') : '<div class="wr-leeg">Geen nieuwe acties in dit overleg.</div>') + '<div class="wr-sub">Iedereen ziet de eigen acties op het dashboard.</div></div>';
  var lijst = (o.mandaten || []).filter(function (x) {
    return (!WR.filter.status || x.status === WR.filter.status) && (!WR.filter.type || x.type === WR.filter.type)
      && (!WR.filter.eigenaar || x.acties.some(function (a) { return a.status === 'open' && a.eigenaar_id === WR.filter.eigenaar; }));
  }).sort(function (a, b) { var o2 = { rood: 0, geel: 1, groen: 2 }; return o2[a.status] - o2[b.status]; });
  if (!lijst.length) h += '<div class="wr-leeg">Geen mandaten binnen dit filter.</div>';
  h += '<div class="wr-lijst">' + lijst.map(wrMandaatHtml).join('') + '</div>';
  wrPagina('overleg', h);
}
function wrMandaatHtml(x) {
  var open = x.acties.filter(function (a) { return a.status === 'open'; }), eerste = open[0];
  var t = (G.trajecten || []).filter(function (y) { return String(y.id).toUpperCase() === x.id; })[0];
  var fase = t && t.journey ? 'Fase ' + t.journey.fase + ' van 14 · ' + t.journey.titel : '';
  var uit = !!WR.open[x.id];
  var r0 = (x.voorstel.redenen || [])[0] || {};
  var h = '<article class="wr-mandaat wr-rand-' + wrEsc(x.status) + '"><div class="wr-mandaat-kop">'
    + '<button type="button" class="wr-mandaat-naam" aria-expanded="' + uit + '" onclick="WR.open[\'' + wrEsc(x.id) + '\']=!WR.open[\'' + wrEsc(x.id) + '\'];wrTekenOverleg()">' + wrEsc(x.naam) + '</button>'
    + wrStatusLabel(x.status) + (x.handmatig ? '<span class="wr-sub">handmatig</span>' : '') + '</div>'
    + '<div class="wr-mandaat-grid"><div><div class="wr-sub">Opdrachtgever · adviseur</div>' + wrEsc(x.opdrachtgever || '–') + ' · ' + wrEsc(x.adviseur || '–') + (fase ? '<div class="wr-sub">' + wrEsc(fase) + '</div>' : '') + '</div>'
    + '<div><div class="wr-sub">Waarom deze status</div>' + wrEsc(x.handmatig ? (x.handmatig.reden || '') + ' (afwijking van voorstel: ' + (WR_STATUS[x.voorstel.status] || [''])[0] + ')' : r0.tekst) + '</div>'
    + '<div><div class="wr-sub">Belangrijkste open actie</div>' + (eerste ? wrEsc(eerste.titel) + '<div class="wr-sub">' + wrEsc(eerste.eigenaar_naam) + (eerste.deadline ? ' · ' + wrEsc(wrDatum(eerste.deadline)) : '') + '</div>' : '<span class="wr-sub">geen</span>') + '</div>'
    + '<div><div class="wr-sub">Sinds vorig overleg</div>' + x.sinds.wijzigingen + ' wijzigingen · ' + x.sinds.acties + ' acties · ' + x.sinds.besluiten + ' besluiten'
    + '<div class="wr-sub">' + (x.actueel ? 'Bijgewerkt ' + wrEsc(wrDatum(x.laatste_update)) : '<span class="wr-label wr-oranje">Niet actueel</span> sinds ' + wrEsc(wrDatum(x.laatste_update))) + '</div></div>'
    + '<div><div class="wr-sub">Verwachte fee</div>' + wrFeeKort(x.fee) + '</div></div>';
  if (uit) h += wrMandaatDetail(x);
  return h + '</article>';
}
function wrFeeKort(fee) {
  var v = fee && fee.verwacht;
  if (!v || v.bedrag === null) return '<span class="wr-sub">' + wrEsc(v ? v.uitleg : 'Nog geen fee-afspraak vastgelegd') + '</span>';
  return wrEsc(wrEuro(v.bedrag)) + '<div class="wr-sub">' + wrEsc(v.uitleg) + (v.moment ? ' · closing verwacht ' + wrEsc(v.moment) : '') + '</div>';
}
function wrFeeFormHtml(x) {
  var f = (x.fee && x.fee.afspraak) || {}, rev = f.rev || 0, id = wrEsc(x.id);
  var veld = function (naam, label, extra) { return '<label>' + label + '<input name="' + naam + '" type="number" min="0" step="any" inputmode="decimal" value="' + wrEsc(f[naam] === null || f[naam] === undefined ? '' : f[naam]) + '"' + (extra || '') + '></label>'; };
  return '<h3 class="wr-h3">Fee-afspraak met de opdrachtgever</h3><div class="wr-sub">Vul in wat is afgesproken. Laat leeg wat (nog) niet bekend is; de verwachte fee wordt alleen berekend als de gegevens compleet zijn.' + (f.door ? ' Laatst vastgelegd door ' + wrEsc(f.door) + ' op ' + wrEsc(wrDatum(f.op)) + '.' : '') + '</div>'
    + '<form class="wr-form" onsubmit="return wrFee(event,\'' + id + '\',' + rev + ')">' + veld('retainer', 'Retainer (€)') + veld('succesfee_pct', 'Succesfee (%)', ' max="100"') + veld('succesfee_min', 'Minimum succesfee (€)') + veld('succesfee_vast', 'Of vaste succesfee (€)')
    + veld('transactiewaarde', 'Verwachte transactiewaarde (€)') + '<label>Verwachte closing<input name="verwacht_closing" type="month" value="' + wrEsc(f.verwacht_closing || '') + '"></label>'
    + '<button class="btn btn-sm" type="submit">Fee-afspraak opslaan</button></form>';
}
function wrFee(e, tid, rev) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target, b = { traject_id: tid, rev: rev, verwacht_closing: f.elements.verwacht_closing.value || null };
  ['retainer', 'succesfee_pct', 'succesfee_min', 'succesfee_vast', 'transactiewaarde'].forEach(function (k) { b[k] = f.elements[k].value === '' ? null : Number(f.elements[k].value); });
  WR.bezig = true;
  wrApi('POST', '/mna/werkruimte/fee', b).then(function (r) { wrNa(r, r.status === 200 ? 'Fee-afspraak opgeslagen' + (r.json.verwacht && r.json.verwacht.bedrag !== null ? ': verwachte fee ' + wrEuro(r.json.verwacht.bedrag) + '.' : '. ' + (r.json.verwacht ? r.json.verwacht.uitleg + '.' : '')) : ''); });
  return false;
}
function wrMandaatDetail(x) {
  var g = (WR.overleg.gebruikers || []), id = wrEsc(x.id);
  var opties = function (sel) { return g.map(function (u) { return '<option value="' + wrEsc(u.id) + '"' + (u.id === sel ? ' selected' : '') + '>' + wrEsc(u.naam) + '</option>'; }).join(''); };
  var h = '<div class="wr-detail"><h3 class="wr-h3">Acties</h3>';
  h += x.acties.length ? '<ul class="wr-acties">' + x.acties.map(function (a) {
    return '<li class="' + (a.status === 'klaar' ? 'wr-klaar' : '') + '"><label class="wr-check"><input type="checkbox"' + (a.status === 'klaar' ? ' checked' : '') + ' onchange="wrActieWijzig(\'' + wrEsc(a.id) + '\',' + a.rev + ',{status:this.checked?\'klaar\':\'open\'},this)"> ' + wrEsc(a.titel) + '</label>'
      + '<span class="wr-label ' + (a.soort === 'blokkade' ? 'wr-rood' : a.soort === 'info' ? 'wr-oranje' : 'wr-blauw') + '">' + wrEsc(WR_SOORT[a.soort] || a.soort) + '</span>'
      + '<select aria-label="Eigenaar" onchange="wrActieWijzig(\'' + wrEsc(a.id) + '\',' + a.rev + ',{eigenaar_id:this.value},this)">' + opties(a.eigenaar_id) + '</select>'
      + '<input type="date" aria-label="Deadline" value="' + wrEsc(a.deadline || '') + '" onchange="wrActieWijzig(\'' + wrEsc(a.id) + '\',' + a.rev + ',{deadline:this.value||null},this)"></li>';
  }).join('') + '</ul>' : '<div class="wr-leeg">Nog geen acties.</div>';
  h += '<form class="wr-form" onsubmit="return wrNieuweActie(event,\'' + id + '\')"><input name="titel" required maxlength="200" placeholder="Nieuwe actie" aria-label="Omschrijving nieuwe actie">'
    + '<select name="soort" aria-label="Soort">' + Object.keys(WR_SOORT).map(function (s) { return '<option value="' + s + '">' + WR_SOORT[s] + '</option>'; }).join('') + '</select>'
    + '<select name="eigenaar" aria-label="Eigenaar">' + opties(null) + '</select><input name="deadline" type="date" aria-label="Deadline"><button class="btn btn-sm" type="submit">Toevoegen</button></form>';
  h += '<h3 class="wr-h3">Besluiten</h3>' + (x.besluiten.length ? '<ul class="wr-besl">' + x.besluiten.map(function (b) { return '<li>' + wrEsc(b.tekst) + ' <span class="wr-sub">(' + wrEsc(b.door) + ', ' + wrEsc(wrDatum(b.op)) + ')</span></li>'; }).join('') + '</ul>' : '<div class="wr-leeg">Nog geen besluiten.</div>')
    + '<form class="wr-form" onsubmit="return wrBesluit(event,\'' + id + '\')"><input name="tekst" required maxlength="1000" placeholder="Besluit vastleggen" aria-label="Besluit"><button class="btn btn-sm" type="submit">Vastleggen</button></form>';
  h += wrFeeFormHtml(x);
  h += '<h3 class="wr-h3">Status</h3><div class="wr-sub">Voorstel volgens de regels: ' + wrStatusLabel(x.voorstel.status) + ' ' + (x.voorstel.redenen || []).map(function (r) { return wrEsc(r.tekst); }).join('; ') + '</div>'
    + '<form class="wr-form" onsubmit="return wrRag(event,\'' + id + '\',' + x.rag_rev + ')"><select name="status" aria-label="Status">' + ['groen', 'geel', 'rood'].map(function (s) { return '<option value="' + s + '"' + (s === x.status ? ' selected' : '') + '>' + WR_STATUS[s][0] + '</option>'; }).join('') + '</select>'
    + '<input name="reden" maxlength="500" placeholder="Reden (verplicht als je afwijkt van het voorstel)" aria-label="Reden"><button class="btn-outline" type="submit">Status vastleggen</button>'
    + (x.handmatig ? '<button class="btn-outline" type="button" onclick="wrRagTerug(\'' + id + '\',' + x.rag_rev + ',this)">Terug naar voorstel</button>' : '') + '</form>'
    + '<button type="button" class="wr-link" onclick="wrRagHistorie(\'' + id + '\')">Statushistorie tonen</button><div id="wr-hist-' + id + '"></div>';
  return h + '</div>';
}
// Bij succes opnieuw laden; bij een fout blijft het scherm (en je invoer) staan en verschijnt alleen de melding.
// Bij een versieconflict laadt het overzicht wel opnieuw: je ziet dan de actuele waarde van de ander.
function wrNa(r, ok) {
  WR.bezig = false;
  if (r.status === 200) { wrMeld('ok', ok); wrLaadOverleg(); return; }
  wrMeld('fout', r.json.error || 'Dat lukte niet (HTTP ' + r.status + ').');
  if (r.json.code === 'VERSIE_CONFLICT') { wrLaadOverleg(); return; }
  var el = ge('wr-melding-plek'); if (el) el.innerHTML = '<div class="wr-melding wr-rood-bg">' + wrEsc(WR.melding.tekst) + '</div>';
  document.querySelectorAll('.wr-main [disabled]').forEach(function (x) { x.disabled = false; });
}
function wrActieWijzig(id, rev, wijz, el) {
  if (WR.bezig) return; WR.bezig = true; if (el) el.disabled = true;
  wrApi('POST', '/mna/werkruimte/actie/' + encodeURIComponent(id), Object.assign({ rev: rev }, wijz)).then(function (r) { wrNa(r, 'Actie bijgewerkt.'); });
}
function wrNieuweActie(e, tid) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target, idem = f.getAttribute('data-idem') || wrIdem(); f.setAttribute('data-idem', idem);
  WR.bezig = true;
  wrApi('POST', '/mna/werkruimte/actie', { traject_id: tid, titel: f.elements.titel.value, soort: f.elements.soort.value, eigenaar_id: f.elements.eigenaar.value, deadline: f.elements.deadline.value || null, idem: idem }).then(function (r) { wrNa(r, 'Actie toegevoegd.'); });
  return false;
}
function wrBesluit(e, tid) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target, idem = f.getAttribute('data-idem') || wrIdem(); f.setAttribute('data-idem', idem);
  WR.bezig = true;
  wrApi('POST', '/mna/werkruimte/besluit', { traject_id: tid, tekst: f.elements.tekst.value, idem: idem }).then(function (r) { wrNa(r, 'Besluit vastgelegd.'); });
  return false;
}
function wrRag(e, tid, rev) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target; WR.bezig = true;
  wrApi('POST', '/mna/werkruimte/rag', { traject_id: tid, status: f.elements.status.value, reden: f.elements.reden.value, rev: rev }).then(function (r) { wrNa(r, 'Status vastgelegd.'); });
  return false;
}
function wrRagTerug(tid, rev, el) {
  if (WR.bezig) return; WR.bezig = true; el.disabled = true;
  wrApi('POST', '/mna/werkruimte/rag', { traject_id: tid, terug: true, rev: rev }).then(function (r) { wrNa(r, 'Status volgt weer het voorstel.'); });
}
function wrRagHistorie(tid) {
  wrApi('POST', '/mna/werkruimte/rag/historie', { traject_id: tid }).then(function (r) {
    var el = ge('wr-hist-' + tid); if (!el) return;
    var h = r.json.historie || [];
    el.innerHTML = h.length ? '<ul class="wr-besl">' + h.map(function (x) { return '<li>' + wrEsc(wrDatum(x.created_at)) + ': ' + wrEsc((WR_STATUS[x.van] || [x.van])[0]) + ' → ' + wrEsc((WR_STATUS[x.naar] || [x.naar])[0]) + ' <span class="wr-sub">(voorstel ' + wrEsc((WR_STATUS[x.voorstel] || [x.voorstel])[0]) + ', ' + wrEsc(x.door) + (x.reden ? ': ' + wrEsc(x.reden) : '') + ')</span></li>'; }).join('') + '</ul>' : '<div class="wr-leeg">Nog geen statuswijzigingen.</div>';
  });
}
function wrInstellingen() { WR.instellen = !WR.instellen; wrTekenOverleg(); }
function wrInstellingenHtml(c) {
  return '<form class="wr-paneel wr-form" onsubmit="return wrInstellingenOpslaan(event)"><label>Frequentie <select name="frequentie">' + ['wekelijks', 'tweewekelijks', 'maandelijks'].map(function (s) { return '<option' + (c.frequentie === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>'
    + '<label>Dag <select name="dag">' + [1, 2, 3, 4, 5].map(function (d) { return '<option value="' + d + '"' + (c.dag === d ? ' selected' : '') + '>' + WR_DAGEN[d] + '</option>'; }).join('') + '</select></label>'
    + '<label>Tijd <input name="tijd" type="time" value="' + wrEsc(c.tijd || '10:00') + '"></label>'
    + '<label>Herinnering (uren vooraf) <input name="her" type="number" min="1" max="72" value="' + wrEsc(c.herinnering_uren || 24) + '"></label>'
    + '<label>Niet actueel na (dagen) <input name="stale" type="number" min="3" max="60" value="' + wrEsc(c.stale_dagen || 7) + '"></label>'
    + '<button class="btn btn-sm" type="submit">Opslaan</button></form>';
}
function wrInstellingenOpslaan(e) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target; WR.bezig = true;
  wrApi('POST', '/mna/werkruimte/overleg/instellingen', { frequentie: f.elements.frequentie.value, dag: Number(f.elements.dag.value), tijd: f.elements.tijd.value, herinnering_uren: Number(f.elements.her.value), stale_dagen: Number(f.elements.stale.value) }).then(function (r) { WR.instellen = r.status !== 200; wrNa(r, 'Overleginstellingen opgeslagen.'); });
  return false;
}
function wrAfronden(el) {
  if (WR.bezig || !window.confirm('Overleg afronden? Iedereen krijgt de eigen nieuwe acties op het dashboard; de teller "sinds vorig overleg" begint opnieuw.')) return;
  WR.bezig = true; el.disabled = true;
  wrApi('POST', '/mna/werkruimte/overleg/afronden', {}).then(function (r) { if (r.status === 200) WR.afronding = r.json; wrNa(r, 'Overleg afgerond.'); });
}

// ── KantoorCockpit en koppeling (WF-J/T) ──
function wrLaadCockpit() {
  Promise.all([wrApi('GET', '/mna/werkruimte/cockpit'), wrApi('GET', '/mna/koppeling')]).then(function (r) {
    WR.cockpit = r[0].status === 200 ? r[0].json : { fout: r[0].json.error || ('HTTP ' + r[0].status), status: r[0].status };
    WR.koppeling = r[1].status === 200 ? r[1].json : null;
    if (VIEW === 'wr-cockpit') wrTekenCockpit();
  });
}
function wrBedrag(v) { return v && v.bedrag !== null && v.bedrag !== undefined ? wrEsc(wrEuro(v.bedrag)) : '<span class="wr-sub">niet beschikbaar</span>'; }
function wrTekenCockpit() {
  var c = WR.cockpit, h = '<div class="wr-kop"><h1 class="wr-titel">KantoorCockpit</h1><div class="wr-sub">Financiële stand per mandaat. Elke waarde toont waar hij vandaan komt; wat niet bekend is, staat er als niet beschikbaar.</div></div>';
  if (!c) { wrPagina('cockpit', h + '<div class="wr-leeg">Laden…</div>'); return; }
  if (c.fout) { wrPagina('cockpit', h + '<div class="wr-melding ' + (c.status === 403 ? 'wr-oranje-bg' : 'wr-rood-bg') + '">' + wrEsc(c.status === 403 ? 'De KantoorCockpit is alleen beschikbaar voor de kantooreigenaar.' : c.fout) + '</div>'); return; }
  var v = c.verbinding;
  h += '<div class="wr-paneel wr-verbinding"><b>Financieel pakket:</b> ' + (v && v.status === 'actief' ? wrEsc(v.label) + (v.simulatie ? ' <span class="wr-label wr-oranje">Simulatie met fictieve gegevens</span>' : '') + ' · laatste synchronisatie ' + (v.laatste_succes ? wrEsc(wrDatum(v.laatste_succes)) : 'nog niet') + (v.laatste_fout ? ' <span class="wr-label wr-rood">' + wrEsc(v.laatste_fout) + '</span>' : '') : 'geen koppeling actief')
    + (c.niet_gekoppelde_facturen ? ' · <span class="wr-label wr-oranje">' + c.niet_gekoppelde_facturen + ' facturen nog niet aan een mandaat gekoppeld</span>' : '') + '</div>';
  var tot = { fee: 0, gef: 0, ont: 0, open: 0 };
  h += '<div class="wr-tabel-wrap"><table class="wr-tabel"><thead><tr><th>Mandaat</th><th>Verwachte fee</th><th>Boekhoudkundig OHW</th><th>Gefactureerd</th><th>Ontvangen</th><th>Openstaand</th></tr></thead><tbody>'
    + c.mandaten.map(function (m) {
      ['verwachte_fee:fee', 'gefactureerd:gef', 'ontvangen:ont', 'openstaand:open'].forEach(function (p) { var a = p.split(':'); if (m[a[0]] && m[a[0]].bedrag) tot[a[1]] += m[a[0]].bedrag; });
      var cel = function (v2) { return '<td>' + wrBedrag(v2) + '<div class="wr-bron">' + wrEsc(v2.bron) + (v2.moment ? ' · closing verwacht ' + wrEsc(v2.moment) : '') + '</div></td>'; };
      return '<tr><td>' + wrEsc(m.naam) + '<div class="wr-sub">' + wrEsc(m.type) + '</div></td>' + cel(m.verwachte_fee) + cel(m.boekhoudkundig_ohw) + cel(m.gefactureerd) + cel(m.ontvangen) + cel(m.openstaand) + '</tr>';
    }).join('') + '</tbody><tfoot><tr><th>Totaal</th><th>' + wrEsc(wrEuro(tot.fee)) + '</th><th><span class="wr-sub">–</span></th><th>' + wrEsc(wrEuro(tot.gef)) + '</th><th>' + wrEsc(wrEuro(tot.ont)) + '</th><th>' + wrEsc(wrEuro(tot.open)) + '</th></tr></tfoot></table></div>';
  var pr = c.prognose;
  if (pr) {
    h += '<div class="wr-paneel"><h2 class="wr-h">Prognose verwachte fees per kwartaal</h2><div class="wr-sub">' + wrEsc(pr.bron) + '. Gebaseerd op de verwachte closingmaand per mandaat.</div>'
      + (pr.per_kwartaal.length ? '<div class="wr-tabel-wrap"><table class="wr-tabel"><thead><tr><th>Kwartaal</th><th>Verwachte fees</th><th>Mandaten</th></tr></thead><tbody>' + pr.per_kwartaal.map(function (k) { return '<tr><td>' + wrEsc(k.periode) + '</td><td>' + wrEsc(wrEuro(k.bedrag)) + '</td><td>' + k.mandaten + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="wr-leeg">Nog geen complete fee-afspraken met een verwachte closingmaand.</div>')
      + ((pr.zonder_closingmaand || pr.onvolledige_afspraak) ? '<div class="wr-sub">Niet in de prognose: ' + (pr.zonder_closingmaand ? pr.zonder_closingmaand + ' zonder closingmaand' : '') + (pr.zonder_closingmaand && pr.onvolledige_afspraak ? ', ' : '') + (pr.onvolledige_afspraak ? pr.onvolledige_afspraak + ' met een onvolledige fee-afspraak' : '') + '.</div>' : '') + '</div>';
  }
  h += wrKoppelingHtml();
  wrPagina('cockpit', h);
}
function wrKoppelingHtml() {
  var k = WR.koppeling; if (!k) return '';
  var v = k.verbinding, actief = v && v.status === 'actief';
  var h = '<div class="wr-paneel"><h2 class="wr-h">Koppeling met je financiële pakket</h2><div class="wr-sub">Alleen lezen: KVM leest debiteuren, facturen, creditnota’s en betalingen. Je pakket blijft de bron; KVM boekt niets. Elke debiteur koppel je zelf aan een mandaat.</div>';
  if (!actief) {
    h += '<div class="wr-form"><label>Pakket <select id="wr-adapter">' + k.adapters.map(function (a) { return '<option value="' + wrEsc(a.id) + '">' + wrEsc(a.label) + (a.simulatie ? ' (simulatie)' : '') + '</option>'; }).join('') + '</select></label><button class="btn btn-sm" type="button" onclick="wrKoppel(\'verbinden\',this)">Verbinden</button></div>'
      + '<div class="wr-sub">Koppelingen met echte pakketten (zoals AFAS) worden per kantoor geactiveerd zodra de toegang is geregeld.</div>';
  } else {
    h += '<div class="wr-balk"><button class="btn btn-sm" type="button" onclick="wrKoppel(\'synchroniseren\',this)">Nu synchroniseren</button><button class="btn-outline" type="button" onclick="wrKoppel(\'loskoppelen\',this)">Loskoppelen</button></div>';
    h += '<h3 class="wr-h3">Debiteuren koppelen aan een mandaat</h3>' + (k.debiteuren.length ? '<div class="wr-tabel-wrap"><table class="wr-tabel"><thead><tr><th>Debiteur</th><th>Mandaat</th></tr></thead><tbody>' + k.debiteuren.map(function (d) {
      return '<tr><td>' + wrEsc(d.naam) + ' <span class="wr-sub">' + wrEsc(d.extern_id) + '</span></td><td><select aria-label="Mandaat voor ' + wrEsc(d.naam) + '" data-ext="' + wrEsc(d.extern_id) + '" onchange="wrMap(this.getAttribute(\'data-ext\'),this.value,this)"><option value="">Niet gekoppeld</option>' + k.mandaten.map(function (m) { return '<option value="' + wrEsc(m.id) + '"' + (d.traject_id && String(d.traject_id).toUpperCase() === String(m.id).toUpperCase() ? ' selected' : '') + '>' + wrEsc(m.naam) + '</option>'; }).join('') + '</select></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="wr-leeg">Nog geen debiteuren; synchroniseer eerst.</div>');
  }
  if (k.sync_log && k.sync_log.length) h += '<h3 class="wr-h3">Synchronisaties</h3><ul class="wr-besl">' + k.sync_log.map(function (l) { return '<li>' + wrEsc(wrDatum(l.gestart)) + ': <span class="wr-label ' + (l.status === 'geslaagd' ? 'wr-groen' : l.status === 'bezig' ? 'wr-blauw' : 'wr-rood') + '">' + wrEsc(l.status) + '</span> ' + (l.nieuw || 0) + ' nieuw, ' + (l.gewijzigd || 0) + ' gewijzigd, ' + (l.ongewijzigd || 0) + ' ongewijzigd' + (l.afwijkingen && l.afwijkingen.length ? '<div class="wr-sub">Afwijkingen: ' + wrEsc(l.afwijkingen.join('; ')) + '</div>' : '') + '</li>'; }).join('') + '</ul>';
  return h + '</div>';
}
function wrKoppel(actie, el) {
  if (WR.bezig) return;
  if (actie === 'loskoppelen' && !window.confirm('Koppeling loskoppelen? Er wordt niet meer gesynchroniseerd; eerder gelezen gegevens blijven als historie bewaard.')) return;
  WR.bezig = true; el.disabled = true; el.textContent = actie === 'synchroniseren' ? 'Bezig met synchroniseren…' : 'Bezig…';
  var body = actie === 'verbinden' ? { systeem: (ge('wr-adapter') || {}).value } : {};
  wrApi('POST', '/mna/koppeling/' + actie, body).then(function (r) {
    WR.bezig = false;
    wrMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? (actie === 'synchroniseren' ? 'Gesynchroniseerd: ' + r.json.nieuw + ' nieuw, ' + r.json.gewijzigd + ' gewijzigd, ' + r.json.ongewijzigd + ' ongewijzigd' + (r.json.afwijkingen && r.json.afwijkingen.length ? '; ' + r.json.afwijkingen.length + ' afwijking(en), zie het log.' : '.') : actie === 'verbinden' ? 'Verbonden.' : 'Losgekoppeld.') : (r.json.error || 'Dat lukte niet.'));
    wrLaadCockpit();
  });
}
function wrMap(ext, tid, el) {
  if (WR.bezig) return; WR.bezig = true; el.disabled = true;
  wrApi('POST', '/mna/koppeling/mapping', { extern_id: ext, traject_id: tid || null }).then(function (r) { WR.bezig = false; wrMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? 'Koppeling opgeslagen.' : (r.json.error || 'Dat lukte niet.')); wrLaadCockpit(); });
}

// ── Kennisbank (WF-I/S) ──
function wrLaadKennis() {
  var f = WR.kfilter, q = '?q=' + encodeURIComponent(f.q) + (f.soort ? '&soort=' + encodeURIComponent(f.soort) : '') + (f.type ? '&type=' + encodeURIComponent(f.type) : '');
  wrApi('GET', '/mna/kennis' + q).then(function (r) { WR.kennis = r.status === 200 ? r.json : { fout: r.json.error || ('HTTP ' + r.status) }; if (VIEW === 'wr-kennis') wrTekenKennis(); });
}
function wrMandaatOpties() { return ((WR.overleg && WR.overleg.mandaten) || []).map(function (m) { return '<option value="' + wrEsc(m.id) + '">' + wrEsc(m.naam) + '</option>'; }).join(''); }
function wrTekenKennis() {
  var k = WR.kennis, f = WR.kfilter;
  var h = '<div class="wr-kop"><h1 class="wr-titel">Kennisbank</h1><div class="wr-sub">Dossierkennis blijft bij het mandaat. Kantoorbreed delen kan alleen als herschreven tekst zonder herkenbare klantgegevens.</div></div>';
  h += '<form class="wr-balk" onsubmit="event.preventDefault();WR.kfilter.q=this.q.value;wrLaadKennis()"><input name="q" type="search" value="' + wrEsc(f.q) + '" placeholder="Zoeken op onderwerp, fase of tekst" aria-label="Zoeken">'
    + '<select aria-label="Soort" onchange="WR.kfilter.soort=this.value;wrLaadKennis()"><option value="">Alle soorten</option>' + Object.keys(WR_KSOORT).map(function (s) { return '<option value="' + s + '"' + (f.soort === s ? ' selected' : '') + '>' + WR_KSOORT[s] + '</option>'; }).join('') + '</select>'
    + '<select aria-label="Transactietype" onchange="WR.kfilter.type=this.value;wrLaadKennis()"><option value="">Alle typen</option>' + ['verkoop', 'aankoop', 'fusie', 'samenwerking', 'algemeen'].map(function (s) { return '<option value="' + s + '"' + (f.type === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'
    + '<button class="btn-outline" type="submit">Zoeken</button><span class="wr-spacer"></span><button class="btn btn-sm" type="button" onclick="WR.nieuwKennis=!WR.nieuwKennis;wrTekenKennis()">+ Kennis toevoegen</button></form>';
  if (WR.nieuwKennis) h += '<form class="wr-paneel wr-form wr-form-kolom" onsubmit="return wrKennisNieuw(event)"><label>Soort <select name="soort">' + Object.keys(WR_KSOORT).map(function (s) { return '<option value="' + s + '">' + WR_KSOORT[s] + '</option>'; }).join('') + '</select></label>'
    + '<label>Titel <input name="titel" required maxlength="200"></label><label>Tekst <textarea name="tekst" required rows="4" maxlength="8000"></textarea></label>'
    + '<label>Zichtbaar voor <select name="zicht" onchange="this.form.traject_id.disabled=this.value===\'kantoor\'"><option value="dossier">Alleen dit mandaat (vertrouwelijk)</option><option value="kantoor">Het hele kantoor (algemene kennis, geen klantgegevens)</option></select></label>'
    + '<label>Mandaat <select name="traject_id">' + wrMandaatOpties() + '</select></label>'
    + '<label>Transactietype <select name="type">' + ['algemeen', 'verkoop', 'aankoop', 'fusie', 'samenwerking'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label><label>Fase <input name="fase" maxlength="60"></label>'
    + '<button class="btn btn-sm" type="submit">Opslaan</button></form>';
  if (!k) h += '<div class="wr-leeg">Laden…</div>';
  else if (k.fout) h += '<div class="wr-melding wr-rood-bg">' + wrEsc(k.fout) + '</div>';
  else if (!k.items.length) h += '<div class="wr-leeg">Nog geen kennis gevonden.</div>';
  else h += '<div class="wr-lijst">' + k.items.map(wrKennisItemHtml).join('') + '</div>';
  wrPagina('kennis', h);
}
function wrKennisItemHtml(it) {
  var h = '<article class="wr-kennis"><div class="wr-mandaat-kop"><b>' + wrEsc(it.titel) + '</b><span class="wr-label ' + (it.zicht === 'kantoor' ? 'wr-blauw">Kantoor' : 'wr-oranje">Dossier: ' + wrEsc(it.mandaat || '')) + '</span><span class="wr-sub">' + wrEsc(WR_KSOORT[it.soort] || it.soort) + ' · ' + wrEsc(it.transactietype) + (it.fase ? ' · ' + wrEsc(it.fase) : '') + ' · ' + wrEsc(it.auteur) + ', ' + wrEsc(wrDatum(it.op)) + '</span></div>'
    + '<div class="wr-tekst">' + wrEsc(it.tekst) + '</div>';
  if (it.soort === 'vraag') {
    h += (it.antwoorden.length ? '<ul class="wr-besl">' + it.antwoorden.map(function (a) { return '<li>' + wrEsc(a.tekst) + ' <span class="wr-sub">(' + wrEsc(a.auteur) + ', ' + wrEsc(wrDatum(a.op)) + ')</span></li>'; }).join('') + '</ul>' : '')
      + '<form class="wr-form" onsubmit="return wrKennisAntwoord(event,\'' + wrEsc(it.id) + '\')"><input name="tekst" required maxlength="4000" placeholder="Je antwoord" aria-label="Antwoord"><button class="btn-outline" type="submit">Antwoorden</button></form>';
  }
  if (it.zicht === 'dossier') {
    if (WR.delen && WR.delen.id === it.id) {
      h += '<form class="wr-paneel wr-form wr-form-kolom" onsubmit="return wrKennisDelen(event,\'' + wrEsc(it.id) + '\')"><div class="wr-sub">Herschrijf de kennis zonder namen, e-mailadressen, KvK-nummers, IBAN of telefoonnummers. Er wordt een nieuwe kantoorbrede kopie gemaakt; het origineel blijft bij het dossier.</div>'
        + '<label>Titel <input name="titel" required maxlength="200" value="' + wrEsc(WR.delen.titel || '') + '"></label><label>Tekst <textarea name="tekst" required rows="4" maxlength="8000">' + wrEsc(WR.delen.tekst || '') + '</textarea></label>'
        + (WR.delen.treffers ? '<div class="wr-melding wr-rood-bg">Nog herkenbaar: ' + wrEsc(WR.delen.treffers.map(function (t) { return t.tekst; }).join('; ')) + '</div>' : '')
        + '<label class="wr-check"><input name="bevestigd" type="checkbox" required> Ik bevestig dat deze tekst geen herkenbare klant- of dossiergegevens bevat</label>'
        + '<span class="wr-balk"><button class="btn btn-sm" type="submit">Delen met het kantoor</button><button class="btn-outline" type="button" onclick="WR.delen=null;wrTekenKennis()">Annuleren</button></span></form>';
    } else h += '<button type="button" class="wr-link" onclick="WR.delen={id:\'' + wrEsc(it.id) + '\'};wrTekenKennis()">Geanonimiseerd delen met het kantoor</button>';
  }
  return h + '</article>';
}
function wrKennisNieuw(e) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target, idem = f.getAttribute('data-idem') || wrIdem(); f.setAttribute('data-idem', idem);
  var zicht = f.elements.zicht.value; WR.bezig = true;
  wrApi('POST', '/mna/kennis/item', { soort: f.elements.soort.value, titel: f.elements.titel.value, tekst: f.elements.tekst.value, zicht: zicht, traject_id: zicht === 'dossier' ? f.elements.traject_id.value : undefined, transactietype: f.elements.type.value, fase: f.elements.fase.value, idem: idem }).then(function (r) {
    WR.bezig = false; if (r.status === 200) WR.nieuwKennis = false;
    wrMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? 'Opgeslagen.' : (r.json.error || 'Dat lukte niet.')); wrLaadKennis();
  });
  return false;
}
function wrKennisAntwoord(e, id) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target, idem = f.getAttribute('data-idem') || wrIdem(); f.setAttribute('data-idem', idem); WR.bezig = true;
  wrApi('POST', '/mna/kennis/antwoord', { item_id: id, tekst: f.elements.tekst.value, idem: idem }).then(function (r) { WR.bezig = false; wrMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? 'Antwoord geplaatst.' : (r.json.error || 'Dat lukte niet.')); wrLaadKennis(); });
  return false;
}
function wrKennisDelen(e, id) {
  e.preventDefault(); if (WR.bezig) return false;
  var f = e.target; WR.delen.titel = f.elements.titel.value; WR.delen.tekst = f.elements.tekst.value; WR.delen.idem = WR.delen.idem || wrIdem(); WR.bezig = true;
  wrApi('POST', '/mna/kennis/delen', { item_id: id, titel: f.elements.titel.value, tekst: f.elements.tekst.value, bevestigd: f.elements.bevestigd.checked === true, idem: WR.delen.idem }).then(function (r) {
    WR.bezig = false;
    if (r.status === 422) { WR.delen.treffers = r.json.treffers || []; WR.delen.idem = null; wrTekenKennis(); return; }
    if (r.status === 200) WR.delen = null;
    wrMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? 'Gedeeld met het kantoor.' : (r.json.error || 'Dat lukte niet.')); wrLaadKennis();
  });
  return false;
}
