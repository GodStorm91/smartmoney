# DeFi Positions Debug - Action Plan

## Problem
User reports DeFi positions not showing on Accounts page in PRODUCTION.

## Root Cause (Most Likely)
Frontend component returns `null` if `wallets.length === 0` (LPPositionsSection.tsx:266-268).
User likely has no active wallets in production database.

## Immediate Actions

### 1. Get Production Access (CRITICAL)
- [ ] Verify correct production credentials
- [ ] Test login via frontend: https://smartmoney-backend-production.up.railway.app
- [ ] If credentials wrong, reset password or get actual prod credentials

### 2. Run Debug Script
```bash
cd docs/plans/260125-defi-positions-debug
./test-production-api.sh godstorm91@gmail.com <CORRECT_PASSWORD>
```

This will show:
- ✅ How many wallets exist
- ✅ How many DeFi positions found
- ✅ Total value

### 3. Check Database (Railway)
Railway Dashboard → PostgreSQL → Query Editor:
```sql
-- Get user ID
SELECT id FROM users WHERE email = 'godstorm91@gmail.com';

-- Check wallets (replace {USER_ID})
SELECT * FROM crypto_wallets WHERE user_id = {USER_ID};
```

**Expected Findings:**
- If `crypto_wallets` is empty → User needs to re-add wallets
- If `is_active = FALSE` → Wallets were soft-deleted, restore them
- If wallets exist but no positions → Zerion API issue

### 4. Verify Zerion API Key (Railway)
Railway Dashboard → Variables:
- [ ] Check `ZERION_API_KEY` exists
- [ ] Test key manually:
```bash
curl -X GET "https://api.zerion.io/v1/wallets/0xYOUR_ADDRESS/positions/?currency=usd&filter[positions]=only_complex" \
  -H "Authorization: Basic ${ZERION_API_KEY}"
```

### 5. Check Backend Logs (Railway)
Railway → Logs → Search for:
- "Zerion" (API errors)
- "Failed to fetch DeFi positions"
- "crypto_wallets"

## Quick Fixes

### Fix 1: Restore Soft-Deleted Wallets
```sql
UPDATE crypto_wallets
SET is_active = TRUE
WHERE user_id = {USER_ID} AND is_active = FALSE;
```

### Fix 2: Re-add Wallet via API
```bash
curl -X POST https://smartmoney-backend-production.up.railway.app/api/crypto/wallets \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0xYOUR_WALLET_ADDRESS",
    "label": "Main Wallet",
    "chains": ["eth", "polygon"]
  }'
```

### Fix 3: Set Zerion API Key (if missing)
Railway Dashboard → Variables → Add:
```
ZERION_API_KEY=emtfZGV2X2Q0OTMxNTk1ZTc0YjQyNWY4YjE1OGFiYzRmMmI0MzBkOg==
```

## Files Created
- `investigation-report.md` - Full technical analysis
- `test-production-api.sh` - API testing script
- `database-queries.sql` - SQL debugging queries
- `action-plan.md` - This file
