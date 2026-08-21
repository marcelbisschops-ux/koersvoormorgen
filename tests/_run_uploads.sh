#!/bin/bash
cd /Users/marcelbisschops/Documents/GitHub/koersvoormorgen
D=~/Desktop/testtrajecten-compleet/fysiopraktijk-de-beweging
run(){ echo "=== [$1] $2"; node tests/_upload_long.mjs --code=I2N5JHZY --fase="$1" --file="$D/$2" 2>&1 | tail -2; }
run commercieel "06_Omzet_en_patientenanalyse_2025.xlsx"
run commercieel "07_Zorgverzekeraars_en_leveranciersoverzicht.xlsx"
run commercieel "08_Commerciele_DD_notitie_post_LoI.docx"
run partner "09_Personeelsoverzicht_en_formatie.xlsx"
run partner "10_HR_dossier_post_LoI.docx"
run compliance "11_Kwaliteits_en_compliancedossier.docx"
run compliance "12_Vergunningen_en_certificeringen_post_LoI.pdf"
run compliance "13_HKZ_certificaat_scan.jpg"
run it "14_IT_en_systemenoverzicht.docx"
run it "15_IT_DD_en_AVG_analyse_post_LoI.docx"
run juridisch "16_KvK_uittreksel_Fysiopraktijk_De_Beweging.pdf"
run juridisch "17_Huurovereenkomst_praktijkruimte_Nijkerk.docx"
run juridisch "18_Juridische_en_fiscale_DD_post_LoI.pdf"
run juridisch "19_Lease_en_contractenregister.xlsx"
run strategisch "20_Gespreksverslag_strategie_en_dealstructuur.docx"
run strategisch "21_Marktanalyse_en_groeiplan.docx"
run financieel "22_Jaaroverzicht_ANDER_BEDRIJF_RANDGEVAL.docx"
echo "ALLE UPLOADS KLAAR"
