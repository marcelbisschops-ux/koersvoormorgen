// ── HANDLEIDING ──────────────────────────────────────────────────────────
// Eén pagina, secties per rol (Verkoper/Koper/Begeleider/Adviseur) — iedereen ziet ook wat de
// andere rollen doen, dat geeft nuttige context. Bereikbaar via de "Handleiding"-link in het
// dashboard, en rechtstreeks via mna.html?code=XXXX&screen=handleiding (bijv. vanuit de
// uitnodigingsmail). Werkregel (Marcel, 25 juli 2026): bij elke gebruikersgerichte wijziging aan
// het platform hoort deze pagina in dezelfde wijziging bijgewerkt te worden — zie CLAUDE.md.
function renderHandleiding(){
  var terugScherm = isTussen() ? 'begeleider' : 'main';
  var html = '<div class="wrap anim"><div class="hdr"><div class="brand">'+brandMerkHtml()+BRAND.platform+' &middot; Handleiding</div>'
    + '<button class="btn-ghost btn-sm" onclick="S.screen=\''+terugScherm+'\';renderApp()">&#8592; Terug naar dashboard</button></div>';

  html += '<div style="font-family:Playfair Display,serif;font-size:1.5rem;color:var(--head);font-weight:600;margin-bottom:.25rem">Handleiding '+esc(BRAND.platform)+'</div>';
  html += '<div style="font-size:13px;color:var(--muted);margin-bottom:1.5rem">Uitgebreide handleiding voor alle rollen — verkoper, koper, begeleider en adviseur. Uw eigen rol staat als eerste.</div>';

  // Sticky mini-nav naar de vier secties
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2rem;position:sticky;top:0;background:var(--void);padding:.5rem 0;z-index:5;border-bottom:1px solid var(--border)">'
    + ['verkoper','koper','begeleider','adviseur'].map(function(r){
        var labels={verkoper:'Verkoper',koper:'Koper',begeleider:'Begeleider',adviseur:'Adviseur (account)'};
        return '<a href="#hl-'+r+'" class="btn-ghost btn-sm" style="text-decoration:none">'+labels[r]+'</a>';
      }).join('')
    + '</div>';

  function sectie(id, titel, inhoud){
    return '<div id="hl-'+id+'" class="panel" style="margin-bottom:1.5rem;scroll-margin-top:4rem">'
      + '<div style="font-family:Playfair Display,serif;font-size:1.2rem;color:var(--head);font-weight:600;margin-bottom:1rem">'+titel+'</div>'
      + inhoud + '</div>';
  }
  function stap(nr, titel, tekst){
    return '<div style="display:flex;gap:12px;margin-bottom:1rem;align-items:flex-start">'
      + '<div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--teal-bg);color:var(--teal);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center">'+nr+'</div>'
      + '<div><div style="font-weight:600;color:var(--head);font-size:13px;margin-bottom:.2rem">'+titel+'</div><div style="font-size:13px;color:var(--mid);line-height:1.65">'+tekst+'</div></div>'
      + '</div>';
  }

  // ── VERKOPER ──
  var volgorde = (S.rol==='koper') ? ['koper','verkoper','begeleider','adviseur']
    : (S.rol==='tussenpersoon') ? ['begeleider','verkoper','koper','adviseur']
    : ['verkoper','koper','begeleider','adviseur'];

  var secties = {};
  secties.verkoper = sectie('verkoper', '👤 Verkoper', ''
    + stap(1,'Inloggen','U logt in op <code>mna.html</code> met uw persoonlijke <strong>verkopercode</strong> (van uw adviseur ontvangen). Deze code is persoonlijk — deel hem niet met derden.')
    + stap(2,'De 7 informatiefases doorlopen','Het dossier is verdeeld in 7 fases: Financieel, Klanten &amp; commercieel, Partners &amp; personeel, Compliance &amp; kwaliteit, IT &amp; automatisering, Juridisch &amp; fiscaal, Strategisch &amp; markt. Fase 2-velden (aanvullende, diepere vragen) worden pas zichtbaar ná ondertekening van de LoI — dat is bewust zo, niet een fout in het scherm.')
    + stap(3,'Documenten uploaden — velden vullen zichzelf','Upload rechts bij elke fase de relevante documenten (jaarrekeningen, KvK-uittreksel, contracten, e.d.). De AI leest het document en vult automatisch de bijpassende velden in. Ondersteunde bestandstypen: PDF, Word, Excel/CSV, tekst, en <strong>SBR/XBRL-jaarrekeningen</strong> (.xml/.xbrl) — die laatste worden 100% deterministisch uitgelezen, zonder AI, rechtstreeks uit de officiële XBRL-tags. Let op: bij kleine/middelgrote rechtspersonen bevat een SBR-bestand wettelijk geen apart omzetcijfer (pas vanaf brutomarge) — dat is een wettelijke beperking, geen fout. Heeft u een geüpload document later gecorrigeerd (bijv. een herziene jaarrekening)? Gebruik dan de knop "↻ Vervangen" naast dat document — de nieuwe versie komt zo in dezelfde keten te staan (herkenbaar aan het v2/v3-label), en via "🕒 Versies" is de volledige geschiedenis met downloadlinks terug te vinden. Een nieuw, los document uploaden voor dezelfde correctie kán ook, maar dan mist die koppeling.')
    + stap(4,'Extra controle (optioneel)','Bij het uploaden staat een vinkje "Extra controle (dubbele AI-analyse)". Aangevinkt wordt het document twee keer onafhankelijk gelezen; komen de twee lezingen niet overeen, dan krijgt u een keuze in plaats van een gok. Kost iets meer tijd, daarom standaard uit.')
    + stap(5,'Automatisch ingevulde waarden controleren','Elk automatisch ingevuld veld toont van welk document het afkomstig is ("uit: bestand.pdf") — hover voor het letterlijke citaat uit het document. Geeft een tweede document een andere waarde voor hetzelfde veld, dan verschijnt een keuzescherm ("Afwijkende waarden gevonden") waarin u zelf de juiste waarde aanwijst. Komen de twee waarden uit verschillende boekjaren (bijv. de EBITDA-marge uit het 2023- én het 2024-verslag), dan staat het boekjaar bij elke waarde vermeld en adviseert het scherm doorgaans het meest recente jaar te kiezen.')
    + stap(6,'Meerdere bedrijfsonderdelen (groepsstructuur)','Bestaat uw onderneming uit een holding met werkmaatschappijen, dan ziet u bij het uploaden een keuzemenu om het document aan de juiste entiteit te koppelen. Herkent de AI de entiteit niet met zekerheid, dan wordt niets automatisch verwerkt — u koppelt het dan zelf handmatig via de dataroom.')
    + stap(7,'Voortgang en samenvatting','Velden die u móet invullen zijn gemarkeerd met een rood "verplicht"-label naast het veldnaam. Het voortgangspercentage bovenin toont hoeveel verplichte velden per fase zijn ingevuld; via het samenvattingsscherm ziet u in één overzicht wat nog ontbreekt.')
    + stap(8,'Ondertekenen en vragen','Uw adviseur stuurt op het juiste moment de NDA, LoI of bemiddelingsovereenkomst ter digitale ondertekening (via Signhost). Via het Q&A-register kunt u ook zelf vragen van de koper beantwoorden zodra uw adviseur die aan u doorzet.')
  );

  secties.koper = sectie('koper', '🤝 Koper', ''
    + stap(1,'NDA eerst','Voordat u toegang krijgt, ontvangt en ondertekent u een geheimhoudingsovereenkomst (NDA). Zonder ondertekende NDA verleent de adviseur geen toegang.')
    + stap(2,'Inloggen','Na ondertekening logt u in op <code>mna.html</code> met uw persoonlijke <strong>koperscode</strong>.')
    + stap(3,'Gefaseerde toegang','U ziet alleen de informatiecategorieën die de adviseur specifiek voor u heeft vrijgegeven — dit kan per fase verschillen en wordt gedurende het traject uitgebreid. Ziet u een categorie nog niet, dan is die simpelweg nog niet vrijgegeven.')
    + stap(4,'Dataroom en documenten inzien','Klik op "Alle documenten bekijken" op het startscherm voor een overzicht van alle vrijgegeven documenten (inclusief getekende NDA/BEM/Excl), met de automatisch geëxtraheerde kerncijfers per document. Vanuit een informatiefase komt u via "Terug naar overzicht" weer bij dit startscherm.')
    + stap(5,'Vragen stellen (Q&amp;A)','Per informatiefase kunt u vragen stellen via het Q&amp;A-register. De adviseur (of verkoper, via de adviseur) beantwoordt deze en de antwoorden blijven in het dossier bewaard.')
    + stap(6,'Letter of Intent','Zodra de hoofdpunten zijn afgestemd, stelt de adviseur een LoI op ter ondertekening door beide partijen — dit ontgrendelt bij de verkoper ook de diepere fase-2-vragen.')
  );

  secties.begeleider = sectie('begeleider', '🧭 Begeleider (binnen een traject)', ''
    + stap(1,'Inloggen','U logt in op <code>mna.html</code> met uw <strong>tussenpersoonscode</strong> (uw eigen, unieke code per traject). Bij de eerste keer moet u de verwerkersovereenkomst (VOK) accepteren voordat het dashboard verschijnt.')
    + stap(2,'Dashboardoverzicht','U ziet de voortgang per fase, de dataroom, het Q&amp;A-register, en — indien de module "Contracten" actief is — knoppen om documenten te genereren: NDA, LoI, BEM (bemiddelingsovereenkomst), Excl (exclusiviteitsovereenkomst), Dealvoorstel, Bieding en SPA. Is de module niet actief, dan zijn de knoppen zichtbaar maar vergrendeld.')
    + stap(3,'AI-analyse &amp; waardering','Twee waarderingsfeatures naast elkaar: (1) de deterministieke rekenkern voor closing/earn-up/buy-and-build-scenario\'s, inclusief IRR en Multiple-on-Money bij buy-and-build; (2) een onafhankelijke AI-"second opinion" die zelf een multiple/bandbreedte bepaalt op basis van sectorbenchmarks, met bronvermelding en een automatische sanity-check.')
    + stap(4,'Koper-fit strategie','Leg vast waarom de koper overnames zoekt en welke criteria daarbij horen (omzet/EBITDA-marge/FTE-drempels, sector/regio, vrije strategische tekst). Het systeem beoordeelt de verkoper hier expliciet tegen — harde cijfers worden automatisch getoetst, vrije tekst wordt door de AI uitsluitend geciteerd, nooit zelf beoordeeld. Alleen zichtbaar voor u, nooit voor de verkoper.')
    + stap(5,'Groepsstructuur beheren','Registreer entiteiten (holding + werkmaatschappijen) zodat documenten er correct aan gekoppeld worden en groepscijfers automatisch worden opgeteld. Wijkt een aangeleverd of handmatig ingevuld groepscijfer materieel af van de som van de entiteiten, dan toont het scherm (alleen voor u als begeleider) een keuze per veld: de som van de entiteiten overnemen, of het aangeleverde cijfer behouden. Zo wint een verkeerd cijfer nooit stilzwijgend.')
    + stap(6,'Partners beheren','Registreer de partners bij naam (in plaats van per entiteit los leeftijd/veranderbereidheid in te vullen) en koppel elke partner aan de entiteit(en) waar hij/zij aan verbonden is. Zo voorkomt u dubbele vragen over dezelfde persoon en ziet u meteen wie voor meerdere onderdelen omzet draait. Bij "omzet" wordt bewust gevraagd naar de omzet die aan de partner hangt inclusief onderliggend team — dat is de omzet die bij vertrek van de partner risico loopt, niet alleen zijn/haar eigen productie.')
    + stap(7,'Gefaseerde koper-toegang','Via het koper-toegangsscherm bepaalt u per DD-categorie of en wanneer de koper die mag inzien.')
    + stap(8,'Informatieverzoeken en Q&amp;A','Stuur gerichte informatieverzoeken naar de verkoper per fase, en beheer het Q&amp;A-verkeer tussen koper en verkoper.')
    + stap(9,'Wijzigingenlog','Elke wijziging, upload of verwijdering door de verkoper wordt gelogd met een meldingsbadge, zodat niets ongemerkt verandert.')
  );

  secties.adviseur = sectie('adviseur', '🏢 Adviseur (accountbeheer)', ''
    + stap(1,'Account activeren','U ontvangt een uitnodigingsmail met een activeringslink. Stel een wachtwoord in — u komt daarna in uw eigen adviseursportaal: <code>adv.html</code>.')
    + stap(2,'Een traject starten','Klik op "+ Nieuw traject", vul de gegevens van de onderneming (en desgewenst de koper) in. Zijn e-mailadressen ingevuld, dan verstuurt het platform automatisch een uitnodigingsmail met code en instructies naar verkoper en/of koper — anders geeft u de codes zelf handmatig door.')
    + stap(3,'Eigen huisstijl (optioneel)','Via "🎨 Huisstijl" stelt u een eigen platformnaam, accentkleur en logo in. Dit geldt voor alle trajecten die u vanaf dat moment aanmaakt. Kiest u een kleur die op een donkere achtergrond moeilijk leesbaar zou zijn, dan waarschuwt het scherm dit direct — en wordt de kleur voor uw cliënten automatisch iets aangepast voor leesbaarheid.')
    + stap(4,'Modules en limieten','Uw account heeft een trajectlimiet en een set modules (Contracten, AI-analyse, Q&amp;A, Export), zichtbaar als chips boven uw trajectenlijst. Een module met een slotje is niet actief — neem contact op met uw platformbeheerder.')
    + stap(5,'Voorwaarden','Bij eerste gebruik accepteert u de <a href="platformvoorwaarden.html">Gebruiksvoorwaarden</a>. Zie ook de <a href="privacy.html">Privacyverklaring</a>.')
  );

  volgorde.forEach(function(r){ html += secties[r]; });

  html += '<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:1rem">Deze handleiding wordt bijgehouden zodra het platform wijzigt. Vragen? Neem contact op met uw adviseur of platformbeheerder.</div>';
  html += '</div>';
  return html;
}
