-- Create article_performance_snapshots table for tracking GSC performance over time
CREATE TABLE IF NOT EXISTS public.article_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  date_range_days INTEGER NOT NULL DEFAULT 28,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  avg_position NUMERIC(6,2) NOT NULL DEFAULT 0,
  top_queries JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, snapshot_date, date_range_days)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_article_performance_snapshots_user_date ON public.article_performance_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_article_performance_snapshots_article_date ON public.article_performance_snapshots(article_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.article_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own snapshots"
  ON public.article_performance_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.article_performance_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.article_performance_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.article_performance_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to article_performance_snapshots"
  ON public.article_performance_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS on_article_performance_snapshots_updated ON public.article_performance_snapshots;
CREATE TRIGGER on_article_performance_snapshots_updated
  BEFORE UPDATE ON public.article_performance_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
