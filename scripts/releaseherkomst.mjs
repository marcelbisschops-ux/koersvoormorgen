#!/usr/bin/env node
// Releaseherkomst (Marcel 18-11-2026): elke KVM-productierelease moet herleidbaar zijn tot een vastgelegde GitHub-commit.
// ALLEEN LEZEN. Controleert of de werkelijk draaiende productie (Cloudflare Worker + Pages) overeenkomt met een commit die
// op GitHub in de geschiedenis van main staat. Bij een afwijking: duidelijke waarschuwing en exitcode 1 — nooit
// automatisch overschrijven of uitrollen.
//
// Herkomst Worker: (1) de versie-tag die scripts/deploy.sh sinds 18-11 meegeeft (`--tag <commit12>`), of (2) voor een
// oudere versie een GitHub-tag `prod-backend-<datum>-<eerste 8 tekens versie-id>` (zoals prod-backend-20261113-a238162d).
// Herkomst Pages: de commit die Cloudflare zelf per deployment registreert (kolom Source).
// Vergelijking via kale spiegels van de GitHub-repo's (geen werkmap wordt aangeraakt):
//   ~/Developer/KVM/mirror/{koersvoormorgen,koersvoormorgen-backend}.git  (git clone --mirror, hier bijgewerkt; KVM_SPIEGEL_DIR overschrijft)
//
// Gebruik: node scripts/releaseherkomst.mjs [--json] [--worker <naam>]
import { execFileSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// 19-11-2026 (besluit Marcel: werkbomen buiten iCloud): spiegels staan in ~/Developer/KVM/mirror; KVM_SPIEGEL_DIR overschrijft.
const SPIEGEL = process.env.KVM_SPIEGEL_DIR || path.join(os.homedir(), 'Developer', 'KVM', 'mirror');
const REPO = { backend: 'koersvoormorgen-backend', frontend: 'koersvoormorgen' };
// --worker <naam> alleen voor een negatieve proef (bijv. de staging-Worker, die geen productieherkomst heeft).
const wi = process.argv.indexOf('--worker');
const WORKER = wi > 0 ? process.argv[wi + 1] : 'kantoorinzicht', PAGES = 'kantoorinzicht-frontend';
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))); delete env.CLOUDFLARE_API_TOKEN; // geen geërfde GIT_DIR: git -C <spiegel> moet echt de spiegel lezen // zelfde OAuth-aanmelding als de andere scripts

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, ...opts }).trim();
const git = (repo, ...args) => sh('git', ['-C', path.join(SPIEGEL, REPO[repo] + '.git'), ...args]);
const wrangler = (...args) => JSON.parse(sh('npx', ['--prefer-offline', 'wrangler', ...args, '--json']));
const bestaat = (repo, rev) => { try { git(repo, 'cat-file', '-e', rev + '^{commit}'); return true; } catch { return false; } };
const opMain = (repo, sha) => { try { git(repo, 'merge-base', '--is-ancestor', sha, 'main'); return true; } catch { return false; } };

function bijwerkenSpiegels() {
  for (const r of Object.keys(REPO)) {
    const p = path.join(SPIEGEL, REPO[r] + '.git');
    if (!fs.existsSync(p)) throw new Error('spiegel ontbreekt: ' + p + ' (eenmalig: git clone --mirror https://github.com/marcelbisschops-ux/' + REPO[r] + '.git)');
    sh('git', ['-C', p, 'remote', 'update', '-p']);
  }
}

function controleerWorker() {
  const dep = wrangler('deployments', 'list', '--name', WORKER);
  const laatste = dep[dep.length - 1];
  const actief = (laatste.versions || []).filter((v) => v.percentage === 100);
  if (actief.length !== 1) return { ok: false, onderdeel: 'worker', reden: 'Geen enkele versie op 100% (gedeelde uitrol); herkomst niet eenduidig.', versies: laatste.versions };
  const vid = actief[0].version_id;
  const v = wrangler('versions', 'view', vid, '--name', WORKER);
  const tag = (v.annotations || {})['workers/tag'] || '';
  let commit = null, bron = null;
  if (/^[0-9a-f]{12,40}$/.test(tag) && bestaat('backend', tag)) { commit = git('backend', 'rev-parse', tag); bron = 'versie-tag'; }
  else {
    const tags = git('backend', 'tag', '--list', 'prod-backend-*-' + vid.slice(0, 8)).split('\n').filter(Boolean);
    if (tags.length === 1) { commit = git('backend', 'rev-parse', tags[0] + '^{commit}'); bron = 'GitHub-tag ' + tags[0]; }
  }
  const basis = { onderdeel: 'worker', versie: vid, aangemaakt: v.metadata && v.metadata.created_on };
  if (!commit) return { ...basis, ok: false, reden: 'Draaiende Worker-versie is niet herleidbaar: geen commit-tag en geen GitHub-tag prod-backend-*-' + vid.slice(0, 8) + '.' };
  if (!opMain('backend', commit)) return { ...basis, ok: false, commit, bron, reden: 'Commit staat niet in de geschiedenis van backend-main op GitHub.' };
  const voor = Number(git('backend', 'rev-list', '--count', commit + '..main'));
  const zelfdeBoom = git('backend', 'rev-parse', commit + '^{tree}') === git('backend', 'rev-parse', 'main^{tree}');
  return { ...basis, ok: true, commit, bron, main: git('backend', 'rev-parse', '--short', 'main'), main_vooruit: voor, main_inhoud_gelijk: zelfdeBoom };
}

function controleerPages() {
  const lijst = wrangler('pages', 'deployment', 'list', '--project-name', PAGES);
  const prod = lijst.find((r) => String(r.Environment || '').toLowerCase() === 'production');
  if (!prod) return { onderdeel: 'pages', ok: false, reden: 'Geen productie-deployment gevonden.' };
  const kort = String(prod.Source || '');
  const basis = { onderdeel: 'pages', deployment: prod.Id, branch: prod.Branch };
  if (!/^[0-9a-f]{7,40}$/.test(kort) || !bestaat('frontend', kort)) return { ...basis, ok: false, reden: 'Commit ' + (kort || '(leeg)') + ' van de productie-deployment bestaat niet op GitHub.' };
  const commit = git('frontend', 'rev-parse', kort);
  if (!opMain('frontend', commit)) return { ...basis, ok: false, commit, reden: 'Commit staat niet in de geschiedenis van frontend-main op GitHub.' };
  const voor = Number(git('frontend', 'rev-list', '--count', commit + '..main'));
  return { ...basis, ok: true, commit, main: git('frontend', 'rev-parse', '--short', 'main'), main_vooruit: voor };
}

let uit;
try {
  bijwerkenSpiegels();
  uit = [controleerWorker(), controleerPages()];
} catch (e) {
  uit = [{ onderdeel: 'controle', ok: false, reden: 'Controle kon niet worden uitgevoerd: ' + String(e.message || e).split('\n')[0] }];
}
const alleOk = uit.every((x) => x.ok);
if (process.argv.includes('--json')) console.log(JSON.stringify({ ok: alleOk, tijd: new Date().toISOString(), resultaten: uit }, null, 2));
else {
  for (const x of uit) {
    if (x.ok) console.log('🟢 ' + x.onderdeel + ': ' + (x.versie || x.deployment) + ' = commit ' + x.commit.slice(0, 12) + (x.bron ? ' (' + x.bron + ')' : '') + '; main ' + x.main + (x.main_vooruit ? ' (' + x.main_vooruit + ' commit(s) nog niet uitgerold' + (x.main_inhoud_gelijk ? ', inhoud gelijk' : '') + ')' : ' (gelijk)'));
    else console.log('🔴 AFWIJKING ' + x.onderdeel + ': ' + x.reden + (x.versie ? ' [versie ' + x.versie + ']' : '') + (x.commit ? ' [commit ' + x.commit.slice(0, 12) + ']' : ''));
  }
  console.log(alleOk ? 'Productie is herleidbaar tot GitHub.' : 'NIET herleidbaar: niet uitrollen tot de afwijking is opgelost. Er is niets gewijzigd.');
}
process.exit(alleOk ? 0 : 1);
