-- Fix project deletion to properly cascade delete all related data
-- Previously: campaigns.project_id used ON DELETE SET NULL, leaving orphaned campaigns
-- Now: campaigns.project_id uses ON DELETE CASCADE, which will delete:
--   - campaigns (and their articles, keywords, etc.)

-- First, drop the old foreign key constraint
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_project_id_fkey;

-- Re-add the constraint with CASCADE delete
ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add comment documenting the cascade behavior
COMMENT ON CONSTRAINT campaigns_project_id_fkey ON public.campaigns IS
'When a project is deleted, all its campaigns (and associated articles/keywords) are also deleted';
