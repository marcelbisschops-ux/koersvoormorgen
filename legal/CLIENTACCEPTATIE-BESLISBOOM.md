# Cliëntacceptatie & integriteit — beslisboom voor de adviseur

**Doel.** Bij elk M&A-/opvolgingstraject stelt de **adviseur** (niet de cliënt) vast of, en in welke mate, cliëntenonderzoek nodig is, doorloopt de checks, en **bevestigt** dat hij dit heeft getoetst — via **openbare bronnen** én **bij de cliënt zelf**. Dit blokkeert de flow niet: het traject kan doorlopen terwijl de toetsing plaatsvindt, maar een document kan niet worden verstuurd/ondertekend zonder de bevestiging (zie "Vastlegging").

**Verhouding tot de Algemene Voorwaarden.** Art. 4 AV ("Cliëntacceptatie en integriteit", versie 1.2) geeft de contractuele basis: de cliënt moet de gevraagde gegevens leveren, en {{BEGELEIDER_KORT}} kan opschorten/beëindigen bij twijfel of bij een sanctietreffer. Deze beslisboom is de werkinstructie erachter.

> **JURIDISCHE ONZEKERHEID (JUR-1).** Of Bisschops Financing / de adviseur onder de **Wwft** valt als "M&A-bemiddelaar bij bedrijfsovernames", is niet eenduidig — de Wwft somt de instellingen limitatief op (art. 1a) en noemt "M&A-adviseur" niet met zoveel woorden, maar "advies of bijstand bij de aan- of verkoop van aandelen / bij het opzetten of beheren van vennootschappen" (art. 1a lid 4 sub c-sfeer) kan eronder vallen. Dit vergt een eenmalige specialistische toetsing (toezichthouder voor deze sector: **BFT**). Tot die uitkomst er is, hanteert de adviseur onderstaande beslisboom als **marktstandaard-cliëntacceptatiebeleid** — dat is nuttig ongeacht de Wwft-kwalificatie.

---

## Stap 1 — Is er een "cliënt" die getoetst moet worden?

| Situatie | Toetsing nodig? |
|---|---|
| Betaalde opdracht (bemiddeling, retainer, regie) — Opdrachtgever is een onderneming of een natuurlijk persoon | **Ja — volledig** (stap 2 + 3) |
| Opvolgingstraject met een **reeds bekende** interne/familie-opvolger | **Ja — volledig** voor de Opdrachtgever; **beperkt** voor de opvolger (identiteit + herkomst financiering) |
| Alleen een oriënterend gesprek, nog geen opdracht, geen uitwisseling van vertrouwelijke stukken | **Nee** — noteer alleen datum + naam gesprekspartner |
| Aangedragen lead (via `lead-aandragen.html`) die nog geen opdrachtgever is | **Nee** — pas bij opdrachtverlening |
| Bedrijfsscan-gebruiker (gratis, geen opdracht) | **Nee** |
| Meekijker (bank/accountant, alleen-lezen) | **Nee** voor Wwft; wel: vastleggen wie het is en namens wie (staat al in het platform) |

Is het antwoord "Nee", dan stopt de beslisboom hier — leg kort vast waaróm geen toetsing nodig was.

---

## Stap 2 — Toetsing via **openbare bronnen** (adviseur doet dit)

Voor de Opdrachtgever en, waar van toepassing, de wederpartij/target en de uiteindelijk belanghebbenden:

1. **KvK-uittreksel** — bestaat de rechtspersoon, wie is bestuurder/tekenbevoegd, geen ontbinding/faillissement.
2. **UBO-register** — wie zijn de uiteindelijk belanghebbenden (>25% belang/zeggenschap). Kloppen die met wat de cliënt zegt?
3. **Sanctielijsten** — EU-geconsolideerde sanctielijst en de nationale sanctielijst terrorisme; geen van de betrokken (rechts)personen/UBO's komt voor.
4. **PEP-indicatie** — is een betrokkene een politiek prominent persoon (of naaste/familie)? Zo ja: verscherpt onderzoek naar herkomst vermogen.
5. **Negatief nieuws** — korte open-bronnen-check (fraude, witwas, veroordelingen) op de betrokken namen.

Bevindingen kort vastleggen (datum, bron, uitkomst).

---

## Stap 3 — Toetsing **bij de cliënt zelf** (adviseur doet dit)

1. **Identiteit** — geldig identiteitsbewijs van de natuurlijke persoon die de opdracht tekent / de UBO; bij een rechtspersoon: bevestiging van de vertegenwoordigingsbevoegdheid.
2. **Structuur** — laat de cliënt de (groeps)structuur bevestigen; leg vast als die afwijkt van het KvK-/UBO-beeld.
3. **Doel en aard van de transactie** — verkoop, opvolging, aankoop; verwachte omvang; tijdlijn.
4. **Herkomst van de middelen** (vooral aan koperszijde en bij een PEP) — waar komt de koopsom vandaan (eigen middelen, bancaire financiering, investeerder)? Plausibel en verifieerbaar?
5. **Vragen bij een treffer/twijfel uit stap 2** — leg de bevinding voor en documenteer de reactie.

---

## Stap 4 — Uitkomst

| Uitkomst | Actie |
|---|---|
| Alles akkoord | Traject loopt door; bevestiging vastleggen (zie hieronder). |
| Openstaand punt, niet ernstig | Traject mag doorlopen; punt binnen [redelijke termijn] afronden; document pas versturen na afronding. |
| Sanctietreffer, of gerede twijfel over integriteit/herkomst middelen | **Opschorten** (art. 4 AV). Overleg met [specialist/BFT-lijn]. Niet doorgaan tot opgehelderd. |
| Wwft blijkt van toepassing (na JUR-1-toetsing) én er is een ongebruikelijke transactie | Melden bij **FIU-Nederland** conform de dan geldende procedure; melding gaat vóór de geheimhouding (art. 4 AV, slotzin). |

---

## Vastlegging — de bevestiging door de adviseur

De adviseur bevestigt per traject, vóórdat een bemiddelingsovereenkomst of transactiedocument wordt verstuurd of ondertekend:

> ☐ **Cliëntacceptatie getoetst.** Ik heb de identiteit en achtergrond van de betrokken partijen getoetst via **openbare bronnen** (KvK, UBO-register, sanctielijsten, PEP-/negatief-nieuws-check) **en bij de cliënt zelf** (identiteit, structuur, doel van de transactie, herkomst van middelen). Er zijn geen beletselen; eventuele openstaande punten zijn hieronder genoteerd.
>
> Getoetst door: __________________  Datum: __________  Opmerkingen: __________

**Aanbevolen technische uitwerking (feature, niet in deze ronde):** dit vinkje als verplicht veld in het begeleider-dashboard (`mna/04`) vóór `bgDoc('bem')` / het versturen van een contract; opslaan in een kolom op `mna_trajecten` (bijv. `clientacceptatie_getoetst`, `clientacceptatie_door`, `clientacceptatie_datum`, `clientacceptatie_notitie`) en tonen in marilyn. De cliënt vult dit **niet** in — alleen de adviseur.

---

*Laatst bijgewerkt: 2026-09-03. Bij de uitkomst van de Wwft-kwalificatietoets (JUR-1): deze beslisboom herzien en de FIU-meldprocedure concreet maken of definitief schrappen.*
