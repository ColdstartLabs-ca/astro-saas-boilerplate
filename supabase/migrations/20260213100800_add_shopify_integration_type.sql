-- Add Shopify integration type to CHECK constraint
-- Timestamp: 20260213100800
-- PRD: Integrations Tab - Phase 2 (Shopify CMS Adapter)

-- Drop the existing CHECK constraint and add a new one with 'shopify'
ALTER TABLE public.integrations
DROP CONSTRAINT IF EXISTS integrations_type_check;

ALTER TABLE public.integrations
ADD CONSTRAINT integrations_type_check
CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion', 'ghost'));

-- Update comment to include Shopify
COMMENT ON COLUMN public.integrations.type IS 'Integration type: wordpress, webhook, webflow, shopify, wix, notion, or ghost';
