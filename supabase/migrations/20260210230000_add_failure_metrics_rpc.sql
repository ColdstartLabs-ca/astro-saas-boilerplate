-- Add RPC functions for failure metrics dashboard queries
-- This migration implements E13: Add structured failure taxonomy and metrics
-- Timestamp: 20260210230000

-- ============================================================
-- RPC: Get failure metrics grouped by stage
-- ============================================================
CREATE OR REPLACE FUNCTION get_failure_metrics_by_stage(
  p_hours_ago INTEGER DEFAULT 24,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  failure_stage TEXT,
  failure_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_failures BIGINT;
BEGIN
  -- Count total failures in period
  SELECT COUNT(*)
  INTO v_total_failures
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Return failures grouped by stage
  RETURN QUERY
  SELECT
    COALESCE(failure_stage, 'unknown')::TEXT AS failure_stage,
    COUNT(*)::BIGINT AS failure_count,
    ROUND(
      CASE
        WHEN v_total_failures > 0 THEN (COUNT(*)::NUMERIC / v_total_failures * 100)
        ELSE 0
      END,
      2
    ) AS percentage
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY failure_stage
  ORDER BY failure_count DESC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_failure_metrics_by_stage(INTEGER, UUID, UUID) TO authenticated;

-- ============================================================
-- RPC: Get failure metrics grouped by provider
-- ============================================================
CREATE OR REPLACE FUNCTION get_failure_metrics_by_provider(
  p_hours_ago INTEGER DEFAULT 24,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  provider TEXT,
  failure_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_failures BIGINT;
BEGIN
  -- Count total failures in period
  SELECT COUNT(*)
  INTO v_total_failures
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Return failures grouped by provider
  RETURN QUERY
  SELECT
    COALESCE(provider, 'unknown')::TEXT AS provider,
    COUNT(*)::BIGINT AS failure_count,
    ROUND(
      CASE
        WHEN v_total_failures > 0 THEN (COUNT(*)::NUMERIC / v_total_failures * 100)
        ELSE 0
      END,
      2
    ) AS percentage
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY provider
  ORDER BY failure_count DESC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_failure_metrics_by_provider(INTEGER, UUID, UUID) TO authenticated;

-- ============================================================
-- RPC: Get failure metrics grouped by AI model
-- ============================================================
CREATE OR REPLACE FUNCTION get_failure_metrics_by_model(
  p_hours_ago INTEGER DEFAULT 24,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  ai_model_used TEXT,
  failure_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_failures BIGINT;
BEGIN
  -- Count total failures in period
  SELECT COUNT(*)
  INTO v_total_failures
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Return failures grouped by model
  RETURN QUERY
  SELECT
    COALESCE(ai_model_used, 'unknown')::TEXT AS ai_model_used,
    COUNT(*)::BIGINT AS failure_count,
    ROUND(
      CASE
        WHEN v_total_failures > 0 THEN (COUNT(*)::NUMERIC / v_total_failures * 100)
        ELSE 0
      END,
      2
    ) AS percentage
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY ai_model_used
  ORDER BY failure_count DESC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_failure_metrics_by_model(INTEGER, UUID, UUID) TO authenticated;

-- ============================================================
-- RPC: Get failure rate over time (hourly buckets)
-- ============================================================
CREATE OR REPLACE FUNCTION get_failure_rate_over_time(
  p_hours_ago INTEGER DEFAULT 24,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  total_articles BIGINT,
  failed_articles BIGINT,
  failure_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', created_at) AS hour,
    COUNT(*)::BIGINT AS total_articles,
    COUNT(*) FILTER (WHERE status IN ('failed', 'failed_quality'))::BIGINT AS failed_articles,
    ROUND(
      CASE
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status IN ('failed', 'failed_quality'))::NUMERIC / COUNT(*) * 100)
        ELSE 0
      END,
      2
    ) AS failure_rate
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY date_trunc('hour', created_at)
  ORDER BY hour DESC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_failure_rate_over_time(INTEGER, UUID, UUID) TO authenticated;

-- ============================================================
-- RPC: Get retryable failures (for recovery queue)
-- ============================================================
CREATE OR REPLACE FUNCTION get_retryable_failures(
  p_hours_ago INTEGER DEFAULT 24,
  p_limit INTEGER DEFAULT 100,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  article_id UUID,
  primary_keyword TEXT,
  failure_stage TEXT,
  provider TEXT,
  attempt_count INTEGER,
  is_retryable BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS article_id,
    primary_keyword,
    failure_stage::TEXT,
    provider,
    attempt_count,
    is_retryable,
    created_at
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status = 'failed'
    AND is_retryable = true
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_retryable_failures(INTEGER, INTEGER, UUID, UUID) TO authenticated;

-- ============================================================
-- RPC: Get overall failure summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_failure_summary(
  p_hours_ago INTEGER DEFAULT 24,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_articles BIGINT,
  total_failures BIGINT,
  retryable_failures BIGINT,
  overall_failure_rate NUMERIC,
  top_failure_stage TEXT,
  top_provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_articles BIGINT;
  v_total_failures BIGINT;
  v_retryable_failures BIGINT;
  v_top_failure_stage TEXT;
  v_top_provider TEXT;
BEGIN
  -- Get total articles in period
  SELECT COUNT(*)
  INTO v_total_articles
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Get total failures
  SELECT COUNT(*)
  INTO v_total_failures
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Get retryable failures
  SELECT COUNT(*)
  INTO v_retryable_failures
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status = 'failed'
    AND is_retryable = true
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Get top failure stage
  SELECT COALESCE(failure_stage::TEXT, 'unknown')
  INTO v_top_failure_stage
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY failure_stage
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Get top provider
  SELECT COALESCE(provider, 'unknown')
  INTO v_top_provider
  FROM articles
  WHERE created_at >= NOW() - (p_hours_ago || ' hours')::INTERVAL
    AND status IN ('failed', 'failed_quality')
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY provider
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    v_total_articles::BIGINT,
    v_total_failures::BIGINT,
    v_retryable_failures::BIGINT,
    ROUND(
      CASE
        WHEN v_total_articles > 0 THEN (v_total_failures::NUMERIC / v_total_articles * 100)
        ELSE 0
      END,
      2
    ),
    v_top_failure_stage,
    v_top_provider;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_failure_summary(INTEGER, UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_failure_metrics_by_stage IS 'Returns failure counts grouped by stage for the specified time period';
COMMENT ON FUNCTION get_failure_metrics_by_provider IS 'Returns failure counts grouped by provider for the specified time period';
COMMENT ON FUNCTION get_failure_metrics_by_model IS 'Returns failure counts grouped by AI model for the specified time period';
COMMENT ON FUNCTION get_failure_rate_over_time IS 'Returns hourly failure rate trends for the specified time period';
COMMENT ON FUNCTION get_retryable_failures IS 'Returns articles with retryable failures for recovery queue';
COMMENT ON FUNCTION get_failure_summary IS 'Returns overall failure summary including total failures, rate, and top contributors';
