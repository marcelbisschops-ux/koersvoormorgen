#!/usr/bin/env node
// N-69 — bouwt het manifest.json dat release-orchestrator.mjs nodig heeft: berekent de
// checksums van een al samengestelde, geïsoleerde kandidaat (git worktree). Dit script bepaalt
// NIET welke bestanden bij een kandidaat horen — dat blijft mens/AI-oordeel bij het samenstellen
// van de worktree (git worktree add + expliciete bestandskeuze, exact het patroon dat deze sessie
// al meermaals handmatig is gevolgd voor P1-BUY-1/N-54).
//
// Gebruik:
//   node scripts/build-release-manifest.mjs \
//     --master-id N-72 --target backend --candidate-dir /pad/naar/worktree \
//     --baseline <git-sha> --attested-by claude-session-2026-09-26 \
//     --blocked-exceptions-checked \
//     worker/22-bankmutaties.js worker/00d-platformvoorwaarden-gate.js
//
// Output: schrijft <candidate-dir>/.release-manifest.json en print het pad.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

function sha256Bestand(pad) {
  return createHash('sha256').update(readFileSync(pad)).digest('hex');
}

function parseArgs(argv) {
  const out = { files: [], blocked_exceptions_checked: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--master-id') out.master_id = argv[++i];
    else if (a === '--target') out.target = argv[++i];
    else if (a === '--candidate-dir') out.candidate_dir = argv[++i];
    else if (a === '--baseline') out.baseline_commit = argv[++i];
    else if (a === '--attested-by') out.attested_by = argv[++i];
    else if (a === '--blocked-exceptions-checked') out.blocked_exceptions_checked = true;
    else out.files.push(a);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const verplicht = ['master_id', 'target', 'candidate_dir', 'baseline_commit', 'attested_by'];
  for (const v of verplicht) {
    if (!args[v]) { console.error('Verplicht: --' + v.replace(/_/g, '-')); process.exit(2); }
  }
  if (!args.files.length) { console.error('Geef minstens één bestand op (relatief aan candidate_dir).'); process.exit(2); }
  if (!existsSync(args.candidate_dir)) { console.error('candidate_dir bestaat niet: ' + args.candidate_dir); process.exit(2); }

  const checksums = {};
  for (const f of args.files) {
    const volledigPad = path.join(args.candidate_dir, f);
    if (!existsSync(volledigPad)) { console.error('Bestand niet gevonden in kandidaat: ' + f); process.exit(2); }
    checksums[f] = sha256Bestand(volledigPad);
  }

  const manifest = {
    master_id: args.master_id,
    target: args.target,
    candidate_dir: args.candidate_dir,
    baseline_commit: args.baseline_commit,
    files: args.files,
    checksums,
    blocked_exceptions_checked: args.blocked_exceptions_checked,
    attested_by: args.attested_by,
    opgesteld_op: new Date().toISOString(),
  };
  const uitPad = path.join(args.candidate_dir, '.release-manifest.json');
  writeFileSync(uitPad, JSON.stringify(manifest, null, 2) + '\n');
  console.log(uitPad);
}
main();
