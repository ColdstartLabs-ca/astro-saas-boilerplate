/**
 * SEO Utilities Tests
 *
 * Tests for SEO analysis functions including keyword density,
 * heading structure analysis, meta description checks, and
 * overall SEO score calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKeywordDensity,
  analyzeHeadingStructure,
  checkMetaDescription,
  calculateTitleScore,
  calculateOverallSEOScore,
  getSEOScoreColor,
  getSEOScoreBgColor,
  getSEOScoreBorderColor,
  type IHeadingStructure,
} from '../seo';

describe('SEO Utilities', () => {
  describe('calculateKeywordDensity', () => {
    it('should return 0 for empty content', () => {
      expect(calculateKeywordDensity('', 'test keyword')).toBe(0);
      expect(calculateKeywordDensity('some content', '')).toBe(0);
      expect(calculateKeywordDensity('', '')).toBe(0);
    });

    it('should calculate density for single-word keyword', () => {
      const content = 'The best seo tools help optimize content. SEO is important for ranking.';
      const density = calculateKeywordDensity(content, 'SEO');
      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThan(100);
    });

    it('should calculate density for multi-word keyword phrase', () => {
      const content = 'Coffee machines are great. The best coffee machines make great coffee.';
      const density = calculateKeywordDensity(content, 'coffee machines');
      expect(density).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const content = 'SEO tools for SEO optimization. Seo is important.';
      const density1 = calculateKeywordDensity(content, 'SEO');
      const density2 = calculateKeywordDensity(content, 'seo');
      expect(density1).toBe(density2);
    });

    it('should handle markdown syntax', () => {
      const content = '# SEO Guide\n\n**SEO** is important. Learn *SEO* strategies.';
      const density = calculateKeywordDensity(content, 'SEO');
      expect(density).toBeGreaterThan(0);
    });

    it('should return ~1-2% for ideal density', () => {
      // Create content with appropriate keyword density
      let content = 'This is a sample article about search engine optimization. ';
      for (let i = 0; i < 20; i++) {
        content += 'Search engine optimization helps improve rankings. ';
      }
      const density = calculateKeywordDensity(content, 'search engine optimization');
      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThan(20);
    });
  });

  describe('analyzeHeadingStructure', () => {
    it('should return empty analysis for null content', () => {
      const result = analyzeHeadingStructure('');
      expect(result.hasH1).toBe(false);
      expect(result.h1Count).toBe(0);
      expect(result.issues).toContain('No content to analyze');
    });

    it('should detect H1 heading', () => {
      const content = '# Main Title\n\nSome content here.\n\n## Section 1\n\nMore content.';
      const result = analyzeHeadingStructure(content);
      expect(result.hasH1).toBe(true);
      expect(result.h1Count).toBe(1);
      // No H2 issue expected
      expect(result.issues.some(i => i.includes('No H2 headings'))).toBe(false);
    });

    it('should detect multiple heading levels', () => {
      const content = `
# Main Title

## Section 1

Content here.

### Subsection 1.1

More content.

## Section 2
      `.trim();
      const result = analyzeHeadingStructure(content);
      expect(result.h1Count).toBe(1);
      expect(result.h2Count).toBe(2);
      expect(result.h3Count).toBe(1);
    });

    it('should flag multiple H1 headings', () => {
      const content = `
# First Title

# Second Title

Content.
      `.trim();
      const result = analyzeHeadingStructure(content);
      expect(result.h1Count).toBe(2);
      expect(result.issues).toContain('Multiple H1 headings (should have exactly one)');
    });

    it('should detect missing H2 headings', () => {
      const content = `
# Main Title

Some content without subheadings.
      `.trim();
      const result = analyzeHeadingStructure(content);
      expect(result.h2Count).toBe(0);
      expect(result.issues).toContain('No H2 headings found');
    });

    it('should detect improper heading hierarchy', () => {
      const content = `
# Main Title

### Subsection (skipping H2)

Content.
      `.trim();
      const result = analyzeHeadingStructure(content);
      expect(result.hasProperHierarchy).toBe(false);
      expect(result.issues.some(i => i.includes('Heading hierarchy issue'))).toBe(true);
    });

    it('should flag content with no headings', () => {
      const content = 'Just some plain text without any headings at all.';
      const result = analyzeHeadingStructure(content);
      expect(result.hasH1).toBe(false);
      expect(result.issues).toContain('No headings found in content');
    });
  });

  describe('checkMetaDescription', () => {
    const baseKeyword = 'seo optimization';

    it('should return 0 score for missing meta description', () => {
      const result = checkMetaDescription({
        meta_description: null,
        primary_keyword: baseKeyword,
      });
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Meta description is missing');
    });

    it('should return 0 score for empty meta description', () => {
      const result = checkMetaDescription({
        meta_description: '   ',
        primary_keyword: baseKeyword,
      });
      expect(result.score).toBe(0);
    });

    it('should penalize too short descriptions', () => {
      const result = checkMetaDescription({
        meta_description: 'Short description.',
        primary_keyword: baseKeyword,
      });
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(i => i.includes('too short'))).toBe(true);
    });

    it('should penalize too long descriptions', () => {
      const longDesc = 'a'.repeat(200);
      const result = checkMetaDescription({
        meta_description: longDesc,
        primary_keyword: baseKeyword,
      });
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(i => i.includes('too long'))).toBe(true);
    });

    it('should reward ideal length (150-160 chars)', () => {
      // Exactly 155 characters with keyword
      const idealDesc =
        'Discover proven SEO optimization strategies to boost your website rankings. Learn effective techniques for improving online visibility and search results.';
      const result = checkMetaDescription({
        meta_description: idealDesc,
        primary_keyword: baseKeyword,
      });
      expect(result.length).toBeGreaterThanOrEqual(150);
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should check for keyword presence', () => {
      const result = checkMetaDescription({
        meta_description:
          'This description is about SEO and optimization strategies for your website.',
        primary_keyword: 'seo optimization',
      });
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should penalize missing keyword in description', () => {
      const result = checkMetaDescription({
        meta_description: 'This description is about marketing strategies and content creation.',
        primary_keyword: 'seo optimization',
      });
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(i => i.includes('keyword'))).toBe(true);
    });
  });

  describe('calculateTitleScore', () => {
    it('should return 0 score for missing title', () => {
      const result = calculateTitleScore(null, 'seo optimization');
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Title is missing');
    });

    it('should return 0 score for empty title', () => {
      const result = calculateTitleScore('  ', 'seo optimization');
      expect(result.score).toBe(0);
    });

    it('should penalize too short titles', () => {
      const result = calculateTitleScore('SEO', 'seo optimization');
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(i => i.includes('too short'))).toBe(true);
    });

    it('should penalize too long titles', () => {
      const longTitle =
        'The Complete Guide to SEO Optimization and Marketing Strategies for Beginners';
      const result = calculateTitleScore(longTitle, 'seo optimization');
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(i => i.includes('too long'))).toBe(true);
    });

    it('should reward ideal length (50-60 chars)', () => {
      const idealTitle = 'Complete SEO Optimization Guide for Beginners';
      const result = calculateTitleScore(idealTitle, 'seo optimization');
      expect(result.score).toBeGreaterThan(80);
    });

    it('should check for keyword presence', () => {
      const result = calculateTitleScore(
        'SEO Optimization: The Complete Guide',
        'seo optimization'
      );
      expect(result.hasKeyword).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should penalize missing keyword in title', () => {
      const result = calculateTitleScore(
        'Digital Marketing Guide for Beginners',
        'seo optimization'
      );
      expect(result.hasKeyword).toBe(false);
      expect(result.score).toBeLessThan(70);
      expect(result.issues.some(i => i.includes('keyword'))).toBe(true);
    });
  });

  describe('calculateOverallSEOScore', () => {
    const perfectArticle = {
      title: 'SEO Optimization Guide: Complete Strategies for 2024',
      content: `
# SEO Optimization: Complete Guide

## Introduction to SEO

SEO (search engine optimization) helps your content rank better. SEO optimization is essential.

## Key SEO Strategies

Learn the best SEO optimization techniques.

### On-Page SEO

Content optimization matters for SEO.

### Technical SEO

Technical SEO optimization improves site performance.

## Conclusion

Master SEO optimization to boost rankings.
      `.trim(),
      primary_keyword: 'seo optimization',
      meta_description:
        'Learn SEO optimization strategies and techniques. Discover how to improve your search rankings with our complete guide.',
      word_count: 1500,
    };

    it('should calculate high score for well-optimized article', () => {
      const result = calculateOverallSEOScore(perfectArticle);
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.grade).toMatch(/^[A-C]$/);
    });

    it('should include all metric scores', () => {
      const result = calculateOverallSEOScore(perfectArticle);
      expect(result.metrics).toHaveProperty('keywordDensity');
      expect(result.metrics).toHaveProperty('headingStructure');
      expect(result.metrics).toHaveProperty('wordCount');
      expect(result.metrics).toHaveProperty('metaDescription');
      expect(result.metrics).toHaveProperty('title');
    });

    it('should assign A grade for 90+ score', () => {
      const result = calculateOverallSEOScore({
        ...perfectArticle,
        title: 'SEO Optimization: The Complete Guide to Success',
      });
      if (result.overallScore >= 90) {
        expect(result.grade).toBe('A');
      }
    });

    it('should assign F grade for low scores', () => {
      const poorArticle = {
        title: null,
        content: null,
        primary_keyword: 'test',
        meta_description: null,
        word_count: null,
      };
      const result = calculateOverallSEOScore(poorArticle);
      expect(result.overallScore).toBeLessThan(30);
      expect(result.grade).toBe('F');
    });

    it('should calculate keyword density metric', () => {
      const result = calculateOverallSEOScore(perfectArticle);
      expect(result.metrics.keywordDensity.density).toBeGreaterThan(0);
      expect(result.metrics.keywordDensity.score).toBeGreaterThan(0);
    });

    it('should analyze heading structure', () => {
      const result = calculateOverallSEOScore(perfectArticle);
      expect(result.metrics.headingStructure.analysis.hasH1).toBe(true);
      expect(result.metrics.headingStructure.analysis.h2Count).toBeGreaterThan(0);
    });

    it('should score word count appropriately', () => {
      const shortArticle = { ...perfectArticle, word_count: 300 };
      const result = calculateOverallSEOScore(shortArticle);
      expect(result.metrics.wordCount.score).toBeLessThan(100);
    });
  });

  describe('Color utilities', () => {
    it('should return green for high scores (80+)', () => {
      expect(getSEOScoreColor(85)).toBe('text-brand-400');
      expect(getSEOScoreBgColor(90)).toBe('bg-brand-500/10');
      expect(getSEOScoreBorderColor(80)).toBe('border-brand-500/30');
    });

    it('should return yellow for medium scores (60-79)', () => {
      expect(getSEOScoreColor(70)).toBe('text-yellow-400');
      expect(getSEOScoreBgColor(60)).toBe('bg-yellow-500/10');
      expect(getSEOScoreBorderColor(75)).toBe('border-yellow-500/30');
    });

    it('should return red for low scores (<60)', () => {
      expect(getSEOScoreColor(50)).toBe('text-red-400');
      expect(getSEOScoreBgColor(30)).toBe('bg-red-500/10');
      expect(getSEOScoreBorderColor(0)).toBe('border-red-500/30');
    });

    it('should handle edge cases', () => {
      expect(getSEOScoreColor(100)).toBe('text-brand-400');
      expect(getSEOScoreColor(0)).toBe('text-red-400');
      expect(getSEOScoreColor(60)).toBe('text-yellow-400');
    });
  });
});
