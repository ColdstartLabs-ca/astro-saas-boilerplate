-- Migration: Revoke EXECUTE on create_article_with_credits from authenticated role
-- Date: 2026-02-27
--
-- BUG C1 FIX: The function create_article_with_credits was granted EXECUTE to the
-- `authenticated` role, meaning any logged-in user could call it directly via the
-- Supabase client with an arbitrary p_user_id, deducting credits from other users.
--
-- The function is SECURITY DEFINER and should only be callable via the server-side
-- service role (supabaseAdmin). Revoking from `authenticated` closes this privilege
-- escalation / account-draining attack vector.

REVOKE EXECUTE ON FUNCTION create_article_with_credits(UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM authenticated;
