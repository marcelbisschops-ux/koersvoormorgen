// Releasegate frontend (12-11-2026): beslisregels van scripts/frontend-release-gate.mjs. Lokaal, geen netwerk.
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beoordeel, vingerafdruk } from '../scripts/frontend-release-gate.mjs';
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
// Vingerafdruk verandert bij elke inhoudswijziging.
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
fs.writeFileSync(path.join(d, 'index.html'), 'a');
const h1 = vingerafdruk(d); fs.writeFileSync(path.join(d, 'index.html'), 'b'); const h2 = vingerafdruk(d);
fs.mkdirSync(path.join(d, 'x')); fs.writeFileSync(path.join(d, 'x', 'n.js'), ''); const h3 = vingerafdruk(d);
ok(h1 !== h2 && h2 !== h3 && /^[0-9a-f]{64}$/.test(h1), 'vingerafdruk wijzigt bij inhoud en nieuw bestand');
ok(vingerafdruk(path.join(d, 'bestaat-niet')) === null, 'geen map: geen vingerafdruk');
fs.rmSync(d, { recursive: true, force: true });
console.log('✅ ' + n + '/' + n);
