// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-015 fase A (GO Marcel): Quick Visit, een bezoekverslag binnen een minuut na het gesprek.
// Eén scherm, grote knoppen, alleen relatie en type gesprek verplicht. Het verslag komt in de bestaande relatiehistorie
// (CRM), vervolgacties in de bestaande werkruimte-acties of als CRM-taak (backend worker/70). Dit bestand toont en roept aan.
// Nooit kwijt: elke wijziging staat direct lokaal op dit apparaat en wordt ook als concept op de server bewaard. Opslaan
// gebruikt een vaste sleutel per verslag, zodat opnieuw proberen na een netwerkfout nooit een dubbel verslag oplevert.
// Twee ingangen met dezelfde code: 'crm' (adviseursportaal, sessie, relatie in de kantoor-CRM) en 'traject' (mna.html,
// begeleider met tussencode, verslag in het gesprekslogboek van het mandaat). Fase B: een AI-voorstel uit de getypte
// tekst met een bevestigingsscherm; inspreken verschijnt pas als er een dienst is gekozen (transcriptie.beschikbaar).
// Fase C: briefing per relatie, relatiegegevens bijwerken met conflictkeuze, kans in de pijplijn, overzicht op het dashboard.
var BV = null;
var BV_LOKAAL = 'kvm-bezoek-concepten-v2:';
var BV_WACHT = [1000, 3000];
var BV_NA_OPSLAAN = null; // optionele callback van de host (bijv. mna.html ververst het gesprekslogboek)

function bvEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function bvSleutel() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'bv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
function bvTraject() { return !!(BV && BV.opts && BV.opts.modus === 'traject'); }
function bvPad(soort) {
  if (bvTraject()) { var c = encodeURIComponent(BV.opts.code); return { context: '/mna/bezoek/context/' + c, opslaan: '/mna/bezoek/opslaan/' + c, voorstel: '/mna/bezoek/voorstel/' + c }[soort]; }
  return { context: '/gebruikers/crm/bezoek/context', opslaan: '/gebruikers/crm/bezoek', voorstel: '/gebruikers/crm/bezoek/voorstel', concept: '/gebruikers/crm/bezoek/concept' }[soort];
}
function bvVensterActueel(venster) {
  if (!venster || BV !== venster) return false;
  if (venster.opts.modus !== 'traject') return venster.crmToken === G.token;
  return typeof S !== 'undefined' && S === venster.trajectSessie && S.traject
    && S.traject.id === venster.opts.code && (S._bgKey || S.code || '') === venster.opts.sleutel;
}
function bvApi(methode, pad, body, timeout) {
  if (!bvVensterActueel(BV)) return Promise.resolve({ status: 401, json: { error: 'Open het bezoekverslag opnieuw vanuit je huidige sessie.' } });
  var opts = { method: methode, headers: bvTraject() ? { 'x-tussen-key': BV.opts.sleutel || '' } : { 'x-gebruiker-token': G.token }, cache: 'no-store' };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetchMetTimeout(WORKER + pad, opts, timeout || 20000).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j || {} }; }); })
    .catch(function () { return { status: 0, json: { error: 'Geen verbinding.' } }; });
}
function bvNuLokaal() { var d = new Date(); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

// ── Lokale opslag (fallback bij netwerkstoring). Alles in try/catch: privévenster of geblokkeerde opslag mag niets breken. ──
async function bvConceptVak(venster, ctx) {
  if (venster.opts.modus !== 'traject') {
    var g = ctx.gebruiker;
    return g && g.id && g.kantoor_id ? BV_LOKAAL + JSON.stringify(['crm', WORKER, g.kantoor_id, g.id]) : null;
  }
  // Alleen een door de server bevestigd mandaat met deze begeleiderssessie kan een lokaal concept openen.
  if (!ctx.traject || !ctx.traject.id || !venster.opts.sleutel || !window.crypto || !window.crypto.subtle) return null;
  try {
    var bron = new TextEncoder().encode(JSON.stringify([WORKER, ctx.traject.id, venster.opts.sleutel]));
    var hash = new Uint8Array(await window.crypto.subtle.digest('SHA-256', bron));
    return BV_LOKAAL + 'traject:' + Array.from(hash, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  } catch (e) { return null; }
}
function bvLokaalLees(vak) { if (!vak) return {}; try { var x = JSON.parse(window.localStorage.getItem(vak) || '{}'); return x && typeof x === 'object' ? x : {}; } catch (e) { return {}; } }
function bvLokaalBewaar(f, vak) { if (!vak) return false; try { var x = bvLokaalLees(vak); x[f.sleutel] = { f: f, op: Date.now() }; window.localStorage.setItem(vak, JSON.stringify(x)); return true; } catch (e) { return false; } }
function bvLokaalWis(sleutel, vak) { if (!vak) return; try { var x = bvLokaalLees(vak); delete x[sleutel]; window.localStorage.setItem(vak, JSON.stringify(x)); } catch (e) { /* niets */ } }

function bvLeegFormulier(vooraf, opts) {
  vooraf = vooraf || {}; opts = opts || {};
  return { modus: opts.modus === 'traject' ? 'traject' : 'crm', deelnemers: '', kans: { actie: '', type: '', fase: '', opportunity_id: '' }, profiel: { plaats: '', sector: '', kvk_nummer: '' }, profiel_bevestigd: [],
    sleutel: bvSleutel(), organisatie_id: vooraf.organisatie_id || '', organisatie_naam: vooraf.organisatie_naam || '', zoek: vooraf.zoek || '', nieuw: null,
    contactpersoon_ids: [], nieuw_contact: { naam: '', functie: '', email: '', telefoon: '' }, traject_id: vooraf.traject_id || '', gesprek_type: '', perspectief: '', resultaat: '',
    gesprek_op: bvNuLokaal(), tekst: '', prive: false, vervolgacties: [] };
}

// Pure functie: wat er naar de server gaat. Lege velden gaan niet mee; nooit gokken (geen standaardresultaat).
function bvPayload(f, negeer) {
  if (f.modus === 'traject') {
    var bt = { sleutel: f.sleutel, gesprek_type: f.gesprek_type, perspectief: f.perspectief || null, resultaat: f.resultaat || null, tekst: f.tekst || '', deelnemers: (f.deelnemers || '').trim() };
    var tt = f.gesprek_op ? Date.parse(f.gesprek_op) : NaN; if (!isNaN(tt)) bt.gesprek_op = tt;
    bt.vervolgacties = (f.vervolgacties || []).filter(function (a) { return a.soort; }).map(function (a) { return { soort: a.soort, omschrijving: a.omschrijving || '', eigenaar_id: a.eigenaar_id || null, deadline: a.deadline || null }; });
    return bt;
  }
  var b = { sleutel: f.sleutel, gesprek_type: f.gesprek_type, perspectief: f.perspectief || null, resultaat: f.resultaat || null, tekst: f.tekst || '', zichtbaarheid: f.prive ? 'privé' : 'kantoor' };
  var t = f.gesprek_op ? Date.parse(f.gesprek_op) : NaN; if (!isNaN(t)) b.gesprek_op = t;
  if (f.organisatie_id) { b.organisatie_id = f.organisatie_id; b.contactpersoon_ids = (f.contactpersoon_ids || []).slice(); }
  else if (f.nieuw) b.nieuwe_organisatie = { naam: (f.nieuw.naam || '').trim(), plaats: (f.nieuw.plaats || '').trim(), kvk_nummer: (f.nieuw.kvk_nummer || '').trim() };
  if (f.nieuw_contact && (f.nieuw_contact.naam || '').trim()) b.nieuwe_contacten = [{ naam: f.nieuw_contact.naam.trim(), functie: (f.nieuw_contact.functie || '').trim(), email: (f.nieuw_contact.email || '').trim(), telefoon: (f.nieuw_contact.telefoon || '').trim() }];
  if (f.traject_id) b.traject_id = f.traject_id;
  b.vervolgacties = (f.vervolgacties || []).filter(function (a) { return a.soort; }).map(function (a) { return { soort: a.soort, omschrijving: a.omschrijving || '', eigenaar_id: a.eigenaar_id || null, deadline: a.deadline || null }; });
  if (f.organisatie_id && f.profiel) {
    var pr = {}; ['plaats', 'sector', 'kvk_nummer'].forEach(function (k) { var w = (f.profiel[k] || '').trim(); if (w) pr[k] = w; });
    if (Object.keys(pr).length) { b.profiel = pr; if ((f.profiel_bevestigd || []).length) b.profiel_bevestigd = f.profiel_bevestigd.slice(); }
  }
  if (f.kans && f.kans.actie === 'nieuw' && f.kans.type) b.kans = { actie: 'nieuw', type: f.kans.type, fase: f.kans.fase || 'nieuw' };
  else if (f.kans && f.kans.actie === 'fase' && f.organisatie_id && f.kans.opportunity_id && f.kans.fase) b.kans = { actie: 'fase', opportunity_id: f.kans.opportunity_id, fase: f.kans.fase };
  if (negeer) b.negeer_suggesties = true;
  return b;
}
function bvValideer(f) {
  if (f.modus !== 'traject' && !f.organisatie_id && !(f.nieuw && (f.nieuw.naam || '').trim())) return 'Kies een relatie of vul de naam van een nieuwe relatie in.';
  if (!f.gesprek_type) return 'Kies het type gesprek.';
  if (f.modus !== 'traject' && f.kans && f.kans.actie === 'nieuw' && !f.kans.type) return 'Kies of de kans aan de verkoop- of aankoopkant zit.';
  if (f.profiel && f.profiel.kvk_nummer && !/^\d{8}$/.test(f.profiel.kvk_nummer.trim())) return 'Een KvK-nummer heeft 8 cijfers.';
  if (f.nieuw && f.nieuw.kvk_nummer && !/^\d{8}$/.test(f.nieuw.kvk_nummer.trim())) return 'Een KvK-nummer heeft 8 cijfers.';
  for (var i = 0; i < (f.vervolgacties || []).length; i++) if (f.vervolgacties[i].soort === 'Eigen actie' && !(f.vervolgacties[i].omschrijving || '').trim()) return 'Omschrijf de eigen actie.';
  return null;
}
// Opslaan met herhaling bij een netwerkfout of tijdelijke storing. Zelfde sleutel, dus nooit dubbel.
function bvMetHerhaling(doe, wacht) {
  wacht = wacht || BV_WACHT;
  return new Promise(function (klaar) {
    var poging = 0;
    (function stap() {
      doe().then(function (r) {
        if ((r.status === 0 || r.status === 503) && poging < wacht.length) { setTimeout(stap, wacht[poging++]); return; }
        klaar(r);
      });
    })();
  });
}

// ── Openen (vanaf dashboard of vanuit een mandaat, dan vooringevuld) ──
function bvOpen(vooraf, opts) {
  bvCss();
  opts = opts || {};
  bvSluit();
  var venster = BV = { opts: opts, crmToken: opts.modus === 'traject' ? null : G.token, trajectSessie: opts.modus === 'traject' ? S : null, f: bvLeegFormulier(vooraf, opts), ctx: null, orgs: [], contacten: [], briefing: null, melding: null, bezig: false, suggesties: null, contactSuggesties: null, conflicten: null, voorstel: null, bewaardOp: null, timer: null, laden: true };
  bvTeken();
  var ctxLaden = bvApi('GET', bvPad('context'));
  var orgsLaden = bvTraject() ? Promise.resolve({ status: 200, json: [] }) : bvApi('GET', '/gebruikers/crm/organisaties');
  Promise.all([ctxLaden, orgsLaden]).then(async function (r) {
    if (!bvVensterActueel(venster)) return;
    if (r[0].status === 200) venster.conceptVak = await bvConceptVak(venster, r[0].json);
    if (!bvVensterActueel(venster)) return;
    BV.laden = false;
    if (r[0].status !== 200) { BV.geblokkeerd = r[0].json.error || 'Het bezoekverslag is nu niet beschikbaar.'; bvTeken(); return; }
    BV.ctx = r[0].json; BV.orgs = Array.isArray(r[1].json) ? r[1].json : [];
    // Concepten: lokaal (ook bij storing) en op de server; de nieuwste per sleutel wint.
    var lok = bvLokaalLees(BV.conceptVak), lijst = {};
    Object.keys(lok).forEach(function (k) { var x = lok[k] && lok[k].f; if (x && x.modus === BV.f.modus) lijst[k] = { f: x, op: lok[k].op }; });
    (BV.ctx.concepten || []).forEach(function (c) { if (c.data && c.data.sleutel && (!lijst[c.sleutel] || lijst[c.sleutel].op < c.updated_at)) lijst[c.sleutel] = { f: c.data, op: c.updated_at }; });
    BV.concepten = Object.keys(lijst).map(function (k) { return lijst[k]; }).sort(function (a, b) { return b.op - a.op; }).slice(0, 5);
    if (BV.f.traject_id && !(BV.ctx.trajecten || []).some(function (t) { return t.id === String(BV.f.traject_id).toUpperCase(); })) BV.f.traject_id = '';
    bvTeken();
  });
}
function bvSluit() { if (BV && BV.timer) clearTimeout(BV.timer); BV = null; var o = ge('bv-overlay'); if (o) o.remove(); }
function bvHervat(i) { var c = BV.concepten[i]; if (!c) return; BV.f = Object.assign(bvLeegFormulier({}, BV.opts), c.f); BV.concepten = []; if (BV.f.organisatie_id) bvLaadContacten(); bvTeken(); }

// ── Autosave: direct lokaal, na een korte pauze ook op de server ──
function bvGewijzigd() {
  if (!BV) return;
  var venster = BV;
  var lokaal = bvLokaalBewaar(BV.f, BV.conceptVak);
  if (BV.timer) clearTimeout(BV.timer);
  if (bvTraject()) { var st = ge('bv-status'); if (st) st.textContent = lokaal ? 'Concept staat op dit apparaat' : 'Concept kan hier niet lokaal worden bewaard'; return; }
  BV.timer = setTimeout(function () {
    if (!bvVensterActueel(venster)) return;
    var f = BV.f;
    bvApi('POST', '/gebruikers/crm/bezoek/concept', { sleutel: f.sleutel, data: f }).then(function (r) {
      if (!bvVensterActueel(venster) || BV.f.sleutel !== f.sleutel) return;
      var el = ge('bv-status'); BV.bewaardOp = r.status === 200 ? Date.now() : null;
      if (el) el.textContent = r.status === 200 ? 'Concept bewaard' : (lokaal ? 'Concept staat op dit apparaat; de server wordt later bijgewerkt' : 'Concept is alleen in dit scherm beschikbaar');
    });
  }, 1500);
}
function bvZet(veld, waarde) { if (!BV) return; BV.f[veld] = waarde; bvGewijzigd(); }
function bvZetSub(obj, veld, waarde) { if (!BV) return; BV.f[obj] = BV.f[obj] || {}; BV.f[obj][veld] = waarde; bvGewijzigd(); }
function bvKies(veld, waarde) { BV.f[veld] = BV.f[veld] === waarde ? '' : waarde; bvGewijzigd(); bvTeken(); }

// ── Relatie kiezen of nieuw ──
function bvZoek(v) { BV.f.zoek = v; bvGewijzigd(); var el = ge('bv-orglijst'); if (el) el.innerHTML = bvOrgLijstHtml(); }
function bvOrgLijstHtml() {
  var q = (BV.f.zoek || '').trim().toLowerCase();
  if (q.length < 2) return '';
  var hits = BV.orgs.filter(function (o) { return String(o.naam || '').toLowerCase().indexOf(q) >= 0 || String(o.plaats || '').toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
  return hits.map(function (o) { return '<button type="button" class="bv-keuze" onclick="bvKiesOrg(\'' + bvEsc(o.id) + '\')">' + bvEsc(o.naam) + (o.plaats ? ' <span class="bv-sub">' + bvEsc(o.plaats) + '</span>' : '') + '</button>'; }).join('')
    + '<button type="button" class="bv-keuze bv-nieuw" onclick="bvNieuweOrg()">+ Nieuwe relatie: ' + bvEsc(BV.f.zoek.trim()) + '</button>';
}
function bvKiesOrg(id) {
  var o = BV.orgs.filter(function (x) { return x.id === id; })[0] || (BV.suggesties || []).filter(function (x) { return x.id === id; })[0];
  if (!o) return;
  BV.f.organisatie_id = o.id; BV.f.organisatie_naam = o.naam; BV.f.nieuw = null; BV.f.contactpersoon_ids = []; BV.suggesties = null; BV.melding = null; BV.briefing = null;
  bvGewijzigd(); bvLaadContacten(); bvTeken();
}
function bvNieuweOrg() { BV.f.nieuw = { naam: (BV.f.zoek || '').trim(), plaats: '', kvk_nummer: '' }; BV.f.organisatie_id = ''; BV.f.organisatie_naam = ''; BV.contacten = []; bvGewijzigd(); bvTeken(); }
function bvAndereOrg() { BV.f.organisatie_id = ''; BV.f.organisatie_naam = ''; BV.f.nieuw = null; BV.contacten = []; BV.briefing = null; BV.f.kans = { actie: '', type: '', fase: '', opportunity_id: '' }; BV.f.contactpersoon_ids = []; bvGewijzigd(); bvTeken(); }
function bvLaadContacten() {
  var venster = BV, id = BV.f.organisatie_id; if (!id) return;
  bvApi('GET', '/gebruikers/crm/bezoek/briefing/' + encodeURIComponent(id)).then(function (r) {
    if (!bvVensterActueel(venster) || BV.f.organisatie_id !== id || BV.crmToken !== G.token) return;
    BV.briefing = r.status === 200 ? r.json : null; BV.contacten = BV.briefing ? (BV.briefing.contactpersonen || []) : []; bvTeken();
  });
}
function bvContact(id, aan) { var l = BV.f.contactpersoon_ids.filter(function (x) { return x !== id; }); if (aan) l.push(id); BV.f.contactpersoon_ids = l; bvGewijzigd(); }

// ── Vervolgacties ──
function bvEigenaren() {
  if (!bvTraject() && !BV.f.traject_id && BV.ctx.crm_eigenaren) return BV.ctx.crm_eigenaren;
  return BV.ctx.eigenaren || [];
}
function bvKiesMandaat(id) {
  BV.f.traject_id = id;
  var eigenaren = bvEigenaren();
  BV.f.vervolgacties.forEach(function (a) {
    if (!eigenaren.some(function (e) { return e.id === a.eigenaar_id; })) a.eigenaar_id = '';
  });
  bvGewijzigd();
  bvTeken();
}
function bvActieErbij() { BV.f.vervolgacties.push({ soort: '', omschrijving: '', eigenaar_id: BV.ctx && BV.ctx.gebruiker ? BV.ctx.gebruiker.id : (((BV.ctx && BV.ctx.eigenaren) || [])[0] || {}).id || '', deadline: '' }); bvGewijzigd(); bvTeken(); }
function bvActieWeg(i) { BV.f.vervolgacties.splice(i, 1); bvGewijzigd(); bvTeken(); }
function bvActieZet(i, veld, waarde, opnieuw) { BV.f.vervolgacties[i][veld] = waarde; bvGewijzigd(); if (opnieuw) bvTeken(); }

// ── Opslaan ──
function bvOpslaan(negeer) {
  if (!BV || BV.bezig) return;
  var fout = bvValideer(BV.f);
  if (fout) { BV.melding = { soort: 'fout', tekst: fout }; bvTeken(); return; }
  BV.bezig = true; BV.melding = null; var lokaal = bvLokaalBewaar(BV.f, BV.conceptVak); bvTeken();
  var venster = BV;
  var f = BV.f, body = bvPayload(f, negeer);
  bvMetHerhaling(function () { return bvVensterActueel(venster) ? bvApi('POST', bvPad('opslaan'), body) : Promise.resolve({ status: 401 }); }).then(function (r) {
    if (!bvVensterActueel(venster) || BV.f.sleutel !== f.sleutel) return;
    BV.bezig = false;
    if (r.status === 200) {
      bvLokaalWis(f.sleutel, venster.conceptVak);
      var n = (r.json.acties || []).filter(function (a) { return a.titel; }).length;
      bvSluit();
      var gelijktijdig = (r.json.gelijktijdige_wijzigingen || []).length;
      toast(gelijktijdig ? 'Bezoekverslag opgeslagen. Een wijziging aan de relatie of pijplijn is overgeslagen omdat iemand die intussen wijzigde.'
        : 'Bezoekverslag opgeslagen' + (n ? ' met ' + n + (n === 1 ? ' vervolgactie' : ' vervolgacties') : '') + '.', gelijktijdig ? 'warn' : 'ok');
      if (typeof wrVandaag === 'function') wrVandaag();
      if (BV_NA_OPSLAAN) try { BV_NA_OPSLAAN(r.json); } catch (e) { /* niets */ }
      bvDashboardBlok();
      return;
    }
    if (r.status === 409 && r.json.code === 'PROFIEL_CONFLICT') { BV.conflicten = r.json.conflicten || []; BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    if (r.status === 409 && r.json.code === 'KVK_IN_GEBRUIK') { BV.suggesties = (r.json.suggesties || []).map(function (x) { return Object.assign({ redenen: ['zelfde KvK-nummer'] }, x); }); BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    if (r.status === 409 && r.json.code === 'MOGELIJK_DUPLICAAT') { BV.suggesties = r.json.suggesties || []; BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    if (r.status === 409 && r.json.code === 'MOGELIJK_DUPLICAAT_CONTACT') { BV.contactSuggesties = r.json.suggesties || []; BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    BV.melding = { soort: 'fout', tekst: (r.status === 0 || r.status === 503 ? 'Opslaan is nu niet gelukt. ' : (r.json.error || 'Opslaan is niet gelukt.') + ' ') + (lokaal ? 'Je verslag staat bewaard op dit apparaat; probeer het straks opnieuw.' : 'Je verslag staat nog in dit scherm; probeer het opnieuw voordat je sluit.') };
    bvTeken();
  });
}
function bvGebruikContact(id) { BV.f.contactpersoon_ids = BV.f.contactpersoon_ids.filter(function (x) { return x !== id; }).concat([id]); BV.f.nieuw_contact = { naam: '', functie: '', email: '', telefoon: '' }; BV.contactSuggesties = null; BV.melding = null; bvGewijzigd(); bvTeken(); }
function bvConceptWeg() {
  if (!BV || !window.confirm('Dit concept weggooien? Wat je hebt ingevuld is daarna weg.')) return;
  var s = BV.f.sleutel; bvLokaalWis(s, BV.conceptVak); if (!bvTraject()) bvApi('POST', '/gebruikers/crm/bezoek/concept/' + encodeURIComponent(s) + '/verwijderen', {}); bvSluit();
}

// ── Fase C: relatiegegevens met conflictkeuze en kans in de pijplijn ──
function bvConflictKies(veld, nieuw) {
  var c = (BV.conflicten || []).filter(function (x) { return x.veld === veld; })[0]; if (!c) return;
  if (nieuw) { if (BV.f.profiel_bevestigd.indexOf(veld) < 0) BV.f.profiel_bevestigd.push(veld); }
  else { BV.f.profiel[veld] = ''; BV.f.profiel_bevestigd = BV.f.profiel_bevestigd.filter(function (x) { return x !== veld; }); }
  BV.conflicten = BV.conflicten.filter(function (x) { return x.veld !== veld; });
  if (!BV.conflicten.length) BV.melding = null;
  bvGewijzigd(); bvTeken();
}
function bvKansZet(waarde) {
  var k = { actie: '', type: '', fase: '', opportunity_id: '' };
  if (waarde === 'nieuw') k = { actie: 'nieuw', type: '', fase: 'nieuw', opportunity_id: '' };
  else if (waarde) { var o = ((BV.briefing && BV.briefing.kansen) || []).filter(function (x) { return x.id === waarde; })[0]; if (o) k = { actie: 'fase', type: o.type, fase: o.fase, opportunity_id: o.id }; }
  BV.f.kans = k; bvGewijzigd(); bvTeken();
}
var BV_FASE_LABEL = { nieuw: 'Nieuw', in_gesprek: 'In gesprek', onderhandeling: 'Onderhandeling', gewonnen: 'Gewonnen', verloren: 'Verloren', on_hold: 'On hold' };
var BV_KANS_TYPE = { 'sell-side': 'Verkoopkant', 'buy-side': 'Aankoopkant' };

// ── Fase B: voorstel uit de notities, met bevestiging per onderdeel ──
function bvVoorstelVraag() {
  if (!bvVensterActueel(BV) || BV.bezig) return;
  var venster = BV;
  if ((BV.f.tekst || '').trim().length < 20) { BV.melding = { soort: 'fout', tekst: 'Schrijf eerst wat notities; daarna kan een voorstel worden gemaakt.' }; bvTeken(); return; }
  BV.bezig = true; BV.melding = { soort: 'info', tekst: 'Voorstel wordt gemaakt...' }; bvTeken();
  bvApi('POST', bvPad('voorstel'), { tekst: BV.f.tekst }, 60000).then(function (r) {
      if (!bvVensterActueel(venster)) return;
      BV.bezig = false;
      if (r.status === 200 && r.json.voorstel) { BV.voorstel = r.json.voorstel; BV.voorstelKeus = {}; BV.melding = null; }
      else BV.melding = { soort: 'fout', tekst: r.json.error || 'Het voorstel kon nu niet worden gemaakt. Je verslag is ongewijzigd.' };
      bvTeken();
    });
}
function bvVoorstelVink(k, aan) { BV.voorstelKeus[k] = !!aan; }
// Pure functie: neemt alleen de aangevinkte onderdelen over (werkregel 6: de gebruiker beslist).
function bvVoorstelToepassen(f, v, keus, eigenId) {
  if (keus.samenvatting && v.samenvatting) f.tekst = (f.tekst ? f.tekst.replace(/\s+$/, '') + '\n\n' : '') + 'Samenvatting: ' + v.samenvatting;
  ['gesprek_type', 'perspectief', 'resultaat'].forEach(function (k) { if (keus[k] && v[k]) f[k] = v[k]; });
  (v.vervolgacties || []).forEach(function (a, i) { if (keus['actie' + i]) f.vervolgacties.push({ soort: a.soort, omschrijving: a.omschrijving || '', eigenaar_id: eigenId || '', deadline: a.deadline || '' }); });
  return f;
}
function bvVoorstelOvernemen() {
  var eig = BV.ctx.gebruiker ? BV.ctx.gebruiker.id : ((BV.ctx.eigenaren || [])[0] || {}).id;
  bvVoorstelToepassen(BV.f, BV.voorstel, BV.voorstelKeus || {}, eig);
  BV.voorstel = null; bvGewijzigd(); bvTeken();
}
function bvVoorstelHtml() {
  var v = BV.voorstel, h = '<div class="bv-blok bv-voorstel"><div class="bv-label">Voorstel uit je notities: vink aan wat je wilt overnemen</div>';
  var rij = function (k, label, waarde) { return '<label class="bv-vink"><input type="checkbox" onchange="bvVoorstelVink(\'' + k + '\',this.checked)"> ' + bvEsc(label) + ': <strong>' + bvEsc(waarde) + '</strong></label>'; };
  if (v.samenvatting) h += rij('samenvatting', 'Samenvatting toevoegen', v.samenvatting);
  if (v.gesprek_type) h += rij('gesprek_type', 'Type gesprek', v.gesprek_type);
  if (v.resultaat) h += rij('resultaat', 'Gespreksresultaat', v.resultaat);
  if (v.perspectief) h += rij('perspectief', 'Commercieel perspectief', v.perspectief);
  (v.vervolgacties || []).forEach(function (a, i) { h += rij('actie' + i, 'Vervolgactie', a.soort + (a.omschrijving ? ': ' + a.omschrijving : '') + (a.deadline ? ' (uiterlijk ' + a.deadline + ')' : '')); });
  if (!v.samenvatting && !v.gesprek_type && !v.resultaat && !v.perspectief && !(v.vervolgacties || []).length) h += '<p class="bv-sub">Uit de notities was niets met zekerheid af te leiden.</p>';
  return h + '<div class="bv-knoprij"><button type="button" class="btn" onclick="bvVoorstelOvernemen()">Aangevinkte overnemen</button><button type="button" class="btn-outline" onclick="BV.voorstel=null;bvTeken()">Niet overnemen</button></div></div>';
}
// Koppelpunt inspreken: verschijnt pas als een gekozen dienst beschikbaar is (geen spraakherkenning van de browser).
function bvInsprekenHtml() { return BV.ctx && BV.ctx.transcriptie && BV.ctx.transcriptie.beschikbaar ? '<span class="bv-sub">Inspreken wordt hier aangesloten zodra de dienst is gekozen.</span>' : ''; }

function bvBriefingHtml() {
  var b = BV.briefing; if (!b) return '';
  var h = '<details class="bv-blok bv-briefing"' + (b.gesprekken.length ? ' open' : '') + '><summary class="bv-label">Briefing: wat speelde er al</summary>';
  if (!b.gesprekken.length && !b.open_taken.length && !b.kansen.length) return h + '<p class="bv-sub">Nog geen eerdere gesprekken, open taken of kansen bij deze relatie.</p></details>';
  b.gesprekken.forEach(function (g) {
    h += '<div class="bv-brief-rij"><strong>' + bvEsc(g.gesprek_type || 'Gesprek') + '</strong> <span class="bv-sub">' + bvEsc(g.gesprek_op ? new Date(g.gesprek_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '') + (g.resultaat ? ' · ' + bvEsc(g.resultaat) : '') + '</span>'
      + (g.tekst ? '<div class="bv-sub">' + bvEsc(g.tekst) + '</div>' : '') + (g.vervolgacties.length ? '<div class="bv-sub">Afgesproken: ' + bvEsc(g.vervolgacties.join('; ')) + '</div>' : '') + '</div>';
  });
  if (b.open_taken.length) h += '<div class="bv-brief-rij"><strong>Open taken</strong>' + b.open_taken.map(function (t) { return '<div class="bv-sub">' + bvEsc(t.titel) + ' (' + bvEsc(t.eigenaar_naam) + (t.deadline ? ', uiterlijk ' + bvEsc(t.deadline) : '') + ')</div>'; }).join('') + '</div>';
  if (b.kansen.length) h += '<div class="bv-brief-rij"><strong>Kansen</strong>' + b.kansen.map(function (k) { return '<div class="bv-sub">' + bvEsc(BV_KANS_TYPE[k.type] || k.type) + ', fase ' + bvEsc(BV_FASE_LABEL[k.fase] || k.fase) + (k.omschrijving ? ': ' + bvEsc(k.omschrijving) : '') + '</div>'; }).join('') + '</div>';
  return h + '</details>';
}

// ── Tekenen ──
function bvKnoppen(veld, lijst) {
  return '<div class="bv-knoppen" role="group">' + lijst.map(function (w) {
    var aan = BV.f[veld] === w;
    return '<button type="button" class="bv-knop' + (aan ? ' bv-aan' : '') + '" aria-pressed="' + (aan ? 'true' : 'false') + '" onclick="bvKies(\'' + veld + '\',\'' + bvEsc(w) + '\')">' + bvEsc(w) + '</button>';
  }).join('') + '</div>';
}
function bvSelect(naam, lijst, waarde, onchange, leeg) {
  return '<select name="' + naam + '" onchange="' + onchange + '"><option value="">' + bvEsc(leeg || 'Kies') + '</option>' + lijst.map(function (o) {
    var v = typeof o === 'string' ? o : o.id, l = typeof o === 'string' ? o : o.naam;
    return '<option value="' + bvEsc(v) + '"' + (v === waarde ? ' selected' : '') + '>' + bvEsc(l) + '</option>';
  }).join('') + '</select>';
}
function bvHtml() {
  if (!BV) return '';
  var titel = bvTraject() && BV.ctx && BV.ctx.traject ? 'Bezoekverslag · ' + bvEsc(BV.ctx.traject.naam) : 'Bezoekverslag';
  var kop = '<div class="bv-kop"><div class="bv-titel" id="bv-titel">' + titel + '</div><button type="button" class="btn-outline" onclick="bvSluit()" aria-label="Sluiten">Sluiten</button></div>';
  if (BV.laden) return kop + '<p class="bv-sub">Laden...</p>';
  if (BV.geblokkeerd) return kop + '<div class="bv-melding bv-fout">' + bvEsc(BV.geblokkeerd) + '</div>';
  if (bvTraject() && BV.ctx.afgesloten) return kop + '<div class="bv-melding bv-fout">Dit mandaat is afgesloten; een bezoekverslag vastleggen kan hier niet meer.</div>';
  var f = BV.f, L = BV.ctx.lijsten, h = kop;
  if (BV.concepten && BV.concepten.length) {
    h += '<div class="bv-blok"><div class="bv-label">Niet afgemaakt</div>' + BV.concepten.map(function (c, i) {
      var naam = c.f.organisatie_naam || (c.f.nieuw && c.f.nieuw.naam) || c.f.zoek || c.f.deelnemers || (bvTraject() ? 'Concept' : 'Zonder relatie');
      return '<button type="button" class="bv-keuze" onclick="bvHervat(' + i + ')">Verder met: ' + bvEsc(naam) + ' <span class="bv-sub">' + bvEsc(new Date(c.op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span></button>';
    }).join('') + '</div>';
  }
  if (BV.melding) h += '<div class="bv-melding ' + (BV.melding.soort === 'fout' ? 'bv-fout' : '') + '" role="alert">' + bvEsc(BV.melding.tekst) + '</div>';
  if (BV.suggesties && BV.suggesties.length) {
    h += '<div class="bv-blok"><div class="bv-label">Bestaat deze relatie al?</div>' + BV.suggesties.map(function (s) {
      return '<button type="button" class="bv-keuze" onclick="bvKiesOrg(\'' + bvEsc(s.id) + '\')">Gebruik ' + bvEsc(s.naam) + (s.plaats ? ' (' + bvEsc(s.plaats) + ')' : '') + ' <span class="bv-sub">' + bvEsc((s.redenen || []).join(', ')) + '</span></button>';
    }).join('') + (f.nieuw ? '<button type="button" class="bv-keuze bv-nieuw" onclick="bvOpslaan(true)">Nee, dit is een nieuwe relatie</button>' : '') + '</div>';
  }
  if (BV.contactSuggesties && BV.contactSuggesties.length) {
    h += '<div class="bv-blok"><div class="bv-label">Bestaat deze contactpersoon al?</div>' + BV.contactSuggesties.map(function (s) {
      return '<button type="button" class="bv-keuze" onclick="bvGebruikContact(\'' + bvEsc(s.id) + '\')">Gebruik ' + bvEsc(s.naam) + (s.functie ? ' (' + bvEsc(s.functie) + ')' : '') + '</button>';
    }).join('') + '<button type="button" class="bv-keuze bv-nieuw" onclick="bvOpslaan(true)">Nee, dit is een nieuwe contactpersoon</button></div>';
  }
  if (BV.conflicten && BV.conflicten.length) {
    var vl = { plaats: 'Plaats', sector: 'Sector', kvk_nummer: 'KvK-nummer' };
    h += '<div class="bv-blok"><div class="bv-label">Welke gegevens kloppen?</div>' + BV.conflicten.map(function (c) {
      return '<div class="bv-brief-rij"><strong>' + bvEsc(vl[c.veld] || c.veld) + '</strong><div class="bv-knoprij"><button type="button" class="bv-keuze" onclick="bvConflictKies(\'' + bvEsc(c.veld) + '\',false)">Houd ' + bvEsc(c.huidig) + '</button><button type="button" class="bv-keuze" onclick="bvConflictKies(\'' + bvEsc(c.veld) + '\',true)">Gebruik ' + bvEsc(c.nieuw) + '</button></div></div>';
    }).join('') + '</div>';
  }
  if (bvTraject()) {
    h += '<div class="field"><label for="bv-deeln">Gesproken met</label><input id="bv-deeln" value="' + bvEsc(f.deelnemers) + '" oninput="bvZet(\'deelnemers\',this.value)"></div>';
  } else {
    // Relatie
    h += '<div class="field"><label for="bv-zoek">Relatie (verplicht)</label>';
    if (f.organisatie_id) h += '<div class="bv-gekozen"><strong>' + bvEsc(f.organisatie_naam) + '</strong> <button type="button" class="btn-outline sm" onclick="bvAndereOrg()">Andere relatie</button></div>';
    else if (f.nieuw) {
      h += '<div class="bv-gekozen">Nieuwe relatie <button type="button" class="btn-outline sm" onclick="bvAndereOrg()">Zoek bestaande</button></div>'
        + '<input id="bv-zoek" aria-label="Naam nieuwe relatie" value="' + bvEsc(f.nieuw.naam) + '" oninput="bvZetSub(\'nieuw\',\'naam\',this.value)">'
        + '<div class="row2"><div class="field"><label for="bv-plaats">Plaats</label><input id="bv-plaats" value="' + bvEsc(f.nieuw.plaats) + '" oninput="bvZetSub(\'nieuw\',\'plaats\',this.value)"></div>'
        + '<div class="field"><label for="bv-kvk">KvK-nummer</label><input id="bv-kvk" inputmode="numeric" maxlength="8" value="' + bvEsc(f.nieuw.kvk_nummer) + '" oninput="bvZetSub(\'nieuw\',\'kvk_nummer\',this.value)"></div></div>';
    } else h += '<input id="bv-zoek" autocomplete="off" aria-label="Zoek op naam of plaats" value="' + bvEsc(f.zoek) + '" oninput="bvZoek(this.value)"><div id="bv-orglijst">' + bvOrgLijstHtml() + '</div>';
    h += '</div>';
    if (f.organisatie_id) h += bvBriefingHtml();
    // Contactpersonen
    if (f.organisatie_id || f.nieuw) {
      h += '<div class="field"><label>Contactpersoon of -personen</label>';
      (BV.contacten || []).forEach(function (c) { h += '<label class="bv-vink"><input type="checkbox"' + (f.contactpersoon_ids.indexOf(c.id) >= 0 ? ' checked' : '') + ' onchange="bvContact(\'' + bvEsc(c.id) + '\',this.checked)"> ' + bvEsc(c.naam) + (c.functie ? ' <span class="bv-sub">' + bvEsc(c.functie) + '</span>' : '') + '</label>'; });
      h += '<div class="row2"><div class="field"><label for="bv-cnaam">Nieuwe contactpersoon</label><input id="bv-cnaam" value="' + bvEsc(f.nieuw_contact.naam) + '" oninput="bvZetSub(\'nieuw_contact\',\'naam\',this.value)"></div>'
        + '<div class="field"><label for="bv-cfunctie">Functie</label><input id="bv-cfunctie" value="' + bvEsc(f.nieuw_contact.functie) + '" oninput="bvZetSub(\'nieuw_contact\',\'functie\',this.value)"></div></div>'
        + '<div class="row2"><div class="field"><label for="bv-cmail">E-mail</label><input id="bv-cmail" type="email" value="' + bvEsc(f.nieuw_contact.email) + '" oninput="bvZetSub(\'nieuw_contact\',\'email\',this.value)"></div>'
        + '<div class="field"><label for="bv-ctel">Telefoon</label><input id="bv-ctel" type="tel" value="' + bvEsc(f.nieuw_contact.telefoon) + '" oninput="bvZetSub(\'nieuw_contact\',\'telefoon\',this.value)"></div></div></div>';
    }
  }
  h += '<div class="field"><label>Type gesprek (verplicht)</label>' + bvKnoppen('gesprek_type', L.gesprek_type) + '</div>';
  h += '<div class="field"><label>Gespreksresultaat</label>' + bvKnoppen('resultaat', L.resultaat) + '</div>';
  h += '<div class="row2"><div class="field"><label for="bv-persp">Commercieel perspectief</label>' + bvSelect('perspectief', L.perspectief, f.perspectief, 'bvZet(\'perspectief\',this.value)').replace('<select ', '<select id="bv-persp" ') + '</div>'
    + '<div class="field"><label for="bv-op">Datum en tijd</label><input id="bv-op" type="datetime-local" value="' + bvEsc(f.gesprek_op) + '" onchange="bvZet(\'gesprek_op\',this.value)"></div></div>';
  if (!bvTraject() && (BV.ctx.trajecten || []).length) h += '<div class="field"><label for="bv-traject">Gekoppeld mandaat</label>' + bvSelect('traject', BV.ctx.trajecten, String(f.traject_id || '').toUpperCase(), 'bvKiesMandaat(this.value)', 'Geen mandaat').replace('<select ', '<select id="bv-traject" ') + '</div>';
  h += '<div class="field"><label for="bv-tekst">Verslag in eigen woorden</label><textarea id="bv-tekst" rows="5" oninput="bvZet(\'tekst\',this.value)">' + bvEsc(f.tekst) + '</textarea>'
    + '<div class="bv-knoprij">' + (BV.ctx.ai !== false ? '<button type="button" class="btn-outline" onclick="bvVoorstelVraag()"' + (BV.bezig ? ' disabled' : '') + '>Voorstel uit notities</button>' : '') + bvInsprekenHtml() + '</div></div>';
  if (BV.voorstel) h += bvVoorstelHtml();
  if (!bvTraject()) h += '<label class="bv-vink"><input type="checkbox"' + (f.prive ? ' checked' : '') + ' onchange="bvZet(\'prive\',this.checked)"> Alleen voor mij zichtbaar</label>';
  // Fase C: pijplijn en relatiegegevens (alleen bij een relatie in de CRM)
  if (!bvTraject() && (f.organisatie_id || f.nieuw)) {
    var kansen = (BV.briefing && BV.briefing.kansen) || [];
    var kansOpties = [{ id: 'nieuw', naam: 'Nieuwe kans aanmaken' }].concat(kansen.map(function (k) { return { id: k.id, naam: 'Fase bijwerken: ' + (BV_KANS_TYPE[k.type] || k.type) + ' (nu ' + (BV_FASE_LABEL[k.fase] || k.fase) + ')' }; }));
    var kw = f.kans.actie === 'nieuw' ? 'nieuw' : f.kans.opportunity_id;
    h += '<details class="bv-blok"' + (f.kans.actie ? ' open' : '') + '><summary class="bv-label">Pijplijn</summary><div class="row2"><div class="field"><label for="bv-kans">Kans</label>' + bvSelect('kans', kansOpties, kw, 'bvKansZet(this.value)', 'Geen wijziging').replace('<select ', '<select id="bv-kans" ') + '</div>';
    if (f.kans.actie === 'nieuw') h += '<div class="field"><label for="bv-kanstype">Kant</label>' + bvSelect('kanstype', [{ id: 'sell-side', naam: 'Verkoopkant' }, { id: 'buy-side', naam: 'Aankoopkant' }], f.kans.type, 'bvZetSub(\'kans\',\'type\',this.value)').replace('<select ', '<select id="bv-kanstype" ') + '</div>';
    if (f.kans.actie) h += '<div class="field"><label for="bv-kansfase">Fase</label>' + bvSelect('kansfase', (BV.ctx.kans_fasen || []).map(function (x) { return { id: x, naam: BV_FASE_LABEL[x] || x }; }), f.kans.fase, 'bvZetSub(\'kans\',\'fase\',this.value)').replace('<select ', '<select id="bv-kansfase" ') + '</div>';
    h += '</div></details>';
  }
  if (!bvTraject() && f.organisatie_id) {
    var heeft = f.profiel.plaats || f.profiel.sector || f.profiel.kvk_nummer;
    h += '<details class="bv-blok"' + (heeft ? ' open' : '') + '><summary class="bv-label">Gegevens van de relatie bijwerken</summary><div class="row2">'
      + '<div class="field"><label for="bv-pplaats">Plaats</label><input id="bv-pplaats" value="' + bvEsc(f.profiel.plaats) + '" oninput="bvZetSub(\'profiel\',\'plaats\',this.value)"></div>'
      + '<div class="field"><label for="bv-psector">Sector</label><input id="bv-psector" value="' + bvEsc(f.profiel.sector) + '" oninput="bvZetSub(\'profiel\',\'sector\',this.value)"></div>'
      + '<div class="field"><label for="bv-pkvk">KvK-nummer</label><input id="bv-pkvk" inputmode="numeric" maxlength="8" value="' + bvEsc(f.profiel.kvk_nummer) + '" oninput="bvZetSub(\'profiel\',\'kvk_nummer\',this.value)"></div></div></details>';
  }
  // Vervolgacties
  h += '<div class="bv-blok"><div class="bv-label">Vervolgacties</div>';
  f.vervolgacties.forEach(function (a, i) {
    var geen = a.soort === 'Geen actie';
    h += '<div class="bv-actie"><div class="row2"><div class="field"><label for="bv-a' + i + '">Actie</label>' + bvSelect('soort', L.vervolgactie, a.soort, 'bvActieZet(' + i + ',\'soort\',this.value,true)').replace('<select ', '<select id="bv-a' + i + '" ') + '</div>'
      + (geen ? '' : '<div class="field"><label for="bv-ao' + i + '">Toelichting' + (a.soort === 'Eigen actie' ? ' (verplicht)' : '') + '</label><input id="bv-ao' + i + '" maxlength="160" value="' + bvEsc(a.omschrijving) + '" oninput="bvActieZet(' + i + ',\'omschrijving\',this.value)"></div>') + '</div>'
      + (geen ? '' : '<div class="row2"><div class="field"><label for="bv-ae' + i + '">Verantwoordelijke</label>' + bvSelect('eigenaar', bvEigenaren(), a.eigenaar_id, 'bvActieZet(' + i + ',\'eigenaar_id\',this.value)').replace('<select ', '<select id="bv-ae' + i + '" ') + '</div>'
      + '<div class="field"><label for="bv-ad' + i + '">Deadline</label><input id="bv-ad' + i + '" type="date" value="' + bvEsc(a.deadline) + '" onchange="bvActieZet(' + i + ',\'deadline\',this.value)"></div></div>')
      + '<button type="button" class="btn-outline sm" onclick="bvActieWeg(' + i + ')">Actie verwijderen</button></div>';
  });
  h += '<button type="button" class="btn-outline" onclick="bvActieErbij()">+ Vervolgactie</button></div>';
  h += '<div class="bv-voet"><span id="bv-status" class="bv-sub" role="status">' + (BV.bewaardOp ? 'Concept bewaard' : '') + '</span>'
    + '<button type="button" class="btn-outline" onclick="bvConceptWeg()">Weggooien</button>'
    + '<button type="button" class="btn bv-opslaan" onclick="bvOpslaan()"' + (BV.bezig ? ' disabled' : '') + '>' + (BV.bezig ? 'Bezig...' : 'Opslaan') + '</button></div>';
  return h;
}
function bvTeken() {
  var o = ge('bv-overlay');
  if (!o) { o = document.createElement('div'); o.id = 'bv-overlay'; o.className = 'bv-overlay'; document.body.appendChild(o); }
  var actief = document.activeElement && document.activeElement.id;
  o.innerHTML = '<div class="bv-modal" role="dialog" aria-modal="true" aria-labelledby="bv-titel">' + bvHtml() + '</div>';
  if (actief) { var e = ge(actief); if (e && e.focus) { e.focus(); if (e.setSelectionRange && typeof e.value === 'string' && e.type !== 'email' && e.type !== 'date' && e.type !== 'datetime-local') try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) { /* niets */ } } }
}
// Grote startknop (dashboard en mandaat).
// ── Fase C: blok op het persoonlijke dashboard (adviseursportaal): recente verslagen, open taken, meting ──
function bvDashboardBlok() {
  var el = ge('bv-dashboard'); if (!el || typeof G === 'undefined' || !G.token) return;
  bvCss();
  var hdr = { 'x-gebruiker-token': G.token };
  Promise.all([fetchMetTimeout(WORKER + '/gebruikers/crm/bezoek/overzicht', { headers: hdr, cache: 'no-store' }, 20000), fetchMetTimeout(WORKER + '/gebruikers/crm/taken', { headers: hdr, cache: 'no-store' }, 20000)])
    .then(function (r) { if (r[0].status !== 200) return null; return Promise.all([r[0].json(), r[1].status === 200 ? r[1].json() : { taken: [] }]); })
    .catch(function () { return null; })
    .then(function (d) { var e2 = ge('bv-dashboard'); if (e2 !== el || G.token !== hdr['x-gebruiker-token']) return; e2.innerHTML = d ? bvDashboardHtml(d[0], d[1].taken || []) : ''; });
}
function bvDashboardHtml(o, taken) {
  var m = o.meting || {}, h = '<div class="bv-dash"><div class="bv-label">Bezoekverslagen</div><div class="bv-dash-cijfers">'
    + '<div><strong>' + bvEsc(m.verslagen_deze_maand || 0) + '</strong><span class="bv-sub">deze maand</span></div>'
    + '<div><strong>' + bvEsc(m.vervolgacties_deze_maand || 0) + '</strong><span class="bv-sub">vervolgacties</span></div>'
    + '<div><strong>' + bvEsc(m.open_taken || 0) + '</strong><span class="bv-sub">open taken</span></div>'
    + '<div><strong>' + (m.mediaan_invoertijd_sec === null || m.mediaan_invoertijd_sec === undefined ? '-' : bvEsc(m.mediaan_invoertijd_sec) + ' s') + '</strong><span class="bv-sub">invoertijd (mediaan)</span></div></div>';
  if (taken.length) h += '<div class="bv-label">Mijn open taken</div>' + taken.slice(0, 8).map(function (t) { return '<div class="bv-brief-rij">' + bvEsc(t.titel) + ' <span class="bv-sub">' + bvEsc(t.organisatie_naam) + (t.deadline ? ' · uiterlijk ' + bvEsc(t.deadline) : '') + '</span> <button type="button" class="btn-outline sm" onclick="bvTaakAf(\'' + bvEsc(t.id) + '\',this)">Afgerond</button></div>'; }).join('');
  if ((o.recent || []).length) h += '<div class="bv-label">Laatste verslagen</div>' + o.recent.slice(0, 5).map(function (x) { return '<div class="bv-brief-rij">' + bvEsc(x.organisatie_naam || 'Relatie') + ' <span class="bv-sub">' + bvEsc(x.gesprek_type || '') + (x.resultaat ? ' · ' + bvEsc(x.resultaat) : '') + (x.gesprek_op ? ' · ' + bvEsc(new Date(x.gesprek_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })) : '') + '</span></div>'; }).join('');
  return h + '</div>';
}
function bvTaakAf(id, knop) {
  if (knop) knop.disabled = true;
  fetchMetTimeout(WORKER + '/gebruikers/crm/taken/' + encodeURIComponent(id) + '/afronden', { method: 'POST', headers: { 'x-gebruiker-token': G.token, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' }, 20000)
    .then(function (r) { if (r.status === 200) { toast('Taak afgerond.', 'ok'); bvDashboardBlok(); } else { if (knop) knop.disabled = false; toast('Afronden is niet gelukt; probeer het opnieuw.', 'err'); } })
    .catch(function () { if (knop) knop.disabled = false; toast('Geen verbinding; probeer het opnieuw.', 'err'); });
}
// Eigen opmaak, ook bruikbaar in mna.html (andere stylesheet). Gebruikt alleen de kleurvariabelen die beide pagina's hebben.
function bvCss() {
  if (typeof document === 'undefined' || !document.getElementById || document.getElementById('bv-css')) return;
  var st = document.createElement('style'); st.id = 'bv-css';
  st.textContent = '.bv-overlay{position:fixed;inset:0;background:rgba(26,24,21,.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:1.5rem}'
    + '.bv-modal{background:var(--panel);color:var(--sub);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;font-family:inherit}'
    + '.bv-modal .field{margin-bottom:1rem}.bv-modal .field label{display:block;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}'
    + '.bv-modal input,.bv-modal select,.bv-modal textarea{width:100%;box-sizing:border-box;background:var(--panel);border:1.5px solid var(--border);border-radius:var(--r);color:var(--sub);font:inherit;font-size:14px;padding:9px 11px;min-height:42px}'
    + '.bv-modal input[type=checkbox]{width:auto;min-height:0}.bv-modal .row2{display:flex;gap:12px}.bv-modal .row2 .field{flex:1;min-width:0}'
    + '.bv-modal .btn,.bv-dash .btn{background:var(--teal);color:#fff;border:none;border-radius:var(--r);font:inherit;font-weight:600;font-size:13px;padding:9px 18px;cursor:pointer;min-height:42px}'
    + '.bv-modal .btn-outline,.bv-dash .btn-outline{background:transparent;color:var(--mid);border:1.5px solid var(--border2);border-radius:var(--r);font:inherit;font-size:12px;padding:7px 14px;cursor:pointer;min-height:38px}'
    + '.bv-modal .btn-outline.sm,.bv-dash .btn-outline.sm{font-size:11px;padding:4px 10px;min-height:30px}'
    + '.bv-titel{font-size:1.15rem;font-weight:600;color:var(--head)}.bv-start{font-size:15px;padding:12px 22px;min-height:48px}'
    + '.bv-kop{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:1rem}.bv-knoppen,.bv-knoprij{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
    + '.bv-knop{min-height:44px;padding:8px 12px;border:1.5px solid var(--border2);border-radius:var(--r);background:var(--panel);color:var(--sub);font:inherit;font-size:13px;cursor:pointer}.bv-knop.bv-aan{background:var(--teal);border-color:var(--teal);color:#fff}'
    + '.bv-keuze{display:block;width:100%;text-align:left;min-height:44px;margin-top:6px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--r);background:var(--panel);color:var(--sub);font:inherit;font-size:13px;cursor:pointer}.bv-knoprij .bv-keuze{width:auto;flex:1}'
    + '.bv-keuze.bv-nieuw{border-style:dashed;color:var(--teal)}.bv-sub{font-size:11px;color:var(--muted)}.bv-gekozen{display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:14px}'
    + '.bv-modal label.bv-vink{display:flex;align-items:center;gap:8px;min-height:40px;font-size:13px;color:var(--sub);text-transform:none;letter-spacing:0;font-weight:400}'
    + '.bv-blok{border-top:1px solid var(--border);padding-top:.75rem;margin:1rem 0}.bv-blok summary{cursor:pointer}.bv-label{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:.4rem 0}'
    + '.bv-brief-rij{padding:6px 0;border-bottom:1px dashed var(--border);font-size:13px}.bv-actie{border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:.75rem}'
    + '.bv-melding{font-size:13px;border-radius:var(--r);padding:8px 10px;margin-bottom:.75rem;border:1px solid var(--border)}.bv-melding.bv-fout{border-color:var(--red);color:var(--red)}'
    + '.bv-voet{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;position:sticky;bottom:-1.5rem;background:var(--panel);padding:.75rem 0;border-top:1px solid var(--border)}.bv-voet .bv-sub{margin-right:auto}.bv-opslaan{min-height:48px!important;font-size:15px!important;padding:10px 26px!important}'
    + '.bv-dash{background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:1rem;margin-bottom:1rem}.bv-dash-cijfers{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:.5rem}.bv-dash-cijfers div{display:flex;flex-direction:column}.bv-dash-cijfers strong{font-size:1.2rem;color:var(--head)}'
    + '@media(max-width:600px){.bv-overlay{padding:0}.bv-modal{max-width:none;max-height:none;height:100%;border-radius:0;padding:1rem}.bv-modal .row2{flex-direction:column;gap:0}.bv-dash-cijfers{grid-template-columns:repeat(2,1fr)}}';
  document.head.appendChild(st);
}
// Ingang voor de begeleider in mna.html (tussencode): verslag in het gesprekslogboek van dit mandaat.
function bvOpenBegeleider() {
  if (typeof S === 'undefined' || !S.traject || !S.traject.id) return;
  BV_NA_OPSLAAN = function () { toast('Het verslag staat in het gesprekslogboek van dit mandaat.', 'ok'); };
  bvOpen({}, { modus: 'traject', code: S.traject.id, sleutel: S._bgKey || S.code || '' });
}
function bvStartKnop(vooraf) { return '<button type="button" class="btn bv-start" onclick=\'bvOpen(' + bvEsc(JSON.stringify(vooraf || {})) + ')\'>+ Bezoekverslag</button>'; }
