import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ArticleCompleteEmail } from '@/emails/templates/ArticleCompleteEmail';

describe('ArticleCompleteEmail', () => {
  describe('should render ArticleCompleteEmail with all props', () => {
    it('renders without errors with full props', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          userName: 'John Doe',
          articleTitle: '10 Best SEO Practices',
          keyword: 'SEO best practices',
          campaignName: 'Q1 Content Campaign',
          dashboardUrl: 'https://example.com/dashboard/articles/123',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
          appName: 'AutopilotRank',
        })
      );

      expect(container).toBeDefined();
    });

    it('contains articleTitle in the rendered output', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          articleTitle: '10 Best SEO Practices',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('10 Best SEO Practices');
    });

    it('contains keyword in the rendered output', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          keyword: 'SEO best practices',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('SEO best practices');
    });

    it('contains campaign name when provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          campaignName: 'Q1 Content Campaign',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Q1 Content Campaign');
    });

    it('contains userName in greeting', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          userName: 'Jane',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Hi Jane');
    });

    it('contains Review Article CTA button', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          dashboardUrl: 'https://example.com/articles/123',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Review Article');
      expect(html).toContain('https://example.com/articles/123');
    });
  });

  describe('should render ArticleCompleteEmail with minimal props', () => {
    it('renders with only required props (baseUrl, supportEmail)', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      expect(container).toBeDefined();
    });

    it('renders without errors when optional props are undefined', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          userName: undefined,
          articleTitle: undefined,
          keyword: undefined,
          campaignName: undefined,
          dashboardUrl: undefined,
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
          appName: undefined,
        })
      );

      expect(container).toBeDefined();
    });

    it('uses default appName when not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('AutopilotRank');
    });

    it('uses default userName when not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Hi there');
    });

    it('uses default articleTitle when not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('New Article');
    });

    it('uses baseUrl for dashboard link when dashboardUrl not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('https://example.com/dashboard');
    });

    it('does not show keyword section when keyword is not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          keyword: undefined,
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).not.toContain('Target keyword:');
    });

    it('does not show campaign section when campaignName is not provided', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          campaignName: undefined,
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).not.toContain('Campaign:');
    });

    it('includes support email in footer', () => {
      const { container } = render(
        React.createElement(ArticleCompleteEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'help@test.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('help@test.com');
    });
  });
});
