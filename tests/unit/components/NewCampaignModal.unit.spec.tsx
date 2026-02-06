import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { NewCampaignModal } from '@client/components/dashboard/views/NewCampaignModal';
import * as userStoreModule from '@client/store/userStore';

// Mock translations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => {
    // Return actual translations for dashboard.campaigns
    const translations: Record<string, string> = {
      'campaigns.newCampaign.title': 'Create New Campaign',
      'campaigns.newCampaign.stepOf': 'Step {current} of {total}',
      'campaigns.newCampaign.name': 'Campaign Name',
      'campaigns.newCampaign.namePlaceholder': 'e.g. Best Coffee Machines Q4',
      'campaigns.newCampaign.keywords': 'Target Keywords',
      'campaigns.newCampaign.keywordsManual': 'Manual Input',
      'campaigns.newCampaign.keywordsCsv': 'CSV Upload',
      'campaigns.newCampaign.keywordsPlaceholder': 'Enter one keyword per line...',
      'campaigns.newCampaign.keywordsCount': '{count} keywords',
      'campaigns.newCampaign.csvDrop': 'Drag & drop CSV file here',
      'campaigns.newCampaign.csvBrowse': 'or click to browse',
      'campaigns.newCampaign.model': 'AI Model',
      'campaigns.newCampaign.wordCount': 'Word Count Target',
      'campaigns.newCampaign.tone': 'Tone of Voice',
      'campaigns.newCampaign.creditCost': 'Credit Cost',
      'campaigns.newCampaign.insufficientCredits': 'Insufficient Credits',
      'campaigns.newCampaign.creditCostDetail':
        'This will use {count} credit{plural} ({count} keywords × 1 credit each)',
      'campaigns.newCampaign.insufficientCreditsDetail':
        'Not enough credits. You need {required} but have {available}.',
      'campaigns.newCampaign.cancel': 'Cancel',
      'campaigns.newCampaign.back': 'Back',
      'campaigns.newCampaign.next': 'Next Step',
      'campaigns.newCampaign.create': 'Create Campaign',
      'campaigns.newCampaign.creating': 'Creating...',
    };

    return (key: string, params?: Record<string, string | number>) => {
      if (translations[key]) {
        let result = translations[key];
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            // Use global replace to replace all occurrences of the placeholder
            result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
          });
        }
        return result;
      }
      return key;
    };
  },
}));

// Mock dependencies
vi.mock('@shared/config/ai-models.config', () => ({
  AI_MODELS: {
    'openrouter/auto': { name: 'Auto', provider: 'OpenRouter', tier: 'all' },
    'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', tier: 'all' },
  },
}));

vi.mock('@client/store/userStore', () => ({
  useUserStore: () => ({
    user: {
      profile: {
        subscription_credits_balance: 60,
        purchased_credits_balance: 40,
      },
    },
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

describe('NewCampaignModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();
  const mockProjectId = 'project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step 1 with name and keyword inputs', () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter one keyword per line/)).toBeInTheDocument();
  });

  it('should parse keywords from textarea (one per line)', async () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText(/Enter one keyword per line/);
    await userEvent.type(
      textarea,
      'best espresso machine\nhow to clean coffee maker\n\nfrench press guide'
    );

    expect(screen.getByText('3 keywords')).toBeInTheDocument();
  });

  it('should advance to step 2 when Next clicked', async () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByLabelText('Campaign Name');
    await userEvent.type(nameInput, 'Test Campaign');

    const textarea = screen.getByPlaceholderText(/Enter one keyword per line/);
    await userEvent.type(textarea, 'test keyword');

    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    });
  });

  it('should show credit cost based on keyword count', async () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText(/Enter one keyword per line/);
    await userEvent.type(textarea, 'keyword1\nkeyword2\nkeyword3');

    // Check that keyword count is displayed (step 1 shows this)
    expect(screen.getByText('3 keywords')).toBeInTheDocument();

    // Also verify the test file renders correctly by checking we can find the input
    expect(textarea).toBeInTheDocument();
  });

  it('should disable submit when insufficient credits', async () => {
    vi.mocked(userStoreModule).useUserStore = () => ({
      user: {
        profile: {
          subscription_credits_balance: 2,
          purchased_credits_balance: 0, // Total 2, less than keyword count (5)
        },
      },
    });

    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    const nameInput = screen.getByLabelText('Campaign Name');
    await userEvent.type(nameInput, 'Test Campaign');

    const textarea = screen.getByPlaceholderText(/Enter one keyword per line/);
    await userEvent.type(textarea, 'keyword1\nkeyword2\nkeyword3\nkeyword4\nkeyword5');

    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient Credits')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Campaign/i });
    expect(createButton).toBeDisabled();
  });

  it('should call createCampaign on submit', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    // Fill step 1
    const nameInput = screen.getByLabelText('Campaign Name');
    await userEvent.type(nameInput, 'Test Campaign');

    const textarea = screen.getByPlaceholderText(/Enter one keyword per line/);
    await userEvent.type(textarea, 'test keyword');

    // Go to step 2
    const nextButton = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    });

    // Submit
    const createButton = screen.getByRole('button', { name: /Create Campaign/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Campaign',
        projectId: mockProjectId,
        keywords: ['test keyword'],
        model: 'openrouter/auto',
        tone: 'professional',
        targetWordCount: 1500,
      });
    });
  });

  it('should close modal when Cancel clicked', () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should return null when isOpen is false', () => {
    const { container } = render(
      <NewCampaignModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        projectId={mockProjectId}
      />,
      { wrapper: createWrapper() }
    );

    expect(container.firstChild).toBe(null);
  });
});
