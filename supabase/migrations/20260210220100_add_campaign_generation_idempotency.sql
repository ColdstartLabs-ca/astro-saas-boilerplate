-- Add idempotency and locking support for campaign generation start
-- This prevents duplicate article creation and double-charging on concurrent requests

-- Add generation_run_id column to campaigns table
-- This tracks the current generation run and enables idempotency
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS generation_run_id UUID;

-- Create campaign_generation_runs table for idempotency tracking
-- Similar to webhook_events but for campaign start operations
CREATE TABLE IF NOT EXISTS public.campaign_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
    CHECK (status IN ('processing', 'completed', 'failed')),
  response_data JSONB,
  error_message TEXT,
  queued_count INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaign_generation_runs_campaign_id ON public.campaign_generation_runs(campaign_id);
CREATE INDEX idx_campaign_generation_runs_idempotency_key ON public.campaign_generation_runs(idempotency_key);
CREATE INDEX idx_campaign_generation_runs_status ON public.campaign_generation_runs(status);

-- RLS - Only service role should access
ALTER TABLE public.campaign_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to campaign_generation_runs"
  ON public.campaign_generation_runs
  FOR ALL USING (false);

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.generation_run_id IS 'Current generation run ID for idempotency tracking';
COMMENT ON TABLE public.campaign_generation_runs IS 'Idempotency tracking for campaign generation start operations';

-- updated_at trigger
CREATE TRIGGER handle_campaign_generation_runs_updated_at
  BEFORE UPDATE ON public.campaign_generation_runs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to atomically claim a campaign generation with idempotency key
-- Uses SELECT FOR UPDATE to lock the campaign row and prevent concurrent starts
CREATE OR REPLACE FUNCTION claim_campaign_generation(
  p_campaign_id UUID,
  p_idempotency_key TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  generation_run_id UUID,
  existing_status TEXT,
  campaign_locked BOOLEAN
) AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_existing_run_id UUID;
  v_existing_status TEXT;
  v_new_run_id UUID;
BEGIN
  -- Lock the campaign row for this transaction
  -- This prevents concurrent start requests from proceeding
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id AND user_id = p_user_id
  FOR UPDATE;

  -- Check if campaign exists and user owns it
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Check if there's an existing run with this idempotency key
  SELECT id, status INTO v_existing_run_id, v_existing_status
  FROM campaign_generation_runs
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_run_id IS NOT NULL THEN
    -- Idempotency key already used - return cached result
    RETURN QUERY SELECT false, v_existing_run_id, v_existing_status, true::BOOLEAN;
    RETURN;
  END IF;

  -- Check if campaign is already running
  IF v_campaign.generation_run_id IS NOT NULL THEN
    -- Campaign already has an active generation run
    RETURN QUERY SELECT false, NULL::UUID, 'already_running'::TEXT, true::BOOLEAN;
    RETURN;
  END IF;

  -- Create new generation run
  v_new_run_id := gen_random_uuid();

  INSERT INTO campaign_generation_runs (
    id,
    campaign_id,
    idempotency_key,
    status
  ) VALUES (
    v_new_run_id,
    p_campaign_id,
    p_idempotency_key,
    'processing'
  );

  -- Update campaign with generation run ID
  UPDATE campaigns
  SET generation_run_id = v_new_run_id
  WHERE id = p_campaign_id;

  -- Successfully claimed
  RETURN QUERY SELECT true, v_new_run_id, NULL::TEXT, true::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark generation run as completed with response data
CREATE OR REPLACE FUNCTION complete_campaign_generation(
  p_generation_run_id UUID,
  p_response_data JSONB,
  p_queued_count INTEGER DEFAULT 0,
  p_credits_used INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_generation_runs
  SET
    status = 'completed',
    response_data = p_response_data,
    queued_count = p_queued_count,
    credits_used = p_credits_used,
    completed_at = NOW()
  WHERE id = p_generation_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark generation run as failed
CREATE OR REPLACE FUNCTION fail_campaign_generation(
  p_generation_run_id UUID,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_generation_runs
  SET
    status = 'failed',
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_generation_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear generation_run_id from campaign (for cleanup)
CREATE OR REPLACE FUNCTION clear_campaign_generation_run(
  p_campaign_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET generation_run_id = NULL
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION claim_campaign_generation IS 'Atomically claim a campaign generation with idempotency key. Uses SELECT FOR UPDATE to lock campaign row.';
COMMENT ON FUNCTION complete_campaign_generation IS 'Mark generation run as completed and store response data for idempotency';
COMMENT ON FUNCTION fail_campaign_generation IS 'Mark generation run as failed with error message';
COMMENT ON FUNCTION clear_campaign_generation_run IS 'Clear generation_run_id from campaign (typically after completion)';
