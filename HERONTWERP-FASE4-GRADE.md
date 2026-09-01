# Herontwerp Koers voor Morgen — FASE 4: fotografie-grade (vaste preset)

Opgesteld 1 sep 2026. Dit is de **vaste beeldgrade** voor alle fotografie op de site. Vastgelegd
op basis van de scripts waarmee de zes hero-beelden zijn gemaakt
(`~/Desktop/kvm-hero-beelden/grade.py`, `grade_v2_outliers.py`, `grade_portret.py`).
Doel: elk beeld lijkt uit dezelfde filmische wereld te komen — koeler, rustiger, iets donkerder
dan standaard corporate, met warm licht behouden waar het de lichtbron is.

## Basispreset (landschap / architectuur / infrastructuur)

Toe te passen in deze volgorde:

| Stap | Bewerking | Waarde |
|---|---|---|
| 1 | Rood-kanaal | × 0.96 |
| 2 | Blauw-kanaal | × 1.05 |
| 3 | Koele schaduwen | in de donkere tonen: rood −6, blauw +4 (masker = (255−luma)/255 × 12) |
| 4 | Verzadiging | × 0.86 (−14 %) |
| 5 | Contrast (S-curve) | × 1.06 |
| 6 | Helderheid | × 1.00 |
| 7 | Zwart/witpunt herstellen | autocontrast, clip 0.4 % |

**Lightroom-vertaling (richtwaarden):** Temp −8 tot −12 · Tint +2 · Vibrance −10 · Saturation −6 ·
Contrast +8 · Blacks +4 met een koele split-tone in de schaduwen · Highlights −5.
**CSS-benadering (voor niet-kritische decoratieve beelden):**
`filter: saturate(.86) contrast(1.06) brightness(1) hue-rotate(-4deg);` + een subtiele
`box-shadow inset` of overlay `rgba(13,27,42,.06)` voor de koele schaduw.

## Sterke variant (warme bronbeelden — bijv. gouden-uur landschap)

Voor beelden die na de basispreset nog te warm/bont zijn (slot 1 was dit):

| Stap | Bewerking | Waarde |
|---|---|---|
| 0 | Highlights temmen | alles boven waarde 200 comprimeren met factor 0.6 richting 200 |
| 1 | Rood-kanaal | × 0.82 |
| 2 | Blauw-kanaal | × 1.16 |
| 3 | Koele schaduwen | rood −7, blauw +6 (masker-amount 16) |
| 4 | Verzadiging | × 0.66 (bijna monochroom-koel) |
| 5 | Contrast | × 1.10 |
| 6 | Helderheid | × 0.96 |
| 7 | Autocontrast | clip 0.5 % |

Warmte rond een zichtbare zon blijft — dat is de lichtbron zelf, niet te verhelpen zonder het
beeld kapot te maken.

## Portret (slot 6 en toekomstige portretten)

Zachter dan de basis; **huid mag warm blijven**, alleen de achtergrond koelt mee.

| Stap | Bewerking | Waarde |
|---|---|---|
| 1 | Koele schaduwen | rood −3, blauw +3 (masker-amount 6) — heel subtiel |
| 2 | Verzadiging | × 0.93 |
| 3 | Contrast | × 1.045 |
| 4 | Autocontrast | clip 0.3 % |
| 5 | Uitsnede | 4:5, hoofd bovenin houden |

## Vaste uitsnedes (hele site)

| Gebruik | Ratio | Croppositie |
|---|---|---|
| Hero | 16:9 (of 21:9) | midden; bij weinig lucht iets boven het midden (bias 0.42) |
| Contentbeeld | 4:3 | midden |
| Portret | 4:5 | hoofd bovenin |

## Toepassing

- **Elk** stockbeeld door de basispreset; warme uitschieters door de sterke variant.
- Productscreenshots krijgen **geen** foto-grade — die zijn al op-palet (nachtblauw/petrol).
- Eén keer instellen als Lightroom-preset / LUT / Capture One-stijl en op alles toepassen;
  de scripts in `~/Desktop/kvm-hero-beelden/` zijn de referentie-implementatie.
- Bronbestanden + gegradeerde versies + `CREDITS.txt`: `~/Desktop/kvm-hero-beelden/`.
