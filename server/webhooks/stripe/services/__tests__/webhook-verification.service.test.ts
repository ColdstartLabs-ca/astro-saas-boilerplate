/**
 * WebhookVerificationService Tests
 *
 * Verifies that:
 * - Signature verification is always called regardless of ENV value
 * - Missing or placeholder STRIPE_WEBHOOK_SECRET throws a clear config error
 * - A missing stripe-signature header throws an error
 * - A valid signature resolves successfully
 * - isTestMode is derived from event.livemode (not ENV)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Mocks — set up before the module under test is imported
// ---------------------------------------------------------------------------

const constructEventAsyncMock = vi.fn();

// We control STRIPE_WEBHOOK_SECRET via a mutable ref so individual tests can
// override it without reimporting the module.
let mockWebhookSecret: string | undefined = 'whsec_real_secret';

vi.mock('@server/stripe', () => ({
  get stripe() {
    return {
      webhooks: {
        constructEventAsync: constructEventAsyncMock,
      },
    };
  },
  get STRIPE_WEBHOOK_SECRET() {
    return mockWebhookSecret;
  },
}));

// Suppress console noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { WebhookVerificationService } from '../webhook-verification.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: string, signature: string | null = 't=123,v1=abc'): Request {
  const headers: Record<string, string> = {};
  if (signature !== null) {
    headers['stripe-signature'] = signature;
  }
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

function makeFakeEvent(livemode: boolean): Stripe.Event {
  return {
    id: 'evt_test_001',
    object: 'event',
    type: 'customer.subscription.created',
    created: Math.floor(Date.now() / 1000),
    livemode,
    pending_webhooks: 0,
    request: null,
    api_version: '2026-01-28.clover',
    data: { object: {} as Stripe.Subscription },
  } as Stripe.Event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebhookSecret = 'whsec_real_secret';
  });

  describe('STRIPE_WEBHOOK_SECRET validation', () => {
    it('throws a clear config error when STRIPE_WEBHOOK_SECRET is undefined', async () => {
      mockWebhookSecret = undefined;

      await expect(
        WebhookVerificationService.verifyWebhook(makeRequest('{}'))
      ).rejects.toThrow('Webhook secret is not configured');

      // constructEventAsync must NOT have been called — no bypass
      expect(constructEventAsyncMock).not.toHaveBeenCalled();
    });

    it('throws a clear config error when STRIPE_WEBHOOK_SECRET is the placeholder', async () => {
      mockWebhookSecret = 'whsec_test_secret';

      await expect(
        WebhookVerificationService.verifyWebhook(makeRequest('{}'))
      ).rejects.toThrow('Webhook secret is not configured');

      expect(constructEventAsyncMock).not.toHaveBeenCalled();
    });

    it('throws a clear config error when STRIPE_WEBHOOK_SECRET is an empty string', async () => {
      mockWebhookSecret = '';

      await expect(
        WebhookVerificationService.verifyWebhook(makeRequest('{}'))
      ).rejects.toThrow('Webhook secret is not configured');

      expect(constructEventAsyncMock).not.toHaveBeenCalled();
    });
  });

  describe('signature verification is always enforced', () => {
    it('throws when the stripe-signature header is missing', async () => {
      constructEventAsyncMock.mockRejectedValue(new Error('No signatures found'));

      await expect(
        WebhookVerificationService.verifyWebhook(makeRequest('{}', null))
      ).rejects.toThrow('Missing stripe-signature header');

      // constructEventAsync should not be called before the header check
      expect(constructEventAsyncMock).not.toHaveBeenCalled();
    });

    it('always calls constructEventAsync — even when ENV is "test"', async () => {
      // ENV is "test" — signature verification must still be enforced
      vi.stubEnv('ENV', 'test');

      const fakeEvent = makeFakeEvent(false);
      constructEventAsyncMock.mockResolvedValue(fakeEvent);

      const result = await WebhookVerificationService.verifyWebhook(makeRequest('{"foo":1}'));

      // Stripe SDK was called (verification happened)
      expect(constructEventAsyncMock).toHaveBeenCalledOnce();
      expect(constructEventAsyncMock).toHaveBeenCalledWith(
        '{"foo":1}',
        't=123,v1=abc',
        'whsec_real_secret'
      );

      expect(result.event).toEqual(fakeEvent);
      expect(result.isTestMode).toBe(true); // livemode=false → test mode

      vi.unstubAllEnvs();
    });

    it('wraps constructEventAsync rejection in a meaningful error', async () => {
      constructEventAsyncMock.mockRejectedValue(new Error('No signatures found matching'));

      await expect(
        WebhookVerificationService.verifyWebhook(makeRequest('{"bad":"sig"}'))
      ).rejects.toThrow('Webhook signature verification failed: No signatures found matching');

      expect(constructEventAsyncMock).toHaveBeenCalledOnce();
    });
  });

  describe('isTestMode derivation', () => {
    it('sets isTestMode=false when event.livemode is true', async () => {
      const fakeEvent = makeFakeEvent(true);
      constructEventAsyncMock.mockResolvedValue(fakeEvent);

      const result = await WebhookVerificationService.verifyWebhook(makeRequest('{}'));

      expect(result.isTestMode).toBe(false);
    });

    it('sets isTestMode=true when event.livemode is false', async () => {
      const fakeEvent = makeFakeEvent(false);
      constructEventAsyncMock.mockResolvedValue(fakeEvent);

      const result = await WebhookVerificationService.verifyWebhook(makeRequest('{}'));

      expect(result.isTestMode).toBe(true);
    });
  });
});
