// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// MASTER #91 fase C (29 okt 2026): verdienmodel, facturatie, werkkapitaal, omzet naar werksoort, tarieven en
// klantenanalyse in de fase Commercieel. Alleen verkoper en begeleider. Bron is een factuur- of omzetexport
// (CSV/XLSX); de server bewaart alleen aggregaten per relatie (worker/47). Klantnamen zijn hier intern zichtbaar;
// het memorandum toont klanten uitsluitend geanonimiseerd. Laadt na mna/16 (hergebruikt finEsc/finGeld/finPct).
var KA = { scope: null, status: 'idle', data: null, bezig: false, melding: null };
var KA_MODEL = [['', 'Kies…'], ['uurtarief', 'Uurtarief'], ['vaste_prijs', 'Vaste prijs per opdracht'], ['abonnement', 'Abonnement'], ['mix', 'Combinatie']];
var KA_FACT = [['', 'Kies…'], ['maandelijks', 'Maandelijks'], ['per_kwartaal', 'Per kwartaal'], ['per_opdracht', 'Per opdracht'], ['voorschot', 'Voorschot'], ['mix', 'Combinatie']];

function kaSync() { var k = finScope(); if (KA.scope !== k) { KA.scope = k; KA.status = 'idle'; KA.data = null; KA.bezig = false; KA.melding = null; } }
function kaLaad() {
  kaSync();
  if (!S.code || !(isVerkoper() || isTussen()) || KA.status === 'laden') return;
  var scope = KA.scope; KA.status = 'laden';
  finAntw(fetchMetTimeout(WORKER + '/mna/klantanalyse?code=' + encodeURIComponent(S.code), { method: 'GET', headers: finHeaders() }, 30000)).then(function (x) {
    if (KA.scope !== scope) return;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { KA.status = 'ok'; KA.data = x.d; } else { KA.status = 'fout'; KA.data = null; }
    finHerteken();
  });
}
function kaPost(pad, body, ok) {
  if (KA.bezig) return;
  KA.bezig = true; KA.melding = null; finHerteken();
  body.code = S.code; body.rev = KA.data ? KA.data.rev : 0;
  finAntw(fetchMetTimeout(WORKER + '/mna/klantanalyse/' + pad, { method: 'POST', headers: finHeaders(), body: JSON.stringify(body) }, 60000)).then(function (x) {
    KA.bezig = false;
    if (x.s === 200 && x.d && x.d.ok === true && Array.isArray(x.d.jaren)) { KA.data = x.d; KA.melding = { soort: 'ok', tekst: ok }; }
    else {
      KA.melding = { soort: 'fout', tekst: x.s === 0 ? 'Geen verbinding met de server; er is niets gewijzigd.' : ((x.d && x.d.error) || ('Niet gelukt (HTTP ' + x.s + ').')) };
      if (x.s === 409) { KA.status = 'idle'; setTimeout(kaLaad, 0); }
    }
    finHerteken();
  });
}
window.kaUpload = function () {
  var inp = ge('ka-bestand'), bestand = inp && inp.files && inp.files[0];
  if (!bestand) { KA.melding = { soort: 'fout', tekst: 'Kies eerst een factuuroverzicht (CSV of XLSX).' }; finHerteken(); return; }
  if (bestand.size > 10 * 1024 * 1024) { KA.melding = { soort: 'fout', tekst: 'Het bestand is groter dan 10 MB.' }; finHerteken(); return; }
  if (KA.data && KA.data.bron && !confirm('Er staat al een factuuroverzicht. Vervangen?')) return;
  var lezer = new FileReader();
  lezer.onload = function () { kaPost('upload', { bestand_naam: bestand.name, inhoud_base64: String(lezer.result || '').split(',')[1] || '' }, 'Factuuroverzicht ingelezen.'); };
  lezer.readAsDataURL(bestand);
};
window.kaBewaarModel = function () {
  kaPost('verdienmodel', { model: (ge('ka-model') || {}).value || null, facturatie: (ge('ka-fact') || {}).value || null, toelichting: (ge('ka-toel') || {}).value || '' }, 'Verdienmodel opgeslagen.');
};
window.kaVerwijder = function () { if (confirm('Het factuuroverzicht verwijderen? Het verdienmodel blijft staan.')) kaPost('verwijder', {}, 'Factuuroverzicht verwijderd.'); };

function kaOpties(lijst, w) { return lijst.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (w || '') ? ' selected' : '') + '>' + finEsc(o[1]) + '</option>'; }).join(''); }
function kaTabel(koppen, rijen) {
  return '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:.3rem 0 .6rem"><thead><tr>' + koppen.map(function (k, i) { return '<th style="text-align:' + (i ? 'right' : 'left') + ';border-bottom:1px solid var(--border);padding:3px 4px;font-weight:600">' + finEsc(k) + '</th>'; }).join('') + '</tr></thead><tbody>'
    + rijen.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td style="text-align:' + (i ? 'right' : 'left') + ';border-bottom:1px solid var(--border);padding:3px 4px">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
}
function kaJaarHtml(j) {
  var a = j.aansluiting, kl = j.concentratie;
  var aans = a.status === 'sluit' ? '<span style="color:var(--teal)">sluit aan op de kolommenbalans (verschil ' + finGeld(a.verschil) + ')</span>'
    : a.status === 'afwijking' ? '<span style="color:var(--red)">wijkt af van de kolommenbalans: ' + finGeld(a.verschil) + ' (' + finPct(a.verschil_pct) + '); controleer of het overzicht volledig is</span>'
    : '<span style="color:var(--muted)">geen gereed kolommenbalansjaar om mee te vergelijken</span>';
  return '<div style="border:1px solid var(--border);border-radius:var(--r);padding:.6rem .75rem;margin:.5rem 0"><div style="font-weight:600;font-size:13px">' + finEsc(j.jaar) + '</div>'
    + '<div style="font-size:12px;line-height:1.7">Gefactureerd ' + finGeld(j.omzet) + ' aan ' + j.relaties + ' unieke relaties (' + j.facturen + ' facturen, gemiddeld ' + finGeld(j.gemiddeld_per_relatie) + '); ' + aans + '.<br>'
    + 'Concentratie: grootste relatie ' + finPct(kl.top1_pct) + ', top 5 ' + finPct(kl.top5_pct) + ', top 10 ' + finPct(kl.top10_pct) + '. Omzetgewogen relatieduur ' + (j.relatieleeftijd.gewogen_gemiddeld_jaren != null ? String(j.relatieleeftijd.gewogen_gemiddeld_jaren).replace('.', ',') + ' jaar' : '–') + '.</div>'
    + kaTabel(['Top 10 (intern, niet in het memorandum)', 'Branche', 'Omzet', 'Aandeel', 'Relatieduur'], j.top10.map(function (t) { return [finEsc(t.naam), finEsc(t.branche || '–'), finGeld(t.omzet), finPct(t.aandeel_pct), String(Math.floor(t.relatie_jaren)) + ' jr']; }))
    + kaTabel(['Omzetklasse', 'Relaties', 'Omzet', 'Aandeel'], j.omzetklassen.map(function (k) { return [finEsc(k.label), k.aantal, finGeld(k.omzet), k.aandeel_pct != null ? finPct(k.aandeel_pct) : '–']; }))
    + kaTabel(['Relatieduur', 'Relaties', 'Aandeel omzet'], j.relatieleeftijd.klassen.map(function (k) { return [finEsc(k.label), k.aantal, k.aandeel_pct != null ? finPct(k.aandeel_pct) : '–']; }))
    + kaTabel(['Branche', 'Omzet', 'Aandeel'], j.branches.map(function (b) { return [finEsc(b.naam), finGeld(b.omzet), finPct(b.aandeel_pct)]; }))
    + kaTabel(['Werksoort', 'Omzet', 'Aandeel', 'Uren', 'Gerealiseerd tarief', 'Standaardtarief', 'Realisatie'], j.werksoorten.map(function (w) { return [finEsc(w.naam), finGeld(w.omzet), finPct(w.aandeel_pct), w.uren != null ? String(w.uren).replace('.', ',') : '–', w.gerealiseerd_uurtarief != null ? finGeld(w.gerealiseerd_uurtarief) : '–', w.standaard_uurtarief != null ? finGeld(w.standaard_uurtarief) : '–', w.realisatie_pct != null ? finPct(w.realisatie_pct) : '–']; }))
    + '</div>';
}
function renderKlantanalyse(faseId) {
  kaSync();
  if (faseId !== 'commercieel' || !(isVerkoper() || isTussen()) || !S.code) return '';
  if (KA.status === 'idle') setTimeout(kaLaad, 0);
  var h = '<div class="panel" id="ka-panel" style="margin-bottom:1rem"><div class="sec-hdr" style="margin:0">&#128101; Verdienmodel, klanten en tarieven</div>'
    + '<div style="font-size:12px;color:var(--sub);line-height:1.6;margin:.4rem 0">Upload een factuur- of omzetoverzicht (CSV of XLSX) met per regel minimaal klant, factuurdatum en bedrag; werksoort, branche, uren, standaardtarief en klant sinds zijn optioneel. Alleen totalen per relatie worden bewaard. Klantnamen blijven intern; in het memorandum staan klanten geanonimiseerd.</div>';
  if (KA.melding) h += '<div style="font-size:12px;padding:.5rem .75rem;margin-bottom:.5rem;border-radius:var(--r);border:1px solid ' + (KA.melding.soort === 'ok' ? 'var(--teal);background:var(--teal-bg)' : 'var(--red);background:var(--red-bg)') + '">' + finEsc(KA.melding.tekst) + '</div>';
  if (KA.status !== 'ok' || !KA.data) return h + '<div style="font-size:12px;color:var(--muted)">' + (KA.status === 'fout' ? 'De klantenanalyse kon niet worden geladen.' : 'Laden…') + '</div></div>';
  var d = KA.data, dis = KA.bezig ? ' disabled' : '', vm = d.verdienmodel || {};
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;margin:.4rem 0">'
    + '<label style="font-size:11px;color:var(--sub)">Verdienmodel<select id="ka-model" style="width:100%">' + kaOpties(KA_MODEL, vm.model) + '</select></label>'
    + '<label style="font-size:11px;color:var(--sub)">Facturatie<select id="ka-fact" style="width:100%">' + kaOpties(KA_FACT, vm.facturatie) + '</select></label></div>'
    + '<label style="font-size:11px;color:var(--sub);display:block">Toelichting verdienmodel<textarea id="ka-toel" rows="2" maxlength="1000" style="width:100%">' + finEsc(vm.toelichting || '') + '</textarea></label>'
    + '<button class="btn-ghost btn-sm" style="font-size:11px;margin:.3rem 0" onclick="kaBewaarModel()"' + dis + '>Verdienmodel opslaan</button>'
    + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:.5rem 0"><input type="file" id="ka-bestand" accept=".csv,.xlsx" style="font-size:12px"><button class="btn btn-sm" style="font-size:11px" onclick="kaUpload()"' + dis + '>' + (d.bron ? 'Vervangen' : 'Inlezen') + '</button>'
    + (d.bron && isTussen() ? '<button class="btn-ghost btn-sm" style="font-size:11px" onclick="kaVerwijder()"' + dis + '>Verwijderen</button>' : '') + '</div>';
  if (d.bron) h += '<div style="font-size:11px;color:var(--muted)">Bron: ' + finEsc(d.bron.naam || '') + ' · ' + d.bron.regels + ' factuurregels' + (d.bron.dubbel ? ' · ' + d.bron.dubbel + ' dubbele factuurnummer(s) één keer geteld' : '') + '</div>';
  h += d.jaren.slice().reverse().map(kaJaarHtml).join('');
  if (d.werkkapitaal && d.werkkapitaal.length) h += '<div style="font-weight:600;font-size:13px;margin-top:.6rem">Werkkapitaal (uit de kolommenbalans)</div>'
    + kaTabel(['Jaar', 'Debiteuren', 'Debiteurendagen', 'Onderhanden werk', 'OHW-dagen', 'Werkkapitaal', '% van omzet'], d.werkkapitaal.map(function (w) { return [w.jaar, finGeld(w.debiteuren), w.debiteurendagen != null ? w.debiteurendagen : '–', finGeld(w.onderhanden_werk), w.ohw_dagen != null ? w.ohw_dagen : '–', finGeld(w.werkkapitaal), w.werkkapitaal_pct_omzet != null ? finPct(w.werkkapitaal_pct_omzet) : '–']; }));
  return h + '</div>';
}
