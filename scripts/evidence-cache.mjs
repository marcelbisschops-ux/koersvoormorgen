#!/usr/bin/env node
// Efficiency-optimalisatie #3 (Marcel, 26 sep 2026): "test-/bewijs-hergebruik". Onderbouwt of een
// eerder bewezen testresultaat voor een MASTER-ID nog geldig is, puur op basis van de daadwerkelijke
// bestandsinhoud (SHA256, geen git-aannames nodig) + een expliciet opgegeven testversie-string
// (bijv. "audit-consistentie.mjs@2026-09-20" of "e2e-3rollen-regressie@v3"). Verandert een van de
// opgegeven bestanden, of wordt een andere testversie opgegeven, dan is het bewijs automatisch
// ongeldig — nooit stilzwijgend hergebruikt. Puur lokaal/deterministisch, geen netwerktoegang, geen
// AI, geen productie-actie. Vervangt geen enkele verplichte security-/release-/regressietest — dit is
// uitsluitend een hulpmiddel om te BESLISSEN of een kostbare herhaling nodig is, nooit een vervanging
// van het daadwerkelijk uitvoeren ervan wanneer het antwoord "nee, opnieuw testen" is.
//
// Gebruik:
//   node scripts/evidence-cache.mjs check  <MASTER-ID> --files <f1,f2,...> --testversie <naam@versie>
//     -> exit 0  + "REUSE"          als een identiek eerder bewijs met resultaat=pass bestaat
//     -> exit 3  + "OPNIEUW TESTEN" als er geen (geldig) eerder bewijs is, of het laatste resultaat fail was
//     -> exit 2  bij een argumentfout
//   node scripts/evidence-cache.mjs record <MASTER-ID> --files <f1,f2,...> --testversie <naam@versie> --resultaat pass|fail --bewijs "<tekst>"
//     -> legt het resultaat vast onder de huidige fingerprint van die bestanden+testversie
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const CACHE_PAD = path.join(new URL('.', import.meta.url).pathname, '..', 'reports', 'evidence-cache.json');

function leesCache() {
  if (!existsSync(CACHE_PAD)) return {};
  try { return JSON.parse(readFileSync(CACHE_PAD, 'utf8')); } catch { return {}; }
}

function schrijfCache(cache) {
  writeFileSync(CACHE_PAD, JSON.stringify(cache, null, 2));
}

function bestandHash(p) {
  const inhoud = readFileSync(p);
  return createHash('sha256').update(inhoud).digest('hex');
}

function berekenFingerprint(files, testversie) {
  const hash = createHash('sha256');
  hash.update('testversie:' + testversie + '\n');
  for (const f of [...files].sort()) {
    let h;
    try { h = bestandHash(f); } catch (e) { h = 'ONLEESBAAR:' + e.message; }
    hash.update(f + ':' + h + '\n');
  }
  return hash.digest('hex');
}

function parseArgs(rest) {
  const out = { files: [], testversie: null, resultaat: null, bewijs: null };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--files') { out.files = (rest[++i] || '').split(',').filter(Boolean); }
    else if (rest[i] === '--testversie') { out.testversie = rest[++i]; }
    else if (rest[i] === '--resultaat') { out.resultaat = rest[++i]; }
    else if (rest[i] === '--bewijs') { out.bewijs = rest[++i]; }
  }
  return out;
}

function main() {
  const [cmd, masterId, ...rest] = process.argv.slice(2);
  if (!cmd || !masterId || !['check', 'record'].includes(cmd)) {
    console.error('Gebruik: node scripts/evidence-cache.mjs check|record <MASTER-ID> --files <f1,f2,...> --testversie <naam@versie> [--resultaat pass|fail --bewijs "..."]');
    process.exit(2);
  }
  const args = parseArgs(rest);
  if (!args.files.length || !args.testversie) {
    console.error('FOUT: --files en --testversie zijn verplicht.');
    process.exit(2);
  }
  const ontbrekend = args.files.filter((f) => !existsSync(f));
  if (ontbrekend.length) {
    console.error('FOUT: bestand(en) niet gevonden: ' + ontbrekend.join(', '));
    process.exit(2);
  }
  const fingerprint = berekenFingerprint(args.files, args.testversie);
  const cache = leesCache();

  if (cmd === 'check') {
    const entry = cache[masterId];
    if (entry && entry.fingerprint === fingerprint && entry.resultaat === 'pass') {
      console.log('REUSE: geldig bewijs van ' + entry.vastgelegd_op + ' (' + args.files.length + ' bestand(en), testversie ' + args.testversie + ') — ' + (entry.bewijs || ''));
      process.exit(0);
    }
    if (entry && entry.fingerprint !== fingerprint) {
      console.log('OPNIEUW TESTEN: relevante inhoud of testversie is gewijzigd sinds het laatste bewijs (' + (entry.vastgelegd_op || 'onbekend') + ') — vorig bewijs is ongeldig.');
    } else if (entry && entry.resultaat !== 'pass') {
      console.log('OPNIEUW TESTEN: laatst vastgelegde resultaat voor deze exacte inhoud was "' + entry.resultaat + '", geen geldig pass-bewijs.');
    } else {
      console.log('OPNIEUW TESTEN: nog geen eerder bewijs vastgelegd voor deze combinatie van bestanden + testversie.');
    }
    process.exit(3);
  }

  // record
  if (!args.resultaat || !['pass', 'fail'].includes(args.resultaat)) {
    console.error('FOUT: --resultaat pass|fail is verplicht bij record.');
    process.exit(2);
  }
  cache[masterId] = {
    fingerprint,
    resultaat: args.resultaat,
    bewijs: args.bewijs || '',
    testversie: args.testversie,
    files: args.files,
    vastgelegd_op: new Date().toISOString(),
  };
  schrijfCache(cache);
  console.log('VASTGELEGD: ' + masterId + ' — resultaat=' + args.resultaat + ', fingerprint=' + fingerprint.slice(0, 12) + '...');
}

main();
