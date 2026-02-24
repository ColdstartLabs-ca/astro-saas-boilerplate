import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentBriefGeneratorTool } from '../ContentBriefGeneratorTool';

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('ContentBriefGeneratorTool', () => {
  it('should render inputs and generate button', () => {
    render(<ContentBriefGeneratorTool />);
    expect(screen.getByPlaceholderText('e.g. automated SEO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Content Brief/i })).toBeInTheDocument();
  });

  it('should disable the button when keyword is empty', () => {
    render(<ContentBriefGeneratorTool />);
    expect(screen.getByRole('button', { name: /Generate Content Brief/i })).toBeDisabled();
  });

  it('should render content type selector buttons', () => {
    render(<ContentBriefGeneratorTool />);
    expect(screen.getByRole('button', { name: 'How-To Guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listicle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pillar Page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comparison' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('should include H2 sections (at least 5)', () => {
    render(<ContentBriefGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'automated SEO' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Content Brief/i }));
    // The section count label shows e.g. "H2 Sections (7)"
    const sectionLabel = screen.getByText(/H2 Sections \((\d+)\)/i);
    const match = sectionLabel.textContent?.match(/\((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('should show primary keyword in brief', () => {
    render(<ContentBriefGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'automated SEO' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Content Brief/i }));
    expect(screen.getByText('automated seo')).toBeInTheDocument();
  });

  it('should show word count target', () => {
    render(<ContentBriefGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'SEO strategy' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Content Brief/i }));
    expect(screen.getByText(/~.*words/i)).toBeInTheDocument();
  });

  it('should show secondary keywords after generation', () => {
    render(<ContentBriefGeneratorTool />);
    const input = screen.getByPlaceholderText('e.g. automated SEO');
    fireEvent.change(input, { target: { value: 'SEO tips' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Content Brief/i }));
    expect(screen.getByText('Secondary Keywords')).toBeInTheDocument();
    // Secondary keywords include "best SEO tips"
    expect(screen.getByText('best seo tips')).toBeInTheDocument();
  });
});
