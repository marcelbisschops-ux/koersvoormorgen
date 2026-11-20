// KVM-008 scherm (adv-werkruimte.js): echte functies in een vm-context. Rendering, escaping, 'niet te berekenen', totalen en
// de verzonden gegevens. Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
let n = 0, fout = 0; const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + String(d).slice(0, 300) : '')); } };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const el = {}; const posts = [];
const ctx = { console, G: { token: 'tok' }, WORKER: 'https://synth.invalid', window: { crypto: { randomUUID: () => 'uuid-1' } }, document: { querySelectorAll: () => [] }, crypto: { randomUUID: () => 'uuid-1' },
  ge: (id) => (el[id] = el[id] || { innerHTML: '' }), toast: () => {}, fetchMetTimeout: async (url, opts) => { posts.push({ url, opts }); return { status: 200, json: async () => ({}) }; } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'adv-werkruimte.js'), 'utf8'), ctx);
const X = '<img src=x onerror=alert(1)>';
const fixture = { status: 200, json: { ok: true, peildatum: '2026-12-31',
  onderdelen: [{ id: 'o1', soort: 'aanvang', grondslag: 'vast', bedrag: 5000, verrekenen_met_succesfee: true, toelichting: X, rev: 1 },
    { id: 'o2', soort: 'succesfee', grondslag: 'percentage', percentage: 3, minimum: 25000, tail_maanden: 12, rev: 1 }],
  gebeurtenissen: [{ id: 'g1', soort: 'closing', datum: '2026-06-20', transactiewaarde: null, omschrijving: X }],
  boekingen: [{ id: 'b1', onderdeel_id: 'o1', soort: 'betaling', datum: '2026-02-10', bedrag: 5000, referentie: X }],
  berekening: { afwijkingen: [{ onderdeel_id: 'o1', soort: 'betaling_zonder_factuur', bedrag: 5000, tekst: 'Betaling zonder (voldoende) factuur' }], onderdelen: [{ id: 'o1', posten: [{ datum: '2026-02-01', bedrag: 5000, grond: 'ondertekening overeenkomst' }], verschuldigd: 5000, gefactureerd: 0, betaald: 5000, ontvangen: 5000, nog_te_factureren: 5000, nog_te_ontvangen: 0, openstaand: 0 }, { id: 'o2', verschuldigd: 0, niet_te_berekenen: 'transactiewaarde bij closing ontbreekt', gefactureerd: 0, betaald: 0, openstaand: null }],
    totaal: { verschuldigd: 5000, gefactureerd: 0, betaald: 5000, ontvangen: 5000, nog_te_factureren: 5000, nog_te_ontvangen: 0, openstaand: 0, onvolledig: true } } } };
ctx.wrHonTeken('T1', fixture);
const h = el['wr-hon-T1'].innerHTML;
ok(h && !h.includes('<img') && h.includes('&lt;img'), 'alle vrije tekst (toelichting, omschrijving, referentie) ge-escaped', h.match(/<img[^>]*>/));
ok(h.includes('Niet te berekenen') && h.includes('transactiewaarde bij closing ontbreekt') && h.includes('Niet alle onderdelen zijn te berekenen'), "'niet te berekenen' met reden en totaalmelding zichtbaar");
ok(h.includes('3% van de transactiewaarde, minimaal') && h.includes('verrekenbaar met de succesfee') && h.includes('tail 12 maanden'), 'afspraken leesbaar weergegeven');
ok(h.includes('€ 5.000,00 (ondertekening overeenkomst)'), 'per onderdeel zichtbaar wanneer welk bedrag verschuldigd is (posten)', h.slice(0, 600));
ok(h.includes('Afwijkingen: Betaling zonder (voldoende) factuur bij Aanvangsvergoeding') && h.includes('Nog te factureren') && h.includes('Nog te ontvangen') && h.includes('Onbetaald') && h.includes('openstaande facturen'), 'saldi met uitleg en afwijkingen zichtbaar');
ok((h.match(/Verwijderen/g) || []).length === 4, 'verwijderknop per onderdeel, gebeurtenis en boeking');
ctx.wrHonTeken('T1', { status: 403, json: { error: 'Geen toegang tot dit mandaat.' } });
ok(el['wr-hon-T1'].innerHTML.includes('Geen toegang tot dit mandaat.') && el['wr-hon-T1'].innerHTML.includes('Opnieuw laden'), 'fout: melding en opnieuw laden');
// Verzonden gegevens bij een nieuw onderdeel (formulier-elementen nagebootst).
const veld = (v) => ({ value: v }); const form = { elements: { soort: veld('succesfee'), grondslag: veld('percentage'), bedrag: veld(''), percentage: veld('2,5'.replace(',', '.')), minimum: veld('25000'), looptijd_maanden: veld(''), startdatum: veld(''), tail_maanden: veld('6'), verrekenen: { checked: false }, toelichting: veld('') } };
ctx.wrHonOnderdeel({ preventDefault() {}, target: form }, 'T1');
await new Promise((r) => setTimeout(r, 10));
const p = posts.find((x) => x.url.endsWith('/mna/honorarium/onderdeel'));
const b = p && JSON.parse(p.opts.body);
ok(b && b.traject_id === 'T1' && b.soort === 'succesfee' && b.percentage === 2.5 && b.minimum === 25000 && b.bedrag === null && b.tail_maanden === 6 && b.idem === 'uuid-1' && p.opts.headers['x-gebruiker-token'] === 'tok', 'nieuw onderdeel: juiste gegevens, idem en gebruikerstoken', JSON.stringify(b));
// KVM-008 dekking aankoop (20-11): blok 'Honoraria koopmandaten' in het OHW-overleg.
const antwoord = (status, json) => { ctx.fetchMetTimeout = async (url, opts) => { posts.push({ url, opts }); return { status, json: async () => json }; }; };
antwoord(200, { ok: true, koopmandaten: [{ id: 'mandaat_abc123', naam: X, status: 'actief' }] });
ctx.wrKmHonLaad(); await new Promise((r) => setTimeout(r, 10));
let km = el['wr-km-hon'].innerHTML;
ok(posts.some((x) => x.url.endsWith('/mna/honorarium/mandaten') && x.opts.method === 'GET'), 'koopmandaten opgehaald via /mna/honorarium/mandaten');
ok(!km.includes('<img') && km.includes('&lt;img') && km.includes('id="wr-hon-mandaat_abc123"') && km.includes("wrHonLaad('mandaat_abc123')"), 'koopmandaat: naam ge-escaped, eigen honorariumpaneel met knop', km);
antwoord(200, { ok: true, koopmandaten: [] }); ctx.wrKmHonLaad(); await new Promise((r) => setTimeout(r, 10));
ok(el['wr-km-hon'].innerHTML.includes('Geen koopmandaten.'), 'geen koopmandaten: nette melding');
antwoord(503, { error: 'Honoraria tijdelijk niet beschikbaar.' }); ctx.wrKmHonLaad(); await new Promise((r) => setTimeout(r, 10));
ok(el['wr-km-hon'].innerHTML.includes('Honoraria tijdelijk niet beschikbaar.') && !el['wr-km-hon'].innerHTML.includes('Geen koopmandaten'), 'laadfout: foutmelding, geen onjuiste lege lijst');
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
