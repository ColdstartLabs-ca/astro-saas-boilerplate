/**
 * Article Prompts Unit Tests
 *
 * Tests for GSC-aware article generation prompts.
 */

import { describe, it, expect } from 'vitest';
import { getOutlinePrompt, getArticlePrompt, getOutlineRetryPrompt, getArticleRetryPrompt } from '@server/services/prompts/article-prompts';
import type { IGscArticleContext, ArticleStrategy } from '@shared/types/opportunity.types';
import type { IArticleOutline } from '@shared/types/article.types';

describe('server/services/prompts/article-prompts', () => {
  describe('getOutlinePrompt', () => {
    it('should generate basic outline prompt without GSC context', () => {
      const prompt = getOutlinePrompt('test keyword', 'professional', 1500);

      expect(prompt).toContain('test keyword');
      expect(prompt).toContain('professional');
      expect(prompt).toContain('1500');
      expect(prompt).toContain('SEO content strategist');
      expect(prompt).not.toContain('GSC CONTEXT');
    });

    it('should include GSC context in outline prompt when provided', () => {
      const gscContext: IGscArticleContext = {
        opportunityId: 'opp-123',
        opportunityType: 'content_gap',
        query: 'test query',
        metrics: { impressions: 500, position: 15, ctr: 0.02 },
        articleStrategy: 'new_content',
      };

      const prompt = getOutlinePrompt('test keyword', 'professional', 1500, gscContext);

      expect(prompt).toContain('GSC CONTEXT');
      expect(prompt).toContain('500');
      expect(prompt).toContain('content gap');
      expect(prompt).toContain('definitive resource');
    });

    it('should use new_content strategy for content_gap opportunities', () => {
      const gscContext: IGscArticleContext = {
        opportunityId: 'opp-123',
        opportunityType: 'content_gap',
        query: 'new topic query',
        metrics: { impressions: 1000 },
        articleStrategy: 'new_content',
      };

      const prompt = getOutlinePrompt('new topic query', 'professional', 2000, gscContext);

      expect(prompt).toContain('NO existing content');
      expect(prompt).toContain('definitive resource');
      expect(prompt).toContain('Target position 1-3');
    });

    it('should use optimize_existing strategy with position data for low_hanging_fruit', () => {
      const gscContext: IGscArticleContext = {
        opportunityId: 'opp-456',
        opportunityType: 'low_hanging_fruit',
        query: 'optimize this query',
        metrics: { impressions: 800, position: 12, ctr: 0.035 },
        articleStrategy: 'optimize_existing',
        pageUrl: 'https://example.com/existing-page',
      };

      const prompt = getOutlinePrompt('optimize this query', 'casual', 1800, gscContext);

      expect(prompt).toContain('position 12');
      expect(prompt).toContain('3.5% CTR'); // 0.035 * 100 = 3.5%
      expect(prompt).toContain('significantly better');
      expect(prompt).toContain('positions 1-7');
    });

    it('should use topic_hub strategy with related queries for topic_cluster', () => {
      const gscContext: IGscArticleContext = {
        opportunityId: 'opp-789',
        opportunityType: 'topic_cluster',
        query: 'main hub topic',
        metrics: { impressions: 2000 },
        articleStrategy: 'topic_hub',
        relatedQueries: ['sub topic 1', 'sub topic 2', 'sub topic 3'],
      };

      const prompt = getOutlinePrompt('main hub topic', 'professional', 2500, gscContext);

      expect(prompt).toContain('pillar/hub article');
      expect(prompt).toContain('sub topic 1');
      expect(prompt).toContain('sub topic 2');
      expect(prompt).toContain('sub topic 3');
      expect(prompt).toContain('topic cluster');
    });

    it('should omit GSC context when not provided (backwards compatible)', () => {
      const promptWithGsc = getOutlinePrompt('test', 'professional', 1500, {
        opportunityId: 'opp-123',
        opportunityType: 'content_gap',
        query: 'test',
        metrics: { impressions: 100 },
        articleStrategy: 'new_content',
      });

      const promptWithoutGsc = getOutlinePrompt('test', 'professional', 1500);

      // Prompt with GSC should be longer due to context section
      expect(promptWithGsc.length).toBeGreaterThan(promptWithoutGsc.length);
      expect(promptWithoutGsc).not.toContain('GSC CONTEXT');
    });

    it('should handle different tones', () => {
      const casualPrompt = getOutlinePrompt('test', 'casual', 1500);
      const wittyPrompt = getOutlinePrompt('test', 'witty', 1500);
      const academicPrompt = getOutlinePrompt('test', 'academic', 1500);

      expect(casualPrompt).toContain('casual');
      expect(wittyPrompt).toContain('witty');
      expect(academicPrompt).toContain('academic');
    });

    it('should handle different word counts', () => {
      const shortPrompt = getOutlinePrompt('test', 'professional', 800);
      const longPrompt = getOutlinePrompt('test', 'professional', 3000);

      expect(shortPrompt).toContain('800');
      expect(longPrompt).toContain('3000');
    });

    it('should use default values when optional params not provided', () => {
      const prompt = getOutlinePrompt('test keyword');

      expect(prompt).toContain('test keyword');
      expect(prompt).toContain('professional'); // default tone
      expect(prompt).toContain('1500'); // default word count
    });
  });

  describe('getArticlePrompt', () => {
    const sampleOutline: IArticleOutline = {
      title: 'Test Article Title',
      metaDescription: 'This is a test meta description.',
      slug: 'test-article-slug',
      sections: [
        { heading: 'Introduction', keyPoints: ['Point 1', 'Point 2'] },
        { heading: 'Main Section', keyPoints: ['Point 3', 'Point 4'] },
        { heading: 'Conclusion', keyPoints: ['Point 5'] },
      ],
    };

    it('should generate article prompt from outline', () => {
      const prompt = getArticlePrompt(sampleOutline, 'professional', 1500, 0);

      expect(prompt).toContain('Test Article Title');
      expect(prompt).toContain('Introduction');
      expect(prompt).toContain('Main Section');
      expect(prompt).toContain('Conclusion');
    });

    it('should include image placement instructions when imageCount > 0', () => {
      const prompt = getArticlePrompt(sampleOutline, 'professional', 1500, 3);

      expect(prompt).toContain('IMAGE PLACEMENT');
      expect(prompt).toContain('[IMAGE:1]');
      expect(prompt).toContain('[IMAGE:2]');
      expect(prompt).toContain('[IMAGE:3]');
    });

    it('should not include image placement instructions when imageCount is 0', () => {
      const prompt = getArticlePrompt(sampleOutline, 'professional', 1500, 0);

      expect(prompt).not.toContain('IMAGE PLACEMENT');
      expect(prompt).not.toContain('[IMAGE:1]');
    });
  });

  describe('getOutlineRetryPrompt', () => {
    it('should generate stricter retry prompt', () => {
      const prompt = getOutlineRetryPrompt('test keyword');

      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('ONLY valid JSON');
      expect(prompt).toContain('test keyword');
    });

    it('should emphasize JSON-only response', () => {
      const prompt = getOutlineRetryPrompt('test');

      expect(prompt).toContain('No markdown formatting');
      expect(prompt).toContain('no code blocks'); // lowercase in actual prompt
      expect(prompt).toContain('Output ONLY the JSON');
    });
  });

  describe('getArticleRetryPrompt', () => {
    const sampleOutline: IArticleOutline = {
      title: 'Retry Test',
      metaDescription: 'Retry description.',
      slug: 'retry-test',
      sections: [{ heading: 'Section 1', keyPoints: ['A', 'B'] }],
    };

    it('should generate stricter retry prompt with minimum word count', () => {
      const prompt = getArticleRetryPrompt(sampleOutline, 'professional', 1500, 0);

      expect(prompt).toContain('CRITICAL QUALITY REQUIREMENTS');
      expect(prompt).toContain('1200'); // 80% of 1500
      expect(prompt).toContain('DO NOT STOP');
    });

    it('should include image instructions in retry when imageCount > 0', () => {
      const prompt = getArticleRetryPrompt(sampleOutline, 'professional', 1500, 2);

      expect(prompt).toContain('IMAGE PLACEMENT');
      expect(prompt).toContain('[IMAGE:1]');
    });
  });
});
