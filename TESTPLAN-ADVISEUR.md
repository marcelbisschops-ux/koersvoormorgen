# Testplan — complete adviseursflow (5 juli 2026)

Een echt testaccount staat al klaar op **marcel.bisschops@gmail.com**. Werk dit van boven naar beneden af — vink af wat werkt, noteer wat niet klopt.

**Tip:** gebruik voor de verkoper/koper-e-mailadressen in het traject een "+"-toevoeging aan uw eigen adres, bijv. `marcel.bisschops+verkoper@gmail.com` en `marcel.bisschops+koper@gmail.com`. Die e-mails komen gewoon in uw eigen inbox terecht — zo ziet u élke systeemmail die verstuurd wordt, ook die aan "andere partijen".

---

## Deel 1 — Account activeren (adviseur)

- [ ] Uitnodigingsmail ontvangen op marcel.bisschops@gmail.com? (kijk ook bij spam)
- [ ] Klik "Account activeren" → kom ik op een activeringsscherm terecht?
- [ ] Wachtwoord instellen → word ik na activering doorgestuurd naar **adv.html** (niet marilyn!)
- [ ] Verschijnt het scherm **"Gebruiksvoorwaarden accepteren"**? Lees de tekst — klopt de inhoud?
- [ ] Vinkje aanzetten → wordt de knop "Ga akkoord en verder" pas dan actief?
- [ ] Na akkoord: kom ik in mijn dashboard met 0 trajecten?

## Deel 2 — Huisstijl instellen (optioneel, test de white-label)

- [ ] Klik **"🎨 Huisstijl"** rechtsboven
- [ ] Vul een testnaam in (bijv. "TestScope Pro"), een kleur (bijv. `#9c3fd4`), laat logo leeg
- [ ] Opslaan → verschijnt de bevestiging?
- [ ] (Bewaar deze instelling — u test het effect ervan in Deel 4)

## Deel 3 — Een traject aanmaken

- [ ] Klik **"+ Nieuw traject"**
- [ ] Vul in: Type = Verkoop, Sector = naar keuze, Opdrachtgever = Verkoper
- [ ] Naam onderneming: "Testkantoor Adviseur BV"
- [ ] Contactpersoon: uw naam, e-mail: `marcel.bisschops+verkoper@gmail.com`
- [ ] Koper (optioneel invullen): naam + `marcel.bisschops+koper@gmail.com`
- [ ] Klik Aanmaken → verschijnen er 2-3 codes met kopieerknoppen?
- [ ] Noteer de 3 codes hieronder (of kopieer ze naar een los notitieblok):
  - Verkopercode: ______________
  - Kopercode: ______________
  - Uw tussenpersoonscode: ______________

## Deel 4 — Zelf inloggen als begeleider (tussenpersoon)

- [ ] Ga naar **mna.html**, voer uw tussenpersooncode in
- [ ] Verschijnt de **Verwerkersovereenkomst-popup**? Naam invullen + Akkoord
- [ ] Staat in het dashboard uw eigen huisstijl-naam/kleur uit Deel 2? (header + knoppen)
- [ ] Zijn alle documentknoppen zichtbaar en actief: NDA, LoI, BEM, Excl, Dealvoorstel, Indicatieve bieding, Concept-SPA?
- [ ] Klik **elk document** één voor één, genereer, controleer:
  - [ ] Tekst is logisch ingevuld (geen `[placeholders]` blijven staan)
  - [ ] Bij **Dealvoorstel**: klik in de tekst en typ iets — is het echt aanpasbaar?
  - [ ] Test bij minstens 1 document de knop **"eigen PDF uploaden"** (elk .pdf-bestand van uw Mac werkt als test)
  - [ ] Verstuur een document naar de testadressen → komt de e-mail aan?
- [ ] Vul een paar DD-velden in bij "Bekijk data" (financieel tabblad)
- [ ] Klik **"⚙ AI-analyse genereren"** → verschijnt een analyse? Ververs de pagina — blijft de analyse zichtbaar met tijdstempel?
- [ ] Ga naar **Waardering** → genereer een AI-waarderingsrapport → zelfde check (blijft na verversen zichtbaar met "↻ Opnieuw")
- [ ] Test **"+ Gesprek vastleggen"** → vul in, sla op
- [ ] Test **"📋 Informatieverzoek"**

## Deel 5 — Inloggen als verkoper

- [ ] Log uit, ga naar mna.html, voer de **verkopercode** in
- [ ] Ziet u het AVG/beveiligingsblokje? Staat daar **uw eigen naam** (als begeleider) genoemd als verwerkingsverantwoordelijke, met klikbare e-mail?
- [ ] Vul een paar DD-velden in, upload een testbestand (bijv. een simpel .csv of .xlsx met wat cijfers) → wordt het automatisch geanalyseerd/ingevuld?

## Deel 6 — Inloggen als koper

- [ ] Log uit, voer de **kopercode** in
- [ ] Zonder vrijgave: ziet u "Informatie nog niet beschikbaar"?
- [ ] Ga terug naar het begeleider-dashboard (tussenpersoonscode) → klik **"🔓 Koper-toegang"** → geef 1-2 categorieën vrij
- [ ] Log opnieuw in als koper → ziet u nu alléén de vrijgegeven categorieën?

## Deel 7 — Traject afsluiten (let op: onomkeerbaar!)

⚠️ **Test dit NIET op een traject dat u nog nodig heeft** — na afsluiten is het traject read-only en worden documenten na 14 dagen definitief verwijderd. Gebruik dit testtraject ervoor, geen bestaand dossier.

- [ ] Log in als begeleider → klik **"🏁 Traject afsluiten"**
- [ ] Lees de bevestigingstekst goed — klopt de uitleg?
- [ ] Bevestig → ontvangt u een e-mail met downloadlink?
- [ ] Open de link → is het een geldige ZIP met alle documenten + een DD-eindrapport-PDF?

## Deel 8 — Losse pagina's controleren

- [ ] `handleiding.html` — leesbaar, kloppen de stappen met wat u net deed?
- [ ] `platformvoorwaarden.html` — laadt de tekst correct?
- [ ] `privacy.html` — kloppen de bewaartermijnen met wat u in Deel 7 zag (14 dagen)?

---

**Alles gevonden dat niet klopt?** Meld het gewoon — dat is precies waar dit testplan voor is.

**Opruimen na het testen:** zeg het, dan verwijder ik het testaccount en het testtraject weer (of laat staan als u het account wilt aanhouden voor toekomstige tests).
