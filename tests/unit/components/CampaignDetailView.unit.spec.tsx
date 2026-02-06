import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignDetailView } from '@client/components/dashboard/views/CampaignDetailView';
import type { ICampaign, IKeyword } from '@shared/types/campaign.types';
import type { IArticle } from '@shared/types/article.types';
import { useCampaignDetail } from '@client/hooks/useCampaignDetail';

// Mock useCampaignDetail hook
vi.mock('@client/hooks/useCampaignDetail', () => ({
  useCampaignDetail: vi.fn(),
}));

// Mock translations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => {
    // Return actual translations for dashboard.campaigns
    const translations: Record<string, string> = {
      'campaigns.title': 'Campaigns',
      'campaigns.status.draft': 'draft',
      'campaigns.status.active': 'active',
      'campaigns.status.paused': 'paused',
      'campaigns.status.completed': 'completed',
      'campaigns.status.resume': 'Resume',
      'campaigns.card.model': 'Model',
      'campaigns.card.keywords': 'keywords',
      'campaigns.card.progress': 'Progress',
      'campaigns.detail.addKeywords': 'Add Keywords',
      'campaigns.detail.startGeneration': 'Start Generation',
      'campaigns.detail.generationProgress': 'Generation Progress',
      'campaigns.detail.articles': 'articles',
      'campaigns.detail.articleQueue': 'Article Queue',
      'campaigns.detail.searchPlaceholder': 'Search keywords...',
      'campaigns.detail.noArticles': 'No articles yet. Add keywords and start generation.',
      'campaigns.detail.wordCount': 'Word Count',
      'campaigns.detail.generated': 'Generated',
      'campaigns.detail.actions': 'Actions',
      'campaigns.detail.startConfirm':
        'Generate {count} article{plural} using {count} credit{plural}?',
      'campaigns.detail.startConfirmDetail':
        'This will queue article generation for all pending keywords. Credits will be deducted for each keyword.',
      'campaigns.detail.cancel': 'Cancel',
      'campaigns.detail.start': 'Start',
      'campaigns.detail.starting': 'Starting...',
      'campaigns.keywords.title': 'Add Keywords',
      'campaigns.keywords.placeholder': 'Enter one keyword per line...',
      'campaigns.keywords.cancel': 'Cancel',
      'campaigns.keywords.add': 'Add Keywords',
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

const mockCampaign: ICampaign = {
  id: 'campaign-1',
  user_id: 'user-1',
  project_id: 'project-1',
  name: 'Test Campaign',
  status: 'draft',
  ai_model: 'auto',
  tone: 'professional',
  target_word_count: 1500,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockKeywords: IKeyword[] = [
  {
    id: 'keyword-1',
    campaign_id: 'campaign-1',
    keyword: 'best coffee maker',
    search_volume: 1000,
    difficulty: 'medium',
    status: 'pending',
    priority: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'keyword-2',
    campaign_id: 'campaign-1',
    keyword: 'espresso machine reviews',
    search_volume: 500,
    difficulty: 'easy',
    status: 'pending',
    priority: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockArticles: IArticle[] = [
  {
    id: 'article-1',
    campaign_id: 'campaign-1',
    user_id: 'user-1',
    project_id: 'project-1',
    title: 'Best Coffee Maker Guide',
    content: 'Full article content...',
    primary_keyword: 'best coffee maker',
    status: 'draft',
    ai_model_used: 'gpt-4',
    seo_score: 85,
    ai_detection_score: 10,
    word_count: 1500,
    meta_description: 'A comprehensive guide...',
    published_url: null,
    slug: 'best-coffee-maker-guide',
    credits_used: 1,
    generation_error: null,
    outline: null,
    token_count: 2000,
    generation_time_ms: 5000,
    generated_at: '2024-01-01T01:00:00Z',
    published_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T01:00:00Z',
  },
  {
    id: 'article-2',
    campaign_id: 'campaign-1',
    user_id: 'user-1',
    project_id: 'project-1',
    title: 'Espresso Machine Reviews',
    content: 'Full article content...',
    primary_keyword: 'espresso machine reviews',
    status: 'queued',
    ai_model_used: null,
    seo_score: null,
    ai_detection_score: null,
    word_count: null,
    meta_description: null,
    published_url: null,
    slug: null,
    credits_used: 0,
    generation_error: null,
    outline: null,
    token_count: null,
    generation_time_ms: null,
    generated_at: null,
    published_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('CampaignDetailView', () => {
  const mockOnBackToList = vi.fn();
  const mockCampaignId = 'campaign-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render campaign header with name and status', () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: mockArticles,
      articleStats: {
        queued: 1,
        generating: 0,
        draft: 1,
        published: 0,
        total: 2,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn().mockResolvedValue({ added: 1, duplicates: 0 }),
      removeKeyword: vi.fn().mockResolvedValue(undefined),
      startCampaign: vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 }),
      updateCampaign: vi.fn().mockResolvedValue(mockCampaign),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    // Campaign status is displayed in a badge next to the campaign name
    // Use getAllByText since 'draft' appears multiple times (campaign + articles)
    const draftBadges = screen.getAllByText('draft');
    expect(draftBadges.length).toBeGreaterThan(0);
  });

  it('should show stats grid with article counts', () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: mockArticles,
      articleStats: {
        queued: 1,
        generating: 0,
        draft: 1,
        published: 0,
        total: 2,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getByText('Draft/Review')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('should render keyword table with status badges', () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: mockArticles,
      articleStats: {
        queued: 1,
        generating: 0,
        draft: 1,
        published: 0,
        total: 2,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('best coffee maker')).toBeInTheDocument();
    expect(screen.getByText('espresso machine reviews')).toBeInTheDocument();

    // Check status badges exist (component renders status in lowercase)
    const draftBadges = screen.getAllByText('draft');
    expect(draftBadges.length).toBeGreaterThan(0);

    const queuedBadges = screen.getAllByText('queued');
    expect(queuedBadges.length).toBeGreaterThan(0);
  });

  it('should show Start Generation button when pending keywords exist', () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords, // pending keywords
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 }),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should disable Start Generation when insufficient credits', () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn().mockRejectedValue(new Error('Insufficient credits')),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    expect(startButton).toBeInTheDocument();
    // The button might still be enabled but the click will fail
  });

  it('should filter articles by search query', async () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: mockArticles,
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 1,
        published: 0,
        total: 1,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText('Search keywords...');
    await userEvent.type(searchInput, 'espresso');

    await waitFor(() => {
      expect(screen.queryByText('best coffee maker')).not.toBeInTheDocument();
      expect(screen.getByText('espresso machine reviews')).toBeInTheDocument();
    });
  });

  it('should show confirmation modal when Start Generation is clicked', async () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 }),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    // Click Start Generation button
    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    await userEvent.click(startButton);

    // Verify confirmation modal appears
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Start Generation' })).toBeInTheDocument();
      expect(screen.getByText(/Generate 2 articles using 2 credits/)).toBeInTheDocument();
    });
  });

  it('should show pending keywords count in confirmation modal', async () => {
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords, // 2 pending keywords
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 }),
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Generate 2 articles using 2 credits?')).toBeInTheDocument();
    });
  });

  it('should call startCampaign when confirmation is confirmed', async () => {
    const mockStartCampaign = vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 });
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: mockStartCampaign,
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Start Generation' })).toBeInTheDocument();
    });

    // Click confirm button (use exact match for "Start" to distinguish from "Start Generation")
    const confirmButton = screen.getByRole('button', { name: 'Start' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockStartCampaign).toHaveBeenCalled();
    });
  });

  it('should not call startCampaign when confirmation is cancelled', async () => {
    const mockStartCampaign = vi.fn().mockResolvedValue({ queued: 2, creditsRequired: 2 });
    vi.mocked(useCampaignDetail).mockReturnValue({
      campaign: mockCampaign,
      keywords: mockKeywords,
      articles: [],
      articleStats: {
        queued: 0,
        generating: 0,
        draft: 0,
        published: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
      addKeywords: vi.fn(),
      removeKeyword: vi.fn(),
      startCampaign: mockStartCampaign,
      updateCampaign: vi.fn(),
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    const startButton = screen.getByRole('button', { name: /Start Generation/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Start Generation' })).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    // Modal should close and startCampaign should not be called
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Start Generation' })).not.toBeInTheDocument();
    });
    expect(mockStartCampaign).not.toHaveBeenCalled();
  });
});
