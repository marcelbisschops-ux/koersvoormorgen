#!/usr/bin/env node
/**
 * RETENTION ENGINE — Koers voor Morgen / Bisschops Financing B.V.
 * ---------------------------------------------------------------
 * Bepaalt per informatieobject: categorie → opdracht/relatie → overeenkomst →
 * toepasselijke voorwaardenversie → bewaarregel → startdatum → einddatum → status,
 * met een reproduceerbare reden en een audit trail.
 *
 * BELANGRIJKSTE PRINCIPES (verplicht, niet onderhandelbaar):
 *  1. Nooit verwijderen bij onzekerheid  → STATUS = REVIEW_REQUIRED.
 *  2. Nooit automatisch de HUIDIGE voorwaarden toepassen op een oude overeenkomst —
 *     altijd de versie die gold op de contractdatum (tenzij een 'latere versie geldt'-beding
 *     of een addendum anders bepaalt).
 *  3. Contractuele context altijd reconstrueren.
 *  4. Wettelijke verplichtingen expliciet meenemen; NOOIT 'gewoon de langste termijn'.
 *  5. Per informatieobject beoordelen wanneer nodig (M&A-dossier ≠ één termijn).
 *  6. Iedere beslissing reproduceerbaar.
 *  7. Alles eerst in DRY RUN (default).
 *  8. Geen schijnzekerheid; geen hardcoded termijn zonder bron.
 *
 * GEBRUIK:
 *   node legal/retention/retention-engine.mjs [opties]
 *     --source=snapshot|fixtures      databron (default: snapshot in legal/retention/.data/)
 *     --data-dir=<pad>                 alternatief brondir
 *     --simulate-date=YYYY-MM-DD       "wat zou de engine op deze datum beslissen" (default: vandaag)
 *     --out=<pad>                      rapportmap (default: legal/retention/reports/)
 *     --json-only                      alleen het JSON-rapport, geen Markdown
 *     --enforce                        sta retentie-acties toe (default: DRY RUN)
 *     --execute                        voer de acties ook echt uit (vereist --enforce)
 *     --limit=<n>                      verwerk max n objecten (debug)
 *   node legal/retention/retention-engine.mjs snapshot        # eerst live D1 → .data/ (aparte helper)
 *
 * ENFORCE handelt UITSLUITEND op status DELETE_ELIGIBLE met confidence 'hoog', raakt nooit
 * REVIEW_REQUIRED / LEGAL_HOLD / UNKNOWN / RETENTION_REQUIRED, en logt elke actie.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HIER, '..', '..');
const ENGINE_VERSIE = '1.0.0';

const DAG = 86400000;
const MAAND = DAG * 30;               // benaderend; kalendermaand-precisie via addMonths()
const JAAR = DAG * 365;

/* ---------- argumenten ---------- */
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SIM = args['simulate-date'] ? new Date(args['simulate-date'] + 'T12:00:00Z') : new Date();
if (isNaN(SIM)) fail('Ongeldige --simulate-date (verwacht YYYY-MM-DD)');
const SOURCE = args.source || 'snapshot';
const DATA_DIR = args['data-dir'] || path.join(HIER, SOURCE === 'fixtures' ? 'fixtures' : '.data');
const OUT_DIR = args.out || path.join(HIER, 'reports');
const ENFORCE = !!args.enforce;
const EXECUTE = !!args.execute && ENFORCE;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }
function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail('Kan ' + p + ' niet lezen: ' + e.message); } }

/* ---------- policies ---------- */
const AV = loadJson(path.join(HIER, 'policies', 'av-versions.json')).documenten;
const LEGAL = loadJson(path.join(HIER, 'policies', 'legal-rules.json')).regels;
const RULES = loadJson(path.join(HIER, 'policies', 'retention-rules.json')).regels;
const CATS = loadJson(path.join(HIER, 'policies', 'categories.json')).categorieen;
const HOLDS = loadJson(path.join(HIER, 'legal-holds.json')).holds.filter(h => !h.opgeheven);
const REGISTRY = loadJson(path.join(HIER, 'contracts', 'registry.json'));
// testhaak: laat de testsuite een tijdelijke registry-override injecteren zonder het bestand te wijzigen
if (process.env.RETENTION_TEST_OVERRIDE) {
  try { REGISTRY.handmatige_overrides = [...(REGISTRY.handmatige_overrides || []), JSON.parse(process.env.RETENTION_TEST_OVERRIDE)]; } catch (e) { /* negeren */ }
}

/* ---------- datum-helpers ---------- */
function toDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v); // epoch s of ms
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.length === 10 ? s + 'T12:00:00Z' : s);
  const n = Number(s); if (!isNaN(n)) return new Date(n < 1e12 ? n * 1000 : n);
  return null;
}
function iso(d) { return d ? new Date(d).toISOString().slice(0, 10) : null; }
function addMonths(d, m) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; }
function addYears(d, y) { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() + y); return x; }
function addDays(d, n) { return new Date(+d + n * DAG); }
function eindeBoekjaarPlus(d, jaren) { const x = new Date(Date.UTC(d.getUTCFullYear() + jaren, 11, 31, 12)); return x; }
function termijnEinde(start, termijn) {
  if (!start || !termijn) return null;
  if (termijn.eenheid === 'dagen') return addDays(start, termijn.waarde);
  if (termijn.eenheid === 'maanden') return addMonths(start, termijn.waarde);
  if (termijn.eenheid === 'jaren') return addYears(start, termijn.waarde);
  return null;
}

/* ---------- voorwaardenversie op datum ---------- */
function avVersieOpDatum(docSleutel, datum) {
  const doc = AV[docSleutel];
  if (!doc || !datum) return { versie: null, herkomst: 'onbekend', record: null, doc };
  const d = iso(datum);
  for (const v of doc.versies) {
    const van = v.ingangsdatum, tot = v.einddatum;
    if (van && d >= van && (!tot || d <= tot)) return { versie: v.versie, herkomst: 'op_datum', record: v, doc };
  }
  // geen match: pak de laatst bekende vóór de datum (versie kan doorlopen als einddatum onbekend)
  const eerdere = doc.versies.filter(v => v.ingangsdatum && v.ingangsdatum <= d).sort((a, b) => a.ingangsdatum < b.ingangsdatum ? 1 : -1);
  if (eerdere.length) return { versie: eerdere[0].versie, herkomst: 'afgeleid_laatst_voor_datum', record: eerdere[0], doc };
  return { versie: null, herkomst: 'geen_versie_voor_datum', record: null, doc };
}

/* ---------- data laden ---------- */
function loadSource() {
  if (!fs.existsSync(DATA_DIR)) {
    fail(`Databron ontbreekt: ${DATA_DIR}\n  Maak eerst een snapshot:  node legal/retention/snapshot.mjs   (vereist wrangler + D1-toegang)\n  Of draai tegen fixtures:   --source=fixtures`);
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const tables = {};
  for (const f of files) tables[f.replace(/\.json$/, '')] = loadJson(path.join(DATA_DIR, f));
  return tables;
}

/* ---------- objecten inventariseren ---------- */
function inventariseer(tables) {
  const objs = [];
  const trajecten = Object.fromEntries((tables['mna_trajecten'] || []).map(t => [t.id, t]));
  const gebruikers = Object.fromEntries((tables['bf_gebruikers'] || []).map(g => [g.id, g]));

  const push = (categorieKey, tabel, rij) => {
    const cat = CATS[categorieKey];
    objs.push({ categorieKey, cat, tabel, rij, trajecten, gebruikers });
  };

  // expliciete mapping van tabelnaam → categoriesleutel
  const tabelNaarCat = {
    mna_trajecten: 'mna_traject',
    mna_documenten: 'mna_document_upload',
    mna_doc_versies: 'mna_doc_versie',
    mna_gesprek_bijlagen: 'mna_gesprek_bijlage',
    mna_bankmutaties_import: 'mna_bankmutaties_import',
    mna_bankmutaties_regel: 'mna_bankmutaties_regel',
    mna_vok: 'mna_vok_acceptatie',
    bf_gebruikers: 'bf_gebruiker_account',
    scan_rapporten: 'scan_rapport', rapporten: 'scan_rapport', scans: 'scan_rapport', verhuis_scans: 'verhuisscan_data',
    verhuis_groepen: 'verhuisscan_data', verhuis_groep_scans: 'verhuisscan_data',
    rapport_usage: 'rapport_usage',
    callbacks: 'terugbelverzoek',
    contact_berichten: 'contact_bericht',
    mna_leads: 'lead',
    adviseur_proef_aanvragen: 'proefaccount_aanvraag',
    platform_fee_events: 'fee_event',
    mna_audit: 'audit_log', security_audit_log: 'audit_log', security_selfcheck_log: 'audit_log',
    traject_viewer_log: 'audit_log', avg_verwijder_log: 'audit_log', mna_wijzigingen: 'audit_log',
    traject_viewers: 'meekijker',
  };
  const inhoudTabellen = ['mna_data', 'mna_beoordelingen', 'mna_qa', 'mna_qa_reacties', 'mna_chat',
    'mna_logboek', 'mna_gesprekken', 'mna_gesprek_concepten', 'mna_partners', 'mna_entiteiten',
    'mna_koper_criteria', 'mna_waarderingen', 'mna_risicoraamwerk', 'mna_fase_status', 'mna_info_fases',
    'mna_infoverzoek', 'mna_closing_checklist_status'];

  for (const [tabel, rijen] of Object.entries(tables)) {
    if (!Array.isArray(rijen)) continue;
    if (/_backup_\d{8}$/.test(tabel)) { for (const r of rijen) push('backup_tabel_stale', tabel, r); continue; }
    if (inhoudTabellen.includes(tabel)) { for (const r of rijen) push('mna_traject_inhoud', tabel, r); continue; }
    const catKey = tabelNaarCat[tabel];
    if (!catKey) continue; // tabellen zonder retention-relevantie (config, benchmarks, sequences) overslaan
    for (const r of rijen) push(catKey, tabel, r);
  }
  return objs.slice(0, LIMIT);
}

/* ---------- persoonsgegeven-detectie ---------- */
const PII_HINT = /email|e_mail|naam|contact|telefoon|tel$|adres|kvk|ip$|ip_|_ip|ondertekenaar|persoon|dob|geboorte|bsn/i;
function bevatPii(cat, rij) {
  if (cat && cat.persoonsgegevens === 'ja') return true;
  if (cat && cat.persoonsgegevens === 'nee') return false;
  // 'gemengd' of onbekend: conservatief — een M&A-document(row) bevat vrijwel altijd persoonsgegevens
  // in de bijbehorende bestandsinhoud; behandel als PII tenzij de rij aantoonbaar niets bevat.
  if (cat && cat.persoonsgegevens === 'gemengd') return true;
  return Object.keys(rij || {}).some(k => PII_HINT.test(k) && rij[k] != null && rij[k] !== '');
}

/* ---------- kernbeoordeling per object ---------- */
function beoordeel(o) {
  const { categorieKey, cat, tabel, rij, trajecten, gebruikers } = o;
  const notes = [];
  const objectId = `${tabel}:${rij[(cat && cat.sleutel && cat.sleutel.split('|')[0]) || 'id'] || rij.id || rij.scan_id || JSON.stringify(rij).slice(0, 24)}`;
  const regelKey = cat ? cat.regel : null;
  const regel = regelKey ? RULES[regelKey] : null;
  const pii = bevatPii(cat, rij);

  // ── 1. opdracht / klant / relatie ──
  let traject = null, gebruiker = null, relatieLabel = null;
  const tLinkCol = cat && cat.traject_link;
  if (tLinkCol && rij[tLinkCol] != null) {
    const key = String(rij[tLinkCol]).toUpperCase();
    traject = trajecten[rij[tLinkCol]] || trajecten[key] ||
      Object.values(trajecten).find(t => [t.id, t.koper_code, t.tussen_code].map(x => (x || '').toUpperCase()).includes(key)) || null;
  }
  if (categorieKey === 'mna_traject') traject = rij;
  const gLinkCol = cat && cat.relatie_link;
  if (gLinkCol && rij[gLinkCol] != null && gebruikers[rij[gLinkCol]]) gebruiker = gebruikers[rij[gLinkCol]];
  if (!gebruiker && traject && traject.gebruiker_id && gebruikers[traject.gebruiker_id]) gebruiker = gebruikers[traject.gebruiker_id];
  if (traject) relatieLabel = `traject ${traject.id}${traject.kantoor_naam ? ' (' + traject.kantoor_naam + ')' : ''}`;
  else if (gebruiker) relatieLabel = `adviseur ${gebruiker.email || gebruiker.id}`;
  else if (gLinkCol && rij[gLinkCol]) relatieLabel = `${gLinkCol}=${rij[gLinkCol]}`;
  else relatieLabel = null;

  // ── 2. overeenkomst + toepasselijke voorwaardenversie ──
  let overeenkomst = null, avSleutel = null, contractDatum = null, contractEinde = null, override = null;
  const otype = cat ? cat.overeenkomst : 'geen';

  if (otype === 'bemiddelingsovereenkomst' && traject) {
    overeenkomst = `bem:${traject.id}`;
    contractDatum = toDate(traject.bem_datum) || toDate(traject.created_at);
    contractEinde = toDate(traject.afgesloten_op);
    avSleutel = 'ALGEMENE_VOORWAARDEN_BF_MA';
    // ook de platform-GV bepaalt de documentbewaartermijn — die is de leidende voor MNA_DOCUMENT
    if (regelKey === 'MNA_DOCUMENT' || regelKey === 'MNA_TRAJECTMETADATA') avSleutel = 'GEBRUIKSVOORWAARDEN_VERKOPER_KOPER';
  } else if (otype === 'adviseur_platformovereenkomst' && (gebruiker || categorieKey === 'bf_gebruiker_account')) {
    const g = gebruiker || rij;
    overeenkomst = `adv:${g.id}`;
    contractDatum = toDate(g.gv_datum) || toDate(g.created_at);
    contractEinde = (g.status === 'inactief' || g.status === 'beeindigd') ? (toDate(g.last_login) || toDate(g.sessie_ts)) : null;
    avSleutel = 'GEBRUIKSVOORWAARDEN_ADVISEUR';
    if (g.gv_versie) notes.push(`bf_gebruikers.gv_versie=${g.gv_versie} (geaccepteerd ${iso(toDate(g.gv_datum)) || '?'})`);
  } else if (otype === 'verwerkersovereenkomst') {
    overeenkomst = `vok:${rij.id || rij.tussen_code}`;
    contractDatum = toDate(rij.datum);
    contractEinde = traject ? toDate(traject.afgesloten_op) : null;
    avSleutel = 'VERWERKERSOVEREENKOMST';
    if (rij.versie) notes.push(`mna_vok.versie=${rij.versie}`);
  } else if (otype === 'privacyverklaring') {
    overeenkomst = 'privacyverklaring';
    contractDatum = toDate(rij.created_at) || toDate(rij.datum);
    avSleutel = 'PRIVACYVERKLARING';
  }

  // handmatige override uit registry
  override = (REGISTRY.handmatige_overrides || []).find(x => x.overeenkomst_id === overeenkomst) || null;
  if (override) {
    notes.push('handmatige override uit contracts/registry.json toegepast');
    if (override.einddatum_override) { contractEinde = toDate(override.einddatum_override); notes.push('einddatum override: ' + override.einddatum_override + ' — ' + (override.einddatum_override_reden || '')); }
  }

  const avInfo = avSleutel ? avVersieOpDatum(avSleutel, contractDatum) : { versie: null, herkomst: 'n.v.t.', record: null, doc: null };
  let avVersie = avInfo.versie;
  if (override && override.av_versie_override) { avVersie = override.av_versie_override; notes.push('AV-versie override: ' + avVersie + ' — ' + (override.av_versie_override_reden || '')); }

  // ── 3. sub-categorie (M&A per informatiecategorie) ──
  let subcat = null;
  if (regelKey === 'MNA_DOCUMENT') {
    const dt = [rij.doc_type, rij.bestand_naam, rij.methode, 'fase' + (rij.fase_id || ''), tabel].filter(Boolean).join(' ').toLowerCase();
    subcat =
      /nda|geheimhoud/.test(dt) ? 'NDA' :
      /memorandum|(^|_)im($|_)|informatiememo/.test(dt) ? 'IM' :
      /teaser/.test(dt) ? 'teaser' :
      /bem|bemiddel/.test(dt) ? 'bemiddelingsovereenkomst' :
      /loi|intentie/.test(dt) ? 'LOI' :
      /spa|koopovereenkomst/.test(dt) ? 'SPA' :
      /bied|bod/.test(dt) ? 'bieding' :
      /closing/.test(dt) ? 'closing_document' :
      /bank|mutatie|financ|jaarrekening|balans/.test(dt) ? 'financieel' :
      /fiscaal|vpb|btw|belasting/.test(dt) ? 'fiscaal' :
      /personeel|hr|arbeids|loon/.test(dt) ? 'personeelsinformatie' :
      /jurid|contract|overeenkomst|akte|statuten/.test(dt) ? 'juridisch' :
      /gesprek|bijlage|correspond|mail|brief/.test(dt) ? 'correspondentie' :
      'due_diligence_document';
    notes.push('M&A-subcategorie: ' + subcat + ' (heuristiek op "' + dt.slice(0, 40) + '")');
  }

  // ── 4. legal hold? ──
  const holdCat = HOLDS.find(h => h.scope === 'categorie' && h.target === regelKey);
  const holdObj = HOLDS.find(h => h.scope === 'object' && h.target === objectId);
  const holdTraject = traject && HOLDS.find(h => h.scope === 'traject' && h.target === traject.id);
  const hold = holdObj || holdCat || holdTraject || (regel && regel.legal_hold ? { id: 'regel:' + regelKey, reden: regel.legal_hold_reden } : null);

  // ── 5. startdatum ──
  let start = null, startBron = null;
  const startCol = cat && cat.start_kolom;
  if (startCol === 'traject.afgesloten_op') {
    start = traject ? (toDate(traject.afgesloten_op) || null) : null;
    startBron = 'traject.afgesloten_op';
    if (!start && traject) {
      start = toDate(traject.vergrendeld_op) || toDate(traject.updated_at) || toDate(traject.created_at);
      startBron = 'traject nog niet afgesloten — fallback ' + (traject.vergrendeld_op ? 'vergrendeld_op' : traject.updated_at ? 'updated_at' : 'created_at') + ' (voorlopig; termijn loopt pas ná afsluiting)';
      notes.push('LET OP: traject ' + traject.id + ' heeft geen afgesloten_op — bewaartermijn is nog niet begonnen.');
    }
  } else if (startCol && /^FIXED:/.test(startCol)) {
    start = toDate(startCol.slice(6)); startBron = 'vaste datum ' + startCol.slice(6);
  } else if (startCol) {
    for (const c of startCol.split('|')) { if (rij[c] != null && rij[c] !== '') { start = toDate(rij[c]); startBron = c; break; } }
    if (!start && cat.fallback_start_kolom) for (const c of cat.fallback_start_kolom.split('|')) { if (rij[c] != null) { start = toDate(rij[c]); startBron = 'fallback ' + c; break; } }
  }

  // ── 6. termijnen berekenen ──
  // contractuele termijn (uit av-versions bewaarbepaling waar mogelijk, anders de genormaliseerde regel)
  let contractueleTermijn = regel ? regel.termijn : null;
  let contractueleEinde = null, contractueleBron = regelKey;
  // consistentiecheck av-versions <-> retention-rules (LEGAL_RETENTION_CONFLICT)
  let conflict = null;
  if (avInfo.record && avInfo.record.bewaarbepalingen && regelKey === 'MNA_DOCUMENT') {
    const b = avInfo.record.bewaarbepalingen.mna_documenten_na_afsluiting_dagen;
    if (b != null && !(contractueleTermijn && contractueleTermijn.eenheid === 'dagen' && contractueleTermijn.waarde === b)) {
      conflict = `av-versions ${avSleutel} v${avVersie} zegt ${b} dagen; retention-rules ${regelKey} zegt ${contractueleTermijn ? contractueleTermijn.waarde + ' ' + contractueleTermijn.eenheid : '—'}`;
    }
  }
  if (override && override.afwijkende_bewaarafspraak && override.afwijkende_bewaarafspraak.categorie === regelKey) {
    contractueleTermijn = override.afwijkende_bewaarafspraak.termijn;
    contractueleBron = 'afwijkende afspraak (registry): ' + (override.afwijkende_bewaarafspraak.reden || '');
  }
  if (start && contractueleTermijn) contractueleEinde = termijnEinde(start, contractueleTermijn);

  // wettelijke termijn(en)
  const wettelijk = [];
  const catList = [regelKey, subcat, pii ? '*_met_persoonsgegevens' : null].filter(Boolean);
  for (const [lk, lr] of Object.entries(LEGAL)) {
    const raakt = (lr.van_toepassing_op_categorieen || []).some(c => catList.includes(c) || (regelKey === 'WWFT_CLIENTACCEPTATIEDOSSIER' && lk === 'WWFT_CLIENTENONDERZOEK') || (regelKey === 'FINANCIELE_ADMINISTRATIE' && lk === 'FISCALE_BEWAARPLICHT'));
    if (!raakt) continue;
    let ws = start, wbron = startBron;
    if (lk === 'FISCALE_BEWAARPLICHT' && start) { const e = eindeBoekjaarPlus(start, lr.termijn_jaren); wettelijk.push({ key: lk, type: lr.type, einde: e, bron: `${lr.grondslag}; einde boekjaar + ${lr.termijn_jaren} jr` }); continue; }
    if (lr.termijn_jaren) wettelijk.push({ key: lk, type: lr.type, einde: ws ? addYears(ws, lr.termijn_jaren) : null, bron: lr.grondslag });
    else wettelijk.push({ key: lk, type: lr.type, einde: null, bron: lr.grondslag }); // AVG-dataminimalisatie e.d.
  }
  const wettMinimum = wettelijk.filter(w => w.type === 'minimum_bewaarplicht' && w.einde);
  const langsteWettMin = wettMinimum.sort((a, b) => (b.einde || 0) - (a.einde || 0))[0] || null;

  // 'bewaren toegestaan'-grondslagen
  const toegestaan = [];
  for (const [lk, lr] of Object.entries(LEGAL)) {
    if (lr.type !== 'bewaren_toegestaan_grondslag') continue;
    if (!(lr.van_toepassing_op_categorieen || []).some(c => catList.includes(c) || c === 'getekende_overeenkomst' && subcat)) continue;
    const s = contractEinde || start;
    const e = s ? (lr.termijn_jaren ? addYears(s, lr.termijn_jaren) : lr.termijn_maanden ? addMonths(s, lr.termijn_maanden) : null) : null;
    if (e) toegestaan.push({ key: lk, einde: e, bron: lr.grondslag });
  }
  const langsteToegestaan = toegestaan.sort((a, b) => (b.einde || 0) - (a.einde || 0))[0] || null;

  // ── 7. decision tree ──
  const onzeker = [];
  const versieInvariant = !!(regel && regel.versie_invariante_termijn);
  // maximum_verwijdertermijn / maximum_noodzakelijkheid = uitdrukkelijke verwijdertoezegging;
  // een 'bewaren toegestaan'-grondslag mag die niet oprekken (alleen een wettelijk minimum wel).
  const maxType = !!(regel && (regel.type === 'maximum_verwijdertermijn' || regel.type === 'maximum_noodzakelijkheid'));
  if (otype !== 'geen' && !overeenkomst) onzeker.push('geen overeenkomst gekoppeld');
  if (avSleutel && !avVersie) {
    const doc = AV[avSleutel];
    const eersteVersieDatum = doc && doc.versies && doc.versies[0] && doc.versies[0].ingangsdatum;
    const anomalie = avInfo.herkomst === 'geen_versie_voor_datum' && doc && doc.geen_versie_voor_datum_is_anomalie
      && !(override && override.av_versie_override);
    if (anomalie) {
      onzeker.push('voorwaardenversie onbekend: de contractdatum (' + (iso(contractDatum) || '?') + ') ligt vóór de eerste vastgelegde versie van ' + avSleutel + ' (' + (eersteVersieDatum || '?') + ') — die dienst bestond toen nog niet; de contractuele context is niet betrouwbaar te reconstrueren');
    } else if (!versieInvariant) {
      onzeker.push('voorwaardenversie onbekend');
    } else {
      notes.push('voorwaardenversie op de contractdatum niet vastgelegd — de bewaartermijn van deze regel is versie-invariant (' + regelKey + '), dus dit blokkeert de berekening niet.');
    }
  }
  if (!start && !(regel && regel.legal_hold)) onzeker.push('geen begindatum vast te stellen');
  if (traject && !traject.afgesloten_op && startCol === 'traject.afgesloten_op') onzeker.push('traject nog niet afgesloten — bewaartermijn nog niet begonnen');
  if (contractDatum && contractEinde && contractEinde < contractDatum) onzeker.push('tegenstrijdige contractdatums: einddatum (' + iso(contractEinde) + ') ligt vóór de contractdatum (' + iso(contractDatum) + ')');
  if (conflict) onzeker.push('LEGAL_RETENTION_CONFLICT: ' + conflict);

  let status, toegepasteEinde = null, reden;

  if (hold) {
    status = 'LEGAL_HOLD';
    reden = `Legal hold actief (${hold.id}): ${hold.reden}. Niet verwijderen ongeacht de berekende termijn.`;
  } else if (onzeker.length && !(langsteWettMin)) {
    status = 'REVIEW_REQUIRED';
    reden = 'Onvoldoende betrouwbare informatie om een bewaartermijn vast te stellen: ' + onzeker.join('; ') + '. NIET verwijderen.';
  } else if (langsteWettMin && langsteWettMin.einde > SIM) {
    status = 'RETENTION_REQUIRED';
    toegepasteEinde = langsteWettMin.einde;
    reden = `Wettelijke minimum-bewaarplicht (${langsteWettMin.key}) loopt tot ${iso(toegepasteEinde)}. Grondslag: ${langsteWettMin.bron}. Deze prevaleert boven een kortere contractuele/privacy-termijn.`;
  } else if (contractueleEinde && contractueleEinde > SIM) {
    status = 'RETENTION_REQUIRED';
    toegepasteEinde = contractueleEinde;
    reden = `Contractuele bewaartermijn (${contractueleBron}, ${contractueleTermijn.waarde} ${contractueleTermijn.eenheid} vanaf ${startBron} = ${iso(start)}) loopt tot ${iso(toegepasteEinde)}.` + (conflict ? ' LET OP conflict: ' + conflict : '');
  } else if (langsteToegestaan && langsteToegestaan.einde > SIM && !maxType) {
    status = 'RETENTION_ALLOWED';
    toegepasteEinde = langsteToegestaan.einde;
    reden = `Geen (lopende) wettelijke of contractuele bewaarPLICHT meer, maar er is een gerechtvaardigd belang om te bewaren tot ${iso(toegepasteEinde)} (${langsteToegestaan.key}: ${langsteToegestaan.bron}).`;
  } else {
    // termijn(en) verlopen of afwezig.
    // Bij een maximum_verwijdertermijn telt de 'bewaren toegestaan'-grondslag NIET mee als
    // laatste relevante datum — die is bewust genegeerd; de contractuele verwijdertermijn is leidend.
    const laatsteBekende = [contractueleEinde, langsteWettMin && langsteWettMin.einde, !maxType && langsteToegestaan && langsteToegestaan.einde].filter(Boolean).sort((a, b) => b - a)[0] || null;
    toegepasteEinde = laatsteBekende;
    if (pii) {
      status = laatsteBekende ? 'EXPIRED' : 'REVIEW_REQUIRED';
      if (status === 'EXPIRED') { status = 'DELETE_ELIGIBLE'; reden = `Alle bewaartermijnen verlopen (laatste einddatum ${iso(laatsteBekende)}); object bevat persoonsgegevens → AVG-dataminimalisatie (art. 5 lid 1 sub e AVG): verwijderen vereist/toegestaan.` + (maxType ? ` De voorwaarden bevatten bovendien een uitdrukkelijke verwijdertoezegging (${contractueleBron}, ${contractueleTermijn ? contractueleTermijn.waarde + ' ' + contractueleTermijn.eenheid : '—'}) die niet mag worden opgerekt door een bewaargrondslag.` : ''); }
      else reden = 'Object bevat persoonsgegevens maar er is geen begindatum/termijn vast te stellen → REVIEW_REQUIRED, niet verwijderen.';
    } else {
      status = laatsteBekende ? 'RETENTION_ALLOWED' : 'REVIEW_REQUIRED';
      reden = laatsteBekende
        ? `Bewaartermijnen verlopen (${iso(laatsteBekende)}); geen persoonsgegevens en geen wettelijke reden tot verwijderen — bewaren toegestaan, maar niet langer noodzakelijk.`
        : 'Geen persoonsgegevens en geen termijn vast te stellen → REVIEW_REQUIRED.';
    }
  }

  // markeer 'gemengd' object dat óók zakelijke info bevat
  const gemengd = cat && cat.persoonsgegevens === 'gemengd';
  if (gemengd && (status === 'DELETE_ELIGIBLE')) {
    notes.push('GEMENGD object: bevat zowel persoonsgegevens als zakelijke informatie. Beoordeel of alleen de persoonsgegeven-onderdelen moeten worden verwijderd/geanonimiseerd en de zakelijke kern (indien nog nodig) blijft.');
  }

  // ── audit record ──
  const rec = {
    object_id: objectId,
    document: rij.bestand_naam || rij.doc_type || rij.methode || tabel,
    categorie: regelKey || categorieKey,
    mna_subcategorie: subcat,
    klant_opdracht_relatie: relatieLabel,
    overeenkomst,
    voorwaardenversie: avVersie,
    voorwaardenversie_herkomst: avInfo.herkomst,
    relevante_clausule: regel ? (regel.bron || '') : (cat ? cat.regel : ''),
    wettelijke_regel: (langsteWettMin ? langsteWettMin.key : null) || wettelijk.map(w => w.key).join(',') || null,
    startdatum: iso(start),
    startdatum_bron: startBron,
    contractuele_einddatum: iso(contractueleEinde),
    wettelijke_einddatum: iso(langsteWettMin && langsteWettMin.einde),
    berekende_einddatum: iso(toegepasteEinde),
    bevat_persoonsgegevens: pii,
    status,
    beslissing: reden,
    legal_retention_conflict: conflict || null,
    notities: notes,
    simulatie_datum: iso(SIM),
    engine_versie: ENGINE_VERSIE,
    timestamp: new Date().toISOString(),
  };
  return rec;
}

/* ---------- run ---------- */
const tables = loadSource();
const objs = inventariseer(tables);
const records = objs.map(beoordeel);

/* dagen tot verval */
function dagenTot(d) { return d ? Math.round((toDate(d) - SIM) / DAG) : null; }

const summary = {
  TOTAL: records.length,
  RETENTION_REQUIRED: records.filter(r => r.status === 'RETENTION_REQUIRED').length,
  RETENTION_ALLOWED: records.filter(r => r.status === 'RETENTION_ALLOWED').length,
  EXPIRED: records.filter(r => r.status === 'EXPIRED').length,
  DELETE_ELIGIBLE: records.filter(r => r.status === 'DELETE_ELIGIBLE').length,
  REVIEW_REQUIRED: records.filter(r => r.status === 'REVIEW_REQUIRED').length,
  LEGAL_HOLD: records.filter(r => r.status === 'LEGAL_HOLD').length,
  UNKNOWN: records.filter(r => !['RETENTION_REQUIRED', 'RETENTION_ALLOWED', 'EXPIRED', 'DELETE_ELIGIBLE', 'REVIEW_REQUIRED', 'LEGAL_HOLD'].includes(r.status)).length,
};
const verval30 = records.filter(r => { const d = dagenTot(r.berekende_einddatum); return d != null && d >= 0 && d <= 30; });
const verval90 = records.filter(r => { const d = dagenTot(r.berekende_einddatum); return d != null && d >= 0 && d <= 90; });
const reedsVerlopen = records.filter(r => { const d = dagenTot(r.berekende_einddatum); return d != null && d < 0; });
const zonderTermijn = records.filter(r => !r.berekende_einddatum && r.status !== 'LEGAL_HOLD');
const avOnbekend = records.filter(r => r.voorwaardenversie == null && r.overeenkomst && r.overeenkomst !== 'privacyverklaring');
const contractOntbreekt = records.filter(r => !r.overeenkomst && r.categorie && CATS[r.categorie]?.overeenkomst && CATS[r.categorie].overeenkomst !== 'geen');
const conflicten = records.filter(r => r.legal_retention_conflict);
const legalHolds = records.filter(r => r.status === 'LEGAL_HOLD');
const piiVerlopen = records.filter(r => r.bevat_persoonsgegevens && ['DELETE_ELIGIBLE', 'EXPIRED'].includes(r.status));

/* ---------- output ---------- */
fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = iso(SIM);
const jsonPath = path.join(OUT_DIR, `retention-${stamp}.json`);
const payload = { gegenereerd_op: new Date().toISOString(), simulatie_datum: stamp, engine_versie: ENGINE_VERSIE, bron: DATA_DIR, modus: EXECUTE ? 'ENFORCE+EXECUTE' : ENFORCE ? 'ENFORCE (geen --execute)' : 'DRY RUN', summary, records };
fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(payload, null, 2));

if (!args['json-only']) {
  const rij = r => `| ${r.document || ''} | ${r.categorie || ''}${r.mna_subcategorie ? ' / ' + r.mna_subcategorie : ''} | ${r.overeenkomst || '—'} | ${r.voorwaardenversie || '—'} | ${r.startdatum || '—'} | ${r.berekende_einddatum || '—'} | ${r.status} | ${(r.beslissing || '').replace(/\|/g, '/').slice(0, 180)} |`;
  const md = [
    `# Retention-audit — ${stamp}`,
    ``,
    `Engine ${ENGINE_VERSIE} · bron \`${path.relative(ROOT, DATA_DIR)}\` · modus **${payload.modus}** · gegenereerd ${payload.gegenereerd_op}`,
    ``,
    `## Samenvatting`,
    ``,
    '```',
    ...Object.entries(summary).map(([k, v]) => `${k.padEnd(20)} ${v}`),
    '```',
    ``,
    `- **Verloopt binnen 30 dagen:** ${verval30.length}`,
    `- **Verloopt binnen 90 dagen:** ${verval90.length}`,
    `- **Reeds verlopen:** ${reedsVerlopen.length}`,
    `- **Zonder vastgestelde bewaartermijn:** ${zonderTermijn.length}`,
    `- **Voorwaardenversie onbekend:** ${avOnbekend.length}`,
    `- **Contractinformatie ontbreekt:** ${contractOntbreekt.length}`,
    `- **LEGAL_RETENTION_CONFLICT:** ${conflicten.length}`,
    `- **Legal holds:** ${legalHolds.length}`,
    `- **Persoonsgegevens met (mogelijk) verlopen termijn:** ${piiVerlopen.length}`,
    ``,
    `## Alle objecten`,
    ``,
    `| Document | Categorie | Contract | AV-versie | Startdatum | Einddatum | Status | Reden |`,
    `|---|---|---|---|---|---|---|---|`,
    ...records.map(rij),
    ``,
    ...(conflicten.length ? [`## LEGAL_RETENTION_CONFLICT`, ``, ...conflicten.map(r => `- **${r.object_id}** — ${r.legal_retention_conflict}`), ``] : []),
    ...(reedsVerlopen.length ? [`## Reeds verlopen`, ``, ...reedsVerlopen.map(r => `- **${r.object_id}** (${r.status}) — einddatum ${r.berekende_einddatum} — ${r.beslissing}`), ``] : []),
    ...(zonderTermijn.length ? [`## Zonder vastgestelde bewaartermijn (REVIEW_REQUIRED verwacht)`, ``, ...zonderTermijn.slice(0, 100).map(r => `- **${r.object_id}** — ${r.beslissing}`), ``] : []),
    `## Reproduceerbaarheid`,
    ``,
    `Iedere regel in \`retention-${stamp}.json\` bevat de volledige keten (object_id, document, categorie, klant/opdracht, overeenkomst, voorwaardenversie + herkomst, clausule, wettelijke regel, start- en einddata, status, beslissing, engine-versie, timestamp). Draai met \`--simulate-date=YYYY-MM-DD\` om een historische beslissing te reconstrueren.`,
  ].join('\n');
  const mdPath = path.join(OUT_DIR, `retention-${stamp}.md`);
  fs.writeFileSync(mdPath, md + '\n');
  fs.writeFileSync(path.join(OUT_DIR, 'latest.md'), md + '\n');
}

/* ---------- ENFORCE ---------- */
if (ENFORCE) {
  const doelwit = records.filter(r => r.status === 'DELETE_ELIGIBLE' && !r.notities.some(n => /GEMENGD/.test(n)));
  const planPath = path.join(OUT_DIR, `enforce-plan-${stamp}.jsonl`);
  fs.writeFileSync(planPath, doelwit.map(r => JSON.stringify({ object_id: r.object_id, categorie: r.categorie, einddatum: r.berekende_einddatum, actie: 'DELETE', reden: r.beslissing })).join('\n') + '\n');
  console.log(`\nENFORCE: ${doelwit.length} object(en) komen in aanmerking voor verwijdering (plan → ${path.relative(ROOT, planPath)}).`);
  if (!EXECUTE) {
    console.log('  --execute niet meegegeven → geen wijzigingen doorgevoerd (plan-only).');
  } else {
    console.log('  --execute: daadwerkelijke verwijdering is in deze engine-versie bewust NIET geïmplementeerd.');
    console.log('  Reden: verwijderen van echte cliëntdata/R2-objecten hoort via de bestaande, geteste');
    console.log('  worker-endpoints (/admin/delete/mna/, /avg/verwijder, /avg/cleanup) te lopen — met hun');
    console.log('  eigen cascade- en auditgaranties. Gebruik het enforce-plan als invoer daarvoor.');
    console.log('  GEMENGDE objecten en alles buiten DELETE_ELIGIBLE zijn overgeslagen.');
  }
}

console.log(`\n✓ Retention-audit klaar — simulatie ${stamp}`);
for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`\n  JSON  : ${path.relative(ROOT, jsonPath)}`);
if (!args['json-only']) console.log(`  MD    : ${path.relative(ROOT, path.join(OUT_DIR, 'latest.md'))}`);
if (summary.REVIEW_REQUIRED || conflicten.length) console.log(`\n  ${summary.REVIEW_REQUIRED} REVIEW_REQUIRED, ${conflicten.length} conflict(en) — handmatige beoordeling nodig, niets verwijderd.`);
