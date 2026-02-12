/**
 * Edge Runtime Compatible Crypto Utilities
 *
 * Uses Web Crypto API for compatibility with Cloudflare Workers
 * and other edge environments (10ms CPU limit friendly).
 */

/**
 * Create a SHA-256 hash of a string.
 * Uses Web Crypto API (Edge Runtime compatible).
 *
 * @param input - The string to hash
 * @returns SHA-256 hash as hex string
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash an email address for analytics/privacy purposes.
 * Normalizes email (lowercase, trimmed) before hashing.
 *
 * @param email - The email address to hash
 * @returns SHA-256 hash of the normalized email
 * @throws Error if email is invalid
 */
export async function hashEmail(email: string): Promise<string> {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email string is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  return sha256(normalizedEmail);
}

// =============================================================================
// OAuth State Signing (HMAC)
// =============================================================================

/**
 * Sign OAuth state data using HMAC-SHA256.
 * Creates a tamper-proof token that can be verified on callback.
 *
 * @param data - The data to sign (e.g., "userId:projectId")
 * @param secret - Secret key for signing (should be serverEnv.CRON_SECRET)
 * @returns Signed token in format: "data.timestamp.signature"
 */
export async function signOAuthState(data: string, secret: string): Promise<string> {
  if (!secret) {
    throw new Error('OAuth state secret is required');
  }

  const timestamp = Date.now();
  const message = `${data}.${timestamp}`;

  // Import secret key for HMAC
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the message
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `${message}.${signature}`;
}

/**
 * Result of OAuth state verification.
 */
export interface IOAuthStateResult {
  valid: boolean;
  data: string | null;
  error?: string;
}

/**
 * Verify a signed OAuth state token.
 *
 * @param token - The signed token from callback
 * @param secret - Secret key used for signing (should be serverEnv.CRON_SECRET)
 * @param maxAgeMs - Maximum age in milliseconds (default: 10 minutes)
 * @returns Verification result with parsed data if valid
 */
export async function verifyOAuthState(
  token: string,
  secret: string,
  maxAgeMs: number = 10 * 60 * 1000 // 10 minutes default
): Promise<IOAuthStateResult> {
  if (!secret) {
    return { valid: false, data: null, error: 'OAuth state secret is required' };
  }

  if (!token || typeof token !== 'string') {
    return { valid: false, data: null, error: 'Invalid token format' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, data: null, error: 'Invalid token structure' };
  }

  const [data, timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, data: null, error: 'Invalid timestamp' };
  }

  // Check token age
  const age = Date.now() - timestamp;
  if (age > maxAgeMs) {
    return { valid: false, data: null, error: 'Token expired' };
  }

  // Prevent replay attacks with very old timestamps
  if (age < 0) {
    return { valid: false, data: null, error: 'Invalid timestamp (future)' };
  }

  // Re-create the message and verify signature
  const message = `${data}.${timestamp}`;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature back to bytes
    const signatureBytes = new Uint8Array(
      providedSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(message)
    );

    if (!isValid) {
      return { valid: false, data: null, error: 'Invalid signature' };
    }

    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
