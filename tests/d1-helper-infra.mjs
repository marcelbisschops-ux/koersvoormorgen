// Regressietest voor de transportfout-hardening van d1() in tests/lib.mjs (30 sep 2026, MASTER N-91).
// Draait zonder netwerk: de wrangler-uitvoer wordt nagebootst met foutvormen zoals die
// daadwerkelijk in de wrangler-logs van 30 sep 2026 voorkwamen.
//
//   node tests/d1-helper-infra.mjs
import { _d1Met, D1_TIMEOUT_MS } from './lib.mjs';

let geslaagd = 0, gefaald = 0;
function check(naam, ok, detail = '') {
  if (ok) { geslaagd++; console.log('  ✓ ' + naam); } else { gefaald++; console.log('  ✗ ' + naam + (detail ? '  (' + detail + ')' : '')); }
}

const OK = JSON.stringify([{ results: [{ n: 0 }] }]);
const fout = (props) => Object.assign(new Error('Command failed: npx wrangler d1 execute'), { status: 1, signal: null }, props);
const FETCH_FAILED = () => fout({ stdout: JSON.stringify({ error: { text: 'fetch failed' } }) });
const SQL_FOUT = () => fout({ stdout: JSON.stringify({ error: { text: 'A request to the Cloudflare API (/accounts/x/d1/database/y/query) failed.', notes: [{ text: 'no such column: z: SQLITE_ERROR [code: 7500]' }], kind: 'error', name: 'APIError', code: 7500 } }) });
const AUTH_FOUT = () => fout({ stdout: JSON.stringify({ error: { text: 'A request to the Cloudflare API (/accounts/x/d1/database/y) failed.', notes: [{ text: 'Authentication error [code: 10000]' }], name: 'APIError', code: 10000 } }) });
const TIMEOUT = () => fout({ code: 'ETIMEDOUT', signal: 'SIGTERM', status: null, stdout: '' });

function draai(reeks) {
  let aanroepen = 0; const logs = []; const wachten = [];
  const uitvoer = () => { const stap = reeks[aanroepen++]; if (typeof stap === 'function') throw stap(); return stap; };
  let resultaat, fouttekst = null;
  try { resultaat = _d1Met('SELECT 1', { uitvoer, log: (m) => logs.push(m), wacht: (ms) => wachten.push(ms) }); }
  catch (e) { fouttekst = e.message; }
  return { aanroepen, logs, wachten, resultaat, fouttekst };
}

console.log('A · succesvolle D1-call → geen retry');
let r = draai([OK]);
check('1 aanroep, resultaat terug, geen retry-log', r.aanroepen === 1 && r.fouttekst === null && r.resultaat[0].n === 0 && r.logs.length === 0, JSON.stringify(r));

console.log('B · eerste transportfout (fetch failed), tweede succesvol → precies 1 retry → groen');
r = draai([FETCH_FAILED, OK]);
check('2 aanroepen, resultaat terug', r.aanroepen === 2 && r.fouttekst === null && r.resultaat[0].n === 0, JSON.stringify(r));
check('zichtbare INFRA-retrylog', r.logs.length === 1 && r.logs[0].startsWith('INFRA: D1-verificatie tijdelijk onbereikbaar — retry 1/1'), r.logs.join(' | '));
check('korte vaste wacht (1 s), geen lange sleep', r.wachten.length === 1 && r.wachten[0] === 1000, JSON.stringify(r.wachten));

console.log('C · twee transportfouten → rood met INFRA-melding, geen derde poging');
r = draai([FETCH_FAILED, FETCH_FAILED, OK]);
check('precies 2 aanroepen (geen retry-storm)', r.aanroepen === 2, 'aanroepen=' + r.aanroepen);
check('fout met INFRA-melding, geen productsuggestie', r.fouttekst && r.fouttekst.startsWith('INFRA: D1-verificatie onbereikbaar na 1 retry') && /geen productbevinding/.test(r.fouttekst), r.fouttekst);

console.log('C2 · timeout, daarna succes → 1 retry → groen');
r = draai([TIMEOUT, OK]);
check('timeout telt als transportfout, retry slaagt', r.aanroepen === 2 && r.fouttekst === null && new RegExp('timeout ' + D1_TIMEOUT_MS + ' ms').test(r.logs[0] || ''), JSON.stringify(r.logs));

console.log('D · geldig resultaat met verkeerde waarde → geen retry → rood (bij de aanroeper)');
r = draai([JSON.stringify([{ results: [{ n: 3 }] }]), OK]);
check('1 aanroep, verkeerde waarde ongewijzigd doorgegeven', r.aanroepen === 1 && r.fouttekst === null && r.resultaat[0].n === 3, JSON.stringify(r));
let expectFaalt = false; try { if (Number(r.resultaat[0].n) !== 0) throw new Error('cleanup niet 0'); } catch (_) { expectFaalt = true; }
check('assertie van de aanroeper wordt rood', expectFaalt);

console.log('D2 · onleesbare output (geen JSON) → geen retry → rood');
r = draai(['dit is geen json', OK]);
check('1 aanroep, direct fout', r.aanroepen === 1 && r.fouttekst !== null && r.logs.length === 0, JSON.stringify(r));

console.log('E · SQL-fout (APIError code 7500) → geen retry → rood');
r = draai([SQL_FOUT, OK]);
check('1 aanroep, geen retry-log', r.aanroepen === 1 && r.logs.length === 0, JSON.stringify(r));
check('rood met de oorspronkelijke (niet-INFRA) melding incl. SQLITE_ERROR', r.fouttekst && !r.fouttekst.startsWith('INFRA') && /SQLITE_ERROR/.test(r.fouttekst), r.fouttekst);

console.log('E2 · autorisatiefout (APIError code 10000) → geen retry → rood');
r = draai([AUTH_FOUT, OK]);
check('1 aanroep, geen retry, geen INFRA-label', r.aanroepen === 1 && r.logs.length === 0 && r.fouttekst && !r.fouttekst.startsWith('INFRA') && /Authentication error/.test(r.fouttekst), r.fouttekst);

console.log(`\n${geslaagd} geslaagd · ${gefaald} gefaald`);
process.exit(gefaald ? 1 : 0);
