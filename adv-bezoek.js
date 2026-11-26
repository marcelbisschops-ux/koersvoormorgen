// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-015 fase A (GO Marcel): Quick Visit, een bezoekverslag binnen een minuut na het gesprek.
// Eén scherm, grote knoppen, alleen relatie en type gesprek verplicht. Het verslag komt in de bestaande relatiehistorie
// (CRM), vervolgacties in de bestaande werkruimte-acties of als CRM-taak (backend worker/70). Dit bestand toont en roept aan.
// Nooit kwijt: elke wijziging staat direct lokaal op dit apparaat en wordt ook als concept op de server bewaard. Opslaan
// gebruikt een vaste sleutel per verslag, zodat opnieuw proberen na een netwerkfout nooit een dubbel verslag oplevert.
var BV = null;
var BV_LOKAAL = 'kvm-bezoek-concepten';
var BV_WACHT = [1000, 3000];

function bvEsc(v) { return v === null || v === undefined ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function bvSleutel() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'bv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
function bvApi(methode, pad, body) {
  var opts = { method: methode, headers: { 'x-gebruiker-token': G.token }, cache: 'no-store' };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetchMetTimeout(WORKER + pad, opts, 20000).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j || {} }; }); })
    .catch(function () { return { status: 0, json: { error: 'Geen verbinding.' } }; });
}
function bvNuLokaal() { var d = new Date(); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

// ── Lokale opslag (fallback bij netwerkstoring). Alles in try/catch: privévenster of geblokkeerde opslag mag niets breken. ──
function bvLokaalLees() { try { var x = JSON.parse(window.localStorage.getItem(BV_LOKAAL) || '{}'); return x && typeof x === 'object' ? x : {}; } catch (e) { return {}; } }
function bvLokaalBewaar(f) { try { var x = bvLokaalLees(); x[f.sleutel] = { f: f, op: Date.now() }; window.localStorage.setItem(BV_LOKAAL, JSON.stringify(x)); return true; } catch (e) { return false; } }
function bvLokaalWis(sleutel) { try { var x = bvLokaalLees(); delete x[sleutel]; window.localStorage.setItem(BV_LOKAAL, JSON.stringify(x)); } catch (e) { /* niets */ } }

function bvLeegFormulier(vooraf) {
  vooraf = vooraf || {};
  return { sleutel: bvSleutel(), organisatie_id: vooraf.organisatie_id || '', organisatie_naam: vooraf.organisatie_naam || '', zoek: vooraf.zoek || '', nieuw: null,
    contactpersoon_ids: [], nieuw_contact: { naam: '', functie: '', email: '', telefoon: '' }, traject_id: vooraf.traject_id || '', gesprek_type: '', perspectief: '', resultaat: '',
    gesprek_op: bvNuLokaal(), tekst: '', prive: false, vervolgacties: [] };
}

// Pure functie: wat er naar de server gaat. Lege velden gaan niet mee; nooit gokken (geen standaardresultaat).
function bvPayload(f, negeer) {
  var b = { sleutel: f.sleutel, gesprek_type: f.gesprek_type, perspectief: f.perspectief || null, resultaat: f.resultaat || null, tekst: f.tekst || '', zichtbaarheid: f.prive ? 'privé' : 'kantoor' };
  var t = f.gesprek_op ? Date.parse(f.gesprek_op) : NaN; if (!isNaN(t)) b.gesprek_op = t;
  if (f.organisatie_id) { b.organisatie_id = f.organisatie_id; b.contactpersoon_ids = (f.contactpersoon_ids || []).slice(); }
  else if (f.nieuw) b.nieuwe_organisatie = { naam: (f.nieuw.naam || '').trim(), plaats: (f.nieuw.plaats || '').trim(), kvk_nummer: (f.nieuw.kvk_nummer || '').trim() };
  if (f.nieuw_contact && (f.nieuw_contact.naam || '').trim()) b.nieuwe_contacten = [{ naam: f.nieuw_contact.naam.trim(), functie: (f.nieuw_contact.functie || '').trim(), email: (f.nieuw_contact.email || '').trim(), telefoon: (f.nieuw_contact.telefoon || '').trim() }];
  if (f.traject_id) b.traject_id = f.traject_id;
  b.vervolgacties = (f.vervolgacties || []).filter(function (a) { return a.soort; }).map(function (a) { return { soort: a.soort, omschrijving: a.omschrijving || '', eigenaar_id: a.eigenaar_id || null, deadline: a.deadline || null }; });
  if (negeer) b.negeer_suggesties = true;
  return b;
}
function bvValideer(f) {
  if (!f.organisatie_id && !(f.nieuw && (f.nieuw.naam || '').trim())) return 'Kies een relatie of vul de naam van een nieuwe relatie in.';
  if (!f.gesprek_type) return 'Kies het type gesprek.';
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
function bvOpen(vooraf) {
  BV = { f: bvLeegFormulier(vooraf), ctx: null, orgs: [], contacten: [], melding: null, bezig: false, suggesties: null, contactSuggesties: null, bewaardOp: null, timer: null, laden: true };
  bvTeken();
  Promise.all([bvApi('GET', '/gebruikers/crm/bezoek/context'), bvApi('GET', '/gebruikers/crm/organisaties')]).then(function (r) {
    if (!BV) return;
    BV.laden = false;
    if (r[0].status !== 200) { BV.geblokkeerd = r[0].json.error || 'Het bezoekverslag is nu niet beschikbaar.'; bvTeken(); return; }
    BV.ctx = r[0].json; BV.orgs = Array.isArray(r[1].json) ? r[1].json : [];
    // Concepten: lokaal (ook bij storing) en op de server; de nieuwste per sleutel wint.
    var lok = bvLokaalLees(), lijst = {};
    Object.keys(lok).forEach(function (k) { if (lok[k] && lok[k].f) lijst[k] = { f: lok[k].f, op: lok[k].op }; });
    (BV.ctx.concepten || []).forEach(function (c) { if (c.data && c.data.sleutel && (!lijst[c.sleutel] || lijst[c.sleutel].op < c.updated_at)) lijst[c.sleutel] = { f: c.data, op: c.updated_at }; });
    BV.concepten = Object.keys(lijst).map(function (k) { return lijst[k]; }).sort(function (a, b) { return b.op - a.op; }).slice(0, 5);
    if (BV.f.traject_id && !BV.ctx.trajecten.some(function (t) { return t.id === String(BV.f.traject_id).toUpperCase(); })) BV.f.traject_id = '';
    bvTeken();
  });
}
function bvSluit() { if (BV && BV.timer) clearTimeout(BV.timer); BV = null; var o = ge('bv-overlay'); if (o) o.remove(); }
function bvHervat(i) { var c = BV.concepten[i]; if (!c) return; BV.f = Object.assign(bvLeegFormulier(), c.f); BV.concepten = []; if (BV.f.organisatie_id) bvLaadContacten(); bvTeken(); }

// ── Autosave: direct lokaal, na een korte pauze ook op de server ──
function bvGewijzigd() {
  if (!BV) return;
  bvLokaalBewaar(BV.f);
  if (BV.timer) clearTimeout(BV.timer);
  BV.timer = setTimeout(function () {
    if (!BV) return;
    var f = BV.f;
    bvApi('POST', '/gebruikers/crm/bezoek/concept', { sleutel: f.sleutel, data: f }).then(function (r) {
      if (!BV || BV.f.sleutel !== f.sleutel) return;
      var el = ge('bv-status'); BV.bewaardOp = r.status === 200 ? Date.now() : null;
      if (el) el.textContent = r.status === 200 ? 'Concept bewaard' : 'Concept staat op dit apparaat; de server wordt later bijgewerkt';
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
  BV.f.organisatie_id = o.id; BV.f.organisatie_naam = o.naam; BV.f.nieuw = null; BV.f.contactpersoon_ids = []; BV.suggesties = null; BV.melding = null;
  bvGewijzigd(); bvLaadContacten(); bvTeken();
}
function bvNieuweOrg() { BV.f.nieuw = { naam: (BV.f.zoek || '').trim(), plaats: '', kvk_nummer: '' }; BV.f.organisatie_id = ''; BV.f.organisatie_naam = ''; BV.contacten = []; bvGewijzigd(); bvTeken(); }
function bvAndereOrg() { BV.f.organisatie_id = ''; BV.f.organisatie_naam = ''; BV.f.nieuw = null; BV.contacten = []; BV.f.contactpersoon_ids = []; bvGewijzigd(); bvTeken(); }
function bvLaadContacten() {
  var id = BV.f.organisatie_id; if (!id) return;
  bvApi('GET', '/gebruikers/crm/organisaties/' + encodeURIComponent(id)).then(function (r) { if (!BV || BV.f.organisatie_id !== id) return; BV.contacten = r.status === 200 ? (r.json.contactpersonen || []) : []; bvTeken(); });
}
function bvContact(id, aan) { var l = BV.f.contactpersoon_ids.filter(function (x) { return x !== id; }); if (aan) l.push(id); BV.f.contactpersoon_ids = l; bvGewijzigd(); }

// ── Vervolgacties ──
function bvActieErbij() { BV.f.vervolgacties.push({ soort: '', omschrijving: '', eigenaar_id: BV.ctx && BV.ctx.gebruiker ? BV.ctx.gebruiker.id : '', deadline: '' }); bvGewijzigd(); bvTeken(); }
function bvActieWeg(i) { BV.f.vervolgacties.splice(i, 1); bvGewijzigd(); bvTeken(); }
function bvActieZet(i, veld, waarde, opnieuw) { BV.f.vervolgacties[i][veld] = waarde; bvGewijzigd(); if (opnieuw) bvTeken(); }

// ── Opslaan ──
function bvOpslaan(negeer) {
  if (!BV || BV.bezig) return;
  var fout = bvValideer(BV.f);
  if (fout) { BV.melding = { soort: 'fout', tekst: fout }; bvTeken(); return; }
  BV.bezig = true; BV.melding = null; bvLokaalBewaar(BV.f); bvTeken();
  var f = BV.f, body = bvPayload(f, negeer);
  bvMetHerhaling(function () { return bvApi('POST', '/gebruikers/crm/bezoek', body); }).then(function (r) {
    if (!BV || BV.f.sleutel !== f.sleutel) return;
    BV.bezig = false;
    if (r.status === 200) {
      bvLokaalWis(f.sleutel);
      var n = (r.json.acties || []).filter(function (a) { return a.titel; }).length;
      bvSluit();
      toast('Bezoekverslag opgeslagen' + (n ? ' met ' + n + (n === 1 ? ' vervolgactie' : ' vervolgacties') : '') + '.', 'ok');
      if (typeof wrVandaag === 'function') wrVandaag();
      return;
    }
    if (r.status === 409 && r.json.code === 'MOGELIJK_DUPLICAAT') { BV.suggesties = r.json.suggesties || []; BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    if (r.status === 409 && r.json.code === 'MOGELIJK_DUPLICAAT_CONTACT') { BV.contactSuggesties = r.json.suggesties || []; BV.melding = { soort: 'fout', tekst: r.json.error }; bvTeken(); return; }
    BV.melding = { soort: 'fout', tekst: (r.status === 0 || r.status === 503 ? 'Opslaan is nu niet gelukt. ' : (r.json.error || 'Opslaan is niet gelukt.') + ' ') + 'Je verslag staat veilig bewaard op dit apparaat; probeer het straks opnieuw.' };
    bvTeken();
  });
}
function bvGebruikContact(id) { BV.f.contactpersoon_ids = BV.f.contactpersoon_ids.filter(function (x) { return x !== id; }).concat([id]); BV.f.nieuw_contact = { naam: '', functie: '', email: '', telefoon: '' }; BV.contactSuggesties = null; BV.melding = null; bvGewijzigd(); bvTeken(); }
function bvConceptWeg() {
  if (!BV || !window.confirm('Dit concept weggooien? Wat je hebt ingevuld is daarna weg.')) return;
  var s = BV.f.sleutel; bvLokaalWis(s); bvApi('POST', '/gebruikers/crm/bezoek/concept/' + encodeURIComponent(s) + '/verwijderen', {}); bvSluit();
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
  var kop = '<div class="bv-kop"><div class="modal-title" id="bv-titel" style="margin:0">Bezoekverslag</div><button type="button" class="btn-outline" onclick="bvSluit()" aria-label="Sluiten">Sluiten</button></div>';
  if (BV.laden) return kop + '<p class="bv-sub">Laden...</p>';
  if (BV.geblokkeerd) return kop + '<div class="bv-melding bv-fout">' + bvEsc(BV.geblokkeerd) + '</div>';
  var f = BV.f, L = BV.ctx.lijsten, h = kop;
  if (BV.concepten && BV.concepten.length) {
    h += '<div class="bv-blok"><div class="bv-label">Niet afgemaakt</div>' + BV.concepten.map(function (c, i) {
      var naam = c.f.organisatie_naam || (c.f.nieuw && c.f.nieuw.naam) || c.f.zoek || 'Zonder relatie';
      return '<button type="button" class="bv-keuze" onclick="bvHervat(' + i + ')">Verder met: ' + bvEsc(naam) + ' <span class="bv-sub">' + bvEsc(new Date(c.op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</span></button>';
    }).join('') + '</div>';
  }
  if (BV.melding) h += '<div class="bv-melding ' + (BV.melding.soort === 'fout' ? 'bv-fout' : '') + '" role="alert">' + bvEsc(BV.melding.tekst) + '</div>';
  if (BV.suggesties && BV.suggesties.length) {
    h += '<div class="bv-blok"><div class="bv-label">Bestaat deze relatie al?</div>' + BV.suggesties.map(function (s) {
      return '<button type="button" class="bv-keuze" onclick="bvKiesOrg(\'' + bvEsc(s.id) + '\')">Gebruik ' + bvEsc(s.naam) + (s.plaats ? ' (' + bvEsc(s.plaats) + ')' : '') + ' <span class="bv-sub">' + bvEsc((s.redenen || []).join(', ')) + '</span></button>';
    }).join('') + '<button type="button" class="bv-keuze bv-nieuw" onclick="bvOpslaan(true)">Nee, dit is een nieuwe relatie</button></div>';
  }
  if (BV.contactSuggesties && BV.contactSuggesties.length) {
    h += '<div class="bv-blok"><div class="bv-label">Bestaat deze contactpersoon al?</div>' + BV.contactSuggesties.map(function (s) {
      return '<button type="button" class="bv-keuze" onclick="bvGebruikContact(\'' + bvEsc(s.id) + '\')">Gebruik ' + bvEsc(s.naam) + (s.functie ? ' (' + bvEsc(s.functie) + ')' : '') + '</button>';
    }).join('') + '<button type="button" class="bv-keuze bv-nieuw" onclick="bvOpslaan(true)">Nee, dit is een nieuwe contactpersoon</button></div>';
  }
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
  // Contactpersonen
  if (f.organisatie_id || f.nieuw) {
    h += '<div class="field"><label>Contactpersoon of -personen</label>';
    (BV.contacten || []).forEach(function (c) { h += '<label class="bv-vink"><input type="checkbox"' + (f.contactpersoon_ids.indexOf(c.id) >= 0 ? ' checked' : '') + ' onchange="bvContact(\'' + bvEsc(c.id) + '\',this.checked)"> ' + bvEsc(c.naam) + (c.functie ? ' <span class="bv-sub">' + bvEsc(c.functie) + '</span>' : '') + '</label>'; });
    h += '<div class="row2"><div class="field"><label for="bv-cnaam">Nieuwe contactpersoon</label><input id="bv-cnaam" value="' + bvEsc(f.nieuw_contact.naam) + '" oninput="bvZetSub(\'nieuw_contact\',\'naam\',this.value)"></div>'
      + '<div class="field"><label for="bv-cfunctie">Functie</label><input id="bv-cfunctie" value="' + bvEsc(f.nieuw_contact.functie) + '" oninput="bvZetSub(\'nieuw_contact\',\'functie\',this.value)"></div></div>'
      + '<div class="row2"><div class="field"><label for="bv-cmail">E-mail</label><input id="bv-cmail" type="email" value="' + bvEsc(f.nieuw_contact.email) + '" oninput="bvZetSub(\'nieuw_contact\',\'email\',this.value)"></div>'
      + '<div class="field"><label for="bv-ctel">Telefoon</label><input id="bv-ctel" type="tel" value="' + bvEsc(f.nieuw_contact.telefoon) + '" oninput="bvZetSub(\'nieuw_contact\',\'telefoon\',this.value)"></div></div></div>';
  }
  h += '<div class="field"><label>Type gesprek (verplicht)</label>' + bvKnoppen('gesprek_type', L.gesprek_type) + '</div>';
  h += '<div class="field"><label>Gespreksresultaat</label>' + bvKnoppen('resultaat', L.resultaat) + '</div>';
  h += '<div class="row2"><div class="field"><label for="bv-persp">Commercieel perspectief</label>' + bvSelect('perspectief', L.perspectief, f.perspectief, 'bvZet(\'perspectief\',this.value)').replace('<select ', '<select id="bv-persp" ') + '</div>'
    + '<div class="field"><label for="bv-op">Datum en tijd</label><input id="bv-op" type="datetime-local" value="' + bvEsc(f.gesprek_op) + '" onchange="bvZet(\'gesprek_op\',this.value)"></div></div>';
  if (BV.ctx.trajecten.length) h += '<div class="field"><label for="bv-traject">Gekoppeld mandaat</label>' + bvSelect('traject', BV.ctx.trajecten, String(f.traject_id || '').toUpperCase(), 'bvZet(\'traject_id\',this.value)', 'Geen mandaat').replace('<select ', '<select id="bv-traject" ') + '</div>';
  h += '<div class="field"><label for="bv-tekst">Verslag in eigen woorden</label><textarea id="bv-tekst" rows="5" oninput="bvZet(\'tekst\',this.value)">' + bvEsc(f.tekst) + '</textarea></div>';
  h += '<label class="bv-vink"><input type="checkbox"' + (f.prive ? ' checked' : '') + ' onchange="bvZet(\'prive\',this.checked)"> Alleen voor mij zichtbaar</label>';
  // Vervolgacties
  h += '<div class="bv-blok"><div class="bv-label">Vervolgacties</div>';
  f.vervolgacties.forEach(function (a, i) {
    var geen = a.soort === 'Geen actie';
    h += '<div class="bv-actie"><div class="row2"><div class="field"><label for="bv-a' + i + '">Actie</label>' + bvSelect('soort', L.vervolgactie, a.soort, 'bvActieZet(' + i + ',\'soort\',this.value,true)').replace('<select ', '<select id="bv-a' + i + '" ') + '</div>'
      + (geen ? '' : '<div class="field"><label for="bv-ao' + i + '">Toelichting' + (a.soort === 'Eigen actie' ? ' (verplicht)' : '') + '</label><input id="bv-ao' + i + '" maxlength="160" value="' + bvEsc(a.omschrijving) + '" oninput="bvActieZet(' + i + ',\'omschrijving\',this.value)"></div>') + '</div>'
      + (geen ? '' : '<div class="row2"><div class="field"><label for="bv-ae' + i + '">Verantwoordelijke</label>' + bvSelect('eigenaar', BV.ctx.eigenaren, a.eigenaar_id, 'bvActieZet(' + i + ',\'eigenaar_id\',this.value)').replace('<select ', '<select id="bv-ae' + i + '" ') + '</div>'
      + '<div class="field"><label for="bv-ad' + i + '">Deadline</label><input id="bv-ad' + i + '" type="date" value="' + bvEsc(a.deadline) + '" onchange="bvActieZet(' + i + ',\'deadline\',this.value)"></div></div>')
      + '<button type="button" class="btn-outline sm" onclick="bvActieWeg(' + i + ')">Actie verwijderen</button></div>';
  });
  h += '<button type="button" class="btn-outline" onclick="bvActieErbij()">+ Vervolgactie</button></div>';
  h += '<div class="bv-voet"><span id="bv-status" class="bv-sub" role="status">' + (BV.bewaardOp ? 'Concept bewaard' : '') + '</span>'
    + '<button type="button" class="btn-outline" onclick="bvConceptWeg()">Weggooien</button>'
    + '<button type="button" class="btn bv-opslaan" onclick="bvOpslaan()"' + (BV.bezig ? ' disabled' : '') + '>' + (BV.bezig ? 'Opslaan...' : 'Opslaan') + '</button></div>';
  return h;
}
function bvTeken() {
  var o = ge('bv-overlay');
  if (!o) { o = document.createElement('div'); o.id = 'bv-overlay'; o.className = 'overlay bv-overlay'; document.body.appendChild(o); }
  var actief = document.activeElement && document.activeElement.id;
  o.innerHTML = '<div class="modal bv-modal" role="dialog" aria-modal="true" aria-labelledby="bv-titel">' + bvHtml() + '</div>';
  if (actief) { var e = ge(actief); if (e && e.focus) { e.focus(); if (e.setSelectionRange && typeof e.value === 'string' && e.type !== 'email' && e.type !== 'date' && e.type !== 'datetime-local') try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) { /* niets */ } } }
}
// Grote startknop (dashboard en mandaat).
function bvStartKnop(vooraf) { return '<button type="button" class="btn bv-start" onclick=\'bvOpen(' + bvEsc(JSON.stringify(vooraf || {})) + ')\'>+ Bezoekverslag</button>'; }
