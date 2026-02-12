/**
 * useOpportunities Hook Unit Tests
 *
 * Tests for opportunity data fetching, analysis mutations,
 * and status update actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOpportunities } from '@client/hooks/useOpportunities';
import type { IOpportunity, OpportunityType } from '@shared/types/opportunity.types';

// =============================================================================
// Mocks
// =============================================================================

const mockApiFetch = vi.fn();
vi.mock('@client/utils/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock('@client/utils/logger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

// =============================================================================
// Helpers
// =============================================================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createMockOpportunity(overrides: Partial<IOpportunity> = {}): IOpportunity {
  return {
    id: 'opp-1',
    project_id: 'proj-1',
    user_id: 'user-1',
    snapshot_id: 'snap-1',
    type: 'content_gap' as OpportunityType,
    category: 'content',
    title: 'Test Opportunity',
    description: 'A test opportunity',
    query: 'test keyword',
    page_url: null,
    metrics: { position: 15, ctr: 0.02, impressions: 500 },
    priority_score: 75,
    estimated_impact: 'high',
    status: 'open',
    action_type: null,
    action_ref_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useOpportunities', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  describe('fetching opportunities', () => {
    it('should return empty array when no projectId is provided', async () => {
      const { result } = renderHook(() => useOpportunities(null), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.opportunities).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch opportunities for a given project', async () => {
      const mockOpportunities = [createMockOpportunity(), createMockOpportunity({ id: 'opp-2' })];

      mockApiFetch.mockResolvedValueOnce({
        data: { opportunities: mockOpportunities, total: 2 },
      });

      // Also mock GSC connections query
      mockApiFetch.mockResolvedValueOnce({
        data: { connections: [{ id: 'conn-1', status: 'active' }] },
      });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.opportunities).toHaveLength(2);
      expect(mockApiFetch).toHaveBeenCalledWith('/api/opportunities?projectId=proj-1', {
        method: 'GET',
      });
    });

    it('should derive lastAnalyzedAt from most recent opportunity', async () => {
      const mockOpportunities = [
        createMockOpportunity({ id: 'opp-1', created_at: '2026-01-01T00:00:00Z' }),
        createMockOpportunity({ id: 'opp-2', created_at: '2026-02-01T00:00:00Z' }),
      ];

      mockApiFetch.mockResolvedValueOnce({
        data: { opportunities: mockOpportunities, total: 2 },
      });
      mockApiFetch.mockResolvedValueOnce({ data: { connections: [] } });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastAnalyzedAt).toBe('2026-02-01T00:00:00Z');
    });

    it('should return null for lastAnalyzedAt when no opportunities', async () => {
      mockApiFetch.mockResolvedValueOnce({ data: { opportunities: [], total: 0 } });
      mockApiFetch.mockResolvedValueOnce({ data: { connections: [] } });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastAnalyzedAt).toBeNull();
    });
  });

  describe('GSC connection status', () => {
    it('should detect active GSC connection', async () => {
      mockApiFetch.mockResolvedValueOnce({ data: { opportunities: [], total: 0 } });
      mockApiFetch.mockResolvedValueOnce({
        data: { connections: [{ id: 'conn-1', status: 'active', project_id: 'proj-1' }] },
      });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.hasGscConnection).toBe(true);
      });
    });

    it('should return false when no active connection exists', async () => {
      mockApiFetch.mockResolvedValueOnce({ data: { opportunities: [], total: 0 } });
      mockApiFetch.mockResolvedValueOnce({
        data: { connections: [{ id: 'conn-1', status: 'disconnected' }] },
      });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGsc).toBe(false);
      });

      expect(result.current.hasGscConnection).toBe(false);
    });

    it('should return false when no connections exist', async () => {
      mockApiFetch.mockResolvedValueOnce({ data: { opportunities: [], total: 0 } });
      mockApiFetch.mockResolvedValueOnce({ data: { connections: [] } });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoadingGsc).toBe(false);
      });

      expect(result.current.hasGscConnection).toBe(false);
    });
  });

  describe('analyzeOpportunities', () => {
    it('should trigger analysis and return response', async () => {
      const analyzeResponse = {
        opportunities: [createMockOpportunity()],
        newCount: 1,
        updatedCount: 0,
      };

      // Initial fetch
      mockApiFetch.mockResolvedValueOnce({ data: { opportunities: [], total: 0 } });
      mockApiFetch.mockResolvedValueOnce({ data: { connections: [{ id: 'c1', status: 'active' }] } });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Analyze
      mockApiFetch.mockResolvedValueOnce({ data: analyzeResponse });

      await act(async () => {
        await result.current.analyzeOpportunities();
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/opportunities/analyze', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'proj-1' }),
      });
    });
  });

  describe('dismissOpportunity', () => {
    it('should update opportunity status to dismissed', async () => {
      const mockOpportunity = createMockOpportunity();

      // Initial fetch
      mockApiFetch.mockResolvedValueOnce({
        data: { opportunities: [mockOpportunity], total: 1 },
      });
      mockApiFetch.mockResolvedValueOnce({ data: { connections: [{ id: 'c1', status: 'active' }] } });

      const { result } = renderHook(() => useOpportunities('proj-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Dismiss
      mockApiFetch.mockResolvedValueOnce({
        data: { opportunity: { ...mockOpportunity, status: 'dismissed' } },
      });

      await act(async () => {
        await result.current.dismissOpportunity('opp-1');
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/opportunities?opportunityId=opp-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dismissed' }),
      });
    });
  });
});
