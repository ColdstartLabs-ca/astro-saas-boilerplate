-- Ensure articles.scheduled_publish_at exists in all environments
-- Some environments were provisioned without this column, which breaks
-- content planning and calendar scheduling queries.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_publish_at
  ON public.articles(scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL;

-- Prompt PostgREST to refresh schema cache immediately.
SELECT pg_notify('pgrst', 'reload schema');

