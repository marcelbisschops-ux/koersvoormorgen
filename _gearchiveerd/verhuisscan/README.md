# VerhuisScan — offline gehaald (3 september 2026)

Op verzoek van Marcel is de **VerhuisScan** tijdelijk offline gehaald en buiten de
juridische kwaliteitsreview van Koers voor Morgen / de M&A-praktijk gehouden.

## Wat is hier bewaard

| Bestand | Was | Origineel pad |
|---|---|---|
| `verhuis.html.bak` | Publieke scan-tool ("VerhuisScan — Strategisch inzicht voor verhuisbedrijven") | `/verhuis.html` |
| `hugo.html.bak` | Beheerpaneel ("Hugo — VerhuisScan Beheer") | `/hugo.html` |

De `.bak`-extensie zorgt dat GitHub Pages deze bestanden niet als pagina serveert.
De volledige, ongewijzigde inhoud is ook via de git-geschiedenis terug te halen.

## Wat er live is veranderd

`/verhuis.html` en `/hugo.html` zijn vervangen door een sobere "tijdelijk offline"-stub
met `noindex`. Niets op koersvoormorgen.nl linkte naar deze pagina's, dus er zijn geen
dode links ontstaan.

## Niet aangeraakt

De backend-route `worker/01-verhuisscan.js` (koersvoormorgen-backend) is **niet**
gewijzigd; die is alleen niet meer via een UI bereikbaar. Zet die stap er los bij als
VerhuisScan definitief wordt uitgefaseerd.

## Terugzetten

1. `cp _gearchiveerd/verhuisscan/verhuis.html.bak verhuis.html`
2. `cp _gearchiveerd/verhuisscan/hugo.html.bak hugo.html`
3. Commit + push; hard-refresh.
