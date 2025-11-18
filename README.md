# SmartMoney Cashflow Tracker

**Version:** v0.1.0 (MVP Complete) | **Status:** ✅ 89/89 Tests Passing | **Code Quality:** 92/100

Personal finance webapp for tracking income, expenses, and long-term financial goals.

## Features

- 📊 **CSV Import** - MoneyForward, Zaim (Shift-JIS/UTF-8 auto-detect)
- 💰 **Cashflow Analytics** - Monthly income/expense/net with category breakdown
- 🎯 **Goal Tracking** - Multi-horizon (1/3/5/10 years) with progress projections
- 🎲 **Goal Achievability** - Real-time feasibility analysis based on current cashflow (NEW ✨)
- 📈 **Interactive Charts** - Recharts visualizations (trends, pie charts, bars)
- 🗾 **Japanese Support** - Full Japanese text handling (encoding, currency, categories)
- 🔒 **Self-Hosted** - Privacy-first, no cloud data sharing
- 🚀 **Performance** - Dashboard loads <500ms with 1000 transactions

## Tech Stack

**Backend:**
- Python 3.11+ / FastAPI
- SQLAlchemy ORM
- SQLite (MVP) → PostgreSQL (production)
- Pandas for CSV parsing

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- Recharts for visualizations
- Tailwind CSS + Shadcn/ui

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"
fastapi dev app/main.py
```

Backend runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Documentation

**Start Here:**
- [📚 Documentation Index](./docs/README.md) - Navigation hub for all docs

**Core Documentation:**
- [📋 Project Overview & PDR](./docs/project-overview-pdr.md) - Vision, requirements, success criteria
- [🏗️ System Architecture](./docs/system-architecture.md) - Architecture diagrams, data flows
- [📝 Code Standards](./docs/code-standards.md) - Python/TypeScript standards, testing
- [📦 Codebase Summary](./docs/codebase-summary.md) - Project structure, key modules

**Technical Guides:**
- [🗄️ Database Schema](./docs/tech-stack-database.md) - Models, migrations, queries
- [🚀 Deployment Guide](./docs/tech-stack-deployment.md) - Local setup, VPS deployment
- [🎨 Design Guidelines](./docs/design-guidelines.md) - UI/UX, typography, colors

## Project Structure

```
smartmoney/
├── backend/          # FastAPI backend (Python 3.11+)
│   ├── app/
│   │   ├── models/   # SQLAlchemy models (3 files)
│   │   ├── routes/   # API endpoints (4 files)
│   │   ├── services/ # Business logic (3 files)
│   │   ├── schemas/  # Pydantic validation (3 files)
│   │   └── utils/    # CSV parser, hashing (6 files)
│   ├── tests/        # pytest (89 tests passing)
│   └── alembic/      # Database migrations
├── frontend/         # React frontend (TypeScript)
│   └── src/
│       ├── components/ # 24 components (charts, dashboard, UI)
│       ├── pages/      # 6 pages (Dashboard, Upload, etc.)
│       ├── services/   # 6 API clients
│       ├── types/      # TypeScript types
│       └── utils/      # Formatters, calculations
└── docs/             # Documentation (15+ files)
```

## Current Status

**✅ Completed:**
- Backend API (4 route modules, 3 services)
- Frontend UI (25 components, 6 pages)
- CSV Parser (Shift-JIS/UTF-8 auto-detect)
- Goal Progress Algorithm (linear projection)
- Goal Achievability Feature (Phase 1) - 5-tier status system with actionable recommendations
- Testing (89/89 passing, 95%+ coverage)
- Documentation (15+ docs)

**⏳ Pending:**
- Docker Compose setup
- VPS deployment guide
- PostgreSQL migration
- Transaction editing UI

**📊 Metrics:**
- Test Coverage: 95%+ (services), 100% (utils)
- Code Quality: 92/100
- Files: 102 (57,579 tokens)
- Response Time: <500ms (dashboard)

## License

Private project - All rights reserved
