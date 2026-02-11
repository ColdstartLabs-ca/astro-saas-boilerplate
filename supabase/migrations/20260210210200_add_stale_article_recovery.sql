-- Add stale article recovery columns
-- Tracks retry attempts and last attempt time for stuck articles

-- Add last_attempt_at column to track when generation was last attempted
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Add attempt_count column to track retry attempts (defaults to 0)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

-- Add comment documenting the new columns
COMMENT ON COLUMN public.articles.last_attempt_at IS
'Timestamp of the last retry attempt for stale article recovery. Used to detect stuck articles.';

COMMENT ON COLUMN public.articles.attempt_count IS
'Number of retry attempts made via stale article recovery. Max 3 before marking as failed_timeout.';

-- Add index for efficient stale article queries (status + created_at)
CREATE INDEX IF NOT EXISTS idx_articles_stale_recovery ON public.articles(status, created_at)
  WHERE status IN ('queued', 'generating');

-- Add failed_timeout status to the check constraint
-- First drop existing constraint
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

-- Re-add with all statuses including failed_timeout
ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN (
    'queued',
    'generating',
    'draft',
    'qa_checking',
    'qa_failed',
    'qa_passed',
    'approved',
    'rejected',
    'reviewed',
    'published',
    'failed',
    'failed_quality',
    'failed_timeout'
  ));

COMMENT ON COLUMN public.articles.status IS
'Article lifecycle status: queued=waiting to start, generating=in progress, draft=ready for review, qa_checking=QA in progress, qa_failed=failed QA checks, qa_passed=passed QA checks, approved=awaiting publication, rejected=declined by user, reviewed=human reviewed, published=live, failed=generation error, failed_quality=completed but failed quality gates, failed_timeout=stuck for too long and max retries exceeded';
