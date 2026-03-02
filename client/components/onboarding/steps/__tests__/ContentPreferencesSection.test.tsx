/**
 * ContentPreferencesSection Component Tests
 *
 * Tests that:
 * - Changing a form field calls the `onChange` prop with updated values
 * - The component correctly propagates all field changes to the parent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  ContentPreferencesSection,
  CONTENT_PREFERENCES_DEFAULTS,
} from '../ContentPreferencesSection';
import type { IContentPreferences } from '@shared/types/project.types';

// Mock lucide-react icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  Palette: ({ className }: { className?: string }) => <span className={className} data-icon="Palette" />,
  Image: ({ className }: { className?: string }) => <span className={className} data-icon="Image" />,
  FileText: ({ className }: { className?: string }) => <span className={className} data-icon="FileText" />,
  Link2: ({ className }: { className?: string }) => <span className={className} data-icon="Link2" />,
  Calendar: ({ className }: { className?: string }) => <span className={className} data-icon="Calendar" />,
  Zap: ({ className }: { className?: string }) => <span className={className} data-icon="Zap" />,
}));

// Mock zodResolver to avoid zod resolution issues in tests
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (data: unknown) => ({ values: data, errors: {} }),
}));

describe('ContentPreferencesSection', () => {
  const defaultValue: IContentPreferences = { ...CONTENT_PREFERENCES_DEFAULTS };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onChange when a field changes from default values', async () => {
    const mockOnChange = vi.fn();

    const { container } = render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    // Trigger a change to verify onChange propagates initial field values correctly
    const articleStyleSelect = container.querySelector('#article-style') as HTMLSelectElement;
    fireEvent.change(articleStyleSelect, { target: { value: 'informative' } }); // change to same value to trigger

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0] as IContentPreferences;
    expect(lastCall.articleStyle).toBe('informative');
    expect(lastCall.imageStyle).toBe(defaultValue.imageStyle);
  });

  it('calls onChange with updated articleStyle when the article style dropdown changes', async () => {
    const mockOnChange = vi.fn();

    render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    const articleStyleSelect = screen.getByRole('combobox', { name: /article style/i });
    fireEvent.change(articleStyleSelect, { target: { value: 'how-to' } });

    await waitFor(() => {
      const calls = mockOnChange.mock.calls;
      const lastCallArg = calls[calls.length - 1][0] as IContentPreferences;
      expect(lastCallArg.articleStyle).toBe('how-to');
    });
  });

  it('calls onChange with updated internalLinksCount when the internal links dropdown changes', async () => {
    const mockOnChange = vi.fn();

    render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    const internalLinksSelect = screen.getByRole('combobox', { name: /internal links/i });
    fireEvent.change(internalLinksSelect, { target: { value: '3' } });

    await waitFor(() => {
      const calls = mockOnChange.mock.calls;
      const lastCallArg = calls[calls.length - 1][0] as IContentPreferences;
      expect(lastCallArg.internalLinksCount).toBe(3);
    });
  });

  it('calls onChange with updated imageStyle when the image style dropdown changes', async () => {
    const mockOnChange = vi.fn();

    render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    const imageStyleSelect = screen.getByRole('combobox', { name: /image style/i });
    fireEvent.change(imageStyleSelect, { target: { value: 'watercolor' } });

    await waitFor(() => {
      const calls = mockOnChange.mock.calls;
      const lastCallArg = calls[calls.length - 1][0] as IContentPreferences;
      expect(lastCallArg.imageStyle).toBe('watercolor');
    });
  });

  it('calls onChange with updated globalInstructions when the textarea changes', async () => {
    const mockOnChange = vi.fn();

    render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    const textarea = screen.getByRole('textbox', { name: /global instructions/i });
    fireEvent.change(textarea, { target: { value: 'Use British English' } });

    await waitFor(() => {
      const calls = mockOnChange.mock.calls;
      const lastCallArg = calls[calls.length - 1][0] as IContentPreferences;
      expect(lastCallArg.globalInstructions).toBe('Use British English');
    });
  });

  it('passes all fields in every onChange call (not just the changed one)', async () => {
    const mockOnChange = vi.fn();

    render(<ContentPreferencesSection value={defaultValue} onChange={mockOnChange} />);

    const articleStyleSelect = screen.getByRole('combobox', { name: /article style/i });
    fireEvent.change(articleStyleSelect, { target: { value: 'tutorial' } });

    await waitFor(() => {
      const calls = mockOnChange.mock.calls;
      const lastCallArg = calls[calls.length - 1][0] as IContentPreferences;
      // All fields must be present
      expect(lastCallArg).toHaveProperty('articleStyle', 'tutorial');
      expect(lastCallArg).toHaveProperty('internalLinksCount');
      expect(lastCallArg).toHaveProperty('brandColor');
      expect(lastCallArg).toHaveProperty('imageStyle');
    });
  });
});
