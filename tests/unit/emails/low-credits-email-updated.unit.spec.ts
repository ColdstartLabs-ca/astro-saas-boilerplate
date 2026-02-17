import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { LowCreditsEmail } from '@/emails/templates/LowCreditsEmail';

describe('LowCreditsEmail - Updated for AutopilotRank', () => {
  describe('should render updated LowCreditsEmail with article context', () => {
    it('renders without errors with default props', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      expect(container).toBeDefined();
    });

    it('contains "articles" not "upscaling images"', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML.toLowerCase();
      expect(html).not.toContain('upscaling images');
      expect(html).toContain('articles');
    });

    it('contains "generating SEO-optimized articles"', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('generating SEO-optimized articles');
    });

    it('displays plan credits context when provided', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          creditsRemaining: 5,
          planCredits: 30,
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('5 of your 30 monthly credits remaining');
    });

    it('displays simple credits remaining when planCredits not provided', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          creditsRemaining: 5,
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('5 credits remaining');
    });

    it('contains upgrade messaging', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Upgrade to get more articles per month');
    });

    it('contains credit pack upsell', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('buy a credit pack');
    });

    it('contains "Upgrade Plan" CTA button', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Upgrade Plan');
    });

    it('contains "Buy Credits" CTA button', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Buy Credits');
    });

    it('Upgrade Plan button links to pricing page', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://testapp.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('https://testapp.com/pricing');
    });

    it('Buy Credits button links to billing view', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://testapp.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('https://testapp.com/dashboard?view=billing');
    });

    it('uses default appName as AutopilotRank', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('AutopilotRank');
    });

    it('allows custom appName override', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
          appName: 'CustomApp',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('CustomApp');
    });

    it('includes userName in greeting', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          userName: 'Bob',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Hi Bob');
    });

    it('uses custom upgradeUrl when provided', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          upgradeUrl: 'https://custom.com/upgrade',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('https://custom.com/upgrade');
    });

    it('includes support email in footer', () => {
      const { container } = render(
        React.createElement(LowCreditsEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'help@test.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('help@test.com');
    });
  });
});
