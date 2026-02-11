-- Add 'failed_quality' status to article status check constraint
-- This status is used when an article generation completes but fails quality gates

-- Drop the existing constraint
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

-- Recreate the constraint with the new status
ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN ('queued', 'generating', 'draft', 'approved', 'rejected', 'reviewed', 'published', 'failed', 'failed_quality'));

-- Add comment documenting the new status
COMMENT ON COLUMN public.articles.status IS
'Article lifecycle status: queued=waiting to start, generating=in progress, draft=ready for review, approved=awaiting publication, rejected=declined by user, reviewed=human reviewed, published=live, failed=generation error, failed_quality=completed but failed quality gates (word count, structure, etc.)';
