# ADR: Insight-to-Action Layer for SmartMoney

**Date:** 2026-03-26
**Status:** Accepted
**Revision:** v3 — merged insight-to-action-layer proposal (Codex) with pragmatic scoping
**Decision Makers:** Product/Engineering
**Context:** Reducing friction between existing insights and concrete user actions in a privacy-first finance app
**Supersedes:** `docs/decisions/260326-insight-to-action-layer.md` (merged into this doc)

---

## 1. Problem Statement

SmartMoney already has many insight surfaces — dashboard alerts, analytics charts, budget forecasts, goal cards, AI chat. The gap is not intelligence. **The gap is execution friction.** The app tells users what's happening but still expects them to interpret, decide, navigate, and manually fix.

The core question: **how do we turn existing insight into the next concrete action with minimal navigation, minimal thinking, and clear reversibility?**

Key reframe: this is a **product infrastructure layer**, not an "AI feature." Chat remains for explanation/negotiation. The primary execution path is cards, buttons, and pre-filled flows inside existing pages.

---

## 2. Research Process

Three independent researchers investigated from different angles, then findings were cross-examined:

| Researcher | Angle | Key Finding |
|---|---|---|
| **Behavioral** | Psychology & UX science | Pre-filled defaults get 70% adoption vs 20% manual. Loss-framing 2x more effective. 1 nudge/week max before fatigue. |
| **Technical** | Architecture & implementation | Action queue + APScheduler + PostgreSQL. 16 hours to build. Event-driven > cron for single-user. |
| **Skeptic** | Failure analysis & contrarian | Nudge-first apps (Digit, Qapital, Albert) died or pivoted. 9% day-30 retention for budgeting apps. Manual tracking > AI predictions for awareness. |

---

## 3. Key Debates & Resolutions

### Debate 1: Do nudges work in finance?

- **For:** Lab studies show 70% pre-fill adoption, Monzo 30% savings increase
- **Against:** Digit/Qapital/Albert all tried nudges and failed. Replication crisis in behavioral econ. >50% of effects fail to replicate.
- **Resolution:** Nudges work as a **supplement** to core utility, not as the product. Apps that survived (YNAB, Monzo) use nudges lightly. Apps that bet everything on nudges died.

### Debate 2: One-tap vs. full automation

- **For one-tap:** Preserves user agency, lower regulatory risk
- **For automation:** Plum's auto-save outperformed Qapital's rule-based nudges. Removing the decision entirely beats simplifying it.
- **Resolution:** Build infrastructure that supports both. Let user choose per-action: auto-execute or confirm.

### Debate 3: Is this the right investment?

- **For:** Competitive differentiator, proven UX patterns
- **Against:** SmartMoney's real differentiator is privacy + self-hosted + data clarity. Chasing AI nudges risks losing identity.
- **Resolution:** Invest minimally in action infrastructure. Don't bet the product on it. Measure before expanding.

### Debate 4: Regulatory risk

- **Risk:** Pre-filled budget suggestions could constitute "personal recommendation" under Japan FSA / MiFID II
- **Mitigation:** Frame as "based on your historical data" not "we recommend." Self-hosted = no client-advisor relationship. Start with low-risk actions only (budget suggestions, not investment advice).

---

## 4. Decision

### What We Will Build

**Phase 0 — Data Accuracy (prerequisite gate, before any smart actions)**

Operational gates (all must pass to proceed to Phase 1):

| Gate | Method | Threshold |
|---|---|---|
| Categorization accuracy | Spot-check 50 recent transactions, user confirms correct/incorrect | ≥85% (≥43/50 correct) |
| Budget tracking consistency | Audit: sum(transactions) == budget.spent for 3 random categories | ≥98% (no data corruption) |
| User confidence | Self-rated: "Do you trust the categories?" (1-5 scale) | ≥4/5 |

Notes:
- "Accuracy" = user-visible correctness (user agrees with category), not model confidence
- Industry baseline: Plaid ~89%, MX ~92%. Our ≥85% gate is realistic for rule+fuzzy+AI system
- Measurement repeatable monthly via spot-check script

**Phase 1 — Minimal Action Queue**

Effort: ~16 hours prototype, ~37-40 hours production-hardened (with dedup, undo safety, idempotency, instrumentation, tests).

Scope:
- `pending_actions` table in PostgreSQL
- 4 action types:
  1. `review_uncategorized` — open existing AICategoryCleanup with current month preloaded (no mutation)
  2. `copy_or_create_budget` — if current month has no budget, offer copy-from-previous or create-from-income. Reuses existing budget creation flow.
  3. `adjust_budget_category` — when a category is forecast to exceed budget, offer pre-filled allocation adjustment. Shows exact category + amount.
  4. `review_goal_catch_up` — when goal is behind pace, open pre-filled goal review with required monthly amount
- 2 action surfaces in Phase 1 (NOT 5):
  - **Dashboard**: "Next Best Action" card (promoted, 1 at a time)
  - **Budget page**: inline contextual action (e.g., "3 uncategorized" or "Dining over budget")
  - Goals page and Monthly Report deferred to Phase 2
- APScheduler daily analysis at 2 AM; surfaces max 1 action/week per user
- `POST /api/actions/{id}/execute` — idempotent endpoint, one-tap execution
- Reuse existing flows: budget copy wizard, goal edit modal, AICategoryCleanup. No new UIs for execution.
- Undo support with per-type semantics (see Section 6.2)
- Single `ActionService` (generate, surface, execute, dismiss, expire, undo). No separate executor.

**Action State Machine:**
```
pending → surfaced → executed → [undone]
                   → dismissed (30-day cooldown on same type)
                   → expired (7-day TTL)
```

**Lifecycle Rules:**
- Dedup: max 1 active action per (user_id, type). New replaces stale.
- Staleness: actions expire after 7 days if not surfaced. Auto-cleanup via cron.
- Surfacing: generated daily, surfaced 1/week max. Surfaced = shown on dashboard load.
- Idempotency: re-executing an already-executed action returns success (no-op).
- Dismiss cooldown: dismissed type blocked for 30 days before regeneration.

**Phase 2 — Measure Before Expanding**
- Track: action shown → tapped → completed → behavior changed next month
- Success threshold: >15% tap-through rate
- If below 15%: stop adding nudges, invest in data visualization instead
- If above 15%: add automation option ("Always do this for me")

**Phase 3 — Automation Rules (only if Phase 2 validates)**
- User-defined rules: "When dining exceeds ¥50K, auto-reduce next month"
- "When paycheck detected, auto-allocate to goals"
- Full opt-in, per-rule toggle

### What We Will NOT Build

- General-purpose financial advisor chat (liability risk)
- ML-based spending predictions (overfitting on single-user data; moving averages sufficient)
- Push notifications for financial nudges (fatigue risk too high)
- A/B testing infrastructure (single-user app, no cohorts)
- Complex recommendation engine (rule-based sufficient)

---

## 5. Product Principles

1. **Action beats explanation.** If the app can safely pre-fill the next step, do that instead of only describing the problem.
2. **Context beats destination.** Best time to influence is when user is already making a decision: entering transaction, reviewing budget, checking goal. Contextual inline > dashboard deep-link.
3. **Trust beats novelty.** Prefer low-risk, reversible, data-grounded actions over ambitious AI recommendations.
4. **Calm beats urgency.** No push-first, no guilt language, one action at a time, explicit effect before apply, easy dismissal.

### Action Priority Order

| Priority | Type | Why First |
|---|---|---|
| 1 | Data quality | Fix uncategorized/duplicates — improves everything downstream |
| 2 | Budget control | Create, copy, or adjust budgets with pre-filled values |
| 3 | Goal catch-up | Respond to goal gap with pre-computed adjustment |
| 4 | Automation rules | Only after 1-3 prove useful and trusted |

### Copy Rules
- **Concrete:** "Save ¥15,000 by Friday" not "Build financial security"
- **Loss-framing:** "Don't miss ¥15K savings" not "You could save ¥15K"
- **Personal numbers:** Always user's actual data, never generic benchmarks
- **No anxiety:** "You have room to save" not "You're overspending"

### Timing & Design Rules
- Surface on page load, not as interruptions. 1/week max. Dismiss = 30-day cooldown.
- Action cards blend with existing page, not modal/popup
- One primary button ("Apply") + one secondary ("Not now") + optional "Why?"
- Show exact effect: "This will create a ¥50,000 Dining budget for April"
- Undo available for 24 hours after execution

---

## 6. Technical Architecture

```
┌──────────────────────────┐
│  Daily Analysis Job       │  APScheduler, runs at 2 AM
│  (analyze_and_suggest)    │
└────────────┬─────────────┘
             │ writes to
┌────────────▼─────────────┐
│  pending_actions table    │  PostgreSQL
│  type | surface | params  │
│  status | priority        │
└────────────┬─────────────┘
             │ read by (2 surfaces)
      ┌──────┴──────┐
      │             │
┌─────▼──────┐ ┌───▼──────────┐
│ Dashboard  │ │ Budget Page  │
│ "Next Best │ │ Inline Alert │
│  Action"   │ │ (contextual) │
└─────┬──────┘ └───┬──────────┘
      └──────┬─────┘
             │ on tap → reuses existing flow
┌────────────▼─────────────┐
│  ActionService.execute()  │
│  → budget copy wizard     │
│  → goal edit modal        │
│  → AICategoryCleanup      │
└───────────────────────────┘
```

### 6.1 Database Schema

```sql
CREATE TABLE pending_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,           -- 'review_uncategorized', 'copy_or_create_budget', 'adjust_budget_category', 'review_goal_catch_up'
    surface VARCHAR(30) DEFAULT 'dashboard', -- 'dashboard' or 'budget_page'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    params JSONB NOT NULL DEFAULT '{}',  -- pre-computed action params
    undo_snapshot JSONB,                 -- stores pre-execution state for rollback
    status VARCHAR(20) DEFAULT 'pending', -- pending, surfaced, executed, dismissed, expired, undone
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    surfaced_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    executed_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    undone_at TIMESTAMP,
    UNIQUE(user_id, type, status) WHERE status IN ('pending', 'surfaced') -- dedup constraint
);
```

### 6.2 Undo Semantics (per action type)

| Action Type | Undo = | Snapshot Stored | Invalidated By |
|---|---|---|---|
| `review_uncategorized` | N/A (navigation only, no mutation) | — | — |
| `copy_or_create_budget` | DELETE created budget | `{budget_id}` | User manually edits budget |
| `adjust_budget_category` | UPDATE allocation SET amount = old_amount | `{allocation_id, old_amount}` | User manually edits allocation |
| `review_goal_catch_up` | UPDATE goal SET target = old_target | `{goal_id, old_target}` | User manually edits goal |

- Undo window: 24 hours after execution
- If user manually edits the created/modified object, undo is invalidated (set `undo_snapshot = NULL`)
- All state transitions logged to `pending_actions` table timestamps for audit

---

## 7. Success Metrics

### 7.1 Event Model

Events tracked per action: `created → surfaced → viewed → {tapped | dismissed | expired} → executed → [undone]`

- `surfaced`: action appeared on dashboard (1 per action, not per page load)
- `viewed`: user scrolled action into viewport (deduplicated by action_id)
- `tapped`: user clicked "Apply" (even if execution fails)
- Denominator for conversion: unique actions surfaced (not impressions)

### 7.2 Quantitative Targets

| Metric | Target | Formula |
|---|---|---|
| Tap-through | ≥20% OR ≥3 taps/month | `tapped / unique_actions_surfaced` |
| Execution rate | ≥50% of taps | `executed / tapped` |
| Persistence | ≥30 days | Did created budget/goal still exist after 30d? |
| Nudge fatigue | <3 consecutive dismissals | Triggers auto-pause if hit |

### 7.3 Qualitative Rubric (30-day review)

Since N=1 makes funnel stats noisy, also answer these 5 questions:

1. Did I understand the suggestion immediately? (Y/N)
2. Did I trust the pre-filled values? (Y/N)
3. Did it save me time vs doing it manually? (Y/N)
4. Did any suggestion feel intrusive or annoying? (Y/N → bad)
5. Did my spending/saving behavior actually change? (Y/N)

### 7.4 Decision Gates

| Result | Action |
|---|---|
| Quant ✓ + Qual ✓ (≥3/5 Yes, no fatigue) | Proceed to Phase 2 |
| Quant ✓ + Qual ✗ | Invest in data visualization instead |
| Quant ✗ + Qual ✓ | Refine copy/timing, re-test 30 days |
| Both ✗ | Archive feature, double down on tracking accuracy |

---

## 8. Risks & Mitigations

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Bad categorization → wrong suggestions | High | Phase 0 gate: ≥85% measured accuracy before shipping | Mitigated by gate |
| Regulatory: algorithmic financial guidance | Medium | See 8.1 below | **Open risk** |
| Nudge fatigue → user churn | Medium | 1/week cap, 30-day cooldown, auto-pause after 3 consecutive dismissals | Mitigated |
| Over-engineering for 1 user | Low | Prototype budget 16h. Production hardening tracked separately. | Mitigated |

### 8.1 Regulatory Risk (Open)

This risk is **not resolved** — it is intentionally scoped to minimize exposure.

**Classification question:** Do pre-filled budget suggestions constitute "personal recommendation" under Japan FIEA or EU MiFID II?

**Current position:** Unclear. Self-hosted (no client-advisor relationship, no fee) likely falls outside regulated activity, but no legal opinion obtained.

**Mitigations:**
1. Phase 1 limited to budgeting and categorization ONLY — zero investment/allocation/tax suggestions
2. Action cards display disclaimer: "Based on your transaction history. Not financial advice."
3. No prediction-based suggestions (only historical averages)
4. Quarterly review: reassess scope if expanding beyond budget actions

**Explicitly out of scope (until legal review):**
- Investment recommendations or allocation suggestions
- Tax optimization advice
- Insurance or credit product suggestions
- Any action involving securities, crypto, or financial instruments

---

## 9. The Uncomfortable Truths (from Skeptic Research)

1. **One-tap doesn't fix motivation.** Users living paycheck-to-paycheck can't save 20% regardless of UX.
2. **Nudge fatigue hits by week 3-4.** Plan for diminishing returns, not hockey-stick growth.
3. **"Tracking is enough" might be true.** Simply showing clear, accurate data may drive more behavior change than AI suggestions.
4. **SmartMoney's edge is calm + private + accurate.** Don't sacrifice that identity for AI features users didn't ask for.
5. **Measure before you expand.** Phase 1 is a hypothesis test, not a feature launch.

---

## 10. Research Artifacts

| Document | Location |
|---|---|
| Behavioral psychology research | `docs/ONE_TAP_SMART_ACTIONS_BEHAVIORAL_RESEARCH.md` |
| Technical architecture research | `docs/SMART_ACTIONS_RESEARCH.md` |
| Skeptic/contrarian analysis | `docs/SKEPTIC_NUDGE_RESEARCH_DELIVERY.md` |
| Minimal architecture guide | `docs/smart-actions-minimal-architecture.md` |
| Good patterns reference | `docs/smart-actions-good-patterns.md` |
| Anti-patterns reference | `docs/smart-actions-anti-patterns.md` |
| Timing strategy | `docs/smart-actions-timing-strategy.md` |
| Codex review (7 findings) | `docs/decisions/260326-codex-review.md` |

---

## 11. Next Steps

**Phase 0 (gate):**
1. Run 50-transaction spot-check for categorization accuracy (target: ≥85%)
2. Run budget consistency audit on 3 categories (target: ≥98%)

**Phase 1 — Prototype (~16h):**
3. DB migration: `pending_actions` table with dedup constraint + surface field
4. `ActionService`: generate, surface, execute, dismiss, expire, undo (single service, no separate executor)
5. APScheduler daily job: analyze + generate actions
6. API: `GET /api/actions/pending?surface=`, `POST /api/actions/{id}/execute`, `POST /api/actions/{id}/dismiss`, `POST /api/actions/{id}/undo`
7. Dashboard "Next Best Action" card + badge
8. Budget page inline action slot (contextual)
9. Ship 4 action types: `review_uncategorized`, `copy_or_create_budget`, `adjust_budget_category`, `review_goal_catch_up`
10. Wire execution into existing flows (budget copy wizard, goal edit modal, AICategoryCleanup)

**Phase 1 — Production hardening (+24h):**
11. Dedup race condition handling, idempotency
12. Undo safety (snapshot storage, invalidation on manual edit)
13. Event instrumentation (created/surfaced/viewed/tapped/executed/undone)
14. Tests: unit + integration
15. Disclaimer on action cards: "Based on your transaction history. Not financial advice."

**Phase 2 decision:** Review after 20 surfaced actions OR 60 days (whichever first) using Section 7.4 decision gates. If validated, add Goals page + Monthly Report as action surfaces.

---

| Artifact | Location |
|---|---|
| Codex review (7 findings) | `docs/decisions/260326-codex-review.md` |
| Codex insight-to-action proposal (merged) | `docs/decisions/260326-insight-to-action-layer.md` |

*v3: Merged insight-to-action-layer proposal. Key shifts: contextual actions first-class (2 surfaces), 4 action types reusing existing flows, single ActionService, data quality as priority #1, "20 actions or 60 days" review trigger. Codex over-engineering rejected: no score/ranking, no separate executor, no 5 surfaces in Phase 1.*
