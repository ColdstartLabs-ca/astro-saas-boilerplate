-- Add ghost to integrations type CHECK constraint
-- Timestamp: 20260213100600
-- PRD: Phase 3C - Ghost CMS Adapter

-- Drop and recreate the CHECK constraint to include 'ghost' type
ALTER TABLE public.integrations
DROP CONSTRAINT IF EXISTS integrations_type_check;

ALTER TABLE public.integrations
ADD CONSTRAINT integrations_type_check
CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion', 'ghost'));

-- Update comment to reflect the new type
COMMENT ON COLUMN public.integrations.type IS 'Integration type: wordpress, webhook, webflow, shopify, wix, notion, or ghost';
