import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignIntegrationsSection } from '@client/components/dashboard/views/campaign-detail/CampaignIntegrationsSection';

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock('@client/utils/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const createWrapper = function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  Wrapper.displayName = 'Wrapper';

  return Wrapper;
};

const mockT = (key: string) => key;

describe('CampaignIntegrationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<CampaignIntegrationsSection campaignId="camp-1" t={mockT} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('should render empty state when no integrations assigned', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: { integrations: [], autoPublish: false } })
      .mockResolvedValueOnce({ data: { integrations: [] } });

    render(<CampaignIntegrationsSection campaignId="camp-1" t={mockT} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('integrations.noAssigned')).toBeInTheDocument();
    });
  });

  it('should render assigned integration chips', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: {
          integrations: [
            {
              id: 'ci-1',
              campaign_id: 'camp-1',
              integration_id: 'int-1',
              enabled: true,
              created_at: '2026-01-01',
              integration: { id: 'int-1', name: 'My Blog', type: 'wordpress', status: 'active' },
            },
          ],
          autoPublish: false,
        },
      })
      .mockResolvedValueOnce({ data: { integrations: [] } });

    render(<CampaignIntegrationsSection campaignId="camp-1" t={mockT} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('My Blog')).toBeInTheDocument();
    });
  });

  it('should show auto-publish toggle', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: { integrations: [], autoPublish: true } })
      .mockResolvedValueOnce({ data: { integrations: [] } });

    render(<CampaignIntegrationsSection campaignId="camp-1" t={mockT} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('integrations.autoPublish')).toBeInTheDocument();
      expect(screen.getByText('integrations.autoPublishDescription')).toBeInTheDocument();
    });
  });
});
