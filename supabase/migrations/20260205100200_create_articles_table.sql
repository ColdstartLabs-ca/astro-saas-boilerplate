-- Create articles table for AutopilotRank domain model
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  primary_keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'generating', 'draft', 'reviewed', 'published', 'failed')),
  ai_model_used TEXT,
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  ai_detection_score INTEGER CHECK (ai_detection_score >= 0 AND ai_detection_score <= 100),
  word_count INTEGER CHECK (word_count >= 0),
  meta_description TEXT,
  published_url TEXT,
  slug TEXT,
  credits_used INTEGER NOT NULL DEFAULT 1,
  generation_error TEXT,
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_articles_user_id ON public.articles(user_id);
CREATE INDEX idx_articles_campaign_id ON public.articles(campaign_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_campaign_status ON public.articles(campaign_id, status);

-- RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own articles"
  ON public.articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to articles"
  ON public.articles FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE TRIGGER handle_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
