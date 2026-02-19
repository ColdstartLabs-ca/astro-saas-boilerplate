/**
 * Tests for ContentLengthAnalyzer React Component
 *
 * Tests the interactive content length analyzer tool component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentLengthAnalyzer } from '../ContentLengthAnalyzer';

// Helper to generate text with specific word count
function generateText(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(`word${i}`);
  }
  // Add periods every ~15 words to create sentences
  let text = '';
  for (let i = 0; i < words.length; i++) {
    text += words[i];
    if ((i + 1) % 15 === 0) {
      text += '. ';
    } else {
      text += ' ';
    }
  }
  return text.trim();
}

const SHORT_TEXT = 'This is a short text with just a few words.';
const MEDIUM_TEXT = generateText(100);

describe('ContentLengthAnalyzer', () => {
  it('should render the component', () => {
    render(<ContentLengthAnalyzer />);

    expect(screen.getByText('Content Type')).toBeInTheDocument();
    expect(screen.getByText('Your Content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste your content/i)).toBeInTheDocument();
  });

  it('should render content type selector with options', () => {
    render(<ContentLengthAnalyzer />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    expect(screen.getByText('Blog Post (1,500-2,500 words)')).toBeInTheDocument();
    expect(screen.getByText('Pillar Content (3,000+ words)')).toBeInTheDocument();
    expect(screen.getByText('Product Page (300-500 words)')).toBeInTheDocument();
  });

  it('should not show results when text is empty', () => {
    render(<ContentLengthAnalyzer />);

    expect(screen.queryByText('Word Count')).not.toBeInTheDocument();
  });

  it('should show results when text is entered', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, MEDIUM_TEXT);

    expect(screen.getByText('Word Count')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Reading Time')).toBeInTheDocument();
  });

  it('counts 500 words correctly', () => {
    render(<ContentLengthAnalyzer />);

    const text500Words = generateText(500);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    // Use fireEvent for faster input
    fireEvent.change(textarea, { target: { value: text500Words } });

    // Find the word count value using a more specific approach
    const wordCountDiv = screen.getByText('Word Count').closest('div');
    const wordCountValue = wordCountDiv?.querySelector('p.text-2xl');
    expect(wordCountValue?.textContent).toBe('500');
  });

  it('should calculate reading time correctly', () => {
    render(<ContentLengthAnalyzer />);

    // 200 words = 1 minute at 200 wpm
    const text200Words = generateText(200);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    fireEvent.change(textarea, { target: { value: text200Words } });

    const readingTimeDiv = screen.getByText('Reading Time').closest('div');
    const readingTimeValue = readingTimeDiv?.querySelector('p.text-2xl');

    expect(readingTimeValue?.textContent).toBe('1 min');
  });

  it('should show character count', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SHORT_TEXT);

    const charDiv = screen.getByText('Characters').closest('div');
    const charValue = charDiv?.querySelector('p.text-2xl');

    const charCount = parseInt(charValue?.textContent || '0', 10);
    expect(charCount).toBe(SHORT_TEXT.length);
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, MEDIUM_TEXT);

    expect(screen.getByText(/Progress towards/)).toBeInTheDocument();
  });

  it('should show "Too Short" for short content', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SHORT_TEXT);

    expect(screen.getByText('Too Short')).toBeInTheDocument();
  });

  it('should show "Optimal Length" for content in range', () => {
    render(<ContentLengthAnalyzer />);

    // Create text with 1800 words (within blog post range of 1500-2500)
    const text1800Words = generateText(1800);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    fireEvent.change(textarea, { target: { value: text1800Words } });

    expect(screen.getByText('Optimal Length')).toBeInTheDocument();
  });

  it('should show "Too Long" for very long blog content', () => {
    render(<ContentLengthAnalyzer />);

    // Create text with 3000 words (exceeds blog post max of 2500)
    const text3000Words = generateText(3000);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    fireEvent.change(textarea, { target: { value: text3000Words } });

    expect(screen.getByText('Too Long')).toBeInTheDocument();
  });

  it('should change recommendation based on content type', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    // Select pillar content (3000+ words)
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'pillar');

    // Type 2000 words - good for blog, short for pillar
    const text2000Words = generateText(2000);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    fireEvent.change(textarea, { target: { value: text2000Words } });

    // Should show as too short for pillar content
    expect(screen.getByText('Too Short')).toBeInTheDocument();
  });

  it('should show product page as optimal for correct length', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    // Select product page (300-500 words)
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'product');

    // Type 400 words - within product page range
    const text400Words = generateText(400);
    const textarea = screen.getByPlaceholderText(/paste your content/i);

    fireEvent.change(textarea, { target: { value: text400Words } });

    expect(screen.getByText('Optimal Length')).toBeInTheDocument();
  });

  it('should show content type guidelines', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, MEDIUM_TEXT);

    expect(screen.getByText('Content Type Guidelines')).toBeInTheDocument();
  });

  it('should clear form when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, SHORT_TEXT);

    expect(textarea).toHaveValue(SHORT_TEXT);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Word Count')).not.toBeInTheDocument();
  });

  it('should show link to pricing page', () => {
    render(<ContentLengthAnalyzer />);

    const pricingLink = screen.getByText('Try AutopilotRank free');
    expect(pricingLink).toBeInTheDocument();
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  it('should show additional stats', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, MEDIUM_TEXT);

    expect(screen.getByText(/Paragraphs:/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Words\/Sentence:/)).toBeInTheDocument();
  });

  it('should show word count in textarea footer', async () => {
    const user = userEvent.setup();
    render(<ContentLengthAnalyzer />);

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, 'One two three four five');

    expect(screen.getByText('5 words')).toBeInTheDocument();
  });
});
