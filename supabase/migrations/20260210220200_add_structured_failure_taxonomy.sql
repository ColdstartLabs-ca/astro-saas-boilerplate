-- Add structured failure taxonomy and metrics to articles table
-- This migration implements E13: Add structured failure taxonomy and metrics
-- Timestamp: 20260210220000

-- Create failure_stage enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'failure_stage') THEN
    CREATE TYPE failure_stage AS ENUM (
      'credit_check',       -- Failed credit verification
      'outline_generation', -- Failed to generate outline
      'article_generation', -- Failed to generate full article
      'quality_gate',       -- Failed quality gate checks (word count, structure, etc.)
      'image_generation',   -- Failed to generate images
      'image_upload',       -- Failed to upload images to storage
      'metadata_extraction',-- Failed to extract metadata
      'storage',            -- Failed to save article to database
      'unknown'             -- Uncategorized failure
    );
  END IF;
END$$;

-- Add structured failure columns to articles table
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS failure_stage failure_stage DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS http_status INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1 CHECK (attempt_count >= 1),
  ADD COLUMN IF NOT EXISTS is_retryable BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.articles.failure_stage IS 'Stage of generation pipeline where failure occurred (enum)';
COMMENT ON COLUMN public.articles.provider IS 'AI provider or service that failed (e.g., openrouter, replicate, supabase)';
COMMENT ON COLUMN public.articles.http_status IS 'HTTP status code from provider response (if applicable)';
COMMENT ON COLUMN public.articles.attempt_count IS 'Number of retry attempts made for this article';
COMMENT ON COLUMN public.articles.is_retryable IS 'Whether this failure can be retried automatically';

-- Create index for failure analytics queries
CREATE INDEX IF NOT EXISTS idx_articles_failure_stage ON public.articles(failure_stage) WHERE failure_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_provider ON public.articles(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_status_failure_stage ON public.articles(status, failure_stage) WHERE failure_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_is_retryable ON public.articles(is_retryable) WHERE is_retryable = true;

-- Create composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_articles_failure_analytics ON public.articles(failure_stage, provider, created_at DESC) WHERE failure_stage IS NOT NULL;
