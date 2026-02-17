import { getEmailProviderManager } from './email-providers/email-provider-manager';
import type { ISendEmailParams, ISendEmailResult } from '@shared/types/provider-adapter.types';
import type {
  IEmailService,
  IArticleCompleteEmailParams,
  ILowCreditAlertParams,
} from '../interfaces/IEmailService';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

export type EmailType = 'transactional' | 'marketing';

// Re-export types for convenience
export type { ISendEmailParams, ISendEmailResult };

export class EmailError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'EMAIL_ERROR') {
    super(message);
    this.name = 'EmailError';
    this.code = code;
  }
}

/**
 * Email service for sending transactional and marketing emails via provider manager.
 *
 * Provider priority:
 * 1. Brevo (primary) - 300 free emails/day
 * 2. Resend (fallback) - 3,000 free emails/month
 *
 * The service automatically handles:
 * - Provider selection and fallback
 * - Template loading and rendering
 * - Marketing email preference checking
 * - Development mode (logging instead of sending)
 * - Email logging to database
 */
export class EmailService implements IEmailService {
  /**
   * Send an email using the provider manager.
   * All template loading, preference checking, dev-mode handling, and logging
   * is done by the BaseEmailProviderAdapter.
   */
  async send(params: ISendEmailParams): Promise<ISendEmailResult> {
    try {
      const providerManager = getEmailProviderManager();
      return await providerManager.send(params);
    } catch (error) {
      // Re-throw EmailErrors directly without wrapping
      if (error instanceof EmailError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Email send failed', { template: params.template, error: message });
      throw new EmailError(`Failed to send email: ${message}`, 'SEND_FAILED');
    }
  }

  /**
   * Send article complete notification email.
   * Transactional email - always sent regardless of preferences.
   * Email failure is caught and logged, never thrown.
   */
  async sendArticleCompleteNotification(params: IArticleCompleteEmailParams): Promise<void> {
    try {
      await this.send({
        to: params.email,
        template: 'article-complete',
        type: 'transactional',
        userId: params.userId,
        data: {
          userName: params.userName,
          articleTitle: params.articleTitle,
          keyword: params.keyword,
          campaignName: params.campaignName,
          articleId: params.articleId,
        },
      });
    } catch (error) {
      // Log error but don't throw - email failure must never block generation
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Failed to send article complete notification:', {
        userId: params.userId,
        articleId: params.articleId,
        error: message,
      });
    }
  }

  /**
   * Send low credit alert email.
   * Marketing email - respects email_preferences.low_credit_alerts.
   * Rate-limited to once per 24 hours per user to prevent spam.
   */
  async sendLowCreditAlert(params: ILowCreditAlertParams): Promise<void> {
    try {
      // Check if user has opted out of low credit alerts
      const { data: preferences, error: prefsError } = await supabaseAdmin
        .from('email_preferences')
        .select('low_credit_alerts')
        .eq('user_id', params.userId)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.error('[EmailService] Error checking low_credit_alerts preference:', prefsError);
        // Continue to allow email on error (fail-open)
      }

      // If user opted out, skip
      if (preferences?.low_credit_alerts === false) {
        console.log('[EmailService] Skipping low credit alert - user opted out:', params.userId);
        return;
      }

      // Check if we already sent a low-credit email in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentLogs, error: logsError } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('user_id', params.userId)
        .eq('template_name', 'low-credits')
        .eq('status', 'sent')
        .gte('sent_at', twentyFourHoursAgo)
        .limit(1);

      if (logsError) {
        console.error('[EmailService] Error checking recent low-credit emails:', logsError);
        // Continue to allow email on error
      }

      // If we already sent one recently, skip to avoid spam
      if (recentLogs && recentLogs.length > 0) {
        console.log(
          '[EmailService] Skipping low credit alert - already sent within 24h:',
          params.userId
        );
        return;
      }

      // Send the low credit alert
      await this.send({
        to: params.email,
        template: 'low-credits',
        type: 'marketing',
        userId: params.userId,
        data: {
          userName: params.userName,
          creditsRemaining: params.creditsRemaining,
          planCredits: params.planCredits,
          planName: params.planName,
        },
      });
    } catch (error) {
      // Log error but don't throw - email failure must never block credit operations
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Failed to send low credit alert:', {
        userId: params.userId,
        error: message,
      });
    }
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
