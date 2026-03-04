/**
 * Error Classification Utility
 *
 * Parses and classifies errors from article generation pipeline
 * to extract structured failure metadata for monitoring and triage.
 *
 * Implements E13: Add structured failure taxonomy and metrics.
 */

/**
 * Failure types (previously in failure.types.ts)
 */
type FailureStage =
  | 'credit_check'
  | 'outline_generation'
  | 'article_generation'
  | 'quality_gate'
  | 'image_generation'
  | 'image_upload'
  | 'metadata_extraction'
  | 'storage'
  | 'unknown';

type FailureProvider = 'openrouter' | 'replicate' | 'supabase' | 'stripe' | 'internal' | 'unknown';

type ErrorCategory =
  | 'transient'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'invalid_input'
  | 'auth'
  | 'timeout'
  | 'content_quality'
  | 'unknown';

interface IParsedError {
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
 * HTTP status codes that indicate transient failures (retryable)
 */
const RETRYABLE_HTTP_STATUS = new Set([
  408, // Request Timeout
  429, // Too Many Requests (rate limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Error message patterns for provider detection
 */
const PROVIDER_PATTERNS: Record<FailureProvider, RegExp[]> = {
  openrouter: [/openrouter/i, /open router/i],
  replicate: [/replicate/i],
  supabase: [/supabase/i, /postgresql/i, /postgres/i, /database.*error/i, /storage.*error/i],
  stripe: [/stripe/i, /payment.*error/i, /credit.*error/i],
  internal: [/internal.*error/i, /application.*error/i],
  unknown: [],
};

/**
 * Error message patterns for stage detection
 */
const STAGE_PATTERNS: Record<FailureStage, RegExp[]> = {
  credit_check: [/credit/i, /insufficient.*credits/i, /quota/i],
  outline_generation: [/outline/i, /outline.*generation/i],
  article_generation: [/article.*generation/i, /content.*generation/i, /llm/i, /completion/i],
  quality_gate: [/quality.*gate/i, /word.*count/i, /content.*quality/i, /structure/i],
  image_generation: [/image.*generation/i, /replicate/i, /flux/i, /stable.*diffusion/i],
  image_upload: [/image.*upload/i, /storage.*upload/i, /bucket/i],
  metadata_extraction: [/metadata/i, /word.*count/i, /seo/i],
  storage: [/database/i, /storage/i, /save.*article/i],
  unknown: [],
};

/**
 * Error message patterns for category detection
 */
const CATEGORY_PATTERNS: Record<ErrorCategory, RegExp[]> = {
  transient: [/timeout/i, /connection/i, /network/i, /temporarily.*unavailable/i, /try.*again/i],
  rate_limit: [/rate.*limit/i, /too.*many.*requests/i, /429/i, /quota.*exceeded/i],
  quota_exceeded: [
    /insufficient.*credits/i,
    /credit.*balance/i,
    /quota.*exceeded/i,
    /limit.*reached/i,
  ],
  invalid_input: [/invalid.*input/i, /bad.*request/i, /validation/i, /malformed/i],
  auth: [/unauthorized/i, /authentication/i, /forbidden/i, /api.*key/i, /401/i, /403/i],
  timeout: [/timeout/i, /timed.*out/i, /408/i],
  content_quality: [/quality.*gate/i, /word.*count/i, /content.*quality/i, /failed.*quality/i],
  unknown: [],
};

/**
 * Parse and classify an error into structured failure metadata
 *
 * @param error - The caught error object
 * @param defaultStage - Default stage if detection fails
 * @returns Parsed error information
 */
export function classifyError(
  error: unknown,
  defaultStage: FailureStage = 'unknown'
): IParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Extract HTTP status if present in message or error object
  const httpStatus = extractHttpStatus(error, errorMessage);

  // Determine provider
  const provider = detectProvider(errorMessage, error);

  // Determine stage
  const stage = detectStage(errorMessage, defaultStage);

  // Determine category
  const category = detectCategory(errorMessage, httpStatus);

  // Determine if retryable based on category and status
  const isRetryable = determineRetryability(category, httpStatus);

  // Calculate retry delay for rate limits
  const retryAfterMs = calculateRetryDelay(category, httpStatus, errorMessage);

  // Extract additional context
  const context = extractErrorContext(error, errorMessage, errorStack);

  return {
    message: errorMessage,
    stage,
    provider,
    httpStatus,
    isRetryable,
    category,
    retryAfterMs,
    context,
  };
}

/**
 * Extract HTTP status code from error
 */
function extractHttpStatus(error: unknown, errorMessage: string): number | null {
  // Check for status property on error object
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    if (!isNaN(status) && status >= 100 && status < 600) {
      return status;
    }
  }

  // Check for statusCode property
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = Number((error as { statusCode: unknown }).statusCode);
    if (!isNaN(statusCode) && statusCode >= 100 && statusCode < 600) {
      return statusCode;
    }
  }

  // Check message for HTTP status pattern
  const statusMatch = errorMessage.match(/\b(4\d{2}|5\d{2})\b/);
  if (statusMatch) {
    return parseInt(statusMatch[1], 10);
  }

  return null;
}

/**
 * Detect provider from error message and object
 */
function detectProvider(errorMessage: string, error: unknown): FailureProvider {
  // Check error object for provider hints
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.provider === 'string') {
      const provider = err.provider.toLowerCase();
      if (PROVIDER_PATTERNS.openrouter.some(p => p.test(provider))) return 'openrouter';
      if (PROVIDER_PATTERNS.replicate.some(p => p.test(provider))) return 'replicate';
      if (PROVIDER_PATTERNS.supabase.some(p => p.test(provider))) return 'supabase';
      if (PROVIDER_PATTERNS.stripe.some(p => p.test(provider))) return 'stripe';
    }
  }

  // Check message patterns
  for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS)) {
    if (patterns.some(p => p.test(errorMessage))) {
      return provider as FailureProvider;
    }
  }

  return 'unknown';
}

/**
 * Detect failure stage from error message
 */
function detectStage(errorMessage: string, defaultStage: FailureStage): FailureStage {
  for (const [stage, patterns] of Object.entries(STAGE_PATTERNS)) {
    if (patterns.some(p => p.test(errorMessage))) {
      return stage as FailureStage;
    }
  }
  return defaultStage;
}

/**
 * Detect error category from message and HTTP status
 */
function detectCategory(errorMessage: string, httpStatus: number | null): ErrorCategory {
  // Check HTTP status based classification first
  if (httpStatus) {
    if (httpStatus === 429) return 'rate_limit';
    if (RETRYABLE_HTTP_STATUS.has(httpStatus)) return 'transient';
    if ([401, 403].includes(httpStatus)) return 'auth';
    if (httpStatus === 400) return 'invalid_input';
  }

  // Check message patterns
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(p => p.test(errorMessage))) {
      return category as ErrorCategory;
    }
  }

  return 'unknown';
}

/**
 * Determine if error is retryable based on category and status
 */
function determineRetryability(category: ErrorCategory, httpStatus: number | null): boolean {
  // Content quality failures are not retryable via API
  if (category === 'content_quality') return false;

  // Auth and input errors are not retryable
  if (category === 'auth' || category === 'invalid_input') return false;

  // Quota exceeded is not retryable (requires user action)
  if (category === 'quota_exceeded') return false;

  // Rate limits are retryable with backoff
  if (category === 'rate_limit') return true;

  // Transient and timeout errors are retryable
  if (category === 'transient' || category === 'timeout') return true;

  // Check HTTP status if available
  if (httpStatus) {
    return RETRYABLE_HTTP_STATUS.has(httpStatus);
  }

  // Default to not retryable for unknown errors
  return false;
}

/**
 * Calculate retry delay based on error type
 */
function calculateRetryDelay(
  category: ErrorCategory,
  httpStatus: number | null,
  errorMessage: string
): number | undefined {
  // Extract Retry-After header value if present in message
  const retryAfterMatch = errorMessage.match(/retry-after[:\s]+(\d+)/i);
  if (retryAfterMatch) {
    return parseInt(retryAfterMatch[1], 10) * 1000;
  }

  // Rate limits: exponential backoff starting at 1 minute
  if (category === 'rate_limit' || httpStatus === 429) {
    return 60000; // 1 minute
  }

  // Timeouts: shorter retry delay
  if (category === 'timeout' || httpStatus === 408) {
    return 5000; // 5 seconds
  }

  // Transient errors: moderate delay
  if (category === 'transient') {
    return 10000; // 10 seconds
  }

  return undefined;
}

/**
 * Extract additional context from error for debugging
 */
function extractErrorContext(
  error: unknown,
  errorMessage: string,
  errorStack?: string
): Record<string, unknown> | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const context: Record<string, unknown> = {};

  // Extract common error properties
  const err = error as Record<string, unknown>;

  if (typeof err.code === 'string') context.code = err.code;
  if (typeof err.type === 'string') context.type = err.type;
  if (typeof err.name === 'string') context.name = err.name;
  if (typeof err.requestId === 'string') context.requestId = err.requestId;
  if (typeof err.correlationId === 'string') context.correlationId = err.correlationId;

  // Include stack trace if available
  if (errorStack) {
    context.stack = errorStack.split('\n').slice(0, 3).join('\n'); // First 3 lines only
  }

  // Only return context if we found something useful
  return Object.keys(context).length > 0 ? context : undefined;
}

/**
 * Create a failure metadata object for database storage
 *
 * @param parsedError - The parsed error from classifyError
 * @returns Object ready for database update
 */
export function createFailureMetadata(parsedError: IParsedError): {
  failure_stage: FailureStage;
  provider: FailureProvider;
  http_status: number | null;
  is_retryable: boolean;
} {
  return {
    failure_stage: parsedError.stage,
    provider: parsedError.provider,
    http_status: parsedError.httpStatus,
    is_retryable: parsedError.isRetryable,
    // Note: attempt_count is managed separately by the service
  };
}

/**
 * Format error message with structured context
 *
 * @param parsedError - The parsed error
 * @returns Formatted error message
 */
export function formatErrorMessage(parsedError: IParsedError): string {
  const parts: string[] = [];

  parts.push(`[${parsedError.stage}]`);
  if (parsedError.provider !== 'unknown') {
    parts.push(`${parsedError.provider}:`);
  }
  parts.push(parsedError.message);

  if (parsedError.httpStatus) {
    parts.push(`(HTTP ${parsedError.httpStatus})`);
  }

  return parts.join(' ');
}
