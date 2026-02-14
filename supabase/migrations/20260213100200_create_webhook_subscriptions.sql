-- Create webhook_subscriptions table for Zapier/Make integration
-- Timestamp: 20260213100200
-- PRD: Integrations Deep Dive - Phase 1D

-- =============================================================================
-- Table: webhook_subscriptions
-- Stores webhook subscriptions for outbound event notifications (Zapier/Make)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'article.published',
    'article.approved',
    'article.generated',
    'campaign.completed',
    'opportunity.found'
  )),
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on (user_id, event_type, target_url) to prevent duplicates
  CONSTRAINT webhook_subscriptions_user_event_url_unique UNIQUE (user_id, event_type, target_url)
);

-- Indexes for webhook_subscriptions
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_id ON public.webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_type ON public.webhook_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON public.webhook_subscriptions(active);
-- Composite index for querying active subscriptions by user and event type
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_event_active ON public.webhook_subscriptions(user_id, event_type, active);

-- Enable Row Level Security
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own webhook subscriptions
CREATE POLICY "Users can view own webhook subscriptions"
  ON public.webhook_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create webhook subscriptions
CREATE POLICY "Users can create webhook subscriptions"
  ON public.webhook_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own webhook subscriptions
CREATE POLICY "Users can update own webhook subscriptions"
  ON public.webhook_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own webhook subscriptions
CREATE POLICY "Users can delete own webhook subscriptions"
  ON public.webhook_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to webhook_subscriptions"
  ON public.webhook_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.webhook_subscriptions IS 'Stores webhook event subscriptions for Zapier/Make integration';
COMMENT ON COLUMN public.webhook_subscriptions.event_type IS 'Event type to subscribe to: article.published, article.approved, article.generated, campaign.completed, opportunity.found';
COMMENT ON COLUMN public.webhook_subscriptions.target_url IS 'Webhook URL to receive event payloads (Zapier/Make webhook URL)';
COMMENT ON COLUMN public.webhook_subscriptions.secret IS 'Secret key for HMAC-SHA256 signature verification';
COMMENT ON COLUMN public.webhook_subscriptions.active IS 'Whether the subscription is active and should receive events';

-- =============================================================================
-- Function to update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_webhook_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_subscriptions_updated_at();
