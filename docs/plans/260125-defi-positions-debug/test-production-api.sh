#!/bin/bash
# Production DeFi Positions Debugging Script
# Usage: ./test-production-api.sh <email> <password>

set -e

API_BASE="https://smartmoney-backend-production.up.railway.app"
EMAIL="${1:-godstorm91@gmail.com}"
PASSWORD="${2}"

if [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <email> <password>"
    exit 1
fi

echo "========================================="
echo "DeFi Positions Production Debug Script"
echo "========================================="
echo ""

# Step 1: Login
echo "[1/5] Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Authentication failed. Check credentials."
    exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Step 2: Fetch crypto wallets
echo "[2/5] Fetching crypto wallets..."
WALLETS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/crypto/wallets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$WALLETS_RESPONSE" | jq '.' 2>/dev/null || echo "$WALLETS_RESPONSE"

WALLET_COUNT=$(echo "$WALLETS_RESPONSE" | jq 'length // 0')
echo "Found ${WALLET_COUNT} wallets"
echo ""

if [ "$WALLET_COUNT" -eq 0 ]; then
    echo "⚠️  No wallets found. This explains why DeFi positions section is hidden."
    echo "   User needs to re-add crypto wallets."
    exit 0
fi

# Step 3: Get first wallet details
echo "[3/5] Getting wallet details..."
WALLET_ID=$(echo "$WALLETS_RESPONSE" | jq -r '.[0].id')
WALLET_ADDRESS=$(echo "$WALLETS_RESPONSE" | jq -r '.[0].wallet_address')
WALLET_CHAINS=$(echo "$WALLETS_RESPONSE" | jq -r '.[0].chains | join(",")')

echo "Wallet ID: ${WALLET_ID}"
echo "Address: ${WALLET_ADDRESS}"
echo "Chains: ${WALLET_CHAINS}"
echo ""

# Step 4: Fetch DeFi positions
echo "[4/5] Fetching DeFi positions for wallet ${WALLET_ID}..."
POSITIONS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/crypto/wallets/${WALLET_ID}/defi-positions" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$POSITIONS_RESPONSE" | jq '.' 2>/dev/null || echo "$POSITIONS_RESPONSE"

POSITION_COUNT=$(echo "$POSITIONS_RESPONSE" | jq '.positions | length // 0')
TOTAL_VALUE=$(echo "$POSITIONS_RESPONSE" | jq -r '.total_value_usd // 0')

echo ""
echo "Positions found: ${POSITION_COUNT}"
echo "Total value: \$${TOTAL_VALUE}"
echo ""

if [ "$POSITION_COUNT" -eq 0 ]; then
    echo "⚠️  No DeFi positions found."
    echo "   Possible causes:"
    echo "   - Zerion API not returning positions"
    echo "   - User has no active DeFi positions on configured chains"
    echo "   - Zerion API key not configured in production"
fi

# Step 5: Test Zerion API health (requires ZERION_API_KEY)
echo "[5/5] Summary"
echo "========================================="
echo "Wallets: ${WALLET_COUNT}"
echo "DeFi Positions: ${POSITION_COUNT}"
echo "Total Value: \$${TOTAL_VALUE}"
echo "========================================="

if [ "$WALLET_COUNT" -gt 0 ] && [ "$POSITION_COUNT" -eq 0 ]; then
    echo ""
    echo "🔍 Next debugging steps:"
    echo "1. Check Railway env vars for ZERION_API_KEY"
    echo "2. Check backend logs for Zerion API errors"
    echo "3. Verify wallet address has DeFi positions on Zerion.io"
    echo "4. Test Zerion API directly:"
    echo "   curl -X GET 'https://api.zerion.io/v1/wallets/${WALLET_ADDRESS}/positions/?currency=usd&filter[positions]=only_complex' \\"
    echo "     -H 'Authorization: Basic \$ZERION_API_KEY'"
fi
