-- Migration: Fix transaction_id type from BIGINT to UUID
-- Description: credit_transactions.id is UUID, not BIGINT.
--              Both create_article(s)_with_credits RPCs declared it as BIGINT,
--              causing "invalid input syntax for type bigint" errors.
-- Date: 2026-02-11

-- Must DROP first because CREATE OR REPLACE cannot change return types

-- Drop batch version
DROP FUNCTION IF EXISTS create_articles_with_credits(UUID, UUID, UUID, TEXT[], INTEGER, TEXT, TEXT);

-- Drop single version
DROP FUNCTION IF EXISTS create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT);

-- =============================================================================
-- Recreate single-article version with correct UUID type
-- =============================================================================

CREATE FUNCTION create_article_with_credits(
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
    transaction_id UUID,
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
    v_transaction_id UUID;
    v_description TEXT;
BEGIN
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF p_credits_needed <= 0 THEN
        RAISE EXCEPTION 'Credits needed must be positive: %', p_credits_needed;
    END IF;

    IF p_status NOT IN ('queued', 'generating', 'draft', 'reviewed', 'published', 'failed') THEN
        RAISE EXCEPTION 'Invalid article status: %', p_status;
    END IF;

    SELECT subscription_credits_balance, purchased_credits_balance
    INTO current_subscription, current_purchased
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF current_subscription IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    IF (current_subscription + current_purchased) < p_credits_needed THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            p_credits_needed, (current_subscription + current_purchased);
    END IF;

    from_subscription := LEAST(current_subscription, p_credits_needed);
    from_purchased := p_credits_needed - from_subscription;

    INSERT INTO articles (
        user_id, campaign_id, project_id, primary_keyword,
        status, credits_used, image_preset
    )
    VALUES (
        p_user_id, p_campaign_id, p_project_id, p_primary_keyword,
        p_status, p_credits_needed, p_image_preset
    )
    RETURNING id INTO v_article_id;

    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = p_user_id;

    v_description := 'Article generation' ||
        CASE WHEN p_image_preset IS NOT NULL THEN format(' with %s image', p_image_preset) ELSE '' END ||
        CASE WHEN from_subscription > 0 AND from_purchased > 0
             THEN format(' (sub: %s, purchased: %s)', from_subscription, from_purchased)
             ELSE ''
        END;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (p_user_id, -p_credits_needed, 'usage', v_article_id::TEXT, v_description)
    RETURNING id INTO v_transaction_id;

    RETURN QUERY
    SELECT
        v_article_id,
        v_transaction_id,
        current_subscription - from_subscription,
        current_purchased - from_purchased,
        (current_subscription - from_subscription) + (current_purchased - from_purchased);
END;
$$;

GRANT EXECUTE ON FUNCTION create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO service_role;

-- =============================================================================
-- Recreate batch version with correct UUID type + array_agg fix
-- =============================================================================

CREATE FUNCTION create_articles_with_credits(
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
    transaction_id UUID,
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
    v_transaction_id UUID;
    v_description TEXT;
BEGIN
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF p_keywords IS NULL OR array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0 THEN
        RAISE EXCEPTION 'Keywords array cannot be empty';
    END IF;

    IF p_credits_per_article <= 0 THEN
        RAISE EXCEPTION 'Credits per article must be positive: %', p_credits_per_article;
    END IF;

    IF p_status NOT IN ('queued', 'generating', 'draft', 'reviewed', 'published', 'failed') THEN
        RAISE EXCEPTION 'Invalid article status: %', p_status;
    END IF;

    v_total_credits := p_credits_per_article * array_length(p_keywords, 1);

    SELECT subscription_credits_balance, purchased_credits_balance
    INTO current_subscription, current_purchased
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF current_subscription IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    IF (current_subscription + current_purchased) < v_total_credits THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %',
            v_total_credits, (current_subscription + current_purchased);
    END IF;

    from_subscription := LEAST(current_subscription, v_total_credits);
    from_purchased := v_total_credits - from_subscription;

    WITH inserted AS (
        INSERT INTO articles (
            user_id, campaign_id, project_id, primary_keyword,
            status, credits_used, image_preset
        )
        SELECT
            p_user_id, p_campaign_id, p_project_id,
            unnest(p_keywords), p_status, p_credits_per_article, p_image_preset
        RETURNING id
    )
    SELECT array_agg(id) INTO v_article_ids FROM inserted;

    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = p_user_id;

    v_description := format('Campaign batch generation: %s articles', array_length(p_keywords, 1)) ||
        CASE WHEN p_image_preset IS NOT NULL THEN format(' with %s images', p_image_preset) ELSE '' END ||
        CASE WHEN from_subscription > 0 AND from_purchased > 0
             THEN format(' (sub: %s, purchased: %s)', from_subscription, from_purchased)
             ELSE ''
        END;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (p_user_id, -v_total_credits, 'usage', p_campaign_id::TEXT, v_description)
    RETURNING id INTO v_transaction_id;

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

GRANT EXECUTE ON FUNCTION create_articles_with_credits(UUID, UUID, UUID, TEXT[], INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_articles_with_credits(UUID, UUID, UUID, TEXT[], INTEGER, TEXT, TEXT) TO service_role;
