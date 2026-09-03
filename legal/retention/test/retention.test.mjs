#!/usr/bin/env node
/**
 * TESTSUITE voor de retention-engine. 16 scenario's uit de opdracht, elk met een verwachte uitkomst.
 * Draait de echte engine (retention-engine.mjs) tegen een tijdelijke databron per scenario.
 *
 *   node legal/retention/test/retention.test.mjs
 *
 * Exitcode 0 = alles geslaagd, 1 = één of meer gefaald.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HIER, '..', 'retention-engine.mjs');

const dag = 86400000;
const nu = Date.parse('2026-09-03T12:00:00Z');
const jaarGeleden = (j) => nu - j * 365 * dag;
const maandGeleden = (m) => nu - m * 30 * dag;
const dagenGeleden = (d) => nu - d * dag;
// Het M&A-platform (GEBRUIKSVOORWAARDEN_VERKOPER_KOPER v1.0) bestaat vanaf 2026-08-16.
// Een traject met een bem_datum daarvóór is een data-anomalie (engine → REVIEW_REQUIRED),
// dus platform-trajecten in de fixtures gebruiken realistische datums ná de lancering.
const LANCERING = Date.parse('2026-08-16T09:00:00Z');
const naLancering = (d) => LANCERING + d * dag;

/* Elke case: tables (map tabelnaam→rijen), sim (simulatiedatum), verwacht (objectId→status of {status, redenBevat}) */
const CASES = [
  {
    naam: '01 · contract MET expliciete bewaartermijn — termijn verlopen, verwijdertoezegging prevaleert',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T01', kantoor_naam: 'Alpha BV', created_at: naLancering(0), bem_datum: naLancering(0), afgesloten_op: naLancering(1), gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: naLancering(0), created_at: naLancering(0) }],
      mna_documenten: [{ id: 'D01', traject_id: 'T01', fase_id: '3', bestand_naam: 'jaarrekening.pdf', uploaded_at: naLancering(0), r2_key: 'k/D01' }],
    },
    verwacht: { 'mna_documenten:D01': 'DELETE_ELIGIBLE' },
    let_op: '14-dgn-termijn liep af op 2026-08-31 (< sim); MNA_DOCUMENT is een maximum_verwijdertermijn → een claimverweer-grondslag mag die niet oprekken; gemengd doc telt als PII → DELETE_ELIGIBLE',
  },
  {
    naam: '02 · contract ZONDER expliciete bewaartermijn — default 14 dgn, traject net afgesloten',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T02', kantoor_naam: 'Beta BV', created_at: naLancering(0), bem_datum: naLancering(0), afgesloten_op: dagenGeleden(3), gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: naLancering(0), created_at: naLancering(0) }],
      mna_documenten: [{ id: 'D02', traject_id: 'T02', fase_id: '2', bestand_naam: 'contract-klant.pdf', uploaded_at: naLancering(2), r2_key: 'k/D02' }],
    },
    verwacht: { 'mna_documenten:D02': 'RETENTION_REQUIRED' },
    let_op: 'afgesloten 3 dgn geleden → 14-dgn-termijn loopt nog',
  },
  {
    naam: '03 · OUDE AV-versie (v2.0, gold 17–25 aug 2026) — engine mag niet de huidige v2.3 pakken',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T03', kantoor_naam: 'Gamma BV', created_at: Date.parse('2026-08-18T10:00:00Z'), bem_datum: Date.parse('2026-08-20T10:00:00Z'), afgesloten_op: dagenGeleden(2), gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '1.9', gv_datum: Date.parse('2026-08-18T10:00:00Z'), created_at: jaarGeleden(1) }],
      mna_documenten: [{ id: 'D03', traject_id: 'T03', fase_id: '1', bestand_naam: 'nda.pdf', uploaded_at: Date.parse('2026-08-21T10:00:00Z') }],
    },
    verwacht: { 'mna_documenten:D03': { status: 'RETENTION_REQUIRED', avVersie: '2.0' } },
    let_op: 'bem_datum 20 aug → GEBRUIKSVOORWAARDEN_VERKOPER_KOPER v2.0',
  },
  {
    naam: '04 · NIEUWE AV-versie (v2.3, vanaf 3 sep 2026)',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T04', kantoor_naam: 'Delta BV', created_at: Date.parse('2026-09-03T09:00:00Z'), bem_datum: Date.parse('2026-09-03T09:00:00Z'), afgesloten_op: null, gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: Date.parse('2026-09-03T09:00:00Z'), created_at: jaarGeleden(1) }],
      mna_documenten: [{ id: 'D04', traject_id: 'T04', fase_id: '1', bestand_naam: 'teaser.pdf', uploaded_at: Date.parse('2026-09-03T10:00:00Z') }],
    },
    verwacht: { 'mna_documenten:D04': { status: 'REVIEW_REQUIRED', avVersie: '2.3', redenBevat: 'nog niet afgesloten' } },
    let_op: 'v2.3 herkend; traject niet afgesloten → termijn nog niet begonnen → REVIEW_REQUIRED',
  },
  {
    naam: '05 · GEWIJZIGDE overeenkomst — registry-override AV-versie + einddatum',
    sim: '2026-09-03',
    override: {
      overeenkomst_id: 'bem:T05', type: 'bemiddelingsovereenkomst', partij: 'Epsilon BV',
      av_versie_override: '2.3', av_versie_override_reden: 'Addendum 2026-09-01: AV v2.3 van toepassing.',
      einddatum_override: '2026-06-01', einddatum_override_reden: 'Beëindigd per e-mail 2026-06-01.',
    },
    tables: {
      mna_trajecten: [{ id: 'T05', kantoor_naam: 'Epsilon BV', created_at: jaarGeleden(2), bem_datum: jaarGeleden(2), afgesloten_op: null, gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: jaarGeleden(2), created_at: jaarGeleden(3) }],
      mna_documenten: [{ id: 'D05', traject_id: 'T05', fase_id: '4', bestand_naam: 'juridisch-memo.pdf', uploaded_at: jaarGeleden(1) }],
    },
    verwacht: { 'mna_documenten:D05': { avVersie: '2.3' } },
    let_op: 'override toegepast: einddatum 2026-06-01, AV v2.3 — status hangt af van MNA_DOCUMENT-berekening op die einddatum',
  },
  {
    naam: '06 · BEËINDIGD contract, termijn ruim verlopen — persoonsgegevens',
    sim: '2026-09-03',
    tables: {
      scan_rapporten: [{ id: 'S06', scan_id: 'X', email: 'klant@bedrijf.nl', kantoor_naam: 'Zeta', created_at: jaarGeleden(2), rapport_tekst: '...' }],
    },
    verwacht: { 'scan_rapporten:S06': { status: 'DELETE_ELIGIBLE', redenBevat: 'AVG' } },
    let_op: 'scan 2 jr oud, 12-mnd-termijn verlopen, PII → DELETE_ELIGIBLE',
  },
  {
    naam: '07 · ACTIEVE overeenkomst — traject niet afgesloten',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T07', kantoor_naam: 'Eta BV', created_at: maandGeleden(2), bem_datum: maandGeleden(2), afgesloten_op: null, gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: maandGeleden(2), created_at: jaarGeleden(1) }],
      mna_documenten: [{ id: 'D07', traject_id: 'T07', fase_id: '2', bestand_naam: 'dd-stuk.pdf', uploaded_at: maandGeleden(1) }],
    },
    verwacht: { 'mna_documenten:D07': 'REVIEW_REQUIRED' },
    let_op: 'geen afgesloten_op → bewaartermijn niet begonnen',
  },
  {
    naam: '08 · WETTELIJKE bewaarplicht LANGER dan contractuele — fee_event (fiscaal 7 jr)',
    sim: '2026-09-03',
    tables: {
      platform_fee_events: [{ id: 'F08', traject_id: 'T08', gebruiker_id: 'G1', fee_type: 'basis', bedrag: 500, created_at: jaarGeleden(2) }],
      mna_trajecten: [{ id: 'T08', kantoor_naam: 'Theta', created_at: jaarGeleden(3), bem_datum: jaarGeleden(3), afgesloten_op: jaarGeleden(2), gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: jaarGeleden(3), created_at: jaarGeleden(4) }],
    },
    verwacht: { 'platform_fee_events:F08': { status: 'RETENTION_REQUIRED', redenBevat: 'iscale' } },
    let_op: 'fee-event 2 jr oud → fiscale bewaarplicht 7 jr (einde boekjaar +7) loopt nog',
  },
  {
    naam: '09 · CONTRACTUELE termijn langer dan wettelijke — recente scan, geen wettelijke plicht',
    sim: '2026-09-03',
    tables: {
      scan_rapporten: [{ id: 'S09', scan_id: 'Y', email: 'a@b.nl', kantoor_naam: 'Iota', created_at: maandGeleden(3), rapport_tekst: '...' }],
    },
    verwacht: { 'scan_rapporten:S09': { status: 'RETENTION_REQUIRED', redenBevat: 'ontractuele' } },
    let_op: 'scan 3 mnd oud, 12-mnd-termijn loopt nog; geen wettelijke plicht → contractuele regel prevaleert',
  },
  {
    naam: '10 · ONTBREKENDE AV-versie — contractdatum vóór elke bekende versie',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T10', kantoor_naam: 'Kappa BV', created_at: Date.parse('2025-01-01T10:00:00Z'), bem_datum: Date.parse('2025-01-01T10:00:00Z'), afgesloten_op: maandGeleden(1), gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: null, gv_datum: null, created_at: Date.parse('2025-01-01T10:00:00Z') }],
      mna_documenten: [{ id: 'D10', traject_id: 'T10', fase_id: '1', bestand_naam: 'oud-stuk.pdf', uploaded_at: Date.parse('2025-02-01T10:00:00Z') }],
    },
    verwacht: { 'mna_documenten:D10': { status: 'REVIEW_REQUIRED', redenBevat: 'voorwaardenversie onbekend' } },
    let_op: 'geen GEBRUIKSVOORWAARDEN_VERKOPER_KOPER-versie vóór 2026-08-16 → onbekend → REVIEW_REQUIRED',
  },
  {
    naam: '11 · ONTBREKENDE beëindigingsdatum — doc-versie op niet-afgesloten traject',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T11', kantoor_naam: 'Lambda BV', created_at: naLancering(0), bem_datum: naLancering(0), afgesloten_op: null, gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: naLancering(0), created_at: naLancering(0) }],
      mna_doc_versies: [{ id: 'V11', traject_id: 'T11', doc_type: 'loi', versie: 1, tekst: '...', created_at: naLancering(3) }],
    },
    verwacht: { 'mna_doc_versies:V11': 'REVIEW_REQUIRED' },
    let_op: 'geen afgesloten_op → geen begindatum voor de termijn',
  },
  {
    naam: '12 · TEGENSTRIJDIGE bepalingen — einddatum vóór contractdatum',
    sim: '2026-09-03',
    override: { overeenkomst_id: 'bem:T12', type: 'bemiddelingsovereenkomst', partij: 'Mu BV', einddatum_override: '2024-01-01', einddatum_override_reden: 'foutieve invoer test' },
    tables: {
      mna_trajecten: [{ id: 'T12', kantoor_naam: 'Mu BV', created_at: Date.parse('2026-08-20T10:00:00Z'), bem_datum: Date.parse('2026-08-20T10:00:00Z'), afgesloten_op: null, gebruiker_id: 'G1' }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '2.0', gv_datum: Date.parse('2026-08-20T10:00:00Z'), created_at: jaarGeleden(1) }],
      mna_documenten: [{ id: 'D12', traject_id: 'T12', fase_id: '1', bestand_naam: 'stuk.pdf', uploaded_at: Date.parse('2026-08-21T10:00:00Z') }],
    },
    verwacht: { 'mna_documenten:D12': { status: 'REVIEW_REQUIRED', redenBevat: 'tegenstrijdig' } },
    let_op: 'override-einddatum 2024 ligt vóór bem_datum 2026-08-20 → tegenstrijdig → REVIEW_REQUIRED',
  },
  {
    naam: '13 · LEGAL HOLD — mna_audit-regel (P4-besluit)',
    sim: '2026-09-03',
    tables: {
      mna_audit: [{ id: 999, code: 'T13', rol: 'begeleider', actie: 'login', ip: '1.2.3.4', ts: jaarGeleden(3) }],
    },
    verwacht: { 'mna_audit:999': { status: 'LEGAL_HOLD', redenBevat: 'hold' } },
    let_op: 'AUDIT_TRAIL heeft legal_hold=true (P4-besluit) → LEGAL_HOLD ongeacht leeftijd',
  },
  {
    naam: '14 · M&A-TRANSACTIEDOSSIER — verschillende subcategorieën, verschillende regels binnen één dossier',
    sim: '2026-09-03',
    tables: {
      mna_trajecten: [{ id: 'T14', kantoor_naam: 'Nu BV', created_at: naLancering(0), bem_datum: naLancering(0), afgesloten_op: naLancering(1), gebruiker_id: 'G1', clientacceptatie_getoetst: 1, clientacceptatie_door: 'Marcel', clientacceptatie_datum: naLancering(0) }],
      bf_gebruikers: [{ id: 'G1', email: 'adv@x.nl', gv_versie: '1.9', gv_datum: naLancering(0), created_at: naLancering(0) }],
      mna_documenten: [
        { id: 'D14a', traject_id: 'T14', fase_id: '1', bestand_naam: 'NDA getekend.pdf', uploaded_at: naLancering(0) },
        { id: 'D14b', traject_id: 'T14', fase_id: '3', bestand_naam: 'jaarrekening 2023 financieel.pdf', uploaded_at: naLancering(0) },
      ],
    },
    verwacht: {
      'mna_documenten:D14a': { status: 'DELETE_ELIGIBLE', sub: 'NDA' },
      'mna_documenten:D14b': { status: 'DELETE_ELIGIBLE', sub: 'financieel' },
      // clientacceptatie: Wwft 5 jr na afsluiting (5,5 jr geleden) → verlopen → DELETE_ELIGIBLE
    },
    let_op: 'documenten 14 dgn (verlopen); subcategorieën NDA/financieel apart geclassificeerd; cliëntacceptatie via Wwft 5 jr',
  },
  {
    naam: '15 · DOCUMENT met persoonsgegevens — termijn verlopen → verwijderen vereist',
    sim: '2026-09-03',
    tables: {
      contact_berichten: [{ id: 'C15', naam: 'Jan Jansen', email: 'jan@x.nl', organisatie: 'X', onderwerp: 'vraag', bericht: '...', ip: '5.6.7.8', created_at: maandGeleden(10) }],
    },
    verwacht: { 'contact_berichten:C15': { status: 'DELETE_ELIGIBLE', redenBevat: 'AVG' } },
    let_op: 'contactbericht 10 mnd oud, 6-mnd-termijn verlopen, PII → DELETE_ELIGIBLE',
  },
  {
    naam: '16 · ONVOLDOENDE informatie — document met traject_id dat niet bestaat',
    sim: '2026-09-03',
    tables: {
      mna_documenten: [{ id: 'D16', traject_id: 'BESTAAT-NIET', fase_id: '2', bestand_naam: 'wees-doc.pdf', uploaded_at: maandGeleden(2), r2_key: 'k/D16' }],
    },
    verwacht: { 'mna_documenten:D16': 'REVIEW_REQUIRED' },
    let_op: 'traject niet vindbaar → geen contract/AV/begindatum → REVIEW_REQUIRED',
  },
];

/* ---------- runner ---------- */
let ok = 0, fout = 0;
const fouten = [];
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'retention-test-'));

for (const c of CASES) {
  const dataDir = path.join(tmpRoot, c.naam.slice(0, 4).replace(/\W/g, ''));
  const outDir = path.join(dataDir, '_out');
  fs.mkdirSync(dataDir, { recursive: true });
  for (const [t, rows] of Object.entries(c.tables)) fs.writeFileSync(path.join(dataDir, t + '.json'), JSON.stringify(rows, null, 1));

  // optionele registry-override: schrijf een tijdelijke registry en wijs de engine ernaar via env? -> engine leest vaste paden.
  // Oplossing: kopieer de policies/legal-holds naar de tmp en pas registry aan; engine leest relatief t.o.v. zijn eigen locatie.
  // Simpeler: engine ondersteunt --data-dir; voor de override gebruiken we een env-var die de engine leest.
  const env = { ...process.env };
  if (c.override) env.RETENTION_TEST_OVERRIDE = JSON.stringify(c.override);

  let payload;
  try {
    execFileSync('node', [ENGINE, `--data-dir=${dataDir}`, `--out=${outDir}`, `--simulate-date=${c.sim}`, '--json-only'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
    payload = JSON.parse(fs.readFileSync(path.join(outDir, 'latest.json'), 'utf8'));
  } catch (e) {
    fout++; fouten.push(`${c.naam}\n    engine-fout: ${String(e.message).split('\n').slice(0, 3).join(' | ')}`);
    console.log(`  ✗ ${c.naam}`);
    continue;
  }

  const byId = Object.fromEntries(payload.records.map(r => [r.object_id, r]));
  let caseOk = true;
  const details = [];
  for (const [oid, exp] of Object.entries(c.verwacht)) {
    const r = byId[oid];
    if (!r) { caseOk = false; details.push(`geen record voor ${oid} (records: ${payload.records.map(x => x.object_id).join(', ')})`); continue; }
    const want = typeof exp === 'string' ? { status: exp } : exp;
    if (want.status && r.status !== want.status) { caseOk = false; details.push(`${oid}: status ${r.status} ≠ verwacht ${want.status}`); }
    if (want.avVersie && r.voorwaardenversie !== want.avVersie) { caseOk = false; details.push(`${oid}: AV-versie ${r.voorwaardenversie} ≠ verwacht ${want.avVersie}`); }
    if (want.sub && r.mna_subcategorie !== want.sub) { caseOk = false; details.push(`${oid}: subcategorie ${r.mna_subcategorie} ≠ verwacht ${want.sub}`); }
    if (want.redenBevat && !(r.beslissing || '').toLowerCase().includes(want.redenBevat.toLowerCase()) && !(r.notities || []).join(' ').toLowerCase().includes(want.redenBevat.toLowerCase())) {
      caseOk = false; details.push(`${oid}: reden bevat "${want.redenBevat}" niet — reden was: ${(r.beslissing || '').slice(0, 120)}`);
    }
  }
  if (caseOk) { ok++; console.log(`  ✓ ${c.naam}`); }
  else { fout++; fouten.push(`${c.naam}\n    ${details.join('\n    ')}`); console.log(`  ✗ ${c.naam}`); }
}

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(`\n${'─'.repeat(60)}\n${ok} geslaagd · ${fout} gefaald · ${CASES.length} totaal`);
if (fouten.length) { console.log(`\nGEFAALD:\n`); for (const f of fouten) console.log('• ' + f + '\n'); }
process.exit(fout ? 1 : 0);
