# CI/CD Improvement Plan

**Date:** 2026-01-23
**Status:** Proposed
**Author:** Claude Code

## Problem Statement

Current deployment has multiple issues:
1. No versioning/tagging - deploys on every push to `main`
2. Multiple deploy scripts causing confusion (`deploy.sh`, `fast-deploy.sh`, GitHub Actions)
3. Docker cache issues - stale layers persist, bugs remain after fixes
4. Backend builds on server (slow, error-prone)
5. No rollback capability
6. Migrations run on every container startup (risky)

## Current State

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Push main   │────▶│ GitHub      │────▶│ SSH to      │
│             │     │ Actions     │     │ server      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌───────────────┐
            │ git pull      │
            │ npm ci        │
            │ npm run build │
            │ docker restart│
            └───────────────┘
```

**Problems:**
- Builds happen on server (slow, uses server resources)
- No image versioning
- No cache control
- Backend deploy is manual/separate

## Proposed Solution

### Architecture

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌─────────────┐
│ Push main   │────▶│ GitHub Actions                   │────▶│ GHCR        │
│             │     │ 1. Build frontend                │     │ :main tag   │
└─────────────┘     │ 2. Build backend image           │     └─────────────┘
                    │ 3. Run tests                     │
                    │ 4. Push to GHCR                  │
                    └──────────────────────────────────┘

┌─────────────┐     ┌──────────────────────────────────┐     ┌─────────────┐
│ Tag v*      │────▶│ GitHub Actions                   │────▶│ Production  │
│             │     │ 1. Retag image :main → :version  │     │ Server      │
└─────────────┘     │ 2. SSH to server                 │     └─────────────┘
                    │ 3. Pull new images               │
                    │ 4. Run migrations                │
                    │ 5. Restart services              │
                    └──────────────────────────────────┘
```

### Components

| Component | Registry | Tags |
|-----------|----------|------|
| Backend | `ghcr.io/godstorm91/smartmoney-backend` | `:main`, `:v20260123.1` |
| Frontend | Built in CI, copied to server | N/A (static files) |

## Implementation Details

### 1. GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/${{ github.repository_owner }}/smartmoney-backend

jobs:
  # ====================
  # BUILD & TEST
  # ====================
  build-and-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Build frontend
        run: cd frontend && npm run build

      - name: Run frontend tests
        run: cd frontend && npm test --if-present

      - name: Upload frontend build
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist
          retention-days: 1

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -e ".[dev]"

      - name: Run backend tests
        run: |
          cd backend
          pytest --tb=short -q || true  # TODO: Remove || true when tests exist

      - name: Login to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        if: github.event_name != 'pull_request'
        uses: docker/build-push-action@v5
        with:
          context: .
          file: deploy/Dockerfile.backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:main
            ${{ env.BACKEND_IMAGE }}:${{ github.sha }}
          no-cache: true
          pull: true

  # ====================
  # DEPLOY TO PRODUCTION
  # ====================
  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download frontend build
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: frontend-dist

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Tag image with version
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          docker pull ${{ env.BACKEND_IMAGE }}:main
          docker tag ${{ env.BACKEND_IMAGE }}:main ${{ env.BACKEND_IMAGE }}:$VERSION
          docker push ${{ env.BACKEND_IMAGE }}:$VERSION

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            set -e
            VERSION=${GITHUB_REF#refs/tags/}
            DEPLOY_DIR="/root/smartmoney/deploy"

            cd $DEPLOY_DIR

            # Pull new backend image
            echo "Pulling backend image..."
            docker pull ghcr.io/godstorm91/smartmoney-backend:$VERSION

            # Update docker-compose to use versioned image
            export BACKEND_IMAGE_TAG=$VERSION

            # Run migrations (separate step)
            echo "Running migrations..."
            docker compose run --rm backend alembic upgrade head

            # Restart backend with new image
            echo "Restarting backend..."
            docker compose up -d backend

            # Restart nginx
            echo "Restarting nginx..."
            docker compose restart nginx

            # Cleanup old images
            echo "Cleaning up old images..."
            docker image prune -af --filter "until=168h"

            echo "Deploy complete: $VERSION"

      - name: Copy frontend files
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          source: "frontend-dist/*"
          target: "/root/smartmoney/deploy/frontend-dist"
          strip_components: 1
```

### 2. Updated Dockerfile.backend

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and install Python dependencies
COPY backend/pyproject.toml .
RUN pip install --no-cache-dir .

# Copy application code
COPY backend/ .
RUN pip install --no-cache-dir .

# Don't run migrations here - they run as separate step
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3. Updated docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smartmoney-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-smartmoney}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-smartmoney}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-smartmoney}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ghcr.io/godstorm91/smartmoney-backend:${BACKEND_IMAGE_TAG:-main}
    container_name: smartmoney-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-smartmoney}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-smartmoney}
      SECRET_KEY: ${SECRET_KEY}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 30
      REFRESH_TOKEN_EXPIRE_DAYS: 7
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    expose:
      - "8000"

  nginx:
    image: nginx:alpine
    container_name: smartmoney-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend-dist:/usr/share/nginx/html:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend

  certbot:
    image: certbot/certbot
    container_name: smartmoney-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
```

## Release Workflow

### Daily Development

```bash
# Make changes
git add .
git commit -m "fix: description"
git push origin main

# CI automatically:
# 1. Builds frontend
# 2. Runs tests
# 3. Builds backend image
# 4. Pushes to GHCR with :main tag
```

### Production Release

```bash
# When ready to deploy to production
git tag v20260123.1
git push origin v20260123.1

# CI automatically:
# 1. Tags image with version
# 2. SSHs to server
# 3. Pulls new image
# 4. Runs migrations
# 5. Restarts services
# 6. Copies frontend files
```

### Tag Naming Convention

Format: `v{YYYYMMDD}.{increment}`

Examples:
- `v20260123.1` - First release on Jan 23, 2026
- `v20260123.2` - Second release same day
- `v20260124.1` - First release on Jan 24, 2026

## Rollback Procedure

### Quick Rollback (< 5 min)

```bash
# SSH to server
ssh root@money.khanh.page

# Check available versions
docker images ghcr.io/godstorm91/smartmoney-backend --format "{{.Tag}}"

# Rollback to previous version
cd /root/smartmoney/deploy
export BACKEND_IMAGE_TAG=v20260122.1
docker compose up -d backend

# Verify
docker compose logs --tail=20 backend
```

### Full Rollback (with migration)

```bash
# If migration needs reverting
docker compose run --rm backend alembic downgrade -1

# Then restart with old image
export BACKEND_IMAGE_TAG=v20260122.1
docker compose up -d backend
```

## Server Setup (One-time)

```bash
# Login to GHCR on server
echo $GITHUB_TOKEN | docker login ghcr.io -u godstorm91 --password-stdin

# Or add to .env
echo "BACKEND_IMAGE_TAG=main" >> /root/smartmoney/deploy/.env
```

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | `money.khanh.page` |
| `SERVER_USER` | `root` |
| `SERVER_SSH_KEY` | SSH private key |
| `GITHUB_TOKEN` | Auto-provided by GitHub |

## Migration Strategy

### Before (migrations in CMD)
```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn..."]
```

### After (separate step)
```yaml
# In deploy workflow:
docker compose run --rm backend alembic upgrade head  # Step 1
docker compose up -d backend                          # Step 2
```

### Benefits
- Clear separation of concerns
- Can verify migration success before app starts
- Easier debugging
- Can rollback migration independently

## Test Structure (To Create)

### Backend Tests

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Fixtures
│   ├── test_auth.py          # Auth endpoints
│   ├── test_transactions.py  # Transaction CRUD
│   └── test_accounts.py      # Account operations
```

### Frontend Tests

```
frontend/
├── src/
│   └── __tests__/
│       ├── setup.ts
│       └── components/
│           └── *.test.tsx
```

## Implementation Checklist

- [ ] Update `.github/workflows/deploy.yml`
- [ ] Update `deploy/Dockerfile.backend` (remove migration from CMD)
- [ ] Update `deploy/docker-compose.yml` (use image from GHCR)
- [ ] Login to GHCR on production server
- [ ] Add `BACKEND_IMAGE_TAG` to server `.env`
- [ ] Create first release tag
- [ ] Test rollback procedure
- [ ] Delete old deploy scripts (`fast-deploy.sh`, etc.)
- [ ] Create basic test files
- [ ] Document new workflow in README

## Files to Delete (Cleanup)

After implementation, remove:
- `deploy/fast-deploy.sh`
- `deploy/deploy-with-password.exp`
- `deploy/deploy-with-password.py`
- `deploy/webhook.sh`

Keep for reference/manual use:
- `deploy/deploy.sh` (initial setup only)
- `deploy/backup.sh`
- `deploy/setup-ssl.sh`

## Success Metrics

1. **Deploy time** - Under 5 minutes from tag to live
2. **Rollback time** - Under 2 minutes
3. **Cache issues** - Zero (fresh builds every time)
4. **Failed deploys** - Clear error messages, easy to debug
5. **Version tracking** - Know exactly what's running in prod

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GHCR down | Can build locally and push image manually |
| Migration fails | Separate step, can debug before app deploy |
| Disk full (images) | Auto-prune images older than 7 days |
| SSH key compromised | Rotate via GitHub Secrets |

## Next Steps

1. Review and approve this plan
2. Implement GitHub Actions workflow
3. Update Dockerfile and docker-compose
4. Test with a minor release
5. Clean up old scripts
6. Create basic tests

---

**Questions/Concerns:** None at this time.
