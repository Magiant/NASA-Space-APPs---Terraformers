# TerraFarm — Together We Grow

**Team:** Terraformers
**Event:** NASA Space Apps Challenge 2026
**Challenge:** Field Shift — *Cambio en el campo: adaptación de granjas agrícolas mediante datos de la NASA*
**Pilot country:** Costa Rica (492 districts)
**Project status:** Working web prototype connected to a real database with real NASA and Costa Rican data; some integrations and the agronomic validation are still pending (listed below)
**Documentation date:** November 15, 2026

> *From Earth observations to practical decisions for healthier soils, more resilient farms, and better-informed growers.*

**About the name:** the product is called **TerraFarm**. The team is called **Terraformers**. Older technical files, folders and package names still use the earlier working name **Terraformes** (for example `@terraformes/web` or the `ios/Terraformes` project). They all refer to the same project.

---

## Table of contents

1. [About TerraFarm](#about-terrafarm)
2. [The challenge we address](#the-challenge-we-address)
3. [Project story and development history](#project-story-and-development-history)
4. [What TerraFarm does — screen by screen](#what-terrafarm-does--screen-by-screen)
5. [How a recommendation is built](#how-a-recommendation-is-built)
6. [Data sources: what is really used](#data-sources-what-is-really-used)
7. [The database today](#the-database-today)
8. [Architecture and technology](#architecture-and-technology)
9. [Automatic data updates](#automatic-data-updates)
10. [Security and privacy](#security-and-privacy)
11. [Known limitations](#known-limitations)
12. [Impact Assessment](#impact-assessment)
13. [Development status and next steps](#development-status-and-next-steps)
14. [Local development](#local-development)
15. [Team](#team)
16. [Declaration of Super Intelligence (SI) / AI assistance](#declaration-of-super-intelligence-si--ai-assistance)
17. [References](#references)
18. [Live deployment](#live-deployment)

---

## About TerraFarm

TerraFarm is an agricultural decision-support system that helps farmers in five ways:

- Understand the growing conditions of their district.
- Choose what to plant.
- Plan crop rotations.
- Keep a record of their farms and plantings.
- Report pests.

It turns scientific and geographic information into practical questions a farmer actually asks:

- What grows well here?
- What should I plant after my last crop?
- Is this a good month to sow?
- How much is this crop selling for right now?
- Is there a drought, a volcano or a landslide risk near my farm?

The initial geographic focus is **Costa Rica**. TerraFarm combines NASA Earth-observation data with national agricultural, geographic and market information for each of the country's **492 districts**. The approach can be adapted to other countries that have compatible satellite products, local data and agricultural demand. That requires local validation, not just moving the map.

TerraFarm is available in three ways, all showing the same screens and data:

- **Web application** (a Progressive Web App) that works on desktop and mobile browsers and keeps working with a weak signal.
- **Android app** (`android/`, Kotlin + Jetpack Compose). It packages the web app with native Material 3 tabs, works without internet, and is built automatically by GitHub Actions. The APK can be downloaded from the web ("Download the app" button) or directly: [TerraFarm.apk](https://github.com/Magiant/NASA-Space-APPs---Terraformers/releases/download/app-android/TerraFarm.apk). It is **not on Google Play**.
- **iOS app** (`ios/`, SwiftUI + WebKit), with native tabs. It builds in Xcode but **has not been published on the App Store**.

A **28-second demo video** for the judges is produced in code with Remotion (`video/`).

TerraFarm is meant to **support** a farmer's own experience, laboratory soil tests, local agronomists (MAG/INTA technicians) and official warnings. It does not replace any of them. Every screen says where its data comes from and what is estimated.

---

## The challenge we address

NASA's 2026 *Field Shift* challenge asks teams to combine NASA Earth observations with local soil information, crop characteristics and farmer priorities. The goal is rotation strategies that protect soil health and strengthen resilience. TerraFarm applies that challenge to a practical workflow, instead of showing satellite readings as isolated charts.

Agricultural decisions depend on factors that interact with each other:

- A crop can match the average temperature of a place but not its water, slope, soil, the previous crop or the producer's resources.
- Farmers also face extreme rain, droughts, volcanic ash, pests and changing prices.
- The information exists, but it is spread across NASA portals, the National Meteorological Institute (IMN), the National Emergency Commission (CNE), the wholesale market (PIMA-CENADA), INEC, FAO and others. It is hard to find, compare and connect to one specific field.

**Our central question:** how can globally available Earth-observation data and local agricultural knowledge help a farmer plan a healthier and more productive sequence of growing cycles?

---

## Project story and development history

TerraFarm started from one idea: agricultural data is only valuable when it becomes an understandable choice. Instead of asking farmers to interpret climate products, soil maps, crop requirement tables and market reports separately, TerraFarm organizes all of that evidence around the district and the farm they manage.

**Costa Rica as the pilot.** The first design decision was to start in Costa Rica:

- In a very small territory it has lowlands at sea level and potato fields above 3,000 m.
- It has a dry Pacific and a rainy Caribbean.
- It has volcanic soils and active volcanoes.

This makes it an ideal place to show why one recommendation cannot apply everywhere. Costa Rican sources give local context, while NASA observations provide a foundation that can be reused beyond national borders.

**Crop rotation and soil health at the center.** The second decision was to put rotation and long-term soil health at the center of planning. Choosing the next crop is only part of good management. For annual crops, the next choice should take into account:

- The previous crop.
- The plant family.
- Pests that stay in the soil.
- Water use.
- Nutrient demand.

Legumes such as beans return nitrogen to the soil. Repeating the same family (potato after tomato) accumulates the same pests. TerraFarm encodes these rules explicitly and shows the reason for each one. The correct sequence is still site-specific and needs agricultural validation. An algorithm cannot guarantee that soil nutrients will recover.

**Designed for the farmer.** The third decision was to make the system usable by people who do not use scientific portals:

- Large buttons and plain language.
- A district map.
- Spanish and English.
- A light and a dark theme.
- An offline mode with a queue for reports made without a signal.
- A "Back" button on every page.

### Documented progression (from the Git history)

| Stage | What was done | Evidence in this repository |
|---|---|---|
| Research | NASA and Costa Rican sources, crop requirements, risks and markets were catalogued and checked against their access rules (`robots.txt`, licenses, quotas). | `docs/fuentes.md`, `docs/fenomenos-naturales.md`, `docs/temas-2-y-10.md` |
| Architecture | npm monorepo: React/Vite/TypeScript web, shared Zod schemas, Node.js extractors, SQL migrations, GitHub Actions. | `web/`, `packages/compartido/`, `extractores/`, `supabase/`, `.github/workflows/` |
| Interface | Navigation, district map, crop catalog, prices, alerts, courses, farm management, drone scan, admin panel, settings, ES/EN, two themes, offline support. | `web/src/paginas/`, `web/src/componentes/` |
| Real database | Supabase (PostgreSQL) with accounts, farms, plantings, notes, pest reports, drone flights and all the extracted public data, protected by row-level security. | `supabase/migrations/001…014`, applied automatically by `migraciones.yml` |
| Real data loaded | Climate, temperature, soil moisture, water balance, soils, terrain, heat waves, hazards, crop requirements, FAO suitability, wholesale prices, IMN forecasts and INA courses for all 492 districts. | Row counts in [The database today](#the-database-today) |
| Recommendation engine | Rotation rules, crop suitability scoring per district and per crop, sowing month. | `extractores/src/cultivos/catalogo.ts`, `extractores/src/aptitud/calcular.ts` |
| Tests | 100 automated tests for the extractors (no internet needed). | `extractores/test/` |
| Deployment | Public site on GitHub Pages. | `npm run deploy` → branch `gh-pages` |
| Mobile apps | Native Android shell (APK built and published by GitHub Actions) and native iOS shell. | `android/`, `ios/`, `.github/workflows/android.yml` |
| Demo video | 28-second video: map zoom, drone scan, real app footage, storm alert, globe; subtitles and an "AI-assisted" watermark. | `video/`, `docs/video/guion.md` |
| Next stage | Agronomic validation, CNP prices, NDVI, census, real users. | [Next steps](#development-status-and-next-steps) |

The Git history of this repository starts on **November 14, 2026**. No earlier founding date, completed farmer pilot, award, institutional partnership or measured yield increase is claimed.

### A practical use case (illustrative, not a documented pilot)

1. A grower from Oriental de Cartago opens TerraFarm on their phone and chooses their district on the map.
2. They see the district conditions: temperature of the last 30 days, rain, soil moisture, water balance, soil pH and nearby hazards (for example, a medium volcanic hazard because the Irazú volcano is about 16 km away).
3. TerraFarm ranks the crops that fit best there, with a score out of 100, the best sowing month and today's wholesale price at CENADA.
4. They create an account, register their farm and record that they just harvested beans.
5. When they start a new planting, TerraFarm recommends crops that make good use of the nitrogen the beans left behind, and warns against crops that share pests that stay in the soil.
6. Weeks later they see whiteflies, report the pest from the field (even without a signal), see a photo to confirm it is the same insect, and get the control steps in order: farm practices first, biological control second, chemicals only as a last resort.

*This example illustrates the intended workflow; it is not evidence of a real field deployment.*

---

## What TerraFarm does — screen by screen

The public screens work **without an account**. An account is requested only when the farmer wants to save something of their own (farms, plantings, reports, drone scans). The administration area is closed to normal users.

### Public screens

| Screen | Route | What the farmer sees |
|---|---|---|
| **Home** | `/#/` | The TerraFarm modules as large cards: plant, prices, alerts, courses, my farm, drone. A short explanation of where the data comes from. |
| **Plant (choose a place)** | `/#/sembrar` | A map of Costa Rica with provinces, cantons and districts, plus a province → canton → district selector and a "Use my location" (GPS) button. The best crops for the chosen place are shown 4 per row on a computer and 2 per row on a phone. |
| **District** | `/#/zona/CR30101` | Best crops of the district (score, level, sowing month, current price, "Why this score?" breakdown). Area conditions: temperature, rain of the month, soil moisture, water balance, soil texture and pH, natural hazards. A 30-day temperature chart. What neighbours are already planting (anonymous totals). Active alerts for the district. |
| **Crop** | `/#/cultivo/papa` | Real photo, scientific name and family; sowing calendar by month; days to harvest; temperature, altitude, water and pH needs; effect on the soil; pests that attack it, each with a real photo, symptoms and control in order; what to plant next (rotation); current price with a chart of the latest wholesale bulletins; districts where it grows best; related courses. |
| **Prices** | `/#/precios` | Wholesale prices of every product in the daily PIMA-CENADA bulletin (minimum, maximum, mode, average), trend against the previous bulletin (up, down, steady), unit of sale and date, plus a search box. |
| **Alerts** | `/#/alertas` | IMN subseasonal forecasts and CNE/IMN warnings, each with a photo matching its type (rain, drought, volcano or satellite), level, dates and affected places; filter for "my district" or the whole country. |
| **Courses** | `/#/capacitaciones` | Agricultural courses from INA: topic, mode (in person, virtual or mixed), hours, provinces and link. |
| **Settings** | menu ⚙ | A drop-down from the top-right corner: appearance (light green "field" theme or dark blue theme), language (Spanish / English), account (sign in / sign out / admin) and data sources. Saved on the device. |

### Screens that need an account

| Screen | Route | What it does |
|---|---|---|
| **Sign in / Create account** | `/#/ingresar`, `/#/registrarse` | Email and password. If something is wrong, the message explains exactly what and how to fix it (for example *"'ana@gmail' does not look like a valid email…"* or *"the password has 3 characters: it needs at least 8"*). New accounts are always *farmer*; only an administrator can change roles. |
| **My farm** | `/#/mi-finca` | The farmer's farms and what is planted in each one, with quick actions: new planting, report pest, drone scan, history. |
| **New farm** | `/#/fincas/nueva` | Name, location (GPS or province/canton/district), size in hectares, water source, irrigation yes/no and soil type. The exact location of the farm is never shown to anyone. |
| **New planting** | `/#/siembras/nueva` | Choose the farm. TerraFarm ranks the best crops for that district **taking into account the previous crop** (rotation), shows the ones to avoid and why, then records the planting date and expected harvest. |
| **My planting** | `/#/siembras/:id` | Progress of the cycle, expected harvest, a timeline of notes (watering, fertilizer, problem, other) and buttons to report a pest or close the harvest. |
| **Close planting** | `/#/siembras/:id/cerrar` | Result (good, regular, lost), quantity and unit, and the reason. Plantings are never deleted: they are closed, so the history stays useful for future recommendations. |
| **Report pest** | `/#/reportar-plaga` | Type of damage chosen with large picture buttons (insect, spots/mould, deformed leaves, roots, weeds, "I don't know"), the suspected pest with a real photo to compare, what is seen, how much is damaged and an optional photo. **Without a signal the report is saved on the phone and sent automatically when the connection comes back.** Afterwards it shows how to control the pest and what to plant next so the pest is not fed. |
| **History** | `/#/historial` | Finished plantings with their results (good / regular / lost) and the farmer's pest reports with their review status. |
| **Drone scan** | `/#/dron` | Results of a drone flight over the farm as a grid of plots (healthy, stressed, critical), comparison with the previous flight, an interactive 3D view of the farm (isometric, rotatable, with rivers, roads, ponds, trees, houses and protection zones) and what to do in each plot. |

### Administration (administrators only; technicians see their own district)

| Screen | Route | What it does |
|---|---|---|
| **Admin panel** | `/#/admin` | Totals (users, farms, active plantings, pending reports), user list and role changes, pest reports to confirm, and the log of every data extraction run (source, start, duration, rows saved, status, message). |

### Things that work everywhere

- **Offline / weak signal:** a service worker keeps what was already consulted; a banner shows whether there is a signal; pest reports made offline are queued and sent later.
- **Two languages:** every text exists in Spanish and English (`web/src/idiomas/es.ts`, `en.ts`).
- **Two themes:** light "field" theme (forest green background) and dark blue theme (`web/src/temas/`).
- **Full width:** layouts use the whole screen on computers and switch to large, touch-friendly controls on phones, with a bottom tab bar.
- **"Back" button** inside every page.
- **Photo credits:** every crop, pest, alert and background photo is from Wikimedia Commons under a free license (CC0, public domain, CC BY or CC BY-SA), and its author and license are shown under the photo.

---

## How a recommendation is built

```text
Farmer chooses a district (map, list or GPS) and, if logged in, a farm with its previous crop
        |
        v
TerraFarm reads that district's data from the database
  climate normals (NASA POWER) · last 30 days (Open-Meteo / NASA POWER) · soil (SoilGrids)
  terrain (SRTM) · hazards · FAO EcoCrop requirements · wholesale price trend (PIMA)
        |
        v
Every crop gets five notes from 0 to 100
  climate 30 % · water 25 % · soil 20 % · risk 15 % · market 10 %
        |
        v
Hard limits discard crops that cannot survive there (too cold, too hot, too high)
        |
        v
Rotation rules adjust the ranking with the previous crop (same family / soil pests / nitrogen)
        |
        v
The farmer sees: ranking, level, sowing month, price, and "Why this score?"
        |
        v
The planting is recorded, followed with notes, closed with a result → better history for next time
```

### Suitability score (`extractores/src/aptitud/calcular.ts`)

The score is calculated for **every district × every crop (492 × 13 = 6,396 combinations)** each week. It does not call any API: it crosses data already stored by the other extractors.

| Note | Weight | How it is calculated |
|---|---|---|
| Climate | 30 % | Average temperature against the crop's optimal range (60 %) and the district's altitude against the crop's altitude range (40 %). Optimal ranges come from Costa Rican MAG/INTA crop sheets; absolute survival limits come from FAO EcoCrop. 100 inside the optimum, falling linearly to 0 at the absolute limit. |
| Water | 25 % | Rainfall during the crop cycle against the FAO EcoCrop range. For short-cycle crops: annual rainfall × cycle days / 365, because that is how EcoCrop defines it. |
| Soil | 20 % | Soil pH against the crop's range (80 %) and average slope of the district (20 %: full marks up to 8 %, zero from 45 %). |
| Risk | 15 % | 100 minus penalties for hazards in the district: very high −35, high −20, medium −8. |
| Market | 10 % | Trend of the wholesale price in the last week compared with the previous weeks (PIMA-CENADA). If the crop has no price yet, its weight is shared among the other notes. |

**Levels:**
- **Discarded:** the temperature is outside what the crop survives, or the altitude is above its maximum, or there is no climate data.
- **Excellent:** 85 or more.
- **Good:** 65 or more.
- **Not recommended:** below 65.

**Sowing month:** the first month of the MAG/INTA calendar for the crop. Otherwise the FAO GAEZ month, and otherwise the month when the rainy season starts in that district.

**Sanity check on the real data:**
- Potato ranks best in Barva and Coto Brus.
- Rice ranks best in the Caribbean lowlands.
- Pineapple ranks best in Guatuso and Cañas.
- Coffee ranks best in Tilarán and San Carlos.

A first version that used FAO ranges alone put coffee in the hot lowlands of Upala. That is why local MAG/INTA optimal ranges are used for the optimum.

### Rotation rules (`extractores/src/cultivos/catalogo.ts`)

The 169 crop pairs (13 × 13) are generated from explicit rules, not written by hand, so they are consistent:

| Rule | Result | Example |
|---|---|---|
| Same crop | Prohibited | Potato after potato |
| Same plant family | Prohibited — wait the indicated number of cycles | Tomato after potato (both Solanaceae) |
| They share a pest that survives in the soil or crop residue (nematodes, clubroot, late blight, potato moth, fall armyworm) | Prohibited | Potato after carrot (root-knot nematode) |
| Perennial or multi-year crop (coffee, pineapple) | Neutral — they are not rotated every cycle | Coffee and beans |
| A legume before a crop that needs a lot of nitrogen | Recommended | Maize after beans |
| A crop that uses nitrogen before a legume | Recommended — it returns the nitrogen | Beans after potato |
| Roots at very different depths | Recommended — uses another soil layer | Shallow-rooted crop after a deep-rooted one |

Result: 31 recommended pairs, 29 prohibited pairs, the rest neutral.

### Natural hazards per district (`extractores/src/riesgos/estimar-amenazas.ts`)

The CNE publishes its hazard maps only as PDF files per canton, which cannot be read automatically. Until someone reviews them by hand, TerraFarm estimates hazards with transparent rules. Every row says where it comes from and starts with `estimado:`.

| Hazard | Rule | Districts |
|---|---|---|
| Volcano | Distance to the five active volcanoes monitored by OVSICORI (Rincón de la Vieja, Arenal, Poás, Irazú, Turrialba): < 10 km very high, < 20 km high, < 35 km medium | 295 |
| Landslide | Average slope (SRTM): ≥ 30 % very high, ≥ 20 % high, ≥ 12 % medium, otherwise low; risk months = rainiest months | 492 |
| Drought | Months with normal rainfall below 50 mm (NASA POWER): ≥ 6 very high, 4–5 high, 2–3 medium, 1 low | 304 |
| Flood | Low and flat areas: < 50 m and < 4 % slope high, < 150 m and < 6 % medium | 45 |

The estimates are stored in `extractores/datos/riesgos/amenazas.csv` so that a reviewer can correct any row and load it again.

---

## Data sources: what is really used

This section separates **data that is actually downloaded, processed, stored and shown** from data that was only researched. Row counts are from the database on November 15, 2026.

### NASA Earth-observation data

| NASA resource | How TerraFarm uses it | Status | Rows |
|---|---|---|---|
| [**NASA POWER**](https://power.larc.nasa.gov/) (daily API) | Daily temperature (mean, max, min), rain and evapotranspiration for every district since November 2024. Temperatures are **corrected for altitude** point by point (−6.5 °C per km between the POWER grid altitude and the real altitude). Used for climate normals, anomalies, records, heat waves, drought months and the climate note of the score. | ✅ **Used, live** (weekly) | 365,064 in `clima_diario` + 3,523 heat waves |
| **NASA POWER** soil wetness (GWETTOP / GWETROOT / GWETPROF) | Relative soil moisture at the surface, root zone and full profile, last 14 days. | ✅ **Used, live** (weekly) | part of 28,044 in `humedad_suelo` |
| [**SRTM**](https://www.earthdata.nasa.gov/data/instruments/srtm) 90 m (served through OpenTopoData) | Altitude (mean, min, max) and average slope of every district. For each sample point, heights 100 m east, west, north and south are compared to compute the slope. Feeds the landslide and flood estimates, the land-use capability class and the score. | ✅ **Used** (one-time load) | 492 in `terreno_zona` |
| [**ECOSTRESS**](https://ecostress.jpl.nasa.gov/data) (via NASA AppEEARS) | Real evapotranspiration and evaporative stress index for the water study. | 🟡 Extractor written (`agua-ecostress`), needs NASA Earthdata credentials to run | 0 |
| [**MODIS** MOD13Q1 NDVI](https://lpdaac.usgs.gov/products/mod13q1v061/) | Vegetation index per district (`cobertura_zona`). | 🟡 Table ready, not loaded (needs Earthdata) | 0 |
| [**GPM**](https://gpm.nasa.gov/data) | Precipitation. | ⚪ Researched, postponed (NASA POWER rain is used instead) | — |
| [**SMAP** L4](https://nsidc.org/data/spl4smgp/versions/8) | Soil moisture. | ⚪ Researched, not implemented (NASA POWER and Open-Meteo soil moisture are used instead) | — |
| [**NASA GEOS-FP**](https://gmao.gsfc.nasa.gov/gmao-products/geos-near-real-time-data-products/) ([NCCS OPeNDAP](https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/fcast/tavg1_2d_slv_Nx)) | Experimental hourly air-temperature forecasts at 2 meters (`T2M`). Daily mean, maximum and minimum temperatures are calculated from hourly values for the selected district. Complements NASA POWER historical data. | 🟡 Implemented and tested in the standalone temperature module; production integration not verified | — |

### Other data actually used

| Source | What is taken | How | Status | Rows |
|---|---|---|---|---|
| [HDX / INEC](https://data.humdata.org/) | The 492 districts of Costa Rica with names, codes, centroid, area and polygon | One-time load | ✅ Used | 492 |
| [Open-Meteo](https://open-meteo.com/) | Daily weather of the last days per district (temperature, rain, humidity), soil moisture and soil temperature at 0–7, 7–28 and 28–100 cm, water balance | Daily | ✅ Used | 3,444 climate + soil moisture + 1,476 water |
| [SoilGrids / ISRIC](https://soilgrids.org/) | pH, clay, sand, silt, organic carbon, nitrogen, CEC, bulk density and USDA texture per district | One-time load | ✅ Used | 492 |
| [FAO EcoCrop](https://github.com/OpenCLIM/ecocrop) | Temperature, rainfall, pH and altitude limits of each crop | One-time load | ✅ Used | 13 |
| [FAO GAEZ v4](https://gaez.fao.org/) | FAO suitability and sowing calendar per district and crop | One-time load | ✅ Stored; used only for cross-checking and as a fallback sowing month (its 9 km pixels are too coarse for the score) | 4,920 |
| [PIMA-CENADA](https://www.pima.go.cr/boletin/) | Daily wholesale bulletin: min, max, mode and average price per product and unit | Daily. The portal only serves the PDF inside a browser session, so a headless Chrome downloads it and `pdftotext` reads it. Its `robots.txt` allows it. | ✅ Used (11 bulletins, Oct 30 – Nov 13, 2026) | 602 |
| [IMN](https://www.imn.ac.cr/pronostico-subestacional) | Subseasonal forecast (whole period + each week) | Daily, automatic | ✅ Used | 5 |
| [INA](https://www.ina.ac.cr/) | Agricultural courses of the Agricultural Sector Unit | Weekly | ✅ Used | 104 |
| OVSICORI-UNA | Coordinates of the five active volcanoes | Constant in code | ✅ Used for the volcanic hazard | — |
| MAG / INTA crop sheets | Optimal temperature, altitude, sowing calendar, cycle, root depth and soil effect of each crop | Team-reviewed catalog | ✅ Used | 13 crops, 169 rotations |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Photos of crops, pests, alert types and backgrounds (free licenses only, with credits) | Downloaded once | ✅ Used | — |
| CNE | Official alerts and hazard maps | Hand-reviewed bulletin (its site blocks automated access, which is not bypassed) | 🟡 Loader ready, hazards estimated meanwhile | 1,136 estimated hazards |
| [CNP](https://www.cnp.go.cr/) | Prices of beans, maize, rice and coffee | — | ⚪ No extractor yet | 0 |
| [INEC Agricultural Census 2014](https://www.inec.cr/) | Area and farms per canton and crop | Loader ready; needs the Excel file downloaded by hand | 🟡 Pending | 0 |
| [Protected Planet (WDPA)](https://www.protectedplanet.net/) | Share of each district inside protected areas | Loader ready; needs a free API token | 🟡 Pending | 0 |
| Pest sheets | Symptoms and control of 8 pests | Written by the team | 🟡 Reference only (there is no database table for them yet) | — |

**Practical rules followed by all extractors:**
- Every district is measured as the average of **5 to 20 points inside its polygon** (5 + 1 per 25 km², maximum 20), never a single point.
- API limits are respected: Open-Meteo's 10,000 calls per day; heights already consulted are cached so they are not requested again; one request per second for OpenTopoData; pauses for PIMA.
- Every batch is validated with Zod before it is saved.
- Every run is logged in the `extracciones` table.

---

## The database today

Supabase (PostgreSQL), project in the US West region. Counts as of **November 15, 2026**.

### Public data (read-only for the web, written only by the extractors)

| Table | What it holds | Rows |
|---|---|---|
| `distritos` | 492 districts with polygon, centroid and area | 492 |
| `clima_diario` | Daily climate per district and source (NASA POWER, Open-Meteo) | 368,508 |
| `humedad_suelo` | Soil moisture by depth (Open-Meteo, NASA POWER) | 28,044 |
| `agua_zona` | Monthly/weekly rain, evapotranspiration and water balance | 1,476 |
| `suelos_zona` | Soil properties (SoilGrids) | 492 |
| `terreno_zona` | Altitude, slope, land-use capability class | 492 |
| `amenazas_zona` | Hazards per district (estimated) | 1,136 |
| `alertas` | IMN / CNE alerts and forecasts | 5 |
| `olas_calor` | Heat waves detected per district | 3,523 |
| `cultivos` | Crop catalog | 13 |
| `requisitos_cultivo` | FAO EcoCrop requirements | 13 |
| `secuencias` | Rotation pairs | 169 |
| `gaez_zona` | FAO GAEZ suitability | 4,920 |
| `precios_historico` | PIMA-CENADA wholesale prices | 602 |
| `capacitaciones` | INA courses | 104 |
| `aptitud` | Final score district × crop | 6,396 |
| `cobertura_zona`, `censo_canton` | NDVI and agricultural census | pending |
| Views `clima_mensual`, `clima_normales`, `clima_anomalias`, `clima_records` | Monthly climate, normals, anomalies and records computed from `clima_diario` | — |

### User data (each person only sees their own)

| Table | What it holds |
|---|---|
| `perfiles` | Name, email, role (farmer, technician, admin), district, created automatically when an account is created |
| `fincas` | Farms: name, district, area, water source, irrigation, soil |
| `siembras` | Plantings: crop, area, dates, status, result, quantity, reason. Closed, never deleted |
| `seguimiento` | Notes on a planting (watering, fertilizer, problem, other) |
| `reportes_plaga` | Pest reports with status pending / confirmed |
| `vuelos_dron` | Drone flights with the plot grid |
| Views `siembras_zona`, `resultados_zona` | **Anonymous** totals per district (what neighbours plant and how it went), with no personal data |

All migrations live in `supabase/migrations/` (001 → 014). They are applied automatically by GitHub Actions with a runner that records each file's hash, applies each file in its own transaction and skips files already applied.

---

## Architecture and technology

TerraFarm is an **npm monorepo**:

```text
NASA-Space-APPs---Terraformers/
├── web/                     Web app (React 18 + TypeScript + Vite 6, HashRouter, PWA)
│   ├── src/paginas/         Screens: publicas/, privadas/, auth/, admin/
│   ├── src/componentes/     Layout, cards, charts, map, 3D farm view, settings menu…
│   ├── src/servicios/       Data access: Supabase client, public data, auth, demo mode
│   ├── src/logica/          Rotation and recommendation logic, farm elements
│   ├── src/idiomas/         es.ts and en.ts (every text in both languages)
│   ├── src/temas/           crema.css (light field theme) and azul.css (dark theme)
│   ├── src/fotos/           Photo credits (author, license, link)
│   └── public/              Photos, district maps, service worker, manifest, icons
├── packages/compartido/     Shared Zod schemas = the contract between extractors and database
├── extractores/             Node.js (≥ 22.18) TypeScript extractors, one command per data source
│   ├── src/                 clima/, humedad/, agua/, riesgos/, precios/, cultivos/, aptitud/, cargas-unicas/, comun/
│   ├── datos/               Hand-reviewed inputs (hazards CSV, IMN/CNE templates)
│   └── test/                100 offline tests
├── supabase/                SQL migrations, migration runner, demo data loader
├── android/                 Native Android shell (Kotlin + Jetpack Compose + WebView) that packages the web app
├── ios/                     Native iOS shell (SwiftUI + WKWebView) that packages the web app
├── video/                   Remotion project of the 28-second demo video (scenes, music, subtitles)
├── docs/                    Technical documentation per topic
└── .github/workflows/       Migrations, daily / weekly / one-time extractions, Pages deployment
```

| Layer | Technology | Notes |
|---|---|---|
| Interface | React 18, TypeScript, Vite 6, React Router (hash), CSS with theme tokens, inline SVG icons | Works as a PWA; no UI framework; charts and the 3D farm view are hand-written SVG |
| Data access | `@supabase/supabase-js` with the **public anon key only** | No own server is needed: the database decides what each user may read or write (row-level security) |
| Demo mode | `web/src/servicios/demo.ts` | If the web is built without the Supabase keys, it runs with sample data stored in the browser, with the same screens |
| Shared contract | Zod schemas in `packages/compartido` | One schema per table; every extractor batch is validated before saving |
| Extractors | Node.js 22+ running TypeScript directly, `@turf/turf` for polygons, `geotiff` for FAO rasters, headless Chrome + `pdftotext` for PIMA | One command per source: `npm run extraer -- <name>` |
| Database & auth | Supabase (PostgreSQL, Auth, RLS) | 14 migrations, roles farmer / technician / admin |
| Automation | GitHub Actions | Migrations on push, daily and weekly extractions, manual one-time loads |
| Hosting | GitHub Pages (branch `gh-pages`) | `npm run deploy` |
| Android | Kotlin, Jetpack Compose, Material 3, WebView | One web view per tab with the packaged web; same language/theme bridge as iOS; location permission, photo picker and Back button; APK built by GitHub Actions |
| iOS | SwiftUI + WebKit | One web view per tab, shared session; `ios/preparar-web.sh` copies the built web into the app |
| Demo video | Remotion (React video), Node scripts for audio and voice cleanup | `npm run render` inside `video/` produces `out/terrafarm-demo.mp4` |

**Extractor commands available** (`extractores/src/main.ts`):
`distritos`, `clima`, `clima-historico`, `humedad-open-meteo`, `humedad-power`, `agua-open-meteo`, `agua-ecostress`, `agua-historica`, `temperatura-power`, `temperatura-historica`, `temperatura-comparar`, `olas-calor`, `imn-subestacional`, `cne`, `imn`, `amenazas-estimar`, `amenazas`, `soilgrids`, `ecocrop`, `gaez`, `areas-protegidas`, `censo`, `capacidad-uso`, `precios-pima`, `cultivos`, `terreno`, `aptitud`, `capacitacion-ina-web`, `capacitacion-ina`.

---

## Automatic data updates

| Workflow | When (Costa Rica time) | What it runs |
|---|---|---|
| `migraciones.yml` | On every push that changes `supabase/migrations/` | Applies new SQL migrations |
| `diario.yml` | Every day 05:00 | Open-Meteo climate and water balance, IMN subseasonal forecast, PIMA-CENADA prices |
| `diario.yml` | Every day 08:00 | Open-Meteo soil moisture (separate hour to respect the API's hourly limit) |
| `semanal.yml` | Mondays 02:00 | INA courses |
| `semanal.yml` | Mondays 04:00 | NASA POWER soil moisture and temperature, heat waves, ECOSTRESS, and finally the **suitability score** |
| `unica-vez.yml` | By hand from the Actions tab | Districts, historical climate and temperature, soils, EcoCrop, GAEZ, crop catalog, terrain, hazards, land-use capability, protected areas, suitability |
| `android.yml` | On every push to `dev` that changes the web or the Android app, and on pull requests | Builds the Android APK and, from `dev`, publishes it in the `app-android` release |
| `deploy-pages.yml` | — | Empty for now: the site is published by hand with `npm run deploy` |

Secrets live in **Settings → Secrets and variables → Actions** and are never in the code.

---

## Security and privacy

- **Row-level security on every user table.** Farmers see only their own farms, plantings, notes, reports and flights. Technicians see and confirm the pest reports of their own district. Administrators see everything.
- **Roles cannot be self-assigned.** Every new account is a farmer. A database trigger only lets an administrator change roles, and never their own.
- **Plantings are never deleted**, only closed, so the history cannot be lost by mistake.
- **Only the public key reaches the browser.** The service key and the database password are used only by extractors and GitHub Actions. A check confirmed that no secret ends up in the built site.
- **Exact farm locations are never shown.** Neighbours only see anonymous totals per district.
- **Text length limits** are enforced by the database itself (migration 014), not only by the forms: farm name 80, notes 1,000, reason 500, symptoms 1,000 characters. Long texts without spaces wrap instead of breaking the layout.
- **Passwords** need at least 8 characters, and the sign-up form explains every rejection in plain words.
- **Sources are respected:** `robots.txt`, licenses and API quotas are checked. Nothing that blocks automated access (such as the CNE site) is bypassed.

---

## Known limitations

These are stated openly so nobody mistakes the prototype for a finished product:

1. **Mountain rainfall from NASA POWER is too high.** In Cartago it gives about 3,600 mm per year against about 1,400 mm measured, which lowers the water note in highland districts. Local station data or GPM would improve this.
2. **Hazards are estimated**, not taken from CNE's official maps (which exist only as PDF files per canton). Each row says `estimado:` and how it was calculated.
3. **The suitability score has not been validated by an agronomist yet.** Its rules are documented and its top results make agronomic sense, but it is a decision aid, not a prescription.
4. **FAO GAEZ is too coarse** (≈ 9 km pixels) to score small districts. It is stored only for comparison.
5. **Only 13 crops** are in the catalog for now: potato, onion, carrot, cabbage, beans, maize, tomato, sweet pepper, coffee, rice, pineapple, cassava and coriander.
6. **Beans, maize, rice and coffee have no price yet**, because the CNP extractor is missing.
7. **Pest sheets** (symptoms and control of 8 pests) are written by the team as a reference; they are not yet in the database.
8. **NDVI, ECOSTRESS, the agricultural census and protected areas** are coded but not loaded, because they need credentials or files from a person.
9. **Email confirmation** depends on Supabase's default mail service, which has a low sending limit.
10. **Drone flights** in the prototype are demonstration data; no real drone has flown over a real farm for TerraFarm yet.
11. **The mobile apps are not in the stores:** the Android APK is installed by hand from GitHub (the phone asks to allow apps from unknown sources), and the iOS app is not on the App Store.

---

## Impact Assessment

### 1. Influence and potential impact

**What would change if TerraFarm succeeds?** A farmer would move from scattered climate charts, generic crop lists and market reports to one understandable process: choose the district, see the conditions, compare crops with reasons, plan the rotation and record what happened. The main contribution is not accurately predicting harvests. It is improving the **quality, accessibility and traceability of decisions**.

**Soil health and crop rotation.** By taking the previous crop into account, TerraFarm encourages planned rotations instead of repeating a crop without thinking about soil or pests. Suitable sequences may support nutrient cycling, soil cover, organic matter and less pressure from some pests. The benefits depend on crop choice, site conditions, management and time. Claims about soil nutrients need repeated soil tests and specialist review. The [USDA-NRCS crop rotation standard](https://www.nrcs.usda.gov/sites/default/files/2022-09/Conservation_Crop_Rotation_328_CPS.pdf) supports these goals but does not certify any TerraFarm recommendation.

**Water and environmental resilience.** Showing rain, soil moisture, water balance, heat waves and drought months next to planting decisions can help growers notice dry or wet conditions before they become problems. It can support irrigation and drainage planning, but it cannot prevent storms, floods or crop failure.

**Pests.** Real photos help the farmer recognize a pest. The control steps follow integrated pest management: farm practices first, biological control second, chemicals last. Reports reach the technician of the district. The rotation rules avoid planting a crop that feeds the reported pest.

**Farm organization and market awareness.** Records of farms, plantings, notes and results reduce scattered information. Daily wholesale prices with their trend add context when comparing crops, but wholesale prices alone cannot predict demand or profit.

**Access to knowledge.** A clear interface with two languages, large controls, offline support and visible sources lowers the effort needed to use technical information. This has to be tested with real users, not assumed from the design.

| Outcome area | Proposed benefit | How it would be measured |
|---|---|---|
| Soil / rotations | More diverse sequences and better-informed nutrient management | Rotation plans reviewed by agronomists; adoption over growing cycles; repeated soil organic matter and nutrient tests |
| Water management | Decisions aligned with local rain and soil moisture | Irrigation volumes per hectare; water-stress events, adjusted for weather |
| Pests | Earlier recognition and reporting | Time from first symptom to report and to action; share of reports confirmed by technicians |
| Farm economics | Clearer understanding of trade-offs | Production cost, gross margin, losses and yield per hectare by comparable crop and season |
| Usability | More growers able to find and understand information | Unassisted task completion, time on task, comprehension, accessibility checks and repeat use |

**Evidence status:** all of the benefits above are expected or testable, not observed results. No specific yield increase, water saving, financial return or soil recovery has been established.

### 2. Magnitude of the problem: the Costa Rican starting point

Costa Rica is a meaningful first setting because its agriculture covers very different crops, altitudes, rain patterns and production systems. The national figures below show the scale of the decisions. None of them is a count of TerraFarm users.

| Official evidence | Reference period | What it shows |
|---|---|---|
| **93,017 agricultural holdings** covering about **2,406,418.4 hectares** (47.1 % of the national territory) | INEC Agricultural Census, 2014 | The sector occupies a large share of the land; holdings include uses other than crops. |
| **78,408 holdings produced at least one crop**, about 84.3 % of the census total | INEC Agricultural Census, 2014 | A historical indication of how many holdings grow crops, not an estimate of current users. |
| **11,739.4 ha of rice, 8,081.6 ha of maize and 5,542.6 ha of beans** among the surveyed crops | INEC Agricultural Survey (ENA), 2025 | Annual crops with significant areas and different planning needs. |
| **Potatoes and onions were 80.4 %** of the planted area among the vegetables covered by ENA | ENA 2025, published in 2026 | Strong concentration in two crops, both in TerraFarm's catalog. Not 80.4 % of all national vegetable production. |
| **23,958 producers** included in a recovery response with **over CRC 5.5 billion** after the 2024 rains | MAG announcement, March 25, 2026, about November 2024 events | Real exposure to damaging rain. This is recovery funding, not total losses or savings produced by TerraFarm. |

Sources: [INEC Census summary](https://admin.inec.cr/en/node/39763), [INEC crop-producing farms](https://admin.inec.cr/noticias/resultados-generales-del-censo-agropecuario), [INEC ENA 2025 crop results](https://admin.inec.cr/noticias/papa-cebolla-representan-el-804-del-area-sembrada-entre-las-hortalizas-investigadas), [MAG recovery announcement](https://mag.go.cr/gobierno-destina-%E2%82%A15-500-millones-para-reactivar-produccion-de-23-958-productores-afectados-por-lluvias-de-2024/).

The problem is not a lack of data. It is the difficulty of **joining data with different scales, dates and meanings** and turning it into decisions a farmer can check and use. TerraFarm already joins **more than 400,000 rows** from about a dozen sources into one score per district and crop. Crop rotation also needs a longer horizon than a single forecast.

**International relevance:** NASA POWER and SRTM cover the whole planet, so the climate, temperature, soil-moisture and terrain parts of TerraFarm could run in other countries almost unchanged. The crop catalog, prices, hazards, laws and language would still need local sources and validation.

### 3. Potential beneficiaries and responsible reach estimates

**Primary beneficiaries:** crop growers and farm managers who decide what to plant, how to sequence annual crops and how to follow their fields.

**Secondary beneficiaries:**
- **Agronomists and MAG/INTA technicians.** TerraFarm already gives technicians their own role, so they can see and confirm the pest reports of their district.
- **Producer associations, cooperatives, agricultural teachers and INA**, whose courses are shown in the app.

Farm workers, rural households and food supply chains could benefit indirectly if decisions improve. Their number cannot be calculated from the current evidence.

The **78,408 crop-producing holdings** recorded in 2014 show historical scale. They must not be described as 78,408 future users, current farms or people: one person can manage several holdings, and production structures change. MAG's 23,958 affected producers belong to another program and period and must not be added to the census counts.

Access barriers matter. [INEC ENAHO 2025](https://admin.inec.cr/en/node/56794) estimated income poverty at **19.3 % of rural households** against **13.6 % of urban households**. These are household figures, not farmer poverty rates, but they support the design choices of a free web app, phone-first layouts, offline mode and plain language.

**Proposed beneficiary pathway:**

1. Recruit a small, diverse pilot group of growers and advisers from more than one crop and region. The number is to be agreed with partners, not presented as achieved.
2. Record consent, role, farm, crop, device and baseline information needs, distinguishing people from holdings.
3. Measure registered users, monthly active users, completed planning sessions and repeat use without duplicates. The `perfiles`, `fincas` and `siembras` tables already make this possible.
4. Check whether advice was understood, reviewed with an agronomist, adopted, and later associated with measurable field results.
5. Expand only after reviewing performance across crops, regions, connectivity and user abilities.

Potential reach is an **opportunity**, not an achieved number. TerraFarm has no user base or verified agricultural results yet.

### 4. Innovation and technical value

TerraFarm does **not** claim to have invented satellite monitoring, crop rotation or a new data product. Its innovation is a **farmer-centered combination** of complementary information:

- **Global observations + local context:** NASA POWER and SRTM together with local crop sheets, Costa Rican soils, prices, forecasts and hazards, all joined per district.
- **Multi-cycle recommendations:** it evaluates what should follow a crop, not only whether one crop grows somewhere.
- **Explainable decisions:** every score shows its five notes and reasons ("Why this score?"), the date of the data and what is estimated, instead of an opaque number.
- **Honest data handling:** every district is averaged over 5–20 points inside its polygon; NASA temperatures are corrected for altitude; missing values are shown as "No data" instead of being invented; every extraction is logged.
- **Field history:** the farmer's own plantings, results and reports are stored so recommendations can improve over time, and anonymous district totals show what neighbours plant.
- **Low-cost, reusable architecture:** free services and open data, no own server, one command per source, schemas shared between collection and storage, and a design organized by country-independent district codes.

The real test of innovation is not the number of APIs listed. It is whether the system turns **real, traceable data** into understandable and technically reasonable alternatives for a real farmer. The data is now real and traceable; the agronomic accuracy still has to be evaluated with experts and growers.

### 5. Ease of use, accessibility and feasibility

TerraFarm is built for farmers with different levels of digital experience:

- **Large cards and buttons** (at least 44–56 px), large type, short sentences and familiar farm words.
- **No account needed** to explore districts, crops, prices, alerts and courses.
- **Map, list or GPS** to choose a place.
- **Spanish and English**, and light and dark themes.
- **Phone first:** a bottom tab bar on phones, crops 2 per row on phones and 4 per row on computers.
- **Weak signal:** a visible signal indicator, cached pages and an offline queue for pest reports.
- **Clear errors:** forms explain exactly what is wrong and how to fix it.
- **Visible sources:** every price, forecast and photo shows its date, source and author.

**Proposed usability assessment:** invite people of different ages, literacy levels, digital experience and signal quality to complete realistic tasks without help. Measure completion, errors, time, confidence, whether they can tell the source and date of a recommendation, and whether they understand it needs local judgment. Include keyboard, contrast, readability and screen-reader checks, and test on slow mobile networks.

**Practical constraints:**
- Live data needs internet.
- Third-party services can change; for example, the PIMA portal format may change, and the extractor then fails loudly instead of saving wrong data.
- Coarse products cannot describe very small plots.
- Each source updates on its own schedule.
- Personal farm records require the security rules described above.

### Proposed approach to measuring real impact

A credible next step is a **small, consent-based pilot** with farmers and agronomic reviewers:

1. Before giving recommendations, record the crop, field, previous sequence, a baseline soil test where possible, irrigation practices, costs and harvest records.
2. Evaluate whether each suggestion is appropriate and clear.
3. Follow actions and results for at least one full growing cycle, and preferably several for soil and rotation effects.
4. Compare similar crops and conditions while documenting rainfall, input changes, technical assistance and other influences.

A simple before/after change alone cannot prove that TerraFarm caused it.

*No pilot results, certifications, adoption totals, yield improvements or financial savings are claimed in this README.*

---

## Development status and next steps

### Status by area

| Area | Status |
|---|---|
| Web interface (public, private and admin screens, ES/EN, two themes, offline) | ✅ Working |
| Android app (APK) | ✅ Built automatically and downloadable |
| iOS app | 🟡 Builds in Xcode; not published |
| 28-second demo video | ✅ Produced (Remotion) |
| Accounts, roles and personal records in a real database | ✅ Working |
| NASA POWER climate, temperature and soil moisture | ✅ Loaded and updated automatically |
| SRTM terrain and slope | ✅ Loaded |
| Soils, Open-Meteo climate, water balance, heat waves | ✅ Loaded |
| Crop catalog, rotation rules, FAO requirements and suitability | ✅ Loaded |
| Suitability score per district and crop | ✅ Calculated weekly |
| PIMA-CENADA wholesale prices | ✅ Updated daily |
| IMN forecasts and INA courses | ✅ Updated automatically |
| Natural hazards | 🟡 Estimated; official CNE review pending |
| ECOSTRESS, MODIS NDVI | 🟡 Code ready; needs NASA Earthdata credentials |
| CNP prices, agricultural census, protected areas | 🟡 Pending (extractor, file or token) |
| Pest sheets in the database | 🟡 Pending |
| Agronomic validation and real users | ⚪ Not started |

### Next steps

| Priority | Next action | Evidence of completion |
|---|---|---|
| 1. Agronomic review | Review the scoring and rotation rules with MAG/INTA or university agronomists. | Documented test cases with accept/reject reasons, including annual vs. perennial crops. |
| 2. More NASA data | Load ECOSTRESS and MODIS NDVI with Earthdata credentials; evaluate GPM to correct mountain rainfall. | Rows in `agua_zona` and `cobertura_zona`, shown in the district screen with source and date. |
| 3. Missing local data | CNP prices, 2014 agricultural census, protected areas, official CNE hazards, pest sheets table. | Non-empty tables and a price for every crop. |
| 4. More crops | Extend the catalog beyond 13 crops (plantain, banana, chayote, lettuce, broccoli, cocoa…). | Catalog rows, EcoCrop requirements and scores for the new crops. |
| 5. User experience | Test common tasks with growers and improve accessibility. | Documented task results and the changes made from feedback. |
| 6. Impact pilot | Study real decisions and growing-cycle outcomes. | Consent-based baseline, usage logs and clearly delimited findings. |

---

## Local development

**Requirements:** Node.js **22.18 or later** (the extractors run TypeScript directly) and npm.

```bash
npm install                 # install every workspace
cp .env.example .env        # fill in the keys you have (optional: without them the web runs in demo mode)
npm run dev                 # web at http://localhost:5173  (routes like /#/sembrar)
npm run build               # type check + production build into web/dist/
npm run preview             # serve the production build locally
npm run test:extractores    # 100 offline tests
npm run deploy              # build and publish web/dist to the gh-pages branch (GitHub Pages)
```

**Running an extractor:**

```bash
npm run extraer -- clima --simulacion --distritos=CR10101,CR30101   # try without writing to the database
npm run extraer -- aptitud                                         # recalculate the suitability score
```

Recommended order for a fresh database:
`distritos` → `clima-historico`, `temperatura-historica` → `soilgrids` → `cultivos` → `ecocrop`, `gaez` → `terreno` → `capacidad-uso` → `precios-pima` → `amenazas-estimar` → `amenazas` → `aptitud`.

**Environment variables** (`.env.example` lists them; the values are never committed):

| Variable | Used by | Public? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Web (embedded in the site) | Yes — protected by row-level security |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Extractors, demo loader | **No** |
| `SUPABASE_DB_URL` | Migration runner | **No** |
| `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`, `EARTHDATA_TOKEN` | ECOSTRESS / MODIS | **No** |
| `WDPA_API_TOKEN` | Protected areas | **No** |
| `CENSO_EXCEL` | Path to the INEC census Excel file | — |
| `DEMO_ADMIN_CLAVE` | Password of the demo admin account | **No** |

Never put a private key in a `VITE_*` variable: everything with that prefix ends up inside the public site.

**Demo account (farmer):** `agricultor@demo.cr` / `demo1234`, with sample farms, plantings, notes, reports and drone flights. It can be loaded with `node --env-file=.env supabase/demo/cargar-demo.mjs`.

**Android app:** run `android/preparar-web.sh` to copy the built web into the app, then build with Android Studio or Gradle (details in `android/README.md`).

**iOS app:** run `ios/preparar-web.sh` to copy the built web into the app, then open `ios/Terraformes.xcodeproj` in Xcode.

**Demo video:** `cd video && npm install && npm run dev` opens Remotion Studio; `npm run render` produces the MP4 (script and timing in `docs/video/guion.md`).

**More documentation:** `docs/migraciones.md` (database migrations), `docs/temas-2-y-10.md` (soil moisture and compatibility), `docs/temas-3-5-8-9.md` (prices, crops, hazards, terrain and suitability), `docs/fenomenos-naturales.md` (IMN and CNE), `docs/temperatura-termica.md` (altitude correction and heat waves), `docs/capacitacion/` (INA courses), `docs/contexto-web.md` (web design rules).

---

## Team

**Terraformers**

| Member |
|---|
| Poll Garro Vargas |
| Angelo Castro Piedra |
| Hector Leiva Gamboa |
| Brandon Rivera Hidalgo |
| Santiago Portuguez Henández |
| Kenni González Blandón |

Names should be checked against the team registration before submission.

---

## Declaration of Super Intelligence (SI) / AI assistance

The team used AI assistants during development and documentation: **Claude (including Claude Code, by Anthropic), Codex, Gemini, GitHub Copilot and ChatGPT**.

**Confirmed uses in this repository:**

- **Claude Code** was used to write and review a large part of the code, together with the team members who requested, tested and accepted each change:
  - web screens, styles and translations;
  - the Supabase migrations and security rules;
  - the data extractors (prices, crops, terrain, hazards, suitability);
  - the loading of real data into the database;
  - the automated tests and technical documentation;
  - this README.
- **GitHub Copilot** appears as co-author of some commits (for example the full-width layout and alerts redesign).
- **ChatGPT** helped with an earlier English version of the project story and the impact assessment, which this README reuses and updates.

**What the team remains responsible for:**

- The team decided what to build, ran and checked the results (including screenshots of every screen and database row counts), and approved every commit.
- AI-generated text and code are not a substitute for NASA data, government statistics or agronomic verification.
- **All the data shown in TerraFarm comes from the sources listed above, not from an AI model.**
- The crop and pest photos are real photographs from Wikimedia Commons, not AI-generated images.
- **Demo video:** its music and sound effects are generated, and the video carries a visible **"AI-assisted" watermark**. The voice-over is a real voice recorded with a phone, cleaned with audio filters (`video/scripts/voz.mjs`).

**Disclosure checklist for the 2026 submission:**

- **Text / documentation:** AI-assisted writing is acknowledged here and in the submission notes.
- **Code and data:** AI-assisted code is acknowledged in this section; the team reviewed it and the automated tests pass. No test or review is claimed that did not happen.
- **Images and video:** the team must add a visible "AI-generated" watermark to any SI-generated image or video used in the presentation, and must not put NASA logos, flags or mission identifiers in generated assets.
- **Audio:** if any is SI-generated, disclose it in the description and metadata.
- **Form:** select every SI-use category that actually applies; do not select "I did not use SI".

---

## References

### Competition and scientific context

- [NASA Space Apps Challenge 2026: Field Shift](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/) — challenge goal and intended use of NASA data.
- [NASA POWER — Parameters](https://power.larc.nasa.gov/parameters/) and [Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) — meteorological and soil-wetness data used by TerraFarm.
- [SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm) and [OpenTopoData](https://www.opentopodata.org/) — terrain data used by TerraFarm.
- [ECOSTRESS](https://ecostress.jpl.nasa.gov/data), [MODIS MOD13Q1](https://lpdaac.usgs.gov/products/mod13q1v061/), [GPM](https://gpm.nasa.gov/data), [SMAP L4](https://nsidc.org/data/spl4smgp/versions/8) — NASA products researched or prepared for the next stage.
- [FAO EcoCrop database (OpenCLIM copy)](https://github.com/OpenCLIM/ecocrop) and [FAO GAEZ v4](https://gaez.fao.org/) — crop requirements and suitability.
- [SoilGrids / ISRIC](https://soilgrids.org/) — modeled soil properties.
- [Open-Meteo](https://open-meteo.com/) — weather, soil moisture and elevation APIs.
- [USDA-NRCS Conservation Crop Rotation Standard](https://www.nrcs.usda.gov/sites/default/files/2022-09/Conservation_Crop_Rotation_328_CPS.pdf) — agronomic basis and limits of rotation practices.

### Costa Rican context

- [INEC: Agricultural Census 2014](https://admin.inec.cr/en/node/39763) — holdings, area and land use (2014 baseline).
- [INEC: crop-producing holdings 2014](https://admin.inec.cr/noticias/resultados-generales-del-censo-agropecuario) — 78,408 holdings growing at least one crop.
- [INEC: ENA 2025 crops](https://admin.inec.cr/noticias/papa-cebolla-representan-el-804-del-area-sembrada-entre-las-hortalizas-investigadas) — planted area and production of selected crops.
- [MAG: recovery after the 2024 rains](https://mag.go.cr/gobierno-destina-%E2%82%A15-500-millones-para-reactivar-produccion-de-23-958-productores-afectados-por-lluvias-de-2024/) — announcement of March 25, 2026.
- [INEC: ENAHO 2025](https://admin.inec.cr/en/node/56794) — household poverty in 2025 (not farmer-specific).
- [PIMA-CENADA daily price bulletin](https://www.pima.go.cr/boletin/) and [PIMA-SIMM](https://www.pima.go.cr/simm/) — wholesale prices used by TerraFarm.
- [IMN subseasonal forecast](https://www.imn.ac.cr/pronostico-subestacional) — forecasts used by TerraFarm.
- [CNE](https://www.cne.go.cr/), [CNP](https://www.cnp.go.cr/), [INA](https://www.ina.ac.cr/), OVSICORI-UNA — alerts, prices, courses and volcano monitoring.
- [HDX — Costa Rica administrative boundaries](https://data.humdata.org/) — the 492 districts.
- [Wikimedia Commons](https://commons.wikimedia.org/) — photos under free licenses; authors credited in the app.

**Evidence policy:** these sources support the background and the method. They do not certify that every TerraFarm module is agronomically correct or that the project has produced field-level benefits.

---

## Live deployment

<h1 align="center">
  🌱 <a href="https://magiant.github.io/NASA-Space-APPs---Terraformers/">magiant.github.io/NASA-Space-APPs---Terraformers</a>
</h1>

<h2 align="center">
  👉 <a href="https://magiant.github.io/NASA-Space-APPs---Terraformers/">OPEN TERRAFARM</a> 👈
</h2>

<p align="center"><b>https://magiant.github.io/NASA-Space-APPs---Terraformers/</b></p>

<h3 align="center">
  📱 <a href="https://github.com/Magiant/NASA-Space-APPs---Terraformers/releases/download/app-android/TerraFarm.apk">Download the Android app (APK)</a>
</h3>
