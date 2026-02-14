-- Add scheduling columns to gsc_connections
ALTER TABLE gsc_connections ADD COLUMN IF NOT EXISTS auto_analyze BOOLEAN DEFAULT false;
ALTER TABLE gsc_connections ADD COLUMN IF NOT EXISTS analyze_frequency TEXT DEFAULT 'weekly' CHECK (analyze_frequency IN ('daily', 'weekly', 'biweekly'));
ALTER TABLE gsc_connections ADD COLUMN IF NOT EXISTS next_analyze_at TIMESTAMPTZ;
ALTER TABLE gsc_connections ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Add scheduling columns to opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS performance_status TEXT CHECK (performance_status IN ('pending', 'improved', 'stable', 'declined', 'not_found'));

-- Create opportunity_performance_checks table
CREATE TABLE opportunity_performance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  check_date DATE NOT NULL,
  position_before NUMERIC(6,2),
  position_after NUMERIC(6,2),
  ctr_before NUMERIC(6,4),
  ctr_after NUMERIC(6,4),
  impressions_before INTEGER,
  impressions_after INTEGER,
  clicks_before INTEGER,
  clicks_after INTEGER,
  status TEXT NOT NULL CHECK (status IN ('improved', 'stable', 'declined', 'not_found')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_opp_perf_opportunity ON opportunity_performance_checks(opportunity_id);
CREATE INDEX idx_opp_perf_article ON opportunity_performance_checks(article_id);

-- Enable RLS on opportunity_performance_checks
ALTER TABLE opportunity_performance_checks ENABLE ROW LEVEL SECURITY;
-- Add RLS policy for authenticated users to access their own project's data
CREATE POLICY "Users can view performance checks for their projects" ON opportunity_performance_checks
  FOR SELECT USING (
    opportunity_id IN (SELECT id FROM opportunities WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  );
CREATE POLICY "Service role can manage performance checks" ON opportunity_performance_checks
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
