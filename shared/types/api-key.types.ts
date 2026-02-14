/**
 * API Key Types for Public REST API
 *
 * Defines interfaces for API key management, authentication,
 * and authorization scopes.
 */

/**
 * Valid API key scopes for permission control
 */
export type ApiKeyScope =
  | 'articles:read'
  | 'articles:write'
  | 'campaigns:read'
  | 'campaigns:write'
  | 'integrations:read';

/**
 * All available scopes for new API keys
 */
export const ALL_API_KEY_SCOPES: ApiKeyScope[] = [
  'articles:read',
  'articles:write',
  'campaigns:read',
  'campaigns:write',
  'integrations:read',
];

/**
 * API key record from database (without sensitive key_hash)
 */
export interface IApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  rate_limit: number;
  scopes: ApiKeyScope[];
  expires_at: string | null;
  created_at: string;
}

/**
 * API key with the full key (only returned once on creation)
 */
export interface IApiKeyWithSecret extends IApiKey {
  /** Full API key - only shown once during creation */
  key: string;
}

/**
 * Input for creating a new API key
 */
export interface ICreateApiKeyInput {
  /** Friendly name for the key */
  name: string;
  /** Permission scopes for the key */
  scopes?: ApiKeyScope[];
  /** Optional expiration date (ISO 8601 string) */
  expires_at?: string;
  /** Custom rate limit (requests per minute, default 100) */
  rate_limit?: number;
}

/**
 * Input for updating an existing API key
 */
export interface IUpdateApiKeyInput {
  /** New friendly name */
  name?: string;
  /** New permission scopes */
  scopes?: ApiKeyScope[];
  /** New rate limit */
  rate_limit?: number;
}

/**
 * Response from listing API keys
 */
export interface IApiKeysListResponse {
  keys: IApiKey[];
}

/**
 * Response from creating an API key
 */
export interface ICreateApiKeyResponse {
  key: IApiKeyWithSecret;
  /** Warning message about key visibility */
  warning: string;
}

/**
 * Internal API key record with hash (for service use only)
 */
export interface IApiKeyWithHash extends IApiKey {
  key_hash: string;
}

/**
 * API key authentication result
 */
export interface IApiKeyAuthResult {
  valid: boolean;
  userId?: string;
  keyId?: string;
  scopes?: ApiKeyScope[];
  rateLimit?: number;
  error?: string;
}

/**
 * Error thrown when API key is not found
 */
export class ApiKeyNotFoundError extends Error {
  public readonly keyId: string;

  constructor(keyId: string) {
    super(`API key not found: ${keyId}`);
    this.name = 'ApiKeyNotFoundError';
    this.keyId = keyId;
  }
}

/**
 * Error thrown when API key validation fails
 */
export class ApiKeyValidationError extends Error {
  public readonly reason: string;

  constructor(reason: string) {
    super(`API key validation failed: ${reason}`);
    this.name = 'ApiKeyValidationError';
    this.reason = reason;
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class ApiKeyRateLimitError extends Error {
  public readonly resetTime: number;
  public readonly limit: number;

  constructor(resetTime: number, limit: number) {
    super('API key rate limit exceeded');
    this.name = 'ApiKeyRateLimitError';
    this.resetTime = resetTime;
    this.limit = limit;
  }
}

/**
 * Error thrown when API key has insufficient scopes
 */
export class ApiKeyScopeError extends Error {
  public readonly required: ApiKeyScope[];
  public readonly provided: ApiKeyScope[];

  constructor(required: ApiKeyScope[], provided: ApiKeyScope[]) {
    super(`Insufficient scopes. Required: ${required.join(', ')}`);
    this.name = 'ApiKeyScopeError';
    this.required = required;
    this.provided = provided;
  }
}
