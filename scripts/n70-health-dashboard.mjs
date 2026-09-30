#!/usr/bin/env node
// N-70 — Daily Platform Health & Security Control: één samengevoegd "in-één-oogopslag"-overzicht.
// Combineert de al bestaande, los werkende bronnen (geen tweede administratie, geen nieuwe
// databron) — dit script leest ze alleen samen uit en print één compact rapport.
//
// Gebruik: node scripts/n70-health-dashboard.mjs
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const BRIDGE_DIR = '/Users/marcelbisschops/Documents/Codex/2026-09-23/referenced-chatgpt-conversation-this-is-an/outputs/kantoorinzicht-claude-bridge';
const INTAKE_SCRIPT = path.join(BRIDGE_DIR, 'intake/intake-scan.mjs');

function regel(label, status, detail) {
  const icoon = status === 'GREEN' ? '🟢' : status === 'MISSED' ? '🟠' : '🔴';
  console.log(icoon + ' ' + label.padEnd(28) + status.padEnd(8) + (detail || ''));
}

function runIntakeDryRun(bron, extraArgs = []) {
  try {
    const out = execFileSync('node', [INTAKE_SCRIPT, '--source=' + bron, '--dry-run', ...extraArgs], { encoding: 'utf8', cwd: BRIDGE_DIR });
    const m = out.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { fout: 'geen JSON-output' };
  } catch (e) {
    return { fout: (e.stdout || e.message || '').toString().slice(0, 200) };
  }
}

async function checkHealth(label, url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    regel(label, r.status === 200 ? 'GREEN' : 'RED', 'HTTP ' + r.status);
  } catch (e) {
    regel(label, 'RED', e.message);
  }
}

function checkLaunchd() {
  try {
    const out = execFileSync('launchctl', ['list'], { encoding: 'utf8' });
    const jobs = ['nl.kantoorinzicht.nachtworker', 'nl.kantoorinzicht.bridge-melder', 'com.bisschopsfinancing.kantoorinzicht-backup'];
    for (const job of jobs) {
      const regelMatch = out.split('\n').find(l => l.includes(job));
      if (!regelMatch) { regel('launchd: ' + job, 'RED', 'niet geladen'); continue; }
      const exitCode = regelMatch.trim().split(/\s+/)[1];
      regel('launchd: ' + job, exitCode === '0' || exitCode === '-' ? 'GREEN' : 'RED', 'laatste exit=' + exitCode);
    }
  } catch (e) {
    regel('launchd (algemeen)', 'RED', e.message);
  }
}

async function main() {
  console.log('');
  console.log('══════════ N-70 DAILY PLATFORM HEALTH & SECURITY — ' + new Date().toISOString() + ' ══════════');
  console.log('');

  console.log('── A. PRODUCTIEBEREIKBAARHEID ──');
  await checkHealth('backend productie /health', 'https://kantoorinzicht.marcel-bisschops.workers.dev/health');
  await checkHealth('backend staging /health', 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev/health');
  await checkHealth('frontend productie', 'https://koersvoormorgen.nl/');
  console.log('');

  console.log('── D. WORKER/AUTOMATISERING (launchd) ──');
  checkLaunchd();
  console.log('');

  console.log('── E. CREDENTIAL HEALTH ──');
  const cred = runIntakeDryRun('credential-health');
  if (cred.fout) regel('credential-health', 'RED', cred.fout);
  else regel('ADMIN_KEY staging+productie', cred.nieuw && cred.nieuw.length ? 'RED' : 'GREEN', cred.nieuw && cred.nieuw.length ? cred.nieuw.length + ' probleem/problemen' : 'beide authenticeren correct');
  console.log('');

  console.log('── F. CI/REGRESSIE ──');
  const ci = runIntakeDryRun('ci');
  if (ci.fout) regel('CI (Statische checks)', 'RED', ci.fout);
  else regel('CI (Statische checks)', (ci.nieuw && ci.nieuw.length) || (ci.overgeslagen && ci.overgeslagen.length) ? 'RED' : 'GREEN', ci.overgeslagen && ci.overgeslagen.length ? 'aanhoudend rood, al bekend (N-31)' : (ci.nieuw && ci.nieuw.length ? 'NIEUW rood' : 'groen'));
  console.log('');

  console.log('── B/G. DAGELIJKSE KNOPPENTEST + PERIODIEKE CADANS ──');
  const cadence = runIntakeDryRun('cadence');
  if (cadence.fout) regel('cadans-check', 'RED', cadence.fout);
  else regel('cadans (knoppentest/diepe-audit/wekelijks)', (cadence.nieuw && cadence.nieuw.length) ? 'MISSED' : 'GREEN', cadence.nieuw && cadence.nieuw.length ? cadence.nieuw.length + ' gemiste routine(s)' : 'alle routines binnen cadans');
  console.log('');

  console.log('── C/H. SECURITY-SELFCHECK + MARILYN-DASHBOARD ──');
  try {
    const { leesAdminKey } = await import('/Users/marcelbisschops/Documents/GitHub/koersvoormorgen/tests/lib.mjs?cachebust=' + Date.now());
    process.env.WORKER_URL = 'https://kantoorinzicht.marcel-bisschops.workers.dev';
    const { leesAdminKey: leesProd } = await import('/Users/marcelbisschops/Documents/GitHub/koersvoormorgen/tests/lib.mjs?cachebust=' + Date.now() + Math.random());
    const key = leesProd();
    if (!key) { regel('security-overzicht (productie)', 'RED', 'geen ADMIN_KEY beschikbaar'); }
    else {
      const r = await fetch('https://kantoorinzicht.marcel-bisschops.workers.dev/mna/admin/veiligheid/overzicht', { headers: { 'x-admin-key': key } });
      const j = await r.json();
      regel('security_audit_log open (productie)', (j.open_totaal || 0) === 0 ? 'GREEN' : 'RED', (j.open_totaal || 0) + ' open bevinding(en)');
      const laatsteRun = j.laatste_selfcheck;
      const urenGeleden = laatsteRun ? ((Date.now() - laatsteRun.ran_at) / 3600000).toFixed(1) : null;
      regel('laatste selfcheck-run', laatsteRun && laatsteRun.checks_geslaagd === laatsteRun.checks_totaal ? 'GREEN' : 'RED', laatsteRun ? laatsteRun.checks_geslaagd + '/' + laatsteRun.checks_totaal + ' (' + urenGeleden + 'u geleden)' : 'geen run gevonden');
    }
  } catch (e) { regel('security-overzicht (productie)', 'RED', e.message); }
  console.log('');

  console.log('── WATCHDOG-OP-WATCHDOG ──');
  const watchdog = runIntakeDryRun('intake-watchdog');
  if (watchdog.fout) regel('intake-watchdog', 'RED', watchdog.fout);
  else regel('intake-keten zelf actief', (watchdog.nieuw && watchdog.nieuw.length) ? 'RED' : 'GREEN', (watchdog.nieuw && watchdog.nieuw.length) ? 'watchdog meldt een probleem' : 'laatste run binnen drempel');
  console.log('');
  console.log('══════════ EINDE ══════════');
}
main();
