// KVM-015 fase A (adv-bezoek.js): echte functies in een vm-context. Payload, validatie, lokale fallback, herhaling met
// dezelfde sleutel, duplicaatkeuze, escaping en de koppeling in adv.html en de handleidingen. Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
let n = 0, fout = 0; const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + String(d).slice(0, 400) : '')); } };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const opslag = {}; const posts = []; let antwoorden = [];
const overlay = { innerHTML: '', remove() { delete el['bv-overlay']; } };
const el = {};
const ctx = { console, G: { token: 'tok' }, WORKER: 'https://synth.invalid', toasts: [],
  window: { crypto: { randomUUID: () => 'uuid-' + (++ctx.teller) }, localStorage: { getItem: (k) => opslag[k] || null, setItem: (k, v) => { opslag[k] = String(v); } }, confirm: () => true },
  crypto: { randomUUID: () => 'uuid-' + (++ctx.teller) }, teller: 0, setTimeout: (f) => { f(); return 1; }, clearTimeout: () => {},
  document: { activeElement: null, body: { appendChild: (o) => { el[o.id] = o; } }, createElement: () => Object.assign({}, overlay) },
  ge: (id) => el[id] || null, toast: (m) => ctx.toasts.push(m),
  fetchMetTimeout: async (url, opts) => { posts.push({ url, opts }); const a = antwoorden.length ? antwoorden.shift() : { status: 200, json: {} }; if (a.netwerk) throw new Error('netwerk'); return { status: a.status, json: async () => a.json }; } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'adv-bezoek.js'), 'utf8'), ctx);
const wacht = () => new Promise((r) => setImmediate(r));
const X = '<img src=x onerror=alert(1)>';
const lijsten = { gesprek_type: ['Kennismaking', 'Intake'], perspectief: ['Potentiële verkoper'], resultaat: ['Positief', 'Nog onbekend'], vervolgactie: ['Terugbellen', 'Geen actie', 'Eigen actie'] };
const context = { ok: true, gebruiker: { id: 'U1', naam: 'Synth' }, lijsten, eigenaren: [{ id: 'U1', naam: 'Synth' }, { id: 'U2', naam: X }], trajecten: [{ id: 'SYNT1', naam: X }], concepten: [] };

// ── Pure functies ──
const f = ctx.bvLeegFormulier({ traject_id: 'SYNT1' });
ok(f.sleutel && f.traject_id === 'SYNT1' && f.gesprek_type === '' && f.resultaat === '', 'leeg formulier: eigen sleutel, vooraf ingevuld mandaat, geen standaardresultaat (nooit gokken)');
ok(ctx.bvValideer(f) === 'Kies een relatie of vul de naam van een nieuwe relatie in.', 'validatie: relatie verplicht');
f.nieuw = { naam: 'Synth BV', plaats: '', kvk_nummer: '123' };
ok(ctx.bvValideer(f) === 'Kies het type gesprek.', 'validatie: type gesprek verplicht');
f.gesprek_type = 'Intake';
ok(/8 cijfers/.test(ctx.bvValideer(f)), 'validatie: KvK-nummer 8 cijfers');
f.nieuw.kvk_nummer = '12345678'; f.vervolgacties = [{ soort: 'Eigen actie', omschrijving: ' ' }];
ok(ctx.bvValideer(f) === 'Omschrijf de eigen actie.', 'validatie: eigen actie vraagt omschrijving');
f.vervolgacties = [{ soort: 'Terugbellen', omschrijving: '', eigenaar_id: 'U2', deadline: '2026-12-01' }, { soort: '' }];
ok(ctx.bvValideer(f) === null, 'geldig met minimale velden');
let b = ctx.bvPayload(f);
ok(b.sleutel === f.sleutel && b.nieuwe_organisatie.naam === 'Synth BV' && !b.organisatie_id && b.traject_id === 'SYNT1' && b.vervolgacties.length === 1 && b.vervolgacties[0].eigenaar_id === 'U2' && b.zichtbaarheid === 'kantoor' && b.resultaat === null && !b.negeer_suggesties, 'payload: nieuwe relatie, mandaat, alleen ingevulde acties, geen resultaat verzonnen', JSON.stringify(b));
ok(typeof b.gesprek_op === 'number', 'payload: datum en tijd als tijdstip');
f.organisatie_id = 'org1'; f.contactpersoon_ids = ['c1']; f.prive = true; f.nieuw_contact = { naam: ' Synth Contact ', functie: '', email: '', telefoon: '' };
b = ctx.bvPayload(f, true);
ok(b.organisatie_id === 'org1' && !b.nieuwe_organisatie && b.contactpersoon_ids[0] === 'c1' && b.nieuwe_contacten[0].naam === 'Synth Contact' && b.zichtbaarheid === 'privé' && b.negeer_suggesties === true, 'payload: bestaande relatie, contacten, privé en bevestigde nieuwe');

// ── Lokale opslag ──
ok(ctx.bvLokaalBewaar(f) === true && JSON.parse(opslag['kvm-bezoek-concepten'])[f.sleutel].f.gesprek_type === 'Intake', 'concept lokaal bewaard');
ctx.bvLokaalWis(f.sleutel);
ok(!JSON.parse(opslag['kvm-bezoek-concepten'])[f.sleutel], 'concept lokaal gewist');
const kapot = ctx.window.localStorage; ctx.window.localStorage = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('geblokkeerd'); } };
ok(ctx.bvLokaalBewaar(f) === false && JSON.stringify(ctx.bvLokaalLees()) === '{}', 'geblokkeerde opslag (privévenster) breekt niets');
ctx.window.localStorage = kapot;

// ── Herhaling bij netwerkfout met dezelfde aanvraag ──
let pogingen = 0;
const r = await ctx.bvMetHerhaling(() => Promise.resolve(++pogingen < 3 ? { status: 0, json: {} } : { status: 200, json: { ok: true } }), [0, 0]);
ok(r.status === 200 && pogingen === 3, 'opslaan wordt na een netwerkfout twee keer herhaald');
pogingen = 0;
const r2 = await ctx.bvMetHerhaling(() => Promise.resolve(++pogingen && { status: 409, json: {} }), [0, 0]);
ok(r2.status === 409 && pogingen === 1, 'een inhoudelijke weigering (409) wordt niet herhaald');

// ── Volledige flow: openen, invullen, storing, opnieuw, duplicaatkeuze ──
antwoorden = [{ status: 200, json: context }, { status: 200, json: [{ id: 'org9', naam: 'Synth Bakkerij', plaats: 'Synthstad' }] }];
ctx.bvOpen({ traject_id: 'synt1' });
await wacht(); await wacht();
let h = el['bv-overlay'].innerHTML;
ok(h.includes('Relatie (verplicht)') && h.includes('Type gesprek (verplicht)') && h.includes('+ Vervolgactie') && !h.includes('<img') && h.includes('&lt;img'), 'formulier getekend, mandaatnaam en eigenaarnaam ge-escaped', h.match(/<img[^>]*>/));
ok(!/placeholder=/.test(h), 'geen voorbeeldtekst in velden');
ok(ctx.BV.f.traject_id === 'synt1' || ctx.BV.f.traject_id === 'SYNT1', 'mandaat uit de vooraf-invulling blijft staan als het in de scope valt');
ctx.bvZoek('bakk');
ok(ctx.bvOrgLijstHtml().includes('Synth Bakkerij') && ctx.bvOrgLijstHtml().includes('+ Nieuwe relatie: bakk'), 'zoeken toont treffer en de keuze voor een nieuwe relatie');
ctx.bvKies('gesprek_type', 'Kennismaking');
antwoorden.push({ status: 200, json: { ok: true } }, { status: 200, json: { contactpersonen: [{ id: 'c9', naam: 'Synth Persoon' }] } }); // eerst de concept-autosave, dan de contactpersonen
ctx.bvKiesOrg('org9'); await wacht();
ok(ctx.BV.f.organisatie_id === 'org9' && el['bv-overlay'].innerHTML.includes('Synth Persoon'), 'relatie gekozen en contactpersonen geladen');
ok(JSON.parse(opslag['kvm-bezoek-concepten'])[ctx.BV.f.sleutel].f.organisatie_id === 'org9', 'elke wijziging staat direct lokaal');
const conceptPost = posts.filter((p) => p.url.endsWith('/gebruikers/crm/bezoek/concept')).pop();
ok(conceptPost && JSON.parse(conceptPost.opts.body).sleutel === ctx.BV.f.sleutel && conceptPost.opts.headers['x-gebruiker-token'] === 'tok', 'concept ook naar de server met sleutel en token');
const sleutel = ctx.BV.f.sleutel;
ctx.BV_WACHT.length = 0; // geen wachttijd in de test
antwoorden.push({ netwerk: true });
ctx.bvOpslaan(); await wacht(); await wacht();
h = el['bv-overlay'].innerHTML;
ok(/veilig bewaard op dit apparaat/.test(h) && JSON.parse(opslag['kvm-bezoek-concepten'])[sleutel], 'storing: melding, scherm blijft open en concept blijft lokaal');
antwoorden.push({ status: 409, json: { code: 'MOGELIJK_DUPLICAAT', error: 'Deze relatie lijkt al te bestaan.', suggesties: [{ id: 'org9', naam: X, redenen: ['vergelijkbare naam'] }] } });
ctx.bvOpslaan(); await wacht(); await wacht();
h = el['bv-overlay'].innerHTML;
ok(h.includes('Bestaat deze relatie al?') && h.includes('Nee, dit is een nieuwe relatie') && !h.includes('<img'), 'mogelijke duplicaten: keuze aan de gebruiker, ge-escaped');
antwoorden.push({ status: 200, json: { ok: true, acties: [{ titel: 'Terugbellen' }] } });
ctx.bvOpslaan(true); await wacht(); await wacht();
const saves = posts.filter((p) => p.url.endsWith('/gebruikers/crm/bezoek'));
ok(saves.length === 3 && saves.every((p) => JSON.parse(p.opts.body).sleutel === sleutel) && JSON.parse(saves[2].opts.body).negeer_suggesties === true, 'alle pogingen met dezelfde sleutel (idempotent); bevestiging stuurt negeer_suggesties');
ok(ctx.BV === null && ctx.toasts.pop() === 'Bezoekverslag opgeslagen met 1 vervolgactie.' && !JSON.parse(opslag['kvm-bezoek-concepten'])[sleutel], 'na opslaan: gesloten, bevestiging, lokaal concept opgeruimd');

// ── Concept hervatten ──
const oud = ctx.bvLeegFormulier({}); oud.zoek = 'Synth Hervat'; oud.gesprek_type = 'Intake'; ctx.bvLokaalBewaar(oud);
antwoorden = [{ status: 200, json: context }, { status: 200, json: [] }];
ctx.bvOpen({}); await wacht(); await wacht();
ok(el['bv-overlay'].innerHTML.includes('Niet afgemaakt') && el['bv-overlay'].innerHTML.includes('Synth Hervat'), 'niet afgemaakt concept wordt aangeboden');
ctx.bvHervat(0);
ok(ctx.BV.f.sleutel === oud.sleutel && ctx.BV.f.gesprek_type === 'Intake', 'hervatten gebruikt dezelfde sleutel (geen tweede verslag)');
ctx.bvSluit();
// ── Module uit: nette melding ──
antwoorden = [{ status: 403, json: { error: 'De CRM-module is niet actief voor uw kantoor.' } }, { status: 403, json: {} }];
ctx.bvOpen({}); await wacht(); await wacht();
ok(el['bv-overlay'].innerHTML.includes('De CRM-module is niet actief'), 'zonder CRM-module: melding in plaats van formulier');
ctx.bvSluit();
ok(/bvOpen\(/.test(ctx.bvStartKnop({ traject_id: 'A' })) && ctx.bvStartKnop({ zoek: X }).indexOf('<img') < 0, 'startknop ge-escaped');

// ── Koppeling in adv.html en de handleidingen ──
const adv = fs.readFileSync(path.join(ROOT, 'adv.html'), 'utf8');
const hb = fs.readFileSync(path.join(ROOT, 'mna/08-handleiding.js'), 'utf8');
ok(adv.indexOf('<script src="adv-werkruimte.js"></script>') < adv.indexOf('<script src="adv-bezoek.js"></script>'), 'adv-bezoek.js geladen na adv-werkruimte.js');
ok((adv.match(/bvStartKnop\(/g) || []).length === 2, 'startknop op het dashboard en bij een mandaat');
ok(/Bezoekverslag \(Quick Visit\)/.test(adv) && /Bezoekverslag \(Quick Visit\)/.test(hb), 'handleiding bijgewerkt in adv.html en mna/08-handleiding.js');
ok(!/—/.test(fs.readFileSync(path.join(ROOT, 'adv-bezoek.js'), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')), 'geen gedachtestreepje in zichtbare teksten');
console.log(n + ' proeven, ' + fout + ' fout');
process.exit(fout ? 1 : 0);
