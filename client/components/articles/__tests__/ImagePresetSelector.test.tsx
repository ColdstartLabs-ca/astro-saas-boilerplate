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
    it('should render all 6 presets plus No images option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      // None option
      expect(screen.getByText('No images')).toBeInTheDocument();

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

    it('should show "Free" badge for No images option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('should display description for each preset', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      // Check descriptions exist
      expect(screen.getByText(/Fast, high-quality featured images for blog posts/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimized for social media sharing and OG images/i)).toBeInTheDocument();
      expect(screen.getByText(/Enhanced quality for product and service visuals/i)).toBeInTheDocument();
      expect(screen.getByText(/Highest quality editorial-style images/i)).toBeInTheDocument();
      expect(screen.getByText(/Stock-photo-style realistic imagery/i)).toBeInTheDocument();
      expect(screen.getByText(/Blog illustrations, diagrams, and stylized visuals/i)).toBeInTheDocument();
    });

    it('should display "bestFor" info for each preset', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getByText(/Featured images, hero banners/i)).toBeInTheDocument();
      expect(screen.getByText(/OG images, social sharing/i)).toBeInTheDocument();
      expect(screen.getByText(/Product\/service visuals/i)).toBeInTheDocument();
      expect(screen.getByText(/High-quality editorial/i)).toBeInTheDocument();
      expect(screen.getByText(/Stock-photo-style imagery/i)).toBeInTheDocument();
      expect(screen.getByText('Blog illustrations, diagrams')).toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    it('should highlight selected preset', () => {
      render(
        <ImagePresetSelector selectedPreset="blog-hero" onSelect={mockOnSelect} />
      );

      const blogHeroButton = screen.getByText('Blog Hero').closest('button');
      expect(blogHeroButton).toHaveClass('border-accent');
      expect(blogHeroButton).toHaveClass('bg-accent/10');
      expect(blogHeroButton).toHaveClass('ring-1');
    });

    it('should highlight No images option when null is selected', () => {
      render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const noneButton = screen.getByText('No images').closest('button');
      expect(noneButton).toHaveClass('border-accent');
      expect(noneButton).toHaveClass('bg-accent/10');
      expect(noneButton).toHaveClass('ring-1');
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

    it('should call onSelect with null when No images option clicked', async () => {
      const user = userEvent.setup();
      render(<ImagePresetSelector selectedPreset="blog-hero" onSelect={mockOnSelect} />);

      const noneButton = screen.getByText('No images').closest('button');
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
      render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const includedBadges = screen.getAllByText('Included');
      includedBadges.forEach(badge => {
        expect(badge.closest('span')).toHaveClass('bg-green-500/10');
      });
    });

    it('should show correct badge color for premium presets', () => {
      render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />
      );

      const premiumBadges = screen.getAllByText('+1 credit');
      premiumBadges.forEach(badge => {
        expect(badge.closest('span')).toHaveClass('bg-amber-500/10');
      });
    });

    it('should show surface-light badge for Free option', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      const freeBadge = screen.getByText('Free');
      expect(freeBadge.closest('span')).toHaveClass('bg-surface-light');
    });
  });

  describe('Accessibility', () => {
    it('should use button elements for interactions', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(7); // No images + 6 presets
    });

    it('should have accessible names for all options', () => {
      render(<ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} />);

      expect(screen.getByRole('button', { name: /no images/i })).toBeInTheDocument();
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

      // Empty string should not match null, so "No images" should have default border
      const noneButton = screen.getByText('No images').closest('button');
      expect(noneButton).not.toHaveClass('border-accent');
    });

    it('should not highlight any preset for invalid preset value', () => {
      render(
        <ImagePresetSelector selectedPreset="invalid-preset" onSelect={mockOnSelect} />
      );

      // Invalid preset should not match any button - all should have default border
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('border-border');
      });
    });
  });
});
