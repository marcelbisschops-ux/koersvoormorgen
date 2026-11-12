// #73 reproductie (13-11-2026): komen prognosecijfers stil in de historische velden omzet1/2/3 terecht? Zonder AI:
// de bestaande vullogica (_autoFillFromExtractionBody, mna/02) wordt in de browser aangeroepen met synthetische
// extractieresultaten (zoals de AI ze aanlevert). Geen upload, geen backendmutatie, geen kosten.
import { test, expect } from '@playwright/test';

test('prognosedocument verdringt historische jaren in omzet1/2/3', async ({ page }) => {
  await page.goto('/mna.html');
  await page.waitForFunction(() => typeof window._autoFillFromExtractionBody === 'function' || typeof _autoFillFromExtractionBody === 'function');
  const r = await page.evaluate(() => {
    S.data = {}; S._opy = {}; S._opySlotJaar = {}; S._docSource = {}; S._docJaar = {}; S._conflicts = [];
    const fill = (velden, naam) => { S._conflicts = []; _autoFillFromExtractionBody('financieel', velden, false, naam, {}); return S._conflicts.slice(); };
    fill({ omzet_per_jaar: { 2023: '1000000', 2024: '1100000', 2025: '1200000' }, boekjaar: '2025' }, 'Jaarrekening 2025.pdf');
    const naJaarrekening = { o1: S.data.financieel_omzet1, o2: S.data.financieel_omzet2, o3: S.data.financieel_omzet3, slots: JSON.stringify(S._opySlotJaar) };
    const conflicten = fill({ omzet_per_jaar: { 2026: '1350000', 2027: '1500000' } }, 'Prognose 2026-2027.xlsx');
    return { naJaarrekening, naPrognose: { o1: S.data.financieel_omzet1, o2: S.data.financieel_omzet2, o3: S.data.financieel_omzet3, slots: JSON.stringify(S._opySlotJaar), bron3: S._docSource.financieel_omzet3 }, conflicten: conflicten.map((c) => c.key + ':' + c.huidig + '->' + c.nieuw) };
  });
  console.log(JSON.stringify(r, null, 1));
  // Verwacht gedrag volgens #73: historische velden blijven 2023-2025 uit de jaarrekening.
  expect.soft(r.naPrognose.o3, 'omzet3 (meest recent historisch) blijft 2025 uit de jaarrekening').toBe('1200000');
});
