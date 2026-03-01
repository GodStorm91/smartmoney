# Financial Environment Comparison API Research

**Date:** 2026-02-13
**Purpose:** Research available APIs/data sources for building municipal/regional financial comparison feature

---

## Executive Summary

Research identifies multiple viable data sources for financial environment comparison:

**Japan-specific:** e-Stat API, RESAS API (ending March 2025), Digital Agency Dashboard, prefecture-level economic data
**Global:** Numbeo API (paid), Teleport API (free with key), World Bank ICP PPP data
**Address geocoding:** Geolonia, Jageocoder (both free, Japan-specific)

**Key challenge:** RESAS API service ends March 24, 2025 — new registrations stopped. Must rely on e-Stat + prefecture-level dashboards.

---

## 1. Japan-Focused Data Sources

### 1.1 e-Stat API (Government Statistics Portal)

**Status:** ✅ Free, active, requires API key
**URL:** https://www.e-stat.go.jp/api/en
**Documentation:** https://www.e-stat.go.jp/api/en/api-dev/how_to_use

**Authentication:**
- Register account → obtain Application ID (max 3 per user)
- Pass AppID as query parameter in API requests
- No OAuth, simple REST endpoints

**Data formats:** XML, JSON, CSV
**Rate limits:** Max 100,000 records per request (pagination via NEXT_KEY)

**Available data categories:**
- Taxation statistics (municipal/prefectural tax data)
- Population/demographics (System of Social and Demographic Statistics - SSDS)
- Housing & rent (Rented Houses Monthly Rent 1983-2023)
- Family income/expenditure by prefecture/municipality
- Consumer expenditure surveys
- Regional economic indicators

**Key datasets:**
- Municipal tax rates (inhabitant tax: 10% flat, fixed asset tax: ~1.4%, city planning tax: ~0.3%)
- Rental housing costs by city
- Utility charges (common service fees)
- Population/household statistics by municipality
- Gross prefectural product, prefectural income

**Limitations:**
- Data lag: ~2 years for economic accounts
- Subregion/mesh data not always available via API
- Need to navigate classification codes for specific stats

**References:**
- [e-Stat Portal](https://www.e-stat.go.jp/en)
- [e-Stat API Overview](https://www.e-stat.go.jp/api/en)
- [How to Use API](https://www.e-stat.go.jp/api/en/api-dev/how_to_use)
- [Database Search](https://www.e-stat.go.jp/en/stat-search/database)

---

### 1.2 RESAS API (Regional Economy Society Analysis System)

**Status:** ⚠️ **SERVICE ENDING MARCH 24, 2025** — new registrations stopped
**URL:** https://opendata.resas-portal.go.jp/
**Documentation:** https://opendata.resas-portal.go.jp/docs/api/v1/index.html

**Authentication:**
- Required X-API-KEY header (40-character key)
- Registration requires email, name, password, terms agreement
- Returns 403 Forbidden if key missing

**Data categories (while active):**
- Population/households
- Companies/economy
- Labor/wages
- Tourism
- Manufacturing industry data
- Regional economic flow (people, goods, money)

**Endpoints example:**
- `/municipality/manufacture/perYear` — industry data by municipality
- Requires: year, prefecture code, city code, industry classification

**Limitations:**
- Service shutdown imminent
- Cannot rely on for new feature development
- Existing users may have access until March 2025

**References:**
- [RESAS Portal](https://resas.go.jp/)
- [RESAS API Documentation](https://opendata.resas-portal.go.jp/docs/api/v1/index.html)
- [jpstat R package](https://uchidamizuki.github.io/jpstat/) (wrapper for e-Stat/RESAS)

---

### 1.3 Digital Agency Dashboard (Prefecture-level)

**Status:** ✅ Active, web-based (API not specified)
**URL:** https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-prefecture

**Data coverage:**
- ~700 indicators organized in 7 major, 62 minor categories
- Economy, finance, population, livelihood by prefecture
- Local public administration/finance: funds, expenditures, revenues
- Side-by-side regional comparison
- Bulk download by indicator, prefecture, time period

**Municipality-level dashboard:**
https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-municipality
~300 indicators in 7 categories

**Use case:**
- Manual data downloads for seeding database
- May have API endpoints (not documented in search results)
- Good for initial dataset creation

**References:**
- [Prefecture Dashboard](https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-prefecture)
- [Municipality Dashboard](https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-municipality)

---

### 1.4 DATA.GO.JP / e-Gov Data Portal

**Status:** ✅ Active, open data catalog
**URL:** https://data.e-gov.go.jp/info/en

**Coverage:**
- Cross-sectional search of open data from administrative agencies
- Categories: white papers, geo-spatial, movement of people, disaster, budget/procurement
- Links to e-Stat and other government data sources

**Use case:**
- Discover additional municipal financial datasets
- Supplement e-Stat API data

**References:**
- [e-Gov Data Portal](https://data.e-gov.go.jp/info/en)

---

### 1.5 Tokyo Open Data (Example: Regional Portal)

**Status:** ✅ Active, Tokyo Metropolitan Government
**URL:** https://dateno.io/registry/catalog/cdi00004912/

**Coverage:**
- Tokyo-specific datasets
- Open catalog with API access
- Other prefectures/cities may have similar portals

**Use case:**
- Supplement national data with city-specific granularity
- Example for other major cities (Osaka, Nagoya, etc.)

**References:**
- [Tokyo Open Data](https://dateno.io/registry/catalog/cdi00004912/)

---

## 2. Global/General Data Sources

### 2.1 Numbeo API

**Status:** ✅ Active, **PAID** (premium API)
**URL:** https://www.numbeo.com/common/api.jsp
**Documentation:** https://www.numbeo.com/api/doc.jsp

**Data coverage:**
- Cost of living (groceries, rent, utilities, transportation, etc.)
- Property prices
- Crime rates
- Quality of life indices
- Healthcare quality
- Traffic/pollution
- 9,274+ cities, 197 countries
- Historical/archived data available

**Pricing:**
- Premium API subscription required
- Specific 2026 pricing not found (check website directly)
- Free tier: web-based access only

**Data points:**
- Groceries index
- Rent index
- Purchasing power index
- Restaurant prices
- Local purchasing power
- Individual item prices (52 products/services)

**References:**
- [Numbeo API](https://www.numbeo.com/common/api.jsp)
- [API Documentation](https://www.numbeo.com/api/doc.jsp)
- [Cost of Living Rankings](https://www.numbeo.com/cost-of-living/rankings_by_country.jsp)

---

### 2.2 Teleport API

**Status:** ✅ Free with API key
**URL:** https://publicapis.io/teleport-api
**Type:** Open data platform

**Data coverage:**
- City intelligence (housing costs, population density)
- Salary data (quantiles, city/country metrics)
- Cost of living metrics
- Thousands of cities worldwide

**Authentication:**
- Sign up for API key
- RESTful endpoints

**Use case:**
- Free alternative to Numbeo
- Good for global city comparison
- Salary benchmarking

**References:**
- [Teleport API](https://publicapis.io/teleport-api)
- [Codate Project](https://github.com/mmsesay/codate) (example app using Teleport)

---

### 2.3 World Bank API (PPP & ICP)

**Status:** ✅ Free, official
**URL:** https://data.worldbank.org/indicator/PA.NUS.PPP
**Program:** International Comparison Program (ICP)

**Data coverage:**
- Purchasing Power Parity (PPP) conversion factors
- GDP comparisons (PPP-adjusted)
- Private consumption PPP
- Actual individual consumption PPP
- Updated exchange rates
- Global country coverage

**Use case:**
- Cross-country cost of living baseline
- PPP-adjusted income comparisons
- Supplement city-level APIs with national PPP context

**Access:**
- World Bank DataBank ICP Datahub
- World Development Indicators (WDI) annual PPP data
- PPP Calculator (API-based): https://pppcalculator.pro/

**References:**
- [World Bank PPP Data](https://data.worldbank.org/indicator/PA.NUS.PPP)
- [International Comparison Program](https://www.worldbank.org/en/programs/icp)
- [ICP PPP Uses](https://www.worldbank.org/en/programs/icp/brief/VC_Uses)

---

### 2.4 Alternative Cost of Living APIs

**Expatistan:**
- URL: https://www.expatistan.com/cost-of-living
- Status: Web-based, no public API found
- Data: 52 products/services, city/country comparison
- Use: Manual data reference only

**Livingcost.org:**
- Similar to Numbeo/Expatistan
- 9,274 cities, 197 countries
- No API documented

**Humuch:**
- More granular (suburb-by-suburb)
- No API documented

**References:**
- [Expatistan](https://www.expatistan.com/cost-of-living)
- [5 Alternatives to Expatistan](https://www.similarsitesearch.com/sites/expatistan/)

---

## 3. Open Source APIs/Projects

### 3.1 GitHub: zackharley/cost-of-living-api

**Status:** ✅ Open source (self-hosted)
**URL:** https://github.com/zackharley/cost-of-living-api

**Tech:** Node.js API for cost of living by city
**Use case:** Self-hosted alternative, can customize/extend

**References:**
- [zackharley/cost-of-living-api](https://github.com/zackharley/cost-of-living-api)

---

### 3.2 GitHub: Phernando82/api_cost_of_living

**Status:** ✅ Unofficial Numbeo scraper
**URL:** https://github.com/Phernando82/api_cost_of_living

**Tech:** Scrapes Numbeo data
**Use case:** Free Numbeo data access (check ToS compliance)

**References:**
- [Phernando82/api_cost_of_living](https://github.com/Phernando82/api_cost_of_living)

---

### 3.3 RapidAPI: Cities Cost of Living

**Status:** ✅ Third-party API marketplace
**URL:** https://rapidapi.com/ditno-ditno-default/api/cities-cost-of-living1/details

**Coverage:** Groceries, purchasing power, rent indices, item prices
**Pricing:** Check RapidAPI (likely freemium)

**References:**
- [Cities Cost of Living API](https://rapidapi.com/ditno-ditno-default/api/cities-cost-of-living1/details)

---

### 3.4 Japan-Specific Scrapers (GitHub)

**aibazhang/rent-scraping-jp:**
- URL: https://github.com/aibazhang/rent-scraping-jp
- Japanese rent scraper/analyzer
- Scripts for crawling rent info from Japanese sites

**Ethan-Ming/JapanRent_insight:**
- URL: https://github.com/Ethan-Ming/JapanRent_insight
- WebUI for rent/geo relationship in Japan
- Real-time rent & transit info
- Rent statistics: median, quartiles, IQR
- Prefecture filtering

**uploadtigris/Japan_V_USA_Web_Scraper:**
- URL: https://github.com/uploadtigris/Japan_V_USA_Web_Scraper
- Japan vs USA cost of living comparison

**References:**
- [rent-scraping-jp](https://github.com/aibazhang/rent-scraping-jp)
- [JapanRent_insight](https://github.com/Ethan-Ming/JapanRent_insight)
- [Japan_V_USA_Web_Scraper](https://github.com/uploadtigris/Japan_V_USA_Web_Scraper)

---

## 4. Address Geocoding (Japan)

### 4.1 Geolonia Community Geocoder

**Status:** ✅ Free, open source
**URL:** https://github.com/geolonia/community-geocoder

**Coverage:**
- Japanese addresses → lat/lon
- Uses Ministry of Land, Infrastructure, Transport, Tourism position reference
- Free GeoCoding API

**Use case:**
- Convert user address input to municipality code
- Link to e-Stat/RESAS municipal data

**References:**
- [Geolonia Community Geocoder](https://github.com/geolonia/community-geocoder)

---

### 4.2 Jageocoder

**Status:** ✅ Free, open source (Python)
**URL:** https://github.com/t-sagara/jageocoder
**Documentation:** https://t-sagara.github.io/jageocoder/en/

**Tech:**
- Python library (MIT license)
- Port of CSIS DAMS (University of Tokyo)
- Forward & reverse geocoding
- Offline + online modes

**Use case:**
- Embed in backend for address → municipality mapping
- No external API dependency (offline mode)

**References:**
- [Jageocoder GitHub](https://github.com/t-sagara/jageocoder)
- [Jageocoder Docs](https://t-sagara.github.io/jageocoder/en/)

---

### 4.3 General Geocoding APIs (Japan support)

**Mapbox Geocoding API:**
- URL: https://docs.mapbox.com/api/search/geocoding/
- Supports Japanese addresses
- Paid (free tier available)

**Geocode.maps.co:**
- URL: https://geocode.maps.co/
- Free geocoding API
- Japan support

**LocationIQ:**
- URL: https://locationiq.com/
- Free/paid tiers
- Reverse geocoding

**References:**
- [Mapbox Geocoding](https://docs.mapbox.com/api/search/geocoding/)
- [Geocode.maps.co](https://geocode.maps.co/)
- [LocationIQ](https://locationiq.com/)

---

## 5. Data Points Available

### Japan (e-Stat + Digital Agency)

**Tax rates:**
- Municipal inhabitant tax: 10% flat (prefecture + municipality)
- Fixed asset tax: 1.4% (varies by prefecture)
- City planning tax: 0.3% (designated urban planning areas)

**Housing:**
- Average rent by city (1983-2023 historical data)
- Utility/common service charges
- Residential property prices (e-Stat datasets)

**Income/expenditure:**
- Family income/expenditure by prefecture/municipality
- Consumer expenditure surveys
- Gross prefectural product
- Prefectural income, annual increase rates

**Demographics:**
- Population by municipality
- Household statistics
- Internal migration data

**Economy:**
- Industry data (manufacturing, tourism, agriculture)
- Labor/wages (limited by RESAS shutdown)
- Economic complexity by prefecture

**Limitations:**
- Municipality-level data less granular than prefecture-level
- ~2 year lag for economic accounts
- Real-time data not available (annual/quarterly updates)

---

### Global (Numbeo, Teleport, World Bank)

**Cost of living indices:**
- Groceries index
- Rent index
- Restaurant prices index
- Purchasing power index
- Local purchasing power

**Specific items (Numbeo: 52 products/services):**
- Grocery prices (milk, bread, eggs, etc.)
- Restaurant meal prices
- Transportation costs (taxi, public transit)
- Utility costs (electricity, water, internet)
- Rent (1-bedroom, 3-bedroom, city center vs. outside)
- Average salaries by city/region

**Quality of life:**
- Healthcare quality
- Crime rates
- Traffic/pollution
- Climate data

**PPP (World Bank):**
- PPP conversion factors (LCU per international $)
- GDP (PPP) per capita
- Private consumption PPP

---

## 6. Free vs Paid Summary

### ✅ Free APIs

| Source | Type | Coverage | Limitations |
|--------|------|----------|-------------|
| **e-Stat API** | Japan gov stats | Municipality/prefecture tax, rent, income, demographics | 2yr lag, classification codes complex |
| **Digital Agency Dashboard** | Japan gov data | 700 indicators (prefecture), 300 (municipality) | Web-based, API unclear |
| **Teleport API** | Global cities | Cost of living, salaries, 1000s cities | Requires API key signup |
| **World Bank ICP** | Global countries | PPP, GDP comparisons | National-level, not city-level |
| **Geolonia Geocoder** | Japan address | Address → lat/lon, municipality | Japan only |
| **Jageocoder** | Japan address | Python lib, offline geocoding | Requires local setup |
| **zackharley/cost-of-living-api** | Self-hosted | City cost of living | Self-hosted infrastructure |

### 💰 Paid APIs

| Source | Type | Coverage | Pricing |
|--------|------|----------|---------|
| **Numbeo API** | Global cities | 9,274 cities, 52 items, historical data | Premium subscription (check website) |
| **RapidAPI: Cities Cost of Living** | Global cities | Rent, groceries, PPP indices | Freemium (check RapidAPI) |
| **Mapbox Geocoding** | Global addresses | Japan support | Free tier + paid |

### ⚠️ Service Ending

| Source | Type | Status |
|--------|------|--------|
| **RESAS API** | Japan regional economy | Ends March 24, 2025 |

---

## 7. Recommended Architecture

### Phase 1: Japan Focus (MVP)

**User input:** Address/city name
**Geocoding:** Geolonia or Jageocoder → municipality code
**Data source:** e-Stat API
**Metrics:**
- Municipal tax rates (inhabitant, fixed asset, city planning)
- Average rent (city-level)
- Population demographics
- Prefectural income/expenditure

**Why:**
- Free, official government data
- Reliable, accurate
- Japan-centric aligns with app's ja locale support

**Challenges:**
- API complexity (classification codes)
- Data lag (~2 years for some metrics)
- Need to cache/seed database (not real-time)

---

### Phase 2: Global Expansion

**Add:** Teleport API (free) or Numbeo API (paid)
**Metrics:**
- Cost of living indices (groceries, rent, transportation)
- Salary data
- Quality of life scores

**Why:**
- Extend to non-Japan users
- Richer global city comparison
- Teleport free tier minimizes cost

**Challenges:**
- Mixing Japan (e-Stat) + Global (Teleport/Numbeo) data
- Different data structures/granularity
- Currency conversion, PPP adjustments

---

### Phase 3: Enhanced Financial Context

**Add:** World Bank PPP data
**Use case:**
- Cross-country purchasing power comparisons
- Adjust salaries/costs by PPP for "real" cost of living
- National-level economic context

**Add:** Prefecture/municipality dashboards (manual seeding)
**Use case:**
- Supplement e-Stat with granular indicators
- Bulk download 700 prefecture, 300 municipality indicators
- Periodic updates (quarterly/annual)

---

## 8. Data Workflow Example

1. **User enters address:** "東京都渋谷区渋谷1-1-1"
2. **Geocode (Geolonia/Jageocoder):**
   - Returns: `prefecture_code: 13`, `municipality_code: 13113` (Shibuya-ku)
3. **Fetch e-Stat data:**
   - Tax rates: inhabitant 10%, fixed asset 1.4%, city planning 0.3%
   - Avg rent: query "Rented Houses Monthly Rent" dataset → filter by city code
   - Income: Family Income/Expenditure Survey → Shibuya-ku or Tokyo prefecture
4. **Display comparison:**
   - Show user: "Shibuya-ku vs. National avg"
   - Tax burden: % vs. avg
   - Rent: ¥XXX vs. ¥YYY
   - Cost of living index (if using Numbeo/Teleport)
5. **Optional:** Compare multiple municipalities side-by-side

---

## 9. Technical Considerations

### Caching Strategy

**e-Stat data:**
- Annual/quarterly updates → cache aggressively
- TTL: 30-90 days for municipal tax/rent data
- On-demand API calls for rare municipalities
- Pre-seed database for top 100 cities (Tokyo 23 wards, major cities)

**Geocoding:**
- Cache address → municipality_code mappings
- Use offline Jageocoder to avoid API rate limits

**Global APIs (Teleport/Numbeo):**
- Cache city data (daily updates sufficient)
- Monitor API rate limits

### Data Normalization

**Challenge:** e-Stat (Japanese gov) + Teleport (global) have different schemas
**Solution:**
- Define internal schema: `municipality_id`, `country_code`, `tax_rate`, `avg_rent`, `cost_of_living_index`
- ETL pipelines to normalize e-Stat (XML/JSON) + Teleport (JSON)
- Store in unified Postgres table

### Error Handling

**Geocoding failures:**
- Fuzzy matching for Japanese addresses (kanji variations)
- Fallback to prefecture-level if municipality not found

**Missing data:**
- Not all municipalities in e-Stat datasets
- Show "Data unavailable for [metric]" gracefully
- Suggest nearby municipalities with data

### API Rate Limits

**e-Stat:**
- 100,000 records/request
- No explicit rate limit found (fair use policy)

**Teleport:**
- Free tier: check documentation for limits
- Implement request throttling

**Geolonia/Jageocoder:**
- Self-hosted or community-hosted → no limits (respect ToS)

---

## 10. Unresolved Questions

1. **e-Stat API rate limits:** Official docs don't specify requests/hour or daily caps — test in development.

2. **RESAS alternative:** With RESAS API ending March 2025, is there a replacement for regional labor/wage data? Check e-Stat labor force surveys.

3. **Real-time tax data:** e-Stat has ~2yr lag for some economic data — can city portals (Tokyo Open Data) provide more current tax rates?

4. **Numbeo API pricing:** Search didn't return 2026 pricing — contact Numbeo sales for quote.

5. **Teleport API coverage in Japan:** Does Teleport have comprehensive Japan city coverage, or primarily Tokyo/Osaka? Verify via API exploration.

6. **Municipal boundaries:** How to handle city mergers (e.g., Heisei consolidations)? e-Stat may use updated municipality codes — need historical mapping.

7. **Multi-language support:** e-Stat data labels in Japanese — need translation layer for en/vi locales. Use i18n keys or Google Translate API?

8. **Currency exchange:** If displaying global data (Teleport/Numbeo), need real-time exchange rates? Use existing currency service in app or add forex API.

9. **User privacy:** If storing user addresses for geocoding, ensure GDPR/local privacy compliance (anonymize, consent).

10. **Data licensing:** Confirm e-Stat, Geolonia, Jageocoder licenses allow commercial use in personal finance app.

---

## 11. Next Steps

1. **Test e-Stat API:**
   - Register for Application ID
   - Query tax, rent, income datasets for Tokyo/Osaka
   - Assess data quality, response times, documentation clarity

2. **Evaluate Teleport API:**
   - Sign up for API key
   - Test Japan city coverage (Tokyo, Kyoto, Fukuoka, etc.)
   - Compare cost of living indices vs. Numbeo (web)

3. **Geocoding POC:**
   - Test Geolonia API with sample addresses
   - Or install Jageocoder Python library, test offline geocoding
   - Measure accuracy for common Japanese address formats

4. **Define MVP scope:**
   - Decide: Japan-only or global?
   - Prioritize metrics: tax rates, rent, income — which matters most?
   - Design UI: single city view vs. comparison table

5. **Database schema:**
   - Design tables: `municipalities`, `cost_of_living_metrics`, `tax_rates`
   - ETL pipeline for e-Stat data ingestion

6. **Prototype:**
   - Build simple endpoint: `POST /api/compare-location { "address": "..." }`
   - Return: municipality name, tax rates, avg rent, comparison vs. national avg

7. **Monitor RESAS shutdown:**
   - If RESAS still accessible before March 2025, archive critical datasets
   - Migrate to e-Stat equivalents

---

## Sources

### Japan Data Sources
- [e-Stat Portal](https://www.e-stat.go.jp/en)
- [e-Stat API](https://www.e-stat.go.jp/api/en)
- [e-Stat API How to Use](https://www.e-stat.go.jp/api/en/api-dev/how_to_use)
- [e-Stat Database](https://www.e-stat.go.jp/en/stat-search/database)
- [RESAS Portal](https://resas.go.jp/)
- [RESAS API Documentation](https://opendata.resas-portal.go.jp/docs/api/v1/index.html)
- [Digital Agency Prefecture Dashboard](https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-prefecture)
- [Digital Agency Municipality Dashboard](https://www.digital.go.jp/en/resources/japandashboard/economy-fiscal-living-municipality)
- [e-Gov Data Portal](https://data.e-gov.go.jp/info/en)
- [Tokyo Open Data](https://dateno.io/registry/catalog/cdi00004912/)
- [Statistics Bureau Japan](https://www.stat.go.jp/english/)
- [jpstat R package](https://uchidamizuki.github.io/jpstat/)

### Global Data Sources
- [Numbeo API](https://www.numbeo.com/common/api.jsp)
- [Numbeo API Documentation](https://www.numbeo.com/api/doc.jsp)
- [Teleport API](https://publicapis.io/teleport-api)
- [World Bank PPP Data](https://data.worldbank.org/indicator/PA.NUS.PPP)
- [World Bank ICP](https://www.worldbank.org/en/programs/icp)
- [Expatistan](https://www.expatistan.com/cost-of-living)

### Open Source Projects
- [zackharley/cost-of-living-api](https://github.com/zackharley/cost-of-living-api)
- [Phernando82/api_cost_of_living](https://github.com/Phernando82/api_cost_of_living)
- [aibazhang/rent-scraping-jp](https://github.com/aibazhang/rent-scraping-jp)
- [Ethan-Ming/JapanRent_insight](https://github.com/Ethan-Ming/JapanRent_insight)
- [uploadtigris/Japan_V_USA_Web_Scraper](https://github.com/uploadtigris/Japan_V_USA_Web_Scraper)
- [Firefly III](https://github.com/firefly-iii/firefly-iii)
- [Actual Budget](https://github.com/actualbudget/actual)
- [Maybe Finance](https://github.com/maybe-finance/maybe)

### Geocoding
- [Geolonia Community Geocoder](https://github.com/geolonia/community-geocoder)
- [Jageocoder](https://github.com/t-sagara/jageocoder)
- [Jageocoder Documentation](https://t-sagara.github.io/jageocoder/en/)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Geocode.maps.co](https://geocode.maps.co/)
- [LocationIQ](https://locationiq.com/)

### Additional APIs
- [RapidAPI: Cities Cost of Living](https://rapidapi.com/ditno-ditno-default/api/cities-cost-of-living1/details)
- [World Cost of Living API (Zyla)](https://zylalabs.com/api-marketplace/data/world+cost+of+living+api/3440)
- [TravelTables API](https://api.traveltables.com/)
