# SmartMoney Dependencies Specification
**Date:** 2025-11-17

---

## Backend Dependencies (Python 3.11+)

### pyproject.toml

```toml
[project]
name = "smartmoney-backend"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    # Core Framework
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",        # ASGI server with auto-reload

    # Database
    "sqlalchemy==2.0.23",               # ORM
    "alembic==1.12.1",                  # Migrations

    # Data Validation
    "pydantic==2.5.0",                  # Type validation, settings
    "pydantic-settings==2.1.0",         # Environment config

    # CSV Processing
    "pandas==2.1.3",                    # CSV parsing, data manipulation
    "chardet==5.2.0",                   # Encoding detection (Shift-JIS, UTF-8)

    # File Uploads
    "python-multipart==0.0.6",          # Multipart form parsing

    # Date Handling
    "python-dateutil==2.8.2",           # Flexible Japanese date parsing

    # Security (VPS deployment)
    "passlib[bcrypt]==1.7.4",           # Password hashing
    "python-jose[cryptography]==3.3.0", # JWT tokens (optional)

    # CORS (if frontend on different port)
    "fastapi-cors==0.0.6",
]

[project.optional-dependencies]
dev = [
    # Testing
    "pytest==7.4.3",
    "pytest-asyncio==0.21.1",
    "pytest-cov==4.1.0",
    "httpx==0.25.1",                    # Async test client
    "faker==20.1.0",                    # Generate test data

    # Code Quality
    "black==23.11.0",                   # Code formatter
    "ruff==0.1.6",                      # Fast linter (replaces flake8, isort)
    "mypy==1.7.1",                      # Type checker

    # Database
    "sqlalchemy[mypy]==2.0.23",         # Type stubs
]

postgres = [
    "psycopg2-binary==2.9.9",           # PostgreSQL driver
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"
```

### Installation Commands

```bash
# Development (SQLite)
pip install -e ".[dev]"

# Production (PostgreSQL)
pip install -e ".[postgres]"

# All dependencies
pip install -e ".[dev,postgres]"
```

---

## Frontend Dependencies (Node.js 20+)

### package.json

```json
{
  "name": "smartmoney-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",

    "recharts": "^2.10.3",
    "date-fns": "^2.30.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",

    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",

    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.4",

    "typescript": "^5.3.2",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",

    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",

    "eslint": "^8.54.0",
    "@typescript-eslint/eslint-plugin": "^6.13.2",
    "@typescript-eslint/parser": "^6.13.2",
    "eslint-plugin-react-hooks": "^4.6.0",

    "prettier": "^3.1.0",
    "prettier-plugin-tailwindcss": "^0.5.7",

    "vitest": "^1.0.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5"
  }
}
```

### Installation Commands

```bash
npm install

# Add shadcn/ui components on-demand
npx shadcn-ui@latest init
npx shadcn-ui@latest add button table card chart select dialog toast
```

---

## System Dependencies (Docker/VPS)

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

# System dependencies for PostgreSQL driver
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[postgres]"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

---

## Dependency Justifications

### Why Pandas Over csv.DictReader?
- Robust error handling (`on_bad_lines='skip'`)
- Type coercion (`pd.to_numeric(errors='coerce')`)
- 10x faster for large files (>10k rows)
- Built-in duplicate detection

### Why FastAPI Over Flask?
- Async native (better for I/O-bound CSV uploads)
- Auto-generated OpenAPI docs (Swagger UI)
- Pydantic validation (type-safe request/response)
- Modern Python 3.11+ features (match-case, etc.)

### Why Recharts Over Chart.js?
- React-native API (declarative, not imperative)
- Composable components (easy customization)
- TypeScript support out-of-box
- Sufficient for financial charts (no need for D3 complexity)

### Why Zustand Over Redux?
- 5x less boilerplate (no actions/reducers)
- 1KB bundle size vs 10KB (Redux Toolkit)
- Simpler mental model for small apps
- Easy to test

### Why Radix UI Over Material-UI?
- Unstyled primitives (full control over design)
- Smaller bundle size (tree-shakeable)
- Accessibility built-in (ARIA, keyboard nav)
- Shadcn/ui provides pre-styled wrappers

---

## Optional Dependencies

### For Advanced Features (Not MVP)

```toml
# Backend (pyproject.toml)
advanced = [
    "celery==5.3.4",              # Background jobs for large CSV uploads
    "redis==5.0.1",               # Task queue backend
    "rapidfuzz==3.5.2",           # Fuzzy duplicate detection
    "openpyxl==3.1.2",            # Excel file support
]
```

```json
// Frontend (package.json)
"dependencies": {
  "react-query": "^3.39.3",       // Advanced data fetching/caching
  "react-hook-form": "^7.48.2",   // Complex forms with validation
  "zod": "^3.22.4",               // Schema validation
}
```

---

## Version Pinning Strategy

### Production
- **Exact versions** (`==` for Python, no `^` for npm)
- Lock files: `requirements.txt` (pip freeze), `package-lock.json`
- Rebuild lock files monthly (security patches)

### Development
- **Compatible versions** (`~=` for Python, `^` for npm)
- Allow minor/patch updates
- CI runs with locked versions only

---

## Dependency Updates

### Security Monitoring
```bash
# Python
pip install pip-audit
pip-audit

# Node.js
npm audit
npm audit fix
```

### Monthly Update Routine
```bash
# Backend
pip list --outdated
pip install --upgrade <package>
pytest  # Verify no breaking changes

# Frontend
npm outdated
npm update
npm test
```

---

**Related Docs:**
- [Overview](./tech-stack-overview.md)
- [Database Schema](./tech-stack-database.md)
- [Deployment Guide](./tech-stack-deployment.md)

---

**END OF DEPENDENCIES**
