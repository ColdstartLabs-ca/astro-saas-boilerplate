-- Encrypt GSC OAuth tokens (SEC-02 fix)
-- This migration adds encrypted columns for GSC tokens
-- The application code will handle the encryption/decryption

-- Add encrypted token columns
ALTER TABLE public.gsc_connections
  ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT;

-- Add a flag to track encryption status
ALTER TABLE public.gsc_connections
  ADD COLUMN IF NOT EXISTS tokens_encrypted BOOLEAN DEFAULT false;

-- Comment explaining the migration
COMMENT ON COLUMN public.gsc_connections.encrypted_access_token IS 'AES-256-GCM encrypted access token (SEC-02 fix)';
COMMENT ON COLUMN public.gsc_connections.encrypted_refresh_token IS 'AES-256-GCM encrypted refresh token (SEC-02 fix)';
COMMENT ON COLUMN public.gsc_connections.tokens_encrypted IS 'Whether tokens have been migrated to encrypted storage';

-- Note: The application layer will handle:
-- 1. Encrypting new tokens on insert (using encryptJSON from server/utils/encryption.ts)
-- 2. Decrypting tokens on read (using decryptJSON)
-- 3. Migrating existing plaintext tokens during the transition period
-- 4. After migration is complete, plaintext columns (access_token, refresh_token) can be removed
