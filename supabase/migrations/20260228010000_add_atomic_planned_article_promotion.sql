-- Migration: Add atomic planned-article promotion RPC
-- Description:
--   Promote an existing planned article to queued, deduct credits, and insert
--   a credit ledger row atomically in one transaction.
--   This prevents double charging under concurrent cron/manual triggers.
-- Date: 2026-02-28

DROP FUNCTION IF EXISTS promote_planned_article_with_credits(UUID, UUID, INTEGER, TEXT);

CREATE FUNCTION promote_planned_article_with_credits(
    p_article_id UUID,
    p_user_id UUID,
    p_credits_needed INTEGER,
    p_description TEXT DEFAULT NULL
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
    v_keyword TEXT;
    v_transaction_id UUID;
    v_description TEXT;
BEGIN
    PERFORM set_config('app.trusted_credit_operation', 'true', true);

    IF p_credits_needed <= 0 THEN
        RAISE EXCEPTION 'Credits needed must be positive: %', p_credits_needed;
    END IF;

    -- Claim planned article atomically.
    -- If no row is returned, the article is already claimed/promoted or not owned by user.
    UPDATE articles
    SET
        status = 'queued',
        credits_used = p_credits_needed,
        updated_at = NOW()
    WHERE id = p_article_id
      AND user_id = p_user_id
      AND status = 'planned'
    RETURNING id, primary_keyword INTO v_article_id, v_keyword;

    IF v_article_id IS NULL THEN
        RETURN;
    END IF;

    -- Lock user balance row for safe deduction.
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

    UPDATE profiles
    SET
        subscription_credits_balance = subscription_credits_balance - from_subscription,
        purchased_credits_balance = purchased_credits_balance - from_purchased
    WHERE id = p_user_id;

    v_description := COALESCE(
        NULLIF(TRIM(COALESCE(p_description, '')), ''),
        format('Planned article generation: %s', COALESCE(v_keyword, 'unknown'))
    );

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (
        p_user_id,
        -p_credits_needed,
        'usage',
        v_article_id::TEXT,
        v_description
    )
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

REVOKE ALL ON FUNCTION promote_planned_article_with_credits(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION promote_planned_article_with_credits(UUID, UUID, INTEGER, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION promote_planned_article_with_credits(UUID, UUID, INTEGER, TEXT) TO service_role;

COMMENT ON FUNCTION promote_planned_article_with_credits IS
'Atomically promotes a planned article to queued and deducts credits with ledger entry. Returns empty set when article is already claimed/not planned.';
