/**
 * Slack Incoming Webhook Adapter
 *
 * Handles sending notifications to Slack channels via Incoming Webhooks.
 * This is not a CMS adapter - it sends notification messages rather than publishing content.
 *
 * API Reference: https://api.slack.com/messaging/webhooks
 */

import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';
import type {
  ISlackConfig,
  ISlackCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * Slack Block Kit message structure
 */
interface ISlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  accessory?: {
    type: string;
    text: {
      type: string;
      text: string;
    };
    url: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    url?: string;
  }>;
}

interface ISlackMessage {
  text?: string;
  blocks?: ISlackBlock[];
}

/**
 * Build a Slack message for article published notification
 */
function buildArticlePublishedMessage(context: IPublishContext): ISlackMessage {
  const { article, campaign, project } = context;
  const wordCount = article.content ? article.content.split(/\s+/).length : 0;

  return {
    text: `New article published: ${article.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':newspaper: New Article Published',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${article.title}*\n${article.meta_description || 'No description available'}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Words:*\n${wordCount.toLocaleString()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Campaign:*\n${campaign?.name || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Project:*\n${project?.name || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Keywords:*\n${article.primary_keyword || 'N/A'}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in Dashboard',
            },
            url: `https://autopilotrank.com/dashboard/articles/${article.id}`,
          },
        ],
      },
    ],
  };
}

/**
 * Build a test connection message
 */
function buildTestMessage(): ISlackMessage {
  return {
    text: ':white_check_mark: AutopilotRank Slack integration connected successfully!',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':white_check_mark: Integration Connected',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your AutopilotRank Slack integration is now active. You will receive notifications when articles are published.',
        },
      },
    ],
  };
}

/**
 * Validate Slack config
 */
function isSlackConfig(config: IIntegrationConfig): config is ISlackConfig {
  return 'channel_name' in config;
}

/**
 * Validate Slack credentials
 */
function isSlackCredentials(credentials: IIntegrationCredentials): credentials is ISlackCredentials {
  return 'webhookUrl' in credentials && typeof credentials.webhookUrl === 'string';
}

/**
 * Slack Incoming Webhook Adapter
 *
 * Uses Incoming Webhooks for simple one-way notifications.
 * No OAuth required - user just provides the webhook URL.
 */
export const slackAdapter: ICMSAdapter = {
  type: 'slack' as const,

  /**
   * Test the connection by sending a test message to the webhook
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    if (!isSlackCredentials(credentials)) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Invalid credentials: webhookUrl is required',
        errorType: 'unknown',
      };
    }

    try {
      const response = await fetch(credentials.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildTestMessage()),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Slack API error: ${response.status} - ${text}`,
          errorType: 'http_error',
        };
      }

      // Slack webhook returns "ok" on success
      const result = await response.text();
      if (result !== 'ok') {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Unexpected response from Slack: ${result}`,
          errorType: 'unknown',
        };
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'network_error',
      };
    }
  },

  /**
   * Send a notification about a published article
   *
   * Note: For Slack, "publish" means sending a notification, not publishing content.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    if (!isSlackCredentials(credentials)) {
      return {
        success: false,
        error: 'Invalid credentials: webhookUrl is required',
      };
    }

    try {
      const message = buildArticlePublishedMessage(context);

      const response = await fetch(credentials.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${text}`,
        };
      }

      // Slack webhook returns "ok" on success
      const result = await response.text();
      if (result !== 'ok') {
        return {
          success: false,
          error: `Unexpected response from Slack: ${result}`,
        };
      }

      // Generate a pseudo-ID for the message (Slack webhooks don't return message IDs)
      const messageId = `slack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const channelName = isSlackConfig(config) && config.channel_name ? config.channel_name : 'general';

      return {
        success: true,
        externalId: messageId,
        externalUrl: `https://slack.com/app_redirect?channel=${encodeURIComponent(channelName)}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
