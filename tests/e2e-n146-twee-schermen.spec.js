// N-146 browserbewijs (GO Marcel 06-11-2026): twee begeleiderschermen van hetzelfde traject. Scherm A schrijft een notitie,
// scherm B (verouderd) wijzigt daarna alleen een veld: de notitie van A blijft. Daarna wijzigt B de notitie: niet
// opgeslagen, B krijgt een melding met de tekst van A. STAGING, fictief, ruimt op.
// Draaien: WORKER_URL=<staging> npx playwright test tests/e2e-n146-twee-schermen.spec.js
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { api, d1, leesAdminKey, accepteerPlatformvoorwaarden, ruimTrajectOp, IS_STAGING_WORKER, WORKER } from './lib.mjs';

test.skip(!IS_STAGING_WORKER, 'alleen staging');
const ADMIN = leesAdminKey();
let V, T, K;
test.beforeAll(async () => {
  const c = await api('POST', '/mna/create', { adminKey: ADMIN, body: { kantoor_naam: 'Synth N146 Schermen B.V.', sector: 'accountancy', traject_type: 'Verkoop', contact_email: 'v@synth.invalid' } });
  V = c.json.code; T = c.json.tussen_code; K = c.json.koper_code;
  await accepteerPlatformvoorwaarden([V, T, K]);
  // Notities en checklist zijn begeleidersonderdelen: VOK vooraf tekenen (zelfde als e2e-3rollen-regressie).
  const src = fs.readFileSync(new URL('../mna/04-begeleider-dashboard.js', import.meta.url), 'utf8');
  const versie = (src.match(/VOK_VERSIE\s*=\s*'([^']+)'/) || [])[1] || '1.5';
  await api('POST', '/mna/vok/teken', { body: { code: T, naam: 'Synth Begeleider', versie, email: 'b@synth.invalid' } });
});
test.afterAll(async () => { if (V) { const r = await ruimTrajectOp(V, ADMIN); expect(r && r.ok).toBeTruthy(); } });

async function open(browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/mna.html?worker=' + encodeURIComponent(WORKER));
  await page.locator('#l-code').fill(T);
  await page.locator('#l-btn').click();
  await page.waitForFunction(() => window.S && S.traject && S.rol === 'tussenpersoon', null, { timeout: 20000 });
  await expect(page.locator('#bg-ca-chk')).toBeVisible({ timeout: 20000 });
  // Zelfde aanpak als e2e-3rollen-regressie: rechtstreeks naar een fase met notitieveld (de welkomstintake overslaan).
  await page.evaluate(() => { S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'commercieel'); renderApp(); });
  await page.waitForTimeout(500);
  return page;
}
// Lezen via de staging-D1 i.p.v. GET /mna/traject: die route telt als inlogpoging (limiet 15 per 10 min per IP) en
// liet in de volledige pre-push-suite latere logins op 429 lopen.
const d1Rij = (sql) => { const r = d1(sql); return Array.isArray(r) ? r[0] : (r && r.results ? r.results[0] : null); };
const notitieServer = async (faseId) => { const r = d1Rij("SELECT notitie FROM mna_data WHERE id='" + V + '_' + faseId + "'"); return r ? r.notitie || '' : ''; };

test('notitie van scherm A overleeft een opslag vanuit verouderd scherm B; conflict geeft een melding', async ({ browser }) => {
  test.setTimeout(420000);
  const a = await open(browser), b = await open(browser);
  const faseId = await a.evaluate(() => FASES[S.fase].id);
  expect(await b.evaluate(() => FASES[S.fase].id)).toBe(faseId);
  const opslag = (p) => p.waitForResponse((r) => r.url().includes('/mna/save') && r.request().method() === 'POST', { timeout: 20000 });
  // In de volledige suite (parallel, één IP) kan de algemene limiet van 120 verzoeken/minuut een 429 geven. Dat is
  // testbelasting, geen productgedrag: dan na het verlopen van het venster dezelfde handeling opnieuw uitvoeren.
  const slaOp = async (p, handeling) => {
    for (let poging = 0; poging < 3; poging++) {
      const w = opslag(p); await handeling(); const r = await w;
      if (r.status() !== 429) return r.status();
      await p.waitForTimeout(61000);
    }
    return 429;
  };

  expect(await slaOp(a, async () => {
    await a.locator('#notitie_' + faseId).fill('Notitie van scherm A');
    await a.locator('#notitie_' + faseId).dispatchEvent('input');
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('Notitie van scherm A');

  // B (verouderd: notitie nog leeg) wijzigt alleen een gegevensveld.
  const veldId = await b.evaluate(() => { const f = FASES[S.fase]; const d = f.dataFields.find((x) => !x.header && document.getElementById('df_' + x.id) && document.getElementById('df_' + x.id).tagName === 'INPUT'); return d ? 'df_' + d.id : null; });
  expect(veldId).toBeTruthy();
  expect(await slaOp(b, async () => {
    await b.locator('#' + veldId).fill('N146 synth');
    await b.locator('#' + veldId).dispatchEvent('input');
    await b.locator('#' + veldId).dispatchEvent('change');
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('Notitie van scherm A');
  // B had de notitie niet aangeraakt: na zijn opslag toont B nu de actuele notitie van A (zoals bij velden).
  await expect(b.locator('#notitie_' + faseId)).toHaveValue('Notitie van scherm A', { timeout: 5000 });

  // A wijzigt de notitie opnieuw; B is weer verouderd en wijzigt ook de notitie: 409, het scherm van B toont de
  // nieuwe tekst van A, de eigen tekst van B staat in het herstelblok.
  expect(await slaOp(a, async () => {
    await a.locator('#notitie_' + faseId).fill('Notitie van scherm A, versie 2');
    await a.locator('#notitie_' + faseId).dispatchEvent('input');
  })).toBe(200);
  expect(await slaOp(b, async () => {
    await b.locator('#notitie_' + faseId).fill('Notitie van scherm B');
    await b.locator('#notitie_' + faseId).dispatchEvent('input');
  })).toBe(409);
  await expect(b.locator('#notitie_' + faseId)).toHaveValue('Notitie van scherm A, versie 2', { timeout: 5000 });
  await expect(b.locator('#notitie-herstel')).toContainText('Notitie van scherm B');
  expect(await notitieServer(faseId)).toBe('Notitie van scherm A, versie 2');
  // Geen stille overschrijving door een volgende automatische opslag: B wijzigt een veld, notitie van A blijft.
  expect(await slaOp(b, async () => {
    await b.locator('#' + veldId).fill('N146 synth 2');
    await b.locator('#' + veldId).dispatchEvent('input');
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('Notitie van scherm A, versie 2');
  // B kiest bewust "Mijn tekst terugzetten": opgeslagen.
  expect(await slaOp(b, async () => {
    await b.locator('#notitie-herstel button', { hasText: 'Mijn tekst terugzetten' }).click();
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('Notitie van scherm B');

  // F2: A wist de notitie niet, maar B maakt hem leeg; A herlaadt (refreshData) en wijzigt een veld: leeg blijft leeg.
  expect(await slaOp(b, async () => {
    await b.locator('#notitie_' + faseId).fill('');
    await b.locator('#notitie_' + faseId).dispatchEvent('input');
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('');
  await a.evaluate(async () => { if (typeof refreshData === 'function') await refreshData(); S.screen = 'main'; S.fase = FASES.findIndex((f) => f.id === 'commercieel'); renderApp(); });
  expect(await a.evaluate((fid) => S.notities[fid] || '', faseId)).toBe('');
  const veldA = await a.evaluate(() => { const f = FASES[S.fase]; const d = f.dataFields.find((x) => !x.header && document.getElementById('df_' + x.id) && document.getElementById('df_' + x.id).tagName === 'INPUT'); return 'df_' + d.id; });
  expect(await slaOp(a, async () => {
    await a.locator('#' + veldA).fill('N146 synth A');
    await a.locator('#' + veldA).dispatchEvent('input');
  })).toBe(200);
  expect(await notitieServer(faseId)).toBe('');
});

// Reviewscenario's, deterministisch met de echte paginacode (geen server): F1, A (basis schuift niet door naar een nooit
// getoonde serverwaarde), C (terugval na niet-nieuwste opslag) en checklistconflict.
test('basisregels checklist/notitie bij mislukte, gelijktijdige en conflicterende opslagen', async ({ browser }) => {
  const p = await open(browser);
  const r = await p.evaluate(() => {
    const fid = FASES[S.fase].id, rij = opslagRij(fid, null), uit = {};
    const nel = ge('notitie_' + fid);
    const zet = (t) => { S.notities[fid] = t; const el = ge('notitie_' + fid); if (el) el.value = t; }; // na hertekenen opnieuw opzoeken
    const mk = (t) => metBasis({ code: S.code, fase_id: fid, data_json: getDataForFase(fid), checklist_json: getChecklistForFase(fid), notitie: t });
    const ok = (nt, cl) => ({ ok: true, data_json_actueel: {}, checklist_json_actueel: cl || '{}', notitie_actueel: nt });
    const stopTimer = () => { const g = !!S.saveTimer; clearTimeout(S.saveTimer); S.saveTimer = null; return g; };
    // F1: p1 mislukt, p2 (bouwde erop voort) slaagt maar server hield B0 → basis blijft B0, opnieuw opslaan met N1.
    S._basisExtra[rij] = { cl: '{}', nt: 'B0' }; zet('N1');
    const p1 = mk('N1'), p2 = mk('N1');
    uit.f1_p2basis = p2.basis_notitie;
    naOpslag(p1, null); stopTimer();
    naOpslag(p2, ok('B0'));
    uit.f1_basis = S._basisExtra[rij].nt; uit.f1_opnieuw = stopTimer();
    const p3 = mk(notitieOpScherm(fid)); uit.f1_p3 = [p3.basis_notitie, p3.notitie]; naOpslag(p3, ok('N1'));
    // A: verstuurd O (ongewijzigd), server heeft X van een ander, gebruiker typte intussen N → basis blijft O.
    S._basisExtra[rij] = { cl: '{}', nt: 'O' }; zet('O');
    const a1 = mk('O'); zet('N');
    naOpslag(a1, ok('X'));
    uit.a_basis = S._basisExtra[rij].nt; uit.a_scherm = notitieOpScherm(fid);
    const a2p = mk('N'); uit.a_volgende = a2p.basis_notitie; naOpslag(a2p, null);
    // A-overname: niets gewijzigd en niet verder getypt → scherm en basis volgen de server.
    S._basisExtra[rij] = { cl: '{}', nt: 'O' }; zet('O');
    naOpslag(mk('O'), ok('X')); uit.a2 = [S._basisExtra[rij].nt, notitieOpScherm(fid)];
    // C: c1 slaagt maar is niet de nieuwste (c2 loopt), c2 mislukt → basis = wat c1 schreef.
    S._basisExtra[rij] = { cl: '{}', nt: 'O' }; zet('N1');
    const c1 = mk('N1'), c2 = mk('N2');
    naOpslag(c1, ok('N1')); naOpslag(c2, null); stopTimer();
    uit.c_basis = S._basisExtra[rij].nt;
    // Checklistconflict: scherm toont de checklist van de ander, basis = die checklist.
    S._basisExtra[rij] = { cl: '{}', nt: 'N1' }; zet('N1');
    const k1 = mk('N1');
    naOpslag(k1, { ok: false, code: 'VELD_CONFLICT', error: 'x', conflicten: [{ veld: '__checklist__', label: 'Checklist', actueel: '{"items":{"0":true}}' }] });
    uit.k = [!!S.checked[fid + '_0'], S._basisExtra[rij].cl];
    stopTimer();
    // Review 3, punt 3: scherm toont al de serverwaarde → basis = serverwaarde (geen vals conflict).
    S._basisExtra[rij] = { cl: '{}', nt: 'O' }; zet('O');
    const q1 = mk('O'); zet('X');
    naOpslag(q1, ok('X')); uit.r3 = S._basisExtra[rij].nt;
    // Review 3, punt 1 en 2: onbetrouwbare opslag in entiteitcontext → heropslag van de groepsrij; mislukte heropslag → melding.
    const echtSave = saveGroepsniveauVelden, echtAlert = showAlert; let gs = 0, meld = '';
    window.saveGroepsniveauVelden = function () { gs++; return Promise.resolve(false); };
    window.showAlert = function (m) { meld = m; };
    const oudEnt = S._actieveEntiteit; S._actieveEntiteit = 'SYNTH-ENT';
    S._basisExtra[rij] = { cl: '{}', nt: 'B0' }; zet('N1');
    const e1 = mk('N1'), e2 = mk('N1');
    naOpslag(e1, null); stopTimer(); naOpslag(e2, ok('B0'));
    S._actieveEntiteit = oudEnt;
    return new Promise((res) => setTimeout(() => { uit.r1 = gs; uit.r2 = meld; window.saveGroepsniveauVelden = echtSave; window.showAlert = echtAlert; stopTimer(); res(uit); }, 50));
  });
  expect(r.f1_p2basis).toBe('N1');
  expect(r.f1_basis).toBe('B0');
  expect(r.f1_opnieuw).toBe(true);
  expect(r.f1_p3).toEqual(['B0', 'N1']);
  expect(r.a_basis).toBe('O');
  expect(r.a_scherm).toBe('N');
  expect(r.a_volgende).toBe('O');
  expect(r.a2).toEqual(['X', 'X']);
  expect(r.c_basis).toBe('N1');
  expect(r.k).toEqual([true, '{"items":{"0":true}}']);
  expect(r.r3).toBe('X');
  expect(r.r1).toBe(1);
  expect(r.r2).toContain('nog niet opgeslagen');
});
