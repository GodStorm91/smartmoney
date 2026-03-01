# Stale Frontend Cache Investigation

**Date:** 2026-02-11
**Status:** Investigation Complete
**Priority:** HIGH

---

## Quick Summary

**Problem:** Users see old UI (green accent) instead of new UI (orange) after changing settings
**Root Cause:** Service Worker aggressively caching old JavaScript bundles
**Impact:** All users who previously visited the site

---

## Documents

1. **`diagnosis-summary.md`** ← Start here (executive summary)
2. **`action-plan.md`** ← Implementation steps (immediate + long-term fixes)
3. **`260211-investigation-stale-frontend-cache-report.md`** ← Full technical analysis (465 lines)

---

## Quick Fix (5 minutes)

```bash
# 1. Verify deployment actually ran
ls -lh deploy/frontend-dist/sw.js

# 2. If old (>24h), rebuild and redeploy
cd frontend && npm run build
cp -r dist/* ../deploy/frontend-dist/
./deploy/fast-deploy.sh

# 3. Tell users to hard refresh (Ctrl+Shift+R)
```

---

## Root Cause

Service Worker (PWA) caches all JS/CSS on first visit. When new version deployed:
- Nginx serves new `sw.js` correctly (has `no-cache` headers ✅)
- BUT browser/CDN may still cache old `sw.js`
- User never gets update = stuck with old cached files

---

## Solution

**Immediate:** Add version checker + update notification
**Long-term:** Deployment verification script + version tracking

See `action-plan.md` for full implementation.

---

## Key Findings

- ✅ Nginx config correct (proper cache headers)
- ✅ PWA config has `autoUpdate` and `skipWaiting()`
- ❌ No deployment verification
- ❌ No client-side version checking
- ❌ No user notification when updates available

---

## Files Investigated

- `deploy/nginx.conf` - Cache headers (correct ✅)
- `deploy/docker-compose.yml` - Volume mounts
- `deploy/fast-deploy.sh` - Deployment script
- `frontend/vite.config.ts` - PWA configuration
- `frontend/dist/sw.js` - Service worker precache manifest
