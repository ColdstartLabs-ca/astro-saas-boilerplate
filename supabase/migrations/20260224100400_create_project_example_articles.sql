-- =============================================================================
-- Project Example Articles Table
-- Stores example articles for writing style analysis (max 5 per project)
-- Series: Outrank Feature Parity (PRD 1 of 6)
-- =============================================================================

CREATE TABLE public.project_example_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  extracted_content TEXT,
  analyzed_style JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, url)
);

-- Comments
COMMENT ON TABLE public.project_example_articles IS 'Example articles for writing style analysis (max 5 per project, enforced at service layer)';
COMMENT ON COLUMN public.project_example_articles.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN public.project_example_articles.url IS 'Source article URL for style analysis';
COMMENT ON COLUMN public.project_example_articles.extracted_content IS 'Fetched article body text (populated during style analysis)';
COMMENT ON COLUMN public.project_example_articles.analyzed_style IS 'LLM analysis result: tone, structure, vocabulary level, sentence patterns, etc.';

-- RLS
ALTER TABLE public.project_example_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project example articles"
  ON public.project_example_articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project example articles"
  ON public.project_example_articles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project example articles"
  ON public.project_example_articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to project_example_articles"
  ON public.project_example_articles FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_project_example_articles_project_id
  ON public.project_example_articles(project_id);
