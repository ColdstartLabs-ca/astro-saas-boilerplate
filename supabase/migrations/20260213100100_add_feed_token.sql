-- Add feed_token column to profiles table for RSS feed authentication
-- Users can regenerate this token to invalidate existing feed subscriptions

-- Add feed_token column with a default generated UUID
ALTER TABLE public.profiles
ADD COLUMN feed_token UUID DEFAULT gen_random_uuid();

-- Create index for faster feed token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_feed_token ON public.profiles(feed_token);

-- Add comment documenting the purpose
COMMENT ON COLUMN public.profiles.feed_token IS 'Unique token for RSS feed authentication. Users can regenerate this to invalidate existing feed subscriptions.';
