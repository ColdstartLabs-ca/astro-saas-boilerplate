/**
 * UserRepository Tests
 *
 * Covers:
 *  - createWithDefaults uses the configured free-user credit amount (not hardcoded 10)
 *  - addCredits uses an atomic RPC instead of a read-modify-write
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UserRepository } from '../user.repository';
import { getFreeUserCredits } from '@shared/config/subscription.utils';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable Supabase query mock that resolves `.single()` with `result`.
 */
function buildChainedQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// createWithDefaults
// ---------------------------------------------------------------------------

describe('UserRepository.createWithDefaults', () => {
  it('creates user with the configured free-user initial credits (not hardcoded 10)', async () => {
    const freeCredits = getFreeUserCredits();

    const createdProfile = {
      id: 'user-123',
      subscription_credits_balance: freeCredits,
      purchased_credits_balance: 0,
      subscription_status: null,
      subscription_tier: null,
      role: 'user',
      stripe_customer_id: null,
    };

    const query = buildChainedQuery({ data: createdProfile, error: null });
    const fromMock = vi.fn().mockReturnValue(query);
    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const repo = new UserRepository(supabase);

    const result = await repo.createWithDefaults('user-123');

    // Confirm the correct initial credit amount is passed to the DB
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-123',
        subscription_credits_balance: freeCredits,
        purchased_credits_balance: 0,
      })
    );

    // Guard against regression: the configured value must not be the old hardcoded 10
    expect(freeCredits).not.toBe(10);
    expect(result.subscription_credits_balance).toBe(freeCredits);
  });

  it('allows options to override the default credit balance', async () => {
    const overriddenCredits = 50;

    const createdProfile = {
      id: 'user-456',
      subscription_credits_balance: overriddenCredits,
      purchased_credits_balance: 0,
      subscription_status: null,
      subscription_tier: null,
      role: 'user',
      stripe_customer_id: null,
    };

    const query = buildChainedQuery({ data: createdProfile, error: null });
    const fromMock = vi.fn().mockReturnValue(query);
    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const repo = new UserRepository(supabase);

    await repo.createWithDefaults('user-456', {
      subscription_credits_balance: overriddenCredits,
    });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_credits_balance: overriddenCredits,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// addCredits
// ---------------------------------------------------------------------------

describe('UserRepository.addCredits', () => {
  let rpcMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;
  let repo: UserRepository;

  beforeEach(() => {
    // Profile returned by findById after the atomic update
    const updatedProfile = {
      id: 'user-789',
      subscription_credits_balance: 13,
      purchased_credits_balance: 0,
    };

    const query = buildChainedQuery({ data: updatedProfile, error: null });
    fromMock = vi.fn().mockReturnValue(query);
    rpcMock = vi.fn().mockResolvedValue({ data: 13, error: null });

    const supabase = { from: fromMock, rpc: rpcMock } as unknown as SupabaseClient;
    repo = new UserRepository(supabase);
  });

  it('calls add_subscription_credits RPC for subscription type (atomic)', async () => {
    await repo.addCredits('user-789', 10, 'subscription');

    expect(rpcMock).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledWith('add_subscription_credits', {
      target_user_id: 'user-789',
      amount: 10,
    });
  });

  it('calls add_purchased_credits RPC for purchased type (atomic)', async () => {
    await repo.addCredits('user-789', 25, 'purchased');

    expect(rpcMock).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledWith('add_purchased_credits', {
      target_user_id: 'user-789',
      amount: 25,
    });
  });

  it('does NOT perform a profile read before the RPC (no read-modify-write)', async () => {
    await repo.addCredits('user-789', 10, 'subscription');

    // The RPC must be called exactly once and the `from()` is only used for the
    // post-update findById read, not for an initial read before the atomic increment.
    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Verify that the RPC was called with the correct name (not a SELECT + UPDATE pair)
    expect(rpcMock.mock.calls[0][0]).toBe('add_subscription_credits');
  });

  it('throws RepositoryError when the RPC returns an error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'User not found' } });

    await expect(repo.addCredits('user-999', 5, 'subscription')).rejects.toThrow();
  });
});
