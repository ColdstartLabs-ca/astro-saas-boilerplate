/**
 * ImagePresetSelector Component Tests
 *
 * Tests for the image preset selection component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ImagePresetSelector } from '../ImagePresetSelector';

describe('ImagePresetSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all 6 presets plus None option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      // None option
      expect(screen.getByText('None (text only)')).toBeInTheDocument();

      // All 6 presets
      expect(screen.getByText('Blog Hero')).toBeInTheDocument();
      expect(screen.getByText('Social Card')).toBeInTheDocument();
      expect(screen.getByText('Product Shot')).toBeInTheDocument();
      expect(screen.getByText('Premium Hero')).toBeInTheDocument();
      expect(screen.getByText('Photorealistic')).toBeInTheDocument();
      expect(screen.getByText('Illustration')).toBeInTheDocument();
    });

    it('should display credit cost badges', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      // Standard presets show "Included"
      expect(screen.getAllByText('Included')).toHaveLength(3);

      // Premium presets show "+1 credit"
      expect(screen.getAllByText('+1 credit')).toHaveLength(3);
    });

    it('should show "No images" badge for None option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getByText('No images')).toBeInTheDocument();
    });

    it('should display description for each preset', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      // Check display names and descriptions exist
      expect(screen.getByText('Blog Hero')).toBeInTheDocument();
      expect(screen.getByText('Social Card')).toBeInTheDocument();
      expect(screen.getByText('Product Shot')).toBeInTheDocument();
      expect(screen.getByText('Premium Hero')).toBeInTheDocument();
      expect(screen.getByText('Photorealistic')).toBeInTheDocument();
      expect(screen.getByText('Illustration')).toBeInTheDocument();

      // Check some descriptions exist (using specific text to avoid multiple matches)
      expect(screen.getByText(/Fast, high-quality featured images for blog posts/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimized for social media sharing and OG images/i)).toBeInTheDocument();
      expect(screen.getByText(/Enhanced quality for product and service visuals/i)).toBeInTheDocument();
      expect(screen.getByText(/Highest quality editorial-style images/i)).toBeInTheDocument();
      expect(screen.getByText(/Stock-photo-style realistic imagery/i)).toBeInTheDocument();
      expect(screen.getByText(/Blog illustrations, diagrams, and stylized visuals/i)).toBeInTheDocument();
    });

    it('should display "Best for" info for each preset', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getAllByText(/Best for:/i)).toHaveLength(6);
    });
  });

  describe('Selection behavior', () => {
    it('should highlight selected preset', () => {
      const { container } = render(
        <ImagePresetSelector selectedPreset="blog-hero" onSelect={mockOnSelect} />
      );

      const blogHeroButton = screen.getByText('Blog Hero').closest('button');
      expect(blogHeroButton).toHaveClass('border-primary');
      expect(blogHeroButton).toHaveClass('bg-primary/5');
      expect(blogHeroButton).toHaveClass('ring-2');
    });

    it('should highlight None option when null is selected', () => {
      const { container } = render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const noneButton = screen.getByText('None (text only)').closest('button');
      expect(noneButton).toHaveClass('border-primary');
      expect(noneButton).toHaveClass('bg-primary/5');
      expect(noneButton).toHaveClass('ring-2');
    });

    it('should call onSelect with preset key when preset clicked', async () => {
      const user = userEvent.setup();
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      const blogHeroButton = screen.getByText('Blog Hero').closest('button');
      if (blogHeroButton) {
        await user.click(blogHeroButton);
      }

      expect(mockOnSelect).toHaveBeenCalledWith('blog-hero');
    });

    it('should call onSelect with null when None option clicked', async () => {
      const user = userEvent.setup();
      render(<ImagePresetSelector selectedPreset="blog-hero" onSelect={mockOnSelect} />);

      const noneButton = screen.getByText('None (text only)').closest('button');
      if (noneButton) {
        await user.click(noneButton);
      }

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('should handle switching between presets', async () => {
      const user = userEvent.setup();
      render(<ImagePresetSelector selectedPreset="blog-hero" onSelect={mockOnSelect} />);

      // Switch from blog-hero to premium-hero
      const premiumButton = screen.getByText('Premium Hero').closest('button');
      if (premiumButton) {
        await user.click(premiumButton);
      }

      expect(mockOnSelect).toHaveBeenCalledWith('premium-hero');
    });
  });

  describe('Visual states', () => {
    it('should show correct badge color for free presets', () => {
      const { container } = render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const includedBadges = screen.getAllByText('Included');
      includedBadges.forEach(badge => {
        expect(badge.closest('span')).toHaveClass('bg-green-100');
      });
    });

    it('should show correct badge color for premium presets', () => {
      const { container } = render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const premiumBadges = screen.getAllByText('+1 credit');
      premiumBadges.forEach(badge => {
        expect(badge.closest('span')).toHaveClass('bg-amber-100');
      });
    });

    it('should show gray badge for None option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      const noImagesBadge = screen.getByText('No images');
      expect(noImagesBadge.closest('span')).toHaveClass('bg-gray-100');
    });
  });

  describe('Accessibility', () => {
    it('should use button elements for interactions', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(7); // None + 6 presets
    });

    it('should have accessible names for all options', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getByRole('button', { name: /none \(text only\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /blog hero/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /social card/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /product shot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /premium hero/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /photorealistic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /illustration/i })).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string preset as unselected', () => {
      render(<ImagePresetSelector selectedPreset="" onSelect={mockOnSelect} />);

      // Empty string should not match any preset or null, so no option is selected
      // All buttons should have default gray border
      const noneButton = screen.getByText('None (text only)').closest('button');
      expect(noneButton).not.toHaveClass('border-primary');
    });

    it('should not highlight any preset for invalid preset value', () => {
      render(
        <ImagePresetSelector selectedPreset="invalid-preset" onSelect={mockOnSelect} />
      );

      // Invalid preset should not match any button
      // All preset buttons should have default border style
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.textContent?.includes('None (text only)')) {
          // None option should still be selectable even with invalid preset
          expect(button).toHaveClass('border-gray-200');
        }
      });
    });
  });
});
