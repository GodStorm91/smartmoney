# Japanese Household Spending Benchmark Research

**Research Date:** 2026-02-16
**Status:** Complete
**Purpose:** Implementation guidance for household spending comparison/benchmark feature

---

## Executive Summary

Japan provides comprehensive, free public household spending data through Statistics Bureau (総務省統計局) via:
1. **家計調査 (Kakei Chōsa)** - Monthly Family Income and Expenditure Survey
2. **e-Stat API** - Government statistics portal with machine-readable data access
3. **COICOP classification** - International standard spending categories adapted for Japan

**Key Finding:** No existing public API provides ready-to-use spending benchmarks. Apps like Zaim/MoneyForward use proprietary user data aggregation for "compare with everyone" features.

**Implementation Approach:** Build custom dataset from e-Stat API + cache locally for comparison features.

---

## 1. Official Data Sources

### 1.1 Statistics Bureau of Japan (総務省統計局)

**Primary Source:** [Family Income and Expenditure Survey](https://www.stat.go.jp/english/data/kakei/index.html)

- **Survey ID:** 00200561
- **Frequency:** Monthly releases (latest: Dec 2025, released Feb 6, 2026)
- **Household Types:**
  - Two-or-more-person households (二人以上の世帯)
  - Workers' households (勤労者世帯)
  - One-person households (単身世帯)
  - All households (総世帯)

**Latest Data (Dec 2025):**
- Average monthly consumption: ¥351,522
- Workers' monthly income: ¥1,207,545
- Year-over-year: -2.6% (real terms)

**Historical Data:** [Time Series Tables](https://www.stat.go.jp/english/data/kakei/156time.html)
- 1946-2017: Excel downloads available
- Income quintile breakdowns: 1985-2017, 2000-2017
- Format: Excel (.xlsx)

### 1.2 National Survey of Family Income, Consumption and Wealth

**Formerly:** National Survey of Family Income and Expenditure
**Frequency:** Every 5 years (since 1959)
**Coverage:** More comprehensive than monthly survey
**Data:** [e-Stat Portal](https://www.e-stat.go.jp/en/statistics/00200561)

---

## 2. e-Stat API Access

### 2.1 Registration & Authentication

**Portal:** [https://www.e-stat.go.jp/api/](https://www.e-stat.go.jp/api/)
**Documentation:** [API v3.0 Spec](https://www.e-stat.go.jp/api/api-info/e-stat-manual3-0)

**Getting API Key (appId):**
1. Register account on e-Stat
2. Login → mypage
3. Fill application form
4. Click "Issue" button
5. **Limit:** Max 3 appIds per account

### 2.2 API Endpoints

**Base URLs:**
- XML: `http://api.e-stat.go.jp/rest/<version>/app/getStatsData?<params>`
- JSON: `http://api.e-stat.go.jp/rest/<version>/app/json/getStatsData?<params>`

**Required Parameters:**
- `appId` - Your application ID
- `statsDataId` - Table/dataset ID (e.g., `0003343671` for 2020 revision amount data)

**Optional Parameters:**
- `cdCat01` - Category code filter (URL-encoded UTF-8)
- `metaGetFlg` - Include metadata (Y/N)
- `cntGetFlg` - Include count (Y/N)

**Example Query:**
```
http://api.e-stat.go.jp/rest/2.0/app/json/getStatsData?appId={YOUR_APP_ID}&statsDataId=0003343671&cdCat01=%23A03503
```

### 2.3 Rate Limits & Quotas

**Data Limit:** Max 100,000 records per request
**Pagination:** Use `<NEXT_KEY>` tag for continuation
**Request Frequency:** Not publicly documented in English docs (check [FAQ](https://www.e-stat.go.jp/api/en/api-dev/faq))

**Formats:** XML, JSON, CSV

### 2.4 Key Dataset IDs (家計調査)

**Government Statistics Code:** 00200561

**2020 Revision Tables:**
- Amount (金額): `0003343671`
- Quantity (数量): `0003343670`

**Note:** 2015 revision tables (`0003103532`, `0003103522`) stopped updating after Jan 2020

**Important:** Classification changed in 2020 - ensure using current revision

---

## 3. Spending Categories (品目分類)

### 3.1 10 Major Categories (COICOP-based)

Japan uses modified COICOP (Classification of Individual Consumption According to Purpose):

| Category (Japanese) | Category (English) | Note |
|---------------------|-------------------|------|
| 食料 | Food | Groceries, prepared foods, dining |
| 住居 | Housing | Rent, maintenance |
| 光熱・水道 | Utilities & Water | Electricity, gas, water |
| 家具・家事用品 | Furniture & Household Items | Durables, consumables |
| 被服及び履物 | Clothing & Footwear | Apparel, shoes, laundry |
| 保健医療 | Healthcare | Medicine, medical services |
| 交通・通信 | Transportation & Communications | Transit, vehicles, phones |
| 教育 | Education | Tuition, materials |
| 教養娯楽 | Recreation & Culture | Entertainment, books, travel |
| その他の消費支出 | Other Consumption | Personal care, gifts, insurance |

**Total Subcategories:** ~689 detailed product classifications
**Data Source:** [e-Stat Item Classification](https://www.e-stat.go.jp/dbview?sid=0003348231)

### 3.2 Classification Types

**品目分類 (Item Classification):**
- Based on what was purchased (regardless of use)
- Used for commodity price tracking

**用途分類 (Usage Classification):**
- Based on intended use (personal vs gifts)
- Better for spending behavior analysis

---

## 4. Income Brackets (年収分位)

### 4.1 Quintile System (五分位)

Japan uses **income quintiles** (五分位) to segment households:

**Definition:** Households sorted by annual income (年収), divided into 5 equal groups
- Quintile I: Lowest 20%
- Quintile II: 20-40%
- Quintile III: 40-60% (median)
- Quintile IV: 60-80%
- Quintile V: Highest 20%

**Data Availability:**
- Time series: 1985-2007, 2000-2017 ([Excel downloads](https://www.stat.go.jp/english/data/kakei/156time.html))
- Cross-tabbed with: household size, age of head, region

### 4.2 Income Distribution (2023-2025)

**Average Household Income:**
- All households: ~¥5.2M/year (2023)
- Workers' households: ¥653,901/month (2025 avg)

**Median Income:** ~¥3.96M/year (less skewed than average)

**Distribution:**
- <¥1M: ~7%
- Detailed brackets not in English sources

**Note:** Specific spending by brackets (¥2M, ¥4M, ¥6M, ¥8M, ¥10M) requires direct e-Stat table queries.

### 4.3 Regional & Demographic Breakdowns

**Available Dimensions:**
- Prefecture (都道府県)
- City size classification (都市階級)
- Household size (世帯人員)
- Age of household head (世帯主年齢)
- Employment status (職業)
- Dwelling type (住宅種類)

---

## 5. Practical Implementation Approaches

### 5.1 How Japanese Finance Apps Implement Benchmarks

#### Zaim (くふう Zaim)
**Feature:** "みんなと比較" (Compare with Everyone)

**How it works:**
- Aggregates spending from Zaim's user base
- Compares user's expenses to similar households
- Filters by household composition, location
- Answers: "How much does everyone spend on food?"

**Access:** Available across expense categories
**Pricing:** Premium feature (¥480/month or ¥4,800/year)
**Limitation:** Requires sufficient data to display comparisons

**Sources:**
- [Zaim FAQ: みんなと比較](https://content.zaim.net/questions/show/1062)
- [Zaim Analysis Tools](https://content.zaim.net/manuals/show/45)

#### MoneyForward ME
**Integration:** 2,500+ financial institutions
**Pricing:** ¥5,300/year
**Benchmark:** Not explicitly documented (likely uses user data aggregation)

**Key Difference:** Broader automation, less emphasis on peer comparison vs Zaim

### 5.2 Recommended Implementation Strategy

**Option A: e-Stat API + Local Cache**

**Pros:**
- Free, official government data
- No user privacy concerns
- Authoritative baseline

**Cons:**
- Static benchmarks (monthly update lag)
- Requires preprocessing
- No real-time user peer comparison

**Implementation:**
1. Query e-Stat API for latest monthly data
2. Filter by income quintile, household size, region
3. Cache in local database (refresh monthly)
4. Compare user spending to cached benchmarks
5. Display variance (e.g., "15% below average for food")

**API Call Example (Pseudocode):**
```javascript
// Fetch household spending for income quintile III, 2-person households
const response = await fetch(
  `http://api.e-stat.go.jp/rest/2.0/app/json/getStatsData?` +
  `appId=${APP_ID}&` +
  `statsDataId=0003343671&` +
  `cdCat01=%23{QuintileIII_2Person_Code}`
);
```

**Option B: User Data Aggregation (Like Zaim)**

**Pros:**
- Real-time, dynamic benchmarks
- Can segment by user-specific criteria
- Increases engagement (social proof)

**Cons:**
- Privacy implications (anonymization required)
- Needs critical user mass
- Must handle sparse data gracefully

**Implementation:**
1. Anonymize user spending data
2. Aggregate by: income bracket, household size, location
3. Calculate percentiles (P25, P50, P75)
4. Display when sufficient sample size (e.g., n≥30)
5. Fallback to e-Stat benchmarks when data sparse

**Option C: Hybrid Approach**

1. Start with e-Stat benchmarks (immediate availability)
2. Layer user data when available (better personalization)
3. Use e-Stat as quality check (detect outliers)

---

## 6. Technical Specifications

### 6.1 Data Refresh Frequency

**e-Stat Updates:**
- Monthly survey: Released ~6 weeks after month-end
- Example: Dec 2025 data → Feb 6, 2026 release

**Recommended Refresh:**
- Automated monthly fetch (1st week of each month)
- Fallback to previous month if current unavailable

### 6.2 Storage Requirements

**Minimal Dataset (for comparison feature):**
- 10 categories × 5 quintiles × 5 household sizes × 12 months = 3,000 records/year
- ~50KB JSON (uncompressed)

**Full Dataset (all 689 subcategories):**
- ~3.4MB JSON/year

**Historical:** Archive 3-5 years for trend analysis

### 6.3 Sample Data Structure

```json
{
  "benchmark": {
    "year": 2025,
    "month": 12,
    "household_type": "two_or_more_person",
    "income_quintile": "III",
    "household_size": 2,
    "region": "all_japan",
    "spending": {
      "food": 85720,
      "housing": 18291,
      "utilities": 22514,
      "furniture": 12634,
      "clothing": 9847,
      "healthcare": 14582,
      "transportation": 43219,
      "education": 7894,
      "recreation": 28965,
      "other": 107856
    },
    "total_consumption": 351522,
    "income": 653901
  }
}
```

---

## 7. Open-Source Alternatives

### 7.1 Personal Finance Apps with Benchmarks

**Analyzed:** Firefly III, Actual Budget, ezBookkeeping, Ontrack

**Finding:** None provide regional spending benchmarks
- Focus: Transaction tracking, budgeting, reporting
- No built-in comparison features

**Implication:** Must build benchmark feature from scratch

### 7.2 Open Finance APIs

**Akoya (US-focused):** Real-time transactions, balances, identity verification
**Coverage:** Not applicable to Japan

**No Japan-specific open finance benchmark API found.**

---

## 8. Implementation Recommendations

### Phase 1: MVP (Minimum Viable Product)
1. Register e-Stat API key
2. Fetch latest monthly data for 10 major categories
3. Store in database (PostgreSQL JSON column)
4. Match user household profile → fetch relevant benchmark
5. Display simple variance: "Your food spending: ¥75,000 (12% below average: ¥85,720)"

**Estimated Effort:** 2-3 days (API integration + DB schema + basic UI)

### Phase 2: Enhanced Segmentation
1. Add income bracket detection (user input or calculated)
2. Regional breakdown (if user provides prefecture)
3. Household size matching
4. Display percentile ranking: "You're in the 35th percentile for transportation"

**Estimated Effort:** 3-5 days (input forms + query logic + UI enhancements)

### Phase 3: User Data Aggregation (Future)
1. Implement opt-in data sharing consent
2. Anonymize user spending (hash user IDs)
3. Aggregate by segments (min n=30 threshold)
4. Hybrid display: "Official average: ¥85K | SmartMoney users: ¥78K"

**Estimated Effort:** 1-2 weeks (privacy review + aggregation logic + testing)

---

## 9. Localization Considerations

### 9.1 Category Naming
**Japanese (primary):** 食料, 住居, 光熱・水道, etc.
**English:** Food, Housing, Utilities, etc.
**Vietnamese:** Thực phẩm, Nhà ở, Tiện ích, etc.

**Recommendation:** Map e-Stat Japanese categories to your i18n keys

### 9.2 Currency Display
**Source data:** JPY (¥)
**User preference:** Support ¥ / $ / ₫ display (your app already handles this)

### 9.3 Comparison Phrasing
**Examples:**
- EN: "Your spending is 12% below the national average"
- JA: "あなたの支出は全国平均より12%低いです"
- VI: "Chi tiêu của bạn thấp hơn mức trung bình quốc gia 12%"

---

## 10. Unresolved Questions

1. **e-Stat API rate limits:** Not clearly documented in English. Need to test or contact e-Stat support.

2. **Exact income bracket spending:** Search didn't find detailed tables for specific ¥2M/¥4M/¥6M/¥8M/¥10M brackets. May require direct e-Stat database queries or Excel file analysis.

3. **Seasonal adjustment:** Does e-Stat provide seasonally adjusted data for fairer comparison? (Some tables marked "seasonally adjusted" but unclear for household spending)

4. **Agricultural households:** Some tables include/exclude農林漁家世帯. Which is more representative for urban app users? (Likely exclude)

5. **One-person household benchmarks:** Less comprehensive than two+ person data. How to handle single users?

6. **Privacy regulations:** GDPR-equivalent in Japan (APPI - Act on Protection of Personal Information) requirements for user data aggregation?

---

## 11. Key URLs Reference

### Official Government Sources
- [Statistics Bureau Home](https://www.stat.go.jp/english/)
- [Family Income Survey Main](https://www.stat.go.jp/english/data/kakei/index.html)
- [Latest Monthly Summary](https://www.stat.go.jp/english/data/kakei/156.html)
- [Time Series Data](https://www.stat.go.jp/english/data/kakei/156time.html)

### e-Stat Portal
- [e-Stat English](https://www.e-stat.go.jp/en/)
- [API Documentation](https://www.e-stat.go.jp/api/)
- [API How-to-Use](https://www.e-stat.go.jp/api/en/api-dev/how_to_use)
- [API FAQ](https://www.e-stat.go.jp/api/en/api-dev/faq)
- [Family Income Data Browser](https://www.e-stat.go.jp/en/stat-search/files?toukei=00200561)

### Finance Apps (Competitive Analysis)
- [Zaim Official](https://zaim.net/)
- [Zaim Guide: みんなと比較](https://content.zaim.net/questions/show/1062)
- [MoneyForward ME](https://moneyforward.com/)

### Third-Party Tools
- [estatapi (R package)](https://yutannihilation.github.io/estatapi/)
- [jpstat (R package)](https://uchidamizuki.github.io/jpstat/)
- [e-Stat API Explorer (unofficial)](https://ecitizen.jp/statdb/)

---

## 12. Next Steps

1. **Register for e-Stat API key** (15 min)
2. **Test API calls** for household spending data (1 hour)
3. **Download sample Excel tables** to understand data structure (30 min)
4. **Design database schema** for benchmark cache (1 hour)
5. **Create prototype comparison UI** (half-day)
6. **Review with team** before full implementation

---

**Research Complete:** All requested information documented.
**Document Path:** `/home/godstorm91/project/smartmoney/docs/260216-japan-household-spending-benchmark-research.md`
