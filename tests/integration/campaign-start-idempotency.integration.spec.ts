/**
 * Integration Tests: Campaign Start Idempotency
 *
 * Tests for idempotency and locking on campaign start endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TestContext } from '../helpers';
import { CampaignIdempotencyService } from '@server/services/campaign-idempotency.service';
import { campaignService } from '@server/services/campaign.service';

describe('Campaign Start Idempotency - Integration Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = new TestContext();
  });

  describe('Concurrent Start Requests', () => {
    it('should prevent duplicate articles on concurrent start requests', async () => {
      // Create a user with credits
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 100,
      });

      // Create a project
      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      // Create a campaign with keywords
      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['keyword1', 'keyword2', 'keyword3'],
        model: 'auto',
        tone: 'professional',
      });

      // Get initial article count
      const initialArticles = await ctx.getArticlesByCampaign(campaign.id);

      // Make concurrent start requests with same idempotency key
      const idempotencyKey = CampaignIdempotencyService.generateIdempotencyKey();

      const [result1, result2, result3] = await Promise.allSettled([
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey),
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey),
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey),
      ]);

      // First request should succeed
      expect(result1.status).toBe('fulfilled');
      if (result1.status === 'fulfilled') {
        expect(result1.value.queued).toBe(3);
        expect(result1.value.creditsRequired).toBe(3); // 1 credit per keyword
      }

      // Subsequent requests should also succeed but with cached data
      expect(result2.status).toBe('fulfilled');
      expect(result3.status).toBe('fulfilled');

      // Get final article count - should be exactly 3 (no duplicates)
      const finalArticles = await ctx.getArticlesByCampaign(campaign.id);

      // Should have created exactly 3 articles (one per keyword)
      expect(finalArticles.length).toBe(3);
      expect(finalArticles.length).toBe(initialArticles.length + 3);

      // Verify all articles are unique
      const articleIds = new Set(finalArticles.map(a => a.id));
      expect(articleIds.size).toBe(finalArticles.length);
    });

    it('should return cached response on retry with same idempotency key', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1', 'test2'],
        model: 'auto',
        tone: 'professional',
      });

      const idempotencyKey = CampaignIdempotencyService.generateIdempotencyKey();

      // First request
      const result1 = await campaignService.startGenerationWithIdempotency(
        campaign.id,
        user.id,
        idempotencyKey
      );

      expect(result1.queued).toBe(2);
      expect(result1.creditsRequired).toBe(2);

      // Second request with same key (should return cached)
      const result2 = await campaignService.startGenerationWithIdempotency(
        campaign.id,
        user.id,
        idempotencyKey
      );

      expect(result2.queued).toBe(2);
      expect(result2.creditsRequired).toBe(2);

      // Verify only 2 articles were created (not 4)
      const articles = await ctx.getArticlesByCampaign(campaign.id);
      expect(articles.length).toBe(2);
    });

    it('should prevent double-charging credits on concurrent requests', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 10, // Exactly enough for 5 keywords at 2 credits each (1 + 1 image)
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['kw1', 'kw2', 'kw3', 'kw4', 'kw5'],
        model: 'auto',
        tone: 'professional',
        imagePreset: 'standard', // +1 credit per article
      });

      // Get initial credit balance
      const initialCredits = await ctx.getUserCredits(user.id);

      // Make concurrent requests with same idempotency key
      const idempotencyKey = CampaignIdempotencyService.generateIdempotencyKey();

      await Promise.all([
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey),
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey),
      ]);

      // Get final credit balance
      const finalCredits = await ctx.getUserCredits(user.id);

      // Should have deducted exactly 10 credits (5 keywords * 2 credits)
      // Not 20 credits which would happen if both requests succeeded
      expect(initialCredits - finalCredits).toBe(10);
    });

    it('should reject concurrent start with different idempotency keys', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1', 'test2'],
        model: 'auto',
        tone: 'professional',
      });

      // First request
      const result1 = await campaignService.startGenerationWithIdempotency(
        campaign.id,
        user.id,
        CampaignIdempotencyService.generateIdempotencyKey()
      );

      expect(result1.queued).toBe(2);

      // Second concurrent request with different idempotency key
      // Should fail because campaign is already running
      await expect(
        campaignService.startGenerationWithIdempotency(
          campaign.id,
          user.id,
          CampaignIdempotencyService.generateIdempotencyKey()
        )
      ).rejects.toThrow('already running');
    });
  });

  describe('Idempotency Key Validation', () => {
    it('should accept valid UUID v4 idempotency keys', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1'],
        model: 'auto',
        tone: 'professional',
      });

      const validUUID = '550e8400-e29b-41d4-a716-446655440000';

      const result = await campaignService.startGenerationWithIdempotency(
        campaign.id,
        user.id,
        validUUID
      );

      expect(result.queued).toBe(1);
    });

    it('should accept long string idempotency keys (32+ chars)', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1'],
        model: 'auto',
        tone: 'professional',
      });

      const longKey = 'a'.repeat(32);

      const result = await campaignService.startGenerationWithIdempotency(
        campaign.id,
        user.id,
        longKey
      );

      expect(result.queued).toBe(1);
    });

    it('should reject short idempotency keys', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1'],
        model: 'auto',
        tone: 'professional',
      });

      await expect(
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, 'short-key')
      ).rejects.toThrow('Invalid idempotency key format');
    });
  });

  describe('Campaign Run ID Cleanup', () => {
    it('should clear generation_run_id after completion', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 50,
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1'],
        model: 'auto',
        tone: 'professional',
      });

      const idempotencyKey = CampaignIdempotencyService.generateIdempotencyKey();

      // Start generation
      await campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey);

      // Wait a bit for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get updated campaign
      const updatedCampaign = await ctx.getCampaignById(campaign.id);

      // generation_run_id should be cleared after completion
      expect(updatedCampaign.generation_run_id).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should mark generation as failed on error', async () => {
      const user = await ctx.createUser({
        subscription: 'active',
        tier: 'pro',
        credits: 1, // Not enough credits
      });

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
        url: 'https://example.com',
      });

      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Test Campaign',
        keywords: ['test1', 'test2', 'test3'],
        model: 'auto',
        tone: 'professional',
      });

      const idempotencyKey = CampaignIdempotencyService.generateIdempotencyKey();

      // Should fail due to insufficient credits
      await expect(
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey)
      ).rejects.toThrow();

      // Retry with same key should return the failed status (not attempt again)
      await expect(
        campaignService.startGenerationWithIdempotency(campaign.id, user.id, idempotencyKey)
      ).rejects.toThrow();

      // Verify no articles were created
      const articles = await ctx.getArticlesByCampaign(campaign.id);
      expect(articles.length).toBe(0);
    });
  });
});
