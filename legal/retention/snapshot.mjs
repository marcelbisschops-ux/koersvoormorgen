#!/usr/bin/env node
/**
 * SNAPSHOT — dumpt de retention-relevante D1-tabellen naar legal/retention/.data/*.json
 * zodat de retention-engine reproduceerbaar (en offline) kan draaien.
 *
 * Vereist: wrangler + D1-toegang (draai vanuit ~/Documents/GitHub/koersvoormorgen-backend/backend
 * of geef --cwd mee). Standaard productie; --env=staging voor staging.
 *
 *   node legal/retention/snapshot.mjs [--env=staging] [--backend=<pad>] [--out=<pad>]
 *
 * Idempotent: overschrijft .data/ volledig; meerdere keren draaien = zelfde resultaat.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const ENV = args.env ? `--env=${args.env}` : '';
const DB = args.env === 'staging' ? 'kantoorinzicht-staging' : 'kantoorinzicht';
const BACKEND = args.backend || path.join(os.homedir(), 'Documents/GitHub/koersvoormorgen-backend/backend');
const OUT = args.out || path.join(HIER, '.data');

const TABELLEN = [
  'mna_trajecten', 'mna_documenten', 'mna_doc_versies', 'mna_gesprek_bijlagen',
  'mna_bankmutaties_import', 'mna_bankmutaties_regel', 'mna_vok', 'bf_gebruikers',
  'scan_rapporten', 'rapporten', 'scans', 'verhuis_scans', 'verhuis_groepen', 'verhuis_groep_scans',
  'rapport_usage', 'callbacks', 'contact_berichten', 'mna_leads', 'adviseur_proef_aanvragen',
  'platform_fee_events', 'factuur_reeks',
  'mna_audit', 'security_audit_log', 'security_selfcheck_log', 'traject_viewer_log', 'avg_verwijder_log',
  'traject_viewers',
  'mna_data', 'mna_beoordelingen', 'mna_qa', 'mna_qa_reacties', 'mna_chat', 'mna_logboek',
  'mna_gesprekken', 'mna_gesprek_concepten', 'mna_partners', 'mna_entiteiten', 'mna_koper_criteria',
  'mna_waarderingen', 'mna_risicoraamwerk', 'mna_fase_status', 'mna_info_fases', 'mna_infoverzoek',
  'mna_closing_checklist_status', 'mna_wijzigingen',
];

function d1(sql) {
  const raw = execFileSync('npx', ['wrangler', 'd1', 'execute', DB, ...(ENV ? [ENV] : []), '--remote', '--json', '--command', sql],
    { cwd: BACKEND, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const start = raw.indexOf('['); const json = JSON.parse(raw.slice(start));
  return json[0]?.results || [];
}

fs.mkdirSync(OUT, { recursive: true });
// bestaande backup-tabellen dynamisch ophalen
let alleTabellen = TABELLEN.slice();
try {
  const bkp = d1("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup_%'").map(r => r.name);
  alleTabellen = alleTabellen.concat(bkp);
} catch (e) { console.error('  (kon backup-tabellen niet inventariseren: ' + e.message + ')'); }

let ok = 0, leeg = 0, mislukt = 0;
for (const t of alleTabellen) {
  try {
    const rows = d1(`SELECT * FROM ${t}`);
    fs.writeFileSync(path.join(OUT, t + '.json'), JSON.stringify(rows, null, 1));
    if (rows.length) ok++; else leeg++;
    process.stdout.write(`  ${t.padEnd(34)} ${String(rows.length).padStart(6)} rijen\n`);
  } catch (e) {
    mislukt++; process.stdout.write(`  ${t.padEnd(34)}  — overgeslagen (${String(e.message).split('\n')[0].slice(0, 60)})\n`);
  }
}
fs.writeFileSync(path.join(OUT, '_snapshot-meta.json'), JSON.stringify({ db: DB, env: args.env || 'production', gemaakt_op: new Date().toISOString(), tabellen_ok: ok, tabellen_leeg: leeg, tabellen_mislukt: mislukt }, null, 2));
console.log(`\n✓ Snapshot: ${ok} met data, ${leeg} leeg, ${mislukt} overgeslagen → ${path.relative(process.cwd(), OUT)}`);
