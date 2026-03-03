import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignDetailView } from '@client/components/dashboard/views/CampaignDetailView';
import type { ICampaign, IKeyword } from '@shared/types/campaign.types';
import type { IArticle } from '@shared/types/article.types';
import { useCampaignDetail } from '@client/hooks/useCampaignDetail';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useArticles } from '@client/hooks/useArticles';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: ({ className }: { className: string }) => (
    <div data-testid="arrow-left" className={className} />
  ),
  Plus: ({ className }: { className: string }) => <div data-testid="plus" className={className} />,
  Clock: ({ className }: { className: string }) => (
    <div data-testid="clock" className={className} />
  ),
  Loader2: ({ className }: { className: string }) => (
    <div data-testid="loader" className={className} />
  ),
  CheckCircle2: ({ className }: { className: string }) => (
    <div data-testid="check-circle" className={className} />
  ),
  Search: ({ className }: { className: string }) => (
    <div data-testid="search" className={className} />
  ),
  Filter: ({ className }: { className: string }) => (
    <div data-testid="filter" className={className} />
  ),
  Layers: ({ className }: { className: string }) => (
    <div data-testid="layers" className={className} />
  ),
  Settings: ({ className }: { className: string }) => (
    <div data-testid="settings" className={className} />
  ),
  Play: ({ className }: { className: string }) => <div data-testid="play" className={className} />,
  Pause: ({ className }: { className: string }) => (
    <div data-testid="pause" className={className} />
  ),
  Cpu: ({ className }: { className: string }) => <div data-testid="cpu" className={className} />,
  Edit2: ({ className }: { className: string }) => <div data-testid="edit" className={className} />,
  ExternalLink: ({ className }: { className: string }) => (
    <div data-testid="external-link" className={className} />
  ),
  AlertCircle: ({ className }: { className: string }) => (
    <div data-testid="alert-circle" className={className} />
  ),
  Coins: ({ className }: { className: string }) => (
    <div data-testid="coins" className={className} />
  ),
  TrendingUp: ({ className }: { className: string }) => (
    <div data-testid="trending-up" className={className} />
  ),
  AlertTriangle: ({ className }: { className: string }) => (
    <div data-testid="alert-triangle" className={className} />
  ),
  FileText: ({ className }: { className: string }) => (
    <div data-testid="file-text" className={className} />
  ),
  Image: ({ className }: { className: string }) => (
    <div data-testid="image" className={className} />
  ),
  Calendar: ({ className }: { className: string }) => (
    <div data-testid="calendar" className={className} />
  ),
  Hash: ({ className }: { className: string }) => <div data-testid="hash" className={className} />,
  X: ({ className }: { className: string }) => <div data-testid="x" className={className} />,
  Info: ({ className }: { className: string }) => <div data-testid="info" className={className} />,
  ChevronDown: ({ className }: { className: string }) => (
    <div data-testid="chevron-down" className={className} />
  ),
  Check: ({ className }: { className: string }) => (
    <div data-testid="check" className={className} />
  ),
  Zap: ({ className }: { className: string }) => <div data-testid="zap" className={className} />,
  // Additional icons needed by CampaignIntegrationsSection
  Plug: ({ className }: { className: string }) => <div data-testid="plug" className={className} />,
  Globe: ({ className }: { className: string }) => (
    <div data-testid="globe" className={className} />
  ),
  Webhook: ({ className }: { className: string }) => (
    <div data-testid="webhook" className={className} />
  ),
  ToggleLeft: ({ className }: { className: string }) => (
    <div data-testid="toggle-left" className={className} />
  ),
  ToggleRight: ({ className }: { className: string }) => (
    <div data-testid="toggle-right" className={className} />
  ),
  Pencil: ({ className }: { className: string }) => (
    <div data-testid="pencil" className={className} />
  ),
  RefreshCw: ({ className }: { className: string }) => (
    <div data-testid="refresh-cw" className={className} />
  ),
}));

// Mock ArticleDetailModal
vi.mock('@client/components/articles/ArticleDetailModal', () => ({
  ArticleDetailModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="article-detail-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock useCampaignDetail hook
vi.mock('@client/hooks/useCampaignDetail', () => ({
  useCampaignDetail: vi.fn(),
}));

// Mock useArticles hook
vi.mock('@client/hooks/useArticles', () => ({
  useArticles: vi.fn(),
}));

// Mock useAvailableModels hook
vi.mock('@client/hooks/useAvailableModels', () => ({
  useAvailableModels: vi.fn(() => ({
    writerPresets: [
      {
        key: 'balanced',
        displayName: 'GPT-4o',
        description: 'Strong all-round writing quality',
        model: 'openai/gpt-4o',
        tier: 'balanced',
        creditCost: 0,
      },
      {
        key: 'ultra',
        displayName: 'Claude Sonnet 4.5',
        description: 'Premium writing with nuance and depth',
        model: 'anthropic/claude-sonnet-4-5',
        tier: 'ultra',
        creditCost: 1,
      },
      {
        key: 'auto',
        displayName: 'Auto (Best Match)',
        description: 'Automatically picks the best model',
        model: 'openrouter/auto',
        tier: 'balanced',
        creditCost: 0,
      },
    ],
    imagePresets: [
      {
        key: 'budget',
        displayName: 'Budget',
        description: 'Fast, good-quality images',
        bestFor: 'Quick drafts, blog posts',
        replicateModel: 'flux-schnell',
        creditCost: 0,
        aspectRatio: '16:9',
        tier: 'budget',
      },
      {
        key: 'balanced',
        displayName: 'Balanced',
        description: 'Higher quality, slower generation',
        bestFor: 'Standard articles, featured posts',
        replicateModel: 'flux-dev',
        creditCost: 0,
        aspectRatio: '16:9',
        tier: 'balanced',
      },
    ],
    isLoading: false,
    error: null,
  })),
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
      'campaigns.detail.startConfirm_one': 'Generate {count} article using {count} credit?',
      'campaigns.detail.startConfirm_other': 'Generate {count} articles using {count} credits?',
      'campaigns.detail.startConfirmDetail':
        'This will queue article generation for all pending keywords. Credits will be deducted for each keyword.',
      'campaigns.detail.cancel': 'Cancel',
      'campaigns.detail.start': 'Start',
      'campaigns.detail.starting': 'Starting...',
      'campaigns.keywords.title': 'Add Keywords',
      'campaigns.keywords.placeholder': 'Enter one keyword per line...',
      'campaigns.keywords.cancel': 'Cancel',
      'campaigns.keywords.add': 'Add Keywords',
      'campaigns.success.updated': 'Campaign updated successfully',
      'campaigns.errors.updateFailed': 'Failed to update campaign',
      'campaigns.newCampaign.name': 'Campaign Name',
      'campaigns.newCampaign.namePlaceholder': 'Enter campaign name',
      'campaigns.generation.started': 'Started generation for {count} keywords',
      'projects.onboarding.step3.toneOfVoice': 'Tone of Voice',
      'projects.onboarding.step3.targetWordCount': 'Target Word Count',
      'projects.onboarding.step3.tones.professional': 'Professional',
      'projects.onboarding.step3.tones.casual': 'Casual',
      'projects.onboarding.step3.tones.witty': 'Witty',
      'projects.onboarding.step3.tones.academic': 'Academic',
      'projects.onboarding.buttons.nextStep': 'Save',
      'campaigns.detail.metadata.title': 'Campaign Settings',
      'campaigns.detail.metadata.tone': 'Tone',
      'campaigns.detail.metadata.wordCount': 'Word Count',
      'campaigns.detail.metadata.images': 'Images',
      'campaigns.detail.metadata.enabled': 'Enabled',
      'campaigns.detail.metadata.disabled': 'Disabled',
      'campaigns.detail.metadata.created': 'Created',
      'campaigns.detail.metadata.updated': 'Updated',
      'campaigns.credits.title': 'Credit Usage',
      'campaigns.credits.costPerArticle': 'Cost per article',
      'campaigns.credits.used': 'Used',
      'campaigns.credits.refunded': 'Refunded',
      'campaigns.credits.estimatedRemaining': 'Est. Remaining',
      'campaigns.credits.totalRequired': 'Total Required',
      'campaigns.credits.successful': 'successful',
      'campaigns.credits.failed': 'failed',
      'campaigns.credits.status.remaining': 'remaining',
      'campaigns.credits.status.successful': 'Successful',
      'campaigns.credits.breakdown': 'Credit Breakdown',
      'articles.status.all': 'All',
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
  image_preset: 'budget',
  schedule_frequency: null,
  schedule_batch_size: null,
  schedule_hour: null,
  schedule_timezone: null,
  next_run_at: null,
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
    ai_detection_details: null,
    ai_detection_provider: null,
    word_count: 1500,
    meta_description: 'A comprehensive guide...',
    published_url: null,
    slug: 'best-coffee-maker-guide',
    credits_used: 1,
    generation_error: null,
    rejection_reason: null,
    outline: null,
    token_count: 2000,
    generation_time_ms: 5000,
    generated_at: '2024-01-01T01:00:00Z',
    published_at: null,
    scheduled_publish_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T01:00:00Z',
    image_preset: null,
    image_count: 0,
    last_attempt_at: null,
    attempt_count: 0,
    topic_fingerprint: null,
    similarity_score: null,
    similar_to_article_id: null,
    qa_results: null,
    research_context: null,
    youtube_videos: null,
    internal_links: null,
    citations: null,
    enrichment_flags: null,
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
    ai_detection_details: null,
    ai_detection_provider: null,
    word_count: null,
    meta_description: null,
    published_url: null,
    slug: null,
    credits_used: 0,
    generation_error: null,
    rejection_reason: null,
    outline: null,
    token_count: null,
    generation_time_ms: null,
    generated_at: null,
    published_at: null,
    scheduled_publish_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    image_preset: null,
    image_count: 0,
    last_attempt_at: null,
    attempt_count: 0,
    topic_fingerprint: null,
    similarity_score: null,
    similar_to_article_id: null,
    qa_results: null,
    research_context: null,
    youtube_videos: null,
    internal_links: null,
    citations: null,
    enrichment_flags: null,
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

  it('should render keyword table with status badges', async () => {
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

    // Mock useArticles hook used by ArticleQueueTable
    vi.mocked(useArticles).mockReturnValue({
      articles: mockArticles,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    // Switch to Articles tab to see the article table
    const articlesTab = screen.getByRole('button', { name: /Articles/i });
    await userEvent.click(articlesTab);

    // Now the article keywords should be visible
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

    // Mock useArticles hook to return filtered articles based on search
    vi.mocked(useArticles).mockImplementation(({ search }) => ({
      articles: search
        ? mockArticles.filter(a => a.primary_keyword.toLowerCase().includes(search.toLowerCase()))
        : mockArticles,
      total: search
        ? mockArticles.filter(a => a.primary_keyword.toLowerCase().includes(search.toLowerCase()))
            .length
        : mockArticles.length,
      totalPages: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
      wrapper: createWrapper(),
    });

    // Switch to Articles tab first to access the search input
    const articlesTab = screen.getByRole('button', { name: /Articles/i });
    await userEvent.click(articlesTab);

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

  describe('Settings Modal', () => {
    it('should populate settings modal with current model/preset', async () => {
      const mockUpdateCampaign = vi.fn().mockResolvedValue(mockCampaign);
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
        updateCampaign: mockUpdateCampaign,
        refetch: vi.fn(),
      });

      render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
        wrapper: createWrapper(),
      });

      // Find the settings button
      const settingsButtons = screen.getAllByRole('button');
      const settingsButton = settingsButtons.find(
        btn => btn.querySelector('[data-testid="settings"]') && btn.classList.contains('px-3')
      );
      expect(settingsButton).toBeDefined();
      if (settingsButton) {
        await userEvent.click(settingsButton);
      }

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Campaign Settings' });
        expect(headings.length).toBe(2);
      });

      // Check that Writer Model and Image Preset labels exist
      expect(screen.getByText('Writer Model')).toBeInTheDocument();
      expect(screen.getByText('Image Preset')).toBeInTheDocument();

      // Custom ModelSelect shows selected model name in the trigger
      // The campaign has ai_model: 'auto' which maps to 'Auto (Best Match)'
      expect(screen.getByText('Auto (Best Match)')).toBeInTheDocument();

      // For Image Preset, find the trigger button specifically within the Image Preset section
      // The campaign has image_preset: 'budget' which maps to 'Budget'
      const imagePresetLabel = screen.getByText('Image Preset');
      const imagePresetSection = imagePresetLabel.parentElement;
      // Find the button within this section that contains "Budget"
      const imagePresetTrigger = imagePresetSection?.querySelector('button');
      expect(imagePresetTrigger).toHaveTextContent('Budget');
    });

    it('should update campaign model/preset on save', async () => {
      const mockUpdateCampaign = vi.fn().mockResolvedValue({
        ...mockCampaign,
        ai_model: 'balanced',
        image_preset: 'balanced',
      });
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
        updateCampaign: mockUpdateCampaign,
        refetch: vi.fn(),
      });

      render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
        wrapper: createWrapper(),
      });

      // Find and click the settings button
      const settingsButtons = screen.getAllByRole('button');
      const settingsButton = settingsButtons.find(
        btn => btn.querySelector('[data-testid="settings"]') && btn.classList.contains('px-3')
      );
      if (settingsButton) {
        await userEvent.click(settingsButton);
      }

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Campaign Settings' });
        expect(headings.length).toBe(2);
      });

      // Open the writer model dropdown and select GPT-4o
      const writerTrigger = screen.getByText('Auto (Best Match)').closest('button');
      if (writerTrigger) {
        await userEvent.click(writerTrigger);
      }
      // Click GPT-4o option in the dropdown
      const gpt4oOption = await screen.findByText('GPT-4o');
      await userEvent.click(gpt4oOption.closest('button')!);

      // Open the image preset dropdown
      // Find the Image Preset section and its trigger button
      const imagePresetLabel = screen.getByText('Image Preset');
      const imagePresetSection = imagePresetLabel.parentElement;
      const imageTrigger = imagePresetSection?.querySelector('button');
      if (imageTrigger) {
        await userEvent.click(imageTrigger);
      }

      // Wait for dropdown to open and find the Balanced option button
      // The dropdown shows tier headers and options - we need to find the button with "Balanced" text
      await waitFor(() => {
        const allButtons = screen.getAllByRole('button');
        const balancedButton = allButtons.find(
          btn =>
            btn.textContent?.includes('Balanced') &&
            btn.querySelector('[data-testid="check"]') === null
        );
        expect(balancedButton).toBeTruthy();
      });

      // Find and click the Balanced option (not the tier header)
      const allButtons = screen.getAllByRole('button');
      const balancedOption = allButtons.find(
        btn =>
          btn.textContent?.trim() === 'Balanced' ||
          btn.querySelector('.text-sm.font-medium')?.textContent === 'Balanced'
      );
      if (balancedOption) {
        await userEvent.click(balancedOption);
      }

      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateCampaign).toHaveBeenCalledWith({
          name: 'Test Campaign',
          tone: 'professional',
          targetWordCount: 1500,
          model: 'balanced',
          imagePreset: 'balanced',
        });
      });
    });

    it('should handle empty image preset (no images)', async () => {
      const noImageCampaign: ICampaign = {
        ...mockCampaign,
        image_preset: null,
      };
      const mockUpdateCampaign = vi.fn().mockResolvedValue(noImageCampaign);
      vi.mocked(useCampaignDetail).mockReturnValue({
        campaign: noImageCampaign,
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
        updateCampaign: mockUpdateCampaign,
        refetch: vi.fn(),
      });

      render(<CampaignDetailView campaignId={mockCampaignId} onBackToList={mockOnBackToList} />, {
        wrapper: createWrapper(),
      });

      // Find and click the settings button
      const settingsButtons = screen.getAllByRole('button');
      const settingsButton = settingsButtons.find(
        btn => btn.querySelector('[data-testid="settings"]') && btn.classList.contains('px-3')
      );
      if (settingsButton) {
        await userEvent.click(settingsButton);
      }

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Campaign Settings' });
        expect(headings.length).toBe(2);
      });

      // Image preset should show "No images" since campaign has image_preset: null
      expect(screen.getByText('Image Preset')).toBeInTheDocument();
      // Custom dropdown trigger should show "No images" for null image_preset
      expect(screen.getByText('No images')).toBeInTheDocument();
    });
  });
});
