// N-205 (13-11-2026): weigert te testen tegen een statische testserver die een andere werkboom serveert.
import path from 'node:path';
export default async function () {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  let r;
  try { r = await fetch('http://localhost:8799/mna.html', { method: 'HEAD' }); } catch (e) { throw new Error('N-205: testserver op 8799 niet bereikbaar: ' + e.message); }
  const serveert = decodeURIComponent(r.headers.get('x-kvm-root') || '');
  if (serveert !== root) throw new Error('N-205: de testserver op poort 8799 serveert ' + (serveert || 'een onbekende map (oude server zonder X-KVM-Root)') + ', niet deze werkboom (' + root + '). Stop die server en draai opnieuw.');
}
