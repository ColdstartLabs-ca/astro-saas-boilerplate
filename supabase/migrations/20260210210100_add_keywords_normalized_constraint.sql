-- Add keyword_normalized column to keywords table for case-insensitive duplicate detection
-- This enables preventing duplicate keywords regardless of case or spacing

-- Add the normalized keyword column as a stored computed column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'keywords'
    AND column_name = 'keyword_normalized'
  ) THEN
    ALTER TABLE public.keywords ADD COLUMN keyword_normalized TEXT GENERATED ALWAYS AS (
      LOWER(TRIM(REGEXP_REPLACE(keyword, '\s+', ' ', 'g')))
    ) STORED;
  END IF;
END $$;

-- Drop the old case-sensitive unique constraint on (campaign_id, keyword) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'keywords_campaign_id_keyword_key'
  ) THEN
    ALTER TABLE public.keywords DROP CONSTRAINT keywords_campaign_id_keyword_key;
  END IF;
END $$;

-- Create a new unique index on the normalized column for case-insensitive uniqueness (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_campaign_normalized_unique
  ON public.keywords(campaign_id, keyword_normalized);

-- Add index for faster normalized lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_keywords_keyword_normalized
  ON public.keywords(keyword_normalized);

-- Add comments for documentation
COMMENT ON COLUMN public.keywords.keyword_normalized IS 'Auto-generated normalized keyword (lowercase, trimmed, collapsed whitespace) for case-insensitive duplicate detection';
COMMENT ON INDEX public.idx_keywords_campaign_normalized_unique IS 'Prevents duplicate keywords regardless of case or spacing within a campaign';
