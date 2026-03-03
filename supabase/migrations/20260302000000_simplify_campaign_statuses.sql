-- Simplify campaign statuses: remove 'draft' and 'active', keep 'scheduled', 'paused', 'completed'
-- This migration supports the Campaign Autopilot Simplification (issue #36):
-- - All campaigns are now schedule-only (auto-activated on creation)
-- - Removed bulk generation flow entirely
-- - Campaigns are born as 'scheduled' with next_run_at set
-- Timestamp: 20260302000000

-- Step 1: Migrate existing data before changing constraint
-- Existing 'draft' campaigns → 'paused' (they need user action to configure a schedule and resume)
UPDATE public.campaigns SET status = 'paused' WHERE status = 'draft';

-- Existing 'active' campaigns → 'scheduled' with next_run_at = NOW()
-- so the cron picks them up on next run
UPDATE public.campaigns
SET status = 'scheduled', next_run_at = NOW()
WHERE status = 'active';

-- Step 2: Drop old CHECK constraint
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Step 3: Add new simplified CHECK constraint (3 states only)
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('scheduled', 'paused', 'completed'));

-- Update comments
COMMENT ON COLUMN public.campaigns.status IS 'Campaign lifecycle status: scheduled (active/running), paused (user-paused or auto-paused), completed (all keywords processed)';
