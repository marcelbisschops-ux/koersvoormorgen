// ══════════════════════════════════════════════════════════════════
// E2E — Transaction OS, partij-reviewcyclus (20 sep 2026, Marcel: "een verstuurde overeenkomst weer
// terug het dossier in"). Bewijst voor MOU/LOI/NDA identiek (generieke mechanismen, tests/POLICY.mjs
// dekt de pure logica, dit bestand de echte routes end-to-end):
//   1/2. koper akkoord, verkoper akkoord → document pas 'goedgekeurd' als BEIDE akkoord zijn
//   3.   één akkoord + één wijziging_gevraagd → 'wijziging_gevraagd' wint, nooit 'goedgekeurd'
//   4.   wijzigingsverzoek → begeleider maakt nieuwe versie (nieuw tos_document), oude blijft intact
//   5.   de oude (nu 'vervangen') versie kan niet meer beoordeeld worden
//   6.   een niet-geadresseerde partij krijgt 403
//   7.   MOU, LOI, NDA lopen door exact dezelfde routes/logica (deze test draait 3x, ongewijzigd)
//
// Gebruikt bewust een echt e-mailadres (marcel@bisschopsfinancing.nl) i.p.v. .invalid — isEchtEmail()
// filtert .invalid-adressen bewust uit (RFC 2606), en zonder een geldige ontvanger bereikt een
// document nooit status 'verstuurd' (zelfde les als PDF-RENDERER-TOS-20SEP eerder deze sessie).
//
// Draaien (staging of prod):
//   ADMIN_KEY=... WORKER_URL=https://kantoorinzicht-staging.marcel-bisschops.workers.dev \
//     node tests/e2e-tos-review.mjs
// ══════════════════════════════════════════════════════════════════
import { WORKER, leesAdminKey, api, check, kop, kleur, samenvatting, d1 } from './lib.mjs';

const ADMIN = leesAdminKey();
const DOM = '@e2e-test.invalid';

async function testProfiel(profile) {
  kop('=== ' + profile + ' ===');
  // isEchtEmail() filtert .invalid-adressen bewust uit (RFC 2606) — een echt adres nodig om
  // daadwerkelijk 'verstuurd' te bereiken (zelfde les als eerder vandaag bij PDF-RENDERER-TOS-20SEP).
  const create = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'TOS-Review ' + profile + ' BV', contact_email: 'marcel@bisschopsfinancing.nl', koper_email: 'marcel@bisschopsfinancing.nl', sector: 'accountancy' } });
  check(profile + ': traject aangemaakt', create.json && create.json.ok === true, JSON.stringify(create.json));
  const code = create.json.code, koperCode = create.json.koper_code, tussenCode = create.json.tussen_code;
  const H = { 'x-tussen-key': tussenCode };
  const VH = { 'x-tussen-key': code };
  const KH = { 'x-tussen-key': koperCode };
  await api('POST', '/mna/tos/activeer/' + code, { headers: H });

  async function maakEnVerstuur(adressaten) {
    const mk = await api('POST', '/mna/tos/document', { headers: H, body: { profile } });
    const docId = mk.json && mk.json.document_id;
    check(profile + ': document aangemaakt', !!docId, JSON.stringify(mk.json).slice(0, 150));
    await api('POST', '/mna/tos/document/' + docId + '/review-alles', { headers: H, body: { naam: 'Mr. Test Jurist', hoedanigheid: 'advocaat' } });
    const fin = await api('POST', '/mna/tos/document/' + docId + '/finaliseer', { headers: H });
    check(profile + ': finaliseren ok', fin.json && fin.json.ok === true, JSON.stringify(fin.json).slice(0, 200));
    const vs = await api('POST', '/mna/tos/document/' + docId + '/verstuur', { headers: H, body: { adressaten } });
    check(profile + ': versturen ok, status verstuurd', vs.json && vs.json.ok === true && vs.json.status === 'verstuurd', JSON.stringify(vs.json).slice(0, 200));
    return docId;
  }

  // ── #1 + #2: koper akkoord, verkoper akkoord → document goedgekeurd ──
  const doc1 = await maakEnVerstuur(['verkoper', 'koper']);
  const r1koper = await api('POST', '/mna/tos/document/' + doc1 + '/reageren', { headers: KH, body: { actie: 'akkoord' } });
  check(profile + ' #1: koper akkoord → ok, status nog verstuurd (verkoper nog niet)', r1koper.json && r1koper.json.ok === true && r1koper.json.document_status === 'verstuurd', JSON.stringify(r1koper.json));
  const r1verkoper = await api('POST', '/mna/tos/document/' + doc1 + '/reageren', { headers: VH, body: { actie: 'akkoord' } });
  check(profile + ' #2: verkoper akkoord → ok, status nu goedgekeurd (beide akkoord)', r1verkoper.json && r1verkoper.json.ok === true && r1verkoper.json.document_status === 'goedgekeurd', JSON.stringify(r1verkoper.json));
  const g1 = await api('GET', '/mna/tos/document/' + doc1, { headers: H });
  check(profile + ': D1/API bevestigt status goedgekeurd + 2 reacties', g1.json && g1.json.document.status === 'goedgekeurd' && (g1.json.reacties || []).length === 2, JSON.stringify(g1.json.document));
  const d1Status = d1(`SELECT status FROM tos_document WHERE id='${doc1}'`);
  check(profile + ': onafhankelijk D1: status=goedgekeurd', d1Status[0]?.status === 'goedgekeurd', JSON.stringify(d1Status[0]));

  // ── #6: verkeerde partij krijgt 403 (document alleen naar koper gestuurd, verkoper probeert te reageren) ──
  const doc2 = await maakEnVerstuur(['koper']);
  const r2verkeerd = await api('POST', '/mna/tos/document/' + doc2 + '/reageren', { headers: VH, body: { actie: 'akkoord' } });
  check(profile + ' #6: verkoper (niet-adressaat) reageren → 403', r2verkeerd.status === 403, 'status ' + r2verkeerd.status + ' ' + JSON.stringify(r2verkeerd.json));
  const r2koperOk = await api('POST', '/mna/tos/document/' + doc2 + '/reageren', { headers: KH, body: { actie: 'akkoord' } });
  check(profile + ': koper (wel adressaat) kan gewoon reageren → ok', r2koperOk.json && r2koperOk.json.ok === true, JSON.stringify(r2koperOk.json));

  // ── #3: één akkoord + één wijzigingsverzoek → document blijft NIET goedgekeurd ──
  const doc3 = await maakEnVerstuur(['verkoper', 'koper']);
  const r3koper = await api('POST', '/mna/tos/document/' + doc3 + '/reageren', { headers: KH, body: { actie: 'akkoord' } });
  check(profile + ' #3a: koper akkoord', r3koper.json && r3koper.json.ok === true);
  const r3verkoper = await api('POST', '/mna/tos/document/' + doc3 + '/reageren', { headers: VH, body: { actie: 'wijziging_gevraagd', toelichting: 'De betalingstermijn moet 30 dagen zijn, niet 14.', wijzigingsvoorstel: 'Artikel 4: 30 dagen i.p.v. 14 dagen.' } });
  check(profile + ' #3b: verkoper wijziging_gevraagd → status wijziging_gevraagd (ondanks koper-akkoord)', r3verkoper.json && r3verkoper.json.ok === true && r3verkoper.json.document_status === 'wijziging_gevraagd', JSON.stringify(r3verkoper.json));
  const g3 = await api('GET', '/mna/tos/document/' + doc3, { headers: H });
  const verkoperReactie = (g3.json.reacties || []).find((r) => r.party_role === 'verkoper');
  check(profile + ': begeleider ziet de toelichting van verkoper in het dossier', verkoperReactie && verkoperReactie.toelichting === 'De betalingstermijn moet 30 dagen zijn, niet 14.', JSON.stringify(verkoperReactie));
  check(profile + ': document status NIET goedgekeurd ondanks 1 akkoord', g3.json.document.status === 'wijziging_gevraagd');

  // Reageren op een document dat al een uitkomst heeft (dubbele reactie) → geweigerd.
  const r3nogmaals = await api('POST', '/mna/tos/document/' + doc3 + '/reageren', { headers: KH, body: { actie: 'wijziging_gevraagd', toelichting: 'x' } });
  check(profile + ': nogmaals reageren op document met uitkomst → geweigerd (ronde gesloten)', r3nogmaals.status === 409, 'status ' + r3nogmaals.status);

  // ── #4 + #5: begeleider maakt nieuwe versie na wijziging_gevraagd; oude versie niet meer te beoordelen ──
  const mk4 = await api('POST', '/mna/tos/document', { headers: H, body: { profile } });
  const doc4 = mk4.json && mk4.json.document_id;
  check(profile + ' #4: nieuwe versie aangemaakt, ander document_id dan doc3', !!doc4 && doc4 !== doc3, JSON.stringify(mk4.json).slice(0, 150));
  const doc3NaNieuw = d1(`SELECT status FROM tos_document WHERE id='${doc3}'`);
  check(profile + ' #4: oude versie (doc3) nu status=vervangen (D1)', doc3NaNieuw[0]?.status === 'vervangen', JSON.stringify(doc3NaNieuw[0]));
  const oudeReactiesNogIntact = d1(`SELECT party_role, response FROM tos_party_response WHERE document_id='${doc3}'`);
  check(profile + ' #4: oude reacties blijven gekoppeld aan de oude versie (niet gewist)', oudeReactiesNogIntact.length === 2, JSON.stringify(oudeReactiesNogIntact));
  const g4 = await api('GET', '/mna/tos/document/' + doc4, { headers: H });
  check(profile + ' #4: nieuwe versie start met schone reviewstatus (0 reacties)', g4.json && (g4.json.reacties || []).length === 0, JSON.stringify(g4.json.reacties));

  // #5: oude versie (doc3, nu vervangen) kan niet meer beoordeeld worden, ook al staat er verder niets aan in de weg.
  const r5oud = await api('POST', '/mna/tos/document/' + doc3 + '/reageren', { headers: KH, body: { actie: 'akkoord' } });
  check(profile + ' #5: reageren op vervangen (verouderde) versie → geweigerd', r5oud.status === 409 || r5oud.status === 403, 'status ' + r5oud.status + ' ' + JSON.stringify(r5oud.json));

  // Nieuwe versie kan wél weer normaal door de hele cyclus (versturen + reageren).
  await api('POST', '/mna/tos/document/' + doc4 + '/review-alles', { headers: H, body: { naam: 'Mr. Test Jurist', hoedanigheid: 'advocaat' } });
  await api('POST', '/mna/tos/document/' + doc4 + '/finaliseer', { headers: H });
  const vs4 = await api('POST', '/mna/tos/document/' + doc4 + '/verstuur', { headers: H, body: { adressaten: ['verkoper', 'koper'] } });
  check(profile + ' #4: nieuwe versie kan opnieuw ter verzending worden aangeboden', vs4.json && vs4.json.ok === true, JSON.stringify(vs4.json).slice(0, 150));
  const r4koper = await api('POST', '/mna/tos/document/' + doc4 + '/reageren', { headers: KH, body: { actie: 'akkoord' } });
  check(profile + ': nieuwe versie accepteert een verse reactie (eigen, schone cyclus)', r4koper.json && r4koper.json.ok === true, JSON.stringify(r4koper.json));

  await api('POST', '/admin/delete/mna/' + code, { adminKey: ADMIN });
  const rest = d1(`SELECT id FROM mna_trajecten WHERE id='${code}'`);
  check(profile + ': cleanup traject weg', rest.length === 0);
  const restResp = d1(`SELECT id FROM tos_party_response WHERE traject_id='${code}'`);
  check(profile + ': cleanup tos_party_response weg (cascade)', restResp.length === 0, JSON.stringify(restResp));
}

async function main() {
  console.log(kleur('vet', 'TOS partij-reviewcyclus — MOU/LOI/NDA (generieke mechanismen, test #7)'));
  console.log(kleur('grijs', 'Worker: ' + WORKER));
  for (const profile of ['MOU', 'LOI', 'NDA']) {
    await testProfiel(profile);
  }
  samenvatting();
}
main();
