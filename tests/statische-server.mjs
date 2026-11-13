// N-156 (30-10-2026): statische testserver voor de Playwright-tests. Vervangt python3 -m http.server, dat onder de
// belasting van ruim twintig scripts per pagina verbindingen verbrak (net::ERR_CONNECTION_RESET op mna/19-im-beeld.js,
// vastgelegd door de paginadiagnose); een ontbrekend script gaf daarna "functie niet gedefinieerd" en een wisselend
// falende regressietest. Alleen voor lokaal testen: serveert uitsluitend bestanden binnen de repomap, alleen GET/HEAD.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POORT = Number(process.argv[2] || 8799);
const TYPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
function behandel(req, res) {
  // N-205: de server meldt welke werkboom hij serveert; tests/global-setup-server.mjs weigert een server van een andere werkboom.
  res.setHeader('X-KVM-Root', encodeURIComponent(ROOT));
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const bestand = path.resolve(ROOT, '.' + p);
  if (bestand !== ROOT && !bestand.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(bestand, (fout, inhoud) => {
    if (fout) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('niet gevonden'); }
    res.writeHead(200, { 'Content-Type': TYPE[path.extname(bestand).toLowerCase()] || 'application/octet-stream', 'Content-Length': inhoud.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : inhoud);
  });
}
// Alleen lokaal (IPv4 en IPv6 loopback), niet op het netwerk; localhost kan op macOS naar ::1 wijzen.
for (const adres of ['127.0.0.1', '::1']) {
  const server = http.createServer(behandel);
  server.keepAliveTimeout = 30000;
  server.on('error', (e) => { if (adres === '::1' && e.code === 'EADDRNOTAVAIL') return; throw e; });
  server.listen(POORT, adres, () => console.log('statische testserver op ' + adres + ':' + POORT));
}
