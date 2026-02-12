-- Add campaign scheduling columns for drip-feed article generation
-- This enables scheduled, time-based article generation instead of all-at-once
-- Timestamp: 20260212100000

-- Add scheduling columns to campaigns table
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS schedule_frequency TEXT DEFAULT NULL
    CHECK (schedule_frequency IN (
      '3x_daily',
      '2x_daily',
      'daily',
      'every_other_day',
      '3x_weekly',
      '2x_weekly',
      'weekly',
      'every_2_weeks'
    )),
  ADD COLUMN IF NOT EXISTS schedule_batch_size INTEGER DEFAULT 1
    CHECK (schedule_batch_size >= 1 AND schedule_batch_size <= 50),
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS schedule_hour INTEGER DEFAULT 9
    CHECK (schedule_hour >= 0 AND schedule_hour <= 23);

-- Update status CHECK constraint to include 'scheduled'
-- First drop the existing constraint
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Add the new constraint with 'scheduled' status
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'scheduled'));

-- Add index for efficient cron queries (find scheduled campaigns due to run)
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_runs
  ON public.campaigns(status, next_run_at)
  WHERE status = 'scheduled' AND next_run_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.campaigns.schedule_frequency IS 'How often to generate articles: 3x_daily, 2x_daily, daily, every_other_day, 3x_weekly, 2x_weekly, weekly, every_2_weeks';
COMMENT ON COLUMN public.campaigns.schedule_batch_size IS 'Number of articles to generate per scheduled run (1-50)';
COMMENT ON COLUMN public.campaigns.next_run_at IS 'Next scheduled execution time (NULL = not scheduled)';
COMMENT ON COLUMN public.campaigns.last_run_at IS 'Timestamp of last successful batch execution';
COMMENT ON COLUMN public.campaigns.schedule_timezone IS 'IANA timezone for scheduling (e.g., America/New_York)';
COMMENT ON COLUMN public.campaigns.schedule_hour IS 'Preferred hour in user timezone for scheduling (0-23, default 9)';
