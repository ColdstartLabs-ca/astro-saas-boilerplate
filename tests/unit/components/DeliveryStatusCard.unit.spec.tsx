import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeliveryStatusCard } from '@client/components/dashboard/views/articles/DeliveryStatusCard';
import type { IIntegrationDeliveryWithDetails } from '@shared/types/integration.types';

const mockT = (key: string) => key;

const makeDelivery = (
  overrides: Partial<IIntegrationDeliveryWithDetails> = {}
): IIntegrationDeliveryWithDetails => ({
  id: 'del-1',
  article_id: 'art-1',
  integration_id: 'int-1',
  campaign_id: 'camp-1',
  status: 'delivered',
  external_id: 'wp-123',
  external_url: 'https://blog.example.com/test-post',
  error: null,
  attempt_count: 1,
  delivered_at: '2026-02-10T12:00:00Z',
  created_at: '2026-02-10T11:00:00Z',
  integration: { id: 'int-1', name: 'My WordPress', type: 'wordpress', status: 'active' },
  ...overrides,
});

describe('DeliveryStatusCard', () => {
  it('should render nothing when no deliveries', () => {
    const { container } = render(
      <DeliveryStatusCard
        deliveries={[]}
        isLoading={false}
        retryingId={null}
        onRetry={vi.fn()}
        t={mockT}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should show loading state', () => {
    render(
      <DeliveryStatusCard
        deliveries={[]}
        isLoading={true}
        retryingId={null}
        onRetry={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('Loading delivery status...')).toBeInTheDocument();
  });

  it('should show delivered status with external link', () => {
    render(
      <DeliveryStatusCard
        deliveries={[makeDelivery()]}
        isLoading={false}
        retryingId={null}
        onRetry={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('My WordPress')).toBeInTheDocument();
    const link = screen.getByTitle('integrations.viewExternal');
    expect(link).toHaveAttribute('href', 'https://blog.example.com/test-post');
  });

  it('should show retry button for failed deliveries', () => {
    render(
      <DeliveryStatusCard
        deliveries={[
          makeDelivery({ status: 'failed', error: 'Connection timeout', external_url: null }),
        ]}
        isLoading={false}
        retryingId={null}
        onRetry={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    expect(screen.getByText('integrations.retryDelivery')).toBeInTheDocument();
  });

  it('should show error message for failed delivery', () => {
    render(
      <DeliveryStatusCard
        deliveries={[
          makeDelivery({ status: 'failed', error: 'WordPress returned 401', external_url: null }),
        ]}
        isLoading={false}
        retryingId={null}
        onRetry={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('WordPress returned 401')).toBeInTheDocument();
  });
});
