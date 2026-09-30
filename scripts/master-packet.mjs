#!/usr/bin/env node
// Efficiency-optimalisatie #1 (Marcel, 26 sep 2026, structurele efficiency-optimalisatie):
// "compact execution packet per MASTER-ID" — geeft precies de sectie van één MASTER-item terug
// (heading tot de volgende ##/### heading), zonder dat een Claude-sessie de volledige, duizenden
// regels lange MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md moet lezen/grepen om dedup/context/
// acceptatiecriteria te vinden. Puur deterministisch (regex/tekstverwerking), geen AI, geen
// netwerktoegang, geen schrijfactie op de MASTER zelf.
//
// Gebruik: node scripts/master-packet.mjs <MASTER-ID> [--json]
// Voorbeeld: node scripts/master-packet.mjs P1-6
//            node scripts/master-packet.mjs N-71 --json
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MASTER_PAD = path.join(new URL('.', import.meta.url).pathname, '..', 'MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function vindSecties(tekst, id) {
  const regels = tekst.split('\n');
  const idRe = new RegExp('(^|[\\s/])' + escapeRegExp(id) + '([\\s/]|$)');
  const kopRe = /^(#{2,3})\s/;
  const treffers = [];
  for (let i = 0; i < regels.length; i++) {
    const m = regels[i].match(kopRe);
    if (!m) continue;
    if (m[1] !== '###') continue; // alleen item-koppen (###), geen hoofdstuk-koppen (##)
    // Alleen het ID-gedeelte vóór de eerste — checken, niet de volledige kopregel — anders matcht
    // een ID dat toevallig in de TITEL van een ander item wordt genoemd (bijv. "N-69 — ... N-67
    // technisch afdwingen" noemt N-67 in zijn eigen titel; dat is geen tweede N-67-registratie).
    const idDeel = regels[i].replace(/^###\s*/, '').split('—')[0];
    if (!idRe.test(idDeel)) continue;
    treffers.push(i);
  }
  return treffers.map((startIdx) => {
    let eindIdx = regels.length;
    for (let j = startIdx + 1; j < regels.length; j++) {
      if (kopRe.test(regels[j])) { eindIdx = j; break; }
    }
    return { startRegel: startIdx + 1, eindRegel: eindIdx, tekst: regels.slice(startIdx, eindIdx).join('\n').trimEnd() };
  });
}

function main() {
  const args = process.argv.slice(2);
  const alsJson = args.includes('--json');
  const id = args.find((a) => !a.startsWith('--'));
  if (!id) {
    console.error('Gebruik: node scripts/master-packet.mjs <MASTER-ID> [--json]');
    process.exit(2);
  }
  let tekst;
  try {
    tekst = readFileSync(MASTER_PAD, 'utf8');
  } catch (e) {
    console.error('FOUT: kan MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md niet lezen: ' + e.message);
    process.exit(2);
  }
  const treffers = vindSecties(tekst, id);
  if (treffers.length === 0) {
    console.error('GEEN TREFFER: MASTER-ID "' + id + '" niet gevonden als itemkop (###) in MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md.');
    process.exit(1);
  }
  if (treffers.length > 1) {
    console.error('MEERDERE TREFFERS voor "' + id + '" (regels: ' + treffers.map((t) => t.startRegel).join(', ') + ') — dubbele/dubbelzinnige MASTER-ID, niet automatisch gekozen. Los de dubbele registratie op (zie N-76-achtige bevinding) of geef een specifieker ID.');
    process.exit(1);
  }
  const sectie = treffers[0];
  if (alsJson) {
    console.log(JSON.stringify({ id, start_regel: sectie.startRegel, eind_regel: sectie.eindRegel, tekst: sectie.tekst }, null, 2));
  } else {
    console.log(sectie.tekst);
  }
}

main();
