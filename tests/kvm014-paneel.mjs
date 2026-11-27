// KVM-014 stap 5 (26-11-2026): normalisatiepaneel (mna/16) met de echte functies in een vm-context. Escaping, signalen,
// informatieverzoek, status geparkeerd, eigen categorie en wijzigen via de wijzigroute. Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + String(d).slice(0, 300) : '')); } };
const posts = [];
const ctx = { console, Math, String, Number, JSON, isFinite, document: { getElementById: () => null }, S: { code: 'T1', rol: 'tussen' }, FASES: {}, isTussen: () => true, ge: () => null, confirm: () => true };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8'), ctx);
ctx.finPost = (pad, body, melding) => posts.push({ pad, body, melding });
ctx.finHerteken = () => {};
const X = '<img src=x onerror=alert(1)>';
const nm = { id: 'NM1', rev: 4, jaar: 2024, post: 'algemeen', soort: 'eigen', soort_label: X, bedrag: 2500, omschrijving: X, bron: X, karakter: 'incidenteel', zekerheid: 'midden', herkomst: 'adviseur', status: 'geparkeerd',
  motivering: X, risico: '', kvm_advies: '', beoordeling: '', grootboekrekening: X, oorspronkelijk_bedrag: 3000, berekeningswijze: X, ontbrekende_info: X, herhaling_onderbouwing: X, versie: 3,
  signalen: [{ code: 'mogelijk_dubbel', tekst: X }] };
ctx.FIN.data = { normalisaties: [nm], jaren: [{ jaar: 2024 }] };
const h = ctx.finNmHtml(nm);
ok(!/<img/.test(h) && (h.match(/&lt;img/g) || []).length >= 8, 'alle vrije tekst (label, omschrijving, bron, grootboek, berekeningswijze, informatieverzoek, signaal, onderbouwing) ge-escaped', h.match(/<img[^>]*>/));
ok(/Informatieverzoek:/.test(h) && /versie 3/.test(h) && /oorspronkelijk bedrag/.test(h), 'informatieverzoek, versie en oorspronkelijk bedrag zichtbaar');
ok(/&#9888;/.test(h) && /fin-ao-NM1/.test(h), 'signaal zichtbaar met veld voor aanvullende onderbouwing');
ok(/value="geparkeerd" selected/.test(h) && /fin-oi-NM1/.test(h) && /finWijzig\(this\)/.test(h), 'status geparkeerd in de keuzelijst, veld ontbrekende informatie, knop Wijzigen');
const zonderSignaal = ctx.finNmHtml({ ...nm, signalen: [] });
ok(!/fin-ao-NM1/.test(zonderSignaal), 'zonder signaal geen veld voor aanvullende onderbouwing');
ok(ctx.FIN_SOORT.some((s) => s[0] === 'managementfee') && ctx.FIN_SOORT.some((s) => s[0] === 'eigen') && ctx.FIN_SOORT.length >= 20, 'nieuwe categorieën en eigen categorie in de keuzelijst');
// Wijzigen: formulier vullen vanuit de normalisatie en via de wijzigroute versturen.
ctx.finWijzig({ getAttribute: () => 'NM1' });
ok(ctx.FIN.form && ctx.FIN.form.id === 'NM1' && ctx.FIN.form.rev === 4 && ctx.FIN.form.bedrag === '2500', 'Wijzigen vult het formulier met id, rev en waarden');
ctx.FIN.form.bedrag = '2.750,50'; ctx.FIN.form.oorspronkelijk_bedrag = '3.100';
ctx.finBewaarNieuw();
const p = posts[posts.length - 1];
ok(p && p.pad === 'normalisatie/wijzig' && p.body.id === 'NM1' && p.body.rev === 4 && p.body.bedrag === 2750.5 && p.body.oorspronkelijk_bedrag === 3100 && p.body.soort_label === X, 'wijziging via de wijzigroute met id, rev en NL-bedragen omgezet', JSON.stringify(p && p.body));
ok(/opnieuw goedkeuren/.test(ctx.finFormHtml()), 'formulier in wijzigmodus meldt dat opnieuw goedkeuren nodig is');
// Nieuw: geen id → gewone route; soort_label alleen bij eigen categorie.
ctx.FIN.form = { jaar: 2024, post: 'algemeen', soort: 'advieskosten', karakter: 'incidenteel', zekerheid: 'hoog', bedrag: '1000', soort_label: 'genegeerd' };
ctx.finBewaarNieuw();
const p2 = posts[posts.length - 1];
ok(p2.pad === 'normalisatie' && p2.body.soort_label === '' && p2.body.oorspronkelijk_bedrag === null, 'nieuwe normalisatie via de gewone route; label alleen bij eigen categorie');
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
