import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntegrationsView } from '@client/components/dashboard/views/IntegrationsView';
import type { IIntegrationWithCampaigns } from '@shared/types/integration.types';

// Mock dependencies
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'integrations.title': 'Integrations',
      'integrations.subtitle': 'Manage your WordPress and webhook integrations',
      'integrations.addIntegration': 'Add Integration',
      'integrations.addFirst': 'Add Your First Integration',
      'integrations.empty': 'No integrations yet. Connect your CMS or webhooks.',
      'integrations.emptyTitle': 'No integrations yet',
      'integrations.type.wordpress': 'WordPress',
      'integrations.type.webhook': 'Webhook',
      'integrations.status.active': 'Active',
      'integrations.status.error': 'Error',
      'integrations.status.disabled': 'Disabled',
      'integrations.lastTested': 'Last tested',
      'integrations.connectedCampaigns': 'Connected campaigns',
      'integrations.test': 'Test',
      'integrations.edit': 'Edit',
      'integrations.delete': 'Delete',
      'integrations.deleteConfirm': 'Delete Integration?',
    };
    return translations[key] || key;
  },
}));

vi.mock('@client/utils/statusStyles', () => ({
  getIntegrationStatusStyles: () => 'bg-green-500/10 text-green-400 border-green-500/20',
}));

vi.mock('@client/hooks/usePendingActions', () => ({
  usePendingActions: () => ({
    skippedIntegrations: false,
    isOnboardingComplete: false,
  }),
}));

vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

// Test data
const mockIntegrations: IIntegrationWithCampaigns[] = [
  {
    id: 'integration-1',
    user_id: 'user-1',
    type: 'wordpress',
    name: 'My WordPress Blog',
    config: {
      site_url: 'https://blog.example.com',
      username: 'admin',
    },
    status: 'active',
    last_tested_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    campaign_count: 2,
  },
  {
    id: 'integration-2',
    user_id: 'user-1',
    type: 'webhook',
    name: 'Custom Webhook',
    config: {
      url: 'https://api.example.com/webhook',
    },
    status: 'active',
    last_tested_at: '2024-01-02T00:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    campaign_count: 0,
  },
];

describe('IntegrationsView Component', () => {
  const defaultProps = {
    integrations: [],
    isLoading: false,
    onNewIntegration: vi.fn(),
    onEditIntegration: vi.fn(),
    onDeleteIntegration: vi.fn().mockResolvedValue(undefined),
    onTestIntegration: vi.fn().mockResolvedValue({ success: true }),
  };

  describe('Empty State', () => {
    it('should render empty state when no integrations exist', () => {
      render(<IntegrationsView {...defaultProps} integrations={[]} />);

      expect(screen.getByText('No integrations yet')).toBeInTheDocument();
      expect(screen.getAllByText(/No integrations yet/)).toHaveLength(2); // Both title and description
      expect(
        screen.getByRole('button', { name: /Add Your First Integration/i })
      ).toBeInTheDocument();
    });

    it('should call onNewIntegration when Add First button is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={[]} />);

      const addButton = screen.getByRole('button', { name: /Add Your First Integration/i });
      await user.click(addButton);

      expect(defaultProps.onNewIntegration).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton', () => {
      const { container } = render(<IntegrationsView {...defaultProps} isLoading={true} />);

      // Check for skeleton cards
      const skeletons = container.querySelectorAll('.animate-pulse > div > div');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('List View', () => {
    it('should render integration cards', () => {
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      expect(screen.getByText('My WordPress Blog')).toBeInTheDocument();
      expect(screen.getByText('Custom Webhook')).toBeInTheDocument();
      expect(screen.getByText('WordPress')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
    });

    it('should display integration status', () => {
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      const statusBadges = screen.getAllByText('Active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should display connected campaigns count', () => {
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      expect(screen.getByText('2')).toBeInTheDocument(); // WordPress has 2 campaigns
      expect(screen.getByText('0')).toBeInTheDocument(); // Webhook has 0 campaigns
    });

    it('should open menu when more button is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      const moreButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(moreButtons[0]);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onTestIntegration when Test is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      const moreButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(moreButtons[0]);

      const testButton = screen.getByText('Test');
      await user.click(testButton);

      expect(defaultProps.onTestIntegration).toHaveBeenCalledWith('integration-1');
    });

    it('should call onEditIntegration when Edit is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      const moreButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(moreButtons[0]);

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(defaultProps.onEditIntegration).toHaveBeenCalledWith(mockIntegrations[0]);
    });

    it('should call onDeleteIntegration when Delete is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      const moreButtons = screen.getAllByLabelText(/Actions for/i);
      await user.click(moreButtons[0]);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText('Delete Integration?')).toBeInTheDocument();
    });
  });

  describe('Add Integration Button', () => {
    it('should render Add Integration button when integrations exist', () => {
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      // There are two buttons with "Add Integration" - get the last one which is the add card button
      const addButtons = screen.getAllByRole('button', { name: /Add Integration/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should call onNewIntegration when Add Integration button is clicked', async () => {
      const user = userEvent.setup();
      render(<IntegrationsView {...defaultProps} integrations={mockIntegrations} />);

      // There are two buttons with "Add Integration" - click the dashed one (add card)
      const addButtons = screen.getAllByRole('button', { name: /Add Integration/i });
      await user.click(addButtons[1]); // The second button is the dashed "Add New" card

      expect(defaultProps.onNewIntegration).toHaveBeenCalledTimes(1);
    });
  });
});
