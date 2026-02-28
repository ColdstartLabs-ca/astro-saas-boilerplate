import { serverEnv } from '@shared/config/env';
// Model validation now happens upstream in campaign.service.ts (preset key validation)
// OpenRouter accepts any valid model ID string directly
import { AppError, ErrorCodes } from '@shared/utils/errors';

/**
 * OpenRouter API response types (OpenAI-compatible format)
 */
interface IOpenRouterMessage {
  role: 'assistant';
  content: string;
}

interface IOpenRouterChoice {
  message: IOpenRouterMessage;
  finish_reason: string;
}

interface IOpenRouterResponse {
  id: string;
  model: string;
  choices: IOpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface IOpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Chat completion message format
 */
export interface IChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Parameters for chat completion request
 */
export interface IChatCompletionParams {
  /** Model ID to use (must be in AI_MODELS config) */
  model: string;
  /** Array of messages for the conversation */
  messages: IChatMessage[];
  /** Maximum tokens to generate (optional) */
  maxTokens?: number;
  /** Sampling temperature (0-2, optional) */
  temperature?: number;
  /** Response format (optional) */
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

/**
 * Result from chat completion request
 */
export interface IChatCompletionResult {
  /** Generated content */
  content: string;
  /** Actual model used */
  model: string;
  /** Token usage stats */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Reason generation stopped */
  finishReason: string;
}

/**
 * OpenRouter service for Vision-Language model analysis.
 * Uses OpenAI-compatible chat completions API format.
 *
 * @see https://openrouter.ai/docs/api-reference
 */
export class OpenRouterService {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiKey = serverEnv.OPENROUTER_API_KEY;
    this.model = serverEnv.OPENROUTER_VL_MODEL;
  }

  /**
   * Check if OpenRouter is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Analyze an image using a Vision-Language model via OpenRouter.
   *
   * @param imageDataUrl - Base64 data URL of the image (e.g., "data:image/jpeg;base64,...")
   * @param prompt - Text prompt describing what to analyze
   * @returns The model's text response
   * @throws Error if API call fails
   */
  async analyzeImage(imageDataUrl: string, prompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API key not configured');
    }

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    };

    console.log('[OpenRouter] Sending request to', this.model);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': serverEnv.BASE_URL || '',
        'X-Title': serverEnv.APP_NAME || '',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as IOpenRouterError;
      const errorMessage = errorBody.error?.message || response.statusText;
      console.error('[OpenRouter] API error:', response.status, errorMessage);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`);
    }

    const data = (await response.json()) as IOpenRouterResponse;

    if (!data.choices?.[0]?.message?.content) {
      console.error('[OpenRouter] Unexpected response format:', data);
      throw new Error('OpenRouter returned empty or invalid response');
    }

    const content = data.choices[0].message.content;

    console.log('[OpenRouter] Response received, tokens used:', data.usage?.total_tokens || 'N/A');

    return content;
  }

  /**
   * Perform a chat completion request for text generation.
   *
   * @param params - Chat completion parameters
   * @returns The model's response with usage stats
   * @throws AppError with AI_UNAVAILABLE on API errors
   */
  async chatCompletion(params: IChatCompletionParams): Promise<IChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'OpenRouter API key not configured');
    }

    // Model is already resolved from preset key by the calling service
    const modelToUse = params.model || serverEnv.OPENROUTER_DEFAULT_MODEL || serverEnv.OPENROUTER_TEXT_MODEL;

    const requestBody = {
      model: modelToUse,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 0.7,
      response_format: params.responseFormat,
    };

    console.log('[OpenRouter] Sending chat completion request to', modelToUse);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': serverEnv.BASE_URL || '',
        'X-Title': serverEnv.APP_NAME || '',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as IOpenRouterError;
      const errorMessage = errorBody.error?.message || response.statusText;
      console.error('[OpenRouter] Chat completion API error:', response.status, errorMessage);
      throw new AppError(
        ErrorCodes.AI_UNAVAILABLE,
        `OpenRouter API error: ${response.status} - ${errorMessage}`
      );
    }

    const data = (await response.json()) as IOpenRouterResponse;

    if (!data.choices?.[0]?.message?.content) {
      console.error('[OpenRouter] Unexpected response format:', data);
      throw new AppError(
        ErrorCodes.AI_UNAVAILABLE,
        'OpenRouter returned empty or invalid response'
      );
    }

    const content = data.choices[0].message.content;

    console.log(
      '[OpenRouter] Chat completion response received, tokens used:',
      data.usage?.total_tokens || 'N/A'
    );

    return {
      content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0].finish_reason,
    };
  }

  /**
   * Perform chat completion with retry logic for transient errors.
   *
   * Retries on: 429 (rate limit), 500, 502, 503, 504
   * Does NOT retry on: 400, 401, 403 (client errors)
   *
   * @param params - Chat completion parameters
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param baseDelayMs - Base delay for exponential backoff (default: 1000ms)
   * @returns The model's response with usage stats
   * @throws AppError with AI_UNAVAILABLE after all retries exhausted
   */
  async chatCompletionWithRetry(
    params: IChatCompletionParams,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<IChatCompletionResult> {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const nonRetryableStatuses = [400, 401, 403];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.chatCompletion(params);
      } catch (error) {
        const isAppError = error instanceof AppError;
        const statusCode = isAppError ? this.extractStatusCode(error.message) : null;

        // Don't retry on client errors
        if (statusCode && nonRetryableStatuses.includes(statusCode)) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === maxRetries) {
          console.error('[OpenRouter] Max retries exhausted for chat completion');
          throw error;
        }

        // Only retry on retryable status codes
        if (statusCode && retryableStatuses.includes(statusCode)) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.log(`[OpenRouter] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error (or couldn't determine status)
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new AppError(ErrorCodes.AI_UNAVAILABLE, 'Chat completion failed');
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

  /**
   * Build the request payload for testing/debugging purposes.
   * Does not make an API call.
   */
  buildRequestPayload(
    imageDataUrl: string,
    prompt: string
  ): {
    model: string;
    messages: Array<{
      role: string;
      content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }>;
    max_tokens: number;
    temperature: number;
  } {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    };
  }
}
