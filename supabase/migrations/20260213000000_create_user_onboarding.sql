-- =============================================================================
-- User Onboarding Table
-- Tracks multi-step onboarding wizard progress for new users
-- =============================================================================

-- Create user_onboarding table
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  skipped_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add comment to table
COMMENT ON TABLE public.user_onboarding IS 'Tracks user progress through the multi-step onboarding wizard';
COMMENT ON COLUMN public.user_onboarding.user_id IS 'Reference to the user in auth.users';
COMMENT ON COLUMN public.user_onboarding.current_step IS 'Current step in the onboarding wizard (1-5)';
COMMENT ON COLUMN public.user_onboarding.completed_steps IS 'Array of step numbers that have been completed';
COMMENT ON COLUMN public.user_onboarding.skipped_steps IS 'Array of step numbers that were skipped';
COMMENT ON COLUMN public.user_onboarding.is_complete IS 'Whether the onboarding wizard has been completed';
COMMENT ON COLUMN public.user_onboarding.completed_at IS 'Timestamp when onboarding was marked complete';

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view own onboarding
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own onboarding
CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert own onboarding
CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to user_onboarding"
  ON public.user_onboarding FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for common queries
CREATE INDEX idx_user_onboarding_user_id ON public.user_onboarding(user_id);
CREATE INDEX idx_user_onboarding_is_complete ON public.user_onboarding(is_complete);

-- Updated_at trigger (reuse existing handle_updated_at function)
CREATE TRIGGER handle_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
