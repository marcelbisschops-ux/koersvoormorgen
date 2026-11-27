// KVM-014 / werkregel 59 (26-11-2026): het waarderingsscherm rekent op de genormaliseerde EBITDA uit de financiële analyse
// (alleen goedgekeurde normalisaties); de DD-velden zijn alleen een zichtbare terugval. Echte dvBerekenWaardering (mna/03) in een
// vm-context; de verwachte waarden worden hier onafhankelijk nagerekend (grondslag × multiple). Synthetisch, geen netwerk.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let n = 0, fout = 0;
const ok = (c, m, d) => { n++; if (c) console.log('✓ ' + m); else { fout++; console.log('✗ ' + m + (d !== undefined ? '  ' + JSON.stringify(d).slice(0, 300) : '')); } };
function maak({ maatschap = false, partnerBel = '' } = {}) {
  const data = { financieel_omzet1: '900.000', financieel_omzet2: '950.000', financieel_omzet3: '1.000.000', financieel_ebitda: '180.000', financieel_ebitdaNorm: '190.000' };
  if (partnerBel) data.partner_beloning = partnerBel;
  const ctx = { console, Math, String, Number, JSON, isFinite, parseFloat, parseInt, Object, Array, Date,
    S: { code: 'T1', rol: 'tussen', data, _groepData: data, traject: { sector: 'accountancy' } },
    location: { search: '', hostname: 'localhost', href: 'http://localhost/mna.html', pathname: '/mna.html' }, localStorage: { getItem: () => null, setItem() {} }, sessionStorage: { getItem: () => null, setItem() {} }, navigator: { userAgent: 'node' }, URLSearchParams, URL, setTimeout, clearTimeout, fetch: async () => ({ status: 0, json: async () => ({}) }),
    isMaatschap: () => maatschap, isKoper: () => false, isVerkoper: () => false, isTussen: () => true, ge: () => null, document: { getElementById: () => null } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['mna/01-config-sectorprofielen.js', 'mna/03-rekenkern-waardering.js', 'mna/16-financieel.js']) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx); } catch (e) { console.log('laadfout ' + f + ': ' + e.message); }
  }
  // Vaste, bekende multiples (in productie komen ze uit de backend) en de maatschapkeuze ná het laden van de modules.
  ctx.SECTOR_PROFIELEN.accountancy.multipleLaag = 4; ctx.SECTOR_PROFIELEN.accountancy.multipleHoog = 6;
  ctx.isMaatschap = () => maatschap;
  if (partnerBel) { const veld = ctx.getEigenaarBeloningsVeld(); const k = typeof veld === 'string' ? veld : (veld && (veld.id || veld.key)); if (k) data[k] = partnerBel; }
  return ctx;
}
const centraal = (ctx, { ebitda = 210000, omzet = 1000000, partnerbeloning = false } = {}) => {
  ctx.FIN_CENTRAAL.code = 'T1'; ctx.FIN_CENTRAAL.status = 'ok';
  ctx.FIN_CENTRAAL.data = { ok: true, jaren: [{ jaar: 2025, genormaliseerd: { ebitda, omzet } }], normalisaties: partnerbeloning ? [{ jaar: 2025, soort: 'partnerbeloning', status: 'goedgekeurd', bedrag: -120000 }] : [] };
};
// 1. Geen centrale bron → DD-terugval, zichtbaar benoemd; grondslag = DD genormaliseerde EBITDA.
let c = maak();
ok(typeof c.dvBerekenWaardering === 'function' && typeof c.finCentraleGrondslag === 'function', 'echte functies geladen');
ok(c.dvBerekenWaardering().mMid > 0, 'multiples bekend in de test (anders bewijzen de vergelijkingen niets)');
let v = c.dvBerekenWaardering();
ok(/^DD-velden \(terugval/.test(v.ebitdaBron), 'zonder financiële analyse: bron = DD-velden (terugval)', v.ebitdaBron);
const mMid = v.mMid;
ok(v.wMid != null && Math.abs(v.wMid - 190000 * mMid) < 0.01, 'terugval: waarde midden = 190.000 × multiple (onafhankelijk nagerekend)', { wMid: v.wMid, mMid });
// 2. Centrale bron → grondslag = genormaliseerde EBITDA uit de analyse, niet het DD-veld.
centraal(c, { ebitda: 210000 });
v = c.dvBerekenWaardering();
ok(/^financiële analyse, genormaliseerde EBITDA 2025/.test(v.ebitdaBron), 'met financiële analyse: bron = genormaliseerde EBITDA 2025', v.ebitdaBron);
ok(Math.abs(v.wMid - 210000 * v.mMid) < 0.01 && Math.abs(v.wLaag - 210000 * v.mLaag) < 0.01 && Math.abs(v.wHoog - 210000 * v.mHoog) < 0.01, 'laag/midden/hoog = 210.000 × multiple (niet 190.000 uit het DD-veld)', { wLaag: v.wLaag, wMid: v.wMid, wHoog: v.wHoog });
ok(Math.abs(v.ebitdaPct - 21) < 1e-9, 'EBITDA-marge volgt uit de analyse (210.000 / 1.000.000 = 21%)', v.ebitdaPct);
// 3. Analyse van een ander traject telt niet.
c.FIN_CENTRAAL.code = 'ANDER';
ok(/^DD-velden/.test(c.dvBerekenWaardering().ebitdaBron), 'centrale gegevens van een ander traject worden niet gebruikt');
// 4. Maatschap met goedgekeurde partnerbeloning-normalisatie → geen tweede aftrek van het ondernemersloon.
c = maak({ maatschap: true, partnerBel: '120.000' }); centraal(c, { ebitda: 150000, partnerbeloning: true });
v = c.dvBerekenWaardering();
ok(/^financiële analyse/.test(v.ebitdaBron) && v.wMid != null && Math.abs(v.wMid - 150000 * v.mMid) < 0.01, 'maatschap + goedgekeurd ondernemersloon: grondslag 150.000, geen dubbele aftrek', { bron: v.ebitdaBron, wMid: v.wMid, mMid: v.mMid });
// 5. Maatschap zonder goedgekeurd ondernemersloon → terugval met melding; DD-berekening (190.000 − 120.000).
c = maak({ maatschap: true, partnerBel: '120.000' }); centraal(c, { ebitda: 150000, partnerbeloning: false });
v = c.dvBerekenWaardering();
ok(/ondernemersloon/.test(v.ebitdaBron), 'maatschap zonder goedgekeurd ondernemersloon: terugval met melding', v.ebitdaBron);
ok(v.wMid == null || Math.abs(v.wMid - (190000 - 120000) * v.mMid) < 0.01 || v.maatschapGrondslagOnbekend, 'maatschap-terugval rekent op DD-EBITDA min ondernemersloon (of meldt onbekend)', { wMid: v.wMid, mMid: v.mMid, onbekend: v.maatschapGrondslagOnbekend });
// 6. Statisch: het scherm toont de grondslag en laadt de centrale bron.
const m03 = fs.readFileSync(path.join(ROOT, 'mna/03-rekenkern-waardering.js'), 'utf8');
ok(/wd-ebitda-bron/.test(m03) && /finZorgCentraal\(/.test(m03), 'waarderingsscherm toont de grondslag en laadt de centrale bron');
console.log(fout ? '✗ ' + fout + '/' + n + ' gefaald' : n + '/' + n + ' geslaagd');
process.exit(fout ? 1 : 0);
