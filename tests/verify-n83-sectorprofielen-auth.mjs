// N-83 (27 sep 2026) — gerichte autorisatietest voor GET /mna/sectorprofielen (Breaker-bevinding 8:
// er was nog geen enkele test die deze logica zelf bewijst). Draait tegen STAGING, volledig fictieve
// testdata, ruimt zichzelf op.
import { WORKER, leesAdminKey, api, check, kop, samenvatting, zetMfaUitVoorTest } from './lib.mjs';

const ADMIN = leesAdminKey();
if (!ADMIN) { console.log('Geen admin-key.'); process.exit(1); }
console.log('Worker:', WORKER);

function heeftBenchmark(resp) {
  return !!(resp.json && resp.json.profielen && resp.json.profielen.accountancy && resp.json.profielen.accountancy.aiNormen);
}

async function main() {
  const stamp = Date.now();
  const WW = 'N83Sector!' + stamp;

  kop('ANONIEM · geen bewijs → gestripte data (geen benchmarkwaarden)');
  const rAnoniem = await api('GET', '/mna/sectorprofielen', {});
  check('anoniem: aiNormen null/afwezig', !heeftBenchmark(rAnoniem), JSON.stringify(rAnoniem.json).slice(0, 150));
  check('anoniem: structuur (fases) blijft aanwezig', Array.isArray(rAnoniem.json.profielen && rAnoniem.json.profielen.accountancy && rAnoniem.json.profielen.accountancy.fases) && rAnoniem.json.profielen.accountancy.fases.length > 0, 'fases ontbreken');

  kop('ONGELDIGE CODE · nog steeds gestript');
  const rOngeldig = await api('GET', '/mna/sectorprofielen?code=NIETBESTAANDXYZ', {});
  check('ongeldige code: aiNormen null/afwezig', !heeftBenchmark(rOngeldig), JSON.stringify(rOngeldig.json).slice(0, 150));

  kop('ADMIN_KEY · volledige data');
  const rAdmin = await api('GET', '/mna/sectorprofielen', { adminKey: ADMIN });
  check('admin-key: aiNormen aanwezig', heeftBenchmark(rAdmin), JSON.stringify(rAdmin.json).slice(0, 150));

  kop('SETUP · testtraject + adviseursaccount voor de resterende twee bewijzen');
  const email = 'n83-sectorauth-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uit = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'N83 SectorAuth', bedrijf: 'N83 BV', email } });
  check('uitnodiging gelukt', uit.json && uit.json.ok === true, JSON.stringify(uit.json));
  await api('POST', '/gebruikers/activeer', { body: { token: uit.json.token, wachtwoord: WW } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord: WW } });
  zetMfaUitVoorTest(email);
  const create = await api('POST', '/adviseur/create', { body: { email, wachtwoord: WW, traject: { kantoor_naam: 'N83 SectorAuth Traject', contact_naam: 'T', contact_email: 'v@e2e-test.koersvoormorgen.invalid', koper_naam: 'K', koper_contact: 'K', koper_email: 'k@e2e-test.koersvoormorgen.invalid', traject_type: 'Verkoop' } } });
  const code = create.json.code;
  check('traject aangemaakt', !!code, JSON.stringify(create.json));

  kop('GELDIGE TRAJECTCODE (tussen_code) · volledige data');
  const rCode = await api('GET', '/mna/sectorprofielen?code=' + code, {});
  check('geldige code: aiNormen aanwezig', heeftBenchmark(rCode), JSON.stringify(rCode.json).slice(0, 150));

  kop('ADVISEUR-SESSIETOKEN · volledige data');
  const login = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
  const token = login.json.sessie_token;
  check('login gelukt, sessietoken aanwezig', !!token, JSON.stringify(login.json).slice(0, 150));
  const rToken = await api('GET', '/mna/sectorprofielen', { headers: { 'x-gebruiker-token': token } });
  check('adviseur-token: aiNormen aanwezig', heeftBenchmark(rToken), JSON.stringify(rToken.json).slice(0, 150));

  kop('NEGATIEF · een willekeurige, niet-bestaande sessietoken geeft GEEN volledige data');
  const rNepToken = await api('GET', '/mna/sectorprofielen', { headers: { 'x-gebruiker-token': 'nep-token-bestaat-niet-' + stamp } });
  check('nep-sessietoken: aiNormen null/afwezig', !heeftBenchmark(rNepToken), JSON.stringify(rNepToken.json).slice(0, 150));

  kop('OPRUIMEN');
  await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  await api('POST', '/gebruikers/deactiveer/' + uit.json.id, { adminKey: ADMIN });

  samenvatting();
}

main().catch(e => { console.error(e); process.exit(1); });
