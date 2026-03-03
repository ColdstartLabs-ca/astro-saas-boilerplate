/**
 * Embedding Service
 *
 * Generates text embeddings via OpenAI text-embedding-3-small.
 * Used for semantic image prompt similarity search.
 */
import { serverEnv } from '@shared/config/env';

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface IEmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

export class EmbeddingService {
  /**
   * Generate a single text embedding.
   * Returns null (no throw) if API key is missing or request fails — caller
   * must treat null as "skip similarity check, go straight to generation".
   */
  async embedText(text: string): Promise<number[] | null> {
    const apiKey = serverEnv.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[EmbeddingService] OPENAI_API_KEY not configured — skipping embedding');
      return null;
    }

    try {
      const response = await fetch(OPENAI_EMBEDDING_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding API error ${response.status}: ${error}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
        usage: { total_tokens: number };
        model: string;
      };

      return data.data[0].embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error);
      return null;  // Graceful degradation — caller falls back to generation
    }
  }

  /**
   * Embed multiple texts in a single API call (batch mode).
   * More efficient than N individual calls.
   */
  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (texts.length === 0) return [];

    const apiKey = serverEnv.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[EmbeddingService] OPENAI_API_KEY not configured — skipping batch embedding');
      return texts.map(() => null);
    }

    try {
      const response = await fetch(OPENAI_EMBEDDING_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding API error ${response.status}: ${error}`);
      }

      const data = await response.json() as {
        data: Array<{ index: number; embedding: number[] }>;
        usage: { total_tokens: number };
      };

      // Sort by index to ensure order matches input
      const sorted = data.data.sort((a, b) => a.index - b.index);
      return sorted.map(item => item.embedding);
    } catch (error) {
      console.error('[EmbeddingService] Failed to batch embed:', error);
      return texts.map(() => null);  // Graceful degradation
    }
  }
}

export const embeddingService = new EmbeddingService();
