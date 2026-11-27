// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-016: kantooralias kiest staging + kantoorhuisstijl; koersvoormorgen.nl blijft ongewijzigd.
// Draai: node tests/kvm016-kantoorhuisstijl.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { kantoorRoute, kantoorVoorHost } from '../functions/_middleware.js';

let ok = 0, fail = 0;
const check = (n, v) => { v ? ok++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n); };
const PROD = 'https://kantoorinzicht.marcel-bisschops.workers.dev', STAGING = 'https://kantoorinzicht-staging.marcel-bisschops.workers.dev';
const MAES = 'maes.kantoorinzicht-frontend.pages.dev';

// 1. mna: kvmKiesWorker uit mna/01
const m01 = readFileSync(new URL('../mna/01-config-sectorprofielen.js', import.meta.url), 'utf8');
const fnSrc = m01.slice(m01.indexOf('function kvmKiesWorker'), m01.indexOf('\n}', m01.indexOf('function kvmKiesWorker')) + 2);
const ctx = {}; vm.runInNewContext(fnSrc + ';this.k=kvmKiesWorker;', ctx);
check('mna: MaeS-alias → staging', ctx.k(MAES, null) === STAGING);
check('mna: MaeS-alias met ?worker=productie → toch staging', ctx.k(MAES, PROD) === STAGING);
check('mna: koersvoormorgen.nl → productie', ctx.k('koersvoormorgen.nl', null) === PROD);

// 2. adv: exacte WORKER-regels uit adv.html in een sandbox
const adv = readFileSync(new URL('../adv.html', import.meta.url), 'utf8');
const s = adv.indexOf('var _WORKER_WHITELIST='), e = adv.indexOf('\n', adv.indexOf('var WORKER=', s));
const advSrc = adv.slice(s, e);
const advWorker = (host, search) => { const c = { location: { hostname: host, search }, URLSearchParams }; vm.runInNewContext(advSrc + ';this.W=WORKER;', c); return c.W; };
check('adv: MaeS-alias → staging', advWorker(MAES, '') === STAGING);
check('adv: MaeS-alias met ?worker=productie → toch staging', advWorker(MAES, '?worker=' + encodeURIComponent(PROD)) === STAGING);
check('adv: koersvoormorgen.nl → productie', advWorker('koersvoormorgen.nl', '') === PROD);
check('adv: koersvoormorgen.nl ?worker=staging → staging (ongewijzigd)', advWorker('koersvoormorgen.nl', '?worker=' + encodeURIComponent(STAGING)) === STAGING);
check('adv: koersvoormorgen.nl ?worker=onbekend → productie (whitelist ongewijzigd)', advWorker('koersvoormorgen.nl', '?worker=https://evil.example') === PROD);
check('adv: localhost zonder param → productie (ongewijzigd)', advWorker('localhost', '') === PROD);

// 3. middleware-routering
check('host MaeS → kantoor maes', kantoorVoorHost(MAES) === 'maes' && kantoorVoorHost('MAES.kantoorinzicht-frontend.pages.dev') === 'maes');
check('koersvoormorgen.nl → geen kantoor', kantoorVoorHost('koersvoormorgen.nl') === null);
check('onbekende alias → geen kantoor', kantoorVoorHost('preview.kantoorinzicht-frontend.pages.dev') === null);
check('MaeS: / → inlogpagina adv.html', JSON.stringify(kantoorRoute(MAES, '/')) === JSON.stringify({ soort: 'redirect', naar: '/adv.html' }));
check('MaeS: huisstijl.css → kantoorbestand', kantoorRoute(MAES, '/assets/kantoorhuisstijl.css').pad === '/assets/kantoren/maes/huisstijl.css');
check('MaeS: eigen kantoormap bereikbaar', kantoorRoute(MAES, '/assets/kantoren/maes/logo.svg').soort === 'door');
check('MaeS: map van ander kantoor geblokkeerd', kantoorRoute(MAES, '/assets/kantoren/ander/logo.svg').soort === 'blok');
check('MaeS: adv.html/mna.html gewoon door', kantoorRoute(MAES, '/adv.html').soort === 'door' && kantoorRoute(MAES, '/mna.html').soort === 'door');
for (const p of ['/assets/kantoren/maes/logo.svg', '/assets/kantoren/maes/huisstijl.css', '/ASSETS/Kantoren/maes/logo.svg', '/assets/%6Bantoren/maes/logo.svg', '//assets/kantoren/maes/logo.svg', '/assets/kantoren'])
  check('koersvoormorgen.nl: ' + p + ' geblokkeerd', kantoorRoute('koersvoormorgen.nl', p).soort === 'blok');
check('koersvoormorgen.nl: / ongewijzigd', kantoorRoute('koersvoormorgen.nl', '/').soort === 'door');
check('koersvoormorgen.nl: kantoorhuisstijl.css = leeg standaardbestand', kantoorRoute('koersvoormorgen.nl', '/assets/kantoorhuisstijl.css').soort === 'door');
check('koersvoormorgen.nl: /presentatie niet omgeleid', kantoorRoute('koersvoormorgen.nl', '/presentatie').soort === 'door');

// 4. publieke bestanden noemen geen kantoor; standaard-css doet niets
const leeg = readFileSync(new URL('../assets/kantoorhuisstijl.css', import.meta.url), 'utf8');
check('standaard kantoorhuisstijl.css bevat geen regels', !/[{}]/.test(leeg.replace(/\/\*[\s\S]*?\*\//g, '')));
for (const f of ['../adv.html', '../mna.html', '../assets/kantoorhuisstijl.css', '../mna/01-config-sectorprofielen.js'])
  check(f + ' noemt geen kantoornaam', !/maes/i.test(readFileSync(new URL(f, import.meta.url), 'utf8')));
check('adv.html en mna.html laden de kantoorhuisstijl', /href="\/assets\/kantoorhuisstijl\.css"/.test(adv) && /href="\/assets\/kantoorhuisstijl\.css"/.test(readFileSync(new URL('../mna.html', import.meta.url), 'utf8')));
const svg = readFileSync(new URL('../assets/kantoren/maes/logo.svg', import.meta.url), 'utf8');
check('logo schoon (geen script/handlers/externe refs)', !/<script|\son[a-z]+\s*=|javascript:|foreignObject|<use|href\s*=\s*["'](https?:|\/\/)/i.test(svg));
console.log(ok + '/' + (ok + fail) + ' PASS'); process.exit(fail ? 1 : 0);
