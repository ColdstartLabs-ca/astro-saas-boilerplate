/**
 * CMS Adapter Interface
 *
 * Defines the contract for all CMS integration adapters.
 * Each adapter must implement testConnection and publish methods.
 */

import type { IArticle } from '@shared/types/article.types';
import type { ICampaign } from '@shared/types/campaign.types';
import type { IProject } from '@shared/types/project.types';
import type {
  IIntegrationConfig,
  IIntegrationCredentials,
  ITestConnectionResult,
  IDeliveryResult,
} from '@shared/types/integration.types';

/**
 * Re-export types from integration.types for convenience
 */
export type { ITestConnectionResult };
export type IPublishResult = IDeliveryResult;

/**
 * Context for publishing an article
 * Contains article data along with associated campaign and project information
 */
export interface IPublishContext {
  article: IArticle;
  campaign?: ICampaign | null;
  project?: IProject | null;
}

/**
 * Interface for CMS integration adapters
 *
 * Adapters handle the specifics of communicating with different CMS platforms.
 * They must implement connection testing and article publishing.
 */
export interface ICMSAdapter {
  /**
   * Test the connection to the CMS using the provided credentials
   *
   * @param config - Integration-specific configuration
   * @param credentials - Decrypted credentials
   * @returns Test result with success status and optional error message
   */
  testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult>;

  /**
   * Publish an article to the CMS
   *
   * @param context - Article, campaign, and project information
   * @param config - Integration-specific configuration
   * @param credentials - Decrypted credentials
   * @returns Publish result with external ID/URL on success
   */
  publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult>;

  /**
   * Get the adapter type identifier
   */
  readonly type: 'wordpress' | 'webhook';
}
