-- Migration: Fix add_purchased_credits and add_subscription_credits missing trusted flag
-- Description: Both RPCs update purchased_credits_balance / subscription_credits_balance
--   but don't set app.trusted_credit_operation, so the prevent_credit_update trigger
--   blocks them. This causes credit refunds to fail after article generation errors.
-- Date: 2026-03-01

-- =============================================================================
-- Fix 1: add_purchased_credits — add trusted_credit_operation flag
-- =============================================================================

CREATE OR REPLACE FUNCTION add_purchased_credits(
    target_user_id UUID,
    amount INTEGER,
    ref_id TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL
)
RETURNS INTEGER -- returns new purchased balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate amount
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount;
    END IF;

    -- Update purchased credits
    UPDATE profiles
    SET purchased_credits_balance = purchased_credits_balance + amount
    WHERE id = target_user_id
    RETURNING purchased_credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (target_user_id, amount, 'purchase', ref_id, description);

    RETURN new_balance;
END;
$$;

-- =============================================================================
-- Fix 2: add_subscription_credits — add trusted_credit_operation flag
-- =============================================================================

CREATE OR REPLACE FUNCTION add_subscription_credits(
    target_user_id UUID,
    amount INTEGER,
    ref_id TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL
)
RETURNS INTEGER -- returns new subscription balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate amount
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount;
    END IF;

    -- Update subscription credits
    UPDATE profiles
    SET subscription_credits_balance = subscription_credits_balance + amount
    WHERE id = target_user_id
    RETURNING subscription_credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;

    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (target_user_id, amount, 'subscription', ref_id, description);

    RETURN new_balance;
END;
$$;

-- =============================================================================
-- Fix 3: consume_credits_v2 — add trusted_credit_operation flag (was also missing)
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
    current_purchased INTEGER;
    from_subscription INTEGER;
    from_purchased INTEGER;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate amount
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

    -- Check total balance
    IF (current_subscription + current_purchased) < amount THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            amount, (current_subscription + current_purchased);
    END IF;

    -- Calculate split (FIFO: use subscription credits first since they expire)
    from_subscription := LEAST(current_subscription, amount);
    from_purchased := amount - from_subscription;

    -- Update balances atomically
    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = target_user_id;

    -- Log transaction with breakdown (negative amount for consumption)
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

    -- Return updated balances
    RETURN QUERY
    SELECT
        current_subscription - from_subscription,
        current_purchased - from_purchased,
        (current_subscription - from_subscription) + (current_purchased - from_purchased);
END;
$$;

-- =============================================================================
-- Fix 4: expire_subscription_credits — add trusted_credit_operation flag
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_subscription_credits(
    target_user_id UUID,
    expiration_reason TEXT DEFAULT 'cycle_end',
    subscription_stripe_id TEXT DEFAULT NULL,
    cycle_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER -- returns amount expired
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_amount INTEGER;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate expiration reason
    IF expiration_reason NOT IN ('cycle_end', 'rolling_window', 'subscription_canceled') THEN
        RAISE EXCEPTION 'Invalid expiration_reason: %', expiration_reason;
    END IF;

    -- Get current SUBSCRIPTION balance only (lock row)
    SELECT subscription_credits_balance INTO expired_amount
    FROM profiles
    WHERE id = target_user_id
    FOR UPDATE;

    -- If user not found or subscription balance is 0, nothing to expire
    IF expired_amount IS NULL OR expired_amount <= 0 THEN
        RETURN 0;
    END IF;

    -- Reset ONLY subscription balance (purchased credits remain untouched!)
    UPDATE profiles
    SET
        subscription_credits_balance = 0,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Log expiration transaction
    INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
    VALUES (
        target_user_id,
        -expired_amount,
        'expired',
        'Subscription credits expired at billing cycle end',
        subscription_stripe_id
    );

    -- Log to expiration events table
    INSERT INTO credit_expiration_events (
        user_id,
        expired_amount,
        expiration_reason,
        billing_cycle_end,
        subscription_id
    ) VALUES (
        target_user_id,
        expired_amount,
        expiration_reason,
        cycle_end_date,
        subscription_stripe_id
    );

    RETURN expired_amount;
END;
$$;

-- =============================================================================
-- Fix 5: increment_credits_with_log (legacy) — inherits fix from add_* functions
-- =============================================================================
-- No change needed — it delegates to add_subscription_credits / add_purchased_credits
-- which now both set the trusted flag.
