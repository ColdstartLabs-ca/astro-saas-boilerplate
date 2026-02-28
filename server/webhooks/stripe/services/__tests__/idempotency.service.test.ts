/**
 * IdempotencyService Tests
 *
 * Verifies that:
 * - Concurrent calls with the same event ID result in only one being processed
 * - markEventCompleted updates status to 'completed'
 * - markEventFailed updates status to 'failed'
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory store shared across the mock (module-level, accessed in factory)
// ---------------------------------------------------------------------------

// Must be declared with `let` outside the factory so it can be reset in beforeEach.
// We cannot use `const` here because vi.mock factories are hoisted — the key constraint
// is that the factory itself must not reference un-hoisted bindings. We expose the
// store via a module-scoped variable and use a getter approach.

const _store: Map<string, Record<string, unknown>> = new Map();

// Build a fresh Supabase-like query builder for a single chain
function buildQueryBuilder(store: Map<string, Record<string, unknown>>) {
  return {
    _insertRow: null as Record<string, unknown> | null,
    _updateData: null as Record<string, unknown> | null,
    _eqCol: null as string | null,
    _eqVal: null as unknown,

    insert(row: Record<string, unknown>) {
      this._insertRow = row;
      return this;
    },

    update(data: Record<string, unknown>) {
      this._updateData = data;
      return this;
    },

    eq(col: string, val: unknown) {
      this._eqCol = col;
      this._eqVal = val;
      return this;
    },

    select(_cols?: string) {
      return this;
    },

    async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
      if (this._insertRow) {
        const keyVal = this._insertRow['event_id'] as string;

        if (store.has(keyVal)) {
          // Simulate ON CONFLICT DO NOTHING — no row returned, no error
          return { data: null, error: null };
        }

        store.set(keyVal, { ...this._insertRow });
        return { data: { status: this._insertRow.status }, error: null };
      }

      if (this._eqCol && this._eqVal !== null) {
        const found = [...store.values()].find((row) => row[this._eqCol!] === this._eqVal);
        return { data: found ?? null, error: null };
      }

      return { data: null, error: null };
    },

    // Thenable for .update().eq() chains that don't call .maybeSingle()
    then(
      resolve: (v: { error: null }) => void,
      _reject?: (e: unknown) => void
    ) {
      if (this._updateData && this._eqCol && this._eqVal !== null) {
        for (const row of store.values()) {
          if (row[this._eqCol!] === this._eqVal) {
            Object.assign(row, this._updateData);
          }
        }
      }
      resolve({ error: null });
    },
  };
}

// ---------------------------------------------------------------------------
// Mock — factory cannot reference hoisted-away bindings by name, so we
// access the module-level _store directly (it IS accessible in the factory
// because it's defined before vi.mock in the source, even after hoisting,
// thanks to var-like closure semantics of module scope in Vitest's transform).
// ---------------------------------------------------------------------------

vi.mock('@server/supabase/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      from: (_table: string) => buildQueryBuilder(_store),
    },
  };
});

// Import after mocks
import { IdempotencyService } from '../idempotency.service';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IdempotencyService', () => {
  beforeEach(() => {
    _store.clear();
  });

  describe('checkAndClaimEvent', () => {
    it('returns isNew=true when the event is seen for the first time', async () => {
      const result = await IdempotencyService.checkAndClaimEvent(
        'evt_unique_001',
        'customer.subscription.created',
        { foo: 'bar' }
      );

      expect(result.isNew).toBe(true);
      expect(result.existingStatus).toBeUndefined();
    });

    it('returns isNew=false when the same event ID is submitted a second time', async () => {
      // First call — claims the event
      await IdempotencyService.checkAndClaimEvent(
        'evt_dup_002',
        'customer.subscription.created',
        {}
      );

      // Second call — same event ID
      const second = await IdempotencyService.checkAndClaimEvent(
        'evt_dup_002',
        'customer.subscription.created',
        {}
      );

      expect(second.isNew).toBe(false);
      expect(second.existingStatus).toBe('processing');
    });

    it('handles concurrent calls — only one succeeds as new', async () => {
      const eventId = 'evt_concurrent_003';

      // Simulate two concurrent calls by running them in parallel
      const [first, second] = await Promise.all([
        IdempotencyService.checkAndClaimEvent(eventId, 'invoice.payment_succeeded', {}),
        IdempotencyService.checkAndClaimEvent(eventId, 'invoice.payment_succeeded', {}),
      ]);

      const newCount = [first, second].filter((r) => r.isNew).length;
      const alreadyProcessedCount = [first, second].filter((r) => !r.isNew).length;

      // Exactly one caller wins; the other is rejected as already-processed
      expect(newCount).toBe(1);
      expect(alreadyProcessedCount).toBe(1);
    });

    it('propagates unexpected database errors', async () => {
      // Override the mock for this specific test to return an unexpected DB error
      const unexpectedError = { code: '42P01', message: 'relation does not exist' };

      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
      vi.spyOn(supabaseAdmin, 'from').mockReturnValueOnce({
        insert: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: null, error: unexpectedError }),
          }),
        }),
      } as unknown as ReturnType<typeof supabaseAdmin.from>);

      await expect(
        IdempotencyService.checkAndClaimEvent('evt_err_004', 'some.event', {})
      ).rejects.toEqual(unexpectedError);
    });
  });

  describe('markEventCompleted', () => {
    it('updates event status to completed without throwing', async () => {
      // Pre-populate the store
      _store.set('evt_complete_005', {
        event_id: 'evt_complete_005',
        status: 'processing',
      });

      await expect(
        IdempotencyService.markEventCompleted('evt_complete_005')
      ).resolves.toBeUndefined();

      expect(_store.get('evt_complete_005')?.status).toBe('completed');
    });
  });

  describe('markEventFailed', () => {
    it('updates event status to failed without throwing', async () => {
      _store.set('evt_fail_006', {
        event_id: 'evt_fail_006',
        status: 'processing',
      });

      await expect(
        IdempotencyService.markEventFailed('evt_fail_006', 'Something went wrong')
      ).resolves.toBeUndefined();

      expect(_store.get('evt_fail_006')?.status).toBe('failed');
      expect(_store.get('evt_fail_006')?.error_message).toBe('Something went wrong');
    });
  });
});
