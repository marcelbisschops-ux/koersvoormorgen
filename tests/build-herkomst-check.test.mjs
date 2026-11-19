// R-HERKOMST (19-11-2026): offline proef voor scripts/build-herkomst-check.mjs in een tijdelijke git-repo (geen netwerk).
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { controleer } from '../scripts/build-herkomst-check.mjs';
let n = 0; const ok = (c, m, d) => { if (!c) console.log('FAIL ' + m + ' ' + JSON.stringify(d || '')); assert.ok(c, m); n++; console.log('PASS ' + m); };
const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k]; // nooit via geërfde GIT_DIR de echte repo raken
const g = (cwd, ...a) => execFileSync('git', a, { cwd, env, encoding: 'utf8' }).trim();
const repo = mkdtempSync(join(tmpdir(), 'kvm-bhc-'));
try {
  g(repo, 'init', '-q'); g(repo, 'config', 'user.email', 't@kvm-test.invalid'); g(repo, 'config', 'user.name', 't');
  mkdirSync(join(repo, 'mna')); writeFileSync(join(repo, 'index.html'), '<p>a</p>\n'); writeFileSync(join(repo, 'mna/01.js'), 'var a=1;\n');
  g(repo, 'add', '.'); g(repo, 'commit', '-qm', 'c1'); const c1 = g(repo, 'rev-parse', 'HEAD');
  writeFileSync(join(repo, 'index.html'), '<p>b</p>\n'); g(repo, 'commit', '-qam', 'c2'); const c2 = g(repo, 'rev-parse', 'HEAD');
  const dist = join(repo, '.dist'); mkdirSync(join(dist, 'mna'), { recursive: true });
  cpSync(join(repo, 'index.html'), join(dist, 'index.html')); cpSync(join(repo, 'mna/01.js'), join(dist, 'mna/01.js'));
  ok(controleer(c2, dist, repo).ok, 'build = commit c2 → groen');
  ok(!controleer(c1, dist, repo).ok, 'zelfde build tegen andere commit c1 → rood (build niet van die commit)');
  appendFileSync(join(dist, 'mna/01.js'), '//x\n'); const r1 = controleer(c2, dist, repo);
  ok(!r1.ok && r1.fouten.some((f) => f.startsWith('mna/01.js')), 'gewijzigd bestand in build → rood', r1);
  cpSync(join(repo, 'mna/01.js'), join(dist, 'mna/01.js')); writeFileSync(join(dist, 'extra.html'), 'x');
  const r2 = controleer(c2, dist, repo); ok(!r2.ok && r2.fouten.some((f) => f.startsWith('extra.html')), 'bestand dat niet in de commit staat → rood', r2);
  rmSync(join(dist, 'extra.html')); ok(controleer(c2, dist, repo).ok, 'na herstel weer groen');
  ok(!controleer('abc', dist, repo).ok, 'geen volledige commit-hash → rood');
} finally { rmSync(repo, { recursive: true, force: true }); }
// Volgorde in scripts/deploy.sh (deploy_frontend): herkomst + GO vóór build, binding vóór preview en vóór productie.
{ const { readFileSync } = await import('node:fs'); const sh = readFileSync(new URL('../scripts/deploy.sh', import.meta.url), 'utf8');
  const f = sh.slice(sh.indexOf('deploy_frontend() {')); const fn = f.slice(0, f.indexOf('\n}\n'));
  const i = (s, van = 0) => fn.indexOf(s, van);
  const herk = i('herkomst_controle "$FE_DIR" main'), go = i('vraag_release_go frontend'), build = i('node scripts/build-frontend-release.mjs'), bind1 = i('build-herkomst-check.mjs', build),
    preview = i('--branch=preview'), bind2 = i('build-herkomst-check.mjs', preview), prod = i('--branch=main');
  ok(herk > -1 && go > herk && build > go && bind1 > build && preview > bind1, 'deploy.sh: herkomst en GO vóór build; build gebonden vóór preview', { herk, go, build, bind1, preview });
  ok(bind2 > preview && prod > bind2 && /HERKOMST_COMMIT" != "\$FE_RELEASE_COMMIT/.test(fn), 'deploy.sh: opnieuw gebonden en commit ongewijzigd vlak vóór productie', { bind2, prod }); }
console.log('✅ ' + n + '/' + n);
