-- Create keywords table for AutopilotRank domain model
CREATE TABLE public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty TEXT NOT NULL DEFAULT 'unknown'
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'unknown')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'generating', 'generated', 'failed')),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, keyword)
);

-- Indexes
CREATE INDEX idx_keywords_campaign_id ON public.keywords(campaign_id);
CREATE INDEX idx_keywords_status ON public.keywords(status);

-- RLS
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view keywords through campaigns"
  ON public.keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keywords through campaigns"
  ON public.keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords through campaigns"
  ON public.keywords FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to keywords"
  ON public.keywords FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE TRIGGER handle_keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
