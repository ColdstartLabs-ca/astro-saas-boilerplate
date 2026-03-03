/**
 * Image Similarity Service
 *
 * Finds visually similar images in the global library using pgvector cosine
 * similarity search on prompt embeddings.
 */
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { ImagePresetKey } from '@shared/config/image-models.config';

export const SIMILARITY_THRESHOLD = 0.9;

export interface ISimilarImageMatch {
  id: string;
  imageUrl: string;
  prompt: string;
  similarity: number;
}

export class ImageSimilarityService {
  /**
   * Given a prompt and its pre-computed embedding, find the best matching
   * image in the global library (cosine similarity ≥ SIMILARITY_THRESHOLD).
   *
   * Returns null if:
   * - No match above threshold
   * - embedding is null (API key missing or embed failed)
   */
  async findSimilarImage(
    embedding: number[] | null,
    presetKey: ImagePresetKey
  ): Promise<ISimilarImageMatch | null> {
    if (!embedding) return null;

    try {
      const { data, error } = await supabaseAdmin.rpc('find_similar_image', {
        query_embedding: embedding,
        p_preset_key: presetKey,
        similarity_threshold: SIMILARITY_THRESHOLD,
        max_results: 1,
      });

      if (error) {
        console.error('[ImageSimilarity] RPC error:', error.message);
        return null;
      }

      if (!data || data.length === 0) return null;

      const match = data[0] as {
        id: string;
        image_url: string;
        prompt: string;
        similarity: number;
      };

      console.log(
        `[ImageSimilarity] Found reusable image (similarity=${match.similarity.toFixed(4)}) ` +
          `for preset=${presetKey}`
      );

      return {
        id: match.id,
        imageUrl: match.image_url,
        prompt: match.prompt,
        similarity: match.similarity,
      };
    } catch (error) {
      console.error('[ImageSimilarity] Unexpected error during similarity search:', error);
      return null; // Graceful degradation
    }
  }
}

export const imageSimilarityService = new ImageSimilarityService();
