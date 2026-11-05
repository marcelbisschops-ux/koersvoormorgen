// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase D (29 okt 2026): personeel (fase Partners & personeel), huisvesting (fase Juridisch & fiscaal)
// en IT (fase IT & systemen). Alleen verkoper en begeleider. Personeel: upload van een personeelsoverzicht; de
// server bewaart uitsluitend aggregaten (geen namen of BSN) en toont gemiddelden en loonkosten alleen voor groepen
// van minimaal drie personen (worker/48). Laadt na mna/16 en mna/17 (hergebruikt finEsc/finGeld/finPct/finAntw/
// finHeaders/finHerteken/finScope en kaTabel).
var ORG = { scope: null, status: 'idle', data: null, bezig: false, melding: null, locs: null, it: null };
var ORG_FASE = { partner: 'personeel', juridisch: 'huisvesting', it: 'it' };
var ORG_CAT = [['boekhouding', 'Boekhouding'], ['fiscaal', 'Fiscale software'], ['salaris', 'Salarisadministratie'], ['crm', 'CRM'], ['document', 'Documentbeheer'], ['werkplek', 'Werkplek'], ['communicatie', 'Communicatie'], ['beveiliging', 'Beveiliging'], ['overig', 'Overig']];
var ORG_HOST = [['cloud', 'Cloud'], ['on_prem', 'Eigen server'], ['hybride', 'Hybride'], ['onbekend', 'Onbekend']];
var ORG_JN = [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Onbekend']];

function orgSync() { var k = finScope(); if (ORG.scope !== k) { ORG.scope = k; ORG.status = 'idle'; ORG.data = null; ORG.bezig = false; ORG.melding = null; ORG.locs = null; ORG.it = null; } }
function orgKopie(x) { return JSON.parse(JSON.stringify(x || [])); }
function orgLaad() {
  orgSync();
  if (!S.code || !(isVerkoper() || isTussen()) || ORG.status === 'laden') return;
  var scope = ORG.scope; ORG.status = 'laden';
  finAntw(fetchMetTimeout(WORKER + '/mna/organisatie?code=' + encodeURIComponent(S.code), { method: 'GET', headers: finHeaders() }, 30000)).then(function (x) {
    if (ORG.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true) { ORG.status = 'ok'; ORG.data = x.d; ORG.locs = orgKopie(x.d.locaties); ORG.it = orgKopie(x.d.it); } else { ORG.status = 'fout'; ORG.data = null; }
    finHerteken();
  });
}
function orgPost(pad, body, ok) {
  if (ORG.bezig) return;
  ORG.bezig = true; ORG.melding = null; finHerteken();
  body.code = S.code; body.rev = ORG.data ? ORG.data.rev : 0;
  finAntw(fetchMetTimeout(WORKER + '/mna/organisatie/' + pad, { method: 'POST', headers: finHeaders(), body: JSON.stringify(body) }, 60000)).then(function (x) {
    ORG.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true) { ORG.data = x.d; ORG.locs = orgKopie(x.d.locaties); ORG.it = orgKopie(x.d.it); ORG.melding = { soort: 'ok', tekst: ok }; }
    else {
      ORG.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      if (x.s === 409) { ORG.status = 'idle'; setTimeout(orgLaad, 0); }
    }
    finHerteken();
  });
}
window.orgUploadPersoneel = function () {
  var inp = ge('org-ps-bestand'), bestand = inp && inp.files && inp.files[0], pj = parseInt((ge('org-ps-jaar') || {}).value, 10);
  if (!bestand) { ORG.melding = { soort: 'fout', tekst: 'Kies eerst een personeelsoverzicht (CSV of XLSX).' }; finHerteken(); return; }
  if (bestand.size > 5 * 1024 * 1024) { ORG.melding = { soort: 'fout', tekst: 'Het bestand is groter dan 5 MB.' }; finHerteken(); return; }
  if (ORG.data && ORG.data.personeel && !confirm('Er staat al een personeelsoverzicht. Vervangen?')) return;
  var lezer = new FileReader();
  lezer.onload = function () { orgPost('personeel', { bestand_naam: bestand.name, peiljaar: isFinite(pj) ? pj : undefined, inhoud_base64: String(lezer.result || '').split(',')[1] || '' }, 'Personeelsoverzicht verwerkt.'); };
  lezer.readAsDataURL(bestand);
};
window.orgVerwijderPersoneel = function () { if (confirm('Het personeelsoverzicht verwijderen?')) orgPost('personeel/verwijder', {}, 'Personeelsoverzicht verwijderd.'); };
// Bewerken in een werkkopie; opslaan stuurt de hele lijst (de server valideert alles opnieuw).
window.orgZet = function (lijst, i, veld, el) {
  var rij = ORG[lijst] && ORG[lijst][i]; if (!rij) return;
  var v = el.type === 'checkbox' ? el.checked : el.value;
  if (['m2', 'huur_per_jaar', 'opzegtermijn_mnd', 'werkplekken', 'kosten_per_jaar'].indexOf(veld) >= 0) { v = String(v).trim() === '' ? null : Number(String(v).replace(/\./g, '').replace(',', '.')); }
  rij[veld] = v;
};
window.orgDoc = function (i, id, el) { var l = ORG.locs[i]; if (!l) return; l.document_ids = (l.document_ids || []).filter(function (x) { return x !== id; }); if (el.checked) l.document_ids.push(id); };
window.orgNieuw = function (lijst) { ORG[lijst].push(lijst === 'locs' ? { plaats: '', eigendom: 'huur', document_ids: [] } : { naam: '', categorie: 'overig', hosting: 'cloud', overdraagbaar: 'onbekend' }); finHerteken(); };
window.orgWeg = function (lijst, i) { ORG[lijst].splice(i, 1); finHerteken(); };
window.orgBewaar = function (lijst) {
  if (lijst === 'locs') orgPost('locaties', { locaties: ORG.locs }, 'Huisvesting opgeslagen.');
  else orgPost('it', { systemen: ORG.it }, 'IT-omgeving opgeslagen.');
};

function orgOpt(lijst, w) { return lijst.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === w ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join(''); }
function orgIn(lijst, i, veld, w, type, br) { return '<input type="' + (type || 'text') + '" value="' + finEsc(w == null ? '' : w) + '" style="width:' + (br || 120) + 'px;font-size:12px" onchange="orgZet(\'' + lijst + '\',' + i + ',\'' + veld + '\',this)">'; }
function orgSel(lijst, i, veld, opts, w) { return '<select style="font-size:12px" onchange="orgZet(\'' + lijst + '\',' + i + ',\'' + veld + '\',this)">' + orgOpt(opts, w) + '</select>'; }
function orgAlleDocs() {
  var uit = [], gezien = {};
  Object.keys(typeof DOCS !== 'undefined' ? DOCS : {}).forEach(function (f) { (DOCS[f] || []).forEach(function (d) { if (d && d.id && !d.uploading && !gezien[d.id] && !/^tmp/i.test(String(d.id))) { gezien[d.id] = 1; uit.push(d); } }); });
  return uit;
}
function orgPersoneelHtml(d) {
  var p = d.personeel, dis = ORG.bezig ? ' disabled' : '';
  var h = '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Upload een personeelsoverzicht (CSV of XLSX) met per medewerker minimaal functie en fte; geboortejaar, datum in dienst, contractvorm, loonkosten, kwalificatie en partner zijn optioneel. Namen en BSN worden niet gelezen of bewaard; het platform slaat alleen totalen op en toont gemiddelden en loonkosten pas vanaf drie personen per groep.</div>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:.4rem 0"><label style="font-size:11px;color:var(--sub)">Peiljaar <input type="number" id="org-ps-jaar" value="' + finEsc(p ? p.peiljaar : new Date().getFullYear()) + '" style="width:70px"></label><input type="file" id="org-ps-bestand" accept=".csv,.xlsx" style="font-size:12px"><button class="btn btn-sm" style="font-size:11px" onclick="orgUploadPersoneel()"' + dis + '>' + (p ? 'Vervangen' : 'Inlezen') + '</button>'
    + (p && isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="orgVerwijderPersoneel()"' + dis + '>Verwijderen</button>' : '') + '</div>';
  if (!p) return h;
  h += '<div style="font-size:12px;line-height:1.7">' + p.aantal + ' medewerkers, ' + String(p.fte).replace('.', ',') + ' fte' + (p.partners.aantal ? ', waarvan ' + p.partners.aantal + ' partner(s)' : '') + (p.gem_leeftijd != null ? '. Gemiddelde leeftijd ' + String(p.gem_leeftijd).replace('.', ',') + ' jaar' : '') + (p.gem_dienstjaren != null ? ', gemiddeld dienstverband ' + String(p.gem_dienstjaren).replace('.', ',') + ' jaar' : '') + (p.zestig_plus ? '. ' + p.zestig_plus + ' medewerker(s) van 60 jaar of ouder' : '') + (p.loonkosten ? '. Loonkosten ' + finGeld(p.loonkosten.totaal) + ' (' + finGeld(p.loonkosten.per_fte) + ' per fte)' : '') + '.</div>'
    + kaTabel(['Functie', 'Medewerkers', 'Fte', 'Gem. dienstjaren', 'Loonkosten per fte'], p.functiegroepen.map(function (g) { return [finEsc(g.functie), g.aantal, String(g.fte).replace('.', ','), g.gem_dienstjaren != null ? String(g.gem_dienstjaren).replace('.', ',') : '–', g.loonkosten_per_fte != null ? finGeld(g.loonkosten_per_fte) : '–']; }));
  if (p.leeftijdsklassen.length) h += kaTabel(['Leeftijd', 'Medewerkers'], p.leeftijdsklassen.map(function (k) { return [finEsc(k.label), k.aantal]; }));
  if (p.dienstjarenklassen.length) h += kaTabel(['Dienstverband', 'Medewerkers'], p.dienstjarenklassen.map(function (k) { return [finEsc(k.label), k.aantal]; }));
  if (p.contracten.length) h += kaTabel(['Contractvorm', 'Medewerkers'], p.contracten.map(function (k) { return [finEsc(k.label), k.aantal]; }));
  return h + '<div style="font-size:11px;color:var(--muted)">Bron: ' + finEsc(d.personeel_bron || '') + '</div>';
}
function orgHuisvestingHtml(d) {
  var dis = ORG.bezig ? ' disabled' : '', docs = orgAlleDocs(), hv = d.huisvesting;
  var h = '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Leg per locatie de plaats, oppervlakte, huur of eigendom, de huurlasten en de einddatum van het huurcontract vast, en koppel het huurcontract en foto’s uit de dossierdocumenten. In het memorandum staan alleen plaats, oppervlakte, werkplekken en de huur- of eigendomssituatie.</div>';
  if (hv && hv.locaties) h += '<div style="font-size:12px;margin-bottom:.4rem">' + hv.locaties + ' locatie(s), ' + String(hv.m2).replace('.', ',') + ' m², ' + hv.werkplekken + ' werkplekken' + (hv.huur_per_jaar != null ? ', huurlasten ' + finGeld(hv.huur_per_jaar) + ' per jaar' : '') + (hv.huur_aflopend_24mnd ? '. <strong>' + hv.huur_aflopend_24mnd + ' huurcontract(en) lopen binnen 24 maanden af</strong>' : '') + (hv.huur_zonder_einddatum ? '. ' + hv.huur_zonder_einddatum + ' huurcontract(en) zonder einddatum' : '') + '.</div>';
  ORG.locs.forEach(function (l, i) {
    var eigen = (d.locaties[i] && d.locaties[i].documenten) || [];
    h += '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .6rem;margin:.4rem 0;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
      + 'Plaats ' + orgIn('locs', i, 'plaats', l.plaats) + ' Adres ' + orgIn('locs', i, 'adres', l.adres, 'text', 180) + ' ' + orgSel('locs', i, 'eigendom', [['huur', 'Huur'], ['eigendom', 'Eigendom']], l.eigendom)
      + ' m² ' + orgIn('locs', i, 'm2', l.m2, 'text', 60) + ' Werkplekken ' + orgIn('locs', i, 'werkplekken', l.werkplekken, 'text', 50)
      + (l.eigendom === 'huur' ? ' Huur per jaar ' + orgIn('locs', i, 'huur_per_jaar', l.huur_per_jaar, 'text', 90) + ' Einddatum ' + orgIn('locs', i, 'einddatum', l.einddatum, 'date', 130) + ' Opzegtermijn (mnd) ' + orgIn('locs', i, 'opzegtermijn_mnd', l.opzegtermijn_mnd, 'text', 40) : '')
      + ' <button class="btn-ghost btn-sm" style="font-size:11px" onclick="orgWeg(\'locs\',' + i + ')">Verwijderen</button>'
      + '<div style="width:100%;font-size:11px;color:var(--sub)">Gekoppelde documenten: ' + (docs.length ? docs.map(function (dc) { return '<label style="margin-right:8px"><input type="checkbox"' + ((l.document_ids || []).indexOf(dc.id) >= 0 ? ' checked' : '') + ' data-id="' + finEsc(dc.id) + '" onchange="orgDoc(' + i + ',this.getAttribute(\'data-id\'),this)"> ' + finEsc(dc.naam) + '</label>'; }).join('') : 'nog geen documenten in het dossier') + '</div>'
      + (eigen.length ? '<div style="width:100%;font-size:11px;color:var(--muted)">Opgeslagen: ' + eigen.map(function (dc) { return finEsc(dc.bestand_naam) + (dc.foto ? ' (foto)' : ''); }).join(', ') + '</div>' : '')
      + '</div>';
  });
  return h + '<div style="display:flex;gap:6px;margin-top:.4rem"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="orgNieuw(\'locs\')"' + dis + '>Locatie toevoegen</button><button class="btn btn-sm" style="font-size:11px" onclick="orgBewaar(\'locs\')"' + dis + '>Huisvesting opslaan</button></div>';
}
function orgItHtml(d) {
  var dis = ORG.bezig ? ' disabled' : '', a = d.it_analyse;
  var h = '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Leg per systeem de categorie, leverancier, hosting, de overdraagbaarheid van de licentie, de einddatum van het contract en de kosten per jaar vast.</div>';
  if (a && a.systemen) h += '<div style="font-size:12px;margin-bottom:.4rem">' + a.systemen + ' systemen' + (a.kosten_per_jaar != null ? ', IT-kosten ' + finGeld(a.kosten_per_jaar) + ' per jaar' + (a.kosten_pct_omzet != null ? ' (' + finPct(a.kosten_pct_omzet) + ' van de omzet)' : '') : '') + ', ' + a.cloud + ' in de cloud' + (a.niet_overdraagbaar ? '. <strong>' + a.niet_overdraagbaar + ' licentie(s) niet overdraagbaar</strong>' : '') + (a.overdraagbaar_onbekend ? '. Overdraagbaarheid onbekend bij ' + a.overdraagbaar_onbekend : '') + (a.contract_aflopend_12mnd ? '. ' + a.contract_aflopend_12mnd + ' contract(en) lopen binnen 12 maanden af' : '') + '.</div>';
  ORG.it.forEach(function (s, i) {
    h += '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.5rem .6rem;margin:.4rem 0;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
      + 'Naam ' + orgIn('it', i, 'naam', s.naam) + ' ' + orgSel('it', i, 'categorie', ORG_CAT, s.categorie) + ' Leverancier ' + orgIn('it', i, 'leverancier', s.leverancier) + ' ' + orgSel('it', i, 'hosting', ORG_HOST, s.hosting)
      + ' Licentie overdraagbaar ' + orgSel('it', i, 'overdraagbaar', ORG_JN, s.overdraagbaar) + ' Contracteinde ' + orgIn('it', i, 'contracteinde', s.contracteinde, 'date', 130) + ' Kosten per jaar ' + orgIn('it', i, 'kosten_per_jaar', s.kosten_per_jaar, 'text', 80)
      + ' <button class="btn-ghost btn-sm" style="font-size:11px" onclick="orgWeg(\'it\',' + i + ')">Verwijderen</button></div>';
  });
  return h + '<div style="display:flex;gap:6px;margin-top:.4rem"><button class="btn-ghost btn-sm" style="font-size:11px" onclick="orgNieuw(\'it\')"' + dis + '>Systeem toevoegen</button><button class="btn btn-sm" style="font-size:11px" onclick="orgBewaar(\'it\')"' + dis + '>IT-omgeving opslaan</button></div>';
}
function renderOrganisatie(faseId) {
  orgSync();
  var deel = ORG_FASE[faseId];
  if (!deel || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (ORG.status === 'idle') setTimeout(orgLaad, 0);
  var titel = { personeel: '&#128101; Personeel (geaggregeerd)', huisvesting: '&#127970; Huisvesting', it: '&#128187; IT-omgeving' }[deel];
  var h = '<div class="panel" id="org-panel-' + deel + '" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">' + titel + '</div>';
  if (ORG.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin:.4rem 0;border-radius:var(--r);border:1px solid ' + (ORG.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + finEsc(ORG.melding.tekst) + '</div>';
  if (ORG.status !== 'ok' || !ORG.data) return h + '<div style="font-size:12px;color:var(--muted)">' + (ORG.status === 'fout' ? 'Dit onderdeel kon niet worden geladen.' : 'Laden…') + '</div></div>';
  h += deel === 'personeel' ? orgPersoneelHtml(ORG.data) : deel === 'huisvesting' ? orgHuisvestingHtml(ORG.data) : orgItHtml(ORG.data);
  return h + '</div>';
}
