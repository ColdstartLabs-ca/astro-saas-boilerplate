/**
 * Encryption Utility for CMS Credentials
 *
 * Uses Web Crypto API with AES-256-GCM for Cloudflare Workers compatibility.
 * DO NOT use Node.js crypto module - it doesn't work in Cloudflare Workers.
 *
 * Algorithm: AES-256-GCM
 * Key derivation: HKDF with SHA-256
 * IV: Random 12 bytes (96 bits) per encryption
 * Auth Tag: 16 bytes (128 bits) appended by GCM
 * Storage Format: Base64(iv + ciphertext + authTag)
 */

import { serverEnv } from '@shared/config/env';

/**
 * Error thrown when encryption key is not configured
 */
export class EncryptionKeyError extends Error {
  constructor() {
    super('CMS_ENCRYPTION_KEY environment variable is not configured');
    this.name = 'EncryptionKeyError';
  }
}

/**
 * Error thrown when decryption fails (wrong key, corrupted data, etc.)
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(`Decryption failed: ${message}`);
    this.name = 'DecryptionError';
  }
}

/**
 * Length of the initialization vector in bytes (96 bits for GCM)
 */
const IV_LENGTH = 12;

/**
 * Length of the encryption key in bytes (256 bits for AES-256)
 */
const KEY_LENGTH = 32;

/**
 * Get the encryption key from environment
 * Uses HKDF to derive a proper key from the CMS_ENCRYPTION_KEY env var
 *
 * @returns CryptoKey for AES-256-GCM
 * @throws {EncryptionKeyError} if CMS_ENCRYPTION_KEY is not configured
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = serverEnv.CMS_ENCRYPTION_KEY;

  if (!keyString || keyString.length < 32) {
    throw new EncryptionKeyError();
  }

  // Encode the key string to bytes
  const keyBytes = new TextEncoder().encode(keyString);

  // Use HKDF to derive a proper key of exactly KEY_LENGTH bytes
  const baseKey = await crypto.subtle.importKey(
    'raw', // key format
    keyBytes, // key data
    { name: 'HKDF' }, // algorithm
    false, // extractable
    ['deriveBits', 'deriveKey'] // key usages
  );

  // Derive a key of exactly KEY_LENGTH bytes using HKDF
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(), // Empty salt for deterministic derivation
      info: new TextEncoder().encode('cms-encryption-key'),
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 }, // Target: AES-GCM with 256-bit key
    false, // extractable
    ['encrypt', 'decrypt'] // key usages
  );

  return derivedKey;
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @param key - Optional crypto key (uses env var if not provided)
 * @returns Base64-encoded string (iv + ciphertext + auth tag)
 * @throws {EncryptionKeyError} if encryption key is not configured
 */
export async function encrypt(plaintext: string, key?: CryptoKey): Promise<string> {
  const encryptionKey = key || (await getEncryptionKey());

  // Generate a random IV (initialization vector)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext to bytes
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Encrypt using AES-256-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    plaintextBytes
  );

  // Combine IV + ciphertext (GCM automatically appends auth tag)
  const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertextBuffer), iv.length);

  // Encode as base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded string (iv + ciphertext + auth tag)
 * @param key - Optional crypto key (uses env var if not provided)
 * @returns Decrypted plaintext
 * @throws {DecryptionError} if decryption fails (wrong key, corrupted data, etc.)
 * @throws {EncryptionKeyError} if encryption key is not configured
 */
export async function decrypt(ciphertext: string, key?: CryptoKey): Promise<string> {
  try {
    const encryptionKey = key || (await getEncryptionKey());

    // Decode base64 to bytes
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertextBytes = combined.slice(IV_LENGTH);

    // Decrypt using AES-256-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      encryptionKey,
      ciphertextBytes
    );

    // Decode bytes to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DecryptionError(message);
  }
}

/**
 * Encrypt JSON object to base64 string
 *
 * @param data - The object to encrypt
 * @param key - Optional crypto key
 * @returns Base64-encoded encrypted string
 */
export async function encryptJSON<T extends Record<string, unknown>>(
  data: T,
  key?: CryptoKey
): Promise<string> {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString, key);
}

/**
 * Decrypt base64 string to JSON object
 *
 * @param ciphertext - Base64-encoded encrypted string
 * @param key - Optional crypto key
 * @returns Decrypted object
 */
export async function decryptJSON<T extends Record<string, unknown>>(
  ciphertext: string,
  key?: CryptoKey
): Promise<T> {
  const jsonString = await decrypt(ciphertext, key);
  return JSON.parse(jsonString) as T;
}

/**
 * Type guard to check if an error is an EncryptionKeyError
 */
export function isEncryptionKeyError(error: unknown): error is EncryptionKeyError {
  return error instanceof EncryptionKeyError;
}

/**
 * Type guard to check if an error is a DecryptionError
 */
export function isDecryptionError(error: unknown): error is DecryptionError {
  return error instanceof DecryptionError;
}
