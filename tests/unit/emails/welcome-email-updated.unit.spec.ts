import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { WelcomeEmail } from '@/emails/templates/WelcomeEmail';

describe('WelcomeEmail - Updated for AutopilotRank', () => {
  describe('should render updated WelcomeEmail with AutopilotRank content', () => {
    it('renders without errors with default props', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      expect(container).toBeDefined();
    });

    it('contains "3 steps" quick-start content', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('3 steps');
    });

    it('contains "SEO article" content', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('SEO article');
    });

    it('does NOT contain "upscaling" references', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML.toLowerCase();
      expect(html).not.toContain('upscaling');
    });

    it('contains step 1: Create a project', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Create a project');
      expect(html).toContain('connect your site');
    });

    it('contains step 2: Add keywords', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Add your target keywords');
    });

    it('contains step 3: Hit Generate', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Hit Generate');
    });

    it('contains "3 free articles" offer', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('3 free articles');
    });

    it('contains "no credit card" messaging', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('no credit card');
    });

    it('contains "Create Your First Article" CTA when no verifyUrl', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Create Your First Article');
    });

    it('CTA links to dashboard', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://testapp.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('https://testapp.com/dashboard');
    });

    it('uses default appName as AutopilotRank', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('AutopilotRank');
    });

    it('allows custom appName override', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
          appName: 'CustomApp',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('CustomApp');
    });

    it('shows Verify Email button when verifyUrl is provided', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          verifyUrl: 'https://example.com/verify?token=123',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Verify Email');
    });

    it('includes userName in greeting', () => {
      const { container } = render(
        React.createElement(WelcomeEmail, {
          userName: 'Alice',
          baseUrl: 'https://example.com',
          supportEmail: 'support@example.com',
        })
      );

      const html = container.innerHTML;
      expect(html).toContain('Hi Alice');
    });
  });
});
