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
import { mkdirSync, copyFileSync, rmSync, existsSync, symlinkSync, lstatSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
// 12-11-2026: de build staat in een map met de extensie .nosync, die iCloud Drive niet synchroniseert. In een
// gesynchroniseerde map maakte iCloud na elke herbouw conflictkopieën ("adv 2.html") die anders mee gepubliceerd
// zouden worden. `.pages-dist` blijft het vaste pad voor deploy, releasegate en hook: een koppeling naar deze map.
const DIST_DIR = join(REPO_ROOT, '.pages-dist.nosync');
const DIST_LINK = join(REPO_ROOT, '.pages-dist');
// Mislukte build mag nooit tot publicatie leiden (bevinding 18-11-2026: een afgebroken kopie liet een halve
// .pages-dist achter die daarna toch werd gepubliceerd). Daarom: bouwen in een tijdelijke map, pas bij volledig
// succes vervangen; bij elke fout ook de vorige uitvoer en de link weghalen, zodat er niets te publiceren valt.
const BOUW_DIR = join(REPO_ROOT, '.pages-dist.bouw');
function ruimUitvoerOp() { for (const p of [BOUW_DIR, DIST_DIR]) rmSync(p, { recursive: true, force: true }); try { lstatSync(DIST_LINK); rmSync(DIST_LINK, { recursive: true, force: true }); } catch {} }

// Aanvullende, expliciete uitsluiting bovenop .gitignore — vangt reeds-getrackte bestanden die niet
// met terugwerkende kracht uit een latere .gitignore-regel worden gehaald (zie toelichting hierboven).
// N-89 (30 sep 2026): ook interne ontwikkel-/test-/buildbestanden zonder publieke runtimefunctie
// horen niet in de publieke build — `git ls-files --others` nam bovendien ongetrackte lokale
// bestanden (bijv. een diagnose-spec) mee. Tweede laag: functions/_middleware.js blokkeert dezelfde
// paden nog eens edge-side.
const EXTRA_EXCLUDE_PREFIXES = ['.claude/', '.github/', '.git/', '.githooks/', 'tests/', 'scripts/', '_src/', '_mock/', '_gearchiveerd/'];
const EXTRA_EXCLUDE_EXACT = new Set(['build.py', 'extract.js', 'test_adviseur.sh', 'package.json', 'package-lock.json', 'playwright.config.js']);

function isExtraExcluded(relPath) {
  if (EXTRA_EXCLUDE_EXACT.has(relPath)) return true;
  // Dotfiles/dotmappen op elk niveau (.gitignore, .assetsignore, .nojekyll, ...) — geen runtimefunctie.
  if (relPath.split('/').some((deel) => deel.startsWith('.'))) return true;
  return EXTRA_EXCLUDE_PREFIXES.some((p) => relPath === p.replace(/\/$/, '') || relPath.startsWith(p));
}

function isSymlink(p) { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } }

function main() {
  const raw = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const files = raw.split('\n').filter(Boolean).filter((f) => !isExtraExcluded(f));

  ruimUitvoerOp();
  mkdirSync(BOUW_DIR, { recursive: true });

  let gekopieerd = 0;
  for (const rel of files) {
    const src = join(REPO_ROOT, rel);
    const dest = join(BOUW_DIR, rel);
    if (!existsSync(src) && !isSymlink(src)) continue; // git kent 'm, maar staat (nog) niet op schijf — sla over
    // Alleen gewone bestanden. Een symlink, socket of map (bijv. een tijdelijke node_modules-link) is onverwacht:
    // de build faalt dan in plaats van iets onbedoelds mee te nemen.
    if (!lstatSync(src).isFile()) throw new Error('Geen gewoon bestand in de build-bron: ' + rel + ' (verwijder het of neem het op in .gitignore).');
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    gekopieerd++;
  }
  if (!gekopieerd) throw new Error('Lege build-uitvoer.');
  renameSync(BOUW_DIR, DIST_DIR);
  symlinkSync('.pages-dist.nosync', DIST_LINK);

  console.log(`Build-output samengesteld: ${gekopieerd} bestanden in ${DIST_DIR}`);
  console.log(`(bron: git ls-files --cached --others --exclude-standard, min. ${EXTRA_EXCLUDE_PREFIXES.join(', ')}, dotfiles en ${[...EXTRA_EXCLUDE_EXACT].join(', ')})`);
}

try { main(); } catch (e) {
  ruimUitvoerOp();
  console.error('BUILD MISLUKT, er is geen build-uitvoer (.pages-dist) en er valt niets te publiceren: ' + (e && e.message || e));
  process.exit(1);
}
