-- Migration: Fix credit protection trigger + RPC trusted operation flag
-- Description: Two bugs preventing campaign start:
--   1. prevent_credit_update() trigger references old column "credits_balance"
--      (renamed to subscription_credits_balance in 20251205020000)
--   2. create_article(s)_with_credits RPCs don't set app.trusted_credit_operation,
--      so the trigger blocks their UPDATE to profiles
-- Date: 2026-02-11

-- =============================================================================
-- Fix 1: Update the trigger function to use current column names
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_credit_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if this is a trusted internal operation (from our RPC functions)
  IF current_setting('app.trusted_credit_operation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block any attempt to change credit balances for untrusted operations
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
-- Fix 2: Recreate create_article_with_credits with trusted operation flag
-- =============================================================================

CREATE OR REPLACE FUNCTION create_article_with_credits(
    p_user_id UUID,
    p_campaign_id UUID,
    p_project_id UUID,
    p_primary_keyword TEXT,
    p_credits_needed INTEGER DEFAULT 1,
    p_status TEXT DEFAULT 'generating',
    p_image_preset TEXT DEFAULT NULL
)
RETURNS TABLE(
    article_id UUID,
    transaction_id BIGINT,
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
    v_article_id UUID;
    v_transaction_id BIGINT;
    v_description TEXT;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate amount
    IF p_credits_needed <= 0 THEN
        RAISE EXCEPTION 'Credits needed must be positive: %', p_credits_needed;
    END IF;

    -- Validate status
    IF p_status NOT IN ('queued', 'generating', 'draft', 'reviewed', 'published', 'failed') THEN
        RAISE EXCEPTION 'Invalid article status: %', p_status;
    END IF;

    -- Lock user row and get current balances (prevents race conditions)
    SELECT subscription_credits_balance, purchased_credits_balance
    INTO current_subscription, current_purchased
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF current_subscription IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Check total balance
    IF (current_subscription + current_purchased) < p_credits_needed THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            p_credits_needed, (current_subscription + current_purchased);
    END IF;

    -- Calculate credit split (FIFO: subscription first, then purchased)
    from_subscription := LEAST(current_subscription, p_credits_needed);
    from_purchased := p_credits_needed - from_subscription;

    -- Create article record
    INSERT INTO articles (
        user_id,
        campaign_id,
        project_id,
        primary_keyword,
        status,
        credits_used,
        image_preset
    )
    VALUES (
        p_user_id,
        p_campaign_id,
        p_project_id,
        p_primary_keyword,
        p_status,
        p_credits_needed,
        p_image_preset
    )
    RETURNING id INTO v_article_id;

    -- Update balances atomically
    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = p_user_id;

    -- Build description
    v_description := 'Article generation' ||
        CASE WHEN p_image_preset IS NOT NULL THEN format(' with %s image', p_image_preset) ELSE '' END ||
        CASE WHEN from_subscription > 0 AND from_purchased > 0
             THEN format(' (sub: %s, purchased: %s)', from_subscription, from_purchased)
             ELSE ''
        END;

    -- Log transaction (negative amount for consumption)
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (
        p_user_id,
        -p_credits_needed,
        'usage',
        v_article_id::TEXT,
        v_description
    )
    RETURNING id INTO v_transaction_id;

    -- Return results
    RETURN QUERY
    SELECT
        v_article_id,
        v_transaction_id,
        current_subscription - from_subscription,
        current_purchased - from_purchased,
        (current_subscription - from_subscription) + (current_purchased - from_purchased);
END;
$$;

-- =============================================================================
-- Fix 3: Recreate create_articles_with_credits with trusted operation flag
--         (also includes the array_agg fix from previous migration)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_articles_with_credits(
    p_user_id UUID,
    p_campaign_id UUID,
    p_project_id UUID,
    p_keywords TEXT[],
    p_credits_per_article INTEGER DEFAULT 1,
    p_status TEXT DEFAULT 'queued',
    p_image_preset TEXT DEFAULT NULL
)
RETURNS TABLE(
    article_ids UUID[],
    transaction_id BIGINT,
    total_credits_used INTEGER,
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
    v_total_credits INTEGER;
    v_article_ids UUID[];
    v_transaction_id BIGINT;
    v_description TEXT;
BEGIN
    -- Mark as trusted credit operation so the trigger allows balance updates
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    -- Validate inputs
    IF p_keywords IS NULL OR array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0 THEN
        RAISE EXCEPTION 'Keywords array cannot be empty';
    END IF;

    IF p_credits_per_article <= 0 THEN
        RAISE EXCEPTION 'Credits per article must be positive: %', p_credits_per_article;
    END IF;

    IF p_status NOT IN ('queued', 'generating', 'draft', 'reviewed', 'published', 'failed') THEN
        RAISE EXCEPTION 'Invalid article status: %', p_status;
    END IF;

    -- Calculate total credits needed
    v_total_credits := p_credits_per_article * array_length(p_keywords, 1);

    -- Lock user row and get current balances
    SELECT subscription_credits_balance, purchased_credits_balance
    INTO current_subscription, current_purchased
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF current_subscription IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Check total balance
    IF (current_subscription + current_purchased) < v_total_credits THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            v_total_credits, (current_subscription + current_purchased);
    END IF;

    -- Calculate credit split (FIFO: subscription first, then purchased)
    from_subscription := LEAST(current_subscription, v_total_credits);
    from_purchased := v_total_credits - from_subscription;

    -- Create all article records and collect IDs via CTE + array_agg
    WITH inserted AS (
        INSERT INTO articles (
            user_id,
            campaign_id,
            project_id,
            primary_keyword,
            status,
            credits_used,
            image_preset
        )
        SELECT
            p_user_id,
            p_campaign_id,
            p_project_id,
            unnest(p_keywords),
            p_status,
            p_credits_per_article,
            p_image_preset
        RETURNING id
    )
    SELECT array_agg(id) INTO v_article_ids FROM inserted;

    -- Update balances atomically
    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = p_user_id;

    -- Build description
    v_description := format('Campaign batch generation: %s articles', array_length(p_keywords, 1)) ||
        CASE WHEN p_image_preset IS NOT NULL THEN format(' with %s images', p_image_preset) ELSE '' END ||
        CASE WHEN from_subscription > 0 AND from_purchased > 0
             THEN format(' (sub: %s, purchased: %s)', from_subscription, from_purchased)
             ELSE ''
        END;

    -- Log transaction (using campaign_id as reference for batch operations)
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (
        p_user_id,
        -v_total_credits,
        'usage',
        p_campaign_id::TEXT,
        v_description
    )
    RETURNING id INTO v_transaction_id;

    -- Return results
    RETURN QUERY
    SELECT
        v_article_ids,
        v_transaction_id,
        v_total_credits,
        current_subscription - from_subscription,
        current_purchased - from_purchased,
        (current_subscription - from_subscription) + (current_purchased - from_purchased);
END;
$$;
