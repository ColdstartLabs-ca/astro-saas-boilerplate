-- Migration: Fix credit trigger column names and missing trusted flags
-- Date: 2026-03-04
--
-- Fixes three bugs introduced when this repo was stripped to a boilerplate:
--
-- Bug 1: prevent_credit_update() trigger still references `credits_balance`
--        which was renamed to `subscription_credits_balance` in migration
--        20251205020000_separate_credit_pools.sql. Any UPDATE on the profiles
--        table fails at runtime with "record has no field credits_balance".
--
-- Bug 2: admin_adjust_credits() still updates `credits_balance` (same rename).
--
-- Bug 3: add_subscription_credits, add_purchased_credits, and consume_credits_v2
--        never set app.trusted_credit_operation, so the protect trigger (once
--        fixed by Bug 1) blocks every credit add/consume operation.

-- =============================================================================
-- Fix 1: Update prevent_credit_update trigger to current column names
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_credit_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow trusted internal operations (service-role RPC functions)
  IF current_setting('app.trusted_credit_operation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block direct updates to credit balance columns
  IF NEW.subscription_credits_balance IS DISTINCT FROM OLD.subscription_credits_balance THEN
    RAISE EXCEPTION 'Cannot update subscription_credits_balance directly. Use the designated API endpoints.';
  END IF;

  IF NEW.purchased_credits_balance IS DISTINCT FROM OLD.purchased_credits_balance THEN
    RAISE EXCEPTION 'Cannot update purchased_credits_balance directly. Use the designated API endpoints.';
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Fix 2: Update admin_adjust_credits to use current column names
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_adjust_credits(
    target_user_id UUID,
    adjustment_amount INTEGER,
    adjustment_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    new_balance INTEGER;
BEGIN
    -- Verify caller is admin
    SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
    IF caller_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;

    -- Set trusted operation flag to bypass the credit protection trigger
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Positive adjustments go to subscription balance; negative clawback from
    -- subscription first, then purchased (FIFO mirrors consume_credits_v2).
    IF adjustment_amount >= 0 THEN
        UPDATE profiles
        SET subscription_credits_balance = subscription_credits_balance + adjustment_amount,
            updated_at = NOW()
        WHERE id = target_user_id
        RETURNING subscription_credits_balance + purchased_credits_balance INTO new_balance;
    ELSE
        DECLARE
            abs_amount INTEGER := ABS(adjustment_amount);
            sub_bal    INTEGER;
            pur_bal    INTEGER;
            from_sub   INTEGER;
            from_pur   INTEGER;
        BEGIN
            SELECT subscription_credits_balance, purchased_credits_balance
            INTO sub_bal, pur_bal
            FROM profiles
            WHERE id = target_user_id
            FOR UPDATE;

            IF (sub_bal + pur_bal) < abs_amount THEN
                RAISE EXCEPTION 'Adjustment would result in negative balance';
            END IF;

            from_sub := LEAST(sub_bal, abs_amount);
            from_pur := abs_amount - from_sub;

            UPDATE profiles
            SET subscription_credits_balance = subscription_credits_balance - from_sub,
                purchased_credits_balance    = purchased_credits_balance    - from_pur,
                updated_at = NOW()
            WHERE id = target_user_id
            RETURNING subscription_credits_balance + purchased_credits_balance INTO new_balance;
        END;
    END IF;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        reference_id,
        description
    ) VALUES (
        target_user_id,
        adjustment_amount,
        'bonus',
        'admin_' || auth.uid()::TEXT || '_' || NOW()::TEXT,
        adjustment_reason
    );

    RETURN new_balance;
END;
$$;

-- Authenticated users can call this; the function verifies admin role internally
GRANT EXECUTE ON FUNCTION admin_adjust_credits(UUID, INTEGER, TEXT) TO authenticated;

-- =============================================================================
-- Fix 3: Add trusted flag to add_subscription_credits
-- =============================================================================

CREATE OR REPLACE FUNCTION add_subscription_credits(
    target_user_id UUID,
    amount INTEGER,
    ref_id TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Mark as trusted so the protect trigger allows the balance update
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount;
    END IF;

    UPDATE profiles
    SET subscription_credits_balance = subscription_credits_balance + amount
    WHERE id = target_user_id
    RETURNING subscription_credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (target_user_id, amount, 'subscription', ref_id, description);

    RETURN new_balance;
END;
$$;

-- =============================================================================
-- Fix 4: Add trusted flag to add_purchased_credits
-- =============================================================================

CREATE OR REPLACE FUNCTION add_purchased_credits(
    target_user_id UUID,
    amount INTEGER,
    ref_id TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Mark as trusted so the protect trigger allows the balance update
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount;
    END IF;

    UPDATE profiles
    SET purchased_credits_balance = purchased_credits_balance + amount
    WHERE id = target_user_id
    RETURNING purchased_credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (target_user_id, amount, 'purchase', ref_id, description);

    RETURN new_balance;
END;
$$;

-- =============================================================================
-- Fix 5: Add trusted flag to consume_credits_v2
-- =============================================================================

CREATE OR REPLACE FUNCTION consume_credits_v2(
    target_user_id UUID,
    amount INTEGER,
    ref_id TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL
)
RETURNS TABLE(
    new_subscription_balance INTEGER,
    new_purchased_balance INTEGER,
    new_total_balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_subscription INTEGER;
    current_purchased    INTEGER;
    from_subscription    INTEGER;
    from_purchased       INTEGER;
BEGIN
    -- Mark as trusted so the protect trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount;
    END IF;

    -- Lock row and get current balances
    SELECT subscription_credits_balance, purchased_credits_balance
    INTO current_subscription, current_purchased
    FROM profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF current_subscription IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    IF (current_subscription + current_purchased) < amount THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            amount, (current_subscription + current_purchased);
    END IF;

    -- FIFO: use subscription credits first (they expire)
    from_subscription := LEAST(current_subscription, amount);
    from_purchased    := amount - from_subscription;

    UPDATE profiles
    SET subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance    = purchased_credits_balance    - from_purchased
    WHERE id = target_user_id;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (
        target_user_id,
        -amount,
        'usage',
        ref_id,
        COALESCE(description, '') ||
        CASE WHEN from_subscription > 0 AND from_purchased > 0
             THEN format(' (sub: %s, purchased: %s)', from_subscription, from_purchased)
             ELSE ''
        END
    );

    RETURN QUERY
    SELECT
        current_subscription - from_subscription,
        current_purchased    - from_purchased,
        (current_subscription - from_subscription) + (current_purchased - from_purchased);
END;
$$;
