/**
 * Integration Types for CMS Integration System
 *
 * Defines interfaces for WordPress and webhook integrations, delivery tracking,
 * and integration configuration.
 */

/**
 * Integration type enum
 */
export type IntegrationType = 'wordpress' | 'webhook';

/**
 * Integration status enum
 */
export type IntegrationStatus = 'active' | 'error' | 'disabled';

/**
 * Delivery status enum
 */
export type DeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'failed';

/**
 * WordPress-specific configuration
 */
export interface IWordPressConfig {
  /** Site URL (e.g., https://blog.example.com) */
  site_url: string;
  /** WordPress username */
  username: string;
}

/**
 * Webhook-specific configuration
 */
export interface IWebhookConfig {
  /** Webhook URL */
  url: string;
  /** Optional secret for HMAC signature */
  secret?: string;
}

/**
 * Discriminated union for integration configs
 */
export type IIntegrationConfig = IWordPressConfig | IWebhookConfig;

/**
 * WordPress credentials (encrypted)
 */
export interface IWordPressCredentials {
  /** WordPress Application Password */
  appPassword: string;
  [key: string]: string | undefined;
}

/**
 * Webhook credentials (encrypted)
 */
export interface IWebhookCredentials {
  /** Webhook secret for HMAC signature (if provided) */
  secret?: string;
  [key: string]: string | undefined;
}

/**
 * Discriminated union for credentials
 */
export type IIntegrationCredentials = IWordPressCredentials | IWebhookCredentials;

/**
 * Full integration interface matching the database schema
 */
export interface IIntegration {
  id: string;
  user_id: string;
  type: IntegrationType;
  name: string;
  config: IIntegrationConfig;
  encrypted_credentials: string; // Never returned in API responses
  status: IntegrationStatus;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Integration response (without encrypted credentials)
 */
export type IIntegrationResponse = Omit<IIntegration, 'encrypted_credentials'>;

/**
 * Integration with type guard
 */
export interface IIntegrationWithType extends IIntegrationResponse {
  /** Discriminator for type narrowing */
  config: IIntegrationConfig & { __type: IntegrationType };
}

/**
 * Input for creating a WordPress integration
 */
export interface ICreateWordPressInput {
  type: 'wordpress';
  name: string;
  siteUrl: string;
  username: string;
  appPassword: string;
}

/**
 * Input for creating a webhook integration
 */
export interface ICreateWebhookInput {
  type: 'webhook';
  name: string;
  url: string;
  secret?: string;
}

/**
 * Discriminated union for creating integrations
 */
export type ICreateIntegrationInput = ICreateWordPressInput | ICreateWebhookInput;

/**
 * Input for updating an integration
 */
export interface IUpdateIntegrationInput {
  name?: string;
  /** For WordPress: new app password if changed */
  appPassword?: string;
  /** For webhook: new secret if changed */
  secret?: string;
}

/**
 * Test connection result
 */
export interface ITestConnectionResult {
  success: boolean;
  timestamp: string;
  error?: string;
  errorType?: 'network_error' | 'timeout' | 'ssl_error' | 'http_error' | 'unknown';
}

/**
 * Integration with campaign assignment info
 */
export interface IIntegrationWithCampaigns extends IIntegrationResponse {
  /** Number of campaigns this integration is assigned to */
  campaign_count: number;
}

/**
 * Campaign integration junction table record
 */
export interface ICampaignIntegration {
  id: string;
  campaign_id: string;
  integration_id: string;
  enabled: boolean;
  created_at: string;
}

/**
 * Campaign integration with integration details
 */
export interface ICampaignIntegrationWithDetails extends ICampaignIntegration {
  integration: IIntegrationResponse;
}

/**
 * Input for assigning integrations to a campaign
 */
export interface ISetCampaignIntegrationsInput {
  /** Array of integration IDs to assign */
  integrationIds: string[];
  /** Auto-publish flag */
  autoPublish: boolean;
}

/**
 * Integration delivery record
 */
export interface IIntegrationDelivery {
  id: string;
  article_id: string;
  integration_id: string;
  campaign_id: string | null;
  status: DeliveryStatus;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
  attempt_count: number;
  delivered_at: string | null;
  created_at: string;
}

/**
 * Integration delivery with integration details
 */
export interface IIntegrationDeliveryWithDetails extends IIntegrationDelivery {
  integration: Pick<IIntegrationResponse, 'id' | 'name' | 'type' | 'status'>;
}

/**
 * Delivery result from publishing
 */
export interface IDeliveryResult {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

/**
 * Publish result for WordPress
 */
export interface IWordPressPublishResult extends IDeliveryResult {
  /** WordPress post ID */
  externalId: string;
  /** Published post URL */
  externalUrl: string;
}

/**
 * Publish result for webhook
 */
export interface IWebhookDeliveryResult extends IDeliveryResult {
  /** Webhook response ID or status */
  externalId?: string;
}

/**
 * Discriminated union for publish results
 */
export type IPublishResult = IWordPressPublishResult | IWebhookDeliveryResult;

/**
 * Response from creating an integration
 */
export interface ICreateIntegrationResponse {
  integration: IIntegrationResponse;
  testResult: ITestConnectionResult;
}

/**
 * Response from listing integrations
 */
export interface IIntegrationsListResponse {
  integrations: IIntegrationWithCampaigns[];
}

/**
 * Response from testing an integration connection
 */
export interface ITestIntegrationResponse {
  result: ITestConnectionResult;
}

/**
 * Response from getting campaign integrations
 */
export interface ICampaignIntegrationsResponse {
  integrations: ICampaignIntegrationWithDetails[];
  autoPublish: boolean;
}

/**
 * Response from getting article deliveries
 */
export interface IArticleDeliveriesResponse {
  deliveries: IIntegrationDeliveryWithDetails[];
}

/**
 * Error thrown when integration is not found or user lacks access
 */
export class IntegrationNotFoundError extends Error {
  public readonly integrationId: string;

  constructor(integrationId: string) {
    super(`Integration not found: ${integrationId}`);
    this.name = 'IntegrationNotFoundError';
    this.integrationId = integrationId;
  }
}

/**
 * Error thrown when connection test fails
 */
export class ConnectionTestError extends Error {
  public readonly originalError: string;

  constructor(originalError: string) {
    super(`Connection test failed: ${originalError}`);
    this.name = 'ConnectionTestError';
    this.originalError = originalError;
  }
}

/**
 * Error thrown when delivery fails
 */
export class DeliveryError extends Error {
  public readonly deliveryId: string;
  public readonly originalError: string;

  constructor(deliveryId: string, originalError: string) {
    super(`Delivery failed: ${originalError}`);
    this.name = 'DeliveryError';
    this.deliveryId = deliveryId;
    this.originalError = originalError;
  }
}
