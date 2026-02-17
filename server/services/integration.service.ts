/**
 * Integration Service
 *
 * Handles CRUD operations for CMS integrations.
 * Manages all supported integrations with encrypted credentials.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { encryptJSON, decryptJSON } from '@server/utils/encryption';
import { getAdapter } from '@server/integrations';
import { IntegrationNotFoundError, ConnectionTestError } from '@shared/types/integration.types';
import type {
  IIntegration,
  IIntegrationResponse,
  ICreateIntegrationInput,
  IUpdateIntegrationInput,
  IIntegrationConfig,
  IIntegrationCredentials,
  ITestConnectionResult,
  IIntegrationWithCampaigns,
  IWordPressConfig,
  IWordPressCredentials,
  IWebhookConfig,
  IWebhookCredentials,
  IWebflowConfig,
  IWebflowCredentials,
  IWixConfig,
  IWixCredentials,
  INotionConfig,
  INotionCredentials,
  IShopifyConfig,
  IShopifyCredentials,
  IGhostConfig,
  IGhostCredentials,
  ISlackConfig,
  ISlackCredentials,
} from '@shared/types/integration.types';

/**
 * Redact sensitive fields from integration config before returning to clients.
 * Removes webhook secrets that may have been stored in config historically.
 */
function redactConfig(config: unknown): IIntegrationConfig {
  if (!config || typeof config !== 'object') return {} as IIntegrationConfig;
  // Use type assertion to preserve original structure while removing secret
  const result = { ...(config as IIntegrationConfig) };
  delete (result as IIntegrationConfig & { secret?: unknown }).secret;
  return result as IIntegrationConfig;
}

/**
 * Integration Service
 *
 * Manages user integrations with external CMS platforms.
 * Handles encryption/decryption of credentials and connection testing.
 */
export class IntegrationService {
  /**
   * List all integrations for a user
   *
   * @param userId - The user ID
   * @returns Promise resolving to list of integrations with campaign counts
   */
  async list(userId: string): Promise<IIntegrationWithCampaigns[]> {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select(
        `
        *,
        campaign_integrations (count)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list integrations: ${error.message}`);
    }

    // Transform data to remove encrypted credentials, redact config secrets, and add campaign count
    return (
      data as Array<
        {
          campaign_integrations: { count: number }[] | null;
        } & IIntegration
      >
    ).map(integration => {
      const { encrypted_credentials: _, ...rest } = integration;
      return {
        ...rest,
        config: redactConfig(rest.config),
        campaign_count: integration.campaign_integrations?.[0]?.count || 0,
      };
    });
  }

  /**
   * Get a single integration by ID
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving to integration or null
   */
  async getById(integrationId: string, userId: string): Promise<IIntegrationResponse | null> {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get integration: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Remove encrypted credentials and redact config from response
    const { encrypted_credentials: _, ...rest } = data as IIntegration;
    return { ...rest, config: redactConfig(rest.config) };
  }

  /**
   * Build integration config and credentials based on integration type.
   */
  private buildCreatePayload(input: ICreateIntegrationInput): {
    config: IIntegrationConfig;
    credentials: IIntegrationCredentials;
  } {
    switch (input.type) {
      case 'wordpress':
        return {
          config: {
            site_url: input.siteUrl,
            username: input.username,
          } as IWordPressConfig,
          credentials: {
            appPassword: input.appPassword,
          } as IWordPressCredentials,
        };

      case 'webhook':
        return {
          config: {
            url: input.url,
          } as IWebhookConfig,
          credentials: {
            secret: input.secret,
          } as IWebhookCredentials,
        };

      case 'webflow':
        return {
          config: {
            site_id: input.siteId,
            collection_id: input.collectionId,
            field_map: input.fieldMap,
          } as IWebflowConfig,
          credentials: {
            apiToken: input.apiToken,
          } as IWebflowCredentials,
        };

      case 'wix':
        return {
          config: {
            site_id: input.siteId,
          } as IWixConfig,
          credentials: {
            apiKey: input.apiKey,
            accountId: input.accountId,
          } as IWixCredentials,
        };

      case 'notion':
        return {
          config: {
            database_id: input.databaseId,
          } as INotionConfig,
          credentials: {
            integrationToken: input.integrationToken,
          } as INotionCredentials,
        };

      case 'shopify':
        return {
          config: {
            store_url: input.storeUrl,
            blog_id: input.blogId,
          } as IShopifyConfig,
          credentials: {
            accessToken: input.accessToken,
          } as IShopifyCredentials,
        };

      case 'ghost':
        return {
          config: {
            site_url: input.siteUrl,
          } as IGhostConfig,
          credentials: {
            adminApiKey: input.adminApiKey,
          } as IGhostCredentials,
        };

      case 'slack':
        return {
          config: {
            channel_name: input.channelName,
          } as ISlackConfig,
          credentials: {
            webhookUrl: input.webhookUrl,
          } as ISlackCredentials,
        };
    }

    // Keep TypeScript and runtime safe if new types are added without wiring.
    throw new Error(`Unsupported integration type: ${(input as { type: string }).type}`);
  }

  /**
   * Check whether a credential field was provided in update input.
   */
  private hasCredentialUpdates(input: IUpdateIntegrationInput): boolean {
    return (
      input.appPassword !== undefined ||
      input.secret !== undefined ||
      input.apiToken !== undefined ||
      input.apiKey !== undefined ||
      input.accountId !== undefined ||
      input.integrationToken !== undefined ||
      input.accessToken !== undefined ||
      input.adminApiKey !== undefined ||
      input.webhookUrl !== undefined
    );
  }

  /**
   * Merge integration-type specific credential updates.
   */
  private mergeCredentialUpdates(
    integrationType: IIntegration['type'],
    existingCredentials: IIntegrationCredentials,
    input: IUpdateIntegrationInput
  ): IIntegrationCredentials {
    const merged = {
      ...(existingCredentials as Record<string, unknown>),
    } as Record<string, unknown>;

    switch (integrationType) {
      case 'wordpress':
        if (input.appPassword !== undefined) {
          merged.appPassword = input.appPassword;
        }
        break;

      case 'webhook':
        if (input.secret !== undefined) {
          merged.secret = input.secret;
        }
        break;

      case 'webflow':
        if (input.apiToken !== undefined) {
          merged.apiToken = input.apiToken;
        }
        break;

      case 'wix':
        if (input.apiKey !== undefined) {
          merged.apiKey = input.apiKey;
        }
        if (input.accountId !== undefined) {
          merged.accountId = input.accountId;
        }
        break;

      case 'notion':
        if (input.integrationToken !== undefined) {
          merged.integrationToken = input.integrationToken;
        }
        break;

      case 'shopify':
        if (input.accessToken !== undefined) {
          merged.accessToken = input.accessToken;
        }
        break;

      case 'ghost':
        if (input.adminApiKey !== undefined) {
          merged.adminApiKey = input.adminApiKey;
        }
        break;

      case 'slack':
        if (input.webhookUrl !== undefined) {
          merged.webhookUrl = input.webhookUrl;
        }
        break;
    }

    return merged as IIntegrationCredentials;
  }

  /**
   * Create a new integration
   *
   * @param userId - The user ID
   * @param input - Integration creation input
   * @returns Promise resolving to created integration with test result
   */
  async create(
    userId: string,
    input: ICreateIntegrationInput
  ): Promise<{ integration: IIntegrationResponse; testResult: ITestConnectionResult }> {
    // Build config/credentials for the selected type and encrypt credentials
    const { config, credentials } = this.buildCreatePayload(input);
    const encryptedCredentials = await encryptJSON(credentials);

    // Create integration record
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .insert({
        user_id: userId,
        type: input.type,
        name: input.name,
        config,
        encrypted_credentials: encryptedCredentials,
        status: 'active',
      })
      .select()
      .single();

    if (integrationError || !integration) {
      throw new Error(
        `Failed to create integration: ${integrationError?.message ?? 'Unknown error'}`
      );
    }

    // Test connection
    const testResult = await this.testConnection(integration.id, userId);

    return {
      integration: {
        id: integration.id,
        user_id: integration.user_id,
        type: integration.type,
        name: integration.name,
        config: redactConfig(integration.config),
        status: integration.status,
        last_tested_at: integration.last_tested_at,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
      },
      testResult,
    };
  }

  /**
   * Update an existing integration
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @param input - Update input
   * @returns Promise resolving to updated integration
   */
  async update(
    integrationId: string,
    userId: string,
    input: IUpdateIntegrationInput
  ): Promise<IIntegrationResponse> {
    // Get existing integration
    const existing = await this.getRawIntegration(integrationId, userId);
    if (!existing) {
      throw new IntegrationNotFoundError(integrationId);
    }

    const updates: Record<string, unknown> = {};

    // Update name if provided
    if (input.name !== undefined) {
      updates.name = input.name;
    }

    // Update credentials if provided
    if (this.hasCredentialUpdates(input)) {
      const existingCredentials = await decryptJSON<IIntegrationCredentials>(
        existing.encrypted_credentials
      );
      const mergedCredentials = this.mergeCredentialUpdates(existing.type, existingCredentials, input);
      updates.encrypted_credentials = await encryptJSON(mergedCredentials);
    }

    // Update integration
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .update(updates)
      .eq('id', integrationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update integration: ${error?.message ?? 'Unknown error'}`);
    }

    // Remove encrypted credentials and redact config from response
    const { encrypted_credentials: _, ...rest } = data as IIntegration;
    return { ...rest, config: redactConfig(rest.config) };
  }

  /**
   * Delete an integration
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving when deleted
   */
  async delete(integrationId: string, userId: string): Promise<void> {
    // Verify ownership and check for active campaigns
    const existing = await this.getById(integrationId, userId);
    if (!existing) {
      throw new IntegrationNotFoundError(integrationId);
    }

    // Check if integration is used by any campaigns
    await supabaseAdmin
      .from('campaign_integrations')
      .select('campaign_id')
      .eq('integration_id', integrationId)
      .limit(1);

    // Note: Cascade delete will handle removing campaign_integrations records
    // This is just for potential future warning UI

    // Delete integration (cascade deletes will happen automatically)
    const { error } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }
  }

  /**
   * Test connection to an integration
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving to test result
   */
  async testConnection(integrationId: string, userId: string): Promise<ITestConnectionResult> {
    // Get integration with encrypted credentials
    const integration = await this.getRawIntegration(integrationId, userId);
    if (!integration) {
      throw new IntegrationNotFoundError(integrationId);
    }

    try {
      // Decrypt credentials
      const credentials = await decryptJSON<IIntegrationCredentials>(
        integration.encrypted_credentials
      );

      // Get adapter and test connection
      const adapter = getAdapter(integration.type);
      const testResult = await adapter.testConnection(integration.config, credentials);

      // Update integration status and last_tested_at
      const updates: Record<string, unknown> = {
        last_tested_at: new Date().toISOString(),
      };

      if (testResult.success) {
        updates.status = 'active';
      } else {
        updates.status = 'error';
      }

      await supabaseAdmin.from('integrations').update(updates).eq('id', integrationId);

      return testResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Update integration status to error
      await supabaseAdmin
        .from('integrations')
        .update({
          status: 'error',
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', integrationId);

      throw new ConnectionTestError(message);
    }
  }

  /**
   * Get integration with decrypted credentials
   * Internal use only for delivery service
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving to integration with decrypted credentials
   */
  async getWithCredentials(
    integrationId: string,
    userId: string
  ): Promise<{
    integration: IIntegration;
    credentials: IIntegrationCredentials;
  }> {
    const integration = await this.getRawIntegration(integrationId, userId);
    if (!integration) {
      throw new IntegrationNotFoundError(integrationId);
    }

    try {
      const credentials = await decryptJSON<IIntegrationCredentials>(
        integration.encrypted_credentials
      );
      return { integration, credentials };
    } catch {
      throw new Error('Failed to decrypt integration credentials');
    }
  }

  /**
   * Get integration with encrypted credentials (internal use only)
   *
   * @param integrationId - The integration ID
   * @param userId - The user ID (for ownership check)
   * @returns Promise resolving to integration or null
   */
  private async getRawIntegration(
    integrationId: string,
    userId: string
  ): Promise<IIntegration | null> {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get integration: ${error.message}`);
    }

    return (data as IIntegration) || null;
  }

  /**
   * Get integrations assigned to a campaign
   *
   * @param campaignId - The campaign ID
   * @param userId - The user ID (for ownership check via campaign)
   * @returns Promise resolving to campaign integrations
   */
  async getCampaignIntegrations(
    campaignId: string,
    userId: string
  ): Promise<{ integrations: Array<{ id: string; enabled: boolean } & IIntegrationResponse> }> {
    // Verify campaign ownership
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Get campaign integrations
    const { data, error } = await supabaseAdmin
      .from('campaign_integrations')
      .select(
        `
        id,
        enabled,
        integrations (*)
      `
      )
      .eq('campaign_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch campaign integrations: ${error.message}`);
    }

    const integrations = (data || [])
      .map((ci: { id: string; enabled: boolean; integrations: IIntegration[] | null }) => {
        // Supabase returns nested relations as arrays
        const integrationArray = ci.integrations;
        const integration = integrationArray?.[0] as IIntegration | undefined;
        if (!integration) return null;
        const { encrypted_credentials: _, id: integrationId, ...integrationRest } = integration;
        return {
          id: ci.id,
          integration_id: integrationId,
          enabled: ci.enabled,
          ...integrationRest,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return { integrations };
  }

  /**
   * Set integrations for a campaign
   *
   * @param campaignId - The campaign ID
   * @param userId - The user ID (for ownership check)
   * @param integrationIds - Array of integration IDs to assign
   * @param autoPublish - Whether to auto-publish articles
   * @returns Promise resolving when set
   */
  async setCampaignIntegrations(
    campaignId: string,
    userId: string,
    integrationIds: string[],
    autoPublish: boolean
  ): Promise<void> {
    // Verify campaign ownership
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, settings')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Verify all integration IDs belong to the user
    if (integrationIds.length > 0) {
      const { data: integrations } = await supabaseAdmin
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .in('id', integrationIds);

      const validIds = new Set(integrations?.map(i => i.id) || []);
      const invalidIds = integrationIds.filter(id => !validIds.has(id));

      if (invalidIds.length > 0) {
        throw new Error(`Invalid integration IDs: ${invalidIds.join(', ')}`);
      }
    }

    // Delete existing campaign integrations
    await supabaseAdmin.from('campaign_integrations').delete().eq('campaign_id', campaignId);

    // Insert new campaign integrations
    if (integrationIds.length > 0) {
      const rows = integrationIds.map(integrationId => ({
        campaign_id: campaignId,
        integration_id: integrationId,
        enabled: true,
      }));

      const { error } = await supabaseAdmin.from('campaign_integrations').insert(rows);

      if (error) {
        throw new Error(`Failed to set campaign integrations: ${error.message}`);
      }
    }

    // Update campaign auto_publish setting
    const settings = (campaign.settings as Record<string, unknown>) || {};
    settings.auto_publish = autoPublish;

    await supabaseAdmin.from('campaigns').update({ settings }).eq('id', campaignId);
  }

  /**
   * Assign a single integration to a campaign and optionally enable auto-publish.
   *
   * This is designed for onboarding glue so integration creation and assignment
   * can be performed server-side with compensation on failure.
   */
  async assignIntegrationToCampaign(
    campaignId: string,
    userId: string,
    integrationId: string,
    autoPublish = true
  ): Promise<void> {
    // Verify campaign ownership
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, settings')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Verify integration ownership
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .single();

    if (!integration) {
      throw new Error('Integration not found or access denied');
    }

    // Ensure assignment exists and stays enabled (idempotent across retries)
    const { data: existingAssignment, error: existingAssignmentError } = await supabaseAdmin
      .from('campaign_integrations')
      .select('id, enabled')
      .eq('campaign_id', campaignId)
      .eq('integration_id', integrationId)
      .maybeSingle();

    if (existingAssignmentError && existingAssignmentError.code !== 'PGRST116') {
      throw new Error(`Failed to verify campaign assignment: ${existingAssignmentError.message}`);
    }

    if (existingAssignment) {
      if (!existingAssignment.enabled) {
        const { error: enableError } = await supabaseAdmin
          .from('campaign_integrations')
          .update({ enabled: true })
          .eq('id', existingAssignment.id);

        if (enableError) {
          throw new Error(`Failed to enable campaign assignment: ${enableError.message}`);
        }
      }
    } else {
      const { error: insertAssignmentError } = await supabaseAdmin
        .from('campaign_integrations')
        .insert({
          campaign_id: campaignId,
          integration_id: integrationId,
          enabled: true,
        });

      if (insertAssignmentError) {
        throw new Error(`Failed to assign integration to campaign: ${insertAssignmentError.message}`);
      }
    }

    if (!autoPublish) {
      return;
    }

    const settings = (campaign.settings as Record<string, unknown>) || {};
    if (settings.auto_publish === true) {
      return;
    }

    const { error: settingsError } = await supabaseAdmin
      .from('campaigns')
      .update({
        settings: {
          ...settings,
          auto_publish: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (settingsError) {
      throw new Error(`Failed to enable auto-publish: ${settingsError.message}`);
    }
  }
}

/**
 * Singleton instance of integration service
 */
export const integrationService = new IntegrationService();
