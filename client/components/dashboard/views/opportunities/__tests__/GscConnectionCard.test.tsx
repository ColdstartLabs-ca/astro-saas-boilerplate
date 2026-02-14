/**
 * GscConnectionCard Component Tests
 * Tests for the three connection states: not connected, connected, and error
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GscConnectionCard } from '../GscConnectionCard';
import type { IGscConnectionSafe, IGscSite } from '@shared/types/opportunity.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Search" />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ExternalLink" />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CheckCircle2" />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertCircle" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertTriangle" />
  ),
  Unlink: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Unlink" />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ChevronDown" />
  ),
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Globe" />
  ),
  Zap: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Zap" />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <span className={className} data-icon="TrendingUp" />
  ),
  FileText: ({ className }: { className?: string }) => (
    <span className={className} data-icon="FileText" />
  ),
  Clock: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Clock" />
  ),
  Settings: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Settings" />
  ),
}));

// Mock translations
const mockTranslations: Record<string, string> = {
  'opportunities.gsc.connect': 'Connect Google Search Console',
  'opportunities.gsc.connectDescription':
    'Link your Google Search Console account to discover SEO opportunities.',
  'opportunities.gsc.freeNote': 'Free — no credits required',
  'opportunities.gsc.connected': 'Connected',
  'opportunities.gsc.disconnected': 'Disconnected',
  'opportunities.gsc.error': 'Connection Error',
  'opportunities.gsc.reconnect': 'Reconnect',
  'opportunities.gsc.disconnect': 'Disconnect',
  'opportunities.gsc.disconnectConfirm':
    'Are you sure you want to disconnect Google Search Console?',
  'opportunities.gsc.selectSite': 'Select a site to monitor',
  'opportunities.gsc.lastSynced': 'Last synced',
  'opportunities.gsc.noSites': 'No verified sites found in your Google Search Console account',
  'opportunities.gsc.warningTitle': 'GSC Connection Required',
  'opportunities.gsc.warningDescription': 'Connect Google Search Console to unlock full opportunity features:',
  'opportunities.gsc.warningFeature1': 'AI-powered opportunity detection',
  'opportunities.gsc.warningFeature2': 'Performance tracking for created articles',
  'opportunities.gsc.warningFeature3': 'GSC-optimized article generation prompts',
  'opportunities.gsc.warningNote': 'You can still create articles from opportunities without GSC, but they won\'t have GSC-optimized prompts or performance tracking.',
};

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

// Mock dayjs
vi.mock('dayjs', () => {
  const dayjsMock = () => ({
    fromNow: () => '5 minutes ago',
  });
  dayjsMock.extend = () => {};
  return { default: dayjsMock };
});

describe('GscConnectionCard', () => {
  const defaultProps = {
    connection: null,
    isLoading: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onSelectSite: vi.fn(),
    sites: [] as IGscSite[],
  };

  const activeConnection: IGscConnectionSafe = {
    id: 'conn-1',
    project_id: 'proj-1',
    google_email: 'user@example.com',
    site_url: 'https://example.com/',
    last_synced_at: '2026-02-10T12:00:00Z',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  };

  const errorConnection: IGscConnectionSafe = {
    id: 'conn-2',
    project_id: 'proj-1',
    google_email: 'user@example.com',
    site_url: null,
    last_synced_at: null,
    status: 'error',
    created_at: '2026-01-01T00:00:00Z',
  };

  describe('Not Connected State', () => {
    it('should render the connect CTA when no connection exists', () => {
      const { container } = render(<GscConnectionCard {...defaultProps} />);

      expect(container.textContent).toContain('Connect Google Search Console');
      expect(container.textContent).toContain('Link your Google Search Console account');
      expect(container.textContent).toContain('Free — no credits required');
    });

    it('should call onConnect when the connect button is clicked', () => {
      const onConnect = vi.fn();
      const { container } = render(<GscConnectionCard {...defaultProps} onConnect={onConnect} />);

      const buttons = container.querySelectorAll('button');
      const connectButton = Array.from(buttons).find(btn =>
        btn.textContent?.includes('Connect Google Search Console')
      );
      expect(connectButton).toBeTruthy();
      fireEvent.click(connectButton!);
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connected State', () => {
    it('should render connected status with email and site URL', () => {
      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={activeConnection} />
      );

      expect(container.textContent).toContain('Connected');
      expect(container.textContent).toContain('user@example.com');
      expect(container.textContent).toContain('https://example.com/');
    });

    it('should render last synced time', () => {
      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={activeConnection} />
      );

      expect(container.textContent).toContain('Last synced');
      expect(container.textContent).toContain('5 minutes ago');
    });

    it('should show disconnect confirmation when disconnect is clicked', () => {
      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={activeConnection} />
      );

      // Find the disconnect link
      const disconnectButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Disconnect')
      );
      expect(disconnectButton).toBeTruthy();
      fireEvent.click(disconnectButton!);

      // Should show confirmation text
      expect(container.textContent).toContain('Are you sure you want to disconnect');
    });

    it('should show site selector when no site is selected', () => {
      const connectionNoSite: IGscConnectionSafe = {
        ...activeConnection,
        site_url: null,
      };

      const sites: IGscSite[] = [
        { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
        { siteUrl: 'https://blog.example.com/', permissionLevel: 'siteFullUser' },
      ];

      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={connectionNoSite} sites={sites} />
      );

      expect(container.textContent).toContain('Select a site to monitor');
    });
  });

  describe('Error State', () => {
    it('should render error state with reconnect button', () => {
      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={errorConnection} />
      );

      expect(container.textContent).toContain('Connection Error');
      expect(container.textContent).toContain('Reconnect');
      expect(container.textContent).toContain('user@example.com');
    });

    it('should call onConnect when reconnect is clicked', () => {
      const onConnect = vi.fn();
      const { container } = render(
        <GscConnectionCard {...defaultProps} connection={errorConnection} onConnect={onConnect} />
      );

      const reconnectButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Reconnect')
      );
      expect(reconnectButton).toBeTruthy();
      fireEvent.click(reconnectButton!);
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      const { container } = render(<GscConnectionCard {...defaultProps} isLoading={true} />);

      // Should have animate-pulse class
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });
  });
});
