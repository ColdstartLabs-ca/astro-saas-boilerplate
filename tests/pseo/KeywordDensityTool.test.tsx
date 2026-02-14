/**
 * Tests for KeywordDensityTool React Component
 *
 * Tests the interactive keyword density checker tool component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeywordDensityTool } from '@client/components/tools/KeywordDensityTool';

// Mock the calculateKeywordDensity function
vi.mock('@shared/utils/seo', () => ({
  calculateKeywordDensity: vi.fn((content: string, keyword: string) => {
    if (!content || !keyword) return 0;
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0);
    const keywordLower = keyword.toLowerCase();
    const matches = words.filter(w => w.includes(keywordLower)).length;
    return words.length > 0 ? (matches / words.length) * 100 : 0;
  }),
}));

describe('KeywordDensityTool', () => {
  it('should render the component', () => {
    render(<KeywordDensityTool />);

    expect(screen.getByText('Your Content')).toBeInTheDocument();
    expect(screen.getByText('Target Keyword')).toBeInTheDocument();
    expect(screen.getByText('Analyze Keyword Density')).toBeInTheDocument();
  });

  it('should have disabled analyze button when fields are empty', () => {
    render(<KeywordDensityTool />);

    const analyzeButton = screen.getByText('Analyze Keyword Density');
    expect(analyzeButton).toBeDisabled();
  });

  it('should enable analyze button when fields are filled', async () => {
    const user = userEvent.setup();
    render(<KeywordDensityTool />);

    const textarea = screen.getByPlaceholderText('Paste your content here...');
    const input = screen.getByPlaceholderText('Enter your keyword...');

    await user.type(textarea, 'This is some test content about SEO and keywords.');
    await user.type(input, 'keyword');

    const analyzeButton = screen.getByText('Analyze Keyword Density');
    expect(analyzeButton).not.toBeDisabled();
  });

  it('should show density result after analysis', async () => {
    const user = userEvent.setup();
    render(<KeywordDensityTool />);

    const textarea = screen.getByPlaceholderText('Paste your content here...');
    const input = screen.getByPlaceholderText('Enter your keyword...');

    await user.type(textarea, 'This is some test content about SEO and keywords.');
    await user.type(input, 'keyword');

    const analyzeButton = screen.getByText('Analyze Keyword Density');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Keyword Density:/)).toBeInTheDocument();
    });
  });

  it('should show word count after analysis', async () => {
    const user = userEvent.setup();
    render(<KeywordDensityTool />);

    const textarea = screen.getByPlaceholderText('Paste your content here...');
    const input = screen.getByPlaceholderText('Enter your keyword...');

    await user.type(textarea, 'This is some test content about SEO and keywords.');
    await user.type(input, 'keyword');

    const analyzeButton = screen.getByText('Analyze Keyword Density');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Total Words:/)).toBeInTheDocument();
    });
  });

  it('should show recommendation text after analysis', async () => {
    const user = userEvent.setup();
    render(<KeywordDensityTool />);

    const textarea = screen.getByPlaceholderText('Paste your content here...');
    const input = screen.getByPlaceholderText('Enter your keyword...');

    await user.type(textarea, 'This is some test content about SEO and keywords.');
    await user.type(input, 'keyword');

    const analyzeButton = screen.getByText('Analyze Keyword Density');
    await user.click(analyzeButton);

    await waitFor(() => {
      // Look for the specific recommendation text
      expect(screen.getByText(/Risk of keyword stuffing|Density is|Excellent/)).toBeInTheDocument();
    });
  });

  it('should clear form when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<KeywordDensityTool />);

    const textarea = screen.getByPlaceholderText('Paste your content here...');
    const input = screen.getByPlaceholderText('Enter your keyword...');

    await user.type(textarea, 'Test content');
    await user.type(input, 'test');

    expect(textarea).toHaveValue('Test content');
    expect(input).toHaveValue('test');

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
    expect(input).toHaveValue('');
  });

  it('should show link to pricing page', () => {
    render(<KeywordDensityTool />);

    const pricingLink = screen.getByText('Try AutopilotRank free');
    expect(pricingLink).toBeInTheDocument();
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  it('should have proper accessibility attributes', () => {
    render(<KeywordDensityTool />);

    // Check for labels
    expect(screen.getByText('Your Content')).toBeInTheDocument();
    expect(screen.getByText('Target Keyword')).toBeInTheDocument();
  });
});
