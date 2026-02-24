import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogKeywordGeneratorTool } from '../BlogKeywordGeneratorTool';

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('BlogKeywordGeneratorTool', () => {
  it('should render the input and generate button', () => {
    render(<BlogKeywordGeneratorTool />);
    expect(screen.getByPlaceholderText('e.g. automated SEO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Keywords/i })).toBeInTheDocument();
  });

  it('should disable the button when input is empty', () => {
    render(<BlogKeywordGeneratorTool />);
    expect(screen.getByRole('button', { name: /Generate Keywords/i })).toBeDisabled();
  });

  it('should generate question keywords from seed', () => {
    render(<BlogKeywordGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'SEO' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Keywords/i }));
    // Seed is lowercased internally
    expect(screen.getByText('what is seo')).toBeInTheDocument();
  });

  it('should generate 15+ keyword variations', () => {
    render(<BlogKeywordGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'SEO' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Keywords/i }));
    // Each li inside the keyword groups is one keyword
    const keywordItems = screen
      .getAllByRole('listitem')
      .filter(li => li.querySelector('button[aria-label]'));
    expect(keywordItems.length).toBeGreaterThanOrEqual(15);
  });

  it('should show Copy All button after generation', () => {
    render(<BlogKeywordGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'keyword research' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Keywords/i }));
    expect(screen.getByText('Copy All')).toBeInTheDocument();
  });

  it('should display category labels after generation', () => {
    render(<BlogKeywordGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'content marketing' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Keywords/i }));
    expect(screen.getByText('Question Keywords')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Long-Tail')).toBeInTheDocument();
  });
});
