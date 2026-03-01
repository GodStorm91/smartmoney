# Japanese Municipal Finance Variation Research
## Relocation Cost Calculator Data Sources

**Research Date:** 2026-02-13
**Target Users:** Japanese salary workers (会社員/kaishain)
**Focus:** Publicly available data for municipal cost comparison calculator

---

## 1. National Health Insurance (国民健康保険/Kokumin Kenko Hoken)

### Applicability
- **Who uses NHI:** Self-employed (個人事業主), freelancers, retirees, unemployed
- **Who uses Social Insurance:** Company employees (会社員) at companies with 5+ employees or corporations
- **Key difference:** Social insurance premiums split 50/50 with employer; NHI is 100% self-paid
- **Dependent handling:** Social insurance has free dependent coverage; NHI charges per person (均等割)

**Important:** Most salary workers (会社員) use **social insurance (健康保険/kenko hoken)**, NOT NHI. NHI applies when switching jobs, early retirement, or part-time work.

### Premium Components (方式/Formula Methods)

Municipalities use 2-4 component formulas:

1. **所得割 (Shotokuwari)** — Income-based portion
   - Base: (Previous year gross income - ¥430,000 base deduction) × municipality rate
   - Rate varies by city (typically 6-10% for medical portion)

2. **均等割 (Kintowari)** — Per-capita flat fee
   - Fixed amount per household member
   - Varies ¥30,000-50,000/person/year depending on city

3. **平等割 (Byodowari)** — Household flat fee
   - Fixed per household (not per person)
   - Used in 3-method or 4-method systems
   - Approx ¥20,000-40,000/household/year

4. **資産割 (Shisanwari)** — Asset-based (being phased out)
   - Based on property tax value
   - Few municipalities still use this (legacy system)

### Premium Structure
Each premium divides into 3 sub-premiums:
- **Medical portion (医療分)** — everyone pays
- **Elderly support (後期高齢者支援金分)** — everyone pays
- **Long-term care (介護分)** — only ages 40-64 pay

### Municipal Variation

**Premium difference range:** 1.5x to 2x between cheapest/most expensive cities

**Example rates (2026 medical portion):**
- Hirakata City, Osaka: Income rate 9.30%, per-capita ¥34,424
- Tokyo wards: Rates published by each ward (standard rate guidelines exist)
- National average single household: ~¥98,000/year

**How much difference?**
- Example: ¥2M income, 3-person household
  - Low-cost city: ~¥350,000/year
  - High-cost city: ~¥500,000+/year
- Hiroshima City example: ¥2M income 3-person family = ¥477,822/year (23.9% of income)

### Data Sources

**Primary:**
- [Kokuho Calculator](https://www.kokuho-keisan.com/) — searchable by municipality, 2026 rates
- [MHLW Regional Analysis](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/database/iryomap/hoken.html) — official govt comparison
- [e-Stat NHI Survey](https://www.e-stat.go.jp/dbview?sid=0003404496) — detailed prefecture/city data

**Municipal examples:**
- Yokohama: [City site 2026 rates](https://www.city.yokohama.lg.jp/kurashi/koseki-zei-hoken/kokuho/hokenryo/r7hokennryouritu.html)
- Each city publishes annual rates (search: "[市名] 国民健康保険料 令和8年度")

**Openly published:** Yes. All municipalities publish rates annually (April-May). Calculator sites aggregate.

---

## 2. Resident Tax (住民税/Juminzei)

### Standard Rate (Nearly Universal)

**Income portion (所得割):** 10% of taxable income
- Prefectural: 4%
- Municipal: 6%

**Flat portion (均等割):** ¥5,000/year
- Prefectural: ¥1,500
- Municipal: ¥3,500

### Municipal Variations (超過課税/Chokakazei)

**Myth busted:** Resident tax is NOT truly uniform nationwide. Some municipalities levy "surtax."

**Highest example: Yokohama City**
- Prefecture surtax: +¥300 flat, +0.025% income
- City surtax: +¥900 flat
- Total extra: ¥1,200/year + 0.025% income

**Other surtax municipalities:**
- Various cities for disaster recovery, environmental funds
- Differences typically minor (¥500-2,000/year)

**Practical impact:** Resident tax variation is MINIMAL compared to NHI. For calculator: safe to assume 10% income + ¥5,000 flat for all cities unless implementing Yokohama/specific exceptions.

### Calculation

Taxable income = Gross income - Deductions (employment, basic, dependent, etc.)
Resident tax = (Taxable income × 10%) + ¥5,000

**Deduction differences vs income tax:**
- Basic deduction: ¥43,000 (vs ¥58,000→¥62,000 in 2026 income tax)
- Dependent deduction: ¥33,000 general (vs ¥38,000 income tax)

### Data Sources

- [Municipal Tax Rate List](https://a-agent.co.jp/municipal-tax-list/) — all 1,718 municipalities (2026 update)
- [SOUMU Ministry](https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/150790_06.html) — official individual resident tax page

**Openly published:** Yes. Standard rates known; surtax municipalities clearly listed.

---

## 3. Childcare Costs by Municipality

### National Free Childcare (幼保無償化)

**Ages 3-5:** Free at licensed facilities nationwide (since 2019)
**Ages 0-2:** Free only for resident-tax-exempt households

### Municipal Variation (Ages 0-2)

**Major differences:**
- Some cities subsidize 0-2 childcare beyond national policy
- Some waive fees for 2nd+ child regardless of income
- Monthly fees can range ¥10,000-80,000 depending on income bracket & city

**Examples of generous policies:**
- Kitakyushu: Free for 2nd+ child (since Dec 2023)
- Various Nara Prefecture cities: High rate of 1st-child subsidies
- ~10% of municipalities offer 1st-child free childcare (Kansai region study)

### Data Challenges

**No centralized database.** Each municipality publishes:
- Income-bracket fee tables (usually 10-20 tiers)
- Multi-child discounts
- Format varies widely

**Calculator feasibility:** Difficult to automate without manual data entry per city. Consider:
- Simplified model: "3-5 free, 0-2 income-based ~¥30,000-50,000/month average"
- Or link to municipal sites for user lookup

### Data Sources

- [CFA Free Childcare Overview](https://www.cfa.go.jp/policies/kokoseido/mushouka/gaiyou)
- Municipal sites: Search "[市名] 保育料 令和8年度"
- [BABY JOB Kansai Study](https://prtimes.jp/main/html/rd/p/000000160.000038762.html) — regional comparison

**Openly published:** Yes, but fragmented. No single aggregator like NHI calculators exist.

---

## 4. Average Rent Data

### Data Sources

**SUUMO (リクルート):**
- URL: [https://suumo.jp/chintai/soba/](https://suumo.jp/chintai/soba/)
- Coverage: All prefectures, cities, and train stations
- Format: Average by room type (1R, 1K, 1DK, 2LDK, etc.)
- Update frequency: Monthly
- Accessibility: Free browsing, no API

**e-Stat Housing Survey (住宅土地統計調査):**
- Latest: 2023 survey (5-year cycle)
- URL: [https://www.e-stat.go.jp/stat-search?toukei=00200522](https://www.e-stat.go.jp/stat-search?toukei=00200522)
- Coverage: All municipalities (15k+ population)
- Format: Downloadable CSV/Excel
- Data: Median rent by room count, building type

**Numbeo, Bamboo Routes, GaijinPot:**
- Aggregated user reports & market data
- Less reliable than SUUMO/e-Stat
- Useful for expat-focused English content

### Rent Examples (Jan 2026)

**National average:** ¥98,000/month (2-bedroom)

**Major cities (1R/1K studio):**
- Tokyo (Minato Ward): ¥160,000
- Tokyo average: ¥95,000
- Osaka: ¥75,000 (15-25% cheaper than Tokyo)
- Nagoya: ¥60,000-80,000 city center
- Fukuoka: ¥66,000 average

**Recent trends:** +1-2% YoY nationwide; +5-8% in Tokyo 23 wards (as of Jan 2026)

### Recommendation

**Primary source:** SUUMO for real-time market data
**Secondary source:** e-Stat 2023 survey for statistical rigor
**Implementation:** Web scraping SUUMO or manual entry of top ~50 cities

**Openly published:** Yes. SUUMO fully public. e-Stat downloadable datasets.

---

## 5. Japanese Income Tax (所得税/Shotokuzei)

### Progressive Tax Brackets (2026 Reform)

**Key 2026 changes:**
- Basic deduction: ¥580,000 → ¥620,000 (for income ≤¥23.5M)
- Employment deduction minimum: ¥650,000 → ¥740,000 (2026-2027 special boost)
- "Income wall" threshold: ¥1.03M → ¥1.78M (where income tax starts)

### Tax Rates (Unchanged — National Uniform)

| Taxable Income (¥) | Rate | Deduction (¥) | Quick Calc |
|-------------------|------|---------------|------------|
| 0 – 1,950,000 | 5% | 0 | Income × 0.05 |
| 1,950,001 – 3,300,000 | 10% | 97,500 | Income × 0.10 - 97,500 |
| 3,300,001 – 6,950,000 | 20% | 427,500 | Income × 0.20 - 427,500 |
| 6,950,001 – 9,000,000 | 23% | 636,000 | Income × 0.23 - 636,000 |
| 9,000,001 – 18,000,000 | 33% | 1,536,000 | Income × 0.33 - 1,536,000 |
| 18,000,001 – 40,000,000 | 40% | 2,796,000 | Income × 0.40 - 2,796,000 |
| 40,000,001+ | 45% | 4,796,000 | Income × 0.45 - 4,796,000 |

**Reconstruction surtax:** +2.1% of calculated tax (until 2037)

### Deductions (2026 Values)

**Basic deduction (基礎控除):**
- ¥620,000 (if total income ≤¥23.5M)
- Phases down above ¥23.5M, zero at ¥25M+

**Employment income deduction (給与所得控除):**
- Min ¥740,000 (special 2026-2027 boost)
- Formula: Varies by salary tier
  - ~¥1.8M salary → ¥740,000 deduction
  - ¥5M salary → ¥1.54M deduction (30.8%)
  - Caps at ¥1.95M deduction for ¥8.5M+ salary

**Dependent deduction (扶養控除):**
- General dependent: ¥380,000
- Special dependent (ages 19-22): ¥630,000
- Elderly dependent (age 70+): ¥480,000
- Income limit for dependent: ¥620,000 (changed from ¥580,000 in 2026)

**Spouse deduction (配偶者控除):** ¥380,000 (if spouse income ≤¥620,000)

### Geographic Variation

**None.** Income tax is **purely national** (国税). Same rates/deductions everywhere in Japan.

### Data Sources

- [NTA Quick Calc Table](https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/115.pdf) — official 2025-2026 rate table
- [2026 Tax Reform Summary](https://media.monex.co.jp/articles/-/28466) — Monex breakdown
- [Tax Calculation Guide](https://www.freee.co.jp/kb/kb-payroll/how-to-calculate-income-tax/) — freee explainer

**Openly published:** Yes. Fully documented by National Tax Agency (国税庁/NTA).

---

## 6. Social Insurance (社会保険/Shakai Hoken) vs NHI

### Who Uses What

**Social Insurance (会社員/kaishain):**
- Health insurance (健康保険): ~10% of salary, split with employer
- Pension (厚生年金): 18.3% of salary, split with employer
- Employment insurance (雇用保険): ~0.6%, split with employer
- Long-term care (介護保険): Age 40+ only, ~1.8% split
- Total employee burden: ~15% of salary (employer pays equal amount)

**National Health Insurance (個人事業主/freelance):**
- NHI: See Section 1 (100% self-paid, city-dependent)
- National Pension (国民年金): ¥16,980/month flat (2026)
- No employment insurance
- Long-term care: Included in NHI for age 40+
- Total burden: NHI varies + ¥203,760/year pension

**Social insurance eligibility (for employees):**
- Corporations: Mandatory regardless of employee count
- Sole proprietorships: Mandatory if 5+ employees (certain industries)
- Part-time: Must enroll if working 20+ hrs/week & ¥88,000+/month (106万円の壁)

### Calculator Implications

**For salary workers (会社員):** Social insurance rates DO vary by prefecture but NOT by municipality.
- Health insurance: [Kyokai Kenpo rates by prefecture](https://www.kyoukaikenpo.or.jp/g7/cat330/sb3130/)
- Prefectural variation: ±0.5-1% around 10% average
- Example: 9.77% in Niigata vs 10.33% in Saga (2026)

**For self-employed:** Use NHI rates (Section 1 municipal variation applies).

### Data Sources

- [Kyokai Kenpo Rate Table](https://www.kyoukaikenpo.or.jp/LP/2025hokenryou/) — employee health insurance by prefecture
- [Comparison: NHI vs Social](https://romsearch.officestation.jp/shakaihoken/34467) — detailed explainer

---

## Summary: Data Availability for Calculator

| Cost Component | Municipal Variation | Data Available | Data Source |
|---------------|---------------------|----------------|-------------|
| **National Health Insurance** | ⭐⭐⭐ High (1.5-2× difference) | ✅ Yes, aggregated | kokuho-keisan.com, MHLW |
| **Resident Tax** | ⭐ Minimal (~¥1-2k/yr surtax) | ✅ Yes, documented | SOUMU, municipal sites |
| **Childcare (0-2)** | ⭐⭐ Moderate (free to ¥80k/mo) | ⚠️ Fragmented | Municipal sites (manual) |
| **Childcare (3-5)** | None (free nationwide) | ✅ Yes (uniform) | CFA |
| **Average Rent** | ⭐⭐⭐ High (2× Tokyo vs regional) | ✅ Yes, multiple sources | SUUMO, e-Stat |
| **Income Tax** | None (national uniform) | ✅ Yes (NTA tables) | NTA |
| **Social Insurance (会社員)** | ⭐ Minimal (prefecture-level) | ✅ Yes (Kyokai Kenpo) | Kyokai Kenpo |
| **NHI (self-employed)** | ⭐⭐⭐ High | ✅ Yes | See row 1 |

### Implementation Priority

**High-value, easy to implement:**
1. Rent comparison (SUUMO data scrape or manual top 50 cities)
2. Income tax calculator (static formula, NTA 2026 rates)
3. Social insurance (prefecture lookup, Kyokai Kenpo rates)

**High-value, moderate effort:**
4. NHI calculator (aggregate from kokuho-keisan.com or MHLW data)
5. Resident tax (10% + ¥5k with Yokohama exception)

**Lower priority / manual reference:**
6. Childcare 0-2 (too fragmented for full automation; provide links)
7. Childcare 3-5 (uniform free policy; note only)

---

## Unresolved Questions

1. **Social insurance company-specific plans (組合健保/kumiai kenpo):** Large companies may have own rates. Calculator assumes Kyokai Kenpo (協会けんぽ) — correct for SMEs (75% of workers).

2. **Pension portability:** National Pension (self-employed) vs Employees' Pension (会社員) — not directly comparable for relocation cost. Assume same income source before/after move?

3. **Moving subsidies:** Some rural municipalities offer relocation grants (¥500k-2M). Out of scope for this calculator but worth noting.

4. **Childcare waitlists:** Even if fees are low, availability varies drastically. Data exists but not easily quantifiable for calculator.

5. **Property tax (固定資産税):** Homeowners pay this; rates vary by land value, not municipality policy. Exclude from salary worker calculator?

---

## Sources

- [National Health Insurance Overview](https://www.bk.mufg.jp/column/others/b0099.html)
- [NHI Components Explained](https://www.mmea.biz/look_up/shotokuwari/)
- [Resident Tax Variations](https://a-agent.co.jp/municipal-tax-list/)
- [Childcare Free Policy](https://www.cfa.go.jp/policies/kokoseido/mushouka/gaiyou)
- [Rent Data Japan 2026](https://bambooroutes.com/blogs/news/japan-rents)
- [SUUMO Rent Database](https://suumo.jp/chintai/soba/)
- [e-Stat Housing Survey](https://www.stat.go.jp/data/jyutaku/2023/tyousake.html)
- [Income Tax 2026 Reform](https://media.monex.co.jp/articles/-/28466)
- [Income Tax Quick Table](https://www.nta.go.jp/publication/pamph/gensen/nencho2025/pdf/115.pdf)
- [Social vs NHI Comparison](https://romsearch.officestation.jp/shakaihoken/34467/)
- [Kyokai Kenpo Rates 2026](https://www.kyoukaikenpo.or.jp/LP/2025hokenryou/)
