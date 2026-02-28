-- Migration: Add 'planned' to article status
-- Description: Adds 'planned' as a new article status for content calendar planning stubs.
--   Planned articles have no content and no credits spent — they are lightweight placeholders.
-- Date: 2026-02-28

-- =============================================================================
-- Step 1: Drop and recreate the status CHECK constraint on articles
-- =============================================================================

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check
    CHECK (status IN (
      'planned',
      'queued',
      'generating',
      'draft',
      'qa_checking',
      'qa_passed',
      'qa_failed',
      'approved',
      'rejected',
      'reviewed',
      'published',
      'failed',
      'failed_quality',
      'failed_timeout'
    ));

-- =============================================================================
-- Step 2: Update create_article_with_credits RPC to accept 'planned'
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
    -- Validate amount
    IF p_credits_needed <= 0 THEN
        RAISE EXCEPTION 'Credits needed must be positive: %', p_credits_needed;
    END IF;

    -- Validate status
    IF p_status NOT IN ('planned', 'queued', 'generating', 'draft', 'qa_checking', 'qa_passed', 'qa_failed', 'approved', 'rejected', 'reviewed', 'published', 'failed', 'failed_quality', 'failed_timeout') THEN
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

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION create_article_with_credits IS
'Atomically creates an article and deducts credits in a single transaction. Returns article ID, transaction ID, and updated balances. Prevents orphaned articles and partial credit states.';

-- =============================================================================
-- Step 3: Update create_articles_with_credits RPC to accept 'planned'
-- =============================================================================

CREATE OR REPLACE FUNCTION create_articles_with_credits(
    p_user_id UUID,
    p_campaign_id UUID,
    p_project_id UUID,
    p_keywords TEXT[], -- Array of keywords
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
    v_article RECORD;
BEGIN
    -- Validate inputs
    IF p_keywords IS NULL OR array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0 THEN
        RAISE EXCEPTION 'Keywords array cannot be empty';
    END IF;

    IF p_credits_per_article <= 0 THEN
        RAISE EXCEPTION 'Credits per article must be positive: %', p_credits_per_article;
    END IF;

    IF p_status NOT IN ('planned', 'queued', 'generating', 'draft', 'qa_checking', 'qa_passed', 'qa_failed', 'approved', 'rejected', 'reviewed', 'published', 'failed', 'failed_quality', 'failed_timeout') THEN
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

    -- Calculate credit split
    from_subscription := LEAST(current_subscription, v_total_credits);
    from_purchased := v_total_credits - from_subscription;

    -- Create all article records in one operation
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
    RETURNING id INTO v_article_ids;

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

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION create_articles_with_credits(UUID, UUID, UUID, TEXT[], INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_articles_with_credits(UUID, UUID, UUID, TEXT[], INTEGER, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION create_articles_with_credits IS
'Atomically creates multiple articles and deducts total credits in a single transaction. Used for campaign start. Returns article IDs array, transaction ID, total credits used, and updated balances. Prevents orphaned articles and partial credit states.';
