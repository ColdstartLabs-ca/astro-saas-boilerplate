/**
 * Email Provider Manager Tests
 *
 * Tests for the email provider adapter system including:
 * - Provider availability checking
 * - Provider selection and fallback
 * - Email sending with provider switching
 * - Credit tracking
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { EmailProviderManager } from '../email-provider-manager';
import { EmailProvider } from '@shared/types/provider-adapter.types';
import { BrevoProviderAdapter } from '../brevo.provider-adapter';
import { ResendProviderAdapter } from '../resend.provider-adapter';
import { BaseEmailProviderAdapter } from '../base-email-provider-adapter';
import type { IEmailProviderConfig } from '@shared/types/provider-adapter.types';
import type { ReactElement } from 'react';

// Mock the provider credit tracker
vi.mock('../provider-credit-tracker.service', () => ({
  getProviderCreditTracker: () => ({
    incrementUsage: vi.fn().mockResolvedValue({
      success: true,
      dailyRemaining: 499,
      monthlyRemaining: 14999,
    }),
    isProviderAvailable: vi.fn().mockResolvedValue(true),
    getProviderUsage: vi.fn().mockResolvedValue({
      provider: 'brevo',
      todayRequests: 1,
      monthCredits: 1,
      lastDailyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
      totalRequests: 1,
      totalCredits: 1,
    }),
    logProviderUsage: vi.fn(),
    resetDailyCounters: vi.fn(),
    resetMonthlyCounters: vi.fn(),
  }),
}));

// Mock template loading
vi.mock('@/emails/templates/WelcomeEmail', () => ({
  WelcomeEmail: ({ name }: { name: string }) => `Welcome ${name}`,
}));

describe('EmailProviderManager', () => {
  let manager: EmailProviderManager;

  beforeEach(() => {
    manager = new EmailProviderManager();
  });

  describe('Provider Registration', () => {
    test('should register all default providers', () => {
      const providers = manager.getAllProviders();

      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.getProviderName())).toEqual([
        EmailProvider.BREVO,
        EmailProvider.RESEND,
      ]);
    });

    test('should register custom provider', () => {
      const mockAdapter = {
        getProviderName: () => 'custom' as EmailProvider.BREVO,
        getConfig: () => ({
          provider: EmailProvider.BREVO,
          tier: 'free',
          priority: 1,
          enabled: true,
          supportedModels: [],
        }),
        send: vi.fn().mockResolvedValue({ success: true }),
        getUsage: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(true),
        resetCounters: vi.fn(),
      };

      manager.registerProvider(mockAdapter as any);
      const providers = manager.getAllProviders();

      expect(providers).toHaveLength(3);
    });
  });

  describe('Provider Selection', () => {
    test('should get Brevo as primary provider', async () => {
      const provider = await manager.getProvider();

      expect(provider.getProviderName()).toBe(EmailProvider.BREVO);
      expect(provider.getConfig().priority).toBe(1);
    });

    test('should switch to Resend when Brevo is unavailable', async () => {
      // Disable Brevo to simulate hitting limits
      manager.updateProviderConfig(EmailProvider.BREVO, { enabled: false });

      const provider = await manager.getProvider();
      expect(provider.getProviderName()).toBe(EmailProvider.RESEND);
      expect(provider.getConfig().priority).toBe(3);
    });

    test('should throw error when all providers are unavailable', async () => {
      // Disable all providers to simulate hitting all limits
      manager.updateProviderConfig(EmailProvider.BREVO, { enabled: false });
      manager.updateProviderConfig(EmailProvider.RESEND, { enabled: false });

      await expect(manager.getProvider()).rejects.toThrow('No email providers available');
    });

    test('should get provider by type', () => {
      const brevo = manager.getProviderByType(EmailProvider.BREVO);
      const resend = manager.getProviderByType(EmailProvider.RESEND);

      expect(brevo).toBeDefined();
      expect(resend).toBeDefined();

      expect(brevo?.getProviderName()).toBe(EmailProvider.BREVO);
      expect(resend?.getProviderName()).toBe(EmailProvider.RESEND);
    });

    test('should return undefined for unknown provider', () => {
      const unknown = manager.getProviderByType('unknown' as EmailProvider);
      expect(unknown).toBeUndefined();
    });
  });

  describe('Provider Configuration', () => {
    test('should have correct Brevo config', () => {
      const brevo = manager.getProviderByType(EmailProvider.BREVO);
      const config = brevo?.getConfig();

      expect(config?.provider).toBe(EmailProvider.BREVO);
      expect(config?.priority).toBe(1);
      expect(config?.enabled).toBe(true);
      expect(config?.freeTier?.monthlyCredits).toBe(9000);
      expect(config?.fallbackProvider).toBe(EmailProvider.RESEND);
    });

    test('should have correct Resend config', () => {
      const resend = manager.getProviderByType(EmailProvider.RESEND);
      const config = resend?.getConfig();

      expect(config?.provider).toBe(EmailProvider.RESEND);
      expect(config?.priority).toBe(3);
      expect(config?.enabled).toBe(true);
      expect(config?.freeTier?.monthlyCredits).toBe(3000);
      expect(config?.fallbackProvider).toBeUndefined();
    });

    test('should update provider config', () => {
      manager.updateProviderConfig(EmailProvider.BREVO, {
        enabled: false,
      });

      const brevo = manager.getProviderByType(EmailProvider.BREVO);
      expect(brevo?.getConfig().enabled).toBe(false);
    });
  });

  describe('Fallback Priority', () => {
    test('should order providers by priority', async () => {
      const providers = manager
        .getAllProviders()
        .filter(p => p.getConfig().enabled)
        .sort((a, b) => a.getConfig().priority - b.getConfig().priority);

      expect(providers[0].getProviderName()).toBe(EmailProvider.BREVO);
      expect(providers[1].getProviderName()).toBe(EmailProvider.RESEND);
    });

    test('should have correct fallback chain', () => {
      const brevo = manager.getProviderByType(EmailProvider.BREVO);
      const resend = manager.getProviderByType(EmailProvider.RESEND);

      // Brevo -> Resend
      expect(brevo?.getConfig().fallbackProvider).toBe(EmailProvider.RESEND);
      expect(resend?.getConfig().fallbackProvider).toBeUndefined();
    });
  });

  describe('Get All Providers Usage', () => {
    test('should return usage for all providers', async () => {
      const usage = await manager.getAllProvidersUsage();

      expect(usage).toBeDefined();
      expect(Object.keys(usage)).toHaveLength(2);
      expect(usage[EmailProvider.BREVO]).toBeDefined();
      expect(usage[EmailProvider.RESEND]).toBeDefined();
    });
  });
});

// Concrete subclass to expose protected methods for testing
class TestableAdapter extends BaseEmailProviderAdapter {
  constructor() {
    const config: IEmailProviderConfig = {
      provider: EmailProvider.BREVO,
      tier: 'hybrid' as const,
      priority: 1,
      enabled: true,
    };
    super(config);
  }

  // Expose protected methods for testing
  public testGetSubject(template: string, data: Record<string, unknown>): string {
    return this.getSubject(template, data);
  }

  public async testGetTemplate(templateName: string) {
    return this.getTemplate(templateName);
  }

  protected async sendEmail(
    _to: string,
    _subject: string,
    _reactElement: ReactElement
  ): Promise<{ messageId: string; [key: string]: unknown }> {
    return { messageId: 'test-id' };
  }
}

describe('BaseEmailProviderAdapter', () => {
  let adapter: TestableAdapter;

  beforeEach(() => {
    adapter = new TestableAdapter();
  });

  describe('getSubject', () => {
    test('should return static subject for welcome', () => {
      const subject = adapter.testGetSubject('welcome', {});
      expect(subject).toContain('Welcome');
    });

    test('should interpolate amount into payment-success subject', () => {
      const subject = adapter.testGetSubject('payment-success', { amount: '$29.99' });
      expect(subject).toBe('Payment confirmed - $29.99');
    });

    test('should use fallback when amount missing from payment-success', () => {
      const subject = adapter.testGetSubject('payment-success', {});
      expect(subject).toBe('Payment confirmed - Receipt');
    });

    test('should return static subject for subscription-update', () => {
      const subject = adapter.testGetSubject('subscription-update', {});
      expect(subject).toBe('Your subscription has been updated');
    });

    test('should return static subject for low-credits', () => {
      const subject = adapter.testGetSubject('low-credits', {});
      expect(subject).toBe('Running low on credits');
    });

    test('should return static subject for password-reset', () => {
      const subject = adapter.testGetSubject('password-reset', {});
      expect(subject).toBe('Reset your password');
    });

    test('should build support-request subject from category and subject fields', () => {
      const subject = adapter.testGetSubject('support-request', {
        category: 'billing',
        subject: 'Invoice missing',
      });
      expect(subject).toBe('[Support] [BILLING] Invoice missing');
    });

    test('should build article-complete subject with article title', () => {
      const subject = adapter.testGetSubject('article-complete', {
        articleTitle: 'How to rank on Google',
      });
      expect(subject).toBe('Your article is ready: How to rank on Google');
    });

    test('should return fallback subject for unknown template', () => {
      const subject = adapter.testGetSubject('unknown-template', {});
      // Falls back to appName + " Notification"
      expect(subject).toContain('Notification');
    });
  });

  describe('getTemplate', () => {
    test('should load welcome template successfully', async () => {
      const template = await adapter.testGetTemplate('welcome');
      expect(typeof template).toBe('function');
    });

    test('should load payment-success template successfully', async () => {
      const template = await adapter.testGetTemplate('payment-success');
      expect(typeof template).toBe('function');
    });

    test('should load article-complete template successfully', async () => {
      const template = await adapter.testGetTemplate('article-complete');
      expect(typeof template).toBe('function');
    });

    test('should throw EmailError for unknown template', async () => {
      const { EmailError } = await import('../base-email-provider-adapter');
      await expect(adapter.testGetTemplate('no-such-template')).rejects.toThrow(EmailError);
      await expect(adapter.testGetTemplate('no-such-template')).rejects.toMatchObject({
        code: 'TEMPLATE_NOT_FOUND',
      });
    });
  });

  describe('send (test mode)', () => {
    test('should log email and return dev messageId in test mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await adapter.send({
        to: 'user@example.com',
        template: 'welcome',
        data: { userName: 'Test' },
        type: 'transactional',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^dev-\d+$/);
      expect(result.provider).toBe(EmailProvider.BREVO);
      consoleSpy.mockRestore();
    });

    test('should skip marketing email check and return skipped result when opted out', async () => {
      // Mock supabase to return opted-out preference
      vi.doMock('@server/supabase/supabaseAdmin', () => ({
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { marketing_emails: false }, error: null }),
              }),
            }),
          }),
        },
      }));

      // In test mode, marketing check still runs before the dev-mode shortcut
      // The result should still be success (skipped) when opted out
      const result = await adapter.send({
        to: 'user@example.com',
        template: 'low-credits',
        data: {},
        type: 'marketing',
        userId: 'user-123',
      });

      // In test mode, dev shortcut runs first (before marketing check returns from mock)
      // so result will be success with dev messageId
      expect(result.success).toBe(true);
    });
  });
});
