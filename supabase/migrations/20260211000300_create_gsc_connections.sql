-- Create gsc_connections table for Google Search Console OAuth connections
CREATE TABLE IF NOT EXISTS public.gsc_connections (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  google_email TEXT NOT NULL,
  site_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gsc_connections_user_id ON public.gsc_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_connections_project_id ON public.gsc_connections(project_id);

-- Enable RLS
ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own GSC connections"
  ON public.gsc_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GSC connections"
  ON public.gsc_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own GSC connections"
  ON public.gsc_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own GSC connections"
  ON public.gsc_connections
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to GSC connections"
  ON public.gsc_connections
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS on_gsc_connections_updated ON public.gsc_connections;
CREATE TRIGGER on_gsc_connections_updated
  BEFORE UPDATE ON public.gsc_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
