-- =============================================================================
-- Project Competitors Table
-- Stores competitor domains tracked for a project (max 7 per project)
-- Series: Outrank Feature Parity (PRD 1 of 6)
-- =============================================================================

CREATE TABLE public.project_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  favicon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, domain)
);

-- Comments
COMMENT ON TABLE public.project_competitors IS 'Competitor domains tracked for a project (max 7 per project, enforced at service layer)';
COMMENT ON COLUMN public.project_competitors.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN public.project_competitors.domain IS 'Competitor domain (e.g., competitor.com)';
COMMENT ON COLUMN public.project_competitors.name IS 'Display name for the competitor';
COMMENT ON COLUMN public.project_competitors.favicon_url IS 'Cached favicon URL for UI display';

-- RLS
ALTER TABLE public.project_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project competitors"
  ON public.project_competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project competitors"
  ON public.project_competitors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project competitors"
  ON public.project_competitors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to project_competitors"
  ON public.project_competitors FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_project_competitors_project_id
  ON public.project_competitors(project_id);
