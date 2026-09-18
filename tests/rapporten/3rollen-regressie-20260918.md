# KANTOORINZICHT 3-ROLLEN REGRESSIE — 2026-09-18T11:38:21.924Z

Marker: `E2E-REGRESSION-1789731380534` · DOE_AI: true · Worker: https://kantoorinzicht-staging.marcel-bisschops.workers.dev

| Rol | Pagina | Element | Actie | Verwacht | Status | Detail |
|---|---|---|---|---|---|---|
| VERKOPER | mna.html login | #l-code/#l-btn | inloggen met verkoper-code | S.rol === 'verkoper' | PASS | kreeg verkoper |
| VERKOPER | Fase Financieel | #df_omzet3 | veld invullen + autosave (opslaan) | POST /mna/save 200 | PASS |  |
| VERKOPER | Fase Financieel | #df_omzet3 | wegnavigeren + herladen + teruglezen | E2E-REGRESSION-1789731380534-V2-91960 | PASS | kreeg "E2E-REGRESSION-1789731380534-V2-91960" |
| VERKOPER | Fase Financieel | #df_omzet3 | waarde wijzigen + opnieuw opslaan (D1-verificatie) | E2E-REGRESSION-1789731380534-V3-GEWIJZIGD-82492 | PASS | saveOk=true D1 kreeg "E2E-REGRESSION-1789731380534-V3-GEWIJZIGD-82492" |
| VERKOPER | Fase Financieel | input[type=file] "Document toevoegen" | document uploaden + AI-extractie | ok:true + doc_id | PASS |  |
| VERKOPER | Fase Financieel | #df_forecast (API, dubbele wijziging) | twee snelle wijzigingen na elkaar | E2E-REGRESSION-1789731380534-V6-B-1789731429569 (laatste wint, omzet3 blijft intact) | PASS | forecast="E2E-REGRESSION-1789731380534-V6-B-1789731429569" omzet3="E2E-REGRESSION-1789731380534-V3-GEWIJZIGD-82492" |
| VERKOPER | API | POST /mna/teaser/genereer | verkoper roept begeleider-only route aan | 401/403 | PASS | kreeg status 401 |
| KOPER | mna.html login | #l-code/#l-btn | inloggen met koper-code | S.rol === 'koper', geen begeleider-knoppen | PASS | rol=koper geenBegeleiderKnop=true |
| KOPER | API | GET /mna/entiteiten/{koper_code} | koper vóór vrijgave | lege lijst | PASS | [] |
| BEGELEIDER | API (admin) | POST /mna/koper-categorieen/{code} | categorie 'financieel' vrijgeven voor koper | koper_vrijgegeven: 1 | PASS | {"ok":true,"categorieen":["financieel"],"koper_vrijgegeven":1} |
| KOPER | Fase Financieel | scherm | ná vrijgave: echte waarde zichtbaar | waarde uit V3 zichtbaar op scherm | PASS | gevonden=1 |
| KOPER | Q&A | POST /mna/qa/{koper_code} | vraag stellen + terugleesbaar voor begeleider | vraag_nr + terugvindbaar in GET /mna/qa | PASS | postOk=true teruggevonden=true |
| KOPER | API | GET /mna/waardering/geschiedenis/{koper_code} | koper roept begeleider-only route aan | 401 | PASS | kreeg status 401 |
| KOPER | Sessie | page reload | refresh na login | geen crash, geen roldowngrade/-upgrade | PASS | rolNaReload= |
| BEGELEIDER | mna.html login | #l-code/#l-btn | inloggen met tussen_code | S.rol === 'tussenpersoon', dashboard zichtbaar | PASS | rol=tussenpersoon knopZichtbaar=true |
| BEGELEIDER | Fase Commercieel | .chk-item[data-key] | checklist-item aanvinken (D1-verificatie) | checklist_json[key] === true in D1 | PASS | key=commercieel_0 saveOk=true checkedNa=true |
| BEGELEIDER | Dashboard | S.data (al ingelogde sessie) | verkoper's laatste waarde bekijken | zelfde waarde als V3 | PASS | kreeg "E2E-REGRESSION-1789731380534-V3-GEWIJZIGD-82492" |
| BEGELEIDER | Gesprekken | #bg-gesprek-actie → #bgg-ok | gesprek vastleggen + teruglezen op scherm | verslag zichtbaar in #bg-gesprekken-sectie | PASS | saveOk=true gevonden=1 |
| BEGELEIDER | API | POST /mna/save (fase financieel) | begeleider probeert te schrijven op verkoper-only fase | 403 | PASS | kreeg status 403 |
| BEGELEIDER | Risicoraamwerk | #bg-risicoraamwerk-actie | AI-documentgeneratie | SWOT/PESTEL-secties met echte inhoud in #bg-doc-out | PASS | genOk=true echteInhoud=true |
| CLEANUP | D1 | mna_trajecten | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |
| CLEANUP | D1 | mna_data | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |
| CLEANUP | D1 | mna_gesprekken | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |
| CLEANUP | D1 | mna_qa | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |
| CLEANUP | D1 | mna_documenten | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |
| CLEANUP | D1 | bf_gebruikers | onafhankelijke telling na verwijderen | 0 rijen | PASS | kreeg 0 |

**Totaal:** 26/26 PASS
- VERKOPER: 7/7 PASS
- KOPER: 6/6 PASS
- BEGELEIDER: 7/7 PASS
- CLEANUP: 6/6 PASS
