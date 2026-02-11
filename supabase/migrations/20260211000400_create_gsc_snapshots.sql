-- Create gsc_snapshots table for aggregated GSC data per sync
CREATE TABLE IF NOT EXISTS public.gsc_snapshots (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  connection_id UUID REFERENCES public.gsc_connections(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_connection_id ON public.gsc_snapshots(connection_id);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_project_id ON public.gsc_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_user_id ON public.gsc_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_date_range ON public.gsc_snapshots(date_range_start, date_range_end);

-- Enable RLS
ALTER TABLE public.gsc_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own GSC snapshots"
  ON public.gsc_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GSC snapshots"
  ON public.gsc_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own GSC snapshots"
  ON public.gsc_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to GSC snapshots"
  ON public.gsc_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');
