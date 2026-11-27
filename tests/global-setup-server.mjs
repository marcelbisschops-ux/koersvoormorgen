// N-205 (13-11-2026): weigert te testen tegen een statische testserver die een andere werkboom serveert.
import path from 'node:path';
export default async function () {
  const poort = Number(process.env.KVM_FE_PORT || 8799); // centraal suiteslot (27-11): 8799 of 8801
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  let r;
  try { r = await fetch('http://localhost:' + poort + '/mna.html', { method: 'HEAD' }); } catch (e) { throw new Error('N-205: testserver op ' + poort + ' niet bereikbaar: ' + e.message); }
  const serveert = decodeURIComponent(r.headers.get('x-kvm-root') || '');
  if (serveert !== root) throw new Error('N-205: de testserver op poort ' + poort + ' serveert ' + (serveert || 'een onbekende map (oude server zonder X-KVM-Root)') + ', niet deze werkboom (' + root + '). Stop die server en draai opnieuw.');
}
