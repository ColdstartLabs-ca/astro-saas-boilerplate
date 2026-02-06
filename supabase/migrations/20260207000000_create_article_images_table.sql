-- Create article_images table for storing generated image metadata
-- Timestamp: 20260207000000

CREATE TABLE IF NOT EXISTS public.article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,           -- 1, 2, 3 (order in article)
  image_url TEXT,                       -- Replicate output URL
  prompt TEXT NOT NULL,                 -- The image generation prompt used
  section_context TEXT,                 -- The heading/paragraph surrounding the marker
  replicate_model TEXT NOT NULL,        -- e.g., 'black-forest-labs/flux-schnell'
  preset_key TEXT NOT NULL,             -- e.g., 'blog-hero'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error TEXT,                           -- Error message if generation failed
  replicate_prediction_id TEXT,         -- For tracking/debugging
  generation_time_ms INTEGER,           -- Generation time in milliseconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying images by article
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON public.article_images(article_id);

-- Index for querying images by status
CREATE INDEX IF NOT EXISTS idx_article_images_status ON public.article_images(status);

-- Enable Row Level Security
ALTER TABLE public.article_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view images for their own articles
CREATE POLICY "Users can view own article images"
  ON public.article_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Service role has full access (for background generation)
CREATE POLICY "Service role has full access to article_images"
  ON public.article_images FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Users can insert images for their own articles
CREATE POLICY "Users can insert images for own articles"
  ON public.article_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Users can update images for their own articles
CREATE POLICY "Users can update images for own articles"
  ON public.article_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Users can delete images for their own articles
CREATE POLICY "Users can delete images for own articles"
  ON public.article_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_images.article_id
      AND articles.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.article_images IS 'Stores generated images for articles via Replicate API';
COMMENT ON COLUMN public.article_images.position IS 'Position in article (1=featured hero, 2,3=in-section)';
COMMENT ON COLUMN public.article_images.image_url IS 'Replicate output URL (expires after ~1 hour)';
COMMENT ON COLUMN public.article_images.prompt IS 'Image generation prompt used';
COMMENT ON COLUMN public.article_images.section_context IS 'Surrounding text context for the image';
COMMENT ON COLUMN public.article_images.replicate_model IS 'Replicate model identifier';
COMMENT ON COLUMN public.article_images.preset_key IS 'Image preset key (blog-hero, social-card, etc.)';
