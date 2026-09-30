// N-83 (27 sep 2026) — permanente, automatische negatieve release-test (Marcels expliciete eis,
// punt 5): bekende interne/gevoelige paden MOETEN vóór én na elke frontend-deploy NIET publiek
// bereikbaar zijn. Bedoeld als verplichte release-gate in scripts/deploy.sh, niet als losse audit.
//
// Gebruik: node tests/verify-n83-geen-publieke-lek.mjs <base-url>
// Voorbeeld: node tests/verify-n83-geen-publieke-lek.mjs https://koersvoormorgen.nl
//            node tests/verify-n83-geen-publieke-lek.mjs https://<hash>.kantoorinzicht-frontend.pages.dev
//
// Exit-code 0 = alle geblokkeerde paden zijn daadwerkelijk niet bereikbaar (404/403) EN de bekende
// publieke pagina's werken nog gewoon (200) — exit-code 1 bij een lek OF een onverwachte 404 op een
// bestaande publieke pagina (dat laatste vangt een te-agressieve allowlist/middleware-regressie).
const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Gebruik: node tests/verify-n83-geen-publieke-lek.mjs <base-url>');
  process.exit(2);
}

const MOET_GEBLOKKEERD_ZIJN = [
  '/CLAUDE.md',
  '/MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md',
  '/SECURITY-INVARIANTS.md',
  '/AUTORISATIEMATRIX.md',
  '/BACKLOG.md',
  '/OPEN-BEVINDINGEN.md',
  '/schema.sql',
  '/PLATFORM-OVERZICHT.md',
  '/HANDLEIDING-ADVISEUR.md',
  '/.claude/launch.json',
  '/.git/config',
  '/legal/LEGAL_INVENTORY.md',
  '/tests/rapporten/',
  '/reports/bible-dagrapporten/',
  '/.gevoelige-termen.local.txt',
  '/.cloudflare-api-token.local',
  '/tests/.env.staging.local',
];

const MOET_BEREIKBAAR_ZIJN = [
  '/',
  '/mna.html',
  '/adv.html',
  '/marilyn.html',
  '/index.html',
  '/LOAD-BEARING-PAGES.md',
  '/mna/01-config-sectorprofielen.js',
  '/mna/03-rekenkern-waardering.js',
  '/assets/kvm.js',
  '/tests/README.md',
];

async function checkStatus(path) {
  try {
    const r = await fetch(baseUrl.replace(/\/$/, '') + path, { redirect: 'manual' });
    return r.status;
  } catch (e) {
    return -1;
  }
}

async function eenRonde(log) {
  let fouten = 0;
  const regels = [];
  for (const p of MOET_GEBLOKKEERD_ZIJN) {
    const status = await checkStatus(p);
    const ok = status === 404 || status === 403;
    regels.push([ok, `${ok ? '  ✓' : '  ✗ LEK'} ${p} -> ${status}`]);
    if (!ok) fouten++;
  }
  for (const p of MOET_BEREIKBAAR_ZIJN) {
    const status = await checkStatus(p);
    // 200 of 30x (clean-URL-redirect) zijn beide een geldig "werkt nog".
    const ok = status === 200 || (status >= 300 && status < 400);
    regels.push([ok, `${ok ? '  ✓' : '  ✗ REGRESSIE'} ${p} -> ${status}`]);
    if (!ok) fouten++;
  }
  if (log) regels.forEach(([, tekst]) => console.log(tekst));
  return fouten;
}

// Eén korte, bewuste herhaling (werkregel 40 — geen reeks, dit betreft geen concurrency-vraagstuk
// maar een bekende, eenmalige CDN-propagatievertraging vlak ná een verse deploy): eerste ronde telt,
// bij fouten één stille herronde na een korte pauze vóórdat definitief FAAL gemeld wordt.
async function main() {
  console.log('N-83-negatieve-releasetest tegen:', baseUrl);
  let fouten = await eenRonde(true);
  if (fouten > 0) {
    console.log('');
    console.log(`(${fouten} afwijking(en) op de eerste ronde — kan CDN-propagatie zijn, één herronde na 5s...)`);
    await new Promise((r) => setTimeout(r, 5000));
    fouten = await eenRonde(true);
  }

  console.log('');
  if (fouten > 0) {
    console.error(`🔴 ${fouten} probleem/problemen gevonden (ná herronde) — release-gate FAALT.`);
    process.exit(1);
  }
  console.log('🟢 Geen lekken, geen regressie op bekende publieke paden.');
}

main();
