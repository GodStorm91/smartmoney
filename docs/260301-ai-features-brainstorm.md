# AI Features Brainstorm — What to Build Next

**Date:** 2026-03-01
**Status:** Brainstorm complete, pending decision

---

## Context

Phase 1 Quick Wins (v0.3.0) shipped. Research conducted on AI-era personal finance features across 30+ sources. Cross-referenced with codebase audit of existing features.

## Key Insight: SmartMoney Already Has More Than We Thought

The roadmap (v0.5-v0.8) planned features that were **already shipped** via Claude AI integration:

| Planned Feature | Roadmap Version | Already Shipped? |
|---|---|---|
| ML categorization | v0.5.0 | YES — Claude `/api/ai` batch endpoint |
| Anomaly detection | v0.8.0 | YES — `/api/anomalies` |
| Subscription detection | v0.8.0 | YES — RecurringSuggestionService |
| Budget recommendations | v0.8.0 | YES — Claude AI budget generation |
| Cashflow forecasting | v0.8.0 | **NO — real gap** |
| Milestone notifications | v0.7.0 | YES — v0.3.0 goal milestones |
| Receipt OCR | v0.6.0 | PARTIAL — PayPay OCR exists |

**Implication:** v0.5.0-v0.8.0 roadmap is stale. Many items done, some obsoleted by Claude integration.

---

## Researcher Recommendation vs Reality

The researcher recommended on-device AI (TinyLlama, Prophet, ONNX.js). **This is wrong for SmartMoney:**

| Claim | Reality |
|---|---|
| "Privacy requires on-device" | SmartMoney is self-hosted; data stays on user's server already |
| "TinyLlama for chat" | Claude Sonnet already integrated with tool calling + credit billing |
| "3 engineers, $232k" | Overkill; SmartMoney is a side project with existing AI infra |
| "On-device = free at scale" | Claude credit system already handles billing; on-device adds 2GB download |

**Correct approach:** Enhance existing Claude integration + add server-side analytics. Privacy preserved by self-hosting.

---

## Actual Feature Gaps (After Reconciliation)

### Tier 1 — High Impact, Build Next

**1. Cashflow Forecasting (3 SP)**
- Predict 3-month spending/income based on history + recurring transactions
- Use Python `statsmodels` (ARIMA/ETS) on backend — simple, no ML framework needed
- Dashboard widget: "Projected balance by month end"
- Alert when predicted shortfall detected
- Demand: HIGH | Effort: MEDIUM | Differentiation: HIGH

**2. Proactive AI Insights (3 SP)**
- Weekly AI-generated financial digest pushed to dashboard
- Examples: "Dining up 40% vs 3-month avg", "On pace to hit goal 2 months early"
- Cron job generates via existing Claude API + financial context builder
- Stored as `InAppNotification` with type `ai_insight`
- Demand: VERY HIGH | Effort: LOW-MEDIUM | Differentiation: HIGH

**3. Financial Health Score (2 SP)**
- Single 0-100 score: savings rate, debt ratio, emergency fund, goal progress, budget adherence
- Dashboard hero metric alongside net worth
- Simple weighted formula, no ML needed
- Great for marketing ("Your financial health: 72/100")
- Demand: MEDIUM | Effort: LOW | Differentiation: MEDIUM

### Tier 2 — Nice to Have

**4. Enhanced NL Transaction Search (2 SP)**
- "How much on groceries in January?" via existing Claude chat
- Add `search_transactions` + `get_spending_summary` tools to tool executor
- Chat UI already exists — just expand tool definitions
- Demand: MEDIUM | Effort: LOW | Differentiation: MEDIUM

**5. What-If Scenario Modeling (3 SP)**
- "What if I save ¥10K more/month?" — show goal timeline impact
- "What if I cut dining by 50%?" — show monthly savings
- Simple calculator, Claude can narrate results
- Demand: MEDIUM | Effort: MEDIUM | Differentiation: HIGH

**6. Smart Savings Tips (1 SP)**
- Analyze spending, suggest actionable cuts
- "Daily coffee → weekly = save ¥12,000/mo"
- Claude prompt + spending data, minimal backend work
- Demand: MEDIUM | Effort: LOW | Differentiation: LOW

### Tier 3 — Defer

- **Privacy dashboard** — self-hosting already solves this
- **On-device models** — wrong architecture for self-hosted webapp
- **Voice interface** — low demand, high complexity
- **Bank API integration** — Japan banks don't offer public APIs
- **Regional benchmarking enhancement** — already exists via e-stat

---

## Recommended Phase 2: "AI Insights Sprint" (~8 SP)

| # | Feature | SP | Backend | Frontend | AI |
|---|---|---|---|---|---|
| 1 | Cashflow Forecasting | 3 | statsmodels endpoint | Dashboard chart | No |
| 2 | Proactive AI Insights | 3 | Cron + Claude API | Notification cards | Existing |
| 3 | Financial Health Score | 2 | Score calculator | Dashboard widget | No |

**Why these 3:**
- Forecasting = #1 missing feature per research + user demand
- Proactive insights = highest engagement driver (Cleo/Emma model proves this)
- Health score = low effort, high perceived value, marketing differentiator

**What NOT to build:**
- Don't replace Claude with TinyLlama
- Don't add NL search yet (enhance chat tools instead, Tier 2)
- Don't build privacy dashboard (self-hosted = inherently private)

---

## Roadmap Cleanup Needed

The v0.5.0-v0.8.0 roadmap sections are stale. Many items shipped under different versions or obsoleted by Claude AI. Recommend:

1. Mark shipped items as complete with cross-reference to actual version
2. Remove items obsoleted by existing AI features
3. Insert Phase 2 as v0.4.0 (AI Insights Sprint)
4. Consolidate remaining unshipped items into updated v0.5.0+

---

## Unresolved Questions

1. Should forecasting use Prophet (heavier, more accurate) or statsmodels ETS (lighter, good enough)?
2. How many free AI insight generations per month before credits kick in?
3. Should health score be gamified (levels, badges) or kept simple?
4. Priority of NL search tools vs what-if modeling for Phase 3?

---

## Research Materials

Full research documentation at:
- `docs/AI_EXECUTIVE_SUMMARY.md` — one-pager decision doc
- `docs/ai-research-index.md` — index to 12 research documents
- `docs/ai-features-*.md` — individual feature deep-dives
- `docs/ai-competitive-landscape.md` — competitor analysis
- `docs/ai-user-research-sentiment.md` — user demand signals
