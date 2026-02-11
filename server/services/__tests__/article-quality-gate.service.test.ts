/**
 * ArticleQualityGateService Tests
 *
 * Tests for the article quality gate validation including:
 * - Word count threshold checking
 * - Heading structure validation
 * - Metadata completeness checking
 * - Completion/truncation detection
 * - Combined quality gate scenarios
 */

import { describe, it, expect } from 'vitest';
import type { IArticleOutline } from '@shared/types/article.types';
import { articleQualityGateService, QUALITY_GATE_CONFIG } from '../article-quality-gate.service';

describe('ArticleQualityGateService', () => {
  const mockOutline: IArticleOutline = {
    title: 'Test Article Title',
    metaDescription: 'A test meta description for SEO purposes',
    slug: 'test-article-slug',
    sections: [
      {
        heading: 'Introduction',
        keyPoints: ['Point 1', 'Point 2'],
      },
      {
        heading: 'Main Section',
        subheadings: ['Subheading 1'],
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
      },
      {
        heading: 'Another Section',
        keyPoints: ['Point 1', 'Point 2'],
      },
      {
        heading: 'Conclusion',
        keyPoints: ['Summary point'],
      },
    ],
  };

  describe('Word count validation', () => {
    it('should pass when word count meets minimum threshold (70%)', () => {
      const targetWordCount = 1000;
      const content = `## Introduction

${'word '.repeat(200).trim()}

## Main Section

${'word '.repeat(200).trim()}

## Another Section

${'word '.repeat(200).trim()}

## Conclusion

${'word '.repeat(100).trim()}`; // ~700 words = 70%

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        targetWordCount,
        'stop'
      );

      expect(result.passed).toBe(true);
      expect(result.details.wordCountCheck.passed).toBe(true);
      expect(result.details.wordCountCheck.actual).toBeGreaterThanOrEqual(630); // At least 70%
      expect(result.details.wordCountCheck.percentage).toBeGreaterThanOrEqual(70);
    });

    it('should fail when word count is below minimum threshold', () => {
      const targetWordCount = 1000;
      const content = `## Intro

${'word '.repeat(100).trim()}

## Main

${'word '.repeat(100).trim()}

## End

${'word '.repeat(100).trim()}`; // ~300 words = 30% (< 70%)

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        targetWordCount,
        'stop'
      );

      expect(result.passed).toBe(false);
      expect(result.details.wordCountCheck.passed).toBe(false);
      expect(result.details.wordCountCheck.actual).toBeLessThan(700);
      expect(result.details.wordCountCheck.percentage).toBeLessThan(70);
      expect(result.failureReason).toContain('Word count');
    });

    it('should pass when word count exceeds target', () => {
      const targetWordCount = 1000;
      const content = `## Introduction

${'word '.repeat(300).trim()}

## Main Section

${'word '.repeat(300).trim()}

## Another Section

${'word '.repeat(300).trim()}

## Conclusion

${'word '.repeat(300).trim()}`; // ~1200 words = 120%

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        targetWordCount,
        'stop'
      );

      expect(result.passed).toBe(true);
      expect(result.details.wordCountCheck.passed).toBe(true);
      expect(result.details.wordCountCheck.percentage).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Heading structure validation', () => {
    it('should pass with minimum required H2 headings (3)', () => {
      const content = `## Introduction

Content here.

## Main Section

More content.

## Conclusion

Final thoughts.`;

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        1000,
        'stop'
      );

      expect(result.details.headingCheck.passed).toBe(true);
      expect(result.details.headingCheck.h2Count).toBe(3);
    });

    it('should fail with fewer than minimum H2 headings', () => {
      const content = `## Introduction

Content here.

## Conclusion

Final thoughts.`;

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        1000,
        'stop'
      );

      expect(result.details.headingCheck.passed).toBe(false);
      expect(result.details.headingCheck.h2Count).toBe(2);
      expect(result.failureReason).toContain('H2 headings');
    });

    it('should correctly count H2 headings in markdown with H3s', () => {
      const content = `## Introduction

Content.

## Main Section

### Subsection

More content.

## Conclusion

End.`;

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        1000,
        'stop'
      );

      expect(result.details.headingCheck.h2Count).toBe(3);
      expect(result.details.headingCheck.passed).toBe(true);
    });
  });

  describe('Metadata validation', () => {
    it('should pass with complete metadata', () => {
      const completeOutline: IArticleOutline = {
        title: 'Complete Title',
        metaDescription: 'Complete meta description',
        slug: 'complete-slug',
        sections: mockOutline.sections,
      };

      const result = articleQualityGateService.checkQualityGates(
        'Some content',
        completeOutline,
        1000,
        'stop'
      );

      expect(result.details.metadataCheck.passed).toBe(true);
      expect(result.details.metadataCheck.hasTitle).toBe(true);
      expect(result.details.metadataCheck.hasMetaDescription).toBe(true);
      expect(result.details.metadataCheck.hasSlug).toBe(true);
    });

    it('should fail with missing title', () => {
      const incompleteOutline: IArticleOutline = {
        title: '',
        metaDescription: 'Has meta description',
        slug: 'has-slug',
        sections: mockOutline.sections,
      };

      const result = articleQualityGateService.checkQualityGates(
        'Some content',
        incompleteOutline,
        1000,
        'stop'
      );

      expect(result.details.metadataCheck.passed).toBe(false);
      expect(result.details.metadataCheck.hasTitle).toBe(false);
      expect(result.failureReason).toContain('title');
    });

    it('should fail with missing meta description', () => {
      const incompleteOutline: IArticleOutline = {
        title: 'Has Title',
        metaDescription: '',
        slug: 'has-slug',
        sections: mockOutline.sections,
      };

      const result = articleQualityGateService.checkQualityGates(
        'Some content',
        incompleteOutline,
        1000,
        'stop'
      );

      expect(result.details.metadataCheck.passed).toBe(false);
      expect(result.details.metadataCheck.hasMetaDescription).toBe(false);
      expect(result.failureReason).toContain('meta description');
    });

    it('should fail with missing slug', () => {
      const incompleteOutline: IArticleOutline = {
        title: 'Has Title',
        metaDescription: 'Has meta',
        slug: '',
        sections: mockOutline.sections,
      };

      const result = articleQualityGateService.checkQualityGates(
        'Some content',
        incompleteOutline,
        1000,
        'stop'
      );

      expect(result.details.metadataCheck.passed).toBe(false);
      expect(result.details.metadataCheck.hasSlug).toBe(false);
      expect(result.failureReason).toContain('slug');
    });
  });

  describe('Completion validation', () => {
    it('should pass with stop finish reason', () => {
      const result = articleQualityGateService.checkQualityGates(
        'word '.repeat(1000).trim(),
        mockOutline,
        1000,
        'stop'
      );

      expect(result.details.completionCheck.passed).toBe(true);
    });

    it('should fail with length finish reason (truncated)', () => {
      const result = articleQualityGateService.checkQualityGates(
        'word '.repeat(1000).trim(),
        mockOutline,
        1000,
        'length'
      );

      expect(result.details.completionCheck.passed).toBe(false);
    });

    it('should fail with max_tokens finish reason (truncated)', () => {
      const result = articleQualityGateService.checkQualityGates(
        'word '.repeat(1000).trim(),
        mockOutline,
        1000,
        'max_tokens'
      );

      expect(result.details.completionCheck.passed).toBe(false);
      expect(result.failureReason).toContain('truncated');
    });
  });

  describe('Combined quality gate scenarios', () => {
    it('should pass when all gates pass', () => {
      const content = `## Introduction

This is a comprehensive introduction with substantial content that meets the word count requirements. It contains multiple paragraphs to ensure adequate depth and quality.

${'word '.repeat(100).trim()}

## Main Section

This section contains detailed information about the topic. It has multiple paragraphs to ensure adequate content depth and quality.

${'word '.repeat(100).trim()}

## Another Section

Additional valuable content that enhances the article and provides useful information to readers.

${'word '.repeat(100).trim()}

## Conclusion

A well-written conclusion that summarizes the key points and provides closure.

${'word '.repeat(50).trim()}`;

      const result = articleQualityGateService.checkQualityGates(content, mockOutline, 500, 'stop');

      expect(result.passed).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });

    it('should fail when multiple gates fail', () => {
      const incompleteOutline: IArticleOutline = {
        title: '',
        metaDescription: '',
        slug: '',
        sections: mockOutline.sections,
      };

      const content = `## Intro

Too short.`;

      const result = articleQualityGateService.checkQualityGates(
        content,
        incompleteOutline,
        1000,
        'max_tokens'
      );

      expect(result.passed).toBe(false);
      expect(result.failureReason).toContain('Word count');
      expect(result.failureReason).toContain('H2 headings');
      expect(result.failureReason).toContain('Missing metadata');
      expect(result.failureReason).toContain('truncated');
    });

    it('should provide detailed failure reason', () => {
      const content = 'word '.repeat(100).trim();

      const result = articleQualityGateService.checkQualityGates(
        content,
        mockOutline,
        1000,
        'stop'
      );

      expect(result.passed).toBe(false);
      expect(result.failureReason).toBeDefined();
      expect(result.failureReason).toContain('10%');
      expect(result.failureReason).toContain('minimum 70%');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content gracefully', () => {
      const result = articleQualityGateService.checkQualityGates('', mockOutline, 1000, 'stop');

      expect(result.passed).toBe(false);
      expect(result.details.wordCountCheck.actual).toBe(0);
    });

    it('should handle content with markdown syntax', () => {
      const content = `## Introduction

**Bold text** and *italic text*.

[Link text](https://example.com)

![Alt text](image.jpg)

\`code snippet\`

## Conclusion

End.`;

      const result = articleQualityGateService.checkQualityGates(content, mockOutline, 50, 'stop');

      expect(result.details.headingCheck.h2Count).toBe(2);
      expect(result.details.wordCountCheck.actual).toBeGreaterThan(0);
    });

    it('should handle content with image markers', () => {
      const content = `## Introduction

[IMAGE:1]

Content here.

## Section 2

[IMAGE:2]

More content.

## Conclusion

[IMAGE:3]

End.`;

      const result = articleQualityGateService.checkQualityGates(content, mockOutline, 100, 'stop');

      expect(result.details.headingCheck.h2Count).toBe(3);
      // Image markers should be stripped from word count
      expect(result.details.wordCountCheck.actual).toBeLessThan(20);
    });
  });

  describe('Quality gate configuration', () => {
    it('should have correct minimum word count percentage', () => {
      expect(QUALITY_GATE_CONFIG.MIN_WORD_COUNT_PERCENTAGE).toBe(0.7);
    });

    it('should have correct minimum H2 headings', () => {
      expect(QUALITY_GATE_CONFIG.MIN_H2_HEADINGS).toBe(3);
    });

    it('should have valid finish reasons', () => {
      expect(QUALITY_GATE_CONFIG.VALID_FINISH_REASONS).toContain('stop');
      expect(QUALITY_GATE_CONFIG.VALID_FINISH_REASONS).not.toContain('length');
    });

    it('should have truncated finish reasons', () => {
      expect(QUALITY_GATE_CONFIG.TRUNCATED_FINISH_REASONS).toContain('length');
      expect(QUALITY_GATE_CONFIG.TRUNCATED_FINISH_REASONS).toContain('max_tokens');
    });
  });
});
