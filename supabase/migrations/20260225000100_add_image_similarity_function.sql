CREATE OR REPLACE FUNCTION find_similar_image(
  query_embedding vector(1536),
  p_preset_key    text,
  similarity_threshold float DEFAULT 0.90,
  max_results     int DEFAULT 1
)
RETURNS TABLE (
  id              uuid,
  image_url       text,
  prompt          text,
  similarity      float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ai.id,
    ai.image_url,
    ai.prompt,
    1 - (ai.prompt_embedding <=> query_embedding) AS similarity
  FROM article_images ai
  WHERE
    ai.status         = 'completed'
    AND ai.image_url  IS NOT NULL
    AND ai.preset_key = p_preset_key
    AND ai.prompt_embedding IS NOT NULL
    AND ai.reused_from_image_id IS NULL  -- only search originals, not re-uses
    AND 1 - (ai.prompt_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY ai.prompt_embedding <=> query_embedding
  LIMIT max_results;
$$;
