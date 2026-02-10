import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImagePresetSelector } from '@client/components/articles/ImagePresetSelector';
import { IImagePreset } from '@shared/config/image-models.config';

// Mock the getImagePresetCreditCost function
vi.mock('@shared/config/image-models.config', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/config/image-models.config')>();
  return {
    ...actual,
    getImagePresetCreditCost: vi.fn((key: string | null | undefined) => {
      if (!key) return 0;
      // Mock credit costs based on preset key
      if (key === 'blog-hero' || key === 'social-card' || key === 'product-shot') return 0;
      return 1;
    }),
  };
});

import { getImagePresetCreditCost } from '@shared/config/image-models.config';

const mockGetImagePresetCreditCost = vi.mocked(getImagePresetCreditCost);

// Helper to create mock preset
const createMockPreset = (key: string, overrides?: Partial<IImagePreset>): IImagePreset => ({
  key: key as IImagePreset['key'],
  displayName: `${key} Display Name`,
  description: `Description for ${key}`,
  bestFor: `Best for ${key}`,
  replicateModel: `org/${key}-model`,
  defaultParams: {},
  creditCost: key === 'blog-hero' || key === 'social-card' || key === 'product-shot' ? 0 : 1,
  aspectRatio: '16:9',
  ...overrides,
});

describe('ImagePresetSelector', () => {
  const mockOnSelect = vi.fn();
  const defaultPresets: IImagePreset[] = [
    createMockPreset('blog-hero', {
      replicateModel: 'black-forest-labs/flux-schnell',
    }),
    createMockPreset('premium-hero', {
      replicateModel: 'black-forest-labs/flux-1.1-pro',
    }),
    createMockPreset('photorealistic', {
      replicateModel: 'bytedance/seedream-4.5',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the "No images" option', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('No images')).toBeInTheDocument();
      expect(screen.getByText('Text-only article')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('renders only available presets from props', () => {
      const limitedPresets: IImagePreset[] = [defaultPresets[0]]; // Only blog-hero
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={limitedPresets}
        />
      );

      // Should only show "No images" + one preset
      expect(screen.getByText('No images')).toBeInTheDocument();
      expect(screen.getByText('blog-hero Display Name')).toBeInTheDocument();
      expect(screen.queryByText('premium-hero Display Name')).not.toBeInTheDocument();
      expect(screen.queryByText('photorealistic Display Name')).not.toBeInTheDocument();
    });

    it('renders all available presets when multiple are provided', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('blog-hero Display Name')).toBeInTheDocument();
      expect(screen.getByText('premium-hero Display Name')).toBeInTheDocument();
      expect(screen.getByText('photorealistic Display Name')).toBeInTheDocument();
    });

    it('renders empty preset list without crashing', () => {
      render(
        <ImagePresetSelector selectedPreset={null} onSelect={mockOnSelect} availablePresets={[]} />
      );

      expect(screen.getByText('No images')).toBeInTheDocument();
    });
  });

  describe('Preset information display', () => {
    it('shows preset display name', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('blog-hero Display Name')).toBeInTheDocument();
    });

    it('shows preset description', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('Description for blog-hero')).toBeInTheDocument();
    });

    it('shows "best for" text', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('Best for blog-hero')).toBeInTheDocument();
    });

    it('shows replicate model name extracted from full path', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      // Should extract "flux-schnell" from "black-forest-labs/flux-schnell"
      expect(screen.getByText('flux-schnell')).toBeInTheDocument();
      // Should extract "flux-1.1-pro" from "black-forest-labs/flux-1.1-pro"
      expect(screen.getByText('flux-1.1-pro')).toBeInTheDocument();
      // Should extract "seedream-4.5" from "bytedance/seedream-4.5"
      expect(screen.getByText('seedream-4.5')).toBeInTheDocument();
    });

    it('handles model name without slash (uses full string)', () => {
      const presetWithoutSlash = createMockPreset('illustration', {
        replicateModel: 'recraft-v3', // No slash
      });
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={[presetWithoutSlash]}
        />
      );

      expect(screen.getByText('recraft-v3')).toBeInTheDocument();
    });

    it('shows credit cost badge for paid presets', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getAllByText('+1 credit').length).toBeGreaterThan(0);
    });

    it('shows included badge for free presets', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      expect(screen.getByText('Included')).toBeInTheDocument();
    });
  });

  describe('Selection state', () => {
    it('highlights the selected preset', () => {
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const selectedButton = screen.getByText('blog-hero Display Name').closest('button');
      expect(selectedButton).toHaveClass(
        'border-accent',
        'bg-accent/10',
        'ring-1',
        'ring-accent/30'
      );
    });

    it('does not highlight unselected presets', () => {
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const unselectedButton = screen.getByText('premium-hero Display Name').closest('button');
      expect(unselectedButton).toHaveClass('border-border');
      expect(unselectedButton).not.toHaveClass('border-accent');
    });

    it('highlights "No images" when selected', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const noImagesButton = screen.getByText('No images').closest('button');
      expect(noImagesButton).toHaveClass(
        'border-accent',
        'bg-accent/10',
        'ring-1',
        'ring-accent/30'
      );
    });

    it('does not highlight "No images" when a preset is selected', () => {
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const noImagesButton = screen.getByText('No images').closest('button');
      expect(noImagesButton).toHaveClass('border-border');
      expect(noImagesButton).not.toHaveClass('border-accent');
    });
  });

  describe('User interactions', () => {
    it('calls onSelect with null when "No images" is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const noImagesButton = screen.getByText('No images');
      await user.click(noImagesButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('calls onSelect with preset key when preset is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const presetButton = screen.getByText('blog-hero Display Name');
      await user.click(presetButton);

      expect(mockOnSelect).toHaveBeenCalledWith('blog-hero');
    });

    it('allows changing selection from one preset to another', async () => {
      const user = userEvent.setup();
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const premiumButton = screen.getByText('premium-hero Display Name');
      await user.click(premiumButton);

      expect(mockOnSelect).toHaveBeenCalledWith('premium-hero');
    });

    it('allows switching from preset to "No images"', async () => {
      const user = userEvent.setup();
      render(
        <ImagePresetSelector
          selectedPreset="blog-hero"
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const noImagesButton = screen.getByText('No images');
      await user.click(noImagesButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('Credit badge styling', () => {
    it('applies correct styling for paid presets', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const paidBadges = screen.getAllByText('+1 credit');
      expect(paidBadges.length).toBeGreaterThan(0);
      paidBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
      });
    });

    it('applies correct styling for free presets', () => {
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={defaultPresets}
        />
      );

      const freeBadges = screen.getAllByText('Included');
      expect(freeBadges.length).toBeGreaterThan(0);
      freeBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-green-500/10', 'text-green-400', 'border-green-500/20');
      });
    });
  });

  describe('Edge cases', () => {
    it('handles preset with empty replicate model', () => {
      const presetWithEmptyModel = createMockPreset('test', {
        replicateModel: '',
      });
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={[presetWithEmptyModel]}
        />
      );

      // Should render without crashing - model name will be empty string
      expect(screen.getByText('test Display Name')).toBeInTheDocument();
    });

    it('handles preset with multiple slashes in replicate model', () => {
      const presetWithMultipleSlashes = createMockPreset('test', {
        replicateModel: 'org/sub-org/model-name',
      });
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={[presetWithMultipleSlashes]}
        />
      );

      // Should extract the last part after the last slash
      expect(screen.getByText('model-name')).toBeInTheDocument();
    });

    it('handles very long replicate model names', () => {
      const longModelName = 'very-long-organization-name/very-long-model-name-with-lots-of-words';
      const presetWithLongModel = createMockPreset('test', {
        replicateModel: longModelName,
      });
      render(
        <ImagePresetSelector
          selectedPreset={null}
          onSelect={mockOnSelect}
          availablePresets={[presetWithLongModel]}
        />
      );

      expect(screen.getByText('very-long-model-name-with-lots-of-words')).toBeInTheDocument();
    });
  });
});
