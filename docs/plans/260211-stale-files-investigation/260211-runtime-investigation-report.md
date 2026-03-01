# Runtime Server Investigation Report
**Date:** 2026-02-11
**Investigator:** System Analysis Agent
**Issue:** Production site serving stale frontend files despite successful deployments

---

## Executive Summary

**ROOT CAUSE:** Deployment script targets wrong directory — updates `/root/smartmoney` while nginx serves from `/var/www/smartmoney`

**IMPACT:** All deployments since Feb 11 10:42 JST fail to reach production users

**IMMEDIATE FIX:** Update `deploy/fast-deploy.sh` NGINX_DIR path from `/root/smartmoney/deploy/frontend-dist` to `/var/www/smartmoney/deploy/frontend-dist`

---

## Environment Configuration

### Local Development Machine
- Docker containers running but **NOT serving production**
- Local nginx container in **restart loop** — missing SSL certificates at `/home/godstorm91/project/smartmoney/deploy/certbot/conf/live/money.khanh.page/`
- No ports listening (80, 443, 8000)
- Purpose: Development environment only

### Production Server (money.khanh.page / 46.224.76.99)
- Nginx container: **RUNNING** successfully on ports 80/443
- Backend container: **RUNNING** (ghcr.io/godstorm91/smartmoney-backend:main)
- Postgres: **HEALTHY**
- SSL certificates: **VALID**

---

## Technical Analysis

### Deployment Path Mismatch

**Docker container mount (CORRECT):**
```
Source: /var/www/smartmoney/deploy/frontend-dist
Destination: /usr/share/nginx/html (inside nginx container)
```

**fast-deploy.sh target (INCORRECT):**
```bash
NGINX_DIR="/root/smartmoney/deploy/frontend-dist"  # Line 20
```

### File Comparison

| Location | Git Commit | Index.html Modified | JS Bundle Served | Status |
|----------|-----------|---------------------|------------------|--------|
| `/var/www/smartmoney` | 5eb5b998 (Feb 11 10:42 JST) | Feb 11 01:43 UTC | `index-DnkQPY_a.js` | **SERVED** |
| `/root/smartmoney` | 51ca237b (Feb 11 20:07 JST) | Feb 11 11:09 UTC | `index-CncWlEuW.js` | Not served |
| Local development | 51ca237b (same as /root) | - | - | Dev only |

**Result:** Site serves 10-hour-old build from `/var/www`, deployments update `/root`

### Evidence Trail

**Production site response headers:**
```
HTTP/2 200
last-modified: Wed, 11 Feb 2026 01:43:15 GMT  # /var/www timestamp
cache-control: no-cache, no-store, must-revalidate
```

**Nginx access logs:** Serving successfully, no errors — serving WRONG directory

**Docker inspect output:** Confirmed mount source is `/var/www/smartmoney/deploy/frontend-dist`

**Git repositories:**
- `/var/www/smartmoney`: Last updated Jan 23 (directory modified), commit from Feb 11 10:42
- `/root/smartmoney`: Updated Feb 11 20:07 (recent deployments land here)
- 14 JS bundles in `/root` vs 10 in `/var/www` — indicates `/root` has newer builds

---

## Deployment Process Breakdown

### Current (Broken) Flow
1. Developer runs `./deploy/fast-deploy.sh` locally
2. Script pushes code to `root@money.khanh.page:/var/www/smartmoney/.git` via git remote
3. SSH executes build in `/var/www/smartmoney/frontend`
4. **BUG:** Copies build output to `/root/smartmoney/deploy/frontend-dist` (line 39)
5. Restarts nginx — **no effect** because nginx reads from `/var/www/smartmoney/deploy/frontend-dist`

### What Should Happen
Steps 1-3 same, then:
4. Copy build output to `/var/www/smartmoney/deploy/frontend-dist`
5. Restart nginx — picks up new files from correct mount point

---

## Actionable Recommendations

### IMMEDIATE (Critical — blocks all deployments)
1. **Fix fast-deploy.sh line 20:**
   ```bash
   # Current (wrong):
   NGINX_DIR="/root/smartmoney/deploy/frontend-dist"

   # Correct:
   NGINX_DIR="/var/www/smartmoney/deploy/frontend-dist"
   ```

2. **Sync stale files on production:**
   ```bash
   ssh root@money.khanh.page "cp -r /root/smartmoney/deploy/frontend-dist/* /var/www/smartmoney/deploy/frontend-dist/"
   ```

3. **Verify deployment:**
   - Check `curl -sI https://money.khanh.page/ | grep last-modified`
   - Timestamp should update to current time
   - Inspect served JS bundle name in page source

### SHORT-TERM (Prevent recurrence)
1. Add deployment verification step to fast-deploy.sh:
   ```bash
   echo "Verifying deployment..."
   EXPECTED_HASH=$(md5sum "$NGINX_DIR/index.html" | cut -d' ' -f1)
   sleep 2
   ACTUAL_HASH=$(curl -s https://money.khanh.page/ | md5sum | cut -d' ' -f1)
   [ "$EXPECTED_HASH" = "$ACTUAL_HASH" ] && echo "✅ Verified" || echo "❌ Deploy failed"
   ```

2. Remove duplicate `/root/smartmoney` repository to prevent future confusion:
   - Git remote points to `/var/www/smartmoney/.git` — should only update there
   - `/root/smartmoney` appears to be leftover from old setup

### LONG-TERM (Infrastructure improvements)
1. **Local SSL cert issue:** Run `./deploy/setup-ssl.sh money.khanh.page` or comment out HTTPS block in local nginx.conf for dev
2. **Monitoring:** Add health check comparing deployed file hash vs served file hash
3. **CI/CD:** Move to GitHub Actions workflow to eliminate path ambiguity
4. **Documentation:** Update deployment guide with architecture diagram showing `/var/www` as canonical path

---

## Local Development Environment Notes

**Local nginx container cannot start** — error:
```
cannot load certificate "/etc/letsencrypt/live/money.khanh.page/fullchain.pem"
```

**Resolution options:**
1. Generate self-signed certs for local dev
2. Comment out HTTPS server block in local nginx.conf
3. Use vite dev server instead (`npm run dev` in frontend/)

**Current workaround:** Local containers not needed — production server at money.khanh.page handles all runtime

---

## Unresolved Questions

1. Why does `/root/smartmoney` repository exist if git remote points to `/var/www/smartmoney/.git`?
2. When was `/root/smartmoney` created and what was its original purpose?
3. Are there other deployment scripts besides fast-deploy.sh that might have similar path issues?
4. Should we consolidate to single repository location or maintain both with symlinks?

---

## Supporting Evidence Files

**Production server paths:**
- Nginx mount source: `/var/www/smartmoney/deploy/frontend-dist` (verified via `docker inspect`)
- Deploy script target: `/root/smartmoney/deploy/frontend-dist` (line 20 of fast-deploy.sh)
- Git remote: `root@money.khanh.page:/var/www/smartmoney/.git`

**Timestamps:**
- `/var/www/smartmoney/deploy/frontend-dist/index.html`: Feb 11 01:43:15 UTC (served)
- `/root/smartmoney/deploy/frontend-dist/index.html`: Feb 11 11:09:29 UTC (not served)
- Production site Last-Modified header: Feb 11 01:43:15 UTC (matches /var/www)

**Docker containers (production):**
```
smartmoney-nginx   nginx:alpine           Up 3 hours    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
smartmoney-backend ghcr.io/.../backend    Up 3 hours    8000/tcp
smartmoney-db      postgres:15-alpine     Up 12h (healthy)
```
