// Controleert een GEGENEREERD dealvoorstel (of de losse interne bijlage) op de vier dingen die
// bij een AI-tekst misgaan en die je niet uit de deterministische tabellen kunt afvangen:
//   1. een [TABEL:xxx]-markering die niet is vervangen
//   2. een gelekte onderhandelpositie in het DEELBARE dealvoorstel (BATNA / walk-awayprijs)
//   3. een euro-bedrag in de lopende tekst dat NERGENS in de ingevoegde tabellen voorkomt
//      (indicatie van een door de AI verzonnen bedrag)
//   4. een half afgekapt document (eindigt niet netjes; laatste verwachte hoofdstuk ontbreekt)
//
// Dit vervangt geen menselijke lezing — het vangt de categorie fouten die een mens juist mist.
//
// Gebruik:
//   node scripts/check-dealvoorstel-output.mjs pad/naar/dealvoorstel.html   [--bijlage]
// Sla het gegenereerde dealvoorstel op als .html of .txt (kopieer de inhoud van #dv-preview;
// voor de interne bijlage: #dv-bijlage + de vlag --bijlage zodat de BATNA-check NIET aanslaat).

import fs from 'fs';

const args = process.argv.slice(2);
const isBijlage = args.includes('--bijlage');
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('Geef een bestand op. Zie de kop van dit script.'); process.exit(2); }
const raw = fs.readFileSync(file, 'utf8');

// Ruwe tekst zonder tags (voor de tekst-checks) en de HTML-tabelinhoud apart.
const platte = raw.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&euro;/g, '€').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const tabelHtml = (raw.match(/<table[\s\S]*?<\/table>/gi) || []).join(' ').replace(/<[^>]+>/g, ' ').replace(/&euro;/g, '€').replace(/&nbsp;/g, ' ');

let fouten = 0, waarschuwingen = 0;
const fout = m => { console.log('  ✗ ' + m); fouten++; };
const warn = m => { console.log('  ⚠ ' + m); waarschuwingen++; };
const ok = m => console.log('  ✓ ' + m);

// ── 1. onvervangen tabelmarkeringen ─────────────────────────────────────────
const markers = raw.match(/\[TABEL:\w+\]/g);
if (markers) fout('Onvervangen tabelmarkering(en): ' + [...new Set(markers)].join(', '));
else ok('Geen onvervangen [TABEL:xxx]-markeringen.');

// ── 2. gelekte onderhandelpositie in het deelbare dealvoorstel ──────────────
if (!isBijlage) {
  const lek = [/\bBATNA\b/i, /walk-?away/i, /walk-?awayprijs/i].filter(re => re.test(platte));
  if (lek.length) fout('DEELBAAR dealvoorstel bevat onderhandelpositie-termen (' + lek.map(r => r.source).join(', ') + ') — die horen alleen in de interne bijlage.');
  else ok('Geen BATNA/walk-away-termen in het deelbare dealvoorstel.');
} else {
  ok('(interne bijlage — BATNA/walk-away-check overgeslagen)');
}

// ── 3. euro-bedragen in de prozatekst die niet in een tabel staan ───────────
// Normaliseer bedragen naar cijfers zodat "€ 1.234.567" en "€1.234.567,00" matchen.
const normBedrag = s => s.replace(/[^\d]/g, '');
const prozaTekst = platte.replace(/<table[\s\S]*?<\/table>/gi, ' ');
// Alle bedragen in de tekst; alleen "serieuze" bedragen (>= 4 cijfers) om jaartallen/percentages te mijden.
const bedragRe = /€\s?\d{1,3}(?:[.\s]\d{3})+(?:,\d{2})?|€\s?\d{4,}(?:,\d{2})?/g;
const inTabel = new Set((tabelHtml.match(bedragRe) || []).map(normBedrag));
const prozaBedragen = [...new Set((prozaTekst.match(bedragRe) || []).map(s => s))];
const nietGedekt = prozaBedragen.filter(b => {
  const n = normBedrag(b);
  // sta een afronding op mln toe: check ook of het bedrag als "x,xx mln" ergens in een tabel staat
  if (inTabel.has(n)) return false;
  const mln = (parseInt(n, 10) / 1e6);
  const mlnStr = mln.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (tabelHtml.includes(mlnStr)) return false;
  return true;
});
if (nietGedekt.length) warn('Bedrag(en) in de lopende tekst die niet 1-op-1 in een ingevoegde tabel staan — handmatig verifiëren of ze kloppen of verzonnen zijn:\n      ' + nietGedekt.join('  |  '));
else ok('Alle euro-bedragen in de lopende tekst komen ook in een tabel voor.');

// ── 4. afgekapt document ───────────────────────────────────────────────────
const eindigtNetjes = /[.!?)"'\]]\s*$/.test(platte) || /vervolgstappen|closing|notaris|termsheet/i.test(platte.slice(-400));
if (platte.length < 400) fout('Document is verdacht kort (' + platte.length + ' tekens) — mogelijk mislukte generatie.');
else if (!eindigtNetjes) warn('Document lijkt niet netjes af te sluiten (laatste 400 tekens bevatten geen afsluitend hoofdstuk/zin) — controleer op afkapping.');
else ok('Document sluit netjes af.');

console.log('');
if (fouten) { console.log('✗ ' + fouten + ' fout(en)' + (waarschuwingen ? ' + ' + waarschuwingen + ' waarschuwing(en)' : '') + '.'); process.exit(1); }
if (waarschuwingen) { console.log('⚠ ' + waarschuwingen + ' waarschuwing(en) — geen harde fout, wel nakijken.'); process.exit(0); }
console.log('✓ Alle checks OK.');
process.exit(0);
