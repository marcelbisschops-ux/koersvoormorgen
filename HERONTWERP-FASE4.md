# Herontwerp Koers voor Morgen — FASE 4: visueel systeem

Opgesteld 1 sep 2026. Bouwt voort op FASE 1–3 (IA + copy + UX per pagina, alle akkoord) en
`HERONTWERP-FASE4-GRADE.md` (fotografie-grade). Dit document legt het **visuele systeem** vast:
kleur, typografie, ruimte, componenten, de "lijn van koers", motion en het licht/donker-ritme.

Gerenderde versie (de proef + de CSS-bron om uit te kopiëren): **styleguide-artifact**
`https://claude.ai/code/artifact/` → zie het bericht bij oplevering.

Merkgevoel (FASE 1 §2, Marcel 1 sep): **senior · premium · dynamisch** — niet senior + statisch +
corporate. Eén ervaren stem, rustig, scherp. Geen buzzwords, geen AI-default-look
(cream+serif+terracotta, acid-green pop, paars-blauw gradient, alles gecentreerd, `rounded-lg`
overal).

---

## 1. Kleur

### 1.1 Uitgangspunt
De site werkt met **drie oppervlakken** die elkaar afwisselen — niet met één licht/donker-thema.
Elk oppervlak heeft z'n eigen tekst- en lijn-tokens. Het ritme (§7) bepaalt welke sectie welk
oppervlak krijgt.

| Oppervlak | Rol | Grond |
|---|---|---|
| **Nachtblauw** (`--s-dark`) | opening, afsluiting, autoriteit | `#0d1b2a` |
| **Warm off-white** (`--s-light`) | leeswerk, uitleg, rust | `#f6f2ea` |
| **Petrol** (`--s-petrol`) | statement, CTA, één gedachte per keer | `#20423d` |

### 1.2 Tokens (definitief)

```css
:root{
  /* oppervlakken */
  --s-dark:#0d1b2a;      /* nachtblauw            */
  --s-light:#f6f2ea;     /* warm off-white        */
  --s-petrol:#20423d;    /* diep petrol           */
  --s-light-2:#efe9dc;   /* off-white, ingezakt (kaarten op licht) */
  --s-dark-2:#132534;    /* nachtblauw, opgetild (kaarten op donker) */

  /* accent */
  --petrol:#3d6b63;      /* accent op licht       */
  --petrol-bright:#5e9b8f;/* accent op donker/petrol */
  --gold:#c49a4a;        /* spaarzaam, 2e accent  */

  /* tekst op licht */
  --ink:#16232e;         /* koppen                */
  --body:#33414c;        /* lopende tekst         */
  --muted:#5f7180;       /* bijschrift / meta     */
  --hair:#d9d2c4;        /* lijn / rand op licht  */

  /* tekst op donker + petrol */
  --ink-d:#f4f1e9;       /* koppen op donker      */
  --body-d:#c6d2da;      /* tekst op donker       */
  --muted-d:#8ba0ae;     /* meta op donker        */
  --hair-d:#24384a;      /* lijn / rand op donker */
  --hair-p:#3c5f59;      /* lijn / rand op petrol */

  /* semantisch — los van het accent, alleen in de UI/product */
  --ok:#3d6b63;
  --warn:#b8862f;
  --bad:#b0554a;

  /* de lijn van koers */
  --koerslijn:#5e9b8f;
}
```

**Neutralen zijn niet grijs maar licht petrol/navy-gebogen** (`--muted`, `--hair`) — bewust
gekozen, niet geërfd.

### 1.3 Viewer-thema
De publieke site is **licht-eerst**: bare `:root` = de lichte chrome (nav, footerranden buiten de
donkere secties, juridische pagina's). Onder `@media (prefers-color-scheme: dark)` +
`:root[data-theme="dark"]` verschuift alleen de *chrome* naar nachtblauw — de dark- en
petrol-*secties* blijven altijd zoals ze zijn, op elk viewer-thema. `body` krijgt altijd een
expliciete `background` uit een token.

### 1.4 Contrast
Alle tekst-op-grond ≥ AA (4.5:1 body, 3:1 grote koppen). `--body` op `--s-light` = 9.8:1;
`--body-d` op `--s-dark` = 9.1:1; `--ink-d` op `--s-petrol` = 8.4:1. Petrol-accent als tekst
alleen groot/bold. De huisstijl-kleur van een adviseur draait door de bestaande
`contrastveiligeHuisstijlkleur`-check (platform, niet de marketingsite).

---

## 2. Typografie

### 2.1 Families (definitief)

| Rol | Font | Fallback | Gebruik |
|---|---|---|---|
| Display / koppen | **Newsreader** (Google Fonts, opsz 6–72, 400 + 500) | `Georgia, 'Times New Roman', serif` | h1–h3, pull quotes, grote cijfers |
| Tekst / UI | **Inter** (400 / 500 / 600) | `-apple-system, system-ui, 'Segoe UI', sans-serif` | body, labels, knoppen, tabellen, nav |

Newsreader draagt de senioriteit: redactioneel, optische groottes, geen mode-display zoals DM
Serif Display. Eén serif voor gezag, één sans voor helderheid — meer niet.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600&display=swap">
```

### 2.2 Schaal (modulair, ~1.24, basis 17px)

| Token | rem | px | Gebruik |
|---|---|---|---|
| `--fs-xs` | 0.78 | 13 | meta, breadcrumb, labels |
| `--fs-sm` | 0.9 | 15 | bijschrift, kleine UI |
| `--fs-base` | 1.0625 | 17 | lopende tekst |
| `--fs-md` | 1.32 | 21 | intro/lead, grote body |
| `--fs-lg` | 1.63 | 26 | h3 |
| `--fs-xl` | 2.1 | 34 | h2 |
| `--fs-2xl` | 2.75 | 44 | h1 (binnenpagina) |
| `--fs-hero` | clamp(2.4rem, 6vw, 4rem) | — | homepage-hero |

- Lopende tekst: `line-height:1.62`, `max-width:65ch`.
- Koppen: `line-height:1.12`, `text-wrap:balance`, Newsreader 400 (500 alleen voor korte labels
  in serif).
- Uppercase labels (eyebrow, roltype, breadcrumb): Inter 600, `letter-spacing:.14em`,
  `--fs-xs`.
- Grote cijfers in de bewijsstrip: Newsreader 400, `font-variant-numeric:tabular-nums`.

---

## 3. Ruimte & grid

- **Spatiëring-schaal** (rem): 0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4 · 6 · 8. Alles hiermee.
- **Contentbreedte:** `--w-text:66ch` (leeswerk) · `--w-wide:1180px` (secties) · `--w-full:1400px`
  (hero-beeld/full-bleed).
- **Sectiepadding:** verticaal `clamp(4rem, 9vw, 8rem)`, horizontaal `clamp(1.25rem, 5vw, 3rem)`.
- **Layout:** flex/grid + `gap`, nooit losse marges die stapelen. Eén kolom die op desktop
  *verbreedt*, niet *herschikt* (FASE 3 §0.7). Asymmetrie mag — tekstkolom links, beeld dat
  rechts buiten de contentbreedte doorloopt.
- Radii: `--r-sm:6px` (labels, inputs) · `--r-md:10px` (kaarten) · `--r-lg:14px` (beeldframes).
  Niet overal ronden; knoppen `--r-sm`.

---

## 4. Componenten

### 4.1 Knoppen
| Variant | Op licht | Op donker / petrol |
|---|---|---|
| **Primair** | vulling `--petrol`, tekst `--s-light`, hover: `translateY(-2px)` + iets donkerder | vulling `--petrol-bright`, tekst `--s-dark` |
| **Secundair** | rand 1px `--ink`, tekst `--ink`, hover: vulling `--ink` + tekst licht | rand 1px `--ink-d`, tekst `--ink-d`, hover invert |
| **Ghost/tekst** | tekst `--petrol` + onderlijn die op hover van links naar rechts groeit | tekst `--petrol-bright` idem |

Één primaire knop per scherm (FASE 3 §10) — behalve de homepage-hero (twee gelijkwaardige
routekaarten). Padding `0.8rem 1.4rem`, `--fs-sm`, Inter 600. Focus: 2px outline `--koerslijn`
met 2px offset, altijd zichtbaar.

### 4.2 Kaart
`background:--s-light-2` (op licht) / `--s-dark-2` (op donker), rand 1px `--hair`/`--hair-d`,
`--r-md`, padding `1.5rem`. Hover (waar klikbaar): `translateY(-3px)` + randkleur naar `--petrol`,
160ms. Geen slagschaduw-stapels; hooguit één zachte `0 12px 30px rgba(9,18,26,.10)`.

### 4.3 Routekaart (homepage-hero) — de twee proposities
Twee gelijk-gewogen kaarten naast elkaar (desktop) / onder elkaar (mobiel, zelfde volgorde).
Elk: eyebrow (PLATFORM / M&A EXPERTISE), 1 regel doelgroep (Newsreader), 2 regels propositie
(Inter), ghost-CTA. Bovenrand 2px `--koerslijn`. Hover: hele kaart licht op, CTA-onderlijn groeit.

### 4.4 Pull quote
Newsreader 400, `--fs-lg`, `max-width:24ch`, met links een verticaal stukje **lijn van koers**
(2px `--koerslijn`, hoogte = tekst). Attributie in `--fs-xs` uppercase `--muted`.

### 4.5 Roltype-label (cases, FASE 3 §6)
Pill, `--fs-xs`, Inter 600, `letter-spacing:.12em`, `--r-sm`, `padding:.2rem .6rem`:
- **Platform-case** — rand + tekst `--petrol`, vulling `--petrol` @ 10%.
- **M&A Expertise-case** — rand + tekst `--gold`, vulling `--gold` @ 10%.
- **Combinatiecase** — split: half petrol, half gold rand.

### 4.6 Breadcrumb
`Platform › Dataroom & fases` — `--fs-xs`, Inter 600 uppercase `letter-spacing:.12em`, scheiding
`›` in `--muted`, laatste item `--ink`/`--ink-d` zonder link.

### 4.7 Bewijsstrip
Rij van 3–5 blokken: groot cijfer (Newsreader, tabular-nums) + 1 regel label (`--fs-sm`
`--muted`). Op `--s-light` terughoudend, geen omlijning; scheiding met dunne verticale
`--koerslijn` @ 30%. Inhoud: `20+` · `€60 mln` · `~30 jaar` · `KPMG` · `Referenties op aanvraag`.

### 4.8 Procesvisualisatie — Doorzien → Beslissen → Realiseren
Horizontale **lijn van koers** met drie knopen. Onder elke knoop: label (Newsreader `--fs-lg`) +
1 regel (`--fs-sm`) + wie/wat (Platform / Marcel). Op de homepage mogen de zes fijnere stappen
(vraagstuk/richting/besluit/regie/realisatie/resultaat) als kleine tussenlabels op de lijn.
Mobiel: de lijn wordt verticaal, knopen onder elkaar.

### 4.9 Formulier (contact)
Labels boven het veld (nooit placeholder-als-label — bestaande harde regel). Velden: rand 1px
`--hair`, focus rand `--petrol` + 2px ring `--koerslijn` @ 30%. Eén kolom. Verzendknop = primair.
Privacyverklaring-link direct bij de knop.

---

## 5. De lijn van koers (grafisch motief)

Eén dunne petrolkleurige lijn (`--koerslijn`, **1.5px** desktop / 1px mobiel) die door de site
loopt. Betekenisdrager, geen decoratie (FASE 3 "structuur is informatie").

**Toepassingen:**
1. **Sectie-overgang** — de lijn loopt horizontaal over de naad tussen twee secties, met op één
   punt een lichte knik of knoop (een keuze-moment). Subtiel, niet elke overgang.
2. **Procesvisualisatie** (§4.8) — de lijn is de ruggengraat; knopen = fasen.
3. **Pull quote** (§4.4) — kort verticaal segment.
4. **Case-tijdlijn** en **loopbaan-tijdlijn** (Over Marcel) — verticale lijn met knopen per stap.
5. **Hero** — optioneel als één subtiele overlay-lijn die de horizon/weg in het beeld volgt
   (alleen waar het beeld het draagt; niet forceren).

**Techniek:** SVG `<path>` met `stroke:var(--koerslijn)`, `stroke-width:1.5`, `fill:none`,
`stroke-linecap:round`. Knoop = `<circle r="4">` gevuld met de grond-kleur + 1.5px rand
`--koerslijn`. Scroll-tekening: `stroke-dasharray` = padlengte, `stroke-dashoffset` animeert van
padlengte → 0 wanneer de sectie in beeld komt (IntersectionObserver, `threshold:.2`). Onder
`prefers-reduced-motion: reduce` → lijn staat meteen volledig getekend, geen animatie.

**Niet:** kompas, vuurtoren, zeilboot, pijl-iconen. De lijn zelf is het symbool.

---

## 6. Motion

Gated in `@media (prefers-reduced-motion: no-preference)`. "Geen animatie om de animatie."

| Wat | Hoe | Duur / easing |
|---|---|---|
| Scroll-reveal | `opacity:0→1` + `translateY(14px→0)` bij in-beeld-komen; per grid max 4 kinderen gestagger (`60ms` step) | 500ms `cubic-bezier(.2,.6,.2,1)` |
| Hero bij laden | eyebrow → h1 → sub → routekaarten, elk 80ms na de vorige, zelfde reveal | 600ms |
| Lijn van koers | `stroke-dashoffset` → 0 | 900ms `ease-out`, start bij `threshold:.2` |
| Kaart / knop hover | `translateY(-2 à -3px)` + randkleur | 160ms `ease` |
| Nav-link | onderlijn `scaleX(0→1)` van links | 200ms `ease` |
| `.section-head h2::after` | groeiende gouden lijn (40px→64px) bij reveal | meelopend met reveal |

Geen parallax, geen auto-carrousels, geen scroll-jacking. Alles werkt zonder JS (reveal-state
default zichtbaar als `IntersectionObserver` ontbreekt).

---

## 7. Licht/donker-ritme per pagina

Patroon: **open donker → wissel → petrol voor het statement → sluit donker.** Nooit twee
identieke opeenvolgende oppervlakken.

| Pagina | Ritme (secties) |
|---|---|
| **Homepage** | dark (hero) · light (herkenning) · light→petrol (twee proposities) · dark (Doorzien→Beslissen→Realiseren) · light (cases/bewijs) · light (bedrijfsscan) · dark (over Marcel) · petrol (eind-CTA) · dark (footer) |
| **`/platform` + subpagina's** | dark (kop) · light (feature-secties) · dark (AI-signalen / herleidbaarheid) · light (proces) · petrol (voet-CTA "Zelf uitproberen") · dark (footer) |
| **`/bedrijfsscan`** | dark (kop) · light (voor wie / wat de scan doet / wat je krijgt) · petrol (start-CTA) · light ("en daarna") · dark (footer) |
| **`/m-en-a-expertise` + subpagina's** | dark (kop + bewijsstrip) · light (herkenning + aanpak) · dark (het model / relevante case) · petrol (voet-CTA "Even sparren?") · dark (footer) |
| **`/over-marcel`** | dark (kop + portret) · light (hoe ik werk + kernervaring) · dark (cijfers + loopbaan-tijdlijn) · light (sectoren + "ik bouwde ook het platform") · petrol (CTA) · dark (footer) |
| **`/cases` + detail** | dark (kop) · light (kaarten / case-body) · petrol (CTA) · dark (footer) |
| **`/inzichten` + artikel** | light (grotendeels leeswerk) · dark (auteur-blok + CTA) · dark (footer) |
| **`/contact`** | dark, één oppervlak — rust (FASE 3 §8) · dark (footer) |

De **footer** is overal `--s-dark`, identiek, met de twee sporen als aparte kolommen.

---

## 8. Toegankelijkheid & performance (herhaald uit FASE 3 §10, hier bindend)

- Contrast AA; zichtbare focus (`--koerslijn` outline) op alle interactieve elementen;
  semantische koppenhiërarchie; alt op alle beelden; `prefers-reduced-motion` overal
  gerespecteerd.
- Beelden `webp`/`avif`, `width`/`height` gezet, `loading="lazy"` onder de vouw,
  `font-display:swap`. Geen externe scripts behalve (indien gekozen) privacy-vriendelijke
  analytics. Bodybreedte scrollt nooit horizontaal; brede tabellen/diagrammen in
  `overflow-x:auto`.

---

## 9. Wat FASE 5–6 hierna oppakt
- **FASE 5 (SEO & techniek):** definitieve URL's (`/m-en-a-expertise/…`), `title`/`meta`/`H1` per
  pagina, schema (`Person` / `SoftwareApplication` / `FAQ`), interne-linkmatrix, redirectlijst van
  elke huidige `.html`.
- **FASE 6 (conversie):** per pagina primaire + secundaire CTA + microconversie meetbaar maken,
  CTA-teksten per context (FASE 3 §11), formulier- + bedanktflow, analytics-/cookie-keuze.
- **Bouw:** de nieuwe pagina's, met de styleguide-CSS als basis. Eén wijziging tegelijk, per
  pagina getest (werkregel 1/3).
