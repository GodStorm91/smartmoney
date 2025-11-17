# SmartMoney Tech Stack Overview
**Date:** 2025-11-17
**Context:** Self-hosted personal finance tracker for ~100k transactions
**Deployment:** Local Docker or VPS

---

## Final Stack Selection

### Backend: **Python 3.11+ + FastAPI**
- Superior CSV/data processing with pandas
- Native Japanese encoding handling (chardet)
- Mathematical precision (Decimal type, no float issues)
- FastAPI: Modern async, auto OpenAPI docs, type safety via Pydantic
- **Alternative rejected:** Node.js (weaker data libs, float precision issues)

### Database: **SQLite (MVP) → PostgreSQL (Production)**
- SQLite: Zero-config, file-based, sufficient for 500k records
- PostgreSQL: Superior analytics (CTEs, window functions), concurrent writes
- Migration via SQLAlchemy ORM abstraction (dialect-agnostic)
- **Currency storage:** BIGINT (¥1,234,567 = 1234567) - NO floats

### Frontend: **React 18 + Vite + Recharts**
- React: Industry standard, rich ecosystem
- Vite: Fast dev server, modern build (vs CRA)
- Recharts: React-native charting, composable API
- **UI Framework:** Shadcn/ui (Tailwind + Radix)
- **Alternative rejected:** Vue/Svelte (smaller ecosystem), Jinja2 (poor UX for filters)

### CSV Parsing: **Pandas + Chardet**
- Handles Shift-JIS/UTF-8/UTF-8-BOM auto-detection
- Robust error handling (malformed rows, type coercion)
- Built-in duplicate detection via hashing

### Authentication
- **Local:** NO auth (trust host OS)
- **VPS:** Basic HTTP auth (Caddy) OR session-based (bcrypt)
- **Future:** Better Auth framework (OAuth2, passkeys)

### Deployment: **Docker Compose + Caddy**
- Services: backend, frontend, db, caddy (reverse proxy)
- Caddy: Auto HTTPS via Let's Encrypt
- Backup: Daily pg_dump + GPG encryption + 30-day retention

---

## Key Architecture Decisions

### YAGNI Principles Applied
1. **Single-user only** - No multi-tenant complexity
2. **Monolithic MVC** - Not microservices
3. **SQLite first** - Defer PostgreSQL until needed
4. **Basic auth** - Skip OAuth until multi-user
5. **JSON config** - Category mappings in file, not admin UI

### Japanese Text Handling
- Encoding: chardet auto-detection (Shift-JIS, UTF-8, UTF-8-BOM)
- Font: `Noto Sans JP` via Google Fonts
- Number format: `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })`
- Date parsing: `python-dateutil` for flexible Japanese date formats

### Performance Targets (100k transactions)
- CSV upload (10k rows): ~2s
- Monthly aggregation: <100ms
- Dashboard load: <500ms
- Duplicate check: ~1s

---

## Project Structure

```
smartmoney/
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   └── services/     # Business logic
│   ├── config/           # categories.json
│   ├── migrations/       # Alembic DB migrations
│   └── tests/
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # UI components
│   │   └── lib/          # API client, utils
│   └── public/
├── docs/                 # Documentation (this file)
├── docker-compose.yml
└── Caddyfile
```

---

## Migration Strategy

### SQLite → PostgreSQL Trigger Points
- >250k transactions (query slowdown)
- Concurrent writes needed (upload during analytics)
- Full-text search on descriptions

### Migration Script
```python
# Change DATABASE_URL env var
# Before: sqlite:///./smartmoney.db
# After: postgresql://user:pass@db:5432/smartmoney

# Run migration script (copies data in batches)
python scripts/migrate_db.py

# Downtime: <5 minutes for 100k records
```

---

## Security Considerations

### CSV Injection Prevention
- Sanitize cells starting with `=`, `+`, `-`, `@`
- File size limit: 50MB
- Extension validation: `.csv` only

### Data Privacy
- **Local:** OS-level encryption (LUKS, FileVault, BitLocker)
- **VPS:** HTTPS only, database encryption at rest, GPG backup encryption
- **GDPR:** Export/delete all data features

---

## Unresolved Questions

1. **Multi-format support:** Auto-detect Zaim vs MoneyForward CSV or require user selection?
2. **Category updates:** How to bulk-recategorize historical transactions?
3. **Transfer detection:** Infer from description if 振替 flag missing?
4. **Multi-currency:** Should schema support future expansion?
5. **Audit trail:** Store original CSV files or normalized data only?
6. **Goal start date:** Auto-detect from first transaction vs user-defined?

---

**Related Docs:**
- [Dependencies](./tech-stack-dependencies.md) - Full package lists
- [Database Schema](./tech-stack-database.md) - ORM models, indexes
- [Deployment Guide](./tech-stack-deployment.md) - VPS setup, Docker config
- [Development Setup](./tech-stack-development.md) - Local environment

---

**END OF OVERVIEW**
