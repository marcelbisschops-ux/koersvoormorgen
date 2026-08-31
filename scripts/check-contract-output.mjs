// Controleert een GEGENEREERDE NDA / LoI / Bemiddelingsovereenkomst / Exclusiviteitsbrief /
// indicatieve biedingsbrief tegen de TEMPLATE waaruit hij is ingevuld. Vangt de drie dingen die
// bij het AI-invullen van een juridisch document misgaan:
//   1. een [placeholder tussen vierkante haken] die niet is vervangen (of juist een verzonnen waarde
//      op een plek waar de template een placeholder had)
//   2. een weggelaten of herschreven bepaling — elk artikel-/kopnummer uit de template moet nog in
//      de output staan
//   3. een verzonnen bedrag/datum/percentage dat niet uit de aangeleverde gegevens kon komen
//
// Gebruik:
//   node scripts/check-contract-output.mjs  gegenereerd.txt  --template template.txt
// Sla het gegenereerde document en de gebruikte template elk als .txt/.html op.
// Zonder --template draaien de placeholder- en verzin-checks nog wel, de bepalingen-check niet.

import fs from 'fs';

const args = process.argv.slice(2);
const tIdx = args.indexOf('--template');
const templateFile = tIdx >= 0 ? args[tIdx + 1] : null;
const file = args.find((a, i) => !a.startsWith('--') && i !== (tIdx + 1));
if (!file) { console.error('Geef het gegenereerde document op. Zie de kop van dit script.'); process.exit(2); }

const strip = s => s.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const out = strip(fs.readFileSync(file, 'utf8'));
const tpl = templateFile ? strip(fs.readFileSync(templateFile, 'utf8')) : null;

let fouten = 0, waarschuwingen = 0;
const fout = m => { console.log('  ✗ ' + m); fouten++; };
const warn = m => { console.log('  ⚠ ' + m); waarschuwingen++; };
const ok = m => console.log('  ✓ ' + m);

// ── 1. onvervangen placeholders ────────────────────────────────────────────
// Placeholders zoals [naam], [bedrag], [datum], [percentage], [•] — maar NIET normale tekst tussen
// haken zoals "[zie bijlage]" (langer dan ~40 tekens laten we met rust).
const ph = [...new Set((out.match(/\[[^\]\n]{1,40}\]/g) || []))].filter(p => !/^\[\s*\d+\s*\]$/.test(p));
if (ph.length) warn('Mogelijk onvervangen placeholder(s) in het gegenereerde document — controleer of dit bedoeld is:\n      ' + ph.join('  |  '));
else ok('Geen onvervangen [placeholders] in het document.');

// ── 2. bepalingen uit de template nog aanwezig ────────────────────────────
if (tpl) {
  // Herken artikel-/kopnummers: "Artikel 3", "Art. 3", "3.", "## Kop", genummerde clausules.
  const koppenRe = /(?:\bArtikel\s+\d+[a-z]?\b|\bArt\.?\s*\d+[a-z]?\b|##\s+[^\n]{3,60})/gi;
  const tplKoppen = [...new Set((tpl.match(koppenRe) || []).map(s => s.replace(/\s+/g, ' ').trim()))];
  const missend = tplKoppen.filter(k => {
    // "Artikel 3" moet als "Artikel 3" (of "Art. 3") ergens in de output staan
    const num = (k.match(/\d+[a-z]?/) || [''])[0];
    if (/artikel|art\./i.test(k) && num) return !new RegExp('(artikel|art\\.?)\\s*' + num + '\\b', 'i').test(out);
    return !out.includes(k.replace(/^##\s+/, ''));
  });
  if (!tplKoppen.length) warn('Geen artikel-/kopnummers in de template herkend — bepalingen-check overgeslagen (template-formaat?).');
  else if (missend.length) fout('Bepaling(en) uit de template ontbreken in het gegenereerde document:\n      ' + missend.join('  |  '));
  else ok(tplKoppen.length + ' artikel-/kopnummers uit de template komen allemaal terug in het document.');

  // Grove lengtecontrole: een ingevuld document is normaal niet veel korter dan de template.
  if (out.length < tpl.length * 0.55) warn('Het gegenereerde document is fors korter dan de template (' + out.length + ' vs ' + tpl.length + ' tekens) — mogelijk afgekapt of ingekort.');
} else {
  ok('(geen --template opgegeven — bepalingen-check overgeslagen)');
}

// ── 3. bedragen/percentages die er verdacht "verzonnen" uitzien ────────────
// In een NDA/LoI horen meestal alleen bedragen/percentages die uit de dealparameters komen. Zonder
// die parameterlijst kunnen we alleen signaleren, niet hard afkeuren.
const bedragen = [...new Set((out.match(/€\s?\d[\d.\s]*\d(?:,\d{2})?|\b\d{1,3}(?:[.,]\d+)?\s?%/g) || []))];
if (bedragen.length) warn('Bedragen/percentages in het document — verifieer dat elk overeenkomt met de dealparameters en niet door de AI is ingevuld:\n      ' + bedragen.join('  |  '));
else ok('Geen losse bedragen/percentages in het document.');

console.log('');
if (fouten) { console.log('✗ ' + fouten + ' fout(en)' + (waarschuwingen ? ' + ' + waarschuwingen + ' waarschuwing(en)' : '') + '.'); process.exit(1); }
if (waarschuwingen) { console.log('⚠ ' + waarschuwingen + ' waarschuwing(en) — geen harde fout, wel nakijken.'); process.exit(0); }
console.log('✓ Alle checks OK.');
process.exit(0);
