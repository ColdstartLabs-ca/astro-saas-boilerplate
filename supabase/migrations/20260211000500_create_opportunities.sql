-- Create opportunities table for AI-analyzed SEO opportunities
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_id UUID REFERENCES public.gsc_snapshots(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'content_gap', 'low_hanging_fruit', 'topic_cluster',
    'low_ctr', 'declining_position', 'thin_content', 'cannibalization'
  )),
  category TEXT NOT NULL CHECK (category IN ('content', 'technical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  query TEXT,
  page_url TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  priority_score INTEGER NOT NULL DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  estimated_impact TEXT NOT NULL DEFAULT 'medium' CHECK (estimated_impact IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'dismissed')),
  action_type TEXT CHECK (action_type IN ('create_article', 'optimize_page', 'fix_issue')),
  action_ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_opportunities_project_status ON public.opportunities(project_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_project_type ON public.opportunities(project_id, type);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON public.opportunities(project_id, priority_score DESC);

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own opportunities"
  ON public.opportunities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opportunities"
  ON public.opportunities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities"
  ON public.opportunities
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities"
  ON public.opportunities
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to opportunities"
  ON public.opportunities
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS on_opportunities_updated ON public.opportunities;
CREATE TRIGGER on_opportunities_updated
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
