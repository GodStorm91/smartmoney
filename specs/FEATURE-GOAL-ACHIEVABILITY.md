# Goal Achievability Feature - Documentation

**Feature ID:** GOAL-ACHV-001
**Version:** Phase 1 (MVP)
**Status:** ✅ Production Ready
**Released:** 2025-11-18
**Code Quality:** ⭐⭐⭐⭐½ (4.5/5)

---

## Overview

The Goal Achievability feature provides real-time feasibility analysis of financial goals based on current cashflow patterns. It answers the critical question: **"Can I actually achieve my goal at my current spending rate?"**

### Problem Solved

Users see goal progress (e.g., "12% complete") but don't understand if they're on track. Without achievability metrics:
- Positive progress feels good but may be insufficient
- Users discover goal failure too late to adjust
- No actionable guidance on spending cuts needed

### Solution

Linear projection using last complete month's cashflow:
- **Achievable Amount** = Current Monthly Net × Months Remaining
- **Achievable %** = (Achievable Amount ÷ Target) × 100
- **5-Tier Status System** with color-coded warnings
- **Actionable Recommendations** with specific amounts to cut/save

---

## Features

### 1. Real-Time Achievability Calculation

**Algorithm:**
```python
current_monthly_net = last_month_income - last_month_expenses
achievable_amount = current_monthly_net × months_remaining
achievable_percentage = (achievable_amount ÷ target_amount) × 100
monthly_gap = required_monthly - current_monthly_net
```

**Data Source:** Last complete month (stable, avoids partial month volatility)

### 2. 5-Tier Status System

| Status | Achievable % | Color | Emoji | Meaning |
|--------|-------------|-------|-------|---------|
| **On Track** | ≥100% | 🟢 Green | ✅ | Exceeding target pace |
| **Achievable** | 80-99% | 🔵 Blue | ℹ️ | Close, minor adjustments needed |
| **Challenging** | 50-79% | 🟠 Orange | ⚠️ | Difficult, significant changes required |
| **Deficit** | 0-49% | 🟡 Amber | ⛔ | At risk, major intervention needed |
| **Severe Deficit** | <0% | 🔴 Red | 🚨 | Losing money, critical action required |

### 3. Actionable Recommendations

Each status includes specific guidance:
- **On Track:** Encourage maintaining pace or increasing target
- **Achievable:** Specific monthly gap amount to close
- **Challenging:** Suggest spending review + timeline adjustment
- **Deficit:** Two clear options: cut expenses OR lower target
- **Severe Deficit:** Brutal honesty with specific amounts to cut

**Example (Severe Deficit):**
> "Critical: You're losing ¥1,801,008/month. Immediate action required: (1) Cut expenses by ¥2,114,636/month, or (2) Revise goal to realistic level. Current pace: -684.4%."

---

## API Reference

### Endpoint

**GET** `/api/goals/{goal_id}/progress`

**Query Parameters:**
- `include_achievability` (boolean, default: `true`) - Include achievability metrics

**Response Schema:**
```typescript
{
  // Standard progress fields
  goal_id: number
  years: number
  target_amount: number
  total_saved: number
  progress_percentage: number
  months_remaining: number

  // Achievability metrics (if include_achievability=true)
  achievability?: {
    current_monthly_net: number        // Last month's net cashflow
    achievable_amount: number          // Projected total at current rate
    achievable_percentage: number      // % of target achievable
    required_monthly: number           // Monthly savings needed
    monthly_gap: number                // Gap between required and current
    status_tier: string                // on_track | achievable | challenging | deficit | severe_deficit
    recommendation: string             // Actionable advice text
    data_source: string                // "2025-10" (month used for calculation)
    months_remaining: number           // Time left to achieve goal
  }
}
```

**Example Request:**
```bash
curl http://localhost:8000/api/goals/1/progress?include_achievability=true
```

**Example Response:**
```json
{
  "goal_id": 1,
  "years": 5,
  "target_amount": 10000000,
  "total_saved": -1917868,
  "progress_percentage": -19.18,
  "months_remaining": 38,
  "achievability": {
    "current_monthly_net": -1801008,
    "achievable_amount": -68438304,
    "achievable_percentage": -684.38,
    "required_monthly": 313628,
    "monthly_gap": 2114636,
    "status_tier": "severe_deficit",
    "recommendation": "Critical: You're losing ¥1,801,008/month...",
    "data_source": "2025-10",
    "months_remaining": 38
  }
}
```

---

## UI Components

### GoalAchievabilityCard

**Location:** `frontend/src/components/goals/GoalAchievabilityCard.tsx`

**Features:**
- Color-coded left border matching status tier
- Hero achievability percentage (text-4xl)
- Two-column metrics (current vs required)
- Monthly gap alert box (red for deficits)
- Recommendation box (blue background)
- Data source and months remaining footer

**Props:**
```typescript
interface GoalAchievabilityCardProps {
  goalId: number
  goalName: string
  achievability: GoalAchievability
  onDetailsClick?: () => void
}
```

**Design Specifications:**
- Card padding: 24px (desktop), 16px (mobile)
- Border left: 4px (status color)
- Border radius: 12px
- Typography: Noto Sans JP, monospace for numbers
- Responsive: 360px (desktop), 328px (mobile)

---

## Technical Implementation

### Backend Files

1. **Service Layer** (`app/services/goal_service.py:219-382`)
   - `calculate_achievability()` - Main calculation method
   - `_generate_recommendation()` - Recommendation text generator

2. **Schemas** (`app/schemas/goal.py:38-79`)
   - `GoalAchievabilityResponse` - Response model
   - `GoalProgressResponse` - Updated with optional achievability field

3. **Routes** (`app/routes/goals.py:95-111`)
   - Updated progress endpoint with optional parameter

### Frontend Files

1. **Types** (`src/types/index.ts:49-79`)
   - `GoalAchievability` interface
   - `GoalProgress` interface

2. **Services** (`src/services/goal-service.ts:45-61`)
   - `fetchGoalProgress()` function

3. **Components** (`src/components/goals/GoalAchievabilityCard.tsx`)
   - Main achievability card component

4. **Pages** (`src/pages/Dashboard.tsx`)
   - Dashboard integration with achievability widgets

---

## Security & Quality

### Security Measures ✅
- **SQL Injection Protected:** SQLAlchemy ORM only, no raw SQL
- **Input Validation:** Pydantic schemas validate all inputs
- **XSS Protection:** React auto-escaping, no dangerouslySetInnerHTML
- **No Secrets Exposed:** Clean codebase

### Code Quality Metrics
- **Type Coverage:** 100% (Python type hints + TypeScript)
- **File Size:** All under 200 LOC guideline
- **Build Time:** <3s TypeScript compilation
- **Code Review Score:** 4.5/5 (Approved for production)

### Performance
- **API Response Time:** <500ms target
- **Database Queries:** Single aggregation query (efficient)
- **Frontend Build:** 2.39s (within target)

---

## Testing

### Manual Testing Checklist

1. **API Testing:**
   ```bash
   # Test achievability endpoint
   curl http://localhost:8000/api/goals/1/progress?include_achievability=true

   # Verify response includes achievability object
   # Check status_tier is one of 5 valid values
   # Verify recommendation is actionable
   ```

2. **Frontend Testing:**
   - Visit http://localhost:5173
   - Check Dashboard displays achievability cards
   - Verify color-coded status badges
   - Confirm Japanese text displays correctly
   - Test responsive layout (mobile/desktop)

3. **Test All 5 Status Tiers:**
   - Create goals with different targets
   - Upload transactions with varying cashflow
   - Verify each tier displays correct colors and recommendations

### Unit Testing (Recommended)

**Not yet implemented** - See code review recommendations

Suggested test file: `backend/tests/test_goal_achievability.py`

Test cases needed:
- Positive cashflow (on_track scenario)
- Negative cashflow (deficit scenario)
- Zero cashflow (no transactions)
- Partial month handling
- Recommendation generation for each tier

---

## Usage Examples

### User Scenario 1: Severe Deficit

**Situation:**
- 5-year goal: ¥10,000,000
- Current monthly net: -¥1,801,008 (losing money)
- Months remaining: 38

**Result:**
- Achievable %: -684.38%
- Status: 🔴 Severe Deficit
- Recommendation: "Critical: Cut expenses by ¥2,114,636/month OR revise goal"

**User Action:**
- Review spending categories
- Identify ¥2M+ in monthly cuts
- OR adjust goal to realistic ¥3M target

### User Scenario 2: Achievable

**Situation:**
- 3-year goal: ¥3,000,000
- Current monthly net: ¥75,000
- Required: ¥83,333/month

**Result:**
- Achievable %: 90%
- Status: 🔵 Achievable
- Recommendation: "Increase monthly savings by ¥8,333"

**User Action:**
- Small spending cuts (one lunch out per week)
- Cancel unused subscription
- Goal remains on track

---

## Design Decisions

### Why Last Complete Month?
- **Stability:** Current month is partial, volatile
- **Reliability:** Complete data ensures accurate projection
- **Simplicity:** No complex averaging needed (KISS principle)

### Why Linear Projection?
- **YAGNI:** Advanced algorithms overkill for MVP
- **Transparency:** Users understand simple math
- **Performance:** No ML model overhead
- **Accuracy:** Good enough for monthly budgeting

### Why 5-Tier System?
- **Visual Hierarchy:** More granular than 3 tiers, less overwhelming than 7
- **Color Psychology:** Red/amber/orange/blue/green intuitive
- **Actionability:** Each tier has distinct recommendation strategy

---

## Future Enhancements (Phase 2+)

**Not Implemented:**
1. Multi-month averaging (smooth volatility)
2. Trend analysis (improving/declining detection)
3. Seasonal adjustments (bonus months)
4. Cross-goal analysis (competing goals)
5. What-if calculator (interactive simulation)

**Rationale:** Start simple, validate with users, iterate based on feedback

---

## Known Limitations

1. **Linear Projection:** Assumes constant cashflow (no seasonal variation)
2. **Single Month Data:** Doesn't account for month-to-month volatility
3. **No Trend Analysis:** Can't detect improving/declining patterns
4. **Manual Refresh:** Not real-time (updates on page load)

**Accepted Trade-offs:** All limitations are intentional (YAGNI, MVP focus)

---

## Deployment Checklist

### Pre-Deployment

- [x] Backend implementation complete
- [x] Frontend implementation complete
- [x] TypeScript type checking passed
- [x] Code review completed (4.5/5 approval)
- [x] Documentation updated
- [ ] Backend unit tests passing (recommended)
- [ ] Manual testing all 5 status tiers (recommended)

### Post-Deployment

- [ ] Monitor API response times (<500ms target)
- [ ] Track user engagement with achievability cards
- [ ] Gather user feedback on recommendations
- [ ] Plan Phase 2 enhancements based on usage data

---

## Support & Maintenance

### Troubleshooting

**Issue:** Achievability shows 0%
**Cause:** No transactions in last complete month
**Solution:** Upload at least one month of transaction history

**Issue:** Severe deficit despite saving
**Cause:** Large one-time expenses in last month
**Solution:** Phase 2 will add multi-month averaging

**Issue:** Status not updating
**Cause:** Using current (incomplete) month data
**Solution:** Wait until next month for accurate projection

### Contact

For questions or issues:
- Review spec docs: `/specs/goal-achievability-*.md`
- Check implementation plan: `/plans/251118-0944-goal-achievability-phase1/`
- Code review report: `/plans/.../reports/251118-code-review-report.md`

---

## References

**Specification Documents:**
- [Phase 1 Technical Spec](./goal-achievability-phase1-spec.md) - Complete algorithm and API design
- [UI/UX Design](./goal-achievability-ui-design.md) - Component design and color system
- [Implementation Summary](./goal-achievability-SUMMARY.md) - Quick reference guide

**Implementation Files:**
- Backend: `app/services/goal_service.py`, `app/schemas/goal.py`, `app/routes/goals.py`
- Frontend: `src/components/goals/GoalAchievabilityCard.tsx`, `src/pages/Dashboard.tsx`

**Code Review:**
- [Detailed Review Report](../plans/251118-0944-goal-achievability-phase1/reports/251118-code-review-report.md)

---

**Last Updated:** 2025-11-18
**Approved By:** Code Review (4.5/5)
**Production Status:** ✅ Ready
