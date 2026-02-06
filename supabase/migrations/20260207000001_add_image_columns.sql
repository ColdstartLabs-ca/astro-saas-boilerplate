-- Add image generation columns to articles and campaigns tables
-- Timestamp: 20260207000001

-- Add image metadata columns to articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_preset TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;

-- Add image preset column to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS image_preset TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.articles.image_preset IS 'Image generation preset used (null = no images)';
COMMENT ON COLUMN public.articles.image_count IS 'Number of successfully generated images for this article';
COMMENT ON COLUMN public.campaigns.image_preset IS 'Default image preset for campaign articles (null = text only)';
