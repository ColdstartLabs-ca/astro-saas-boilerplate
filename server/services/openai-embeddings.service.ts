/**
 * OpenAI Embeddings Service for Semantic Similarity Detection
 *
 * Provides functionality to:
 * 1. Generate semantic embeddings for article topics using OpenAI's text-embedding-3-small
 * 2. Calculate cosine similarity between embeddings
 * 3. Find similar articles in the database
 *
 * This service enables near-duplicate detection (E10) by comparing semantic meaning
 * rather than exact keyword matches.
 */

import { serverEnv } from '@shared/config/env';

// =============================================================================
// Types
// =============================================================================

/**
 * OpenAI Embeddings API response
 */
interface IOpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API error response
 */
interface IOpenAIErrorResponse {
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Similarity check result
 */
export interface ISimilarityCheckResult {
  /** Whether the similarity exceeds the threshold */
  isSimilar: boolean;
  /** Highest similarity score found (0-1) */
  maxSimilarity: number;
  /** ID of the most similar article (if any) */
  similarArticleId?: string;
  /** Similarity scores for all similar articles */
  similarArticles: Array<{
    articleId: string;
    title: string | null;
    similarity: number;
  }>;
}

/**
 * Similarity check options
 */
export interface ISimilarityCheckOptions {
  /** Minimum similarity threshold (0-1, default 0.85) */
  threshold?: number;
  /** Maximum number of similar articles to return (default 5) */
  maxResults?: number;
  /** Exclude specific article ID from comparison (for regenerate) */
  excludeArticleId?: string;
}

// =============================================================================
// Service Class
// =============================================================================

export class OpenAIEmbeddingsService {
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly apiKey: string;
  private readonly model = 'text-embedding-3-small'; // 1536 dimensions, cost-effective

  constructor() {
    this.apiKey = serverEnv.OPENAI_API_KEY;
  }

  /**
   * Check if OpenAI embeddings API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  /**
   * Generate an embedding for a given text (topic/keyword)
   *
   * @param text - The text to embed (article topic, keyword, etc.)
   * @returns Array of 1536 floating point numbers representing the embedding
   * @throws Error if API call fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured for embeddings');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const requestBody = {
      model: this.model,
      input: text.trim(),
      encoding_format: 'float', // Use float format for cosine similarity
    };

    console.log('[OpenAI Embeddings] Generating embedding for:', text.substring(0, 50));

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as IOpenAIErrorResponse;
      const errorMessage = errorBody.error?.message || response.statusText;
      console.error('[OpenAI Embeddings] API error:', response.status, errorMessage);
      throw new Error(`OpenAI Embeddings API error: ${response.status} - ${errorMessage}`);
    }

    const data = (await response.json()) as IOpenAIEmbeddingResponse;

    if (!data.data?.[0]?.embedding) {
      console.error('[OpenAI Embeddings] Unexpected response format:', data);
      throw new Error('OpenAI returned empty or invalid embedding');
    }

    const embedding = data.data[0].embedding;

    console.log(
      `[OpenAI Embeddings] Embedding generated (${embedding.length} dimensions), tokens used:`,
      data.usage?.total_tokens || 'N/A'
    );

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   *
   * @param embeddingA - First embedding vector
   * @param embeddingB - Second embedding vector
   * @returns Similarity score between 0 (completely different) and 1 (identical)
   */
  calculateCosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
    if (embeddingA.length !== embeddingB.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      magnitudeA += embeddingA[i] * embeddingA[i];
      magnitudeB += embeddingB[i] * embeddingB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Check for semantically similar articles in a project
   *
   * This method:
   * 1. Generates an embedding for the new topic
   * 2. Fetches existing article fingerprints from the database
   * 3. Calculates cosine similarity for each
   * 4. Returns articles exceeding the threshold
   *
   * @param topic - The new article topic/keyword
   * @param projectId - The project ID to search within
   * @param existingArticles - Array of existing articles with fingerprints
   * @param options - Similarity check options
   * @returns Similarity check result with similar articles
   */
  async checkSimilarity(
    topic: string,
    existingArticles: Array<{
      id: string;
      title: string | null;
      topic_fingerprint: number[] | null;
    }>,
    options: ISimilarityCheckOptions = {}
  ): Promise<ISimilarityCheckResult> {
    const threshold = options.threshold ?? 0.85;
    const maxResults = options.maxResults ?? 5;
    const excludeArticleId = options.excludeArticleId;

    console.log(
      `[OpenAI Embeddings] Checking similarity for "${topic}" against ${existingArticles.length} articles (threshold: ${threshold})`
    );

    // Generate embedding for the new topic
    const newEmbedding = await this.generateEmbedding(topic);

    // Calculate similarity for each existing article with a fingerprint
    const similarities: Array<{ articleId: string; title: string | null; similarity: number }> = [];

    for (const article of existingArticles) {
      // Skip excluded article (for regeneration)
      if (excludeArticleId && article.id === excludeArticleId) {
        continue;
      }

      // Skip articles without fingerprints
      if (!article.topic_fingerprint) {
        continue;
      }

      const similarity = this.calculateCosineSimilarity(newEmbedding, article.topic_fingerprint);

      if (similarity >= threshold) {
        similarities.push({
          articleId: article.id,
          title: article.title,
          similarity,
        });
      }
    }

    // Sort by similarity (highest first) and limit results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarities = similarities.slice(0, maxResults);

    const maxSimilarity = topSimilarities[0]?.similarity || 0;

    console.log(
      `[OpenAI Embeddings] Found ${topSimilarities.length} similar articles, max similarity: ${maxSimilarity.toFixed(4)}`
    );

    return {
      isSimilar: topSimilarities.length > 0,
      maxSimilarity,
      similarArticleId: topSimilarities[0]?.articleId,
      similarArticles: topSimilarities,
    };
  }

  /**
   * Generate an embedding and format it for PostgreSQL vector column
   * PostgreSQL vector format: "[0.1,0.2,0.3,...]"
   *
   * @param text - The text to embed
   * @returns PostgreSQL-compatible vector string
   */
  async generateEmbeddingForDB(text: string): Promise<string> {
    const embedding = await this.generateEmbedding(text);
    return `[${embedding.join(',')}]`;
  }

  /**
   * Convert a PostgreSQL vector string back to an array of numbers
   *
   * @param vectorString - PostgreSQL vector string like "[0.1,0.2,0.3]"
   * @returns Array of numbers
   */
  parseVectorFromDB(vectorString: string | null): number[] | null {
    if (!vectorString) {
      return null;
    }

    try {
      // Remove brackets and split by comma
      const cleaned = vectorString.trim().replace(/^\[/, '').replace(/\]$/, '');
      if (!cleaned) {
        return null;
      }
      const values = cleaned.split(',').map(n => parseFloat(n));
      // Validate all values are numbers
      if (values.some(isNaN)) {
        console.warn('[OpenAI Embeddings] Vector contains NaN values, returning null');
        return null;
      }
      return values;
    } catch (error) {
      console.error('[OpenAI Embeddings] Failed to parse vector from DB:', error);
      return null;
    }
  }
}

// Export singleton instance
export const openaiEmbeddingsService = new OpenAIEmbeddingsService();
