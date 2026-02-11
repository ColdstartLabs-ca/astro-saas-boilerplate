-- Create integrations system tables
-- Timestamp: 20260210110000
-- PRD: Integrations Tab - Phase 1

-- =============================================================================
-- Table: integrations
-- Stores WordPress and webhook integrations with encrypted credentials
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('wordpress', 'webhook')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  encrypted_credentials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

-- Enable Row Level Security
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own integrations
CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create integrations
CREATE POLICY "Users can create integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON public.integrations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON public.integrations FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to integrations"
  ON public.integrations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.integrations IS 'Stores WordPress and webhook integrations with encrypted credentials';
COMMENT ON COLUMN public.integrations.type IS 'Integration type: wordpress or webhook';
COMMENT ON COLUMN public.integrations.config IS 'Type-specific config (site_url, username for WP; url, secret for webhook)';
COMMENT ON COLUMN public.integrations.encrypted_credentials IS 'AES-256-GCM encrypted credentials blob';
COMMENT ON COLUMN public.integrations.status IS 'Integration status: active, error, or disabled';
COMMENT ON COLUMN public.integrations.last_tested_at IS 'Last successful connection test timestamp';

-- =============================================================================
-- Table: campaign_integrations (junction table)
-- Links campaigns to integrations (many-to-many)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on (campaign_id, integration_id)
  CONSTRAINT campaign_integrations_campaign_integration_unique UNIQUE (campaign_id, integration_id)
);

-- Indexes for campaign_integrations
CREATE INDEX IF NOT EXISTS idx_campaign_integrations_campaign_id ON public.campaign_integrations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_integrations_integration_id ON public.campaign_integrations(integration_id);
CREATE INDEX IF NOT EXISTS idx_campaign_integrations_enabled ON public.campaign_integrations(enabled);

-- Enable Row Level Security
ALTER TABLE public.campaign_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view campaign_integrations for their own campaigns
CREATE POLICY "Users can view own campaign integrations"
  ON public.campaign_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_integrations.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can create campaign_integrations for their own campaigns
CREATE POLICY "Users can create campaign integrations"
  ON public.campaign_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can update campaign_integrations for their own campaigns
CREATE POLICY "Users can update own campaign integrations"
  ON public.campaign_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_integrations.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Users can delete campaign_integrations for their own campaigns
CREATE POLICY "Users can delete own campaign integrations"
  ON public.campaign_integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_integrations.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to campaign_integrations"
  ON public.campaign_integrations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.campaign_integrations IS 'Junction table linking campaigns to integrations';
COMMENT ON COLUMN public.campaign_integrations.enabled IS 'Can disable integration for a campaign without removing it';

-- =============================================================================
-- Table: integration_deliveries
-- Tracks delivery status of articles to integrations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.integration_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivering', 'delivered', 'failed')),
  external_id TEXT,
  external_url TEXT,
  error TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for integration_deliveries
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_article_id ON public.integration_deliveries(article_id);
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_integration_id ON public.integration_deliveries(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_campaign_id ON public.integration_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_status ON public.integration_deliveries(status);

-- Composite index for querying pending deliveries
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_article_status ON public.integration_deliveries(article_id, status);

-- Enable Row Level Security
ALTER TABLE public.integration_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view deliveries for their own articles
CREATE POLICY "Users can view own article deliveries"
  ON public.integration_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = integration_deliveries.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Users can create deliveries for their own articles
CREATE POLICY "Users can create deliveries for own articles"
  ON public.integration_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Users can update deliveries for their own articles
CREATE POLICY "Users can update own article deliveries"
  ON public.integration_deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = integration_deliveries.article_id
      AND articles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Users can delete deliveries for their own articles
CREATE POLICY "Users can delete own article deliveries"
  ON public.integration_deliveries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.articles
      WHERE articles.id = integration_deliveries.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to integration_deliveries"
  ON public.integration_deliveries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.integration_deliveries IS 'Tracks delivery status of articles to integrations';
COMMENT ON COLUMN public.integration_deliveries.status IS 'Delivery status: pending, delivering, delivered, or failed';
COMMENT ON COLUMN public.integration_deliveries.external_id IS 'WordPress post ID or webhook response ID';
COMMENT ON COLUMN public.integration_deliveries.external_url IS 'Published URL on WordPress';
COMMENT ON COLUMN public.integration_deliveries.error IS 'Error message if delivery failed';
COMMENT ON COLUMN public.integration_deliveries.attempt_count IS 'Number of delivery attempts';
COMMENT ON COLUMN public.integration_deliveries.delivered_at IS 'Timestamp when delivery was successful';

-- =============================================================================
-- Function to update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();
