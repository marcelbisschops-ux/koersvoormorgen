// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// Standaard altijd productie. Alleen overschrijfbaar via ?worker=... in de URL — bedoeld voor de
// staging-omgeving testen (Playwright UI-tests, of handmatig), nooit als permanente instelling
// (geen localStorage/cookie: sluit je het tabblad, is het weer productie).
var WORKER=new URLSearchParams(location.search).get('worker')||'https://kantoorinzicht.marcel-bisschops.workers.dev';
// fetch() zelf timet nooit uit — bij een stallende verbinding (slechte wifi, cold-start-hik, een
// proxy die de connectie openhoudt zonder data) blijft een aanroep zonder deze wrapper voor altijd
// hangen: geen foutmelding, geen herstel, de knop blijft "Laden..." tonen. Vooral riskant op een
// plek die vóór renderApp() zit (bijv. de VOK-check bij inloggen) — dan komt de gebruiker nooit
// eens tot een foutscherm. fetchMetTimeout geeft zo'n aanroep altijd een eindpunt: na `ms` wordt
// hij afgebroken en gooit hij, net als een echte netwerkfout, zodat de bestaande catch-afhandeling
// (toast/foutmelding/knop weer actief) gewoon werkt (Marcel, 11 sep 2026: "blijft hangen met laden").
function fetchMetTimeout(url, opts, ms) {
  opts = opts || {};
  ms = ms || 15000;
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, ms);
  return fetch(url, Object.assign({}, opts, { signal: ctrl.signal })).finally(function(){ clearTimeout(timer); });
}
// White-label basis — centrale merkconfig. Eén plek om de productnaam/exploitant te wijzigen.
// Later uitbreidbaar naar per-adviseur (uit de DB). Wijzig hier = overal in de UI-chrome.
var BRAND = {
  platform: 'Koers voor Morgen',            // productnaam in de headers en paginatitel (kan per adviseur overschreven worden)
  platformEcht: 'Koers voor Morgen',        // vaste, niet-overschrijfbare productnaam — gebruik dit voor de verplichte verwerkersvermelding/"mogelijk gemaakt door"
  bedrijf: 'Bisschops Financing B.V.',   // exploiterende onderneming
  bedrijfKort: 'Bisschops Financing BV', // korte vorm voor footers
  suffix: 'M&A',                         // subtitel naast de merknaam
  kort: 'Bisschops Financing',           // narratieve naam (in lopende tekst/documenten)
  contactpersoon: 'Marcel Bisschops',
  email: 'marcel@bisschopsfinancing.nl',
  telefoon: '06 - 38 68 98 88',
  adres: 'Grotestraat 13, 5841AA Oploo'
};

// Vaste taalregels voor elke AI-prompt in mna.html (5 aug 2026, Marcel: analyses bevatten soms
// onnatuurlijk/vertaald Nederlands — vooral inconsistent u/je-gebruik en Engelse zinsconstructies
// zoals "niet een X" i.p.v. "geen X"). Zelfde tekst als TAAL_REGELS in index.html — bewust twee losse
// constanten i.p.v. gedeeld, want mna.html en index.html laden onafhankelijk van elkaar.
var TAAL_REGELS='Schrijf in natuurlijk, vloeiend Nederlands — geen letterlijke vertaling uit het Engels. Gebruik uitsluitend de formele aanspreekvorm "u/uw", nooit "je/jij/jouw", ook niet losse keren door elkaar. Gebruik "geen [zelfstandig naamwoord]" i.p.v. de onnatuurlijke constructie "niet een [zelfstandig naamwoord]". Vermijd andere letterlijke Engelse constructies (bijv. "maakt sense", "op het einde van de dag") en verzin geen niet-bestaande woorden.';

// Versienummer bewust niet meer getoond in de UI (verzoek Marcel, juli 2026).
// De functie blijft bestaan omdat headers 'm aanroepen; hij levert nu niets op.
function versieLabel(){return '';}

// Marcels privé-inlogmail (het account waarmee hij eigen test-/demotrajecten aanmaakt) mag
// nooit aan verkoper/koper getoond worden — daar hoort altijd het zakelijke BRAND.email te staan.
// Gebruik deze helper bij elke plek waar begeleider_email aan een externe partij wordt LATEN ZIEN
// (mailto-links, ondertekeningen, AVG-contactblokken). Niet gebruiken voor daadwerkelijke
// e-mailverzending (toList-arrays) — daar moet Marcel zijn eigen berichten wél op zijn echte adres
// ontvangen.
var MARCEL_PRIVE_EMAIL = 'marcel.bisschops@gmail.com';
function begeleiderWeergaveEmail(email){
  if(!email || email.toLowerCase()===MARCEL_PRIVE_EMAIL) return BRAND.email;
  return email;
}

// Partij-labels per traject_type — identiek aan marilyn.html (die alleen in het adminpaneel leefde;
// hier gekopieerd omdat mna.html 'm ook nodig heeft voor documentprompts, bijv. de BEM-partijaanduiding).
function partijLabels(type){
  var t=type||'Verkoop';
  if(t==='Fusie')return{partij1:'Fusiepartij A',partij2:'Fusiepartij B',p1adres:'Adres partij A',p2adres:'Adres partij B',p1kvk:'KvK partij A',p2kvk:'KvK partij B',p1contact:'Contactpersoon A',p2contact:'Contactpersoon B',p1email:'E-mail partij A',p2email:'E-mail partij B',p1rv:'Rechtsvorm partij A',sectie1:'Fusiepartij A',sectie2:'Fusiepartij B'};
  if(t==='Overname')return{partij1:'Over te nemen partij',partij2:'Overnemende partij',p1adres:'Adres target',p2adres:'Adres overnemende partij',p1kvk:'KvK target',p2kvk:'KvK overnemende partij',p1contact:'Contactpersoon target',p2contact:'Contactpersoon overnemende partij',p1email:'E-mail target',p2email:'E-mail overnemende partij',p1rv:'Rechtsvorm overnemende partij',sectie1:'Target',sectie2:'Overnemende partij'};
  if(t==='PE-traject')return{partij1:'Te verkopen onderneming',partij2:'PE-partij / Investeerder',p1adres:'Adres onderneming',p2adres:'Adres PE-partij',p1kvk:'KvK onderneming',p2kvk:'KvK PE-partij',p1contact:'Contactpersoon onderneming',p2contact:'Contactpersoon PE-partij',p1email:'E-mail onderneming',p2email:'E-mail PE-partij',p1rv:'Rechtsvorm PE-partij',sectie1:'Onderneming',sectie2:'PE-partij'};
  if(t==='Opvolging')return{partij1:'Overdragende eigenaar',partij2:'Opvolgend eigenaar',p1adres:'Adres overdragende eigenaar',p2adres:'Adres opvolger',p1kvk:'KvK bedrijf',p2kvk:'KvK opvolger',p1contact:'Contactpersoon overdragende eigenaar',p2contact:'Contactpersoon opvolger',p1email:'E-mail overdragende eigenaar',p2email:'E-mail opvolger',p1rv:'Rechtsvorm opvolger',sectie1:'Overdragende eigenaar',sectie2:'Opvolgend eigenaar'};
  // default: Verkoop / Aankoop
  return{partij1:'Verkoper',partij2:'Kopende partij',p1adres:'Adres verkoper',p2adres:'Adres koper',p1kvk:'KvK verkoper',p2kvk:'KvK koper',p1contact:'Contactpersoon verkoper',p2contact:'Contactpersoon koper',p1email:'E-mail verkoper',p2email:'E-mail koper',p1rv:'Rechtsvorm koper',sectie1:'Verkoper',sectie2:'Kopende partij'};
}

// Eigen huisstijl van de adviseur (BRAND._logoUrl, gezet bij traject-login als de adviseur een
// logo heeft ingesteld): toont het logo i.p.v. de standaard-merkstip in de headers.
function brandMerkHtml(){
  if(BRAND._logoUrl) return '<img src="'+String(BRAND._logoUrl).replace(/"/g,'&quot;')+'" alt="" style="height:16px;width:auto;max-width:70px;border-radius:2px;vertical-align:middle;object-fit:contain">';
  return '<div class="wdot"></div>';
}

function triggerFileUpload(faseId) {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.eml,.xml,.xbrl'; inp.multiple = true;
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.addEventListener('change', function(e) {
    var files = e.target.files;
    // Eén voor één verwerken i.p.v. gelijktijdig — zelfde reden als uploadDocumentenSequentieel:
    // bij gelijktijdige uploads liep gedeelde state (S._conflicts) door elkaar tussen bestanden,
    // waardoor van een hele reeks maar 1 bestand goed verwerkt terugkwam. Gevonden 23 juli 2026.
    // BELANGRIJK: het <input>-element pas verwijderen ná afloop van de hele reeks — werd het
    // eerder synchroon meteen verwijderd, dan verloor de browser de toegang tot de bestandsdata
    // van alle bestanden ná het eerste (dat toevallig al onderweg was), waardoor van een hele
    // batch tegelijk geselecteerde bestanden alleen het eerste werd geüpload. Gevonden 24 juli 2026.
    window.uploadDocumentenSequentieel(faseId, files).then(function(){
      document.body.removeChild(inp);
    });
  });
  inp.click();
}


// ── SECTORPROFIELEN ─────────────────────────────────────────────────────────
// Elk profiel bevat FASES (velden+checklists+redflags) en AI-normen
var SECTOR_PROFIELEN = {

  // ── ACCOUNTANCY (bestaand, ongewijzigd) ─────────────────────────────────
  accountancy: {
    label: 'Accountancy & administratie',
    // Bron-status (zie SECTORPROFIEL-BRONNEN.md, 31 aug 2026): multiple 4,5-5,5x = 🟢 geverifieerd
    // (Brookz-curve NL M&A-/accountantskantoren, zelfde bron als het waarderingsscherm). Overige
    // getallen 🟡 plausibel maar zonder citaat in de code (overlappen deels met DB-benchmark
    // omzet_fte_accountant, bron "Full Finance/Novak 2024-2025").
    aiNormen: 'EBITDA-marge norm 15-25%, omzet per FTE €80k-€140k, personeelskosten 55-65%, declarabiliteit >75%, multiple 4.5-5.5x',
    // multipleBasis/multipleLaag/multipleHoog (25 juli 2026, vierde kwartaalaudit P1 #1): expliciet,
    // gestructureerd vastgelegd i.p.v. met een regex uit de vrije aiNormen-tekst geparst — die regex
    // kon niet onderscheiden of de gevonden range een EBITDA-, omzet- of ARR-multiple was (zie zorg/
    // itsoftware hieronder), waardoor bij zorg tot >70% waarderingsafwijking kon ontstaan.
    multipleBasis: 'ebitda', multipleLaag: 4.5, multipleHoog: 5.5,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Kwaliteit en duurzaamheid van omzet en winst.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'partnerBel',label:'Partnerbeloning totaal per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisatie eenmalige posten — + of - bedrag (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_recurring',label:'— Omzetopbouw & recurring',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'recurring',label:'Recurring omzet — vaste abonnementen (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'omzetPerDienst',label:'Omzet per dienstlijn — bijv. 40% jaarwerk, 25% advies, 20% loon, 15% fiscaal',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_fin2',label:'— Financial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'wip',label:'Onderhanden werk / OHW',ph:'',doc:true,req:true,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:true,fase:'2'},
        {id:'debiteurenOud',label:'Debiteuren ouder dan 90 dagen (% van totaal debiteurensaldo)',ph:'',doc:false,req:false,fase:'2'},
        {id:'declarab',label:'Declarabiliteit — urendeclaratie fee-personeel (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'wkr',label:'WKR-controle uitgevoerd',ph:'',doc:false,req:false,fase:'2'},
        {id:'dividendHist',label:'Dividendhistorie 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'_hdr_balans2',label:'— Balans & schuld (voor financiële ratio\'s)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigenVermogen',label:'Eigen vermogen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huisvesting & huur (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenIT',label:'IT & automatisering (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenMarketing',label:'Marketing & acquisitie (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Omzet per dienstlijn inzichtelijk','EBITDA-normalisatie opgesteld','OHW geïnventariseerd','Debiteurenpositie geanalyseerd','Partnerbeloningen vergeleken met marktconform','Declarabiliteit bepaald'],
       redflags:['Hoge WIP en oude debiteuren (>90 dagen)','Lage partnerproductiviteit tov benchmark','Eenmalige omzetpieken vertekenen beeld','Niet-genormaliseerde partnerbeloningen'],
       vereisteDocumenten:[
        {naam:'Jaarrekeningen (3 jaar)',trefwoorden:['jaarrekening','jaarcijfers','jaarverslag'],verplicht:true},
        {naam:'YTD-cijfers / tussentijdse cijfers',trefwoorden:['ytd','tussentijds','tussentijdse'],verplicht:true}
       ]},
      {id:'commercieel',num:'II',title:'Klanten & commercieel',desc:'Concentratie, retentie en commerciële kracht.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve klanten',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste klant — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 klanten samen — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'omzetPerKlant',label:'Gemiddelde omzet per klant per jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'pipeline',label:'Pipeline / nieuwe opdrachten in beeld',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'churn',label:'Klantverloop — verloren klanten per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'klantduur',label:'Gem. klantduur (jaar)',ph:'',doc:false,req:false,fase:'2'},
        {id:'crossSell',label:'Cross-sell — klanten met meerdere diensten (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'nieuw',label:'Nieuwe klanten per jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'verlies',label:'Verloren klanten per jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'retentieRisico',label:'Retentierisico sleutelklanten bij overname',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Klantverloop inzichtelijk (3 jaar)','Top 10 klanten samen <40% omzet','Cross-sell percentage vastgesteld','Contractduur inzichtelijk'],
       redflags:['Omzet geconcentreerd bij <5 klanten','Klantverloop >10% per jaar','Klantrelaties hangen aan individuele partners','Geen structurele acquisitie'],
       vereisteDocumenten:[
        {naam:'Klantenoverzicht / omzet per klant',trefwoorden:['klantenoverzicht','klantlijst','omzet per klant','debiteurenlijst'],verplicht:true}
       ]},
      {id:'partner',num:'III',title:'Partners & personeel',desc:'Afhankelijkheden, opvolging en cultuur.',
       dataFields:[
        {id:'aantalP',label:'Aantal partners / eigenaren',ph:'',doc:false,req:true,fase:'1',groepsniveau:true},
        {id:'gemLeeftijd',label:'Gemiddelde leeftijd partners (jaren)',ph:'',doc:false,req:true,fase:'1',groepsniveau:true},
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'omzetPerFte',label:'Omzet per medewerker / FTE (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'omzetPerP',label:'Omzet per partner (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigendomsStructuur',label:'Eigendomsstructuur (verdeling aandelen)',ph:'',doc:false,req:true,fase:'1'},
        {id:'opvolging',label:'Opvolgingskandidaat aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'verandering',label:'Veranderbereidheid partners',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar/partners die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenP',label:'Partners met pensioen <5 jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — medewerkers uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'vacatures',label:'Openstaande vacatures',ph:'',doc:false,req:false,fase:'2'},
        {id:'raAa',label:'RA/AA in opleiding',ph:'',doc:false,req:false,fase:'2'},
        {id:'pContract',label:'Partnerovereenkomsten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'concurrentieBeding',label:'Concurrentie- en relatiebedingen sleutelfiguren',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (soort + kosten)',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Omzetbijdrage per partner vastgesteld','Leeftijdsopbouw in kaart','Opvolgingsplan aanwezig','Verlooppercentage bepaald (norm <15%)'],
       redflags:['Omzet zit in 1-2 partners','Pensioengolf zonder opvolging','Verloop >15%','Geen formele partnerovereenkomsten'],
       vereisteDocumenten:[
        {naam:'Personeelsoverzicht / organogram',trefwoorden:['personeelsoverzicht','organogram','fte-overzicht','personeelslijst'],verplicht:true},
        {naam:'Partnerovereenkomsten',trefwoorden:['partnerovereenkomst','maatschapsovereenkomst'],verplicht:false}
       ]},
      {id:'compliance',num:'IV',title:'Compliance & kwaliteit',desc:'Regulatory status en dossierkwaliteit.',
       dataFields:[
        {id:'nba',label:'NBA-status (inschrijving)',ph:'',doc:true,req:true,fase:'1'},
        {id:'toetsDatum',label:'Laatste kwaliteitstoetsing (jaar)',ph:'',doc:false,req:true,fase:'1'},
        {id:'toetsOordeel',label:'Oordeel kwaliteitstoetsing',ph:'',doc:false,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende tuchtzaken / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'afm',label:'AFM-vergunning',ph:'',doc:true,req:false,fase:'2'},
        {id:'claims',label:'Beroepsaansprakelijkheidsclaims (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'wwft',label:'Wwft-procedures up-to-date',ph:'',doc:true,req:false,fase:'2'},
        {id:'incidenten',label:'Integriteitsincidenten <5 jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'klachtenReg',label:'Klachtenregister beschikbaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'toetsDossiers',label:'Toetsingsrapporten beschikbaar',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['NBA-inschrijving gecontroleerd','Kwaliteitstoetsingen doorgenomen','Wwft-procedures gereviewed','Tuchtzaken geïnventariseerd'],
       redflags:['Negatieve kwaliteitstoetsing NBA','Lopende tuchtzaken of claims','Wwft niet op orde','Structurele dossierbevindingen']},
      {id:'it',num:'V',title:'IT & automatisering',desc:'Systemen, automatiseringsgraad en AI-readiness.',
       dataFields:[
        {id:'software',label:'Primaire software (accountancy)',ph:'',doc:false,req:true,fase:'1'},
        {id:'softwareCRM',label:'CRM / klantbeheer',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:true,fase:'1'},
        {id:'ai',label:'AI-tooling in gebruik',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (volledig overzicht)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'dataMigratie',label:'Datamigratierisico',ph:'',doc:false,req:false,fase:'2'},
        {id:'itKosten',label:'IT-kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity status / incidenten',ph:'',doc:true,req:false,fase:'2'},
        {id:'avg',label:'AVG-documentatie up-to-date',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Softwarelandschap in kaart','Automatiseringsgraad bepaald','AI-tooling aanwezig','Cybersecurity vastgesteld'],
       redflags:['Geen schaalbaar systeemlandschap','Hoge mate handmatig werk','Lage AI-readiness','Cybersecurity kwetsbaarheden'],
       vereisteDocumenten:[
        {naam:'Systemenoverzicht / IT-inventarisatie',trefwoorden:['systemenoverzicht','it-inventarisatie','softwarelandschap'],verplicht:false}
       ]},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Aandeelhoudersstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'vpb',label:'VPB openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'stak',label:'STAK of bijzondere structuur',ph:'',doc:true,req:false,fase:'2'},
        {id:'huur',label:'Huurcontracten (looptijd + overdraagbaarheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules in contracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, procedures (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'lease',label:'Leaseverplichtingen (per jaar)',ph:'',doc:true,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'verzekering',label:'Beroepsaansprakelijkheidsverzekering (dekking)',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Statuten doorgenomen','Huurcontracten inzichtelijk','VPB-positie 3 jaar beoordeeld','Claims vastgesteld'],
       redflags:['Openstaande fiscale discussies','Huurcontract niet overdraagbaar','Onbekende claims'],
       vereisteDocumenten:[
        {naam:'KvK-uittreksel',trefwoorden:['kvk','uittreksel','handelsregister'],verplicht:true},
        {naam:'Aandeelhoudersregister / statuten',trefwoorden:['aandeelhouders','statuten','akte'],verplicht:true},
        {naam:'Huurovereenkomst',trefwoorden:['huurovereenkomst','huurcontract'],verplicht:false}
       ]},
      {id:'strategisch',num:'VII',title:'Strategisch & markt',desc:'Marktpositie, groeipotentieel en strategische fit.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Niche of specialisme',ph:'',doc:false,req:true,fase:'1'},
        {id:'redenVerkoop',label:'Reden van verkoop',ph:'',doc:false,req:false,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn transactie',ph:'',doc:false,req:true,fase:'1'},
        {id:'managementTeam',label:'Managementteam na overname',ph:'',doc:false,req:false,fase:'1'},
        {id:'risicoFactoren',label:'Belangrijkste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Belangrijkste concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'aiImpact',label:'AI-impact op dienstenmix (kwantitatief)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Cultuuromschrijving + integratieplan',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur (lock-box vs completion accounts)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Marktpositie vastgesteld','AI-impact beoordeeld','Synergiepotentieel bepaald','Cultuurfit getoetst'],
       redflags:['Afhankelijkheid samenstelpraktijk (AI-risico)','Geen duidelijke niche','Cultuurmismatch koper','Beperkt integratiepotentieel']}
    ]
  },

  // ── MKB GENERIEK (retail, horeca, handel, ambacht) ───────────────────────
  mkb: {
    label: 'MKB — Retail / Horeca / Ambacht',
    // 15 sep 2026: "Handel" uit de label/scope gehaald — er is nu een apart, specifiek gebronde
    // sectorprofiel 'handel' (groothandel, Brookz H1-2025: 4,8-5,9x EBITDA) dat dat woord dekt.
    // Deze mkb-band (2,5-4,5x) bleef altijd een fallback voor kleinhandel/detailhandel zonder eigen
    // cijfers (BACKLOG 1.3b) — nu een echte trajectkeuze bestaat, blijft "handel" hier verwarrend.
    // Detailhandel/kleine winkel blijft impliciet binnen deze band vallen (past qua schaal/marge
    // beter bij retail dan bij de nieuwe groothandel-band); bij twijfel per geval navragen.
    // Bron-status (zie SECTORPROFIEL-BRONNEN.md) — TWEEDE herijking, 11 sep 2026, zelfde dag: de
    // eerste herijking (2,5-4,5x → 4,0-6,0x) bleek op een verkeerde referentie te leunen. "Het
    // gemiddelde MKB-EBITDA-multiple van 5,0" uit BACKLOG.md 1.1 is het BLENDED gemiddelde over ALLE
    // Brookz-sectoren (incl. hoge multiples voor software 7,5x/IT-diensten 6,7x/zorg 6,5x) — niet
    // specifiek voor retail/horeca/handel/ambacht. De Brookz Overnamebarometer H2-2025 geeft juist
    // per sector: Detailhandel 2,5x, Horeca/Toerisme/Recreatie 3,3x — beide ONDER de 4,0-6,0x-band
    // die na de eerste herijking hier stond. Teruggezet naar de oorspronkelijke 2,5-4,5x, die voor
    // retail/horeca dus al redelijk kalibreerde. Handel/ambacht hebben geen aparte Brookz-cijfers
    // gevonden — blijft binnen deze band tot een betere bron zich aandient (BACKLOG 1.3b, open).
    aiNormen: 'EBITDA-marge norm 5-15% (sector afhankelijk: horeca 8-12%, retail 5-10%), omzet per FTE €80k-€200k, personeelskosten 25-45%, voorraadomzet >6x per jaar, multiple 2.5-4.5x',
    multipleBasis: 'ebitda', multipleLaag: 2.5, multipleHoog: 4.5,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge en werkkapitaal.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'brutomarge',label:'Brutomarge — omzet minus inkoopkosten (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'voorraad',label:'Voorraadwaarde indicatief (€)',ph:'',doc:true,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Orderportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'voorraadomzet',label:'Voorraadomzetsnelheid (x per jaar)',ph:'',doc:false,req:false,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'capexHistorie',label:'Capex-historie 3 jaar + toekomstige investeringsbehoefte',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenInkoop',label:'Inkoopkosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Brutomarge per productgroep inzichtelijk','Voorraad gewaardeerd en gecontroleerd','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende brutomarge (prijsdruk of kostenstijging)','Hoge voorraadwaarde tov omzet','Negatief eigen vermogen','Sterk wisselende omzet zonder verklaring']},
      {id:'commercieel',num:'II',title:'Omzet & klanten',desc:'Omzetmix, klantenbasis en marktpositie.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve klanten / transacties p/j',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10Leveranciers',label:'Top 10 leveranciers — aandeel in totale inkoop (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste klant — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 klanten samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Vaste/terugkerende omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'seizoen',label:'Seizoensgevoeligheid',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal locaties / vestigingen',ph:'',doc:false,req:true,fase:'1'},
        {id:'online',label:'Online omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Orderportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per klant/transactie',ph:'',doc:false,req:false,fase:'2'},
        {id:'productmix',label:'Productmix / assortiment (details)',ph:'',doc:false,req:false,fase:'2'},
        {id:'leveranciersAfhank',label:'Leveranciersafhankelijkheid (contracten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Omzetmix per productgroep/kanaal inzichtelijk','Klantconcentratie geanalyseerd','Seizoenspatroon in kaart','Online vs offline omzet vastgesteld'],
       redflags:['Omzet bij 1-2 grootafnemers (B2B)','Sterke seizoensgevoeligheid zonder buffer','Dalende transactiefrequentie','Geen online aanwezigheid in digitaliserende markt']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Bezetting, sleutelpersonen en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klanten/leveranciers)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar/partners die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — medewerkers uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'parttime',label:'Parttime medewerkers (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO van toepassing',ph:'',doc:true,req:false,fase:'2'},
        {id:'vakkennis',label:'Specifieke vakkennis / certificeringen',ph:'',doc:false,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (soort + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE-bezetting en functies in kaart','Sleutelpersonen geïdentificeerd','Eigenaar-afhankelijkheid beoordeeld','CAO-verplichtingen inzichtelijk','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar','Sleutelpersonen vertrekrisico na overname','Hoog verloop','Bijzondere CAO-verplichtingen of pensioenrisico']},
      {id:'compliance',num:'IV',title:'Vergunningen & compliance',desc:'Vergunningen, certificeringen en wettelijke vereisten.',
       dataFields:[
        {id:'vergunningen',label:'Bedrijfsvergunningen (gemeentelijk/nationaal)',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'huurOverdraagbaar',label:'Huurcontract overdraagbaar (dealbreaker)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'certificeringen',label:'Kwaliteitscertificaten / keurmerken',ph:'',doc:true,req:false,fase:'2'},
        {id:'nvwa',label:'NVWA / branchetoezicht status',ph:'',doc:false,req:false,fase:'2'},
        {id:'haccpKeuken',label:'HACCP / voedselveiligheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd',ph:'',doc:false,req:false,fase:'2'},
        {id:'milieu',label:'Milieu- of omgevingsvergunning',ph:'',doc:true,req:false,fase:'2'},
        {id:'ip',label:'Intellectueel eigendom (IP) / merknaam',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Alle vergunningen actueel en overdraagbaar','Keurmerken en certificeringen doorgenomen','Branchetoezicht status geverifieerd','Openstaande procedures in kaart'],
       redflags:['Vergunning niet overdraagbaar bij eigendomsoverdracht','NVWA of handhavingsissues','Lopende juridische procedures','Milieu- of omgevingsproblemen']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'ICT, e-commerce en procesautomatisering.',
       dataFields:[
        {id:'software',label:'Kassasysteem / ERP / POS',ph:'',doc:false,req:true,fase:'1'},
        {id:'ecommerce',label:'E-commerce platform',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (inkoop, voorraad, HR)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','E-commerce aanwezig en functioneel','Voorraadbeheer geautomatiseerd'],
       redflags:['Kassasysteem verouderd of niet schaalbaar','Geen e-commerce in digitaliserende markt','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huur',label:'Huurcontract (looptijd + overdraagbaarheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'leveranciers',label:'Leverancierscontracten + exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'lease',label:'Leaseverplichtingen apparatuur / voertuigen',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'vastgoed',label:'Vastgoed: eigendom of huur + taxatie',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huurcontract overdraagbaar bevestigd','Leverancierscontracten inzichtelijk','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huurcontract niet overdraagbaar (dealbreaker)','Exclusieve leveranciersafspraken vervallen bij overdracht','Openstaande fiscale schulden','Onbekende garantieverplichtingen']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, concurrentie en groeistrategie.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Onderscheidend vermogen',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'aiImpact',label:'Impact digitalisering / marktdisruptie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld'],
       redflags:['Structurele marktdaling in segment','Locatie-afhankelijkheid zonder huurzekerheid','Geen onderscheidend vermogen','Eigenaar is het merk']}
    ]
  },

  // ── ZORG (huisartsenpraktijken, tandartsen, fysiotherapie) ───────────────
  zorg: {
    label: 'Zorg — Huisarts / Tandarts / Fysiotherapie',
    // Bron-status (zie SECTORPROFIEL-BRONNEN.md): omvangsafhankelijk gemaakt op 11 sep 2026 (Marcel
    // akkoord op BACKLOG 1.2, "omvangsafhankelijk maken"). "Praktijkwaarde ≈ deel van de jaaromzet" is
    // een reële conventie voor een KLEINE, eigenaar-gedreven solopraktijk; voor een grotere praktijk/
    // keten hanteert de markt een EBITDA-multiple (Brookz "zorg & farmacie" ~6,0-7,3x, gem. 6,5x).
    // Schakelaar op groeps-FTE (partner_fte) — zie dvSectorMultipleRange() in
    // mna/03-rekenkern-waardering.js: >5 FTE (multipleGrootFteGrens, een operationeel ingesteld
    // drempelgetal, geen gebronde marktnorm — pas aan in marilyn indien gewenst) → EBITDA-multiple;
    // anders (of FTE nog onbekend) → de omzet-multiple hieronder blijft gelden.
    aiNormen: 'EBITDA-marge norm 15-25% (huisarts 20-30%), omzet per FTE €60k-€120k, NZa-tarieven leidend, patiëntenbestand overdraagbaarheid cruciaal, multiple 1-3x omzet (praktijkwaarde, kleine solopraktijk) of 6,0-7,3x EBITDA (grotere praktijk/keten, >5 FTE)',
    // LET OP: dit is een OMZET-multiple (praktijkwaarde), geen EBITDA-multiple — zie dvSectorMultipleRange()
    // in mna/03-rekenkern-waardering.js. Het Dealvoorstel-scherm (prijsmechanisme/schuldaflossing/DCF)
    // blijft bewust EBITDA-based en gebruikt dus NIET automatisch deze omzet-range (bewuste scope-keuze,
    // 25 juli 2026) — alleen het hoofdwaarderingsscherm past 'm correct op omzet toe.
    multipleBasis: 'omzet', multipleLaag: 1, multipleHoog: 3,
    multipleGrootFteGrens: 5, multipleBasisGroot: 'ebitda', multipleLaagGroot: 6.0, multipleHoogGroot: 7.3,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Praktijkomzet, declaraties en winstgevendheid.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Praktijkomzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Praktijkomzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Praktijkomzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'partnerBel',label:'Eigenaarssalaris p/j',ph:'',doc:false,req:true,fase:'1'},
        {id:'zorgverzekeraars',label:'Omzet per financieringsstroom',ph:'',doc:false,req:true,fase:'1'},
        {id:'bezettingsgraad',label:'Bezettingsgraad (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_fin2',label:'— Financial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'declaraties',label:'Declaratieoverzicht + rechtmatigheidsonderzoek',ph:'',doc:true,req:false,fase:'2'},
        {id:'subsidieAfhank',label:'Subsidieafhankelijkheid en -risico',ph:'',doc:false,req:false,fase:'2'},
        {id:'debiteuren',label:'Debiteuren / openstaande vorderingen',ph:'',doc:true,req:false,fase:'2'},
        {id:'btwVrijstelling',label:'BTW-vrijstellingen (analyse)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_balans2',label:'— Balans & schuld (voor financiële ratio\'s)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigenVermogen',label:'Eigen vermogen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/hypotheek praktijkruimte (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','Declaratieoverzicht beschikbaar','NZa-tarieven correct toegepast','Eigenaarssalaris genormaliseerd'],
       redflags:['Dalende omzet bij stabiel patiëntenbestand','Hoge debiteurenpositie zorgverzekeraars','Eigenaarssalaris sterk afwijkend van markt','Niet-marktconforme NZa-tarieven']},
      {id:'commercieel',num:'II',title:'Patiënten & praktijkprofiel',desc:'Patiëntenbestand, capaciteit en dienstverlening.',
       dataFields:[
        {id:'aantalPatient',label:'Aantal ingeschreven patiënten / cliënten',ph:'',doc:false,req:true,fase:'1'},
        {id:'wachttijd',label:'Gemiddelde wachttijd nieuwe patiënten',ph:'',doc:false,req:true,fase:'1'},
        {id:'specialisaties',label:'Specialisaties / aanvullende diensten',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal behandellocaties',ph:'',doc:false,req:true,fase:'1'},
        {id:'praktijkwaarde',label:'Indicatieve praktijkwaarde (indien bekend)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_pat2',label:'— Cliënt DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'patientLeeftijd',label:'Gemiddelde leeftijd patiëntenbestand',ph:'',doc:false,req:false,fase:'2'},
        {id:'consulten',label:'Aantal consulten per jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'uitstroom',label:'Patiëntuitstroom per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'wachtlijst',label:'Wachtlijstanalyse',ph:'',doc:false,req:false,fase:'2'},
        {id:'verzekerd',label:'Patiënten met aanvullende verzekering (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'overdraagbaarheid',label:'Overdraagbaarheid patiëntenbestand (BIG)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Patiëntenbestand geanalyseerd (aantallen en leeftijdsopbouw)','Wachttijden in kaart','Specialisaties vastgesteld','Capaciteitsbenutting bepaald'],
       redflags:['Wachttijd 0 = praktijk niet vol','Hoge gemiddelde leeftijd patiënten (vergrijzend bestand)','Geen patiëntenstop = groeiruimte maar ook risico','Patiëntenbestand niet overdraagbaar (BIG-eis)']},
      {id:'partner',num:'III',title:'Personeel & BIG-registraties',desc:'Zorgpersoneel, registraties en afhankelijkheden.',
       dataFields:[
        {id:'fte',label:'Totaal FTE zorgpersoneel',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal geregistreerde behandelaars (BIG)',ph:'',doc:false,req:true,fase:'1'},
        {id:'bigRegistraties',label:'BIG-registraties actueel',ph:'',doc:false,req:true,fase:'1'},
        {id:'opvolging',label:'Opvolger voor praktijkhouder',ph:'',doc:false,req:true,fase:'1'},
        {id:'zzpAandeel',label:'ZZP-inhuur (% van personeelskosten)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar/praktijkhouder die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of patiënt-/klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — medewerkers uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'pensioenP',label:'Behandelaars met pensioen <5 jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO + cao-verplichtingen',ph:'',doc:true,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten + waarneemafspraken',ph:'',doc:true,req:false,fase:'2'},
        {id:'wetDBA',label:'Wet DBA / ZZP-risicos',ph:'',doc:false,req:false,fase:'2'},
        {id:'wtrRegistratie',label:'WTZa-vergunning actueel',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['BIG-registraties geverifieerd','Waarneemafspraken inzichtelijk','Opvolgingsplan praktijkhouder aanwezig','CAO-verplichtingen in kaart'],
       redflags:['BIG-registratie verloopt zonder opvolging','Volledige afhankelijkheid van 1 behandelaar','Geen formele waarneemafspraken','CAO-achterstalligheid']},
      {id:'compliance',num:'IV',title:'Kwaliteit & regelgeving',desc:'BIG, IGJ, NZa, privacywetgeving.',
       dataFields:[
        {id:'igj',label:'Laatste IGJ-inspectie + oordeel',ph:'',doc:false,req:true,fase:'1'},
        {id:'claims',label:'Civiele claims / tuchtrechtprocedures',ph:'',doc:false,req:true,fase:'1'},
        {id:'nza',label:'NZa-registratie + contracten zorgverzekeraars',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'avg',label:'AVG/privacy patiëntgegevens',ph:'',doc:true,req:false,fase:'2'},
        {id:'kwaliteitsregister',label:'Kwaliteitsregistratie (NHG, KNMT)',ph:'',doc:true,req:false,fase:'2'},
        {id:'klachten',label:'Klachtenprocedures WKKGZ',ph:'',doc:false,req:false,fase:'2'},
        {id:'incidenten',label:'MIP-meldingen afgelopen 3 jaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'wkkgzAudit',label:'Wkkgz-audit uitgevoerd',ph:'',doc:true,req:false,fase:'2'},
        {id:'igJRapport',label:'IGJ-rapportages beschikbaar',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['IGJ-status geverifieerd','NZa-registratie actueel','AVG patiëntgegevens in kaart','Klachtenprocedure WKGZ compliant'],
       redflags:['Negatieve IGJ-inspectie','Lopende tuchtrechtprocedures','AVG-overtredingen patiëntgegevens','WKGZ-klachten niet afgehandeld']},
      {id:'it',num:'V',title:'Systemen & HIS/TIS',desc:'Zorginformatiesystemen en digitale infrastructuur.',
       dataFields:[
        {id:'software',label:'HIS/TIS/KIS (bijv. Medicom, Vecozo, Dentally)',ph:'',doc:false,req:true,fase:'1'},
        {id:'epd',label:'EPD/EHR systeem + overdraagbaarheid',ph:'',doc:false,req:true,fase:'1'},
        {id:'gegevensmigratie',label:'Gegevensmigratie mogelijk bij overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (declaratie, agenda)',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en NEN 7510 compliance',ph:'',doc:true,req:false,fase:'2'},
        {id:'itRisico',label:'IT-risicos patiëntgegevens',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG en patiëntgegevens (details)',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['HIS/TIS in kaart en overdraagbaar','EPD-migratie mogelijk','NEN 7510 compliance gecontroleerd','Cybersecurity patiëntgegevens vastgesteld'],
       redflags:['EPD niet overdraagbaar (vendor lock-in)','Geen NEN 7510 compliance','Patiëntgegevens niet adequaat beveiligd']},
      {id:'juridisch',num:'VI',title:'Juridisch & structuur',desc:'Praktijkstructuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm praktijk',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'goodwill',label:'Goodwill-afspraken (LHV/NMa)',ph:'',doc:false,req:true,fase:'1'},
        {id:'zorgcontracten',label:'Contracten zorgverzekeraars (looptijd)',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / procedures',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huur',label:'Huurcontract praktijkruimte (looptijd + overdraagbaarheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'vpb',label:'Fiscale positie en DGA-salaris',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioen',label:'Pensioenvoorziening eigenaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW-vrijstellingen, loonheffing',ph:'',doc:true,req:false,fase:'2'},
        {id:'wtzaVergunning',label:'WTZa-vergunning en naleving',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Praktijkstructuur in kaart','Goodwillregeling duidelijk','Huurcontract overdraagbaar','Zorgverzekeraarscontracten doorgenomen'],
       redflags:['Goodwill boven LHV-richtlijn (financieringsrisico)','Huurcontract niet overdraagbaar','Zorgcontracten niet automatisch overdraagbaar','Pensioenachterstand eigenaar']},
      {id:'strategisch',num:'VII',title:'Strategisch & groeipotentieel',desc:'Praktijkpositie, capaciteit en toekomst.',
       dataFields:[
        {id:'marktpos',label:'Werkgebied en bereikbaarheid',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Specialisaties en differentiatie',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Synergiemogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste overdrachtstijdlijn',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Strategische & Operationele DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Omliggende praktijken + concurrentiedruk',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Praktijkfilosofie en teamcultuur',ph:'',doc:false,req:false,fase:'2'},
        {id:'aiImpact',label:'E-health / digitalisering impact',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Schaalbaarheid praktijk',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Werkgebied en demografische ontwikkeling in kaart','Groeipotentieel bepaald','Cultuurfit getoetst','Strategische positie vastgesteld'],
       redflags:['Krimpend werkgebied / ontgroening','Concurrentie nieuwe praktijk in werkgebied','Geen opvolger mogelijk door praktijkgrootte','MSB-verplichtingen onbekend']}
    ]
  },

  // ── IT & SOFTWARE ────────────────────────────────────────────────────────
  itsoftware: {
    label: 'IT & Software',
    // Bron-status (zie SECTORPROFIEL-BRONNEN.md, herzien 13 sep 2026): multiple 🟢 gebrond op Brookz
    // Overnamebarometer H2-2025 (IT-diensten 6,7×, Softwareontwikkeling 7,5×) — Marcel akkoord
    // 13 sep 2026 op de eerdere 11 sep-deelbevinding. De 3-8x ARR-range gaat alleen naar de AI-tekst,
    // niet naar de rekenkern, en blijft 🟡 plausibel (geen harde NL-bron voor ARR-multiples). ARR/MRR-
    // groei/churn/LTV-CAC/NPS zijn gangbare SaaS-vuistregels, geen harde NL-branchebron.
    aiNormen: 'EBITDA-marge norm 15-30% (SaaS 20-40%), ARR/MRR groei >20% is sterk, churn <5% is goed, LTV/CAC >3 vereist, NPS >30 positief, multiple 3-8x ARR (SaaS) of 6,7-7,5x EBITDA (maatwerk/diensten, Brookz H2-2025)',
    // Dit sectorprofiel dekt zowel SaaS (ARR-multiple) als maatwerk/diensten (EBITDA-multiple) — het
    // platform heeft geen apart ARR-veld en de rest van het Dealvoorstel-scherm is EBITDA-based, dus
    // hier bewust de EBITDA-variant als structureel vastgelegde basis. Band = de twee Brookz H2-2025-
    // subsectorcijfers (IT-diensten 6,7× laag, Softwareontwikkeling 7,5× hoog) — geen gemiddelde,
    // geen padding. Een zuiver SaaS-traject moet handmatig als kanttekening worden meegenomen
    // (bekende beperking, 25 juli 2026).
    multipleBasis: 'ebitda', multipleLaag: 6.7, multipleHoog: 7.5,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, ARR/MRR en unit economics.',
       dataFields:[
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true},
        {id:'arr',label:'ARR (Annual Recurring Revenue)',ph:'',doc:false,req:true},
        {id:'mrr',label:'MRR (Monthly Recurring Revenue)',ph:'',doc:false,req:false},
        // 15 sep 2026, gevonden tijdens Marcels vraag "waarom absoluut getal én percentage — waarom
        // niet 1": dit veld heette 'ebitda' (de rekenkern leest 'financieel_ebitda' altijd als een
        // absoluut eurobedrag, via parseGeld) maar het label beschreef tot nu toe een PERCENTAGE —
        // een ingevuld "18" (bedoeld als 18%) zou dus als €18 EBITDA in de waardering zijn beland.
        // Label gecorrigeerd naar wat het veld/de rekenkern daadwerkelijk verwacht; ebitdaMarge
        // ernaast toegevoegd (optioneel, zelfde patroon als de andere 8 sectoren) zodat de al
        // bestaande DD-checklist-vermelding "EBITDA-marge" (04-begeleider-dashboard.js) ook echt
        // een veld heeft om aan te koppelen.
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA',ph:'',doc:true,req:false},
        {id:'churnMrr',label:'MRR Churn (%)',ph:'',doc:false,req:true},
        {id:'ltv',label:'LTV (Customer Lifetime Value)',ph:'',doc:false,req:false},
        {id:'cac',label:'CAC (Customer Acquisition Cost)',ph:'',doc:false,req:false},
        {id:'_hdr_omzet',label:'— Omzetverdeling',ph:'',doc:false,req:false,header:true},
        {id:'recurringPct',label:'Recurring omzet (%)',ph:'',doc:false,req:true},
        {id:'projectOmzet',label:'Project/eenmalig omzet (%)',ph:'',doc:false,req:false},
        {id:'_hdr_balans2',label:'— Balans & schuld (voor financiële ratio\'s, post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigenVermogen',label:'Eigen vermogen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kosten',label:'— Kostenstructuur',ph:'',doc:false,req:false,header:true},
        {id:'kostenPersoneel',label:'R&D + Sales + G&A kosten (% omzet)',ph:'',doc:false,req:false},
        {id:'hosting',label:'Hosting en infrakosten (% omzet)',ph:'',doc:false,req:false}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','ARR/MRR gedocumenteerd','Unit economics (LTV/CAC) bepaald','Churn geanalyseerd','Recurring vs project-omzet inzichtelijk'],
       redflags:['Hoge MRR churn (>5% per maand)','LTV/CAC <3','Negatieve EBITDA zonder duidelijk groeipad','Grote afhankelijkheid project-omzet bij SaaS-claim']},
      {id:'commercieel',num:'II',title:'Klanten & product',desc:'Klantenbestand, product-market fit en retentie.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve klanten',ph:'',doc:false,req:true},
        {id:'churn',label:'Klant-churn per jaar (%)',ph:'',doc:false,req:true},
        {id:'nps',label:'NPS score',ph:'',doc:false,req:false},
        {id:'top1pct',label:'Grootste klant (% ARR/omzet)',ph:'',doc:false,req:true},
        {id:'top10pct',label:'Top 10 klanten (% ARR/omzet)',ph:'',doc:false,req:true},
        {id:'productMaturity',label:'Productstatus (MVP/groei/matuur)',ph:'',doc:false,req:true},
        {id:'techDebt',label:'Technische schuld (indicatie)',ph:'',doc:false,req:true},
        {id:'roadmap',label:'Product roadmap aanwezig',ph:'',doc:false,req:false},
        {id:'markt',label:'Totale marktomvang (TAM/SAM)',ph:'',doc:false,req:false}
       ],
       items:['Klantconcentratie geanalyseerd','Churn gedetailleerd (logo vs. revenue)','NPS bepaald','Product-roadmap doorgenomen','Technische schuld gekwantificeerd'],
       redflags:['Churn >15% per jaar','Top 3 klanten >50% ARR','Product in eindfase lifecycle','Hoge technische schuld remt groei','Geen product-roadmap']},
      {id:'partner',num:'III',title:'Team & IP',desc:'Ontwikkelteam, sleutelpersonen en kennisbehoud.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true},
        {id:'devFte',label:'Development FTE',ph:'',doc:false,req:true},
        {id:'aantalP',label:'Aantal eigenaren/founders',ph:'',doc:false,req:true},
        {id:'sleutelpersonen',label:'Sleutelopntwikkelaars en retentierisico',ph:'',doc:false,req:true},
        {id:'verloop',label:'Verloop development team (%)',ph:'',doc:false,req:true},
        {id:'ipOwnership',label:'IP-eigenaarschap (werknemers en contractors)',ph:'',doc:true,req:true},
        {id:'opvolging',label:'Knowhow gedocumenteerd (geen bus factor)',ph:'',doc:false,req:true},
        {id:'pContract',label:'Arbeidscontracten incl. IP-clausules',ph:'',doc:true,req:true},
        {id:'verandering',label:'Team bereidheid bij nieuwe eigenaar',ph:'',doc:false,req:true},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder founders/eigenaren die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet, kernkennis of klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['IP-eigenaarschap geverifieerd','Bus factor gekwantificeerd','Sleutelpersonen retentieplan','Arbeidscontracten incl. IP-clausules doorgenomen'],
       redflags:['Founders zijn enige met productkennnis','IP niet volledig eigendom van bedrijf (contractors)','Hoog verloop dev-team','Geen documentatie kritieke systemen']},
      {id:'compliance',num:'IV',title:'Beveiliging & compliance',desc:'Security, privacy en regulering.',
       dataFields:[
        {id:'iso',label:'ISO 27001 / SOC2 / NEN7510 certificering',ph:'',doc:true,req:false},
        {id:'avg',label:'AVG/GDPR compliance',ph:'',doc:true,req:true},
        {id:'pentest',label:'Laatste penetratietest (jaar)',ph:'',doc:false,req:true},
        {id:'incidenten',label:'Security incidents afgelopen 2 jaar',ph:'',doc:false,req:true},
        {id:'claims',label:'Openstaande claims of aansprakelijkheden',ph:'',doc:false,req:true},
        {id:'licenties',label:'Open source licentie compliance',ph:'',doc:false,req:true},
        {id:'sla',label:'SLA-nakoming (uptime, response)',ph:'',doc:false,req:false}
       ],
       items:['ISO/SOC2 status geverifieerd','AVG/GDPR compliance in kaart','Penetratietest recent uitgevoerd','Open source licenties gescreend','SLA-prestaties geanalyseerd'],
       redflags:['Geen AVG/GDPR compliance bij klantdata','Security incident niet gemeld','Open source licenties schenden GPL','SLA-overtredingen structureel']},
      {id:'it',num:'V',title:'Technologie & architectuur',desc:'Tech stack, schaalbaarheid en hosting.',
       dataFields:[
        {id:'techStack',label:'Tech stack (talen, frameworks)',ph:'',doc:false,req:true},
        {id:'hosting',label:'Hosting / cloud provider',ph:'',doc:false,req:true},
        {id:'software',label:'Monitoring en DevOps tooling',ph:'',doc:false,req:false},
        {id:'autoGraad',label:'CI/CD aanwezig',ph:'',doc:false,req:true},
        {id:'schaalbaarheid',label:'Schaalbaarheid architectuur',ph:'',doc:false,req:true},
        {id:'uptime',label:'Uptime / availability (historisch)',ph:'',doc:false,req:false},
        {id:'security',label:'Externe afhankelijkheden / vendor lock-in',ph:'',doc:false,req:true},
        {id:'itRisico',label:'Technische schuld en bekende risicos',ph:'',doc:false,req:true}
       ],
       items:['Tech stack gedocumenteerd','CI/CD aanwezig','Architectuur schaalt met groei','Vendor lock-in beoordeeld','Uptime historisch geanalyseerd'],
       redflags:['Monolithische architectuur remt groei','Volledige vendor lock-in','Geen CI/CD = hoog release-risico','Technische schuld >20% dev-tijd']},
      {id:'juridisch',num:'VI',title:'Juridisch & IP',desc:'Structuur, contracten en intellectueel eigendom.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true},
        {id:'structuur',label:'Aandeelhoudersstructuur',ph:'',doc:true,req:true},
        {id:'ipRegistraties',label:'Patenten, merken, octrooien',ph:'',doc:true,req:false},
        {id:'klantcontracten',label:'Klantcontracten (looptijd, opzegtermijn)',ph:'',doc:true,req:true},
        {id:'vpb',label:'VPB en R&D-aftrek situatie',ph:'',doc:false,req:true},
        {id:'fiscaalRisico',label:'Fiscale risicos (WBSO, innovatiebox)',ph:'',doc:false,req:false},
        {id:'overigeClaims',label:'Openstaande claims of IP-geschillen',ph:'',doc:false,req:true},
        {id:'huur',label:'Kantoorhuur / remote-policy',ph:'',doc:true,req:false}
       ],
       items:['IP volledig eigendom bedrijf geverifieerd','Klantcontracten overdraagbaar','R&D-subsidies (WBSO) in kaart','IP-geschillen vastgesteld'],
       redflags:['IP gedeeltelijk bij founders privé','Klantcontracten niet overdraagbaar bij change of control','Lopende octrooigeschillen','WBSO-terugvordering risico']},
      {id:'strategisch',num:'VII',title:'Markt & schaalbaarheid',desc:'Marktpositie, groei en exit-readiness.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie en category definition',ph:'',doc:false,req:true},
        {id:'niche',label:'Unieke waardepropositie (moat)',ph:'',doc:false,req:true},
        {id:'concurrenten',label:'Directe en indirecte concurrenten',ph:'',doc:false,req:false},
        {id:'groei',label:'Groeimotor (PLG, SLG, partnerships)',ph:'',doc:false,req:true},
        {id:'aiImpact',label:'AI-impact op product en concurrenten',ph:'',doc:false,req:true},
        {id:'cultuurFit',label:'Engineering culture en waarden',ph:'',doc:false,req:true},
        {id:'synergie',label:'Synergiemogelijkheden met koper',ph:'',doc:false,req:true},
        {id:'tijdlijn',label:'Exit-tijdlijn en verwachtingen',ph:'',doc:false,req:true}
       ],
       items:['Marktpositie en moat bepaald','Groeimotor geanalyseerd','AI-impact beoordeeld','Synergieën gekwantificeerd'],
       redflags:['Geen verdedigbare moat','AI disruptie dreigt kernproduct','Groei volledig afhankelijk van founders','Markt consolideert snel']}
    ]
  },

  // ── BOUW & INSTALLATIETECHNIEK ───────────────────────────────────────────
  bouw: {
    label: 'Bouw & Installatietechniek',
    // Bron-status (13 sep 2026, zie SECTORPROFIEL-BRONNEN.md): multiple 🟢 gebrond — Brookz Overname
    // Barometer H1-2025 (editie 22, blz. 9, spreidingstabel "Multiples per sector"): Bouw &
    // Installatietechniek laagste 4,0 / gemiddeld 4,5 / hoogste 5,0. Rechtstreeks uit het PDF-rapport
    // gehaald (niet via een samenvatting), zelfde bronsoort als de al bestaande sectoren hierboven.
    // Geen aparte EBITDA-marge-/omzet-per-FTE-normen gevonden voor deze sector — die kwalitatieve
    // aiNormen-tekst hieronder blijft daarom bewust beperkt tot wat wél gebrond is (de multiple).
    aiNormen: 'EBITDA-multiple (Brookz H1-2025, Bouw & Installatietechniek): laagste 4,0x, gemiddeld 4,5x, hoogste 5,0x. Sector is materieelintensief, projectmatig en conjunctuurgevoelig — geen aparte gebronde marge-/FTE-normen beschikbaar, dus geen cijfer daarover presenteren als marktnorm.',
    multipleBasis: 'ebitda', multipleLaag: 4.0, multipleHoog: 5.0,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge, onderhanden werk en materieel.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'brutomarge',label:'Brutomarge op projecten — omzet minus materiaal-/onderaannemerskosten (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'materieelWaarde',label:'Boekwaarde materieel / machinepark (€)',ph:'',doc:true,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Opdrachtenportefeuille — verwachte omzet komende 12 maanden (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'ohwWaarde',label:'Onderhanden werk (OHW) — totale waarde lopende projecten (€)',ph:'',doc:true,req:true,fase:'2'},
        {id:'garantieVoorziening',label:'Voorziening garantie-/nazorgverplichtingen (10-jaar aansprakelijkheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'capexHistorie',label:'Capex-historie 3 jaar (materieel) + toekomstige investeringsbehoefte',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/huisvesting (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenMaterieel',label:'Materieel- en onderhoudskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Onderhanden werk per project gewaardeerd','Materieel getaxeerd/geïnventariseerd','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende brutomarge op projecten','Hoge OHW-waarde tov omzet (onderdekking risico)','Onvoldoende garantievoorziening voor bekende gebreken','Negatief eigen vermogen','Sterk verouderd materieel zonder vervangingsinvestering']},
      {id:'commercieel',num:'II',title:'Opdrachten & klanten',desc:'Opdrachtgevers, aanbestedingen en projectmix.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve opdrachtgevers / projecten per jaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10Leveranciers',label:'Top 10 onderaannemers/leveranciers — aandeel in totale inkoop (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste opdrachtgever — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 opdrachtgevers samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Herhaalopdrachten van vaste opdrachtgevers (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'seizoen',label:'Seizoensgevoeligheid (bijv. winterstop)',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal vestigingen / werkgebied (regio\'s)',ph:'',doc:false,req:true,fase:'1'},
        {id:'aanbestedingen',label:'Aandeel omzet uit aanbestedingen/tenders (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Opdrachtenportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per opdrachtgever/project',ph:'',doc:false,req:false,fase:'2'},
        {id:'projectmix',label:'Projectmix (woningbouw / utiliteitsbouw / infra / renovatie-onderhoud)',ph:'',doc:false,req:false,fase:'2'},
        {id:'onderaannemersAfhank',label:'Afhankelijkheid van vaste onderaannemers (contracten, exclusiviteit)',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Opdrachtgeversconcentratie geanalyseerd','Aanbestedingsaandeel inzichtelijk','Seizoenspatroon in kaart','Projectmix vastgesteld'],
       redflags:['Omzet bij 1-2 grote opdrachtgevers','Sterke seizoensgevoeligheid zonder buffer (winterstop)','Zwak gevulde opdrachtenportefeuille','Sterke afhankelijkheid van één onderaannemer']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Bezetting, vakbekwaamheid en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klanten/leveranciers/vergunningen op naam)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar (bijv. hoofduitvoerder, calculator)',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of opdrachtgeverrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — medewerkers uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'zzpAfhank',label:'Aandeel capaciteit via zzp\'ers/onderaannemers (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO (Bouw & Infra) van toepassing',ph:'',doc:true,req:false,fase:'2'},
        {id:'vakkennis',label:'Vakdiploma\'s / vakbekwaamheidscertificaten (bijv. lasdiploma, VCA-persoonscertificaat)',ph:'',doc:false,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (bedrijfstakpensioenfonds Bouw & Infra + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE-bezetting en functies in kaart','Sleutelpersonen geïdentificeerd','Vakbekwaamheidscertificaten geïnventariseerd','CAO-verplichtingen inzichtelijk','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar (incl. vergunningen op naam)','Sleutelpersonen vertrekrisico na overname','Hoge zzp-afhankelijkheid zonder vaste kern','Bijzondere pensioenverplichtingen (bedrijfstakpensioenfonds)']},
      {id:'compliance',num:'IV',title:'Vergunningen & compliance',desc:'Vergunningen, VCA en aansprakelijkheid.',
       dataFields:[
        {id:'vergunningen',label:'Omgevingsvergunningen lopende/toekomstige projecten',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'materieelEigendom',label:'Materieel in eigendom of (financial) lease',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'vca',label:'VCA-certificering (niveau en geldigheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'aansprakelijkheidsverz',label:'CAR-verzekering / beroeps- en bedrijfsaansprakelijkheidsverzekering',ph:'',doc:true,req:false,fase:'2'},
        {id:'garantieclaims',label:'Lopende garantie-/gebrekenclaims op opgeleverde projecten',ph:'',doc:false,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd',ph:'',doc:false,req:false,fase:'2'},
        {id:'milieu',label:'Milieu-/bodemrisico\'s op projectlocaties',ph:'',doc:true,req:false,fase:'2'},
        {id:'ip',label:'Intellectueel eigendom (IP) / merknaam',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Alle vergunningen actueel en overdraagbaar','VCA-certificering geldig','CAR-/aansprakelijkheidsverzekering gecontroleerd','Openstaande garantieclaims in kaart'],
       redflags:['Vergunning niet overdraagbaar bij eigendomsoverdracht','VCA-certificaat verlopen of ontbrekend','Onbekende/onverzekerde garantieverplichtingen','Bodem- of milieurisico op projectlocatie']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'Calculatie-, planning- en tekensoftware.',
       dataFields:[
        {id:'software',label:'Calculatie- en projectplanningssoftware',ph:'',doc:false,req:true,fase:'1'},
        {id:'bimTekeningen',label:'BIM / tekeningsoftware',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (inkoop, materieelbeheer, HR)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','Calculatiesoftware en licenties overdraagbaar','Materieelbeheer geautomatiseerd'],
       redflags:['Calculatiesoftware verouderd of niet overdraagbaar','Geen digitale projectplanning','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huisvesting',label:'Huisvesting (kantoor/loods) — huur of eigendom + overdraagbaarheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'onderaannemersContracten',label:'Onderaannemers-/leverancierscontracten + exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'leaseMaterieel',label:'Leaseverplichtingen materieel / voertuigen',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'vastgoed',label:'Vastgoed: eigendom of huur + taxatie',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huisvesting overdraagbaar bevestigd','Onderaannemerscontracten inzichtelijk','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huisvesting niet overdraagbaar (dealbreaker)','Exclusieve onderaannemersafspraken vervallen bij overdracht','Openstaande fiscale schulden','Onbekende garantieverplichtingen']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, concurrentie en groeistrategie.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Onderscheidend vermogen',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'verduurzaming',label:'Impact verduurzamingseisen (bijv. BENG, circulair bouwen) op de organisatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld'],
       redflags:['Structurele marktdaling in segment','Onvoldoende voorbereid op verduurzamingseisen','Geen onderscheidend vermogen','Eigenaar is het merk']}
    ]
  },

  // ── TRANSPORT & LOGISTIEK ────────────────────────────────────────────────
  transport: {
    label: 'Transport & Logistiek',
    // Bron-status (13 sep 2026, zie SECTORPROFIEL-BRONNEN.md): multiple 🟢 gebrond — Brookz Overname
    // Barometer H1-2025 (editie 22, blz. 9, spreidingstabel): Automotive, Transport & Logistiek
    // laagste 3,7 / gemiddeld 4,1 / hoogste 4,5. Rechtstreeks uit het PDF-rapport gehaald.
    aiNormen: 'EBITDA-multiple (Brookz H1-2025, Automotive, Transport & Logistiek): laagste 3,7x, gemiddeld 4,1x, hoogste 4,5x. Sector is kapitaal-/materieelintensief (wagenpark) en gevoelig voor brandstofprijzen en regelgeving — geen aparte gebronde marge-/FTE-normen beschikbaar.',
    multipleBasis: 'ebitda', multipleLaag: 3.7, multipleHoog: 4.5,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge en wagenpark.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'brutomarge',label:'Brutomarge — omzet minus directe rit-/brandstofkosten (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'wagenparkWaarde',label:'Boekwaarde wagenpark (€)',ph:'',doc:true,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Contractportefeuille — verwachte omzet komende 12 maanden (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'capexHistorie',label:'Capex-historie 3 jaar (wagenpark) + toekomstige vervangingsinvestering',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/huisvesting (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenBrandstof',label:'Brandstof-/energiekosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Wagenpark getaxeerd/geïnventariseerd','Contractportefeuille inzichtelijk','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende brutomarge (brandstofprijsdruk)','Verouderd wagenpark zonder vervangingsinvestering','Negatief eigen vermogen','Sterk wisselende omzet zonder verklaring']},
      {id:'commercieel',num:'II',title:'Opdrachten & klanten',desc:'Verladers, contracten en vervoersmix.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal vaste verladers/opdrachtgevers',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10Leveranciers',label:'Top 10 onderaannemers/vervoerders — aandeel in totale inkoop (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste opdrachtgever — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 opdrachtgevers samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Vaste routes/contracten — terugkerende omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'seizoen',label:'Seizoensgevoeligheid',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal vestigingen/depots',ph:'',doc:false,req:true,fase:'1'},
        {id:'aanbestedingen',label:'Aandeel omzet uit aanbestedingen/tenders (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Contractportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per opdrachtgever/contract',ph:'',doc:false,req:false,fase:'2'},
        {id:'vervoersmix',label:'Vervoersmix (binnenlands / internationaal / gekoeld / specialistisch)',ph:'',doc:false,req:false,fase:'2'},
        {id:'onderaannemersAfhank',label:'Afhankelijkheid van onderaannemers-vervoerders (contracten, exclusiviteit)',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Opdrachtgeversconcentratie geanalyseerd','Vaste-contractenaandeel inzichtelijk','Seizoenspatroon in kaart','Vervoersmix vastgesteld'],
       redflags:['Omzet bij 1-2 grote verladers','Sterke seizoensgevoeligheid zonder buffer','Zwak gevulde contractportefeuille','Sterke afhankelijkheid van onderaannemer-vervoerders']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Bezetting, chauffeurs en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'chauffeursAantal',label:'Aantal chauffeurs (in loondienst + zzp/uitzend)',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klanten/leveranciers/vergunningen op naam)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar (bijv. planner, hoofd wagenpark)',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — chauffeurs/staf uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'rijbewijsCode95',label:'Geldigheid rijbewijs code 95 / nascholingscertificaten chauffeurs',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO Beroepsgoederenvervoer/Logistiek van toepassing',ph:'',doc:true,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (bedrijfstakpensioenfonds Vervoer + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE- en chauffeursbezetting in kaart','Sleutelpersonen geïdentificeerd','Rijbewijs/nascholingscertificaten actueel','CAO-verplichtingen inzichtelijk','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar (incl. vergunningen op naam)','Chauffeurstekort / hoog verloop','Verlopen rijbewijs code 95-certificaten','Bijzondere pensioenverplichtingen (bedrijfstakpensioenfonds)']},
      {id:'compliance',num:'IV',title:'Vergunningen & compliance',desc:'Vervoersvergunningen en verzekering.',
       dataFields:[
        {id:'vervoersvergunning',label:'Eurovergunning / NIWO-vergunning',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'wagenparkEigendom',label:'Wagenpark in eigendom of (financial) lease',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'certificeringen',label:'Kwaliteitscertificering (bijv. ISO, keurmerk transport)',ph:'',doc:true,req:false,fase:'2'},
        {id:'aansprakelijkheidsverz',label:'CMR-verzekering / vervoerdersaansprakelijkheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'milieu',label:'Milieuzone-toegang / Euro-emissieklasse wagenpark',ph:'',doc:true,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd',ph:'',doc:false,req:false,fase:'2'},
        {id:'ip',label:'Intellectueel eigendom (IP) / merknaam',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Vervoersvergunning actueel en overdraagbaar','CMR-verzekering gecontroleerd','Wagenpark voldoet aan milieuzone-eisen','Openstaande procedures in kaart'],
       redflags:['Vervoersvergunning niet overdraagbaar bij eigendomsoverdracht','Wagenpark voldoet niet aan (toekomstige) milieuzone-eisen','Onvoldoende verzekerde aansprakelijkheid','Lopende juridische procedures']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'Planning, telematica en trackingsystemen.',
       dataFields:[
        {id:'software',label:'Transportmanagementsysteem (TMS) / planningssoftware',ph:'',doc:false,req:true,fase:'1'},
        {id:'telematica',label:'Telematica / boordcomputers / tracking',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (facturatie, HR, onderhoudsbeheer)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','TMS en licenties overdraagbaar','Telematica/tracking operationeel'],
       redflags:['TMS verouderd of niet overdraagbaar','Geen tracking/telematica','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huisvesting',label:'Huisvesting (depot/kantoor) — huur of eigendom + overdraagbaarheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'leveranciers',label:'Onderaannemers-/leverancierscontracten + exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'leaseVoertuigen',label:'Leaseverplichtingen voertuigen/materieel',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'vastgoed',label:'Vastgoed: eigendom of huur + taxatie',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huisvesting overdraagbaar bevestigd','Leverancierscontracten inzichtelijk','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huisvesting niet overdraagbaar (dealbreaker)','Exclusieve afspraken vervallen bij overdracht','Openstaande fiscale schulden','Onbekende garantieverplichtingen']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, concurrentie en groeistrategie.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Onderscheidend vermogen',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'verduurzaming',label:'Impact vervoersverduurzaming (elektrificatie wagenpark, CO2-normen)',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld'],
       redflags:['Structurele marktdaling in segment','Onvoldoende voorbereid op verduurzamingseisen (milieuzones)','Geen onderscheidend vermogen','Eigenaar is het merk']}
    ]
  },

  // ── HANDEL / GROOTHANDEL ─────────────────────────────────────────────────
  handel: {
    label: 'Handel / Groothandel',
    // Bron-status (13 sep 2026, zie SECTORPROFIEL-BRONNEN.md): multiple 🟢 gebrond — Brookz Overname
    // Barometer H1-2025 (editie 22, blz. 9, spreidingstabel): Groothandel laagste 4,8 / gemiddeld
    // 5,2 / hoogste 5,9. Rechtstreeks uit het PDF-rapport gehaald. "Groothandel" is de dichtstbijzijnde
    // Brookz-categorie voor algemene handel — geen aparte notering voor detailhandel-in-groothandel-
    // achtige tussenvormen; bij twijfel over de precieze subsector navragen bij Marcel.
    aiNormen: 'EBITDA-multiple (Brookz H1-2025, Groothandel): laagste 4,8x, gemiddeld 5,2x, hoogste 5,9x. Sector kent doorgaans voorraadrisico en leveranciersconcentratie — geen aparte gebronde marge-/FTE-normen beschikbaar.',
    multipleBasis: 'ebitda', multipleLaag: 4.8, multipleHoog: 5.9,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge, voorraad en werkkapitaal.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'brutomarge',label:'Brutomarge — omzet minus inkoopkosten (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'voorraad',label:'Voorraadwaarde indicatief (€)',ph:'',doc:true,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Orderportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'voorraadomzet',label:'Voorraadomzetsnelheid (x per jaar)',ph:'',doc:false,req:false,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'capexHistorie',label:'Capex-historie 3 jaar + toekomstige investeringsbehoefte (magazijn/logistiek)',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'rentelasten',label:'Rentelasten per jaar (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'aflossingVerplicht',label:'Jaarlijkse aflossingsverplichting op leningen (€)',ph:'',doc:false,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/magazijn (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenInkoop',label:'Inkoopkosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Brutomarge per productgroep inzichtelijk','Voorraad gewaardeerd en gecontroleerd','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende brutomarge (prijsdruk of kostenstijging)','Hoge voorraadwaarde tov omzet (courantheid onduidelijk)','Negatief eigen vermogen','Sterk wisselende omzet zonder verklaring']},
      {id:'commercieel',num:'II',title:'Omzet & klanten',desc:'Omzetmix, klantenbasis en leveranciersconcentratie.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve klanten / transacties p/j',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10Leveranciers',label:'Top 10 leveranciers — aandeel in totale inkoop (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste klant — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 klanten samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Vaste/terugkerende omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'seizoen',label:'Seizoensgevoeligheid',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal magazijnen / vestigingen',ph:'',doc:false,req:true,fase:'1'},
        {id:'online',label:'Online / B2B-portaal omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'importExportAandeel',label:'Aandeel omzet uit import/export (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Orderportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per klant/transactie',ph:'',doc:false,req:false,fase:'2'},
        {id:'productmix',label:'Productmix / assortiment (details)',ph:'',doc:false,req:false,fase:'2'},
        {id:'leveranciersAfhank',label:'Leveranciersafhankelijkheid (contracten, exclusiviteit)',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Omzetmix per productgroep/kanaal inzichtelijk','Klant- en leveranciersconcentratie geanalyseerd','Seizoenspatroon in kaart','Import/export-afhankelijkheid vastgesteld'],
       redflags:['Omzet bij 1-2 grootafnemers (B2B)','Sterke leveranciersconcentratie (1-2 leveranciers)','Sterke seizoensgevoeligheid zonder buffer','Hoge valuta-/importafhankelijkheid zonder afdekking']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Bezetting, sleutelpersonen en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klanten/leveranciers)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar (bijv. inkoper, magazijnchef)',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar/partners die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of leveranciersrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — medewerkers uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'parttime',label:'Parttime medewerkers (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO van toepassing',ph:'',doc:true,req:false,fase:'2'},
        {id:'vakkennis',label:'Specifieke vakkennis / certificeringen',ph:'',doc:false,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (soort + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE-bezetting en functies in kaart','Sleutelpersonen geïdentificeerd','Eigenaar-afhankelijkheid beoordeeld','CAO-verplichtingen inzichtelijk','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar','Sleutelpersonen vertrekrisico na overname','Hoog verloop','Bijzondere CAO-verplichtingen of pensioenrisico']},
      {id:'compliance',num:'IV',title:'Vergunningen & compliance',desc:'Vergunningen, douane en certificeringen.',
       dataFields:[
        {id:'vergunningen',label:'Bedrijfs-/opslagvergunningen (gemeentelijk/nationaal)',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'huurOverdraagbaar',label:'Huur-/magazijncontract overdraagbaar (dealbreaker)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'certificeringen',label:'Kwaliteitscertificaten / keurmerken',ph:'',doc:true,req:false,fase:'2'},
        {id:'douaneAgv',label:'Douane-/AEO-status bij import/export',ph:'',doc:false,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd',ph:'',doc:false,req:false,fase:'2'},
        {id:'milieu',label:'Milieu- of omgevingsvergunning (opslag)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ip',label:'Intellectueel eigendom (IP) / merknaam',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Alle vergunningen actueel en overdraagbaar','Keurmerken en certificeringen doorgenomen','Douane-/importstatus geverifieerd','Openstaande procedures in kaart'],
       redflags:['Vergunning niet overdraagbaar bij eigendomsoverdracht','Douane-/importissues','Lopende juridische procedures','Milieu- of omgevingsproblemen (opslag)']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'Voorraadbeheer, ERP en e-commerce.',
       dataFields:[
        {id:'software',label:'ERP / voorraadbeheersysteem (WMS)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ecommerce',label:'E-commerce / B2B-portaal',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (inkoop, voorraad, HR)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','E-commerce/B2B-portaal aanwezig en functioneel','Voorraadbeheer geautomatiseerd'],
       redflags:['WMS/ERP verouderd of niet schaalbaar','Geen e-commerce/B2B-portaal in digitaliserende markt','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huur',label:'Huurcontract magazijn/kantoor (looptijd + overdraagbaarheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'leveranciers',label:'Leverancierscontracten + exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'lease',label:'Leaseverplichtingen apparatuur / voertuigen',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'vastgoed',label:'Vastgoed: eigendom of huur + taxatie',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huurcontract overdraagbaar bevestigd','Leverancierscontracten inzichtelijk','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huurcontract niet overdraagbaar (dealbreaker)','Exclusieve leveranciersafspraken vervallen bij overdracht','Openstaande fiscale schulden','Onbekende garantieverplichtingen']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, concurrentie en groeistrategie.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Onderscheidend vermogen',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'aiImpact',label:'Impact digitalisering / marktdisruptie (bijv. directe fabrikantverkoop)',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld'],
       redflags:['Structurele marktdaling in segment','Locatie-afhankelijkheid zonder huurzekerheid','Geen onderscheidend vermogen','Eigenaar is het merk']}
    ]
  },

  // ── ZAKELIJKE DIENSTVERLENING / CONSULTANCY ──────────────────────────────
  consultancy: {
    label: 'Zakelijke Dienstverlening / Consultancy',
    // Bron-status (15 sep 2026, zie SECTORPROFIEL-BRONNEN.md): multiple 🟢 gebrond — Brookz Overname
    // Barometer H1-2025 (editie 22, blz. 9, spreidingstabel): "Zakelijke dienstverlening" laagste 4,6 /
    // gemiddeld 4,9 / hoogste 5,4. Dit is de Brookz-categorie waar managementadvies/consultancy (CBS
    // SBI 70.22, ~173.000 bedrijven — verreweg het grootste deelsegment binnen "specialistische
    // zakelijke dienstverlening") onder valt; Brookz splitst dit niet verder uit naar consultancy vs.
    // juridisch/architecten/reclame, dus dit is de meest precieze bron die beschikbaar is. Scope van
    // dit profiel is bewust gericht op advies-/consultancybedrijven (uren-/projectgedreven, geen
    // fysieke voorraad) — juridisch/architecten/reclame vallen hier qua naam onder maar hebben eigen
    // dynamiek (bijv. beëdiging, portefeuilleverzekering) die dit profiel nog niet dekt; apart oppakken
    // wanneer nodig, niet stilzwijgend aannemen dat dit profiel daar ook goed op past.
    aiNormen: 'EBITDA-multiple (Brookz H1-2025, Zakelijke dienstverlening): laagste 4,6x, gemiddeld 4,9x, hoogste 5,4x. Sector is mensenintensief (geen voorraad/materieel) — waarde zit in de adviseurs en klantrelaties, niet in activa. Geen aparte gebronde marge-/FTE-normen beschikbaar; utilisatiegraad (declarabele uren t.o.v. beschikbare uren) is de gangbare interne KPI maar niet extern gebrond.',
    multipleBasis: 'ebitda', multipleLaag: 4.6, multipleHoog: 5.4,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge en onderhanden werk (onbelaste uren).',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'utilisatiegraad',label:'Utilisatiegraad — declarabele uren t.o.v. beschikbare uren (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Contractportefeuille — verwachte omzet komende 12 maanden (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'ohwWaarde',label:'Onderhanden werk (OHW) — gewerkte, nog niet gefactureerde uren (€)',ph:'',doc:true,req:true,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/huisvesting (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenInhuur',label:'Inhuur zzp/freelance-adviseurs (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Onderhanden werk (onbelaste uren) gewaardeerd','Utilisatiegraad inzichtelijk','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende utilisatiegraad','Hoge OHW-waarde tov omzet (facturatie loopt achter)','Negatief eigen vermogen','Sterk wisselende omzet zonder verklaring']},
      {id:'commercieel',num:'II',title:'Klanten & contracten',desc:'Klantconcentratie, contractvorm en herhaalomzet.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal actieve klanten / opdrachten per jaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'top1pct',label:'Grootste klant — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 klanten samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Retainer/contractbasis — vaste, terugkerende omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'contractvorm',label:'Contractvorm — vaste prijs / uurtarief / retainer (verdeling %)',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal vestigingen / werkgebied (regio\'s)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Contractportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per klant/opdracht',ph:'',doc:false,req:false,fase:'2'},
        {id:'klantContractenAfhank',label:'Change-of-control-clausules in klantcontracten',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid van het adviesmodel',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Klantconcentratie geanalyseerd','Contractvorm-mix inzichtelijk','Retainer-aandeel vastgesteld','Change-of-control-clausules gecontroleerd'],
       redflags:['Omzet bij 1-2 grote klanten','Nauwelijks retainer-/contractomzet (vrijwel alles ad-hoc)','Klantrelatie zit persoonlijk bij één adviseur, niet bij het bedrijf','Change-of-control-clausule laat klant vertrekken bij eigendomswissel']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Adviseurs, sleutelpersonen en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klantrelaties op naam van eigenaar)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar (senior adviseurs met eigen klantportefeuille)',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of klantrelaties dat aan één adviseur hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor sleuteladviseurs (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — adviseurs uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'zzpAfhank',label:'Aandeel capaciteit via zzp\'ers/freelance adviseurs (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO van toepassing',ph:'',doc:true,req:false,fase:'2'},
        {id:'vakkennis',label:'Vakcertificeringen (bijv. Prince2, Scrum, branche-erkenning)',ph:'',doc:false,req:false,fase:'2'},
        {id:'nonConcurrentie',label:'Non-concurrentie-/relatiebedingen adviseurs',ph:'',doc:true,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (soort + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE-bezetting en functies in kaart','Sleuteladviseurs geïdentificeerd','Non-concurrentiebedingen gecontroleerd','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar (klantrelaties niet overdraagbaar)','Sleuteladviseur kan zonder beding vertrekken en klanten meenemen','Hoge zzp-afhankelijkheid zonder vaste kern','Geen tweede echelon onder de eigenaar']},
      {id:'compliance',num:'IV',title:'Verzekering & compliance',desc:'Beroepsaansprakelijkheid en gegevensbescherming.',
       dataFields:[
        {id:'aansprakelijkheidsverz',label:'Beroepsaansprakelijkheidsverzekering (dekking en geldigheid)',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'certificeringen',label:'Kwaliteitscertificeringen / keurmerken (bijv. ISO 9001)',ph:'',doc:true,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance (klantgegevens, verwerkersovereenkomsten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd (indien financieel/fiscaal advies)',ph:'',doc:false,req:false,fase:'2'},
        {id:'ip',label:'Eigen methodieken/frameworks (IP) vastgelegd',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Beroepsaansprakelijkheidsverzekering gecontroleerd','AVG/verwerkersovereenkomsten op orde','Openstaande claims in kaart'],
       redflags:['Geen of ontoereikende beroepsaansprakelijkheidsverzekering','Lopende claim die de verzekeringsdekking overschrijdt','Geen verwerkersovereenkomsten met klanten (AVG-risico)']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'Urenregistratie, CRM en kennismanagement.',
       dataFields:[
        {id:'software',label:'Urenregistratie- en projectmanagementsysteem',ph:'',doc:false,req:true,fase:'1'},
        {id:'crm',label:'CRM-systeem',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kennisSystemen',label:'Kennismanagement — methodieken/templates vastgelegd en overdraagbaar',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','Urenregistratie en licenties overdraagbaar','Kennis/methodieken vastgelegd (niet alleen in hoofden van adviseurs)'],
       redflags:['Kennis zit alleen in hoofden van individuele adviseurs, niet vastgelegd','Urenregistratie/facturatie handmatig en foutgevoelig','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, klantcontracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huisvesting',label:'Huisvesting (kantoor) — huur of eigendom + overdraagbaarheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'klantcontracten',label:'Klantcontracten — looptijd, opzegtermijn, exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details)',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huisvesting overdraagbaar bevestigd','Klantcontracten inzichtelijk (looptijd + opzegtermijn)','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huisvesting niet overdraagbaar','Klantcontracten kort opzegbaar zonder exclusiviteit','Openstaande fiscale schulden','Onbekende garantieverplichtingen']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, specialisme en schaalbaarheid.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Specialisme / onderscheidend vermogen',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'aiImpact',label:'Impact AI/automatisering op het adviesmodel',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Schaalbaarheid — kan het model groeien zonder lineair meer FTE?',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld','Schaalbaarheid van het model beoordeeld'],
       redflags:['Structurele marktdaling in segment','Model schaalt niet zonder lineaire FTE-groei','Geen onderscheidend vermogen','Eigenaar is het merk/de expertise']}
    ]
  },

  // ── VERHUISBRANCHE ────────────────────────────────────────────────────────
  verhuizingen: {
    label: 'Verhuisbranche',
    // Bron-status (15 sep 2026, zie SECTORPROFIEL-BRONNEN.md, Marcel: "bouw ook verhuisbranche in"):
    // Brookz Overname Barometer H1-2025 (editie 22, blz. 9) heeft GEEN aparte categorie voor
    // verhuisbedrijven — de dichtstbijzijnde, meest logische Brookz-categorie is "Automotive,
    // Transport & Logistiek" (laagste 3,7 / gemiddeld 4,1 / hoogste 4,5), dezelfde die ook voor het
    // 'transport'-sectorprofiel hierboven wordt gebruikt. Expliciet hergebruikt, niet apart
    // "ontdekt" — verhuisbedrijven zijn wagenpark-/vergunningsintensieve vervoersbedrijven, wat deze
    // categorie tot de best beschikbare, eerlijke benadering maakt. Bij twijfel of dit voor een
    // specifiek verhuisbedrijf klopt: navragen, niet aannemen.
    aiNormen: 'EBITDA-multiple (Brookz H1-2025, dichtstbijzijnde categorie Automotive/Transport & Logistiek — geen aparte Brookz-notering voor verhuisbedrijven): laagste 3,7x, gemiddeld 4,1x, hoogste 4,5x. Sector is kapitaal-/materieelintensief (verhuiswagens, liften, materiaal) en seizoensgevoelig (piekdrukte zomer/maandwisselingen) — geen aparte gebronde marge-/FTE-normen beschikbaar.',
    multipleBasis: 'ebitda', multipleLaag: 3.7, multipleHoog: 4.5,
    fases: [
      {id:'financieel',num:'I',title:'Financieel',desc:'Omzet, marge en wagenpark/materieel.',
       dataFields:[
        {id:'_hdr_pl',label:'— P&L (3 jaar + YTD)',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'omzet1',label:'Jaaromzet jaar 1 (oudste)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet2',label:'Jaaromzet jaar 2',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzet3',label:'Jaaromzet jaar 3 (meest recent)',ph:'',doc:true,req:true,fase:'1'},
        {id:'omzetYTD',label:'Omzet YTD huidig jaar',ph:'',doc:true,req:true,fase:'1'},
        {id:'ebitda',label:'EBITDA jaar 3 — absoluut bedrag (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'ebitdaMarge',label:'EBITDA-marge jaar 3 — percentage van omzet (%) — optioneel, wordt anders berekend uit EBITDA / omzet',ph:'',doc:false,req:false,fase:'1'},
        {id:'brutomarge',label:'Brutomarge — omzet minus directe rit-/materiaalkosten (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'dgaSalaris',label:'DGA-salaris / eigenaarsonttrekking per jaar (€)',ph:'',doc:false,req:true,fase:'1'},
        {id:'normalisatie',label:'Normalisaties (eenmalige posten)',ph:'',doc:false,req:false,fase:'1'},
        {id:'wagenparkWaarde',label:'Boekwaarde wagenpark en verhuisliften (€)',ph:'',doc:true,req:true,fase:'1'},
        {id:'orderportefeuille',label:'Boekingenportefeuille — verwachte omzet komende 12 maanden (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'forecast',label:'Omzetforecast komend jaar (€)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_wk2',label:'— Werkkapitaal & balans (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'ebitdaNorm',label:'Genormaliseerde EBITDA (gevalideerd)',ph:'',doc:true,req:true,fase:'2'},
        {id:'debiteuren',label:'Debiteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'crediteuren',label:'Crediteuren totaal',ph:'',doc:true,req:false,fase:'2'},
        {id:'nwcAnalyse',label:'Netto werkkapitaalanalyse (NWC)',ph:'',doc:true,req:false,fase:'2'},
        {id:'capexHistorie',label:'Capex-historie 3 jaar (wagenpark/liften) + toekomstige vervangingsinvestering',ph:'',doc:true,req:false,fase:'2'},
        {id:'eigVermoeden',label:'Eigen vermogen',ph:'',doc:true,req:false,fase:'2'},
        {id:'resultaat',label:'Nettoresultaat na belasting, meest recent boekjaar (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'balansTotaal',label:'Balanstotaal / totale activa (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'liquideMiddelen',label:'Liquide middelen — kas + bank (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'kortlopendeSchulden',label:'Kortlopende schulden (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'langlopendeSchulden',label:'Langlopende schulden / leningen (€)',ph:'',doc:true,req:false,fase:'2'},
        {id:'_hdr_kost2',label:'— Kostenstructuur (jaar 3)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'kostenPersoneel',label:'Personeelskosten (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenHuisvesting',label:'Huur/opslagruimte (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenBrandstof',label:'Brandstof-/materiaalkosten (verpakking, dozen) (% omzet)',ph:'',doc:false,req:false,fase:'2'},
        {id:'kostenOverig',label:'Overige kosten (% omzet)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Jaarrekeningen 3 jaar beschikbaar','YTD-cijfers aangeleverd','Wagenpark/liften getaxeerd/geïnventariseerd','Boekingenportefeuille inzichtelijk','Werkkapitaalbehoefte bepaald'],
       redflags:['Dalende brutomarge (brandstof-/materiaalprijsdruk)','Verouderd wagenpark zonder vervangingsinvestering','Negatief eigen vermogen','Sterk seizoensafhankelijke omzet zonder buffer']},
      {id:'commercieel',num:'II',title:'Opdrachten & klanten',desc:'Particulier/zakelijk, contracten en seizoenspatroon.',
       dataFields:[
        {id:'aantalKlanten',label:'Aantal verhuizingen per jaar (particulier + zakelijk)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10Leveranciers',label:'Top 10 onderaannemers/partnerverhuizers — aandeel in totale inkoop (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'top1pct',label:'Grootste zakelijke opdrachtgever/makelaarsrelatie — aandeel in totale omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'top10pct',label:'Top 10 zakelijke opdrachtgevers samen — aandeel in totale omzet (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'recurring',label:'Vaste zakelijke relocatie-contracten/makelaarsrelaties — terugkerende omzet (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'seizoen',label:'Seizoensgevoeligheid (zomerpiek, maandwisselingen)',ph:'',doc:false,req:true,fase:'1'},
        {id:'locaties',label:'Aantal vestigingen/opslagdepots',ph:'',doc:false,req:true,fase:'1'},
        {id:'internationaalAandeel',label:'Aandeel omzet uit internationale verhuizingen (%)',ph:'',doc:false,req:false,fase:'1'},
        {id:'orderPortefeuille',label:'Boekingenportefeuille / pipeline',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_com2',label:'— Commercial DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'omzetPerKlant',label:'Gem. omzet per verhuizing',ph:'',doc:false,req:false,fase:'2'},
        {id:'dienstenmix',label:'Dienstenmix (particulier / zakelijk / internationaal / opslag)',ph:'',doc:false,req:false,fase:'2'},
        {id:'onderaannemersAfhank',label:'Afhankelijkheid van onderaannemer-verhuizers (contracten, exclusiviteit)',ph:'',doc:true,req:false,fase:'2'},
        {id:'marktaandeel',label:'Marktaandeel validatie',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Opdrachtgeversconcentratie geanalyseerd','Terugkerende-contractenaandeel inzichtelijk','Seizoenspatroon in kaart','Dienstenmix vastgesteld'],
       redflags:['Omzet bij 1-2 grote zakelijke opdrachtgevers/makelaars','Sterke seizoensgevoeligheid zonder buffer','Zwak gevulde boekingenportefeuille','Sterke afhankelijkheid van onderaannemer-verhuizers']},
      {id:'partner',num:'III',title:'Personeel & organisatie',desc:'Bezetting, verhuizers en overdraagbaarheid.',
       dataFields:[
        {id:'fte',label:'Totaal FTE',ph:'',doc:false,req:true,fase:'1'},
        {id:'verhuizersAantal',label:'Aantal verhuizers/inpakkers (in loondienst + zzp/uitzend)',ph:'',doc:false,req:true,fase:'1'},
        {id:'aantalP',label:'Aantal eigenaren / DGA',ph:'',doc:false,req:true,fase:'1'},
        {id:'eigenaarAfhank',label:'Eigenaar-afhankelijkheid (klanten/makelaars/vergunningen op naam)',ph:'',doc:false,req:true,fase:'1'},
        {id:'sleutelpersonen',label:'Sleutelpersonen buiten eigenaar (bijv. planner, ervaren ploegleider)',ph:'',doc:false,req:true,fase:'1'},
        {id:'organogram',label:'Organogram / structuur',ph:'',doc:true,req:false,fase:'1'},
        {id:'opvolging',label:'Interne opvolger aanwezig',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_mgmt',label:'— Management & sleutelpersoon-afhankelijkheid',ph:'',doc:false,req:false,header:true,fase:'1'},
        {id:'tweedeEchelon',label:'Tweede echelon — managementlaag onder eigenaar die de onderneming draaiend houdt (aanwezig? hoe sterk?)',ph:'',doc:false,req:true,fase:'1'},
        {id:'keyPersonAfhank',label:'Key-person-afhankelijkheid — grootste aandeel omzet of klantrelaties dat aan één persoon hangt (%)',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_hr2',label:'— HR DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'mgmtRetentie',label:'Aanblijf-/retentieafspraken voor management/sleutelpersonen (bonus, earn-in, lock-up)',ph:'',doc:true,req:false,fase:'2'},
        {id:'verloop',label:'Personeelsverloop — verhuizers/staf uit dienst per jaar (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'zzpAfhank',label:'Aandeel capaciteit via zzp\'ers/uitzendkrachten in het hoogseizoen (%)',ph:'',doc:false,req:false,fase:'2'},
        {id:'cao',label:'CAO Verhuisbranche (indien van toepassing)',ph:'',doc:true,req:false,fase:'2'},
        {id:'pContract',label:'Arbeidscontracten actueel',ph:'',doc:true,req:false,fase:'2'},
        {id:'pensioenReg',label:'Pensioenregeling (soort + kosten)',ph:'',doc:true,req:false,fase:'2'},
        {id:'ziekteverzuim',label:'Ziekteverzuim (%)',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['FTE- en verhuizersbezetting in kaart','Sleutelpersonen geïdentificeerd','Flexschil voor hoogseizoen inzichtelijk','CAO-verplichtingen inzichtelijk','Opvolgingsplan aanwezig'],
       redflags:['Hele bedrijf draait op eigenaar (incl. vergunningen op naam)','Structureel personeelstekort in hoogseizoen','Hoge zzp-afhankelijkheid zonder vaste kern','Bijzondere pensioenverplichtingen']},
      {id:'compliance',num:'IV',title:'Vergunningen & compliance',desc:'Vergunningen, keurmerk en verzekering.',
       dataFields:[
        {id:'vervoersvergunning',label:'NIWO-vergunning (indien van toepassing)',ph:'',doc:true,req:true,fase:'1'},
        {id:'tuchtzaken',label:'Lopende juridische procedures / claims',ph:'',doc:false,req:true,fase:'1'},
        {id:'wagenparkEigendom',label:'Wagenpark/liften in eigendom of (financial) lease',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_comp2',label:'— Compliance DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'erkendVerhuizer',label:'Keurmerk Erkende Verhuizer of vergelijkbaar (status en geldigheid)',ph:'',doc:true,req:false,fase:'2'},
        {id:'aansprakelijkheidsverz',label:'CMR-verzekering / vervoerdersaansprakelijkheid / inboedelverzekering klant',ph:'',doc:true,req:false,fase:'2'},
        {id:'klachtenregeling',label:'Klachtenregeling / geschillencommissie aangesloten',ph:'',doc:false,req:false,fase:'2'},
        {id:'wwft',label:'Wwft van toepassing en geïmplementeerd (indien relevant)',ph:'',doc:false,req:false,fase:'2'},
        {id:'ip',label:'Intellectueel eigendom (IP) / merknaam',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['NIWO-vergunning actueel en overdraagbaar','Keurmerk/certificering gecontroleerd','CMR-/inboedelverzekering gecontroleerd','Openstaande claims in kaart'],
       redflags:['Vergunning niet overdraagbaar bij eigendomsoverdracht','Keurmerk verlopen of ontbrekend','Onvoldoende verzekerde aansprakelijkheid/inboedelschade','Lopende juridische procedures of veel klachten']},
      {id:'it',num:'V',title:'Systemen & digitalisering',desc:'Planning, offertes en track&trace.',
       dataFields:[
        {id:'software',label:'Planningssoftware / offertesysteem',ph:'',doc:false,req:true,fase:'1'},
        {id:'trackTrace',label:'Track&trace / klantcommunicatie tijdens verhuizing',ph:'',doc:false,req:false,fase:'1'},
        {id:'autoGraad',label:'Automatiseringsgraad — Laag / Gemiddeld / Hoog',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_it2',label:'— IT DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'softwareOverig',label:'Overige systemen (facturatie, HR, voorraad verpakkingsmateriaal)',ph:'',doc:false,req:false,fase:'2'},
        {id:'licentiesOverdraagbaar',label:'Licenties overdraagbaar bij overname',ph:'',doc:false,req:false,fase:'2'},
        {id:'security',label:'Cybersecurity en dataveiligheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'itRisico',label:'Bekende IT-risicos of legacy-systemen',ph:'',doc:false,req:false,fase:'2'},
        {id:'avg',label:'AVG-compliance (klantgegevens inventarisatie/adressen)',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['ICT-landschap in kaart','Planningssoftware en licenties overdraagbaar','Track&trace operationeel'],
       redflags:['Planning verouderd of niet overdraagbaar','Geen digitale offertes/inventarisatie','Data en systemen niet overdraagbaar']},
      {id:'juridisch',num:'VI',title:'Juridisch & fiscaal',desc:'Structuur, contracten en fiscale risico.',
       dataFields:[
        {id:'rechtsvorm',label:'Rechtsvorm(en)',ph:'',doc:true,req:true,fase:'1'},
        {id:'structuur',label:'Eigendomsstructuur',ph:'',doc:true,req:true,fase:'1'},
        {id:'vpb',label:'VPB / BTW openstaande discussies',ph:'',doc:false,req:true,fase:'1'},
        {id:'lopendeClaims',label:'Lopende claims / geschillen',ph:'',doc:false,req:true,fase:'1'},
        {id:'_hdr_jur2',label:'— Legal & Tax DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'huisvesting',label:'Huisvesting (kantoor/opslagdepot) — huur of eigendom + overdraagbaarheid',ph:'',doc:true,req:false,fase:'2'},
        {id:'partnerContracten',label:'Contracten met makelaars/relocatiebureaus + exclusiviteit',ph:'',doc:true,req:false,fase:'2'},
        {id:'changeControl',label:'Change-of-control clausules sleutelcontracten',ph:'',doc:false,req:false,fase:'2'},
        {id:'overigeClaims',label:'Claims, garanties, aansprakelijkheden (details, incl. schadeclaims inboedel)',ph:'',doc:true,req:false,fase:'2'},
        {id:'leaseVoertuigen',label:'Leaseverplichtingen voertuigen/liften',ph:'',doc:true,req:false,fase:'2'},
        {id:'fiscaalRisico',label:'Fiscale risicos (privégebruik, transfer pricing)',ph:'',doc:false,req:false,fase:'2'},
        {id:'taxDD',label:'Tax DD: BTW, loonheffing, VPB-aangiften 3 jaar',ph:'',doc:true,req:false,fase:'2'},
        {id:'vastgoed',label:'Vastgoed: eigendom of huur + taxatie',ph:'',doc:true,req:false,fase:'2'}
       ],
       items:['Huisvesting/opslagdepot overdraagbaar bevestigd','Makelaars-/partnercontracten inzichtelijk','VPB en BTW-positie beoordeeld','Aansprakelijkheden vastgesteld'],
       redflags:['Huisvesting/opslag niet overdraagbaar (dealbreaker)','Exclusieve partnerafspraken vervallen bij overdracht','Openstaande fiscale schulden','Onbekende schadeclaims inboedel']},
      {id:'strategisch',num:'VII',title:'Markt & groeipotentieel',desc:'Marktpositie, specialisme en groeistrategie.',
       dataFields:[
        {id:'marktpos',label:'Marktpositie / regio',ph:'',doc:false,req:true,fase:'1'},
        {id:'niche',label:'Specialisme (bijv. internationaal, kunst/piano, archief, opslag)',ph:'',doc:false,req:true,fase:'1'},
        {id:'groeipotentieel',label:'Groeimogelijkheden',ph:'',doc:false,req:true,fase:'1'},
        {id:'synergie',label:'Gewenste vervolgstap eigenaar',ph:'',doc:false,req:true,fase:'1'},
        {id:'tijdlijn',label:'Gewenste tijdlijn overdracht',ph:'',doc:false,req:true,fase:'1'},
        {id:'risicoFactoren',label:'Grootste risicofactoren (eigen inschatting)',ph:'',doc:false,req:false,fase:'1'},
        {id:'_hdr_str2',label:'— Commercial & Operational DD (post-LOI)',ph:'',doc:false,req:false,header:true,fase:'2'},
        {id:'concurrenten',label:'Directe concurrenten + marktaandeel',ph:'',doc:false,req:false,fase:'2'},
        {id:'cultuurFit',label:'Bedrijfscultuur en teamdynamiek',ph:'',doc:false,req:false,fase:'2'},
        {id:'verduurzaming',label:'Impact vervoersverduurzaming (elektrificatie wagenpark, CO2-normen)',ph:'',doc:false,req:false,fase:'2'},
        {id:'schaalbaarheid',label:'Operationele schaalbaarheid',ph:'',doc:false,req:false,fase:'2'},
        {id:'dealStructuur',label:'Voorkeur dealstructuur',ph:'',doc:false,req:false,fase:'2'}
       ],
       items:['Regionale concurrentieanalyse gedaan','Groeipotentieel gekwantificeerd','Cultuurfit beoordeeld'],
       redflags:['Structurele marktdaling in segment','Onvoldoende voorbereid op verduurzamingseisen','Geen onderscheidend vermogen','Eigenaar is het merk']}
    ]
  }
};

// Bepaal actief sectorprofiel op basis van traject
function getSectorProfiel() {
  var sector = S.traject && S.traject.sector;
  if (sector && SECTOR_PROFIELEN[sector]) return SECTOR_PROFIELEN[sector];
  // Fallback: accountancy als standaard (bestaand gedrag)
  return SECTOR_PROFIELEN.accountancy;
}

function getSectorFases() {
  return getSectorProfiel().fases;
}

// Sectorafhankelijk "eigenaar-/partnerbeloning"-concept (21 aug 2026, live-testbug gevonden door
// Marcel bij Bistro/mkb en bevestigd voor autodealer/mkb en vermoedelijk zorg): het veld-ID én de
// juiste terminologie verschillen per sector — accountancy/zorg noemen dit 'partnerBel' (al heeft
// zorg zelf al de juiste eigen label "Eigenaarssalaris p/j"), mkb gebruikt een heel ander veld-ID
// ('dgaSalaris'), en itsoftware heeft helemaal geen equivalent veld. Vóór deze fix was de kritieke-
// discrepantiecheck in mna/06-schermen.js hardcoded op 'financieel_partnerBel' met de tekst
// "Partnerbeloning" — dat blokkeerde niet-accountancy trajecten op een veld dat voor die sector
// nooit bestond (mkb/itsoftware), met bovendien de verkeerde term voor een eigenaar i.p.v. partner.
// Geeft null terug als de sector geen zo'n veld kent — de aanroeper moet dat dan overslaan, nooit
// een niet-bestaand veld verplicht stellen (GOUDEN STANDAARD: nooit gokken/aannemen).
function getEigenaarBeloningsVeld() {
  // bouw/transport/handel toegevoegd 13 sep 2026: zelfde DGA-structuur als mkb, dus 'dgaSalaris'.
  var MAP = { accountancy: 'partnerBel', zorg: 'partnerBel', mkb: 'dgaSalaris', itsoftware: null, bouw: 'dgaSalaris', transport: 'dgaSalaris', handel: 'dgaSalaris', consultancy: 'dgaSalaris', verhuizingen: 'dgaSalaris' };
  var sector = (S.traject && S.traject.sector) || 'accountancy';
  var veldId = MAP.hasOwnProperty(sector) ? MAP[sector] : 'partnerBel';
  if (!veldId) return null;
  var fase = getSectorProfiel().fases.filter(function(f){ return f.id === 'financieel'; })[0];
  var df = fase && fase.dataFields.filter(function(d){ return d.id === veldId; })[0];
  if (!df) return null;
  return { veldId: veldId, label: df.label };
}

// Sectorbewuste term voor de mensen aan de top van de onderneming (30 aug 2026). De partner-op-naam-
// registratie (mna_partners / toonPartnersModal / het openingsscherm-blok) was hardcoded op
// "partner" — accountancy-/advocatuurjargon dat niet past bij een fysiopraktijk (eigenaar/maat),
// een winkel (eigenaar/DGA) of een softwarebedrijf (founder). Zelfde patroon als
// getEigenaarBeloningsVeld() hierboven: de DB-tabel/het endpoint blijven intern "partners" heten,
// alleen de zichtbare tekst wisselt. Onbekende sector → accountancy-term (bestaand gedrag).
function getPartnerTerm() {
  var MAP = {
    accountancy: { enkel: 'partner',               meer: 'partners',                titel: 'Partners' },
    zorg:        { enkel: 'maat / praktijkhouder', meer: 'maten / praktijkhouders', titel: 'Maten & praktijkhouders' },
    mkb:         { enkel: 'eigenaar / DGA',        meer: 'eigenaren',               titel: 'Eigenaren' },
    itsoftware:  { enkel: 'founder / eigenaar',    meer: 'founders',                titel: 'Founders & eigenaren' },
    // bouw/transport/handel toegevoegd 15 sep 2026 (Marcel, na live test op het bouw-testtraject:
    // "je gebruikt weer het woord partners... verder eigenaren") — zonder deze entry viel de sector
    // terug op MAP.accountancy ("Partners"), exact het "verkeerde-sector-gok"-patroon. Zelfde
    // eigenaar/DGA-structuur als mkb, zie ook getEigenaarBeloningsVeld() hierboven.
    bouw:        { enkel: 'eigenaar / DGA',        meer: 'eigenaren',               titel: 'Eigenaren' },
    transport:   { enkel: 'eigenaar / DGA',        meer: 'eigenaren',               titel: 'Eigenaren' },
    handel:      { enkel: 'eigenaar / DGA',        meer: 'eigenaren',               titel: 'Eigenaren' },
    consultancy: { enkel: 'eigenaar / DGA',        meer: 'eigenaren',               titel: 'Eigenaren' },
    verhuizingen: { enkel: 'eigenaar / DGA',      meer: 'eigenaren',               titel: 'Eigenaren' }
  };
  var sector = (S.traject && S.traject.sector) || 'accountancy';
  return MAP[sector] || MAP.accountancy;
}

// Sectorbewuste fase-titels (15 sep 2026, zelfde bugklasse als getPartnerTerm() hierboven — gevonden
// doordat meerdere plekken (DD-voortgang, wijzigingenlijst, AI-verificatiestatus) een eigen hardcoded
// {financieel:'Financieel',...,partner:'Partners',...}-kopie hadden i.p.v. de al bestaande, per sector
// correct ingevulde fase.title uit SECTOR_PROFIELEN te gebruiken. Fase-ID's zelf zijn stabiel en
// identiek over alle sectoren (financieel/commercieel/partner/compliance/it/juridisch/strategisch) —
// alleen de title verschilt per sector, dus dit hoeft nooit hardcoded te worden herhaald.
function getFaseLabels(metNummer) {
  var sector = (S.traject && S.traject.sector) || 'accountancy';
  var profiel = SECTOR_PROFIELEN[sector] || SECTOR_PROFIELEN.accountancy;
  var labels = {};
  profiel.fases.forEach(function(f) {
    labels[f.id] = metNummer ? (f.num + '. ' + f.title) : f.title;
  });
  return labels;
}

// Structuurtype van het traject (31 aug 2026, backlogpunt 9-B). Expliciet opgeslagen op het traject
// (mna_trajecten.structuur_type) — nooit afgeleid uit een vrij rechtsvorm-veld. Bepaalt of de
// waardering/consolidatie de BV-logica (VPB, holding-uitsluiting) of de maatschap-logica (geen VPB,
// winst ná ondernemersloon per maat) volgt. Onbekende/ontbrekende waarde → 'bv' = bestaand gedrag.
function getStructuurType() {
  var st = (S.traject && S.traject.structuur_type || 'bv').toLowerCase();
  return (st === 'maatschap' || st === 'eenmanszaak') ? st : 'bv';
}
function isMaatschap() { return getStructuurType() === 'maatschap'; }


// FASES wordt dynamisch bepaald via getSectorFases()
var FASES = SECTOR_PROFIELEN.accountancy.fases;

