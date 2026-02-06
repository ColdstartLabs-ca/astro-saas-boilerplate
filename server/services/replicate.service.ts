import { serverEnv } from '@shared/config/env';
import { AppError, ErrorCodes } from '@shared/utils/errors';

/**
 * Replicate API prediction status
 */
export type ReplicateStatus =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

/**
 * Replicate prediction response
 */
export interface IPrediction {
  id: string;
  status: ReplicateStatus;
  output?: string | string[] | null;
  error?: string | null;
  urls?: {
    get?: string;
    cancel?: string;
  };
  created_at: string;
  completed_at?: string;
}

/**
 * Replicate API error response
 */
interface IReplicateError {
  detail?: string;
}

/**
 * Replicate prediction creation input
 */
export interface ICreatePredictionInput {
  /** Model version or owner/name: e.g., 'black-forest-labs/flux-schnell' */
  model: string;
  /** Input parameters for the model (prompt, aspect_ratio, etc.) */
  input: Record<string, unknown>;
  /** Webhook URL (optional, not used in our implementation) */
  webhook?: string;
}

/**
 * Replicate service for image generation via API.
 *
 * @see https://replicate.com/docs/reference/http
 */
export class ReplicateService {
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = serverEnv.REPLICATE_API_KEY;
  }

  /**
   * Check if Replicate is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  /**
   * Create a new prediction for a model
   *
   * @param model - Model identifier (e.g., 'black-forest-labs/flux-schnell')
   * @param input - Model input parameters (prompt, aspect_ratio, etc.)
   * @returns The created prediction object
   * @throws AppError if API call fails
   */
  async createPrediction(model: string, input: Record<string, unknown>): Promise<IPrediction> {
    if (!this.isConfigured()) {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Replicate API key not configured');
    }

    const requestBody = {
      version: model, // Replicate uses "version" for model identifier in predictions API
      input,
    };

    console.log('[Replicate] Creating prediction for model:', model);

    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as IReplicateError;
      const errorMessage = errorBody.detail || response.statusText;
      console.error('[Replicate] API error:', response.status, errorMessage);
      throw new AppError(
        ErrorCodes.AI_UNAVAILABLE,
        `Replicate API error: ${response.status} - ${errorMessage}`
      );
    }

    const data = (await response.json()) as IPrediction;

    console.log('[Replicate] Prediction created:', data.id, 'status:', data.status);

    return data;
  }

  /**
   * Poll a prediction until it completes or fails
   *
   * @param predictionId - The prediction ID to poll
   * @param maxAttempts - Maximum number of polling attempts (default: 30)
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   * @returns The completed prediction
   * @throws AppError if prediction fails or max attempts reached
   */
  async pollPrediction(
    predictionId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<IPrediction> {
    console.log(`[Replicate] Polling prediction ${predictionId} (max ${maxAttempts} attempts)`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prediction = await this.getPrediction(predictionId);

      if (prediction.status === 'succeeded') {
        console.log(`[Replicate] Prediction ${predictionId} succeeded after ${attempt + 1} attempts`);
        return prediction;
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        const errorMsg = prediction.error || 'Prediction failed or was canceled';
        console.error(`[Replicate] Prediction ${predictionId} ${prediction.status}:`, errorMsg);
        throw new AppError(ErrorCodes.AI_UNAVAILABLE, `Image generation failed: ${errorMsg}`);
      }

      // Still processing, wait before next poll
      if (attempt < maxAttempts - 1) {
        await this.sleep(intervalMs);
      }
    }

    // Max attempts reached
    console.error(`[Replicate] Prediction ${predictionId} timed out after ${maxAttempts} attempts`);
    throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Image generation timed out');
  }

  /**
   * Get a prediction by ID
   *
   * @param predictionId - The prediction ID
   * @returns The prediction object
   * @throws AppError if API call fails
   */
  async getPrediction(predictionId: string): Promise<IPrediction> {
    if (!this.isConfigured()) {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Replicate API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as IReplicateError;
      const errorMessage = errorBody.detail || response.statusText;
      console.error('[Replicate] Get prediction error:', response.status, errorMessage);
      throw new AppError(
        ErrorCodes.AI_UNAVAILABLE,
        `Replicate API error: ${response.status} - ${errorMessage}`
      );
    }

    return (await response.json()) as IPrediction;
  }

  /**
   * Generate an image end-to-end: create prediction and poll until complete
   *
   * @param model - Model identifier (e.g., 'black-forest-labs/flux-schnell')
   * @param prompt - Image generation prompt
   * @param params - Additional model parameters (aspect_ratio, etc.)
   * @param maxAttempts - Maximum polling attempts (default: 30)
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   * @returns The output image URL
   * @throws AppError if generation fails
   */
  async generateImage(
    model: string,
    prompt: string,
    params: Record<string, unknown> = {},
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<string> {
    const input = {
      prompt,
      ...params,
    };

    // Create prediction
    const prediction = await this.createPrediction(model, input);

    // Poll until complete
    const completed = await this.pollPrediction(prediction.id, maxAttempts, intervalMs);

    // Extract output URL
    if (!completed.output) {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Image generation completed but no output');
    }

    // Handle both string and array outputs
    const imageUrl = Array.isArray(completed.output) ? completed.output[0] : completed.output;

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Invalid image output format');
    }

    console.log('[Replicate] Image generated successfully:', imageUrl);

    return imageUrl;
  }

  /**
   * Perform operation with retry logic for transient errors
   *
   * Retries on: 429 (rate limit), 500, 502, 503, 504
   * Does NOT retry on: 400, 401, 403, 404 (client errors)
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const nonRetryableStatuses = [400, 401, 403, 404];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isAppError = error instanceof AppError;
        const statusCode = isAppError ? this.extractStatusCode(error.message) : null;

        // Don't retry on client errors
        if (statusCode && nonRetryableStatuses.includes(statusCode)) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === maxRetries) {
          console.error('[Replicate] Max retries exhausted');
          throw error;
        }

        // Only retry on retryable status codes
        if (statusCode && retryableStatuses.includes(statusCode)) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.log(`[Replicate] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error (or couldn't determine status)
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Operation failed');
  }

  /**
   * Extract HTTP status code from error message
   */
  private extractStatusCode(errorMessage: string): number | null {
    const match = errorMessage.match(/API error: (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let replicateServiceInstance: ReplicateService | null = null;

/**
 * Get the singleton ReplicateService instance
 */
export function getReplicateService(): ReplicateService {
  if (!replicateServiceInstance) {
    replicateServiceInstance = new ReplicateService();
  }
  return replicateServiceInstance;
}
