Terraformers · Terraformes
NASA Space Apps Challenge 2025
Earth information for better decisions on Costa Rican farms.

Project: Terraformes. Team: Terraformers. Status: prototype under development.

Documentation update and source access date: November 15, 2026.

The 2025 edition comes from the original README. This update incorporates later evidence; it does not present information from 2026 as having been available during the 2025 challenge.

📖 About the Project
Terraformes aims to support Costa Rican farmers in deciding what to plant and how to organize their next growing cycle. It proposes combining climate, soil, water, risks, markets, pests, and planting history through an interface that is easy to understand on a mobile phone. Geographic information complements farmers' knowledge; it does not replace laboratory testing or an agronomic assessment of a plot.

👥 Team
Member
Poll Garro Vargas
Angelo Castro Piedra
Hector Leiva Gamboa
Brandon Rivera Hidalgo
Santiago Portuguez Henández
Kenni González Blandón
📜 Project History
How can global climate and soil data be turned into useful decisions for a Costa Rican farm? This question frames Terraformers' proposal for challenge 06: farm adaptation using NASA data.

The national context supports this effort: INEC documents agricultural diversity, while MAG records events affecting harvests, soils, and marketing. Figures and their reference dates appear in Impact Assessment. The proposal's value lies in connecting that evidence with alternatives farmers can understand and evaluate.

The project documentation organizes eleven areas: climate, soil moisture, markets, water, crop rotation, training, temperature, natural phenomena, mapping, suitability, and pests. Development translates these areas into location-based queries and farm-level tracking.

Stage	Verifiable evidence
Initial record	The available Git history begins on November 14, 2026. It does not independently establish when the idea was conceived or confirm participation or awards in 2025.
Design	Documented architecture, shared schemas, migrations, and sources.
Implementation	React/TypeScript application, data extraction components, and a demonstration interface for queries and farm management.
Navigation	Large menu cards, a visible return option, and a separate planting screen.
Next milestone	Complete live integration and suitability calculations, followed by a pilot with farmers and agronomists.
The documented history is the construction of a prototype that connects scientific information with local decisions. Its next step must demonstrate usefulness in the field. No undocumented interviews, agreements, adoption, or agricultural outcomes are claimed.

💡 Project Idea
Challenge
Challenge 06 in the supplied image calls for combining NASA satellite data, soil information, and local priorities to guide crop rotations and improve soil health. Terraformes adapts this approach to Costa Rica.

Proposed Solution
Select a location and review local conditions.
Compare crop requirements with climate, soil, and water conditions, showing the source, date, and limitations.
Consider previous crops and pests when explaining rotation alternatives.
Incorporate prices, alerts, and training.
Record management practices and harvests to evaluate outcomes.
Rotation between growing cycles applies particularly to annual crops. For perennial crops, support should focus on ground cover, soil, water, and renewal where appropriate; generic annual rotation rules should not recommend replacing a coffee plantation.

🏗️ Development Status
Phase	Status as of the documentation review
Research & Discovery	Sources identified and cross-checked; ongoing updates required.
Problem Analysis	National desk-based analysis; participatory validation pending.
Solution Design	Architecture and models documented.
Development	Demonstration interface and data extraction components; partial integration.
Testing	Extractor tests exist; this review does not certify a full test run or agronomic validation.
Documentation	README updated with evidence and limitations.
Final Presentation	Insufficient evidence to declare completion.
Actual implementation: Algolia returns sample data, and Supabase simulates sessions and records in the browser. Crop rotation uses demonstration rules and catalogs. extractores/src/aptitud/calcular.ts is empty. The existence of extractors and migrations does not establish deployment or complete integration. The drone screen does not demonstrate that flights have taken place.

🌎 Impact Assessment
1. Influence and Potential Impact
The expected impact is to improve the quality and timeliness of decisions requiring interpretation of multiple sources. These are proposed mechanisms, not measured benefits:

Dimension	Potential contribution	Evaluation indicator
Soil	Explain suitability and rotation alternatives.	Technically approved rotations; ground cover and repeated soil analyses.
Water	Relate rainfall, moisture, and evapotranspiration to the growing cycle.	Irrigation per hectare and unit produced; observed stress.
Crop health	Record problems and facilitate follow-up.	Time to assistance; verified incidence and severity.
Economics	Provide context for markets and farm costs.	Gross margin per hectare and losses in comparable cycles.
Knowledge	Bring together accessible information and training.	Comprehension, unassisted task completion, and sustained use.
POWER provides meteorological and solar variables; SMAP estimates surface and root-zone moisture; ECOSTRESS provides surface temperature, evapotranspiration, and stress products. These are complementary inputs, not harvest guarantees. POWER, SMAP, ECOSTRESS.

Proposed evaluation: establish a baseline by farm and crop; record management practices and harvests; compare similar farms while accounting for season, rainfall, size, and assistance. Assess multiple cycles and allow longer periods for soil changes. A before-and-after improvement does not prove causality. No percentage savings or yield gains are promised without a pilot.

2. Magnitude of the Problem · National Scale
The problem combines climate exposure, soil conditions, and difficulty translating data into decisions. A recommendation based solely on temperature or price would be insufficient.

Evidence	Period	Interpretation
93,017 farms; 2,406,418.4 ha of agricultural holdings, representing 47.1% of the national territory.	CENAGRO 2014	Historical reference; not all of this land is suitable for cultivation.
78,408 farms produced at least one crop.	CENAGRO 2014	Historical population of farms relevant to an agricultural solution.
Rice: 11,739.4 ha; maize: 8,081.6 ha; beans: 5,542.6 ha planted.	ENA 2025, published in 2026	Recent crop scale for studying decisions by growing cycle.
Potatoes and onions: 80.4% of the area devoted to the vegetables covered by the survey.	ENA 2025	Do not extrapolate to all vegetables in the country.
23,958 affected producers; more than ₡5.5 billion allocated for recovery.	November 2024 rainfall; statement dated March 25, 2026	A budget, not total losses or savings attributable to Terraformes.
Sources: INEC, CENAGRO, INEC, ENA 2025, MAG, recovery after rainfall.

MAG describes erosion, disease, partial losses, and damage to access routes. This supports connecting soil, water, and management, but does not demonstrate that the application can prevent all damage or allow a specific event to be attributed to climate change.

Geographic distribution: Alajuela recorded 25,176 farms; Pérez Zeledón and San Carlos recorded 8,059 and 5,093, respectively. Average farm size was 54.6 ha in Guanacaste and 9.7 ha in Cartago. These 2014 figures justify studying different scales without describing every farm through averages. INEC.

The proposed research design covers the Central, Chorotega, Pacífico Central, Brunca, Huetar Norte, and Huetar Caribe regions, selecting farms by crop, water regime, slope, and assistance. This is a national sampling proposal, not a calculated risk map. The regional classifications used by different institutions must be reconciled.

3. Potential Beneficiaries
Direct beneficiaries would be producers and farm managers growing crops compatible with the validated modules. Technical advisers, associations, and cooperatives could use aggregated information. Related workers and households could receive indirect benefits; their number has not been determined.

Historical crop-producing farms are production units, not people or current users. One person may manage several farms. Producers covered by the recovery program must not be added to that count: they come from a different register and period.

ENAHO 2024 estimated income poverty among 22.1% of rural households and 16.4% of urban households. This reinforces the need to consider costs and support; it does not justify applying those percentages to farms or assuming every rural household is agricultural. INEC, ENAHO.

Data	Valid use	Limitation
CENAGRO	Historical distribution of farms and activities.	Not a current user register.
ENA	Update surveyed areas and production.	Respect statistical domains and precision.
ENAHO	Household conditions and access to technology.	Use survey weights; households are not equivalent to farms.
MAG and organizations	Needs assessment and pilot recruitment.	Partial coverage and duplicate records.
Pilot records	Unique individuals, farms, and actual use.	Consent and data protection.
Current reach must be determined by deduplicating participants and distinguishing potential, registered, and active users from people with observed outcomes. Women farmers, young people, older adults, and communities with limited connectivity should participate in the evaluation without assigning them unverified percentages.

4. Innovation
The proposed innovation integrates environmental data, the Costa Rican context, and farm history into explainable recommendations. It does not claim a new satellite measurement or demonstrated superiority over other platforms. Wholesale prices provide marketing context; they do not predict future prices or directly measure demand. PIMA-SIMM.

Data integration or merging: this document cross-references documentary evidence; it does not claim to have performed a nationwide join of microdata or raster datasets. Operational data integration should:

Version boundaries and link coordinates to districts, cantons, and regions. Do not assume the PDF's “492 districts” is the current total.
Preserve source, product, version, date, unit, depth, and resolution.
Aggregate by polygon and comparable period while retaining quality and coverage. A kilometer-scale grid does not precisely measure each plot.
Separate observations, reanalysis, forecasts, and producer statements; preserve missing values.
Relate conditions to crops, history, and markets, with agronomic review of the rules.
Avoid adding together CENAGRO 2014, ENA 2025, and 2024 damage figures: their units and periods differ.
Corrections to the NASA.pdf inventory: SMAP L4 estimates moisture at 9 km, not fertility. ECOSTRESS should be described through specific products, not as a universal soil analysis. NDVI alone does not identify erosion or pests. SoilGrids does not replace laboratory testing, and its REST API is listed as temporarily suspended. GAEZ v5 is available; a v4 integration must retain its version identification. SMAP, ECOSTRESS, NASA MOD13, ISRIC, FAO.

5. Ease of Use
The interface includes large cards, a return-to-menu option, geographic selection, light and dark themes, Spanish and English, and public queries without signing in. A local report queue exists, but it does not establish full offline operation or production synchronization with Supabase.

Evaluation should involve farmers of different ages, digital skills, and signal conditions, measuring time and errors when selecting an area, interpreting a suggestion, recording a planting, and retrieving a report. Keyboard navigation, screen readers, readability, and understanding of the update date must also be checked. No accessibility certification is claimed.

📄 AI Declaration
Terraformers declares the use of Claude, Codex, Gemini, GitHub Copilot, and ChatGPT as tools supporting development and documentation. Their use is acknowledged without assigning unrecorded individual tasks, versions, or authorship percentages.

AI does not constitute scientific evidence or replace the team's responsibility. Code acceptance, interpretation, source selection, and publication remain the responsibility of team members. Figures require verification against original sources, and agricultural recommendations require technical assessment and field validation.

This update was prepared with Codex assistance and consultation of public sources. The team must review and approve the final version. AI is not presented as a certifying authority, nor is complete human review claimed where it remains pending. Contributions should be recorded, and credentials or personal data should not be shared with external tools without authorization.

📄 Sources Consulted
NASA.pdf served as the initial inventory, not sufficient proof of capabilities or figures. Access date: November 15, 2026.

Cross-Checked Resources from the PDF
Resource	Contribution and findings
NASA POWER	Meteorological and solar catalog.
NASA GPM	Precipitation products and access.
SMAP L4 v8	Surface and root-zone moisture; check reprocessing notices.
ECOSTRESS	Surface temperature and evapotranspiration.
SoilGrids / ISRIC	JavaScript viewer; institutional API suspension notice consulted.
Open-Meteo	Reanalysis; ERA5 and ERA5-Land are different products.
GAEZ v4 / FAO GAEZ	No readable text from the v4 portal; cross-checked against official information on v5 availability.
PIMA-SIMM	Prices, seasonality, and tonnage.
INA Agriculture	Training; does not imply an agreement.
INEC CENAGRO	Figures cross-checked against general results.
Limited Access
HDX Costa Rica, LP DAAC MOD13Q1, and Earthdata SRTM returned access-denied responses. MOD13 was cross-checked in Earthdata Search. The IMN subseasonal link returned HTTP 410. These are results of this automated consultation, not proof of permanent unavailability. No figures were extracted from inaccessible pages.

Additional National Evidence
INEC, ENA 2025, September 2026: areas and production.
INEC, ENAHO 2024: rural and urban poverty; household as the unit of analysis.
MAG, 2024 rainfall, March 25, 2026: producers, investment, and damage.
Internal status is supported by the code, Git history, extractor documentation, and privacy documentation. Where design differs from implementation, the code's status is reported.

🛠️ Local Development
npm monorepo: web, packages/compartido, and extractores. React, Vite, and TypeScript. Extractors require Node.js 22.18 or later according to their documentation.

npm install
npm run dev
npm run build
npm run preview
npm run test:extractores

The server displays the local URL. The build generates web/dist/. HashRouter uses /#/ for the menu and /#/sembrar for crops.

Copy .env.example to .env in the repository root to configure services. VITE_* variables are public: never include Algolia administrative keys or SUPABASE_SERVICE_ROLE_KEY. Configuring variables does not replace simulated adapters.

See extractores/README.md for simulations without writes. Migrations: supabase/migrations/. Production requires real authentication and access controls; personal data must stay out of public indexes.

Deployment
Vite uses base: './'. web/dist/ can be published as a static site after verifying the workflow. .github/workflows/deploy-pages.yml is empty as of this review: automatic publication on push and a verified deployment are not claimed.
