// Verificatiescript P1-REL-1 (centrale relatielaag / CRM-kern), 26 sep 2026.
// Draait tegen STAGING, volledig fictieve testdata, ruimt zichzelf op.
// Gebruik: ADMIN_KEY=... node tests/verify-p1rel1-crm.mjs
import { WORKER, leesAdminKey, api, check, kop, samenvatting, zetMfaUitVoorTest, d1 } from './lib.mjs';

const ADMIN = leesAdminKey();
if (!ADMIN) { console.log('Geen admin-key.'); process.exit(1); }
console.log('Worker:', WORKER);

async function activeer(token, wachtwoord, email) {
  await api('POST', '/gebruikers/activeer', { body: { token, wachtwoord } });
  await api('POST', '/gebruiker/voorwaarden/accepteren', { body: { email, wachtwoord } });
  zetMfaUitVoorTest(email);
}

async function main() {
  const stamp = Date.now();
  const WW = 'FictiefTest!P1REL1_' + stamp;

  kop('SETUP · kantoor met twee gebruikers (eigenaar + lid, crm_toegang default team)');
  const emailEig = 'crm-eigenaar-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uitEig = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'CRM Eigenaar', bedrijf: 'DAILY_QA CRM Kantoor', email: emailEig } });
  check('uitnodiging eigenaar gelukt', uitEig.json && uitEig.json.ok === true, JSON.stringify(uitEig.json));
  await activeer(uitEig.json.token, WW, emailEig);
  const kantoorId = 'K' + uitEig.json.id;

  const emailLid = 'crm-lid-' + stamp + '@e2e-test.koersvoormorgen.invalid';
  const uitLid = await api('POST', '/gebruikers/uitnodigen', { adminKey: ADMIN, body: { naam: 'CRM Lid', bedrijf: 'x', email: emailLid, kantoor_id: kantoorId } });
  await activeer(uitLid.json.token, WW, emailLid);

  async function login(email) {
    const r = await api('POST', '/adviseur/trajecten', { body: { email, wachtwoord: WW } });
    return r.json && r.json.sessie_token;
  }
  const tokenEig = await login(emailEig);
  const tokenLid = await login(emailLid);
  check('eigenaar + lid ingelogd', !!tokenEig && !!tokenLid, 'eig=' + !!tokenEig + ' lid=' + !!tokenLid);

  kop('NEGATIEF · CRM-module staat standaard UIT voor een nieuw kantoor (fail-closed)');
  const orgVoorModuleAan = await api('GET', '/gebruikers/crm/organisaties', { headers: { 'x-gebruiker-token': tokenEig } });
  check('CRM geweigerd zolang module uitstaat (403)', orgVoorModuleAan.status === 403, 'status=' + orgVoorModuleAan.status + ' ' + JSON.stringify(orgVoorModuleAan.json));

  kop('ADMIN · CRM-module aanzetten voor dit kantoor');
  const moduleAan = await api('POST', '/mna/admin/kantoren/' + kantoorId + '/module', { adminKey: ADMIN, body: { module_id: 'crm', enabled: true } });
  check('module crm aangezet', moduleAan.json && moduleAan.json.ok === true && moduleAan.json.enabled === true, JSON.stringify(moduleAan.json));

  kop('ORGANISATIE · nieuwe organisatie aanmaken (geen KvK-match, geen naam-match)');
  const orgNieuw = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenEig }, body: { naam: 'DAILY_QA Jansen Accountants BV', kvk_nummer: '77' + stamp + '01', plaats: 'Eindhoven', sector: 'accountancy' } });
  check('nieuwe organisatie aangemaakt', orgNieuw.json && orgNieuw.json.ok === true && orgNieuw.json.match_type === 'nieuw' && !!orgNieuw.json.organisatie, JSON.stringify(orgNieuw.json).slice(0, 200));
  const orgId = orgNieuw.json.organisatie && orgNieuw.json.organisatie.id;
  const kvkNummer = orgNieuw.json.organisatie && orgNieuw.json.organisatie.kvk_nummer;

  kop('ORGANISATIE · zelfde KvK-nummer nogmaals aanbieden → harde match, geen duplicaat');
  const orgKvkMatch = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenEig }, body: { naam: 'Andere naam maar zelfde KvK', kvk_nummer: kvkNummer } });
  check('KvK-match hergebruikt bestaande organisatie', orgKvkMatch.json && orgKvkMatch.json.match_type === 'kvk' && orgKvkMatch.json.organisatie.id === orgId, JSON.stringify(orgKvkMatch.json).slice(0, 200));

  kop('ORGANISATIE · gelijkende naam zonder KvK → suggestie, GEEN automatische koppeling');
  const orgSuggestie = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenEig }, body: { naam: 'DAILY_QA Jansen Accountants' } });
  check('naam-suggestie, geen auto-koppeling', orgSuggestie.json && orgSuggestie.json.match_type === 'naam-suggestie' && Array.isArray(orgSuggestie.json.suggesties) && orgSuggestie.json.suggesties.some(s => s.id === orgId), JSON.stringify(orgSuggestie.json).slice(0, 250));

  kop('CONTACTPERSOON + ACTIVITEITEN (kantoor vs. privé)');
  const contact = await api('POST', '/gebruikers/crm/organisaties/' + orgId + '/contactpersonen', { headers: { 'x-gebruiker-token': tokenEig }, body: { naam: 'Piet Jansen', email: 'piet@e2e-test.koersvoormorgen.invalid', functie: 'DGA' } });
  check('contactpersoon toegevoegd', contact.json && contact.json.ok === true, JSON.stringify(contact.json));

  const actKantoor = await api('POST', '/gebruikers/crm/organisaties/' + orgId + '/activiteiten', { headers: { 'x-gebruiker-token': tokenEig }, body: { type: 'gesprek', tekst: 'DAILY_QA kantoorbreed gesprek', zichtbaarheid: 'kantoor' } });
  const actPrive = await api('POST', '/gebruikers/crm/organisaties/' + orgId + '/activiteiten', { headers: { 'x-gebruiker-token': tokenEig }, body: { type: 'notitie', tekst: 'DAILY_QA prive notitie van eigenaar', zichtbaarheid: 'privé' } });
  check('beide activiteiten aangemaakt', actKantoor.json.ok && actPrive.json.ok, JSON.stringify([actKantoor.json, actPrive.json]));

  const detailAlsLid = await api('GET', '/gebruikers/crm/organisaties/' + orgId, { headers: { 'x-gebruiker-token': tokenLid } });
  const lidZietKantoorActiviteit = (detailAlsLid.json.activiteiten || []).some(a => a.tekst.includes('kantoorbreed'));
  const lidZietPriveActiviteit = (detailAlsLid.json.activiteiten || []).some(a => a.tekst.includes('prive notitie'));
  check('lid ziet kantoorbrede activiteit', lidZietKantoorActiviteit, JSON.stringify((detailAlsLid.json.activiteiten || []).map(a => a.tekst)));
  check('lid ziet NIET de privé-activiteit van de eigenaar', !lidZietPriveActiviteit, JSON.stringify((detailAlsLid.json.activiteiten || []).map(a => a.tekst)));

  const detailAlsEigenaar = await api('GET', '/gebruikers/crm/organisaties/' + orgId, { headers: { 'x-gebruiker-token': tokenEig } });
  const eigenaarZietEigenPrive = (detailAlsEigenaar.json.activiteiten || []).some(a => a.tekst.includes('prive notitie'));
  check('eigenaar ziet zijn eigen privé-activiteit terug', eigenaarZietEigenPrive, JSON.stringify((detailAlsEigenaar.json.activiteiten || []).map(a => a.tekst)));

  kop('OPPORTUNITY · aanmaken, lijst, fase bijwerken');
  const opp = await api('POST', '/gebruikers/crm/opportunities', { headers: { 'x-gebruiker-token': tokenEig }, body: { organisatie_id: orgId, type: 'sell-side', omschrijving: 'DAILY_QA zoekopdracht' } });
  check('opportunity aangemaakt', opp.json && opp.json.ok === true && opp.json.opportunity.fase === 'nieuw', JSON.stringify(opp.json));
  const oppId = opp.json.opportunity.id;
  const oppLijst = await api('GET', '/gebruikers/crm/opportunities', { headers: { 'x-gebruiker-token': tokenLid } });
  check('lid (team-toegang) ziet de opportunity van de eigenaar in de lijst', (oppLijst.json || []).some(o => o.id === oppId), JSON.stringify((oppLijst.json || []).map(o => o.id)));
  const faseUpdate = await api('POST', '/gebruikers/crm/opportunities/' + oppId + '/fase', { headers: { 'x-gebruiker-token': tokenLid }, body: { fase: 'in_gesprek' } });
  check('lid kan fase bijwerken (team-toegang)', faseUpdate.json && faseUpdate.json.ok === true && faseUpdate.json.fase === 'in_gesprek', JSON.stringify(faseUpdate.json));

  kop("EIGEN-BEPERKING · crm_toegang='eigen' beperkt tot eigen rijen (direct via D1, geen apart admin-endpoint gebouwd deze ronde — werkregel 41)");
  d1("UPDATE bf_gebruikers SET crm_toegang='eigen' WHERE id='" + uitLid.json.id + "'");
  // Lid maakt nu een EIGEN organisatie aan — zou wel gewoon voor zichzelf zichtbaar moeten zijn.
  const orgVanLid = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenLid }, body: { naam: 'DAILY_QA Lid Eigen Organisatie ' + stamp } });
  check('lid kan zelf een organisatie aanmaken ondanks eigen-beperking', orgVanLid.json && orgVanLid.json.ok === true, JSON.stringify(orgVanLid.json).slice(0, 150));
  const orgLijstAlsLid = await api('GET', '/gebruikers/crm/organisaties', { headers: { 'x-gebruiker-token': tokenLid } });
  const lidZietEigenOrg = (orgLijstAlsLid.json || []).some(o => o.id === orgVanLid.json.organisatie.id);
  const lidZietOrgVanEigenaarNiet = !(orgLijstAlsLid.json || []).some(o => o.id === orgId);
  check('lid ziet zijn eigen organisatie in de lijst', lidZietEigenOrg, JSON.stringify((orgLijstAlsLid.json || []).map(o => o.id)));
  check("lid (crm_toegang='eigen') ziet de organisatie van de eigenaar NIET in de lijst", lidZietOrgVanEigenaarNiet, JSON.stringify((orgLijstAlsLid.json || []).map(o => o.id)));
  const orgLijstAlsEigenaar = await api('GET', '/gebruikers/crm/organisaties', { headers: { 'x-gebruiker-token': tokenEig } });
  check("eigenaar (crm_toegang='team', ongewijzigd) ziet WEL beide organisaties", (orgLijstAlsEigenaar.json || []).some(o => o.id === orgId) && (orgLijstAlsEigenaar.json || []).some(o => o.id === orgVanLid.json.organisatie.id), JSON.stringify((orgLijstAlsEigenaar.json || []).map(o => o.id)));

  kop("BREAKER-FIX 26 sep · resolve()/opportunity-aanmaak respecteren crm_toegang='eigen' (was FAIL)");
  d1("UPDATE bf_gebruikers SET crm_toegang='eigen' WHERE id='" + uitLid.json.id + "'");
  const resolveBevestigLek = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenLid }, body: { naam: 'poging', bevestig_organisatie_id: orgId } });
  check("resolve(bevestig_organisatie_id) van andermans org geeft 404, geen leak", resolveBevestigLek.status === 404, 'status=' + resolveBevestigLek.status + ' ' + JSON.stringify(resolveBevestigLek.json));
  const resolveKvkLek = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenLid }, body: { naam: 'andere naam', kvk_nummer: kvkNummer } });
  const kvkLektNiet = !(resolveKvkLek.json && resolveKvkLek.json.organisatie && resolveKvkLek.json.organisatie.id === orgId);
  check("resolve(kvk_nummer van andermans org) lekt de rij NIET (match_type wordt 'nieuw', geen dedup over de eigen-grens)", kvkLektNiet, JSON.stringify(resolveKvkLek.json).slice(0, 200));
  if (resolveKvkLek.json && resolveKvkLek.json.match_type === 'nieuw' && resolveKvkLek.json.organisatie) {
    d1("DELETE FROM crm_organisaties WHERE id='" + resolveKvkLek.json.organisatie.id + "'"); // bewust ontstaan duplicaat (privacy > dedup bij eigen-beperking), meteen opruimen
  }
  const resolveNaamLek = await api('POST', '/gebruikers/crm/organisaties/resolve', { headers: { 'x-gebruiker-token': tokenLid }, body: { naam: 'DAILY_QA Jansen Accountants' } });
  const naamSuggestieLektNiet = !(resolveNaamLek.json && resolveNaamLek.json.suggesties && resolveNaamLek.json.suggesties.some(s => s.id === orgId));
  check('resolve(naam-suggestie) toont geen suggesties uit andermans rijen', naamSuggestieLektNiet, JSON.stringify(resolveNaamLek.json).slice(0, 200));
  if (resolveNaamLek.json && resolveNaamLek.json.match_type === 'nieuw' && resolveNaamLek.json.organisatie) {
    d1("DELETE FROM crm_organisaties WHERE id='" + resolveNaamLek.json.organisatie.id + "'");
  }
  const oppOpAndermansOrg = await api('POST', '/gebruikers/crm/opportunities', { headers: { 'x-gebruiker-token': tokenLid }, body: { organisatie_id: orgId, omschrijving: 'poging' } });
  check("lid (eigen-beperkt) kan GEEN opportunity aanmaken op andermans organisatie (403)", oppOpAndermansOrg.status === 403, 'status=' + oppOpAndermansOrg.status + ' ' + JSON.stringify(oppOpAndermansOrg.json));
  const detailNaEigenBeperking = await api('GET', '/gebruikers/crm/organisaties/' + orgId, { headers: { 'x-gebruiker-token': tokenEig } });
  const eigenaarZietOpp = (detailNaEigenBeperking.json.opportunities || []).some(o => o.id === oppId);
  check('org-detail toont voor de eigenaar (team) nog gewoon zijn eigen opportunity', eigenaarZietOpp, JSON.stringify((detailNaEigenBeperking.json.opportunities || []).map(o => o.id)));
  d1("UPDATE bf_gebruikers SET crm_toegang='team' WHERE id='" + uitLid.json.id + "'"); // opruimen effect
  d1("DELETE FROM crm_organisaties WHERE id='" + orgVanLid.json.organisatie.id + "'"); // geen delete-endpoint gebouwd deze ronde, testdata direct via D1 opruimen

  kop('CASCADE · traject_id-gekoppelde activiteit verdwijnt mee met het traject, organisatie blijft');
  const createTraj = await api('POST', '/adviseur/create', { body: { email: emailEig, wachtwoord: WW, traject: { kantoor_naam: 'DAILY_QA CRM Cascade Traject', contact_naam: 'T', contact_email: 'v@e2e-test.koersvoormorgen.invalid', koper_naam: 'K', koper_contact: 'K', koper_email: 'k@e2e-test.koersvoormorgen.invalid', traject_type: 'Verkoop' } } });
  const trajCode = createTraj.json.code;
  const actTraject = await api('POST', '/gebruikers/crm/organisaties/' + orgId + '/activiteiten', { headers: { 'x-gebruiker-token': tokenEig }, body: { type: 'notitie', tekst: 'DAILY_QA traject-gekoppelde activiteit', traject_id: trajCode } });
  check('traject-gekoppelde activiteit aangemaakt', actTraject.json.ok, JSON.stringify(actTraject.json));
  await api('POST', '/admin/delete/mna/' + trajCode, { adminKey: ADMIN });
  const detailNaTrajectVerwijderen = await api('GET', '/gebruikers/crm/organisaties/' + orgId, { headers: { 'x-gebruiker-token': tokenEig } });
  const trajActiviteitWeg = !(detailNaTrajectVerwijderen.json.activiteiten || []).some(a => a.tekst.includes('traject-gekoppelde'));
  check('traject-gekoppelde activiteit is weg ná trajectverwijdering', trajActiviteitWeg, JSON.stringify((detailNaTrajectVerwijderen.json.activiteiten || []).map(a => a.tekst)));
  check('organisatie zelf blijft bestaan ná trajectverwijdering', detailNaTrajectVerwijderen.json.organisatie && detailNaTrajectVerwijderen.json.organisatie.id === orgId, JSON.stringify(detailNaTrajectVerwijderen.json.organisatie));

  kop('OPRUIMEN');
  d1("DELETE FROM crm_activiteiten WHERE organisatie_id='" + orgId + "'");
  d1("DELETE FROM crm_contactpersonen WHERE organisatie_id='" + orgId + "'");
  d1("DELETE FROM crm_opportunities WHERE organisatie_id='" + orgId + "'");
  d1("DELETE FROM crm_organisaties WHERE id='" + orgId + "'");
  d1("DELETE FROM kantoor_modules WHERE kantoor_id='" + kantoorId + "'");
  d1("DELETE FROM kantoren WHERE id='" + kantoorId + "'");
  for (const gid of [uitEig.json.id, uitLid.json.id]) {
    const dea = await api('POST', '/gebruikers/deactiveer/' + gid, { adminKey: ADMIN });
    check('gebruiker ' + gid + ' gedeactiveerd', dea.json && dea.json.ok === true, JSON.stringify(dea.json));
  }
  const restCheck = d1("SELECT COUNT(*) as n FROM crm_organisaties WHERE id='" + orgId + "'");
  check('crm-testdata volledig opgeruimd (onafhankelijke D1-telling)', restCheck[0] && restCheck[0].n === 0, JSON.stringify(restCheck));

  samenvatting();
}

main().catch(e => { console.error(e); process.exit(1); });
