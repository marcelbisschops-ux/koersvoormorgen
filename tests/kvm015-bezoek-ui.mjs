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
antwoorden.push({ status: 200, json: { ok: true } }, { status: 200, json: { ok: true, organisatie: { id: 'org9', naam: 'Synth Bakkerij' }, contactpersonen: [{ id: 'c9', naam: 'Synth Persoon' }], gesprekken: [{ id: 'g1', gesprek_type: 'Intake', resultaat: 'Positief', gesprek_op: 1, tekst: X, vervolgacties: [X] }], open_taken: [{ id: 't1', titel: X, eigenaar_naam: 'Synth', deadline: '2026-12-01' }], kansen: [{ id: 'k1', type: 'sell-side', fase: 'in_gesprek', omschrijving: X }] } }); // eerst de concept-autosave, dan de briefing
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
ctx.bvAndereOrg(); ctx.BV.f.zoek = 'Synth Nieuwe Relatie'; ctx.bvNieuweOrg();
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

// ── Fase C: briefing, pijplijn, relatiegegevens met conflictkeuze (crm-ingang) ──
antwoorden = [{ status: 200, json: Object.assign({}, context, { kans_fasen: ['nieuw', 'in_gesprek', 'onderhandeling'], ai: true, transcriptie: { beschikbaar: false } }) }, { status: 200, json: [{ id: 'org9', naam: 'Synth Bakkerij' }] }];
ctx.bvOpen({}); await wacht(); await wacht();
antwoorden.push({ status: 200, json: { ok: true } }, { status: 200, json: { ok: true, organisatie: { id: 'org9', naam: 'Synth Bakkerij' }, contactpersonen: [], gesprekken: [{ id: 'g1', gesprek_type: 'Intake', resultaat: 'Positief', gesprek_op: 1, tekst: X, vervolgacties: [X] }], open_taken: [{ id: 't1', titel: X, eigenaar_naam: 'Synth', deadline: '2026-12-01' }], kansen: [{ id: 'k1', type: 'sell-side', fase: 'in_gesprek', omschrijving: X }] } });
ctx.bvKiesOrg('org9'); await wacht();
h = el['bv-overlay'].innerHTML;
ok(h.includes('Briefing: wat speelde er al') && h.includes('Afgesproken:') && h.includes('Open taken') && h.includes('Verkoopkant, fase In gesprek') && !h.includes('<img'), 'briefing toont eerdere gesprekken, afspraken, open taken en kansen, ge-escaped');
ok(h.includes('Pijplijn') && h.includes('Fase bijwerken: Verkoopkant (nu In gesprek)') && h.includes('Gegevens van de relatie bijwerken'), 'pijplijn en relatiegegevens zichtbaar bij een bestaande relatie');
ok(!/Inspreken/.test(h) && h.includes('Voorstel uit notities'), 'geen opnameknop zolang er geen dienst is gekozen; voorstelknop wel');
ctx.bvKies('gesprek_type', 'Intake');
let pl = ctx.bvPayload(ctx.BV.f);
ok(!pl.kans && !pl.profiel, 'zonder keuze geen kans en geen profielwijziging in de payload');
ctx.bvKansZet('k1'); ctx.bvZetSub('kans', 'fase', 'onderhandeling');
ctx.bvZetSub('profiel', 'plaats', 'Synthdorp');
pl = ctx.bvPayload(ctx.BV.f);
ok(pl.kans.actie === 'fase' && pl.kans.opportunity_id === 'k1' && pl.kans.fase === 'onderhandeling' && pl.profiel.plaats === 'Synthdorp' && !pl.profiel_bevestigd, 'payload: fase bestaande kans en profielveld, nog zonder bevestiging');
ctx.bvKansZet('nieuw');
ok(ctx.bvValideer(ctx.BV.f) === 'Kies of de kans aan de verkoop- of aankoopkant zit.', 'nieuwe kans vraagt de kant (nooit gokken)');
ctx.bvZetSub('kans', 'type', 'buy-side');
ok(ctx.bvPayload(ctx.BV.f).kans.type === 'buy-side' && ctx.bvPayload(ctx.BV.f).kans.fase === 'nieuw', 'nieuwe kans aan de aankoopkant, fase nieuw');
antwoorden.push({ status: 409, json: { code: 'PROFIEL_CONFLICT', error: 'De relatie heeft al andere gegevens.', conflicten: [{ veld: 'plaats', huidig: X, nieuw: 'Synthdorp' }] } });
ctx.bvOpslaan(); await wacht(); await wacht();
h = el['bv-overlay'].innerHTML;
ok(h.includes('Welke gegevens kloppen?') && h.includes('Gebruik Synthdorp') && h.includes('Houd &lt;img'), 'conflict: beide waarden met keuze, ge-escaped');
ctx.bvConflictKies('plaats', true);
ok(ctx.bvPayload(ctx.BV.f).profiel_bevestigd.join() === 'plaats', 'gekozen nieuwe waarde wordt als bevestigd meegestuurd');
ctx.bvConflictKies('plaats', false);
ctx.BV.conflicten = [{ veld: 'plaats', huidig: 'A', nieuw: 'B' }]; ctx.bvConflictKies('plaats', false);
ok(!ctx.bvPayload(ctx.BV.f).profiel && ctx.BV.f.profiel_bevestigd.length === 0, 'huidige waarde houden: veld niet meer meegestuurd');
antwoorden.push({ status: 409, json: { code: 'KVK_IN_GEBRUIK', error: 'Dit KvK-nummer hoort bij een andere relatie.', suggesties: [{ id: 'org8', naam: 'Synth Ander' }] } });
ctx.bvOpslaan(); await wacht(); await wacht();
ok(el['bv-overlay'].innerHTML.includes('Gebruik Synth Ander') && el['bv-overlay'].innerHTML.includes('zelfde KvK-nummer') && !el['bv-overlay'].innerHTML.includes('Nee, dit is een nieuwe relatie'), 'KvK-nummer in gebruik: andere relatie voorgesteld, geen samenvoegen');

// ── Fase B: voorstel met bevestiging per onderdeel ──
ctx.BV.f.tekst = 'kort';
ctx.bvVoorstelVraag();
ok(/eerst wat notities/.test(el['bv-overlay'].innerHTML) && !posts.some((p) => p.url.endsWith('/voorstel')), 'te weinig tekst: geen aanvraag');
ctx.BV.f.tekst = 'Synth notities over een kennismaking met de DGA die volgend jaar wil verkopen.';
antwoorden.push({ status: 200, json: { ok: true, voorstel: { samenvatting: X, gesprek_type: 'Kennismaking', resultaat: 'Positief', perspectief: null, vervolgacties: [{ soort: 'Terugbellen', omschrijving: 'prijs', deadline: '2026-12-03' }] } } });
ctx.bvVoorstelVraag(); await wacht(); await wacht();
const vp = posts.filter((p) => p.url.endsWith('/gebruikers/crm/bezoek/voorstel')).pop();
h = el['bv-overlay'].innerHTML;
ok(vp && vp.opts.headers['x-gebruiker-token'] === 'tok' && h.includes('vink aan wat je wilt overnemen') && !h.includes('<img') && !h.includes('Commercieel perspectief: <strong>'), 'voorstel getoond (ge-escaped), alleen gevulde onderdelen');
ok(ctx.BV.f.gesprek_type === 'Intake', 'voorstel verandert niets zolang niet is bevestigd');
ctx.bvVoorstelVink('gesprek_type', true); ctx.bvVoorstelVink('actie0', true);
const aantalActies = ctx.BV.f.vervolgacties.length;
ctx.bvVoorstelOvernemen();
ok(ctx.BV.f.gesprek_type === 'Kennismaking' && ctx.BV.f.resultaat !== 'Positief' && ctx.BV.f.vervolgacties.length === aantalActies + 1 && ctx.BV.f.vervolgacties[aantalActies].deadline === '2026-12-03' && !/Samenvatting:/.test(ctx.BV.f.tekst) && ctx.BV.voorstel === null, 'alleen aangevinkte onderdelen overgenomen');
const pure = ctx.bvVoorstelToepassen({ tekst: 'a', vervolgacties: [] }, { samenvatting: 'b', vervolgacties: [] }, { samenvatting: true }, 'U1');
ok(pure.tekst === 'a\n\nSamenvatting: b', 'samenvatting wordt toegevoegd, niet vervangen');
ctx.bvSluit();

// ── Ingang begeleider (mna.html) ──
ctx.S = { traject: { id: 'SYNTA1' }, _bgKey: 'TUSSEN-SYNTH' };
antwoorden = [{ status: 200, json: { ok: true, modus: 'traject', traject: { id: 'SYNTA1', naam: X }, lijsten, eigenaren: [{ id: 'UA', naam: 'Synth Eigenaar' }], transcriptie: { beschikbaar: false }, ai: true } }];
const voorPosts = posts.length;
ctx.bvOpenBegeleider(); await wacht(); await wacht();
const ctxReq = posts[voorPosts];
ok(ctxReq.url.endsWith('/mna/bezoek/context/SYNTA1') && ctxReq.opts.headers['x-tussen-key'] === 'TUSSEN-SYNTH' && !ctxReq.opts.headers['x-gebruiker-token'], 'begeleider: context met tussencode, zonder adviseurstoken');
h = el['bv-overlay'].innerHTML;
ok(h.includes('Bezoekverslag · &lt;img') && h.includes('Gesproken met') && !h.includes('Relatie (verplicht)') && !h.includes('Pijplijn') && !h.includes('Alleen voor mij'), 'begeleider: titel met mandaat (ge-escaped), geen relatiekeuze of pijplijn');
ok(ctx.bvValideer(ctx.BV.f) === 'Kies het type gesprek.', 'begeleider: alleen type gesprek verplicht');
ctx.bvZet('deelnemers', 'Synth DGA'); ctx.bvKies('gesprek_type', 'Voortgangsgesprek'); ctx.bvActieErbij(); ctx.bvActieZet(0, 'soort', 'Informatie opvragen');
ok(ctx.BV.f.vervolgacties[0].eigenaar_id === 'UA', 'begeleider: standaard de eerste verantwoordelijke van het mandaat');
const tp = ctx.bvPayload(ctx.BV.f);
ok(tp.deelnemers === 'Synth DGA' && !tp.organisatie_id && !tp.nieuwe_organisatie && !tp.zichtbaarheid && tp.vervolgacties.length === 1, 'begeleider: payload zonder relatievelden', JSON.stringify(tp));
const voorConcept = posts.filter((p) => p.url.indexOf('/bezoek/concept') >= 0).length;
ctx.bvZet('tekst', 'x');
ok(posts.filter((p) => p.url.indexOf('/bezoek/concept') >= 0).length === voorConcept && JSON.parse(opslag['kvm-bezoek-concepten'])[ctx.BV.f.sleutel].f.modus === 'traject', 'begeleider: concept alleen op dit apparaat (geen crm-concept)');
antwoorden.push({ status: 200, json: { ok: true, nieuw: true, acties: [{ titel: 'Informatie opvragen' }] } });
ctx.bvOpslaan(); await wacht(); await wacht();
const tsave = posts.filter((p) => p.url.endsWith('/mna/bezoek/opslaan/SYNTA1')).pop();
ok(tsave && tsave.opts.headers['x-tussen-key'] === 'TUSSEN-SYNTH' && ctx.BV === null && ctx.toasts.indexOf('Het verslag staat in het gesprekslogboek van dit mandaat.') >= 0, 'begeleider: opgeslagen via de mandaatroute, melding gesprekslogboek');
antwoorden = [{ status: 200, json: { ok: true, modus: 'traject', traject: { id: 'SYNTA1', naam: 'x' }, lijsten, eigenaren: [], afgesloten: true } }];
ctx.bvOpenBegeleider(); await wacht(); await wacht();
ok(/afgesloten/.test(el['bv-overlay'].innerHTML) && !/Opslaan/.test(el['bv-overlay'].innerHTML), 'afgesloten mandaat: melding, geen formulier');
ctx.bvSluit();

// ── Dashboardblok ──
const dh = ctx.bvDashboardHtml({ recent: [{ organisatie_naam: X, gesprek_type: 'Intake', resultaat: 'Positief', gesprek_op: 1 }], meting: { verslagen_deze_maand: 3, vervolgacties_deze_maand: 4, open_taken: 1, mediaan_invoertijd_sec: 52 } }, [{ id: 't1', titel: X, organisatie_naam: 'Synth', deadline: '2026-12-01' }]);
ok(dh.includes('<strong>3</strong>') && dh.includes('52 s') && dh.includes('Afgerond') && !dh.includes('<img'), 'dashboardblok: meting, open taken met afronden, ge-escaped');
ok(ctx.bvDashboardHtml({ recent: [], meting: { mediaan_invoertijd_sec: null } }, []).includes('<strong>-</strong>'), 'invoertijd zonder meting: geen verzonnen getal');
const mna = fs.readFileSync(path.join(ROOT, 'mna.html'), 'utf8'), m04 = fs.readFileSync(path.join(ROOT, 'mna/04-begeleider-dashboard.js'), 'utf8');
ok(mna.indexOf('<script src="mna/08-handleiding.js"></script>') < mna.indexOf('<script src="adv-bezoek.js"></script>') && /onclick="bvOpenBegeleider\(\)"/.test(m04), 'mna.html laadt de module en het begeleidersdashboard heeft de knop');
ok(adv.includes('<div id="bv-dashboard"></div>') && /bvDashboardBlok\(\)/.test(adv), 'dashboardblok in het adviseursportaal');
ok(!/SpeechRecognition|webkitSpeech/.test(fs.readFileSync(path.join(ROOT, 'adv-bezoek.js'), 'utf8')), 'geen spraakherkenning van de browser');
console.log(n + ' proeven, ' + fout + ' fout');
process.exit(fout ? 1 : 0);
