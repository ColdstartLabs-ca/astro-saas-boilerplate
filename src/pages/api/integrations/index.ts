/**
 * Integrations API Routes
 * GET /api/integrations - List user's integrations
 * POST /api/integrations - Create a new integration
 */

import { z } from 'zod';
import { integrationService } from '@server/services/integration.service';
import { withAuth, withAuthAndBody, jsonResponse, handleApiError } from '@pages/api/_utils';
import type {
  ICreateIntegrationInput,
  IIntegrationsListResponse,
  ICreateIntegrationResponse,
} from '@shared/types/integration.types';

/**
 * Validation schema for creating a WordPress integration
 */
const createWordPressSchema = z.object({
  type: z.literal('wordpress'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  siteUrl: z.string().url('Invalid site URL'),
  username: z.string().min(1, 'Username is required'),
  appPassword: z.string().min(1, 'Application password is required'),
});

/**
 * Validation schema for creating a webhook integration
 */
const createWebhookSchema = z.object({
  type: z.literal('webhook'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Invalid webhook URL'),
  secret: z.string().optional(),
});

/**
 * Validation schema for creating a webflow integration
 */
const createWebflowFieldMapSchema = z.object({
  title: z.string().min(1, 'Field map title is required'),
  slug: z.string().min(1, 'Field map slug is required'),
  content: z.string().min(1, 'Field map content is required'),
  excerpt: z.string().optional(),
  date: z.string().optional(),
  featured_image: z.string().optional(),
});

const createWebflowSchema = z.object({
  type: z.literal('webflow'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  siteId: z.string().min(1, 'Site ID is required'),
  collectionId: z.string().min(1, 'Collection ID is required'),
  fieldMap: createWebflowFieldMapSchema,
  apiToken: z.string().min(1, 'API token is required'),
});

/**
 * Validation schema for creating a wix integration
 */
const createWixSchema = z.object({
  type: z.literal('wix'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  siteId: z.string().min(1, 'Site ID is required'),
  apiKey: z.string().min(1, 'API key is required'),
  accountId: z.string().min(1, 'Account ID is required'),
});

/**
 * Validation schema for creating a notion integration
 */
const createNotionSchema = z.object({
  type: z.literal('notion'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  databaseId: z.string().min(1, 'Database ID is required'),
  integrationToken: z.string().min(1, 'Integration token is required'),
});

/**
 * Validation schema for creating a shopify integration
 */
const createShopifySchema = z.object({
  type: z.literal('shopify'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  storeUrl: z.string().url('Invalid store URL'),
  accessToken: z.string().min(1, 'Access token is required'),
  blogId: z.string().optional(),
});

/**
 * Validation schema for creating a ghost integration
 */
const createGhostSchema = z.object({
  type: z.literal('ghost'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  siteUrl: z.string().url('Invalid site URL'),
  adminApiKey: z.string().min(1, 'Admin API key is required'),
});

/**
 * Validation schema for creating a slack integration
 */
const createSlackSchema = z.object({
  type: z.literal('slack'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  webhookUrl: z.string().url('Invalid webhook URL'),
  channelName: z.string().optional(),
});

/**
 * Discriminated union for creating integrations
 */
const createIntegrationSchema = z.discriminatedUnion('type', [
  createWordPressSchema,
  createWebhookSchema,
  createWebflowSchema,
  createWixSchema,
  createNotionSchema,
  createShopifySchema,
  createGhostSchema,
  createSlackSchema,
]);

/**
 * Optional campaign assignment metadata for onboarding "create + glue" flow.
 */
const createIntegrationWithCampaignSchema = createIntegrationSchema.and(
  z.object({
    campaignId: z.string().uuid('Invalid campaign ID').optional(),
    autoPublish: z.boolean().optional(),
  })
);

/**
 * GET /api/integrations
 * List all integrations for the authenticated user
 *
 * Never returns encrypted_credentials in the response
 */
export const GET = withAuth(async userId => {
  const integrations = await integrationService.list(userId);

  const response: IIntegrationsListResponse = { integrations };
  return jsonResponse(response);
});

/**
 * POST /api/integrations
 * Create a new integration
 *
 * Validates input, encrypts credentials, creates the integration,
 * and automatically tests the connection.
 */
export const POST = withAuthAndBody(createIntegrationWithCampaignSchema, async (userId, input) => {
  const { campaignId, autoPublish = true, ...rawIntegrationInput } = input;
  const integrationInput = rawIntegrationInput as ICreateIntegrationInput;

  const result = await integrationService.create(userId, integrationInput);

  // Server-side glue: create + campaign assignment in one request.
  // If assignment fails, compensate by deleting the just-created integration.
  if (campaignId) {
    try {
      await integrationService.assignIntegrationToCampaign(
        campaignId,
        userId,
        result.integration.id,
        autoPublish
      );
    } catch (assignmentError) {
      try {
        await integrationService.delete(result.integration.id, userId);
      } catch (rollbackError) {
        console.error('Failed to rollback integration after assignment failure:', rollbackError);
      }

      throw assignmentError;
    }
  }

  const response: ICreateIntegrationResponse = result;
  return jsonResponse(response, 201);
});

/**
 * Handle errors
 */
export const onError = handleApiError;
