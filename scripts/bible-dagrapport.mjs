#!/usr/bin/env node
// Dagelijkse KVM Bible/MASTER-managementrapportage (Marcel, 26 sep 2026, bouwopdracht).
// Volledig deterministisch: parseert MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md, bewaart een compacte
// dagsnapshot, berekent de delta t.o.v. de vorige snapshot, en genereert het vaste rapport in
// mensentaal — puur via tekstextractie uit de MASTER zelf (die al in het Nederlands is geschreven),
// GEEN AI-aanroep nodig voor de dagelijkse generatie (zie werkregel 43, "geen dagelijkse AI-kosten
// voor iets dat een script betrouwbaar kan"). Wijzigt de MASTER nooit (puur lezen), start geen
// tests/audits, en mag nooit de normale werkcyclus beïnvloeden (aanroeper wrapt dit in `|| true`).
//
// Gebruik: node scripts/bible-dagrapport.mjs [--datum JJJJ-MM-DD]
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.join(new URL('.', import.meta.url).pathname, '..');
const MASTER_PAD = path.join(REPO_ROOT, 'MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md');
const SNAPSHOT_DIR = path.join(REPO_ROOT, 'reports', 'bible-snapshots');
const RAPPORT_DIR = path.join(REPO_ROOT, 'reports', 'bible-dagrapporten');

const STATUS_LABEL = { x: 'DONE', ' ': 'OPEN', '~': 'DEELS', B: 'BLOCKED_MARCEL' };
const PRIORITEIT_VOLGORDE = ['P0', 'P1', 'P2', 'P3', 'P4', 'N'];

function prioriteitVanId(id) {
  const m = id.match(/^P([0-4])/);
  if (m) return 'P' + m[1];
  if (/^N-/.test(id)) return 'N';
  return 'N';
}

function vandaagISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseerMaster(tekst) {
  const regels = tekst.split('\n');
  const kopRe = /^(#{2,3})\s/;
  const items = [];
  for (let i = 0; i < regels.length; i++) {
    const m = regels[i].match(kopRe);
    if (!m || m[1] !== '###') continue;
    const heading = regels[i].replace(/^###\s*/, '');
    const emIdx = heading.indexOf('—');
    if (emIdx === -1) continue; // geen itemkop in het verwachte format, overslaan (geen aanname)
    const idDeel = heading.slice(0, emIdx).trim();
    let titel = heading.slice(emIdx + 1).trim();
    const ids = idDeel.split('/').map((s) => s.trim()).filter(Boolean);
    if (!ids.length) continue;

    let eindIdx = regels.length;
    for (let j = i + 1; j < regels.length; j++) {
      if (kopRe.test(regels[j])) { eindIdx = j; break; }
    }
    const body = regels.slice(i + 1, eindIdx).join('\n');

    // Titel-vervolgregels: Marcels koppen wrappen soms over meerdere fysieke regels vóór de
    // statusregel begint (bijv. N-79) — zonder komma/leesteken-afsluiting op de kopregel zelf is dit
    // de enige betrouwbare manier om de volledige titel samen te voegen zonder de body te lezen.
    for (let j = i + 1; j < Math.min(eindIdx, i + 6); j++) {
      const r = regels[j];
      if (!r || !r.trim()) break;
      if (/^`\[([x ~B])\]/.test(r)) break;
      titel += ' ' + r.trim();
    }

    // Statusmarker: `[x]`/`[ ]`/`[~]`/`[B]` aan het begin van een regel, binnen de eerste ~12 regels
    // na de kop. Bewust NIET stoppen bij de eerste inhoudelijke regel zonder marker — een kop-titel
    // kan over meerdere fysieke regels doorlopen (Marcels eigen tekstwrap-stijl, bijv. N-79) vóórdat
    // de statusregel komt; vroegtijdig afbreken miste die items stilzwijgend (gevonden + gefixt tijdens
    // het bouwen van dit rapport, testcase: N-79 verdween ten onrechte uit de snapshot).
    let status = null;
    for (const r of regels.slice(i + 1, Math.min(eindIdx, i + 12))) {
      const sm = r.match(/^`\[([x ~B])\]/);
      if (sm) { status = sm[1]; break; }
    }
    if (status === null) continue; // geen herkenbare status binnen het venster — geen aanname, overslaan

    // Parserfout gevonden en gefixt (Marcel, 26 sep 2026, na controle van het eerste N-80-rapport):
    // een kale substring-match op "RELEASE-READY"/"PROD VERIFIED" ving ook voorbeelden als
    // "RELEASE-READY-achterstand" (een verwijzing naar het bredere backlogbegrip, geen statusclaim
    // van DIT item) en zelfmeta-verwijzingen binnen backtick-codespans (bijv. N-80's eigen beschrijving
    // van dit script, dat toevallig de term `PROD VERIFIED` noemt als voorbeeldveldnaam). Fix: (1)
    // backtick-codespans eerst verwijderen — een echte statusclaim staat in dit document altijd in
    // platte tekst/vet, nooit in code-aanhalingstekens; (2) "RELEASE-READY" gevolgd door "-achterstand"
    // telt expliciet niet mee.
    const bodyZonderCode = body.replace(/`[^`]*`/g, '');
    const prodVerified = /PROD[ _]VERIFIED/i.test(bodyZonderCode);
    const releaseReady = /RELEASE-READY(?!-achterstand)/.test(bodyZonderCode);
    const blockedMarcel = status === 'B' || /\[B\]\s*BLOCKED MARCEL/.test(body);
    let blockedReason = null;
    if (blockedMarcel) {
      const idx = body.indexOf('BLOCKED MARCEL');
      if (idx !== -1) {
        let rest = body.slice(idx + 'BLOCKED MARCEL'.length);
        rest = rest.replace(/^[`)\s]+/, ''); // sluitende backtick/haakje/spatie direct na de marker weg
        rest = rest.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
        blockedReason = rest.slice(0, 220).replace(/[,;.\s]+$/, '') || 'reden niet automatisch te extraheren';
      } else {
        blockedReason = 'reden niet automatisch te extraheren';
      }
    }
    // Korte mensentaal-samenvatting: eerste zinvolle inhoudelijke zin ná de statusregel (voor de
    // "Vandaag gerealiseerd"/rapportsecties) — puur extractie, geen AI-herformulering.
    const naStatus = body.split(/^`\[([x ~B])\][^\n]*\n/m).pop() || body;
    const eersteZin = (naStatus.replace(/\*\*/g, '').split(/\n\n/).find((p) => p.trim().length > 20) || '')
      .replace(/\s+/g, ' ').trim().slice(0, 240);

    for (const id of ids) {
      items.push({
        id,
        titel,
        prioriteit: prioriteitVanId(id),
        status: STATUS_LABEL[status],
        prod_verified: prodVerified,
        release_ready: releaseReady,
        blocked_reason: blockedReason,
        samenvatting: eersteZin,
        regel: i + 1,
      });
    }
  }
  return items;
}

function laatsteVorigeSnapshot(voorDatum) {
  if (!existsSync(SNAPSHOT_DIR)) return null;
  const bestanden = readdirSync(SNAPSHOT_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) < voorDatum)
    .sort();
  if (!bestanden.length) return null;
  const laatste = bestanden[bestanden.length - 1];
  return { datum: laatste.slice(0, 10), data: JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, laatste), 'utf8')) };
}

function berekenDelta(vorige, huidige) {
  const vorigeMap = new Map((vorige ? vorige.items : []).map((it) => [it.id, it]));
  const huidigeMap = new Map(huidige.items.map((it) => [it.id, it]));
  const delta = {
    nieuw_done: [], nieuw_release_ready: [], nieuw_open: [], nieuw_blocked: [],
    heropend: [], nieuwe_items: [], statuswijzigingen: [], verdwenen_items: [],
  };
  for (const [id, item] of huidigeMap) {
    const oud = vorigeMap.get(id);
    if (!oud) { delta.nieuwe_items.push(item); continue; }
    if (oud.status !== item.status) {
      delta.statuswijzigingen.push({ id, van: oud.status, naar: item.status, titel: item.titel });
      if (item.status === 'DONE' && oud.status !== 'DONE') delta.nieuw_done.push(item);
      if (item.status === 'OPEN' && oud.status !== 'OPEN') delta.nieuw_open.push(item);
      if (item.status === 'BLOCKED_MARCEL' && oud.status !== 'BLOCKED_MARCEL') delta.nieuw_blocked.push(item);
      if (oud.status === 'DONE' && item.status !== 'DONE') delta.heropend.push(item);
    }
    if (!oud.release_ready && item.release_ready) delta.nieuw_release_ready.push(item);
  }
  for (const [id, item] of vorigeMap) {
    if (!huidigeMap.has(id)) delta.verdwenen_items.push(item);
  }
  return delta;
}

function tellingen(items) {
  const t = { totaal_items: items.length, done: 0, open: 0, deels: 0, blocked: 0, release_ready: 0 };
  for (const it of items) {
    if (it.status === 'DONE') t.done++;
    else if (it.status === 'OPEN') t.open++;
    else if (it.status === 'DEELS') t.deels++;
    else if (it.status === 'BLOCKED_MARCEL') t.blocked++;
    if (it.release_ready) t.release_ready++;
  }
  return t;
}

function isSecurityItem(item) {
  return /security|autorisatie|privacy|invariant|IP-|intellectueel eigendom|rolgrens|cross-role|cross-traject/i.test(item.titel);
}

function volgendeCanoniekeActie(items) {
  const kandidaten = items.filter((it) => (it.status === 'OPEN' || it.status === 'DEELS') && it.status !== 'BLOCKED_MARCEL');
  for (const p of PRIORITEIT_VOLGORDE) {
    const match = kandidaten.filter((it) => it.prioriteit === p).sort((a, b) => a.regel - b.regel);
    if (match.length) return match[0];
  }
  return null;
}

function fmtLijst(items, lege = '(geen)') {
  if (!items.length) return lege;
  return items.map((it) => `- **${it.id}** — ${it.titel}`).join('\n');
}

function genereerRapport(datum, items, delta, vorigeDatum) {
  const t = tellingen(items);
  const gerealiseerd = [...delta.nieuw_done, ...delta.nieuw_release_ready.filter((it) => !delta.nieuw_done.includes(it))];
  const releaseReadyAlles = items.filter((it) => it.release_ready);
  const deels = items.filter((it) => it.status === 'DEELS');
  const blocked = items.filter((it) => it.status === 'BLOCKED_MARCEL');
  const openAlles = items.filter((it) => it.status === 'OPEN');
  const securityOpen = items.filter((it) => isSecurityItem(it) && it.status !== 'DONE');
  const volgende = volgendeCanoniekeActie(items);

  const productBlokken = ['P1-PLAT-1', 'P1-CRM-1', 'P1-BUY-1', 'N-54', 'N-74', 'P1-BILL-1'];
  const productRegels = productBlokken.map((id) => {
    const it = items.find((x) => x.id === id);
    return it ? `- **${id}** (${it.titel}) — ${it.status}${it.release_ready ? ' / RELEASE-READY' : ''}${it.prod_verified ? ' / PROD VERIFIED' : ''}` : `- **${id}** — niet gevonden in MASTER (mogelijk hernummerd/nog niet geregistreerd)`;
  });

  const md = `# 📖 KVM BIBLE — DAGSTATUS ${datum}

*Gegenereerd deterministisch uit MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md. Bron blijft de MASTER zelf; dit rapport is een leesbare afgeleide, geen aparte waarheid.*

## 🏆 Vandaag gerealiseerd
${fmtLijst(gerealiseerd, '(geen nieuwe DONE/RELEASE-READY-statuswijziging t.o.v. de vorige snapshot)')}

## 🚀 Klaar maar nog niet live
${fmtLijst(releaseReadyAlles)}

## 🟠 Deels gereed
${deels.length ? deels.map((it) => `- **${it.id}** — ${it.titel}`).join('\n') : '(geen)'}

## ⛔ Marcel nodig
${blocked.length ? blocked.map((it) => `- **${it.id}** — ${it.blocked_reason || it.titel}`).join('\n') : '(geen openstaande BLOCKED MARCEL-items)'}

## 🔐 Security / privacy / IP
${securityOpen.length ? fmtLijst(securityOpen) : '(geen open security/privacy/IP-items gevonden op basis van titelherkenning — geen nieuw oordeel, alleen bestaande MASTER-status)'}

## 🧱 Productontwikkeling
${productRegels.join('\n')}

## 📋 Wat staat nog open?
OPEN: ${t.open} · DEELS: ${t.deels} · BLOCKED: ${t.blocked} · RELEASE-READY: ${t.release_ready}

${fmtLijst([...openAlles, ...deels])}

## 📈 Verschil met gisteren${vorigeDatum ? ` (${vorigeDatum})` : ' (geen vorige snapshot beschikbaar)'}
- Nieuw DONE: ${delta.nieuw_done.length}
- Nieuw RELEASE-READY: ${delta.nieuw_release_ready.length}
- Nieuw OPEN: ${delta.nieuw_open.length}
- Nieuw BLOCKED: ${delta.nieuw_blocked.length}
- Heropend: ${delta.heropend.length}
- Nieuwe MASTER-items: ${delta.nieuwe_items.length}
- Statuswijzigingen: ${delta.statuswijzigingen.length}${delta.statuswijzigingen.length ? '\n  ' + delta.statuswijzigingen.map((s) => `${s.id}: ${s.van}→${s.naar}`).join('\n  ') : ''}
${delta.verdwenen_items.length ? `- ⚠️ VERDWENEN/INCONSISTENT (niet automatisch genegeerd): ${delta.verdwenen_items.map((i) => i.id).join(', ')}` : ''}

## 🎯 Hier gaat Claude verder
${volgende ? `1. **${volgende.id}** — ${volgende.titel} (${volgende.prioriteit}, ${volgende.status})\n\n*Mechanische eerste kandidaat volgens prioriteitsvolgorde (P0>P1>P2>P3>P4>N, niet-BLOCKED, eerste in de MASTER) — geen vervanging van menselijk/Claude-oordeel of van een expliciete architectuur-/productbeslissing die het item zelf nog vereist.*` : '(geen uitvoerbaar OPEN/DEELS-item gevonden — mogelijk alles DONE/BLOCKED)'}
`;
  return md;
}

function main() {
  const args = process.argv.slice(2);
  const datumIdx = args.indexOf('--datum');
  const datum = datumIdx !== -1 ? args[datumIdx + 1] : vandaagISO();

  if (!existsSync(MASTER_PAD)) {
    console.error('FOUT: MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md niet gevonden — rapportage overgeslagen, werkcyclus niet geraakt.');
    process.exit(1);
  }
  const tekst = readFileSync(MASTER_PAD, 'utf8');
  const items = parseerMaster(tekst);
  if (!items.length) {
    console.error('FOUT: geen items herkend in de MASTER — mogelijk formatwijziging. Geen rapport gegenereerd (geen vals/half rapport).');
    process.exit(1);
  }

  const t = tellingen(items);
  const vorige = laatsteVorigeSnapshot(datum);
  const snapshot = { datum, ...t, blocked_marcel: blockedTellen(items), items };
  const delta = berekenDelta(vorige ? vorige.data : null, snapshot);

  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  mkdirSync(RAPPORT_DIR, { recursive: true });
  writeFileSync(path.join(SNAPSHOT_DIR, datum + '.json'), JSON.stringify(snapshot, null, 2));

  const rapport = genereerRapport(datum, items, delta, vorige ? vorige.datum : null);
  writeFileSync(path.join(RAPPORT_DIR, datum + '.md'), rapport);

  console.log('OK — rapport geschreven: reports/bible-dagrapporten/' + datum + '.md');
  console.log('Snapshot: reports/bible-snapshots/' + datum + '.json (' + items.length + ' items)');
}

function blockedTellen(items) {
  return items.filter((it) => it.status === 'BLOCKED_MARCEL').length;
}

main();
