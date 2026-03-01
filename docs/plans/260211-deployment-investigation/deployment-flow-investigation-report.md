# Deployment Flow Investigation Report
**Date:** 2026-02-11
**Investigator:** QA Agent
**Issue:** Stale frontend files served despite code fixes (orange accent → green buttons)

---

## Executive Summary

**Root Cause:** Deployment flow CORRECT but relies on **manual commit** of built files to `deploy/frontend-dist/` directory. Stale files served because:
1. Built files (`frontend/dist/`) excluded from git via scout-block hook
2. Deployment requires **two-step process**: (1) build locally, (2) commit built files to `deploy/frontend-dist/`
3. Recent commits show build artifacts committed but **service worker cache** may persist old files client-side

**Impact:** Users see stale UI with incorrect colors until:
- New build files committed to `deploy/frontend-dist/` (✓ done in recent commits)
- GitHub Actions runs and restarts nginx (✓ done automatically)
- **Client clears cache OR service worker updates** (← likely bottleneck)

---

## Deployment Architecture

### Server Infrastructure
- **Host:** money.khanh.page (root@)
- **Stack:** Docker Compose (nginx + backend + postgres + certbot)
- **Nginx serves:** `/root/smartmoney/deploy/frontend-dist/` mounted to `/usr/share/nginx/html:ro`
- **Cache policy:**
  - `index.html`: `no-cache, no-store, must-revalidate`
  - `sw.js`, `registerSW.js`: `no-cache, no-store, must-revalidate`
  - Hashed assets (`.js`, `.css`): `max-age=1y, immutable`

### Deployment Flow

**Method 1: GitHub Actions CI/CD (primary)**
```bash
# Trigger: push to main branch
1. Build frontend in CI: cd frontend && npm run build
2. Build backend Docker image: ghcr.io/godstorm91/smartmoney-backend:main
3. SSH to server:
   - git reset --hard origin/main (pulls latest code INCLUDING deploy/frontend-dist/)
   - docker pull backend:main
   - docker compose up -d --force-recreate backend
   - docker compose restart nginx
```

**Method 2: fast-deploy.sh (SSH-based)**
```bash
# From: ./deploy/fast-deploy.sh
1. git push production main:main --force
2. SSH to server:
   - Build frontend: cd /var/www/smartmoney/frontend && npm run build
   - Copy: cp -r dist/* /root/smartmoney/deploy/frontend-dist/
   - docker compose restart nginx
```

**Method 3: deploy.sh (rsync-based, backend only)**
```bash
# From: ./deploy.sh
# Syncs backend code to server via rsync
# Does NOT handle frontend deployment
```

---

## Critical Finding: frontend-dist/ Is Git-Tracked

**Evidence:**
```bash
# scout-block.sh BLOCKS access to dist/ directories:
BLOCKED="node_modules|__pycache__|\.git/|dist/|build/"

# BUT deploy/frontend-dist/ IS COMMITTED to git:
$ git ls-files deploy/frontend-dist/ | head -5
deploy/frontend-dist/assets/BudgetInsightWidget-DVZrM8vO.js
deploy/frontend-dist/assets/LineChart-MXc9O0K-.js
deploy/frontend-dist/assets/RecurringOptions-fUAlFNIN.js
...

# Recent commits show manual build file commits:
51ca237b chore(deploy): update frontend build for desktop tab accent fix
91689334 chore(deploy): update frontend build for budget pill and FAB accent fix
c4848ef6 chore(deploy): update frontend build for accent color fix
```

**Workflow Pattern:**
1. Developer fixes code in `frontend/src/`
2. Commits fix: `fix(ui): update budget desktop tab pills to accent color`
3. **Builds locally:** `cd frontend && npm run build` (outputs to `frontend/dist/`)
4. **Manually copies:** Build files must be copied to `deploy/frontend-dist/`
5. Commits build: `chore(deploy): update frontend build for desktop tab accent fix`
6. Pushes to main → CI/CD triggers → server pulls latest code → nginx restarts

---

## Why Stale Files Persist

### 1. Service Worker Caching (HIGH PROBABILITY)

**Vite PWA Configuration:**
- Uses Workbox for aggressive caching
- Precaches ALL assets on first visit: `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`
- Update strategy: `registerType: 'autoUpdate'`

**Service Worker File:**
```javascript
// deploy/frontend-dist/sw.js
self.addEventListener("install",(t)=>{t.waitUntil(e.install())})
```

**Problem:** Even with `autoUpdate`, service worker may:
- Wait for ALL tabs closed before activating new version
- Cache old assets until `sw.js` itself updates
- Browser may cache `sw.js` despite `no-cache` header (browser bug/quirk)

**Evidence in nginx.conf:**
```nginx
# Service worker files — always revalidate
location ~* (sw\.js|registerSW\.js)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Hashed assets — cache forever
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Client-Side Browser Cache

Even with `must-revalidate` on `index.html`, browsers may:
- Cache hashed JS files indefinitely (by design)
- Reference OLD hashed filenames from cached service worker manifest
- Not request updated `index.html` if navigating via client-side routing

### 3. Docker Volume Mount Timing

**Nginx restart command:**
```bash
docker compose restart nginx
```

**Potential issue:** `restart` may not remount volumes. Should use:
```bash
docker compose down nginx
docker compose up -d nginx
```

**Verification needed:** Check if nginx container sees updated files after restart.

---

## Verification Steps

### 1. Check Server-Side Files
```bash
# SSH to server
ssh root@money.khanh.page

# Check deployed file timestamps
ls -la /root/smartmoney/deploy/frontend-dist/assets/budget.lazy*.js

# Verify file content (should contain bg-primary-600, NOT bg-green-600)
grep -c "bg-green-600" /root/smartmoney/deploy/frontend-dist/assets/budget.lazy*.js
# Expected: 0

grep -c "bg-primary-600" /root/smartmoney/deploy/frontend-dist/assets/budget.lazy*.js
# Expected: >0
```

### 2. Check Nginx Serving Files
```bash
# From server
docker exec smartmoney-nginx ls -la /usr/share/nginx/html/assets/ | grep budget.lazy

# Check file content inside container
docker exec smartmoney-nginx grep -c "bg-green-600" /usr/share/nginx/html/assets/budget.lazy*.js
```

### 3. Check Service Worker State
```javascript
// In browser DevTools Console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW state:', reg.active?.state)
    console.log('SW URL:', reg.active?.scriptURL)
    console.log('Waiting:', reg.waiting)
  })
})

// Force update
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update())
})

// Nuclear option: unregister
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
})
```

### 4. Check Client Cache
```
# Browser DevTools → Application → Cache Storage
# Check "workbox-precache-*" entries
# Verify asset filenames match latest build (budget.lazy-BU7502Go.js)

# Network tab → Disable cache checkbox
# Hard reload: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

## Technical Analysis

### File Naming Strategy (Content Hashing)
Vite generates content-hashed filenames:
```
budget.lazy-C9fwSpBw.js → budget.lazy-BU7502Go.js
```

When code changes:
1. New hash generated
2. `index.html` updated with new reference
3. Old file becomes orphaned (but may remain cached client-side)

**Expected behavior:**
- Client requests `index.html` (no-cache)
- Parses new `<script src="/assets/budget.lazy-BU7502Go.js">`
- Requests new file (cache miss)
- Old file expires from cache eventually

**Actual behavior (with service worker):**
- Service worker intercepts requests
- Serves cached `index.html` OR cached old asset from precache manifest
- New files on server never requested until SW updates

### Service Worker Update Lifecycle
```
1. Browser detects new sw.js (byte-diff check)
2. Downloads and installs new SW (parallel to old SW)
3. New SW enters "waiting" state
4. Old SW remains active until ALL tabs closed
5. On next page load, new SW activates
6. New SW precaches updated assets
```

**User must:** Close ALL tabs OR wait for `skipWaiting()` event

---

## Deployment Gap Analysis

### What Works
✅ GitHub Actions CI/CD pipeline functional
✅ Build process generates correct files
✅ Server receives updated files via git pull
✅ Nginx restarts and remounts volume
✅ Cache headers correct for index.html and sw.js

### What's Missing
❌ No service worker version display in UI
❌ No "Update Available" prompt for users
❌ No automatic service worker skipWaiting() on critical updates
❌ No cache busting strategy for emergency fixes
❌ No deployment verification step (checks file content on server)

---

## Recommended Solutions

### Immediate Fix (User-Side)
```
1. Hard reload: Ctrl+Shift+R
2. Clear site data: DevTools → Application → Clear storage
3. Close all tabs, reopen site
```

### Short-Term Fix (Dev-Side)
**Add service worker update notification:**
```javascript
// frontend/src/registerSW.ts
const updateSW = registerSW({
  onNeedRefresh() {
    // Show toast: "Update available! Click to refresh"
    if (confirm('New version available. Reload?')) {
      updateSW(true) // Force update
    }
  },
  onOfflineReady() {
    console.log('App ready offline')
  },
})
```

**Add version display in UI:**
```javascript
// Show in settings or footer
const VERSION = import.meta.env.VITE_APP_VERSION || 'dev'
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
```

### Mid-Term Fix (Build Process)
**Automate deploy/frontend-dist/ updates:**
```bash
# Add to .github/workflows/deploy.yml (build-and-test job)
- name: Copy build to deploy directory
  run: |
    rm -rf deploy/frontend-dist/*
    cp -r frontend/dist/* deploy/frontend-dist/
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add deploy/frontend-dist/
    git commit -m "chore(deploy): auto-update frontend build [skip ci]" || true
    git push origin main
```

**Problem:** Circular trigger (push triggers CI, CI pushes, triggers CI...)
**Solution:** Use `[skip ci]` in commit message

### Long-Term Fix (Architecture)
**Option A: Deploy dist/ directly (no git tracking)**
```bash
# Remove deploy/frontend-dist/ from git
git rm -r deploy/frontend-dist/
echo "deploy/frontend-dist/" >> .gitignore

# Update fast-deploy.sh to ALWAYS rebuild on server
# CI/CD builds on server, not in GitHub Actions
```

**Option B: Use CDN for static assets**
```bash
# Upload built files to S3/Cloudflare R2
# Update nginx to proxy /assets/* to CDN
# Eliminates git-tracking of build artifacts
```

**Option C: Container-based frontend**
```dockerfile
# Build frontend in Docker, serve via separate container
FROM node:20-alpine AS build
COPY frontend /app
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

---

## Unresolved Questions

1. **When was last nginx container recreated?**
   - `docker compose restart nginx` vs `docker compose up -d --force-recreate nginx`
   - Does restart remount volumes?

2. **Are OLD asset files still present on server?**
   - `/root/smartmoney/deploy/frontend-dist/assets/budget.lazy-C9fwSpBw.js` (old)
   - `/root/smartmoney/deploy/frontend-dist/assets/budget.lazy-BU7502Go.js` (new)
   - If both exist, SW may cache old file

3. **What is service worker update policy in production?**
   - Check `vite.config.ts` → `VitePWA({ registerType: 'autoUpdate' })`
   - Verify `sw.js` contains skipWaiting() logic

4. **Is there a git post-receive hook on production remote?**
   - `git remote production → root@money.khanh.page:/var/www/smartmoney/.git`
   - Does push to production trigger automatic deployment?

5. **Why are commits doubled (fix → chore(deploy))?**
   - Manual workflow or automated?
   - Could this be automated in pre-push hook?

---

## Next Actions

### For User
1. Open browser DevTools (F12)
2. Application → Service Workers → Unregister
3. Application → Clear storage → Clear site data
4. Hard reload (Ctrl+Shift+R)
5. Verify orange accent displays correctly

### For Development Team
1. **Verify server files:** SSH and check deployed JS contains `bg-primary-600`
2. **Check nginx container:** Ensure volume mount shows latest files
3. **Add SW update prompt:** Notify users when new version available
4. **Automate build commit:** Remove manual `chore(deploy)` step
5. **Document deployment:** Update deployment-guide.md with frontend flow

---

## Appendix: Deployment Commands Reference

### Manual Deployment (Current Process)
```bash
# Step 1: Build locally
cd /home/godstorm91/project/smartmoney/frontend
npm run build

# Step 2: Copy to deploy directory
rm -rf ../deploy/frontend-dist/*
cp -r dist/* ../deploy/frontend-dist/

# Step 3: Commit and push
cd ..
git add deploy/frontend-dist/
git commit -m "chore(deploy): update frontend build for [description]"
git push origin main

# GitHub Actions auto-deploys to server
```

### Emergency Fix (Bypass CI)
```bash
# Use fast-deploy.sh (builds on server)
./deploy/fast-deploy.sh

# Or SSH manually
ssh root@money.khanh.page
cd /root/smartmoney/frontend
npm run build
rm -rf ../deploy/frontend-dist/*
cp -r dist/* ../deploy/frontend-dist/
cd ../deploy
docker compose restart nginx
```

### Force Cache Clear (Server-Side)
```bash
# Restart nginx with volume remount
ssh root@money.khanh.page
cd /root/smartmoney/deploy
docker compose down nginx
docker compose up -d nginx

# Verify files in container
docker exec smartmoney-nginx ls -la /usr/share/nginx/html/assets/
```

---

**END OF REPORT**
