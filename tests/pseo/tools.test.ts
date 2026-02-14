/**
 * Tests for Tools Pages Data Loader
 *
 * Tests the data loading functions for programmatic SEO free tool pages.
 */

import { describe, it, expect } from 'vitest';

// Import the data loader - this will use the JSON import
import {
  getAllTools,
  getToolBySlug,
  getAllToolSlugs,
  getToolsBySlugs,
  getFullToolsBySlugs,
} from '@server/pseo/tools';

describe('Tools Data Loader', () => {
  describe('getAllTools', () => {
    it('should return array of tool metadata', () => {
      const tools = getAllTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include required fields', () => {
      const tools = getAllTools();
      const tool = tools[0];

      expect(tool).toHaveProperty('slug');
      expect(tool).toHaveProperty('title');
      expect(tool).toHaveProperty('metaTitle');
      expect(tool).toHaveProperty('metaDescription');
      expect(tool).toHaveProperty('h1');
      expect(tool).toHaveProperty('toolName');
      expect(tool).toHaveProperty('lastUpdated');
    });
  });

  describe('getToolBySlug', () => {
    it('should return tool for valid slug', () => {
      const tool = getToolBySlug('keyword-density-checker');

      expect(tool).not.toBeNull();
      expect(tool?.slug).toBe('keyword-density-checker');
      expect(tool?.toolName).toBe('Keyword Density Checker');
    });

    it('should return null for invalid slug', () => {
      const tool = getToolBySlug('non-existent-tool');

      expect(tool).toBeNull();
    });

    it('should return full tool data including componentName', () => {
      const tool = getToolBySlug('keyword-density-checker');

      expect(tool).toHaveProperty('componentName');
      expect(tool?.componentName).toBe('KeywordDensityTool');
      expect(tool).toHaveProperty('howToUse');
      expect(tool).toHaveProperty('whyUseIt');
      expect(tool).toHaveProperty('faqs');
      expect(tool).toHaveProperty('relatedTools');
    });
  });

  describe('getAllToolSlugs', () => {
    it('should return array of slugs', () => {
      const slugs = getAllToolSlugs();

      expect(Array.isArray(slugs)).toBe(true);
      expect(slugs.length).toBeGreaterThan(0);
      expect(slugs).toContain('keyword-density-checker');
      expect(slugs).toContain('meta-description-validator');
      expect(slugs).toContain('title-tag-optimizer');
    });
  });

  describe('getToolsBySlugs', () => {
    it('should return tool metadata for valid slugs', () => {
      const tools = getToolsBySlugs(['keyword-density-checker', 'meta-description-validator']);

      expect(tools.length).toBe(2);
      expect(tools[0].slug).toBe('keyword-density-checker');
      expect(tools[1].slug).toBe('meta-description-validator');
    });

    it('should filter out invalid slugs', () => {
      const tools = getToolsBySlugs(['keyword-density-checker', 'invalid-slug']);

      expect(tools.length).toBe(1);
      expect(tools[0].slug).toBe('keyword-density-checker');
    });

    it('should return empty array for all invalid slugs', () => {
      const tools = getToolsBySlugs(['invalid-1', 'invalid-2']);

      expect(tools.length).toBe(0);
    });
  });

  describe('getFullToolsBySlugs', () => {
    it('should return full tool data for valid slugs', () => {
      const tools = getFullToolsBySlugs(['keyword-density-checker']);

      expect(tools.length).toBe(1);
      expect(tools[0]).toHaveProperty('componentName');
      expect(tools[0]).toHaveProperty('howToUse');
      expect(tools[0]).toHaveProperty('whyUseIt');
      expect(tools[0]).toHaveProperty('faqs');
      expect(tools[0]).toHaveProperty('relatedTools');
    });
  });

  describe('Tool data integrity', () => {
    it('should have valid FAQs for all tools', () => {
      const slugs = getAllToolSlugs();

      slugs.forEach(slug => {
        const tool = getToolBySlug(slug);
        expect(tool?.faqs).toBeDefined();
        expect(Array.isArray(tool?.faqs)).toBe(true);
        expect(tool?.faqs.length).toBeGreaterThan(0);

        tool?.faqs.forEach(faq => {
          expect(faq).toHaveProperty('question');
          expect(faq).toHaveProperty('answer');
          expect(typeof faq.question).toBe('string');
          expect(typeof faq.answer).toBe('string');
        });
      });
    });

    it('should have valid related tools for all tools', () => {
      const slugs = getAllToolSlugs();

      slugs.forEach(slug => {
        const tool = getToolBySlug(slug);
        expect(tool?.relatedTools).toBeDefined();
        expect(Array.isArray(tool?.relatedTools)).toBe(true);
        expect(tool?.relatedTools.length).toBeGreaterThan(0);
      });
    });

    it('should have valid howToUse steps for all tools', () => {
      const slugs = getAllToolSlugs();

      slugs.forEach(slug => {
        const tool = getToolBySlug(slug);
        expect(tool?.howToUse).toBeDefined();
        expect(Array.isArray(tool?.howToUse)).toBe(true);
        expect(tool?.howToUse.length).toBeGreaterThan(0);
      });
    });
  });
});
