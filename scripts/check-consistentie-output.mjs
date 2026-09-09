#!/usr/bin/env node
// check-consistentie-output.mjs — valideert een échte respons van POST /mna/consistentie/check/{code}
// tegen de gouden-standaard-regels (werkregel 8/19). Draaien ná het genereren van een check:
//
//   curl -s -X POST "$WORKER/mna/consistentie/check/UZ12345" -H "x-tussen-key: <code>" > /tmp/cons.json
//   node scripts/check-consistentie-output.mjs /tmp/cons.json
//
// Faalt (exit 1) als: niet exact 7 checks, een onbekende status, een afwijking zonder beide
// documentnamen, of een toelichting die tóch een oordeel over juistheid velt.

import fs from 'node:fs';

const pad = process.argv[2];
if (!pad) { console.error('Gebruik: node scripts/check-consistentie-output.mjs <respons.json>'); process.exit(2); }

let data;
try { data = JSON.parse(fs.readFileSync(pad, 'utf8')); }
catch (e) { console.error('Kan JSON niet lezen: ' + e.message); process.exit(2); }

const VERWACHTE_SLEUTELS = [
  'omzet_jr_memo', 'werknemers_loon', 'aandeelhouders_ubo', 'fiscale_eenheid_organogram',
  'rc_koopprijs', 'pensioen_bonus_spa', 'ebitda_normalisaties_grootboek',
];
const STATUSSEN = ['consistent', 'afwijking', 'onvoldoende_data'];
// woorden die verraden dat het model tóch partij kiest
const OORDEEL_RE = /\b(leidend|leidende|correct|juiste?|onjuist|klopt niet|foutief|moet zijn|de werkelijke)\b/i;

let fouten = 0;
const meld = (m) => { console.log('  ✗ ' + m); fouten++; };

const res = Array.isArray(data.resultaten) ? data.resultaten : [];
if (res.length !== 7) meld('verwacht 7 checkresultaten, kreeg ' + res.length);

const gezien = new Set();
for (const r of res) {
  const s = r.check_sleutel || r.sleutel || '(geen sleutel)';
  gezien.add(s);
  if (!VERWACHTE_SLEUTELS.includes(s)) meld('onbekende check-sleutel: ' + s);
  if (!STATUSSEN.includes(String(r.status))) meld('[' + s + '] ongeldige status: ' + r.status);
  if (r.status === 'afwijking') {
    if (!r.doc_a || !r.doc_b) meld('[' + s + '] afwijking zonder beide documentnamen (doc_a="' + (r.doc_a || '') + '", doc_b="' + (r.doc_b || '') + '")');
    if (!r.waarde_a && !r.waarde_b) meld('[' + s + '] afwijking zonder enige waarde');
  }
  if (r.toelichting && OORDEEL_RE.test(r.toelichting)) {
    meld('[' + s + '] toelichting velt een oordeel over juistheid: "' + r.toelichting + '"');
  }
}
for (const k of VERWACHTE_SLEUTELS) if (!gezien.has(k)) meld('check ontbreekt in de respons: ' + k);

if (fouten) { console.log('\n' + fouten + ' probleem(en) — de consistentie-output voldoet niet aan de gouden standaard.'); process.exit(1); }
console.log('  ✓ 7 checks, geldige statussen, afwijkingen met bronvermelding, geen oordeel over juistheid.');
