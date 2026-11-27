// KVM-014 stap 7 (27-11-2026): AI-voorstellen en meting in het normalisatiepaneel (mna/16), plus de bevestiging dat
// koperspecifieke synergieën (dealvoorstel dv-syn) buiten genormaliseerde EBITDA, ondernemingswaarde en IM blijven.
// Echte functies in een vm-context; geen netwerk (fetchMetTimeout onderschept). Synthetisch.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
const X = '<img src=x onerror=alert(1)>';

// ── 1. Paneel ──
const aanroepen = [];
let antwoord = null;
const ctx = { console, Math, String, Number, JSON, isFinite, Object, Array, Promise, setTimeout, document: { getElementById: () => null }, S: { code: 'T1', rol: 'tussen' }, FASES: {}, isTussen: () => true, isVerkoper: () => false, ge: () => null, confirm: () => true, WORKER: 'https://synthetisch.invalid',
  fetchMetTimeout: (url, opts, ms) => { aanroepen.push({ url, body: JSON.parse(opts.body), ms }); return Promise.resolve({ status: antwoord.s, json: () => Promise.resolve(antwoord.d) }); } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8'), ctx);
ctx.finHerteken = () => {};
const meting = { totaal: 4, uit_voorstel: 3, handmatig: 1, herkomst: { kvm: 0, ai: 3, adviseur: 1, verkoper: 0 }, acceptatie_voorstellen_pct: 50, doorlooptijd_uren_mediaan: { voorstel: 1.5, handmatig: null }, beslist: { voorstel: 2, handmatig: 0 },
  ai: { per_dag: 3, laatste_24u: 1, analyses: 1, input_tokens: 41000, output_tokens: 2900 } };
const basis = { ok: true, jaren: [{ jaar: 2024 }], normalisaties: [], prognose: { status: 'geen', jaren: [] }, meting, ai_beschikbaar: true, ai_documenten: [{ id: 'DOC1', naam: X, fase_id: 'financieel' }, { id: 'DOC2', naam: 'SYNTH_b.pdf', fase_id: null }] };
ctx.FIN.data = JSON.parse(JSON.stringify(basis)); ctx.FIN.status = 'ok';
let h = ctx.finAiHtml(ctx.FIN.data);
ok(/AI-voorstellen uit documenten/.test(h) && /Analyses in de laatste 24 uur: 1 van 3/.test(h), 'knop en gebruik zichtbaar voor de begeleider');
ok(!/Analyse starten/.test(h), 'documentkeuze pas na een expliciete klik');
ctx.finAiOpen();
h = ctx.finAiHtml(ctx.FIN.data);
ok(/Analyse starten/.test(h) && /data-id="DOC1"/.test(h) && !/<img/.test(h) && /&lt;img/.test(h), 'documentkeuze getoond, documentnaam ge-escaped');
ok(/Niets wordt automatisch goedgekeurd/.test(h) && /geen bedrag/.test(h), 'uitleg: geen automatische goedkeuring, geen marktconform bedrag');
// Zonder keuze → melding, geen aanroep.
ctx.finAiStart();
ok(aanroepen.length === 0 && ctx.FIN.melding && ctx.FIN.melding.soort === 'fout', 'zonder documentkeuze geen AI-aanroep');
// Een id dat niet in de lijst staat telt niet mee.
ctx.FIN.aiKeuze = { VREEMD: true };
ctx.finAiStart();
ok(aanroepen.length === 0, 'onbekend document-id wordt niet verstuurd');
ctx.FIN.aiKeuze = {};
ctx.finAiKies({ getAttribute: () => 'DOC1', checked: true });
antwoord = { s: 200, d: { ...JSON.parse(JSON.stringify(basis)), nieuw: 2, normalisaties: [{ id: 'NM1', rev: 1, jaar: 2024, post: 'algemeen', soort: 'advieskosten', bedrag: 18750, omschrijving: 'Advies', bron: 'Document "' + X + '": "passage"', karakter: 'incidenteel', zekerheid: 'midden', herkomst: 'ai', status: 'voorstel', versie: 1, signalen: [] }],
  ai: { voorstellen: 1, geparkeerd: 1, geweigerd: 1, dubbel: 0, geweigerd_lijst: [{ nr: 3, omschrijving: X, reden: 'Bedrag zonder controleerbare bron in de passage.' }], onleesbaar: [], ingekort: [], opmerking: X, tokens: { input: 4100, output: 900, cache_read: 1200 } } } };
ctx.finAiStart();
await new Promise((r) => setTimeout(r, 5));
const a = aanroepen[0];
ok(a && a.url === 'https://synthetisch.invalid/mna/financieel/normalisatie/ai-voorstellen' && a.ms === 60000 && a.body.code === 'T1' && JSON.stringify(a.body.document_ids) === '["DOC1"]', 'AI-aanroep via fetchMetTimeout met 60 s, juiste route en documentkeuze', a);
ok(ctx.FIN.data.normalisaties.length === 1 && ctx.FIN.aiResultaat && ctx.FIN.aiOpen === false && /Niets is goedgekeurd/.test(ctx.FIN.melding.tekst), 'resultaat verwerkt, melding: niets goedgekeurd');
h = ctx.finAiHtml(ctx.FIN.data);
ok(/1 voorstel\(len\) met bedrag, 1 informatieverzoek\(en\), 1 geweigerd/.test(h) && /Tokens: 4\.100 invoer, 900 uitvoer, 1\.200 uit cache/.test(h), 'telling en tokengebruik zichtbaar', h);
ok(!/<img/.test(h) && /zonder controleerbare bron/.test(h), 'weigerredenen zichtbaar en ge-escaped');
ok(/AI-voorstel uit document/.test(ctx.finNmHtml(ctx.FIN.data.normalisaties[0])) && !/<img/.test(ctx.finNmHtml(ctx.FIN.data.normalisaties[0])), 'herkomst AI zichtbaar bij de normalisatie, bron ge-escaped');
// Fouten: plafond en time-out.
antwoord = { s: 429, d: { error: 'Het maximum van 3 AI-analyses per 24 uur voor dit traject is bereikt.', code: 'AI_PLAFOND' } };
ctx.FIN.aiKeuze = { DOC2: true }; ctx.finAiStart(); await new Promise((r) => setTimeout(r, 5));
ok(ctx.FIN.melding.soort === 'fout' && /maximum van 3/.test(ctx.FIN.melding.tekst) && ctx.FIN.bezig === false, 'kostenplafond-melding getoond');
antwoord = { s: 502, d: { error: 'Het AI-antwoord was onvolledig (afgekapt) en is volledig geweigerd.', code: 'AI_AFGEKAPT', tokens: { input: 5000, output: 12000 } } };
ctx.FIN.aiKeuze = { DOC2: true }; ctx.finAiStart(); await new Promise((r) => setTimeout(r, 5));
ok(/afgekapt/.test(ctx.FIN.melding.tekst) && /12000 uit/.test(ctx.FIN.melding.tekst), 'afkapping met tokens gemeld');
antwoord = { s: 0, d: null };
ctx.FIN.aiKeuze = { DOC2: true }; ctx.finAiStart(); await new Promise((r) => setTimeout(r, 5));
ok(/60 seconden/.test(ctx.FIN.melding.tekst), 'time-out: duidelijke melding, geen hangende knop');
// Meting.
const mh = ctx.finMetingHtml(ctx.FIN.data);
ok(/3 van 4 normalisaties kwamen uit voorstellen \(KVM 0, AI 3\), 1 handmatig/.test(mh) && /voorstellen 1,5 uur \(2 beslist\)/.test(mh) && /handmatig nog geen besluit/.test(mh) && /41\.000 invoer/.test(mh), 'meting: herkomst, doorlooptijd en AI-gebruik', mh);
// Verkoper: geen AI-knop en geen meting.
ctx.isTussen = () => false;
ok(ctx.finAiHtml(ctx.FIN.data) === '' && ctx.finMetingHtml(ctx.FIN.data) === '', 'verkoper ziet geen AI-knop en geen meting');
ctx.isTussen = () => true;
ok(/disabled/.test(ctx.finAiHtml({ ...ctx.FIN.data, ai_beschikbaar: false })), 'AI niet beschikbaar → knop uitgeschakeld');

// ── 2. Synergieën buiten genormaliseerde EBITDA en ondernemingswaarde (mna/03) ──
const data = { financieel_omzet1: '900.000', financieel_omzet2: '950.000', financieel_omzet3: '1.000.000', financieel_ebitda: '180.000', financieel_ebitdaNorm: '190.000' };
const c2 = { console, Math, String, Number, JSON, isFinite, parseFloat, parseInt, Object, Array, Date, S: { code: 'T1', rol: 'tussen', data, _groepData: data, traject: { sector: 'accountancy' } },
  location: { search: '', hostname: 'localhost', href: 'http://localhost/mna.html', pathname: '/mna.html' }, localStorage: { getItem: () => null, setItem() {} }, sessionStorage: { getItem: () => null, setItem() {} }, navigator: { userAgent: 'node' }, URLSearchParams, URL, setTimeout, clearTimeout,
  fetch: async () => ({ status: 0, json: async () => ({}) }), isMaatschap: () => false, isKoper: () => false, isVerkoper: () => false, isTussen: () => true, ge: () => null, document: { getElementById: () => null } };
c2.window = c2;
vm.createContext(c2);
for (const f of ['mna/01-config-sectorprofielen.js', 'mna/03-rekenkern-waardering.js', 'mna/16-financieel.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c2);
c2.SECTOR_PROFIELEN.accountancy.multipleLaag = 4; c2.SECTOR_PROFIELEN.accountancy.multipleHoog = 6;
c2.FIN_CENTRAAL.code = 'T1'; c2.FIN_CENTRAAL.status = 'ok'; c2.FIN_CENTRAAL.data = { ok: true, jaren: [{ jaar: 2025, genormaliseerd: { ebitda: 210000, omzet: 1000000 } }], normalisaties: [] };
const p = { ...c2.dvGetDefaults(), multipleBasis: 5, multipleBovengrens: 6 }; // multiple vult de begeleider in het dealvoorstel zelf in
const reken = (q) => { const cl = c2.dvBerekenClosing(q), sa = c2.dvBerekenSchuldafbouw(q, cl); return { pm: c2.dvBerekenPrijsmechanisme(q), cl, dcf: c2.dvBerekenDCF(q, sa), sc: c2.dvBerekenScenarios(q), brug: c2.dvBerekenOpbrengstBrug(q, cl), syn: c2.dvBerekenSynergie(q), w: c2.dvBerekenWaardering() }; };
const zonder = reken({ ...p }), met = reken({ ...p, synergieAan: true, synergieKostenJaarlijks: 50000, synergieOmzetJaarlijks: 80000, synergieRealisatieJaren: 2, synergieImplementatiekosten: 20000 });
ok(zonder.cl.evBasis > 0 && Math.abs(zonder.cl.evBasis - c2.dvGrondslagBewezen(p) * 5) < 0.01 && zonder.syn === null && met.syn && met.syn.npv > 0, 'synergie-analyse aan geeft een eigen NPV; zonder geen synergie (test is zinvol)', { ev: zonder.cl.evBasis, npv: met.syn && met.syn.npv });
ok(JSON.stringify(zonder.pm) === JSON.stringify(met.pm) && JSON.stringify(zonder.cl) === JSON.stringify(met.cl), 'ondernemingswaarde (prijsmechanisme, closing) gelijk met en zonder synergieën');
ok(JSON.stringify(zonder.dcf) === JSON.stringify(met.dcf) && JSON.stringify(zonder.sc) === JSON.stringify(met.sc) && JSON.stringify(zonder.brug) === JSON.stringify(met.brug), 'DCF, scenario\'s en opbrengstbrug gelijk met en zonder synergieën');
ok(zonder.w.wMid === met.w.wMid && /financiële analyse/.test(zonder.w.ebitdaBron), 'waarderingsscherm: genormaliseerde EBITDA uit de financiële analyse, onafhankelijk van synergieën', { a: zonder.w.wMid, b: met.w.wMid, bron: zonder.w.ebitdaBron });
const src16 = fs.readFileSync(path.join(ROOT, 'mna/16-financieel.js'), 'utf8');
ok(!/synergie/i.test(src16), 'het normalisatiepaneel (bron genormaliseerde EBITDA) kent geen synergiepost');

console.log('\nkvm014-ai-paneel: ' + (n - fout) + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
