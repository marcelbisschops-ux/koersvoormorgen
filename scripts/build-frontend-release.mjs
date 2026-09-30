#!/usr/bin/env node
// N-83 (27 sep 2026) — structurele fix, punt 5: de Cloudflare Pages-deploy-artifact wordt voortaan
// ALLOWLIST-/build-output-gebaseerd samengesteld i.p.v. de hele repo-map (`wrangler pages deploy .`)
// te uploaden. `functions/_middleware.js` (edge-blokkade) blijft als TWEEDE verdedigingslaag bestaan
// — dit script is de EERSTE, structurele laag: wat hier niet in de allowlist zit, wordt fysiek nooit
// geüpload, ongeacht of de middleware een fout bevat of ontbreekt.
//
// Allowlist-bron: `git ls-files --cached --others --exclude-standard` — dit is exact de verzameling
// bestanden die git als "hoort bij dit project, niet genegeerd" beschouwt (getrackt + nieuw-maar-niet-
// gitignored). Zelfonderhoudend: een bestand dat legitiem publiek moet worden, wordt vanzelf
// meegenomen zodra het niet meer op de .gitignore-lijst staat; een bestand dat wél getrackt is maar
// nooit publiek hoort te zijn (bijv. .claude/launch.json, ooit per ongeluk toegevoegd vóórdat .claude/
// werd gegitignored) wordt hieronder aanvullend expliciet uitgesloten — .gitignore untrackt geen
// reeds-getrackte bestanden met terugwerkende kracht.
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DIST_DIR = join(REPO_ROOT, '.pages-dist');

// Aanvullende, expliciete uitsluiting bovenop .gitignore — vangt reeds-getrackte bestanden die niet
// met terugwerkende kracht uit een latere .gitignore-regel worden gehaald (zie toelichting hierboven).
const EXTRA_EXCLUDE_PREFIXES = ['.claude/', '.github/', '.git/'];

function isExtraExcluded(relPath) {
  return EXTRA_EXCLUDE_PREFIXES.some((p) => relPath === p.replace(/\/$/, '') || relPath.startsWith(p));
}

function main() {
  const raw = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const files = raw.split('\n').filter(Boolean).filter((f) => !isExtraExcluded(f));

  if (existsSync(DIST_DIR)) rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  let gekopieerd = 0;
  for (const rel of files) {
    const src = join(REPO_ROOT, rel);
    const dest = join(DIST_DIR, rel);
    if (!existsSync(src)) continue; // git kent 'm, maar staat (nog) niet op schijf — sla over
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    gekopieerd++;
  }

  console.log(`Build-output samengesteld: ${gekopieerd} bestanden in ${DIST_DIR}`);
  console.log(`(bron: git ls-files --cached --others --exclude-standard, min. ${EXTRA_EXCLUDE_PREFIXES.join(', ')})`);
}

main();
