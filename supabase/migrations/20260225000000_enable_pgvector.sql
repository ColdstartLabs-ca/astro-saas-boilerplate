-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE article_images
  ADD COLUMN IF NOT EXISTS prompt_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS reused_from_image_id uuid REFERENCES article_images(id) ON DELETE SET NULL;

-- HNSW index for approximate nearest-neighbor cosine search
-- m=16, ef_construction=64 are pgvector defaults — good starting point
CREATE INDEX IF NOT EXISTS article_images_embedding_hnsw_idx
  ON article_images
  USING hnsw (prompt_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for reuse tracking queries
CREATE INDEX IF NOT EXISTS article_images_reused_from_idx
  ON article_images (reused_from_image_id)
  WHERE reused_from_image_id IS NOT NULL;
