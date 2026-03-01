# DeFi Positions Missing on Production - Investigation Report

**Date:** 2026-01-25
**Environment:** Production (Railway)
**User:** godstorm91@gmail.com
**Issue:** DeFi positions not showing on Accounts page despite previous configuration

---

## Executive Summary

User reports DeFi positions previously configured now not displaying on Accounts page. Frontend component `LPPositionsSection` hides entire section if no wallets found (lines 266-268). Investigation blocked by authentication failure - credentials don't work against production API.

**Critical Finding:** Cannot verify production data - auth credentials invalid.

---

## Component Flow Analysis

### Frontend: LPPositionsSection.tsx

**Early Return Logic (Lines 266-268):**
```typescript
if (!wallets || wallets.length === 0) {
  return null  // ENTIRE SECTION HIDDEN
}
```

**Data Flow:**
1. `useCryptoWallets()` hook → calls `fetchWallets()` from crypto-service.ts
2. API endpoint: `GET /api/crypto/wallets`
3. If wallets array empty → section disappears completely
4. If wallets exist → fetches DeFi positions via `fetchDefiPositions(wallet.id)`

**Key API Calls:**
- `GET /api/crypto/wallets` - Must return user's wallets
- `GET /api/crypto/wallets/{id}/defi-positions` - Fetches positions from Zerion API

---

## Backend Flow Analysis

### Route: `/api/crypto/wallets` (crypto.py:70-76)

```python
async def get_wallets(db, current_user):
    return CryptoWalletService.get_wallets(db, current_user.id)
```

### Service: CryptoWalletService.get_wallets() (crypto_wallet_service.py:83-88)

```python
db.query(CryptoWallet).filter(
    CryptoWallet.user_id == user_id,
    CryptoWallet.is_active == True  # SOFT DELETE CHECK
).order_by(CryptoWallet.created_at).all()
```

**Possible Issues:**
1. **Soft Delete:** Wallets marked `is_active=False` won't appear
2. **Wrong User ID:** Auth token might be for different user
3. **Empty Database:** No wallets in production DB

---

## DeFi Positions Endpoint Analysis

### Route: `/api/crypto/wallets/{wallet_id}/defi-positions` (crypto.py:150-166)

```python
async def get_defi_positions(wallet_id, db, current_user):
    positions = await CryptoWalletService.get_defi_positions(
        db, current_user.id, wallet_id
    )
```

### Service: get_defi_positions() (crypto_wallet_service.py:440-493)

**Flow:**
1. Verify wallet ownership
2. Call Zerion API: `ZerionApiService.get_defi_positions()`
3. Parse response into `DefiPositionsResponse`
4. **On error:** Returns empty array (doesn't fail)

**Zerion API Call (zerion_api_service.py:158-201):**
```python
url = (
    f"{BASE_URL}/wallets/{wallet_address}/positions/"
    f"?currency=usd&filter[positions]=only_complex&filter[trash]=only_non_trash"
    f"&sort=value{chain_filter}"
)
```

**Error Handling:** Returns empty positions list on API failure (line 488-493)

---

## Zerion API Configuration

**API Key Source:** `settings.zerion_api_key` (from environment)

**Local .env has key:**
```
ZERION_API_KEY=emtfZGV2X2Q0OTMxNTk1ZTc0YjQyNWY4YjE1OGFiYzRmMmI0MzBkOg==
```

**Verification Needed:** Production environment must have valid `ZERION_API_KEY`

---

## Investigation Checklist (Manual Steps Required)

### 1. Authentication Issue (PRIORITY 1)
- [ ] Verify user exists in production DB: `SELECT * FROM users WHERE email='godstorm91@gmail.com'`
- [ ] Check password hash matches
- [ ] Test correct credentials for production environment
- [ ] Verify JWT token generation working

### 2. Database Verification (PRIORITY 1)
Execute on production PostgreSQL:

```sql
-- Check if user exists
SELECT id, email, created_at FROM users WHERE email = 'godstorm91@gmail.com';

-- Check crypto wallets for user (replace USER_ID)
SELECT id, wallet_address, label, chains, is_active, created_at
FROM crypto_wallets
WHERE user_id = {USER_ID};

-- Check if wallets were soft-deleted
SELECT id, wallet_address, is_active, updated_at
FROM crypto_wallets
WHERE user_id = {USER_ID} AND is_active = FALSE;

-- Check defi_position_snapshots table
SELECT COUNT(*), MIN(snapshot_date), MAX(snapshot_date)
FROM defi_position_snapshots
WHERE user_id = {USER_ID};

-- Sample recent snapshots
SELECT position_id, protocol, symbol, balance_usd, snapshot_date
FROM defi_position_snapshots
WHERE user_id = {USER_ID}
ORDER BY snapshot_date DESC
LIMIT 10;
```

### 3. Zerion API Verification (PRIORITY 2)
- [ ] Check production env vars: `echo $ZERION_API_KEY` in Railway dashboard
- [ ] Test Zerion API directly with production key:
```bash
curl -X GET "https://api.zerion.io/v1/wallets/{WALLET_ADDRESS}/positions/?currency=usd&filter[positions]=only_complex" \
  -H "Authorization: Basic {API_KEY}"
```
- [ ] Verify API rate limits not exceeded
- [ ] Check Zerion API service status

### 4. Backend Logs (PRIORITY 2)
Check Railway logs for:
- [ ] Zerion API errors: `grep "Zerion.*error" logs`
- [ ] Wallet fetch failures: `grep "Failed to fetch.*wallet" logs`
- [ ] Auth failures: `grep "Email atau password" logs`
- [ ] Exception traces during wallet/position queries

### 5. Frontend Network Inspection (PRIORITY 3)
Open browser DevTools → Network tab:
- [ ] `GET /api/crypto/wallets` response status & body
- [ ] `GET /api/crypto/wallets/{id}/defi-positions` response
- [ ] Check for 401 Unauthorized (auth issue)
- [ ] Check for 500 errors (backend crash)
- [ ] Verify API base URL correct in production build

---

## Possible Root Causes (Ranked by Likelihood)

### 1. Soft-Deleted Wallets (High)
User deleted wallets previously. Check `is_active=FALSE` in DB.

### 2. Wrong Credentials (High)
Provided credentials don't match production. User needs actual prod password.

### 3. Zerion API Failure (Medium)
- API key not set in production env
- API key expired/invalid
- Rate limit exceeded
- Zerion service down

### 4. Database Migration Issue (Medium)
Production DB schema mismatch - wallets table exists but empty.

### 5. Frontend API URL Mismatch (Low)
Frontend pointing to wrong backend URL (unlikely if other features work).

### 6. Auth Token Scoping Issue (Low)
JWT token valid but wrong user_id in claims.

---

## Next Steps

**Since auth blocked, user must:**

1. **Verify credentials:**
   - Try password reset if unsure
   - Check if using correct email for production
   - Test login via frontend first

2. **Database access:**
   - Railway dashboard → PostgreSQL
   - Run SQL queries above
   - Export `crypto_wallets` table for user

3. **Check Railway env vars:**
   - Dashboard → Variables tab
   - Verify `ZERION_API_KEY` exists
   - Verify `DATABASE_URL` correct

4. **Backend logs:**
   - Railway → Deployments → Logs
   - Filter by timeframe when user accessed
   - Search for errors related to crypto/wallets/Zerion

---

## Code Locations Reference

**Frontend:**
- `/frontend/src/components/accounts/LPPositionsSection.tsx:266-268` - Early return
- `/frontend/src/services/crypto-service.ts:29-31` - fetchWallets API call
- `/frontend/src/services/crypto-service.ts:63-66` - fetchDefiPositions API call

**Backend:**
- `/backend/app/routes/crypto.py:70-76` - GET wallets endpoint
- `/backend/app/routes/crypto.py:150-166` - GET defi-positions endpoint
- `/backend/app/services/crypto_wallet_service.py:83-88` - get_wallets service
- `/backend/app/services/crypto_wallet_service.py:440-493` - get_defi_positions service
- `/backend/app/services/zerion_api_service.py:158-201` - Zerion API integration

**Database Models:**
- `/backend/app/models/crypto_wallet.py:24-52` - CryptoWallet model (line 36: is_active flag)

---

## Unresolved Questions

1. What are actual production credentials? Auth failed.
2. Is production DB same as local or separate Railway PostgreSQL?
3. When did user last see DeFi positions working?
4. Did user delete wallets intentionally?
5. Was there recent deployment that might have reset data?
6. Does Zerion API key work in production environment?
