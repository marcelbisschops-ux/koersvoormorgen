#!/usr/bin/env node
// P2-28 (4 okt 2026) — lokale DOM-test voor de expliciete labelkoppelingen in mna/04: het Status-
// label per targetkaart (koopmandaat) en de twee Fusie-bestuursnamen bij interne goedkeuring.
// Geen netwerk, geen browser, geen node_modules: draait de echte renderKoopmandaatScherm(),
// interneGoedkeuringHtml() en wireInterneGoedkeuring() uit mna/04 in node:vm, parseert de
// gerenderde HTML in een minimale DOM-fixture en past de HTML-labelregels toe (for → id van een
// labelbaar element, anders het eerste geneste labelbare element; klik focust het control, niet
// bij disabled). Alle gegevens hieronder zijn synthetisch.
//
// Gebruik: node tests/p228-labels.mjs   (vanuit de repo-root)
// Wordt ook aangeroepen door tests/audit-consistentie.mjs (check 20).

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';

function knip(src, van, tot, naam) {
  const a = src.indexOf(van), b = src.indexOf(tot, a + 1);
  if (a < 0 || b < a) throw new Error(naam + ': markers ontbreken');
  return src.slice(a, b);
}

// ── Minimale DOM-fixture ──
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);
const LABELBAAR = new Set(['input', 'select', 'textarea', 'button', 'meter', 'output', 'progress']);
const ontsnap = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  const alle = [];
  let cur = root;
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
    } else if (m[2]) {
      const attrs = {};
      const ar = /([^\s=]+)(?:="([^"]*)"|='([^']*)')?/g;
      let am;
      while ((am = ar.exec(m[3] || ''))) attrs[am[1].toLowerCase()] = ontsnap(am[2] ?? am[3] ?? '');
      const el = { tag: m[2].toLowerCase(), attrs, children: [], parent: cur, value: '', checked: false, disabled: 'disabled' in attrs, style: {} };
      cur.children.push(el);
      alle.push(el);
      if (!VOID.has(el.tag)) cur = el;
    } else if (m[4]) {
      cur.children.push({ tag: '#text', text: ontsnap(m[4]), parent: cur });
    }
  }
  const tekst = (n) => n.tag === '#text' ? n.text : (n.tag === 'select' || n.tag === 'textarea' ? '' : n.children.map(tekst).join(''));
  const isLabelbaar = (el) => !!el && LABELBAAR.has(el.tag) && !(el.tag === 'input' && el.attrs.type === 'hidden');
  const nakomelingen = (el) => el.children.flatMap((c) => c.tag === '#text' ? [] : [c, ...nakomelingen(c)]);
  const doc = {
    alle,
    activeElement: null,
    getElementById: (id) => alle.find((e) => e.attrs.id === id) || null,
    idTelling: (id) => alle.filter((e) => e.attrs.id === id).length,
    tekst: (el) => tekst(el).replace(/\s+/g, ' ').trim(),
    // HTML: label met for → het element met dat id (mits labelbaar); zonder for → eerste geneste labelbare element.
    labelControl(label) {
      if ('for' in label.attrs) { const c = doc.getElementById(label.attrs.for); return isLabelbaar(c) ? c : null; }
      return nakomelingen(label).find(isLabelbaar) || null;
    },
    labelsVan: (ctrl) => alle.filter((e) => e.tag === 'label' && doc.labelControl(e) === ctrl),
    naam: (ctrl) => doc.labelsVan(ctrl).map((l) => doc.tekst(l)).join(' ').trim(),
    klik(label) {
      const c = doc.labelControl(label);
      if (!c || c.disabled) return null;
      doc.activeElement = c;
      if (c.tag === 'input' && c.attrs.type === 'checkbox') { c.checked = !c.checked; if (c.onchange) c.onchange({}); }
      return c;
    },
  };
  return doc;
}

function laad(root) {
  const src04 = fs.readFileSync(path.join(root, 'mna/04-begeleider-dashboard.js'), 'utf8');
  const src01 = fs.readFileSync(path.join(root, 'mna/01-config-sectorprofielen.js'), 'utf8');
  const esc = fs.readFileSync(path.join(root, 'mna/02-state-opslag-documenten.js'), 'utf8').match(/^function esc\(s\)\{.*\}$/m);
  const status = [src04.match(/^var KM_STATUS_LABEL=.*$/m), src04.match(/^var KM_STATUS_KLEUR=.*$/m)];
  if (!esc || !status[0] || !status[1]) throw new Error('esc() of KM_STATUS_* niet gevonden');
  const delen = [
    esc[0], status[0][0], status[1][0],
    knip(src01, 'function partijLabels(type){', '\n}\n', 'mna/01 partijLabels') + '\n}',
    knip(src04, 'function renderKoopmandaatScherm(app){', 'function bindKoopmandaatScherm(', 'mna/04 renderKoopmandaatScherm'),
    knip(src04, 'function _isFusieTraject(){', '// Eigen PDF-upload', 'mna/04 interneGoedkeuring'),
  ];
  const ctx = vm.createContext({
    S: {}, BRAND: { platform: 'KVM' }, WORKER: 'https://example.invalid', document: null,
    brandMerkHtml: () => '', kmSectorLabels: () => ({}), kmKoperTargetHtml: () => '', kmAdvContextUrl: () => 'adv.html',
    bindKoopmandaatScherm: () => {},
  });
  vm.runInContext(delen.join('\n'), ctx, { filename: 'mna/04#P2-28' });
  return ctx;
}

export async function draaiP228LabelChecks(root = process.cwd()) {
  const res = [];
  const check = (voorwaarde, msg) => res.push({ ok: !!voorwaarde, msg });

  // ── A. Koopmandaat: Status-label per targetkaart ──
  try {
    const k = laad(root);
    const targets = [
      { id: 'target_a1', naam: 'Synth A', status: 'kandidaat' },
      { id: 'target_b2', naam: 'Synth B', status: 'in_gesprek' },
      { id: 'target_"c3', naam: 'Synth C', status: 'geparkeerd' },
      { id: 'target_d4', naam: 'Synth D', status: 'gepromoveerd', gepromoveerd_naar_traject_id: 'MASYNTH1' },
    ];
    k.S = { kmRol: 'begeleider', kmMandaat: {}, kmTargets: targets, code: 'TSYNTH01' };
    const app = { innerHTML: '' };
    k.renderKoopmandaatScherm(app);
    const doc = parseHtml(app.innerHTML);
    const selects = doc.alle.filter((e) => e.tag === 'select' && e.attrs.class === 'km-status-select');
    check(selects.length === targets.length, 'koopmandaat: één km-status-select per targetkaart (' + selects.length + '/' + targets.length + ')');
    targets.forEach((t, i) => {
      const sel = selects[i];
      if (!sel) return;
      const id = sel.attrs.id;
      const labels = doc.labelsVan(sel);
      check(id === 'km-status-' + t.id && doc.idTelling(id) === 1, 'target ' + (i + 1) + ': uniek stabiel id "km-status-<target-id>"');
      check(sel.attrs['data-id'] === t.id, 'target ' + (i + 1) + ': data-id ongewijzigd de target-id');
      check(labels.length === 1 && doc.naam(sel) === 'Status:', 'target ' + (i + 1) + ': precies één gekoppeld zichtbaar label "Status:"');
      const kl = doc.klik(labels[0] || { attrs: {}, children: [] });
      if (t.status === 'gepromoveerd') check(sel.disabled && kl === null, 'target ' + (i + 1) + ' (gepromoveerd): select blijft disabled, labelklik focust niets');
      else check(kl === sel && doc.activeElement === sel, 'target ' + (i + 1) + ': labelklik focust de eigen select (niet die van een andere kaart)');
    });
    check(doc.alle.filter((e) => e.tag === 'label').every((l) => doc.labelControl(l)), 'koopmandaat: geen los label zonder gekoppeld control');
    const opts = selects[0] ? selects[0].children.filter((c) => c.tag === 'option').map((o) => o.attrs.value).join(',') : '';
    check(opts === 'kandidaat,in_gesprek,geparkeerd,afgewezen', 'statusopties ongewijzigd');
    k.S = { kmRol: 'koper', kmMandaat: {}, kmTargets: targets, code: 'KSYNTH01' };
    k.renderKoopmandaatScherm(app);
    check(!app.innerHTML.includes('km-status-'), 'koperweergave: geen statusselect (rolafscherming ongewijzigd)');
  } catch (e) {
    check(false, 'koopmandaat-labels konden niet worden getest: ' + String((e && e.message) || e));
  }

  // ── B. Interne goedkeuring: Fusie (twee besturen) en standaard (één naam) ──
  try {
    const k = laad(root);
    k.S = { traject: { traject_type: 'Fusie' } };
    const html = k.interneGoedkeuringHtml('bd-goedkeuring-naam') + '<input type="checkbox" id="akk"><button id="verstuur"></button>';
    const doc = parseHtml(html);
    k.document = doc;
    const a = doc.getElementById('bd-goedkeuring-naam'), b = doc.getElementById('bd-goedkeuring-naam-b');
    const pl = k.partijLabels('Fusie');
    check(a && b && doc.idTelling('bd-goedkeuring-naam') === 1 && doc.idTelling('bd-goedkeuring-naam-b') === 1, 'Fusie: beide naamvelden bestaan met uniek, ongewijzigd id');
    check(doc.labelsVan(a).length === 1 && doc.naam(a) === 'Naam — namens ' + pl.sectie1, 'Fusie veld A: eigen gekoppeld label "Naam — namens ' + pl.sectie1 + '"');
    check(doc.labelsVan(b).length === 1 && doc.naam(b) === 'Naam — namens ' + pl.sectie2, 'Fusie veld B: eigen gekoppeld label "Naam — namens ' + pl.sectie2 + '"');
    check(doc.naam(a) !== doc.naam(b), 'Fusie: beide velden hebben een onderscheidende naam');
    check(doc.klik(doc.labelsVan(a)[0]) === a && doc.activeElement === a && doc.klik(doc.labelsVan(b)[0]) === b && doc.activeElement === b, 'Fusie: labelklik focust het juiste bestuursveld');
    check(doc.alle.filter((e) => e.tag === 'label').every((l) => doc.labelControl(l)), 'Fusie: groepskop is geen los label meer');
    check(a.attrs.placeholder === 'Naam — namens ' + pl.sectie1 && b.attrs.placeholder === 'Naam — namens ' + pl.sectie2, 'Fusie: placeholders ongewijzigd');
    // Goedkeuringsvereiste ongewijzigd: beide namen + akkoord verplicht; getNaam combineert beide.
    const w = k.wireInterneGoedkeuring('bd-goedkeuring-naam', 'akk', ['verstuur']);
    const knop = doc.getElementById('verstuur'), akk = doc.getElementById('akk');
    a.value = 'Jan'; a.oninput(); akk.checked = true; akk.onchange({});
    check(knop.disabled === true, 'Fusie: met alleen naam A blijft verzenden geblokkeerd');
    b.value = 'Piet'; b.oninput();
    check(knop.disabled === false && w.getNaam() === pl.sectie1 + ': Jan · ' + pl.sectie2 + ': Piet', 'Fusie: beide namen + akkoord → verzenden mogelijk, gecombineerde naam ongewijzigd');

    k.S = { traject: { traject_type: 'Verkoop' } };
    const doc2 = parseHtml(k.interneGoedkeuringHtml('bg-goedkeuring-naam'));
    const enkel = doc2.getElementById('bg-goedkeuring-naam');
    check(enkel && !doc2.getElementById('bg-goedkeuring-naam-b') && doc2.labelsVan(enkel).length === 1 && doc2.naam(enkel).startsWith('Intern goedgekeurd door (naam)'), 'niet-Fusie: één veld met het bestaande gekoppelde label (ongewijzigd)');
  } catch (e) {
    check(false, 'interne-goedkeuringlabels konden niet worden getest: ' + String((e && e.message) || e));
  }
  return res;
}

// Los draaien
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = await draaiP228LabelChecks(root);
  let fout = 0;
  res.forEach((r) => { console.log((r.ok ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗\x1b[0m ') + r.msg); if (!r.ok) fout++; });
  console.log(fout ? '\n' + fout + ' van ' + res.length + ' P2-28-labelchecks gefaald.' : '\nAlle ' + res.length + ' P2-28-labelchecks geslaagd.');
  process.exit(fout ? 1 : 0);
}
