-- Enable RLS on tables that were missing it
-- dispute_events: Only accessed via service role (webhook handlers)
-- provider_usage: Only accessed via service role (backend tracking)

-- dispute_events
ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to dispute_events"
  ON public.dispute_events FOR ALL
  USING (auth.role() = 'service_role');

-- provider_usage
ALTER TABLE public.provider_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage provider usage"
  ON public.provider_usage FOR ALL
  USING (auth.role() = 'service_role');
