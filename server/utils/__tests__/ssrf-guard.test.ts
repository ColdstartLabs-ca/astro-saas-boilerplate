/**
 * SSRF Guard Utility Tests
 *
 * Tests that validateWebhookUrl correctly blocks dangerous URLs and allows
 * safe public HTTPS endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock serverEnv before importing the module under test so we can control
// the ENV value across test cases.
vi.mock('@shared/config/env', () => ({
  serverEnv: { ENV: 'production' },
}));

import { validateWebhookUrl } from '../ssrf-guard';

describe('validateWebhookUrl', () => {
  // ===========================================================================
  // Private IPv4 ranges — must be rejected
  // ===========================================================================

  describe('blocks private IPv4 addresses', () => {
    it('rejects 127.0.0.1 (loopback)', () => {
      expect(validateWebhookUrl('https://127.0.0.1/hook')).toBe(false);
    });

    it('rejects 127.x.x.x range', () => {
      expect(validateWebhookUrl('https://127.0.0.2/hook')).toBe(false);
      expect(validateWebhookUrl('https://127.255.255.255/hook')).toBe(false);
    });

    it('rejects 10.0.0.1 (class A private)', () => {
      expect(validateWebhookUrl('https://10.0.0.1/hook')).toBe(false);
    });

    it('rejects 10.x.x.x range', () => {
      expect(validateWebhookUrl('https://10.255.255.255/hook')).toBe(false);
    });

    it('rejects 192.168.1.1 (class C private)', () => {
      expect(validateWebhookUrl('https://192.168.1.1/hook')).toBe(false);
    });

    it('rejects 192.168.x.x range', () => {
      expect(validateWebhookUrl('https://192.168.0.1/hook')).toBe(false);
      expect(validateWebhookUrl('https://192.168.255.255/hook')).toBe(false);
    });

    it('rejects 172.16.x.x through 172.31.x.x (class B private)', () => {
      expect(validateWebhookUrl('https://172.16.0.1/hook')).toBe(false);
      expect(validateWebhookUrl('https://172.31.255.255/hook')).toBe(false);
    });

    it('does NOT reject 172.15.x.x (outside private range)', () => {
      expect(validateWebhookUrl('https://172.15.0.1/hook')).toBe(true);
    });

    it('rejects 169.254.169.254 (cloud metadata endpoint)', () => {
      expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('rejects 169.254.x.x link-local range', () => {
      expect(validateWebhookUrl('https://169.254.0.1/hook')).toBe(false);
    });
  });

  // ===========================================================================
  // Blocked hostnames — must be rejected
  // ===========================================================================

  describe('blocks dangerous hostnames', () => {
    it('rejects localhost', () => {
      expect(validateWebhookUrl('https://localhost/hook')).toBe(false);
    });

    it('rejects metadata.google.internal (GCP metadata)', () => {
      expect(validateWebhookUrl('https://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    });

    it('rejects kubernetes.default', () => {
      expect(validateWebhookUrl('https://kubernetes.default/api/v1/')).toBe(false);
    });
  });

  // ===========================================================================
  // IPv6 loopback — must be rejected
  // ===========================================================================

  describe('blocks IPv6 loopback', () => {
    it('rejects ::1 (IPv6 loopback)', () => {
      // URL API encodes IPv6 as [::1]
      expect(validateWebhookUrl('https://[::1]/hook')).toBe(false);
    });
  });

  // ===========================================================================
  // Non-HTTPS URLs in production — must be rejected
  // ===========================================================================

  describe('rejects non-HTTPS URLs in production', () => {
    it('rejects plain HTTP URL', () => {
      expect(validateWebhookUrl('http://example.com/hook')).toBe(false);
    });

    it('rejects ftp:// URL', () => {
      expect(validateWebhookUrl('ftp://example.com/hook')).toBe(false);
    });

    it('rejects file:// URL', () => {
      expect(validateWebhookUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects invalid/unparseable URL', () => {
      expect(validateWebhookUrl('not-a-url')).toBe(false);
      expect(validateWebhookUrl('')).toBe(false);
    });
  });

  // ===========================================================================
  // Valid public HTTPS URLs — must be accepted
  // ===========================================================================

  describe('accepts safe public HTTPS URLs', () => {
    it('accepts https://example.com', () => {
      expect(validateWebhookUrl('https://example.com/webhook')).toBe(true);
    });

    it('accepts https://hooks.zapier.com', () => {
      expect(validateWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc')).toBe(true);
    });

    it('accepts https://api.mysite.io/webhook', () => {
      expect(validateWebhookUrl('https://api.mysite.io/webhook')).toBe(true);
    });

    it('accepts a public IP (8.8.8.8)', () => {
      // 8.8.8.8 is Google public DNS — should be allowed
      expect(validateWebhookUrl('https://8.8.8.8/hook')).toBe(true);
    });
  });
});
