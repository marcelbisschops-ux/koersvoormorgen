# Sectorprofiel-benchmarks — herkomst & status

**Aangemaakt 31 augustus 2026 (P1-punt A1 uit de structurele backlog).** Doel: van elk
kwantitatief getal in de sectorprofielen vaststellen waar het vandaan komt, zodat er geen
ongefundeerd (mogelijk ooit door een AI verzonnen) cijfer in een waardering of AI-prompt terechtkomt.

## Twee verschillende benchmark-bronnen in het platform — niet verwarren

| Bron | Waar | Wie beheert | Heeft bronvermelding? | Voedt |
|---|---|---|---|---|
| **DB-benchmarks** (`/benchmarks`) | `groups`/`benchmarks`-tabel, backend | Marcel via marilyn → Benchmarks (veld **Bron** verplicht) | **Ja** — bijv. "Brookz Overname Barometer H1-2025", "Full Finance/Novak 2024-2025" | de **bedrijfsscan** + het **waarderingsscherm** (`mna/06`), curve-gedreven |
| **Sectorprofiel `aiNormen` + `multipleLaag/Hoog`** | `mna/01-config-sectorprofielen.js` + de backend-kopie `DEFAULT_SECTOR_PROFIELEN` | hardcoded, wijzigt alleen via een codewijziging | **Nee** — vrije tekst zonder bron | de **dealvoorstel-rekenkern** (`dvSectorMultipleRange` → `dvGetDefaults`) + als "SECTOR NORMEN" in AI-prompts |

De eerste is netjes gebrond. **De tweede — de getallen die het dealvoorstel aansturen — is dat niet.**
Dit document gaat over de tweede.

---

## Status per sector (per 31 aug 2026)

Legenda: 🟢 geverifieerd tegen een externe bron · 🟡 plausibel, geen geverifieerde bron ·
🔴 wijkt af van de externe bron / aandacht nodig

### Accountancy — `multiple 4,5–5,5× EBITDA`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 4,5–5,5× EBITDA | 🟢 | Sluit aan op de Brookz-curve voor NL M&A-advies-/accountantskantoren die ook het waarderingsscherm voedt ("289 Nederlandse M&A-advieskantoren, Brookz Overname Barometer"). Marcel bevestigt: sectorkennis + benchmark. |
| EBITDA-marge 15–25% | 🟡 | Gangbaar genoemd getal voor de sector; geen expliciete bron in de code. Marcel kan dit met hoge zekerheid bevestigen (bestuurder-achtergrond). |
| omzet/FTE €80k–€140k, personeelskosten 55–65%, declarabiliteit >75%, verloop <15% | 🟡 | Idem — plausibele branchegetallen, geen citaat. Deels overlappend met de DB-benchmark `omzet_fte_accountant` (die wél een bron heeft: "Full Finance/Novak 2024-2025"). **Aanbeveling:** de `aiNormen`-tekst laten verwijzen naar diezelfde bron. |

### MKB (retail/horeca/handel/ambacht) — `multiple 2,5–4,5× EBITDA`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 2,5–4,5× EBITDA | 🟢 | **Tweede herijking, 11 sep 2026, zelfde dag.** De eerste herijking (2,5–4,5× → 4,0–6,0×, Marcel akkoord op BACKLOG 1.1 "ophogen richting Brookz") bleek op de verkeerde referentie te leunen: het "gemiddelde MKB-EBITDA-multiple van 5,0" is het **blended gemiddelde over alle Brookz-sectoren** (incl. software 7,5×/IT-diensten 6,7×/zorg 6,5×), niet specifiek voor retail/horeca/handel/ambacht. Bij nazoeken voor BACKLOG 1.3b bleek de Brookz Overnamebarometer H2-2025 juist per sector: **Detailhandel 2,5×, Horeca/Toerisme/Recreatie 3,3×** — beide onder de 4,0–6,0×-band die er na de eerste herijking stond. Teruggezet naar de oorspronkelijke 2,5–4,5×, die voor retail/horeca dus al redelijk kalibreerde. Handel/ambacht: geen aparte Brookz-cijfers gevonden, blijft binnen deze band tot een betere bron (zie 1.3b hieronder). Bijgewerkt in `mna/01-config-sectorprofielen.js` + `cloudflare-worker.js` + `marilyn.html`. |
| EBITDA-marge 5–15% (horeca 8–12%, retail 5–10%, handel 6–12%), omzet/FTE €80k–€200k, personeelskosten 25–45%, voorraadomzet >6×/jr | 🟡 | Redelijke bandbreedtes, geen bron. De sub-sector-uitsplitsing (horeca/retail/handel) suggereert precisie die niet is onderbouwd. **Aanbeveling:** één publieke bron per sub-branche (bijv. ABN AMRO/RaboResearch sectorprognoses, CBS), of de uitsplitsing weghalen. |

### Zorg (huisarts/tandarts/fysiotherapie) — omvangsafhankelijk: `1–3× OMZET (klein)` of `6,0–7,3× EBITDA (groter)`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 1–3× omzet (≤5 FTE) / 6,0–7,3× EBITDA (>5 FTE) | 🟢 | **Omvangsafhankelijk gemaakt 11 sep 2026** (Marcel akkoord op BACKLOG 1.2: "omvangsafhankelijk maken"). Voor een **kleine, eigenaar-gedreven solopraktijk** is "praktijkwaarde ≈ een deel van de jaaromzet" (goodwill + inventaris) een reële, aparte conventie — historisch ~1× voor huisartsengoodwill, al staat dat onder druk. Voor een **grotere praktijk / keten / consolidatietarget** hanteert de markt juist een **EBITDA-multiple**: Brookz "zorg & farmacie" ≈ **6,0–7,3× EBITDA (gem. 6,5×)**. Voorbeeld uit de bron: fysioketen €5 mln omzet, 18% EBITDA → €5,4–6,6 mln ≈ 1,1–1,3× omzet óf ~6–7× EBITDA — dit voorbeeld is nu ook de onafhankelijke testcase in `scripts/validate-zorg-omvang-multiple.mjs`, met exacte overeenstemming. Schakelaar: groeps-FTE (`partner_fte`, `VELD_AGGREGATIE.partner.fte='som'`) > 5 → EBITDA-variant; ≤5 óf nog onbekend → omzet-variant blijft gelden (nooit stilzwijgend naar "groot" gokken). De FTE-grens van 5 is een **operationeel ingesteld drempelgetal**, geen gebronde marktnorm — aanpasbaar in `mna/01-config-sectorprofielen.js` (`multipleGrootFteGrens`) indien gewenst. Geïmplementeerd in `dvSectorMultipleRange()`, `mna/03-rekenkern-waardering.js`. |
| EBITDA-marge 15–25% (huisarts 20–30%), omzet/FTE €60k–€120k | 🟡 | Plausibel; "NZa-tarieven leidend" klopt als kwalitatieve constatering. Geen citaat. |

### IT/software — `multiple 3–8× ARR (SaaS) of 4–6× EBITDA (maatwerk/diensten)`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 4–6× EBITDA (maatwerk/diensten — de vastgelegde basis) | 🟡 | **Bevinding 11 sep 2026 (BACKLOG 1.3b-onderzoek), nog niet doorgevoerd — wacht op Marcels beslissing:** Brookz Overnamebarometer H2-2025 geeft specifiek IT-diensten 6,7× en Softwareontwikkeling 7,5× — beide duidelijk boven de huidige 4–6×. Bewust niet zelf aangepast (geen expliciet akkoord zoals bij MKB/zorg) — mogelijk een derde herijkingskandidaat. |
| multiple 3–8× ARR (SaaS) | 🟡 | ARR-multiples voor kleine/mid-market NL SaaS liggen doorgaans lager dan de vaak geciteerde beursgenoteerde SaaS-multiples; 3–8× is een brede, plausibele bandbreedte maar zonder bron. **Let op:** deze wordt bewust NIET als `multipleBasis` gebruikt (de code hanteert de EBITDA-variant) — de ARR-range staat alleen in de `aiNormen`-tekst richting de AI. |
| ARR/MRR-groei >20%, churn <5%, LTV/CAC >3, NPS >30 | 🟡 | Dit zijn gangbare SaaS-vuistregels (breed geciteerd in de sector), geen harde NL-branchebron. Als kwalitatieve richtlijn acceptabel. |

---

## Samengevat — wat moet er gebeuren

1. ✅ **MKB-multiple** — twee herijkingen op 11 sep 2026: eerst naar 4,0–6,0× (verkeerde referentie), zelfde dag teruggezet naar 2,5–4,5× op basis van de echte per-sector Brookz-cijfers (retail 2,5×, horeca 3,3×). Zie hierboven.
2. ✅ **Zorg-multiple** omvangsafhankelijk gemaakt (11 sep 2026, zie hierboven): ≤5 FTE = 1–3× omzet, >5 FTE = 6,0–7,3× EBITDA.
3. **🟡 IT/software-multiple** — bevinding klaarliggend (Brookz IT-diensten 6,7×/Softwareontwikkeling 7,5× vs. de huidige 4–6×), wacht op Marcels beslissing.
4. **🟡 Alle `aiNormen`-tekst** een bronvermelding geven (of "indicatief, geen vastgestelde branchenorm" waar er echt geen bron is). Voor accountancy: koppelen aan de al gebronde DB-benchmark.
5. **Vast kwartaalpunt:** deze tabel opnieuw langslopen (hangt aan de bestaande sjabloon-/benchmark-kwartaalcheck).

## Vangnet dat al werkt
- Een **ontbrekende** multiple-range toont sinds 31 aug een melding i.p.v. een gok (`bekend:false`).
- De AI-prompts zeggen sinds 31 aug: "geen externe benchmark verzinnen als er geen sectornorm staat".
- Het risico dat dit document adresseert is een **aanwezig maar niet-onderbouwd** getal — dat vangt alleen deze inhoudelijke check.

## Bronnen geraadpleegd (31 aug 2026)
- Brookz / Dealsuite Overname Barometer H2-2025 (via Accountancy Vanmorgen / Present Value): gem. MKB-EBITDA-multiple 5,0.
- Brookz branche-informatie fysiotherapie / "zorg & farmacie": EBITDA-multiple ~6,0–7,3× (gem. 6,5×); rekenvoorbeeld fysioketen.
- Bestaande code-bron in het platform zelf: `bedrijfsscan.html` — "289 Nederlandse M&A-advieskantoren, Brookz Overname Barometer"; DB-benchmark `omzet_fte_accountant` bron "Full Finance/Novak 2024-2025".
