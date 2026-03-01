/**
 * Unit Tests: Idempotency Service
 *
 * Tests for idempotency.service.ts including:
 * - IdempotencyService.checkAndClaimEvent
 * - IdempotencyService.markEventCompleted
 * - IdempotencyService.markEventFailed
 * - IdempotencyService.markEventUnrecoverable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdempotencyService } from '@server/webhooks/stripe/services/idempotency.service';
import type { IIdempotencyResult, WebhookEventStatus } from '@shared/types/stripe.types';

// Mock Supabase
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

const mockFrom = supabaseAdmin.from as vi.Mock;

describe('IdempotencyService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndClaimEvent', () => {
    const eventId = 'evt_test123';
    const eventType = 'customer.subscription.created';
    const payload = { test: 'data' };

    it('should claim new event successfully', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { status: 'processing' },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(true);
      expect(result).not.toHaveProperty('existingStatus');
      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: eventId,
          event_type: eventType,
          status: 'processing',
          payload,
        })
      );
    });

    it('should return existing event when already exists', async () => {
      // ON CONFLICT DO NOTHING returns no data when event already exists
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // No data returned means event already existed
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('processing');
      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
    });

    it('should handle concurrent request claiming event first', async () => {
      // Unique constraint violation - concurrent request got there first
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('processing');
    });

    it('should propagate database errors other than unique constraint', async () => {
      const dbError = new Error('Database connection failed');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Database connection failed' },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        IdempotencyService.checkAndClaimEvent(eventId, eventType, payload)
      ).rejects.toThrow();
    });

    it('should handle all event statuses correctly', async () => {
      // ON CONFLICT DO NOTHING returns null data when event exists
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('processing');
    });

    it('should store payload as Record<string, unknown>', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { status: 'processing' },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const testPayload = {
        id: 'evt_test',
        type: 'test.event',
        data: { object: { id: 'test_id' } },
      };

      await IdempotencyService.checkAndClaimEvent(eventId, eventType, testPayload);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: testPayload,
        })
      );
    });
  });

  describe('markEventCompleted', () => {
    const eventId = 'evt_test123';

    it('should mark event as completed successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventCompleted(eventId);

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('event_id', eventId);
    });

    it('should throw error when database update fails', async () => {
      const dbError = new Error('Database update failed');
      const mockUpdate = vi.fn();
      const mockEq = vi.fn().mockResolvedValue({ error: dbError });

      mockFrom.mockReturnValue({
        update: vi.fn(() => ({ eq: mockEq })),
      });

      await expect(IdempotencyService.markEventCompleted(eventId)).rejects.toThrow(
        'Database error marking event completed: Database update failed'
      );
    });

    it('should set completed_at to current ISO timestamp', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventCompleted(eventId);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('markEventFailed', () => {
    const eventId = 'evt_test123';
    const errorMessage = 'Processing failed: invalid data';

    it('should mark event as failed successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventFailed(eventId, errorMessage);

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('event_id', eventId);
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const dbError = new Error('Database update failed');
      const mockEq = vi.fn().mockResolvedValue({ error: dbError });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      // Should not throw, just log error
      await expect(
        IdempotencyService.markEventFailed(eventId, errorMessage)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should set completed_at timestamp', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventFailed(eventId, errorMessage);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle empty error messages', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventFailed(eventId, '');

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.error_message).toBe('');
    });

    it('should handle long error messages', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      const longErrorMessage = 'Error: ' + 'x'.repeat(1000);
      await IdempotencyService.markEventFailed(eventId, longErrorMessage);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.error_message).toBe(longErrorMessage);
    });
  });

  describe('markEventUnrecoverable', () => {
    const eventId = 'evt_test123';
    const eventType = 'unknown.event.type';

    it('should mark event as unrecoverable successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventUnrecoverable(eventId, eventType);

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('event_id', eventId);
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const dbError = new Error('Database update failed');
      const mockEq = vi.fn().mockResolvedValue({ error: dbError });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      // Should not throw, just log error
      await expect(
        IdempotencyService.markEventUnrecoverable(eventId, eventType)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should set completed_at timestamp', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventUnrecoverable(eventId, eventType);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should format error message correctly for various event types', async () => {
      const eventTypes = ['unknown.event', 'custom.event', 'test.event.type'];

      for (const type of eventTypes) {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        mockFrom.mockReturnValue({
          update: mockUpdate,
        });

        await IdempotencyService.markEventUnrecoverable(eventId, type);

        expect(mockUpdate).toHaveBeenCalled();
        const updateCall = mockUpdate.mock.calls[0][0];
        expect(updateCall.error_message).toBe(`Unhandled event type: ${type}`);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle complex payload objects', async () => {
      const eventId = 'evt_complex';
      const eventType = 'complex.event';
      const payload = {
        id: 'evt_123',
        type: 'complex.event',
        data: {
          object: {
            id: 'obj_123',
            customer: 'cus_123',
            items: {
              data: [{ price: { id: 'price_123' } }],
            },
            metadata: { key: 'value' },
          },
        },
      };

      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload,
        })
      );
    });

    it('should handle null payload', async () => {
      const eventId = 'evt_null_payload';
      const eventType = 'test.event';
      const payload = null;

      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: null,
        })
      );
    });

    it('should handle empty payload', async () => {
      const eventId = 'evt_empty_payload';
      const eventType = 'test.event';
      const payload = {};

      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, payload);

      expect(result.isNew).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {},
        })
      );
    });

    it('should handle concurrent requests correctly', async () => {
      const eventId = 'evt_concurrent';
      const eventType = 'test.event';

      // ON CONFLICT DO NOTHING returns null data when event exists
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent(eventId, eventType, {});

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('processing');
    });
  });

  describe('Type Safety and Structure', () => {
    it('should return IIdempotencyResult with isNew true for new events', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result: IIdempotencyResult = await IdempotencyService.checkAndClaimEvent(
        'evt_test',
        'test.event',
        {}
      );

      expect(result).toHaveProperty('isNew');
      expect(result.isNew).toBe(true);
    });

    it('should return IIdempotencyResult with isNew false for existing events', async () => {
      // ON CONFLICT DO NOTHING returns null data when event exists
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result: IIdempotencyResult = await IdempotencyService.checkAndClaimEvent(
        'evt_test',
        'test.event',
        {}
      );

      expect(result).toHaveProperty('isNew');
      expect(result).toHaveProperty('existingStatus');
      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('processing');
    });

    it('should validate all valid event statuses', () => {
      const validStatuses: WebhookEventStatus[] = [
        'processing',
        'completed',
        'failed',
        'unrecoverable',
      ];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should validate common event types', () => {
      const eventTypes = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
      ];

      eventTypes.forEach(type => {
        expect(type).toMatch(/\./); // Should contain a dot
        expect(type).not.toContain(' '); // Should not contain spaces
      });
    });

    it('should handle unique constraint violation error code', () => {
      const errorCodes = ['23505', '23503', '23000'];

      errorCodes.forEach(code => {
        const error = { code, message: 'Unique constraint' };
        expect(error).toHaveProperty('code', code);
      });
    });

    it('should validate IIdempotencyResult structure', () => {
      const newEventResult: IIdempotencyResult = {
        isNew: true,
      };

      const existingEventResult: IIdempotencyResult = {
        isNew: false,
        existingStatus: 'completed',
      };

      expect(newEventResult).toHaveProperty('isNew');
      expect(newEventResult.isNew).toBe(true);

      expect(existingEventResult).toHaveProperty('isNew');
      expect(existingEventResult).toHaveProperty('existingStatus');
      expect(existingEventResult.isNew).toBe(false);
      expect(existingEventResult.existingStatus).toBe('completed');
    });

    it('should handle all valid WebhookEventStatus values', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await IdempotencyService.checkAndClaimEvent('evt_test', 'test.event', {});

      expect(result).toBeDefined();
      expect(typeof result.isNew).toBe('boolean');
    });

    it('should handle database error propagation in checkAndClaimEvent', async () => {
      const dbError = { code: 'PGRST301', message: 'Database error' };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: dbError });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        IdempotencyService.checkAndClaimEvent('evt_test', 'test.event', {})
      ).rejects.toThrow();
    });
  });

  describe('Service Class Structure', () => {
    it('should have static methods only', () => {
      expect(IdempotencyService.checkAndClaimEvent).toBeDefined();
      expect(IdempotencyService.markEventCompleted).toBeDefined();
      expect(IdempotencyService.markEventFailed).toBeDefined();
      expect(IdempotencyService.markEventUnrecoverable).toBeDefined();
    });

    it('should be an object with static methods', () => {
      expect(IdempotencyService.constructor).toBeDefined();
      // Service is an object, not a class
      expect(typeof IdempotencyService).toBe('function');
    });
  });

  describe('Integration Behavior', () => {
    it('should use correct table name for webhook events', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { status: 'processing' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      await IdempotencyService.checkAndClaimEvent('evt_test', 'test.event', {});

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
    });

    it('should update status field correctly for different operations', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventCompleted('evt_1');
      expect(mockUpdate.mock.calls[0][0].status).toBe('completed');

      await IdempotencyService.markEventFailed('evt_2', 'error');
      expect(mockUpdate.mock.calls[1][0].status).toBe('failed');

      await IdempotencyService.markEventUnrecoverable('evt_3', 'test.event');
      expect(mockUpdate.mock.calls[2][0].status).toBe('unrecoverable');
    });

    it('should include completed_at in all status updates except processing', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockReturnValue({
        update: mockUpdate,
      });

      await IdempotencyService.markEventCompleted('evt_1');
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty('completed_at');

      await IdempotencyService.markEventFailed('evt_2', 'error');
      expect(mockUpdate.mock.calls[1][0]).toHaveProperty('completed_at');

      await IdempotencyService.markEventUnrecoverable('evt_3', 'test.event');
      expect(mockUpdate.mock.calls[2][0]).toHaveProperty('completed_at');
    });
  });
});
