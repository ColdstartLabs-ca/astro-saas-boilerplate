/**
 * Tests for ReadingLevelChecker React Component
 *
 * Tests the interactive reading level checker tool component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingLevelChecker } from '../ReadingLevelChecker';

// Sample texts for testing
const SIMPLE_TEXT = 'The cat sat on the mat. The dog ran in the yard. It was a nice day outside.';
const COMPLEX_TEXT =
  'The implementation of sophisticated algorithms necessitates comprehensive understanding of computational complexity theory. Furthermore, the extrapolation of empirical data requires rigorous statistical methodologies.';

const TYPICAL_BLOG_TEXT = `
  Search engine optimization is an important strategy for growing your website traffic.
  By creating high-quality content that answers user questions, you can improve your rankings.
  Focus on writing helpful articles that provide real value to your readers.
  Keep your sentences clear and concise. Use simple words when possible.
  This makes your content easier to understand and more accessible to a wider audience.
  Good SEO takes time, but the results are worth it in the long run.
`;

describe('ReadingLevelChecker', () => {
  it('should render the component', () => {
    render(<ReadingLevelChecker />);

    expect(screen.getByText('Your Text')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste your content/i)).toBeInTheDocument();
  });

  it('should not show results when text is empty', () => {
    render(<ReadingLevelChecker />);

    expect(screen.queryByText('Flesch-Kincaid Grade Level')).not.toBeInTheDocument();
  });

  it('should show results when text is entered', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    expect(screen.getByText('Flesch-Kincaid Grade Level')).toBeInTheDocument();
    expect(screen.getByText('Reading Ease Score')).toBeInTheDocument();
  });

  it('returns grade 8 for typical blog text', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, TYPICAL_BLOG_TEXT);

    // Find the grade level value
    const gradeLevelText = screen.getByText('Flesch-Kincaid Grade Level');
    const gradeContainer = gradeLevelText.closest('div');
    const gradeValue = gradeContainer?.querySelector('p.text-4xl');

    // Extract the number from the text
    const gradeMatch = gradeValue?.textContent?.match(/(\d+\.?\d*)/);
    const gradeLevel = gradeMatch ? parseFloat(gradeMatch[1]) : 0;

    // Grade should be between 7-9 for typical blog text
    expect(gradeLevel).toBeGreaterThanOrEqual(7);
    expect(gradeLevel).toBeLessThanOrEqual(9);
  });

  it('should show simple text as lower grade level', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    // Simple text should have lower grade level
    const gradeLevelText = screen.getByText('Flesch-Kincaid Grade Level');
    const gradeContainer = gradeLevelText.closest('div');
    const gradeValue = gradeContainer?.querySelector('p.text-4xl');

    const gradeMatch = gradeValue?.textContent?.match(/(\d+\.?\d*)/);
    const gradeLevel = gradeMatch ? parseFloat(gradeMatch[1]) : 0;

    // Simple text should be under grade 5
    expect(gradeLevel).toBeLessThan(5);
  });

  it('should show complex text as higher grade level', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, COMPLEX_TEXT);

    // Complex text should have higher grade level
    const gradeLevelText = screen.getByText('Flesch-Kincaid Grade Level');
    const gradeContainer = gradeLevelText.closest('div');
    const gradeValue = gradeContainer?.querySelector('p.text-4xl');

    const gradeMatch = gradeValue?.textContent?.match(/(\d+\.?\d*)/);
    const gradeLevel = gradeMatch ? parseFloat(gradeMatch[1]) : 0;

    // Complex text should be grade 12 or higher
    expect(gradeLevel).toBeGreaterThan(12);
  });

  it('should show detailed metrics', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    expect(screen.getByText('Detailed Metrics')).toBeInTheDocument();
    expect(screen.getByText(/Word Count:/)).toBeInTheDocument();
    expect(screen.getByText(/Sentence Count:/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Sentence Length:/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Syllables\/Word:/)).toBeInTheDocument();
  });

  it('should show word count in textarea footer', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, 'One two three four five');

    expect(screen.getByText('5 words')).toBeInTheDocument();
  });

  it('should clear form when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    expect(textarea).toHaveValue(SIMPLE_TEXT);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Flesch-Kincaid Grade Level')).not.toBeInTheDocument();
  });

  it('should show link to pricing page', () => {
    render(<ReadingLevelChecker />);

    const pricingLink = screen.getByText('Try AutopilotRank free');
    expect(pricingLink).toBeInTheDocument();
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  it('should show reading ease scale', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    expect(screen.getByText('Reading Ease Scale')).toBeInTheDocument();
    expect(screen.getByText('0 (Graduate)')).toBeInTheDocument();
    expect(screen.getByText('100 (Easy)')).toBeInTheDocument();
  });

  it('should show SEO recommendations', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    expect(screen.getByText('SEO Recommendations')).toBeInTheDocument();
  });

  it('should show interpretation text for grade level', async () => {
    const user = userEvent.setup();
    render(<ReadingLevelChecker />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SIMPLE_TEXT);

    // Simple text should show elementary/middle school interpretation
    expect(screen.getByText(/Elementary school|Middle school|High school/)).toBeInTheDocument();
  });
});
