-- Add approval workflow statuses and rejection reason to articles

-- Add rejection_reason column
ALTER TABLE public.articles ADD COLUMN rejection_reason TEXT;

-- Update status check constraint to include approved and rejected
ALTER TABLE public.articles DROP CONSTRAINT articles_status_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN ('queued', 'generating', 'draft', 'approved', 'rejected', 'reviewed', 'published', 'failed'));
