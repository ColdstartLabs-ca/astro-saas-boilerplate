-- Migration: Fix create_articles_with_credits array collection
-- Description: Fix "malformed array literal" error when inserting multiple articles
-- Date: 2026-02-11
--
-- Bug: RETURNING id INTO v_article_ids doesn't work for multi-row INSERT.
-- PostgreSQL returns a single UUID and tries to parse it as an array literal,
-- causing "malformed array literal: <uuid>" error.
-- Fix: Use CTE with array_agg() to properly collect IDs into an array.

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
