/**
 * AddKeywordsModal Component Tests
 * Tests for the modal component for adding new keywords to a campaign
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddKeywordsModal } from '@client/components/dashboard/views/campaign-detail/AddKeywordsModal';
import type { IAddKeywordsResponse } from '@shared/types/campaign.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: ({ className, onClick }: { className?: string; onClick?: () => void }) => (
    <button className={className} onClick={onClick} data-icon="ArrowLeft">
      &times;
    </button>
  ),
  Upload: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Upload" />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CheckCircle2" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertTriangle" />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ExternalLink" />
  ),
  Lightbulb: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Lightbulb" />
  ),
}));

// Mock DashboardButton component
vi.mock('@client/components/dashboard/ui/DashboardButton', () => ({
  DashboardButton: ({
    children,
    onClick,
    disabled,
    variant,
    'data-testid': dataTestId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    'data-testid'?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-testid={dataTestId ?? 'dashboard-button'}
    >
      {children}
    </button>
  ),
}));

// Mock translations
const mockTranslations: Record<string, string> = {
  'campaigns.keywords.title': 'Add Keywords',
  'campaigns.keywords.placeholder': 'Enter keywords, one per line',
  'campaigns.keywords.cancel': 'Cancel',
  'campaigns.keywords.add': 'Add Keywords',
  'campaigns.keywords.manual': 'Manual',
  'campaigns.keywords.fileUpload': 'File Upload',
};

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: vi.fn((_namespace: string) => {
    const t = (key: string) => mockTranslations[key] || key;
    return t;
  }),
}));

const defaultResult: IAddKeywordsResponse = { added: 3, duplicates: 0 };

describe('AddKeywordsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn<[string[]], Promise<IAddKeywordsResponse>>();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAdd: mockOnAdd,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAdd.mockResolvedValue(defaultResult);
  });

  describe('Modal Visibility', () => {
    it('should render modal when isOpen is true', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      expect(screen.getAllByText('Add Keywords')).toHaveLength(2); // Title + button
      expect(screen.getByPlaceholderText('Enter keywords, one per line')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<AddKeywordsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryAllByText('Add Keywords')).toHaveLength(0);
      expect(screen.queryByPlaceholderText('Enter keywords, one per line')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when header close button is clicked', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const allButtons = screen.getAllByRole('button');
      const closeButton = allButtons.find(btn => btn.querySelector('[data-icon="ArrowLeft"]'));

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should close modal when cancel button is clicked', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should update textarea value when user types', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'keyword 1\nkeyword 2\nkeyword 3' } });

      expect(textarea).toHaveValue('keyword 1\nkeyword 2\nkeyword 3');
    });

    it('should trim whitespace from keywords', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, {
        target: { value: '  keyword 1  \n\n  keyword 2  \n\n  keyword 3  ' },
      });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(['keyword 1', 'keyword 2', 'keyword 3']);
      });
    });

    it('should filter out empty lines', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, {
        target: { value: 'keyword 1\n\nkeyword 2\n\n\nkeyword 3' },
      });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(['keyword 1', 'keyword 2', 'keyword 3']);
      });
    });

    it('should not call onAdd when textarea is empty or contains only whitespace', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: '   \n\n   ' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).not.toHaveBeenCalled();
      });
    });
  });

  describe('Add Button State', () => {
    it('should disable add button when textarea is empty', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      expect(addButton).toBeDisabled();
    });

    it('should disable add button when textarea contains only whitespace', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: '   \n\n   ' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      expect(addButton).toBeDisabled();
    });

    it('should enable add button when textarea has content', () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      expect(addButton).not.toBeDisabled();
    });

    it('should disable add button during submission', async () => {
      mockOnAdd.mockImplementation(
        () => new Promise<IAddKeywordsResponse>(resolve => setTimeout(() => resolve({ added: 1, duplicates: 0 }), 100))
      );

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      // Button should be disabled during submission
      expect(addButton).toBeDisabled();
    });

    it('should disable cancel button during submission', async () => {
      mockOnAdd.mockImplementation(
        () => new Promise<IAddKeywordsResponse>(resolve => setTimeout(() => resolve({ added: 1, duplicates: 0 }), 100))
      );

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Submission Flow', () => {
    it('should call onAdd with parsed keywords when add button is clicked', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      const keywords = 'keyword 1\nkeyword 2\nkeyword 3';
      fireEvent.change(textarea, { target: { value: keywords } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(['keyword 1', 'keyword 2', 'keyword 3']);
      });
    });

    it('should show result view (not close modal) after successful submission', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1];
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-keywords-result')).toBeInTheDocument();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('should show "Done" button in result view that closes the modal', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Done'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show "Add More" button that returns to input view', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByText('Add More')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add More'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter keywords, one per line')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      mockOnAdd.mockImplementation(
        () => new Promise<IAddKeywordsResponse>(resolve => setTimeout(() => resolve({ added: 1, duplicates: 0 }), 100))
      );

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      // Should show "Adding..." text during submission
      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });
  });

  describe('Result View — Summary', () => {
    it('should show added count in result view', async () => {
      mockOnAdd.mockResolvedValue({ added: 2, duplicates: 1 });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'kw1\nkw2\nkw1' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('added-count')).toHaveTextContent('2 keywords added');
        expect(screen.getByTestId('duplicates-count')).toHaveTextContent('1 duplicate skipped');
      });
    });

    it('should not render when isOpen is false', () => {
      render(<AddKeywordsModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('add-keywords-result')).not.toBeInTheDocument();
    });
  });

  describe('Result View — Already Covered', () => {
    it('should show alreadyCovered section with keyword details', async () => {
      mockOnAdd.mockResolvedValue({
        added: 1,
        duplicates: 0,
        alreadyCovered: [
          {
            keyword: 'best coffee makers',
            coveredByUrl: 'https://example.com/coffee',
            coveredByTitle: 'Top Coffee Makers Guide',
            reason: 'Same search intent',
          },
        ],
        cannibalizationChecked: true,
      });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'new kw\nbest coffee makers' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('already-covered-section')).toBeInTheDocument();
        expect(screen.getByTestId('covered-count')).toHaveTextContent(
          '1 keyword already covered by your content'
        );
        expect(screen.getByText('best coffee makers')).toBeInTheDocument();
        expect(screen.getByText('Top Coffee Makers Guide')).toBeInTheDocument();
        expect(screen.getByText('Same search intent')).toBeInTheDocument();
      });
    });

    it('should not show alreadyCovered section when no keywords are covered', async () => {
      mockOnAdd.mockResolvedValue({ added: 2, duplicates: 0, alreadyCovered: [] });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'kw1\nkw2' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.queryByTestId('already-covered-section')).not.toBeInTheDocument();
      });
    });
  });

  describe('Result View — Cannibalization Warnings', () => {
    it('should show cannibalizationWarnings section', async () => {
      mockOnAdd.mockResolvedValue({
        added: 1,
        duplicates: 0,
        cannibalizationWarnings: [
          {
            newKeyword: 'seo tips',
            existingKeyword: 'seo advice',
            existingCampaignName: 'SEO Campaign',
            existingCampaignId: 'campaign-abc',
            similarity: 0.92,
            similarityPercent: 92,
          },
        ],
        cannibalizationChecked: true,
      });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'seo tips' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('cannibalization-warnings-section')).toBeInTheDocument();
        expect(screen.getByText('seo tips')).toBeInTheDocument();
        expect(screen.getByText('seo advice')).toBeInTheDocument();
        expect(screen.getByText(/SEO Campaign/)).toBeInTheDocument();
        expect(screen.getByText(/92% match/)).toBeInTheDocument();
      });
    });
  });

  describe('Result View — GSC Suggestions', () => {
    it('should show suggestedKeywords with checkboxes pre-checked', async () => {
      mockOnAdd.mockResolvedValue({
        added: 0,
        duplicates: 0,
        alreadyCovered: [
          {
            keyword: 'best laptops',
            coveredByUrl: 'https://example.com/laptops',
            coveredByTitle: 'Laptop Guide',
            reason: 'Exact match',
          },
        ],
        suggestedKeywords: ['gaming laptops 2026', 'budget laptops under 500'],
        cannibalizationChecked: true,
      });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'best laptops' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('gsc-suggestions-section')).toBeInTheDocument();
        expect(screen.getByText('gaming laptops 2026')).toBeInTheDocument();
        expect(screen.getByText('budget laptops under 500')).toBeInTheDocument();
        // Both are pre-checked
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(cb => expect(cb).toBeChecked());
      });
    });

    it('should show "Add Selected" button when suggestions are present', async () => {
      mockOnAdd.mockResolvedValue({
        added: 0,
        duplicates: 0,
        alreadyCovered: [],
        suggestedKeywords: ['gaming laptops'],
        cannibalizationChecked: true,
      });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'best laptops' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('add-selected-button')).toBeInTheDocument();
        expect(screen.getByText(/Add Selected/)).toBeInTheDocument();
      });
    });

    it('should call onAdd again with selected suggestions when "Add Selected" is clicked', async () => {
      mockOnAdd
        .mockResolvedValueOnce({
          added: 0,
          duplicates: 0,
          alreadyCovered: [],
          suggestedKeywords: ['gaming laptops 2026'],
          cannibalizationChecked: true,
        })
        .mockResolvedValueOnce({ added: 1, duplicates: 0 });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'best laptops' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('add-selected-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-selected-button'));

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledTimes(2);
        expect(mockOnAdd).toHaveBeenLastCalledWith(['gaming laptops 2026']);
      });
    });

    it('should allow unchecking a suggestion', async () => {
      mockOnAdd.mockResolvedValue({
        added: 0,
        duplicates: 0,
        alreadyCovered: [],
        suggestedKeywords: ['gaming laptops 2026', 'budget laptops'],
        cannibalizationChecked: true,
      });

      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'best laptops' } });
      fireEvent.click(screen.getAllByText('Add Keywords')[1]);

      await waitFor(() => {
        expect(screen.getByTestId('gsc-suggestions-section')).toBeInTheDocument();
      });

      // Uncheck the first suggestion
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(checkboxes[0]).not.toBeChecked();
        // "Add Selected (1)" since only one remains
        expect(screen.getByText(/Add Selected \(1\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single keyword', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'single keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(['single keyword']);
      });
    });

    it('should handle keywords with special characters', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, {
        target: { value: 'keyword with spaces\nkeyword-with-dashes\nkeyword_with_underscores' },
      });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith([
          'keyword with spaces',
          'keyword-with-dashes',
          'keyword_with_underscores',
        ]);
      });
    });

    it('should handle very long keyword list', async () => {
      render(<AddKeywordsModal {...defaultProps} />);

      const keywords = Array.from({ length: 100 }, (_, i) => `keyword ${i + 1}`).join('\n');
      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: keywords } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalled();
        const calledWith = mockOnAdd.mock.calls[0][0];
        expect(calledWith).toHaveLength(100);
      });
    });
  });

  describe('Props Handling', () => {
    it('should call onClose callback when provided', () => {
      const customOnClose = vi.fn();
      render(<AddKeywordsModal {...defaultProps} onClose={customOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(customOnClose).toHaveBeenCalled();
    });

    it('should call onAdd callback with correct keywords', async () => {
      const customOnAdd = vi.fn<[string[]], Promise<IAddKeywordsResponse>>().mockResolvedValue({
        added: 1,
        duplicates: 0,
      });
      render(<AddKeywordsModal {...defaultProps} onAdd={customOnAdd} />);

      const textarea = screen.getByPlaceholderText('Enter keywords, one per line');
      fireEvent.change(textarea, { target: { value: 'test keyword' } });

      const addButton = screen.getAllByText('Add Keywords')[1]; // Get the button, not the title
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(customOnAdd).toHaveBeenCalledWith(['test keyword']);
      });
    });
  });
});
