// Releasegate frontend (12-11-2026): beslisregels van scripts/frontend-release-gate.mjs. Lokaal, geen netwerk.
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beoordeel, vingerafdruk, conflictKopieen, controleerInhoud } from '../scripts/frontend-release-gate.mjs';
const NU = 1_800_000_000_000;
const H = 'a'.repeat(64);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('PASS ' + m); };
ok(!beoordeel(null, [], NU).ok, 'geen build: geblokkeerd');
ok(!beoordeel(H, [], NU).ok, 'geen previewresultaat: geblokkeerd');
ok(beoordeel(H, [{ hash: H, result: 'PASS', ts: NU - 1000, url: 'u' }], NU).ok, 'groene preview voor deze build: toegestaan');
ok(!beoordeel(H, [{ hash: 'b'.repeat(64), result: 'PASS', ts: NU - 1000, url: 'u' }], NU).ok, 'groen voor een andere build: geblokkeerd');
ok(!beoordeel(H, [{ hash: H, result: 'FAIL', ts: NU - 5000 }, { hash: H, result: 'PASS', ts: NU - 1000, url: 'u' }], NU).ok, 'rood daarna groen voor dezelfde build: blijft geblokkeerd');
ok(!beoordeel(H, [{ hash: H, result: 'PASS', ts: NU - 2000, url: 'u' }, { hash: H, result: 'FAIL', ts: NU - 1000 }], NU).ok, 'groen daarna rood: geblokkeerd');
ok(!beoordeel(H, [{ hash: H, result: 'PASS', ts: NU - 61 * 60 * 1000, url: 'u' }], NU).ok, 'groen ouder dan 60 min: geblokkeerd');
ok(!beoordeel(H, [{ hash: H, result: 'PASS', ts: NU + 2 * 86400000, url: 'u' }], NU).ok, 'PASS met toekomstige datum telt niet (Codex-review)');
ok(!beoordeel(H, [{ hash: H, result: 'GEEN_BINDING', ts: NU - 1000, url: 'u' }], NU).ok, 'preview zonder inhoudsbinding geeft geen PASS');
{
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-ck-'));
  fs.writeFileSync(path.join(d2, 'adv.html'), 'x');
  const schoon = conflictKopieen(d2).length === 0;
  fs.writeFileSync(path.join(d2, 'adv 2.html'), 'x'); fs.mkdirSync(path.join(d2, 'mna')); fs.writeFileSync(path.join(d2, 'mna', '01-a 2.js'), 'x');
  ok(schoon && conflictKopieen(d2).length === 2, 'conflictkopieën ("adv 2.html") worden herkend, ook in submappen');
  fs.rmSync(d2, { recursive: true, force: true });
}
// Vingerafdruk verandert bij elke inhoudswijziging.
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
fs.writeFileSync(path.join(d, 'index.html'), 'a');
const h1 = vingerafdruk(d); fs.writeFileSync(path.join(d, 'index.html'), 'b'); const h2 = vingerafdruk(d);
fs.mkdirSync(path.join(d, 'x')); fs.writeFileSync(path.join(d, 'x', 'n.js'), ''); const h3 = vingerafdruk(d);
ok(h1 !== h2 && h2 !== h3 && /^[0-9a-f]{64}$/.test(h1), 'vingerafdruk wijzigt bij inhoud en nieuw bestand');
ok(vingerafdruk(path.join(d, 'bestaat-niet')) === null, 'geen map: geen vingerafdruk');
fs.rmSync(d, { recursive: true, force: true });

// Inhoudsbinding met herhaalde pogingen (herstel 26-11-2026): tijdelijke ophaalfout is geen afwijking; blijvende wel, met reden.
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kvm-gate-inh-'));
  fs.writeFileSync(path.join(d, 'a.html'), 'A'); fs.writeFileSync(path.join(d, 'b.html'), 'B'); fs.writeFileSync(path.join(d, '_headers'), 'x');
  const resp = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, arrayBuffer: async () => new TextEncoder().encode(body).buffer });
  const geen = async () => {};
  let teller = 0;
  let r = await controleerInhoud('https://x.invalid', d, { wacht: geen, fetchFn: async (u) => { if (u.endsWith('/a.html') && teller++ < 2) throw new Error('time-out'); return resp(u.endsWith('/a.html') ? 'A' : 'B'); } });
  ok(r.afwijkend.length === 0 && r.herhaald === 2 && r.totaal === 2, 'tijdelijke ophaalfout (2x) daarna juiste inhoud: geen afwijking');
  r = await controleerInhoud('https://x.invalid', d, { wacht: geen, fetchFn: async (u) => resp(u.endsWith('/a.html') ? 'ANDERS' : 'B') });
  ok(r.afwijkend.join() === 'a.html' && r.redenen['a.html'] === 'inhoud', 'blijvend andere inhoud: afwijking met reden inhoud (fail-closed)');
  r = await controleerInhoud('https://x.invalid', d, { wacht: geen, fetchFn: async (u) => (u.endsWith('/b.html') ? resp('', 503) : resp('A')) });
  ok(r.afwijkend.join() === 'b.html' && r.redenen['b.html'] === 'ophalen (HTTP 503)', 'blijvend niet op te halen: afwijking met reden ophalen (fail-closed)');
  r = await controleerInhoud('https://x.invalid', d, { wacht: geen, fetchFn: async () => { throw new Error('net'); } });
  ok(r.afwijkend.length === 2 && r.redenen['a.html'] === 'ophalen (netwerkfout)', 'netwerk volledig weg: alles afwijkend, nooit binding');
}
console.log('✅ ' + n + '/' + n);
