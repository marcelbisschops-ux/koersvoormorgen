#!/usr/bin/env node
// Audit-fix P1 (5 sep 2026): de --muted-kleurtoken is sinds 19 augustus al drie keer "gefixt" met een
// nieuwe hex-waarde, maar telkens maar tegen ÉÉN achtergrond gecontroleerd — niet tegen alle
// surface-tokens waar de tekstkleur ook daadwerkelijk op gebruikt wordt (--card/--panel naast de
// hoofdachtergrond). Dit script rekent élke combinatie automatisch na (WCAG AA, 4.5:1 voor normale
// tekst) i.p.v. handmatig één achtergrond te checken per fix-poging.
//
// Config hieronder: per bestand welke CSS-variabelen "tekst" zijn en welke "oppervlak" — voor elk
// bestand met dit design-systeem (mna.html/adv.html/marilyn.html/matching-platform.html delen er een,
// assets/kvm.css heeft een eigen, kleinere set). Nieuw bestand met hetzelfde patroon? Toevoegen aan
// FILES hieronder.

import fs from 'fs';

function lum(hex) {
  hex = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [rl, gl, bl] = [r, g, b].map(f);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrast(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Haalt --naam:#hex uit een CSS-tekstblok (root-block als string).
function extractVars(block, names) {
  const out = {};
  for (const n of names) {
    const m = block.match(new RegExp('--' + n + '\\s*:\\s*(#[0-9a-fA-F]{3,6})'));
    if (m) out[n] = m[1].length === 4
      ? '#' + [...m[1].slice(1)].map(c => c + c).join('')
      : m[1];
  }
  return out;
}

const AA_NORMAAL = 4.5;

const FILES = [
  {
    pad: 'mna.html', tekstVars: ['muted', 'mid', 'sub'], surfaceVars: ['void', 'panel', 'card'],
    // licht = het eerste :root{...}-blok, donker = het blok binnen @media(prefers-color-scheme:dark)
  },
  { pad: 'adv.html', tekstVars: ['muted', 'mid', 'sub'], surfaceVars: ['void', 'panel', 'card'] },
  { pad: 'marilyn.html', tekstVars: ['muted', 'mid', 'sub'], surfaceVars: ['void', 'panel', 'card'] },
  { pad: 'matching-platform.html', tekstVars: ['muted', 'mid'], surfaceVars: ['void', 'panel', 'card'] },
  // kvm.css heeft geen prefers-color-scheme-toggle voor deze tokens — "tekst op licht" en "tekst op
  // donker" zijn twee losse, expliciet benoemde token-sets in hetzelfde :root-blok (geen swap), dus
  // hier als twee aparte paren i.p.v. kruislings alles-op-alles.
  { pad: 'assets/kvm.css', tekstVars: ['muted', 'body', 'ink'], surfaceVars: ['s-light', 's-light-2'] },
  { pad: 'assets/kvm.css', tekstVars: ['muted-d', 'body-d', 'ink-d'], surfaceVars: ['s-dark'] },
];

let fouten = 0, checks = 0;

for (const { pad, tekstVars, surfaceVars } of FILES) {
  if (!fs.existsSync(pad)) { console.log('⊘ ' + pad + ' niet gevonden, overgeslagen'); continue; }
  const inhoud = fs.readFileSync(pad, 'utf8');

  // Licht = het eerste :root{...} blok (buiten een @media-blok).
  const lichtMatch = inhoud.match(/:root\s*\{([^}]*)\}/);
  const donkerMatch = inhoud.match(/prefers-color-scheme:\s*dark\s*\)\s*\{\s*:root\s*\{([^}]*)\}/)
    || inhoud.match(/:root\[data-theme=["']dark["']\]\s*\{([^}]*)\}/);

  for (const [modus, blokMatch] of [['licht', lichtMatch], ['donker', donkerMatch]]) {
    if (!blokMatch) continue;
    const tekst = extractVars(blokMatch[1], tekstVars);
    const surfaces = extractVars(blokMatch[1], surfaceVars);
    for (const [tNaam, tHex] of Object.entries(tekst)) {
      for (const [sNaam, sHex] of Object.entries(surfaces)) {
        checks++;
        const c = contrast(tHex, sHex);
        if (c < AA_NORMAAL) {
          fouten++;
          console.log('✗ ' + pad + ' (' + modus + '): --' + tNaam + ' ' + tHex + ' op --' + sNaam + ' ' + sHex
            + ' → ' + c.toFixed(2) + ':1 (onder ' + AA_NORMAAL + ':1)');
        }
      }
    }
  }
}

console.log('');
if (fouten === 0) {
  console.log('✓ Alle ' + checks + ' tekst/oppervlak-combinaties halen WCAG AA (4.5:1).');
  process.exit(0);
} else {
  console.log('✗ ' + fouten + ' van ' + checks + ' combinaties onder de AA-grens.');
  process.exit(1);
}
