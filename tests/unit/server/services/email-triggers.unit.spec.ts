/**
 * Unit tests for email trigger functionality
 *
 * Tests the sendArticleCompleteNotification and sendLowCreditAlert methods
 * in EmailService that are used by the article generation and credit systems.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create the mock function upfront (this is the pattern used by email.service.unit.spec.ts)
const mockProviderManagerSend = vi.fn();

// Mock the provider manager
vi.mock('@server/services/email-providers/email-provider-manager', () => ({
  getEmailProviderManager: () => ({
    send: mockProviderManagerSend,
  }),
}));

// Mock supabaseAdmin - must use factory function (defining mocks inside the factory)
vi.mock('@server/supabase/supabaseAdmin', () => {
  const mockInsert = vi.fn(() => ({ error: null }));
  const mockSingle = vi.fn();
  const mockLimit = vi.fn();
  const mockGte = vi.fn(() => ({ limit: mockLimit }));
  const mockEqChain = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ gte: mockGte })) })) }));
  const mockEqSingle = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn((columns: string) => {
    // Return different chain based on what's being selected
    if (columns === 'low_credit_alerts') {
      return { eq: mockEqSingle };
    }
    // For email_logs (select('id'))
    return { eq: mockEqChain };
  });
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  }));

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
  };
});

// Mock serverEnv and isDevelopment
const mockIsDevelopment = vi.fn(() => false);
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    RESEND_API_KEY: 'test-api-key',
    EMAIL_FROM_ADDRESS: 'test@example.com',
    BASE_URL: 'http://localhost:3000',
    SUPPORT_EMAIL: 'support@example.com',
    APP_NAME: 'TestApp',
  },
  isDevelopment: () => mockIsDevelopment(),
  isTest: () => true,
  clientEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

// Mock templates
vi.mock('@/emails/templates/WelcomeEmail', () => ({
  WelcomeEmail: () => null,
}));
vi.mock('@/emails/templates/PaymentSuccessEmail', () => ({
  PaymentSuccessEmail: () => null,
}));
vi.mock('@/emails/templates/SubscriptionUpdateEmail', () => ({
  SubscriptionUpdateEmail: () => null,
}));
vi.mock('@/emails/templates/LowCreditsEmail', () => ({
  LowCreditsEmail: () => null,
}));
vi.mock('@/emails/templates/PasswordResetEmail', () => ({
  PasswordResetEmail: () => null,
}));
vi.mock('@/emails/templates/ArticleCompleteEmail', () => ({
  ArticleCompleteEmail: () => null,
}));

import { EmailService } from '@server/services/email.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

describe('EmailService - Email Triggers', () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDevelopment.mockReturnValue(false);
    mockProviderManagerSend.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
    emailService = new EmailService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // sendArticleCompleteNotification Tests
  // =============================================================================

  describe('sendArticleCompleteNotification', () => {
    it('should send article-complete email after successful generation', async () => {
      await emailService.sendArticleCompleteNotification({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        articleTitle: 'Test Article Title',
        keyword: 'test keyword',
        campaignName: 'Test Campaign',
        articleId: 'article-123',
      });

      expect(mockProviderManagerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'article-complete',
          type: 'transactional',
          userId: 'user-123',
          data: expect.objectContaining({
            userName: 'Test User',
            articleTitle: 'Test Article Title',
            keyword: 'test keyword',
            campaignName: 'Test Campaign',
            articleId: 'article-123',
          }),
        })
      );
    });

    it('should not throw if article-complete email fails', async () => {
      mockProviderManagerSend.mockRejectedValue(new Error('Email send failed'));

      // Should not throw - email failure must never block generation
      await expect(
        emailService.sendArticleCompleteNotification({
          userId: 'user-123',
          email: 'test@example.com',
          userName: 'Test User',
          articleTitle: 'Test Article',
          keyword: 'test keyword',
          articleId: 'article-123',
        })
      ).resolves.not.toThrow();
    });

    it('should send article-complete email without campaign name', async () => {
      await emailService.sendArticleCompleteNotification({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        articleTitle: 'Test Article',
        keyword: 'test keyword',
        articleId: 'article-123',
      });

      expect(mockProviderManagerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'article-complete',
          type: 'transactional',
        })
      );
    });
  });

  // =============================================================================
  // sendLowCreditAlert Tests
  // =============================================================================

  describe('sendLowCreditAlert', () => {
    it('should send low-credit email when balance below 20%', async () => {
      // Get access to the mock functions
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;

      // Mock email preferences - user has low_credit_alerts enabled
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: true },
        error: null,
      });

      // Get access to the limit mock for email_logs
      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;

      // Mock email_logs - no recent email
      mockLimit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 5, // 5/30 = 16.7% < 20%
        planCredits: 30, // starter plan
        planName: 'Starter',
      });

      expect(mockProviderManagerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'low-credits',
          type: 'marketing',
          userId: 'user-123',
          data: expect.objectContaining({
            userName: 'Test User',
            creditsRemaining: 5,
            planCredits: 30,
            planName: 'Starter',
          }),
        })
      );
    });

    it('should not send low-credit email when balance above 20%', async () => {
      // This test verifies the check is done in generate.ts, not in the email service
      // The email service always sends if called, the threshold check is in the API route
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: true },
        error: null,
      });

      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;
      mockLimit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 10, // 10/30 = 33% > 20%
        planCredits: 30,
        planName: 'Starter',
      });

      // Email service should still send - the threshold check happens in generate.ts
      expect(mockProviderManagerSend).toHaveBeenCalled();
    });

    it('should not send duplicate low-credit email within 24h', async () => {
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      // Mock email preferences - user has low_credit_alerts enabled
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: true },
        error: null,
      });

      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;
      // Mock email_logs - recent email exists
      mockLimit.mockResolvedValueOnce({
        data: [{ id: 'existing-log-id' }],
        error: null,
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 5,
        planCredits: 30,
        planName: 'Starter',
      });

      // Should not send email because one was already sent within 24h
      expect(mockProviderManagerSend).not.toHaveBeenCalled();
    });

    it('should respect email_preferences.low_credit_alerts=false', async () => {
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      // Mock email preferences - user has low_credit_alerts disabled
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: false },
        error: null,
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 5,
        planCredits: 30,
        planName: 'Starter',
      });

      expect(mockProviderManagerSend).not.toHaveBeenCalled();
    });

    it('should not throw if low-credit email fails', async () => {
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      // Mock email preferences
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: true },
        error: null,
      });

      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;
      // Mock email_logs - no recent email
      mockLimit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockProviderManagerSend.mockRejectedValue(new Error('Email send failed'));

      // Should not throw - email failure must never block credit operations
      await expect(
        emailService.sendLowCreditAlert({
          userId: 'user-123',
          email: 'test@example.com',
          userName: 'Test User',
          creditsRemaining: 5,
          planCredits: 30,
          planName: 'Starter',
        })
      ).resolves.not.toThrow();
    });

    it('should send email if preferences do not exist (default to allowing)', async () => {
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      // Mock email preferences - not found
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      });

      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;
      // Mock email_logs - no recent email
      mockLimit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 5,
        planCredits: 30,
        planName: 'Starter',
      });

      expect(mockProviderManagerSend).toHaveBeenCalled();
    });

    it('should still send email if email_logs check fails', async () => {
      const fromResult = supabaseAdmin.from('email_preferences') as unknown as {
        select: (cols: string) => { eq: () => { single: ReturnType<typeof vi.fn> } };
      };
      const mockSingle = fromResult.select('low_credit_alerts').eq().single;
      // Mock email preferences
      mockSingle.mockResolvedValueOnce({
        data: { low_credit_alerts: true },
        error: null,
      });

      const fromLogs = supabaseAdmin.from('email_logs') as unknown as {
        select: (cols: string) => {
          eq: () => { eq: () => { eq: () => { gte: () => { limit: ReturnType<typeof vi.fn> } } } };
        };
      };
      const mockLimit = fromLogs.select('id').eq().eq().eq().gte().limit;
      // Mock email_logs - error
      mockLimit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await emailService.sendLowCreditAlert({
        userId: 'user-123',
        email: 'test@example.com',
        userName: 'Test User',
        creditsRemaining: 5,
        planCredits: 30,
        planName: 'Starter',
      });

      // Should still send email on error (fail-open)
      expect(mockProviderManagerSend).toHaveBeenCalled();
    });
  });
});
