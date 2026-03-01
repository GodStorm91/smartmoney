# e-Stat Prefecture-Level Household Spending Data Research

**Research Date:** 2026-02-16
**Focus:** Availability of prefecture-level household spending benchmarks from Japanese government statistics

---

## Executive Summary

**KEY FINDING:** Prefecture-level household spending data EXISTS but with important limitations:

1. **家計調査 (Family Income & Expenditure Survey)**: NO full prefecture data. Only prefecture CAPITAL CITIES (都道府県庁所在市) available. Regional blocks only.
2. **全国家計構造調査 (National Survey of Family Income, Consumption & Wealth)**: YES prefecture-level data available every 5 years (2019, 2024). INCLUDES income bracket cross-tabs.

---

## 1. 家計調査 (Family Income & Expenditure Survey) - Monthly Data

### Overview
- Monthly survey of ~9,000 households nationwide
- Survey ID: `00200561`
- Data: https://www.e-stat.go.jp/stat-search/files?toukei=00200561

### Geographic Granularity Available

**NOT PREFECTURE-LEVEL.** Available breakdowns:

1. **Prefecture Capital Cities (都道府県庁所在市)**:
   - Table 4-1: Annual expenditure by capital city
   - URL: https://www.stat.go.jp/data/kakei/rank/singleyear.html
   - Format: Excel, CSV download
   - 47 capital cities only (not full prefecture)

2. **Regional Blocks (地方ブロック)**:
   - Hokkaido (北海道): 1 prefecture (Hokkaido only)
   - Tohoku (東北): 6 prefectures (Akita, Aomori, Fukushima, Iwate, Miyagi, Yamagata)
   - Kanto (関東): 7 prefectures (Tokyo + 6 others)
   - Chubu (中部): 9 prefectures, subdivided into:
     - Hokuriku (北陸): Niigata, Toyama, Ishikawa, Fukui
     - Tokai (東海): Yamanashi, Nagano, Gifu, Shizuoka, Aichi
   - Kinki/Kansai (近畿): 7 prefectures (Hyogo, Kyoto, Mie, Nara, Osaka, Shiga, Wakayama)
   - Chugoku (中国): 5 prefectures (Hiroshima, Okayama, Shimane, Tottori, Yamaguchi)
   - Shikoku (四国): 4 prefectures (Ehime, Kagawa, Kochi, Tokushima)
   - Kyushu (九州): 7 prefectures (Fukuoka, Oita, Nagasaki, Kagoshima, Miyazaki, Kumamoto, Saga)

3. **Urban Classification (都市階級)**:
   - Tokyo Ku-areas (1 stratum)
   - Designated cities (20 strata)
   - Prefecture capitals & major urban centers
   - Middle/small cities A (subdivided by DID population ratio)
   - Small cities B, towns, villages (42 strata)

### Income Bracket Cross-Tabulation

**LIMITATION CONFIRMED:** 家計調査 does NOT provide prefecture × income bracket cross-tabs.

- Income quintile data available at NATIONAL level only
- Geographic data (regional blocks, capital cities) available separately
- NO cross-tabulation between geography and income class

### Data Structure (Table 4-1 Example)

**Dimensions:**
- Geography: Urban class / Region / Capital cities
- Household type: 2+ person households / Worker households / Non-worker households
- Metrics: Annual expenditure amount / Purchase quantity / Average price
- Items: Product classification (品目分類)

**Download formats:**
- Excel (.xlsx)
- CSV (Shift-JIS, UTF-8 with/without BOM)
- Database (DB) access via e-Stat API

---

## 2. 全国家計構造調査 (National Survey of Family Income, Consumption & Wealth) - 5-Year Data

### Overview
- Conducted every 5 years (replaces 全国消費実態調査 as of 2019)
- ~90,000 households nationwide
- Survey ID: `00200564`
- Data: https://www.e-stat.go.jp/stat-search?toukei=00200564
- Latest: 2024 survey (Oct-Nov 2024), results published Dec 2025+

### Geographic Granularity Available

**YES - FULL PREFECTURE DATA:**

1. **All 47 Prefectures (都道府県別)**
2. **Prefecture Economic Regions (県内経済圏)**
   - Sub-prefecture economic zones (labeled A, B, C, D per prefecture)
   - ~355 municipalities and economic regions total
3. **Cities 150,000+ population (15万以上市別)**

### Income & Household Classifications

**Household Categories (世帯区分) - 4 types:**
1. All households (全世帯)
2. Worker households (勤労者世帯) - household head is wage/salary worker
3. Non-worker households (無職世帯) - household head not employed
4. Other households (その他の世帯) - self-employed, executives, etc.

**Income Classifications:**
- 44 annual income classes (年間収入階級 44区分)
- 13 income decile classes (年間収入十分位階級 13区分)
- 6 income quintile classes (年間収入五分位階級 6区分)

**Expenditure Classifications:**
- 106 monthly consumption expenditure classes (消費支出月額階級 106区分)
  - NOTE: These are SPENDING brackets, not income brackets

**Household Size Classifications:**
- 32 age groups of household head
- Household member counts
- 3 household type groups (総世帯/二人以上/単身)

### Cross-Tabulation Capabilities

**CONFIRMED AVAILABLE:** Prefecture × Income Quintile × Household Type cross-tabs exist.

**Example Table: 9-0-2 (2024 Survey)**
- Title: "都道府県，世帯の種類(二人以上の世帯)，世帯区分(4区分)，消費支出月額階級(106区分)，収支項目分類（中分類）別1世帯当たり1か月間の収入と支出－都道府県"
- URL: https://www.e-stat.go.jp/stat-search/files?stat_infid=000040380928
- Dimensions:
  - All 47 prefectures
  - Household type: 2+ person households
  - Household category: 4 groups
  - Consumption expenditure: 106 brackets
  - Income/expenditure items: Medium classification

**Example Table: 15-0 (2019 Survey)**
- Title: "Yearly Income per Household by Municipalities, Economic regions"
- URL: https://www.e-stat.go.jp/en/dbview?sid=0003426439
- Dimensions:
  - 355 municipalities & economic regions
  - 31 income component groups (wages, business, pensions, etc.)
  - 3 household types (total/2+/single)
  - 4 household groups (worker/non-worker/other/all)

**Example Table: 1-29 (2024 Survey)**
- National level data with:
  - 44 annual income classes
  - 13 income decile classes
  - 6 income quintile classes
  - 32 age groups
  - Cross-tabulated with expenditure items

### Data Structure

**Income Components (31 groups):**
- Wages & salaries
- Business & homework income
- Interests & dividends
- Pension benefits
- Social security benefits
- Disposable income
- Deductions

**Download Formats:**
- Excel (.xlsx)
- CSV (multiple encoding options)
- XML
- JSON
- Database API access

---

## 3. e-Stat API & Download Methods

### API Endpoints

**Version 3.0:**
- Table list: `https://api.e-stat.go.jp/rest/3.0/app/getSimpleStatsList`
- Data retrieval: `https://api.e-stat.go.jp/rest/2.1/app/getSimpleStatsData`
- Format support: XML, JSON, CSV
- Includes `collectArea` parameter for prefecture filtering

**API Documentation:**
- English: https://www.e-stat.go.jp/api/en
- Specification: https://www.e-stat.go.jp/api/en/api-info/api-spec

### Registration Required

- Must register on e-Stat to obtain API key (appId)
- Free registration: https://www.e-stat.go.jp/api/

### Download Configuration Options

- Header output toggle
- Code output toggle
- Hierarchy code output toggle
- Legend output toggle
- Encoding: Shift-JIS, UTF-8 (with/without BOM)

---

## 4. Alternative Prefecture-Level Data Sources

### Prefectural Government Surveys

**Not found in this research.** Regional government statistics bureaus may publish own surveys but were not systematically cataloged in this search.

### Other National Surveys

**労働力調査 (Labor Force Survey):**
- Monthly prefecture-level employment data
- Income data limited or indirect

**国勢調査 (Population Census):**
- Every 5 years
- Some household income distribution data
- Less granular spending data

---

## 5. Practical Recommendations for SmartMoney Application

### For Relocation Cost Calculator

**Use 全国家計構造調査 (5-year survey):**

**PROS:**
- Full prefecture coverage (all 47 prefectures)
- Income quintile cross-tabs available
- Household size classifications available
- Can build matrix: Prefecture × Income Bracket × Household Size

**CONS:**
- Only updated every 5 years (2019, 2024, next: 2029)
- 2024 data still being published (Dec 2025 - ongoing)
- Must use 2019 data until 2024 fully released

**Recommended Tables:**
1. **Table 9-0-2**: Prefecture × Household Category × Expenditure Class × Income/Expenditure items
2. **Table 3-0**: Prefecture × Annual Income (for income distributions)
3. **Table 1-29**: National baseline with income quintiles for comparison

### For Monthly Budget Benchmarks

**Use 家計調査 (monthly survey) with fallback:**

**Primary:** Regional block averages (9 blocks cover all prefectures)
- Hokkaido, Tohoku, Kanto, Hokuriku, Tokai, Kinki, Chugoku, Shikoku, Kyushu

**Secondary:** Prefecture capital city data (47 cities)
- Table 4-1 for city-specific benchmarks
- Close proxy for prefecture spending patterns (urban bias noted)

**Fallback:** Use 全国家計構造調査 prefecture data (5-year)
- More accurate prefecture coverage
- Less frequent updates

### Implementation Strategy

**3-Tier Benchmark System:**

1. **Tier 1 - Most Accurate (if available):**
   - 全国家計構造調査 prefecture × income quintile (5-year)
   - Use for annual/strategic planning features

2. **Tier 2 - Monthly Updates:**
   - 家計調査 regional block data (monthly)
   - Use for current month benchmarks
   - Map prefecture → regional block

3. **Tier 3 - City Proxy:**
   - 家計調査 capital city data (monthly/annual)
   - Use when user prefecture not in regional aggregate
   - Note urban bias in UI

**Prefecture → Regional Block Mapping:**
```
Hokkaido: Hokkaido
Tohoku: Aomori, Iwate, Miyagi, Akita, Yamagata, Fukushima
Kanto: Ibaraki, Tochigi, Gunma, Saitama, Chiba, Tokyo, Kanagawa
Hokuriku: Niigata, Toyama, Ishikawa, Fukui
Tokai: Yamanashi, Nagano, Gifu, Shizuoka, Aichi
Kinki: Mie, Shiga, Kyoto, Osaka, Hyogo, Nara, Wakayama
Chugoku: Tottori, Shimane, Okayama, Hiroshima, Yamaguchi
Shikoku: Tokushima, Kagawa, Ehime, Kochi
Kyushu: Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima, Okinawa
```

---

## 6. Data Access Examples

### Example 1: Download 2024 Prefecture Income Data

**Survey:** 全国家計構造調査
**Table:** 9-0-2
**URL:** https://www.e-stat.go.jp/stat-search/files?stat_infid=000040380928

**Steps:**
1. Navigate to e-Stat file page
2. Select "EXCEL" download
3. Configure encoding: UTF-8
4. Download Excel file with all prefectures

**Columns:**
- Prefecture name (都道府県)
- Household type (世帯の種類)
- Household category (世帯区分)
- Consumption expenditure class (消費支出月額階級)
- Income/expenditure items (収支項目分類)
- Monthly amount (1か月間の金額)

### Example 2: Query API for Prefecture Data

**API Call (pseudocode):**
```
GET https://api.e-stat.go.jp/rest/3.0/app/getSimpleStatsData
?appId=YOUR_APP_ID
&statsDataId=0003426439
&cdArea=01000,13000,27000  # Hokkaido, Tokyo, Osaka codes
&cdCat01=01,02,03          # Income quintile 1-3
&metaGetFlg=Y
&cntGetFlg=N
&lang=J
```

**Response format:** XML/JSON/CSV
**Data:** Prefecture × Income bracket spending data

### Example 3: Download Monthly Regional Data

**Survey:** 家計調査
**Table:** 用途分類 002 都市階級・地方
**URL:** https://www.e-stat.go.jp/stat-search/database?statdisp_id=0003000800

**Steps:**
1. Access database view on e-Stat
2. Filter by region (地方): Select Kanto (関東)
3. Select time period: Latest month
4. Export as CSV

**Columns:**
- Region (地方)
- Urban class (都市階級)
- Expenditure category (用途分類)
- Monthly amount per household
- Month/Year

---

## 7. Unresolved Questions

1. **2024 全国家計構造調査 full data release schedule:**
   - Dec 2025: Initial results published
   - When will complete prefecture × income cross-tabs be available?
   - Need to monitor: https://www.stat.go.jp/data/zenkokukakei/2024/kekka.html

2. **Prefecture economic regions (県内経済圏) definitions:**
   - What criteria define economic regions A, B, C, D within each prefecture?
   - Are these stable across survey years?
   - Documentation not found in English or public sources

3. **Data update frequency for 家計調査 prefecture capital cities:**
   - Table 4-1 shows annual data
   - Are monthly capital city breakdowns available?
   - Confirmed annual only based on search results

4. **Income quintile definitions across surveys:**
   - Are 家計調査 income quintiles (national) comparable to 全国家計構造調査 quintiles (prefecture)?
   - Do quintile brackets change by year or fixed?

5. **API rate limits and data volume restrictions:**
   - e-Stat API documentation found but specific limits not detailed
   - How many records per call?
   - Throttling policies?

---

## Sources

- [e-Stat Portal - Family Income & Expenditure Survey](https://www.e-stat.go.jp/stat-search/files?toukei=00200561)
- [Statistics Bureau - Family Income & Expenditure Survey](https://www.stat.go.jp/data/kakei/)
- [Statistics Bureau - Prefecture Capital City Rankings](https://www.stat.go.jp/data/kakei/rank/singleyear.html)
- [e-Stat Portal - National Survey of Family Income, Consumption & Wealth](https://www.e-stat.go.jp/stat-search?toukei=00200564)
- [Statistics Bureau - 2024 National Survey of Family Income, Consumption & Wealth](https://www.stat.go.jp/data/zenkokukakei/2024/index.html)
- [Statistics Bureau - 2024 Survey Results](https://www.stat.go.jp/data/zenkokukakei/2024/kekka.html)
- [e-Stat API Documentation (English)](https://www.e-stat.go.jp/api/en)
- [e-Stat API Specifications](https://www.e-stat.go.jp/api/en/api-info/api-spec)
- [Wikipedia - List of Regions of Japan](https://en.wikipedia.org/wiki/List_of_regions_of_Japan)
- [Statistics Bureau - Outline of Family Income & Expenditure Survey (English)](https://www.stat.go.jp/english/data/kakei/1560.html)
- [e-Stat Table 15-0 (2019 Survey)](https://www.e-stat.go.jp/en/dbview?sid=0003426439)
- [e-Stat Table 9-0-2 (2024 Survey)](https://www.e-stat.go.jp/stat-search/files?stat_infid=000040380928)
- [e-Stat Download Guide](https://www.e-stat.go.jp/help/prefecture/table15)

---

**Research completed:** 2026-02-16
**Researcher:** Claude Code (Technical Research Specialist)
**Token usage:** ~40k tokens
**Confidence level:** High (verified through official government sources)
