/**
 * Integration Types for CMS Integration System
 *
 * Defines interfaces for WordPress and webhook integrations, delivery tracking,
 * and integration configuration.
 */

/**
 * Integration type enum
 */
export type IntegrationType = 'wordpress' | 'webhook' | 'webflow' | 'shopify' | 'wix' | 'notion' | 'ghost' | 'slack';

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
 * Webflow field mapping configuration
 * Maps article fields to Webflow collection fields
 */
export interface IWebflowFieldMap {
  /** Field ID for article title */
  title: string;
  /** Field ID for article slug */
  slug: string;
  /** Field ID for article content/body */
  content: string;
  /** Field ID for article excerpt/meta description (optional) */
  excerpt?: string;
  /** Field ID for published date (optional) */
  date?: string;
  /** Field ID for featured image (optional) */
  featured_image?: string;
}

/**
 * Webflow-specific configuration
 */
export interface IWebflowConfig {
  /** Webflow site ID */
  site_id: string;
  /** Webflow collection ID (e.g., Blog Posts collection) */
  collection_id: string;
  /** Field mapping from article to Webflow collection fields */
  field_map: IWebflowFieldMap;
}

/**
 * Wix-specific configuration
 */
export interface IWixConfig {
  /** Wix site ID (from Wix Dashboard > Settings > Developer Tools) */
  site_id: string;
}

/**
 * Notion-specific configuration
 */
export interface INotionConfig {
  /** Notion database ID where pages will be created (UUID format) */
  database_id: string;
}

/**
 * Shopify-specific configuration
 */
export interface IShopifyConfig {
  /** Store URL (e.g., https://mystore.myshopify.com) */
  store_url: string;
  /** Blog ID to publish to (optional - defaults to first blog) */
  blog_id?: string;
}

/**
 * Ghost-specific configuration
 */
export interface IGhostConfig {
  /** Ghost site URL (e.g., https://myblog.ghost.io) */
  site_url: string;
}

/**
 * Slack-specific configuration
 */
export interface ISlackConfig {
  /** Channel name for display purposes (optional) */
  channel_name?: string;
}

/**
 * Discriminated union for integration configs
 */
export type IIntegrationConfig =
  | IWordPressConfig
  | IWebhookConfig
  | IWebflowConfig
  | IWixConfig
  | INotionConfig
  | IShopifyConfig
  | IGhostConfig
  | ISlackConfig;

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
 * Webflow credentials (encrypted)
 */
export interface IWebflowCredentials {
  /** Webflow API Token (from Site Settings > Apps & Integrations > API Token) */
  apiToken: string;
  [key: string]: string | undefined;
}

/**
 * Wix credentials (encrypted)
 */
export interface IWixCredentials {
  /** Wix API Key (generated in Wix Dashboard > Headless Settings > API Keys) */
  apiKey: string;
  /** Wix Account ID (from Wix Dashboard > Settings > Developer Tools) */
  accountId: string;
  [key: string]: string | undefined;
}

/**
 * Notion credentials (encrypted)
 */
export interface INotionCredentials {
  /** Notion Internal Integration Token (secret_xxx format, from Notion > Settings > Integrations) */
  integrationToken: string;
  [key: string]: string | undefined;
}

/**
 * Shopify credentials (encrypted)
 */
export interface IShopifyCredentials {
  /** Shopify Admin API Access Token (from Custom App setup in Shopify Admin) */
  accessToken: string;
  [key: string]: string | undefined;
}

/**
 * Ghost credentials (encrypted)
 */
export interface IGhostCredentials {
  /** Ghost Admin API Key (from Ghost Admin > Settings > Integrations > Add custom integration) */
  adminApiKey: string;
  [key: string]: string | undefined;
}

/**
 * Slack credentials (encrypted)
 */
export interface ISlackCredentials {
  /** Slack Incoming Webhook URL (from Slack > Apps > Incoming Webhooks) */
  webhookUrl: string;
  [key: string]: string | undefined;
}

/**
 * Discriminated union for credentials
 */
export type IIntegrationCredentials =
  | IWordPressCredentials
  | IWebhookCredentials
  | IWebflowCredentials
  | IWixCredentials
  | INotionCredentials
  | IShopifyCredentials
  | IGhostCredentials
  | ISlackCredentials;

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
 * Input for creating a Webflow integration
 */
export interface ICreateWebflowInput {
  type: 'webflow';
  name: string;
  siteId: string;
  collectionId: string;
  fieldMap: IWebflowFieldMap;
  apiToken: string;
}

/**
 * Input for creating a Wix integration
 */
export interface ICreateWixInput {
  type: 'wix';
  name: string;
  siteId: string;
  apiKey: string;
  accountId: string;
}

/**
 * Input for creating a Notion integration
 */
export interface ICreateNotionInput {
  type: 'notion';
  name: string;
  databaseId: string;
  integrationToken: string;
}

/**
 * Input for creating a Shopify integration
 */
export interface ICreateShopifyInput {
  type: 'shopify';
  name: string;
  storeUrl: string;
  accessToken: string;
  blogId?: string;
}

/**
 * Input for creating a Ghost integration
 */
export interface ICreateGhostInput {
  type: 'ghost';
  name: string;
  siteUrl: string;
  adminApiKey: string;
}

/**
 * Input for creating a Slack integration
 */
export interface ICreateSlackInput {
  type: 'slack';
  name: string;
  webhookUrl: string;
  channelName?: string;
}

/**
 * Discriminated union for creating integrations
 */
export type ICreateIntegrationInput =
  | ICreateWordPressInput
  | ICreateWebhookInput
  | ICreateWebflowInput
  | ICreateWixInput
  | ICreateNotionInput
  | ICreateShopifyInput
  | ICreateGhostInput
  | ICreateSlackInput;

/**
 * Input for updating an integration
 */
export interface IUpdateIntegrationInput {
  name?: string;
  /** For WordPress: new app password if changed */
  appPassword?: string;
  /** For webhook: new secret if changed */
  secret?: string;
  /** For Webflow/Wix/Shopify: new API token if changed */
  apiToken?: string;
  /** For Notion: new integration token if changed */
  integrationToken?: string;
  /** For Wix: new account ID if changed */
  accountId?: string;
  /** For Shopify: new access token if changed */
  accessToken?: string;
  /** For Ghost: new admin API key if changed */
  adminApiKey?: string;
  /** For Slack: new webhook URL if changed */
  webhookUrl?: string;
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
