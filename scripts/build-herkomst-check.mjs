#!/usr/bin/env node
// Codex-review R-HERKOMST (19-11-2026, P2): bindt de frontendbuild aan de gecontroleerde broncommit.
// Elk bestand in .pages-dist moet byte-gelijk zijn aan de git-blob van exact die commit (git hash-object vs
// git ls-tree). Een bestand dat niet in de commit staat of afwijkt → exit 1, met de afwijkingen.
// Gebruik: node scripts/build-herkomst-check.mjs <commit> [dist-map]   (vanuit de repo-root)
import { execFileSync } from 'node:child_process';
import { readdirSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';

export function controleer(commit, dist, cwd = process.cwd()) {
  if (!/^[0-9a-f]{40}$/.test(commit || '')) return { ok: false, fouten: ['geen volledige commit-hash opgegeven'] };
  const tree = new Map();
  const ls = execFileSync('git', ['ls-tree', '-r', '-z', commit], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  for (const regel of ls.split('\0').filter(Boolean)) { const [meta, pad] = regel.split('\t'); tree.set(pad, meta.split(' ')[2]); }
  const bestanden = [];
  const loop = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const st = lstatSync(p); if (st.isDirectory()) loop(p); else bestanden.push(p); } };
  loop(dist);
  if (!bestanden.length) return { ok: false, fouten: ['lege build-uitvoer'] };
  const fouten = [];
  const rel = bestanden.map((p) => relative(dist, p));
  const hashes = execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], { cwd, input: bestanden.join('\n') + '\n', encoding: 'utf8' }).trim().split('\n');
  rel.forEach((r, i) => {
    if (!lstatSync(bestanden[i]).isFile()) fouten.push(r + ': geen gewoon bestand');
    else if (!tree.has(r)) fouten.push(r + ': staat niet in commit ' + commit.slice(0, 12));
    else if (tree.get(r) !== hashes[i]) fouten.push(r + ': inhoud wijkt af van commit ' + commit.slice(0, 12));
  });
  return { ok: fouten.length === 0, bestanden: rel.length, fouten };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const commit = process.argv[2];
  const dist = process.argv[3] || join(process.cwd(), '.pages-dist');
  let r;
  try { r = controleer(commit, dist); } catch (e) { r = { ok: false, fouten: [String(e && e.message || e).split('\n')[0]] }; }
  if (r.ok) { console.log('🟢 Build-herkomst: ' + r.bestanden + ' bestanden byte-gelijk aan commit ' + commit.slice(0, 12)); process.exit(0); }
  console.error('🔴 Build-herkomst: build is NIET exact commit ' + String(commit).slice(0, 12) + ':'); for (const f of r.fouten.slice(0, 20)) console.error('   ' + f);
  process.exit(1);
}
