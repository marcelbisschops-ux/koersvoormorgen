// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase E v4 (29 okt 2026): contractenoverzicht en juridische aandachtspunten in de fase Juridisch & fiscaal
// (worker/52). Alleen verkoper en begeleider. Beide leggen regels vast; alleen de begeleider beslist per regel of
// die in het informatiememorandum komt. Wijzigt de verkoper een vrijgegeven regel, dan vervalt de vrijgave op de
// server. Laadt na mna/16 en mna/18 (hergebruikt finEsc/finGeld/finAntw/finHeaders/finHerteken/finScope en orgOpt).
var JUR = { scope: null, status: 'idle', data: null, bezig: false, melding: null, contr: null, punt: null };
var JUR_SOORT = [['klant', 'Klantcontract'], ['leverancier', 'Leverancierscontract'], ['huur', 'Huur'], ['lease', 'Lease'], ['licentie', 'Licentie'], ['samenwerking', 'Samenwerking'], ['financiering', 'Financiering'], ['verzekering', 'Verzekering'], ['overig', 'Overig']];
var JUR_AANDACHT = [['geschil', 'Geschil of claim'], ['fiscaal', 'Fiscaal'], ['vergunning', 'Vergunning of registratie'], ['garantie', 'Garantie of zekerheid'], ['arbeid', 'Arbeidsrecht'], ['privacy', 'Privacy'], ['overig', 'Overig']];
var JUR_STATUS = [['lopend', 'Lopend'], ['afgerond', 'Afgerond'], ['onbekend', 'Onbekend']];
var JUR_JN = [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Onbekend']];

function jurSync() { var k = finScope(); if (JUR.scope !== k) { JUR.scope = k; JUR.status = 'idle'; JUR.data = null; JUR.bezig = false; JUR.melding = null; JUR.contr = null; JUR.punt = null; } }
function jurKopie(x) { return JSON.parse(JSON.stringify(x || [])); }
function jurZetData(d) { JUR.data = d; JUR.contr = jurKopie(d.contracten); JUR.punt = jurKopie(d.aandachtspunten); }
function jurLaad() {
  jurSync();
  if (!S.code || !(isVerkoper() || isTussen()) || JUR.status === 'laden') return;
  var scope = JUR.scope; JUR.status = 'laden';
  finAntw(fetchMetTimeout(WORKER + '/mna/juridisch?code=' + encodeURIComponent(S.code), { method: 'GET', headers: finHeaders() }, 30000)).then(function (x) {
    if (JUR.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true) { JUR.status = 'ok'; jurZetData(x.d); } else { JUR.status = 'fout'; JUR.data = null; }
    finHerteken();
  });
}
function jurPost(pad, body, ok) {
  if (JUR.bezig) return;
  JUR.bezig = true; JUR.melding = null; finHerteken();
  body.code = S.code; body.rev = JUR.data ? JUR.data.rev : 0;
  finAntw(fetchMetTimeout(WORKER + '/mna/juridisch/' + pad, { method: 'POST', headers: finHeaders(), body: JSON.stringify(body) }, 60000)).then(function (x) {
    JUR.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true) { jurZetData(x.d); JUR.melding = { soort: 'ok', tekst: ok }; }
    else {
      JUR.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      if (x.s === 409) { JUR.status = 'idle'; setTimeout(jurLaad, 0); }
    }
    finHerteken();
  });
}
// Bewerken in een werkkopie; opslaan stuurt de hele lijst (de server valideert alles opnieuw en bepaalt de vrijgave).
window.jurZet = function (lijst, i, veld, el) {
  var rij = JUR[lijst] && JUR[lijst][i]; if (!rij) return;
  var v = el.type === 'checkbox' ? el.checked : el.value;
  if (['opzegtermijn_mnd', 'jaarwaarde', 'financieel_belang'].indexOf(veld) >= 0) { v = String(v).trim() === '' ? null : Number(String(v).replace(/\./g, '').replace(',', '.')); }
  if (veld === 'einddatum' && v === '') v = null;
  rij[veld] = v;
};
window.jurNieuw = function (lijst) { JUR[lijst].push(lijst === 'contr' ? { soort: 'klant', omschrijving: '', change_of_control: 'onbekend', exclusiviteit: 'onbekend', in_im: false } : { soort: 'geschil', omschrijving: '', status: 'onbekend', in_im: false }); finHerteken(); };
window.jurWeg = function (lijst, i) { JUR[lijst].splice(i, 1); finHerteken(); };
window.jurBewaar = function (lijst) {
  if (lijst === 'contr') jurPost('contracten', { contracten: JUR.contr }, 'Contractenoverzicht opgeslagen.');
  else jurPost('aandachtspunten', { aandachtspunten: JUR.punt }, 'Juridische aandachtspunten opgeslagen.');
};

function jurIn(lijst, i, veld, w, type, br) { return '<input type="' + (type || 'text') + '" value="' + finEsc(w == null ? '' : w) + '" style="width:' + (br || 120) + 'px;font-size:12px" onchange="jurZet(\'' + lijst + '\',' + i + ',\'' + veld + '\',this)">'; }
function jurSel(lijst, i, veld, opts, w) { return '<select style="font-size:12px" onchange="jurZet(\'' + lijst + '\',' + i + ',\'' + veld + '\',this)">' + orgOpt(opts, w) + '</select>'; }
// Vrijgave voor het IM: de begeleider vinkt aan; de verkoper ziet alleen de stand.
function jurImVeld(lijst, i, rij) {
  if (isTussen()) return '<label style="font-size:11px"><input type="checkbox"' + (rij.in_im === true ? ' checked' : '') + ' onchange="jurZet(\'' + lijst + '\',' + i + ',\'in_im\',this)"> Opnemen in IM</label>';
  return '<span style="font-size:11px;color:var(--muted)">' + (rij.in_im === true ? 'Opgenomen in IM' : 'Niet in IM') + '</span>';
}
function jurContractenHtml(d) {
  var dis = JUR.bezig ? ' disabled' : '', a = d.analyse;
  var h = '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Leg de belangrijke overeenkomsten vast: soort, een korte omschrijving zonder namen van de wederpartij, looptijd, opzegtermijn, change of control, exclusiviteit en jaarwaarde. ' + (isTussen() ? 'U bepaalt per overeenkomst of die in het informatiememorandum komt.' : 'De begeleider bepaalt per overeenkomst of die in het informatiememorandum komt.') + '</div>';
  if (a && a.contracten) h += '<div style="font-size:12px;margin-bottom:.4rem">' + a.contracten + ' overeenkomst(en)' + (a.change_of_control ? ', <strong>' + a.change_of_control + ' met change of control</strong>' : '') + (a.aflopend_24mnd ? ', ' + a.aflopend_24mnd + ' binnen 24 maanden aflopend' : '') + (a.jaarwaarde != null ? ', jaarwaarde ' + finGeld(a.jaarwaarde) : '') + '. In het IM: ' + d.im.contracten + '.</div>';
  JUR.contr.forEach(function (c, i) {
    h += '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .6rem;margin:.4rem 0;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
      + jurSel('contr', i, 'soort', JUR_SOORT, c.soort) + ' Omschrijving ' + jurIn('contr', i, 'omschrijving', c.omschrijving, 'text', 220) + ' Looptijd tot ' + jurIn('contr', i, 'einddatum', c.einddatum, 'date', 130)
      + ' Opzegtermijn (mnd) ' + jurIn('contr', i, 'opzegtermijn_mnd', c.opzegtermijn_mnd, 'text', 50) + ' Change of control ' + jurSel('contr', i, 'change_of_control', JUR_JN, c.change_of_control)
      + ' Exclusiviteit ' + jurSel('contr', i, 'exclusiviteit', JUR_JN, c.exclusiviteit) + ' Jaarwaarde ' + jurIn('contr', i, 'jaarwaarde', c.jaarwaarde, 'text', 90) + ' ' + jurImVeld('contr', i, c)
      + ' <button class="btn-ghost btn-sm" style="font-size:11px" onclick="jurWeg(\'contr\',' + i + ')">Verwijderen</button></div>';
  });
  return h + '<div style="display:flex;gap:6px;margin-top:.4rem"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="jurNieuw(\'contr\')"' + dis + '>Overeenkomst toevoegen</button><button class="btn btn-sm" style="font-size:11px" onclick="jurBewaar(\'contr\')"' + dis + '>Contractenoverzicht opslaan</button></div>';
}
function jurAandachtHtml(d) {
  var dis = JUR.bezig ? ' disabled' : '';
  var h = '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Leg juridische aandachtspunten vast, zoals een geschil, een fiscaal punt, een vergunning of een garantie, met de status en eventueel het geschatte financiële belang. Een aandachtspunt dat niet voor het IM is vrijgegeven, blijft intern en komt aan de orde in het due-diligenceonderzoek.</div>';
  if (d.intern_aandachtspunten) h += '<div style="font-size:12px;margin-bottom:.4rem">' + d.intern_aandachtspunten + ' aandachtspunt(en) niet in het IM.</div>';
  JUR.punt.forEach(function (p, i) {
    h += '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .6rem;margin:.4rem 0;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
      + jurSel('punt', i, 'soort', JUR_AANDACHT, p.soort) + ' Omschrijving ' + jurIn('punt', i, 'omschrijving', p.omschrijving, 'text', 280) + ' Status ' + jurSel('punt', i, 'status', JUR_STATUS, p.status)
      + ' Financieel belang ' + jurIn('punt', i, 'financieel_belang', p.financieel_belang, 'text', 90) + ' ' + jurImVeld('punt', i, p)
      + ' <button class="btn-ghost btn-sm" style="font-size:11px" onclick="jurWeg(\'punt\',' + i + ')">Verwijderen</button></div>';
  });
  return h + '<div style="display:flex;gap:6px;margin-top:.4rem"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="jurNieuw(\'punt\')"' + dis + '>Aandachtspunt toevoegen</button><button class="btn btn-sm" style="font-size:11px" onclick="jurBewaar(\'punt\')"' + dis + '>Aandachtspunten opslaan</button></div>';
}
function renderJuridisch(faseId) {
  jurSync();
  if (faseId !== 'juridisch' || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (JUR.status === 'idle') setTimeout(jurLaad, 0);
  var h = '<div class="panel" id="jur-panel" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">&#128220; Overeenkomsten en juridische aandachtspunten</div>';
  if (JUR.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin:.4rem 0;border-radius:var(--r);border:1px solid ' + (JUR.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + finEsc(JUR.melding.tekst) + '</div>';
  if (JUR.status !== 'ok' || !JUR.data) return h + '<div style="font-size:12px;color:var(--muted)">' + (JUR.status === 'fout' ? 'Dit onderdeel kon niet worden geladen.' : 'Laden…') + '</div></div>';
  return h + jurContractenHtml(JUR.data) + '<div style="border-top:1px solid var(--border);margin:.8rem 0 .2rem"></div>' + jurAandachtHtml(JUR.data) + '</div>';
}
