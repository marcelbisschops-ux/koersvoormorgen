# INCIDENTPROCEDURE.md — beveiligings- en datalek-procedure Koers voor Morgen

**Status:** operationele werkinstructie (geen contractdocument). Vastgesteld 2026-09-09.
**Eigenaar:** Marcel Bisschops (Bisschops Financing B.V., h.o.d.n. koersvoormorgen.nl).
**Reikwijdte:** het Koers voor Morgen-platform (Cloudflare Worker `kantoorinzicht`, D1 `kantoorinzicht`, R2 `kantoorinzicht-docs`), de frontend op `koersvoormorgen.nl`, en de e-mailstroom via Resend.
**Samenhang:** de contractuele meld- en medewerkingsplichten staan in de Verwerkersovereenkomst (VOK art. 8, 72 uur) en de Gebruiksvoorwaarden; zie [`LEGAL_ISSUES.md`](LEGAL_ISSUES.md) ISSUE-15 en [`FASE5-WIJZIGINGEN.md`](FASE5-WIJZIGINGEN.md). Herstel/rollback: [`../scripts/README-backup.md`](../scripts/README-backup.md).

Dit document beschrijft wat er feitelijk gebeurt bij een (vermoed) beveiligingsincident. De AVG-meldplicht bij de Autoriteit Persoonsgegevens is **72 uur na kennisname** van een datalek; de VOK legt dezelfde 72 uur op richting de adviseur. Alles hieronder is daarop ingericht.

---

## 0. Wat telt als incident

Elk van deze situaties start deze procedure:

- ongeautoriseerde toegang tot, of uitstroom van, trajectdata, documenten, e-mailadressen of inloggegevens;
- een cross-rol- of cross-traject-lek (rol X ziet data van rol Y; traject A-sleutel werkt op traject B) — dit platform heeft die klasse fouten eerder gehad, zie de geheugens/`SECURITY-INVARIANTS.md`;
- verlies of onbedoelde vernietiging van data (mislukte migratie, foutieve verwijder-cascade, corrupte D1-staat);
- een gecompromitteerd secret (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ADMIN_KEY`, Cloudflare-token, GitHub-PAT);
- misbruik van een publiek endpoint dat data raakt (bruteforce op codes, scraping van trajectinhoud);
- een melding van buitenaf (adviseur, cliënt, onderzoeker) die op één van bovenstaande wijst.

Twijfel je of iets een incident is? Dan behandel je het als incident tot het tegendeel blijkt. Onderschatten kost meer dan de procedure draaien.

---

## 1. Direct (eerste ~60 minuten): vaststellen en insluiten

1. **Tijd en bron noteren.** Open een incidentlog (los tekstbestand, datum in de naam). Noteer: hoe kwam het binnen, hoe laat, wie/wat is de bron. Vanaf hier tikt de 72-uursklok voor de AP-melding als er persoonsgegevens bij betrokken kunnen zijn.
2. **Bewijs veiligstellen vóór je iets verandert.** `npx wrangler tail` live meelezen en wegschrijven; relevante Cloudflare-logs, D1-query-uitvoer en e-maillogs (Resend-dashboard) exporteren. Maak zo nodig direct een handmatige back-up: `bash scripts/backup.sh` (D1-export + documentenkopie).
3. **Insluiten, gericht:**
   - Gecompromitteerd secret → **onmiddellijk roteren**: `npx wrangler secret put NAAM` met een nieuwe waarde, oude waarde als ongeldig beschouwen (staat mogelijk al buiten je controle). Bij een Cloudflare-token of GitHub-PAT: intrekken in het betreffende dashboard.
   - Kwetsbaar endpoint / kapotte rolgrens → fix-forward als het klein en zeker is; anders het endpoint tijdelijk dichtzetten (403 teruggeven of de route uitschakelen) en deployen. Een korte storing is beter dan doorlopende uitstroom.
   - Kapotte productie door een net gedeployde wijziging → **eerst herstellen** naar de vorige Worker-Version-ID (`npx wrangler deploy` van de vorige versie, ID staat in elke eerdere deploy-uitvoer), pas daarna oorzaak zoeken. Dit is werkregel 2 (fix-forward, met productie-incident als uitzondering).
   - Datacorruptie/verlies → D1 **Time Travel** naar het laatste bekende goede moment (dekt 30 dagen), of herstel uit `scripts/backup.sh`-export. Niets overschrijven vóór de export van de huidige (foute) staat gemaakt is.
4. **Eén statuslijn** in het incidentlog: wat weet je nu zeker, wat is ingesloten, wat staat nog open.

---

## 2. Binnen 24 uur: reikwijdte bepalen

Beantwoord, met data (werkregel 5: geen diagnose zonder logs):

- **Welke gegevens** zijn geraakt? (trajectvelden, documenten, e-mailadressen, namen, inloghashes, dealprijzen)
- **Van wie?** Welke trajecten, welke adviseurs, welke cliënten (verkoper/koper/meekijker). Maak een concrete lijst met traject-ID's.
- **Hoeveel** records/documenten.
- **Is er daadwerkelijk uitgestroomd** of alleen *potentieel* toegankelijk geweest? (log-bewijs van externe toegang vs. theoretische mogelijkheid)
- **Persoonsgegevens betrokken?** Zo ja → AVG-datalek-traject (stap 3). Vrijwel alle trajectdata bevat persoonsgegevens, dus dit is bijna altijd "ja".
- **Bijzondere categorieën of hoog risico?** (financiële positie van een identificeerbare onderneming/persoon telt als gevoelig in de praktijk van dit platform)

Leg de conclusie vast in het incidentlog als expliciete beoordeling, niet als aanname.

---

## 3. AVG-datalekbeoordeling en meldingen

### 3a. Melden bij de Autoriteit Persoonsgegevens (binnen 72 uur na kennisname)

Melden is verplicht **tenzij** het lek waarschijnlijk **geen** risico voor betrokkenen oplevert (art. 33 lid 1 AVG). Gezien de aard van de data (financiële bedrijfsdata, dealinformatie) is "geen risico" hier zelden houdbaar. Bij twijfel: **melden**. Een melding kan later aangevuld of ingetrokken worden; een gemiste melding niet.

- Melden via het meldloket van de AP (autoriteitpersoonsgegevens.nl). 
- Heb je binnen 72 uur nog niet alles scherp? Doe een **eerste melding met wat je weet** en vul later aan (art. 33 lid 4 AVG staat dat expliciet toe).
- Leg vast: meldingsdatum/-tijd, referentienummer, wat is gemeld.

**Rolverdeling:** voor trajectdata is de **adviseur** verwerkingsverantwoordelijke en Bisschops Financing B.V. verwerker (VOK). De verwerker meldt niet zelf bij de AP; de verwerker **informeert de verwerkingsverantwoordelijke** (stap 3c) zodat die kan melden. Voor platform-eigen verwerkingen (accounts, beveiligingslogging, facturatie) is Bisschops Financing B.V. zelf verwerkingsverantwoordelijke en meldt dan wél zelf.

### 3b. Betrokkenen informeren (zonder onredelijke vertraging)

Verplicht als het lek **waarschijnlijk een hoog risico** voor betrokkenen oplevert (art. 34 AVG), tenzij de data onleesbaar was voor onbevoegden (bijv. sterke versleuteling) of vervolgmaatregelen het hoge risico hebben weggenomen. Voor trajectdata: ga uit van informeren, tenzij goed onderbouwd anders.

De feitelijke communicatie naar cliënten loopt in beginsel via de **adviseur** (die heeft de klantrelatie). Bisschops Financing B.V. levert de adviseur binnen dezelfde termijn alle informatie die daarvoor nodig is en een concept-tekst.

### 3c. Adviseur(s) informeren — VOK art. 8: binnen 72 uur

Voor elk geraakt traject: mail de begeleidende adviseur, ook als de reikwijdte nog niet compleet is.

Inhoud van dat bericht:
- wat er is gebeurd, in gewone taal;
- welke van zijn trajecten/cliënten geraakt zijn (concreet);
- welke gegevens, en of uitstroom is vastgesteld of alleen mogelijk was;
- welke maatregelen al genomen zijn;
- dat hij als verwerkingsverantwoordelijke zelf de AP-melding (art. 33) en eventueel de betrokkeneninformatie (art. 34) beoordeelt, en dat wij daarbij ondersteunen met alle benodigde informatie en een concepttekst;
- een contactpunt (Marcel) voor vragen en afstemming van de timing van externe communicatie.

Verzenden via de bestaande `verstuurExterneMail`-functie of rechtstreeks; bewaar een kopie in het incidentlog.

---

## 4. Herstel en nazorg

1. **Definitieve fix** (niet alleen de insluiting). Volledige impact-check + echte test (werkregel 3: het hele systeem, niet alleen het gewijzigde deel). Bij een rolgrens-/cross-traject-fout: expliciet het negatieve geval testen (rol X mag data van rol Y niet zien) en de regressie als permanente test toevoegen aan `tests/e2e-crosspath-fixes.mjs` (zie `SECURITY-INVARIANTS.md`).
2. **Monitoring** aanscherpen op de gebruikte route (extra logging, rate-limit, alerting) tot je zeker weet dat het dicht is.
3. **UptimeRobot** en `/health` bevestigen groen; `veiligheidsdashboard` in marilyn bijwerken.
4. **Post-mortem** in het incidentlog: tijdlijn, oorzaak (root cause, niet het symptoom), waarom bestaande checks het niet vingen, welke check/test/afspraak dat voortaan wel doet. Als er een structurele werkregel uit volgt: toevoegen aan `CLAUDE.md` en aan het geheugen.
5. **Bewaren:** incidentlog + bewijs minimaal 3 jaar, los van de trajectdata-bewaartermijn (nodig voor eventuele geschillen/handhaving). Nooit met echte cliëntnamen in de git-repo (werkregel 14) — het incidentlog blijft lokaal / in de back-upmap.
6. **Bij een gemelde kwetsbaarheid van buitenaf:** de melder een korte terugkoppeling geven dat het is opgelost. Geen beloning toegezegd, wel nette bejegening.

---

## 5. Rolkaart en contact

| Rol | Wie | Doet |
|---|---|---|
| Incidentcoördinator | Marcel Bisschops | alle beslissingen, alle externe communicatie, AP-melding waar BF verwerkingsverantwoordelijke is |
| Techniek/insluiting | Marcel + Claude Code | bewijs veiligstellen, roteren, fix-forward/rollback, herstel |
| Verwerkingsverantwoordelijke trajectdata | de betreffende adviseur | AP-melding art. 33, betrokkeneninformatie art. 34, met ondersteuning van BF |

Contact / meldpunt: **marcel@bisschopsfinancing.nl**. Voor het platform: via **koersvoormorgen.nl**.

---

## 6. Checklist (afvinken per incident)

- [ ] Incidentlog geopend, tijd + bron genoteerd (72u-klok loopt)
- [ ] Bewijs veiliggesteld (wrangler tail, logs, `backup.sh`)
- [ ] Ingesloten (secret geroteerd / endpoint dicht / rollback / Time Travel)
- [ ] Reikwijdte bepaald: welke data, van wie, hoeveel, uitgestroomd ja/nee
- [ ] Datalekbeoordeling vastgelegd (persoonsgegevens? hoog risico?)
- [ ] AP-melding gedaan of gemotiveerd niet (binnen 72u)
- [ ] Adviseur(s) geïnformeerd (binnen 72u, VOK art. 8)
- [ ] Betrokkenen geïnformeerd of gemotiveerd niet
- [ ] Definitieve fix + regressietest in `tests/e2e-crosspath-fixes.mjs`
- [ ] Post-mortem geschreven; werkregel/geheugen bijgewerkt indien nodig
- [ ] Incidentlog + bewijs gearchiveerd (lokaal, 3 jaar)
