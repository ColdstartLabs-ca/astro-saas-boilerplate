-- Remove tone and targetWordCount from project content_preferences
-- These settings are now only at Campaign level, not Project level

-- Update existing records to remove tone and targetWordCount from JSONB
UPDATE public.projects
SET content_preferences = content_preferences - '{"tone", "targetWordCount"}'
WHERE content_preferences ? 'tone' OR content_preferences ? 'targetWordCount';

-- Update column comment to reflect new structure
COMMENT ON COLUMN public.projects.content_preferences IS 'Content generation preferences stored as JSONB: { frequency } (publishing frequency only)';
