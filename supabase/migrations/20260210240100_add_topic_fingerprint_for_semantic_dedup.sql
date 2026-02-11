-- Add topic_fingerprint column for semantic deduplication (E10)
-- This column stores the OpenAI embedding vector for semantic similarity detection
-- to prevent near-duplicate articles with different wording but same intent

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Add topic_fingerprint column to store embeddings
-- Using vector(1536) to match OpenAI text-embedding-3-small dimension
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS topic_fingerprint vector(1536);

-- Add index for similarity search
-- Using ivfflat for approximate nearest neighbor search on vectors
CREATE INDEX IF NOT EXISTS idx_articles_topic_fingerprint ON public.articles
  USING ivfflat (topic_fingerprint vector_cosine_ops)
  WITH (lists = 100);

-- Add similarity metadata columns
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS similarity_score NUMERIC CHECK (similarity_score >= 0 AND similarity_score <= 1),
  ADD COLUMN IF NOT EXISTS similar_to_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.articles.topic_fingerprint IS 'Semantic embedding of article topic for near-duplicate detection using OpenAI embeddings API';
COMMENT ON COLUMN public.articles.similarity_score IS 'Cosine similarity score with the most similar existing article (0-1, higher = more similar)';
COMMENT ON COLUMN public.articles.similar_to_article_id IS 'ID of the most similar existing article that triggered a near-duplicate warning';
