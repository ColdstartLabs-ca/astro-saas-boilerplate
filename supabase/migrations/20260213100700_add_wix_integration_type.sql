-- Add wix integration type to integrations table CHECK constraint
-- Timestamp: 20260213100700
-- PRD: Integrations Deep Dive - Phase 4A

-- Drop the existing CHECK constraint and add a new one with wix type
ALTER TABLE public.integrations
DROP CONSTRAINT IF EXISTS integrations_type_check;

ALTER TABLE public.integrations
ADD CONSTRAINT integrations_type_check
CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion', 'ghost'));

-- Update comment on type column
COMMENT ON COLUMN public.integrations.type IS 'Integration type: wordpress, webhook, webflow, shopify, wix, notion, or ghost';
