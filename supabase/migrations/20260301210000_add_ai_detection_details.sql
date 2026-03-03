-- Add AI detection details columns to articles table
-- These columns store detailed AI detection results for on-demand analysis

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS ai_detection_details JSONB,
  ADD COLUMN IF NOT EXISTS ai_detection_provider TEXT;

COMMENT ON COLUMN public.articles.ai_detection_details IS 'Detailed AI detection results including patterns, confidence, and raw scores';
COMMENT ON COLUMN public.articles.ai_detection_provider IS 'Provider that produced the AI detection score: heuristic or originality';

-- Create index for querying by provider (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_articles_ai_detection_provider
  ON public.articles(ai_detection_provider)
  WHERE ai_detection_provider IS NOT NULL;
