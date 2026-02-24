import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeoTitleGeneratorTool } from '../SeoTitleGeneratorTool';

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('SeoTitleGeneratorTool', () => {
  it('should render inputs and generate button', () => {
    render(<SeoTitleGeneratorTool />);
    expect(screen.getByPlaceholderText('e.g. automated SEO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Titles/i })).toBeInTheDocument();
  });

  it('should disable the button when keyword is empty', () => {
    render(<SeoTitleGeneratorTool />);
    expect(screen.getByRole('button', { name: /Generate Titles/i })).toBeDisabled();
  });

  it('should render content type selector buttons', () => {
    render(<SeoTitleGeneratorTool />);
    expect(screen.getByRole('button', { name: 'How-To' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listicle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comparison' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('should generate 10 title suggestions', () => {
    render(<SeoTitleGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'automated SEO' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Titles/i }));
    // 10 copy buttons for individual titles (aria-label="Copy title N")
    const copyButtons = screen.getAllByRole('button', { name: /Copy title \d+/i });
    expect(copyButtons).toHaveLength(10);
  });

  it('should flag titles over 60 chars as long', () => {
    render(<SeoTitleGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    // "automated SEO tools" (19 chars) + Listicle "Mistakes" template = 66 chars → "Long"
    fireEvent.change(input, { target: { value: 'automated SEO tools' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listicle' }));
    fireEvent.click(screen.getByRole('button', { name: /Generate Titles/i }));
    const longLabels = screen.queryAllByText(/Long|Too long/i);
    expect(longLabels.length).toBeGreaterThan(0);
  });

  it('should update titles when content type changes', () => {
    render(<SeoTitleGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'SEO tools' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listicle' }));
    fireEvent.click(screen.getByRole('button', { name: /Generate Titles/i }));
    // Listicle titles contain numbered patterns like "7 Best"
    expect(screen.getByText(/7 Best SEO tools/i)).toBeInTheDocument();
  });
});
