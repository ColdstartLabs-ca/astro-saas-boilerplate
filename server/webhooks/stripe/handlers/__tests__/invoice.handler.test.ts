/**
 * Invoice Handler Tests
 *
 * Tests covering:
 * 1. BUG H12 fix: 'invoice.payment_succeeded' is removed from the webhook router;
 *    only 'invoice.paid' triggers credit allocation.
 * 2. BUG M18 fix: idempotency service failure returns 500 instead of silently
 *    continuing without DB tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Use vi.hoisted so mock functions are available inside vi.mock factories,
// which are hoisted to the top of the compiled output.
// ---------------------------------------------------------------------------
const {
  mockCheckAndClaimEvent,
  mockMarkEventCompleted,
  mockMarkEventFailed,
  mockMarkEventUnrecoverable,
  mockHandleInvoicePaymentSucceeded,
  mockHandleInvoicePaymentFailed,
  mockVerifyWebhook,
} = vi.hoisted(() => ({
  mockCheckAndClaimEvent: vi.fn(),
  mockMarkEventCompleted: vi.fn(),
  mockMarkEventFailed: vi.fn(),
  mockMarkEventUnrecoverable: vi.fn(),
  mockHandleInvoicePaymentSucceeded: vi.fn(),
  mockHandleInvoicePaymentFailed: vi.fn(),
  mockVerifyWebhook: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@server/webhooks/stripe/services/webhook-verification.service', () => ({
  WebhookVerificationService: {
    verifyWebhook: mockVerifyWebhook,
  },
}));

vi.mock('@server/webhooks/stripe/services/idempotency.service', () => ({
  IdempotencyService: {
    checkAndClaimEvent: mockCheckAndClaimEvent,
    markEventCompleted: mockMarkEventCompleted,
    markEventFailed: mockMarkEventFailed,
    markEventUnrecoverable: mockMarkEventUnrecoverable,
  },
}));

vi.mock('@server/webhooks/stripe/handlers/invoice.handler', () => ({
  InvoiceHandler: {
    handleInvoicePaymentSucceeded: mockHandleInvoicePaymentSucceeded,
    handleInvoicePaymentFailed: mockHandleInvoicePaymentFailed,
  },
}));

vi.mock('@server/webhooks/stripe/handlers/payment.handler', () => ({
  PaymentHandler: {
    handleCheckoutSessionCompleted: vi.fn(),
    handleChargeRefunded: vi.fn(),
    handleInvoicePaymentRefunded: vi.fn(),
  },
}));

vi.mock('@server/webhooks/stripe/handlers/subscription.handler', () => ({
  SubscriptionHandler: {
    handleCustomerCreated: vi.fn(),
    handleSubscriptionUpdate: vi.fn(),
    handleSubscriptionDeleted: vi.fn(),
    handleTrialWillEnd: vi.fn(),
    handleSubscriptionScheduleCompleted: vi.fn(),
  },
}));

vi.mock('@server/webhooks/stripe/handlers/dispute.handler', () => ({
  DisputeHandler: {
    handleChargeDisputeCreated: vi.fn(),
    handleChargeDisputeUpdated: vi.fn(),
    handleChargeDisputeClosed: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '../../../../../src/pages/api/webhooks/stripe/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStripeEvent(type: string, id = 'evt_test_123') {
  return {
    id,
    type,
    data: {
      object: {
        id: 'in_test_123',
        customer: 'cus_test_123',
      },
      previous_attributes: null,
    },
  };
}

function makeContext(body: unknown) {
  const request = new Request('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { request, params: {}, props: {} };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stripe webhook router — BUG H12 (invoice.payment_succeeded removed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: idempotency succeeds and event is new
    mockCheckAndClaimEvent.mockResolvedValue({ isNew: true, existingStatus: null });
    mockMarkEventCompleted.mockResolvedValue(undefined);
    mockMarkEventFailed.mockResolvedValue(undefined);
    mockMarkEventUnrecoverable.mockResolvedValue(undefined);
    mockHandleInvoicePaymentSucceeded.mockResolvedValue(undefined);
    mockHandleInvoicePaymentFailed.mockResolvedValue(undefined);
  });

  it('routes invoice.paid to handleInvoicePaymentSucceeded', async () => {
    const event = makeStripeEvent('invoice.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    const response = await POST(makeContext(event) as never);

    expect(response.status).toBe(200);
    expect(mockHandleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
  });

  it('does NOT route invoice.payment_succeeded to handleInvoicePaymentSucceeded', async () => {
    // 'invoice.payment_succeeded' is removed from the switch — it falls to `default`,
    // which calls markEventUnrecoverable and returns 200 with a warning.
    const event = makeStripeEvent('invoice.payment_succeeded');
    mockVerifyWebhook.mockResolvedValue({ event });

    const response = await POST(makeContext(event) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    // Credit handler must NOT have been called
    expect(mockHandleInvoicePaymentSucceeded).not.toHaveBeenCalled();
    // The default branch marks the event as unrecoverable and returns a warning
    expect(mockMarkEventUnrecoverable).toHaveBeenCalledWith(event.id, event.type);
    expect(body).toHaveProperty('warning');
  });

  it('calls handleInvoicePaymentSucceeded exactly once when both invoice.paid and invoice.payment_succeeded arrive', async () => {
    // Stripe always sends both events for the same payment (different event IDs).
    // Only invoice.paid should trigger credit allocation.
    const invoicePaidEvent = makeStripeEvent('invoice.paid', 'evt_paid_001');
    const invoicePaymentSucceededEvent = makeStripeEvent(
      'invoice.payment_succeeded',
      'evt_succeeded_001'
    );

    mockVerifyWebhook
      .mockResolvedValueOnce({ event: invoicePaidEvent })
      .mockResolvedValueOnce({ event: invoicePaymentSucceededEvent });

    await POST(makeContext(invoicePaidEvent) as never);
    await POST(makeContext(invoicePaymentSucceededEvent) as never);

    // Credit handler called exactly once (only for invoice.paid)
    expect(mockHandleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
  });

  it('routes invoice_payment.paid to handleInvoicePaymentSucceeded', async () => {
    const event = makeStripeEvent('invoice_payment.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    const response = await POST(makeContext(event) as never);

    expect(response.status).toBe(200);
    expect(mockHandleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
  });
});

describe('Stripe webhook router — BUG M18 (idempotency failure returns 500)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleInvoicePaymentSucceeded.mockResolvedValue(undefined);
    mockMarkEventCompleted.mockResolvedValue(undefined);
    mockMarkEventFailed.mockResolvedValue(undefined);
    mockMarkEventUnrecoverable.mockResolvedValue(undefined);
  });

  it('returns 500 when idempotency service throws (DB down)', async () => {
    const event = makeStripeEvent('invoice.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    // Simulate DB being down
    mockCheckAndClaimEvent.mockRejectedValue(new Error('Connection refused'));

    const response = await POST(makeContext(event) as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error');
    // Credit handler must NOT have run (no silent fallthrough)
    expect(mockHandleInvoicePaymentSucceeded).not.toHaveBeenCalled();
  });

  it('does NOT process the event when idempotency throws (prevents double-processing)', async () => {
    const event = makeStripeEvent('invoice.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    mockCheckAndClaimEvent.mockRejectedValue(new Error('DB timeout'));

    await POST(makeContext(event) as never);

    // The event must not be processed and must not be marked completed/failed
    expect(mockHandleInvoicePaymentSucceeded).not.toHaveBeenCalled();
    expect(mockMarkEventCompleted).not.toHaveBeenCalled();
    expect(mockMarkEventFailed).not.toHaveBeenCalled();
  });

  it('returns 200 and skips duplicate events when idempotency service is healthy', async () => {
    const event = makeStripeEvent('invoice.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    // Event already processed
    mockCheckAndClaimEvent.mockResolvedValue({ isNew: false, existingStatus: 'completed' });

    const response = await POST(makeContext(event) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(mockHandleInvoicePaymentSucceeded).not.toHaveBeenCalled();
  });

  it('returns 200 and processes new events when idempotency service is healthy', async () => {
    const event = makeStripeEvent('invoice.paid');
    mockVerifyWebhook.mockResolvedValue({ event });

    mockCheckAndClaimEvent.mockResolvedValue({ isNew: true, existingStatus: null });

    const response = await POST(makeContext(event) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockHandleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
    expect(mockMarkEventCompleted).toHaveBeenCalledWith(event.id);
  });
});
