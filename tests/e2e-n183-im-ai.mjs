// N-183 IM-integratie, één representatieve AI-run (werkregel 40): na beoordeling en vrijgave door de begeleider bevat
// het concept-IM het hoofdstuk Toekomstbestendigheid en schaalbaarheid, met de schatting als schatting en zonder
// waardeoordeel. Zonder vrijgave wordt het hoofdstuk niet opgenomen (statisch getest in audit-backend). STAGING, fictief.
// Draaien: staging-run.sh node tests/e2e-n183-im-ai.mjs
const { api, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER } = await import('./lib.mjs');
if (!IS_STAGING_WORKER) process.exit(2);
const ADMIN = leesAdminKey();
const c = (await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N183 IM B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } })).json;
const V = c.code, T = c.tussen_code, B = { 'x-tussen-key': T };
// Echte veldlabels uit het accountancy-profiel, zoals de UI ze meestuurt.
const L = { pctCompliance: 'Compliance-omzet: jaarwerk, aangiften en loonadministratie (% van de omzet)', pctAdviesTerugkerend: 'Terugkerende adviesomzet, vaste adviesafspraken (% van de omzet)', pctAdviesIncidenteel: 'Incidentele adviesomzet, projecten en eenmalige opdrachten (% van de omzet)', dienstmixBron: 'Bron van deze verdeling: feit (uit de administratie) of schatting', pctHandmatig: 'Omzet met overwegend handmatige verwerking (% van de omzet)', handmatigBron: 'Bron van dit percentage: feit (urenregistratie) of schatting', stdWerkprogramma: "Vaste werkprogramma's per dienst: ja, deels of nee", stdSjablonen: 'Vaste dossier- en rapportagesjablonen: ja, deels of nee', stdBankkoppeling: 'Geautomatiseerde bankkoppelingen: ja, deels of nee', aiGerealiseerd: 'AI-toepassingen in dagelijks gebruik (welke, sinds wanneer)' };
const veld = (x, id) => ({ value: x, label: (id && L[id]) || 'Synth veld' });
const uit = [];
try {
  await accepteerPlatformvoorwaarden([V, T, c.koper_code]);
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'financieel', data_json: { omzet1: veld('1800000', 'omzet1'), omzet2: veld('1900000', 'omzet2'), omzet3: veld('2000000', 'omzet3'), ebitda: veld('400000', 'ebitda') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'partner', data_json: { fte: veld('16', 'fte'), aantalP: veld('2', 'aantalP') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'strategisch', data_json: { niche: veld('MKB-ondernemers in de regio', 'niche'), marktpos: veld('Regionaal kantoor met vaste klantenkring', 'marktpos') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'commercieel', data_json: { aantalKlanten: veld('420', 'aantalKlanten'), pctCompliance: veld('60', 'pctCompliance'), pctAdviesTerugkerend: veld('25', 'pctAdviesTerugkerend'), pctAdviesIncidenteel: veld('10', 'pctAdviesIncidenteel'), dienstmixBron: veld('schatting van het kantoor', 'dienstmixBron') }, basis: {} } });
  await api('POST', '/mna/save', { body: { code: V, fase_id: 'it', data_json: { software: veld('Synth Boekhoudpakket', 'software'), pctHandmatig: veld('30', 'pctHandmatig'), handmatigBron: veld('schatting', 'handmatigBron'), stdWerkprogramma: veld('Ja', 'stdWerkprogramma'), stdSjablonen: veld('Ja', 'stdSjablonen'), stdBankkoppeling: veld('Deels', 'stdBankkoppeling'), aiGerealiseerd: veld('Automatische bankverwerking sinds 2025', 'aiGerealiseerd') }, basis: {} } });
  const g0 = await api('GET', '/mna/toekomst/' + V, { headers: B });
  const bo = await api('POST', '/mna/toekomst/beoordeling', { headers: B, body: { code: V, rev: g0.json.rev, stand: g0.json.stand, beoordeeld: true, in_im: true, toelichting: 'Kantoor investeert gericht in automatisering.' } });
  uit.push(['beoordeling met vrijgave voor IM vastgelegd', bo.status === 200 && bo.json.beoordeling.in_im === true]);
  const g = await api('POST', '/mna/verkoopmemorandum/genereer', { headers: B, body: { code: T } });
  const im = String((g.json && g.json.verkoopmemorandum_tekst) || '');
  uit.push(['concept-IM gegenereerd (200)', g.status === 200 && im.length > 500, g.status + ' ' + (g.json && g.json.error)]);
  const hfd = (im.split(/^## /m).find((x) => /^Toekomstbestendigheid en schaalbaarheid/.test(x)) || '');
  uit.push(['hoofdstuk Toekomstbestendigheid en schaalbaarheid aanwezig', hfd.length > 80]);
  uit.push(['hoofdstuk noemt de schatting als schatting', /schatting/i.test(hfd)]);
  uit.push(['hoofdstuk zonder waardeoordeel (geen multiple, koopprijs of waardering)', !/multiple|koopprijs|waardering|waarde van de onderneming/i.test(hfd)]);
  uit.push(['geen uitspraak over digitale klantdata (veld leeg)', !/digitale klantdata|klantdata/i.test(hfd)]);
  // Weglaten mag (niets verzinnen is de eis); als het percentage wordt genoemd, dan met procentteken.
  uit.push(['percentage handmatige verwerking, indien genoemd, met procentteken', !/\b30\b(?!\s?%| procent)/.test(hfd)]);
  uit.push(['geen plaatshouders of ruwe tokens', !/niet aangeleverd|\[CIJFER|\bTBD\b/i.test(im)]);
  console.log('--- hoofdstuk (ter controle) ---\n' + hfd.slice(0, 1500));
} finally {
  const o = await ruimTrajectOp(V, ADMIN); uit.push(['opgeruimd', !!(o && o.ok)]);
}
for (const [n, ok, info] of uit) console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok || !info ? '' : ' → ' + info));
process.exit(uit.every((x) => x[1]) ? 0 : 1);
