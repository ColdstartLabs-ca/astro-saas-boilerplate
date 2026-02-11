/**
 * Failure Taxonomy Types for Article Generation
 *
 * Defines structured failure classification for monitoring and triage.
 * Implements E13: Add structured failure taxonomy and metrics.
 */

/**
 * Stage in the generation pipeline where failure occurred
 */
export type FailureStage =
  | 'credit_check' // Failed credit verification
  | 'outline_generation' // Failed to generate outline
  | 'article_generation' // Failed to generate full article
  | 'quality_gate' // Failed quality gate checks
  | 'image_generation' // Failed to generate images
  | 'image_upload' // Failed to upload images to storage
  | 'metadata_extraction' // Failed to extract metadata
  | 'storage' // Failed to save article to database
  | 'unknown'; // Uncategorized failure

/**
 * Provider/service that caused the failure
 */
export type FailureProvider =
  | 'openrouter' // OpenRouter API
  | 'replicate' // Replicate API (images)
  | 'supabase' // Supabase (database/storage)
  | 'stripe' // Stripe (credits/payments)
  | 'internal' // Internal application error
  | 'unknown'; // Unknown provider

/**
 * Classification of error type for retry logic
 */
export type ErrorCategory =
  | 'transient' // Temporary network/service issue (retryable)
  | 'rate_limit' // API rate limit (retry with backoff)
  | 'quota_exceeded' // User quota exceeded (not retryable)
  | 'invalid_input' // Bad user input (not retryable)
  | 'auth' // Authentication issue (not retryable)
  | 'timeout' // Request timeout (retryable)
  | 'content_quality' // Generated content failed quality gates (not retryable via API)
  | 'unknown'; // Unknown category

/**
 * Structured failure metadata for article generation
 */
export interface IFailureMetadata {
  /** Stage where failure occurred */
  stage: FailureStage;
  /** Provider that failed */
  provider: FailureProvider;
  /** HTTP status code if applicable */
  httpStatus: number | null;
  /** Whether this error is retryable */
  isRetryable: boolean;
  /** Error category for classification */
  category: ErrorCategory;
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
}

/**
 * Parsed error information from caught exceptions
 */
export interface IParsedError {
  message: string;
  stage: FailureStage;
  provider: FailureProvider;
  httpStatus: number | null;
  isRetryable: boolean;
  category: ErrorCategory;
  retryAfterMs?: number;
  context?: Record<string, unknown>;
}

/**
 * Failure metrics aggregation for dashboard
 */
export interface IFailureMetrics {
  /** Total failures in period */
  totalFailures: number;
  /** Failures by stage */
  failuresByStage: Record<FailureStage, number>;
  /** Failures by provider */
  failuresByProvider: Record<FailureProvider, number>;
  /** Failures by AI model */
  failuresByModel: Record<string, number>;
  /** Retryable failure count */
  retryableFailures: number;
  /** Failure rate (failures / total attempts) */
  failureRate: number;
}

/**
 * Time window for metrics aggregation
 */
export type MetricsTimeWindow = 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d';
