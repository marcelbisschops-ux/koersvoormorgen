#!/usr/bin/env node
// Releasegate frontend (Marcel 12-11-2026, Prio 3): een rode previewcontrole is een harde blokkade.
// Een latere groene productiecontrole maakt een eerdere gate-overtreding niet acceptabel.
//
// Ontstaan: op 12-11-2026 was de N-83-controle op de preview rood, en is daarna toch handmatig naar
// productie gedeployd (productie was groen). scripts/deploy.sh stopte al correct; het lek zat in de
// handmatige route. Deze gate bindt het previewresultaat aan de exacte build (vingerafdruk van
// .pages-dist) en weigert productie zonder groen previewresultaat voor diezelfde build.
//
// Gebruik (vanuit de repo-root):
//   node scripts/frontend-release-gate.mjs preview <preview-deployment-url>
//       Wacht tot de preview antwoordt (alleen bereikbaarheid, max. 120 s), draait daarna éénmaal
//       tests/verify-n83-geen-publieke-lek.mjs. Legt PASS of FAIL vast voor de huidige build.
//       Bij FAIL: exit 1. Een FAIL blijft staan voor deze build; alleen een nieuwe build (andere
//       vingerafdruk) met een nieuwe groene preview kan door.
//   node scripts/frontend-release-gate.mjs check
//       Exit 0 alleen als de huidige .pages-dist een groen previewresultaat heeft, niet ouder dan
//       60 minuten, en er voor deze build geen FAIL is vastgelegd. Anders exit 1 met de reden.
//   node scripts/frontend-release-gate.mjs hash
//       Toont de vingerafdruk van .pages-dist.
//
// Vastlegging: ~/.kvm-release-gate/frontend.jsonl (append-only, buiten de repo, nooit gepubliceerd).
// Geen override-optie: bewust. Wie toch wil publiceren, maakt een nieuwe build en een nieuwe preview.
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, '.pages-dist');
const LOGDIR = path.join(os.homedir(), '.kvm-release-gate');
const LOG = path.join(LOGDIR, 'frontend.jsonl');
const MAX_LEEFTIJD_MS = 60 * 60 * 1000;
const PREVIEW_RE = /^https:\/\/[a-z0-9]+\.kantoorinzicht-frontend\.pages\.dev\/?$/;

export function vingerafdruk(dir = DIST) {
  if (!fs.existsSync(dir)) return null;
  const h = crypto.createHash('sha256');
  const loop = (d) => {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) { h.update('L:' + path.relative(dir, p) + '->' + fs.readlinkSync(p) + '\n'); continue; }
      if (st.isDirectory()) { loop(p); continue; }
      h.update('F:' + path.relative(dir, p) + '\n');
      h.update(fs.readFileSync(p));
    }
  };
  loop(dir);
  return h.digest('hex');
}

function leesLog() {
  if (!fs.existsSync(LOG)) return [];
  return fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}
function schrijf(rec) { fs.mkdirSync(LOGDIR, { recursive: true }); fs.appendFileSync(LOG, JSON.stringify(rec) + '\n'); }

export function beoordeel(hash, records = leesLog(), nu = Date.now()) {
  if (!hash) return { ok: false, reden: 'Geen .pages-dist gevonden; bouw eerst met scripts/build-frontend-release.mjs.' };
  const eigen = records.filter((r) => r.hash === hash);
  if (eigen.some((r) => r.result === 'FAIL')) return { ok: false, reden: 'Voor deze build is een RODE previewcontrole vastgelegd. Harde blokkade: maak een nieuwe build en een nieuwe preview.' };
  const pass = eigen.filter((r) => r.result === 'PASS').sort((a, b) => b.ts - a.ts)[0];
  if (!pass) return { ok: false, reden: 'Geen groene previewcontrole voor deze build. Eerst: node scripts/frontend-release-gate.mjs preview <preview-url>.' };
  if (nu - pass.ts > MAX_LEEFTIJD_MS) return { ok: false, reden: 'De groene previewcontrole voor deze build is ouder dan 60 minuten. Opnieuw previewen.' };
  return { ok: true, reden: 'Groene preview voor deze build (' + pass.url + ', ' + new Date(pass.ts).toISOString() + ').' };
}

async function wachtOpPreview(url) {
  const eind = Date.now() + 120000;
  while (Date.now() < eind) {
    try { const r = await fetch(url.replace(/\/$/, '') + '/', { redirect: 'manual' }); if (r.status === 200) return true; } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'hash') { console.log(vingerafdruk() || 'geen .pages-dist'); return 0; }
  if (cmd === 'check') {
    const b = beoordeel(vingerafdruk());
    console.log((b.ok ? '🟢 ' : '🔴 ') + b.reden);
    return b.ok ? 0 : 1;
  }
  if (cmd === 'preview') {
    if (!arg || !PREVIEW_RE.test(arg)) { console.error('🔴 Geef de unieke preview-deployment-URL (https://<hash>.kantoorinzicht-frontend.pages.dev).'); return 2; }
    const hash = vingerafdruk();
    if (!hash) { console.error('🔴 Geen .pages-dist gevonden.'); return 1; }
    const bereikbaar = await wachtOpPreview(arg);
    let result = 'FAIL'; let detail = '';
    if (!bereikbaar) detail = 'preview niet bereikbaar binnen 120 s';
    else {
      const r = spawnSync(process.execPath, [path.join(ROOT, 'tests/verify-n83-geen-publieke-lek.mjs'), arg], { stdio: 'inherit' });
      result = r.status === 0 ? 'PASS' : 'FAIL';
      detail = 'verify-n83 exit ' + r.status;
    }
    schrijf({ ts: Date.now(), hash, url: arg, result, detail });
    console.log((result === 'PASS' ? '🟢 Previewgate groen' : '🔴 Previewgate ROOD (' + detail + '): productie voor deze build is geblokkeerd') + ' · build ' + hash.slice(0, 12));
    return result === 'PASS' ? 0 : 1;
  }
  console.error('Gebruik: node scripts/frontend-release-gate.mjs preview <url> | check | hash');
  return 2;
}

if (import.meta.url === 'file://' + process.argv[1]) main().then((c) => process.exit(c));
