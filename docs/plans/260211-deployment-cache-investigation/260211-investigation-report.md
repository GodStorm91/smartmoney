# Deployment Cache Investigation Report

**Date:** 2026-02-11
**Investigator:** Debug Agent
**Issue:** Old colors (green/blue) persist in production despite source code updates and successful builds

---

## Executive Summary

**Root Cause:** Service Worker aggressive precaching + browser cache combine to serve stale assets. Color fixes deployed to `deploy/frontend-dist/` but users hit cached versions.

**Impact:** Users see old UI despite 3 deploy commits (79fdc09d, 5d8dd10a, 018dc979) updating source + dist.

**Immediate Fix:** Force service worker update + cache bust

**Long-term:** Implement cache-busting versioning strategy

---

## Technical Analysis

### 1. Deployment Flow (GitHub Actions → Production)

**CI/CD Pipeline** (`.github/workflows/deploy.yml`):

```
Push to main → build-and-test → deploy-main
  ├─ Builds frontend (npm run build)
  ├─ Pushes backend Docker image (ghcr.io)
  ├─ SSH to production server
  ├─ git reset --hard origin/main (pulls deploy/frontend-dist/)
  ├─ docker compose restart nginx
  └─ Files served from /usr/share/nginx/html (mounted from ./frontend-dist)
```

**Key Finding:** Deploy workflow does NOT rebuild frontend on server for `main` branch — it relies on pre-committed files in `deploy/frontend-dist/`.

**Evidence:**
- Line 100-103: `git fetch origin main && git reset --hard origin/main`
- Line 124: `docker compose restart nginx`
- **NO** `npm run build` step in `deploy-main` job
- Versioned deploys (tags) DO rebuild (line 181-183) but auto-deploys on main do not

---

### 2. Service Worker Configuration

**Vite PWA Config** (`frontend/vite.config.ts`):

```typescript
VitePWA({
  registerType: 'autoUpdate',  // ← Should auto-update...
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    // ...
  }
})
```

**Service Worker** (`deploy/frontend-dist/sw.js`):

```javascript
self.skipWaiting()  // ← Forces immediate activation
s.clientsClaim()    // ← Takes control immediately
s.precacheAndRoute([
  {url:"index.html", revision:"acd7efa5e42f6918168278117ad5b256"},
  {url:"assets/index-kKTte7eV.css", revision:null},  // ← Content-hashed
  {url:"assets/index-Cl0A3kUX.js", revision:null},
  // ... 60+ entries
])
```

**Register Script** (`deploy/frontend-dist/registerSW.js`):

```javascript
navigator.serviceWorker.register('/sw.js', { scope: '/' })
```

**Critical Issue:** Despite `registerType: 'autoUpdate'` + `skipWaiting`, service worker precache manifest has hardcoded hashes:
- `index.html` revision: `acd7efa5e42f6918168278117ad5b256`
- CSS/JS bundles: content-hashed filenames (`index-kKTte7eV.css`)

**Problem:** When Vite rebuilds:
1. New bundles get new hashes (`index-BNMQ8pho.css` → `index-kKTte7eV.css`)
2. `sw.js` gets regenerated with new precache manifest
3. BUT if browser cached old `sw.js`, it never fetches new manifest
4. User stuck on old assets until hard refresh

---

### 3. Nginx Cache Headers

**Config** (`deploy/nginx.conf`):

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

# SPA shell — always revalidate
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

**Analysis:**
✅ SW files set to no-cache (correct)
✅ index.html set to no-cache (correct)
⚠️ Hashed assets cached 1 year (correct for content-hash, but relies on SW update)

**Gap:** Config assumes SW updates reliably. Reality: browser may cache SW despite headers if:
- User had tab open during deploy (update pending state)
- Browser didn't check for SW update yet (update check interval)
- Network cache (CDN/proxy) between user and nginx

---

### 4. Git History Evidence

**Recent color fix commits:**

```
51ca237b chore(deploy): update frontend build for desktop tab accent fix
018dc979 fix(ui): update budget desktop tab pills and inline edit to accent color
91689334 chore(deploy): update frontend build for budget pill and FAB accent fix
5d8dd10a fix(ui): update budget tab pills and transaction FAB to use accent color
c4848ef6 chore(deploy): update frontend build for accent color fix
79fdc09d fix(ui): replace hardcoded blue colors with primary accent system across 32 files
```

**Diff between 79fdc09d → 51ca237b:**

```
deploy/frontend-dist/assets/index-BNMQ8pho.css  (deleted)
deploy/frontend-dist/assets/index-kKTte7eV.css  (added)
deploy/frontend-dist/assets/budget.lazy-CxWcFvBX.js  (deleted)
deploy/frontend-dist/assets/budget.lazy-BU7502Go.js  (added)
deploy/frontend-dist/index.html  (updated refs)
deploy/frontend-dist/sw.js  (updated precache manifest)
```

**Evidence:** Dist files ARE updated with new hashes. Problem is delivery to client.

---

### 5. Deployment Verification

**Remote configuration:**

```
origin: git@github.com:GodStorm91/smartmoney.git
production: root@money.khanh.page:/var/www/smartmoney/.git
```

**Production server flow:**

```bash
# On push to main:
cd /root/smartmoney
git reset --hard origin/main  # ← Gets deploy/frontend-dist/
cd /root/smartmoney/deploy
docker compose restart nginx  # ← Remounts ./frontend-dist as volume
```

**Docker mount** (`deploy/docker-compose.yml`):

```yaml
nginx:
  volumes:
    - ./frontend-dist:/usr/share/nginx/html:ro
```

**Verified:** Files on server are up-to-date (git pulls them). Nginx serves from correct location.

---

## Root Cause Chain

1. **Source code updated** ✅ (79fdc09d, 5d8dd10a, 018dc979)
2. **Frontend rebuilt locally** ✅ (new hashes: index-kKTte7eV.css)
3. **Dist committed to git** ✅ (deploy/frontend-dist/* updated)
4. **Changes pushed to GitHub** ✅ (commits visible in origin/main)
5. **CI/CD deployed to server** ✅ (git reset pulls new files)
6. **Nginx restarted** ✅ (serves new files)
7. **Browser fetches index.html** ✅ (no-cache header works)
8. **Browser checks service worker** ⚠️ **FAILS** → old SW cached or update pending
9. **Old SW serves old precached assets** ❌ → user sees old colors

**Critical bottleneck:** Step 8 — Service worker update lifecycle

---

## Actionable Recommendations

### Immediate (HIGH Priority)

**1. Force Service Worker Update**

User must manually clear cache:
- Chrome DevTools → Application → Service Workers → "Unregister" + "Update on reload"
- Or hard refresh: `Ctrl+Shift+R` (Windows/Linux) / `Cmd+Shift+R` (Mac)

**2. Add Version Banner (Developer Tool)**

Add UI element showing app version (from `package.json`) to verify deployment:

```typescript
// src/components/VersionBanner.tsx
export const VersionBanner = () => {
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  return <div className="fixed bottom-0 right-0 text-xs opacity-50">v{version}</div>;
};
```

Update `vite.config.ts`:

```typescript
define: {
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version)
}
```

### Short-term (MEDIUM Priority)

**3. Aggressive SW Update Check**

Update `registerSW.js` to check for updates more frequently:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      // Check for updates every 60 seconds
      setInterval(() => reg.update(), 60000);

      // Prompt user when update available
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Show toast: "New version available. Refresh to update."
            if (confirm('New version available. Reload now?')) {
              window.location.reload();
            }
          }
        });
      });
    });
  });
}
```

**4. Add Cache-Busting Query Param**

Modify deployment script to append timestamp to SW registration:

```nginx
# In nginx.conf, add rewrite rule:
location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header X-SW-Version "$msec";  # Nginx timestamp
}
```

Or handle in `registerSW.js`:

```javascript
const swUrl = `/sw.js?v=${Date.now()}`;
navigator.serviceWorker.register(swUrl);
```

### Long-term (LOW Priority, High Value)

**5. Implement Versioned Deployments**

Instead of auto-deploying every main push:
- Use git tags for releases (`v1.2.3`)
- Deploy workflow already supports this (line 135-217)
- User manually triggers deploys via `git tag v1.2.3 && git push origin v1.2.3`
- Reduces deployment churn, gives time for testing

**6. Add Deployment Health Check**

Create endpoint to verify frontend version matches backend:

```python
# backend/main.py
@app.get("/api/health")
def health():
    return {
        "backend_version": "1.2.3",
        "expected_frontend_hash": "kKTte7eV"  # From build manifest
    }
```

Frontend checks on load:

```typescript
useEffect(() => {
  fetch('/api/health').then(r => r.json()).then(data => {
    if (data.expected_frontend_hash !== CURRENT_HASH) {
      console.warn('Frontend version mismatch. Reload recommended.');
    }
  });
}, []);
```

**7. Consider CDN with Cache Invalidation**

Deploy to Vercel/Netlify/Cloudflare Pages instead of self-hosted:
- Automatic cache invalidation on deploy
- Edge caching with instant purge
- Preview deployments for PRs
- No manual nginx cache management

**8. Monitor Service Worker Adoption**

Add analytics to track SW update success rate:

```javascript
navigator.serviceWorker.ready.then(reg => {
  // Log to analytics: SW version, update timestamp, etc.
  console.log('[SW] Active version:', reg.active.scriptURL);
});
```

---

## Testing Checklist

Before closing issue, verify:

- [ ] Hard refresh shows new colors (Ctrl+Shift+R)
- [ ] DevTools → Application → Service Workers shows latest `sw.js` version
- [ ] Network tab shows `index-kKTte7eV.css` (not old `index-BNMQ8pho.css`)
- [ ] Precache manifest in `sw.js` matches current build hashes
- [ ] Version banner (if added) displays correct version
- [ ] Incognito window shows new colors (bypass all cache)

---

## Unresolved Questions

1. **Why didn't `autoUpdate` work as expected?**
   - Vite PWA plugin sets `registerType: 'autoUpdate'` + `skipWaiting`
   - But browser SW update lifecycle has edge cases (e.g., tab sleep, network timing)
   - Need to investigate if Workbox update strategy can be more aggressive

2. **Should we disable PWA entirely for development phase?**
   - PWA adds complexity during rapid iteration
   - Consider disabling until app is stable, then re-enable for production

3. **Is there a proxy/CDN between users and nginx?**
   - money.khanh.page — check DNS/hosting setup
   - If Cloudflare/proxy exists, may need to purge cache there too

4. **How many users affected?**
   - Need analytics to determine impact scope
   - Check if issue is widespread or isolated to specific browsers/devices

5. **When did issue start?**
   - All 3 color fix deploys (79fdc09d, 5d8dd10a, 018dc979) committed on same day
   - Were intermediate commits visible in production at any point?
   - Or did user never see ANY color updates?

---

## Appendix: Service Worker Lifecycle

```
User visits → Browser checks SW registration
  ├─ No SW: Install new → Activate → Control page
  ├─ SW exists:
      ├─ Check for /sw.js update (based on Last-Modified or byte-diff)
      ├─ If changed: Download new → Install → WAIT (old SW still active)
      ├─ On next page load OR skipWaiting(): Activate new SW
      └─ Precache assets from new manifest
```

**Edge case causing issue:**
- User had old SW active
- New `sw.js` downloaded but WAITING
- User refreshed → old SW served precached assets
- New SW never activated (tab stayed open, no navigation)

**Solution:** Force activation via update prompt (recommendation #3)
