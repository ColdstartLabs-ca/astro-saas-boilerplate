-- Add notion to integration types
-- Timestamp: 20260213100500
-- PRD: Integrations - Phase 3B: Notion Pages Adapter

-- Drop the existing check constraint
ALTER TABLE public.integrations
DROP CONSTRAINT IF EXISTS integrations_type_check;

-- Add the new check constraint with notion included
ALTER TABLE public.integrations
ADD CONSTRAINT integrations_type_check
CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion'));

-- Update comment
COMMENT ON COLUMN public.integrations.type IS 'Integration type: wordpress, webhook, webflow, shopify, wix, or notion';
