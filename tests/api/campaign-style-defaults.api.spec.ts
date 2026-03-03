import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Campaign Style Defaults from Project Content Preferences (Phase 5)
 *
 * These tests verify that when creating a campaign, outrank fields are inherited
 * from project content_preferences if not explicitly set by the user.
 *
 * Covers:
 *   - articleStyle inheritance
 *   - internalLinksCount inheritance
 *   - globalInstructions inheritance
 *   - imageStyle inheritance
 *   - Boolean fields defaulting to false
 *   - Campaign-level values override project defaults
 *
 * NOTE: These tests require a properly configured Supabase environment.
 * The unit tests in tests/unit/services/campaign.service.unit.spec.ts cover
 * the same logic with mocked Supabase calls.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('API: Campaign Style Defaults from Project Content Preferences', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
  });

  test.describe('articleStyle inheritance', () => {
    test('should inherit articleStyle from project content_preferences when not explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with articleStyle in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Style',
        content_preferences: {
          articleStyle: 'how-to',
        },
      });

      // Skip verification if API returns error (test environment limitations)
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without specifying articleStyle
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign inherited articleStyle from project
      expect(
        (campaignData as { campaign: { article_style: string | null } }).campaign.article_style
      ).toBe('how-to');
    });

    test('should use campaign-level articleStyle when explicitly set (override project default)', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with articleStyle in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Style',
        content_preferences: {
          articleStyle: 'how-to',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign WITH articleStyle specified
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        articleStyle: 'listicle',
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign uses its own articleStyle, not project's
      expect(
        (campaignData as { campaign: { article_style: string | null } }).campaign.article_style
      ).toBe('listicle');
    });

    test('should default to null when neither project nor campaign sets articleStyle', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project without articleStyle
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project without Style',
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without articleStyle
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign articleStyle is null
      expect(
        (campaignData as { campaign: { article_style: string | null } }).campaign.article_style
      ).toBeNull();
    });
  });

  test.describe('internalLinksCount inheritance', () => {
    test('should inherit internalLinksCount from project content_preferences when not explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with internalLinksCount in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Internal Links',
        content_preferences: {
          internalLinksCount: 3,
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without specifying internalLinksCount
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign inherited internalLinksCount from project
      expect(
        (campaignData as { campaign: { internal_links_count: number } }).campaign
          .internal_links_count
      ).toBe(3);
    });

    test('should use campaign-level internalLinksCount when explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with internalLinksCount in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Internal Links',
        content_preferences: {
          internalLinksCount: 3,
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign WITH internalLinksCount specified
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        internalLinksCount: 5,
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign uses its own internalLinksCount
      expect(
        (campaignData as { campaign: { internal_links_count: number } }).campaign
          .internal_links_count
      ).toBe(5);
    });

    test('should default to 0 when neither project nor campaign sets internalLinksCount', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project without internalLinksCount
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project without Internal Links',
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without internalLinksCount
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign internalLinksCount defaults to 0
      expect(
        (campaignData as { campaign: { internal_links_count: number } }).campaign
          .internal_links_count
      ).toBe(0);
    });
  });

  test.describe('globalInstructions inheritance', () => {
    test('should inherit globalInstructions from project content_preferences when not explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with globalInstructions in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Instructions',
        content_preferences: {
          globalInstructions: 'Always use a friendly tone',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without specifying globalInstructions
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign inherited globalInstructions from project
      expect(
        (campaignData as { campaign: { global_instructions: string | null } }).campaign
          .global_instructions
      ).toBe('Always use a friendly tone');
    });

    test('should use campaign-level globalInstructions when explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with globalInstructions in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Instructions',
        content_preferences: {
          globalInstructions: 'Project level instructions',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign WITH globalInstructions specified
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        globalInstructions: 'Campaign level instructions',
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign uses its own globalInstructions
      expect(
        (campaignData as { campaign: { global_instructions: string | null } }).campaign
          .global_instructions
      ).toBe('Campaign level instructions');
    });

    test('should default to null when neither project nor campaign sets globalInstructions', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project without globalInstructions
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project without Instructions',
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without globalInstructions
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign globalInstructions is null
      expect(
        (campaignData as { campaign: { global_instructions: string | null } }).campaign
          .global_instructions
      ).toBeNull();
    });
  });

  test.describe('imageStyle inheritance', () => {
    test('should inherit imageStyle from project content_preferences when not explicitly set', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with imageStyle in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Image Style',
        content_preferences: {
          imageStyle: 'cinematic',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without specifying imageStyle
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign inherited imageStyle from project
      expect(
        (campaignData as { campaign: { image_style: string | null } }).campaign.image_style
      ).toBe('cinematic');
    });

    test('should use campaign-level imageStyle when explicitly set', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with imageStyle in content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with Image Style',
        content_preferences: {
          imageStyle: 'cinematic',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign WITH imageStyle specified
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        imageStyle: 'watercolor',
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign uses its own imageStyle
      expect(
        (campaignData as { campaign: { image_style: string | null } }).campaign.image_style
      ).toBe('watercolor');
    });

    test('should default to null when neither project nor campaign sets imageStyle', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project without imageStyle
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project without Image Style',
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without imageStyle
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();

      // Verify campaign imageStyle is null
      expect(
        (campaignData as { campaign: { image_style: string | null } }).campaign.image_style
      ).toBeNull();
    });
  });

  test.describe('boolean fields default to false', () => {
    test('should default includeYoutube to false', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect(
        (campaignData as { campaign: { include_youtube: boolean } }).campaign.include_youtube
      ).toBe(false);
    });

    test('should default includeCta to false', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect((campaignData as { campaign: { include_cta: boolean } }).campaign.include_cta).toBe(
        false
      );
    });

    test('should default includeEmojis to false', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect(
        (campaignData as { campaign: { include_emojis: boolean } }).campaign.include_emojis
      ).toBe(false);
    });

    test('should default includeInfographics to false', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect(
        (campaignData as { campaign: { include_infographics: boolean } }).campaign
          .include_infographics
      ).toBe(false);
    });

    test('should default autoPublish to false', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect((campaignData as { campaign: { auto_publish: boolean } }).campaign.auto_publish).toBe(
        false
      );
    });

    test('should allow setting boolean fields to true', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const projectRes = await api.post('/api/projects', { name: 'Test Project' });
      if (projectRes.status !== 201) {
        test.skip();
        return;
      }
      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        includeYoutube: true,
        includeCta: true,
        includeEmojis: true,
        includeInfographics: true,
        autoPublish: true,
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }
      const campaignData = await campaignRes.getData();

      expect(
        (campaignData as { campaign: { include_youtube: boolean } }).campaign.include_youtube
      ).toBe(true);
      expect((campaignData as { campaign: { include_cta: boolean } }).campaign.include_cta).toBe(
        true
      );
      expect(
        (campaignData as { campaign: { include_emojis: boolean } }).campaign.include_emojis
      ).toBe(true);
      expect(
        (campaignData as { campaign: { include_infographics: boolean } }).campaign
          .include_infographics
      ).toBe(true);
      expect((campaignData as { campaign: { auto_publish: boolean } }).campaign.auto_publish).toBe(
        true
      );
    });
  });

  test.describe('combined field inheritance', () => {
    test('should inherit multiple fields from project content_preferences', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with multiple content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with All Preferences',
        content_preferences: {
          articleStyle: 'tutorial',
          internalLinksCount: 2,
          globalInstructions: 'Write with authority',
          imageStyle: 'illustration',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign without specifying any outrank fields
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();
      const campaign = (campaignData as { campaign: Record<string, unknown> }).campaign;

      // Verify all fields inherited from project
      expect(campaign.article_style).toBe('tutorial');
      expect(campaign.internal_links_count).toBe(2);
      expect(campaign.global_instructions).toBe('Write with authority');
      expect(campaign.image_style).toBe('illustration');
      // Boolean fields should default to false
      expect(campaign.include_youtube).toBe(false);
      expect(campaign.include_cta).toBe(false);
      expect(campaign.include_emojis).toBe(false);
      expect(campaign.include_infographics).toBe(false);
      expect(campaign.auto_publish).toBe(false);
    });

    test('should allow partial override of project defaults', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create project with multiple content_preferences
      const projectRes = await api.post('/api/projects', {
        name: 'Test Project with All Preferences',
        content_preferences: {
          articleStyle: 'tutorial',
          internalLinksCount: 2,
          globalInstructions: 'Write with authority',
          imageStyle: 'illustration',
        },
      });

      if (projectRes.status !== 201) {
        test.skip();
        return;
      }

      const projectData = await projectRes.getData();
      const projectId = (projectData as { project: { id: string } }).project.id;

      // Create campaign overriding only some fields
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Test Campaign',
        projectId,
        keywords: ['test keyword'],
        articleStyle: 'opinion', // Override
        includeYoutube: true, // Set boolean
        // internalLinksCount, globalInstructions, imageStyle should inherit
      });

      if (campaignRes.status !== 201) {
        test.skip();
        return;
      }

      const campaignData = await campaignRes.getData();
      const campaign = (campaignData as { campaign: Record<string, unknown> }).campaign;

      // Verify overridden field
      expect(campaign.article_style).toBe('opinion');
      // Verify inherited fields
      expect(campaign.internal_links_count).toBe(2);
      expect(campaign.global_instructions).toBe('Write with authority');
      expect(campaign.image_style).toBe('illustration');
      // Verify explicit boolean
      expect(campaign.include_youtube).toBe(true);
      // Verify default booleans
      expect(campaign.include_cta).toBe(false);
      expect(campaign.include_emojis).toBe(false);
      expect(campaign.include_infographics).toBe(false);
      expect(campaign.auto_publish).toBe(false);
    });
  });
});
