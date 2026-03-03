import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { resetInMemorySupabase } from '@server/supabase/inMemorySupabaseAdmin';
import { ArticleGenerationService } from '@server/services/article-generation.service';
import { deliveryService } from '@server/services/delivery.service';
import { integrationService } from '@server/services/integration.service';
import { qaService } from '@server/services/qa.service';
import { articleQualityGateService } from '@server/services/article-quality-gate.service';
import { openaiEmbeddingsService } from '@server/services/openai-embeddings.service';

const adapterMocks = vi.hoisted(() => ({
  publish: vi.fn(),
  testConnection: vi.fn(),
}));

vi.mock('@server/integrations', () => ({
  getAdapter: vi.fn(() => ({
    type: 'webhook',
    publish: adapterMocks.publish,
    testConnection: adapterMocks.testConnection,
  })),
}));

describe('Auto-publish glue flow', () => {
  const userId = 'user-1';
  const projectId = 'project-1';
  const campaignId = 'campaign-1';
  const articleId = 'article-1';
  const integrationId = 'integration-1';

  beforeEach(async () => {
    vi.clearAllMocks();
    resetInMemorySupabase();

    adapterMocks.publish.mockResolvedValue({
      success: true,
      externalId: 'ext-123',
      externalUrl: 'https://example.com/published-post',
    });
    adapterMocks.testConnection.mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
    });

    await supabaseAdmin.from('projects').insert({
      id: projectId,
      user_id: userId,
      name: 'Project One',
      qa_config: null,
    });

    await supabaseAdmin.from('campaigns').insert({
      id: campaignId,
      user_id: userId,
      project_id: projectId,
      name: 'Campaign One',
      status: 'active',
      settings: { auto_publish: true },
    });

    await supabaseAdmin.from('integrations').insert({
      id: integrationId,
      user_id: userId,
      type: 'webhook',
      name: 'Webhook Integration',
      config: { url: 'https://example.com/webhook' },
      encrypted_credentials: 'encrypted',
      status: 'active',
    });

    await supabaseAdmin.from('campaign_integrations').insert({
      campaign_id: campaignId,
      integration_id: integrationId,
      enabled: true,
    });

    await supabaseAdmin.from('articles').insert({
      id: articleId,
      user_id: userId,
      project_id: projectId,
      campaign_id: campaignId,
      title: 'Placeholder',
      primary_keyword: 'integration keyword',
      status: 'pending',
      attempt_count: 1,
      credits_used: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates article and auto-delivers to integration when auto-publish is enabled', async () => {
    const service = new ArticleGenerationService();

    vi.spyOn(openaiEmbeddingsService, 'isConfigured').mockReturnValue(false);

    vi.spyOn(articleQualityGateService, 'checkQualityGates').mockReturnValue({
      passed: true,
      details: {
        wordCountCheck: { passed: true, actual: 900, target: 1000, percentage: 90 },
        headingCheck: { passed: true, h2Count: 3, required: 3 },
        metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
        completionCheck: { passed: true, finishReason: 'stop' },
      },
    });

    vi.spyOn(qaService, 'runQAChecks').mockResolvedValue({
      passed: true,
      failureReason: undefined,
      results: {
        plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
        factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
        readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
        aiLikelihood: { passed: true, aiScore: 0.2, confidence: 'low' },
      },
    });

    vi.spyOn(integrationService, 'getWithCredentials').mockResolvedValue({
      integration: {
        id: integrationId,
        user_id: userId,
        type: 'webhook',
        name: 'Webhook Integration',
        config: { url: 'https://example.com/webhook' },
        encrypted_credentials: 'encrypted',
        status: 'active',
        last_tested_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      credentials: { secret: 'test-secret' },
    });

    (service as any).generateOutline = vi.fn().mockResolvedValue({
      data: {
        title: 'Generated Title',
        metaDescription: 'Generated meta description',
        slug: 'generated-title',
        sections: [
          { heading: 'Introduction', keyPoints: ['A', 'B'] },
          { heading: 'Main Section', keyPoints: ['C', 'D'] },
          { heading: 'Conclusion', keyPoints: ['E'] },
        ],
      },
      usage: { totalTokens: 100 },
    });

    (service as any).generateFullArticle = vi.fn().mockResolvedValue({
      content: `## Introduction

This is an intro paragraph with enough words to pass checks.

## Main Section

More body content goes here with useful information.

## Conclusion

Final summary paragraph.`,
      usage: { totalTokens: 200 },
      finishReason: 'stop',
    });

    const deliverSpy = vi.spyOn(deliveryService, 'deliverArticle').mockResolvedValue({
      successful: 1,
      failed: 0,
      results: [
        {
          integrationId,
          success: true,
          externalId: 'ext-123',
          externalUrl: 'https://example.com/published-post',
        },
      ],
    });
    vi.spyOn(deliveryService, 'shouldAutoDeliver').mockResolvedValue(true);

    await service.generateArticle(articleId, userId, {
      keyword: 'integration keyword',
      projectId,
      campaignId,
      targetWordCount: 1000,
    });

    expect(deliverSpy).toHaveBeenCalledWith(articleId);
  });
});
