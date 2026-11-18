// Mislukte frontend-build mag nooit tot publicatie leiden (bevinding 18-11-2026). Draait het echte bouwscript in een
// tijdelijke git-repo: (1) normale build levert .pages-dist; (2) een niet-gewoon bestand (symlink naar een map, zoals
// een tijdelijke node_modules-link) laat de build falen en verwijdert óók de vorige uitvoer en de link; (3) daarna
// weer een schone build. Geen netwerk, geen deploy.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
let n = 0, fout = 0; const ok = (c, m) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m); } };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kvm-build-'));
const g = (...a) => execFileSync('git', a, { cwd: tmp, stdio: 'pipe' });
g('init', '-q'); fs.mkdirSync(path.join(tmp, 'scripts')); fs.copyFileSync(path.join(ROOT, 'scripts/build-frontend-release.mjs'), path.join(tmp, 'scripts/build-frontend-release.mjs'));
fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules/\n.pages-dist\n.pages-dist.nosync/\n.pages-dist.bouw/\n');
fs.writeFileSync(path.join(tmp, 'index.html'), '<p>x</p>'); fs.mkdirSync(path.join(tmp, 'mna')); fs.writeFileSync(path.join(tmp, 'mna/a.js'), 'var a=1;');
g('add', '.'); g('-c', 'user.email=t@t.invalid', '-c', 'user.name=t', 'commit', '-qm', 'x');
const bouw = () => { try { execFileSync(process.execPath, ['scripts/build-frontend-release.mjs'], { cwd: tmp, stdio: 'pipe' }); return 0; } catch (e) { return e.status || 1; } };
const dist = path.join(tmp, '.pages-dist');
ok(bouw() === 0 && fs.existsSync(path.join(dist, 'index.html')) && fs.existsSync(path.join(dist, 'mna/a.js')), 'normale build: uitvoer compleet');
fs.mkdirSync(path.join(tmp, 'elders')); fs.writeFileSync(path.join(tmp, 'elders/groot.bin'), 'x');
fs.symlinkSync(path.join(tmp, 'elders'), path.join(tmp, 'node_modules'));
fs.writeFileSync(path.join(tmp, '.gitignore'), 'elders/\n.pages-dist\n.pages-dist.nosync/\n.pages-dist.bouw/\nnode_modules/\n');
ok(bouw() !== 0, 'build met symlink (tijdelijke node_modules-link) faalt');
let linkWeg = true; try { fs.lstatSync(dist); linkWeg = false; } catch {}
ok(linkWeg && !fs.existsSync(path.join(tmp, '.pages-dist.nosync')) && !fs.existsSync(path.join(tmp, '.pages-dist.bouw')), 'na mislukte build: geen .pages-dist, geen oude uitvoer, geen halve bouwmap (niets te publiceren)');
fs.unlinkSync(path.join(tmp, 'node_modules'));
ok(bouw() === 0 && fs.existsSync(path.join(dist, 'index.html')) && !fs.existsSync(path.join(dist, 'elders')), 'daarna weer schone build');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
