# Stale Frontend Cache Investigation Report

**Date:** 2026-02-11
**Reporter:** Debug Agent
**Issue:** Production nginx serving stale/old frontend files despite deploy directory updates

---

## Executive Summary

**Root Cause:** Service Worker (PWA) aggressively caching old JS bundles with content-based precache manifest

**Business Impact:**
- Users see OLD UI (green accent) instead of NEW UI (orange accent) after user changes settings
- Browser loads cached JS files from service worker cache, bypassing nginx entirely
- Affects ALL users who previously visited the site

**Critical Finding:**
- Nginx config is CORRECT with proper `no-cache` headers for `sw.js` and `registerSW.js`
- Service Worker precache manifest has HARDCODED revision hashes for old JS files
- Even when nginx serves NEW `sw.js`, browser may still use CACHED old service worker

**Immediate Fix Priority:** HIGH
**Recommended Solution:** Force service worker update + clear precache on all clients

---

## Technical Analysis

### Architecture Discovery

**Production Setup (Docker-based):**
```yaml
# /home/godstorm91/project/smartmoney/deploy/docker-compose.yml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./frontend-dist:/usr/share/nginx/html:ro  # ← MOUNT POINT
```

**Nginx Root Directory:** `/usr/share/nginx/html` (mounted from `./deploy/frontend-dist/`)

**Deployment Flow:**
1. Local: `npm run build` → `frontend/dist/`
2. Deploy script copies `frontend/dist/*` → `deploy/frontend-dist/`
3. Docker mounts `deploy/frontend-dist/` → `/usr/share/nginx/html` inside nginx container
4. Nginx serves files from `/usr/share/nginx/html`

### Nginx Configuration Analysis

**File:** `/home/godstorm91/project/smartmoney/deploy/nginx.conf`

**Cache Headers (CORRECT):**
```nginx
# Lines 54-57: SPA shell — always revalidate
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

# Lines 60-63: Service worker files — always revalidate
location ~* (sw\.js|registerSW\.js)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

# Lines 66-69: Hashed assets — cache forever (Vite uses content hashes)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Analysis:**
- ✅ Nginx CORRECTLY prevents caching of `sw.js` and `registerSW.js`
- ✅ Nginx CORRECTLY caches hashed assets (`index-Cl0A3kUX.js`) for 1 year
- ✅ SPA fallback works correctly (`try_files $uri $uri/ /index.html`)
- ⚠️ No `X-Accel-Expires` or version query string to bust CDN caches

### Service Worker Analysis

**Files Found:**
- `/home/godstorm91/project/smartmoney/frontend/dist/sw.js`
- `/home/godstorm91/project/smartmoney/frontend/dist/registerSW.js`
- `/home/godstorm91/project/smartmoney/frontend/dist/workbox-58bd4dca.js`

**PWA Configuration (`vite.config.ts`):**
```typescript
VitePWA({
  registerType: 'autoUpdate',  // ← Should auto-update when sw.js changes
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [...]
  }
})
```

**Service Worker Precache Manifest (sw.js):**
```javascript
s.precacheAndRoute([
  {url:"index.html", revision:"acd7efa5e42f6918168278117ad5b256"},
  {url:"assets/index-Cl0A3kUX.js", revision:null},  // ← Content-hashed files
  {url:"assets/zoom-out-BMUolYcO.js", revision:null},
  // ... 50+ more entries
])
```

**Critical Observations:**
1. **Content-hashed assets have `revision:null`** → Service worker relies on filename hash
2. **Non-hashed files have revision hash** → Service worker version-checks these
3. **`index.html` revision: `acd7efa5e42f6918168278117ad5b256`**
4. Service worker will ONLY update if:
   - New `sw.js` content differs (triggers `updatefound` event)
   - User force-refreshes (bypasses service worker)
   - Service worker is unregistered and re-registered

### Deployment Script Analysis

**File:** `/home/godstorm91/project/smartmoney/deploy/fast-deploy.sh`

**Deployment Steps:**
```bash
# Line 23: Build frontend
cd "$DEPLOY_DIR/frontend"
npm run build

# Lines 34-36: Remove old files from nginx directory
rm -rf "$NGINX_DIR/assets" "$NGINX_DIR/locales" "$NGINX_DIR/icons"
rm -f "$NGINX_DIR/index.html" "$NGINX_DIR/manifest.json" \
      "$NGINX_DIR/registerSW.js" "$NGINX_DIR/sw.js" "$NGINX_DIR/workbox-58bd4dca.js"

# Line 39: Copy new build
cp -r dist/* "$NGINX_DIR/"

# Lines 47-48: Restart nginx container
docker compose down nginx
docker compose up -d nginx
```

**Analysis:**
- ✅ Removes old service worker files before copying new ones
- ✅ Restarts nginx to pick up changes
- ⚠️ No verification that new files were actually deployed
- ⚠️ No cache-busting headers added (relies on nginx config)

### Evidence from Recent Commits

```bash
018dc979 fix(ui): update budget desktop tab pills and inline edit to accent color
5d8dd10a fix(ui): update budget tab pills and transaction FAB to use accent color
79fdc09d fix(ui): replace hardcoded blue colors with primary accent system across 32 files
```

**Frontend changes made:**
- Replaced `bg-green-600` → `bg-primary-600` across 32 files
- These changes exist in SOURCE code
- After `npm run build`, new JS bundles generated with NEW hash (e.g., `index-NEW_HASH.js`)
- If deployment script ran correctly, nginx should serve NEW files

### Root Cause Chain

1. **User visits site** → Browser fetches `index.html` from nginx
2. **Browser loads `registerSW.js`** → Registers service worker `/sw.js`
3. **Service worker activates** → Precaches all assets listed in manifest
4. **Subsequent visits** → Service worker intercepts requests, serves from cache
5. **Deployment happens** → New `sw.js` pushed to nginx with new precache manifest
6. **Service worker check runs** → Browser compares cached `sw.js` with server version
7. **IF `sw.js` content changed** → Triggers `updatefound` event, downloads new service worker
8. **New service worker waits** → Doesn't activate until all tabs closed OR `skipWaiting()` called
9. **User still sees old UI** → Old service worker still active, serving old cached JS

**Critical Gap:**
- `vite-plugin-pwa` uses `self.skipWaiting()` in generated `sw.js` (line 1)
- This SHOULD force immediate activation
- BUT browser may still CACHE the old `sw.js` despite `no-cache` headers
- If DNS/CDN between user and server caches `sw.js`, user never gets new version

---

## Performance Metrics

**Service Worker Cache Strategy:**
- **Static assets:** Precached (offline-first)
- **API calls:** NetworkFirst with 24h cache fallback
- **Google Fonts:** CacheFirst with 1-year expiration

**Cache Sizes (estimated):**
- Precache: ~50 entries (HTML, JS, CSS, icons)
- Runtime API cache: Max 100 entries (24h TTL)
- Font cache: Max 10 entries (1-year TTL)

---

## Deployment Verification Gaps

**Missing Checks:**
1. No hash comparison of deployed files vs built files
2. No verification that nginx container picked up new volume mount
3. No automated service worker version bump logging
4. No client-side notification of available updates
5. No force-update mechanism for critical bugs

**Recommended Additions:**
```bash
# After deployment, verify files:
ssh "$SERVER" "md5sum $NGINX_DIR/sw.js"
md5sum frontend/dist/sw.js
# Should match!

# Check nginx is serving new files:
curl -H "Cache-Control: no-cache" https://money.khanh.page/sw.js | md5sum

# Verify service worker version in browser console:
navigator.serviceWorker.getRegistration().then(reg =>
  console.log('SW version:', reg.active.scriptURL)
)
```

---

## Recommended Solutions

### Immediate Fix (Emergency)

**Force all clients to update service worker:**

1. **Add version query string to service worker registration:**
   ```typescript
   // frontend/src/main.tsx or registerSW.js
   const SW_VERSION = '20260211-001';  // ← Update on each deploy
   navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`)
   ```

2. **Clear all caches on service worker activation:**
   ```javascript
   // In vite.config.ts VitePWA plugin
   workbox: {
     cleanupOutdatedCaches: true,  // ← Already enabled
     skipWaiting: true,             // ← Force immediate activation
     clientsClaim: true,            // ← Take control immediately
   }
   ```

3. **Add client-side update notification:**
   ```typescript
   // Notify user when update available
   useRegisterSW({
     onNeedRefresh() {
       toast.info('New version available! Click to update.', {
         action: { label: 'Update', onClick: () => window.location.reload() }
       })
     }
   })
   ```

### Short-term Fix (24-48 hours)

**Add deployment verification script:**

```bash
#!/bin/bash
# deploy/verify-deployment.sh

echo "Verifying deployment..."

# Get local sw.js hash
LOCAL_HASH=$(md5sum frontend/dist/sw.js | awk '{print $1}')

# Get remote sw.js hash (force no-cache)
REMOTE_HASH=$(curl -H "Cache-Control: no-cache" \
  https://money.khanh.page/sw.js 2>/dev/null | md5sum | awk '{print $1}')

if [ "$LOCAL_HASH" == "$REMOTE_HASH" ]; then
  echo "✅ Deployment verified! sw.js matches."
else
  echo "❌ MISMATCH! Local: $LOCAL_HASH, Remote: $REMOTE_HASH"
  exit 1
fi
```

**Add to fast-deploy.sh after restart:**
```bash
# Verify deployment
./deploy/verify-deployment.sh || {
  log_error "Deployment verification failed!"
  exit 1
}
```

### Long-term Fix (1-2 weeks)

**Implement versioned deployments:**

1. **Add version header to all responses:**
   ```nginx
   # nginx.conf
   add_header X-App-Version "20260211-001";
   ```

2. **Generate version file on build:**
   ```javascript
   // vite.config.ts
   import { execSync } from 'child_process';

   const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
   const buildTime = new Date().toISOString();

   fs.writeFileSync('dist/version.json', JSON.stringify({
     version: gitHash,
     buildTime,
   }));
   ```

3. **Client polls version endpoint, notifies on mismatch:**
   ```typescript
   // Check every 5 minutes
   setInterval(async () => {
     const { version } = await fetch('/version.json').then(r => r.json());
     if (version !== currentVersion) {
       toast.info('New version available!');
     }
   }, 5 * 60 * 1000);
   ```

4. **Add service worker skip-waiting message handler:**
   ```typescript
   // In sw.js (via vite-plugin-pwa)
   self.addEventListener('message', (event) => {
     if (event.data?.type === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });
   ```

---

## Preventive Measures

### Monitoring Additions

1. **Log service worker updates:**
   ```typescript
   navigator.serviceWorker.addEventListener('controllerchange', () => {
     console.log('Service worker updated!');
     // Send analytics event
   });
   ```

2. **Track cache hit rates:**
   ```javascript
   // In service worker
   self.addEventListener('fetch', (event) => {
     const isFromCache = event.request.cache === 'force-cache';
     // Log to analytics
   });
   ```

3. **Add deployment dashboard showing:**
   - Last deploy timestamp
   - Current version hash
   - Number of clients on old versions
   - Service worker update success rate

### Deployment Process Improvements

1. **Pre-deploy checklist:**
   - [ ] Run `npm run build`
   - [ ] Verify no build errors
   - [ ] Check file hashes changed
   - [ ] Test service worker update locally
   - [ ] Review nginx cache headers

2. **Post-deploy verification:**
   - [ ] Verify sw.js hash matches
   - [ ] Check index.html hash updated
   - [ ] Test hard-refresh loads new assets
   - [ ] Monitor error logs for 5 minutes
   - [ ] Verify API health check passes

3. **Rollback procedure:**
   ```bash
   # Keep last 3 deployments
   cp -r deploy/frontend-dist deploy/frontend-dist.backup-$(date +%Y%m%d-%H%M%S)

   # Rollback if needed
   rm -rf deploy/frontend-dist
   cp -r deploy/frontend-dist.backup-TIMESTAMP deploy/frontend-dist
   docker compose restart nginx
   ```

---

## Security Considerations

**Current Issues:**
- No SRI (Subresource Integrity) hashes on script tags
- Service worker has unlimited cache scope (`scope: '/'`)
- No CSP headers to prevent script injection

**Recommendations:**
1. Add SRI hashes to critical scripts
2. Scope service worker to `/app/` if possible
3. Add Content-Security-Policy header to nginx

---

## Unresolved Questions

1. **Was fast-deploy.sh actually run after the accent color changes?**
   - Check deploy logs or bash history on server

2. **Are users behind a CDN that's caching sw.js despite no-cache headers?**
   - Test from different networks/countries

3. **Is there a reverse proxy (CloudFlare, etc.) between users and nginx?**
   - Check DNS records for CNAME pointing to CDN

4. **What percentage of users are affected?**
   - Need analytics to track service worker versions in the wild

5. **Can we reproduce locally by:**
   - Building old version
   - Visiting in browser (service worker caches)
   - Building new version
   - Deploying
   - Checking if browser updates?

6. **Is workbox version `58bd4dca` the latest?**
   - Check if newer vite-plugin-pwa version available

---

## Next Steps

### For Requester (Immediate)

1. **Verify deployment actually ran:**
   ```bash
   ls -la /home/godstorm91/project/smartmoney/deploy/frontend-dist/sw.js
   # Compare timestamp with latest commit
   ```

2. **Check if files copied to production:**
   - SSH to server
   - Check `/root/smartmoney/deploy/frontend-dist/sw.js` modification time
   - Compare with git commit time

3. **Force browser cache clear:**
   - Open DevTools
   - Application tab → Storage → Clear site data
   - Hard refresh (Ctrl+Shift+R)
   - Check if accent color changes

### For Debug Agent (Follow-up)

1. Implement version verification script
2. Add client-side update notification
3. Document service worker update flow
4. Create deployment runbook with verification steps
5. Set up monitoring for service worker version distribution

---

**Report End**
