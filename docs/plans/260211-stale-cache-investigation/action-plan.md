# Stale Cache Fix - Action Plan

**Issue:** Users see old UI (green) instead of new UI (orange) after accent color change

**Root Cause:** Service Worker caching old JavaScript bundles

---

## Immediate Actions (Do Now)

### 1. Verify Deployment Actually Ran
```bash
# Check if frontend was rebuilt and deployed
ls -lh frontend/dist/sw.js
ls -lh deploy/frontend-dist/sw.js

# Compare timestamps - should be recent (today)
```

### 2. Force User Cache Clear (Workaround)
Tell users to:
- Open DevTools (F12)
- Application tab → Storage → Clear site data
- Hard refresh (Ctrl+Shift+R)

### 3. Check Production Files Match Local Build
```bash
# Compare file hashes
md5sum frontend/dist/sw.js
md5sum deploy/frontend-dist/sw.js
# Should match!

# If you have SSH access:
ssh root@money.khanh.page "md5sum /root/smartmoney/deploy/frontend-dist/sw.js"
```

---

## Quick Fix (Today)

### Add Service Worker Update Notification

**File:** `frontend/src/main.tsx`

Add before `root.render()`:
```typescript
// Auto-reload when service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
```

Then rebuild and redeploy:
```bash
cd frontend
npm run build
cp -r dist/* ../deploy/frontend-dist/
# Run deploy script
```

---

## Permanent Fix (This Week)

### 1. Add Version Tracking

**File:** `frontend/vite.config.ts`

Add to plugins array:
```typescript
{
  name: 'version-injector',
  buildEnd() {
    const fs = require('fs');
    const version = require('child_process')
      .execSync('git rev-parse --short HEAD')
      .toString().trim();

    fs.writeFileSync('dist/version.json', JSON.stringify({
      version,
      buildTime: new Date().toISOString(),
    }));
  }
}
```

### 2. Add Client Update Checker

**File:** `frontend/src/hooks/useVersionCheck.ts`
```typescript
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useVersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        const { version } = await res.json();

        const stored = localStorage.getItem('app-version');
        if (stored && stored !== version) {
          toast.info('New version available!', {
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            },
            duration: Infinity,
          });
        }
        localStorage.setItem('app-version', version);
      } catch (err) {
        console.error('Version check failed:', err);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // Every 5 min
    return () => clearInterval(interval);
  }, []);
}
```

Use in `App.tsx`:
```typescript
import { useVersionCheck } from '@/hooks/useVersionCheck';

function App() {
  useVersionCheck();
  // ... rest of app
}
```

### 3. Add Deployment Verification

**File:** `deploy/verify-deployment.sh`
```bash
#!/bin/bash
set -e

echo "Verifying deployment..."

LOCAL=$(md5sum frontend/dist/sw.js | awk '{print $1}')
DEPLOYED=$(md5sum deploy/frontend-dist/sw.js | awk '{print $1}')

if [ "$LOCAL" == "$DEPLOYED" ]; then
  echo "✅ Files match!"
else
  echo "❌ MISMATCH! Local: $LOCAL, Deployed: $DEPLOYED"
  exit 1
fi
```

**Update:** `deploy/fast-deploy.sh` line 55 (after deployment):
```bash
echo "✅ Deployment complete!"

# Verify files
cd /home/godstorm91/project/smartmoney
./deploy/verify-deployment.sh

ls -la "$NGINX_DIR/"
```

---

## Why This Happens

**Normal Flow:**
1. User visits site → Service Worker (SW) installs, caches all JS/CSS
2. Next visit → SW serves cached files (instant load, works offline)
3. SW checks for updates in background
4. If new SW found → downloads but waits until all tabs closed
5. User closes/reopens → new SW activates

**Problem:**
- `vite-plugin-pwa` SHOULD force immediate update via `skipWaiting()`
- BUT browser/CDN may cache old `sw.js` despite `no-cache` headers
- User never gets new service worker = stuck with old cached JS

**Fix:**
- Version tracking alerts users when mismatch detected
- Force reload picks up new service worker
- Deployment verification catches issues before users notice

---

## Check If Fixed

```bash
# 1. Rebuild frontend
cd frontend
npm run build

# 2. Check service worker file changed
git diff deploy/frontend-dist/sw.js
# Should show changes in precache manifest

# 3. Deploy
./deploy/fast-deploy.sh

# 4. Test in browser
# - Open DevTools → Application → Service Workers
# - Click "Update" to force check
# - Should see new service worker activate
# - Hard refresh page
# - Accent color should be orange (or current selected)
```

---

## References

- Full investigation: `260211-investigation-stale-frontend-cache-report.md`
- Nginx config: `deploy/nginx.conf` (lines 60-63 - SW cache headers)
- PWA config: `frontend/vite.config.ts` (lines 12-66)
- Deploy script: `deploy/fast-deploy.sh`
