# Relocation Planner Improvements — Implementation Plan
**Date:** 260213
**Status:** Agreed

## Overview
Four improvements to the relocation financial planner feature.

## Improvement 1: Thousands Separator on Nenshu Input
**Priority:** P1 | **Complexity:** Low | **Files:** 1

**Change:** Replace `type="number"` with controlled `type="text"` input that formats with thousands separators (e.g., `5,000,000`). Strip commas before submit.

**Files to modify:**
- `frontend/src/components/relocation/RelocationForm.tsx` — format on change, strip on submit

**Logic:**
```
onChange: value.replace(/[^\d]/g, '') → store raw
display: Number(raw).toLocaleString()
submit: Number(raw)
```

---

## Improvement 2: Postal Code (郵便番号) Input
**Priority:** P2 | **Complexity:** Medium | **Files:** 3-4

**UX:** Postal code is primary input. Dropdown is fallback (collapsed by default).

**Flow:**
```
User types 7-digit postal code → debounce 500ms
→ Backend proxy calls Zipcloud API
→ Returns matched city from our DB (or "not found")
→ Auto-fills city selection
→ If not found: show "No data for this area" + expand manual dropdown
```

**Backend:**
- New endpoint: `GET /api/relocation/resolve-postal?code=1000001`
- Calls: `https://zipcloud.ibsnet.co.jp/api/search?zipcode={code}`
- Matches Zipcloud prefecture+city to our RegionalCity table
- Returns: `{ city_id, prefecture_name, city_name }` or `{ error: "not_found" }`
- Cache responses (postal codes don't change often)

**Frontend:**
- Postal code text input (formatted as XXX-XXXX)
- Debounced API call on 7 digits entered
- Auto-select city on match
- "Choose manually" collapsible fallback
- Both current and target city get postal code input

**Files to modify/create:**
- `backend/app/routes/relocation.py` — add resolve-postal endpoint
- `backend/app/services/relocation_service.py` — add postal code resolution logic
- `frontend/src/components/relocation/RelocationForm.tsx` — postal code inputs + fallback
- `frontend/src/services/relocation-service.ts` — add resolvePostalCode() API call
- `frontend/src/types/relocation.ts` — add PostalCodeResponse type
- Locale files (en/ja/vi) — new keys for postal code labels + error messages

---

## Improvement 3: Childcare (保育園料) for Young Children
**Priority:** P2 | **Complexity:** Medium | **Files:** 4-5

**UX:** Toggle/checkbox "Do you have children aged 0-2?" (shown only when family_size includes children: couple_1, couple_2, couple_3).

**Policy rules:**
| Area | 0-2 year childcare fee |
|---|---|
| Tokyo (all 23 wards) | FREE (since Sep 2025) |
| Osaka | FREE (since Sep 2026) |
| All other cities | ~¥37,755/month (national avg) per child |
| National (3-5 years) | FREE everywhere |

**Calculation:**
- If `has_young_children` AND city is Tokyo ward → childcare = ¥0
- If `has_young_children` AND city is Osaka → childcare = ¥0
- If `has_young_children` AND other city → childcare = ¥38,000/month (rounded avg)
- Number of young children: assume 1 (simplification)

**Backend changes:**
- Add `has_young_children: bool = False` to RelocationCompareRequest
- Add `estimated_childcare: int` to CityBreakdown
- Add childcare logic to relocation_service._build_breakdown()
- Tokyo detection: prefecture_code == 13 AND city_code in [special ward codes]
- Osaka detection: prefecture_code == 27

**Frontend changes:**
- Toggle visible only when family_size is couple_1/couple_2/couple_3
- Add childcare row to ComparisonReport
- i18n keys for childcare labels

**Files to modify:**
- `backend/app/schemas/relocation.py` — add has_young_children field
- `backend/app/services/relocation_service.py` — add childcare calc
- `frontend/src/components/relocation/RelocationForm.tsx` — add toggle
- `frontend/src/components/relocation/ComparisonReport.tsx` — add childcare row
- `frontend/src/types/relocation.ts` — update request/response types
- Locale files (en/ja/vi)

---

## Improvement 4: Rule-Based Financial Advice
**Priority:** P3 | **Complexity:** Low-Medium | **Files:** 3-4

**Rules (5-6 advice generators):**

1. **Savings magnitude:**
   - If annual_difference < -300,000: "Moving saves you ¥X/year — equivalent to Y months of current rent"
   - If annual_difference > 300,000: "Moving costs an extra ¥X/year"

2. **Biggest cost driver:**
   - Compare rent diff vs other diffs → "Rent accounts for X% of the total difference"
   - Or "Tax/insurance differences are minimal — housing is the deciding factor"

3. **Childcare impact (if applicable):**
   - If moving TO Tokyo/Osaka with young kids: "Tokyo's free childcare policy saves ¥38k/month — this significantly offsets higher rent"
   - If moving FROM Tokyo with young kids: "Warning: Childcare costs ~¥38k/month outside Tokyo for children under 3"

4. **NISA/iDeCo opportunity:**
   - If annual savings > 360,000: "Your savings could fund a tsumitate NISA account (max ¥1.2M/year)"
   - If annual savings > 816,000: "Consider maxing out both NISA and iDeCo contributions"

5. **Rent-to-income ratio:**
   - If target rent > nenshu * 0.25 / 12: "Warning: Rent would exceed 25% of your gross income — generally recommended to stay under this threshold"

6. **Goal acceleration (already exists):**
   - GoalImpactCard already shows this — just ensure it's integrated with new childcare data

**Implementation:**
- New utility: `backend/app/utils/relocation_advice.py` — pure functions that take comparison data and return list of advice strings
- Add `advice: list[str]` to RelocationCompareResponse
- New frontend component: `frontend/src/components/relocation/AdviceCard.tsx`
- i18n: advice templates with interpolation (not hardcoded strings)

**Files to create/modify:**
- `backend/app/utils/relocation_advice.py` — advice generator (new)
- `backend/app/services/relocation_service.py` — call advice generator
- `backend/app/schemas/relocation.py` — add advice to response
- `frontend/src/components/relocation/AdviceCard.tsx` — display component (new)
- `frontend/src/pages/RelocationPage.tsx` — add AdviceCard
- Locale files (en/ja/vi) — advice templates

---

## Implementation Order

```
Phase 1 (quick): Thousands separator (30 min)
Phase 2 (parallel):
  ├── Postal code input (backend + frontend)
  └── Childcare toggle (backend + frontend)
Phase 3: Rule-based advice (backend + frontend)
Phase 4: Tests for all new logic
```

## Risk Notes
- Zipcloud API has no documented rate limits — add caching + timeout
- Childcare policy may change — make rules configurable (not hardcoded magic numbers)
- Keep childcare amounts as constants in one place for easy updates
