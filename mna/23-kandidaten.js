// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-FUNC-WF-001 (GO Marcel 03-11-2026): kandidatenproces bij een verkoopmandaat. Longlist, teaser, NDA, shortlist,
// voorleggen en het formele besluit van de opdrachtgever. Alle regels (overgangen, bewijs, score, bulkcontrole,
// idempotentie, rechten) staan in de backend (worker/58-kandidaten.js); dit scherm toont en roept aan, het rekent niets.
// Nieuwe schermen in je-vorm (N-165, besluit 02-11-2026 voor nieuwe UX).
var KD = { data: null, code: null, tab: 'longlist', open: {}, sel: {}, bulk: null, melding: null, bezig: false, docs: null, hist: {} };
var KD_STAP = { longlist: ['Longlist', 'kd-grijs'], teaser: ['Teaser verstuurd', 'kd-blauw'], reactie: ['Interesse', 'kd-blauw'], nda: ['NDA', 'kd-oranje'],
  im: ['IM gedeeld', 'kd-blauw'], shortlist: ['Shortlist', 'kd-blauw'], akkoord: ['Akkoord opdrachtgever', 'kd-groen'], gesprek: ['In gesprek', 'kd-blauw'], bod: ['Bod ontvangen', 'kd-blauw'], loi: ['LOI getekend', 'kd-groen'] };
var KD_AFLOOP = { afgewezen_kandidaat: 'Geen interesse', uitgesloten: 'Uitgesloten', geen_reactie: 'Geen reactie', niet_doorgaan: 'Niet doorgaan (besluit opdrachtgever)', bezwaar: 'Bezwaar: niet meer benaderen' };
// Per stap de gebeurtenissen die de backend toestaat (zelfde tabel als OVERGANGEN in worker/58).
var KD_VOLGENDE = { longlist: [['teaser_verstuurd', 'Teaser verstuurd']], teaser: [['interesse', 'Interesse'], ['geen_interesse', 'Geen interesse'], ['geen_reactie', 'Geen reactie']],
  reactie: [['nda_verstuurd', 'NDA verstuurd'], ['nda_getekend', 'NDA getekend'], ['geen_interesse', 'Geen interesse']], nda: [['nda_getekend', 'NDA getekend'], ['im_gedeeld', 'IM gedeeld'], ['geen_interesse', 'Geen interesse']],
  akkoord: [['gesprek', 'Gesprek gevoerd']], gesprek: [['bod', 'Bod ontvangen']], bod: [['loi', 'LOI getekend']] };
var KD_BULK = [['shortlist', 'Op de shortlist zetten'], ['uitsluiten', 'Uitsluiten'], ['herstellen', 'Weer actief zetten'], ['vervolg', 'Vervolgactie aanmaken'], ['teaser', 'Teaser versturen'], ['nda', 'NDA-uitnodiging versturen'], ['herinnering', 'Herinnering versturen']];
var KD_CRIT = [['werkgebied', 'Werkgebied'], ['dienstverlening', 'Dienstverlening'], ['omvang', 'Omvang'], ['software', 'Software'], ['cultuur', 'Cultuur'], ['financiering', 'Financiering']];

function kdEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function kdIdem() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); }
function kdDatum(ms) { if (!ms) return ''; var d = new Date(Number(ms)); return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }); }
function kdRolBegeleider() { return typeof isTussen === 'function' && isTussen(); }
function kdRolOpdrachtgever() { return typeof isVerkoper === 'function' && isVerkoper(); }
function kdKoopmandaat() { return !!(S && S.traject && S.traject.opdrachtgever_rol === 'koper'); }
function kdHeaders(json) { var h = json ? { 'Content-Type': 'application/json' } : {}; if (kdRolBegeleider()) h['x-tussen-key'] = S._bgKey || S.code; return h; }
function kdStatus(k) {
  if (k.afloop) return '<span class="kd-label ' + (k.afloop === 'niet_doorgaan' ? 'kd-rood' : 'kd-grijs') + '">' + kdEsc(KD_AFLOOP[k.afloop] || k.afloop) + '</span>';
  var s = KD_STAP[k.stap] || [k.stap, 'kd-grijs'];
  return '<span class="kd-label ' + s[1] + '">' + kdEsc(s[0]) + '</span>';
}
function kdScore(k) {
  if (k.score === null || k.score === undefined) return '<span class="kd-score kd-grijs" title="Nog geen criteria bekend">onbekend</span>';
  var z = k.zekerheid === 'volledig' ? '' : (k.zekerheid === 'redelijk' ? ' · redelijk zeker' : ' · indicatief');
  return '<span class="kd-score">' + kdEsc(k.score) + '</span><span class="kd-sub"> dekking ' + kdEsc(k.dekking) + '%' + z + '</span>';
}

function kdApi(methode, pad, body) {
  var url = WORKER + pad + (methode === 'GET' ? (pad.indexOf('?') >= 0 ? '&' : '?') + 'code=' + encodeURIComponent(S.code) : '');
  var opts = { method: methode, headers: kdHeaders(methode !== 'GET'), cache: 'no-store' };
  if (methode !== 'GET') opts.body = JSON.stringify(Object.assign({ code: S.code }, body || {}));
  return fetchMetTimeout(url, opts, 20000).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j || {} }; }); })
    .catch(function () { return { status: 0, json: { error: 'Geen verbinding. Er is niets gewijzigd; probeer het opnieuw.' } }; });
}
function kdLaad(klaar) {
  if (!S || !S.code) return;
  var code = S.code;
  kdApi('GET', '/mna/kandidaten').then(function (r) {
    if (!S || S.code !== code) return;
    if (r.status !== 200) { KD.data = { fout: r.json.error || ('Kandidaten konden niet worden geladen (HTTP ' + r.status + ').'), code: r.json.code }; }
    else { KD.data = r.json; KD.code = code; }
    if (klaar) klaar();
  });
}
function kdVervang(k) { if (!KD.data || !KD.data.kandidaten) return; for (var i = 0; i < KD.data.kandidaten.length; i++) if (KD.data.kandidaten[i].id === k.id) { KD.data.kandidaten[i] = k; return; } KD.data.kandidaten.push(k); }

// ── Begeleider ──
function kdBegeleiderHtml() {
  var d = KD.data;
  var h = '<div class="kd" id="kd-paneel"><div class="kd-kop"><div><div class="kd-titel">Kandidaten</div>';
  if (!d) return h + '<div class="kd-sub">Laden…</div></div></div></div>';
  if (d.fout) return h + '<div class="kd-melding kd-rood-bg">' + kdEsc(d.fout) + '</div></div></div></div>';
  var ks = d.kandidaten || [];
  var actief = ks.filter(function (k) { return !k.afloop; });
  var sl = ks.filter(function (k) { return ['shortlist', 'akkoord', 'gesprek', 'bod', 'loi'].indexOf(k.stap) >= 0; });
  h += '<div class="kd-sub">' + ks.length + ' op de longlist, ' + actief.length + ' actief, ' + sl.length + ' op de shortlist' + (d.voorgelegd ? ' · shortlist ligt bij de opdrachtgever sinds ' + kdEsc(kdDatum(d.voorgelegd_op)) : '') + '</div></div>';
  h += '<div class="kd-tabs" role="tablist"><button type="button" role="tab" class="kd-tab' + (KD.tab === 'longlist' ? ' kd-actief' : '') + '" data-kd-tab="longlist" aria-selected="' + (KD.tab === 'longlist') + '">Longlist</button>'
    + '<button type="button" role="tab" class="kd-tab' + (KD.tab === 'shortlist' ? ' kd-actief' : '') + '" data-kd-tab="shortlist" aria-selected="' + (KD.tab === 'shortlist') + '">Shortlist</button></div></div>';
  if (KD.melding) h += '<div class="kd-melding ' + (KD.melding.soort === 'fout' ? 'kd-rood-bg' : 'kd-groen-bg') + '" role="status">' + kdEsc(KD.melding.tekst) + '</div>';
  h += KD.tab === 'shortlist' ? kdShortlistHtml(d, sl) : kdLonglistHtml(d, ks);
  return h + '</div>';
}
function kdLonglistHtml(d, ks) {
  var h = '<div class="kd-balk"><button type="button" class="btn-ghost btn-sm" data-kd-doe="nieuw">+ Kandidaat toevoegen</button>';
  var nSel = Object.keys(KD.sel).filter(function (id) { return KD.sel[id]; }).length;
  h += '<span class="kd-bulk"><label class="kd-sub" for="kd-bulk-actie">' + nSel + ' geselecteerd</label> <select id="kd-bulk-actie"' + (nSel ? '' : ' disabled') + '>'
    + KD_BULK.filter(function (a) { return d.extern_actief || ['teaser', 'nda', 'herinnering'].indexOf(a[0]) < 0; }).map(function (a) { return '<option value="' + a[0] + '">' + kdEsc(a[1]) + '</option>'; }).join('') + '</select> '
    + '<button type="button" class="btn-ghost btn-sm" data-kd-doe="controle"' + (nSel ? '' : ' disabled') + '>Controleren</button></span></div>';
  if (KD.nieuw) h += kdNieuwHtml();
  if (KD.bulk) h += kdBulkHtml();
  if (!ks.length) return h + '<div class="kd-leeg">Nog geen kandidaten. Voeg kandidaten toe uit je matching of handmatig.</div>';
  h += '<div class="kd-tabel-wrap"><table class="kd-tabel"><thead><tr><th><span class="sr-only">Selecteren</span></th><th>Kandidaat</th><th>Match</th><th>Status</th><th>Volgende stap</th></tr></thead><tbody>';
  ks.slice().sort(function (a, b) { return (a.afloop ? 1 : 0) - (b.afloop ? 1 : 0) || (b.score || -1) - (a.score || -1); }).forEach(function (k) {
    var acties = k.afloop ? [] : (KD_VOLGENDE[k.stap] || []).filter(function (g) { return !(g[0] === 'im_gedeeld' && !k.nda_getekend_op) && !(g[0] === 'nda_getekend' && k.nda_getekend_op); });
    var wacht = '';
    if (!k.afloop && k.stap === 'im') wacht = '<span class="kd-sub">Klaar voor de shortlist</span>';
    else if (!k.afloop && k.stap === 'shortlist') wacht = '<span class="kd-label kd-oranje">' + (d.voorgelegd ? 'Wacht op besluit opdrachtgever' : 'Nog voorleggen') + '</span>';
    h += '<tr class="' + (k.afloop ? 'kd-af' : '') + '"><td><input type="checkbox" data-kd-sel="' + kdEsc(k.id) + '"' + (KD.sel[k.id] ? ' checked' : '') + ' aria-label="Selecteer ' + kdEsc(k.naam) + '"></td>'
      + '<td><button type="button" class="kd-naam" data-kd-open="' + kdEsc(k.id) + '" aria-expanded="' + !!KD.open[k.id] + '">' + kdEsc(k.naam) + '</button><div class="kd-sub">' + kdEsc([k.plaats, k.omvang].filter(Boolean).join(' · ')) + '</div></td>'
      + '<td>' + kdScore(k) + '</td><td>' + kdStatus(k) + (k.besluit ? '<div class="kd-sub">besluit ' + kdEsc(kdDatum(k.besluit.op)) + '</div>' : '') + '</td>'
      + '<td><div class="kd-acties">' + wacht + acties.map(function (g) { return '<button type="button" class="btn-ghost btn-sm" data-kd-reg="' + g[0] + '" data-kd-id="' + kdEsc(k.id) + '">' + kdEsc(g[1]) + '</button>'; }).join('') + '</div></td></tr>';
    if (KD.ndaKies === k.id) h += '<tr class="kd-detail"><td></td><td colspan="4">' + kdNdaKiesHtml(k) + '</td></tr>';
    if (KD.open[k.id]) h += '<tr class="kd-detail"><td></td><td colspan="4">' + kdDetailHtml(k) + '</td></tr>';
  });
  return h + '</tbody></table></div>';
}
function kdDetailHtml(k) {
  var h = '<div class="kd-detail-grid"><div><div class="kd-sub">Waarom deze score</div><table class="kd-uitleg"><tr><th>Criterium</th><th>Gewicht</th><th>Score</th><th>Bijdrage</th></tr>';
  (k.score_uitleg || []).forEach(function (r) { h += '<tr><td>' + kdEsc(r.criterium) + '</td><td>' + r.gewicht + '%</td><td>' + (r.score === null ? '<span class="kd-sub">onbekend</span>' : r.score) + '</td><td>' + (r.bijdrage === null ? '–' : r.bijdrage) + '</td></tr>'; });
  h += '</table>' + (k.ontbreekt && k.ontbreekt.length ? '<div class="kd-sub">Onbekend (telt niet mee, niet als nul): ' + kdEsc(k.ontbreekt.join(', ')) + '</div>' : '') + '</div>';
  h += '<div><div class="kd-sub">Contact</div><div>' + kdEsc(k.contact_naam || '–') + (k.email ? ' · ' + kdEsc(k.email) : '') + '</div>'
    + '<label class="kd-sub" for="kd-advies-' + kdEsc(k.id) + '" style="display:block;margin-top:.5rem">Advies aan de opdrachtgever</label>'
    + '<textarea id="kd-advies-' + kdEsc(k.id) + '" rows="3" maxlength="1000">' + kdEsc(k.advies || '') + '</textarea>'
    + '<button type="button" class="btn-ghost btn-sm" data-kd-advies="' + kdEsc(k.id) + '">Advies opslaan</button>';
  var U = { verzonden: 'verzonden', mislukt: 'mislukt (niet verzonden, opnieuw mogelijk)', bezig: 'bezig met verzenden', onzeker: 'uitkomst onzeker (mogelijk bezorgd; niet automatisch opnieuw)' }, R = { interesse: 'interesse', geen_interesse: 'geen interesse', nda_gegevens: 'ondertekenaar doorgegeven', bezwaar: 'bezwaar: niet meer benaderen, contactgegevens verwijderd' };
  if (k.uitnodigingen && k.uitnodigingen.length) h += '<div class="kd-sub" style="margin-top:.6rem">Verstuurd via beveiligde link</div><ul class="kd-hist">' + k.uitnodigingen.map(function (u) {
    return '<li><b>' + (u.soort === 'nda' ? 'NDA-uitnodiging' : 'Teaser') + '</b> ' + kdEsc(U[u.status] || u.status) + (u.verzonden_op ? ' ' + kdEsc(kdDatum(u.verzonden_op)) : '') + (u.herinneringen ? ' · ' + u.herinneringen + ' herinnering(en)' : '')
      + (u.geopend_op ? ' · geopend' : ' · nog niet geopend') + (u.reactie ? ' · reactie: ' + kdEsc(R[u.reactie] || u.reactie) : '') + (u.verlopen ? ' · verlopen' : '') + (u.fout ? ' · ' + kdEsc(u.fout) : '')
      + (u.ondertekenaar ? '<div class="kd-sub">Ondertekenaar: ' + kdEsc(u.ondertekenaar.naam) + ', ' + kdEsc(u.ondertekenaar.functie) + ', ' + kdEsc(u.ondertekenaar.email) + '</div>' : '') + '</li>';
  }).join('') + '</ul>';
  h += '<div class="kd-sub" style="margin-top:.6rem">Historie</div>';
  var hi = KD.hist[k.id];
  h += !hi ? '<div class="kd-sub">Laden…</div>' : (hi.length ? '<ul class="kd-hist">' + hi.map(function (x) { return '<li><span class="kd-sub">' + kdEsc(kdDatum(x.created_at)) + '</span> ' + kdEsc(x.tekst) + '</li>'; }).join('') + '</ul>' : '<div class="kd-sub">Nog geen historie.</div>');
  // Verwijderverzoek of bezwaar (AVG): kandidaat met historie en uitnodigingen verwijderen, met bevestiging in het scherm.
  h += KD.verwijder === k.id
    ? '<div class="kd-melding kd-oranje-bg" style="margin-top:.6rem">' + kdEsc(k.naam) + ' met alle historie en uitnodigingen definitief verwijderen? Dit kan niet ongedaan worden gemaakt. <button type="button" class="btn btn-sm" data-kd-doe="verwijder-bevestig" data-kd-id="' + kdEsc(k.id) + '">Definitief verwijderen</button> <button type="button" class="btn-ghost btn-sm" data-kd-doe="verwijder-annuleer">Annuleren</button></div>'
    : '<div style="margin-top:.6rem"><button type="button" class="btn-ghost btn-sm" data-kd-doe="verwijder" data-kd-id="' + kdEsc(k.id) + '">Kandidaat verwijderen</button> <span class="kd-sub">bij bezwaar of een verwijderverzoek</span></div>';
  return h + '</div></div>';
}
function kdNieuwHtml() {
  var h = '<form class="kd-form" id="kd-nieuw-form"><div class="kd-form-rij">'
    + '<label>Naam kantoor<input name="naam" required maxlength="160"></label><label>Plaats<input name="plaats" maxlength="80"></label><label>Omvang<input name="omvang" maxlength="80"></label>'
    + (KD.data && KD.data.extern_actief && KD.data.vok_extern ? '<label>Contactpersoon<input name="contact_naam" maxlength="160"></label><label>E-mail<input name="email" type="email" maxlength="200"></label>' : '') + '</div>'
    + (KD.data && KD.data.extern_actief ? (KD.data.vok_extern ? '' : '<div class="kd-sub">Accepteer eerst de actuele verwerkersovereenkomst (versie 1.8) om contactgegevens vast te leggen en kandidaten te benaderen. <button type="button" class="btn-ghost btn-sm" data-kd-doe="vok">Verwerkersovereenkomst bekijken en accepteren</button></div>') : '<div class="kd-sub">Contactgegevens vastleggen en kandidaten via het platform benaderen is nog niet geactiveerd.</div>')
    + '<div class="kd-sub">Matchcriteria (0 tot 100). Laat leeg wat je niet weet: onbekend telt niet mee en wordt niet ingevuld.</div><div class="kd-form-rij">';
  KD_CRIT.forEach(function (c) { h += '<label>' + c[1] + '<input name="c_' + c[0] + '" type="number" min="0" max="100" step="1" inputmode="numeric"></label>'; });
  return h + '</div><div class="kd-balk"><button type="submit" class="btn btn-sm">Op de longlist zetten</button><button type="button" class="btn-ghost btn-sm" data-kd-doe="nieuw-annuleer">Annuleren</button></div></form>';
}
function kdBulkHtml() {
  var b = KD.bulk;
  var titel = (KD_BULK.filter(function (a) { return a[0] === b.actie; })[0] || [0, b.actie])[1];
  var h = '<div class="kd-bulkpaneel" role="region" aria-label="Bulkactie"><div class="kd-titel-klein">' + kdEsc(titel) + '</div>';
  if (b.extern && !b.resultaat) h += '<div class="kd-melding kd-oranje-bg">Elke kandidaat krijgt een eigen e-mail met een persoonlijke, beveiligde link (geen bijlagen, geen vertrouwelijke inhoud). Controleer de ontvangers hieronder.</div>';
  var lijst = b.resultaat || b.plan;
  h += '<ul class="kd-plan">' + lijst.map(function (p) {
    var st = p.status || p.uitkomst;
    var lab = { uitvoeren: ['Wordt uitgevoerd', 'kd-blauw'], verwerkt: ['Verwerkt', 'kd-groen'], al_verwerkt: ['Was al verwerkt', 'kd-groen'], overslaan: ['Overgeslagen', 'kd-grijs'], geblokkeerd: ['Geblokkeerd', 'kd-rood'], mislukt: ['Mislukt', 'kd-rood'] }[st] || [st, 'kd-grijs'];
    return '<li><span class="kd-label ' + lab[1] + '">' + lab[0] + '</span> ' + kdEsc(p.naam || p.id) + (p.reden ? ' <span class="kd-sub">(' + kdEsc(p.reden) + ')</span>' : '') + '</li>';
  }).join('') + '</ul>';
  var n = b.plan.filter(function (p) { return p.uitkomst === 'uitvoeren'; }).length;
  var mislukt = b.resultaat ? b.resultaat.filter(function (p) { return p.status === 'mislukt'; }).length : 0;
  if (!b.resultaat && b.extern) h += '<label class="kd-sub" style="display:flex;gap:6px;align-items:center;margin:.4rem 0"><input type="checkbox" id="kd-extern-ok"> Ik heb de ontvangers gecontroleerd en wil ' + n + ' e-mail' + (n === 1 ? '' : 's') + ' versturen</label>'
    + '<div class="kd-balk"><button type="button" class="btn btn-sm" data-kd-doe="uitvoeren" data-n="' + n + '" disabled>Versturen: ' + n + '</button><button type="button" class="btn-ghost btn-sm" data-kd-doe="bulk-sluit">Annuleren</button></div>';
  else if (!b.resultaat) h += '<div class="kd-balk"><button type="button" class="btn btn-sm" data-kd-doe="uitvoeren"' + (n ? '' : ' disabled') + '>Bevestigen: ' + n + ' uitvoeren</button><button type="button" class="btn-ghost btn-sm" data-kd-doe="bulk-sluit">Annuleren</button></div>';
  else h += '<div class="kd-balk">' + (mislukt ? '<button type="button" class="btn btn-sm" data-kd-doe="opnieuw">Alleen de mislukte opnieuw proberen</button>' : '') + '<button type="button" class="btn-ghost btn-sm" data-kd-doe="bulk-sluit">Sluiten</button></div>';
  return h + '</div>';
}
function kdShortlistHtml(d, sl) {
  var h = '';
  if (!sl.length) return '<div class="kd-leeg">Nog niemand op de shortlist. Kandidaten met een getekende NDA en gedeeld IM kun je op de longlist selecteren en met "Op de shortlist zetten" plaatsen.</div>';
  h += '<div class="kd-balk">' + (d.voorgelegd
    ? '<span class="kd-label kd-oranje">Ligt bij de opdrachtgever</span><button type="button" class="btn-ghost btn-sm" data-kd-doe="terugtrekken">Terugtrekken</button>'
    : '<button type="button" class="btn btn-sm" data-kd-doe="voorleggen">Shortlist voorleggen aan de opdrachtgever</button><span class="kd-sub">Samenstellen is nog geen akkoord: de opdrachtgever besluit per kandidaat.</span>') + '</div>';
  h += kdVergelijkHtml(sl, true);
  return h;
}
function kdVergelijkHtml(sl, metAdvies) {
  var h = '<div class="kd-tabel-wrap"><table class="kd-tabel kd-vergelijk"><thead><tr><th>Criterium</th>' + sl.map(function (k) { return '<th>' + kdEsc(k.naam) + '</th>'; }).join('') + '</tr></thead><tbody>';
  h += '<tr><th>Match</th>' + sl.map(function (k) { return '<td>' + kdScore(k) + '</td>'; }).join('') + '</tr>';
  KD_CRIT.forEach(function (c, i) {
    h += '<tr><th>' + c[1] + '</th>' + sl.map(function (k) { var r = (k.score_uitleg || [])[i]; return '<td>' + (r && r.score !== null ? r.score : '<span class="kd-sub">onbekend</span>') + '</td>'; }).join('') + '</tr>';
  });
  h += '<tr><th>Status</th>' + sl.map(function (k) { return '<td>' + kdStatus(k) + '</td>'; }).join('') + '</tr>';
  if (metAdvies) h += '<tr><th>Advies</th>' + sl.map(function (k) { return '<td class="kd-advies">' + (k.advies ? kdEsc(k.advies) : '<span class="kd-sub">nog geen advies</span>') + '</td>'; }).join('') + '</tr>';
  return h + '</tbody></table></div>';
}

// ── Opdrachtgever ──
function kdOpdrachtgeverHtml() {
  var d = KD.data;
  if (!d || d.fout || !d.voorgelegd || !(d.kandidaten || []).length) return '';
  var h = '<div class="kd" id="kd-paneel"><div class="kd-kop"><div><div class="kd-titel">Shortlist ter beoordeling</div><div class="kd-sub">Je adviseur heeft deze kandidaten voorgelegd op ' + kdEsc(kdDatum(d.voorgelegd_op)) + '. Je besluit per kandidaat; daarna kan je adviseur verder.</div></div></div>';
  if (KD.melding) h += '<div class="kd-melding ' + (KD.melding.soort === 'fout' ? 'kd-rood-bg' : 'kd-groen-bg') + '" role="status">' + kdEsc(KD.melding.tekst) + '</div>';
  h += kdVergelijkHtml(d.kandidaten, true);
  h += '<ul class="kd-besluiten">' + d.kandidaten.map(function (k) {
    if (k.besluit) return '<li><b>' + kdEsc(k.naam) + '</b> ' + '<span class="kd-label ' + (k.besluit.uitkomst === 'akkoord' ? 'kd-groen">Akkoord' : 'kd-rood">Niet doorgaan') + '</span> <span class="kd-sub">op ' + kdEsc(kdDatum(k.besluit.op)) + (k.besluit.reden ? ', ' + kdEsc(k.besluit.reden) : '') + '</span></li>';
    return '<li><b>' + kdEsc(k.naam) + '</b><label class="kd-sub" for="kd-reden-' + kdEsc(k.id) + '">Toelichting (optioneel)</label><input id="kd-reden-' + kdEsc(k.id) + '" maxlength="500">'
      + '<span class="kd-balk"><button type="button" class="btn btn-sm" data-kd-besluit="akkoord" data-kd-id="' + kdEsc(k.id) + '">Akkoord, verder met deze kandidaat</button>'
      + '<button type="button" class="btn-ghost btn-sm" data-kd-besluit="niet_doorgaan" data-kd-id="' + kdEsc(k.id) + '">Niet doorgaan</button></span></li>';
  }).join('') + '</ul>';
  return h + '</div>';
}

// ── Acties ──
function kdTeken() {
  var el = document.getElementById('kd-plek');
  if (!el) return;
  var focus = document.activeElement && document.activeElement.id;
  el.innerHTML = kdRolBegeleider() ? kdBegeleiderHtml() : kdOpdrachtgeverHtml();
  el.hidden = !el.innerHTML;
  if (focus) { var f = document.getElementById(focus); if (f) f.focus(); }
}
function kdMeld(soort, tekst) { KD.melding = { soort: soort, tekst: tekst }; }
function kdNa(r, okTekst) {
  KD.bezig = false;
  if (r.status === 200) { if (r.json.kandidaat) kdVervang(r.json.kandidaat); kdMeld('ok', okTekst); }
  else { if (r.json.actueel) kdVervang(r.json.actueel); kdMeld('fout', r.json.error || 'Dat lukte niet (HTTP ' + r.status + ').'); }
  kdVerversJourney();
  kdTeken();
}
// Na elke wijziging de journey opnieuw laden en tekenen (WF-D: geen handmatig te synchroniseren overzichten).
function kdVerversJourney() {
  if (typeof JR === 'undefined' || typeof jrMount !== 'function') return;
  JR.cache = {};
  ['jr-begeleider', 'jr-portaal'].forEach(function (id) { var el = document.getElementById(id); if (el) el.removeAttribute('data-jr-klaar'); });
  jrMount();
}
function kdKandidaat(id) { return ((KD.data && KD.data.kandidaten) || []).filter(function (k) { return k.id === id; })[0]; }
function kdLaadHistorie(id) {
  kdApi('GET', '/mna/kandidaten/historie?kandidaat=' + encodeURIComponent(id)).then(function (r) { KD.hist[id] = r.status === 200 ? (r.json.historie || []) : []; kdTeken(); });
}
function kdLaadDocs(klaar) {
  // Bewijs = het ondertekende NDA-bestand dat al in het dossier staat (de backend controleert dat het bij dit traject hoort).
  fetchMetTimeout(WORKER + '/mna/document/lijst/' + encodeURIComponent(S.code), { headers: kdHeaders(false), cache: 'no-store' }, 20000)
    .then(function (r) { return r.json(); }).then(function (docs) { KD.docs = Array.isArray(docs) ? docs.filter(function (x) { return !x.verwijderd; }) : []; klaar(); })
    .catch(function () { KD.docs = null; kdMeld('fout', 'Het documentoverzicht kon niet worden geladen. Er is niets gewijzigd.'); kdTeken(); });
}
function kdNdaKiesHtml(k) {
  if (!KD.docs) return '<div class="kd-sub">Documenten laden…</div>';
  if (!KD.docs.length) return '<div class="kd-melding kd-oranje-bg">Upload eerst het getekende NDA-bestand in het dossier; daarna kies je het hier als bewijs.</div>';
  return '<div class="kd-nda-kies"><label class="kd-sub" for="kd-nda-doc">Getekende NDA van ' + kdEsc(k.naam) + ' (uit het dossier)</label> <select id="kd-nda-doc">'
    + KD.docs.slice(0, 200).map(function (x) { return '<option value="' + kdEsc(x.id) + '">' + kdEsc(x.bestand_naam) + '</option>'; }).join('') + '</select> '
    + '<button type="button" class="btn btn-sm" data-kd-doe="nda-bevestig" data-kd-id="' + kdEsc(k.id) + '">Vastleggen</button> <button type="button" class="btn-ghost btn-sm" data-kd-doe="nda-annuleer">Annuleren</button></div>';
}
function kdKlik(e) {
  var t = e.target.closest('button,input[type=checkbox]');
  if (!t || KD.bezig) return;
  var a;
  if ((a = t.getAttribute('data-kd-tab'))) { KD.tab = a; KD.melding = null; kdTeken(); return; }
  if (t.id === 'kd-extern-ok') { var kn = document.querySelector('#kd-paneel [data-kd-doe="uitvoeren"]'); if (kn) kn.disabled = !t.checked || kn.getAttribute('data-n') === '0'; return; }
  if ((a = t.getAttribute('data-kd-sel'))) { KD.sel[a] = t.checked; KD.bulk = null; kdTeken(); return; }
  if ((a = t.getAttribute('data-kd-open'))) { KD.open[a] = !KD.open[a]; if (KD.open[a] && !KD.hist[a]) kdLaadHistorie(a); kdTeken(); return; }
  if ((a = t.getAttribute('data-kd-reg'))) {
    var k = kdKandidaat(t.getAttribute('data-kd-id')); if (!k) return;
    var g = a;
    var verder = function () {
      KD.bezig = true; t.disabled = true;
      kdApi('POST', '/mna/kandidaten/registreer', { kandidaat_id: k.id, gebeurtenis: g, rev: k.rev }).then(function (r) { delete KD.hist[k.id]; kdNa(r, k.naam + ': vastgelegd.'); if (KD.open[k.id]) kdLaadHistorie(k.id); });
    };
    if (g === 'nda_getekend') { KD.ndaKies = k.id; KD.docs = null; kdTeken(); kdLaadDocs(kdTeken); } else verder();
    return;
  }
  if ((a = t.getAttribute('data-kd-advies'))) {
    var ka = kdKandidaat(a); var ta = document.getElementById('kd-advies-' + a); if (!ka || !ta) return;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/bijwerken', { kandidaat_id: ka.id, rev: ka.rev, advies: ta.value }).then(function (r) {
      // Bij een versieconflict blijft je tekst staan; de actuele versie staat in de melding/rij.
      var bewaar = ta.value; kdNa(r, 'Advies opgeslagen.'); if (r.status !== 200) { var t2 = document.getElementById('kd-advies-' + a); if (t2) t2.value = bewaar; }
    });
    return;
  }
  if ((a = t.getAttribute('data-kd-besluit'))) {
    var kb = kdKandidaat(t.getAttribute('data-kd-id')); if (!kb) return;
    var uitk = a, reden = (document.getElementById('kd-reden-' + kb.id) || {}).value || '';
    if (!window.confirm((uitk === 'akkoord' ? 'Akkoord geven voor ' : 'Niet doorgaan met ') + kb.naam + '? Dit besluit wordt met datum vastgelegd en kan niet worden teruggedraaid.')) return;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/besluit', { kandidaat_id: kb.id, uitkomst: uitk, reden: reden }).then(function (r) {
      if (r.status === 409 && r.json.code === 'AL_BESLOTEN') { KD.bezig = false; kdMeld('fout', 'Over deze kandidaat is al besloten.'); kdLaad(kdTeken); return; }
      kdNa(r, 'Je besluit over ' + kb.naam + ' is vastgelegd.');
    });
    return;
  }
  a = t.getAttribute('data-kd-doe'); if (!a) return;
  if (a === 'nieuw') { KD.nieuw = true; kdTeken(); var f0 = document.querySelector('#kd-nieuw-form input[name=naam]'); if (f0) f0.focus(); return; }
  if (a === 'nieuw-annuleer') { KD.nieuw = false; kdTeken(); return; }
  if (a === 'bulk-sluit') { KD.bulk = null; kdTeken(); return; }
  if (a === 'nda-annuleer') { KD.ndaKies = null; kdTeken(); return; }
  if (a === 'vok') { if (typeof toonVOKPopup === 'function') toonVOKPopup(S._bgKey || S.code, function () { kdLaad(kdTeken); }); return; }
  if (a === 'verwijder') { KD.verwijder = t.getAttribute('data-kd-id'); kdTeken(); return; }
  if (a === 'verwijder-annuleer') { KD.verwijder = null; kdTeken(); return; }
  if (a === 'verwijder-bevestig') {
    var kv = kdKandidaat(t.getAttribute('data-kd-id')); if (!kv) return;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/verwijder', { kandidaat_id: kv.id }).then(function (r) {
      KD.verwijder = null;
      if (r.status === 200) { KD.data.kandidaten = (KD.data.kandidaten || []).filter(function (x) { return x.id !== kv.id; }); delete KD.sel[kv.id]; delete KD.open[kv.id]; delete KD.hist[kv.id]; }
      kdNa(r, kv.naam + ' is verwijderd, met historie en uitnodigingen.');
    });
    return;
  }
  if (a === 'nda-bevestig') {
    var kn = kdKandidaat(t.getAttribute('data-kd-id')), sel = document.getElementById('kd-nda-doc'); if (!kn || !sel) return;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/registreer', { kandidaat_id: kn.id, gebeurtenis: 'nda_getekend', rev: kn.rev, doc_id: sel.value }).then(function (r) { if (r.status === 200) KD.ndaKies = null; delete KD.hist[kn.id]; kdNa(r, kn.naam + ': NDA getekend vastgelegd, met bewijs.'); });
    return;
  }
  if (a === 'controle') {
    var ids = Object.keys(KD.sel).filter(function (id) { return KD.sel[id]; }), actie = document.getElementById('kd-bulk-actie').value;
    KD.bezig = true;
    kdApi('POST', '/mna/kandidaten/bulk/controle', { actie: actie, ids: ids }).then(function (r) {
      KD.bezig = false;
      if (r.status !== 200) { kdMeld('fout', r.json.error || 'Controle mislukt.'); kdTeken(); return; }
      KD.melding = null; KD.bulk = { actie: actie, ids: ids, plan: r.json.plan, extern: r.json.extern, idem: kdIdem() }; kdTeken();
    });
    return;
  }
  if (a === 'uitvoeren' || a === 'opnieuw') {
    var b = KD.bulk; if (!b) return;
    // Opnieuw = dezelfde idem: al verwerkte kandidaten worden door de backend overgeslagen, alleen mislukte gaan opnieuw.
    var lijst = a === 'opnieuw' ? b.resultaat.filter(function (p) { return p.status === 'mislukt'; }).map(function (p) { return p.id; }) : b.ids;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/bulk/uitvoeren', { actie: b.actie, ids: lijst, idem: b.idem, bevestigd_extern: !!b.extern }).then(function (r) {
      KD.bezig = false;
      if (r.status !== 200) { kdMeld('fout', r.json.error || 'Uitvoeren mislukt. Er is niets dubbel verwerkt; probeer het opnieuw.'); kdTeken(); return; }
      var vorig = b.resultaat ? b.resultaat.filter(function (p) { return lijst.indexOf(p.id) < 0; }) : [];
      b.resultaat = vorig.concat(r.json.resultaat || []); KD.sel = {}; KD.melding = null;
      kdVerversJourney();
      kdLaad(kdTeken);
    });
    return;
  }
  if (a === 'voorleggen' || a === 'terugtrekken') {
    if (a === 'voorleggen' && !window.confirm('Shortlist voorleggen aan de opdrachtgever? Die ziet daarna de kandidaten op de shortlist (zonder contactgegevens) en besluit per kandidaat.')) return;
    KD.bezig = true; t.disabled = true;
    kdApi('POST', '/mna/kandidaten/voorleggen', { rev: KD.data.cfg_rev, terugtrekken: a === 'terugtrekken' }).then(function (r) {
      KD.bezig = false;
      kdMeld(r.status === 200 ? 'ok' : 'fout', r.status === 200 ? (a === 'voorleggen' ? 'Shortlist voorgelegd.' : 'Shortlist teruggetrokken.') : (r.json.error || 'Dat lukte niet.'));
      kdVerversJourney();
      kdLaad(kdTeken);
    });
  }
}
function kdSubmit(e) {
  if (!e.target || e.target.id !== 'kd-nieuw-form') return;
  e.preventDefault();
  if (KD.bezig) return;
  var f = e.target, crit = {};
  KD_CRIT.forEach(function (c) { var v = f.elements['c_' + c[0]].value; if (v !== '') crit[c[0]] = Number(v); });
  var body = { naam: f.elements.naam.value, plaats: f.elements.plaats.value, omvang: f.elements.omvang.value, contact_naam: f.elements.contact_naam ? f.elements.contact_naam.value : '', email: f.elements.email ? f.elements.email.value : '', criteria: crit, bron: 'handmatig', idem: f.getAttribute('data-idem') || kdIdem() };
  f.setAttribute('data-idem', body.idem); // dubbelklik of opnieuw versturen maakt geen tweede kandidaat
  KD.bezig = true;
  kdApi('POST', '/mna/kandidaten/toevoegen', body).then(function (r) {
    if (r.status === 200) KD.nieuw = false;
    kdNa(r, body.naam + ' staat op de longlist.');
  });
}
// Journey-knoppen ('bg-tab-longlist', 'bg-tab-shortlist', 'verkoper-shortlist') openen dit paneel op de juiste tab.
function kdOpen(actie) {
  KD.tab = actie === 'bg-tab-shortlist' ? 'shortlist' : 'longlist';
  kdTeken();
  // Begeleider: Kandidaten is een eigen scherm (mna/24); niet meer naar een sectie verderop scrollen.
  if (typeof mtNaar === 'function' && typeof mtActief === 'function' && mtActief()) { mtNaar('kandidaten'); return true; }
  var el = document.getElementById('kd-plek');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}
function kdMount() {
  if (typeof S === 'undefined' || !S || !S.code || kdKoopmandaat()) return;
  var anker = null;
  if (kdRolBegeleider()) { var jb = document.getElementById('jr-begeleider'); anker = jb && (jb.closest('.panel') || jb); }
  else if (kdRolOpdrachtgever()) anker = document.getElementById('jr-portaal');
  if (!anker || document.getElementById('kd-plek')) return;
  var plek = document.createElement('div');
  plek.id = 'kd-plek'; plek.className = kdRolBegeleider() ? 'panel kd-plek' : 'kd-plek'; plek.hidden = true;
  anker.parentNode.insertBefore(plek, anker.nextSibling);
  plek.addEventListener('click', kdKlik); plek.addEventListener('submit', kdSubmit);
  if (KD.code !== S.code) { KD = { data: null, code: S.code, tab: 'longlist', open: {}, sel: {}, bulk: null, melding: null, bezig: false, hist: {} }; }
  if (kdRolBegeleider()) { plek.hidden = false; kdTeken(); }
  kdLaad(kdTeken);
}
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var app = document.getElementById('app'); if (!app) return;
  var gepland = false;
  new MutationObserver(function () { if (gepland) return; gepland = true; setTimeout(function () { gepland = false; kdMount(); }, 60); }).observe(app, { childList: true, subtree: true });
})();
