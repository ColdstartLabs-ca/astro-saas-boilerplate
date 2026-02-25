-- =============================================================================
-- Content Strategies Table
-- Stores AI-generated content strategies for a project
-- Series: Outrank Feature Parity (PRD 1 of 6)
-- =============================================================================

CREATE TABLE public.content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  strategy_data JSONB,
  generation_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.content_strategies IS 'AI-generated content strategies with keyword clusters, topic maps, and publishing schedules';
COMMENT ON COLUMN public.content_strategies.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN public.content_strategies.user_id IS 'Reference to the owning user (for RLS)';
COMMENT ON COLUMN public.content_strategies.status IS 'Generation status: pending (queued), generating (in progress), ready (complete), failed (error)';
COMMENT ON COLUMN public.content_strategies.strategy_data IS 'AI-generated strategy: keyword clusters, topic map, publishing schedule, content gaps';
COMMENT ON COLUMN public.content_strategies.generation_time_ms IS 'Time taken for AI strategy generation in milliseconds';
COMMENT ON COLUMN public.content_strategies.error_message IS 'Error details if generation failed';

-- RLS
ALTER TABLE public.content_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content strategies"
  ON public.content_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content strategies"
  ON public.content_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content strategies"
  ON public.content_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content strategies"
  ON public.content_strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to content_strategies"
  ON public.content_strategies FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_content_strategies_project_id
  ON public.content_strategies(project_id);

CREATE INDEX idx_content_strategies_user_id
  ON public.content_strategies(user_id);

CREATE INDEX idx_content_strategies_status
  ON public.content_strategies(status);

-- updated_at trigger (reuse existing handle_updated_at function)
CREATE TRIGGER handle_content_strategies_updated_at
  BEFORE UPDATE ON public.content_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
