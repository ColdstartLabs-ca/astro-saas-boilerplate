-- Add Outrank-style campaign generation parameter columns
-- Series: Outrank Feature Parity (PRD 1 of 6)

-- Article style preset
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS article_style TEXT
    CHECK (article_style IS NULL OR article_style IN (
      'informative', 'how-to', 'listicle', 'opinion', 'tutorial'
    ));

-- Internal linking configuration
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0
    CHECK (internal_links_count >= 0 AND internal_links_count <= 20);

-- Global instructions for all articles in this campaign
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS global_instructions TEXT
    CHECK (global_instructions IS NULL OR length(global_instructions) <= 2000);

-- Auto-publish toggle
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;

-- Content feature toggles
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS include_youtube BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_cta BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_infographics BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_emojis BOOLEAN DEFAULT false;

-- Image style override (NULL uses campaign's image_preset default)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS image_style TEXT
    CHECK (image_style IS NULL OR image_style IN (
      'brand_text', 'watercolor', 'cinematic', 'illustration', 'sketch'
    ));

-- Add comments for documentation
COMMENT ON COLUMN public.campaigns.article_style IS 'Article format preset: informative, how-to, listicle, opinion, tutorial';
COMMENT ON COLUMN public.campaigns.internal_links_count IS 'Number of internal links to insert per generated article (0-20)';
COMMENT ON COLUMN public.campaigns.global_instructions IS 'Free-text instructions applied to all articles in this campaign (max 2000 chars)';
COMMENT ON COLUMN public.campaigns.auto_publish IS 'Auto-deliver articles to connected CMS when approved';
COMMENT ON COLUMN public.campaigns.include_youtube IS 'Embed relevant YouTube videos in generated articles';
COMMENT ON COLUMN public.campaigns.include_cta IS 'Include call-to-action blocks in generated articles';
COMMENT ON COLUMN public.campaigns.include_infographics IS 'Generate infographic placeholders in articles';
COMMENT ON COLUMN public.campaigns.include_emojis IS 'Use emojis in article content';
COMMENT ON COLUMN public.campaigns.image_style IS 'Image generation style: brand_text, watercolor, cinematic, illustration, sketch';
