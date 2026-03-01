/**
 * ContentPreferencesSection Component Tests
 * Tests for the content preferences form section in Step 4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import {
  ContentPreferencesSection,
  CONTENT_PREFERENCES_DEFAULTS,
} from '@client/components/onboarding/steps/ContentPreferencesSection';
import type { IContentPreferences } from '@shared/types/project.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = ({ className }: { className?: string }) => (
    <span className={className} data-testid="mock-icon" />
  );
  return {
    Palette: icon,
    Image: icon,
    FileText: icon,
    Link2: icon,
    Calendar: icon,
    Zap: icon,
  };
});

describe('ContentPreferencesSection', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render content preferences section', () => {
    const { getByText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    expect(getByText('Content Preferences')).toBeDefined();
    expect(getByText('Article Style')).toBeDefined();
    expect(getByText('Internal Links')).toBeDefined();
    expect(getByText('Brand Color')).toBeDefined();
    expect(getByText('Image Style')).toBeDefined();
    expect(getByText('Global Instructions')).toBeDefined();
  });

  it('should have correct defaults (Article style: Informative, Links: 2, Color: #4F46E5, Image: cinematic)', () => {
    // Verify the exported defaults match the PRD specification
    expect(CONTENT_PREFERENCES_DEFAULTS.articleStyle).toBe('informative');
    expect(CONTENT_PREFERENCES_DEFAULTS.internalLinksCount).toBe(2);
    expect(CONTENT_PREFERENCES_DEFAULTS.brandColor).toBe('#4F46E5');
    expect(CONTENT_PREFERENCES_DEFAULTS.imageStyle).toBe('cinematic');
  });

  it('should display all article style options', () => {
    const { getByText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    // Open the article style dropdown
    const select = document.getElementById('article-style') as HTMLSelectElement;
    expect(select).toBeDefined();

    // Check that options are available
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(7); // 7 article styles

    // Verify specific options exist
    expect(getByText('Informative')).toBeDefined();
    expect(getByText('How-To')).toBeDefined();
    expect(getByText('Listicle')).toBeDefined();
    expect(getByText('Opinion')).toBeDefined();
    expect(getByText('Tutorial')).toBeDefined();
    expect(getByText('Review')).toBeDefined();
    expect(getByText('Comparison')).toBeDefined();
  });

  it('should display all internal links options', () => {
    const { getByText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    // Open the internal links dropdown
    const select = document.getElementById('internal-links') as HTMLSelectElement;
    expect(select).toBeDefined();

    // Check that options are available
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(5); // 0, 1, 2, 3, 5 links

    expect(getByText('0 links')).toBeDefined();
    expect(getByText('1 link')).toBeDefined();
    expect(getByText('2 links')).toBeDefined();
    expect(getByText('3 links')).toBeDefined();
    expect(getByText('5 links')).toBeDefined();
  });

  it('should display all image style options', () => {
    const { getByText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    // Open the image style dropdown
    const select = document.getElementById('image-style') as HTMLSelectElement;
    expect(select).toBeDefined();

    // Check that options are available
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(5); // 5 image styles

    expect(getByText('Brand & Text')).toBeDefined();
    expect(getByText('Watercolor')).toBeDefined();
    expect(getByText('Cinematic')).toBeDefined();
    expect(getByText('Illustration')).toBeDefined();
    expect(getByText('Sketch')).toBeDefined();
  });

  it('should call onChange when article style is changed', () => {
    const { getByDisplayValue } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const select = document.getElementById('article-style') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'how-to' } });

    expect(mockOnChange).toHaveBeenCalled();
    const call = mockOnChange.mock.calls[0][0] as IContentPreferences;
    expect(call.articleStyle).toBe('how-to');
  });

  it('should call onChange when internal links count is changed', () => {
    const { getByDisplayValue } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const select = document.getElementById('internal-links') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '5' } });

    expect(mockOnChange).toHaveBeenCalled();
    const call = mockOnChange.mock.calls[0][0] as IContentPreferences;
    expect(call.internalLinksCount).toBe(5);
  });

  it('should call onChange when image style is changed', () => {
    const { getByDisplayValue } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const select = document.getElementById('image-style') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'watercolor' } });

    expect(mockOnChange).toHaveBeenCalled();
    const call = mockOnChange.mock.calls[0][0] as IContentPreferences;
    expect(call.imageStyle).toBe('watercolor');
  });

  it('should call onChange when brand color is changed via text input', () => {
    const { getByDisplayValue } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const textInput = document.getElementById('brand-color') as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: '#FF5733' } });

    expect(mockOnChange).toHaveBeenCalled();
    const call = mockOnChange.mock.calls[0][0] as IContentPreferences;
    expect(call.brandColor).toBe('#FF5733');
  });

  it('should call onChange when global instructions is changed', () => {
    const { getByPlaceholderText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const textarea = getByPlaceholderText(/Additional instructions for the AI writer/);
    fireEvent.change(textarea, { target: { value: 'Use British English' } });

    expect(mockOnChange).toHaveBeenCalled();
    const call = mockOnChange.mock.calls[0][0] as IContentPreferences;
    expect(call.globalInstructions).toBe('Use British English');
  });

  it('should enforce max 1000 characters for global instructions', () => {
    const { getByPlaceholderText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const textarea = getByPlaceholderText(
      /Additional instructions for the AI writer/
    ) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(1000);
  });

  it('should show character count for global instructions', () => {
    const { getByText, getByPlaceholderText } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    // Initially 0
    expect(getByText('0/1000')).toBeDefined();

    // After typing
    const textarea = getByPlaceholderText(/Additional instructions for the AI writer/);
    fireEvent.change(textarea, { target: { value: 'Test instructions' } });

    expect(getByText('17/1000')).toBeDefined();
  });

  it('should accept existing values passed as props', () => {
    const existingPrefs: IContentPreferences = {
      articleStyle: 'listicle',
      internalLinksCount: 5,
      brandColor: '#FF5733',
      imageStyle: 'illustration',
      globalInstructions: 'Use British English',
    };

    const { getByDisplayValue, getByText } = render(
      <ContentPreferencesSection value={existingPrefs} onChange={mockOnChange} />
    );

    expect(getByDisplayValue('Listicle')).toBeDefined();
    expect(getByDisplayValue('5 links')).toBeDefined();
    expect(getByDisplayValue('#FF5733')).toBeDefined();
    expect(getByDisplayValue('Illustration')).toBeDefined();
    expect(getByText('Use British English')).toBeDefined();
  });

  it('should render color picker input', () => {
    const { container } = render(
      <ContentPreferencesSection value={CONTENT_PREFERENCES_DEFAULTS} onChange={mockOnChange} />
    );

    const colorPicker = container.querySelector('input[type="color"]');
    expect(colorPicker).toBeDefined();
    // Browser normalizes hex colors to lowercase
    expect((colorPicker as HTMLInputElement).value.toLowerCase()).toBe('#4F46E5'.toLowerCase());
  });
});
