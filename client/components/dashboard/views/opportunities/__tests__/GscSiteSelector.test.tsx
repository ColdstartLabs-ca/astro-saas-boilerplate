/**
 * GscSiteSelector Component Tests
 * Tests for the site selection dropdown behavior
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GscSiteSelector } from '../GscSiteSelector';
import type { IGscSite } from '@shared/types/opportunity.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ChevronDown" />
  ),
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Globe" />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
}));

// Mock translations
const mockTranslations: Record<string, string> = {
  'opportunities.gsc.selectSite': 'Select a site to monitor',
  'opportunities.gsc.noSites': 'No verified sites found in your Google Search Console account',
};

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

// Mock DashboardButton
vi.mock('../../../ui/DashboardButton', () => ({
  DashboardButton: ({
    children,
    onClick,
    disabled,
    ..._rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid="confirm-btn">
      {children}
    </button>
  ),
}));

describe('GscSiteSelector', () => {
  const defaultSites: IGscSite[] = [
    { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
    { siteUrl: 'https://blog.example.com/', permissionLevel: 'siteFullUser' },
  ];

  const defaultProps = {
    sites: defaultSites,
    selectedSiteUrl: null,
    onSelectSite: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render the label and select element', () => {
      const { container } = render(<GscSiteSelector {...defaultProps} />);

      expect(container.textContent).toContain('Select a site to monitor');
      const select = container.querySelector('select');
      expect(select).toBeTruthy();
    });

    it('should render all sites as options', () => {
      const { container } = render(<GscSiteSelector {...defaultProps} />);

      const options = container.querySelectorAll('option');
      // One default placeholder + two sites
      expect(options.length).toBe(3);
      expect(options[1].textContent).toContain('https://example.com/');
      expect(options[1].textContent).toContain('siteOwner');
      expect(options[2].textContent).toContain('https://blog.example.com/');
      expect(options[2].textContent).toContain('siteFullUser');
    });

    it('should show no sites message when sites array is empty', () => {
      const { container } = render(<GscSiteSelector {...defaultProps} sites={[]} />);

      expect(container.textContent).toContain('No verified sites found');
    });
  });

  describe('Selection', () => {
    it('should show confirm button when a site is selected and differs from current', () => {
      const { container } = render(<GscSiteSelector {...defaultProps} />);

      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: 'https://example.com/' } });

      const confirmBtn = container.querySelector('[data-testid="confirm-btn"]');
      expect(confirmBtn).toBeTruthy();
      expect(confirmBtn?.textContent).toContain('Confirm');
    });

    it('should call onSelectSite when confirm button is clicked', () => {
      const onSelectSite = vi.fn();
      const { container } = render(
        <GscSiteSelector {...defaultProps} onSelectSite={onSelectSite} />
      );

      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: 'https://example.com/' } });

      const confirmBtn = container.querySelector('[data-testid="confirm-btn"]');
      fireEvent.click(confirmBtn!);

      expect(onSelectSite).toHaveBeenCalledWith('https://example.com/');
    });

    it('should not show confirm button when selected site matches current', () => {
      const { container } = render(
        <GscSiteSelector {...defaultProps} selectedSiteUrl="https://example.com/" />
      );

      const confirmBtn = container.querySelector('[data-testid="confirm-btn"]');
      expect(confirmBtn).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should disable select when loading', () => {
      const { container } = render(<GscSiteSelector {...defaultProps} isLoading={true} />);

      const select = container.querySelector('select');
      expect(select?.disabled).toBe(true);
    });
  });
});
