// ══════════════════════════════════════════════════════════════════
// Permanente regressietest voor de /adv-rolherkenningsbug van 21 sep 2026:
// GET /mna/gesprekken/{code} bepaalde de beller-rol uitsluitend uit het
// URL-PAD-segment. adv.html (adviseursportaal) roept dit endpoint aan met
// het traject-/verkoper-ID in het pad en de eigen tussen_code in ?code= —
// waardoor de adviseur altijd als 'verkoper' werd herkend en gesprekken met
// zichtbaar_voor:'begeleider' misten. Fix: worker/12-mna-gesprekken-logboek.js
// controleert nu ook ?code= tegen tussen_code.
//
// Dit script bewijst zowel de fix (adviseur ziet het begeleider-only-gesprek
// terug) als de afwezigheid van regressie (het bestaande verkoper/koper-pad
// via ?rol=, zoals mna/05-documentflow-partijen.js gebruikt, blijft correct
// gefilterd).
//
// Draaien: WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//          node tests/e2e-adv-gesprekken-rol.mjs --key=STAGING_ADMIN_KEY
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting } from './lib.mjs';

const ADMIN = leesAdminKey();

console.log('\n' + kleur('vet', '╔══════════════════════════════════════════════╗'));
console.log(kleur('vet', '║  /adv gesprekken-rolbug — regressietest        ║'));
console.log(kleur('vet', '╚══════════════════════════════════════════════╝'));
console.log(kleur('grijs', 'Worker : ' + WORKER));

if (!ADMIN) {
  console.log('\n' + kleur('rood', 'Geen admin-key opgegeven.'));
  process.exit(1);
}

async function main() {
  kop('SETUP · traject aanmaken');
  const create = await api('POST', '/mna/create', { adminKey: ADMIN, body: {
    kantoor_naam: 'E2E ADV-Gesprekken-Rol BV', sector: 'accountancy', traject_type: 'Verkoop',
    contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl',
  } });
  check('traject aangemaakt', create.json && create.json.ok === true, JSON.stringify(create.json));
  const code = create.json && create.json.code;
  const koperCode = create.json && create.json.koper_code;
  const tussenCode = create.json && create.json.tussen_code;
  check('code + koper_code + tussen_code aanwezig', !!code && !!koperCode && !!tussenCode, JSON.stringify(create.json));

  try {
    kop('STAP 1 · begeleider legt een gesprek vast (zichtbaar_voor default = begeleider)');
    const gesprek = await api('POST', '/mna/gesprek/opslaan', { body: {
      code: tussenCode, datum: new Date().toISOString().slice(0, 10), deelnemers: 'Test-adviseur',
      type: 'overig', ruwe_notities: 'Interne notitie', verslag: 'ADV-ROLBUG-REGRESSIE-VERSLAG',
    } });
    check('gesprek aangemaakt', gesprek.json && gesprek.json.ok === true, JSON.stringify(gesprek.json));

    kop('STAP 2 · adviseur (adv.html-aanroep: pad=traject-ID, ?code=tussen_code) ziet het gesprek terug');
    const alsAdviseur = await api('GET', '/mna/gesprekken/' + code + '?code=' + encodeURIComponent(tussenCode));
    check('200 ok', alsAdviseur.status === 200, JSON.stringify(alsAdviseur.json));
    const gevondenAlsAdviseur = Array.isArray(alsAdviseur.json) && alsAdviseur.json.some(g => g.verslag === 'ADV-ROLBUG-REGRESSIE-VERSLAG');
    check('adviseur ziet het begeleider-only-gesprek (de bugfix)', gevondenAlsAdviseur, JSON.stringify(alsAdviseur.json));

    kop('STAP 3 · geen regressie: koper (eigen code in pad, ?rol=koper zoals mna.html) mist het begeleider-only-gesprek nog steeds');
    const alsKoper = await api('GET', '/mna/gesprekken/' + koperCode + '?rol=koper');
    check('200 ok', alsKoper.status === 200, JSON.stringify(alsKoper.json));
    const gevondenAlsKoper = Array.isArray(alsKoper.json) && alsKoper.json.some(g => g.verslag === 'ADV-ROLBUG-REGRESSIE-VERSLAG');
    check('koper ziet het begeleider-only-gesprek NIET (bestaand gedrag, geen regressie)', !gevondenAlsKoper, JSON.stringify(alsKoper.json));

    kop('STAP 4 · geen regressie: verkoper (eigen code in pad, geen ?code=) mist het begeleider-only-gesprek nog steeds');
    const alsVerkoper = await api('GET', '/mna/gesprekken/' + code);
    check('200 ok', alsVerkoper.status === 200, JSON.stringify(alsVerkoper.json));
    const gevondenAlsVerkoper = Array.isArray(alsVerkoper.json) && alsVerkoper.json.some(g => g.verslag === 'ADV-ROLBUG-REGRESSIE-VERSLAG');
    check('verkoper ziet het begeleider-only-gesprek NIET (bestaand gedrag, geen regressie)', !gevondenAlsVerkoper, JSON.stringify(alsVerkoper.json));

    kop('STAP 5 · geen regressie: een willekeurige, niet-matchende ?code= promoot niet ten onrechte tot tussenpersoon');
    const alsVerkeerdeCode = await api('GET', '/mna/gesprekken/' + code + '?code=NIETBESTAAND1');
    const gevondenAlsVerkeerdeCode = Array.isArray(alsVerkeerdeCode.json) && alsVerkeerdeCode.json.some(g => g.verslag === 'ADV-ROLBUG-REGRESSIE-VERSLAG');
    check('niet-matchende ?code= geeft geen toegang tot het begeleider-only-gesprek', !gevondenAlsVerkeerdeCode, JSON.stringify(alsVerkeerdeCode.json));
  } finally {
    kop('OPRUIMEN');
    const del = await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
    check('traject verwijderd', del.json && del.json.ok === true, JSON.stringify(del.json));
  }

  const ok = samenvatting();
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(kleur('rood', 'Onverwachte fout: ' + e.message)); process.exit(1); });
