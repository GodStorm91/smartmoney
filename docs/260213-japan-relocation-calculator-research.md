# Japan Relocation Cost Calculator Research Report
**Date:** 2026-02-13
**Research Focus:** Postal Code APIs + Childcare Fee Policies

---

## 1. POSTAL CODE → CITY RESOLUTION APIS

### 1.1 Zipcloud API (RECOMMENDED FOR CLIENT-SIDE)

**Endpoint:** `https://zipcloud.ibsnet.co.jp/api/search`

**Request Format:**
- Parameter: `zipcode` (required) - accepts 7-digit format with/without hyphen
- Optional: `callback` (JSONP), `limit` (max results, default 20)
- Example: `https://zipcloud.ibsnet.co.jp/api/search?zipcode=1000001`

**Response Format (JSON):**
```json
{
  "status": 200,
  "message": null,
  "results": [{
    "zipcode": "1000001",
    "prefcode": "13",
    "address1": "東京都",      // Prefecture
    "address2": "千代田区",     // City/Ward
    "address3": "千代田",       // Municipality
    "kana1": "トウキョウト",
    "kana2": "チヨダク",
    "kana3": "チヨダ"
  }]
}
```

**Key Features:**
- Free for individuals/testing (no official support for large-scale commercial use)
- Data updated: 2026-01-30 (Japan Post official data)
- Prefecture codes follow JIS X 0401 standard
- UTF-8 encoded

**Client-Side Usage:**
- **CORS Issue:** Direct fetch from browser causes CORS errors
- **Solution 1:** JSONP callback (supported by API)
  ```javascript
  // Use JSONP callback parameter
  const url = "https://zipcloud.ibsnet.co.jp/api/search?zipcode=3120061&callback=handleAddress";
  ```
- **Solution 2:** Server-side proxy (recommended for production)
- **Solution 3:** Axios with error handling
  ```javascript
  axios.get('https://zipcloud.ibsnet.co.jp/api/search', {
    params: { zipcode: this.zip_code }
  })
  .then(response => {
    const data = response.data.results[0];
    const prefecture = data.address1;
    const city = data.address2 + data.address3;
  })
  ```

**Rate Limits:** Not publicly documented

**Reliability:** Widely used in Japan, actively maintained

**Sources:**
- [Zipcloud API Documentation](http://zipcloud.ibsnet.co.jp/doc/api)
- [Qiita 2025 Postal Code API Comparison](https://qiita.com/7mpy/items/d1ef63934f87ef5704a7)
- [CORS Examples (Japanese)](https://dianxnao.com/javascript%EF%BC%9Azipcloud%E3%82%92%E4%BD%BF%E3%81%A3%E3%81%A6%E9%83%B5%E4%BE%BF%E7%95%AA%E5%8F%B7%E3%81%8B%E3%82%89%E4%BD%8F%E6%89%80%E3%82%92%E5%8F%96%E5%BE%97%E3%81%99%E3%82%8B/)

---

### 1.2 Japan-Postal-Code NPM Package (CLIENT-SIDE BUNDLE)

**Package:** `japan-postal-code`
**NPM:** https://www.npmjs.com/package/japan-postal-code

**Installation:**
```bash
npm install japan-postal-code
```

**Response Format:**
```javascript
postal_code.get('1000001', function(address) {
  address.prefecture  // "東京都"
  address.city        // "千代田区"
  address.area        // "千代田"
  address.street      // ""
});
```

**TypeScript Support:** `@types/japan-postal-code` available

**Pros:**
- No external API calls (data bundled)
- Works client-side without CORS issues
- Webpack2 compatible

**Cons:**
- Package not updated in 8 years
- Large bundle size (includes all postal data)
- May have outdated postal codes

**Alternatives:**
- `jp-postal` - Direct JSON mapping
- `japan-postal-code-oasis` - Remote JSON files
- `japan-postal-code-fetch` - Uses fetch API instead of JSONP

**Sources:**
- [japan-postal-code NPM](https://www.npmjs.com/package/japan-postal-code)
- [GitHub: mzp/japan-postal-code](https://github.com/mzp/japan-postal-code)

---

### 1.3 Ken-All CSV (SERVER-SIDE PROCESSING)

**Official Source:** Japan Post
**Download:** https://www.post.japanpost.jp/zipcode/download.html

**Data Format:**
- CSV (UTF-8, ~120,000 records nationwide)
- Updated monthly by Japan Post
- Full nationwide data: `ken_all.zip` (compressed)

**File Structure:**
- Each postal code = 1 line (since June 2023 update)
- Before 2023: multi-line records for long addresses
- Special cases: addresses >38 chars split across lines

**Processing Challenges:**
- Leading zeros in postal codes may be stripped by Excel
- Parenthetical notes embedded in data
- Requires CSV parser library for browser use

**Recommended Parsers:**
- Papa Parse (11k+ stars, zero dependencies, MIT license)
- csv.js (10kb, ultra-light)
- VanillaES CSV (spec-compliant)

**Use Case:** Build custom server-side API or pre-process into JSON

**Sources:**
- [Japan Post CSV Download](https://www.post.japanpost.jp/zipcode/dl/utf-zip.html)
- [Papa Parse](https://www.papaparse.com/)
- [Parsing Infamous Japanese Postal CSV](https://www.dampfkraft.com/posuto.html)

---

### 1.4 COMPARISON SUMMARY

| Solution | Client/Server | CORS Issues | Data Freshness | Best For |
|----------|--------------|-------------|----------------|----------|
| **Zipcloud API** | Both (JSONP workaround) | Yes (use JSONP) | 2026-01-30 | Quick integration, small apps |
| **NPM Package** | Client | No | Outdated (8yrs) | Offline apps, no API dependency |
| **Ken-All CSV** | Server | N/A | Monthly updates | Custom backend, full control |

**RECOMMENDATION:** Use Zipcloud API with JSONP for client-side, or build server-side endpoint using Ken-All CSV for production.

---

## 2. CHILDCARE (保育園) FEE POLICIES

### 2.1 NATIONAL BASELINE (2019-Present)

**Free Childcare Ages:**
- **3-5 years:** FREE for all households (licensed facilities)
- **0-2 years:** FREE only for households exempt from resident tax (住民税非課税世帯)

**0-2 Year Subsidy (Tax-Exempt Households):**
- Up to ¥42,000/month for unlicensed facilities

**Sources:**
- [Cabinet Office: Free Education Overview](https://www.cfa.go.jp/policies/kokoseido/mushouka/gaiyou)
- [Real Life Japan: Childcare Costs](https://reallifejapan.com/childcare-cost-japan-free-preschool/)

---

### 2.2 TOKYO METROPOLITAN GOVERNMENT

**018 Support Program:**
- Monthly allowance: ¥5,000 per child (ages 0-18)
- Annual max: ¥60,000 per child
- Eligibility: Must reside in Tokyo
- Application: Online portal or mail

**Free Childcare (Sept 2025 - Present):**
- **Ages 0-2:** FREE for ALL first children (第1子) in licensed daycare
- **No income restrictions** (major change from national policy)
- **Second child onward:** Already free under national policy
- **Scope:** Licensed facilities (認可保育園) only

**Costs Still Charged:**
- Extended hour care (延長保育)
- Meals (給食費)
- Diapers
- Materials

**Sources:**
- [E-Housing: Tokyo Subsidies 2025](https://e-housing.jp/post/tokyo-childcare-subsidies-2025-how-expats-can-save-yen1-2m-yearly)
- [Tokyo Bureau: Supporting Child-Rearing](https://www.english.metro.tokyo.lg.jp/w/110-101-005917)

---

### 2.3 OSAKA CITY

**Current Policy (Sept 2024):**
- Second child onward (第2子以降): FREE for ages 0-2

**Upcoming (Sept 2026):**
- **First child (第1子): FREE for ages 0-2**
- No income restrictions
- Covers licensed + corporate-led facilities (企業主導型保育施設)
- Budget: ~¥7 billion (FY2026)

**Home Care Support:**
- Families not using childcare: ¥100,000/year in electronic coupons
- Addresses equity between facility users and home care

**Sources:**
- [Nikkei: Osaka Free Childcare](https://www.nikkei.com/article/DGXZQOUF093UO0Z00C26A2000000/)
- [Osaka City: 0-2 Year Free Childcare Roadmap](https://www.city.osaka.lg.jp/kodomo/page/0000620039.html)

---

### 2.4 OTHER MAJOR CITIES

**Research Findings:**
- **Fukuoka:** Follows national policy (no city-specific 0-2 subsidy found)
- **Nagoya:** No specific 0-2 first-child subsidy documented
- **Sapporo:** No specific 0-2 first-child subsidy documented
- **Kobe:** No specific data found

**Note:** Many municipalities have individual policies — must check local ward office (区役所) websites.

**Sources:**
- [Fukuoka City: Free Early Childhood Education](https://kodomo.city.fukuoka.lg.jp/en/info/2562/)
- [Cabinet Office: Childcare Policies Oct 2025](https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/e4b817c9-5282-4ccc-b0d5-ce15d7b5018c/c9b5b6de/20251029_policies_hoiku_186.pdf)

---

### 2.5 AVERAGE MONTHLY FEES (0-2 YEARS, CITIES THAT CHARGE)

**National Average:**
- ¥37,755/month for one 2-year-old (licensed daycare)

**Income-Based Tiers (Examples):**

| Household Income | Municipal Tax Deduction | Monthly Fee (0-2 yrs) | Location |
|------------------|------------------------|----------------------|----------|
| Low | ¥150,000-169,000 | ¥30,600 | Tokyo Koto Ward (short-time) |
| Middle | ¥257,000-301,000 | ¥60,000 | Saitama Kawagoe City (standard-time) |
| High | — | Variable | — |

**General Ranges:**
- Low-income: ¥10,000-30,000/month
- Middle-income: ¥30,000-50,000/month
- High-income: ¥50,000+/month

**Fee Structure:**
- Based on resident tax (住民税所得割額)
- Varies by municipality
- Separate tiers for standard-time (保育標準時間) vs short-time (保育短時間)

**Sources:**
- [Sumai Surfin: Childcare Fees by Income](https://www.sumai-surfin.com/columns/mansion-knowledge/hoiku2)
- [Kidsna: Fee Calculation Methods](https://kidsna-connect.com/site/column/hoiku_workstyle/5819)

---

### 2.6 TIMELINE SUMMARY

| Date | Policy Change | Coverage |
|------|--------------|----------|
| Oct 2019 | National free childcare (3-5 yrs) | Nationwide |
| Sept 2024 | Osaka: 2nd child free (0-2 yrs) | Osaka City |
| Sept 2025 | Tokyo: 1st child free (0-2 yrs) | Tokyo Metro |
| Sept 2026 | Osaka: 1st child free (0-2 yrs) | Osaka City |
| FY 2026 | National "Childcare for All Children" expansion | Nationwide |

---

## 3. UNRESOLVED QUESTIONS

1. **Zipcloud Rate Limits:** No official documentation on API rate limits or throttling policies. Risk for high-traffic apps.

2. **Osaka 2nd/3rd+ Child Fees:** Is Osaka's current policy (Sept 2024) for 2nd child free or 2nd/3rd+ free? Documentation unclear.

3. **Corporate-Led Facilities (企業主導型):** Do Tokyo's free childcare policies apply to corporate-led facilities, or only municipal licensed facilities?

4. **Income Tier Details:** Need official fee schedules from Osaka, Fukuoka, Nagoya, Sapporo for 0-2 year income-based tiers.

5. **API Verification:** Zipcloud API needs live testing to confirm CORS behavior and response format in 2026.

---

## 4. RECOMMENDATIONS FOR IMPLEMENTATION

**Postal Code Lookup:**
1. **MVP:** Use Zipcloud API with JSONP callback
2. **Production:** Build server-side proxy to avoid CORS, add rate limiting
3. **Fallback:** Bundle `japan-postal-code` npm package for offline mode

**Childcare Fee Calculator:**
1. **City-Specific Logic:**
   - Tokyo (2025+): ¥0 for ages 0-2 (1st child)
   - Osaka (Sept 2026+): ¥0 for ages 0-2 (1st child)
   - Other cities: Use national baseline (free only for tax-exempt)

2. **Fee Estimator (Non-Free Cases):**
   - Default: ¥37,755/month for 0-2 yrs
   - Allow income-based tier selection (low/middle/high)
   - Range: ¥10,000-60,000/month

3. **Disclaimers:**
   - "Fees vary by municipality — verify with local ward office"
   - "Additional costs (meals, extended care) not included"
   - "Based on 2026 data, subject to policy changes"

---

**END OF REPORT**
