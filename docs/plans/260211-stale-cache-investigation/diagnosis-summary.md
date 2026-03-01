# Stale Cache Diagnosis Summary

**Date:** 2026-02-11
**Issue:** Production serving old frontend despite deploy updates
**User Impact:** Sees green accent instead of selected orange

---

## Root Cause

**Service Worker Precaching + Browser/CDN Caching**

1. PWA service worker precaches all JS/CSS bundles on first visit
2. Subsequent visits load from service worker cache (bypasses nginx)
3. When new version deployed, new `sw.js` pushed to nginx
4. BUT browser may still have cached old `sw.js` file
5. User never gets update notification = stuck on old cached version

---

## Architecture Confirmed

**Production Stack:**
```
Browser → nginx (Docker) → Backend (Docker)
          ↓
          Serves: /usr/share/nginx/html (volume mount from ./deploy/frontend-dist/)
```

**Deployment Flow:**
```
Local: npm run build → frontend/dist/
       ↓
       cp dist/* → deploy/frontend-dist/
       ↓
Docker: mount deploy/frontend-dist/ → /usr/share/nginx/html
       ↓
Nginx: serves files with cache headers
```

---

## Key Findings

### ✅ Nginx Config CORRECT
- `sw.js` and `registerSW.js` have `no-cache, must-revalidate` headers
- Hashed assets (index-Cl0A3kUX.js) correctly cached 1 year
- SPA fallback works (`try_files $uri $uri/ /index.html`)

### ⚠️ Service Worker Config
- Uses `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Has `skipWaiting()` to force immediate activation
- Precaches 50+ files with revision hashes
- Content-hashed files rely on filename for cache invalidation

### ❌ Missing Safeguards
- No deployment verification (file hash comparison)
- No client-side version checking
- No user notification when update available
- No rollback procedure documented

---

## Files Analyzed

**Nginx:**
- `/home/godstorm91/project/smartmoney/deploy/nginx.conf` (95 lines)
  - Lines 54-57: index.html no-cache
  - Lines 60-63: sw.js no-cache ✅
  - Lines 66-69: hashed assets cached 1y ✅

**Service Worker:**
- `/home/godstorm91/project/smartmoney/frontend/dist/sw.js` (minified, 1 line)
  - Precache manifest with 50+ entries
  - Revision hashes for index.html, icons
  - Null revisions for content-hashed JS/CSS

**PWA Config:**
- `/home/godstorm91/project/smartmoney/frontend/vite.config.ts`
  - Lines 12-66: VitePWA plugin
  - `registerType: 'autoUpdate'` ✅
  - Runtime caching for fonts, API

**Deploy Script:**
- `/home/godstorm91/project/smartmoney/deploy/fast-deploy.sh`
  - Builds frontend on server
  - Removes old files ✅
  - Copies new files ✅
  - Restarts nginx ✅
  - No verification ❌

---

## Recommended Actions

**Immediate (Today):**
1. Verify deployment ran (check file timestamps)
2. Add SW update notification to force reload
3. Document cache-clear workaround for users

**Short-term (This Week):**
1. Add version.json generation on build
2. Add client version checker with toast notification
3. Add deployment verification script

**Long-term (Next Sprint):**
1. Implement versioned deployments with headers
2. Add monitoring for SW update success rates
3. Document rollback procedure
4. Add pre/post-deploy checklists

---

## Unresolved Questions

1. Was fast-deploy.sh run after accent color commits?
2. Are users behind CDN caching sw.js?
3. Can we reproduce locally?
4. What % of users affected?
5. Is there reverse proxy (Cloudflare) involved?

---

## Next Steps

See `action-plan.md` for detailed implementation steps.
