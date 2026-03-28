# SmartMoney Codebase Summary

**Generated:** 2026-03-28  
**Current Release:** v0.7.0 (production)  
**Deployment Shape:** Docker Compose + FastAPI + React + PostgreSQL + Nginx

---

## Snapshot

SmartMoney is now well beyond the original cashflow-tracker MVP. The codebase supports authenticated multi-user finance tracking, budgeting, recurring transactions, monthly reports, auto-categorization, smart action suggestions, rewards/gamification, and crypto/holdings features.

Current repo counts at a glance:

- `backend/app`: 216 Python files
- `backend/app/models`: 36 files
- `backend/app/routes`: 42 files
- `backend/app/services`: 80 files
- `backend/tests`: 20 pytest modules
- `frontend/src`: 482 TypeScript/TSX files
- `frontend/src/components`: 293 component files
- `frontend/src/pages`: 22 page files
- `frontend/src/services`: 37 API/service modules
- Locales: English, Japanese, Vietnamese

---

## Product Areas

The main product domains currently implemented are:

- Auth and per-user data isolation
- Transactions, transfers, tags, receipts, and CSV import
- Analytics, dashboard summaries, anomaly detection, and health scoring
- Budgets, budget alerts, revisions, and tracking
- Goals and achievability modeling
- Monthly reports with cached AI summaries and PDF generation
- Auto-categorization with rules, fuzzy normalization, and AI fallback
- Insight-to-action layer with pending actions and action settings
- Rewards, challenges, and social-learning/gamification systems
- Holdings, crypto wallets, DeFi snapshots, and position analytics

---

## Repository Map

```text
smartmoney/
├── backend/                  FastAPI backend, Alembic, pytest
│   ├── app/
│   │   ├── models/           SQLAlchemy models
│   │   ├── routes/           REST endpoints by domain
│   │   ├── schemas/          Pydantic request/response models
│   │   ├── services/         Business logic and schedulers
│   │   ├── auth/             JWT auth helpers and dependencies
│   │   └── utils/            Shared DB/CSV/helpers
│   ├── alembic/              Database migrations
│   └── tests/                Backend regression tests
├── frontend/
│   ├── src/
│   │   ├── components/       Feature and shared UI
│   │   ├── pages/            Route-level screens
│   │   ├── services/         API client wrappers
│   │   ├── hooks/            React Query and view logic
│   │   ├── contexts/         Global UI/user settings
│   │   ├── routes/           TanStack Router config
│   │   └── types/            Shared frontend types
│   ├── public/locales/       en / ja / vi translations
│   └── docs/                 Frontend-specific notes
├── deploy/                   Docker, nginx, cron, ops scripts
├── docs/                     Architecture, roadmap, decisions
└── plans/                    Execution plans, research, reports
```

---

## Backend Architecture

The backend remains a single FastAPI application with domain-heavy service modules. The broad pattern is:

1. Route validates input and resolves auth/session dependencies.
2. Service layer performs business logic and DB writes.
3. SQLAlchemy models represent domain entities.
4. Alembic migrations track schema evolution.

High-signal backend areas:

- `backend/app/main.py`
  Registers all routers, startup jobs, and shared middleware.
- `backend/app/routes/transactions.py`, `analytics.py`, `budgets.py`, `goals.py`
  Core finance APIs.
- `backend/app/routes/actions.py`
  Pending action delivery, execution, dismissal, undo, settings, and stats.
- `backend/app/services/action_service.py`
  Smart action orchestration.
- `backend/app/services/action_generators*.py`
  Domain-specific action generation.
- `backend/app/services/report_service.py`, `report_ai_service.py`, `monthly_report_pdf_service.py`
  Monthly report data, AI summary caching, and export.
- `backend/app/services/category_rule_service.py`, `claude_ai_service.py`
  Categorization intelligence.

Important model clusters:

- Finance core: `transaction.py`, `account.py`, `budget.py`, `goal.py`
- Reporting/intelligence: `insight.py`, `report_ai_summary.py`, `pending_action.py`
- Automation/support: `category_rule.py`, `recurring_transaction.py`, `notification.py`
- Growth systems: `rewards.py`, `gamification.py`, `challenges.py`, `social_learning.py`
- Crypto/holdings: `holding.py`, `crypto_wallet.py`, `position_closure.py`

---

## Insight-to-Action Layer

The newest architectural addition is the action layer introduced in March 2026.

Core files:

- `backend/app/models/pending_action.py`
- `backend/app/services/action_service.py`
- `backend/app/services/action_lifecycle_ops.py`
- `backend/app/services/action_generators.py`
- `backend/app/services/action_mutations.py`
- `backend/app/routes/actions.py`
- `frontend/src/hooks/use-pending-actions.ts`
- `frontend/src/components/dashboard/DashboardActionCard.tsx`

Current action behavior:

- Generators produce candidate actions from transaction, budget, goal, and report signals.
- Guard checks enforce active deduplication, cooldown, and auto-pause.
- Lifecycle ops handle surfacing, tapped/executed timestamps, dismissal, undo, and expiry.
- Frontend consumes surfaced actions through React Query and routes navigation-only actions into the right page.

---

## Frontend Architecture

The frontend is a TanStack Router SPA with React Query for data access and a large feature-component tree.

Main composition pattern:

1. Route-level page pulls domain data through hooks/services.
2. Feature components render cards, widgets, tables, or flows.
3. Shared UI primitives live under `components/ui`.
4. Translation keys are sourced from `public/locales/{en,ja,vi}/common.json`.

Notable frontend areas:

- Dashboard: hero cards, quick actions, action card, anomaly/budget alerts
- Budget page: creation wizard, tracking tabs, inline smart actions
- Goals page: progress modeling, inline actions, modal-driven editing
- Monthly report: AI summary, downloadable PDF, inline action surface
- Transactions/import: add/edit flows, receipt/upload helpers, categorization feedback

Shared frontend infrastructure:

- `frontend/src/services/api-client.ts`
- `frontend/src/hooks/*`
- `frontend/src/contexts/*`
- `frontend/src/utils/*`

---

## Deployment and Operations

Production deployment is repo-driven rather than externalized into a separate infra repo.

Key files:

- `deploy/docker-compose.yml`
- `deploy/nginx.conf`
- `deploy/scripts/backup.sh`
- `deploy/scripts/restore.sh`
- `deploy/cron/smartmoney-backup`
- `deploy.sh`

Current operational posture:

- PostgreSQL is containerized and persisted via Docker volume.
- Deploys sync source to the server and copy app files into the running backend container.
- Alembic migrations run during deploy.
- Pre-deploy backups now run via `deploy.sh`.
- Daily backup scheduling is documented via the cron artifact in `deploy/cron/`.

---

## Documentation Pointers

Start here depending on task:

- Product / release history: `docs/project-roadmap.md`
- System shape: `docs/system-architecture.md`
- Deploy + recovery: `docs/deployment-guide.md`
- Action-layer decisions: `docs/decisions/260328-ai-roadmap-next-steps-proposal.md`
- Working plans: `plans/20260326-1201-insight-to-action-layer/`, `plans/20260328-1227-production-hardening/`

---

## Hotspots

Areas most likely to matter for ongoing work:

- `backend/app/routes/` and `backend/app/services/`
  The backend is feature-rich and most behavior changes fan out through these two directories.
- `frontend/src/pages/` and `frontend/src/components/`
  UI changes often touch multiple surfaces because shared widgets are reused broadly.
- `frontend/public/locales/`
  Most user-facing changes need translation updates.
- `deploy/` and `docs/deployment-guide.md`
  Production safety changes need both script updates and explicit runbook changes.
