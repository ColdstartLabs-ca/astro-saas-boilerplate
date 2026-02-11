-- Add keyword_normalized column for duplicate detection
-- This enables case-insensitive duplicate checking without application-level queries

-- Add the normalized keyword column
ALTER TABLE public.articles ADD COLUMN keyword_normalized TEXT GENERATED ALWAYS AS (
  LOWER(TRIM(REGEXP_REPLACE(primary_keyword, '\s+', ' ', 'g')))
) STORED;

-- Create a partial unique index that only applies to non-failed articles
-- This allows re-generating failed articles with the same keyword
CREATE UNIQUE INDEX idx_articles_campaign_keyword_unique
  ON public.articles(campaign_id, keyword_normalized)
  WHERE status != 'failed';

-- Add index for faster duplicate lookups (includes failed articles for queries)
CREATE INDEX idx_articles_campaign_keyword_normalized
  ON public.articles(campaign_id, keyword_normalized);

-- Add comment for documentation
COMMENT ON COLUMN public.articles.keyword_normalized IS 'Auto-generated normalized keyword (lowercase, trimmed, collapsed whitespace) for duplicate detection';
COMMENT ON INDEX public.idx_articles_campaign_keyword_unique IS 'Prevents duplicate non-failed articles with same keyword within a campaign';
