-- =============================================================================
-- Project Target Audiences Table
-- Stores target audience segments for a project (max 7 per project)
-- Series: Outrank Feature Parity (PRD 1 of 6)
-- =============================================================================

CREATE TABLE public.project_target_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Comments
COMMENT ON TABLE public.project_target_audiences IS 'Target audience segments for a project (max 7 per project, enforced at service layer)';
COMMENT ON COLUMN public.project_target_audiences.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN public.project_target_audiences.name IS 'Audience segment name (e.g., Small business owners, Marketing managers)';

-- RLS
ALTER TABLE public.project_target_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project audiences"
  ON public.project_target_audiences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project audiences"
  ON public.project_target_audiences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project audiences"
  ON public.project_target_audiences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to project_target_audiences"
  ON public.project_target_audiences FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_project_target_audiences_project_id
  ON public.project_target_audiences(project_id);
