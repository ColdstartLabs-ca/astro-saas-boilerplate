-- Add slack to IntegrationType CHECK constraint
-- This migration adds support for Slack notifications via Incoming Webhooks

-- First, drop the existing check constraint
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_type_check;

-- Add the new check constraint with slack included
ALTER TABLE integrations ADD CONSTRAINT integrations_type_check
  CHECK (type IN ('wordpress', 'webhook', 'webflow', 'shopify', 'wix', 'notion', 'ghost', 'slack'));
