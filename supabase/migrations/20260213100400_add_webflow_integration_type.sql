-- Add webflow to IntegrationType CHECK constraint
-- This migration adds support for Webflow CMS integration

-- First, drop the existing check constraint
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_type_check;

-- Add the new check constraint with webflow included
ALTER TABLE integrations ADD CONSTRAINT integrations_type_check
  CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion', 'ghost', 'slack'));
