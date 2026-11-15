# TerraFarm — Together We Grow

**Team:** Terraformers  
**Event:** NASA Space Apps Challenge 2026  
**Challenge:** Cambio en el campo: adaptación de granjas agrícolas mediante datos de la NASA.  
**Project status:** Interactive prototype; selected integrations and agricultural recommendations remain under development  
**Documentation review:** November 15, 2026

> **From Earth observations to practical decisions for healthier soils, more resilient farms, and better-informed growers.**

**Project identity note:** Earlier technical documentation uses the name *Terraformes*, while this submission uses **TerraFarm**. The team is **Terraformers**. Repository paths may retain the earlier technical name.

## About TerraFarm

TerraFarm is an agricultural decision-support system designed to help farmers understand local growing conditions, plan crop choices, explore crop-rotation strategies, and keep track of their fields. It connects scientific and geographic information to practical questions: *What could grow here? What should follow the previous crop? How can soil nutrients and water be managed responsibly? What environmental or market conditions should be considered before planting?*

The initial geographic focus is **Costa Rica**, where the project considers NASA Earth-observation resources together with national agricultural, geographic, and market information. The underlying approach is **adaptable to other countries** where appropriate satellite products, compatible local data, and agricultural demand exist. Such expansion requires local validation, not simply changing the location on a map.

TerraFarm is presented as a web-based experience intended for use on desktop and mobile browsers, including iOS browsers. **The provided README does not establish that a separate native iOS app has been developed or published.**

The platform aims to make technical information easier to interpret, especially for growers who do not routinely use scientific data portals. TerraFarm is intended to **support**, not replace, farmers' experience, soil laboratory analysis, local agronomists, or official warnings.

## The challenge we address

NASA's 2026 *Field Shift* challenge asks teams to combine NASA Earth observations with local soil information, crop characteristics, and farmer priorities to explore rotation strategies that protect soil health and strengthen resilience. TerraFarm applies that challenge to a practical workflow rather than treating satellite readings as isolated charts.

Agricultural decisions depend on interacting factors. A crop can be well matched to average temperature but poorly matched to water availability, terrain, soil conditions, the crops previously planted, or the producer's resources. Farmers also need to respond to extreme rainfall, pests, and changing market conditions. Information exists across different institutions, but it is not always easy to locate, compare, interpret, or connect to a particular field.

**Our central question:** How can globally available Earth-observation data and locally relevant agricultural knowledge help a farmer plan a healthier and more productive sequence of growing cycles?

## Project story and development history

TerraFarm grew from the idea that agricultural data is most valuable when translated into understandable choices. Instead of asking farmers to interpret separate climate products, soil maps, crop requirements, and market tables, the project seeks to organize this evidence around the fields they manage.

The first design decision was to use **Costa Rica as the pilot context**. The country offers different altitudes, rainfall patterns, soils, and agricultural activities, making it a useful environment for studying why one recommendation cannot apply everywhere. Costa Rican sources provide local context, while NASA observations supply an important foundation that can potentially be reused beyond national boundaries.

The second decision was to place **crop rotation and long-term soil health** at the center of planning. Selecting a crop for the next harvest is only one part of responsible management. For annual cropping systems, the previous crop, plant family, water use, soil cover, and nutrient requirements should inform the next choice. In suitable conditions, rotations involving legumes, cover crops, and diverse plant families may improve nutrient cycling, reduce some pest pressures, and protect soil structure. The correct sequence is site-specific and requires agricultural validation; an algorithm cannot guarantee that soil nutrients will be restored.

The third decision was to make the system approachable through geographic views, plain-language explanations, field records, and an interface usable on mobile devices. Recording what happened in each growing cycle can eventually help make recommendations more relevant than generic crop lists.

### Documented progression

| Stage | Evidence reported in the supplied project README | Interpretation |
|---|---|---|
| Research | NASA and Costa Rican data sources, crop characteristics, risks, and market references were catalogued. | Source research supports the concept; cataloguing a source does not prove live use of its data. |
| Architecture | React/Vite/TypeScript app structure, shared schemas, extraction modules, database migrations, and service adapters are described. | There is a technical foundation for further integration. |
| Prototype | Navigation, location-oriented views, planting flows, and farm-management screens are described. | The user journey can be demonstrated, subject to checking the running build. |
| Rotation logic | The README describes demonstration rules and catalogs in `web/src/logica/recomendacion.ts`. | Useful for communicating the idea, but not yet an agronomically validated decision engine. |
| Data services | The README reports sample Algolia results and simulated browser-side Supabase sessions/records. | These must not be described as proven live data or production persistence. |
| Next stage | Complete real data ingestion, suitability scoring, authentication/storage, quality checks, and user pilots. | These are planned milestones, not completed impacts. |

The supplied README says the available Git record begins on **November 14, 2026**. Because the Git repository and commit history were not provided with this document, that date is **reported rather than independently verified**. No earlier founding date, completed farmer pilot, award, institutional partnership, or measured yield increase is claimed.

### A practical use case (illustrative, not a documented pilot)

A grower selects a farming area and reviews climate and environmental context. They record a recently planted annual crop and explore possible follow-up crops. TerraFarm's proposed decision flow compares growing requirements, rotation compatibility, water considerations, and available market context, then presents options together with their reasons, sources, and uncertainty. The grower can record the eventual planting and later assess the outcome. **This example illustrates the intended workflow; it is not evidence of an actual field deployment.**

## What TerraFarm is designed to do

1. **Explore a territory.** Locate an area and view geographically relevant climate, terrain, and agricultural context.
2. **Evaluate crop suitability.** Compare crop requirements with temperature, precipitation, available soil information, and water considerations.
3. **Plan crop rotation.** Consider planting history, nutrient demands, crop families, soil cover, and pest-related constraints when suggesting possible sequences for annual crops.
4. **Support farm management.** Record farms, fields, planting decisions, crop progress, and observed problems.
5. **Provide broader context.** Incorporate natural-hazard information, agricultural training, and market-price references where suitable data exists.
6. **Explain the evidence.** Identify the data source, period, geographic resolution, and relevant limitations rather than presenting a recommendation as a certainty.

**Rotation boundary:** A standard annual crop-rotation rule should not recommend routinely replacing established perennial crops such as coffee. Perennial systems require different advice, including ground cover, nutrient management, intercropping where appropriate, and renewal planning.

### From data to an understandable recommendation

```text
Select area and field
        |
        v
Gather compatible climate, soil, water, terrain, and local information
        |
        v
Check source dates, resolution, missing values, and data quality
        |
        v
Compare crop requirements + field history + farmer priorities
        |
        v
Present suitability / rotation alternatives with explanations
        |
        v
Record the decision and, later, evaluate its outcome
```

This is the **target decision-support workflow**. The current prototype does not yet establish that every stage is connected to live services.

## Data sources and scientific boundaries

### NASA Earth-observation resources considered

| NASA resource | Relevance to TerraFarm | Important limitation |
|---|---|---|
| [NASA POWER](https://power.larc.nasa.gov/) | Meteorological and solar variables for agroclimatic context. | Gridded estimates are not the same as measurements at every individual farm. |
| [GPM](https://gpm.nasa.gov/data) | Precipitation context and rainfall variability. | Satellite estimates require checks against local conditions when available. |
| [SMAP Level 4 soil moisture](https://nsidc.org/data/spl4smgp/versions/8) | Model-assisted estimates of surface and root-zone soil moisture. | Approximately 9 km resolution does **not** establish field-level soil fertility or nutrient content. |
| [ECOSTRESS](https://ecostress.jpl.nasa.gov/data) | Evapotranspiration, land-surface temperature, and vegetation stress products. | Coverage varies in time and space; select the product matching each intended claim. |
| [MODIS vegetation indices](https://lpdaac.usgs.gov/products/mod13q1v061/) | Vegetation activity and coverage trends. | NDVI does not directly diagnose pests, erosion, or soil nutrients. |
| [SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm) | Terrain elevation and slope context. | Terrain context does not determine legal or agronomic suitability by itself. |

**Submission requirement:** This table is a research/source inventory drawn from the supplied documentation; it is **not** proof that every listed dataset was downloaded, processed, or displayed by the running prototype. The team must identify at least one NASA source **actually used in the submitted project**, and list all resources it used in the challenge submission. The challenge's official requirements govern eligibility.

### Complementary sources considered

- [INEC Costa Rica](https://www.inec.cr/): agricultural census, crop surveys, and territorial/statistical context.
- [PIMA / SIMM](https://www.pima.go.cr/simm/): wholesale agricultural market and price information; prices are **not** direct measurements of demand.
- [CNP Market Information](https://www.cnp.go.cr/sim/index.aspx): complementary national market information, subject to access and publication constraints.
- [FAO GAEZ](https://www.fao.org/gaez/en): agroecological suitability reference; retain the product version used.
- [SoilGrids / ISRIC](https://soilgrids.org/): modeled soil property information; not a replacement for field sampling.
- [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api): supplementary historical climate information, with dataset/method identified.
- [Costa Rica IMN](https://www.imn.ac.cr/): national meteorological context and official warnings, using currently accessible resources.

Not all references are confirmed active integrations. Software components, third-party images, libraries, and other incorporated materials also require attribution in the submission.

## Technology and current implementation

The supplied documentation describes an **npm monorepo** with the following components:

| Layer | Documented tools and structure | Scope and present limitations |
|---|---|---|
| User interface | React, TypeScript, Vite, mobile-oriented layout; `web/` | Prototype screens and navigation; not evidence of a published native iOS app. |
| Shared models | TypeScript / Zod schemas; `packages/compartido/` | Planned consistent representation of crops, areas, observations, and farm activity. |
| Collection/processing | Node.js/TypeScript extractors; `extractores/` | Integration modules exist in the described layout, but complete live ingestion is not established. |
| Search | Algolia service adapter | The submitted README reports sample responses in the UI adapter. |
| Storage/authentication | Supabase and SQL migrations | The submitted README reports locally simulated sessions and records in the browser. |
| Rotation/suitability | Demonstration rules and a planned suitability calculator | The README reports `extractores/src/aptitud/calcular.ts` as empty. Agronomic validation is pending. |
| Automation/deployment | GitHub Actions workflows planned | The README reports an empty Pages deployment workflow; automated publication is unverified. |

**Verification note:** Only the supplied README and screenshots were available for this revision. Repository source files, running app, tests, actual API traffic, deployment, and a native iOS build were **not** supplied for independent inspection. Technical statuses above are therefore explicitly attributed to the project's documentation, not to a fresh code audit.

## Impact Assessment

### 1. Influence and potential impact

**What would change if TerraFarm succeeds?** A farmer could move from fragmented climate charts, general crop lists, and scattered market reports to a single, understandable process for evaluating a field and comparing planting options. The main contribution is not a claim to predict harvests accurately; it is a proposed improvement in the **quality, accessibility, and traceability of decisions**.

**Soil health and crop rotation.** By considering planting history and possible follow-up crops, TerraFarm can encourage planned rotations rather than repeating a crop without evaluating soil or pest consequences. Suitable sequences may support nutrient cycling, soil cover, organic matter, and reduced pressure from certain pests. Benefits depend on crop choice, site conditions, management, and time. For soil nutrient claims, repeated soil analyses and specialist review are necessary. The [USDA-NRCS crop rotation standard](https://www.nrcs.usda.gov/sites/default/files/2022-09/Conservation_Crop_Rotation_328_CPS.pdf) supports these agronomic objectives but does not certify any TerraFarm recommendation.

**Water and environmental resilience.** Linking rainfall and moisture context with planting decisions could help growers notice dry or wet conditions before they become operational problems. It may support planning of irrigation, monitoring, and drainage, but it cannot reliably prevent storms, floods, crop failure, or all losses.

**Farm organization and market awareness.** Records of fields, crops, observations, and planting dates could reduce information fragmentation. Historical prices can provide additional context when considering alternatives, but wholesale prices cannot alone predict demand or profitability.

**Access to knowledge.** A clear interface, explanations, and transparent references could lower the effort needed to interpret technical information, especially for farmers with limited time or digital experience. This advantage must be tested with actual users rather than inferred solely from the design.

| Outcome area | Proposed benefit | How it would be measured |
|---|---|---|
| Soil / rotations | More appropriate diversification and better-informed nutrient management | Rotation plans reviewed by agronomists; adoption over growing cycles; repeated soil organic matter and nutrient tests |
| Water management | Decisions better aligned with local rainfall and soil moisture context | Recorded irrigation volumes; irrigation per hectare; water-stress events, adjusted for weather |
| Crop risks | Earlier recognition and documentation of relevant conditions | Time from observed problem to action; verified severity; quality of incident records |
| Farm economics | Clearer understanding of trade-offs | Production cost, gross margin, losses, and yield per hectare by comparable crop/season |
| Usability | More growers able to find and understand information | Unassisted task completion, time on task, comprehension, accessibility checks, and repeat use |

**Evidence status:** All benefits above are *expected or testable*, not observed project outcomes. No specific yield increase, water saving, financial return, or soil recovery has been established by the current prototype.

### 2. Magnitude of the problem: the Costa Rican starting point

Costa Rica is a meaningful first setting because agriculture spans different crops, altitudes, rainfall patterns, and production systems. National evidence illustrates the scale and complexity of the decisions; none of these national figures is a count of TerraFarm users.

| Official evidence | Reference period | What it demonstrates |
|---|---|---|
| **93,017 agricultural holdings** covering approximately **2,406,418.4 hectares** (47.1% of national territory) | INEC Agricultural Census, 2014 | The sector occupies a significant share of land, but agricultural holdings include uses other than crop planting. |
| **78,408 holdings produced at least one crop**, approximately 84.3% of the census total | INEC Agricultural Census, 2014 | A historical indication of the population of crop-producing holdings, not an estimate of current customers. |
| **11,739.4 ha of rice, 8,081.6 ha of maize, and 5,542.6 ha of beans** among the crops surveyed | INEC Agricultural Survey (ENA), 2025 | Different annual crops have meaningful production areas and different planning needs. These values only cover the survey's defined crops. |
| **Potatoes and onions represented 80.4%** of planted area among the **vegetables covered by ENA** | ENA 2025, reported in 2026 | Strong concentration within a surveyed crop group; not 80.4% of all national vegetable production. |
| **23,958 producers** were included in a recovery response with **over CRC 5.5 billion** earmarked after 2024 rains | MAG announcement, March 25, 2026, regarding November 2024 events | Real exposure to damaging rainfall and agricultural disruption. This is recovery funding, not the total monetary loss or any savings generated by TerraFarm. |

Sources: [INEC Census summary](https://admin.inec.cr/en/node/39763), [INEC crop-producing farms](https://admin.inec.cr/noticias/resultados-generales-del-censo-agropecuario), [INEC ENA 2025 crop results](https://admin.inec.cr/noticias/papa-cebolla-representan-el-804-del-area-sembrada-entre-las-hortalizas-investigadas), and [MAG recovery announcement](https://mag.go.cr/gobierno-destina-%E2%82%A15-500-millones-para-reactivar-produccion-de-23-958-productores-afectados-por-lluvias-de-2024/).

The issue is not simply a lack of data. It is the challenge of **integrating data with different scales, dates, and meanings** and turning them into decisions a farmer can verify and use. Crop rotation also requires a longer time horizon than a single forecast. Costa Rica allows this challenge to be examined in a specific setting before testing transferability elsewhere.

**International relevance:** NASA observations make some environmental inputs available across many regions, but global data coverage does not mean that every crop, field, law, soil profile, market, or agricultural practice is automatically supported. Any country expansion would require compatible local soil, crop, regulatory, language, and market information.

### 3. Potential beneficiaries and responsible reach estimates

**Primary beneficiaries** are crop growers and farm managers deciding what to plant, how to sequence annual crops, and how to track field conditions. **Secondary beneficiaries** could include agronomists, producer associations, cooperatives, agricultural educators, and extension services, which may use clearly sourced summaries to support discussion with growers. Farm workers, rural households, and food supply chains could benefit indirectly if decision-making improves; their number cannot be calculated from the current evidence.

The **78,408 crop-producing holdings** recorded in 2014 show historical scale. They must not be described as 78,408 prospective users, current active farms, or individual people: one person can oversee more than one holding, and production structures change. Likewise, MAG's 23,958 affected producers are part of another program and period and must not be added to census counts.

Access barriers matter. [INEC ENAHO 2025](https://admin.inec.cr/en/node/56794) estimated income poverty at **19.3% of rural households**, compared with **13.6% of urban households**. These are household statistics, not farmers' poverty rates, but they support considering cost, mobile access, and ease of use as practical adoption constraints.

**Proposed beneficiary pathway:**

1. Recruit a small, diverse pilot group of growers and advisers from more than one crop and region (the number is to be agreed with partners, not presented as achieved).
2. Record each participating person's consent, role, farm/field, crop, device access, and baseline information needs; distinguish people from holdings.
3. Measure registered users, monthly active users, completed planning sessions, and repeat use without counting duplicates.
4. Assess whether advice was understood, checked with an agronomist, adopted, and later associated with measurable field outcomes.
5. Expand only after reviewing performance across crops, geography, connectivity conditions, and user abilities.

Potential reach is therefore an **opportunity**, not an achieved number. The project has not yet established a user base or verified agricultural outcomes.

### 4. Innovation and technical value

TerraFarm does **not** claim to have invented satellite monitoring, crop-rotation science, or a new agricultural data product. Its proposed innovation is a **farmer-centered combination** of complementary information:

- **Global observations + local context:** use broadly available NASA products together with local crop, soil, geographic, and agricultural references.
- **Multi-cycle recommendations:** evaluate what follows a crop, not only whether a single crop might grow in a location.
- **Explainable decisions:** present alternative choices with reasons, source dates, uncertainties, and limitations rather than an opaque score.
- **Field history:** connect external evidence with the farmer's own records and observations as the system matures.
- **Adaptable architecture:** organize data by source and geographic reference so country-specific modules can be substituted or expanded without assuming all places are equivalent.

**A realistic data integration design** would standardize coordinates, administrative boundaries, units, spatial resolution, observation period, crop identifiers, and missing-value conventions. For example, SMAP Level 4 soil-moisture estimates cover relatively broad cells and should not be interpreted as a laboratory measure of one field's nitrogen, phosphorus, or pH. MODIS NDVI can indicate vegetation changes but cannot, by itself, diagnose pests. Soil-property maps indicate modeled patterns and still require local verification.

The critical innovation test is not the number of APIs listed. It is whether the system can consistently transform **actual, traceable data** into understandable and technically reasonable alternatives for a real farmer. The current demonstration logic is a starting point; automated recommendations and their accuracy must still be evaluated.

### 5. Ease of use, accessibility, and feasibility

TerraFarm is intended for farmers with different levels of digital experience. The documentation describes a browser interface with large navigation cards, geographic selection, a return-to-menu control, planting-related views, and English/Spanish support. Mobile-browser access may help users who mainly own smartphones, but a separate native iOS application is not established by the supplied evidence.

The interface should prioritize a straightforward journey: **select an area → review conditions → understand crop/rotation options → save a plan → monitor progress**. Explanations should use familiar agricultural terms, communicate whether information is historical or recent, and link to the original source. Uncertainty and missing data should be visible rather than replaced with misleading precision.

**Proposed usability assessment:** invite participants with different ages, literacy levels, technological experience, and signal quality to complete realistic tasks without coaching. Record task completion, errors, time, confidence, ability to identify the source/date of a recommendation, and whether they understand that suggestions require local judgment. Include keyboard, contrast, readability, and screen-reader checks. Test performance on low-bandwidth mobile networks and avoid claiming offline synchronization until it has been demonstrated.

**Practical constraints:** users need internet access for live data; third-party services may change; coarse environmental products may not describe small plots; source refresh schedules differ; and secure handling of farm and personal records requires real authentication and server-side access policies. These issues shape the next release and should not be concealed by an appealing prototype.

### Proposed approach to measuring real impact

A credible next step is a **small, consent-based pilot** involving farmers and agronomic reviewers. Before recommendations are delivered, record the crop, field, prior sequence, baseline soil analysis where feasible, irrigation practices, costs, and available harvest records. Evaluate the appropriateness and clarity of each suggestion; then track actions and outcomes over at least one complete growing cycle, and preferably multiple cycles for soil and rotation effects. Compare similar crops and conditions while documenting rainfall, input changes, technical assistance, and other influences. A simple before/after change alone cannot establish that TerraFarm caused it.

**No pilot results, certification, farmer adoption totals, crop-yield improvements, or financial savings are claimed in this README.**

## Development status and next steps

| Priority | Next development action | Completion evidence required |
|---|---|---|
| 1. Real NASA data | Connect, normalize, and display at least one challenge-relevant NASA dataset. | Reproducible request/processing example, source/version/date in UI, and a successful test. |
| 2. Local context | Link verified climate, crop requirements, geography, and available soil information. | Known test area with consistent coordinates, units, and documented limitations. |
| 3. Rotation logic | Review candidate sequences with a qualified agronomic adviser. | Test cases explaining accept/reject reasons, including annual versus perennial crops. |
| 4. Persistent records | Replace prototype adapters with secure, working storage/authentication. | Demonstrated end-to-end record creation, retrieval, and appropriate access controls. |
| 5. User experience | Test common tasks with growers and improve accessibility. | Documented task outcomes and changes made from feedback. |
| 6. Impact pilot | Study real decisions and growing-cycle outcomes. | Consent-based baseline, usage logs, and clearly delimited findings. |

## Team

The original README lists these members:

- Poll Garro Vargas
- Angelo Castro Piedra
- Hector Leiva Gamboa
- Brandon Rivera Hidalgo
- Santiago Portuguez Henández
- Kenni González Blandón

*Names are transcribed from the supplied README and should be checked against team registration before submission.*

## Local development

The following commands are preserved from the supplied project's documentation; **this document revision did not execute them**.

**Prerequisites:** npm and a compatible Node.js runtime. The existing README refers to **Node.js 22.18 or later** for the extractors; confirm the exact requirements in `package.json` and `extractores/README.md`.

```bash
npm install
npm run dev
npm run build
npm run preview
npm run test:extractores
```

The documentation identifies `web/dist/` as the Vite build output and refers to `HashRouter` navigation (`/#/` and `/#/sembrar`). The original instructions suggest copying `.env.example` to `.env` for service configuration. Never place private database credentials or administrative API keys in frontend-exposed `VITE_*` variables. **Environment configuration alone does not convert a simulated adapter into a production integration.**

This README does not assert that a public deployment, continuous deployment workflow, native iOS binary, or production authentication has been verified.

## Declaration of Super Intelligence (SI) / AI assistance

The supplied project documentation records **Claude, Codex, Gemini, GitHub Copilot, and ChatGPT** as AI-assisted tools used in the team's development and documentation process. It does **not** attribute a precise task, generated file, model version, or contribution percentage to each tool. That level of detail must be confirmed against the team's actual use before final submission.

**Confirmed for this revised document:** ChatGPT assisted with English editing, restructuring the project story, preparing explanatory text and submission wording, and organizing cited evidence on November 15, 2026. The team remains responsible for approving the final facts, code, and materials. AI-generated statements are not substitutes for NASA data, government statistics, or agronomic verification.

**Disclosure requirements for the 2026 submission:**

- **Text/documentation:** identify AI-assisted writing and the location of the acknowledgement (this section and project submission notes).
- **Code and data:** if generated or substantially modified with SI tools, provide a clear acknowledgement in the associated file, metadata, or documentation, along with human review and validation details. Do not claim review or tests that did not occur.
- **Images and video:** apply a **visible AI-generated watermark** to each SI-generated asset, including relevant presentation material; do not put NASA logos, flags, or mission identifiers into generated assets.
- **Audio:** if SI-generated, disclose that generation in descriptive text and metadata.
- **Form selection:** select every SI-use category that actually applies. Do not select “I did not use SI” when SI tools contributed to the submitted work.

Whether the project contains generated images, video, audio, or individual SI-generated code files **cannot be determined from the README alone**. The team must audit its own submission assets and code repository. See the companion `TerraFarm_Project_Submission.md` for a proposed statement and checklist.

## References and evidence notes

### Competition and scientific context

- [NASA Space Apps Challenge 2026: Field Shift](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/) — challenge aim and intended use of NASA data.
- [NASA POWER — Parameters](https://power.larc.nasa.gov/parameters/) and [Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) — available meteorological and solar data.
- [NASA SMAP L4 soil moisture](https://nsidc.org/data/spl4smgp/versions/8) — moisture estimates, not laboratory soil fertility.
- [NASA GPM](https://gpm.nasa.gov/data), [ECOSTRESS](https://ecostress.jpl.nasa.gov/data), [MODIS](https://lpdaac.usgs.gov/products/mod13q1v061/), and [SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm) — candidate Earth-observation products.
- [USDA-NRCS Conservation Crop Rotation Standard](https://www.nrcs.usda.gov/sites/default/files/2022-09/Conservation_Crop_Rotation_328_CPS.pdf) — agronomic basis and limitations of rotation practices.

### Costa Rican context

- [INEC: Agricultural Census 2014](https://admin.inec.cr/en/node/39763) — holdings, area, and land use; **2014 baseline**.
- [INEC: 2014 crop-producing holdings](https://admin.inec.cr/noticias/resultados-generales-del-censo-agropecuario) — 78,408 holdings growing at least one crop; **2014 baseline**.
- [INEC: ENA 2025 crops](https://admin.inec.cr/noticias/papa-cebolla-representan-el-804-del-area-sembrada-entre-las-hortalizas-investigadas) — planted area and production of selected crops; **2025 reference year**.
- [MAG: recovery response to 2024 rainfall](https://mag.go.cr/gobierno-destina-%E2%82%A15-500-millones-para-reactivar-produccion-de-23-958-productores-afectados-por-lluvias-de-2024/) — **March 25, 2026 announcement**.
- [INEC: ENAHO 2025](https://admin.inec.cr/en/node/56794) — **2025 household poverty**, not farmer-specific data.
- [PIMA-SIMM](https://www.pima.go.cr/simm/) — agricultural price context, not direct measurement of demand.

**Evidence policy:** Sources support the background and intended method. They do not independently certify that every TerraFarm module works or that the project has produced field-level benefits. The research inventory inherited from `NASA.pdf` should be cross-checked against code and real API requests before resources are entered into the competition's *NASA Data* and *Other Data* sections.

