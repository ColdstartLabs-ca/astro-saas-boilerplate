import { describe, test, expect } from 'vitest';
import {
  getAllGeoPages,
  getGeoPageBySlug,
  getAllGeoSlugs,
  getGeoPagesBySlugs,
  getFullGeoPagesBySlugs,
} from '../geo';

describe('geo', () => {
  describe('getAllGeoPages', () => {
    test('should return all GEO pages with metadata', () => {
      const pages = getAllGeoPages();

      expect(pages.length).toBe(8);
      expect(pages[0]).toHaveProperty('slug');
      expect(pages[0]).toHaveProperty('title');
      expect(pages[0]).toHaveProperty('metaTitle');
      expect(pages[0]).toHaveProperty('metaDescription');
      expect(pages[0]).toHaveProperty('h1');
      expect(pages[0]).toHaveProperty('topic');
      expect(pages[0]).toHaveProperty('lastUpdated');
    });

    test('should return pages in correct order from JSON', () => {
      const pages = getAllGeoPages();

      expect(pages[0].slug).toBe('how-to-get-mentioned-in-chatgpt');
      expect(pages[1].slug).toBe('optimize-for-ai-overviews');
    });
  });

  describe('getGeoPageBySlug', () => {
    test('getGeoPageBySlug returns page for valid slug', () => {
      const page = getGeoPageBySlug('how-to-get-mentioned-in-chatgpt');

      expect(page).not.toBeNull();
      expect(page?.slug).toBe('how-to-get-mentioned-in-chatgpt');
      expect(page?.topic).toBe('ChatGPT mentions');
      expect(page?.primaryKeyword).toBe('get mentioned in chatgpt');
    });

    test('getGeoPageBySlug returns null for invalid slug', () => {
      const result = getGeoPageBySlug('non-existent-slug');

      expect(result).toBeNull();
    });

    test('should return full page data including tactics and FAQs', () => {
      const page = getGeoPageBySlug('generative-engine-optimization');

      expect(page).not.toBeNull();
      expect(page?.howAiCites).toBeInstanceOf(Array);
      expect(page?.howAiCites.length).toBeGreaterThan(0);
      expect(page?.tacticsWithExamples).toBeInstanceOf(Array);
      expect(page?.tacticsWithExamples.length).toBeGreaterThan(0);
      expect(page?.faqs).toBeInstanceOf(Array);
      expect(page?.faqs.length).toBeGreaterThan(0);
      expect(page?.autopilotRankAngle).toBeTruthy();
    });
  });

  describe('getAllGeoSlugs', () => {
    test('getAllGeoSlugs returns all 8 slugs', () => {
      const slugs = getAllGeoSlugs();

      expect(slugs.length).toBe(8);
      expect(slugs).toContain('how-to-get-mentioned-in-chatgpt');
      expect(slugs).toContain('optimize-for-ai-overviews');
      expect(slugs).toContain('generative-engine-optimization');
      expect(slugs).toContain('get-cited-by-perplexity');
      expect(slugs).toContain('ai-answer-engine-optimization');
      expect(slugs).toContain('appear-in-google-ai-overview');
      expect(slugs).toContain('llm-seo-strategy-2026');
      expect(slugs).toContain('ai-citation-optimization-guide');
    });

    test('should return unique slugs', () => {
      const slugs = getAllGeoSlugs();
      const uniqueSlugs = new Set(slugs);

      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe('getGeoPagesBySlugs', () => {
    test('should return metadata for valid slugs', () => {
      const slugs = ['how-to-get-mentioned-in-chatgpt', 'optimize-for-ai-overviews'];
      const pages = getGeoPagesBySlugs(slugs);

      expect(pages.length).toBe(2);
      expect(pages[0].slug).toBe('how-to-get-mentioned-in-chatgpt');
      expect(pages[1].slug).toBe('optimize-for-ai-overviews');
    });

    test('should filter out invalid slugs', () => {
      const slugs = [
        'how-to-get-mentioned-in-chatgpt',
        'invalid-slug',
        'optimize-for-ai-overviews',
      ];
      const pages = getGeoPagesBySlugs(slugs);

      expect(pages.length).toBe(2);
    });

    test('should return empty array for no valid slugs', () => {
      const pages = getGeoPagesBySlugs(['invalid-1', 'invalid-2']);

      expect(pages.length).toBe(0);
    });

    test('should maintain slug order', () => {
      const slugs = ['generative-engine-optimization', 'how-to-get-mentioned-in-chatgpt'];
      const pages = getGeoPagesBySlugs(slugs);

      expect(pages[0].slug).toBe('generative-engine-optimization');
      expect(pages[1].slug).toBe('how-to-get-mentioned-in-chatgpt');
    });
  });

  describe('getFullGeoPagesBySlugs', () => {
    test('should return full page data for valid slugs', () => {
      const slugs = ['get-cited-by-perplexity'];
      const pages = getFullGeoPagesBySlugs(slugs);

      expect(pages.length).toBe(1);
      expect(pages[0].slug).toBe('get-cited-by-perplexity');
      expect(pages[0].howAiCites).toBeInstanceOf(Array);
      expect(pages[0].tacticsWithExamples).toBeInstanceOf(Array);
      expect(pages[0].faqs).toBeInstanceOf(Array);
    });

    test('should filter out invalid slugs', () => {
      const slugs = ['valid-slug-that-does-not-exist', 'ai-citation-optimization-guide'];
      const pages = getFullGeoPagesBySlugs(slugs);

      expect(pages.length).toBe(1);
      expect(pages[0].slug).toBe('ai-citation-optimization-guide');
    });
  });

  describe('Page data integrity', () => {
    test('all pages should have required fields', () => {
      const slugs = getAllGeoSlugs();

      slugs.forEach(slug => {
        const page = getGeoPageBySlug(slug);

        expect(page).not.toBeNull();
        expect(page?.slug).toBeTruthy();
        expect(page?.title).toBeTruthy();
        expect(page?.metaTitle).toBeTruthy();
        expect(page?.metaDescription).toBeTruthy();
        expect(page?.h1).toBeTruthy();
        expect(page?.primaryKeyword).toBeTruthy();
        expect(page?.topic).toBeTruthy();
        expect(page?.problemStatement).toBeTruthy();
        expect(page?.howAiCites).toBeInstanceOf(Array);
        expect(page?.tacticsWithExamples).toBeInstanceOf(Array);
        expect(page?.autopilotRankAngle).toBeTruthy();
        expect(page?.faqs).toBeInstanceOf(Array);
        expect(page?.relatedGeoPages).toBeInstanceOf(Array);
      });
    });

    test('all tactics should have valid difficulty levels', () => {
      const slugs = getAllGeoSlugs();
      const validDifficulties = ['easy', 'medium', 'hard'];

      slugs.forEach(slug => {
        const page = getGeoPageBySlug(slug);

        page?.tacticsWithExamples.forEach(tactic => {
          expect(validDifficulties).toContain(tactic.difficulty);
        });
      });
    });

    test('all howAiCites steps should be numbered', () => {
      const slugs = getAllGeoSlugs();

      slugs.forEach(slug => {
        const page = getGeoPageBySlug(slug);

        page?.howAiCites.forEach((step, index) => {
          expect(step.step).toBe(index + 1);
          expect(step.title).toBeTruthy();
          expect(step.description).toBeTruthy();
        });
      });
    });

    test('relatedGeoPages should reference valid slugs', () => {
      const allSlugs = getAllGeoSlugs();
      const slugs = getAllGeoSlugs();

      slugs.forEach(slug => {
        const page = getGeoPageBySlug(slug);

        page?.relatedGeoPages.forEach(relatedSlug => {
          expect(allSlugs).toContain(relatedSlug);
        });
      });
    });
  });
});
