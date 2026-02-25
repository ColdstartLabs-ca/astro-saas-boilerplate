-- =============================================================================
-- Sitemap Pages Table
-- Stores parsed pages from a project's sitemap XML (no row limit)
-- Series: Outrank Feature Parity (PRD 1 of 6)
-- =============================================================================

CREATE TABLE public.sitemap_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, url)
);

-- Comments
COMMENT ON TABLE public.sitemap_pages IS 'Parsed pages from a project sitemap XML for internal linking and content gap analysis';
COMMENT ON COLUMN public.sitemap_pages.project_id IS 'Reference to the parent project';
COMMENT ON COLUMN public.sitemap_pages.url IS 'Page URL from the sitemap';
COMMENT ON COLUMN public.sitemap_pages.title IS 'Page title (extracted from sitemap or fetched from page)';
COMMENT ON COLUMN public.sitemap_pages.last_modified IS 'Last modification date from sitemap XML lastmod element';

-- RLS
ALTER TABLE public.sitemap_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sitemap pages"
  ON public.sitemap_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own sitemap pages"
  ON public.sitemap_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sitemap pages"
  ON public.sitemap_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to sitemap_pages"
  ON public.sitemap_pages FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_sitemap_pages_project_id
  ON public.sitemap_pages(project_id);

-- Composite index for querying pages by project with optional last_modified ordering
CREATE INDEX idx_sitemap_pages_project_modified
  ON public.sitemap_pages(project_id, last_modified DESC NULLS LAST);
