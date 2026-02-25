-- Add Outrank-style project metadata columns
-- Series: Outrank Feature Parity (PRD 1 of 6)

-- Language and country for localized content generation
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Business description (auto-populated from domain scraping or manual entry)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Sitemap and blog URLs for page discovery and internal linking
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sitemap_url TEXT,
  ADD COLUMN IF NOT EXISTS blog_url TEXT;

-- Brand color for branded image generation
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

-- Add CHECK constraint for brand_color hex format (optional field)
ALTER TABLE public.projects
  ADD CONSTRAINT projects_brand_color_hex_check
  CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add comments for documentation
COMMENT ON COLUMN public.projects.language IS 'ISO 639-1 language code for content generation (e.g., en, es, fr, de)';
COMMENT ON COLUMN public.projects.country IS 'ISO 3166-1 alpha-2 country code for localization (e.g., US, GB, DE, BR)';
COMMENT ON COLUMN public.projects.description IS 'Business description for context in content generation (auto-populated or manual)';
COMMENT ON COLUMN public.projects.sitemap_url IS 'Sitemap XML URL for page discovery and internal linking';
COMMENT ON COLUMN public.projects.blog_url IS 'Main blog URL for internal linking references';
COMMENT ON COLUMN public.projects.brand_color IS 'Hex color code for branded image generation (e.g., #FF5733)';
