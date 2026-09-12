#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// Impact-surface-tool (werkregel 29, 12 sep 2026) — deterministisch, geen AI.
//
// Doel: bij een rol-/rechten-/workflow-wijziging automatisch ALLE vindplaatsen
// van een patroon opsommen (call-sites van een route/functie, plus de
// bekende "hetzelfde patroon op een andere manier"-varianten), zodat een
// controle niet afhankelijk is van wat een AI-review toevallig bedenkt te
// zoeken. Vervangt geen menselijk/AI-oordeel over WAT relevant is, maar
// garandeert dat elke letterlijke match wordt getoond — mechanisch, niet
// interpretatief.
//
// Gebruik:
//   node scripts/impact-surface.mjs "/mna/save"
//   node scripts/impact-surface.mjs "rolVanCode" --context=2
//   node scripts/impact-surface.mjs "mna_documenten" --tables
//
// Zonder argument: draait de vaste, bekende risico-patronen (zie
// VASTE_PATRONEN hieronder) — de kortste weg naar "is er ergens NIEUW
// hetzelfde soort gat als de begeleider-financieel-fix van 12 sep 2026?".
// ══════════════════════════════════════════════════════════════════
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const BACKEND_ROOT = path.join(REPO_ROOT, '..', 'koersvoormorgen-backend', 'backend');

function grep(pattern, globs, opts = {}) {
  const ctx = opts.context ? `-C ${opts.context}` : '';
  const dirs = globs.join(' ');
  try {
    const out = execSync(`grep -rn ${ctx} -E "${pattern}" ${dirs} 2>/dev/null`, { cwd: opts.cwd || REPO_ROOT, maxBuffer: 10 * 1024 * 1024 }).toString();
    return out.trim();
  } catch (e) {
    // grep exit 1 = geen match, geen fout
    return '';
  }
}

function sectie(titel, inhoud) {
  console.log('\n' + '─'.repeat(70));
  console.log(titel);
  console.log('─'.repeat(70));
  console.log(inhoud || '(geen treffers)');
}

const ctxArg = process.argv.find(a => a.startsWith('--context='));
const context = ctxArg ? parseInt(ctxArg.split('=')[1], 10) : 0;
const wantTables = process.argv.includes('--tables');
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));

if (arg) {
  // ── Vrije zoekopdracht: alle vindplaatsen van één patroon, backend + frontend ──
  const escaped = arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  sectie(`Backend (worker/*.js) — vindplaatsen van "${arg}"`,
    grep(escaped, ['worker/*.js', 'cloudflare-worker.js'], { cwd: BACKEND_ROOT, context }));
  sectie(`Frontend (mna/*.js, marilyn.html, adv.html) — vindplaatsen van "${arg}"`,
    grep(escaped, ['mna/*.js', 'marilyn.html', 'adv.html'], { context }));
  sectie(`Tests — vindplaatsen van "${arg}"`,
    grep(escaped, ['tests/*.mjs', 'tests/*.js'], { context }));
  process.exit(0);
}

if (wantTables) {
  sectie('Alle INSERT/UPDATE naar mna_documenten of mna_data (backend) — voor het opsporen van directe schrijfpaden buiten /mna/save om',
    grep('(INSERT|UPDATE)[^;]*(mna_documenten|mna_data)\\b', ['worker/*.js'], { cwd: BACKEND_ROOT, context: 1 }));
  process.exit(0);
}

// ── Standaardrun: de vaste, bekende risicopatronen ──
console.log('IMPACT SURFACE — vaste risicopatronen (werkregel 29)');
console.log('Deterministisch (grep), geen AI-interpretatie. Beoordeel elke treffer zelf.');

sectie('1. begeleiderAuth(...)-aanroepen gevolgd door rauwe `code` i.p.v. `auth.traject_id` in een query erna',
  'Handmatig na te lopen — grep vindt de aanroepen, de vervolgvraag ("gebruikt de query erna auth.traject_id of code?") is geen regex-patroon:\n' +
  grep('await begeleiderAuth\\(', ['worker/*.js'], { cwd: BACKEND_ROOT, context: 1 }));

sectie('2. rolVanCode(...)-aanroepen — controleer of de bijbehorende SELECT ook echt koper_code+tussen_code ophaalt',
  '(Precies de bug van 12 sep 2026 in worker/22-bankmutaties.js: rolVanCode() aangeroepen zonder dat de SELECT die kolommen had.)\n' +
  grep('rolVanCode\\(', ['worker/*.js'], { cwd: BACKEND_ROOT, context: 2 }));

sectie('3. Alle directe schrijfpaden naar mna_documenten/mna_data (documentupload/AI-extractie/handmatige save)',
  grep('(INSERT|UPDATE)[^;]*(mna_documenten|mna_data)\\b', ['worker/*.js'], { cwd: BACKEND_ROOT, context: 1 }));

sectie('4. Alle frontend fetch(...)-aanroepen naar /mna/save (elke UI-knop die financiële/DD-data kan wegschrijven)',
  grep("fetch\\([^)]*'/mna/save'", ['mna/*.js', 'marilyn.html', 'adv.html'], { context: 1 }));

sectie('5. Frontend: alle isTussen()/isVerkoper()-gates rond upload-/opslaan-knoppen (waar hoort een rolgate maar ontbreekt hij misschien?)',
  grep('(magUploaden|magVerwijderen|magKiezen|isRO)\\s*=', ['mna/*.js'], { context: 0 }));

console.log('\n' + '─'.repeat(70));
console.log('Gebruik `node scripts/impact-surface.mjs "<patroon>"` voor een vrije zoekopdracht,');
console.log('of `node scripts/impact-surface.mjs --tables` voor alleen sectie 3.');
