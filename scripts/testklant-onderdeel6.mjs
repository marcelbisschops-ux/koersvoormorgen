// ── Lichte testklant voor onderdeel 6 (onderhandel-playbook) ──────────────────
// Zet TWEE gekoppelde trajecten klaar van dezelfde fictieve verkoper, elk met alleen de
// financiële kerncijfers ingevuld — genoeg om ZOPA-trade-space, BATNA & walk-away, de
// LoI-checklist en de bod-vergelijker doorheen te klikken.
//
// LET OP: dit schrijft DD-velden rechtstreeks via /mna/save. Dat is een bewuste uitzondering
// op de Testdocumenten-standaard (die zegt: altijd via de upload-AI-pijplijn) — Marcel koos
// hier expliciet de lichte variant. Voor een échte extractietest hoort het pakket via de
// documenten-upload te lopen.
//
// Gebruik:
//   ADMIN_KEY=xxxxx node scripts/testklant-onderdeel6.mjs           # met financiële cijfers voorgevuld
//   ADMIN_KEY=xxxxx node scripts/testklant-onderdeel6.mjs --leeg    # lege gekoppelde trajecten; tester vult zelf alles in
//
// --leeg: maakt alleen de twee gekoppelde traject-schillen (verkopernaam, kopernaam, codes). GEEN
//   DD-velden, GEEN documenten. Bedoeld voor een tester die zelf als verkoper inlogt, zelf de
//   informatiefases invult en zelf documenten uploadt — precies de "externe tester"-uitzondering
//   uit de Testdocumenten-standaard. Onderdeel 6 (ZOPA/BATNA/LoI-checklist/bod-vergelijker) komt
//   dan pas in beeld nadat de tester zelf financiële cijfers heeft ingevuld en per traject een
//   Dealvoorstel heeft gegenereerd.
//
// Vereist: de onderdeel-4-backend moet live staan (koppel_aan_traject). Version 84301b9d of nieuwer.

const WORKER = process.env.WORKER_URL || 'https://kantoorinzicht.marcel-bisschops.workers.dev';
const KEY = process.env.ADMIN_KEY;
const LEEG = process.argv.includes('--leeg');
if (!KEY) {
  console.error('Zet ADMIN_KEY in de omgeving:\n  ADMIN_KEY=xxxxx node scripts/testklant-onderdeel6.mjs [--leeg]');
  process.exit(1);
}

const SELLER = 'Van der Meer Interieurbouw B.V. \u{1F9EA} TEST onderdeel 6';

async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(WORKER + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${txt.slice(0, 240)}`);
  return j;
}

// Intern consistente cijfers: omzet groeit, EBITDA ~ opgegeven marge, balans sluit ongeveer.
function financieel(omzet3, ebitdaMargePct) {
  const ebitda = Math.round((omzet3 * ebitdaMargePct) / 100);
  const v = (n) => ({ value: String(Math.round(n)) });
  return {
    omzet1: v(omzet3 * 0.82), omzet2: v(omzet3 * 0.91), omzet3: v(omzet3), omzetYTD: v(omzet3 * 0.55),
    ebitda: v(ebitda), ebitdaMarge: { value: String(ebitdaMargePct) }, ebitdaNorm: v(ebitda),
    brutomarge: { value: '42' }, dgaSalaris: v(110000), voorraad: v(omzet3 * 0.11), forecast: v(omzet3 * 1.08),
    debiteuren: v(omzet3 * 0.09), crediteuren: v(omzet3 * 0.06), eigVermoeden: v(omzet3 * 0.28),
    resultaat: v(ebitda * 0.55), balansTotaal: v(omzet3 * 0.60), liquideMiddelen: v(omzet3 * 0.05),
    kortlopendeSchulden: v(omzet3 * 0.12), langlopendeSchulden: v(omzet3 * 0.15),
    rentelasten: v(omzet3 * 0.01), aflossingVerplicht: v(omzet3 * 0.03),
    kostenPersoneel: { value: '34' }, kostenHuisvesting: { value: '6' },
    kostenInkoop: { value: '46' }, kostenOverig: { value: '9' },
  };
}

async function maakTraject({ koperNaam, koppelAan }) {
  const body = {
    kantoor_naam: SELLER, kantoor_rechtsvorm: 'bv', structuur_type: 'bv',
    sector: 'mkb', traject_type: 'Verkoop', opdrachtgever_rol: 'verkoper',
    contact_naam: 'J. van der Meer', begeleider_naam: 'Marcel Bisschops', begeleider_email: '',
    koper_naam: koperNaam, koper_rechtsvorm: 'bv',
    notitie: 'Automatisch aangemaakt door scripts/testklant-onderdeel6.mjs',
  };
  if (koppelAan) body.koppel_aan_traject = koppelAan;
  const res = await api('/mna/create', { method: 'POST', body });
  return res; // { ok, code, koper_code, tussen_code }
}

async function vulFinancieel(code, omzet3, margePct) {
  await api('/mna/save', {
    method: 'POST',
    body: { code, fase_id: 'financieel', data_json: financieel(omzet3, margePct), checklist_json: {}, notitie: '' },
  });
}

(async () => {
  console.log('Testklant onderdeel 6 — ' + (LEEG ? 'LEEG (tester vult zelf alles in)' : 'financiële cijfers voorgevuld') + '\n');

  // Traject A — koper "Bouwgroep Nedland"
  const A = await maakTraject({ koperNaam: 'Bouwgroep Nedland B.V.' });
  if (!LEEG) await vulFinancieel(A.code, 2_400_000, 12);
  console.log('Traject A aangemaakt' + (LEEG ? '.' : ' + financieel gevuld.'));

  // Traject B — koper "Meubel Invest Zuid", GEKOPPELD aan A (zelfde verkoper, groep)
  const B = await maakTraject({ koperNaam: 'Meubel Invest Zuid B.V.', koppelAan: A.code });
  if (!LEEG) await vulFinancieel(B.code, 2_400_000, 12); // zelfde onderneming -> zelfde cijfers
  console.log('Traject B aangemaakt' + (LEEG ? '' : ' + financieel gevuld') + ' + gekoppeld aan A.\n');

  const sameKey = A.tussen_code === B.tussen_code;
  console.log('────────────────────────────────────────────────');
  console.log('Verkoper:', SELLER);
  console.log('');
  console.log('Traject A  (koper: Bouwgroep Nedland B.V.)');
  console.log('  verkopercode : ' + A.code);
  console.log('  kopercode    : ' + A.koper_code);
  console.log('  begeleidercode (tussen_code): ' + A.tussen_code);
  console.log('');
  console.log('Traject B  (koper: Meubel Invest Zuid B.V.)');
  console.log('  verkopercode : ' + B.code);
  console.log('  kopercode    : ' + B.koper_code);
  console.log('  begeleidercode (tussen_code): ' + B.tussen_code + (sameKey ? '   ✓ zelfde als A (groep)' : '   ✗ WIJKT AF — koppeling mislukt?'));
  console.log('────────────────────────────────────────────────\n');

  console.log('VOLGENDE STAPPEN (in mna.html):');
  if (LEEG) {
    console.log('0. Log in als VERKOPER met ' + A.code + ' (en apart met ' + B.code + ' voor traject B) en');
    console.log('   vul de informatiefases in / upload je eigen documenten — géén aangeleverde testdocs.');
    console.log('   Minimaal nodig voor onderdeel 6: fase "Financieel" (omzet 3 jaar, EBITDA, balans/schulden).');
  }
  console.log('1. Log in als begeleider met ' + A.tussen_code + ' (werkt voor traject A).');
  console.log('   Open het Dealvoorstel, vul onderaan "BATNA & walk-away" in (bijv. walk-awayprijs 1.100.000),');
  console.log('   genereer het Dealvoorstel en klik "Verstuur naar partijen".');
  console.log('   → hierin zie je ZOPA-trade-space, BATNA-oordeel en de LoI-checklist.');
  console.log('2. Log in als begeleider met ' + B.tussen_code + ' (traject B), genereer + verstuur daar OOK een');
  console.log('   Dealvoorstel — kies bewust andere dealparameters (ander belang%, andere escrow/earn-out).');
  console.log('3. Terug in traject A (of B): klik "Biedingen vergelijken" → de Deal Value Matrix laadt beide');
  console.log('   trajecten automatisch in; vul per bod de 4 inschattingen aan en vergelijk.');
  console.log('');
  console.log('OPRUIMEN als je klaar bent:');
  console.log(`  curl -s -X POST -H "x-admin-key: $ADMIN_KEY" "${WORKER}/admin/delete/mna/${A.code}"`);
  console.log(`  curl -s -X POST -H "x-admin-key: $ADMIN_KEY" "${WORKER}/admin/delete/mna/${B.code}"`);
})().catch((e) => { console.error('\nFOUT:', e.message); process.exit(1); });
