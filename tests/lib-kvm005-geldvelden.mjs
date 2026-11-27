// KVM-005 (26-11-2026): het ECHTE bedragveld-blok uit mna/02 (isGeldVeld, geldGelijk, veldWaardeGelijk, veldInvoer,
// geldVeldBlur/-Focus) voor de vm-harnassen die losse functies uit mna/02 en mna/09-16 draaien. Die functies roepen het
// blok sinds KVM-005 aan. parseGeld/fmtGeld (mna/03) alleen als het harnas ze nog niet zelf levert (een stub blijft staan).
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const functie = (src, naam) => { const i = src.indexOf('function ' + naam + '('); if (i < 0) throw new Error(naam + ' niet gevonden');
  let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };
export function kvm005Blok() {
  const s02 = fs.readFileSync(path.join(ROOT, 'mna/02-state-opslag-documenten.js'), 'utf8');
  const s03 = fs.readFileSync(path.join(ROOT, 'mna/03-rekenkern-waardering.js'), 'utf8');
  const a = s02.indexOf('// ===== KVM-005 (26-11-2026): bedragvelden'), b = s02.indexOf('// ===== /KVM-005 bedragvelden =====');
  if (a < 0 || b < a) throw new Error('KVM-005-bedragveldblok niet gevonden in mna/02');
  const alsOntbreekt = (naam) => 'var ' + naam + '=typeof ' + naam + "==='function'?" + naam + ':(function(){' + functie(s03, naam) + 'return ' + naam + ';})();';
  return [alsOntbreekt('parseGeld'), alsOntbreekt('fmtGeld'), s02.slice(a, b)].join('\n');
}
