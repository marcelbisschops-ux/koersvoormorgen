// ══════════════════════════════════════════════════════════════════
// Herbruikbare CLI-tool: documenten uploaden via een ECHTE browsersessie.
//
// Waarom dit bestaat (21 aug 2026): de AI-extractie/velden-merge
// (autoFillFromExtraction, mna/02-state-opslag-documenten.js) draait
// uitsluitend client-side, op de browser-sessie (S.data), die vervolgens
// via /mna/save wordt opgeslagen. Een document rechtstreeks via curl naar
// /mna/document/upload sturen slaat het bestand en de AI-analyse wel op,
// maar vult NOOIT de DD-velden — dat vereist altijd een browserstap.
// Bewuste architectuurkeuze (zie CLAUDE.md): de merge-logica hier
// dupliceren op de server zou het dubbele-bron-risico herintroduceren
// waar dit platform al eerder door gebeten is (sectorprofielen-bug).
//
// Dit script automatiseert dus de ECHTE, bestaande browserflow (zelfde
// aanpak als tests/e2e-ui.spec.js) — geen nieuwe merge-logica, geen
// duplicatie, alleen de klik-voor-klik-stap wegnemen bij het opbouwen
// van testpakketten.
//
// Gebruik:
//   node tests/upload-via-browser.mjs --code=ABCD1234 --fase=financieel --file=/pad/naar/doc1.pdf --file=/pad/naar/doc2.docx
//   node tests/upload-via-browser.mjs --code=ABCD1234 --fase=juridisch --dir=/pad/naar/map   (alle bestanden in de map)
//
// Opties:
//   --code=       verkoper- (of koper-/tussen-)toegangscode van het traject (verplicht)
//   --fase=       fase_id zoals in het sectorprofiel, bijv. financieel/commercieel/... (verplicht)
//   --file=       pad naar één bestand (herhaalbaar)
//   --dir=        map met bestanden — alle bestanden erin worden geüpload (i.p.v. --file)
//   --base=       basis-URL waar mna.html bereikbaar is (default: https://koersvoormorgen.nl)
//   --bewijsstuk  upload alleen als bewijsstuk (geen AI-extractie) — zelfde vinkje als in de UI
//   --headed      toon de browser (default: headless)
// ══════════════════════════════════════════════════════════════════

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function leesArgs() {
  const args = { file: [] };
  for (const a of process.argv.slice(2)) {
    if (a === '--headed') { args.headed = true; continue; }
    if (a === '--bewijsstuk') { args.bewijsstuk = true; continue; }
    const m = a.match(/^--([a-z]+)=(.*)$/);
    if (!m) continue;
    if (m[1] === 'file') args.file.push(m[2]);
    else args[m[1]] = m[2];
  }
  return args;
}

async function main() {
  const args = leesArgs();
  if (!args.code || !args.fase) {
    console.error('Gebruik: node tests/upload-via-browser.mjs --code=<toegangscode> --fase=<fase_id> --file=<pad> [--file=<pad> ...] | --dir=<map> [--base=<url>] [--bewijsstuk] [--headed]');
    process.exit(1);
  }
  let bestanden = args.file || [];
  if (args.dir) {
    const mapBestanden = fs.readdirSync(args.dir)
      .filter(f => !f.startsWith('.'))
      .map(f => path.join(args.dir, f))
      .filter(f => fs.statSync(f).isFile());
    bestanden = bestanden.concat(mapBestanden);
  }
  if (!bestanden.length) {
    console.error('Geen bestanden opgegeven — gebruik --file=<pad> (herhaalbaar) of --dir=<map>.');
    process.exit(1);
  }
  bestanden.forEach(f => { if (!fs.existsSync(f)) { console.error('Bestand niet gevonden: ' + f); process.exit(1); } });

  const base = args.base || 'https://koersvoormorgen.nl';
  console.log(`Inloggen op ${base}/mna.html met code ${args.code}, fase "${args.fase}", ${bestanden.length} bestand(en)...`);

  const browser = await chromium.launch({ headless: !args.headed });
  const page = await browser.newPage();
  try {
    await page.goto(base + '/mna.html');
    await page.locator('#l-code').fill(args.code);
    await page.locator('#l-btn').click();
    await page.waitForFunction(() => window.S && window.S.traject && window.S.rol, null, { timeout: 20000 });

    const faseGevonden = await page.evaluate((faseId) => {
      window.S.screen = 'main';
      const fi = window.FASES.findIndex(f => f.id === faseId);
      if (fi < 0) return false;
      window.S.fase = fi;
      window.renderApp();
      return true;
    }, args.fase);
    if (!faseGevonden) {
      console.error(`Fase "${args.fase}" bestaat niet in het sectorprofiel van dit traject.`);
      process.exit(1);
    }

    if (args.bewijsstuk) {
      await page.locator('#bewijsstuk-alleen-' + args.fase).check();
    }

    const input = page.locator('input[type="file"][multiple]');
    await input.waitFor({ state: 'attached', timeout: 10000 });
    // De pagina pollt na inloggen o.a. Signhost-status en herhaalt renderApp() een aantal keer kort
    // ná elkaar — even laten uitzakken vóórdat we het bestandsveld aanraken, anders kan setInputFiles
    // een net-vervangen (stale) inputnode raken zonder dat er iets gebeurt.
    await page.waitForTimeout(1500);

    // Bestanden ÉÉN voor ÉÉN uploaden (matcht uploadDocumentenSequentieel — de app verwerkt ze ook
    // zo) en voor ELK bestand harde bevestiging afdwingen dat de /mna/document/upload-aanroep
    // daadwerkelijk is vertrokken. Puur op de statusregel ("leeg = klaar") vertrouwen bleek
    // onbetrouwbaar: die tekst is óók leeg VÓÓRDAT er iets gebeurt, dus als setInputFiles om wat voor
    // reden dan ook geen echte change-event triggert, "slaagt" de wachtconditie meteen zonder dat er
    // ook maar iets is geüpload — stil dataverlies, precies wat dit script juist moet voorkomen.
    for (let i = 0; i < bestanden.length; i++) {
      const bestand = bestanden[i];
      const naam = path.basename(bestand);
      // Echte AI-analyse duurt 10-30+ seconden per bestand (zie mna/02-state-opslag-documenten.js) —
      // dus RUIM wachten, in één poging. Een eerdere versie van dit script gebruikte een kort
      // (15s) timeout met automatisch opnieuw-proberen: dat vuurde soms een TWEEDE upload af terwijl
      // de eerste nog liep (gewoon trager dan 15s, niet vastgelopen), met overlappende/verwarrende
      // verzoeken tot gevolg. Eén poging, genoeg marge, is betrouwbaarder gebleken.
      const uploadWacht = page.waitForResponse(
        (r) => r.url().includes('/mna/document/upload') && r.request().method() === 'POST',
        { timeout: 300000 }
      );
      await input.setInputFiles(bestanden.length === 1 ? bestanden : [bestand]);
      const uploadResp = await uploadWacht; // gooit vanzelf een duidelijke timeout-fout na 90s
      const saveWacht = page.waitForResponse(
        (r) => r.url().includes('/mna/save') && r.request().method() === 'POST',
        { timeout: 20000 }
      ).catch(() => null); // geen harde fout: bij een afgewezen document verandert er niets, dus geen save

      const uploadJson = await uploadResp.json().catch(() => null);
      if (!uploadJson || !uploadJson.ok) {
        console.log(`  ✗ ${naam}: upload-aanroep gaf geen ok-respons (${uploadResp.status()}) — ${uploadJson?.error || 'onbekende fout'}`);
        continue;
      }
      if (uploadJson.verworpen) {
        console.log(`  ⊘ ${naam}: AFGEWEZEN — ${uploadJson.verworpen_reden || 'reden onbekend'}`);
        continue;
      }
      const saveResp = await saveWacht;
      if (saveResp) {
        console.log(`  ✓ ${naam}: verwerkt, velden gemerged en opgeslagen (save-status ${saveResp.status()}).`);
      } else {
        console.log(`  ✓ ${naam}: verwerkt en gemerged, maar geen /mna/save waargenomen binnen 20s — kan kloppen als geen enkel veld nieuw was, controleer bij twijfel handmatig.`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Fout:', e.message); process.exit(1); });
