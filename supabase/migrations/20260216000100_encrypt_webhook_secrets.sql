-- Encrypt webhook subscription secrets (SEC-07 fix)
-- This migration adds an encrypted column for webhook secrets
-- The application code will handle the encryption/decryption

-- Add encrypted secret column
ALTER TABLE public.webhook_subscriptions
  ADD COLUMN IF NOT EXISTS encrypted_secret TEXT;

-- Add a flag to track encryption status
ALTER TABLE public.webhook_subscriptions
  ADD COLUMN IF NOT EXISTS secret_encrypted BOOLEAN DEFAULT false;

-- Comment explaining the migration
COMMENT ON COLUMN public.webhook_subscriptions.encrypted_secret IS 'AES-256-GCM encrypted webhook signing secret (SEC-07 fix)';
COMMENT ON COLUMN public.webhook_subscriptions.secret_encrypted IS 'Whether secret has been migrated to encrypted storage';

-- Note: The application layer will handle:
-- 1. Encrypting new secrets on insert (using encrypt from server/utils/encryption.ts)
-- 2. Decrypting secrets on read (using decrypt)
-- 3. Migrating existing plaintext secrets during the transition period
-- 4. After migration is complete, plaintext column (secret) can be removed
