// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// N-83 (27 sep 2026) — edge-blokkade van interne/gevoelige bestanden die per ongeluk fysiek in de
// Cloudflare Pages-deploymap staan. Ontstaan doordat empirisch is bevestigd dat `wrangler pages
// deploy .` .gitignore NIET raadpleegt (in tegenstelling tot GitHub Pages, dat wél leest wat in de
// git-repo staat) — sinds de migratie naar Cloudflare Pages (12 sep 2026) stonden CLAUDE.md,
// MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md, SECURITY-INVARIANTS.md, AUTORISATIEMATRIX.md, schema.sql
// en oude .claude/worktrees/-snapshots (met o.a. niet-gesaneerde proprietary sectorbenchmarkdata)
// alsnog publiek op koersvoormorgen.nl, ondanks dat ze uit git-tracking waren gehaald. Dit is de
// daadwerkelijke publicatieblokkade — .gitignore blijft alleen voor git-hygiëne.
//
// Bewust een ALLOWLIST-achtige DENYLIST hier (niet een allowlist van de hele site — dat zou een veel
// grotere, risicovollere wijziging zijn dan deze gerichte fix): elk pad dat hieronder matcht wordt
// geweigerd (404, geen bevestiging van bestaan), al het overige gaat ongewijzigd door naar de
// normale static-asset-afhandeling.
const GEBLOKKEERDE_PADEN_EXACT = new Set([
  '/CLAUDE.md',
  '/MASTER-WERKLIJST-KOERS-VOOR-MORGEN.md',
  '/SECURITY-INVARIANTS.md',
  '/AUTORISATIEMATRIX.md',
  '/BACKLOG.md',
  '/OPEN-BEVINDINGEN.md',
  '/schema.sql',
  '/.gevoelige-termen.local.txt',
  '/.cloudflare-api-token.local',
  '/tests/.env.staging.local',
]);

const GEBLOKKEERDE_PREFIXEN = [
  '/.claude/',
  '/.git/',
  '/legal/',
  '/tests/rapporten/',
  '/reports/',
  '/.wrangler/',
];

// Uitzondering (zie .gitignore, 18 sep 2026): LOAD-BEARING-PAGES.md is een getrackt CI-bronbestand
// zonder gevoelige inhoud en moet publiek/leesbaar blijven zoals voorheen.
const EXPLICIETE_UITZONDERINGEN = new Set(['/LOAD-BEARING-PAGES.md']);

// Elk overig root-niveau .md-bestand (behalve de uitzondering hierboven) is per definitie interne
// documentatie (zie .gitignore /*.md-regel) — geen allowlist per bestandsnaam nodig/gewenst, deze
// categorie is bewust generiek geblokkeerd.
function isGeblokkeerd(pathname) {
  if (EXPLICIETE_UITZONDERINGEN.has(pathname)) return false;
  if (GEBLOKKEERDE_PADEN_EXACT.has(pathname)) return true;
  if (/^\/[^/]+\.md$/i.test(pathname)) return true;
  return GEBLOKKEERDE_PREFIXEN.some((p) => pathname.startsWith(p));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isGeblokkeerd(url.pathname)) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return context.next();
}
