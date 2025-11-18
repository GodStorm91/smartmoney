# Goal Achievability Feature - Phase 1 Implementation Specification

**Version**: 1.0
**Date**: 2025-11-18
**Status**: Approved for Implementation
**Effort Estimate**: 4-6 hours

---

## Executive Summary

Add real-time goal achievability metrics to SmartMoney dashboard, showing users whether their financial goals are realistic based on current cashflow. Provides actionable guidance to adjust spending or revise targets.

**Key Deliverables**:
1. Backend calculation method for goal achievability
2. Enhanced API responses with achievability metrics
3. Dashboard UI widgets with 5-tier status indicators
4. Actionable recommendations for deficit scenarios

---

## Problem Statement

**Current Situation**:
- Users set financial goals (1/3/5/10 year horizons)
- System shows historical progress (% saved so far)
- **Missing**: Forward-looking feasibility based on current cashflow

**User Pain Point**:
- Goal shows "12% complete" but user doesn't know if remaining 88% is achievable
- October 2025 data: -¥1,801,008 net → severe deficit
- Need immediate feedback to adjust behavior

**Desired Outcome**:
- Dashboard shows: "At current rate (-¥1.8M/month), you're ¥105M short on your 5-year ¥10M goal"
- Clear guidance: "Cut expenses by ¥1.97M/month OR lower target to achievable amount"

---

## Data Analysis

### Available Data
```
Month     | Income      | Expense     | Net
----------|-------------|-------------|-------------
2025-11   | ¥823,935    | ¥940,795    | -¥116,860   (incomplete)
2025-10   | ¥856,831    | ¥2,657,839  | -¥1,801,008 (last complete)
```

**Key Insights**:
- Only 2 months of data available
- October shows severe spending (¥2.6M expenses!)
- November trending better but still negative
- **Baseline**: Use Oct 2025 (-¥1.8M) as "current monthly net"

---

## Technical Specification

### 1. Calculation Algorithm

#### **Core Formula (Simple Linear Projection)**

```python
# Input
current_monthly_net = last_complete_month_net  # From transactions
months_remaining = goal_months_total - months_elapsed
target_amount = goal.target_amount
total_saved = net_savings_so_far

# Calculation
achievable_amount = current_monthly_net × months_remaining
achievable_percentage = (achievable_amount ÷ target_amount) × 100
required_monthly = (target_amount - total_saved) ÷ months_remaining
monthly_gap = required_monthly - current_monthly_net

# Status Determination
if achievable_percentage >= 100:
    status_tier = "on_track"      # 🟢 Green
elif achievable_percentage >= 50:
    status_tier = "achievable"    # 🔵 Blue
elif achievable_percentage >= 0:
    status_tier = "challenging"   # 🟠 Orange
elif achievable_percentage >= -50:
    status_tier = "deficit"       # 🟡 Yellow
else:
    status_tier = "severe_deficit" # 🔴 Red
```

#### **Example Calculation (5-Year Goal)**

Given:
- Target: ¥10,000,000
- Current saved: ¥1,200,000 (12%)
- Months remaining: 50
- Current monthly net: -¥1,801,008 (Oct 2025)

Calculate:
```
achievable_amount = -1,801,008 × 50 = -90,050,400
achievable_% = (-90,050,400 ÷ 10,000,000) × 100 = -900.5%
required_monthly = (10,000,000 - 1,200,000) ÷ 50 = 176,000
monthly_gap = 176,000 - (-1,801,008) = 1,977,008
status_tier = "severe_deficit" (< -50%)
```

Result: **"Need to improve cashflow by ¥1,977,008/month"**

---

### 2. Backend Implementation

#### **File: `backend/app/services/goal_service.py`**

Add new static method:

```python
@staticmethod
def calculate_achievability(db: Session, goal: Goal) -> dict:
    """Calculate goal achievability based on current cashflow.

    Uses last complete month's net cashflow to project future savings.

    Args:
        db: Database session
        goal: Goal object

    Returns:
        Dictionary with achievability metrics:
        - current_monthly_net: Last complete month's net cashflow
        - achievable_amount: Projected total if current rate continues
        - achievable_percentage: % of goal achievable at current rate
        - required_monthly: Monthly savings needed to hit goal
        - monthly_gap: Difference between required and current
        - status_tier: One of [on_track, achievable, challenging, deficit, severe_deficit]
        - recommendation: Actionable guidance text
        - data_source: Which month's data was used (e.g., "2025-10")
    """

    # 1. Get last complete month's net cashflow
    today = date.today()
    last_month = today.replace(day=1) - relativedelta(days=1)
    last_month_key = last_month.strftime("%Y-%m")

    # Query last month's net
    result = db.query(
        func.sum(case((Transaction.is_income, Transaction.amount), else_=0)).label("income"),
        func.sum(case((~Transaction.is_income, Transaction.amount), else_=0)).label("expenses")
    ).filter(
        ~Transaction.is_transfer,
        Transaction.month_key == last_month_key
    ).first()

    income = result.income or 0
    expenses = abs(result.expenses or 0)
    current_monthly_net = income - expenses

    # 2. Calculate time metrics (reuse existing logic)
    start_date = goal.start_date or db.query(func.min(Transaction.date)).scalar() or today
    target_date = start_date + relativedelta(years=goal.years)
    months_total = goal.years * 12
    months_elapsed = (today.year - start_date.year) * 12 + (today.month - start_date.month)
    months_remaining = max(months_total - months_elapsed, 1)

    # 3. Calculate savings so far
    total_saved = GoalService._calculate_net_savings(db, start_date)

    # 4. Calculate achievability
    achievable_amount = current_monthly_net * months_remaining
    achievable_percentage = (achievable_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    required_monthly = (goal.target_amount - total_saved) / months_remaining
    monthly_gap = required_monthly - current_monthly_net

    # 5. Determine status tier
    if achievable_percentage >= 100:
        status_tier = "on_track"
    elif achievable_percentage >= 50:
        status_tier = "achievable"
    elif achievable_percentage >= 0:
        status_tier = "challenging"
    elif achievable_percentage >= -50:
        status_tier = "deficit"
    else:
        status_tier = "severe_deficit"

    # 6. Generate recommendation
    recommendation = GoalService._generate_recommendation(
        status_tier, monthly_gap, goal.target_amount, achievable_amount
    )

    return {
        "current_monthly_net": current_monthly_net,
        "achievable_amount": achievable_amount,
        "achievable_percentage": round(achievable_percentage, 1),
        "required_monthly": round(required_monthly, 0),
        "monthly_gap": round(monthly_gap, 0),
        "status_tier": status_tier,
        "recommendation": recommendation,
        "data_source": last_month_key,
        "months_remaining": months_remaining,
    }


@staticmethod
def _generate_recommendation(status_tier: str, monthly_gap: int, target: int, achievable: int) -> str:
    """Generate actionable recommendation based on status."""

    if status_tier == "on_track":
        return "Great! Maintain current savings rate to achieve your goal."

    elif status_tier == "achievable":
        gap_formatted = f"¥{abs(monthly_gap):,}"
        return f"Increase savings by {gap_formatted}/month to stay on track."

    elif status_tier == "challenging":
        gap_formatted = f"¥{abs(monthly_gap):,}"
        return f"Tight but possible. Increase savings by {gap_formatted}/month."

    elif status_tier in ["deficit", "severe_deficit"]:
        gap_formatted = f"¥{abs(monthly_gap):,}"
        achievable_target = max(achievable, 0)
        achievable_formatted = f"¥{achievable_target:,}"

        return (f"Not achievable at current rate. Options: "
                f"(1) Cut expenses by {gap_formatted}/month, or "
                f"(2) Lower target to {achievable_formatted}")

    return "Insufficient data to make recommendation."
```

#### **File: `backend/app/routes/goals.py`**

Update existing endpoint to include achievability:

```python
@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: int,
    include_achievability: bool = Query(True, description="Include achievability metrics"),
    db: Session = Depends(get_db),
):
    """Get goal progress with optional achievability metrics."""

    goal = GoalService.get_goal(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get existing progress metrics
    progress = GoalService.calculate_goal_progress(db, goal)

    # Add achievability metrics if requested
    if include_achievability:
        achievability = GoalService.calculate_achievability(db, goal)
        progress["achievability"] = achievability

    return progress
```

#### **File: `backend/app/schemas/goal.py`**

Add new response schemas:

```python
class GoalAchievabilityResponse(BaseModel):
    """Schema for goal achievability metrics."""

    current_monthly_net: int
    achievable_amount: int
    achievable_percentage: float
    required_monthly: int
    monthly_gap: int
    status_tier: str  # on_track, achievable, challenging, deficit, severe_deficit
    recommendation: str
    data_source: str  # e.g., "2025-10"
    months_remaining: int


class GoalProgressResponse(BaseModel):
    """Enhanced schema for goal progress with achievability."""

    # Existing fields
    goal_id: int
    years: int
    target_amount: int
    start_date: str
    target_date: str
    current_date: str
    total_saved: int
    progress_percentage: float
    months_total: int
    months_elapsed: int
    months_remaining: int
    avg_monthly_net: int
    needed_per_month: int
    needed_remaining: int
    projected_total: int
    status: str  # ahead, on_track, behind

    # New achievability field (optional)
    achievability: Optional[GoalAchievabilityResponse] = None
```

---

### 3. Frontend Implementation

#### **Component: `frontend/src/components/goals/GoalAchievabilityCard.tsx`**

New component to display achievability metrics:

```typescript
interface GoalAchievabilityCardProps {
  achievability: {
    current_monthly_net: number
    achievable_percentage: number
    required_monthly: number
    monthly_gap: number
    status_tier: 'on_track' | 'achievable' | 'challenging' | 'deficit' | 'severe_deficit'
    recommendation: string
    data_source: string
  }
  goalName: string
}

export function GoalAchievabilityCard({ achievability, goalName }: GoalAchievabilityCardProps) {
  const statusConfig = {
    on_track: { color: 'green', icon: '🟢', label: 'On Track' },
    achievable: { color: 'blue', icon: '🔵', label: 'Achievable' },
    challenging: { color: 'orange', icon: '🟠', label: 'Challenging' },
    deficit: { color: 'yellow', icon: '🟡', label: 'Deficit' },
    severe_deficit: { color: 'red', icon: '🔴', label: 'Severe Deficit' },
  }

  const config = statusConfig[achievability.status_tier]
  const isNegative = achievability.monthly_gap > 0

  return (
    <Card className="border-l-4" style={{ borderLeftColor: config.color }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{config.icon}</span>
        <h3 className="text-lg font-semibold">{config.label}</h3>
      </div>

      {/* Achievability Percentage */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">Achievable at Current Rate</p>
        <p className={`text-3xl font-bold ${achievability.achievable_percentage < 0 ? 'text-red-600' : 'text-blue-600'}`}>
          {achievability.achievable_percentage > 0 ? '+' : ''}{achievability.achievable_percentage.toFixed(1)}%
        </p>
      </div>

      {/* Current vs Required */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Current Monthly Net</p>
          <p className={`text-lg font-semibold ${achievability.current_monthly_net < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrencySigned(achievability.current_monthly_net)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Required Monthly</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(achievability.required_monthly)}
          </p>
        </div>
      </div>

      {/* Gap Alert */}
      {isNegative && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-red-900">
            ⚠️ Monthly Gap: {formatCurrency(Math.abs(achievability.monthly_gap))}
          </p>
          <p className="text-xs text-red-700 mt-1">
            You need to save {formatCurrency(Math.abs(achievability.monthly_gap))} more per month
          </p>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-900 mb-1">💡 Recommendation</p>
        <p className="text-sm text-blue-800">{achievability.recommendation}</p>
      </div>

      {/* Data Source */}
      <p className="text-xs text-gray-400 mt-3">
        Based on {achievability.data_source} cashflow
      </p>
    </Card>
  )
}
```

#### **Update: `frontend/src/pages/Dashboard.tsx`**

Add achievability cards to dashboard:

```typescript
// Fetch goals with achievability
const { data: goalsWithAchievability } = useQuery({
  queryKey: ['goals-achievability'],
  queryFn: async () => {
    const goals = await fetchGoals()
    const goalsWithMetrics = await Promise.all(
      goals.map(async (goal) => {
        const progress = await fetchGoalProgress(goal.id, true) // include_achievability=true
        return { ...goal, ...progress }
      })
    )
    return goalsWithMetrics
  },
})

// In render
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {goalsWithAchievability?.map((goal) => (
    <GoalAchievabilityCard
      key={goal.id}
      goalName={`${goal.years}-Year Goal`}
      achievability={goal.achievability}
    />
  ))}
</div>
```

---

## UI/UX Design Mockups

### Dashboard Widget Layout

```
┌─────────────────────────────────────────────────────────────┐
│ SmartMoney Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ 5-Year Goal          │  │ 10-Year Goal         │        │
│ │ ════════════════════ │  │ ════════════════════ │        │
│ │ 🔴 Severe Deficit    │  │ 🟡 Deficit           │        │
│ │                      │  │                      │        │
│ │ Achievable at        │  │ Achievable at        │        │
│ │ Current Rate         │  │ Current Rate         │        │
│ │ -900.5%              │  │ -180.1%              │        │
│ │ ────────────────     │  │ ────────────────     │        │
│ │ Current Monthly Net  │  │ Current Monthly Net  │        │
│ │ -¥1,801,008         │  │ -¥1,801,008         │        │
│ │                      │  │                      │        │
│ │ Required Monthly     │  │ Required Monthly     │        │
│ │ ¥176,000            │  │ ¥75,000             │        │
│ │                      │  │                      │        │
│ │ ⚠️ Monthly Gap       │  │ ⚠️ Monthly Gap       │        │
│ │ ¥1,977,008          │  │ ¥1,876,008          │        │
│ │ Need to save        │  │ Need to save        │        │
│ │ ¥1,977,008 more     │  │ ¥1,876,008 more     │        │
│ │ per month           │  │ per month           │        │
│ │ ─────────────────── │  │ ─────────────────── │        │
│ │ 💡 Recommendation   │  │ 💡 Recommendation   │        │
│ │ Not achievable at   │  │ Not achievable at   │        │
│ │ current rate.       │  │ current rate.       │        │
│ │ Options:            │  │ Options:            │        │
│ │ (1) Cut expenses by │  │ (2) Lower target to │        │
│ │     ¥1,977,008/mo   │  │     achievable      │        │
│ │ (2) Lower target to │  │     amount          │        │
│ │     ¥0              │  │                     │        │
│ │                     │  │                     │        │
│ │ Based on 2025-10    │  │ Based on 2025-10    │        │
│ │ cashflow            │  │ cashflow            │        │
│ └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Color Coding System

| Status Tier      | Color  | Icon | Achievability Range | User Action Required    |
|------------------|--------|------|---------------------|-------------------------|
| **On Track**     | Green  | 🟢   | ≥ 100%              | Maintain habits         |
| **Achievable**   | Blue   | 🔵   | 50% - 99%           | Small adjustments       |
| **Challenging**  | Orange | 🟠   | 0% - 49%            | Moderate spending cuts  |
| **Deficit**      | Yellow | 🟡   | -50% - -1%          | Major habit change      |
| **Severe Deficit**| Red   | 🔴   | < -50%              | Revise goal or drastic cuts |

### Mobile Responsive Design

```
┌──────────────────────┐
│ 5-Year Goal          │
│ 🔴 Severe Deficit    │
│ ──────────────────── │
│                      │
│ -900.5%              │
│ achievable           │
│                      │
│ Current:  -¥1.8M/mo  │
│ Required:  ¥176K/mo  │
│ Gap:      ¥1.98M/mo  │
│                      │
│ 💡 Cut ¥1.98M/mo or  │
│    lower target      │
│                      │
│ [View Details →]     │
└──────────────────────┘
```

---

## API Specification

### Endpoint: `GET /api/goals/{goal_id}/progress`

**Request**:
```http
GET /api/goals/1/progress?include_achievability=true
```

**Response** (Status 200):
```json
{
  "goal_id": 1,
  "years": 5,
  "target_amount": 10000000,
  "start_date": "2024-10-01",
  "target_date": "2029-10-01",
  "current_date": "2025-11-18",
  "total_saved": 1200000,
  "progress_percentage": 12.0,
  "months_total": 60,
  "months_elapsed": 13,
  "months_remaining": 47,
  "avg_monthly_net": 92308,
  "needed_per_month": 187234,
  "needed_remaining": 8800000,
  "projected_total": 5538476,
  "status": "behind",

  "achievability": {
    "current_monthly_net": -1801008,
    "achievable_amount": -84647376,
    "achievable_percentage": -846.5,
    "required_monthly": 187234,
    "monthly_gap": 1988242,
    "status_tier": "severe_deficit",
    "recommendation": "Not achievable at current rate. Options: (1) Cut expenses by ¥1,988,242/month, or (2) Lower target to ¥0",
    "data_source": "2025-10",
    "months_remaining": 47
  }
}
```

**Error Responses**:
- `404 Not Found`: Goal doesn't exist
- `500 Internal Server Error`: Database/calculation error

---

### Endpoint: `GET /api/dashboard/summary`

**Enhancement**: Add `goals_achievability` array to existing response.

**Response**:
```json
{
  "income": 823935,
  "expense": 940795,
  "net": -116860,
  "income_change": -3.8,
  "expense_change": -64.6,
  "net_change": -93.5,

  "goals_achievability": [
    {
      "goal_id": 1,
      "years": 5,
      "target_amount": 10000000,
      "achievable_percentage": -846.5,
      "status_tier": "severe_deficit",
      "monthly_gap": 1988242
    },
    {
      "goal_id": 2,
      "years": 10,
      "target_amount": 50000000,
      "achievable_percentage": -338.6,
      "status_tier": "severe_deficit",
      "monthly_gap": 5642708
    }
  ]
}
```

---

## Test Cases

### Unit Tests (Backend)

#### Test Suite: `test_goal_achievability.py`

```python
class TestGoalAchievability:

    def test_calculate_achievability_positive_cashflow(self, db, goal):
        """Test with positive monthly net (on track scenario)."""
        # Setup: Create transactions with +500K/month net
        # Expected: achievable_percentage > 100, status_tier = "on_track"

    def test_calculate_achievability_negative_cashflow(self, db, goal):
        """Test with severe negative cashflow."""
        # Setup: Create transactions with -1.8M/month net (actual data)
        # Expected: achievable_percentage < -50, status_tier = "severe_deficit"

    def test_calculate_achievability_no_transactions(self, db, goal):
        """Test edge case with no transaction history."""
        # Expected: current_monthly_net = 0, recommendation about insufficient data

    def test_calculate_achievability_partial_month(self, db, goal):
        """Test that current incomplete month is ignored."""
        # Setup: Transactions in Nov 2025 (current month)
        # Expected: Should use Oct 2025 data instead

    def test_generate_recommendation_severe_deficit(self):
        """Test recommendation text for severe deficit."""
        rec = GoalService._generate_recommendation("severe_deficit", 1988242, 10000000, -84647376)
        assert "Cut expenses by" in rec
        assert "1,988,242" in rec

    def test_generate_recommendation_on_track(self):
        """Test recommendation for on-track scenario."""
        rec = GoalService._generate_recommendation("on_track", -50000, 10000000, 12000000)
        assert "Maintain" in rec

    def test_achievability_with_multiple_months(self, db, goal):
        """Test calculation uses only last complete month."""
        # Setup: Oct = -1.8M, Nov = -116K
        # Expected: Should use Oct data, not average
```

### Integration Tests

```python
def test_goal_progress_endpoint_includes_achievability(client, auth_headers):
    """Test /api/goals/{id}/progress endpoint with achievability flag."""
    response = client.get("/api/goals/1/progress?include_achievability=true")
    assert response.status_code == 200
    data = response.json()
    assert "achievability" in data
    assert "status_tier" in data["achievability"]

def test_dashboard_summary_includes_goals_achievability(client, auth_headers):
    """Test /api/dashboard/summary includes goals array."""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "goals_achievability" in data
    assert isinstance(data["goals_achievability"], list)
```

### Frontend Tests

```typescript
describe('GoalAchievabilityCard', () => {
  it('displays severe deficit status correctly', () => {
    const achievability = {
      status_tier: 'severe_deficit',
      achievable_percentage: -846.5,
      current_monthly_net: -1801008,
      required_monthly: 187234,
      monthly_gap: 1988242,
      recommendation: 'Cut expenses...',
      data_source: '2025-10'
    }

    render(<GoalAchievabilityCard achievability={achievability} goalName="5-Year Goal" />)

    expect(screen.getByText('🔴')).toBeInTheDocument()
    expect(screen.getByText('Severe Deficit')).toBeInTheDocument()
    expect(screen.getByText('-846.5%')).toBeInTheDocument()
  })

  it('shows gap alert when monthly gap is positive', () => {
    // Test that red alert box appears
  })

  it('formats currency correctly', () => {
    // Test JPY formatting
  })
})
```

### Edge Cases to Test

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| **No transactions yet** | Show "Insufficient data" message | High |
| **Only current month data** | Fallback to current month with warning | High |
| **Goal already achieved** | Show "Achieved! Consider new goal" | Medium |
| **Negative target amount** | Validation error (shouldn't exist) | Low |
| **Months remaining = 0** | Show "Goal deadline passed" | Medium |
| **Division by zero** | Handle gracefully, default to 0 | High |
| **Very large numbers** | Format with K/M suffixes | Low |
| **Transfers included** | Ensure is_transfer excluded | Critical |

---

## Data Migration

**Not Required** - No schema changes needed. All calculations are runtime-only.

---

## Performance Considerations

### Query Optimization

**Existing queries**:
- `_calculate_net_savings()`: Already exists, reuse
- Monthly net calculation: Single query with GROUP BY

**Performance targets**:
- Goal achievability calculation: < 100ms
- Dashboard with 4 goals: < 500ms total

**Optimization strategies**:
1. Cache last month's net in Redis (Phase 2)
2. Pre-calculate on transaction insert (over-engineering for Phase 1)
3. Database indexes already exist on `month_key`

---

## Rollout Strategy

### Phase 1.1: Backend Only (Week 1)
- [ ] Implement `calculate_achievability()` method
- [ ] Add unit tests
- [ ] Update API endpoint
- [ ] Deploy to staging
- [ ] Verify with Postman/curl

### Phase 1.2: Frontend Integration (Week 1)
- [ ] Create `GoalAchievabilityCard` component
- [ ] Update Dashboard page
- [ ] Add frontend tests
- [ ] Test with real data
- [ ] Deploy to production

### Phase 1.3: Monitoring (Week 2)
- [ ] Monitor API response times
- [ ] Track user engagement with new widget
- [ ] Gather user feedback
- [ ] Plan Phase 2 enhancements

---

## Success Metrics

### Technical Metrics
- [ ] API response time < 500ms for dashboard
- [ ] Zero calculation errors in logs
- [ ] 100% test coverage for achievability logic

### User Metrics
- [ ] 80% of users view achievability within first week
- [ ] 50% of users adjust goals or spending habits
- [ ] User feedback: "This helped me understand my financial situation"

---

## Known Limitations (Phase 1)

**Accepted trade-offs**:
1. **Uses single month**: Doesn't smooth volatility with multi-month average
2. **No trend analysis**: Doesn't project improving/declining trends
3. **Linear projection**: Assumes cashflow stays constant
4. **No cross-goal analysis**: Doesn't account for competing goals
5. **No seasonal adjustments**: Doesn't handle bonus months, tax refunds

**Mitigation**: Phase 2 will address these based on user feedback.

---

## Questions for Clarification

Before starting implementation:

1. **Naming**: Should the widget be "Goal Achievability" or "Goal Forecast"?
2. **Default behavior**: Include achievability by default in `/api/goals` list endpoint?
3. **Negative messaging**: User preference for "Deficit" vs "Not Achievable"?
4. **Data privacy**: Any concerns showing negative cashflow prominently?

---

## Implementation Checklist

### Backend
- [ ] Add `calculate_achievability()` to `GoalService`
- [ ] Add `_generate_recommendation()` helper
- [ ] Update `GoalProgressResponse` schema
- [ ] Add `GoalAchievabilityResponse` schema
- [ ] Update `/api/goals/{id}/progress` endpoint
- [ ] Enhance `/api/dashboard/summary` endpoint
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests
- [ ] Update API documentation

### Frontend
- [ ] Create `GoalAchievabilityCard.tsx` component
- [ ] Create status config constants
- [ ] Update `Dashboard.tsx` to fetch achievability
- [ ] Add `fetchGoalProgress()` service method
- [ ] Add currency formatting helpers
- [ ] Write component tests
- [ ] Test mobile responsive design
- [ ] Add loading states
- [ ] Add error handling

### DevOps
- [ ] Test in local environment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Set up alerts for calculation errors

---

## Appendix A: Calculation Examples

### Example 1: Severe Deficit (Current Real Data)

**Inputs**:
- Goal: ¥10,000,000 (5 years)
- Current saved: ¥1,200,000
- Oct 2025 net: -¥1,801,008
- Months remaining: 47

**Outputs**:
```
achievable_amount = -1,801,008 × 47 = -84,647,376
achievable_% = (-84,647,376 ÷ 10,000,000) × 100 = -846.5%
required_monthly = (10,000,000 - 1,200,000) ÷ 47 = 187,234
monthly_gap = 187,234 - (-1,801,008) = 1,988,242
status = "severe_deficit"
```

**Recommendation**: "Cut expenses by ¥1,988,242/month OR lower target to ¥0"

---

### Example 2: On Track Scenario

**Inputs**:
- Goal: ¥10,000,000 (5 years)
- Current saved: ¥2,500,000
- Last month net: ¥250,000
- Months remaining: 40

**Outputs**:
```
achievable_amount = 250,000 × 40 = 10,000,000
achievable_% = (10,000,000 ÷ 10,000,000) × 100 = 100%
required_monthly = (10,000,000 - 2,500,000) ÷ 40 = 187,500
monthly_gap = 187,500 - 250,000 = -62,500 (surplus!)
status = "on_track"
```

**Recommendation**: "Great! Maintain current savings rate to achieve your goal."

---

## Appendix B: Color Palette Reference

```css
/* Status Colors */
--status-on-track: #10b981;      /* Green 500 */
--status-achievable: #3b82f6;    /* Blue 500 */
--status-challenging: #f97316;   /* Orange 500 */
--status-deficit: #eab308;       /* Yellow 500 */
--status-severe: #ef4444;        /* Red 500 */

/* Background Colors */
--bg-on-track: #d1fae5;         /* Green 100 */
--bg-achievable: #dbeafe;       /* Blue 100 */
--bg-challenging: #ffedd5;      /* Orange 100 */
--bg-deficit: #fef3c7;          /* Yellow 100 */
--bg-severe: #fee2e2;           /* Red 100 */
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-18 | Initial specification | Solution Brainstormer |

---

**End of Specification Document**
