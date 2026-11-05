// KVM Design 2.0 R0 (N-174): deterministische controles zonder browser of netwerk.
// 1) schakelaar: aan/uit per host en per keuze, nooit aan op het productiedomein;
// 2) k2-hulpfuncties: escaping, statussen, geen verzonnen termijn (besluit 2);
// 3) contrast van de tekst/achtergrond-tokens (licht en donker) ≥ 4,5:1;
// 4) alle regels in kvm-design2.css staan onder html[data-ui="2"] (zonder schakelaar geen effect).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
let ok = 0, fout = 0;
const check = (n, v, d) => { if (v) { ok++; console.log('PASS ' + n); } else { fout++; console.log('FAIL ' + n + (d ? ' (' + d + ')' : '')); } };

// 1 — schakelaar
const SCH = fs.readFileSync(path.join(ROOT, 'assets/kvm-ui-schakelaar.js'), 'utf8');
function draai(host, search, opgeslagen, opslagKapot) {
  const attrs = {}, store = opgeslagen ? { 'kvm-ui': opgeslagen } : {};
  const ls = opslagKapot ? { getItem() { throw Error('geblokkeerd'); }, setItem() { throw Error('geblokkeerd'); } }
    : { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  vm.runInNewContext(SCH, { location: { hostname: host, search }, localStorage: ls, URLSearchParams, document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } } });
  return { aan: attrs['data-ui'] === '2', store };
}
check('preview ?ui=2 zet aan', draai('abc.kantoorinzicht-frontend.pages.dev', '?ui=2').aan);
check('preview zonder keuze blijft uit', !draai('abc.kantoorinzicht-frontend.pages.dev', '').aan);
check('opgeslagen keuze 2 blijft aan', draai('localhost', '', '2').aan);
check('?ui=1 zet terug naar uit en bewaart dat', (() => { const r = draai('localhost', '?ui=1', '2'); return !r.aan && r.store['kvm-ui'] === '1'; })());
check('productie koersvoormorgen.nl: ?ui=2 doet niets', !draai('koersvoormorgen.nl', '?ui=2', '2').aan);
check('productie www.koersvoormorgen.nl: ?ui=2 doet niets', !draai('www.koersvoormorgen.nl', '?ui=2', '2').aan);
check('productie: niets opgeslagen', Object.keys(draai('koersvoormorgen.nl', '?ui=2').store).length === 0);
check('lijkende host nepkoersvoormorgen.nl telt niet als productie', draai('nepkoersvoormorgen.nl', '?ui=2').aan);
check('geblokkeerde opslag: ?ui=2 werkt alleen voor deze pagina, geen fout', draai('localhost', '?ui=2', null, true).aan);
check('onbekende waarde ?ui=9 laat uit', !draai('localhost', '?ui=9').aan);

// 2 — hulpfuncties
const k2 = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/kvm-design2.js'), 'utf8'), { window: k2 });
const r1 = k2.k2TaakRij({ label: 'Taak <b>x</b>', status: 'bezig', eigenaar: 'verkoper' });
check('taak escapet label', r1.includes('Taak &lt;b&gt;x&lt;/b&gt;') && !r1.includes('<b>x'));
check('taak zonder termijn: geen termijncel en geen termijnklasse', !r1.includes('k2-taak__termijn') && !r1.includes('met-termijn'));
check('taak toont eigenaar Verkoper en status Bezig', r1.includes('>Verkoper<') && r1.includes('>Bezig<'));
const r2 = k2.k2TaakRij({ label: 'T', status: 'open', eigenaar: 'begeleider', termijn: '2026-11-20' });
check('taak met geldige backendtermijn toont termijn', r2.includes('k2-taak__termijn') && /20 nov/.test(r2));
for (const slecht of ['', 'binnenkort', '20-11-2026', null, 0, '2026-13-45']) {
  const r = k2.k2TaakRij({ label: 'T', status: 'open', termijn: slecht });
  check('ongeldige termijn ' + JSON.stringify(slecht) + ' wordt niet getoond', !r.includes('k2-taak__termijn'));
}
check('onbekende status wordt neutraal label', k2.k2StatusChip('raar').includes('>raar<'));
check('voortgang 5/9 = 56%', k2.k2Voortgang(5, 9).includes('aria-valuenow="56"'));
check('voortgang zonder geheel geeft niets', k2.k2Voortgang(3, 0) === '');
check('kpi escapet', k2.k2Kpi('<x>', '1', '"y"').includes('&lt;x&gt;') && k2.k2Kpi('a', '1', '"y"').includes('&quot;y&quot;'));

// 3 — contrast
const CSS = fs.readFileSync(path.join(ROOT, 'assets/kvm-design2.css'), 'utf8');
function tokens(blok) { const t = {}; for (const m of blok.matchAll(/--(k2-[a-z0-9-]+):(#[0-9A-Fa-f]{6})/g)) t[m[1]] = m[2]; return t; }
const licht = tokens(CSS.split('/* 1b')[0]);
const donker = { ...licht, ...tokens(CSS.split('/* 1b')[1].split('/* 2')[0]) };
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const paren = [['k2-tekst', 'k2-vlak'], ['k2-tekst', 'k2-bg'], ['k2-tekst-2', 'k2-vlak'], ['k2-tekst-3', 'k2-vlak'], ['k2-tekst-3', 'k2-vlak-2'], ['k2-tekst-3', 'k2-bg'], ['k2-accent', 'k2-vlak'], ['k2-accent-sterk', 'k2-vlak'], ['k2-info', 'k2-vlak'], ['k2-let', 'k2-vlak'], ['k2-fout', 'k2-vlak'], ['k2-nav-tekst', 'k2-nav']];
for (const [naam, set] of [['licht', licht], ['donker', donker]]) for (const [v, a] of paren) {
  if (!set[v] || !set[a]) { check(naam + ' ' + v + '/' + a + ' aanwezig', false); continue; }
  const r = ratio(set[v], set[a]); check(naam + ' contrast ' + v + ' op ' + a + ' = ' + r.toFixed(2), r >= 4.5);
}
// chips: tekstkleur op eigen vlak (licht; donker vlakken zijn transparant en niet zinvol in hex te toetsen)
for (const [v, a] of [['k2-accent-sterk', 'k2-accent-vlak'], ['k2-info', 'k2-info-vlak'], ['k2-let', 'k2-let-vlak'], ['k2-fout', 'k2-fout-vlak'], ['k2-neutraal', 'k2-neutraal-vlak']]) {
  const r = ratio(licht[v], licht[a]); check('licht chip ' + v + ' op ' + a + ' = ' + r.toFixed(2), r >= 4.5);
}
check('witte tekst op primaire knop (nav) ≥ 4,5', ratio('#FFFFFF', licht['k2-nav']) >= 4.5);

// 4 — elke selector onder html[data-ui="2"]
const zonderCommentaar = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = [];
zonderCommentaar.replace(/([^{}]+)\{/g, (m, s) => { s = s.trim(); if (s && !s.startsWith('@') && !/^(from|to|\d)/.test(s)) selectors.push(s); return m; });
const los = selectors.flatMap((s) => s.split(',')).map((s) => s.trim()).filter((s) => s && !s.startsWith('html[data-ui="2"]'));
check('alle ' + selectors.length + ' regels gescopet op html[data-ui="2"]', los.length === 0, los.slice(0, 5).join(' | '));

console.log((fout ? '❌ ' : '✅ ') + ok + '/' + (ok + fout));
process.exit(fout ? 1 : 0);
