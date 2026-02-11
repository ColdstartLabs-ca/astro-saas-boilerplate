-- Add QA Pipeline statuses and results storage to articles table
-- This migration supports E11: Build full pre-publication QA pipeline

-- Step 1: Add new QA statuses to the articles table
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

-- Add the updated status check constraint with new QA statuses
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

-- Step 2: Add QA results storage column
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS qa_results JSONB;

-- Step 3: Add QA configuration to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS qa_config JSONB DEFAULT '{"maxPlagiarismSimilarity":0.15,"minFactConsistency":0.6,"maxReadabilityGrade":12,"minReadingEase":30,"maxAILikelihood":0.8}';

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.articles.qa_results IS 'QA check results stored as JSONB with plagiarism, fact consistency, readability, and AI likelihood scores';
COMMENT ON COLUMN public.projects.qa_config IS 'QA configuration thresholds for article quality checks: { maxPlagiarismSimilarity, minFactConsistency, maxReadabilityGrade, minReadingEase, maxAILikelihood }';

-- Step 5: Create index for filtering by QA status
CREATE INDEX IF NOT EXISTS idx_articles_qa_status
  ON public.articles(status)
  WHERE status IN ('qa_checking', 'qa_failed', 'qa_passed');

-- Step 6: Create a function to check if QA is enabled for a project
CREATE OR REPLACE FUNCTION public.is_qa_enabled(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- QA is enabled if the project has qa_config set
  -- For now, all projects with qa_config have QA enabled
  -- This can be extended to include an enabled flag
  RETURN EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
    AND qa_config IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_qa_enabled(UUID) TO authenticated, service_role;
