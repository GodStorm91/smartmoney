-- ====================================================================
-- Production Database Debugging Queries for DeFi Positions Issue
-- User: godstorm91@gmail.com
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. VERIFY USER EXISTS
-- --------------------------------------------------------------------
SELECT
    id,
    email,
    created_at,
    updated_at
FROM users
WHERE email = 'godstorm91@gmail.com';

-- Save user_id from above result, replace {USER_ID} below


-- --------------------------------------------------------------------
-- 2. CHECK CRYPTO WALLETS (ACTIVE)
-- --------------------------------------------------------------------
SELECT
    id,
    wallet_address,
    label,
    chains,
    is_active,
    created_at,
    updated_at
FROM crypto_wallets
WHERE user_id = {USER_ID}
    AND is_active = TRUE
ORDER BY created_at DESC;


-- --------------------------------------------------------------------
-- 3. CHECK SOFT-DELETED WALLETS (CRITICAL!)
-- --------------------------------------------------------------------
-- If user previously had wallets but deleted them, they're here
SELECT
    id,
    wallet_address,
    label,
    chains,
    is_active,
    updated_at AS deleted_at
FROM crypto_wallets
WHERE user_id = {USER_ID}
    AND is_active = FALSE
ORDER BY updated_at DESC;

-- TO RESTORE: UPDATE crypto_wallets SET is_active = TRUE WHERE id = {WALLET_ID};


-- --------------------------------------------------------------------
-- 4. CHECK CRYPTO SYNC STATES
-- --------------------------------------------------------------------
-- Verify if sync states exist for wallets
SELECT
    css.id,
    css.wallet_id,
    css.wallet_address,
    css.chain_id,
    css.last_sync_at,
    css.sync_status,
    css.error_message,
    css.last_balance_usd
FROM crypto_sync_state css
WHERE css.user_id = {USER_ID}
ORDER BY css.last_sync_at DESC NULLS LAST;


-- --------------------------------------------------------------------
-- 5. CHECK DEFI POSITION SNAPSHOTS
-- --------------------------------------------------------------------
-- Historical snapshots of DeFi positions
SELECT
    COUNT(*) as total_snapshots,
    COUNT(DISTINCT position_id) as unique_positions,
    MIN(snapshot_date) as first_snapshot,
    MAX(snapshot_date) as last_snapshot,
    SUM(balance_usd) as total_value_latest
FROM defi_position_snapshots
WHERE user_id = {USER_ID};


-- --------------------------------------------------------------------
-- 6. RECENT DEFI POSITION SNAPSHOTS DETAILS
-- --------------------------------------------------------------------
SELECT
    position_id,
    protocol,
    symbol,
    chain_id,
    position_type,
    balance,
    balance_usd,
    snapshot_date
FROM defi_position_snapshots
WHERE user_id = {USER_ID}
ORDER BY snapshot_date DESC
LIMIT 20;


-- --------------------------------------------------------------------
-- 7. CHECK REWARD CONTRACTS
-- --------------------------------------------------------------------
SELECT
    id,
    chain_id,
    contract_address,
    label,
    token_symbol,
    is_active,
    created_at
FROM reward_contracts
WHERE user_id = {USER_ID}
ORDER BY created_at DESC;


-- --------------------------------------------------------------------
-- 8. CHECK POSITION REWARDS
-- --------------------------------------------------------------------
SELECT
    pr.id,
    pr.position_id,
    pr.reward_token_symbol,
    pr.reward_amount,
    pr.reward_usd,
    pr.claimed_at,
    pr.is_attributed,
    pr.transaction_id
FROM position_rewards pr
WHERE pr.user_id = {USER_ID}
ORDER BY pr.claimed_at DESC
LIMIT 20;


-- --------------------------------------------------------------------
-- 9. FIND ALL WALLETS (REGARDLESS OF is_active)
-- --------------------------------------------------------------------
-- Comprehensive view of all wallet records
SELECT
    id,
    wallet_address,
    label,
    chains::text,
    is_active,
    created_at,
    updated_at,
    CASE
        WHEN is_active THEN '✅ Active'
        ELSE '❌ Deleted'
    END as status
FROM crypto_wallets
WHERE user_id = {USER_ID}
ORDER BY created_at DESC;


-- --------------------------------------------------------------------
-- 10. CHECK IF DATA EXISTS BUT WALLET INACTIVE
-- --------------------------------------------------------------------
-- Find orphaned snapshots (snapshots exist but wallet is inactive)
SELECT
    dps.wallet_address,
    cw.is_active as wallet_active,
    COUNT(dps.id) as snapshot_count,
    MAX(dps.snapshot_date) as last_snapshot
FROM defi_position_snapshots dps
LEFT JOIN crypto_wallets cw
    ON cw.wallet_address = dps.wallet_address
    AND cw.user_id = dps.user_id
WHERE dps.user_id = {USER_ID}
GROUP BY dps.wallet_address, cw.is_active;


-- --------------------------------------------------------------------
-- 11. VERIFY DATABASE SCHEMA (TABLE EXISTS)
-- --------------------------------------------------------------------
-- Check if required tables exist in production
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'crypto_wallets',
        'crypto_sync_state',
        'defi_position_snapshots',
        'position_rewards'
    )
ORDER BY table_name;


-- --------------------------------------------------------------------
-- 12. COUNT ALL CRYPTO-RELATED RECORDS BY USER
-- --------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM crypto_wallets WHERE user_id = {USER_ID}) as wallets_total,
    (SELECT COUNT(*) FROM crypto_wallets WHERE user_id = {USER_ID} AND is_active = TRUE) as wallets_active,
    (SELECT COUNT(*) FROM crypto_sync_state WHERE user_id = {USER_ID}) as sync_states,
    (SELECT COUNT(*) FROM defi_position_snapshots WHERE user_id = {USER_ID}) as snapshots,
    (SELECT COUNT(*) FROM reward_contracts WHERE user_id = {USER_ID}) as reward_contracts,
    (SELECT COUNT(*) FROM position_rewards WHERE user_id = {USER_ID}) as position_rewards;


-- ====================================================================
-- RESTORATION QUERIES (Use with caution!)
-- ====================================================================

-- Restore deleted wallet (if soft-deleted by mistake)
-- UPDATE crypto_wallets
-- SET is_active = TRUE
-- WHERE id = {WALLET_ID} AND user_id = {USER_ID};

-- Manually create wallet if missing (replace values)
-- INSERT INTO crypto_wallets (user_id, wallet_address, label, chains, is_active)
-- VALUES ({USER_ID}, '0xYOUR_WALLET_ADDRESS', 'Main Wallet', '["eth","polygon"]'::json, TRUE);
