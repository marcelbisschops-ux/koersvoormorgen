#!/usr/bin/env python3
"""Genereert 4 platform-mockups (nieuwe huisstijl) -> _mock/*.html.
Daarna met headless Chrome naar 2000x1125 JPG (zie build-mocks.sh)."""
import pathlib
HERE = pathlib.Path(__file__).parent

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1600px;height:760px;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1b2a;color:#c6d2da}
.app{width:1600px;height:760px;display:flex;flex-direction:column;background:linear-gradient(180deg,#0e1d2d,#0b1723)}
.top{display:flex;align-items:center;gap:20px;padding:18px 30px;border-bottom:1px solid #24384a;background:#0d1b2a}
.brand{font-family:'Newsreader',Georgia,serif;font-size:19px;color:#f4f1e9}
.brand b{color:#5e9b8f;font-weight:400}
.crumb{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8ba0ae}
.spacer{flex:1}
.pill{font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:5px 11px;border-radius:6px;border:1px solid #3d6b63;color:#5e9b8f}
.sel{display:flex;align-items:center;gap:8px;font-size:13px;color:#c6d2da;border:1px solid #24384a;border-radius:6px;padding:7px 12px;background:#132534}
.sel b{color:#f4f1e9;font-weight:500}
.body{flex:1;display:flex;gap:1px;background:#24384a;overflow:hidden}
.col{background:#0d1b2a;padding:26px 30px;overflow:hidden}
.col--l{width:430px}
.col--r{flex:1}
.h{font-family:'Newsreader',Georgia,serif;font-size:21px;color:#f4f1e9;margin-bottom:4px}
.sub{font-size:12.5px;color:#8ba0ae;margin-bottom:22px}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#5e9b8f;margin-bottom:14px}

.fase{margin-bottom:16px}
.fase__t{display:flex;justify-content:space-between;font-size:13.5px;color:#e6edf2;margin-bottom:7px}
.fase__t span{color:#8ba0ae;font-variant-numeric:tabular-nums}
.bar{height:6px;border-radius:3px;background:#1c2f40;overflow:hidden}
.bar i{display:block;height:100%;border-radius:3px}
.fill-hi{background:#3d6b63}
.fill-mid{background:#c49a4a}
.fill-lo{background:#b0554a}

.doc{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #1c2f40;font-size:13.5px}
.doc:last-child{border-bottom:0}
.doc .ic{width:26px;height:32px;border-radius:3px;background:#17293a;border:1px solid #2b435a;flex:0 0 auto}
.doc .nm{color:#e6edf2;display:block}
.doc .mt{color:#8ba0ae;font-size:11.5px;margin-top:3px;display:block}
.doc .tag{margin-left:auto;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:5px}
.tag--ok{color:#5e9b8f;border:1px solid #3d6b63}
.tag--man{color:#c49a4a;border:1px solid #7a5f2b;background:rgba(196,154,74,.08)}
.catrow{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#8ba0ae;margin:22px 0 4px}

.sig{display:flex;gap:16px;padding:20px;border:1px solid #24384a;border-radius:10px;background:#132534;margin-bottom:16px}
.sig .dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:0 0 auto}
.d-mid{background:#c49a4a}.d-hi{background:#b0554a}.d-lo{background:#5e9b8f}
.sig h4{font-size:14px;color:#f4f1e9;margin-bottom:5px;font-family:'Inter',sans-serif;font-weight:600}
.sig p{font-size:13px;color:#c6d2da;line-height:1.5}
.sig .ctx{margin-top:9px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8ba0ae}
.sig .ctx b{color:#5e9b8f;font-weight:600}

.field{margin-bottom:20px}
.field label{display:block;font-size:12.5px;font-weight:600;color:#e6edf2;margin-bottom:7px}
.field .inp{font-size:13.5px;color:#f4f1e9;border:1px solid #2b435a;border-radius:6px;padding:11px 13px;background:#132534}
.field .hint{font-size:11.5px;color:#5e9b8f;margin-top:6px}
.swatch{display:inline-block;width:22px;height:22px;border-radius:5px;border:1px solid #2b435a;vertical-align:-5px;margin-right:9px}
.previewcard{border:1px solid #24384a;border-radius:10px;overflow:hidden;background:#0b1723}
.previewcard .pv-top{padding:14px 18px;border-bottom:1px solid #24384a;font-family:'Newsreader',serif;font-size:16px}
.previewcard .pv-b{padding:22px 18px;font-size:12px;color:#8ba0ae}
.previewcard .pv-btn{display:block;width:fit-content;margin-top:16px;font-size:12px;font-weight:600;padding:9px 18px;border-radius:6px;color:#0d1b2a}
.modrow{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
.mod{font-size:12px;color:#c6d2da;border:1px solid #24384a;border-radius:6px;padding:7px 12px;background:#132534}
.mod::before{content:"✓ ";color:#5e9b8f}
.note{margin-top:22px;border:1px solid #24384a;border-left:2px solid #5e9b8f;border-radius:8px;padding:16px 20px;background:#0f2030;font-size:12.5px;color:#c6d2da;line-height:1.6}
.note b{color:#f4f1e9;font-weight:600}
.minibars{display:flex;gap:10px;margin-top:26px}
.minibars .mb{flex:1}
.minibars .mbk{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8ba0ae;margin-bottom:6px}

.timeline{display:flex;align-items:flex-start;gap:0;margin:26px 0 30px}
.tl{flex:1;position:relative;padding-top:22px}
.tl::before{content:"";position:absolute;top:5px;left:0;right:0;height:1.5px;background:#3d6b63}
.tl::after{content:"";position:absolute;top:1px;left:0;width:9px;height:9px;border-radius:50%;background:#0d1b2a;border:1.5px solid #5e9b8f}
.tl h5{font-family:'Newsreader',serif;font-size:14px;color:#f4f1e9;margin-bottom:3px}
.tl p{font-size:11px;color:#8ba0ae;padding-right:14px}
.tl.done::after{background:#5e9b8f}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:6px}
.mini{border:1px solid #24384a;border-radius:10px;padding:18px;background:#132534}
.mini .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8ba0ae;margin-bottom:8px}
.mini .v{font-family:'Newsreader',serif;font-size:30px;color:#f4f1e9;font-variant-numeric:tabular-nums}
.mini .vsub{font-size:12px;color:#8ba0ae;margin-top:3px}
.list-gap li{list-style:none;font-size:13px;color:#c6d2da;padding:10px 0;border-bottom:1px solid #1c2f40;display:flex;gap:10px}
.list-gap li::before{content:"—";color:#5e9b8f}
"""

HEAD = ("<!doctype html><html lang=nl><head><meta charset=utf-8>"
        "<link rel=preconnect href=https://fonts.googleapis.com>"
        "<link rel=preconnect href=https://fonts.gstatic.com crossorigin>"
        "<link rel=stylesheet href='https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500;600&display=swap'>"
        "<style>" + CSS + "</style></head><body>")
FOOT = "</body></html>"

def top(crumb):
    return ("<div class=top><span class=brand>Van der Meer <b>Corporate Finance</b></span>"
            "<span class=crumb>" + crumb + "</span><span class=spacer></span>"
            "<span class=pill>3 AI-signalen</span>"
            "<span class=sel>Invullen voor: <b>Groep (geconsolideerd)</b> ▾</span></div>")

# ---- 1. Dataroom & fases -------------------------------------------------
fases = [("I", "Financieel", 100, "hi"), ("II", "Klanten &amp; commercieel", 86, "hi"),
         ("III", "Partners &amp; personeel", 64, "mid"), ("IV", "Compliance &amp; kwaliteit", 72, "mid"),
         ("V", "IT &amp; automatisering", 40, "lo"), ("VI", "Juridisch &amp; fiscaal", 55, "mid"),
         ("VII", "Strategisch &amp; markt", 30, "lo")]
faserows = "".join(
    f"<div class=fase><div class=fase__t><span>{n} &nbsp;{nm}</span><span>{p}%</span></div>"
    f"<div class=bar><i class='fill-{c}' style='width:{p}%'></i></div></div>" for n, nm, p, c in fases)
docs = (
    "<div class=catrow>Financieel</div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Jaarrekening 2025 (definitief).pdf</span>"
    "<span class=mt>Balans, W&amp;V, toelichting · herleid naar bron</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Kolommenbalans dec 2025.xlsx</span>"
    "<span class=mt>Werkkapitaal, normalisaties</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Debiteurenanalyse Q4.xlsx</span>"
    "<span class=mt>Ouderdom, concentratie top-10</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=catrow>Klanten &amp; commercieel</div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Klantenoverzicht 2025.xlsx</span>"
    "<span class=mt>Omzet per klant · afwijking gesignaleerd</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Opzeggingen 2024-2025.pdf</span>"
    "<span class=mt>Verloop klantenportefeuille</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=catrow>Juridisch &amp; fiscaal</div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Scan_037.jpg</span>"
    "<span class=mt>Entiteit onduidelijk — systeem doet geen aanname</span></span><span class='tag tag--man'>handmatig indelen</span></div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Aandeelhoudersovereenkomst.docx</span>"
    "<span class=mt>Fase 2 · Juridisch</span></span><span class='tag tag--ok'>ingedeeld</span></div>"
    "<div class=doc><span class=ic></span><span><span class=nm>Huurovereenkomst kantoorpand</span>"
    "<span class=mt>Nog niet aangeleverd — AI-signaal actief</span></span><span class='tag tag--man'>ontbreekt</span></div>")
S1 = (HEAD + "<div class=app>" + top("Dossier · Dataroom &amp; fases") +
      "<div class=body>"
      "<div class='col col--l'><div class=eyebrow>Documentdekking per fase</div>" + faserows +
      "<div style='margin-top:24px;font-size:12px;color:#8ba0ae;line-height:1.6'>Elke fase toont wat verwacht wordt en wat binnen is. Gaten zijn zichtbaar vóór ze het traject vertragen.</div></div>"
      "<div class='col col--r'><div class=h>Documenten</div><div class=sub>Geordend per due-diligence-categorie · rol- en fase-toegang actief</div>" +
      docs + "</div></div></div>" + FOOT)

# ---- 2. AI-signalen ----------------------------------------------------
S2 = (HEAD + "<div class=app>" + top("Dossier · AI-signalen") +
      "<div class=body><div class='col col--r'>"
      "<div class=h>AI-signalen</div><div class=sub>De AI leest mee en wijst op wat ontbreekt of niet strookt. Ze vult niets in en kiest geen kant.</div>"
      "<div class=sig><span class='dot d-mid'></span><div><h4>Ontbrekend document</h4>"
      "<p>Voor fase 2 ontbreekt de huurovereenkomst van het kantoorpand.</p>"
      "<div class=ctx>Fase 2 · <b>Juridisch &amp; fiscaal</b></div></div></div>"
      "<div class=sig><span class='dot d-hi'></span><div><h4>Afwijking tussen documenten</h4>"
      "<p>De omzet in de jaarrekening (€ 4,12 mln) wijkt af van het klantenoverzicht (€ 3,87 mln). De twee stukken staan naast elkaar; welke leidend is, bepaalt de adviseur.</p>"
      "<div class=ctx>Financieel · <b>2 bronnen</b></div></div></div>"
      "<div class=sig><span class='dot d-lo'></span><div><h4>Actie vereist</h4>"
      "<p>Deze vraag staat 9 dagen open: “Graag de specificatie van de post overige vorderingen.”</p>"
      "<div class=ctx>Q&amp;A · <b>gekoppeld aan Jaarrekening 2025, p. 14</b></div></div></div>"
      "<div class=note><b>Wat de AI niet doet.</b> Geen waardeoordeel over de deal, geen automatische invulling van velden, "
      "geen conclusie over wie gelijk heeft bij een afwijking. Bij twijfel over waar een document hoort: “handmatig indelen”, nooit een gok. "
      "Elke overgenomen waarde blijft aanklikbaar tot het brondocument.</div>"
      "</div></div></div>" + FOOT)

# ---- 3. Voortgang ----------------------------------------------------
tl = [("done","Start","Rollen en fasen ingericht"),("done","Dataroom","72% van de stukken binnen"),
      ("","Vragen &amp; acties","14 open, 3 &gt; 7 dagen"),("","Voortgang","Dekking per fase"),("","Closing","Dossier archiveren")]
tlrow = "".join(f"<div class='tl {c}'><h5>{t}</h5><p>{p}</p></div>" for c,t,p in tl)
S3 = (HEAD + "<div class=app>" + top("Dossier · Voortgang") +
      "<div class=body><div class='col col--r'>"
      "<div class=h>Voortgang</div><div class=sub>Waar het traject staat — zichtbaar voor iedereen die eraan werkt</div>"
      "<div class=timeline>" + tlrow + "</div>"
      "<div class=grid2>"
      "<div class=mini><div class=k>Documentdekking</div><div class=v>68%</div><div class=vsub>gemiddeld over 7 fases</div></div>"
      "<div class=mini><div class=k>Openstaande vragen</div><div class=v>14</div><div class=vsub>waarvan 3 langer dan 7 dagen</div></div>"
      "</div>"
      "<div class=eyebrow style='margin-top:26px'>Wat er nog moet komen</div>"
      "<ul class=list-gap>"
      "<li>Huurovereenkomst kantoorpand — fase 2, Juridisch</li>"
      "<li>Personeelsoverzicht met dienstjaren — fase 3</li>"
      "<li>Overzicht IT-licenties en contracten — fase 5</li>"
      "<li>Specificatie overige vorderingen — Q&amp;A, 9 dagen open</li>"
      "</ul>"
      "<div class=minibars>"
      + "".join(f"<div class=mb><div class=mbk>Fase {n}</div>"
               f"<div class=bar><i class='fill-{c}' style='width:{p}%'></i></div></div>"
               for n,p,c in [("I",100,"hi"),("II",86,"hi"),("III",64,"mid"),("IV",72,"mid"),("V",40,"lo"),("VI",55,"mid"),("VII",30,"lo")])
      + "</div>"
      "</div></div></div>" + FOOT)

# ---- 4. Eigen huisstijl (white-label) --------------------------------
S4 = (HEAD + "<div class=app>" + top("Instellingen · Eigen huisstijl") +
      "<div class=body>"
      "<div class='col col--l' style='width:640px'><div class=h>Eigen huisstijl</div>"
      "<div class=sub>Uw cliënten werken vanaf nu in úw omgeving. Werkt door naar de trajecten die u hierna aanmaakt.</div>"
      "<div class=field><label>Platformnaam</label><div class=inp>Van der Meer Corporate Finance</div></div>"
      "<div class=field><label>Accentkleur</label><div class=inp><span class=swatch style='background:#1f6f5c'></span>#1F6F5C</div>"
      "<div class=hint>✓ Voldoende contrast op donkere achtergrond — veilig voor cliënten</div></div>"
      "<div class=field><label>Logo (URL)</label><div class=inp>https://vandermeercf.nl/assets/logo-wit.svg</div></div>"
      "<div class=field><label>Adres &amp; KvK</label><div class=inp>Parkstraat 12, 3811 MR Amersfoort · KvK 61234567</div></div>"
      "<div class=eyebrow style='margin-top:26px'>Actieve modules in uw trajecten</div>"
      "<div class=modrow><span class=mod>Contracten</span><span class=mod>AI-analyse</span><span class=mod>Q&amp;A</span>"
      "<span class=mod>Export</span><span class=mod>Meekijkers</span><span class=mod>Matching</span></div>"
      "</div>"
      "<div class='col col--r'><div class=eyebrow>Voorbeeld — inlogscherm cliënt</div>"
      "<div class=previewcard><div class='pv-top' style='color:#f4f1e9'>Van der Meer <span style='color:#3fae93'>Corporate Finance</span></div>"
      "<div class=pv-b>Welkom bij het overnametraject van uw onderneming. Log in met de code uit uw uitnodiging."
      "<span class='pv-btn' style='background:#3fae93'>Inloggen</span></div></div>"
      "<div class=note>Kiest u een kleur die op een donkere achtergrond slecht leesbaar zou zijn, dan waarschuwt het scherm "
      "en wordt de kleur voor cliënten automatisch iets aangepast. <b>Geblokkeerde acties</b> tonen altijd: "
      "“Neem contact op met Bisschops Financing”.</div>"
      "</div></div></div>" + FOOT)

for name, html in [("dataroom-fases", S1), ("ai-signalen", S2), ("voortgang", S3), ("huisstijl", S4)]:
    (HERE / (name + ".html")).write_text(html, encoding="utf-8")
    print("wrote", name + ".html")
