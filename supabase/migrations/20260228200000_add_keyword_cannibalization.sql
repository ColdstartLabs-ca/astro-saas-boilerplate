-- =============================================================================
-- Keyword Cannibalization Prevention
-- Adds keyword_embedding for semantic similarity checks at keyword addition time
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Add keyword embedding column
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS keyword_embedding vector(1536);

COMMENT ON COLUMN public.keywords.keyword_embedding IS 'OpenAI text-embedding-3-small embedding for semantic cannibalization detection across campaigns';

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_keywords_embedding
  ON public.keywords
  USING ivfflat (keyword_embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC function: find semantically similar keywords in the same project
-- (excludes current campaign to check cross-campaign overlap only)
CREATE OR REPLACE FUNCTION find_similar_keywords_in_project(
  p_project_id UUID,
  p_exclude_campaign_id UUID,
  p_embedding vector(1536),
  p_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 3
)
RETURNS TABLE (
  keyword_id UUID,
  keyword TEXT,
  campaign_id UUID,
  campaign_name TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    k.id,
    k.keyword,
    c.id,
    c.name,
    1 - (k.keyword_embedding <=> p_embedding) AS similarity
  FROM keywords k
  INNER JOIN campaigns c ON c.id = k.campaign_id
  WHERE c.project_id = p_project_id
    AND k.campaign_id != p_exclude_campaign_id
    AND k.keyword_embedding IS NOT NULL
    AND 1 - (k.keyword_embedding <=> p_embedding) >= p_threshold
  ORDER BY k.keyword_embedding <=> p_embedding ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION find_similar_keywords_in_project IS 'Returns keywords in other campaigns of the same project that are semantically similar to the given embedding. Used for cross-campaign cannibalization detection.';
