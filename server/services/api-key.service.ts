/**
 * API Key Service
 *
 * Handles generation, hashing, validation, and CRUD operations for API keys.
 * Keys are stored as SHA-256 hashes for security - the full key is only shown once.
 *
 * Key format: apr_live_<32-char-random>
 * Example: apr_live_abc123def456ghi789jkl012mno345pqr
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  ALL_API_KEY_SCOPES,
  ApiKeyNotFoundError,
  type IApiKey,
  type IApiKeyWithSecret,
  type ICreateApiKeyInput,
  type IUpdateApiKeyInput,
  type ApiKeyScope,
} from '@shared/types/api-key.types';

/**
 * API key prefix for identification
 */
const KEY_PREFIX = 'apr_live_';

/**
 * Length of the random portion of the key (32 characters)
 */
const KEY_RANDOM_LENGTH = 32;

/**
 * Characters used in the random portion of the key
 */
const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Length of the key prefix shown to users (8 chars after apr_live_)
 */
const KEY_DISPLAY_PREFIX_LENGTH = 8;

/**
 * Generate a cryptographically secure random string
 *
 * @param length - Length of the string to generate
 * @returns Random string
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += KEY_CHARS[array[i] % KEY_CHARS.length];
  }
  return result;
}

/**
 * Hash a string using SHA-256
 *
 * @param text - Text to hash
 * @returns Hex-encoded SHA-256 hash
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert to hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a new API key with the apr_live_ prefix
 *
 * @returns Full API key string
 */
export function generateApiKey(): string {
  const randomPart = generateRandomString(KEY_RANDOM_LENGTH);
  return `${KEY_PREFIX}${randomPart}`;
}

/**
 * Hash an API key for storage
 *
 * @param key - Full API key
 * @returns SHA-256 hash of the key
 */
export async function hashApiKey(key: string): Promise<string> {
  return sha256(key);
}

/**
 * Extract the display prefix from a full API key
 * Returns the first 8 characters after apr_live_
 *
 * @param key - Full API key
 * @returns Display prefix (e.g., "apr_live_abc12345")
 */
export function getKeyPrefix(key: string): string {
  // Return apr_live_ + first 8 chars of the random portion
  const randomPart = key.slice(KEY_PREFIX.length);
  return `${KEY_PREFIX}${randomPart.slice(0, KEY_DISPLAY_PREFIX_LENGTH)}`;
}

/**
 * Validate API key format
 *
 * @param key - API key to validate
 * @returns True if valid format
 */
export function isValidKeyFormat(key: string): boolean {
  if (!key.startsWith(KEY_PREFIX)) {
    return false;
  }

  const randomPart = key.slice(KEY_PREFIX.length);
  if (randomPart.length !== KEY_RANDOM_LENGTH) {
    return false;
  }

  // Check that random part only contains valid characters
  return /^[a-z0-9]+$/.test(randomPart);
}

/**
 * API Key Service
 *
 * Manages API key lifecycle: creation, retrieval, updates, deletion.
 */
export class ApiKeyService {
  /**
   * List all API keys for a user
   *
   * @param userId - The user ID
   * @returns Promise resolving to list of API keys (without key_hash)
   */
  async list(userId: string): Promise<IApiKey[]> {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id, name, key_prefix, last_used_at, rate_limit, scopes, expires_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return (data || []).map(row => ({
      ...row,
      scopes: Array.isArray(row.scopes) ? row.scopes : [],
    })) as IApiKey[];
  }

  /**
   * Get a single API key by ID
   *
   * @param keyId - The API key ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving to API key or null
   */
  async getById(keyId: string, userId: string): Promise<IApiKey | null> {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id, name, key_prefix, last_used_at, rate_limit, scopes, expires_at, created_at')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get API key: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    } as IApiKey;
  }

  /**
   * Create a new API key
   *
   * @param userId - The user ID
   * @param input - Creation input
   * @returns Promise resolving to created key with full secret (shown once!)
   */
  async create(userId: string, input: ICreateApiKeyInput): Promise<IApiKeyWithSecret> {
    // Generate new key
    const fullKey = generateApiKey();
    const keyHash = await hashApiKey(fullKey);
    const keyPrefix = getKeyPrefix(fullKey);

    // Default to all scopes if not specified
    const scopes = input.scopes && input.scopes.length > 0
      ? input.scopes
      : [...ALL_API_KEY_SCOPES];

    // Create key record
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        rate_limit: input.rate_limit ?? 100,
        scopes,
        expires_at: input.expires_at ?? null,
      })
      .select('id, user_id, name, key_prefix, last_used_at, rate_limit, scopes, expires_at, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create API key: ${error?.message ?? 'Unknown error'}`);
    }

    // Return key with full secret (only time it's shown!)
    return {
      ...data,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      key: fullKey,
    } as IApiKeyWithSecret;
  }

  /**
   * Update an existing API key
   *
   * @param keyId - The API key ID
   * @param userId - The user ID (for ownership check)
   * @param input - Update input
   * @returns Promise resolving to updated API key
   */
  async update(keyId: string, userId: string, input: IUpdateApiKeyInput): Promise<IApiKey> {
    // Verify ownership
    const existing = await this.getById(keyId, userId);
    if (!existing) {
      throw new ApiKeyNotFoundError(keyId);
    }

    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }

    if (input.scopes !== undefined) {
      updates.scopes = input.scopes;
    }

    if (input.rate_limit !== undefined) {
      updates.rate_limit = input.rate_limit;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .eq('user_id', userId)
      .select('id, user_id, name, key_prefix, last_used_at, rate_limit, scopes, expires_at, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update API key: ${error?.message ?? 'Unknown error'}`);
    }

    return {
      ...data,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    } as IApiKey;
  }

  /**
   * Delete an API key
   *
   * @param keyId - The API key ID
   * @param userId - The user ID (for ownership check)
   */
  async delete(keyId: string, userId: string): Promise<void> {
    // Verify ownership
    const existing = await this.getById(keyId, userId);
    if (!existing) {
      throw new ApiKeyNotFoundError(keyId);
    }

    const { error } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Validate an API key and return user info
   * Used by authentication middleware
   *
   * @param key - Full API key to validate
   * @returns Promise resolving to validation result
   */
  async validateKey(key: string): Promise<{
    valid: boolean;
    userId?: string;
    keyId?: string;
    scopes?: ApiKeyScope[];
    rateLimit?: number;
    error?: string;
  }> {
    // Check key format
    if (!isValidKeyFormat(key)) {
      return { valid: false, error: 'Invalid key format' };
    }

    // Hash the key for lookup
    const keyHash = await hashApiKey(key);

    // Look up the key
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id, rate_limit, scopes, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Key not found' };
    }

    // Check expiration
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (expiresAt <= new Date()) {
        return { valid: false, error: 'Key has expired' };
      }
    }

    // Update last_used_at (fire and forget)
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => { /* no-op */ });

    return {
      valid: true,
      userId: data.user_id,
      keyId: data.id,
      scopes: Array.isArray(data.scopes) ? data.scopes as ApiKeyScope[] : [],
      rateLimit: data.rate_limit,
    };
  }
}

/**
 * Singleton instance of API key service
 */
export const apiKeyService = new ApiKeyService();
