// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase F2 (28 okt 2026): transactievorm in de intake (fase Strategisch & markt).
// De verkoper legt de eigen voorkeur vast; de begeleider ziet die voorkeur alleen-lezen en legt een
// eigen advies plus maximaal vijf scenario's vast. Beide delen worden apart opgeslagen via
// /mna/transactiemodel/verkoper en /mna/transactiemodel/adviseur (worker/43), elk met basis_versie;
// bij een 409 (VERSIE_CONFLICT) blijft de eigen invoer staan. De koper ziet dit paneel nooit.

var TM_STRUCTUUR = [['share', 'Aandelentransactie', 'de aandelen van de vennootschap worden overgedragen'],
  ['asset', 'Activa-passivatransactie', 'de onderneming (bezittingen en verplichtingen) wordt overgedragen, de vennootschap blijft'],
  ['fusie', 'Fusie', 'samengaan met een andere onderneming'],
  ['anders', 'Anders', 'een andere vorm, toe te lichten'],
  ['onbekend', 'Nog onbekend', 'de vorm wordt later bepaald']];
var TM_OMVANG = [['volledig', 'Volledige overdracht (100%)'], ['minderheid', 'Minderheidsbelang'], ['gefaseerd', 'Gefaseerde overdracht']];
var TM_BETALING = [['direct', 'Direct bij overdracht'], ['earn_out', 'Earn-out (afhankelijk van toekomstige resultaten)'],
  ['vendor_loan', 'Vendor loan (lening van verkoper aan koper)'], ['gespreid', 'Gespreide betaling in termijnen']];
// #91 fase F: doel van het traject; bepaalt de terminologie van het memorandum (verkoop of fusie e.d.).
var TM_DOEL = [['verkoop', 'Verkoop van de onderneming'], ['fusie', 'Fusie met een andere organisatie'], ['gedeeltelijk', 'Overdracht van een deel (belang)'], ['onbekend', 'Nog niet bekend']];
var TM_ADVIES = [['bekend', 'Ik ben bekend met de mogelijkheden'], ['onbekend', 'Ik ben er nog niet mee bekend'], ['gewenst', 'Ik wil hierover advies']];
var TM_SCEN_GETAL = [['belang_pct', 'Verkocht belang %'], ['direct_pct', 'Direct %'], ['earn_out_pct', 'Earn-out %'], ['earn_out_jaren', 'Earn-out jaren'],
  ['vendor_loan_pct', 'Vendor loan %'], ['vendor_loan_rente_pct', 'Rente vendor loan %'], ['vendor_loan_jaren', 'Looptijd vendor loan (jaren)'],
  ['gespreid_pct', 'Gespreid %'], ['gespreid_jaren', 'Gespreid over jaren'], ['behouden_belang_pct', 'Behouden belang %']];

var TM = { scope: null, reqId: 0, status: 'idle', data: null, fout: null, melding: null, bezig: false, v: null, a: null, scen: null,
  dirty: false, code: null, key: null, soort: null, timer: null, opnieuw: false, lopend: null, conflict: false, gemeld: null };
// UAT-023.01 (2 nov 2026): de transactievorm had een eigen opslagknop buiten de algemene opslag om; wie de knop
// miste, verloor de invoer stil bij het verlaten van de fase (geen enkel record in productie). Nu: elke wijziging
// wordt kort daarna automatisch opgeslagen, direct bij verlaten van fase/scherm of tabblad, en onvolledige invoer
// geeft een zichtbare melding in plaats van stil verlies.
var TM_AUTO_MS = 1500;

function tmEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function tmIsObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function tmScopeKey() {
  var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null;
  return JSON.stringify([S.code || '', S.rol || '', S.screen || '', f ? f.id : '']);
}
function tmSyncScope() {
  var k = tmScopeKey();
  if (TM.scope !== k) { tmBewaarBijVerlaten(); TM.reqId++; TM.scope = k; TM.status = 'idle'; TM.data = null; TM.fout = null; TM.melding = null; TM.bezig = false; TM.v = null; TM.a = null; TM.scen = null; TM.dirty = false; TM.opnieuw = false; TM.conflict = false; TM.gemeld = null; }
  return k;
}
function tmMagLezen() { return !!S.code && (isVerkoper() || isTussen()); }
function tmVergrendeld() { return !!(S.traject && (S.traject.status === 'vergrendeld' || S.traject.status === 'afgesloten')); }
function tmLeegDeel() { return { doel: '', structuur: '', omvang: '', omvang_pct: '', betaling: [], advies: '', toelichting: '', motivering: '' }; }
function tmKopieDeel(d) {
  var x = tmLeegDeel();
  if (tmIsObj(d)) Object.keys(x).forEach(function (k) { if (d[k] !== undefined && d[k] !== null) x[k] = k === 'betaling' ? (Array.isArray(d[k]) ? d[k].slice() : []) : d[k]; });
  return x;
}
function tmLabel(lijst, w) { for (var i = 0; i < lijst.length; i++) if (lijst[i][0] === w) return lijst[i][1]; return ''; }

// Zelfde aanpak als mna/10: renderApp tekent alles opnieuw; ongeslagen DD-invoer in deze fase vasthouden.
function tmHerteken() {
  var f = (typeof FASES !== 'undefined' && FASES[S.fase]) || null;
  var bewaard = [];
  if (f && f.dataFields) f.dataFields.forEach(function (df) { var el = ge('df_' + df.id); if (el && typeof el.value === 'string') bewaard.push([df.id, el.value]); });
  renderApp();
  bewaard.forEach(function (b) { var el = ge('df_' + b[0]); if (el && el.value !== b[1]) el.value = b[1]; });
}

function tmNeemOver(d) {
  TM.data = d; TM.dirty = false; TM.conflict = false; TM.gemeld = null; TM.code = S.code; TM.key = S._bgKey || ''; TM.soort = tmEigenSoort();
  TM.v = tmKopieDeel(d.verkoper);
  TM.a = tmKopieDeel(d.adviseur);
  TM.scen = Array.isArray(d.scenarios) ? d.scenarios.map(function (s) { var c = {}; Object.keys(s).forEach(function (k) { c[k] = s[k]; }); return c; }) : [];
}
function tmGeldigeStaat(d) {
  return tmIsObj(d) && typeof d.versie === 'number' && (d.verkoper === null || tmIsObj(d.verkoper))
    && (d.adviseur === null || tmIsObj(d.adviseur)) && (d.scenarios === null || Array.isArray(d.scenarios));
}
function tmGeldigeDto(d) { return tmIsObj(d) && d.ok === true && tmGeldigeStaat(d); }
function tmLaad() {
  var scope = tmSyncScope();
  if (!tmMagLezen() || TM.status === 'laden') return Promise.resolve();
  var id = ++TM.reqId;
  TM.status = 'laden'; TM.fout = null;
  return fetchMetTimeout(WORKER + '/mna/transactiemodel?code=' + encodeURIComponent(S.code), { method: 'GET', headers: { 'x-tussen-key': S._bgKey || '' } }, 30000)
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }, function () { return { status: r.status, d: null }; }); },
      function () { return { status: 0, d: null }; })
    .then(function (x) {
      if (TM.reqId !== id || tmScopeKey() !== scope) return;
      if (x.status === 200 && tmGeldigeDto(x.d)) { TM.status = 'ok'; tmNeemOver(x.d); }
      else { TM.status = 'fout'; TM.fout = x.status === 0 ? 'Geen verbinding met de server. De transactievorm is niet geladen.' : 'De transactievorm kon niet worden geladen (HTTP ' + x.status + ').'; }
      tmHerteken();
    });
}
// Voor het dealvoorstel (mna/04): actueel model ophalen zonder het scherm te hertekenen. Geeft null bij
// een fout of als er niets is vastgelegd; nooit een gegokt model.
function tmHaalModel() {
  if (!S.code || !isTussen()) return Promise.resolve(null);
  return fetchMetTimeout(WORKER + '/mna/transactiemodel?code=' + encodeURIComponent(S.code), { method: 'GET', headers: { 'x-tussen-key': S._bgKey || '' } }, 30000)
    .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { return tmGeldigeDto(d) ? d : null; }, function () { return null; });
}

function tmDeelNaarBody(d, metMotivering) {
  var b = { structuur: d.structuur, omvang: d.omvang, betaling: d.betaling.slice(), advies: d.advies };
  if (d.doel) b.doel = d.doel;
  if ((d.omvang === 'minderheid' || d.omvang === 'gefaseerd') && d.omvang_pct !== '') b.omvang_pct = Number(d.omvang_pct);
  if (String(d.toelichting || '').trim()) b.toelichting = String(d.toelichting).trim();
  if (metMotivering && String(d.motivering || '').trim()) b.motivering = String(d.motivering).trim();
  return b;
}
function tmControleerDeel(d) {
  if (!d.structuur || !d.omvang || !d.advies) return 'Kies een structuur, een omvang en of u advies wenst.';
  if (!d.betaling.length) return 'Kies minimaal één betalingsvorm.';
  if (d.omvang !== 'volledig') { var p = Number(d.omvang_pct); if (d.omvang_pct === '' || !isFinite(p) || p < 1 || p > 100) return 'Vul het percentage van het belang in (1 tot en met 100).'; }
  return null;
}
function tmControleerScenarios(lijst) {
  if (lijst.length > 5) return 'Maximaal vijf scenario\'s.';
  for (var i = 0; i < lijst.length; i++) {
    var s = lijst[i], n = 'Scenario ' + (i + 1) + ': ';
    if (!String(s.naam || '').trim()) return n + 'geef het scenario een naam.';
    if (!s.structuur) return n + 'kies een structuur.';
    for (var j = 0; j < TM_SCEN_GETAL.length; j++) { var k = TM_SCEN_GETAL[j][0]; if (s[k] === '' || s[k] === undefined || !isFinite(Number(s[k]))) return n + 'vul "' + TM_SCEN_GETAL[j][1] + '" in (0 als het niet van toepassing is).'; }
    var som = Number(s.direct_pct) + Number(s.earn_out_pct) + Number(s.vendor_loan_pct) + Number(s.gespreid_pct);
    if (Math.abs(som - 100) > 0.01) return n + 'direct, earn-out, vendor loan en gespreid moeten samen 100% zijn (nu ' + (Math.round(som * 100) / 100) + '%).';
    if (Number(s.belang_pct) < 1 || Number(s.belang_pct) > 100) return n + 'het verkochte belang ligt tussen 1 en 100%.';
    if (Number(s.belang_pct) + Number(s.behouden_belang_pct) > 100) return n + 'verkocht en behouden belang samen mogen niet boven 100% uitkomen.';
  }
  return null;
}
function tmScenarioBody(s) {
  var b = { naam: String(s.naam).trim().slice(0, 80), structuur: s.structuur, herkomst: 'adviseur' };
  TM_SCEN_GETAL.forEach(function (g) { b[g[0]] = Number(s[g[0]]); });
  return b;
}

function tmEigenSoort() { return isVerkoper() ? 'verkoper' : 'adviseur'; }
function tmBodyVoor(soort, basis) {
  return soort === 'verkoper'
    ? { code: TM.code, verkoper: tmDeelNaarBody(TM.v, false), basis_versie: basis }
    : { code: TM.code, adviseur: tmDeelNaarBody(TM.a, true), scenarios: TM.scen.map(tmScenarioBody), basis_versie: basis };
}
function tmFoutVoor(soort) { return soort === 'verkoper' ? tmControleerDeel(TM.v) : (tmControleerDeel(TM.a) || tmControleerScenarios(TM.scen)); }
function tmEigenDeel(d, soort) { return soort === 'verkoper' ? JSON.stringify(d && d.verkoper) : JSON.stringify([d && d.adviseur, d && d.scenarios]); }
function tmPost(soort, body, key, keepalive) {
  return fetchMetTimeout(WORKER + '/mna/transactiemodel/' + soort, { method: 'POST', keepalive: !!keepalive, headers: { 'Content-Type': 'application/json', 'x-tussen-key': key || '' }, body: JSON.stringify(body) }, 30000)
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }, function () { return { status: r.status, d: null }; }); },
      function () { return { status: 0, d: null }; });
}
// Versturen op de versie van basis; bij een 409 waarin alleen de andere rol intussen opsloeg (eigen deel gelijk
// aan basis) eenmalig opnieuw op de nieuwe versie, want elke rol schrijft uitsluitend de eigen kolommen (worker/43).
function tmPostMetHerbasis(soort, body, basis, key, keepalive) {
  body.basis_versie = basis.versie;
  return tmPost(soort, body, key, keepalive).then(function (x) {
    if (x.status === 409 && tmIsObj(x.d) && tmGeldigeStaat(x.d.actueel) && tmEigenDeel(x.d.actueel, soort) === tmEigenDeel(basis, soort)) {
      body.basis_versie = x.d.actueel.versie;
      return tmPost(soort, body, key, keepalive);
    }
    return x;
  });
}
function tmTypt() { var a = typeof document !== 'undefined' && document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); }
// handmatig: knop (toont validatiefouten); anders automatisch (stil zolang de invoer nog onvolledig is).
// Na een echt versieconflict (TM.conflict) nooit automatisch doorschrijven: alleen de knop slaat dan op.
function tmBewaar(soort, handmatig) {
  if (TM.status !== 'ok' || tmVergrendeld()) return;
  if (TM.conflict && !handmatig) return;
  if (TM.bezig) { TM.opnieuw = true; return; }
  var fout = tmFoutVoor(soort);
  if (fout) { if (handmatig) { TM.melding = { soort: 'fout', tekst: fout }; tmHerteken(); } return; }
  var scope = tmScopeKey(), ingediend = JSON.stringify(soort === 'verkoper' ? TM.v : [TM.a, TM.scen]);
  TM.bezig = true; TM.opnieuw = false; if (handmatig) { TM.conflict = false; TM.melding = null; tmHerteken(); }
  // Heeft een verzending bij verlaten het intussen overgenomen (TM.lopend vervangen), dan regelt die de staat.
  var p = TM.lopend = tmPostMetHerbasis(soort, tmBodyVoor(soort, null), TM.data, TM.key, false).then(function (x) {
    if (tmScopeKey() !== scope || TM.lopend !== p) return x;
    TM.bezig = false;
    if (x.status === 200 && tmGeldigeDto(x.d)) {
      TM.data = x.d;
      var nogGelijk = ingediend === JSON.stringify(soort === 'verkoper' ? TM.v : [TM.a, TM.scen]);
      TM.dirty = !nogGelijk;
      TM.melding = { soort: 'ok', tekst: 'Opgeslagen.' };
    } else if (x.status === 409 && tmIsObj(x.d) && tmGeldigeStaat(x.d.actueel)) {
      TM.data = x.d.actueel; TM.conflict = true;
      TM.melding = { soort: 'fout', conflict: true, tekst: 'Iemand anders heeft de transactievorm intussen gewijzigd. Uw invoer staat nog in het formulier; de opgeslagen versie ziet u hieronder. Controleer en sla opnieuw op.' };
    } else {
      TM.melding = { soort: 'fout', tekst: x.status === 0 ? 'Geen verbinding met de server; de transactievorm is niet opgeslagen. Uw invoer staat nog in het formulier.' : (tmIsObj(x.d) && typeof x.d.error === 'string' ? x.d.error : 'Opslaan is niet gelukt (HTTP ' + x.status + ').') };
    }
    // Zelfde regel als de algemene opslag (mna/02): na een geslaagde automatische opslag niet hertekenen midden
    // in het typen (focus en cursor blijven staan); een conflict of fout wordt wel direct getoond.
    if (handmatig || x.status !== 200 || !tmTypt()) tmHerteken();
    if (TM.opnieuw && TM.dirty) { TM.opnieuw = false; tmBewaar(soort, false); }
    return x;
  });
}
function tmPlanAuto() {
  TM.dirty = true;
  if (TM.timer) clearTimeout(TM.timer);
  TM.timer = setTimeout(function () { TM.timer = null; if (TM.dirty && TM.soort) tmBewaar(TM.soort, false); }, TM_AUTO_MS);
}
// Verlaten van fase/scherm of tabblad: niet-opgeslagen invoer direct versturen (keepalive), of melden.
// Rol, code, sleutel en invoer horen bij het geladen dossier; een lopende automatische opslag wordt eerst afgewacht.
// tabblad: alleen verborgen; dezelfde melding over dezelfde invoer dan niet bij elk verbergen opnieuw.
function tmBewaarBijVerlaten(tabblad) {
  if (TM.timer) { clearTimeout(TM.timer); TM.timer = null; }
  if (!TM.dirty || TM.status !== 'ok' || !TM.data || !TM.code || !TM.soort || tmVergrendeld()) return;
  var soort = TM.soort, fout = tmFoutVoor(soort), ink = JSON.stringify(soort === 'verkoper' ? TM.v : [TM.a, TM.scen]);
  var stil = !!tabblad && TM.gemeld === ink; TM.gemeld = ink;
  if (fout) { if (!stil && typeof showAlert === 'function') showAlert('De transactievorm is niet opgeslagen omdat de invoer nog onvolledig is: ' + fout + ' Ga terug naar Strategisch & markt om dit aan te vullen.'); return; }
  // Echt versieconflict: nooit over de wijziging van de ander heen schrijven; melden en de keuze bij de knop laten.
  if (TM.conflict) { if (!stil && typeof showAlert === 'function') showAlert('De transactievorm is niet opgeslagen omdat iemand anders hem intussen heeft gewijzigd. Open Strategisch & markt, controleer de opgeslagen versie en sla op met de knop.'); return; }
  var scope = TM.scope, body = tmBodyVoor(soort, null), basis = TM.data, key = TM.key, wacht = TM.bezig && TM.lopend ? TM.lopend : null;
  var stuur = function (vorige) {
    if (vorige && vorige.status === 409) return vorige; // lopende opslag liep op een echt conflict: niet doorschrijven
    if (vorige && vorige.status === 200 && tmGeldigeDto(vorige.d)) basis = vorige.d;
    return tmPostMetHerbasis(soort, body, basis, key, true);
  };
  TM.dirty = false; TM.bezig = true; TM.opnieuw = false;
  TM.lopend = (wacht ? wacht.then(stuur) : stuur(null)).then(function (x) {
    var zelfde = TM.scope === scope && tmScopeKey() === scope;
    if (zelfde) {
      TM.bezig = false;
      if (x.status === 200 && tmGeldigeDto(x.d)) TM.data = x.d;
      else if (x.status === 409 && tmIsObj(x.d) && tmGeldigeStaat(x.d.actueel)) {
        TM.dirty = true; TM.data = x.d.actueel; TM.conflict = true;
        TM.melding = { soort: 'fout', conflict: true, tekst: 'Iemand anders heeft de transactievorm intussen gewijzigd. Uw invoer staat nog in het formulier; de opgeslagen versie ziet u hieronder. Controleer en sla opnieuw op.' };
      } else { TM.dirty = true; TM.data = basis; }
    }
    if (x.status !== 200 && typeof showAlert === 'function') showAlert('De transactievorm kon niet worden opgeslagen' + (tmIsObj(x.d) && typeof x.d.error === 'string' ? ': ' + x.d.error : '') + '. Open Strategisch & markt opnieuw en controleer de invoer.');
    if (zelfde && TM.opnieuw && TM.dirty) { TM.opnieuw = false; tmBewaar(soort, false); }
    return x;
  });
}
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', function () { if (document.hidden) tmBewaarBijVerlaten(true); });
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', function () { tmBewaarBijVerlaten(); });
// Elke schermwissel (ook naar samenvatting, dataroom, logboek of handleiding, waar het paneel niet wordt getekend)
// loopt via renderApp: eerst de scope bijwerken, zodat verlaten altijd bewaart of meldt (zelfde aanpak als mna/07).
if (typeof renderApp === 'function') { var _tmOrigRenderApp = renderApp; renderApp = function () { tmSyncScope(); _tmOrigRenderApp(); }; }

// ── Invoerhandlers (alleen de conceptstaat bijwerken, niets opslaan) ─────────────────────────
window.tmZet = function (soort, veld, waarde) { var d = soort === 'verkoper' ? TM.v : TM.a; if (!d) return; d[veld] = waarde; tmPlanAuto(); if (veld === 'omvang') tmHerteken(); };
window.tmBetaling = function (soort, w, aan) { var d = soort === 'verkoper' ? TM.v : TM.a; if (!d) return; var i = d.betaling.indexOf(w); if (aan && i < 0) d.betaling.push(w); if (!aan && i >= 0) d.betaling.splice(i, 1); tmPlanAuto(); };
window.tmScenZet = function (i, veld, waarde) { if (TM.scen && TM.scen[i]) { TM.scen[i][veld] = waarde; tmPlanAuto(); } };
window.tmScenNieuw = function () { if (!TM.scen || TM.scen.length >= 5) return; var s = { naam: '', structuur: 'share' }; TM_SCEN_GETAL.forEach(function (g) { s[g[0]] = ''; }); TM.scen.push(s); TM.dirty = true; tmHerteken(); };
window.tmScenWeg = function (i) { if (TM.scen) { TM.scen.splice(i, 1); tmPlanAuto(); tmHerteken(); } };
window.tmBewaarVerkoper = function () { if (TM.timer) { clearTimeout(TM.timer); TM.timer = null; } tmBewaar('verkoper', true); };
window.tmBewaarAdviseur = function () { if (TM.timer) { clearTimeout(TM.timer); TM.timer = null; } tmBewaar('adviseur', true); };
window.tmLaadOpnieuw = function () { TM.status = 'idle'; tmLaad(); };

// ── Weergave ───────────────────────────────────────────────────────────────────────────
function tmFormulier(soort, d, dis) {
  var stijl = 'width:100%;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:7px 9px;font-size:12px;color:var(--sub)';
  var radio = function (veld, lijst) {
    return lijst.map(function (o) {
      return '<label style="display:block;font-size:12px;margin:2px 0"><input type="radio" name="tm-' + soort + '-' + veld + '" value="' + tmEsc(o[0]) + '"'
        + (d[veld] === o[0] ? ' checked' : '') + dis + ' onchange="tmZet(\'' + soort + '\',\'' + veld + '\',this.value)"> ' + tmEsc(o[1])
        + (o[2] ? ' <span style="color:var(--muted)">(' + tmEsc(o[2]) + ')</span>' : '') + '</label>';
    }).join('');
  };
  var kop = function (t) { return '<div style="font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:.6rem 0 .2rem">' + t + '</div>'; };
  var h = kop('Doel van het traject') + radio('doel', TM_DOEL)
    + kop('Juridische structuur') + radio('structuur', TM_STRUCTUUR)
    + kop('Omvang') + radio('omvang', TM_OMVANG);
  if (d.omvang === 'minderheid' || d.omvang === 'gefaseerd') {
    h += '<label style="font-size:12px;display:block;margin-top:4px">Percentage van het belang dat wordt overgedragen (eerste stap bij gefaseerd)'
      + '<input type="number" min="1" max="100" step="0.01" style="' + stijl + ';max-width:140px;display:block" value="' + tmEsc(d.omvang_pct) + '"' + dis
      + ' oninput="tmZet(\'' + soort + '\',\'omvang_pct\',this.value)"></label>';
  }
  h += kop('Betaling (meerdere keuzes mogelijk)') + TM_BETALING.map(function (o) {
    return '<label style="display:block;font-size:12px;margin:2px 0"><input type="checkbox"' + (d.betaling.indexOf(o[0]) >= 0 ? ' checked' : '') + dis
      + ' onchange="tmBetaling(\'' + soort + '\',\'' + o[0] + '\',this.checked)"> ' + tmEsc(o[1]) + '</label>';
  }).join('')
    + kop(soort === 'verkoper' ? 'Advies' : 'Bekendheid van de verkoper met de mogelijkheden') + radio('advies', TM_ADVIES)
    + '<label style="font-size:12px;display:block;margin-top:.5rem">Toelichting (optioneel, max. 1000 tekens)<textarea maxlength="1000" style="' + stijl + ';min-height:52px;resize:vertical"' + dis
    + ' oninput="tmZet(\'' + soort + '\',\'toelichting\',this.value)">' + tmEsc(d.toelichting) + '</textarea></label>';
  if (soort === 'adviseur') {
    h += '<label style="font-size:12px;display:block;margin-top:.5rem">Motivering van het advies (optioneel, max. 2000 tekens)<textarea maxlength="2000" style="' + stijl + ';min-height:52px;resize:vertical"' + dis
      + ' oninput="tmZet(\'adviseur\',\'motivering\',this.value)">' + tmEsc(d.motivering) + '</textarea></label>';
  }
  return h;
}
function tmSamenvatting(d) {
  if (!tmIsObj(d) || !d.structuur) return '<div style="font-size:12px;color:var(--muted)">De verkoper heeft nog geen voorkeur vastgelegd.</div>';
  var omv = tmLabel(TM_OMVANG, d.omvang) + (d.omvang_pct !== undefined && d.omvang !== 'volledig' ? ' (' + tmEsc(d.omvang_pct) + '%)' : '');
  var bet = (Array.isArray(d.betaling) ? d.betaling : []).map(function (b) { return tmLabel(TM_BETALING, b); }).join(', ');
  return '<div style="font-size:12px;line-height:1.7;color:var(--sub)">'
    + (d.doel ? '<div>Doel: <strong>' + tmEsc(tmLabel(TM_DOEL, d.doel)) + '</strong></div>' : '')
    + '<div>Structuur: <strong>' + tmEsc(tmLabel(TM_STRUCTUUR, d.structuur)) + '</strong></div>'
    + '<div>Omvang: <strong>' + omv + '</strong></div>'
    + '<div>Betaling: <strong>' + tmEsc(bet) + '</strong></div>'
    + '<div>Advies: <strong>' + tmEsc(tmLabel(TM_ADVIES, d.advies)) + '</strong></div>'
    + (d.toelichting ? '<div>Toelichting: ' + tmEsc(d.toelichting) + '</div>' : '') + '</div>';
}
function tmScenarioTabel(dis) {
  var stijl = 'width:100%;min-width:64px;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:4px 6px;font-size:12px;color:var(--sub)';
  var rijen = TM.scen.map(function (s, i) {
    var cel = function (inh) { return '<td style="padding:3px 4px;vertical-align:top">' + inh + '</td>'; };
    return '<tr>' + cel('<input type="text" maxlength="80" style="' + stijl + ';min-width:120px" value="' + tmEsc(s.naam) + '"' + dis + ' oninput="tmScenZet(' + i + ',\'naam\',this.value)">')
      + cel('<select style="' + stijl + '"' + dis + ' onchange="tmScenZet(' + i + ',\'structuur\',this.value)">' + TM_STRUCTUUR.map(function (o) { return '<option value="' + o[0] + '"' + (s.structuur === o[0] ? ' selected' : '') + '>' + tmEsc(o[1]) + '</option>'; }).join('') + '</select>')
      + TM_SCEN_GETAL.map(function (g) { return cel('<input type="number" step="0.01" style="' + stijl + '" value="' + tmEsc(s[g[0]]) + '"' + dis + ' oninput="tmScenZet(' + i + ',\'' + g[0] + '\',this.value)">'); }).join('')
      + cel(dis ? '' : '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="tmScenWeg(' + i + ')">Verwijderen</button>') + '</tr>';
  }).join('');
  return '<div style="overflow-x:auto;margin-top:.5rem"><table style="border-collapse:collapse;font-size:11px"><thead><tr>'
    + '<th style="text-align:left;padding:3px 4px">Naam</th><th style="text-align:left;padding:3px 4px">Structuur</th>'
    + TM_SCEN_GETAL.map(function (g) { return '<th style="text-align:left;padding:3px 4px">' + tmEsc(g[1]) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' + rijen + '</tbody></table></div>'
    + (dis || TM.scen.length >= 5 ? '' : '<button class="btn-ghost btn-sm" style="font-size:11px;margin-top:.4rem" onclick="tmScenNieuw()">Scenario toevoegen</button>')
    + '<div style="font-size:11px;color:var(--muted);margin-top:.3rem">Direct, earn-out, vendor loan en gespreid zijn percentages van de koopprijs van het verkochte belang en tellen samen op tot 100%. In het dealvoorstel worden de scenario\'s doorgerekend vanaf de ondernemingswaarde naar aandelenwaarde en opbrengst.</div>';
}
function renderTransactiemodel(faseId) {
  tmSyncScope();
  if (faseId !== 'strategisch' || !tmMagLezen()) return '';
  if (TM.status === 'idle') setTimeout(tmLaad, 0);
  var dis = (TM.bezig || tmVergrendeld()) ? ' disabled' : '';
  var html = '<div class="panel" id="tm-panel" style="margin-bottom:1rem">'
    + '<div class="sec-hdr" style="margin:0">&#129309; ' + (isVerkoper() ? 'Gewenste transactievorm' : 'Transactievorm en scenario\'s') + '</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">'
    + (isVerkoper() ? 'Geef aan hoe u de overdracht voor zich ziet. Twijfelt u, kies dan "Nog onbekend" of geef aan dat u advies wenst; uw adviseur bespreekt de mogelijkheden met u.'
      : 'De voorkeur van de verkoper blijft altijd zichtbaar zoals vastgelegd. Uw advies en scenario\'s worden apart opgeslagen.')
    + ' Wijzigingen worden automatisch opgeslagen.</div>';
  if (TM.melding) html += '<div style="font-size:12px;line-height:1.6;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid '
    + (TM.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + tmEsc(TM.melding.tekst) + '</div>';
  if (TM.status === 'idle' || TM.status === 'laden') return html + '<div style="font-size:12px;color:var(--muted);font-style:italic">Transactievorm laden…</div></div>';
  if (TM.status === 'fout') return html + '<div style="font-size:12px;color:var(--red)">&#9888; ' + tmEsc(TM.fout) + ' <button class="btn-ghost btn-sm" style="font-size:11px" onclick="tmLaadOpnieuw()">Opnieuw laden</button></div></div>';
  if (isVerkoper()) {
    if (TM.melding && TM.melding.conflict) html += '<div style="font-size:11px;font-weight:600;color:var(--muted);margin:.3rem 0">Opgeslagen versie</div>' + tmSamenvatting(TM.data.verkoper);
    html += tmFormulier('verkoper', TM.v, dis)
      + '<div style="margin-top:.6rem"><button class="btn btn-sm" style="font-size:11px" onclick="tmBewaarVerkoper()"' + dis + '>' + (TM.bezig ? 'Bezig met opslaan…' : 'Transactievorm opslaan') + '</button></div>';
  } else {
    html += '<div style="font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:.3rem 0">Oorspronkelijke voorkeur verkoper</div>'
      + tmSamenvatting(TM.data.verkoper)
      + '<div style="border-top:1px solid var(--border);margin:.75rem 0 .25rem"></div>'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">Advies adviseur</div>'
      + (TM.melding && TM.melding.conflict ? '<div style="font-size:11px;color:var(--muted);margin:.3rem 0">Opgeslagen advies:</div>' + tmSamenvatting(TM.data.adviseur) + '<div style="font-size:11px;color:var(--muted)">Opgeslagen scenario\'s: ' + (Array.isArray(TM.data.scenarios) ? TM.data.scenarios.length : 0) + '</div>' : '')
      + tmFormulier('adviseur', TM.a, dis)
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-top:.75rem">Scenario\'s (max. 5)</div>'
      + tmScenarioTabel(dis)
      + '<div style="margin-top:.6rem"><button class="btn btn-sm" style="font-size:11px" onclick="tmBewaarAdviseur()"' + dis + '>' + (TM.bezig ? 'Bezig met opslaan…' : 'Advies en scenario\'s opslaan') + '</button></div>';
  }
  return html + '</div>';
}
