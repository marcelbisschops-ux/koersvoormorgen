# Cross-document consistentiecheck — ontwerpvoorstel

**Status:** voorstel voor Marcel. Nog geen code. Na akkoord op (a) de regelset en (b) de weergave bouw ik het, met een aparte onafhankelijke review van de AI-prompt (werkregel 19).
**Datum:** 2026-09-09. **Aanleiding:** fiscalist-feedback ("de killer feature is checken of documenten elkaar tegenspreken").

---

## 1. Wat het doet

Na het uploaden van de dataroom vergelijkt het platform documenten die over hetzelfde onderwerp iets zeggen, en meldt waar ze elkaar tegenspreken. Per bevinding toont het:

- **wat** er niet klopt (de twee waarden, en waar ze vandaan komen);
- **de bronpassage + paginanummer** in elk van de twee documenten;
- een oordeel **alleen over consistentie**, nooit over welke van de twee juist is (gouden standaard werkregel 8);
- de begeleider kan een bevinding **afvinken als verklaarbaar** met een notitie (bijv. "verschil zit in een correctie die in de toelichting staat").

Het is een hulpmiddel voor de begeleider, geen automatisch oordeel. Niets gaat automatisch naar een tegenpartij.

---

## 2. De regelset (voorstel: 7 checks, uitbreidbaar)

Elke check is een vaste regel: bron A, bron B, wat vergeleken wordt, en de tolerantie waarbinnen het "consistent" heet.

| # | Check | Bron A | Bron B | Vergelijking | Tolerantie |
|---|---|---|---|---|---|
| 1 | **Omzet jaarrekening ↔ verkoopmemorandum / teaser** | Jaarrekening (W&V, omzet per boekjaar) | Verkoopmemorandum / teaser (genoemde omzet) | Zelfde boekjaar, zelfde bedrag | ± 2 % of € 5.000 |
| 2 | **Werknemersaantal ↔ loonadministratie** | Personeelsoverzicht / organogram (aantal fte / koppen) | Loonjournaal / loonaangifte (aantal werknemers, totale loonsom) | Aantal koppen gelijk; loonsom ± consistent met jaarrekening-personeelskosten | aantal: exact; loonsom ± 5 % |
| 3 | **Aandeelhoudersregister ↔ UBO-opgave** | Aandeelhoudersregister / statuten | UBO-registeruittreksel / UBO-opgave | Zelfde natuurlijke personen, zelfde belang > 25 % | namen exact; belang ± 1 %-punt |
| 4 | **Fiscale eenheid ↔ organogram / KvK** | VPB-aangifte / beschikking fiscale eenheid | Organogram + KvK-uittreksels per entiteit | Alle entiteiten in de fiscale eenheid komen voor in het organogram, en omgekeerd | volledige overlap |
| 5 | **Rekening-courantpositie ↔ koopprijsmechanisme** | Jaarrekening (RC met aandeelhouder/gelieerde partij) | Dealvoorstel / LoI / SPA-concept (behandeling RC bij closing) | Genoemde RC-stand komt overeen; wordt hij afgelost/verrekend/overgenomen en staat dat ook zo in het mechanisme? | bedrag ± 2 %; behandeling expliciet benoemd ja/nee |
| 6 | **Pensioen- en bonusverplichtingen ↔ SPA-garanties** | Jaarrekening (voorzieningen) + pensioenbrief / bonusregeling | SPA-concept / biedingsbrief (garanties & vrijwaringen rond pensioen/bonus) | Elke materiële verplichting uit A is in B geadresseerd (garantie, vrijwaring of expliciet uitgesloten) | kwalitatief: geadresseerd ja/nee |
| 7 | **EBITDA-normalisaties ↔ grootboek / toelichting** | Waarderingsdossier (lijst normalisatieposten met bedrag) | Grootboek / jaarrekening-toelichting | Elke normalisatiepost is herleidbaar naar een grootboekrekening of toelichtingsregel met hetzelfde bedrag | bedrag ± 2 % per post; herleidbaar ja/nee |

Checks 1, 2 (loonsom), 5 (bedrag), 7 (bedrag) zijn **numeriek** — die kan het platform deterministisch afhandelen zodra de waarden geëxtraheerd zijn. Checks 2 (koppen), 3, 4, 6 en de "geadresseerd ja/nee"-delen zijn **kwalitatief** — daar leest de AI beide documenten en levert een gestructureerd "claim"-lijstje met bronpassage; de vergelijking zelf blijft daarna een simpele match, geen vrije-tekst-oordeel.

**Vraag aan jou:** kloppen deze 7? Wil je er checks bij (bijv. huur jaarrekening ↔ huurovereenkomst, of debiteuren jaarrekening ↔ ouderdomsanalyse), of eentje eruit?

---

## 3. Hoe het technisch werkt (kort)

1. **Claim-extractie per document.** Bij upload (of bij het draaien van de check) haalt één AI-aanroep per document een set gestructureerde *claims* op: `{onderwerp, waarde, eenheid, boekjaar, bronpassage (letterlijk citaat), pagina}`. Onzeker → de claim wordt niet opgenomen (nooit gokken).
2. **Regelmotor.** Voor elke van de 7 checks: zoek de claims van type A en type B, vergelijk volgens de regel, bepaal `consistent | afwijking | onvoldoende_data`.
3. **Opslag.** Resultaat in een nieuwe tabel `mna_consistentie` (per traject, per check: status, waarde A, waarde B, doc A + pagina, doc B + pagina, citaat A, citaat B, afgevinkt-door + notitie). Valt onder de traject-verwijdercascade (heeft `traject_id`).
4. **Herdraaien** wanneer er documenten zijn bijgekomen; badge bij de begeleider als de dataroom is gewijzigd sinds de laatste check.

Geen nieuwe kosten voor de gebruiker in v1 (draait op de bestaande AI-aanroep-begroting; claim-extractie hergebruikt waar mogelijk de al opgeslagen `veld_extractie`).

---

## 4. Weergave (voorstel)

Een blok in het **begeleider-dashboard** (mna.html), naast AI-signalen, alleen zichtbaar voor begeleider (niet koper/verkoper):

```
CONSISTENTIE TUSSEN DOCUMENTEN                          [ Opnieuw controleren ]
7 checks · 4 consistent · 2 afwijking · 1 onvoldoende data

⚠  Omzet jaarrekening ↔ verkoopmemorandum (boekjaar 2025)
     Jaarrekening 2025:            € 2.480.000   — jaarrekening-2025.pdf, p. 7
     Verkoopmemorandum:            € 2.650.000   — verkoopmemorandum.docx, p. 3
     "Netto-omzet 2.480" · "een omzet van circa 2,65 miljoen"
     [ Verklaarbaar — notitie toevoegen ]

✓  Aandeelhoudersregister ↔ UBO-opgave
     Beide: J. de Vries 60 %, M. de Vries 40 %

—  EBITDA-normalisaties ↔ grootboek
     Onvoldoende data: geen grootboek geüpload.
```

- **⚠ afwijking**: twee waarden naast elkaar, elk met documentnaam + pagina, plus het letterlijke citaat eronder. Knop "Verklaarbaar" → notitieveld; daarna verschijnt de bevinding ingeklapt met de notitie.
- **✓ consistent**: één regel, dichtgeklapt.
- **— onvoldoende data**: benoemt welk document ontbreekt (nudge om het te uploaden), telt niet als probleem.
- Geen enkele formulering die zegt welk getal "goed" is. Het platform stelt alleen vast dát ze verschillen.

**Vraag aan jou:** dit blok in het begeleider-dashboard, of liever een eigen tabblad/scherm? En: wil je dat een openstaande ⚠ het genereren van het verkoopmemorandum/dealvoorstel *blokkeert* tot hij is afgevinkt, of alleen een waarschuwing?

---

## 5. Bouwvolgorde na akkoord

1. Tabel `mna_consistentie` + cascade + AVG-check (nieuwe-tabel-checklist CLAUDE.md).
2. Claim-extractie-prompt + **onafhankelijke review van die prompt** (werkregel 19) vóór ik hem live zet — dit is een AI-tekst die de begeleider gebruikt richting een tegenpartij-document.
3. Deterministische regelmotor voor de 7 checks + `scripts/check-consistentie-output.mjs` (los reken-/vergelijkscript op een testdossier, zoals bij de rekenkern).
4. Endpoint `POST /mna/consistentie/check/{code}` (begeleiderAuth) + `GET /mna/consistentie/{code}`.
5. Weergaveblok in `mna/04-begeleider-dashboard.js` + afvink-endpoint.
6. Handleiding bijwerken in `mna/08-handleiding.js` én `adv.html` (werkregel 10).
7. Testdossier met bewust ingebouwde tegenstrijdigheden (testdocumenten-standaard punt 3: ook het foutpad testen).

---

## Status 9 sep 2026: GEBOUWD en live

Gekozen invulling van de twee open vragen (Marcel: "kies zelf optimale"):
- **7 paren**: ongewijzigd overgenomen zoals hierboven.
- **Blokkeren of waarschuwen**: alleen **waarschuwen**. Een openstaande afwijking blokkeert het
  genereren van het verkoopmemorandum/dealvoorstel niet — een harde blokkade op een consistentie-
  signaal zou de begeleider klemzetten bij een verklaarbaar verschil. Het blok toont het aantal open
  afwijkingen prominent en klapt vanzelf open zolang er iets openstaat.

Implementatie: `worker/30-consistentie.js`, tabel `mna_consistentie`, blok in het begeleider-
dashboard (`mna/04`), handleiding in `mna/08` + `adv.html`, `scripts/check-consistentie-output.mjs`,
audit-consistentie check 12.
