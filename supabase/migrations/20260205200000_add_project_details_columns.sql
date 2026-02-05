-- Add industry and content_preferences columns to projects table
-- Migration for Project Management feature (M2)

-- Add industry column for business niche classification
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add content_preferences column for storing content generation settings
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.projects.industry IS 'Business industry/niche (e.g., Technology, Health, Finance, E-commerce, Education, Lifestyle, Real Estate, Legal, Marketing, Other)';
COMMENT ON COLUMN public.projects.content_preferences IS 'Content generation preferences stored as JSONB: { tone, frequency, targetWordCount }';
