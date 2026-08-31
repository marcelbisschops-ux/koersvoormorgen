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
| multiple 2,5–4,5× EBITDA | 🔴 | **De actuele Brookz Overnamebarometer (H2-2025) geeft een gemiddelde MKB-EBITDA-multiple van 5,0** ("hoogste in tien jaar", 291 M&A-advieskantoren, bedrijven €0,5–50 mln omzet). De profielrange loopt van 2,5 (bij de cliff) tot 4,5 (bij de prognose) — de bovengrens ligt daarmee onder het huidige marktgemiddelde. Bewust conservatief kán, maar het is een keuze die je expliciet moet maken, geen "de markt zegt dit". **Aanbeveling:** herijken tegen Brookz per branche, of expliciet als bewust-conservatieve ondergrens documenteren. |
| EBITDA-marge 5–15% (horeca 8–12%, retail 5–10%, handel 6–12%), omzet/FTE €80k–€200k, personeelskosten 25–45%, voorraadomzet >6×/jr | 🟡 | Redelijke bandbreedtes, geen bron. De sub-sector-uitsplitsing (horeca/retail/handel) suggereert precisie die niet is onderbouwd. **Aanbeveling:** één publieke bron per sub-branche (bijv. ABN AMRO/RaboResearch sectorprognoses, CBS), of de uitsplitsing weghalen. |

### Zorg (huisarts/tandarts/fysiotherapie) — `multiple 1–3× OMZET (praktijkwaarde)`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 1–3× omzet | 🔴 | Twee dingen door elkaar: (a) voor een **kleine, eigenaar-gedreven solopraktijk** is "praktijkwaarde ≈ een deel van de jaaromzet" (goodwill + inventaris) een reële, aparte conventie — historisch ~1× voor huisartsengoodwill, al staat dat onder druk. (b) Voor een **grotere praktijk / keten / consolidatietarget** hanteert de markt juist een **EBITDA-multiple**: Brookz "zorg & farmacie" ≈ **6,0–7,3× EBITDA (gem. 6,5×)**. Voorbeeld uit de bron: fysioketen €5 mln omzet, 18% EBITDA → €5,4–6,6 mln ≈ 1,1–1,3× omzet óf ~6–7× EBITDA. De profielrange 1–3× omzet is dus **alleen verdedigbaar voor de kleinste praktijken**, en de bovengrens 3× lijkt te hoog. **Aanbeveling:** ofwel de omzet-multiple beperken tot echt kleine praktijken (met die randvoorwaarde in de tekst), ofwel een omvangsafhankelijke schakelaar (klein = omzet-multiple, groter = EBITDA-multiple). Bron toevoegen. |
| EBITDA-marge 15–25% (huisarts 20–30%), omzet/FTE €60k–€120k | 🟡 | Plausibel; "NZa-tarieven leidend" klopt als kwalitatieve constatering. Geen citaat. |

### IT/software — `multiple 3–8× ARR (SaaS) of 4–6× EBITDA (maatwerk/diensten)`
| Waarde | Status | Toelichting |
|---|---|---|
| multiple 4–6× EBITDA (maatwerk/diensten — de vastgelegde basis) | 🟡 | Plausibel voor een dienstverlenend/maatwerk-softwarebedrijf; geen bron in de code. Redelijk in lijn met bredere MKB-multiples. |
| multiple 3–8× ARR (SaaS) | 🟡 | ARR-multiples voor kleine/mid-market NL SaaS liggen doorgaans lager dan de vaak geciteerde beursgenoteerde SaaS-multiples; 3–8× is een brede, plausibele bandbreedte maar zonder bron. **Let op:** deze wordt bewust NIET als `multipleBasis` gebruikt (de code hanteert de EBITDA-variant) — de ARR-range staat alleen in de `aiNormen`-tekst richting de AI. |
| ARR/MRR-groei >20%, churn <5%, LTV/CAC >3, NPS >30 | 🟡 | Dit zijn gangbare SaaS-vuistregels (breed geciteerd in de sector), geen harde NL-branchebron. Als kwalitatieve richtlijn acceptabel. |

---

## Samengevat — wat moet er gebeuren

1. **🔴 MKB-multiple (2,5–4,5×)** herijken tegen Brookz (gem. 5,0) óf expliciet documenteren als bewust-conservatieve ondergrens. — *Marcels call, hij kent de reden waarom het laag staat.*
2. **🔴 Zorg-multiple (1–3× omzet)** — begrenzen tot kleine praktijken met die randvoorwaarde, of omvangsafhankelijk maken. — *Marcels call + eventueel een zorgadviseur.*
3. **🟡 Alle `aiNormen`-tekst** een bronvermelding geven (of "indicatief, geen vastgestelde branchenorm" waar er echt geen bron is). Voor accountancy: koppelen aan de al gebronde DB-benchmark.
4. **Vast kwartaalpunt:** deze tabel opnieuw langslopen (hangt aan de bestaande sjabloon-/benchmark-kwartaalcheck).

## Vangnet dat al werkt
- Een **ontbrekende** multiple-range toont sinds 31 aug een melding i.p.v. een gok (`bekend:false`).
- De AI-prompts zeggen sinds 31 aug: "geen externe benchmark verzinnen als er geen sectornorm staat".
- Het risico dat dit document adresseert is een **aanwezig maar niet-onderbouwd** getal — dat vangt alleen deze inhoudelijke check.

## Bronnen geraadpleegd (31 aug 2026)
- Brookz / Dealsuite Overname Barometer H2-2025 (via Accountancy Vanmorgen / Present Value): gem. MKB-EBITDA-multiple 5,0.
- Brookz branche-informatie fysiotherapie / "zorg & farmacie": EBITDA-multiple ~6,0–7,3× (gem. 6,5×); rekenvoorbeeld fysioketen.
- Bestaande code-bron in het platform zelf: `bedrijfsscan.html` — "289 Nederlandse M&A-advieskantoren, Brookz Overname Barometer"; DB-benchmark `omzet_fte_accountant` bron "Full Finance/Novak 2024-2025".
