#!/usr/bin/env node
// N-121 (4 okt 2026) — lange AI-generaties begrensd 180 seconden laten afronden. Staging mat 57/62s
// voor rijke trajecten; de frontend brak de 13 AI-generatiecalls in mna/04 (9) en mna/06 (4) na
// 60000 ms af en toonde een valse fout. Die calls staan nu op 180000 ms; de wrapper, gewone
// fetch-defaults (15s) en uploads (60s) blijven ongewijzigd.
//
// Deze test draait de ECHTE fetchMetTimeout uit mna/01 en de ECHTE verkoopmemorandum-handler uit
// mna/04 in node:vm met een virtuele klok en een gecontroleerde fetch — geen netwerk, geen browser,
// geen echte 62s/180s wachttijd. Alle gegevens zijn synthetisch.
//
// Gebruik: node tests/n121-ai-timeouts.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 19).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

const WORKER = 'https://worker.test';
const BGKEY = 'TSYN0001';
const AI_MS = 180000;

// De 13 AI-generatiecalls: URL-expressie en opts-literal exact zoals vóór N-121 (alleen de timeout
// wijzigt). Wijkt headers/body af, dan is dat een regressie buiten de N-121-scope.
const AI_CALLS = [
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/document/'+type+'/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code},body:JSON.stringify({code:S._bgKey||S.code})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/dealvoorstel/hoofdstukken/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code},body:JSON.stringify({code:S._bgKey||S.code,contextBlok:contextBlok,vlaggen:dvVlaggen})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/dealvoorstel/bijlage/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code},body:JSON.stringify({code:S._bgKey||S.code,interneContext:interneContext})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/document/bieding/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code},body:JSON.stringify({code:S._bgKey||S.code,ebitda:ebitda,multLaag:multLaag,multHoog:multHoog,betaling:betaling,exclWeken:exclWeken,geldigTot:geldigTotV})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/spa/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S._bgKey})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/risicoraamwerk/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/teaser/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/verkoopmemorandum/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||''},body:JSON.stringify({code:S.code,nda_bevestigd:!!ndaBevestigd,nda_bevestigd_door:ndaDoor||''})}"],
  ['mna/04-begeleider-dashboard.js', "WORKER+'/mna/gesprek/verslag/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code},body:JSON.stringify({code:S._bgKey||S.code,gesprekType:document.getElementById('bgg-type').value,datum:document.getElementById('bgg-datum').value,deelnemers:document.getElementById('bgg-deelnemers').value,notities:notities})}"],
  ['mna/06-schermen.js', "WORKER+'/mna/analyse/fase/genereer'", "{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:S.code,faseId:faseId,faseTitel:f.title,dataLines:dataLines,checklistGereed:chk,checklistOpen:open,redVlaggen:rfs,notities:S.notities[faseId],sectorLabel:sectorLabel,sectorNormen:sectorNormen,trajectType:S.traject&&S.traject.traject_type,kantoorNaam:S.traject&&S.traject.kantoor_naam,begeleiderNaam:S.traject&&S.traject.begeleider_naam})}"],
  ['mna/06-schermen.js', "WORKER+'/mna/waardering/rapport-genereren'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code||''},body:JSON.stringify({code:S.code,lijnen:lijnen})}"],
  ['mna/06-schermen.js', "WORKER+'/mna/waardering/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code||''},body:JSON.stringify({code:S.code})}"],
  ['mna/06-schermen.js', "WORKER+'/mna/analyse/traject/genereer'", "{method:'POST',headers:{'Content-Type':'application/json','x-tussen-key':S._bgKey||S.code||''},body:JSON.stringify({code:S.code,dataSamenvatting:dataSamenvatting,benchmarkTekst:bmTekst,sectorLabel:_b5Sec,kantoorNaam:t3.kantoor_naam,trajectType:t3.traject_type})}"],
];

// Buiten de N-121-scope: deze expliciete 60s-calls (twee uploads, consolidatie, meeting) blijven
// ongewijzigd.
const BUITEN_SCOPE_60S = [
  ['mna/02-state-opslag-documenten.js', "fetchMetTimeout(WORKER + '/mna/bankmutaties/upload', { method: 'POST', body: fd }, 60000)"],
  ['mna/02-state-opslag-documenten.js', "fetchMetTimeout(url, { method: 'POST', body: formData }, 60000)"],
  ['mna/02-state-opslag-documenten.js', "fetchMetTimeout(WORKER+'/mna/analyse/consolideer/genereer',"],
  ['mna/03-rekenkern-waardering.js', "fetchMetTimeout(WORKER+'/mna/logboek-meeting/genereer',"],
];

const lees = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const flush = () => new Promise((r) => setImmediate(r));

// ── Virtuele klok: setTimeout/clearTimeout zonder echte wachttijd ──
function maakKlok() {
  let nu = 0, volg = 1;
  const timers = new Map();
  return {
    setTimeout(fn, ms) { const id = volg++; timers.set(id, { at: nu + (ms || 0), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async tik(ms) {
      const doel = nu + ms;
      for (;;) {
        let eerst = null;
        for (const [id, t] of timers) if (t.at <= doel && (!eerst || t.at < eerst[1].at)) eerst = [id, t];
        if (!eerst) break;
        timers.delete(eerst[0]); nu = eerst[1].at; eerst[1].fn(); await flush();
      }
      nu = doel; await flush();
    },
    get open() { return timers.size; },
  };
}

// ── Gecontroleerde fetch: blijft hangen tot de test hem afrondt; respecteert signal zoals echte fetch ──
function maakFetch() {
  const calls = [];
  const fetch = (url, opts = {}) => new Promise((resolve, reject) => {
    const c = { url: String(url), opts, resolve, reject, aborted: false };
    calls.push(c);
    if (opts.signal) opts.signal.addEventListener('abort', () => { c.aborted = true; reject(new DOMException('This operation was aborted', 'AbortError')); });
  });
  return { calls, fetch };
}
const antwoord = (json) => ({ ok: true, status: 200, json: () => Promise.resolve(json) });

function laadWrapper(root) {
  const fmt = lees(root, 'mna/01-config-sectorprofielen.js').match(/^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m);
  if (!fmt) throw new Error('fetchMetTimeout niet gevonden in mna/01');
  const klok = maakKlok();
  const f = maakFetch();
  const ctx = vm.createContext({ AbortController, setTimeout: klok.setTimeout, clearTimeout: klok.clearTimeout, fetch: f.fetch });
  vm.runInContext(fmt[0], ctx, { filename: 'mna/01#fetchMetTimeout' });
  return { klok, f, fmt: ctx.fetchMetTimeout };
}
// Volgt een promise zonder hem te laten "unhandled" raken.
function volg(p) { const s = { klaar: false }; p.then((v) => { s.klaar = true; s.waarde = v; }, (e) => { s.klaar = true; s.fout = e; }); return s; }

// ── Minimale DOM voor de verkoopmemorandum-handler ──
function maakEl(id) {
  return { id, style: {}, value: '', checked: false, disabled: false, textContent: '', onclick: null, offsetWidth: 0, classList: { add() {}, remove() {} }, scrollIntoView() {} };
}
function laadVerkoopmemo(root) {
  const src04 = lees(root, 'mna/04-begeleider-dashboard.js');
  const src02 = lees(root, 'mna/02-state-opslag-documenten.js');
  const a = src04.indexOf('async function toonVerkoopmemoModal(){');
  const b = src04.indexOf('async function toonClosingModal(){', a + 1);
  const toon = src04.match(/^function bgToonUitvoer\(el\)\{[\s\S]*?\n\}/m);
  const esc = src02.match(/^function esc\(s\)\{.*\}$/m);
  if (a < 0 || b < a || !toon || !esc) throw new Error('toonVerkoopmemoModal/bgToonUitvoer/esc niet gevonden');

  const klok = maakKlok();
  const f = maakFetch();
  const els = {};
  const out = maakEl('bg-verkoopmemo-out');
  let html = '';
  // Bij elke innerHTML-wissel ontstaan de elementen met een id="..." opnieuw (zoals in de browser).
  Object.defineProperty(out, 'innerHTML', {
    get() { return html; },
    set(h) {
      html = String(h);
      Object.keys(els).forEach((k) => delete els[k]);
      for (const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
        const el = maakEl(m[2]);
        const v = /\bvalue="([^"]*)"/.exec(m[0]);
        if (v) el.value = v[1];
        if (m[1] === 'textarea') el.value = html.slice(m.index + m[0].length, html.indexOf('</textarea>', m.index));
        els[m[2]] = el;
      }
    },
  });
  const st = { toasts: [] };
  const S = { code: BGKEY, _bgKey: BGKEY, traject: { kantoor_naam: 'Synthetisch Kantoor BV', nda_getekend: true } };
  const ctx = vm.createContext({
    AbortController, setTimeout: klok.setTimeout, clearTimeout: klok.clearTimeout, fetch: f.fetch,
    WORKER, S,
    document: { getElementById: (id) => id === out.id ? out : (els[id] || null) },
    toast: (msg, type) => st.toasts.push({ msg: String(msg), type }),
    printDoc: () => {},
  });
  const fmt = lees(root, 'mna/01-config-sectorprofielen.js').match(/^function fetchMetTimeout\(url, opts, ms\) \{[\s\S]*?\n\}/m);
  vm.runInContext([esc[0], fmt[0], toon[0], src04.slice(a, b)].join('\n'), ctx, { filename: 'mna/04#verkoopmemorandum' });
  return { klok, f, out, els, S, st, toonVerkoopmemoModal: ctx.toonVerkoopmemoModal };
}
const GEN = WORKER + '/mna/verkoopmemorandum/genereer';
const genCalls = (f) => f.calls.filter((c) => c.url === GEN);

export async function draaiN121AiTimeoutChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });
  const probeer = async (naam, fn) => { try { await fn(); } catch (e) { check(false, naam + ': kon niet worden getest: ' + String((e && e.message) || e)); } };

  // ── A. Bron: precies de 13 AI-calls op 180000 ms, headers/body ongewijzigd, rest ongemoeid ──
  const bron = {};
  ['mna/04-begeleider-dashboard.js', 'mna/06-schermen.js'].forEach((rel) => {
    const src = lees(root, rel);
    bron[rel] = [...src.matchAll(/fetchMetTimeout\((WORKER\+[^,{]*?),(\{method:'POST'.*?\}),(\d+)\)/g)].map((m) => ({ url: m[1], opts: m[2], ms: Number(m[3]) }));
    check(!/\b60000\b/.test(src), rel + ': geen enkele 60000 ms-timeout meer');
  });
  const gevondenMs = [];
  AI_CALLS.forEach(([rel, url, opts]) => {
    const treffers = bron[rel].filter((c) => c.url === url && c.opts === opts);
    check(treffers.length === 1 && treffers[0].ms === AI_MS, rel + ' ' + url.replace("WORKER+", '') + ': exact één call met ongewijzigde headers/body en ' + AI_MS + ' ms');
    if (treffers.length === 1) gevondenMs.push([url, treffers[0].ms]);
  });
  const alle180 = Object.values(bron).flat().filter((c) => c.ms === AI_MS);
  check(alle180.length === AI_CALLS.length, 'precies ' + AI_CALLS.length + ' calls in mna/04+06 op ' + AI_MS + ' ms (geen andere calls verruimd), gevonden: ' + alle180.length);
  check(bron['mna/04-begeleider-dashboard.js'].filter((c) => /\/email'$/.test(c.url) && c.ms === 30000).length === 2, 'mna/04: teaser-/verkoopmemorandum-e-mail blijven op 30000 ms');
  BUITEN_SCOPE_60S.forEach(([rel, snippet]) => {
    const src = lees(root, rel);
    const i = src.indexOf(snippet);
    check(i >= 0 && /^[^\n]*?\b60000\)/.test(src.slice(i)), rel + ': ' + snippet.slice(0, 60) + '… blijft 60000 ms (buiten N-121-scope)');
  });

  // ── B. Echte fetchMetTimeout met virtuele klok ──
  await probeer('wrapper', async () => {
    // B1. Voor elke van de 13 calls, met de timeout zoals hij in de bron staat: antwoord na 62s slaagt.
    for (const [url, ms] of gevondenMs) {
      const { klok, f, fmt } = laadWrapper(root);
      const s = volg(fmt(WORKER + '/x', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tussen-key': BGKEY }, body: '{"code":"' + BGKEY + '"}' }, ms));
      await flush();
      const c = f.calls[0];
      await klok.tik(62000);
      const nietAfgebroken = c && !c.aborted && !s.klaar;
      c.resolve(antwoord({ ok: true }));
      await flush();
      check(nietAfgebroken && s.klaar && !s.fout && s.waarde.ok === true && klok.open === 0,
        url.replace('WORKER+', '') + ': resultaat na 62s blijft succes (geen abort vóór 180s), timer opgeruimd');
      check(c && c.opts.method === 'POST' && c.opts.headers['x-tussen-key'] === BGKEY && c.opts.body === '{"code":"' + BGKEY + '"}' && c.opts.signal,
        url.replace('WORKER+', '') + ': wrapper geeft method/headers/body ongewijzigd door, plus signal');
    }
    // B2. Hangend verzoek: niet afgebroken op 179,999s, wel precies op 180s; timer weg.
    {
      const { klok, f, fmt } = laadWrapper(root);
      const s = volg(fmt(WORKER + '/x', { method: 'POST' }, AI_MS));
      await flush();
      await klok.tik(AI_MS - 1);
      const nogOpen = !f.calls[0].aborted && !s.klaar;
      await klok.tik(1);
      check(nogOpen && f.calls[0].aborted && s.fout && s.fout.name === 'AbortError' && klok.open === 0,
        'hangend verzoek: open tot 179999 ms, abort (AbortError) op 180000 ms, timer weg na finally');
    }
    // B3. Netwerkfout: reject met dezelfde fout, timer weg.
    {
      const { klok, f, fmt } = laadWrapper(root);
      const s = volg(fmt(WORKER + '/x', { method: 'POST' }, AI_MS));
      await flush();
      const fout = new TypeError('Failed to fetch');
      f.calls[0].reject(fout);
      await flush();
      check(s.fout === fout && klok.open === 0, 'netwerkfout: reject met de oorspronkelijke fout, timer opgeruimd');
    }
    // B4. Gewone default (geen ms) blijft 15s.
    {
      const { klok, f, fmt } = laadWrapper(root);
      const s = volg(fmt(WORKER + '/x', {}));
      await flush();
      await klok.tik(14999);
      const nogOpen = !f.calls[0].aborted;
      await klok.tik(1);
      check(nogOpen && f.calls[0].aborted && s.fout && s.fout.name === 'AbortError' && klok.open === 0, 'wrapper-default zonder ms blijft 15000 ms');
    }
    // B5. Contrast: een expliciete 60000 ms (uploads e.d.) breekt nog steeds op 60s af — precies de
    //     valse fout die de 13 AI-calls bij 62s gaven.
    {
      const { klok, f, fmt } = laadWrapper(root);
      const s = volg(fmt(WORKER + '/x', { method: 'POST' }, 60000));
      await flush();
      await klok.tik(60000);
      check(f.calls[0].aborted && s.fout && s.fout.name === 'AbortError' && klok.open === 0, 'expliciete 60000 ms (uploads) breekt nog steeds op 60s af — wrapper zelf ongewijzigd');
    }
  });

  // ── C. Echte verkoopmemorandum-handler (mna/04) ──
  // C1. Laat antwoord na 62s: memo getoond en in het traject gezet, geen fout.
  await probeer('verkoopmemorandum laat antwoord', async () => {
    const { klok, f, out, els, S, toonVerkoopmemoModal } = laadVerkoopmemo(root);
    const s = volg(toonVerkoopmemoModal());
    await flush();
    const g = genCalls(f)[0];
    const body = g && JSON.parse(g.opts.body);
    check(g && g.opts.method === 'POST' && g.opts.headers['x-tussen-key'] === BGKEY && g.opts.headers['Content-Type'] === 'application/json'
      && body.code === BGKEY && body.nda_bevestigd === false && body.nda_bevestigd_door === '',
      'verkoopmemorandum: generatie-POST met x-tussen-key en ongewijzigde body');
    await klok.tik(62000);
    const wachtNog = g && !g.aborted && /Genereren\.\.\./.test(out.innerHTML) && !s.klaar;
    g.resolve(antwoord({ ok: true, verkoopmemorandum_tekst: 'Synthetisch memorandum' }));
    await flush(); await flush();
    check(wachtNog, 'verkoopmemorandum: na 62s nog "Genereren..." en niet afgebroken');
    check(s.klaar && !s.fout && /nieuw gegenereerd/.test(out.innerHTML) && els['verkoopmemo-txt'] && els['verkoopmemo-txt'].value === 'Synthetisch memorandum'
      && S.traject.verkoopmemorandum_tekst === 'Synthetisch memorandum' && !/Genereren duurde te lang/.test(out.innerHTML) && klok.open === 0,
      'verkoopmemorandum: laat antwoord (62s) wordt als succes getoond en bewaard in het traject, timer opgeruimd');
  });
  // C2. Hangt tot 180s: foutmelding, geen valse opslag, "Opnieuw proberen" werkt.
  await probeer('verkoopmemorandum timeout', async () => {
    const { klok, f, out, els, S, st, toonVerkoopmemoModal } = laadVerkoopmemo(root);
    const s = volg(toonVerkoopmemoModal());
    await flush();
    await klok.tik(AI_MS - 1);
    const nogOpen = !genCalls(f)[0].aborted && !s.klaar;
    await klok.tik(1);
    await flush();
    check(nogOpen && genCalls(f)[0].aborted && s.klaar && !s.fout && /Genereren duurde te lang/.test(out.innerHTML) && els['verkoopmemo-err-opnieuw'],
      'verkoopmemorandum: hangend verzoek afgebroken op 180s met foutmelding en "Opnieuw proberen"');
    check(S.traject.verkoopmemorandum_tekst === undefined && !f.calls.some((c) => /\/opslaan$/.test(c.url)) && !st.toasts.some((t) => t.type === 'ok')
      && !/nieuw gegenereerd|verkoopmemo-txt/.test(out.innerHTML) && klok.open === 0,
      'verkoopmemorandum: na time-out geen valse opslag, geen succes, geen memo-weergave, timer weg');
    els['verkoopmemo-err-opnieuw'].onclick();
    await flush();
    const retry = genCalls(f)[1];
    retry && retry.resolve(antwoord({ ok: true, verkoopmemorandum_tekst: 'Tweede poging' }));
    await flush(); await flush();
    check(genCalls(f).length === 2 && S.traject.verkoopmemorandum_tekst === 'Tweede poging' && els['verkoopmemo-txt'] && els['verkoopmemo-txt'].value === 'Tweede poging' && klok.open === 0,
      'verkoopmemorandum: "Opnieuw proberen" start een nieuwe generatie die normaal slaagt');
  });
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiN121AiTimeoutChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' N-121-checks gefaald.' : '\nAlle ' + res.length + ' N-121-checks geslaagd.');
  process.exit(fout ? 1 : 0);
}
