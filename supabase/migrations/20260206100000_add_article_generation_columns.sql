-- Add generation tracking columns to articles table
-- This migration supports the AI Content Generation Engine (M2)

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS outline JSONB,
  ADD COLUMN IF NOT EXISTS token_count INTEGER CHECK (token_count >= 0),
  ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER CHECK (generation_time_ms >= 0),
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_project_id ON public.articles(project_id);

COMMENT ON COLUMN public.articles.outline IS 'Structured outline generated in first LLM call (JSON: headings, subheadings, key points)';
COMMENT ON COLUMN public.articles.token_count IS 'Total tokens used across all LLM calls for this article';
COMMENT ON COLUMN public.articles.generation_time_ms IS 'Total generation wall-clock time in milliseconds';
COMMENT ON COLUMN public.articles.project_id IS 'Project this article belongs to (nullable, direct link for quick-generate)';
