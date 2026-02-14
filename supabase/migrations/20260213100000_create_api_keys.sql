-- Create API keys table for public REST API
-- Timestamp: 20260213100000
-- PRD: Integrations Deep Dive - Phase 1A: Public REST API

-- =============================================================================
-- Table: api_keys
-- Stores API keys for programmatic access to AutopilotRank
-- Keys are stored as SHA-256 hashes, never in plaintext
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  rate_limit INTEGER NOT NULL DEFAULT 100,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure name is not empty
  CONSTRAINT api_keys_name_not_empty CHECK (length(trim(name)) > 0),
  -- Ensure key_prefix matches expected format (apr_live_ prefix first 8 chars of key)
  CONSTRAINT api_keys_key_prefix_format CHECK (key_prefix ~ '^apr_live_[a-z0-9]{8}$')
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys (without key_hash)
CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create API keys
CREATE POLICY "Users can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own API keys
CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Service role has full access (for middleware lookups)
CREATE POLICY "Service role has full access to api_keys"
  ON public.api_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.api_keys IS 'Stores API keys for programmatic access. Keys are hashed with SHA-256.';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the full API key. Used for lookup during authentication.';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'First 8 characters of key after apr_live_ prefix, for display purposes (e.g., apr_live_abc12345)';
COMMENT ON COLUMN public.api_keys.rate_limit IS 'Maximum requests per minute for this key. Default 100.';
COMMENT ON COLUMN public.api_keys.scopes IS 'Array of permission scopes: articles:read, articles:write, campaigns:read, campaigns:write, integrations:read';
COMMENT ON COLUMN public.api_keys.expires_at IS 'Optional expiration date. NULL means key never expires.';

-- =============================================================================
-- Function to safely look up API key (used by service role)
-- =============================================================================

CREATE OR REPLACE FUNCTION lookup_api_key(p_key_hash TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  key_prefix TEXT,
  last_used_at TIMESTAMPTZ,
  rate_limit INTEGER,
  scopes JSONB,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.user_id,
    ak.name,
    ak.key_prefix,
    ak.last_used_at,
    ak.rate_limit,
    ak.scopes,
    ak.expires_at
  FROM api_keys ak
  WHERE ak.key_hash = p_key_hash
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION lookup_api_key(TEXT) TO service_role;

COMMENT ON FUNCTION lookup_api_key(TEXT) IS 'Look up API key by hash. Returns key info if valid and not expired. Security definer for service role use.';

-- =============================================================================
-- Function to update last_used_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_api_key(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION touch_api_key(UUID) TO service_role;

COMMENT ON FUNCTION touch_api_key(UUID) IS 'Update last_used_at timestamp for an API key. Security definer for service role use.';
