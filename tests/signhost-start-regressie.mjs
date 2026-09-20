// ══════════════════════════════════════════════════════════════════
// Regressietest — Signhost Stap 3 ("transactie starten") moet op .ok gecontroleerd worden vóórdat
// de transactie als 'pending'/'verstuurd' wordt geregistreerd (bugfix 20 sep 2026, betrouwbaarheids-
// scan ná het Signhost-testincident: startResp werd voorheen nooit gecontroleerd — bij een mislukte
// start (4xx/5xx) gaf de route toch ok:true/status:'verstuurd' terug en schreef de transactie naar D1).
//
// Doet BEWUST geen echte Signhost-aanroep (Marcel, 20 sep 2026, expliciet: "geen echte Signhost-call
// nodig; mock/stub de start-response"). Een volledige live route-mock is hier niet praktisch haalbaar
// zonder ook Cloudflare Browser Rendering (env.BROWSER, gebruikt door Stap 2 vóór Stap 3) te moeten
// nabootsen — dat zou een veel grotere testinfrastructuurwijziging zijn dan deze gerichte fix
// rechtvaardigt. Deze test bewijst daarom twee dingen die samen de fix daadwerkelijk dekken:
//  1. STRUCTUREEL (statisch, tegen de daadwerkelijke broncode): de .ok-check op startResp staat
//     tussen de fetch-aanroep en de D1-schrijfactie — een toekomstige regressie die de check
//     verwijdert of verplaatst na de D1-write breekt deze test.
//  2. GEDRAGSMATIG (tegen synthetische Response-achtige objecten, exact het patroon dat de echte
//     code gebruikt voor alle drie de Signhost-stappen — txResp/fileResp/startResp): een mislukte
//     respons (ok:false) resulteert in een foutmelding, nooit in een impliciet succes.
//
// Draaien: node tests/signhost-start-regressie.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { check, kop, samenvatting } from './lib.mjs';

const BACKEND_DIR = process.env.KVM_BACKEND_DIR
  || path.join(os.homedir(), 'Documents', 'GitHub', 'koersvoormorgen-backend', 'backend');
const BRON_PAD = path.join(BACKEND_DIR, 'worker', '20-signhost-vok.js');

kop('Signhost Stap 3 — startResp.ok wordt gecontroleerd vóór D1-registratie');

let bron;
try {
  bron = readFileSync(BRON_PAD, 'utf8');
} catch (e) {
  check('bronbestand leesbaar (' + BRON_PAD + ')', false, e.message);
  samenvatting();
  process.exit(1);
}

// 1. Structurele check: de volgorde in de daadwerkelijke broncode.
const idxStartFetch = bron.indexOf("fetch(`https://api.signhost.com/api/transaction/${transactionId}/start`");
check('Stap 3 (transactie starten) aanwezig in de broncode', idxStartFetch !== -1);

const idxOkCheck = bron.indexOf('if (!startResp.ok)', idxStartFetch === -1 ? 0 : idxStartFetch);
check('startResp.ok wordt gecontroleerd (regressie van de bugfix van 20 sep 2026)', idxOkCheck !== -1 && idxOkCheck > idxStartFetch, 'idxStartFetch=' + idxStartFetch + ' idxOkCheck=' + idxOkCheck);

const idxD1Write = bron.indexOf("UPDATE mna_trajecten SET signhost_transactions=?", idxOkCheck === -1 ? 0 : idxOkCheck);
check('de .ok-check staat VÓÓR de D1-schrijfactie (signhost_transactions)', idxOkCheck !== -1 && idxD1Write !== -1 && idxOkCheck < idxD1Write, 'idxOkCheck=' + idxOkCheck + ' idxD1Write=' + idxD1Write);

const idxTosStatus = bron.indexOf("UPDATE tos_document SET status='verstuurd'", idxOkCheck === -1 ? 0 : idxOkCheck);
check('de .ok-check staat VÓÓR de tos_document-statusovergang naar verstuurd', idxOkCheck !== -1 && idxTosStatus !== -1 && idxOkCheck < idxTosStatus, 'idxOkCheck=' + idxOkCheck + ' idxTosStatus=' + idxTosStatus);

// Foutpropagatie-check binnen deze gerichte scan (werkregel 15/16, maar bewust NIET verbreed naar een
// hele audit — alleen de twee andere Signhost-API-stappen die exact hetzelfde faalpatroon zouden
// kunnen hebben, want die riepen we zojuist zelf op in dit dossier).
const idxTxFetch = bron.indexOf("fetch('https://api.signhost.com/api/transaction'");
const idxTxCheck = bron.indexOf('if (!txResp.ok)');
check('Stap 1 (transactie aanmaken): txResp.ok wordt al gecontroleerd (bestaand, ter vergelijking)', idxTxFetch !== -1 && idxTxCheck !== -1 && idxTxCheck > idxTxFetch);
const idxFileFetch = bron.indexOf('/file/${doc_type}.pdf`, {');
const idxFileCheck = bron.indexOf('if (!fileResp.ok)');
check('Stap 2 (document uploaden): fileResp.ok wordt al gecontroleerd (bestaand, ter vergelijking)', idxFileFetch !== -1 && idxFileCheck !== -1 && idxFileCheck > idxFileFetch);

// 2. Gedragsmatige check: hetzelfde controlepatroon, synthetisch (geen netwerk, geen echte Signhost-
// aanroep) — bewijst dat "een mislukte respons ⇒ foutmelding, nooit impliciet succes" correct werkt
// voor het exacte patroon dat de route gebruikt.
kop('Gedragsmatig (synthetisch, geen echte Signhost-aanroep)');
async function verwerkAlsDeRoute(resp) {
  // Exacte kopie van het patroon in worker/20-signhost-vok.js (txResp/fileResp/startResp): bij een
  // mislukte respons een foutmelding bouwen, anders doorgaan.
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return { doorgegaan: false, foutmelding: 'Signhost transactie starten mislukt: ' + errText.substring(0, 200) };
  }
  return { doorgegaan: true };
}

const faalResp = { ok: false, status: 500, text: async () => 'Interne Signhost-fout (synthetisch)' };
const rFaal = await verwerkAlsDeRoute(faalResp);
check('mislukte startResp (ok:false) ⇒ doorgegaan:false, duidelijke foutmelding', rFaal.doorgegaan === false && rFaal.foutmelding.includes('mislukt'), JSON.stringify(rFaal));

const succesResp = { ok: true, status: 200, text: async () => '' };
const rSucces = await verwerkAlsDeRoute(succesResp);
check('geslaagde startResp (ok:true) ⇒ doorgegaan:true (pas dan mag D1 geschreven worden)', rSucces.doorgegaan === true, JSON.stringify(rSucces));

const resp4xx = { ok: false, status: 422, text: async () => 'Unprocessable' };
const r4xx = await verwerkAlsDeRoute(resp4xx);
check('4xx-respons wordt net als 5xx behandeld als mislukking (geen valse ok:true)', r4xx.doorgegaan === false);

samenvatting();
