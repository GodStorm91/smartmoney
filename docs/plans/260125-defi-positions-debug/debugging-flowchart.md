# DeFi Positions Debugging Flowchart

```
START: DeFi Positions Not Showing
         |
         v
[1] Can you login to production?
         |
    No --|-- Yes
    |         |
    v         v
STOP:    [2] Run: ./test-production-api.sh
Get           |
correct       v
password [Result: X wallets, Y positions]
              |
         /----|----\
        /     |     \
    X=0    X>0     X>0
    Y=0    Y=0     Y>0
      |      |       |
      v      v       v
   [3A]   [3B]    [3C]
   No     Has     Working!
  wallets wallets  (but user
  found   but no   says not
          positions showing)
      |      |       |
      v      v       v
 Check DB  Check    Check
 for soft  Zerion   frontend
 deleted   API      build
 wallets   status   version
      |      |       |
      v      v       v
   Query  [4B]     Cache
   SQL:   Check    issue?
         backend   Hard
 SELECT  logs     refresh
 * FROM          browser
 crypto_   |
 wallets   v
 WHERE    Look for:
 user_id  "Zerion"
 = X      "Failed"
   |      errors
   |        |
   v        v
 Found?   Errors?
  |  |     |  |
 Yes No   Yes No
  |  |     |  |
  v  v     v  v
[5A][5B] [6A][6B]
Restore Check Test Manual
deleted Zerion Zerion test on
wallet API   API   Zerion.io
  |   key   direct website
  |   set?    |
  |    |      |
  v    v      v
 SQL: [7]   curl
      Verify test
UPDATE config
crypto_ in
wallets Railway
SET     env
is_     vars
active=
TRUE
```

## Decision Tree

### Path 3A: No Wallets Found
**Diagnosis:** User needs to add wallet addresses
**Fix:** Re-add via frontend or API
**Time:** 5 minutes

### Path 3B: Wallets Exist, No Positions
**Diagnosis:** Zerion API not returning data
**Possible Causes:**
- Zerion API key missing/invalid
- Wallet has no DeFi positions on configured chains
- Zerion API rate limit exceeded
- Backend error during API call

**Investigation:**
1. Check Railway env vars
2. Check backend logs
3. Test Zerion API manually
4. Verify wallet has positions on Zerion.io

**Time:** 15-30 minutes

### Path 3C: Everything Works
**Diagnosis:** Frontend cache or stale build
**Fix:** Hard refresh (Ctrl+Shift+R)
**Time:** 1 minute

### Path 5A: Soft-Deleted Wallets Found
**Diagnosis:** User deleted wallets accidentally
**Fix:** Run SQL UPDATE to restore
**Time:** 2 minutes

### Path 5B: No Wallets in DB
**Diagnosis:** Production DB empty/reset
**Fix:** User must re-add wallets
**Time:** 5 minutes

### Path 6A: Zerion API Errors in Logs
**Diagnosis:** API integration broken
**Fixes:**
- Set/update ZERION_API_KEY in Railway
- Check API key validity
- Wait if rate limited

**Time:** 10-20 minutes

### Path 6B: No Errors, But No Data
**Diagnosis:** Silent failure or wallet empty
**Investigation:**
- Verify wallet address on Zerion.io
- Check if chains configured correctly
- Test API with different wallet

**Time:** 20-30 minutes

## Quick Reference Commands

### Check Auth
```bash
curl -X POST "https://smartmoney-backend-production.up.railway.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"godstorm91@gmail.com","password":"PASSWORD"}'
```

### Check Wallets
```bash
curl -X GET "https://smartmoney-backend-production.up.railway.app/api/crypto/wallets" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Check Positions
```bash
curl -X GET "https://smartmoney-backend-production.up.railway.app/api/crypto/wallets/${WALLET_ID}/defi-positions" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Restore Deleted Wallet
```sql
UPDATE crypto_wallets
SET is_active = TRUE
WHERE user_id = (SELECT id FROM users WHERE email = 'godstorm91@gmail.com')
  AND is_active = FALSE;
```

### Test Zerion API
```bash
curl -X GET "https://api.zerion.io/v1/wallets/0xADDRESS/positions/?currency=usd&filter[positions]=only_complex" \
  -H "Authorization: Basic ${ZERION_API_KEY}"
```
