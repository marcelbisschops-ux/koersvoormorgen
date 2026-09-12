# KVM Quality Gate — end-to-end rolperspectief

**Vastgelegd:** 12 september 2026, na een live testronde door Marcel (als adviseur) die 15+ bugs blootlegde die alle bestaande audits/tests hadden gemist — waaronder een NDA die bij printen de inhoud van het verkoopmemorandum toonde. Dit document is een **vierde, gelijkwaardige standaard** naast `AUDIT-STANDAARD.md`, `CROSS-PATH-SECURITY-STANDAARD.md` en `RED-TEAM-PENTEST-STANDAARD.md` — geen vervanging, een aanvulling die een ander soort gat dicht.

## Het gat dat dit dicht

De drie bestaande standaarden testen of het systeem **correct en veilig** is: klopt de rekenkern, lekt data niet tussen rollen/trajecten, houdt de auth stand tegen actief misbruik. Ze testen niet of een **rol het bedoelde werkproces daadwerkelijk kan uitvoeren zoals in de praktijk**: staat de knop er, staat hij op de goede plek, bevat het gegenereerde document echt de juiste inhoud, kan de gebruiker daarna logisch verder. Een API-test die bevestigt dat `/mna/document/genereren` 200 teruggeeft, bewijst niet dat de juiste tekst in het scherm verschijnt wanneer een echte gebruiker op de echte knop klikt.

Dat gat toonde zich hard op 12 sep 2026: alle drie bestaande standaarden waren op dat moment groen, en toch bleek printen van een NDA het verkoopmemorandum te tonen.

## Geldt voor ALLE rollen

Niet alleen adviseur. **Verkoper, koper, begeleider (Marcel/admin), adviseur (extern, `adv.html`), meekijker, eigen specialist** — elke rol heeft een eigen scherm en een eigen bedoeld werkproces, en elke rol kan op dezelfde manier stuklopen op een verkeerd geplaatste knop, een leeg gebleven veld, of een document met de verkeerde inhoud.

## De twee kernprincipes

**1. Rol Click-Through Test.** Niet: werkt de feature technisch? Maar: kan [rol] het bedoelde proces daadwerkelijk van begin tot eind uitvoeren, zoals in de praktijk?

De test volgt het échte scherm en de échte volgorde:
1. start vanuit de positie waarin die rol daadwerkelijk binnenkomt (login/uitnodiging);
2. doorloop het volledige proces in de natuurlijke werkvolgorde, niet de volgorde waarin de code gebouwd is;
3. gebruik de zichtbare knoppen, formulieren, filters, downloads, prints en documenten — niet een kortere technische route eromheen;
4. controleer niet alleen of een actie technisch slaagt, maar of de juiste informatie, status, berekening of output zichtbaar wordt;
5. controleer gegenereerde documenten daadwerkelijk op **inhoud, naam, type en context** (bevat het NDA-document NDA-tekst en geen verkoopmemo-tekst? staat de juiste tegenpartij erin?);
6. controleer dat de volgende stap logisch aansluit op de vorige — geen doodlopende navigatie, geen ontbrekende trigger/melding;
7. controleer het eindresultaat zoals de rol dat daadwerkelijk aan een tegenpartij/klant zou laten zien.

**2. Foutpropagatie-check.** Een gevonden fout is nooit alleen een fout in dat ene scherm — het is bewijs dat hetzelfde patroon elders opnieuw onderzocht moet worden.

Zodra een fout wordt gevonden: direct vaststellen "waar komen nog meer onderdelen voor met dezelfde functionaliteit, hetzelfde patroon, hetzelfde component, dezelfde documentlogica of dezelfde gebruikersflow?" — en die vergelijkbare onderdelen meteen meecontroleren. Voorbeelden:
- fout in één documenttype → alle documenttypes controleren;
- verkeerd document bij printen → alle print-/downloadacties controleren;
- fout in één berekening → alle vergelijkbare berekeningen controleren;
- fout in één klantflow → alle vergelijkbare klantflows controleren;
- fout in één knop/component (bijv. een hergebruikt element-id) → alle toepassingen van dat component/id controleren;
- fout in één rol → dezelfde actie voor alle relevante rollen controleren;
- fout in één statusovergang → alle vergelijkbare statusovergangen controleren;
- fout in één export → alle exports controleren;
- fout in één formulier → alle formulieren met dezelfde componenten/validatielogica controleren.

De gedachte: een gevonden fout bewijst dat het onderliggende patroon opnieuw onderzocht moet worden — niet "deze ene fout is opgelost", maar "dit patroon is nu overal gecontroleerd".

**FOUTPROPAGATIE-CHECK → direct uitvoeren, niet registreren voor later (CLAUDE.md werkregel 28, geen uitzondering hierop).** Een gevonden patroon activeert onmiddellijk onderzoek van alle vergelijkbare onderdelen — niet "ik heb nog N vergelijkbare gevallen geïdentificeerd, die zet ik op de backlog". De uitkomst is pas klaar wanneer die onderdelen daadwerkelijk zijn gecontroleerd én noodzakelijke fixes en regressietests zijn uitgevoerd, binnen de huidige opdracht. Dit geldt evengoed voor de Rol Click-Through hierboven: een rol/scherm dat nog niet is doorlopen wordt nu doorlopen, niet op een lijst gezet voor "een volgende keer". Alleen een echte externe blokkade (een beslissing die niet aan Claude is, ontbrekende toegang, een externe partij) is een geldige reden om iets als openstaand te melden — en zelfs dan wordt al het overige dat wél uitvoerbaar is meteen afgehandeld.

## De drie kwaliteitslagen

| Laag | Dekt | Bestaande/nieuwe tooling |
|---|---|---|
| **1 — Technische correctheid** | unit, API, integratie, rekenkern, database, security, autorisatie/rolscheiding | `tests/e2e-api.mjs`, `tests/audit-consistentie.mjs`, `tests/audit-backend.mjs`, rekenkern-scripts |
| **2 — Functionele correctheid** | e2e-workflows, documentgeneratie, statusovergangen, foutafhandeling | `tests/e2e-crosspath-fixes.mjs`, `tests/e2e-tos.mjs` |
| **3 — Werkelijke gebruikerservaring** | echte klikvolgorde, zichtbaarheid, juiste output/documenten, logische vervolgstappen, volledige rolflow van begin tot eind | `tests/e2e-ui.spec.js` — sectie "Rol Click-Through" (nieuw, zie hieronder) |

Een feature die het rolpad raakt is pas gereed wanneer **alle drie lagen** zijn gecontroleerd — laag 1/2 groen is niet voldoende.

## KVM Quality Gate — de pijplijn

```
FEATURE → TECHNISCHE TEST → FUNCTIONELE TEST → ROL CLICK-THROUGH → FOUTPROPAGATIE-CHECK → REGRESSIE → DONE
```

Elke wijziging die een rolpad, klantproces, documentproces, berekening, rapportage of workflow raakt doorloopt deze keten voordat hij als "af" telt.

## Definition of Done

Een wijziging die het rolpad raakt is niet af zolang alleen code/API/geautomatiseerde tests groen zijn. Vereist:
- [ ] technische tests uitgevoerd (laag 1);
- [ ] functionele/e2e-tests uitgevoerd (laag 2);
- [ ] echte Rol Click-Through uitgevoerd voor elke geraakte rol (laag 3);
- [ ] relevante output/documenten daadwerkelijk op inhoud gecontroleerd (niet alleen "gegenereerd: ja/nee");
- [ ] vergelijkbare onderdelen gecontroleerd op hetzelfde foutpatroon (Foutpropagatie-check);
- [ ] regressiecontrole van het volledige relevante rolpad uitgevoerd, in de volgorde waarin die rol het systeem daadwerkelijk gebruikt.

## Hoe dit technisch is vastgelegd (niet alleen een belofte)

1. **`tests/e2e-ui.spec.js`, sectie "Rol Click-Through Documentcontent"** (nieuw): een Playwright-testblok dat voor elk gegenereerd documenttype (nda/loi/bem/excl/teaser/verkoopmemo/dealvoorstel/spa) een echt document genereert via de echte knop, en asserteert dat de output **wél** het typespecifieke merkteken bevat en **niet** een merkteken van een ander documenttype — dit vangt exact de bugklasse van 12 sep 2026 (NDA toont verkoopmemo) automatisch, bij elke push.
2. **`tests/audit-consistentie.mjs`, check 14** (nieuw): vergrendelt specifiek de generatiebewaking (`_mouGen`) die de NDA/LoI/MOU-race van 12 sep 2026 dichtte — faalt de push zodra die bewaking (deels) verdwijnt. Een generieke detector die élk hergebruikt element-id in `mna/*.js` automatisch opspoort is bewust nog niet gebouwd: een eerste opzet bleek te ruw (te veel functioneel onschuldig hergebruik tussen elkaar uitsluitende schermen), en deze audit blokkeert bij elke bevinding élke push — een ruwe versie zou dus valse blokkades geven. Dit blijft een open verbeterpunt (zie Logboek hieronder), op te pakken met een preciezere, per-scherm-bewuste analyse.
3. **Pre-push hook (`.githooks/pre-push`)** draait beide al bij elke push — een falende Rol Click-Through-test of check 14 blokkeert de push net zoals elke andere audit-/testfout, geen los "let erop"-stapje.
4. **`CLAUDE.md` werkregel 27** (nieuw, GOUDEN STANDAARD) verwijst hierheen en koppelt dit aan werkregel 12 (periodieke audit — dit wordt de vierde periodieke standaard), werkregel 19 (tegenspraak-stap bij de vier risicozones — een wijziging aan zone b/d is pas af ná een Rol Click-Through) en werkregel 24 (na elke wijziging teksten/links/logica doornemen — dit maakt "logica" voor het rolpad concreet toetsbaar).

## Waarom dit een volgende feature niet kan overslaan

Niet omdat het beloofd is, maar omdat het **faalt als het niet gebeurt**: een nieuw documenttype dat wordt toegevoegd zonder toe te voegen aan de content-assertion-lijst in `tests/e2e-ui.spec.js`, of een nieuw hergebruikt element-id zonder dekking, wordt door check 14 en/of de Playwright-suite gevangen bij de eerstvolgende push — dezelfde harde stop als nu al geldt voor `tests/audit-consistentie.mjs` in het geheel. De discipline zit dus niet alleen in CLAUDE.md, maar in de pre-push-hook die toch al elke push tegenhoudt bij een falende check.

## Logboek van uitgevoerde Rol Click-Through-rondes

| Datum | Rol(len) | Bevindingen | Status |
|---|---|---|---|
| 12 sep 2026 | Adviseur (Marcel, live) | 15+ bevindingen: NDA toont verkoopmemo bij printen (kritiek), meerdere kapotte generatieknoppen, navigatiegat adviseur↔begeleider, vaste voettekst-eis, redflag-zichtbaarheid, wijzigingenlog-attributiebug, en meer — zie `OPEN-BEVINDINGEN.md` voor de volledige, individueel afgevinkte lijst. | In behandeling |
