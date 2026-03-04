import type {
  ISendEmailParams,
  ISendEmailResult,
} from '../services/email-providers/base-email-provider-adapter';

/**
 * Parameters for article complete notification email
 */
export interface IArticleCompleteEmailParams {
  userId: string;
  email: string;
  userName: string;
  articleTitle: string;
  keyword: string;
  campaignName?: string;
  articleId: string;
}

/**
 * Parameters for low credit alert email
 */
export interface ILowCreditAlertParams {
  userId: string;
  email: string;
  userName: string;
  creditsRemaining: number;
  planCredits: number;
  planName: string;
}

/**
 * Email service interface
 * Handles sending emails through the provider manager
 */
export interface IEmailService {
  /**
   * Send an email using the configured provider
   *
   * @param params - Email parameters including template, to, from, etc.
   * @returns Send result with success status and provider info
   */
  send(params: ISendEmailParams): Promise<ISendEmailResult>;

  /**
   * Send article complete notification email
   * Transactional email - always sent regardless of preferences
   *
   * @param params - Article complete email parameters
   */
  sendArticleCompleteNotification(params: IArticleCompleteEmailParams): Promise<void>;

  /**
   * Send low credit alert email
   * Marketing email - respects email_preferences.low_credit_alerts
   * Rate-limited to once per 24 hours per user
   *
   * @param params - Low credit alert parameters
   */
  sendLowCreditAlert(params: ILowCreditAlertParams): Promise<void>;
}
