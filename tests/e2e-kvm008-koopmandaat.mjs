// KVM-008 dekking aankoop (20-11-2026) runtimeproef op STAGING (fictief, ruimt op): honoraria per koopmandaat met
// kantooreigenaar, kantoorlid, een ander kantoor en de beheerder. Uitkomst alleen statuscodes/vlaggen, geen namen.
// Draaien (staging): set -a; . tests/.env.staging.local; set +a; WORKER_URL=<staging> node tests/e2e-kvm008-koopmandaat.mjs
const { api, leesAdminKey, zetMfaUitVoorTest, ruimTestKoopmandaatOp, verwijderTestGebruiker, d1, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) { console.log('WEIGERT: alleen staging'); process.exit(2); }
const ADMIN = leesAdminKey(), ts = Date.now(), WW = 'FictiefKM008!' + ts, DOM = '@e2e-test.koersvoormorgen.invalid', uit = [];
const ck = (n, ok, d) => uit.push([n, !!ok, d]);
const gebruikers = [], mandaten = [];
async function maakAdviseur(naam, kantoor_id) {
  const email = 'km008-' + naam.toLowerCase() + '-' + ts + DOM;
  const u = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'Synth ' + naam, bedrijf: 'Synth KM008 Kantoor', email, ...(kantoor_id ? { kantoor_id } : {}) } });
  if (!u.json || !u.json.ok) throw new Error('uitnodigen mislukt');
  gebruikers.push(u.json.id);
  await api('POST', '/gebruikers/activeer', { body: { token: u.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  const l = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  return { id: u.json.id, token: l.json && l.json.sessie_token };
}
const H = (a) => ({ headers: { 'x-gebruiker-token': a.token } });
async function maakMandaat(a, naam) {
  const r = await api('POST', '/adviseur/koopmandaat/create', { ...H(a), body: { koper_naam: 'Synth KM008 ' + naam + ' ' + ts, koper_contact_email: 'kmk-' + naam.toLowerCase() + ts + DOM } });
  if (r.json && r.json.id) mandaten.push([r.json.id, r.json.tussen_code]);
  return r.json && r.json.id;
}
const ids = (r) => ((r.json && r.json.koopmandaten) || []).map((m) => m.id);
try {
  const A = await maakAdviseur('Eigenaar');
  const B = await maakAdviseur('Lid', 'K' + A.id);
  const X = await maakAdviseur('Extern');
  const mA = await maakMandaat(A, 'A'), mB = await maakMandaat(B, 'B'), mX = await maakMandaat(X, 'X');
  ck('setup: drie adviseurs met sessie en elk een koopmandaat', [A, B, X].every((x) => x.token) && mA && mB && mX);
  let r = await api('GET', '/mna/honorarium/mandaten', H(A));
  ck('eigenaar ziet eigen koopmandaat en dat van het kantoorlid, niet het externe', r.status === 200 && ids(r).includes(mA) && ids(r).includes(mB) && !ids(r).includes(mX));
  ck('lijst bevat alleen id, naam en status', r.status === 200 && r.json.koopmandaten.every((m) => Object.keys(m).sort().join() === 'id,naam,status'));
  r = await api('GET', '/mna/honorarium/mandaten', H(B));
  ck('kantoorlid ziet alleen het eigen koopmandaat', r.status === 200 && ids(r).includes(mB) && !ids(r).includes(mA) && !ids(r).includes(mX));
  ck('zonder sessie: 401', (await api('GET', '/mna/honorarium/mandaten')).status === 401);
  r = await api('GET', '/mna/honorarium/mandaten', { adminKey: ADMIN });
  ck('beheerder ziet de koopmandaten van externe adviseurs niet (muur)', r.status === 200 && ![mA, mB, mX].some((m) => ids(r).includes(m)));
  ck('beheerder: honoraria van een extern koopmandaat 403', (await api('GET', '/mna/honorarium/overzicht?traject_id=' + encodeURIComponent(mA), { adminKey: ADMIN })).status === 403);
  // Retainer + succesfee + closing op het eigen koopmandaat.
  r = await api('POST', '/mna/honorarium/onderdeel', { ...H(A), body: { traject_id: mA, soort: 'retainer', bedrag: 2000, looptijd_maanden: 6, startdatum: '2026-03-01', idem: 'r' + ts } });
  ck('retainer op eigen koopmandaat vastgelegd', r.status === 200 && r.json.onderdelen.length === 1);
  r = await api('POST', '/mna/honorarium/onderdeel', { ...H(A), body: { traject_id: mA, soort: 'succesfee', grondslag: 'percentage', percentage: 2, minimum: 20000, idem: 's' + ts } });
  ck('succesfee op eigen koopmandaat vastgelegd', r.status === 200 && r.json.onderdelen.length === 2);
  r = await api('POST', '/mna/honorarium/gebeurtenis', { ...H(A), body: { traject_id: mA, soort: 'closing', datum: '2026-09-30', transactiewaarde: 2000000, idem: 'g' + ts } });
  const sf = r.json && r.json.berekening && r.json.berekening.onderdelen.find((o) => o.soort === 'succesfee');
  ck('na closing: succesfee 2% van 2.000.000 = 40.000', r.status === 200 && sf && sf.verschuldigd === 40000, JSON.stringify(sf && sf.verschuldigd));
  ck('kantoorlid: honoraria van het koopmandaat van de eigenaar 403', (await api('GET', '/mna/honorarium/overzicht?traject_id=' + encodeURIComponent(mA), H(B))).status === 403);
  ck('extern: lezen 403', (await api('GET', '/mna/honorarium/overzicht?traject_id=' + encodeURIComponent(mA), H(X))).status === 403);
  ck('extern: schrijven 403', (await api('POST', '/mna/honorarium/onderdeel', { ...H(X), body: { traject_id: mA, soort: 'aanvang', bedrag: 1, idem: 'x' + ts } })).status === 403);
  ck('eigenaar mag ook bij het koopmandaat van het kantoorlid', (await api('GET', '/mna/honorarium/overzicht?traject_id=' + encodeURIComponent(mB), H(A))).status === 200);
} catch (e) {
  ck('geen onverwachte fout', false, String(e && e.message));
} finally {
  for (const [id, tc] of mandaten) await ruimTestKoopmandaatOp(id, tc).catch(() => {});
  if (mandaten.length) {
    const rest = d1("SELECT COUNT(*) AS n FROM mna_honorarium_km_onderdeel WHERE mandaat_id IN (" + mandaten.map((m) => "'" + String(m[0]).replace(/'/g, "''") + "'").join(',') + ')');
    ck('opruimen: honoraria van de koopmandaten zijn mee verwijderd', rest[0] && rest[0].n === 0, JSON.stringify(rest));
  }
  for (const g of gebruikers) await verwijderTestGebruiker(g, ADMIN).catch(() => {});
}
let f = 0; for (const [n, ok, d] of uit) { if (!ok) f++; console.log((ok ? '✓ ' : '✗ ') + n + (ok || d === undefined ? '' : '  ' + d)); }
console.log(f ? '✗ ' + f + '/' + uit.length + ' gefaald' : uit.length + '/' + uit.length + ' geslaagd');
process.exit(f ? 1 : 0);
